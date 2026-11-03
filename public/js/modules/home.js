// ============================================================
// ICE LOGIX Module: Home Screen
// Главная: плитки площадок → баннеры (бесконечная лента) → разделы 3×2 → товары
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
let _memHomePromos = null;

// Карточка товара (общая, из ice-ui.js)
function renderWbProductCard(p, inWish) {
  return window.UI.productCard(p, inWish);
}

// Карточка «Подборки дня» — с меткой «Подборка» внизу фото
function _hmPickCard(p, inWish) {
  const mark = `<span class="hm-pick-mark">${window.UI.icon('flame', 12)}Подборка</span>`;
  return renderWbProductCard(p, inWish).replace('<div class="pc-media">', '<div class="pc-media">' + mark);
}

function _hmInWish(id) {
  const w = (typeof wishlist !== 'undefined' && wishlist) ? wishlist : window.wishlist;
  return !!(w && w.has && w.has(id));
}

function _hmSb() {
  return (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
}

// 7 официальных китайских площадок (ссылки можно переопределить из БД)
const _HM_MARKETPLACES = [
  { name: 'Dewu', slug: 'dewu', url: 'https://dewu.com' },
  { name: 'TaoBao', slug: 'taobao', url: 'https://taobao.com' },
  { name: 'Pinduoduo', slug: 'pinduoduo', url: 'https://mobile.yangkeduo.com' },
  { name: 'Goofish', slug: 'goofish', url: 'https://www.goofish.com' },
  { name: '95', label: '95fen', slug: '95fen', url: 'https://www.95fen.com' },
  { name: 'JD', slug: 'jd', url: 'https://www.jd.com' },
  { name: 'Tmall', slug: 'tmall', url: 'https://www.tmall.com' }
];

function _hmMarketplaces() {
  if (!_memHomeDbMarketplaces) {
    const sb = _hmSb();
    if (window.CacheDB && sb) {
      window.CacheDB.get('marketplaces', async () => {
        const { data } = await sb.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true });
        return data;
      }, 300000).then(dbData => {
        if (dbData) _memHomeDbMarketplaces = preprocessMarketplaces(dbData);
      }).catch(() => {});
    }
  }
  const fromDb = (_memHomeDbMarketplaces || []).filter(mp => mp.show_on_home);
  return _HM_MARKETPLACES.map(st => {
    const db = fromDb.find(d => (d.name || '').toLowerCase() === st.name.toLowerCase());
    return { ...st, url: (db && db.website_url) || st.url };
  });
}

// ==================== БАННЕРЫ ====================
// Курс юаня: только реальный (настройки или курс НБРБ + буфер), без выдуманных чисел
function _hmRateSync() {
  const s = window.appSettings;
  if (s && Number(s.cny_rate) > 0) return Number(s.cny_rate);
  return window._hmCnyRate || 0;
}
async function _hmRateAsync() {
  let r = _hmRateSync();
  if (r) return r;
  try {
    const P = window.iceLogixPricing;
    if (P && P.getExchangeRates) {
      const rates = await P.getExchangeRates();
      if (rates && rates.CNY_to_BYN) {
        r = rates.CNY_to_BYN * (1 + ((P.CONFIG && P.CONFIG.currency_buffer_pct) || 3) / 100);
        window._hmCnyRate = r;
      }
    }
  } catch (e) {}
  return r || 0;
}
function _hmMoney(v, dec) {
  if (typeof window.formatBYN === 'function') return window.formatBYN(v, { decimals: dec });
  return window.UI ? window.UI.money(v) : String(v);
}

function _hmFetchPromos() {
  const sb = _hmSb();
  if (!sb || !window.CacheDB) return Promise.resolve(null);
  return window.CacheDB.get('promotions', async () => {
    const { data } = await sb.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5);
    return data;
  }, 300000).then(d => {
    const live = (d || []).filter(p => typeof window.isPromotionLive === 'function' ? window.isPromotionLive(p) : true);
    _memHomePromos = live;
    return live;
  }).catch(() => null);
}

function _hmSlide(o) {
  const _U = window.UI;
  return `<div class="hb-slide hb-c-${o.tone}" ${o.attr}>
      <div class="hb-txt">
        <span class="hb-k">${o.k}</span>
        <span class="hb-t">${o.t}</span>
        ${o.s ? `<span class="hb-s">${o.s}</span>` : ''}
        <span class="hb-btn">${o.btn}${_U.icon('chevR', 14)}</span>
      </div>
      <span class="hb-art" aria-hidden="true">${o.art || ''}</span>
    </div>`;
}

function _hmPromoSlide(p) {
  const pct = String(p.discount_type || '').includes('percent') && Number(p.discount_value) > 0 ? Math.round(Number(p.discount_value)) : 0;
  const t = _esc(p.title || 'Акция');
  const id = _esc(p.id);
  if (p.banner_url) {
    return `<div class="hb-slide hb-img" data-promo="${id}">
      <img src="${_esc(p.banner_url)}" alt="" draggable="false" decoding="async">
      <div class="hb-txt"><span class="hb-k">Акция</span><span class="hb-t">${t}</span></div>
    </div>`;
  }
  return _hmSlide({
    tone: 'promo', attr: `data-promo="${id}"`, k: 'Акция',
    t: pct ? `−${pct}%` : t,
    s: pct ? t : _esc(p.description || 'Скидка применится в калькуляторе'),
    btn: 'Применить', art: (window.HOME_ART || {}).bPromo
  });
}

function _hmBannerSlides(promos) {
  const A = window.HOME_ART || {};
  const r = _hmRateSync();
  const slides = [_hmSlide({
    tone: 'rate', attr: 'data-act="calc"', k: 'Курс юаня сегодня',
    t: `<span data-hb-r1>${r ? '1 ¥ ≈ ' + _hmMoney(r, 3) : 'Курс юаня'}</span>`,
    s: `<span data-hb-r100>${r ? '100 ¥ ≈ ' + _hmMoney(r * 100, 2) : 'Точная цена — в калькуляторе'}</span>`,
    btn: 'Рассчитать', art: A.bRate
  })];
  (promos || []).slice(0, 2).forEach(p => slides.push(_hmPromoSlide(p)));
  slides.push(_hmSlide({ tone: 'gift', attr: 'data-act="referral"', k: 'Приглашайте друзей', t: '7% вам и 3% другу', s: 'С каждого заказа по вашей ссылке', btn: 'Пригласить', art: A.bGift }));
  slides.push(_hmSlide({ tone: 'legit', attr: 'data-act="legit"', k: 'Легит-чек', t: 'Проверим подлинность', s: 'Эксперты сверят вещь по фото', btn: 'Проверить', art: A.bLegit }));
  slides.push(_hmSlide({ tone: 'bag', attr: 'data-act="catalog"', k: 'Каталог', t: 'Всё с площадок Китая', s: 'Dewu, TaoBao, Pinduoduo и другие', btn: 'Открыть', art: A.bBag }));
  return slides.slice(0, 6);
}

function _hmBannerHtml(slides) {
  const n = slides.length;
  const clone = s => s.replace('<div class="hb-slide', '<div aria-hidden="true" class="hb-slide hb-clone');
  const items = n > 1 ? [clone(slides[n - 1]), ...slides, clone(slides[0])] : slides;
  const start = n > 1 ? ' style="transform:translate3d(calc(-1 * (100% + 8px)),0,0)"' : '';
  return `<div class="hb" id="hmBanner">
      <div class="hb-view"><div class="hb-track"${start}>${items.join('')}</div></div>
      ${n > 1 ? `<div class="hb-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}
    </div>`;
}

// Движок ленты: бесконечно в одну сторону (клоны по краям), автопрокрутка, свайп, точки
function initHomeBanner() {
  if (window._hmBannerTimer) { clearInterval(window._hmBannerTimer); window._hmBannerTimer = null; }
  if (window._bannerScrollInterval) { clearInterval(window._bannerScrollInterval); window._bannerScrollInterval = null; }
  const root = document.getElementById('hmBanner');
  if (!root) return;
  if (root._hb) { root._hb.start(); return; }
  const view = root.querySelector('.hb-view');
  const track = root.querySelector('.hb-track');
  const dots = Array.from(root.querySelectorAll('.hb-dots i'));
  const n = dots.length;
  root._hb = { start() {} };
  if (!track || n < 2) return;

  let idx = 1, dx = 0, drag = false, lock = null, sx = 0, sy = 0, st = 0, pausedUntil = 0;
  const set = (anim) => {
    track.style.transition = anim ? 'transform .5s cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = `translate3d(calc(${-idx} * (100% + 8px) + ${dx}px),0,0)`;
    const real = ((idx - 1) % n + n) % n;
    dots.forEach((d, i) => d.classList.toggle('on', i === real));
  };
  const norm = () => {
    if (idx <= 0) { idx = n; set(false); void track.offsetWidth; }
    else if (idx >= n + 1) { idx = 1; set(false); void track.offsetWidth; }
  };
  const go = (d) => { norm(); idx += d; set(true); };
  track.addEventListener('transitionend', e => { if (e.target === track) norm(); });

  view.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = true; lock = null; root._hbMoved = false;
    sx = e.clientX; sy = e.clientY; st = performance.now();
    norm();
  });
  view.addEventListener('pointermove', e => {
    if (!drag) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (lock === null) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (lock === 'x') { try { view.setPointerCapture(e.pointerId); } catch (_) {} }
    }
    if (lock !== 'x') return;
    root._hbMoved = true;
    dx = mx; set(false);
  });
  const end = () => {
    if (!drag) return;
    drag = false;
    if (lock === 'x') {
      const v = Math.abs(dx) / Math.max(performance.now() - st, 1);
      const d = (Math.abs(dx) > 40 || v > 0.5) ? (dx < 0 ? 1 : -1) : 0;
      dx = 0; idx += d; set(true);
      pausedUntil = Date.now() + 6000;
    }
    dx = 0;
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root._hb.start = () => {
    if (window._hmBannerTimer) clearInterval(window._hmBannerTimer);
    if (reduce) return;
    window._hmBannerTimer = setInterval(() => {
      if (!root.isConnected) { clearInterval(window._hmBannerTimer); window._hmBannerTimer = null; return; }
      if (document.hidden || drag || Date.now() < pausedUntil) return;
      go(1);
    }, 4500);
  };
  set(false);
  root._hb.start();
}

// Курс подгружается позже — дописываем числа в слайд (и в его клон)
function _hmFillRate() {
  if (_hmRateSync()) return;
  _hmRateAsync().then(r => {
    if (!r) return;
    document.querySelectorAll('#hmBanner [data-hb-r1]').forEach(el => { el.innerHTML = '1 ¥ ≈ ' + _hmMoney(r, 3); });
    document.querySelectorAll('#hmBanner [data-hb-r100]').forEach(el => { el.innerHTML = '100 ¥ ≈ ' + _hmMoney(r * 100, 2); });
    _hmSnapshot();
  });
}

// Акции пришли после первого показа — пересобираем ленту один раз
function _hmLatePromos() {
  if (_memHomePromos) return;
  _hmFetchPromos().then(list => {
    const root = document.getElementById('hmBanner');
    if (!list || !list.length || !root || root.querySelector('[data-promo]')) return;
    if (window._hmBannerTimer) { clearInterval(window._hmBannerTimer); window._hmBannerTimer = null; }
    root.outerHTML = _hmBannerHtml(_hmBannerSlides(list));
    initHomeBanner();
    _hmFillRate();
    _hmSnapshot();
  });
}

// ==================== РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ====================
async function renderHome() {
  try {
    const _U = window.UI;
    const _A = window.HOME_ART || {};
    const marketplaces = _hmMarketplaces();

    // Подборки дня — из памяти (фоновая загрузка), точная загрузка в loadHomeProducts
    if (!_memHomeProductsList) {
      const sb = _hmSb();
      if (window.CacheDB && sb) {
        window.CacheDB.get('todaySelectionDrops', async () => {
          const { data } = await sb.from('products').select('*')
            .eq('is_active', true).eq('show_on_home', true)
            .order('created_at', { ascending: false }).limit(9);
          return data;
        }, 300000).then(drops => {
          if (drops && drops.length) _memHomeProductsList = preprocessProducts(drops);
        }).catch(() => {});
      }
    }
    const picks = _memHomeProductsList || [];

    // Акции для баннеров: ждём не дольше 700 мс, остальное — после показа
    let promos = _memHomePromos;
    if (!promos) promos = await Promise.race([_hmFetchPromos(), new Promise(r => setTimeout(() => r(null), 700))]);

    const _quick = [
      { story: 'onboarding', label: 'Всё по шагам' },
      { story: 'my_orders', label: 'Мои заказы' },
      { story: 'promo', label: 'Акции' },
      { story: 'reviews', label: 'Отзывы' },
      { story: 'reports', label: 'Фотоотчёты' },
      { story: 'legitcheck', label: 'Легит-чек' },
    ];

    return `
    <div class="hm page-enter">
      <section class="hm-mps" data-boot="marketplaces-capsule" aria-label="Площадки Китая">
        ${marketplaces.map((mp, i) => {
          const logo = getMarketplaceLogo(mp.slug, '/assets/marketplaces/' + mp.slug + '.png');
          return `
          <button type="button" class="hm-mp" style="--i:${i}" data-url="${_esc(mp.url)}" data-name="${_esc(mp.name)}">
            <span class="hm-mp-tile">${logo ? `<img src="${logo}" alt="" draggable="false" decoding="async">` : _U.icon('store', 24)}</span>
            <span class="hm-mp-name">${_esc(mp.label || mp.name)}</span>
          </button>`;
        }).join('')}
        <button type="button" class="hm-mp hm-mp-all" id="moreMarketplacesBtn" style="--i:${marketplaces.length}">
          <span class="hm-mp-tile">${_U.icon('chevR', 24)}</span>
          <span class="hm-mp-name">Все</span>
        </button>
      </section>

      ${_hmBannerHtml(_hmBannerSlides(promos))}

      <section class="hm-hub" id="hmHub" aria-label="Разделы">
        <button type="button" class="hm-track" id="hmTrack" hidden>
          <span class="hm-track-ico">${_A.track || ''}</span>
          <span class="hm-track-body">
            <span class="hm-track-k" id="hmTrackK">Ваш заказ</span>
            <span class="hm-track-t" id="hmTrackT"></span>
            <span class="hm-track-bar" id="hmTrackBar"></span>
          </span>
          <span class="hm-track-go">${_U.icon('chevR', 18)}</span>
        </button>
        <div class="hm-tiles">
          ${_quick.map((q, i) => `
          <button type="button" class="hm-q" data-story="${q.story}" style="--i:${i}">
            <span class="hm-q-ico">${q.story === 'reviews' ? '<img src="/assets/home/reviews-3d.webp?v=20261104_home3" alt="" width="46" height="40" decoding="async" draggable="false">' : (_A[q.story] || '')}</span>
            <span class="hm-q-label">${q.label}</span>
          </button>`).join('')}
        </div>
      </section>

      <section class="hm-sec" id="hmPickSec">
        <div class="rd-section">
          <h2>Подборки дня</h2>
          <span class="hm-badge hm-badge-pick">${_U.icon('flame', 14)}Наш выбор</span>
        </div>
        <div class="hm-grid" id="homeProductsGrid">${picks.length ? picks.map(p => _hmPickCard(p, _hmInWish(p.id))).join('') : _U.gridSkeleton(4)}</div>
      </section>

      <section class="hm-sec" id="hmRecoSec">
        <div class="rd-section">
          <h2>Рекомендуем</h2>
          <span class="hm-badge hm-badge-reco" id="hmRecoBadge">${_U.icon('sparkles', 14)}<span>Для вас</span></span>
        </div>
        <div class="hm-grid" id="homeRecoGrid">${_U.gridSkeleton(4)}</div>
      </section>
    </div>
  `;
  } catch (err) {
    console.error('Error rendering home screen:', err);
    return `<div class="glass-card p-6 text-center text-white my-8"><p class="font-bold text-sm mb-2">Главная страница загружается...</p><button class="btn-primary py-2 px-4 rounded-xl text-xs mt-2" onclick="window.switchTab('home');">Обновить</button></div>`;
  }
}

// ==================== ОБРАБОТЧИК ГЛАВНОЙ ====================
// Один делегированный обработчик на корень главной (переживает восстановление из кэша)
function _hmOnClick(e) {
  const t = e.target;
  const tap = () => { if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light'); };

  if (t.closest('#moreMarketplacesBtn')) { tap(); switchTab('catalogs', 'marketplaces'); return; }

  const mp = t.closest('.hm-mp[data-url]');
  if (mp) {
    tap();
    const url = mp.getAttribute('data-url');
    if (url) tgUtil.openLink(url);
    else tgUtil.alert('Ссылка на площадку будет добавлена позже');
    return;
  }

  const slide = t.closest('.hb-slide');
  if (slide) {
    const root = document.getElementById('hmBanner');
    if (root && root._hbMoved) { root._hbMoved = false; return; }
    tap();
    const promoId = slide.getAttribute('data-promo');
    const act = slide.getAttribute('data-act');
    if (promoId) {
      window.activePromotionId = promoId;
      if (window.UI) window.UI.toast('Акция применится в калькуляторе');
      switchTab('calculator');
      window.activePromotionId = promoId;
    } else if (act === 'calc') switchTab('calculator');
    else if (act === 'referral') switchTab('referral');
    else if (act === 'catalog') switchTab('catalogs');
    else if (act === 'legit') {
      if (!window.userId) { window.requireAuth('Для проверки подлинности необходимо войти или зарегистрироваться.'); return; }
      switchTab('legitcheck');
    }
    return;
  }

  if (t.closest('#hmTrack')) { tap(); switchTab('profile', 'myOrders'); return; }

  const q = t.closest('.hm-q[data-story]');
  if (q) {
    tap();
    const s = q.getAttribute('data-story');
    if (s === 'onboarding') { if (window.iceLogixOnboarding) window.iceLogixOnboarding.open(); }
    else if (s === 'my_orders') {
      if (!window.userId) { window.requireAuth('Для просмотра заказов необходимо войти или зарегистрироваться.'); return; }
      switchTab('profile', 'myOrders');
    } else if (s === 'legitcheck') {
      if (!window.userId) { window.requireAuth('Для проверки подлинности необходимо войти или зарегистрироваться.'); return; }
      switchTab('legitcheck');
    } else switchTab(s);
  }
}

function attachHomeHandlers() {
  const hm = document.querySelector('#content .hm') || document.querySelector('.hm');
  if (hm && !hm._hmBound) {
    hm._hmBound = true;
    hm.addEventListener('click', _hmOnClick);
  }

  initHomeBanner();
  _hmFillRate();
  _hmLatePromos();

  if (typeof initCardSliders === 'function') initCardSliders();
  loadHomeTracker();
  loadHomeProducts().then(loadHomeReco, loadHomeReco);

  ['homeProductsGrid', 'homeRecoGrid'].forEach(id => {
    const g = document.getElementById(id);
    if (g) _bindHomeCart(g);
  });
}

    async function loadHomeProducts() {
      const grid = document.getElementById('homeProductsGrid');
      if (!grid) return;
      try {
        let data = [];
        if (window.CacheDB) window.CacheDB.clear('todaySelectionDrops');
        // Ждём инициализации supabaseClient (race condition при старте из localStorage-кэша)
        let _sbClient = _hmSb();
        if (!_sbClient) {
          for (let _w = 0; _w < 40; _w++) {
            await new Promise(r => setTimeout(r, 100));
            if (_hmSb()) { _sbClient = _hmSb(); break; }
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
            const ps = document.getElementById('hmPickSec'); if (ps) ps.hidden = true;
          } else {
            grid.innerHTML = data.map(p => {
              const _inWish = ((typeof wishlist !== 'undefined' && wishlist?.has) ? wishlist.has(p.id) : (window.wishlist?.has ? window.wishlist.has(p.id) : false));
              return _hmPickCard(p, _inWish);
            }).join('');
            if (typeof initCardSliders === 'function') initCardSliders();
          }
        }

    const ps2 = document.getElementById('hmPickSec'); if (ps2 && data.length) ps2.hidden = false;
    _bindHomeCart(grid);
    _hmSnapshot();

    // Нажатие на карточку открывает страницу товара (см. ice-ui.js, делегированный обработчик)

    if (typeof initCardSliders === 'function') initCardSliders();
  } catch(e) {
    console.error('Ошибка загрузки товаров на главной:', e);
  }
}

    // Снимок главной в кэш (для мгновенного открытия)
    function _hmSnapshot() {
      const _cd = document.getElementById('content');
      if (_cd && currentTab === 'home' && !currentSubScreen) {
        _tabCache['home:'] = { html: _cd.innerHTML, ts: Date.now() };
        try { localStorage.setItem('ice_tab_home_v2', _cd.innerHTML); } catch(e){}
      }
    }

    function _bindHomeCart(grid) {
      grid.querySelectorAll('.addToCartBtn').forEach(btn => {
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

    async function _hmClient() {
      let c = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
      for (let w = 0; !c && w < 40; w++) {
        await new Promise(r => setTimeout(r, 100));
        c = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
      }
      return c || null;
    }

    // Трекер активного заказа в блоке «Всё для заказа»
    const _HM_STEPS = ['pending', 'paid', 'bought', 'on_sklad_cn', 'in_transit', 'customs', 'in_belarus', 'ready_for_pickup', 'dispatched', 'delivered'];
    async function loadHomeTracker() {
      const box = document.getElementById('hmTrack');
      if (!box || !window.userId) return;
      try {
        const sb = await _hmClient();
        if (!sb) return;
        const { data } = await sb.from('orders')
          .select('id,title,status,items,created_at')
          .eq('user_id', window.userId)
          .is('archived_at', null)
          .not('status', 'in', '(delivered,cancelled,refunded)')
          .order('created_at', { ascending: false })
          .limit(1);
        const o = data && data[0];
        const hub = document.getElementById('hmHub');
        if (!o) { box.hidden = true; hub && hub.classList.remove('has-order'); _hmSnapshot(); return; }
        const st = window.UI.orderStatus(o.status);
        const idx = Math.max(0, _HM_STEPS.indexOf(o.status));
        const pct = Math.max(8, Math.round((idx + 1) / _HM_STEPS.length * 100));
        const t = document.getElementById('hmTrackT');
        const k = document.getElementById('hmTrackK');
        const bar = document.getElementById('hmTrackBar');
        if (k) k.textContent = st.tone === 'warn' || st.tone === 'bad' ? 'Нужно внимание' : 'Ваш заказ';
        if (t) t.textContent = st.text + ' · ' + (window.UI.orderTitle(o) || 'Заказ');
        if (bar) bar.style.setProperty('--p', pct + '%');
        box.dataset.tone = st.tone || '';
        box.hidden = false;
        hub && hub.classList.add('has-order');
        _hmSnapshot();
      } catch (e) { console.warn('[ICE] tracker', e); }
    }

    // «Рекомендуем»: товары каталога, подбор по категориям заказов клиента
    async function loadHomeReco() {
      const grid = document.getElementById('homeRecoGrid');
      const sec = document.getElementById('hmRecoSec');
      if (!grid) return;
      try {
        const sb = await _hmClient();
        if (!sb) return;
        const { data } = await sb.from('products').select('*').eq('is_active', true)
          .order('created_at', { ascending: false }).limit(40);
        const pickIds = new Set(Array.from(document.querySelectorAll('#homeProductsGrid .product-card')).map(c => c.dataset.productId));
        let list = preprocessProducts((data || []).filter(p => !pickIds.has(String(p.id))));
        let personal = false;
        if (window.userId && list.length) {
          const { data: ords } = await sb.from('orders').select('items,category').eq('user_id', window.userId).order('created_at', { ascending: false }).limit(10);
          const cats = new Set();
          (ords || []).forEach(o => {
            if (o.category) cats.add(String(o.category).toLowerCase());
            (Array.isArray(o.items) ? o.items : []).forEach(i => i && i.category && cats.add(String(i.category).toLowerCase()));
          });
          if (cats.size) {
            const hit = list.filter(p => cats.has(String(p.category || '').toLowerCase()));
            if (hit.length) { personal = true; list = hit.concat(list.filter(p => !hit.includes(p))); }
          }
        }
        list = list.slice(0, 8);
        if (!list.length) { sec && (sec.hidden = true); _hmSnapshot(); return; }
        sec && (sec.hidden = false);
        const badge = document.getElementById('hmRecoBadge');
        if (badge) badge.lastChild.textContent = personal ? 'Для вас' : 'Новинки';
        grid.innerHTML = list.map(p => {
          const w = ((typeof wishlist !== 'undefined' && wishlist?.has) ? wishlist.has(p.id) : (window.wishlist?.has ? window.wishlist.has(p.id) : false));
          return renderWbProductCard(p, w);
        }).join('');
        if (typeof initCardSliders === 'function') initCardSliders();
        _bindHomeCart(grid);
        _hmSnapshot();
      } catch (e) {
        console.warn('[ICE] reco', e);
        if (sec) sec.hidden = true;
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

// Старая карусель логотипов заменена плитками площадок — оставлена пустой для совместимости вызовов
function initMarketplaceRoulette() {}

// Global Exports
if (typeof renderHome === 'function') window.renderHome = renderHome;
if (typeof attachHomeHandlers === 'function') window.attachHomeHandlers = attachHomeHandlers;
if (typeof initMarketplaceRoulette === 'function') window.initMarketplaceRoulette = initMarketplaceRoulette;
if (typeof loadHomeProducts === 'function') window.loadHomeProducts = loadHomeProducts;
if (typeof scrollToPageTop === 'function') window.scrollToPageTop = scrollToPageTop;
if (typeof renderCalculator === 'function') window.renderCalculator = renderCalculator;
if (typeof initHomeBanner === 'function') window.initHomeBanner = initHomeBanner;
