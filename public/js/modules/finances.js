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
    return window.UI.empty({ icon: 'card', title: 'Карт пока нет', text: 'Привяжите карту, чтобы оплачивать заказы в один тап. Подходят Белкарт, Visa, Mastercard и МИР.', action: 'Привязать карту', actionId: 'financesAddCardFirstBtn', onclick: 'window.openFinancesAddCard()' });
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
          ? `bg-gradient-to-br ${bankCfg.cardGradient} border ${bankCfg.cardBorder} ${bankCfg.cardGlow} ${isDef ? 'fn-def' : ''}`
          : (isDef
              ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-cyan-950 border border-cyan-400/40 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10'
              : 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-white/15 shadow-xl shadow-black/70 ring-1 ring-white/5');

        return `
          <div class="space-y-2">
            <!-- Пластиковая банковская карта (ISO ID-1, пропорции 1.586 : 1, компактная ширина 315px) -->
            <div class="fn-bankcard relative w-full aspect-[1.586/1] max-w-[340px] mx-auto rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden select-none transition-all duration-300 ${cardBgClass}">
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
              <div class="fn-manage">
                ${!isDef ? `<button type="button" class="rd-btn rd-btn-sm rd-btn-tonal" onclick="window.setDefaultCard('${c.id}')">${window.UI.icon('star', 16)}Сделать основной</button>` : ''}
                <button type="button" class="rd-btn rd-btn-sm fn-del" onclick="window.deleteCard('${c.id}')">${window.UI.icon('trash', 16)}Удалить</button>
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
    <div class="rd-section fn-sec">
      <h2>Мои карты</h2>
      ${cards.length > 0 ? `<button type="button" id="financesManageBtn" onclick="window.toggleFinancesManage()" class="rd-link">${manageMode ? 'Готово' : 'Изменить'}</button>` : ''}
    </div>

    ${_renderCardsListHtml(cards, manageMode)}

    ${cards.length > 0 && cards.length < 5 ? `
      <button type="button" id="financesAddCardBottomBtn" onclick="window.openFinancesAddCard()" class="fn-add">${window.UI.icon('plus', 18)}Привязать ещё одну карту</button>
    ` : ''}

    ${cards.length >= 5 ? `<div class="fn-limit">${window.UI.icon('info', 16)}Можно привязать до 5 карт</div>` : ''}
  `;

  _attachPaymentTabHandlers();
}

// HTML вкладки «Оплата»
function _renderPaymentTabHtml() {
  const cards = Array.isArray(window.userCards) ? window.userCards : [];
  const manageMode = window._financesManageMode;

  return `
    <div id="financesCardsSection" class="fn-cards">
    <div class="rd-section fn-sec">
      <h2>Мои карты</h2>
      ${cards.length > 0 ? `<button type="button" id="financesManageBtn" onclick="window.toggleFinancesManage()" class="rd-link">${manageMode ? 'Готово' : 'Изменить'}</button>` : ''}
    </div>

    ${_renderCardsListHtml(cards, manageMode)}

    ${cards.length > 0 && cards.length < 5 ? `
      <button type="button" id="financesAddCardBottomBtn" onclick="window.openFinancesAddCard()" class="fn-add">${window.UI.icon('plus', 18)}Привязать ещё одну карту</button>
    ` : ''}

    ${cards.length >= 5 ? `<div class="fn-limit">${window.UI.icon('info', 16)}Можно привязать до 5 карт</div>` : ''}
    </div>
  `;
}

// HTML вкладки «Купоны»
function _renderCouponsTabHtml(stats) {
  const U = window.UI;
  const totalSpentByn = stats?.totalSpentByn || 0;
  const ordersCount = stats?.ordersCount || 0;
  return `
    ${totalSpentByn > 0 ? `
      <div class="fn-spent">
        <div><span>Выкуплено через ICE LOGIX</span><b>${U.money(totalSpentByn, { keepCents: true, digits: 2 })}</b></div>
        <span class="rd-pill">${ordersCount} ${ordersCount % 10 === 1 && ordersCount % 100 !== 11 ? 'заказ' : (ordersCount % 10 >= 2 && ordersCount % 10 <= 4 && (ordersCount % 100 < 10 || ordersCount % 100 >= 20)) ? 'заказа' : 'заказов'}</span>
      </div>` : ''}
    <div class="rd-card fn-promo">
      <div class="fn-promo-h">${U.icon('tag', 20)}<b>Промокод</b></div>
      <p>Введите код из нашего канала или от друга, чтобы получить скидку.</p>
      <div class="fn-promo-row">
        <div class="rd-field"><input type="text" id="couponInput" placeholder="Например, ICE2026" autocomplete="off" autocapitalize="characters"></div>
        <button type="button" id="applyCouponBtn" class="rd-btn">Применить</button>
      </div>
      <div id="couponMsg" class="fn-msg hidden"></div>
    </div>
    ${U.empty({ icon: 'gift', title: 'Активных купонов нет', text: 'Промокоды на скидки регулярно появляются в нашем Telegram-канале.' })}
  `;
}

// Загрузка статистики для вкладки «Купоны»
async function _loadCouponsData() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  let totalSpentByn = 0;
  let ordersCount = 0;
  if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data } = await supabaseClient.from('orders').select('id, total_byn, price_byn, status').eq('user_id', curUserId).not('status', 'in', '(cancelled,refunded)');
      if (data) {
        ordersCount = data.length;
        data.forEach(o => {
          const paid = Number(o.total_byn || o.price_byn || 0);
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
  const U = window.UI;
  const items = Array.isArray(refundItems) ? refundItems : [];
  return `
    <div class="rd-card fn-guard">
      <span class="fn-guard-ico">${U.icon('shield', 22)}</span>
      <div>
        <b>Деньги возвращаются полностью</b>
        <p>Если заказ отменён до выкупа или у продавца не оказалось вещи, вернём всю сумму без комиссий.</p>
        <div class="fn-guard-row"><span>Срок зачисления</span><b>1–3 рабочих дня</b></div>
      </div>
    </div>
    <div class="rd-section"><h2>История возвратов</h2></div>
    ${items.length === 0
      ? U.empty({ icon: 'refresh', title: 'Возвратов не было', text: 'Если что-то пойдёт не так, здесь будет видно каждый возврат.' })
      : `<div class="rd-card hs-txlist">${items.map(rf => `
          <div class="hs-tx">
            <span class="hs-tx-ico in">${U.icon('refresh', 20)}</span>
            <div class="hs-tx-body"><div class="hs-tx-title">${U.esc(rf.reason || 'Возврат средств')}</div><div class="hs-tx-sub">${rf.created_at ? new Date(rf.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : ''}</div></div>
            <span class="hs-tx-amt in">+${U.money(Number(rf.amount || 0), { keepCents: true, digits: 2 })}</span>
          </div>`).join('')}</div>`}
  `;
}

// Загрузка списка возвратов
async function _loadRefundsData() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  let refundItems = [];
  if (curUserId && typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { data } = await supabaseClient.from('refunds').select('*').eq('user_id', curUserId).order('created_at', { ascending: false }).limit(20);
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

  const fam = window.userSettings?.family || {};
  const famRole = fam.role || null;
  const isFamilyActive = Boolean(famRole);
  let familyTitle = 'Семейный баланс';
  let familySub = 'Общий баланс для совместных покупок';
  let familyBalanceDisplay = 'Не подключен';
  let familyBtnText = 'Подключить семью';

  if (famRole === 'head') {
    familyTitle = 'Семейный баланс (Вы — глава)';
    familySub = `В группе: ${(fam.members?.length || 0) + 1} чел.`;
    familyBalanceDisplay = `${curBal.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'emerald', size: '0.9em' }) : ''}`;
    familyBtnText = 'Управление семейной группой';
  } else if (famRole === 'member' && fam.head_id) {
    familyTitle = 'Семейный баланс (Участник)';
    familySub = 'Оплата заказов с единого счёта главы семьи';
    familyBalanceDisplay = 'Счёт главы';
    familyBtnText = 'Настройки семейного аккаунта';
  }

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
            <span class="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight inline-flex items-baseline gap-1" id="payLiveBalance">${curBal.toFixed(2)} ${window.bynSign ? window.bynSign() : ''}</span>
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

      <!-- 2. Семейный баланс в ICE LOGIX PAY -->
      <div class="glass-card p-4 rounded-3xl border border-white/10 space-y-3 bg-gradient-to-br from-slate-900 to-slate-950">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">
              👨‍👩‍👧
            </div>
            <div>
              <p class="font-bold text-white text-sm">${familyTitle}</p>
              <p class="text-[11px] text-white/50">${familySub}</p>
            </div>
          </div>
          <span class="text-xs font-bold font-mono px-2.5 py-1 rounded-full ${isFamilyActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/50'}">
            ${familyBalanceDisplay}
          </span>
        </div>
        <p class="text-xs text-white/60 leading-relaxed">
          ${isFamilyActive 
            ? 'Члены вашей семьи могут выбирать товары, а оплата списывается с единого баланса после одобрения Главы в один клик.' 
            : 'Объединяйте баланс с близкими, друзьями или закупщиками. Оплачивайте совместные посылки с единого счёта!'}
        </p>
        <button type="button" onclick="if (typeof window.showFamilySettingsModal === 'function') window.showFamilySettingsModal();" class="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10">
          <svg class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>${familyBtnText}</span>
        </button>
      </div>

      <!-- 3. Блок пополнения счёта ICE LOGIX PAY -->
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
          <label class="text-[11px] text-white/50 font-medium flex items-center gap-1">Сумма пополнения (${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.9em' }) : ''})</label>
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
          <span class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center font-mono font-bold text-xs text-cyan-400">${window.bynSign ? window.bynSign({ color: 'cyan', size: '1.05em' }) : ''}</span>
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
          <span id="paySubmitBtnText" class="inline-flex items-center gap-1">Пополнить на 50 ${window.bynSign ? window.bynSign() : ''}</span>
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
      submitBtnText.innerHTML = `Пополнить на ${_selectedPayAmount} ${window.bynSign ? window.bynSign() : ''}`;
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
          tgUtil.alert(`Счет в ЕРИП на сумму ${amt} сформирован!`);
        }
      } else if (_selectedPayMethod === 'oplati') {
        if (typeof window.openOplatiPaymentModal === 'function') {
          window.openOplatiPaymentModal(amt);
        } else {
          tgUtil.alert(`QR-код «Оплати» на сумму ${amt} сформирован!`);
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
          await window.applyWalletCredit(amt, 'TOPUP_CARD', `Счёт успешно пополнен на +${amt} с банковской карты!`);
        } else {
          window.balance = (window.balance || 0) + amt;
          const liveB = document.getElementById('payLiveBalance');
          if (liveB) liveB.innerHTML = `${window.balance.toFixed(2)} ${window.bynSign ? window.bynSign() : ''}`;
          if (typeof tgUtil !== 'undefined') tgUtil.alert(`Счёт успешно пополнен на +${amt}!`);
        }

        submitBtn.disabled = false;
        updateAmount(_selectedPayAmount);
      }
    };
  }
}

// Быстрое переключение табов за 0 мс (без перезагрузки экрана)
function switchFinancesSubTab(targetTab) {
  if (targetTab === 'wallet' || targetTab === 'topup' || targetTab === 'pay') {
    if (typeof window.openWallet === 'function') { window.openWallet(); return; }
    targetTab = 'payment';
  }
  window._financesSubTab = targetTab;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
  document.querySelectorAll('.fn-seg button').forEach(btn => btn.classList.toggle('on', btn.dataset.tab === targetTab));

  // 2. Мгновенно подменяем контейнер
  const container = document.getElementById('financesSubContent');
  if (!container) return;

  if (targetTab === 'payment') {
    container.innerHTML = _renderPaymentTabHtml();
    _attachPaymentTabHandlers();
  } else if (targetTab === 'pay') {
    container.innerHTML = _renderPayTabHtml();
    _attachPayTabHandlers();
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
  if (!['payment', 'coupons', 'refunds'].includes(subTab)) subTab = 'payment';
  window._financesSubTab = subTab;

  const curBal = typeof window.balance === 'number' ? window.balance : (parseFloat(window.balance) || 0);
  const U = window.UI;

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

  const seg = [['payment', 'Карты', 'financesTabPayment'], ['coupons', 'Купоны', 'financesTabCoupons'], ['refunds', 'Возвраты', 'financesTabRefunds']];
  return `
    <div class="rd-screen page-enter fn">
      <div class="rd-head">
        <button id="backFromFinancesBtn" type="button" onclick="window.backFromFinances()" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title" id="financesHeaderTitle">Финансы</h1><p class="rd-head-sub" id="financesHeaderSub">Карты, промокоды и возвраты</p></div>
      </div>

      <button type="button" class="fn-wallet" id="financesTabPay" onclick="window.openWallet && window.openWallet()">
        <span class="fn-wallet-ico">${U.icon('wallet', 22)}</span>
        <span class="fn-wallet-body"><span>Кошелёк ICE LOGIX PAY</span><b>${U.money(curBal, { keepCents: true, digits: 2 })}</b></span>
        <span class="fn-wallet-cta">Пополнить${U.icon('chevR', 16)}</span>
      </button>

      <div class="fn-seg" role="tablist">
        ${seg.map(([k, label, id]) => `<button type="button" id="${id}" data-tab="${k}" role="tab" class="${subTab === k ? 'on' : ''}" onclick="window.switchFinancesSubTab('${k}')">${label}</button>`).join('')}
      </div>

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
      if (couponMsg) { couponMsg.textContent = 'Проверяем…'; couponMsg.className = 'fn-msg'; }
      await new Promise(r => setTimeout(r, 600));
      applyCouponBtn.disabled = false;
      applyCouponBtn.textContent = 'Применить';
      if (couponMsg) {
        couponMsg.textContent = 'Промокод не найден или уже использован';
        couponMsg.className = 'fn-msg bad';
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
  else if (curSub === 'coupons') _attachCouponsTabHandlers();
}

window.renderFinances = renderFinances;
window.attachFinancesHandlers = attachFinancesHandlers;
window.switchFinancesSubTab = switchFinancesSubTab;
window._renderFinancesCardsOnly = _renderFinancesCardsOnly;

