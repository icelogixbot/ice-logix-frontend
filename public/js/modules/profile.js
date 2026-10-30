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

      const U = window.UI;
      const _bal = (typeof balance !== 'undefined' && balance != null) ? Number(String(balance).replace(',', '.')) || 0 : 0;
      const _wishCount = (typeof wishlist !== 'undefined' && wishlist && wishlist.size != null) ? wishlist.size : 0;
      let _cartCount = 0;
      try { _cartCount = parseInt(localStorage.getItem('ice_cart_count') || '0', 10) || 0; } catch (_) {}
      const _name = U.esc(userName || 'Гость');
      const _kyc = kycStatus === 'verified'
        ? { cls: 'ok', icon: 'shield', text: 'Данные подтверждены' }
        : kycStatus === 'pending'
          ? { cls: 'warn', icon: 'clock', text: 'Данные на проверке' }
          : kycStatus === 'rejected'
            ? { cls: 'bad', icon: 'alert', text: 'Данные нужно исправить' }
            : { cls: 'warn', icon: 'idcard', text: 'Подтвердите данные для таможни' };
      const row = (id, icon, title, text, onclick, extra) => `
        <div class="rd-row" id="${id}" role="button" tabindex="0" onclick="${onclick}">
          <span class="rd-ico">${U.icon(icon, 22)}</span>
          <span class="rd-row-body"><span class="rd-row-title">${title}${extra || ''}</span>${text ? `<span class="rd-row-text">${text}</span>` : ''}</span>
          <svg class="rd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>
        </div>`;

      return `
  <div class="pf page-enter">
    <section class="pf-hero">
      <div class="pf-ava-wrap">
        <div class="pf-ava" id="profileAvatar">${userAvatarUrl ? '<img src="' + userAvatarUrl + '" alt="">' : _name.charAt(0).toUpperCase()}</div>
        <button type="button" id="changeAvatarBtn" class="pf-ava-btn" aria-label="Изменить фото">${U.icon('camera', 16)}</button>
      </div>
      <div class="pf-name-row">
        <h1 class="pf-name" id="profileNameDisplay">${_name}</h1>
        <button type="button" id="editNameBtn" class="pf-edit" aria-label="Изменить имя">${U.icon('pencil', 15)}</button>
      </div>
      <button type="button" class="pf-kyc rd-status ${_kyc.cls}" onclick="switchTab('kyc')">${U.icon(_kyc.icon, 14)}${_kyc.text}${kycStatus === 'verified' ? '' : U.icon('chevR', 14)}</button>
    </section>

    <section class="pf-stats">
      <button type="button" class="pf-stat" onclick="window.openBalanceTopup()">
        <span class="pf-stat-k">${U.icon('wallet', 16)}Баланс</span>
        <span class="pf-stat-v">${U.money(_bal)}</span>
        <span class="pf-stat-a">Пополнить</span>
      </button>
      <button type="button" class="pf-stat" onclick="switchTab('wishlist')">
        <span class="pf-stat-k">${U.icon('heart', 16)}Избранное</span>
        <span class="pf-stat-v">${_wishCount}</span>
        <span class="pf-stat-a">Открыть</span>
      </button>
      <button type="button" class="pf-stat" onclick="switchTab('cart')">
        <span class="pf-stat-k">${U.icon('cart', 16)}Корзина</span>
        <span class="pf-stat-v">${_cartCount}</span>
        <span class="pf-stat-a">Открыть</span>
      </button>
    </section>

    <div class="pf-group-t">Покупки</div>
    <div class="rd-card rd-list">
      ${row('myOrdersRowBtn', 'box', 'Мои заказы', 'Статусы, трек-номера и фото со склада', "currentSubScreen = 'myOrders'; renderCurrentScreen();")}
      ${row('historyQuickBtn', 'history', 'История и архив', 'Завершённые заказы, транзакции и расчёты', "switchTab('history')")}
      ${row('wishlistBtn', 'heart', 'Избранное', 'Сохранённые вещи', "switchTab('wishlist')", '<span id="wishlistBadge" class="hidden rd-badge">0</span>')}
      ${row('financesBtn', 'card', 'Финансы', 'Кошелёк, карты, промокоды и возвраты', "window._financesSubTab = 'payment'; switchTab('finances')")}
    </div>

    <div class="pf-group-t">Бонусы и заработок</div>
    <div class="rd-card rd-list">
      ${row('referralBtn', 'users', 'Приглашайте друзей', '7% вам и 3% другу с каждого заказа', "switchTab('referral')", '<span class="rd-badge">7% + 3%</span>')}
      ${row('bonusShopBtn', 'gift', 'Магазин бонусов', 'Меняйте баллы ICE на скидки и подарки', "switchTab('bonus_shop')")}
      ${row('dropshipperProfileBtn', 'store', isDropshipper ? t('dropshipper_cabinet', 'Кабинет дропшиппера') : t('earn_with_us', 'Зарабатывайте с нами'), isDropshipper ? t('dropshipper_cabinet_sub', 'Управление магазином') : t('earn_with_us_sub', 'Станьте партнёром ICE LOGIX'), "switchTab('dropshipper')")}
    </div>

    <div class="pf-group-t">Аккаунт</div>
    <div class="rd-card rd-list">
      ${row('kycVerificationBtn', 'idcard', 'Мои данные', kycStatus === 'verified' ? 'Паспорт, получатели и размеры' : 'Паспортные данные для получения посылок', "switchTab('kyc')")}
      ${row('aboutServiceBtn', 'help', 'О сервисе и помощь', 'Условия, поддержка, оферта и реквизиты', "currentSubScreen = 'about'; renderCurrentScreen();")}
      ${isOwner ? row('adminPanelBtn', 'crown', 'Админ-панель', 'Управление системой', "switchTab('admin')") : ''}
    </div>

    <p class="pf-foot">ICE LOGIX · доставка из Китая в Беларусь</p>
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

        const code = await window.UI.ask({
          title: 'Удаление аккаунта',
          text: 'Мы отправили код в ваш Telegram. Введите его, чтобы удалить аккаунт навсегда.',
          fields: [{ name: 'code', label: 'Код из Telegram', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code' }],
          action: 'Удалить аккаунт',
          danger: true,
          validate: (v) => v.code ? '' : 'Введите код'
        });
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
        const pwd = await window.UI.ask({
          title: 'Удаление аккаунта',
          text: 'Введите пароль от аккаунта, чтобы удалить его навсегда.',
          fields: [{ name: 'password', label: 'Пароль', type: 'password', autocomplete: 'current-password' }],
          action: 'Удалить аккаунт',
          danger: true,
          validate: (v) => v.password ? '' : 'Введите пароль'
        });
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

// Старое колесо выбирало приз в браузере. Теперь одно колесо — showWheelOfFortuneModal (приз считает сервер).
window.showFortuneWheel = () => showWheelOfFortuneModal();



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
  const U = window.UI;

  return `
    <div class="rd-screen page-enter rf">
      <div class="rd-head">
        <button id="referralBackBtn" type="button" class="rd-back" aria-label="Назад" onclick="window.goBackGlobal()">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Приглашайте друзей</h1><p class="rd-head-sub">Бонусы вам и скидка другу</p></div>
      </div>

      <div class="rf-hero">
        <div class="rf-art" aria-hidden="true">
          <span class="rf-coin c1">7%</span><span class="rf-coin c2">3%</span>
          <span class="rf-ppl">${U.icon('users', 34)}</span>
        </div>
        <h2>7% вам, 3% другу</h2>
        <p>Вы получаете 7% от нашей комиссии с каждого заказа друга, а друг — 3% кэшбэка на первый заказ.</p>
      </div>

      <div class="rf-stats">
        <div><b>${stats.count}</b><span>друзей пришло</span></div>
        <div><b>${U.money(Number(stats.bonus) || 0)}</b><span>заработано</span></div>
      </div>

      <div class="rd-card rf-link">
        <span class="rd-label">Ваша ссылка</span>
        <div class="rf-url" onclick="document.getElementById('copyRefLinkBtn')?.click()">${U.icon('link', 18)}<span>${shareLink ? U.esc(shareLink.replace('https://', '')) : 'Готовим вашу ссылку…'}</span></div>
        <div class="rf-btns">
          <button id="copyRefLinkBtn" type="button" class="rd-btn rd-btn-tonal">${U.icon('copy', 18)}Копировать</button>
          <button id="shareTelegramRefBtn" type="button" class="rd-btn">${U.icon('send', 18)}Отправить</button>
        </div>
      </div>

      <div class="rd-section"><h2>Как это работает</h2></div>
      <div class="rf-steps">
        <div><span>1</span><div><b>Отправьте ссылку</b><p>В любой чат Telegram или скопируйте её.</p></div></div>
        <div><span>2</span><div><b>Друг делает заказ</b><p>И сразу получает 3% кэшбэка на баланс.</p></div></div>
        <div><span>3</span><div><b>Вам приходят бонусы</b><p>7% с каждого его заказа. Тратьте в магазине бонусов или на доставку.</p></div></div>
      </div>

      <div class="rd-card rd-list rf-more">
        <div class="rd-row" role="button" tabindex="0" onclick="switchTab('reftree')"><span class="rd-ico">${U.icon('users', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Моя сеть</span><span class="rd-row-text">Кого вы пригласили, по уровням</span></span>${U.icon('chevR', 18)}</div>
        <div class="rd-row" role="button" tabindex="0" onclick="switchTab('bonus_shop')"><span class="rd-ico">${U.icon('gift', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Магазин бонусов</span><span class="rd-row-text">На что потратить баллы</span></span>${U.icon('chevR', 18)}</div>
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
          if (window.UI) window.UI.toast('Ссылка скопирована'); else if (typeof glassToast === 'function') glassToast('Ссылка скопирована', { kind: 'success' });
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
      const text = encodeURIComponent('Заказываю вещи из Китая через ICE LOGIX: оригиналы, доставка в Беларусь. По моей ссылке тебе 3% кэшбэка на первый заказ:');
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
