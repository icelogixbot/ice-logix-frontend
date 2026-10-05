// ============================================================
// ICE LOGIX Module: Profile Modals & Settings
// ============================================================
window.togglePackageExtra = (country, extraName) => {
  tgUtil.haptic('light');
  window.tempOrder.packageExtras = window.tempOrder.packageExtras || {};
  window.tempOrder.packageExtras[country] = window.tempOrder.packageExtras[country] || {};
  
  let checkboxId = '';
  if (extraName === 'bubble') checkboxId = 'extraBubble';
  else if (extraName === 'wood') checkboxId = 'extraWood';
  else if (extraName === 'check') checkboxId = 'extraCheck';

  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    window.tempOrder.packageExtras[country][extraName] = checkbox.checked;
  }
  recalculateOrderTotals();
};

async function showCommissionContractModal() {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[99999] p-4 overflow-y-auto pt-10 pb-10';
  modal.id = 'commissionContractModal';

  // Render loading state initially
  modal.innerHTML = `
    <div class="bg-slate-900/95 border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden page-enter">
      <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 class="text-white font-bold text-base flex items-center gap-2">
          ${ix('file-text', { cls: 'text-cyan-400' })}
          <span>Договор комиссии байера</span>
        </h3>
        <button id="closeContractModalBtn" class="text-white/50 hover:text-white transition-colors text-2xl leading-none">&times;</button>
      </div>
      <div class="p-8 text-center text-white/50 text-sm flex-1 flex flex-col justify-center items-center gap-2">
        <span class="ix animate-spin text-cyan-400 text-3xl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></span>
        <span>Формирование персонального договора...</span>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeContractModalBtn').onclick = () => modal.remove();

  try {
    // Fetch customer profile
    const { data: userRow } = await supabaseClient.from('users').select('full_name, phone, encrypted_passport, passport_data').eq('user_id', userId).single();
    
    let p = null;
    if (userRow) {
      // Try Vault first
      try {
        const { data: vaultData } = await supabaseClient.rpc('get_passport_secure', { p_user_id: userId });
        if (vaultData) p = JSON.parse(vaultData);
      } catch (vaultErr) {
        console.warn('Vault read failed in contract, using JS fallback:', vaultErr);
      }
      if (!p && userRow.encrypted_passport) {
        p = decryptData(userRow.encrypted_passport);
      } else if (!p && userRow.passport_data) {
        try { p = JSON.parse(userRow.passport_data); } catch {}
      }
    }

    const clientName = userRow?.full_name || 'Не указано';
    const clientPhone = userRow?.phone || 'Не указано';
    const clientPassport = p ? `серия/номер ${p.seriesNumber || '—'}, личный № ${p.idNumber || '—'}, выдан ${p.issueDate || '—'} кем: ${p.issuedBy || '—'}, адрес регистрации: ${p.address || '—'}` : '⚠️ Личные паспортные данные не заполнены в профиле!';

    const totalSum = window.tempOrder?.finalTotal || window.tempOrder?.total || 0;
    const commission = window.tempOrder?.breakdown?.commission_byn || (totalSum * 0.20);
    const dateStr = new Date().toLocaleDateString('ru-RU');

    modal.innerHTML = `
      <div class="bg-slate-900/95 border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden page-enter">
        <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 flex-shrink-0">
          <div>
            <h3 class="text-white font-bold text-base flex items-center gap-2">
              ${ix('file-text', { cls: 'text-cyan-400' })}
              <span>Договор комиссии байера</span>
            </h3>
            <p class="text-white/50 text-[10px] mt-0.5">Официальный договор на оказание услуг выкупа</p>
          </div>
          <button id="closeContractModalBtn" class="text-white/50 hover:text-white transition-colors text-2xl leading-none">&times;</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1 text-xs text-white/80 space-y-4 leading-relaxed bg-slate-950/20 max-h-[60vh] select-text">
          <div class="text-center font-bold text-sm text-white uppercase mb-2">Договор комиссии № ${Math.floor(100000 + Math.random() * 900000)}</div>
          <div class="flex justify-between text-[11px] text-white/50">
            <span>г. Несвиж</span>
            <span>${dateStr} г.</span>
          </div>

          <p>
            <strong>Комиссионер:</strong> Индивидуальный предприниматель ИП Кирилл (ICE LOGIX), действующий на основании свидетельства о государственной регистрации, с одной стороны, и
          </p>
          <p>
            <strong>Комитент (Заказчик):</strong> гражданин(ка) <strong>${clientName}</strong>, тел: ${clientPhone}, паспорт: ${clientPassport}, с другой стороны, совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
          </p>

          <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">1. Предмет договора</p>
          <p>
            1.1. Комиссионер обязуется по поручению Комитента за вознаграждение совершить от своего имени, но за счет Комитента сделку по приобретению и доставке товаров народного потребления (одежда, обувь, аксессуары) из международных маркетплейсов (Китай, Европа, Россия).
            <br>
            1.2. Общая стоимость поручения составляет <strong>${totalSum.toFixed(2)} BYN</strong>.
            <br>
            1.3. Вознаграждение Комиссионера за оказанные услуги составляет 20% от базовой стоимости товара и включено в общую стоимость поручения (составляет <strong>${commission.toFixed(2)} BYN</strong>).
          </p>

          <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">2. Права и обязанности сторон</p>
          <p>
            2.1. Комиссионер обязуется выкупить согласованный товар в течение 3 (трёх) рабочих дней с момента подтверждения оплаты Комитентом и организовать его доставку на склад консолидации ShopbyShop.
            <br>
            2.2. Комитент обязуется своевременно оплатить стоимость товара и услуг логистики, а также предоставить достоверные паспортные данные для таможенного оформления посылок в Республике Беларусь.
          </p>

          <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">3. Ответственность и страхование</p>
          <p>
            3.1. Комиссионер несет ответственность за утерю или повреждение груза в процессе транспортировки при условии выбора опции страхования в заказе.
            <br>
            3.2. Возврат денежных средств при наступлении страхового случая производится после рассмотрения претензии в течение 14 (четырнадцати) рабочих дней.
          </p>

          <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">4. Реквизиты и подписи сторон</p>
          <div class="grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-[10px]">
            <div>
              <p class="font-bold text-white uppercase">Комиссионер:</p>
              <p class="mt-1 font-semibold text-cyan-400">ICE LOGIX / ИП</p>
              <p class="text-white/60">Беларусь, Минская обл., г. Несвиж</p>
              <p class="text-white/60">Р/С № BY54BGPB3012000000001000</p>
              <p class="text-white/60">в ОАО «Белгазпромбанк»</p>
              <p class="mt-2 font-mono text-[9px] text-white/40">[Подписано электронной подписью ICE LOGIX]</p>
            </div>
            <div>
              <p class="font-bold text-white uppercase">Комитент:</p>
              <p class="mt-1 font-semibold text-white">${clientName}</p>
              <p class="text-white/60">Тел: ${clientPhone}</p>
              <p class="text-white/60 truncate" title="${clientPassport}">Паспорт: ${p ? p.seriesNumber : '—'}</p>
              <p class="mt-2 font-mono text-[9px] text-white/40">[Подписано по СМС/Telegram WebApp]</p>
            </div>
          </div>
        </div>
        
        <div class="p-5 border-t border-white/10 bg-white/5 flex gap-3 flex-shrink-0">
          <button id="printContractBtn" class="btn-primary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
            ${ix('download')} Скачать PDF / Печать
          </button>
          <button id="closeContractModalBtn2" class="btn-secondary flex-1 py-3 rounded-xl font-bold transition">
            Закрыть
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#closeContractModalBtn').onclick = () => modal.remove();
    modal.querySelector('#closeContractModalBtn2').onclick = () => modal.remove();

    // Print to PDF function
    modal.querySelector('#printContractBtn').onclick = () => {
      tgUtil.haptic('medium');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        tgUtil.alert('Пожалуйста, разрешите открытие всплывающих окон в браузере для генерации PDF.');
        return;
      }
      
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Договор комиссии № ${Math.floor(100000 + Math.random() * 900000)}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .subtitle { font-size: 11px; color: #64748b; }
            .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
            h3 { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            .signatures { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; }
            .stamp { border: 2px dashed #0891b2; padding: 10px; text-align: center; border-radius: 8px; color: #0891b2; font-weight: bold; transform: rotate(-5deg); margin-top: 15px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Договор комиссии на выкуп товара</div>
            <div class="subtitle">Сервис доставки ICE LOGIX · Минская область, г. Несвиж</div>
          </div>
          <div class="meta">
            <span>Место заключения: г. Несвиж</span>
            <span>Дата договора: ${dateStr} г.</span>
          </div>
          <p><strong>Комиссионер:</strong> Индивидуальный предприниматель (ICE LOGIX), действующий на основании свидетельства о государственной регистрации, с одной стороны, и</p>
          <p><strong>Комитент (Заказчик):</strong> гражданин(ка) <strong>${clientName}</strong>, телефон: ${clientPhone}, паспортные данные: ${clientPassport}, с другой стороны, совместно именуемые в дальнейшем «Стороны», заключили настоящий Договор о нижеследующем:</p>
          
          <h3>1. ПРЕДМЕТ ДОГОВОРА</h3>
          <p>1.1. Комиссионер обязуется по поручению Комитента за вознаграждение совершить от своего имени, но за счет Комитента одну или несколько сделок по приобретению и организации доставки товаров народного потребления из зарубежных интернет-магазинов (включая Poizon, Zalando, ASOS, Dewu, Taobao, 1688).</p>
          <p>1.2. Общая стоимость заказанных товаров и услуг логистики по настоящему поручению составляет <strong>${totalSum.toFixed(2)} бел. рублей (BYN)</strong>.</p>
          <p>1.3. Комиссионное вознаграждение Исполнителя за услуги выкупа и сопровождения сделки составляет 20% от базовой стоимости товара (включено в общую сумму договора и составляет <strong>${commission.toFixed(2)} BYN</strong>).</p>

          <h3>2. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h3>
          <p>2.1. Комиссионер обязуется произвести выкуп товара в зарубежном магазине в течение 3-х рабочих дней после получения 75% предоплаты от Комитента.</p>
          <p>2.2. Комиссионер обязуется организовать транспортировку выкупленных товаров на склад консолидации ShopbyShop в Китае, Польше или России, провести их таможенную очистку и доставить в ПВЗ на территории Республики Беларусь.</p>
          <p>2.3. Комитент обязуется предоставить достоверную паспортную информацию для заполнения таможенной декларации и получить посылку по прибытии.</p>

          <h3>3. ОТВЕТСТВЕННОСТЬ И ГАРАНТИИ</h3>
          <p>3.1. В случае гибели или порчи товара в процессе доставки по вине перевозчика, Комиссионер обязуется возместить Комитенту полную стоимость ущерба при условии оплаты страхового взноса (2% от стоимости товара).</p>
          <p>3.2. Срок рассмотрения страховых претензий и выплаты компенсации составляет до 14 рабочих дней.</p>

          <h3>4. ПОДПИСИ И РЕКВИЗИТЫ СТОРОН</h3>
          <div class="signatures">
            <div>
              <strong>КОМИССИОНЕР (ICE LOGIX):</strong><br>
              Беларусь, Минская область, г. Несвиж<br>
              Расчетный счет № BY54BGPB3012000000001000<br>
              в ОАО «Белгазпромбанк»<br>
              <div class="stamp">
                ⚡ ИП ICE LOGIX ⚡<br>
                ОДОБРЕНО И ПОДПИСАНО<br>
                г. Несвиж, РБ
              </div>
            </div>
            <div>
              <strong>КОМИТЕНТ (Заказчик):</strong><br>
              ФИО: ${clientName}<br>
              Телефон: ${clientPhone}<br>
              Паспорт: ${p ? p.seriesNumber + ' ' + p.idNumber : '—'}<br>
              <br><br>
              Подпись: ______________________ / ${clientName} /
            </div>
          </div>
          <sc` + `ript>
            window.onload = function() {
              window.print();
            };
          </sc` + `ript>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    };
  } catch (err) {
    console.error('Error fetching details:', err);
    modal.innerHTML = `
      <div class="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl">
        <p class="text-red-400 font-bold">Ошибка формирования договора</p>
        <p class="text-white/60 text-xs mt-2">${err.message}</p>
        <button onclick="document.getElementById('commissionContractModal').remove()" class="btn-secondary w-full mt-4 py-2 rounded-xl">Закрыть</button>
      </div>
    `;
  }
}

  // ── Balance summary (auto-load) ────────────────────────────────────
  (async () => {
    const el = document.getElementById('balanceSummaryBlock');
    if (!el) return;
    try {
      const [{ data: users }, { data: txs }, { data: orders }] = await Promise.all([
        supabaseClient.from('users').select('ices_balance, role'),
        supabaseClient.from('transactions').select('amount, type, created_at').order('created_at', { ascending: false }).limit(500),
        supabaseClient.from('orders').select('price_byn, created_at')
      ]);
      const total = (users || []).reduce((s, u) => s + (u.ices_balance || 0), 0);
      const dropTotal = (users || []).filter(u => u.role === 'dropshipper').reduce((s, u) => s + (u.ices_balance || 0), 0);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sum = (type, since) => (txs || []).filter(t => t.type === type && t.created_at >= since).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      
      const profit30d = (orders || []).filter(o => o.created_at >= monthAgo).reduce((s, o) => s + ((o.price_byn || 0) * (0.20 / 1.20)), 0);
      const totalOrders30d = (orders || []).filter(o => o.created_at >= monthAgo).length;

      el.innerHTML = `
        <div class="bg-white/5 rounded-xl p-2 text-center relative overflow-hidden group">
          <div class="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition"></div>
          <p class="text-white/50 text-xs mb-1">Чистая прибыль (30д)</p>
          <p class="text-green-400 font-bold text-lg">${profit30d.toFixed(0)} BYN</p>
        </div>
        <div class="bg-white/5 rounded-xl p-2 text-center relative overflow-hidden group">
          <div class="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition"></div>
          <p class="text-white/50 text-xs mb-1">Заказов за 30 дней</p>
          <p class="text-purple-400 font-bold text-lg">${totalOrders30d}</p>
        </div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-[10px]">Общий баланс</p><p class="text-cyan-400 font-bold text-sm">${total.toFixed(0)} ❄️</p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-[10px]">Баланс дропш.</p><p class="text-yellow-400 font-bold text-sm">${dropTotal.toFixed(0)} ❄️</p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-[10px]">Пополнения (30д)</p><p class="text-green-400 font-bold text-sm">+${sum('topup', monthAgo).toFixed(0)}</p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-[10px]">Выплаты (30д)</p><p class="text-red-400 font-bold text-sm">-${sum('withdrawal', monthAgo).toFixed(0)}</p></div>`;
    } catch { el.innerHTML = '<p class="text-white/30 text-xs col-span-2 text-center">Сводка недоступна</p>'; }
  })();
async function showFamilySettingsModal() {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto';
  modal.id = 'familySettingsModal';
  
  const fam = window.userSettings?.family || {};
  let modalContent = '';

  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

  const renderModalContent = async () => {
    const freshFam = window.userSettings?.family || {};
    
    if (!freshFam.role) {
      return `
        <div class="space-y-4">
          <p class="text-white/70 text-xs leading-relaxed">
            Объединяйте баланс с близкими, друзьями или закупщиками. Члены группы смогут предлагать товары, а Глава аккаунта одобряет оплату в один клик с общего кошелька!
          </p>
          
          <button id="createFamilyBtn" class="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-deep)); border: none;">
            ${ix('users')} Создать семейную группу
          </button>
          
          <div class="flex items-center gap-2 my-4">
            <div class="h-px bg-white/10 flex-1"></div>
            <span class="text-[10px] text-white/40 uppercase font-bold tracking-wider">или присоединиться</span>
            <div class="h-px bg-white/10 flex-1"></div>
          </div>
          
          <div class="space-y-2">
            <label class="text-white/60 text-xs block font-semibold">Введите код приглашения главы:</label>
            <div class="flex gap-2">
              <input type="text" id="familyTokenInput" placeholder="FAM-XX-XXXX" class="flex-1 p-3 rounded-xl bg-slate-900 border border-white/20 text-white text-sm focus:border-cyan-500 focus:outline-none">
              <button id="joinFamilyBtn" class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-4 rounded-xl text-sm transition">Войти</button>
            </div>
          </div>
        </div>
      `;
    } else if (freshFam.role === 'head') {
      let pendingOrders = [];
      let groupMembers = [];
      try {
        const { data } = await supabaseClient.from('orders')
          .select('*')
          .eq('status', 'pending')
          .eq('auto_cancel_reason', 'family_approval_pending')
          .order('created_at', { ascending: false });
        if (data) pendingOrders = data;
        
        if (freshFam.members && freshFam.members.length > 0) {
          const { data: memberUsers } = await supabaseClient.from('users')
            .select('user_id, full_name, phone')
            .in('user_id', freshFam.members);
          if (memberUsers) groupMembers = memberUsers;
        }
      } catch (e) { console.error(e); }

      const membersList = groupMembers.map(m => `
        <div class="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div>
            <p class="text-xs font-bold text-white">${_esc(m.full_name || 'Без имени')}</p>
            <p class="text-[10px] text-white/50">${_esc(m.phone || '')}</p>
          </div>
          <button class="bg-red-500/10 hover:bg-red-500/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded transition" onclick="window.removeFamilyMember('${m.user_id}')">Удалить</button>
        </div>
      `).join('') || '<p class="text-xs text-white/40 text-center py-2">Пока нет присоединенных участников</p>';

      const pendingOrdersList = pendingOrders.map(o => {
        const oItems = o.items || [];
        const itemsSummary = oItems.map(i => `${i.title} (${i.size || 'TBD'})`).join(', ');
        return `
          <div class="bg-white/5 p-3 rounded-xl border border-cyan-500/30 space-y-2 page-enter">
            <div class="flex justify-between items-baseline">
              <span class="text-white/60 text-[10px]">От: ID ${o.user_id}</span>
              <span class="text-cyan-400 font-bold text-sm">${o.total_byn.toFixed(2)} BYN</span>
            </div>
            <p class="text-xs text-white font-semibold truncate">${_esc(itemsSummary)}</p>
            <div class="flex gap-2 mt-2 pt-1 border-t border-white/5">
              <button class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded-lg text-xs transition" onclick="window.approveFamilyOrder('${o.id}')">Одобрить</button>
              <button class="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-bold py-1.5 rounded-lg text-xs transition" onclick="window.declineFamilyOrder('${o.id}')">Отклонить</button>
            </div>
          </div>
        `;
      }).join('') || '<p class="text-xs text-white/40 text-center py-4">Нет новых запросов на покупки</p>';

      return `
        <div class="space-y-4">
          <div class="bg-cyan-500/10 border border-cyan-500/30 p-3.5 rounded-xl text-center">
            <p class="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-1">Код вашей семейной группы:</p>
            <p class="text-xl font-mono font-bold text-white tracking-widest cursor-pointer select-all" id="copyFamCodeBtn" title="Кликните для копирования">${_esc(freshFam.token)}</p>
            <p class="text-[9px] text-white/40 mt-1">Отправьте этот код близким, чтобы они вошли в группу</p>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Запросы на покупки (${pendingOrders.length}):</h4>
            <div class="space-y-2.5 max-h-[30vh] overflow-y-auto">
              ${pendingOrdersList}
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Участники группы:</h4>
            <div class="space-y-2">
              ${membersList}
            </div>
          </div>

          <button id="disbandFamilyBtn" class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-xs transition">Распустить группу</button>
        </div>
      `;
    } else {
      let headName = 'Глава аккаунта';
      try {
        const { data: headUser } = await supabaseClient.from('users')
          .select('full_name')
          .eq('user_id', freshFam.head_id)
          .single();
        if (headUser) headName = headUser.full_name || 'Глава аккаунта';
      } catch(e) {}

      let myPendingOrders = [];
      try {
        const { data } = await supabaseClient.from('orders')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .eq('auto_cancel_reason', 'family_approval_pending');
        if (data) myPendingOrders = data;
      } catch(e) {}

      const myPendingList = myPendingOrders.map(o => {
        const oItems = o.items || [];
        const itemsSummary = oItems.map(i => `${i.title}`).join(', ');
        return `
          <div class="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-xs text-white font-bold truncate">${_esc(itemsSummary)}</p>
              <p class="text-[10px] text-amber-400 mt-0.5">⏱️ Ожидает одобрения</p>
            </div>
            <span class="text-white font-mono text-xs font-bold text-right">${o.total_byn.toFixed(2)} BYN</span>
          </div>
        `;
      }).join('') || '<p class="text-xs text-white/40 text-center py-2">Нет активных запросов</p>';

      return `
        <div class="space-y-4">
          <div class="bg-white/5 p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg">${ix('users', { cls: 'text-cyan-400' })}</div>
            <div>
              <p class="text-xs font-bold text-white">Вы состоите в семейном бюджете</p>
              <p class="text-[10px] text-white/50">Глава: ${_esc(headName)}</p>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Мои запросы на согласовании (${myPendingOrders.length}):</h4>
            <div class="space-y-2 max-h-[30vh] overflow-y-auto">
              ${myPendingList}
            </div>
          </div>

          <button id="leaveFamilyBtn" class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-xs transition">Выйти из группы</button>
        </div>
      `;
    }
  };

  const updateModalHTML = async () => {
    modal.innerHTML = `
      <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden page-enter">
        <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 class="text-white font-bold text-lg flex items-center gap-2">
              ${ix('users', { cls: 'text-cyan-400' })}
              <span>Семейный бюджет</span>
            </h3>
            <p class="text-white/50 text-xs mt-0.5">Управление совместными покупками</p>
          </div>
          <button id="closeFamilyModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1" id="familyModalBody">
          <div class="flex items-center justify-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const bodyEl = document.getElementById('familyModalBody');
    if (bodyEl) {
      bodyEl.innerHTML = await renderModalContent();
    }

    const closeBtn = document.getElementById('closeFamilyModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal.remove();

    const createBtn = document.getElementById('createFamilyBtn');
    if (createBtn) createBtn.onclick = () => window.createFamilyGroup();

    const joinBtn = document.getElementById('joinFamilyBtn');
    const tokenInput = document.getElementById('familyTokenInput');
    if (joinBtn && tokenInput) {
      joinBtn.onclick = () => window.joinFamilyGroup(tokenInput.value.trim());
    }

    const copyBtn = document.getElementById('copyFamCodeBtn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(copyBtn.innerText);
        glassToast('Семейный код скопирован!', { kind: 'success' });
      };
    }

    const leaveBtn = document.getElementById('leaveFamilyBtn');
    if (leaveBtn) {
      leaveBtn.onclick = () => window.leaveFamilyGroup();
    }

    const disbandBtn = document.getElementById('disbandFamilyBtn');
    if (disbandBtn) {
      disbandBtn.onclick = () => window.disbandFamilyGroup();
    }
  };

  window.createFamilyGroup = async () => {
    tgUtil.haptic('success');
    const token = 'FAM-IL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const updatedSettings = {
      ...window.userSettings,
      family: { role: 'head', token: token, members: [] }
    };
    
    const { error } = await supabaseClient.from('users').update({ settings: updatedSettings }).eq('user_id', userId);
    if (!error) {
      window.userSettings = updatedSettings;
      glassToast('Семейная группа успешно создана!', { kind: 'success' });
      const bodyEl = document.getElementById('familyModalBody');
      if (bodyEl) bodyEl.innerHTML = await renderModalContent();
      renderCurrentScreen();
    } else {
      glassToast('Ошибка создания группы', { kind: 'error' });
    }
  };

  window.joinFamilyGroup = async (token) => {
    if (!token || !token.startsWith('FAM-')) {
      glassToast('Неверный формат кода!', { kind: 'error' });
      return;
    }
    tgUtil.haptic('medium');
    
    const { data: headUser, error } = await supabaseClient.from('users')
      .select('user_id, settings')
      .eq('settings->family->>token', token)
      .eq('settings->family->>role', 'head')
      .maybeSingle();

    if (error || !headUser) {
      glassToast('Группа с таким кодом не найдена!', { kind: 'error' });
      return;
    }

    if (headUser.user_id === userId) {
      glassToast('Вы не можете вступить в свою собственную группу!', { kind: 'error' });
      return;
    }

    const headSettings = headUser.settings || {};
    headSettings.family = headSettings.family || {};
    headSettings.family.members = headSettings.family.members || [];
    if (!headSettings.family.members.includes(userId)) {
      headSettings.family.members.push(userId);
    }

    await supabaseClient.from('users').update({ settings: headSettings }).eq('user_id', headUser.user_id);

    const memberSettings = {
      ...window.userSettings,
      family: { role: 'member', head_id: headUser.user_id, token: token }
    };
    const { error: mErr } = await supabaseClient.from('users').update({ settings: memberSettings }).eq('user_id', userId);

    if (!mErr) {
      window.userSettings = memberSettings;
      glassToast('Вы успешно вошли в группу!', { kind: 'success' });
      const bodyEl = document.getElementById('familyModalBody');
      if (bodyEl) bodyEl.innerHTML = await renderModalContent();
      renderCurrentScreen();
    } else {
      glassToast('Ошибка вступления в группу', { kind: 'error' });
    }
  };

  window.leaveFamilyGroup = async () => {
    tgUtil.haptic('medium');
    const fam = window.userSettings?.family || {};
    if (!fam.head_id) return;

    const { data: headUser } = await supabaseClient.from('users').select('settings').eq('user_id', fam.head_id).single();
    if (headUser) {
      const headSettings = headUser.settings || {};
      headSettings.family = headSettings.family || {};
      headSettings.family.members = headSettings.family.members || [];
      headSettings.family.members = headSettings.family.members.filter(id => id !== userId);
      await supabaseClient.from('users').update({ settings: headSettings }).eq('user_id', fam.head_id);
    }

    const memberSettings = { ...window.userSettings, family: null };
    const { error } = await supabaseClient.from('users').update({ settings: memberSettings }).eq('user_id', userId);
    
    if (!error) {
      window.userSettings = memberSettings;
      glassToast('Вы вышли из группы!', { kind: 'success' });
      const bodyEl = document.getElementById('familyModalBody');
      if (bodyEl) bodyEl.innerHTML = await renderModalContent();
      renderCurrentScreen();
    }
  };

  window.disbandFamilyGroup = async () => {
    tgUtil.haptic('medium');
    const fam = window.userSettings?.family || {};
    if (fam.members && fam.members.length > 0) {
      for (const mId of fam.members) {
        const { data: mUser } = await supabaseClient.from('users').select('settings').eq('user_id', mId).single();
        if (mUser) {
          const mSettings = mUser.settings || {};
          mSettings.family = null;
          await supabaseClient.from('users').update({ settings: mSettings }).eq('user_id', mId);
        }
      }
    }

    const headSettings = { ...window.userSettings, family: null };
    const { error } = await supabaseClient.from('users').update({ settings: headSettings }).eq('user_id', userId);

    if (!error) {
      window.userSettings = headSettings;
      glassToast('Семейная группа распущена!', { kind: 'success' });
      const bodyEl = document.getElementById('familyModalBody');
      if (bodyEl) bodyEl.innerHTML = await renderModalContent();
      renderCurrentScreen();
    }
  };

  window.removeFamilyMember = async (memberId) => {
    tgUtil.haptic('medium');
    const { data: mUser } = await supabaseClient.from('users').select('settings').eq('user_id', memberId).single();
    if (mUser) {
      const mSettings = mUser.settings || {};
      mSettings.family = null;
      await supabaseClient.from('users').update({ settings: mSettings }).eq('user_id', memberId);
    }

    const headSettings = { ...window.userSettings };
    headSettings.family.members = headSettings.family.members.filter(id => id !== memberId);
    
    const { error } = await supabaseClient.from('users').update({ settings: headSettings }).eq('user_id', userId);
    if (!error) {
      window.userSettings = headSettings;
      glassToast('Участник удален из группы!', { kind: 'success' });
      const bodyEl = document.getElementById('familyModalBody');
      if (bodyEl) bodyEl.innerHTML = await renderModalContent();
      renderCurrentScreen();
    }
  };

  window.approveFamilyOrder = async (orderId) => {
    tgUtil.haptic('success');
    
    const { data: order } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (!order) {
      glassToast('Заказ не найден!', { kind: 'error' });
      return;
    }

    const { data: headUser } = await supabaseClient.from('users').select('ices_balance').eq('user_id', userId).single();
    const headBalance = headUser?.ices_balance || 0;
    
    if (headBalance < order.total_byn) {
      glassToast('Недостаточно средств на семейном балансе!', { kind: 'error' });
      return;
    }

    const newHeadBalance = headBalance - order.total_byn;
    await supabaseClient.from('users').update({ ices_balance: newHeadBalance }).eq('user_id', userId);

    await supabaseClient.from('orders').update({
      status: 'paid',
      auto_cancel_reason: null
    }).eq('id', orderId);

    glassToast('Покупка успешно одобрена и оплачена!', { kind: 'success' });
    const bodyEl = document.getElementById('familyModalBody');
    if (bodyEl) bodyEl.innerHTML = await renderModalContent();
    renderCurrentScreen();
  };

  window.declineFamilyOrder = async (orderId) => {
    tgUtil.haptic('medium');
    await supabaseClient.from('orders').update({
      status: 'cancelled',
      auto_cancel_reason: 'Отклонено главой семейного бюджета'
    }).eq('id', orderId);

    glassToast('Покупка отклонена!', { kind: 'success' });
    const bodyEl = document.getElementById('familyModalBody');
    if (bodyEl) bodyEl.innerHTML = await renderModalContent();
    renderCurrentScreen();
  };

  await updateModalHTML();
}

async function showCurrencyAlertsModal() {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto';
  modal.id = 'currencyAlertsModal';

  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

  // Получаем живые курсы динамически
  let rates = { CNY_to_BYN: 0.45, EUR_to_BYN: 3.59 };
  try {
    if (window.iceLogixPricing && window.iceLogixPricing.getExchangeRates) {
      rates = await window.iceLogixPricing.getExchangeRates();
    }
  } catch (e) {
    console.error('Error fetching rates for tracker:', e);
  }

  const cnyRate = rates.CNY_to_BYN || 0.45;
  const eurRate = rates.EUR_to_BYN || 3.59;

  // Генерируем 7 дней детерминированных колебаний, которые точно заканчиваются текущим курсом
  const generateHistory = (currentRate, seed) => {
    const history = [];
    let temp = currentRate;
    history.unshift(temp);
    for (let i = 0; i < 6; i++) {
      const change = (Math.sin(seed + i) * 0.012) * currentRate;
      temp = temp + change;
      history.unshift(temp);
    }
    return history.map(v => Math.round(v * 1000) / 1000);
  };

  const cnyPts = generateHistory(cnyRate, 4.2);
  const eurPts = generateHistory(eurRate, 8.7);

  const renderModalContent = () => {
    const alerts = window.userSettings?.currency_alerts || [];
    const alertsListHtml = alerts.map((a, idx) => `
      <div class="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
        <div>
          <span class="font-bold text-white">${a.currency === 'CNY' ? '🇨🇳 CNY' : '🇵🇱 EUR'}</span>
          <span class="text-xs text-white/50 ml-1">при курсе ≤</span>
          <span class="font-mono font-bold text-cyan-400 ml-1">${a.target.toFixed(2)} BYN</span>
        </div>
        <button class="text-red-400 hover:text-red-300 text-xs font-bold" onclick="window.deleteCurrencyAlert(${idx})">Удалить</button>
      </div>
    `).join('') || '<p class="text-xs text-white/40 text-center py-2">У вас пока нет активных алертов</p>';

    const buildSVGPath = (pts) => {
      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const range = max - min || 0.001;
      const height = 80;
      const width = 330;
      const stepX = width / (pts.length - 1);
      
      const coords = pts.map((p, idx) => {
        const x = idx * stepX;
        const y = height - ((p - min) / range) * (height - 20) - 10;
        return { x, y };
      });

      const linePath = 'M ' + coords.map(c => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' L ');
      const fillPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;
      return { linePath, fillPath, coords };
    };

    const cnyChart = buildSVGPath(cnyPts);
    const eurChart = buildSVGPath(eurPts);

    return `
      <div class="space-y-4">
        <div class="bg-white/5 p-3 rounded-xl border border-white/10">
          <p class="text-xs font-bold text-white mb-2 flex items-center justify-between">
            <span>🇨🇳 Динамика CNY/BYN (7 дней)</span>
            <span class="text-cyan-400 font-mono text-xs">текущий ~${cnyRate.toFixed(4)}</span>
          </p>
          <div class="relative h-20 w-full overflow-hidden mt-1 bg-slate-950/40 rounded-lg">
            <svg class="w-full h-full" viewBox="0 0 330 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cnyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(34,211,238,0.25)"/>
                  <stop offset="100%" stop-color="rgba(34,211,238,0)"/>
                </linearGradient>
              </defs>
              <path d="${cnyChart.fillPath}" fill="url(#cnyGrad)"/>
              <path d="${cnyChart.linePath}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              ${cnyChart.coords.map((c, i) => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="#22d3ee"/>`).join('')}
            </svg>
          </div>
        </div>

        <div class="bg-white/5 p-3 rounded-xl border border-white/10">
          <p class="text-xs font-bold text-white mb-2 flex items-center justify-between">
            <span>🇵🇱🇪🇺 Динамика EUR/BYN (7 дней)</span>
            <span class="text-violet-400 font-mono text-xs">текущий ~${eurRate.toFixed(4)}</span>
          </p>
          <div class="relative h-20 w-full overflow-hidden mt-1 bg-slate-950/40 rounded-lg">
            <svg class="w-full h-full" viewBox="0 0 330 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="eurGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(167,139,250,0.25)"/>
                  <stop offset="100%" stop-color="rgba(167,139,250,0)"/>
                </linearGradient>
              </defs>
              <path d="${eurChart.fillPath}" fill="url(#eurGrad)"/>
              <path d="${eurChart.linePath}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              ${eurChart.coords.map((c, i) => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="#a78bfa"/>`).join('')}
            </svg>
          </div>
        </div>

        <div class="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
          <h4 class="text-xs font-bold text-white/70 uppercase tracking-wider">🔔 Установить новое уведомление:</h4>
          
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-white/50 block mb-1">Валюта</label>
              <select id="alertCurrency" class="w-full p-2.5 rounded-xl border border-white/20 text-xs bg-slate-900 text-white">
                <option value="CNY">🇨🇳 Юань (CNY)</option>
                <option value="EUR">🇵🇱 Евро (EUR)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-white/50 block mb-1">Целевой курс (BYN)</label>
              <input type="number" step="0.01" id="alertTarget" placeholder="напр. 0.44" class="w-full p-2.5 rounded-xl border border-white/20 text-xs bg-slate-900 text-white">
            </div>
          </div>
          
          <button id="addAlertBtn" class="w-full btn-primary py-2.5 rounded-xl text-xs font-bold" style="background: linear-gradient(135deg, var(--ice-primary), var(--ice-deep)); border: none;">
            🔔 Уведомить меня при падении
          </button>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-bold text-white/60 uppercase tracking-wider">Ваши активные алерты:</h4>
          <div class="space-y-2 max-h-[25vh] overflow-y-auto">
            ${alertsListHtml}
          </div>
        </div>
      </div>
    `;
  };

  const updateModalHTML = () => {
    modal.innerHTML = `
      <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden page-enter">
        <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 class="text-white font-bold text-lg flex items-center gap-2">
              <span>📈 Трекер курсов и уведомления</span>
            </h3>
            <p class="text-white/50 text-xs mt-0.5">Следите за лучшим курсом для выкупа</p>
          </div>
          <button id="closeAlertsModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
        </div>
        
        <div class="p-5 overflow-y-auto flex-1" id="alertsModalBody">
          ${renderModalContent()}
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('closeAlertsModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal.remove();

    const addBtn = document.getElementById('addAlertBtn');
    if (addBtn) {
      addBtn.onclick = () => {
        const ccy = document.getElementById('alertCurrency').value;
        const target = parseFloat(document.getElementById('alertTarget').value);
        if (isNaN(target) || target <= 0) {
          glassToast('Пожалуйста, введите корректный курс!', { kind: 'error' });
          return;
        }
        window.addCurrencyAlert(ccy, target);
      };
    }
  };

  window.addCurrencyAlert = async (ccy, target) => {
    tgUtil.haptic('success');
    const alerts = window.userSettings?.currency_alerts || [];
    alerts.push({ currency: ccy, target: target, active: true });
    
    const updatedSettings = {
      ...window.userSettings,
      currency_alerts: alerts
    };

    const { error } = await supabaseClient.from('users').update({ settings: updatedSettings }).eq('user_id', userId);
    if (!error) {
      window.userSettings = updatedSettings;
      glassToast('Алерт успешно установлен!', { kind: 'success' });
      document.getElementById('alertsModalBody').innerHTML = renderModalContent();
    } else {
      glassToast('Ошибка сохранения алерта', { kind: 'error' });
    }
  };

  window.deleteCurrencyAlert = async (index) => {
    tgUtil.haptic('medium');
    const alerts = window.userSettings?.currency_alerts || [];
    alerts.splice(index, 1);

    const updatedSettings = {
      ...window.userSettings,
      currency_alerts: alerts
    };

    const { error } = await supabaseClient.from('users').update({ settings: updatedSettings }).eq('user_id', userId);
    if (!error) {
      window.userSettings = updatedSettings;
      glassToast('Алерт удален!', { kind: 'success' });
      document.getElementById('alertsModalBody').innerHTML = renderModalContent();
    }
  };

  updateModalHTML();
}

async function renderAdminTicketsList() {
  try {
    const { data: msgs, error } = await supabaseClient.from('order_messages')
      .select('order_id, user_id, message_text, created_at, sender_role')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!msgs || msgs.length === 0) {
      return '<p class="text-xs text-white/40 text-center py-4">Нет активных обращений в чат</p>';
    }

    const threads = {};
    for (const m of msgs) {
      if (!threads[m.order_id]) {
        threads[m.order_id] = m;
      }
    }

    const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

    return Object.values(threads).map(t => {
      const isUnread = t.sender_role === 'client';
      return `
        <div class="p-2.5 bg-white/5 rounded-xl flex justify-between items-center border border-white/5 hover:border-cyan-500/20 transition-all mb-2">
          <div class="min-w-0 flex-1 text-left">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-white">Заказ #${t.order_id.slice(0, 8)}</span>
              ${isUnread ? '<span class="bg-cyan-500 text-slate-900 font-extrabold text-[8px] px-1 py-0.5 rounded uppercase tracking-wider animate-pulse">Новое</span>' : ''}
            </div>
            <p class="text-[10px] text-white/50 truncate mt-0.5">${isUnread ? 'Клиент: ' : 'Вы: '}${_esc(t.message_text)}</p>
          </div>
          <button class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-[10px] transition ml-2" onclick="window.openSupportChat('${t.order_id}', true)">Ответить</button>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    return '<p class="text-xs text-red-400 text-center py-2">Ошибка загрузки тикетов</p>';
  }
}

window.showLogisticsHistory = async (orderId) => {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4 page-enter';
  modal.id = 'logisticsModal';

  modal.innerHTML = `
    <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
      <div class="p-4.5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 class="text-white font-bold text-sm flex items-center gap-2">
          <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
          История перемещений
        </h3>
        <button id="closeLogisticsModalBtn" class="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
        </button>
      </div>
      <div id="logisticsContent" class="p-5 overflow-y-auto flex-1 text-center py-10 text-white/50 text-xs flex flex-col items-center justify-center">
        <span class="ix ix-mute animate-pulse text-2xl mb-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span>
        Загрузка истории...
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeLogisticsModalBtn').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });

  try {
    const { data: events, error } = await supabaseClient
      .from('logistics_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const content = modal.querySelector('#logisticsContent');
    content.className = 'p-5 overflow-y-auto flex-1'; // remove loading styles

    if (!events || events.length === 0) {
      content.innerHTML = '<p class="text-center text-white/50 text-xs py-10">Информация о трекинге пока недоступна.</p>';
      return;
    }

    const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

    content.innerHTML = `
      <div class="relative pl-4 border-l-2 border-white/10 ml-2 space-y-6">
        ${events.map((ev, i) => {
          const isLatest = i === 0;
          return `
            <div class="relative">
              <!-- Dot -->
              <div class="absolute -left-[21px] w-3 h-3 rounded-full border-2 border-slate-900 ${isLatest ? 'bg-cyan-400' : 'bg-white/30'}"></div>
              
              <div class="text-xs">
                <p class="font-bold text-white mb-0.5 flex items-center gap-2">
                  ${_esc(ev.status_code)}
                  ${isLatest ? '<span class="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">Текущий</span>' : ''}
                </p>
                ${ev.location ? `<p class="text-white/60 mb-0.5"><span class="ix text-[10px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span> ${_esc(ev.location)}</p>` : ''}
                ${ev.description ? `<p class="text-white/40 mb-1">${_esc(ev.description)}</p>` : ''}
                <p class="text-[9px] text-white/30 font-mono mt-1">${new Date(new Date(ev.created_at).getTime() + 3*60*60*1000).toLocaleString('ru-RU')}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch(e) {
    console.error('Logistics fetch error:', e);
    modal.querySelector('#logisticsContent').innerHTML = '<p class="text-center text-red-400 text-xs py-10">Ошибка загрузки истории трекинга.</p>';
  }
};

window.openSupportChat = (orderId, isAdmin = false) => {
  tgUtil.haptic('medium');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4';
  modal.id = 'supportChatModal';
  
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  
  let chatInterval = null;

  const fetchAndRenderMessages = async () => {
    try {
      const { data: messages, error } = await supabaseClient.from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messagesContainer = document.getElementById('chatMessagesContainer');
      if (!messagesContainer) return;

      const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 40;

      const messagesHtml = messages.map(m => {
        const isMe = isAdmin ? m.sender_role === 'manager' : m.sender_role === 'client';
        const senderName = m.sender_role === 'manager' ? 'Поддержка' : 'Вы';
        const dateStr = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        return `
          <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 page-enter">
            <span class="text-[9px] text-white/40 px-1">${senderName}</span>
            <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed text-left border ${
              isMe 
                ? 'bg-cyan-500 text-slate-900 border-cyan-400/20 rounded-tr-none' 
                : 'bg-white/5 text-white/95 border-white/10 rounded-tl-none'
            }">
              ${_esc(m.message_text)}
            </div>
            <span class="text-[8px] text-white/30 px-1 font-mono">${dateStr}</span>
          </div>
        `;
      }).join('') || '<p class="text-xs text-white/40 text-center py-10">Напишите первое сообщение, менеджер ответит вам в ближайшее время!</p>';

      messagesContainer.innerHTML = messagesHtml;
      
      if (isAtBottom || messagesContainer.scrollTop === 0) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  };

  modal.innerHTML = `
    <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden page-enter">
      <div class="p-4.5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div class="min-w-0">
          <h3 class="text-white font-bold text-sm flex items-center gap-2 truncate">
            <span>💬 Чат по заказу #${orderId.slice(0, 8)}</span>
          </h3>
          <p class="text-cyan-400 text-[10px] mt-0.5">${isAdmin ? 'Режим менеджера' : 'Ответ в течение 5-15 минут'}</p>
        </div>
        <button id="closeChatModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3" id="chatMessagesContainer">
        <div class="flex items-center justify-center py-10">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
        </div>
      </div>

      <div class="p-3 border-t border-white/10 bg-white/5 flex gap-2 items-center">
        <input type="text" id="chatMessageInput" placeholder="Введите сообщение..." class="flex-1 p-2.5 rounded-xl bg-slate-900 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none">
        <button id="sendChatMessageBtn" class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs transition">Отправить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = document.getElementById('closeChatModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      clearInterval(chatInterval);
      modal.remove();
    };
  }
  modal.onclick = (e) => {
    if (e.target === modal) {
      clearInterval(chatInterval);
      modal.remove();
    }
  };

  const sendBtn = document.getElementById('sendChatMessageBtn');
  const inputEl = document.getElementById('chatMessageInput');

  const sendMessage = async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    
    tgUtil.haptic('light');
    inputEl.value = '';
    
    try {
      const { error } = await supabaseClient.from('order_messages').insert({
        order_id: orderId,
        user_id: userId,
        sender_role: isAdmin ? 'manager' : 'client',
        message_text: text
      });

      if (error) throw error;
      fetchAndRenderMessages();
    } catch (e) {
      glassToast('Ошибка отправки сообщения', { kind: 'error' });
    }
  };

  if (sendBtn && inputEl) {
    sendBtn.onclick = sendMessage;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
  }

  fetchAndRenderMessages();
  chatInterval = setInterval(fetchAndRenderMessages, 4000);
};

  window.triggerConfetti = () => {
    const colors = ['#22d3ee', '#3b82f6', '#b8e0f6', '#ffffff', '#fbbf24'];
  const shapes = ['square', 'circle', 'diamond'];
  const particleCount = 80;
  
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 8 + 6;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.backgroundColor = color;
    
    if (shape === 'circle') {
      p.style.borderRadius = '50%';
    } else if (shape === 'diamond') {
      p.style.transform = 'rotate(45deg)';
    }
    
    p.style.left = `${Math.random() * 100}vw`;
    p.style.animationDelay = `${Math.random() * 1.5}s`;
    p.style.animationDuration = `${Math.random() * 2 + 2}s`;
    
    document.body.appendChild(p);
    
    setTimeout(() => {
      p.remove();
    }, 4000);
  }
};

window.showVipSectionModal = () => {
  tgUtil.haptic('success');
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[120] p-4 overflow-y-auto';
  modal.id = 'vipSectionModal';
  
  const hasCelebrated = localStorage.getItem('vipUnlockCelebrated') === 'true';
  
  const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

  const vipItems = [
    { id: 'vip-1', title: 'Nike Air Jordan 1 Low Travis Scott "Reverse Mocha"', price: 280, oldPrice: 650, img: 'https://vrvwdagjpttvfvjanbwq.supabase.co/storage/v1/object/public/legit-references/nike/air-jordan-1-low-travis-scott/side.jpg', brand: 'Nike', platform: 'Poizon' },
    { id: 'vip-2', title: 'Stone Island Hoodie Sweatshirt Black', price: 220, oldPrice: 520, img: 'https://vrvwdagjpttvfvjanbwq.supabase.co/storage/v1/object/public/legit-references/stone-island/stone-island-hoodie/side.jpg', brand: 'Stone Island', platform: 'Poizon' },
    { id: 'vip-3', title: 'Arc\'teryx Beta LT Jacket Black', price: 340, oldPrice: 850, img: 'https://vrvwdagjpttvfvjanbwq.supabase.co/storage/v1/object/public/legit-references/stone-island/stone-island-softshell/side.jpg', brand: 'Arc\'teryx', platform: 'Zalando' }
  ];

  const renderVipGrid = () => {
    return `
      <div class="space-y-4 page-enter">
        <div class="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-center mb-2">
          <p class="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1">
            🔥 VIP-СКИДКИ ДО 70%
          </p>
          <p class="text-[10px] text-white/50 mt-0.5">Лимитированная подборка горящих товаров, обновляемая ботом</p>
        </div>
        
        <div class="grid grid-cols-1 gap-4.5">
          ${vipItems.map(item => `
            <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex gap-3 p-3 relative hover:scale-[1.01] transition-all">
              <div class="w-24 h-24 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                <img src="${item.img}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150'">
              </div>
              <div class="flex-1 min-w-0 flex flex-col justify-between text-left">
                <div>
                  <span class="bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">${item.brand}</span>
                  <h4 class="text-white font-bold text-xs mt-1 leading-snug line-clamp-2">${_esc(item.title)}</h4>
                </div>
                <div class="flex justify-between items-end mt-2">
                  <div>
                    <span class="text-[9px] text-white/40 line-through font-mono">${item.oldPrice} BYN</span>
                    <p class="text-green-400 font-bold font-mono text-sm leading-none mt-0.5">${item.price} BYN</p>
                  </div>
                  <button class="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] transition flex items-center gap-1" onclick="window.buyVipItem('${item.id}')">
                    Купить
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderCelebration = () => {
    return `
      <div class="text-center py-6 space-y-5 page-enter">
        <div class="relative mx-auto w-24 h-24 mb-2 flex items-center justify-center text-6xl">
          🎉
          <div class="absolute inset-0 border border-amber-400/50 rounded-full animate-ping opacity-75"></div>
        </div>
        <div>
          <h3 class="text-amber-400 text-lg font-extrabold uppercase tracking-wider">Поздравляем с разблокировкой!</h3>
          <p class="text-white/80 text-xs mt-2 leading-relaxed px-4">
            Вы совершили свой первый заказ и официально разблокировали **Секретный VIP-раздел** каталога ICE LOGIX!
          </p>
        </div>
        <div class="bg-amber-400/10 border border-amber-400/30 p-3 rounded-xl max-w-xs mx-auto">
          <p class="text-xs text-amber-300 font-bold">✨ Доступ повышен до VIP</p>
          <p class="text-[9px] text-white/50 mt-0.5">Вам доступны максимальные скидки на редкие релизы</p>
        </div>
        <button id="vipCelebrateContinueBtn" class="btn-primary w-full max-w-xs py-3 rounded-xl font-bold text-xs" style="background: linear-gradient(135deg, #F59E0B, #D97706); border: none;">
          ⚡ Войти в VIP-Раздел
        </button>
      </div>
    `;
  };

  modal.innerHTML = `
    <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden page-enter">
      <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div>
          <h3 class="text-amber-400 font-extrabold text-lg flex items-center gap-2">
            <span>🔥 VIP-Горящие товары</span>
          </h3>
          <p class="text-white/50 text-xs mt-0.5">Эксклюзивные предложения от ICE LOGIX</p>
        </div>
        <button id="closeVipModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
      </div>
      
      <div class="p-5 overflow-y-auto flex-1" id="vipModalBody">
        ${hasCelebrated ? renderVipGrid() : renderCelebration()}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  if (!hasCelebrated) {
    setTimeout(() => {
      window.triggerConfetti();
    }, 200);
  }

  const closeBtn = document.getElementById('closeVipModalBtn');
  if (closeBtn) closeBtn.onclick = () => modal.remove();

  const continueBtn = document.getElementById('vipCelebrateContinueBtn');
  if (continueBtn) {
    continueBtn.onclick = () => {
      tgUtil.haptic('selection');
      localStorage.setItem('vipUnlockCelebrated', 'true');
      window.triggerConfetti();
      const bodyEl = document.getElementById('vipModalBody');
      if (bodyEl) bodyEl.innerHTML = renderVipGrid();
    };
  }

  window.buyVipItem = (itemId) => {
    tgUtil.haptic('success');
    const selected = vipItems.find(i => i.id === itemId);
    if (!selected) return;
    
    modal.remove();
    window.tempOrder = {
      items: [{
        title: selected.title,
        price: selected.price,
        currency: 'BYN',
        total_byn: selected.price,
        quantity: 1,
        platform: selected.platform,
        category: 'Одежда',
        size: 'L'
      }],
      total_byn: selected.price,
      discountAmount: 0,
      appliedPromo: null
    };
    switchTab('neworder');
    glassToast('Товар добавлен в заказ!', { kind: 'success' });
  };
};

const AVAILABLE_PLATFORMS_LIST = [
  { id: "poizon", label: "Poizon / Dewu", flag: "🇨🇳" },
  { id: "taobao", label: "Taobao", flag: "🇨🇳" },
  { id: "tmall", label: "Tmall", flag: "🇨🇳" },
  { id: "1688", label: "1688", flag: "🇨🇳" },
  { id: "jd", label: "JD.com", flag: "🇨🇳" },
  { id: "dhgate", label: "DHGate", flag: "🇨🇳" },
  { id: "aliexpress", label: "AliExpress", flag: "🇨🇳" },
  { id: "zalando", label: "Zalando", flag: "🇵🇱" },
  { id: "aboutyou", label: "About You", flag: "🇩🇪" },
  { id: "asos", label: "ASOS", flag: "🇬🇧" },
  { id: "farfetch", label: "Farfetch", flag: "🇬🇧" },
  { id: "endclothing", label: "END.", flag: "🇬🇧" },
  { id: "mrporter", label: "MR PORTER", flag: "🇬🇧" },
  { id: "mytheresa", label: "Mytheresa", flag: "🇩🇪" },
  { id: "ssense", label: "SSENSE", flag: "🇨🇦" },
  { id: "vinted", label: "Vinted", flag: "🇵🇱" },
  { id: "sneakerstudio", label: "SneakerStudio", flag: "🇵🇱" },
  { id: "goat", label: "GOAT", flag: "🇺🇸" },
  { id: "stockx", label: "StockX", flag: "🇺🇸" },
  { id: "mercari", label: "Mercari", flag: "🇯🇵" }
];

async function showMarketplaceWhitelistModal() {
  if (!userId) {
    glassToast('Ошибка', 'Пользователь не найден', 'error');
    return;
  }
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm transition-opacity opacity-0';
  
  const modal = document.createElement('div');
  modal.className = 'w-full sm:max-w-md bg-[var(--bg-gradient-end)] rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl flex flex-col transition-transform translate-y-full sm:translate-y-10 sm:scale-95';
  modal.style.maxHeight = '90vh';
  
  // Loading state
  modal.innerHTML = `
    <div class="p-6 text-center">
      <div class="inline-block w-8 h-8 border-4 border-[var(--ice-primary)] border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-white/70">Загрузка настроек...</p>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    modal.classList.remove('translate-y-full', 'sm:translate-y-10', 'sm:scale-95');
  });

  try {
    const { data: whitelistData, error } = await supabaseClient
      .from('user_marketplace_whitelist')
      .select('platform_slug, enabled')
      .eq('user_id', userId);
      
    if (error) throw new Error(error.message);
    
    // Default: all platforms enabled if not in DB
    const state = {};
    AVAILABLE_PLATFORMS_LIST.forEach(p => { state[p.id] = true; });
    
    if (whitelistData && whitelistData.length > 0) {
      whitelistData.forEach(row => {
        state[row.platform_slug] = row.enabled;
      });
    }
    
    const renderList = () => {
      return AVAILABLE_PLATFORMS_LIST.map(p => `
        <label class="flex items-center justify-between p-3 mb-2 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${p.flag}</span>
            <span class="text-white font-medium">${p.label}</span>
          </div>
          <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
            <input type="checkbox" name="wl_${p.id}" id="wl_${p.id}" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 top-0 left-0 transition-transform duration-200 ${state[p.id] ? 'translate-x-6 border-[var(--ice-primary)]' : 'border-white/20'}" ${state[p.id] ? 'checked' : ''} style="border-color: ${state[p.id] ? 'var(--ice-primary)' : 'var(--text-muted)'}; margin:0;" />
            <div class="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${state[p.id] ? 'bg-[var(--ice-primary)]/50' : 'bg-white/10'}"></div>
          </div>
        </label>
      `).join('');
    };

    modal.innerHTML = `
      <div class="p-6 pb-4 border-b border-white/10 flex justify-between items-center">
        <h3 class="text-lg font-bold text-white">Маркетплейсы</h3>
        <button id="closeWlBtn" class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex-1 custom-scrollbar">
        <p class="text-sm text-white/60 mb-4">Выберите площадки, по которым будет работать поиск:</p>
        <div id="wlPlatformsContainer">
          ${renderList()}
        </div>
      </div>
      <div class="p-6 border-t border-white/10">
        <button id="saveWlBtn" class="btn-primary w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
          Сохранить настройки
        </button>
      </div>
    `;
    
    // Add handlers to toggles manually because CSS-only toggle is tricky in raw HTML
    AVAILABLE_PLATFORMS_LIST.forEach(p => {
      const checkbox = modal.querySelector(`#wl_${p.id}`);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          state[p.id] = e.target.checked;
          const isChecked = e.target.checked;
          e.target.className = `toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 top-0 left-0 transition-transform duration-200 ${isChecked ? 'translate-x-6 border-[var(--ice-primary)]' : 'border-white/20'}`;
          e.target.style.borderColor = isChecked ? 'var(--ice-primary)' : 'var(--text-muted)';
          e.target.nextElementSibling.className = `toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ${isChecked ? 'bg-[var(--ice-primary)]/50' : 'bg-white/10'}`;
        });
      }
    });

    const close = () => {
      overlay.classList.add('opacity-0');
      modal.classList.add('translate-y-full', 'sm:translate-y-10', 'sm:scale-95');
      setTimeout(() => overlay.remove(), 300);
    };

    modal.querySelector('#closeWlBtn').onclick = close;
    
    modal.querySelector('#saveWlBtn').onclick = async () => {
      const btn = modal.querySelector('#saveWlBtn');
      const orig = btn.innerHTML;
      btn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg></span> Сохранение...';
      btn.disabled = true;
      
      try {
        const upsertData = AVAILABLE_PLATFORMS_LIST.map(p => ({
          user_id: userId,
          platform_slug: p.id,
          enabled: state[p.id]
        }));
        
        const { error: upsertErr } = await supabaseClient
          .from('user_marketplace_whitelist')
          .upsert(upsertData, { onConflict: 'user_id, platform_slug' });
          
        if (upsertErr) throw new Error(upsertErr.message);
        glassToast('Успех', 'Настройки поиска сохранены', 'success');
        close();
      } catch (err) {
        glassToast('Ошибка', err.message, 'error');
        btn.innerHTML = orig;
        btn.disabled = false;
      }
    };

  } catch (err) {
    modal.innerHTML = `
      <div class="p-6 text-center">
        <p class="text-[var(--status-error)] mb-4">${escHtmlC(err.message)}</p>
        <button id="closeErrWlBtn" class="btn-secondary px-6 py-2 rounded-xl">Закрыть</button>
      </div>
    `;
    modal.querySelector('#closeErrWlBtn').onclick = () => {
      overlay.classList.add('opacity-0');
      modal.classList.add('translate-y-full');
      setTimeout(() => overlay.remove(), 300);
    };
  }
}

async function showRecoveryCodeModal() {
  if (!userId) { tgUtil.alert('Авторизуйтесь'); return; }
  let existing = null;
  try {
    const { data } = await supabaseClient.from('users').select('recovery_code').eq('user_id', userId).single();
    existing = data?.recovery_code || null;
  } catch (e) {}

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[120] p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
      <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 class="text-white font-bold text-lg flex items-center gap-2">
          <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          <span>Восстановление аккаунта</span>
        </h3>
        <button id="closeRecBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
      </div>
      <div class="p-5 space-y-4">
        <p class="text-white/70 text-sm leading-relaxed">Резервный код позволяет вернуть аккаунт со всеми заказами при потере доступа к Telegram. Сгенерируйте код и сохраните его в надёжном месте.</p>
        <div id="recCodeBox" class="${existing ? '' : 'hidden'} bg-black/40 border border-cyan-500/30 rounded-xl p-4 text-center">
          <p class="text-[10px] text-cyan-400/80 uppercase tracking-wider font-bold mb-2">Ваш код восстановления</p>
          <p id="recCodeValue" class="text-2xl font-black text-white tracking-widest font-mono select-all">${existing || ''}</p>
        </div>
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p class="text-amber-300 text-xs leading-relaxed">⚠️ Сохраните его — это единственный способ вернуть аккаунт при потере Telegram! Никому не передавайте этот код.</p>
        </div>
        <button id="genRecBtn" class="btn-primary w-full py-3 rounded-xl font-bold">${existing ? 'Сгенерировать новый код' : 'Сгенерировать код восстановления'}</button>
        <button id="copyRecBtn" class="${existing ? '' : 'hidden'} btn-secondary w-full py-3 rounded-xl font-bold">Скопировать код</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#closeRecBtn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const genSegment = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  modal.querySelector('#genRecBtn').onclick = async () => {
    const btn = modal.querySelector('#genRecBtn');
    if (existing && !confirm('Старый код перестанет работать. Продолжить?')) return;
    btn.disabled = true; btn.textContent = 'Генерация...';
    const code = `${genSegment()}-${genSegment()}-${genSegment()}`;
    try {
      const { error } = await supabaseClient.from('users').update({ recovery_code: code }).eq('user_id', userId);
      if (error) throw error;
      existing = code;
      modal.querySelector('#recCodeValue').textContent = code;
      modal.querySelector('#recCodeBox').classList.remove('hidden');
      modal.querySelector('#copyRecBtn').classList.remove('hidden');
      btn.textContent = 'Сгенерировать новый код';
      glassToast('Готово', 'Код восстановления сохранён', 'success');
    } catch (e) {
      glassToast('Ошибка', e.message || 'Сбой базы', 'error');
      btn.textContent = 'Сгенерировать код восстановления';
    }
    btn.disabled = false;
  };

  modal.querySelector('#copyRecBtn').onclick = () => {
    const val = modal.querySelector('#recCodeValue').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(val);
    glassToast('Скопировано', 'Код в буфере обмена', 'success');
  };
}

async function showPersonalDataForm() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-[110] p-0 sm:p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-slate-900/100 sm:bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-none sm:rounded-2xl max-w-md w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div>
          <h3 class="text-white font-bold text-lg flex items-center gap-2">
            ${ix('user', { cls: 'text-cyan-400' })}
            <span>Мои данные</span>
          </h3>
          <p class="text-white/50 text-xs mt-0.5">Личные данные, размеры и паспорт</p>
        </div>
        <button id="closePersonalDataBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
      </div>
      
      <div class="p-5 overflow-y-auto flex-1 space-y-5">
        <!-- Раздел: Основная информация -->
        <div class="space-y-3">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider">Основная информация</h4>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">ФИО (Полное имя)</label>
            <input type="text" id="pdFullName" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="Иванов Иван Иванович">
          </div>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Номер телефона</label>
            <input type="tel" id="pdPhone" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="+375XXXXXXXXX">
          </div>
        </div>
        
        <!-- Раздел: Мои размеры -->
        <div class="space-y-3 pt-2 border-t border-white/5">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
            ${ix('compare', { size: '14px' })}
            <span>Мои размеры (для подбора)</span>
          </h4>
          <p class="text-white/40 text-[10px] leading-relaxed">Эти замеры автоподставляются в калькулятор и заказы для ИИ-подбора размера.</p>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-white/50 text-[10px] block mb-0.5">Рост (см)</label>
              <input type="number" id="pdHeight" class="btn-secondary w-full p-2.5 text-xs text-center border border-white/20 rounded-xl bg-white/5 text-white" placeholder="180">
            </div>
            <div>
              <label class="text-white/50 text-[10px] block mb-0.5">Вес (кг)</label>
              <input type="number" id="pdWeight" class="btn-secondary w-full p-2.5 text-xs text-center border border-white/20 rounded-xl bg-white/5 text-white" placeholder="75">
            </div>
            <div>
              <label class="text-white/50 text-[10px] block mb-0.5">Стелька (см)</label>
              <input type="number" id="pdMeasure" class="btn-secondary w-full p-2.5 text-xs text-center border border-white/20 rounded-xl bg-white/5 text-white" placeholder="27">
            </div>
          </div>
        </div>
        
        <!-- Раздел: Паспортные данные -->
        <div class="space-y-3 pt-2 border-t border-white/5">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
            ${ix('passport', { size: '14px' })}
            <span>Паспортные данные (для таможни)</span>
          </h4>
          <p class="text-white/40 text-[10px] leading-relaxed">Хранятся в зашифрованном виде (AES-256) на стороне клиента и передаются только таможенному брокеру.</p>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Серия и номер</label>
            <input type="text" id="pdPassportSeriesNumber" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="AB 1234567">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-white/60 text-xs font-semibold block mb-1">Дата выдачи</label>
              <input type="date" id="pdPassportIssueDate" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white">
            </div>
            <div>
              <label class="text-white/60 text-xs font-semibold block mb-1">Личный номер (14 цифр)</label>
              <input type="text" id="pdPassportIdNumber" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="14 знаков">
            </div>
          </div>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Кем выдан</label>
            <input type="text" id="pdPassportIssuedBy" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="ОВД Центрального района г. Минска">
          </div>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Адрес регистрации</label>
            <input type="text" id="pdPassportAddress" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-base bg-white/5 text-white" placeholder="Минск, ул. Ленина 12, кв. 34">
          </div>
        </div>

        <!-- Раздел: Дополнительные получатели (Разделение таможенного лимита) -->
        <div class="space-y-3 pt-3 border-t border-white/5">
          <div class="flex items-center justify-between">
            <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
              ${ix('user', { size: '14px' })}
              <span>Получатели для лимитов</span>
            </h4>
            <button id="addRecipientBtn" class="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-cyan-500/30 transition">+ Добавить</button>
          </div>
          <p class="text-white/40 text-[10px] leading-relaxed">Добавляйте родственников или друзей, чтобы автоматически распределять посылки и обходить таможенный лимит 200€ на человека.</p>
          
          <div class="space-y-2 mt-2" id="recipientsListContainer">
            <p class="text-white/50 text-xs text-center py-2">Загрузка получателей...</p>
          </div>
        </div>

        <!-- Семейный бюджет — перенесён в Мои данные -->
        <div class="space-y-2 pt-3 border-t border-white/5">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
            ${ix('users', { size: '14px' })}
            <span>Семейный бюджет</span>
          </h4>
          <p class="text-white/40 text-[10px] leading-relaxed">Общий баланс семьи и совместные покупки с разделением таможенного лимита.</p>
          <button id="openFamilyBudgetBtn" class="w-full py-2.5 rounded-xl text-sm font-bold transition glass-card flex items-center justify-center gap-2 hover:bg-white/10">
            ${ix('users')} Открыть семейный бюджет
          </button>
        </div>
      </div>

      <div class="p-5 border-t border-white/10 bg-white/5 flex gap-3">
        <button id="savePersonalDataBtn" class="btn-primary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
          ${ix('check')} Сохранить
        </button>
        <button id="cancelPersonalDataBtn" class="btn-secondary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
          Отмена
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Load existing user data from database
  try {
    const { data: userRow, error } = await supabaseClient.from('users').select('full_name, phone, encrypted_passport, passport_data, settings').eq('user_id', userId).single();
    if (error) throw error;

    if (userRow) {
      document.getElementById('pdFullName').value = userRow.full_name || '';
      document.getElementById('pdPhone').value = userRow.phone || '';

      // Sizing
      const sizing = userRow.settings?.sizing || {};
      document.getElementById('pdHeight').value = sizing.height || '';
      document.getElementById('pdWeight').value = sizing.weight || '';
      document.getElementById('pdMeasure').value = sizing.measure || '';

      // Passport — try Vault first, fallback to JS-encrypted, then legacy
      let p = null;
      try {
        const { data: vaultData } = await supabaseClient.rpc('get_passport_secure', { p_user_id: userId });
        if (vaultData) p = JSON.parse(vaultData);
      } catch (vaultErr) {
        console.warn('Vault read failed, using JS fallback:', vaultErr);
      }
      if (!p && userRow.encrypted_passport) {
        p = decryptData(userRow.encrypted_passport);
      } else if (!p && userRow.passport_data) {
        try { p = JSON.parse(userRow.passport_data); } catch {}
      }
      if (p) {
        document.getElementById('pdPassportSeriesNumber').value = p.seriesNumber || '';
        document.getElementById('pdPassportIssueDate').value = p.issueDate || '';
        document.getElementById('pdPassportIssuedBy').value = p.issuedBy || '';
        document.getElementById('pdPassportIdNumber').value = p.idNumber || '';
        document.getElementById('pdPassportAddress').value = p.address || '';
      }

      // Load and Handle Recipients inside Modal
      const loadRecipients = async () => {
        const listContainer = modal.querySelector('#recipientsListContainer');
        if (!listContainer) return;
        try {
            const { data, error } = await supabaseClient.from('recipients').select('*').eq('user_id', userId);
            if (error) throw error;
            if (!data || data.length === 0) {
                listContainer.innerHTML = '<p class="text-white/50 text-xs text-center py-2">У вас пока нет добавленных получателей</p>';
                return;
            }
            listContainer.innerHTML = data.map(r => `
                <div class="flex justify-between items-center bg-white/5 p-3 rounded-xl mb-2">
                    <div>
                        <p class="text-white font-bold text-sm">${r.full_name}</p>
                        <p class="text-white/50 text-xs">Паспорт: ***${r.passport.slice(-4)}</p>
                    </div>
                    <button class="deleteRecipientBtn text-white/30 hover:text-red-400 transition" data-id="${r.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span></button>
                </div>
            `).join('');
            
            listContainer.querySelectorAll('.deleteRecipientBtn').forEach(btn => {
                btn.onclick = async () => {
                    if(confirm('Удалить получателя?')) {
                        await supabaseClient.from('recipients').delete().eq('id', btn.getAttribute('data-id'));
                        loadRecipients();
                    }
                };
            });
        } catch(e) {
            listContainer.innerHTML = '<p class="text-white/50 text-xs text-center py-2">Ошибка при загрузке списка</p>';
        }
      };

      loadRecipients();

      const addRecipientBtn = modal.querySelector('#addRecipientBtn');
      if (addRecipientBtn) {
          addRecipientBtn.onclick = () => {
              const subModal = document.createElement('div');
              subModal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4';
              subModal.innerHTML = `
                  <div class="glass-card max-w-sm w-full p-5" style="background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border: 1px solid rgba(255,255,255,0.1);">
                      <h3 class="text-white font-bold mb-4">Добавить получателя</h3>
                      <input type="text" id="recName" class="btn-secondary w-full p-3 rounded-xl mb-3 text-sm bg-white/5 text-white border border-white/10" placeholder="ФИО полностью">
                      <input type="text" id="recPassport" class="btn-secondary w-full p-3 rounded-xl mb-3 text-sm bg-white/5 text-white border border-white/10" placeholder="Серия и номер паспорта">
                      <input type="text" id="recPhone" class="btn-secondary w-full p-3 rounded-xl mb-4 text-sm bg-white/5 text-white border border-white/10" placeholder="Номер телефона">
                      <div class="flex gap-2">
                          <button id="saveRecBtn" class="bg-cyan-500/20 text-cyan-400 px-4 py-3 rounded-xl flex-1 font-bold">Сохранить</button>
                          <button id="cancelRecBtn" class="bg-white/10 text-white px-4 py-3 rounded-xl flex-1">Отмена</button>
                      </div>
                  </div>
              `;
              document.body.appendChild(subModal);
              subModal.querySelector('#cancelRecBtn').onclick = () => subModal.remove();
              subModal.querySelector('#saveRecBtn').onclick = async () => {
                  const full_name = subModal.querySelector('#recName').value.trim();
                  const passport = subModal.querySelector('#recPassport').value.trim();
                  const phone = subModal.querySelector('#recPhone').value.trim();
                  if (!full_name || !passport || !phone) { tgUtil.alert('Заполните все поля'); return; }
                  try {
                      const { error } = await supabaseClient.from('recipients').insert({ user_id: userId, full_name, passport, phone, created_at: new Date().toISOString() });
                      if (error) throw error;
                      subModal.remove();
                      loadRecipients();
                      tgUtil.alert('Получатель добавлен!');
                  } catch(e) {
                      tgUtil.alert('Ошибка: ' + (e.message || 'Сбой БД'));
                  }
              };
          };
      }
    }
  } catch (err) {
    console.error('Ошибка загрузки данных профиля:', err);
    glassToast('Не удалось загрузить данные', { kind: 'error' });
  }

  const closeForm = () => modal.remove();
  document.getElementById('closePersonalDataBtn').onclick = closeForm;
  document.getElementById('cancelPersonalDataBtn').onclick = closeForm;
  document.getElementById('openFamilyBudgetBtn')?.addEventListener('click', () => { modal.remove(); showFamilySettingsModal(); });

  document.getElementById('savePersonalDataBtn').onclick = async () => {
    const fullNameVal = document.getElementById('pdFullName').value.trim();
    const phoneVal = document.getElementById('pdPhone').value.trim();
    
    const passportSeries = document.getElementById('pdPassportSeriesNumber').value.trim();
    const passportIssueDate = document.getElementById('pdPassportIssueDate').value;
    const passportIssuedBy = document.getElementById('pdPassportIssuedBy').value.trim();
    const passportIdNumber = document.getElementById('pdPassportIdNumber').value.trim();
    const passportAddress = document.getElementById('pdPassportAddress').value.trim();

    const heightVal = document.getElementById('pdHeight').value.trim();
    const weightVal = document.getElementById('pdWeight').value.trim();
    const measureVal = document.getElementById('pdMeasure').value.trim();

    if (!fullNameVal) {
      tgUtil.alert('Пожалуйста, укажите ФИО');
      return;
    }
    if (!phoneVal) {
      tgUtil.alert('Пожалуйста, укажите номер телефона');
      return;
    }

    // If passport data is partially filled, require full fill
    const isPassportFilled = passportSeries || passportIssueDate || passportIssuedBy || passportIdNumber || passportAddress;
    if (isPassportFilled && (!passportSeries || !passportIssueDate || !passportIssuedBy)) {
      tgUtil.alert('Пожалуйста, заполните обязательные паспортные поля: серия/номер, дата выдачи, кем выдан');
      return;
    }

    try {
      // Refresh user row to fetch current settings JSON
      const { data: userRow } = await supabaseClient.from('users').select('settings').eq('user_id', userId).single();
      const currentSettings = userRow?.settings || {};

      const updatedSettings = {
        ...currentSettings,
        sizing: {
          height: parseInt(heightVal) || null,
          weight: parseFloat(weightVal) || null,
          measure: parseFloat(measureVal) || null
        }
      };

      const passportObj = {
        seriesNumber: passportSeries,
        issueDate: passportIssueDate,
        issuedBy: passportIssuedBy,
        idNumber: passportIdNumber,
        address: passportAddress
      };
      const encrypted = isPassportFilled ? encryptData(passportObj) : null;

      const { error } = await supabaseClient.from('users').update({
        full_name: fullNameVal,
        phone: phoneVal,
        encrypted_passport: encrypted,
        passport_data: null, // clear plain legacy field
        settings: updatedSettings
      }).eq('user_id', userId);

      // Also save via server-side Vault encryption (pgsodium)
      if (isPassportFilled) {
        try {
          await supabaseClient.rpc('save_passport_secure', {
            p_user_id: userId,
            p_passport: JSON.stringify(passportObj)
          });
        } catch (vaultErr) {
          console.warn('Vault encryption fallback — данные сохранены в JS-encrypted формате:', vaultErr);
        }
      }

      if (error) throw error;

      // Update global states instantly
      window.userSizing = updatedSettings.sizing;
      window.userSettings = updatedSettings;
      userName = fullNameVal;
      const nameEl = document.getElementById('profileNameDisplay');
      if (nameEl) nameEl.innerText = userName;
      const headerEl = document.querySelector('#userNameHeader');
      if (headerEl) headerEl.innerText = userName;
      const homeUserEl = document.getElementById('homeUserName');
      if (homeUserEl) homeUserEl.innerText = userName;

      tgUtil.haptic('success');
      glassToast('Данные успешно сохранены!', { kind: 'success' });
      closeForm();
    } catch (err) {
      console.error('Ошибка сохранения данных:', err);
      tgUtil.alert('Не удалось сохранить данные: ' + err.message);
    }
  };
}

async function showOwnerControlsForm() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto';
  modal.innerHTML = `
    <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div>
          <h3 class="text-white font-bold text-lg flex items-center gap-2">
            ${ix('settings', { cls: 'text-cyan-400' })}
            <span>Управление тарифами</span>
          </h3>
          <p class="text-white/50 text-xs mt-0.5">Глобальные настройки отпуска и буфера</p>
        </div>
        <button id="closeOwnerControlsBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
      </div>
      
      <div class="p-5 overflow-y-auto flex-1 space-y-5">
        <!-- Раздел: Режим отпуска -->
        <div class="space-y-3">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
            <span>🌴 Режим отпуска байера</span>
          </h4>
          <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <span class="text-white text-sm font-semibold">Активировать отпуск</span>
            <input type="checkbox" id="ocVacationActive" class="w-5 h-5 accent-cyan-500">
          </div>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Количество дней отпуска</label>
            <input type="number" id="ocVacationDays" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm bg-white/5 text-white" placeholder="Напр. 7" min="0">
            <p class="text-white/40 text-[10px] mt-1 leading-relaxed">Эти дни будут автоматически добавлены ко всем срокам доставки на сайте, а пользователям будет показан предупреждающий баннер в калькуляторе и корзине.</p>
          </div>
        </div>
        
        <!-- Раздел: Курсовой буфер -->
        <div class="space-y-3 pt-2 border-t border-white/5">
          <h4 class="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
            <span>💱 Курсовой буфер безопасности (P2P эквивалент)</span>
          </h4>
          <div>
            <label class="text-white/60 text-xs font-semibold block mb-1">Размер буфера (%)</label>
            <input type="number" id="ocExchangeBuffer" class="btn-secondary w-full p-3 rounded-xl border border-white/20 text-sm bg-white/5 text-white" placeholder="Напр. 3" min="0" max="20" step="0.5">
            <p class="text-white/40 text-[10px] mt-1 leading-relaxed">Процент надбавки ко всем курсам валют НБРБ для защиты от резких скачков (по умолчанию +3%). Рекомендуется устанавливать буфер на уровне +3%..+5% для полного соответствия коммерческому курсу Binance P2P (USDT/BYN).</p>
          </div>
        </div>
      </div>
      
      <div class="p-5 border-t border-white/10 bg-white/5 flex gap-3">
        <button id="saveOwnerControlsBtn" class="btn-primary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
          ${ix('check')} Сохранить
        </button>
        <button id="cancelOwnerControlsBtn" class="btn-secondary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
          Отмена
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let ownerId = null;
  let currentSettings = {};

  // Load existing owner settings from database
  try {
    const { data: ownerRow, error } = await supabaseClient.from('users').select('user_id, settings').eq('role', 'owner').limit(1).maybeSingle();
    if (error) throw error;
    if (ownerRow) {
      ownerId = ownerRow.user_id;
      currentSettings = ownerRow.settings || {};
      
      const v = currentSettings.buyer_vacation || { active: false, days: 0 };
      document.getElementById('ocVacationActive').checked = v.active || false;
      document.getElementById('ocVacationDays').value = v.days || '';

      const buf = currentSettings.exchange_buffer !== undefined ? currentSettings.exchange_buffer : 3;
      document.getElementById('ocExchangeBuffer').value = buf;
    } else {
      throw new Error('Учетная запись владельца не найдена.');
    }
  } catch (err) {
    console.error('Ошибка загрузки настроек владельца:', err);
    glassToast('Не удалось загрузить настройки', { kind: 'error' });
  }

  const closeForm = () => modal.remove();
  document.getElementById('closeOwnerControlsBtn').onclick = closeForm;
  document.getElementById('cancelOwnerControlsBtn').onclick = closeForm;

  document.getElementById('saveOwnerControlsBtn').onclick = async () => {
    const vacationActive = document.getElementById('ocVacationActive').checked;
    const vacationDays = parseInt(document.getElementById('ocVacationDays').value) || 0;
    const exchangeBuffer = parseFloat(document.getElementById('ocExchangeBuffer').value) || 0;

    try {
      const updatedSettings = {
        ...currentSettings,
        buyer_vacation: {
          active: vacationActive,
          days: vacationDays
        },
        exchange_buffer: exchangeBuffer
      };

      const { error } = await supabaseClient.from('users').update({
        settings: updatedSettings
      }).eq('user_id', ownerId);

      if (error) throw error;

      // Update global states instantly
      window.buyerVacation = updatedSettings.buyer_vacation;
      window.iceLogixPricing.CONFIG.currency_buffer_pct = exchangeBuffer;

      tgUtil.haptic('success');
      glassToast('Настройки тарифов сохранены!', { kind: 'success' });
      closeForm();
    } catch (err) {
      console.error('Ошибка сохранения настроек владельца:', err);
      tgUtil.alert('Не удалось сохранить настройки: ' + err.message);
    }
  };
}


function showMeasurementsForm() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
  modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg">📏 Мои размеры</h3>
        <p class="text-white/50 text-xs mt-1">Сохраните ваши параметры для автоподбора размеров и умного калькулятора.</p>
      </div>
      <div class="p-5 overflow-y-auto flex-1 space-y-3">
        <div>
          <label class="text-white/70 text-sm">Рост (см)</label>
          <input type="number" id="measHeight" class="w-full p-3 rounded-xl bg-white/20 border border-white/30" placeholder="175">
        </div>
        <div>
          <label class="text-white/70 text-sm">Вес (кг)</label>
          <input type="number" id="measWeight" class="w-full p-3 rounded-xl bg-white/20 border border-white/30" placeholder="70">
        </div>
        <div>
          <label class="text-white/70 text-sm">Длина стопы (см)</label>
          <input type="number" step="0.1" id="measFoot" class="w-full p-3 rounded-xl bg-white/20 border border-white/30" placeholder="27.5">
        </div>
        <div>
          <label class="text-white/70 text-sm">Размер одежды (EU/RU)</label>
          <input type="text" id="measClothes" class="w-full p-3 rounded-xl bg-white/20 border border-white/30" placeholder="M / 48">
        </div>
        <div>
          <label class="text-white/70 text-sm">Размер обуви (EU)</label>
          <input type="number" step="0.5" id="measShoe" class="w-full p-3 rounded-xl bg-white/20 border border-white/30" placeholder="42">
        </div>
      </div>
      <div class="p-5 border-t border-white/20">
        <div class="flex gap-3">
          <button id="saveMeasBtn" class="flex-1 bg-cyan-500 py-2 rounded-xl">Сохранить</button>
          <button id="cancelMeasBtn" class="flex-1 bg-white/20 py-2 rounded-xl">Отмена</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  (async () => {
    const { data } = await supabaseClient.from('users').select('measurements_data').eq('user_id', userId).single();
    if (data?.measurements_data) {
      document.getElementById('measHeight').value = data.measurements_data.height || '';
      document.getElementById('measWeight').value = data.measurements_data.weight || '';
      document.getElementById('measFoot').value = data.measurements_data.foot || '';
      document.getElementById('measClothes').value = data.measurements_data.clothes || '';
      document.getElementById('measShoe').value = data.measurements_data.shoe || '';
    }
  })();

  modal.querySelector('#cancelMeasBtn').onclick = () => modal.remove();
  modal.querySelector('#saveMeasBtn').onclick = async () => {
    const measurementsObj = {
      height: document.getElementById('measHeight').value,
      weight: document.getElementById('measWeight').value,
      foot: document.getElementById('measFoot').value,
      clothes: document.getElementById('measClothes').value,
      shoe: document.getElementById('measShoe').value
    };
    const { error } = await supabaseClient.from('users').update({ measurements_data: measurementsObj }).eq('user_id', userId);
    if (error) { alert('Ошибка: ' + error.message); } else { alert('✅ Размеры сохранены!'); modal.remove(); }
  };
}

async function downloadCustomsInvoice(orderId) {
  try {
    const { data: order, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
    if (error || !order) { alert('Заказ не найден'); return; }
    
    // Пытаемся получить паспортные данные для инвойса
    let passportStr = 'Не указаны';
    const { data: userData } = await supabaseClient.from('users').select('encrypted_passport, passport_data').eq('user_id', userId).single();
    if (userData) {
      if (userData.encrypted_passport) {
        const p = decryptData(userData.encrypted_passport);
        if (p) passportStr = `Серия/Номер: ${p.seriesNumber}, Выдан: ${p.issueDate}`;
      } else if (userData.passport_data) {
        try {
          const p = JSON.parse(userData.passport_data);
          passportStr = `Серия/Номер: ${p.seriesNumber}`;
        } catch(e){}
      }
    }

    const docDefinition = {
      content: [
        { text: 'CUSTOMS INVOICE / ИНВОЙС', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
        { text: `Order ID / Номер заказа: ${order.id}`, margin: [0, 0, 0, 5] },
        { text: `Date / Дата: ${new Date(order.created_at).toLocaleDateString('ru-RU')}`, margin: [0, 0, 0, 5] },
        { text: `Buyer / Покупатель: ${userName}`, margin: [0, 0, 0, 5] },
        { text: `Passport Details / Паспорт: ${passportStr}`, margin: [0, 0, 0, 15] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              ['Description / Описание', 'Qty / Кол-во', 'Weight / Вес (кг)', 'Price / Цена'],
              ['Товар для личного пользования (Одежда/Обувь)', '1', `${order.weight_estimated || 1}`, `${order.price_original || 0}`],
              [{ text: 'TOTAL / ИТОГО', colSpan: 3, alignment: 'right' }, '', '', `${order.price_original || 0}`]
            ]
          }
        },
        { text: 'Purpose of export: For personal use / Цель ввоза: Для личного пользования', margin: [0, 20, 0, 0] },
        { text: 'Carrier: ICE LOGIX / Перевозчик: ICE LOGIX', margin: [0, 5, 0, 0] }
      ],
      styles: { header: { fontSize: 18, bold: true } }
    };
    pdfMake.createPdf(docDefinition).download(`Invoice_${order.id.slice(0,8)}.pdf`);
  } catch (err) {
    alert('Ошибка генерации PDF: ' + err.message);
  }
}

function showFortuneWheel() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[120] p-4';
  modal.innerHTML = `
    <h2 class="text-2xl font-bold text-white mb-6 animate-pulse">🎡 Колесо Фортуны</h2>
    <div class="relative w-64 h-64 mb-8">
      <div id="wheel" class="w-full h-full rounded-full border-4 border-cyan-500 shadow-[0_0_20px_#06b6d4] transition-all duration-[3000ms] ease-out flex items-center justify-center overflow-hidden" style="background: conic-gradient(#ec4899 0deg 90deg, #8b5cf6 90deg 180deg, #06b6d4 180deg 270deg, #10b981 270deg 360deg);">
         <div class="absolute inset-0 flex items-center justify-center font-bold text-white text-xl drop-shadow-md">КРУТИ!</div>
      </div>
      <div class="absolute top-0 left-1/2 -ml-3 -mt-2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white z-10"></div>
    </div>
    <button id="spinWheelBtn" class="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 px-10 rounded-full text-lg shadow-[0_0_15px_#ec4899] hover:scale-105 transition">Крутить (1 раз в месяц)</button>
    <button id="closeWheelBtn" class="mt-4 text-white/50 text-sm">Позже</button>
  `;
  document.body.appendChild(modal);
  
  modal.querySelector('#closeWheelBtn').onclick = () => modal.remove();
  
  const spinBtn = modal.querySelector('#spinWheelBtn');
  const wheel = modal.querySelector('#wheel');
  spinBtn.onclick = async () => {
    spinBtn.disabled = true;
    spinBtn.innerText = 'Крутится...';
    
    // Проверка БД на spin
    const { data } = await supabaseClient.from('users').select('last_spin').eq('user_id', userId).single();
    if (data?.last_spin) {
      const daysSince = (Date.now() - new Date(data.last_spin).getTime()) / (1000*60*60*24);
      if (daysSince < 30) {
        alert('Вы уже крутили колесо в этом месяце!');
        modal.remove();
        return;
      }
    }
    
    const deg = 1080 + Math.floor(Math.random() * 360);
    wheel.style.transform = `rotate(${deg}deg)`;
    
    setTimeout(async () => {
      const prizes = ['5 ❄️', 'Бесплатная пупырка', 'Скидка 2%', 'Ничего 😢'];
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      alert('🎉 Результат: ' + prize);
      await supabaseClient.from('users').update({ last_spin: new Date().toISOString() }).eq('user_id', userId);
      modal.remove();
    }, 3200);
  };
}

// Подписание договора (генерирует PDF и сохраняет в Storage)
async function signAgreement() {
  if (!userId) return;
  try {
    // Проверяем, есть ли уже подписанный договор
    const { data: existing } = await supabaseClient.from('users').select('agreement_signed').eq('user_id', userId).single();
    if (existing?.agreement_signed) { tgUtil.alert('Договор уже подписан'); return; }
    
    // Генерируем PDF (заглушка – в будущем можно использовать Edge Function)
    const agreementText = `ДОГОВОР ОКАЗАНИЯ УСЛУГ\n\nКлиент: ${userName}\nID: ${userId}\nДата: ${new Date().toLocaleString('ru-RU')}\n\nУсловия: ...`;
    const blob = new Blob([agreementText], { type: 'application/pdf' });
    const file = new File([blob], `agreement_${userId}.pdf`);
    
    // Загружаем в Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('agreements')
      .upload(`${userId}/${Date.now()}.pdf`, file);
    if (uploadError) throw uploadError;
    
    const { data: publicUrl } = supabaseClient.storage.from('agreements').getPublicUrl(uploadData.path);
    
    // Обновляем пользователя
    await supabaseClient.from('users').update({
      agreement_signed: true,
      agreement_signed_at: new Date().toISOString()
    }).eq('user_id', userId);
    
    // Сохраняем запись в user_agreements
    await supabaseClient.from('user_agreements').insert({
      user_id: userId,
      agreement_url: publicUrl.publicUrl
    });
    
    tgUtil.alert('Договор подписан!');
  } catch (err) {
    tgUtil.alert('Ошибка: ' + err.message);
  }
}

// Скачать последний договор
async function downloadAgreement() {
  if (!userId) return;
  const { data } = await supabaseClient.from('user_agreements')
    .select('agreement_url')
    .eq('user_id', userId)
    .order('signed_at', { ascending: false })
    .limit(1)
    .single();
  if (data?.agreement_url) {
    window.open(data.agreement_url, '_blank');
  } else {
    tgUtil.alert('Договор не найден. Сначала подпишите его.');
  }
}

// Загрузка дополнительных данных профиля (аватар, транзакции)
async function loadProfileExtras() {
  if (!userId) return;
  const [{ data }, { data: txs }] = await Promise.all([
    supabaseClient.from('users').select('avatar_url, full_name').eq('user_id', userId).single(),
    supabaseClient.from('transaction_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(3)
  ]);
  if (data) {
    if (data.avatar_url) {
      document.getElementById('profileAvatar').innerHTML = `<img src="${data.avatar_url}" class="w-full h-full object-cover">`;
      const headerAvatar = document.querySelector('#avatar');
      if (headerAvatar) headerAvatar.innerHTML = `<img src="${data.avatar_url}" class="w-full h-full object-cover">`;
      userAvatarUrl = data.avatar_url;
    }
    if (data.full_name) {
      document.getElementById('profileNameDisplay').innerText = data.full_name;
      userName = data.full_name || userName || 'Гость';
    }
  }
  const container = document.getElementById('recentTransactions');
  if (container && txs) {
    container.innerHTML = txs.map(tx => `
      <div class="flex justify-between text-xs py-1">
        <span class="text-white/70">${getTransactionTypeText(tx.type)}</span>
        <span class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}">${tx.amount >= 0 ? '+' : ''}${tx.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span>
      </div>
    `).join('');
  }
  updateCartBadge();
}

function getTransactionTypeText(type) {
  const map = { 'deposit': 'Пополнение', 'withdrawal': 'Вывод', 'payment': 'Оплата заказа', 'refund': 'Возврат', 'bonus': 'Бонус', 'referral': 'Реферал' };
  return map[type] || type;
}

async function updateHeaderFamilyBalance() {
  return;
}

// Загрузка аватара
function showAvatarUploader() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `avatars/${userId}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(fileName, file);
    if (uploadError) { tgUtil.alert('Ошибка загрузки: ' + uploadError.message); return; }
    const { data: publicUrl } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
    await supabaseClient.from('users').update({ avatar_url: publicUrl.publicUrl }).eq('user_id', userId);
    document.getElementById('profileAvatar').innerHTML = `<img src="${publicUrl.publicUrl}" class="w-full h-full object-cover">`;
    const headerAvatar = document.querySelector('#avatar');
    if (headerAvatar) headerAvatar.innerHTML = `<img src="${publicUrl.publicUrl}" class="w-full h-full object-cover">`;
    userAvatarUrl = publicUrl.publicUrl;
  };
  input.click();
}

// Редактирование имени
function showEditNameForm() {
  const newName = prompt('Введите новое имя:', userName);
  if (newName && newName.trim()) {
    supabaseClient.from('users').update({ full_name: newName.trim() }).eq('user_id', userId).then(({ error }) => {
      if (error) tgUtil.alert('Ошибка: ' + error.message);
      else {
        userName = newName.trim();
        document.getElementById('profileNameDisplay').innerText = userName;
        document.querySelector('#userNameHeader').innerText = userName;
      }
    });
  }
}


// Global Exports
if (typeof showCommissionContractModal === 'function') window.showCommissionContractModal = showCommissionContractModal;
if (typeof showFamilySettingsModal === 'function') window.showFamilySettingsModal = showFamilySettingsModal;
if (typeof showCurrencyAlertsModal === 'function') window.showCurrencyAlertsModal = showCurrencyAlertsModal;
if (typeof renderAdminTicketsList === 'function') window.renderAdminTicketsList = renderAdminTicketsList;
if (typeof showMarketplaceWhitelistModal === 'function') window.showMarketplaceWhitelistModal = showMarketplaceWhitelistModal;
if (typeof showRecoveryCodeModal === 'function') window.showRecoveryCodeModal = showRecoveryCodeModal;
if (typeof showPersonalDataForm === 'function') window.showPersonalDataForm = showPersonalDataForm;
if (typeof showOwnerControlsForm === 'function') window.showOwnerControlsForm = showOwnerControlsForm;
if (typeof showMeasurementsForm === 'function') window.showMeasurementsForm = showMeasurementsForm;
if (typeof downloadCustomsInvoice === 'function') window.downloadCustomsInvoice = downloadCustomsInvoice;
if (typeof showFortuneWheel === 'function') window.showFortuneWheel = showFortuneWheel;
if (typeof signAgreement === 'function') window.signAgreement = signAgreement;
if (typeof downloadAgreement === 'function') window.downloadAgreement = downloadAgreement;
if (typeof loadProfileExtras === 'function') window.loadProfileExtras = loadProfileExtras;
if (typeof getTransactionTypeText === 'function') window.getTransactionTypeText = getTransactionTypeText;
if (typeof updateHeaderFamilyBalance === 'function') window.updateHeaderFamilyBalance = updateHeaderFamilyBalance;
if (typeof showAvatarUploader === 'function') window.showAvatarUploader = showAvatarUploader;
if (typeof showEditNameForm === 'function') window.showEditNameForm = showEditNameForm;
