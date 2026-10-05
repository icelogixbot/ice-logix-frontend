// ============================================================
// ICE LOGIX Module: Profile & Referral System
// ============================================================
        // ==================== РЕНДЕР ПРОФИЛЯ (С РЕФЕРАЛКАМИ) ====================
        async function renderProfile() {
      const [referralStats, isDropshipper] = await Promise.all([
        window.CacheDB.get('ref_' + userId, async () => {
          let stats = { count: 0, bonus: 0 };
          if (userId) {
            try {
              const { data, error } = await supabaseClient.from('users').select('referral_count, referral_bonus').eq('user_id', userId).single();
              if (!error && data) {
                stats.count = data.referral_count || 0;
                stats.bonus = data.referral_bonus || 0;
              }
            } catch(e) {}
          }
          return stats;
        }, 60000),
        window.CacheDB.get('dropship_' + userId, async () => {
          if (userId) {
            try {
              const { data, error } = await supabaseClient.from('dropshipper_settings').select('user_id').eq('user_id', userId).single();
              if (!error && data) return true;
            } catch(e) {}
          }
          return false;
        }, 300000)
      ]);
      
      const shareLink = userReferralCode ? `https://t.me/${tg.initDataUnsafe?.user?.username ? tg.initDataUnsafe.user.username : 'icelogix_bot'}?startapp=ref_${userReferralCode}` : '';
      
      let displayedBalance = balance;
      const fam = window.userSettings?.family || {};
      let familyBalance = null;
      let familyBalanceLabel = null;
      let isFamilyEnabled = false;

      if (fam.role === 'member' && fam.head_id) {
        isFamilyEnabled = true;
        try {
          const { data: headUser } = await supabaseClient.from('users').select('ices_balance').eq('user_id', fam.head_id).single();
          if (headUser) {
            familyBalance = headUser.ices_balance || 0;
            familyBalanceLabel = 'Семейный баланс (Глава семьи)';
          }
        } catch(e) {}
      } else if (fam.role === 'head') {
        isFamilyEnabled = true;
        familyBalance = balance;
        familyBalanceLabel = 'Семейный баланс (Вы — глава)';
      }

      const trustedBadge = '';

      return `
  <!-- Profile Header Card -->
  <div class="glass-card text-center mb-5">
    <div class="relative mx-auto w-28 h-28 mb-4">
      <div class="w-28 h-28 rounded-full overflow-hidden" style="background: var(--glass-border-strong); padding: 2px;">
        <div class="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-4xl font-bold" style="background: var(--bg-gradient-mid);" id="profileAvatar">
          ${userAvatarUrl ? '<img src="' + userAvatarUrl + '" class="w-full h-full object-cover">' : (userName || 'Гость').charAt(0).toUpperCase()}
        </div>
      </div>
      <button id="changeAvatarBtn" class="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-deep)); border-color: var(--bg-gradient-mid); box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
      </button>
    </div>
    <div class="flex items-center justify-center gap-2 mb-2">
      <h2 class="text-xl font-bold flex items-center gap-1" id="profileNameDisplay">${userName}</h2>
      <button id="editNameBtn" class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
    
    <!-- Balance Display -->
    ${isFamilyEnabled ? `
    <div class="flex gap-3 justify-center mb-4 flex-wrap">
      <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(91,191,235,0.2), rgba(46,158,212,0.1)); border: 1px solid rgba(91,191,235,0.3);">
        <span class="text-xl animate-float"><span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span>
        <div class="text-left">
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Мой баланс</p>
          <p class="text-lg font-bold" style="color: var(--ice-primary);">${balance} ICE</p>
        </div>
      </div>
      ${familyBalance !== null ? `
      <div class="flex items-center gap-3 px-4 py-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1)); border: 1px solid rgba(52,211,153,0.3);">
        <span class="text-xl">👨‍👩‍👧</span>
        <div class="text-left">
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">${familyBalanceLabel}</p>
          <p class="text-lg font-bold" style="color: var(--status-success);">${familyBalance} ICE</p>
        </div>
      </div>
      ` : ''}
    </div>
    ` : `
    <div class="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-4" style="background: linear-gradient(135deg, rgba(91,191,235,0.2), rgba(46,158,212,0.1)); border: 1px solid rgba(91,191,235,0.3);">
      <span class="text-2xl animate-float"><span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span>
      <div class="text-left">
        <p class="text-xs" style="color: var(--text-secondary);">Баланс</p>
        <p class="text-xl font-bold" style="color: var(--ice-primary);">${displayedBalance} ICE</p>
      </div>
    </div>
    `}
    
    <!-- Referral Program -->
    <div class="p-4 rounded-2xl mb-4" style="background: linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08)); border: 1px solid rgba(52,211,153,0.25);">
      <div class="flex items-center justify-between mb-3">
        <p class="font-bold flex items-center gap-2 text-white">
          <span class="text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></span>
          Приведи друга
        </p>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">1% ПОЖИЗНЕННО</span>
      </div>
      <p class="text-white/60 text-xs mb-3 text-left">Делитесь ссылкой и получайте 1% от комиссии с каждого заказа вашего друга прямо на баланс ICE!</p>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="p-3 rounded-xl text-center" style="background: var(--glass-bg);">
          <p class="text-2xl font-bold" style="color: var(--ice-primary);">${referralStats.count}</p>
          <p class="text-[10px] uppercase tracking-wider" style="color: var(--text-muted);">Приглашено</p>
        </div>
        <div class="p-3 rounded-xl text-center" style="background: var(--glass-bg);">
          <p class="text-2xl font-bold" style="color: var(--status-success);">${referralStats.bonus}</p>
          <p class="text-[10px] uppercase tracking-wider flex items-center justify-center gap-1" style="color: var(--text-muted);">Бонусы <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p>
        </div>
      </div>
      ${userReferralCode ? `
        <div class="flex items-center justify-between bg-black/20 rounded-lg p-2 mb-2 border border-white/5">
          <span class="text-[10px] font-mono text-cyan-400 truncate flex-1">${shareLink}</span>
        </div>
        <button id="copyReferralLinkBtn" class="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Скопировать ссылку
        </button>
      ` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button onclick="switchTab('reftree')" class="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">🌳<span>Моя сеть</span></button>
        <button onclick="switchTab('ugc')" class="py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all hover:bg-white/10 active:scale-95" style="background: var(--glass-bg-strong); border: 1px solid var(--glass-border);">🎬<span>Распаковка</span></button>
      </div>
    </div>
  </div>

  <!-- Колесо Фортуны перенесено в раздел "Акции" главного меню -->
  
  <!-- Quick Actions Grid -->
  <div class="mb-5">
    <h3 class="text-white font-bold mb-4 flex items-center gap-2">
      <span><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span></span> ${t('quick_actions', 'Быстрые действия')}
    </h3>
    <div class="grid grid-cols-2 gap-3">
      <button id="cartBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] relative">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">${t('cart', 'Корзина')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${t('cart_sub', 'Товары к заказу')}</p>
        </div>
        <span id="cartBadge" class="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center hidden" style="background: #ef4444; color: #fff;">0</span>
      </button>
      <button id="wishlistBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] relative">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1));"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">${t('favorites', 'Избранное')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${t('favorites_sub', 'Сохранённое')}</p>
        </div>
        <span id="wishlistBadge" class="absolute top-2 right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center hidden" style="background: #ef4444; color: #fff;">0</span>
      </button>
      <button id="myOrdersBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(96,165,250,0.2), rgba(59,130,246,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">${t('my_orders', 'Мои заказы')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${t('my_orders_sub', 'История покупок')}</p>
        </div>
      </button>
      <button id="historyQuickBtn" class="glass-card p-4 text-left flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98]">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style="background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1));"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span></div>
        <div>
          <p class="font-bold text-white text-sm">${t('history', 'История')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${t('history_sub', 'Транзакции и заказы')}</p>
        </div>
      </button>
    </div>
  </div>


  
  <!-- Другое Grid -->
  <div class="mb-5">
    <h3 class="text-white font-bold mb-4 flex items-center gap-2">
      <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></span> ${t('other', 'Другое')}
    </h3>
    <div class="glass-card p-2">
      <button id="myPersonalDataBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition">
        <span class="text-xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">${t('my_data', 'Мои данные')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${t('my_data_sub', 'ФИО, телефон, паспорт и замеры')}</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button id="myCardsBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition border-t border-white/5" onclick="window.openCardsManagementModal()">
        <span class="text-xl">💳</span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">Мои банковские карты</p>
          <p class="text-xs" style="color: var(--text-muted);">Управление картами bePaid (до 5 карт)</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button id="dropshipperProfileBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition border-t border-white/5">
        <span class="text-xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">${isDropshipper ? t('dropshipper_cabinet', 'Кабинет дропшиппера') : t('earn_with_us', 'Зарабатывай с нами')}</p>
          <p class="text-xs" style="color: var(--text-muted);">${isDropshipper ? t('dropshipper_cabinet_sub', 'Управление магазином') : t('earn_with_us_sub', 'Стань партнёром ICE LOGIX')}</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ${isOwner ? `
      <button id="adminPanelBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 transition" style="border-top: 1px solid var(--glass-border);">
        <span class="text-xl"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14"/></svg></span></span>
        <div class="flex-1">
          <p class="font-semibold text-white text-sm">Админ-панель</p>
          <p class="text-xs" style="color: var(--text-muted);">Управление системой</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ` : ''}
    </div>
  </div>
  
  <!-- Logout & Delete Account Buttons -->
  <div class="flex gap-3 w-full justify-center" style="max-width: 320px; margin: 0 auto;">
    <button id="logoutBtn" class="w-1/2 py-3 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Выйти
    </button>
    <button id="deleteAccountBtn" class="w-1/2 py-3 px-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5" style="background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.3); color: #F87171;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
      Удалить аккаунт
    </button>
  </div>
  
  ${renderFooter()}
`;
    }

    function attachProfileHandlers() {
  console.log('attachProfileHandlers called');
  
  const myOrdersBtn = document.getElementById('myOrdersBtn');
  if (myOrdersBtn) {
    console.log('myOrdersBtn found');
    myOrdersBtn.onclick = () => { currentSubScreen = 'myOrders'; renderCurrentScreen(); };
  } else {
    console.error('myOrdersBtn NOT found');
  }

  const spinFortuneBtn = document.getElementById('spinFortuneWheelBtn');
  if (spinFortuneBtn) {
    spinFortuneBtn.onclick = () => showWheelOfFortuneModal();
  }

  const wishlistBtn = document.getElementById('wishlistBtn');
  if (wishlistBtn) {
    wishlistBtn.onclick = () => switchTab('wishlist');
  }

  const dropshipperBtn = document.getElementById('dropshipperBtn');
  if (dropshipperBtn) {
    dropshipperBtn.onclick = () => switchTab('dropshipper');
  }

  const historyQuickBtn = document.getElementById('historyQuickBtn');
  if (historyQuickBtn) {
    historyQuickBtn.onclick = () => switchTab('history');
  }

  const dropshipperProfileBtn = document.getElementById('dropshipperProfileBtn');
  if (dropshipperProfileBtn) {
    dropshipperProfileBtn.onclick = () => switchTab('dropshipper');
  }

  const myCardsBtn = document.getElementById('myCardsBtn');
  if (myCardsBtn) {
    myCardsBtn.onclick = () => {
      if (typeof window.openCardsManagementModal === 'function') {
        window.openCardsManagementModal();
      }
    };
  }

  const academyBtn = document.getElementById('academyBtn');
  if (academyBtn) {
    academyBtn.onclick = () => switchTab('academy');
  }

  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) {
    adminBtn.onclick = () => switchTab('admin');
  }

  // themeToggle removed



  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      const confirmLogout = await tgUtil.confirm('Вы действительно хотите выйти из аккаунта?');
      if (!confirmLogout) return;
      try { await supabaseClient.auth.signOut(); } catch(e) {}
      localStorage.setItem('ice_logged_out', 'true');
      location.reload();
    };
  }

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.onclick = async () => {
      const confirmDelete = await tgUtil.confirm('Вы действительно хотите полностью удалить ваш аккаунт и все связанные с ним данные? Это действие необратимо.');
      if (!confirmDelete) return;

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("Пользователь не найден");

        const userEmail = user.email || '';
        const isTelegramUser = userEmail.startsWith('tg_') && userEmail.endsWith('@icelogix.by');
        const session = (await supabaseClient.auth.getSession()).data.session;
        const accessToken = session?.access_token;

        if (isTelegramUser) {
          tgUtil.haptic('light');
          const otpRes = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ action: 'send-delete-otp' })
          });
          const otpData = await otpRes.json();
          if (!otpData.ok) throw new Error(otpData.error || 'Не удалось отправить код подтверждения');

          const code = prompt('Код подтверждения отправлен в ваш Telegram. Введите его для удаления аккаунта:');
          if (!code) return;

          const deleteRes = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ action: 'delete-account', otpCode: code.trim() })
          });
          const deleteData = await deleteRes.json();
          if (!deleteData.ok) throw new Error(deleteData.error || 'Не удалось удалить аккаунт');

        } else {
          const pwd = prompt('Для подтверждения удаления введите пароль от вашего аккаунта:');
          if (!pwd) return;

          const deleteRes = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ action: 'delete-account', password: pwd })
          });
          const deleteData = await deleteRes.json();
          if (!deleteData.ok) throw new Error(deleteData.error || 'Не удалось удалить аккаунт');
        }

        tgUtil.haptic('success');
        await supabaseClient.auth.signOut();
        localStorage.setItem('ice_logged_out', 'true');
        tgUtil.alert('Ваш аккаунт был успешно удален.');
        location.reload();

      } catch (err) {
        tgUtil.haptic('error');
        tgUtil.alert('Ошибка удаления аккаунта: ' + err.message);
      }
    };
  }

  const copyBtn = document.getElementById('copyReferralLinkBtn');
  if (copyBtn) {
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      const link = userReferralCode ? `https://t.me/icelogix_bot?startapp=ref_${userReferralCode}` : '';
      if (link) {
        navigator.clipboard.writeText(link).then(() => {
          tgUtil.alert('Ссылка скопирована! Отправьте её другу.');
        }).catch(err => {
          tgUtil.alert('Не удалось скопировать. Скопируйте ссылку вручную.');
        });
        tgUtil.haptic('success');
      }
    };
  }
  // Мои данные (единый профиль)
  const myPersonalDataBtn = document.getElementById('myPersonalDataBtn');
  if (myPersonalDataBtn) myPersonalDataBtn.onclick = () => showPersonalDataForm();

  const recoverySecurityBtn = document.getElementById('recoverySecurityBtn');
  if (recoverySecurityBtn) recoverySecurityBtn.onclick = () => showRecoveryCodeModal();

  const marketplaceWhitelistBtn = document.getElementById('marketplaceWhitelistBtn');
  if (marketplaceWhitelistBtn) marketplaceWhitelistBtn.onclick = () => showMarketplaceWhitelistModal();

  // Скачать договор
  const downloadAgreementBtn = document.getElementById('downloadAgreementBtn');
  if (downloadAgreementBtn) downloadAgreementBtn.onclick = () => downloadAgreement();

  // Смена аватара
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  if (changeAvatarBtn) changeAvatarBtn.onclick = () => showAvatarUploader();

  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) {
    profileAvatar.style.cursor = 'pointer';
    profileAvatar.onclick = (e) => {
      e.stopPropagation();
      animateClick(profileAvatar);
    };
  }

  // Редактирование имени открывает компактный prompt
  const editNameBtn = document.getElementById('editNameBtn');
  if (editNameBtn) editNameBtn.onclick = () => showEditNameForm();

  // Все транзакции
  const allTransactionsBtn = document.getElementById('showAllTransactionsBtn');
  if (allTransactionsBtn) allTransactionsBtn.onclick = () => switchTab('history');

  const historyProfileBtn = document.getElementById('historyProfileBtn');
  if (historyProfileBtn) historyProfileBtn.onclick = () => switchTab('history');

  // Настройки уведомлений
  const notifSettingsBtn = document.getElementById('notificationsSettingsBtn');
  if (notifSettingsBtn) notifSettingsBtn.onclick = () => showAppSettings('notifications');
  const accountRecoveryBtn = document.getElementById('accountRecoveryBtn');
  if (accountRecoveryBtn) accountRecoveryBtn.onclick = () => showAccountRecovery();

  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) cartBtn.onclick = () => switchTab('cart');

}

window.getFortuneSpinCooldown = () => {
  const lastSpin = localStorage.getItem('last_fortune_spin');
  if (!lastSpin) return 0;
  const elapsed = Date.now() - parseInt(lastSpin);
  const cooldown = 24 * 60 * 60 * 1000;
  return Math.max(0, cooldown - elapsed);
};

window.showFortuneWheel = () => {
  if (getFortuneSpinCooldown() > 0) {
    tgUtil.haptic('error');
    glassToast('Колесо Фортуны доступно 1 раз в 24 часа!', { kind: 'error' });
    return;
  }
  
  tgUtil.haptic('light');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
  modal.id = 'fortuneWheelModal';
  
  modal.innerHTML = `
    <div class="glass-card max-w-sm w-full mx-4 p-6 shadow-[0_15px_40px_-10px_rgba(139,92,246,0.5)] transform transition-all duration-300 scale-95 opacity-0 text-center" style="background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border: 1px solid rgba(139,92,246,0.3);" id="fortuneModalContent">
      <h3 class="text-white font-bold text-xl mb-2 flex items-center justify-center gap-2">
        <span>🔮</span> Колесо Фортуны
      </h3>
      <p class="text-white/60 text-xs mb-6">Испытайте удачу! Вы можете выиграть до 10 ICE на баланс.</p>
      
      <div class="relative w-48 h-48 mx-auto mb-8">
        <!-- Указатель -->
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-3xl" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">📍</div>
        <!-- Колесо -->
        <div id="wheelElement" class="w-full h-full rounded-full border-4 border-white/10 relative overflow-hidden transition-transform" style="background: conic-gradient(
          #3b82f6 0deg 60deg, 
          #8b5cf6 60deg 120deg, 
          #10b981 120deg 180deg, 
          #f59e0b 180deg 240deg, 
          #ef4444 240deg 300deg, 
          #ec4899 300deg 360deg
        ); box-shadow: 0 0 20px rgba(139,92,246,0.4);">
          <!-- Разделители -->
          <div class="absolute inset-0 rounded-full" style="background-image: repeating-conic-gradient(from 0deg, transparent 0deg 59.5deg, rgba(255,255,255,0.5) 59.5deg 60.5deg);"></div>
        </div>
      </div>
      
      <button id="spinBtnReal" class="w-full py-3 rounded-xl text-lg font-bold shadow-[0_0_15px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2 text-white" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none;">
        КРУТИТЬ!
      </button>
      <button class="w-full py-2 mt-3 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-colors" onclick="document.getElementById('fortuneModalContent').classList.remove('scale-100','opacity-100'); setTimeout(()=>document.getElementById('fortuneWheelModal').remove(),300);">Отмена</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => {
    document.getElementById('fortuneModalContent').classList.remove('scale-95', 'opacity-0');
    document.getElementById('fortuneModalContent').classList.add('scale-100', 'opacity-100');
  }, 10);
  
  const spinBtn = document.getElementById('spinBtnReal');
  const wheel = document.getElementById('wheelElement');
  
  spinBtn.onclick = async () => {
    if (getFortuneSpinCooldown() > 0) return;
    
    tgUtil.haptic('medium');
    spinBtn.disabled = true;
    spinBtn.innerHTML = 'Вращаем... 🌀';
    spinBtn.style.opacity = '0.5';
    
    // Определяем выигрыш (от 1 до 5 ICE, с маленьким шансом на 10)
    const rand = Math.random();
    let winAmount = 1;
    if (rand > 0.95) winAmount = 10;
    else if (rand > 0.8) winAmount = 5;
    else if (rand > 0.5) winAmount = 2;
    
    // Анимация вращения
    const extraSpins = 5; // 5 полных оборотов
    const stopAngle = (extraSpins * 360) + Math.floor(Math.random() * 360);
    
    wheel.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.15, 1)';
    wheel.style.transform = `rotate(${stopAngle}deg)`;
    
    setTimeout(async () => {
      tgUtil.haptic('success');
      localStorage.setItem('last_fortune_spin', Date.now().toString());
      
      try {
        const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', userId).single();
        const newBal = (u?.ices_balance || 0) + winAmount;
        await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', userId);
        
        balance = newBal; // локально
        glassToast(`Поздравляем! Вы выиграли ${winAmount} ICE! 🎁`, { kind: 'success' });
      } catch (err) {
        glassToast('Ошибка начисления бонуса', { kind: 'error' });
      }
      
      setTimeout(() => {
        document.getElementById('fortuneModalContent').classList.remove('scale-100','opacity-100'); 
        setTimeout(() => {
          modal.remove();
          renderCurrentScreen();
        }, 300);
      }, 2000);
    }, 4100);
  };
};


// Global Exports
if (typeof renderProfile === 'function') window.renderProfile = renderProfile;
if (typeof attachProfileHandlers === 'function') window.attachProfileHandlers = attachProfileHandlers;
