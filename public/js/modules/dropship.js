// ============================================================
// ICE LOGIX Module: Dropshipper Cabinet
// ============================================================
    // ==================== РЕНДЕР КАБИНЕТА ДРОПШИППЕРА ====================
    async function renderDropshipper() {
      if (!userId) return '<p class="text-center mt-10 text-red-400">Авторизуйтесь</p>';
      
      let settings = { margin_type: 'fixed', margin_value: 0, payout_threshold: 50 };
      try {
        const { data, error } = await supabaseClient.from('dropshipper_settings').select('*').eq('user_id', userId).single();
        if (!error && data) settings = data;
      } catch(e) {}

      let maskedCard = null;
      try {
        const { data: udata } = await supabaseClient.from('users').select('encrypted_card').eq('user_id', userId).single();
        if (udata?.encrypted_card) {
          const dec = decryptData(udata.encrypted_card);
          maskedCard = dec?.cardNumber ? maskCard(dec.cardNumber) : '****';
        }
      } catch(e) {}

      let referrals = [];
      try {
        const { data, error } = await supabaseClient.from('referrals').select('referred_id, created_at').eq('referrer_id', userId);
        if (!error && data) referrals = data;
      } catch(e) {}
      
      let referralOrders = [];
      if (referrals.length > 0) {
        const referredIds = referrals.map(r => r.referred_id);
        try {
          const { data, error } = await supabaseClient.from('orders').select('*').in('user_id', referredIds).order('created_at', { ascending: false });
          if (!error && data) referralOrders = data;
        } catch(e) {}
      }
      
      let payoutRequests = [];
      try {
        const { data, error } = await supabaseClient.from('payout_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) payoutRequests = data;
      } catch(e) {}
      
      const totalEarned = referralOrders.reduce((sum, order) => sum + (order.drop_margin || 0), 0);
      const availableForPayout = totalEarned - payoutRequests.filter(r => r.status === 'approved' || r.status === 'completed').reduce((sum, r) => sum + r.amount, 0);

      const totalTurnover = referralOrders.reduce((sum, order) => sum + (Number(order.total_byn) || Number(order.total) || 0), 0);
      const referralOrdersCount = referralOrders.length;
      const averageCheck = referralOrdersCount > 0 ? (totalTurnover / referralOrdersCount).toFixed(2) : 0;

      const referralLink = userReferralCode ? `https://t.me/icelogix_bot?start=ref_${userReferralCode}` : null;

      const contentHubItems = [
        { title: 'Баннер 1200x628', image: 'https://via.placeholder.com/300x200?text=Banner', text: 'Лучшие кроссовки из Китая! Скидка 10% по коду DROP10' },
        { title: 'Текст для поста', image: null, text: 'Приведи друга и получи 50 BYN на баланс!' }
      ];
      const contentHubHtml = contentHubItems.map(item => {
        const imgBlock = item.image
          ? `<img src="${item.image}" class="w-full h-32 object-cover rounded-lg mb-2">`
          : '<div class="w-full h-20 bg-white/10 rounded-lg mb-2 flex items-center justify-center text-4xl"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span></div>';
        const dlBtn = item.image
          ? `<button class="btn-primary content-download-btn flex-1 bg-cyan-500/30 hover:bg-cyan-500/50 py-2 rounded-lg text-xs" data-url="${item.image}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span> Скачать</button>`
          : '';
        const preview = item.text.slice(0, 100) + (item.text.length > 100 ? '...' : '');
        const safeText = item.text.replace(/"/g, '&quot;');
        return `<div class="bg-white/5 rounded-xl p-3 mb-3">${imgBlock}<p class="text-white font-bold text-sm mb-1">${item.title}</p><p class="text-white/70 text-xs mb-3">${preview}</p><div class="flex gap-2"><button class="btn-secondary content-copy-btn flex-1" data-text="${safeText}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Копировать текст</button>${dlBtn}</div></div>`;
      }).join('');

      const payoutHistoryHtml = payoutRequests.length === 0
        ? '<p class="text-white/70 text-sm">Нет заявок на вывод</p>'
        : payoutRequests.map(req => {
            const sc = req.status === 'pending' ? 'text-yellow-400' : req.status === 'approved' ? 'text-green-400' : req.status === 'completed' ? 'text-blue-400' : 'text-red-400';
            const st = req.status === 'pending' ? 'В обработке' : req.status === 'approved' ? 'Одобрен' : req.status === 'completed' ? 'Выплачен' : 'Отклонён';
            return `<div class="p-2 border-b border-white/10 last:border-0"><div class="flex justify-between items-center"><span class="text-white/80 text-sm font-bold">${req.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span><span class="text-xs ${sc}">${st}</span></div><p class="text-white/50 text-xs mt-0.5">${new Date(req.created_at).toLocaleDateString('ru-RU')}</p></div>`;
          }).join('');

      return `
        <button id="backToProfileBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="space-y-4">
          <div class="glass-card">
            <h3 class="text-white font-bold text-lg mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span> Ваша реферальная ссылка</h3>
            ${referralLink
              ? `<div class="flex items-center gap-2"><p class="text-cyan-400 text-sm truncate flex-1">${referralLink}</p><button id="copyReferralLinkBtn" data-link="${referralLink}" class="btn-secondary flex-shrink-0 text-white"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Скопировать</button></div>`
              : '<p class="text-white/50 text-sm">Код не сгенерирован</p>'}
          </div>
          <div class="flex gap-2">
            <button id="showStatsTab" class="filter-chip active flex-1 text-center"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> Статистика</button>
            <button id="showContentHubTab" class="filter-chip flex-1 text-center"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span> Контент-хаб</button>
          </div>
          <div id="statsContainer">
            <div class="space-y-4">
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> Статистика продаж</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Оборот</p><p class="text-cyan-400 text-lg font-bold">${totalTurnover.toFixed(2)} BYN</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Всего заказов</p><p class="text-white text-lg font-bold">${referralOrdersCount}</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Средний чек</p><p class="text-white text-lg font-bold">${averageCheck} BYN</p></div>
                  <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Клиентов</p><p class="text-white text-lg font-bold">${referrals.length}</p></div>
                </div>
              </div>
              
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Финансы</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-[var(--ice-primary)]/10 border border-[var(--ice-primary)]/20 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Заработано</p><p class="text-green-400 text-xl font-bold">${totalEarned} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p></div>
                  <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center"><p class="text-white/70 text-[10px] uppercase tracking-wider">Доступно к выводу</p><p class="text-cyan-400 text-xl font-bold">${availableForPayout} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p></div>
                  <div class="bg-white/5 border border-white/10 rounded-xl p-3 text-center col-span-2"><p class="text-white/70 text-[10px] uppercase tracking-wider">Порог вывода</p><p class="text-white text-lg font-bold">${settings.payout_threshold} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p></div>
                </div>
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Настройки наценки</h3>
                <div class="flex flex-col sm:flex-row gap-3 mb-3">
                  <select id="marginType" class="btn-secondary flex-1 p-2 rounded-lg border border-white/30">
                    <option value="fixed" ${settings.margin_type === 'fixed' ? 'selected' : ''}>Фикс (BYN)</option>
                    <option value="percent" ${settings.margin_type === 'percent' ? 'selected' : ''}>Процент (%)</option>
                  </select>
                  <input type="number" id="marginValue" class="btn-secondary flex-1 p-2 rounded-lg border border-white/30 min-w-0" value="${settings.margin_value}" step="1" placeholder="Значение">
                </div>
                <input type="number" id="payoutThreshold" class="btn-secondary w-full p-2 rounded-lg border border-white/30 mb-3" value="${settings.payout_threshold}" placeholder="Порог вывода (BYN)">
                <div class="mt-3 mb-3">
                  <label class="text-white/60 text-sm"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span> Карта для выплат</label>
                  ${maskedCard
                    ? `<div class="flex items-center gap-2 mt-1">
                         <p class="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 text-sm font-mono">${maskedCard}</p>
                         <button id="editCardBtn" class="btn-secondary"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
                         <button id="deleteCardBtn" class="bg-red-600/60 px-3 py-2 rounded-lg text-xs"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
                       </div>
                       <div id="cardInputWrap" class="hidden mt-2">
                         <input type="text" id="cardNumberInput" class="btn-secondary w-full p-2 rounded-lg border border-white/30 text-sm font-mono" placeholder="0000 0000 0000 0000" maxlength="19">
                       </div>`
                    : `<input type="text" id="cardNumberInput" class="btn-secondary w-full mt-1 p-2 rounded-lg border border-white/30 text-sm font-mono" placeholder="0000 0000 0000 0000" maxlength="19">`
                  }
                  <p class="text-white/40 text-xs mt-1">Данные шифруются перед сохранением</p>
                </div>
                <button id="saveDropshipperSettings" class="btn-primary w-full">Сохранить настройки</button>
              </div>
              ${availableForPayout >= settings.payout_threshold ? `<div class="glass-card"><button id="requestPayoutBtn" class="w-full bg-green-600 py-2 rounded-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span> Запросить выплату (${availableForPayout} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span>)</button></div>` : ''}
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> История выплат</h3>
                ${payoutHistoryHtml}
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Приведённые клиенты</h3>
                ${referrals.length === 0 ? '<p class="text-white/70 text-sm">Пока нет приведённых клиентов</p>' : referrals.map(ref => `<div class="flex justify-between items-center p-2 border-b border-white/10"><span class="text-white/80 text-sm">ID: ${ref.referred_id}</span><span class="text-white/50 text-xs">${new Date(ref.created_at).toLocaleDateString()}</span></div>`).join('')}
              </div>
              <div class="glass-card">
                <h3 class="text-white font-bold text-lg mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Заказы клиентов</h3>
                ${referralOrders.length === 0 ? '<p class="text-white/70 text-sm">Нет заказов от приведённых клиентов</p>' : referralOrders.map(order => `<div class="flex justify-between items-center p-2 border-b border-white/10"><span class="text-white/80 text-sm">Заказ #${order.id.slice(0,8)}</span><span class="text-green-400 text-sm">+${order.drop_margin || 0} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span><span class="text-white/50 text-xs">${new Date(order.created_at).toLocaleDateString()}</span></div>`).join('')}
              </div>
            </div>
          </div>
          <div id="contentHubContainer" class="hidden">
            <div class="glass-card">
              <h3 class="text-white font-bold text-lg mb-3"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span> Контент-хаб</h3>
              ${contentHubHtml}
            </div>
          </div>
        </div>
        ${renderFooter()}
      `;
    }

    function attachDropshipperHandlers() {
      const backBtn = document.getElementById('backToProfileBtn');
      if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));
      const saveBtn = document.getElementById('saveDropshipperSettings');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const marginType = document.getElementById('marginType').value;
          const marginValue = parseFloat(document.getElementById('marginValue').value);
          const payoutThreshold = parseFloat(document.getElementById('payoutThreshold').value);
          if (isNaN(marginValue) || isNaN(payoutThreshold)) { tgUtil.alert('Введите корректные значения'); return; }
          try {
            const { error } = await supabaseClient.from('dropshipper_settings').upsert({
              user_id: userId, margin_type: marginType, margin_value: marginValue, payout_threshold: payoutThreshold, payout_method: 'card'
            });
            if (error) throw error;
            // Save encrypted card if provided
            const cardInput = document.getElementById('cardNumberInput');
            const cardWrap = document.getElementById('cardInputWrap');
            const cardVisible = cardInput && (!cardWrap || !cardWrap.classList.contains('hidden'));
            if (cardInput && cardVisible && cardInput.value.trim()) {
              const raw = cardInput.value.replace(/\s/g, '');
              const encrypted = encryptData({ cardNumber: raw });
              await supabaseClient.from('users').update({ encrypted_card: encrypted }).eq('user_id', userId);
            }
            tgUtil.alert('Настройки сохранены');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
        };
        // Card edit/delete handlers
        document.getElementById('editCardBtn')?.addEventListener('click', () => {
          document.getElementById('cardInputWrap')?.classList.remove('hidden');
        });
        document.getElementById('deleteCardBtn')?.addEventListener('click', async () => {
          if (!(await tgUtil.confirm('Удалить сохранённую карту?'))) return;
          tgUtil.haptic('warning');
          await supabaseClient.from('users').update({ encrypted_card: null }).eq('user_id', userId);
          renderCurrentScreen();
        });
      }
      const payoutBtn = document.getElementById('requestPayoutBtn');
      if (payoutBtn) {
        payoutBtn.onclick = async () => {
          const amount = parseFloat(payoutBtn.innerText.match(/\d+/)?.[0] || 0);
          if (amount <= 0) { tgUtil.alert('Недостаточно средств'); return; }
          try {
            const { error } = await supabaseClient.from('payout_requests').insert({ user_id: userId, amount: amount, status: 'pending' });
            if (error) throw error;
            tgUtil.alert('Заявка на вывод отправлена');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
        };
      }

      const copyRefBtn = document.getElementById('copyReferralLinkBtn');
      if (copyRefBtn) {
        copyRefBtn.onclick = () => {
          navigator.clipboard.writeText(copyRefBtn.dataset.link).then(() => tgUtil.alert('Ссылка скопирована'));
        };
      }

      const showStatsTab = document.getElementById('showStatsTab');
      const showContentHubTab = document.getElementById('showContentHubTab');
      const statsContainer = document.getElementById('statsContainer');
      const contentHubContainer = document.getElementById('contentHubContainer');
      if (showStatsTab && showContentHubTab) {
        showStatsTab.onclick = () => {
          statsContainer.classList.remove('hidden');
          contentHubContainer.classList.add('hidden');
          showStatsTab.classList.add('active');
          showContentHubTab.classList.remove('active');
        };
        showContentHubTab.onclick = () => {
          contentHubContainer.classList.remove('hidden');
          statsContainer.classList.add('hidden');
          showContentHubTab.classList.add('active');
          showStatsTab.classList.remove('active');
        };
      }

      document.querySelectorAll('.content-copy-btn').forEach(btn => {
        btn.onclick = () => {
          navigator.clipboard.writeText(btn.dataset.text).then(() => tgUtil.alert('Текст скопирован'));
        };
      });
      document.querySelectorAll('.content-download-btn').forEach(btn => {
        btn.onclick = () => { window.open(btn.dataset.url, '_blank'); };
      });
    }


// Global Exports
if (typeof renderDropshipper === 'function') window.renderDropshipper = renderDropshipper;
if (typeof attachDropshipperHandlers === 'function') window.attachDropshipperHandlers = attachDropshipperHandlers;
