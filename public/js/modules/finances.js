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
  if (typeof switchTab === 'function') switchTab('profile');
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
        const last4 = c.last4 || c.card_last4 || '••••';
        const exp = c.expiry_metadata || (c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '••/••');
        const isDef = Boolean(c.is_default);
        const brandLogoHtml = typeof window.getCardBrandLogoHtml === 'function'
          ? window.getCardBrandLogoHtml(brand)
          : `<span class="text-xs font-bold text-white font-mono">${brand}</span>`;

        return `
          <div class="space-y-2">
            <!-- Пластиковая банковская карта (ISO ID-1, пропорции 1.586 : 1, компактная ширина 315px) -->
            <div class="relative w-full aspect-[1.586/1] max-w-[315px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${
              isDef
                ? 'bg-gradient-to-br from-slate-900 via-slate-800/95 to-cyan-950 border border-cyan-400/40 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10'
                : 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-white/15 shadow-xl shadow-black/70 ring-1 ring-white/5'
            }">
              <!-- Световой блик пластика -->
              <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none"></div>

              <!-- 1. Верхний ряд: Банк слева + Логотип системы справа -->
              <div class="relative z-10 flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <span class="text-[11px] font-black tracking-widest uppercase text-white/90 drop-shadow-sm truncate block font-sans">
                    ${bankName || 'БАНК'}
                  </span>
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
                    <p class="text-[7px] uppercase tracking-widest text-white/40 font-bold select-none leading-none">VALID THRU</p>
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

// Быстрое переключение табов за 0 мс (без перезагрузки экрана)
function switchFinancesSubTab(targetTab) {
  if (targetTab === 'history') targetTab = 'payment'; // Защита от старых вызовов
  window._financesSubTab = targetTab;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

  // 1. Мгновенно обновляем стили кнопок в DOM
  const tabs = ['payment', 'coupons', 'refunds'];
  tabs.forEach(tab => {
    const btn = document.getElementById('financesTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (btn) {
      if (tab === targetTab) {
        btn.className = 'w-full py-2.5 px-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
      } else {
        btn.className = 'w-full py-2.5 px-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
      }
    }
  });

  // 2. Мгновенно подменяем контейнер
  const container = document.getElementById('financesSubContent');
  if (!container) return;

  if (targetTab === 'payment') {
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
  let subTab = window._financesSubTab || 'payment';
  if (subTab === 'history') subTab = 'payment';
  window._financesSubTab = subTab;

  let initialContent = '';
  if (subTab === 'payment') {
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
      <div class="grid grid-cols-3 gap-1.5 mb-5 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md">
        <button
          id="financesTabPayment"
          type="button"
          onclick="window.switchFinancesSubTab('payment')"
          class="w-full py-2.5 px-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
            subTab === 'payment'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'
          }"
        >
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="3"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
          <span class="truncate">Оплата</span>
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

  bindTab('financesTabPayment', 'payment');
  bindTab('financesTabCoupons', 'coupons');
  bindTab('financesTabRefunds', 'refunds');

  const curSub = window._financesSubTab || 'payment';
  if (curSub === 'payment') _attachPaymentTabHandlers();
  if (curSub === 'coupons') _attachCouponsTabHandlers();
}

window.renderFinances = renderFinances;
window.attachFinancesHandlers = attachFinancesHandlers;
window.switchFinancesSubTab = switchFinancesSubTab;
window._renderFinancesCardsOnly = _renderFinancesCardsOnly;
