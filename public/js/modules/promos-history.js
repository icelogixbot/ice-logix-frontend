// ============================================================
// ICE LOGIX Module: Promotions & History
// ============================================================
// ==================== АКЦИИ (ПРОМО + КОЛЕСО ФОРТУНЫ) ====================
async function renderPromoPage() {
  let promos = [];
  if (window.CacheDB) {
    promos = await window.CacheDB.get('promotions_page', async () => {
      const { data } = await supabaseClient.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10);
      return data || [];
    }, 60000);
  } else {
    const { data } = await supabaseClient.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10);
    promos = data || [];
  }
  const U = window.UI;
  const promosHtml = promos && promos.length
    ? promos.map(p => {
        const disc = p.discount_value ? (p.discount_type === 'percent' ? `−${p.discount_value}%` : `−${p.discount_value}`) : '';
        const until = p.expires_at ? 'до ' + new Date(p.expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
        return `
        <article class="pr-card" data-promotion-id="${p.id}" role="button" tabindex="0">
          <div class="pr-banner">
            <span class="pr-banner-fb">${U.icon('gift', 40)}</span>
            ${p.banner_url ? `<img src="${U.esc(p.banner_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
            ${disc ? `<span class="pr-disc">${disc}</span>` : ''}
          </div>
          <div class="pr-body">
            <h3>${U.esc(p.title || 'Акция')}</h3>
            ${p.description ? `<p>${U.esc(p.description)}</p>` : ''}
            <div class="pr-foot">${until ? `<span>${U.icon('clock', 14)}${until}</span>` : '<span>Без срока</span>'}<span class="rd-link">Подробнее${U.icon('chevR', 14)}</span></div>
          </div>
        </article>`;
      }).join('')
    : U.empty({ icon: 'gift', title: 'Сейчас акций нет', text: 'Новые скидки и розыгрыши появятся здесь и в нашем канале.' });

  return `
    <div class="rd-screen page-enter pr">
      <div class="rd-head">
        <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Акции</h1><p class="rd-head-sub">Скидки, розыгрыши и колесо удачи</p></div>
      </div>

      <div class="pr-wheel" id="promoFortuneBtn" role="button" tabindex="0">
        <div class="pr-wheel-art" aria-hidden="true"><div class="pr-wheel-disc"></div><span class="pr-wheel-hub">${U.icon('star', 18)}</span><span class="pr-wheel-pin"></span></div>
        <div class="pr-wheel-txt">
          <b>Колесо удачи</b>
          <span>Крутите раз в день бесплатно и выигрывайте до 10 бонусов</span>
          <button type="button" class="rd-btn rd-btn-sm">Крутить${U.icon('arrowR', 16)}</button>
        </div>
      </div>

      <div class="rd-section"><h2>Сейчас действуют</h2>${promos && promos.length ? `<span class="rd-pill">${promos.length}</span>` : ''}</div>
      <div class="pr-list">${promosHtml}</div>
    </div>
  `;
}

function attachPromoPageHandlers() {
  document.getElementById('promoFortuneBtn')?.addEventListener('click', () => {
    if (!window.userId) { window.requireAuth('Авторизуйтесь, чтобы крутить Колесо Фортуны и выигрывать призы!'); return; }
    showWheelOfFortuneModal();
  });
  document.querySelectorAll('[data-promotion-id]').forEach(el => {
    el.addEventListener('click', () => {
      if (!window.userId) { window.requireAuth('Авторизуйтесь, чтобы участвовать в акциях!'); return; }
      window.UI.toast('Условия акции скоро появятся здесь');
    });
  });
}

// ==================== ИСТОРИЯ ====================
async function renderHistory() {
  const U = window.UI;
  const subScreen = window._historySubScreen || 'orders';
  const fmtDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  // Подпись дня для группировки: «Сегодня», «Вчера» или дата
  const dayLabel = (d) => {
    const dt = new Date(d); const now = new Date();
    const key = (x) => x.toDateString();
    if (key(dt) === key(now)) return 'Сегодня';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (key(dt) === key(y)) return 'Вчера';
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: dt.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  };
  const groupByDay = (rows, renderRow) => {
    let html = ''; let last = '';
    rows.forEach((r) => {
      const lbl = dayLabel(r.created_at);
      if (lbl !== last) { html += `<div class="hs-day">${lbl}</div>`; last = lbl; }
      html += renderRow(r);
    });
    return html;
  };
  const txIcon = (type, amount) => ({ deposit: 'wallet', withdrawal: 'upload', payment: 'bag', refund: 'refresh', bonus: 'gift', referral: 'users' })[type] || (amount >= 0 ? 'plus' : 'minus');
  const txRow = (tx, who) => {
    const amt = Number(tx.amount || 0);
    return `
      <div class="hs-tx">
        <span class="hs-tx-ico ${amt >= 0 ? 'in' : ''}">${U.icon(txIcon(tx.type, amt), 20)}</span>
        <div class="hs-tx-body">
          <div class="hs-tx-title">${U.esc(tx.description || getTransactionTypeText(tx.type))}</div>
          <div class="hs-tx-sub">${tx.description ? U.esc(getTransactionTypeText(tx.type)) + ' · ' : ''}${fmtTime(tx.created_at)}${who ? ' · ' + who : ''}</div>
        </div>
        <span class="hs-tx-amt ${amt >= 0 ? 'in' : ''}">${amt >= 0 ? '+' : '−'}${U.money(Math.abs(amt), { keepCents: true, digits: 2 })}</span>
      </div>`;
  };
  const stars = (n) => Array.from({ length: 5 }, (_, i) => `<span class="hs-star ${i < n ? 'on' : ''}">${U.icon('star', 14)}</span>`).join('');
  const thumbs = (urls) => urls.length ? `<div class="hs-thumbs" data-urls="${encodeURIComponent(JSON.stringify(urls))}">${urls.map((u, i) => `<img src="${U.esc(u)}" alt="" loading="lazy" onclick="window.showImagePreview(JSON.parse(decodeURIComponent(this.parentElement.dataset.urls)), ${i})">`).join('')}</div>` : '';

  let content = '';

  if (subScreen === 'transactions') {
    const { data, error } = await supabaseClient.from('transaction_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    content = (error || !data || !data.length)
      ? U.empty({ icon: 'wallet', title: 'Операций пока нет', text: 'Здесь появятся пополнения, оплаты заказов, возвраты и бонусы.' })
      : `<div class="rd-card hs-txlist">${groupByDay(data, (tx) => txRow(tx))}</div>`;
  } else if (subScreen === 'family') {
    const fam = window.userSettings?.family || {};
    const headId = fam.head_id || (fam.role === 'head' ? userId : null);
    if (!headId) {
      content = U.empty({ icon: 'users', title: 'Семейный бюджет не настроен', text: 'Объедините баланс с близкими в настройках, и все общие траты будут здесь.' });
    } else {
      const { data: members } = await supabaseClient.from('users').select('user_id, settings').eq('settings->>family->>head_id', headId).limit(20);
      const memberIds = members ? members.map(m => m.user_id) : [];
      if (!memberIds.includes(headId)) memberIds.unshift(headId);
      const { data, error } = await supabaseClient.from('family_transactions').select('*').in('user_id', memberIds).order('created_at', { ascending: false }).limit(100);
      content = (error || !data || !data.length)
        ? U.empty({ icon: 'users', title: 'Общих операций пока нет', text: 'Траты и пополнения участников семьи появятся здесь.' })
        : `<div class="rd-card hs-txlist">${groupByDay(data, (tx) => txRow(tx, String(tx.user_id) === String(userId) ? 'вы' : 'ID ' + tx.user_id))}</div>`;
    }
  } else if (subScreen === 'orders') {
    // В архив попадают только завершённые заказы, через 7 дней после последнего изменения
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseClient.from('orders').select('*').eq('user_id', userId).in('status', ['delivered', 'cancelled', 'refunded']).lt('updated_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(100);
    if (error || !data || !data.length) {
      content = U.empty({ icon: 'box', title: 'Архив пока пуст', text: 'Полученные и отменённые заказы переезжают сюда через 7 дней. Текущие заказы смотрите в «Моих заказах».', action: 'Мои заказы', onclick: "switchTab('profile', 'myOrders')" });
    } else {
      content = `<div class="hs-list">${data.map((o) => {
        const st = U.orderStatus(o.status);
        const img = U.orderImage(o);
        const title = U.orderTitle(o);
        const total = Number(o.total_byn || o.total_price || 0);
        return `
          <div class="hs-card">
            <span class="hs-thumb">${img ? `<img src="${U.esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${U.icon('box', 22)}</span>
            <div class="hs-body">
              <div class="hs-title">${U.esc(title)}</div>
              <div class="hs-sub">№ ${o.id.slice(0, 8).toUpperCase()} · ${fmtDate(o.created_at)}</div>
              <div class="hs-foot"><span class="rd-status ${st.tone}">${st.text}</span>${total ? `<span class="hs-sum">${U.money(total, { keepCents: true, digits: 2 })}</span>` : ''}</div>
            </div>
          </div>`;
      }).join('')}</div>`;
    }
  } else if (subScreen === 'reviews') {
    const { data, error } = await supabaseClient.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = U.empty({ icon: 'message', title: 'Отзывов пока нет', text: 'Расскажите о заказе, и другие покупатели узнают, как всё прошло.', action: 'Оставить отзыв', onclick: "switchTab('reviews')" });
    } else {
      content = `<div class="hs-list">${data.map((r) => `
        <div class="hs-card hs-col">
          <div class="hs-row-top"><span class="hs-stars">${stars(r.rating || 5)}</span><span class="rd-status ${r.is_published ? 'ok' : 'warn'}">${r.is_published ? 'Опубликован' : 'На модерации'}</span></div>
          <p class="hs-text">${U.esc(r.text || '')}</p>
          ${thumbs(r.photo_urls || [])}
          <div class="hs-sub">${fmtDate(r.created_at)}</div>
        </div>`).join('')}</div>`;
    }
  } else if (subScreen === 'legitchecks') {
    const { data, error } = await supabaseClient.from('legit_check_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = U.empty({ icon: 'shield', title: 'Проверок пока не было', text: 'Отправьте фото вещи, и эксперты скажут, оригинал это или нет.', action: 'Проверить вещь', onclick: "switchTab('legitcheck')" });
    } else {
      content = `<div class="hs-list">${data.map((c) => {
        const st = c.status === 'pending' ? ['warn', 'На проверке'] : c.status === 'original' ? ['ok', 'Оригинал'] : ['bad', 'Не оригинал'];
        const urls = (c.photos || []).map((ph) => ph.startsWith('http') ? ph : supabaseClient.storage.from('ugc').getPublicUrl(ph).data.publicUrl);
        return `
          <div class="hs-card hs-col">
            <div class="hs-row-top"><span class="hs-title">Проверка подлинности</span><span class="rd-status ${st[0]}">${st[1]}</span></div>
            ${thumbs(urls)}
            <div class="hs-sub">№ ${c.id.slice(0, 8).toUpperCase()} · ${fmtDate(c.created_at)}</div>
          </div>`;
      }).join('')}</div>`;
    }
  } else if (subScreen === 'promotions') {
    const { data, error } = await supabaseClient.from('promotions').select('*').order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = U.empty({ icon: 'gift', title: 'Акций пока не было', text: 'Скидки и розыгрыши появятся здесь, следите за новостями.' });
    } else {
      content = `<div class="hs-list">${data.map((pr) => {
        const disc = pr.discount_type === 'percent' ? `−${pr.discount_value}%` : `−${U.money(pr.discount_value)}`;
        const until = pr.expires_at ? 'до ' + new Date(pr.expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'бессрочно';
        return `
          <div class="hs-card hs-col hs-promo">
            ${pr.banner_url ? `<div class="hs-banner" style="background-image:url('${U.esc(pr.banner_url)}')"></div>` : ''}
            <div class="hs-row-top"><span class="hs-title">${U.esc(pr.title || 'Акция')}</span><span class="rd-status ${pr.is_active ? 'ok' : ''}">${pr.is_active ? 'Идёт' : 'Завершена'}</span></div>
            ${pr.description ? `<p class="hs-text">${U.esc(pr.description)}</p>` : ''}
            <div class="hs-foot"><span class="hs-disc">${disc}</span><span class="hs-sub">${until}</span></div>
          </div>`;
      }).join('')}</div>`;
    }
  } else if (subScreen === 'calculations') {
    let calculations = [];
    try {
      calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
    } catch (e) {}

    // Расчёты старше 14 дней удаляем
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const activeCalculations = calculations.filter(c => c.timestamp && c.timestamp > fourteenDaysAgo);
    if (activeCalculations.length !== calculations.length) {
      try {
        localStorage.setItem('ice_calc_history', JSON.stringify(activeCalculations));
      } catch (e) {}
    }

    if (activeCalculations.length === 0) {
      content = U.empty({ icon: 'calc', title: 'Расчётов пока нет', text: 'Посчитайте цену любой вещи, и расчёт сохранится здесь на 14 дней.', action: 'Рассчитать заказ', onclick: "switchTab('calculator')" });
    } else {
      content = `<div class="hs-list">${activeCalculations.map((c, idx) => {
        const dateStr = new Date(c.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const meta = [c.size ? 'Размер ' + c.size : '', c.color || '', (c.weight || 1) + ' кг'].filter(Boolean).map(U.esc).join(' · ');
        return `
          <div class="hs-card">
            <span class="hs-thumb">${c.image_url ? `<img src="${U.esc(c.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${U.icon('calc', 22)}</span>
            <div class="hs-body">
              <div class="hs-title">${U.esc(c.title || 'Товар без названия')}</div>
              <div class="hs-sub">${U.esc(c.marketplace || 'Poizon')} · ${dateStr}</div>
              <div class="hs-sub">${meta}</div>
              <div class="hs-foot">
                <span class="hs-sum">${U.money(Number(c.total_byn || 0), { keepCents: true, digits: 2 })}</span>
                <span class="hs-acts">
                  <button type="button" class="rd-btn rd-btn-sm rd-btn-tonal" onclick="window.restoreCalculation(${idx})">${U.icon('refresh', 16)}Открыть</button>
                  <button type="button" class="hs-del" aria-label="Удалить расчёт" onclick="window.deleteCalculation(${idx})">${U.icon('trash', 18)}</button>
                </span>
              </div>
            </div>
          </div>`;
      }).join('')}</div>`;
    }
  }

  const tabs = [
    ['historyTabOrders', 'orders', 'box', 'Архив'],
    ['historyTabTx', 'transactions', 'wallet', 'Операции'],
    ['historyTabCalculations', 'calculations', 'calc', 'Расчёты'],
    ['historyTabReviews', 'reviews', 'message', 'Отзывы'],
    ['historyTabLegit', 'legitchecks', 'shield', 'Легит-чеки'],
    ['historyTabPromo', 'promotions', 'gift', 'Акции'],
    ['historyTabFamily', 'family', 'users', 'Семья'],
  ];

  return `
    <div class="rd-screen page-enter hs">
      <div class="rd-head">
        <button id="backFromHistoryBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">История</h1><p class="rd-head-sub">Архив заказов, операции и расчёты</p></div>
      </div>
      <div class="rd-chips hs-tabs">
        ${tabs.map(([id, key, ico, label]) => `<button type="button" id="${id}" class="rd-chip hs-chip ${subScreen === key ? 'on' : ''}">${U.icon(ico, 16)}${label}</button>`).join('')}
      </div>
      <div id="historyContent" class="hs-content">
        ${content}
      </div>
    </div>
  `;
}

function attachHistoryHandlers() {
  document.getElementById('backFromHistoryBtn')?.addEventListener('click', () => {
    window._historySubScreen = null;
    window.goBackGlobal();
  });
  // Активная вкладка-чип всегда видна
  document.querySelector('.hs-chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  document.getElementById('historyTabTx')?.addEventListener('click', () => {
    window._historySubScreen = 'transactions';
    renderCurrentScreen();
  });
  document.getElementById('historyTabOrders')?.addEventListener('click', () => {
    window._historySubScreen = 'orders';
    renderCurrentScreen();
  });
  document.getElementById('historyTabFamily')?.addEventListener('click', () => {
    window._historySubScreen = 'family';
    renderCurrentScreen();
  });
  document.getElementById('historyTabReviews')?.addEventListener('click', () => {
    window._historySubScreen = 'reviews';
    renderCurrentScreen();
  });
  document.getElementById('historyTabLegit')?.addEventListener('click', () => {
    window._historySubScreen = 'legitchecks';
    renderCurrentScreen();
  });
  document.getElementById('historyTabPromo')?.addEventListener('click', () => {
    window._historySubScreen = 'promotions';
    renderCurrentScreen();
  });
  document.getElementById('historyTabCalculations')?.addEventListener('click', () => {
    window._historySubScreen = 'calculations';
    renderCurrentScreen();
  });
}

window.restoreCalculation = (idx) => {
  try {
    let calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const active = calculations.filter(c => c.timestamp && c.timestamp > fourteenDaysAgo);
    const item = active[idx];
    if (!item) return;

    if (typeof tgUtil !== 'undefined' && typeof tgUtil.haptic === 'function') tgUtil.haptic('light');

    window.orderCountry = item.country || 'CN';
    window.orderAddMode = true;
    window._pendingImportCalc = item;
    if (item.image_url) {
      window.orderImportedImageUrl = item.image_url;
    }
    window.orderAddSubMode = 'manual';
    window.orderLinkAnalyzed = true;

    if (typeof switchTab === 'function') {
      switchTab('neworder');
      if (typeof glassToast === 'function') {
        glassToast('Расчет перенесен в оформление заказа!', { kind: 'success' });
      }
    }
  } catch(e) {
    console.error('restoreCalculation error:', e);
  }
};

window.deleteCalculation = (idx) => {
  try {
    let calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let active = calculations.filter(c => c.timestamp && c.timestamp > fourteenDaysAgo);
    if (idx >= 0 && idx < active.length) {
      active.splice(idx, 1);
      localStorage.setItem('ice_calc_history', JSON.stringify(active));
      if (typeof tgUtil !== 'undefined' && typeof tgUtil.haptic === 'function') tgUtil.haptic('light');
      if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
      if (typeof glassToast === 'function') glassToast('Расчет удален из истории', { kind: 'info' });
    }
  } catch(e) {
    console.error('deleteCalculation error:', e);
  }
};

// Все транзакции (полноэкранный режим)
async function showAllTransactions() {
  const { data, error } = await supabaseClient.from('transaction_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { tgUtil.alert('Ошибка загрузки'); return; }
  const modal = document.createElement('div');
  modal.id = 'allTransactionsModal';
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeTransactionsModal" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h3 class="text-white font-bold text-base flex items-center gap-2">
        <span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span>
        История транзакций
      </h3>
      <div class="w-16"></div>
    </div>
    <div class="full-screen-modal-body">
      ${data && data.length > 0 ? data.map(tx => `
        <div class="flex justify-between py-3 border-b border-white/10 items-center">
          <div>
            <p class="text-white font-semibold text-sm">${getTransactionTypeText(tx.type)}</p>
            <p class="text-white/40 text-xs mt-0.5">${new Date(tx.created_at).toLocaleString('ru-RU')}</p>
            ${tx.description ? `<p class="text-white/70 text-xs mt-1">${tx.description}</p>` : ''}
          </div>
          <p class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-sm leading-none inline-flex items-baseline gap-1">${tx.amount >= 0 ? '+' : ''}${tx.amount} ${window.bynSign ? window.bynSign({ color: tx.amount >= 0 ? 'emerald' : 'purple', size: '0.85em' }) : ''}</p>
        </div>
      `).join('') : '<p class="text-white/50 text-center py-10">Транзакций пока нет</p>'}
    </div>
  `;
  document.body.appendChild(modal);
  if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
  modal.querySelector('#closeTransactionsModal').onclick = () => { modal.remove(); if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton(); };
}

async function showAccountRecovery() {
  const modal = document.createElement('div');
  modal.id = 'recoveryCodeModal';
  modal.className = 'full-screen-modal-overlay page-enter';
  modal.innerHTML = `
    <div class="full-screen-modal-header">
      <button id="closeRecoveryModalBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h3 class="text-white font-bold text-base flex items-center gap-2">
        <span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
        Восстановить доступ
      </h3>
      <div class="w-16"></div>
    </div>
    <div class="full-screen-modal-body space-y-4 max-w-md mx-auto w-full pt-4">
      <p class="text-white/60 text-xs">Подтвердите номер телефона для восстановления данных аккаунта</p>
      <div id="recoveryPhasePhone">
        <label class="text-white/70 text-sm block mb-1">Привязанный номер телефона</label>
        <input type="tel" id="recoveryPhoneInput" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-white"
          placeholder="+375XXXXXXXXX">
        <button id="recoverySendCodeBtn" class="btn-primary mt-4 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span> Отправить код
        </button>
        <p id="recoveryPhoneError" class="text-red-400 text-xs mt-2 hidden"></p>
      </div>
      <div id="recoveryPhaseCode" class="hidden">
        <label class="text-white/70 text-sm block mb-1">Код из Telegram-бота</label>
        <input type="text" id="recoveryCodeInput" class="btn-secondary w-full p-3.5 rounded-xl border border-white/20 text-white"
          placeholder="6-значный код" maxlength="6">
        <button id="recoveryVerifyBtn" class="mt-4 w-full bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2">
          <span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Подтвердить
        </button>
        <div class="flex justify-between items-center mt-2">
          <p id="recoveryCodeError" class="text-red-400 text-xs hidden"></p>
          <button id="recoveryResendBtn" class="text-cyan-400 text-xs hidden">Отправить повторно (<span id="recoveryTimer">60</span>с)</button>
        </div>
      </div>
    </div>
        <div id="recoveryPhaseSuccess" class="hidden text-center py-4">
          <p class="text-4xl mb-2"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span></p>
          <p class="text-white font-bold">Доступ восстановлен!</p>
          <p class="text-white/60 text-sm mt-1">Ваши данные доступны</p>
        </div>
      </div>
      <div class="p-5 border-t border-white/20">
        <button id="closeRecoveryModal" class="btn-secondary w-full">Закрыть</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  let resendInterval = null;
  const cleanClose = () => {
    if (resendInterval) clearInterval(resendInterval);
    modal.remove();
  };
  modal.querySelector('#closeRecoveryModal').onclick = cleanClose;
  modal.onclick = (e) => { if (e.target === modal) cleanClose(); };

  const startResendTimer = () => {
    let secs = 60;
    const timerEl = modal.querySelector('#recoveryTimer');
    const resendBtn = modal.querySelector('#recoveryResendBtn');
    resendBtn.classList.remove('hidden');
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.5';
    resendInterval = setInterval(() => {
      secs--;
      if (timerEl) timerEl.textContent = secs;
      if (secs <= 0) {
        clearInterval(resendInterval);
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
        resendBtn.textContent = 'Отправить повторно';
      }
    }, 1000);
  };

  const sendCode = async () => {
    const phone = modal.querySelector('#recoveryPhoneInput').value.trim();
    const errEl = modal.querySelector('#recoveryPhoneError');
    if (!phone) { errEl.textContent = 'Введите номер телефона'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    // Проверяем, есть ли номер в базе
    const { data: userRow } = await supabaseClient.from('users').select('user_id').eq('phone', phone).maybeSingle();
    if (!userRow) { errEl.textContent = 'Пользователь с таким номером не найден'; errEl.classList.remove('hidden'); return; }
    // Бот больше не отправляет сообщения сам, поэтому код в Telegram не приходит.
    // Восстановление — в чате с ботом: /recover или кнопка «Поделиться номером».
    errEl.textContent = 'Код в Telegram больше не приходит. Откройте чат с ботом ICE LOGIX и отправьте /recover — или напишите в поддержку.';
    errEl.classList.remove('hidden');
  };

  modal.querySelector('#recoverySendCodeBtn').onclick = sendCode;
  modal.querySelector('#recoveryResendBtn').onclick = sendCode;

  modal.querySelector('#recoveryVerifyBtn').onclick = async () => {
    const phone = modal.querySelector('#recoveryPhoneInput').value.trim();
    const code = modal.querySelector('#recoveryCodeInput').value.trim();
    const errEl = modal.querySelector('#recoveryCodeError');
    if (!code) { errEl.textContent = 'Введите код'; errEl.classList.remove('hidden'); return; }
    const { data: userRow } = await supabaseClient.from('users').select('user_id').eq('phone', phone).maybeSingle();
    if (!userRow) { errEl.textContent = 'Ошибка — номер не найден'; errEl.classList.remove('hidden'); return; }
    const { data: codeRow } = await supabaseClient.from('verification_codes')
      .select('id').eq('user_id', userRow.user_id).eq('code', code).eq('type', 'recovery').eq('used', false)
      .gte('expires_at', new Date().toISOString()).maybeSingle();
    if (!codeRow) { errEl.textContent = 'Неверный или просроченный код'; errEl.classList.remove('hidden'); return; }
    await supabaseClient.from('verification_codes').update({ used: true }).eq('id', codeRow.id);
    clearInterval(resendInterval);
    modal.querySelector('#recoveryPhaseCode').classList.add('hidden');
    modal.querySelector('#recoveryPhaseSuccess').classList.remove('hidden');
  };
}

// ============================================================
// ICE LOGIX: Settings & Notifications Native Page Components
// Rendered directly inside #content (Header and Footer visible)
// ============================================================

window._settingsInitialTab = 'account';
window._notifActiveFilter = 'all';

async function showNotificationSettings() {
  return showAppSettings('notifications');
}

async function showAppSettings(initialTab = 'account') {
  window._settingsInitialTab = initialTab || 'account';
  if (typeof switchTab === 'function') {
    switchTab('settings');
  }
}

// Версия показывается внизу настроек. Поднимать вместе с "version" в package.json
const ICE_APP_VERSION = '2.1.0';

async function renderSettingsPage(initialTab = 'account') {
  const U = window.UI;
  let authUser = null;
  let data = null;
  // Состояние код-пароля с сервера; если сервер долго молчит, экран не ждёт дольше 5 секунд
  const lockPromise = window.AppLock
    ? Promise.race([window.AppLock.status().catch(() => null), new Promise((r) => setTimeout(() => r(null), 5000))])
    : Promise.resolve(null);
  try {
    const [authRes, profileRes] = await Promise.all([
      supabaseClient ? supabaseClient.auth.getUser() : Promise.resolve({ data: {} }),
      (supabaseClient && userId)
        ? supabaseClient.from('users').select('notification_settings, settings, telegram_id, username, full_name, role, avatar_url, recovery_code_hash').eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null })
    ]);
    authUser = authRes?.data?.user || null;
    data = profileRes?.data || null;
    if (profileRes?.error) console.warn('settings: profile load failed:', profileRes.error.message);
  } catch (_) {}

  const ls = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const settings = data?.settings || window.userSettings || {};
  if (data?.settings) window.userSettings = { ...(window.userSettings || {}), ...data.settings };
  let localNotif = {};
  try { localNotif = JSON.parse(ls('notification_settings') || '{}') || {}; } catch (_) {}
  const notif = { news: true, promotions: true, ...localNotif, ...(data?.notification_settings || {}), status_changes: true };
  window._stNotif = notif;
  const theme = window._currentAppliedTheme || ls('theme') || settings.theme || 'dark';
  const lang = ls('lang') || settings.lang || 'ru';
  const hapticsOn = ls('ice_haptics') === '1';

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  const meta = authUser?.user_metadata || {};
  const tgId = data?.telegram_id || meta.telegram_id || tgUser?.id || null;
  const rawNick = data?.username || tgUser?.username || meta.user_name || meta.username || '';
  const nick = rawNick ? (rawNick.startsWith('@') ? rawNick : '@' + rawNick) : '';
  const name = data?.full_name || meta.full_name || [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || nick || 'Без имени';
  const avatar = data?.avatar_url || meta.avatar_url || tgUser?.photo_url || '';
  const email = authUser?.email || '';
  const isTechEmail = !email || (email.startsWith('tg_') && email.endsWith('@icelogix.by'));
  const emailConfirmed = !!authUser?.email_confirmed_at;
  const idText = tgId ? String(tgId) : (userId ? String(userId) : '');
  const role = data?.role;
  const roleText = (role === 'owner' || role === 'admin') ? 'Администратор' : role === 'partner' ? 'Партнёр' : 'Клиент';
  const hasKey = !!data?.recovery_code_hash;
  const lock = await lockPromise;
  // Тихие часы и сигнал курса читает бот (ICE LOGIX BOT/client_notifications.py)
  const quiet = settings.quiet_hours || {};
  const quietOn = !!quiet.enabled;
  const quietText = `С ${quiet.from || '23:00'} до ${quiet.to || '09:00'} по времени Минска`;
  const activeAlerts = Array.isArray(settings.currency_alerts) ? settings.currency_alerts.filter((a) => a && a.id && a.active !== false).length : 0;
  const alertsText = activeAlerts === 1 ? 'Включён' : activeAlerts > 1 && activeAlerts < 5 ? `${activeAlerts} сигнала` : `${activeAlerts} сигналов`;
  // Telegram пускает сообщения бота только с разрешения пользователя (Bot API 6.9+)
  const tgApp = window.Telegram?.WebApp;
  const needWriteAccess = !!(tgUser && tgApp?.requestWriteAccess && tgApp.isVersionAtLeast?.('6.9') && !tgUser.allows_write_to_pm && !window._botWriteAllowed);

  const tabAlias = { language: 'view', theme: 'view' };
  const activeTab = tabAlias[initialTab] || initialTab || 'account';

  const chev = U.icon('chevR', 22, { cls: 'rd-chev' });
  const status = (tone, text) => `<span class="rd-status ${tone}">${text}</span>`;
  const body = (title, text) => `<span class="rd-row-body"><span class="rd-row-title">${title}</span>${text ? `<span class="rd-row-text">${text}</span>` : ''}</span>`;
  const row = (id, ico, title, text, end = chev) => `
    <div class="rd-row" role="button" tabindex="0" id="${id}">
      <span class="rd-ico">${U.icon(ico, 22)}</span>${body(title, text)}${end}
    </div>`;
  const infoRow = (ico, title, text, end) => `
    <div class="rd-row st-static">
      <span class="rd-ico">${U.icon(ico, 22)}</span>${body(title, text)}${end || ''}
    </div>`;
  const switchRow = (id, ico, title, text, checked) => `
    <label class="rd-row st-static">
      <span class="rd-ico">${U.icon(ico, 22)}</span>${body(title, text)}
      <span class="rd-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span></span></span>
    </label>`;

  const tabs = [['account', 'user', 'Аккаунт'], ['security', 'shield', 'Защита'], ['notifications', 'bell', 'Уведомления'], ['view', 'sparkles', 'Вид']];
  const langs = [['ru', 'RU', 'Русский', 'Основной язык'], ['be', 'BY', 'Беларуская', 'Пераклад у працэсе'], ['en', 'EN', 'English', 'Translation in progress']];
  const panel = (key, html) => `<div id="settingsPanel-${key}" class="st-panel" role="tabpanel" ${activeTab === key ? '' : 'hidden'}>${html}</div>`;

  const accountHtml = `
    <div class="rd-card">
      <div class="st-me">
        <div class="st-ava">${avatar ? `<img src="${U.esc(avatar)}" alt="">` : U.icon('user', 28)}</div>
        <div class="st-who"><b>${U.esc(name)}</b>${nick ? `<span>${U.esc(nick)}</span>` : ''}</div>
        ${status('', roleText)}
      </div>
      ${idText ? `
      <div class="st-id">
        <div><span>ID аккаунта</span><br><b>${U.esc(idText)}</b></div>
        <button type="button" class="st-copy" id="copySettingsIdBtn" data-id="${U.esc(idText)}">${U.icon('copy', 16)}Скопировать</button>
      </div>` : ''}
    </div>

    <p class="st-cap">Личное</p>
    <div class="rd-card rd-list">
      ${row('settingsMyDataBtn', 'idcard', 'Мои данные', 'Паспорт, получатели и размеры')}
    </div>

    <p class="st-cap">Сеансы</p>
    <div class="rd-card rd-list">
      ${row('logoutOthersBtn', 'devices', 'Выйти на других устройствах', 'Если входили с чужого телефона или компьютера', '')}
      ${row('settingsLogoutBtn', 'logout', 'Выйти из аккаунта', 'Только на этом устройстве', '')}
    </div>

    <div class="rd-card rd-list st-danger">
      ${row('settingsDeleteAccountBtn', 'trash', 'Удалить аккаунт', 'Заказы, баланс и бонусы удалятся навсегда', '')}
    </div>`;

  const securityHtml = `
    <p class="st-cap">Как вы входите</p>
    <div class="rd-card rd-list">
      ${tgId
        ? infoRow('send', 'Telegram', nick ? U.esc(nick) : 'Аккаунт привязан', status('ok', 'Подключён'))
        : infoRow('send', 'Telegram', 'Откройте приложение через бота ICE LOGIX, и Telegram привяжется сам', status('warn', 'Нет'))}
      ${isTechEmail
        ? row('linkEmailBtn', 'mail', 'Почта и пароль', 'Чтобы входить с компьютера или из браузера')
        : infoRow('mail', 'Почта', U.esc(email), emailConfirmed ? status('ok', 'Подтверждена') : status('warn', 'Ждёт подтверждения'))}
      ${isTechEmail ? '' : row('changePasswordBtn', 'lock', 'Сменить пароль', 'Для входа по почте')}
    </div>

    <p class="st-cap">Вход в приложение</p>
    <div class="rd-card rd-list">
      ${!lock
        ? infoRow('lock', 'Код-пароль', 'Не получилось проверить. Откройте этот экран ещё раз чуть позже')
        : switchRow('appLockSwitch', 'lock', 'Код-пароль',
            lock.blocked ? 'Заблокирован после 5 ошибок. Сбросьте через Telegram' : lock.enabled ? 'Спрашиваем при входе и после 2 минут в фоне' : '4 цифры при входе в приложение',
            lock.enabled)}
      ${lock && lock.enabled ? row('appLockChangeBtn', 'key', 'Сменить код-пароль', 'Нужен текущий код') : ''}
      ${lock && lock.enabled && lock.bioAvailable
        ? switchRow('appLockBioSwitch', lock.bioName === 'Face ID' ? 'faceid' : 'fingerprint', `Вход по ${lock.bioName}`, 'Вместо ввода кода на этом телефоне', lock.bioDevice)
        : ''}
    </div>
    ${lock && !lock.enabled && !lock.inTelegram ? '<p class="st-hint">Включить код-пароль можно в приложении внутри Telegram: код для сброса придёт от нашего бота.</p>' : ''}

    <p class="st-cap">Если потеряете Telegram</p>
    <div class="rd-card rd-list">
      ${row('securityRecoveryBtn', 'key', 'Ключ восстановления',
        hasKey ? 'С ним вы вернёте заказы и баланс на новый Telegram' : 'Создайте заранее, чтобы не потерять заказы и баланс',
        `<span class="st-end">${hasKey ? status('ok', 'Есть') : status('warn', 'Нет')}${chev}</span>`)}
    </div>`;

  const notificationsHtml = `
    ${needWriteAccess ? `
    <div class="rd-card rd-list st-write" id="botWriteCard">
      ${row('allowBotWriteBtn', 'send', 'Разрешите боту писать вам', 'Без этого сообщения в Telegram могут не дойти')}
    </div>` : ''}

    <p class="st-cap">Сообщения от бота в Telegram</p>
    <div class="rd-card rd-list">
      ${infoRow('truck', 'Статусы заказов', 'Выкуп, склад в Китае, доставка', '<span class="st-end">Всегда</span>')}
      ${switchRow('notifyNews', 'bell', 'Новости сервиса', 'Новые возможности, тарифы, график работы', notif.news)}
      ${switchRow('notifyPromotions', 'gift', 'Акции и промокоды', 'Скидки на доставку и розыгрыши', notif.promotions)}
    </div>

    <p class="st-cap">Не беспокоить</p>
    <div class="rd-card rd-list">
      ${switchRow('quietHoursSwitch', 'moon', 'Тихие часы', 'Новости, акции и курс придут утром. Статусы заказов — сразу', quietOn)}
      <div class="rd-row" role="button" tabindex="0" id="quietHoursTimeBtn" ${quietOn ? '' : 'hidden'}>
        <span class="rd-ico">${U.icon('clock', 22)}</span>${body('Время', `<span id="quietHoursTimeText">${quietText}</span>`)}${chev}
      </div>
    </div>

    <p class="st-cap">Курс</p>
    <div class="rd-card rd-list">
      ${row('currencyAlertsBtn', 'coins', 'Сигнал по курсу юаня', 'Напишем, когда юань подешевеет до нужного курса',
        `<span class="st-end">${activeAlerts ? status('ok', alertsText) : ''}${chev}</span>`)}
    </div>
    ${tgId ? '' : '<p class="st-hint">Сообщения приходят в Telegram. Откройте приложение через нашего бота, чтобы их получать.</p>'}`;

  const viewHtml = `
    <p class="st-cap">Язык</p>
    <div class="rd-card rd-list" role="radiogroup" aria-label="Язык">
      ${langs.map(([code, flag, title, sub]) => `
        <div class="rd-row lang-btn ${lang === code ? 'on' : ''}" role="radio" tabindex="0" aria-checked="${lang === code}" data-lang="${code}">
          <span class="st-flag">${flag}</span>${body(title, sub)}
          <span class="st-check">${U.icon('check', 24)}</span>
        </div>`).join('')}
    </div>

    <p class="st-cap">Тема</p>
    <div class="st-themes">
      <button type="button" class="st-theme theme-btn ${theme !== 'light' ? 'on' : ''}" data-theme="dark" aria-pressed="${theme !== 'light'}">
        <span class="st-theme-ico">${U.icon('moon', 24)}</span>Тёмная<small>Основная</small>
      </button>
      <button type="button" class="st-theme theme-btn ${theme === 'light' ? 'on' : ''}" data-theme="light" aria-pressed="${theme === 'light'}">
        <span class="st-theme-ico light">${U.icon('sun', 24)}</span>Светлая<small>Для яркого солнца</small>
      </button>
    </div>

    <p class="st-cap">Отклик</p>
    <div class="rd-card rd-list">
      ${switchRow('settingsHaptics', 'vibrate', 'Вибрация', 'Лёгкий отклик телефона при нажатиях', hapticsOn)}
    </div>`;

  return `
    <div class="rd-screen page-enter st">
      ${U.screenHead({ title: 'Настройки', sub: 'Аккаунт, защита, уведомления и вид' })}

      <div class="st-tabs" role="tablist">
        ${tabs.map(([k, ico, label]) => `<button type="button" role="tab" class="settings-page-tab ${activeTab === k ? 'on' : ''}" aria-selected="${activeTab === k}" data-tab="${k}">${U.icon(ico, 20)}<span>${label}</span></button>`).join('')}
      </div>

      <div id="settingsPageCard">
        ${panel('account', accountHtml)}
        ${panel('security', securityHtml)}
        ${panel('notifications', notificationsHtml)}
        ${panel('view', viewHtml)}
      </div>

      <p class="st-ver">ICE LOGIX · версия ${ICE_APP_VERSION}</p>
    </div>
    ${typeof renderFooter === 'function' ? renderFooter() : ''}
  `;
}

// Человеческий текст для ошибок входа/почты из Supabase Auth
function settingsAuthErrorText(e) {
  const m = String(e?.message || e || '').toLowerCase();
  if (m.includes('already') && (m.includes('registered') || m.includes('exists') || m.includes('use'))) return 'Эта почта уже занята другим аккаунтом';
  if (m.includes('password') && (m.includes('weak') || m.includes('should') || m.includes('least'))) return 'Пароль слишком простой. Добавьте цифры и буквы';
  if (m.includes('same') && m.includes('password')) return 'Новый пароль совпадает со старым';
  if (m.includes('rate') || m.includes('too many') || m.includes('security purposes')) return 'Слишком много попыток. Подождите пару минут';
  if (m.includes('reauth')) return 'Для смены пароля войдите заново по почте';
  if (m.includes('invalid') && m.includes('email')) return 'Проверьте адрес почты';
  return 'Не получилось. Попробуйте ещё раз';
}

function attachSettingsPageHandlers(initialTab = 'account') {
  const U = window.UI;
  const haptic = (t) => { if (window.tgUtil && window.tgUtil.haptic) window.tgUtil.haptic(t); };
  const setLs = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const tap = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onclick = fn;
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  };
  const rerender = (tab) => {
    window._settingsInitialTab = tab;
    if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
    else if (typeof switchTab === 'function') switchTab('settings');
  };

  // Настройки вида храним в users.settings рядом с остальными (theme уже читается при запуске в app-core)
  async function saveSettings(partial) {
    window.userSettings = { ...(window.userSettings || {}), ...partial };
    if (!supabaseClient || !userId) return true;
    try {
      const { data, error } = await supabaseClient.from('users').select('settings').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      const merged = { ...(data?.settings || {}), ...partial };
      const { error: upErr } = await supabaseClient.from('users').update({ settings: merged }).eq('user_id', userId);
      if (upErr) throw upErr;
      window.userSettings = merged;
      return true;
    } catch (e) {
      console.warn('settings save failed:', e?.message || e);
      U.toast('Не получилось сохранить, попробуйте ещё раз', 'bad');
      return false;
    }
  }

  // Вкладки
  const panels = ['account', 'security', 'notifications', 'view'];
  document.querySelectorAll('.settings-page-tab').forEach((tab) => {
    tab.onclick = () => {
      const target = tab.dataset.tab;
      window._settingsInitialTab = target;
      document.querySelectorAll('.settings-page-tab').forEach((t) => {
        t.classList.toggle('on', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      panels.forEach((name) => {
        const p = document.getElementById(`settingsPanel-${name}`);
        if (p) p.hidden = name !== target;
      });
      haptic('selection');
    };
  });

  // Аккаунт
  const copyIdBtn = document.getElementById('copySettingsIdBtn');
  if (copyIdBtn) {
    copyIdBtn.onclick = async () => {
      const id = copyIdBtn.dataset.id || '';
      if (!id) return;
      try {
        await navigator.clipboard.writeText(id);
        U.toast('ID скопирован');
        haptic('success');
      } catch (_) {
        U.toast('Не получилось скопировать. Ваш ID: ' + id, 'info');
      }
    };
  }

  tap('settingsMyDataBtn', () => { if (typeof switchTab === 'function') switchTab('kyc'); });

  tap('logoutOthersBtn', async () => {
    const ok = await window.tgUtil.confirm('Выйти на всех других устройствах? Здесь вы останетесь в аккаунте.');
    if (!ok || !supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.signOut({ scope: 'others' });
      if (error) throw error;
      U.toast('Готово: на других устройствах вы вышли');
      haptic('success');
    } catch (e) {
      console.warn('signOut others failed:', e?.message || e);
      U.toast('Не получилось. Попробуйте позже', 'bad');
    }
  });

  tap('settingsLogoutBtn', () => { if (typeof window.logoutUser === 'function') window.logoutUser(); });
  tap('settingsDeleteAccountBtn', () => { if (typeof window.deleteUserAccount === 'function') window.deleteUserAccount(); });

  // Защита
  tap('linkEmailBtn', async () => {
    const v = await U.ask({
      title: 'Почта и пароль',
      text: 'Чтобы входить в ICE LOGIX с компьютера или из браузера. На почту придёт письмо со ссылкой для подтверждения.',
      fields: [
        { name: 'email', label: 'Почта', type: 'email', placeholder: 'name@mail.ru', autocomplete: 'email', inputmode: 'email' },
        { name: 'password', label: 'Пароль', type: 'password', placeholder: 'Не короче 8 символов', autocomplete: 'new-password' }
      ],
      action: 'Привязать почту',
      validate: (x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email) ? 'Проверьте адрес почты' : (x.password.length < 8 ? 'Пароль должен быть не короче 8 символов' : '')
    });
    if (!v || !supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.updateUser({ email: v.email, password: v.password });
      if (error) throw error;
      U.toast('Письмо отправлено. Подтвердите почту по ссылке');
      haptic('success');
      rerender('security');
    } catch (e) {
      U.toast(settingsAuthErrorText(e), 'bad');
    }
  });

  tap('changePasswordBtn', async () => {
    const v = await U.ask({
      title: 'Новый пароль',
      fields: [
        { name: 'password', label: 'Новый пароль', type: 'password', placeholder: 'Не короче 8 символов', autocomplete: 'new-password' },
        { name: 'repeat', label: 'Ещё раз', type: 'password', placeholder: 'Повторите пароль', autocomplete: 'new-password' }
      ],
      action: 'Сменить пароль',
      validate: (x) => x.password.length < 8 ? 'Пароль должен быть не короче 8 символов' : (x.password !== x.repeat ? 'Пароли не совпадают' : '')
    });
    if (!v || !supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: v.password });
      if (error) throw error;
      U.toast('Пароль изменён');
      haptic('success');
    } catch (e) {
      U.toast(settingsAuthErrorText(e), 'bad');
    }
  });

  // Код-пароль и биометрия: переключатель меняется только после подтверждения на сервере
  const bindLockSwitch = (id, onFlow, offFlow) => {
    const el = document.getElementById(id);
    if (!el || !window.AppLock) return;
    el.onchange = async () => {
      const want = el.checked;
      el.checked = !want;
      const ok = await (want ? onFlow() : offFlow());
      if (ok) rerender('security');
    };
  };
  bindLockSwitch('appLockSwitch', () => window.AppLock.enableFlow(), () => window.AppLock.disableFlow());
  bindLockSwitch('appLockBioSwitch', () => window.AppLock.bioEnableFlow(), () => window.AppLock.bioDisableFlow());
  tap('appLockChangeBtn', () => { if (window.AppLock) window.AppLock.changeFlow(); });

  tap('securityRecoveryBtn', () => {
    if (typeof showRecoveryCodeModal === 'function') showRecoveryCodeModal({ onChange: () => rerender('security') });
  });

  // Уведомления: статусы заказов всегда включены, остальное по выбору
  ['notifyNews', 'notifyPromotions'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = async () => {
      const next = {
        ...(window._stNotif || {}),
        status_changes: true,
        news: !!document.getElementById('notifyNews')?.checked,
        promotions: !!document.getElementById('notifyPromotions')?.checked
      };
      haptic('light');
      if (supabaseClient && userId) {
        const { error } = await supabaseClient.from('users').update({ notification_settings: next }).eq('user_id', userId);
        if (error) {
          el.checked = !el.checked;
          U.toast('Не получилось сохранить, попробуйте ещё раз', 'bad');
          return;
        }
      }
      window._stNotif = next;
      setLs('notification_settings', JSON.stringify(next));
    };
  });

  tap('allowBotWriteBtn', () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.requestWriteAccess) return;
    tg.requestWriteAccess((allowed) => {
      if (allowed) {
        window._botWriteAllowed = true;
        const card = document.getElementById('botWriteCard');
        if (card) card.remove();
        U.toast('Готово, бот сможет писать вам');
        haptic('success');
      } else {
        U.toast('Без разрешения сообщения от бота не придут', 'info');
      }
    });
  });

  // Тихие часы: в users.settings.quiet_hours = { enabled, from: 'ЧЧ:ММ', to: 'ЧЧ:ММ' }
  const currentQuiet = () => ({ from: '23:00', to: '09:00', ...((window.userSettings || {}).quiet_hours || {}) });
  const quietSwitch = document.getElementById('quietHoursSwitch');
  if (quietSwitch) {
    quietSwitch.onchange = async () => {
      const on = quietSwitch.checked;
      haptic('light');
      const ok = await saveSettings({ quiet_hours: { ...currentQuiet(), enabled: on } });
      if (!ok) { quietSwitch.checked = !on; return; }
      const timeRow = document.getElementById('quietHoursTimeBtn');
      if (timeRow) timeRow.hidden = !on;
    };
  }

  tap('quietHoursTimeBtn', async () => {
    const q = currentQuiet();
    const hm = /^([01]\d|2[0-3]):[0-5]\d$/;
    const v = await U.ask({
      title: 'Тихие часы',
      text: 'В это время бот не пришлёт новости, акции и сигнал курса — они придут, когда тихие часы закончатся. Статусы заказов приходят всегда.',
      fields: [
        { name: 'from', label: 'С', type: 'time', value: q.from, placeholder: '23:00' },
        { name: 'to', label: 'До', type: 'time', value: q.to, placeholder: '09:00' }
      ],
      action: 'Сохранить',
      validate: (x) => !hm.test(x.from) || !hm.test(x.to) ? 'Укажите время в формате 23:00' : (x.from === x.to ? 'Начало и конец не должны совпадать' : '')
    });
    if (!v) return;
    if (await saveSettings({ quiet_hours: { ...q, enabled: true, from: v.from, to: v.to } })) {
      const t = document.getElementById('quietHoursTimeText');
      if (t) t.textContent = `С ${v.from} до ${v.to} по времени Минска`;
      haptic('success');
    }
  });

  tap('currencyAlertsBtn', () => {
    if (typeof showCurrencyAlertsModal === 'function') showCurrencyAlertsModal({ onChange: () => rerender('notifications') });
  });

  // Вид: язык
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    const pick = () => {
      const next = btn.dataset.lang;
      let cur = 'ru';
      try { cur = localStorage.getItem('lang') || 'ru'; } catch (_) {}
      if (!next || next === cur) return;
      document.querySelectorAll('.lang-btn').forEach((b) => {
        b.classList.toggle('on', b === btn);
        b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
      });
      haptic('selection');
      setLs('lang', next);
      saveSettings({ lang: next });
      window._settingsInitialTab = 'view';
      if (typeof applyLanguage === 'function') applyLanguage(next);
    };
    btn.onclick = pick;
    btn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  });

  // Вид: тема
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.onclick = () => {
      const next = btn.dataset.theme;
      document.querySelectorAll('.theme-btn').forEach((b) => {
        b.classList.toggle('on', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      setLs('theme', next);
      if (typeof applyTheme === 'function') applyTheme(next);
      saveSettings({ theme: next });
      haptic('selection');
    };
  });

  // Вид: вибрация (по умолчанию выключена)
  const hapticsEl = document.getElementById('settingsHaptics');
  if (hapticsEl) {
    hapticsEl.onchange = () => {
      const on = hapticsEl.checked;
      setLs('ice_haptics', on ? '1' : '0');
      saveSettings({ haptics: on });
      if (on) haptic('success');
    };
  }
}

// ============================================================
// NOTIFICATIONS PAGE RENDERER (Native Tab inside #content)
// ============================================================

async function showNotificationsPanel() {
  if (typeof switchTab === 'function') {
    switchTab('notifications');
  }
}

async function renderNotificationsPage() {
  let notifications = [];
  try {
    const cached = localStorage.getItem('ice_cached_notifs_' + (userId || 'guest'));
    if (cached) notifications = JSON.parse(cached) || [];
  } catch(e) {}

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeFilter = window._notifActiveFilter || 'all';
  const U = window.UI;
  const tabs = [['all', 'Все'], ['orders', 'Заказы'], ['news', 'Новости'], ['promos', 'Акции']];

  return `
    <div class="rd-screen page-enter nt">
      <div class="rd-head">
        <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Уведомления <span id="notifBadgeCounter" class="nt-count ${unreadCount > 0 ? '' : 'hidden'}">${unreadCount}</span></h1><p class="rd-head-sub">Заказы, новости и бонусы</p></div>
        <button id="markAllNotifsReadBtn" type="button" class="rd-back" aria-label="Отметить все прочитанными">${U.icon('checkCircle', 21)}</button>
      </div>

      <div class="fn-seg nt-seg">
        ${tabs.map(([k, l]) => `<button type="button" class="notif-filter-tab ${activeFilter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
      </div>

      <div id="notifsContainer" class="nt-list">
        ${renderNotifsItemsHtml(notifications, activeFilter)}
      </div>
    </div>
  `;
}

function renderNotifsItemsHtml(items, filter = 'all') {
  const U = window.UI;
  if (!items || items.length === 0) {
    return U.empty({ icon: 'bell', title: 'Пока тихо', text: 'Сюда придут новости о ваших посылках, скидках и бонусах.' });
  }
  const has = (n, words) => { const t = ((n.title || '') + ' ' + (n.body || '')).toLowerCase(); return words.some(w => t.includes(w)); };
  const ORD = ['заказ', 'посылк', 'трек', 'выкуп', 'склад'];
  const NEWS = ['новост', 'обновлен', 'режим', 'тариф'];
  const PROMO = ['промо', 'скидк', 'бонус', 'акци', 'купон'];
  const filtered = filter === 'orders' ? items.filter(n => has(n, ORD)) : filter === 'news' ? items.filter(n => has(n, NEWS)) : filter === 'promos' ? items.filter(n => has(n, PROMO)) : items;

  if (filtered.length === 0) {
    return U.empty({ icon: 'bell', title: 'Здесь пусто', text: 'В этом разделе уведомлений пока нет.' });
  }

  const dayLabel = (d) => {
    const dt = new Date(d); const now = new Date();
    if (dt.toDateString() === now.toDateString()) return 'Сегодня';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (dt.toDateString() === y.toDateString()) return 'Вчера';
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };
  let last = '';
  return filtered.map(n => {
    const isUnread = !n.is_read;
    const kind = has(n, ['заказ', 'посылк', 'трек']) ? ['truck', 'o'] : has(n, ['промо', 'скидк', 'бонус']) ? ['gift', 'p'] : has(n, ['оплат', 'баланс', 'карт']) ? ['wallet', 'm'] : ['bell', ''];
    let time = '';
    try { time = new Date(n.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); } catch (_) {}
    const lbl = n.created_at ? dayLabel(n.created_at) : '';
    const head = lbl && lbl !== last ? `<div class="hs-day">${lbl}</div>` : '';
    if (lbl) last = lbl;
    return `${head}
      <div class="nt-item ${isUnread ? 'new' : ''}">
        <span class="nt-ico ${kind[1]}">${U.icon(kind[0], 20)}</span>
        <div class="nt-body">
          <div class="nt-top"><b>${U.esc(n.title || 'Уведомление')}</b><span>${time}</span></div>
          ${n.body ? `<p>${U.esc(n.body)}</p>` : ''}
          ${has(n, ['заказ']) ? `<button type="button" class="rd-link" onclick="if(typeof switchTab==='function')switchTab('profile','myOrders');">К заказам${U.icon('chevR', 14)}</button>` : ''}
        </div>
        ${isUnread ? '<i class="nt-dot"></i>' : ''}
      </div>`;
  }).join('');
}

function attachNotificationsPageHandlers() {
  const container = document.getElementById('notifsContainer');
  let currentNotifs = [];
  try {
    const cached = localStorage.getItem('ice_cached_notifs_' + (userId || 'guest'));
    if (cached) currentNotifs = JSON.parse(cached) || [];
  } catch (_) {}

  // Filter switching
  document.querySelectorAll('.notif-filter-tab').forEach(btn => {
    btn.onclick = () => {
      const filter = btn.dataset.filter || 'all';
      window._notifActiveFilter = filter;
      document.querySelectorAll('.notif-filter-tab').forEach(b => b.classList.toggle('on', b === btn));
      if (container) {
        container.innerHTML = renderNotifsItemsHtml(currentNotifs, filter);
      }
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    };
  });

  // Mark all as read button
  const markAllBtn = document.getElementById('markAllNotifsReadBtn');
  if (markAllBtn) {
    markAllBtn.onclick = () => {
      currentNotifs = currentNotifs.map(n => ({ ...n, is_read: true }));
      try {
        localStorage.setItem('ice_cached_notifs_' + (userId || 'guest'), JSON.stringify(currentNotifs));
      } catch (_) {}

      if (container) {
        container.innerHTML = renderNotifsItemsHtml(currentNotifs, window._notifActiveFilter || 'all');
      }

      const counter = document.getElementById('notifBadgeCounter');
      if (counter) counter.classList.add('hidden');

      const headerBadge = document.getElementById('notifBadge');
      if (headerBadge) {
        headerBadge.classList.add('hidden');
        headerBadge.textContent = '0';
      }

      if (supabaseClient && userId) {
        supabaseClient.from('user_notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false)
          .then(() => {});
      }

      if (window.UI) window.UI.toast('Все уведомления прочитаны');
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
    };
  }

  // Background fetch fresh notifications
  if (supabaseClient && userId) {
    supabaseClient.from('user_notifications')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          currentNotifs = data;
          try {
            localStorage.setItem('ice_cached_notifs_' + userId, JSON.stringify(data));
          } catch(e) {}
          if (container) {
            container.innerHTML = renderNotifsItemsHtml(data, window._notifActiveFilter || 'all');
          }
          const freshUnread = data.filter(n => !n.is_read);
          const badge = document.getElementById('notifBadgeCounter');
          if (badge) {
            badge.innerText = freshUnread.length;
            badge.className = 'nt-count' + (freshUnread.length > 0 ? '' : ' hidden');
          }
        }
      });
  }

  const headerBadge = document.getElementById('notifBadge');
  if (headerBadge) {
    headerBadge.classList.add('hidden');
    headerBadge.textContent = '0';
  }
}


window.requireAuth = function(message) {
  tgUtil.popup({
    title: 'Войдите в ICE LOGIX',
    message: message || 'Для доступа к этому разделу необходимо войти в систему или зарегистрироваться.',
    buttons: [
      { id: 'login', type: 'default', text: 'Войти' },
      { id: 'cancel', type: 'cancel', text: 'Не сейчас' }
    ]
  }).then((btnId) => {
    if (btnId === 'login') {
      showAuthPage();
    }
  });
};

async function handleAuthSuccess(overlay) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      localStorage.removeItem('ice_logged_out');
      let uId = null;
      try {
        const { data: profile } = await supabaseClient.from('users').select('user_id').eq('auth_id', session.user.id).single();
        if (profile) uId = profile.user_id;
      } catch (err) {
        console.warn('Profile not found in users table yet:', err);
      }
      userId = uId || session.user.id;
      await loadUserData();
    }
  } catch (e) {
    console.error('Error in handleAuthSuccess:', e);
  }
  if (overlay) overlay.remove();
  location.reload();
}

function showAuthPage() {
  const overlay = document.createElement('div');
  overlay.id = 'authPageOverlay';
  overlay.className = 'fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 overflow-y-auto backdrop-blur-md';
  overlay.style.cssText = 'background: rgba(15, 23, 42, 0.85);';

  overlay.innerHTML = `
    <div class="w-full max-w-sm bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[85vh] relative hide-scrollbar">
      <button id="authCloseBtn" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      
      <div class="text-center mb-6 mt-2">
        <img src="/assets/logo.png" class="auth-logo" alt="ICE LOGIX">
        <h2 class="text-white text-2xl font-bold mb-1">ICE LOGIX</h2>
        <p class="text-white/50 text-sm" id="authSubtitle">Войдите, чтобы заказывать и следить за посылками</p>
      </div>

      <!-- Главные табы: Вход / Регистрация -->
      <div class="flex rounded-xl p-1 mb-5 bg-white/5 border border-white/10 text-xs">
        <button id="authTabLogin" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white" style="background: linear-gradient(135deg, rgba(77, 163, 255,0.4), rgba(77, 163, 255,0.3));">Вход</button>
        <button id="authTabRegister" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white/50 bg-transparent">Регистрация</button>
      </div>

      <!-- Выбор метода: Почта / СМС -->
      <div class="flex rounded-xl p-1 mb-4 bg-slate-800/50 border border-white/5 text-[10px]">
        <button id="methodTabEmail" class="flex-1 py-1.5 rounded-md font-bold transition-all text-white bg-white/10">Email</button>
        <button id="methodTabPhone" class="flex-1 py-1.5 rounded-md font-bold transition-all text-white/40 bg-transparent">Телефон</button>
      </div>

      <!-- Phone Form -->
      <div id="authPhoneForm" class="space-y-4 mb-6 hidden">
        <div id="phoneInputStep">
          <label class="text-white/60 text-xs font-semibold block mb-1">Номер телефона</label>
          <input type="tel" id="authPhoneInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="+375XXXXXXXXX">
          <button id="authPhoneSendCodeBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #2F86F5, #4DA3FF);">Получить код</button>
        </div>
      </div>

      <!-- Email Form -->
      <div id="authEmailForm" class="space-y-4 mb-6 block">
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Email</label>
          <input type="email" id="authEmailInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="user@example.com">
        </div>
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Пароль</label>
          <input type="password" id="authPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <div id="authConfirmPasswordContainer" class="hidden">
          <label class="text-white/60 text-xs font-semibold block mb-1">Подтвердите пароль</label>
          <input type="password" id="authConfirmPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-all" style="background: linear-gradient(135deg, #2F86F5, #4DA3FF);">Войти</button>
      </div>

      <p id="authErrorMsg" class="text-red-400 text-xs text-center mb-4 hidden bg-red-500/10 p-2 rounded-lg"></p>

      <!-- Divider -->
      <div class="flex items-center gap-3 mb-5">
        <div class="flex-1 border-t border-white/10"></div>
        <span class="text-white/30 text-[10px] uppercase tracking-wider font-bold">Или через соцсети</span>
        <div class="flex-1 border-t border-white/10"></div>
      </div>

      <!-- Social buttons -->
      <div class="flex gap-3 justify-center mb-2">
        <button id="authSocialTg" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(36,161,222,0.15); border: 1px solid rgba(36,161,222,0.3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#29b6f6;"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </button>
        <button id="authSocialGoogle" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.25);">
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </button>
        <button id="authSocialApple" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#ffffff;"><path d="M16.365 21.444c-1.332 1.405-2.651 1.4-3.955.086-1.19-1.2-2.316-1.187-3.486 0-1.385 1.4-2.721 1.428-4.043.08-3.036-3.111-4.707-8.31-2.482-12.825 1.134-2.296 3.013-3.714 5.234-3.743 1.572-.016 3.031.975 4.02.975.986 0 2.833-1.182 4.793-1.01 1.637.067 3.125.77 4.148 2.106-3.415 2.115-2.88 6.772.634 8.163-.787 2.111-1.956 4.316-3.863 6.168zM15.426 5.518c-.85.98-2.126 1.611-3.266 1.516-.25-1.428.468-2.85 1.258-3.791.905-1.083 2.304-1.727 3.402-1.631.183 1.428-.48 2.838-1.394 3.906z"/></svg>
        </button>
      </div>

      <!-- Telegram Login Widget Container (for browser/domain fallback) -->
      <div id="telegramLoginWidgetContainer" class="hidden my-3 flex justify-center"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  let currentTab = 'login';
  let currentMethod = 'email';
  
  const loginTabBtn = overlay.querySelector('#authTabLogin');
  const registerTabBtn = overlay.querySelector('#authTabRegister');
  const subtitle = overlay.querySelector('#authSubtitle');

  const methodEmailBtn = overlay.querySelector('#methodTabEmail');
  const methodPhoneBtn = overlay.querySelector('#methodTabPhone');
  
  const errEl = overlay.querySelector('#authErrorMsg');
  
  const phoneForm = overlay.querySelector('#authPhoneForm');
  const emailForm = overlay.querySelector('#authEmailForm');
  const confirmPwdContainer = overlay.querySelector('#authConfirmPasswordContainer');
  
  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');
  const confirmPasswordInput = overlay.querySelector('#authConfirmPasswordInput');
  const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');

  overlay.querySelector('#authCloseBtn').onclick = () => overlay.remove();

  const switchMethodTab = (method) => {
    currentMethod = method;
    errEl.classList.add('hidden');
    if (method === 'email') {
      methodEmailBtn.style.background = 'rgba(255,255,255,0.1)';
      methodEmailBtn.style.color = '#fff';
      methodPhoneBtn.style.background = 'transparent';
      methodPhoneBtn.style.color = 'rgba(255,255,255,0.4)';
      emailForm.classList.remove('hidden');
      emailForm.classList.add('block');
      phoneForm.classList.remove('block');
      phoneForm.classList.add('hidden');
    } else {
      methodPhoneBtn.style.background = 'rgba(255,255,255,0.1)';
      methodPhoneBtn.style.color = '#fff';
      methodEmailBtn.style.background = 'transparent';
      methodEmailBtn.style.color = 'rgba(255,255,255,0.4)';
      phoneForm.classList.remove('hidden');
      phoneForm.classList.add('block');
      emailForm.classList.remove('block');
      emailForm.classList.add('hidden');
    }
  };

  const switchAuthTab = (tab) => {
    currentTab = tab;
    errEl.classList.add('hidden');
    
    emailInput.value = '';
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    const phoneInput = overlay.querySelector('#authPhoneInput');
    if (phoneInput) phoneInput.value = '';
    
    switchMethodTab('email');
    
    if (tab === 'login') {
      loginTabBtn.style.background = 'linear-gradient(135deg, rgba(77, 163, 255,0.4), rgba(77, 163, 255,0.3))';
      loginTabBtn.style.color = '#fff';
      registerTabBtn.style.background = 'transparent';
      registerTabBtn.style.color = 'rgba(255,255,255,0.5)';
      subtitle.textContent = 'Вход в систему';
      confirmPwdContainer.classList.add('hidden');
      emailSubmitBtn.textContent = 'Войти';
    } else {
      registerTabBtn.style.background = 'linear-gradient(135deg, rgba(77, 163, 255,0.4), rgba(77, 163, 255,0.3))';
      registerTabBtn.style.color = '#fff';
      loginTabBtn.style.background = 'transparent';
      loginTabBtn.style.color = 'rgba(255,255,255,0.5)';
      subtitle.textContent = 'Регистрация аккаунта';
      confirmPwdContainer.classList.remove('hidden');
      emailSubmitBtn.textContent = 'Зарегистрироваться';
    }
  };

  loginTabBtn.onclick = () => switchAuthTab('login');
  registerTabBtn.onclick = () => switchAuthTab('register');

  methodEmailBtn.onclick = () => switchMethodTab('email');
  methodPhoneBtn.onclick = () => switchMethodTab('phone');

  const phoneSendCodeBtn = overlay.querySelector('#authPhoneSendCodeBtn');
  if (phoneSendCodeBtn) {
    phoneSendCodeBtn.onclick = () => {
      tgUtil.alert('Вход по СМС временно недоступен. Используйте Email или Telegram.');
    };
  }

  // --- Auth Flow ---
  emailSubmitBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { errEl.textContent = 'Заполните email и пароль'; errEl.classList.remove('hidden'); return; }
    
    if (currentTab === 'register') {
      if (password.length < 6) {
        errEl.textContent = 'Пароль должен быть не менее 6 символов';
        errEl.classList.remove('hidden');
        return;
      }
      if (password !== confirmPasswordInput.value) {
        errEl.textContent = 'Пароли не совпадают';
        errEl.classList.remove('hidden');
        return;
      }
    }
    
    errEl.classList.add('hidden');
    emailSubmitBtn.textContent = 'Ожидайте...'; emailSubmitBtn.disabled = true;
    try {
      if (currentTab === 'login') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        
        const { error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }
      await handleAuthSuccess(overlay);
    } catch (e) {
      let errMsg = e.message || 'Ошибка авторизации';
      if (errMsg.toLowerCase().includes('confirm')) {
        errMsg = 'Email не подтвержден. Пожалуйста, подтвердите его по ссылке на почте, либо отключите "Confirm email" в настройках Supabase (Auth -> Providers -> Email).';
      } else if (errMsg.includes('Invalid login credentials') || errMsg.toLowerCase().includes('credentials')) {
        errMsg = 'Аккаунт не существует или введен неверный пароль.';
      }
      errEl.textContent = errMsg;
      errEl.classList.remove('hidden');
      emailSubmitBtn.textContent = currentTab === 'login' ? 'Войти' : 'Зарегистрироваться'; 
      emailSubmitBtn.disabled = false;
    }
  };

  // --- Socials ---
  overlay.querySelector('#authSocialTg').onclick = async () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      errEl.classList.add('hidden');
      emailSubmitBtn.textContent = 'Ожидайте...'; emailSubmitBtn.disabled = true;
      try {
        localStorage.removeItem('ice_logged_out');
        const res = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData })
        });
        const data = await res.json();
        if (data.ok && data.session) {
          await supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
          await handleAuthSuccess(overlay);
        } else {
          throw new Error(data.error || 'Не удалось авторизоваться через Telegram');
        }
      } catch (e) {
        errEl.textContent = e.message || 'Ошибка авторизации через Telegram';
        errEl.classList.remove('hidden');
        emailSubmitBtn.textContent = currentTab === 'login' ? 'Войти' : 'Зарегистрироваться'; 
        emailSubmitBtn.disabled = false;
      }
    } else {
      // Browser/Website fallback: Render official Telegram login widget inside the container
      const widgetContainer = overlay.querySelector('#telegramLoginWidgetContainer');
      if (widgetContainer) {
        if (widgetContainer.classList.contains('hidden')) {
          widgetContainer.classList.remove('hidden');
          widgetContainer.innerHTML = '<p class="text-white/40 text-xs mb-2">Ожидайте загрузку виджета Telegram...</p>';
          
          window.onTelegramAuth = async function(user) {
            errEl.classList.add('hidden');
            emailSubmitBtn.textContent = 'Ожидайте...'; emailSubmitBtn.disabled = true;
            try {
              const res = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ widgetData: user })
              });
              const data = await res.json();
              if (data.ok && data.session) {
                await supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
                await handleAuthSuccess(overlay);
              } else {
                throw new Error(data.error || 'Не удалось авторизоваться через Telegram');
              }
            } catch (e) {
              errEl.textContent = e.message || 'Ошибка авторизации через Telegram';
              errEl.classList.remove('hidden');
              emailSubmitBtn.textContent = currentTab === 'login' ? 'Войти' : 'Зарегистрироваться'; 
              emailSubmitBtn.disabled = false;
            }
          };

          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://telegram.org/js/telegram-widget.js?22';
          script.setAttribute('data-telegram-login', 'icelogix_bot');
          script.setAttribute('data-size', 'large');
          script.setAttribute('data-onauth', 'onTelegramAuth(user)');
          script.setAttribute('data-request-access', 'write');
          
          // Clear loading text when script renders
          script.onload = () => {
            const loadingText = widgetContainer.querySelector('p');
            if (loadingText) loadingText.remove();
          };
          
          widgetContainer.appendChild(script);
        } else {
          widgetContainer.classList.add('hidden');
        }
      }
    }
  };
  overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно недоступен.'); };
  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };
}
async function renderCart() {
  if (typeof window.renderWbCart === 'function') {
    return await window.renderWbCart();
  }
  return '<div class="text-center py-12 text-white/50">Загрузка корзины...</div>';
}

function attachCartHandlers() {
  if (typeof window.attachWbCartHandlers === 'function') {
    return window.attachWbCartHandlers();
  }
}


async function updateCartBadge() {
  const currentUserId = window.userId || (typeof userId !== 'undefined' ? userId : null);
  
  let count = 0;
  try {
    const localCustom = JSON.parse(localStorage.getItem('ice_custom_cart') || '[]');
    if (Array.isArray(localCustom)) count += localCustom.length;
  } catch(_) {}

  if (currentUserId && typeof supabaseClient !== 'undefined') {
    try {
      const { data } = await supabaseClient.from('cart').select('quantity').eq('user_id', currentUserId);
      if (data) {
        count = data.reduce((sum, item) => sum + (item.quantity || 0), count);
      }
    } catch (e) {
      console.error('Failed to update cart badge:', e);
    }
  }

  try {
    localStorage.setItem('ice_cart_count', count.toString());
  } catch(_) {}

  const badge = document.getElementById('cartBadge');
  if (badge) {
    if (count > 0) {
      badge.innerText = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  const tabBadge = document.getElementById('tabCartBadge');
  if (tabBadge) {
    if (count > 0) {
      tabBadge.innerText = count > 99 ? '99+' : count;
      tabBadge.classList.remove('hidden');
    } else {
      tabBadge.classList.add('hidden');
    }
  }

  if (currentUserId && typeof supabaseClient !== 'undefined') {
    try {
      const { count: wishCount } = await supabaseClient.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId);
      const wBadge = document.getElementById('wishlistBadge');
      if (wBadge) {
        if (wishCount > 0) {
          wBadge.innerText = wishCount > 99 ? '99+' : wishCount;
          wBadge.classList.remove('hidden');
        } else {
          wBadge.classList.add('hidden');
        }
      }
    } catch (e) {
      console.error('Failed to update wishlist badge:', e);
    }
  }
}


// Global Exports
if (typeof renderPromoPage === 'function') window.renderPromoPage = renderPromoPage;
if (typeof attachPromoPageHandlers === 'function') window.attachPromoPageHandlers = attachPromoPageHandlers;
if (typeof renderHistory === 'function') window.renderHistory = renderHistory;
if (typeof attachHistoryHandlers === 'function') window.attachHistoryHandlers = attachHistoryHandlers;
if (typeof showAllTransactions === 'function') window.showAllTransactions = showAllTransactions;
if (typeof showAccountRecovery === 'function') window.showAccountRecovery = showAccountRecovery;
if (typeof showNotificationSettings === 'function') window.showNotificationSettings = showNotificationSettings;
if (typeof showAppSettings === 'function') window.showAppSettings = showAppSettings;
if (typeof renderSettingsPage === 'function') window.renderSettingsPage = renderSettingsPage;
if (typeof attachSettingsPageHandlers === 'function') window.attachSettingsPageHandlers = attachSettingsPageHandlers;
if (typeof renderNotificationsPage === 'function') window.renderNotificationsPage = renderNotificationsPage;
if (typeof attachNotificationsPageHandlers === 'function') window.attachNotificationsPageHandlers = attachNotificationsPageHandlers;
if (typeof showNotificationsPanel === 'function') window.showNotificationsPanel = showNotificationsPanel;
if (typeof handleAuthSuccess === 'function') window.handleAuthSuccess = handleAuthSuccess;
if (typeof showAuthPage === 'function') window.showAuthPage = showAuthPage;
if (typeof renderCart === 'function') window.renderCart = renderCart;
if (typeof attachCartHandlers === 'function') window.attachCartHandlers = attachCartHandlers;
if (typeof getCartRowQuantity === 'function') window.getCartRowQuantity = getCartRowQuantity;
if (typeof updateCartTotal === 'function') window.updateCartTotal = updateCartTotal;
if (typeof updateCartBadge === 'function') {
  window.updateCartBadge = updateCartBadge;
  try {
    const _cached = localStorage.getItem('ice_cart_count');
    if (_cached && parseInt(_cached) > 0) {
      const _tb = document.getElementById('tabCartBadge');
      if (_tb) {
        _tb.innerText = parseInt(_cached) > 99 ? '99+' : _cached;
        _tb.classList.remove('hidden');
      }
    }
  } catch(_) {}
}
