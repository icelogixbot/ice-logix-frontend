// ============================================================
// ICE LOGIX Module: Admin Panel (Core Operations)
// ============================================================
async function renderAdminReviewsConfig() {
  if (!isOwner) return '<p class="text-center mt-10 text-red-400">Доступ запрещён</p>';

  let config = {};
  try {
    const { data } = await supabaseClient.from('settings').select('value').eq('key', 'reviews_config').single();
    if (data && data.value) config = data.value;
  } catch (e) {
    console.error('Failed to load reviews config for admin:', e);
  }

  const yandex = config.yandex_maps_link || '';
  const google = config.google_maps_link || '';
  const gis = config.gis_2_link || '';
  const tgGroup = config.telegram_group_link || '';
  const bonusInternal = config.bonus_internal_pct || 2.0;
  const bonusExtText = config.bonus_external_text_pct || 1.0;
  const bonusExtMedia = config.bonus_external_media_pct || 3.0;
  const partners = Array.isArray(config.partner_user_ids) ? config.partner_user_ids.join(', ') : '';
  const topics = config.topic_ids || {};

  return `
    <div class="space-y-6 page-enter pb-8 text-left">
      <div class="flex items-center gap-3">
        <button id="adminConfigBackBtn" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <span class="text-white text-lg">➔</span>
        </button>
        <div>
          <h2 class="text-white text-xl font-bold leading-tight">Настройки отзывов</h2>
          <p class="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Админ-панель</p>
        </div>
      </div>

      <div class="glass-card p-5 space-y-4 rounded-3xl">
        <h3 class="text-white font-bold text-sm border-b border-white/5 pb-2">🔗 Ссылки на карты и площадки</h3>
        
        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Яндекс.Карты</label>
          <input type="text" id="cfgYandexLink" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" value="${yandex}" placeholder="https://yandex.by/maps/org/...">
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Google Maps</label>
          <input type="text" id="cfgGoogleLink" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" value="${google}" placeholder="https://maps.google.com/?cid=...">
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">2GIS</label>
          <input type="text" id="cfg2GisLink" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" value="${gis}" placeholder="https://2gis.by/minsk/firm/...">
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Канал/Группа с отзывами</label>
          <input type="text" id="cfgTelegramGroupLink" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" value="${tgGroup}" placeholder="https://t.me/...">
        </div>
      </div>

      <div class="glass-card p-5 space-y-4 rounded-3xl">
        <h3 class="text-white font-bold text-sm border-b border-white/5 pb-2">💎 Начисление бонусов (кэшбэк в % от заказа)</h3>

        <div class="grid grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Внутренний</label>
            <input type="number" step="0.1" id="cfgBonusInternal" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${bonusInternal}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Карты (Текст)</label>
            <input type="number" step="0.1" id="cfgBonusExtText" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${bonusExtText}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Карты (Медиа)</label>
            <input type="number" step="0.1" id="cfgBonusExtMedia" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${bonusExtMedia}">
          </div>
        </div>
      </div>

      <div class="glass-card p-5 space-y-4 rounded-3xl">
        <h3 class="text-white font-bold text-sm border-b border-white/5 pb-2">🤝 Верифицированные партнеры</h3>
        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Список User ID (через запятую)</label>
          <input type="text" id="cfgPartnerIds" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" value="${partners}" placeholder="123456, 789012">
          <p class="text-[10px] text-white/40">Партнеры пишут отзывы без ограничений по действиям.</p>
        </div>
      </div>

      <div class="glass-card p-5 space-y-4 rounded-3xl">
        <h3 class="text-white font-bold text-sm border-b border-white/5 pb-2">💬 Telegram Topic IDs (Темы в группе)</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Заказы (orders)</label>
            <input type="text" id="topicOrders" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.orders || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Акции (promotions)</label>
            <input type="text" id="topicPromotions" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.promotions || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Дропшиппинг (dropshipping)</label>
            <input type="text" id="topicDropshipping" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.dropshipping || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Рефералы (referral)</label>
            <input type="text" id="topicReferral" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.referral || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Реклама (advertising)</label>
            <input type="text" id="topicAdvertising" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.advertising || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Академия (academy)</label>
            <input type="text" id="topicAcademy" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.academy || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Legit Check (legitcheck)</label>
            <input type="text" id="topicLegitcheck" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.legitcheck || ''}">
          </div>
          <div class="space-y-1">
            <label class="text-white/60 text-[10px] font-bold">Партнерство (partnership)</label>
            <input type="text" id="topicPartnership" class="btn-secondary w-full p-2 rounded-lg border border-white/10 text-xs text-white" value="${topics.partnership || ''}">
          </div>
        </div>
      </div>

      <div class="glass-card p-5 space-y-4 rounded-3xl border border-cyan-500/20">
        <h3 class="text-white font-bold text-sm border-b border-white/5 pb-2 text-cyan-400">⚡ Выдать действие для отзыва (UGC Dispenser)</h3>
        
        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Категория</label>
          <select id="dispenseCategory" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white">
            <option value="advertising">Реклама (advertising)</option>
            <option value="partnership">Партнерство (partnership)</option>
            <option value="academy">Академия (academy)</option>
            <option value="referral">Рефералы (referral)</option>
            <option value="promotions">Акции (promotions)</option>
            <option value="dropshipping">Дропшиппинг (dropshipping)</option>
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Telegram User ID получателя</label>
          <input type="number" id="dispenseUserId" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" placeholder="Например: 453910301">
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Заголовок действия</label>
          <input type="text" id="dispenseTitle" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white" placeholder="Например: Рекламный пост в VK">
        </div>

        <div class="space-y-1">
          <label class="text-white/60 text-xs font-bold">Детали (JSON форматированный)</label>
          <textarea id="dispenseDetails" class="btn-secondary w-full p-2.5 rounded-xl border border-white/10 text-xs text-white font-mono" rows="3">{"product": "Реклама у Блогера X", "amount": "50 BYN", "delivery": "Минск"}</textarea>
        </div>

        <button id="dispenseActionBtn" class="bg-cyan-500 hover:bg-cyan-600 text-white font-bold w-full py-3 rounded-xl transition">
          🚀 Выдать действие пользователю
        </button>
      </div>

      <button id="saveAdminConfigBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold">
        💾 Сохранить настройки
      </button>
    </div>
  `;
}

function attachAdminReviewsConfigHandlers() {
  const backBtn = document.getElementById('adminConfigBackBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      switchTab('admin');
    };
  }

  const saveBtn = document.getElementById('saveAdminConfigBtn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Сохранение...';

      const partnerIdsText = document.getElementById('cfgPartnerIds').value;
      const partnerUserIds = partnerIdsText
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0)
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));

      const configValue = {
        yandex_maps_link: document.getElementById('cfgYandexLink').value.trim(),
        google_maps_link: document.getElementById('cfgGoogleLink').value.trim(),
        gis_2_link: document.getElementById('cfg2GisLink').value.trim(),
        telegram_group_link: document.getElementById('cfgTelegramGroupLink').value.trim(),
        bonus_internal_pct: parseFloat(document.getElementById('cfgBonusInternal').value) || 2.0,
        bonus_external_text_pct: parseFloat(document.getElementById('cfgBonusExtText').value) || 1.0,
        bonus_external_media_pct: parseFloat(document.getElementById('cfgBonusExtMedia').value) || 3.0,
        partner_user_ids: partnerUserIds,
        topic_ids: {
          orders: document.getElementById('topicOrders').value.trim(),
          promotions: document.getElementById('topicPromotions').value.trim(),
          dropshipping: document.getElementById('topicDropshipping').value.trim(),
          referral: document.getElementById('topicReferral').value.trim(),
          advertising: document.getElementById('topicAdvertising').value.trim(),
          academy: document.getElementById('topicAcademy').value.trim(),
          legitcheck: document.getElementById('topicLegitcheck').value.trim(),
          partnership: document.getElementById('topicPartnership').value.trim()
        }
      };

      try {
        const { error } = await supabaseClient.from('settings').upsert({
          key: 'reviews_config',
          value: configValue
        }, { onConflict: 'key' });

        if (error) throw error;
        
        window.currentReviewsConfig = configValue;
        
        alert('Настройки отзывов сохранены!');
        switchTab('admin');
      } catch (err) {
        console.error(err);
        alert('Ошибка при сохранении: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.innerText = '💾 Сохранить настройки';
      }
    };
  }

  const dispenseBtn = document.getElementById('dispenseActionBtn');
  if (dispenseBtn) {
    dispenseBtn.onclick = async () => {
      dispenseBtn.disabled = true;
      dispenseBtn.innerText = 'Выдача...';

      const category = document.getElementById('dispenseCategory').value;
      const targetUserIdStr = document.getElementById('dispenseUserId').value.trim();
      const title = document.getElementById('dispenseTitle').value.trim();
      const detailsStr = document.getElementById('dispenseDetails').value.trim();

      const targetUserId = parseInt(targetUserIdStr);
      if (isNaN(targetUserId)) {
        alert('Введите корректный Telegram User ID.');
        dispenseBtn.disabled = false;
        dispenseBtn.innerText = '🚀 Выдать действие пользователю';
        return;
      }

      if (!title) {
        alert('Введите заголовок действия.');
        dispenseBtn.disabled = false;
        dispenseBtn.innerText = '🚀 Выдать действие пользователю';
        return;
      }

      let details = {};
      try {
        if (detailsStr) details = JSON.parse(detailsStr);
      } catch (e) {
        alert('Некорректный JSON в поле деталей: ' + e.message);
        dispenseBtn.disabled = false;
        dispenseBtn.innerText = '🚀 Выдать действие пользователю';
        return;
      }

      try {
        const actionData = {
          user_id: targetUserId,
          category: category,
          target_id: 'manual_' + Date.now(),
          title: title,
          details: details,
          status: 'pending'
        };

        const { error } = await supabaseClient.from('review_actions').insert(actionData);
        if (error) throw error;

        alert(`Действие успешно создано и выдано пользователю ${targetUserId}!`);
        
        document.getElementById('dispenseUserId').value = '';
        document.getElementById('dispenseTitle').value = '';
        
        dispenseBtn.disabled = false;
        dispenseBtn.innerText = '🚀 Выдать действие пользователю';
      } catch (err) {
        console.error(err);
        alert('Ошибка выдачи действия: ' + err.message);
        dispenseBtn.disabled = false;
        dispenseBtn.innerText = '🚀 Выдать действие пользователю';
      }
    };
  }
}



let adminUsersSearch = '';

window.changeUserBalance = async (userId, currentBalance) => {
  const amountStr = prompt(`Текущий баланс пользователя: ${currentBalance} ICE\n\nВведите сумму (с минусом для списания):`);
  if (!amountStr) return;
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount === 0) return;
  
  try {
    const newBalance = Number(currentBalance) + amount;
    
    const { error } = await supabaseClient.from('users').update({ ices_balance: newBalance }).eq('user_id', userId);
    if (error) throw error;
    
    const { error: txErr } = await supabaseClient.from('transactions').insert({
      user_id: userId,
      type: amount > 0 ? 'admin_bonus' : 'admin_correction',
      amount_ices: amount,
      status: 'completed',
      metadata: { note: 'Изменение администратором' }
    });
    if (txErr) console.warn('Ошибка записи транзакции', txErr);
    
    if (amount > 0) {
      supabaseClient.functions.invoke('send-notification', { body: { user_id: userId, message: `💎 *Пополнение баланса!*\n\nАдминистратор начислил вам **${amount} ICE**.` } }).catch(console.error);
    }
    
    glassToast('Баланс успешно обновлен!', { kind: 'success' });
    renderCurrentScreen();
  } catch (err) {
    console.error('Ошибка изменения баланса:', err);
    glassToast('Ошибка: ' + err.message, { kind: 'error' });
  }
};

window.adminUpdateTracking = async (orderId) => {
  const trackCN = prompt('Введите трек-номер для Китая (оставьте пустым, если нет):');
  if (trackCN === null) return;
  const trackBY = prompt('Введите трек-номер для РБ (оставьте пустым, если нет):');
  if (trackBY === null) return;
  
  try {
    const updateData = {};
    if (trackCN) updateData.tracking_number_cn = trackCN;
    if (trackBY) updateData.tracking_number_by = trackBY;
    
    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseClient.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;
      
      glassToast('Трек-номера сохранены!', { kind: 'success' });
      renderCurrentScreen();
    }
  } catch (err) {
    console.error('Ошибка добавления трека:', err);
    glassToast('Ошибка сохранения', { kind: 'error' });
  }
};

async function preloadAdminData(force = false) {
  const cacheDuration = 15000;
  const now = Date.now();
  
  const isParamsMatch = window.adminCache && 
                        window.adminCache.ordersPage === adminOrdersPage &&
                        window.adminCache.ordersMode === adminOrdersMode &&
                        window.adminCache.ordersFilter === adminOrdersFilter;
                        
  const isCacheFresh = window.adminCache && window.adminCache.ts && (now - window.adminCache.ts < cacheDuration);

  if (!force && isCacheFresh && isParamsMatch) {
    return;
  }
  
  if (!force && isCacheFresh && !isParamsMatch) {
    let ordersQuery = supabaseClient.from('orders').select('*', { count: 'exact' });
    if (adminOrdersMode === 'active') {
      ordersQuery = ordersQuery.is('archived_at', null);
    } else {
      ordersQuery = ordersQuery.not('archived_at', 'is', null);
    }
    if (adminOrdersFilter !== 'all') {
      ordersQuery = ordersQuery.eq('status', adminOrdersFilter);
    }
    ordersQuery = ordersQuery.order('created_at', { ascending: false });
    const from = (adminOrdersPage - 1) * 30;
    const to = from + 29;
    ordersQuery = ordersQuery.range(from, to);

    try {
      const ordersRes = await ordersQuery;
      const orders = ordersRes.data || [];
      const count = ordersRes.count || 0;
      const userMap = {};
      
      if (orders.length > 0) {
        const userIds = [...new Set(orders.map(o => o.user_id))];
        const { data: usersData } = await supabaseClient.from('users').select('user_id, full_name, username, is_toxic').in('user_id', userIds);
        if (usersData) {
          usersData.forEach(u => { userMap[u.user_id] = u; });
        }
      }
      
      window.adminCache.orders = orders;
      window.adminCache.ordersCount = count;
      window.adminCache.ordersUserMap = userMap;
      window.adminCache.ordersPage = adminOrdersPage;
      window.adminCache.ordersMode = adminOrdersMode;
      window.adminCache.ordersFilter = adminOrdersFilter;
    } catch(e) {
      console.error('Failed to reload orders incrementally:', e);
    }
    return;
  }
  
  let ordersQuery = supabaseClient.from('orders').select('*', { count: 'exact' });
  if (adminOrdersMode === 'active') {
    ordersQuery = ordersQuery.is('archived_at', null);
  } else {
    ordersQuery = ordersQuery.not('archived_at', 'is', null);
  }
  if (adminOrdersFilter !== 'all') {
    ordersQuery = ordersQuery.eq('status', adminOrdersFilter);
  }
  ordersQuery = ordersQuery.order('created_at', { ascending: false });
  const from = (adminOrdersPage - 1) * 30;
  const to = from + 29;
  ordersQuery = ordersQuery.range(from, to);

  const [
    promoCodes,
    payoutRequests,
    reviews,
    allProducts,
    courses,
    promotions,
    tickets,
    claims,
    legitChecks,
    marketplaces,
    settings,
    users,
    ordersRes
  ] = await Promise.all([
    supabaseClient.from('promocodes').select('*').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('promoCodes load failed:', e); return []; }),
    supabaseClient.from('payout_requests').select('*').eq('status', 'pending').then(r => r.data || []).catch(e => { console.error('payoutRequests load failed:', e); return []; }),
    supabaseClient.from('reviews').select('*').eq('is_published', false).order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('reviews load failed:', e); return []; }),
    supabaseClient.from('products').select('*').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('products load failed:', e); return []; }),
    supabaseClient.from('courses').select('*').order('created_at', { ascending: true }).then(r => r.data || []).catch(e => { console.error('courses load failed:', e); return []; }),
    supabaseClient.from('promotions').select('*').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('promotions load failed:', e); return []; }),
    supabaseClient.from('order_messages').select('order_id, user_id, message_text, created_at, sender_role').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('order_messages load failed:', e); return []; }),
    supabaseClient.from('insurance_claims').select('*, orders(total_byn, status)').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('claims load failed:', e); return []; }),
    supabaseClient.from('legit_check_requests').select('*').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('legitChecks load failed:', e); return []; }),
    supabaseClient.from('marketplaces').select('*').order('sort_order', { ascending: true }).then(r => r.data || []).catch(e => { console.error('marketplaces load failed:', e); return []; }),
    supabaseClient.from('admin_settings').select('*').eq('owner_id', userId).maybeSingle().then(r => r.data || null).catch(e => { console.error('admin_settings load failed:', e); return null; }),
    supabaseClient.from('users').select('*').order('created_at', { ascending: false }).then(r => r.data || []).catch(e => { console.error('users load failed:', e); return []; }),
    ordersQuery.then(r => r).catch(e => { console.error('orders load failed:', e); return { data: [], count: 0 }; })
  ]);

  const orders = ordersRes?.data || [];
  const count = ordersRes?.count || 0;
  const userMap = {};
  
  if (orders.length > 0) {
    try {
      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: usersData } = await supabaseClient.from('users').select('user_id, full_name, username, is_toxic').in('user_id', userIds);
      if (usersData) {
        usersData.forEach(u => { userMap[u.user_id] = u; });
      }
    } catch(e) {
      console.error('userMap load failed:', e);
    }
  }

  window.adminCache = {
    ts: now,
    promoCodes,
    payoutRequests,
    reviews,
    allProducts,
    courses,
    promotions,
    tickets,
    claims,
    legitChecks,
    marketplaces,
    settings,
    users,
    orders,
    ordersCount: count,
    ordersUserMap: userMap,
    ordersPage: adminOrdersPage,
    ordersMode: adminOrdersMode,
    ordersFilter: adminOrdersFilter
  };
}

async function renderAdminUsersList() {
  try {
    if (!window.adminCache || !window.adminCache.users) {
      const { data, error } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      window.adminCache = window.adminCache || {};
      window.adminCache.users = data || [];
    }
    const users = window.adminCache.users;
    
    let filtered = users;
    if (adminUsersSearch) {
      const lowerSearch = adminUsersSearch.toLowerCase();
      filtered = users.filter(u => 
        (u.username && u.username.toLowerCase().includes(lowerSearch)) || 
        (u.full_name && u.full_name.toLowerCase().includes(lowerSearch)) ||
        (String(u.user_id).includes(lowerSearch))
      );
    }
    
    if (!filtered || filtered.length === 0) return '<p class="text-white/70 text-center py-4">Нет пользователей</p>';
    
    return filtered.slice(0, 50).map(u => `
      <div class="bg-white/5 rounded-lg p-3">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-white font-bold text-sm">${u.full_name || 'Без имени'} ${u.username ? '(@' + u.username + ')' : ''}</p>
            <p class="text-white/50 text-[10px]">ID: ${u.user_id} | Рег: ${new Date(u.created_at).toLocaleDateString('ru-RU')}</p>
            <p class="text-cyan-400 font-bold mt-1 text-sm">${Number(u.ices_balance || 0).toFixed(2)} ICE</p>
          </div>
          <div class="flex flex-col gap-2">
            <button class="btn-primary px-3 py-1.5 text-xs rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.3)]" onclick="window.changeUserBalance('${u.user_id}', ${u.ices_balance || 0})">
              💸 Изменить
            </button>
            <button class="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs rounded-lg transition" onclick="window.enterShadowMode('${u.user_id}')">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span> Войти как
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Ошибка в renderAdminUsersList:', err);
    return '<p class="text-xs text-red-400 text-center">Ошибка загрузки</p>';
  }
}

async function renderMarketplacesAdminList() {
  try {
    if (!window.adminCache || !window.adminCache.marketplaces) {
      const { data, error } = await supabaseClient.from('marketplaces').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      window.adminCache = window.adminCache || {};
      window.adminCache.marketplaces = data || [];
    }
    
    const data = window.adminCache.marketplaces;
    let filteredData = data;
    if (window.adminMpFilter === 'home') {
      filteredData = data.filter(mp => mp.show_on_home);
    }
    
    if (filteredData.length === 0) return '<p class="text-white/70 text-center py-4 text-xs">Нет площадок в данной категории</p>';
    return filteredData.map(mp => `
      <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          ${mp.logo_url ? `<img src="${mp.logo_url}" class="w-8 h-8 object-contain rounded flex-shrink-0">` : '<span class="btn-secondary w-8 h-8 flex items-center justify-center flex-shrink-0"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span></span>'}
          <div class="min-w-0 flex-1">
            <span class="text-white flex items-center gap-1 text-sm truncate">
              <button class="toggleMarketplaceHomeBtn flex-shrink-0 transition hover:scale-110 active:scale-90 bg-transparent border-0 p-0" data-id="${mp.id}" data-show-on-home="${mp.show_on_home}" title="Показывать на главной">
                ${mp.show_on_home ? `
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-cyan-400"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                ` : `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white/40"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                `}
              </button>
              <span class="truncate">${mp.name}</span>
            </span>
            <span class="text-white/50 text-xs block">${mp.country}</span>
          </div>
        </div>
        <div class="flex gap-1 ml-2 flex-shrink-0">
          <button class="editMarketplaceBtn text-cyan-400 p-1 hover:bg-white/5 rounded transition" data-id="${mp.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deleteMarketplaceBtn text-red-400 p-1 hover:bg-white/5 rounded transition" data-id="${mp.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    return '<p class="text-red-400">Ошибка загрузки</p>';
  }
}

async function renderPromotionsAdminList() {
  try {
    if (!window.adminCache || !window.adminCache.promotions) {
      const { data, error } = await supabaseClient.from('promotions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      window.adminCache = window.adminCache || {};
      window.adminCache.promotions = data || [];
    }
    const data = window.adminCache.promotions;
    if (!data || data.length === 0) return '<p class="text-white/70 text-center py-2">Нет акций</p>';
    
    return data.map(p => `
      <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div>
          <span class="text-white">${p.title}</span>
          <span class="text-cyan-400 text-xs ml-2">${p.discount_type === 'percent' ? p.discount_value + '%' : p.discount_value + ' BYN'}</span>
          <span class="text-white/50 text-xs block">${p.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Активна' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Неактивна'}</span>
        </div>
        <div>
          <button class="editPromotionBtn text-cyan-400 mr-2" data-id="${p.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deletePromotionBtn text-red-400" data-id="${p.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    return '<p class="text-red-400">Ошибка загрузки</p>';
  }
}

// ==================== ADMIN LOGGING + CSV HELPERS ====================
async function logAdminAction(action, details = {}) {
  if (!userId) return;
  try {
    await supabaseClient.from('admin_logs').insert({
      admin_id: userId,
      action,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      created_at: new Date().toISOString()
    });
  } catch(e) { /* silent — never interrupt admin workflow */ }
}

function downloadCSV(csvContent, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens correctly
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function renderAdminClaimsList() {
  try {
    if (!window.adminCache || !window.adminCache.claims) {
      const { data: claims, error } = await supabaseClient
        .from('insurance_claims')
        .select('*, orders(total_byn, status)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      window.adminCache = window.adminCache || {};
      window.adminCache.claims = claims || [];
    }
    const claims = window.adminCache.claims;

    if (!claims || claims.length === 0) {
      return '<p class="text-xs text-white/40 text-center py-4">Нет активных страховых претензий</p>';
    }

    return claims.map(c => {
      const orderTotal = c.orders ? Number(c.orders.total_byn || 0) : 0;
      const isPending = c.status === 'pending';
      const isApproved = c.status === 'approved';
      const isRejected = c.status === 'rejected';

      return `
        <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-2 text-left page-enter font-sans">
          <div class="flex justify-between items-center text-[10px] text-white/50">
            <span>Претензия от: ${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
            <span class="font-mono text-white/70">Юзер: ${c.user_id}</span>
          </div>
          <div class="text-xs text-white leading-normal">
            <p><strong>Заказ:</strong> <span class="font-mono text-cyan-400 font-semibold">#${c.order_id.slice(0, 8)}</span></p>
            <p class="mt-1"><strong>Сумма возмещения:</strong> <span class="text-green-400 font-mono font-bold">${orderTotal.toFixed(2)} BYN</span></p>
            <p class="mt-1.5 p-2 bg-slate-950/60 rounded-lg text-white/70 border border-white/5 font-sans">
              <strong>Описание:</strong> ${c.description}
            </p>
          </div>
          ${isPending ? `
            <div class="flex gap-2 pt-1.5">
              <button class="approveClaimBtn bg-green-600 hover:bg-green-700 text-slate-900 font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}" data-user-id="${c.user_id}" data-amount="${orderTotal}" data-order-id="${c.order_id}">
                Одобрить выплату
              </button>
              <button class="rejectClaimBtn bg-red-600 hover:bg-red-700 text-white font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                Отклонить
              </button>
            </div>
          ` : isApproved ? `
            <div class="p-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] text-center font-bold rounded-lg font-sans">
              🟢 ВЫПЛАТА ОДОБРЕНА И ЗАЧИСЛЕНА НА БАЛАНС
            </div>
          ` : `
            <div class="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold rounded-lg font-sans">
              🔴 ПРЕТЕНЗИЯ ОТКЛОНЕНА
              ${c.rejection_reason ? '<p class="font-normal text-[9px] text-white/50 mt-0.5 font-sans">Причина: ' + c.rejection_reason + '</p>' : ''}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch(e) {
    return '<p class="text-xs text-red-400 text-center py-4">Ошибка загрузки претензий</p>';
  }
}

async function renderAdminLegitChecksList() {
  try {
    if (!window.adminCache || !window.adminCache.legitChecks) {
      const { data: checks, error } = await supabaseClient
        .from('legit_check_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      window.adminCache = window.adminCache || {};
      window.adminCache.legitChecks = checks || [];
    }
    const checks = window.adminCache.legitChecks;

    if (!checks || checks.length === 0) {
      return '<p class="text-xs text-white/40 text-center py-4">Нет заявок на Legit-Check</p>';
    }

    return checks.map(c => {
      const imageUrls = (c.photos || []).map(p => {
        if (p.startsWith('http')) return p;
        return supabaseClient.storage.from('ugc').getPublicUrl(p).data.publicUrl;
      });

      const isPending = c.status === 'pending';
      const isOriginal = c.status === 'original';
      const isFake = c.status === 'fake';

      return `
        <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 mb-2 text-left page-enter font-sans">
          <div class="flex justify-between items-center text-[10px] text-white/50">
            <span>Заявка от: ${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
            <span class="font-mono text-white/70">Юзер: ${c.user_id}</span>
          </div>
          <div class="text-xs text-white leading-normal">
            <p><strong>Товар:</strong> <span class="text-cyan-400 font-bold">${c.brand} ${c.model}</span></p>
            <p class="text-white/40 text-[9px] mt-0.5">Кликните по фото для увеличения во весь экран</p>
            <div class="grid grid-cols-4 gap-1.5 mt-1.5 mb-2">
              ${imageUrls.map((url, i) => `
                <div class="aspect-square rounded-lg bg-white/15 overflow-hidden cursor-pointer border border-white/5 hover:border-cyan-500/50 transition" onclick="window.open('${url}', '_blank')">
                  <img src="${url}" class="w-full h-full object-cover">
                </div>
              `).join('')}
            </div>
            <div class="mt-3 flex gap-2">
              <button class="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm text-white" onclick="window.open('https://t.me/icelogix_bot?text=Вопрос по заказу ${c.order_id ? c.order_id.slice(0,8) : c.id.slice(0,8)}', '_blank')">💬 Поддержка</button>
              <button class="flex-1 bg-blue-500/50 hover:bg-blue-500/70 py-2 rounded-lg text-sm text-white" onclick="downloadCustomsInvoice('${c.order_id || c.id}')">📄 PDF Инвойс</button>
            </div>
          </div>
          ${isPending ? `
            <div class="flex gap-2 pt-1">
              <button class="approveLegitBtn bg-green-600 hover:bg-green-700 text-slate-900 font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                Оригинал
              </button>
              <button class="rejectLegitBtn bg-red-600 hover:bg-red-700 text-white font-bold flex-1 py-1.5 rounded-lg text-[10px] transition" data-id="${c.id}">
                Подделка
              </button>
            </div>
          ` : isOriginal ? `
            <div class="p-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] text-center font-bold rounded-lg flex items-center justify-center gap-1.5 font-sans">
              <span>🟢 ВЕРДИКТ: ОРИГИНАЛ (Сертификат выдан)</span>
            </div>
          ` : `
            <div class="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold rounded-lg font-sans">
              🔴 ВЕРДИКТ: ПОДДЕЛКА
              ${c.comments ? '<p class="font-normal text-[9px] text-white/50 mt-0.5 font-sans">Комментарий эксперта: ' + c.comments + '</p>' : ''}
            </div>
          `}
        </div>
      `;
    }).join('');
  } catch(e) {
    return '<p class="text-xs text-red-400 text-center py-4">Ошибка загрузки легит-чеков</p>';
  }
}

async function renderAdmin2FA() {
  return `
    <button id="cancelAdmin2FA" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
    <div class="glass-card page-enter text-center mt-4 max-w-sm mx-auto" style="touch-action: none; overscroll-behavior: contain;">
      <h2 class="text-white font-bold text-xl mb-4">Вход в Админ-панель</h2>
      <p class="text-white/70 text-sm mb-6">Для доступа к расширенным функциям введите 4-значный ПИН-код</p>
      
      <div class="flex justify-center gap-3 mb-6" id="pinDots">
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
        <div class="w-4 h-4 rounded-full bg-white/20 border border-white/10 transition-colors duration-200"></div>
      </div>
      
      <div class="grid grid-cols-3 gap-3 mb-4 transition-opacity duration-200" id="pinKeyboard" style="touch-action: none; user-select: none; -webkit-user-select: none;">
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="1">1</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="2">2</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="3">3</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="4">4</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="5">5</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="6">6</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="7">7</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="8">8</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="9">9</div>
        <div></div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" data-digit="0">0</div>
        <div role="button" tabindex="-1" class="bg-white/5 hover:bg-white/10 active:bg-white/15 text-red-400 font-bold text-xl py-4 rounded-xl border border-white/10 cursor-pointer select-none flex items-center justify-center transition-all active:scale-[0.95]" style="touch-action: none;" id="pinDeleteBtn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg></span></div>
      </div>
    </div>
    
    ${renderFooter()}
  `;
}



let currentPin = '';
let isCheckingPin = false;

function attachAdmin2FAHandlers() {
  currentPin = '';
  isCheckingPin = false;
  
  const cancelBtn = document.getElementById('cancelAdmin2FA');
  if (cancelBtn) cancelBtn.onclick = () => switchTab('home');
  const dots = document.querySelectorAll('#pinDots div');
  const keyboard = document.getElementById('pinKeyboard');
  
  // Prevent scroll on the PIN keyboard — block touchmove on the whole keyboard area
  if (keyboard) {
    keyboard.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    keyboard.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
  }
  
  // Lock page scroll while on the PIN screen (Telegram WebView scrolls on lower row taps)
  const _origBodyOverscroll = document.body.style.overscrollBehavior;
  const _origBodyOverflow = document.body.style.overflow;
  document.body.style.overscrollBehavior = 'none';
  document.body.style.overflow = 'hidden';
  
  // Restore body scroll when leaving this screen
  function _restoreBodyScroll() {
    document.body.style.overscrollBehavior = _origBodyOverscroll;
    document.body.style.overflow = _origBodyOverflow;
  }
  if (cancelBtn) {
    const _origCancelClick = cancelBtn.onclick;
    cancelBtn.onclick = () => { _restoreBodyScroll(); switchTab('home'); };
  }
  // Also restore on successful auth (renderAdminScreen will re-render the page)
  const _origCheckPinSuccessHook = () => _restoreBodyScroll();
  window._pin2FARestoreScroll = _origCheckPinSuccessHook;
  
  async function checkPin() {
    if (isCheckingPin) return;
    isCheckingPin = true;
    if (keyboard) {
      keyboard.style.opacity = '0.5';
      keyboard.style.pointerEvents = 'none';
    }
    
    try {
      const { data } = await supabaseClient.from('users').select('pin_code').eq('user_id', userId).single();
      if (!data || !data.pin_code) {
        if (currentPin === '0000') {
          adminAuthenticated = true;
          _restoreBodyScroll();
          window.invalidateAdminCache();
          renderAdminScreen(true);
        } else {
          tgUtil.alert('ПИН-код не установлен. Установлен временный код 0000.');
          currentPin = ''; updateDots();
        }
        return;
      }
      if (data.pin_code === currentPin) {
        adminAuthenticated = true;
        _restoreBodyScroll();
        window.invalidateAdminCache();
        renderAdminScreen(true);
      } else {
        tgUtil.haptic('error');
        tgUtil.alert('❌ Неверный ПИН-код');
        currentPin = ''; updateDots();
      }
    } catch(e) { 
      tgUtil.alert('Ошибка проверки PIN: ' + e.message); 
      currentPin = ''; updateDots(); 
    } finally {
      isCheckingPin = false;
      if (keyboard) {
        keyboard.style.opacity = '1';
        keyboard.style.pointerEvents = 'auto';
      }
    }
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      if (i < currentPin.length) {
        dot.classList.remove('bg-white/20');
        dot.classList.add('bg-cyan-400');
      } else {
        dot.classList.add('bg-white/20');
        dot.classList.remove('bg-cyan-400');
      }
    });
    if (currentPin.length === 4) {
      checkPin();
    }
  }

  document.querySelectorAll('#pinKeyboard div[data-digit]').forEach(btn => {
    btn.addEventListener('touchend', e => {
      e.preventDefault(); // prevent scroll jitter on tap
      if (isCheckingPin) return;
      if (currentPin.length < 4) {
        tgUtil.haptic('light');
        currentPin += btn.dataset.digit;
        updateDots();
      }
    }, { passive: false });
    btn.onclick = () => {
      if (isCheckingPin) return;
      if (currentPin.length < 4) {
        tgUtil.haptic('light');
        currentPin += btn.dataset.digit;
        updateDots();
      }
    };
  });
  
  const delBtn = document.getElementById('pinDeleteBtn');
  if (delBtn) {
    delBtn.addEventListener('touchend', e => {
      e.preventDefault();
      if (isCheckingPin) return;
      if (currentPin.length > 0) {
        tgUtil.haptic('light');
        currentPin = currentPin.slice(0, -1);
        updateDots();
      }
    }, { passive: false });
    delBtn.onclick = () => {
      if (isCheckingPin) return;
      if (currentPin.length > 0) {
        tgUtil.haptic('light');
        currentPin = currentPin.slice(0, -1);
        updateDots();
      }
    };
  }
}




async function renderAdmin() {
  if (!isOwner) return '<p class="text-center mt-10 text-red-400">Доступ запрещён</p>';
  try {
    await preloadAdminData(false);
    const { promoCodes, payoutRequests, reviews, allProducts, courses } = window.adminCache;
    
    let products = allProducts;
    if (window.adminProductFilter === 'home') {
      products = allProducts.filter(p => p.show_on_home);
    }

    return `
      <div class="space-y-4">
        <!-- <span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span> Акции -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span> Управление акциями</h3>
          <button id="addPromotionBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Создать акцию</button>
          <div class="space-y-2 max-h-60 overflow-y-auto" id="promotionsList">
            ${await renderPromotionsAdminList()}
          </div>
        </div>

        <!-- Промокоды -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Создать промокод</h3>
          <input type="text" id="newPromoCode" class="btn-secondary w-full p-2 rounded-lg mb-2" placeholder="Код">
          <select id="promoType" class="btn-secondary w-full p-2 rounded-lg mb-2"><option value="percent">Процент (%)</option><option value="fixed">Фикс (BYN)</option></select>
          <input type="number" id="promoValue" class="btn-secondary w-full p-2 rounded-lg mb-2" placeholder="Значение">
          <button id="createPromoBtn" class="btn-primary w-full">Создать</button>
        </div>
        
        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_resale')">
          <span class="flex items-center gap-2"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span> Модерация Пристроя</span>
          <span class="ix text-white/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_analytics')" style="background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(14,165,233,0.05)); border-color: rgba(34,211,238,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span> Аналитика и Финансы</span>
          <span class="ix text-cyan-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="window.openReconciliationDashboardModal()" style="background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.08)); border-color: rgba(168,85,247,0.4);">
          <span class="flex items-center gap-2"><span class="text-lg">📊</span> Финансовая сверка (Reconciliation & Problem Orders)</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">ТЗ v1.0</span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_crm')" style="background: linear-gradient(135deg, rgba(244,114,182,0.1), rgba(219,39,119,0.05)); border-color: rgba(244,114,182,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> CRM и Сегменты</span>
          <span class="ix text-pink-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_suppliers')" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05)); border-color: rgba(16,185,129,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-emerald-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> База поставщиков</span>
          <span class="ix text-emerald-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_marketing')" style="background: linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06)); border-color: rgba(168,85,247,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-purple-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg></span> Маркетинг: UGC и Дропы</span>
          <span class="ix text-purple-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_texts')" style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06)); border-color: rgba(245,158,11,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-amber-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></span> Управление текстами</span>
          <span class="ix text-amber-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_reviews_config')" style="background: linear-gradient(135deg, rgba(234,179,8,0.1), rgba(202,138,4,0.05)); border-color: rgba(234,179,8,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-yellow-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Настройки отзывов</span>
          <span class="ix text-yellow-500/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="switchTab('admin_faq')" style="background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.06)); border-color: rgba(34,197,94,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-green-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Управление FAQ</span>
          <span class="ix text-green-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="showCurrencyAlertsModal()" style="background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06)); border-color: rgba(245,158,11,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-amber-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Трекер курсов & Алерты</span>
          <span class="ix text-amber-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <button class="btn-secondary w-full flex items-center justify-between mb-4 border border-white/10" onclick="downloadTaxInvoicePDF()" style="background: linear-gradient(135deg, rgba(96,165,250,0.12), rgba(59,130,246,0.06)); border-color: rgba(96,165,250,0.3);">
          <span class="flex items-center gap-2"><span class="ix text-blue-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg></span> Скачать выписку за год (PDF)</span>
          <span class="ix text-blue-400/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>
        </button>

        <!-- Список промокодов -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Промокоды</h3>
          ${promoCodes.length === 0 ? '<p class="text-white/70">Нет промокодов</p>' : `<div class="space-y-2">${promoCodes.map(p => `<div class="flex justify-between items-center p-2 bg-white/5 rounded-lg"><div><span class="font-bold text-cyan-400">${p.code}</span><span class="text-white/70 text-sm ml-2">${p.discount_type === 'percent' ? p.discount_value + '%' : p.discount_value + ' BYN'}</span><span class="text-white/50 text-xs ml-2">${p.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Активен' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Неактивен'}</span></div><button class="togglePromoBtn text-cyan-400 text-sm" data-id="${p.id}" data-active="${p.is_active}">${p.is_active ? 'Деактивировать' : 'Активировать'}</button></div>`).join('')}</div>`}
        </div>
        
        <!-- Отзывы на модерации -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> Отзывы на модерации</h3>
          ${reviews.length === 0 ? '<p class="text-white/70">Нет отзывов</p>' : reviews.map(r => `<div class="p-2 bg-white/5 rounded-lg mb-2"><div class="stars">${'<span class="ix ix-fill ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(r.rating)}${'<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>'.repeat(5-r.rating)}</div><p class="text-white/80 text-sm">${r.text}</p>${r.photo_urls && r.photo_urls.length > 0 ? `<div class="flex gap-2 mt-2 overflow-x-auto pb-1">${r.photo_urls.map(url => `<img src="${url}" class="h-16 w-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" onclick="tgUtil.popup('${url}', 'Фото отзыва')">`).join('')}</div>` : ''}<p class="text-white/50 text-xs">${r.user_name||'Пользователь'} | ${new Date(r.created_at).toLocaleDateString()}</p><div class="flex gap-2 mt-2"><button class="approveReviewBtn bg-green-600 px-3 py-1 rounded text-sm" data-id="${r.id}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Одобрить</button><button class="rejectReviewBtn bg-red-600 px-3 py-1 rounded text-sm" data-id="${r.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Отклонить</button></div></div>`).join('')}
        </div>
        
        <!-- Встроенный чат (Тикеты поддержки) -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span> Чат поддержки & Тикеты</h3>
          <div class="space-y-2 max-h-60 overflow-y-auto" id="adminTicketsList">
            ${await renderAdminTicketsList()}
          </div>
        </div>
        
        <!-- Управление товарами -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Управление товарами</h3>
          <button id="addProductBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить товар</button>
          
          <div class="flex gap-2 mb-3">
            <button class="btn-secondary text-xs px-2.5 py-1 rounded-lg ${window.adminProductFilter === 'all' || !window.adminProductFilter ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10'}" onclick="window.adminProductFilter = 'all'; renderAdminScreen(false);">Все товары</button>
            <button class="btn-secondary text-xs px-2.5 py-1 rounded-lg ${window.adminProductFilter === 'home' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10'}" onclick="window.adminProductFilter = 'home'; renderAdminScreen(false);">На главной 🏠</button>
          </div>

          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${products.length === 0 ? '<p class="text-white/50 text-xs text-center py-4">Нет товаров в данной категории</p>' : products.map(p => `
              <div class="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                <div class="flex-1 min-w-0 pr-2">
                  <p class="text-white text-sm truncate flex items-center gap-1.5">
                    <button class="toggleProductHomeBtn flex-shrink-0 transition hover:scale-110 active:scale-90 bg-transparent border-0 p-0" data-id="${p.id}" data-show-on-home="${p.show_on_home}" title="Показывать на главной">
                      ${p.show_on_home ? `
                        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-cyan-400"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      ` : `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white/40"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      `}
                    </button>
                    <span class="truncate">${p.title}</span>
                  </p>
                  <p class="text-cyan-400 text-xs">${p.price} ${p.currency}</p>
                </div>
                <div class="flex gap-1.5 ml-2 flex-shrink-0">
                  <button class="editProductBtn bg-cyan-600/70 hover:bg-cyan-600 px-2 py-1 rounded text-xs text-white transition" data-id="${p.id}">Изменить</button>
                  <button class="deleteProductBtn bg-red-600/70 hover:bg-red-600 px-2 py-1 rounded text-xs text-white transition" data-id="${p.id}">Удалить</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- <span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span> Курсы -->
        <div class="glass-card">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-white font-bold"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span> Курсы (Академия)</h3>
            <button id="adminAddCourseBtn" class="btn-primary"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить</button>
          </div>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            ${courses.length === 0 ? '<p class="text-white/50 text-sm">Курсов нет</p>' : courses.map(c => `
              <div class="flex items-center gap-2 p-2 bg-white/5 rounded-xl">
                <div class="flex-1 min-w-0">
                  <p class="text-white text-sm truncate">${c.title}</p>
                  <p class="text-white/40 text-xs">${c.price_ice > 0 ? c.price_ice + ' <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span>' : 'Бесплатно'} · ${c.role_access} · ${c.is_active ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Активен' : '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Скрыт'}</p>
                </div>
                <button class="btn-secondary adminEditCourseBtn" data-course-id="${c.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
                <button class="adminManageLessonsBtn bg-blue-600/60 px-2 py-1 rounded text-xs" data-course-id="${c.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span></button>
                <button class="adminDeleteCourseBtn bg-red-600/60 px-2 py-1 rounded text-xs" data-course-id="${c.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
              </div>`).join('')}
          </div>
        </div>

        <!-- Управление площадками -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> Управление площадками</h3>
          <button id="addMarketplaceBtn" class="btn-primary w-full mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить площадку</button>
          
          <div class="flex gap-2 mb-3">
            <button class="btn-secondary text-xs px-2.5 py-1 rounded-lg ${window.adminMpFilter === 'all' || !window.adminMpFilter ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10'}" onclick="window.adminMpFilter = 'all'; renderAdminScreen(false);">Все площадки</button>
            <button class="btn-secondary text-xs px-2.5 py-1 rounded-lg ${window.adminMpFilter === 'home' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10'}" onclick="window.adminMpFilter = 'home'; renderAdminScreen(false);">На главной 🏠</button>
          </div>

          <div class="space-y-2 max-h-80 overflow-y-auto" id="marketplacesList">
            ${await renderMarketplacesAdminList()}
          </div>
        </div>
        
        <!-- Заявки на вывод -->
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span> Заявки на вывод</h3>
          ${payoutRequests.length === 0 ? '<p class="text-white/70">Нет заявок</p>' : payoutRequests.map(req => `<div class="flex justify-between items-center p-2 bg-white/5 rounded-lg mb-2"><div><span class="text-white">${req.user_id}</span><span class="text-cyan-400 ml-2">${req.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></span></div><div><button class="approvePayoutBtn bg-green-600 px-3 py-1 rounded text-sm mr-2" data-id="${req.id}">Одобрить</button><button class="rejectPayoutBtn bg-red-600 px-3 py-1 rounded text-sm" data-id="${req.id}">Отклонить</button></div></div>`).join('')}
        </div>
        
        <!-- AI Аналитика -->
        <div class="glass-card mt-4" id="aiPredictionCard">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-white font-bold">🤖 AI Аналитика</h3>
            <button onclick="window._refreshAiPrediction && window._refreshAiPrediction()" class="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded-lg hover:bg-purple-500/20 transition">↻ Обновить</button>
          </div>
          <div id="aiPredictionContent" class="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">Загрузка прогноза...</div>
        </div>

        <!-- Управление пользователями -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> Управление пользователями</h3>
          <div class="relative mb-3">
            <input type="text" id="adminUsersSearchInput" class="btn-secondary w-full p-2 pl-8 rounded-lg border border-white/30 text-xs" placeholder="Поиск по @username, имени или ID..." oninput="window.adminUsersSearch = this.value; document.getElementById('adminUsersList').innerHTML = '<p class=\\'text-white/50 text-xs text-center py-2\\'>Загрузка...</p>'; renderAdminUsersList().then(html => document.getElementById('adminUsersList').innerHTML = html)">
            <span class="absolute left-2.5 top-2 text-white/40 pointer-events-none"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span>
          </div>
          <div id="adminUsersList" class="space-y-2 max-h-80 overflow-y-auto">
            ${await renderAdminUsersList()}
          </div>
        </div>
        
                <!-- Управление заказами -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Управление заказами</h3>
          
          <!-- Переключатели Активные / Архив -->
          <div class="flex gap-2 mb-3">
            <button id="showActiveOrdersBtn" class="btn-secondary btn-primary px-4 py-2 rounded-lg text-sm font-medium ${adminOrdersMode === 'active' ? '' : ''}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Активные</button>
            <button id="showArchivedOrdersBtn" class="btn-secondary btn-primary px-4 py-2 rounded-lg text-sm font-medium ${adminOrdersMode === 'archived' ? '' : ''}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span> Корзина (Удаленные)</button>
          </div>
          
          <!-- Фильтр по статусу (чипсы) -->
          <div class="mb-3">
            <div class="flex flex-wrap gap-1.5" id="adminOrdersFilterChips">
              <button class="filter-chip text-xs px-3 py-1.5" data-status="all">Все</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="paid">Оплачен</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="bought">Выкуплен</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="on_sklad_cn">Склад КН</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="in_transit">В пути</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="in_belarus">В РБ</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="delivered">Доставлен</button>
              <button class="filter-chip text-xs px-3 py-1.5" data-status="cancelled">Отменён</button>
            </div>
          </div>
          
          <!-- Список заказов -->
          <div id="adminOrdersList" class="space-y-2 max-h-96 overflow-y-auto">
            ${await renderAdminOrdersList()}
          </div>

          <!-- Пагинация -->
          <div class="flex justify-center gap-2 mt-3">
            <button id="adminOrdersPrev" class="btn-secondary" ${adminOrdersPage <= 1 ? 'disabled' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span></button>
            <span class="text-white/70 py-2 text-sm">Стр. ${adminOrdersPage} из ${adminOrdersTotalPages}</span>
            <button id="adminOrdersNext" class="btn-secondary" ${adminOrdersPage >= adminOrdersTotalPages ? 'disabled' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></button>
          </div>
          </div>

        <!-- Финансовый учёт и Налоги (Белгазпромбанк & Налоговый отчёт РБ) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Финансовый учёт и Налоги РБ</h3>
          <p class="text-white/50 text-xs mb-3">Автоматический расчёт налогов по ставкам РБ (20% налога с чистой комиссии байера) и распределение чистой прибыли между партнерскими ИП.</p>
          <div class="bg-white/5 p-3 rounded-xl space-y-2 mb-4 text-xs">
            <p class="font-bold text-white uppercase text-[10px] tracking-wider mb-1 text-cyan-400">Реквизиты ИП (ОАО «Белгазпромбанк»):</p>
            <div class="grid grid-cols-1 gap-2 text-white/70">
              <div>• <strong>ИП Кирилл (Р/С 1):</strong> BY54BGPB3012000000001000 (Чистая прибыль: 50%)</div>
              <div>• <strong>ИП Партнёр (Р/С 2):</strong> BY12BGPB3012000000002000 (Чистая прибыль: 50%)</div>
            </div>
          </div>
          <button id="generateTaxesReportBtn" class="btn-primary w-full flex items-center justify-center gap-2">
            ${ix('file-text')} Сгенерировать налоговый отчёт РБ
          </button>
        </div>

        <!-- Бэкап и системные утилиты -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Зеркало базы (Auto-Backup)</h3>
          <p class="text-white/50 text-xs mb-3">Мгновенная полная выгрузка базы данных пользователей и заказов в файл резервной копии.</p>
          <button id="downloadBackupBtn" class="btn-primary w-full flex items-center justify-center gap-2">
            ${ix('download')} Выгрузить полную резервную копию
          </button>
        </div>

        <!-- Страховые претензии (Loss & Damage Moderation) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Управление страховками & Претензиями</h3>
          <p class="text-white/50 text-xs mb-3">Одобрение или отклонение страховых претензий клиентов. При одобрении сумма автоматически возвращается на баланс.</p>
          <div class="space-y-2 max-h-64 overflow-y-auto font-sans" id="adminClaimsList">
            ${await renderAdminClaimsList()}
          </div>
        </div>

        <!-- Заявки на Legit-Check (Manual Paid Legit Check Moderation) -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg></span> Заявки на Legit-Check</h3>
          <p class="text-white/50 text-xs mb-3">Рассмотрение заявок на легит-чек от экспертов ShopbyShop. Задайте вердикт (Оригинал/Подделка) с комментариями.</p>
          <div class="space-y-2 max-h-64 overflow-y-auto font-sans" id="adminLegitChecksList">
            ${await renderAdminLegitChecksList()}
          </div>
        </div>

        <!-- Системные настройки и Бэкап -->
        <div class="glass-card mt-4">
          <h3 class="text-white font-bold mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Системные настройки и Бэкап</h3>
          
          <div class="bg-white/5 p-3 rounded-xl mb-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-white text-sm font-bold">🌴 Режим Отпуска Байера</span>
              <button id="toggleVacationBtn" class="px-3 py-1 rounded text-xs font-bold ${window.buyerVacation?.active ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}">
                ${window.buyerVacation?.active ? 'ВКЛЮЧЕН' : 'ВЫКЛ'}
              </button>
            </div>
            <p class="text-white/50 text-[10px] mb-2">Если выключить — сроки вернутся в норму. Если включить — ко всем срокам доставки добавится указанное количество дней, и клиенты увидят предупреждение в калькуляторе.</p>
            <div class="flex gap-2 items-center">
              <input type="number" id="vacationDaysInput" value="${window.buyerVacation?.days || 10}" class="btn-secondary w-20 p-2 rounded-lg text-sm text-center" placeholder="Дней">
              <span class="text-white/70 text-xs">дней задержки</span>
              <button id="saveVacationBtn" class="btn-primary px-3 py-1 text-xs ml-auto">Сохранить</button>
            </div>
          </div>

          <div class="bg-white/5 p-3 rounded-xl">
            <div class="flex justify-between items-center mb-2">
              <span class="text-white text-sm font-bold">💾 Резервная копия базы</span>
            </div>
            <p class="text-white/50 text-[10px] mb-3">Скачать полный дамп всех заказов и пользователей в формате CSV. Рекомендуется делать раз в неделю.</p>
            <button id="exportDatabaseBtn" class="w-full bg-blue-600/80 hover:bg-blue-600 transition p-2 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2">
              <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span> Скачать CSV (Excel) Архив
            </button>
          </div>
        </div>
      </div>
    ` + renderFooter();
  } catch (err) { 
    console.error('[renderAdmin] error:', err);
    // Retry once with a forced cache reload before giving up
    try {
      window.invalidateAdminCache();
      await preloadAdminData(true);
      const { promoCodes, payoutRequests, reviews, allProducts, courses } = window.adminCache;
      // If we got here the data loaded fine — retry the full render
      return await renderAdmin();
    } catch (err2) {
      console.error('[renderAdmin] retry failed:', err2);
      return `<div class="glass-card text-center mt-10">
        <p class="text-red-400 font-bold mb-3">❌ Ошибка загрузки админ-панели</p>
        <p class="text-white/50 text-sm mb-4">${err.message || 'Неизвестная ошибка'}</p>
        <button onclick="window.invalidateAdminCache(); renderAdminScreen(true);" class="btn-primary">🔄 Повторить попытку</button>
      </div>`;
    }
  }
}

window.enterShadowMode = function(targetUserId) {
  const isConfirmed = confirm(`Войти в аккаунт пользователя ${targetUserId}? Режим "Только чтение" (без оплаты).`);
  if (isConfirmed) {
    originalAdminId = userId;
    userId = targetUserId;
    isShadowMode = true;
    currentSubScreen = null;
    tgUtil.haptic('success');
    tgUtil.alert('Теневой режим активирован');
    switchTab('home');
  }
};

function attachAdminHandlers() {

  // ================== СИСТЕМНЫЕ НАСТРОЙКИ (ОТПУСК И БЭКАП) ==================
  const toggleVacBtn = document.getElementById('toggleVacationBtn');
  const saveVacBtn = document.getElementById('saveVacationBtn');
  const expDbBtn = document.getElementById('exportDatabaseBtn');

  if (toggleVacBtn) {
    toggleVacBtn.onclick = async () => {
      tgUtil.haptic('light');
      window.buyerVacation = window.buyerVacation || { active: false, days: 10 };
      window.buyerVacation.active = !window.buyerVacation.active;
      
      try {
        const { error } = await supabaseClient
          .from('admin_settings')
          .update({ buyer_vacation: window.buyerVacation })
          .eq('owner_id', userId);
        if (error) throw error;
        
        glassToast('Режим отпуска ' + (window.buyerVacation.active ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'), { kind: 'success' });
        renderAdminScreen(true);
      } catch (err) {
        glassToast('Ошибка сохранения: ' + err.message, { kind: 'error' });
      }
    };
  }

  if (saveVacBtn) {
    saveVacBtn.onclick = async () => {
      tgUtil.haptic('medium');
      const dInput = document.getElementById('vacationDaysInput');
      const days = parseInt(dInput.value) || 0;
      window.buyerVacation = window.buyerVacation || { active: false, days: 10 };
      window.buyerVacation.days = days;
      
      try {
        const { error } = await supabaseClient
          .from('admin_settings')
          .update({ buyer_vacation: window.buyerVacation })
          .eq('owner_id', userId);
        if (error) throw error;
        glassToast('Количество дней сохранено', { kind: 'success' });
      } catch (err) {
        glassToast('Ошибка: ' + err.message, { kind: 'error' });
      }
    };
  }

  if (expDbBtn) {
    expDbBtn.onclick = async () => {
      tgUtil.haptic('medium');
      glassToast('Сбор данных для бэкапа...', { kind: 'info' });
      try {
        const [ordersRes, usersRes] = await Promise.all([
          supabaseClient.from('orders').select('*'),
          supabaseClient.from('users').select('*')
        ]);
        if (ordersRes.error) throw ordersRes.error;
        if (usersRes.error) throw usersRes.error;
        
        // Создаем CSV
        let csvContent = "data:text/csv;charset=utf-8,\\uFEFF";
        csvContent += "=== USERS ===\\n";
        if (usersRes.data && usersRes.data.length > 0) {
          const uKeys = Object.keys(usersRes.data[0]);
          csvContent += uKeys.join(",") + "\\n";
          usersRes.data.forEach(u => {
            csvContent += uKeys.map(k => '"' + String(u[k] || '').replace(/"/g, '""') + '"').join(",") + "\\n";
          });
        }
        
        csvContent += "\\n=== ORDERS ===\\n";
        if (ordersRes.data && ordersRes.data.length > 0) {
          const oKeys = Object.keys(ordersRes.data[0]);
          csvContent += oKeys.join(",") + "\\n";
          ordersRes.data.forEach(o => {
            csvContent += oKeys.map(k => '"' + String(o[k] || '').replace(/"/g, '""') + '"').join(",") + "\\n";
          });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ice_logix_backup_" + new Date().toISOString().slice(0,10) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        glassToast('Бэкап успешно скачан!', { kind: 'success' });
      } catch (err) {
        glassToast('Ошибка при бэкапе: ' + err.message, { kind: 'error' });
      }
    };
  }

  // ================== НАЛОГОВЫЙ ОТЧЕТ РБ ==================
  const generateTaxesReportBtn = document.getElementById('generateTaxesReportBtn');
  if (generateTaxesReportBtn) {
    generateTaxesReportBtn.onclick = async () => {
      tgUtil.haptic('medium');
      glassToast('Сбор финансовых данных...', { kind: 'success' });
      
      try {
        const { data: orders, error } = await supabaseClient
          .from('orders')
          .select('id, total_byn, commission_byn, status, created_at');
          
        if (error) throw error;
        
        let totalRevenue = 0;
        let totalCommission = 0;
        let activeOrdersCount = 0;
        let completedOrdersCount = 0;
        
        (orders || []).forEach(o => {
          const totalVal = o.total_byn || 0;
          const commVal = o.commission_byn || 0;
          totalRevenue += totalVal;
          totalCommission += commVal;
          if (o.status === 'delivered') {
            completedOrdersCount++;
          } else {
            activeOrdersCount++;
          }
        });
        
        const taxPercent = 20;
        const totalTax = totalCommission * (taxPercent / 100);
        const netProfit = totalCommission - totalTax;
        const splitProfit = netProfit / 2;
        
        const reportModal = document.createElement('div');
        reportModal.className = 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[99999] p-4 overflow-y-auto pt-10 pb-10';
        reportModal.id = 'taxesReportModal';
        
        const dateStr = new Date().toLocaleDateString('ru-RU');
        
        reportModal.innerHTML = `
          <div class="bg-slate-900/95 border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden page-enter">
            <div class="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 flex-shrink-0">
              <div>
                <h3 class="text-white font-bold text-base flex items-center gap-2">
                  ${ix('file-text', { cls: 'text-cyan-400' })}
                  <span>Налоговый отчёт РБ & Учёт</span>
                </h3>
                <p class="text-white/50 text-[10px] mt-0.5">Расчет налога 20% с комиссии байера и прибыли по ИП</p>
              </div>
              <button id="closeTaxesModalBtn" class="text-white/50 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div class="p-5 overflow-y-auto flex-1 text-xs text-white/80 space-y-4 leading-relaxed bg-slate-950/20 max-h-[60vh] select-text">
              <div class="text-center font-bold text-sm text-white uppercase mb-2">Налоговая декларация и отчет по комиссии</div>
              <div class="flex justify-between text-[11px] text-white/50">
                <span>г. Несвиж, Беларусь</span>
                <span>Сформирован: ${dateStr} г.</span>
              </div>
              
              <div class="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                <div class="flex justify-between">
                  <span class="text-white/50">Всего заказов в системе:</span>
                  <span class="text-white font-bold font-mono">${(orders || []).length} шт.</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Завершенных заказов:</span>
                  <span class="text-green-400 font-bold font-mono">${completedOrdersCount} шт.</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-white/50">Активных заказов:</span>
                  <span class="text-cyan-400 font-bold font-mono">${activeOrdersCount} шт.</span>
                </div>
                <div class="flex justify-between border-t border-white/10 pt-2 mt-2">
                  <span class="text-white/50">Общий оборот заказов (BYN):</span>
                  <span class="text-white font-extrabold font-mono">${totalRevenue.toFixed(2)} BYN</span>
                </div>
              </div>

              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">1. Расчет налога (20% от комиссии услуги)</p>
              <div class="bg-yellow-500/10 p-3.5 rounded-xl border border-yellow-500/20 space-y-2">
                <div class="flex justify-between">
                  <span class="text-white/60">Валовая комиссия байеров (доход услуги):</span>
                  <span class="text-white font-bold font-mono">${totalCommission.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-yellow-400">
                  <span>Подоходный налог в РБ (20%):</span>
                  <span class="font-extrabold font-mono">${totalTax.toFixed(2)} BYN</span>
                </div>
                <div class="flex justify-between text-green-400 border-t border-white/10 pt-2 mt-2">
                  <span>Чистая прибыль после налогов:</span>
                  <span class="font-extrabold font-mono">${netProfit.toFixed(2)} BYN</span>
                </div>
              </div>
              <p class="text-[10px] text-white/50 italic leading-snug">
                *Примечание: Согласно законодательству Республики Беларусь, налог исчисляется исключительно с комиссионного вознаграждения байера (20%), а не с общего оборота посылки.
              </p>

              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">2. Распределение чистой прибыли между ИП (50/50)</p>
              <div class="bg-cyan-500/10 p-3.5 rounded-xl border border-cyan-500/20 grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <p class="font-bold text-cyan-400 uppercase">ИП Кирилл (50%):</p>
                  <p class="mt-1 font-extrabold text-sm text-white font-mono">${splitProfit.toFixed(2)} BYN</p>
                  <p class="text-white/40 mt-1">ОАО «Белгазпромбанк»</p>
                  <p class="text-white/40 truncate text-[9px]">BY54BGPB3012000000001000</p>
                </div>
                <div>
                  <p class="font-bold text-cyan-400 uppercase">ИП Партнёр (50%):</p>
                  <p class="mt-1 font-extrabold text-sm text-white font-mono">${splitProfit.toFixed(2)} BYN</p>
                  <p class="text-white/40 mt-1">ОАО «Белгазпромбанк»</p>
                  <p class="text-white/40 truncate text-[9px]">BY12BGPB3012000000002000</p>
                </div>
              </div>
              
              <p class="font-bold text-white uppercase text-[10px] tracking-wider pt-2">3. Льготы и взносы</p>
              <p>
                ФСЗН не уплачивается в связи с несовершеннолетием учредителей ИП (возраст 16 лет, на основании официального разъяснения Министерства по налогам и сборам Республики Беларусь).
              </p>
            </div>
            
            <div class="p-5 border-t border-white/10 bg-white/5 flex gap-3 flex-shrink-0">
              <button id="printTaxesBtn" class="btn-primary flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                ${ix('download')} Печать / PDF
              </button>
              <button id="closeTaxesModalBtn2" class="btn-secondary flex-1 py-3 rounded-xl font-bold transition">
                Закрыть
              </button>
            </div>
          </div>
        `;
        
        document.body.appendChild(reportModal);
        
        reportModal.querySelector('#closeTaxesModalBtn').onclick = () => reportModal.remove();
        reportModal.querySelector('#closeTaxesModalBtn2').onclick = () => reportModal.remove();
        
        // Print taxes window
        reportModal.querySelector('#printTaxesBtn').onclick = () => {
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
              <title>Налоговый отчёт РБ - ICE LOGIX</title>
              <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; font-size: 13px; }
                .header { text-align: center; margin-bottom: 30px; }
                .title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .subtitle { font-size: 11px; color: #64748b; }
                .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background-color: #f1f5f9; font-weight: bold; }
                h3 { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
                .card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 10px; font-size: 11px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">Налоговый отчет по комиссионному вознаграждению</div>
                <div class="subtitle">Сервис доставки ICE LOGIX · Несвиж, Республика Беларусь</div>
              </div>
              <div class="meta">
                <span>Дата составления: ${dateStr} г.</span>
                <span>Тип налога: УСН / Подоходный (20%)</span>
              </div>
              
              <h3>1. Сводные показатели по заказам</h3>
              <table>
                <thead>
                  <tr>
                    <th>Показатель</th>
                    <th>Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Общее количество оформленных заказов</td>
                    <td>${(orders || []).length} шт.</td>
                  </tr>
                  <tr>
                    <td>Завершенные заказы (статус Доставлен)</td>
                    <td>${completedOrdersCount} шт.</td>
                  </tr>
                  <tr>
                    <td>Активные заказы в работе</td>
                    <td>${activeOrdersCount} шт.</td>
                  </tr>
                  <tr>
                    <td><strong>Валовый оборот заказов (BYN)</strong></td>
                    <td><strong>${totalRevenue.toFixed(2)} BYN</strong></td>
                  </tr>
                </tbody>
              </table>

              <h3>2. Расчет налоговой базы и подоходного налога</h3>
              <table>
                <thead>
                  <tr>
                    <th>Показатель</th>
                    <th>База</th>
                    <th>Ставка</th>
                    <th>Сумма налога</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Комиссионный доход байера (20% услуги)</td>
                    <td>${totalCommission.toFixed(2)} BYN</td>
                    <td>20%</td>
                    <td><strong>${totalTax.toFixed(2)} BYN</strong></td>
                  </tr>
                </tbody>
              </table>
              <p style="font-size: 11px; color: #64748b; font-style: italic;">
                *В соответствии с Налоговым кодексом РБ, объектом налогообложения для байера-посредника признается только его комиссионное вознаграждение (доход от оказания услуг), а не вся сумма, переданная для выкупа товаров.
              </p>

              <h3>3. Распределение прибыли по ИП (50 / 50)</h3>
              <div class="grid">
                <div class="card">
                  <strong>ИП Кирилл (Соучредитель 1):</strong><br>
                  Доля прибыли: 50%<br>
                  Сумма к зачислению: <strong>${splitProfit.toFixed(2)} BYN</strong><br>
                  Банк: ОАО «Белгазпромбанк»<br>
                  Р/С: BY54BGPB3012000000001000
                </div>
                <div class="card">
                  <strong>ИП Партнёр (Соучредитель 2):</strong><br>
                  Доля прибыли: 50%<br>
                  Сумма к зачислению: <strong>${splitProfit.toFixed(2)} BYN</strong><br>
                  Банк: ОАО «Белгазпромбанк»<br>
                  Р/С: BY12BGPB3012000000002000
                </div>
              </div>

              <h3>4. Подписи сторон и печать ведомства</h3>
              <div class="grid" style="margin-top: 30px; font-size: 11px;">
                <div>
                  <strong>ИП Кирилл:</strong><br>
                  Подпись: ______________________
                </div>
                <div>
                  <strong>ИП Партнёр:</strong><br>
                  Подпись: ______________________
                </div>
              </div>
              <script>
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
        console.error(err);
        tgUtil.alert('Не удалось сформировать отчет: ' + err.message);
      }
    };
  }

  // ================== ПРОМОКОДЫ ==================
  const createBtn = document.getElementById('createPromoBtn');
  if (createBtn) {
    createBtn.onclick = async () => {
      const code = document.getElementById('newPromoCode')?.value.trim().toUpperCase();
      const type = document.getElementById('promoType')?.value;
      const value = parseFloat(document.getElementById('promoValue')?.value);
      if (!code || !value) { tgUtil.alert('Заполните все поля'); return; }
      try {
        await supabaseClient.from('promocodes').insert({ code, discount_type: type, discount_value: value, is_active: true });
        logAdminAction('create_promo', { code, type, value });
        if (window.adminCache && window.adminCache.promoCodes) {
          window.adminCache.promoCodes.unshift({ id: Date.now().toString(), code, discount_type: type, discount_value: value, is_active: true });
        }
        tgUtil.alert('Промокод создан');
        renderAdminScreen(false);
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    };
  }

  document.querySelectorAll('.togglePromoBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      const currentActive = btn.getAttribute('data-active') === 'true';
      try {
        if (window.adminCache && window.adminCache.promoCodes) {
          const promo = window.adminCache.promoCodes.find(p => p.id === id);
          if (promo) promo.is_active = !currentActive;
        }
        renderAdminScreen(false);
        await supabaseClient.from('promocodes').update({ is_active: !currentActive }).eq('id', id);
        logAdminAction('toggle_promo', { id, active: !currentActive });
        tgUtil.alert('Статус обновлён');
      } catch (err) { 
        tgUtil.alert('Ошибка: ' + err.message); 
        renderAdminScreen(true);
      }
    };
  });

  // ================== ОТЗЫВЫ ==================
  document.querySelectorAll('.approveReviewBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        if (window.adminCache && window.adminCache.reviews) {
          window.adminCache.reviews = window.adminCache.reviews.filter(r => r.id !== id);
        }
        renderAdminScreen(false);
        const { data: rev } = await supabaseClient.from('reviews').select('user_id, photo_urls, cashback_granted').eq('id', id).single();
        await supabaseClient.from('reviews').update({ is_published: true }).eq('id', id);
        logAdminAction('review_approved', { id });
        
        let alertMsg = 'Отзыв опубликован';
        if (rev && rev.photo_urls && rev.photo_urls.length > 0 && !rev.cashback_granted) {
           const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', rev.user_id).single();
           if (u) {
             await supabaseClient.from('users').update({ ices_balance: (u.ices_balance || 0) + 5 }).eq('user_id', rev.user_id);
             await supabaseClient.from('reviews').update({ cashback_granted: true }).eq('id', id);
             alertMsg += '. Начислено 5 ICE за фото!';
           }
        }
        
        tgUtil.alert(alertMsg);
      } catch (err) { 
        tgUtil.alert('Ошибка: ' + err.message); 
        renderAdminScreen(true);
      }
    };
  });

  document.querySelectorAll('.rejectReviewBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        if (window.adminCache && window.adminCache.reviews) {
          window.adminCache.reviews = window.adminCache.reviews.filter(r => r.id !== id);
        }
        renderAdminScreen(false);
        await supabaseClient.from('reviews').delete().eq('id', id);
        logAdminAction('review_rejected', { id });
        tgUtil.alert('Отзыв отклонён');
      } catch (err) { 
        tgUtil.alert('Ошибка: ' + err.message); 
        renderAdminScreen(true);
      }
    };
  });

  // ================== ТОВАРЫ ==================
  const addProductBtn = document.getElementById('addProductBtn');
  if (addProductBtn) {
    addProductBtn.onclick = () => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
      modal.innerHTML = `
  <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
    <div class="p-5 border-b border-white/20">
      <h3 class="text-white font-bold text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новый товар</h3>
    </div>
    <div class="p-5 overflow-y-auto flex-1">
      <div class="space-y-3">
        <input type="text" id="productTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Название">
        <textarea id="productDesc" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Описание" rows="2"></textarea>
        <input type="number" id="productPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Цена" value="0">
        <select id="productCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/30">
          <option value="Обувь">Обувь</option><option value="Одежда">Одежда</option><option value="Аксессуары">Аксессуары</option>
        </select>
        <input type="text" id="productBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Бренд">
        <div class="space-y-2">
          <label class="cursor-pointer w-full p-3 rounded-xl border border-dashed border-cyan-500/40 flex items-center justify-center gap-2 text-sm text-cyan-400 hover:bg-cyan-500/10 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Фото из галереи (до 8)
            <input type="file" id="productImageFile" accept="image/*" multiple class="hidden">
          </label>
          <div id="productPhotoPreviews" class="grid grid-cols-4 gap-2"></div>
        </div>
        <input type="url" id="productUrl" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Ссылка на товар">
        <label class="flex items-center gap-2 text-white/80 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30"><input type="checkbox" id="productIsDrop"> 🧊 Эксклюзивный ДРОП (доступен только в окно дропов)</label>
        <label class="flex items-center gap-2 text-white/80 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30"><input type="checkbox" id="productShowOnHome"> 🏠 Показывать на главной странице</label>
      </div>
    </div>
    <div class="p-5 border-t border-white/20">
      <div class="flex gap-3">
        <button id="saveProductBtn" class="btn-primary flex-1">Сохранить</button>
        <button id="cancelProductBtn" class="btn-secondary flex-1">Отмена</button>
      </div>
    </div>
  </div>
`;
      document.body.appendChild(modal);
      
      const addPhotoFiles = [];
      const addPhotoGrid = modal.querySelector('#productPhotoPreviews');
      function renderAddPhotos() {
        if (!addPhotoFiles.length) { addPhotoGrid.innerHTML = ''; return; }
        addPhotoGrid.innerHTML = addPhotoFiles.map((f, i) =>
          `<div class="relative rounded-lg overflow-hidden bg-white/10" style="aspect-ratio:1">
            <img src="${URL.createObjectURL(f)}" class="w-full h-full object-cover">
            <button class="ap-rm absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold leading-none flex items-center justify-center" data-i="${i}">×</button>
          </div>`
        ).join('');
        addPhotoGrid.querySelectorAll('.ap-rm').forEach(b => {
          b.onclick = e => { e.stopPropagation(); addPhotoFiles.splice(+b.dataset.i, 1); renderAddPhotos(); };
        });
      }
      modal.querySelector('#productImageFile').onchange = e => {
        for (const f of e.target.files) {
          if (addPhotoFiles.length >= 8) { tgUtil.alert('Максимум 8 фото'); break; }
          addPhotoFiles.push(f);
        }
        e.target.value = '';
        renderAddPhotos();
      };

      modal.querySelector('#cancelProductBtn').onclick = () => modal.remove();
      modal.querySelector('#saveProductBtn').onclick = async () => {
        const title = modal.querySelector('#productTitle').value.trim();
        const description = modal.querySelector('#productDesc').value.trim();
        const price = parseFloat(modal.querySelector('#productPrice').value);
        const category = modal.querySelector('#productCategory').value;
        const brand = modal.querySelector('#productBrand').value.trim();
        const url = modal.querySelector('#productUrl').value.trim();
        const is_drop = modal.querySelector('#productIsDrop').checked;
        const show_on_home = modal.querySelector('#productShowOnHome').checked;
        if (!title || !price) { tgUtil.alert('Заполните название и цену'); return; }
        if (!addPhotoFiles.length) { tgUtil.alert('Добавьте хотя бы одно фото'); return; }
        const saveBtn = modal.querySelector('#saveProductBtn');
        saveBtn.disabled = true; saveBtn.textContent = 'Загружаю фото…';
        try {
          const urls = await Promise.all(addPhotoFiles.map(f => uploadProductImage(f)));
          const image_url = urls.length === 1 ? urls[0] : JSON.stringify(urls);
          await supabaseClient.from('products').insert({ title, description, price, category, brand, image_url, url, currency: 'CNY', is_active: true, is_drop, show_on_home });
          window.CacheDB.clear('popularProducts');
          delete _tabCache['home:'];
          delete _tabCache['catalogs:'];
          logAdminAction('create_product', { title, category, price, is_drop });
          tgUtil.alert('Товар добавлен');
          modal.remove();
          renderAdminScreen(true);
        } catch (err) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; tgUtil.alert('Ошибка: ' + err.message); }
      };
    };
  }

  document.querySelectorAll('.editProductBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        const { data: prod, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
        if (error || !prod) { tgUtil.alert('Не удалось загрузить данные товара'); return; }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
        modal.innerHTML = `
          <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
            <div class="p-5 border-b border-white/20">
              <h3 class="text-white font-bold text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span> Редактировать товар</h3>
            </div>
            <div class="p-5 overflow-y-auto flex-1">
              <div class="space-y-3">
                <input type="text" id="productTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Название" value="${prod.title || ''}">
                <textarea id="productDesc" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Описание" rows="2">${prod.description || ''}</textarea>
                <input type="number" id="productPrice" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Цена" value="${prod.price || 0}">
                <select id="productCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/30">
                  <option value="Обувь" ${prod.category === 'Обувь' ? 'selected' : ''}>Обувь</option>
                  <option value="Одежда" ${prod.category === 'Одежда' ? 'selected' : ''}>Одежда</option>
                  <option value="Аксессуары" ${prod.category === 'Аксессуары' ? 'selected' : ''}>Аксессуары</option>
                </select>
                <input type="text" id="productBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Бренд" value="${prod.brand || ''}">
                <div class="space-y-2">
                  <label class="cursor-pointer w-full p-3 rounded-xl border border-dashed border-cyan-500/40 flex items-center justify-center gap-2 text-sm text-cyan-400 hover:bg-cyan-500/10 transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Добавить фото (до 8)
                    <input type="file" id="productImageFile" accept="image/*" multiple class="hidden">
                  </label>
                  <div id="productPhotoPreviews" class="grid grid-cols-4 gap-2"></div>
                </div>
                <input type="url" id="productUrl" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Ссылка на товар" value="${prod.url || ''}">
                <label class="flex items-center gap-2 text-white/80 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <input type="checkbox" id="productIsDrop" ${prod.is_drop ? 'checked' : ''}> 🧊 Эксклюзивный ДРОП (доступен только в окно дропов)
                </label>
                <label class="flex items-center gap-2 text-white/80 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <input type="checkbox" id="productShowOnHome" ${prod.show_on_home ? 'checked' : ''}> 🏠 Показывать на главной странице
                </label>
              </div>
            </div>
            <div class="p-5 border-t border-white/20">
              <div class="flex gap-3">
                <button id="saveProductBtn" class="btn-primary flex-1">Сохранить</button>
                <button id="cancelProductBtn" class="btn-secondary flex-1">Отмена</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const editPhotoUrls = [...getProductImages(prod.image_url)];
        const editPhotoFiles = [];
        const editPhotoGrid = modal.querySelector('#productPhotoPreviews');
        function renderEditPhotos() {
          const urlItems = editPhotoUrls.map((u, i) =>
            `<div class="relative rounded-lg overflow-hidden bg-white/10" style="aspect-ratio:1">
              <img src="${u}" class="w-full h-full object-cover">
              <button class="ep-rm-url absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold leading-none flex items-center justify-center" data-i="${i}">×</button>
            </div>`
          );
          const fileItems = editPhotoFiles.map((f, i) =>
            `<div class="relative rounded-lg overflow-hidden bg-white/10" style="aspect-ratio:1">
              <img src="${URL.createObjectURL(f)}" class="w-full h-full object-cover">
              <button class="ep-rm-file absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold leading-none flex items-center justify-center" data-i="${i}">×</button>
            </div>`
          );
          editPhotoGrid.innerHTML = [...urlItems, ...fileItems].join('');
          editPhotoGrid.querySelectorAll('.ep-rm-url').forEach(b => {
            b.onclick = e => { e.stopPropagation(); editPhotoUrls.splice(+b.dataset.i, 1); renderEditPhotos(); };
          });
          editPhotoGrid.querySelectorAll('.ep-rm-file').forEach(b => {
            b.onclick = e => { e.stopPropagation(); editPhotoFiles.splice(+b.dataset.i, 1); renderEditPhotos(); };
          });
        }
        modal.querySelector('#productImageFile').onchange = e => {
          for (const f of e.target.files) {
            if (editPhotoUrls.length + editPhotoFiles.length >= 8) { tgUtil.alert('Максимум 8 фото'); break; }
            editPhotoFiles.push(f);
          }
          e.target.value = '';
          renderEditPhotos();
        };
        renderEditPhotos();

        modal.querySelector('#cancelProductBtn').onclick = () => modal.remove();
        modal.querySelector('#saveProductBtn').onclick = async () => {
          const title = modal.querySelector('#productTitle').value.trim();
          const description = modal.querySelector('#productDesc').value.trim();
          const price = parseFloat(modal.querySelector('#productPrice').value);
          const category = modal.querySelector('#productCategory').value;
          const brand = modal.querySelector('#productBrand').value.trim();
          const url = modal.querySelector('#productUrl').value.trim();
          const is_drop = modal.querySelector('#productIsDrop').checked;
          const show_on_home = modal.querySelector('#productShowOnHome').checked;
          if (!title || !price) { tgUtil.alert('Заполните название и цену'); return; }
          if (!editPhotoUrls.length && !editPhotoFiles.length) { tgUtil.alert('Добавьте хотя бы одно фото'); return; }
          const saveBtn = modal.querySelector('#saveProductBtn');
          saveBtn.disabled = true; saveBtn.textContent = 'Загружаю фото…';
          try {
            const newUrls = await Promise.all(editPhotoFiles.map(f => uploadProductImage(f)));
            const allUrls = [...editPhotoUrls, ...newUrls];
            const image_url = allUrls.length === 1 ? allUrls[0] : JSON.stringify(allUrls);
            await supabaseClient.from('products').update({ title, description, price, category, brand, image_url, url, is_drop, show_on_home }).eq('id', id);
            window.CacheDB.clear('popularProducts');
            delete _tabCache['home:'];
            delete _tabCache['catalogs:'];
            logAdminAction('update_product', { id, title });
            tgUtil.alert('Товар обновлён');
            modal.remove();
            renderAdminScreen(true);
          } catch (err) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; tgUtil.alert('Ошибка: ' + err.message); }
        };
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    };
  });

  document.querySelectorAll('.deleteProductBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      if (await tgUtil.confirm('Удалить товар?')) {
        tgUtil.haptic('warning');
        await supabaseClient.from('products').delete().eq('id', id);
        delete _tabCache['home:'];
        delete _tabCache['catalogs:'];
        logAdminAction('delete_product', { id });
        renderAdminScreen(true);
      }
    };
  });

  // ================== ЗАЯВКИ НА ВЫВОД ==================
  document.querySelectorAll('.approvePayoutBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        if (window.adminCache && window.adminCache.payoutRequests) {
          window.adminCache.payoutRequests = window.adminCache.payoutRequests.filter(req => req.id !== id);
        }
        renderAdminScreen(false);
        await supabaseClient.from('payout_requests').update({ status: 'approved', processed_at: new Date() }).eq('id', id);
        logAdminAction('payout_approved', { id });
        tgUtil.alert('Заявка одобрена');
      } catch (err) { 
        tgUtil.alert('Ошибка: ' + err.message); 
        renderAdminScreen(true);
      }
    };
  });

  document.querySelectorAll('.rejectPayoutBtn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-id');
      try {
        if (window.adminCache && window.adminCache.payoutRequests) {
          window.adminCache.payoutRequests = window.adminCache.payoutRequests.filter(req => req.id !== id);
        }
        renderAdminScreen(false);
        await supabaseClient.from('payout_requests').update({ status: 'rejected', processed_at: new Date() }).eq('id', id);
        logAdminAction('payout_rejected', { id });
        tgUtil.alert('Заявка отклонена');
      } catch (err) { 
        tgUtil.alert('Ошибка: ' + err.message); 
        renderAdminScreen(true);
      }
    };
  });

  // ================== УПРАВЛЕНИЕ ПЛОЩАДКАМИ ==================
  const addMarketplaceBtn = document.getElementById('addMarketplaceBtn');
  if (addMarketplaceBtn) addMarketplaceBtn.onclick = () => openMarketplaceForm();

  async function openMarketplaceForm(marketplace = null) {
    const isEdit = !!marketplace;
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
    modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg">${isEdit ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Редактировать' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новая площадка'}</h3>
      </div>
      <div class="p-5 overflow-y-auto flex-1">
        <div class="space-y-3">
          <input type="text" id="mpName" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Название *" value="${marketplace?.name || ''}">
          <input type="url" id="mpUrl" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Ссылка на сайт *" value="${marketplace?.website_url || ''}">
          <input type="text" id="mpCountry" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Страна *" value="${marketplace?.country || ''}">
          <textarea id="mpDescription" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Описание">${marketplace?.description || ''}</textarea>
          <textarea id="mpInstruction" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Инструкция">${marketplace?.instruction || ''}</textarea>
          <div>
            <label class="text-white/70 text-sm">Категории (можно несколько)</label>
            <div class="flex flex-wrap gap-2 mt-1" id="mpCategories">
              ${['Обувь', 'Одежда', 'Аксессуары'].map(cat => {
                const checked = marketplace?.categories?.includes(cat) ? 'checked' : '';
                return `<label class="text-white/80"><input type="checkbox" value="${cat}" ${checked}> ${cat}</label>`;
              }).join('')}
            </div>
          </div>
          <div>
            <label class="text-white/70 text-sm">Пол (можно несколько)</label>
            <div class="flex flex-wrap gap-2 mt-1" id="mpGender">
              ${['Муж', 'Жен', 'Унисекс'].map(g => {
                const checked = marketplace?.gender?.includes(g) ? 'checked' : '';
                return `<label class="text-white/80"><input type="checkbox" value="${g}" ${checked}> ${g}</label>`;
              }).join('')}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="mpVpn" ${marketplace?.requires_vpn ? 'checked' : ''}>
            <label class="text-white/80">Требуется VPN</label>
          </div>
          <div>
            <label class="text-white/70 text-sm block mb-1">Логотип (URL или загрузить)</label>
            <input type="text" id="mpLogoUrl" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-2" placeholder="https://..." value="${marketplace?.logo_url || ''}">
            <input type="file" id="mpLogoFile" accept="image/*" class="text-white/70 text-sm">
          </div>
          <input type="number" id="mpSortOrder" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Порядок сортировки" value="${marketplace?.sort_order || 0}">
          <label class="flex items-center gap-2 text-white/80"><input type="checkbox" id="mpActive" ${marketplace?.is_active !== false ? 'checked' : ''}> Активна</label>
          <label class="flex items-center gap-2 text-white/80 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30"><input type="checkbox" id="mpShowOnHome" ${marketplace?.show_on_home ? 'checked' : ''}> 🏠 Показывать на главной странице</label>
        </div>
      </div>
      <div class="p-5 border-t border-white/20">
        <div class="flex gap-3">
          <button id="saveMarketplaceBtn" class="btn-primary flex-1">${isEdit ? 'Сохранить' : 'Добавить'}</button>
          <button id="cancelMarketplaceBtn" class="btn-secondary flex-1">Отмена</button>
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    modal.querySelector('#cancelMarketplaceBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    const saveBtn = modal.querySelector('#saveMarketplaceBtn');
    saveBtn.onclick = async () => {
      const name = modal.querySelector('#mpName').value.trim();
      const url = modal.querySelector('#mpUrl').value.trim();
      const country = modal.querySelector('#mpCountry').value.trim();
      if (!name || !url || !country) { tgUtil.alert('Заполните обязательные поля'); return; }
      const categories = Array.from(modal.querySelectorAll('#mpCategories input:checked')).map(cb => cb.value);
      const gender = Array.from(modal.querySelectorAll('#mpGender input:checked')).map(cb => cb.value);
      const description = modal.querySelector('#mpDescription').value.trim();
      const instruction = modal.querySelector('#mpInstruction').value.trim();
      const requires_vpn = modal.querySelector('#mpVpn').checked;
      const sort_order = parseInt(modal.querySelector('#mpSortOrder').value) || 0;
      const is_active = modal.querySelector('#mpActive').checked;
      const show_on_home = modal.querySelector('#mpShowOnHome').checked;
      let logo_url = modal.querySelector('#mpLogoUrl').value.trim();
      const logoFile = modal.querySelector('#mpLogoFile').files[0];
      if (logoFile) {
        const fileName = `logos/${Date.now()}_${logoFile.name}`;
        const { error: uploadError } = await supabaseClient.storage.from('marketplace-logos').upload(fileName, logoFile);
        if (uploadError) { tgUtil.alert('Ошибка загрузки лого: ' + uploadError.message); return; }
        const { data: publicUrl } = supabaseClient.storage.from('marketplace-logos').getPublicUrl(fileName);
        logo_url = publicUrl.publicUrl;
      }
      const payload = { name, website_url: url, country, categories, gender, description, instruction, requires_vpn, sort_order, is_active, logo_url, show_on_home };
      try {
        if (isEdit) {
          await supabaseClient.from('marketplaces').update(payload).eq('id', marketplace.id);
        } else {
          await supabaseClient.from('marketplaces').insert(payload);
        }
        window.CacheDB.clear('marketplaces');
        tgUtil.alert(isEdit ? 'Площадка обновлена' : 'Площадка добавлена');
        modal.remove();
        renderAdminScreen(true);
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    };
  }
      // ================== РЕДАКТИРОВАНИЕ / УДАЛЕНИЕ ПЛОЩАДОК (ДЕЛЕГИРОВАНИЕ) ==================
  if (!window._marketplaceHandlers) {
    window._marketplaceHandlers = true;
    document.addEventListener('click', async (e) => {
      // Редактирование
      const editBtn = e.target.closest('.editMarketplaceBtn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        const { data } = await supabaseClient.from('marketplaces').select('*').eq('id', id).single();
        if (data) openMarketplaceForm(data);
        return;
      }
      
      // Удаление
      const deleteBtn = e.target.closest('.deleteMarketplaceBtn');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!(await tgUtil.confirm('Удалить площадку?'))) return;
        tgUtil.haptic('warning');
        await supabaseClient.from('marketplaces').delete().eq('id', id);
        tgUtil.alert('Удалено');
        renderAdminScreen(true);
        return;
      }
    });
  }

  // ================== УПРАВЛЕНИЕ ГЛАВНОЙ СТРАНИЦЕЙ (ДЕЛЕГИРОВАНИЕ) ==================
  if (!window._homePageManagementHandlers) {
    window._homePageManagementHandlers = true;
    document.addEventListener('click', async (e) => {
      // Toggle product show_on_home
      const prodHomeBtn = e.target.closest('.toggleProductHomeBtn');
      if (prodHomeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = prodHomeBtn.dataset.id;
        const currentVal = prodHomeBtn.dataset.showOnHome === 'true';
        const newVal = !currentVal;
        tgUtil.haptic('medium');
        try {
          const { error } = await supabaseClient.from('products').update({ show_on_home: newVal }).eq('id', id);
          if (error) throw error;
          delete _tabCache['home:'];
          delete _tabCache['catalogs:'];
          glassToast('Статус товара на главной обновлен', { kind: 'success' });
          renderAdminScreen(true);
        } catch (err) {
          tgUtil.alert('Ошибка: ' + err.message);
        }
        return;
      }

      // Toggle marketplace show_on_home
      const mpHomeBtn = e.target.closest('.toggleMarketplaceHomeBtn');
      if (mpHomeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = mpHomeBtn.dataset.id;
        const currentVal = mpHomeBtn.dataset.showOnHome === 'true';
        const newVal = !currentVal;
        tgUtil.haptic('medium');
        try {
          const { error } = await supabaseClient.from('marketplaces').update({ show_on_home: newVal }).eq('id', id);
          if (error) throw error;
          window.CacheDB.clear('marketplaces');
          delete _tabCache['home:'];
          delete _tabCache['catalogs:'];
          glassToast('Статус площадки на главной обновлен', { kind: 'success' });
          renderAdminScreen(true);
        } catch (err) {
          tgUtil.alert('Ошибка: ' + err.message);
        }
        return;
      }
    });
  }

    // ================== АРХИВАЦИЯ ЗАКАЗА (ДЕЛЕГИРОВАНИЕ) ==================
  // Используем один глобальный обработчик, который не нужно пересоздавать
  if (!window._globalArchiveHandler) {
    window._globalArchiveHandler = async (e) => {
      const archiveBtn = e.target.closest('.archiveOrderBtn');
      if (!archiveBtn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const orderId = archiveBtn.dataset.orderId;
      if (!(await tgUtil.confirm('Переместить заказ в архив? Он будет скрыт из основного списка.'))) return;
      tgUtil.haptic('medium');
      
      try {
        const { error } = await supabaseClient.from('orders').update({ status: 'deleted' }).eq('id', orderId);
        if (error) throw error;
        logAdminAction('archive_order', { orderId });
        if (window.adminCache && window.adminCache.orders) {
          window.adminCache.orders = window.adminCache.orders.filter(o => o.id !== orderId);
          if (window.adminCache.ordersCount > 0) window.adminCache.ordersCount--;
        }
        tgUtil.alert('Заказ перемещён в архив');
        renderAdminScreen(false);
      } catch (err) {
        tgUtil.alert('Ошибка: ' + err.message);
        renderAdminScreen(true);
      }
    };
    document.addEventListener('click', window._globalArchiveHandler);
  }

  // ================== ФАКТИЧЕСКИЙ ВЕС (Анти-кража) ==================
  if (!window._globalWeightHandler) {
    window._globalWeightHandler = async (e) => {
      const saveBtn = e.target.closest('.save-weight-btn');
      if (!saveBtn) return;
      
      const orderId = saveBtn.dataset.orderId;
      const input = document.querySelector(`.actual-weight-input[data-order-id="${orderId}"]`);
      if (!input) return;
      
      const weightActual = parseFloat(input.value);
      if (isNaN(weightActual) || weightActual <= 0) {
        tgUtil.alert('Введите корректный вес');
        return;
      }
      
      const weightEstimated = parseFloat(input.dataset.estimated);
      const diff = Math.abs(weightActual - weightEstimated);
      
      if (weightEstimated > 0 && diff > 0.05) {
        if (!confirm(`🚨 ВНИМАНИЕ: Расхождение веса > 50г!\nОжидаемый: ${weightEstimated} кг\nФактический: ${weightActual} кг\nВозможна кража или утеря части товара. Сохранить?`)) {
          return;
        }
        try {
          const { data: admins } = await supabaseClient.from('users').select('user_id').in('role', ['admin', 'owner']);
          if (admins) {
            const message = `🚨 <b>Анти-кража (Отклонение веса)</b>\nЗаказ: #${orderId.slice(0,8)}\nОжидаемый вес: ${weightEstimated} кг\nФактический вес: ${weightActual} кг\nРазница: ${diff.toFixed(3)} кг. Проверьте заказ!`;
            for (const admin of admins) {
              await sendNotification(admin.user_id, message, orderId);
            }
          }
        } catch(err) { console.error('Failed to notify admins', err); }
      }
      
      try {
        const { error } = await supabaseClient.from('orders').update({ weight_actual: weightActual }).eq('id', orderId);
        if (error) throw error;
        if (window.adminCache && window.adminCache.orders) {
          const o = window.adminCache.orders.find(o => o.id === orderId);
          if (o) o.weight_actual = weightActual;
        }
        glassToast('Фактический вес сохранен', { kind: 'success' });
        renderAdminScreen(false);
      } catch (err) {
        tgUtil.alert('Ошибка: ' + err.message);
      }
    };
    document.addEventListener('click', window._globalWeightHandler);
  }

  // ================== ЮР. ОТВЕТ (ИИ) ==================
  if (!window._legalAiHandler) {
    window._legalAiHandler = async (e) => {
      const btn = e.target.closest('.legalAiBtn');
      if (!btn) return;
      e.preventDefault();

      const orderId = btn.dataset.orderId;
      const userId = btn.dataset.userId;

      const complaint = prompt('Опишите суть претензии клиента:\n(Пример: "Клиент требует возврат за задержку доставки более 30 дней")');
      if (!complaint || !complaint.trim()) return;

      const promptText = `Заказ #${orderId}. Клиент (Telegram ID: ${userId}). Суть претензии: ${complaint.trim()}. Составь официальный ответ клиенту.`;

      try {
        btn.disabled = true;
        btn.textContent = '⏳ Отправляю запрос...';

        const { data: inserted, error: insertErr } = await supabaseClient
          .from('ai_requests')
          .insert({ admin_id: Number(userId) || 0, prompt_text: promptText })
          .select('id')
          .single();

        if (insertErr || !inserted) throw new Error(insertErr?.message || 'Ошибка создания запроса');

        const requestId = inserted.id;
        glassToast('Генерируем ответ (до 30 сек)...', { kind: 'info' });

        // Поллинг каждые 3 сек
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          if (attempts > 20) {
            clearInterval(poll);
            btn.disabled = false;
            btn.textContent = '⚖️ Юр. ответ (ИИ)';
            glassToast('Превышено время ожидания. Попробуйте позже.', { kind: 'error' });
            return;
          }
          try {
            const { data: req } = await supabaseClient
              .from('ai_requests')
              .select('status, response_text')
              .eq('id', requestId)
              .single();

            if (req && req.status === 'completed') {
              clearInterval(poll);
              btn.disabled = false;
              btn.textContent = '⚖️ Юр. ответ (ИИ)';

              // Показываем результат в модалке
              const modal = document.createElement('div');
              modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
              modal.innerHTML = `
                <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto">
                  <p style="color:#a78bfa;font-size:13px;font-weight:700;margin-bottom:12px">⚖️ Юридический ответ (ИИ)</p>
                  <pre style="color:#e2e8f0;font-size:12px;white-space:pre-wrap;line-height:1.6">${req.response_text}</pre>
                  <div style="display:flex;gap:8px;margin-top:16px">
                    <button id="_legalCopyBtn" style="flex:1;background:rgba(167,139,250,0.2);border:1px solid rgba(167,139,250,0.4);color:#a78bfa;border-radius:8px;padding:8px;font-size:12px;cursor:pointer">📋 Скопировать</button>
                    <button id="_legalCloseBtn" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:8px;padding:8px;font-size:12px;cursor:pointer">✖ Закрыть</button>
                  </div>
                </div>`;
              document.body.appendChild(modal);
              document.getElementById('_legalCopyBtn').onclick = () => {
                navigator.clipboard.writeText(req.response_text);
                glassToast('Скопировано!', { kind: 'success' });
              };
              document.getElementById('_legalCloseBtn').onclick = () => modal.remove();

            } else if (req && req.status === 'error') {
              clearInterval(poll);
              btn.disabled = false;
              btn.textContent = '⚖️ Юр. ответ (ИИ)';
              glassToast('Ошибка генерации ИИ. Попробуйте позже.', { kind: 'error' });
            }
          } catch (pollErr) {
            console.error('Ошибка поллинга ai_requests:', pollErr);
          }
        }, 3000);

      } catch (err) {
        btn.disabled = false;
        btn.textContent = '⚖️ Юр. ответ (ИИ)';
        glassToast('Ошибка: ' + err.message, { kind: 'error' });
      }
    };
    document.addEventListener('click', window._legalAiHandler);
  }

  // ================== AI ПРОГНОЗ ====================
  window._refreshAiPrediction = async () => {
    const el = document.getElementById('aiPredictionContent');
    if (!el) return;
    try {
      el.textContent = '⏳ Загрузка...';
      const { data, error } = await supabaseClient
        .from('app_settings')
        .select('latest_ai_prediction')
        .eq('id', 1)
        .single();
      if (error) throw error;
      el.textContent = data?.latest_ai_prediction || 'Прогноз ещё не сгенерирован. Он появится через 3 дня после запуска бота.';
    } catch (e) {
      el.textContent = '❌ Не удалось загрузить прогноз.';
    }
  };
  // Загружаем сразу при рендере
  if (document.getElementById('aiPredictionContent')) {
    window._refreshAiPrediction();
  }

  // ================== ФИЛЬТР ЗАКАЗОВ (ЧИПСЫ) ==================
  const chipContainer = document.getElementById('adminOrdersFilterChips');
  if (chipContainer) {
    const setActiveChip = (status) => {
      chipContainer.querySelectorAll('.filter-chip').forEach(c => {
        if (c.dataset.status === status) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    };
    setActiveChip(adminOrdersFilter);
    chipContainer.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const newStatus = chip.dataset.status;
        setActiveChip(newStatus);
        adminOrdersFilter = newStatus;
        adminOrdersPage = 1;
        renderAdminScreen(false);
      });
    });
  }

  // ================== ПАГИНАЦИЯ ЗАКАЗОВ ==================
  const prevBtn = document.getElementById('adminOrdersPrev');
  const nextBtn = document.getElementById('adminOrdersNext');
  if (prevBtn) prevBtn.onclick = () => { if (adminOrdersPage > 1) { adminOrdersPage--; renderAdminScreen(false); } };
  if (nextBtn) nextBtn.onclick = () => { if (adminOrdersPage < adminOrdersTotalPages) { adminOrdersPage++; renderAdminScreen(false); } };
    // ================== СМЕНА СТАТУСА ЗАКАЗА (ДЕЛЕГИРОВАНИЕ) ==================
    if (!window._statusChangeHandler) {
    window._statusChangeHandler = async (e) => {
      if (e.target.classList.contains('changeOrderStatus')) {
        const select = e.target;
        const newStatus = select.value;
        if (!newStatus) return;
        const orderId = select.dataset.orderId;
        const userId = select.dataset.userId;
        const previousStatus = select.dataset.previousStatus;
        if (!(await tgUtil.confirm(`Изменить статус заказа на "${getStatusText(newStatus)}"?`))) {
          select.value = previousStatus || '';
          return;
        }
        tgUtil.haptic('medium');
        try {
          const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
          if (error) throw error;
          logAdminAction('order_status', { orderId, newStatus, previousStatus });
          if (window.adminCache && window.adminCache.orders) {
            const o = window.adminCache.orders.find(o => o.id === orderId);
            if (o) { o.status = newStatus; o.updated_at = new Date().toISOString(); }
          }
          // Rich custom message via sendNotification below. We intentionally do
          // not also invoke `notify-status` here because that would produce a
          // second, duplicate Telegram message for the same status change.
          // `notify-status` remains in use for external ShopByShop webhook pings.
          const statusMessages = {
            'paid': '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Ваш заказ оплачен! Мы приступаем к выкупу.',
            'bought': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span> Товар выкуплен! Ожидайте отправки на склад.',
            'on_sklad_cn': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Товар на складе в Китае. Идёт подготовка к отправке.',
            'in_transit': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span> Ваш заказ в пути! Трек-номер появится позже.',
            'in_belarus': '🇧🇾 Товар в Беларуси! Скоро будет доставлен.',
            'delivered': '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.8 11.3 2.9 7.1L21 8M9 16l-3 3-3-3M9 8l3-3 3 3"/><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/></svg></span> Заказ доставлен! Спасибо, что выбрали ICE LOGIX!'
          };
          const message = statusMessages[newStatus];
          if (message) {
            await sendNotification(userId, message, orderId);
          }
          renderAdminScreen(false);
        } catch (err) {
          tgUtil.alert('Ошибка: ' + err.message);
          select.value = previousStatus || '';
        }
      }
    };
    document.addEventListener('change', window._statusChangeHandler);
  }

  // ================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМА АКТИВНЫЕ / АРХИВ ==================
  const activeBtn = document.getElementById('showActiveOrdersBtn');
const archiveBtn = document.getElementById('showArchivedOrdersBtn');
if (activeBtn) activeBtn.addEventListener('click', () => {
  adminOrdersMode = 'active';
  adminOrdersPage = 1;
  adminOrdersFilter = 'all';
  renderAdminScreen(false);
});
if (archiveBtn) archiveBtn.addEventListener('click', () => {
  adminOrdersMode = 'archived';
  adminOrdersPage = 1;
  adminOrdersFilter = 'all';
  renderAdminScreen(false);
});

    // ================== ВОССТАНОВЛЕНИЕ ЗАКАЗА (ДЕЛЕГИРОВАНИЕ) ==================
    if (!window._globalRestoreHandler) {
    window._globalRestoreHandler = async (e) => {
      const restoreBtn = e.target.closest('.restoreOrderBtn');
      if (!restoreBtn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const orderId = restoreBtn.dataset.orderId;
      if (!(await tgUtil.confirm('Восстановить заказ из архива?'))) return;
      tgUtil.haptic('medium');
      
      try {
        const { error } = await supabaseClient.from('orders').update({ status: 'pending' }).eq('id', orderId);
        if (error) throw error;
        logAdminAction('restore_order', { orderId });
        if (window.adminCache && window.adminCache.orders) {
          window.adminCache.orders = window.adminCache.orders.filter(o => o.id !== orderId);
          if (window.adminCache.ordersCount > 0) window.adminCache.ordersCount--;
        }
        tgUtil.alert('Заказ восстановлен');
        renderAdminScreen(false);
      } catch (err) {
        tgUtil.alert('Ошибка: ' + err.message);
      }
    };
    document.addEventListener('click', window._globalRestoreHandler);
  }
  // ================== КУРСЫ (АКАДЕМИЯ) ==================
  const adminAddCourseBtn = document.getElementById('adminAddCourseBtn');
  if (adminAddCourseBtn) adminAddCourseBtn.onclick = () => openCourseForm(null);

  document.querySelectorAll('.adminEditCourseBtn').forEach(btn => {
    btn.onclick = async () => {
      const { data } = await supabaseClient.from('courses').select('*').eq('id', btn.dataset.courseId).single();
      if (data) openCourseForm(data);
    };
  });

  document.querySelectorAll('.adminManageLessonsBtn').forEach(btn => {
    btn.onclick = () => manageLessonsModal(btn.dataset.courseId);
  });

  document.querySelectorAll('.adminDeleteCourseBtn').forEach(btn => {
    btn.onclick = async () => {
      if (!(await tgUtil.confirm('Удалить курс? Все уроки и прогресс будут удалены.'))) return;
      tgUtil.haptic('warning');
      try {
        await supabaseClient.from('courses').delete().eq('id', btn.dataset.courseId);
        if (window.adminCache) window.adminCache.courses = (window.adminCache.courses || []).filter(c => c.id !== btn.dataset.courseId);
        logAdminAction('delete_course', { courseId: btn.dataset.courseId });
        renderAdminScreen(false);
      } catch(e) { tgUtil.alert('Ошибка: ' + e.message); }
    };
  });

  // ================== ОТЧЁТЫ И АНАЛИТИКА ==================
  attachAnalyticsHandlers();

  // ================== УПРАВЛЕНИЕ АКЦИЯМИ ==================
const addPromotionBtn = document.getElementById('addPromotionBtn');
if (addPromotionBtn) addPromotionBtn.onclick = () => openPromotionForm();

// ================== ЗЕРКАЛО БАЗЫ (AUTO-BACKUP) ==================
const downloadBackupBtn = document.getElementById('downloadBackupBtn');
if (downloadBackupBtn) {
  downloadBackupBtn.onclick = async () => {
    tgUtil.haptic('medium');
    downloadBackupBtn.disabled = true;
    const originalText = downloadBackupBtn.innerHTML;
    downloadBackupBtn.innerHTML = `
      <span class="ix animate-spin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></span> Выгрузка базы данных...
    `;
    try {
      const [usersRes, ordersRes] = await Promise.all([
        supabaseClient.from('users').select('*'),
        supabaseClient.from('orders').select('*')
      ]);
      
      if (usersRes.error) throw usersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      
      const backupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        users: usersRes.data,
        orders: ordersRes.data
      };
      
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      a.href = url;
      a.download = `icelogix_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      tgUtil.haptic('success');
      glassToast('Бэкап базы данных успешно сохранен!', { kind: 'success' });
    } catch (err) {
      console.error('Backup failed:', err);
      tgUtil.alert('Не удалось выгрузить бэкап: ' + err.message);
    } finally {
      downloadBackupBtn.disabled = false;
      downloadBackupBtn.innerHTML = originalText;
    }
  };
}

  // ================== СТРАХОВЫЕ ПРЕТЕНЗИИ (ОДОБРЕНИЕ / ОТКЛОНЕНИЕ) ==================
  document.querySelectorAll('.approveClaimBtn').forEach(btn => {
    btn.onclick = async () => {
      const claimId = btn.dataset.id;
      const claimUserId = btn.dataset.userId;
      const amount = parseFloat(btn.dataset.amount || 0);
      const orderId = btn.dataset.orderId;
      
      if (!(await tgUtil.confirm(`Одобрить страховую претензию и выплатить ${amount.toFixed(2)} BYN на баланс клиента?`))) return;
      tgUtil.haptic('medium');
      
      try {
        btn.disabled = true;
        // 1. Fetch current user balance
        const { data: userRec, error: fErr } = await supabaseClient.from('users').select('ices_balance').eq('user_id', claimUserId).single();
        if (fErr) throw fErr;
        const currentBalance = userRec ? (userRec.ices_balance || 0) : 0;
        
        // 2. Add refund to balance in DB
        const { error: balErr } = await supabaseClient.from('users').update({ ices_balance: currentBalance + amount }).eq('user_id', claimUserId);
        if (balErr) throw balErr;
        
        // 3. Log transaction
        await supabaseClient.from('transactions').insert({
          user_id: claimUserId,
          amount: amount,
          type: 'insurance_refund',
          description: `Возврат по страховке за заказ #${orderId.slice(0, 8)}`
        });
        
        // 4. Update claim status to approved
        const { error: claimErr } = await supabaseClient.from('insurance_claims').update({ status: 'approved' }).eq('id', claimId);
        if (claimErr) throw claimErr;
        
        // 5. Send notification to user
        await sendNotification(claimUserId, `🛡️ Ваша страховая претензия по заказу #${orderId.slice(0, 8)} одобрена! Выплата ${amount.toFixed(2)} BYN зачислена на ваш баланс.`, orderId);
        
        glassToast('Страховая претензия успешно одобрена!', { kind: 'success' });
        if (window.adminCache) window.adminCache.claims = (window.adminCache.claims || []).filter(c => c.id !== claimId);
        renderAdminScreen(false);
      } catch(e) {
        console.error(e);
        tgUtil.alert('Ошибка: ' + e.message);
        btn.disabled = false;
      }
    };
  });
  
  document.querySelectorAll('.rejectClaimBtn').forEach(btn => {
    btn.onclick = async () => {
      const claimId = btn.dataset.id;
      const reason = await tgUtil.popup({
        title: 'Отклонить претензию',
        message: 'Укажите причину отклонения претензии для клиента:',
        buttons: [{ id: 'submit', text: 'Отклонить' }]
      });
      
      if (!reason) return;
      tgUtil.haptic('warning');
      
      try {
        btn.disabled = true;
        const { error } = await supabaseClient.from('insurance_claims').update({
          status: 'rejected',
          rejection_reason: reason
        }).eq('id', claimId);
        
        if (error) throw error;
        
        glassToast('Претензия отклонена.', { kind: 'info' });
        if (window.adminCache) window.adminCache.claims = (window.adminCache.claims || []).filter(c => c.id !== claimId);
        renderAdminScreen(false);
      } catch(e) {
        console.error(e);
        tgUtil.alert('Ошибка: ' + e.message);
        btn.disabled = false;
      }
    };
  });

  // ================== ЗАЯВКИ НА LEGIT-CHECK (ВЕРДИКТЫ) ==================
  document.querySelectorAll('.approveLegitBtn').forEach(btn => {
    btn.onclick = async () => {
      const checkId = btn.dataset.id;
      if (!(await tgUtil.confirm('Установить вердикт: ОРИГИНАЛ? Будет выдан сертификат подлинности.'))) return;
      tgUtil.haptic('medium');
      
      try {
        btn.disabled = true;
        const { error } = await supabaseClient.from('legit_check_requests').update({ status: 'original' }).eq('id', checkId);
        if (error) throw error;
        
        glassToast('Вердикт "Оригинал" успешно сохранен!', { kind: 'success' });
        if (window.adminCache) window.adminCache.legitChecks = (window.adminCache.legitChecks || []).filter(c => c.id !== checkId);
        renderAdminScreen(false);
      } catch(e) {
        console.error(e);
        tgUtil.alert('Ошибка: ' + e.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('.rejectLegitBtn').forEach(btn => {
    btn.onclick = async () => {
      const checkId = btn.dataset.id;
      const comments = await tgUtil.popup({
        title: 'Установить вердикт: ПОДДЕЛКА',
        message: 'Укажите комментарий эксперта с признаками неоригинальности:',
        buttons: [{ id: 'submit', text: 'Отклонить' }]
      });
      
      if (!comments) return;
      tgUtil.haptic('warning');
      
      try {
        btn.disabled = true;
        const { error } = await supabaseClient.from('legit_check_requests').update({
          status: 'fake',
          comments: comments
        }).eq('id', checkId);
        if (error) throw error;
        
        glassToast('Вердикт "Подделка" сохранен.', { kind: 'info' });
        if (window.adminCache) window.adminCache.legitChecks = (window.adminCache.legitChecks || []).filter(c => c.id !== checkId);
        renderAdminScreen(false);
      } catch(e) {
        console.error(e);
        tgUtil.alert('Ошибка: ' + e.message);
        btn.disabled = false;
      }
    };
  });
}

// ==================== АНАЛИТИКА ОБРАБОТЧИКИ ====================
function attachAnalyticsHandlers() {
  // ── Tab switching ──────────────────────────────────────────────────
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['transactions', 'analytics', 'logs'].forEach(name => {
        const el = document.getElementById(`analyticsTab-${name}`);
        if (el) el.classList.toggle('hidden', name !== tab.dataset.tab);
      });
    };
  });

  // ── Balance summary (auto-load) ────────────────────────────────────
  (async () => {
    const el = document.getElementById('balanceSummaryBlock');
    if (!el) return;
    try {
      const [{ data: users }, { data: txs }] = await Promise.all([
        supabaseClient.from('users').select('ices_balance, role'),
        supabaseClient.from('transactions').select('amount, type, created_at').order('created_at', { ascending: false }).limit(500)
      ]);
      const total = (users || []).reduce((s, u) => s + (u.ices_balance || 0), 0);
      const dropTotal = (users || []).filter(u => u.role === 'dropshipper').reduce((s, u) => s + (u.ices_balance || 0), 0);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sum = (type, since) => (txs || []).filter(t => t.type === type && t.created_at >= since).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      el.innerHTML = `
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-xs">Общий баланс</p><p class="text-cyan-400 font-bold text-sm">${total.toFixed(0)} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-xs">Баланс дропш.</p><p class="text-yellow-400 font-bold text-sm">${dropTotal.toFixed(0)} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-xs">Пополнения (30д)</p><p class="text-green-400 font-bold text-sm">+${sum('topup', monthAgo).toFixed(0)}</p></div>
        <div class="bg-white/5 rounded-xl p-2 text-center"><p class="text-white/50 text-xs">Выплаты (30д)</p><p class="text-red-400 font-bold text-sm">-${sum('withdrawal', monthAgo).toFixed(0)}</p></div>`;
    } catch { el.innerHTML = '<p class="text-white/30 text-xs col-span-2 text-center">Сводка недоступна</p>'; }
  })();

  // ── Transactions ───────────────────────────────────────────────────
  let _txData = [];
  const loadTransactions = async () => {
    const listEl = document.getElementById('txList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-white/40 text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка...</p>';
    try {
      let q = supabaseClient.from('transactions').select('*').order('created_at', { ascending: false }).limit(200);
      const typeF = document.getElementById('txTypeFilter')?.value;
      const userF = document.getElementById('txUserFilter')?.value.trim();
      const from  = document.getElementById('txDateFrom')?.value;
      const to    = document.getElementById('txDateTo')?.value;
      if (typeF) q = q.eq('type', typeF);
      if (userF) q = q.eq('user_id', userF);
      if (from)  q = q.gte('created_at', from + 'T00:00:00');
      if (to)    q = q.lte('created_at', to   + 'T23:59:59');
      const { data, error } = await q;
      if (error) throw error;
      _txData = data || [];
      // Fetch usernames
      const uids = [...new Set(_txData.map(t => t.user_id).filter(Boolean))];
      let uMap = {};
      if (uids.length) {
        const { data: us } = await supabaseClient.from('users').select('user_id, first_name, username').in('user_id', uids);
        (us || []).forEach(u => { uMap[u.user_id] = u.first_name || u.username || u.user_id; });
      }
      if (!_txData.length) { listEl.innerHTML = '<p class="text-white/40 text-center py-3">Транзакций не найдено</p>'; return; }
      listEl.innerHTML = _txData.map(t => `
        <div class="flex justify-between items-center p-2 bg-white/5 rounded-lg">
          <div class="min-w-0 flex-1">
            <p class="text-white/80 truncate">${uMap[t.user_id] || t.user_id || '—'}</p>
            <p class="text-white/40">${new Date(t.created_at).toLocaleDateString('ru-RU')} · ${t.type || '—'} · ${t.description || ''}</p>
          </div>
          <div class="ml-2 text-right flex-shrink-0">
            <p class="font-bold ${(t.amount||0) >= 0 ? 'text-green-400' : 'text-red-400'}">${(t.amount||0)>=0?'+':''}${t.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p>
            <p class="text-white/40">${t.status || ''}</p>
          </div>
        </div>`).join('');
      logAdminAction('view_transactions', { count: _txData.length });
    } catch(e) { listEl.innerHTML = `<p class="text-red-400 text-center py-3">Ошибка: ${e.message}</p>`; }
  };
  document.getElementById('txLoadBtn')?.addEventListener('click', loadTransactions);
  document.getElementById('txExportBtn')?.addEventListener('click', () => {
    if (!_txData.length) { tgUtil.alert('Сначала загрузите транзакции'); return; }
    const rows = [['Дата','User ID','Тип','Сумма','Статус','Описание'],
      ..._txData.map(t => [new Date(t.created_at).toLocaleString('ru-RU'), t.user_id||'', t.type||'', t.amount||0, t.status||'', t.description||''])];
    downloadCSV(rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'), 'transactions.csv');
    logAdminAction('export_csv', { type: 'transactions', count: _txData.length });
  });

  // ── Analytics / Charts ─────────────────────────────────────────────
  let _salesChart = null, _statusChart = null, _topData = [];
  const loadAnalytics = async () => {
    const period = parseInt(document.getElementById('analyticsPeriod')?.value || 30);
    const since  = new Date(Date.now() - period * 86400000).toISOString();
    const topEl  = document.getElementById('topProductsList');
    if (topEl) topEl.innerHTML = '<p class="text-white/40 text-center py-2"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка...</p>';
    try {
      const { data: orders, error } = await supabaseClient
        .from('orders').select('id, created_at, status, price_byn, prepayment_amount, items, source_url')
        .gte('created_at', since).order('created_at', { ascending: true });
      if (error) throw error;
      const os = orders || [];

      // Sales by day
      const byDay = {};
      os.forEach(o => {
        const day = (o.created_at||'').slice(0, 10);
        if (!day) return;
        if (!byDay[day]) byDay[day] = { count: 0, rev: 0 };
        byDay[day].count++;
        byDay[day].rev += o.price_byn || o.prepayment_amount || 0;
      });
      const days = Object.keys(byDay).sort();

      const salesCanvas = document.getElementById('salesChart');
      if (salesCanvas) {
        if (_salesChart) _salesChart.destroy();
        _salesChart = new Chart(salesCanvas, {
          type: 'line',
          data: {
            labels: days.map(d => d.slice(5)),
            datasets: [
              { label: 'Заказов', data: days.map(d => byDay[d].count), borderColor: '#00c2ff', backgroundColor: '#00c2ff20', tension: 0.4, yAxisID: 'y' },
              { label: 'Выручка BYN', data: days.map(d => +byDay[d].rev.toFixed(2)), borderColor: '#4ade80', backgroundColor: '#4ade8020', tension: 0.4, yAxisID: 'y1' }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#ffffff90', font: { size: 10 } } } },
            scales: {
              x:  { ticks: { color: '#aaa', font: { size: 9 } }, grid: { color: '#ffffff15' } },
              y:  { ticks: { color: '#00c2ff', font: { size: 9 } }, grid: { color: '#ffffff10' } },
              y1: { position: 'right', ticks: { color: '#4ade80', font: { size: 9 } }, grid: { drawOnChartArea: false } }
            }
          }
        });
      }

      // Status doughnut
      const stCounts = {};
      os.forEach(o => { stCounts[o.status] = (stCounts[o.status] || 0) + 1; });
      const stLabels = Object.keys(stCounts);
      const stColors = stLabels.map(s => ({ pending:'#f59e0b', paid:'#10b981', bought:'#3b82f6', on_sklad_cn:'#8b5cf6', in_transit:'#06b6d4', in_belarus:'#14b8a6', delivered:'#10b981', cancelled:'#ef4444' }[s] || '#ffffff40'));
      const statusCanvas = document.getElementById('statusChart');
      if (statusCanvas) {
        if (_statusChart) _statusChart.destroy();
        _statusChart = new Chart(statusCanvas, {
          type: 'doughnut',
          data: { labels: stLabels.map(s => getStatusText(s)), datasets: [{ data: stLabels.map(s => stCounts[s]), backgroundColor: stColors }] },
          options: { responsive: true, plugins: { legend: { labels: { color: '#ffffff90', font: { size: 10 } }, position: 'bottom' } } }
        });
      }

      // Top products from order items
      const prodMap = {};
      os.forEach(o => {
        (Array.isArray(o.items) ? o.items : []).forEach(item => {
          const key = item.productId || item.product_id || item.title || 'Unknown';
          if (!prodMap[key]) prodMap[key] = { title: item.title || key, count: 0, rev: 0 };
          prodMap[key].count += item.quantity || 1;
          prodMap[key].rev   += window.iceLogixPricing.quickEstimate(item.price || 0, 1) * (item.quantity || 1);
        });
      });
      _topData = Object.values(prodMap).sort((a,b) => b.count - a.count).slice(0, 10);

      // Top marketplaces by domain
      const domMap = {};
      os.forEach(o => { try { const d = new URL(o.source_url||'').hostname.replace('www.',''); domMap[d] = (domMap[d]||0)+1; } catch {} });
      const topDomains = Object.entries(domMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

      if (topEl) {
        topEl.innerHTML = `
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="text-white/40"><th class="text-left pb-1">Товар</th><th class="text-right pb-1">Шт.</th><th class="text-right pb-1">Выручка</th></tr></thead>
              <tbody>${(_topData.length ? _topData : [{title:'Нет данных в заказах',count:0,rev:0}]).map(p=>`
                <tr class="border-t border-white/5">
                  <td class="py-1 text-white/80 truncate max-w-[160px]">${p.title}</td>
                  <td class="py-1 text-cyan-400 text-right">${p.count}</td>
                  <td class="py-1 text-green-400 text-right">${p.rev.toFixed(2)}</td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
          ${topDomains.length ? `<p class="text-white/40 text-xs mt-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> Площадки: ${topDomains.map(([d,c])=>`${d} (${c})`).join(' · ')}</p>` : ''}`;
      }
      logAdminAction('view_analytics', { period });
    } catch(e) { if (topEl) topEl.innerHTML = `<p class="text-red-400 text-center py-2">Ошибка: ${e.message}</p>`; }
  };
  document.getElementById('loadAnalyticsBtn')?.addEventListener('click', loadAnalytics);
  document.getElementById('exportTopProductsBtn')?.addEventListener('click', () => {
    if (!_topData.length) { tgUtil.alert('Сначала загрузите аналитику'); return; }
    const rows = [['Товар','Продано шт.','Выручка BYN'], ..._topData.map(p=>[p.title, p.count, p.rev.toFixed(2)])];
    downloadCSV(rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'), 'top_products.csv');
    logAdminAction('export_csv', { type: 'top_products' });
  });

  // ── Admin logs ─────────────────────────────────────────────────────
  document.getElementById('logsLoadBtn')?.addEventListener('click', async () => {
    const listEl = document.getElementById('logsList');
    if (!listEl) return;
    listEl.innerHTML = '<p class="text-white/40 text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка...</p>';
    try {
      let q = supabaseClient.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100);
      const af = document.getElementById('logsAdminFilter')?.value.trim();
      const ac = document.getElementById('logsActionFilter')?.value;
      if (af) q = q.eq('admin_id', af);
      if (ac) q = q.ilike('action', `%${ac}%`);
      const { data, error } = await q;
      if (error) throw error;
      const logs = data || [];
      if (!logs.length) { listEl.innerHTML = '<p class="text-white/40 text-center py-3">Логов не найдено</p>'; return; }
      listEl.innerHTML = logs.map(l => `
        <div class="p-2 bg-white/5 rounded-lg">
          <div class="flex justify-between items-start">
            <span class="text-cyan-400 font-medium">${l.action}</span>
            <span class="text-white/40 text-xs">${new Date(l.created_at).toLocaleString('ru-RU')}</span>
          </div>
          <p class="text-white/50 text-xs">Admin: ${l.admin_id} · ${l.details || ''}</p>
        </div>`).join('');
    } catch(e) { listEl.innerHTML = `<p class="text-red-400 text-center py-3">Ошибка: ${e.message}</p>`; }
  });
}

async function openPromotionForm(promotion = null) {
  const isEdit = !!promotion;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
  modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg">${isEdit ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Редактировать' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новая акция'}</h3>
      </div>
      <div class="p-5 overflow-y-auto flex-1">
        <div class="space-y-3">
          <input type="text" id="promoTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Название *" value="${promotion?.title || ''}">
          <textarea id="promoDesc" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Описание">${promotion?.description || ''}</textarea>
          <input type="url" id="promoBanner" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="URL баннера" value="${promotion?.banner_url || ''}">
          <select id="promoDiscountType" class="btn-secondary w-full p-3 rounded-xl border border-white/30">
            <option value="percent" ${promotion?.discount_type === 'percent' ? 'selected' : ''}>Процент (%)</option>
            <option value="fixed" ${promotion?.discount_type === 'fixed' ? 'selected' : ''}>Фикс (BYN)</option>
          </select>
          <input type="number" id="promoDiscountValue" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Значение скидки *" value="${promotion?.discount_value || ''}">
          <input type="number" id="promoMinAmount" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Мин. сумма заказа (0 - без ограничений)" value="${promotion?.min_order_amount || 0}">
          <label class="text-white/70 text-sm">Дата начала</label>
          <input type="datetime-local" id="promoStartsAt" class="btn-secondary w-full p-3 rounded-xl border border-white/30" value="${promotion?.starts_at ? new Date(promotion.starts_at).toISOString().slice(0,16) : ''}">
          <label class="text-white/70 text-sm">Дата окончания</label>
          <input type="datetime-local" id="promoExpiresAt" class="btn-secondary w-full p-3 rounded-xl border border-white/30" value="${promotion?.expires_at ? new Date(promotion.expires_at).toISOString().slice(0,16) : ''}">
          <input type="number" id="promoUsageLimit" class="btn-secondary w-full p-3 rounded-xl border border-white/30" placeholder="Лимит использований (пусто - безлимит)" value="${promotion?.usage_limit || ''}">
          <div class="border-t border-white/10 pt-3 mt-1">
            <label class="text-white/70 text-sm flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span> Пуш-уведомление о старте</label>
            <textarea id="promoPushText" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mt-1" placeholder="Текст пуша (пусто — без рассылки)">${promotion?.push_text || ''}</textarea>
            <label class="text-white/70 text-sm">За сколько минут до старта отправить</label>
            <input type="number" id="promoPushBefore" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mt-1" placeholder="Минут до старта" value="${promotion?.push_minutes_before ?? 60}">
            ${isEdit ? `<label class="flex items-center gap-2 text-white/80 mt-2"><input type="checkbox" id="promoResendPush"> Отправить пуш заново ${promotion?.push_sent ? '(уже отправлен)' : ''}</label>` : ''}
          </div>
          <label class="flex items-center gap-2 text-white/80"><input type="checkbox" id="promoActive" ${promotion?.is_active !== false ? 'checked' : ''}> Активна</label>
        </div>
      </div>
      <div class="p-5 border-t border-white/20">
        <div class="flex gap-3">
          <button id="savePromotionBtn" class="btn-primary flex-1">${isEdit ? 'Сохранить' : 'Создать'}</button>
          <button id="cancelPromotionBtn" class="btn-secondary flex-1">Отмена</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#cancelPromotionBtn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  const saveBtn = modal.querySelector('#savePromotionBtn');
  saveBtn.onclick = async () => {
    const title = modal.querySelector('#promoTitle').value.trim();
    const discount_value = parseFloat(modal.querySelector('#promoDiscountValue').value);
    if (!title || isNaN(discount_value)) { tgUtil.alert('Заполните название и значение скидки'); return; }
    
    const payload = {
      title,
      description: modal.querySelector('#promoDesc').value.trim(),
      banner_url: modal.querySelector('#promoBanner').value.trim(),
      discount_type: modal.querySelector('#promoDiscountType').value,
      discount_value,
      min_order_amount: parseFloat(modal.querySelector('#promoMinAmount').value) || 0,
      starts_at: modal.querySelector('#promoStartsAt').value || null,
      expires_at: modal.querySelector('#promoExpiresAt').value || null,
      usage_limit: parseInt(modal.querySelector('#promoUsageLimit').value) || null,
      is_active: modal.querySelector('#promoActive').checked,
      push_text: modal.querySelector('#promoPushText').value.trim() || null,
      push_minutes_before: parseInt(modal.querySelector('#promoPushBefore').value) || 60
    };

    try {
      if (isEdit) {
        const resend = modal.querySelector('#promoResendPush');
        if (resend && resend.checked) payload.push_sent = false;
        await supabaseClient.from('promotions').update(payload).eq('id', promotion.id);
      } else {
        payload.push_sent = false;
        await supabaseClient.from('promotions').insert(payload);
      }
      tgUtil.alert(isEdit ? 'Акция обновлена' : 'Акция создана');
      modal.remove();
      renderCurrentScreen();
    } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
  };
}

// Обработчики редактирования/удаления (делегирование)
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('editPromotionBtn')) {
    const id = e.target.dataset.id;
    const { data } = await supabaseClient.from('promotions').select('*').eq('id', id).single();
    if (data) openPromotionForm(data);
  }
  if (e.target.classList.contains('deletePromotionBtn')) {
    const id = e.target.dataset.id;
    if (!(await tgUtil.confirm('Удалить акцию?'))) return;
    tgUtil.haptic('warning');
    await supabaseClient.from('promotions').delete().eq('id', id);
    tgUtil.alert('Удалено');
    renderCurrentScreen();
  }
});

    // Функция для обновления статуса заказа с отправкой уведомления
    async function updateOrderStatus(orderId, newStatus, userId) {
  try {
    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) throw error;
    // Rich custom message via sendNotification below. We intentionally do not
    // also invoke `notify-status` — see the admin status handler above for the
    // rationale (duplicate Telegram delivery would result otherwise).

    const statusMessages = {
      'paid': '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Ваш заказ оплачен! Мы приступаем к выкупу.',
      'bought': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span> Товар выкуплен! Ожидайте отправки на склад.',
      'on_sklad_cn': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> Товар на складе в Китае. Идёт подготовка к отправке.',
      'in_transit': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span> Ваш заказ в пути! Трек-номер появится позже.',
      'in_belarus': '🇧🇾 Товар в Беларуси! Скоро будет доставлен.',
      'delivered': '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.8 11.3 2.9 7.1L21 8M9 16l-3 3-3-3M9 8l3-3 3 3"/><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/></svg></span> Заказ доставлен! Спасибо, что выбрали ICE LOGIX!'
    };
    const message = statusMessages[newStatus];
    if (message) {
      await sendNotification(userId, message, orderId);
    }
  } catch (err) {
    console.error('Ошибка обновления статуса:', err);
    throw err;
  }
}

async function sendNotification(userId, message, orderId = null) {
  try {
    await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, message, order_id: orderId })
    });
  } catch (err) {
    console.error('Ошибка отправки уведомления:', err);
  }
}

    // ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
    function getStatusText(status) {
      const statuses = {
        'pending': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> В обработке',
        'paid': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span> Оплачен (1 часть)',
        'bought': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span> Выкуплен',
        'on_sklad_cn': '<span class="ix anim-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> На складе в Китае',
        'in_transit': '<span class="ix anim-truck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span> В пути в Минск',
        'customs': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> На таможне',
        'awaiting_payment': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span> Ожидает доплаты',
        'paid_second': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> Оплачен',
        'in_belarus': '<span class="ix anim-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span> У нас',
        'dispatched': '<span class="ix anim-truck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span> Отправлен',
        'delivered': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span> Готов к выдаче',
        'awaiting_decision': '⚠️ Ожидает решения',
        'problem_order': '🚨 Проблемный заказ',
        'refunded': '↩️ Возврат на баланс',
        'cancelled': '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span> Отменён'
      };
      return statuses[status] || status;
    }

    function getStatusClass(status) {
      const classes = {
        'pending': 'status-pending',
        'paid': 'status-paid',
        'bought': 'status-bought',
        'on_sklad_cn': 'status-on_sklad_cn',
        'in_transit': 'status-in_transit',
        'awaiting_payment': 'status-pending',
        'paid_second': 'status-paid',
        'in_belarus': 'status-in_belarus',
        'dispatched': 'status-in_transit',
        'delivered': 'status-delivered',
        'awaiting_decision': 'status-pending',
        'problem_order': 'status-cancelled',
        'refunded': 'status-delivered',
        'cancelled': 'status-cancelled'
      };
      return classes[status] || 'status-pending';
    }

    // ==================== КНОПКА НАЗАД ====================
    // When running inside Telegram, we use the native BackButton (see syncTelegramBackButton).
    // The in-page button is rendered only as a fallback for browsers without the Telegram WebApp SDK.
    function ensureBackButton() {
      const oldBtn = document.getElementById('globalBackBtn');
      if (oldBtn) oldBtn.remove();
      if (window.Telegram?.WebApp?.BackButton) return;
      if (currentTab !== 'home' && currentTab !== 'catalogs' && currentTab !== 'reports' && currentTab !== 'reviews' && currentTab !== 'academy' && currentTab !== 'dropshipper' && currentTab !== 'products' && currentTab !== 'wishlist') {
        const contentDiv = document.getElementById('content');
        const btn = document.createElement('button');
        btn.id = 'globalBackBtn';
        btn.className = 'global-back-btn';
        btn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад';
        btn.onclick = () => {
          tgUtil.haptic('light');
          if (previousTab && previousTab !== currentTab) switchTab(previousTab);
          else if (currentTab !== 'home') switchTab('home');
          else tg.close();
        };
        if (contentDiv.firstChild) contentDiv.insertBefore(btn, contentDiv.firstChild);
        else contentDiv.appendChild(btn);
      }
    }


    window.renderSizeGuides = async () => {
  return `
    <button class="global-back-btn" onclick="switchTab('catalogs')"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад в Каталог</button>
    <div class="glass-card mb-5 page-enter">
      <h2 class="text-xl font-bold text-white mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></span> Гайд по размерам</h2>
      <p class="text-white/60 text-xs mb-4">Интерактивная база данных. Здесь мы собираем информацию о том, маломерят вещи или идут в размер, чтобы вы точно не ошиблись при заказе с площадок.</p>
      
      <div class="space-y-4">
        <!-- Nike -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/10">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-white font-bold">Nike / Air Jordan</h3>
            <span class="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold">Обувь</span>
          </div>
          <p class="text-white/70 text-xs mb-3">Обычно идут <strong>строго в размер</strong> (True to Size). Однако модели <em>Jordan 4</em> и <em>Air Max 95</em> могут давить в носке, поэтому берите на <strong>0.5 размера больше</strong> для широкой стопы.</p>
          <div class="bg-black/20 p-2 rounded-lg text-[10px] text-white/50 font-mono">
            Пример: US 9 = 42.5 EUR = 27 см
          </div>
        </div>
        
        <!-- Yeezy -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/10">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-white font-bold">Yeezy / Adidas</h3>
            <span class="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold">Обувь</span>
          </div>
          <p class="text-white/70 text-xs mb-3">Модели <em>Yeezy Boost 350 V2</em> и <em>700</em> <strong>сильно маломерят</strong>! Всегда заказывайте на <strong>0.5 - 1 размер больше</strong> вашего стандартного размера.</p>
          <div class="bg-black/20 p-2 rounded-lg text-[10px] text-white/50 font-mono">
            Пример: US 9.5 = 43.3 EUR = 27.5 см
          </div>
        </div>
        
        <!-- Zara -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/10">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-white font-bold">Zara / Massimo Dutti</h3>
            <span class="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold">Одежда</span>
          </div>
          <p class="text-white/70 text-xs mb-3">Верхняя одежда (особенно зимние куртки и пальто) часто <strong>большемерит</strong> (Oversize). Если вы носите M, куртку смело можно брать размера M, и под нее еще влезет толстый свитер.</p>
        </div>
        
        <!-- Arc'teryx -->
        <div class="bg-white/5 p-4 rounded-xl border border-white/10">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-white font-bold">Arc'teryx / The North Face</h3>
            <span class="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold">Одежда</span>
          </div>
          <p class="text-white/70 text-xs mb-3">Куртки (Gore-Tex) шьются строго по анатомическим лекалам. Для свободного кроя или чтобы носить с худи, берите на <strong>размер больше</strong>.</p>
        </div>
      </div>
    </div>
    ${renderFooter()}
  `;
};

function generateAdminOrderCard(order, userMap, isActive) {
  const user = userMap[order.user_id] || {};
  const displayName = user.full_name || 'Без имени';
  const displayUsername = user.username ? '@' + user.username : '';
  
  const lastUpdated = order.updated_at ? new Date(order.updated_at).getTime() : new Date(order.created_at).getTime();
  const daysPassed = (Date.now() - lastUpdated) / (1000 * 60 * 60 * 24);
  const isRisky = daysPassed > 7 && order.status !== 'delivered' && order.status !== 'cancelled';
  
  const cardClass = isRisky 
    ? "bg-red-500/10 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
    : "bg-white/5 border border-transparent";

  const actionButton = isActive
    ? `<button class="archiveOrderBtn mt-2 text-xs bg-red-600/50 hover:bg-red-600 px-2 py-1.5 rounded-lg w-full text-center transition" data-order-id="${order.id}">🗑️ В архив</button>`
    : `<button class="restoreOrderBtn mt-2 text-xs bg-green-600/50 hover:bg-green-600 px-2 py-1.5 rounded-lg w-full text-center transition" data-order-id="${order.id}">↩️ Восстановить</button>`;
  
  const statusSelect = isActive
    ? `<select class="changeOrderStatus mt-2 w-full text-xs p-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-cyan-500" data-order-id="${order.id}" data-user-id="${order.user_id}" data-previous-status="${order.status}">
        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Новые</option>
        <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Оплачен</option>
        <option value="bought" ${order.status === 'bought' ? 'selected' : ''}>Выкуплен</option>
        <option value="on_sklad_cn" ${order.status === 'on_sklad_cn' ? 'selected' : ''}>Склад КН</option>
        <option value="in_transit" ${order.status === 'in_transit' ? 'selected' : ''}>В пути</option>
        <option value="in_belarus" ${order.status === 'in_belarus' ? 'selected' : ''}>В РБ</option>
        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменён</option>
      </select>`
    : '';
    
  const managerSelect = isActive ? `
    <select class="assignManager mt-2 w-full text-[10px] p-1.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30" disabled>
      <option>Автораспределение (Фаза 4)</option>
    </select>
  ` : '';

  const weightInputHtml = isActive ? `
    <div class="mt-2 flex items-center gap-2">
      <input type="number" step="0.01" class="w-full text-xs p-1.5 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/30 actual-weight-input" placeholder="Факт. вес (кг)" data-order-id="${order.id}" data-estimated="${order.weight_estimated || 0}" value="${order.weight_actual || ''}">
      <button class="bg-blue-500/50 hover:bg-blue-500 text-xs px-2 py-1.5 rounded transition text-white save-weight-btn" data-order-id="${order.id}">Сохранить</button>
    </div>
  ` : '';

  const manifestBtn = isActive
    ? `<button class="mt-2 w-full text-xs bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 py-1.5 rounded-lg transition-colors flex justify-center items-center gap-1" onclick="window.generateShippingManifest('${order.id}')">🖨️ Печать накладной</button>`
    : '';

  const legalAiBtn = isActive
    ? `<button class="legalAiBtn mt-2 w-full text-xs bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/50 text-emerald-300 py-1.5 rounded-lg transition-colors" data-order-id="${order.id}" data-user-id="${order.user_id}">⚖️ Юр. ответ (ИИ)</button>`
    : '';

  return `
    <div class="rounded-xl p-3 ${cardClass} mb-2 relative transition-all hover:bg-white/10">
      ${isRisky ? '<div class="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg animate-pulse">⚠️ > 7 дней</div>' : ''}
      <div class="flex justify-between items-start mb-1">
        <p class="text-white font-mono text-sm font-bold">#${order.id.slice(0,8)}</p>
        <span class="text-white/50 text-[10px]">${new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
      </div>
      <p class="text-white/80 text-xs truncate">👤 ${displayName} ${displayUsername}</p>
      ${user.is_toxic ? '<div class="inline-flex items-center gap-1 mt-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">⚠️ Токсичный клиент</div>' : ''}
      <div class="flex justify-between items-end mt-2">
        <p class="text-cyan-400 text-sm font-bold">${Number(order.prepayment_amount || 0).toFixed(2)} ❄️</p>
        <div class="text-right">
          ${order.tracking_number_cn ? `<p class="text-white/50 text-[10px] truncate max-w-[150px]">Внутр: ${order.tracking_number_cn}</p>` : ''}
          ${order.sbs_tracking_id ? `<p class="text-cyan-400 text-[10px] font-bold truncate max-w-[150px]">SBS: ${order.sbs_tracking_id}</p>` : ''}
        </div>
      </div>
      ${weightInputHtml}
      ${managerSelect}
      <div class="grid grid-cols-3 gap-1.5 mt-2">
        <button type="button" class="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/40 text-cyan-300 text-[11px] py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition" onclick="window.openOperatorPurchaseModal('${order.id}', ${order.price || order.price_cny || 0}, ${order.total_byn || 0})">
          🛒 Выкуп
        </button>
        <button type="button" class="bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 text-[11px] py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition" onclick="window.openOperatorWarehouseModal('${order.id}', ${order.weight_estimated || 1.0}, ${order.prepayment_amount || 0})">
          ⚖️ Склад
        </button>
        <button type="button" class="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/40 text-purple-300 text-[11px] py-1.5 px-1 rounded-lg font-semibold flex items-center justify-center gap-1 transition" onclick="window.openOrderReconciliationModal('${order.id}')">
          🔍 Сверка
        </button>
      </div>
      ${manifestBtn}
      ${legalAiBtn}
      ${statusSelect}
      ${actionButton}
    </div>
  `;
}

async function renderAdminOrdersList() {
  try {
    const isParamsMatch = window.adminCache && 
                          window.adminCache.ordersPage === adminOrdersPage &&
                          window.adminCache.ordersMode === adminOrdersMode &&
                          window.adminCache.ordersFilter === adminOrdersFilter;
                          
    if (!window.adminCache || !window.adminCache.orders || !isParamsMatch) {
      await preloadAdminData(true);
    }
    
    const orders = window.adminCache.orders;
    const count = window.adminCache.ordersCount;
    const userMap = window.adminCache.ordersUserMap;
    
    adminOrdersTotalPages = Math.ceil((count || 0) / 30);
    if (!orders || orders.length === 0) return '<p class="text-white/70 text-center py-4">Нет заказов</p>';
    
    const uniqueOrders = Array.from(new Map(orders.map(o => [o.id, o])).values());

    if (adminOrdersMode === 'active' && adminOrdersFilter === 'all') {
      const columns = [
        { key: 'pending', title: 'Новые', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
        { key: 'paid', title: 'Оплачен', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
        { key: 'bought', title: 'Выкуплен', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
        { key: 'on_sklad_cn', title: 'Склад КН', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
        { key: 'in_transit', title: 'В пути', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' },
        { key: 'in_belarus', title: 'В РБ', color: 'bg-teal-500/20 text-teal-400 border-teal-500/50' },
        { key: 'delivered', title: 'Доставлен', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' }
      ];
      
      let html = '<div class="flex gap-4 overflow-x-auto pb-4 snap-x custom-scrollbar">';
      columns.forEach(col => {
        const colOrders = uniqueOrders.filter(o => o.status === col.key);
        html += `<div class="min-w-[280px] w-[280px] bg-white/5 rounded-2xl p-3 snap-start border-t-4 border-transparent flex flex-col max-h-[600px] shadow-lg">
          <h4 class="font-bold mb-3 flex justify-between items-center text-sm ${col.color.split(' ')[1]}">${col.title} <span class="${col.color.split(' ')[0]} px-2 py-0.5 rounded-full text-xs border ${col.color.split(' ')[2]}">${colOrders.length}</span></h4>
          <div class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">`;
        if (colOrders.length === 0) {
          html += '<p class="text-white/30 text-xs text-center py-4">Пусто</p>';
        } else {
          html += colOrders.map(order => generateAdminOrderCard(order, userMap, true)).join('');
        }
        html += `</div></div>`;
      });
      html += '</div>';
      return html;
    } else {
      return uniqueOrders.map(order => generateAdminOrderCard(order, userMap, adminOrdersMode === 'active')).join('');
    }
  } catch (err) {
    console.error('Error loading admin orders:', err);
    return '<p class="text-white/70 text-center py-4">Ошибка загрузки заказов</p>';
  }
}

async function renderProductsCatalog() {
  try {
    let query = supabaseClient.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (productsFilter.category !== 'all') query = query.eq('category', productsFilter.category);
    if (productsFilter.brand !== 'all') query = query.eq('brand', productsFilter.brand);
    if (productsFilter.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (productsFilter.sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const from = (productsPage - 1) * 20;
    const to = from + 19;

    const [productsRes, userOrdersRes, userTxRes] = await Promise.all([
      query.range(from, to),
      userId ? supabaseClient.from('orders').select('id').eq('user_id', userId).in('status', ['paid', 'bought', 'on_sklad_cn', 'in_transit', 'in_belarus', 'delivered']).limit(1) : Promise.resolve({ data: [] }),
      userId ? supabaseClient.from('transactions').select('id').eq('user_id', userId).limit(1) : Promise.resolve({ data: [] })
    ]);

    if (productsRes.error) throw productsRes.error;
    const rawData = productsRes.data || [];
    const count = productsRes.count || 0;
    const data = preprocessProducts(rawData);

    productsTotalPages = Math.ceil((count || 0) / 20);

    const userOrders = userOrdersRes?.data || [];
    const userTx = userTxRes?.data || [];
    const isVipUnlocked = (userOrders.length > 0) || (userTx.length > 0);

    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    const brands = [...new Set(data.map(p => p.brand).filter(Boolean))];

    const activeFilters = [
      productsFilter.category !== 'all' ? productsFilter.category : '',
      productsFilter.brand !== 'all' ? productsFilter.brand : '',
      productsFilter.sort !== 'new' ? (productsFilter.sort === 'price_asc' ? 'Цена <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg></span>' : 'Цена <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span>') : ''
    ].filter(Boolean).join(', ');

    return `
      <button id="backFromProductsCatalogBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
      
      <!-- VIP Section Banner -->
      ${isVipUnlocked ? `
        <!-- Unlocked VIP Section Card -->
        <div class="glass-card mb-5 overflow-hidden relative border border-green-500/20 bg-gradient-to-br from-slate-900 via-emerald-950/10 to-slate-900 p-4 cursor-pointer hover:scale-[1.01] transition-all" onclick="window.showVipSectionModal()">
          <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl" style="background: rgba(16,185,129,0.2);"></div>
          <div class="flex items-center justify-between gap-4 relative z-10">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style="background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(4,120,87,0.15));">
                🔥
              </div>
              <div class="flex-1 min-w-0 text-left">
                <h3 class="text-green-400 font-extrabold text-sm uppercase tracking-wider mb-0.5">🔥 VIP-Раздел открыт!</h3>
                <p class="text-white/70 text-[10px] leading-relaxed">Вам доступны эксклюзивные товары с максимальными скидками до 70%!</p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-green-400 flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      ` : `
        <!-- Locked VIP Section Card -->
        <div class="glass-card mb-5 overflow-hidden relative border border-yellow-500/20 bg-gradient-to-br from-slate-900 via-amber-950/10 to-slate-900 p-4 cursor-pointer hover:scale-[1.01] transition-all" onclick="tgUtil.alert('Секретный VIP-раздел заблокирован! Оформите и оплатите хотя бы один заказ, чтобы разблокировать доступ к уникальным скидкам до 70%!')">
          <div class="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl" style="background: rgba(251,191,36,0.15);"></div>
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 animate-pulse" style="background: linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15));">
              🔒
            </div>
            <div class="flex-1 min-w-0 text-left">
              <h3 class="text-amber-400 font-extrabold text-sm uppercase tracking-wider mb-0.5">🔒 VIP-Раздел закрыт</h3>
              <p class="text-white/60 text-[10px] leading-relaxed">Оплатите свой первый заказ, чтобы открыть доступ к эксклюзивным VIP-товарам со скидками до 70%!</p>
            </div>
          </div>
        </div>
      `}

      <div class="flex items-center gap-3 mb-4">
        <button id="openFilterModalBtn" class="btn-secondary py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/20">
          <span class="ix" style="width: 14px; height: 14px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></span> Фильтры
        </button>
        ${activeFilters ? `<p class="text-white/50 text-xs truncate flex-1">Активно: ${activeFilters}</p><button id="resetFiltersBtn" class="text-cyan-400 text-xs flex-shrink-0">Сбросить</button>` : '<p class="text-white/50 text-xs">Все товары</p>'}
      </div>
      <div class="grid grid-cols-2 gap-2" id="productsGrid" style="margin-left: -6px; margin-right: -6px;">
        ${data.map(p => `
          <div class="product-card" data-product-id="${p.id}">
            <div class="relative">
              ${renderCardMedia(p.image_url, p.title)}
              <span class="absolute top-2 right-2 wishlist-heart text-lg ${wishlist.has(p.id) ? 'text-red-500' : 'text-white/60'} z-20" data-product-id="${p.id}">${getHeartIcon(wishlist.has(p.id))}</span>
            </div>
            <div style="padding: 8px 8px 10px 8px; display: flex; flex-direction: column; flex: 1;">
              <p class="text-white font-bold text-sm truncate" style="font-size: 14px; font-weight: 700; line-height: 1.2;">${p.title}</p>
              <p class="text-cyan-400 font-bold text-xs mt-1" style="font-size: 13px;">${p.price} ${p.currency}</p>
              <p class="text-white/50 text-[11px] truncate mt-0.5">${p.brand || ''} ${p.category || ''}</p>
              <div class="flex gap-1.5 mt-2">
                <button class="btn-primary addToCartBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-product-id="${p.id}">Корзина</button>
                <button class="buyNowBtn flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg" data-url="${p.url}" data-price="${p.price}">Заказать</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div id="catalogSentinel" class="py-6 flex justify-center">
        ${productsPage < productsTotalPages ? '<p class="text-white/30 text-sm">Загрузка...</p>' : '<p class="text-white/30 text-sm">Все товары загружены</p>'}
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    return '<p class="text-center mt-10 text-red-400">Ошибка загрузки товаров</p>';
  }
}

function attachProductsCatalogHandlers() {
  // Init image sliders & dots for catalog cards
  initCardSliders();
  // Кнопка сброса фильтров в шапке
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.onclick = () => {
      productsFilter = { category: 'all', brand: 'all', sort: 'new' };
      productsPage = 1;
      renderCurrentScreen();
    };
  }

  // Модальное окно фильтров
  const openFilterBtn = document.getElementById('openFilterModalBtn');
  if (openFilterBtn) {
    openFilterBtn.onclick = async () => {
      const { data: allP } = await supabaseClient.from('products').select('category, brand').eq('is_active', true);
      const allCats = [...new Set(allP?.map(p => p.category).filter(Boolean) || [])];
      const allBrands = [...new Set(allP?.map(p => p.brand).filter(Boolean) || [])];
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300';
      
      const card = document.createElement('div');
      card.className = 'bg-[#1a2333] border-t border-white/20 rounded-t-3xl w-full max-w-md p-5 pb-8 space-y-5 transform translate-y-full transition-transform duration-300 shadow-2xl';
      card.style.maxHeight = '80vh';
      card.style.overflowY = 'auto';
      
      card.innerHTML = `
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 class="text-white font-bold text-base flex items-center gap-2">
            <span class="ix" style="width:16px;height:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></span> Фильтры
          </h3>
          <button id="closeFiltersSheet" class="text-white/60 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span> Категория</label>
            <select id="mfCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/10 bg-[#1e293b] text-white text-xs">
              <option value="all">Все категории</option>
              ${allCats.map(c => `<option value="${c}" ${productsFilter.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2 2v-2ZM12 8v4M9.8 16.2l2-2v2Z"/></svg></span> Бренд</label>
            <select id="mfBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/10 bg-[#1e293b] text-white text-xs">
              <option value="all">Все бренды</option>
              ${allBrands.map(b => `<option value="${b}" ${productsFilter.brand === b ? 'selected' : ''}>${b}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="text-white/60 text-xs mb-2 font-semibold flex items-center gap-1.5"><span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span> Сортировка</label>
            <select id="mfSort" class="btn-secondary w-full p-3 rounded-xl border border-white/10 bg-[#1e293b] text-white text-xs">
              <option value="new" ${productsFilter.sort === 'new' ? 'selected' : ''}>Новинки</option>
              <option value="price_asc" ${productsFilter.sort === 'price_asc' ? 'selected' : ''}>Цена: по возрастанию</option>
              <option value="price_desc" ${productsFilter.sort === 'price_desc' ? 'selected' : ''}>Цена: по убыванию</option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <button id="mfReset" class="btn-secondary flex-1 py-3 text-xs font-bold rounded-xl border border-white/20">Сбросить</button>
          <button id="mfApply" class="btn-primary flex-1 py-3 text-xs font-bold rounded-xl bg-cyan-500 text-white">Применить</button>
        </div>
      `;

      modal.appendChild(card);
      document.body.appendChild(modal);
      
      requestAnimationFrame(() => {
        card.classList.remove('translate-y-full');
      });
      
      const closeSheet = () => {
        card.classList.add('translate-y-full');
        setTimeout(() => {
          modal.remove();
        }, 300);
      };
      
      card.querySelector('#closeFiltersSheet').onclick = closeSheet;
      modal.addEventListener('click', (e) => { if (e.target === modal) closeSheet(); });
      
      card.querySelector('#mfApply').onclick = () => {
        productsFilter.category = card.querySelector('#mfCategory').value;
        productsFilter.brand = card.querySelector('#mfBrand').value;
        productsFilter.sort = card.querySelector('#mfSort').value;
        productsPage = 1;
        closeSheet();
        renderCurrentScreen();
      };
      
      card.querySelector('#mfReset').onclick = () => {
        productsFilter = { category: 'all', brand: 'all', sort: 'new' };
        productsPage = 1;
        closeSheet();
        renderCurrentScreen();
      };
    };
  }

  // Бесконечная прокрутка
  const sentinel = document.getElementById('catalogSentinel');
  if (sentinel && productsPage < productsTotalPages) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        observer.unobserve(sentinel);
        loadMoreProducts();
      }
    }, { rootMargin: '150px' });
    observer.observe(sentinel);
  }

  // Сердечки (избранное)
  document.querySelectorAll('.wishlist-heart').forEach(heart => {
    heart.onclick = (e) => {
      e.stopPropagation();
      const productId = heart.dataset.productId;
      if (window.toggleProductWishlist) {
        window.toggleProductWishlist(productId, heart);
      }
    };
  });

  // Кнопки "В корзину"
  document.querySelectorAll('.addToCartBtn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const productId = btn.dataset.productId;
      if (productId) addToCart(productId);
    };
  });

 // Кнопки "Заказать" (прямой переход)
document.querySelectorAll('.buyNowBtn').forEach(btn => {
  btn.removeEventListener('click', btn._buyHandler);
  const handler = (e) => {
    e.stopPropagation();
    const url = btn.dataset.url;
    const price = parseFloat(btn.dataset.price);
    if (!url || isNaN(price)) { tgUtil.alert('Ошибка: не удалось получить данные товара'); return; }
    window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
    currentTab = 'neworder'; currentSubScreen = null; appliedPromo = null; renderCurrentScreen();
  };
  btn._buyHandler = handler;
  btn.addEventListener('click', handler);
});

// Клик по карточке — трекинг просмотров и переход к заказу
document.querySelectorAll('#productsGrid .product-card').forEach(card => {
  card.onclick = (e) => {
    if (e.target.closest('.wishlist-heart') || e.target.closest('.addToCartBtn') || e.target.closest('.cart-stepper') || e.target.closest('.buyNowBtn') || e.target.closest('.card-photo-container')) return;
    const productId = card.dataset.productId;
    const buyBtn = card.querySelector('.buyNowBtn');
    const url = buyBtn?.dataset.url;
    const price = parseFloat(buyBtn?.dataset.price);
    if (userId && productId) {
      supabaseClient.from('user_views').upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' }).then(() => {});
    }
    if (url && !isNaN(price)) {
      if (!window.userId) { window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.'); return; }
      window.tempOrder = { url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
      currentTab = 'neworder'; currentSubScreen = null; appliedPromo = null; renderCurrentScreen();
    }
  };
});

  // Назад
  const backBtn = document.getElementById('backFromProductsCatalogBtn');
  if (backBtn) backBtn.onclick = () => { currentSubScreen = null; renderCurrentScreen(); };
}

async function loadMoreProducts() {
  if (isLoadingMoreProducts || productsPage >= productsTotalPages) return;
  isLoadingMoreProducts = true;
  productsPage++;
  try {
    let query = supabaseClient.from('products').select('*').eq('is_active', true);
    if (productsFilter.category !== 'all') query = query.eq('category', productsFilter.category);
    if (productsFilter.brand !== 'all') query = query.eq('brand', productsFilter.brand);
    if (productsFilter.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (productsFilter.sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const from = (productsPage - 1) * 20;
    const { data } = await query.range(from, from + 19);
    const grid = document.getElementById('productsGrid');
    if (grid && data && data.length > 0) {
      data.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.dataset.productId = p.id;
        div.innerHTML = `
          <div class="relative">
            ${renderCardMedia(p.image_url, p.title)}
            <span class="absolute top-0 right-0 wishlist-heart text-xl ${wishlist.has(p.id) ? 'text-red-500' : 'text-white/50'} z-20" data-product-id="${p.id}">${getHeartIcon(wishlist.has(p.id))}</span>
          </div>
          <div class="p-2">
            <p class="text-white font-bold text-sm truncate">${p.title}</p>
            <p class="text-cyan-400 text-xs">${p.price} ${p.currency}</p>
            <p class="text-white/50 text-xs">${p.brand || ''} ${p.category || ''}</p>
            <div class="flex gap-1 mt-2">
              <button class="btn-primary addToCartBtn flex-1 bg-cyan-500/70 hover:" data-product-id="${p.id}">Корзина</button>
              <button class="buyNowBtn flex-1 bg-green-500/70 hover:bg-green-500 py-1 rounded text-xs" data-url="${p.url}" data-price="${p.price}">Заказать</button>
            </div>
          </div>`;
        div.querySelector('.addToCartBtn').onclick = (e) => { e.stopPropagation(); addToCart(p.id); };
        div.querySelector('.buyNowBtn').onclick = (e) => {
          e.stopPropagation();
          if (p.url) { window.tempOrder = { url: p.url, price: p.price, weight: 1, total: window.iceLogixPricing.quickEstimate(p.price, 1), discountAmount: 0, appliedPromo: null }; currentTab = 'neworder'; currentSubScreen = null; appliedPromo = null; renderCurrentScreen(); }
        };
        div.querySelector('.wishlist-heart').onclick = (e) => {
          e.stopPropagation();
          const heart = e.currentTarget;
          if (window.toggleProductWishlist) {
            window.toggleProductWishlist(p.id, heart);
          }
        };
        div.onclick = (e) => {
          if (e.target.closest('.wishlist-heart') || e.target.closest('.addToCartBtn') || e.target.closest('.cart-stepper') || e.target.closest('.buyNowBtn') || e.target.closest('.card-photo-container')) return;
          if (userId) supabaseClient.from('user_views').upsert({ user_id: userId, product_id: p.id }, { onConflict: 'user_id,product_id' }).then(() => {});
          if (p.url) { window.tempOrder = { url: p.url, price: p.price, weight: 1, total: window.iceLogixPricing.quickEstimate(p.price, 1), discountAmount: 0, appliedPromo: null }; currentTab = 'neworder'; currentSubScreen = null; appliedPromo = null; renderCurrentScreen(); }
        };
        grid.appendChild(div);
      });
      initCardSliders();
    }
    // Обновляем sentinel
    const sentinel = document.getElementById('catalogSentinel');
    if (sentinel) {
      if (productsPage < productsTotalPages) {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) { observer.unobserve(sentinel); loadMoreProducts(); }
        }, { rootMargin: '150px' });
        observer.observe(sentinel);
        sentinel.innerHTML = '<p class="text-white/30 text-sm">Загрузка...</p>';
      } else {
        sentinel.innerHTML = '<p class="text-white/30 text-sm">Все товары загружены</p>';
      }
    }
  } catch(e) {
    console.error('Ошибка подгрузки товаров:', e);
    productsPage--;
  } finally {
    isLoadingMoreProducts = false;
  }
}

    // [EXTRACTED MODULE] About & FAQ is loaded from /js/modules/about-faq.js
// ==================== АДМИН: УПРАВЛЕНИЕ ТЕКСТАМИ (ФАЗА 12) ====================
async function renderAdminTexts() {
  let cards = '';
  try {
    const { data, error } = await supabaseClient.from('dynamic_texts').select('*').order('category', { ascending: true }).order('key', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      cards = '<p class="text-white/50 text-center py-4">Список текстов пуст. (Заполните таблицу dynamic_texts)</p>';
    } else {
      let lastCat = null;
      data.forEach(t => {
        if (t.category !== lastCat) {
          cards += `<h3 class="text-cyan-400 font-bold text-sm mt-5 mb-2 uppercase tracking-wide">${_escHtml(t.category)}</h3>`;
          lastCat = t.category;
        }
        const hay = `${t.key} ${t.description || ''} ${t.value || ''}`.toLowerCase();
        cards += `
          <div class="dt-card glass-card mb-3 p-4 border border-white/10" data-search="${_escHtml(hay)}">
            <p class="text-white font-medium text-sm mb-1">${_escHtml(t.description || t.key)}</p>
            <p class="text-white/40 text-[10px] font-mono mb-2">${_escHtml(t.key)}</p>
            <textarea class="dt-value w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white/90 text-xs leading-relaxed" rows="3" data-id="${t.id}">${_escHtml(t.value)}</textarea>
            <button class="dt-save btn-primary w-full mt-2 text-xs py-2" data-id="${t.id}">Сохранить</button>
          </div>`;
      });
    }
    return `
      <button id="backFromTextsBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
      <div class="glass-card page-enter">
        <h2 class="text-xl font-bold mb-1 text-white">Управление текстами</h2>
        <p class="text-white/50 text-xs mb-4">Тексты интерфейса, сообщений бота и рассылок. Изменения применяются в течение минуты.</p>
        <input type="text" id="textsSearchInput" class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white text-sm mb-4" placeholder="Поиск по ключу, описанию или тексту...">
        <div id="textsList">${cards}</div>
      </div>
    `;
  } catch (err) {
    return `<p class="text-red-400">Ошибка загрузки текстов: ${err.message}</p>`;
  }
}

function attachAdminTextsHandlers() {
  const back = document.getElementById('backFromTextsBtn');
  if (back) back.onclick = () => switchTab('admin');

  const search = document.getElementById('textsSearchInput');
  if (search) search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    document.querySelectorAll('#textsList .dt-card').forEach(card => {
      card.style.display = (!q || (card.dataset.search || '').includes(q)) ? '' : 'none';
    });
    document.querySelectorAll('#textsList h3').forEach(h => { h.style.display = q ? 'none' : ''; });
  };

  document.querySelectorAll('.dt-save').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const ta = document.querySelector(`.dt-value[data-id="${id}"]`);
      const value = ta ? ta.value : '';
      const orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Сохранение...';
      try {
        const { error } = await supabaseClient.from('dynamic_texts').update({ value, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        tgUtil.haptic('success');
        btn.textContent = 'Сохранено ✓';
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
      } catch (err) {
        tgUtil.haptic('error');
        btn.textContent = orig; btn.disabled = false;
        tgUtil.alert('Ошибка: ' + err.message);
      }
    };
  });
}

// ==================== АДМИН: УПРАВЛЕНИЕ FAQ (ФАЗА 12) ====================
window._faqAdminItems = [];

async function renderAdminFAQ() {
  return `
    <button id="backFromFaqAdminBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
    <div class="glass-card page-enter">
      <h2 class="text-xl font-bold mb-1 text-white">Управление FAQ</h2>
      <p class="text-white/50 text-xs mb-4">Категории, вопросы и порядок отображения в базе знаний.</p>
      <button id="faqAddToggleBtn" class="btn-primary w-full mb-3 text-sm py-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить вопрос</button>
      <div id="faqCreateForm" class="hidden glass-card mb-4 p-4 border border-green-500/30 space-y-2">
        <input id="faqNewCategory" class="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" placeholder="Категория" list="faqCatList">
        <input id="faqNewQuestion" class="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" placeholder="Вопрос">
        <textarea id="faqNewAnswer" class="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" rows="3" placeholder="Ответ"></textarea>
        <input id="faqNewOrder" type="number" class="w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" placeholder="Порядок" value="0">
        <button id="faqCreateBtn" class="btn-primary w-full text-xs py-2">Создать</button>
      </div>
      <input type="text" id="faqAdminSearch" class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white text-sm mb-4" placeholder="Поиск по вопросу или ответу...">
      <div id="faqAdminList"><p class="text-white/50 text-center py-4">Загрузка...</p></div>
    </div>
  `;
}

function faqAdminItemHtml(item, sameCatItems) {
  const _e = _escHtml;
  const pos = sameCatItems.findIndex(i => i.id === item.id);
  const isFirst = pos === 0, isLast = pos === sameCatItems.length - 1;
  const hay = `${item.category} ${item.question} ${item.answer}`.toLowerCase();
  return `
    <div class="faq-admin-card glass-card mb-2 p-3 border border-white/10" data-id="${item.id}" data-search="${_e(hay)}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <span class="text-[10px] text-cyan-400 font-mono">${_e(item.category)} · #${item.order_index}</span>
          <p class="text-white text-sm font-medium">${_e(item.question)}</p>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button class="faq-up text-white/60 px-1 ${isFirst ? 'opacity-20 pointer-events-none' : ''}" data-id="${item.id}" title="Вверх">▲</button>
          <button class="faq-down text-white/60 px-1 ${isLast ? 'opacity-20 pointer-events-none' : ''}" data-id="${item.id}" title="Вниз">▼</button>
        </div>
      </div>
      <p class="text-white/60 text-xs mt-1">${_e(item.answer)}</p>
      <div class="flex gap-2 mt-2 flex-wrap">
        <button class="faq-edit bg-blue-600/60 px-3 py-1 rounded text-xs" data-id="${item.id}">Изменить</button>
        <button class="faq-pub ${item.is_published ? 'bg-green-600/60' : 'bg-white/10'} px-3 py-1 rounded text-xs" data-id="${item.id}">${item.is_published ? 'Опубликован' : 'Скрыт'}</button>
        <button class="faq-del bg-red-600/60 px-3 py-1 rounded text-xs" data-id="${item.id}">Удалить</button>
      </div>
      <div class="faq-edit-form hidden mt-3 pt-3 border-t border-white/10 space-y-2" data-id="${item.id}">
        <input class="faq-e-cat w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" value="${_e(item.category)}" list="faqCatList">
        <input class="faq-e-q w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" value="${_e(item.question)}">
        <textarea class="faq-e-a w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" rows="3">${_e(item.answer)}</textarea>
        <input class="faq-e-ord w-full bg-white/5 border border-white/15 rounded-lg p-2 text-white text-xs" type="number" value="${item.order_index}">
        <button class="faq-save btn-primary w-full text-xs py-2" data-id="${item.id}">Сохранить</button>
      </div>
    </div>`;
}

function updateFaqCatDatalist() {
  let dl = document.getElementById('faqCatList');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'faqCatList'; document.body.appendChild(dl); }
  const cats = [...new Set((window._faqAdminItems || []).map(i => i.category))];
  dl.innerHTML = cats.map(c => `<option value="${_escHtml(c)}">`).join('');
}

async function reloadFaqAdminList() {
  const list = document.getElementById('faqAdminList');
  if (!list) return;
  try {
    const { data, error } = await supabaseClient.from('faq_items').select('*').order('category', { ascending: true }).order('order_index', { ascending: true });
    if (error) throw error;
    window._faqAdminItems = data || [];
    if (!data || data.length === 0) { list.innerHTML = '<p class="text-white/50 text-center py-4">Вопросов пока нет.</p>'; updateFaqCatDatalist(); return; }
    const byCat = {};
    data.forEach(i => { (byCat[i.category] = byCat[i.category] || []).push(i); });
    let html = '', lastCat = null;
    data.forEach(item => {
      if (item.category !== lastCat) { html += `<h3 class="text-cyan-400 font-bold text-sm mt-4 mb-2">${_escHtml(item.category)}</h3>`; lastCat = item.category; }
      html += faqAdminItemHtml(item, byCat[item.category]);
    });
    list.innerHTML = html;
    updateFaqCatDatalist();
    const s = document.getElementById('faqAdminSearch');
    if (s && s.value) s.dispatchEvent(new Event('input'));
  } catch (err) {
    list.innerHTML = `<p class="text-red-400">Ошибка: ${err.message}</p>`;
  }
}

async function faqSwapOrder(id, dir) {
  const items = window._faqAdminItems || [];
  const cur = items.find(i => i.id === id);
  if (!cur) return;
  const sameCat = items.filter(i => i.category === cur.category).sort((a, b) => a.order_index - b.order_index);
  const pos = sameCat.findIndex(i => i.id === id);
  const target = sameCat[pos + dir];
  if (!target) return;
  try {
    await supabaseClient.from('faq_items').update({ order_index: target.order_index }).eq('id', cur.id);
    await supabaseClient.from('faq_items').update({ order_index: cur.order_index }).eq('id', target.id);
    tgUtil.haptic('light');
    await reloadFaqAdminList();
  } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
}

function attachAdminFAQHandlers() {
  const back = document.getElementById('backFromFaqAdminBtn');
  if (back) back.onclick = () => switchTab('admin');

  const toggle = document.getElementById('faqAddToggleBtn');
  const form = document.getElementById('faqCreateForm');
  if (toggle && form) toggle.onclick = () => form.classList.toggle('hidden');

  const createBtn = document.getElementById('faqCreateBtn');
  if (createBtn) createBtn.onclick = async () => {
    const category = (document.getElementById('faqNewCategory').value || 'Общее').trim();
    const question = document.getElementById('faqNewQuestion').value.trim();
    const answer = document.getElementById('faqNewAnswer').value.trim();
    const order_index = parseInt(document.getElementById('faqNewOrder').value) || 0;
    if (!question || !answer) { tgUtil.alert('Заполните вопрос и ответ'); return; }
    createBtn.disabled = true; createBtn.textContent = 'Создание...';
    try {
      const { error } = await supabaseClient.from('faq_items').insert({ category, question, answer, order_index, is_published: true });
      if (error) throw error;
      tgUtil.haptic('success');
      document.getElementById('faqNewQuestion').value = '';
      document.getElementById('faqNewAnswer').value = '';
      form.classList.add('hidden');
      await reloadFaqAdminList();
    } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    createBtn.disabled = false; createBtn.textContent = 'Создать';
  };

  const search = document.getElementById('faqAdminSearch');
  if (search) search.oninput = () => {
    const q = search.value.trim().toLowerCase();
    document.querySelectorAll('#faqAdminList .faq-admin-card').forEach(c => {
      c.style.display = (!q || (c.dataset.search || '').includes(q)) ? '' : 'none';
    });
    document.querySelectorAll('#faqAdminList h3').forEach(h => { h.style.display = q ? 'none' : ''; });
  };

  const list = document.getElementById('faqAdminList');
  if (list) list.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('faq-edit')) {
      const f = list.querySelector(`.faq-edit-form[data-id="${id}"]`);
      if (f) f.classList.toggle('hidden');
    } else if (btn.classList.contains('faq-save')) {
      const card = btn.closest('.faq-edit-form');
      const category = (card.querySelector('.faq-e-cat').value || 'Общее').trim();
      const question = card.querySelector('.faq-e-q').value.trim();
      const answer = card.querySelector('.faq-e-a').value.trim();
      const order_index = parseInt(card.querySelector('.faq-e-ord').value) || 0;
      if (!question || !answer) { tgUtil.alert('Заполните вопрос и ответ'); return; }
      btn.disabled = true; btn.textContent = 'Сохранение...';
      try {
        const { error } = await supabaseClient.from('faq_items').update({ category, question, answer, order_index }).eq('id', id);
        if (error) throw error;
        tgUtil.haptic('success');
        await reloadFaqAdminList();
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); btn.disabled = false; btn.textContent = 'Сохранить'; }
    } else if (btn.classList.contains('faq-del')) {
      if (!(await tgUtil.confirm('Удалить этот вопрос?'))) return;
      try {
        const { error } = await supabaseClient.from('faq_items').delete().eq('id', id);
        if (error) throw error;
        tgUtil.haptic('success');
        await reloadFaqAdminList();
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    } else if (btn.classList.contains('faq-pub')) {
      const item = (window._faqAdminItems || []).find(i => i.id === id);
      if (!item) return;
      try {
        const { error } = await supabaseClient.from('faq_items').update({ is_published: !item.is_published }).eq('id', id);
        if (error) throw error;
        tgUtil.haptic('light');
        await reloadFaqAdminList();
      } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
    } else if (btn.classList.contains('faq-up') || btn.classList.contains('faq-down')) {
      await faqSwapOrder(id, btn.classList.contains('faq-up') ? -1 : 1);
    }
  };

  reloadFaqAdminList();
}

async function renderAdminSuppliers() {
  try {
    const { data: suppliers, error } = await supabaseClient.from('suppliers').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    let suppliersHtml = '<p class="text-white/50 text-center py-4">Нет поставщиков в базе</p>';
    if (suppliers && suppliers.length > 0) {
      suppliersHtml = suppliers.map(s => `
        <div class="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-white font-bold">${s.name}</p>
              ${s.category ? `<p class="text-cyan-400 text-xs mt-1">Категория: ${s.category}</p>` : ''}
              ${s.wechat_id ? `<p class="text-white/70 text-xs mt-1">WeChat: <span class="font-mono text-cyan-200 bg-black/20 px-1 rounded select-all">${s.wechat_id}</span></p>` : ''}
              ${s.rating ? `<p class="text-yellow-400 text-xs mt-1">Рейтинг: ${'⭐'.repeat(s.rating)}</p>` : ''}
              ${s.link ? `<a href="${s.link}" target="_blank" class="text-blue-400 text-xs hover:underline mt-1 block">Ссылка</a>` : ''}
            </div>
            <button class="deleteSupplierBtn text-red-400 hover:bg-red-500/20 p-1.5 rounded transition" data-id="${s.id}">
              <span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span>
            </button>
          </div>
          ${s.note ? `<div class="mt-2 text-white/50 text-xs p-2 bg-black/20 rounded">${s.note}</div>` : ''}
        </div>
      `).join('');
    }

    return `
      <button onclick="switchTab('admin')" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад в админку</button>
      <div class="glass-card page-enter">
        <h2 class="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> База поставщиков</h2>
        
        <form id="addSupplierForm" class="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
          <h3 class="text-white font-bold text-sm mb-3">Добавить поставщика</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input type="text" id="supName" placeholder="Имя / Название (Обязательно)" required class="btn-secondary p-2 rounded text-xs text-white border border-white/20">
            <input type="text" id="supWechat" placeholder="WeChat ID" class="btn-secondary p-2 rounded text-xs text-white border border-white/20">
            <input type="text" id="supCategory" placeholder="Категория (напр. Обувь)" class="btn-secondary p-2 rounded text-xs text-white border border-white/20">
            <input type="number" id="supRating" placeholder="Рейтинг (0-5)" min="0" max="5" class="btn-secondary p-2 rounded text-xs text-white border border-white/20">
            <input type="url" id="supLink" placeholder="Ссылка (напр. Yupoo)" class="btn-secondary p-2 rounded text-xs text-white border border-white/20 md:col-span-2">
            <textarea id="supNote" placeholder="Заметки" class="btn-secondary p-2 rounded text-xs text-white border border-white/20 md:col-span-2 h-20"></textarea>
          </div>
          <button type="submit" class="btn-primary w-full py-2 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] !bg-emerald-500 hover:!bg-emerald-600 !border-emerald-400">
            ➕ Добавить
          </button>
        </form>

        <div id="suppliersList">
          ${suppliersHtml}
        </div>
      </div>
    `;
  } catch (err) {
    return `<p class="text-red-400 p-4">Ошибка загрузки: ${err.message}</p>`;
  }
}

function attachAdminSuppliersHandlers() {
  const form = document.getElementById('addSupplierForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('supName').value.trim();
      const wechat_id = document.getElementById('supWechat').value.trim();
      const category = document.getElementById('supCategory').value.trim();
      const link = document.getElementById('supLink').value.trim();
      const note = document.getElementById('supNote').value.trim();
      const rating = parseInt(document.getElementById('supRating').value || 0, 10);
      
      if (!name) return tgUtil.alert('Введите имя поставщика');
      
      try {
        const { error } = await supabaseClient.from('suppliers').insert({
          name, wechat_id, category, link, note, rating
        });
        if (error) throw error;
        tgUtil.haptic('success');
        tgUtil.alert('Поставщик добавлен');
        renderCurrentScreen();
      } catch (err) {
        tgUtil.alert('Ошибка: ' + err.message);
      }
    };
  }

  document.querySelectorAll('.deleteSupplierBtn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Точно удалить поставщика?')) return;
      try {
        const { error } = await supabaseClient.from('suppliers').delete().eq('id', btn.dataset.id);
        if (error) throw error;
        tgUtil.haptic('medium');
        renderCurrentScreen();
      } catch (err) {
        tgUtil.alert('Ошибка: ' + err.message);
      }
    };
  });
}

    // ==================== RENDER CURRENT SCREEN ====================
    // ==================== ФАЗА 11: МАРКЕТИНГ (ДРОПЫ / UGC / РЕФ-ДЕРЕВО) ====================

    function _getTzNow(tz) {
      try {
        const s = new Date().toLocaleString('en-US', { timeZone: tz });
        const d = new Date(s);
        if (isNaN(d.getTime())) return new Date();
        return d;
      } catch (e) { return new Date(); }
    }

    window.__dropWindowState = null;

    async function getDropWindowClient() {
      const cfg = { drop_weekday: '6', drop_hour: '20', drop_minute: '0', drop_duration_min: '60', drop_tz: 'Europe/Minsk', drop_enabled: 'true' };
      try {
        const { data } = await supabaseClient.from('settings').select('key, value').in('key', Object.keys(cfg));
        (data || []).forEach(r => { cfg[r.key] = r.value; });
      } catch (e) {}
      const weekdayIso = parseInt(cfg.drop_weekday) || 6;
      const hour = parseInt(cfg.drop_hour) || 20;
      const minute = parseInt(cfg.drop_minute) || 0;
      const duration = parseInt(cfg.drop_duration_min) || 60;
      const tz = (typeof cfg.drop_tz === 'string') ? String(cfg.drop_tz).replace(/"/g, '') : 'Europe/Minsk';
      const enabled = !(String(cfg.drop_enabled).toLowerCase() === 'false');

      const nowTz = _getTzNow(tz);
      let isoDay = nowTz.getDay(); isoDay = (isoDay === 0) ? 7 : isoDay;
      const deltaDays = (weekdayIso - isoDay + 7) % 7;
      const start = new Date(nowTz);
      start.setDate(start.getDate() + deltaDays);
      start.setHours(hour, minute, 0, 0);
      let end = new Date(start.getTime() + duration * 60000);
      if (end < nowTz) {
        start.setDate(start.getDate() + 7);
        end = new Date(start.getTime() + duration * 60000);
      }
      const isOpen = enabled && nowTz >= start && nowTz < end;
      const state = {
        enabled, isOpen, tz, duration,
        msToStart: start - nowTz,
        msToEnd: end - nowTz,
        startWall: start,
        endWall: end
      };
      window.__dropWindowState = state;
      return state;
    }

    function _fmtCountdown(ms) {
      if (ms < 0) ms = 0;
      const total = Math.floor(ms / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const pad = (n) => String(n).padStart(2, '0');
      if (d > 0) return `${d}д ${pad(h)}:${pad(m)}:${pad(s)}`;
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    async function renderDrops() {
      const w = await getDropWindowClient();
      let products = [];
      try {
        const { data } = await supabaseClient.from('products').select('*').eq('is_drop', true).eq('is_active', true).order('created_at', { ascending: false });
        products = data || [];
      } catch (e) {}

      const headerTimer = w.isOpen
        ? `<p class="text-white/70 text-xs uppercase tracking-wider mb-1">Дроп закроется через</p><p id="dropTimer" class="text-4xl font-black text-emerald-400 font-mono">${_fmtCountdown(w.msToEnd)}</p>`
        : `<p class="text-white/70 text-xs uppercase tracking-wider mb-1">До открытия дропа</p><p id="dropTimer" class="text-4xl font-black text-cyan-400 font-mono">${_fmtCountdown(w.msToStart)}</p>`;

      let body = '';
      if (!w.enabled) {
        body = '<div class="glass-card text-center py-8"><p class="text-white/60">Дропы временно отключены.</p></div>';
      } else if (products.length === 0) {
        body = '<div class="glass-card text-center py-8"><p class="text-white/60">Пока нет товаров в дропе. Загляните позже!</p></div>';
      } else if (w.isOpen) {
        const cards = products.map(p => `
          <div class="glass-card overflow-hidden p-0">
            <div class="relative">
              ${p.image_url ? `<img src="${p.image_url}" class="w-full h-40 object-cover">` : '<div class="w-full h-40 bg-white/10"></div>'}
              <span class="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500 text-white">DROP</span>
            </div>
            <div class="p-3">
              <p class="text-white font-bold text-sm truncate">${p.title || ''}</p>
              <p class="text-cyan-400 font-black mt-1">${p.price} ${p.currency || 'CNY'}</p>
              <button class="dropAddCartBtn btn-primary w-full mt-2 text-sm" data-id="${p.id}">Корзина</button>
            </div>
          </div>`).join('');
        body = `
          <div class="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center">
            ⚡ Успей добавить в корзину! Товары из корзины можно оформить и оплатить даже после закрытия дропа.
          </div>
          <div class="grid grid-cols-2 gap-3">${cards}</div>`;
      } else {
        const teaser = products.map(p => `
          <div class="glass-card overflow-hidden p-0 relative">
            <div class="relative">
              ${p.image_url ? `<img src="${p.image_url}" class="w-full h-40 object-cover" style="filter: blur(6px) brightness(0.6);">` : '<div class="w-full h-40 bg-white/10"></div>'}
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="ix text-white/80"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              </div>
            </div>
            <div class="p-3"><p class="text-white/50 font-bold text-sm">Скрыто до старта</p></div>
          </div>`).join('');
        body = `
          <div class="p-3 mb-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs text-center">
            🔒 Раздел откроется только в окно дропа (${w.startWall.toLocaleString('ru-RU', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}, ${w.tz}). Раздел будет активен ${w.duration} мин.
          </div>
          <div class="grid grid-cols-2 gap-3">${teaser}</div>`;
      }

      return `
        <button id="dropsBackBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="text-center py-6 mb-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1)); border: 1px solid rgba(168,85,247,0.3);">
          <h2 class="text-2xl font-black text-white mb-2">🧊 ДРОПЫ</h2>
          ${headerTimer}
        </div>
        ${body}
        ${typeof renderFooter === 'function' ? renderFooter() : ''}
      `;
    }

    function attachDropsHandlers() {
      const back = document.getElementById('dropsBackBtn');
      if (back) back.onclick = () => { currentSubScreen = null; switchTab('home'); };

      if (window.__dropTimerInterval) { clearInterval(window.__dropTimerInterval); window.__dropTimerInterval = null; }
      window.__dropTimerInterval = setInterval(() => {
        if (currentTab !== 'drops') { clearInterval(window.__dropTimerInterval); window.__dropTimerInterval = null; return; }
        const st = window.__dropWindowState;
        const el = document.getElementById('dropTimer');
        if (!st || !el) return;
        st.msToStart -= 1000;
        st.msToEnd -= 1000;
        if (st.isOpen && st.msToEnd <= 0) { renderCurrentScreen(); return; }
        if (!st.isOpen && st.msToStart <= 0) { renderCurrentScreen(); return; }
        el.textContent = st.isOpen ? _fmtCountdown(st.msToEnd) : _fmtCountdown(st.msToStart);
      }, 1000);

      document.querySelectorAll('.dropAddCartBtn').forEach(btn => {
        btn.onclick = async () => {
          const st = window.__dropWindowState;
          if (!st || !st.isOpen) { tgUtil.alert('Окно дропа закрыто.'); return; }
          const id = btn.getAttribute('data-id');
          try {
            await addToCart(id, 1, true);
            tgUtil.haptic && tgUtil.haptic('success');
          } catch (e) { tgUtil.alert('Ошибка: ' + e.message); }
        };
      });
    }

    async function renderUGC() {
      let mine = [];
      try {
        if (userId) {
          const { data } = await supabaseClient.from('ugc_videos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
          mine = data || [];
        }
      } catch (e) {}

      const statusLabel = (s) => s === 'approved' ? '<span class="text-green-400">Одобрено ✅</span>' : s === 'rejected' ? '<span class="text-red-400">Отклонено ❌</span>' : '<span class="text-yellow-400">На модерации ⏳</span>';
      const list = mine.length === 0
        ? '<p class="text-white/50 text-sm text-center py-3">Вы ещё не отправляли распаковок</p>'
        : mine.map(v => `
          <div class="p-3 bg-white/5 rounded-xl mb-2">
            <div class="flex justify-between items-center">
              <span class="text-white/80 text-sm">${new Date(v.created_at).toLocaleDateString('ru-RU')}</span>
              ${statusLabel(v.status)}
            </div>
            ${v.caption ? `<p class="text-white/60 text-xs mt-1">${v.caption}</p>` : ''}
            ${v.status === 'approved' && v.reward_ices ? `<p class="text-green-400 text-xs mt-1">Начислено: ${v.reward_ices} айсов</p>` : ''}
            ${v.status === 'rejected' && v.reject_reason ? `<p class="text-red-400 text-xs mt-1">Причина: ${v.reject_reason}</p>` : ''}
          </div>`).join('');

      return `
        <button id="ugcBackBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="glass-card mb-3">
          <h3 class="text-white font-bold text-lg mb-2">🎬 Распаковка за айсы</h3>
          <p class="text-white/60 text-sm mb-3">Снимите видео-распаковку вашего заказа и получите айсы на баланс после проверки модератором!</p>
          <input type="file" id="ugcFileInput" accept="video/*" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-2 text-sm">
          <textarea id="ugcCaption" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-2" placeholder="Комментарий (необязательно)" rows="2"></textarea>
          <button id="ugcUploadBtn" class="btn-primary w-full">Отправить на модерацию</button>
          <div id="ugcUploadStatus" class="text-center text-sm mt-2"></div>
        </div>
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3">Мои распаковки</h3>
          ${list}
        </div>
        ${typeof renderFooter === 'function' ? renderFooter() : ''}
      `;
    }

    function attachUGCHandlers() {
      const back = document.getElementById('ugcBackBtn');
      if (back) back.onclick = () => { currentSubScreen = null; switchTab('profile'); };
      const btn = document.getElementById('ugcUploadBtn');
      if (!btn) return;
      btn.onclick = async () => {
        const fileInput = document.getElementById('ugcFileInput');
        const statusEl = document.getElementById('ugcUploadStatus');
        if (!userId) { tgUtil.alert('Откройте приложение через Telegram'); return; }
        if (!fileInput || !fileInput.files || !fileInput.files[0]) { tgUtil.alert('Выберите видео-файл'); return; }
        const file = fileInput.files[0];
        if (file.size > 50 * 1024 * 1024) { tgUtil.alert('Видео слишком большое (макс. 50 МБ)'); return; }
        const caption = (document.getElementById('ugcCaption').value || '').trim();
        btn.disabled = true;
        statusEl.innerHTML = '<span class="text-cyan-400">Загрузка...</span>';
        try {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${userId}/${Date.now()}_${safeName}`;
          const { error: upErr } = await supabaseClient.storage.from('ugc').upload(path, file, { contentType: file.type || 'video/mp4', upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabaseClient.storage.from('ugc').getPublicUrl(path);
          const videoUrl = pub.publicUrl;
          const { error: insErr } = await supabaseClient.from('ugc_videos').insert({
            user_id: userId, video_url: videoUrl, video_path: path, caption: caption || null, status: 'pending', forwarded: false
          });
          if (insErr) throw insErr;
          tgUtil.haptic && tgUtil.haptic('success');
          statusEl.innerHTML = '<span class="text-green-400">Отправлено! Ожидайте проверки.</span>';
          setTimeout(() => renderCurrentScreen(), 1200);
        } catch (e) {
          statusEl.innerHTML = `<span class="text-red-400">Ошибка: ${e.message || e}</span>`;
          btn.disabled = false;
        }
      };
    }

    async function renderReferralTree() {
      let tree = [], stats = null;
      try {
        if (userId) {
          const { data: t } = await supabaseClient.rpc('get_referral_tree', { root_id: userId });
          tree = t || [];
          const { data: s } = await supabaseClient.rpc('get_referral_stats', { root_id: userId });
          stats = (s && s[0]) ? s[0] : null;
        }
      } catch (e) {}

      const byLevel = { 1: [], 2: [], 3: [] };
      tree.forEach(n => { if (byLevel[n.level]) byLevel[n.level].push(n); });

      const nodeName = (n) => (n.username ? '@' + n.username : (n.full_name || ('ID ' + n.user_id)));
      const levelMeta = [
        { lvl: 1, color: 'emerald', label: 'Уровень 1 (прямые)' },
        { lvl: 2, color: 'cyan', label: 'Уровень 2' },
        { lvl: 3, color: 'purple', label: 'Уровень 3' }
      ];

      const treeHtml = levelMeta.map(meta => {
        const nodes = byLevel[meta.lvl];
        const inner = nodes.length === 0
          ? '<p class="text-white/40 text-xs">Пока никого</p>'
          : nodes.map(n => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-white/5 mb-1" style="margin-left: ${(meta.lvl - 1) * 16}px;">
              <span class="text-white/80 text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-${meta.color}-400"></span>
                ${nodeName(n)}
              </span>
              <span class="text-white/40 text-xs">пригласил: ${n.direct_count || 0}</span>
            </div>`).join('');
        return `
          <div class="glass-card mb-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-white font-bold text-sm">${meta.label}</h4>
              <span class="text-${meta.color}-400 font-bold">${nodes.length}</span>
            </div>
            ${inner}
          </div>`;
      }).join('');

      const earned = stats || { level1_count: 0, level2_count: 0, level3_count: 0, earned_l1: 0, earned_l2: 0, earned_l3: 0, total_earned: 0 };
      const statsHtml = `
        <div class="glass-card mb-3">
          <h4 class="text-white font-bold text-sm mb-3">💰 Заработано по уровням</h4>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center"><p class="text-emerald-400 text-lg font-black">${(+earned.earned_l1).toFixed(0)}</p><p class="text-white/50 text-[10px]">Ур. 1</p></div>
            <div class="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2 text-center"><p class="text-cyan-400 text-lg font-black">${(+earned.earned_l2).toFixed(0)}</p><p class="text-white/50 text-[10px]">Ур. 2</p></div>
            <div class="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center"><p class="text-purple-400 text-lg font-black">${(+earned.earned_l3).toFixed(0)}</p><p class="text-white/50 text-[10px]">Ур. 3</p></div>
          </div>
          <div class="bg-white/5 rounded-xl p-3 text-center"><p class="text-white/60 text-xs uppercase tracking-wider">Всего заработано</p><p class="text-green-400 text-2xl font-black">${(+earned.total_earned).toFixed(0)} айсов</p></div>
        </div>`;

      return `
        <button id="refTreeBackBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="text-center py-4 mb-3 rounded-2xl" style="background: linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08)); border: 1px solid rgba(52,211,153,0.25);">
          <h2 class="text-xl font-black text-white">🌳 Моя реферальная сеть</h2>
          <p class="text-white/60 text-sm mt-1">${(+earned.level1_count) + (+earned.level2_count) + (+earned.level3_count)} человек в 3 уровнях</p>
        </div>
        ${statsHtml}
        ${treeHtml}
        ${typeof renderFooter === 'function' ? renderFooter() : ''}
      `;
    }

    function attachReferralTreeHandlers() {
      const back = document.getElementById('refTreeBackBtn');
      if (back) back.onclick = () => { currentSubScreen = null; switchTab('profile'); };
    }

    async function renderAdminMarketing() {
      if (!isOwner) return '<p class="text-center mt-10 text-red-400">Доступ запрещён</p>';
      const cfg = { drop_weekday: '6', drop_hour: '20', drop_minute: '0', drop_duration_min: '60', drop_enabled: 'true' };
      try {
        const { data } = await supabaseClient.from('settings').select('key, value').in('key', Object.keys(cfg).concat(['drop_tz']));
        (data || []).forEach(r => { cfg[r.key] = (typeof r.value === 'string') ? String(r.value).replace(/"/g, '') : r.value; });
      } catch (e) {}

      let pending = [];
      try { const { data } = await supabaseClient.from('ugc_videos').select('*').eq('status', 'pending').order('created_at', { ascending: true }); pending = data || []; } catch (e) {}
      let dropProducts = [];
      try { const { data } = await supabaseClient.from('products').select('id, title, is_drop, is_active').order('created_at', { ascending: false }).limit(100); dropProducts = data || []; } catch (e) {}

      const weekdays = [['1', 'Понедельник'], ['2', 'Вторник'], ['3', 'Среда'], ['4', 'Четверг'], ['5', 'Пятница'], ['6', 'Суббота'], ['7', 'Воскресенье']];
      const wdOptions = weekdays.map(([v, l]) => `<option value="${v}" ${String(cfg.drop_weekday) === v ? 'selected' : ''}>${l}</option>`).join('');

      const ugcList = pending.length === 0
        ? '<p class="text-white/50 text-sm text-center py-3">Нет видео на модерации</p>'
        : pending.map(v => `
          <div class="p-3 bg-white/5 rounded-xl mb-3" data-ugc="${v.id}" data-uploader="${v.user_id}">
            <video src="${v.video_url}" controls class="w-full rounded-lg mb-2 max-h-60"></video>
            <p class="text-white/60 text-xs mb-1">От ID: ${v.user_id} · ${new Date(v.created_at).toLocaleString('ru-RU')}</p>
            ${v.caption ? `<p class="text-white/70 text-sm mb-2">${v.caption}</p>` : ''}
            <div class="flex gap-2 items-center">
              <input type="number" class="ugcRewardInput btn-secondary w-24 p-2 rounded-lg border border-white/30" value="100" placeholder="айсы">
              <button class="ugcApproveBtn btn-primary flex-1 text-sm" data-id="${v.id}" data-uploader="${v.user_id}">✅ Одобрить</button>
              <button class="ugcRejectBtn bg-red-600 px-3 py-2 rounded-lg text-sm text-white" data-id="${v.id}">❌</button>
            </div>
          </div>`).join('');

      const dropList = dropProducts.map(p => `
        <div class="flex justify-between items-center p-2 border-b border-white/10">
          <span class="text-white/80 text-sm truncate flex-1">${p.title || ('ID ' + p.id)}</span>
          <button class="toggleDropBtn text-sm px-3 py-1 rounded-lg ${p.is_drop ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}" data-id="${p.id}" data-drop="${p.is_drop ? '1' : '0'}">${p.is_drop ? 'Дроп ✓' : 'Сделать дропом'}</button>
        </div>`).join('');

      return `
        <button id="admMktBackBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="glass-card mb-3">
          <h3 class="text-white font-bold mb-3">🧊 Окно дропов</h3>
          <label class="text-white/60 text-sm">День недели</label>
          <select id="dropWeekday" class="btn-secondary w-full p-2 rounded-lg border border-white/30 mb-2">${wdOptions}</select>
          <div class="grid grid-cols-3 gap-2 mb-2">
            <div><label class="text-white/60 text-xs">Час</label><input type="number" id="dropHour" min="0" max="23" class="btn-secondary w-full p-2 rounded-lg border border-white/30" value="${parseInt(cfg.drop_hour) || 20}"></div>
            <div><label class="text-white/60 text-xs">Минута</label><input type="number" id="dropMinute" min="0" max="59" class="btn-secondary w-full p-2 rounded-lg border border-white/30" value="${parseInt(cfg.drop_minute) || 0}"></div>
            <div><label class="text-white/60 text-xs">Длит. (мин)</label><input type="number" id="dropDuration" min="1" class="btn-secondary w-full p-2 rounded-lg border border-white/30" value="${parseInt(cfg.drop_duration_min) || 60}"></div>
          </div>
          <label class="flex items-center gap-2 text-white/80 mb-3"><input type="checkbox" id="dropEnabled" ${String(cfg.drop_enabled).toLowerCase() !== 'false' ? 'checked' : ''}> Дропы включены (${cfg.drop_tz || 'Europe/Minsk'})</label>
          <button id="saveDropSettingsBtn" class="btn-primary w-full">Сохранить окно дропов</button>
        </div>
        <div class="glass-card mb-3">
          <h3 class="text-white font-bold mb-3">🎬 UGC на модерации (${pending.length})</h3>
          ${ugcList}
        </div>
        <div class="glass-card">
          <h3 class="text-white font-bold mb-3">Товары-дропы</h3>
          <div class="max-h-72 overflow-y-auto">${dropList}</div>
        </div>
      `;
    }

    function attachAdminMarketingHandlers() {
      const back = document.getElementById('admMktBackBtn');
      if (back) back.onclick = () => switchTab('admin');

      const saveBtn = document.getElementById('saveDropSettingsBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const rows = [
            { key: 'drop_weekday', value: String(document.getElementById('dropWeekday').value) },
            { key: 'drop_hour', value: String(parseInt(document.getElementById('dropHour').value) || 20) },
            { key: 'drop_minute', value: String(parseInt(document.getElementById('dropMinute').value) || 0) },
            { key: 'drop_duration_min', value: String(parseInt(document.getElementById('dropDuration').value) || 60) },
            { key: 'drop_enabled', value: document.getElementById('dropEnabled').checked ? 'true' : 'false' }
          ];
          try {
            await supabaseClient.from('settings').upsert(rows, { onConflict: 'key' });
            tgUtil.alert('Окно дропов сохранено');
          } catch (e) { tgUtil.alert('Ошибка: ' + e.message); }
        };
      }

      document.querySelectorAll('.ugcApproveBtn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          const uploader = parseInt(btn.getAttribute('data-uploader'));
          const container = btn.closest('[data-ugc]');
          const reward = parseFloat(container.querySelector('.ugcRewardInput').value) || 0;
          if (!(await tgUtil.confirm(`Начислить ${reward} айсов пользователю ${uploader}?`))) return;
          btn.disabled = true;
          try {
            const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', uploader).single();
            const nb = (parseFloat(u && u.ices_balance) || 0) + reward;
            await supabaseClient.from('users').update({ ices_balance: nb }).eq('user_id', uploader);
            await supabaseClient.from('transaction_history').insert({ user_id: uploader, type: 'ugc_reward', amount: reward, balance_after: nb, description: 'Награда за UGC видео-распаковку' });
            await supabaseClient.from('ugc_videos').update({ status: 'approved', reward_ices: reward, moderated_by: userId, moderated_at: new Date().toISOString() }).eq('id', id);
            if (typeof logAdminAction === 'function') logAdminAction('ugc_approve', { id, reward, uploader });
            tgUtil.alert('Одобрено');
            renderCurrentScreen();
          } catch (e) { tgUtil.alert('Ошибка: ' + e.message); btn.disabled = false; }
        };
      });

      document.querySelectorAll('.ugcRejectBtn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          if (!(await tgUtil.confirm('Отклонить видео?'))) return;
          try {
            await supabaseClient.from('ugc_videos').update({ status: 'rejected', reject_reason: 'Не соответствует требованиям', moderated_by: userId, moderated_at: new Date().toISOString() }).eq('id', id);
            if (typeof logAdminAction === 'function') logAdminAction('ugc_reject', { id });
            tgUtil.alert('Отклонено');
            renderCurrentScreen();
          } catch (e) { tgUtil.alert('Ошибка: ' + e.message); }
        };
      });

      document.querySelectorAll('.toggleDropBtn').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.getAttribute('data-id');
          const next = btn.getAttribute('data-drop') !== '1';
          try {
            await supabaseClient.from('products').update({ is_drop: next }).eq('id', id);
            renderCurrentScreen();
          } catch (e) { tgUtil.alert('Ошибка: ' + e.message); }
        };
      });
    }


// Global Exports
if (typeof renderAdminReviewsConfig === 'function') window.renderAdminReviewsConfig = renderAdminReviewsConfig;
if (typeof attachAdminReviewsConfigHandlers === 'function') window.attachAdminReviewsConfigHandlers = attachAdminReviewsConfigHandlers;
if (typeof preloadAdminData === 'function') window.preloadAdminData = preloadAdminData;
if (typeof renderAdminUsersList === 'function') window.renderAdminUsersList = renderAdminUsersList;
if (typeof renderMarketplacesAdminList === 'function') window.renderMarketplacesAdminList = renderMarketplacesAdminList;
if (typeof renderPromotionsAdminList === 'function') window.renderPromotionsAdminList = renderPromotionsAdminList;
if (typeof logAdminAction === 'function') window.logAdminAction = logAdminAction;
if (typeof downloadCSV === 'function') window.downloadCSV = downloadCSV;
if (typeof renderAdminClaimsList === 'function') window.renderAdminClaimsList = renderAdminClaimsList;
if (typeof renderAdminLegitChecksList === 'function') window.renderAdminLegitChecksList = renderAdminLegitChecksList;
if (typeof renderAdmin2FA === 'function') window.renderAdmin2FA = renderAdmin2FA;
if (typeof attachAdmin2FAHandlers === 'function') window.attachAdmin2FAHandlers = attachAdmin2FAHandlers;
if (typeof _restoreBodyScroll === 'function') window._restoreBodyScroll = _restoreBodyScroll;
if (typeof checkPin === 'function') window.checkPin = checkPin;
if (typeof updateDots === 'function') window.updateDots = updateDots;
if (typeof renderAdmin === 'function') window.renderAdmin = renderAdmin;
if (typeof attachAdminHandlers === 'function') window.attachAdminHandlers = attachAdminHandlers;
if (typeof renderAddPhotos === 'function') window.renderAddPhotos = renderAddPhotos;
if (typeof renderEditPhotos === 'function') window.renderEditPhotos = renderEditPhotos;
if (typeof openMarketplaceForm === 'function') window.openMarketplaceForm = openMarketplaceForm;
if (typeof attachAnalyticsHandlers === 'function') window.attachAnalyticsHandlers = attachAnalyticsHandlers;
if (typeof openPromotionForm === 'function') window.openPromotionForm = openPromotionForm;
if (typeof updateOrderStatus === 'function') window.updateOrderStatus = updateOrderStatus;
if (typeof sendNotification === 'function') window.sendNotification = sendNotification;
if (typeof getStatusText === 'function') window.getStatusText = getStatusText;
if (typeof getStatusClass === 'function') window.getStatusClass = getStatusClass;
if (typeof ensureBackButton === 'function') window.ensureBackButton = ensureBackButton;
if (typeof generateAdminOrderCard === 'function') window.generateAdminOrderCard = generateAdminOrderCard;
if (typeof renderAdminOrdersList === 'function') window.renderAdminOrdersList = renderAdminOrdersList;
if (typeof renderProductsCatalog === 'function') window.renderProductsCatalog = renderProductsCatalog;
if (typeof attachProductsCatalogHandlers === 'function') window.attachProductsCatalogHandlers = attachProductsCatalogHandlers;
if (typeof loadMoreProducts === 'function') window.loadMoreProducts = loadMoreProducts;
if (typeof renderAdminTexts === 'function') window.renderAdminTexts = renderAdminTexts;
if (typeof attachAdminTextsHandlers === 'function') window.attachAdminTextsHandlers = attachAdminTextsHandlers;
if (typeof renderAdminFAQ === 'function') window.renderAdminFAQ = renderAdminFAQ;
if (typeof faqAdminItemHtml === 'function') window.faqAdminItemHtml = faqAdminItemHtml;
if (typeof updateFaqCatDatalist === 'function') window.updateFaqCatDatalist = updateFaqCatDatalist;
if (typeof reloadFaqAdminList === 'function') window.reloadFaqAdminList = reloadFaqAdminList;
if (typeof faqSwapOrder === 'function') window.faqSwapOrder = faqSwapOrder;
if (typeof attachAdminFAQHandlers === 'function') window.attachAdminFAQHandlers = attachAdminFAQHandlers;
if (typeof renderAdminSuppliers === 'function') window.renderAdminSuppliers = renderAdminSuppliers;
if (typeof attachAdminSuppliersHandlers === 'function') window.attachAdminSuppliersHandlers = attachAdminSuppliersHandlers;
if (typeof _getTzNow === 'function') window._getTzNow = _getTzNow;
if (typeof getDropWindowClient === 'function') window.getDropWindowClient = getDropWindowClient;
if (typeof _fmtCountdown === 'function') window._fmtCountdown = _fmtCountdown;
if (typeof renderDrops === 'function') window.renderDrops = renderDrops;
if (typeof attachDropsHandlers === 'function') window.attachDropsHandlers = attachDropsHandlers;
if (typeof renderUGC === 'function') window.renderUGC = renderUGC;
if (typeof attachUGCHandlers === 'function') window.attachUGCHandlers = attachUGCHandlers;
if (typeof renderReferralTree === 'function') window.renderReferralTree = renderReferralTree;
if (typeof attachReferralTreeHandlers === 'function') window.attachReferralTreeHandlers = attachReferralTreeHandlers;
if (typeof renderAdminMarketing === 'function') window.renderAdminMarketing = renderAdminMarketing;
if (typeof attachAdminMarketingHandlers === 'function') window.attachAdminMarketingHandlers = attachAdminMarketingHandlers;
