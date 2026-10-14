// ============================================================
// ICE LOGIX Module: Catalogs & Marketplaces
// ============================================================
    // ==================== РЕНДЕР КАТАЛОГОВ (ВЫБОР) ====================
async function renderCatalogs() {
  return `
    <div class="space-y-4 page-enter">
      <h2 class="text-white text-xl font-bold mb-5 flex items-center gap-3">
        <span class="text-2xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></span>
        Каталоги
      </h2>
      <div class="grid grid-cols-1 gap-4">
        <div class="glass-card cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all" id="openMarketplacesBtn">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(96,165,250,0.25), rgba(59,130,246,0.15));">
              <span class="text-3xl" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span></span>
            </div>
            <div class="flex-1">
              <h3 class="text-white font-bold text-lg mb-1">Площадки</h3>
              <p class="text-sm" style="color: var(--text-secondary);">Dewu, TaoBao, Pinduoduo, Goofish, 95, JD, Tmall</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <div class="glass-card cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden border border-amber-500/20" id="openProductsCatalogBtn">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center relative flex-shrink-0" style="background: linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15));">
              <span class="text-3xl" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span></span>
              <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] shadow-md font-bold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="text-white font-bold text-lg leading-tight">Товары</h3>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                  <span class="ix" style="width:10px;height:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> В разработке
                </span>
              </div>
              <p class="text-sm" style="color: var(--text-secondary);">Готовые предложения от нашей команды. Скоро открытие!</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);" class="flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
        <div class="glass-card cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden border border-pink-500/20" id="openResaleBtn">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center relative flex-shrink-0" style="background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(219,39,119,0.15));">
              <span class="text-3xl" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></span></span>
              <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px] shadow-md font-bold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <h3 class="text-white font-bold text-lg leading-tight">Наличие</h3>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30 uppercase tracking-wide">
                  <span class="ix" style="width:10px;height:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> В разработке
                </span>
              </div>
              <p class="text-sm" style="color: var(--text-secondary);">Покупка и продажа вещей клиентов (комиссия 2%). Скоро запуск!</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);" class="flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
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
      <div class="flex items-center justify-between mb-4 mt-2">
        <button id="backFromMarketplacesBtn" class="global-back-btn m-0"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <button id="openMarketplaceFiltersBtn" class="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20">
          <span class="ix" style="width: 14px; height: 14px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></span> Фильтр
          <span id="activeFiltersBadge" class="hidden bg-cyan-500 text-white text-[9.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold ml-1">0</span>
        </button>
      </div>
      
      <div class="flex flex-col gap-3" id="marketplacesGrid">
        ${data.map(mp => {
          let tagsHtml = '';
          const name = (mp.name || '').toLowerCase();
          if (mp.requires_vpn || name.includes('poizon') || name.includes('dewu')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">100% Оригинал</span>';
          if (name.includes('taobao')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Гипермаркет</span>';
          if (name.includes('pinduoduo') || name.includes('пиндуодуо')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Совместный выкуп</span>';
          if (name.includes('goofish') || name === '95' || name.includes('95fen')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Ресейл</span>';
          if (name.includes('tmall') || name.includes('jd')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Официальные магазины</span>';
          return `
          <div class="glass-card flex gap-3 p-3 items-center page-enter">
            <div class="relative flex items-center justify-center flex-shrink-0" style="width: 58px; height: 58px;">
              ${mp.logo_url ? `<img src="${mp.logo_url}?v=20261014_55" class="w-full h-full object-contain cursor-pointer transition-transform duration-200 active:scale-95" style="border-radius: 13px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4));" alt="${mp.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="event.stopPropagation(); tgUtil.openLink('${mp.website_url || mp.url}')">` : ''}
              <span style="${mp.logo_url ? 'display:none;' : ''}" class="text-3xl flex items-center justify-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span></span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-white text-sm truncate">${mp.name}</h3>
                <span class="text-[9px] text-white/50 bg-white/5 px-1.5 py-0.2 rounded-full border border-white/5">${mp.country || 'Китай'}</span>
              </div>
              <p class="text-white/60 text-[11px] mt-1 line-clamp-1 leading-tight">${mp.description || ''}</p>
              <div class="flex flex-wrap gap-1 mt-1.5 items-center">
                ${tagsHtml}
                ${mp.categories?.slice(0, 2).map(cat => `<span class="text-white/40 text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">${cat}</span>`).join('') || ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      
      ${renderFooter()}
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
      grid.innerHTML = '<p class="text-white/70 text-center py-10">Нет площадок, соответствующих фильтрам</p>';
      return;
    }
    
    grid.innerHTML = filtered.map(mp => {
      let tagsHtml = '';
      const name = (mp.name || '').toLowerCase();
      if (mp.requires_vpn || name.includes('poizon') || name.includes('dewu')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">100% Оригинал</span>';
      if (name.includes('taobao')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Гипермаркет</span>';
      if (name.includes('pinduoduo') || name.includes('пиндуодуо')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">Совместный выкуп</span>';
      if (name.includes('goofish') || name === '95' || name.includes('95fen')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Ресейл</span>';
      if (name.includes('tmall') || name.includes('jd')) tagsHtml += '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Официальные магазины</span>';
      
      return `
      <div class="glass-card flex gap-3 p-3 items-center page-enter">
        <div class="relative flex items-center justify-center flex-shrink-0" style="width: 58px; height: 58px;">
          ${mp.logo_url ? `<img src="${mp.logo_url}?v=20261014_55" class="w-full h-full object-contain cursor-pointer transition-transform duration-200 active:scale-95" style="border-radius: 13px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4));" alt="${mp.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onclick="event.stopPropagation(); tgUtil.openLink('${mp.website_url || mp.url}')">` : ''}
          <span style="${mp.logo_url ? 'display:none;' : ''}" class="text-3xl flex items-center justify-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span></span>
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-bold text-white text-sm truncate">${mp.name}</h3>
            <span class="text-[9px] text-white/50 bg-white/5 px-1.5 py-0.2 rounded-full border border-white/5">${mp.country}</span>
          </div>
          <p class="text-white/60 text-[11px] mt-1 line-clamp-1 leading-tight">${mp.description || ''}</p>
          <div class="flex flex-wrap gap-1 mt-1.5 items-center">
            ${tagsHtml}
            ${mp.categories?.slice(0, 2).map(cat => `<span class="text-white/40 text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">${cat}</span>`).join('') || ''}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 items-end justify-center flex-shrink-0">
          <button onclick="event.stopPropagation(); tgUtil.openLink('${mp.website_url || mp.url}')" class="btn-primary py-1 px-3 rounded-lg text-[10px] font-bold text-center w-24 bg-cyan-500 text-white hover:bg-cyan-600 transition flex items-center justify-center gap-1">
            Перейти
          </button>
          <button class="instruction-btn bg-white/5 hover:bg-white/10 text-white/80 py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 w-24 text-center justify-center" 
            data-name="${mp.name.replace(/"/g, '&quot;')}" 
            data-instruction="${(mp.instruction || '').replace(/"/g, '&quot;')}"
            data-instruction-images='${JSON.stringify(mp.instruction_images || [])}'
            data-requires-vpn="${mp.requires_vpn}">
            <span class="ix" style="width:10px;height:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span> Инструкция
          </button>
        </div>
      </div>
      `;
    }).join('');
    
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
        <button type="button" class="global-back-btn close-modal">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
          <span>Назад</span>
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
