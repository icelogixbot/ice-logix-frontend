// ============================================================
// ICE LOGIX Module: Admin Analytics, CRM & Resale Moderation
// ============================================================
async function renderAdminResale() {
  if (!userId) return '';
  const { data: userData } = await supabaseClient.from('users').select('role').eq('user_id', userId).single();
  if (!userData || !['admin', 'owner'].includes(userData.role)) return '<p class="text-center mt-10 text-red-400">Доступ запрещен</p>';
  
  window.approveResale = async (id) => {
    try {
      await supabaseClient.from('resale_items').update({ status: 'approved' }).eq('id', id);
      glassToast('Одобрено');
      switchTab('admin_resale');
    } catch(e) {}
  };
  
  window.rejectResale = async (id) => {
    try {
      await supabaseClient.from('resale_items').update({ status: 'rejected' }).eq('id', id);
      glassToast('Отклонено');
      switchTab('admin_resale');
    } catch(e) {}
  };

  try {
    const { data, error } = await supabaseClient.from('resale_items').select('*, users(username)').eq('status', 'pending');
    if (error) throw error;

    if (data && data.length > 0) {
      const orderIds = data.map(d => d.order_id).filter(Boolean);
      if (orderIds.length > 0) {
        try {
          const { data: ordersData, error: ordersError } = await supabaseClient.from('orders').select('*').in('id', orderIds);
          if (!ordersError && ordersData) {
            const ordersMap = new Map(ordersData.map(o => [o.id, o]));
            data.forEach(item => {
              item.orders = ordersMap.get(item.order_id) || null;
            });
          }
        } catch (orderErr) {
          console.error('Ошибка загрузки связанных заказов:', orderErr);
        }
      }
    }
    
    let html = `
      <div class="flex items-center gap-3 mb-6">
        <button class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onclick="switchTab('admin')">
          <span class="ix text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span>
        </button>
        <h2 class="text-xl font-bold text-white">Модерация Пристроя</h2>
      </div>
    `;
    
    if (!data || data.length === 0) {
      html += '<p class="text-white/50 text-center">Нет новых заявок</p>';
    } else {
      html += '<div class="space-y-3">';
      html += data.map(item => {
        const images = getResaleImages(item);
        const firstImg = images[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';
        return `
          <div class="glass-card p-3 flex gap-3">
            <div style="width: 80px; height: 80px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: var(--glass-bg);">
              <img src="${firstImg}" class="w-full h-full object-cover cursor-zoom-in" onclick="window.showImagePreview(${JSON.stringify(images)})">
            </div>
            <div class="flex-1">
              <p class="font-bold text-sm text-white">${item.title}</p>
              <p class="text-xs text-white/70 mb-1">От: @${item.users?.username || item.user_id}</p>
              <p class="text-xs text-white/70 mb-2">Цена: ${item.price_byn} BYN</p>
              <p class="text-xs text-white/50 italic mb-3">"${item.description}"</p>
              <div class="flex gap-2">
                <button class="btn-primary flex-1 bg-green-500/20 text-green-400 text-xs" onclick="approveResale('${item.id}')">Одобрить</button>
                <button class="btn-primary flex-1 bg-red-500/20 text-red-400 text-xs" onclick="rejectResale('${item.id}')">Отклонить</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      html += '</div>';
    }
    return html;
  } catch(e) { return `<p class="text-red-400">Ошибка</p>`; }
}

// ==================== ФАЗА 15: CRM / RFM ====================

const CRM_SEGMENTS = {
  'VIP':         { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  icon: '⭐️' },
  'Постоянный':  { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.35)',  icon: '🔁' },
  'Новичок':     { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)',  icon: '🌱' },
  'Активный':    { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.35)',  icon: '✅' },
  'Спящий':      { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.35)', icon: '😴' },
  'Потерянный':  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)', icon: '💤' },
};

function computeRFMSegment(recencyDays, frequency, monetary) {
  if (frequency === 0 && recencyDays <= 14) return 'Новичок';
  if (monetary >= 1000 && recencyDays <= 60) return 'VIP';
  if (frequency >= 2 && recencyDays <= 45) return 'Постоянный';
  if (recencyDays > 60) return 'Потерянный';
  if (recencyDays > 30 && frequency >= 1) return 'Спящий';
  return 'Активный';
}

async function renderAdminCRM() {
  if (!userId) return '';
  const { data: userData } = await supabaseClient.from('users').select('role').eq('user_id', userId).single();
  if (!userData || !['admin', 'owner'].includes(userData.role)) return '<p class="text-center mt-10 text-red-400">Доступ запрещен</p>';

  return `
    <div class="flex items-center gap-3 mb-6">
      <button class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onclick="switchTab('admin')">
        <span class="ix text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span>
      </button>
      <h2 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">CRM и Сегменты</h2>
    </div>

    <div id="crmSegments" class="grid grid-cols-3 gap-2 mb-5">
      <div class="col-span-3 text-center text-white/40 text-sm py-6">Загрузка...</div>
    </div>

    <div class="glass-card p-4 mb-4 border border-white/5 rounded-2xl flex items-center justify-between">
      <div><p class="text-[10px] text-white/50 uppercase tracking-wider font-bold">Средний LTV клиента</p><p class="text-xl font-black text-amber-400" id="crmAvgLtv">—</p></div>
      <div class="text-right"><p class="text-[10px] text-white/50 uppercase tracking-wider font-bold">Активная база</p><p class="text-xl font-black text-white" id="crmActiveBase">—</p></div>
    </div>

    <div class="flex gap-2 mb-3 overflow-x-auto pb-1" id="crmFilters"></div>

    <div id="crmUserList" class="space-y-2"></div>
  `;
}

window.attachAdminCRMHandlers = async () => {
  const listEl = document.getElementById('crmUserList');
  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('user_id, full_name, username, created_at, total_spent, orders_count, last_activity_date, role')
      .order('total_spent', { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;

    const now = Date.now();
    const clients = (users || [])
      .filter(u => !u.role || !['admin', 'owner'].includes(u.role))
      .map(u => {
        const monetary = parseFloat(u.total_spent) || 0;
        const frequency = parseInt(u.orders_count) || 0;
        const lastRaw = u.last_activity_date || u.created_at;
        const lastTs = lastRaw ? new Date(lastRaw).getTime() : now;
        const recencyDays = Math.max(0, Math.floor((now - lastTs) / 86400000));
        return {
          ...u,
          monetary, frequency, recencyDays,
          segment: computeRFMSegment(recencyDays, frequency, monetary),
        };
      });

    // Сводка по сегментам
    const counts = {};
    Object.keys(CRM_SEGMENTS).forEach(s => counts[s] = 0);
    let totalSpent = 0, buyers = 0, active = 0;
    clients.forEach(c => {
      counts[c.segment] = (counts[c.segment] || 0) + 1;
      if (c.frequency > 0) { totalSpent += c.monetary; buyers++; }
      if (c.recencyDays <= 30) active++;
    });

    const segEl = document.getElementById('crmSegments');
    if (segEl) {
      segEl.className = 'grid grid-cols-3 gap-2 mb-5';
      segEl.innerHTML = Object.entries(CRM_SEGMENTS).map(([name, s]) => `
        <div class="p-3 rounded-2xl border text-center" style="background:${s.bg};border-color:${s.border}">
          <div class="text-lg mb-0.5">${s.icon}</div>
          <p class="text-2xl font-black" style="color:${s.color}">${counts[name] || 0}</p>
          <p class="text-[9px] uppercase tracking-wider font-bold" style="color:${s.color}">${name}</p>
        </div>
      `).join('');
    }

    const ltvEl = document.getElementById('crmAvgLtv');
    if (ltvEl) ltvEl.innerText = (buyers ? (totalSpent / buyers) : 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' BYN';
    const baseEl = document.getElementById('crmActiveBase');
    if (baseEl) baseEl.innerText = active + ' / ' + clients.length;

    // Фильтры по сегментам
    const filtersEl = document.getElementById('crmFilters');
    let activeFilter = 'Все';
    const renderList = (filter) => {
      const rows = filter === 'Все' ? clients : clients.filter(c => c.segment === filter);
      if (!rows.length) { listEl.innerHTML = '<p class="text-white/40 text-sm text-center py-6">Нет клиентов в сегменте</p>'; return; }
      listEl.innerHTML = rows.slice(0, 100).map(c => {
        const s = CRM_SEGMENTS[c.segment];
        const name = c.full_name || (c.username ? '@' + c.username : 'ID ' + c.user_id);
        return `
          <div class="glass-card p-3 rounded-2xl border border-white/5 flex items-center justify-between">
            <div class="min-w-0">
              <p class="text-white text-sm font-bold truncate">${name}</p>
              <p class="text-white/40 text-[11px]">${c.frequency} зак. · посл. ${c.recencyDays} дн. назад</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-white font-bold text-sm">${c.monetary.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} BYN</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background:${s.bg};color:${s.color}">${s.icon} ${c.segment}</span>
            </div>
          </div>
        `;
      }).join('');
    };

    if (filtersEl) {
      const filterNames = ['Все', ...Object.keys(CRM_SEGMENTS)];
      filtersEl.innerHTML = filterNames.map(n =>
        `<button data-filter="${n}" class="crm-filter-btn px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-white/10 ${n === 'Все' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60'}">${n}${n !== 'Все' ? ` (${counts[n] || 0})` : ''}</button>`
      ).join('');
      filtersEl.querySelectorAll('.crm-filter-btn').forEach(btn => {
        btn.onclick = () => {
          activeFilter = btn.getAttribute('data-filter');
          filtersEl.querySelectorAll('.crm-filter-btn').forEach(b => { b.className = b.className.replace('bg-white/15 text-white', 'bg-white/5 text-white/60'); });
          btn.className = btn.className.replace('bg-white/5 text-white/60', 'bg-white/15 text-white');
          renderList(activeFilter);
        };
      });
    }
    renderList('Все');
  } catch (e) {
    console.error('CRM error:', e);
    if (listEl) listEl.innerHTML = `<p class="text-red-400 text-sm text-center py-6">Ошибка загрузки: ${e.message}</p>`;
  }
};
// Авто-открытие формы отзыва по deep-link review_<action_id>
function openReviewForm(actionIdOrOrderId) {
  switchTab('reviews');
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const btn = document.getElementById('hubLeaveReviewBtn') || document.getElementById('feedLeaveReviewBtn') || document.getElementById('leaveReviewBtn');
    if (btn) {
      clearInterval(timer);
      openReviewActionModal(actionIdOrOrderId);
    } else if (tries > 25) {
      clearInterval(timer);
    }
  }, 200);
}

// ==================== ФАЗА 19: AI АНАЛИТИКА ====================
async function renderAdminAnalytics() {
  if (!userId) return '';
  const { data: userData } = await supabaseClient.from('users').select('role').eq('user_id', userId).single();
  if (!userData || !['admin', 'owner'].includes(userData.role)) return '<p class="text-center mt-10 text-red-400">Доступ запрещен</p>';
  
  return `
    <div class="flex items-center gap-3 mb-6">
      <button class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onclick="switchTab('admin')">
        <span class="ix text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span>
      </button>
      <h2 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">AI Аналитика</h2>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="relative overflow-hidden p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-slate-900 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span></div>
        <p class="text-[10px] text-cyan-400/80 mb-1 uppercase tracking-wider font-bold">Оборот (BYN)</p>
        <p class="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" id="stat-revenue">0</p>
      </div>
      <div class="relative overflow-hidden p-4 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-slate-900 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-green-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></span></div>
        <p class="text-[10px] text-green-400/80 mb-1 uppercase tracking-wider font-bold">Чистая прибыль (BYN)</p>
        <p class="text-2xl font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" id="stat-profit">0</p>
        <p class="text-[9px] text-green-400/50 mt-1">15% от стоимости товаров</p>
      </div>
      <div class="relative overflow-hidden p-4 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-slate-900 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-violet-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></div>
        <p class="text-[10px] text-violet-400/80 mb-1 uppercase tracking-wider font-bold">Пользователи</p>
        <p class="text-2xl font-black text-white" id="stat-users">0</p>
      </div>
      <div class="relative overflow-hidden p-4 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-slate-900 shadow-[0_0_20px_rgba(236,72,153,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-pink-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span></div>
        <p class="text-[10px] text-pink-400/80 mb-1 uppercase tracking-wider font-bold">Заказов в работе</p>
        <p class="text-2xl font-black text-white" id="stat-active">0</p>
      </div>
      <div class="relative overflow-hidden p-4 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-sky-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></span></div>
        <p class="text-[10px] text-sky-400/80 mb-1 uppercase tracking-wider font-bold">Новые за 30 дней</p>
        <p class="text-2xl font-black text-white" id="stat-new-users">0</p>
      </div>
      <div class="relative overflow-hidden p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
        <div class="absolute top-0 right-0 p-2 opacity-20"><span class="ix text-5xl text-amber-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span></div>
        <p class="text-[10px] text-amber-400/80 mb-1 uppercase tracking-wider font-bold">Конверсия в сделку</p>
        <p class="text-2xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" id="stat-conversion">0%</p>
        <p class="text-[9px] text-amber-400/50 mt-1">Доставлено / всего заказов</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="glass-card p-5 mb-5 border border-white/5 rounded-3xl">
      <h3 class="text-white font-bold mb-1 text-sm">Динамика Выручки и Прибыли</h3>
      <p class="text-[10px] text-white/50 mb-4">Данные за последние 30 дней</p>
      <div class="relative w-full h-56">
        <canvas id="financialChart"></canvas>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
      <div class="glass-card p-5 border border-white/5 rounded-3xl">
        <h3 class="text-white font-bold mb-4 text-sm text-center">Распределение по странам</h3>
        <div class="relative w-full h-48">
          <canvas id="countryChart"></canvas>
        </div>
      </div>
      <div class="glass-card p-5 border border-white/5 rounded-3xl">
        <h3 class="text-white font-bold mb-4 text-sm text-center">Статусы заказов</h3>
        <div class="relative w-full h-48">
          <canvas id="statusChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Тепловая карта заказов РБ -->
    <div class="glass-card p-5 mb-5 border border-white/5 rounded-3xl">
      <h3 class="text-white font-bold mb-1 text-sm">Тепловая карта заказов РБ</h3>
      <p class="text-[10px] text-white/50 mb-3">Распределение по областям (поле получения)</p>
      <div class="flex flex-col md:flex-row items-center gap-4">
        <div class="relative w-full max-w-[360px] mx-auto">
          <svg viewBox="0 0 400 340" class="w-full h-auto drop-shadow-[0_0_25px_rgba(34,211,238,0.15)]">
            <g stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round">
              <path id="hm-vitebsk" d="M150,20 L260,30 L300,90 L210,110 L150,80 Z" fill="#1e293b"/>
              <path id="hm-grodno"  d="M40,110 L150,80 L160,150 L90,190 L30,150 Z" fill="#1e293b"/>
              <path id="hm-minsk"   d="M150,80 L210,110 L230,170 L160,200 L160,150 Z" fill="#1e293b"/>
              <path id="hm-mogilev" d="M210,110 L300,90 L340,160 L290,210 L230,170 Z" fill="#1e293b"/>
              <path id="hm-brest"   d="M30,150 L90,190 L160,200 L150,280 L60,250 Z" fill="#1e293b"/>
              <path id="hm-gomel"   d="M160,200 L230,170 L290,210 L300,290 L200,300 L150,280 Z" fill="#1e293b"/>
            </g>
            <g font-family="Nunito, sans-serif" text-anchor="middle" pointer-events="none">
              <text x="215" y="62" fill="#fff" font-size="11" font-weight="700">Витебск</text><text id="hmt-vitebsk" x="215" y="78" fill="#fff" font-size="13" font-weight="900">0%</text>
              <text x="92" y="128" fill="#fff" font-size="11" font-weight="700">Гродно</text><text id="hmt-grodno" x="92" y="144" fill="#fff" font-size="13" font-weight="900">0%</text>
              <text x="185" y="148" fill="#fff" font-size="11" font-weight="700">Минск</text><text id="hmt-minsk" x="185" y="164" fill="#fff" font-size="13" font-weight="900">0%</text>
              <text x="278" y="152" fill="#fff" font-size="11" font-weight="700">Могилёв</text><text id="hmt-mogilev" x="278" y="168" fill="#fff" font-size="13" font-weight="900">0%</text>
              <text x="92" y="222" fill="#fff" font-size="11" font-weight="700">Брест</text><text id="hmt-brest" x="92" y="238" fill="#fff" font-size="13" font-weight="900">0%</text>
              <text x="228" y="250" fill="#fff" font-size="11" font-weight="700">Гомель</text><text id="hmt-gomel" x="228" y="266" fill="#fff" font-size="13" font-weight="900">0%</text>
            </g>
          </svg>
        </div>
        <div id="heatmapLegend" class="w-full md:w-48 space-y-1.5"></div>
      </div>
    </div>

    <!-- Учет расходов (Expense Tracker) -->
    <div class="glass-card p-5 mb-5 border border-white/5 rounded-3xl">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white font-bold text-sm">Учет расходов (Трекер)</h3>
        <button id="addExpenseBtn" class="bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/30 transition">+ Расход</button>
      </div>
      <div id="expensesList" class="space-y-2 max-h-48 overflow-y-auto pr-2">
        <!-- Расходы будут здесь -->
      </div>
    </div>
  `;
}

window.attachAdminAnalyticsHandlers = async () => {
  try {
    const { data: orders, error: oErr } = await supabaseClient.from('orders').select('*').neq('status', 'cancelled');
    if (oErr) throw oErr;
    
    const { count: usersCount, error: uErr } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
    if (uErr) throw uErr;

    const since30 = new Date(); since30.setDate(since30.getDate() - 30);
    const { count: newUsersCount } = await supabaseClient.from('users').select('*', { count: 'exact', head: true }).gte('created_at', since30.toISOString());
    let deliveredCount = 0;

    let totalRevenue = 0;
    let totalProfit = 0;
    let activeCount = 0;
    
    const statusCounts = {};
    const countryCounts = { 'Китай': 0, 'Европа': 0, 'Россия': 0 };
    const revenueByDay = {};
    const profitByDay = {};
    const today = new Date();
    
    // Initialize last 30 days
    for(let i=29; i>=0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueByDay[dateStr] = 0;
      profitByDay[dateStr] = 0;
    }
    
    orders.forEach(order => {
      const totalByn = parseFloat(order.total_byn) || 0;
      const priceByn = parseFloat(order.price_byn) || 0;
      const orderProfit = priceByn * 0.15; // Чистая прибыль 15% от товара
      
      totalRevenue += totalByn;
      totalProfit += orderProfit;
      
      if (order.status !== 'delivered' && order.status !== 'cancelled') {
        activeCount++;
      }
      if (order.status === 'delivered') deliveredCount++;

      // География (Страна)
      if (order.source_country === 'CN') countryCounts['Китай']++;
      else if (order.source_country === 'PL' || order.source_country === 'EU') countryCounts['Европа']++;
      else if (order.source_country === 'RU') countryCounts['Россия']++;
      
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      
      if (order.created_at) {
        const dateStr = order.created_at.split('T')[0];
        if (revenueByDay[dateStr] !== undefined) {
          revenueByDay[dateStr] += totalByn;
          profitByDay[dateStr] += orderProfit;
        }
      }
    });

    let expenses = [];
    try {
      const { data: expData } = await supabaseClient.from('expenses').select('*').order('created_at', { ascending: false });
      if (expData) expenses = expData;
    } catch(e) {
      console.warn('Таблица expenses не найдена');
    }
    
    let totalExpenses = 0;
    expenses.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        totalExpenses += amt;
        const dateStr = e.created_at.split('T')[0];
        if (profitByDay[dateStr] !== undefined) {
           profitByDay[dateStr] -= amt;
        }
    });
    
    totalProfit -= totalExpenses;
    
    const revEl = document.getElementById('stat-revenue');
    if(revEl) revEl.innerText = totalRevenue.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
    
    const profEl = document.getElementById('stat-profit');
    if(profEl) profEl.innerText = totalProfit.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
    
    const actEl = document.getElementById('stat-active');
    if(actEl) actEl.innerText = activeCount;
    
    const usrEl = document.getElementById('stat-users');
    if(usrEl) usrEl.innerText = usersCount || 0;

    const newUsrEl = document.getElementById('stat-new-users');
    if(newUsrEl) newUsrEl.innerText = newUsersCount || 0;

    const convEl = document.getElementById('stat-conversion');
    if(convEl) {
      const conv = orders.length ? (deliveredCount / orders.length * 100) : 0;
      convEl.innerText = conv.toFixed(1) + '%';
    }
    
    // Рендер списка расходов
    const expensesList = document.getElementById('expensesList');
    if (expensesList) {
        if (expenses.length === 0) {
            expensesList.innerHTML = '<p class="text-white/50 text-xs text-center py-2">Расходов пока нет</p>';
        } else {
            expensesList.innerHTML = expenses.map(e => `
                <div class="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                    <div>
                        <p class="text-white text-sm font-bold">${e.category} <span class="text-white/40 text-[10px] ml-1 font-normal">${new Date(e.created_at).toLocaleDateString('ru-RU')}</span></p>
                        <p class="text-white/60 text-xs">${e.description || ''}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-red-400 font-bold text-sm">-${e.amount} BYN</span>
                        <button class="deleteExpenseBtn text-white/30 hover:text-red-400 transition" data-id="${e.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span></button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        addExpenseBtn.onclick = () => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
            modal.innerHTML = `
                <div class="glass-card max-w-sm w-full">
                    <h3 class="text-white font-bold mb-4">Добавить расход</h3>
                    <input type="number" id="expAmount" class="btn-secondary w-full p-3 rounded-xl mb-3" placeholder="Сумма (BYN)">
                    <select id="expCategory" class="btn-secondary w-full p-3 rounded-xl mb-3">
                        <option value="Аренда">Аренда</option>
                        <option value="Зарплата">Зарплата</option>
                        <option value="Реклама">Реклама</option>
                        <option value="Упаковка">Упаковка</option>
                        <option value="Логистика">Логистика</option>
                        <option value="Прочее">Прочее</option>
                    </select>
                    <input type="text" id="expDesc" class="btn-secondary w-full p-3 rounded-xl mb-4" placeholder="Комментарий (опционально)">
                    <div class="flex gap-2">
                        <button id="saveExpBtn" class="bg-red-500/20 text-red-400 px-4 py-3 rounded-xl flex-1 font-bold">Сохранить</button>
                        <button id="cancelExpBtn" class="bg-white/10 text-white px-4 py-3 rounded-xl flex-1">Отмена</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#cancelExpBtn').onclick = () => modal.remove();
            modal.querySelector('#saveExpBtn').onclick = async () => {
                const amount = parseFloat(modal.querySelector('#expAmount').value);
                const category = modal.querySelector('#expCategory').value;
                const desc = modal.querySelector('#expDesc').value.trim();
                
                if (!amount || amount <= 0) { tgUtil.alert('Введите корректную сумму'); return; }
                
                try {
                    const { error } = await supabaseClient.from('expenses').insert({ amount, category, description: desc, created_at: new Date().toISOString() });
                    if (error) throw error;
                    modal.remove();
                    renderCurrentScreen();
                } catch(e) {
                    if (e.message && e.message.includes('relation "expenses" does not exist')) {
                        tgUtil.alert('Сначала создайте таблицу expenses в Supabase!');
                    } else {
                        tgUtil.alert('Ошибка: ' + (e.message || 'Сбой базы'));
                    }
                }
            };
        };
    }
    
    document.querySelectorAll('.deleteExpenseBtn').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('Удалить расход?')) {
                await supabaseClient.from('expenses').delete().eq('id', btn.getAttribute('data-id'));
                renderCurrentScreen();
            }
        };
    });
    
    // Configs for Chart.js
    Chart.defaults.color = 'rgba(255,255,255,0.5)';
    Chart.defaults.font.family = 'Nunito, sans-serif';
    
    // Financial Chart (Dual Line)
    const ctxFin = document.getElementById('financialChart');
    if (ctxFin && window.Chart) {
      new Chart(ctxFin, {
        type: 'line',
        data: {
          labels: Object.keys(revenueByDay).map(d => d.slice(5)), // MM-DD
          datasets: [
            {
              label: 'Выручка',
              data: Object.values(revenueByDay),
              borderColor: 'rgba(34,211,238, 1)',
              backgroundColor: 'rgba(34,211,238, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              yAxisID: 'y'
            },
            {
              label: 'Чистая прибыль',
              data: Object.values(profitByDay),
              borderColor: 'rgba(74,222,128, 1)',
              backgroundColor: 'rgba(74,222,128, 0.2)',
              borderWidth: 3,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { 
            legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true } },
            tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#22d3ee', padding: 10, cornerRadius: 10, borderColor: 'rgba(34,211,238,0.2)', borderWidth: 1 }
          },
          scales: {
            x: { grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' } },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
          }
        }
      });
    }
    
    // Country Chart (Doughnut)
    const ctxCountry = document.getElementById('countryChart');
    if (ctxCountry && window.Chart) {
      new Chart(ctxCountry, {
        type: 'doughnut',
        data: {
          labels: Object.keys(countryCounts),
          datasets: [{
            data: Object.values(countryCounts),
            backgroundColor: [
              'rgba(239,68,68, 0.8)',   // Red - China
              'rgba(59,130,246, 0.8)',  // Blue - EU
              'rgba(249,115,22, 0.8)'   // Orange - RU
            ],
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, padding: 15 } }
          }
        }
      });
    }

    // Status Chart (Polar Area / Doughnut)
    const ctxStatus = document.getElementById('statusChart');
    if (ctxStatus && window.Chart) {
      new Chart(ctxStatus, {
        type: 'pie',
        data: {
          labels: Object.keys(statusCounts).map(s => (window.getStatusText ? window.getStatusText(s) : s).replace(/[^\w\u0400-\u04FF\s()]/gi, '').trim()),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
              'rgba(34,211,238, 0.8)',
              'rgba(167,139,250, 0.8)',
              'rgba(244,114,182, 0.8)',
              'rgba(251,146,60, 0.8)',
              'rgba(16,185,129, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#0f172a',
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, padding: 10 } }
          }
        }
      });
    }

    // Тепловая карта заказов РБ
    const HM_REGIONS = [
      { key: 'minsk',   name: 'Минск',   kw: ['минск'] },
      { key: 'brest',   name: 'Брест',   kw: ['брест'] },
      { key: 'grodno',  name: 'Гродно',  kw: ['гродно', 'гродн'] },
      { key: 'vitebsk', name: 'Витебск', kw: ['витебск', 'витеб'] },
      { key: 'gomel',   name: 'Гомель',  kw: ['гомель', 'гомел'] },
      { key: 'mogilev', name: 'Могилёв', kw: ['могил'] }
    ];
    const hmCounts = {};
    HM_REGIONS.forEach(r => hmCounts[r.key] = 0);
    let hmTotal = 0;
    orders.forEach(o => {
      const t = (o.tracking_number_by || '').toLowerCase();
      if (!t) return;
      const region = HM_REGIONS.find(r => r.kw.some(k => t.includes(k)));
      if (region) { hmCounts[region.key]++; hmTotal++; }
    });
    const hmMax = Math.max(1, ...HM_REGIONS.map(r => hmCounts[r.key]));
    HM_REGIONS.forEach(r => {
      const cnt = hmCounts[r.key];
      const pct = hmTotal ? Math.round((cnt / hmTotal) * 100) : 0;
      const intensity = cnt / hmMax;
      const fill = cnt ? `hsl(190, 85%, ${72 - intensity * 45}%)` : '#1e293b';
      const path = document.getElementById('hm-' + r.key);
      if (path) path.setAttribute('fill', fill);
      const txt = document.getElementById('hmt-' + r.key);
      if (txt) txt.textContent = pct + '%';
    });
    const legendEl = document.getElementById('heatmapLegend');
    if (legendEl) {
      const sorted = [...HM_REGIONS].sort((a, b) => hmCounts[b.key] - hmCounts[a.key]);
      legendEl.innerHTML = sorted.map(r => {
        const cnt = hmCounts[r.key];
        const pct = hmTotal ? Math.round((cnt / hmTotal) * 100) : 0;
        const intensity = cnt / hmMax;
        const fill = cnt ? `hsl(190, 85%, ${72 - intensity * 45}%)` : '#334155';
        return `<div class="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-sm" style="background:${fill}"></span>
            <span class="text-white/80 text-xs font-semibold">${r.name}</span>
          </div>
          <span class="text-white text-xs font-bold">${pct}% <span class="text-white/40 font-normal">(${cnt})</span></span>
        </div>`;
      }).join('');
    }

  } catch(e) {
    console.error('Analytics error:', e);
  }
};

// Helper to convert File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

window.downloadTaxInvoicePDF = async () => {
  if (!userId) {
    tgUtil.alert('Авторизуйтесь для скачивания выписки');
    return;
  }
  tgUtil.haptic('light');
  const year = new Date().getFullYear();
  
  try {
    const { data: orders, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${year}-01-01T00:00:00Z`)
      .lte('created_at', `${year}-12-31T23:59:59Z`)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      tgUtil.alert(`За ${year} год у вас нет успешных заказов.`);
      return;
    }

    let totalSum = 0;
    const tableBody = [
      [{ text: 'Дата', style: 'tableHeader' }, { text: 'Номер заказа', style: 'tableHeader' }, { text: 'Сумма (BYN)', style: 'tableHeader' }]
    ];

    orders.forEach(o => {
      const dateStr = new Date(o.created_at).toLocaleDateString('ru-RU');
      const totalByn = parseFloat(o.total_byn) || 0;
      totalSum += totalByn;
      tableBody.push([
        dateStr,
        `№ ${o.id.slice(0, 8)}`,
        totalByn.toFixed(2)
      ]);
    });

    tableBody.push([
      { text: 'ИТОГО', colSpan: 2, style: 'tableHeader', alignment: 'right' },
      {},
      { text: totalSum.toFixed(2), style: 'tableHeader' }
    ]);

    const docDefinition = {
      content: [
        { text: 'Выписка по заказам', style: 'header' },
        { text: `Год: ${year}`, style: 'subheader' },
        { text: `Клиент ID: ${userId}`, margin: [0, 0, 0, 10] },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto'],
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\\nОрганизация: ООО "Айс Лоджикс"', style: 'footer' },
        { text: 'УНП: 193000000', style: 'footer' },
        { text: 'Адрес: г. Минск, ул. Примерная, 1', style: 'footer' },
        { text: 'Контактный телефон: +375 (29) 111-22-33', style: 'footer' },
        { text: 'М.П.', style: 'stamp', margin: [0, 30, 0, 0] }
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10], alignment: 'center' },
        subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
        tableExample: { margin: [0, 5, 0, 15] },
        tableHeader: { bold: true, fontSize: 13, color: 'black' },
        footer: { fontSize: 10, color: 'gray', margin: [0, 2, 0, 0] },
        stamp: { fontSize: 14, bold: true, alignment: 'right' }
      }
    };

    if (window.pdfMake) {
      pdfMake.createPdf(docDefinition).download(`Vypiska_ICE_LOGIX_${year}.pdf`);
    } else {
      tgUtil.alert('Библиотека для генерации PDF не загружена.');
    }
  } catch (err) {
    console.error('Ошибка генерации PDF:', err);
    tgUtil.alert('Не удалось сгенерировать PDF');
  }
};



// Global Exports
if (typeof renderAdminResale === 'function') window.renderAdminResale = renderAdminResale;
if (typeof computeRFMSegment === 'function') window.computeRFMSegment = computeRFMSegment;
if (typeof renderAdminCRM === 'function') window.renderAdminCRM = renderAdminCRM;
if (typeof openReviewForm === 'function') window.openReviewForm = openReviewForm;
if (typeof renderAdminAnalytics === 'function') window.renderAdminAnalytics = renderAdminAnalytics;
if (typeof fileToBase64 === 'function') window.fileToBase64 = fileToBase64;
