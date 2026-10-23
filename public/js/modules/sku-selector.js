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
          const name = s.name_ru || s.name;
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
      const selOpt = selectedState[grp.id];

      const optionsHtml = (grp.options || []).map((opt, optIdx) => {
        const isSel = selOpt && (selOpt.name === opt.name);
        
        if (isVisual) {
          const thumbSrc = opt.thumb_url || opt.image_url;
          const imgHtml = thumbSrc 
            ? `<img src="${thumbSrc}" class="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/20 bg-black/40 shadow-sm" alt="${opt.name_ru || opt.name}" loading="lazy">` 
            : `<span class="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs">🎨</span>`;
          
          return `
            <button type="button" 
              class="sku-chip sku-visual-chip flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer text-left ${isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
              data-group-id="${grp.id}"
              data-opt-idx="${optIdx}"
              data-bounds="${opt.bounds || ''}"
              data-img-url="${opt.image_url || ''}"
              data-name-ru="${opt.name_ru || opt.name}">
              ${imgHtml}
              <span class="truncate max-w-[120px]">${opt.name_ru || opt.name}</span>
            </button>
          `;
        } else {
          return `
            <button type="button" 
              class="sku-chip sku-spec-chip px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer text-left ${isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
              data-group-id="${grp.id}"
              data-opt-idx="${optIdx}"
              data-bounds="${opt.bounds || ''}"
              data-name-ru="${opt.name_ru || opt.name}">
              ${opt.name_ru || opt.name}
            </button>
          `;
        }
      }).join('');

      return `
        <div class="sku-group-block space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <span>${isVisual ? '🎨' : '📏'}</span>
              ${grp.title}
            </span>
            <span id="skuSelectedLabel_${grp.id}" class="text-xs font-bold text-cyan-400">
              ${selOpt ? (selOpt.name_ru || selOpt.name) : 'Не выбран'}
            </span>
          </div>
          <div class="flex flex-wrap gap-2 ${!isVisual && (grp.options || []).length > 8 ? 'max-h-40 overflow-y-auto pr-1' : ''}">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="sku-bottom-sheet w-full max-w-lg mx-auto bg-[#0d1424] border-t border-cyan-500/30 rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] transition-all duration-300 transform translate-y-full" style="background: radial-gradient(130% 120% at 50% 0%, rgba(20, 32, 54, 0.98) 0%, rgba(10, 16, 28, 0.99) 100%);">
        
        <!-- Drag pill & header -->
        <div class="p-4 pb-2 border-b border-white/10 flex-shrink-0">
          <div class="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-3 cursor-pointer" onclick="window.closeSkuModal()"></div>
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

        <!-- Scrollable Options Body -->
        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          
          <!-- Product Summary Card -->
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex gap-3.5 items-center">
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

          <!-- Dynamic Spec Groups -->
          ${groupsHtml}

        </div>

        <!-- Sticky Footer Action -->
        <div class="p-4 border-t border-white/10 bg-[#0a101c]/90 backdrop-blur-md flex-shrink-0 flex flex-col gap-2">
          <button type="button" id="skuApplyBtn" class="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 font-black text-sm text-white shadow-[0_4px_25px_rgba(6,182,212,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span>✨</span> Выбрать этот вариант
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

    function updatePriceDisplay(price) {
      currentPriceCny = price;
      const pEl = overlay.querySelector('#skuModalPrice');
      const prEl = overlay.querySelector('#skuModalPriceRu');
      if (pEl) pEl.innerText = `¥${price}`;
      if (prEl) prEl.innerText = `≈ ${calcRub(price)} ₽ / ${calcByn(price)} Br`;
    }

    function updateSummaryDisplay() {
      const pill = overlay.querySelector('#skuSummaryPill');
      if (pill) pill.innerText = getCombinedSummary();
    }

    // Attach click listeners to all chips
    overlay.querySelectorAll('.sku-chip').forEach(btn => {
      btn.onclick = async () => {
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
          b.classList.add('border-white/10', 'bg-white/5', 'text-white/80');
        });
        btn.classList.remove('border-white/10', 'bg-white/5', 'text-white/80');
        btn.classList.add('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');

        // Update group label
        const grpLabel = overlay.querySelector(`#skuSelectedLabel_${groupId}`);
        if (grpLabel) {
          grpLabel.innerText = opt.name_ru || opt.name;
        }

        updateSummaryDisplay();

        // 1. If Visual group (Color/Appearance): Smooth hero photo swap to clean studio shot
        if (grp.type === 'visual') {
          const targetImg = opt.image_url || masterStudioImg;
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

        // Tap on physical bridge with fast timeout to update price and summary
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
              // Zero-Waste Rule: never overwrite studio photo with screen crop!
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

      if (typeof onConfirm === 'function') {
        onConfirm({
          color: selectedColorOpt ? (selectedColorOpt.name_ru || selectedColorOpt.name) : '',
          size: specSummaryParts.join(', ') || '',
          variant_summary: getCombinedSummary(),
          full_status: getFullStatusLine(),
          price: currentPriceCny,
          image_url: currentImgUrl || masterStudioImg,
          title: productData.title_ru || productData.title,
          brand: productData.brand || '',
          category: productData.category || '',
          marketplace: 'pinduoduo'
        });
      }
    };
  };

})();
