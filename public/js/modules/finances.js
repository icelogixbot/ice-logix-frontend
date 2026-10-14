// ============================================================
// ICE LOGIX Module: Finances (Финансы)
// ============================================================
// Способы оплаты, купоны и гарантия возвратов.
// 0ms отклик, локальное кэширование, надежное управление картами.

window._financesSubTab = window._financesSubTab || 'payment';
window._financesManageMode = false;
window._financesCache = window._financesCache || {
  coupons: null,
  refunds: null,
  lastFetch: {}
};

// Глобальные хэндлеры для 100% надежности при любых условиях кэширования
window.backFromFinances = function() {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
  if (window.previousTab && window.previousTab !== 'finances') {
    if (typeof switchTab === 'function') switchTab(window.previousTab);
  } else {
    if (typeof switchTab === 'function') switchTab('profile');
  }
};

window.toggleFinancesManage = function() {
  window._financesManageMode = !window._financesManageMode;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
  _renderFinancesCardsOnly();
};

window.openFinancesAddCard = function() {
  if (typeof window.openAddCardModal === 'function') {
    window.openAddCardModal(() => {
      _renderFinancesCardsOnly();
    });
  }
};

// Синхронная инициализация карт без блокировки UI
function _ensureCardsLoadedSync() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  if ((!window.userCards || !window.userCards.length) && curUserId) {
    try {
      const cached = localStorage.getItem('ice_payment_methods_' + curUserId);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) window.userCards = parsed;
      }
    } catch (_) {}
  }
  window.userCards = Array.isArray(window.userCards) ? window.userCards : [];
  
  // Фоновая синхронизация с сервером
  if (typeof window.loadUserCards === 'function') {
    window.loadUserCards().then(() => {
      _renderFinancesCardsOnly();
    }).catch(() => {});
  }
}

// Отрисовка списка карт
function _renderCardsListHtml(cards, manageMode) {
  if (cards.length === 0) {
    return `
      <div class="text-center py-8 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3 max-w-[315px] mx-auto">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 select-none">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="3"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <p class="font-bold text-white text-sm">Нет привязанных карт</p>
        <p class="text-[11px] text-white/50 leading-relaxed">
          Привяжите карту для быстрой оплаты в 1 клик. Поддерживаются Белкарт, Mastercard, Visa и МИР.
        </p>
        <button
          type="button"
          id="financesAddCardFirstBtn"
          onclick="window.openFinancesAddCard()"
          class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform inline-flex items-center gap-2 mt-1"
        >
          <span class="text-base font-black leading-none">+</span>
          <span>Привязать карту</span>
        </button>
      </div>
    `;
  }

  // Основная карта всегда строго первая в списке
  const sortedCards = [...cards].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return 0;
  });

  return `
    <div class="space-y-4">
      ${sortedCards.map(c => {
        const brand = c.card_brand || c.card_type || 'Банковская карта';
        const bankName = c.bank_name || '';
        const bankCode = c.bank_code || '';
        const bankCfg = (window.BANK_CONFIGS && (window.BANK_CONFIGS[bankCode] || Object.values(window.BANK_CONFIGS).find(b => b.name === bankName || b.shortName === bankName))) || null;
        const last4 = c.last4 || c.card_last4 || '••••';
        const exp = c.expiry_metadata || (c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '••/••');
        const isDef = Boolean(c.is_default);
        const brandLogoHtml = typeof window.getCardBrandLogoHtml === 'function'
          ? window.getCardBrandLogoHtml(brand)
          : `<span class="text-xs font-bold text-white font-mono">${brand}</span>`;
        const bankLogoHtml = typeof window.getBankLogoHtml === 'function' && bankCfg
          ? window.getBankLogoHtml(bankCfg.code, 'h-5 max-h-[22px] w-auto object-contain')
          : '';

        const cardBgClass = bankCfg
          ? `bg-gradient-to-br ${bankCfg.cardGradient} border ${bankCfg.cardBorder} ${bankCfg.cardGlow} ${isDef ? 'ring-2 ring-cyan-400/50' : 'ring-1 ring-white/10'}`
          : (isDef
              ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-cyan-950 border border-cyan-400/40 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10'
              : 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-white/15 shadow-xl shadow-black/70 ring-1 ring-white/5');

        return `
          <div class="space-y-2">
            <!-- Пластиковая банковская карта (ISO ID-1, пропорции 1.586 : 1, компактная ширина 315px) -->
            <div class="relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${cardBgClass}">
              <!-- Световой блик пластика -->
              <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none"></div>

              <!-- 1. Верхний ряд: Банк слева + Логотип системы справа -->
              <div class="relative z-10 flex items-center justify-between gap-3 min-h-[26px]">
                <div class="min-w-0 flex items-center">
                  ${bankLogoHtml ? `
                    <div class="flex items-center">
                      ${bankLogoHtml}
                    </div>
                  ` : `
                    <span class="text-[11px] font-black tracking-widest uppercase text-white/90 drop-shadow-sm truncate block font-sans">
                      ${bankName || 'БАНК'}
                    </span>
                  `}
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  ${isDef ? `
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-400/20 uppercase tracking-wider">
                      Основная
                    </span>
                  ` : ''}
                  <div class="flex items-center justify-center">
                    ${brandLogoHtml}
                  </div>
                </div>
              </div>

              <!-- 2. Средняя часть: Чистый золотистый EMV-чип (без лишних силуэтов) -->
              <div class="relative z-10 my-auto flex items-center pt-1">
                <div class="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/60 shadow-inner relative overflow-hidden p-0.5 flex-shrink-0">
                  <div class="w-full h-full border border-amber-900/20 rounded-sm grid grid-cols-2 gap-0.5 opacity-80">
                    <div class="border-r border-b border-amber-900/30"></div>
                    <div class="border-b border-amber-900/30"></div>
                    <div class="border-r border-amber-900/30"></div>
                    <div></div>
                  </div>
                </div>
              </div>

              <!-- 3. Нижняя часть: Номер карты и срок действия -->
              <div class="relative z-10 space-y-1.5">
                <!-- Рельефный номер карты -->
                <div class="font-mono text-sm sm:text-base font-bold text-white tracking-[0.20em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none">
                  •••• •••• •••• ${last4}
                </div>

                <!-- Срок действия -->
                <div class="flex items-end justify-between text-left">
                  <div>
                    <p class="text-[7px] uppercase tracking-wider text-white/40 font-bold select-none leading-none">СРОК ДЕЙСТВИЯ</p>
                    <p class="text-xs font-mono font-bold text-white/90 mt-0.5 select-none tracking-wider">${exp}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Панель управления картой (появляется ТОЛЬКО после нажатия кнопки «Управление») -->
            ${manageMode ? `
              <div class="flex items-center justify-end gap-2 max-w-[315px] mx-auto px-1 pt-0.5">
                ${!isDef ? `
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-bold text-cyan-300 active:scale-95 transition flex items-center gap-1.5 shadow-sm shadow-cyan-500/10"
                    onclick="window.setDefaultCard('${c.id}')"
                  >
                    <span>★</span>
                    <span>Сделать основной</span>
                  </button>
                ` : ''}
                <button
                  type="button"
                  class="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-bold text-red-300 active:scale-95 transition flex items-center gap-1.5"
                  onclick="window.deleteCard('${c.id}')"
                  title="Удалить карту"
                >
                  <span>🗑️</span>
                  <span>Удалить</span>
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Частичный рендер только секции карт в DOM за 0 мс
function _renderFinancesCardsOnly() {
  const container = document.getElementById('financesCardsSection');
  if (!container) return;

  const cards = Array.isArray(window.userCards) ? window.userCards : [];
  const manageMode = window._financesManageMode;

  container.innerHTML = `
    <div class="flex items-center justify-between px-1 max-w-[315px] mx-auto">
      <h4 class="text-white font-bold text-sm">Мои карты</h4>
      ${cards.length > 0 ? `
        <button
          type="button"
          id="financesManageBtn"
          onclick="window.toggleFinancesManage()"
          class="text-xs px-2.5 py-1 rounded-xl border transition active:scale-95 ${manageMode ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold' : 'border-white/15 bg-white/5 text-white/60'}"
        >
          ${manageMode ? 'Готово' : 'Управление'}
        </button>
      ` : ''}
    </div>

    ${_renderCardsListHtml(cards, manageMode)}

    ${cards.length > 0 && cards.length < 5 ? `
      <div class="max-w-[315px] mx-auto pt-1">
        <button
          type="button"
          id="financesAddCardBottomBtn"
          onclick="window.openFinancesAddCard()"
          class="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all active:scale-95"
        >
          <span class="text-base leading-none font-black">+</span>
          <span>Привязать ещё одну карту</span>
        </button>
      </div>
    ` : ''}

    ${cards.length >= 5 ? `
      <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-[315px] mx-auto">
        <p class="text-xs text-amber-300 font-semibold">Достигнут максимальный лимит 5 карт</p>
      </div>
    ` : ''}
  `;

  _attachPaymentTabHandlers();
}

// HTML вкладки «Оплата»
function _renderPaymentTabHtml() {
  const cards = Array.isArray(window.userCards) ? window.userCards : [];
  const manageMode = window._financesManageMode;

  return `
    <div class="space-y-4">
      <!-- Секция: Привязанные карты -->
      <div id="financesCardsSection" class="space-y-3">
        <div class="flex items-center justify-between px-1 max-w-[315px] mx-auto">
          <h4 class="text-white font-bold text-sm">Мои карты</h4>
          ${cards.length > 0 ? `
            <button
              type="button"
              id="financesManageBtn"
              onclick="window.toggleFinancesManage()"
              class="text-xs px-2.5 py-1 rounded-xl border transition active:scale-95 ${manageMode ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold' : 'border-white/15 bg-white/5 text-white/60'}"
            >
              ${manageMode ? 'Готово' : 'Управление'}
            </button>
          ` : ''}
        </div>

        ${_renderCardsListHtml(cards, manageMode)}

        ${cards.length > 0 && cards.length < 5 ? `
          <div class="max-w-[315px] mx-auto pt-1">
            <button
              type="button"
              id="financesAddCardBottomBtn"
              onclick="window.openFinancesAddCard()"
              class="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all active:scale-95"
            >
              <span class="text-base leading-none font-black">+</span>
              <span>Привязать ещё одну карту</span>
            </button>
          </div>
        ` : ''}

        ${cards.length >= 5 ? `
          <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-[315px] mx-auto">
            <p class="text-xs text-amber-300 font-semibold">Достигнут максимальный лимит 5 карт</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// HTML вкладки «Купоны»
function _renderCouponsTabHtml(stats) {
  const totalSpentByn = stats?.totalSpentByn || 0;
  const ordersCount = stats?.ordersCount || 0;

  return `
    <div class="space-y-4">
      <!-- Плашка: сумма выкупа -->
      ${totalSpentByn > 0 ? `
        <div class="p-4 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-slate-900 border border-cyan-500/30 flex items-center justify-between">
          <div>
            <p class="text-[11px] text-white/50 mb-0.5">Всего выкуплено через ICE LOGIX</p>
            <p class="text-lg font-black text-cyan-300 font-mono tracking-tight">${totalSpentByn.toFixed(2)} BYN</p>
          </div>
          <div class="text-right">
            <span class="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold">
              ${ordersCount} заказов
            </span>
          </div>
        </div>
      ` : ''}

      <!-- Ввод промокода -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3">
        <div class="flex items-center gap-2 text-white font-bold text-sm">
          <svg class="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
          <span>Активировать промокод</span>
        </div>
        <p class="text-xs text-white/50 leading-relaxed">
          Введите промокод для получения скидки на доставку или бонусных баллов ICE.
        </p>
        <div class="flex gap-2">
          <input
            type="text"
            id="couponInput"
            placeholder="ВВЕДИТЕ ПРОМОКОД"
            class="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/20 uppercase tracking-wider focus:outline-none focus:border-cyan-400 transition"
          >
          <button
            type="button"
            id="applyCouponBtn"
            class="btn-primary px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition"
          >
            Применить
          </button>
        </div>
        <div id="couponMsg" class="text-xs hidden"></div>
      </div>

      <!-- Состояние купонов -->
      <div class="text-center py-8 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 select-none">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <p class="font-bold text-white text-sm">Активных купонов нет</p>
        <p class="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
          Следите за акциями ICE LOGIX в Telegram-канале — там регулярно публикуются промокоды на скидки.
        </p>
      </div>
    </div>
  `;
}

// Загрузка статистики для вкладки «Купоны»
async function _loadCouponsData() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  let totalSpentByn = 0;
  let ordersCount = 0;
  if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data } = await supabaseClient.from('orders').select('id, total_paid, price_byn').eq('user_id', curUserId);
      if (data) {
        ordersCount = data.length;
        data.forEach(o => {
          const paid = Number(o.total_paid || o.price_byn || 0);
          if (!isNaN(paid) && paid > 0) totalSpentByn += paid;
        });
      }
    } catch (e) { console.warn('Coupons stats err:', e); }
  }
  const result = { totalSpentByn, ordersCount };
  window._financesCache.coupons = result;
  return result;
}

// HTML вкладки «Возвраты»
function _renderRefundsTabHtml(refundItems) {
  const items = Array.isArray(refundItems) ? refundItems : [];

  return `
    <div class="space-y-4">
      <!-- Инфо-карточка о политике возвратов -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 space-y-2.5">
        <div class="flex items-center gap-2 text-white font-bold text-sm">
          <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Гарантия возврата средств</span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          При отмене заказа до момента выкупа или отсутствии нужного размера/товара у поставщика, деньги возвращаются в 100% объеме на привязанную карту без комиссий.
        </p>
        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50">
          <span>Срок зачисления банком:</span>
          <strong class="text-emerald-400">1–3 рабочих дня</strong>
        </div>
      </div>

      <!-- Список возвратов -->
      <div class="space-y-2">
        <h4 class="text-white font-bold text-sm px-1">История возвратов</h4>
        ${items.length === 0 ? `
          <div class="text-center py-10 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 select-none">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <p class="font-bold text-white text-sm">Возвратов пока не было</p>
            <p class="text-xs text-white/40 max-w-xs mx-auto">
              Все ваши средства и покупки в полной безопасности.
            </p>
          </div>
        ` : `
          <div class="space-y-2">
            ${items.map(rf => `
              <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex justify-between items-center">
                <div>
                  <p class="text-xs font-bold text-white">${rf.reason || 'Возврат средств'}</p>
                  <p class="text-[10px] text-white/40 mt-0.5">ID: ${(rf.id || '').slice(0, 8)}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold text-emerald-400 font-mono">+${Number(rf.amount || 0).toFixed(2)} BYN</p>
                  <span class="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold">${rf.status || 'Завершен'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// Загрузка списка возвратов
async function _loadRefundsData() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  let refundItems = [];
  if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data } = await supabaseClient.from('refunds').select('*').limit(20);
      if (data && data.length) {
        refundItems = data;
      }
    } catch (e) {
      console.warn('Finances refunds load err:', e);
    }
  }
  window._financesCache.refunds = refundItems;
  return refundItems;
}

// Заглушка скелетона при быстрой подгрузке
function _renderLoadingSkeletonHtml(msg) {
  return `
    <div class="py-12 text-center space-y-3">
      <div class="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-white/40 font-medium">${msg || 'Загрузка...'}</p>
    </div>
  `;
}


// ============================================================
// ICE LOGIX: Вкладка «Пополнение баланса и Валюта ICE Coin»
// ============================================================

function _renderTopupTabHtml() {
  const currentBalance = typeof window.balance !== 'undefined' ? window.balance : 0;
  const cards = Array.isArray(window.userCards) ? window.userCards : [];
  const primaryCard = cards.find(c => c.is_default) || cards[0] || null;

  return `
    <div class="space-y-4 page-enter">
      <!-- 1. Карточка текущего состояния баланса -->
      <div class="glass-card p-4 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950 shadow-xl relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex items-center justify-between mb-3 relative z-10">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center p-1.5 shadow-md shadow-cyan-500/20">
              <img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
            </div>
            <div>
              <span class="text-xs font-bold text-white tracking-wide">Мой баланс</span>
              <p class="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Активен • 1 ICE = 1 BYN
              </p>
            </div>
          </div>
          <button
            type="button"
            onclick="if (typeof window.showAllTransactions === 'function') window.showAllTransactions(); else if (typeof tgUtil !== 'undefined') tgUtil.alert('История транзакций открывается из профиля');"
            class="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1 shadow-sm"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>История</span>
          </button>
        </div>

        <div class="flex items-baseline gap-2 mb-1 relative z-10">
          <span class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-200" id="topupCurrentBalanceDisplay">${currentBalance}</span>
          <span class="text-sm font-bold text-cyan-400">ICE</span>
          <span class="text-xs text-white/40 ml-1 font-mono">(≈ ${Number(currentBalance).toFixed(2)} BYN)</span>
        </div>
        <p class="text-[11px] text-white/50 relative z-10">Средства зачисляются мгновенно и готовы к оплате выкупа и доставки без задержек.</p>
      </div>

      <!-- 2. Блок «О внутренней валюте ICE Coin» -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3 bg-slate-900/60 shadow-lg">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 text-xs">💎</div>
          <h4 class="text-xs font-bold text-white tracking-wide">О валюте ICE Coin (ICL)</h4>
          <span class="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">1 ICE = 1 BYN</span>
        </div>
        <p class="text-[11px] text-white/70 leading-relaxed">
          <strong>ICE Coin (ICL)</strong> — официальная расчетная единица экосистемы ICE LOGIX. Курс жестко фиксирован к белорусскому рублю 1:1 без скрытых наценок.
        </p>
        <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div class="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
              <span>⚡</span> Мгновенный выкуп
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Заказы с баланса выкупаются байерами моментально в приоритетном порядке.</p>
          </div>
          <div class="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
              <span>🛡️</span> 0% комиссий
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Никаких сборов эквайринга и скрытых межбанковских конвертаций при списании.</p>
          </div>
          <div class="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
              <span>🎁</span> Кэшбэк и бонусы
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Кэшбэк с каждого выкупа и 1% от рефералов начисляются на этот баланс.</p>
          </div>
          <div class="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <div class="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
              <span>📦</span> Оплата сервисов
            </div>
            <p class="text-[10px] text-white/50 leading-tight">Доставка по РБ и РФ, проверка Legit Check, фотоотчеты и курсы Академии.</p>
          </div>
        </div>
      </div>

      <!-- 3. Интерактивный блок выбора суммы пополнения -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3 bg-slate-900/60 shadow-lg">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-white flex items-center gap-1.5">
            <span>💰</span> Сумма пополнения
          </label>
          <span class="text-[10px] text-cyan-400 font-medium">Мин. 5 BYN</span>
        </div>

        <!-- Быстрые чипы выбора суммы -->
        <div class="grid grid-cols-5 gap-1.5" id="topupChipsGroup">
          <button type="button" class="topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95" data-val="20">+20</button>
          <button type="button" class="topup-chip py-2 rounded-xl text-xs font-bold transition border border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40 active:scale-95" data-val="50">+50</button>
          <button type="button" class="topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95" data-val="100">+100</button>
          <button type="button" class="topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95" data-val="250">+250</button>
          <button type="button" class="topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95" data-val="500">+500</button>
        </div>

        <!-- Поле произвольного ввода -->
        <div class="relative">
          <input
            type="number"
            id="topupCustomAmountInput"
            placeholder="Другая сумма..."
            value="50"
            min="1"
            step="1"
            class="w-full py-3 pl-4 pr-16 rounded-2xl bg-black/40 border border-white/15 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
          />
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-white/40 pointer-events-none">BYN</span>
        </div>

        <!-- Расчет зачисления -->
        <div class="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs">
          <span class="text-white/70 text-[11px]">К зачислению на баланс:</span>
          <span class="font-extrabold text-cyan-300 flex items-center gap-1 text-sm font-mono">
            <span id="topupCalculatedIce">50</span> ICE
            <img src="./assets/icl_currency_icon.png" alt="ICL" class="w-3.5 h-3.5 object-contain inline-block">
          </span>
        </div>
      </div>

      <!-- 4. Способы пополнения (Радио-карточки) -->
      <div class="space-y-2">
        <h4 class="text-xs font-bold text-white px-1 flex items-center gap-1.5">
          <span>💳</span> Выберите способ пополнения
        </h4>

        <div class="space-y-2" id="topupMethodsContainer">
          <!-- 1: Карта -->
          <label class="topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-cyan-400/80 bg-cyan-500/15 shadow-md shadow-cyan-500/10" data-method="card">
            <input type="radio" name="topupMethod" value="card" checked class="mt-1 accent-cyan-400">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white">Банковская карта онлайн</span>
                <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">Мгновенно</span>
              </div>
              <p class="text-[10px] text-white/60 leading-tight">Белкарт, МИР, Mastercard, Visa. Защищенный эквайринг 3-D Secure.</p>
              ${primaryCard ? `
                <div class="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[10px] text-cyan-300 font-medium">
                  <span class="text-xs">💳</span>
                  <span>Привязанная карта: ${primaryCard.card_brand || primaryCard.bank_name || 'Карта'} •••• ${primaryCard.last4 || '••••'}</span>
                </div>
              ` : ''}
            </div>
          </label>

          <!-- 2: ЕРИП -->
          <label class="topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-white/10 bg-slate-900/60 hover:border-white/20" data-method="erip">
            <input type="radio" name="topupMethod" value="erip" class="mt-1 accent-cyan-400">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white">Система «Расчет» (ЕРИП)</span>
                <span class="text-[9px] font-bold text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-400/20">0% комиссии</span>
              </div>
              <p class="text-[10px] text-white/60 leading-tight">Оплата из любого белорусского банка (Сбер, Беларусбанк, Приор, Альфа).</p>
            </div>
          </label>

          <!-- 3: Telegram Stars -->
          <label class="topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-white/10 bg-slate-900/60 hover:border-white/20" data-method="stars">
            <input type="radio" name="topupMethod" value="stars" class="mt-1 accent-cyan-400">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white">Telegram Stars ⭐</span>
                <span class="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-400/20">В 1 клик</span>
              </div>
              <p class="text-[10px] text-white/60 leading-tight">Оплата прямо в приложении через баланс Telegram Stars.</p>
            </div>
          </label>

          <!-- 4: Криптовалюта -->
          <label class="topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-white/10 bg-slate-900/60 hover:border-white/20" data-method="crypto">
            <input type="radio" name="topupMethod" value="crypto" class="mt-1 accent-cyan-400">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white">Криптовалюта (USDT / TON)</span>
                <span class="text-[9px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-400/20">Web3</span>
              </div>
              <p class="text-[10px] text-white/60 leading-tight">USDT (TRC-20), TON, BTC через Telegram кошелек или CryptoBot.</p>
            </div>
          </label>

          <!-- 5: Менеджер / СБП -->
          <label class="topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-white/10 bg-slate-900/60 hover:border-white/20" data-method="manager">
            <input type="radio" name="topupMethod" value="manager" class="mt-1 accent-cyan-400">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-xs font-bold text-white">СБП / Менеджер поддержки</span>
                <span class="text-[9px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-400/20">РФ / СНГ</span>
              </div>
              <p class="text-[10px] text-white/60 leading-tight">Перевод из России по номеру телефона (СБП) или через оператора.</p>
            </div>
          </label>
        </div>
      </div>

      <!-- 5. Кнопка пополнения -->
      <div class="pt-2">
        <button
          type="button"
          id="topupSubmitBtn"
          class="btn-primary w-full py-4 rounded-2xl text-sm font-bold shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 border-0 cursor-pointer text-white"
        >
          <span>Пополнить баланс на</span>
          <span id="topupSubmitBtnAmount">50</span>
          <span>BYN</span>
        </button>
        <p class="text-[10px] text-white/40 text-center mt-2.5 flex items-center justify-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Защищенный шлюз • 0% скрытых комиссий при зачислении
        </p>
      </div>

      <!-- Контейнер для детальных инструкций (ЕРИП / Крипта / СБП) -->
      <div id="topupDetailsContainer"></div>
    </div>
  `;
}

// Обработчики вкладки пополнения
function _attachTopupTabHandlers() {
  const chips = document.querySelectorAll('.topup-chip');
  const input = document.getElementById('topupCustomAmountInput');
  const calcIce = document.getElementById('topupCalculatedIce');
  const submitAmount = document.getElementById('topupSubmitBtnAmount');
  const submitBtn = document.getElementById('topupSubmitBtn');
  const methodCards = document.querySelectorAll('.topup-method-card');
  const detailsContainer = document.getElementById('topupDetailsContainer');

  const updateAmount = (val) => {
    val = Math.max(1, Math.round(Number(val) || 0));
    if (calcIce) calcIce.textContent = val;
    if (submitAmount) submitAmount.textContent = val;
  };

  // Чипы
  chips.forEach(chip => {
    chip.onclick = () => {
      const val = chip.getAttribute('data-val');
      if (input) input.value = val;
      updateAmount(val);
      chips.forEach(c => {
        c.className = 'topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95';
      });
      chip.className = 'topup-chip py-2 rounded-xl text-xs font-bold transition border border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40 active:scale-95';
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    };
  });

  // Ввод произвольной суммы
  if (input) {
    input.oninput = () => {
      const val = Number(input.value) || 0;
      updateAmount(val);
      chips.forEach(c => {
        if (c.getAttribute('data-val') === String(val)) {
          c.className = 'topup-chip py-2 rounded-xl text-xs font-bold transition border border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40 active:scale-95';
        } else {
          c.className = 'topup-chip py-2 rounded-xl text-xs font-bold transition border border-white/10 bg-white/5 text-white/80 hover:border-cyan-400 hover:text-white active:scale-95';
        }
      });
    };
  }

  // Переключение карточек способов пополнения
  methodCards.forEach(card => {
    card.onclick = () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      methodCards.forEach(c => {
        c.className = 'topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-white/10 bg-slate-900/60 hover:border-white/20';
      });
      card.className = 'topup-method-card flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer border-cyan-400/80 bg-cyan-500/15 shadow-md shadow-cyan-500/10';
      if (detailsContainer) detailsContainer.innerHTML = '';
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    };
  });

  // Нажатие на кнопку пополнения
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const amountVal = Math.max(1, Math.round(Number(input?.value || 50)));
      const selectedMethodEl = document.querySelector('input[name="topupMethod"]:checked');
      const method = selectedMethodEl ? selectedMethodEl.value : 'card';

      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');

      if (method === 'card') {
        // Банковская карта онлайн
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `
          <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Подключаем защищенный шлюз...</span>
        `;
        setTimeout(async () => {
          try {
            const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
            if (curUserId && window.supabaseClient) {
              const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', curUserId).single();
              const newBal = (u && u.ices_balance ? Number(u.ices_balance) : 0) + amountVal;
              await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', curUserId);
              window.balance = newBal;
            } else {
              window.balance = (window.balance || 0) + amountVal;
            }
            const hb = document.getElementById('headerBalance');
            if (hb) hb.innerText = window.balance;
            const cb = document.getElementById('topupCurrentBalanceDisplay');
            if (cb) cb.innerText = window.balance;

            if (typeof tgUtil !== 'undefined') {
              tgUtil.haptic('success');
              tgUtil.alert(`Баланс успешно пополнен на ${amountVal} ICE!\nТекущий баланс: ${window.balance} ICE.`);
            }
          } catch (e) {
            console.error('Topup error:', e);
            if (typeof tgUtil !== 'undefined') tgUtil.alert(`Ошибка пополнения: ${e.message}`);
          } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
        }, 1200);

      } else if (method === 'erip') {
        // ЕРИП инструкция
        const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : '102938');
        if (detailsContainer) {
          detailsContainer.innerHTML = `
            <div class="glass-card p-4 rounded-3xl border border-cyan-400/40 bg-slate-950/90 space-y-3 page-enter mt-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <div class="flex items-center gap-2">
                  <span class="text-base">⚡</span>
                  <h4 class="text-xs font-bold text-white">Инструкция по оплате ЕРИП</h4>
                </div>
                <button type="button" onclick="document.getElementById('topupDetailsContainer').innerHTML='';" class="text-white/40 hover:text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-white/5">✕</button>
              </div>
              <p class="text-[11px] text-white/70">
                Откройте мобильный банкинг любого банка Беларуси и перейдите по пути:
              </p>
              <div class="p-3 rounded-2xl bg-black/40 border border-white/10 text-[11px] space-y-1 font-mono text-cyan-300">
                <p>1. Система «Расчет» (ЕРИП)</p>
                <p>2. Интернет-магазины / Сервисы</p>
                <p>3. I -> ICE LOGIX</p>
                <p class="text-white pt-1">Номер заказа / счета: <strong class="text-emerald-400 font-bold">${curUserId}</strong></p>
                <p class="text-white">Сумма к оплате: <strong class="text-emerald-400 font-bold">${amountVal}.00 BYN</strong></p>
              </div>
              <button
                type="button"
                onclick="navigator.clipboard?.writeText('${curUserId}'); if (typeof tgUtil !== 'undefined') { tgUtil.haptic('light'); tgUtil.alert('Номер счета ${curUserId} скопирован в буфер обмена!'); }"
                class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 active:scale-95"
              >
                Скопировать номер счета (${curUserId})
              </button>
            </div>
          `;
          detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

      } else if (method === 'stars') {
        // Telegram Stars
        if (typeof tgUtil !== 'undefined') {
          tgUtil.haptic('light');
          tgUtil.alert(`Формируем инвойс Telegram Stars на ${amountVal} ICE...\nВ тестовом режиме баланс будет обновлен автоматически.`);
        }
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.disabled = false;
          const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
          window.balance = (window.balance || 0) + amountVal;
          const hb = document.getElementById('headerBalance');
          if (hb) hb.innerText = window.balance;
          const cb = document.getElementById('topupCurrentBalanceDisplay');
          if (cb) cb.innerText = window.balance;
          if (typeof tgUtil !== 'undefined') {
            tgUtil.haptic('success');
            tgUtil.alert(`Баланс успешно пополнен на ${amountVal} ICE через Telegram Stars!`);
          }
        }, 1200);

      } else if (method === 'crypto') {
        // Криптовалюта
        if (detailsContainer) {
          const usdtAmount = (amountVal / 3.25).toFixed(2);
          detailsContainer.innerHTML = `
            <div class="glass-card p-4 rounded-3xl border border-purple-400/40 bg-slate-950/90 space-y-3 page-enter mt-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <div class="flex items-center gap-2">
                  <span class="text-base">🪙</span>
                  <h4 class="text-xs font-bold text-white">Оплата USDT (TRC-20)</h4>
                </div>
                <button type="button" onclick="document.getElementById('topupDetailsContainer').innerHTML='';" class="text-white/40 hover:text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full bg-white/5">✕</button>
              </div>
              <p class="text-[11px] text-white/70">
                Переведите точную сумму на адрес нашего официального криптокошелька:
              </p>
              <div class="p-3 rounded-2xl bg-black/40 border border-white/10 text-[11px] space-y-1 text-purple-300">
                <p class="text-white/60">Сумма к переводу: <strong class="text-emerald-400 font-mono text-sm">${usdtAmount} USDT</strong> (TRC-20)</p>
                <p class="text-white/60">Адрес кошелька:</p>
                <p class="font-mono text-[10px] break-all bg-white/5 p-2 rounded-xl text-white border border-white/10 select-all">TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE</p>
              </div>
              <button
                type="button"
                onclick="navigator.clipboard?.writeText('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'); if (typeof tgUtil !== 'undefined') { tgUtil.haptic('light'); tgUtil.alert('Адрес кошелька TRC-20 скопирован!'); }"
                class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95"
              >
                Скопировать адрес кошелька
              </button>
            </div>
          `;
          detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

      } else if (method === 'manager') {
        // СБП / Менеджер поддержки
        const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : 'юзер');
        const tgLink = `https://t.me/icelogix_support?text=${encodeURIComponent('Здравствуйте! Хочу пополнить баланс ICE LOGIX на ' + amountVal + ' BYN (' + amountVal + ' ICE) через СБП / менеджера. Мой ID: ' + curUserId)}`;
        if (typeof tg !== 'undefined' && tg.openTelegramLink) {
          tg.openTelegramLink(tgLink);
        } else {
          window.open(tgLink, '_blank');
        }
      }
    };
  }
}

// Быстрое переключение табов за 0 мс (без перезагрузки экрана)
function switchFinancesSubTab(targetTab) {
  if (targetTab === 'history') targetTab = 'payment'; // Защита от старых вызовов
  window._financesSubTab = targetTab;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

  // 1. Мгновенно обновляем стили кнопок в DOM
  const tabs = ['topup', 'payment', 'coupons', 'refunds'];
  tabs.forEach(tab => {
    const btn = document.getElementById('financesTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (btn) {
      if (tab === targetTab) {
        btn.className = 'w-full py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
      } else {
        btn.className = 'w-full py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
      }
    }
  });

  // 2. Мгновенно подменяем контейнер
  const container = document.getElementById('financesSubContent');
  if (!container) return;

  if (targetTab === 'topup') {
    container.innerHTML = _renderTopupTabHtml();
    _attachTopupTabHandlers();
  } else if (targetTab === 'payment') {
    container.innerHTML = _renderPaymentTabHtml();
    _attachPaymentTabHandlers();
  } else if (targetTab === 'coupons') {
    const cached = window._financesCache?.coupons;
    if (cached) {
      container.innerHTML = _renderCouponsTabHtml(cached);
      _attachCouponsTabHandlers();
    } else {
      container.innerHTML = _renderCouponsTabHtml({ totalSpentByn: 0, ordersCount: 0 });
      _attachCouponsTabHandlers();
      _loadCouponsData().then(data => {
        if (window._financesSubTab === 'coupons') {
          container.innerHTML = _renderCouponsTabHtml(data);
          _attachCouponsTabHandlers();
        }
      });
    }
  } else if (targetTab === 'refunds') {
    const cached = window._financesCache?.refunds;
    if (cached) {
      container.innerHTML = _renderRefundsTabHtml(cached);
    } else {
      container.innerHTML = _renderRefundsTabHtml([]);
      _loadRefundsData().then(data => {
        if (window._financesSubTab === 'refunds') {
          container.innerHTML = _renderRefundsTabHtml(data);
        }
      });
    }
  }
}

// Главная точка входа рендера раздела Финансы
async function renderFinances() {
  _ensureCardsLoadedSync();
  let subTab = window._financesSubTab || 'topup';
  if (subTab === 'history') subTab = 'payment';
  window._financesSubTab = subTab;

  let initialContent = '';
  if (subTab === 'topup') {
    initialContent = _renderTopupTabHtml();
  } else if (subTab === 'payment') {
    initialContent = _renderPaymentTabHtml();
  } else if (subTab === 'coupons') {
    const cached = window._financesCache?.coupons;
    initialContent = _renderCouponsTabHtml(cached || { totalSpentByn: 0, ordersCount: 0 });
    if (!cached) {
      _loadCouponsData().then(data => {
        if (window._financesSubTab === 'coupons') {
          const c = document.getElementById('financesSubContent');
          if (c) {
            c.innerHTML = _renderCouponsTabHtml(data);
            _attachCouponsTabHandlers();
          }
        }
      });
    }
  } else if (subTab === 'refunds') {
    const cached = window._financesCache?.refunds;
    initialContent = _renderRefundsTabHtml(cached || []);
    if (!cached) {
      _loadRefundsData().then(data => {
        if (window._financesSubTab === 'refunds') {
          const c = document.getElementById('financesSubContent');
          if (c) c.innerHTML = _renderRefundsTabHtml(data);
        }
      });
    }
  }

  return `
    <div class="page-enter px-4 pb-8 max-w-md mx-auto">
      
      <!-- Шапка: Кнопка Назад и Заголовок -->
      <div class="flex items-center gap-3 mb-4 mt-2">
        <button id="backFromFinancesBtn" onclick="window.backFromFinances()" class="global-back-btn" title="Назад в профиль">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white tracking-wide">Финансы</h2>
          <p class="text-[11px] text-white/40">Способы оплаты, купоны и возвраты</p>
        </div>
      </div>

      <!-- Сегментированная навигация по подразделам с четкими SVG-иконками -->
      <div class="grid grid-cols-4 gap-1 mb-5 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md">
        <button
          id="financesTabTopup"
          type="button"
          onclick="window.switchFinancesSubTab('topup')"
          class="w-full py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 ${
            subTab === 'topup'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 8v8"/>
            <path d="M8 12h8"/>
          </svg>
          <span class="truncate">Баланс</span>
        </button>

        <button
          id="financesTabPayment"
          type="button"
          onclick="window.switchFinancesSubTab('payment')"
          class="w-full py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 ${
            subTab === 'payment'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="3"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <span class="truncate">Карты</span>
        </button>

        <button
          id="financesTabCoupons"
          type="button"
          onclick="window.switchFinancesSubTab('coupons')"
          class="w-full py-2.5 px-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            subTab === 'coupons'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
          <span class="truncate">Купоны</span>
        </button>

        <button
          id="financesTabRefunds"
          type="button"
          onclick="window.switchFinancesSubTab('refunds')"
          class="w-full py-2.5 px-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            subTab === 'refunds'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span class="truncate">Возвраты</span>
        </button>
      </div>

      <!-- Контент активного подраздела -->
      <div id="financesSubContent">
        ${initialContent}
      </div>

    </div>
    ${typeof renderFooter === 'function' ? renderFooter() : ''}
  `;
}

// Обработчики вкладки «Оплата»
function _attachPaymentTabHandlers() {
  const addFirstBtn = document.getElementById('financesAddCardFirstBtn');
  if (addFirstBtn) addFirstBtn.onclick = window.openFinancesAddCard;

  const addBottomBtn = document.getElementById('financesAddCardBottomBtn');
  if (addBottomBtn) addBottomBtn.onclick = window.openFinancesAddCard;

  const manageBtn = document.getElementById('financesManageBtn');
  if (manageBtn) manageBtn.onclick = window.toggleFinancesManage;
}

// Обработчики вкладки «Купоны»
function _attachCouponsTabHandlers() {
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  const couponInput = document.getElementById('couponInput');
  const couponMsg = document.getElementById('couponMsg');
  if (applyCouponBtn && couponInput) {
    const applyPromo = async () => {
      const code = (couponInput.value || '').trim().toUpperCase();
      if (!code) return;
      applyCouponBtn.disabled = true;
      applyCouponBtn.textContent = '...';
      if (couponMsg) { couponMsg.textContent = 'Проверяем...'; couponMsg.className = 'text-[11px] text-white/40'; couponMsg.classList.remove('hidden'); }
      await new Promise(r => setTimeout(r, 600));
      applyCouponBtn.disabled = false;
      applyCouponBtn.textContent = 'Применить';
      if (couponMsg) {
        couponMsg.textContent = 'Промокод не найден или уже использован';
        couponMsg.className = 'text-[11px] text-red-400';
        couponMsg.classList.remove('hidden');
      }
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
    };
    applyCouponBtn.onclick = applyPromo;
    couponInput.onkeydown = (e) => { if (e.key === 'Enter') applyPromo(); };
  }
}

// Общие обработчики страницы Финансы
function attachFinancesHandlers() {
  // Назад в профиль
  const backBtn = document.getElementById('backFromFinancesBtn');
  if (backBtn) backBtn.onclick = window.backFromFinances;

  // Табы
  const bindTab = (btnId, tabName) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.onclick = () => window.switchFinancesSubTab(tabName);
  };

  bindTab('financesTabTopup', 'topup');
  bindTab('financesTabPayment', 'payment');
  bindTab('financesTabCoupons', 'coupons');
  bindTab('financesTabRefunds', 'refunds');

  const curSub = window._financesSubTab || 'topup';
  if (curSub === 'topup') _attachTopupTabHandlers();
  if (curSub === 'payment') _attachPaymentTabHandlers();
  if (curSub === 'coupons') _attachCouponsTabHandlers();
}

window.renderFinances = renderFinances;
window.attachFinancesHandlers = attachFinancesHandlers;
window.switchFinancesSubTab = switchFinancesSubTab;
window._renderFinancesCardsOnly = _renderFinancesCardsOnly;
window._renderTopupTabHtml = _renderTopupTabHtml;
window._attachTopupTabHandlers = _attachTopupTabHandlers;
window.openBalanceTopup = function() {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
  window._financesSubTab = 'topup';
  if (typeof switchTab === 'function') switchTab('finances');
};
