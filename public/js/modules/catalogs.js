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

function _mpFacts(mp) {
  const d = Number(mp.difficulty) || 0;
  const dots = [1, 2, 3].map((n) => `<i${n <= d ? ' class="on"' : ''}></i>`).join('');
  const tile = (label, value, extra, bad) => `<div class="mp-stat${bad ? ' warn' : ''}"><span class="mp-stat-l">${label}</span><span class="mp-stat-v">${extra || ''}${value}</span></div>`;
  return [
    d && MP_LEVELS[d] ? tile('Сложность', MP_LEVELS[d], `<span class="mp-dots" aria-hidden="true">${dots}</span>`, d === 3) : '',
    tile('VPN', mp.requires_vpn ? 'Нужен' : 'Не нужен', '', !!mp.requires_vpn),
    tile('Аккаунт', mp.needs_cn_account ? 'Китайский' : 'Не нужен', '', !!mp.needs_cn_account)
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
        <button type="button" class="rd-btn rd-btn-sm" data-mp-open="${i}">${U.icon('download', 16)}Скачать приложение</button>
        <button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-mp-how="${i}">${U.icon('book', 16)}Как заказать</button>
      </div>
    </div>`;
}
window._mpCard = _mpCard;

async function _mpLoad() {
  const allowedSlugs = ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'];
  const _stale = window.marketplacesCache && !window.marketplacesCache.some((mp) => mp && mp.tagline !== undefined);
  if (!window.marketplacesCache || _stale) {
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
        <div class="mp-hero">
          <div class="mp-hero-t"><b>Не знаете, с чего начать?</b><span>Найдите вещь на любой площадке, скопируйте ссылку — мы посчитаем цену под ключ.</span></div>
          <button type="button" class="rd-btn rd-btn-sm" data-mp-calc-top>${window.UI.icon('calc', 16)}Рассчитать</button>
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

// ── Мастер «Скачать приложение»: скачать → вернуться → регистрация → поиск и шеринг → калькулятор ──
function _mpPlatform() {
  const p = String((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform) || '').toLowerCase();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function _mpProgressKey(mp) { return 'mp_setup_' + String(mp.name || '').toLowerCase(); }
function _mpGetStep(mp) {
  try { return Math.min(4, Math.max(0, parseInt(localStorage.getItem(_mpProgressKey(mp)), 10) || 0)); } catch (_) { return 0; }
}
function _mpSetStep(mp, n) { try { localStorage.setItem(_mpProgressKey(mp), String(n)); } catch (_) {} }

const MP_WIZ_TITLES = ['Скачать', 'Установка', 'Регистрация', 'Поиск', 'Заказ'];

function _mpWizBody(mp, step, dev) {
  const U = window.UI;
  const name = U.esc(mp.name === '95' ? '95fen' : mp.name);
  const site = mp.website_url || mp.url || '';
  const ios = mp.app_ios_url || '';
  const andr = mp.app_android_url || '';
  const dots = `<div class="mp-prog" aria-hidden="true">${MP_WIZ_TITLES.map((t, i) => `<i class="${i < step ? 'done' : (i === step ? 'on' : '')}"></i>`).join('')}</div>
    <p class="mp-prog-l">Шаг ${step + 1} из 5 · ${MP_WIZ_TITLES[step]}</p>`;
  let main = '';
  if (step === 0) {
    const url = dev === 'ios' ? ios : (dev === 'android' ? (andr || site) : (ios || andr || site));
    const label = dev === 'ios' ? ' из App Store' : (dev === 'android' ? (andr ? ' из Google Play' : ' с сайта') : '');
    const devName = dev === 'ios' ? 'iPhone' : (dev === 'android' ? 'Android' : 'другое устройство');
    main = `
      <h4 class="mp-wiz-h">Установите ${name}</h4>
      <p class="mp-wiz-p">Заказывать удобнее всего из официального приложения. Мы определили ваше устройство: <b>${devName}</b>. Если это не так — переключите.</p>
      <div class="mp-dev">
        ${[['ios', 'iPhone'], ['android', 'Android']].map(([k, l]) => `<button type="button" class="${dev === k ? 'on' : ''}" data-mp-dev="${k}">${l}</button>`).join('')}
      </div>
      ${url
        ? `<button type="button" class="rd-btn rd-btn-block" data-mp-dl="${U.esc(url)}">${U.icon('download', 18)}Скачать${label}</button>`
        : '<p class="mp-note">Ссылка для этого устройства пока не добавлена. Напишите нам в поддержку — подскажем, где скачать.</p>'}
      ${dev === 'android' && !andr && site ? '<p class="mp-note">Этого приложения нет в Google Play. На сайте площадки будет ссылка на установочный файл.</p>' : ''}
      ${dev === 'ios' ? `
      <details class="mp-fold">
        <summary>Приложение не находится в App Store?</summary>
        <ol class="mp-mini">
          <li>Большинство китайских приложений есть только в китайском App Store.</li>
          <li>Откройте Настройки → ваше имя → «Контент и покупки» → «Просмотреть» → «Страна/регион».</li>
          <li>Выберите «Китай материковый». Если есть подписки или баланс, регион может не смениться — сначала отмените подписки.</li>
          <li>Вернитесь в App Store, откройте ссылку снова и установите приложение.</li>
          <li>После установки регион можно вернуть обратно.</li>
        </ol>
      </details>` : ''}
      <button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-next>Уже установлено</button>`;
  } else if (step === 1) {
    main = `
      <h4 class="mp-wiz-h">Установили? Отлично</h4>
      <p class="mp-wiz-p">Откройте ${name} и разрешите нужные доступы. Если приложение просит обновиться или показывает китайский язык — это нормально. Затем возвращайтесь сюда, и мы поможем с регистрацией.</p>
      <button type="button" class="rd-btn rd-btn-block" data-mp-next>Приложение открыто</button>
      <button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-back>Назад</button>`;
  } else if (step === 2) {
    const rs = (mp.register_steps && mp.register_steps.length) ? mp.register_steps : ['Откройте приложение и войдите по номеру телефона.', 'Введите код из SMS.'];
    main = `
      <h4 class="mp-wiz-h">Регистрация</h4>
      ${mp.needs_cn_account ? `<p class="mp-note">${U.icon('user', 14)} Нужен китайский аккаунт. Не получается — напишите нам в поддержку, подскажем.</p>` : '<p class="mp-wiz-p">Для просмотра товаров вход часто не обязателен, но с ним удобнее.</p>'}
      ${mp.requires_vpn ? `<p class="mp-note">${U.icon('shield', 14)} Для этой площадки может понадобиться VPN.</p>` : ''}
      <ol class="mp-steps">${rs.map((s, n) => `<li><span class="mp-step-n">${n + 1}</span><span class="mp-step-t">${U.esc(s)}</span></li>`).join('')}</ol>
      <button type="button" class="rd-btn rd-btn-block" data-mp-next>Вход выполнен</button>
      <button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-back>Назад</button>`;
  } else if (step === 3) {
    main = `
      <h4 class="mp-wiz-h">Ищите и делитесь товарами</h4>
      <ol class="mp-steps">
        <li><span class="mp-step-n">1</span><span class="mp-step-t">В строке поиска введите название или артикул. Часто в поиске есть значок камеры — можно искать по фото.</span></li>
        <li><span class="mp-step-n">2</span><span class="mp-step-t">Откройте карточку товара, посмотрите фото и отзывы, выберите размер и цвет.</span></li>
        <li><span class="mp-step-n">3</span><span class="mp-step-t">Нажмите «Поделиться» (значок стрелки или три точки) и «Скопировать ссылку».</span></li>
      </ol>
      <button type="button" class="rd-btn rd-btn-block" data-mp-next>Ссылка скопирована</button>
      <button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-back>Назад</button>`;
  } else {
    main = `
      <h4 class="mp-wiz-h">Рассчитаем стоимость</h4>
      <p class="mp-wiz-p">Вставьте скопированную ссылку в калькулятор ICE LOGIX — покажем итоговую цену с доставкой. Выкуп и доставку берём на себя.</p>
      <button type="button" class="rd-btn rd-btn-block" data-mp-calc>${U.icon('calc', 18)}Открыть калькулятор</button>
      <button type="button" class="rd-btn rd-btn-block rd-btn-ghost" data-mp-restart>Пройти заново</button>`;
  }
  return `<div class="mp-wiz">${dots}${main}</div>`;
}

function _mpAppSheet(mp) {
  let step = _mpGetStep(mp);
  let dev = _mpPlatform();
  const sh = window.UI.sheet({
    title: 'Скачать приложение',
    html: '<div id="mpWizBox"></div>',
    onOpen: (el) => {
      const box = el.querySelector('#mpWizBox');
      const draw = () => { box.innerHTML = _mpWizBody(mp, step, dev); };
      const go = (n) => { step = n; _mpSetStep(mp, n); draw(); };
      draw();
      box.addEventListener('click', (e) => {
        const t = e.target;
        const dl = t.closest('[data-mp-dl]');
        const dv = t.closest('[data-mp-dev]');
        if (dl) { tgUtil.openLink(dl.dataset.mpDl); go(1); }
        else if (dv) { dev = dv.dataset.mpDev; draw(); }
        else if (t.closest('[data-mp-next]')) go(Math.min(4, step + 1));
        else if (t.closest('[data-mp-back]')) go(Math.max(0, step - 1));
        else if (t.closest('[data-mp-restart]')) go(0);
        else if (t.closest('[data-mp-calc]')) { sh.close(); currentSubScreen = null; window.switchTab('calculator'); }
      });
    }
  });
}

function attachMarketplacesHandlers() {
  const backBtn = document.getElementById('backFromMarketplacesBtn');
  if (backBtn) backBtn.onclick = () => { currentSubScreen = null; renderCurrentScreen(); };

  document.querySelector('[data-mp-calc-top]')?.addEventListener('click', () => { currentSubScreen = null; window.switchTab('calculator'); });
  const grid = document.getElementById('marketplacesGrid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const how = e.target.closest('[data-mp-how]');
    const open = e.target.closest('[data-mp-open]');
    const list = window._mpList || [];
    if (how && list[how.dataset.mpHow]) _mpHowSheet(list[how.dataset.mpHow]);
    else if (open && list[open.dataset.mpOpen]) _mpAppSheet(list[open.dataset.mpOpen]);
  });
}

// Global Exports
if (typeof renderCatalogs === 'function') window.renderCatalogs = renderCatalogs;
if (typeof attachCatalogsHandlers === 'function') window.attachCatalogsHandlers = attachCatalogsHandlers;
if (typeof renderMarketplaces === 'function') window.renderMarketplaces = renderMarketplaces;
if (typeof attachMarketplacesHandlers === 'function') window.attachMarketplacesHandlers = attachMarketplacesHandlers;
