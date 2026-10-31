// ============================================================
// ICE LOGIX Module: Calculator & Pricing Logic
// ============================================================
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
        weight: item.weight || null,
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
    weight: item.weight || null,
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
              <span class="rd-mode-title">По фото</span>
              <span class="rd-mode-text">Загрузите фото вещи, а мы найдём такую же на Pinduoduo.</span>
            </span>
            <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
          </div>

          <div class="calc-mode-card rd-mode" role="button" tabindex="0" onclick="window.setCalcMode('text')">
            <span class="rd-mode-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></svg></span>
            <span class="rd-mode-body">
              <span class="rd-mode-title">По описанию</span>
              <span class="rd-mode-text">Опишите вещь своими словами: «серое худи Nike оверсайз».</span>
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

  // 3–4. ПОИСК ПО ФОТО И ПО ОПИСАНИЮ (pdd-search.js, очередь pdd_jobs)
  if ((mode === 'photo' || mode === 'text') && window.PddSearch) {
    return `${window.PddSearch.render(mode)}${renderFooter()}`;
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
        if (window._pendingCalcUrl && urlInp && analyzeBtn) {
          urlInp.value = window._pendingCalcUrl;
          window._pendingCalcUrl = null;
          setTimeout(() => analyzeBtn.click(), 0);
        }

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

                  // Pinduoduo не берём отсюда: старые записи без срока, со снимками экрана и плохим названием
                  const { data: cachedRows } = (isPdd && window.PddProduct) ? { data: null } : await cacheQuery;

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

                // 2. Новая очередь pdd_jobs: живой прогресс, промежуточный результат (ADR-009)
                if (isPdd && window.PddProduct) {
                  const showStep = (label, pct, partial) => {
                    if (!statusBox) return;
                    const name = partial && (partial.title_ru || partial.title);
                    const safe = (t) => (window.UI && window.UI.esc ? window.UI.esc(t) : t);
                    statusBox.innerHTML = `<span class="ug-load"><i></i>${safe(label)}${pct ? ` · ${Math.min(99, pct)}%` : ''}</span>`
                      + (name ? `<div class="mt-1 opacity-70">${safe(name)}</div>` : '');
                  };
                  const bundle = await window.PddProduct.fetch(url, showStep);
                  if (bundle) {
                    handleParsedBundle(bundle);
                    handled = true;
                    return;
                  }
                }

                // 3. Старая очередь parse_queue (если новой очереди в базе нет)
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

      // ── 2–3. ПОИСК ПО ФОТО И ПО ОПИСАНИЮ ──
      if ((mode === 'photo' || mode === 'text') && window.PddSearch) {
        window.PddSearch.attach(mode);
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

        const bk = res.breakdown || {};
        item.total_byn = res.total_byn;
        // Цена вещи без упаковки и пошлины: они считаются один раз на всю посылку
        item.unit_byn = Math.round((res.total_byn - (bk.packaging_cost_byn || 0) - (bk.customs_duty_byn || 0)) * 100) / 100;
        aggregatedTotal += res.total_byn * item.quantity;
        aggregatedWeight += weight * item.quantity;
        aggregatedOriginalPrice += item.price * item.quantity;

        aggregatedBreakdown.product_cost_byn += (bk.product_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.delivery_cost_byn += (bk.delivery_cost_byn || 0) * item.quantity;
        aggregatedBreakdown.commission_byn += (bk.commission_byn || 0) * item.quantity;
        aggregatedBreakdown.insurance_byn += (bk.insurance_byn || 0) * item.quantity;
        aggregatedBreakdown.currency_buffer_byn += (bk.currency_buffer_byn || 0) * item.quantity;

        if (res.warnings && res.warnings.length) {
          res.warnings.forEach(w => {
            if (!/лимит/i.test(w) && !aggregatedWarnings.includes(w)) aggregatedWarnings.push(w);
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
      
      // Тариф по Беларуси клиент платит перевозчику при получении (так и написано на экране), в сумму заказа он не входит.
      // Раньше это держалось на том, что ключи способов (europoshta, belpochta, sdek) не совпадали с LOCAL_DELIVERY_RATES.
      const pvsCost = 0;
      
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
      const extrasLines = [];
      const multiPackage = ['CN', 'PL', 'RU'].filter((c) => packages[c].length > 0).length > 1;

      for (const country of ['CN', 'PL', 'RU']) {
        const pkgItems = packages[country];
        if (pkgItems.length === 0) continue;

        const suffix = multiPackage ? ` (${country === 'CN' ? 'Китай' : country === 'PL' ? 'Европа' : 'Россия'})` : '';
        const extras = window.tempOrder.packageExtras[country] || {};

        if (window.tempOrder.consolidation[country] && pkgItems.length >= 2) {
          consolidationDiscountTotal += 3;
          extrasLines.push({ label: 'Объединение в одну коробку' + suffix, amount: -3 });
        }
        if (extras.bubble) {
          extraServicesTotal += 3;
          extrasLines.push({ label: 'Пузырчатая плёнка' + suffix, amount: 3 });
        }
        if (extras.wood) {
          extraServicesTotal += 10;
          extrasLines.push({ label: 'Деревянная обрешётка' + suffix, amount: 10 });
        }
        if (extras.check) {
          extraServicesTotal += 5;
          extrasLines.push({ label: 'Проверка на брак' + suffix, amount: 5 });
        }
      }

      // Цены услуг написаны на экране, а движок их не считает: прибавляем здесь
      if (extraPhoto) {
        extraServicesTotal += 3;
        extrasLines.push({ label: 'Детальные фото', amount: 3 });
      }
      if (extraMeasure) {
        extraServicesTotal += 3;
        extrasLines.push({ label: 'Замеры', amount: 3 });
      }
      window.tempOrder.extras_lines = extrasLines;
      window.tempOrder.extras_total = extraServicesTotal - consolidationDiscountTotal;

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

      // Пошлина считается на посылку одному получателю (лимит 200 евро и 31 кг), а не на каждую вещь.
      // На двух получателей посылка делится пополам, и лимит проверяется для каждого.
      const pricingRates = await window.iceLogixPricing.getExchangeRates();
      const parcelDuty = (value, kg) => window.iceLogixPricing.calculateCustomsDuty(value, kg, pricingRates).duty;
      const parcelValue = aggregatedBreakdown.product_cost_byn;
      const dutyOne = Math.round(parcelDuty(parcelValue, aggregatedWeight) * 100) / 100;
      const dutySplit = Math.round(parcelDuty(parcelValue / 2, aggregatedWeight / 2) * 2 * 100) / 100;
      const hasRecipients = Boolean(window.userRecipients && window.userRecipients.length > 0);
      if (dutyOne <= 0 || !hasRecipients) window.tempOrder.useCustomsSplit = false;
      const useCustomsSplit = window.tempOrder?.useCustomsSplit || false;
      aggregatedBreakdown.customs_duty_byn = useCustomsSplit ? dutySplit : dutyOne;

      const splitPlaceholder = document.getElementById('customsSplitPlaceholder');
      if (splitPlaceholder) {
        const money = (v) => window.moneyText(v);
        if (dutyOne <= 0) {
          splitPlaceholder.innerHTML = '';
        } else if (hasRecipients) {
          const currentRecId = window.tempOrder?.customsSplitRecipientId || '';
          const recOptions = window.userRecipients.map((r) => `<option value="${r.id}" ${currentRecId === r.id ? 'selected' : ''}>${window.UI.esc(r.full_name || 'Получатель')}</option>`).join('');
          splitPlaceholder.innerHTML = `
            <div class="rd-card rd-list co-duty">
              <label class="rd-row co-opt" for="orderUseCustomsSplit">
                <span class="rd-row-body">
                  <span class="rd-row-title">Разделить на двух получателей</span>
                  <span class="rd-row-text">Пошлина ${money(dutyOne)} на одного. На двоих ${dutySplit > 0 ? money(dutySplit) : 'её не будет'}: лимит 200 евро у каждого свой</span>
                </span>
                <span class="rd-switch"><input type="checkbox" id="orderUseCustomsSplit" ${useCustomsSplit ? 'checked' : ''}><span></span></span>
              </label>
              <div class="rd-row ${useCustomsSplit ? '' : 'hidden'}" id="customsSplitRecipientSelect">
                <div class="rd-field co-grow"><select id="splitRecipientDropdown" class="co-select" data-gx-skip><option value="">Выберите второго получателя</option>${recOptions}</select>${window.UI.icon('chevD', 18)}</div>
              </div>
            </div>`;
          const chk = document.getElementById('orderUseCustomsSplit');
          const drop = document.getElementById('splitRecipientDropdown');
          if (chk) {
            chk.onchange = () => {
              window.tempOrder.useCustomsSplit = chk.checked;
              recalculateOrderTotals();
            };
          }
          if (drop) {
            drop.onchange = () => {
              window.tempOrder.customsSplitRecipientId = drop.value;
              const rec = window.userRecipients.find((r) => r.id === drop.value);
              if (rec) window.tempOrder.customsSplitRecipientName = rec.full_name;
            };
          }
        } else {
          splitPlaceholder.innerHTML = `<div class="ct-hint co-duty">${window.UI.icon('info', 18)}<span>Посылка дороже лимита, пошлина ${money(dutyOne)}. У каждого получателя свой лимит 200 евро: добавьте второго получателя в профиле, и посылку можно будет разделить.</span></div>`;
        }
      }

      // Фирменная упаковка (Раздел 8 ТЗ: 18 BYN)
      aggregatedBreakdown.packaging_cost_byn = window.iceLogixPricing?.CONFIG?.firm_packaging_byn || 18.0;

      // 70% резерв доставки (Раздел 7 ТЗ)
      aggregatedBreakdown.delivery_reserve_rate = 0.70;
      aggregatedBreakdown.delivery_reserve_byn = Math.round(aggregatedBreakdown.delivery_cost_byn * 0.70 * 100) / 100;
      aggregatedBreakdown.delivery_remainder_est_byn = Math.round((aggregatedBreakdown.delivery_cost_byn - aggregatedBreakdown.delivery_reserve_byn) * 100) / 100;

      // 1-й платеж (Товар + Буфер + Комиссия + Фирменная упаковка 18 BYN + Резерв 70% + Допуслуги - Скидка)
      const firstPaymentRaw = Math.round((
        aggregatedBreakdown.product_cost_byn +
        aggregatedBreakdown.currency_buffer_byn +
        aggregatedBreakdown.commission_byn +
        aggregatedBreakdown.packaging_cost_byn +
        aggregatedBreakdown.delivery_reserve_byn +
        aggregatedBreakdown.video_check_byn +
        aggregatedBreakdown.customs_duty_byn +
        (extraServicesTotal - consolidationDiscountTotal) -
        discount
      ) * 100) / 100;

      // Ориентировочный 2-й платеж (Остаток доставки ~30% + страховка 2% + доставка по РБ)
      const secondPaymentRaw = Math.round((
        aggregatedBreakdown.delivery_remainder_est_byn +
        aggregatedBreakdown.insurance_byn +
        (pvsCost - deliveryDiscount)
      ) * 100) / 100;

      // Скидка перекрыла первый платёж: при нулевом первом этапе сервер (order_stage_due) просит весь остаток заказа сразу.
      // Поэтому и показываем, и записываем весь остаток как первый платёж, чтобы экран и сервер называли одну сумму.
      const discountCoversFirst = firstPaymentRaw <= 0;
      const firstPaymentSubtotal = discountCoversFirst
        ? Math.max(0, Math.round((firstPaymentRaw + secondPaymentRaw) * 100) / 100)
        : firstPaymentRaw;
      const secondPaymentEst = discountCoversFirst ? 0 : secondPaymentRaw;

      // Списание с внутреннего баланса
      const applyBalance = document.getElementById('orderApplyBalance')?.checked || false;
      let balanceUsed = 0;
      const curBal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
      // Заказ уже создан, но оплата сорвалась: сервер считает только остаток этапа, часть могла уйти с баланса
      const unpaid = window._coUnpaid;
      const paidEarlier = unpaid && window.CheckoutUI && unpaid.sig === window.CheckoutUI.orderSig(window.tempOrder.items, firstPaymentSubtotal)
        ? (Number(unpaid.paid) || 0) : 0;
      window.tempOrder.paid_earlier = paidEarlier;
      const stageDue = Math.round((firstPaymentSubtotal - paidEarlier) * 100) / 100;
      if (applyBalance && curBal > 0) {
        balanceUsed = Math.min(Math.max(0, stageDue), curBal);
        balanceUsed = Math.round(balanceUsed * 100) / 100;
      }
      aggregatedBreakdown.balance_used_first_byn = balanceUsed;
      const firstPaymentFinal = Math.max(0, Math.round((stageDue - balanceUsed) * 100) / 100);

      aggregatedBreakdown.first_payment_subtotal_byn = firstPaymentSubtotal;
      aggregatedBreakdown.first_payment_byn = firstPaymentFinal;
      aggregatedBreakdown.second_payment_est_byn = secondPaymentEst;

      const finalTotal = Math.max(0, Math.round((firstPaymentSubtotal + secondPaymentEst) * 100) / 100);
      aggregatedBreakdown.total_byn = finalTotal;

      // База для процентного промокода: полная сумма заказа до скидки
      window.tempOrder.total = finalTotal + discount;
      aggregatedBreakdown.delivery_days = [
        minDeliveryDays === 999 ? 0 : minDeliveryDays,
        maxDeliveryDays === 0 ? 0 : maxDeliveryDays
      ];
      window.tempOrder.weight = aggregatedWeight;
      window.tempOrder.price = aggregatedOriginalPrice;
      window.tempOrder.breakdown = aggregatedBreakdown;
      window.tempOrder.total_byn = finalTotal;
      window.tempOrder.first_payment_byn = firstPaymentFinal;
      window.tempOrder.first_payment_subtotal_byn = firstPaymentSubtotal;
      window.tempOrder.second_payment_est_byn = secondPaymentEst;
      window.tempOrder.discount_covers_first = discountCoversFirst && finalTotal > 0;
      window.tempOrder.balance_used = balanceUsed;
      window.tempOrder.prepayment_amount = firstPaymentFinal;

      const totalSpan = document.getElementById('orderTotal');
      const prepaymentSpan = document.getElementById('prepaymentAmount');
      const firstPaySpan = document.getElementById('firstPaymentAmount');
      const secondPaySpan = document.getElementById('secondPaymentEstimate');
      const btnPaySpan = document.getElementById('btnPayAmount');
      const balRow = document.getElementById('checkoutBalanceAmountRow');
      const balText = document.getElementById('checkoutBalanceUsedText');

      if (totalSpan) totalSpan.innerText = window.moneyText(finalTotal);
      if (prepaymentSpan) prepaymentSpan.innerText = window.moneyText(firstPaymentFinal);
      if (firstPaySpan) firstPaySpan.innerText = window.moneyText(firstPaymentFinal);
      if (secondPaySpan) secondPaySpan.innerText = window.moneyText(secondPaymentEst);
      if (btnPaySpan) btnPaySpan.innerText = window.moneyText(firstPaymentFinal);
      if (balText) balText.innerHTML = window.moneyText(balanceUsed) + (window.bynSign ? window.bynSign() : '');
      if (balRow) balRow.classList.toggle('hidden', !applyBalance || balanceUsed <= 0);

      if (window.CheckoutUI) window.CheckoutUI.refresh();
    };


// Global Exports
if (typeof attachCalculatorHandlers === 'function') window.attachCalculatorHandlers = attachCalculatorHandlers;
if (typeof toBase64 === 'function') window.toBase64 = toBase64;
if (typeof saveCalculationToHistory === 'function') window.saveCalculationToHistory = saveCalculationToHistory;
if (typeof getPlatformCountry === 'function') window.getPlatformCountry = getPlatformCountry;
