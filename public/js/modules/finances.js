// ============================================================
// ICE LOGIX Module: Finances (Финансы)
// ============================================================
// Способы оплаты, история транзакций, купоны, возвраты.

window._financesSubTab = window._financesSubTab || 'payment';
window._financesManageMode = false;

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

async function renderFinances() {
  const curUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  const subTab = window._financesSubTab || 'payment';

  // Убедимся, что карты загружены
  if (typeof window.loadUserCards === 'function') {
    try { await window.loadUserCards(); } catch (_) {}
  }
  const cards = Array.isArray(window.userCards) ? window.userCards : [];

  let subContentHtml = '';

  // ==================== Вкладка: СПОСОБЫ ОПЛАТЫ ====================
  if (subTab === 'payment') {
    // Карточки сохраненных карт
    let cardsListHtml = '';
    if (cards.length === 0) {
      cardsListHtml = `
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
    } else {
      cardsListHtml = `
        <div class="space-y-2.5">
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
            const manageMode = window._financesManageMode;

            return `
              <div class="p-3.5 rounded-2xl transition-all ${isDef ? 'bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-500/50 shadow-md shadow-cyan-500/10' : 'bg-slate-900/80 border border-white/10'} flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="flex items-center gap-2 flex-shrink-0 select-none">
                    ${bankName ? `<span class="text-xl select-none leading-none">${bankEmoji}</span>` : ''}
                    <div class="flex items-center justify-center select-none flex-shrink-0">
                      ${brandLogoHtml}
                    </div>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs font-bold text-white truncate">${bankName || brand}</span>
                      ${isDef ? '<span class="text-[9px] text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/40">Основная</span>' : ''}
                    </div>
                    <p class="text-[10px] text-white/40 mt-0.5 font-mono">•••• ${last4} · ${exp}</p>
                  </div>
                </div>
                ${manageMode ? `
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    ${!isDef ? `
                      <button type="button" class="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[10px] text-cyan-300 font-semibold transition active:scale-95" onclick="window.setDefaultCard('${c.id}')">
                        Основная
                      </button>
                    ` : `<span class="text-[10px] text-cyan-400/60 px-1 font-medium">✓ осн.</span>`}
                    <button type="button" class="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 transition active:scale-95" onclick="window.deleteCard('${c.id}')" title="Удалить">
                      🗑️
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    subContentHtml = `
      <div class="space-y-4">
        
        <!-- Карточка: Безопасный эквайринг bePaid -->
        <div class="glass-card p-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base select-none">🔒</span>
              <h3 class="text-white font-bold text-sm">Платежная система bePaid</h3>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
              PCI DSS L1
            </span>
          </div>

          <!-- Линейка логотипов (стиль WB: чистый ряд без фона) -->
          <div class="flex items-center justify-center gap-4 py-2 select-none">
            <img src="/assets/payment-methods/visa.webp" alt="VISA" class="h-3.5 w-auto object-contain select-none" loading="lazy">
            <img src="/assets/payment-methods/mastercard.webp" alt="Mastercard" class="h-4 w-auto object-contain select-none" loading="lazy">
            <img src="/assets/payment-methods/belkart.webp" alt="Белкарт" class="h-4 w-auto object-contain select-none" loading="lazy">
            <img src="/assets/payment-methods/mir.webp" alt="МИР" class="h-3.5 w-auto object-contain select-none" loading="lazy">
            <img src="/assets/payment-methods/unionpay.webp" alt="UnionPay" class="h-4 w-auto object-contain select-none" loading="lazy">
          </div>

          <!-- Преимущества и условия -->
          <div class="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-white/60">
            <div class="flex items-start gap-2">
              <span class="text-cyan-400 text-xs mt-0.5">•</span>
              <span><strong>Оплата в 2 этапа:</strong> 70% при оформлении заказа и 30% при поступлении товара на склад в Беларусь.</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-cyan-400 text-xs mt-0.5">•</span>
              <span><strong>Полная безопасность:</strong> данные карт токенизируются сертифицированным эквайером Беларуси.</span>
            </div>
          </div>
        </div>

        <!-- Раздел: Привязанные карты -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h4 class="text-white font-bold text-sm">Мои карты</h4>
            <div class="flex items-center gap-2">
              ${cards.length < 5 ? `
                <button type="button" id="financesAddCardInlineBtn" class="text-xs text-cyan-400 font-semibold flex items-center gap-1 active:scale-95 transition">
                  <span class="text-base font-black leading-none">+</span>
                  <span>Добавить</span>
                </button>
              ` : ''}
              ${cards.length > 0 ? `
                <button type="button" id="financesManageBtn" class="text-xs px-2.5 py-1 rounded-xl border transition active:scale-95 ${window._financesManageMode ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : 'border-white/15 bg-white/5 text-white/60'}">
                  ${window._financesManageMode ? 'Готово' : 'Управление'}
                </button>
              ` : ''}
            </div>
          </div>

          ${cardsListHtml}

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
        </div>

      </div>
    `;

  // ==================== Вкладка: ИСТОРИЯ ТРАНЗАКЦИЙ ====================
  } else if (subTab === 'history') {
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

    // Сортировка по дате
    txItems.sort((a, b) => b.date - a.date);

    if (txItems.length === 0) {
      subContentHtml = `
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
    } else {
      subContentHtml = `
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

  // ==================== Вкладка: КУПОНЫ И ПРОМОКОДЫ ====================
  } else if (subTab === 'coupons') {
    // Загружаем статистику покупок для отображения в шапке
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

    subContentHtml = `
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

  // ==================== Вкладка: ВОЗВРАТЫ ====================
  } else if (subTab === 'refunds') {
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

    subContentHtml = `
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
          ${refundItems.length === 0 ? `
            <div class="text-center py-10 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-2">
              <span class="text-3xl block select-none">✨</span>
              <p class="font-bold text-white text-sm">Возвратов пока не было</p>
              <p class="text-xs text-white/40 max-w-xs mx-auto">
                Все ваши средства и покупки в полной безопасности.
              </p>
            </div>
          ` : `
            <div class="space-y-2">
              ${refundItems.map(rf => `
                <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 flex justify-between items-center">
                  <div>
                    <p class="text-xs font-bold text-white">${rf.reason || 'Возврат средств'}</p>
                    <p class="text-[10px] text-white/40 mt-0.5">ID: ${rf.id.slice(0, 8)}</p>
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

  // Общий каркас страницы
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
        <button id="financesTabPayment" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'payment' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          💳 Оплата
        </button>
        <button id="financesTabHistory" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'history' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          📋 История
        </button>
        <button id="financesTabCoupons" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'coupons' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          🎁 Купоны
        </button>
        <button id="financesTabRefunds" class="flex-1 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'refunds' ? 'btn-primary shadow-md' : 'text-white/60 hover:text-white'}">
          🔄 Возвраты
        </button>
      </div>

      <!-- Контент активного подраздела -->
      <div id="financesSubContent">
        ${subContentHtml}
      </div>

    </div>
  `;
}

function attachFinancesHandlers() {
  // Назад в профиль
  const backBtn = document.getElementById('backFromFinancesBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      tgUtil.haptic('light');
      switchTab('profile');
    };
  }

  // Переключение табов
  const bindTab = (btnId, tabName) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = () => {
        if (window._financesSubTab === tabName) return;
        window._financesSubTab = tabName;
        tgUtil.haptic('light');
        if (typeof renderCurrentScreen === 'function') {
          renderCurrentScreen();
        } else {
          switchTab('finances');
        }
      };
    }
  };

  bindTab('financesTabPayment', 'payment');
  bindTab('financesTabHistory', 'history');
  bindTab('financesTabCoupons', 'coupons');
  bindTab('financesTabRefunds', 'refunds');

  // Кнопка Управление картами
  const manageBtn = document.getElementById('financesManageBtn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      window._financesManageMode = !window._financesManageMode;
      tgUtil.haptic('light');
      if (typeof renderCurrentScreen === 'function') {
        renderCurrentScreen();
      } else {
        switchTab('finances');
      }
    };
  }

  // Кнопка применить промокод
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
      // Заглушка — реальная логика будет подключена позже
      await new Promise(r => setTimeout(r, 800));
      applyCouponBtn.disabled = false;
      applyCouponBtn.textContent = 'Применить';
      if (couponMsg) {
        couponMsg.textContent = 'Промокод не найден или уже использован';
        couponMsg.className = 'text-[11px] text-red-400';
        couponMsg.classList.remove('hidden');
      }
      tgUtil.haptic('light');
    };
    applyCouponBtn.onclick = applyPromo;
    couponInput.onkeydown = (e) => { if (e.key === 'Enter') applyPromo(); };
  }

  // Кнопки привязки карты
  const openAdd = () => {
    if (typeof window.openAddCardModal === 'function') {
      window.openAddCardModal(() => {
        if (typeof renderCurrentScreen === 'function') {
          renderCurrentScreen();
        } else {
          switchTab('finances');
        }
      });
    }
  };

  const addFirstBtn = document.getElementById('financesAddCardFirstBtn');
  if (addFirstBtn) addFirstBtn.onclick = openAdd;

  const addInlineBtn = document.getElementById('financesAddCardInlineBtn');
  if (addInlineBtn) addInlineBtn.onclick = openAdd;

  const addBottomBtn = document.getElementById('financesAddCardBottomBtn');
  if (addBottomBtn) addBottomBtn.onclick = openAdd;
}

window.renderFinances = renderFinances;
window.attachFinancesHandlers = attachFinancesHandlers;
