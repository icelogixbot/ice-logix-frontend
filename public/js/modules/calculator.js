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
          xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);
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
      window._calcMode = 'menu';
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
        const c = JSON.parse(decodeURIComponent(serializedData));
        tgUtil.haptic('success');
        
        window.orderAddSubMode = 'manual';
        window.orderLinkAnalyzed = true;
        
        renderCurrentScreen();
        
        setTimeout(() => {
          if (document.getElementById('orderUrlManual')) {
            document.getElementById('orderUrlManual').value = c.url || '';
          }
          if (document.getElementById('orderBrand')) {
            document.getElementById('orderBrand').value = c.brand || '';
          }
          if (document.getElementById('orderModel')) {
            document.getElementById('orderModel').value = c.model || c.title || '';
          }
          if (document.getElementById('orderFeatures')) {
            document.getElementById('orderFeatures').value = c.color || '';
          }
          if (document.getElementById('orderColor')) {
            document.getElementById('orderColor').value = c.color || '';
          }
          if (document.getElementById('orderSize')) {
            document.getElementById('orderSize').value = c.size || '';
          }
          if (document.getElementById('orderWeight')) {
            document.getElementById('orderWeight').value = c.weight || 1.0;
            const weightVal = document.getElementById('orderWeightVal');
            if (weightVal) weightVal.textContent = (c.weight || 1.0) + ' кг';
          }
          if (document.getElementById('orderPrice')) {
            document.getElementById('orderPrice').value = c.price || 0;
            document.getElementById('orderPrice').dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (document.getElementById('orderCurrency')) {
            document.getElementById('orderCurrency').value = c.currency || 'CNY';
          }
          if (document.getElementById('orderCategory')) {
            document.getElementById('orderCategory').value = c.category || '';
          }
          if (document.getElementById('keepBox')) {
            document.getElementById('keepBox').checked = c.keepBox || false;
          }
          
          if (c.image_url) {
            window.orderImportedImageUrl = c.image_url;
            if (typeof window.renderManualPhotoPreviews === 'function') {
              window.renderManualPhotoPreviews();
            }
          }
          
          glassToast('Данные расчета успешно импортированы!', { kind: 'success' });
        }, 50);
      } catch(e) {
        console.error(e);
        glassToast('Ошибка импорта расчета', { kind: 'error' });
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

    async function attachCalculatorHandlers() {
      // Toggle currency selection dropdown
      const currencyBtn = document.getElementById('calcCurrencyBtn');
      const currencyDropdown = document.getElementById('calcCurrencyDropdown');
      
      if (currencyBtn && currencyDropdown) {
        currencyBtn.onclick = (e) => {
          e.stopPropagation();
          currencyDropdown.classList.toggle('hidden');
        };
        
        window.selectCalcCurrency = (val, text) => {
          document.getElementById('calcCurrency').value = val;
          document.getElementById('calcCurrencyVal').innerText = text;
          currencyDropdown.classList.add('hidden');
        };
        
        document.addEventListener('click', () => {
          if (currencyDropdown) currencyDropdown.classList.add('hidden');
        });
      }
      
      // Toggle country selection dropdown
      const countryBtn = document.getElementById('calcCountryBtn');
      const countryDropdown = document.getElementById('calcCountryDropdown');
      
      if (countryBtn && countryDropdown) {
        countryBtn.onclick = (e) => {
          e.stopPropagation();
          countryDropdown.classList.toggle('hidden');
        };
        
        window.selectCalcCountry = (code) => {
          const selected = ALL_COUNTRIES.find(x => x.code === code);
          if (!selected) return;
          if (code !== 'CN') {
            tgUtil.haptic('warning');
            glassToast('Данное направление временно недоступно. Скоро мы запустим доставку!', { kind: 'info' });
            return;
          }
          document.getElementById('calcCountryInput').value = code;
          document.getElementById('calcCountryVal').innerText = `${selected.flag} ${selected.name}`;
          countryDropdown.classList.add('hidden');
        };
        
        document.addEventListener('click', () => {
          if (countryDropdown) countryDropdown.classList.add('hidden');
        });
      }
      
      // Toggle checkboxes on card clicks
      window.toggleCheckbox = (id) => {
        const cb = document.getElementById(id);
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      
      // AI weight estimation helper
      function toBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            resolve(reader.result);
          };
          reader.onerror = error => reject(error);
        });
      }
      
      window.openCalcWeightModal = () => {
        const modalHtml = `
          <div id="calcWeightModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md page-enter">
            <div class="glass-card w-full max-w-sm p-6 border border-white/15 rounded-3xl relative shadow-2xl" style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px);">
              <button onclick="document.getElementById('calcWeightModal').remove()" class="absolute top-4 right-4 text-white/50 hover:text-white text-xl">×</button>
              
              <h3 class="text-lg font-extrabold text-white mb-2 flex items-center gap-1.5">
                <span>⚖️ Узнать примерный вес</span>
              </h3>
              <p class="text-white/60 text-xs mb-4">Наш ИИ определит примерный вес товара для более точного расчета.</p>
              
              <div class="flex border-b border-white/10 mb-4">
                <button type="button" id="tabDescBtn" class="flex-1 pb-2 text-xs font-bold text-cyan-400 border-b-2 border-cyan-400" onclick="switchWeightTab('desc')">По описанию</button>
                <button type="button" id="tabPhotoBtn" class="flex-1 pb-2 text-xs font-bold text-white/60" onclick="switchWeightTab('photo')">По фото</button>
              </div>
              
              <div id="tabDescContent" class="space-y-3">
                <div>
                  <label class="text-white/70 text-[10px] block mb-1">Описание товара или бренд/модель</label>
                  <textarea id="calcWeightDesc" rows="3" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-xs text-white" placeholder="Например: Кроссовки зимние Adidas Terrex, размер 43"></textarea>
                </div>
                <button type="button" id="estimateWeightDescBtn" class="btn-primary w-full py-3 rounded-xl font-bold text-xs" onclick="estimateWeight('desc')">
                  Определить вес
                </button>
              </div>
              
              <div id="tabPhotoContent" class="space-y-3 hidden">
                <div id="calcWeightPhotoZone" class="p-4 border-2 border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition" onclick="document.getElementById('calcWeightPhotoInput').click()">
                  <div class="text-2xl mb-1">📸</div>
                  <p class="text-white/80 text-xs font-semibold">Выберите фото</p>
                  <input type="file" id="calcWeightPhotoInput" accept="image/*" class="hidden" onchange="handleWeightPhotoSelect(this)">
                </div>
                <div id="calcWeightPhotoPreview" class="hidden text-center">
                  <img id="calcWeightPhotoImg" class="mx-auto rounded-xl max-h-24 object-cover border border-white/20">
                </div>
                <button type="button" id="estimateWeightPhotoBtn" class="btn-primary w-full py-3 rounded-xl font-bold text-xs" onclick="estimateWeight('photo')">
                  Определить вес
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
      };
      
      window.switchWeightTab = (tab) => {
        const descBtn = document.getElementById('tabDescBtn');
        const photoBtn = document.getElementById('tabPhotoBtn');
        const descContent = document.getElementById('tabDescContent');
        const photoContent = document.getElementById('tabPhotoContent');
        
        if (tab === 'desc') {
          descBtn.className = "flex-1 pb-2 text-xs font-bold text-cyan-400 border-b-2 border-cyan-400";
          photoBtn.className = "flex-1 pb-2 text-xs font-bold text-white/60 border-0";
          descContent.classList.remove('hidden');
          photoContent.classList.add('hidden');
        } else {
          photoBtn.className = "flex-1 pb-2 text-xs font-bold text-cyan-400 border-b-2 border-cyan-400";
          descBtn.className = "flex-1 pb-2 text-xs font-bold text-white/60 border-0";
          photoContent.classList.remove('hidden');
          descContent.classList.add('hidden');
        }
      };
      
      window.handleWeightPhotoSelect = (input) => {
        const file = input.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = document.getElementById('calcWeightPhotoPreview');
          const img = document.getElementById('calcWeightPhotoImg');
          img.src = e.target.result;
          preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        window.calcWeightFile = file;
      };
      
      window.estimateWeight = async (type) => {
        const btnId = type === 'desc' ? 'estimateWeightDescBtn' : 'estimateWeightPhotoBtn';
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        const originalText = btn.innerText;
        btn.innerHTML = '⌛ Оцениваем...';
        btn.disabled = true;
        
        try {
          let payload = { action: 'estimate_weight' };
          
          if (type === 'desc') {
            const desc = document.getElementById('calcWeightDesc')?.value || '';
            if (!desc.trim()) {
              tgUtil.alert('Пожалуйста, введите описание товара!');
              return;
            }
            payload.description = desc;
          } else {
            const file = window.calcWeightFile;
            if (!file) {
              tgUtil.alert('Пожалуйста, выберите фото товара!');
              return;
            }
            // Загружаем фото в storage вместо отправки base64 (слишком большой payload)
            let sessionId = localStorage.getItem('icelogix_session_id');
            if (!sessionId) {
              sessionId = crypto.randomUUID();
              localStorage.setItem('icelogix_session_id', sessionId);
            }
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
            const weightPhotoPath = `${sessionId}/${Date.now()}_weight_${safeName}`;
            const { error: upErr } = await supabaseClient.storage
              .from('product-screenshots')
              .upload(weightPhotoPath, file, { contentType: file.type, upsert: false });
            if (upErr) throw new Error('Ошибка загрузки фото: ' + upErr.message);
            payload.screenshotPath = weightPhotoPath;
          }
          
          const { data, error } = await supabaseClient.functions.invoke('ai-calculator', {
            body: payload
          });
          
          if (error) throw error;
          if (!data?.ok) throw new Error(data?.error || 'Не удалось оценить вес');
          
          const estWeight = parseFloat(data.estimated_weight || data.weight);
          if (isNaN(estWeight) || estWeight <= 0) throw new Error('Некорректный вес от ИИ');
          
          const weightInput = document.getElementById('calcWeight');
          if (weightInput) {
            weightInput.value = estWeight.toFixed(2);
            weightInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          tgUtil.haptic('success');
          glassToast(`Вес успешно определен: ${estWeight} кг`, { kind: 'success' });
          document.getElementById('calcWeightModal')?.remove();
          
        } catch (err) {
          tgUtil.haptic('warning');
          tgUtil.alert('Ошибка определения веса: ' + err.message);
        } finally {
          btn.innerText = originalText;
          btn.disabled = false;
        }
      };

      window.openCurrencyInfoModal = (targetEl) => {
        document.getElementById('currencyInfoPopover')?.remove();
        tgUtil.haptic('light');

        const rect = targetEl ? targetEl.getBoundingClientRect() : { top: 60, left: window.innerWidth / 2, width: 24, height: 24 };
        const popWidth = Math.min(290, window.innerWidth - 32);
        
        let popLeft = Math.max(16, Math.min(window.innerWidth - popWidth - 16, rect.left + rect.width / 2 - popWidth / 2));
        let popTop = rect.top + rect.height + 10;
        let isBottom = true;

        if (popTop + 200 > window.innerHeight) {
          popTop = Math.max(16, rect.top - 200);
          isBottom = false;
        }

        const arrowLeft = Math.max(12, Math.min(popWidth - 24, (rect.left + rect.width / 2) - popLeft - 6));
        const arrowStyle = isBottom
          ? `top: -7px; left: ${arrowLeft}px; border-t: 1px solid rgba(6,182,212,0.4); border-left: 1px solid rgba(6,182,212,0.4); background: #020617;`
          : `bottom: -7px; left: ${arrowLeft}px; border-b: 1px solid rgba(6,182,212,0.4); border-right: 1px solid rgba(6,182,212,0.4); background: #020617;`;

        const popoverHtml = `
          <div id="currencyInfoPopover" class="fixed z-[9999] page-enter transition-all duration-200 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.3)] rounded-2xl p-3.5 text-left border border-cyan-500/40 bg-slate-950/95 backdrop-blur-xl space-y-2 text-white" style="left:${popLeft}px; top:${popTop}px; width:${popWidth}px;" onclick="event.stopPropagation();">
            <div class="absolute w-3 h-3 rotate-45" style="${arrowStyle}"></div>

            <div class="flex items-center gap-2 border-b border-white/10 pb-2">
              <img src="./assets/icl_currency_icon.png" alt="ICL" class="w-5 h-5 object-contain flex-shrink-0 drop-shadow-[0_0_6px_rgba(91,191,235,0.8)]">
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-black text-white tracking-wide leading-none">ICE Coin (ICL)</h4>
                <p class="text-[9px] font-semibold text-cyan-300 mt-0.5">1 ICL = 1 BYN • Внутренняя валюта</p>
              </div>
              <button type="button" onclick="document.getElementById('currencyInfoPopover')?.remove()" class="text-white/40 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full bg-white/5 cursor-pointer">✕</button>
            </div>

            <div class="space-y-1.5 text-[11px] text-white/80 leading-snug">
              <div class="flex items-start gap-1.5">
                <span class="text-xs">💎</span>
                <span><strong>Для чего:</strong> выкуп товаров, доставка, скидки и покупка курсов.</span>
              </div>
              <div class="flex items-start gap-1.5">
                <span class="text-xs">🎁</span>
                <span><strong>Как копить:</strong> кэшбек за заказы, приглашение друзей и промокоды.</span>
              </div>
            </div>

            <div class="pt-1.5 flex justify-end">
              <button type="button" onclick="document.getElementById('currencyInfoPopover')?.remove()" class="btn-primary py-1 px-3 rounded-lg text-[10px] font-bold shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer border-0">
                Понятно 👍
              </button>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', popoverHtml);
      };

      if (!window._currencyModalListenerAdded) {
        window._currencyModalListenerAdded = true;
        document.addEventListener('click', (e) => {
          const target = e.target.closest('.balance-icon, .brand-flake, [data-currency-info]');
          if (target && !e.target.closest('.balance-add')) {
            e.stopPropagation();
            window.openCurrencyInfoModal(target);
          } else {
            const pop = document.getElementById('currencyInfoPopover');
            if (pop && !e.target.closest('#currencyInfoPopover')) {
              pop.remove();
            }
          }
        });
      }

      window.resetCalculatorCalculation = () => {
        tgUtil.haptic('light');
        document.getElementById('calcTitle').value = '';
        document.getElementById('calcPrice').value = '';
        document.getElementById('calcWeight').value = '';
        document.getElementById('serviceDiscardBox').checked = false;
        document.getElementById('servicePhotoReport').checked = false;
        document.getElementById('serviceVideoReport').checked = false;
        document.getElementById('serviceFragilePack').checked = false;
        document.getElementById('calcResult').classList.add('hidden');
        window.tempOrder = null;
      };

      window.doCalculate = async () => {
        const calcBtn = document.getElementById('calcBtn');
        if (!calcBtn) return;
        
        const title = document.getElementById('calcTitle')?.value || '';
        const price = parseFloat(document.getElementById('calcPrice')?.value) || 0;
        const currency = document.getElementById('calcCurrency')?.value || 'CNY';
        const weight = parseFloat(document.getElementById('calcWeight')?.value) || 0;
        const country = document.getElementById('calcCountryInput')?.value || 'CN';
        const localDeliveryMethod = document.getElementById('calcDeliveryMethod')?.value || 'europost';
        
        if (!title.trim()) {
          tgUtil.alert('Пожалуйста, введите наименование товара!');
          return;
        }
        if (price <= 0 || isNaN(price)) {
          tgUtil.alert('Пожалуйста, укажите корректную стоимость товара!');
          return;
        }
        if (weight <= 0 || isNaN(weight)) {
          tgUtil.alert('Пожалуйста, укажите вес товара!');
          return;
        }
        
        const originalText = calcBtn.innerHTML;
        calcBtn.innerHTML = '⌛ Рассчитываем...';
        calcBtn.disabled = true;
        
        try {
          const services = {
            detailed_photo: !!document.getElementById('servicePhotoReport')?.checked,
            video_360: !!document.getElementById('serviceVideoReport')?.checked,
            fragile_packaging: !!document.getElementById('serviceFragilePack')?.checked,
            remove_box: !!document.getElementById('serviceDiscardBox')?.checked
          };
          
          const payload = {
            action: 'calculate',
            title: title,
            price: price,
            currency: currency,
            country: country,
            weight: weight,
            local_delivery: localDeliveryMethod,
            additional_services: services
          };
          
          const { data, error } = await supabaseClient.functions.invoke('ai-calculator', {
            body: payload
          });
          
          if (error) throw error;
          if (!data?.ok) throw new Error(data?.error || 'Не удалось рассчитать стоимость');
          
          const result = data.calc_details;
          
          const resultBox = document.getElementById('calcResult');
          const breakdownEl = document.getElementById('calcBreakdown');
          
          if (resultBox && breakdownEl) {
            resultBox.classList.remove('hidden');
            
            const selectedServices = [];
            if (services.detailed_photo) selectedServices.push({ name: 'Детальный фотоотчет', price_byn: 5 });
            if (services.video_360) selectedServices.push({ name: 'Видеообзор 360°', price_byn: 10 });
            if (services.fragile_packaging) selectedServices.push({ name: 'Дополнительная упаковка', price_byn: 10 });
            
            let servicesHtml = '';
            if (selectedServices.length > 0) {
              servicesHtml = `
                <div class="mt-2 pt-2 border-t border-white/5 space-y-1">
                  <span class="text-white/40 block text-[10px]">Доп. услуги:</span>
                  ${selectedServices.map(s => `
                    <div class="flex justify-between text-[11px] text-white/80">
                      <span>• ${s.name}</span>
                      <span class="font-mono">${s.price_byn} BYN</span>
                    </div>
                  `).join('')}
                </div>
              `;
            }
            
            let customsHtml = '';
            if (result.customs_duty_byn > 0) {
              customsHtml = `
                <div class="flex justify-between text-xs text-red-400 font-semibold">
                  <span>Таможенная пошлина:</span>
                  <span class="font-mono">+${result.customs_duty_byn.toFixed(2)} BYN</span>
                </div>
              `;
            }

            breakdownEl.innerHTML = `
              <div class="text-center pb-2 border-b border-white/5">
                <span class="text-white/40 text-[10px] block">Итоговая стоимость с доставкой</span>
                <span class="text-2xl font-extrabold text-cyan-400 font-mono">${result.total_byn.toFixed(2)} BYN</span>
              </div>
              
              <div class="space-y-2 pt-1 text-xs">
                <div class="flex justify-between text-white/60">
                  <span>Стоимость товара (${currency}):</span>
                  <span class="font-mono text-white">${price.toFixed(2)} ${currency}</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Комиссия сервиса (30%):</span>
                  <span class="font-mono text-white">${result.commission_byn.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Международная доставка (${result.calc_weight_kg.toFixed(2)} кг):</span>
                  <span class="font-mono text-white">${result.international_shipping_byn.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Доставка по Беларуси (${localDeliveryMethod}):</span>
                  <span class="font-mono text-white">${result.local_delivery_byn.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-white/60">
                  <span>Страховка (2%):</span>
                  <span class="font-mono text-white">${result.insurance_byn.toFixed(2)} BYN</span>
                </div>
                ${customsHtml}
                ${servicesHtml}
              </div>
              
              <div class="mt-3 p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-300 leading-normal">
                🔮 Расчет произведен ИИ с учетом всех сборов, тарифов логистики и таможенных пошлин.
              </div>
            `;
            
            window.tempOrder = {
              title: title,
              url: '',
              price: price,
              weight: weight,
              currency: currency,
              country: country,
              deliveryMethod: localDeliveryMethod,
              insurance: true,
              discardBox: services.remove_box,
              photoReport: services.detailed_photo,
              videoReport: services.video_360,
              fragilePack: services.fragile_packaging,
              total_byn: result.total_byn,
              breakdown: result
            };
            
            saveCalculationToHistory(window.tempOrder);
          }
          
          tgUtil.haptic('success');
        } catch (err) {
          tgUtil.haptic('warning');
          tgUtil.alert('Не удалось рассчитать стоимость: ' + err.message);
        } finally {
          calcBtn.innerHTML = originalText;
          calcBtn.disabled = false;
        }
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

      const calcBtn = document.getElementById('calcBtn');
      if (calcBtn) {
        calcBtn.onclick = () => window.doCalculate();
      }

      const toNewOrderBtn = document.getElementById('toNewOrderBtn');
      if (toNewOrderBtn) {
        toNewOrderBtn.onclick = () => {
          if (!window.tempOrder) return;
          
          window.orderCountry = window.tempOrder.country || 'CN';
          window.orderAddMode = true;
          window.orderAddSubMode = 'manual';
          
          setTimeout(() => {
            const oTitle = document.getElementById('orderTitle');
            const oPrice = document.getElementById('orderPrice');
            const oWeight = document.getElementById('orderWeight');
            const oCurrency = document.getElementById('orderCurrency');
            
            if (oTitle) {
              oTitle.value = window.tempOrder.title;
              oTitle.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (oPrice) {
              oPrice.value = window.tempOrder.price;
              oPrice.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (oWeight) {
              oWeight.value = window.tempOrder.weight;
              oWeight.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (oCurrency) {
              oCurrency.value = window.tempOrder.currency;
              oCurrency.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, 100);
          
          switchTab('neworder');
        };
      }

      const shareBtn = document.getElementById('calcShareBtn');
      if (shareBtn) {
        shareBtn.onclick = () => {
          if (!window.tempOrder) return;
          const msg = `🔥 *${window.tempOrder.title}*
Цена с доставкой: *${window.tempOrder.total_byn.toFixed(2)} BYN*
              
Считал через ICE LOGIX! Заказываем вместе?`;
          const botUsername = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'icelogix_bot';
          const shareUrl = `https://t.me/share/url?url=https://t.me/icelogix_bot/app&text=${encodeURIComponent(msg)}`;
          tgUtil.openTelegramLink(shareUrl);
        };
      }
    }    // ==================== GLOBAL ORDER WIZARD STATE HELPERS ====================
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
      tgUtil.confirm('Смена страны очистит список добавленных товаров. Продолжить?').then(ok => {
        if (ok) {
          window.orderCountry = null;
          window.tempOrder = null;
          window.orderAddMode = false;
          renderCurrentScreen();
        }
      });
    };

    window.startOrderAddMode = () => {
      window.orderAddMode = true;
      window.orderAddSubMode = null;
      // Only reset country if order is empty
      if (!window.tempOrder || !window.tempOrder.items || window.tempOrder.items.length === 0) {
        window.orderCountry = null;
      }
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
              <span class="font-mono">-3.00 BYN</span>
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
              <span class="font-mono">+3.00 BYN</span>
            </div>
          `);
        }
        if (extras.wood) {
          extraServicesTotal += 10;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>🪵 Обрешётка посылки (${countryLabel})</span>
              <span class="font-mono">+10.00 BYN</span>
            </div>
          `);
        }
        if (extras.check) {
          extraServicesTotal += 5;
          serviceBreakdownHtmlRows.push(`
            <div class="flex justify-between text-xs py-1 text-white/80">
              <span>🔍 Проверка на брак (${countryLabel})</span>
              <span class="font-mono">+5.00 BYN</span>
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
                💡 <strong>Превышен лимит пошлины €200!</strong> Вы можете добавить родственника в <span class="underline cursor-pointer font-bold hover:text-white" onclick="switchTab('profile')">Профиле (Мои получатели)</span>, чтобы разделить посылку и сэкономить <strong>${aggregatedBreakdown.customs_duty_byn.toFixed(2)} BYN</strong> на пошлине.
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
      if (balText) balText.innerText = '-' + balanceUsed.toFixed(2) + ' BYN';
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
