// ============================================================
// ICE LOGIX Module: Catalogs & Marketplaces
// ============================================================
    // ==================== РЕНДЕР КАТАЛОГОВ (ВЫБОР) ====================
async function renderCatalogs() {
  return `
    <div class="rd-screen page-enter">
      <h1 class="rd-h1">Каталоги</h1>
      <div class="rd-card rd-list" style="margin-top: 16px;">
        <div class="rd-row rd-row-main" id="openMarketplacesBtn" role="button" tabindex="0">
          <span class="rd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></span>
          <span class="rd-row-body"><span class="rd-row-title">Площадки</span><span class="rd-row-text">Dewu, TaoBao, Pinduoduo, Goofish, 95, JD, Tmall</span></span>
          <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </div>
        <div class="rd-row" id="openProductsCatalogBtn" role="button" tabindex="0">
          <span class="rd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12l2 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V8z"/><path d="M4 8h16M9 12a3 3 0 0 0 6 0"/></svg></span>
          <span class="rd-row-body"><span class="rd-row-title">Товары</span><span class="rd-row-text">Готовые предложения от нашей команды.</span></span>
          <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </div>
        <div class="rd-row" id="openResaleBtn" role="button" tabindex="0">
          <span class="rd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.1"/></svg></span>
          <span class="rd-row-body"><span class="rd-row-title">Вещи от клиентов <span id="resaleNewBadge" class="rd-status ok" hidden>Новинка</span></span><span class="rd-row-text">Проверено командой ICE LOGIX. Без комиссии.</span></span>
          <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </div>
      </div>
    </div>
    ${renderFooter()}
  `;
}

function attachCatalogsHandlers() {
  const marketplacesBtn = document.getElementById('openMarketplacesBtn');
  const productsBtn = document.getElementById('openProductsCatalogBtn');
  const resaleBtn = document.getElementById('openResaleBtn');
  if (marketplacesBtn) marketplacesBtn.onclick = () => { currentSubScreen = 'marketplaces'; renderCurrentScreen(); };
  if (productsBtn) productsBtn.onclick = () => { currentSubScreen = 'productsCatalog'; renderCurrentScreen(); };
  if (resaleBtn) resaleBtn.onclick = () => switchTab('resale');
  if (resaleBtn && window.supabaseClient) {
    window.supabaseClient.rpc('resale_catalog').then(({ data }) => {
      const fresh = (data || []).some((x) => x.approved_at && Date.now() - new Date(x.approved_at).getTime() < 7 * 864e5);
      const b = document.getElementById('resaleNewBadge');
      if (fresh && b) b.hidden = false;
    }).catch(() => {});
  }
}

// ==================== ДЕФОЛТНЫЙ КАТАЛОГ КИТАЙСКИХ ПЛОЩАДОК ====================
const DEFAULT_CHINESE_MARKETPLACES = [
  {
    name: 'Dewu',
    website_url: 'https://dewu.com',
    url: 'https://dewu.com',
    logo_url: '/assets/marketplaces/dewu.png',
    country: 'Китай',
    description: 'Ведущий маркетплейс оригинальных кроссовок, стритвира и аксессуаров со строгим легитчеком.',
    categories: ['Обувь', 'Одежда', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: true,
    is_active: true,
    sort_order: 1
  },
  {
    name: 'TaoBao',
    website_url: 'https://taobao.com',
    url: 'https://taobao.com',
    logo_url: '/assets/marketplaces/taobao.png',
    country: 'Китай',
    description: 'Крупнейший розничный гипермаркет Китая от Alibaba. Миллионы трендовых вещей и выгодные цены.',
    categories: ['Одежда', 'Обувь', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: false,
    is_active: true,
    sort_order: 2
  },
  {
    name: 'Pinduoduo',
    website_url: 'https://mobile.yangkeduo.com',
    url: 'https://mobile.yangkeduo.com',
    logo_url: '/assets/marketplaces/pinduoduo.png',
    country: 'Китай',
    description: 'Платформа совместных покупок с прямыми фабричными ценами и огромным каталогом.',
    categories: ['Обувь', 'Одежда', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: true,
    is_active: true,
    sort_order: 3
  },
  {
    name: 'Goofish',
    website_url: 'https://www.goofish.com',
    url: 'https://www.goofish.com',
    logo_url: '/assets/marketplaces/goofish.png',
    country: 'Китай',
    description: 'Главная ресейл-биржа Китая от Alibaba (Xianyu). Винтаж, редкие сникеры и эксклюзивы.',
    categories: ['Обувь', 'Одежда', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: false,
    is_active: true,
    sort_order: 4
  },
  {
    name: '95',
    website_url: 'https://www.95fen.com',
    url: 'https://www.95fen.com',
    logo_url: '/assets/marketplaces/95fen.png',
    country: 'Китай',
    description: 'Премиальный аутлет-ресейл экосистемы Dewu с профессиональной проверкой подлинности.',
    categories: ['Обувь', 'Одежда', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: true,
    is_active: true,
    sort_order: 5
  },
  {
    name: 'JD',
    website_url: 'https://www.jd.com',
    url: 'https://www.jd.com',
    logo_url: '/assets/marketplaces/jd.png',
    country: 'Китай',
    description: 'Флагманский ритейлер моды, обуви и премиальной техники с официальной гарантией подлинности.',
    categories: ['Одежда', 'Обувь', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: false,
    is_active: true,
    sort_order: 6
  },
  {
    name: 'Tmall',
    website_url: 'https://www.tmall.com',
    url: 'https://www.tmall.com',
    logo_url: '/assets/marketplaces/tmall.png',
    country: 'Китай',
    description: 'Официальные бутики мировых и премиальных азиатских брендов (Alibaba Group).',
    categories: ['Одежда', 'Обувь', 'Аксессуары'],
    gender: ['Мужской', 'Женский', 'Унисекс'],
    requires_vpn: false,
    is_active: true,
    sort_order: 7
  }
];

// ==================== РЕНДЕР ПОДКАТАЛОГА ПЛОЩАДОК ====================
const MP_LEVELS = ['', 'Легко', 'Средне', 'Сложно'];
const MP_DEFAULT_STEPS = [
  'Найдите вещь на площадке: поиск по названию или артикулу.',
  'Нажмите «Поделиться» и скопируйте ссылку на товар.',
  'Вставьте ссылку в калькулятор ICE LOGIX — увидите итоговую цену с доставкой.',
  'Оформите заказ: выкуп и доставку берём на себя.'
];

function _mpLogo(mp) {
  let src = (typeof getMarketplaceLogo === 'function') ? getMarketplaceLogo(mp.name, mp.logo_url) : mp.logo_url;
  if (src && !/^data:/.test(src) && src.indexOf('?') < 0) src += '?v=20261102_sq5';
  return src ? `<img src="${String(src).replace(/"/g, '&quot;')}" alt="" decoding="async">` : window.UI.icon('store', 26);
}

function _mpLevel(mp) {
  const d = Number(mp.difficulty) || 0;
  if (!d || !MP_LEVELS[d]) return '';
  return `<span class="mp-fact"><span class="mp-dots" aria-hidden="true">${[1, 2, 3].map((i) => `<i${i <= d ? ' class="on"' : ''}></i>`).join('')}</span>${MP_LEVELS[d]}</span>`;
}

function _mpFacts(mp) {
  const U = window.UI;
  return [
    _mpLevel(mp),
    mp.requires_vpn ? `<span class="mp-fact">${U.icon('shield', 14)}Нужен VPN</span>` : '',
    mp.needs_cn_account ? `<span class="mp-fact">${U.icon('user', 14)}Китайский аккаунт</span>` : ''
  ].join('');
}

// Крупная карточка площадки
function _mpCard(mp, i) {
  const U = window.UI;
  const badges = (mp.badges && mp.badges.length ? mp.badges : (mp.categories || [])).slice(0, 3);
  const facts = _mpFacts(mp);
  return `
    <div class="mp-card page-enter">
      <div class="mp-top">
        <span class="mp-logo">${_mpLogo(mp)}</span>
        <div class="mp-info">
          <div class="mp-name">${U.esc(mp.name === '95' ? '95fen' : mp.name)}</div>
          <p class="mp-desc">${U.esc(mp.tagline || mp.description || '')}</p>
        </div>
      </div>
      ${badges.length ? `<div class="mp-tags">${badges.map((b) => `<span class="rd-status">${U.esc(b)}</span>`).join('')}</div>` : ''}
      ${facts ? `<div class="mp-facts">${facts}</div>` : ''}
      <div class="mp-actions">
        <button type="button" class="rd-btn rd-btn-sm" data-mp-how="${i}">${U.icon('book', 16)}Как заказать</button>
        ${(mp.website_url || mp.url) ? `<button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-mp-open="${i}">Открыть${U.icon('external', 16)}</button>` : ''}
      </div>
    </div>`;
}
window._mpCard = _mpCard;

async function _mpLoad() {
  const allowedSlugs = ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'];
  if (!window.marketplacesCache) {
    try {
      const { data: rawData } = await supabaseClient
        .from('marketplaces')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (rawData && rawData.length > 0) window.marketplacesCache = preprocessMarketplaces(rawData);
    } catch (err) {
      console.warn('Using default Chinese marketplaces list:', err);
    }
  }
  let data = (window.marketplacesCache || []).filter((mp) => {
    const n = (mp.name || '').toLowerCase();
    return allowedSlugs.some((slug) => n.includes(slug));
  });
  if (data.length === 0) {
    data = DEFAULT_CHINESE_MARKETPLACES;
    window.marketplacesCache = data;
  }
  return data;
}

async function renderMarketplaces() {
  try {
    const data = await _mpLoad();
    window._mpList = data;
    return `
      <div class="rd-screen page-enter">
        <div class="rd-head">
          <button type="button" id="backFromMarketplacesBtn" class="rd-back" aria-label="Назад">${window.UI.icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Площадки</h1><p class="rd-head-sub">Где покупать в Китае и как заказать</p></div>
        </div>
        <div class="mp-list" id="marketplacesGrid">
          ${data.map(_mpCard).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    return '<p class="text-center mt-10 text-red-400">Ошибка загрузки каталога</p>';
  }
}

// Шторка «Как заказать»: шаги, особенности и кнопка в калькулятор
function _mpHowSheet(mp) {
  const U = window.UI;
  const steps = (mp.steps && mp.steps.length) ? mp.steps : MP_DEFAULT_STEPS;
  const facts = _mpFacts(mp);
  const url = mp.website_url || mp.url || '';
  const html = `
    <div class="mp-how">
      <div class="mp-top">
        <span class="mp-logo">${_mpLogo(mp)}</span>
        <div class="mp-info">
          <div class="mp-name">${U.esc(mp.name === '95' ? '95fen' : mp.name)}</div>
          <p class="mp-desc">${U.esc(mp.tagline || mp.description || '')}</p>
        </div>
      </div>
      ${facts ? `<div class="mp-facts">${facts}</div>` : ''}
      <ol class="mp-steps">
        ${steps.map((s, n) => `<li><span class="mp-step-n">${n + 1}</span><span class="mp-step-t">${U.esc(s)}</span></li>`).join('')}
      </ol>
      ${mp.instruction ? `<p class="mp-note">${U.esc(mp.instruction)}</p>` : ''}
      <div class="mp-how-actions">
        <button type="button" class="rd-btn rd-btn-block" data-mp-calc>${U.icon('calc', 18)}Заказать через ICE LOGIX</button>
        ${url ? `<button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-site>Открыть площадку${U.icon('external', 16)}</button>` : ''}
      </div>
    </div>`;
  const sh = U.sheet({
    title: 'Как заказать',
    html,
    onOpen: (el) => {
      el.querySelector('[data-mp-calc]')?.addEventListener('click', () => {
        sh.close();
        currentSubScreen = null;
        window.switchTab('calculator');
      });
      el.querySelector('[data-mp-site]')?.addEventListener('click', () => tgUtil.openLink(url));
    }
  });
}

function attachMarketplacesHandlers() {
  const backBtn = document.getElementById('backFromMarketplacesBtn');
  if (backBtn) backBtn.onclick = () => { currentSubScreen = null; renderCurrentScreen(); };

  const grid = document.getElementById('marketplacesGrid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const how = e.target.closest('[data-mp-how]');
    const open = e.target.closest('[data-mp-open]');
    const list = window._mpList || [];
    if (how && list[how.dataset.mpHow]) _mpHowSheet(list[how.dataset.mpHow]);
    else if (open && list[open.dataset.mpOpen]) tgUtil.openLink(list[open.dataset.mpOpen].website_url || list[open.dataset.mpOpen].url || '');
  });
}

// Global Exports
if (typeof renderCatalogs === 'function') window.renderCatalogs = renderCatalogs;
if (typeof attachCatalogsHandlers === 'function') window.attachCatalogsHandlers = attachCatalogsHandlers;
if (typeof renderMarketplaces === 'function') window.renderMarketplaces = renderMarketplaces;
if (typeof attachMarketplacesHandlers === 'function') window.attachMarketplacesHandlers = attachMarketplacesHandlers;
