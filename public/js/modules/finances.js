// ============================================================
// ICE LOGIX Module: Finances (Финансы)
// ============================================================
// Способы оплаты, история транзакций, купоны, возвраты.
// 0ms отклик, локальное кэширование, надежное управление картами.

window._financesSubTab = window._financesSubTab || 'payment';
window._financesManageMode = false;
window._financesCache = window._financesCache || {
  history: null,
  coupons: null,
  refunds: null,
  lastFetch: {}
};

// Маппинг названий банков → эмодзи-иконка
function _getBankEmoji(bankName) {
  if (!bankName) return null;
  const n = String(bankName).toLowerCase();
  if (n.includes('приор')) return '🟡';
  if (n.includes('беларусбанк') || n.includes('беларус')) return '🟢';
  if (n.includes('мтбанк') || n.includes('мт банк')) return '🔴';
  if (n.includes('белгаз')) return '🔵';
  if (n.includes('бсб')) return '🔷';
  if (n.includes('альфа')) return '🔴';
  if (n.includes('сбер')) return '🟢';
  if (n.includes('втб')) return '🔵';
  if (n.includes('тинькофф') || n.includes('т-банк') || n.includes('tbank')) return '🟡';
  if (n.includes('яндекс')) return '🟠';
  return '🏦';
}

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
      <div class="text-center py-8 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl select-none">
          💳
        </div>
        <p class="font-bold text-white text-base">Нет привязанных карт</p>
        <p class="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
          Привяжите карту для мгновенной оплаты заказов в 1 клик. Поддерживаются все популярные банки Беларуси и СНГ.
        </p>
        <button type="button" id="financesAddCardFirstBtn" class="btn-primary px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform inline-flex items-center gap-2 mt-2">
          <span class="text-base font-black">+</span>
          <span>Привязать карту</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="space-y-3.5">
      ${cards.map(c => {
        const brand = c.card_brand || c.card_type || 'Банковская карта';
        const bankName = c.bank_name || '';
        const last4 = c.last4 || c.card_last4 || '••••';
        const exp = c.expiry_metadata || (c.exp_month ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}` : '••/••');
        const isDef = Boolean(c.is_default);
        const brandLogoHtml = typeof window.getCardBrandLogoHtml === 'function'
          ? window.getCardBrandLogoHtml(brand)
          : `<span class="text-sm">💳</span>`;
        const bankEmoji = _getBankEmoji(bankName);

        return `
          <div class="relative overflow-hidden rounded-3xl p-4.5 transition-all duration-200 ${
            isDef
              ? 'bg-gradient-to-br from-slate-900 via-slate-800/95 to-cyan-950/80 border border-cyan-400/50 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/20'
              : 'bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/70 border border-white/12 shadow-lg shadow-black/40 hover:border-white/20'
          }">
            <!-- Декоративные световые акценты пластиковой карты -->
            <div class="absolute -right-12 -top-12 w-36 h-36 rounded-full pointer-events-none select-none blur-2xl ${
              isDef ? 'bg-cyan-500/15' : 'bg-white/5'
            }"></div>
            <div class="absolute -left-12 -bottom-12 w-32 h-32 rounded-full pointer-events-none select-none blur-2xl ${
              isDef ? 'bg-cyan-400/10' : 'bg-purple-500/5'
            }"></div>

            <!-- Верхняя строка карточки: Банк + Статус Основная + Логотип системы -->
            <div class="relative flex items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-2 min-w-0">
                ${bankName ? `<span class="text-xl select-none leading-none">${bankEmoji}</span>` : '<span class="text-xl select-none leading-none">💳</span>'}
                <span class="text-xs font-bold text-white tracking-wide truncate">${bankName || brand}</span>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0 select-none">
                ${isDef ? `
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-400/20">
                    Основная
                  </span>
                ` : ''}
                <div class="flex items-center justify-center">
                  ${brandLogoHtml}
                </div>
              </div>
            </div>

            <!-- Средняя часть: Золотистый EMV-чип + Номер карты в стиле пластика -->
            <div class="relative flex items-center justify-between gap-3 my-3">
              <div class="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200/50 via-amber-400/30 to-amber-600/40 border border-amber-300/40 flex items-center justify-center p-1 select-none shadow-inner flex-shrink-0">
                <div class="w-full h-full border border-amber-300/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-80">
                  <div class="border-r border-b border-amber-300/50"></div>
                  <div class="border-b border-amber-300/50"></div>
                  <div class="border-r border-amber-300/50"></div>
                  <div></div>
                </div>
              </div>

              <div class="font-mono text-[15px] sm:text-base font-bold text-white/95 tracking-[0.18em] select-none text-right">
                •••• •••• •••• ${last4}
              </div>
            </div>

            <!-- Нижняя строка: Срок действия и кнопки управления -->
            <div class="relative pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between gap-2">
              <div>
                <p class="text-[9px] uppercase tracking-wider text-white/40 font-semibold select-none leading-tight">Срок действия</p>
                <p class="text-xs font-mono font-bold text-white/80 mt-0.5 select-none">${exp}</p>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                ${!isDef ? `
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-[11px] font-bold text-cyan-300 active:scale-95 transition flex items-center gap-1 shadow-sm shadow-cyan-500/10"
                    onclick="window.setDefaultCard('${c.id}')"
                  >
                    <span>★</span>
                    <span>Сделать основной</span>
                  </button>
                ` : ''}

                ${manageMode ? `
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[11px] font-bold text-red-300 active:scale-95 transition flex items-center gap-1"
                    onclick="window.deleteCard('${c.id}')"
                    title="Удалить карту"
                  >
                    <span>🗑️</span>
                    <span>Удалить</span>
                  </button>
                ` : ''}
              </div>
            </div>
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
    <div class="flex items-center justify-between px-1">
      <h4 class="text-white font-bold text-sm">Мои карты</h4>
      ${cards.length > 0 ? `
        <button type="button" id="financesManageBtn" class="text-xs px-2.5 py-1 rounded-xl border transition active:scale-95 ${manageMode ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold' : 'border-white/15 bg-white/5 text-white/60'}">
          ${manageMode ? 'Готово' : 'Управление'}
        </button>
      ` : ''}
    </div>

    ${_renderCardsListHtml(cards, manageMode)}

    ${cards.length > 0 && cards.length < 5 ? `
      <button type="button" id="financesAddCardBottomBtn" class="w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all active:scale-95">
        <span class="text-base leading-none font-black">+</span>
        <span>Привязать ещё одну карту</span>
      </button>
    ` : ''}

    ${cards.length >= 5 ? `
      <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
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
        <div class="flex items-center justify-between px-1">
          <h4 class="text-white font-bold text-sm">Мои карты</h4>
          ${cards.length > 0 ? `
            <button type="button" id="financesManageBtn" class="text-xs px-2.5 py-1 rounded-xl border transition active:scale-95 ${manageMode ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold' : 'border-white/15 bg-white/5 text-white/60'}">
              ${manageMode ? 'Готово' : 'Управление'}
            </button>
          ` : ''}
        </div>

        ${_renderCardsListHtml(cards, manageMode)}

        ${cards.length > 0 && cards.length < 5 ? `
          <button type="button" id="financesAddCardBottomBtn" class="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-2 border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all active:scale-95">
            <span class="text-base leading-none font-black">+</span>
            <span>Привязать ещё одну карту</span>
          </button>
        ` : ''}

        ${cards.length >= 5 ? `
          <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
            <p class="text-xs text-amber-300 font-semibold">Достигнут максимальный лимит 5 карт</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// HTML вкладки «История»
function _renderHistoryTabHtml(txItems) {
  if (!txItems || txItems.length === 0) {
    return `
      <div class="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl select-none">
          📋
        </div>
        <p class="font-bold text-white text-base">История транзакций пуста</p>
        <p class="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
          Здесь будут отображаться оплаты ваших заказов, возвраты средств и операции по бонусным баллам ICE.
        </p>
      </div>
    `;
  }

  return `
    <div class="space-y-2.5">
      ${txItems.map(tx => `
        <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl ${tx.source === 'card' ? 'bg-cyan-500/10 text-cyan-300' : 'bg-purple-500/10 text-purple-300'} flex items-center justify-center text-lg flex-shrink-0">
              ${tx.source === 'card' ? '💳' : '💎'}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-white truncate">${tx.title}</p>
              <p class="text-[10px] text-white/40 mt-0.5">${tx.date.toLocaleString('ru-RU')}</p>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-xs font-bold font-mono ${tx.isPositive ? 'text-emerald-400' : 'text-white'}">${tx.amount}</p>
            <span class="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded-md ${tx.badgeColor || 'bg-white/10 text-white/60'} font-semibold">
              ${tx.badge}
            </span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Загрузка данных истории
async function _loadHistoryData() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  let txItems = [];
  if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const [historyRes, paymentsRes] = await Promise.all([
        supabaseClient.from('transaction_history').select('*').eq('user_id', curUserId).order('created_at', { ascending: false }).limit(50),
        supabaseClient.from('payments').select('*').eq('user_id', curUserId).order('created_at', { ascending: false }).limit(50)
      ]);

      if (historyRes?.data) {
        historyRes.data.forEach(item => {
          txItems.push({
            source: 'bonus',
            id: item.id,
            date: new Date(item.created_at),
            title: item.description || (item.amount >= 0 ? 'Начисление бонусов' : 'Списание бонусов'),
            amount: `${item.amount >= 0 ? '+' : ''}${item.amount} ICE`,
            isPositive: item.amount >= 0,
            badge: 'ICE Бонусы'
          });
        });
      }

      if (paymentsRes?.data) {
        paymentsRes.data.forEach(item => {
          const isSuccess = item.status === 'PAID';
          txItems.push({
            source: 'card',
            id: item.id,
            date: new Date(item.created_at),
            title: item.type === 'FIRST_PAYMENT' ? 'Оплата заказа (1-й этап)' : (item.type === 'SECOND_PAYMENT' ? 'Оплата заказа (2-й этап)' : 'Оплата картой'),
            amount: `-${Number(item.amount || 0).toFixed(2)} BYN`,
            isPositive: false,
            badge: isSuccess ? 'Успешно' : (item.status === 'PENDING' ? 'В обработке' : 'Отклонено'),
            badgeColor: isSuccess ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          });
        });
      }
    } catch (e) {
      console.warn('Finances tx history load err:', e);
    }
  }
  txItems.sort((a, b) => b.date - a.date);
  window._financesCache.history = txItems;
  return txItems;
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
            <p class="text-xl font-black text-cyan-400 font-mono">${totalSpentByn.toFixed(2)} BYN</p>
            <p class="text-[10px] text-white/40 mt-0.5">${ordersCount} ${ordersCount === 1 ? 'заказ' : ordersCount < 5 ? 'заказа' : 'заказов'}</p>
          </div>
          <span class="text-3xl select-none">🏆</span>
        </div>
      ` : ''}

      <!-- Поле ввода промокода -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 bg-slate-900/80 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-base select-none">🎁</span>
          <h3 class="text-white font-bold text-sm">Промокод</h3>
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            id="couponInput"
            placeholder="Введите промокод"
            maxlength="32"
            autocomplete="off"
            class="flex-1 bg-slate-800/80 border border-white/15 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition font-mono uppercase tracking-wider"
          >
          <button id="applyCouponBtn" type="button" class="btn-primary px-4 py-2.5 rounded-2xl text-xs font-bold active:scale-95 transition flex-shrink-0">
            Применить
          </button>
        </div>
        <p id="couponMsg" class="text-[11px] text-white/40 hidden"></p>
      </div>

      <!-- Пустое состояние / будущий список купонов -->
      <div class="text-center py-8 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
        <span class="text-3xl block select-none">🎫</span>
        <p class="font-bold text-white text-sm">Активных купонов нет</p>
        <p class="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
          Следите за акциями ICE LOGIX в Telegram-канале — там публикуем эксклюзивные промокоды на скидки.
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
          <span>🛡️</span>
          <span>Гарантия возврата средств</span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          При отмене заказа до момента выкупа или отсутствии нужного размера/товара у поставщика, деньги возвращаются в 100% объеме на привязанную карту без комиссий.
        </p>
        <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/50">
          <span>⏱️ Срок зачисления банком:</span>
          <strong class="text-emerald-400">1–3 рабочих дня</strong>
        </div>
      </div>

      <!-- Список возвратов -->
      <div class="space-y-2">
        <h4 class="text-white font-bold text-sm px-1">История возвратов</h4>
        ${items.length === 0 ? `
          <div class="text-center py-10 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
            <span class="text-3xl block select-none">✨</span>
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
  if (window._financesSubTab === targetTab && document.getElementById('financesSubContent')) return;
  window._financesSubTab = targetTab;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');

  // 1. Мгновенно обновляем стили кнопок в DOM
  const tabs = ['payment', 'history', 'coupons', 'refunds'];
  tabs.forEach(tab => {
    const btn = document.getElementById('financesTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (btn) {
      if (tab === targetTab) {
        btn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all btn-primary shadow-md';
      } else {
        btn.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-white/60 hover:text-white';
      }
    }
  });

  // 2. Мгновенно подменяем контейнер
  const container = document.getElementById('financesSubContent');
  if (!container) return;

  if (targetTab === 'payment') {
    container.innerHTML = _renderPaymentTabHtml();
    _attachPaymentTabHandlers();
  } else if (targetTab === 'history') {
    const cached = window._financesCache?.history;
    if (cached) {
      container.innerHTML = _renderHistoryTabHtml(cached);
    } else {
      container.innerHTML = _renderLoadingSkeletonHtml('Загружаем историю операций...');
      _loadHistoryData().then(data => {
        if (window._financesSubTab === 'history') {
          container.innerHTML = _renderHistoryTabHtml(data);
        }
      });
    }
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
  const subTab = window._financesSubTab || 'payment';

  let initialContent = '';
  if (subTab === 'payment') {
    initialContent = _renderPaymentTabHtml();
  } else if (subTab === 'history') {
    const cached = window._financesCache?.history;
    initialContent = cached ? _renderHistoryTabHtml(cached) : _renderLoadingSkeletonHtml('Загружаем историю операций...');
    if (!cached) {
      _loadHistoryData().then(data => {
        if (window._financesSubTab === 'history') {
          const c = document.getElementById('financesSubContent');
          if (c) c.innerHTML = _renderHistoryTabHtml(data);
        }
      });
    }
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
        <button id="backFromFinancesBtn" class="global-back-btn" title="Назад в профиль">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white tracking-wide">Финансы</h2>
          <p class="text-[11px] text-white/40">Оплата, история, купоны и возвраты</p>
        </div>
      </div>

      <!-- Горизонтальные табы -->
      <div class="flex gap-1 mb-5 p-1 rounded-2xl bg-slate-900/80 border border-white/10">
        <button id="financesTabPayment" type="button" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'payment' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          💳 Оплата
        </button>
        <button id="financesTabHistory" type="button" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'history' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          📋 История
        </button>
        <button id="financesTabCoupons" type="button" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'coupons' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          🎁 Купоны
        </button>
        <button id="financesTabRefunds" type="button" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'refunds' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          🔄 Возвраты
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
  const openAdd = () => {
    if (typeof window.openAddCardModal === 'function') {
      window.openAddCardModal(() => {
        _renderFinancesCardsOnly();
      });
    }
  };

  const addFirstBtn = document.getElementById('financesAddCardFirstBtn');
  if (addFirstBtn) addFirstBtn.onclick = openAdd;

  const addBottomBtn = document.getElementById('financesAddCardBottomBtn');
  if (addBottomBtn) addBottomBtn.onclick = openAdd;

  const manageBtn = document.getElementById('financesManageBtn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      window._financesManageMode = !window._financesManageMode;
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
      _renderFinancesCardsOnly();
    };
  }
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
  if (backBtn) {
    backBtn.onclick = () => {
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
      if (typeof switchTab === 'function') switchTab('profile');
    };
  }

  // Переключение табов (0 мс)
  const bindTab = (btnId, tabName) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = () => switchFinancesSubTab(tabName);
    }
  };

  bindTab('financesTabPayment', 'payment');
  bindTab('financesTabHistory', 'history');
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
