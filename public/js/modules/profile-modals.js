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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'commissionContractModal';

  // Render loading state initially
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeContractModalBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h3 class="text-white font-bold text-sm">Договор комиссии байера</h3>
      <div style="width: 48px;"></div>
    </div>
    <div class="full-screen-modal-body flex flex-col justify-center items-center text-center text-white/50 text-sm gap-2">
      <span class="ix animate-spin text-cyan-400 text-3xl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></span>
      <span>Формирование персонального договора...</span>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeContractModalBtn').onclick = () => window.closeModalWithAnimation(modal);

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
      <div class="full-screen-modal-header">
        <button type="button" class="global-back-btn !mb-0" id="closeContractModalBtn" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="text-center">
          <h3 class="text-white font-bold text-sm truncate">Договор комиссии</h3>
          <p class="text-white/40 text-[10px]">Официальный договор выкупа</p>
        </div>
        <div style="width: 48px;"></div>
      </div>
      
      <div class="full-screen-modal-body text-xs text-white/80 space-y-4 leading-relaxed select-text">
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
            1.2. Общая стоимость поручения составляет <strong>${totalSum.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</strong>.
            <br>
            1.3. Вознаграждение Комиссионера за оказанные услуги составляет 20% от базовой стоимости товара и включено в общую стоимость поручения (составляет <strong>${commission.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</strong>).
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
          <p>1.2. Общая стоимость заказанных товаров и услуг логистики по настоящему поручению составляет <strong>${totalSum.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</strong>.</p>
          <p>1.3. Комиссионное вознаграждение Исполнителя за услуги выкупа и сопровождения сделки составляет 20% от базовой стоимости товара (включено в общую сумму договора и составляет <strong class="inline-flex items-baseline gap-0.5">${commission.toFixed(2)} ${window.bynSign ? window.bynSign({ size: '0.85em' }) : ''}</strong>).</p>

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
          <p class="text-green-400 font-bold text-lg inline-flex items-baseline gap-1">${profit30d.toFixed(0)} ${window.bynSign ? window.bynSign({ color: 'emerald', size: '0.85em' }) : ''}</p>
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
  modal.className = 'full-screen-modal-overlay page-enter';
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
        // Участники и заказы на одобрение — одним вызовом (чужие строки users закрыты)
        const { data: ov } = await supabaseClient.rpc('family_overview');
        pendingOrders = ov?.pending_orders || [];
        groupMembers = ov?.members || [];
      } catch (e) { console.error(e); }

      const membersList = groupMembers.map(m => `
        <div class="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div>
            <p class="text-xs font-bold text-white">${_esc(m.full_name || 'Без имени')}</p>
            <p class="text-[10px] text-white/50">${m.username ? '@' + _esc(m.username) : ''}</p>
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
              <span class="text-cyan-400 font-bold text-sm inline-flex items-baseline gap-1">${o.total_byn.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span>
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
        const { data: ov } = await supabaseClient.rpc('family_overview');
        if (ov?.head?.full_name) headName = ov.head.full_name;
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
            <span class="text-white font-mono text-xs font-bold text-right inline-flex items-baseline gap-1">${o.total_byn.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span>
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
      <div class="full-screen-modal-header">
        <button type="button" class="global-back-btn !mb-0" id="closeFamilyModalBtn" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="text-center">
          <h3 class="text-white font-bold text-sm truncate">Семейный бюджет</h3>
          <p class="text-white/40 text-[10px]">Управление покупками</p>
        </div>
        <div style="width: 48px;"></div>
      </div>
      
      <div class="full-screen-modal-body" id="familyModalBody">
        <div class="flex items-center justify-center py-10">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
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

  // Все изменения семьи — на сервере (family_*): чужие строки users из приложения не меняются
  const reloadFamily = async (okText, err) => {
    if (err) {
      glassToast(err.message || 'Не получилось', { kind: 'error' });
      return;
    }
    const { data: me } = await supabaseClient.from('users').select('settings').eq('user_id', userId).single();
    window.userSettings = me?.settings || {};
    if (okText) glassToast(okText, { kind: 'success' });
    const bodyEl = document.getElementById('familyModalBody');
    if (bodyEl) bodyEl.innerHTML = await renderModalContent();
    renderCurrentScreen();
  };

  window.createFamilyGroup = async () => {
    tgUtil.haptic('success');
    const { error } = await supabaseClient.rpc('family_create');
    await reloadFamily('Семейная группа создана', error);
  };

  window.joinFamilyGroup = async (token) => {
    if (!token || !token.toUpperCase().startsWith('FAM-')) {
      glassToast('Код выглядит как FAM-XX-XXXX', { kind: 'error' });
      return;
    }
    tgUtil.haptic('medium');
    const { error } = await supabaseClient.rpc('family_join', { p_token: token });
    await reloadFamily('Вы в семейной группе', error);
  };

  window.leaveFamilyGroup = async () => {
    tgUtil.haptic('medium');
    const { error } = await supabaseClient.rpc('family_leave');
    await reloadFamily('Вы вышли из группы', error);
  };

  window.disbandFamilyGroup = async () => {
    tgUtil.haptic('medium');
    const { error } = await supabaseClient.rpc('family_disband');
    await reloadFamily('Семейная группа распущена', error);
  };

  window.removeFamilyMember = async (memberId) => {
    tgUtil.haptic('medium');
    const { error } = await supabaseClient.rpc('family_remove_member', { p_member: Number(memberId) });
    await reloadFamily('Участник удалён из группы', error);
  };

  window.approveFamilyOrder = async (orderId) => {
    tgUtil.haptic('success');
    // Сервер проверит, что заказ от участника вашей семьи, и спишет первый платёж с вашего баланса
    const { data: res, error } = await supabaseClient.rpc('family_approve_order', { p_order_id: orderId });
    if (!error && res && res.balance !== undefined) window.setUserBalance(res.balance);
    await reloadFamily('Покупка одобрена и оплачена', error);
  };

  window.declineFamilyOrder = async (orderId) => {
    tgUtil.haptic('medium');
    const { error } = await supabaseClient.rpc('family_decline_order', { p_order_id: orderId });
    await reloadFamily('Покупка отклонена', error);
  };

  await updateModalHTML();
}

// Сигнал по курсу юаня: users.settings.currency_alerts = [{ id, currency: 'CNY', target, active, created_at, fired_at, fired_rate }].
// Курс НБРБ раз в 30 минут проверяет бот (client_notifications.check_currency_alerts): когда 1 юань <= target,
// сигнал гаснет (active: false) и клиенту уходит одно сообщение.
const CURRENCY_ALERTS_MAX = 5;

async function showCurrencyAlertsModal(opts) {
  const o = opts || {};
  const U = window.UI;
  if (!userId || !supabaseClient) { U.toast('Сначала войдите в аккаунт', 'bad'); return; }
  tgUtil.haptic('light');

  let rate = null;
  try {
    const r = window.iceLogixPricing && window.iceLogixPricing.getExchangeRates ? await window.iceLogixPricing.getExchangeRates() : null;
    if (r && r._source !== 'fallback' && r.CNY_to_BYN > 0) rate = r.CNY_to_BYN;
  } catch (_) {}

  let alerts = [];
  try {
    const { data } = await supabaseClient.from('users').select('settings').eq('user_id', userId).maybeSingle();
    const list = data?.settings?.currency_alerts;
    alerts = Array.isArray(list) ? list.filter((a) => a && a.id && (a.currency || 'CNY') === 'CNY') : [];
  } catch (_) {}

  let changed = false;
  const sign = () => (window.bynSign ? window.bynSign() : '');
  const fmt = (n) => Number(n).toFixed(4).replace('.', ',');
  const day = (d) => { try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }); } catch (_) { return ''; } };
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const activeCount = () => alerts.filter((a) => a.active !== false).length;

  // Пишем поверх свежих настроек, чтобы не затереть тему, язык и остальное
  const save = async (next) => {
    const { data, error } = await supabaseClient.from('users').select('settings').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const merged = { ...(data?.settings || {}), currency_alerts: next };
    const { error: upErr } = await supabaseClient.from('users').update({ settings: merged }).eq('user_id', userId);
    if (upErr) throw upErr;
    window.userSettings = { ...(window.userSettings || {}), currency_alerts: next };
    alerts = next;
    changed = true;
  };

  const listHtml = () => alerts.length ? `
    <div class="rd-card rd-list st-alerts">
      ${alerts.map((a) => {
        const fired = a.active === false;
        return `
        <div class="rd-row st-static">
          <span class="rd-ico">${U.icon(fired ? 'checkCircle' : 'bell', 22)}</span>
          <span class="rd-row-body">
            <span class="rd-row-title"><span>1 юань до ${fmt(a.target)}&nbsp;${sign()}</span></span>
            <span class="rd-row-text">${fired ? `Сработал ${day(a.fired_at)}${a.fired_rate ? `, курс был ${fmt(a.fired_rate)}` : ''}` : 'Ждём, напишем в Telegram'}</span>
          </span>
          <button type="button" class="st-icon-btn" data-del="${U.esc(a.id)}" aria-label="Удалить сигнал">${U.icon('trash', 20)}</button>
        </div>`;
      }).join('')}
    </div>` : '';

  const formHtml = () => activeCount() >= CURRENCY_ALERTS_MAX
    ? `<p class="st-hint">Можно держать до ${CURRENCY_ALERTS_MAX} сигналов сразу. Удалите ненужный, чтобы поставить новый.</p>`
    : `
    <form class="rd-ask" id="caForm" novalidate>
      <label class="rd-ask-field">
        <span class="rd-label">Написать, когда 1 юань будет стоить не больше</span>
        <span class="rd-field"><input name="target" type="text" inputmode="decimal" autocomplete="off" placeholder="${rate ? 'Например, ' + fmt(rate * 0.98) : 'Например, 0,4300'}"></span>
      </label>
      <p class="rd-ask-err" hidden></p>
      <button type="submit" class="rd-btn rd-btn-block">Поставить сигнал</button>
    </form>`;

  U.sheet({
    title: 'Сигнал по курсу юаня',
    html: `
      <p class="st-sheet-text">Напишем в Telegram, когда официальный курс НБРБ опустится до вашей цели. Банк меняет курс раз в день, мы проверяем его каждые полчаса.</p>
      <div class="st-rate">
        <span>Курс НБРБ сейчас</span>
        <b>${rate ? `1 юань = ${fmt(rate)}&nbsp;${sign()}` : 'Не загрузился, попробуйте позже'}</b>
      </div>
      <div id="caList">${listHtml()}</div>
      <div id="caFormBox">${formHtml()}</div>`,
    onClose: () => { if (changed && typeof o.onChange === 'function') o.onChange(); },
    onOpen: (wrap) => {
      const paint = () => {
        wrap.querySelector('#caList').innerHTML = listHtml();
        wrap.querySelector('#caFormBox').innerHTML = formHtml();
        bindForm();
      };

      wrap.querySelector('#caList').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-del]');
        if (!btn) return;
        btn.disabled = true;
        try {
          await save(alerts.filter((a) => a.id !== btn.dataset.del));
          tgUtil.haptic('light');
          paint();
        } catch (err) {
          console.warn('currency alert delete failed:', err?.message || err);
          U.toast('Не получилось удалить, попробуйте ещё раз', 'bad');
          btn.disabled = false;
        }
      });

      function bindForm() {
        const form = wrap.querySelector('#caForm');
        if (!form) return;
        const errEl = form.querySelector('.rd-ask-err');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const raw = (form.elements.target.value || '').trim().replace(',', '.');
          const v = Number(raw);
          let msg = '';
          if (!raw || !Number.isFinite(v) || v <= 0) msg = 'Введите курс числом, например 0,43';
          else if (v >= 1) msg = 'Курс указывается за 1 юань, например 0,43';
          else if (rate && v >= rate) msg = `Юань уже стоит ${fmt(rate)}. Укажите курс ниже текущего`;
          else if (alerts.some((a) => a.active !== false && Math.abs(Number(a.target) - v) < 0.00005)) msg = 'Такой сигнал уже стоит';
          if (msg) { errEl.textContent = msg; errEl.hidden = false; return; }
          const submit = form.querySelector('button[type="submit"]');
          submit.disabled = true;
          try {
            await save([...alerts, { id: newId(), currency: 'CNY', target: Math.round(v * 10000) / 10000, active: true, created_at: new Date().toISOString() }]);
            tgUtil.haptic('success');
            U.toast('Сигнал поставлен');
            paint();
          } catch (err) {
            console.warn('currency alert save failed:', err?.message || err);
            errEl.textContent = 'Не получилось сохранить. Попробуйте ещё раз';
            errEl.hidden = false;
            submit.disabled = false;
          }
        });
      }
      bindForm();
    },
  });
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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'logisticsModal';

  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeLogisticsModalBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center">
        <h3 class="text-white font-bold text-sm truncate">История перемещений</h3>
        <p class="text-white/40 text-[10px]">Трекинг статуса посылки</p>
      </div>
      <div style="width: 48px;"></div>
    </div>
    <div id="logisticsContent" class="full-screen-modal-body text-center py-10 text-white/50 text-xs flex flex-col items-center justify-center">
      <span class="ix ix-mute animate-pulse text-2xl mb-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span>
      Загрузка истории...
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeLogisticsModalBtn').onclick = () => window.closeModalWithAnimation(modal);
  modal.addEventListener('click', e => { if(e.target === modal) window.closeModalWithAnimation(modal); });

  try {
    const { data: events, error } = await supabaseClient
      .from('logistics_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const content = modal.querySelector('#logisticsContent');
    content.className = 'full-screen-modal-body'; // remove loading styles

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
  modal.className = 'full-screen-modal-overlay page-enter';
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
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeChatModalBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center min-w-0 flex-1 px-2">
        <h3 class="text-white font-bold text-sm truncate">Чат по заказу #${orderId.slice(0, 8)}</h3>
        <p class="text-cyan-400 text-[10px]">${isAdmin ? 'Режим менеджера' : 'Ответ в течение 5-15 минут'}</p>
      </div>
      <div style="width: 48px;"></div>
    </div>

    <div class="full-screen-modal-body p-4 space-y-3" id="chatMessagesContainer">
      <div class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    </div>

    <div class="p-3 border-t border-white/10 bg-slate-900/95 flex gap-2 items-center flex-shrink-0" style="padding-bottom: calc(12px + env(safe-area-inset-bottom, 12px));">
      <input type="text" id="chatMessageInput" placeholder="Введите сообщение..." class="flex-1 p-2.5 rounded-xl bg-slate-800 border border-white/20 text-white text-xs focus:border-cyan-500 focus:outline-none">
      <button id="sendChatMessageBtn" class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl text-xs transition">Отправить</button>
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
    const colors = ['#4DA3FF', '#2F86F5', '#b8e0f6', '#ffffff', '#fbbf24'];
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
  modal.className = 'full-screen-modal-overlay page-enter';
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
                    <span class="text-[9px] text-white/40 line-through font-mono inline-flex items-baseline gap-0.5">${item.oldPrice} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span>
                    <p class="text-green-400 font-bold font-mono text-sm leading-none mt-0.5 inline-flex items-baseline gap-0.5">${item.price} ${window.bynSign ? window.bynSign({ color: 'emerald', size: '0.85em' }) : ''}</p>
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
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeVipModalBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center">
        <h3 class="text-amber-400 font-extrabold text-sm truncate">🔥 VIP-Горящие товары</h3>
        <p class="text-white/40 text-[10px]">Эксклюзивные предложения</p>
      </div>
      <div style="width: 48px;"></div>
    </div>
    
    <div class="full-screen-modal-body" id="vipModalBody">
      ${hasCelebrated ? renderVipGrid() : renderCelebration()}
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

// Ключ восстановления: в базе (users.recovery_code_hash) лежит только SHA-256, сам ключ показываем один раз.
// Восстановление: боту /recover с нового Telegram. Нормализация совпадает с _recovery_hash в боте.
async function recoveryKeyHash(code) {
  const norm = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateRecoveryKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = new Uint32Array(12);
  crypto.getRandomValues(rnd);
  const s = Array.from(rnd, (n) => chars[n % chars.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

async function showRecoveryCodeModal(opts) {
  const o = opts || {};
  const U = window.UI;
  if (!userId || !supabaseClient) { U.toast('Сначала войдите в аккаунт', 'bad'); return; }
  let hasKey = false;
  try {
    const { data } = await supabaseClient.from('users').select('recovery_code_hash').eq('user_id', userId).maybeSingle();
    hasKey = !!data?.recovery_code_hash;
  } catch (_) {}

  U.sheet({
    title: 'Ключ восстановления',
    html: `
      <p class="st-sheet-text">Если потеряете доступ к Telegram, например смените номер, напишите нашему боту <b>/recover</b> с нового аккаунта и пришлите этот ключ. Заказы, баланс и данные перейдут к вам.</p>
      <div id="recKeyBox" hidden>
        <div class="st-key"><b id="recKeyValue"></b><button type="button" class="st-copy" id="recKeyCopy">${U.icon('copy', 16)}Копировать</button></div>
        <div class="st-note">${U.icon('alert', 20)}<span>Сохраните ключ сейчас: в заметки или на бумагу. Показать его ещё раз мы не сможем. Никому его не отправляйте.</span></div>
      </div>
      <p class="st-sheet-text" id="recKeyState">${hasKey ? 'Ключ уже создан. Потеряли его? Создайте новый, старый сразу перестанет работать.' : 'Ключа пока нет. Создание займёт секунду.'}</p>
      <button type="button" class="rd-btn rd-btn-block" id="recKeyGen">${hasKey ? 'Создать новый ключ' : 'Создать ключ'}</button>`,
    onOpen: (wrap) => {
      const genBtn = wrap.querySelector('#recKeyGen');
      const copyBtn = wrap.querySelector('#recKeyCopy');
      genBtn.onclick = async () => {
        if (hasKey && !(await window.tgUtil.confirm('Старый ключ перестанет работать. Создать новый?'))) return;
        genBtn.disabled = true;
        const key = generateRecoveryKey();
        try {
          const hash = await recoveryKeyHash(key);
          const { error } = await supabaseClient.from('users').update({ recovery_code_hash: hash }).eq('user_id', userId);
          if (error) throw error;
          hasKey = true;
          wrap.querySelector('#recKeyValue').textContent = key;
          wrap.querySelector('#recKeyBox').hidden = false;
          wrap.querySelector('#recKeyState').hidden = true;
          genBtn.hidden = true;
          if (window.tgUtil && window.tgUtil.haptic) window.tgUtil.haptic('success');
          if (typeof o.onChange === 'function') o.onChange();
        } catch (e) {
          console.warn('recovery key save failed:', e?.message || e);
          U.toast('Не получилось сохранить ключ. Попробуйте ещё раз', 'bad');
          genBtn.disabled = false;
        }
      };
      copyBtn.onclick = async () => {
        const val = wrap.querySelector('#recKeyValue').textContent;
        try { await navigator.clipboard.writeText(val); U.toast('Ключ скопирован'); }
        catch (_) { U.toast('Не получилось скопировать, перепишите ключ вручную', 'info'); }
      };
    },
  });
}

async function showPersonalDataForm() {
  const modal = document.createElement('div');
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'personalDataModal';
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closePersonalDataBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center">
        <h3 class="text-white font-bold text-sm truncate">Мои данные</h3>
        <p class="text-white/40 text-[10px]">Личные данные и паспорт</p>
      </div>
      <div style="width: 48px;"></div>
    </div>
    
    <div class="full-screen-modal-body space-y-5">
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

      <div class="p-4 border-t border-white/10 bg-slate-900/95 flex gap-3 flex-shrink-0" style="padding-bottom: calc(16px + env(safe-area-inset-bottom, 16px));">
        <button id="savePersonalDataBtn" class="btn-primary flex-1 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
          ${ix('check')} Сохранить
        </button>
        <button id="cancelPersonalDataBtn" class="btn-secondary flex-1 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
          Отмена
        </button>
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
              subModal.className = 'full-screen-modal-overlay page-enter';
              subModal.innerHTML = `
                  <div class="full-screen-modal-header">
                      <button type="button" class="global-back-btn !mb-0" id="cancelRecBtn" title="Назад">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="15 18 9 12 15 6"/>
                        </svg>
                      </button>
                      <h3 class="text-white font-bold text-sm">Добавить получателя</h3>
                      <div style="width: 48px;"></div>
                  </div>
                  <div class="full-screen-modal-body space-y-3">
                      <div>
                          <label class="text-white/60 text-xs block mb-1">ФИО полностью</label>
                          <input type="text" id="recName" class="btn-secondary w-full p-3 rounded-xl text-sm bg-white/5 text-white border border-white/10" placeholder="Иванов Иван Иванович">
                      </div>
                      <div>
                          <label class="text-white/60 text-xs block mb-1">Серия и номер паспорта</label>
                          <input type="text" id="recPassport" class="btn-secondary w-full p-3 rounded-xl text-sm bg-white/5 text-white border border-white/10" placeholder="MP1234567">
                      </div>
                      <div>
                          <label class="text-white/60 text-xs block mb-1">Номер телефона</label>
                          <input type="text" id="recPhone" class="btn-secondary w-full p-3 rounded-xl text-sm bg-white/5 text-white border border-white/10" placeholder="+375XXXXXXXXX">
                      </div>
                  </div>
                  <div class="p-4 border-t border-white/10 bg-slate-900/95 flex gap-2 flex-shrink-0" style="padding-bottom: calc(16px + env(safe-area-inset-bottom, 16px));">
                      <button id="saveRecBtn" class="btn-primary flex-1 py-3.5 rounded-xl font-bold">Сохранить</button>
                      <button id="cancelRecBtn2" class="btn-secondary flex-1 py-3.5 rounded-xl">Отмена</button>
                  </div>
              `;
              document.body.appendChild(subModal);
              subModal.querySelector('#cancelRecBtn').onclick = () => subModal.remove();
              subModal.querySelector('#cancelRecBtn2').onclick = () => subModal.remove();
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

  const closeForm = () => window.closeModalWithAnimation(modal);
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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'ownerControlsModal';
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeOwnerControlsBtn" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center">
        <h3 class="text-white font-bold text-sm truncate">Управление тарифами</h3>
        <p class="text-white/40 text-[10px]">Настройки отпуска и буфера</p>
      </div>
      <div style="width: 48px;"></div>
    </div>
    
    <div class="full-screen-modal-body space-y-5">
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
    
    <div class="p-4 border-t border-white/10 bg-slate-900/95 flex gap-3 flex-shrink-0" style="padding-bottom: calc(16px + env(safe-area-inset-bottom, 16px));">
      <button id="saveOwnerControlsBtn" class="btn-primary flex-1 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
        ${ix('check')} Сохранить
      </button>
      <button id="cancelOwnerControlsBtn" class="btn-secondary flex-1 py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2">
        Отмена
      </button>
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
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.id = 'measurementsModal';
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button type="button" class="global-back-btn !mb-0" id="closeMeasBtn" onclick="window.closeModalWithAnimation(document.getElementById('measurementsModal'))" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div class="text-center">
        <h3 class="text-white font-bold text-sm truncate">📏 Мои размеры</h3>
        <p class="text-white/40 text-[10px]">Параметры для автоподбора</p>
      </div>
      <div style="width: 48px;"></div>
    </div>
    
    <div class="full-screen-modal-body space-y-3">
      <div>
        <label class="text-white/70 text-xs block mb-1">Рост (см)</label>
        <input type="number" id="measHeight" class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white" placeholder="175">
      </div>
      <div>
        <label class="text-white/70 text-xs block mb-1">Вес (кг)</label>
        <input type="number" id="measWeight" class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white" placeholder="70">
      </div>
      <div>
        <label class="text-white/70 text-xs block mb-1">Длина стопы (см)</label>
        <input type="number" step="0.1" id="measFoot" class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white" placeholder="27.5">
      </div>
      <div>
        <label class="text-white/70 text-xs block mb-1">Размер одежды (EU/RU)</label>
        <input type="text" id="measClothes" class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white" placeholder="M / 48">
      </div>
      <div>
        <label class="text-white/70 text-xs block mb-1">Размер обуви (EU)</label>
        <input type="number" step="0.5" id="measShoe" class="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white" placeholder="42">
      </div>
    </div>
    
    <div class="p-4 border-t border-white/10 bg-slate-900/95 flex gap-3 flex-shrink-0" style="padding-bottom: calc(16px + env(safe-area-inset-bottom, 16px));">
      <button id="saveMeasBtn" class="btn-primary flex-1 py-3.5 rounded-xl font-bold">Сохранить</button>
      <button id="cancelMeasBtn" class="btn-secondary flex-1 py-3.5 rounded-xl font-bold">Отмена</button>
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

  modal.querySelector('#cancelMeasBtn').onclick = () => window.closeModalWithAnimation(modal);
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

// Старое колесо (приз в браузере) — переадресация на общее серверное колесо
function showFortuneWheel() {
  return showWheelOfFortuneModal();
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
        <span class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} inline-flex items-baseline gap-1">${tx.amount >= 0 ? '+' : ''}${tx.amount} ${window.bynSign ? window.bynSign({ color: tx.amount >= 0 ? 'emerald' : 'purple', size: '0.85em' }) : ''}</span>
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
