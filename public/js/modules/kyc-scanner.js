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
        <div class="kyc-scanner-frame-wrap">
          <div id="kycViewfinder" class="kyc-scanner-viewfinder">
            <!-- Уголки -->
            <div class="kyc-scanner-corner tl"></div>
            <div class="kyc-scanner-corner tr"></div>
            <div class="kyc-scanner-corner bl"></div>
            <div class="kyc-scanner-corner br"></div>

            <!-- Лазерная линия сканирования -->
            <div class="kyc-scanner-laser"></div>

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
          <!-- Бейдж текущего шага -->
          <div id="kycStepBadge" class="px-4 py-1.5 rounded-full bg-cyan-950/80 backdrop-blur-md border border-cyan-400/50 text-cyan-300 text-xs font-bold text-center kyc-scanner-badge-active">
            Шаг 1 из 2: Разворот стр. 31 (Русские ФИО)
          </div>

          <p id="kycScannerSubText" class="text-[11px] text-white/70 text-center max-w-xs leading-tight">
            Поместите верхнюю страницу с ФИО на русском языке в рамку и нажмите круглую кнопку затвора.
          </p>

          <!-- Кнопка затвора камеры -->
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
    const stepBadge = document.getElementById('kycStepBadge');
    const subText = document.getElementById('kycScannerSubText');
    const topZone = document.getElementById('kycTargetTopZone');
    const bottomZone = document.getElementById('kycTargetBottomZone');
    const topText = document.getElementById('kycTargetTopText');
    const bottomText = document.getElementById('kycTargetBottomText');
    const shutterBtn = document.getElementById('kycShutterBtn');
    const processingScreen = document.getElementById('kycProcessingScreen');

    // Закрытие сканера
    const closeModal = () => {
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
      modePassportBtn.className = 'px-3 py-1 rounded-full bg-cyan-500 text-black shadow-md transition cursor-pointer';
      modeIdCardBtn.className = 'px-3 py-1 rounded-full text-white/70 hover:text-white transition cursor-pointer';
      viewfinder.classList.remove('id-card-mode');
      updateStepUI();
    };

    modeIdCardBtn.onclick = () => {
      mode = 'idcard';
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
          subText.textContent = 'Поместите верхнюю страницу паспорта с ФИО на русском языке в рамку и нажмите кнопку съемки.';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all opacity-30';
          topText.textContent = 'ФИО на русском языке и орган выдачи (стр. 31)';
          bottomText.textContent = 'Нижняя часть разворота';
        } else {
          stepBadge.textContent = 'Шаг 2 из 2: Разворот стр. 33 (Строка MRZ с <<<)';
          subText.textContent = 'Теперь наведите на нижнюю страницу с фото лица и двумя строками со знаками <<<. Нажмите кнопку съемки.';
          topZone.className = 'kyc-target-box-name transition-all opacity-30';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold';
          topText.textContent = 'Фото и реквизиты документа';
          bottomText.textContent = 'P<BLR... Нижние строки со знаками <<< (MRZ)';
        }
      } else {
        // ID-карта
        if (currentStep === 1) {
          stepBadge.textContent = 'Шаг 1 из 2: Лицевая сторона ID-карты';
          subText.textContent = 'Поместите лицевую сторону пластиковой ID-карты в рамку и нажмите кнопку съемки.';
          topZone.className = 'kyc-target-box-name transition-all border-cyan-400/60 bg-cyan-500/15 text-white font-bold';
          bottomZone.className = 'kyc-target-box-mrz transition-all opacity-30';
          topText.textContent = 'Фотография и ФИО';
          bottomText.textContent = 'Номер документа';
        } else {
          stepBadge.textContent = 'Шаг 2 из 2: Обратная сторона ID-карты';
          subText.textContent = 'Переверните карту на обратную сторону со строками машиночитаемой зоны <<< и нажмите кнопку съемки.';
          topZone.className = 'kyc-target-box-name transition-all opacity-30';
          bottomZone.className = 'kyc-target-box-mrz transition-all border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold';
          topText.textContent = 'Личный 14-значный номер';
          bottomText.textContent = 'I<BLR... Строки машиночитаемой зоны (MRZ)';
        }
      }
    }

    // Запуск видеопотока камеры
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
    } catch (err) {
      console.warn('Camera access failed, opening smart 2-frame file fallback:', err);
      modal.remove();
      openFallbackTwoFrameUploader({ mode, onComplete, onCancel });
      return;
    }

    // Съемка кадра по клику затвора
    shutterBtn.onclick = async () => {
      if (!videoElem.videoWidth || !videoElem.videoHeight) return;

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

      // Захват кадра в Canvas
      const canvas = document.createElement('canvas');
      canvas.width = videoElem.videoWidth;
      canvas.height = videoElem.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
      const shotDataUrl = canvasToDataUrl(canvas, 1280, 0.82);

      if (currentStep === 1) {
        frame1DataUrl = shotDataUrl;
        currentStep = 2;
        updateStepUI();
      } else {
        frame2DataUrl = shotDataUrl;
        // Переход к обработке
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
          const errText = procErr?.message || '';
          if (errText.includes('402') || errText.includes('credits')) {
            alert('Сервис распознавания временно недоступен (лимит запросов). Пожалуйста, введите данные вручную или повторите через минуту.');
          } else {
            alert(errText || 'Не удалось распознать строки MRZ. Пожалуйста, сфотографируйте разворот ровно без бликов или введите данные в поля.');
          }
          modal.remove();
        }
      }
    };
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
