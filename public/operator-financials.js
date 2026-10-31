// =============================================================================
// ICE LOGIX - OPERATOR FINANCIALS & RECONCILIATION DASHBOARD
// Version: 2026.06.01.01 (ТЗ v1.0, Разделы 8, 11, 13, 25, 30, 39, 40)
// =============================================================================

(function() {
  'use strict';

  // --- 3. Модальное окно сверки конкретного заказа (Раздел 30, 39 ТЗ) ---
  window.openOrderReconciliationModal = async function(orderId) {
    if (window.tgUtil) window.tgUtil.haptic('light');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
    modal.id = 'orderReconModal';

    modal.innerHTML = `
      <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-purple-500/30 transform transition-all duration-300 scale-95 opacity-0" id="orderReconContent">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔍</span>
            <div>
              <h3 class="text-white font-bold text-sm">Финансовая сверка заказа</h3>
              <p class="text-[10px] text-purple-400 font-mono">#${orderId.slice(0, 8)}</p>
            </div>
          </div>
          <button id="closeOrderReconBtn" class="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="orderReconBody" class="space-y-3 text-xs">
          <div class="flex items-center justify-center py-8">
            <span class="animate-spin text-2xl">⏳</span>
            <span class="ml-2 text-white/70">Выполняется сверка...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      const el = document.getElementById('orderReconContent');
      if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
    });

    const close = () => {
      const el = document.getElementById('orderReconContent');
      if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
      setTimeout(() => modal.remove(), 250);
    };
    document.getElementById('closeOrderReconBtn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    try {
      const [ordRes, payRes, balRes] = await Promise.all([
        window.supabaseClient.from('orders').select('*').eq('id', orderId).single(),
        window.supabaseClient.from('payments').select('*').eq('order_id', orderId),
        window.supabaseClient.from('balance_entries').select('*').eq('order_id', orderId)
      ]);

      const order = ordRes.data || {};
      const payments = payRes.data || [];
      const balanceEntries = balRes.data || [];

      let totalInflow = 0;
      payments.forEach(p => { if (p.status === 'succeeded' || p.status === 'PAID') totalInflow += Number(p.amount || 0); });
      balanceEntries.forEach(b => {
        if (b.operation_type === 'PAYMENT_DEBIT' || (b.type === 'DEBIT' && b.direction === 'DEBIT')) {
          totalInflow += Math.abs(Number(b.amount || 0));
        }
      });

      let totalOutflow = Number(order.total_byn || 0);
      let refunds = 0;
      let surplusCredited = 0;

      balanceEntries.forEach(b => {
        if (b.operation_type === 'DELIVERY_SURPLUS' || b.operation_type === 'PRICE_DROP_REFUND' || b.reason === 'DELIVERY_SURPLUS') {
          surplusCredited += Math.abs(Number(b.amount || 0));
        }
      });

      const delta = Math.round((totalInflow - totalOutflow - refunds - surplusCredited) * 100) / 100;
      const isMatched = Math.abs(delta) <= 0.05;

      const statusBadge = isMatched
        ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">🟢 Сходимость подтверждена (MATCHED)</span>'
        : '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">🔴 Проблемный заказ (PROBLEM_ORDER)</span>';

      document.getElementById('orderReconBody').innerHTML = `
        <div class="text-center pb-2 border-b border-white/10">
          ${statusBadge}
        </div>

        <div class="bg-white/5 p-3 rounded-xl space-y-1.5 border border-white/10">
          <div class="flex justify-between">
            <span class="text-white/70">Получено от клиента:</span>
            <span class="font-mono font-bold text-cyan-400 inline-flex items-baseline gap-1">${totalInflow.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/70">Подтвержденные расходы:</span>
            <span class="font-mono font-bold text-white inline-flex items-baseline gap-1">${totalOutflow.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</span>
          </div>
          ${surplusCredited > 0 ? `
          <div class="flex justify-between text-green-400">
            <span>Начислено на баланс:</span>
            <span class="font-mono inline-flex items-baseline gap-1">+${surplusCredited.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'emerald', size: '0.85em' }) : ''}</span>
          </div>` : ''}
          <div class="flex justify-between border-t border-white/10 pt-1.5 font-bold">
            <span>Дельта равенства (Раздел 39):</span>
            <span class="font-mono ${isMatched ? 'text-green-400' : 'text-red-400'} inline-flex items-baseline gap-1">${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</span>
          </div>
        </div>

        ${!isMatched ? `
        <div class="bg-red-500/10 border border-red-500/30 p-3 rounded-xl space-y-2">
          <p class="font-bold text-red-300">⚠️ Зафиксировано расхождение</p>
          <p class="text-[11px] text-white/70">Сумма внесенных средств отличается от итоговых расходов на ${Math.abs(delta).toFixed(2)}.</p>
          <input type="text" id="reconResolveComment" class="w-full p-2 rounded-lg bg-black/40 border border-white/20 text-white text-xs" placeholder="Обоснование оператора для закрытия...">
          <button id="reconResolveBtn" class="w-full btn-secondary bg-red-600/50 hover:bg-red-600 text-white py-2 rounded-lg font-bold text-xs transition">
            🛠️ Утвердить решение и закрыть
          </button>
        </div>` : `
        <p class="text-[11px] text-green-400/80 text-center">Все финансовые операции по заказу полностью сходятся копейка в копейку.</p>
        `}
      `;

      const resolveBtn = document.getElementById('reconResolveBtn');
      if (resolveBtn) {
        resolveBtn.onclick = async () => {
          const comment = document.getElementById('reconResolveComment').value.trim();
          if (!comment) {
            if (window.tgUtil) window.tgUtil.alert('Введите комментарий с обоснованием');
            return;
          }
          resolveBtn.disabled = true;
          resolveBtn.innerText = 'Сохранение...';
          const { error: evErr } = await window.supabaseClient.from('order_events').insert({
            order_id: orderId,
            actor_type: 'OPERATOR',
            event_type: 'PROBLEM_ORDER_RESOLVED',
            comment: comment,
            new_value: { delta: delta }
          });
          if (evErr) {
            if (window.tgUtil) window.tgUtil.alert('Не сохранилось: ' + evErr.message);
            resolveBtn.disabled = false;
            resolveBtn.innerText = 'Утвердить решение и закрыть';
            return;
          }
          if (window.tgUtil) {
            window.tgUtil.haptic('success');
            window.tgUtil.alert('Решение по расхождению зафиксировано!');
          }
          close();
        };
      }
    } catch (err) {
      document.getElementById('orderReconBody').innerHTML = `<p class="text-red-400 text-center py-4">Ошибка: ${err.message}</p>`;
    }
  };

  // --- 4. Модальное окно контрольной таблицы сверки (Раздел 30.1 ТЗ) ---
  window.openReconciliationDashboardModal = async function() {
    if (window.tgUtil) window.tgUtil.haptic('light');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
    modal.id = 'reconDashboardModal';

    modal.innerHTML = `
      <div class="glass-card max-w-lg w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-purple-500/40 max-h-[85vh] flex flex-col transform transition-all duration-300 scale-95 opacity-0" id="reconDashContent">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <div>
              <h3 class="text-white font-bold text-base">Финансовая сверка (Раздел 30 ТЗ)</h3>
              <p class="text-[10px] text-purple-300">Контрольная таблица расхождений и Problem Orders</p>
            </div>
          </div>
          <button id="closeReconDashBtn" class="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="reconDashBody" class="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1 text-xs">
          <div class="flex items-center justify-center py-12">
            <span class="animate-spin text-2xl">⏳</span>
            <span class="ml-2 text-white/70">Загрузка сводки заказов...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      const el = document.getElementById('reconDashContent');
      if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
    });

    const close = () => {
      const el = document.getElementById('reconDashContent');
      if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
      setTimeout(() => modal.remove(), 250);
    };
    document.getElementById('closeReconDashBtn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    try {
      const { data: orders, error } = await window.supabaseClient
        .from('orders')
        .select('id, user_id, status, total_byn, prepayment_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      let matchedCount = 0;
      let problemCount = 0;

      (orders || []).forEach(o => {
        const prepay = Number(o.prepayment_amount || 0);
        const total = Number(o.total_byn || 0);
        if (['delivered', 'completed'].includes(o.status) && prepay < total) {
          problemCount++;
        } else {
          matchedCount++;
        }
      });

      document.getElementById('reconDashBody').innerHTML = `
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl text-center">
            <p class="text-[10px] text-cyan-300 uppercase font-semibold">Всего проверено</p>
            <p class="text-lg font-bold text-white">${orders?.length || 0}</p>
          </div>
          <div class="bg-green-500/10 border border-green-500/30 p-2.5 rounded-xl text-center">
            <p class="text-[10px] text-green-300 uppercase font-semibold">Сошлись (Matched)</p>
            <p class="text-lg font-bold text-green-400">${matchedCount}</p>
          </div>
          <div class="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl text-center">
            <p class="text-[10px] text-red-300 uppercase font-semibold">Problem Orders</p>
            <p class="text-lg font-bold text-red-400">${problemCount}</p>
          </div>
        </div>

        <div class="space-y-2 mt-3">
          <h4 class="text-white font-bold text-xs uppercase tracking-wider">Последние заказы:</h4>
          ${(orders || []).map(o => {
            const isProblem = ['delivered', 'completed'].includes(o.status) && Number(o.prepayment_amount || 0) < Number(o.total_byn || 0);
            return `
              <div class="p-2.5 rounded-xl border ${isProblem ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'} flex items-center justify-between">
                <div>
                  <p class="font-mono text-white font-bold">#${o.id.slice(0, 8)} <span class="text-white/50 text-[10px]">(${o.status})</span></p>
                  <p class="text-[10px] text-white/60 inline-flex items-baseline gap-1">Итого: ${Number(o.total_byn || 0).toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''} | Внесено: ${Number(o.prepayment_amount || 0).toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</p>
                </div>
                <button class="px-2.5 py-1 rounded-lg text-[10px] font-semibold ${isProblem ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-purple-600/40 hover:bg-purple-600 text-purple-200'} transition" onclick="window.openOrderReconciliationModal('${o.id}')">
                  ${isProblem ? '⚠️ Расследовать' : '🔍 Проверить'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (err) {
      document.getElementById('reconDashBody').innerHTML = `<p class="text-red-400 text-center py-4">Ошибка загрузки: ${err.message}</p>`;
    }
  };

  // --- 5. Клиентское согласование / отмена при подорожании > 3% (Раздел 25 ТЗ) ---
  // Решение клиента при подорожании — на сервере (order_price_decision): статус и возврат денег на баланс
  const priceDecision = async (orderId, accept) => {
    const { data, error } = await window.supabaseClient.rpc('order_price_decision', { p_order_id: orderId, p_accept: accept });
    if (error) throw error;
    return data || {};
  };

  window.confirmOrderPriceIncrease = async function(orderId) {
    if (!confirm('Согласиться с новой ценой? Заказ уйдёт в работу.')) return;
    try {
      await priceDecision(orderId, true);
      if (window.tgUtil) {
        window.tgUtil.haptic('success');
        window.tgUtil.showPopup('Готово', 'Вы согласились с новой ценой. Оператор завершит выкуп.');
      }
      if (typeof window.renderCurrentScreen === 'function') window.renderCurrentScreen();
    } catch (e) {
      alert('Не получилось подтвердить: ' + e.message);
    }
  };

  window.cancelOrderDueToPrice = async function(orderId) {
    if (!confirm('Отменить заказ? Всё оплаченное вернётся на баланс.')) return;
    try {
      const res = await priceDecision(orderId, false);
      if (window.tgUtil) {
        window.tgUtil.haptic('success');
        window.tgUtil.showPopup('Заказ отменён', `На баланс вернулось ${window.moneyText(res.refund)}.`);
      }
      if (typeof window.renderCurrentScreen === 'function') window.renderCurrentScreen();
    } catch (e) {
      alert('Не получилось отменить: ' + e.message);
    }
  };

  console.log('✅ Operator Financials & Reconciliation module loaded (v2026.06.01.01)');
})();
