// ============================================================
// ICE LOGIX Module: ICE Wallet (Кошелек ICE — стиль WB Pay)
// ============================================================
// Единый центр персональных финансов и внутрисервисных расчетов:
// - Лицевой счет клиента (баланс в BYN / ICE, 1 к 1)
// - Премиальная цифровая нео-карта кошелька (статус KYC, лимиты)
// - Пополнение в 1 тап: ЕРИП (0%), «Оплати» QR, карта онлайн bePaid
// - Управление банковскими картами
// - Живой аудит-реестр транзакций из balance_entries

(function () {
  'use strict';

  let _activeWalletSubTab = 'topup'; // 'topup' | 'cards' | 'history' | 'coupons'
  let _selectedTopupAmount = 50;
  let _selectedTopupMethod = 'erip'; // 'erip' | 'oplati' | 'card'
  let _cachedLedgerEntries = null;
  let _activeHistoryFilter = 'all'; // 'all' | 'credit' | 'debit' | 'refund'

  // Синхронное безопасное получение баланса пользователя
  function getLiveUserBalance() {
    if (typeof window.balance === 'number' && !isNaN(window.balance)) {
      return window.balance;
    }
    const hb = document.getElementById('headerBalance');
    if (hb && hb.innerText && !isNaN(parseFloat(hb.innerText))) {
      const parsed = parseFloat(hb.innerText);
      window.balance = parsed;
      return parsed;
    }
    try {
      const cached = localStorage.getItem('ice_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u && typeof u.balance === 'number') {
          window.balance = u.balance;
          return u.balance;
        }
      }
    } catch (_) {}
    return 0;
  }

  // Пополнение: приложение только создаёт заявку (request_topup). Деньги зачисляет сервер,
  // когда оплату подтвердит платёжная система или админ. reason/successMsg оставлены для старых вызовов.
  async function applyWalletCredit(addedAmount, reason = 'TOPUP_MANUAL', successMsg = null) {
    const addedVal = Math.round((parseFloat(addedAmount) || 0) * 100) / 100;
    if (addedVal <= 0) return false;
    if (!String(reason).startsWith('TOPUP')) {
      console.warn('applyWalletCredit: начислять деньги из приложения нельзя, причина', reason);
      return false;
    }
    const method = reason === 'TOPUP_CARD' ? 'card' : reason === 'TOPUP_ERIP' ? 'erip' : reason === 'TOPUP_OPLATI' ? 'oplati' : 'manual';
    const res = await window.IcePay.topup(addedVal, method);
    _cachedLedgerEntries = null;
    return Boolean(res && res.ok);
  }

  // Форматирование даты транзакций
  function formatTxDate(isoStr) {
    if (!isoStr) return 'Только что';
    try {
      const d = new Date(isoStr);
      const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month}, ${hours}:${mins}`;
    } catch (_) {
      return 'Недавно';
    }
  }

  // Человекочитаемое описание причин в истории
  function getReasonTitle(direction, reason) {
    if (direction === 'CREDIT') {
      if (reason === 'REFUND_TO_BALANCE' || reason === 'REFUND') return 'Мгновенный возврат средств';
      if (reason === 'REFERRAL_BONUS') return 'Бонус за друга (Рефералка)';
      if (reason === 'DELIVERY_SURPLUS') return 'Сдача от пересчета веса';
      if (reason === 'PRICE_DROP') return 'Компенсация снижения цены';
      if (reason === 'TOPUP_ERIP') return 'Пополнение через ЕРИП';
      if (reason === 'TOPUP_OPLATI') return 'Пополнение через «Оплати»';
      if (reason === 'TOPUP_CARD') return 'Пополнение с банковской карты';
      return 'Пополнение кошелька';
    } else {
      if (reason === 'USED_FOR_ORDER') return 'Оплата заказа товаров';
      if (reason === 'SECOND_STAGE_PAY') return 'Оплата международной доставки';
      return 'Списание с кошелька';
    }
  }

  // ============================================================
  // Карта кошелька: объёмная карточка с бликом (наклон от пальца — в attachWalletHandlers)
  // ============================================================
  function renderWalletVirtualCard(bal, user) {
    const U = window.UI;
    const isVerified = user?.kyc_status === 'verified';
    const curUserId = user?.user_id || window.userId || '';
    const walletAccountNum = `ICE-${String(curUserId).padStart(7, '0')}`;
    return `
      <div class="wl-card-wrap" id="walletCard3d">
        <div class="wl-card">
          <span class="wl-glow"></span><span class="wl-flake">${U.icon('snow', 150)}</span><span class="wl-sheen"></span>
          <div class="wl-card-top">
            <span class="wl-brand"><span class="wl-brand-mark">${U.icon('snow', 16)}</span>ICE LOGIX <b>PAY</b></span>
            ${isVerified
              ? `<span class="wl-kyc ok">${U.icon('checkCircle', 13)}Данные подтверждены</span>`
              : `<button type="button" class="wl-kyc" onclick="window.switchTab && window.switchTab('kyc')">${U.icon('idcard', 13)}Лимит 500 · поднять</button>`}
          </div>
          <div class="wl-card-mid">
            <span class="wl-cap">Баланс</span>
            <span class="wl-bal" id="walletCardLiveBalance">${U.money(bal, { keepCents: true, digits: 2 })}</span>
          </div>
          <div class="wl-card-bot">
            <span class="wl-acc">${walletAccountNum}</span>
            <span class="wl-chip"><i></i><i></i><i></i><i></i></span>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // Пополнение: сумма, способ, кнопка
  // ============================================================
  function renderTopupTabHtml(bal) {
    const U = window.UI;
    const primaryCard = (window.userCards || []).find(c => c.is_default) || (window.userCards || [])[0] || null;
    const method = (id, icon, title, text, tag) => `
      <label class="topup-method-card wl-method ${_selectedTopupMethod === id ? 'on' : ''}" data-method="${id}">
        <input type="radio" name="topupMethodRadio" value="${id}" ${_selectedTopupMethod === id ? 'checked' : ''} class="wl-radio-input">
        <span class="wl-method-ico">${icon}</span>
        <span class="wl-method-body"><span class="wl-method-title">${title}${tag ? `<em>${tag}</em>` : ''}</span><span class="wl-method-text">${text}</span></span>
        <span class="wl-radio"></span>
      </label>`;
    return `
      <section class="wl-block">
        <div class="wl-block-h"><h2>Пополнить</h2><span>без комиссии</span></div>
        <div class="wl-amount">
          <input type="number" id="topupCustomAmountInput" inputmode="decimal" min="1" max="50000" step="1" value="${_selectedTopupAmount}" placeholder="0" aria-label="Сумма пополнения">
          <span class="wl-amount-sign">${window.bynSign ? window.bynSign({ size: '1em' }) : ''}</span>
        </div>
        <div class="wl-chips" id="topupChipsGrid">
          ${[20, 50, 100, 250, 500].map(amt => `<button type="button" data-amount="${amt}" class="topup-amount-chip wl-amt ${amt === _selectedTopupAmount ? 'on' : ''}">+${amt}</button>`).join('')}
        </div>
        <span id="topupConvertedIceText" hidden>без комиссии 0%</span>
      </section>

      <section class="wl-block">
        <div class="wl-block-h"><h2>Способ оплаты</h2></div>
        <div class="wl-methods" id="topupMethodsGroup">
          ${method('erip', U.icon('receipt', 22), 'ЕРИП', 'Из интернет-банка любого банка Беларуси', 'без карты')}
          ${method('oplati', '<b class="wl-oplati">О!</b>', 'Оплати', 'QR-код в приложении банка, в один тап', 'QR')}
          ${method('card', U.icon('card', 22), 'Банковская карта', primaryCard ? `Карта •••• ${U.esc(primaryCard.last4 || '')}` : 'Белкарт, Visa, Mastercard, МИР', '')}
        </div>
      </section>

      <button type="button" id="walletTopupSubmitBtn" class="rd-btn rd-btn-block wl-submit">
        <span>Пополнить на ${_selectedTopupAmount} ${window.bynSign ? window.bynSign({ color: 'white' }) : ''}</span>
        ${U.icon('arrowR', 18)}
      </button>

      <div class="wl-feats">
        <div class="wl-feat"><span>${U.icon('zap', 18)}</span><b>Быстрый выкуп</b><p>Байер покупает вещь сразу, без ожидания перевода</p></div>
        <div class="wl-feat"><span>${U.icon('refresh', 18)}</span><b>Возврат за минуту</b><p>Если вещи нет, деньги сразу вернутся на счёт</p></div>
        <div class="wl-feat"><span>${U.icon('users', 18)}</span><b>7% за друзей</b><p>Бонусы за приглашённых падают прямо сюда</p></div>
        <div class="wl-feat"><span>${U.icon('shield', 18)}</span><b>0% комиссии</b><p>Ни при пополнении, ни при оплате заказов</p></div>
      </div>
    `;
  }

  // ============================================================
  // История операций по счёту
  // ============================================================
  function renderHistoryTabHtml(entries) {
    const U = window.UI;
    let filtered = entries || [];
    if (_activeHistoryFilter === 'credit') {
      filtered = filtered.filter(e => e.direction === 'CREDIT');
    } else if (_activeHistoryFilter === 'debit') {
      filtered = filtered.filter(e => e.direction === 'DEBIT');
    } else if (_activeHistoryFilter === 'refund') {
      filtered = filtered.filter(e => e.reason && e.reason.toLowerCase().includes('refund'));
    }
    const chips = [
      { id: 'all', label: 'Все' },
      { id: 'credit', label: 'Пополнения' },
      { id: 'debit', label: 'Оплаты' },
      { id: 'refund', label: 'Возвраты' }
    ].map(f => `<button type="button" onclick="window.setWalletHistoryFilter('${f.id}')" class="rd-chip ${_activeHistoryFilter === f.id ? 'on' : ''}">${f.label}</button>`).join('');

    const list = filtered.length === 0
      ? U.empty({ icon: 'receipt', title: 'Операций пока нет', text: 'Пополнения, оплаты и возвраты будут появляться здесь.' })
      : `<div class="rd-card hs-txlist">${filtered.map(item => {
          const isCredit = item.direction === 'CREDIT';
          const isRefund = item.reason && item.reason.toLowerCase().includes('refund');
          return `
            <div class="hs-tx">
              <span class="hs-tx-ico ${isCredit ? 'in' : ''}">${U.icon(isRefund ? 'refresh' : (isCredit ? 'plus' : 'bag'), 20)}</span>
              <div class="hs-tx-body">
                <div class="hs-tx-title">${getReasonTitle(item.direction, item.reason)}</div>
                <div class="hs-tx-sub">${formatTxDate(item.created_at)}</div>
              </div>
              <span class="hs-tx-amt ${isCredit ? 'in' : ''}">${isCredit ? '+' : '−'}${U.money(Number(item.amount || 0), { keepCents: true, digits: 2 })}</span>
            </div>`;
        }).join('')}</div>`;

    return `<div class="rd-chips wl-hchips">${chips}</div>${list}`;
  }

  // Загрузка истории транзакций из Supabase
  async function loadLedgerHistory() {
    if (_cachedLedgerEntries) return _cachedLedgerEntries;
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (!curUserId || typeof supabaseClient === 'undefined' || !supabaseClient) {
      return [];
    }
    try {
      const { data, error } = await supabaseClient
        .from('balance_entries')
        .select('*')
        .eq('user_id', curUserId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && Array.isArray(data)) {
        _cachedLedgerEntries = data;
        return data;
      }
    } catch (e) {
      console.warn('Failed to fetch balance_entries:', e);
    }
    return [];
  }

  // ============================================================
  // Главная функция рендера страницы ICE LOGIX PAY (Лицевой счёт)
  // ============================================================
  window.renderWallet = async function () {
    const curBal = getLiveUserBalance();
    const curUser = {
      user_id: window.userId,
      kyc_status: window.userKycStatus || (localStorage.getItem('ice_kyc_status') || 'not_submitted')
    };

    // Фоновая подгрузка данных пользователя для актуального статуса
    if (window.userId && typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('users').select('ices_balance, kyc_status').eq('user_id', window.userId).maybeSingle().then(({ data }) => {
        if (data) {
          if (typeof data.ices_balance === 'number') {
            window.setUserBalance(data.ices_balance);
            const bEl = document.getElementById('walletCardLiveBalance');
            if (bEl) bEl.innerHTML = window.UI.money(data.ices_balance, { keepCents: true, digits: 2 });
          }
        }
      }).catch(() => {});
    }

    const entries = await loadLedgerHistory();

    const U = window.UI;
    return `
      <div class="rd-screen page-enter wl">
        <div class="rd-head">
          <button id="backFromWalletBtn" type="button" onclick="window.backFromWallet()" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Кошелёк</h1><p class="rd-head-sub">Счёт ICE LOGIX PAY для оплаты заказов</p></div>
        </div>
        ${renderWalletVirtualCard(curBal, curUser)}
        ${renderTopupTabHtml(curBal)}
        <div class="rd-section"><h2>Операции</h2><span class="wl-note">последние 30</span></div>
        <div id="walletHistoryContainer">
          ${renderHistoryTabHtml(entries)}
        </div>
      </div>
    `;
  };

  // Фильтр истории транзакций
  window.setWalletHistoryFilter = async function (filterId) {
    _activeHistoryFilter = filterId;
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    const container = document.getElementById('walletHistoryContainer');
    if (container) {
      const entries = await loadLedgerHistory();
      container.innerHTML = renderHistoryTabHtml(entries);
    }
  };

  // Обработчики таба пополнения
  function attachTopupHandlers() {
    const customInput = document.getElementById('topupCustomAmountInput');
    const submitBtn = document.getElementById('walletTopupSubmitBtn');
    const convertedIceText = document.getElementById('topupConvertedIceText');

    function updateAmount(val) {
      _selectedTopupAmount = Math.max(1, parseFloat(val) || 1);
      if (customInput && document.activeElement !== customInput) {
        customInput.value = _selectedTopupAmount;
      }
      if (submitBtn) {
        submitBtn.querySelector('span').innerHTML = `Пополнить на ${_selectedTopupAmount} ${window.bynSign ? window.bynSign({ color: 'white' }) : ''}`;
      }

      document.querySelectorAll('#topupChipsGrid button').forEach(chip => {
        chip.classList.toggle('on', parseFloat(chip.dataset.amount) === _selectedTopupAmount);
      });
    }

    document.querySelectorAll('#topupChipsGrid button').forEach(chip => {
      chip.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
        updateAmount(chip.dataset.amount);
      };
    });

    if (customInput) {
      customInput.oninput = () => {
        updateAmount(customInput.value);
      };
    }

    // Радиокнопки способов
    document.querySelectorAll('.topup-method-card').forEach(card => {
      card.onclick = () => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          _selectedTopupMethod = radio.value;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

          document.querySelectorAll('.topup-method-card').forEach(c => c.classList.toggle('on', c === card));
        }
      };
    });

    // Нажатие «Пополнить»
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const amt = _selectedTopupAmount;
        if (amt <= 0 || isNaN(amt)) {
          if (typeof tgUtil !== 'undefined') tgUtil.alert('Укажите корректную сумму пополнения.');
          return;
        }

        if (_selectedTopupMethod === 'erip') {
          if (typeof window.openEripPaymentModal === 'function') {
            window.openEripPaymentModal(amt);
          } else {
            tgUtil.alert(`Счет в ЕРИП на сумму ${amt} сформирован!`);
          }
        } else if (_selectedTopupMethod === 'oplati') {
          if (typeof window.openOplatiPaymentModal === 'function') {
            window.openOplatiPaymentModal(amt);
          } else {
            tgUtil.alert(`QR-код «Оплати» на сумму ${amt} сформирован!`);
          }
        } else if (_selectedTopupMethod === 'card') {
          const cards = Array.isArray(window.userCards) ? window.userCards : [];
          if (cards.length === 0) {
            if (typeof window.openAddCardModal === 'function') {
              window.openAddCardModal(() => {
                if (typeof tgUtil !== 'undefined') tgUtil.alert('Карта привязана! Повторите пополнение.');
              });
            } else {
              tgUtil.alert('Привяжите банковскую карту во вкладке «Карты».');
            }
            return;
          }

          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Авторизация bePaid...</span>
          `;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');

          await new Promise(r => setTimeout(r, 1200));
          await applyWalletCredit(amt, 'TOPUP_CARD', `Счёт ICE LOGIX PAY успешно пополнен на +${amt} с банковской карты!`);

          submitBtn.disabled = false;
          updateAmount(_selectedTopupAmount);
        }
      };
    }
  }

  // Привязка обработчиков при открытии страницы ICE LOGIX PAY
  window.attachWalletHandlers = function () {
    attachTopupHandlers();
    const wrap = document.getElementById('walletCard3d');
    if (wrap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const card = wrap.firstElementChild;
      const move = (x, y) => {
        const r = wrap.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (x - r.left) / r.width)) - 0.5;
        const py = Math.min(1, Math.max(0, (y - r.top) / r.height)) - 0.5;
        card.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 12}deg)`;
        card.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(py + 0.5) * 100}%`);
      };
      const reset = () => { card.style.transform = ''; };
      wrap.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
      wrap.addEventListener('pointerleave', reset);
      wrap.addEventListener('pointerup', reset);
      wrap.addEventListener('pointercancel', reset);
    }
  };

  // Навигация «Назад»
  window.backFromWallet = function () {
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
    if (window.previousTab && window.previousTab !== 'wallet' && window.previousTab !== 'finances' && window.previousTab !== 'topup') {
      if (typeof switchTab === 'function') switchTab(window.previousTab);
    } else {
      if (typeof switchTab === 'function') switchTab('profile');
    }
  };

  // Быстрый вызов открытия счета ICE LOGIX PAY из любой части приложения
  window.openWallet = function (subTab = 'topup', defaultAmount = 50) {
    if (typeof defaultAmount === 'number' && defaultAmount > 0) {
      _selectedTopupAmount = defaultAmount;
    }
    if (typeof switchTab === 'function') {
      switchTab('wallet');
    }
  };

  // Обратная совместимость с вызовами topup
  window.openBalanceTopupModal = function (defaultAmount = 50) {
    window.openWallet('topup', defaultAmount);
  };
  window.openBalanceTopup = function (defaultAmount = 50) {
    window.openWallet('topup', defaultAmount);
  };

  window.applyWalletCredit = applyWalletCredit;

  // Возврат на баланс делает только сервер (order_price_decision, админ). Оставлено для старых вызовов.
  window.refundToWallet = async function () {
    console.warn('refundToWallet: возврат из приложения отключён, его делает сервер');
    return false;
  };

})();
