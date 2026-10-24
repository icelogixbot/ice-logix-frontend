// ============================================================
// ICE LOGIX Module: Home Screen
// ============================================================

function _esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
if (typeof _esc === 'function') window._esc = _esc;

// Вспомогательная функция получения оригинального PNG-логотипа из оперативной памяти (0 мс)
function getMarketplaceLogo(nameOrSlug, fallbackUrl) {
  if (typeof window !== 'undefined' && window.ORIGINAL_MARKETPLACE_PNG_DATA) {
    const s = String(nameOrSlug || '').toLowerCase();
    if (window.ORIGINAL_MARKETPLACE_PNG_DATA[s]) return window.ORIGINAL_MARKETPLACE_PNG_DATA[s];
    if (s.includes('dewu') || s.includes('poizon')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['dewu'];
    if (s.includes('taobao')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['taobao'];
    if (s.includes('pinduoduo') || s.includes('пиндуодуо')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['pinduoduo'];
    if (s.includes('goofish') || s.includes('xianyu') || s.includes('сяньюй')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['goofish'];
    if (s.includes('95')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['95fen'] || window.ORIGINAL_MARKETPLACE_PNG_DATA['95'];
    if (s.includes('jd')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['jd'];
    if (s.includes('tmall')) return window.ORIGINAL_MARKETPLACE_PNG_DATA['tmall'];
  }
  return fallbackUrl;
}

// In-memory кэш для мгновенного рендера
let _memHomeDbMarketplaces = null;
let _memHomeProductsList = null;

// Вспомогательная функция рендеринга карточки товара в стиле Wildberries
function renderWbProductCard(p, inWish) {
  const brand = p.brand ? p.brand.trim() : 'ICE LOGIX';
  const priceVal = Number(p.price || 0);
  const oldPriceVal = priceVal * 1.35;
  const bynSignHtml = window.bynSign ? window.bynSign({ color: 'cyan', size: '0.82em' }) : '';
  const bynMutedSign = window.bynSign ? window.bynSign({ color: 'muted', size: '0.72em' }) : '';

  return `
    <div class="product-card cursor-pointer" data-product-id="${p.id}" data-url="${p.url || ''}" data-price="${p.price}">
      <div class="relative w-full overflow-hidden" style="border-radius: 14px 14px 0 0;">
        ${renderCardMedia(p.image_urls || p.image_url, p.title)}
        
        <!-- Top-Right: Wishlist Heart -->
        <span class="wishlist-heart absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-sm ${inWish ? 'text-red-500' : 'text-white/70'} z-20 hover:scale-110 active:scale-95 transition" data-product-id="${p.id}" aria-label="В избранное">
          ${getHeartIcon(inWish)}
        </span>

        <!-- Bottom-Left: Badges (WB Style) -->
        <div class="absolute bottom-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
          <span class="bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider">${_esc(brand)}</span>
          <span class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-sm">100% ОРИГИНАЛ</span>
        </div>

        <!-- Bottom-Right: Floating Circular Cart Button (WB Style) -->
        <button type="button" class="wb-card-cart-btn addToCartBtn" data-product-id="${p.id}" aria-label="В корзину" title="В корзину">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </button>
      </div>

      <!-- Compact WB Info Section (NO heavy bottom buttons!) -->
      <div style="padding: 8px 8px 10px 8px; display: flex; flex-direction: column;">
        <!-- Row 1: Price and Strikethrough -->
        <div class="flex items-baseline gap-1.5">
          <span class="text-cyan-400 font-extrabold text-[15px] font-mono leading-none inline-flex items-baseline gap-0.5">
            ${priceVal.toFixed(2)} ${bynSignHtml}
          </span>
          <span class="text-[11px] text-white/35 line-through font-mono">
            ${oldPriceVal.toFixed(2)} ${bynMutedSign}
          </span>
        </div>

        <!-- Row 2: Brand -->
        <div class="text-[11px] font-bold text-white/90 mt-1 uppercase tracking-wide truncate">
          ${_esc(brand)}
        </div>

        <!-- Row 3: Product Name -->
        <div class="text-[11px] font-medium text-white/60 truncate mt-0.5" title="${_esc(p.title)}">
          ${_esc(p.title)}
        </div>

        <!-- Row 4: Rating -->
        <div class="flex items-center gap-1 text-[10px] text-white/45 mt-1.5">
          <span class="text-amber-400">★</span>
          <span class="font-bold text-white/80">4.9</span>
          <span>·</span>
          <span>128 оценок</span>
        </div>
      </div>
    </div>
  `;
}

// ==================== РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ====================
async function renderHome() {
  try {
    // 7 неизменных официальных китайских площадок
    const staticMarketplaces = [
      { name: 'Dewu', url: 'https://dewu.com', website_url: 'https://dewu.com', logo_url: getMarketplaceLogo('dewu', '/assets/marketplaces/dewu.png'), icon: '<span class="mp-dot" style="background:#00f5d4" aria-hidden="true"></span>' },
      { name: 'TaoBao', url: 'https://taobao.com', website_url: 'https://taobao.com', logo_url: getMarketplaceLogo('taobao', '/assets/marketplaces/taobao.png'), icon: '<span class="mp-dot" style="background:#ff5000" aria-hidden="true"></span>' },
      { name: 'Pinduoduo', url: 'https://mobile.yangkeduo.com', website_url: 'https://mobile.yangkeduo.com', logo_url: getMarketplaceLogo('pinduoduo', '/assets/marketplaces/pinduoduo.png'), icon: '<span class="mp-dot" style="background:#e02e24" aria-hidden="true"></span>' },
      { name: 'Goofish', url: 'https://www.goofish.com', website_url: 'https://www.goofish.com', logo_url: getMarketplaceLogo('goofish', '/assets/marketplaces/goofish.png'), icon: '<span class="mp-dot" style="background:#ffd400" aria-hidden="true"></span>' },
      { name: '95', url: 'https://www.95fen.com', website_url: 'https://www.95fen.com', logo_url: getMarketplaceLogo('95fen', '/assets/marketplaces/95fen.png'), icon: '<span class="mp-dot" style="background:#00ff9d" aria-hidden="true"></span>' },
      { name: 'JD', url: 'https://www.jd.com', website_url: 'https://www.jd.com', logo_url: getMarketplaceLogo('jd', '/assets/marketplaces/jd.png'), icon: '<span class="mp-dot" style="background:#ea251b" aria-hidden="true"></span>' },
      { name: 'Tmall', url: 'https://www.tmall.com', website_url: 'https://www.tmall.com', logo_url: getMarketplaceLogo('tmall', '/assets/marketplaces/tmall.png'), icon: '<span class="mp-dot" style="background:#ff0036" aria-hidden="true"></span>' }
    ];

    let dbMarketplaces = _memHomeDbMarketplaces || [];
    if (!dbMarketplaces.length) {
      const _sb = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
      if (window.CacheDB && _sb) {
        window.CacheDB.get('marketplaces', async () => {
          const { data } = await _sb.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true });
          return data;
        }, 300000).then(dbData => {
          if (dbData) _memHomeDbMarketplaces = preprocessMarketplaces(dbData);
        }).catch(() => {});
      }
    }

    const homeDbMarketplaces = dbMarketplaces
      .filter(mp => mp.show_on_home)
      .filter(mp => {
        const n = (mp.name || '').toLowerCase();
        return ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'].some(slug => n.includes(slug));
      });

    const marketplaces = staticMarketplaces.map(st => {
      const fromDb = homeDbMarketplaces.find(db => (db.name || '').toLowerCase() === st.name.toLowerCase());
      return fromDb ? { ...st, website_url: fromDb.website_url || st.website_url, url: fromDb.website_url || st.url } : st;
    });

    // 5 идентичных сетов (35 карточек). Средний сет 2 стартует с индекса 14 (Dewu).
    const fullMarketplaces = [];
    for (let s = 0; s < 5; s++) fullMarketplaces.push(...marketplaces);

    // Подборки товаров (автопарсинг из канала)
    let homeProductsList = _memHomeProductsList || [];
    if (!homeProductsList.length) {
      const _sbClient = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
      if (window.CacheDB && _sbClient) {
        window.CacheDB.get('todaySelectionDrops', async () => {
          const { data } = await _sbClient
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('show_on_home', true)
            .order('created_at', { ascending: false })
            .limit(9);
          return data;
        }, 300000).then(drops => {
          if (drops && drops.length > 0) {
            _memHomeProductsList = preprocessProducts(drops);
            const grid = document.getElementById('homeProductsGrid');
            if (grid && (!grid.children || grid.children.length === 0)) {
              if (typeof _renderHomeDropCards === 'function') {
                grid.innerHTML = _renderHomeDropCards(_memHomeProductsList);
              }
            }
          }
        }).catch(() => {});
      }
    }

    // Сохраняем сквозной глобальный индекс рулетки, чтобы при переходе между вкладками карусель продолжала непрерывный ход
    let currentMpIndex = 14;
    if (typeof window !== 'undefined') {
      if (window.__mpEngine && window.__mpEngine.index != null) {
        currentMpIndex = window.__mpEngine.index;
      } else if (window.__mpGlobalIndex != null) {
        currentMpIndex = window.__mpGlobalIndex;
      }
    }
    while (currentMpIndex > 20) currentMpIndex -= 7;
    while (currentMpIndex < 14) currentMpIndex += 7;
    if (typeof window !== 'undefined') {
      if (window.__mpEngine) window.__mpEngine.index = currentMpIndex;
      window.__mpGlobalIndex = currentMpIndex;
    }

    return `
    <!-- Popular Marketplaces Capsule (Monolithic Tabbed Dock from User Sketch) -->
    <div class="marketplaces-capsule-section mb-4">
      <div class="marketplaces-capsule">
        <svg class="marketplaces-capsule-svg" viewBox="0 0 351 124" preserveAspectRatio="none">
          <defs>
            <linearGradient id="capsuleFillGrad" x1="0" y1="0" x2="0" y2="100%">
              <stop offset="0%" stop-color="#14283c"/>
              <stop offset="30%" stop-color="#0f1f2e"/>
              <stop offset="100%" stop-color="#081018"/>
            </linearGradient>
            <linearGradient id="capsuleStrokeGrad" x1="0" y1="0" x2="100%" y2="0">
              <stop offset="0%" stop-color="rgba(130, 199, 241, 0.22)"/>
              <stop offset="50%" stop-color="rgba(130, 199, 241, 0.5)"/>
              <stop offset="100%" stop-color="rgba(130, 199, 241, 0.22)"/>
            </linearGradient>
          </defs>
          <path d="
            M 20,24
            L 108,24
            C 120,24 124,3 136,3
            L 215,3
            C 227,3 231,24 243,24
            L 331,24
            A 18,18 0 0 1 349,42
            L 349,104
            A 18,18 0 0 1 331,122
            L 20,122
            A 18,18 0 0 1 2,104
            L 2,42
            A 18,18 0 0 1 20,24
            Z
          " fill="url(#capsuleFillGrad)" stroke="url(#capsuleStrokeGrad)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        </svg>
        <span class="marketplaces-ear-title">Площадки</span>

        <!-- CS:GO Reticle Target Frame -->
        <div class="marketplaces-reticle"></div>

        <!-- Strictly clipped inside the module -->
        <div class="marketplaces-inner-clipper">
          <div class="marketplaces-track" id="marketplaceRouletteTrack">
            <div class="marketplaces-ribbon" id="marketplaceRibbon" style="left: 50%; transform: translate3d(${-(currentMpIndex * 80 + 32)}px, 0, 0);">
              ${fullMarketplaces.map((mp, idx) => {
                const logoSrc = getMarketplaceLogo(mp.name, mp.logo_url);
                const isActive = (idx === currentMpIndex);
                return `
                <div class="story-card marketplace-story ${isActive ? 'is-active-target' : ''}" data-url="${mp.website_url || mp.url}" data-name="${mp.name}" data-idx="${idx}">
                  <div class="story-icon">
                    ${logoSrc ? `<img src="${logoSrc}" loading="eager" fetchpriority="high" decoding="sync" class="w-full h-full object-contain" alt="${mp.name}">` : ''}
                    <span style="${logoSrc ? 'display:none;' : ''} font-size: 20px;">${mp.icon || '<span class="mp-dot" style="background:#374151"></span>'}</span>
                  </div>
                  <span class="story-label">${mp.name}</span>
                </div>
              `;}).join('')}
            </div>
          </div>
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
    <div class="mb-4">
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
      <div class="story-card" data-story="my_orders">
        <div class="story-icon" style="background: linear-gradient(145deg, rgba(6,182,212,0.25), rgba(14,165,233,0.12));">
          <span style="font-size: 24px;"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></span>
        </div>
        <span class="story-label">Заказы</span>
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
        ${homeProductsList.map(p => {
          const _inWish = ((typeof wishlist !== 'undefined' && wishlist?.has) ? wishlist.has(p.id) : (window.wishlist?.has ? window.wishlist.has(p.id) : false));
          return renderWbProductCard(p, _inWish);
        }).join('')}
      </div>
    </div>
    
    ${renderFooter()}
  `;
  } catch (err) {
    console.error('Error rendering home screen:', err);
    return `<div class="glass-card p-6 text-center text-white my-8"><p class="font-bold text-sm mb-2">Главная страница загружается...</p><button class="btn-primary py-2 px-4 rounded-xl text-xs mt-2" onclick="window.switchTab('home');">Обновить</button></div>`;
  }
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
      document.querySelector('[data-story="my_orders"]')?.addEventListener('click', () => {
        if (!window.userId) { window.requireAuth('Для просмотра заказов необходимо войти или зарегистрироваться.'); return; }
        switchTab('profile', 'myOrders');
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
      // Initialize CS:GO Case Roulette for Marketplaces (Variant B)
      initMarketplaceRoulette();

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
          } else if (action === 'referral') {
            if (window.tgUtil && window.tgUtil.haptic) {
              window.tgUtil.haptic('light');
            }
            switchTab('profile');
            setTimeout(() => {
              const refEl = document.getElementById('referralSection');
              if (refEl) {
                refEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                refEl.style.boxShadow = '0 0 25px rgba(52, 211, 153, 0.4)';
                setTimeout(() => { refEl.style.boxShadow = ''; }, 2000);
              }
            }, 300);
          }
        });
      });

      initCardSliders();
      loadHomeProducts();

      document.querySelectorAll('.addToCartBtn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          if (!window.userId) { window.requireAuth('Для добавления в корзину необходимо войти или зарегистрироваться.'); return; }
          const productId = btn.dataset.productId;
          if (productId) {
            if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
            addToCart(productId);
            btn.classList.add('added-anim');
            setTimeout(() => btn.classList.remove('added-anim'), 400);
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
          data = [];
        }

        const existingCards = Array.from(grid.querySelectorAll('.product-card'));
        const existingIds = existingCards.map(c => c.dataset.productId).join(',');
        const newIds = data.map(p => p.id).join(',');

        if (existingCards.length === 0 || existingIds !== newIds) {
          if (data.length === 0) {
            grid.innerHTML = '<p class="text-white/50 text-xs col-span-2 text-center py-6">Сегодняшние подборки скоро появятся в канале...</p>';
          } else {
            grid.innerHTML = data.map(p => {
              const _inWish = ((typeof wishlist !== 'undefined' && wishlist?.has) ? wishlist.has(p.id) : (window.wishlist?.has ? window.wishlist.has(p.id) : false));
              return renderWbProductCard(p, _inWish);
            }).join('');
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
        if (productId) {
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
          addToCart(productId);
          btn.classList.add('added-anim');
          setTimeout(() => btn.classList.remove('added-anim'), 400);
        }
      };
    });

    grid.querySelectorAll('.product-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.wishlist-heart') || e.target.closest('.addToCartBtn') || e.target.closest('.card-slider') || e.target.closest('.card-dots')) return;
        const productId = card.dataset.productId;
        const url = card.dataset.url;
        const price = parseFloat(card.dataset.price);
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
      if (typeof window.renderSmartCalculator === 'function') {
        return await window.renderSmartCalculator();
      }
      return '<div class="glass-card p-6 text-center text-white my-8"><p class="font-bold text-sm">Калькулятор загружается...</p></div>';
    }


// ==================== ВЕЧНЫЙ ДВИЖОК РУЛЕТКИ ПЛОЩАДОК (Exactly 2.0s Dwell) ====================
// Каждый логотип строго находится в видоискателе ровно 2.0 секунды (2000 мс).
const MP_DWELL_MS = 2000;    // Строго ровно 2.0 секунды фиксации каждого логотипа в окне
const MP_ANIM_MS = 450;      // 0.45 секунды мягкий плавный ход
const MP_CYCLE_MS = MP_DWELL_MS + MP_ANIM_MS; // 2450 мс полный шаг

if (typeof window !== 'undefined') {
  if (!window.__mpEngine) {
    window.__mpEngine = {
      index: 14, // Базовый старт: средний сет (Dewu)
      stepTimerId: null,
      animTimerId: null,
      isDragging: false,
      isTransitioning: false
    };

    window.__mpClearTimers = function() {
      const eng = window.__mpEngine;
      if (!eng) return;
      if (eng.stepTimerId) { clearTimeout(eng.stepTimerId); eng.stepTimerId = null; }
      if (eng.animTimerId) { clearTimeout(eng.animTimerId); eng.animTimerId = null; }
    };

    window.__mpScheduleStep = function(delay = MP_DWELL_MS) {
      if (typeof window === 'undefined') return;
      window.__mpClearTimers();
      const eng = window.__mpEngine;
      if (!eng || eng.isDragging) return;

      eng.stepTimerId = setTimeout(() => {
        const ribbon = document.getElementById('marketplaceRibbon');
        const track = document.getElementById('marketplaceRouletteTrack');

        if (ribbon && track && typeof window.__mpGoToIndex === 'function') {
          // Экран Главной активен: запускаем видимый свайп
          window.__mpGoToIndex(eng.index + 1);
        } else {
          // Фоновый режим: аккуратно передвигаем индекс и планируем следующий шаг
          eng.index++;
          while (eng.index > 20) eng.index -= 7;
          while (eng.index < 14) eng.index += 7;
          window.__mpGlobalIndex = eng.index;
          window.__mpScheduleStep(MP_CYCLE_MS);
        }
      }, delay);
    };

    // Запуск первичного отсчета при загрузке скрипта: ровно 2.0 секунды
    window.__mpScheduleStep(MP_DWELL_MS);
  }
}

function initMarketplaceRoulette() {
  const track = document.getElementById('marketplaceRouletteTrack');
  const ribbon = document.getElementById('marketplaceRibbon');
  if (!track || !ribbon) return;

  // Защита от повторной инициализации на одном и том же элементе (исключает сбои таймера)
  if (ribbon.dataset.mpInitialized === 'true') {
    return;
  }
  ribbon.dataset.mpInitialized = 'true';

  // Очистка предыдущих слушателей событий окна для предотвращения утечек памяти
  if (window.__mpCleanup) {
    try { window.__mpCleanup(); } catch (e) {}
    window.__mpCleanup = null;
  }
  if (window.__mpResumeTimer) {
    clearTimeout(window.__mpResumeTimer);
    window.__mpResumeTimer = null;
  }
  if (window.__mpRafId) {
    cancelAnimationFrame(window.__mpRafId);
    window.__mpRafId = null;
  }

  const engine = window.__mpEngine || {
    index: 14,
    stepTimerId: null,
    animTimerId: null,
    isDragging: false,
    isTransitioning: false
  };
  window.__mpEngine = engine;

  const CARD_WIDTH = 64;
  const GAP = 16;
  const STEP = CARD_WIDTH + GAP; // 80px
  const N_ITEMS = 7;
  const BASE_SET = 2; // Средний сет 2 (индексы 14..20)

  const cards = Array.from(ribbon.querySelectorAll('.story-card'));
  if (cards.length === 0) return;

  // Подхватываем текущий сквозной индекс вечного движка
  let currentIndex = engine.index;
  while (currentIndex > 20) currentIndex -= 7;
  while (currentIndex < 14) currentIndex += 7;
  engine.index = currentIndex;
  window.__mpGlobalIndex = currentIndex;

  let currentX = -(currentIndex * STEP + CARD_WIDTH / 2);

  function getXForIndex(idx) {
    return -(idx * STEP + CARD_WIDTH / 2);
  }

  function highlightCard(idx) {
    cards.forEach((c, i) => {
      c.classList.toggle('is-active-target', i === idx);
    });
  }

  function applyPosition(idx, animate = true, duration = 0.45) {
    const targetX = getXForIndex(idx);
    currentX = targetX;
    if (animate) {
      ribbon.style.transition = `transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`;
    } else {
      ribbon.style.transition = 'none';
    }
    ribbon.style.transform = `translate3d(${targetX}px, 0, 0)`;
    highlightCard(idx);
  }

  function normalizeIndex() {
    if (currentIndex >= (BASE_SET + 1) * N_ITEMS || currentIndex < BASE_SET * N_ITEMS) {
      ribbon.style.transition = 'none';
      cards.forEach(c => { c.style.transition = 'none'; });

      while (currentIndex >= (BASE_SET + 1) * N_ITEMS) currentIndex -= N_ITEMS;
      while (currentIndex < BASE_SET * N_ITEMS) currentIndex += N_ITEMS;

      currentX = getXForIndex(currentIndex);
      ribbon.style.transform = `translate3d(${currentX}px, 0, 0)`;
      highlightCard(currentIndex);

      void ribbon.offsetWidth;

      requestAnimationFrame(() => {
        cards.forEach(c => { c.style.transition = ''; });
      });
    }
    engine.index = currentIndex;
    window.__mpGlobalIndex = currentIndex;
  }

  window.__mpGoToIndex = function(targetIdx, duration = 0.45) {
    if (engine.isDragging) return;
    engine.isTransitioning = true;
    currentIndex = targetIdx;
    engine.index = currentIndex;
    window.__mpGlobalIndex = currentIndex;

    applyPosition(currentIndex, true, duration);

    window.__mpClearTimers();
    engine.animTimerId = setTimeout(() => {
      if (!ribbon) return;
      normalizeIndex();
      engine.isTransitioning = false;

      // Логотип встал ровно по центру: фиксация ровно на 2.0 секунды!
      window.__mpScheduleStep(MP_DWELL_MS);
    }, Math.round(duration * 1000));
  };

  // ==================== СВОБОДНЫЙ И ЛЕГКИЙ СКРОЛЛ / СВАЙП С ИНЕРЦИЕЙ ====================
  let hasDragged = false;
  let startX = 0;
  let dragOriginX = 0;
  let lastDragX = 0;
  let lastDragTime = 0;
  let velocity = 0;

  function getCurrentTransformX() {
    try {
      const style = window.getComputedStyle(ribbon);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return matrix.m41 || getXForIndex(currentIndex);
    } catch (e) {
      return getXForIndex(currentIndex);
    }
  }

  function onPointerDown(e) {
    window.__mpClearTimers();
    clearTimeout(window.__mpResumeTimer);

    // Если карточки были в движении — мгновенно подхватываем их с текущего пикселя без задержек и залипаний!
    if (engine.isTransitioning) {
      currentX = getCurrentTransformX();
      ribbon.style.transition = 'none';
      ribbon.style.transform = `translate3d(${currentX}px, 0, 0)`;
      engine.isTransitioning = false;
    } else {
      currentX = getXForIndex(currentIndex);
    }

    engine.isDragging = true;
    hasDragged = false;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    dragOriginX = currentX;
    lastDragX = startX;
    lastDragTime = performance.now();
    velocity = 0;

    ribbon.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!engine.isDragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - startX;
    if (Math.abs(dx) > 5) hasDragged = true;

    const now = performance.now();
    const dt = now - lastDragTime;
    if (dt > 10) {
      velocity = (x - lastDragX) / dt; // скорость свайпа px/ms
      lastDragX = x;
      lastDragTime = now;
    }

    const newX = dragOriginX + dx;
    ribbon.style.transform = `translate3d(${newX}px, 0, 0)`;

    // Динамическая живая подсветка карточки при приближении к центру
    const approxIdx = Math.round((-newX - CARD_WIDTH / 2) / STEP);
    const clampedIdx = Math.max(0, Math.min(cards.length - 1, approxIdx));
    highlightCard(clampedIdx);
  }

  function onPointerUp(e) {
    if (!engine.isDragging) return;
    engine.isDragging = false;

    const x = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || lastDragX);
    const dx = x - startX;

    if (!hasDragged) {
      // Обычный тап без перемещения: мягко центруем текущую карточку
      applyPosition(currentIndex, true, 0.25);
      window.__mpScheduleStep(MP_DWELL_MS);
      return;
    }

    // Вычисляем целевую карточку с учетом смещения и импульса броска пальцем
    const currentTrackX = dragOriginX + dx;
    let targetIdx = Math.round((-currentTrackX - CARD_WIDTH / 2) / STEP);

    // Добавляем инерцию при быстром свайпе (flick momentum)
    if (Math.abs(velocity) > 0.35) {
      const momentumStep = Math.round(-velocity * 120 / STEP);
      const bonus = Math.sign(momentumStep) * Math.min(Math.abs(momentumStep), 2);
      targetIdx += bonus;
    }

    // Безопасные границы внутри 5 сетов
    targetIdx = Math.max(2, Math.min(cards.length - 3, targetIdx));

    // Мягкий доводчик в центр с кривой отклика Apple
    window.__mpGoToIndex(targetIdx, 0.45);
  }

  const onResize = () => {
    applyPosition(currentIndex, false);
  };

  track.addEventListener('touchstart', onPointerDown, { passive: true });
  track.addEventListener('touchmove', onPointerMove, { passive: true });
  track.addEventListener('touchend', onPointerUp, { passive: true });
  track.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('resize', onResize);

  window.__mpCleanup = () => {
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('resize', onResize);
  };

  track.onclick = (e) => {
    if (hasDragged) return;
    const card = e.target.closest('.marketplace-story');
    if (!card) return;
    const url = card.getAttribute('data-url');
    if (url) {
      if (window.tgUtil && window.tgUtil.openLink) window.tgUtil.openLink(url);
      else window.open(url, '_blank');
    } else {
      if (window.tgUtil && window.tgUtil.alert) window.tgUtil.alert('Ссылка на площадку будет добавлена позже');
    }
  };

  // Мгновенная фиксация текущего положения без рывка
  applyPosition(currentIndex, false);

  // Каждый логотип находится в окне РОВНО 2 секунды (2000 мс)
  window.__mpScheduleStep(MP_DWELL_MS);
}

// Global Exports
if (typeof renderHome === 'function') window.renderHome = renderHome;
if (typeof attachHomeHandlers === 'function') window.attachHomeHandlers = attachHomeHandlers;
if (typeof initMarketplaceRoulette === 'function') window.initMarketplaceRoulette = initMarketplaceRoulette;
if (typeof loadHomeProducts === 'function') window.loadHomeProducts = loadHomeProducts;
if (typeof scrollToPageTop === 'function') window.scrollToPageTop = scrollToPageTop;
if (typeof renderCalculator === 'function') window.renderCalculator = renderCalculator;
