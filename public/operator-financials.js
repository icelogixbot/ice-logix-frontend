// =============================================================================
// ICE LOGIX - OPERATOR FINANCIALS & RECONCILIATION DASHBOARD
// Version: 2026.06.01.01 (ТЗ v1.0, Разделы 8, 11, 13, 25, 30, 39, 40)
// =============================================================================

(function() {
  'use strict';

  // --- 1. Модальное окно выкупа на Pinduoduo (Раздел 11, 25, 40 ТЗ) ---
  window.openOperatorPurchaseModal = function(orderId, basePriceCNY, totalBYN) {
    if (window.tgUtil) window.tgUtil.haptic('light');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
    modal.id = 'operatorPurchaseModal';

    const defaultPrice = Number(basePriceCNY || 100);
    const defaultRate = 0.45;

    modal.innerHTML = `
      <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-cyan-500/30 transform transition-all duration-300 scale-95 opacity-0" id="opPurchaseModalContent">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🛒</span>
            <div>
              <h3 class="text-white font-bold text-sm">Выкуп на Pinduoduo</h3>
              <p class="text-[10px] text-cyan-400 font-mono">Заказ #${orderId.slice(0, 8)}</p>
            </div>
          </div>
          <button id="closeOpPurchaseBtn" class="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-white/70 mb-1">Номер заказа Pinduoduo:</label>
            <input type="text" id="opPddOrderId" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-cyan-400" placeholder="PDD-2026-981245">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-white/70 mb-1">Факт. цена (¥ CNY):</label>
              <input type="number" step="0.01" id="opActualPriceCNY" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-cyan-400" value="${defaultPrice.toFixed(2)}">
            </div>
            <div>
              <label class="block text-white/70 mb-1">Курс CNY/BYN:</label>
              <input type="number" step="0.001" id="opExchangeRate" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-cyan-400" value="${defaultRate}">
            </div>
          </div>

          <label class="flex items-center gap-2 bg-white/5 p-2 rounded-lg cursor-pointer border border-white/10">
            <input type="checkbox" id="opDuoduoFee" class="rounded accent-cyan-500" checked>
            <span class="text-[11px] text-white/80">Комиссия DuoDuo Pay (3.0%, мин. ¥2)</span>
          </label>

          <div id="opPricePreviewBox" class="p-3 rounded-xl border transition-all text-xs space-y-1"></div>
        </div>

        <button id="submitOpPurchaseBtn" class="w-full btn-primary font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg">
          ✅ Подтвердить выкуп
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      const el = document.getElementById('opPurchaseModalContent');
      if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
    });

    const close = () => {
      const el = document.getElementById('opPurchaseModalContent');
      if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
      setTimeout(() => modal.remove(), 250);
    };
    document.getElementById('closeOpPurchaseBtn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    const priceInput = document.getElementById('opActualPriceCNY');
    const rateInput = document.getElementById('opExchangeRate');
    const duoduoChk = document.getElementById('opDuoduoFee');
    const previewBox = document.getElementById('opPricePreviewBox');
    const submitBtn = document.getElementById('submitOpPurchaseBtn');

    const updatePreview = () => {
      const pCNY = parseFloat(priceInput.value) || 0;
      const rate = parseFloat(rateInput.value) || defaultRate;
      const hasFee = duoduoChk.checked;
      const feeCNY = hasFee ? Math.max(2.0, pCNY * 0.03) : 0;

      const plannedCNY = defaultPrice;
      const diffPercent = plannedCNY > 0 ? ((pCNY - plannedCNY) / plannedCNY) * 100 : 0;
      const diffBYN = (pCNY - plannedCNY) * rate;

      let bannerClass = 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200';
      let msg = '';
      let btnText = '✅ Подтвердить выкуп';

      if (diffPercent > 3.0) {
        bannerClass = 'bg-red-500/15 border-red-500/40 text-red-200';
        msg = `🚫 <b>ВЫКУП БЛОКИРУЕТСЯ</b> (Раздел 8 ТЗ)<br>Подорожание: <b>+${diffPercent.toFixed(1)}%</b> (+${diffBYN.toFixed(2)} BYN > 3%).<br>Заказ перейдет в <i>AWAITING_CUSTOMER_DECISION</i> с запросом доплаты.`;
        btnText = '⚠️ Зафиксировать подорожание и запросить доплату';
      } else if (diffPercent > 0.05) {
        bannerClass = 'bg-amber-500/15 border-amber-500/40 text-amber-200';
        msg = `⚠️ <b>Незначительное подорожание</b> (Пример B ТЗ)<br>Разница: <b>+${diffBYN.toFixed(2)} BYN</b> (+${diffPercent.toFixed(1)}% ≤ 3%).<br>Выкуп разрешен, сумма будет добавлена во 2-й платеж клиента.`;
        btnText = '🛒 Выкупить (+добавить разницу во 2-й счет)';
      } else if (diffPercent < -0.05) {
        bannerClass = 'bg-green-500/15 border-green-500/40 text-green-200';
        msg = `🎉 <b>Товар подешевел!</b> (Пример D ТЗ)<br>Разница: <b>${diffBYN.toFixed(2)} BYN</b>.<br>Сумма ${Math.abs(diffBYN).toFixed(2)} BYN будет автоматически зачислена на баланс клиента.`;
        btnText = '✅ Выкупить и начислить излишек на баланс';
      } else {
        msg = `✅ Цена совпадает с плановой (¥${plannedCNY.toFixed(2)}). Стандартный выкуп (Пример A ТЗ).`;
      }

      previewBox.className = `p-3 rounded-xl border text-xs space-y-1.5 ${bannerClass}`;
      previewBox.innerHTML = `
        <div class="flex justify-between"><span>Плановая цена:</span><span class="font-mono">¥${plannedCNY.toFixed(2)}</span></div>
        <div class="flex justify-between"><span>Факт выкупа:</span><span class="font-mono font-bold">¥${pCNY.toFixed(2)} (${(pCNY * rate).toFixed(2)} BYN)</span></div>
        ${hasFee ? `<div class="flex justify-between text-white/60"><span>Сбор DuoDuo Pay (3%):</span><span class="font-mono">+¥${feeCNY.toFixed(2)}</span></div>` : ''}
        <div class="border-t border-white/10 pt-1 text-[11px] leading-relaxed">${msg}</div>
      `;
      submitBtn.innerText = btnText;
    };

    priceInput.oninput = updatePreview;
    rateInput.oninput = updatePreview;
    duoduoChk.onchange = updatePreview;
    updatePreview();

    submitBtn.onclick = async () => {
      const pddId = document.getElementById('opPddOrderId').value.trim() || ('PDD-' + Date.now());
      const pCNY = parseFloat(priceInput.value) || 0;
      const rate = parseFloat(rateInput.value) || defaultRate;
      const feeCNY = duoduoChk.checked ? Math.max(2.0, pCNY * 0.03) : 0;
      const diffPercent = defaultPrice > 0 ? ((pCNY - defaultPrice) / defaultPrice) * 100 : 0;
      const diffBYN = (pCNY - defaultPrice) * rate;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Сохранение выкупа...';

      try {
        const newStatus = diffPercent > 3.0 ? 'awaiting_customer_decision' : 'bought';

        if (window.supabaseClient) {
          await window.supabaseClient.from('purchases').insert({
            order_id: orderId,
            platform: 'PINDUODUO',
            pinduoduo_order_id: pddId,
            price_cny: pCNY,
            service_fee_cny: feeCNY,
            actual_paid_cny: pCNY + feeCNY,
            payment_method_description: 'DuoDuo Pay 3%',
            purchase_datetime: new Date().toISOString(),
            status: newStatus
          }).catch(() => {});

          if (diffPercent < -0.05 && Math.abs(diffBYN) > 0.01) {
            const refundAmt = Math.abs(diffBYN);
            const { data: ordData } = await window.supabaseClient.from('orders').select('user_id').eq('id', orderId).single();
            if (ordData?.user_id) {
              await window.supabaseClient.from('balance_entries').insert({
                user_id: ordData.user_id,
                order_id: orderId,
                operation_type: 'PRICE_DROP_REFUND',
                amount: refundAmt,
                note: `Снижение цены товара по заказу #${orderId.slice(0, 8)}`
              }).catch(() => {});
              await window.supabaseClient.rpc('increment_user_balance', { u_id: ordData.user_id, delta: refundAmt }).catch(() => {});
            }
          }

          await window.supabaseClient.from('orders').update({
            status: newStatus,
            tracking_number_cn: pddId
          }).eq('id', orderId);

          await window.supabaseClient.from('order_events').insert({
            order_id: orderId,
            actor_type: 'OPERATOR',
            event_type: 'PURCHASE_RECORDED',
            details: {
              pdd_id: pddId,
              price_cny: pCNY,
              rate: rate,
              diff_percent: diffPercent,
              diff_byn: diffBYN,
              new_status: newStatus
            }
          }).catch(() => {});
        }

        if (window.tgUtil) {
          window.tgUtil.haptic('success');
          window.tgUtil.alert(`✅ Выкуп зафиксирован!\\nСтатус заказа: ${newStatus}`);
        }
        close();
        if (typeof window.preloadAdminData === 'function') await window.preloadAdminData(true);
        if (typeof window.renderAdminScreen === 'function') window.renderAdminScreen(false);
      } catch (err) {
        if (window.tgUtil) {
          window.tgUtil.haptic('error');
          window.tgUtil.alert('Ошибка: ' + err.message);
        }
        submitBtn.disabled = false;
        submitBtn.innerText = 'Подтвердить выкуп';
      }
    };
  };

  // --- 2. Модальное окно склада «Голубая белка» (Раздел 13, 25, 40 ТЗ) ---
  window.openOperatorWarehouseModal = function(orderId, estWeight, reservePaid) {
    if (window.tgUtil) window.tgUtil.haptic('light');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-[130] p-4';
    modal.id = 'operatorWarehouseModal';

    const defaultWeight = Number(estWeight || 1.0);
    const defaultReserve = Number(reservePaid || 70.0);

    modal.innerHTML = `
      <div class="glass-card max-w-sm w-full mx-4 p-5 space-y-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.8)] border border-amber-500/30 transform transition-all duration-300 scale-95 opacity-0" id="opWarehouseModalContent">
        <div class="flex justify-between items-center border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚖️</span>
            <div>
              <h3 class="text-white font-bold text-sm">Склад «Голубая белка»</h3>
              <p class="text-[10px] text-amber-400 font-mono">Заказ #${orderId.slice(0, 8)}</p>
            </div>
          </div>
          <button id="closeOpWarehouseBtn" class="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-white/70 mb-1">Факт. вес (кг):</label>
              <input type="number" step="0.01" id="opActualWeight" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-amber-400" value="${defaultWeight.toFixed(2)}">
            </div>
            <div>
              <label class="block text-white/70 mb-1">Факт. доставка (BYN):</label>
              <input type="number" step="0.1" id="opActualShipping" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-amber-400" value="${(defaultWeight * 25.0).toFixed(1)}">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-white/70 mb-1">Минск→Несвиж (BYN):</label>
              <input type="number" step="0.1" id="opMinskNesvizh" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-amber-400" value="3.40">
            </div>
            <div>
              <label class="block text-white/70 mb-1">Услуги склада (BYN):</label>
              <input type="number" step="0.1" id="opExtraServices" class="w-full p-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-xs focus:border-amber-400" value="0.00">
            </div>
          </div>

          <div id="opWarehousePreviewBox" class="p-3 rounded-xl border transition-all text-xs space-y-1"></div>
        </div>

        <button id="submitOpWarehouseBtn" class="w-full btn-primary bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg">
          📦 Зафиксировать склад и выставить счет
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => {
      const el = document.getElementById('opWarehouseModalContent');
      if (el) { el.classList.remove('scale-95', 'opacity-0'); el.classList.add('scale-100', 'opacity-100'); }
    });

    const close = () => {
      const el = document.getElementById('opWarehouseModalContent');
      if (el) { el.classList.remove('scale-100', 'opacity-100'); el.classList.add('scale-95', 'opacity-0'); }
      setTimeout(() => modal.remove(), 250);
    };
    document.getElementById('closeOpWarehouseBtn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    const weightInput = document.getElementById('opActualWeight');
    const shippingInput = document.getElementById('opActualShipping');
    const nesvizhInput = document.getElementById('opMinskNesvizh');
    const extraInput = document.getElementById('opExtraServices');
    const previewBox = document.getElementById('opWarehousePreviewBox');
    const submitBtn = document.getElementById('submitOpWarehouseBtn');

    const updatePreview = () => {
      const actShip = parseFloat(shippingInput.value) || 0;
      const nesvizh = parseFloat(nesvizhInput.value) || 0;
      const extra = parseFloat(extraInput.value) || 0;
      const insurance = actShip * 0.02;

      const reserve = defaultReserve;
      let shippingRemainder = 0;
      let surplus = 0;
      let secondPaymentTotal = 0;

      let bannerClass = 'bg-amber-500/10 border-amber-500/30 text-amber-200';
      let bannerHtml = '';

      if (actShip >= reserve) {
        shippingRemainder = actShip - reserve;
        secondPaymentTotal = shippingRemainder + insurance + nesvizh + extra;
        bannerHtml = `📦 <b>К оплате 2-го этапа:</b> <span class="text-amber-400 font-bold font-mono text-sm">${secondPaymentTotal.toFixed(2)} BYN</span><br>Остаток доставки: ${shippingRemainder.toFixed(2)} BYN | Страховка 2%: ${insurance.toFixed(2)} BYN | Несвиж: ${nesvizh.toFixed(2)} BYN`;
      } else {
        surplus = reserve - actShip;
        secondPaymentTotal = insurance + nesvizh + extra;
        bannerClass = 'bg-green-500/15 border-green-500/40 text-green-200';
        bannerHtml = `🎉 <b>Доставка дешевле резерва!</b> (Пример F ТЗ)<br>Излишек: <b>+${surplus.toFixed(2)} BYN</b> будет автоматически зачислен на баланс клиента.<br>К оплате во 2-м этапе только: <span class="font-bold font-mono text-white">${secondPaymentTotal.toFixed(2)} BYN</span> (страховка + Несвиж)`;
      }

      previewBox.className = `p-3 rounded-xl border text-xs space-y-1.5 ${bannerClass}`;
      previewBox.innerHTML = `
        <div class="flex justify-between"><span>Оплаченный резерв (70%):</span><span class="font-mono">${reserve.toFixed(2)} BYN</span></div>
        <div class="flex justify-between"><span>Факт доставки склада:</span><span class="font-mono font-bold">${actShip.toFixed(2)} BYN</span></div>
        <div class="flex justify-between text-white/60"><span>Страховка (2%):</span><span class="font-mono">${insurance.toFixed(2)} BYN</span></div>
        <div class="border-t border-white/10 pt-1 text-[11px] leading-relaxed">${bannerHtml}</div>
      `;
    };

    weightInput.oninput = updatePreview;
    shippingInput.oninput = updatePreview;
    nesvizhInput.oninput = updatePreview;
    extraInput.oninput = updatePreview;
    updatePreview();

    submitBtn.onclick = async () => {
      const actWeight = parseFloat(weightInput.value) || defaultWeight;
      const actShip = parseFloat(shippingInput.value) || 0;
      const nesvizh = parseFloat(nesvizhInput.value) || 0;
      const extra = parseFloat(extraInput.value) || 0;
      const insurance = actShip * 0.02;

      const reserve = defaultReserve;
      const shippingRemainder = Math.max(0, actShip - reserve);
      const surplus = Math.max(0, reserve - actShip);
      const secondPaymentTotal = shippingRemainder + insurance + nesvizh + extra;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Сохранение...';

      try {
        if (window.supabaseClient) {
          await window.supabaseClient.from('shipping_actuals').insert({
            order_id: orderId,
            actual_weight: actWeight,
            actual_delivery_amount: actShip,
            source: 'BLUE_SQUIRREL',
            confirmed_at: new Date().toISOString()
          }).catch(() => {});

          if (surplus > 0.01) {
            const { data: ordData } = await window.supabaseClient.from('orders').select('user_id').eq('id', orderId).single();
            if (ordData?.user_id) {
              await window.supabaseClient.from('balance_entries').insert({
                user_id: ordData.user_id,
                order_id: orderId,
                operation_type: 'DELIVERY_SURPLUS',
                amount: surplus,
                note: `Излишек резерва доставки заказа #${orderId.slice(0, 8)}`
              }).catch(() => {});
              await window.supabaseClient.rpc('increment_user_balance', { u_id: ordData.user_id, delta: surplus }).catch(() => {});
            }
          }

          await window.supabaseClient.from('orders').update({
            weight_actual: actWeight,
            status: secondPaymentTotal > 0.05 ? 'awaiting_second_payment' : 'in_belarus'
          }).eq('id', orderId);

          await window.supabaseClient.from('order_events').insert({
            order_id: orderId,
            actor_type: 'OPERATOR',
            event_type: 'WAREHOUSE_ARRIVED',
            details: {
              weight_kg: actWeight,
              actual_shipping_byn: actShip,
              reserve_paid: reserve,
              surplus_credited: surplus,
              second_payment_due: secondPaymentTotal
            }
          }).catch(() => {});
        }

        if (window.tgUtil) {
          window.tgUtil.haptic('success');
          window.tgUtil.alert(`✅ Данные склада сохранены!\\n2-й этап выставлен на ${secondPaymentTotal.toFixed(2)} BYN${surplus > 0 ? ` (клиенту начислен излишек ${surplus.toFixed(2)} BYN на баланс)` : ''}`);
        }
        close();
        if (typeof window.preloadAdminData === 'function') await window.preloadAdminData(true);
        if (typeof window.renderAdminScreen === 'function') window.renderAdminScreen(false);
      } catch (err) {
        if (window.tgUtil) {
          window.tgUtil.haptic('error');
          window.tgUtil.alert('Ошибка: ' + err.message);
        }
        submitBtn.disabled = false;
        submitBtn.innerText = 'Зафиксировать склад';
      }
    };
  };

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
            <span class="font-mono font-bold text-cyan-400">${totalInflow.toFixed(2)} BYN</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/70">Подтвержденные расходы:</span>
            <span class="font-mono font-bold text-white">${totalOutflow.toFixed(2)} BYN</span>
          </div>
          ${surplusCredited > 0 ? `
          <div class="flex justify-between text-green-400">
            <span>Начислено на баланс:</span>
            <span class="font-mono">+${surplusCredited.toFixed(2)} BYN</span>
          </div>` : ''}
          <div class="flex justify-between border-t border-white/10 pt-1.5 font-bold">
            <span>Дельта равенства (Раздел 39):</span>
            <span class="font-mono ${isMatched ? 'text-green-400' : 'text-red-400'}">${delta > 0 ? '+' : ''}${delta.toFixed(2)} BYN</span>
          </div>
        </div>

        ${!isMatched ? `
        <div class="bg-red-500/10 border border-red-500/30 p-3 rounded-xl space-y-2">
          <p class="font-bold text-red-300">⚠️ Зафиксировано расхождение</p>
          <p class="text-[11px] text-white/70">Сумма внесенных средств отличается от итоговых расходов на ${Math.abs(delta).toFixed(2)} BYN.</p>
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
          await window.supabaseClient.from('order_events').insert({
            order_id: orderId,
            actor_type: 'OPERATOR',
            event_type: 'PROBLEM_ORDER_RESOLVED',
            details: { comment: comment, delta: delta }
          }).catch(() => {});
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
                  <p class="text-[10px] text-white/60">Итого: ${Number(o.total_byn || 0).toFixed(2)} BYN | Внесено: ${Number(o.prepayment_amount || 0).toFixed(2)} BYN</p>
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
  window.confirmOrderPriceIncrease = async function(orderId) {
    if (!confirm('Вы подтверждаете увеличение стоимости товара? Заказ будет передан в работу на выкуп.')) return;
    try {
      const { error } = await window.supabaseClient
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      if (window.tgUtil) {
        window.tgUtil.haptic('success');
        window.tgUtil.showPopup('Успешно', 'Вы подтвердили заказ. Оператор завершит выкуп.');
      } else {
        alert('Заказ подтвержден!');
      }
      if (typeof window.switchTab === 'function') window.switchTab('my_orders');
    } catch (e) {
      alert('Ошибка подтверждения: ' + e.message);
    }
  };

  window.cancelOrderDueToPrice = async function(orderId) {
    if (!confirm('Вы уверены, что хотите отменить заказ? Вся внесенная предоплата будет зачислена на ваш баланс без комиссий.')) return;
    try {
      const { data: order, error: ordErr } = await window.supabaseClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (ordErr) throw ordErr;

      const refundAmount = Number(order.prepayment_amount || 0);

      if (refundAmount > 0) {
        const { data: user } = await window.supabaseClient
          .from('users')
          .select('ices_balance')
          .eq('user_id', order.user_id)
          .single();
        const currentBal = Number(user?.ices_balance || 0);
        await window.supabaseClient
          .from('users')
          .update({ ices_balance: currentBal + refundAmount })
          .eq('user_id', order.user_id);

        await window.supabaseClient.from('balance_ledger').insert({
          user_id: order.user_id,
          order_id: orderId,
          direction: 'CREDIT',
          type: 'REFUND_SCENARIO_C',
          amount: refundAmount,
          currency: 'BYN',
          comment: 'Полный возврат предоплаты при отмене из-за подорожания товара'
        });
      }

      await window.supabaseClient
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (window.tgUtil) {
        window.tgUtil.haptic('success');
        window.tgUtil.showPopup('Заказ отменен', `Заказ отменен. ${refundAmount.toFixed(2)} BYN возвращено на ваш баланс.`);
      } else {
        alert(`Заказ отменен. ${refundAmount.toFixed(2)} BYN зачислено на баланс.`);
      }
      if (typeof window.switchTab === 'function') window.switchTab('my_orders');
    } catch (e) {
      alert('Ошибка отмены: ' + e.message);
    }
  };

  console.log('✅ Operator Financials & Reconciliation module loaded (v2026.06.01.01)');
})();
