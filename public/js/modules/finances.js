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


let _selectedPayAmount = 50;
let _selectedPayMethod = 'erip';

// Генератор HTML: Премиальная цифровая карта и блок пополнения «ICE LOGIX PAY»
function _renderPayTabHtml() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : 0);
  const curBal = typeof window.balance === 'number' ? window.balance : 0;
  const accountNum = `ICE-${String(curUserId).padStart(7, '0')}`;
  const userName = (window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Клиент ICE LOGIX').toUpperCase();

  return `
    <div class="space-y-4">
      <!-- 1. Премиальная цифровая карта «ICE LOGIX PAY» -->
      <div class="relative w-full aspect-[1.586/1] max-w-[340px] mx-auto rounded-3xl p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 bg-gradient-to-br from-slate-900 via-cyan-950/70 to-slate-950 border border-cyan-400/40 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10">
        <!-- Световые неоновые блики -->
        <div class="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-cyan-400/15 blur-2xl pointer-events-none"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-600/20 blur-xl pointer-events-none"></div>

        <!-- Верхний ряд: Логотип ICE LOGIX PAY + Статус счета -->
        <div class="relative z-10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/40">
              <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div>
              <span class="text-sm font-black tracking-wider text-white font-sans drop-shadow-sm">ICE LOGIX <span class="text-cyan-400">PAY</span></span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-400/20 uppercase">
            Лицевой счёт
          </span>
        </div>

        <!-- Центральный ряд: Баланс счета -->
        <div class="relative z-10 my-auto py-1">
          <p class="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-0.5">Доступный баланс</p>
          <div class="flex items-baseline gap-2.5">
            <span class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight" id="payLiveBalance">${curBal.toFixed(2)} BYN</span>
            <span class="text-xs font-bold text-cyan-400 font-mono" id="payLiveIce">≈ ${curBal.toFixed(0)} ICE</span>
          </div>
        </div>

        <!-- Нижний ряд: Чип, Номер счета и Владелец -->
        <div class="relative z-10 flex items-end justify-between">
          <div class="space-y-0.5">
            <p class="text-[8px] uppercase tracking-widest text-white/40 font-bold">Номер счёта</p>
            <p class="font-mono text-xs font-bold text-white/90 tracking-widest">${accountNum}</p>
            <p class="text-[9px] font-medium text-white/50 truncate max-w-[160px]">${userName}</p>
          </div>
          <div class="flex items-center gap-1.5 opacity-80">
            <div class="w-8 h-6 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-300/60 p-0.5 flex flex-col justify-around shadow-sm">
              <div class="w-full h-[1px] bg-amber-900/40"></div>
              <div class="w-full h-[1px] bg-amber-900/40"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Блок пополнения счёта ICE LOGIX PAY -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-white font-bold text-sm">
            <svg class="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Пополнить счёт ICE LOGIX PAY</span>
          </div>
          <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            0% КОМИССИЯ
          </span>
        </div>

        <!-- Быстрые чипы сумм -->
        <div class="space-y-1.5">
          <label class="text-[11px] text-white/50 font-medium">Сумма пополнения (BYN)</label>
          <div class="grid grid-cols-5 gap-1.5" id="payChipsGrid">
            <button type="button" class="pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5" data-amount="25">25</button>
            <button type="button" class="pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20" data-amount="50">50</button>
            <button type="button" class="pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5" data-amount="100">100</button>
            <button type="button" class="pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5" data-amount="200">200</button>
            <button type="button" class="pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5" data-amount="500">500</button>
          </div>
        </div>

        <!-- Поле ввода своей суммы -->
        <div class="relative">
          <input
            type="number"
            id="payCustomAmountInput"
            min="1"
            max="10000"
            step="1"
            value="50"
            class="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-16 text-base font-mono font-black text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition"
            placeholder="Своя сумма"
          >
          <span class="absolute right-4 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-cyan-400">BYN</span>
        </div>

        <!-- Способы пополнения -->
        <div class="space-y-2">
          <label class="text-[11px] text-white/50 font-medium">Способ пополнения</label>
          <div class="space-y-2" id="payMethodsList">
            <!-- ЕРИП -->
            <label class="pay-method-card flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40" data-method="erip">
              <div class="flex items-center gap-3">
                <input type="radio" name="payTopupMethod" value="erip" checked class="hidden">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  🏛️
                </div>
                <div>
                  <p class="text-xs font-bold text-white">ЕРИП (АИС «Расчет»)</p>
                  <p class="text-[10px] text-white/50">Мгновенно из любого банкинга Беларуси</p>
                </div>
              </div>
              <span class="text-[10px] font-bold text-cyan-400">0%</span>
            </label>

            <!-- Оплати -->
            <label class="pay-method-card flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer bg-white/[0.03] border-white/10 hover:border-white/20" data-method="oplati">
              <div class="flex items-center gap-3">
                <input type="radio" name="payTopupMethod" value="oplati" class="hidden">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  📱
                </div>
                <div>
                  <p class="text-xs font-bold text-white">Оплати</p>
                  <p class="text-[10px] text-white/50">По QR-коду или через приложение</p>
                </div>
              </div>
              <span class="text-[10px] font-bold text-emerald-400">0%</span>
            </label>

            <!-- Банковская карта онлайн -->
            <label class="pay-method-card flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer bg-white/[0.03] border-white/10 hover:border-white/20" data-method="card">
              <div class="flex items-center gap-3">
                <input type="radio" name="payTopupMethod" value="card" class="hidden">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  💳
                </div>
                <div>
                  <p class="text-xs font-bold text-white">Банковская карта онлайн</p>
                  <p class="text-[10px] text-white/50">Белкарт, Mastercard, Visa, МИР</p>
                </div>
              </div>
              <span class="text-[10px] font-bold text-purple-400">0%</span>
            </label>
          </div>
        </div>

        <!-- Кнопка пополнения -->
        <button
          type="button"
          id="paySubmitTopupBtn"
          class="w-full btn-primary py-3.5 rounded-2xl text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span id="paySubmitBtnText">Пополнить на 50 BYN</span>
        </button>
      </div>

      <!-- 3. Преимущества ICE LOGIX PAY (3 карточки) -->
      <div class="grid grid-cols-3 gap-2">
        <div class="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-center space-y-1">
          <div class="text-lg">⚡</div>
          <p class="text-[10px] font-bold text-white leading-tight">Оплата в 1 клик</p>
          <p class="text-[9px] text-white/40 leading-snug">Без SMS и ввода данных карты</p>
        </div>
        <div class="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-center space-y-1">
          <div class="text-lg">🎁</div>
          <p class="text-[10px] font-bold text-white leading-tight">Бонусы и кэшбэк</p>
          <p class="text-[9px] text-white/40 leading-snug">7% за друзей на баланс</p>
        </div>
        <div class="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-center space-y-1">
          <div class="text-lg">🛡️</div>
          <p class="text-[10px] font-bold text-white leading-tight">Мгновенный возврат</p>
          <p class="text-[9px] text-white/40 leading-snug">За 1 секунду при отмене</p>
        </div>
      </div>
    </div>
  `;
}

// Обработчики вкладки «ICE LOGIX PAY»
function _attachPayTabHandlers() {
  const customInput = document.getElementById('payCustomAmountInput');
  const submitBtn = document.getElementById('paySubmitTopupBtn');
  const submitBtnText = document.getElementById('paySubmitBtnText');

  function updateAmount(val) {
    _selectedPayAmount = Math.max(1, parseFloat(val) || 1);
    if (customInput && document.activeElement !== customInput) {
      customInput.value = _selectedPayAmount;
    }
    if (submitBtnText) {
      submitBtnText.innerText = `Пополнить на ${_selectedPayAmount} BYN`;
    }

    document.querySelectorAll('#payChipsGrid button').forEach(chip => {
      const v = parseFloat(chip.dataset.amount);
      if (v === _selectedPayAmount) {
        chip.className = 'pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
      } else {
        chip.className = 'pay-amount-chip py-2 px-1 rounded-xl text-xs font-mono font-bold transition active:scale-95 text-center bg-white/5 hover:bg-white/10 text-white/70 border border-white/5';
      }
    });
  }

  document.querySelectorAll('#payChipsGrid button').forEach(chip => {
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

  // Выбор метода пополнения
  document.querySelectorAll('#payMethodsList .pay-method-card').forEach(card => {
    card.onclick = () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        _selectedPayMethod = radio.value;
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

        document.querySelectorAll('#payMethodsList .pay-method-card').forEach(c => {
          if (c === card) {
            c.className = 'pay-method-card flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/40';
          } else {
            c.className = 'pay-method-card flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer bg-white/[0.03] border-white/10 hover:border-white/20';
          }
        });
      }
    };
  });

  // Отправка пополнения
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const amt = _selectedPayAmount;
      if (amt <= 0 || isNaN(amt)) {
        if (typeof tgUtil !== 'undefined') tgUtil.alert('Укажите корректную сумму пополнения.');
        return;
      }

      if (_selectedPayMethod === 'erip') {
        if (typeof window.openEripPaymentModal === 'function') {
          window.openEripPaymentModal(amt);
        } else {
          tgUtil.alert(`Счет в ЕРИП на сумму ${amt} BYN сформирован!`);
        }
      } else if (_selectedPayMethod === 'oplati') {
        if (typeof window.openOplatiPaymentModal === 'function') {
          window.openOplatiPaymentModal(amt);
        } else {
          tgUtil.alert(`QR-код «Оплати» на сумму ${amt} BYN сформирован!`);
        }
      } else if (_selectedPayMethod === 'card') {
        const cards = Array.isArray(window.userCards) ? window.userCards : [];
        if (cards.length === 0) {
          if (typeof window.openFinancesAddCard === 'function') {
            window.openFinancesAddCard();
          } else if (typeof window.openAddCardModal === 'function') {
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
        if (typeof window.applyWalletCredit === 'function') {
          await window.applyWalletCredit(amt, 'TOPUP_CARD', `Счёт ICE LOGIX PAY успешно пополнен на +${amt} BYN с банковской карты!`);
        } else {
          window.balance = (window.balance || 0) + amt;
          const liveB = document.getElementById('payLiveBalance');
          if (liveB) liveB.innerText = `${window.balance.toFixed(2)} BYN`;
          const liveI = document.getElementById('payLiveIce');
          if (liveI) liveI.innerText = `≈ ${window.balance.toFixed(0)} ICE`;
          if (typeof tgUtil !== 'undefined') tgUtil.alert(`Счёт ICE LOGIX PAY успешно пополнен на +${amt} BYN!`);
        }

        submitBtn.disabled = false;
        updateAmount(_selectedPayAmount);
      }
    };
  }
}

// Быстрое переключение табов за 0 мс (без перезагрузки экрана)
function switchFinancesSubTab(targetTab) {
  if (targetTab === 'history' || targetTab === 'topup') targetTab = 'pay';
  window._financesSubTab = targetTab;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

  // 1. Мгновенно обновляем стили кнопок и заголовок в DOM
  const titles = {
    pay: { title: 'ICE LOGIX <span class="text-cyan-400">PAY</span>', sub: 'Лицевой счёт и пополнение баланса' },
    payment: { title: 'Банковские карты', sub: 'Привязанные карты для быстрой оплаты' },
    coupons: { title: 'Купоны и промокоды', sub: 'Активация скидок и баллов' },
    refunds: { title: 'Гарантия и возвраты', sub: 'История возвратов средств' }
  };
  const meta = titles[targetTab] || titles.pay;
  const headerTitleEl = document.getElementById('financesHeaderTitle');
  const headerSubEl = document.getElementById('financesHeaderSub');
  if (headerTitleEl) headerTitleEl.innerHTML = meta.title;
  if (headerSubEl) headerSubEl.innerText = meta.sub;

  const tabs = ['pay', 'payment', 'coupons', 'refunds'];
  tabs.forEach(tab => {
    const btn = document.getElementById('financesTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (btn) {
      if (tab === targetTab) {
        btn.className = 'w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
      } else {
        btn.className = 'w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
      }
    }
  });

  // 2. Мгновенно подменяем контейнер
  const container = document.getElementById('financesSubContent');
  if (!container) return;

  if (targetTab === 'pay') {
    container.innerHTML = _renderPayTabHtml();
    _attachPayTabHandlers();
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
  let subTab = window._financesSubTab || 'pay';
  if (subTab === 'history' || subTab === 'topup') subTab = 'pay';
  window._financesSubTab = subTab;

  const titles = {
    pay: { title: 'ICE LOGIX <span class="text-cyan-400">PAY</span>', sub: 'Лицевой счёт и пополнение баланса' },
    payment: { title: 'Банковские карты', sub: 'Привязанные карты для быстрой оплаты' },
    coupons: { title: 'Купоны и промокоды', sub: 'Активация скидок и баллов' },
    refunds: { title: 'Гарантия и возвраты', sub: 'История возвратов средств' }
  };
  const curMeta = titles[subTab] || titles.pay;

  let initialContent = '';
  if (subTab === 'pay') {
    initialContent = _renderPayTabHtml();
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
    <div class="page-enter px-4 max-w-md mx-auto">
      
      <!-- Шапка: Кнопка Назад и Заголовок -->
      <div class="flex items-center gap-3 mb-4">
        <button id="backFromFinancesBtn" onclick="window.backFromFinances()" class="global-back-btn !mb-0" title="Назад в профиль">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 id="financesHeaderTitle" class="text-xl font-bold text-white tracking-wide">${curMeta.title}</h2>
          <p id="financesHeaderSub" class="text-[11px] text-white/40">${curMeta.sub}</p>
        </div>
      </div>

      <!-- Сегментированная навигация по подразделам с четкими SVG-иконками -->
      <div class="grid grid-cols-4 gap-1 mb-5 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md">
        <button
          id="financesTabPay"
          type="button"
          onclick="window.switchFinancesSubTab('pay')"
          class="w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'pay'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span class="truncate">ICE LOGIX PAY</span>
        </button>

        <button
          id="financesTabPayment"
          type="button"
          onclick="window.switchFinancesSubTab('payment')"
          class="w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 ${
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
          class="w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'coupons'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
          <span class="truncate">Купоны</span>
        </button>

        <button
          id="financesTabRefunds"
          type="button"
          onclick="window.switchFinancesSubTab('refunds')"
          class="w-full py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 ${
            subTab === 'refunds'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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

  bindTab('financesTabPay', 'pay');
  bindTab('financesTabPayment', 'payment');
  bindTab('financesTabCoupons', 'coupons');
  bindTab('financesTabRefunds', 'refunds');

  const curSub = window._financesSubTab || 'pay';
  if (curSub === 'pay') _attachPayTabHandlers();
  else if (curSub === 'payment') _attachPaymentTabHandlers();
  else if (curSub === 'coupons') _attachCouponsTabHandlers();
}

window.renderFinances = renderFinances;
window.attachFinancesHandlers = attachFinancesHandlers;
window.switchFinancesSubTab = switchFinancesSubTab;
window._renderFinancesCardsOnly = _renderFinancesCardsOnly;

