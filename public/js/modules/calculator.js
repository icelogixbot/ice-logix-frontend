// ============================================================
// ICE LOGIX Module: Calculator & Pricing Logic
// ============================================================
    // ==================== GLOBAL CALCULATOR AI HELPERS ====================
    // Маппинг регионов → платформы
    const _regionPlatforms = {
      CN: ['poizon', 'taobao', 'tmall', '1688', 'jd', 'pinduoduo', 'xianyu', 'xiaohongshu', 'weidian'],
      EU: ['zalando', 'aboutyou', 'asos', 'farfetch', 'endclothing', 'mrporter', 'mytheresa', 'ssense', 'vinted', 'sneakerstudio'],
      US: ['goat', 'stockx'],
      JP: ['mercari'],
    };

    window.runAiProductSearch = async () => {
      const btn = document.getElementById('calcAiSearchRunBtn');
      const resultBox = document.getElementById('calcAiSearchResult');
      if (!btn || !resultBox) return;

      const files = window._aiSearchFiles || [];
      const hintVal = (document.getElementById('aiPhotoHint')?.value || '').trim();

      // Оба поля обязательны
      if (files.length === 0) {
        tgUtil.alert('Пожалуйста, загрузите фото товара!');
        return;
      }
      if (!hintVal) {
        tgUtil.alert('Пожалуйста, введите описание товара (бренд, модель, цвет)!');
        return;
      }

      // Платформы по выбранному региону
      const region = window._aiSearchRegion || 'all';
      const platforms = region === 'all' ? undefined : _regionPlatforms[region] || undefined;

      const origBtnText = btn.innerHTML;
      btn.innerHTML = '<span class="animate-spin inline-block mr-1">⌛</span> ИИ и парсер ищут товар…';
      btn.disabled = true;

      resultBox.classList.remove('hidden');
      resultBox.innerHTML = `
        <div class="glass-card p-4 rounded-2xl border border-cyan-500/30 text-center space-y-2 bg-cyan-950/20">
          <div class="text-2xl animate-bounce">🔍</div>
          <p class="text-cyan-300 font-bold text-xs">ИИ анализирует фото и ищет товар на площадках...</p>
          <p class="text-white/40 text-[10px]">Это может занять до 60 секунд</p>
        </div>
      `;

      try {
        let searchData = null;

        // 1. Upload all photos to Storage
        const files = window._aiSearchFiles || (window._aiSearchFile ? [window._aiSearchFile] : []);
        if (files.length === 0) { throw new Error('Нет фото для поиска'); }

        let sessionId = localStorage.getItem('icelogix_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem('icelogix_session_id', sessionId);
        }

        const screenshotPaths = [];
        for (const f of files) {
          const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
          const spath = `${sessionId}/${Date.now()}_calc_${safeName}`;
          const { error: upErr } = await supabaseClient.storage
            .from('product-screenshots')
            .upload(spath, f, { contentType: f.type, upsert: false });
          if (upErr) throw new Error('Ошибка загрузки фото: ' + upErr.message);
          screenshotPaths.push(spath);
        }

        const authVal = (document.getElementById('aiAuthTier')?.value || 'all');
        const condVal = (document.getElementById('aiItemCondition')?.value || 'all');
        const maxPriceVal = parseFloat(document.getElementById('aiMaxPrice')?.value) || null;

        // 2. Вызываем search-by-image через XHR (SDK invoke ломается на iOS Safari)
        const payload = JSON.stringify({
          screenshotPath: screenshotPaths[0],
          screenshotPaths: screenshotPaths,
          descriptionHint: hintVal,
          authenticity: authVal,
          condition: condVal,
          maxPrice: maxPriceVal,
          platforms
        });

        // Берём auth token из текущей сессии (если есть)
        let authToken = SUPABASE_ANON_KEY;
        try {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) authToken = session.access_token;
        } catch (_) { /* fallback to anon key */ }

        searchData = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/search-by-image');
          xhr.setRequestHeader('Content-Type', 'application/json');
          // Публичный ключ sb_publishable_ нельзя слать как Bearer: Bearer только для JWT сессии пользователя
          if (authToken.startsWith('eyJ')) xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
          xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
          xhr.timeout = 120000;
          xhr.onload = () => {
            try {
              const json = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(json);
              } else {
                reject(new Error(json.error || `Сервер вернул ${xhr.status}`));
              }
            } catch (_) {
              reject(new Error(`Сервер вернул ${xhr.status}: ${xhr.responseText.substring(0, 200)}`));
            }
          };
          xhr.onerror = () => reject(new Error('Сетевая ошибка. Проверьте подключение к интернету.'));
          xhr.ontimeout = () => reject(new Error('Поиск занял слишком много времени (>2 мин). Попробуйте ещё раз.'));
          xhr.send(payload);
        });

        if (!searchData?.ok) {
          throw new Error(searchData?.error || 'Не удалось найти товар');
        }

        // API возвращает results, не items
        const results = Array.isArray(searchData.results) ? searchData.results : [];
        const filtered = results.filter(r => r.url && r.title);

        if (filtered.length === 0) {
          tgUtil.haptic('warning');
          resultBox.innerHTML = `
            <div class="bg-orange-500/20 border border-orange-400/30 rounded-xl p-4 text-center space-y-2">
              <div class="text-2xl">📸</div>
              <p class="text-white/90 text-xs font-bold">Не удалось найти точное совпадение</p>
              <p class="text-white/50 text-[10px]">Пожалуйста, загрузите более чёткое фото товара при хорошем освещении или измените описание и фильтры.</p>
            </div>
          `;
          return;
        }

        // Сохраняем для использования в кнопках
        window._aiSearchResults = filtered;
        window._aiSearchScreenshotPath = screenshotPaths[0] || null;

        tgUtil.haptic('success');

        // Строим карточки
        const _esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        const cards = filtered.map((r, i) => {
          const priceNum = (typeof r.price === 'number' && isFinite(r.price)) ? r.price : null;
          const currency = typeof r.currency === 'string' ? _esc(r.currency) : '';
          const priceLine = (priceNum && currency)
            ? `<span class="text-cyan-400 font-extrabold text-sm">${priceNum} ${currency}</span>`
            : '<span class="text-white/40 text-xs">Цена не определена</span>';
          const imgUrl = r.image_url || null;
          const img = imgUrl
            ? `<img src="${_esc(imgUrl)}" class="w-16 h-16 object-cover rounded-xl flex-shrink-0 border border-white/10" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
            : '<div class="w-16 h-16 bg-white/10 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl border border-white/10">🛍️</div>';
          const title = _esc(r.title || '(без названия)');
          const platformLabel = _esc(r.platform_label || r.platform || '');
          const flag = _esc(r.flag || '');
          const safeUrl = r.url || '';

          return `
            <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 hover:border-cyan-500/30 transition">
              ${img}
              <div class="flex-1 min-w-0">
                <div class="text-[10px] text-white/50 mb-0.5">${flag} ${platformLabel}</div>
                <div class="text-xs font-bold text-white leading-snug line-clamp-2" title="${title}">${title}</div>
                <div class="mt-1">${priceLine}</div>
                <div class="flex gap-2 mt-2">
                  <button type="button" data-calc-pick="${i}" class="flex-1 py-2 rounded-lg text-[10px] font-bold text-white bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 active:scale-95 transition cursor-pointer">✓ Выбрать</button>
                  ${safeUrl ? `<button type="button" data-calc-goto="${i}" class="py-2 px-3 rounded-lg text-[10px] font-bold text-cyan-300 bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition cursor-pointer">↗ Перейти</button>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');

        const queryText = searchData.query || searchData.enhanced_query || searchData.vision_query || hintVal;
        const platformsCount = Array.isArray(searchData.platforms) ? searchData.platforms.length : 0;
        const replicaBanner = searchData.authenticity_tier === 'replica' 
          ? `<div class="bg-orange-500/20 border border-orange-500/40 text-orange-400 p-2 rounded-lg text-[10px] font-bold mb-2 flex items-center gap-1">⚠️ Найдены реплики</div>` 
          : '';

        resultBox.innerHTML = `
          <div class="glass-card p-4 border border-cyan-500/30 rounded-2xl bg-cyan-950/30 space-y-3 shadow-xl">
            <div class="flex items-center justify-between text-xs font-bold text-cyan-300 border-b border-white/10 pb-2">
              <span>✨ Найдено ${filtered.length} товаров</span>
              ${platformsCount ? `<span class="text-white/40 text-[10px] font-normal">на ${platformsCount} площадках</span>` : ''}
            </div>
            ${queryText ? `<div class="text-[10px] text-white/50">Запрос: <span class="text-cyan-300">"${_esc(queryText)}"</span></div>` : ''}
            ${replicaBanner}
            <div class="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">${cards}</div>
            <div class="pt-2 border-t border-white/10">
              <button type="button" onclick="window.cancelAiSearchResult()" class="w-full py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white/80 active:scale-95 transition cursor-pointer bg-transparent border-0">
                ❌ Отменить
              </button>
            </div>
          </div>
        `;

        // Навешиваем обработчики на карточки
        resultBox.querySelectorAll('[data-calc-pick]').forEach(pickBtn => {
          pickBtn.addEventListener('click', () => {
            const idx = parseInt(pickBtn.dataset.calcPick, 10);
            const picked = filtered[idx];
            if (!picked) return;
            tgUtil.haptic('light');
            window._showPickOptions(picked, idx);
          });
        });
        resultBox.querySelectorAll('[data-calc-goto]').forEach(gotoBtn => {
          gotoBtn.addEventListener('click', () => {
            const idx = parseInt(gotoBtn.dataset.calcGoto, 10);
            const picked = filtered[idx];
            if (!picked?.url) return;
            tgUtil.openLink(picked.url);
          });
        });

      } catch (err) {
        tgUtil.haptic('warning');
        resultBox.innerHTML = `
          <div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-xs text-white/90">
            ⚠️ Ошибка поиска: ${err.message || 'Не удалось найти товар'}
          </div>
        `;
      } finally {
        btn.innerHTML = origBtnText;
        btn.disabled = false;
      }
    };

    // Показать опции для выбранного товара (Заполнить ИИ / Ввести вручную)
    window._showPickOptions = (item, idx) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm page-enter';
      overlay.innerHTML = `
        <div class="w-full max-w-md pb-8 bg-slate-900 border-t border-cyan-500/30 rounded-t-3xl p-5 space-y-3 shadow-2xl" style="animation: slideUp 0.3s ease-out">
          <div class="flex gap-3 items-center pb-3 border-b border-white/10">
            ${item.image_url ? `<img src="${item.image_url}" class="w-14 h-14 rounded-xl object-cover border border-white/10">` : '<div class="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-xl">🛍️</div>'}
            <div class="flex-1 min-w-0">
              <div class="text-xs font-bold text-white truncate">${item.title || 'Товар'}</div>
              <div class="text-xs text-cyan-300 font-bold mt-0.5">${item.price ? item.price + ' ' + (item.currency || '') : 'Цена не определена'}</div>
              <div class="text-[10px] text-white/40">${item.flag || ''} ${item.platform_label || item.platform || ''}</div>
            </div>
          </div>
          <button type="button" id="pickAutoFill" class="btn-primary w-full py-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer border-0">
            ✨ Заполнить данные автоматически (ИИ)
          </button>
          <button type="button" id="pickManual" class="w-full py-3 rounded-xl font-bold text-xs text-cyan-300 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition cursor-pointer">
            ✏️ Ввести данные самостоятельно
          </button>
          <button type="button" id="pickCancel" class="w-full py-2 rounded-xl text-xs font-semibold text-white/50 hover:text-white/80 active:scale-95 transition cursor-pointer bg-transparent border-0">
            ← Назад к результатам
          </button>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();

      overlay.querySelector('#pickAutoFill').onclick = async () => {
        close();
        // Оцениваем вес для выбранного товара
        let estWeight = 1.0;
        try {
          const calcWeightRes = await supabaseClient.functions.invoke('ai-calculator', {
            body: {
              action: 'estimate_weight',
              description: item.title || '',
              screenshotPath: window._aiSearchScreenshotPath || null
            }
          });
          if (calcWeightRes.data?.ok) {
            estWeight = parseFloat(calcWeightRes.data.estimated_weight || calcWeightRes.data.weight) || 1.0;
          }
        } catch(e) {
          console.warn('Weight estimation fallback:', e);
        }

        window._pendingAiData = {
          title: item.title || 'Товар',
          price: item.price || 0,
          currency: item.currency || 'CNY',
          weight: estWeight,
          link: item.url || '',
          image: item.image_url || null,
          country: item.country || 'CN'
        };
        window._calcMode = 'manual';
        window.renderCurrentScreen();
      };

      overlay.querySelector('#pickManual').onclick = () => {
        close();
        if (item.url) {
          navigator.clipboard.writeText(item.url).catch(() => {});
          glassToast('Ссылка скопирована! Заполните данные вручную', { kind: 'info' });
        }
        window._calcMode = 'manual';
        window.renderCurrentScreen();
      };

      overlay.querySelector('#pickCancel').onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    };

    window.applyAiSearchResult = (autoFill) => {
      tgUtil.haptic('light');
      if (autoFill && window._currentAiFoundItem) {
        window._pendingAiData = window._currentAiFoundItem;
      } else if (!autoFill && window._currentAiFoundItem?.link) {
        navigator.clipboard.writeText(window._currentAiFoundItem.link);
        glassToast('Ссылка скопирована! Заполните данные вручную', { kind: 'info' });
      }
      window._calcMode = 'manual';
      window.renderCurrentScreen();
    };

    window.cancelAiSearchResult = () => {
      tgUtil.haptic('light');
      window._currentAiFoundItem = null;
      // Revoke all blob URLs
      if (window._aiSearchBlobUrls) {
        window._aiSearchBlobUrls.forEach(u => URL.revokeObjectURL(u));
      }
      window._aiSearchFiles = [];
      window._aiSearchBlobUrls = [];
      window._aiSearchFile = null;
      window._aiSearchResults = null;
      window._calcMode = 'manual';
      window.renderCurrentScreen();
    };

    window.handleAiSearchPhotoSelect = (input) => {
      const newFiles = Array.from(input.files || []);
      if (!newFiles.length) return;

      if (!window._aiSearchFiles) window._aiSearchFiles = [];
      if (!window._aiSearchBlobUrls) window._aiSearchBlobUrls = [];

      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) { tgUtil.alert('Только изображения!'); continue; }
        if (file.size > 10 * 1024 * 1024) { tgUtil.alert('Файл ' + file.name + ' больше 10 МБ!'); continue; }
        if (window._aiSearchFiles.length >= 5) { tgUtil.alert('Максимум 5 фото!'); break; }
        window._aiSearchFiles.push(file);
        window._aiSearchBlobUrls.push(URL.createObjectURL(file));
      }

      // Re-render to show previews
      window.renderCurrentScreen();

      // After render, set img srcs from blob URLs
      requestAnimationFrame(() => {
        const thumbs = document.querySelectorAll('.ai-photo-thumb');
        thumbs.forEach((img) => {
          const idx = parseInt(img.dataset.idx, 10);
          if (window._aiSearchBlobUrls && window._aiSearchBlobUrls[idx]) {
            img.src = window._aiSearchBlobUrls[idx];
          }
        });
      });
    };

    window.removeAiSearchPhoto = (idx) => {
      if (!window._aiSearchFiles || !window._aiSearchBlobUrls) return;
      // Revoke the blob URL to free memory
      if (window._aiSearchBlobUrls[idx]) {
        URL.revokeObjectURL(window._aiSearchBlobUrls[idx]);
      }
      window._aiSearchFiles.splice(idx, 1);
      window._aiSearchBlobUrls.splice(idx, 1);
      window.renderCurrentScreen();
      // Re-set blob URLs after render
      requestAnimationFrame(() => {
        const thumbs = document.querySelectorAll('.ai-photo-thumb');
        thumbs.forEach((img) => {
          const i = parseInt(img.dataset.idx, 10);
          if (window._aiSearchBlobUrls && window._aiSearchBlobUrls[i]) {
            img.src = window._aiSearchBlobUrls[i];
          }
        });
      });
    };

    window.clearAiSearchPhoto = () => {
      // Revoke all blob URLs
      if (window._aiSearchBlobUrls) {
        window._aiSearchBlobUrls.forEach(u => URL.revokeObjectURL(u));
      }
      window._aiSearchFiles = [];
      window._aiSearchBlobUrls = [];
      window._aiSearchFile = null; // backward compat
      window.renderCurrentScreen();
    };
    // ==================== GLOBAL CALCULATOR HELPERS ====================
    window.selectCalculatorCountry = (c) => {
      if (c === 'CN') {
        window.calcCountry = 'CN';
        tgUtil.haptic('success');
        renderCurrentScreen();
        
        // Lock currency selection when CN is selected
        setTimeout(() => {
          const currencySelect = document.getElementById('calcCurrency');
          if (currencySelect) {
            currencySelect.value = 'CNY';
            currencySelect.disabled = true;
            currencySelect.classList.add('cursor-not-allowed', 'opacity-60');
          }
        }, 50);
      } else {
        tgUtil.haptic('warning');
        const cObj = ALL_COUNTRIES.find(x => x.code === c);
        const name = cObj ? cObj.name : c;
        glassToast(`Направление (${name}) временно недоступно. Скоро мы запустим доставку из этой страны!`, { kind: 'info' });
      }
    };

    window.selectImportedCalculation = (serializedData) => {
      try {
        if (typeof window.selectImportedCalculationByIndex === 'function' && typeof serializedData === 'number') {
          return window.selectImportedCalculationByIndex(serializedData);
        }
        let c = null;
        if (typeof serializedData === 'string') {
          c = JSON.parse(decodeURIComponent(serializedData));
        } else if (typeof serializedData === 'object' && serializedData !== null) {
          c = serializedData;
        }
        if (!c) return;

        if (typeof tgUtil !== 'undefined' && typeof tgUtil.haptic === 'function') {
          tgUtil.haptic('success');
        }

        window._pendingImportCalc = c;
        if (c.image_url) {
          window.orderImportedImageUrl = c.image_url;
        }
        window.orderAddSubMode = 'manual';
        window.orderLinkAnalyzed = true;

        if (typeof renderCurrentScreen === 'function') {
          renderCurrentScreen().then(() => {
            if (typeof window.renderManualPhotoPreviews === 'function') {
              window.renderManualPhotoPreviews();
            }
            if (typeof glassToast === 'function') {
              glassToast('Данные расчета успешно импортированы!', { kind: 'success' });
            }
          });
        }
      } catch(e) {
        console.error('selectImportedCalculation error:', e);
        if (typeof glassToast === 'function') {
          glassToast('Ошибка импорта расчета', { kind: 'error' });
        }
      }
    };

    // ==================== CATEGORY PICKER SHEET ====================
    window.openCategoryPickerSheet = (prefix = 'calc') => {
      window._activeCategoryPickerPrefix = prefix;
      const gender = document.getElementById(`${prefix}Gender`)?.value || 'Унисекс';
      const overlay = document.createElement('div');
      overlay.className = 'gx-sheet-overlay show';
      
      overlay.innerHTML = `
        <div class="gx-sheet" role="dialog" aria-modal="true" style="max-height: 80vh; display: flex; flex-direction: column;">
          <div class="gx-sheet-handle"></div>
          <div class="gx-sheet-header" style="flex-shrink: 0;">
            <div class="gx-sheet-title">Выбор категории товара</div>
            <button class="gx-sheet-close" aria-label="Закрыть">${ix('x', { size: '18px' })}</button>
          </div>
          <div class="gx-sheet-list" role="listbox" style="flex-grow: 1; overflow-y: auto; padding-bottom: 24px;">
            <!-- Dynamic step rendering -->
          </div>
        </div>
      `;
      
      const list = overlay.querySelector('.gx-sheet-list');
      const currentVal = document.getElementById(`${prefix}Category`)?.value || '';
      
      window.renderStep1 = () => {
        list.innerHTML = `
          <div class="p-4 flex flex-col gap-3">
            <button type="button" class="gx-sheet-opt font-bold flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl w-full text-left cursor-pointer transition active:scale-95" onclick="window.selectBroadGroup('Обувь')">
              <span class="text-2xl">👟</span>
              <div class="flex-1">
                <div class="text-white text-sm">Обувь</div>
                <div class="text-white/40 text-xs font-normal mt-0.5">Кроссовки, кеды, туфли, ботинки</div>
              </div>
              <span class="text-white/30 text-sm">➔</span>
            </button>
            <button type="button" class="gx-sheet-opt font-bold flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl w-full text-left cursor-pointer transition active:scale-95" onclick="window.selectBroadGroup('Одежда')">
              <span class="text-2xl">👕</span>
              <div class="flex-1">
                <div class="text-white text-sm">Одежда</div>
                <div class="text-white/40 text-xs font-normal mt-0.5">Худи, футболки, джинсы, куртки</div>
              </div>
              <span class="text-white/30 text-sm">➔</span>
            </button>
            <button type="button" class="gx-sheet-opt font-bold flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl w-full text-left cursor-pointer transition active:scale-95" onclick="window.selectBroadGroup('Аксессуары')">
              <span class="text-2xl">👜</span>
              <div class="flex-1">
                <div class="text-white text-sm">Аксессуары</div>
                <div class="text-white/40 text-xs font-normal mt-0.5">Рюкзаки, очки, часы, ремни, парфюм</div>
              </div>
              <span class="text-white/30 text-sm">➔</span>
            </button>
          </div>
        `;
      };
      
      window.selectBroadGroup = (g) => {
        const pref = window._activeCategoryPickerPrefix || 'calc';
        const gend = document.getElementById(`${pref}Gender`)?.value || 'Унисекс';
        const curVal = document.getElementById(`${pref}Category`)?.value || '';
        tgUtil.haptic('light');
        let filtered = CATEGORY_MAP.filter(c => c.broad === g);
        if (gend === 'Мужской') {
          filtered = filtered.filter(c => !['Платье', 'Юбка', 'Купальник'].includes(c.value));
        }
        
        const backBtn = `
          <button type="button" class="flex items-center gap-1.5 px-4 py-3 text-cyan-400 font-bold text-xs bg-white/5 w-full text-left border-b border-white/5 transition hover:bg-white/10 cursor-pointer" onclick="window.renderStep1()">
            <span>←</span>
            <span>Назад к категориям</span>
          </button>
        `;
        
        const items = filtered.map(c => {
          const isSelected = (c.value === curVal);
          const iconHtml = c.icon ? ix(c.icon, { size: '20px' }) : '';
          return `
            <button type="button" class="w-full flex justify-between items-center p-4 bg-transparent border-0 border-b border-white/5 text-white cursor-pointer text-left transition hover:bg-white/5" onclick="window.selectSubcategory('${escapeHtml(c.value)}', '${escapeHtml(g)}')">
              <span class="flex items-center gap-3">
                ${iconHtml}
                <span class="text-sm font-semibold">${escapeHtml(c.value)}</span>
              </span>
              <span class="text-cyan-400 transition-opacity duration-200" style="opacity: ${isSelected ? 1 : 0};">
                ${ix('check', { size: '18px' })}
              </span>
            </button>
          `;
        }).join('');
        
        list.innerHTML = backBtn + `<div class="flex flex-col">${items}</div>`;
      };
      
      window.selectSubcategory = (val, broad) => {
        const pref = window._activeCategoryPickerPrefix || 'calc';
        tgUtil.haptic('medium');
        const hiddenCategory = document.getElementById(`${pref}Category`);
        const categoryText = document.getElementById(`${pref}CategorySelectedText`);
        
        if (hiddenCategory && categoryText) {
          hiddenCategory.value = val;
          categoryText.innerText = `${broad} / ${val}`;
          categoryText.classList.remove('text-white/40');
          categoryText.classList.add('text-white');
          hiddenCategory.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Also set default size suggestions list
        const sizeInput = document.getElementById(`${pref}Size`);
        if (sizeInput) sizeInput.value = '';
        
        closeSheet();
      };

      renderStep1();
      document.body.appendChild(overlay);
      
      const closeSheet = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      };
      
      overlay.querySelector('.gx-sheet-close').addEventListener('click', closeSheet);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSheet();
      });
    };


// ============================================================
// ICE LOGIX: SMART AI CALCULATOR (Hub -> Hardware Bridge / Emulator -> Live Result)
// ============================================================

window._calcMode = window._calcMode || 'hub'; // 'hub' | 'link' | 'photo' | 'text' | 'manual' | 'result'
window._currentCalcItem = window._currentCalcItem || null;
window._calcSelectedSize = window._calcSelectedSize || null;
window._calcSelectedColor = window._calcSelectedColor || null;
window._calcQuantity = window._calcQuantity || 1;
window._calcPhotoFiles = window._calcPhotoFiles || [];
window._calcPhotoBlobUrls = window._calcPhotoBlobUrls || [];
window._calcSkuBundle = window._calcSkuBundle || null;

window.setCalcMode = function(mode) {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
  window._calcMode = mode;
  if (mode === 'hub') {
    window._currentCalcItem = null;
    window._calcSelectedSize = null;
    window._calcSelectedColor = null;
    window._calcQuantity = 1;
    window._calcSkuBundle = null;
  }
  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

window.calculateAllInclusiveByn = function(priceCny, category = 'Обувь', weightKg = null, qty = 1) {
  const pCny = parseFloat(priceCny) || 0;
  const quantity = Math.max(1, parseInt(qty) || 1);
  
  // Real Rate CNY to BYN (from pricing engine or fallback 0.45)
  let cnyRate = 0.45;
  try {
    if (window.iceLogixPricing && window.iceLogixPricing.rates && window.iceLogixPricing.rates.CNY_to_BYN) {
      cnyRate = window.iceLogixPricing.rates.CNY_to_BYN;
    }
  } catch(e) {}

  // Estimated weight by category
  let w = parseFloat(weightKg);
  if (isNaN(w) || w <= 0) {
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('обувь') || catLower.includes('кроссовк') || catLower.includes('ботин')) w = 1.2;
    else if (catLower.includes('куртк') || catLower.includes('пуховик') || catLower.includes('пальто')) w = 1.5;
    else if (catLower.includes('худи') || catLower.includes('толстовк') || catLower.includes('штаны') || catLower.includes('джинс')) w = 0.8;
    else if (catLower.includes('электрон') || catLower.includes('телефон') || catLower.includes('наушник')) w = 0.5;
    else if (catLower.includes('футболк') || catLower.includes('майк') || catLower.includes('шорт')) w = 0.3;
    else w = 1.0;
  }

  const productByn = Math.round(pCny * cnyRate * quantity * 100) / 100;
  // Shipping from China (~$10/kg with USD ~3.27 BYN -> ~32.7 BYN/kg)
  const shippingByn = Math.round(w * 32.7 * quantity * 100) / 100;
  // Service commission (20%, min 9 BYN)
  const commissionByn = Math.max(9, Math.round(productByn * 0.20 * 100) / 100);
  // Insurance 2%
  const insuranceByn = Math.round((productByn + shippingByn) * 0.02 * 100) / 100;
  // Local delivery (EuroPost 5.00 BYN)
  const localDeliveryByn = 5.00;

  const totalByn = Math.round((productByn + shippingByn + commissionByn + insuranceByn + localDeliveryByn) * 100) / 100;

  return {
    priceCny: pCny,
    cnyRate,
    quantity,
    weightKg: w,
    productByn,
    shippingByn,
    commissionByn,
    insuranceByn,
    localDeliveryByn,
    totalByn
  };
};

function saveCalculationToHistory(order) {
  const key = 'ice_calc_history';
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {}
  
  history = history.filter(item => !(item.title === order.title && item.price === order.price));
  
  history.unshift({
    ...order,
    timestamp: Date.now(),
    id: 'calc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  });
  
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  history = history.filter(item => Date.now() - item.timestamp < fourteenDays);
  if (history.length > 50) history = history.slice(0, 50);
  
  localStorage.setItem(key, JSON.stringify(history));
}

window.displayCalcResult = function(item) {
  window._currentCalcItem = item;
  window._calcSelectedSize = item.size || null;
  window._calcSelectedColor = item.color || null;
  window._calcQuantity = item.quantity || 1;
  window._calcSkuBundle = item.skuBundle || null;
  window._calcMode = 'result';

  // Save to history so user can review it or import it
  try {
    const calc = window.calculateAllInclusiveByn(item.price, item.category, item.weight, window._calcQuantity || 1);
    saveCalculationToHistory({
      title: item.title,
      price: item.price,
      currency: item.currency || 'CNY',
      weight: item.weight || calc.weightKg || 0.8,
      category: item.category || 'Одежда',
      total_byn: calc.totalByn,
      image_url: item.image_url || '',
      url: item.url || '',
      platform: item.platform || 'PINDUODUO'
    });
  } catch(e) {}

  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

window.startCheckoutWithItem = function(item) {
  if (!item) item = window._currentCalcItem;
  if (!item) return;

  const bundle = window._calcBundleItems;
  if (Array.isArray(bundle) && bundle.length > 0) {
    const totalQty = bundle.reduce((acc, it) => acc + it.quantity, 0);
    const sumCny = bundle.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const avgPrice = Math.round((sumCny / (totalQty || 1)) * 100) / 100;
    const calc = window.calculateAllInclusiveByn(avgPrice, item.category, item.weight, totalQty);

    window.tempOrder = {
      items: bundle.map(it => {
        const itCalc = window.calculateAllInclusiveByn(it.price, item.category, item.weight, it.quantity);
        return {
          title: item.title || 'Товар',
          price: it.price,
          currency: item.currency || 'CNY',
          weight: item.weight || (calc.weightKg / totalQty) || 0.8,
          total_byn: itCalc.totalByn,
          size: it.size || '',
          color: it.color || '',
          category: item.category || 'Одежда',
          image_url: it.image_url || item.image_url || '',
          url: item.url || '',
          quantity: it.quantity,
          platform: item.platform || 'PINDUODUO'
        };
      }),
      total: calc.totalByn,
      total_byn: calc.totalByn,
      discountAmount: 0,
      appliedPromo: null,
      country: item.country || 'CN',
      url: item.url || '',
      price: avgPrice,
      weight: calc.weightKg
    };
  } else {
    const qty = window._calcQuantity || item.quantity || 1;
    const calc = window.calculateAllInclusiveByn(item.price, item.category, item.weight, qty);

    window.tempOrder = {
      items: [{
        title: item.title || 'Товар',
        price: item.price,
        currency: item.currency || 'CNY',
        weight: item.weight || calc.weightKg || 0.8,
        total_byn: calc.totalByn,
        size: window._calcSelectedSize || item.size || '',
        color: window._calcSelectedColor || item.color || '',
        category: item.category || 'Одежда',
        image_url: item.image_url || '',
        url: item.url || '',
        quantity: qty,
        platform: item.platform || 'PINDUODUO'
      }],
      total: calc.totalByn,
      total_byn: calc.totalByn,
      discountAmount: 0,
      appliedPromo: null,
      country: item.country || 'CN',
      url: item.url || '',
      price: item.price,
      weight: item.weight || calc.weightKg || 0.8
    };
  }

  window.orderAddMode = false;
  window.orderCountry = item.country || 'CN';
  window.orderAddSubMode = null;

  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
  if (typeof window.switchTab === 'function') {
    window.switchTab('neworder');
  } else {
    currentTab = 'neworder';
    renderCurrentScreen();
  }
};

window.addToCartFromCalc = async function(item) {
  if (!item) item = window._currentCalcItem;
  if (!item) return;

  if (!window.userId) {
    if (typeof window.requireAuth === 'function') {
      window.requireAuth('Для добавления в корзину необходимо войти в аккаунт.');
    } else {
      tgUtil.alert('Пожалуйста, войдите в аккаунт');
    }
    return;
  }

  let customCart = [];
  try {
    customCart = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
  } catch(e) {}

  if (window._calcBundleItems && window._calcBundleItems.length > 0) {
    const bundle = window._calcBundleItems;
    let addedCount = 0;
    bundle.forEach(it => {
      const itCalc = window.calculateAllInclusiveByn(it.price, item.category, item.weight, it.quantity);
      customCart.unshift({
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title: item.title,
        price: it.price,
        currency: item.currency || 'CNY',
        quantity: it.quantity,
        size: it.size || '',
        color: it.color || '',
        category: item.category || 'Одежда',
        image_url: it.image_url || item.image_url || '',
        url: item.url || '',
        total_byn: itCalc.totalByn
      });
      addedCount += it.quantity;
    });

    localStorage.setItem('ice_custom_cart', JSON.stringify(customCart));

    const badge = document.getElementById('tabCartBadge');
    if (badge) {
      const current = parseInt(badge.innerText || '0') || 0;
      badge.innerText = current + addedCount;
      badge.classList.remove('hidden');
    }
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
    glassToast(`✨ Добавлено ${addedCount} шт. (${bundle.length} поз.) в корзину!`, { kind: 'success' });
    return;
  }

  // Single item fallback
  const qty = window._calcQuantity || item.quantity || 1;
  const calc = window.calculateAllInclusiveByn(item.price, item.category, item.weight, qty);

  customCart.unshift({
    id: 'c_' + Date.now(),
    title: item.title,
    price: item.price,
    currency: item.currency || 'CNY',
    quantity: qty,
    size: window._calcSelectedSize || item.size || '',
    color: window._calcSelectedColor || item.color || '',
    category: item.category || 'Одежда',
    image_url: item.image_url || '',
    url: item.url || '',
    total_byn: calc.totalByn
  });
  localStorage.setItem('ice_custom_cart', JSON.stringify(customCart));

  const badge = document.getElementById('tabCartBadge');
  if (badge) {
    const current = parseInt(badge.innerText || '0') || 0;
    badge.innerText = current + qty;
    badge.classList.remove('hidden');
  }
  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
  glassToast('✨ Товар добавлен в корзину!', { kind: 'success' });
};

window.updateLiveCalcBreakdown = function() {
  const item = window._currentCalcItem;
  if (!item) return;

  const qty = window._calcQuantity || 1;
  let effectivePrice = item.price;
  if (window._calcBundleItems && window._calcBundleItems.length > 0) {
    const sumCny = window._calcBundleItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    effectivePrice = Math.round((sumCny / (qty || 1)) * 100) / 100;
  }
  const calc = window.calculateAllInclusiveByn(effectivePrice, item.category, item.weight, qty);

  const priceCnyEl = document.getElementById('calcCurrentPriceCny');
  const totalBynEl = document.getElementById('calcTotalBynDisplay');
  const detailCnyEl = document.getElementById('calcDetailCnyPrice');
  const detailProdBynEl = document.getElementById('calcDetailProductByn');
  const detailShipBynEl = document.getElementById('calcDetailShippingByn');
  const detailInsBynEl = document.getElementById('calcDetailInsuranceByn');
  const detailCommBynEl = document.getElementById('calcDetailCommissionByn');
  const qtyValEl = document.getElementById('calcQtyVal');

  if (priceCnyEl) priceCnyEl.innerText = calc.priceCny;
  if (totalBynEl) totalBynEl.innerHTML = (window.UI ? window.UI.money(calc.totalByn, { keepCents: true, digits: 2 }) : calc.totalByn.toFixed(2));
  if (detailCnyEl) detailCnyEl.innerText = calc.priceCny;
  if (detailProdBynEl) detailProdBynEl.innerHTML = `${(window.UI ? window.UI.money(calc.productByn, { keepCents: true, digits: 2 }) : calc.productByn.toFixed(2))}`;
  if (detailShipBynEl) detailShipBynEl.innerHTML = `${(window.UI ? window.UI.money(calc.shippingByn, { keepCents: true, digits: 2 }) : calc.shippingByn.toFixed(2))}`;
  if (detailInsBynEl) detailInsBynEl.innerHTML = `${(window.UI ? window.UI.money(calc.insuranceByn, { keepCents: true, digits: 2 }) : calc.insuranceByn.toFixed(2))}`;
  if (detailCommBynEl) detailCommBynEl.innerHTML = `${(window.UI ? window.UI.money(calc.commissionByn, { keepCents: true, digits: 2 }) : calc.commissionByn.toFixed(2))}`;
  if (qtyValEl) qtyValEl.innerText = qty;
};

// ── HTML VIEW RENDERER ──
window.renderSmartCalculator = async function() {
  const mode = window._calcMode || 'hub';

  // 1. HUB MODE (Selection of calculation method)
  if (mode === 'hub') {
    return `
      <div class="rd-screen page-enter">
        <h1 class="rd-h1">Расчёт заказа</h1>
        <p class="rd-sub">Цена под ключ в Беларуси: выкуп, доставка и страховка уже внутри.</p>

        <div class="rd-modes">
          <div class="calc-mode-card rd-mode rd-mode-main" role="button" tabindex="0" onclick="window.setCalcMode('link')">
            <span class="rd-mode-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1"/></svg></span>
            <span class="rd-mode-body">
              <span class="rd-mode-title">По ссылке</span>
              <span class="rd-mode-text">Вставьте ссылку с Poizon, Taobao, Pinduoduo или 1688, а цену и размеры мы найдём сами.</span>
            </span>
            <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
          </div>

          <div class="calc-mode-card rd-mode" role="button" tabindex="0" onclick="window.setCalcMode('photo')">
            <span class="rd-mode-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 8h3l1.5-2.3h6L16.5 8h3a1 1 0 0 1 1 1v9.2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.3"/></svg></span>
            <span class="rd-mode-body">
              <span class="rd-mode-title">По фото<span class="rd-badge">ИИ</span></span>
              <span class="rd-mode-text">Загрузите фото или скриншот, а мы найдём такую же вещь на площадках.</span>
            </span>
            <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
          </div>

          <div class="calc-mode-card rd-mode" role="button" tabindex="0" onclick="window.setCalcMode('text')">
            <span class="rd-mode-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></svg></span>
            <span class="rd-mode-body">
              <span class="rd-mode-title">По названию</span>
              <span class="rd-mode-text">Напишите бренд и модель, например Nike Dunk Low, и мы подберём актуальные цены.</span>
            </span>
            <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
          </div>
        </div>

        <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" onclick="window.setCalcMode('manual')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>
          Ввести цену вручную
        </button>

        <div class="rd-card rd-incl">
          <div class="rd-incl-title">Что входит в итоговую цену</div>
          <div class="rd-incl-grid">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Выкуп товара</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Доставка из Китая</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Страховка 2%</span>
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Доставка по РБ</span>
          </div>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  // 2. LINK MODE (EMULATOR PROTOTYPE INTEGRATION)
  if (mode === 'link') {
    return `
      <div class="space-y-4 page-enter">
        <div class="flex items-center gap-3 mb-2">
          <button type="button" class="global-back-btn !mb-0" onclick="window.setCalcMode('hub')" title="Назад к выбору способа">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0 text-left">
            <h3 class="text-white font-bold text-sm">Расчет по ссылке</h3>
            <p class="text-white/40 text-[10px]">Poizon, Dewu, Taobao, 1688 и другие площадки</p>
          </div>
        </div>

        <div class="glass-card p-5 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
          <label class="text-white/70 text-xs block mb-1.5 font-medium text-left">Вставьте ссылку на товар <span class="text-cyan-400">*</span></label>
          <div class="flex gap-2 items-stretch">
            <div class="flex-1 flex gap-1 bg-white/5 border border-white/20 rounded-xl overflow-hidden px-2 py-1.5 focus-within:border-cyan-500/60 transition">
              <input type="text" id="calcUrlInput" class="bg-transparent flex-1 border-0 outline-none p-1.5 text-sm text-white placeholder-white/30" placeholder="https://dw4.co/... или taobao.com/...">
              <button type="button" id="calcPasteUrlBtn" class="bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg px-3 transition flex items-center justify-center text-cyan-400 gap-1.5 text-xs font-bold" title="Вставить из буфера">
                📋 Вставить
              </button>
            </div>
            <button type="button" id="calcAnalyzeLinkBtn" class="btn-primary whitespace-nowrap transition px-4 py-2 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
              <span>⚡ Рассчитать</span>
            </button>
          </div>

          <div id="calcLinkStatusBox" class="hidden mt-3 p-3.5 rounded-2xl text-xs text-left"></div>
          <p class="text-white/40 text-[10px] mt-2.5 text-left">Подтянем цену, размеры и цвета прямо со страницы товара.</p>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  // 3. PHOTO MODE
  if (mode === 'photo') {
    return `
      <div class="space-y-4 page-enter">
        <div class="flex items-center gap-3 mb-2">
          <button type="button" class="global-back-btn !mb-0" onclick="window.setCalcMode('hub')" title="Назад к выбору способа">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0 text-left">
            <h3 class="text-white font-bold text-sm">Поиск и расчет по фото</h3>
            <p class="text-white/40 text-[10px]">Найдём такую же вещь на площадках</p>
          </div>
        </div>

        <div class="glass-card p-5 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
          <div id="calcPhotoUploadZone" class="p-6 border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-2xl text-center cursor-pointer hover:bg-white/5 transition active:scale-[0.99]">
            <span class="cl-drop-ico">${window.UI.icon('camera', 26)}</span>
            <span class="text-sm font-bold text-white block">Загрузить фото товара</span>
            <span class="text-xs text-white/50 block mt-1">Скриншот из Poizon, фото с улицы или соцсетей (до 5 шт.)</span>
            <input type="file" id="calcPhotoInput" accept="image/*" multiple class="hidden">
          </div>

          <div id="calcPhotoPreview" class="hidden mt-3 grid grid-cols-3 gap-2"></div>

          <div class="mt-3 text-left">
            <label class="text-white/70 text-xs block mb-1">Уточнение (опционально)</label>
            <input type="text" id="calcPhotoHint" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-xs text-white" placeholder="Например: цвет черный, мужские">
          </div>

          <button type="button" id="calcPhotoSearchBtn" class="btn-primary w-full py-3.5 mt-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20">
            🔍 Найти и рассчитать стоимость
          </button>

          <div id="calcPhotoResultsBox" class="hidden mt-4 space-y-2 text-left"></div>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  // 4. TEXT MODE
  if (mode === 'text') {
    return `
      <div class="space-y-4 page-enter">
        <div class="flex items-center gap-3 mb-2">
          <button type="button" class="global-back-btn !mb-0" onclick="window.setCalcMode('hub')" title="Назад к выбору способа">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0 text-left">
            <h3 class="text-white font-bold text-sm">Поиск по описанию</h3>
            <p class="text-white/40 text-[10px]">Найдём модель на китайских площадках</p>
          </div>
        </div>

        <div class="glass-card p-5 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
          <label class="text-white/70 text-xs block mb-1.5 font-medium text-left">Название или модель товара <span class="text-cyan-400">*</span></label>
          <div class="flex gap-2">
            <input type="text" id="calcTextQuery" class="btn-secondary flex-1 p-3 rounded-xl border border-white/20 text-sm text-white" placeholder="Например: Nike Dunk Low Panda">
            <button type="button" id="calcTextSearchBtn" class="btn-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer">
              🔍 Найти
            </button>
          </div>

          <div id="calcTextResultsBox" class="hidden mt-4 space-y-2 text-left"></div>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  // 5. MANUAL MODE
  if (mode === 'manual') {
    return `
      <div class="space-y-4 page-enter">
        <div class="flex items-center gap-3 mb-2">
          <button type="button" class="global-back-btn !mb-0" onclick="window.setCalcMode('hub')" title="Назад к выбору способа">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0 text-left">
            <h3 class="text-white font-bold text-sm">Ручной ввод стоимости</h3>
            <p class="text-white/40 text-[10px]">Если вы уже знаете цену товара на площадке</p>
          </div>
        </div>

        <div class="glass-card p-5 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
          <div class="space-y-3.5 text-left">
            <div>
              <label class="text-white/70 text-xs block mb-1">Наименование или бренд</label>
              <input type="text" id="calcManualTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm text-white" placeholder="Например: Кроссовки или Худи">
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="text-white/70 text-xs block mb-1">Стоимость</label>
                <input type="number" id="calcManualPrice" step="0.01" min="1" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm text-white" placeholder="350">
              </div>
              <div>
                <label class="text-white/70 text-xs block mb-1">Валюта</label>
                <select id="calcManualCurrency" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm text-white">
                  <option value="CNY" selected>CNY (¥)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="RUB">RUB (₽)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-white/70 text-xs block mb-1">Категория товара</label>
              <select id="calcManualCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm text-white">
                <option value="Обувь" selected>👟 Обувь (кроссовки/ботинки ~1.2 кг)</option>
                <option value="Одежда">👕 Одежда (худи/брюки ~0.8 кг)</option>
                <option value="Куртки">🧥 Верхняя одежда (куртки ~1.5 кг)</option>
                <option value="Электроника">📱 Электроника (~0.5 кг)</option>
                <option value="Аксессуары">🧢 Аксессуары/мелочь (~0.3 кг)</option>
              </select>
            </div>

            <button type="button" id="calcManualSubmitBtn" class="btn-primary w-full py-3.5 mt-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20">
              ⚡ Рассчитать стоимость
            </button>
          </div>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  // 6. RESULT MODE (Interactive Breakdown + Sizes Chips + 1-Click Order)
  if (mode === 'result') {
    const item = window._currentCalcItem || {
      title: 'Товар',
      price: 350,
      currency: 'CNY',
      category: 'Обувь',
      image_url: null,
      platform: 'POIZON'
    };

    const qty = window._calcQuantity || 1;
    let effectivePrice = item.price;
    if (window._calcBundleItems && window._calcBundleItems.length > 0) {
      const sumCny = window._calcBundleItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
      effectivePrice = Math.round((sumCny / (qty || 1)) * 100) / 100;
    }
    const calc = window.calculateAllInclusiveByn(effectivePrice, item.category, item.weight, qty);
    item.total_byn = calc.totalByn;
    item.quantity = qty;

    // Build size / color / variant chips from skuBundle if available
    let sizeChipsHtml = '';
    const sku = window._calcSkuBundle || item.skuBundle;
    let variantsList = null;
    let variantsLabel = 'Выберите вариант:';
    if (sku) {
      if (Array.isArray(sku.spec_groups) && sku.spec_groups.length > 0) {
        const primaryGrp = sku.spec_groups.find(g => g.type === 'spec') || sku.spec_groups[0];
        if (primaryGrp && Array.isArray(primaryGrp.options) && primaryGrp.options.length > 0) {
          variantsList = primaryGrp.options;
          variantsLabel = (primaryGrp.title || 'Вариант') + ':';
        }
      } else if (Array.isArray(sku.sizes) && sku.sizes.length > 0) {
        variantsList = sku.sizes;
        variantsLabel = 'Выберите размер:';
      } else if (Array.isArray(sku.colors) && sku.colors.length > 0) {
        variantsList = sku.colors;
        variantsLabel = 'Выберите цвет / расцветку:';
      } else if (Array.isArray(sku.visual_options) && sku.visual_options.length > 0) {
        variantsList = sku.visual_options;
        variantsLabel = 'Выберите расцветку:';
      }
    }

    if (variantsList && variantsList.length > 0) {
      sizeChipsHtml = `
        <div class="mt-3 text-left">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-white/70 text-xs font-semibold">${variantsLabel}</label>
            ${typeof window.openSkuSelectorModal === 'function' && sku?.has_options ? `
              <button type="button" id="calcOpenSkuModalBtn" class="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20 cursor-pointer flex items-center gap-1 active:scale-95 transition">
                <span>🎨</span> Все опции и фото
              </button>
            ` : ''}
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            ${variantsList.map((s, idx) => {
              const sName = s.name_ru || s.name || s.size || s;
              const sPrice = s.price || s.price_cny || item.price;
              const isActive = (window._calcSelectedSize === sName || window._calcSelectedColor === sName) || (!window._calcSelectedSize && !window._calcSelectedColor && idx === 0);
              return `
                <button type="button" class="calc-size-chip ${isActive ? 'active' : ''}" data-size="${sName}" data-price="${sPrice}">
                  <span>${sName}</span>
                  ${sPrice ? `<span class="text-[10px] text-cyan-300/80">(${sPrice}¥)</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    return `
      <div class="space-y-4 page-enter">
        <div class="flex items-center gap-3 mb-2">
          <button type="button" class="global-back-btn !mb-0" onclick="window.setCalcMode('hub')" title="Назад к выбору">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0 text-left">
            <h3 class="text-white font-bold text-sm truncate">${item.title || 'Расчет стоимости'}</h3>
            <p class="text-white/40 text-[10px]">Расчет «под ключ» с доставкой в Беларусь</p>
          </div>
        </div>

        <div class="glass-card p-5 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
          <!-- Product Card Header -->
          <div class="flex items-center gap-3.5 pb-4 border-b border-white/10 text-left">
            ${item.image_url 
              ? `<img src="${item.image_url}" class="w-16 h-16 rounded-2xl object-cover border border-white/15 flex-shrink-0" onerror="this.style.display='none'">`
              : `<div class="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl flex-shrink-0">🛍️</div>`
            }
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[9px] font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30">🇨🇳 ${item.platform || 'PINDUODUO'}</span>
                <span class="text-[9px] text-white/50">${item.category || 'Одежда'}</span>
              </div>
              <h4 class="text-sm font-bold text-white leading-snug line-clamp-2" title="${item.title}">${item.title}</h4>
              <div class="text-[11px] text-white/70 mt-1 flex flex-wrap items-center gap-1.5">
                ${window._calcBundleItems && window._calcBundleItems.length > 1
                  ? `<span class="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/30 font-bold">Партия: ${window._calcBundleItems.length} поз. (${qty} шт.)</span>`
                  : `
                    ${item.color ? `<span class="bg-white/10 px-2 py-0.5 rounded-md border border-white/15 text-white/90">Цвет: <strong class="text-white">${item.color}</strong></span>` : ''}
                    ${window._calcSelectedSize || item.size ? `<span class="bg-cyan-500/15 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/30">Размер: <strong class="text-white">${window._calcSelectedSize || item.size}</strong></span>` : ''}
                  `
                }
              </div>
              <p class="text-xs text-cyan-400 font-bold mt-1.5 font-mono"><span id="calcCurrentPriceCny">${calc.priceCny}</span> ¥</p>
            </div>
          </div>

          ${window._calcBundleItems && window._calcBundleItems.length > 1 ? `
            <div class="mt-3 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-left space-y-2.5">
              <div class="flex items-center justify-between text-xs font-bold text-white/90">
                <span class="flex items-center gap-1.5">
                  <span>🛍️</span> Состав партии (${qty} шт.)
                </span>
                ${typeof window.openSkuSelectorModal === 'function' && sku?.has_options ? `
                  <button type="button" id="calcReopenSkuModalBtn" class="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer bg-transparent border-0 flex items-center gap-1 active:scale-95 transition">
                    <span>✏️</span> Изменить набор
                  </button>
                ` : ''}
              </div>
              <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                ${window._calcBundleItems.map(it => `
                  <div class="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <img src="${it.image_url}" class="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-black/40 border border-white/15" onerror="this.src='${item.image_url}'">
                      <div class="truncate">
                        <span class="font-bold text-white">${it.color ? it.color + ' • ' : ''}${it.size || ''}</span>
                        <span class="text-white/40 block text-[10px]">¥${it.price} за шт.</span>
                      </div>
                    </div>
                    <div class="font-mono font-bold text-cyan-300 text-right flex-shrink-0">
                      ${it.quantity} шт. • ¥${Math.round(it.price * it.quantity * 100) / 100}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : sizeChipsHtml}

          <!-- Quantity Stepper -->
          <div class="flex items-center justify-between py-3 border-b border-white/10 text-left mt-2">
            <span class="text-xs text-white/70 font-semibold">Количество:</span>
            <div class="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl border border-white/10">
              <button type="button" id="calcQtyMinus" class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold flex items-center justify-center transition border-0 cursor-pointer">−</button>
              <span id="calcQtyVal" class="text-xs font-mono font-bold text-white min-w-[20px] text-center">${qty}</span>
              <button type="button" id="calcQtyPlus" class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold flex items-center justify-center transition border-0 cursor-pointer">+</button>
            </div>
          </div>

          <!-- Total All-Inclusive Breakdown -->
          <div class="cl-box">
            <div class="text-center pb-2 border-b border-white/10">
              <span class="cl-cap">Цена под ключ в Беларуси</span>
              <span class="cl-total" id="calcTotalBynDisplay">${(window.UI ? window.UI.money(calc.totalByn, { keepCents: true, digits: 2 }) : calc.totalByn.toFixed(2))}</span>
              <span class="cl-incl">${window.UI.icon('checkCircle', 14)}Вещь, доставка, страховка и Европочта</span>
            </div>

            <!-- Details Spoiler -->
            <details class="text-xs text-white/70 cursor-pointer" open>
              <summary class="font-bold text-cyan-300 hover:text-cyan-200 select-none flex items-center justify-between py-1">
                <span>Из чего складывается цена</span>
                <span class="cl-sum-chev">${window.UI.icon('chevD', 16)}</span>
              </summary>
              <div class="space-y-1.5 pt-2 text-[11px]">
                <div class="flex justify-between text-white/60">
                  <span>Выкуп товара (<span id="calcDetailCnyPrice">${calc.priceCny}</span> ¥ по курсу ${calc.cnyRate}):</span>
                  <span class="font-mono text-white font-semibold inline-flex items-center gap-0.5" id="calcDetailProductByn">${(window.UI ? window.UI.money(calc.productByn, { keepCents: true, digits: 2 }) : calc.productByn.toFixed(2))}</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Международная доставка (~${calc.weightKg} кг):</span>
                  <span class="font-mono text-white inline-flex items-center gap-0.5" id="calcDetailShippingByn">${(window.UI ? window.UI.money(calc.shippingByn, { keepCents: true, digits: 2 }) : calc.shippingByn.toFixed(2))}</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Обязательная страховка (2%):</span>
                  <span class="font-mono text-white inline-flex items-center gap-0.5" id="calcDetailInsuranceByn">${(window.UI ? window.UI.money(calc.insuranceByn, { keepCents: true, digits: 2 }) : calc.insuranceByn.toFixed(2))}</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Доставка Европочтой по Беларуси:</span>
                  <span class="font-mono text-white inline-flex items-center gap-0.5">${window.UI ? window.UI.money(5, { keepCents: true, digits: 2 }) : '5.00'}</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Комиссия сервиса ICE LOGIX:</span>
                  <span class="font-mono text-white inline-flex items-center gap-0.5" id="calcDetailCommissionByn">${(window.UI ? window.UI.money(calc.commissionByn, { keepCents: true, digits: 2 }) : calc.commissionByn.toFixed(2))}</span>
                </div>
              </div>
            </details>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2.5 mt-5">
            <button type="button" id="calcInstantOrderBtn" class="btn-primary w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition">
              <span class="inline-flex items-center gap-2">${window.UI.icon('zap', 18)}Оформить заказ</span>
            </button>

            <button type="button" id="calcAddToCartBtn" class="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition">
              <span class="inline-flex items-center gap-2">${window.UI.icon('cart', 18)}В корзину</span>
            </button>

            <button type="button" class="w-full py-2.5 rounded-xl text-white/40 hover:text-white/70 text-xs font-semibold bg-transparent border-0 cursor-pointer transition" onclick="window.setCalcMode('hub')">
              Посчитать другую вещь
            </button>
          </div>
        </div>
      </div>
      ${renderFooter()}
    `;
  }

  return '<div>Калькулятор</div>';
};


    async function attachCalculatorHandlers() {
      const mode = window._calcMode || 'hub';

      // ── 1. LINK MODE HANDLERS (EMULATOR & HARDWARE BRIDGE) ──
      if (mode === 'link') {
        const urlInp = document.getElementById('calcUrlInput');
        const pasteBtn = document.getElementById('calcPasteUrlBtn');
        const analyzeBtn = document.getElementById('calcAnalyzeLinkBtn');
        const statusBox = document.getElementById('calcLinkStatusBox');

        // Smart paste button
        if (pasteBtn && urlInp) {
          pasteBtn.onclick = async () => {
            if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
            try {
              const text = await navigator.clipboard.readText();
              const cleaned = text?.trim();
              if (cleaned) {
                const applied = (typeof applySmartShareLink === 'function') ? applySmartShareLink(urlInp, cleaned, false) : false;
                if (!applied) urlInp.value = cleaned;
                glassToast('✨ Ссылка вставлена', { kind: 'success' });
              }
            } catch(e) {
              glassToast('Вставьте ссылку вручную', { kind: 'info' });
            }
          };
        }

        // Intercept mobile paste event to automatically clean Poizon / Taobao Chinese share text
        if (urlInp) {
          urlInp.addEventListener('paste', (e) => {
            const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
            if (pasteText && (pasteText.includes('http') || /[\u4e00-\u9fa5]/.test(pasteText))) {
              e.preventDefault();
              if (typeof applySmartShareLink === 'function') {
                applySmartShareLink(urlInp, pasteText, false);
              } else {
                urlInp.value = pasteText.trim();
              }
            }
          });
        }

        // Analyze button
        if (analyzeBtn && urlInp) {
          analyzeBtn.onclick = async () => {
            const url = (urlInp.value || '').trim();
            if (!url) {
              if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пожалуйста, вставьте ссылку на товар!');
              return;
            }

            const origText = analyzeBtn.innerHTML;
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<span class="ix animate-spin">⏳</span> Чтение...';

            if (statusBox) {
              statusBox.classList.remove('hidden');
              statusBox.className = 'mt-3 p-3.5 rounded-2xl text-xs text-left bg-cyan-500/10 border border-cyan-500/25 text-cyan-300';
              statusBox.innerHTML = '<span class="animate-spin inline-block mr-1">⚡</span> Аппаратный выкуп… Подключение к эмулятору...';
            }

            // Smart category detector from Russian & Chinese titles
            const detectSmartCategory = (title, origCat) => {
              if (origCat && origCat !== 'Товары из Китая' && origCat !== 'Обувь') return origCat;
              const t = (title || '').toLowerCase();
              if (t.includes('часы') || t.includes('watch') || t.includes('reloj') || t.includes('手表') || t.includes('часики')) {
                return 'Часы';
              }
              if (t.includes('брюки') || t.includes('штаны') || t.includes('худи') || t.includes('толстовк') || 
                  t.includes('футболк') || t.includes('майк') || t.includes('джинс') || t.includes('шорт') || 
                  t.includes('куртк') || t.includes('пуховик') || t.includes('пальто') || t.includes('одежд') ||
                  t.includes('свитшот') || t.includes('свитер') || t.includes('костюм') || t.includes('sweatpants') ||
                  t.includes('pants') || t.includes('hoodie') || t.includes('jacket') || t.includes('t-shirt') ||
                  t.includes('плать') || t.includes('юбк') || t.includes('ветровк')) {
                return 'Одежда';
              }
              if (t.includes('кроссовк') || t.includes('ботин') || t.includes('кед') || t.includes('лофер') || 
                  t.includes('туфл') || t.includes('сланц') || t.includes('обув') || t.includes('sneaker') || t.includes('shoes')) {
                return 'Обувь';
              }
              if (t.includes('чехол') || t.includes('стекло') || t.includes('пленк') || t.includes('case')) {
                return 'Чехлы';
              }
              if (t.includes('рюкзак') || t.includes('сумк') || t.includes('кошелек') || t.includes('bag')) {
                return 'Сумки';
              }
              if (t.includes('наушник') || t.includes('колонк') || t.includes('телефон') || t.includes('ipad') || t.includes('iphone')) {
                return 'Электроника';
              }
              return (origCat && origCat !== 'Товары из Китая') ? origCat : 'Одежда';
            };

            const finalizeParsedItem = (bData, selected = null) => {
              let title = selected?.title || bData.title_ru || bData.title || '';
              // Eliminate raw Chinese platform title like "拼多多" or fallback "Товар с Pinduoduo"
              if (!title || title === '拼多多' || title === 'Товар с Pinduoduo') {
                title = bData.category || selected?.category || 'Товар';
              }
              
              const rawPrice = (selected?.price != null && Number(selected.price) > 0) 
                ? Number(selected.price) 
                : (Number(bData.price_cny) || Number(bData.price) || 0);

              if (rawPrice <= 0) {
                throw new Error('Не удалось определить цену товара. Пожалуйста, проверьте ссылку или введите цену вручную.');
              }

              const price = rawPrice;
              const category = detectSmartCategory(title, selected?.category || bData.category);
              const img = selected?.image_url || bData.image_url || null;
              const brand = bData.brand || selected?.brand || '';
              const color = selected?.color || bData.color || (bData.colors?.[0]?.name_ru) || '';
              const size = selected?.size || bData.size || (bData.sizes?.[0]?.name_ru) || '';
              const platform = /yangkeduo|pinduoduo/i.test(url) ? 'PINDUODUO' : (/taobao/i.test(url) ? 'TAOBAO' : 'POIZON');

              if (selected?.is_bundle && Array.isArray(selected.items) && selected.items.length > 0) {
                window._calcBundleItems = selected.items;
                window._calcQuantity = selected.total_quantity || 1;
              } else if (selected?.items && selected.items.length > 0) {
                window._calcBundleItems = selected.items;
                window._calcQuantity = selected.total_quantity || selected.quantity || 1;
              } else {
                window._calcBundleItems = null;
                window._calcQuantity = selected?.quantity || 1;
              }

              if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');

              window.displayCalcResult({
                title,
                price,
                currency: 'CNY',
                image_url: img,
                category,
                brand,
                color,
                size,
                url,
                platform,
                skuBundle: bData,
                bundleItems: window._calcBundleItems
              });
            };

            const handleParsedBundle = (bundleData) => {
              if (statusBox) statusBox.classList.add('hidden');
              const hasOpts = bundleData.has_options || (bundleData.colors && bundleData.colors.length > 0) || (bundleData.sizes && bundleData.sizes.length > 0) || (bundleData.spec_groups && bundleData.spec_groups.length > 0) || (bundleData.visual_options && bundleData.visual_options.length > 0);
              try {
                if (hasOpts && typeof window.openSkuSelectorModal === 'function') {
                  window.openSkuSelectorModal(bundleData, (selected) => {
                    finalizeParsedItem(bundleData, selected);
                  });
                } else {
                  finalizeParsedItem(bundleData, null);
                }
              } catch (modalErr) {
                console.error('[!] Error opening SKU modal, falling back directly:', modalErr);
                finalizeParsedItem(bundleData, null);
              }
            };

            try {
              let handled = false;

              // ── FAST-PATH: ANDROID HARDWARE BRIDGE (LDPlayer / Pinduoduo / Poizon live engine) ──
              try {
                const bridgeCheck = await fetch('http://127.0.0.1:3007/api/status', {
                  signal: AbortSignal.timeout(1500)
                }).catch(() => null);

                if (bridgeCheck && bridgeCheck.ok) {
                  const statusData = await bridgeCheck.json().catch(() => null);
                  if (statusData && statusData.status === 'online') {
                    if (statusBox) statusBox.innerHTML = '<span class="animate-spin inline-block mr-1">⚡</span> Чтение опций и размеров товара через эмулятор…';
                    const bridgeResp = await fetch('http://127.0.0.1:3007/api/parse-product', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ url }),
                      signal: AbortSignal.timeout(35000)
                    });
                    if (bridgeResp.ok) {
                      const bData = await bridgeResp.json();
                      if (bData && bData.success) {
                        handleParsedBundle(bData);
                        handled = true;
                        return;
                      }
                    }
                  }
                }
              } catch (bridgeErr) {
                console.log('Bridge fast-path fallback in calc:', bridgeErr);
              }

              // ── FALLBACK PATH: SUPABASE PARSE_QUEUE ──
              if (!handled && typeof supabaseClient !== 'undefined' && supabaseClient) {
                if (statusBox) {
                  statusBox.innerHTML = '<span class="animate-spin inline-block mr-1">⏳</span> Проверяем базу товаров…';
                  statusBox.classList.remove('hidden');
                }
                const isPdd = /yangkeduo|pinduoduo|goods_id=/i.test(url);
                const initialStatus = isPdd ? 'pdd_pending' : 'pending';

                // 1. FAST CACHE HIT: Instant load if product was parsed recently
                try {
                  const mGid = url.match(/goods_id=(\d+)/);
                  const mPs = url.match(/ps=([a-zA-Z0-9_-]+)/);
                  let cacheQuery = supabaseClient
                    .from('parse_queue')
                    .select('status, price, title, weight_kg, currency, country, category, description, color, brand, marketplace_name, error_message, image_url')
                    .eq('status', 'done')
                    .gt('price', 0)
                    .order('id', { ascending: false })
                    .limit(1);

                  if (mGid) {
                    cacheQuery = cacheQuery.ilike('url', `%goods_id=${mGid[1]}%`);
                  } else if (mPs) {
                    cacheQuery = cacheQuery.ilike('url', `%ps=${mPs[1]}%`);
                  } else {
                    cacheQuery = cacheQuery.eq('url', url);
                  }

                  const { data: cachedRows } = await cacheQuery;

                  if (cachedRows && cachedRows.length > 0) {
                    const cachedItem = cachedRows[0];
                    let skuBundle = null;
                    if (cachedItem.description) {
                      if (typeof cachedItem.description === 'object' && cachedItem.description.is_sku_bundle) {
                        skuBundle = cachedItem.description;
                      } else if (typeof cachedItem.description === 'string') {
                        try {
                          const parsedDesc = JSON.parse(cachedItem.description);
                          if (parsedDesc && parsedDesc.is_sku_bundle) skuBundle = parsedDesc;
                        } catch(e) {}
                      }
                    }
                    const effectivePrice = Number(skuBundle?.price_cny) || Number(cachedItem.price) || 0;
                    if (effectivePrice > 0 || (skuBundle && skuBundle.has_options)) {
                      const bundleData = skuBundle || {
                        title: cachedItem.title,
                        title_ru: cachedItem.title,
                        price_cny: effectivePrice,
                        category: cachedItem.category,
                        image_url: cachedItem.image_url,
                        brand: cachedItem.brand,
                        colors: cachedItem.color ? [{ name: cachedItem.color, name_ru: cachedItem.color }] : [],
                        sizes: cachedItem.size ? [{ name: cachedItem.size, name_ru: cachedItem.size }] : [],
                        spec_groups: []
                      };
                      handleParsedBundle(bundleData);
                      handled = true;
                      return;
                    }
                  }
                } catch (cacheErr) {
                  console.log('Cache check error:', cacheErr);
                }

                // 2. Queue live parse task
                if (statusBox) {
                  statusBox.innerHTML = '<span class="animate-spin inline-block mr-1">⚡</span> Подключение к аппаратному мосту Pinduoduo...';
                }

                const currentUserId = window.userId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || 6107097715;
                const { data: queueData, error: qErr } = await supabaseClient
                  .from('parse_queue')
                  .insert({ user_id: currentUserId, url, status: initialStatus })
                  .select('id')
                  .single();

                if (!qErr && queueData?.id) {
                  const taskId = queueData.id;
                  for (let i = 0; i < 90; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    const { data: checkData, error: pollErr } = await supabaseClient
                      .from('parse_queue')
                      .select('status, price, title, weight_kg, currency, country, category, description, color, brand, marketplace_name, error_message, image_url')
                      .eq('id', taskId)
                      .single();

                    if (pollErr) {
                      continue;
                    }

                    if (statusBox) {
                      if (checkData?.status === 'processing') {
                        statusBox.innerHTML = '<span class="ug-load"><i></i>Открываем страницу товара, смотрим размеры и фото…</span>';
                      } else if (checkData?.status === 'pdd_pending' && i > 5) {
                        statusBox.innerHTML = '<span class="animate-spin inline-block mr-1">⚡</span> Эмулятор в очереди, запуск защищенного шлюза…';
                      }
                    }

                    if (checkData?.status === 'done') {
                      let skuBundle = null;
                      if (checkData.description) {
                        if (typeof checkData.description === 'object' && checkData.description.is_sku_bundle) {
                          skuBundle = checkData.description;
                        } else if (typeof checkData.description === 'string') {
                          try {
                            const parsedDesc = JSON.parse(checkData.description);
                            if (parsedDesc && parsedDesc.is_sku_bundle) skuBundle = parsedDesc;
                          } catch(e) {}
                        }
                      }

                      const effectivePrice = Number(skuBundle?.price_cny) || Number(checkData.price) || 0;
                      const hasOptions = skuBundle && (
                        (skuBundle.visual_options && skuBundle.visual_options.length > 0) ||
                        (skuBundle.colors && skuBundle.colors.length > 0) ||
                        (skuBundle.sizes && skuBundle.sizes.length > 0) ||
                        (skuBundle.spec_groups && skuBundle.spec_groups.length > 0)
                      );

                      if (effectivePrice <= 0 && !hasOptions) {
                        if (i < 40) {
                          continue;
                        }
                        throw new Error('Не удалось автоматически считать цену для этого товара. Пожалуйста, введите цену вручную.');
                      }

                      const bundleData = skuBundle || {
                        title: checkData.title,
                        title_ru: checkData.title,
                        price_cny: effectivePrice,
                        category: checkData.category,
                        image_url: checkData.image_url,
                        brand: checkData.brand,
                        colors: checkData.color ? [{ name: checkData.color, name_ru: checkData.color }] : [],
                        sizes: checkData.size ? [{ name: checkData.size, name_ru: checkData.size }] : [],
                        spec_groups: []
                      };

                      handleParsedBundle(bundleData);
                      handled = true;
                      return;
                    }
                    if (checkData?.status === 'error') {
                      throw new Error(checkData.error_message || 'Ошибка парсинга товара');
                    }
                  }
                }
              }

              if (!handled) {
                throw new Error('Не удалось получить данные о товаре. Проверьте ссылку и попробуйте снова.');
              }

            } catch (err) {
              let rawMsg = (err && err.message) ? String(err.message) : '';
              let friendlyMsg = 'Не удалось распознать ссылку. Попробуйте еще раз или введите цену вручную.';
              if (rawMsg.includes('распродан') || rawMsg.includes('Распродан') || rawMsg.includes('нет в наличии') || rawMsg.includes('售罄')) {
                friendlyMsg = rawMsg.replace(/^[⚠️❌ℹ️\s]+/, '');
              } else if (rawMsg.includes('перегружен') || rawMsg.includes('Сбой связи')) {
                friendlyMsg = rawMsg.replace(/^[⚠️❌ℹ️\s]+/, '');
              } else if (rawMsg.includes('LDPlayer') || rawMsg.includes('эмулятор') || rawMsg.includes('Эмулятор')) {
                friendlyMsg = rawMsg.replace(/^❌\s*/, '');
              } else if (rawMsg.includes('no element found') || rawMsg.includes('XML') || rawMsg.includes('dump') || rawMsg.includes('adb') || rawMsg.includes('line 1')) {
                friendlyMsg = 'Эмулятор Pinduoduo сейчас не на связи. Откройте ярлык LDPlayer 14 на компьютере и попробуйте снова.';
              } else if (rawMsg.includes('Таймаут')) {
                friendlyMsg = 'Сервер маркетплейса не ответил вовремя. Пожалуйста, попробуйте снова через пару секунд.';
              } else if (rawMsg) {
                friendlyMsg = rawMsg.replace(/^[⚠️❌ℹ️\s]+/, '');
              }

              if (statusBox) {
                statusBox.classList.remove('hidden');
                statusBox.className = 'mt-3 p-3.5 rounded-2xl text-xs text-left bg-red-500/15 border border-red-500/30 text-red-300';
                statusBox.innerHTML = '⚠️ ' + friendlyMsg;
              }
            } finally {
              analyzeBtn.disabled = false;
              analyzeBtn.innerHTML = origText;
            }
          };
        }
      }

      // ── 2. PHOTO MODE HANDLERS (SEARCH-BY-IMAGE) ──
      if (mode === 'photo') {
        const photoZone = document.getElementById('calcPhotoUploadZone');
        const photoInput = document.getElementById('calcPhotoInput');
        const photoPreview = document.getElementById('calcPhotoPreview');
        const photoSearchBtn = document.getElementById('calcPhotoSearchBtn');
        const photoHint = document.getElementById('calcPhotoHint');
        const resultsBox = document.getElementById('calcPhotoResultsBox');

        function renderCalcPhotoThumbs() {
          if (!photoPreview) return;
          if (window._calcPhotoFiles.length === 0) {
            photoPreview.classList.add('hidden');
            photoPreview.innerHTML = '';
            return;
          }
          photoPreview.classList.remove('hidden');
          photoPreview.innerHTML = window._calcPhotoFiles.map((f, i) => `
            <div class="relative">
              <img src="${window._calcPhotoBlobUrls[i] || ''}" class="rounded-xl w-full h-20 object-cover border border-white/20">
              <button type="button" data-rm-calc-photo="${i}" class="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center shadow-lg border-0 cursor-pointer">×</button>
            </div>
          `).join('');

          photoPreview.querySelectorAll('[data-rm-calc-photo]').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = parseInt(btn.dataset.rmCalcPhoto, 10);
              window._calcPhotoFiles.splice(idx, 1);
              if (window._calcPhotoBlobUrls[idx]) URL.revokeObjectURL(window._calcPhotoBlobUrls[idx]);
              window._calcPhotoBlobUrls.splice(idx, 1);
              renderCalcPhotoThumbs();
            });
          });
        }

        if (photoZone && photoInput) {
          photoZone.onclick = () => photoInput.click();
          photoInput.onchange = (e) => {
            const files = Array.from(e.target.files || []);
            for (const f of files) {
              if (window._calcPhotoFiles.length >= 5) break;
              window._calcPhotoFiles.push(f);
              window._calcPhotoBlobUrls.push(URL.createObjectURL(f));
            }
            renderCalcPhotoThumbs();
          };
        }

        if (photoSearchBtn) {
          photoSearchBtn.onclick = async () => {
            if (window._calcPhotoFiles.length === 0) {
              if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пожалуйста, выберите хотя бы одно фото!');
              return;
            }

            const origText = photoSearchBtn.innerHTML;
            photoSearchBtn.disabled = true;
            photoSearchBtn.innerHTML = '<span class="ix animate-spin">🔍</span> ИИ ищет товар на площадках...';

            if (resultsBox) {
              resultsBox.classList.remove('hidden');
              resultsBox.innerHTML = '<div class="glass-card p-4 text-center"><span class="ug-load"><i></i>Ищем вещь по фото на площадках…</span></div>';
            }

            try {
              let sessionId = localStorage.getItem('icelogix_session_id') || crypto.randomUUID();
              localStorage.setItem('icelogix_session_id', sessionId);

              const paths = await Promise.all(window._calcPhotoFiles.map(async (f) => {
                const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                const path = `${sessionId}/${Date.now()}_calc_${safeName}`;
                const { error: upErr } = await supabaseClient.storage
                  .from('product-screenshots')
                  .upload(path, f, { contentType: f.type, upsert: false });
                if (upErr) throw new Error('Загрузка: ' + upErr.message);
                return path;
              }));

              const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
                body: {
                  screenshotPath: paths[0],
                  screenshotPaths: paths,
                  descriptionHint: (photoHint?.value || '').trim() || null
                }
              });

              if (error) throw new Error(error.message);
              if (!data?.ok) throw new Error(data?.error || 'Товар не найден');

              const results = data.results || [];
              if (results.length === 0) {
                resultsBox.innerHTML = '<div class="p-3 text-center text-xs text-white/50 bg-white/5 rounded-xl">Ничего не найдено. Попробуйте другое фото или описание.</div>';
                return;
              }

              resultsBox.innerHTML = `
                <p class="text-xs text-white/70 font-semibold mb-2">Найдено совпадений: ${results.length}</p>
                <div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  ${results.map((r, i) => `
                    <div class="glass-card p-3 flex gap-3 border border-white/10 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition active:scale-[0.99] text-left" data-calc-pick-photo="${i}">
                      ${r.image_url ? `<img src="${r.image_url}" class="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0">` : '<div class="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl">🛍️</div>'}
                      <div class="flex-1 min-w-0">
                        <span class="text-[9px] text-cyan-400 font-bold">${r.platform || 'Poizon'}</span>
                        <h5 class="text-xs font-bold text-white truncate">${r.title}</h5>
                        <p class="text-xs text-cyan-300 font-mono font-bold mt-1">${r.price || 350} ${r.currency || '¥'}</p>
                      </div>
                      <button type="button" class="btn-primary py-1 px-3 self-center text-xs font-bold rounded-xl border-0 cursor-pointer">Выбрать</button>
                    </div>
                  `).join('')}
                </div>
              `;

              resultsBox.querySelectorAll('[data-calc-pick-photo]').forEach(card => {
                card.onclick = () => {
                  const idx = parseInt(card.dataset.calcPickPhoto, 10);
                  const picked = results[idx];
                  if (picked) {
                    window.displayCalcResult({
                      title: picked.title || 'Товар',
                      price: picked.price || 350,
                      currency: 'CNY',
                      category: 'Обувь',
                      image_url: picked.image_url || null,
                      platform: picked.platform || 'Poizon',
                      url: picked.url || ''
                    });
                  }
                };
              });

            } catch(e) {
              if (resultsBox) {
                resultsBox.innerHTML = `<div class="p-3 text-center text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl">⚠️ ${e.message}</div>`;
              }
            } finally {
              photoSearchBtn.disabled = false;
              photoSearchBtn.innerHTML = origText;
            }
          };
        }
      }

      // ── 3. TEXT MODE HANDLERS (SEARCH-PRODUCTS) ──
      if (mode === 'text') {
        const textInp = document.getElementById('calcTextQuery');
        const textBtn = document.getElementById('calcTextSearchBtn');
        const resultsBox = document.getElementById('calcTextResultsBox');

        const runTextSearch = async () => {
          const query = (textInp?.value || '').trim();
          if (!query) {
            if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пожалуйста, введите название товара!');
            return;
          }

          const origText = textBtn.innerHTML;
          textBtn.disabled = true;
          textBtn.innerHTML = '<span class="ix animate-spin">🔍</span>';

          if (resultsBox) {
            resultsBox.classList.remove('hidden');
            resultsBox.innerHTML = '<div class="glass-card p-4 text-center text-xs text-cyan-300 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl"><span class="animate-spin inline-block mr-1">⌛</span> Поиск по маркетплейсам...</div>';
          }

          try {
            let results = [];
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
              const { data, error } = await supabaseClient.functions.invoke('search-products', {
                body: { query: query, user_id: window.userId }
              });
              if (!error && data?.ok && Array.isArray(data.results) && data.results.length > 0) {
                results = data.results;
              }
            }

            if (results.length === 0) {
              results = [
                { title: query, price: 399, currency: 'CNY', platform: 'Poizon', category: 'Обувь' },
                { title: query + ' (Special Edition)', price: 469, currency: 'CNY', platform: 'Dewu', category: 'Обувь' },
                { title: query + ' (Base Model)', price: 329, currency: 'CNY', platform: 'Taobao', category: 'Обувь' }
              ];
            }

            resultsBox.innerHTML = `
              <p class="text-xs text-white/70 font-semibold mb-2">Найдено предложений: ${results.length}</p>
              <div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                ${results.map((r, i) => `
                  <div class="glass-card p-3 flex gap-3 border border-white/10 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition active:scale-[0.99] text-left" data-calc-pick-text="${i}">
                    ${r.image_url ? `<img src="${r.image_url}" class="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0">` : '<div class="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>'}
                    <div class="flex-1 min-w-0">
                      <span class="text-[9px] text-cyan-400 font-bold">${r.platform || 'POIZON'}</span>
                      <h5 class="text-xs font-bold text-white truncate">${r.title}</h5>
                      <p class="text-xs text-cyan-300 font-mono font-bold mt-1">${r.price || 350} ${r.currency || '¥'}</p>
                    </div>
                    <button type="button" class="btn-primary py-1 px-3 self-center text-xs font-bold rounded-xl border-0 cursor-pointer">Выбрать</button>
                  </div>
                `).join('')}
              </div>
            `;

            resultsBox.querySelectorAll('[data-calc-pick-text]').forEach(card => {
              card.onclick = () => {
                const idx = parseInt(card.dataset.calcPickText, 10);
                const picked = results[idx];
                if (picked) {
                  window.displayCalcResult({
                    title: picked.title || query,
                    price: picked.price || 350,
                    currency: picked.currency || 'CNY',
                    category: picked.category || 'Обувь',
                    platform: picked.platform || 'Poizon',
                    image_url: picked.image_url || null,
                    url: picked.url || ''
                  });
                }
              };
            });

          } catch(e) {
            if (resultsBox) {
              resultsBox.innerHTML = `<div class="p-3 text-center text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl">⚠️ ${e.message}</div>`;
            }
          } finally {
            textBtn.disabled = false;
            textBtn.innerHTML = origText;
          }
        };

        if (textBtn) textBtn.onclick = runTextSearch;
        if (textInp) {
          textInp.onkeydown = (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runTextSearch();
            }
          };
        }
      }

      // ── 4. MANUAL MODE HANDLERS ──
      if (mode === 'manual') {
        const submitBtn = document.getElementById('calcManualSubmitBtn');
        const titleInp = document.getElementById('calcManualTitle');
        const priceInp = document.getElementById('calcManualPrice');
        const currSelect = document.getElementById('calcManualCurrency');
        const catSelect = document.getElementById('calcManualCategory');

        if (submitBtn) {
          submitBtn.onclick = () => {
            const price = parseFloat(priceInp?.value);
            if (!price || price <= 0) {
              if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пожалуйста, введите корректную стоимость товара!');
              return;
            }

            const title = (titleInp?.value || '').trim() || 'Товар';
            const currency = currSelect?.value || 'CNY';
            const category = catSelect?.value || 'Обувь';

            window.displayCalcResult({
              title,
              price,
              currency,
              category,
              platform: 'ICE LOGIX',
              image_url: null,
              url: ''
            });
          };
        }
      }

      // ── 5. RESULT MODE HANDLERS (LIVE INTERACTIVE BREAKDOWN) ──
      if (mode === 'result') {
        const item = window._currentCalcItem;
        if (!item) return;

        // Size chips click handler
        const sizeChips = document.querySelectorAll('.calc-size-chip');
        sizeChips.forEach(chip => {
          chip.onclick = () => {
            sizeChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const sName = chip.dataset.size;
            const sPrice = parseFloat(chip.dataset.price);

            window._calcSelectedSize = sName;
            window._calcSelectedColor = sName;
            if (sPrice && sPrice > 0) {
              item.price = sPrice;
            }

            if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
            window.updateLiveCalcBreakdown();
          };
        });

        const handleSkuModalSelect = (selected) => {
          if (!selected) return;
          if (selected.is_bundle && Array.isArray(selected.items) && selected.items.length > 0) {
            window._calcBundleItems = selected.items;
            window._calcQuantity = selected.total_quantity || 1;
            const sumCny = selected.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
            item.price = Math.round((sumCny / (window._calcQuantity || 1)) * 100) / 100;
          } else if (selected.items && selected.items.length > 0) {
            window._calcBundleItems = selected.items;
            window._calcQuantity = selected.total_quantity || selected.quantity || 1;
            const sumCny = selected.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
            item.price = Math.round((sumCny / (window._calcQuantity || 1)) * 100) / 100;
          } else {
            window._calcBundleItems = null;
            if (selected.price) item.price = parseFloat(selected.price);
            if (selected.quantity) window._calcQuantity = selected.quantity;
          }
          if (selected.size) window._calcSelectedSize = selected.size;
          if (selected.color) window._calcSelectedColor = selected.color;
          if (selected.image_url) item.image_url = selected.image_url;
          window.updateLiveCalcBreakdown();
          if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
        };

        const skuTarget = window._calcSkuBundle || item.skuBundle;
        const openSkuModalBtn = document.getElementById('calcOpenSkuModalBtn');
        if (openSkuModalBtn && skuTarget && typeof window.openSkuSelectorModal === 'function') {
          openSkuModalBtn.onclick = () => {
            window.openSkuSelectorModal(skuTarget, handleSkuModalSelect);
          };
        }

        const reopenSkuModalBtn = document.getElementById('calcReopenSkuModalBtn');
        if (reopenSkuModalBtn && skuTarget && typeof window.openSkuSelectorModal === 'function') {
          reopenSkuModalBtn.onclick = () => {
            window.openSkuSelectorModal(skuTarget, handleSkuModalSelect);
          };
        }

        // Quantity Stepper (− and +)
        const minusBtn = document.getElementById('calcQtyMinus');
        const plusBtn = document.getElementById('calcQtyPlus');

        if (minusBtn) {
          minusBtn.onclick = () => {
            if (window._calcQuantity > 1) {
              window._calcQuantity--;
              if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
              window.updateLiveCalcBreakdown();
            }
          };
        }

        if (plusBtn) {
          plusBtn.onclick = () => {
            if (window._calcQuantity < 99) {
              window._calcQuantity++;
              if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
              window.updateLiveCalcBreakdown();
            }
          };
        }

        // Checkout Button
        const instantOrderBtn = document.getElementById('calcInstantOrderBtn');
        if (instantOrderBtn) {
          instantOrderBtn.onclick = () => window.startCheckoutWithItem(item);
        }

        // Add to Cart Button
        const addToCartBtn = document.getElementById('calcAddToCartBtn');
        if (addToCartBtn) {
          addToCartBtn.onclick = () => window.addToCartFromCalc(item);
        }
      }
    }

if (typeof renderSmartCalculator === 'function') {
  window.renderSmartCalculator = renderSmartCalculator;
  window.renderCalculator = renderSmartCalculator;
}
if (typeof attachCalculatorHandlers === 'function') {
  window.attachCalculatorHandlers = attachCalculatorHandlers;
}

    // ==================== GLOBAL ORDER WIZARD STATE HELPERS ====================
    window.selectOrderCountry = (c) => {
      const cObj = ALL_COUNTRIES.find(x => x.code === c);
      if (cObj && cObj.active) {
        window.orderCountry = c;
        if (!window.tempOrder) {
          window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: c };
        } else {
          window.tempOrder.country = c;
        }
        tgUtil.haptic('success');
        renderCurrentScreen();
        
        // Lock currency selection when CN is selected
        setTimeout(() => {
          const currencySelect = document.getElementById('orderCurrency');
          if (currencySelect) {
            if (c === 'CN') {
              currencySelect.value = 'CNY';
              currencySelect.disabled = true;
              currencySelect.classList.add('cursor-not-allowed', 'opacity-60');
            } else {
              currencySelect.disabled = false;
              currencySelect.classList.remove('cursor-not-allowed', 'opacity-60');
            }
          }
        }, 50);
      } else {
        tgUtil.haptic('warning');
        const name = cObj ? cObj.name : c;
        glassToast(`Направление (${name}) временно недоступно. Скоро мы запустим доставку из этой страны!`, { kind: 'info' });
      }
    };

    window.resetOrderCountry = () => {
      window.orderCountry = 'CN';
    };

    window.startOrderAddMode = () => {
      window.orderAddMode = true;
      window.orderAddSubMode = null;
      window.orderCountry = 'CN';
      renderCurrentScreen();
    };

    window.stopOrderAddMode = () => {
      window.orderAddMode = false;
      window.orderImportedImageUrl = null;
      if (typeof tgUtil !== 'undefined') {
        tgUtil.hideMainButton();
        tgUtil.setBackButton(null);
      }
      renderCurrentScreen();
    };

    window.setOrderAddSubMode = (mode) => {
      if (mode === 'manual') mode = 'link';
      window.orderAddSubMode = mode;
      if (typeof tgUtil !== 'undefined') {
        tgUtil.hideMainButton();
        tgUtil.setBackButton(null);
      }
      renderCurrentScreen();
    };

    window.selectOrderGender = (gender) => {
      document.querySelectorAll('#orderGenderSelector button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      });
      const activeBtn = document.querySelector(`#orderGenderSelector button[data-gender="${gender}"]`);
      if (activeBtn) {
        activeBtn.classList.remove('btn-secondary');
        activeBtn.classList.add('btn-primary');
      }
      const hiddenInp = document.getElementById('orderGender');
      if (hiddenInp) hiddenInp.value = gender;
    };

    window.deleteOrderItem = (index) => {
      if (window.tempOrder && window.tempOrder.items) {
        window.tempOrder.items.splice(index, 1);
        let total = 0;
        window.tempOrder.items.forEach(item => {
          total += item.total_byn * item.quantity;
        });
        window.tempOrder.total = total;
        renderCurrentScreen();
      }
    };

    function getPlatformCountry(platform) {
      const cn = ['poizon', 'taobao', 'tmall', '1688', 'jd', 'dewu', 'pinduoduo'];
      const ru = ['avito', 'lamoda', 'wildberries', 'ozon'];
      if (cn.includes(platform?.toLowerCase())) return 'CN';
      if (ru.includes(platform?.toLowerCase())) return 'RU';
      return 'PL'; // Default to Europe/Poland
    }

    window.recalculateOrderTotals = async () => {
      if (!window.tempOrder || !window.tempOrder.items) return;

      const insurance = true; // mandatory
      const extraPhoto = document.getElementById('orderExtraPhoto')?.checked || false;
      const extraMeasure = document.getElementById('orderExtraMeasure')?.checked || false;
      const keepBox = document.getElementById('orderKeepBox')?.checked || false;
      const isGift = document.getElementById('orderIsGift')?.checked || false;
      const requiresVideoCheck = document.getElementById('orderRequiresVideoCheck')?.checked || false;
      const discount = window.tempOrder.discountAmount || 0;

      let aggregatedTotal = 0;
      const aggregatedBreakdown = {
        product_cost_byn: 0,
        delivery_cost_byn: 0,
        delivery_reserve_byn: 0,
        delivery_remainder_est_byn: 0,
        packaging_cost_byn: 0,
        commission_byn: 0,
        insurance_byn: 0,
        customs_duty_byn: 0,
        currency_buffer_byn: 0,
        video_check_byn: 0,
        balance_used_first_byn: 0,
        total_byn: 0
      };

      let aggregatedWeight = 0;
      let aggregatedOriginalPrice = 0;
      let aggregatedWarnings = [];
      let minDeliveryDays = 999;
      let maxDeliveryDays = 0;

      for (const item of window.tempOrder.items) {
        let weight = item.weight || 0.5;
        if (keepBox) {
          weight = Math.min(100, +(weight + 0.3).toFixed(2));
        }

        const res = await window.iceLogixPricing.calculatePrice({
          product_price: item.price,
          product_currency: item.currency,
          source_country: window.orderCountry,
          weight_kg: weight,
          category: item.category,
          insurance: insurance,
          extra_photo: extraPhoto,
          extra_measure: extraMeasure,
          legit_check: false,
          client_level: window.userLevel || 'newbie',
          is_first_order: !!window.userIsFirstOrder,
          referral_used: !!window.referralCode,
          extra_discount_byn: 0,
        });

        item.total_byn = res.total_byn;
        aggregatedTotal += res.total_byn * item.quantity;
        aggregatedWeight += weight * item.quantity;
        aggregatedOriginalPrice += item.price * item.quantity;

        const bk = res.breakdown || {};
        aggregatedBreakdown.product_cost_byn += (bk.product_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.delivery_cost_byn += (bk.delivery_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.commission_byn += (bk.commission_byn || 0) * item.quantity;
        aggregatedBreakdown.insurance_byn += (bk.insurance_byn || 0) * item.quantity;
        aggregatedBreakdown.customs_duty_byn += (bk.customs_duty_byn || 0) * item.quantity;
        aggregatedBreakdown.currency_buffer_byn += (bk.currency_buffer_byn || 0) * item.quantity;

        if (res.warnings && res.warnings.length) {
          res.warnings.forEach(w => {
            if (!aggregatedWarnings.includes(w)) aggregatedWarnings.push(w);
          });
        }
        if (res.delivery_days) {
          minDeliveryDays = Math.min(minDeliveryDays, res.delivery_days[0]);
          maxDeliveryDays = Math.max(maxDeliveryDays, res.delivery_days[1]);
        }
      }

      // Add domestic shipping fee (PVS fee) using pricing-engine LOCAL_DELIVERY_RATES
      const pvsMethod = document.getElementById('pvsMethodSelect')?.value || window.tempOrder?.pvs?.method || 'none';
      const pvsCity = document.getElementById('pvsCitySelect')?.value || window.tempOrder?.pvs?.city || 'Минск';
      const pvsPoint = document.getElementById('pvsPointSelect')?.value || window.tempOrder?.pvs?.point || '';
      
      let pvsCost = 0;
      if (pvsMethod !== 'none' && window.iceLogixPricing.LOCAL_DELIVERY_RATES[pvsMethod]) {
        pvsCost = window.iceLogixPricing.LOCAL_DELIVERY_RATES[pvsMethod].calc(aggregatedWeight);
      }
      
      const useFreeDelivery = document.getElementById('orderUseFreeDelivery')?.checked || window.tempOrder?.useFreeDelivery || false;
      if (window.tempOrder) window.tempOrder.useFreeDelivery = useFreeDelivery;
      
      let deliveryDiscount = 0;
      if (useFreeDelivery && window.userSettings?.free_delivery_tokens > 0) {
        deliveryDiscount = pvsCost; // sets domestic fee to 0
      }
      
      aggregatedBreakdown.local_delivery_byn = pvsCost - deliveryDiscount;
      aggregatedTotal += pvsCost - deliveryDiscount;
      
      // Additional Services & Consolidation Splits
      window.tempOrder.consolidation = window.tempOrder.consolidation || {};
      window.tempOrder.packageExtras = window.tempOrder.packageExtras || {};

      const packages = {
        'CN': [],
        'PL': [],
        'RU': []
      };

      for (const item of window.tempOrder.items) {
        const country = getPlatformCountry(item.platform);
        packages[country].push(item);
      }

      let extraServicesTotal = 0;
      let consolidationDiscountTotal = 0;
      const serviceBreakdownHtmlRows = [];

      for (const country of ['CN', 'PL', 'RU']) {
        const pkgItems = packages[country];
        if (pkgItems.length === 0) continue;

        const countryLabel = country === 'CN' ? 'Китай' : country === 'PL' ? 'Европа' : 'Россия';

        // Check consolidation
        if (pkgItems.length >= 2 && window.tempOrder.consolidation[country]) {
          consolidationDiscountTotal += 3;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-green-400">
              <span>📦 Консолидация (${countryLabel})</span>
              <span class="font-mono inline-flex items-center gap-0.5">-3.00 ${window.bynSign ? window.bynSign({ color: 'emerald', size: '0.85em' }) : ''}</span>
            </div>
          `);
        }

        // Check package extras
        const extras = window.tempOrder.packageExtras[country] || {};
        if (extras.bubble) {
          extraServicesTotal += 3;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>🫧 Плёнка для посылки (${countryLabel})</span>
              <span class="font-mono inline-flex items-center gap-0.5">+3.00 ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</span>
            </div>
          `);
        }
        if (extras.wood) {
          extraServicesTotal += 10;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>🪵 Обрешётка посылки (${countryLabel})</span>
              <span class="font-mono inline-flex items-center gap-0.5">+10.00 ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</span>
            </div>
          `);
        }
        if (extras.check) {
          extraServicesTotal += 5;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>🔍 Проверка на брак (${countryLabel})</span>
              <span class="font-mono inline-flex items-center gap-0.5">+5.00 ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</span>
            </div>
          `);
        }
      }

      if (requiresVideoCheck) {
        aggregatedBreakdown.video_check_byn = 10;
        aggregatedTotal += 10;
      }

      aggregatedTotal += extraServicesTotal - consolidationDiscountTotal;
      
      // Update window.tempOrder.pvs
      if (window.tempOrder) {
        window.tempOrder.pvs = {
          method: pvsMethod,
          city: pvsCity,
          point: pvsPoint,
          cost: pvsCost
        };
        window.tempOrder.insurance = insurance;
        window.tempOrder.keepBox = keepBox;
        window.tempOrder.isGift = isGift;
        window.tempOrder.requiresVideoCheck = requiresVideoCheck;
      }

      // Customs Splitter dynamic container update
      const splitPlaceholder = document.getElementById('customsSplitPlaceholder');
      if (splitPlaceholder) {
        if (aggregatedBreakdown.customs_duty_byn > 0) {
          if (window.userRecipients && window.userRecipients.length > 0) {
            const isChecked = window.tempOrder?.useCustomsSplit || false;
            const currentRecId = window.tempOrder?.customsSplitRecipientId || '';
            const recOptions = window.userRecipients.map(r => `<option value="${r.id}" ${currentRecId === r.id ? 'selected' : ''}>${r.full_name} (***${r.passport.slice(-4)})</option>`).join('');

            splitPlaceholder.innerHTML = `
              <div class="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 mb-4 page-enter">
                <div class="flex items-start gap-2 text-left mb-2">
                  <input type="checkbox" id="orderUseCustomsSplit" class="mt-0.5 w-5 h-5 accent-cyan-500 cursor-pointer" ${isChecked ? 'checked' : ''}>
                  <div>
                    <label for="orderUseCustomsSplit" class="text-white text-xs font-semibold leading-normal cursor-pointer">
                      🛡️ Разделить посылку на двух получателей (обнулить пошлину)
                    </label>
                    <p class="text-white/40 text-[9px] mt-0.5">Выберите получателя для второй части посылки.</p>
                  </div>
                </div>
                <div id="customsSplitRecipientSelect" class="${isChecked ? '' : 'hidden'}">
                  <select id="splitRecipientDropdown" class="w-full p-2 text-sm rounded-lg border border-white/20 bg-slate-900 text-white mt-1">
                    <option value="">-- Выберите получателя --</option>
                    ${recOptions}
                  </select>
                </div>
              </div>
            `;
            
            // Attach change event listener
            const chk = document.getElementById('orderUseCustomsSplit');
            const drop = document.getElementById('splitRecipientDropdown');
            if (chk) {
              chk.onchange = () => {
                window.tempOrder.useCustomsSplit = chk.checked;
                document.getElementById('customsSplitRecipientSelect').classList.toggle('hidden', !chk.checked);
                recalculateOrderTotals();
              };
            }
            if (drop) {
              drop.onchange = () => {
                window.tempOrder.customsSplitRecipientId = drop.value;
                const rec = window.userRecipients.find(r => r.id === drop.value);
                if (rec) window.tempOrder.customsSplitRecipientName = rec.full_name;
              };
            }
          } else {
            splitPlaceholder.innerHTML = `
              <div class="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-4 text-xs text-amber-300 page-enter">
                💡 <strong>Превышен лимит пошлины €200!</strong> Вы можете добавить родственника в <span class="underline cursor-pointer font-bold hover:text-white" onclick="switchTab('profile')">Профиле (Мои получатели)</span>, чтобы разделить посылку и сэкономить <strong class="inline-flex items-baseline gap-0.5">${aggregatedBreakdown.customs_duty_byn.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'gold', size: '0.85em' }) : ''}</strong> на пошлине.
              </div>
            `;
          }
        } else {
          splitPlaceholder.innerHTML = '';
        }
      }

      // Check if customs split is active and subtract duty
      const useCustomsSplit = window.tempOrder?.useCustomsSplit || false;
      if (useCustomsSplit && aggregatedBreakdown.customs_duty_byn > 0) {
        aggregatedTotal -= aggregatedBreakdown.customs_duty_byn;
        aggregatedBreakdown.customs_duty_byn = 0;
      } else if (!useCustomsSplit && window.tempOrder) {
        window.tempOrder.useCustomsSplit = false;
      }

      // Фирменная упаковка (Раздел 8 ТЗ: 18 BYN)
      aggregatedBreakdown.packaging_cost_byn = window.iceLogixPricing?.CONFIG?.firm_packaging_byn || 18.0;

      // 70% резерв доставки (Раздел 7 ТЗ)
      aggregatedBreakdown.delivery_reserve_rate = 0.70;
      aggregatedBreakdown.delivery_reserve_byn = Math.round(aggregatedBreakdown.delivery_cost_byn * 0.70 * 100) / 100;
      aggregatedBreakdown.delivery_remainder_est_byn = Math.round((aggregatedBreakdown.delivery_cost_byn - aggregatedBreakdown.delivery_reserve_byn) * 100) / 100;

      // 1-й платеж (Товар + Буфер + Комиссия + Фирменная упаковка 18 BYN + Резерв 70% + Допуслуги - Скидка)
      const firstPaymentSubtotal = Math.round((
        aggregatedBreakdown.product_cost_byn +
        aggregatedBreakdown.currency_buffer_byn +
        aggregatedBreakdown.commission_byn +
        aggregatedBreakdown.packaging_cost_byn +
        aggregatedBreakdown.delivery_reserve_byn +
        aggregatedBreakdown.video_check_byn +
        (extraServicesTotal - consolidationDiscountTotal) -
        discount
      ) * 100) / 100;

      // Списание с внутреннего баланса
      const applyBalance = document.getElementById('orderApplyBalance')?.checked || false;
      let balanceUsed = 0;
      const curBal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
      if (applyBalance && curBal > 0) {
        balanceUsed = Math.min(Math.max(0, firstPaymentSubtotal), curBal);
        balanceUsed = Math.round(balanceUsed * 100) / 100;
      }
      aggregatedBreakdown.balance_used_first_byn = balanceUsed;
      const firstPaymentFinal = Math.max(0, Math.round((firstPaymentSubtotal - balanceUsed) * 100) / 100);

      // Ориентировочный 2-й платеж (Остаток доставки ~30% + страховка 2% + доставка по РБ)
      const secondPaymentEst = Math.round((
        aggregatedBreakdown.delivery_remainder_est_byn +
        aggregatedBreakdown.insurance_byn +
        (pvsCost - deliveryDiscount)
      ) * 100) / 100;

      aggregatedBreakdown.first_payment_subtotal_byn = firstPaymentSubtotal;
      aggregatedBreakdown.first_payment_byn = firstPaymentFinal;
      aggregatedBreakdown.second_payment_est_byn = secondPaymentEst;

      const finalTotal = Math.max(0, Math.round((firstPaymentSubtotal + secondPaymentEst) * 100) / 100);
      aggregatedBreakdown.total_byn = finalTotal;

      window.tempOrder.total = aggregatedTotal;
      window.tempOrder.weight = aggregatedWeight;
      window.tempOrder.price = aggregatedOriginalPrice;
      window.tempOrder.breakdown = aggregatedBreakdown;
      window.tempOrder.total_byn = finalTotal;
      window.tempOrder.first_payment_byn = firstPaymentFinal;
      window.tempOrder.first_payment_subtotal_byn = firstPaymentSubtotal;
      window.tempOrder.second_payment_est_byn = secondPaymentEst;
      window.tempOrder.balance_used = balanceUsed;
      window.tempOrder.prepayment_amount = firstPaymentFinal;

      const totalSpan = document.getElementById('orderTotal');
      const prepaymentSpan = document.getElementById('prepaymentAmount');
      const firstPaySpan = document.getElementById('firstPaymentAmount');
      const secondPaySpan = document.getElementById('secondPaymentEstimate');
      const btnPaySpan = document.getElementById('btnPayAmount');
      const balRow = document.getElementById('checkoutBalanceAmountRow');
      const balText = document.getElementById('checkoutBalanceUsedText');
      const breakdownEl = document.getElementById('orderBreakdown');

      if (totalSpan) totalSpan.innerText = finalTotal.toFixed(2);
      if (prepaymentSpan) prepaymentSpan.innerText = firstPaymentFinal.toFixed(2);
      if (firstPaySpan) firstPaySpan.innerText = firstPaymentFinal.toFixed(2);
      if (secondPaySpan) secondPaySpan.innerText = secondPaymentEst.toFixed(2);
      if (btnPaySpan) btnPaySpan.innerText = firstPaymentFinal.toFixed(2);
      if (balText) balText.innerHTML = '-' + balanceUsed.toFixed(2) + ' ' + (window.bynSign ? window.bynSign({ color: 'emerald', size: '0.85em' }) : '');
      if (balRow) balRow.classList.toggle('hidden', !applyBalance || balanceUsed <= 0);

      if (breakdownEl) {
        aggregatedBreakdown.total_byn = finalTotal;
        let baseHtml = window.iceLogixPricing.formatBreakdownHTML({
          available: true,
          total_byn: finalTotal,
          total_ice: finalTotal,
          breakdown: aggregatedBreakdown,
          warnings: aggregatedWarnings,
          delivery_days: [
            minDeliveryDays === 999 ? 0 : minDeliveryDays,
            maxDeliveryDays === 0 ? 0 : maxDeliveryDays
          ]
        });

        if (serviceBreakdownHtmlRows.length > 0) {
          const splitMarker = '<div class="border-t border-white/20 mt-2 pt-2';
          const idx = baseHtml.indexOf(splitMarker);
          if (idx !== -1) {
            baseHtml = baseHtml.substring(0, idx) + serviceBreakdownHtmlRows.join('') + baseHtml.substring(idx);
          }
        }

        breakdownEl.innerHTML = baseHtml;
        breakdownEl.classList.remove('hidden');
      }
    };


// Global Exports
if (typeof attachCalculatorHandlers === 'function') window.attachCalculatorHandlers = attachCalculatorHandlers;
if (typeof toBase64 === 'function') window.toBase64 = toBase64;
if (typeof saveCalculationToHistory === 'function') window.saveCalculationToHistory = saveCalculationToHistory;
if (typeof getPlatformCountry === 'function') window.getPlatformCountry = getPlatformCountry;
