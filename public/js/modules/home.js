// ============================================================
// ICE LOGIX Module: Home Screen
// ============================================================
        // ==================== РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ====================
        async function renderHome() {
          let dbMarketplaces = [];
          try {
            const dbData = await window.CacheDB.get('marketplaces', async () => {
              const { data } = await supabaseClient.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true });
              return data;
            }, 300000);
            if (dbData) dbMarketplaces = preprocessMarketplaces(dbData);
          } catch (e) {
            console.error(e);
          }

          // Use only DB marketplaces with show_on_home=true; fall back to static list only when none configured
          const homeDbMarketplaces = dbMarketplaces.filter(mp => mp.show_on_home);
          const staticMarketplaces = [
            { name: 'Poizon', url: 'https://poizon.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=dewu.com', icon: '<span class="mp-dot" style="background:#22c55e" aria-hidden="true"></span>' },
            { name: 'Taobao', url: 'https://taobao.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=taobao.com', icon: '<span class="mp-dot" style="background:#fb923c" aria-hidden="true"></span>' },
            { name: '1688', url: 'https://1688.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=1688.com', icon: '<span class="mp-dot" style="background:#facc15" aria-hidden="true"></span>' },
            { name: 'Zalando', url: 'https://zalando.de', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=zalando.de', icon: '<span class="mp-dot" style="background:#92400e" aria-hidden="true"></span>' },
            { name: 'Nike', url: 'https://nike.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=nike.com', icon: '<span class="mp-dot" style="background:#374151" aria-hidden="true"></span>' },
            { name: 'ASOS', url: 'https://asos.com', logo_url: 'https://www.google.com/s2/favicons?sz=128&domain=asos.com', icon: '<span class="mp-dot" style="background:#3b82f6" aria-hidden="true"></span>' }
          ];

          // If admin has configured show_on_home venues — use them; otherwise fall back to the legacy static list
          const marketplaces = homeDbMarketplaces.length > 0 ? homeDbMarketplaces : staticMarketplaces;

          // Загрузка сегодняшних подборок из канала (@icelogix_selection)
          let homeProductsList = [];
          try {
            if (window.CacheDB) window.CacheDB.clear('todaySelectionDrops');
            // Ждём инициализации supabaseClient (может быть null при быстром старте из кэша)
            let _sbClient = supabaseClient;
            if (!_sbClient) {
              for (let _w = 0; _w < 30; _w++) {
                await new Promise(r => setTimeout(r, 100));
                if (supabaseClient) { _sbClient = supabaseClient; break; }
              }
            }
            if (_sbClient) {
              const { data: drops } = await _sbClient
                .from('products')
                .select('*')
                .eq('is_active', true)
                .eq('show_on_home', true)
                .order('created_at', { ascending: false })
                .limit(9);
              if (drops && drops.length > 0) {
                homeProductsList = preprocessProducts(drops);
              } else {
                const { data: fallback } = await _sbClient
                  .from('products')
                  .select('*')
                  .eq('is_active', true)
                  .eq('is_drop', true)
                  .order('created_at', { ascending: false })
                  .limit(9);
                if (fallback && fallback.length > 0) {
                  homeProductsList = preprocessProducts(fallback);
                }
              }
            }
          } catch(e) {
            console.error('Failed to load drops for home:', e);
          }
  
  return `
    <!-- Currency Tracker -->
    <div class="glass-card mb-5" style="padding: 12px 16px;">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-white font-bold text-sm flex items-center gap-1"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span> Биржевой курс ICE LOGIX</h3>
        <span class="text-green-400 text-[10px] bg-green-400/20 px-2 py-0.5 rounded-full animate-pulse">Live</span>
      </div>
      <div style="overflow-x: auto; padding: 2px 0; scrollbar-width: none; -ms-overflow-style: none;">
        <div style="display: flex; gap: 6px; width: max-content; padding-bottom: 2px;">
          ${[
            { flag: '🇨🇳', code: 'CNY', label: '¥1',     key: 'cny_rate', def: 0.46,    mult: 1    },
            { flag: '🇪🇺', code: 'EUR', label: '€1',     key: 'eur_rate', def: 3.55,    mult: 1    },
            { flag: '🇷🇺', code: 'RUB', label: '₽1',     key: 'rub_rate', def: 0.031,   mult: 1    },
            { flag: '🇺🇸', code: 'USD', label: '$1',     key: 'usd_rate', def: 3.25,    mult: 1    },
            { flag: '🇵🇱', code: 'PLN', label: 'zł1',    key: 'pln_rate', def: 0.80,    mult: 1    },
            { flag: '🇯🇵', code: 'JPY', label: '¥100',   key: 'jpy_rate', def: 0.022,   mult: 100  },
            { flag: '🇻🇳', code: 'VND', label: '₫1000',  key: 'vnd_rate', def: 0.00013, mult: 1000 },
            { flag: '🇦🇪', code: 'AED', label: 'د.إ1',   key: 'aed_rate', def: 0.88,    mult: 1    },
            { flag: '🇹🇷', code: 'TRY', label: '₺1',     key: 'try_rate', def: 0.096,   mult: 1    },
            { flag: '🇰🇷', code: 'KRW', label: '₩1000',  key: 'krw_rate', def: 0.0024,  mult: 1000 },
          ].map(c => {
            const rate = (Number(window.appSettings?.[c.key] || c.def) * c.mult).toFixed(2);
            return `<div class="rate-tracker-card" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 6px 10px; flex-shrink: 0;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.45); white-space: nowrap; margin-bottom: 3px;">${c.flag} ${c.code}</div>
              <div style="font-size: 11px; font-weight: 700; color: white; white-space: nowrap;">${c.label} ≈ <span style="color: #67e8f9;">${rate} Br/ICE</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Promo Banners (WB Style Full Width with Slow Auto-scroll) -->
    <div class="banner-carousel-wrapper mb-4" id="bannerCarouselWrapper">
      <div class="banner-carousel" id="promoBannersContainer">
        ${await renderPromoBanners()}
      </div>
      <div class="banner-dots" id="bannerDots"></div>
    </div>

    <!-- Quick Actions - Story Cards (WB Squircle Style Line 1) -->
    <div class="scroll-hint-container mb-4">
    <div class="scroll-x" style="padding: 2px 0 6px;">
      <div class="story-card" data-story="onboarding">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(99,202,253,0.25), rgba(59,130,246,0.12));">
          <span style="font-size: 24px;"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></span>
        </div>
        <span class="story-label">Гайд</span>
      </div>
      <div class="story-card" data-story="legitcheck">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(16,185,129,0.25), rgba(5,150,105,0.12));">
          <span style="font-size: 24px;"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span></span>
        </div>
        <span class="story-label">Легит-чек</span>
      </div>
      <div class="story-card" data-story="reports">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(251,191,36,0.25), rgba(245,158,11,0.12));">
          <span style="font-size: 24px;"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span>
        </div>
        <span class="story-label">Отчёты</span>
      </div>
      <div class="story-card" data-story="reviews">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(251,191,36,0.3), rgba(234,179,8,0.18));">
          <span style="font-size: 24px;"><span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span></span>
        </div>
        <span class="story-label">Отзывы</span>
      </div>
      <div class="story-card" data-story="promo">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(248,113,113,0.25), rgba(239,68,68,0.12));">
          <span style="font-size: 24px;"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span></span>
        </div>
        <span class="story-label">Акции</span>
      </div>
      <div class="story-card" data-story="academy">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(139,92,246,0.25), rgba(109,40,217,0.18));">
          <span style="font-size: 24px;"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span></span>
        </div>
        <span class="story-label">Академия</span>
      </div>
    </div>
    </div>
    
    <!-- Popular Marketplaces Section (WB Squircle Style Line 2) -->
    <div class="mb-5">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-white font-bold text-sm flex items-center gap-1.5">
          <span style="font-size: 18px;"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span></span>
          Площадки
        </h3>
        <button id="moreMarketplacesBtn" class="text-xs font-semibold flex items-center gap-1" style="color: var(--ice-primary);">
          Все
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
      <div class="scroll-hint-container">
      <div class="scroll-x" style="padding: 2px 0 6px;">
        ${marketplaces.map(mp => `
          <div class="story-card marketplace-story" data-url="${mp.website_url || mp.url}">
            <div class="story-icon">
              ${mp.logo_url ? `<img src="${mp.logo_url}" class="w-full h-full object-cover" alt="${mp.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">` : ''}
              <span style="${mp.logo_url ? 'display:none;' : ''} font-size: 22px;">${mp.icon || '<span class="mp-dot" style="background:#374151"></span>'}</span>
            </div>
            <span class="story-label">${mp.name}</span>
          </div>
        `).join('')}
      </div>
      </div>
    </div>
    
    <!-- Сегодняшние подборки товаров (автопарсинг из @icelogix_selection) -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-white font-bold text-sm flex items-center gap-1.5">
          <span style="font-size: 18px;"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span></span>
          Сегодняшние подборки товаров
        </h3>
        <span class="text-[11px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          9 дропов
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2" id="homeProductsGrid" style="margin-left: -6px; margin-right: -6px;">
        ${homeProductsList.map(p => `
          <div class="product-card" data-product-id="${p.id}">
            <div class="relative">
              ${renderCardMedia(p.image_url, p.title)}
              <span class="absolute top-2 right-2 wishlist-heart text-lg ${wishlist.has(p.id) ? 'text-red-500' : 'text-white/60'} z-20" data-product-id="${p.id}">${getHeartIcon(wishlist.has(p.id))}</span>
              ${p.brand ? `<span class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">${_esc(p.brand)}</span>` : ''}
            </div>
            <div style="padding: 10px 8px 10px 8px; display: flex; flex-direction: column; flex: 1;">
              <p class="text-white font-bold text-sm truncate" style="font-size: 13px; font-weight: 700; line-height: 1.2;">${_esc(p.title)}</p>
              <div class="flex items-center justify-between mt-1.5">
                <p class="text-cyan-400 font-bold text-sm font-mono leading-none">${p.price} ${p.currency || 'BYN'}</p>
                ${p.category ? `<span class="text-[10px] text-white/40 truncate max-w-[80px]">${_esc(p.category)}</span>` : ''}
              </div>
              <div class="flex gap-1.5 mt-2.5">
                <button class="btn-primary addToCartBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-product-id="${p.id}">Корзина</button>
                <button class="buyNowBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-url="${p.url || ''}" data-price="${p.price}">Заказать</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    
    ${renderFooter()}
  `;
}

// ==================== ОБРАБОТЧИК ГЛАВНОЙ ====================
function attachHomeHandlers() {
      document.querySelector('[data-story="onboarding"]')?.addEventListener('click', () => {
        if (window.iceLogixOnboarding) window.iceLogixOnboarding.open();
      });
      document.querySelector('[data-story="reports"]')?.addEventListener('click', () => switchTab('reports'));
      document.querySelector('[data-story="reviews"]')?.addEventListener('click', () => switchTab('reviews'));
      document.querySelector('[data-story="promo"]')?.addEventListener('click', () => switchTab('promo'));
      document.querySelector('[data-story="legitcheck"]')?.addEventListener('click', () => {
        if (!window.userId) { window.requireAuth('Для проверки подлинности необходимо войти или зарегистрироваться.'); return; }
        switchTab('legitcheck');
      });
      document.querySelector('[data-story="academy"]')?.addEventListener('click', () => {
        if (!window.userId) { window.requireAuth('Для доступа к академии необходимо войти или зарегистрироваться.'); return; }
        switchTab('academy');
      });
      document.getElementById('moreMarketplacesBtn')?.addEventListener('click', () => {
        switchTab('catalogs', 'marketplaces');
      });
      document.querySelectorAll('.marketplace-story').forEach(el => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-url');
          if (url) tgUtil.openLink(url);
          else tgUtil.alert('Ссылка на площадку будет добавлена позже');
        });
      });
      document.querySelectorAll('.social-icon').forEach(el => {
        el.addEventListener('click', () => tgUtil.alert('Соцсети будут подключены позже'));
      });

      // Initialize auto-scroll for banners (WB style)
      initBannerAutoScroll();

      document.querySelectorAll('.banner-slide').forEach(el => {
        el.addEventListener('click', () => {
          const promoId = el.dataset.promotionId;
          const action = el.dataset.promoAction;
          if (promoId) {
            window.activePromotionId = promoId;
            tgUtil.alert('Акция применена! Перейдите в калькулятор.');
          } else if (action === 'catalog') {
            switchTab('catalogs');
          } else if (action === 'legit') {
            switchTab('legitcheck');
          } else if (action === 'calculator') {
            switchTab('calculator');
          }
        });
      });

      loadHomeProducts();

      document.querySelectorAll('.addToCartBtn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (!window.userId) { window.requireAuth('Для добавления в корзину необходимо войти или зарегистрироваться.'); return; }
          const productId = btn.dataset.productId;
          if (productId) addToCart(productId);
        };
      });

      document.querySelectorAll('.buyNowBtn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (!window.userId) { window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.'); return; }
          const url = btn.dataset.url;
          const price = parseFloat(btn.dataset.price);
          if (url && !isNaN(price)) {
            window.tempOrder = {
              url: url,
              price: price,
              weight: 1,
              total: window.iceLogixPricing.quickEstimate(price, 1),
              discountAmount: 0,
              appliedPromo: null
            };
            switchTab('neworder');
          }
        };
      });
    }

    async function loadHomeProducts() {
      const grid = document.getElementById('homeProductsGrid');
      if (!grid) return;
      try {
        let data = [];
        if (window.CacheDB) window.CacheDB.clear('todaySelectionDrops');
        // Ждём инициализации supabaseClient (race condition при старте из localStorage-кэша)
        let _sbClient = supabaseClient;
        if (!_sbClient) {
          for (let _w = 0; _w < 40; _w++) {
            await new Promise(r => setTimeout(r, 100));
            if (supabaseClient) { _sbClient = supabaseClient; break; }
          }
        }
        if (!_sbClient) { console.warn('[ICE] loadHomeProducts: supabaseClient unavailable'); return; }
        const { data: drops } = await _sbClient
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('show_on_home', true)
          .order('created_at', { ascending: false })
          .limit(9);
        if (drops && drops.length > 0) {
          data = preprocessProducts(drops);
        } else {
          const { data: fallback } = await _sbClient
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('is_drop', true)
            .order('created_at', { ascending: false })
            .limit(9);
          if (fallback && fallback.length > 0) {
            data = preprocessProducts(fallback);
          }
        }

        const existingCards = Array.from(grid.querySelectorAll('.product-card'));
        const existingIds = existingCards.map(c => c.dataset.productId).join(',');
        const newIds = data.map(p => p.id).join(',');

        if (existingCards.length === 0 || existingIds !== newIds) {
          if (data.length === 0) {
            grid.innerHTML = '<p class="text-white/50 text-xs col-span-2 text-center py-6">Сегодняшние подборки скоро появятся в канале...</p>';
          } else {
            grid.innerHTML = data.map(p => `
              <div class="product-card" data-product-id="${p.id}">
                <div class="relative">
                  ${renderCardMedia(p.image_url, p.title)}
                  <span class="absolute top-2 right-2 wishlist-heart text-lg ${wishlist.has(p.id) ? 'text-red-500' : 'text-white/60'} z-20" data-product-id="${p.id}">${getHeartIcon(wishlist.has(p.id))}</span>
                  ${p.brand ? `<span class="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">${_esc(p.brand)}</span>` : ''}
                </div>
                <div style="padding: 10px 8px 10px 8px; display: flex; flex-direction: column; flex: 1;">
                  <p class="text-white font-bold text-sm truncate" style="font-size: 13px; font-weight: 700; line-height: 1.2;">${_esc(p.title)}</p>
                  <div class="flex items-center justify-between mt-1.5">
                    <p class="text-cyan-400 font-bold text-sm font-mono leading-none">${p.price} ${p.currency || 'BYN'}</p>
                    ${p.category ? `<span class="text-[10px] text-white/40 truncate max-w-[80px]">${_esc(p.category)}</span>` : ''}
                  </div>
                  <div class="flex gap-1.5 mt-2.5">
                    <button class="btn-primary addToCartBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-product-id="${p.id}">Корзина</button>
                    <button class="buyNowBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-url="${p.url || ''}" data-price="${p.price}">Заказать</button>
                  </div>
                </div>
              </div>
            `).join('');
            initCardSliders();
          }
        }

    const _cd = document.getElementById('content');
    if (_cd && currentTab === 'home' && !currentSubScreen) {
      _tabCache['home:'] = { html: _cd.innerHTML, ts: Date.now() };
      try { localStorage.setItem('ice_tab_home_v2', _cd.innerHTML); } catch(e){}
    }

    grid.querySelectorAll('.addToCartBtn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const productId = btn.dataset.productId;
        if (productId) addToCart(productId);
      };
    });

    grid.querySelectorAll('.buyNowBtn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!window.userId) { window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.'); return; }
        const url = btn.dataset.url;
        const price = parseFloat(btn.dataset.price);
        if (url && !isNaN(price)) {
          window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        }
      };
    });

    grid.querySelectorAll('.product-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.wishlist-heart') || e.target.closest('.addToCartBtn') || e.target.closest('.cart-stepper') || e.target.closest('.buyNowBtn') || e.target.closest('.card-photo-container')) return;
        const productId = card.dataset.productId;
        const url = card.querySelector('.buyNowBtn')?.dataset.url;
        const price = parseFloat(card.querySelector('.buyNowBtn')?.dataset.price);
        if (userId && productId) {
          supabaseClient.from('user_views').upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' }).then(() => {});
        }
        if (url && !isNaN(price)) {
          if (!window.userId) { window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.'); return; }
          window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        }
      };
    });
    
    // Инициализируем обработчики прокрутки фото для карточек товаров
    initCardSliders();
  } catch(e) {
    console.error('Ошибка загрузки товаров на главной:', e);
  }
}

    function scrollToPageTop() {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const contentDiv = document.getElementById('content');
      if (contentDiv) contentDiv.scrollTop = 0;
    }

    async function renderCalculator() {
      window._calcMode = window._calcMode || 'menu';
      window._aiSubTab = window._aiSubTab || 'photo';
      window._aiSearchRegion = window._aiSearchRegion || 'all';
      scrollToPageTop();

      const selectedCountryObj = ALL_COUNTRIES.find(c => c.code === (window.calcCountry || 'CN'));
      const countryText = selectedCountryObj 
        ? `${selectedCountryObj.flag} ${selectedCountryObj.name}`
        : '🇨🇳 Китай';

      // ─── MODE 1: CHOICE MENU ─────────────────────────────────────────────
      if (window._calcMode === 'menu') {
        return `
          <div class="glass-card page-enter relative text-left p-5 shadow-2xl border border-white/10">
            <button type="button" class="absolute top-4 right-4 text-white/50 hover:text-cyan-400 text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 cursor-pointer z-10" onclick="window.switchTab('history'); window._historySubScreen = 'calculations'; window.renderCurrentScreen();">
              🕒 История
            </button>

            <div class="text-center mb-6 mt-4">
              <h2 class="text-xl font-extrabold text-white tracking-tight">Калькулятор доставки</h2>
              <p class="text-white/60 text-xs mt-1">Выберите удобный способ расчета стоимости вашего товара</p>
            </div>

            <div class="space-y-4">
              <!-- Option A: Manual -->
              <div onclick="window._calcMode = 'manual'; window.renderCurrentScreen();" class="glass-card p-5 border border-white/15 hover:border-cyan-400/60 rounded-2xl cursor-pointer transition duration-200 active:scale-[0.98] group relative overflow-hidden bg-gradient-to-br from-white/5 via-white/[0.02] to-cyan-500/5 shadow-lg">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition duration-300 shadow-inner">
                    📦
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h3 class="text-sm font-bold text-white group-hover:text-cyan-300 transition leading-snug">Я нашел товар и знаю все нужные данные о нем</h3>
                      <span class="text-cyan-400 text-xs font-semibold group-hover:translate-x-1 transition duration-200 flex-shrink-0 ml-2">Перейти →</span>
                    </div>
                    <p class="text-white/60 text-xs mt-1 leading-relaxed">Ввести название, цену и вес вручную для моментального расчета.</p>
                  </div>
                </div>
              </div>

              <!-- Option B: AI Search -->
              <div onclick="window._calcMode = 'ai_search'; window.renderCurrentScreen();" class="glass-card p-5 border border-cyan-500/40 hover:border-cyan-400 rounded-2xl cursor-pointer transition duration-200 active:scale-[0.98] group relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-blue-600/10 to-indigo-900/20 shadow-[0_0_25px_rgba(6,182,212,0.18)]">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition duration-300 shadow-lg shadow-cyan-500/20">
                    ✨
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h3 class="text-sm font-bold text-white group-hover:text-cyan-300 transition leading-snug">Помогите мне найти товар и ввести все нужные данные о нем</h3>
                      <span class="text-cyan-400 text-xs font-semibold group-hover:translate-x-1 transition duration-200 flex-shrink-0 ml-2">Найти →</span>
                    </div>
                    <p class="text-white/60 text-xs mt-1 leading-relaxed">Поиск по фото или описанию. ИИ подберет товар, определит цену и ориентировочный вес.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${renderFooter()}
        `;
      }

      // ─── MODE 2: AI SEARCH ───────────────────────────────────────────────
      if (window._calcMode === 'ai_search') {
        return `
          <div class="glass-card page-enter relative text-left p-5 space-y-4 shadow-2xl border border-white/10">
            <button type="button" class="absolute top-4 left-4 text-cyan-400 hover:text-cyan-300 text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 cursor-pointer z-10 border-0" onclick="window._calcMode = 'menu'; window.renderCurrentScreen();">
              ← Назад к выбору
            </button>

            <div class="text-center mb-4 mt-8">
              <h2 class="text-lg font-extrabold text-white flex items-center justify-center gap-1.5">
                <span>✨ Поиск товара ИИ & Парсингом</span>
              </h2>
              <p class="text-white/60 text-xs mt-1">ИИ и парсер подберут товар и определят данные для расчета</p>
            </div>

            <!-- Unified search form: photo + description (both required) -->
            <div class="space-y-3">
              <div>
                <label class="text-white/80 text-xs font-bold block mb-1">📸 Фото товара <span class="text-red-400">*</span> <span class="text-white/40 font-normal">(до 5 фото)</span></label>
                <div id="aiPhotoDropZone" class="p-5 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl text-center cursor-pointer bg-cyan-500/5 hover:bg-cyan-500/10 transition" onclick="document.getElementById('aiPhotoInput').click()">
                  <div class="text-3xl mb-1">📸</div>
                  <p id="aiPhotoStatusText" class="text-white/90 text-xs font-bold">${(window._aiSearchFiles && window._aiSearchFiles.length) ? '✅ Загружено: ' + window._aiSearchFiles.length + ' фото' : 'Нажмите, чтобы загрузить фото'}</p>
                  <p class="text-white/40 text-[10px] mt-0.5">JPG, PNG, WEBP до 10 МБ каждый</p>
                  <input type="file" id="aiPhotoInput" accept="image/*" multiple class="hidden" onchange="window.handleAiSearchPhotoSelect(this)">
                </div>
                <div id="aiPhotoPreviewBox" class="${(window._aiSearchFiles && window._aiSearchFiles.length) ? '' : 'hidden'} mt-2">
                  <div id="aiPhotoPreviewGrid" class="flex flex-wrap gap-2 justify-center">
                    ${(window._aiSearchFiles || []).map((f, i) => `
                      <div class="relative inline-block">
                        <img src="${(window._aiSearchBlobUrls && window._aiSearchBlobUrls[i]) || ''}" class="rounded-xl h-20 w-20 object-cover border border-cyan-500/40 shadow-lg ai-photo-thumb" data-idx="${i}">
                        <button type="button" onclick="window.removeAiSearchPhoto(${i})" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center shadow-lg cursor-pointer">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div>
                <label class="text-white/80 text-xs font-bold block mb-1">✍️ Описание товара <span class="text-red-400">*</span></label>
                <textarea id="aiPhotoHint" rows="2" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-xs text-white" placeholder="Например: Кроссовки Nike Dunk Low, сине-белый цвет"></textarea>
                <p class="text-white/40 text-[10px] mt-1">Чем точнее описание (бренд, модель, цвет), тем лучше результат поиска.</p>
              </div>
            </div>

            <!-- Выбор региона поиска -->
            <div class="mt-3">
              <label class="text-white/70 text-xs block mb-1.5">🌍 Регион поиска</label>
              <div class="relative">
                <button type="button" id="calcAiRegionBtn" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm flex justify-between items-center cursor-pointer" onclick="document.getElementById('calcAiRegionDropdown').classList.toggle('hidden')">
                  <span id="calcAiRegionVal">${window._aiSearchRegion === 'CN' ? '🇨🇳 Китай' : window._aiSearchRegion === 'EU' ? '🇪🇺 Европа' : window._aiSearchRegion === 'US' ? '🇺🇸 США' : window._aiSearchRegion === 'JP' ? '🇯🇵 Япония' : '🌍 Все площадки'}</span>
                  <span>▼</span>
                </button>
                <div id="calcAiRegionDropdown" class="hidden absolute left-0 right-0 bottom-full mb-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[45vh] overflow-y-auto">
                  <div class="p-3 hover:bg-white/5 cursor-pointer text-xs text-white flex items-center gap-2 border-b border-white/5" onclick="window._aiSearchRegion='all'; document.getElementById('calcAiRegionVal').textContent='🌍 Все площадки'; document.getElementById('calcAiRegionDropdown').classList.add('hidden');">🌍 Все площадки</div>
                  <div class="p-3 hover:bg-white/5 cursor-pointer text-xs text-white flex items-center gap-2 border-b border-white/5" onclick="window._aiSearchRegion='CN'; document.getElementById('calcAiRegionVal').textContent='🇨🇳 Китай'; document.getElementById('calcAiRegionDropdown').classList.add('hidden');">🇨🇳 Китай (Poizon, Taobao, 1688, Pinduoduo, Xianyu...)</div>
                  <div class="p-3 hover:bg-white/5 cursor-pointer text-xs text-white flex items-center gap-2 border-b border-white/5" onclick="window._aiSearchRegion='EU'; document.getElementById('calcAiRegionVal').textContent='🇪🇺 Европа'; document.getElementById('calcAiRegionDropdown').classList.add('hidden');">🇪🇺 Европа (Zalando, ASOS, Farfetch, Vinted...)</div>
                  <div class="p-3 hover:bg-white/5 cursor-pointer text-xs text-white flex items-center gap-2 border-b border-white/5" onclick="window._aiSearchRegion='US'; document.getElementById('calcAiRegionVal').textContent='🇺🇸 США'; document.getElementById('calcAiRegionDropdown').classList.add('hidden');">🇺🇸 США (GOAT, StockX)</div>
                  <div class="p-3 hover:bg-white/5 cursor-pointer text-xs text-white flex items-center gap-2" onclick="window._aiSearchRegion='JP'; document.getElementById('calcAiRegionVal').textContent='🇯🇵 Япония'; document.getElementById('calcAiRegionDropdown').classList.add('hidden');">🇯🇵 Япония (Mercari)</div>
                </div>
              </div>
            </div>

            <!-- Дополнительные фильтры: Подлинность, Состояние, Макс. цена -->
            <div class="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label class="text-white/70 text-[11px] block mb-1">🏷️ Подлинность</label>
                <select id="aiAuthTier" class="btn-secondary w-full p-2.5 rounded-xl border border-white/20 text-xs">
                  <option value="all" selected>Любая</option>
                  <option value="original">✨ Только оригинал</option>
                  <option value="replica">⚠️ Реплика / Копия</option>
                </select>
              </div>
              <div>
                <label class="text-white/70 text-[11px] block mb-1">📦 Состояние</label>
                <select id="aiItemCondition" class="btn-secondary w-full p-2.5 rounded-xl border border-white/20 text-xs">
                  <option value="all" selected>Любое</option>
                  <option value="new">✨ Только новый</option>
                  <option value="used">🔄 Б/У (95分 / Xianyu)</option>
                </select>
              </div>
            </div>

            <div class="mt-2">
              <label class="text-white/70 text-[11px] block mb-1">💰 Максимальная цена (¥ / CNY)</label>
              <input type="number" id="aiMaxPrice" step="1" min="1" class="btn-secondary w-full p-2.5 rounded-xl border border-white/20 text-xs" placeholder="Любая цена (или введите лимит)">
            </div>

            <button type="button" id="calcAiSearchRunBtn" onclick="window.runAiProductSearch()" class="btn-primary w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer border-0 mt-3">
              <span>🔍 Найти товар и рассчитать</span>
            </button>

            <!-- Search Results Output -->
            <div id="calcAiSearchResult" class="hidden mt-4"></div>
          </div>
          ${renderFooter()}
        `;
      }

      // ─── MODE 3: MANUAL CALCULATION FORM ────────────────────────────────
      // Check if we need to auto-fill pending AI data
      if (window._pendingAiData) {
        const d = window._pendingAiData;
        delete window._pendingAiData;
        setTimeout(() => {
          const titleInp = document.getElementById('calcTitle');
          const priceInp = document.getElementById('calcPrice');
          const weightInp = document.getElementById('calcWeight');
          if (titleInp && d.title) titleInp.value = d.title;
          if (priceInp && d.price) priceInp.value = d.price;
          if (weightInp && d.weight) weightInp.value = parseFloat(d.weight).toFixed(2);
          if (d.currency && typeof window.selectCalcCurrency === 'function') {
            window.selectCalcCurrency(d.currency, `${d.currency}`);
          }
          if (d.country && typeof window.selectCalcCountry === 'function') {
            window.selectCalcCountry(d.country);
          }
          tgUtil.haptic('success');
          glassToast('✨ Данные товара автоматически подставлены ИИ!', { kind: 'success' });
        }, 100);
      }

      return `
        <div class="glass-card page-enter relative text-left">
          <button type="button" class="absolute top-4 left-4 text-cyan-400 hover:text-cyan-300 text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer z-10 border-0" onclick="window._calcMode = 'menu'; window.renderCurrentScreen();">
            ← Назад к выбору
          </button>

          <button type="button" class="absolute top-4 right-4 text-white/40 hover:text-cyan-400 text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer z-10" onclick="window.switchTab('history'); window._historySubScreen = 'calculations'; window.renderCurrentScreen();">
            🕒 История
          </button>

          <h2 class="text-xl font-extrabold text-white text-center mb-6 mt-8">Калькулятор доставки</h2>

          <form id="calculatorForm" class="space-y-4" onsubmit="event.preventDefault();">
            <!-- Наименование товара -->
            <div>
              <label class="text-white/70 text-xs block mb-1">Наименование товара <span class="text-red-400 font-bold">*</span></label>
              <input type="text" id="calcTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm" placeholder="Например: Кроссовки Nike Dunk Low">
            </div>

            <!-- Цена товара с выбором валюты -->
            <div>
              <label class="text-white/70 text-xs block mb-1">Стоимость товара <span class="text-red-400 font-bold">*</span></label>
              <div class="flex gap-2">
                <div class="flex-1">
                  <input type="number" id="calcPrice" step="0.01" min="0" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm" placeholder="Укажите цену">
                </div>
                <div class="relative w-[110px]">
                  <button type="button" id="calcCurrencyBtn" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm flex justify-between items-center cursor-pointer">
                    <span id="calcCurrencyVal">CNY (¥)</span>
                    <span>▼</span>
                  </button>
                  <input type="hidden" id="calcCurrency" value="CNY">
                  <div id="calcCurrencyDropdown" class="hidden absolute right-0 mt-1 w-[120px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden">
                    <div class="p-2.5 hover:bg-white/5 cursor-pointer text-xs text-white border-b border-white/5" onclick="selectCalcCurrency('CNY', 'CNY (¥)')">CNY (¥)</div>
                    <div class="p-2.5 hover:bg-white/5 cursor-pointer text-xs text-white border-b border-white/5" onclick="selectCalcCurrency('USD', 'USD ($)')">USD ($)</div>
                    <div class="p-2.5 hover:bg-white/5 cursor-pointer text-xs text-white border-b border-white/5" onclick="selectCalcCurrency('EUR', 'EUR (€)')">EUR (€)</div>
                    <div class="p-2.5 hover:bg-white/5 cursor-pointer text-xs text-white border-b border-white/5" onclick="selectCalcCurrency('RUB', 'RUB (₽)')">RUB (₽)</div>
                    <div class="p-2.5 hover:bg-white/5 cursor-pointer text-xs text-white" onclick="selectCalcCurrency('BYN', 'BYN (Br)')">BYN (Br)</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Вес товара с ссылкой на помощь -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-white/70 text-xs">Вес товара (кг) <span class="text-red-400 font-bold">*</span></label>
                <button type="button" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1.5 transition active:scale-95 cursor-pointer flex items-center gap-1 border-0" onclick="window.openCalcWeightModal()">
                  ⚖️ Помогите узнать вес
                </button>
              </div>
              <input type="number" id="calcWeight" step="0.01" min="0.05" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm" placeholder="Например: 1.2">
            </div>

            <!-- Страна покупки (выбор) -->
            <div>
              <label class="text-white/70 text-xs block mb-1">Страна покупки</label>
              <div class="relative">
                <button type="button" id="calcCountryBtn" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm flex justify-between items-center cursor-pointer">
                  <span id="calcCountryVal">${countryText}</span>
                  <span>▼</span>
                </button>
                <input type="hidden" id="calcCountryInput" value="${window.calcCountry || 'CN'}">
                <div id="calcCountryDropdown" class="hidden absolute left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden max-h-60 overflow-y-auto">
                  ${ALL_COUNTRIES.map(c => {
                    const isAvailable = c.code === 'CN';
                    const statusBadge = isAvailable
                      ? '<span class="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Доступно</span>'
                      : '<span class="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">Скоро</span>';
                    const opacityClass = isAvailable ? 'text-white' : 'text-white/50 opacity-60';
                    return `
                      <div class="p-3 hover:bg-white/5 cursor-pointer text-xs ${opacityClass} flex justify-between items-center border-b border-white/5" onclick="selectCalcCountry('${c.code}')">
                        <span class="flex items-center gap-2">
                          <span class="text-base">${c.flag}</span>
                          <span>${c.name}</span>
                        </span>
                        ${statusBadge}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Способ доставки по Беларуси -->
            <div>
              <label class="text-white/70 text-xs block mb-1">Доставка по Беларуси <span class="text-red-400 font-bold">*</span></label>
              <select id="calcDeliveryMethod" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm">
                <option value="europost" selected>Европочта (5 BYN)</option>
                <option value="belpost">Белпочта (7 BYN)</option>
                <option value="pickup">Самовывоз (Несвиж) (Бесплатно)</option>
              </select>
            </div>

            <!-- Дополнительные услуги -->
            <div>
              <label class="text-white/70 text-xs block mb-2">Дополнительные услуги</label>
              <div class="space-y-2">
                <div class="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5">
                  <input type="checkbox" id="serviceInsurance" checked disabled class="w-4 h-4 mt-0.5 accent-cyan-500 cursor-not-allowed">
                  <div class="text-xs">
                    <span class="font-bold text-white block">Обязательная страховка 2%</span>
                    <span class="text-[10px] text-white/40 block mt-0.5">Обязательное страхование груза от утери или повреждения.</span>
                  </div>
                </div>
                <div class="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer" onclick="toggleCheckbox('serviceDiscardBox')">
                  <input type="checkbox" id="serviceDiscardBox" class="w-4 h-4 mt-0.5 accent-cyan-500 cursor-pointer" onclick="event.stopPropagation();">
                  <div class="text-xs">
                    <span class="font-bold text-white block">Выкину оригинальную упаковку</span>
                    <span class="text-[10px] text-white/40 block mt-0.5">Уменьшает вес посылки примерно на 0.3 кг, снижая стоимость международной доставки.</span>
                  </div>
                </div>
                <div class="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer" onclick="toggleCheckbox('servicePhotoReport')">
                  <input type="checkbox" id="servicePhotoReport" class="w-4 h-4 mt-0.5 accent-cyan-500 cursor-pointer" onclick="event.stopPropagation();">
                  <div class="text-xs">
                    <span class="font-bold text-white block">Детальный фотоотчет (5 BYN)</span>
                    <span class="text-[10px] text-white/40 block mt-0.5">Сделаем подробные фотографии товара и бирок при поступлении на склад.</span>
                  </div>
                </div>
                <div class="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer" onclick="toggleCheckbox('serviceVideoReport')">
                  <input type="checkbox" id="serviceVideoReport" class="w-4 h-4 mt-0.5 accent-cyan-500 cursor-pointer" onclick="event.stopPropagation();">
                  <div class="text-xs">
                    <span class="font-bold text-white block">Видеообзор 360 градусов (10 BYN)</span>
                    <span class="text-[10px] text-white/40 block mt-0.5">Запишем круговое видео товара для проверки качества перед отправкой.</span>
                  </div>
                </div>
                <div class="flex items-start gap-2.5 bg-white/5 p-3 rounded-xl border border-white/5 cursor-pointer" onclick="toggleCheckbox('serviceFragilePack')">
                  <input type="checkbox" id="serviceFragilePack" class="w-4 h-4 mt-0.5 accent-cyan-500 cursor-pointer" onclick="event.stopPropagation();">
                  <div class="text-xs">
                    <span class="font-bold text-white block">Дополнительная упаковка (10 BYN)</span>
                    <span class="text-[10px] text-white/40 block mt-0.5">Усиленная коробка и воздушно-пузырчатая пленка для хрупких товаров.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Кнопка Рассчитать -->
            <button type="button" id="calcBtn" class="w-full py-4 mt-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold transition active:scale-[0.98] duration-150 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer border-0">
              <span>Рассчитать</span>
            </button>
          </form>

          <!-- Блок результатов -->
          <div id="calcResult" class="mt-6 hidden">
            <div id="calcBreakdown" class="bg-cyan-500/10 border border-cyan-500/25 p-4 rounded-2xl text-left space-y-3">
              <!-- Заполняется динамически -->
            </div>
            
            <div class="flex flex-col gap-2 mt-4">
              <button id="toNewOrderBtn" class="btn-primary w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold transition duration-200 border-0 cursor-pointer">
                <span>Перенести в заказ</span>
              </button>
              
              <button id="calcShareBtn" class="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition hover:bg-white/10 active:scale-95 cursor-pointer" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border); color: #38bdf8;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Поделиться расчетом
              </button>

              <button type="button" id="calcResetBtn" class="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition hover:bg-white/10 active:scale-95 text-white/50 border border-white/10 cursor-pointer bg-transparent" onclick="window.resetCalculatorCalculation()">
                🗑️ Сбросить расчет
              </button>
            </div>
          </div>
        </div>

        <!-- Предупреждение -->
        <div class="mt-4 text-center max-w-md mx-auto">
          <p class="text-white/40 text-[10px]">⚠️ Обратите внимание: расчет является ориентировочным. Окончательная стоимость формируется после взвешивания на нашем складе.</p>
        </div>
        ${renderFooter()}
      `;
    }


// Global Exports
if (typeof renderHome === 'function') window.renderHome = renderHome;
if (typeof attachHomeHandlers === 'function') window.attachHomeHandlers = attachHomeHandlers;
if (typeof loadHomeProducts === 'function') window.loadHomeProducts = loadHomeProducts;
if (typeof scrollToPageTop === 'function') window.scrollToPageTop = scrollToPageTop;
if (typeof renderCalculator === 'function') window.renderCalculator = renderCalculator;
