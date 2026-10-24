// ============================================================
// ICE LOGIX — WILDBERRIES-STYLE CART MODULE (WB CART)
// High-converting eCommerce UX + Luxury Glassmorphism
// ============================================================

(function () {
  'use strict';

  // --- Helper: Format dynamic delivery date (e.g., "Доставим 28 октября") ---
  function getWbDeliveryDate(daysFromNow = 5) {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return `Доставим ${d.getDate()} ${months[d.getMonth()]}`;
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
              priceByn = Number(prod.price || 0) * 0.52; // Fallback rate
            }

            // Old price (+35-40% markup for WB strikethrough visual)
            const oldPriceByn = priceByn * 1.45;

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
              source: prod.brand || 'Магазин',
              url: prod.url || '',
              deliveryDate: getWbDeliveryDate(prod.delivery_days || 5)
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
          const oldPriceByn = priceByn * 1.4;

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
            source: it.category || 'Калькулятор',
            url: it.url || '',
            deliveryDate: getWbDeliveryDate(7)
          });
        });
      }
    } catch (e) {
      console.error('Failed to load local custom cart items:', e);
    }

    return unified;
  }

  // --- Render Wildberries-Style Cart Screen ---
  async function renderCart() {
    const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (!currentUserId) {
      return `
        <div class="page-enter wb-cart-screen px-4 py-12 text-center max-w-md mx-auto">
          <div class="wb-empty-icon-wrap mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    // 0 items: Render WB Empty State
    if (items.length === 0) {
      return `
        <div class="page-enter wb-cart-screen px-4 py-8 max-w-md mx-auto">
          <div class="wb-cart-title-row">
            <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 class="text-lg font-bold text-white tracking-wide flex-1 ml-3">Корзина</h2>
          </div>
          <div class="wb-empty-cart">
            <div class="wb-empty-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="wb-empty-title">В корзине пока пусто</div>
            <div class="wb-empty-desc">Находите оригинальные брендовые вещи в каталоге или рассчитывайте доставку из Poizon, Taobao и 1688</div>
            <button class="wb-empty-btn" id="wbGoToCatalogBtn">Перейти к покупкам</button>
          </div>
        </div>
      `;
    }

    // Address resolution (matching user screenshot)
    const savedAddress = localStorage.getItem('ice_delivery_address') ||
      window.userProfile?.delivery_address ||
      'Минская область, Несвиж, 1-й Советский переулок';

    // Store / Source pill tabs calculation
    const sourcesMap = { 'Все': items.length };
    items.forEach(it => {
      const src = it.source || 'Магазин';
      sourcesMap[src] = (sourcesMap[src] || 0) + 1;
    });

    const storeTabsHtml = Object.keys(sourcesMap).map((src, idx) => {
      const activeClass = idx === 0 ? 'active' : '';
      const count = sourcesMap[src];
      let icon = '';
      if (src === 'Все') {
        icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
      } else {
        icon = `<span class="wb-store-badge">${src.slice(0, 2).toUpperCase()}</span>`;
      }
      return `
        <button class="wb-store-pill ${activeClass}" data-source="${src}">
          ${icon} <span>${src}</span> <span class="text-white/40">· ${count}</span>
        </button>
      `;
    }).join('');

    // Total savings calculation for WB Club banner
    let totalSavings = 0;
    let initialTotal = 0;
    items.forEach(it => {
      initialTotal += it.priceByn * it.quantity;
      totalSavings += (it.oldPriceByn - it.priceByn) * it.quantity;
    });

    const walletBal = typeof window.balance === 'number' ? window.balance : 0;
    const walletMethodActive = (window._cartPaymentMethod || 'wallet') === 'wallet';
    const discountedTotal = Math.round(initialTotal * 0.97 * 100) / 100;
    const displayTotal = walletMethodActive ? discountedTotal : initialTotal;

    // Check if club banner was dismissed
    const hideClubBanner = localStorage.getItem('ice_hide_wb_club_banner') === '1';

    // Items Cards HTML
    const cardsHtml = items.map(it => {
      const itemSubtotal = (it.priceByn * it.quantity).toFixed(2);
      const variantText = [it.color, it.size ? `Размер: ${it.size}` : ''].filter(Boolean).join(', ');

      return `
        <div class="wb-cart-card" data-cart-id="${it.id}" data-is-custom="${it.isCustom}" data-product-id="${it.productId}" data-price="${it.priceByn}" data-source="${it.source}">
          <div class="wb-card-main-row">
            <div class="wb-card-left">
              <input type="checkbox" class="wb-checkbox wb-item-cb" data-cart-id="${it.id}" checked>
              <div class="wb-product-thumb-wrap" data-img="${it.imageUrl}">
                <img src="${it.imageUrl}" alt="${it.title.replace(/"/g, '&quot;')}" class="wb-product-thumb" loading="lazy" onerror="this.src='https://via.placeholder.com/150'">
              </div>
            </div>
            
            <div class="wb-card-right">
              <div class="wb-price-menu-row">
                <div class="wb-price-block">
                  <div class="wb-current-price">
                    <svg class="wb-wallet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                    <span class="wb-row-price" data-unit-price="${it.priceByn}">${itemSubtotal}</span>
                    <span class="text-sm font-semibold text-purple-300">BYN</span>
                  </div>
                  <div class="wb-old-price">${(it.oldPriceByn * it.quantity).toFixed(2)} BYN</div>
                </div>
                
                <button class="wb-menu-btn" data-cart-id="${it.id}" aria-label="Действия">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                  </svg>
                </button>
              </div>

              <div class="wb-product-title" title="${it.title.replace(/"/g, '&quot;')}">${it.title}</div>
              ${variantText ? `<div class="wb-product-variant">${variantText}</div>` : ''}

              <div class="wb-delivery-forecast">${it.deliveryDate}</div>
              <div class="wb-free-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Бесплатный отказ при получении
              </div>
            </div>
          </div>

          <!-- Bottom Actions: Stepper + Buy Button -->
          <div class="wb-card-actions-row">
            <div class="wb-stepper">
              <button class="wb-stepper-btn wb-step-dec" data-id="${it.id}" aria-label="Уменьшить">−</button>
              <span class="wb-stepper-value wb-qty-val">${it.quantity}</span>
              <button class="wb-stepper-btn wb-step-inc" data-id="${it.id}" aria-label="Увеличить">+</button>
            </div>
            <button class="wb-buy-btn" data-id="${it.id}">Купить</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="page-enter wb-cart-screen">
        <!-- 1. Header with Address Selector -->
        <div class="wb-cart-header">
          <div class="wb-cart-title-row">
            <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 class="text-lg font-bold text-white tracking-wide flex-1 ml-3">Корзина</h2>
            <span class="text-xs text-white/50 font-medium">${items.length} поз.</span>
          </div>

          <div class="wb-address-selector" id="wbAddressBtn">
            <svg class="wb-address-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span class="wb-address-text" id="wbAddressDisplay">${savedAddress}</span>
            <svg class="wb-address-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <!-- 2. Store Tabs (Filter Pills) -->
        <div class="wb-store-tabs" id="wbStoreTabs">
          ${storeTabsHtml}
        </div>

        <!-- 3. Bulk Selection Bar -->
        <div class="wb-bulk-bar">
          <label class="wb-select-all-label">
            <input type="checkbox" class="wb-checkbox" id="wbSelectAllCb" checked>
            <span>Все</span>
          </label>

          <div class="wb-bulk-actions">
            <button class="wb-action-icon-btn" id="wbWishlistAllBtn" title="В избранное">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
            <button class="wb-action-icon-btn" id="wbShareCartBtn" title="Поделиться">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            <button class="wb-action-icon-btn wb-trash-btn" id="wbDeleteSelectedBtn" title="Удалить выбранные">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 4. WB Club Promo Banner -->
        ${!hideClubBanner ? `
          <div class="wb-club-banner" id="wbClubBanner">
            <div class="wb-club-banner-left" id="wbClubBannerLink">
              <div class="wb-club-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div class="wb-club-text">
                На <span id="wbSavingsText">${totalSavings.toFixed(2)} BYN</span> выгоднее с ICE Club ›
              </div>
            </div>
            <button class="wb-club-close" id="wbClubCloseBtn" aria-label="Закрыть баннер">✕</button>
          </div>
        ` : ''}

        <!-- 5. Cart Items Cards -->
        <div class="wb-cart-list" id="wbCartList">
          ${cardsHtml}
        </div>

        <!-- 5.5 Wildberries-Style Payment Method Selector with ICE Wallet 3% Discount -->
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

        <!-- 6. Bottom Sticky Checkout Bar (Above Tab Bar) -->
        <div class="wb-sticky-dock" id="wbStickyDock">
          <div class="wb-sticky-content">
            <button class="wb-checkout-cta active" id="wbCheckoutBtn">
              <span>Оформить заказ</span>
              <span class="text-white/60">·</span>
              <span id="wbCheckoutCount">${items.length} шт.</span>
              <span class="text-white/60">·</span>
              <span id="wbCheckoutTotal">${displayTotal.toFixed(2)} BYN</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --- Attach Handlers for Wildberries Cart ---
  function attachCartHandlers() {
    // 1. "Перейти в каталог" from empty state
    const goToCatalogBtn = document.getElementById('wbGoToCatalogBtn');
    if (goToCatalogBtn) {
      goToCatalogBtn.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        if (typeof switchTab === 'function') switchTab('catalogs');
      };
    }

    // 2. Address selector click -> quick modal or prompt
    const addressBtn = document.getElementById('wbAddressBtn');
    if (addressBtn) {
      addressBtn.onclick = async () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        const currentAddr = localStorage.getItem('ice_delivery_address') || 'Минская область, Несвиж, 1-й Советский переулок';
        const newAddr = await tgUtil.prompt('Укажите пункт выдачи (ПВЗ) или адрес доставки:', currentAddr);
        if (newAddr && newAddr.trim()) {
          localStorage.setItem('ice_delivery_address', newAddr.trim());
          const display = document.getElementById('wbAddressDisplay');
          if (display) display.innerText = newAddr.trim();
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
        }
      };
    }

    // 3. Store filter pills
    const storeTabs = document.querySelectorAll('.wb-store-pill');
    storeTabs.forEach(pill => {
      pill.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        storeTabs.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const selectedSource = pill.dataset.source;
        const cards = document.querySelectorAll('.wb-cart-card');
        cards.forEach(card => {
          if (selectedSource === 'Все' || card.dataset.source === selectedSource) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
        updateWbTotals();
      };
    });

    // 4. WB Club banner close & click
    const clubCloseBtn = document.getElementById('wbClubCloseBtn');
    if (clubCloseBtn) {
      clubCloseBtn.onclick = (e) => {
        e.stopPropagation();
        localStorage.setItem('ice_hide_wb_club_banner', '1');
        const b = document.getElementById('wbClubBanner');
        if (b) b.style.display = 'none';
      };
    }
    const clubBannerLink = document.getElementById('wbClubBannerLink');
    if (clubBannerLink) {
      clubBannerLink.onclick = () => {
        if (typeof switchTab === 'function') switchTab('bonus_shop');
      };
    }

    // 5. Total recalculation function
    function updateWbTotals() {
      let totalAmount = 0;
      let totalCount = 0;
      let totalSavings = 0;

      const visibleCards = document.querySelectorAll('.wb-cart-card:not([style*="display: none"])');
      let allChecked = visibleCards.length > 0;

      visibleCards.forEach(card => {
        const cb = card.querySelector('.wb-item-cb');
        if (cb && cb.checked) {
          const qtyVal = parseInt(card.querySelector('.wb-qty-val')?.innerText || '1', 10);
          const price = parseFloat(card.dataset.price || '0');
          totalAmount += price * qtyVal;
          totalCount += qtyVal;
          totalSavings += (price * 0.4) * qtyVal;
        } else {
          allChecked = false;
        }
      });

      // Update "Все" checkbox
      const selectAllCb = document.getElementById('wbSelectAllCb');
      if (selectAllCb) {
        selectAllCb.checked = allChecked && visibleCards.length > 0;
      }

      // Update Sticky Checkout Button
      const checkoutBtn = document.getElementById('wbCheckoutBtn');
      const checkoutCount = document.getElementById('wbCheckoutCount');
      const checkoutTotal = document.getElementById('wbCheckoutTotal');
      const savingsText = document.getElementById('wbSavingsText');

      if (savingsText) savingsText.innerText = totalSavings.toFixed(2) + ' BYN';

      const isWallet = (window._cartPaymentMethod || 'wallet') === 'wallet';
      const discountedTotal = Math.round(totalAmount * 0.97 * 100) / 100;
      const displayTotal = isWallet ? discountedTotal : totalAmount;

      const wbWalletDiscountPrice = document.getElementById('wbWalletDiscountPrice');
      if (wbWalletDiscountPrice) wbWalletDiscountPrice.innerText = discountedTotal.toFixed(2) + ' BYN';

      const wbWalletOriginalPrice = document.getElementById('wbWalletOriginalPrice');
      if (wbWalletOriginalPrice) wbWalletOriginalPrice.innerText = totalAmount.toFixed(2) + ' BYN';

      const wbStandardCartPrice = document.getElementById('wbStandardCartPrice');
      if (wbStandardCartPrice) wbStandardCartPrice.innerText = totalAmount.toFixed(2) + ' BYN';

      if (checkoutBtn) {
        if (totalCount > 0) {
          checkoutBtn.className = 'wb-checkout-cta active';
          checkoutBtn.innerHTML = `
            <span>Оформить заказ</span>
            <span class="text-white/60">·</span>
            <span>${totalCount} шт.</span>
            <span class="text-white/60">·</span>
            <span>${displayTotal.toFixed(2)} BYN${isWallet ? ' <span class="text-[11px] text-cyan-300 font-mono font-bold">(-3%)</span>' : ''}</span>
          `;
        } else {
          checkoutBtn.className = 'wb-checkout-cta disabled';
          checkoutBtn.innerHTML = `<span>Выберите товары</span>`;
        }
      }
    }

    // 5.1 Payment Method Switcher (ICE Wallet vs Bank Card)
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

    // 6. "Все" Select All Checkbox Handler
    const selectAllCb = document.getElementById('wbSelectAllCb');
    if (selectAllCb) {
      selectAllCb.onchange = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        const checked = selectAllCb.checked;
        const visibleCards = document.querySelectorAll('.wb-cart-card:not([style*="display: none"])');
        visibleCards.forEach(card => {
          const cb = card.querySelector('.wb-item-cb');
          if (cb) cb.checked = checked;
        });
        updateWbTotals();
      };
    }

    // 7. Individual Checkboxes Handler
    document.querySelectorAll('.wb-item-cb').forEach(cb => {
      cb.onchange = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
        updateWbTotals();
      };
    });

    // 8. Stepper +/- Delegated Logic
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
            // Delete prompt on 1 -> 0
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

    // 9. Single Item "Купить" Button (WB 1-Click Purchase)
    document.querySelectorAll('.wb-buy-btn').forEach(btn => {
      btn.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
        if (window.appSettings && window.appSettings.is_payments_paused) {
          tgUtil.alert(`Оформление заказа временно недоступно.\nПричина: ${window.appSettings.pause_reason}`);
          return;
        }

        const card = btn.closest('.wb-cart-card');
        if (!card) return;

        const cartId = card.dataset.cartId;
        const productId = card.dataset.productId;
        const title = card.querySelector('.wb-product-title')?.innerText || 'Товар';
        const price = parseFloat(card.dataset.price || '0');
        const quantity = parseInt(card.querySelector('.wb-qty-val')?.innerText || '1', 10);
        const imageUrl = card.querySelector('.wb-product-thumb')?.src || '';

        window.tempOrder = {
          items: [{
            cartId: cartId,
            productId: productId,
            title: title,
            price: price,
            imageUrl: imageUrl,
            image_url: imageUrl,
            quantity: quantity
          }],
          total: price * quantity,
          discountAmount: 0,
          appliedPromo: null
        };

        if (typeof switchTab === 'function') {
          switchTab('neworder');
        } else {
          currentTab = 'neworder';
          renderCurrentScreen();
        }
      };
    });

    // 10. Context Menu `•••` Bottom Sheet
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

        // Create bottom sheet
        const backdrop = document.createElement('div');
        backdrop.className = 'wb-sheet-backdrop';
        backdrop.innerHTML = `
          <div class="wb-sheet">
            <div class="wb-sheet-handle"></div>
            <div class="text-sm font-bold text-white px-3 pb-3 border-b border-white/10 truncate">${title}</div>
            
            <button class="wb-sheet-action" id="wbSheetWishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>Переместить в избранное</span>
            </button>

            <button class="wb-sheet-action" id="wbSheetCopy">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Скопировать название</span>
            </button>

            <button class="wb-sheet-action danger" id="wbSheetDelete">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Удалить из корзины</span>
            </button>
          </div>
        `;

        document.body.appendChild(backdrop);

        const closeSheet = () => {
          backdrop.remove();
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
          tgUtil.alert('Товар перемещен в избранное ♡');
        };

        backdrop.querySelector('#wbSheetCopy').onclick = () => {
          closeSheet();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(title);
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
            renderCurrentScreen();
          }
        };
      };
    });

    // 11. Bulk Delete (Trash Icon)
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

    // 12. Bulk Wishlist (Heart Icon)
    const wishlistAllBtn = document.getElementById('wbWishlistAllBtn');
    if (wishlistAllBtn) {
      wishlistAllBtn.onclick = async () => {
        const checkedCards = document.querySelectorAll('.wb-cart-card:has(.wb-item-cb:checked)');
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

    // 13. Bulk Share
    const shareCartBtn = document.getElementById('wbShareCartBtn');
    if (shareCartBtn) {
      shareCartBtn.onclick = () => {
        const checkedCards = document.querySelectorAll('.wb-cart-card:has(.wb-item-cb:checked)');
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
          lines.push(`• ${t} (${q} шт.) — ${p} BYN`);
        });

        const shareText = lines.join('\n');
        if (navigator.share) {
          navigator.share({ title: 'Корзина ICE LOGIX', text: shareText }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(shareText);
          tgUtil.alert('Список товаров скопирован в буфер обмена!');
        }
      };
    }

    // 14. Sticky Checkout Button
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
