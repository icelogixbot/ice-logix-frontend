// ============================================================
// ICE LOGIX — CLEAN SHOPPING CART MODULE
// Minimalist, Native Mobile UX in Brand Ice-Glass Luxury (Cyan/Sapphire)
// ============================================================

(function () {
  'use strict';

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

            const oldPriceByn = priceByn * 1.35;

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
              priceByn: Number(priceByn.toFixed(2)),
              oldPriceByn: Number(oldPriceByn.toFixed(2)),
              quantity: Number(row.quantity || 1),
              size: prod.size || '',
              color: prod.color || '',
              category: prod.category || 'Магазин ICE',
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
          let priceByn = it.total_byn || 0;
          if (!priceByn) {
            if (window.iceLogixPricing && typeof window.iceLogixPricing.quickEstimate === 'function') {
              priceByn = window.iceLogixPricing.quickEstimate(it.price, 1);
            } else {
              priceByn = Number(it.price || 0) * 0.52;
            }
          }
          const oldPriceByn = priceByn * 1.35;

          unified.push({
            id: it.id,
            isCustom: true,
            productId: it.id,
            title: it.title || 'Расчет доставки',
            imageUrl: it.image_url || 'https://via.placeholder.com/150',
            priceCny: Number(it.price || 0),
            priceByn: Number(priceByn.toFixed(2)),
            oldPriceByn: Number(oldPriceByn.toFixed(2)),
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
        <span>Заказать</span>
        <span class="text-black/30">·</span>
        <span id="wbCheckoutCount">${count} шт.</span>
        <span class="text-black/30">·</span>
        <span id="wbCheckoutTotal" class="inline-flex items-baseline gap-1">${Number(total || 0).toFixed(2)} ${window.bynSign ? window.bynSign() : ''}</span>
      `;
    } else {
      checkoutBtn.className = 'wb-checkout-cta disabled';
      checkoutBtn.innerHTML = `<span>Выберите товары для заказа</span>`;
    }
  }
  window.updateWbCheckoutDock = updateWbCheckoutDock;

  // --- Render Clean Cart Screen ---
  async function renderCart() {
    const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (!currentUserId) {
      hideWbCheckoutDock();
      return `
        <div class="page-enter wb-cart-screen px-4 py-12 text-center max-w-md mx-auto">
          <div class="wb-empty-icon-wrap mx-auto mb-4">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Корзина</h2>
          <p class="text-white/60 text-sm mb-6">Войдите в аккаунт, чтобы просматривать корзину и оформлять заказы</p>
          <button onclick="window.requireAuth()" class="wb-empty-btn">Войти через Telegram</button>
        </div>
      `;
    }

    // Immediate 0ms dock visibility from cached count while Supabase loads
    try {
      const cachedCount = parseInt(localStorage.getItem('ice_cart_count') || '0', 10);
      if (cachedCount > 0) {
        showWbCheckoutDock(cachedCount, 0);
      }
    } catch (_) {}

    let items = [];
    try {
      items = await loadAllCartItems();
    } catch (e) {
      hideWbCheckoutDock();
      return `
        <div class="wb-cart-screen px-4 py-8 text-center max-w-md mx-auto">
          <p class="text-red-400 font-bold mb-2">Ошибка загрузки корзины</p>
          <p class="text-white/60 text-xs mb-4">${e.message}</p>
          <button onclick="renderCurrentScreen()" class="btn-primary">Повторить</button>
        </div>
      `;
    }

    // 0 items: Empty State
    if (items.length === 0) {
      hideWbCheckoutDock();
      return `
        <div class="wb-cart-screen screen-fade-in">
          <div class="wb-cart-header">
            <div class="wb-cart-title-row">
              <h2 class="wb-cart-title">Корзина</h2>
            </div>
          </div>
          <div class="wb-empty-cart">
            <div class="wb-empty-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="wb-empty-title">В корзине пока пусто</div>
            <div class="wb-empty-desc">Находите оригинальные брендовые вещи в каталоге или рассчитывайте доставку через калькулятор</div>
            <button class="wb-empty-btn" id="wbGoToCatalogBtn">Перейти в каталог</button>
          </div>
        </div>
      `;
    }

    // Initial totals calculation
    let initialTotal = 0;
    items.forEach(it => {
      initialTotal += it.priceByn * it.quantity;
    });

    // Make sure the fixed dock is visible with current state
    showWbCheckoutDock(items.length, initialTotal);

    // Items Cards HTML
    const cardsHtml = items.map(it => {
      const itemSubtotal = (it.priceByn * it.quantity).toFixed(2);
      const variantText = [it.color, it.size ? `Размер: ${it.size}` : ''].filter(Boolean).join(' • ');

      return `
        <div class="wb-cart-card" data-cart-id="${it.id}" data-is-custom="${it.isCustom}" data-product-id="${it.productId}" data-price="${it.priceByn}">
          <div class="wb-card-main-row">
            <div class="wb-card-left">
              <input type="checkbox" class="wb-checkbox wb-item-cb" data-cart-id="${it.id}" checked>
              <div class="wb-product-thumb-wrap">
                <img src="${it.imageUrl}" alt="${it.title.replace(/"/g, '&quot;')}" class="wb-product-thumb" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
              </div>
            </div>
            
            <div class="wb-card-right">
              <div class="wb-card-header-line">
                <div class="wb-product-title" title="${it.title.replace(/"/g, '&quot;')}">${it.title}</div>
                <div class="wb-card-actions-top">
                  <button class="wb-menu-btn" data-cart-id="${it.id}" aria-label="Действия" title="Действия">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/>
                    </svg>
                  </button>
                  <button class="wb-item-remove-btn" data-id="${it.id}" aria-label="Удалить товар" title="Удалить">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              ${variantText ? `<div class="wb-product-variant">${variantText}</div>` : ''}

              <div class="wb-card-bottom-line">
                <div class="wb-price-block">
                  <span class="wb-current-price inline-flex items-baseline gap-1"><span class="wb-row-price" data-unit-price="${it.priceByn}">${itemSubtotal}</span> ${window.bynSign ? window.bynSign() : ''}</span>
                  <span class="wb-old-price inline-flex items-baseline gap-1">${(it.oldPriceByn * it.quantity).toFixed(2)} ${window.bynSign ? window.bynSign() : ''}</span>
                </div>

                <div class="wb-stepper">
                  <button class="wb-stepper-btn wb-step-dec" data-id="${it.id}" aria-label="Уменьшить">−</button>
                  <span class="wb-stepper-value wb-qty-val">${it.quantity}</span>
                  <button class="wb-stepper-btn wb-step-inc" data-id="${it.id}" aria-label="Увеличить">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="wb-cart-screen screen-fade-in">
        <!-- 1. Header -->
        <div class="wb-cart-header">
          <div class="wb-cart-title-row">
            <h2 class="wb-cart-title">Корзина</h2>
            <span class="wb-cart-count-badge" id="wbCartTotalBadge">${items.length} поз.</span>
          </div>
        </div>

        <!-- 2. Bulk Action Bar (Select All, Wishlist, Share, Delete) -->
        <div class="wb-bulk-bar">
          <label class="wb-select-all-label">
            <input type="checkbox" class="wb-checkbox" id="wbSelectAllCb" checked>
            <span>Выбрать все</span>
          </label>

          <div class="wb-bulk-actions">
            <button class="wb-action-icon-btn" id="wbWishlistAllBtn" title="В избранное" aria-label="В избранное">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
            <button class="wb-action-icon-btn" id="wbShareCartBtn" title="Поделиться" aria-label="Поделиться">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            <button class="wb-action-icon-btn wb-trash-btn" id="wbDeleteSelectedBtn" title="Удалить выбранные" aria-label="Удалить выбранные">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 3. Cart Items List -->
        <div class="wb-cart-list" id="wbCartList">
          ${cardsHtml}
        </div>
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
        if (priceSpan) priceSpan.innerText = (unitPrice * currentQty).toFixed(2);
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

            selectedItems.push({
              cartId: cartId,
              productId: productId,
              title: title,
              price: price,
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

        const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
