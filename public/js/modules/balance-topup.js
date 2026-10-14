// ============================================================
// ICE LOGIX Module: Balance Top-Up & Currency Center
// ============================================================
// Встроенный экран пополнения баланса и информации о внутренней
// валюте ICE Coin (ICL). Рендерится строго внутри #content с
// сохранением единого шаблона: шапка (.app-header), нижнее меню
// (.bottom-bar) и футер (ensureGlobalFooter) остаются видимыми!
// Способы пополнения: ЕРИП, Оплати, Банковская карта онлайн bePaid.

(function() {
  'use strict';

  let _selectedTopupAmount = 50;
  let _selectedTopupMethod = 'erip'; // По умолчанию ЕРИП как самый выгодный и безопасный способ

  // Синхронное безопасное получение реального баланса
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
  async function applyTopupCredit(addedAmount, successMsg) {
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    const addedIce = parseFloat(addedAmount) || 0;
    if (addedIce <= 0) return;

    if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', curUserId).single();
        const newBal = (u?.ices_balance || 0) + addedIce;
        await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', curUserId);
      } catch (e) {
        console.warn('Failed to update ices_balance in Supabase:', e);
      }
    }

    const prevBal = getLiveUserBalance();
    const nextBal = prevBal + addedIce;
    window.balance = nextBal;

    const hb = document.getElementById('headerBalance');
    if (hb) hb.innerText = nextBal;

    const tb = document.getElementById('topupCurrentBalText');
    if (tb) tb.innerText = `${nextBal} ICE`;

    const tbByn = document.getElementById('topupCurrentBalByn');
    if (tbByn) tbByn.innerText = `(~${nextBal} BYN)`;

    try {
      const cached = localStorage.getItem('ice_cached_user');
      if (cached) {
        const u = JSON.parse(cached);
        u.balance = nextBal;
        localStorage.setItem('ice_cached_user', JSON.stringify(u));
      }
    } catch (_) {}

    if (typeof tgUtil !== 'undefined') {
      if (tgUtil.haptic) tgUtil.haptic('success');
      tgUtil.alert(successMsg || `Баланс успешно пополнен на +${addedIce} ICE!`);
    }
  }

  // Генератор реалистичного SVG QR-кода для сервиса «Оплати»
  function generateOplatiQrSvg(amount, invoiceId) {
    return `
      <svg class="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" rx="16" fill="white"/>
        <!-- Угловые позиционеры QR -->
        <rect x="16" y="16" width="48" height="48" rx="8" fill="black"/>
        <rect x="24" y="24" width="32" height="32" rx="4" fill="white"/>
        <rect x="32" y="32" width="16" height="16" rx="2" fill="#059669"/>

        <rect x="136" y="16" width="48" height="48" rx="8" fill="black"/>
        <rect x="144" y="24" width="32" height="32" rx="4" fill="white"/>
        <rect x="152" y="32" width="16" height="16" rx="2" fill="#059669"/>

        <rect x="16" y="136" width="48" height="48" rx="8" fill="black"/>
        <rect x="24" y="144" width="32" height="32" rx="4" fill="white"/>
        <rect x="32" y="152" width="16" height="16" rx="2" fill="#059669"/>

        <!-- Псевдо-мозаика данных QR -->
        <rect x="76" y="20" width="8" height="8" fill="black"/>
        <rect x="92" y="20" width="12" height="8" fill="black"/>
        <rect x="112" y="20" width="8" height="8" fill="black"/>
        <rect x="80" y="36" width="12" height="8" fill="black"/>
        <rect x="100" y="36" width="16" height="8" fill="black"/>
        <rect x="76" y="52" width="8" height="12" fill="black"/>
        <rect x="96" y="52" width="8" height="8" fill="black"/>
        <rect x="116" y="52" width="8" height="12" fill="black"/>

        <rect x="20" y="76" width="8" height="12" fill="black"/>
        <rect x="36" y="80" width="12" height="8" fill="black"/>
        <rect x="56" y="76" width="8" height="12" fill="black"/>
        <rect x="76" y="76" width="12" height="8" fill="black"/>
        <rect x="100" y="80" width="8" height="8" fill="black"/>
        <rect x="120" y="76" width="8" height="12" fill="black"/>
        <rect x="140" y="80" width="12" height="8" fill="black"/>
        <rect x="168" y="76" width="12" height="8" fill="black"/>

        <rect x="20" y="100" width="12" height="8" fill="black"/>
        <rect x="44" y="96" width="8" height="12" fill="black"/>
        <rect x="64" y="100" width="8" height="8" fill="black"/>
        <rect x="136" y="100" width="16" height="8" fill="black"/>
        <rect x="164" y="96" width="8" height="12" fill="black"/>

        <rect x="76" y="140" width="12" height="8" fill="black"/>
        <rect x="96" y="136" width="8" height="12" fill="black"/>
        <rect x="116" y="140" width="8" height="8" fill="black"/>
        <rect x="140" y="140" width="12" height="8" fill="black"/>
        <rect x="80" y="160" width="8" height="8" fill="black"/>
        <rect x="104" y="156" width="12" height="12" fill="black"/>
        <rect x="128" y="160" width="8" height="8" fill="black"/>
        <rect x="148" y="160" width="16" height="8" fill="black"/>

        <!-- Центр с логотипом Оплати -->
        <rect x="80" y="80" width="40" height="40" rx="8" fill="#10B981" stroke="white" stroke-width="3"/>
        <text x="100" y="104" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="white" text-anchor="middle">О!</text>
      </svg>
    `;
  }

  // ============================================================
  // Интерактивное всплывающее окно подтверждения ЕРИП (Рабочая заглушка)
  // ============================================================
  window.openEripPaymentModal = function(amount, orderContext = null, onComplete = null) {
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

    const amountVal = parseFloat(amount) || 50;
    const invoiceNum = orderContext?.order_id || ('ICE-' + Math.floor(100000 + Math.random() * 900000));
    const isOrder = Boolean(orderContext);

    const eripModal = document.createElement('div');
    eripModal.className = 'full-screen-modal-overlay page-enter';
    eripModal.id = 'eripPaymentModal';

    eripModal.innerHTML = `
      <div class="full-screen-modal-header">
        <button id="closeEripModalBtn" type="button" class="global-back-btn">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
          <span>Назад</span>
        </button>
        <div class="text-center font-bold text-sm text-white flex items-center justify-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Оплата через ЕРИП</span>
        </div>
        <div style="width: 48px;"></div>
      </div>

      <div class="full-screen-modal-body space-y-4 max-w-md mx-auto">
        <!-- Карточка счета ЕРИП -->
        <div class="glass-card p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-850 to-cyan-950/40 shadow-2xl relative overflow-hidden text-center space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Система «Расчет» (ЕРИП) • bePaid</span>
          </div>

          <div>
            <p class="text-xs text-white/50">Сумма к оплате</p>
            <p class="text-3xl font-black text-white font-mono tracking-tight">${amountVal.toFixed(2)} <span class="text-cyan-400 text-lg">BYN</span></p>
            <p class="text-[11px] text-emerald-400 font-semibold mt-0.5">Комиссия 0% • Оплата без ввода данных карты</p>
          </div>

          <!-- Поле с номером счета для копирования -->
          <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
            <span class="text-[10px] uppercase font-bold text-white/40 tracking-wider block">Номер счёта / заказа в ЕРИП:</span>
            <div class="flex items-center justify-between gap-2">
              <span class="text-lg font-mono font-bold text-cyan-300 tracking-wider" id="eripInvoiceNum">${invoiceNum}</span>
              <button
                type="button"
                id="copyEripInvoiceBtn"
                class="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold transition active:scale-95 flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Копировать</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Пошаговое дерево ЕРИП -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
          <h4 class="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Как оплатить в приложении любого банка РБ:
          </h4>
          <ol class="space-y-2.5 text-xs text-white/80 leading-relaxed list-none pl-0">
            <li class="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03]">
              <span class="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Откройте мобильный банк (Беларусбанк, Приорбанк, МТБанк, Сбер, Альфа и др.)</span>
            </li>
            <li class="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03]">
              <span class="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <span>Перейдите по дереву ЕРИП:</span>
                <p class="font-mono text-[11px] text-cyan-300 bg-black/30 p-1.5 rounded-lg border border-white/5 mt-1">
                  Система «Расчет» (ЕРИП) → Интернет-магазины/сервисы → I → ICE LOGIX
                </p>
                <p class="text-[10px] text-white/50 mt-1">Или введите в поиске код услуги: <b class="text-white font-mono">4829104</b></p>
              </div>
            </li>
            <li class="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03]">
              <span class="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Введите номер счёта <b class="text-cyan-300 font-mono">${invoiceNum}</b> и подтвердите оплату со своего счёта.</span>
            </li>
          </ol>
        </div>

        <!-- Статус и кнопка подтверждения -->
        <div class="space-y-3 pt-1">
          <div class="flex items-center justify-center gap-2 text-xs text-white/60">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Ожидание поступления платежа в ЕРИП...</span>
          </div>

          <button
            type="button"
            id="eripConfirmPaidBtn"
            class="btn-primary w-full py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>✓ Я оплатил в приложении банка</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(eripModal);

    const closeErip = () => {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
      eripModal.classList.add('page-exit');
      setTimeout(() => eripModal.remove(), 220);
    };

    document.getElementById('closeEripModalBtn').onclick = closeErip;

    // Копирование номера счета
    document.getElementById('copyEripInvoiceBtn').onclick = () => {
      navigator.clipboard?.writeText(invoiceNum);
      if (typeof tgUtil !== 'undefined') {
        if (tgUtil.haptic) tgUtil.haptic('light');
        tgUtil.alert('Номер счета ' + invoiceNum + ' скопирован в буфер!');
      }
    };

    // Кнопка подтверждения оплаты (рабочая симуляция)
    document.getElementById('eripConfirmPaidBtn').onclick = async () => {
      const btn = document.getElementById('eripConfirmPaidBtn');
      btn.disabled = true;
      btn.innerHTML = `
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Проверяем зачисление ЕРИП...</span>
      `;
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');

      await new Promise(r => setTimeout(r, 1500));

      if (!isOrder) {
        await applyTopupCredit(amountVal, `Счёт ЕРИП подтверждён! Начислено +${amountVal} ICE на ваш баланс.`);
      } else {
        if (typeof tgUtil !== 'undefined') {
          if (tgUtil.haptic) tgUtil.haptic('success');
          tgUtil.alert('Платеж ЕРИП успешно подтверждён! Заказ принят в работу.');
        }
      }

      if (typeof onComplete === 'function') onComplete();
      closeErip();
    };
  };

  // ============================================================
  // Интерактивное всплывающее окно сервиса «Оплати» (Рабочая заглушка)
  // ============================================================
  window.openOplatiPaymentModal = function(amount, orderContext = null, onComplete = null) {
    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

    const amountVal = parseFloat(amount) || 50;
    const invoiceNum = orderContext?.order_id || ('OPL-' + Math.floor(100000 + Math.random() * 900000));
    const isOrder = Boolean(orderContext);

    const oplatiModal = document.createElement('div');
    oplatiModal.className = 'full-screen-modal-overlay page-enter';
    oplatiModal.id = 'oplatiPaymentModal';

    oplatiModal.innerHTML = `
      <div class="full-screen-modal-header">
        <button id="closeOplatiModalBtn" type="button" class="global-back-btn">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
          <span>Назад</span>
        </button>
        <div class="text-center font-bold text-sm text-white flex items-center justify-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Сервис «Оплати»</span>
        </div>
        <div style="width: 48px;"></div>
      </div>

      <div class="full-screen-modal-body space-y-4 max-w-md mx-auto">
        <!-- Карточка QR-кода Оплати -->
        <div class="glass-card p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 shadow-2xl relative overflow-hidden text-center space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Белинвестбанк • Оплата по QR</span>
          </div>

          <div>
            <p class="text-xs text-white/50">К оплате через кошелек</p>
            <p class="text-3xl font-black text-white font-mono tracking-tight">${amountVal.toFixed(2)} <span class="text-emerald-400 text-lg">BYN</span></p>
            <p class="text-[11px] text-emerald-300/80 font-medium mt-0.5">Кэшбэк и бонусы в приложении «Оплати»</p>
          </div>

          <!-- Интерактивный QR код -->
          <div class="p-3 bg-white rounded-2xl inline-block shadow-lg shadow-emerald-500/10 mx-auto select-none" id="oplatiQrSlot">
            ${generateOplatiQrSvg(amountVal, invoiceNum)}
          </div>
          <p class="text-[10px] text-white/40">Отсканируйте камерой приложения «Оплати»</p>

          <!-- Таймер действия сессии -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/60 font-mono">
            <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Действителен: <b class="text-white" id="oplatiTimer">14:59</b></span>
          </div>
        </div>

        <!-- Кнопка перехода в мобильное приложение Оплати -->
        <div class="space-y-2.5">
          <a
            href="https://getapp.o-plati.by"
            id="openOplatiAppBtn"
            target="_blank"
            class="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition text-center"
          >
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            <span>Открыть приложение «Оплати»</span>
          </a>

          <button
            type="button"
            id="checkOplatiStatusBtn"
            class="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>Проверить статус оплаты</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(oplatiModal);

    // Таймер
    let secondsLeft = 14 * 60 + 59;
    const timerEl = document.getElementById('oplatiTimer');
    const timerInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        if (timerEl) timerEl.textContent = 'Истёк';
        return;
      }
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      if (timerEl) timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, 1000);

    const closeOplati = () => {
      clearInterval(timerInterval);
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
      oplatiModal.classList.add('page-exit');
      setTimeout(() => oplatiModal.remove(), 220);
    };

    document.getElementById('closeOplatiModalBtn').onclick = closeOplati;

    // Диплинк / кнопка приложения
    document.getElementById('openOplatiAppBtn').onclick = (e) => {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
      const deepLink = `oplati://payment?order=${invoiceNum}&amount=${amountVal}`;
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 1000);
    };

    // Проверка статуса (симуляция)
    document.getElementById('checkOplatiStatusBtn').onclick = async () => {
      const btn = document.getElementById('checkOplatiStatusBtn');
      btn.disabled = true;
      btn.innerHTML = `
        <div class="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Опрашиваем сервис «Оплати»...</span>
      `;
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

      await new Promise(r => setTimeout(r, 1400));

      if (!isOrder) {
        await applyTopupCredit(amountVal, `Платеж получен! Начислено +${amountVal} ICE на ваш баланс.`);
      } else {
        if (typeof tgUtil !== 'undefined') {
          if (tgUtil.haptic) tgUtil.haptic('success');
          tgUtil.alert('Платеж через «Оплати» успешно подтверждён!');
        }
      }

      if (typeof onComplete === 'function') onComplete();
      closeOplati();
    };
  };

  // ============================================================
  // Главный экран: Пополнение баланса и Валюта ICE (Внутри #content)
  // ============================================================
  window.renderBalanceTopupPage = async function() {
    const curBalance = getLiveUserBalance();
    const cards = Array.isArray(window.userCards) ? window.userCards : [];
    const primaryCard = cards.find(c => c.is_default) || cards[0] || null;

    return `
      <div class="page-enter px-4 pb-12 max-w-md mx-auto space-y-4">

        <!-- Шапка раздела с кнопкой Назад -->
        <div class="flex items-center gap-3 mb-4 mt-2">
          <button id="backFromTopupBtn" onclick="window.goBackGlobal()" class="global-back-btn" title="Назад">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 class="text-xl font-bold text-white tracking-wide">Пополнение баланса</h2>
            <p class="text-[11px] text-white/40">О валюте ICE Coin и способы пополнения</p>
          </div>
        </div>

        <!-- 1. Карточка текущего состояния баланса -->
        <div class="glass-card p-4 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950 shadow-xl relative overflow-hidden">
          <div class="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div class="flex items-center justify-between mb-3 relative z-10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center p-1.5 shadow-md shadow-cyan-500/20">
                <img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
              </div>
              <div>
                <span class="text-xs font-bold text-white tracking-wide">Текущий баланс</span>
                <p class="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 1 ICE = 1 BYN
                </p>
              </div>
            </div>
            <button
              type="button"
              id="topupOpenTxHistoryBtn"
              class="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
            >
              <span>История</span>
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="flex items-baseline gap-2 relative z-10">
            <span class="text-3xl font-black text-white font-mono tracking-tight" id="topupCurrentBalText">${curBalance} ICE</span>
            <span class="text-xs font-bold text-white/40 font-mono" id="topupCurrentBalByn">(~${curBalance} BYN)</span>
          </div>
        </div>

        <!-- 2. Карточка: О внутренней валюте ICE Coin (ICL) -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 bg-slate-900/60 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">О валюте ICE Coin (ICL)</h4>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
              КУРС: 1 ICE = 1 BYN
            </span>
          </div>

          <p class="text-[11px] text-white/70 leading-relaxed">
            <b>ICE Coin</b> — расчётная единица экосистемы ICE LOGIX. Баланс хранится в белорусских рублях по фиксированному курсу 1 к 1.
          </p>

          <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div class="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-cyan-300 font-bold">
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Мгновенный выкуп</span>
              </div>
              <p class="text-[10px] text-white/50 leading-tight">Байеры выкупают товары сразу без задержек банковских проводок</p>
            </div>

            <div class="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>0% комиссий</span>
              </div>
              <p class="text-[10px] text-white/50 leading-tight">Никаких скрытых списаний и потерь на межбанковской конвертации</p>
            </div>

            <div class="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-purple-400 font-bold">
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span>Кэшбэк и бонусы</span>
              </div>
              <p class="text-[10px] text-white/50 leading-tight">1% от заказов друзей и промо-бонусы поступают прямо на баланс</p>
            </div>

            <div class="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
              <div class="flex items-center gap-1.5 text-amber-400 font-bold">
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span>Все услуги</span>
              </div>
              <p class="text-[10px] text-white/50 leading-tight">Оплата доставки, страхования, распаковки и обучающих курсов</p>
            </div>
          </div>
        </div>

        <!-- 3. Калькулятор суммы пополнения -->
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

        <!-- 4. Способы пополнения (СТРОГО 3: ЕРИП, Оплати, Карта онлайн bePaid) -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
          <h4 class="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            Выберите способ пополнения
          </h4>

          <div class="space-y-2" id="topupMethodsGroup">
            <!-- 1. ЕРИП (Система Расчет) -->
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
                  <p class="text-[10px] text-white/50 leading-tight mt-0.5">Оплата с любого банка Беларуси по номеру заказа через bePaid</p>
                </div>
              </div>
              <span class="text-lg">🏛️</span>
            </label>

            <!-- 2. Сервис «Оплати» -->
            <label class="topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
              _selectedTopupMethod === 'oplati'
                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-950/40'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }" data-method="oplati">
              <div class="flex items-center gap-3">
                <input type="radio" name="topupMethodRadio" value="oplati" ${_selectedTopupMethod === 'oplati' ? 'checked' : ''} class="accent-emerald-400 w-4 h-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white">Мобильный кошелек «Оплати»</span>
                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">QR • КЭШБЭК</span>
                  </div>
                  <p class="text-[10px] text-white/50 leading-tight mt-0.5">Оплата по QR-коду со смартфона (Белинвестбанк) в 1 клик</p>
                </div>
              </div>
              <span class="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-black text-xs font-sans">О!</span>
            </label>

            <!-- 3. Банковская карта онлайн bePaid -->
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

        <!-- 5. Кнопка действия -->
        <div class="pt-2">
          <button
            type="button"
            id="proceedTopupSubmitBtn"
            class="btn-primary w-full py-4 rounded-2xl font-black text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>Пополнить на ${_selectedTopupAmount} BYN (${_selectedTopupAmount} ICE)</span>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    `;
  };

  // ============================================================
  // Обработчики главного экрана пополнения
  // ============================================================
  window.attachBalanceTopupPageHandlers = function() {
    // 1. Кнопка «Назад»
    const backBtn = document.getElementById('backFromTopupBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        if (typeof window.goBackGlobal === 'function') {
          window.goBackGlobal();
        } else if (typeof switchTab === 'function') {
          switchTab('profile');
        }
      };
    }

    // 2. Кнопка «История транзакций»
    const historyBtn = document.getElementById('topupOpenTxHistoryBtn');
    if (historyBtn) {
      historyBtn.onclick = () => {
        if (typeof window.showAllTransactions === 'function') {
          window.showAllTransactions();
        } else if (typeof switchTab === 'function') {
          switchTab('history');
        }
      };
    }

    // 3. Фоновая синхронизация реального баланса из базы данных Supabase
    const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
    if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('users').select('ices_balance').eq('user_id', curUserId).maybeSingle().then(({ data, error }) => {
        if (!error && data && typeof data.ices_balance === 'number') {
          window.balance = data.ices_balance;
          const hb = document.getElementById('headerBalance');
          if (hb) hb.innerText = data.ices_balance;

          const tb = document.getElementById('topupCurrentBalText');
          if (tb) tb.innerText = `${data.ices_balance} ICE`;

          const tbByn = document.getElementById('topupCurrentBalByn');
          if (tbByn) tbByn.innerText = `(~${data.ices_balance} BYN)`;

          try {
            const cached = localStorage.getItem('ice_cached_user');
            if (cached) {
              const u = JSON.parse(cached);
              u.balance = data.ices_balance;
              localStorage.setItem('ice_cached_user', JSON.stringify(u));
            }
          } catch (_) {}
        }
      }).catch(() => {});
    }

    // 4. Управление суммой пополнения
    const customInput = document.getElementById('topupCustomAmountInput');
    const submitBtn = document.getElementById('proceedTopupSubmitBtn');
    const convertedIceText = document.getElementById('topupConvertedIceText');

    function updateTopupAmount(newAmount) {
      _selectedTopupAmount = Math.max(1, parseFloat(newAmount) || 1);
      if (customInput && document.activeElement !== customInput) {
        customInput.value = _selectedTopupAmount;
      }
      if (convertedIceText) {
        convertedIceText.innerText = `${_selectedTopupAmount} ICE`;
      }

      if (submitBtn) {
        submitBtn.innerHTML = `
          <span>Пополнить на ${_selectedTopupAmount} BYN (${_selectedTopupAmount} ICE)</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        `;
      }

      // Подсветка чипсов
      document.querySelectorAll('#topupChipsGrid button').forEach(chip => {
        const val = parseFloat(chip.dataset.amount);
        if (val === _selectedTopupAmount) {
          chip.className = 'topup-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
        } else {
          chip.className = 'topup-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5';
        }
      });
    }

    // Слушатели чипсов
    document.querySelectorAll('#topupChipsGrid button').forEach(chip => {
      chip.onclick = () => {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
        updateTopupAmount(chip.dataset.amount);
      };
    });

    // Слушатель поля ввода суммы
    if (customInput) {
      customInput.oninput = () => {
        updateTopupAmount(customInput.value);
      };
    }

    // Слушатели радиокнопок способов оплаты
    document.querySelectorAll('.topup-method-card').forEach(card => {
      card.onclick = () => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          _selectedTopupMethod = radio.value;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

          // Обновляем подсветку карточек
          document.querySelectorAll('.topup-method-card').forEach(c => {
            const isOplati = c.dataset.method === 'oplati';
            if (c === card) {
              if (isOplati) {
                c.className = 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-950/40';
              } else {
                c.className = 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40';
              }
            } else {
              c.className = 'topup-method-card flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer bg-white/[0.03] border-white/10 hover:border-white/20';
            }
          });
        }
      };
    });

    // 5. Обработка кнопки «Пополнить»
    if (submitBtn) {
      submitBtn.onclick = async () => {
        const amountVal = _selectedTopupAmount;
        if (amountVal <= 0 || isNaN(amountVal)) {
          if (typeof tgUtil !== 'undefined') tgUtil.alert('Пожалуйста, укажите корректную сумму пополнения.');
          return;
        }

        if (_selectedTopupMethod === 'erip') {
          // Запуск интерактивного счета ЕРИП
          window.openEripPaymentModal(amountVal);

        } else if (_selectedTopupMethod === 'oplati') {
          // Запуск интерактивного окна «Оплати»
          window.openOplatiPaymentModal(amountVal);

        } else if (_selectedTopupMethod === 'card') {
          // Оплата картой через bePaid
          const cards = Array.isArray(window.userCards) ? window.userCards : [];
          if (cards.length === 0) {
            if (typeof window.openAddCardModal === 'function') {
              window.openAddCardModal(() => {
                if (typeof tgUtil !== 'undefined') tgUtil.alert('Карта привязана! Повторите пополнение.');
              });
            } else {
              if (typeof tgUtil !== 'undefined') tgUtil.alert('Пожалуйста, добавьте карту в разделе Финансы.');
            }
            return;
          }

          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Авторизация bePaid...</span>
          `;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');

          await new Promise(r => setTimeout(r, 1400));
          await applyTopupCredit(amountVal, `Баланс успешно пополнен на +${amountVal} ICE с банковской карты!`);

          submitBtn.disabled = false;
          updateTopupAmount(_selectedTopupAmount);
        }
      };
    }
  };

  // Обратная совместимость для вызова из других компонентов
  window.openBalanceTopupModal = function(defaultAmount = 50) {
    if (typeof defaultAmount === 'number' && defaultAmount > 0) {
      _selectedTopupAmount = defaultAmount;
    }
    if (typeof switchTab === 'function') {
      switchTab('topup');
    }
  };

  window.openBalanceTopup = function(defaultAmount = 50) {
    if (typeof defaultAmount === 'number' && defaultAmount > 0) {
      _selectedTopupAmount = defaultAmount;
    }
    if (typeof switchTab === 'function') {
      switchTab('topup');
    }
  };

})();
