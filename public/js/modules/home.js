// ============================================================
// ICE LOGIX Module: Home Screen
// ============================================================

function _esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
if (typeof _esc === 'function') window._esc = _esc;

// ==================== ИНЛАЙН ВЕКТОРНЫЕ ЛОГОТИПЫ ПЛОЩАДОК (0 МС ЗАГРУЗКИ, 0 СЕТЕВЫХ ЗАПРОСОВ) ====================
const MARKETPLACE_SVGS = {
  dewu: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="Dewu"><defs><linearGradient id="mp_dewuBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0b171b"/><stop offset="100%" stop-color="#02080a"/></linearGradient><linearGradient id="mp_dewuCyan" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f5d4"/><stop offset="50%" stop-color="#00d2c4"/><stop offset="100%" stop-color="#00b4d8"/></linearGradient><filter id="mp_dewuGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><rect width="128" height="128" rx="28" fill="url(#mp_dewuBg)"/><rect width="126" height="126" x="1" y="1" rx="27" fill="none" stroke="url(#mp_dewuCyan)" stroke-width="2" stroke-opacity="0.3"/><rect x="22" y="22" width="84" height="84" rx="20" fill="none" stroke="url(#mp_dewuCyan)" stroke-width="4.5" filter="url(#mp_dewuGlow)"/><g fill="url(#mp_dewuCyan)"><path d="M42 38 C38 43 35 48 33 53 C35.5 53.5 38 52 40 50 C41.5 46.5 43 43 44 40 Z"/><path d="M44 54 C39 61 35 68 31 75 C34 75.5 37 74 39 71 C41.5 66 44 60 46 56 Z"/><rect x="42" y="70" width="4.5" height="24" rx="2.2"/><rect x="52" y="38" width="38" height="22" rx="3" fill="none" stroke="url(#mp_dewuCyan)" stroke-width="4.5"/><line x1="53" y1="49" x2="89" y2="49" stroke="url(#mp_dewuCyan)" stroke-width="4"/><rect x="49" y="66" width="44" height="4.5" rx="2.25"/><rect x="67" y="69" width="4.5" height="27" rx="2.25"/><path d="M54 75 Q72 74 88 74" stroke="url(#mp_dewuCyan)" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="80" cy="84" r="3.2"/></g></svg>`,
  taobao: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="TaoBao"><defs><linearGradient id="mp_taobaoBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6a00"/><stop offset="100%" stop-color="#ee3800"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#mp_taobaoBg)"/><g fill="#ffffff"><path d="M26 36 C29 34 35 37 36 41 C37 44 33 46 29 45 C26 44 24 39 26 36 Z"/><path d="M22 56 C26 54 31 56 32 60 C32 63 29 65 25 64 C22 63 20 59 22 56 Z"/><path d="M21 89 C23 85 28 78 33 71 C34 73 34 76 32 79 C28 85 24 90 21 89 Z"/><path d="M43 33 L86 33 C91 33 93 36 92 41 L88 77 C86 91 79 97 66 97 C62 97 58 96 56 94 C54 92 56 89 59 89 C67 89 74 88 77 78 L80 43 L45 43 C42 43 41 38 43 33 Z"/><path d="M57 36 C55 45 49 55 41 62 C39 60 40 57 43 54 C48 49 52 42 53 36 Z"/><rect x="49" y="50" width="26" height="5" rx="2.5"/><rect x="60" y="52" width="5" height="25" rx="2.5"/><rect x="46" y="65" width="31" height="5" rx="2.5"/><path d="M51 72 L49 84 C48 87 53 88 54 85 L56 72 Z"/><path d="M72 72 L74 84 C75 87 70 88 69 85 L67 72 Z"/></g></svg>`,
  pinduoduo: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="Pinduoduo"><defs><linearGradient id="mp_pddBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff3e2e"/><stop offset="100%" stop-color="#dc1f18"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#mp_pddBg)"/><g fill="#ffffff"><path d="M42 28 C49 28 55 33 55 41 C55 50 44 60 38 64 C32 60 21 50 21 41 C21 33 27 28 34 28 C37 28 40 29.5 42 32 C44 29.5 47 28 50 28 Z" transform="scale(0.85) translate(14, 8)"/><path d="M78 28 C85 28 91 33 91 41 C91 50 80 60 74 64 C68 60 57 50 57 41 C57 33 63 28 70 28 C73 28 76 29.5 78 32 C80 29.5 83 28 86 28 Z" transform="scale(0.85) translate(22, 8)"/><path d="M38 52 C35 56 31 60 27 63 L29 65 C33 62 38 57 41 53 Z"/><rect x="36" y="58" width="4" height="34" rx="2"/><path d="M28 72 L47 72" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/><path d="M26 89 L45 80" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/><circle cx="61" cy="58" r="3.2"/><circle cx="83" cy="58" r="3.2"/><line x1="51" y1="67" x2="94" y2="67" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/><rect x="59" y="66" width="4.5" height="28" rx="2.2"/><rect x="83" y="66" width="4.5" height="28" rx="2.2"/><line x1="47" y1="81" x2="97" y2="81" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/></g></svg>`,
  goofish: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="Goofish"><defs><linearGradient id="mp_goofishBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffdc00"/><stop offset="100%" stop-color="#ffbf00"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#mp_goofishBg)"/><g><path d="M64 26 C88 26 102 44 102 68 C102 90 86 102 64 102 C42 102 26 90 26 68 C26 44 40 26 64 26 Z" fill="#ffffff"/><path d="M58 24 C64 17 72 20 70 26 Z" fill="#ffbf00"/><circle cx="49" cy="56" r="12" fill="#1e1e1e"/><circle cx="52" cy="53" r="4.5" fill="#ffffff"/><circle cx="46" cy="59" r="2" fill="#ffffff"/><circle cx="79" cy="56" r="12" fill="#1e1e1e"/><circle cx="82" cy="53" r="4.5" fill="#ffffff"/><circle cx="76" cy="59" r="2" fill="#ffffff"/><path d="M56 75 Q64 84 72 75" fill="none" stroke="#1e1e1e" stroke-width="4.5" stroke-linecap="round"/><circle cx="36" cy="67" r="5" fill="#ff7f50" opacity="0.6"/><circle cx="92" cy="67" r="5" fill="#ff7f50" opacity="0.6"/></g></svg>`,
  '95fen': `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="95"><defs><linearGradient id="mp_nineFiveBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#141a24"/><stop offset="100%" stop-color="#080c12"/></linearGradient><linearGradient id="mp_nineFiveMint" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00ff9d"/><stop offset="100%" stop-color="#00d486"/></linearGradient><filter id="mp_mintGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><rect width="128" height="128" rx="28" fill="url(#mp_nineFiveBg)"/><rect width="126" height="126" x="1" y="1" rx="27" fill="none" stroke="url(#mp_nineFiveMint)" stroke-width="1.8" stroke-opacity="0.3"/><g fill="url(#mp_nineFiveMint)" filter="url(#mp_mintGlow)"><path d="M57 32 C41 32 30 42 30 58 C30 72 38 80 50 80 C54 80 57 79 60 77 L57 96 L47 96 L48 91 L35 93 L32 101 L65 101 C72 101 75 95 76 86 L78 32 L57 32 Z M54 67 C46 67 42 62 42 55 C42 47 47 43 54 43 L66 43 L63 64 C60 66 57 67 54 67 Z"/><path d="M78 33 L106 33 L104 43 L88 43 L86 54 C89 53 93 52 97 52 C108 52 115 59 113 73 C111 87 99 97 84 97 C74 97 66 92 64 85 L75 80 C77 84 81 87 86 87 C92 87 98 83 99 75 C100 68 96 63 89 63 C85 63 81 65 79 67 Z"/></g><g fill="#ffffff" opacity="0.85"><path d="M78 108 L84 104 L87 107 L81 111 Z"/><path d="M96 105 L102 109 L99 112 L93 108 Z"/><path d="M83 113 L99 113 C101 113 102 114 101 116 L98 122 L95 120 L97 116 L83 116 Z"/><path d="M91 113 C91 118 89 122 84 124 L82 122 C86 120 88 116 88 113 Z"/></g></svg>`,
  jd: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="JD"><defs><linearGradient id="mp_jdBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ea251b"/><stop offset="100%" stop-color="#b60d14"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#mp_jdBg)"/><g fill="#ffffff"><path d="M64 24 C45 24 33 37 33 54 C33 65 39 74 48 78 L48 83 C48 86 52 88 56 87 L62 85 C63.3 85.3 64.7 85.3 66 85 L72 87 C76 88 80 86 80 83 L80 78 C89 74 95 65 95 54 C95 37 83 24 64 24 Z"/></g><g fill="#ea251b"><path d="M33 46 C31 52 32 60 37 64 C35 58 35 51 37 46 Z"/><path d="M95 46 C97 52 96 60 91 64 C93 58 93 51 91 46 Z"/><circle cx="51" cy="51" r="5"/><circle cx="52.5" cy="49.5" r="1.5" fill="#ffffff"/><circle cx="77" cy="51" r="5"/><circle cx="78.5" cy="49.5" r="1.5" fill="#ffffff"/><ellipse cx="64" cy="61" rx="6" ry="4"/><path d="M58 66 Q64 73 70 66" fill="none" stroke="#ea251b" stroke-width="2.5" stroke-linecap="round"/></g><text x="64" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">JD.COM</text></svg>`,
  tmall: `<svg viewBox="0 0 128 128" width="100%" height="100%" class="mp-logo-svg" aria-label="Tmall"><defs><linearGradient id="mp_tmallBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff0036"/><stop offset="100%" stop-color="#cf002b"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#mp_tmallBg)"/><path d="M26 42 L38 28 L52 38 C59 36 69 36 76 38 L90 28 L102 42 C106 50 106 64 102 73 C95 86 78 89 64 89 C50 89 33 86 26 73 C22 64 22 50 26 42 Z" fill="#ffffff"/><path d="M30 46 L39 34 L51 43 C59 41 69 41 77 43 L89 34 L98 46 C101 53 101 64 98 71 C92 82 76 85 64 85 C52 85 36 82 30 71 C27 64 27 53 30 46 Z" fill="#111111"/><ellipse cx="49" cy="60" rx="7" ry="5" transform="rotate(-15 49 60)" fill="#ffffff"/><ellipse cx="79" cy="60" rx="7" ry="5" transform="rotate(15 79 60)" fill="#ffffff"/><ellipse cx="64" cy="68" rx="3.5" ry="2.5" fill="#ffffff"/><text x="64" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">TMALL</text></svg>`
};

function renderMarketplaceLogo(mp) {
  const rawKey = (mp.key || mp.name || '').toLowerCase().trim();
  if (MARKETPLACE_SVGS[rawKey]) return MARKETPLACE_SVGS[rawKey];
  if (rawKey.includes('dewu') || rawKey.includes('poizon')) return MARKETPLACE_SVGS.dewu;
  if (rawKey.includes('taobao')) return MARKETPLACE_SVGS.taobao;
  if (rawKey.includes('pinduoduo') || rawKey.includes('пиндуодуо')) return MARKETPLACE_SVGS.pinduoduo;
  if (rawKey.includes('goofish') || rawKey.includes('xianyu') || rawKey.includes('сяньюй')) return MARKETPLACE_SVGS.goofish;
  if (rawKey.includes('95') || rawKey.includes('95fen')) return MARKETPLACE_SVGS['95fen'];
  if (rawKey.includes('jd')) return MARKETPLACE_SVGS.jd;
  if (rawKey.includes('tmall')) return MARKETPLACE_SVGS.tmall;

  if (mp.logo_url) {
    return `<img src="${mp.logo_url}" loading="lazy" decoding="async" class="mp-logo-svg object-contain" alt="${_esc(mp.name)}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';">
            <span style="display:none; font-size: 20px;">${mp.icon || '<span class="mp-dot" style="background:#374151"></span>'}</span>`;
  }
  return `<span style="font-size: 20px;">${mp.icon || '<span class="mp-dot" style="background:#374151"></span>'}</span>`;
}

// In-memory быстрый кэш для мгновенного рендера главной без микрозадержек
let _memHomeDbMarketplaces = null;
let _memHomeProductsList = null;

// ==================== РЕНДЕР ГЛАВНОЙ СТРАНИЦЫ ====================
async function renderHome() {
  try {
    let dbMarketplaces = _memHomeDbMarketplaces || [];
    if (!dbMarketplaces.length) {
      try {
        const _sb = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
        if (window.CacheDB && _sb) {
          const dbData = await window.CacheDB.get('marketplaces', async () => {
            const { data } = await _sb.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true });
            return data;
          }, 300000);
          if (dbData) {
            dbMarketplaces = preprocessMarketplaces(dbData);
            _memHomeDbMarketplaces = dbMarketplaces;
          }
        }
      } catch (e) {
        console.warn('Marketplaces CacheDB warning:', e);
      }
    }

    // Filter only the 7 allowed Chinese marketplaces (excluding 1688 and all non-Chinese)
    const allowedSlugs = ['dewu', 'poizon', 'taobao', 'pinduoduo', 'пиндуодуо', 'goofish', 'xianyu', 'сяньюй', '95', '95fen', 'jd', 'tmall'];
    const homeDbMarketplaces = dbMarketplaces
      .filter(mp => mp.show_on_home)
      .filter(mp => {
        const n = (mp.name || '').toLowerCase();
        return allowedSlugs.some(slug => n.includes(slug));
      });

    const staticMarketplaces = [
      { key: 'dewu', name: 'Dewu', url: 'https://dewu.com', website_url: 'https://dewu.com' },
      { key: 'taobao', name: 'TaoBao', url: 'https://taobao.com', website_url: 'https://taobao.com' },
      { key: 'pinduoduo', name: 'Pinduoduo', url: 'https://mobile.yangkeduo.com', website_url: 'https://mobile.yangkeduo.com' },
      { key: 'goofish', name: 'Goofish', url: 'https://www.goofish.com', website_url: 'https://www.goofish.com' },
      { key: '95fen', name: '95', url: 'https://www.95fen.com', website_url: 'https://www.95fen.com' },
      { key: 'jd', name: 'JD', url: 'https://www.jd.com', website_url: 'https://www.jd.com' },
      { key: 'tmall', name: 'Tmall', url: 'https://www.tmall.com', website_url: 'https://www.tmall.com' }
    ];

    // Merge static 7 platforms with any custom URLs from DB, guaranteeing exact 7 platforms in fixed order:
    // Dewu, TaoBao, Pinduoduo, Goofish, 95, JD, Tmall
    const marketplaces = staticMarketplaces.map(st => {
      const fromDb = homeDbMarketplaces.find(db => {
        const dbName = (db.name || '').toLowerCase();
        return dbName === st.name.toLowerCase() || (st.key && dbName.includes(st.key));
      });
      return fromDb ? { ...st, website_url: fromDb.website_url || st.website_url, url: fromDb.website_url || st.url } : st;
    });
    // 5 identical sets: Sets 0, 1, 2, 3, 4 (35 cards total).
    // Middle Set 2 starts at index 14 (Dewu). Order is strictly immutable:
    // Dewu, TaoBao, Pinduoduo, Goofish, 95, JD, Tmall
    const fullMarketplaces = [];
    for (let s = 0; s < 5; s++) fullMarketplaces.push(...marketplaces);

    // Загрузка сегодняшних подборок из канала (@icelogix_selection) без сброса кэша
    let homeProductsList = _memHomeProductsList || [];
    if (!homeProductsList.length) {
      try {
        const _sbClient = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
        if (window.CacheDB && _sbClient) {
          const drops = await window.CacheDB.get('todaySelectionDrops', async () => {
            const { data } = await _sbClient
              .from('products')
              .select('*')
              .eq('is_active', true)
              .eq('show_on_home', true)
              .order('created_at', { ascending: false })
              .limit(9);
            return data || [];
          }, 180000);
          if (drops && drops.length > 0) {
            homeProductsList = preprocessProducts(drops);
            _memHomeProductsList = homeProductsList;
          }
        }
      } catch(e) {
        console.warn('Failed to load drops for home:', e);
      }
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
            <div class="marketplaces-ribbon" id="marketplaceRibbon">
              ${fullMarketplaces.map((mp, idx) => `
                <div class="story-card marketplace-story" data-url="${mp.website_url || mp.url}" data-name="${mp.name}" data-idx="${idx}">
                  <div class="story-icon">
                    ${renderMarketplaceLogo(mp)}
                  </div>
                  <span class="story-label">${mp.name}</span>
                </div>
              `).join('')}
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
          return `
          <div class="product-card" data-product-id="${p.id}">
            <div class="relative">
              ${renderCardMedia(p.image_urls || p.image_url, p.title)}
              <span class="absolute top-2 right-2 wishlist-heart text-lg ${_inWish ? 'text-red-500' : 'text-white/60'} z-20" data-product-id="${p.id}">${getHeartIcon(_inWish)}</span>
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
        `;}).join('')}
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
              return `
              <div class="product-card" data-product-id="${p.id}">
                <div class="relative">
                  ${renderCardMedia(p.image_urls || p.image_url, p.title)}
                  <span class="absolute top-2 right-2 wishlist-heart text-lg ${_inWish ? 'text-red-500' : 'text-white/60'} z-20" data-product-id="${p.id}">${getHeartIcon(_inWish)}</span>
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
            `;
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
      if (typeof window.renderSmartCalculator === 'function') {
        return await window.renderSmartCalculator();
      }
      return '<div class="glass-card p-6 text-center text-white my-8"><p class="font-bold text-sm">Калькулятор загружается...</p></div>';
    }


// ==================== РУЛЕТКА ПЛОЩАДОК (Step Roulette with 2.5s Lock & Zero-Glitches) ====================
function initMarketplaceRoulette() {
  const track = document.getElementById('marketplaceRouletteTrack');
  const ribbon = document.getElementById('marketplaceRibbon');
  if (!track || !ribbon) return;

  // Очистка предыдущих таймеров
  if (window.__mpStepTimer) {
    clearTimeout(window.__mpStepTimer);
    window.__mpStepTimer = null;
  }
  if (window.__mpResumeTimer) {
    clearTimeout(window.__mpResumeTimer);
    window.__mpResumeTimer = null;
  }
  if (window.__mpRafId) {
    cancelAnimationFrame(window.__mpRafId);
    window.__mpRafId = null;
  }

  const CARD_WIDTH = 64;
  const GAP = 16;
  const STEP = CARD_WIDTH + GAP; // 80px
  const N_ITEMS = 7;
  const BASE_SET = 2; // Средний сет 2 (индексы 14..20)
  const BASE_DEWU_INDEX = BASE_SET * N_ITEMS; // 14

  const cards = Array.from(ribbon.querySelectorAll('.story-card'));
  if (cards.length === 0) return;

  let currentIndex = BASE_DEWU_INDEX; // Стартуем сразу на Dewu
  let isTransitioning = false;
  let currentX = 0;

  function getTrackCenter() {
    return (track.clientWidth || 347) / 2;
  }

  function getXForIndex(idx) {
    return getTrackCenter() - (idx * STEP + CARD_WIDTH / 2);
  }

  function highlightCard(idx) {
    cards.forEach((c, i) => {
      c.classList.toggle('is-active-target', i === idx);
    });
  }

  function applyPosition(idx, animate = true, duration = 0.5) {
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
  }

  function goToIndex(targetIdx, duration = 0.48) {
    isTransitioning = true;
    currentIndex = targetIdx;
    applyPosition(currentIndex, true, duration);

    setTimeout(() => {
      if (!ribbon) return;
      normalizeIndex();
      isTransitioning = false;
      scheduleAutoStep();
    }, Math.round(duration * 1000) + 30);
  }

  function stepToNext() {
    if (isDragging || !document.getElementById('marketplaceRibbon')) return;
    goToIndex(currentIndex + 1, 0.55);
  }

  function scheduleAutoStep() {
    clearTimeout(window.__mpStepTimer);
    // Фиксация на 2.5 секунды в окошке
    window.__mpStepTimer = setTimeout(stepToNext, 2500);
  }

  // ==================== СВОБОДНЫЙ И ЛЕГКИЙ СКРОЛЛ / СВАЙП С ИНЕРЦИЕЙ ====================
  let isDragging = false;
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
    clearTimeout(window.__mpStepTimer);
    clearTimeout(window.__mpResumeTimer);

    // Если карточки были в движении — мгновенно подхватываем их с текущего пикселя без задержек и залипаний!
    if (isTransitioning) {
      currentX = getCurrentTransformX();
      ribbon.style.transition = 'none';
      ribbon.style.transform = `translate3d(${currentX}px, 0, 0)`;
      isTransitioning = false;
    } else {
      currentX = getXForIndex(currentIndex);
    }

    isDragging = true;
    hasDragged = false;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    dragOriginX = currentX;
    lastDragX = startX;
    lastDragTime = performance.now();
    velocity = 0;

    ribbon.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!isDragging) return;
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
    const trackCenter = getTrackCenter();
    const approxIdx = Math.round((trackCenter - newX - CARD_WIDTH / 2) / STEP);
    const clampedIdx = Math.max(0, Math.min(cards.length - 1, approxIdx));
    highlightCard(clampedIdx);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    const x = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || lastDragX);
    const dx = x - startX;

    if (!hasDragged) {
      // Обычный клик без перемещения
      applyPosition(currentIndex, true, 0.25);
      scheduleAutoStep();
      return;
    }

    // Вычисляем целевую карточку с учетом смещения и импульса броска пальцем
    const currentTrackX = dragOriginX + dx;
    const trackCenter = getTrackCenter();
    let targetIdx = Math.round((trackCenter - currentTrackX - CARD_WIDTH / 2) / STEP);

    // Добавляем инерцию при быстром свайпе (flick momentum)
    if (Math.abs(velocity) > 0.35) {
      const momentumStep = Math.round(-velocity * 120 / STEP);
      const bonus = Math.sign(momentumStep) * Math.min(Math.abs(momentumStep), 2);
      targetIdx += bonus;
    }

    // Безопасные границы внутри 5 сетов
    targetIdx = Math.max(2, Math.min(cards.length - 3, targetIdx));

    // Мягкий доводчик в центр с кривой отклика Apple
    goToIndex(targetIdx, 0.45);
  }

  track.addEventListener('touchstart', onPointerDown, { passive: true });
  track.addEventListener('touchmove', onPointerMove, { passive: true });
  track.addEventListener('touchend', onPointerUp, { passive: true });
  track.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

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

  window.addEventListener('resize', () => {
    applyPosition(currentIndex, false);
  });

  // Запуск: фиксация на Dewu сразу при загрузке
  applyPosition(currentIndex, false);
  scheduleAutoStep();
}

// Global Exports
if (typeof renderHome === 'function') window.renderHome = renderHome;
if (typeof attachHomeHandlers === 'function') window.attachHomeHandlers = attachHomeHandlers;
if (typeof initMarketplaceRoulette === 'function') window.initMarketplaceRoulette = initMarketplaceRoulette;
if (typeof loadHomeProducts === 'function') window.loadHomeProducts = loadHomeProducts;
if (typeof scrollToPageTop === 'function') window.scrollToPageTop = scrollToPageTop;
if (typeof renderCalculator === 'function') window.renderCalculator = renderCalculator;
