// ============================================================
// ICE LOGIX Module: Interactive Marketplace SKU Selector Modal
// High-performance Hardware-in-the-Loop Bridge Integration
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

    let selectedColor = (productData.colors || []).find(c => c.selected) || (productData.colors && productData.colors[0]) || null;
    let selectedSize = (productData.sizes || []).find(s => s.selected) || (productData.sizes && productData.sizes[0]) || null;
    let currentPriceCny = productData.price_cny || 0;
    let currentImgUrl = productData.image_url || '';
    const goodsId = productData.goods_id || '';

    const overlay = document.createElement('div');
    overlay.id = 'skuSelectorModalOverlay';
    overlay.className = 'fixed inset-0 z-[100] flex flex-col justify-end transition-opacity duration-300';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.72)';
    overlay.style.backdropFilter = 'blur(16px)';
    overlay.style.webkitBackdropFilter = 'blur(16px)';
    overlay.style.opacity = '0';

    // Format exchange estimates
    const calcRub = (cny) => Math.round(cny * 13.8);
    const calcByn = (cny) => (cny * 0.46).toFixed(2);

    const colorsHtml = (productData.colors || []).map((col, idx) => {
      const isSel = selectedColor && (selectedColor.name === col.name);
      const imgHtml = col.image_url ? `<img src="${col.image_url}" class="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/20 bg-black/40" alt="${col.name}">` : '';
      return `
        <button type="button" 
          class="sku-color-chip flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer text-left ${isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
          data-color-idx="${idx}"
          data-bounds="${col.bounds || ''}"
          data-name-cn="${col.name}"
          data-img-url="${col.image_url || ''}"
          data-name-ru="${col.name_ru || col.name}">
          ${imgHtml}
          <span>${col.name_ru || col.name}</span>
        </button>
      `;
    }).join('');

    const sizesHtml = (productData.sizes || []).map((sz, idx) => {
      const isSel = selectedSize && (selectedSize.name === sz.name);
      return `
        <button type="button" 
          class="sku-size-chip px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer text-left ${isSel ? 'active-chip bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}" 
          data-size-idx="${idx}"
          data-bounds="${sz.bounds || ''}"
          data-name-cn="${sz.name}"
          data-name-ru="${sz.name_ru || sz.name}">
          ${sz.name_ru || sz.name}
        </button>
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
              <span class="text-xs text-white/50">Аппаратный выкуп</span>
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
              <div class="mt-1.5 flex items-baseline gap-2">
                <span id="skuModalPrice" class="text-xl font-black text-cyan-400">¥${currentPriceCny}</span>
                <span id="skuModalPriceRu" class="text-xs text-white/50">≈ ${calcRub(currentPriceCny)} ₽ / ${calcByn(currentPriceCny)} Br</span>
              </div>
              <div class="text-[11px] text-white/40 mt-0.5">
                Доставка по Китаю: <span class="text-emerald-400 font-semibold">0 ¥ (Бесплатно)</span>
              </div>
            </div>
          </div>

          <!-- Color options -->
          ${productData.colors && productData.colors.length > 0 ? `
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-white/70 uppercase tracking-wider">Цвет / Расцветка</span>
                <span id="skuSelectedColorLabel" class="text-xs font-bold text-cyan-400">${selectedColor ? (selectedColor.name_ru || selectedColor.name) : 'Не выбран'}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                ${colorsHtml}
              </div>
            </div>
          ` : ''}

          <!-- Size options -->
          ${productData.sizes && productData.sizes.length > 0 ? `
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-white/70 uppercase tracking-wider">Размер / Модель</span>
                <span id="skuSelectedSizeLabel" class="text-xs font-bold text-cyan-400">${selectedSize ? (selectedSize.name_ru || selectedSize.name) : 'Не выбран'}</span>
              </div>
              <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                ${sizesHtml}
              </div>
            </div>
          ` : ''}

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

    // Trigger enter animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      const sheet = overlay.querySelector('.sku-bottom-sheet');
      if (sheet) {
        sheet.style.transform = 'translateY(0)';
      }
    });

    overlay.querySelector('#skuCloseBtn').onclick = closeSkuModal;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSkuModal();
    });

    // Helper: update price on screen
    function updatePriceDisplay(price) {
      currentPriceCny = price;
      const pEl = overlay.querySelector('#skuModalPrice');
      const prEl = overlay.querySelector('#skuModalPriceRu');
      if (pEl) pEl.innerText = `¥${price}`;
      if (prEl) prEl.innerText = `≈ ${calcRub(price)} ₽ / ${calcByn(price)} Br`;
    }

    // Color chips click
    const colorChips = overlay.querySelectorAll('.sku-color-chip');
    colorChips.forEach(btn => {
      btn.onclick = async () => {
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
        colorChips.forEach(b => {
          b.classList.remove('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');
          b.classList.add('border-white/10', 'bg-white/5', 'text-white/80');
        });
        btn.classList.remove('border-white/10', 'bg-white/5', 'text-white/80');
        btn.classList.add('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');

        const idx = parseInt(btn.dataset.colorIdx, 10);
        selectedColor = (productData.colors || [])[idx] || null;
        
        const label = overlay.querySelector('#skuSelectedColorLabel');
        if (label && selectedColor) {
          label.innerText = selectedColor.name_ru || selectedColor.name;
        }

        // ⚡ INSTANT Client-side Hero Image Swap (0ms lag, 100% reliable on mobile)
        const targetImg = btn.dataset.imgUrl || (selectedColor && selectedColor.image_url);
        if (targetImg) {
          currentImgUrl = targetImg;
          const img = overlay.querySelector('#skuModalImg');
          if (img) {
            img.style.opacity = '0.35';
            img.src = targetImg;
            setTimeout(() => { img.style.opacity = '1'; }, 80);
          }
        }

        // Tap on device via bridge if bounds exist
        const bounds = btn.dataset.bounds;
        if (bounds && goodsId) {
          const imgLoader = overlay.querySelector('#skuImgLoader');
          if (imgLoader) imgLoader.style.opacity = '1';
          try {
            const resp = await fetch('http://127.0.0.1:3007/api/select-sku', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ goods_id: goodsId, bounds })
            });
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.price_cny) updatePriceDisplay(resData.price_cny);
              if (resData.image_url) {
                currentImgUrl = resData.image_url;
                const img = overlay.querySelector('#skuModalImg');
                if (img) img.src = resData.image_url;
              }
            }
          } catch (e) {
            console.log('Bridge select-sku error:', e);
          } finally {
            if (imgLoader) imgLoader.style.opacity = '0';
          }
        }
      };
    });

    // Size chips click
    const sizeChips = overlay.querySelectorAll('.sku-size-chip');
    sizeChips.forEach(btn => {
      btn.onclick = async () => {
        if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('light');
        sizeChips.forEach(b => {
          b.classList.remove('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');
          b.classList.add('border-white/10', 'bg-white/5', 'text-white/80');
        });
        btn.classList.remove('border-white/10', 'bg-white/5', 'text-white/80');
        btn.classList.add('active-chip', 'bg-gradient-to-r', 'from-cyan-500/25', 'to-blue-500/25', 'border-cyan-400', 'text-cyan-300', 'shadow-[0_0_12px_rgba(6,182,212,0.35)]');

        const idx = parseInt(btn.dataset.sizeIdx, 10);
        selectedSize = (productData.sizes || [])[idx] || null;

        const label = overlay.querySelector('#skuSelectedSizeLabel');
        if (label && selectedSize) {
          label.innerText = selectedSize.name_ru || selectedSize.name;
        }

        // Tap on device via bridge if bounds exist
        const bounds = btn.dataset.bounds;
        if (bounds && goodsId) {
          try {
            const resp = await fetch('http://127.0.0.1:3007/api/select-sku', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ goods_id: goodsId, bounds })
            });
            if (resp.ok) {
              const resData = await resp.json();
              if (resData.price_cny) updatePriceDisplay(resData.price_cny);
            }
          } catch (e) {}
        }
      };
    });

    // Apply button
    overlay.querySelector('#skuApplyBtn').onclick = () => {
      if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic('success');
      closeSkuModal();
      if (typeof onConfirm === 'function') {
        onConfirm({
          color: selectedColor ? (selectedColor.name_ru || selectedColor.name) : '',
          size: selectedSize ? (selectedSize.name_ru || selectedSize.name) : '',
          price: currentPriceCny,
          image_url: currentImgUrl,
          title: productData.title_ru || productData.title,
          brand: productData.brand || '',
          category: productData.category || '',
          marketplace: 'pinduoduo'
        });
      }
    };
  };

})();
