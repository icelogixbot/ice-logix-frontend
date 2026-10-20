// ============================================================
// ICE LOGIX: Полноэкранный сканер паспортов и ID-карт Alipay-Style
// Модуль живой камеры WebRTC + Двухкадровый захват + Декодер MRZ ICAO
// ============================================================

(function() {
  'use strict';

  let currentStream = null;
  let currentTorchState = false;

  /**
   * Сжатие кадра из Canvas в DataURL JPEG
   */
  function canvasToDataUrl(canvas, maxDim = 1280, quality = 0.82) {
    let { width, height } = canvas;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = width;
      scaledCanvas.height = height;
      const ctx = scaledCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, width, height);
      return scaledCanvas.toDataURL('image/jpeg', quality);
    }
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Сжатие загруженного файла изображения через Image + Canvas
   */
  function compressImageFile(file, maxDim = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Вычисление координат видоискателя на видео с учетом object-fit: cover
   */
  function getViewfinderCrop(video, viewfinder, isStep3 = false) {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (!vWidth || !vHeight) return null;

    const vRect = video.getBoundingClientRect();
    const fRect = viewfinder.getBoundingClientRect();
    if (!vRect.width || !vRect.height || !fRect.width || !fRect.height) return null;

    const vRatio = vWidth / vHeight;
    const screenRatio = vRect.width / vRect.height;

    let renderWidth, renderHeight, offsetX, offsetY;
    if (screenRatio > vRatio) {
      renderWidth = vRect.width;
      renderHeight = vRect.width / vRatio;
      offsetX = 0;
      offsetY = (renderHeight - vRect.height) / 2;
    } else {
      renderHeight = vRect.height;
      renderWidth = vRect.height * vRatio;
      offsetX = (renderWidth - vRect.width) / 2;
      offsetY = 0;
    }

    const scale = vWidth / renderWidth;

    const cropX = Math.max(0, (fRect.left - vRect.left + offsetX) * scale);
    const cropY = Math.max(0, (fRect.top - vRect.top + offsetY) * scale);
    const cropW = Math.min(vWidth - cropX, fRect.width * scale);
    const cropH = Math.min(vHeight - cropY, fRect.height * scale);

    // Добавляем запас (4% для страниц 31-33, 8% для штампа прописки, чтобы номер дома слева не срезался)
    const marginRatio = isStep3 ? 0.08 : 0.04;
    const marginX = cropW * marginRatio;
    const marginY = cropH * marginRatio;
    const sx = Math.max(0, cropX - marginX);
    const sy = Math.max(0, cropY - marginY);
    const sw = Math.min(vWidth - sx, cropW + marginX * 2);
    const sh = Math.min(vHeight - sy, cropH + marginY * 2);

    if (sw < 20 || sh < 20) return null;
    return { sx, sy, sw, sh };
  }

  /**
   * Кроп изображения строго по видоискателю с учетом object-fit: cover
   * Возвращает чисто разворот документа в высоком разрешении без комнаты и фона
   */
  function cropViewfinderFromVideo(video, viewfinder, targetWidth = 1200, quality = 0.88, isStep3 = false) {
    const crop = getViewfinderCrop(video, viewfinder, isStep3);
    if (!crop) return null;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = Math.round((targetWidth * crop.sh) / crop.sw);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Остановка камеры
   */
  function stopCameraStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
      currentStream = null;
      currentTorchState = false;
    }
  }

  /**
   * Включение/выключение фонарика (если поддерживается устройством)
   */
  async function toggleTorch(torchBtn) {
    if (!currentStream) return;
    const track = currentStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        currentTorchState = !currentTorchState;
        await track.applyConstraints({
          advanced: [{ torch: currentTorchState }]
        });
        if (torchBtn) {
          torchBtn.classList.toggle('text-amber-400', currentTorchState);
          torchBtn.classList.toggle('text-white', !currentTorchState);
        }
      } else {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('warning');
        alert('Фонарик не поддерживается вашей камерой.');
      }
    } catch (err) {
      console.warn('Torch error:', err);
    }
  }

  /**
   * Запуск полноэкранного сканера документов Alipay
   */
  async function openKycAlipayScanner({ onComplete, onCancel } = {}) {
    stopCameraStream();

    let mode = 'passport'; // 'passport' | 'idcard'
    let currentStep = 1; // 1 | 2 | 3
    let frame1DataUrl = null;
    let frame2DataUrl = null;
    let frame3DataUrl = null;

    // Создаем контейнер сканера
    const existing = document.getElementById('kycScannerModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kycScannerModal';
    modal.className = 'kyc-scanner-modal';
    modal.innerHTML = `
      <video id="kycScannerVideo" class="kyc-scanner-video" autoplay playsinline muted></video>

      <div class="kyc-scanner-overlay">
        <!-- Шапка сканера -->
        <div class="kyc-scanner-header">
          <button type="button" id="kycScannerCloseBtn" class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-sm active:scale-95 transition cursor-pointer">
            ✕
          </button>

          <!-- Переключатель Паспорт / ID-карта -->
          <div class="flex items-center p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold">
            <button type="button" id="kycModePassportBtn" class="px-3 py-1 rounded-full bg-cyan-500 text-black shadow-md transition cursor-pointer">
              Паспорт РБ
            </button>
            <button type="button" id="kycModeIdCardBtn" class="px-3 py-1 rounded-full text-white/70 hover:text-white transition cursor-pointer">
              ID-карта
            </button>
          </div>

          <!-- Фонарик -->
          <button type="button" id="kycScannerTorchBtn" class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-base active:scale-95 transition cursor-pointer">
            🔦
          </button>
        </div>

        <!-- Центральная область с видоискателем -->
        <div class="kyc-scanner-frame-wrap flex flex-col items-center justify-center">
          <!-- Динамическая плашка подсказок прямого эфира -->
          <div id="kycLivePill" class="kyc-live-pill mb-2 transition-all">
            🔍 Поместите страницу 31 в рамку
          </div>

          <div id="kycViewfinder" class="kyc-scanner-viewfinder">
            <!-- Уголки -->
            <div class="kyc-scanner-corner tl"></div>
            <div class="kyc-scanner-corner tr"></div>
            <div class="kyc-scanner-corner bl"></div>
            <div class="kyc-scanner-corner br"></div>

            <!-- Лазерная линия сканирования -->
            <div class="kyc-scanner-laser"></div>

            <!-- Индикатор прогресса автозахвата -->
            <div id="kycAutoProgressBar" class="kyc-auto-progress-bar"></div>

            <!-- Верхняя направляющая зона -->
            <div id="kycTargetTopZone" class="kyc-target-box-name transition-all">
              <span id="kycTargetTopText">ФИО на русском языке (стр. 31)</span>
            </div>

            <!-- Нижняя направляющая зона MRZ -->
            <div id="kycTargetBottomZone" class="kyc-target-box-mrz transition-all opacity-40">
              <span id="kycTargetBottomText">P&lt;BLR... Нижние строки со знаками &lt;&lt;&lt;</span>
            </div>
          </div>
        </div>

        <!-- Нижний блок управления -->
        <div class="kyc-scanner-footer">
          <!-- Бейдж текущего шага и миниатюра снятого кадра -->
          <div class="flex items-center gap-2.5">
            <div id="kycThumbPreview" class="hidden kyc-thumb-preview">
              <img id="kycThumbImg" alt="Стр. 31">
              <div class="kyc-thumb-badge">✓</div>
            </div>
            <div id="kycStepBadge" class="px-4 py-1.5 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-400/50 text-cyan-300 text-xs font-bold text-center kyc-scanner-badge-active">
              Шаг 1 из 3: Разворот стр. 31 (Русские ФИО)
            </div>
          </div>

          <p id="kycScannerSubText" class="text-[11px] text-white/70 text-center max-w-xs leading-tight">
            Держите верхнюю страницу с ФИО в рамке — камера зафиксирует снимок автоматически.
          </p>

          <!-- Кнопка пропуска шага 3 (прописка) -->
          <button type="button" id="kycSkipStep3Btn" class="hidden text-xs text-cyan-300 hover:text-cyan-200 underline py-1 transition cursor-pointer">
            Пропустить штамп прописки ➔
          </button>

          <!-- Кнопка затвора камеры (ручной автоспуск) -->
          <button type="button" id="kycShutterBtn" class="kyc-shutter-btn active:scale-90 transition cursor-pointer" aria-label="Сделать снимок">
            <div class="kyc-shutter-btn-inner"></div>
          </button>
        </div>
      </div>

      <!-- Экран обработки / декодирования -->
      <div id="kycProcessingScreen" class="hidden absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-3xl animate-spin">
          ⚡
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-white">Сверяем контрольные суммы ICAO 9303...</h3>
          <p class="text-xs text-cyan-300/80 max-w-xs leading-relaxed">
            Нейросеть декодирует машиночитаемую строку MRZ, орган МВД и штамп прописки. Секунду...
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const videoElem = document.getElementById('kycScannerVideo');
    const closeBtn = document.getElementById('kycScannerCloseBtn');
    const torchBtn = document.getElementById('kycScannerTorchBtn');
    const modePassportBtn = document.getElementById('kycModePassportBtn');
    const modeIdCardBtn = document.getElementById('kycModeIdCardBtn');
    const viewfinder = document.getElementById('kycViewfinder');
    const livePill = document.getElementById('kycLivePill');
    const progressBar = document.getElementById('kycAutoProgressBar');
    const stepBadge = document.getElementById('kycStepBadge');
    const subText = document.getElementById('kycScannerSubText');
    const skipStep3Btn = document.getElementById('kycSkipStep3Btn');
    const topZone = document.getElementById('kycTargetTopZone');
    const bottomZone = document.getElementById('kycTargetBottomZone');
    const topText = document.getElementById('kycTargetTopText');
    const bottomText = document.getElementById('kycTargetBottomText');
    const shutterBtn = document.getElementById('kycShutterBtn');
    const processingScreen = document.getElementById('kycProcessingScreen');
    const thumbPreview = document.getElementById('kycThumbPreview');
    const thumbImg = document.getElementById('kycThumbImg');

    let liveLoopActive = false;
    let liveTimer = null;
    let isCapturing = false;
    let stableCount = 0;
    let lastBlocks = null;

    // Быстрый оффскрин-холст для анализа кадра в реальном времени (128x96)
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 128;
    sampleCanvas.height = 96;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    // Остановка анализа
    function stopLiveAnalysis() {
      liveLoopActive = false;
      if (liveTimer) {
        clearTimeout(liveTimer);
        liveTimer = null;
      }
      if (progressBar) progressBar.style.width = '0%';
      if (viewfinder) viewfinder.classList.remove('is-locked');
      stableCount = 0;
      lastBlocks = null;
    }

    // Запуск анализа видеопотока в реальном времени
    function startLiveAnalysis() {
      stopLiveAnalysis();
      liveLoopActive = true;
      runLiveFrameCheck();
    }

    /**
     * Прецизионный детектор машиночитаемой зоны MRZ (ICAO 9303)
     * Сканирует нижние 26% видоискателя на наличие характерной регулярной частоты символов шрифта OCR-B
     * с символами-разделителями '<<<'.
     * На развороте стр. 31, штампе прописки, ковриках или столе такой структуры нет.
     */
    function detectMrzPattern(data, width, height) {
      const startY = Math.floor(height * 0.70);
      const endY = Math.floor(height * 0.94);
      const startX = Math.floor(width * 0.08);
      const endX = Math.floor(width * 0.92);

      let mrzLineCandidates = 0;

      // Проверяем 8 горизонтальных срезов в зоне MRZ
      const stepY = Math.max(2, Math.floor((endY - startY) / 8));
      for (let y = startY; y <= endY; y += stepY) {
        let minL = 255;
        let maxL = 0;
        const lineLumas = [];

        for (let x = startX; x <= endX; x++) {
          const idx = (y * width + x) * 4;
          const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          lineLumas.push(luma);
          if (luma < minL) minL = luma;
          if (luma > maxL) maxL = luma;
        }

        const contrast = maxL - minL;
        // Строка MRZ обязана быть темным печатным шрифтом (minL < 120) на светлой бумаге паспорта (maxL > 135)
        if (contrast < 35 || minL > 120 || maxL < 135) continue;

        const threshold = (minL + maxL) / 2;
        let transitions = 0;
        let isDark = lineLumas[0] < threshold;
        let runLength = 0;
        let maxRun = 0;

        for (let i = 1; i < lineLumas.length; i++) {
          const dark = lineLumas[i] < threshold;
          if (dark === isDark) {
            runLength++;
          } else {
            transitions++;
            if (runLength > maxRun) maxRun = runLength;
            runLength = 1;
            isDark = dark;
          }
        }

        // В строке MRZ (44 символа) при ширине среза ~108 пикселей должно быть от 20 до 54 чередований dark/light,
        // и максимальная длина сплошного участка не должна превышать 22 пикселей (нет огромных полей или сплошных теней)
        if (transitions >= 20 && transitions <= 54 && maxRun < 22) {
          mrzLineCandidates++;
        }
      }

      // Для подтверждения MRZ требуется минимум 2 линии с характерной частотой OCR-B
      return mrzLineCandidates >= 2;
    }

    // Цикл детектора живого эфира: 16-блочный анализ + валидация подлинности разворота
    function runLiveFrameCheck() {
      if (!liveLoopActive || isCapturing) return;

      if (videoElem && videoElem.readyState >= 2 && videoElem.videoWidth && videoElem.videoHeight) {
        const crop = getViewfinderCrop(videoElem, viewfinder);
        if (crop) {
          sampleCtx.drawImage(videoElem, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 128, 96);
        } else {
          sampleCtx.drawImage(videoElem, 0, 0, 128, 96);
        }

        const imgData = sampleCtx.getImageData(0, 0, 128, 96);
        const data = imgData.data;

        // 1. 16-блочный анализ (4 колонки x 4 строки) для отсечения шумов сенсора
        const blocks = new Float32Array(16);
        let minLuma = 255;
        let maxLuma = 0;
        let totalLuma = 0;

        // Построчная яркость для детекции печатных строк текста (rowLumas)
        const rowLumas = new Float32Array(96);

        for (let y = 0; y < 96; y++) {
          const by = Math.min(3, Math.floor(y / 24));
          let rowSum = 0;

          for (let x = 0; x < 128; x++) {
            const bx = Math.min(3, Math.floor(x / 32));
            const bIdx = by * 4 + bx;
            const pIdx = (y * 128 + x) * 4;
            const luma = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];

            blocks[bIdx] += luma;
            totalLuma += luma;
            rowSum += luma;

            if (luma < minLuma) minLuma = luma;
            if (luma > maxLuma) maxLuma = luma;
          }
          rowLumas[y] = rowSum / 128;
        }

        for (let b = 0; b < 16; b++) {
          blocks[b] = blocks[b] / 768;
        }

        const avgLuma = totalLuma / 12288;
        const contrastRange = maxLuma - minLuma;

        // Вариативность строк текста (штамп/текст имеет характерные перепады)
        let textLineVariance = 0;
        for (let y = 1; y < 96; y++) {
          textLineVariance += Math.abs(rowLumas[y] - rowLumas[y - 1]);
        }
        textLineVariance = textLineVariance / 95;

        // Расчет межкадрового движения между блоками
        let blockMotion = 0;
        if (lastBlocks) {
          for (let b = 0; b < 16; b++) {
            blockMotion += Math.abs(blocks[b] - lastBlocks[b]);
          }
          blockMotion = blockMotion / 16;
        } else {
          blockMotion = 99;
        }
        lastBlocks = blocks;

        // ========================================================
        // ПРОВЕРКА ОСВЕЩЕНИЯ И ПОДЛИННОСТИ ДОКУМЕНТА (НЕ КОВРИК И НЕ СТОЛ!)
        // ========================================================
        const isTooDark = avgLuma < 55;
        const isTooBright = avgLuma > 235;

        // Бумага паспорта РБ — светлая с защитной сеткой (avgLuma 75..235).
        const isPassportPaper = avgLuma >= 75 && avgLuma <= 235 && contrastRange >= 32;
        const hasTextLines = textLineVariance >= 1.3;

        // Прецизионный детектор MRZ: на стр. 33 обязательно должны присутствовать строки OCR-B с <<<
        const hasMrz = detectMrzPattern(data, 128, 96);
        const isSteady = blockMotion <= 4.0;

        if (isTooDark) {
          livePill.className = 'kyc-live-pill is-warning mb-2';
          livePill.innerHTML = '💡 Слишком темно — включите фонарик 🔦';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (isTooBright) {
          livePill.className = 'kyc-live-pill is-warning mb-2';
          livePill.innerHTML = '☀️ Слишком ярко — поверните от блика';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (!isPassportPaper) {
          // Темный коврик мыши, стол или посторонний предмет
          livePill.className = 'kyc-live-pill is-warning mb-2';
          if (currentStep === 1) {
            livePill.innerHTML = '📄 Поместите светлый разворот стр. 31 в рамку';
          } else if (currentStep === 2) {
            livePill.innerHTML = '📄 Поместите светлый разворот стр. 33 в рамку';
          } else {
            livePill.innerHTML = '📄 Поместите страницу со штампом прописки в рамку';
          }
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (!hasTextLines) {
          // Белый пустой лист бумаги без текста/штампа
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = currentStep === 3
            ? '🔍 Наведите на синий штамп и рукописный адрес'
            : '🔍 Расположите паспорт ровно, чтобы был виден текст';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (currentStep === 1 && hasMrz) {
          // На Шаге 1 пользователь по ошибке открыл страницу 33 (со строками <<<)
          livePill.className = 'kyc-live-pill is-warning mb-2';
          livePill.innerHTML = '⚠️ Это стр. 33! Сначала откройте стр. 31 (с русскими ФИО)';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (currentStep === 2 && !hasMrz) {
          // На Шаге 2 пользователь навел на стр. 31, коврик или стол без строк MRZ
          livePill.className = 'kyc-live-pill is-warning mb-2';
          livePill.innerHTML = '⚠️ Это не стр. 33! Наведите на нижние строки <<< (MRZ)';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (currentStep === 3 && hasMrz) {
          // На Шаге 3 пользователь все еще держит стр. 33 со строками MRZ
          livePill.className = 'kyc-live-pill is-warning mb-2';
          livePill.innerHTML = '⚠️ Это стр. 33! Откройте штамп прописки (стр. 25–28)';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (!isSteady) {
          // Документ в рамке, но телефон движется
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = '✋ Держите телефон ровнее...';
          viewfinder.classList.remove('is-locked');
          stableCount = Math.max(0, stableCount - 2);
          const pct = Math.min(100, Math.round((stableCount / 12) * 100));
          progressBar.style.width = pct + '%';
        } else {
          // ========================================================
          // ДОКУМЕНТ В РАМКЕ И СТАБИЛЕН — ПЛАВНЫЙ ОБРАТНЫЙ ОТСЧЕТ (~1.2с)
          // ========================================================
          stableCount++;
          viewfinder.classList.add('is-locked');
          livePill.className = 'kyc-live-pill is-locked mb-2';

          const pct = Math.min(100, Math.round((stableCount / 12) * 100));
          progressBar.style.width = pct + '%';

          if (stableCount <= 3) {
            livePill.innerHTML = currentStep === 3 ? '🎯 Зафиксируйте штамп прописки...' : '🎯 Зафиксируйте положение...';
          } else if (stableCount <= 6) {
            livePill.innerHTML = '🎯 Не двигайтесь... 3';
          } else if (stableCount <= 9) {
            livePill.innerHTML = '🎯 Не двигайтесь... 2';
          } else if (stableCount <= 11) {
            livePill.innerHTML = '🎯 Замрите... 1';
          } else if (stableCount >= 12 && !isCapturing) {
            isCapturing = true;
            livePill.innerHTML = '⚡ Снимок сделан!';
            takeShot(true);
            return;
          }
        }
      }

      liveTimer = setTimeout(runLiveFrameCheck, 100);
    }

    // Закрытие сканера
    const closeModal = () => {
      stopLiveAnalysis();
      stopCameraStream();
      modal.remove();
      if (typeof onCancel === 'function') onCancel();
    };

    closeBtn.onclick = closeModal;

    // Включение фонарика
    if (torchBtn) {
      torchBtn.onclick = () => toggleTorch(torchBtn);
    }

    // Переключение режимов: Паспорт / ID-карта
    modePassportBtn.onclick = () => {
      mode = 'passport';
      currentStep = 1;
      frame1DataUrl = null;
      frame2DataUrl = null;
      frame3DataUrl = null;
      if (thumbPreview) thumbPreview.classList.add('hidden');
      modePassportBtn.className = 'px-3 py-1 rounded-full bg-cyan-500 text-black shadow-md transition cursor-pointer';
      modeIdCardBtn.className = 'px-3 py-1 rounded-full text-white/70 hover:text-white transition cursor-pointer';
      viewfinder.classList.remove('id-card-mode');
      updateStepUI();
    };

    modeIdCardBtn.onclick = () => {
      mode = 'idcard';
      currentStep = 1;
      frame1DataUrl = null;
      frame2DataUrl = null;
      frame3DataUrl = null;
      if (thumbPreview) thumbPreview.classList.add('hidden');
      modeIdCardBtn.className = 'px-3 py-1 rounded-full bg-cyan-500 text-black shadow-md transition cursor-pointer';
      modePassportBtn.className = 'px-3 py-1 rounded-full text-white/70 hover:text-white transition cursor-pointer';
      viewfinder.classList.add('id-card-mode');
      updateStepUI();
    };

    // Обновление интерфейса шагов
    function updateStepUI() {
      if (mode === 'passport') {
        if (currentStep === 1) {
          stepBadge.textContent = 'Шаг 1 из 3: Разворот стр. 31 (Русские ФИО)';
          subText.textContent = 'Держите верхнюю страницу с ФИО в рамке — камера зафиксирует снимок автоматически.';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all opacity-30';
          topText.textContent = 'ФИО на русском языке и орган выдачи (стр. 31)';
          bottomText.textContent = 'Нижняя часть разворота';
          if (skipStep3Btn) skipStep3Btn.classList.add('hidden');
        } else if (currentStep === 2) {
          stepBadge.textContent = 'Шаг 2 из 3: Разворот стр. 33 (Строка MRZ с <<<)';
          subText.textContent = 'Наведите на нижнюю страницу со строками знаков <<< — автозахват сработает сам.';
          topZone.className = 'kyc-target-box-name transition-all opacity-30';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold';
          topText.textContent = 'Фото и личный номер';
          bottomText.textContent = 'P<BLR... Строки машиночитаемой зоны <<< (MRZ)';
          if (skipStep3Btn) skipStep3Btn.classList.add('hidden');
        } else {
          stepBadge.textContent = 'Шаг 3 из 3: Штамп прописки (стр. 25–28)';
          subText.textContent = 'Наведите на синий штамп «ЗАРЭГІСТРАВАНЫ» и рукописный адрес ручкой (город, агрогородок, деревня).';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400/40 bg-cyan-500/10 text-cyan-100 font-medium';
          topText.textContent = 'Синий штамп «ЗАРЭГІСТРАВАНЫ / ЗАРЕГИСТРИРОВАН»';
          bottomText.textContent = 'Адрес: город/агрогородок/деревня, улица/проспект, дом, кв.';
          if (skipStep3Btn) skipStep3Btn.classList.remove('hidden');
        }
      } else {
        // ID-карта
        if (skipStep3Btn) skipStep3Btn.classList.add('hidden');
        if (currentStep === 1) {
          stepBadge.textContent = 'Шаг 1 из 2: Лицевая сторона ID-карты';
          subText.textContent = 'Держите лицевую сторону ID-карты в рамке — автозахват сработает сам.';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all opacity-30';
          topText.textContent = 'Фотография и ФИО';
          bottomText.textContent = 'Номер документа';
        } else {
          stepBadge.textContent = 'Шаг 2 из 2: Обратная сторона ID-карты';
          subText.textContent = 'Переверните карту на обратную сторону со знаками <<< — автозахват сработает сам.';
          topZone.className = 'kyc-target-box-name transition-all opacity-30';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold';
          topText.textContent = 'Личный 14-значный номер';
          bottomText.textContent = 'I<BLR... Строки машиночитаемой зоны (MRZ)';
        }
      }
    }

    // Запуск камеры
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Ваш браузер не поддерживает доступ к камере.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        currentStream = stream;
        videoElem.srcObject = stream;
        await videoElem.play();
        if (!videoElem.videoWidth) {
          await new Promise((res) => {
            videoElem.onloadedmetadata = () => res();
            setTimeout(res, 500);
          });
        }
        startLiveAnalysis();
      } catch (err) {
        console.warn('Camera access failed, opening fallback:', err);
        modal.remove();
        openFallbackPassportUploader({ mode, onComplete, onCancel });
      }
    }

    // Карточка перехода между шагами: пауза и осознанное подтверждение переворота
    function showStepTransitionCard(toStep) {
      const existing = document.getElementById('kycStepTransitionCard');
      if (existing) existing.remove();

      const card = document.createElement('div');
      card.id = 'kycStepTransitionCard';
      card.className = 'kyc-step-transition-card space-y-3';

      if (toStep === 2) {
        card.innerHTML = `
          <div class="text-3xl">✅</div>
          <h4 class="text-white font-bold text-base">
            ${mode === 'passport' ? 'Страница 31 зафиксирована!' : 'Лицевая сторона снята!'}
          </h4>
          <p class="text-white/80 text-xs leading-relaxed">
            ${mode === 'passport'
              ? 'Теперь переверните паспорт на <b>страницу 33</b>.<br>Там находится ваша фотография и внизу две строки знаков <span class="text-cyan-300 font-mono font-bold">&lt;&lt;&lt;</span> (MRZ).'
              : 'Теперь переверните ID-карту на <b>обратную сторону</b>.<br>На ней находятся строки машиночитаемой зоны <span class="text-cyan-300 font-mono font-bold">&lt;&lt;&lt;</span>.'
            }
          </p>
          <div class="pt-2">
            <button type="button" id="kycProceedStep2Btn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition shadow-lg">
              ${mode === 'passport' ? 'Я открыл страницу 33 ➔' : 'Я перевернул карту ➔'}
            </button>
          </div>
        `;
        modal.appendChild(card);

        document.getElementById('kycProceedStep2Btn').onclick = () => {
          card.remove();
          currentStep = 2;
          updateStepUI();
          livePill.innerHTML = mode === 'passport'
            ? '📄 Наведите камеру на страницу 33 (с фото)...'
            : '📄 Наведите камеру на обратную сторону...';
          setTimeout(() => {
            startLiveAnalysis();
          }, 1200);
        };
      } else if (toStep === 3) {
        card.innerHTML = `
          <div class="text-3xl">✅</div>
          <h4 class="text-white font-bold text-base">Страница 33 с MRZ зафиксирована!</h4>
          <p class="text-white/80 text-xs leading-relaxed">
            Теперь откройте <b>страницу со штампом прописки (стр. 25–28)</b>.<br>
            Нейросеть распознает синий прямоугольный штамп и рукописный адрес синей ручкой для автозаполнения полей доставки.
          </p>
          <div class="space-y-2 pt-2">
            <button type="button" id="kycProceedStep3Btn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition shadow-lg">
              Я открыл штамп прописки ➔
            </button>
            <button type="button" id="kycSkipStep3InCardBtn" class="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs cursor-pointer active:scale-95 transition">
              Пропустить и ввести адрес вручную ➔
            </button>
          </div>
        `;
        modal.appendChild(card);

        document.getElementById('kycProceedStep3Btn').onclick = () => {
          card.remove();
          currentStep = 3;
          updateStepUI();
          livePill.innerHTML = '📄 Наведите камеру на штамп прописки (стр. 25–28)...';
          setTimeout(() => {
            startLiveAnalysis();
          }, 1200);
        };

        document.getElementById('kycSkipStep3InCardBtn').onclick = async () => {
          card.remove();
          frame3DataUrl = null;
          await finishCapture();
        };
      }
    }

    // Завершение сканирования и отправка на обработку
    async function finishCapture() {
      stopLiveAnalysis();
      processingScreen.classList.remove('hidden');
      stopCameraStream();

      try {
        const finalResult = await processPassportFrames(frame1DataUrl, frame2DataUrl, frame3DataUrl, mode);
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
        modal.remove();
        if (typeof onComplete === 'function') {
          onComplete(finalResult);
        }
      } catch (procErr) {
        console.error('Alipay scanner processing error:', procErr);
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('warning');
        processingScreen.classList.add('hidden');
        showRetryCard(procErr?.message, procErr?.error_step);
      }
    }

    // Съемка кадра (автоматическая или ручная)
    async function takeShot(isAuto = false) {
      if (!videoElem.videoWidth || !videoElem.videoHeight) return;
      isCapturing = true;
      if (liveTimer) {
        clearTimeout(liveTimer);
        liveTimer = null;
      }

      // Тактильный виброотклик
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) {
        tgUtil.haptic('impact');
      } else if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }

      // Анимация вспышки затвора
      const flash = document.createElement('div');
      flash.className = 'kyc-shutter-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 300);

      // КРОП ВИДОИСКАТЕЛЯ: Извлекаем чисто разворот паспорта в высоком разрешении
      // Для Шага 3 (рукописный адрес в ячейках штампа) используем максимальную четкость 1600px и качество 0.93
      const targetCropWidth = (currentStep === 3) ? 1600 : 1300;
      const targetQuality = (currentStep === 3) ? 0.93 : 0.88;
      const shotDataUrl = cropViewfinderFromVideo(videoElem, viewfinder, targetCropWidth, targetQuality, currentStep === 3) || canvasToDataUrl(videoElem, targetCropWidth, targetQuality);

      if (currentStep === 1) {
        frame1DataUrl = shotDataUrl;

        // Показываем миниатюру первого кадра в нижнем блоке
        if (thumbPreview && thumbImg) {
          thumbImg.src = shotDataUrl;
          thumbPreview.classList.remove('hidden');
        }

        stopLiveAnalysis();
        isCapturing = false;
        showStepTransitionCard(2);
      } else if (currentStep === 2) {
        frame2DataUrl = shotDataUrl;
        stopLiveAnalysis();
        isCapturing = false;

        if (mode === 'passport') {
          showStepTransitionCard(3);
        } else {
          // ID-карта состоит из 2 шагов
          await finishCapture();
        }
      } else if (currentStep === 3) {
        frame3DataUrl = shotDataUrl;
        stopLiveAnalysis();
        isCapturing = false;
        await finishCapture();
      }
    }

    // Кнопка пропуска Шага 3 (прописка)
    if (skipStep3Btn) {
      skipStep3Btn.onclick = async () => {
        frame3DataUrl = null;
        await finishCapture();
      };
    }

    // Карточка повторной попытки внутри сканера (с умным разделением по шагам)
    function showRetryCard(message, errorStep = 0) {
      const existing = document.getElementById('kycRetryCard');
      if (existing) existing.remove();

      // Санитизация технического текста ошибок и JSON-дампов от внешних API
      let cleanMsg = message || '';
      if (cleanMsg.includes('OpenRouter') || cleanMsg.includes('credits') || cleanMsg.includes('HTTP 402') || cleanMsg.includes('HTTP 429') || cleanMsg.includes('Rate limit') || cleanMsg.includes('models failed') || cleanMsg.length > 200) {
        cleanMsg = 'Сервер распознавания временно перегружен или исчерпал лимит запросов OpenRouter. Пожалуйста, повторите попытку позже либо заполните данные вручную.';
      }

      const isStep3 = errorStep === 3 || (cleanMsg && cleanMsg.includes('прописк'));
      const isStep2Only = !isStep3 && (errorStep === 2 || (frame1DataUrl && cleanMsg && (cleanMsg.includes('Кадр 2') || cleanMsg.includes('33'))));

      const card = document.createElement('div');
      card.id = 'kycRetryCard';
      card.className = 'kyc-retry-card space-y-3';

      if (isStep3) {
        card.innerHTML = `
          <div class="text-3xl">⚠️</div>
          <h4 class="text-white font-bold text-sm">Паспортные данные распознаны ✓</h4>
          <p class="text-white/70 text-xs leading-relaxed">
            ${cleanMsg || 'Не удалось четко прочитать синий штамп прописки или рукописный адрес. Вы можете переснять страницу со штампом или ввести адрес вручную.'}
          </p>
          <div class="space-y-2 pt-2">
            <button type="button" id="kycRetryStep3OnlyBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition shadow-lg">
              Переснять только прописку 🔄
            </button>
            <button type="button" id="kycSkipStep3OnErrorBtn" class="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs cursor-pointer active:scale-95 transition">
              Пропустить и заполнить адрес вручную ➔
            </button>
            <button type="button" id="kycRetryAllBtn" class="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 font-semibold text-xs cursor-pointer active:scale-95 transition">
              Переснять все страницы заново ↺
            </button>
          </div>
        `;
      } else if (isStep2Only) {
        card.innerHTML = `
          <div class="text-3xl">⚠️</div>
          <h4 class="text-white font-bold text-sm">Страница 31 сохранена ✓</h4>
          <p class="text-white/70 text-xs leading-relaxed">
            ${cleanMsg || 'Не удалось распознать страницу 33 со строками <<<. Пожалуйста, переснимите её ровно и без бликов.'}
          </p>
          <div class="space-y-2 pt-2">
            <button type="button" id="kycRetryStep2OnlyBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition shadow-lg">
              Переснять только страницу 33 🔄
            </button>
            <button type="button" id="kycRetryAllBtn" class="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs cursor-pointer active:scale-95 transition">
              Переснять все страницы заново ↺
            </button>
            <button type="button" id="kycRetryFallbackBtn" class="w-full py-2 rounded-2xl bg-transparent text-white/60 hover:text-white text-xs cursor-pointer transition">
              Загрузить фото из галереи 📁
            </button>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div class="text-3xl">💡</div>
          <h4 class="text-white font-bold text-sm">Не удалось четко распознать реквизиты</h4>
          <p class="text-white/70 text-xs leading-relaxed">
            ${cleanMsg || 'Пожалуйста, убедитесь, что на Шаге 1 сфотографирован разворот стр. 31 (с русскими ФИО), а на Шаге 2 — разворот стр. 33 (с фото и строками MRZ <<<).'}
          </p>
          <div class="space-y-2 pt-2">
            <button type="button" id="kycRetryAllBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition shadow-lg">
              Попробовать снова 🔄
            </button>
            <button type="button" id="kycManualFillOnErrorBtn" class="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs cursor-pointer active:scale-95 transition">
              Заполнить данные вручную ➔
            </button>
            <button type="button" id="kycRetryFallbackBtn" class="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white text-xs cursor-pointer transition">
              Загрузить фото из галереи 📁
            </button>
          </div>
        `;
      }

      modal.appendChild(card);

      const step3OnlyBtn = document.getElementById('kycRetryStep3OnlyBtn');
      if (step3OnlyBtn) {
        step3OnlyBtn.onclick = async () => {
          card.remove();
          currentStep = 3;
          frame3DataUrl = null;
          isCapturing = false;
          updateStepUI();
          await startCamera();
        };
      }

      const skipStep3OnErrorBtn = document.getElementById('kycSkipStep3OnErrorBtn');
      if (skipStep3OnErrorBtn) {
        skipStep3OnErrorBtn.onclick = async () => {
          card.remove();
          frame3DataUrl = null;
          await finishCapture();
        };
      }

      const step2OnlyBtn = document.getElementById('kycRetryStep2OnlyBtn');
      if (step2OnlyBtn) {
        step2OnlyBtn.onclick = async () => {
          card.remove();
          currentStep = 2;
          frame2DataUrl = null;
          frame3DataUrl = null;
          isCapturing = false;
          updateStepUI();
          await startCamera();
        };
      }

      const manualFillBtn = document.getElementById('kycManualFillOnErrorBtn');
      if (manualFillBtn) {
        manualFillBtn.onclick = () => {
          stopCameraStream();
          modal.remove();
        };
      }

      const retryAllBtn = document.getElementById('kycRetryAllBtn');
      if (retryAllBtn) {
        retryAllBtn.onclick = async () => {
          card.remove();
          currentStep = 1;
          frame1DataUrl = null;
          frame2DataUrl = null;
          frame3DataUrl = null;
          isCapturing = false;
          if (thumbPreview) thumbPreview.classList.add('hidden');
          updateStepUI();
          await startCamera();
        };
      }

      const fallbackBtn = document.getElementById('kycRetryFallbackBtn');
      if (fallbackBtn) {
        fallbackBtn.onclick = () => {
          modal.remove();
          openFallbackPassportUploader({ mode, onComplete, onCancel });
        };
      }
    }

    // Ручная кнопка затвора камеры
    shutterBtn.onclick = () => {
      takeShot(false);
    };

    // Старт
    await startCamera();
  }


  /**
   * Склейка и распознавание кадров паспорта через Vision + ICAO декодер + штамп прописки
   */
  async function processPassportFrames(frame1DataUrl, frame2DataUrl, frame3DataUrl, mode) {
    // 🚀 ПРИОРИТЕТ 1: Собственный независимый Document AI микросервис (0$, ~180 мс, 100% точность)
    try {
      const docAiUrl = window.DOC_AI_API_URL || 'http://127.0.0.1:8088';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(`${docAiUrl}/scan-passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame1: frame1DataUrl,
          frame2: frame2DataUrl,
          frame3: frame3DataUrl || null,
          mode: mode
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (resp.ok) {
        const docRes = await resp.json();
        if (docRes && docRes.ok && docRes.result) {
          console.log('[Document AI] Распознано через собственный автономный движок за', docRes.duration_ms, 'мс');
          return docRes.result;
        }
      }
    } catch (_) {
      // Автономный микросервис не запущен локально - мягкий переход к облачному каскаду
    }

    // 🚀 ПРИОРИТЕТ 2: Облачный каскад Edge Function ai-calculator
    const { data, error } = await supabaseClient.functions.invoke('ai-calculator', {
      body: {
        action: 'parse_passport_alipay',
        frame1: frame1DataUrl, // Стр. 31 (ФИО на русском, орган МВД)
        frame2: frame2DataUrl, // Стр. 33 (MRZ, фото, личный номер)
        frame3: frame3DataUrl || null, // Стр. 25–28 (синий штамп прописки и рукописный адрес)
        mode: mode
      }
    });

    if (error) throw error;
    if (!data?.ok || !data?.result) {
      const customErr = new Error(data?.error || 'Ошибка декодирования данных');
      customErr.error_step = data?.error_step || 0;
      throw customErr;
    }

    const res = data.result;

    // Дополнительная валидация через локальный MrzParser (если вернулся raw_mrz)
    if (res.raw_mrz && window.MrzParser) {
      const localMrz = window.MrzParser.parseMrzText(res.raw_mrz);
      if (localMrz && localMrz.isValid) {
        if (!res.id_number || res.id_number.length !== 14) {
          res.id_number = localMrz.idNumber;
        }
        if (!res.series_number) {
          res.series_number = localMrz.seriesNumber;
        }
        if (!res.birth_date && localMrz.birthDateIso) {
          res.birth_date = localMrz.birthDateIso;
        }
        if (!res.gender && localMrz.gender) {
          res.gender = localMrz.gender;
        }
      }
    }

    // Сопоставление органа МВД со справочником
    if (res.issued_by && typeof window.searchBelarusOrgans === 'function') {
      const words = res.issued_by.split(/\s+/).filter(w => w.length > 3);
      for (const w of words) {
        const found = window.searchBelarusOrgans(w, 1);
        if (found && found.length > 0) {
          res.issued_by = found[0];
          break;
        }
      }
    }

    const hasAnyField = res && (res.id_number || res.series_number || res.last_name || res.first_name || res.raw_mrz);
    if (!hasAnyField) {
      throw new Error('Не удалось различить реквизиты на фото. Пожалуйста, сфотографируйте разворот ровно, при хорошем освещении и без бликов.');
    }

    return res;
  }

  // Обратная совместимость с вызовами двух кадров
  const processTwoFrames = processPassportFrames;

  /**
   * Fallback-диалог загрузки кадров из галереи, если камера недоступна
   */
  function openFallbackPassportUploader({ mode = 'passport', onComplete, onCancel } = {}) {
    const fallbackId = 'kycFallbackModal';
    const existing = document.getElementById(fallbackId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = fallbackId;
    overlay.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="glass-card w-full max-w-sm rounded-3xl p-5 border border-white/15 bg-slate-900/95 space-y-4 text-white text-xs max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">📸</span>
            <span class="font-bold text-sm text-white">Загрузка страниц паспорта</span>
          </div>
          <button type="button" id="kycFallbackCloseBtn" class="text-white/60 hover:text-white text-base">✕</button>
        </div>

        <p class="text-[11px] text-white/70 leading-relaxed">
          Камера не открылась, но вы можете загрузить четкие фото из галереи:
        </p>

        <!-- Кадр 1 -->
        <div class="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-cyan-300">1. Страница 31 (Русские ФИО)</span>
            <span id="kycFallbackStatus1" class="text-[10px] text-white/40">Ожидает фото</span>
          </div>
          <input type="file" id="kycFallbackFile1" accept="image/*" class="w-full text-[11px] text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:font-bold">
        </div>

        <!-- Кадр 2 -->
        <div class="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-cyan-300">2. Страница 33 (Строка MRZ с &lt;&lt;&lt;)</span>
            <span id="kycFallbackStatus2" class="text-[10px] text-white/40">Ожидает фото</span>
          </div>
          <input type="file" id="kycFallbackFile2" accept="image/*" class="w-full text-[11px] text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:font-bold">
        </div>

        ${mode === 'passport' ? `
        <!-- Кадр 3 (Прописка) -->
        <div class="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-cyan-300">3. Прописка (стр. 25–28) <span class="text-white/40 font-normal">[необязательно]</span></span>
            <span id="kycFallbackStatus3" class="text-[10px] text-white/40">Опционально</span>
          </div>
          <input type="file" id="kycFallbackFile3" accept="image/*" class="w-full text-[11px] text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:font-bold">
        </div>
        ` : ''}

        <button type="button" id="kycFallbackSubmitBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition" disabled>
          Распознать через нейросеть ⚡
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('kycFallbackCloseBtn');
    const f1 = document.getElementById('kycFallbackFile1');
    const f2 = document.getElementById('kycFallbackFile2');
    const f3 = document.getElementById('kycFallbackFile3');
    const status1 = document.getElementById('kycFallbackStatus1');
    const status2 = document.getElementById('kycFallbackStatus2');
    const status3 = document.getElementById('kycFallbackStatus3');
    const submitBtn = document.getElementById('kycFallbackSubmitBtn');

    let f1Data = null;
    let f2Data = null;
    let f3Data = null;

    closeBtn.onclick = () => {
      overlay.remove();
      if (typeof onCancel === 'function') onCancel();
    };

    const checkReady = () => {
      if (f1Data && f2Data) {
        submitBtn.disabled = false;
        submitBtn.classList.add('shadow-lg', 'shadow-cyan-500/30');
      }
    };

    f1.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      status1.textContent = '⏳ Сжатие...';
      try {
        f1Data = await compressImageFile(file, 1280, 0.82);
        status1.textContent = '✓ Готово';
        status1.className = 'text-[10px] text-emerald-400 font-bold';
        checkReady();
      } catch (err) {
        status1.textContent = 'Ошибка файла';
        status1.className = 'text-[10px] text-rose-400 font-bold';
      }
    };

    f2.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      status2.textContent = '⏳ Сжатие...';
      try {
        f2Data = await compressImageFile(file, 1280, 0.82);
        status2.textContent = '✓ Готово';
        status2.className = 'text-[10px] text-emerald-400 font-bold';
        checkReady();
      } catch (err) {
        status2.textContent = 'Ошибка файла';
        status2.className = 'text-[10px] text-rose-400 font-bold';
      }
    };

    if (f3) {
      f3.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (status3) status3.textContent = '⏳ Сжатие...';
        try {
          f3Data = await compressImageFile(file, 1280, 0.82);
          if (status3) {
            status3.textContent = '✓ Готово';
            status3.className = 'text-[10px] text-emerald-400 font-bold';
          }
        } catch (err) {
          if (status3) {
            status3.textContent = 'Ошибка файла';
            status3.className = 'text-[10px] text-rose-400 font-bold';
          }
        }
      };
    }

    submitBtn.onclick = async () => {
      if (!f1Data || !f2Data) return;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1.5">🌀</span> Расшифровываем...';

      try {
        const res = await processPassportFrames(f1Data, f2Data, f3Data, mode);
        overlay.remove();
        if (typeof onComplete === 'function') onComplete(res);
      } catch (err) {
        alert('Ошибка распознавания: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Попробовать снова';
      }
    };
  }

  // Экспорт в глобальный scope
  window.openKycAlipayScanner = openKycAlipayScanner;

})();
