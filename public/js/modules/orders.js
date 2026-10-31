// ============================================================
// ICE LOGIX Module: Orders & Payments
// ============================================================

// ==================== УМНЫЙ ПАРСИНГ ССЫЛОК И ТЕКСТА КИТАЙСКИХ ПЛОЩАДОК ====================
const KNOWN_MARKETPLACE_BRANDS = [
  'Nike', 'Jordan', 'Adidas', 'New Balance', 'Yeezy', 'Asics', 'Puma',
  'Converse', 'Vans', 'Salomon', "Arc'teryx", 'Arcteryx', 'Supreme',
  'Stussy', 'Bape', 'A Bathing Ape', 'UGG', 'Balenciaga', 'Gucci', 'Prada',
  'Louis Vuitton', 'Dior', 'Fear of God', 'Essentials', 'Corteiz', 'Trapstar',
  'Timberland', 'Crocs', 'The North Face', 'Stone Island', 'Mihara Yasuhiro',
  'Maison Margiela', 'Off-White', 'Rick Owens', 'Carhartt', 'Zara', 'Uniqlo',
  'MLB', 'Champion', 'Under Armour', 'Reebok', 'Hoka', 'On Running', 'Casio'
];

function parseMarketplaceShare(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const raw = rawText.trim();
  if (!raw) return null;

  // 1. Extract URL (http or https)
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`「」【】《》()（）\u4e00-\u9fa5]+)/i;
  const match = raw.match(urlRegex);
  let cleanUrl = match ? match[1] : '';
  if (cleanUrl) {
    cleanUrl = cleanUrl.replace(/[.,!?:;，。！？]+$/, '');
  }

  // 2. Extract brand
  let detectedBrand = '';
  for (const b of KNOWN_MARKETPLACE_BRANDS) {
    const rx = new RegExp(`(^|[^a-zA-Z0-9])${b.replace("'", "['’]?")}([^a-zA-Z0-9]|$)`, 'i');
    if (rx.test(raw)) {
      detectedBrand = b;
      break;
    }
  }

  // 3. Extract Category
  let detectedCategory = '';
  const catKeywords = [
    { cat: 'Кроссовки', rx: /(?:кроссовк|кед|sneaker|dunk|jordan|air force|yeezy|samba|gazelle|550|2002r|鞋|板鞋|跑鞋)/i },
    { cat: 'Ботинки', rx: /(?:ботинк|сапог|лофер|угг|boot|ugg|timberland|靴)/i },
    { cat: 'Футболка', rx: /(?:футболк|лонгслив|tee|t-shirt|短袖|T恤)/i },
    { cat: 'Худи', rx: /(?:худи|толстовк|свитшот|hoodie|sweatshirt|卫衣)/i },
    { cat: 'Куртка', rx: /(?:куртк|ветровк|бомбер|jacket|外套|夹克)/i },
    { cat: 'Пуховик', rx: /(?:пуховик|down jacket|羽绒服)/i },
    { cat: 'Джинсы', rx: /(?:джинс|jeans|牛仔裤)/i },
    { cat: 'Брюки', rx: /(?:брюк|штаны|pants|sweatpants|长裤|休闲裤)/i },
    { cat: 'Шорты', rx: /(?:шорт|shorts|短裤)/i },
    { cat: 'Рюкзак', rx: /(?:рюкзак|backpack|双肩包)/i },
    { cat: 'Сумка', rx: /(?:сумк|bag|tote|crossbody|单肩包|手提包)/i },
    { cat: 'Шапка', rx: /(?:шапк|кепк|панам|cap|beanie|hat|帽子)/i },
    { cat: 'Часы', rx: /(?:час[ыо]|watch|手表)/i },
    { cat: 'Очки', rx: /(?:очк|sunglasses|glasses|墨镜|眼镜)/i },
    { cat: 'Парфюм', rx: /(?:парфюм|духи|perfume|fragrance|香水)/i }
  ];

  for (const ck of catKeywords) {
    if (ck.rx.test(raw)) {
      detectedCategory = ck.cat;
      break;
    }
  }

  // 4. Extract title / model
  let detectedTitle = '';
  const quoteMatch = raw.match(/「([^」]+)」/);
  if (quoteMatch && quoteMatch[1] && !['得物', '淘宝', '天猫', '京东', '闲鱼', '1688', 'Poizon', '拼多多', 'Pinduoduo'].includes(quoteMatch[1].trim())) {
    detectedTitle = quoteMatch[1].trim();
  }

  if (!detectedTitle) {
    let t = raw;
    if (cleanUrl) t = t.replace(cleanUrl, ' ');
    // Remove boilerplate Chinese phrases
    t = t.replace(/【(?:得物|淘宝|天猫|京东|闲鱼|1688|Poizon|拼多多|Pinduoduo)】/gi, ' ');
    t = t.replace(/点击链接直接打开.*$/gi, ' ');
    t = t.replace(/或复制该信息打开.*$/gi, ' ');
    t = t.replace(/复制这条信息后打开.*$/gi, ' ');
    t = t.replace(/复制本条信息打开.*$/gi, ' ');
    t = t.replace(/复制打开拼多多.*$/gi, ' ');
    t = t.replace(/查看商品详情/gi, ' ');
    t = t.replace(/得物App专注于.*?社区/gi, ' ');
    t = t.replace(/得物App/gi, ' ');
    t = t.replace(/拼多多/gi, ' ');
    t = t.replace(/[0-9]+￥\s*[A-Z0-9]+\s*[0-9]:\/！/gi, ' ');
    t = t.replace(/CZ[0-9]{4}/gi, ' ');
    t = t.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Remove leading numbers or short codes like "99 9999"
    t = t.replace(/^[0-9\s#.,，。…]+/, '').trim();
    // Remove trailing punctuation/ellipsis
    t = t.replace(/[.,!?:;，。！？…]+$/, '').trim();

    if (t.length > 2 && t.length < 120 && !/^[\s.,，。…]+$/.test(t)) {
      detectedTitle = t;
    }
  }

  // Model cleanup:
  let detectedModel = detectedTitle;
  if (detectedBrand && detectedModel) {
    const bRx = new RegExp(`(^|[^a-zA-Z0-9])${detectedBrand}(?:耐克|阿迪达斯|彪马|亚瑟士)?(?:官方旗舰店|官方店|官方)?([^a-zA-Z0-9]|$)`, 'i');
    detectedModel = detectedModel.replace(bRx, ' ').replace(/\s+/g, ' ').trim();
  }

  // 5. Extract Size
  let detectedSize = '';
  const sizeMatch = raw.match(/(?:EUR|EU|US|UK)?\s*([345][0-9](?:\.5|\.0)?|[6-9]\.5|[6-9])\s*(?:码|EUR|EU|US|UK)/i) 
                 || raw.match(/(?:размер|size|码数|尺码)\s*:?\s*([345][0-9](?:\.5|\.0)?|[6-9]\.5|[6-9]|S|M|L|XL|XXL)/i);
  if (sizeMatch && sizeMatch[1]) {
    detectedSize = sizeMatch[1].toUpperCase();
  }

  return {
    raw,
    url: cleanUrl || (raw.startsWith('http') ? raw : ''),
    brand: detectedBrand,
    title: detectedTitle,
    model: detectedModel || detectedTitle,
    category: detectedCategory,
    size: detectedSize
  };
}
window.parseMarketplaceShare = parseMarketplaceShare;

function applySmartShareLink(targetInput, rawText, isManual = false) {
  if (!rawText || typeof rawText !== 'string') return false;
  const parsed = parseMarketplaceShare(rawText);
  if (!parsed || (!parsed.url && !parsed.model && !parsed.brand)) {
    return false;
  }

  const url = parsed.url;
  if (url && targetInput) {
    targetInput.value = url;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (!url && targetInput && parsed.model) {
    targetInput.value = parsed.model;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const filled = [];

  const brandEl = document.getElementById('orderBrand');
  if (brandEl && !brandEl.value.trim() && parsed.brand) {
    brandEl.value = parsed.brand;
    brandEl.dispatchEvent(new Event('input', { bubbles: true }));
    filled.push('бренд');
  }

  const modelEl = document.getElementById('orderModel');
  if (modelEl && !modelEl.value.trim() && parsed.model) {
    modelEl.value = parsed.model;
    modelEl.dispatchEvent(new Event('input', { bubbles: true }));
    filled.push('модель');
  }

  const sizeEl = document.getElementById('orderSize');
  if (sizeEl && !sizeEl.value.trim() && parsed.size) {
    sizeEl.value = parsed.size;
    sizeEl.dispatchEvent(new Event('input', { bubbles: true }));
    filled.push('размер');
  }

  const categoryEl = document.getElementById('orderCategory');
  if (categoryEl && (!categoryEl.value || categoryEl.value === '') && parsed.category) {
    categoryEl.value = parsed.category;
    categoryEl.dispatchEvent(new Event('change', { bubbles: true }));
    filled.push('категорию');
  }

  if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('success');

  if (filled.length > 0) {
    if (typeof glassToast === 'function') {
      glassToast(`✨ Ссылка очищена! Заполнено: ${filled.join(', ')}`, { kind: 'success' });
    }
  } else if (url) {
    if (typeof glassToast === 'function') {
      glassToast('✨ Ссылка очищена от иероглифов и вставлена!', { kind: 'success' });
    }
  }

  return true;
}
window.applySmartShareLink = applySmartShareLink;

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


      let vacationBanner = '';
      if (window.buyerVacation && window.buyerVacation.active) {
        const days = window.buyerVacation.days || 0;
        vacationBanner = `
          <div class="no-vac">
            <span>${window.UI.icon('calendar', 20)}</span>
            <div><b>Байеры на каникулах</b><p>Сроки доставки сдвигаются на ${days} дн. Заказы оформлять можно как обычно.</p></div>
          </div>
        `;
      }

      // Initialize order structure
      if (!window.tempOrder) {
        window.tempOrder = { items: [], total: 0, discountAmount: 0, appliedPromo: null, country: 'CN' };
      }
      window.tempOrder.items = window.tempOrder.items || [];
      window.orderCountry = 'CN';
      if (!window.tempOrder.country) {
        window.tempOrder.country = 'CN';
      }

      // Auto force orderAddMode if no items are added yet
      if (window.tempOrder.items.length === 0) {
        window.orderAddMode = true;
      }

      if (window.orderAddMode) {
        // ── STEP B: Mode Selection Overlay (if no mode selected yet) ──
        if (!window.orderAddSubMode) {
          const hasExistingItems = window.tempOrder && window.tempOrder.items && window.tempOrder.items.length > 0;

          // If no items in order, guide user to Calculator or Catalog
          if (!hasExistingItems) {
            const U = window.UI;
            return `
              <div class="rd-screen page-enter no">
                <div class="rd-head">
                  <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
                  <div class="rd-head-txt"><h1 class="rd-head-title">Оформление заказа</h1><p class="rd-head-sub">Добавьте вещь, и мы её выкупим</p></div>
                </div>
                ${vacationBanner}
                <div class="no-hero">
                  <div class="no-art" aria-hidden="true"><span>${U.icon('bag', 40)}</span><i>${U.icon('plus', 18, { stroke: 2.6 })}</i></div>
                  <h2>В заказе пока пусто</h2>
                  <p>Посчитайте цену вещи по ссылке, фото или названию, и она сразу попадёт сюда.</p>
                </div>
                <div class="rd-card rd-list">
                  <div class="rd-row" role="button" tabindex="0" onclick="switchTab('calculator')"><span class="rd-ico">${U.icon('calc', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Рассчитать вещь</span><span class="rd-row-text">По ссылке, фото или названию</span></span>${U.icon('chevR', 18)}</div>
                  <div class="rd-row" role="button" tabindex="0" onclick="window.setOrderAddSubMode('import')"><span class="rd-ico">${U.icon('history', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Из моих расчётов</span><span class="rd-row-text">Взять то, что уже посчитали</span></span>${U.icon('chevR', 18)}</div>
                  <div class="rd-row" role="button" tabindex="0" onclick="switchTab('catalogs')"><span class="rd-ico">${U.icon('grid', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Выбрать в каталоге</span><span class="rd-row-text">Площадки и готовые подборки</span></span>${U.icon('chevR', 18)}</div>
                </div>
              </div>
            `;
          }

          const U = window.UI;
          return `
          <div class="rd-screen page-enter no">
            <div class="rd-head">
              <button type="button" class="rd-back" onclick="window.orderAddMode = false; renderCurrentScreen();" aria-label="Назад к заказу">${U.icon('chevL', 22)}</button>
              <div class="rd-head-txt"><h1 class="rd-head-title">Добавить вещь</h1><p class="rd-head-sub">Выберите, откуда взять товар</p></div>
            </div>
            ${vacationBanner}
            <div class="rd-modes">
              <div class="rd-mode order-mode-card" role="button" tabindex="0" onclick="window.setOrderAddSubMode('import')">
                <span class="rd-mode-ico">${U.icon('history', 24)}</span>
                <span class="rd-mode-body"><span class="rd-mode-title">Из моих расчётов</span><span class="rd-mode-text">Выберите готовый расчёт из истории</span></span>
                ${U.icon('chevR', 20)}
              </div>
              <div class="rd-mode order-mode-card" role="button" tabindex="0" onclick="switchTab('calculator')">
                <span class="rd-mode-ico">${U.icon('calc', 24)}</span>
                <span class="rd-mode-body"><span class="rd-mode-title">Посчитать новую вещь</span><span class="rd-mode-text">По ссылке, фото или названию</span></span>
                ${U.icon('chevR', 20)}
              </div>
            </div>
          </div>
        `;
      }

        // ── STEP C: Product addition Form ──
        const subMode = window.orderAddSubMode;
        const subModeText = subMode === 'link' ? 'По ссылке' : subMode === 'photo' ? 'По фото' : subMode === 'import' ? 'Из расчётов' : 'По описанию';
        const showFormFields = Boolean(window.orderLinkAnalyzed);
        const pending = window._pendingImportCalc || null;
        if (pending && pending.image_url) {
          window.orderImportedImageUrl = pending.image_url;
        }

        let importListHtml = '';
        if (subMode === 'import') {
          let calculations = [];
          try {
            calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
          } catch(e) {}
          
          const targetCountry = (window.orderCountry || 'CN').toUpperCase();
          const filteredCalcs = calculations.filter(c => {
            const cCountry = (c.country || 'CN').toUpperCase();
            return cCountry === targetCountry || (!c.country && targetCountry === 'CN');
          });

          window._cachedImportCalcs = filteredCalcs;

          if (filteredCalcs.length === 0) {
            const countryObj = ALL_COUNTRIES.find(x => x.code === window.orderCountry);
            const countryName = countryObj ? countryObj.name : (window.orderCountry === 'CN' ? 'Китай' : window.orderCountry);
            importListHtml = `
              ${window.UI.empty({ icon: 'calc', title: 'Расчётов пока нет', text: `Сначала посчитайте вещь в калькуляторе (страна: ${countryName}).`, action: 'Открыть калькулятор', onclick: "window.switchTab('calculator')" })}
            `;
          } else {
            importListHtml = filteredCalcs.slice(0, 20).map((c, idx) => {
              const dateStr = new Date(c.timestamp || Date.now()).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              const imageHtml = c.image_url 
                ? `<img src="${escHtmlC(c.image_url)}" class="w-12 h-12 object-cover rounded-xl border border-white/10 flex-shrink-0" onerror="this.style.display='none'">` 
                : '';
              return `
                <div class="glass-card p-3 flex gap-3 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition active:scale-[0.99] text-left" onclick="window.selectImportedCalculationByIndex(${idx})">
                  ${imageHtml}
                  <div class="flex-1 min-w-0 flex flex-col justify-between">
                    <div class="flex justify-between items-center text-[9px] text-white/40 mb-1">
                      <span>${dateStr}</span>
                      <span>${escHtmlC(c.marketplace || 'Poizon')}</span>
                    </div>
                    <h4 class="text-white font-bold text-xs truncate" title="${escHtmlC(c.title || 'Товар без названия')}">${escHtmlC(c.title || 'Товар без названия')}</h4>
                    <p class="text-white/50 text-[10px] mt-0.5">Размер: ${escHtmlC(c.size || '—')} · Цвет: ${escHtmlC(c.color || '—')} · ${c.weight || 1.0} кг</p>
                  </div>
                  <div class="flex flex-col justify-center items-end ml-2 pl-2 border-l border-white/5">
                    <span style="color: var(--rd-b400)" class=" font-extrabold text-xs font-mono inline-flex items-baseline gap-1">${c.total_byn ? window.moneyText(Number(c.total_byn)) : '0.00'} ${window.bynSign ? window.bynSign() : ''}</span>
                    <span class="text-[9px] text-cyan-400/80 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded-lg border border-cyan-500/20 mt-1">Выбрать</span>
                  </div>
                </div>
              `;
            }).join('');
          }
        }

        return `
          <div class="rd-screen page-enter no no-form">
            <div class="rd-head">
              <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${window.UI.icon('chevL', 22)}</button>
              <div class="rd-head-txt"><h1 class="rd-head-title">Добавить вещь</h1><p class="rd-head-sub">Способ: ${subModeText}</p></div>
              <button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" onclick="window.orderAddSubMode=null; window.orderLinkAnalyzed=false; renderCurrentScreen()">Сменить</button>
            </div>

            <div class="glass-card no-card">

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
                <div class="flex justify-between items-center mb-1">
                  <label class="text-white/70 text-sm">Ссылка на товар <span class="text-white/40 text-xs font-normal">(необязательно)</span></label>
                  <span class="no-tag">Сама уберёт лишнее</span>
                </div>
                <div class="flex gap-1 bg-white/5 border border-white/30 rounded-xl overflow-hidden px-1.5 py-1">
                  <input type="text" id="orderUrlManual" class="bg-transparent flex-1 border-0 outline-none p-2 text-sm text-white" placeholder="Вставьте ссылку на Poizon, Taobao, 1688..." value="${escHtmlC(pending?.url || '')}">
                  <button type="button" id="orderUrlManualPasteBtn" class="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3.5 transition flex items-center justify-center text-cyan-400 gap-1.5 text-xs font-bold" title="Вставить и очистить ссылку">
                    ${ix('clipboard', { size: '14px' })}
                    <span>Вставить</span>
                  </button>
                </div>
                <p class="text-white/40 text-[11px] mt-1.5">Вставьте текст или ссылку из Poizon — приложение уберёт иероглифы и подставит бренд, модель и размер.</p>
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
                  <input type="text" id="orderBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Nike, Adidas, etc." value="${escHtmlC(pending?.brand || '')}">
                </div>
                <div class="mb-2">
                  <label class="text-white/50 text-xs block mb-0.5">Модель</label>
                  <input type="text" id="orderModel" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Air Force 1, etc." value="${escHtmlC(pending?.model || pending?.title || '')}">
                </div>
                <div>
                  <label class="text-white/50 text-xs block mb-0.5">Особенности</label>
                  <input type="text" id="orderFeatures" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Цвет, расцветка..." value="${escHtmlC(pending?.features || pending?.color || '')}">
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
                    <input type="hidden" id="orderGender" value="${pending?.gender || 'Унисекс'}">
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
                    <input type="text" id="orderColor" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Напр. Черный" value="${escHtmlC(pending?.color || '')}">
                  </div>
                  <div>
                    <label class="text-white/50 text-xs block mb-0.5">Размер</label>
                    <input type="text" id="orderSize" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Напр. 42" value="${escHtmlC(pending?.size || '')}">
                  </div>
                </div>

                <!-- Sizing -->
                <div class="border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-xl">
                  <p class="no-sub-t">Ваши замеры, чтобы подобрать размер</p>
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
                  <input type="range" id="orderWeight" min="0.1" max="30" step="0.1" value="${pending?.weight || 1.0}" class="flex-1 accent-cyan-500">
                  <span id="orderWeightVal" class="text-white/80 bg-white/10 px-3 py-1 rounded-full text-xs font-bold">${pending?.weight || 1.0} кг</span>
                </div>
              </div>

              <!-- Price & Currency combined -->
              <div class="mb-4">
                <label class="text-white/70 text-sm block mb-1">Цена с валютой</label>
                <div class="flex gap-2">
                  <div class="flex-[3]">
                    <input type="number" id="orderPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Укажите цену товара" value="${pending?.price || ''}">
                  </div>
                  <div class="flex-[1]">
                    <select id="orderCurrency" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm cursor-not-allowed opacity-60" style="padding: 14px 10px !important;" disabled>
                      <option value="CNY" selected>CNY (¥)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="PLN">PLN (zł)</option>
                      <option value="RUB">RUB (₽)</option>
                      <option value="BYN">Белорусский рубль</option>
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
        </div>
        ${renderFooter()}
        `;
      }

      // Step 2: экран оформления (checkout-ui.js)
      window.activePackageTab = window.activePackageTab || 'CN';
      return window.CheckoutUI.render(vacationBanner);
    }

    function attachNewOrderHandlers() {
      if (window.CheckoutUI) window.CheckoutUI.mount();
      if (typeof syncTelegramBackButton === 'function') {
        syncTelegramBackButton();
      }
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
              // Проверка одного кода на сервере: список всех промокодов приложению недоступен
              const { data: chk, error } = await supabaseClient.rpc('check_promocode', { p_code: code });
              const data = chk && chk.valid ? chk : null;

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
              
              promoMessage.innerHTML = `Промокод применён! Скидка: ${window.formatBYN(discountAmount)}`;
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
          const submitOrder = async () => {
            if (!window.tempOrder || !userId) { tgUtil.alert('Ошибка: авторизуйтесь или заполните поля'); return; }
            if (!window.tempOrder.items || window.tempOrder.items.length === 0) { tgUtil.alert('Добавьте хотя бы один товар в заказ'); return; }

            if (window.tempOrder?.useCustomsSplit && !window.tempOrder?.customsSplitRecipientId) {
              tgUtil.alert('Выберите второго получателя для разделения посылки.');
              return;
            }

            // Мягкая проверка KYC для таможни РБ
            if (typeof window.checkUserKycStatus === 'function') {
              const kycInfo = await window.checkUserKycStatus(userId);
              if (!kycInfo.isVerified && kycInfo.status !== 'pending') {
                const shouldVerify = await tgUtil.confirm('📦 Для прохождения таможни РБ требуются паспортные данные получателя.\n\nХотите пройти быструю верификацию сейчас?');
                if (shouldVerify) {
                  switchTab('kyc');
                  return;
                }
              }
            }

            const consolidatedOrder = {
              price: window.tempOrder.price || 0,
              currency: window.tempOrder.items?.[0]?.currency || 'CNY',
              weight: document.getElementById('orderWeight') ? parseFloat(document.getElementById('orderWeight').value) : (window.tempOrder.weight || 1),
              category: window.tempOrder.items?.[0]?.category || '',
              country: window.orderCountry,
              url: window.tempOrder.items?.[0]?.url || '',
            };

            // Площадку, валюту и диапазон цены проверяем только у вещей, которые клиент ввёл сам: каталог мы знаем.
            // У вещей в разных валютах общая цена ни о чём не говорит, поэтому диапазон тогда не проверяем.
            const orderItems = window.tempOrder.items;
            const firstItem = orderItems[0];
            const checkPriceRange = orderItems.every((it) => !it.fromCatalog && it.currency === firstItem.currency);
            const validationErrors = validateOrderBeforeSubmit(firstItem.fromCatalog ? { ...consolidatedOrder, url: '' } : consolidatedOrder, { checkPriceRange });
            if (validationErrors.length) {
              tgUtil.haptic('warning');
              tgUtil.alert('Проверьте заказ:\n• ' + validationErrors.join('\n• '));
              return;
            }
            if (!firstItem.fromCatalog) {
              for (const question of orderSoftQuestions(consolidatedOrder)) {
                if (!(await tgUtil.confirm(question))) return;
              }
            }

            // Тот же заказ, у которого сорвалась оплата: клиент не может изменить или удалить его, второй создавать нельзя
            // Неоплаченный заказ мог остаться с прошлой попытки, в том числе до перезахода: сверяем его с базой
            if (window._coUnpaid) {
              await window.CheckoutUI.syncUnpaid();
              await recalculateOrderTotals();
            }
            const orderSig = window.CheckoutUI.orderSig(orderItems, window.tempOrder.first_payment_subtotal_byn);
            const unpaidOrder = window._coUnpaid && window._coUnpaid.sig === orderSig ? window._coUnpaid : null;
            if (window._coUnpaid && !unpaidOrder) {
              if (window._coUnpaid.done) {
                window.CheckoutUI.setUnpaid(null);
              } else if (!(await tgUtil.confirm(`Прошлый заказ #${window._coUnpaid.id.slice(0, 8)} ещё не оплачен, а состав или сумма с тех пор изменились. Оформить новый заказ? Старый можно оплатить в «Мои заказы».`))) {
                return;
              } else {
                window.CheckoutUI.setUnpaid(null);
              }
            }

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

              const selectedRadio = document.querySelector('input[name="selectedCheckoutCard"]:checked');
              const selectedCardId = selectedRadio ? selectedRadio.value : (window.userCards?.[0]?.id || null);
              const isDbUuid = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

              if (!(await window.CheckoutUI.confirmTerms({ family: Boolean(isFamilyMember) }))) return;
              window.CheckoutUI.setBusy(true);

              let createdOrderId = unpaidOrder ? unpaidOrder.id : null;
              if (!createdOrderId) {
                const orderInsertPayload = {
                  user_id: userId,
                  source_url: consolidatedOrder.url,
                  items: window.tempOrder.items,
                  cart_items: window.tempOrder.items,
                  weight_estimated: window.tempOrder.weight || 1,
                  price_original: window.tempOrder.price || 0,
                  price_cny: consolidatedOrder.currency === 'CNY' ? (consolidatedOrder.price || 0) : (window.tempOrder.price || 0),
                  price_byn: bk.product_cost_byn ?? (window.tempOrder.price * 0.45),
                  currency: 'BYN', // design-ok: значение для базы
                  calculated_exchange_rate: bk.rates?.CNY_to_BYN || 0.45,
                  estimated_delivery_amount: bk.delivery_cost_byn ?? (window.tempOrder.weight * 12),
                  delivery_reserve_rate: 0.70,
                  delivery_reserve_amount: bk.delivery_reserve_byn || Math.round((bk.delivery_cost_byn || 0) * 0.70 * 100) / 100,
                  // Полная сумма 1-го этапа; списание с баланса и остаток оформляет сервер (order_pay)
                  first_payment_amount: Math.round((firstPaymentToPay + balanceUsed) * 100) / 100,
                  second_payment_amount: bk.second_payment_est_byn || 0,
                  total_paid: 0,
                  total_refunded: 0,
                  balance_used: 0,
                  amount_due: 0,
                  selected_receiving_method: (window.tempOrder?.pvs?.method && window.tempOrder.pvs.method !== 'none') ? 'FORWARD_SHIPPING' : 'SELF_PICKUP',
                  first_payment_snapshot: bk,
                  calculation_version: 'v1.0',
                  delivery_cost_estimated: bk.delivery_cost_byn ?? (window.tempOrder.weight * 12),
                  commission_byn: bk.commission_byn || 0,
                  insurance_byn: bk.insurance_byn || 0,
                  insurance_enabled: Boolean(window.tempOrder.insurance),
                  legit_check_requested: Boolean(window.tempOrder.legitCheck),
                  customs_duty_byn: bk.customs_duty_byn || 0,
                  currency_buffer_byn: bk.currency_buffer_byn || 0,
                  extra_services: {
                    extra_photo: window.tempOrder.extraPhoto || false,
                    extra_measure: window.tempOrder.extraMeasure || false,
                    is_gift: window.tempOrder.isGift || false,
                    // Условия приняты кнопкой в шторке подтверждения: что и когда, на случай спора
                    terms_accepted: { at: new Date().toISOString(), version: 'draft-2026-10-30', docs: ['offer', 'delivery-rules', 'privacy'] }
                  },
                  total_byn: window.tempOrder.total_byn,
                  requires_video_check: window.tempOrder.requiresVideoCheck || false,
                  delivery_days_min: bk.delivery_days?.[0] || null,
                  delivery_days_max: bk.delivery_days?.[1] || null,
                  source_country: window.orderCountry,
                  product_currency: consolidatedOrder.currency,
                  prepayment_amount: Math.round((firstPaymentToPay + balanceUsed) * 100) / 100,
                  first_payment_paid: false,
                  status: 'pending',
                  auto_cancel_reason: isFamilyMember ? 'family_approval_pending' : null,
                  discount_applied: window.tempOrder.discountAmount || 0,
                  promo_code: window.tempOrder.appliedPromo?.code || null,
                  tracking_number_by: pvsAddress || null
                };

                const { data, error } = await supabaseClient.from('orders').insert(orderInsertPayload).select();

                if (error) throw error;

                createdOrderId = data[0].id;
                window.CheckoutUI.setUnpaid({ id: createdOrderId, sig: orderSig, paid: 0 });

                // Сохранение отдельных позиций заказа (Раздел 56 ТЗ: order_items)
                if (Array.isArray(window.tempOrder.items) && window.tempOrder.items.length > 0) {
                  const itemRows = window.tempOrder.items.map(it => ({
                    order_id: createdOrderId,
                    product_url: it.url || consolidatedOrder.url || '',
                    platform: (window.orderCountry === 'CN' ? 'PINDUODUO' : (it.marketplace_name || 'PINDUODUO')).toUpperCase(),
                    pinduoduo_product_id: it.product_id || '',
                    title: it.title || it.name || 'Товар',
                    variant: it.size || it.variant || '',
                    quantity: it.quantity || 1,
                    price: it.price || 0,
                    currency: it.currency || 'CNY',
                    source_price_cny: it.price || 0,
                    calculated_price_byn: Math.round((it.price || 0) * (bk.rates?.CNY_to_BYN || 0.45) * 100) / 100,
                    item_status: 'PENDING'
                  }));
                  await supabaseClient.from('order_items').insert(itemRows).catch(() => {});
                }

                // AI-оценка доставки (Раздел 46 ТЗ: shipping_estimates)
                await supabaseClient.from('shipping_estimates').insert({
                  order_id: createdOrderId,
                  estimated_weight: consolidatedOrder.weight || 1.0,
                  estimated_delivery_amount: bk.delivery_cost_byn || 0,
                  range_min: Math.round((bk.delivery_cost_byn || 0) * 0.9 * 100) / 100,
                  range_max: Math.round((bk.delivery_cost_byn || 0) * 1.1 * 100) / 100,
                  calculation_version: 'v1.0',
                  model_version_ai: 'shipping-estimator-v1'
                }).catch(() => {});

                // Фирменная упаковка (Раздел 8, 47 ТЗ: packaging_estimates)
                await supabaseClient.from('packaging_estimates').insert({
                  order_id: createdOrderId,
                  items_materials: ['box', 'tape', 'protective_wrap'],
                  estimated_amount: bk.packaging_cost_byn || 18.00,
                  tolerance: 2.00,
                  ai_model_version: 'packaging-v1'
                }).catch(() => {});
              }

              // Оплата 1-го этапа — на сервере (order_pay): сначала с баланса, остаток — заявкой на оплату,
              // которую подтвердит платёжная система или админ. Заказ участника семьи оплачивает глава.
              let payRes = null;
              if (!isFamilyMember && unpaidOrder && unpaidOrder.done) {
                payRes = { ok: true, status: 'paid' };   // заказ уже оплачен, пока приложение было закрыто
              } else if (!isFamilyMember) {
                // IcePay: баланс + карта (выбранная привязанная или новая на странице bePaid) / ЕРИП / заявка админу
                const payMethod = window._checkoutPaymentMethod === 'erip' ? 'erip'
                  : window._checkoutPaymentMethod === 'oplati' ? 'oplati' : 'card';
                const pr = await window.IcePay.payOrder(createdOrderId, 'FIRST', balanceUsed, payMethod,
                  { card_id: isDbUuid(selectedCardId) ? selectedCardId : null, new_card: selectedCardId === 'new' });
                if (!pr || !pr.ok) throw new Error((pr && pr.error) || 'Не получилось провести оплату');
                payRes = pr;
                // При частичной оплате сервер баланс не присылает: читаем его из базы
                if (pr.balance !== undefined && pr.balance !== null) window.setUserBalance(pr.balance);
                else await window.refreshUserBalance();
              }

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
              // Страницу банка или счёт ЕРИП уже показал IcePay; здесь — итог для клиента
              if (payRes && (payRes.redirect_url || payRes.erip || payRes.sandbox)) {
                // ничего: клиент оплачивает на странице банка / в ЕРИП, заказ станет оплаченным сам
              } else {
                const num = createdOrderId.slice(0, 8);
                if (isFamilyMember) {
                  tgUtil.alert(`Заказ #${num} оформлен и отправлен главе семейного бюджета на одобрение.`);
                } else if (payRes && payRes.status === 'paid') {
                  // Статус «оплачен» бывает и без баланса: привязанной картой или когда платить нечего
                  if (Number(window.tempOrder.first_payment_subtotal_byn) <= 0) {
                    tgUtil.alert(`Заказ #${num} оформлен. Скидка покрыла всю сумму, платить ничего не нужно.`);
                  } else {
                    tgUtil.alert(`Заказ #${num} оформлен и оплачен${balanceUsed > 0 && firstPaymentToPay <= 0 ? ' с баланса' : ''}.`);
                  }
                } else {
                  tgUtil.alert(`Заказ #${num} оформлен. К оплате ${window.moneyText(payRes?.remaining ?? firstPaymentToPay)}. Возьмём его в работу, как только подтвердим оплату.`);
                }
              }

              const dbCartIds = [];
              const customCartIds = [];
              if (window.tempOrder && Array.isArray(window.tempOrder.items)) {
                window.tempOrder.items.forEach(item => {
                  if (!item.cartId) return;
                  if (String(item.cartId).startsWith('c_')) {
                    customCartIds.push(String(item.cartId));
                  } else {
                    dbCartIds.push(item.cartId);
                  }
                });
              }
              if (dbCartIds.length > 0) {
                try {
                  await supabaseClient.from('cart').delete().in('id', dbCartIds);
                } catch(e) { console.error('Failed to delete db cart items:', e); }
              }
              if (customCartIds.length > 0) {
                try {
                  let localCustom = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
                  localCustom = localCustom.filter(x => !customCartIds.includes(String(x.id)));
                  localStorage.setItem('ice_custom_cart', JSON.stringify(localCustom));
                } catch(_) {}
              }
              await updateCartBadge();

              window.CheckoutUI.setUnpaid(null);
              window.tempOrder = null;
              window.orderCountry = 'CN';
              delete _tabCache['cart:'];
              delete _tabCache['profile:'];
              delete _tabCache['home:'];
              delete _tabCache['catalogs:'];
              switchTab('home');
            } catch (err) {
              tgUtil.haptic('error');
              if (window._coUnpaid) {
                // Экран не перерисовываем: услуги и переключатели должны остаться, иначе изменится сумма заказа
                try {
                  await window.CheckoutUI.syncUnpaid();
                  await window.refreshUserBalance();
                  await recalculateOrderTotals();
                } catch (_) {}
                tgUtil.alert(`Заказ создан, но оплата не прошла. ${err.message}\n\nНажмите кнопку ещё раз: второго заказа не будет. Оплатить можно и позже в «Мои заказы».`);
              } else {
                tgUtil.alert('Не получилось оформить заказ: ' + err.message);
              }
              window.CheckoutUI.setBusy(false);
            }
          };
          let submitting = false;
          createBtn.onclick = async () => {
            if (submitting) return;
            submitting = true;
            try {
              await submitOrder();
            } finally {
              submitting = false;
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

        if (window._pendingImportCalc) {
          const imported = window._pendingImportCalc;
          window._pendingImportCalc = null;

          if (imported.category && document.getElementById('orderCategory')) {
            document.getElementById('orderCategory').value = imported.category;
            if (window.updateCategoryHint) {
              window.updateCategoryHint('orderCategory', 'orderCategoryHint');
            }
          }
          if (imported.gender && typeof window.selectOrderGender === 'function') {
            window.selectOrderGender(imported.gender);
          }
          const priceEl = document.getElementById('orderPrice');
          if (priceEl && imported.price) {
            priceEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const weightEl = document.getElementById('orderWeight');
          if (weightEl && imported.weight) {
            weightEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
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
        const manualUrlInp = document.getElementById('orderUrlManual');
        const orderPasteBtn = document.getElementById('orderPasteBtn');
        const orderUrlManualPasteBtn = document.getElementById('orderUrlManualPasteBtn');
        const analyzeOrderBtn = document.getElementById('analyzeOrderLinkBtn');

        // Smart link paste for main Link pane
        if (orderPasteBtn) {
          orderPasteBtn.onclick = async () => {
            if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
            try {
              const text = await navigator.clipboard.readText();
              const cleaned = text?.trim();
              if (cleaned) {
                const applied = applySmartShareLink(urlInp, cleaned, false);
                if (!applied && urlInp) {
                  urlInp.value = cleaned;
                  if (typeof glassToast === 'function') glassToast('Текст вставлен! Проверьте формат ссылки.', { kind: 'info' });
                }
              } else {
                if (typeof glassToast === 'function') glassToast('Буфер обмена пуст!', { kind: 'info' });
              }
            } catch (err) {
              console.error('Clipboard paste failed:', err);
              if (typeof glassToast === 'function') glassToast('Нет доступа к буферу. Вставьте вручную.', { kind: 'error' });
            }
          };
        }

        // Smart link paste for Manual order form
        if (orderUrlManualPasteBtn) {
          orderUrlManualPasteBtn.onclick = async () => {
            if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
            try {
              const text = await navigator.clipboard.readText();
              const cleaned = text?.trim();
              if (cleaned) {
                const applied = applySmartShareLink(manualUrlInp, cleaned, true);
                if (!applied && manualUrlInp) {
                  manualUrlInp.value = cleaned;
                  if (typeof glassToast === 'function') glassToast('Текст вставлен! Проверьте формат ссылки.', { kind: 'info' });
                }
              } else {
                if (typeof glassToast === 'function') glassToast('Буфер обмена пуст!', { kind: 'info' });
              }
            } catch (err) {
              console.error('Clipboard paste failed:', err);
              if (typeof glassToast === 'function') glassToast('Нет доступа к буферу. Вставьте вручную.', { kind: 'error' });
            }
          };
        }

        // Intercept native mobile paste on inputs to auto-clean Poizon/Taobao text
        [urlInp, manualUrlInp].forEach(inp => {
          if (!inp) return;
          inp.addEventListener('paste', (e) => {
            const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
            if (pasteText && (pasteText.includes('http') || /[\u4e00-\u9fa5]/.test(pasteText))) {
              e.preventDefault();
              applySmartShareLink(inp, pasteText, inp === manualUrlInp);
            }
          });
        });

        // If user accidentally pastes whole share snippet into brand or model
        const brandInp = document.getElementById('orderBrand');
        const modelInp = document.getElementById('orderModel');
        [brandInp, modelInp].forEach(inp => {
          if (!inp) return;
          inp.addEventListener('paste', (e) => {
            const pasteText = (e.clipboardData || window.clipboardData)?.getData('text');
            if (pasteText && (pasteText.includes('http') || /[\u4e00-\u9fa5]/.test(pasteText))) {
              e.preventDefault();
              applySmartShareLink(manualUrlInp || urlInp, pasteText, true);
            }
          });
        });

        if (analyzeOrderBtn) {
          analyzeOrderBtn.addEventListener('click', async () => {
            const url = urlInp?.value.trim();
            if (!url) { tgUtil.alert('Вставьте ссылку'); return; }

            const originalText = analyzeOrderBtn.innerText;
            analyzeOrderBtn.disabled = true;

            // ── Pinduoduo: новая очередь pdd_jobs (ADR-009), живой прогресс прямо на кнопке ──
            let pddFailed = null;
            try {
              const isPddLink = /yangkeduo|pinduoduo|goods_id=/i.test(url);
              let bData = null;
              if (isPddLink && window.PddProduct) {
                analyzeOrderBtn.textContent = 'Ставим товар в очередь…';
                bData = await window.PddProduct.fetch(url, (label) => { analyzeOrderBtn.textContent = label; });
              }
              if (bData) {
                      const applyBridgeData = (selected) => {
                        const orderPriceEl = document.getElementById('orderPrice');
                        if (orderPriceEl && selected.price != null && Number(selected.price) > 0) {
                          orderPriceEl.value = selected.price;
                          orderPriceEl.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      const currencySelect = document.getElementById('orderCurrency');
                      if (currencySelect) {
                        currencySelect.value = 'CNY';
                        currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                      const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if (el && val) {
                          el.value = val;
                          el.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      };
                      const title = selected.title || bData.title_ru || bData.title || '';
                      if (title) {
                        setVal('orderTitle', title);
                        setVal('orderModel', title);
                      }
                      if (selected.brand || bData.brand) {
                        setVal('orderBrand', selected.brand || bData.brand);
                      }
                      if (selected.color) setVal('orderColor', selected.color);
                      if (selected.size) setVal('orderSize', selected.size);
                      const descParts = [];
                      if (selected.variant_summary) {
                        descParts.push(selected.variant_summary);
                      } else {
                        if (selected.color) descParts.push('Цвет: ' + selected.color);
                        if (selected.size) descParts.push('Размер: ' + selected.size);
                      }
                      if (descParts.length) setVal('orderFeatures', descParts.join(' · '));

                      const categorySelect = document.getElementById('orderCategory');
                      if (categorySelect && (selected.category || bData.category)) {
                        const opt = findCategoryOption(categorySelect, selected.category || bData.category);
                        if (opt) {
                          categorySelect.value = opt.value;
                          categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                      }

                      if (selected.image_url || bData.image_url) {
                        window.orderImportedImageUrl = selected.image_url || bData.image_url;
                        if (typeof window.renderManualPhotoPreviews === 'function') {
                          window.renderManualPhotoPreviews();
                        }
                      }
                      if (typeof recalculateOrderTotals === 'function') {
                        recalculateOrderTotals();
                      }
                      if (typeof glassToast === 'function') {
                        glassToast(`✨ Выбран вариант: ${selected.color || ''} ${selected.size || ''}`, { kind: 'success' });
                      }

                      // Mark analyzed and reveal manual order form
                      window.orderLinkAnalyzed = true;
                      const manualForm = document.getElementById('orderManualForm');
                      if (manualForm) {
                        manualForm.classList.remove('hidden');
                        setTimeout(() => {
                          manualForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 120);
                      }
                      const manualUrlInp = document.getElementById('orderUrlManual');
                      if (manualUrlInp && !manualUrlInp.value) {
                        manualUrlInp.value = url;
                      }
                      const linkPane = document.getElementById('paneOrderLink');
                      if (linkPane) {
                        let badge = document.getElementById('orderLinkSuccessBadge');
                        if (!badge) {
                          badge = document.createElement('div');
                          badge.id = 'orderLinkSuccessBadge';
                          badge.className = 'mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300';
                          badge.innerHTML = '<span class="flex items-center gap-2"><span>✨</span> <strong>Товар загружен.</strong> Параметры заполнены ниже.</span><button type="button" class="text-emerald-200 hover:text-white text-[11px] font-semibold bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 ml-2" onclick="document.getElementById(\'orderManualForm\')?.scrollIntoView({behavior:\'smooth\', block:\'start\'})">К заказу ↓</button>';
                          linkPane.appendChild(badge);
                        }
                      }
                    };

                    const hasOpts = bData.has_options || (bData.colors && bData.colors.length > 0) || (bData.sizes && bData.sizes.length > 0) || (bData.spec_groups && bData.spec_groups.length > 0);
                    if (hasOpts && typeof window.openSkuSelectorModal === 'function') {
                      window.openSkuSelectorModal(bData, applyBridgeData);
                    } else {
                      applyBridgeData({
                        price: bData.price_cny,
                        color: bData.colors?.[0]?.name_ru || '',
                        size: bData.sizes?.[0]?.name_ru || '',
                        image_url: bData.image_url,
                        title: bData.title_ru || bData.title
                      });
                    }

                    analyzeOrderBtn.classList.add('bg-green-500');
                    setTimeout(() => analyzeOrderBtn.classList.remove('bg-green-500'), 1000);
                    analyzeOrderBtn.innerText = originalText;
                    analyzeOrderBtn.disabled = false;
                    return;
              }
            } catch (pddErr) {
              pddFailed = pddErr;
            }
            if (pddFailed) {
              // Понятная ошибка движка (распродан, ноут не на связи): старая очередь тут не поможет
              analyzeOrderBtn.innerText = originalText;
              analyzeOrderBtn.disabled = false;
              tgUtil.alert(String(pddFailed.message || 'Не получилось прочитать товар. Введите данные вручную.'));
              return;
            }

            analyzeOrderBtn.innerHTML = isHardDomain(url) ? '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Обходим защиту…' : '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l-4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Анализ...';

            try {
              const isPdd = /yangkeduo|pinduoduo|goods_id=/i.test(url) || (window.orderCountry === 'CN' && /yangkeduo|pdd|goods1/i.test(url));
              const initialStatus = isPdd ? 'pdd_pending' : 'pending';

              const { data: queueData, error: insErr } = await supabaseClient
                .from('parse_queue')
                .insert({ user_id: userId, url, status: initialStatus })
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

              let skuBundle = null;
              if (result.description) {
                if (typeof result.description === 'object' && result.description.is_sku_bundle) {
                  skuBundle = result.description;
                } else if (typeof result.description === 'string') {
                  try {
                    const parsedDesc = JSON.parse(result.description);
                    if (parsedDesc && parsedDesc.is_sku_bundle) {
                      skuBundle = parsedDesc;
                    }
                  } catch (e) {}
                }
              }

              const applyResolvedData = (data) => {
                const orderPriceEl = document.getElementById('orderPrice');
                if (orderPriceEl && data.price != null && data.price !== '' && Number(data.price) > 0) {
                  orderPriceEl.value = data.price;
                  orderPriceEl.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const currencySelect = document.getElementById('orderCurrency');
                if (currencySelect) {
                  const targetCurr = data.currency || result.currency || 'CNY';
                  const option = Array.from(currencySelect.options).find(opt => opt.value === targetCurr);
                  if (option) currencySelect.value = targetCurr;
                  currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const setVal = (id, val) => {
                  const el = document.getElementById(id);
                  if (el && val != null) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                };

                const title = data.title || result.title || '';
                if (title) {
                  setVal('orderTitle', title);
                  setVal('orderModel', title);
                }
                if (data.brand || result.brand) {
                  setVal('orderBrand', data.brand || result.brand);
                }

                if (data.color) {
                  setVal('orderColor', data.color);
                }
                if (data.size) {
                  setVal('orderSize', data.size);
                }

                const descParts = [];
                if (data.variant_summary) {
                  descParts.push(data.variant_summary);
                } else {
                  if (data.color) descParts.push('Цвет: ' + data.color);
                  if (data.size) descParts.push('Размер: ' + data.size);
                }
                if (descParts.length) {
                  setVal('orderFeatures', descParts.join(' · '));
                }

                const categorySelect = document.getElementById('orderCategory');
                if (categorySelect && (data.category || result.category)) {
                  const targetCat = data.category || result.category;
                  const opt = findCategoryOption(categorySelect, targetCat);
                  if (opt) {
                    categorySelect.value = opt.value;
                    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }

                const imgUrl = data.image_url || result.image_url;
                if (imgUrl) {
                  window.orderImportedImageUrl = imgUrl;
                  if (typeof window.renderManualPhotoPreviews === 'function') {
                    window.renderManualPhotoPreviews();
                  }
                }

                if (typeof recalculateOrderTotals === 'function') {
                  recalculateOrderTotals();
                }

                if (typeof glassToast === 'function') {
                  glassToast(`✨ Товар успешно распознан: ${data.color || ''} ${data.size || ''}`, { kind: 'success' });
                }

                // Mark link as analyzed and reveal the entire order form
                window.orderLinkAnalyzed = true;
                const manualForm = document.getElementById('orderManualForm');
                if (manualForm) {
                  manualForm.classList.remove('hidden');
                  setTimeout(() => {
                    manualForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 120);
                }
                const manualUrlInp = document.getElementById('orderUrlManual');
                if (manualUrlInp && !manualUrlInp.value) {
                  manualUrlInp.value = url;
                }
                const linkPane = document.getElementById('paneOrderLink');
                if (linkPane) {
                  let badge = document.getElementById('orderLinkSuccessBadge');
                  if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'orderLinkSuccessBadge';
                    badge.className = 'mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300';
                    badge.innerHTML = '<span class="flex items-center gap-2"><span>✨</span> <strong>Товар загружен.</strong> Параметры заполнены ниже.</span><button type="button" class="text-emerald-200 hover:text-white text-[11px] font-semibold bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 ml-2" onclick="document.getElementById(\'orderManualForm\')?.scrollIntoView({behavior:\'smooth\', block:\'start\'})">К заказу ↓</button>';
                    linkPane.appendChild(badge);
                  }
                }
              };

              const hasBundleOpts = skuBundle && (skuBundle.has_options || (skuBundle.colors && skuBundle.colors.length > 0) || (skuBundle.sizes && skuBundle.sizes.length > 0) || (skuBundle.spec_groups && skuBundle.spec_groups.length > 0) || (skuBundle.visual_options && skuBundle.visual_options.length > 0));
              if (skuBundle && typeof window.openSkuSelectorModal === 'function' && hasBundleOpts) {
                window.openSkuSelectorModal(skuBundle, (selected) => {
                  applyResolvedData(selected);
                });
              } else {
                applyResolvedData({
                  price: result.price,
                  currency: result.currency,
                  color: result.color,
                  title: result.title,
                  category: result.category,
                  image_url: result.image_url
                });
              }

              analyzeOrderBtn.classList.add('bg-green-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-green-500'), 1000);
            } catch (err) {
              analyzeOrderBtn.classList.add('bg-red-500');
              setTimeout(() => analyzeOrderBtn.classList.remove('bg-red-500'), 2000);
              let rawMsg = (err && err.message) ? String(err.message) : '';
              let friendlyMsg = 'Не удалось проанализировать ссылку. Попробуйте ввести данные вручную.';
              if (rawMsg.includes('LDPlayer') || rawMsg.includes('эмулятор') || rawMsg.includes('Эмулятор')) {
                friendlyMsg = rawMsg.replace(/^❌\s*/, '');
              } else if (rawMsg.includes('no element found') || rawMsg.includes('XML') || rawMsg.includes('dump') || rawMsg.includes('adb') || rawMsg.includes('line 1')) {
                friendlyMsg = 'Эмулятор Pinduoduo сейчас не на связи. Откройте ярлык LDPlayer 14 на компьютере и попробуйте снова.';
              } else if (rawMsg.includes('Таймаут')) {
                friendlyMsg = 'Сервер маркетплейса не ответил вовремя. Пожалуйста, попробуйте снова через пару секунд.';
              } else if (rawMsg && !rawMsg.includes('SyntaxError') && !rawMsg.includes('column 0')) {
                friendlyMsg = rawMsg.replace(/^❌\s*/, '');
              }
              if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
                tgUtil.alert('⚠️ ' + friendlyMsg);
              } else {
                alert(friendlyMsg);
              }
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

        // Поиск по фото живёт в калькуляторе (pdd-search.js): передаём туда фото и уточнение
        if (photoSearchBtn) {
          photoSearchBtn.addEventListener('click', () => {
            if (photoFiles.length === 0) return;
            const st = window._pddSearchState = window._pddSearchState || {};
            st.files = photoFiles.slice(0, 3);
            st.previews = st.files.map((f) => URL.createObjectURL(f));
            st.hint = (photoHint?.value || '').trim();
            st.query = st.query || '';
            st.results = null; st.error = null; st.job = null;
            window._calcMode = 'photo';
            if (typeof window.switchTab === 'function') window.switchTab('calculator');
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
          // Поиск по описанию живёт в калькуляторе (pdd-search.js): передаём туда запрос
          const runTextSearch = () => {
            const q = (textInput.value || '').trim();
            if (q.length < 3) { tgUtil.alert('Опишите вещь хотя бы парой слов'); return; }
            const st = window._pddSearchState = window._pddSearchState || {};
            st.query = q;
            st.results = null; st.error = null; st.job = null;
            if (textPhotoFile) {
              st.files = [textPhotoFile];
              st.previews = [URL.createObjectURL(textPhotoFile)];
              st.hint = q;
            }
            window._calcMode = textPhotoFile ? 'photo' : 'text';
            if (typeof window.switchTab === 'function') window.switchTab('calculator');
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
  const U = window.UI;
  const head = (count) => `
    <div class="rd-head">
      <button id="backToProfileBtn" type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
      <div class="rd-head-txt"><h1 class="rd-head-title">Мои заказы</h1><p class="rd-head-sub">Путь каждой посылки в одном месте</p></div>
      ${count ? `<span class="rd-pill">${count}</span>` : ''}
    </div>`;
  if (!userId) {
    return `<div class="rd-screen page-enter">${head(0)}${U.empty({ icon: 'box', title: 'Войдите, чтобы видеть заказы', text: 'Здесь будет статус каждой посылки, фото со склада и трек-номера.', action: 'Войти', onclick: 'window.requireAuth()' })}</div>`;
  }
  try {
    const [ordersRes, claimsRes, paysRes] = await Promise.all([
      supabaseClient.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabaseClient.from('insurance_claims').select('*').eq('user_id', userId),
      supabaseClient.from('payments').select('order_id, type, provider').eq('user_id', userId).in('status', ['CREATED', 'PENDING'])
    ]);
    if (ordersRes.error) throw ordersRes.error;
    const data = ordersRes.data || [];
    if (!data.length) {
      return `<div class="rd-screen page-enter">${head(0)}${U.empty({ icon: 'box', title: 'Заказов пока нет', text: 'Вставьте ссылку на вещь с Poizon или Taobao, и мы посчитаем цену под ключ.', action: 'Рассчитать заказ', onclick: "window.switchTab('calculator')" })}</div>`;
    }
    const claimsMap = {};
    (claimsRes.data || []).forEach((c) => { claimsMap[c.order_id] = c; });
    // Заявка без платёжной системы ждёт оператора: вторую кнопку оплаты не показываем
    const manualCheck = new Set((paysRes.data || []).filter((p) => p.provider === 'manual').map((p) => `${p.order_id}:${p.type}`));

    const fmt = (n) => U.money(Number(n || 0), { keepCents: true, digits: 2 });
    const NODES = ['Заказ', 'Выкуп', 'Склад', 'В пути', 'В РБ', 'Готово'];
    const nodeIndex = (st) => ({ pending: 0, paid: 0, bought: 1, on_sklad_cn: 2, in_transit: 3, customs: 3, awaiting_payment: 3, paid_second: 3, in_belarus: 4, dispatched: 4, ready_for_pickup: 4, delivered: 5 })[st];
    const plain = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2300-\u23FF\uFE0F]/gu, '').trim();
    const firstImage = U.orderImage;
    const orderTitle = U.orderTitle;

    const cards = data.map((order) => {
      const st = U.orderStatus(order.status);
      const idx = nodeIndex(order.status);
      const img = firstImage(order);
      const created = new Date(order.created_at);
      const dateStr = created.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const total = Number(order.total_byn || 0);
      const pre = Number(order.prepayment_amount || 0);
      const rest = Math.max(0, total - pre);
      const arrived = ['in_belarus', 'ready_for_pickup', 'delivered'].includes(order.status);
      const secondPaid = order.second_payment_paid || order.status === 'delivered';
      const paidSoFar = Number(order.total_paid || 0);
      const firstPaid = Boolean(order.first_payment_paid);
      const familyWait = order.auto_cancel_reason === 'family_approval_pending';
      const firstCheck = manualCheck.has(`${order.id}:FIRST_PAYMENT`);
      const firstDue = Math.max(0, Math.round(((Number(order.first_payment_amount) || pre || total) - paidSoFar) * 100) / 100);
      const canPayFirst = !firstPaid && !familyWait && !firstCheck && order.status === 'pending' && firstDue > 0;
      const firstTag = firstPaid ? '<em class="ok">оплачен</em>'
        : order.status === 'cancelled' ? '<em>отменён</em>'
        : familyWait ? '<em>ждёт одобрения</em>'
        : firstCheck ? '<em class="warn">на проверке</em>'
        : '<em class="warn">к оплате</em>';
      // Неоплаченный заказ не «в обработке»: сначала его нужно оплатить
      const badge = order.status === 'pending' && !firstPaid && !familyWait
        ? { text: firstCheck ? 'Проверяем оплату' : 'Ждёт оплаты', tone: 'warn' } : st;
      const claim = claimsMap[order.id];
      const est = parseFloat(order.weight_estimated) || 0;
      const act = parseFloat(order.weight_actual);
      const weightDiff = !isNaN(act) && Math.abs(act - est) >= 0.001;

      const progress = idx == null ? '' : `
        <div class="oc-track" style="--p:${idx / (NODES.length - 1)}">
          <div class="oc-track-line"><i></i></div>
          <div class="oc-nodes">${NODES.map((n, i) => `<span class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><b></b>${n}</span>`).join('')}</div>
        </div>
        <div class="oc-eta">${U.icon('clock', 15)}<span>${U.esc(plain(getDeliveryCountdownText(order)))}</span></div>`;

      const decision = order.status === 'awaiting_decision' ? `
        <div class="oc-alert warn">
          <div class="oc-alert-t">${U.icon('alert', 18)}Продавец поднял цену больше чем на 3%</div>
          <p>Согласуйте новую цену и мы продолжим, или отмените заказ: все деньги сразу вернутся на баланс.</p>
          <div class="oc-alert-btns">
            <button type="button" class="rd-btn rd-btn-sm" onclick="window.confirmOrderPriceIncrease('${order.id}')">Согласовать</button>
            <button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" onclick="window.cancelOrderDueToPrice('${order.id}')">Отменить заказ</button>
          </div>
        </div>` : '';

      const weight = weightDiff ? `
        <div class="oc-alert ${act > est ? 'warn' : 'ok'}">
          <div class="oc-alert-t">${U.icon(act > est ? 'alert' : 'checkCircle', 18)}${act > est ? 'Посылка тяжелее, чем ожидали' : 'Посылка легче, чем ожидали'}</div>
          <p>Ожидали ${est.toFixed(2)} кг, на складе ${act.toFixed(2)} кг. ${act > est ? 'Будет доплата за разницу в весе.' : 'Доставку пересчитаем в меньшую сторону.'}</p>
        </div>` : '';

      const money = order.extra_services && order.extra_services.is_gift
        ? `<details class="oc-gift"><summary>${U.icon('gift', 16)}Подарок: нажмите, чтобы увидеть сумму</summary>
             <div class="oc-money"><div><span>Сумма заказа</span>${fmt(total)}</div><div><span>Внесено</span>${fmt(paidSoFar)}</div><div><span>Остаток</span>${fmt(Math.max(0, total - paidSoFar))}</div></div>
           </details>`
        : `<div class="oc-money">
             <div><span>Сумма заказа</span>${fmt(total)}</div>
             <div><span>1-й этап ${firstTag}</span>${fmt(firstPaid ? pre : firstDue || pre)}</div>
             <div><span>2-й этап ${secondPaid ? '<em class="ok">оплачен</em>' : arrived && rest > 0 ? '<em class="warn">к оплате</em>' : '<em>после взвешивания</em>'}</span>${secondPaid || arrived ? '' : '≈\u2009'}${fmt(rest)}</div>
           </div>
           ${canPayFirst ? `<button type="button" class="rd-btn rd-btn-block oc-pay" onclick="window.openStagePayment('${order.id}', 'FIRST', ${firstDue})">${U.icon('card', 18)}Оплатить заказ · ${fmt(firstDue)}</button>` : ''}
           ${arrived && !secondPaid && rest > 0 ? `<button type="button" class="rd-btn rd-btn-block oc-pay" onclick="window.openStagePayment('${order.id}', 'SECOND', ${rest})">${U.icon('card', 18)}Оплатить доставку · ${fmt(rest)}</button>` : ''}`;

      const tracks = [
        order.tracking_number_cn ? ['Трек в Китае', order.tracking_number_cn] : null,
        order.sbs_tracking_id ? ['Трек SBS', order.sbs_tracking_id] : null,
        order.tracking_number_by ? ['Трек по Беларуси', order.tracking_number_by] : null,
      ].filter(Boolean);

      const photos = Array.isArray(order.photo_reports) && order.photo_reports.length ? `
        <div class="oc-photos-t">${U.icon('camera', 16)}Фото со склада</div>
        <div class="oc-photos" data-urls="${encodeURIComponent(JSON.stringify(order.photo_reports))}">
          ${order.photo_reports.map((u, i) => `<img src="${U.esc(u)}" alt="Фото посылки" data-idx="${i}" loading="lazy" onclick="window.showImagePreview(JSON.parse(decodeURIComponent(this.parentElement.dataset.urls)), ${i})">`).join('')}
        </div>` : '';

      const video = order.requires_video_check ? `
        <div class="oc-alert">
          <div class="oc-alert-t">${U.icon('camera', 18)}Видеопроверка оплачена</div>
          ${order.video_url ? `<a class="rd-btn rd-btn-sm rd-btn-tonal" href="${U.esc(order.video_url)}" target="_blank" rel="noopener">Смотреть видео</a>` : '<p>Видео появится, когда товар приедет на склад в Китае.</p>'}
        </div>` : '';

      const claimHtml = claim ? `
        <div class="oc-alert ${claim.status === 'approved' ? 'ok' : claim.status === 'pending' ? 'warn' : 'bad'}">
          <div class="oc-alert-t">${U.icon('shield', 18)}${claim.status === 'pending' ? 'Страховой случай на рассмотрении' : claim.status === 'approved' ? 'Выплата по страховке одобрена' : 'В выплате отказано'}</div>
          ${claim.rejection_reason ? `<p>Причина: ${U.esc(claim.rejection_reason)}</p>` : ''}
        </div>` : '';

      const canInsure = Number(order.insurance_byn || 0) > 0 && !['pending', 'cancelled'].includes(order.status) && !claim;

      return `
        <article class="oc glass-card order-card">
          <header class="oc-head">
            <span class="oc-thumb">${img ? `<img src="${U.esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${U.icon('box', 22)}</span>
            <div class="oc-hinfo">
              <div class="oc-title">${U.esc(orderTitle(order))}</div>
              <div class="oc-sub"><span class="rd-status ${badge.tone} oc-st">${badge.text}</span><span>№ ${order.id.slice(0, 8).toUpperCase()} · ${dateStr}</span></div>
            </div>
          </header>
          ${progress}
          ${decision}${weight}
          ${money}
          ${tracks.length ? `<div class="oc-tracks">${tracks.map(([k, v]) => `<button type="button" class="oc-trackno" onclick="navigator.clipboard && navigator.clipboard.writeText('${U.esc(v)}').then(() => window.UI.toast('Трек-номер скопирован'))"><span>${k}</span><b>${U.esc(v)}</b>${U.icon('copy', 16)}</button>`).join('')}</div>` : ''}
          ${photos}${video}${claimHtml}
          <div class="oc-actions">
            <button type="button" class="oc-act" onclick="window.showLogisticsHistory('${order.id}')">${U.icon('history', 18)}<span>Трекинг</span></button>
            <button type="button" class="oc-act" onclick="window.openSupportChat('${order.id}')">${U.icon('message', 18)}<span>Вопрос</span></button>
            <button type="button" class="oc-act" onclick="window.openInvoiceModal('${order.id}', ${total.toFixed(2)})">${U.icon('receipt', 18)}<span>Инвойс</span></button>
            ${canInsure ? `<button type="button" class="oc-act" onclick="window.openInsuranceClaimModal('${order.id}', ${total})">${U.icon('shield', 18)}<span>Страховка</span></button>` : `<button type="button" class="oc-act" onclick="window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink('https://t.me/icelogix_bot?start=order_${order.id}')">${U.icon('send', 18)}<span>В боте</span></button>`}
          </div>
          ${order.status === 'delivered' ? `<button type="button" class="rd-btn rd-btn-ghost rd-btn-block oc-resale" onclick="publishToResale('${order.id}', '${(order.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">${U.icon('tag', 18)}Продать в «Наличии»</button>` : ''}
        </article>`;
    }).join('');

    return `<div class="rd-screen page-enter orders-list">${head(data.length)}<div class="oc-list">${cards}</div></div>`;
  } catch (err) {
    console.error('Ошибка в renderMyOrders:', err);
    return `<div class="rd-screen page-enter">${head(0)}${U.empty({ icon: 'alert', title: 'Не удалось загрузить заказы', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Повторить', onclick: 'renderCurrentScreen()' })}</div>`;
  }
}

// =====================================================================
// =====================================================================
// BEPAID КАРТЫ & ПЛАТЕЖИ (ТЗ v1.0 — Разделы 13, 14, 15, 23, 40)
// =====================================================================
function detectCardType(number) {
  const clean = String(number || '').replace(/\D/g, '');
  if (/^(50|56|57|58|67|6390|6262|6762|6769|6771|6705|6706|6708|6711|6763|6768|6770)/.test(clean)) return 'Maestro';
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
  if (/^(9112|9860|9861|9862|2204)/.test(clean)) return 'БЕЛКАРТ';
  if (/^220[0-3]/.test(clean)) return 'МИР';
  if (/^(62|81)/.test(clean)) return 'UnionPay';
  return 'Банковская карта';
}

function getCardBrandLogoHtml(brand, customClass = '') {
  const b = String(brand || '').toLowerCase().trim();
  const extra = customClass ? ' ' + customClass : '';
  if (b === 'visa') {
    return `<img src="/assets/payment-methods/visa.webp" alt="Visa" class="h-3.5 max-h-[14px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  if (b === 'mastercard') {
    return `<img src="/assets/payment-methods/mastercard.webp" alt="Mastercard" class="h-4 max-h-[17px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  if (b === 'maestro') {
    return `<img src="/assets/payment-methods/maestro.webp" alt="Maestro" class="h-4 max-h-[17px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  if (b === 'белкарт' || b === 'belkart' || b === 'бк') {
    return `<img src="/assets/payment-methods/belkart.webp" alt="Белкарт" class="h-4 max-h-[17px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  if (b === 'мир' || b === 'mir') {
    return `<img src="/assets/payment-methods/mir.webp" alt="МИР" class="h-3.5 max-h-[14px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  if (b === 'unionpay' || b === 'union pay') {
    return `<img src="/assets/payment-methods/unionpay.webp" alt="UnionPay" class="h-4 max-h-[17px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  return `<span class="text-xs select-none">💳</span>`;
}
window.getCardBrandLogoHtml = getCardBrandLogoHtml;

// =====================================================================
// БАНКОВСКИЕ КОНФИГУРАЦИИ & ЛОГОТИПЫ (Пакет 1: 5 банков)
// =====================================================================
const BANK_CONFIGS = {
  belinvest: {
    code: 'belinvest',
    name: 'Белинвестбанк',
    shortName: 'Белинвестбанк',
    logo: '/assets/banks/belinvest.webp',
    icon: '🌊',
    cardGradient: 'from-[#012f2a] via-[#081e1c] to-[#013f36]',
    cardBorder: 'border-teal-400/40',
    cardGlow: 'shadow-teal-950/60 ring-teal-400/20',
    badgeBg: 'bg-teal-500/20 text-teal-300 border border-teal-400/40',
    accentColor: '#00A88F',
    binRegex: /^(220030|401346|418701|434484|434485|434486|434487|452443|458291|472249|485017|510085|534769|547691|557749|557884|557885|671127|676663|911201|911233|986001)/
  },
  belagroprom: {
    code: 'belagroprom',
    name: 'Белагропромбанк',
    shortName: 'Белагропром',
    logo: '/assets/banks/belagroprom.webp',
    icon: '🌾',
    cardGradient: 'from-[#2b1605] via-[#141215] to-[#3d1d07]',
    cardBorder: 'border-orange-400/40',
    cardGlow: 'shadow-orange-950/60 ring-orange-400/20',
    badgeBg: 'bg-orange-500/20 text-orange-300 border border-orange-400/40',
    accentColor: '#FF7A00',
    binRegex: /^(220028|405877|416954|432036|432037|432038|432039|432040|432041|432067|437435|466171|471477|472848|520195|521405|522208|524430|532308|542275|544775|547232|670523|670691|911200|911211|986000)/
  },
  prior: {
    code: 'prior',
    name: 'Приорбанк',
    shortName: 'Приорбанк',
    logo: '/assets/banks/prior.webp',
    icon: '🟡',
    cardGradient: 'from-[#1c1a0e] via-[#0f0f11] to-[#252108]',
    cardBorder: 'border-yellow-400/40',
    cardGlow: 'shadow-yellow-950/60 ring-yellow-400/20',
    badgeBg: 'bg-amber-400/20 text-amber-300 border border-amber-400/40',
    accentColor: '#FFD200',
    binRegex: /^(220029|409428|416064|417770|430488|437458|445987|458285|471326|472950|480949|483451|491698|510049|532658|535109|536600|548952|676203|911202|911289|986002)/
  },
  sber: {
    code: 'sber',
    name: 'Сбер Банк',
    shortName: 'Сбер Банк',
    logo: '/assets/banks/sber.webp',
    icon: '🟢',
    cardGradient: 'from-[#032716] via-[#0a1b1f] to-[#0b331a]',
    cardBorder: 'border-emerald-400/40',
    cardGlow: 'shadow-emerald-950/60 ring-emerald-400/20',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    accentColor: '#21A038',
    binRegex: /^(220024|379901|379993|405255|408344|408345|410745|413856|413857|418868|427229|431803|431836|431837|431838|437449|449655|457434|457857|460257|463903|463908|463920|473126|510087|517359|527841|535063|540234|543553|544454|558682|559498|624497|626411|671146|671165|676850|911203|911222|986003)/
  },
  belveb: {
    code: 'belveb',
    name: 'Банк БелВЭБ',
    shortName: 'БелВЭБ',
    logo: '/assets/banks/belveb.webp',
    icon: '🦅',
    cardGradient: 'from-[#0d1527] via-[#141f36] to-[#1e2d4d]',
    cardBorder: 'border-slate-400/40',
    cardGlow: 'shadow-slate-900/60 ring-slate-400/20',
    badgeBg: 'bg-slate-500/20 text-slate-200 border border-slate-400/40',
    accentColor: '#4A5568',
    binRegex: /^(220023|412528|414088|422887|423504|424199|446390|446391|447514|447515|458288|484881|499835|516052|520658|526770|544578|545621|547747|548475|557070|670845|671131|671153|671163|676341|676997|986008)/
  },
  vtb: {
    code: 'vtb',
    name: 'Банк ВТБ (Беларусь)',
    shortName: 'ВТБ',
    logo: '/assets/banks/vtb.webp',
    icon: '🔷',
    cardGradient: 'from-[#031548] via-[#071d5e] to-[#0c2a82]',
    cardBorder: 'border-blue-400/40',
    cardGlow: 'shadow-blue-950/60 ring-blue-400/20',
    badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-400/40',
    accentColor: '#002882',
    binRegex: /^(220026|220429|403487|425516|425518|432080|432081|445451|445452|445453|445454|458779|471346|525694|535105|548777|986007)/
  },
  dabrabyt: {
    code: 'dabrabyt',
    name: 'Банк Дабрабыт',
    shortName: 'Дабрабыт',
    logo: '/assets/banks/dabrabyt.webp',
    icon: '🌺',
    cardGradient: 'from-[#2d070d] via-[#1a060a] to-[#3f0c15]',
    cardBorder: 'border-rose-500/40',
    cardGlow: 'shadow-rose-950/60 ring-rose-500/20',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-400/40',
    accentColor: '#C41230',
    binRegex: /^(220015|421487|425527|446505|535127|986015)/
  },
  paritet: {
    code: 'paritet',
    name: 'Паритетбанк',
    shortName: 'Паритетбанк',
    logo: '/assets/banks/paritet.webp',
    icon: '🔵',
    cardGradient: 'from-[#061e47] via-[#0a1630] to-[#0b2866]',
    cardBorder: 'border-sky-400/40',
    cardGlow: 'shadow-sky-950/60 ring-sky-400/20',
    badgeBg: 'bg-sky-500/20 text-sky-300 border border-sky-400/40',
    accentColor: '#004B9B',
    binRegex: /^(220014|405256|405258|416676|416677|425523|427870|429737|437391|458786|459056|530420|535123|556884|911266|986004)/
  },
  mtbank: {
    code: 'mtbank',
    name: 'МТБанк',
    shortName: 'МТБанк',
    logo: '/assets/banks/mtbank.webp',
    icon: '🔴',
    cardGradient: 'from-[#0b1c4d] via-[#0f1738] to-[#1c2e6b]',
    cardBorder: 'border-indigo-400/40',
    cardGlow: 'shadow-indigo-950/60 ring-indigo-400/20',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40',
    accentColor: '#0F3E99',
    binRegex: /^(220017|405257|417494|417495|417753|417754|417755|418837|425517|437457|464990|475787|475788|475789|510047|527782|535104|535107|542645|554832|677008|986005)/
  },
  technobank: {
    code: 'technobank',
    name: 'ОАО «Технобанк»',
    shortName: 'Технобанк',
    logo: '/assets/banks/technobank.webp',
    icon: '🔷',
    cardGradient: 'from-[#09173d] via-[#102256] to-[#183478]',
    cardBorder: 'border-blue-400/40',
    cardGlow: 'shadow-blue-950/60 ring-blue-400/20',
    badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-400/40',
    accentColor: '#2A3494',
    binRegex: /^(220018|403282|403558|414297|414298|425514|470469|479753|489985|516014|520814|527797|529088|547174|671175|986014)/
  },
  bsb: {
    code: 'bsb',
    name: 'ЗАО «БСБ Банк»',
    shortName: 'БСБ Банк',
    logo: '/assets/banks/bsb.webp',
    icon: '🏰',
    cardGradient: 'from-[#260810] via-[#150a0e] to-[#3b0d18]',
    cardBorder: 'border-red-500/40',
    cardGlow: 'shadow-red-950/60 ring-red-500/20',
    badgeBg: 'bg-red-500/20 text-red-300 border border-red-400/40',
    accentColor: '#FF0B18',
    binRegex: /^(220016|410445|410454|410481|410746|417004|425524|425525|458283|458284|460099|460122|460124|460126|467939|513355|513461|514421|520824|534452|535124|539272|671168|986016)/
  },
  bnb: {
    code: 'bnb',
    name: 'ОАО «БНБ-Банк»',
    shortName: 'БНБ-Банк',
    logo: '/assets/banks/bnb.webp',
    icon: '🦁',
    cardGradient: 'from-[#1c1815] via-[#141416] to-[#2d1e0f]',
    cardBorder: 'border-amber-500/40',
    cardGlow: 'shadow-amber-950/60 ring-amber-500/20',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
    accentColor: '#FF6617',
    binRegex: /^(220011|400553|418836|425526|437456|450040|450041|450042|460101|460104|475096|489062|510046|526552|535126|536582|559268|986011)/
  },
  belgazprom: {
    code: 'belgazprom',
    name: 'ОАО «Белгазпромбанк»',
    shortName: 'Белгазпромбанк',
    logo: '/assets/banks/belgazprom.webp',
    icon: '🔥',
    cardGradient: 'from-[#041a36] via-[#082247] to-[#0c3163]',
    cardBorder: 'border-sky-400/40',
    cardGlow: 'shadow-sky-950/60 ring-sky-400/20',
    badgeBg: 'bg-sky-500/20 text-sky-300 border border-sky-400/40',
    accentColor: '#004785',
    binRegex: /^(220012|405254|425515|428620|428621|428622|428623|428624|428625|437396|437455|464132|486818|510045|512722|518597|518707|521058|527826|529344|529922|530422|530914|535106|535705|544307|544979|626241|676821|911213|986012)/
  },
  alfa: {
    code: 'alfa',
    name: 'ЗАО «Альфа-Банк»',
    shortName: 'Альфа-Банк',
    logo: '/assets/banks/alfa.webp',
    icon: '🅰️',
    cardGradient: 'from-[#1c080a] via-[#121214] to-[#280a0d]',
    cardBorder: 'border-red-500/40',
    cardGlow: 'shadow-red-950/60 ring-red-500/20',
    badgeBg: 'bg-red-500/20 text-red-300 border border-red-400/40',
    accentColor: '#EF3124',
    binRegex: /^(220013|405252|406127|415259|418838|424523|425520|437350|451727|458520|458521|458522|458523|477391|510048|519595|520813|529340|534449|535120|537000|539214|544206|544650|547532|548778|556843|676698|911212|986010)/
  },
  rrb: {
    code: 'rrb',
    name: 'ЗАО «РРБ-Банк»',
    shortName: 'Банк РРБ',
    logo: '/assets/banks/rrb.webp',
    icon: '🔴',
    cardGradient: 'from-[#2d090d] via-[#1a080b] to-[#3a0d13]',
    cardBorder: 'border-rose-500/40',
    cardGlow: 'shadow-rose-950/60 ring-rose-500/20',
    badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-400/40',
    accentColor: '#E31E24',
    binRegex: /^(220027|400827|402713|482801|482802|482803|986027)/
  },
  neo: {
    code: 'neo',
    name: 'neo (ЗАО «Цептер Банк»)',
    shortName: 'neo',
    logo: '/assets/banks/neo.webp',
    icon: '🟣',
    cardGradient: 'from-[#1b0836] via-[#120824] to-[#2e0e5c]',
    cardBorder: 'border-purple-400/40',
    cardGlow: 'shadow-purple-950/60 ring-purple-400/20',
    badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-400/40',
    accentColor: '#4B1280',
    binRegex: /^(220025|413059|413297|422484|437488|437489|437490|440511|440513|446142|446143|447561|476396|986025)/
  },
  reshenie: {
    code: 'reshenie',
    name: 'ЗАО «Банк Решение»',
    shortName: 'Банк Решение',
    logo: '/assets/banks/reshenie.webp',
    icon: '🔷',
    cardGradient: 'from-[#120836] via-[#0d0724] to-[#250d4d]',
    cardBorder: 'border-indigo-400/40',
    cardGlow: 'shadow-indigo-950/60 ring-indigo-400/20',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40',
    accentColor: '#1A0D66',
    binRegex: /^(220022|411856|432201|432231|432232|432233|472752|484743|484744|484745|484746|484879|484880|911277|986022)/
  },
  tkbank: {
    code: 'tkbank',
    name: 'ЗАО «ТК Банк»',
    shortName: 'ТК Банк',
    logo: '/assets/banks/tkbank.webp',
    icon: '🪙',
    cardGradient: 'from-[#261c10] via-[#18130d] to-[#362716]',
    cardBorder: 'border-amber-400/40',
    cardGlow: 'shadow-amber-950/60 ring-amber-400/20',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
    accentColor: '#9C7C38',
    binRegex: /^(220099|425599|535199|986099)/
  },
  statusbank: {
    code: 'statusbank',
    name: 'ОАО «Статусбанк»',
    shortName: 'Статусбанк',
    logo: '/assets/banks/statusbank.webp',
    icon: '🟢',
    cardGradient: 'from-[#0d2616] via-[#09170e] to-[#163b22]',
    cardBorder: 'border-emerald-400/40',
    cardGlow: 'shadow-emerald-950/60 ring-emerald-400/20',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    accentColor: '#78BE20',
    binRegex: /^(220021|425536|472209|535136|911235|911236|986026)/
  },
  belarusbank: {
    code: 'belarusbank',
    name: 'Беларусбанк',
    shortName: 'Беларусбанк',
    logo: '/assets/banks/belarusbank.webp',
    icon: '🟢',
    cardGradient: 'from-[#052819] via-[#091b13] to-[#073620]',
    cardBorder: 'border-emerald-400/40',
    cardGlow: 'shadow-emerald-950/60 ring-emerald-400/20',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    accentColor: '#006A4E',
    binRegex: /^(220019|220020|220419|220420|220421|401803|409087|424641|425519|425521|440512|448789|484894|512558|525714|543044|544598|547087|547091|547504|552979|553608|557075|557076|671129|671154|671176|671177|671197|676210|676211|676339|676579|676900|677100|677723|679036|986018|986019|986020|986021)/
  }
};
window.BANK_CONFIGS = BANK_CONFIGS;

function getBankLogoHtml(bankOrCode, customClass = '') {
  if (!bankOrCode) return '';
  const code = (typeof bankOrCode === 'string' ? bankOrCode : (bankOrCode.code || '')).toLowerCase().trim();
  const bank = BANK_CONFIGS[code] || Object.values(BANK_CONFIGS).find(b => b.name.toLowerCase() === code || b.shortName.toLowerCase() === code);
  const extra = customClass ? ' ' + customClass : '';
  if (bank && bank.logo) {
    return `<img src="${bank.logo}" alt="${bank.name}" class="h-4 max-h-[18px] w-auto object-contain select-none${extra}" loading="lazy">`;
  }
  return '';
}
window.getBankLogoHtml = getBankLogoHtml;

function detectBank(number) {
  const clean = String(number || '').replace(/\D/g, '');
  if (clean.length < 4) return null;

  for (const key of Object.keys(BANK_CONFIGS)) {
    const bank = BANK_CONFIGS[key];
    if (bank.binRegex && bank.binRegex.test(clean)) {
      return bank;
    }
  }
  return null;
}

function getCardRateLimitStatus() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : 'guest');
  const key = 'ice_card_rate_limit_' + curUserId;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { blocked: false, remainingMin: 0 };
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.blockedUntil && data.blockedUntil > now) {
      const remainingMin = Math.ceil((data.blockedUntil - now) / 60000);
      return { blocked: true, remainingMin };
    }
    return { blocked: false, remainingMin: 0 };
  } catch (_) {
    return { blocked: false, remainingMin: 0 };
  }
}

function recordCardAttempt() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : 'guest');
  const key = 'ice_card_rate_limit_' + curUserId;
  try {
    const now = Date.now();
    const raw = localStorage.getItem(key);
    let data = raw ? JSON.parse(raw) : { attempts: [] };
    const recent = (data.attempts || []).filter(t => (now - t) < 10 * 60 * 1000);
    recent.push(now);
    let blockedUntil = null;
    if (recent.length >= 3) {
      blockedUntil = now + 10 * 60 * 1000;
    }
    localStorage.setItem(key, JSON.stringify({ attempts: recent, blockedUntil }));
    if (blockedUntil) {
      return { blocked: true, remainingMin: 10 };
    }
  } catch (_) {}
  return { blocked: false };
}

function clearCardRateLimit() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : 'guest');
  const key = 'ice_card_rate_limit_' + curUserId;
  try { localStorage.removeItem(key); } catch (_) {}
}

function getCardIcon(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('visa')) return '💳 Visa';
  if (t.includes('master')) return '💳 Mastercard';
  if (t.includes('mir') || t.includes('мир')) return '💳 МИР';
  if (t.includes('belkart') || t.includes('белкарт')) return '💳 БЕЛКАРТ';
  return '💳 Карта';
}

function checkLuhn(cardNo) {
  const s = String(cardNo || '').replace(/\D/g, '');
  if (s.length < 13 || s.length > 19) return false;
  let nSum = 0;
  let isSecond = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s.charAt(i), 10);
    if (isSecond) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    nSum += d;
    isSecond = !isSecond;
  }
  return (nSum % 10 === 0);
}
window.detectBank = detectBank;
window.detectCardType = detectCardType;
window.checkLuhn = checkLuhn;

window.userCards = window.userCards || [];

window.loadUserCards = async function() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  if (!curUserId) {
    window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
    return window.userCards;
  }
  try {
    const { data, error } = await supabaseClient
      .from('payment_methods')
      .select('*')
      .eq('user_id', curUserId)
      .eq('status', 'ACTIVE')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      window.userCards = data;
      try { localStorage.setItem('ice_payment_methods_' + curUserId, JSON.stringify(data)); } catch (_e) {}
      return data;
    }
  } catch (_e) {}

  try {
    const cached = localStorage.getItem('ice_payment_methods_' + curUserId);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        window.userCards = parsed;
        return window.userCards;
      }
    }
  } catch (_e) {}
  window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
  return window.userCards;
};

window._checkoutPaymentMethod = window._checkoutPaymentMethod || 'card';

window.setCheckoutPaymentMethod = function(method) {
  window._checkoutPaymentMethod = method;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');

  const tabCard = document.getElementById('checkoutMethodTabCard');
  const tabErip = document.getElementById('checkoutMethodTabErip');
  const tabOplati = document.getElementById('checkoutMethodTabOplati');
  const addCardBtn = document.getElementById('checkoutAddCardBtn');
  const cardLogosRow = document.getElementById('checkoutCardLogosRow');

  const activeCls = 'py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
  const inactiveCls = 'py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';

  if (tabCard) tabCard.className = method === 'card' ? activeCls : inactiveCls;
  if (tabErip) tabErip.className = method === 'erip' ? activeCls : inactiveCls;
  if (tabOplati) tabOplati.className = method === 'oplati' ? activeCls : inactiveCls;

  if (addCardBtn) addCardBtn.style.display = method === 'card' ? '' : 'none';
  if (cardLogosRow) cardLogosRow.style.display = method === 'card' ? '' : 'none';

  window.renderCheckoutCards();
};

window.renderCheckoutCards = function() {
  const container = document.getElementById('checkoutCardsList');
  if (!container) return;

  const method = window._checkoutPaymentMethod || 'card';

  if (method === 'erip') {
    container.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">🏛️</span>
            <span class="text-xs font-bold text-white">Система «Расчет» (ЕРИП) bePaid</span>
          </div>
          <span class="text-[9px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30">0% КОМИССИЯ</span>
        </div>
        <p class="text-[11px] text-white/70 leading-relaxed">
          Счёт будет сформирован автоматически после нажатия кнопки «Оплатить». Оплата в приложении любого банка РБ без ввода данных карты.
        </p>
      </div>
    `;
    return;
  }

  if (method === 'oplati') {
    container.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">О!</span>
            <span class="text-xs font-bold text-white">Сервис «Оплати» (Белинвестбанк)</span>
          </div>
          <span class="text-[9px] font-bold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30">QR • КЭШБЭК</span>
        </div>
        <p class="text-[11px] text-white/70 leading-relaxed">
          QR-код и ссылка в мобильное приложение «Оплати» откроются сразу после нажатия кнопки «Оплатить». Мгновенный платеж в 1 клик.
        </p>
      </div>
    `;
    return;
  }

  const cards = Array.isArray(window.userCards) ? window.userCards : [];
  if (cards.length === 0) {
    container.innerHTML = `
      <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 text-center space-y-2">
        <p class="text-xs text-white/70">У вас пока нет привязанных банковских карт</p>
        <button type="button" class="btn-primary w-full py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 font-bold shadow-md shadow-cyan-500/20" onclick="window.openAddCardModal(() => { if (typeof recalculateOrderTotals === 'function') recalculateOrderTotals(); })">
          <span>+ Привязать карту (bePaid)</span>
        </button>
      </div>
    `;
    return;
  }

  const cardsHtml = cards.map((c, idx) => {
    const brand = c.card_brand || c.card_type || 'Банковская карта';
    const last4 = c.last4 || c.card_last4 || '••••';
    const exp = c.expiry_metadata || (c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '12/28');
    const isSelected = c.is_default || idx === 0;
    const bankName = c.bank_name || '';
    const bankCode = c.bank_code || '';
    const bankLogoHtml = getBankLogoHtml(bankCode || bankName);

    return `
      <label class="flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${isSelected ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/50 shadow-md shadow-cyan-500/10' : 'bg-slate-900/70 border border-white/10 hover:border-white/20'}">
        <div class="flex items-center gap-3">
          <input type="radio" name="selectedCheckoutCard" value="${c.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 accent-cyan-400 cursor-pointer" onchange="window.selectCheckoutCard('${c.id}')">
          <div class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 select-none shadow-sm flex-shrink-0">
            ${getCardBrandLogoHtml(brand, 'max-h-5 max-w-full')}
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${bankLogoHtml ? `<span class="inline-flex items-center">${bankLogoHtml}</span>` : (bankName ? `<span class="text-xs font-bold text-white">${bankName}</span>` : '')}
              <span class="text-xs font-mono font-bold text-white tracking-wider">•••• ${last4}</span>
              ${c.is_default ? '<span class="text-[8px] text-cyan-300 font-bold bg-cyan-500/20 px-1.5 py-0.5 rounded-full border border-cyan-400/40">Осн.</span>' : ''}
            </div>
            <p class="text-[10px] text-white/40 mt-0.5">${brand} · ${exp} · bePaid</p>
          </div>
        </div>
        <span class="text-[10px] text-cyan-400 font-mono font-bold">1 клик</span>
      </label>
    `;
  }).join('');

  const addMoreHtml = cards.length < 5 ? `
    <button type="button" class="w-full py-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 border border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all active:scale-95" onclick="window.openAddCardModal(() => { if (typeof recalculateOrderTotals === 'function') recalculateOrderTotals(); })">
      <span>+ Привязать ещё одну карту</span>
    </button>
  ` : '';

  container.innerHTML = `
    <div class="space-y-2">
      ${cardsHtml}
      ${addMoreHtml}
    </div>
  `;
};

window.selectCheckoutCard = function(cardId) {
  if (Array.isArray(window.userCards)) {
    window.userCards.forEach(c => { c.is_default = (c.id === cardId); });
  }
  tgUtil.haptic('light');
  window.renderCheckoutCards();
};

window.openAddCardModal = function(onSuccess) {
  tgUtil.haptic('light');

  const rateLimit = getCardRateLimitStatus();
  if (rateLimit.blocked) {
    tgUtil.alert(`⏳ Слишком много попыток ввода карты. В целях безопасности подождите ${rateLimit.remainingMin} мин.`);
    return;
  }

  window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
  if (window.userCards.length >= 5) {
    tgUtil.alert('Достигнут максимальный лимит 5 карт на одного клиента (Раздел 23 ТЗ).');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'addCardModal';

  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeAddCardBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center font-bold text-sm text-white">Привязать карту</div>
      <div style="width: 48px;"></div>
    </div>
    <div class="full-screen-modal-body space-y-4" id="addCardModalContent">

      <!-- Живая интерактивная банковская карта (ISO ID-1, динамический банк и платежная система) -->
      <div class="relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-500 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-white/15" id="liveCardPreview">
        <!-- Световой блик пластика -->
        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none"></div>

        <!-- 1. Верхний ряд: Логотип банка слева + Логотип системы справа -->
        <div class="relative z-10 flex items-center justify-between gap-3 min-h-[26px]">
          <div id="liveCardBankSlot" class="flex items-center min-w-0 transition-opacity duration-300">
            <span class="text-[11px] font-black tracking-widest uppercase text-white/70 font-sans truncate" id="liveCardBankName">БАНК</span>
          </div>

          <div id="liveCardBrandSlot" class="flex items-center justify-center flex-shrink-0 transition-all duration-300">
            <span class="text-xs text-white/50 select-none">💳</span>
          </div>
        </div>

        <!-- 2. Средняя часть: Золотистый EMV-чип (без лишних значков/черкашей) -->
        <div class="relative z-10 my-auto flex items-center pt-0.5">
          <div class="w-9 h-6.5 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-inner relative overflow-hidden p-0.5 flex-shrink-0">
            <div class="w-full h-full border border-amber-900/20 rounded-sm grid grid-cols-2 gap-0.5 opacity-80">
              <div class="border-r border-b border-amber-900/30"></div>
              <div class="border-b border-amber-900/30"></div>
              <div class="border-r border-amber-900/30"></div>
              <div></div>
            </div>
          </div>
        </div>

        <!-- 3. Нижняя часть: Номер карты и срок действия -->
        <div class="relative z-10 space-y-1">
          <div id="liveCardNumber" class="font-mono text-sm sm:text-base font-bold text-white tracking-[0.18em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none">
            •••• •••• •••• ••••
          </div>

          <div class="flex items-end justify-between text-left pt-0.5">
            <div>
              <p class="text-[7px] uppercase tracking-wider text-white/40 font-bold select-none leading-none">СРОК ДЕЙСТВИЯ</p>
              <p id="liveCardExpiry" class="text-xs font-mono font-bold text-white/90 mt-0.5 select-none tracking-wider">ММ/ГГ</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Карточка формы ввода реквизитов (WB style) -->
      <form id="addCardForm" autocomplete="on" onsubmit="event.preventDefault();" class="space-y-3 pt-1">
        
        <!-- Поле: Номер карты -->
        <div>
          <div class="rounded-2xl bg-slate-900/90 border border-white/15 focus-within:border-cyan-400 p-3 transition shadow-inner">
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] uppercase font-bold text-white/40 tracking-wider">Номер карты</span>
              <span id="detectedBrandBadge" class="text-[11px] font-bold text-cyan-300 hidden"></span>
            </div>
            <div class="flex items-center gap-2.5">
              <span id="cardBrandIcon" class="text-xl select-none">💳</span>
              <input 
                type="text" 
                id="cardNumInput" 
                name="cardnumber" 
                autocomplete="cc-number" 
                inputmode="numeric" 
                maxlength="19" 
                placeholder="0000 0000 0000 0000" 
                class="w-full bg-transparent text-white text-base font-mono font-bold tracking-[0.12em] focus:outline-none placeholder:text-white/20"
              >
            </div>
          </div>
          <!-- Ошибка алгоритма Луна -->
          <div id="cardNumError" class="text-[11px] text-amber-400 mt-1.5 px-2 hidden flex items-center gap-1.5 font-medium">
            <span>⚠️</span>
            <span>В номере карты опечатка — проверьте цифры</span>
          </div>

          <!-- Предупреждение о зарубежной карте (Тинькофф, Сбер РФ и др.) -->
          <div id="foreignCardNotice" class="hidden rounded-2xl p-3.5 mt-2.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5 shadow-lg shadow-amber-950/20 transition-all">
            <span class="text-lg flex-shrink-0 leading-none">🌍</span>
            <div class="space-y-1">
              <div class="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <span>Только для карт белорусских банков</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">BY ONLY</span>
              </div>
              <p class="text-[11px] text-amber-200/90 leading-relaxed">
                Сервис ICE LOGIX принимает к оплате и привязке только карты, выпущенные банками Республики Беларусь. Карты зарубежных банков (включая Тинькофф, Сбер РФ и другие банки РФ/мира) не поддерживаются эквайрингом bePaid.
              </p>
              <p class="text-[10px] text-amber-300/80 font-medium pt-0.5">
                Пожалуйста, укажите карту любого банка РБ (Беларусбанк, Приорбанк, МТБанк, Белгазпромбанк, Альфа-Банк РБ и др.).
              </p>
            </div>
          </div>
        </div>

        <!-- Ряд: Срок действия и CVV / CVC -->
        <div class="grid grid-cols-2 gap-2.5">
          <!-- Срок действия -->
          <div class="rounded-2xl bg-slate-900/90 border border-white/15 focus-within:border-cyan-400 p-3 transition shadow-inner">
            <span class="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">Срок действия</span>
            <input 
              type="text" 
              id="cardExpInput" 
              name="cc-exp" 
              autocomplete="cc-exp" 
              inputmode="numeric" 
              maxlength="5" 
              placeholder="ММ/ГГ" 
              class="w-full bg-transparent text-white text-sm font-mono font-bold focus:outline-none placeholder:text-white/20"
            >
          </div>

          <!-- CVV / CVC -->
          <div>
            <div class="rounded-2xl bg-slate-900/90 border border-white/15 focus-within:border-cyan-400 p-3 transition shadow-inner">
              <span class="block text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">CVV / CVC</span>
              <input 
                type="password" 
                id="cardCvcInput" 
                name="cvc" 
                autocomplete="cc-csc" 
                inputmode="numeric" 
                maxlength="3" 
                placeholder="•••" 
                class="w-full bg-transparent text-white text-sm font-mono font-bold focus:outline-none placeholder:text-white/20"
              >
            </div>
            <p class="text-[9px] text-white/40 text-right pr-2 mt-1">3 цифры на обороте</p>
          </div>
        </div>

        <!-- Кнопка «Привязать карту» (активируется при валидных данных) -->
        <button 
          type="submit" 
          id="submitAddCardBtn" 
          disabled 
          class="w-full py-3.5 mt-2 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-white/10 text-white/30 cursor-not-allowed select-none"
        >
          <span>Привязать карту</span>
        </button>
      </form>

      <!-- Линейка поддерживаемых платежных систем (стиль WB: чистый ряд без фона) -->
      <div class="pt-3 pb-1 flex flex-col items-center gap-2.5">
        <div class="flex items-center justify-center gap-3.5 select-none py-1">
          <img src="/assets/payment-methods/visa.webp" alt="VISA" class="h-3.5 w-auto object-contain select-none" loading="lazy">
          <img src="/assets/payment-methods/mastercard.webp" alt="Mastercard" class="h-4 w-auto object-contain select-none" loading="lazy">
          <img src="/assets/payment-methods/maestro.webp" alt="Maestro" class="h-4 w-auto object-contain select-none" loading="lazy">
          <img src="/assets/payment-methods/belkart.webp" alt="Белкарт" class="h-4 w-auto object-contain select-none" loading="lazy">
          <img src="/assets/payment-methods/mir.webp" alt="МИР" class="h-3.5 w-auto object-contain select-none" loading="lazy">
          <img src="/assets/payment-methods/unionpay.webp" alt="UnionPay" class="h-4 w-auto object-contain select-none" loading="lazy">
        </div>
        <div class="flex items-center justify-center gap-1.5 text-[10px] text-white/50">
          <span>🔒</span>
          <span>Безопасный эквайринг <strong>bePaid (РБ)</strong> · Стандарт PCI DSS</span>
        </div>
        <p class="text-[10px] text-white/40 text-center leading-relaxed px-2">
          Для проверки карты блокируется <strong>1.00 ${window.bynSign ? window.bynSign() : ''}</strong> и сразу возвращается.
        </p>
      </div>

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
  const expInput = document.getElementById('cardExpInput');
  const cvcInput = document.getElementById('cardCvcInput');
  const brandIcon = document.getElementById('cardBrandIcon');
  const brandBadge = document.getElementById('detectedBrandBadge');
  const submitBtn = document.getElementById('submitAddCardBtn');
  const addCardForm = document.getElementById('addCardForm');
  const numErrorEl = document.getElementById('cardNumError');

  function updateBrandVisual(rawDigits) {
    const brand = detectCardType(rawDigits);
    const bank = detectBank(rawDigits);
    const isForeign = rawDigits.length >= 6 && !bank;

    if (rawDigits.length >= 2 && brand && brand !== 'Банковская карта') {
      brandIcon.innerHTML = `<span class="inline-flex items-center justify-center bg-white/10 rounded-lg px-2 py-1 shadow-sm border border-white/15">${getCardBrandLogoHtml(brand, 'max-h-4 max-w-[38px]')}</span>`;
    } else {
      brandIcon.innerText = '💳';
    }

    const foreignNoticeEl = document.getElementById('foreignCardNotice');
    if (foreignNoticeEl) {
      if (isForeign) {
        foreignNoticeEl.classList.remove('hidden');
      } else {
        foreignNoticeEl.classList.add('hidden');
      }
    }

    if (brandBadge) {
      if (bank) {
        brandBadge.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bank.badgeBg}">${getBankLogoHtml(bank.code, 'max-h-3 max-w-[50px]')} ${bank.shortName}</span>`;
        brandBadge.classList.remove('hidden');
      } else if (isForeign) {
        brandBadge.innerHTML = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">🌍 Зарубежная карта</span>`;
        brandBadge.classList.remove('hidden');
      } else if (brand && brand !== 'Банковская карта') {
        brandBadge.innerHTML = `<span class="text-[11px] font-bold text-cyan-300">${brand}</span>`;
        brandBadge.classList.remove('hidden');
      } else {
        brandBadge.innerText = '';
        brandBadge.classList.add('hidden');
      }
    }

    // Обновляем интерактивную пластиковую карту
    const liveCard = document.getElementById('liveCardPreview');
    const bankSlot = document.getElementById('liveCardBankSlot');
    const brandSlot = document.getElementById('liveCardBrandSlot');
    const numSlot = document.getElementById('liveCardNumber');

    if (liveCard) {
      if (bank) {
        liveCard.className = `relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-500 shadow-2xl bg-gradient-to-br ${bank.cardGradient} border ${bank.cardBorder} ${bank.cardGlow}`;
        if (bankSlot) {
          bankSlot.innerHTML = getBankLogoHtml(bank.code, 'h-5 max-h-[22px] w-auto object-contain');
        }
      } else if (isForeign) {
        liveCard.className = 'relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-500 shadow-2xl bg-gradient-to-br from-[#1c130d] via-[#151010] to-[#2b170a] border border-amber-500/50 shadow-amber-950/40 ring-1 ring-amber-400/20';
        if (bankSlot) {
          bankSlot.innerHTML = '<span class="inline-flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-amber-400 font-sans"><span>🌍</span> <span>ЗАРУБЕЖНАЯ КАРТА</span></span>';
        }
      } else {
        liveCard.className = 'relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-500 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-white/15';
        if (bankSlot) {
          bankSlot.innerHTML = '<span class="text-[11px] font-black tracking-widest uppercase text-white/70 font-sans truncate" id="liveCardBankName">БАНК</span>';
        }
      }

      if (brandSlot) {
        if (brand && brand !== 'Банковская карта') {
          brandSlot.innerHTML = `<div class="flex items-center justify-center">${getCardBrandLogoHtml(brand, 'max-h-5 max-w-[55px]')}</div>`;
        } else {
          brandSlot.innerHTML = '<span class="text-xs text-white/50 select-none">💳</span>';
        }
      }

      if (numSlot) {
        let displayDigits = rawDigits || '';
        let padded = displayDigits + '••••••••••••••••'.substring(displayDigits.length, 16);
        numSlot.innerText = `${padded.substring(0, 4)} ${padded.substring(4, 8)} ${padded.substring(8, 12)} ${padded.substring(12, 16)}`;
      }
    }
  }

  window.testFillCard = function(bankCode) {
    const testMap = {
      belveb: { num: '4169000000000009', exp: '12/28', cvc: '777' },
      vtb: { num: '4034870000000008', exp: '12/28', cvc: '777' },
      dabrabyt: { num: '4168000000000000', exp: '12/28', cvc: '777' },
      paritet: { num: '4052560000000002', exp: '12/28', cvc: '777' },
      mtbank: { num: '4374570000000002', exp: '12/28', cvc: '777' },
      belinvest: { num: '4187010000000006', exp: '12/28', cvc: '777' },
      belarusbank: { num: '9860180000000000', exp: '12/28', cvc: '777' },
      belagroprom: { num: '4058770000000001', exp: '12/28', cvc: '777' },
      prior: { num: '4094280000000007', exp: '12/28', cvc: '777' },
      sber: { num: '4188680000000005', exp: '12/28', cvc: '777' },
      technobank: { num: '5471740000000000', exp: '12/28', cvc: '777' },
      bsb: { num: '4255240000000006', exp: '12/28', cvc: '777' },
      bnb: { num: '4374560000000003', exp: '12/28', cvc: '777' },
      belgazprom: { num: '4255150000000007', exp: '12/28', cvc: '777' },
      alfa: { num: '4255200000000000', exp: '12/28', cvc: '777' }
    };
    const c = testMap[bankCode];
    if (!c || !numInput || !expInput || !cvcInput) return;

    numInput.value = c.num.replace(/(.{4})/g, '$1 ').trim();
    expInput.value = c.exp;
    cvcInput.value = c.cvc;

    updateBrandVisual(c.num);
    const expSlot = document.getElementById('liveCardExpiry');
    if (expSlot) expSlot.innerText = c.exp;
    validateForm();

    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) {
      tgUtil.haptic('selection');
    }
  };

  function validateForm() {
    const rawNum = (numInput.value || '').replace(/\D/g, '');
    const expVal = (expInput.value || '').trim();
    const [mmStr, yyStr] = expVal.split('/');
    const cvcVal = (cvcInput.value || '').trim();

    let isNumValid = false;
    if (rawNum.length === 16) {
      if (checkLuhn(rawNum)) {
        isNumValid = true;
        if (numErrorEl) numErrorEl.classList.add('hidden');
      } else {
        isNumValid = false;
        if (numErrorEl) numErrorEl.classList.remove('hidden');
      }
    } else {
      if (numErrorEl) numErrorEl.classList.add('hidden');
    }

    let isExpValid = false;
    if (mmStr && yyStr && mmStr.length === 2 && yyStr.length === 2) {
      const mm = parseInt(mmStr, 10);
      const yy = parseInt(yyStr, 10);
      if (mm >= 1 && mm <= 12 && yy >= 24) {
        isExpValid = true;
      }
    }
    const isCvcValid = cvcVal.length === 3;

    const detectedBank = detectBank(rawNum);
    const isForeignCard = rawNum.length === 16 && !detectedBank;

    const canSubmit = isNumValid && isExpValid && isCvcValid && !isForeignCard;
    submitBtn.disabled = !canSubmit;

    if (isForeignCard) {
      submitBtn.className = 'w-full py-3.5 mt-2 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed select-none shadow-inner';
      submitBtn.innerHTML = '<span>🚫 Только карты банков Беларуси</span>';
    } else if (canSubmit) {
      submitBtn.className = 'w-full py-3.5 mt-2 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-95 hover:opacity-95';
      submitBtn.innerHTML = '<span>Привязать карту</span>';
    } else {
      submitBtn.className = 'w-full py-3.5 mt-2 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-white/10 text-white/30 cursor-not-allowed select-none';
      submitBtn.innerHTML = '<span>Привязать карту</span>';
    }
    return canSubmit;
  }

  numInput.oninput = (e) => {
    let digits = e.target.value.replace(/\D/g, '').substring(0, 16);
    let formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    e.target.value = formatted;
    updateBrandVisual(digits);
    validateForm();
    if (digits.length === 16) {
      expInput.focus();
    }
  };

  expInput.oninput = (e) => {
    let digits = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (digits.length >= 2) {
      let mm = parseInt(digits.substring(0, 2), 10);
      if (mm > 12) digits = '12' + digits.substring(2);
      if (mm === 0) digits = '01' + digits.substring(2);
      e.target.value = digits.substring(0, 2) + '/' + digits.substring(2);
    } else {
      e.target.value = digits;
    }
    const expSlot = document.getElementById('liveCardExpiry');
    if (expSlot) {
      expSlot.innerText = e.target.value.trim() || 'ММ/ГГ';
    }
    validateForm();
    if (digits.length === 4) {
      cvcInput.focus();
    }
  };

  expInput.onkeydown = (e) => {
    if (e.key === 'Backspace' && expInput.value.endsWith('/')) {
      e.preventDefault();
      expInput.value = expInput.value.slice(0, -1);
      validateForm();
    }
  };

  cvcInput.oninput = (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
    validateForm();
  };

  if (addCardForm) {
    addCardForm.onsubmit = (e) => {
      e.preventDefault();
      if (!submitBtn.disabled) submitBtn.click();
    };
  }

  submitBtn.onclick = async () => {
    if (!validateForm()) return;

    const rawNum = numInput.value.replace(/\D/g, '');
    const bankCheck = detectBank(rawNum);
    if (!bankCheck) {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('error');
      if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
        tgUtil.alert('🚫 Доступ возможен только картам банков Беларуси.\n\nКарты зарубежных банков (включая Тинькофф, Сбер РФ и другие) не поддерживаются эквайрингом bePaid. Пожалуйста, привяжите карту любого белорусского банка.');
      }
      return;
    }

    // Антифрод проверка лимита попыток
    const limitCheck = getCardRateLimitStatus();
    if (limitCheck.blocked) {
      tgUtil.alert(`⏳ Слишком много попыток. Подождите ${limitCheck.remainingMin} мин.`);
      return;
    }
    const attemptResult = recordCardAttempt();
    if (attemptResult && attemptResult.blocked) {
      tgUtil.alert(`⏳ Превышен лимит попыток. В целях безопасности подождите 10 мин.`);
      return;
    }

    // rawNum уже объявлен выше
    const expVal = expInput.value;
    const [mm, yy] = expVal.split('/');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      <span>Проверка bePaid...</span>
    `;

    const cardType = detectCardType(rawNum);
    const bankInfo = detectBank(rawNum);
    const expMeta = `${String(mm).padStart(2, '0')}/${String(yy).slice(-2)}`;
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);

    // Токенизация bePaid без сохранения полного номера и CVV (Раздел 2.2, 12, 13, 23 ТЗ)
    const newCard = {
      user_id: curUserId,
      provider: 'bepaid_mock',
      provider_token_id: 'tok_bepaid_' + Math.random().toString(36).substring(2, 10),
      card_brand: cardType,
      bank_name: bankInfo ? bankInfo.name : null,
      bank_code: bankInfo ? bankInfo.code : null,
      last4: rawNum.slice(-4),
      expiry_metadata: expMeta,
      is_default: (window.userCards || []).length === 0,
      status: 'ACTIVE'
    };

    try {
      if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { data, error } = await supabaseClient.from('payment_methods').insert(newCard).select();
        if (!error && data && data.length > 0) {
          newCard.id = data[0].id;
        } else {
          newCard.id = 'c_' + Date.now();
        }
      } else {
        newCard.id = 'c_' + Date.now();
      }
    } catch (_e) {
      newCard.id = 'c_' + Date.now();
    }

    // Успешная привязка — сбрасываем антифрод счётчик
    clearCardRateLimit();

    window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
    window.userCards.unshift(newCard);
    try {
      if (curUserId) localStorage.setItem('ice_payment_methods_' + curUserId, JSON.stringify(window.userCards));
    } catch (_e) {}

    const bankGreeting = bankInfo ? ` (${bankInfo.name})` : '';
    tgUtil.haptic('success');
    tgUtil.alert(`✅ Карта ${cardType}${bankGreeting} •••• ${newCard.last4} успешно привязана!\nПроверочный платёж возвращен на ваш счет.`);
    close();

    window.renderCheckoutCards();
    if (typeof onSuccess === 'function') onSuccess(newCard);
  };
};

window.openCardsManagementModal = async function() {
  tgUtil.haptic('light');
  await window.loadUserCards();
  window.userCards = Array.isArray(window.userCards) ? window.userCards : [];

  const modal = document.createElement('div');
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'cardsManageModal';

  const renderCardListHtml = () => {
    const cards = Array.isArray(window.userCards) ? window.userCards : [];
    if (cards.length === 0) {
      return `
        <div class="text-center py-6 text-white/50 text-xs bg-slate-900/60 rounded-2xl border border-white/5 p-4">
          <p class="text-3xl mb-2 select-none">💳</p>
          <p class="font-semibold text-white/80 text-sm">У вас нет сохраненных карт</p>
          <p class="text-[11px] text-white/40 mt-1">Привяжите карту для быстрой оплаты заказов в 1 клик</p>
        </div>
      `;
    }
    return cards.map(c => {
      const brand = c.card_brand || c.card_type || 'Банковская карта';
      const bank = c.bank_name || '';
      const bankCode = c.bank_code || '';
      const bankLogoHtml = getBankLogoHtml(bankCode || bank);
      const last4 = c.last4 || c.card_last4 || '••••';
      const exp = c.expiry_metadata || (c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '12/28');
      const isDef = Boolean(c.is_default);

      return `
        <div class="p-3.5 rounded-2xl ${isDef ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/50 shadow-md shadow-cyan-500/10' : 'bg-slate-900/80 border border-white/10'} flex items-center justify-between gap-3 transition hover:border-white/20">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 select-none flex-shrink-0 shadow-sm">
              ${getCardBrandLogoHtml(brand, 'max-h-6 max-w-full')}
            </div>
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                ${bankLogoHtml ? `<span class="inline-flex items-center">${bankLogoHtml}</span>` : (bank ? `<span class="text-xs font-bold text-white">${bank}</span>` : '')}
                <span class="text-xs font-mono font-bold text-white tracking-wider">•••• ${last4}</span>
                ${isDef ? '<span class="text-[9px] text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/40">Основная</span>' : ''}
              </div>
              <p class="text-[10px] text-white/40 mt-0.5">${brand} · ${exp} · bePaid</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            ${!isDef ? `
              <button type="button" class="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-cyan-500/20 text-[10px] text-cyan-300 font-semibold transition active:scale-95" onclick="window.setDefaultCard('${c.id}')">
                Сделать основной
              </button>
            ` : ''}
            <button type="button" class="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition active:scale-95" onclick="window.deleteCard('${c.id}')" title="Удалить карту">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  const cardsCount = (window.userCards || []).length;

  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeCardsManageBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center font-bold text-sm text-white">Способы оплаты</div>
      <div style="width: 48px;"></div>
    </div>

    <div class="full-screen-modal-body space-y-4" id="cardsManageModalContent">

      <!-- Список сохраненных карт -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold text-white/80">Сохраненные карты</span>
          <div class="flex items-center gap-2 select-none">
            <span class="text-[10px] text-white/40 mr-0.5">bePaid:</span>
            <img src="/assets/payment-methods/visa.webp" alt="VISA" class="h-3 w-auto object-contain" loading="lazy">
            <img src="/assets/payment-methods/mastercard.webp" alt="MC" class="h-3.5 w-auto object-contain" loading="lazy">
            <img src="/assets/payment-methods/maestro.webp" alt="Maestro" class="h-3.5 w-auto object-contain" loading="lazy">
            <img src="/assets/payment-methods/belkart.webp" alt="БК" class="h-3.5 w-auto object-contain" loading="lazy">
            <img src="/assets/payment-methods/mir.webp" alt="МИР" class="h-3 w-auto object-contain" loading="lazy">
            <img src="/assets/payment-methods/unionpay.webp" alt="UPI" class="h-3.5 w-auto object-contain" loading="lazy">
          </div>
        </div>
        <div id="modalCardsList" class="space-y-2 max-h-56 overflow-y-auto pr-0.5">
          ${renderCardListHtml()}
        </div>
      </div>

      <!-- Кнопка добавления карты (стиль WB: тайл или кнопка) -->
      ${cardsCount < 5 ? `
        <button id="modalAddNewCardBtn" type="button" class="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all active:scale-95 shadow-sm">
          <span class="text-base leading-none font-black">+</span>
          <span>Привязать карту</span>
        </button>
      ` : `
        <div class="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
          <p class="text-[11px] text-amber-300 font-semibold">Достигнут максимальный лимит 5 карт</p>
        </div>
      `}

      <!-- Раздел: Возврат денег (Скриншот 2 WB) -->
      <div class="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
        <div class="flex items-center gap-2 text-white/80 font-bold text-[11px]">
          <span>🛡️</span>
          <span>Возврат средств</span>
        </div>
        <p class="text-[10px] text-white/40 leading-relaxed">
          При отмене заказа или возврате товара деньги моментально зачисляются на привязанную карту без комиссий.
        </p>
      </div>

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

    window.renderManageCardsModalList = () => {
      const listEl = document.getElementById('modalCardsList');
      if (listEl) listEl.innerHTML = renderCardListHtml();
    };
  };

  window.setDefaultCard = async (cardId) => {
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
    window.userCards.forEach(c => { c.is_default = (c.id === cardId); });
    window.userCards.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return 0;
    });
    if (curUserId) {
      try { localStorage.setItem('ice_payment_methods_' + curUserId, JSON.stringify(window.userCards)); } catch (_) {}
      if (window.IcePay) await window.IcePay.setDefaultCard(cardId);
    }
    if (typeof window._renderFinancesCardsOnly === 'function') window._renderFinancesCardsOnly();
    if (typeof window.renderManageCardsModalList === 'function') window.renderManageCardsModalList();
    if (typeof window.renderCheckoutCards === 'function') window.renderCheckoutCards();
    if (typeof tgUtil !== 'undefined' && tgUtil.toast) tgUtil.toast('Основная карта обновлена');
  };

  window.deleteCard = async (cardId) => {
    let confirmed = false;
    try {
      if (typeof tgUtil !== 'undefined' && tgUtil.confirm) {
        confirmed = await tgUtil.confirm('Удалить эту карту?');
      } else {
        confirmed = window.confirm('Удалить эту карту?');
      }
    } catch (_) {
      confirmed = window.confirm('Удалить эту карту?');
    }
    if (!confirmed) return;

    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
    window.userCards = window.userCards.filter(c => c.id !== cardId);
    if (window.userCards.length > 0 && !window.userCards.some(c => c.is_default)) {
      window.userCards[0].is_default = true;
    }
    if (curUserId) {
      try { localStorage.setItem('ice_payment_methods_' + curUserId, JSON.stringify(window.userCards)); } catch (_) {}
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        if (window.IcePay) await window.IcePay.deleteCard(cardId);
      }
    }
    if (typeof window._renderFinancesCardsOnly === 'function') window._renderFinancesCardsOnly();
    if (typeof window.renderManageCardsModalList === 'function') window.renderManageCardsModalList();
    if (typeof window.renderCheckoutCards === 'function') window.renderCheckoutCards();
    if (typeof tgUtil !== 'undefined' && tgUtil.toast) tgUtil.toast('Карта удалена');
  };


// Оплата этапа заказа из «Мои заказы» ('FIRST' — если при оформлении оплата сорвалась, 'SECOND' — после взвешивания).
// Сумму этапа считает сервер (order_pay), здесь только выбор способа и сколько взять с баланса.
window.openStagePayment = function (orderId, stage, amount) {
  const U = window.UI;
  const due = Math.round(Number(amount || 0) * 100) / 100;
  const bal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
  const sign = window.bynSign();
  const money = (v) => `${window.moneyText(v)}${sign}`;
  const row = (label, v) => `<div class="co-total-row"><span>${label}</span><span>${v < 0 ? '−' : ''}${money(Math.abs(v))}</span></div>`;
  const LABELS = { card: 'Картой', erip: 'Через ЕРИП', oplati: 'Через «Оплати»' };
  let method = 'card';
  let useBal = false;
  let busy = false;
  tgUtil.haptic('light');

  U.sheet({
    title: stage === 'FIRST' ? 'Оплата заказа' : 'Оплата доставки',
    html: `
      <div class="co-total-now"><span>К оплате</span><b>${money(due)}</b></div>
      <p class="co-note-line">${stage === 'FIRST'
        ? `Заказ #${orderId.slice(0, 8)}: вещи, упаковка и часть доставки. Остальное — после взвешивания на складе.`
        : `Заказ #${orderId.slice(0, 8)}: остаток доставки и страховка после взвешивания.`}</p>
      <div class="fn-seg co-gap" data-st-tabs>
        <button type="button" class="on" data-m="card">Карта</button><button type="button" data-m="erip">ЕРИП</button><button type="button" data-m="oplati">Оплати</button>
      </div>
      ${bal > 0 ? `
        <div class="rd-card rd-list co-gap">
          <label class="rd-row co-opt">
            <span class="rd-row-body"><span class="rd-row-title">Списать с баланса</span><span class="rd-row-text">Доступно ${money(bal)}</span></span>
            <span class="rd-switch"><input type="checkbox" data-st-bal><span></span></span>
          </label>
        </div>` : ''}
      <div class="co-gap" data-st-rows></div>
      <button type="button" class="rd-btn rd-btn-block co-gap" data-st-pay></button>`,
    onOpen(wrap, close) {
      const btn = wrap.querySelector('[data-st-pay]');
      const split = () => {
        const fromBal = useBal ? Math.round(Math.min(bal, due) * 100) / 100 : 0;
        return { fromBal, rest: Math.max(0, Math.round((due - fromBal) * 100) / 100) };
      };
      const paint = () => {
        const { fromBal, rest } = split();
        wrap.querySelector('[data-st-rows]').innerHTML = fromBal > 0 ? row('С баланса', -fromBal) + (rest > 0 ? row(LABELS[method], rest) : '') : '';
        btn.disabled = busy;
        btn.classList.toggle('is-busy', busy);
        btn.innerHTML = busy ? '<span>Проводим оплату…</span>' : `<span>${rest > 0 ? 'Оплатить' : 'Оплатить с баланса'}&nbsp;${money(rest > 0 ? rest : fromBal)}</span>`;
      };
      wrap.querySelectorAll('[data-st-tabs] button').forEach((b) => {
        b.onclick = () => {
          method = b.dataset.m;
          wrap.querySelectorAll('[data-st-tabs] button').forEach((x) => x.classList.toggle('on', x === b));
          paint();
        };
      });
      const balChk = wrap.querySelector('[data-st-bal]');
      if (balChk) balChk.onchange = () => { useBal = balChk.checked; paint(); };
      btn.onclick = async () => {
        if (busy) return;
        busy = true;
        paint();
        const { fromBal, rest } = split();
        try {
          const pr = await window.IcePay.payOrder(orderId, stage, fromBal, method);
          if (!pr || !pr.ok) throw new Error((pr && pr.error) || 'Не получилось провести оплату');
          if (pr.balance !== undefined && pr.balance !== null) window.setUserBalance(pr.balance);
          else await window.refreshUserBalance();
          tgUtil.haptic('success');
          if (pr.status === 'paid') {
            tgUtil.alert(stage === 'FIRST'
              ? `Заказ #${orderId.slice(0, 8)} оплачен. Берём его в работу.`
              : `Доставка по заказу #${orderId.slice(0, 8)} оплачена. Готовим отправку.`);
          } else if (!(pr.redirect_url || pr.erip || pr.sandbox)) {
            tgUtil.alert(`К оплате ${window.moneyText(pr.remaining ?? rest)}. Продолжим, как только подтвердим оплату.`);
          }
          close();
          if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
        } catch (err) {
          tgUtil.haptic('error');
          tgUtil.alert('Оплата не прошла: ' + err.message);
          await window.refreshUserBalance();
          busy = false;
          paint();
        }
      };
      paint();
    }
  });
};
window.openSecondPaymentModal = (orderId, amount) => window.openStagePayment(orderId, 'SECOND', amount);

window.openInvoiceModal = (orderId, originalPrice) => {
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'invoiceTypeModal';
  
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeInvModalBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center font-bold text-sm text-white">Создание инвойса</div>
      <div style="width: 48px;"></div>
    </div>
    
    <div class="full-screen-modal-body space-y-4" id="invModalContent">
      
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
        <label class="text-white/70 text-xs block inline-flex items-center gap-1">Укажите цену для клиента (${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}):</label>
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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'yandexMapModal';
  
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeYMapModalBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <h3 class="text-white font-bold text-base truncate">Выбор на карте</h3>
        <p class="text-white/40 text-[10px]">Пункты выдачи и доставка</p>
      </div>
    </div>
    
    <div class="full-screen-modal-body space-y-4 flex flex-col justify-between" id="yMapModalContent">
      <!-- Контейнер для Яндекс.Карт -->
      <div id="yandexMapContainer" class="flex-1 min-h-[300px] bg-slate-800 rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center p-6 text-center">
        <div class="space-y-2">
          <div class="text-3xl mb-2">📍</div>
          <p class="text-cyan-400 font-bold text-sm">Интеграция с Яндекс Картами</p>
          <p class="text-white/60 text-xs">Для полноценной работы нужно добавить API ключ Яндекса.</p>
          <p class="text-white/60 text-xs">Здесь появится интерактивная карта для выбора адреса / отделения.</p>
        </div>
      </div>
      
      <button id="btnConfirmMapStub" class="btn-primary w-full py-3.5 rounded-xl font-bold flex justify-center items-center gap-2">
        Сохранить тестовый адрес
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const close = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.remove(), 250);
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
              ${window.moneyText(Number(goodsByn))} ${window.bynSign ? window.bynSign() : ''}
            </td>
          </tr>
          ${!isB2b ? `
          <tr>
            <td style="padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
              <strong>Service Fee (Commission)</strong>
            </td>
            <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: 600;">
              ${window.moneyText(Number(order.commission_byn||0))} ${window.bynSign ? window.bynSign() : ''}
            </td>
          </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
        <div style="width: 300px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="font-size: 14px; color: #4b5563;">Subtotal:</span>
            <span style="font-weight: 600;">${window.moneyText(Number(totalByn))} ${window.bynSign ? window.bynSign() : ''}</span>
          </div>
          ${!isB2b ? `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #111827;">
            <span style="font-size: 14px; color: #4b5563;">Paid (Prepayment):</span>
            <span style="font-weight: 600;">${window.moneyText(Number(order.prepayment_amount||0))} ${window.bynSign ? window.bynSign() : ''}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 15px 0;">
            <span style="font-size: 18px; font-weight: 800; color: #111827;">TOTAL DUE:</span>
            <span style="font-size: 18px; font-weight: 800; color: #0284c7;">${window.moneyText(isB2b ? totalByn : (totalByn - (order.prepayment_amount||0)))} ${window.bynSign ? window.bynSign() : ''}</span>
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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'insuranceClaimModal';
  
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeClaimModalBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <h3 class="text-white font-bold text-base truncate">Страховой случай</h3>
        <p class="text-amber-400 text-[10px]">Оформление претензии</p>
      </div>
    </div>
    
    <div class="full-screen-modal-body space-y-5" id="claimModalContent">
      <div class="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4 rounded-xl text-xs text-white/80 leading-relaxed relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-amber-500/10 text-6xl">🛡️</div>
        <p class="font-bold text-amber-300 mb-2 text-sm flex items-center gap-1.5"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></span> Условия возмещения:</p>
        <ul class="space-y-1.5 pl-1 relative z-10">
          <li class="flex items-start gap-1.5">
            <span class="text-amber-400 mt-0.5">•</span>
            <span>Полный возврат стоимости (<strong>${window.moneyText(orderTotal)} ${window.bynSign ? window.bynSign() : ''}</strong>) начисляется на ваш баланс после проверки.</span>
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
  
  const close = () => {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.remove(), 250);
  };
  
  document.getElementById('closeClaimModalBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
  
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


window.selectImportedCalculationByIndex = (idx) => {
  try {
    const list = window._cachedImportCalcs || [];
    const c = list[idx];
    if (!c) throw new Error('Расчет не найден');

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
    console.error('Import calculation error:', e);
    if (typeof glassToast === 'function') {
      glassToast('Ошибка импорта расчета', { kind: 'error' });
    }
  }
};

window.selectImportedCalculation = (param) => {
  if (typeof param === 'number') {
    return window.selectImportedCalculationByIndex(param);
  }
  try {
    let c = null;
    if (typeof param === 'string') {
      c = JSON.parse(decodeURIComponent(param));
    } else if (typeof param === 'object' && param !== null) {
      c = param;
    }
    if (c) {
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
    }
  } catch(e) {
    console.error('selectImportedCalculation error:', e);
  }
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
if (typeof getCardBrandLogoHtml === 'function') window.getCardBrandLogoHtml = getCardBrandLogoHtml;
if (typeof selectImportedCalculationByIndex === 'function') window.selectImportedCalculationByIndex = selectImportedCalculationByIndex;
if (typeof selectImportedCalculation === 'function') window.selectImportedCalculation = selectImportedCalculation;
