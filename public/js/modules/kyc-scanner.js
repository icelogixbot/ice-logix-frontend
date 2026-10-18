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
  function getViewfinderCrop(video, viewfinder) {
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

    // Добавляем 4% запаса, чтобы края документа не обрезались
    const marginX = cropW * 0.04;
    const marginY = cropH * 0.04;
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
  function cropViewfinderFromVideo(video, viewfinder, targetWidth = 1200) {
    const crop = getViewfinderCrop(video, viewfinder);
    if (!crop) return null;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = Math.round((targetWidth * crop.sh) / crop.sw);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
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
    let currentStep = 1; // 1 | 2
    let frame1DataUrl = null;
    let frame2DataUrl = null;

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
              Шаг 1 из 2: Разворот стр. 31 (Русские ФИО)
            </div>
          </div>

          <p id="kycScannerSubText" class="text-[11px] text-white/70 text-center max-w-xs leading-tight">
            Держите документ ровно: камера автоматически распознает стабильность и сделает снимок.
          </p>

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
            Нейросеть декодирует машиночитаемую строку MRZ и сопоставляет орган МВД. Секунду...
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
    let frame1Blocks = null; // Сигнатура блоков страницы 31 для защиты от повторного снимка
    let step2ArmTimer = 0; // Защитная пауза перед разрешением съемки шага 2
    let step2HasMoved = false; // Флаг обязательного перемещения камеры на новую страницу

    // Быстрый оффскрин-холст для анализа кадра в реальном времени (64x48)
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 64;
    sampleCanvas.height = 48;
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

    // Цикл детектора живого эфира: 16-блочный анализ + валидация документа и MRZ
    function runLiveFrameCheck() {
      if (!liveLoopActive || isCapturing) return;

      if (videoElem && videoElem.readyState >= 2 && videoElem.videoWidth && videoElem.videoHeight) {
        const crop = getViewfinderCrop(videoElem, viewfinder);
        if (crop) {
          sampleCtx.drawImage(videoElem, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, 64, 48);
        } else {
          sampleCtx.drawImage(videoElem, 0, 0, 64, 48);
        }

        const imgData = sampleCtx.getImageData(0, 0, 64, 48);
        const data = imgData.data;

        // 1. 16-блочный анализ (4 колонки x 4 строки) для отсечения шумов сенсора
        const blocks = new Float32Array(16);
        let minLuma = 255;
        let maxLuma = 0;
        let totalLuma = 0;

        // Построчная яркость для детекции печатных строк текста (rowLumas)
        const rowLumas = new Float32Array(48);

        // Контраст и яркость в нижней трети видоискателя (строки 32..47 — зона MRZ)
        let bottomLumaMin = 255;
        let bottomLumaMax = 0;
        let bottomLumaSum = 0;
        let bottomPixelCount = 0;

        for (let y = 0; y < 48; y++) {
          const by = Math.min(3, Math.floor(y / 12));
          let rowSum = 0;

          for (let x = 0; x < 64; x++) {
            const bx = Math.min(3, Math.floor(x / 16));
            const bIdx = by * 4 + bx;
            const pIdx = (y * 64 + x) * 4;
            const luma = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];

            blocks[bIdx] += luma;
            totalLuma += luma;
            rowSum += luma;

            if (luma < minLuma) minLuma = luma;
            if (luma > maxLuma) maxLuma = luma;

            if (y >= 32) {
              if (luma < bottomLumaMin) bottomLumaMin = luma;
              if (luma > bottomLumaMax) bottomLumaMax = luma;
              bottomLumaSum += luma;
              bottomPixelCount++;
            }
          }
          rowLumas[y] = rowSum / 64;
        }

        for (let b = 0; b < 16; b++) {
          blocks[b] = blocks[b] / 192;
        }

        const avgLuma = totalLuma / 3072;
        const contrastRange = maxLuma - minLuma;
        const bottomContrast = bottomLumaMax - bottomLumaMin;
        const bottomAvgLuma = bottomPixelCount ? (bottomLumaSum / bottomPixelCount) : 0;

        // Вариативность строк текста (текст паспорта имеет перепады между строками)
        let textLineVariance = 0;
        for (let y = 1; y < 48; y++) {
          textLineVariance += Math.abs(rowLumas[y] - rowLumas[y - 1]);
        }
        textLineVariance = textLineVariance / 47;

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
        // ЗАЩИТА ШАГА 2: Обязательное физическое перемещение на новую страницу
        // ========================================================
        if (currentStep === 2) {
          // Если пользователь ещё не сдвинул камеру с первого разворота
          if (!step2HasMoved) {
            if (blockMotion > 5.5) {
              step2HasMoved = true;
            } else {
              livePill.className = 'kyc-live-pill is-warning mb-2';
              livePill.innerHTML = mode === 'passport'
                ? '🔄 Переверните на стр. 33 (со строками <<<)'
                : '🔄 Переверните карту на обратную сторону';
              viewfinder.classList.remove('is-locked');
              progressBar.style.width = '0%';
              stableCount = 0;
              liveTimer = setTimeout(runLiveFrameCheck, 100);
              return;
            }
          }

          // Защитный таймер минимум 1.5 секунды после съемки первого кадра
          if (Date.now() < step2ArmTimer) {
            livePill.className = 'kyc-live-pill is-warning mb-2';
            livePill.innerHTML = '🔄 Наведите на страницу 33...';
            viewfinder.classList.remove('is-locked');
            progressBar.style.width = '0%';
            stableCount = 0;
            liveTimer = setTimeout(runLiveFrameCheck, 100);
            return;
          }

          // Защита от съемки ТОЙ ЖЕ страницы 31 повторно
          if (frame1Blocks) {
            let diffFromFrame1 = 0;
            for (let b = 0; b < 16; b++) {
              diffFromFrame1 += Math.abs(blocks[b] - frame1Blocks[b]);
            }
            diffFromFrame1 = diffFromFrame1 / 16;
            if (diffFromFrame1 < 3.8) {
              // Это та же страница!
              livePill.className = 'kyc-live-pill is-warning mb-2';
              livePill.innerHTML = '⚠️ Это стр. 31! Переверните на стр. 33 (со строками <<<)';
              viewfinder.classList.remove('is-locked');
              progressBar.style.width = '0%';
              stableCount = 0;
              liveTimer = setTimeout(runLiveFrameCheck, 100);
              return;
            }
          }
        }

        // ========================================================
        // ПРОВЕРКА ОСВЕЩЕНИЯ И ПОДЛИННОСТИ ДОКУМЕНТА (НЕ КОВРИК!)
        // ========================================================
        const isTooDark = avgLuma < 50;
        const isDarkSurface = avgLuma < 75; // Темный коврик мыши, темный стол, ткань
        const isTooBright = avgLuma > 235;

        // Бумага паспорта — светлая (avgLuma 75..235) с контрастом текста
        const isPassportPaper = avgLuma >= 75 && avgLuma <= 235 && contrastRange >= 35;
        const hasTextLines = textLineVariance >= 1.6;

        // На шаге 2 внизу ОБЯЗАТЕЛЬНО должны быть строки MRZ с символами <<<
        const hasMrzAtBottom = mode === 'passport'
          ? (currentStep === 1 ? true : (bottomContrast >= 32 && bottomAvgLuma >= 65))
          : (currentStep === 1 ? true : (bottomContrast >= 28 && bottomAvgLuma >= 65));

        const isSteady = blockMotion <= 4.2;

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
        } else if (isDarkSurface || !isPassportPaper) {
          // Темный коврик мыши, стол или не документ
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = '📄 Поместите светлый разворот паспорта в рамку';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (!hasTextLines) {
          // Пустой белый лист без строк текста
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = '🔍 Расположите паспорт ровно, чтобы был виден текст';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (currentStep === 2 && !hasMrzAtBottom) {
          // На шаге 2 внизу нет строк MRZ
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = '🔍 Наведите нижнюю часть рамки на строки <<< (MRZ)';
          viewfinder.classList.remove('is-locked');
          progressBar.style.width = '0%';
          stableCount = 0;
        } else if (!isSteady) {
          // Паспорт в рамке, но телефон движется
          livePill.className = 'kyc-live-pill mb-2';
          livePill.innerHTML = '✋ Держите телефон ровнее...';
          viewfinder.classList.remove('is-locked');
          stableCount = Math.max(0, stableCount - 2);
          const pct = Math.min(100, Math.round((stableCount / 8) * 100));
          progressBar.style.width = pct + '%';
        } else {
          // ========================================================
          // ДОКУМЕНТ В РАМКЕ И СТАБИЛЕН — УВЕРЕННЫЙ ОБРАТНЫЙ ОТСЧЕТ (~850мс)
          // ========================================================
          stableCount++;
          viewfinder.classList.add('is-locked');
          livePill.className = 'kyc-live-pill is-locked mb-2';

          const pct = Math.min(100, Math.round((stableCount / 8) * 100));
          progressBar.style.width = pct + '%';

          if (stableCount <= 2) {
            livePill.innerHTML = '🎯 Зафиксируйте положение...';
          } else if (stableCount <= 4) {
            livePill.innerHTML = '🎯 Не двигайтесь... 3';
          } else if (stableCount <= 6) {
            livePill.innerHTML = '🎯 Не двигайтесь... 2';
          } else if (stableCount === 7) {
            livePill.innerHTML = '🎯 Замрите... 1';
          } else if (stableCount >= 8 && !isCapturing) {
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
      frame1Blocks = null;
      step2HasMoved = false;
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
      frame1Blocks = null;
      step2HasMoved = false;
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
          stepBadge.textContent = 'Шаг 1 из 2: Разворот стр. 31 (Русские ФИО)';
          subText.textContent = 'Держите верхнюю страницу с ФИО в рамке — камера зафиксирует снимок автоматически.';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all opacity-30';
          topText.textContent = 'ФИО на русском языке и орган выдачи (стр. 31)';
          bottomText.textContent = 'Нижняя часть разворота';
        } else {
          stepBadge.textContent = 'Шаг 2 из 2: Разворот стр. 33 (Строка MRZ с <<<)';
          subText.textContent = 'Наведите на нижнюю страницу со строками знаков <<< — автозахват сработает сам.';
          topZone.className = 'kyc-target-box-name transition-all opacity-30';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold';
          topText.textContent = 'Фото и личный номер';
          bottomText.textContent = 'P<BLR... Строки машиночитаемой зоны <<< (MRZ)';
        }
      } else {
        // ID-карта
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
        openFallbackTwoFrameUploader({ mode, onComplete, onCancel });
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

      // КРОП ВИДОИСКАТЕЛЯ: Извлекаем чисто разворот паспорта в высоком разрешении 1200px
      const shotDataUrl = cropViewfinderFromVideo(videoElem, viewfinder, 1200) || canvasToDataUrl(videoElem, 1280, 0.85);

      if (currentStep === 1) {
        frame1DataUrl = shotDataUrl;
        if (lastBlocks) {
          frame1Blocks = new Float32Array(lastBlocks);
        }

        // Показываем миниатюру первого кадра в нижнем блоке
        if (thumbPreview && thumbImg) {
          thumbImg.src = shotDataUrl;
          thumbPreview.classList.remove('hidden');
        }

        currentStep = 2;
        updateStepUI();

        // Обязательный флаг: Step 2 ждет физического перемещения камеры на новую страницу!
        step2HasMoved = false;
        step2ArmTimer = Date.now() + 1800; // Минимум 1.8 секунды пауза

        livePill.className = 'kyc-live-pill is-warning mb-2';
        livePill.innerHTML = mode === 'passport'
          ? '🔄 Переверните на стр. 33 (со строками <<<)'
          : '🔄 Переверните карту на обратную сторону';

        stableCount = 0;
        lastBlocks = null;
        if (progressBar) progressBar.style.width = '0%';
        if (viewfinder) viewfinder.classList.remove('is-locked');

        // Пауза перед возобновлением анализа
        setTimeout(() => {
          isCapturing = false;
          if (liveLoopActive) {
            runLiveFrameCheck();
          }
        }, 1200);
      } else {
        frame2DataUrl = shotDataUrl;
        stopLiveAnalysis();
        processingScreen.classList.remove('hidden');
        stopCameraStream();

        try {
          const finalResult = await processTwoFrames(frame1DataUrl, frame2DataUrl, mode);
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
          modal.remove();
          if (typeof onComplete === 'function') {
            onComplete(finalResult);
          }
        } catch (procErr) {
          console.error('Alipay scanner processing error:', procErr);
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('warning');
          processingScreen.classList.add('hidden');
          showRetryCard(procErr?.message);
        }
      }
    }

    // Карточка повторной попытки внутри сканера (без блокирующих alert)
    function showRetryCard(message) {
      const existing = document.getElementById('kycRetryCard');
      if (existing) existing.remove();

      const card = document.createElement('div');
      card.id = 'kycRetryCard';
      card.className = 'kyc-retry-card space-y-3';
      card.innerHTML = `
        <div class="text-3xl">💡</div>
        <h4 class="text-white font-bold text-sm">Не удалось четко распознать реквизиты</h4>
        <p class="text-white/70 text-xs leading-relaxed">
          ${message || 'Пожалуйста, убедитесь, что на Шаге 1 сфотографирован разворот стр. 31 (с русскими ФИО), а на Шаге 2 — разворот стр. 33 (с фото и строками MRZ <<<).'}
        </p>
        <div class="space-y-2 pt-2">
          <button type="button" id="kycRetryCardBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs cursor-pointer active:scale-95 transition">
            Попробовать снова 🔄
          </button>
          <button type="button" id="kycRetryFallbackBtn" class="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs cursor-pointer active:scale-95 transition">
            Загрузить фото из галереи 📁
          </button>
        </div>
      `;
      modal.appendChild(card);

      document.getElementById('kycRetryCardBtn').onclick = async () => {
        card.remove();
        currentStep = 1;
        frame1DataUrl = null;
        frame2DataUrl = null;
        frame1Blocks = null;
        step2HasMoved = false;
        isCapturing = false;
        if (thumbPreview) thumbPreview.classList.add('hidden');
        updateStepUI();
        await startCamera();
      };

      document.getElementById('kycRetryFallbackBtn').onclick = () => {
        modal.remove();
        openFallbackTwoFrameUploader({ mode, onComplete, onCancel });
      };
    }

    // Ручная кнопка затвора камеры
    shutterBtn.onclick = () => {
      takeShot(false);
    };

    // Старт
    await startCamera();
  }

  /**
   * Склейка и распознавание двух кадров через Vision + MRZ ICAO декодер
   */
  async function processTwoFrames(frame1DataUrl, frame2DataUrl, mode) {
    // Вызываем Edge Function ai-calculator с обоими кадрами
    const { data, error } = await supabaseClient.functions.invoke('ai-calculator', {
      body: {
        action: 'parse_passport_alipay',
        frame1: frame1DataUrl, // Стр. 31 (ФИО на русском, орган МВД)
        frame2: frame2DataUrl, // Стр. 33 (MRZ, фото, личный номер)
        mode: mode
      }
    });

    if (error) throw error;
    if (!data?.ok || !data?.result) {
      throw new Error(data?.error || 'Ошибка декодирования данных');
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

  /**
   * Fallback-диалог загрузки двух кадров, если камера недоступна
   */
  function openFallbackTwoFrameUploader({ mode = 'passport', onComplete, onCancel } = {}) {
    const fallbackId = 'kycFallbackModal';
    const existing = document.getElementById(fallbackId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = fallbackId;
    overlay.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4';
    overlay.innerHTML = `
      <div class="glass-card w-full max-w-sm rounded-3xl p-5 border border-white/15 bg-slate-900/95 space-y-4 text-white text-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">📸</span>
            <span class="font-bold text-sm text-white">Загрузка 2-х страниц паспорта</span>
          </div>
          <button type="button" id="kycFallbackCloseBtn" class="text-white/60 hover:text-white text-base">✕</button>
        </div>

        <p class="text-[11px] text-white/70 leading-relaxed">
          Камера не открылась, но вы можете загрузить 2 четких фото из галереи для безошибочного считывания MRZ:
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

        <button type="button" id="kycFallbackSubmitBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition" disabled>
          Распознать через MRZ ⚡
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = document.getElementById('kycFallbackCloseBtn');
    const f1 = document.getElementById('kycFallbackFile1');
    const f2 = document.getElementById('kycFallbackFile2');
    const status1 = document.getElementById('kycFallbackStatus1');
    const status2 = document.getElementById('kycFallbackStatus2');
    const submitBtn = document.getElementById('kycFallbackSubmitBtn');

    let f1Data = null;
    let f2Data = null;

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

    submitBtn.onclick = async () => {
      if (!f1Data || !f2Data) return;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-1.5">🌀</span> Расшифровываем MRZ...';

      try {
        const res = await processTwoFrames(f1Data, f2Data, mode);
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
