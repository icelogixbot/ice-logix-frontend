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
  const promosHtml = promos && promos.length
    ? promos.map(p => `
        <div class="glass-card mb-3 overflow-hidden cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform" data-promotion-id="${p.id}">
          ${p.banner_url ? `<div style="height:120px; background: url('${p.banner_url}') center/cover no-repeat; border-radius: 16px 16px 0 0;"></div>` : ''}
          <div class="p-4">
            <h3 class="text-white font-bold text-sm">${p.title || 'Акция'}</h3>
            ${p.description ? `<p class="text-white/60 text-xs mt-1">${p.description}</p>` : ''}
          </div>
        </div>
      `).join('')
    : '<p class="text-white/50 text-center py-6">Акций пока нет. Следите за обновлениями!</p>';

  return `
    <div>
      <div class="px-4">
        <div class="flex items-center gap-3 mb-5 mt-2">
          <button id="backFromPromoBtn" class="global-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 class="text-xl font-bold text-white">Акции</h2>
        </div>

        <!-- Колесо Фортуны -->
        <div class="glass-card mb-5 overflow-hidden relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform" id="promoFortuneBtn" style="background: linear-gradient(135deg, rgba(91,191,235,0.15), rgba(139,92,246,0.15)); border: 1px solid rgba(139,92,246,0.25);">
          <div class="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl" style="background: rgba(139,92,246,0.3);"></div>
          <div class="flex items-center justify-between p-4 relative z-10">
            <div class="space-y-0.5 text-left">
              <h3 class="text-white font-bold text-sm flex items-center gap-1.5"><span>🔮 Колесо Фортуны</span></h3>
              <p class="text-white/60 text-[10px]">Крутите барабан каждый день бесплатно! До 10 ICE!</p>
            </div>
            <button class="btn-primary py-2 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1" style="background: linear-gradient(135deg, var(--ice-primary), #8B5CF6); border: none;">Крутить!</button>
          </div>
        </div>

        <!-- Список акций -->
        <h3 class="text-white font-bold mb-4 flex items-center gap-2">
          <span>🏷️</span> Текущие акции
        </h3>
        ${promosHtml}
      </div>

      ${renderFooter()}
    </div>
  `;
}

function attachPromoPageHandlers() {
  document.getElementById('backFromPromoBtn')?.addEventListener('click', () => switchTab('home'));
  document.getElementById('promoFortuneBtn')?.addEventListener('click', () => {
    if (!window.userId) { window.requireAuth('Авторизуйтесь, чтобы крутить Колесо Фортуны и выигрывать призы!'); return; }
    showWheelOfFortuneModal();
  });
  document.querySelectorAll('[data-promotion-id]').forEach(el => {
    el.addEventListener('click', () => {
      if (!window.userId) { window.requireAuth('Авторизуйтесь, чтобы участвовать в акциях!'); return; }
      tgUtil.alert('Подробнее об акции будет позже');
    });
  });
}

// ==================== ИСТОРИЯ ====================
async function renderHistory() {
  const subScreen = window._historySubScreen || 'transactions';
  let content = '';

  if (subScreen === 'transactions') {
    const { data, error } = await supabaseClient.from('transaction_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    if (error || !data || !data.length) {
      content = '<p class="text-white/50 text-center py-8">Транзакций пока нет</p>';
    } else {
      content = data.map(tx => `
        <div class="flex justify-between py-3 border-b border-white/5">
          <div>
            <p class="text-white text-sm font-semibold">${getTransactionTypeText(tx.type)}</p>
            <p class="text-white/40 text-xs">${new Date(tx.created_at).toLocaleString('ru-RU')}</p>
            ${tx.description ? `<p class="text-white/60 text-xs mt-0.5">${tx.description}</p>` : ''}
          </div>
          <p class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-sm">${tx.amount >= 0 ? '+' : ''}${tx.amount} ICE</p>
        </div>
      `).join('');
    }
  } else if (subScreen === 'family') {
    const fam = window.userSettings?.family || {};
    const headId = fam.head_id || (fam.role === 'head' ? userId : null);
    if (!headId) {
      content = '<p class="text-white/50 text-center py-8">Семейный бюджет не настроен</p>';
    } else {
      const { data: members } = await supabaseClient.from('users').select('user_id, settings').eq('settings->>family->>head_id', headId).limit(20);
      const memberIds = members ? members.map(m => m.user_id) : [];
      if (!memberIds.includes(headId)) memberIds.unshift(headId);
      const { data, error } = await supabaseClient.from('family_transactions').select('*').in('user_id', memberIds).order('created_at', { ascending: false }).limit(100);
      if (error || !data || !data.length) {
        content = '<p class="text-white/50 text-center py-8">Транзакций семьи пока нет</p>';
      } else {
        content = data.map(tx => `
          <div class="flex justify-between py-3 border-b border-white/5">
            <div>
              <p class="text-white text-sm font-semibold">${tx.description || getTransactionTypeText(tx.type)}</p>
              <p class="text-white/40 text-xs">${new Date(tx.created_at).toLocaleString('ru-RU')}</p>
              <p class="text-white/50 text-xs">ID: ${tx.user_id}</p>
            </div>
            <p class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-sm">${tx.amount >= 0 ? '+' : ''}${tx.amount} ICE</p>
          </div>
        `).join('');
      }
    }
  } else if (subScreen === 'orders') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseClient.from('orders').select('*').eq('user_id', userId).lt('updated_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(100);
    if (error || !data || !data.length) {
      content = '<p class="text-white/50 text-center py-8">Архив заказов пуст. Заказы появятся здесь через 7 дней после завершения.</p>';
    } else {
      content = data.map(o => `
        <div class="glass-card p-4 mb-3">
          <div class="flex justify-between items-start mb-1">
            <p class="text-white font-semibold text-sm flex-1 mr-2">${o.title || o.url || 'Заказ'}</p>
            <span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.6);">${o.status || '—'}</span>
          </div>
          <p class="text-white/40 text-xs">${new Date(o.created_at).toLocaleDateString('ru-RU')}</p>
          ${o.total_price ? `<p class="text-cyan-400 text-sm font-bold mt-1">${o.total_price} BYN</p>` : ''}
        </div>
      `).join('');
    }
  } else if (subScreen === 'reviews') {
    const { data, error } = await supabaseClient.from('reviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = '<p class="text-white/50 text-center py-8">Вы еще не оставляли отзывы</p>';
    } else {
      content = '<div class="space-y-3">';
      content += data.map(r => {
        const stars = '⭐'.repeat(r.rating || 5);
        const dateStr = new Date(r.created_at).toLocaleDateString('ru-RU');
        const isPublished = r.is_published;
        const photoUrls = r.photo_urls || [];
        
        return `
          <div class="glass-card p-4 font-sans">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-amber-400 text-xs font-bold mr-2">${stars}</span>
                <span class="text-[10px] text-white/40 font-mono">${dateStr}</span>
              </div>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full ${isPublished ? 'bg-green-500/20 text-green-400 border border-green-500/35' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/35'} font-semibold">
                ${isPublished ? 'Опубликован' : 'На модерации'}
              </span>
            </div>
            <p class="text-white/90 text-sm mb-2 font-sans">${r.text || ''}</p>
            ${photoUrls.length > 0 ? `
              <div class="flex gap-2 overflow-x-auto py-1">
                ${photoUrls.map(url => `<img src="${url}" class="w-12 h-12 rounded-xl object-cover border border-white/10" />`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
      content += '</div>';
    }
  } else if (subScreen === 'legitchecks') {
    const { data, error } = await supabaseClient.from('legit_check_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = '<p class="text-white/50 text-center py-8">Вы еще не отправляли запросы на легит-чек</p>';
    } else {
      content = '<div class="space-y-3">';
      content += data.map(c => {
        const dateStr = new Date(c.created_at).toLocaleDateString('ru-RU');
        const statusText = c.status === 'pending' ? '⏳ На модерации' : c.status === 'original' ? '✅ Оригинал' : '❌ Не оригинал';
        const statusClass = c.status === 'pending' ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' : c.status === 'original' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20';
        const photoUrls = (c.photos || []).map(p => {
          if (p.startsWith('http')) return p;
          return supabaseClient.storage.from('ugc').getPublicUrl(p).data.publicUrl;
        });

        return `
          <div class="glass-card p-4 font-sans">
            <div class="flex justify-between items-center text-[10px] text-white/40 mb-2">
              <span>${dateStr}</span>
              <span class="font-mono">#${c.id.slice(0, 8)}</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-white font-bold text-sm">Легит-чек товара</span>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full ${statusClass} font-semibold">${statusText}</span>
            </div>
            ${photoUrls.length > 0 ? `
              <div class="flex gap-2 overflow-x-auto py-1">
                ${photoUrls.map(url => `<img src="${url}" class="w-12 h-12 rounded-xl object-cover border border-white/10" />`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
      content += '</div>';
    }
  } else if (subScreen === 'promotions') {
    const { data, error } = await supabaseClient.from('promotions').select('*').order('created_at', { ascending: false }).limit(50);
    if (error || !data || !data.length) {
      content = '<p class="text-white/50 text-center py-8">Акций и розыгрышей пока нет</p>';
    } else {
      content = '<div class="space-y-3">';
      content += data.map(p => {
        const isActive = p.is_active;
        const discountText = p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} BYN`;
        const expiresStr = p.expires_at ? new Date(p.expires_at).toLocaleDateString('ru-RU') : 'Бессрочно';
        const startsStr = p.starts_at ? new Date(p.starts_at).toLocaleDateString('ru-RU') : '';
        
        return `
          <div class="glass-card overflow-hidden font-sans">
            ${p.banner_url ? `
              <div style="background-image: url('${p.banner_url}'); background-size: cover; background-position: center; height: 100px; width: 100%;"></div>
            ` : ''}
            <div class="p-4">
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-white font-bold text-sm">${p.title || 'Акция'}</h3>
                <span class="text-[10px] px-2.5 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400 border border-green-500/35' : 'bg-white/10 text-white/50 border border-white/15'} font-semibold">
                  ${isActive ? 'Активна' : 'Завершена'}
                </span>
              </div>
              ${p.description ? `<p class="text-white/70 text-xs mb-3 font-sans leading-relaxed">${p.description}</p>` : ''}
              <div class="flex justify-between items-center text-[10px] text-white/40 border-t border-white/5 pt-2 font-mono">
                <span>Скидка: <strong class="text-cyan-400 font-bold">${discountText}</strong></span>
                <span>Сроки: ${startsStr ? startsStr + ' - ' : ''}${expiresStr}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
      content += '</div>';
    }
  } else if (subScreen === 'calculations') {
    let calculations = [];
    try {
      calculations = JSON.parse(localStorage.getItem('ice_calc_history') || '[]');
    } catch (e) {}
    
    // Prune calculations older than 14 days
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const activeCalculations = calculations.filter(c => c.timestamp && c.timestamp > fourteenDaysAgo);
    if (activeCalculations.length !== calculations.length) {
      try {
        localStorage.setItem('ice_calc_history', JSON.stringify(activeCalculations));
      } catch (e) {}
    }
    
    if (activeCalculations.length === 0) {
      content = '<p class="text-white/50 text-center py-8">История расчетов пуста.</p>';
    } else {
      content = '<div class="space-y-3">';
      content += activeCalculations.map((c, idx) => {
        const dateStr = new Date(c.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const flag = c.country === 'CN' ? '🇨🇳' : c.country === 'PL' ? '🇵🇱' : '🇷🇺';
        const imageHtml = c.image_url 
          ? `<img src="${escHtmlC(c.image_url)}" class="w-12 h-12 object-cover rounded-xl border border-white/10 flex-shrink-0" onerror="this.style.display='none'">` 
          : '';
        return `
          <div class="glass-card p-4 flex gap-3 border border-white/5">
            ${imageHtml}
            <div class="flex-1 min-w-0 flex flex-col gap-1.5">
              <div class="flex justify-between items-center text-[10px] text-white/40">
                <span>⏱️ ${dateStr}</span>
                <span>${flag} ${escHtmlC(c.marketplace || 'Poizon')}</span>
              </div>
              <div>
                <h4 class="text-white font-bold text-sm truncate" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escHtmlC(c.title || 'Товар без названия')}">${escHtmlC(c.title || 'Товар без названия')}</h4>
                <p class="text-white/60 text-xs mt-0.5">Размер: ${escHtmlC(c.size || '—')} · Цвет: ${escHtmlC(c.color || '—')} · Вес: ${c.weight || 1.0} кг</p>
              </div>
              <div class="flex justify-between items-baseline mt-1 border-t border-white/5 pt-2">
                <span class="text-cyan-400 font-extrabold text-base font-mono">${c.total_byn.toFixed(2)} BYN</span>
                <div class="flex gap-2">
                  <button class="px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition active:scale-95 flex items-center gap-1" onclick="window.restoreCalculation(${idx})">
                    🔄 Восстановить
                  </button>
                  <button class="px-2 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition active:scale-95" onclick="window.deleteCalculation(${idx})">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
      content += '</div>';
    }
  }

  return `
    <div class="page-enter px-4 pb-8">
      <div class="flex items-center gap-3 mb-5 mt-2">
        <button id="backFromHistoryBtn" class="global-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 class="text-xl font-bold text-white">История</h2>
      </div>
      <div class="flex gap-2 mb-5 flex-wrap">
        <button id="historyTabTx" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'transactions' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'transactions' ? '' : 'border: 1px solid var(--glass-border);'}">
          💳 Транзакции
        </button>
        <button id="historyTabOrders" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'orders' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'orders' ? '' : 'border: 1px solid var(--glass-border);'}">
          📦 Архив
        </button>
        <button id="historyTabFamily" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'family' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'family' ? '' : 'border: 1px solid var(--glass-border);'}">
          👨‍👩‍👧 Семья
        </button>
        <button id="historyTabReviews" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'reviews' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'reviews' ? '' : 'border: 1px solid var(--glass-border);'}">
          💬 Отзывы
        </button>
        <button id="historyTabLegit" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'legitchecks' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'legitchecks' ? '' : 'border: 1px solid var(--glass-border);'}">
          🔍 Легит-чеки
        </button>
        <button id="historyTabPromo" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'promotions' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'promotions' ? '' : 'border: 1px solid var(--glass-border);'}">
          🎁 Акции
        </button>
        <button id="historyTabCalculations" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'calculations' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'calculations' ? '' : 'border: 1px solid var(--glass-border);'}">
          📐 Расчеты
        </button>
      </div>
      <div id="historyContent">
        ${content}
      </div>
    </div>
  `;
}

function attachHistoryHandlers() {
  document.getElementById('backFromHistoryBtn')?.addEventListener('click', () => {
    window._historySubScreen = null;
    switchTab('profile');
  });
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

// Все транзакции (модальное окно)
async function showAllTransactions() {
  const { data, error } = await supabaseClient.from('transaction_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { tgUtil.alert('Ошибка загрузки'); return; }
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
  modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/></svg></span> История транзакций</h3>
      </div>
      <div class="p-5 overflow-y-auto flex-1">
        ${data && data.length > 0 ? data.map(tx => `
          <div class="flex justify-between py-2 border-b border-white/10">
            <div>
              <p class="text-white">${getTransactionTypeText(tx.type)}</p>
              <p class="text-white/50 text-xs">${new Date(tx.created_at).toLocaleString('ru-RU')}</p>
              ${tx.description ? `<p class="text-white/70 text-sm">${tx.description}</p>` : ''}
            </div>
            <p class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">${tx.amount >= 0 ? '+' : ''}${tx.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></p>
          </div>
        `).join('') : '<p class="text-white/70 text-center py-4">Нет транзакций</p>'}
      </div>
      <div class="p-5 border-t border-white/20">
        <button id="closeTransactionsModal" class="btn-secondary w-full">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#closeTransactionsModal').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function showAccountRecovery() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';
  modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full border border-white/20">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span> Восстановить доступ</h3>
        <p class="text-white/50 text-xs mt-1">Подтвердите номер телефона для восстановления данных</p>
      </div>
      <div class="p-5 space-y-3">
        <div id="recoveryPhasePhone">
          <label class="text-white/70 text-sm">Привязанный номер телефона</label>
          <input type="tel" id="recoveryPhoneInput" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30"
            placeholder="+375XXXXXXXXX">
          <button id="recoverySendCodeBtn" class="btn-primary mt-3 w-full">
            <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span> Отправить код
          </button>
          <p id="recoveryPhoneError" class="text-red-400 text-xs mt-2 hidden"></p>
        </div>
        <div id="recoveryPhaseCode" class="hidden">
          <label class="text-white/70 text-sm">Код из Telegram-бота</label>
          <input type="text" id="recoveryCodeInput" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30"
            placeholder="6-значный код" maxlength="6">
          <button id="recoveryVerifyBtn" class="mt-3 w-full bg-green-500 hover:bg-green-600 py-2.5 rounded-xl font-bold">
            <span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Подтвердить
          </button>
          <div class="flex justify-between items-center mt-2">
            <p id="recoveryCodeError" class="text-red-400 text-xs hidden"></p>
            <button id="recoveryResendBtn" class="text-cyan-400 text-xs hidden">Отправить повторно (<span id="recoveryTimer">60</span>с)</button>
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
    // Генерируем код
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabaseClient.from('verification_codes').insert({ user_id: userRow.user_id, code, type: 'recovery', expires_at: expiresAt, used: false });
    // Отправляем через Edge Function
    try {
      await supabaseClient.functions.invoke('send-notification', { body: { user_id: userRow.user_id, message: `<span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span> Ваш код восстановления доступа ICE LOGIX: ${code}\nДействует 10 минут.` } });
    } catch {
      tgUtil.alert(`Код восстановления (тест): ${code}`); // fallback если бот недоступен
    }
    modal.querySelector('#recoveryPhasePhone').classList.add('hidden');
    modal.querySelector('#recoveryPhaseCode').classList.remove('hidden');
    startResendTimer();
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

// Kept for back-compat if called directly
async function showNotificationSettings() { return showAppSettings('notifications'); }

async function showAppSettings(initialTab = 'security') {
  // Parallel fetch auth user and user profile
  const [authUserDataRes, userProfileRes] = await Promise.all([
    supabaseClient ? supabaseClient.auth.getUser() : Promise.resolve({ data: {} }),
    (supabaseClient && userId) ? supabaseClient.from('users').select('notification_settings, app_settings, telegram_id, phone, username').eq('user_id', userId).single() : Promise.resolve({ data: {} })
  ]);
  const authUser = authUserDataRes?.data?.user;
  const data = userProfileRes?.data;
  
  const localNotif = JSON.parse(localStorage.getItem('notification_settings') || '{"status_changes":true,"news":true,"promotions":true}');
  const notif = data?.notification_settings || localNotif;
  const appSettings = data?.app_settings || {};
  const currentTheme = appSettings.theme || localStorage.getItem('theme') || 'dark';
  const currentLang = appSettings.lang || localStorage.getItem('lang') || 'ru';

  const userTelegramId = authUser?.user_metadata?.telegram_id || data?.telegram_id || null;
  const userPhone = authUser?.phone || data?.phone || null;
  const userEmail = authUser?.email || '';
  const isDummyEmail = userEmail.startsWith('tg_') && userEmail.endsWith('@icelogix.by');

  const linkedIdentities = authUser?.identities || [];
  const isGoogleLinked = linkedIdentities.some(id => id.provider === 'google');
  const isAppleLinked = linkedIdentities.some(id => id.provider === 'apple');

  const toggle = (id, checked) => `
    <label class="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''}>
      <div class="relative w-11 h-6 bg-white/20 rounded-full transition-colors peer-checked:bg-cyan-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
    </label>`;

  // Build Security panel items dynamically
  let identitiesHtml = '';

  // Telegram Link (FIRST - per user request)
  if (userTelegramId) {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-xl flex items-center justify-between settings-row-bg" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
        <div class="flex items-center gap-3">
          <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.19 2.5a24.22 24.22 0 0 0-9 1.56 24.43 24.43 0 0 0-9-1.56c-.53 0-1 .47-1 1a24 24 0 0 0 3.25 12c1.72 2.7 4.19 4.7 7.21 6a.52.52 0 0 0 .39 0c3-.78 5.76-2.58 7.37-5.12A24.08 24.08 0 0 0 22.19 3.5c0-.53-.47-1-1-1z"/></svg></span>
          <span class="font-semibold text-white/50 text-sm">Telegram привязан</span>
        </div>
        <span class="text-xs text-green-400 font-bold">Привязан ✓</span>
      </div>
    `;
  } else {
    identitiesHtml += `
      <div class="space-y-2">
        <button id="linkTelegramBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition animate-pulse-subtle" style="background: rgba(14,165,233,0.15); border: 1px solid rgba(14,165,233,0.3);">
          <div class="flex items-center gap-3">
            <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.19 2.5a24.22 24.22 0 0 0-9 1.56 24.43 24.43 0 0 0-9-1.56c-.53 0-1 .47-1 1a24 24 0 0 0 3.25 12c1.72 2.7 4.19 4.7 7.21 6a.52.52 0 0 0 .39 0c3-.78 5.76-2.58 7.37-5.12A24.08 24.08 0 0 0 22.19 3.5c0-.53-.47-1-1-1z"/></svg></span>
            <span class="font-semibold text-white text-sm">Привязать Telegram</span>
          </div>
          <span class="text-xs text-cyan-300 font-bold">Привязать</span>
        </button>
        <div id="settingsTelegramWidgetContainer" class="hidden flex justify-center p-2 bg-slate-900/50 rounded-xl"></div>
      </div>
    `;
  }

  // Google Link
  identitiesHtml += `
    <button id="linkGoogleBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition" style="background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.25);">
      <div class="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span class="font-semibold text-white text-sm">Google</span>
      </div>
      <span class="text-xs ${isGoogleLinked ? 'text-green-400 font-bold' : 'text-white/50'}">${isGoogleLinked ? 'Привязан ✓' : 'Привязать'}</span>
    </button>
  `;

  // Apple Link
  identitiesHtml += `
    <button id="linkAppleBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between settings-action-btn transition" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
      <div class="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color:#ffffff;"><path d="M16.365 21.444c-1.332 1.405-2.651 1.4-3.955.086-1.19-1.2-2.316-1.187-3.486 0-1.385 1.4-2.721 1.428-4.043.08-3.036-3.111-4.707-8.31-2.482-12.825 1.134-2.296 3.013-3.714 5.234-3.743 1.572-.016 3.031.975 4.02.975.986 0 2.833-1.182 4.793-1.01 1.637.067 3.125.77 4.148 2.106-3.415 2.115-2.88 6.772.634 8.163-.787 2.111-1.956 4.316-3.863 6.168zM15.426 5.518c-.85.98-2.126 1.611-3.266 1.516-.25-1.428.468-2.85 1.258-3.791.905-1.083 2.304-1.727 3.402-1.631.183 1.428-.48 2.838-1.394 3.906z"/></svg>
        <span class="font-semibold text-white text-sm">Apple</span>
      </div>
      <span class="text-xs ${isAppleLinked ? 'text-green-400 font-bold' : 'text-white/50'}">${isAppleLinked ? 'Привязан ✓' : 'Привязать'}</span>
    </button>
  `;

  // Email Link
  if (isDummyEmail) {
    identitiesHtml += `
      <button id="linkEmailBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition" style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);">
        <div class="flex items-center gap-3">
          <span class="ix text-purple-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <span class="font-semibold text-white text-sm">Привязать Email</span>
        </div>
        <span class="text-xs text-purple-300 font-bold">Привязать</span>
      </button>
    `;
  } else {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-xl flex items-center justify-between settings-row-bg" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
        <div class="flex items-center gap-3">
          <span class="ix text-white/40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
          <span class="font-semibold text-white/50 text-sm">Email привязан</span>
        </div>
        <span class="text-xs text-white/40 max-w-[120px] truncate">${userEmail}</span>
      </div>
    `;
  }

  // Phone Link
  if (userPhone) {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-xl flex items-center justify-between settings-row-bg" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
        <div class="flex items-center gap-3">
          <span class="ix text-white/40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
          <span class="font-semibold text-white/50 text-sm">Телефон привязан</span>
        </div>
        <span class="text-xs text-white/40">${userPhone}</span>
      </div>
    `;
  } else {
    identitiesHtml += `
      <button id="linkPhoneBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between settings-action-btn transition" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
        <div class="flex items-center gap-3">
          <span class="ix text-white/40"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
          <span class="font-semibold text-white text-sm">Привязать Телефон</span>
        </div>
        <span class="text-xs text-white/50">Привязать</span>
      </button>
    `;
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4';
  modal.innerHTML = `
    <div id="settingsModalCard" class="bg-[#1e293b] rounded-2xl max-w-md w-full flex flex-col border border-white/20" style="${initialTab === 'security' || initialTab === 'language' ? 'height: min(92vh, 600px);' : 'max-height: 90vh;'} overflow: hidden;">
      <div class="p-5 border-b border-white/20">
        <h3 class="text-white font-bold text-lg flex items-center gap-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> ${t('settings_title', 'Настройки')}</h3>
      </div>
      <!-- Tabs (Reordered per user request: Security, Notifications, Language, Theme) -->
      <div class="flex border-b border-white/10 bg-slate-900/40">
        <button class="settings-tab flex-1 py-2.5 text-[10px] sm:text-xs font-medium transition flex flex-col items-center gap-1 ${initialTab==='security'?'text-cyan-400 border-b-2 border-cyan-400':'text-white/50'}"
          data-tab="security">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>${t('settings_security', 'Безопасность')}</span>
        </button>
        <button class="settings-tab flex-1 py-2.5 text-[10px] sm:text-xs font-medium transition flex flex-col items-center gap-1 ${initialTab==='notifications'?'text-cyan-400 border-b-2 border-cyan-400':'text-white/50'}"
          data-tab="notifications">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span>${t('settings_notifications', 'Уведомления')}</span>
        </button>
        <button class="settings-tab flex-1 py-2.5 text-[10px] sm:text-xs font-medium transition flex flex-col items-center gap-1 ${initialTab==='language'?'text-cyan-400 border-b-2 border-cyan-400':'text-white/50'}"
          data-tab="language">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>${t('settings_lang', 'Язык')}</span>
        </button>
        <button class="settings-tab flex-1 py-2.5 text-[10px] sm:text-xs font-medium transition flex flex-col items-center gap-1 ${initialTab==='theme'?'text-cyan-400 border-b-2 border-cyan-400':'text-white/50'}"
          data-tab="theme">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg>
          <span>${t('settings_theme', 'Тема')}</span>
        </button>
      </div>
      <!-- Notifications panel -->
      <div id="settingsPanel-notifications" class="p-5 flex-1 space-y-4 ${initialTab!=='notifications'?'hidden':''}" style="overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;">
        <div class="flex items-center justify-between"><span class="text-white text-sm">Изменение статуса заказа</span>${toggle('notifyStatusChanges', notif.status_changes)}</div>
        <div class="flex items-center justify-between"><span class="text-white text-sm">Новости и обновления</span>${toggle('notifyNews', notif.news)}</div>
        <div class="flex items-center justify-between"><span class="text-white text-sm">Акции и предложения</span>${toggle('notifyPromotions', notif.promotions)}</div>
      </div>
      <!-- Theme panel -->
      <div id="settingsPanel-theme" class="p-5 flex-1 space-y-4 ${initialTab!=='theme'?'hidden':''}" style="overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;">
        <p class="text-white/60 text-xs mb-3">Выберите оформление интерфейса</p>
        <div class="grid grid-cols-2 gap-3">
          <button class="theme-btn rounded-xl p-4 border-2 transition ${currentTheme==='dark'?'border-cyan-500 bg-slate-800':'border-white/20 bg-white/5'}" data-theme="dark">
            <p class="text-2xl mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span></p>
            <p class="text-white text-sm font-bold">Тёмная</p>
            <p class="text-white/50 text-xs">По умолчанию</p>
          </button>
          <button class="theme-btn rounded-xl p-4 border-2 transition ${currentTheme==='light'?'border-cyan-500 bg-slate-200':'border-white/20 bg-white/5'}" data-theme="light">
            <p class="text-2xl mb-2"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></span></p>
            <p class="text-white text-sm font-bold">Светлая</p>
            <p class="text-white/50 text-xs">Эксперимент</p>
          </button>
        </div>
        <button id="resetSettingsBtn" class="mt-4 w-full text-white/40 text-xs py-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span> Сбросить по умолчанию</button>
      </div>
      <!-- Language panel -->
      <div id="settingsPanel-language" class="p-5 flex-1 space-y-4 ${initialTab!=='language'?'hidden':''}" style="overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;">
        <p class="text-white/60 text-xs mb-3">Выберите язык интерфейса / Выберыце мову інтэрфейсу / Choose interface language</p>
        <div class="space-y-2">
          <button class="lang-btn w-full rounded-xl p-3 border-2 transition text-left flex items-center justify-between ${currentLang==='ru'?'border-cyan-500 bg-slate-800':'border-white/20 bg-white/5'}" data-lang="ru">
            <span class="text-white text-sm font-bold">Русский</span>
            <span class="text-xs text-white/50">По умолчанию</span>
          </button>
          <button class="lang-btn w-full rounded-xl p-3 border-2 transition text-left flex items-center justify-between ${currentLang==='be'?'border-cyan-500 bg-slate-800':'border-white/20 bg-white/5'}" data-lang="be">
            <span class="text-white text-sm font-bold">Беларуская</span>
            <span class="text-xs text-white/50">Зробена з любоўю</span>
          </button>
          <button class="lang-btn w-full rounded-xl p-3 border-2 transition text-left flex items-center justify-between ${currentLang==='en'?'border-cyan-500 bg-slate-800':'border-white/20 bg-white/5'}" data-lang="en">
            <span class="text-white text-sm font-bold">English</span>
            <span class="text-xs text-white/50">International</span>
          </button>
        </div>
      </div>
      <!-- Security panel -->
      <div id="settingsPanel-security" class="p-4 flex-1 space-y-3 ${initialTab!=='security'?'hidden':''}" style="overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none;">
        <p class="text-white/60 text-xs">Управление способами входа и безопасностью.</p>
        
        <div class="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <p class="text-white text-xs font-semibold uppercase tracking-wider text-white/50 pb-1">Привязка аккаунтов</p>
          ${identitiesHtml}
        </div>

        ${!isDummyEmail ? `
        <button id="changePasswordBtn" class="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-left transition" style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);">
          <span class="ix text-purple-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-white text-sm">Изменить пароль</p>
            <p class="text-xs text-white/50">Обновить пароль аккаунта</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.4);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        ` : ''}

        <button id="securityRecoveryBtn" class="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-left transition" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);">
          <span class="ix text-indigo-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-white text-sm">Сброс аккаунта</p>
            <p class="text-xs text-white/50">Полный выход со всех устройств</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.4);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="p-4 border-t border-white/20 flex gap-3">
        <button id="closeAppSettings" class="btn-secondary flex-1">${currentLang === 'be' ? 'Закрыць' : currentLang === 'en' ? 'Close' : 'Закрыть'}</button>
        <button id="saveAppSettings" class="btn-primary flex-1">${t('settings_save', 'Сохранить')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Tab switching
  let initialTheme = currentTheme;
  let initialLang = currentLang;
  let savedTheme = currentTheme;
  let savedLang = currentLang;

  let selectedTheme = currentTheme;
  let selectedLang = currentLang;
  const settingsCard = modal.querySelector('#settingsModalCard');
  modal.querySelectorAll('.settings-tab').forEach(tab => {
    tab.onclick = () => {
      modal.querySelectorAll('.settings-tab').forEach(t => { t.classList.remove('text-cyan-400','border-b-2','border-cyan-400'); t.classList.add('text-white/50'); });
      tab.classList.add('text-cyan-400','border-b-2','border-cyan-400'); tab.classList.remove('text-white/50');
      ['notifications','theme','security','language'].forEach(name => {
        modal.querySelector(`#settingsPanel-${name}`)?.classList.toggle('hidden', name !== tab.dataset.tab);
      });
      // Resize card: Security/Language = fixed height, others = auto
      if (settingsCard) {
        if (tab.dataset.tab === 'security' || tab.dataset.tab === 'language') {
          settingsCard.style.height = 'min(92vh, 600px)';
          settingsCard.style.maxHeight = '';
        } else {
          settingsCard.style.height = 'auto';
          settingsCard.style.maxHeight = '90vh';
        }
      }
    };
  });

  // Theme buttons
  modal.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = () => {
      selectedTheme = btn.dataset.theme;
      modal.querySelectorAll('.theme-btn').forEach(b => { b.classList.remove('border-cyan-500'); b.classList.add('border-white/20'); });
      btn.classList.add('border-cyan-500'); btn.classList.remove('border-white/20');
      applyTheme(selectedTheme); // live preview
    };
  });

  // Language buttons click handling
  modal.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = () => {
      selectedLang = btn.dataset.lang;
      modal.querySelectorAll('.lang-btn').forEach(b => { b.classList.remove('border-cyan-500'); b.classList.add('border-white/20'); });
      btn.classList.add('border-cyan-500'); btn.classList.remove('border-white/20');
    };
  });

  modal.querySelector('#resetSettingsBtn').onclick = () => {
    selectedTheme = 'dark'; applyTheme('dark');
    modal.querySelectorAll('.theme-btn').forEach(b => { b.classList.toggle('border-cyan-500', b.dataset.theme === 'dark'); b.classList.toggle('border-white/20', b.dataset.theme !== 'dark'); });
    modal.querySelector('#notifyStatusChanges').checked = true;
    modal.querySelector('#notifyNews').checked = true;
    modal.querySelector('#notifyPromotions').checked = true;
  };

  const linkGoogle = modal.querySelector('#linkGoogleBtn');
  if (linkGoogle) {
    linkGoogle.onclick = async () => {
      try {
        const { error } = await supabaseClient.auth.linkIdentity({ provider: 'google' });
        if (error) throw error;
      } catch(e) { tgUtil.alert('Ошибка привязки Google: ' + e.message); }
    };
  }

  const linkApple = modal.querySelector('#linkAppleBtn');
  if (linkApple) {
    linkApple.onclick = () => {
      tgUtil.alert('Привязка Apple временно отключена.');
    };
  }

  const linkEmail = modal.querySelector('#linkEmailBtn');
  if (linkEmail) {
    linkEmail.onclick = async () => {
      const email = prompt('Введите ваш Email для привязки:');
      if (!email) return;
      const password = prompt('Придумайте пароль для входа (минимум 6 символов):');
      if (!password || password.length < 6) {
        if (password) tgUtil.alert('Пароль слишком короткий.');
        return;
      }
      try {
        const { error } = await supabaseClient.auth.updateUser({ email, password });
        if (error) throw error;
        tgUtil.alert('Email для подтверждения отправлен. Пожалуйста, подтвердите его.');
        modal.remove();
        location.reload();
      } catch (e) {
        tgUtil.alert('Ошибка привязки Email: ' + e.message);
      }
    };
  }

  const linkTelegram = modal.querySelector('#linkTelegramBtn');
  if (linkTelegram) {
    linkTelegram.onclick = () => {
      const widgetContainer = modal.querySelector('#settingsTelegramWidgetContainer');
      if (!widgetContainer) return;
      
      if (widgetContainer.classList.contains('hidden')) {
        widgetContainer.classList.remove('hidden');
        widgetContainer.innerHTML = '<p class="text-white/40 text-xs py-2">Загрузка виджета Telegram...</p>';
        
        window.onTelegramSettingsAuth = async function(user) {
          try {
            const { data: existing } = await supabaseClient.from('users')
              .select('user_id')
              .eq('telegram_id', user.id)
              .maybeSingle();
              
            if (existing) {
              tgUtil.alert('Этот Telegram-аккаунт уже привязан к другому профилю.');
              return;
            }
            
            const { error } = await supabaseClient.from('users').update({
              telegram_id: user.id,
              username: user.username || null,
              full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
            }).eq('user_id', userId);
            
            if (error) throw error;
            
            tgUtil.alert('Telegram успешно привязан!');
            modal.remove();
            showAppSettings('security');
          } catch(e) {
            tgUtil.alert('Ошибка привязки Telegram: ' + e.message);
          }
        };
        
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'icelogix_bot');
        script.setAttribute('data-size', 'medium');
        script.setAttribute('data-onauth', 'onTelegramSettingsAuth(user)');
        script.setAttribute('data-request-access', 'write');
        
        script.onload = () => {
          const loadingText = widgetContainer.querySelector('p');
          if (loadingText) loadingText.remove();
        };
        
        widgetContainer.appendChild(script);
      } else {
        widgetContainer.classList.add('hidden');
        widgetContainer.innerHTML = '';
      }
    };
  }

  const linkPhone = modal.querySelector('#linkPhoneBtn');
  if (linkPhone) {
    linkPhone.onclick = () => {
      tgUtil.alert('Привязка телефона временно недоступна (СМС-шлюз отключен).');
    };
  }

  const changePasswordBtn = modal.querySelector('#changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.onclick = async () => {
      const newPassword = prompt('Введите новый пароль (минимум 6 символов):');
      if (!newPassword) return;
      if (newPassword.length < 6) { tgUtil.alert('Пароль слишком короткий. Минимум 6 символов.'); return; }
      const confirmPassword = prompt('Повторите новый пароль:');
      if (!confirmPassword) return;
      if (newPassword !== confirmPassword) { tgUtil.alert('Пароли не совпадают.'); return; }
      try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        tgUtil.haptic('success');
        tgUtil.alert('✅ Пароль успешно изменён!');
      } catch(e) {
        tgUtil.haptic('error');
        tgUtil.alert('Ошибка смены пароля: ' + e.message);
      }
    };
  }

  modal.querySelector('#securityRecoveryBtn')?.addEventListener('click', () => { modal.remove(); showRecoveryCodeModal(); });

  const handleClose = () => {
    applyTheme(savedTheme);
    applyLanguage(savedLang);
    modal.remove();
  };

  modal.querySelector('#closeAppSettings').onclick = handleClose;
  
  modal.querySelector('#saveAppSettings').onclick = async () => {
    const newNotif = {
      status_changes: modal.querySelector('#notifyStatusChanges').checked,
      news: modal.querySelector('#notifyNews').checked,
      promotions: modal.querySelector('#notifyPromotions').checked
    };
    const newApp = { theme: selectedTheme, lang: selectedLang };
    
    // Save to localStorage immediately
    localStorage.setItem('notification_settings', JSON.stringify(newNotif));
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('lang', selectedLang);

    if (supabaseClient && userId) {
      try {
        await supabaseClient.from('users').update({ notification_settings: newNotif, app_settings: newApp }).eq('user_id', userId);
      } catch (e) {
        console.error('Failed to save settings to database:', e);
      }
    }
    
    savedTheme = selectedTheme;
    savedLang = selectedLang;
    
    applyTheme(selectedTheme);
    applyLanguage(selectedLang);
    
    // Smooth inline save button feedback — just colour change, no size shift
    const saveBtn = modal.querySelector('#saveAppSettings');
    saveBtn.style.transition = 'background 0.3s';
    // setProperty/important so the green wins over .btn-primary (incl. light-theme overrides)
    saveBtn.style.setProperty('background', 'linear-gradient(135deg, #22c55e, #16a34a)', 'important');
    tgUtil.haptic('success');
    
    // Dynamic close button label update based on active language
    const closeBtn = modal.querySelector('#closeAppSettings');
    if (closeBtn) {
      closeBtn.innerText = savedLang === 'be' ? 'Закрыць' : savedLang === 'en' ? 'Close' : 'Закрыть';
    }

    setTimeout(() => {
      saveBtn.style.removeProperty('background');
    }, 1500);
  };
}

async function showNotificationsPanel() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 overflow-y-auto pt-16 pb-20';

  let notifications = [];
  try {
    const cached = localStorage.getItem('ice_cached_notifs_' + (userId || 'guest'));
    if (cached) notifications = JSON.parse(cached) || [];
  } catch(e) {}

  const renderNotifsList = (items, error) => {
    if (error) return '<p class="text-red-400 text-sm text-center py-6">Ошибка загрузки уведомлений</p>';
    if (!items || items.length === 0) return '<p class="text-white/50 text-center py-8">Уведомлений пока нет</p>';
    return items.map(n => `
      <div class="p-3 rounded-xl mb-3 ${n.is_read ? 'bg-white/5' : 'bg-cyan-500/10 border border-cyan-500/20'}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <p class="text-white text-sm font-semibold">${n.title || 'Уведомление'}</p>
            ${n.body ? `<p class="text-white/60 text-xs mt-1">${n.body}</p>` : ''}
            <p class="text-white/30 text-xs mt-1">${new Date(n.created_at).toLocaleString('ru-RU')}</p>
          </div>
          ${!n.is_read ? '<span class="w-2 h-2 rounded-full mt-1 flex-shrink-0" style="background:#22d3ee;"></span>' : ''}
        </div>
      </div>
    `).join('');
  };

  const unread = notifications.filter(n => !n.is_read);

  modal.innerHTML = `
    <div class="bg-[#1e293b] rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-white/20">
      <div class="p-5 border-b border-white/20 flex items-center justify-between">
        <h3 class="text-white font-bold text-lg flex items-center gap-2">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>
          Уведомления
          <span id="notifBadgeCounter" class="${unread.length > 0 ? '' : 'hidden'} ml-1 px-2 py-0.5 rounded-full text-xs font-bold" style="background:#ef4444;color:#fff;">${unread.length}</span>
        </h3>
        <button id="closeNotifPanel" class="text-white/50 hover:text-white transition p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-4 overflow-y-auto flex-1" id="notifsContainer">
        ${renderNotifsList(notifications, null)}
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('#closeNotifPanel')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Background fetch fresh notifications
  if (supabaseClient && userId) {
    supabaseClient.from('user_notifications')
      .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          try { localStorage.setItem('ice_cached_notifs_' + userId, JSON.stringify(data)); } catch(e) {}
          const container = modal.querySelector('#notifsContainer');
          if (container) container.innerHTML = renderNotifsList(data, null);
          const freshUnread = data.filter(n => !n.is_read);
          const badge = modal.querySelector('#notifBadgeCounter');
          if (badge) {
            badge.innerText = freshUnread.length;
            badge.className = (freshUnread.length > 0 ? '' : 'hidden') + ' ml-1 px-2 py-0.5 rounded-full text-xs font-bold';
          }
          if (freshUnread.length > 0) {
            const ids = freshUnread.map(n => n.id);
            supabaseClient.from('user_notifications').update({ is_read: true }).in('id', ids).then(() => {});
          }
        }
      });
  }
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.classList.add('hidden'); badge.textContent = '0'; }
}

window.requireAuth = function(message) {
  tgUtil.popup({
    title: 'Требуется авторизация',
    message: message || 'Для доступа к этому разделу необходимо войти в систему или зарегистрироваться.',
    buttons: [
      { id: 'login', type: 'default', text: 'Войти / Зарегистрироваться' },
      { id: 'cancel', type: 'cancel', text: 'Позже' }
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
        <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2)); border: 1px solid rgba(6,182,212,0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#22d3ee;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 class="text-white text-2xl font-bold mb-1">ICE LOGIX</h2>
        <p class="text-white/50 text-sm" id="authSubtitle">Вход в систему</p>
      </div>

      <!-- Главные табы: Вход / Регистрация -->
      <div class="flex rounded-xl p-1 mb-5 bg-white/5 border border-white/10 text-xs">
        <button id="authTabLogin" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white" style="background: linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3));">Вход</button>
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
          <button id="authPhoneSendCodeBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Получить код</button>
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
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Войти</button>
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
      loginTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      loginTabBtn.style.color = '#fff';
      registerTabBtn.style.background = 'transparent';
      registerTabBtn.style.color = 'rgba(255,255,255,0.5)';
      subtitle.textContent = 'Вход в систему';
      confirmPwdContainer.classList.add('hidden');
      emailSubmitBtn.textContent = 'Войти';
    } else {
      registerTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
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
  if (!userId) return '<p class="text-center mt-10 text-white/70">Авторизуйтесь</p>';
  try {
    const { data, error } = await supabaseClient
      .from('cart')
      .select('*, products(*)')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });
    
    if (error) {
      return `
        <div class="text-center py-10">
          <p class="text-red-400 font-bold mb-2"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Ошибка загрузки корзины</p>
          <p class="text-white/70 text-sm bg-white/5 p-3 rounded-xl">${error.message}</p>
          <button id="retryCartBtn" class="btn-primary mt-4">Повторить</button>
        </div>
        ${renderFooter()}
      `;
    }
    
    if (!data || data.length === 0) {
      return '<div class="text-center py-10"><p class="text-white/70 mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span> Ваша корзина пуста</p><button id="goToCatalogBtn" class="btn-primary">Перейти в каталог</button></div>' + renderFooter();
    }
    
    // Preprocess nested products to resolve placeholders/missing URLs
    data.forEach(item => {
      if (item.products) {
        item.products = preprocessProducts([item.products])[0];
      }
    });

    let totalPrice = 0;
    const itemsHtml = data.map(item => {
      const product = item.products;
      if (!product) return '';
      const itemTotal = window.iceLogixPricing.quickEstimate(product.price, 1) * item.quantity;
      totalPrice += itemTotal;
      return `
        <div class="glass-card p-3 flex items-center gap-3" data-cart-id="${item.id}" data-current-qty="${item.quantity}">
          <input type="checkbox" class="cart-item-checkbox" data-product-id="${product.id}" data-price="${product.price}" data-url="${product.url}" data-title="${product.title.replace(/"/g, '&quot;')}" data-image-url="${getProductImages(product.image_url)[0] || ''}" checked>
          <img src="${getProductImages(product.image_url)[0] || 'https://via.placeholder.com/150'}" class="w-16 h-16 object-cover rounded-lg">
          <div class="flex-1">
  <p class="text-white font-bold">${product.title}</p>
  <p class="text-cyan-400 text-sm">${product.price} ${product.currency} × <span class="cart-qty-display">${item.quantity}</span></p>
  <p class="text-white/70 text-xs item-example-price">${itemTotal.toFixed(2)} BYN (примерно)</p>
</div>
          <div class="flex items-center gap-2">
            <button class="cart-qty-btn bg-white/20 rounded-full w-8 h-8 flex items-center justify-center" data-action="decrease" data-id="${item.id}">−</button>
            <span class="cart-qty-display text-white">${item.quantity}</span>
            <button class="cart-qty-btn bg-white/20 rounded-full w-8 h-8 flex items-center justify-center" data-action="increase" data-id="${item.id}">+</button>
            <button class="cart-remove-btn text-red-400 ml-2" data-id="${item.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="space-y-3">
        ${itemsHtml}
        <div class="glass-card mt-4">
          <div class="flex justify-between items-center">
            <span class="text-white font-bold text-lg">Итого:</span>
            <span class="text-cyan-400 font-bold text-xl" id="cartTotalAmount">${totalPrice.toFixed(2)} BYN</span>
          </div>
          <p class="text-white/50 text-xs mt-1">*Примерная стоимость, точный расчёт в калькуляторе</p>
          <button id="clearCartBtn" class="w-full mt-3 bg-red-500/20 hover:bg-red-500/30 py-2 rounded-full text-sm"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span> Очистить корзину</button>
          <button id="checkoutCartBtn" class="w-full mt-2 bg-green-500 hover:bg-green-600 py-3 rounded-full font-bold"><span class="ix ix-accent"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="2"/></svg></span> Оформить заказ</button>
        </div>
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    return `
      <div class="text-center py-10">
        <p class="text-red-400 font-bold mb-2"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Исключение в renderCart</p>
        <p class="text-white/70 text-sm bg-white/5 p-3 rounded-xl">${err.message}</p>
        <button id="retryCartBtn" class="btn-primary mt-4">Повторить</button>
      </div>
      ${renderFooter()}
    `;
  }
}

function attachCartHandlers() {
  const goToCatalogBtn = document.getElementById('goToCatalogBtn');
  if (goToCatalogBtn) goToCatalogBtn.onclick = () => switchTab('catalogs');

  /** Актуальное количество: сначала data-current-qty на карточке (обновляется при +/-), иначе из DOM */
  function getCartRowQuantity(row) {
    if (!row) return 1;
    const raw = row.dataset.currentQty;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw).trim(), 10);
      if (!Number.isNaN(n) && n >= 1) return n;
    }
    const qtyEl = row.querySelector('.cart-qty-display');
    const fromDom = parseInt(String(qtyEl?.innerText ?? '').trim(), 10);
    return !Number.isNaN(fromDom) && fromDom >= 1 ? fromDom : 1;
  }

  // Функция пересчёта общего итога (вызывается при любых изменениях)
  function updateCartTotal() {
    let total = 0;
    document.querySelectorAll('.cart-item-checkbox:checked').forEach(cb => {
      const row = cb.closest('[data-cart-id]');
      if (!row) return;
      const price = parseFloat(cb.dataset.price) || 0;
      const quantity = getCartRowQuantity(row);
      total += window.iceLogixPricing.quickEstimate(price, 1) * quantity;
    });
    const totalSpan = document.getElementById('cartTotalAmount');
    if (totalSpan) totalSpan.innerText = total.toFixed(2) + ' BYN';
  }

  // === ДЕЛЕГИРОВАНИЕ СОБЫТИЙ (главное исправление) ===
  // Удаляем старый обработчик, если он был, чтобы избежать дублирования
  if (window._cartDelegate) {
    document.removeEventListener('click', window._cartDelegate);
  }
  
  window._cartDelegate = async (e) => {
    // Обработка клика по кнопке + / -
    const qtyBtn = e.target.closest('.cart-qty-btn');
    if (qtyBtn) {
      e.preventDefault();
      e.stopPropagation();
      
      const action = qtyBtn.dataset.action;
      const cartId = qtyBtn.dataset.id;
      const row = qtyBtn.closest('[data-cart-id]');
      if (!row) return;
      
      const qtySpans = row.querySelectorAll('.cart-qty-display');
      const priceCheckbox = row.querySelector('.cart-item-checkbox');
      const pricePerUnit = parseFloat(priceCheckbox?.dataset.price || '0');
      let newQty = parseInt(qtySpans[0]?.innerText || '1');
      
      if (action === 'increase') newQty++;
      else if (action === 'decrease') newQty = Math.max(1, newQty - 1);
      
      // Обновляем в Supabase
      const { error } = await supabaseClient
        .from('cart')
        .update({ quantity: newQty, updated_at: new Date() })
        .eq('id', cartId);
        
      if (!error) {
        row.dataset.currentQty = String(newQty);
        const pid = priceCheckbox?.dataset.productId;
        if (pid) {
          window.cartQty = window.cartQty || {};
          window.cartQty[String(pid)] = newQty;
        }
        if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
        
        // Обновляем все отображения количества в карточке
        qtySpans.forEach(span => span.innerText = newQty);
        // Обновляем примерную стоимость
        const examplePriceSpan = row.querySelector('.item-example-price');
        if (examplePriceSpan) {
          const newItemTotal = window.iceLogixPricing.quickEstimate(pricePerUnit, 1) * newQty;
          examplePriceSpan.innerText = newItemTotal.toFixed(2) + ' BYN (примерно)';
        }
        // Пересчитываем итог
        updateCartTotal();
        // Обновляем бейдж корзины (на всякий случай)
        if (typeof updateCartBadge === 'function') updateCartBadge();
      }
      return;
    }
    
    // Обработка клика по чекбоксу (для пересчёта итога)
    const checkbox = e.target.closest('.cart-item-checkbox');
    if (checkbox) {
      updateCartTotal();
      return;
    }
    
    // Обработка клика по кнопке удаления
    const removeBtn = e.target.closest('.cart-remove-btn');
    if (removeBtn) {
      const cartId = removeBtn.dataset.id;
      const row = removeBtn.closest('[data-cart-id]');
      const priceCheckbox = row?.querySelector('.cart-item-checkbox');
      const pid = priceCheckbox?.dataset.productId;
      
      await supabaseClient.from('cart').delete().eq('id', cartId);
      if (pid) {
        delete window.cartQty[String(pid)];
      }
      if (typeof updateCartBadge === 'function') updateCartBadge();
      if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
      renderCurrentScreen(); // Перерисовываем корзину
      return;
    }
  };
  
  document.addEventListener('click', window._cartDelegate);
  
  // Кнопка очистки корзины
  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.onclick = async () => {
      if (!(await tgUtil.confirm('Удалить все товары из корзины?'))) return;
      tgUtil.haptic('warning');
      await supabaseClient.from('cart').delete().eq('user_id', userId);
      window.cartQty = {};
      if (typeof updateCartBadge === 'function') updateCartBadge();
      if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
      renderCurrentScreen();
    };
  }
  
  // Кнопка оформления заказа
  const checkoutBtn = document.getElementById('checkoutCartBtn');
  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      // ПРОВЕРКА НА ПАУЗУ ПЛАТЕЖЕЙ (ФАЗА 1)
      if (window.appSettings && window.appSettings.is_payments_paused) {
        tgUtil.alert(`Оформление заказа временно недоступно.\nПричина: ${window.appSettings.pause_reason}`);
        return;
      }

      const selectedItems = [];
      document.querySelectorAll('.cart-item-checkbox:checked').forEach(cb => {
        const cartRow = cb.closest('[data-cart-id]');
        if (!cartRow) return;

        // Приоритет: актуальное количество из data-атрибута
        let quantity = parseInt(cartRow.dataset.currentQty);
        if (isNaN(quantity) || quantity < 1) {
          // Запасной вариант: чтение из DOM
          const qtySpan = cartRow.querySelector('.cart-qty-display');
          quantity = parseInt(qtySpan?.innerText || '1');
        }
        if (isNaN(quantity) || quantity < 1) quantity = 1;

        selectedItems.push({
          cartId: cartRow.dataset.cartId,
          productId: cb.dataset.productId,
          title: cb.dataset.title,
          price: parseFloat(cb.dataset.price),
          url: cb.dataset.url,
          imageUrl: cb.dataset.imageUrl || '',
          image_url: cb.dataset.imageUrl || '',
          quantity: quantity
        });
      });

      if (selectedItems.length === 0) {
        tgUtil.alert('Выберите хотя бы один товар');
        return;
      }

      // Расчет общей суммы с учетом количества
      const total = selectedItems.reduce((sum, item) => {
        return sum + window.iceLogixPricing.quickEstimate(item.price, 1) * item.quantity;
      }, 0);

      // Отладочный alert (можно оставить или удалить)
      const itemsList = selectedItems.map(item =>
        `${item.title}: ${item.price} × ${item.quantity} = ${(window.iceLogixPricing.quickEstimate(item.price, 1) * item.quantity).toFixed(2)} BYN`
      ).join('\n');
      tgUtil.alert(`Выбрано товаров: ${selectedItems.length}\n${itemsList}\nОбщая сумма: ${total.toFixed(2)} BYN`);

      // Сохранение в глобальную переменную
      window.tempOrder = {
        items: selectedItems,
        total: total,
        discountAmount: 0,
        appliedPromo: null
      };

      // Переход в новый заказ
      currentTab = 'neworder';
      currentSubScreen = null;
      appliedPromo = null;
      renderCurrentScreen();
    };
  }
  
  const retryBtn = document.getElementById('retryCartBtn');
  if (retryBtn) retryBtn.onclick = () => renderCurrentScreen();
}

async function updateCartBadge() {
  if (!userId) return;
  try {
    const { data } = await supabaseClient.from('cart').select('quantity').eq('user_id', userId);
    let count = 0;
    if (data) {
      count = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }
    const badge = document.getElementById('cartBadge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (e) {
    console.error('Failed to update cart badge:', e);
  }
  try {
    const { count } = await supabaseClient.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
      if (count > 0) {
        badge.innerText = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (e) {
    console.error('Failed to update wishlist badge:', e);
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
if (typeof showNotificationsPanel === 'function') window.showNotificationsPanel = showNotificationsPanel;
if (typeof handleAuthSuccess === 'function') window.handleAuthSuccess = handleAuthSuccess;
if (typeof showAuthPage === 'function') window.showAuthPage = showAuthPage;
if (typeof renderCart === 'function') window.renderCart = renderCart;
if (typeof attachCartHandlers === 'function') window.attachCartHandlers = attachCartHandlers;
if (typeof getCartRowQuantity === 'function') window.getCartRowQuantity = getCartRowQuantity;
if (typeof updateCartTotal === 'function') window.updateCartTotal = updateCartTotal;
if (typeof updateCartBadge === 'function') window.updateCartBadge = updateCartBadge;
