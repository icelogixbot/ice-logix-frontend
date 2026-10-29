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
  return window.UI.productCard(p, inWish);
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

    const _U = window.UI;
    const _hour = new Date().getHours();
    const _greet = _hour < 5 ? 'Доброй ночи' : _hour < 12 ? 'Доброе утро' : _hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const _name = (typeof userName !== 'undefined' && userName && userName !== 'Гость') ? String(userName).split(' ')[0] : '';
    const _wl = (typeof wishlist !== 'undefined' && wishlist) ? wishlist : (window.wishlist || null);
    const _quick = [
      { story: 'onboarding', icon: 'book', label: 'Как заказать' },
      { story: 'legitcheck', icon: 'shield', label: 'Легит-чек' },
      { story: 'my_orders', icon: 'box', label: 'Мои заказы' },
      { story: 'reports', icon: 'camera', label: 'Фотоотчёты' },
      { story: 'reviews', icon: 'star', label: 'Отзывы' },
      { story: 'promo', icon: 'gift', label: 'Акции' },
    ];

    return `
    <div class="hm page-enter">
      <section class="hm-hello">
        <div class="hm-hello-k">${_greet}${_name ? ', ' + _U.esc(_name) : ''}</div>
        <h1 class="hm-hello-t">Что привезём из Китая?</h1>
      </section>

      <div class="banner-carousel-wrapper" id="bannerCarouselWrapper">
        <div class="banner-carousel" id="promoBannersContainer">
          ${await renderPromoBanners()}
        </div>
        <div class="banner-dots" id="bannerDots"></div>
      </div>

      <section class="hm-quick">
        ${_quick.map(q => `
          <button type="button" class="story-card hm-q" data-story="${q.story}">
            <span class="hm-q-ico">${_U.icon(q.icon, 24)}</span>
            <span class="hm-q-label">${q.label}</span>
          </button>`).join('')}
      </section>

      <section class="hm-sec">
        <div class="rd-section"><h2>Площадки</h2><button type="button" class="rd-link" id="moreMarketplacesBtn">Все ${_U.icon('chevR', 16)}</button></div>
        <div class="hm-mp-row">
          ${marketplaces.map(mp => {
            const logoSrc = getMarketplaceLogo(mp.name, mp.logo_url);
            return `
            <button type="button" class="story-card marketplace-story hm-mp" data-url="${mp.website_url || mp.url}" data-name="${mp.name}">
              <span class="hm-mp-logo">${logoSrc ? `<img src="${logoSrc}" alt="" loading="eager" decoding="async">` : _U.icon('store', 26)}</span>
              <span class="hm-mp-name">${mp.name === '95' ? '95fen' : mp.name}</span>
            </button>`;
          }).join('')}
        </div>
      </section>

      <section class="hm-sec">
        <div class="hm-how">
          <div class="hm-how-head">
            <div>
              <div class="hm-how-k">Как это работает</div>
              <div class="hm-how-t">Заказ из Китая за 3 шага</div>
            </div>
            <span class="hm-how-badge">${_U.icon('zap', 18)}</span>
          </div>
          <ol class="hm-how-steps">
            <li><span>1</span><div><b>Найдите вещь</b><small>На Poizon, Taobao или любой другой площадке</small></div></li>
            <li><span>2</span><div><b>Вставьте ссылку</b><small>Посчитаем цену под ключ за минуту</small></div></li>
            <li><span>3</span><div><b>Получите в Беларуси</b><small>Выкупим, проверим и привезём</small></div></li>
          </ol>
          <button type="button" class="rd-btn rd-btn-block" onclick="window.switchTab('calculator')">${_U.icon('calc', 20)}Рассчитать заказ</button>
        </div>
      </section>

      <section class="hm-sec">
        <div class="rd-section">
          <h2>Подборки дня</h2>
          ${homeProductsList.length ? `<span class="rd-pill"><i></i>${homeProductsList.length} ${homeProductsList.length === 1 ? 'дроп' : (homeProductsList.length < 5 ? 'дропа' : 'дропов')}</span>` : ''}
        </div>
        <div class="hm-grid" id="homeProductsGrid">
          ${homeProductsList.length
            ? homeProductsList.map(p => _U.productCard(p, _wl && _wl.has ? _wl.has(p.id) : false)).join('')
            : _U.gridSkeleton(4)}
        </div>
      </section>
    </div>
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
            switchTab('referral');
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
            addToCart(productId, 1, true);
            if (window.UI) window.UI.toast('Добавлено в корзину');
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
            grid.innerHTML = '<div class="hm-grid-empty">' + window.UI.empty({ icon: 'sparkles', title: 'Подборки готовятся', text: 'Новые дропы появляются каждый день. Загляните чуть позже или посчитайте свой заказ.', action: 'Рассчитать заказ', onclick: "window.switchTab('calculator')" }) + '</div>';
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
          addToCart(productId, 1, true);
          if (window.UI) window.UI.toast('Добавлено в корзину');
          btn.classList.add('added-anim');
          setTimeout(() => btn.classList.remove('added-anim'), 400);
        }
      };
    });

    // Нажатие на карточку открывает страницу товара (см. ice-ui.js, делегированный обработчик)

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
