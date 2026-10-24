// ============================================================
// ICE LOGIX Module: Profile & Referral System
// ============================================================
        // ==================== РЕНДЕР ПРОФИЛЯ (С РЕФЕРАЛКАМИ) ====================
        async function renderProfile() {
      let isDropshipper = false;
      if (userId) {
        try {
          isDropshipper = await window.CacheDB.get('dropship_' + userId, async () => {
            const { data, error } = await supabaseClient.from('dropshipper_settings').select('user_id').eq('user_id', userId).single();
            return !error && !!data;
          }, 300000);
        } catch(e) {}
      }
      
      let kycStatus = 'not_submitted';
      if (userId && typeof supabaseClient !== 'undefined') {
        try {
          const { data: uKyc } = await supabaseClient.from('users').select('kyc_status').eq('user_id', userId).single();
          if (uKyc && uKyc.kyc_status) kycStatus = uKyc.kyc_status;
        } catch(_) {}
      }

      return `
  <!-- Profile Clean Header (No heavy blue container) -->
  <div class="text-center mb-6 pt-2">
    <div class="relative mx-auto w-24 h-24 mb-3">
      <div class="w-24 h-24 rounded-full overflow-hidden p-0.5" style="background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
        <div class="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold bg-slate-900 text-white" id="profileAvatar">
          ${userAvatarUrl ? '<img src="' + userAvatarUrl + '" class="w-full h-full object-cover">' : (userName || 'Гость').charAt(0).toUpperCase()}
        </div>
      </div>
      <button id="changeAvatarBtn" class="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-slate-950 shadow-md active:scale-90 transition" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-deep));" title="Изменить фото">
        <span class="ix"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
      </button>
    </div>
    <div class="flex items-center justify-center gap-2">
      <h2 class="text-xl font-bold text-white tracking-wide" id="profileNameDisplay">${userName}</h2>
      <button id="editNameBtn" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white bg-white/5 border border-white/10 active:scale-90 transition" title="Изменить имя">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Unified Profile Menu List -->
  <div class="mb-5">
    <div class="glass-card p-2 rounded-2xl space-y-1">
      <!-- 1. Мои данные -->
      <button id="kycVerificationBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition" onclick="switchTab('kyc')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-white/5 border border-white/10 shrink-0">
          ${kycStatus === 'verified' ? '🛡️' : (kycStatus === 'pending' ? '⏳' : (kycStatus === 'rejected' ? '⚠️' : '🪪'))}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-white text-sm">Мои данные</p>
            ${kycStatus === 'verified' ? '' :
              kycStatus === 'pending' ? '<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">НА ПРОВЕРКЕ</span>' :
              kycStatus === 'rejected' ? '<span class="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">ОТКЛОНЕНО</span>' :
              '<span class="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">Пройти верификацию!</span>'}
          </div>
          <p class="text-xs truncate" style="color: var(--text-muted);">
            ${kycStatus === 'verified' ? 'Паспортные данные, получатели и размеры' :
              kycStatus === 'pending' ? 'Сверка данных администратором' :
              kycStatus === 'rejected' ? 'Нажмите, чтобы исправить данные' :
              'Паспортные данные получателя посылок'}
          </p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 2. Финансы -->
      <button id="financesBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="window._financesSubTab = 'payment'; switchTab('finances')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-cyan-500/10 border border-cyan-500/20 shrink-0 text-cyan-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">Финансы</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">Карты, ICE LOGIX PAY, купоны и возвраты</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 3. История заказов -->
      <button id="historyQuickBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('history')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-purple-500/10 border border-purple-500/20 shrink-0 text-purple-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">История заказов</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">Все заказы, посылки и статусы доставки</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 4. Избранное -->
      <button id="wishlistBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('wishlist')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-rose-500/10 border border-rose-500/20 shrink-0 text-rose-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-white text-sm">Избранное</p>
            <span id="wishlistBadge" class="hidden px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">0</span>
          </div>
          <p class="text-xs truncate" style="color: var(--text-muted);">Сохранённые товары и вишлист</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 5. Рефералка -->
      <button id="referralBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('referral')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 text-emerald-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="font-semibold text-white text-sm">Рефералка</p>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">7% + 3%</span>
          </div>
          <p class="text-xs truncate" style="color: var(--text-muted);">Приглашай друзей и получай бонусы с каждого заказа</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 6. Магазин бонусов ICE -->
      <button id="bonusShopBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('bonus_shop')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
          🎁
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">Магазин бонусов</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">Обмен накопленных баллов на скидки и призы</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 7. Кабинет дропшиппера / Зарабатывай с нами -->
      <button id="dropshipperProfileBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('dropshipper')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-blue-500/10 border border-blue-500/20 shrink-0 text-cyan-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">${isDropshipper ? t('dropshipper_cabinet', 'Кабинет дропшиппера') : t('earn_with_us', 'Зарабатывай с нами')}</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">${isDropshipper ? t('dropshipper_cabinet_sub', 'Управление магазином') : t('earn_with_us_sub', 'Стань партнёром ICE LOGIX')}</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 8. О сервисе и помощь -->
      <button id="aboutServiceBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="currentSubScreen = 'about'; renderCurrentScreen();">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-teal-500/10 border border-teal-500/20 shrink-0 text-teal-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">О сервисе и помощь</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">Условия, поддержка, соцсети, оферта и реквизиты</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <!-- 9. Админ-панель (если владелец) -->
      ${isOwner ? `
      <button id="adminPanelBtn" class="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white/5 active:scale-[0.99] transition border-t border-white/5" onclick="switchTab('admin')">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-amber-500/10 border border-amber-500/20 shrink-0 text-amber-400">
          👑
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-white text-sm">Админ-панель</p>
          <p class="text-xs truncate" style="color: var(--text-muted);">Управление системой</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      ` : ''}
    </div>
  </div>
  
  <div class="text-center py-5 pb-2 text-[11px] text-white/30 space-y-1">
    <p>ICE LOGIX © 2026 • Доставка мечты</p>
    <p class="text-[10px] text-white/20">ИП Иванов И.И. • УНП 123456789</p>
  </div>
`;
    }

    function attachProfileHandlers() {
  console.log('attachProfileHandlers called');
  


  const spinFortuneBtn = document.getElementById('spinFortuneWheelBtn');
  if (spinFortuneBtn) {
    spinFortuneBtn.onclick = () => showWheelOfFortuneModal();
  }

    const referralBtn = document.getElementById('referralBtn');
  if (referralBtn) {
    referralBtn.onclick = () => switchTab('referral');
  }

  const bonusShopBtn = document.getElementById('bonusShopBtn');
  if (bonusShopBtn) {
    bonusShopBtn.onclick = () => switchTab('bonus_shop');
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

  const financesBtn = document.getElementById('financesBtn');
  if (financesBtn) {
    financesBtn.onclick = () => switchTab('finances');
  }

  const myCardsBtn = document.getElementById('myCardsBtn');
  if (myCardsBtn) {
    myCardsBtn.onclick = () => switchTab('finances');
  }

  const academyBtn = document.getElementById('academyBtn');
  if (academyBtn) {
    academyBtn.onclick = () => switchTab('academy');
  }



  const adminBtn = document.getElementById('adminPanelBtn');
  if (adminBtn) {
    adminBtn.onclick = () => switchTab('admin');
  }

  const aboutServiceBtn = document.getElementById('aboutServiceBtn');
  if (aboutServiceBtn) {
    aboutServiceBtn.onclick = () => {
      currentSubScreen = 'about';
      renderCurrentScreen();
    };
  }

  // themeToggle removed



  window.logoutUser = async function() {
    const confirmLogout = await tgUtil.confirm('Вы действительно хотите выйти из аккаунта?');
    if (!confirmLogout) return;
    try { await supabaseClient.auth.signOut(); } catch(e) {}
    localStorage.setItem('ice_logged_out', 'true');
    location.reload();
  };

  window.deleteUserAccount = async function() {
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
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
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

      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
      await supabaseClient.auth.signOut();
      localStorage.setItem('ice_logged_out', 'true');
      if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
        tgUtil.alert('Ваш аккаунт был успешно удален.');
      }
      location.reload();

    } catch (err) {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('error');
      if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
        tgUtil.alert('Ошибка удаления аккаунта: ' + err.message);
      }
    }
  };

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => window.logoutUser();
  }

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.onclick = () => window.deleteUserAccount();
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
      <p class="text-white/60 text-xs mb-6">Испытайте удачу! Вы можете выиграть до 10 ${window.bynSign ? window.bynSign({ color: 'cyan' }) : ''} на баланс.</p>
      
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
        glassToast(`Поздравляем! Вы выиграли ${winAmount} на баланс! 🎁`, { kind: 'success' });
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



// ==================== ЛЕГКИЙ ЭКРАН РЕФЕРАЛКИ ====================
async function renderReferralPage() {
  let stats = { count: 0, bonus: 0 };
  if (userId) {
    try {
      stats = await window.CacheDB.get('ref_' + userId, async () => {
        const { data, error } = await supabaseClient.from('users').select('referral_count, referral_bonus').eq('user_id', userId).single();
        if (!error && data) {
          return { count: data.referral_count || 0, bonus: data.referral_bonus || 0 };
        }
        return { count: 0, bonus: 0 };
      }, 60000);
    } catch(e) {}
  }

  const shareLink = userReferralCode ? `https://t.me/icelogix_bot?start=ref_${userReferralCode}` : '';

  return `
    <div class="page-enter px-4 max-w-md mx-auto">
      <!-- Шапка с кнопкой Назад -->
      <div class="flex items-center gap-3 mb-4 mt-2">
        <button id="referralBackBtn" type="button" class="global-back-btn !mb-0" title="Назад в профиль" onclick="window.switchTab('profile')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white tracking-wide">Реферальная программа</h2>
          <p class="text-[11px] text-white/40">Приглашайте друзей и получайте бонусы</p>
        </div>
      </div>

      <!-- Баннер с условиями -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 mb-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-xl">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🤝</span>
            <span class="font-bold text-white text-base">Приведи друга</span>
          </div>
          <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
            7% ВАМ + 3% ДРУГУ
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed mb-4">
          Делитесь персональной ссылкой с друзьями: вы получаете <span class="text-emerald-400 font-bold">7% от комиссии</span> за каждый выполненный ими заказ, а ваш друг — <span class="text-cyan-400 font-bold">3% приветственный кэшбэк</span> на баланс!
        </p>

        <!-- Счетчики статистики -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
            <p class="text-2xl font-black text-cyan-400">${stats.count}</p>
            <p class="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">Приглашено друзей</p>
          </div>
          <div class="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-center">
            <p class="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1.5">
              <span>${stats.bonus}</span>
              <span class="inline-flex items-center text-xs font-mono text-emerald-300">${window.bynSign ? window.bynSign({ color: 'emerald' }) : ''}</span>
            </p>
            <p class="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">Заработано бонусов</p>
          </div>
        </div>

        <!-- Ссылка и кнопки копирования/шеринга -->
        <div class="space-y-2">
          <div class="bg-black/40 rounded-xl p-2.5 border border-white/10 flex items-center justify-between gap-2">
            <span class="text-xs font-mono text-cyan-300 truncate select-all">${shareLink || 'Генерация персональной ссылки...'}</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button id="copyRefLinkBtn" type="button" class="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Копировать</span>
            </button>
            <button id="shareTelegramRefBtn" type="button" class="btn-primary py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-cyan-500/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
              <span>В Telegram</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Как это работает (3 понятных шага) -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 mb-5">
        <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <span>⚡</span> Как это работает
        </h3>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0 border border-cyan-500/30">1</div>
            <div>
              <p class="text-xs font-semibold text-white">Отправьте ссылку другу</p>
              <p class="text-[11px] text-white/50">Скопируйте ссылку или перешлите её напрямую в любой чат Telegram.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0 border border-cyan-500/30">2</div>
            <div>
              <p class="text-xs font-semibold text-white">Друг оформляет заказ</p>
              <p class="text-[11px] text-white/50">При первом заказе он получает приветственный кэшбэк 3% на баланс.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">3</div>
            <div>
              <p class="text-xs font-semibold text-white">Вы получаете 7% бонусов</p>
              <p class="text-[11px] text-white/50">Баллы сразу начисляются на ваш счёт и готовы к тратам в магазине бонусов или оплате доставки.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function attachReferralPageHandlers() {
  const copyBtn = document.getElementById('copyRefLinkBtn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const link = userReferralCode ? `https://t.me/icelogix_bot?start=ref_${userReferralCode}` : '';
      if (link) {
        navigator.clipboard.writeText(link).then(() => {
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
          if (typeof glassToast === 'function') glassToast('Ссылка скопирована в буфер!', { kind: 'success' });
          else if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Ссылка скопирована!');
        }).catch(() => {
          if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Скопируйте ссылку вручную: ' + link);
        });
      }
    };
  }

  const shareTgBtn = document.getElementById('shareTelegramRefBtn');
  if (shareTgBtn) {
    shareTgBtn.onclick = () => {
      const link = userReferralCode ? `https://t.me/icelogix_bot?start=ref_${userReferralCode}` : '';
      const text = encodeURIComponent('Заказывай оригинальные брендовые товары из Китая, США и Европы с доставкой в Беларусь через ICE LOGIX! Держи скидку 3% на первый заказ:');
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`;
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    };
  }
}

// Global Exports
if (typeof renderProfile === 'function') window.renderProfile = renderProfile;
if (typeof attachProfileHandlers === 'function') window.attachProfileHandlers = attachProfileHandlers;

if (typeof renderReferralPage === 'function') window.renderReferralPage = renderReferralPage;
if (typeof attachReferralPageHandlers === 'function') window.attachReferralPageHandlers = attachReferralPageHandlers;
