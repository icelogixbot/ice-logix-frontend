// ============================================================
// ICE LOGIX — CLEAN SHOPPING CART MODULE
// Minimalist, Native Mobile UX in Brand Ice-Glass Luxury (Cyan/Sapphire)
// ============================================================

(function () {
  'use strict';

  // Полные данные вещей корзины: нужны для оформления заказа (цена в валюте, вес, категория, ссылка)
  const _cartItemsById = new Map();

  // Площадка по ссылке. Неизвестная ссылка считается Китаем: заказы сейчас идут только оттуда
  function platformFromUrl(url) {
    const u = String(url || '').toLowerCase();
    if (/wildberries|wb\.ru/.test(u)) return 'wildberries';
    if (/ozon\./.test(u)) return 'ozon';
    if (/lamoda/.test(u)) return 'lamoda';
    if (/avito/.test(u)) return 'avito';
    if (/taobao/.test(u)) return 'taobao';
    if (/tmall/.test(u)) return 'tmall';
    if (/1688\./.test(u)) return '1688';
    if (/dewu|poizon/.test(u)) return 'poizon';
    return 'pinduoduo';
  }

  // Вес: сохранённый при расчёте, иначе тот же, что брал калькулятор для такой категории
  function cartItemWeight(it) {
    const saved = parseFloat(it.weight);
    if (saved > 0) return saved;
    if (typeof window.calculateAllInclusiveByn === 'function') {
      const w = window.calculateAllInclusiveByn(it.priceCny, it.category, null, 1).weightKg;
      if (w > 0) return w;
    }
    return 1;
  }

  // --- Helper: Get all unified cart items (Supabase + LocalStorage) ---
  async function loadAllCartItems() {
    const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    const unified = [];

    // 1. Fetch from Supabase `cart`
    if (currentUserId && typeof supabaseClient !== 'undefined') {
      try {
        const { data, error } = await supabaseClient
          .from('cart')
          .select('*, products(*)')
          .eq('user_id', currentUserId)
          .order('added_at', { ascending: false });

        if (!error && data) {
          data.forEach(row => {
            const prod = row.products;
            if (!prod) return;

            let priceByn = 0;
            if (window.iceLogixPricing && typeof window.iceLogixPricing.quickEstimate === 'function') {
              priceByn = window.iceLogixPricing.quickEstimate(prod.price, 1);
            } else {
              priceByn = Number(prod.price || 0) * 0.52;
            }

            let images = [];
            if (typeof getProductImages === 'function') {
              images = getProductImages(prod.image_url);
            } else if (prod.image_url) {
              images = [prod.image_url];
            }

            unified.push({
              id: row.id,
              isCustom: false,
              productId: prod.id,
              title: prod.title || 'Товар',
              imageUrl: images[0] || 'https://via.placeholder.com/150',
              priceCny: Number(prod.price || 0),
              currency: prod.currency || 'CNY',
              priceByn: Number(priceByn.toFixed(2)),
              quantity: Number(row.quantity || 1),
              size: prod.size || '',
              color: prod.color || '',
              category: prod.category || 'Магазин ICE',
              brand: prod.brand || '',
              url: prod.url || ''
            });
          });
        }
      } catch (e) {
        console.error('Failed to load DB cart items:', e);
      }
    }

    // 2. Fetch from LocalStorage `ice_custom_cart` (from Calculator)
    try {
      const localCustom = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
      if (Array.isArray(localCustom)) {
        localCustom.forEach(it => {
          // total_byn из калькулятора посчитан на всё количество, корзина хранит цену за штуку
          let priceByn = it.total_byn ? Number(it.total_byn) / Math.max(1, Number(it.quantity) || 1) : 0;
          if (!priceByn) {
            if (window.iceLogixPricing && typeof window.iceLogixPricing.quickEstimate === 'function') {
              priceByn = window.iceLogixPricing.quickEstimate(it.price, 1);
            } else {
              priceByn = Number(it.price || 0) * 0.52;
            }
          }
          unified.push({
            id: it.id,
            isCustom: true,
            productId: it.id,
            title: it.title || 'Расчет доставки',
            imageUrl: it.image_url || 'https://via.placeholder.com/150',
            priceCny: Number(it.price || 0),
            currency: it.currency || 'CNY',
            weight: it.weight,
            priceByn: Number(priceByn.toFixed(2)),
            quantity: Number(it.quantity || 1),
            size: it.size || '',
            color: it.color || '',
            category: it.category || 'Доставка',
            url: it.url || ''
          });
        });
      }
    } catch (e) {
      console.error('Failed to load local custom cart items:', e);
    }

    _cartItemsById.clear();
    unified.forEach((it) => _cartItemsById.set(String(it.id), it));
    return unified;
  }

  // --- Global Helpers for Fixed Checkout Dock (Locked Above Tab Bar) ---
  function showWbCheckoutDock(count, total) {
    const dock = document.getElementById('wbStickyDock');
    if (!dock) return;
    dock.classList.remove('hidden');
    updateWbCheckoutDock(count, total);
  }
  window.showWbCheckoutDock = showWbCheckoutDock;

  function hideWbCheckoutDock() {
    const dock = document.getElementById('wbStickyDock');
    if (dock) dock.classList.add('hidden');
  }
  window.hideWbCheckoutDock = hideWbCheckoutDock;

  function updateWbCheckoutDock(count, total) {
    const dock = document.getElementById('wbStickyDock');
    const checkoutBtn = document.getElementById('wbCheckoutBtn');
    if (!dock || !checkoutBtn) return;
    dock.classList.remove('hidden');

    if (count > 0) {
      checkoutBtn.className = 'wb-checkout-cta active';
      checkoutBtn.innerHTML = `
        <span>Оформить заказ</span>
        <span class="wb-cta-dot">·</span>
        <span id="wbCheckoutCount">${count} шт.</span>
        <span class="wb-cta-dot">·</span>
        <span id="wbCheckoutTotal" class="inline-flex items-baseline">${Number(total || 0).toFixed(2).replace('.', ',')}${window.bynSign ? window.bynSign({ size: '0.82em' }) : ''}</span>
      `;
    } else {
      checkoutBtn.className = 'wb-checkout-cta disabled';
      checkoutBtn.innerHTML = `<span>Выберите товары для заказа</span>`;
    }
  }
  window.updateWbCheckoutDock = updateWbCheckoutDock;

  // --- Render Clean Cart Screen ---
  async function renderCart() {
    const U = window.UI;
    const fmt = (n) => Number(n || 0).toFixed(2).replace('.', ',');
    const sign = () => (window.bynSign ? window.bynSign({ size: '0.82em' }) : '');
    const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (!currentUserId) {
      hideWbCheckoutDock();
      return `
        <div class="rd-screen wb-cart-screen page-enter">
          <h1 class="rd-h1">Корзина</h1>
          ${U.empty({ icon: 'cart', title: 'Войдите, чтобы собрать заказ', text: 'Корзина сохранится в аккаунте, и вы сможете оформить всё одним заказом.', action: 'Войти через Telegram', onclick: 'window.requireAuth()' })}
        </div>`;
    }

    // Мгновенно показываем кнопку заказа по сохранённому количеству, пока грузится корзина
    try {
      const cachedCount = parseInt(localStorage.getItem('ice_cart_count') || '0', 10);
      if (cachedCount > 0) showWbCheckoutDock(cachedCount, 0);
    } catch (_) {}

    let items = [];
    try {
      items = await loadAllCartItems();
    } catch (e) {
      hideWbCheckoutDock();
      return `<div class="rd-screen wb-cart-screen page-enter"><h1 class="rd-h1">Корзина</h1>${U.empty({ icon: 'alert', title: 'Не удалось загрузить корзину', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Повторить', onclick: 'renderCurrentScreen()' })}</div>`;
    }

    if (items.length === 0) {
      hideWbCheckoutDock();
      return `
        <div class="rd-screen wb-cart-screen page-enter">
          <h1 class="rd-h1">Корзина</h1>
          ${U.empty({ icon: 'cart', title: 'В корзине пока пусто', text: 'Добавляйте вещи из подборок или посчитайте свой товар по ссылке.', action: 'Открыть каталог', actionId: 'wbGoToCatalogBtn' })}
        </div>`;
    }

    let initialTotal = 0;
    let initialCount = 0;
    items.forEach((it) => { initialTotal += it.priceByn * it.quantity; initialCount += it.quantity; });
    showWbCheckoutDock(initialCount, initialTotal);

    const cardsHtml = items.map((it) => {
      const variant = [it.color, it.size ? `Размер ${it.size}` : ''].filter(Boolean).join(' · ');
      const title = U.esc(it.title);
      return `
        <div class="wb-cart-card ct-card" data-cart-id="${it.id}" data-is-custom="${it.isCustom}" data-product-id="${it.productId}" data-price="${it.priceByn}">
          <label class="ct-check" aria-label="Выбрать товар">
            <input type="checkbox" class="wb-checkbox wb-item-cb" data-cart-id="${it.id}" checked>
            <span class="ct-box">${U.icon('check', 16, { stroke: 2.6 })}</span>
          </label>
          <div class="ct-thumb"><img src="${U.esc(it.imageUrl)}" alt="${title}" class="wb-product-thumb" loading="lazy" onerror="this.style.opacity=0"></div>
          <div class="ct-info">
            <div class="ct-title wb-product-title">${title}</div>
            ${variant ? `<div class="ct-variant wb-product-variant">${U.esc(variant)}</div>` : ''}
            <div class="ct-ship">${U.icon('truck', 14)}<span>Доставим за 8–12 дней</span></div>
            <div class="ct-bottom">
              <span class="ct-price wb-current-price"><span class="wb-row-price" data-unit-price="${it.priceByn}">${fmt(it.priceByn * it.quantity)}</span>${sign()}</span>
              <div class="wb-stepper ct-stepper">
                <button type="button" class="wb-stepper-btn wb-step-dec" data-id="${it.id}" aria-label="Меньше">${U.icon('minus', 16)}</button>
                <span class="wb-stepper-value wb-qty-val">${it.quantity}</span>
                <button type="button" class="wb-stepper-btn wb-step-inc" data-id="${it.id}" aria-label="Больше">${U.icon('plus', 16)}</button>
              </div>
            </div>
            <button type="button" class="ct-buy wb-buy-item-btn" data-cart-id="${it.id}">Купить только это</button>
          </div>
          <button type="button" class="ct-more wb-menu-btn" data-cart-id="${it.id}" aria-label="Действия">${U.icon('sliders', 18)}</button>
        </div>`;
    }).join('');

    return `
      <div class="rd-screen wb-cart-screen page-enter">
        <div class="ct-head">
          <h1 class="rd-h1">Корзина</h1>
          <span class="rd-pill" id="wbCartTotalBadge">${items.length} поз.</span>
        </div>

        <div class="ct-bar wb-bulk-bar">
          <label class="ct-check ct-all">
            <input type="checkbox" class="wb-checkbox" id="wbSelectAllCb" checked>
            <span class="ct-box">${U.icon('check', 16, { stroke: 2.6 })}</span>
            <span>Выбрать все</span>
          </label>
          <div class="ct-bar-actions">
            <button type="button" class="ct-icon-btn" id="wbWishlistAllBtn" aria-label="В избранное">${U.icon('heart', 19)}</button>
            <button type="button" class="ct-icon-btn" id="wbShareCartBtn" aria-label="Поделиться">${U.icon('share', 19)}</button>
            <button type="button" class="ct-icon-btn danger" id="wbDeleteSelectedBtn" aria-label="Удалить выбранные">${U.icon('trash', 19)}</button>
          </div>
        </div>

        <div class="ct-list wb-cart-list" id="wbCartList">
          ${cardsHtml}
        </div>

        <div class="rd-card ct-sum">
          <div class="ct-sum-row"><span>Товары, <b id="rdCartSumCount">${initialCount}</b> шт.</span><span id="rdCartSumTotal">${fmt(initialTotal)}${sign()}</span></div>
          <div class="ct-sum-row"><span>Доставка до Минска</span><span class="ct-muted">при оформлении</span></div>
          <div class="ct-sum-line"></div>
          <div class="ct-sum-row ct-sum-total"><span>Итого за товары</span><span id="rdCartSumGrand">${fmt(initialTotal)}${sign()}</span></div>
        </div>

        <div class="ct-hint">${U.icon('info', 18)}<span>Оплата в два этапа: основная часть сейчас, остаток за доставку после взвешивания на складе.</span></div>
      </div>
    `;
  }

  // --- Attach Handlers for Clean Cart ---
  function attachCartHandlers() {
    // 1. "Перейти в каталог" from empty state
    const goToCatalogBtn = document.getElementById('wbGoToCatalogBtn');
    if (goToCatalogBtn) {
      goToCatalogBtn.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        if (typeof switchTab === 'function') switchTab('catalogs');
      };
    }

    // 2. Total recalculation function
    function updateWbTotals() {
      let totalAmount = 0;
      let totalCount = 0;

      const visibleCards = document.querySelectorAll('.wb-cart-card');
      let allChecked = visibleCards.length > 0;

      visibleCards.forEach(card => {
        const cb = card.querySelector('.wb-item-cb');
        if (cb && cb.checked) {
          const qtyVal = parseInt(card.querySelector('.wb-qty-val')?.innerText || '1', 10);
          const price = parseFloat(card.dataset.price || '0');
          totalAmount += price * qtyVal;
          totalCount += qtyVal;
        } else {
          allChecked = false;
        }
      });

      // Update "Выбрать все" checkbox
      const selectAllCb = document.getElementById('wbSelectAllCb');
      if (selectAllCb) {
        selectAllCb.checked = allChecked && visibleCards.length > 0;
      }

      // Update badge in header
      const totalBadge = document.getElementById('wbCartTotalBadge');
      if (totalBadge) totalBadge.innerText = `${visibleCards.length} поз.`;

      // Блок «Итого»
      const _f = (n) => Number(n || 0).toFixed(2).replace('.', ',');
      const _sg = window.bynSign ? window.bynSign({ size: '0.82em' }) : '';
      const _c = document.getElementById('rdCartSumCount'); if (_c) _c.innerText = totalCount;
      const _t = document.getElementById('rdCartSumTotal'); if (_t) _t.innerHTML = _f(totalAmount) + _sg;
      const _g = document.getElementById('rdCartSumGrand'); if (_g) _g.innerHTML = _f(totalAmount) + _sg;

      // Update Sticky Checkout Button
      updateWbCheckoutDock(totalCount, totalAmount);
    }

    // 3. "Выбрать все" Checkbox Handler
    const selectAllCb = document.getElementById('wbSelectAllCb');
    if (selectAllCb) {
      selectAllCb.onchange = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        const checked = selectAllCb.checked;
        const visibleCards = document.querySelectorAll('.wb-cart-card');
        visibleCards.forEach(card => {
          const cb = card.querySelector('.wb-item-cb');
          if (cb) cb.checked = checked;
        });
        updateWbTotals();
      };
    }

    // 4. Individual Checkboxes Handler
    document.querySelectorAll('.wb-item-cb').forEach(cb => {
      cb.onchange = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        updateWbTotals();
      };
    });

    // 5. Stepper +/- Logic
    document.querySelectorAll('.wb-step-dec, .wb-step-inc').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isInc = btn.classList.contains('wb-step-inc');
        const card = btn.closest('.wb-cart-card');
        if (!card) return;

        const cartId = card.dataset.cartId;
        const isCustom = card.dataset.isCustom === 'true';
        const qtySpan = card.querySelector('.wb-qty-val');
        const priceSpan = card.querySelector('.wb-row-price');
        const unitPrice = parseFloat(priceSpan?.dataset.unitPrice || card.dataset.price || '0');
        let currentQty = parseInt(qtySpan?.innerText || '1', 10);

        if (isInc) {
          currentQty++;
        } else {
          if (currentQty <= 1) {
            const confirmed = await tgUtil.confirm('Удалить этот товар из корзины?');
            if (!confirmed) return;
            await removeCartItem(cartId, isCustom, card.dataset.productId);
            card.remove();
            updateWbTotals();
            if (typeof updateCartBadge === 'function') updateCartBadge();
            if (document.querySelectorAll('.wb-cart-card').length === 0) {
              hideWbCheckoutDock();
              renderCurrentScreen();
            }
            return;
          }
          currentQty--;
        }

        // Optimistic UI update
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        qtySpan.innerText = currentQty;
        if (priceSpan) priceSpan.innerText = (unitPrice * currentQty).toFixed(2).replace('.', ',');
        updateWbTotals();

        // Update local memory
        const pid = card.dataset.productId;
        if (pid) {
          window.cartQty = window.cartQty || {};
          window.cartQty[String(pid)] = currentQty;
        }

        // Persist update
        if (isCustom) {
          try {
            const localCustom = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
            const it = localCustom.find(x => String(x.id) === String(cartId));
            if (it) it.quantity = currentQty;
            localStorage.setItem('ice_custom_cart', JSON.stringify(localCustom));
          } catch (_) {}
        } else if (typeof supabaseClient !== 'undefined') {
          await supabaseClient
            .from('cart')
            .update({ quantity: currentQty, updated_at: new Date() })
            .eq('id', cartId);
        }

        if (typeof updateCartBadge === 'function') updateCartBadge();
        if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
      };
    });

    // Helper: Remove cart item from storage
    async function removeCartItem(cartId, isCustom, productId) {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('warning');

      if (isCustom) {
        try {
          let localCustom = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
          localCustom = localCustom.filter(x => String(x.id) !== String(cartId));
          localStorage.setItem('ice_custom_cart', JSON.stringify(localCustom));
        } catch (_) {}
      } else if (typeof supabaseClient !== 'undefined') {
        await supabaseClient.from('cart').delete().eq('id', cartId);
      }

      if (productId) {
        window.cartQty = window.cartQty || {};
        delete window.cartQty[String(productId)];
      }

      if (typeof updateCartBadge === 'function') updateCartBadge();
      if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
    }

    // 6. Individual Item Delete Button (X)
    document.querySelectorAll('.wb-item-remove-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const card = btn.closest('.wb-cart-card');
        if (!card) return;

        const cartId = card.dataset.cartId;
        const isCustom = card.dataset.isCustom === 'true';
        const productId = card.dataset.productId;

        await removeCartItem(cartId, isCustom, productId);
        card.remove();
        updateWbTotals();
        if (typeof updateCartBadge === 'function') updateCartBadge();
        if (document.querySelectorAll('.wb-cart-card').length === 0) {
          hideWbCheckoutDock();
          renderCurrentScreen();
        }
      };
    });

    // 7. Context Menu `•••` Action Sheet
    document.querySelectorAll('.wb-menu-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

        const card = btn.closest('.wb-cart-card');
        if (!card) return;

        const cartId = card.dataset.cartId;
        const isCustom = card.dataset.isCustom === 'true';
        const productId = card.dataset.productId;
        const title = card.querySelector('.wb-product-title')?.innerText || 'Товар';

        // Remove any existing backdrop
        const oldBackdrop = document.querySelector('.wb-sheet-backdrop');
        if (oldBackdrop) oldBackdrop.remove();

        // Create bottom sheet
        const backdrop = document.createElement('div');
        backdrop.className = 'wb-sheet-backdrop';
        backdrop.innerHTML = `
          <div class="wb-sheet">
            <div class="wb-sheet-handle"></div>
            <div class="wb-sheet-title truncate">${title}</div>
            
            <button class="wb-sheet-action" id="wbSheetWishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
              <span>Переместить в избранное</span>
            </button>

            <button class="wb-sheet-action" id="wbSheetCopy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>Скопировать название</span>
            </button>

            <button class="wb-sheet-action danger" id="wbSheetDelete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Удалить из корзины</span>
            </button>
          </div>
        `;

        document.body.appendChild(backdrop);

        const closeSheet = () => {
          backdrop.classList.add('closing');
          setTimeout(() => backdrop.remove(), 200);
        };

        backdrop.onclick = (event) => {
          if (event.target === backdrop) closeSheet();
        };

        backdrop.querySelector('#wbSheetWishlist').onclick = async () => {
          closeSheet();
          if (productId && typeof supabaseClient !== 'undefined' && window.userId) {
            try {
              await supabaseClient.from('wishlist').insert({ user_id: window.userId, product_id: productId });
            } catch (_) {}
          }
          await removeCartItem(cartId, isCustom, productId);
          card.remove();
          updateWbTotals();
          if (typeof updateCartBadge === 'function') updateCartBadge();
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
          tgUtil.alert('Товар перемещен в избранное ♡');
          if (document.querySelectorAll('.wb-cart-card').length === 0) {
            hideWbCheckoutDock();
            renderCurrentScreen();
          }
        };

        backdrop.querySelector('#wbSheetCopy').onclick = () => {
          closeSheet();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(title);
            if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
            tgUtil.alert('Название скопировано в буфер обмена');
          }
        };

        backdrop.querySelector('#wbSheetDelete').onclick = async () => {
          closeSheet();
          await removeCartItem(cartId, isCustom, productId);
          card.remove();
          updateWbTotals();
          if (typeof updateCartBadge === 'function') updateCartBadge();
          if (document.querySelectorAll('.wb-cart-card').length === 0) {
            hideWbCheckoutDock();
            renderCurrentScreen();
          }
        };
      };
    });

    // 7.1. Quick Buy Button on Item ("Купить" like WB)
    document.querySelectorAll('.wb-buy-item-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
        const card = btn.closest('.wb-cart-card');
        if (!card) return;
        const cb = card.querySelector('.wb-item-cb');
        // Uncheck all other items and check only this one
        document.querySelectorAll('.wb-cart-card .wb-item-cb').forEach(c => c.checked = false);
        if (cb) cb.checked = true;
        updateWbTotals();
        const checkoutBtn = document.getElementById('wbCheckoutBtn');
        if (checkoutBtn) checkoutBtn.click();
      };
    });

    // 8. Bulk Wishlist (Heart Icon)
    const wishlistAllBtn = document.getElementById('wbWishlistAllBtn');
    if (wishlistAllBtn) {
      wishlistAllBtn.onclick = async () => {
        const checkedCards = Array.from(document.querySelectorAll('.wb-cart-card')).filter(c => c.querySelector('.wb-item-cb')?.checked);
        if (checkedCards.length === 0) {
          tgUtil.alert('Выберите хотя бы один товар');
          return;
        }

        let addedCount = 0;
        for (const card of checkedCards) {
          const pid = card.dataset.productId;
          if (pid && typeof supabaseClient !== 'undefined' && window.userId) {
            try {
              await supabaseClient.from('wishlist').insert({ user_id: window.userId, product_id: pid });
              addedCount++;
            } catch (_) {}
          }
        }

        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
        tgUtil.alert(`Добавлено в избранное: ${addedCount || checkedCards.length} поз. ♡`);
      };
    }

    // 9. Bulk Share
    const shareCartBtn = document.getElementById('wbShareCartBtn');
    if (shareCartBtn) {
      shareCartBtn.onclick = () => {
        const checkedCards = Array.from(document.querySelectorAll('.wb-cart-card')).filter(c => c.querySelector('.wb-item-cb')?.checked);
        if (checkedCards.length === 0) {
          tgUtil.alert('Выберите хотя бы один товар');
          return;
        }

        const lines = [];
        lines.push('🛒 Корзина ICE LOGIX:');
        checkedCards.forEach(c => {
          const t = c.querySelector('.wb-product-title')?.innerText || 'Товар';
          const p = c.querySelector('.wb-row-price')?.innerText || '0';
          const q = c.querySelector('.wb-qty-val')?.innerText || '1';
          lines.push(`• ${t} (${q} шт.) — ${p}`);
        });

        const shareText = lines.join('\n');
        if (navigator.share) {
          navigator.share({ title: 'Корзина ICE LOGIX', text: shareText }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText);
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
          tgUtil.alert('Список товаров скопирован в буфер обмена!');
        }
      };
    }

    // 10. Bulk Delete Selected Button
    const deleteSelectedBtn = document.getElementById('wbDeleteSelectedBtn');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.onclick = async () => {
        const checkedCards = Array.from(document.querySelectorAll('.wb-cart-card')).filter(c => c.querySelector('.wb-item-cb')?.checked);
        if (checkedCards.length === 0) {
          tgUtil.alert('Выберите хотя бы один товар для удаления');
          return;
        }

        const confirmed = await tgUtil.confirm(`Удалить выбранные товары (${checkedCards.length} поз.) из корзины?`);
        if (!confirmed) return;

        for (const card of checkedCards) {
          await removeCartItem(card.dataset.cartId, card.dataset.isCustom === 'true', card.dataset.productId);
          card.remove();
        }

        updateWbTotals();
        if (typeof updateCartBadge === 'function') updateCartBadge();
        if (document.querySelectorAll('.wb-cart-card').length === 0) {
          hideWbCheckoutDock();
          renderCurrentScreen();
        }
      };
    }

    // 11. Sticky Checkout Button
    const checkoutBtn = document.getElementById('wbCheckoutBtn');
    if (checkoutBtn) {
      checkoutBtn.onclick = () => {
        if (checkoutBtn.classList.contains('disabled')) {
          tgUtil.alert('Выберите хотя бы один товар для оформления');
          return;
        }

        if (window.appSettings && window.appSettings.is_payments_paused) {
          tgUtil.alert(`Оформление заказа временно недоступно.\nПричина: ${window.appSettings.pause_reason}`);
          return;
        }

        const selectedItems = [];
        const visibleCards = document.querySelectorAll('.wb-cart-card');

        visibleCards.forEach(card => {
          const cb = card.querySelector('.wb-item-cb');
          if (cb && cb.checked) {
            const cartId = card.dataset.cartId;
            const productId = card.dataset.productId;
            const title = card.querySelector('.wb-product-title')?.innerText || 'Товар';
            const price = parseFloat(card.dataset.price || '0');
            const quantity = parseInt(card.querySelector('.wb-qty-val')?.innerText || '1', 10);
            const imageUrl = card.querySelector('.wb-product-thumb')?.src || '';
            const full = _cartItemsById.get(String(cartId)) || {};

            // price — цена в валюте площадки: от неё экран оформления считает заказ.
            // total_byn — цена за штуку в рублях, пока не пришёл точный пересчёт.
            selectedItems.push({
              cartId: cartId,
              productId: productId,
              title: title,
              price: Number(full.priceCny) || price,
              currency: full.currency || 'CNY',
              total_byn: price,
              weight: cartItemWeight({ ...full, priceCny: Number(full.priceCny) || price }),
              category: full.category || 'Одежда',
              brand: full.brand || '',
              size: full.size || '',
              color: full.color || '',
              url: full.url || '',
              platform: platformFromUrl(full.url),
              fromCatalog: full.isCustom === false,
              imageUrl: imageUrl,
              image_url: imageUrl,
              quantity: quantity
            });
          }
        });

        if (selectedItems.length === 0) {
          tgUtil.alert('Выберите хотя бы один товар');
          return;
        }

        const total = selectedItems.reduce((sum, item) => sum + item.total_byn * item.quantity, 0);

        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');

        window.tempOrder = {
          items: selectedItems,
          total: total,
          originalTotal: total,
          discountAmount: 0,
          appliedPromo: null
        };

        hideWbCheckoutDock();

        if (typeof switchTab === 'function') {
          switchTab('neworder');
        } else {
          currentTab = 'neworder';
          currentSubScreen = null;
          appliedPromo = null;
          renderCurrentScreen();
        }
      };
    }
  }

  // --- Export globally to window ---
  window.renderWbCart = renderCart;
  window.attachWbCartHandlers = attachCartHandlers;
  window.renderCart = renderCart;
  window.attachCartHandlers = attachCartHandlers;
})();
