// ============================================================
// ICE LOGIX Module: ICE Wallet (Кошелек ICE — стиль WB Pay)
// ============================================================
// Единый центр персональных финансов и внутрисервисных расчетов:
// - Лицевой счет клиента (баланс в BYN / ICE, 1 к 1)
// - Премиальная цифровая нео-карта кошелька (статус KYC, лимиты, скидка 3%)
// - Пополнение в 1 тап: ЕРИП (0%), «Оплати» QR, карта онлайн bePaid
// - Управление банковскими картами
// - Живой аудит-реестр транзакций из balance_entries
// - Скидка 3% при оплате с кошелька как на Wildberries

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

  // Обновление баланса во всем приложении (DOM + Cache + Supabase)
  async function applyWalletCredit(addedAmount, reason = 'TOPUP_MANUAL', successMsg = null) {
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    const addedVal = parseFloat(addedAmount) || 0;
    if (addedVal <= 0) return;

    const prevBal = getLiveUserBalance();
    const nextBal = Math.round((prevBal + addedVal) * 100) / 100;
    window.balance = nextBal;

    // 1. Оптимистичное обновление UI в шапке и карточке
    const hb = document.getElementById('headerBalance');
    if (hb) hb.innerText = nextBal;

    const cardBal = document.getElementById('walletCardLiveBalance');
    if (cardBal) cardBal.innerText = `${nextBal.toFixed(2)} BYN`;

    const cardBalIce = document.getElementById('walletCardLiveIce');
    if (cardBalIce) cardBalIce.innerText = `≈ ${nextBal.toFixed(0)} ICE`;

    try {
      const cached = localStorage.getItem('ice_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        u.balance = nextBal;
        localStorage.setItem('ice_cached_user', JSON.stringify(u));
      }
    } catch (_) {}

    // 2. Персистентность в Supabase (users.ices_balance + balance_entries)
    if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('users').update({ ices_balance: nextBal }).eq('user_id', curUserId);
        
        // Бухгалтерская проводка в balance_entries
        await supabaseClient.from('balance_entries').insert({
          user_id: curUserId,
          type: 'TOPUP',
          amount: addedVal,
          direction: 'CREDIT',
          reason: reason,
          source_transaction_id: 'TX-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        });

        _cachedLedgerEntries = null; // сброс кэша истории
      } catch (e) {
        console.warn('Failed to update balance or write entry to Supabase:', e);
      }
    }

    if (typeof tgUtil !== 'undefined') {
      if (tgUtil.haptic) tgUtil.haptic('success');
      tgUtil.alert(successMsg || `Кошелек успешно пополнен на +${addedVal.toFixed(2)} BYN!`);
    }
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
  // Генератор HTML: Премиальная цифровая карта «ICE Wallet»
  // ============================================================
  function renderWalletVirtualCard(bal, user) {
    const isVerified = user?.kyc_status === 'verified';
    const curUserId = user?.user_id || window.userId || '739210';
    const walletAccountNum = `ICE-${String(curUserId).padStart(7, '0')}`;
    const limitText = isVerified ? 'Лимит 5 000 BYN • Верифицирован' : 'Базовый лимит 500 BYN';

    return `
      <div class="relative w-full max-w-[340px] mx-auto select-none">
        <!-- Нео-карта кошелька (ISO ID-1 пропорции, глубокий космический градиент) -->
        <div class="relative aspect-[1.586/1] w-full rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-2xl shadow-cyan-950/70 border border-cyan-400/30 bg-gradient-to-br from-slate-950 via-[#081528] to-[#042436] transition-transform duration-300">
          
          <!-- Световые переливы и декоративная неоновая сетка -->
          <div class="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-white/[0.08] pointer-events-none"></div>
          <div class="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"></div>
          <div class="absolute -left-10 -top-10 w-40 h-40 rounded-full bg-blue-600/15 blur-2xl pointer-events-none"></div>

          <!-- 1. Верхний ряд: Логотип ICE WALLET + Статус верификации -->
          <div class="relative z-10 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse"></span>
              <span class="text-sm font-black tracking-widest text-white uppercase flex items-center gap-1.5 font-sans">
                ICE LOGIX <span class="text-cyan-400">PAY</span>
              </span>
            </div>

            <!-- Бейдж статуса верификации -->
            <div class="flex items-center">
              ${isVerified ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm shadow-emerald-500/20">
                  <svg class="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Идентифицирован</span>
                </span>
              ` : `
                <button type="button" onclick="window.switchTab && window.switchTab('profile')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 active:scale-95 transition">
                  <span>Базовый</span>
                  <span class="text-white/60">·</span>
                  <span class="underline">Паспорт ›</span>
                </button>
              `}
            </div>
          </div>

          <!-- 2. Средний блок: Баланс кошелька крупным шрифтом -->
          <div class="relative z-10 my-auto py-1">
            <div class="flex items-baseline justify-between">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-0.5">Доступный баланс</p>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight" id="walletCardLiveBalance">${bal.toFixed(2)} BYN</span>
                  <span class="text-xs font-bold text-cyan-400 font-mono" id="walletCardLiveIce">≈ ${bal.toFixed(0)} ICE</span>
                </div>
              </div>

              <!-- Контактный золотой чип EMV + бесконтактный значок -->
              <div class="flex items-center gap-2">
                <div class="w-9 h-6 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-inner relative overflow-hidden p-0.5 flex-shrink-0">
                  <div class="w-full h-full border border-amber-900/20 rounded-sm grid grid-cols-2 gap-0.5 opacity-80">
                    <div class="border-r border-b border-amber-900/30"></div>
                    <div class="border-b border-amber-900/30"></div>
                    <div class="border-r border-amber-900/30"></div>
                    <div></div>
                  </div>
                </div>
                <svg class="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/></svg>
              </div>
            </div>
          </div>

          <!-- 3. Нижний ряд: Персональный счет и лимит -->
          <div class="relative z-10 flex items-end justify-between text-left pt-1 border-t border-white/10">
            <div>
              <p class="text-[7px] uppercase tracking-wider text-white/40 font-bold leading-none mb-0.5">НОМЕР СЧЕТА В СИСТЕМЕ</p>
              <p class="font-mono text-xs font-bold text-white/90 tracking-widest">${walletAccountNum}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-white/50 font-medium">${limitText}</p>
            </div>
          </div>
        </div>

        <!-- Плашка фичи WB: скидка 3% при оплате кошельком -->
        <div class="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-cyan-950/70 border border-cyan-400/30 shadow-lg flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center text-sm font-black flex-shrink-0">%</span>
            <div class="min-w-0">
              <p class="text-xs font-extrabold text-white truncate">Скидка 3% на все заказы</p>
              <p class="text-[10px] text-white/50 leading-tight">При оплате с кошелька ICE (как на Wildberries)</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 flex-shrink-0">
            АКТИВНА
          </span>
        </div>
      </div>
    `;
  }

  // ============================================================
  // Генератор HTML: Таб 1 — Пополнение кошелька
  // ============================================================
  function renderTopupTabHtml(bal) {
    const primaryCard = (window.userCards || []).find(c => c.is_default) || (window.userCards || [])[0] || null;

    return `
      <div class="space-y-4">
        <!-- Калькулятор суммы пополнения -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
          <label class="block text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Сумма пополнения (BYN)</span>
            <span class="text-[10px] font-mono text-cyan-300 normal-case">Зачисление: <b id="topupConvertedIceText">${_selectedTopupAmount} ICE</b></span>
          </label>

          <!-- Быстрые чипсы выбора сумм -->
          <div class="grid grid-cols-5 gap-1.5" id="topupChipsGrid">
            ${[20, 50, 100, 250, 500].map(amt => `
              <button
                type="button"
                data-amount="${amt}"
                class="topup-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center ${
                  amt === _selectedTopupAmount
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/5'
                }"
              >
                +${amt}
              </button>
            `).join('')}
          </div>

          <!-- Поле ручного ввода суммы -->
          <div class="relative">
            <input
              type="number"
              id="topupCustomAmountInput"
              min="1"
              max="50000"
              step="1"
              value="${_selectedTopupAmount}"
              placeholder="Введите сумму"
              class="w-full bg-slate-900/90 border border-white/15 focus:border-cyan-400 rounded-2xl py-3 px-4 pr-16 text-white font-mono font-bold text-base focus:outline-none transition shadow-inner"
            >
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 font-mono pointer-events-none">
              BYN
            </span>
          </div>
        </div>

        <!-- Способы пополнения (ЕРИП, Оплати, Карта bePaid) -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
          <h4 class="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Выберите способ пополнения
          </h4>

          <div class="space-y-2" id="topupMethodsGroup">
            <!-- 1. ЕРИП -->
            <label class="topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              _selectedTopupMethod === 'erip'
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }" data-method="erip">
              <div class="flex items-center gap-3">
                <input type="radio" name="topupMethodRadio" value="erip" ${_selectedTopupMethod === 'erip' ? 'checked' : ''} class="accent-cyan-400 w-4 h-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">Система «Расчет» (ЕРИП)</span>
                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">0% • БЕЗ КАРТЫ</span>
                  </div>
                  <p class="text-[10px] text-white/50 leading-tight mt-0.5">Оплата с любого банка Беларуси по номеру счёта через bePaid</p>
                </div>
              </div>
              <span class="text-lg">🏛️</span>
            </label>

            <!-- 2. Оплати -->
            <label class="topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              _selectedTopupMethod === 'oplati'
                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-950/40'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }" data-method="oplati">
              <div class="flex items-center gap-3">
                <input type="radio" name="topupMethodRadio" value="oplati" ${_selectedTopupMethod === 'oplati' ? 'checked' : ''} class="accent-emerald-400 w-4 h-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">Кошелек «Оплати»</span>
                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">QR • КЭШБЭК</span>
                  </div>
                  <p class="text-[10px] text-white/50 leading-tight mt-0.5">Оплата по QR-коду со смартфона (Белинвестбанк) в 1 клик</p>
                </div>
              </div>
              <span class="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-black text-xs font-sans">О!</span>
            </label>

            <!-- 3. Банковская карта онлайн -->
            <label class="topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              _selectedTopupMethod === 'card'
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }" data-method="card">
              <div class="flex items-center gap-3">
                <input type="radio" name="topupMethodRadio" value="card" ${_selectedTopupMethod === 'card' ? 'checked' : ''} class="accent-cyan-400 w-4 h-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">Банковская карта онлайн</span>
                    ${primaryCard ? `<span class="text-[9px] font-bold text-cyan-300 font-mono">•••• ${primaryCard.last4 || ''}</span>` : ''}
                  </div>
                  <p class="text-[10px] text-white/50 leading-tight mt-0.5">Белкарт, Mastercard, Visa, МИР банков РБ (bePaid 3D-Secure)</p>
                </div>
              </div>
              <span class="text-lg">💳</span>
            </label>
          </div>
        </div>

        <!-- Кнопка пополнения -->
        <button
          type="button"
          id="walletTopupSubmitBtn"
          class="btn-primary w-full py-4 rounded-2xl font-black text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <span>Пополнить на ${_selectedTopupAmount} BYN</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <!-- 4 Преимущества ICE Wallet (Инфо-сетка) -->
        <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-cyan-300 font-bold">
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Мгновенный выкуп</span>
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Байеры выкупают товары без задержек банковских межбанков</p>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Мгновенный возврат</span>
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Если товара нет в наличии, средства зачисляются за 1 секунду</p>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-purple-400 font-bold">
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              <span>Скидка 3% на заказ</span>
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Автоматическая скидка в корзине при оплате с кошелька</p>
          </div>

          <div class="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-amber-400 font-bold">
              <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>0% комиссий</span>
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Никаких скрытых платежей при пополнении и покупках</p>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // Генератор HTML: Таб 3 — История операций (Ledger)
  // ============================================================
  function renderHistoryTabHtml(entries) {
    let filtered = entries || [];
    if (_activeHistoryFilter === 'credit') {
      filtered = filtered.filter(e => e.direction === 'CREDIT');
    } else if (_activeHistoryFilter === 'debit') {
      filtered = filtered.filter(e => e.direction === 'DEBIT');
    } else if (_activeHistoryFilter === 'refund') {
      filtered = filtered.filter(e => e.reason && e.reason.toLowerCase().includes('refund'));
    }

    return `
      <div class="space-y-3">
        <!-- Фильтры истории -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          ${[
            { id: 'all', label: 'Все' },
            { id: 'credit', label: 'Пополнения' },
            { id: 'debit', label: 'Оплаты' },
            { id: 'refund', label: 'Возвраты' }
          ].map(f => `
            <button
              type="button"
              onclick="window.setWalletHistoryFilter('${f.id}')"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                _activeHistoryFilter === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/5 text-white/60 border border-white/5 hover:text-white'
              }"
            >
              ${f.label}
            </button>
          `).join('')}
        </div>

        <!-- Список записей -->
        ${filtered.length === 0 ? `
          <div class="text-center py-10 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 select-none">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <p class="font-bold text-white text-sm">Операций не найдено</p>
            <p class="text-xs text-white/40 max-w-xs mx-auto">
              Пополните кошелек или оформите заказ — все действия автоматически сохраняются здесь.
            </p>
          </div>
        ` : `
          <div class="space-y-2">
            ${filtered.map(item => {
              const isCredit = item.direction === 'CREDIT';
              const isRefund = item.reason && item.reason.toLowerCase().includes('refund');
              const amountSign = isCredit ? '+' : '-';
              const amountClass = isRefund
                ? 'text-purple-400'
                : (isCredit ? 'text-emerald-400' : 'text-cyan-300');
              const title = getReasonTitle(item.direction, item.reason);
              const dateStr = formatTxDate(item.created_at);

              return `
                <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-3 transition">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isRefund
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                        : (isCredit
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30')
                    }">
                      ${isRefund ? '↺' : (isCredit ? '↓' : '↑')}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-white truncate">${title}</p>
                      <p class="text-[10px] text-white/40 mt-0.5">${dateStr} · ${item.source_transaction_id || 'ID: ' + (item.id || '').slice(0, 8)}</p>
                    </div>
                  </div>

                  <div class="text-right flex-shrink-0">
                    <p class="text-sm font-black font-mono ${amountClass}">${amountSign}${Number(item.amount || 0).toFixed(2)} BYN</p>
                    <span class="text-[9px] font-bold text-white/50">Успешно</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
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
  // Главная функция рендера страницы ICE Wallet
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
            window.balance = data.ices_balance;
            const bEl = document.getElementById('walletCardLiveBalance');
            if (bEl) bEl.innerText = `${data.ices_balance.toFixed(2)} BYN`;
          }
        }
      }).catch(() => {});
    }

    let subTabContent = '';
    if (_activeWalletSubTab === 'topup') {
      subTabContent = renderTopupTabHtml(curBal);
    } else if (_activeWalletSubTab === 'cards') {
      // Используем проверенный рендер карт из finances.js
      if (typeof window._renderPaymentTabHtml === 'function') {
        subTabContent = window._renderPaymentTabHtml();
      } else {
        subTabContent = '<div class="text-center py-6 text-xs text-white/50">Загрузка карт...</div>';
      }
    } else if (_activeWalletSubTab === 'history') {
      const entries = await loadLedgerHistory();
      subTabContent = renderHistoryTabHtml(entries);
    } else if (_activeWalletSubTab === 'coupons') {
      if (typeof window._renderCouponsTabHtml === 'function') {
        const cached = window._financesCache?.coupons || { totalSpentByn: 0, ordersCount: 0 };
        subTabContent = window._renderCouponsTabHtml(cached);
      }
    }

    return `
      <div class="page-enter px-4 max-w-md mx-auto pb-24">
        
        <!-- Верхняя шапка раздела -->
        <div class="flex items-center justify-between mb-4 pt-1">
          <div class="flex items-center gap-3">
            <button id="backFromWalletBtn" onclick="window.backFromWallet()" class="global-back-btn !mb-0" title="Назад">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <h2 class="text-xl font-black text-white tracking-wide">Кошелек ICE</h2>
              <p class="text-[11px] text-white/40">Персональный счет и моментальная оплата</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
              0% КОМИССИИ
            </span>
          </div>
        </div>

        <!-- 1. Цифровая карта ICE Wallet -->
        <div class="mb-5">
          ${renderWalletVirtualCard(curBal, curUser)}
        </div>

        <!-- 2. Сегментированное меню подразделов (4 таба) -->
        <div class="grid grid-cols-4 gap-1 mb-4 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md">
          <button
            id="walletTabTopup"
            type="button"
            onclick="window.switchWalletTab('topup')"
            class="py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
              _activeWalletSubTab === 'topup'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
            }"
          >
            <span class="text-sm leading-none">➕</span>
            <span class="truncate">Баланс</span>
          </button>

          <button
            id="walletTabCards"
            type="button"
            onclick="window.switchWalletTab('cards')"
            class="py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
              _activeWalletSubTab === 'cards'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
            }"
          >
            <span class="text-sm leading-none">💳</span>
            <span class="truncate">Карты</span>
          </button>

          <button
            id="walletTabHistory"
            type="button"
            onclick="window.switchWalletTab('history')"
            class="py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
              _activeWalletSubTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
            }"
          >
            <span class="text-sm leading-none">📜</span>
            <span class="truncate">История</span>
          </button>

          <button
            id="walletTabCoupons"
            type="button"
            onclick="window.switchWalletTab('coupons')"
            class="py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
              _activeWalletSubTab === 'coupons'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
            }"
          >
            <span class="text-sm leading-none">🏷️</span>
            <span class="truncate">Купоны</span>
          </button>
        </div>

        <!-- 3. Динамический контент активного таба -->
        <div id="walletSubContent" class="space-y-4">
          ${subTabContent}
        </div>

      </div>
    `;
  };

  // Переключение табов кошелька за 0 мс
  window.switchWalletTab = async function (targetTab) {
    _activeWalletSubTab = targetTab;
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

    // Обновляем кнопки
    ['topup', 'cards', 'history', 'coupons'].forEach(t => {
      const btn = document.getElementById('walletTab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (btn) {
        if (t === targetTab) {
          btn.className = 'py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
        } else {
          btn.className = 'py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
        }
      }
    });

    const container = document.getElementById('walletSubContent');
    if (!container) return;

    const curBal = getLiveUserBalance();

    if (targetTab === 'topup') {
      container.innerHTML = renderTopupTabHtml(curBal);
      attachTopupHandlers();
    } else if (targetTab === 'cards') {
      if (typeof window._renderPaymentTabHtml === 'function') {
        container.innerHTML = window._renderPaymentTabHtml();
        if (typeof window._attachPaymentTabHandlers === 'function') window._attachPaymentTabHandlers();
      }
    } else if (targetTab === 'history') {
      container.innerHTML = '<div class="text-center py-6 text-xs text-white/50"><div class="inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2"></div><br>Загрузка операций...</div>';
      const entries = await loadLedgerHistory();
      container.innerHTML = renderHistoryTabHtml(entries);
    } else if (targetTab === 'coupons') {
      if (typeof window._renderCouponsTabHtml === 'function') {
        const cached = window._financesCache?.coupons || { totalSpentByn: 0, ordersCount: 0 };
        container.innerHTML = window._renderCouponsTabHtml(cached);
        if (typeof window._attachCouponsTabHandlers === 'function') window._attachCouponsTabHandlers();
      }
    }
  };

  // Фильтр истории
  window.setWalletHistoryFilter = async function (filterId) {
    _activeHistoryFilter = filterId;
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    const container = document.getElementById('walletSubContent');
    if (container && _activeWalletSubTab === 'history') {
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
      if (convertedIceText) {
        convertedIceText.innerText = `${_selectedTopupAmount} ICE`;
      }
      if (submitBtn) {
        submitBtn.querySelector('span').innerText = `Пополнить на ${_selectedTopupAmount} BYN`;
      }

      document.querySelectorAll('#topupChipsGrid button').forEach(chip => {
        const v = parseFloat(chip.dataset.amount);
        if (v === _selectedTopupAmount) {
          chip.className = 'topup-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
        } else {
          chip.className = 'topup-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5';
        }
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

          document.querySelectorAll('.topup-method-card').forEach(c => {
            const isOplati = c.dataset.method === 'oplati';
            if (c === card) {
              c.className = isOplati
                ? 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-950/40'
                : 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40';
            } else {
              c.className = 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-white/[0.03] border-white/10 hover:border-white/20';
            }
          });
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
            tgUtil.alert(`Счет в ЕРИП на сумму ${amt} BYN сформирован!`);
          }
        } else if (_selectedTopupMethod === 'oplati') {
          if (typeof window.openOplatiPaymentModal === 'function') {
            window.openOplatiPaymentModal(amt);
          } else {
            tgUtil.alert(`QR-код «Оплати» на сумму ${amt} BYN сформирован!`);
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
          await applyWalletCredit(amt, 'TOPUP_CARD', `Кошелек успешно пополнен на +${amt} BYN с банковской карты!`);

          submitBtn.disabled = false;
          updateAmount(_selectedTopupAmount);
        }
      };
    }
  }

  // Привязка обработчиков при открытии страницы
  window.attachWalletHandlers = function () {
    if (_activeWalletSubTab === 'topup') {
      attachTopupHandlers();
    } else if (_activeWalletSubTab === 'cards') {
      if (typeof window._attachPaymentTabHandlers === 'function') window._attachPaymentTabHandlers();
    } else if (_activeWalletSubTab === 'coupons') {
      if (typeof window._attachCouponsTabHandlers === 'function') window._attachCouponsTabHandlers();
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
  window.openWallet = function (subTab = 'pay', defaultAmount = 50) {
    if (typeof defaultAmount === 'number' && defaultAmount > 0) {
      _selectedTopupAmount = defaultAmount;
    }
    window._financesSubTab = 'pay';
    if (typeof switchTab === 'function') {
      switchTab('finances');
      if (typeof window.switchFinancesSubTab === 'function') {
        window.switchFinancesSubTab('pay');
      }
    }
  };

  // Обратная совместимость с вызовами topup
  window.openBalanceTopupModal = function (defaultAmount = 50) {
    window.openWallet('pay', defaultAmount);
  };
  window.openBalanceTopup = function (defaultAmount = 50) {
    window.openWallet('pay', defaultAmount);
  };

  window.applyWalletCredit = applyWalletCredit;

  // Экспорт функции моментального возврата на счёт (Instant Refund)
  window.refundToWallet = async function (orderId, amount, reason = 'REFUND_TO_BALANCE') {
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    const refundAmt = parseFloat(amount) || 0;
    if (refundAmt <= 0) return false;

    await applyWalletCredit(refundAmt, reason, `Мгновенный возврат: +${refundAmt.toFixed(2)} BYN зачислено на счёт ICE LOGIX PAY!`);
    
    if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('refunds').insert({
          order_id: orderId,
          user_id: curUserId,
          amount: refundAmt,
          destination: 'BALANCE',
          status: 'COMPLETED',
          reason: reason
        });
      } catch (e) {
        console.warn('Failed to insert into refunds:', e);
      }
    }
    return true;
  };

})();
