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

  // --- Render Clean Cart Screen ---
  async function renderCart() {
    const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (!currentUserId) {
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

    let items = [];
    try {
      items = await loadAllCartItems();
    } catch (e) {
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
      return `
        <div class="page-enter wb-cart-screen">
          <div class="wb-cart-header">
            <div class="wb-cart-title-row">
              <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h2 class="wb-cart-title flex-1 ml-3">Корзина</h2>
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

    const walletBal = typeof window.balance === 'number' ? window.balance : 0;
    const walletMethodActive = (window._cartPaymentMethod || 'wallet') === 'wallet';
    const discountedTotal = Math.round(initialTotal * 0.97 * 100) / 100;
    const displayTotal = walletMethodActive ? discountedTotal : initialTotal;

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
                <button class="wb-item-remove-btn" data-id="${it.id}" aria-label="Удалить товар" title="Удалить">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              ${variantText ? `<div class="wb-product-variant">${variantText}</div>` : ''}

              <div class="wb-card-bottom-line">
                <div class="wb-price-block">
                  <span class="wb-current-price"><span class="wb-row-price" data-unit-price="${it.priceByn}">${itemSubtotal}</span> BYN</span>
                  <span class="wb-old-price">${(it.oldPriceByn * it.quantity).toFixed(2)} BYN</span>
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
      <div class="page-enter wb-cart-screen">
        <!-- 1. Header -->
        <div class="wb-cart-header">
          <div class="wb-cart-title-row">
            <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 class="wb-cart-title flex-1 ml-3">Корзина</h2>
            <span class="wb-cart-count-badge" id="wbCartTotalBadge">${items.length} поз.</span>
          </div>
        </div>

        <!-- 2. Bulk Action Bar -->
        <div class="wb-bulk-bar">
          <label class="wb-select-all-label">
            <input type="checkbox" class="wb-checkbox" id="wbSelectAllCb" checked>
            <span>Выбрать все</span>
          </label>

          <button class="wb-delete-selected-btn" id="wbDeleteSelectedBtn" title="Удалить выбранные">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span>Удалить выбранные</span>
          </button>
        </div>

        <!-- 3. Cart Items List -->
        <div class="wb-cart-list" id="wbCartList">
          ${cardsHtml}
        </div>

        <!-- 4. Payment Method Selector Box (ICE Wallet vs Bank Card) -->
        <div class="wb-payment-method-box" id="wbPaymentMethodBox">
          <div class="wb-payment-box-header">
            <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Способ оплаты</span>
            </span>
            <span class="text-[10px] text-cyan-300 font-extrabold px-2 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/30" id="wbWalletDiscountTag">
              🔥 СКИДКА 3% С КОШЕЛЬКОМ
            </span>
          </div>

          <div class="wb-payment-options-grid">
            <!-- Опция 1: ICE Кошелек (Скидка 3%) -->
            <label class="wb-pay-option-card ${walletMethodActive ? 'active' : ''}" id="wbPayOptionWallet" data-method="wallet">
              <input type="radio" name="wbCartPayMethod" value="wallet" ${walletMethodActive ? 'checked' : ''} class="hidden">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="wb-pay-radio-dot"></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black text-white">Кошелек ICE</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">-3%</span>
                  </div>
                  <p class="text-[10px] text-white/50 mt-0.5 truncate" id="wbCartWalletBalText">
                    Баланс: ${walletBal.toFixed(2)} BYN
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="text-xs font-black text-cyan-400 font-mono" id="wbWalletDiscountPrice">
                  ${discountedTotal.toFixed(2)} BYN
                </span>
                <span class="block text-[9px] text-white/40 line-through" id="wbWalletOriginalPrice">
                  ${initialTotal.toFixed(2)} BYN
                </span>
              </div>
            </label>

            <!-- Опция 2: Банковская карта / ЕРИП (Стандартная цена) -->
            <label class="wb-pay-option-card ${!walletMethodActive ? 'active' : ''}" id="wbPayOptionCard" data-method="card">
              <input type="radio" name="wbCartPayMethod" value="card" ${!walletMethodActive ? 'checked' : ''} class="hidden">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="wb-pay-radio-dot"></div>
                <div class="min-w-0">
                  <span class="text-xs font-bold text-white">Карта онлайн / ЕРИП</span>
                  <p class="text-[10px] text-white/50 mt-0.5">Белкарт, Mastercard, Visa, МИР</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="text-xs font-bold text-white/80 font-mono" id="wbStandardCartPrice">
                  ${initialTotal.toFixed(2)} BYN
                </span>
              </div>
            </label>
          </div>
        </div>

        <!-- 5. Fixed Sticky Checkout Dock (Above Navigation Bar) -->
        <div class="wb-sticky-dock" id="wbStickyDock">
          <div class="wb-sticky-content">
            <button class="wb-checkout-cta active" id="wbCheckoutBtn">
              <span>Оформить заказ</span>
              <span class="text-black/40">·</span>
              <span id="wbCheckoutCount">${items.length} шт.</span>
              <span class="text-black/40">·</span>
              <span id="wbCheckoutTotal">${displayTotal.toFixed(2)} BYN</span>
            </button>
          </div>
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

      // Update pricing for payment options
      const isWallet = (window._cartPaymentMethod || 'wallet') === 'wallet';
      const discountedTotal = Math.round(totalAmount * 0.97 * 100) / 100;
      const displayTotal = isWallet ? discountedTotal : totalAmount;

      const wbWalletDiscountPrice = document.getElementById('wbWalletDiscountPrice');
      if (wbWalletDiscountPrice) wbWalletDiscountPrice.innerText = discountedTotal.toFixed(2) + ' BYN';

      const wbWalletOriginalPrice = document.getElementById('wbWalletOriginalPrice');
      if (wbWalletOriginalPrice) wbWalletOriginalPrice.innerText = totalAmount.toFixed(2) + ' BYN';

      const wbStandardCartPrice = document.getElementById('wbStandardCartPrice');
      if (wbStandardCartPrice) wbStandardCartPrice.innerText = totalAmount.toFixed(2) + ' BYN';

      // Update Sticky Checkout Button
      const checkoutBtn = document.getElementById('wbCheckoutBtn');
      if (checkoutBtn) {
        if (totalCount > 0) {
          checkoutBtn.className = 'wb-checkout-cta active';
          checkoutBtn.innerHTML = `
            <span>Оформить заказ</span>
            <span class="text-black/40">·</span>
            <span>${totalCount} шт.</span>
            <span class="text-black/40">·</span>
            <span>${displayTotal.toFixed(2)} BYN${isWallet ? ' <span class="text-[11px] font-mono font-black text-black/60">(-3%)</span>' : ''}</span>
          `;
        } else {
          checkoutBtn.className = 'wb-checkout-cta disabled';
          checkoutBtn.innerHTML = `<span>Выберите товары</span>`;
        }
      }
    }

    // 3. Payment Method Switcher (ICE Wallet vs Bank Card)
    const payWalletCard = document.getElementById('wbPayOptionWallet');
    const payBankCard = document.getElementById('wbPayOptionCard');

    function setPaymentMethod(method) {
      window._cartPaymentMethod = method;
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
      if (payWalletCard && payBankCard) {
        payWalletCard.classList.toggle('active', method === 'wallet');
        payBankCard.classList.toggle('active', method === 'card');
      }
      updateWbTotals();
    }

    if (payWalletCard) payWalletCard.onclick = () => setPaymentMethod('wallet');
    if (payBankCard) payBankCard.onclick = () => setPaymentMethod('card');

    // 4. "Выбрать все" Checkbox Handler
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

    // 5. Individual Checkboxes Handler
    document.querySelectorAll('.wb-item-cb').forEach(cb => {
      cb.onchange = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        updateWbTotals();
      };
    });

    // 6. Stepper +/- Logic
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

    // 7. Individual Item Delete Button (X)
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
          renderCurrentScreen();
        }
      };
    });

    // 8. Bulk Delete Selected Button
    const deleteSelectedBtn = document.getElementById('wbDeleteSelectedBtn');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.onclick = async () => {
        const checkedCards = document.querySelectorAll('.wb-cart-card:has(.wb-item-cb:checked)');
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
          renderCurrentScreen();
        }
      };
    }

    // 9. Sticky Checkout Button
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
        const checkedCards = document.querySelectorAll('.wb-cart-card:has(.wb-item-cb:checked)');

        checkedCards.forEach(card => {
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
        });

        if (selectedItems.length === 0) {
          tgUtil.alert('Выберите хотя бы один товар');
          return;
        }

        const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');

        const isWallet = (window._cartPaymentMethod || 'wallet') === 'wallet';
        const finalTotal = isWallet ? Math.round(total * 0.97 * 100) / 100 : total;
        const discountAmount = isWallet ? Math.round(total * 0.03 * 100) / 100 : 0;

        window.tempOrder = {
          items: selectedItems,
          total: finalTotal,
          originalTotal: total,
          discountAmount: discountAmount,
          appliedPromo: isWallet ? { code: 'ICE-WALLET-3%', discount_type: 'percent', discount_value: 3 } : null,
          paymentMethod: isWallet ? 'wallet' : 'card'
        };

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
