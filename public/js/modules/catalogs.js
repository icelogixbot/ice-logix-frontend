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
          <span class="rd-row-body"><span class="rd-row-title">Товары<span class="rd-soon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>Скоро</span></span><span class="rd-row-text">Готовые предложения от нашей команды.</span></span>
          <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </div>
        <div class="rd-row" id="openResaleBtn" role="button" tabindex="0">
          <span class="rd-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.1"/></svg></span>
          <span class="rd-row-body"><span class="rd-row-title">Наличие<span class="rd-soon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>Скоро</span></span><span class="rd-row-text">Покупка и продажа вещей клиентов, комиссия 2%.</span></span>
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
// Карточка площадки (новый дизайн): одна для первого показа и для фильтров
function _mpCard(mp) {
  const U = window.UI;
  const name = (mp.name || '').toLowerCase();
  const tags = [];
  if (mp.requires_vpn || name.includes('poizon') || name.includes('dewu')) tags.push('<span class="rd-status ok">Оригиналы</span>');
  if (name.includes('taobao')) tags.push('<span class="rd-status">Гипермаркет</span>');
  if (name.includes('pinduoduo') || name.includes('пиндуодуо')) tags.push('<span class="rd-status">Совместные покупки</span>');
  if (name.includes('goofish') || name === '95' || name.includes('95fen')) tags.push('<span class="rd-status">Ресейл</span>');
  if (name.includes('tmall') || name.includes('jd')) tags.push('<span class="rd-status">Официальные бренды</span>');
  (mp.categories || []).slice(0, 2).forEach((c) => tags.push(`<span class="rd-status mp-cat">${U.esc(c)}</span>`));
  const url = (mp.website_url || mp.url || '').replace(/'/g, '%27');
  return `
    <div class="mp-card page-enter">
      <div class="mp-top">
        <span class="mp-logo">${mp.logo_url ? `<img src="${mp.logo_url}?v=20261014_55" alt="" loading="lazy" onerror="this.style.display='none'">` : U.icon('store', 26)}</span>
        <div class="mp-info">
          <div class="mp-name">${U.esc(mp.name === '95' ? '95fen' : mp.name)}${mp.requires_vpn ? '<span class="rd-status warn">VPN</span>' : ''}</div>
          <p class="mp-desc">${U.esc(mp.description || '')}</p>
        </div>
      </div>
      ${tags.length ? `<div class="mp-tags">${tags.join('')}</div>` : ''}
      <div class="mp-actions">
        <button type="button" class="rd-btn rd-btn-sm" onclick="event.stopPropagation(); tgUtil.openLink('${url}')">Открыть площадку${U.icon('external', 16)}</button>
        <button type="button" class="rd-btn rd-btn-sm rd-btn-ghost instruction-btn"
          data-name="${(mp.name || '').replace(/"/g, '&quot;')}"
          data-instruction="${(mp.instruction || '').replace(/"/g, '&quot;')}"
          data-instruction-images='${JSON.stringify(mp.instruction_images || [])}'
          data-requires-vpn="${mp.requires_vpn}">${U.icon('book', 16)}Как заказать</button>
      </div>
    </div>`;
}
window._mpCard = _mpCard;

async function renderMarketplaces() {
  try {
    const allowedSlugs = ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'];

    if (!window.marketplacesCache) {
      try {
        const { data: rawData } = await supabaseClient
          .from('marketplaces')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (rawData && rawData.length > 0) {
          window.marketplacesCache = preprocessMarketplaces(rawData);
        }
      } catch (err) {
        console.warn('Using default Chinese marketplaces list:', err);
      }
    }

    let data = window.marketplacesCache || [];
    // Strict filter: only allowed Chinese platforms (remove 1688 and all non-Chinese)
    data = data.filter(mp => {
      const n = (mp.name || '').toLowerCase();
      return allowedSlugs.some(slug => n.includes(slug));
    });

    if (data.length === 0) {
      data = DEFAULT_CHINESE_MARKETPLACES;
      window.marketplacesCache = data;
    }
    
    // Разрешённые категории
    const allowedCategories = ['Обувь', 'Одежда', 'Аксессуары'];
    // Соберём все страны и пол (категории только разрешённые)
    const allCountries = [...new Set(data.map(mp => mp.country))];
    const allGenders = [...new Set(data.flatMap(mp => mp.gender || []))];
    const allCategories = allowedCategories.filter(cat => data.some(mp => mp.categories && mp.categories.includes(cat)));
    
    return `
      <div class="rd-screen page-enter">
        <div class="rd-head">
          <button type="button" id="backFromMarketplacesBtn" class="rd-back" aria-label="Назад">${window.UI.icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Площадки</h1><p class="rd-head-sub">Где покупать в Китае и как заказать</p></div>
          <button type="button" id="openMarketplaceFiltersBtn" class="rd-btn rd-btn-sm rd-btn-ghost mp-filter-btn">${window.UI.icon('filter', 16)}Фильтр<span id="activeFiltersBadge" class="hidden rd-badge">0</span></button>
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

function showMarketplaceFiltersSheet(allCountries, allCategories, allGenders, onApply) {
  const container = document.createElement('div');
  container.className = 'fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300';
  
  const card = document.createElement('div');
  card.className = 'bg-[#1a2333] border-t border-white/20 rounded-t-3xl w-full max-w-md p-5 pb-8 space-y-5 transform translate-y-full transition-transform duration-300 shadow-2xl';
  card.style.maxHeight = '80vh';
  card.style.overflowY = 'auto';

  let tempCountry = window.mpFilterCountry || 'all';
  let tempCategory = window.mpFilterCategory || 'all';
  let tempGender = window.mpFilterGender || 'all';

  const renderChips = (type, list, activeVal) => {
    return `
      <button class="filter-chip ${activeVal === 'all' ? 'active' : ''}" data-type="${type}" data-val="all">Все</button>
      ${list.map(item => `
        <button class="filter-chip ${activeVal === item ? 'active' : ''}" data-type="${type}" data-val="${item}">${item}</button>
      `).join('')}
    `;
  };

  card.innerHTML = `
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <h3 class="text-white font-bold text-base flex items-center gap-2">
        <span class="ix" style="width:16px;height:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></span> Фильтры
      </h3>
      <button id="closeFiltersSheet" class="text-white/60 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>

    <div class="space-y-4">
      <div>
        <p class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> Страны</p>
        <div class="flex gap-2 flex-wrap" id="sheetFilterCountries">
          ${renderChips('country', allCountries, tempCountry)}
        </div>
      </div>

      <div>
        <p class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span> Категории</p>
        <div class="flex gap-2 flex-wrap" id="sheetFilterCategories">
          ${renderChips('category', allCategories, tempCategory)}
        </div>
      </div>

      <div>
        <p class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> Пол</p>
        <div class="flex gap-2 flex-wrap" id="sheetFilterGenders">
          ${renderChips('gender', allGenders, tempGender)}
        </div>
      </div>
    </div>

    <div class="flex gap-3 pt-2">
      <button id="resetFiltersSheet" class="btn-secondary flex-1 py-3 text-xs font-bold rounded-xl border border-white/20">Сбросить</button>
      <button id="applyFiltersSheet" class="btn-primary flex-1 py-3 text-xs font-bold rounded-xl bg-cyan-500 text-white">Применить</button>
    </div>
  `;

  container.appendChild(card);
  document.body.appendChild(container);

  // Trigger animations
  requestAnimationFrame(() => {
    card.classList.remove('translate-y-full');
  });

  const closeSheet = () => {
    card.classList.add('translate-y-full');
    setTimeout(() => {
      container.remove();
    }, 300);
  };

  container.addEventListener('click', (e) => {
    if (e.target === container) closeSheet();
  });
  
  card.querySelector('#closeFiltersSheet').onclick = closeSheet;

  // Handle chip clicks
  card.querySelectorAll('.filter-chip').forEach(chip => {
    chip.onclick = () => {
      const type = chip.dataset.type;
      const val = chip.dataset.val;
      
      chip.parentNode.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      if (type === 'country') tempCountry = val;
      else if (type === 'category') tempCategory = val;
      else if (type === 'gender') tempGender = val;
    };
  });

  card.querySelector('#resetFiltersSheet').onclick = () => {
    card.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    card.querySelectorAll('.filter-chip[data-val="all"]').forEach(c => c.classList.add('active'));
    tempCountry = 'all';
    tempCategory = 'all';
    tempGender = 'all';
  };

  card.querySelector('#applyFiltersSheet').onclick = () => {
    window.mpFilterCountry = tempCountry;
    window.mpFilterCategory = tempCategory;
    window.mpFilterGender = tempGender;
    onApply();
    closeSheet();
  };
}

function attachMarketplacesHandlers() {
  const backBtn = document.getElementById('backFromMarketplacesBtn');
  if (backBtn) backBtn.onclick = () => { currentSubScreen = null; renderCurrentScreen(); };
  
  let marketplacesData = [];
  
  async function renderFilteredGrid() {
    if (marketplacesData.length === 0) {
      let dbData = [];
      if (window.marketplacesCache && window.marketplacesCache.length > 0) {
        dbData = [...window.marketplacesCache];
      } else {
        try {
          const { data } = await supabaseClient.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true });
          if (data && data.length > 0) {
            dbData = preprocessMarketplaces(data);
            window.marketplacesCache = dbData;
          }
        } catch(e) {
          console.error(e);
        }
      }
      const allowedSlugs = ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'];
      marketplacesData = dbData.filter(mp => {
        const n = (mp.name || '').toLowerCase();
        return allowedSlugs.some(slug => n.includes(slug));
      });
      if (marketplacesData.length === 0) {
        marketplacesData = [...DEFAULT_CHINESE_MARKETPLACES];
      }
    }
    
    const activeCountry = window.mpFilterCountry || 'all';
    const activeCategory = window.mpFilterCategory || 'all';
    const activeGender = window.mpFilterGender || 'all';
    
    // Update active filters badge
    const activeCount = (activeCountry !== 'all' ? 1 : 0) +
                        (activeCategory !== 'all' ? 1 : 0) +
                        (activeGender !== 'all' ? 1 : 0);
    const badge = document.getElementById('activeFiltersBadge');
    if (badge) {
      if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    
    let filtered = marketplacesData;
    if (activeCountry !== 'all') filtered = filtered.filter(mp => mp.country === activeCountry);
    if (activeCategory !== 'all') filtered = filtered.filter(mp => mp.categories && mp.categories.includes(activeCategory));
    if (activeGender !== 'all') filtered = filtered.filter(mp => mp.gender && mp.gender.includes(activeGender));
    
    const grid = document.getElementById('marketplacesGrid');
    if (!grid) return;
    
    if (filtered.length === 0) {
      grid.innerHTML = window.UI.empty({ icon: 'filter', title: 'Ничего не нашлось', text: 'Попробуйте снять часть фильтров.' });
      return;
    }
    
    grid.innerHTML = filtered.map(_mpCard).join('');
    
    document.querySelectorAll('.instruction-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        showInstructionModal(btn.dataset);
      };
    });
  }
  
  function showInstructionModal({ name, instruction, instructionImages, requiresVpn }) {
    const images = instructionImages ? JSON.parse(instructionImages) : [];
    const modal = document.createElement('div');
    modal.className = 'full-screen-modal-overlay page-enter';
    modal.id = 'catalogInstructionModal';
    modal.innerHTML = `
      <div class="full-screen-modal-header">
        <button type="button" class="global-back-btn close-modal !mb-0" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="text-center">
          <h3 class="text-white font-bold text-sm truncate">${name}</h3>
          <p class="text-white/40 text-[10px]">Инструкция по заказу</p>
        </div>
        <div style="width: 48px;"></div>
      </div>
      <div class="full-screen-modal-body space-y-4">
        ${requiresVpn === 'true' ? '<div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Для доступа может потребоваться VPN.</div>' : ''}
        <div class="text-white/90 text-sm leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-2xl border border-white/10">${instruction || 'Подробная инструкция появится позже.'}</div>
        ${images.length > 0 ? `
          <div class="space-y-3">
            ${images.map(url => `<img src="${url}" class="w-full rounded-2xl border border-white/20">`).join('')}
          </div>
        ` : ''}
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').onclick = () => modal.remove();
  }

  const saveCustomsLimitsBtn = document.getElementById('saveCustomsLimitsBtn');
  if (saveCustomsLimitsBtn) {
    saveCustomsLimitsBtn.onclick = async () => {
      const limit = document.getElementById('customsLimitEur').value;
      const percent = document.getElementById('customsDutyPercent').value;
      const { error } = await supabaseClient.from('settings').upsert({ key: 'customs_limits', value: { limit, percent } });
      if (error) alert('Ошибка сохранения: ' + error.message);
      else alert('Таможенные лимиты обновлены!');
    };
  }

  if (!window._marketplaceHandlers) {
    window._marketplaceHandlers = true;
    document.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.editMarketplaceBtn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const { data } = await supabaseClient.from('marketplaces').select('*').eq('id', id).single();
        if (data) openMarketplaceForm(data);
        return;
      }
      
      const deleteBtn = e.target.closest('.deleteMarketplaceBtn');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm('Удалить площадку?')) return;
        await supabaseClient.from('marketplaces').delete().eq('id', id);
        alert('Удалено');
        renderCurrentScreen();
        return;
      }
    });
  }
  
  (async () => {
    await renderFilteredGrid();
    
    // Bind opening of the bottom sheet
    const filtersBtn = document.getElementById('openMarketplaceFiltersBtn');
    if (filtersBtn) {
      filtersBtn.onclick = () => {
        const allowedCategories = ['Обувь', 'Одежда', 'Аксессуары'];
        const allCountries = [...new Set(marketplacesData.map(mp => mp.country))];
        const allGenders = [...new Set(marketplacesData.flatMap(mp => mp.gender || []))];
        const allCategories = allowedCategories.filter(cat => marketplacesData.some(mp => mp.categories && mp.categories.includes(cat)));

        showMarketplaceFiltersSheet(allCountries, allCategories, allGenders, () => {
          renderFilteredGrid();
        });
      };
    }
  })();
}

// Показать форму ввода паспортных данных

// Global Exports
if (typeof renderCatalogs === 'function') window.renderCatalogs = renderCatalogs;
if (typeof attachCatalogsHandlers === 'function') window.attachCatalogsHandlers = attachCatalogsHandlers;
if (typeof renderMarketplaces === 'function') window.renderMarketplaces = renderMarketplaces;
if (typeof showMarketplaceFiltersSheet === 'function') window.showMarketplaceFiltersSheet = showMarketplaceFiltersSheet;
if (typeof attachMarketplacesHandlers === 'function') window.attachMarketplacesHandlers = attachMarketplacesHandlers;
if (typeof renderFilteredGrid === 'function') window.renderFilteredGrid = renderFilteredGrid;
if (typeof showInstructionModal === 'function') window.showInstructionModal = showInstructionModal;
