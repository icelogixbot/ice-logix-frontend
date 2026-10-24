// ============================================================
// ICE LOGIX Module: Interactive Marketplace SKU Selector Modal
// High-performance Dynamic Spec Groups & Studio Photography
// Zero-Waste Studio Quality & Iron Rule Separation (Visual vs Specs)
// ============================================================

(function () {
  'use strict';

  let _activeSkuOverlay = null;

  function closeSkuModal() {
    if (!_activeSkuOverlay) return;
    const sheet = _activeSkuOverlay.querySelector('.sku-bottom-sheet');
    if (sheet) {
      sheet.style.transform = 'translateY(100%)';
      sheet.style.opacity = '0';
    }
    _activeSkuOverlay.style.opacity = '0';
    setTimeout(() => {
      if (_activeSkuOverlay && _activeSkuOverlay.parentNode) {
        _activeSkuOverlay.parentNode.removeChild(_activeSkuOverlay);
      }
      _activeSkuOverlay = null;
    }, 280);
  }

  window.closeSkuModal = closeSkuModal;

  window.openSkuSelectorModal = function (productData, onConfirm) {
    if (window.tgUtil && typeof window.tgUtil.haptic === 'function') {
      window.tgUtil.haptic('medium');
    }

    closeSkuModal();

    // 1. Build unified dynamic spec groups and filter out empty groups
    let rawGroups = [];
    if (productData.spec_groups && productData.spec_groups.length > 0) {
      rawGroups = productData.spec_groups;
    } else {
      if ((productData.visual_options && productData.visual_options.length > 0) || (productData.colors && productData.colors.length > 0)) {
        rawGroups.push({
          id: 'group_color',
          title: 'Цвет / Расцветка',
          type: 'visual',
          options: productData.visual_options || productData.colors
        });
      }
      if ((productData.spec_options && productData.spec_options.length > 0) || (productData.sizes && productData.sizes.length > 0)) {
        rawGroups.push({
          id: 'group_size',
          title: 'Размер / Характеристики',
          type: 'spec',
          options: productData.spec_options || productData.sizes
        });
      }
    }

    // Keep only groups with actual selectable options
    const validGroups = rawGroups.filter(g => g && g.options && g.options.length > 0);

    // Sort: Visual groups strictly on top, followed by Spec/Technical groups
    const groups = validGroups.sort((a, b) => {
      if (a.type === 'visual' && b.type !== 'visual') return -1;
      if (a.type !== 'visual' && b.type === 'visual') return 1;
      return 0;
    });

    // Track selected option per group
    const selectedState = {};
    groups.forEach(grp => {
      const foundSel = (grp.options || []).find(o => o.selected) || (grp.options && grp.options[0]) || null;
      selectedState[grp.id] = foundSel;
    });

    let currentPriceCny = productData.price_cny || 0;
    const masterStudioImg = productData.image_url || '';
    let currentImgUrl = masterStudioImg;
    const goodsId = productData.goods_id || '';

    // If initial visual option has its own studio image, use it as default
    const initialVisualGroup = groups.find(g => g.type === 'visual');
    if (initialVisualGroup && selectedState[initialVisualGroup.id]) {
      const initVisualOpt = selectedState[initialVisualGroup.id];
      if (initVisualOpt.image_url) {
        currentImgUrl = initVisualOpt.image_url;
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'skuSelectorModalOverlay';
    overlay.className = 'fixed inset-0 flex flex-col justify-end transition-opacity duration-300';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.zIndex = '99999';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.78)';
    overlay.style.backdropFilter = 'blur(16px)';
    overlay.style.webkitBackdropFilter = 'blur(16px)';
    overlay.style.opacity = '0';

    // Format exchange estimates
    const calcRub = (cny) => Math.round(cny * 13.8);
    const calcByn = (cny) => (cny * 0.46).toFixed(2);

    function formatStandardSize(val) {
      if (!val) return '';
      let str = String(val).trim();

      // Convert weight recommendations from Chinese jin to kg: e.g. "M 建议90-110斤" -> "M (45–55 кг)"
      let weightPart = '';
      const rangeMatch = str.match(/(?:建议)?\s*(\d+)\s*[-–—~至]\s*(\d+)\s*斤/);
      if (rangeMatch) {
        const w1 = Math.round(parseInt(rangeMatch[1], 10) * 0.5);
        const w2 = Math.round(parseInt(rangeMatch[2], 10) * 0.5);
        weightPart = ` (${w1}–${w2} кг)`;
        str = str.replace(/\(?(?:建议)?\s*\d+\s*[-–—~至]\s*\d+\s*斤\)?/g, '').trim();
      } else {
        const singleMatch = str.match(/(?:建议)?\s*(\d+)\s*斤/);
        if (singleMatch) {
          const w = Math.round(parseInt(singleMatch[1], 10) * 0.5);
          weightPart = ` (${w} кг)`;
          str = str.replace(/\(?(?:建议)?\s*\d+\s*斤\)?/g, '').trim();
        }
      }

      str = str.replace(/亚洲尺码|欧码|美码|尺码|标准码|正码|建议|码/g, '').trim();

      if (/^(均码|free|onesize|one\s*size)$/i.test(str)) {
        return `Универсальный${weightPart}`;
      }

      const low = str.toLowerCase();
      const numXl = low.match(/^(\d+)\s*x+l$/);
      if (numXl) {
        str = `${numXl[1]}XL`;
      } else if (/^x+l$/.test(low)) {
        const xCount = (low.match(/x/g) || []).length;
        str = xCount === 1 ? 'XL' : `${xCount}XL`;
      } else if (/^x+s$/.test(low)) {
        const xCount = (low.match(/x/g) || []).length;
        str = xCount === 1 ? 'XS' : `${xCount}XS`;
      } else if (/^[sml]$/.test(low)) {
        str = low.toUpperCase();
      } else {
        str = str.replace(/\b([xX]{2,})[lL]\b/g, (_, xs) => `${xs.length}XL`);
        str = str.replace(/\b([xX])[lL]\b/g, 'XL');
        str = str.replace(/\b(\d+)\s*[xX]+[lL]\b/g, (_, n) => `${n}XL`);
        str = str.replace(/\b([xX]{2,})[sS]\b/g, (_, xs) => `${xs.length}XS`);
        str = str.replace(/\b([xX])[sS]\b/g, 'XS');
        str = str.replace(/\b([sml])\b/gi, (m) => m.toUpperCase());
      }

      return `${str}${weightPart}`.trim() || val;
    }

    function getCombinedSummary() {
      const parts = [];
      const visualGrp = groups.find(g => g.type === 'visual');
      const specGrps = groups.filter(g => g.type === 'spec');

      if (visualGrp && selectedState[visualGrp.id]) {
        const v = selectedState[visualGrp.id];
        parts.push(v.name_ru || v.name);
      }
      specGrps.forEach(g => {
        const s = selectedState[g.id];
        if (s) {
          let name = s.name_ru || s.name;
          if (g.title === 'Размер' || g.id.includes('size')) {
            name = formatStandardSize(name);
          }
          parts.push(name.toLowerCase().startsWith('размер') || name.toLowerCase().startsWith('память') ? name : `${g.title}: ${name}`);
        }
      });

      return parts.join(' • ') || 'Стандарт';
    }

    function getFullStatusLine() {
      const title = productData.title_ru || productData.title || 'Товар';
      const summary = getCombinedSummary();
      const rub = calcRub(currentPriceCny);
      return `${title} • ${summary} • ${rub} ₽`;
    }

    // Render HTML for each group dynamically
    const groupsHtml = groups.map((grp) => {
      const isVisual = grp.type === 'visual';
      const isSizeGroup = grp.title === 'Размер' || grp.id.includes('size');
      const selOpt = selectedState[grp.id];

      const optionsHtml = (grp.options || []).map((opt, optIdx) => {
        const isSel = selOpt && (selOpt.name === opt.name);
        const optPrice = opt.price_cny && opt.price_cny > 0 ? opt.price_cny : null;
        const priceBadge = optPrice 
          ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0">¥${optPrice}</span>` 
          : '';
        const isDis = opt.disabled || false;
        
        if (isVisual) {
          const thumbSrc = opt.thumb_url || opt.image_url;
          const imgHtml = thumbSrc 
            ? `<img src="${thumbSrc}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/20 bg-black/40 shadow-sm" alt="${opt.name_ru || opt.name}" loading="lazy">` 
            : `<span class="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs">🎨</span>`;
          
          return `
            <button type="button" 
              class="sku-chip sku-visual-chip w-full min-h-[52px] flex items-center gap-2.5 p-2 rounded-2xl text-xs font-semibold border transition-all duration-200 cursor-pointer text-left ${isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
              data-group-id="${grp.id}"
              data-opt-idx="${optIdx}"
              data-bounds="${opt.bounds || ''}"
              data-img-url="${opt.image_url || ''}"
              data-price-cny="${opt.price_cny || ''}"
              data-raw-name="${opt.raw_name || opt.name}"
              data-name-ru="${opt.name_ru || opt.name}">
              ${imgHtml}
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <span class="truncate font-bold text-xs text-white leading-tight">${opt.name_ru || opt.name}</span>
              </div>
              ${priceBadge}
            </button>
          `;
        } else {
          const formattedLabel = isSizeGroup ? formatStandardSize(opt.name_ru || opt.name) : (opt.name_ru || opt.name);
          return `
            <button type="button" 
              class="sku-chip sku-spec-chip h-10 w-full flex items-center justify-center rounded-xl text-xs font-bold font-mono border transition-all duration-200 cursor-pointer text-center ${isDis ? 'opacity-30 pointer-events-none cursor-not-allowed line-through border-white/5 bg-white/[0.02] text-white/30' : isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
              data-group-id="${grp.id}"
              data-opt-idx="${optIdx}"
              data-bounds="${opt.bounds || ''}"
              data-price-cny="${opt.price_cny || ''}"
              data-raw-name="${opt.raw_name || opt.name}"
              data-disabled="${isDis ? 'true' : 'false'}"
              data-name-ru="${formattedLabel}">
              <span class="truncate px-1">${formattedLabel}</span>
            </button>
          `;
        }
      }).join('');

      const selLabel = selOpt 
        ? (isSizeGroup ? formatStandardSize(selOpt.name_ru || selOpt.name) : (selOpt.name_ru || selOpt.name))
        : 'Не выбран';

      return `
        <div class="sku-group-block space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <span>${isVisual ? '🎨' : '📏'}</span>
              ${grp.title}
            </span>
            <span id="skuSelectedLabel_${grp.id}" class="text-xs font-bold text-cyan-400 truncate max-w-[180px]">
              ${selLabel}
            </span>
          </div>
          <div class="${isVisual ? 'grid grid-cols-2 gap-2.5' : 'grid grid-cols-4 sm:grid-cols-5 gap-2'} ${!isVisual && (grp.options || []).length > 10 ? 'max-h-48 overflow-y-auto pr-1' : ''}">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="sku-bottom-sheet w-full max-w-lg mx-auto bg-[#0d1424] border-t border-cyan-500/30 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col max-h-[88vh] transition-all duration-300 transform translate-y-full" style="background: radial-gradient(130% 120% at 50% 0%, rgba(20, 32, 54, 0.98) 0%, rgba(10, 16, 28, 0.99) 100%);">
        
        <!-- Drag pill & header -->
        <div class="px-4 pt-3 pb-2 border-b border-white/10 flex-shrink-0">
          <div class="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-2 cursor-pointer" onclick="window.closeSkuModal()"></div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                Pinduoduo Direct
              </span>
              <span class="text-xs text-white/50">Студийный каталог</span>
            </div>
            <button type="button" id="skuCloseBtn" class="w-8 h-8 rounded-full bg-white/10 text-white/70 hover:text-white flex items-center justify-center text-sm font-bold">✕</button>
          </div>
        </div>

        <!-- FIXED HERO HEADER (Always pinned and visible!) -->
        <div class="p-3.5 flex-shrink-0 bg-[#0c1322]/95 border-b border-white/10 backdrop-blur-md">
          <div class="flex gap-3.5 items-center">
            <div class="relative w-24 h-24 rounded-2xl overflow-hidden border border-cyan-500/30 flex-shrink-0 bg-black/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <img id="skuModalImg" src="${currentImgUrl}" alt="Product" class="w-full h-full object-cover transition-opacity duration-200">
              <div id="skuImgLoader" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 pointer-events-none transition-opacity">
                <span class="ix animate-spin text-cyan-400 text-lg">⏳</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="text-white text-xs font-bold line-clamp-2 leading-snug">${productData.title_ru || productData.title}</h4>
              <div class="mt-1 flex items-center gap-1.5">
                <span id="skuSummaryPill" class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 truncate max-w-[220px]">
                  ${getCombinedSummary()}
                </span>
              </div>
              <div class="mt-1.5 flex items-baseline gap-2">
                <span id="skuModalPrice" class="text-xl font-black text-cyan-400">¥${currentPriceCny}</span>
                <span id="skuModalPriceRu" class="text-xs text-white/50">≈ ${calcRub(currentPriceCny)} ₽ / ${calcByn(currentPriceCny)} Br</span>
              </div>
              <div class="text-[11px] text-white/40 mt-0.5">
                Доставка по Китаю: <span class="text-emerald-400 font-semibold">0 ¥ (Бесплатно)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Scrollable Options Body -->
        <div id="skuScrollableBody" class="p-4 overflow-y-auto space-y-4 flex-1">
          <!-- Dynamic Spec Groups -->
          ${groupsHtml}

          <!-- Customs / Seller Limit Warning Banner -->
          <div id="skuCustomsAlert" class="hidden p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs flex items-center gap-2.5 shadow-lg shadow-amber-500/5 transition-all"></div>

          <!-- Quantity Stepper & Add to Bundle -->
          <div class="mt-4 pt-3 border-t border-white/10 space-y-3">
            <div class="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
              <div class="flex flex-col text-left">
                <span class="text-xs font-bold text-white/90">Количество:</span>
                <span class="text-[11px] text-white/40">Для выбранного размера и цвета</span>
              </div>
              <div class="flex items-center gap-2.5">
                <button type="button" id="skuQtyMinus" class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-sm flex items-center justify-center transition cursor-pointer">−</button>
                <span id="skuQtyVal" class="text-sm font-black font-mono text-cyan-400 min-w-[28px] text-center">1</span>
                <button type="button" id="skuQtyPlus" class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-black text-sm flex items-center justify-center transition cursor-pointer">+</button>
              </div>
            </div>

            <button type="button" id="skuAddVariantBtn" class="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer">
              <span>➕</span> Добавить еще один цвет / размер
            </button>
          </div>

          <!-- Bundle Items Section (Multi-Variant List) -->
          <div id="skuBundleSection" class="hidden mt-3 pt-3 border-t border-cyan-500/25 space-y-2 text-left">
            <div class="flex items-center justify-between text-xs font-bold text-white/80 px-1">
              <span class="flex items-center gap-1.5">
                <span>🛍️</span> Набор позиций (<span id="skuBundleCount">0</span> шт.)
              </span>
              <button type="button" id="skuClearBundleBtn" class="text-[11px] text-red-400/80 hover:text-red-400 cursor-pointer bg-transparent border-0">Очистить всё</button>
            </div>
            <div id="skuBundleList" class="space-y-1.5 max-h-48 overflow-y-auto pr-1"></div>
          </div>

        </div>

        <!-- Sticky Footer Action -->
        <div class="p-4 border-t border-white/10 bg-[#0a101c]/95 backdrop-blur-md flex-shrink-0 flex flex-col gap-2">
          <button type="button" id="skuApplyBtn" class="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 font-black text-sm text-white shadow-[0_4px_25px_rgba(6,182,212,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>✨</span> Выбрать этот вариант (1 шт. • ¥${currentPriceCny})
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    _activeSkuOverlay = overlay;

    // Enter animation with fast fallback for mobile webview
    const showModal = () => {
      overlay.style.opacity = '1';
      const sheet = overlay.querySelector('.sku-bottom-sheet');
      if (sheet) sheet.style.transform = 'translateY(0)';
    };
    requestAnimationFrame(showModal);
    setTimeout(showModal, 40);

    overlay.querySelector('#skuCloseBtn').onclick = closeSkuModal;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSkuModal();
    });

    let currentQty = 1;
    const bundleItems = []; // Array of { id, color, size, quantity, price, image_url, summary }

    function updatePriceDisplay(price) {
      currentPriceCny = price;
      const pEl = overlay.querySelector('#skuModalPrice');
      const prEl = overlay.querySelector('#skuModalPriceRu');
      if (pEl) pEl.innerText = `¥${price}`;
      if (prEl) prEl.innerText = `≈ ${calcRub(price)} ₽ / ${calcByn(price)} Br`;
      updateFooterButton();
    }

    function updateSummaryDisplay() {
      const pill = overlay.querySelector('#skuSummaryPill');
      if (pill) pill.innerText = getCombinedSummary();
      updateFooterButton();
    }

    function updateFooterButton() {
      const applyBtn = overlay.querySelector('#skuApplyBtn');
      if (!applyBtn) return;

      if (bundleItems.length === 0) {
        const totalCny = Math.round((currentPriceCny * currentQty) * 100) / 100;
        applyBtn.innerHTML = `<span>✨</span> Выбрать этот вариант (${currentQty} шт. • ¥${totalCny})`;
      } else {
        const totalQty = bundleItems.reduce((acc, it) => acc + it.quantity, 0);
        const totalCny = Math.round(bundleItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) * 100) / 100;
        applyBtn.innerHTML = `<span>✨</span> Подтвердить выбор (${totalQty} шт. • ¥${totalCny})`;
      }
    }

    const MAX_CUSTOMS_SINGLE_VARIANT = 2; // Максимум 2 шт. одного цвета/размера для физлиц
    const MAX_CUSTOMS_TOTAL_PRODUCT = 3;  // Максимум 3 шт. суммарно на один товар

    let sellerLimit = parseInt(productData.seller_limit_qty || 0, 10);
    const getEffectiveVariantLimit = () => (sellerLimit > 0 && sellerLimit < MAX_CUSTOMS_SINGLE_VARIANT) ? sellerLimit : MAX_CUSTOMS_SINGLE_VARIANT;

    function showCustomsWarning(msg) {
      const alertEl = overlay.querySelector('#skuCustomsAlert');
      if (alertEl) {
        alertEl.innerHTML = `<span class="text-base flex-shrink-0">⚠️</span> <span class="leading-tight">${msg}</span>`;
        alertEl.classList.remove('hidden');
        clearTimeout(alertEl._timer);
        alertEl._timer = setTimeout(() => {
          alertEl.classList.add('hidden');
        }, 4500);
      }
    }

    function updateSizesAvailability(disabledList) {
      if (!disabledList || !disabledList.length) return;
      const sizeChips = overlay.querySelectorAll('.sku-chip.sku-spec-chip');
      let currentSelectedSizeDisabled = false;
      let firstAvailableChip = null;

      sizeChips.forEach(chip => {
        const raw = chip.dataset.rawName || '';
        const ru = chip.dataset.nameRu || '';
        const isDis = disabledList.some(d => (raw && raw.includes(d)) || (d && d.includes(raw)) || (ru && ru.includes(d)));
        if (isDis) {
          chip.classList.add('opacity-30', 'pointer-events-none', 'cursor-not-allowed', 'line-through', 'border-white/5', 'bg-white/[0.02]', 'text-white/30');
          chip.classList.remove('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');
          if (chip.classList.contains('active-chip')) {
            currentSelectedSizeDisabled = true;
          }
        } else {
          chip.classList.remove('opacity-30', 'pointer-events-none', 'cursor-not-allowed', 'line-through', 'border-white/5', 'bg-white/[0.02]', 'text-white/30');
          if (!firstAvailableChip) firstAvailableChip = chip;
        }
      });

      if (currentSelectedSizeDisabled && firstAvailableChip) {
        firstAvailableChip.click();
      }
    }

    // Stepper logic with Customs Anti-Commercial Limit
    const qtyValEl = overlay.querySelector('#skuQtyVal');
    overlay.querySelector('#skuQtyMinus').onclick = () => {
      if (currentQty > 1) {
        currentQty--;
        if (qtyValEl) qtyValEl.innerText = currentQty;
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
        updateFooterButton();
      }
    };
    overlay.querySelector('#skuQtyPlus').onclick = () => {
      const effLimit = getEffectiveVariantLimit();
      if (currentQty >= effLimit) {
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('error');
        const warningMsg = (sellerLimit > 0 && sellerLimit < MAX_CUSTOMS_SINGLE_VARIANT)
          ? `Ограничение продавца: не более ${sellerLimit} шт. в одни руки`
          : `Таможенный лимит физлиц: не более ${effLimit} шт. одного варианта во избежание признания посылки коммерческой партией на таможне РБ/ЕАЭС.`;
        showCustomsWarning(warningMsg);
        return;
      }
      currentQty++;
      if (qtyValEl) qtyValEl.innerText = currentQty;
      if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
      updateFooterButton();
    };

    function renderBundleList() {
      const section = overlay.querySelector('#skuBundleSection');
      const listEl = overlay.querySelector('#skuBundleList');
      const countEl = overlay.querySelector('#skuBundleCount');
      if (!section || !listEl) return;

      if (bundleItems.length === 0) {
        section.classList.add('hidden');
        listEl.innerHTML = '';
        updateFooterButton();
        return;
      }

      section.classList.remove('hidden');
      const totalQty = bundleItems.reduce((acc, it) => acc + it.quantity, 0);
      if (countEl) countEl.innerText = totalQty;

      listEl.innerHTML = bundleItems.map(item => `
        <div class="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/10 gap-2.5">
          <img src="${item.image_url}" class="w-9 h-9 rounded-lg object-cover bg-black/40 border border-white/15 flex-shrink-0" onerror="this.src='${masterStudioImg}'">
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-white truncate leading-tight">${item.summary}</div>
            <div class="text-[11px] text-cyan-400 font-semibold mt-0.5">¥${item.price} × ${item.quantity} = <strong class="text-cyan-300">¥${Math.round(item.price * item.quantity * 100) / 100}</strong></div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" class="bundle-minus w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer border-0" data-id="${item.id}">−</button>
            <span class="text-xs font-bold font-mono text-white min-w-[16px] text-center">${item.quantity}</span>
            <button type="button" class="bundle-plus w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center justify-center cursor-pointer border-0" data-id="${item.id}">+</button>
            <button type="button" class="bundle-del w-6 h-6 rounded-lg bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-400 font-bold text-xs flex items-center justify-center ml-1 cursor-pointer border-0" data-id="${item.id}">✕</button>
          </div>
        </div>
      `).join('');

      // Wire bundle item buttons
      listEl.querySelectorAll('.bundle-minus').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.id;
          const found = bundleItems.find(it => it.id === id);
          if (found) {
            if (found.quantity > 1) {
              found.quantity--;
            } else {
              const idx = bundleItems.indexOf(found);
              if (idx !== -1) bundleItems.splice(idx, 1);
            }
            if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
            renderBundleList();
          }
        };
      });

      listEl.querySelectorAll('.bundle-plus').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.id;
          const found = bundleItems.find(it => it.id === id);
          if (found) {
            const effLimit = getEffectiveVariantLimit();
            const totalQty = bundleItems.reduce((acc, it) => acc + it.quantity, 0);
            if (found.quantity >= effLimit) {
              if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('error');
              showCustomsWarning(`Лимит: не более ${effLimit} шт. одного варианта для физлиц.`);
              return;
            }
            if (totalQty >= MAX_CUSTOMS_TOTAL_PRODUCT) {
              if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('error');
              showCustomsWarning(`Таможенный лимит: не более ${MAX_CUSTOMS_TOTAL_PRODUCT} единиц товара в одной посылке во избежание признания коммерческой партией.`);
              return;
            }
            found.quantity++;
            if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
            renderBundleList();
          }
        };
      });

      listEl.querySelectorAll('.bundle-del').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.id;
          const idx = bundleItems.findIndex(it => it.id === id);
          if (idx !== -1) {
            bundleItems.splice(idx, 1);
            if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('medium');
            renderBundleList();
          }
        };
      });

      updateFooterButton();
    }

    // Add current selection to bundle with Customs Total Limit check
    overlay.querySelector('#skuAddVariantBtn').onclick = () => {
      const totalBundleQty = bundleItems.reduce((acc, it) => acc + it.quantity, 0);
      if (totalBundleQty + currentQty > MAX_CUSTOMS_TOTAL_PRODUCT) {
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('error');
        showCustomsWarning(`Таможенный лимит: суммарно не более ${MAX_CUSTOMS_TOTAL_PRODUCT} единиц товара в посылке для физлиц.`);
        return;
      }

      const visualGroup = groups.find(g => g.type === 'visual');
      const specGroupsList = groups.filter(g => g.type === 'spec');

      const selectedColorOpt = visualGroup ? selectedState[visualGroup.id] : null;
      const specSummaryParts = specGroupsList.map(g => {
        const s = selectedState[g.id];
        if (!s) return '';
        const raw = s.name_ru || s.name;
        return (g.title === 'Размер' || g.id.includes('size')) ? formatStandardSize(raw) : raw;
      }).filter(Boolean);

      const colorName = selectedColorOpt ? (selectedColorOpt.name_ru || selectedColorOpt.name) : '';
      const sizeName = specSummaryParts.join(', ') || '';
      const comboKey = `${colorName}___${sizeName}`;

      const existing = bundleItems.find(it => it.key === comboKey);
      if (existing) {
        const effLimit = getEffectiveVariantLimit();
        if (existing.quantity + currentQty > effLimit) {
          if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('error');
          showCustomsWarning(`Лимит: не более ${effLimit} шт. одного варианта.`);
          return;
        }
        existing.quantity += currentQty;
      } else {
        bundleItems.push({
          id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          key: comboKey,
          color: colorName,
          size: sizeName,
          quantity: currentQty,
          price: currentPriceCny,
          image_url: currentImgUrl || masterStudioImg,
          summary: getCombinedSummary()
        });
      }

      currentQty = 1;
      if (qtyValEl) qtyValEl.innerText = '1';
      if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('success');
      renderBundleList();
    };

    overlay.querySelector('#skuClearBundleBtn').onclick = () => {
      bundleItems.length = 0;
      if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
      renderBundleList();
    };

    // Attach click listeners to all chips
    overlay.querySelectorAll('.sku-chip').forEach(btn => {
      btn.onclick = async () => {
        if (btn.dataset.disabled === 'true') return;
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');

        const groupId = btn.dataset.groupId;
        const optIdx = parseInt(btn.dataset.optIdx, 10);
        const grp = groups.find(g => g.id === groupId);
        if (!grp) return;

        const opt = (grp.options || [])[optIdx];
        if (!opt) return;

        // Update selected state for this group
        selectedState[groupId] = opt;

        // Visual toggle in this group
        const groupChips = overlay.querySelectorAll(`.sku-chip[data-group-id="${groupId}"]`);
        groupChips.forEach(b => {
          b.classList.remove('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');
          if (b.dataset.disabled !== 'true') {
            b.classList.add('border-white/10', 'bg-white/5', 'text-white/80');
          }
        });
        btn.classList.remove('border-white/10', 'bg-white/5', 'text-white/80');
        btn.classList.add('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');

        // Update group label
        const grpLabel = overlay.querySelector(`#skuSelectedLabel_${groupId}`);
        if (grpLabel) {
          const isSizeGroup = grp.title === 'Размер' || grp.id.includes('size');
          grpLabel.innerText = isSizeGroup ? formatStandardSize(opt.name_ru || opt.name) : (opt.name_ru || opt.name);
        }

        // Instant Dynamic Price Update from Option Data (Zero Delay!)
        if (opt.price_cny && opt.price_cny > 0) {
          updatePriceDisplay(opt.price_cny);
        }

        updateSummaryDisplay();

        // 1. If Visual group (Color/Appearance): Smooth hero photo swap to clean studio shot
        if (grp.type === 'visual') {
          // Always pick the variant's own distinct 800x800 studio photo, falling back to master studio photo
          const targetImg = opt.image_url || opt.thumb_url || masterStudioImg;

          if (targetImg && targetImg !== currentImgUrl) {
            currentImgUrl = targetImg;
            const imgEl = overlay.querySelector('#skuModalImg');
            if (imgEl) {
              imgEl.style.opacity = '0.35';
              imgEl.src = targetImg;
              setTimeout(() => { imgEl.style.opacity = '1'; }, 90);
            }
          }
        }
        // 2. Iron Rule: If Spec group (size, memory, specs): NEVER touch hero photo!
        // Photo stays pristine as the selected color's studio photo.

        // Tap on physical bridge with fast timeout to update price and size availability
        const bounds = btn.dataset.bounds;
        if (bounds && goodsId) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 900);
            const resp = await fetch('http://127.0.0.1:3007/api/select-sku', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ goods_id: goodsId, bounds }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.price_cny) updatePriceDisplay(resData.price_cny);
              if (resData.seller_limit_qty) {
                sellerLimit = resData.seller_limit_qty;
              }
              if (resData.disabled_sizes && resData.disabled_sizes.length > 0) {
                updateSizesAvailability(resData.disabled_sizes);
              }
            }
          } catch (e) {
            // Expected on mobile devices without direct localhost access
          }
        }
      };
    });

    // Apply button
    overlay.querySelector('#skuApplyBtn').onclick = () => {
      if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('success');
      closeSkuModal();

      const visualGroup = groups.find(g => g.type === 'visual');
      const specGroupsList = groups.filter(g => g.type === 'spec');

      const selectedColorOpt = visualGroup ? selectedState[visualGroup.id] : null;
      const specSummaryParts = specGroupsList.map(g => {
        const s = selectedState[g.id];
        return s ? (s.name_ru || s.name) : '';
      }).filter(Boolean);

      const colorName = selectedColorOpt ? (selectedColorOpt.name_ru || selectedColorOpt.name) : '';
      const sizeName = specSummaryParts.join(', ') || '';

      if (typeof onConfirm === 'function') {
        if (bundleItems.length > 0) {
          const totalQty = bundleItems.reduce((acc, it) => acc + it.quantity, 0);
          const totalCny = Math.round(bundleItems.reduce((acc, it) => acc + (it.price * it.quantity), 0) * 100) / 100;
          const summaryParts = bundleItems.map(it => `${it.summary} × ${it.quantity} шт.`);

          onConfirm({
            is_bundle: true,
            items: bundleItems,
            total_quantity: totalQty,
            total_price_cny: totalCny,
            price: bundleItems[0].price,
            quantity: totalQty,
            color: bundleItems.map(it => it.color).filter(Boolean).join(', '),
            size: bundleItems.map(it => it.size).filter(Boolean).join(', '),
            variant_summary: summaryParts.join('; '),
            full_status: `${productData.title_ru || productData.title} • ${summaryParts.join('; ')} • ${calcRub(totalCny)} ₽`,
            image_url: bundleItems[0].image_url || currentImgUrl || masterStudioImg,
            title: productData.title_ru || productData.title,
            brand: productData.brand || '',
            category: productData.category || '',
            marketplace: 'pinduoduo'
          });
        } else {
          const totalCny = Math.round((currentPriceCny * currentQty) * 100) / 100;
          onConfirm({
            is_bundle: false,
            items: [{
              id: 'b_' + Date.now(),
              color: colorName,
              size: sizeName,
              quantity: currentQty,
              price: currentPriceCny,
              image_url: currentImgUrl || masterStudioImg,
              summary: getCombinedSummary()
            }],
            total_quantity: currentQty,
            total_price_cny: totalCny,
            quantity: currentQty,
            color: colorName,
            size: sizeName,
            variant_summary: `${getCombinedSummary()}${currentQty > 1 ? ` × ${currentQty} шт.` : ''}`,
            full_status: `${productData.title_ru || productData.title} • ${getCombinedSummary()}${currentQty > 1 ? ` × ${currentQty} шт.` : ''} • ${calcRub(totalCny)} ₽`,
            price: currentPriceCny,
            image_url: currentImgUrl || masterStudioImg,
            title: productData.title_ru || productData.title,
            brand: productData.brand || '',
            category: productData.category || '',
            marketplace: 'pinduoduo'
          });
        }
      }
    };
  };

})();
