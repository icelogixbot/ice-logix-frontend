// ============================================================
// ICE LOGIX Module: Orders & Payments
// ============================================================
    // ==================== РЕНДЕР НОВОГО ЗАКАЗА ====================
        async function renderNewOrder() {
      // Fetch recipients for customs split
      window.userRecipients = [];
      if (userId) {
        try {
          const { data } = await supabaseClient.from('recipients').select('*').eq('user_id', userId);
          if (data) window.userRecipients = data;
        } catch(e) {}
      }

      const limitInfo = await checkAndUpdateLimit();
      let limitMessage = '';
      if (!limitInfo.allowed) {
        limitMessage = `<div class="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 text-center">
          <p class="text-red-400 font-bold"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Дневной лимит исчерпан (${limitInfo.currentCount}/${limitInfo.maxRequests})</p>
          <p class="text-white/70 text-sm mt-1">Оформите заказ, чтобы снять ограничение</p>
        </div>`;
      } else {
        const remaining = limitInfo.maxRequests - limitInfo.currentCount;
        limitMessage = `<div class="bg-white/5 rounded-xl p-3 mb-4 text-center">
          <p class="text-white/70 text-sm">Осталось расчётов сегодня: <span class="text-cyan-400 font-bold">${remaining}</span> из ${limitInfo.maxRequests}</p>
        </div>`;
      }

      let vacationBanner = '';
      if (window.buyerVacation && window.buyerVacation.active) {
        const days = window.buyerVacation.days || 0;
        vacationBanner = `
          <div class="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex gap-3 items-center">
            <span class="text-2xl">🌴</span>
            <div class="text-left">
              <p class="font-bold">Байеры на каникулах</p>
              <p class="text-xs text-white/70 mt-0.5">Все сроки доставки увеличены на ${days} дн. Создание заказов доступно в обычном режиме.</p>
            </div>
          </div>
        `;
      }

      // Initialize order structure
      if (!window.tempOrder) {
        window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: null };
      }
      window.tempOrder.items = window.tempOrder.items || [];

      // Auto force orderAddMode if no items are added yet
      if (window.tempOrder.items.length === 0) {
        window.orderAddMode = true;
      }

        // ── STEP A: Country Selection Overlay (if no country selected yet) ──
        if (!window.orderCountry) {
          return `
            <style>
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            </style>
            <div class="flex items-center justify-center min-h-[70vh] p-2 page-enter">
              <div class="glass-card w-full max-w-md p-6 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
                <div class="absolute -left-20 -top-20 w-40 h-40 rounded-full blur-3xl opacity-20" style="background: var(--ice-primary);"></div>
                <div class="absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-3xl opacity-20" style="background: #a855f7;"></div>

                <h2 class="text-xl font-extrabold text-white text-center mb-1 mt-4">Выберите страну отправления</h2>
                <p class="text-white/60 text-xs text-center mb-5">От страны зависят тарифы на доставку и пошлины</p>

                <div class="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1 hide-scrollbar">
                  ${ALL_COUNTRIES.map(c => {
                    if (c.active) {
                      return `
                        <div class="border border-white/10 hover:border-cyan-500/50 p-3.5 rounded-2xl bg-white/5 cursor-pointer transition-all duration-200" onclick="window.selectOrderCountry('${c.code}')">
                          <div class="flex items-center gap-3">
                            <div class="text-2xl">${c.flag}</div>
                            <div class="flex-1 text-left">
                              <h3 class="font-bold text-white text-sm">${c.name} (${c.platforms})</h3>
                              <p class="text-white/40 text-[10px] leading-normal mt-0.5">${c.desc}</p>
                            </div>
                            <span class="text-cyan-400 text-xs font-bold bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">Работает</span>
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <div class="border border-white/5 p-3.5 rounded-2xl bg-white/[0.02] opacity-50 cursor-pointer transition-all duration-200" onclick="window.selectOrderCountry('${c.code}')">
                          <div class="flex items-center gap-3">
                            <div class="text-2xl">${c.flag}</div>
                            <div class="flex-1 text-left">
                              <h3 class="font-bold text-white/70 text-sm">${c.name} (${c.platforms})</h3>
                              <p class="text-white/30 text-[10px] leading-normal mt-0.5">${c.desc}</p>
                            </div>
                            <span class="text-white/40 text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">Скоро</span>
                          </div>
                        </div>
                      `;
                    }
                  }).join('')}
                </div>
              </div>
            </div>
            ${renderFooter()}
          `;
        }
        if (window.orderAddMode) {
          // ── STEP B: Mode Selection Overlay (if country selected but no mode selected yet) ──
          if (!window.orderAddSubMode) {
            const limits = await getCalculatorLimits();
            return `
            <style>
              .order-mode-card {
                transition: all 0.2s ease-in-out;
              }
              .order-mode-card:hover {
                border-color: rgba(6, 182, 212, 0.4) !important;
                transform: translateY(-2px) scale(1.01);
                box-shadow: 0 4px 20px -2px rgba(6, 182, 212, 0.15);
              }
              .order-mode-card:active {
                transform: scale(0.97) !important;
                background-color: rgba(6, 182, 212, 0.08) !important;
                border-color: rgba(6, 182, 212, 0.7) !important;
                box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
              }
            </style>

            <div class="flex items-center justify-center min-h-[70vh] p-2 page-enter">
              <div class="glass-card w-full max-w-md p-6 border border-white/15 relative overflow-hidden shadow-2xl rounded-3xl" style="background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px);">
                <div class="absolute -left-20 -top-20 w-40 h-40 rounded-full blur-3xl opacity-20" style="background: var(--ice-primary);"></div>
                <div class="absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-3xl opacity-20" style="background: #a855f7;"></div>

                <button type="button" class="absolute top-4 left-4 text-white/60 hover:text-cyan-400 text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer z-10" onclick="window.orderCountry=null; renderCurrentScreen();">
                  ← Назад
                </button>

                <h2 class="text-xl font-extrabold text-white text-center mb-1 mt-4">Добавление товара в заказ</h2>
                <p class="text-white/60 text-xs text-center mb-5">Выберите способ добавления товара</p>
                
                ${vacationBanner}

                <div class="flex flex-col gap-3">
                  <!-- Import from calculator -->
                  <div class="order-mode-card border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300" onclick="window.setOrderAddSubMode('import')">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/25 flex items-center justify-center text-green-400 text-lg">
                        📥
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm">Импорт из расчетов</h3>
                        <p class="text-white/50 text-[11px] leading-normal mt-0.5">Выберите готовый расчет из вашей истории калькулятора.</p>
                      </div>
                    </div>
                  </div>

                  <!-- Link -->
                  <div class="order-mode-card border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300" onclick="window.setOrderAddSubMode('link')">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 text-lg">
                        🔗
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm">Заказать по ссылке</h3>
                        <p class="text-white/50 text-[11px] leading-normal mt-0.5">Вставьте ссылку на товар — нейросеть заполнит форму сама.</p>
                        <div class="text-[10px] text-purple-400 font-bold mt-1.5 flex items-center gap-1">
                          <span>🔮 Лимит ИИ:</span>
                          <span>${limits.ai.remaining}/${limits.ai.max} расчетов осталось на день</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Photo -->
                  <div class="order-mode-card border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300" onclick="window.setOrderAddSubMode('photo')">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 text-lg">
                        📸
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm">Заказать по фото</h3>
                        <p class="text-white/50 text-[11px] leading-normal mt-0.5">Поиск товара по изображению и автозаполнение.</p>
                        <div class="text-[10px] text-pink-400 font-bold mt-1.5 flex items-center gap-1">
                          <span>🔮 Лимит ИИ:</span>
                          <span>${limits.ai.remaining}/${limits.ai.max} расчетов осталось на день</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Description -->
                  <div class="order-mode-card border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300" onclick="window.setOrderAddSubMode('text')">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 text-lg">
                        📝
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm">Заказать по описанию</h3>
                        <p class="text-white/50 text-[11px] leading-normal mt-0.5">Текстовое описание товара для автоподбора параметров.</p>
                        <div class="text-[10px] text-amber-400 font-bold mt-1.5 flex items-center gap-1">
                          <span>🔮 Лимит ИИ:</span>
                          <span>${limits.ai.remaining}/${limits.ai.max} расчетов осталось на день</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Manual -->
                  <div class="order-mode-card border border-white/10 hover:border-cyan-500/50 p-4 rounded-2xl bg-white/5 cursor-pointer transition-all duration-300" onclick="window.setOrderAddSubMode('manual')">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 text-lg">
                        ✍️
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-white text-sm">Указать вручную (без ссылки)</h3>
                        <p class="text-white/50 text-[11px] leading-normal mt-0.5">Введите параметры товара самостоятельно.</p>
                        <div class="text-[10px] text-cyan-400 font-bold mt-1.5 flex items-center gap-1">
                          <span>📊 Лимит:</span>
                          <span>${limits.manual.max === Infinity ? 'Безлимитно расчетов на день' : `${limits.manual.remaining}/${limits.manual.max} расчетов осталось на день`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ${renderFooter()}
          `;
        }

        // ── STEP C: Product addition Form ──
        const subMode = window.orderAddSubMode;
        const subModeText = subMode === 'manual' ? '✍️ Вручную' : subMode === 'link' ? '🔗 По ссылке' : subMode === 'photo' ? '📸 По фото' : subMode === 'import' ? '📥 Из расчетов' : '📝 По описанию';
        const showFormFields = (subMode !== 'link' && subMode !== 'import' || window.orderLinkAnalyzed);

        let importListHtml = '';
        if (subMode === 'import') {
          let calculations = [];
          try {
            calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
          } catch(e) {}
          
          const filteredCalcs = calculations.filter(c => c.country === window.orderCountry);
          if (filteredCalcs.length === 0) {
            importListHtml = `
              <div class="text-center py-8 text-white/50 text-xs bg-white/5 rounded-2xl border border-white/10 p-4">
                <span class="text-2xl mb-2 block">📭</span>
                <p class="font-semibold">История расчетов для этой страны пуста</p>
                <p class="mt-1 text-white/30 text-[10px]">Сначала сделайте расчет в Калькуляторе для страны: ${window.orderCountry === 'CN' ? 'Китай' : window.orderCountry}</p>
              </div>
            `;
          } else {
            importListHtml = filteredCalcs.slice(0, 15).map(c => {
              const dateStr = new Date(c.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              const imageHtml = c.image_url 
                ? `<img src="${escHtmlC(c.image_url)}" class="w-12 h-12 object-cover rounded-xl border border-white/10 flex-shrink-0" onerror="this.style.display='none'">` 
                : '';
              const serialized = encodeURIComponent(JSON.stringify(c));
              return `
                <div class="glass-card p-3 flex gap-3 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition active:scale-[0.99] text-left" onclick="window.selectImportedCalculation('${serialized}')">
                  ${imageHtml}
                  <div class="flex-1 min-w-0 flex flex-col justify-between">
                    <div class="flex justify-between items-center text-[9px] text-white/40 mb-1">
                      <span>⏱️ ${dateStr}</span>
                      <span>${escHtmlC(c.marketplace || 'Poizon')}</span>
                    </div>
                    <h4 class="text-white font-bold text-xs truncate" title="${escHtmlC(c.title || 'Товар без названия')}">${escHtmlC(c.title || 'Товар без названия')}</h4>
                    <p class="text-white/50 text-[10px] mt-0.5">Размер: ${escHtmlC(c.size || '—')} · Цвет: ${escHtmlC(c.color || '—')} · ${c.weight || 1.0} кг</p>
                  </div>
                  <div class="flex flex-col justify-center items-end ml-2 pl-2 border-l border-white/5">
                    <span class="text-cyan-400 font-extrabold text-xs font-mono">${c.total_byn ? c.total_byn.toFixed(2) : '0.00'} BYN</span>
                    <span class="text-[9px] text-cyan-400/80 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded-lg border border-cyan-500/20 mt-1">Выбрать</span>
                  </div>
                </div>
              `;
            }).join('');
          }
        }

        const selectedOrderCountryObj = ALL_COUNTRIES.find(c => c.code === window.orderCountry);
        const countryText = selectedOrderCountryObj 
          ? `${selectedOrderCountryObj.flag} ${selectedOrderCountryObj.name}`
          : (window.orderCountry || '');

        return `
          <div class="glass-card page-enter relative">
            <button class="absolute top-4 left-4 text-xs text-white/50 hover:text-white transition cursor-pointer flex items-center gap-1" onclick="window.stopOrderAddMode()">
              ← К списку
            </button>

            <!-- Mode & Country Indicators -->
            <div class="grid grid-cols-2 gap-3 mb-4 bg-white/5 p-3 rounded-2xl border border-white/5 mt-6">
              <div class="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
                <div class="text-left">
                  <span class="text-[10px] text-white/40 block">Режим</span>
                  <span class="text-xs font-bold text-white">${subModeText}</span>
                </div>
                <button type="button" class="text-[10px] text-cyan-400 font-bold bg-white/10 px-2 py-1 rounded-lg hover:bg-white/15 transition active:scale-95 border border-white/5" onclick="window.orderAddSubMode=null; window.orderLinkAnalyzed=false; renderCurrentScreen()">
                  Сменить
                </button>
              </div>
              <div class="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
                <div class="text-left">
                  <span class="text-[10px] text-white/40 block">Страна</span>
                  <span class="text-xs font-bold text-white">${countryText}</span>
                </div>
                <button type="button" class="text-[10px] text-cyan-400 font-bold bg-white/10 px-2 py-1 rounded-lg hover:bg-white/15 transition active:scale-95 border border-white/5" onclick="window.orderCountry=null; renderCurrentScreen()">
                  Сменить
                </button>
              </div>
            </div>

            <!-- Mode-specific input views -->
            <!-- Import Pane -->
            <div id="paneOrderImport" class="mode-pane ${subMode === 'import' ? '' : 'hidden'} mb-4">
              <label class="text-white/70 text-sm block mb-2">Выберите расчет для импорта</label>
              <div class="flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                ${importListHtml}
              </div>
            </div>

            <!-- Link Pane -->
            <div id="paneOrderLink" class="mode-pane ${subMode === 'link' ? '' : 'hidden'} mb-4">
              <label class="text-white/70 text-sm block mb-1">Ссылка на товар <span class="text-red-400 font-bold">*</span></label>
              <div class="flex gap-2 items-stretch">
                <div class="flex-1 flex gap-1 bg-white/5 border border-white/30 rounded-xl overflow-hidden px-1.5 py-1">
                  <input type="text" id="orderUrl" class="bg-transparent flex-1 border-0 outline-none p-2 text-sm text-white" placeholder="Вставьте ссылку на Poizon, Taobao...">
                  <button type="button" id="orderPasteBtn" class="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3.5 transition flex items-center justify-center text-cyan-400 gap-1.5 text-xs font-bold" title="Вставить из буфера">
                    ${ix('clipboard', { size: '14px' })}
                    <span>Вставить</span>
                  </button>
                </div>
                <button id="analyzeOrderLinkBtn" class="btn-primary whitespace-nowrap transition flex-shrink-0"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Найти</button>
              </div>
              <p class="text-white/40 text-xs mt-1.5">Если ссылка не распознается, мы предложим загрузить скриншот.</p>
            </div>

            <!-- Photo Pane -->
            <div id="paneOrderPhoto" class="mode-pane ${subMode === 'photo' ? '' : 'hidden'} mb-4">
              <label class="text-white/70 text-sm block mb-1">Фото товара (можно до 5)</label>
              <div id="orderPhotoUploadZone" class="screenshot-upload-zone p-4 border-2 border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">
                <span class="text-3xl mb-1 block"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span>
                <span class="text-sm font-semibold block text-white">Загрузить фото товара</span>
                <span class="text-xs text-white/50 block mt-1">До 5 детальных фото для точного поиска</span>
                <input type="file" id="orderPhotoInput" accept="image/*" multiple class="hidden">
              </div>
              <div id="orderPhotoPreview" class="hidden mt-2 grid grid-cols-3 gap-2"></div>
              <label class="text-white/70 text-xs mt-2 block">Описание (опционально)</label>
              <input id="orderPhotoHint" type="text" placeholder="Напр. Nike Dunk Low Panda 42" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm">
              <button id="orderPhotoSearchBtn" class="btn-primary w-full mt-2 transition"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Найти этот товар</button>
            </div>

            <!-- Text Pane -->
            <div id="paneOrderText" class="mode-pane ${subMode === 'text' ? '' : 'hidden'} mb-4">
              <label class="text-white/70 text-sm block mb-1">Описание товара</label>
              <input type="text" id="orderTextQuery" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Например: Nike Dunk Low Panda кроссовки">
              <button id="orderTextSearchBtn" class="btn-primary w-full mt-2 transition"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Искать товар</button>
            </div>

            <div id="orderSearchResults" class="hidden mb-4"></div>
            <div id="orderScreenshotWidget" class="hidden mb-4"></div>

            <!-- Fields -->
            <div id="orderManualForm" class="${showFormFields ? '' : 'hidden'} mt-4 border-t border-white/10 pt-4">
              <div class="mb-3">
                <label class="text-white/70 text-sm block mb-1">Ссылка на товар (необязательно)</label>
                <input type="text" id="orderUrlManual" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="https://poizon.com/...">
              </div>
              
              <div class="mb-3">
                <label class="text-white/70 text-sm block mb-1">Фото товара (необязательно)</label>
                <div id="orderManualPhotoUploadZone" class="screenshot-upload-zone p-3 border border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:bg-white/5 transition">
                  <span class="text-sm text-white/70"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Загрузить фото</span>
                  <input type="file" id="orderManualPhotoInput" accept="image/*" multiple class="hidden">
                </div>
                <div id="orderManualPhotoPreview" class="hidden mt-2 grid grid-cols-3 gap-2"></div>
              </div>

              <!-- Title details -->
              <div class="bg-white/5 p-3 rounded-2xl mb-3">
                <p class="text-white/60 text-xs mb-2">Название товара:</p>
                <div class="mb-2">
                  <label class="text-white/50 text-xs block mb-0.5">Бренд</label>
                  <input type="text" id="orderBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Nike, Adidas, etc.">
                </div>
                <div class="mb-2">
                  <label class="text-white/50 text-xs block mb-0.5">Модель</label>
                  <input type="text" id="orderModel" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Air Force 1, etc.">
                </div>
                <div>
                  <label class="text-white/50 text-xs block mb-0.5">Особенности</label>
                  <input type="text" id="orderFeatures" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Цвет, расцветка...">
                </div>
              </div>

              <!-- Params -->
              <div class="bg-white/5 p-3 rounded-2xl mb-3">
                <p class="text-white/60 text-xs mb-2">Параметры:</p>
                <div class="mb-3">
                  <label class="text-white/50 text-xs block mb-1">Пол</label>
                  <div class="flex gap-2" id="orderGenderSelector">
                    <button type="button" data-gender="Мужской" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="window.selectOrderGender('Мужской')">Мужской</button>
                    <button type="button" data-gender="Женский" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="window.selectOrderGender('Женский')">Женский</button>
                    <button type="button" data-gender="Унисекс" class="filter-chip flex-1 py-2 text-center text-xs border border-white/10 hover:bg-white/5 transition" onclick="window.selectOrderGender('Унисекс')">Унисекс</button>
                    <input type="hidden" id="orderGender" value="Унисекс">
                  </div>
                </div>

                <div class="mb-3">
                  <label class="text-white/50 text-xs block mb-1">Категория</label>
                  <select id="orderCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm mb-1">${renderCategoryOptions()}</select>
                  <p id="orderCategoryHint" class="text-cyan-400 text-[10px] hidden mb-2 font-semibold ml-1"></p>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label class="text-white/50 text-xs block mb-0.5">Цвет</label>
                    <input type="text" id="orderColor" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Напр. Черный">
                  </div>
                  <div>
                    <label class="text-white/50 text-xs block mb-0.5">Размер</label>
                    <input type="text" id="orderSize" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Напр. 42">
                  </div>
                </div>

                <!-- Sizing -->
                <div class="border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-xl">
                  <p class="text-cyan-400 text-xs font-bold mb-1">Ввод замеров для ИИ-подбора размера (Рекомендуется)</p>
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label class="text-white/40 text-[9px] block">Рост (см)</label>
                      <input type="number" id="orderHeight" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="180">
                    </div>
                    <div>
                      <label class="text-white/40 text-[9px] block">Вес (кг)</label>
                      <input type="number" id="orderWeightKg" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="75">
                    </div>
                    <div>
                      <label class="text-white/40 text-[9px] block">Стелька (см)</label>
                      <input type="number" id="orderMeasure" class="btn-secondary w-full p-2 text-xs text-center border border-white/20 rounded-lg" placeholder="27">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Product Weight Slider -->
              <div class="mb-4">
                <label class="text-white/70 text-sm block">Вес товара (кг) <span class="text-white/40 text-xs">- влияет на стоимость доставки</span></label>
                <div class="flex items-center gap-3 mt-1">
                  <input type="range" id="orderWeight" min="0.1" max="30" step="0.1" value="1.0" class="flex-1 accent-cyan-500">
                  <span id="orderWeightVal" class="text-white/80 bg-white/10 px-3 py-1 rounded-full text-xs font-bold">1.0 кг</span>
                </div>
              </div>

              <!-- Price & Currency combined -->
              <div class="mb-4">
                <label class="text-white/70 text-sm block mb-1">Цена с валютой</label>
                <div class="flex gap-2">
                  <div class="flex-[3]">
                    <input type="number" id="orderPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Укажите цену товара">
                  </div>
                  <div class="flex-[1]">
                    <select id="orderCurrency" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm cursor-not-allowed opacity-60" style="padding: 14px 10px !important;" disabled>
                      <option value="CNY" selected>CNY (¥)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="PLN">PLN (zł)</option>
                      <option value="RUB">RUB (₽)</option>
                      <option value="BYN">BYN (Br)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Calculation Button or final breakdown -->
              <div class="flex flex-col gap-2 mt-4">
                <button id="orderSaveItemBtn" class="btn-primary w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
                  Добавить товар в заказ
                </button>
              </div>
            </div>
          </div>
          ${renderFooter()}
        `;
      }

      // Step 2: Checkout / Added Items List
      if (!window.tempOrder) {
        window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: window.orderCountry };
      }
      window.tempOrder.items = window.tempOrder.items || [];
      
      let itemsHtml = '';
      let totalSum = 0;
      
      // Sum up total from all items
      window.tempOrder.items.forEach(item => {
        totalSum += item.total_byn * item.quantity;
      });

      if (window.tempOrder.items.length === 0) {
        itemsHtml = `
          <div class="text-center py-8 text-white/40 text-sm bg-white/5 rounded-2xl border border-dashed border-white/10">
            <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h16v3M4 7l8 4 8-4M4 7v13h16V7"/></svg></span> У вас пока нет добавленных товаров.<br>Нажмите «<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить товар» ниже
          </div>
        `;
      } else {
        // Group items by country package
        const packages = {
          'CN': [],
          'PL': [],
          'RU': []
        };
        
        window.tempOrder.items.forEach((item, idx) => {
          item._originalIndex = idx;
          const country = getPlatformCountry(item.platform);
          packages[country].push(item);
        });

        // Auto-select tab if current active is empty
        window.activePackageTab = window.activePackageTab || 'CN';
        const activeTabsWithItems = Object.keys(packages).filter(c => packages[c].length > 0);
        if (activeTabsWithItems.length > 0 && !activeTabsWithItems.includes(window.activePackageTab)) {
          window.activePackageTab = activeTabsWithItems[0];
        }

        // Build package tabs layout
        const tabButtons = Object.keys(packages).map(country => {
          const count = packages[country].length;
          if (count === 0) return '';
          const flag = country === 'CN' ? '🇨🇳' : country === 'PL' ? '🇵🇱' : '🇷🇺';
          const label = country === 'CN' ? 'Китай' : country === 'PL' ? 'Европа' : 'Россия';
          const active = window.activePackageTab === country;
          return `
            <button type="button" class="flex-1 py-2 text-center text-[10px] font-bold rounded-xl border transition ${active ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 hover:bg-white/5 text-white/70'}" onclick="window.switchPackageTab('${country}')">
              ${flag} ${label} (${count})
            </button>
          `;
        }).join('');

        const activePackageItems = packages[window.activePackageTab] || [];
        const itemsListHtml = activePackageItems.map((item) => {
          return `
            <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center gap-2 mb-2">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-bold text-white truncate">${item.title}</div>
                <div class="text-xs text-white/60 mt-0.5">Размер: ${item.size || 'не указан'} · Категория: ${item.category}</div>
                <div class="text-xs text-cyan-400 font-bold mt-1">${item.price} ${item.currency} (${item.total_byn.toFixed(2)} BYN)</div>
              </div>
              <button type="button" class="bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full w-8 h-8 flex items-center justify-center transition flex-shrink-0" onclick="deleteOrderItem(${item._originalIndex})">${ix('trash-2')}</button>
            </div>
          `;
        }).join('');

        // Consolidation checkbox
        window.tempOrder.consolidation = window.tempOrder.consolidation || {};
        const isConsolidated = window.tempOrder.consolidation[window.activePackageTab] || false;
        const consolidationWidget = activePackageItems.length >= 2 ? `
          <div class="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 mt-3 mb-2 page-enter">
            <div class="flex items-center gap-2 text-left">
              <input type="checkbox" id="pkgConsolidationCheck" class="w-5 h-5 accent-cyan-500 cursor-pointer" ${isConsolidated ? 'checked' : ''} onchange="window.togglePackageConsolidation('${window.activePackageTab}')">
              <label for="pkgConsolidationCheck" class="text-white text-xs font-semibold leading-snug cursor-pointer">
                📦 Объединить товары в одну коробку (скидка 3 BYN)
              </label>
            </div>
          </div>
        ` : '';

        // Package extras checkboxes
        window.tempOrder.packageExtras = window.tempOrder.packageExtras || {};
        const extras = window.tempOrder.packageExtras[window.activePackageTab] || {};
        const activeCountryLabel = window.activePackageTab === 'CN' ? 'Китае' : window.activePackageTab === 'PL' ? 'Польше' : 'России';
        const extrasWidget = `
          <div class="bg-white/5 p-3.5 rounded-xl border border-white/10 mt-2 mb-2 text-xs space-y-2.5 page-enter">
            <p class="text-white/60 font-bold uppercase tracking-wider text-[10px]">Доп. услуги склада в ${activeCountryLabel}:</p>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="extraBubble" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.bubble ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'bubble')">
              <label for="extraBubble" class="text-white/70 cursor-pointer">Bubble-плёнка (+3 BYN)</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="extraWood" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.wood ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'wood')">
              <label for="extraWood" class="text-white/70 cursor-pointer">Деревянная обрешётка (+10 BYN)</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="extraCheck" class="w-4 h-4 accent-cyan-500 cursor-pointer" ${extras.check ? 'checked' : ''} onchange="window.togglePackageExtra('${window.activePackageTab}', 'check')">
              <label for="extraCheck" class="text-white/70 cursor-pointer">Детальная проверка на брак/замеры (+5 BYN)</label>
            </div>
          </div>
        `;

        itemsHtml = `
          <div class="space-y-3">
            <!-- Package Tabs Navigation -->
            <div class="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              ${tabButtons}
            </div>
            
            <!-- Active Package Items -->
            <div class="mt-2">
              ${itemsListHtml}
            </div>

            <!-- Package Specific Services & Discounts -->
            ${consolidationWidget}
            ${extrasWidget}
          </div>
        `;
      }

      const discountLine = window.tempOrder.discountAmount > 0
        ? `<p class="text-green-400 text-sm mt-1">Скидка: -${window.tempOrder.discountAmount.toFixed(2)} BYN</p>`
        : '';

      const finalTotal = Math.max(0, totalSum - (window.tempOrder.discountAmount || 0));

      const checkoutOptionsAndTotals = totalSum > 0 ? `
        <!-- Global Options -->
        <div class="bg-white/5 p-4 rounded-xl mb-4 space-y-3">
          <p class="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Опции заказа:</p>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="orderKeepBox" ${window.tempOrder.keepBox ? 'checked' : ''}>
            <label for="orderKeepBox" class="text-white/70 text-sm">Сохранить оригинальную коробку</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="orderInsurance" checked disabled>
            <label for="orderInsurance" class="text-white/70 text-sm"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></span> Обязательная страховка ShopByShop (+2%)</label>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" id="orderExtraPhoto" ${window.tempOrder.extraPhoto ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
            <label for="orderExtraPhoto" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">📸 Детальные photo со склада</span> (+3 BYN)</label>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <input type="checkbox" id="orderExtraMeasure" ${window.tempOrder.extraMeasure ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
            <label for="orderExtraMeasure" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">📏 Замер стельки/длины</span> (+3 BYN)</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="orderIsGift" ${window.tempOrder.isGift ? 'checked' : ''} class="w-4 h-4 accent-pink-500 cursor-pointer">
            <label for="orderIsGift" class="text-white/70 text-sm cursor-pointer"><span class="text-pink-400">🎁 Подарок</span> (Скрыть цену и чек)</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="orderRequiresVideoCheck" ${window.tempOrder.requiresVideoCheck ? 'checked' : ''} class="w-4 h-4 accent-cyan-500 cursor-pointer">
            <label for="orderRequiresVideoCheck" class="text-white/70 text-sm cursor-pointer"><span class="text-cyan-400">📹 Видео-проверка</span> со склада в Китае (+10 BYN)</label>
          </div>
        </div>

        <!-- Pick-up Point (PVS) Selector -->
        <div class="bg-white/5 p-4 rounded-xl mb-4 space-y-3">
          <p class="text-white/60 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🚚 Доставка по Беларуси:</span>
          </p>
          <div>
            <label class="text-white/50 text-[10px] block mb-1">Способ получения в Беларуси</label>
            <select id="pvsMethodSelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
              <option value="none" ${(!window.tempOrder.pvs || window.tempOrder.pvs.method === 'none') ? 'selected' : ''}>🏢 Самовывоз в Несвиже (0 BYN)</option>
              <option value="europoshta" ${(window.tempOrder.pvs?.method === 'europoshta') ? 'selected' : ''}>📦 Европочта (оплата тарифа при получении)</option>
              <option value="belpochta" ${(window.tempOrder.pvs?.method === 'belpochta') ? 'selected' : ''}>📬 Белпочта (оплата тарифа при получении)</option>
              <option value="sdek" ${(window.tempOrder.pvs?.method === 'sdek') ? 'selected' : ''}>🚚 СДЭК (оплата тарифа при получении)</option>
            </select>
          </div>
          
          <div id="pvsDetailContainer" class="${(!window.tempOrder.pvs || window.tempOrder.pvs.method === 'none') ? 'hidden' : ''} space-y-3">
            <button type="button" class="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 py-3 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2" onclick="window.openYandexMapStub()">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span> Выбрать на карте (Яндекс)
            </button>
            <div>
              <label class="text-white/50 text-[10px] block mb-1">Город</label>
              <select id="pvsCitySelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
                ${['Минск', 'Гомель', 'Брест', 'Гродно', 'Витебск', 'Могилев', 'Барановичи', 'Бобру��ск', 'Борисов', 'Лида', 'Мозырь', 'Новополоцк', 'Орша', 'Пинск', 'Солигорск'].map(c => `
                  <option value="${c}" ${(window.tempOrder.pvs?.city === c) ? 'selected' : ''}>${c}</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="text-white/50 text-[10px] block mb-1">Пункт выдачи / Отделение</label>
              <select id="pvsPointSelect" class="w-full p-3 rounded-xl border border-white/20 text-sm bg-slate-900 text-white">
                <!-- Will be populated dynamically -->
              </select>
            </div>
          </div>
          
          ${(window.userSettings?.free_delivery_tokens > 0) ? `
            <div class="flex items-center justify-between p-3 rounded-xl border border-green-500/30 bg-green-500/10 mt-3">
              <div class="flex items-center gap-2 text-left">
                <input type="checkbox" id="orderUseFreeDelivery" class="w-5 h-5 accent-green-500" ${window.tempOrder.useFreeDelivery ? 'checked' : ''}>
                <label for="orderUseFreeDelivery" class="text-white text-xs font-semibold leading-snug">Использовать купон на бесплатную доставку (осталось: ${window.userSettings.free_delivery_tokens})</label>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Promo Code -->
        <div class="bg-white/5 p-4 rounded-xl mb-4">
          <label class="text-white/70 text-sm block mb-1">Промокод</label>
          <div class="flex gap-2">
            <input type="text" id="promoCode" class="btn-secondary flex-1 p-3 rounded-xl border border-white/30 text-sm" placeholder="Введите промокод" value="${window.tempOrder.appliedPromo?.code || ''}">
            <button id="applyPromoBtn" class="btn-primary whitespace-nowrap px-4 rounded-xl text-sm font-bold">Применить</button>
          </div>
          <p id="promoMessage" class="text-xs mt-1 hidden"></p>
        </div>

        <!-- Customs Split Container Placeholders -->
        <div id="customsSplitPlaceholder"></div>

        <!-- Internal Balance Widget (Разделы 17, 23 ТЗ) -->
        <div class="bg-white/5 p-4 rounded-xl mb-4 border border-cyan-500/20">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">🧊</span>
              <div>
                <p class="text-white text-xs font-bold">Внутренний баланс ICE</p>
                <p class="text-cyan-400 text-xs font-semibold">Доступно: <span id="checkoutUserBalance">${Number(typeof balance !== 'undefined' ? (balance || 0) : 0).toFixed(2)}</span> BYN</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="orderApplyBalance" class="sr-only peer" ${Number(typeof balance !== 'undefined' ? (balance || 0) : 0) > 0 ? '' : 'disabled'}>
              <div class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
          <div id="checkoutBalanceAmountRow" class="hidden pt-2 border-t border-white/10 flex items-center justify-between text-xs mt-2">
            <span class="text-white/70">Списание с баланса:</span>
            <span class="text-green-400 font-bold font-mono" id="checkoutBalanceUsedText">-0.00 BYN</span>
          </div>
        </div>

        <!-- Payment Card (bePaid Mock, Раздел 23 ТЗ) -->
        <div class="bg-white/5 p-4 rounded-xl mb-4 space-y-3 border border-white/10">
          <div class="flex justify-between items-center">
            <span class="text-white/70 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>💳 Способ оплаты (1-й этап):</span>
            </span>
            <button type="button" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1" onclick="window.openAddCardModal(() => { if (typeof recalculateOrderTotals === 'function') recalculateOrderTotals(); })">
              <span>+ Привязать карту</span>
            </button>
          </div>
          <div id="checkoutCardsList" class="space-y-2">
            <!-- Populated via window.renderCheckoutCards() -->
          </div>
          <p class="text-[10px] text-white/50">🔒 Безопасная авторизация bePaid. Проверка карты 1.00 BYN с мгновенным возвратом.</p>
        </div>

        <!-- Breakdown & Totals (Разделы 4, 7, 8, 13, 14, 15 ТЗ) -->
        <div class="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl">
          <div id="orderBreakdown" class="mb-3 space-y-1 text-sm border-b border-white/10 pb-3"></div>
          
          <div class="space-y-1.5 mb-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div class="flex justify-between items-baseline text-xs text-white/70">
              <span>Полная оценка заказа:</span>
              <span class="text-white font-mono font-bold"><span id="orderTotal">${finalTotal.toFixed(2)}</span> BYN</span>
            </div>
            <div class="flex justify-between items-baseline text-xs text-amber-300">
              <span>2-й этап (оплата на складе):</span>
              <span class="font-mono font-bold">~<span id="secondPaymentEstimate">0.00</span> BYN</span>
            </div>
            <div class="flex justify-between items-baseline pt-2 border-t border-cyan-500/30">
              <span class="text-cyan-300 font-bold text-sm">К ОПЛАТЕ СЕЙЧАС (1-й этап):</span>
              <span class="text-cyan-400 font-bold text-xl"><span id="firstPaymentAmount">0.00</span> <span class="text-xs">BYN</span></span>
            </div>
          </div>
          ${discountLine}
          <p class="text-white/60 text-[11px] mb-3">1-й этап: выкуп товара + комиссия + упаковка (18 BYN) + 70% резерв доставки.<br>*Обязательная предоплата: <span id="prepaymentAmount" class="font-bold text-cyan-300">0.00</span> BYN</p>
          
          <!-- Agree Offer -->
          <div class="mt-4 flex items-start gap-2 border-t border-white/10 pt-3 mb-2">
            <input type="checkbox" id="agreeOffer" class="mt-1">
            <label for="agreeOffer" class="text-white/70 text-xs leading-normal">
              Я принимаю условия <a href="https://example.com/offer.pdf" target="_blank" class="text-cyan-400 underline font-bold">публичной оферты</a> и даю согласие на обработку персональных данных
            </label>
          </div>

          <!-- Agree Delivery Rules -->
          <div class="flex items-start gap-2 mb-4">
            <input type="checkbox" id="agreeDeliveryRules" class="mt-1">
            <label for="agreeDeliveryRules" class="text-white/70 text-xs leading-normal">
              Я прочитал и согласен с <button type="button" class="text-cyan-400 underline font-bold text-left" onclick="tgUtil.alert('Правила доставки:\\n\\n1. Сроки доставки являются ориентировочиными.\\n2. Итоговый вес может отличаться от расчетного.\\n3. Отмена выкупленного заказа невозможна.')">правилами доставки</button>.
            </label>
          </div>

          <!-- Agree Commission Contract -->
          <div class="flex items-start gap-2 mb-4">
            <input type="checkbox" id="agreeCommissionContract" class="mt-1">
            <label for="agreeCommissionContract" class="text-white/70 text-xs leading-normal">
              Я подписываю <button type="button" class="text-cyan-400 underline font-bold text-left" onclick="showCommissionContractModal()">📄 Договор комиссии байера (20% на услуги)</button> и подтверждаю точность предоставленных данных.
            </label>
          </div>

          <!-- ERIP Instructions -->
          <button type="button" class="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 mb-3 border border-white/10 transition" onclick="tgUtil.alert('Инструкция оплаты ЕРИП:\\n1. Платежи и переводы\\n2. Система «Расчет» (ЕРИП)\\n3. Интернет-магазины/сервисы\\n4. I -> ICE LOGIX\\n5. Введите номер заказа и сумму предоплаты.')">
            <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span> Инструкция оплаты через ЕРИП
          </button>

          <button id="createOrderFinal" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition">
            <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
            <span>Оплатить 1-й этап (<span id="btnPayAmount">0.00</span> BYN)</span>
          </button>
        </div>
      ` : '';

      return `
        <div class="glass-card page-enter">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></span> Оформление заказа</h2>
            <button class="text-xs text-cyan-400 bg-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 transition" onclick="resetOrderCountry()">
              ${window.orderCountry === 'CN' ? '🇨🇳 Китай' : window.orderCountry === 'PL' ? '🇵🇱 Польша' : '🇷🇺 Россия'} <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span> Сменить
            </button>
          </div>
          
          ${vacationBanner}
          ${limitMessage}
          
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-white/70 mb-2">Список выбранных товаров:</h3>
            <div id="orderItemsList" class="flex flex-col gap-3">
              ${itemsHtml}
            </div>
          </div>
          
          <div class="flex flex-col gap-3 mt-4">
            <button type="button" class="btn-secondary w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-dashed border-cyan-500/30 text-cyan-400 font-bold hover:bg-cyan-500/10 transition" onclick="startOrderAddMode()">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить товар
            </button>
            
            ${checkoutOptionsAndTotals}
          </div>
        </div>
        ${renderFooter()}
      `;
    }

    function attachNewOrderHandlers() {
      // Pre-lock currency for CN
      if (window.orderCountry === 'CN') {
        const currencySelect = document.getElementById('orderCurrency');
        if (currencySelect) {
          currencySelect.value = 'CNY';
          currencySelect.disabled = true;
          currencySelect.classList.add('cursor-not-allowed', 'opacity-60');
        }
      }


      if (!window.orderCountry) return;


      const orderResultsBox = document.getElementById('orderSearchResults');

      function setOrderMode(mode) {
        document.querySelectorAll('.order-mode-btn').forEach((btn) => {
          if (btn.getAttribute('onclick')?.includes(mode) || btn.classList.contains('active')) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
          } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
          }
        });
        const panes = document.querySelectorAll('.mode-pane');
        panes.forEach((pane) => {
          if (pane.id === 'paneOrder' + mode.charAt(0).toUpperCase() + mode.slice(1)) {
            pane.classList.remove('hidden');
          } else {
            pane.classList.add('hidden');
          }
        });
        if ((mode === 'manual' || mode === 'link') && orderResultsBox) {
          orderResultsBox.classList.add('hidden');
          orderResultsBox.innerHTML = '';
        }
      }

      if (!window.orderAddMode) {
        // --- STEP 2: CHECKOUT HANDLERS ---
        const extraPhotoInp = document.getElementById('orderExtraPhoto');
        const extraMeasureInp = document.getElementById('orderExtraMeasure');
        const keepBoxInp = document.getElementById('orderKeepBox');

        if (extraPhotoInp) {
          extraPhotoInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.extraPhoto = extraPhotoInp.checked;
            recalculateOrderTotals();
          });
        }
        if (extraMeasureInp) {
          extraMeasureInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.extraMeasure = extraMeasureInp.checked;
            recalculateOrderTotals();
          });
        }
        if (keepBoxInp) {
          keepBoxInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.keepBox = keepBoxInp.checked;
            recalculateOrderTotals();
          });
        }
        const videoCheckInp = document.getElementById('orderRequiresVideoCheck');
        if (videoCheckInp) {
          videoCheckInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.requiresVideoCheck = videoCheckInp.checked;
            recalculateOrderTotals();
          });
        }

        // PVS Selection Handlers
        const pvsMethodSelect = document.getElementById('pvsMethodSelect');
        const pvsCitySelect = document.getElementById('pvsCitySelect');
        const pvsPointSelect = document.getElementById('pvsPointSelect');
        const pvsDetailContainer = document.getElementById('pvsDetailContainer');
        const orderUseFreeDelivery = document.getElementById('orderUseFreeDelivery');

        const PVS_DATA = {
          europoshta: {
            'Минск': ['Отделение №1 (пр-т Независимости, 10)', 'Отделение №5 (ул. Притыцкого, 29)', 'Отделение №12 (ул. Немига, 3)', 'Отделение №30 (пр-т Дзержинского, 104)'],
            'Гомель': ['Отделение №2 (ул. Советская, 97)', 'Отделение №8 (ул. Хатаеви��а, 9)', 'Отделение №14 (пр-т Речицкий, 5В)'],
            'Брест': ['Отделение №3 (ул. Московская, 210)', 'Отделение №7 (ул. Пушкинская, 16)', 'Отделение №11 (пр-т Машерова, 17)'],
            'Гродно': ['Отделение №4 (ул. Советская, 18)', 'Отделение №9 (ул. Горького, 91)', 'Отделение №15 (пр-т Клецкова, 15)'],
            'Витебск': ['Отделение №6 (ул. Ленина, 26)', 'Отделение №10 (пр-т Строителей, 1)', 'Отделение №16 (ул. Чкалова, 35)'],
            'Могилев': ['Отделение №1 (ул. Первомайская, 57)', 'Отделение №5 (пр-т Пушкинский, 30)', 'Отделение №12 (ул. Островского, 5)'],
            'default': ['Центральное отделение']
          },
          sdek: {
            'Минск': ['ПВЗ СДЭК (пр-т Дзержинского, 11)', 'ПВЗ СДЭК (ул. Куйбышева, 40)', 'ПВЗ СДЭК (ул. Лобанка, 14)', 'ПВЗ СДЭК (пр-т Победителей, 65)'],
            'Гомель': ['ПВЗ СДЭК (ул. Интернациональная, 13)', 'ПВЗ СДЭК (ул. Кирова, 90)'],
            'Брест': ['ПВЗ СДЭК (ул. Гоголя, 65)', 'ПВЗ СДЭК (ул. Куйбышева, 9)'],
            'Гродно': ['ПВЗ СДЭК (ул. Карла Маркса, 30)', 'ПВЗ СДЭК (ул. Полиграфистов, 2А)'],
            'Витебск': ['ПВЗ СДЭК (пр-т Черняховского, 5)', 'ПВЗ СДЭК (ул. Правды, 64А)'],
            'Могилев': ['ПВЗ СДЭК (ул. Пионерская, 12)', 'ПВЗ СДЭК (пр-т Мира, 6)'],
            'default': ['Центральный ПВЗ СДЭК']
          },
          belpochta: {
            'Минск': ['Главпочтамт (пр-т Независимости, 10)', 'Отделение 220030 (ул. Энгельса, 14)', 'Отделение 220004 (ул. Кальварийская, 25)'],
            'Гомель': ['Главпочтамт (ул. Курчатова, 2)', 'Отделение 246050 (ул. Советская, 8)'],
            'Брест': ['Главпочтамт (пр-т Машерова, 32)', 'Отделение 224005 (ул. Пушкинская, 1)'],
            'Гродно': ['Главпочтамт (ул. Карла Маркса, 29)', 'Отделение 230023 (ул. Ожешко, 9)'],
            'Витебск': ['Главпочтамт (пр-т Московский, 10)', 'Отделение 210015 (ул. Ленина, 12)'],
            'Могилев': ['Главпочтамт (ул. Первомайская, 28)', 'Отделение 212030 (ул. Ленинская, 1)'],
            'default': ['Главпочтамт']
          }
        };

        const populatePvsPoints = () => {
          const method = pvsMethodSelect?.value || 'none';
          const city = pvsCitySelect?.value || 'Минск';
          if (!pvsPointSelect) return;
          
          if (method === 'none' || method === 'pickup') {
            if (pvsDetailContainer) pvsDetailContainer.classList.add('hidden');
            if (window.tempOrder) {
              window.tempOrder.pvs = { method: method, city: '', point: '', cost: 0 };
            }
            return;
          }
          
          if (pvsDetailContainer) pvsDetailContainer.classList.remove('hidden');
          
          const list = PVS_DATA[method]?.[city] || PVS_DATA[method]?.['default'] || ['Основное отделение'];
          const currentSavedPoint = window.tempOrder?.pvs?.point;
          
          pvsPointSelect.innerHTML = list.map(p => `
            <option value="${p}" ${currentSavedPoint === p ? 'selected' : ''}>${p}</option>
          `).join('');
          
          window.tempOrder.pvs = {
            method: method,
            city: city,
            point: pvsPointSelect.value,
            cost: 0 // Will be dynamically calculated in recalculateOrderTotals
          };
        };

        if (pvsMethodSelect) {
          pvsMethodSelect.addEventListener('change', () => {
            populatePvsPoints();
            recalculateOrderTotals();
          });
        }
        if (pvsCitySelect) {
          pvsCitySelect.addEventListener('change', () => {
            populatePvsPoints();
            recalculateOrderTotals();
          });
        }
        if (pvsPointSelect) {
          pvsPointSelect.addEventListener('change', () => {
            if (window.tempOrder?.pvs) {
              window.tempOrder.pvs.point = pvsPointSelect.value;
            }
            recalculateOrderTotals();
          });
        }
        if (orderUseFreeDelivery) {
          orderUseFreeDelivery.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.useFreeDelivery = orderUseFreeDelivery.checked;
            recalculateOrderTotals();
          });
        }
        
        const isGiftInp = document.getElementById('orderIsGift');
        if (isGiftInp) {
          isGiftInp.addEventListener('change', () => {
            if (window.tempOrder) window.tempOrder.isGift = isGiftInp.checked;
          });
        }

        const applyBalanceInp = document.getElementById('orderApplyBalance');
        if (applyBalanceInp) {
          applyBalanceInp.addEventListener('change', () => {
            recalculateOrderTotals();
          });
        }
        
        // Sanction Check Handlers
        const sanBrands = ['dyson', 'sony', 'apple', 'zara', 'h&m', 'massimo dutti', 'samsung', 'playstation', 'xbox'];
        const orderNameInput = document.getElementById('orderName');
        const orderUrlInput = document.getElementById('orderUrl');
        const checkSanctions = () => {
          if (!document.getElementById('sanctionBanner')) return;
          const txt = ((orderNameInput?.value || '') + ' ' + (orderUrlInput?.value || '')).toLowerCase();
          // Check only if it's from Europe (PL or EU mode)
          if (window.orderCountry === 'PL' || window.orderCountry === 'EU') {
            const hasSanction = sanBrands.some(b => txt.includes(b));
            if (hasSanction) {
              document.getElementById('sanctionBanner').classList.remove('hidden');
            } else {
              document.getElementById('sanctionBanner').classList.add('hidden');
            }
          } else {
            document.getElementById('sanctionBanner').classList.add('hidden');
          }
        };
        if (orderNameInput) orderNameInput.addEventListener('input', checkSanctions);
        if (orderUrlInput) orderUrlInput.addEventListener('input', checkSanctions);

        populatePvsPoints();
        recalculateOrderTotals();
        if (typeof window.loadUserCards === 'function') {
          window.loadUserCards().then(() => {
            if (typeof window.renderCheckoutCards === 'function') {
              window.renderCheckoutCards();
            }
          });
        }

        // Promo code application
        const promoInput = document.getElementById('promoCode');
        const applyPromoBtn = document.getElementById('applyPromoBtn');
        const promoMessage = document.getElementById('promoMessage');

        if (applyPromoBtn) {
          applyPromoBtn.onclick = async () => {
            const code = promoInput?.value.trim().toUpperCase();
            if (!code) {
              promoMessage.innerText = 'Введите код';
              promoMessage.classList.remove('hidden');
              return;
            }

            try {
              const { data, error } = await supabaseClient
                .from('promocodes')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .maybeSingle();

              if (error) {
                promoMessage.innerText = 'Ошибка проверки кода';
                promoMessage.classList.remove('hidden');
                console.error(error);
                return;
              }
              if (!data) {
                promoMessage.innerText = 'Неверный или неактивный промокод';
                promoMessage.classList.remove('hidden');
                return;
              }

              let discountAmount = 0;
              if (data.discount_type === 'percent') {
                discountAmount = window.tempOrder.total * (data.discount_value / 100);
              } else {
                discountAmount = data.discount_value;
              }
              if (discountAmount > window.tempOrder.total) discountAmount = window.tempOrder.total;

              window.tempOrder.discountAmount = discountAmount;
              window.tempOrder.appliedPromo = data;
              recalculateOrderTotals();
              
              promoMessage.innerHTML = `Промокод применён! Скидка: ${discountAmount.toFixed(2)} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span>`;
              promoMessage.classList.remove('hidden');
              promoMessage.style.color = '#4ade80';
            } catch (err) {
              promoMessage.innerText = 'Ошибка: ' + err.message;
              promoMessage.classList.remove('hidden');
            }
          };
        }

        
        const orderSlider = document.getElementById('orderWeight');
        const orderNumericInput = document.getElementById('orderWeightInput');

        const updateOrderWeight = (val, source) => {
          let num = parseFloat(val);
          if (isNaN(num)) return;
          num = Math.max(0.1, Math.min(30, num));

          if (source !== 'slider' && orderSlider) orderSlider.value = num;
          if (source !== 'input' && orderNumericInput) orderNumericInput.value = num.toFixed(1);

          if (window.tempOrder && window.tempOrder.items && window.tempOrder.items[0]) {
            window.tempOrder.items[0].weight = num;
          }
          // Recalculate totals
          recalculateOrderTotals();
        };

        if (orderSlider) {
          orderSlider.oninput = () => {
            updateOrderWeight(orderSlider.value, 'slider');
          };
        }
        if (orderNumericInput) {
          orderNumericInput.oninput = () => {
            updateOrderWeight(orderNumericInput.value, 'input');
          };
        }

        // Submit final order to Supabase
        const createBtn = document.getElementById('createOrderFinal');
        if (createBtn) {
          createBtn.onclick = async () => {
            if (!window.tempOrder || !userId) { tgUtil.alert('Ошибка: авторизуйтесь или заполните поля'); return; }
            if (!window.tempOrder.items || window.tempOrder.items.length === 0) { tgUtil.alert('Добавьте хотя бы один товар в заказ'); return; }

            const agreeOffer = document.getElementById('agreeOffer');
            if (agreeOffer && !agreeOffer.checked) {
              tgUtil.alert('Вы должны принять условия публичной оферты');
              return;
            }

            const agreeCommissionContract = document.getElementById('agreeCommissionContract');
            if (agreeCommissionContract && !agreeCommissionContract.checked) {
              tgUtil.alert('Вы должны подписать Договор комиссии байера');
              return;
            }

            const agreeDeliveryRules = document.getElementById('agreeDeliveryRules');
            if (agreeDeliveryRules && !agreeDeliveryRules.checked) {
              tgUtil.alert('Вы должны согласиться с правилами доставки');
              return;
            }

            if (window.tempOrder?.useCustomsSplit && !window.tempOrder?.customsSplitRecipientId) {
              tgUtil.alert('Выберите второго получателя для разделения посылки.');
              return;
            }

            const consolidatedOrder = {
              price: window.tempOrder.price || 0,
              currency: window.tempOrder.items?.[0]?.currency || 'CNY',
              weight: document.getElementById('orderWeight') ? parseFloat(document.getElementById('orderWeight').value) : (window.tempOrder.weight || 1),
              category: window.tempOrder.items?.[0]?.category || '',
              country: window.orderCountry,
              url: window.tempOrder.items?.[0]?.url || '',
            };

            const validationErrors = validateOrderBeforeSubmit(consolidatedOrder);
            if (validationErrors.length) {
              tgUtil.haptic('warning');
              tgUtil.alert('Проверьте заказ:\\n• ' + validationErrors.join('\\n• '));
              return;
            }

            const aggregatedOrderForPreview = {
              ...window.tempOrder,
              title: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].title : `${window.tempOrder.items.length} товаров`,
              brand: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].brand : '',
              marketplaceName: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].marketplace_name : '',
              size: window.tempOrder.items.length === 1 ? window.tempOrder.items[0].size : '',
              price: window.tempOrder.price,
              currency: consolidatedOrder.currency,
              weight: window.tempOrder.weight,
              total_byn: window.tempOrder.total_byn
            };

            const confirmed = await showOrderPreviewModal(aggregatedOrderForPreview);
            if (!confirmed) return;

            try {
              const bk = window.tempOrder.breakdown || {};
              const pvs = window.tempOrder.pvs || { method: 'none' };
              let pvsAddress = '';
              if (pvs.method !== 'none') {
                pvsAddress = `${pvs.method === 'europoshta' ? 'Европочта' : pvs.method === 'sdek' ? 'СДЭК' : 'Белпочта'} | ${pvs.city} | ${pvs.point}`;
              }
              if (window.tempOrder?.useCustomsSplit && window.tempOrder?.customsSplitRecipientName) {
                const secName = window.tempOrder.customsSplitRecipientName;
                pvsAddress = pvsAddress 
                  ? `${pvsAddress} | 🛡️ РАЗДЕЛЕНИЕ: ${secName}`
                  : `Самовывоз | 🛡️ РАЗДЕЛЕНИЕ: ${secName}`;
              }
              if (window.tempOrder?.isGift) {
                pvsAddress = pvsAddress ? `${pvsAddress} | 🎁 ПОДАРОК (Скрыть товар)` : `🎁 ПОДАРОК (Скрыть товар)`;
              }

              const fam = window.userSettings?.family || {};
              const isFamilyMember = fam.role === 'member' && fam.head_id;

              const firstPaymentToPay = window.tempOrder.first_payment_byn != null ? window.tempOrder.first_payment_byn : (window.tempOrder.total_byn * 0.70);
              const balanceUsed = window.tempOrder.balance_used || 0;
              const idempotencyKey = 'pay1_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

              createBtn.disabled = true;
              createBtn.innerHTML = '<span class="ix animate-spin">⏳</span> Обработка оплаты 1-г�� этапа...';

              const { data, error } = await supabaseClient.from('orders').insert({
                user_id: userId,
                source_url: consolidatedOrder.url,
                items: window.tempOrder.items,
                cart_items: window.tempOrder.items,
                weight_estimated: window.tempOrder.weight || 1,
                price_original: window.tempOrder.price || 0,
                price_byn: bk.product_cost_byn ?? (window.tempOrder.price * 0.45),
                delivery_cost_estimated: bk.delivery_cost_byn ?? (window.tempOrder.weight * 12),
                commission_byn: bk.commission_byn || 0,
                insurance_byn: bk.insurance_byn || 0,
                legit_check_byn: 0,
                customs_duty_byn: bk.customs_duty_byn || 0,
                currency_buffer_byn: bk.currency_buffer_byn || 0,
                extra_services: {
                  extra_photo: window.tempOrder.extraPhoto || false,
                  extra_measure: window.tempOrder.extraMeasure || false,
                  is_gift: window.tempOrder.isGift || false
                },
                total_byn: window.tempOrder.total_byn,
                requires_video_check: window.tempOrder.requiresVideoCheck || false,
                delivery_days_min: null,
                delivery_days_max: null,
                source_country: window.orderCountry,
                product_currency: consolidatedOrder.currency,
                prepayment_amount: firstPaymentToPay,
                first_payment_paid: true,
                status: 'paid',
                auto_cancel_reason: isFamilyMember ? 'family_approval_pending' : null,
                discount_applied: window.tempOrder.discountAmount || 0,
                promo_code: window.tempOrder.appliedPromo?.code || null,
                tracking_number_by: pvsAddress || null
              }).select();

              if (error) throw error;

              const createdOrderId = data[0].id;

              // Если был списан баланс, фиксируем в ledger balance_entries
              if (balanceUsed > 0) {
                const curBal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
                const nextBal = Math.max(0, curBal - balanceUsed);
                await supabaseClient.from('balance_entries').insert({
                  user_id: userId,
                  order_id: createdOrderId,
                  operation_type: 'PAYMENT_DEBIT',
                  amount: -balanceUsed,
                  balance_after: nextBal,
                  note: `Оплата 1-го этапа заказа #${createdOrderId.slice(0, 8)}`
                }).catch(() => {});

                await supabaseClient.from('users').update({ ices_balance: nextBal }).eq('user_id', userId).catch(() => {});
                if (typeof balance !== 'undefined') balance = nextBal;
                if (typeof updateUserCard === 'function') updateUserCard();
              }

              // Запись платежа в payments (Mock bePaid)
              await supabaseClient.from('payments').insert({
                order_id: createdOrderId,
                user_id: userId,
                amount: firstPaymentToPay,
                currency: 'BYN',
                payment_method: balanceUsed >= (window.tempOrder.first_payment_subtotal_byn || firstPaymentToPay) ? 'balance' : 'card',
                payment_provider: 'bepaid',
                stage: 'FIRST_PAYMENT',
                status: 'succeeded',
                idempotency_key: idempotencyKey
              }).catch(() => {});

              // Consume free delivery token if checked
              if (window.tempOrder.useFreeDelivery && window.userSettings?.free_delivery_tokens > 0) {
                const updatedSettings = {
                  ...window.userSettings,
                  free_delivery_tokens: window.userSettings.free_delivery_tokens - 1
                };
                await supabaseClient.from('users').update({ settings: updatedSettings }).eq('user_id', userId);
                window.userSettings = updatedSettings;
              }

              tgUtil.haptic('success');
              tgUtil.alert(`✅ Заказ #${createdOrderId.slice(0, 8)} успешно оформлен!\\n1-й этап (${firstPaymentToPay.toFixed(2)} BYN) оплачен.`);

              const cartIds = window.tempOrder.items.map(item => item.cartId).filter(Boolean);
              if (cartIds.length > 0) {
                await supabaseClient.from('cart').delete().in('id', cartIds);
                await updateCartBadge();
              }

              if (!userLimits.isTrusted) {
                await supabaseClient.from('users').update({ is_trusted: true }).eq('user_id', userId);
                userLimits.isTrusted = true;
                tgUtil.alert('✅ Поздравляем с первым заказом! Лимит на расчёты увеличен до 100 в день.');
              }

              window.tempOrder = null;
              window.orderCountry = null;
              delete _tabCache['cart:'];
              delete _tabCache['profile:'];
              delete _tabCache['home:'];
              delete _tabCache['catalogs:'];
              switchTab('home');
            } catch (err) {
              tgUtil.haptic('error');
              tgUtil.alert('Ошибка создания заказа: ' + err.message);
            }
          };
        }
      } else {
        // --- STEP 4: ADD PRODUCT FORM HANDLERS ---
        if (window.userSizing) {
          const h = document.getElementById('orderHeight');
          const w = document.getElementById('orderWeightKg');
          const m = document.getElementById('orderMeasure');
          if (h && window.userSizing.height) h.value = window.userSizing.height;
          if (w && window.userSizing.weight) w.value = window.userSizing.weight;
          if (m && window.userSizing.measure) m.value = window.userSizing.measure;
        }

        // New Order Size Advisor logic
        const updateAiSizeAdvice = () => {
          const category = document.getElementById('orderCategory')?.value || '';
          const brand = document.getElementById('orderBrand')?.value || '';
          const height = document.getElementById('orderHeight')?.value || '';
          const weight = document.getElementById('orderWeightKg')?.value || '';
          const measure = document.getElementById('orderMeasure')?.value || '';
          
          const advice = getAISizeRecommendation(category, height, weight, measure, brand);
          const banner = document.getElementById('aiSizeAdvisorBanner');
          const textEl = document.getElementById('aiSizeAdvisorText');
          
          if (advice && banner && textEl) {
            banner.classList.remove('hidden');
            textEl.innerHTML = advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          } else if (banner) {
            banner.classList.add('hidden');
          }
        };

        ['orderCategory', 'orderBrand', 'orderHeight', 'orderWeightKg', 'orderMeasure'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('input', updateAiSizeAdvice);
            el.addEventListener('change', updateAiSizeAdvice);
          }
        });

        const orderCategoryEl = document.getElementById('orderCategory');
        if (orderCategoryEl) {
          orderCategoryEl.addEventListener('change', () => {
            if (window.updateCategoryHint) window.updateCategoryHint('orderCategory', 'orderCategoryHint');
          });
        }

        const manualBanner = document.getElementById('aiSizeAdvisorBanner');
        if (manualBanner) {
          manualBanner.onclick = () => {
            const category = document.getElementById('orderCategory')?.value || '';
            const brand = document.getElementById('orderBrand')?.value || '';
            const height = document.getElementById('orderHeight')?.value || '';
            const weight = document.getElementById('orderWeightKg')?.value || '';
            const measure = document.getElementById('orderMeasure')?.value || '';
            const advice = getAISizeRecommendation(category, height, weight, measure, brand);
            if (advice) {
              const sizeMatch = advice.match(/\*\*(.*?)\*\*/);
              if (sizeMatch && sizeMatch[1]) {
                const sizeInput = document.getElementById('orderSize');
                if (sizeInput) {
                  sizeInput.value = sizeMatch[1];
                  tgUtil.haptic('light');
                  glassToast(`Размер ${sizeMatch[1]} применён!`, { kind: 'success' });
                }
              }
            }
          };
        }

        updateAiSizeAdvice();

        const urlInp = document.getElementById('orderUrl');
        const orderPasteBtn = document.getElementById('orderPasteBtn');
        const analyzeOrderBtn = document.getElementById('analyzeOrderLinkBtn');

        if (orderPasteBtn) {
          orderPasteBtn.onclick = async () => {
            tgUtil.haptic('light');
            try {
              const text = await navigator.clipboard.readText();
              const cleaned = text?.trim();
              if (cleaned && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.includes('dewu.com') || cleaned.includes('taobao.com') || cleaned.includes('1688.com') || cleaned.includes('poizon') || cleaned.includes('zalando') || cleaned.includes('vinted'))) {
                if (urlInp) {
                  urlInp.value = cleaned;
                  glassToast('Ссылка успешно вставлена!', { kind: 'success' });
                  if (analyzeOrderBtn) analyzeOrderBtn.click();
                }
              } else if (cleaned) {
                if (urlInp) urlInp.value = cleaned;
                glassToast('Текст вставлен! Проверьте формат ссылки.', { kind: 'info' });
              } else {
                glassToast('Буфер обмена пуст!', { kind: 'info' });
              }
            } catch (err) {
              console.error('Clipboard paste failed:', err);
              glassToast('Нет доступа к буферу. Вставьте вручную.', { kind: 'error' });
            }
          };
        }

        if (analyzeOrderBtn) {
          analyzeOrderBtn.addEventListener('click', async () => {
            const url = urlInp?.value.trim();
            if (!url) { tgUtil.alert('Вставьте ссылку'); return; }

            const limitCheck = await checkAndUpdateLimit();
            if (!limitCheck.allowed) {
              tgUtil.alert(`Лимит исчерпан (${limitCheck.currentCount}/${limitCheck.maxRequests}).`);
              return;
            }

            const originalText = analyzeOrderBtn.innerText;
            analyzeOrderBtn.innerHTML = isHardDomain(url) ? '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Обходим защиту…' : '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Анализ...';
            analyzeOrderBtn.disabled = true;

            try {
              const { data: queueData, error: insErr } = await supabaseClient
                .from('parse_queue')
                .insert({ user_id: userId, url, status: 'pending' })
                .select('id')
                .single();
              if (insErr) throw new Error('Ошибка создания задачи: ' + insErr.message);

              const taskId = queueData.id;
              let result = null;
              let manualRequired = false;

              const maxIterations = isHardDomain(url) ? 90 : 75;
              for (let i = 0; i < maxIterations; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const { data: checkData } = await supabaseClient
                  .from('parse_queue')
                  .select('status, price, title, weight_kg, currency, country, category, description, color, brand, marketplace_name, error_message, parse_method, screenshot_path, image_url')
                  .eq('id', taskId)
                  .single();

                if (checkData?.status === 'done') { result = checkData; break; }
                if (checkData?.status === 'manual_required') {
                  manualRequired = true;
                  if (checkData.category) {
                    const categorySelect = document.getElementById('orderCategory');
                    if (categorySelect) {
                      const opt = findCategoryOption(categorySelect, checkData.category);
                      if (opt) { categorySelect.value = opt.value; categorySelect.dispatchEvent(new Event('change')); }
                    }
                  }
                  showScreenshotWidget(taskId, checkData, 'order');
                  break;
                }
                if (checkData?.status === 'error') {
                  throw new Error(checkData.error_message || 'Ошибка парсинга');
                }
              }

              if (!result && !manualRequired) throw new Error('Таймаут ожидания парсинга');
              if (manualRequired) return;

              const orderPriceEl = document.getElementById('orderPrice');
              if (orderPriceEl) {
                if (result.price != null && result.price !== '' && Number(result.price) > 0) {
                  orderPriceEl.value = result.price;
                } else {
                  orderPriceEl.value = '';
                }
              }
              if (result.currency) {
                const currencySelect = document.getElementById('orderCurrency');
                if (currencySelect) {
                  const option = Array.from(currencySelect.options).find(opt => opt.value === result.currency);
                  if (option) currencySelect.value = result.currency;
                }
              }
              if (result.category) {
                const categorySelect = document.getElementById('orderCategory');
                if (categorySelect) {
                  const option = findCategoryOption(categorySelect, result.category);
                  if (option) {
                    categorySelect.value = option.value;
                    categorySelect.dispatchEvent(new Event('change'));
                  }
                }
              }
              
              const setIfEmpty = (id, val) => {
                const el = document.getElementById(id);
                if (el && val && (!el.value || el.value.trim() === '')) el.value = val;
              };
              setIfEmpty('orderTitle', result.title);
              setIfEmpty('orderBrand', result.brand);
              setIfEmpty('orderModel', result.title);
              const descParts = [];
              if (result.description) descParts.push(result.description);
              if (result.color) descParts.push('Цвет: ' + result.color);
              if (descParts.length) setIfEmpty('orderFeatures', descParts.join(' · '));

              if (userId) {
                const newCount = limitCheck.currentCount + 1;
                await supabaseClient.from('users').update({ daily_requests_count: newCount, last_request_date: new Date().toISOString() }).eq('user_id', userId);
                userLimits.dailyCount = newCount;
              }

              analyzeOrderBtn.classList.add('bg-green-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-green-500'), 1000);
            } catch (err) {
              analyzeOrderBtn.classList.add('bg-red-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-red-500'), 2000);
              tgUtil.alert('❌ ' + (err && err.message ? err.message : 'Не удалось проанализировать ссылку. Попробуйте ввести данные вручную.'));
            } finally {
              analyzeOrderBtn.innerText = originalText;
              analyzeOrderBtn.disabled = false;
            }
          });
        }

        const _ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
        function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"'\\/]/g, (c) => _ESC_MAP[c]); }
        function safeUrl(u) {
          const s = String(u || '').trim();
          if (!s) return '';
          try {
            const parsed = new URL(s);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
          } catch { }
          return '';
        }

        function renderOrderSearchResults(payload) {
          if (!orderResultsBox) return;
          const list = (payload && payload.results) || [];
          if (list.length === 0) {
            orderResultsBox.classList.remove('hidden');
            const errPlatforms = (payload?.errors || []).map((e) => escHtml(e.platform)).join(', ');
            orderResultsBox.innerHTML = `
              <div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80">
                <span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Ничего не нашли. Попробуйте уточнить запрос или другой режим.
                ${errPlatforms ? '<br><span class="text-xs text-white/50">Площадки с ошибками: ' + errPlatforms + '</span>' : ''}
              </div>`;
            return;
          }

          const cards = list.map((r, i) => {
            const priceNum = (typeof r.price === 'number' && isFinite(r.price)) ? r.price : null;
            const currency = typeof r.currency === 'string' ? escHtml(r.currency) : '';
            const priceLine = (priceNum && currency)
              ? `<div class="text-cyan-400 font-bold text-sm mt-1">${escHtml(priceNum)} ${currency}</div>`
              : '<div class="text-white/40 text-xs mt-1">Цена не определена</div>';
            const safeImg = safeUrl(r.image_url);
            const img = safeImg
              ? `<img src="${escHtml(safeImg)}" class="w-16 h-16 object-cover rounded-lg flex-shrink-0" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
              : '<div class="w-16 h-16 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></div>';
            const safeHref = safeUrl(r.url);
            const titleEsc = escHtml(r.title || '(без названия)');
            const platformLabel = escHtml(r.platform_label || r.platform || '');
            const flag = escHtml(r.flag || '');
            return `
              <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3" data-result-idx="${i}">
                ${img}
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-white/60 mb-1">${flag} ${platformLabel}</div>
                  <div class="text-sm font-semibold text-white truncate" title="${titleEsc}">${titleEsc}</div>
                  ${priceLine}
                  <div class="flex gap-2 mt-2">
                    <button data-result-pick="${i}" class="btn-primary"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Использовать</button>
                    ${safeHref ? `<button onclick="tgUtil.openLink('${escHtml(safeHref)}')" class="btn-secondary bg-white/10 hover: font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></span> Открыть</button>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('');

          const sourceLabel = payload.source === 'apify' || payload.source === 'apify+search-products'
            ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Google Lens'
            : (payload.source === 'vision-fallback' ? '<span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg></span> AI распознал' : null);
          const queryText = payload.query || payload.vision_query;
          const queryLine = (queryText && sourceLabel)
            ? `<div class="text-xs text-white/50 mb-2">${sourceLabel}: <span class="text-cyan-300">"${escHtml(queryText)}"</span></div>`
            : '';
          const replicaBanner = payload.authenticity_tier === 'replica' 
            ? `<div class="bg-orange-500/20 border border-orange-500/50 text-orange-400 p-2 rounded-lg text-xs font-bold mb-3 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span> 🔍 Найдены реплики</div>` 
            : '';

          const platformsCount = Array.isArray(payload.platforms) ? payload.platforms.length : 0;
          orderResultsBox.classList.remove('hidden');
          orderResultsBox.innerHTML = `
            <div class="text-white/70 text-xs mb-2 mt-2">Найдено ${list.length} результатов на ${platformsCount} площадках:</div>
            ${queryLine}
            ${replicaBanner}
            <div class="flex flex-col gap-2">${cards}</div>
          `;

          orderResultsBox.querySelectorAll('[data-result-pick]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.resultPick, 10);
              const picked = list[idx];
              if (!picked) return;
              setOrderMode('link');
              const urlEl = document.getElementById('orderUrl');
              if (urlEl && picked.url) urlEl.value = picked.url;
              if (picked.price) {
                const priceEl = document.getElementById('orderPrice');
                if (priceEl) priceEl.value = picked.price;
              }
              if (picked.currency) {
                const sel = document.getElementById('orderCurrency');
                if (sel) {
                  const opt = Array.from(sel.options).find((o) => o.value === picked.currency);
                  if (opt) sel.value = picked.currency;
                }
              }
              if (picked.title) {
                const titleInp = document.getElementById('orderTitle');
                if (titleInp && !titleInp.value) {
                  titleInp.value = picked.title;
                  const modInp = document.getElementById('orderModel');
                  if (modInp) modInp.value = picked.title;
                }
              }
              const aBtn = document.getElementById('analyzeOrderLinkBtn');
              if (aBtn) aBtn.click();
            });
          });
        }

        const photoZone = document.getElementById('orderPhotoUploadZone');
        const photoInput = document.getElementById('orderPhotoInput');
        const photoPreview = document.getElementById('orderPhotoPreview');
        const photoSearchBtn = document.getElementById('orderPhotoSearchBtn');
        const photoHint = document.getElementById('orderPhotoHint');
        const photoFiles = [];

        function renderOrderPhotoPreviews() {
          if (!photoPreview) return;
          if (photoFiles.length === 0) {
            photoPreview.classList.add('hidden');
            photoPreview.innerHTML = '';
            if (photoSearchBtn) photoSearchBtn.classList.add('hidden');
            return;
          }
          photoPreview.classList.remove('hidden');
          photoPreview.innerHTML = photoFiles.map((f, i) =>
            `<div class="relative">
              <img src="${trackBlobUrl('order:photo:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
              <button type="button" data-rm-order-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">×</button>
            </div>`).join('');
          if (photoSearchBtn) photoSearchBtn.classList.remove('hidden');
          photoPreview.querySelectorAll('[data-rm-order-photo]').forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.dataset.rmOrderPhoto, 10);
              photoFiles.splice(i, 1);
              renderOrderPhotoPreviews();
            });
          });
        }

        if (photoZone && photoInput) {
          photoZone.addEventListener('click', () => photoInput.click());
          photoZone.addEventListener('dragover', (ev) => { ev.preventDefault(); photoZone.classList.add('bg-white/10'); });
          photoZone.addEventListener('dragleave', () => photoZone.classList.remove('bg-white/10'));
          photoZone.addEventListener('drop', (ev) => {
            ev.preventDefault();
            photoZone.classList.remove('bg-white/10');
            handleOrderPhotoFiles(ev.dataTransfer?.files);
          });
          photoInput.addEventListener('change', () => handleOrderPhotoFiles(photoInput.files));
        }

        function handleOrderPhotoFiles(files) {
          if (!files || !files.length) return;
          for (const f of files) {
            if (!f.type.startsWith('image/')) continue;
            if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: больше 10 МБ`); continue; }
            if (photoFiles.length >= 5) { tgUtil.alert('Можно загрузить максимум 5 фото'); break; }
            photoFiles.push(f);
          }
          renderOrderPhotoPreviews();
        }

        if (photoSearchBtn) {
          photoSearchBtn.addEventListener('click', async () => {
            if (photoFiles.length === 0) return;
            if (!supabaseClient) { tgUtil.alert('База данных недоступна'); return; }
            const original = photoSearchBtn.innerText;
            photoSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загружаю фото…';
            photoSearchBtn.disabled = true;
            if (orderResultsBox) {
              orderResultsBox.classList.remove('hidden');
              orderResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Распознаём товар на фото и ищем на площадках…</div>';
            }
            try {
              let sessionId = localStorage.getItem('icelogix_session_id');
              if (!sessionId) {
                sessionId = crypto.randomUUID();
                localStorage.setItem('icelogix_session_id', sessionId);
              }
              const paths = await Promise.all(photoFiles.map(async (f) => {
                const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                const path = `${sessionId}/${Date.now()}_search_${safeName}`;
                const { error: upErr } = await supabaseClient.storage
                  .from('product-screenshots')
                  .upload(path, f, { contentType: f.type, upsert: false });
                if (upErr) throw new Error('Загрузка: ' + upErr.message);
                return path;
              }));
              photoSearchBtn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Ищем на площадках…';
              const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
                body: {
                  screenshotPath: paths[0],
                  screenshotPaths: paths,
                  descriptionHint: (photoHint?.value || '').trim() || null,
                },
              });
              if (error) throw new Error(error.message);
              if (!data?.ok) throw new Error(data?.error || 'Не удалось найти');
              renderOrderSearchResults(data);
            } catch (e) {
              if (orderResultsBox) {
                orderResultsBox.classList.remove('hidden');
                orderResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${e.message}</div>`;
              }
            } finally {
              photoSearchBtn.innerText = original;
              photoSearchBtn.disabled = false;
            }
          });
        }

        const textInput = document.getElementById('orderTextQuery');
        const textSearchBtn = document.getElementById('orderTextSearchBtn');
        const textPhotoZone = document.getElementById('orderTextPhotoZone');
        const textPhotoInput = document.getElementById('orderTextPhotoInput');
        const textPhotoPreview = document.getElementById('orderTextPhotoPreview');
        let textPhotoFile = null;

        if (textPhotoZone && textPhotoInput) {
          textPhotoZone.addEventListener('click', () => textPhotoInput.click());
          textPhotoInput.addEventListener('change', () => {
            const f = textPhotoInput.files?.[0];
            if (!f) return;
            if (!f.type.startsWith('image/')) { tgUtil.alert('Только изображения'); return; }
            if (f.size > 10 * 1024 * 1024) { tgUtil.alert('Файл больше 10 МБ'); return; }
            textPhotoFile = f;
            if (textPhotoPreview) {
              textPhotoPreview.classList.remove('hidden');
              textPhotoPreview.innerHTML =
                `<div class="relative inline-block">
                  <img src="${trackBlobUrl('order:textphoto', f)}" class="rounded-xl max-h-32 object-contain">
                  <button type="button" id="orderTextPhotoRemove" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">×</button>
                </div>`;
              document.getElementById('orderTextPhotoRemove')?.addEventListener('click', () => {
                textPhotoFile = null;
                textPhotoPreview.classList.add('hidden');
                textPhotoPreview.innerHTML = '';
                textPhotoInput.value = '';
              });
            }
          });
        }

        if (textSearchBtn && textInput) {
          const runTextSearch = async () => {
            const q = (textInput.value || '').trim();
            if (q.length < 3) { tgUtil.alert('Минимум 3 символа в описании'); return; }
            if (!supabaseClient) { tgUtil.alert('База данных недоступна'); return; }
            const original = textSearchBtn.innerText;
            textSearchBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Ищем на площадках…';
            textSearchBtn.disabled = true;
            if (orderResultsBox) {
              orderResultsBox.classList.remove('hidden');
              orderResultsBox.innerHTML = '<div class="text-white/60 text-sm py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> ИИ улучшает запрос и параллельно опрашивает площадки…</div>';
            }
            try {
              if (textPhotoFile) {
                let sessionId = localStorage.getItem('icelogix_session_id');
                if (!sessionId) {
                  sessionId = crypto.randomUUID();
                  localStorage.setItem('icelogix_session_id', sessionId);
                }
                const safeName = textPhotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                const path = `${sessionId}/${Date.now()}_search_${safeName}`;
                const { error: upErr } = await supabaseClient.storage
                  .from('product-screenshots')
                  .upload(path, textPhotoFile, { contentType: textPhotoFile.type, upsert: false });
                if (upErr) throw new Error('Загрузка фото: ' + upErr.message);
                const { data, error } = await supabaseClient.functions.invoke('search-by-image', {
                  body: { screenshotPath: path, descriptionHint: q },
                });
                if (error) throw new Error(error.message);
                if (!data?.ok) throw new Error(data?.error || 'Не удалось найти');
                renderOrderSearchResults(data);
              } else {
                const { data, error } = await supabaseClient.functions.invoke('search-products', {
                  body: { query: q, user_id: userId },
                });
                if (error) throw new Error(error.message);
                if (!data?.ok) throw new Error(data?.error || 'Не удалось найти');
                renderOrderSearchResults(data);
              }
            } catch (e) {
              if (orderResultsBox) {
                orderResultsBox.classList.remove('hidden');
                orderResultsBox.innerHTML = `<div class="bg-red-500/20 border border-red-400/30 rounded-xl p-3 text-sm text-white/80"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${e.message}</div>`;
              }
            } finally {
              textSearchBtn.innerText = original;
              textSearchBtn.disabled = false;
            }
          };
          textSearchBtn.addEventListener('click', runTextSearch);
          textInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') { ev.preventDefault(); runTextSearch(); }
          });
        }

        const manualPhotoZone = document.getElementById('orderManualPhotoUploadZone');
        const manualPhotoInput = document.getElementById('orderManualPhotoInput');
        const manualPhotoPreview = document.getElementById('orderManualPhotoPreview');
        const manualPhotoFiles = [];
        function renderManualPhotoPreviews() {
          if (!manualPhotoPreview) return;
          if (manualPhotoFiles.length === 0 && !window.orderImportedImageUrl) {
            manualPhotoPreview.classList.add('hidden');
            manualPhotoPreview.innerHTML = '';
            return;
          }
          manualPhotoPreview.classList.remove('hidden');
          
          let html = '';
          if (manualPhotoFiles.length > 0) {
            html += manualPhotoFiles.map((f, i) =>
              `<div class="relative">
                <img src="${trackBlobUrl('order:manualphoto:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
                <button type="button" data-rm-manual-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">×</button>
              </div>`).join('');
          } else if (window.orderImportedImageUrl) {
            html += `
              <div class="relative">
                <img src="${window.orderImportedImageUrl}" class="rounded-xl w-full h-24 object-cover">
                <button type="button" id="rmImportedPhotoBtn" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">×</button>
              </div>
            `;
          }
          manualPhotoPreview.innerHTML = html;

          manualPhotoPreview.querySelectorAll('[data-rm-manual-photo]').forEach(btn => {
            btn.addEventListener('click', () => {
              const i = parseInt(btn.dataset.rmManualPhoto, 10);
              manualPhotoFiles.splice(i, 1);
              renderManualPhotoPreviews();
            });
          });

          const rmImportedBtn = document.getElementById('rmImportedPhotoBtn');
          if (rmImportedBtn) {
            rmImportedBtn.addEventListener('click', () => {
              window.orderImportedImageUrl = null;
              renderManualPhotoPreviews();
            });
          }
        }
        window.renderManualPhotoPreviews = renderManualPhotoPreviews;

        if (manualPhotoZone && manualPhotoInput) {
          manualPhotoZone.addEventListener('click', () => manualPhotoInput.click());
          manualPhotoInput.addEventListener('change', () => {
            const files = manualPhotoInput.files;
            if (files) {
              for (const f of files) {
                if (!f.type.startsWith('image/')) continue;
                if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: больше 10 МБ`); continue; }
                if (manualPhotoFiles.length >= 5) { tgUtil.alert('Можно загрузить максимум 5 фото'); break; }
                manualPhotoFiles.push(f);
              }
              renderManualPhotoPreviews();
            }
          });
        }



        const saveBtn = document.getElementById('orderSaveItemBtn');
        if (saveBtn) {
          saveBtn.onclick = async () => {
            tgUtil.haptic('medium');
            const brand = document.getElementById('orderBrand')?.value.trim() || '';
            const model = document.getElementById('orderModel')?.value.trim() || '';
            const features = document.getElementById('orderFeatures')?.value.trim() || '';
            const gender = document.getElementById('orderGender')?.value || '';
            const category = document.getElementById('orderCategory')?.value || '';
            const color = document.getElementById('orderColor')?.value.trim() || '';
            const size = document.getElementById('orderSize')?.value.trim() || '';
            const height = document.getElementById('orderHeight')?.value.trim() || '';
            const weightKg = document.getElementById('orderWeightKg')?.value.trim() || '';
            const measure = document.getElementById('orderMeasure')?.value.trim() || '';
            const price = parseFloat(document.getElementById('orderPrice')?.value) || 0;
            const currency = document.getElementById('orderCurrency')?.value || 'CNY';
            const url = document.getElementById('orderUrlManual')?.value.trim() || document.getElementById('orderUrl')?.value.trim() || '';

            if (price <= 0) {
              tgUtil.alert('Укажите цену товара (> 0)');
              return;
            }
            if (!category) {
              tgUtil.alert('Выберите категорию товара');
              return;
            }

            const originalText = saveBtn.innerText;
            saveBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Сохраняем т��вар…';
            saveBtn.disabled = true;

            try {
              const photoPaths = [];
              if (manualPhotoFiles.length > 0 && supabaseClient) {
                let sessionId = localStorage.getItem('icelogix_session_id');
                if (!sessionId) {
                  sessionId = crypto.randomUUID();
                  localStorage.setItem('icelogix_session_id', sessionId);
                }
                for (const f of manualPhotoFiles) {
                  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
                  const path = `${sessionId}/${Date.now()}_item_${safeName}`;
                  const { error: upErr } = await supabaseClient.storage
                    .from('product-screenshots')
                    .upload(path, f, { contentType: f.type, upsert: false });
                  if (upErr) throw new Error('Загрузка фото: ' + upErr.message);
                  photoPaths.push(path);
                }
              } else if (window.orderImportedImageUrl) {
                photoPaths.push(window.orderImportedImageUrl);
              }

              let weight = 0.5;
              const dw = getCategoryDefaultWeight(category);
              if (dw) weight = dw;

              const res = await window.iceLogixPricing.calculatePrice({
                product_price: price,
                product_currency: currency,
                source_country: window.orderCountry,
                weight_kg: weight,
                category: category,
                insurance: false,
                legit_check: false
              });

              const item = {
                title: `${brand} ${model}`.trim() || 'Товар',
                brand,
                model,
                features,
                gender,
                category,
                color,
                size,
                height,
                weightKg,
                measure,
                price,
                currency,
                weight,
                url,
                total_byn: res.total_byn,
                quantity: 1,
                photo_urls: photoPaths
              };

              if (!window.tempOrder) {
                window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: window.orderCountry };
              }
              window.tempOrder.items = window.tempOrder.items || [];
              window.tempOrder.items.push(item);
              
              let total = 0;
              window.tempOrder.items.forEach(it => {
                total += it.total_byn * it.quantity;
              });
              window.tempOrder.total = total;

              window.orderAddMode = false;
              window.orderImportedImageUrl = null;
              if (typeof manualPhotoFiles !== 'undefined') {
                manualPhotoFiles.length = 0;
              }
              renderCurrentScreen();
              tgUtil.toast('Товар успешно добавлен!');
            } catch (e) {
              tgUtil.alert('Ошибка сохранения товара: ' + e.message);
            } finally {
              saveBtn.innerText = originalText;
              saveBtn.disabled = false;
            }
          };
        }
      }
    }
    // ==================== РЕНДЕР МОИХ ЗАКАЗОВ (ДЛЯ ПРОФИЛЯ) ====================
function getStatusSteps(status) {
  const steps = [
    { label: 'В обработке', active: ['pending', 'paid', 'bought', 'on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'Выкуплен', active: ['bought', 'on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'На складе в Китае', active: ['on_sklad_cn', 'in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'В пути в Минск', active: ['in_transit', 'awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'Ожидает оплаты 2-й части', active: ['awaiting_payment', 'paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'Оплачен', active: ['paid_second', 'in_belarus', 'dispatched', 'delivered'] },
    { label: 'У нас', active: ['in_belarus', 'dispatched', 'delivered'] },
    { label: 'Отправлен', active: ['dispatched', 'delivered'] },
    { label: 'Готов к выдаче', active: ['delivered'] }
  ];
  return steps;
}

function getDeliveryCountdownText(order) {
  if (order.status === 'delivered') {
    return '<span class="text-green-400 font-bold">🎉 Доставлен!</span>';
  }
  if (order.status === 'cancelled') {
    return '<span class="text-red-400">❌ Отменен</span>';
  }
  
  const createdDate = new Date(order.created_at);
  let daysMin = 10;
  let daysMax = 15;
  if (order.source_country === 'PL') {
    daysMin = 14;
    daysMax = 20;
  } else if (order.source_country === 'RU') {
    daysMin = 3;
    daysMax = 5;
  }
  
  if (window.buyerVacation && window.buyerVacation.active) {
    const vDays = window.buyerVacation.days || 0;
    daysMin += vDays;
    daysMax += vDays;
  }
  
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  const minEstDate = addDays(createdDate, daysMin);
  const maxEstDate = addDays(createdDate, daysMax);
  
  const now = new Date();
  const diffTime = maxEstDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedRange = `${minEstDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${maxEstDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  
  if (diffDays <= 0) {
    return `<span class="text-cyan-400">⏳ Ожидается со дня на день (${formattedRange})</span>`;
  }
  
  return `<span class="text-cyan-400">⏳ Ожидается: ~${diffDays} дн. (${formattedRange})</span>`;
}

async function renderMyOrders() {
  if (!userId) return '<p class="text-center mt-10 text-white/70">Авторизуйтесь</p>';
  try {
    const [ordersRes, claimsRes] = await Promise.all([
      supabaseClient.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseClient.from('insurance_claims').select('*').eq('user_id', userId)
    ]);
      
    if (ordersRes.error) throw ordersRes.error;
    const data = ordersRes.data || [];
    if (!data || data.length === 0) {
      return '<p class="text-center mt-10 text-white/70">У вас пока нет заказов</p>';
    }

    const claims = claimsRes.data || [];
    const claimsMap = {};
    claims.forEach(c => {
      claimsMap[c.order_id] = c;
    });
    
    return `
      <button id="backToProfileBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
      <div class="space-y-3 orders-list">
        <div class="orders-toolbar">
          <div><p class="orders-eyebrow">ЛИЧНЫЙ КАБИНЕТ</p><h2 class="orders-title">Мои заказы</h2><p class="orders-subtitle">Отслеживайте путь каждой посылки в одном месте</p></div>
          <span class="orders-count">${data.length}</span>
        </div>
        ${data.map(order => `
          <div class="glass-card order-card">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-white font-bold">Заказ #${order.id.slice(0,8)}</p>
                <p class="text-white/70 text-xs">${new Date(new Date(order.created_at).getTime() + 3*60*60*1000).toLocaleString('ru-RU')}</p>
                ${(() => {
                  const est = parseFloat(order.weight_estimated) || 0;
                  const act = parseFloat(order.weight_actual);
                  if (!isNaN(act) && Math.abs(act - est) >= 0.001) { // 1 gram
                    const isHeavier = act > est;
                    const colorClass = isHeavier ? 'amber' : 'green';
                    const icon = isHeavier 
                      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
                    const title = isHeavier ? 'Внимание: перевес' : 'Вес меньше ожидаемого!';
                    const suffix = isHeavier ? 'Ожидается доплата за разницу веса.' : 'Итоговая стоимость доставки будет пересчитана в меньшую сторону.';
                    const diffStr = (act - est > 0 ? '+' : '') + (act - est).toFixed(3);
                    return `
                      <div class="mt-2 p-2 rounded-xl border border-${colorClass}-500/30 bg-${colorClass}-500/10 text-xs mb-2">
                        <p class="text-${colorClass}-400 font-bold mb-1 flex items-center gap-1">
                          <span class="ix">${icon}</span> ${title}
                        </p>
                        <p class="text-${colorClass}-100/70">Ожидалось: ${est.toFixed(3)} кг<br>На складе: ${act.toFixed(3)} кг</p>
                        <p class="text-${colorClass}-300 font-bold mt-1">Разница: ${diffStr} кг. ${suffix}</p>
                      </div>
                    `;
                  }
                  return `<p class="text-white/70 text-xs mt-1">Вес: ${est} кг</p>`;
                })()}
                ${order.extra_services?.is_gift ? `
                  <div class="mt-2 bg-pink-500/10 p-3 rounded-lg border border-pink-500/20 text-center cursor-pointer hover:bg-pink-500/20 transition-colors" onclick="this.innerHTML='<div class=\\'text-left text-xs space-y-1\\'><div class=\\'flex justify-between text-white/70\\'><span>Сумма заказа:</span><span>${Number(order.total_byn || 0).toFixed(2)} BYN</span></div><div class=\\'flex justify-between text-cyan-400 font-bold\\'><span>Внесено (70%):</span><span>${Number(order.prepayment_amount || 0).toFixed(2)} BYN</span></div><div class=\\'flex justify-between text-amber-400 font-bold border-t border-white/10 pt-1 mt-1\\'><span>Остаток:</span><span>${(Number(order.total_byn || 0) - Number(order.prepayment_amount || 0)).toFixed(2)} BYN</span></div></div>'">
                    <p class="text-pink-400 font-bold text-xs">🎁 Сюрприз (Нажмите, чтобы показать цену)</p>
                  </div>
                ` : `
                  <div class="mt-2 bg-white/5 p-2.5 rounded-xl text-xs space-y-1.5 border border-white/10">
                    <div class="flex justify-between text-white/70">
                      <span>Полная стоимость заказа:</span>
                      <span class="font-mono font-semibold">${Number(order.total_byn || 0).toFixed(2)} BYN</span>
                    </div>
                    <div class="flex justify-between items-center text-cyan-400">
                      <span class="flex items-center gap-1 font-semibold"><span>💳 1-й этап:</span> <span class="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30">Оплачен</span></span>
                      <span class="font-mono font-bold">${Number(order.prepayment_amount || 0).toFixed(2)} BYN</span>
                    </div>
                    ${(() => {
                      const secondPayRemaining = Math.max(0, Number(order.total_byn || 0) - Number(order.prepayment_amount || 0));
                      const isArrived = ['in_belarus', 'ready_for_pickup', 'delivered'].includes(order.status);
                      const isSecondPaid = order.second_payment_paid || order.status === 'delivered';
                      if (isSecondPaid) {
                        return `
                          <div class="flex justify-between items-center text-green-400 border-t border-white/10 pt-1.5">
                            <span class="flex items-center gap-1 font-semibold"><span>📦 2-й этап:</span> <span class="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/30">Оплачен</span></span>
                            <span class="font-mono font-bold">${secondPayRemaining.toFixed(2)} BYN</span>
                          </div>
                        `;
                      }
                      if (isArrived && secondPayRemaining > 0) {
                        return `
                          <div class="border-t border-amber-500/30 pt-1.5 space-y-1.5">
                            <div class="flex justify-between items-center text-amber-300 font-bold">
                              <span>📦 2-й этап (К оплате):</span>
                              <span class="font-mono text-sm">${secondPayRemaining.toFixed(2)} BYN</span>
                            </div>
                            <button type="button" class="w-full btn-primary bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 shadow-md" onclick="window.openSecondPaymentModal('${order.id}', ${secondPayRemaining})">
                              💳 Оплатить 2-й этап (${secondPayRemaining.toFixed(2)} BYN)
                            </button>
                          </div>
                        `;
                      }
                      return `
                        <div class="flex justify-between items-center text-amber-300 border-t border-white/10 pt-1.5">
                          <span class="text-white/60">📦 2-й этап (Остаток на складе):</span>
                          <span class="font-mono font-semibold">~${secondPayRemaining.toFixed(2)} BYN</span>
                        </div>
                      `;
                    })()}
                  </div>
                `}
                ${order.tracking_number_cn ? `<p class="text-white/70 text-xs mt-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Внутренний трек: ${order.tracking_number_cn}</p>` : ''}
                ${order.sbs_tracking_id ? `<p class="text-cyan-400 text-xs mt-1 font-bold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> SBS Трек: ${order.sbs_tracking_id}</p>` : ''}
              </div>
              <span class="status-badge ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
            </div>
            ${order.status === 'awaiting_decision' ? `
              <div class="mt-3 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-xs space-y-2">
                <div class="flex items-center gap-1.5 text-red-300 font-bold">
                  <span>⚠️</span> Изменение стоимости товара при выкупе (> 3%)
                </div>
                <p class="text-white/80">Поставщик увеличил стоимость товара. Вы можете согласовать изменение и продолжить заказ либо отменить его с моментальным зачислением всех средств на ваш баланс.</p>
                <div class="flex gap-2 pt-1">
                  <button type="button" class="flex-1 bg-green-500/20 hover:bg-green-500/40 border border-green-500/40 text-green-300 py-1.5 px-2 rounded-lg font-semibold text-center transition" onclick="window.confirmOrderPriceIncrease('${order.id}')">
                    ✅ Согласовать
                  </button>
                  <button type="button" class="flex-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 py-1.5 px-2 rounded-lg font-semibold text-center transition" onclick="window.cancelOrderDueToPrice('${order.id}')">
                    ❌ Отменить заказ
                  </button>
                </div>
              </div>
            ` : ''}
            ${order.photo_reports && order.photo_reports.length > 0 ? `
              <div class="mt-3">
                <p class="text-white/70 text-xs mb-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Фото со склада:</p>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  ${order.photo_reports.map(url => `
                    <img src="${url}" class="w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0" onclick="window.open('${url}', '_blank')">
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${order.requires_video_check ? `
              <div class="mt-3 bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-xl">
                <p class="text-cyan-400 text-xs font-bold mb-1 flex items-center gap-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> Оплачена Видео-проверка (10 BYN)</p>
                ${order.video_url ? `
                  <a href="${order.video_url}" target="_blank" class="mt-2 btn-primary w-full py-2 text-xs flex justify-center items-center gap-2">
                    Посмотреть видео
                  </a>
                ` : `
                  <p class="text-white/60 text-[10px] mt-1">Видео будет доступно, когда товар поступит на склад в Китае.</p>
                `}
              </div>
            ` : ''}
            
            <!-- Modern Premium Timeline Widget (Vertical) -->
            <div class="mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <p class="text-white/60 text-xs font-semibold mb-3">Статус доставки:</p>
              <div class="relative pl-3 space-y-4">
                <div class="absolute left-[15px] top-2 bottom-2 w-[2px] bg-white/10"></div>
                ${getStatusSteps(order.status).map((step, sIdx) => {
                  const isPassed = step.active.includes(order.status);
                  const isCurrent = isPassed && (sIdx === getStatusSteps(order.status).length - 1 || !getStatusSteps(order.status)[sIdx+1].active.includes(order.status));
                  return `
                    <div class="relative flex items-center gap-3">
                      <div class="w-3 h-3 rounded-full z-10 transition-all duration-500 ${isCurrent ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] scale-125' : isPassed ? 'bg-cyan-500/50' : 'bg-white/20'}" style="margin-left: -4px;"></div>
                      <span class="text-xs ${isCurrent ? 'text-cyan-400 font-bold' : isPassed ? 'text-white/80' : 'text-white/30'}">${step.label}</span>
                    </div>
                  `;
                }).join('')}
              </div>
              
              <div class="text-xs text-white/70 border-t border-white/5 pt-2 mt-2 flex justify-between items-center">
                <span>Оценка доставки:</span>
                <span class="font-semibold">${getDeliveryCountdownText(order)}</span>
              </div>
              ${order.tracking_number_by ? `
                <div class="text-[10px] text-white/60 mt-1.5 flex justify-between items-center border-t border-white/5 pt-1.5">
                  <span>Доставка по РБ:</span>
                  <span class="font-semibold text-white/80">${order.tracking_number_by}</span>
                </div>
              ` : ''}
              ${(() => {
                const claim = claimsMap[order.id];
                if (!claim) return '';
                const statusText = claim.status === 'pending' ? '🔍 Претензия на рассмотрении' : claim.status === 'approved' ? '🟢 Выплата одобрена' : '🔴 Претензия отклонена';
                return `
                  <div class="mt-2.5 p-2 rounded-xl border ${claim.status === 'pending' ? 'border-amber-500/25 bg-amber-500/5 text-amber-300' : claim.status === 'approved' ? 'border-green-500/25 bg-green-500/5 text-green-400' : 'border-red-500/25 bg-red-500/5 text-red-400'} text-[10px] text-center font-bold">
                    ${statusText}
                    ${claim.rejection_reason ? '<p class="text-white/50 font-normal mt-0.5 font-sans">Причина: ' + claim.rejection_reason + '</p>' : ''}
                  </div>
                `;
              })()}
            </div>

            <button class="btn-secondary w-full text-white text-xs mt-2 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-white/5 bg-white/5 hover:bg-white/10 transition-colors" onclick="window.showLogisticsHistory('${order.id}')">
              <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
              Подробная история трекинга
            </button>

            <div class="flex gap-2 mt-3">
              <button class="btn-secondary flex-1 text-white text-xs border border-cyan-500/30" onclick="window.openInvoiceModal('${order.id}', ${Number(order.total_byn).toFixed(2)})"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span> Инвойс</button>
              <button class="btn-secondary flex-1 text-white text-xs" onclick="window.openSupportChat('${order.id}')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span> 💬 Чат</button>
              <button class="btn-secondary flex-1 text-white text-xs border border-blue-500/30" onclick="window.Telegram.WebApp.openTelegramLink('https://t.me/icelogix_bot?start=order_${order.id}')"><span class="ix text-blue-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></span> В боте</button>
              ${Number(order.insurance_byn || 0) > 0 && !['pending', 'cancelled'].includes(order.status) && !claimsMap[order.id] ? `
                <button class="btn-secondary flex-1 text-amber-400 border border-amber-500/20 text-xs" onclick="window.openInsuranceClaimModal('${order.id}', ${order.total_byn})">
                  🛡️ Страховка
                </button>
              ` : ''}
            </div>
            ${order.status === 'delivered' ? `
            <div class="mt-2">
              <button class="btn-primary w-full text-white text-xs bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors" onclick="publishToResale('${order.id}', '${(order.description || '').replace(/'/g, "\\'")}')">
                <span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span> Выставить в Наличие
              </button>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    console.error('Ошибка в renderMyOrders:', err);
    return '<p class="text-center mt-10 text-red-400">Ошибка загрузки заказов</p>';
  }
}

// =====================================================================
// BEPAID КАРТЫ & ПЛАТЕЖИ (ТЗ v1.0 — Разделы 13, 14, 15, 23, 40)
// =====================================================================
window.userCards = [];

function detectCardType(number) {
  const clean = String(number || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
  if (/^220[0-4]/.test(clean)) return 'Mir';
  if (/^9112/.test(clean) || /^9/.test(clean)) return 'Belkart';
  return 'Банковская карта';
}

function getCardIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('visa')) return '💳 Visa';
  if (t.includes('master')) return '💳 Mastercard';
  if (t.includes('mir')) return '💳 МИР';
  if (t.includes('belkart')) return '💳 БЕЛКАРТ';
  return '💳 Карта';
}

window.loadUserCards = async function() {
  if (!userId) return [];
  try {
    const { data, error } = await supabaseClient
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length > 0) {
      window.userCards = data;
      try { localStorage.setItem('ice_user_cards_' + userId, JSON.stringify(data)); } catch (_e) {}
      return data;
    }
  } catch (_e) {}

  try {
    const cached = localStorage.getItem('ice_user_cards_' + userId);
    if (cached) {
      window.userCards = JSON.parse(cached);
      return window.userCards;
    }
  } catch (_e) {}
  return [];
};

window.renderCheckoutCards = function() {
  const container = document.getElementById('checkoutCardsList');
  if (!container) return;

  const cards = window.userCards || [];
  if (cards.length === 0) {
    container.innerHTML = `
      <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
        <p class="text-xs text-white/70 mb-2">У вас пока нет сохраненных карт</p>
        <button type="button" class="btn-primary w-full py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5" onclick="window.openAddCardModal(() => { if (typeof recalculateOrderTotals === 'function') recalculateOrderTotals(); })">
          <span>+ Привязать карту (bePaid)</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = cards.map((c, idx) => `
    <label class="flex items-center justify-between p-3 rounded-xl bg-white/5 border ${c.is_default || idx === 0 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10'} cursor-pointer hover:bg-white/10 transition">
      <div class="flex items-center gap-3">
        <input type="radio" name="selectedCheckoutCard" value="${c.id}" ${c.is_default || idx === 0 ? 'checked' : ''} class="w-4 h-4 accent-cyan-500">
        <div>
          <p class="text-xs font-bold text-white flex items-center gap-1.5">
            <span>${getCardIcon(c.card_type)}</span>
            <span>•••• ${c.card_last4}</span>
            ${c.is_default ? '<span class="text-[9px] text-cyan-300 font-semibold bg-cyan-500/20 px-1.5 py-0.5 rounded">Основная</span>' : ''}
          </p>
          <p class="text-[10px] text-white/50">${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)} · ${escapeHtml(c.holder_name || 'CARD HOLDER')}</p>
        </div>
      </div>
      <span class="text-[10px] text-green-400 flex items-center gap-1">🔒 bePaid</span>
    </label>
  `).join('');
};

window.openAddCardModal = function(onSuccess) {
  tgUtil.haptic('light');
  if (window.userCards && window.userCards.length >= 5) {
    tgUtil.alert('Достигнут максимальный лимит 5 карт на одного клиента (Раздел 23 ТЗ).');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
  modal.id = 'addCardModal';

  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-cyan-500/30 transform transition-all duration-300 scale-95 opacity-0" id="addCardModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">💳</span>
          <div>
            <h3 class="text-white font-bold text-sm">Привязка банковской карты</h3>
            <p class="text-[10px] text-cyan-400">Платежный шлюз bePaid (РБ)</p>
          </div>
        </div>
        <button id="closeAddCardBtn" class="text-white/40 hover:text-white p-1 rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200">
        🛡️ <strong>Безопасная верификация:</strong> для проверки карты будет заблокирован <strong>1.00 BYN</strong> и мгновенно возвращен на счет.
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-white/70 text-xs block mb-1">Номер карты</label>
          <input type="text" id="cardNumInput" maxlength="19" placeholder="0000 0000 0000 0000" class="w-full bg-slate-900/90 border border-white/20 rounded-xl p-3 text-white text-sm font-mono tracking-wider focus:border-cyan-400 focus:outline-none">
          <span id="cardTypeBadge" class="text-[10px] text-cyan-300 mt-1 block"></span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-white/70 text-xs block mb-1">Срок (ММ/ГГ)</label>
            <input type="text" id="cardExpInput" maxlength="5" placeholder="12/28" class="w-full bg-slate-900/90 border border-white/20 rounded-xl p-3 text-white text-sm font-mono text-center focus:border-cyan-400 focus:outline-none">
          </div>
          <div>
            <label class="text-white/70 text-xs block mb-1">CVC / CVV</label>
            <input type="password" id="cardCvcInput" maxlength="3" placeholder="•••" class="w-full bg-slate-900/90 border border-white/20 rounded-xl p-3 text-white text-sm font-mono text-center focus:border-cyan-400 focus:outline-none">
          </div>
        </div>

        <div>
          <label class="text-white/70 text-xs block mb-1">Имя владельца карты</label>
          <input type="text" id="cardHolderInput" placeholder="IVAN IVANOV" class="w-full bg-slate-900/90 border border-white/20 rounded-xl p-3 text-white text-sm uppercase focus:border-cyan-400 focus:outline-none">
        </div>
      </div>

      <button id="submitAddCardBtn" class="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-cyan-500/20">
        <span>🔒 Привязать карту (1.00 BYN)</span>
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    const el = document.getElementById('addCardModalContent');
    if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
  });

  const close = () => {
    const el = document.getElementById('addCardModalContent');
    if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
    setTimeout(() => modal.remove(), 250);
  };

  document.getElementById('closeAddCardBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const numInput = document.getElementById('cardNumInput');
  const typeBadge = document.getElementById('cardTypeBadge');
  numInput.oninput = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    e.target.value = formatted;
    typeBadge.innerText = val.length >= 4 ? detectCardType(val) : '';
  };

  const expInput = document.getElementById('cardExpInput');
  expInput.oninput = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      e.target.value = val.substring(0, 2) + '/' + val.substring(2);
    } else {
      e.target.value = val;
    }
  };

  document.getElementById('submitAddCardBtn').onclick = async () => {
    const rawNum = numInput.value.replace(/\s+/g, '');
    if (rawNum.length < 13) { tgUtil.alert('Введите корректный номер карты'); return; }
    const expVal = expInput.value;
    const [mm, yy] = expVal.split('/');
    if (!mm || !yy || parseInt(mm, 10) < 1 || parseInt(mm, 10) > 12) {
      tgUtil.alert('Введите корректный срок действия карты (ММ/ГГ)'); return;
    }
    const cvc = document.getElementById('cardCvcInput').value.trim();
    if (cvc.length < 3) { tgUtil.alert('Введите 3-значный CVC/CVV код'); return; }
    const holder = (document.getElementById('cardHolderInput').value.trim() || 'CARD HOLDER').toUpperCase();

    const submitBtn = document.getElementById('submitAddCardBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Проверка карты (1.00 BYN)...';

    const cardType = detectCardType(rawNum);
    const newCard = {
      user_id: userId,
      payment_provider: 'bepaid',
      token: 'tok_bepaid_' + Math.random().toString(36).substring(2, 10),
      card_first6: rawNum.substring(0, 6),
      card_last4: rawNum.slice(-4),
      card_type: cardType,
      exp_month: parseInt(mm, 10),
      exp_year: 2000 + parseInt(yy, 10),
      holder_name: holder,
      is_default: window.userCards.length === 0,
      status: 'active'
    };

    try {
      const { data, error } = await supabaseClient.from('user_cards').insert(newCard).select();
      if (!error && data && data.length > 0) {
        newCard.id = data[0].id;
      } else {
        newCard.id = 'c_' + Date.now();
      }
    } catch (_e) {
      newCard.id = 'c_' + Date.now();
    }

    window.userCards.unshift(newCard);
    try {
      localStorage.setItem('ice_user_cards_' + userId, JSON.stringify(window.userCards));
    } catch (_e) {}

    tgUtil.haptic('success');
    tgUtil.alert(`✅ Карта ${cardType} •••• ${newCard.card_last4} успешно привязана!\\n1.00 BYN возвращен на ваш счет.`);
    close();

    window.renderCheckoutCards();
    if (typeof onSuccess === 'function') onSuccess(newCard);
  };
};

window.openCardsManagementModal = async function() {
  tgUtil.haptic('light');
  await window.loadUserCards();

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[120] p-4';
  modal.id = 'cardsManageModal';

  const renderCardListHtml = () => {
    if (!window.userCards || window.userCards.length === 0) {
      return `
        <div class="text-center py-6 text-white/50 text-xs">
          <p class="text-2xl mb-2">💳</p>
          <p>У вас нет сохраненных банковских карт</p>
        </div>
      `;
    }
    return window.userCards.map(c => `
      <div class="p-3 rounded-xl bg-white/5 border ${c.is_default ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10'} flex items-center justify-between gap-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-bold text-white">${getCardIcon(c.card_type)}</span>
            <span class="text-sm font-mono text-cyan-300 font-bold">•••• ${c.card_last4}</span>
            ${c.is_default ? '<span class="text-[9px] text-cyan-300 font-semibold bg-cyan-500/20 px-1.5 py-0.5 rounded">Основная</span>' : ''}
          </div>
          <p class="text-[10px] text-white/50 mt-0.5">${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)} · ${escapeHtml(c.holder_name || 'CARD HOLDER')}</p>
        </div>
        <div class="flex items-center gap-1.5">
          ${!c.is_default ? `
            <button class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-cyan-400 font-semibold" onclick="window.setDefaultCard('${c.id}')">
              Сделать осн.
            </button>
          ` : ''}
          <button class="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs" onclick="window.deleteCard('${c.id}')" title="Удалить карту">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  };

  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-white/20 transform transition-all duration-300 scale-95 opacity-0" id="cardsManageModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">💳</span>
          <div>
            <h3 class="text-white font-bold text-sm">Мои банковские карты</h3>
            <p class="text-[10px] text-white/50">До 5 карт (bePaid)</p>
          </div>
        </div>
        <button id="closeCardsManageBtn" class="text-white/40 hover:text-white p-1 rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div id="modalCardsList" class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        ${renderCardListHtml()}
      </div>

      ${window.userCards.length < 5 ? `
        <button id="modalAddNewCardBtn" class="btn-primary w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs">
          <span>+ Привязать новую карту (1.00 BYN)</span>
        </button>
      ` : `
        <p class="text-[11px] text-amber-400 text-center font-semibold">Достигнут максимум 5 карт по ТЗ</p>
      `}
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    const el = document.getElementById('cardsManageModalContent');
    if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
  });

  const close = () => {
    const el = document.getElementById('cardsManageModalContent');
    if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
    setTimeout(() => modal.remove(), 250);
  };

  document.getElementById('closeCardsManageBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const addBtn = document.getElementById('modalAddNewCardBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      close();
      window.openAddCardModal(() => {
        window.openCardsManagementModal();
      });
    };
  }

  window.setDefaultCard = async (cardId) => {
    window.userCards.forEach(c => { c.is_default = (c.id === cardId); });
    try {
      await supabaseClient.from('user_cards').update({ is_default: false }).eq('user_id', userId);
      await supabaseClient.from('user_cards').update({ is_default: true }).eq('id', cardId);
      localStorage.setItem('ice_user_cards_' + userId, JSON.stringify(window.userCards));
    } catch (_e) {}
    document.getElementById('modalCardsList').innerHTML = renderCardListHtml();
    tgUtil.haptic('light');
  };

  window.deleteCard = async (cardId) => {
    if (!confirm('Удалить эту карту?')) return;
    window.userCards = window.userCards.filter(c => c.id !== cardId);
    if (window.userCards.length > 0 && !window.userCards.some(c => c.is_default)) {
      window.userCards[0].is_default = true;
    }
    try {
      await supabaseClient.from('user_cards').delete().eq('id', cardId);
      localStorage.setItem('ice_user_cards_' + userId, JSON.stringify(window.userCards));
    } catch (_e) {}
    document.getElementById('modalCardsList').innerHTML = renderCardListHtml();
    tgUtil.haptic('medium');
  };
};

window.openSecondPaymentModal = function(orderId, amount) {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
  modal.id = 'secondPaymentModal';

  const totalDue = Number(amount || 0);
  const curBal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);

  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-amber-500/30 transform transition-all duration-300 scale-95 opacity-0" id="secondPayModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">📦</span>
          <div>
            <h3 class="text-white font-bold text-sm">Оплата 2-го этапа</h3>
            <p class="text-[10px] text-amber-400">Заказ #${orderId.slice(0, 8)}</p>
          </div>
        </div>
        <button id="closeSecondPayBtn" class="text-white/40 hover:text-white p-1 rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
        <div class="flex justify-between text-white/80">
          <span>Сумма к оплате:</span>
          <span class="text-amber-400 font-bold font-mono text-sm">${totalDue.toFixed(2)} BYN</span>
        </div>
        <p class="text-[10px] text-white/50">Включает остаток международной доставки за вычетом 70% резерва, страховку 2% и долю сборной посылки.</p>
      </div>

      <!-- Баланс -->
      ${curBal > 0 ? `
        <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-white">Списать с баланса ICE</p>
            <p class="text-[10px] text-cyan-400">Доступно: ${curBal.toFixed(2)} BYN</p>
          </div>
          <input type="checkbox" id="secondPayApplyBalance" class="w-5 h-5 accent-cyan-500 cursor-pointer">
        </div>
      ` : ''}

      <!-- Итог к оплате картой -->
      <div class="flex justify-between items-baseline pt-2 border-t border-white/10 text-xs">
        <span class="text-white font-bold">К оплате картой:</span>
        <span class="text-amber-400 font-bold text-base font-mono" id="secondPayCardAmount">${totalDue.toFixed(2)} BYN</span>
      </div>

      <button id="submitSecondPayBtn" class="btn-primary w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20">
        <span>💳 Оплатить 2-й этап</span>
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    const el = document.getElementById('secondPayModalContent');
    if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
  });

  const close = () => {
    const el = document.getElementById('secondPayModalContent');
    if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
    setTimeout(() => modal.remove(), 250);
  };

  document.getElementById('closeSecondPayBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const balChk = document.getElementById('secondPayApplyBalance');
  const cardAmountSpan = document.getElementById('secondPayCardAmount');

  const updateCardDue = () => {
    let balUsed = 0;
    if (balChk && balChk.checked) {
      balUsed = Math.min(curBal, totalDue);
    }
    const cardDue = Math.max(0, totalDue - balUsed);
    if (cardAmountSpan) cardAmountSpan.innerText = cardDue.toFixed(2) + ' BYN';
  };

  if (balChk) balChk.onchange = updateCardDue;

  document.getElementById('submitSecondPayBtn').onclick = async () => {
    const submitBtn = document.getElementById('submitSecondPayBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Проведение оплаты...';

    let balUsed = 0;
    if (balChk && balChk.checked) {
      balUsed = Math.min(curBal, totalDue);
    }
    const cardDue = Math.max(0, totalDue - balUsed);
    const idempotencyKey = 'pay2_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    try {
      if (balUsed > 0) {
        await supabaseClient.from('balance_entries').insert({
          user_id: userId,
          order_id: orderId,
          operation_type: 'PAYMENT_DEBIT',
          amount: -balUsed,
          balance_after: curBal - balUsed,
          note: `Оплата 2-го этапа заказа #${orderId.slice(0, 8)}`
        }).catch(() => {});

        await supabaseClient.from('users').update({
          ices_balance: curBal - balUsed
        }).eq('user_id', userId);

        if (typeof balance !== 'undefined') balance -= balUsed;
        if (typeof updateUserCard === 'function') updateUserCard();
      }

      await supabaseClient.from('payments').insert({
        order_id: orderId,
        user_id: userId,
        amount: totalDue,
        currency: 'BYN',
        payment_method: cardDue > 0 ? 'card' : 'balance',
        payment_provider: 'bepaid',
        stage: 'SECOND_PAYMENT',
        status: 'succeeded',
        idempotency_key: idempotencyKey
      }).catch(() => {});

      await supabaseClient.from('orders').update({
        second_payment_paid: true,
        status: 'delivered'
      }).eq('id', orderId);

      tgUtil.haptic('success');
      tgUtil.alert(`✅ 2-й этап заказа #${orderId.slice(0,8)} успешно оплачен!\\nЗаказ готов к выдаче.`);
      close();
      if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
    } catch (err) {
      tgUtil.haptic('error');
      tgUtil.alert('Ошибка оплаты: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '💳 Оплатить 2-й этап';
    }
  };
};

window.openInvoiceModal = (orderId, originalPrice) => {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'invoiceTypeModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 space-y-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0" id="invModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-cyan-400 text-xl">📄</span> 
          <span>Создание инвойса</span>
        </h3>
        <button id="closeInvModalBtn" class="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div class="space-y-3">
        <button id="btnStdInv" class="w-full btn-secondary text-left flex items-start gap-3 p-3 border border-cyan-500/30 hover:bg-cyan-500/10">
          <span class="text-2xl">🏢</span>
          <div>
            <p class="text-white font-bold text-sm">Стандартный (ICE LOGIX)</p>
            <p class="text-white/50 text-[10px] mt-0.5">Официальный инвойс со штампом и логотипом сервиса.</p>
          </div>
        </button>

        <button id="btnB2bInv" class="w-full btn-secondary text-left flex items-start gap-3 p-3 border border-fuchsia-500/30 hover:bg-fuchsia-500/10">
          <span class="text-2xl">🥷</span>
          <div>
            <p class="text-fuchsia-400 font-bold text-sm">Дропшиппинг (White-Label)</p>
            <p class="text-white/50 text-[10px] mt-0.5">Без логотипов ICE LOGIX. С возможностью указать вашу цену перепродажи.</p>
          </div>
        </button>
      </div>
      
      <div id="b2bPriceBlock" class="hidden mt-4 pt-4 border-t border-white/10 space-y-3">
        <label class="text-white/70 text-xs block">Укажите цену для клиента (BYN):</label>
        <input type="number" id="b2bPriceInput" class="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white text-sm" value="${originalPrice}">
        <button id="btnGenerateB2b" class="btn-primary w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white">Сгенерировать</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    document.getElementById('invModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('invModalContent').classList.add('scale-100', 'opacity-100');
  });

  const close = () => {
    document.getElementById('invModalContent').classList.remove('scale-100', 'opacity-100');
    document.getElementById('invModalContent').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.remove(), 300);
  };
  
  document.getElementById('closeInvModalBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  document.getElementById('btnStdInv').onclick = () => {
    close();
    window.generatePdfInvoice(orderId, false, null);
  };

  document.getElementById('btnB2bInv').onclick = () => {
    document.getElementById('b2bPriceBlock').classList.remove('hidden');
    document.getElementById('b2bPriceInput').focus();
  };

  document.getElementById('btnGenerateB2b').onclick = () => {
    const customPrice = parseFloat(document.getElementById('b2bPriceInput').value);
    if (!customPrice || customPrice <= 0) {
      tgUtil.alert('Введите корректную цену');
      return;
    }
    close();
    window.generatePdfInvoice(orderId, true, customPrice);
  };
};

window.openYandexMapStub = () => {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'yandexMapModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-lg w-full mx-4 p-6 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0 flex flex-col" style="height: 70vh;" id="yMapModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-cyan-400 text-xl">📍</span> 
          <span>Выбор на карте</span>
        </h3>
        <button id="closeYMapModalBtn" class="text-white/50 hover:text-white transition-colors">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
        </button>
      </div>
      
      <!-- Контейнер для Яндекс.Карт -->
      <div id="yandexMapContainer" class="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-white/10 relative flex items-center justify-center">
        <div class="text-center p-6">
          <p class="text-cyan-400 font-bold mb-2">Интеграция с Яндекс Картами</p>
          <p class="text-white/60 text-xs">Для полноценной работы нужно добавить API ключ Яндекса.</p>
          <p class="text-white/60 text-xs mt-2">Здесь появится интерактивная карта для выбора адреса / отделения.</p>
        </div>
      </div>
      
      <button id="btnConfirmMapStub" class="btn-primary w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2">
        Сохранить тестовый адрес
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  requestAnimationFrame(() => {
    document.getElementById('yMapModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('yMapModalContent').classList.add('scale-100', 'opacity-100');
  });

  const close = () => {
    document.getElementById('yMapModalContent').classList.remove('scale-100', 'opacity-100');
    document.getElementById('yMapModalContent').classList.add('scale-95', 'opacity-0');
    setTimeout(() => modal.remove(), 300);
  };
  
  document.getElementById('closeYMapModalBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  document.getElementById('btnConfirmMapStub').onclick = () => {
    close();
    // Simulate address selection for demo purposes
    if (window.tempOrder && window.tempOrder.pvs) {
      window.tempOrder.pvs.city = 'Минск';
      window.tempOrder.pvs.point = 'Тестовый адрес с карты, д. 1';
      document.getElementById('pvsCitySelect').value = 'Минск';
      
      // Update DOM to show the fake selected point
      const pvsPointSelect = document.getElementById('pvsPointSelect');
      pvsPointSelect.innerHTML = `<option value="Тестовый адрес с карты, д. 1" selected>Минск, Тестовый адрес с карты, д. 1</option>`;
      glassToast('Адрес с карты сохранен', { kind: 'success' });
    }
  };
};

window.generatePdfInvoice = async (orderId, isB2b = false, customPrice = null) => {
  tgUtil.haptic('medium');
  glassToast('Генерация PDF-инвойса...', { kind: 'info' });
  
  try {
    const { data: order, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    
    if (!window.html2pdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Не удалось загрузить PDF библиотеку'));
        document.head.appendChild(script);
      });
    }

    const invoiceEl = document.createElement('div');
    invoiceEl.style.width = '800px';
    invoiceEl.style.padding = '40px';
    invoiceEl.style.backgroundColor = '#ffffff';
    invoiceEl.style.color = '#000000';
    invoiceEl.style.fontFamily = 'Arial, sans-serif';
    invoiceEl.style.position = 'absolute';
    invoiceEl.style.left = '-9999px';
    invoiceEl.style.top = '-9999px';
    
    // Мокрая печать (синяя)
    const stampHtml = isB2b ? '' : `
      <div style="position: absolute; right: 80px; bottom: 80px; width: 150px; height: 150px; border: 4px solid rgba(29, 78, 216, 0.7); border-radius: 50%; opacity: 0.8; transform: rotate(-15deg); display: flex; align-items: center; justify-content: center; text-align: center; font-weight: bold; color: rgba(29, 78, 216, 0.9);">
        <div style="border: 2px dashed rgba(29, 78, 216, 0.5); border-radius: 50%; width: 135px; height: 135px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <span style="font-size: 16px; text-transform: uppercase; margin-bottom: 4px;">ICE LOGIX</span>
          <span style="font-size: 11px; background-color: rgba(29, 78, 216, 0.1); padding: 2px 6px; border-radius: 4px;">APPROVED</span>
          <span style="font-size: 9px; margin-top: 4px;">${new Date().toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
    `;

    const totalByn = isB2b && customPrice ? parseFloat(customPrice) : order.total_byn;
    const goodsByn = isB2b ? totalByn : (order.total_byn - (order.commission_byn||0));
    
    invoiceEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827;">INVOICE</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">#${order.id.toUpperCase()}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #0284c7;">${isB2b ? 'DELIVERY SERVICE' : 'ICE LOGIX'}</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: 5px;">Global Buying Service</p>
          <p style="color: #6b7280; font-size: 12px;">${isB2b ? 'Logistics Partner' : 'Nesvizh, Belarus'}</p>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          <h3 style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Billed To:</h3>
          <p style="font-weight: 600; font-size: 14px; margin: 0;">User ID: ${order.user_id.slice(0,18)}...</p>
          <p style="font-size: 14px; margin: 5px 0 0 0;">Telegram Delivery</p>
        </div>
        <div style="text-align: right;">
          <h3 style="font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">Date:</h3>
          <p style="font-weight: 600; font-size: 14px; margin: 0;">${new Date(order.created_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Description</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #4b5563; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <strong>Goods/Service:</strong> ${order.items_title || 'Заказ товаров из-за рубежа'}<br>
              <span style="color: #6b7280; font-size: 12px;">Weight: ~${order.weight_estimated} kg</span>
            </td>
            <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">
              ${Number(goodsByn).toFixed(2)} BYN
            </td>
          </tr>
          ${!isB2b ? `
          <tr>
            <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <strong>Service Fee (Commission)</strong>
            </td>
            <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">
              ${Number(order.commission_byn||0).toFixed(2)} BYN
            </td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 14px; color: #4b5563;">Subtotal:</span>
            <span style="font-weight: 600;">${Number(totalByn).toFixed(2)} BYN</span>
          </div>
          ${!isB2b ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #111827;">
            <span style="font-size: 14px; color: #4b5563;">Paid (Prepayment):</span>
            <span style="font-weight: 600;">${Number(order.prepayment_amount||0).toFixed(2)} BYN</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 15px 0;">
            <span style="font-size: 18px; font-weight: 800; color: #111827;">TOTAL DUE:</span>
            <span style="font-size: 18px; font-weight: 800; color: #0284c7;">${Number(isB2b ? totalByn : (totalByn - (order.prepayment_amount||0))).toFixed(2)} BYN</span>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: auto; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>This is an electronically generated invoice.</p>
        <p>Status: ${order.status.toUpperCase()}</p>
      </div>
      
      ${stampHtml}
    `;

    document.body.appendChild(invoiceEl);
    
    const opt = {
      margin:       10,
      filename:     'ice_logix_invoice_' + order.id.slice(0,8) + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(invoiceEl).save();
    document.body.removeChild(invoiceEl);
    glassToast('Инвойс успешно скачан!', { kind: 'success' });
    
  } catch (err) {
    console.error('Ошибка генерации PDF:', err);
    glassToast('Ошибка генерации инвойса', { kind: 'error' });
  }
};

window.generateShippingManifest = async (orderId) => {
  tgUtil.haptic('medium');
  glassToast('Генерация накладной (А6)...', { kind: 'info' });
  
  try {
    const { data: order, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    
    const { data: user } = await supabaseClient.from('users').select('*').eq('user_id', order.user_id).single();
    const fullName = user?.full_name || 'Без имени';
    const phone = user?.phone || 'Не указан';
    
    if (!window.html2pdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Не удалось загрузить PDF библиотеку'));
        document.head.appendChild(script);
      });
    }

    const manifestEl = document.createElement('div');
    manifestEl.style.width = '396px';
    manifestEl.style.minHeight = '559px';
    manifestEl.style.padding = '20px';
    manifestEl.style.backgroundColor = '#ffffff';
    manifestEl.style.color = '#000000';
    manifestEl.style.fontFamily = 'Arial, sans-serif';
    manifestEl.style.position = 'absolute';
    manifestEl.style.left = '-9999px';
    manifestEl.style.top = '-9999px';
    
    const address = order.tracking_number_by || 'Самовывоз / Не указан';
    
    manifestEl.innerHTML = `
      <div style="border: 2px solid #000; padding: 15px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase;">ICE LOGIX</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">ДОСТАВКА ПО РБ</p>
        </div>
        
        <div style="flex: 1;">
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">Получатель:</p>
            <p style="margin: 2px 0 0 0; font-size: 18px; font-weight: bold;">${fullName}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">Телефон:</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold;">${phone}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">Адрес доставки / ПВЗ:</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold; line-height: 1.4;">${address.replace(/\\|/g, '<br>')}</p>
          </div>
          
          <div style="margin-bottom: 20px; border-top: 1px dashed #000; padding-top: 15px;">
            <p style="margin: 0; font-size: 10px; color: #555; text-transform: uppercase;">Заказ:</p>
            <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: bold;">#${order.id.slice(0,8).toUpperCase()}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Вес: ${order.weight_actual || order.weight_estimated || '?'} кг</p>
          </div>
        </div>
        
        <div style="text-align: center; border-top: 2px solid #000; padding-top: 10px; margin-top: auto;">
          <div style="height: 60px; width: 80%; margin: 0 auto; background-image: repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 10px);"></div>
          <p style="margin: 5px 0 0 0; font-size: 10px; letter-spacing: 2px;">${order.id.slice(0,12).toUpperCase()}</p>
        </div>
      </div>
    `;

    document.body.appendChild(manifestEl);
    
    const opt = {
      margin:       2,
      filename:     'ice_logix_label_' + order.id.slice(0,8) + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: [105, 148], orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(manifestEl).save();
    document.body.removeChild(manifestEl);
    glassToast('Накладная А6 успешно скачана!', { kind: 'success' });
    
  } catch (err) {
    console.error('Ошибка генерации накладной:', err);
    glassToast('Ошибка генерации накладной', { kind: 'error' });
  }
};

window.openInsuranceClaimModal = (orderId, orderTotal) => {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'insuranceClaimModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 space-y-5 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.7)] transform transition-all duration-300 scale-95 opacity-0" id="claimModalContent">
      <div class="flex justify-between items-center border-b border-white/10 pb-3">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          <span class="text-amber-400 text-xl">🛡️</span> 
          <span class="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Страховой случай</span>
        </h3>
        <button id="closeClaimModalBtn" class="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div class="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4 rounded-xl text-xs text-white/80 leading-relaxed relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-amber-500/10 text-6xl">🛡️</div>
        <p class="font-bold text-amber-300 mb-2 text-sm flex items-center gap-1.5"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span> Условия возмещения:</p>
        <ul class="space-y-1.5 pl-1 relative z-10">
          <li class="flex items-start gap-1.5">
            <span class="text-amber-400 mt-0.5">•</span>
            <span>Полный возврат стоимости (<strong>${orderTotal.toFixed(2)} BYN</strong>) начисляется на ваш баланс после проверки.</span>
          </li>
          <li class="flex items-start gap-1.5">
            <span class="text-amber-400 mt-0.5">•</span>
            <span>Срок рассмотрения администрацией ICE LOGIX — <strong>до 24 часов</strong>.</span>
          </li>
        </ul>
      </div>
      
      <div class="space-y-2">
        <label class="text-white/70 text-xs font-semibold block ml-1">Детали происшествия *</label>
        <textarea id="claimReason" class="w-full p-4 rounded-xl border border-white/20 bg-slate-900/50 focus:bg-slate-900/80 focus:border-amber-500/50 text-sm text-white transition-all placeholder:text-white/30 resize-none outline-none" placeholder="Опишите, что случилось (напр. посылка утеряна, повреждена и т.д.)..." rows="4"></textarea>
      </div>
      
      <button id="submitClaimBtn" class="w-full py-3.5 rounded-xl transition-all text-xs tracking-wider uppercase font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-[0.98]">
        Отправить претензию
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Анимация появления
  requestAnimationFrame(() => {
    const content = document.getElementById('claimModalContent');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  });
  
  document.getElementById('closeClaimModalBtn').onclick = () => modal.remove();
  
  document.getElementById('submitClaimBtn').onclick = async () => {
    const reason = document.getElementById('claimReason')?.value.trim();
    if (!reason) {
      glassToast('Пожалуйста, опишите причину страхового случая!', { kind: 'error' });
      return;
    }
    
    const submitBtn = document.getElementById('submitClaimBtn');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Отправка...';
    
    try {
      const { error } = await supabaseClient.from('insurance_claims').insert({
        order_id: orderId,
        user_id: userId,
        description: reason,
        status: 'pending'
      });
      
      if (error) throw error;
      
      glassToast('Претензия успешно отправлена на рассмотрение!', { kind: 'success' });
      modal.remove();
      renderCurrentScreen();
    } catch(e) {
      console.error(e);
      glassToast('Ошибка отправки: ' + e.message, { kind: 'error' });
      submitBtn.disabled = false;
      submitBtn.innerText = 'Отправить претензию';
    }
  };
};


// Global Exports
if (typeof renderNewOrder === 'function') window.renderNewOrder = renderNewOrder;
if (typeof attachNewOrderHandlers === 'function') window.attachNewOrderHandlers = attachNewOrderHandlers;
if (typeof setOrderMode === 'function') window.setOrderMode = setOrderMode;
if (typeof escHtml === 'function') window.escHtml = escHtml;
if (typeof safeUrl === 'function') window.safeUrl = safeUrl;
if (typeof renderOrderSearchResults === 'function') window.renderOrderSearchResults = renderOrderSearchResults;
if (typeof renderOrderPhotoPreviews === 'function') window.renderOrderPhotoPreviews = renderOrderPhotoPreviews;
if (typeof handleOrderPhotoFiles === 'function') window.handleOrderPhotoFiles = handleOrderPhotoFiles;
if (typeof renderManualPhotoPreviews === 'function') window.renderManualPhotoPreviews = renderManualPhotoPreviews;
if (typeof getStatusSteps === 'function') window.getStatusSteps = getStatusSteps;
if (typeof getDeliveryCountdownText === 'function') window.getDeliveryCountdownText = getDeliveryCountdownText;
if (typeof renderMyOrders === 'function') window.renderMyOrders = renderMyOrders;
if (typeof detectCardType === 'function') window.detectCardType = detectCardType;
if (typeof getCardIcon === 'function') window.getCardIcon = getCardIcon;
