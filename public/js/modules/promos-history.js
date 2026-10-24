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
    <div class="page-enter px-4 pb-8 max-w-md mx-auto space-y-4">
      <div class="flex items-center gap-3 mb-2 mt-2">
        <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-white tracking-wide">Акции и бонусы</h2>
          <p class="text-[11px] text-white/40">Скидки, розыгрыши и Колесо Фортуны</p>
        </div>
      </div>
      <div>

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
  const subScreen = window._historySubScreen || 'orders';
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
          ${o.total_price ? `<p class="text-cyan-400 text-sm font-bold mt-1 inline-flex items-baseline gap-1">${o.total_price} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</p>` : ''}
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
        const discountText = p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}`;
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
                <span class="text-cyan-400 font-extrabold text-base font-mono inline-flex items-baseline gap-1">${c.total_byn.toFixed(2)} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span>
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
    <div class="page-enter px-4">
      <div class="flex items-center gap-3 mb-4 mt-2">
        <button id="backFromHistoryBtn" type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-white tracking-wide">История</h2>
          <p class="text-[11px] text-white/40">Архив заказов и транзакций</p>
        </div>
      </div>
      <div class="flex gap-2 mb-5 flex-wrap">
        <button id="historyTabOrders" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'orders' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'orders' ? '' : 'border: 1px solid var(--glass-border);'}">
          📦 Архив
        </button>
        <button id="historyTabTx" class="flex-grow py-2 rounded-xl text-xs font-bold transition-all ${subScreen === 'transactions' ? 'btn-primary' : 'glass-card'}" style="${subScreen === 'transactions' ? '' : 'border: 1px solid var(--glass-border);'}">
          💳 Транзакции
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
          <p class="${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-sm leading-none flex items-center gap-1">${tx.amount >= 0 ? '+' : ''}${tx.amount} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-4 h-4 object-contain inline-block"></span></p>
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

async function renderSettingsPage(initialTab = 'account') {
  // Parallel fetch auth user and user profile
  let authUser = null;
  let data = null;
  try {
    const [authUserDataRes, userProfileRes] = await Promise.all([
      supabaseClient ? supabaseClient.auth.getUser() : Promise.resolve({ data: {} }),
      (supabaseClient && userId) ? supabaseClient.from('users').select('notification_settings, app_settings, telegram_id, phone, username, full_name, role, avatar_url, created_at').eq('user_id', userId).single() : Promise.resolve({ data: {} })
    ]);
    authUser = authUserDataRes?.data?.user;
    data = userProfileRes?.data;
  } catch (_) {}

  const localNotif = JSON.parse(localStorage.getItem('notification_settings') || '{"status_changes":true,"news":true,"promotions":true}');
  const notif = data?.notification_settings || localNotif;
  const appSettings = data?.app_settings || {};
  const currentTheme = appSettings.theme || localStorage.getItem('theme') || 'dark';
  const currentLang = appSettings.lang || localStorage.getItem('lang') || 'ru';

  const userTelegramId = authUser?.user_metadata?.telegram_id || data?.telegram_id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
  const userPhone = authUser?.phone || data?.phone || null;
  const userEmail = authUser?.email || '';
  const isDummyEmail = userEmail.startsWith('tg_') && userEmail.endsWith('@icelogix.by');

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const rawUsername = data?.username || tgUser?.username || authUser?.user_metadata?.user_name || authUser?.user_metadata?.username || '';
  const cleanUsername = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : '@' + rawUsername) : '';

  const userNameDisplay = data?.full_name || authUser?.user_metadata?.full_name || (tgUser?.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : '') || cleanUsername || 'Пользователь';
  const userHandleDisplay = cleanUsername || (userTelegramId ? 'ID: ' + userTelegramId : (!isDummyEmail && userEmail ? userEmail : ''));
  const userAvatar = data?.avatar_url || authUser?.user_metadata?.avatar_url || (tgUser?.photo_url ? tgUser.photo_url : null);
  const isTgSession = !!(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || userTelegramId);
  const idDisplay = userTelegramId ? String(userTelegramId) : (userId ? String(userId).slice(0, 8) + '...' : '—');
  const rawIdForCopy = userTelegramId ? String(userTelegramId) : (userId ? String(userId) : '');
  
  const roleDisplay = data?.role === 'owner' ? 'Админ' : (data?.role === 'partner' ? 'Партнёр' : 'Клиент');
  const roleBadgeClass = data?.role === 'owner' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : (data?.role === 'partner' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30');

  const linkedIdentities = authUser?.identities || [];
  const isGoogleLinked = linkedIdentities.some(id => id.provider === 'google');
  const isAppleLinked = linkedIdentities.some(id => id.provider === 'apple');

  const toggle = (id, checked) => `
    <label class="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" id="${id}" class="sr-only peer" ${checked ? 'checked' : ''}>
      <div class="relative w-11 h-6 bg-white/20 rounded-full transition-colors peer-checked:bg-cyan-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full shadow-inner"></div>
    </label>`;

  // Build Security panel items
  let identitiesHtml = '';

  // Telegram Link (FIRST - priority)
  if (userTelegramId) {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-2xl flex items-center justify-between bg-white/5 border border-white/10">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.19 2.5a24.22 24.22 0 0 0-9 1.56 24.43 24.43 0 0 0-9-1.56c-.53 0-1 .47-1 1a24 24 0 0 0 3.25 12c1.72 2.7 4.19 4.7 7.21 6a.52.52 0 0 0 .39 0c3-.78 5.76-2.58 7.37-5.12A24.08 24.08 0 0 0 22.19 3.5c0-.53-.47-1-1-1z"/></svg>
          </span>
          <div>
            <p class="font-bold text-white text-xs">Telegram аккаунт</p>
            <p class="text-[10px] text-white/50">Привязан к боту ICE LOGIX</p>
          </div>
        </div>
        <span class="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Подключен ✓</span>
      </div>
    `;
  } else {
    identitiesHtml += `
      <div class="space-y-2">
        <button id="linkTelegramBtn" class="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 active:scale-[0.99]">
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.19 2.5a24.22 24.22 0 0 0-9 1.56 24.43 24.43 0 0 0-9-1.56c-.53 0-1 .47-1 1a24 24 0 0 0 3.25 12c1.72 2.7 4.19 4.7 7.21 6a.52.52 0 0 0 .39 0c3-.78 5.76-2.58 7.37-5.12A24.08 24.08 0 0 0 22.19 3.5c0-.53-.47-1-1-1z"/></svg>
            </span>
            <div class="text-left">
              <p class="font-bold text-white text-xs">Привязать Telegram</p>
              <p class="text-[10px] text-cyan-300/70">Для мгновенных пуш-уведомлений</p>
            </div>
          </div>
          <span class="text-xs text-cyan-300 font-bold px-2 py-1 rounded-xl bg-cyan-400/10">Привязать →</span>
        </button>
        <div id="settingsTelegramWidgetContainer" class="hidden flex justify-center p-3 bg-slate-900/60 rounded-2xl border border-white/10"></div>
      </div>
    `;
  }

  // Google Link
  identitiesHtml += `
    <button id="linkGoogleBtn" class="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.99]">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </div>
        <div class="text-left">
          <p class="font-bold text-white text-xs">Google Account</p>
          <p class="text-[10px] text-white/40">Быстрый вход через Gmail</p>
        </div>
      </div>
      <span class="text-xs ${isGoogleLinked ? 'text-emerald-400 font-bold' : 'text-white/50'}">${isGoogleLinked ? 'Подключен ✓' : 'Подключить →'}</span>
    </button>
  `;

  // Apple Link
  identitiesHtml += `
    <button id="linkAppleBtn" class="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.99]">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.365 21.444c-1.332 1.405-2.651 1.4-3.955.086-1.19-1.2-2.316-1.187-3.486 0-1.385 1.4-2.721 1.428-4.043.08-3.036-3.111-4.707-8.31-2.482-12.825 1.134-2.296 3.013-3.714 5.234-3.743 1.572-.016 3.031.975 4.02.975.986 0 2.833-1.182 4.793-1.01 1.637.067 3.125.77 4.148 2.106-3.415 2.115-2.88 6.772.634 8.163-.787 2.111-1.956 4.316-3.863 6.168zM15.426 5.518c-.85.98-2.126 1.611-3.266 1.516-.25-1.428.468-2.85 1.258-3.791.905-1.083 2.304-1.727 3.402-1.631.183 1.428-.48 2.838-1.394 3.906z"/></svg>
        </div>
        <div class="text-left">
          <p class="font-bold text-white text-xs">Apple ID</p>
          <p class="text-[10px] text-white/40">Sign in with Apple</p>
        </div>
      </div>
      <span class="text-xs ${isAppleLinked ? 'text-emerald-400 font-bold' : 'text-white/50'}">${isAppleLinked ? 'Подключен ✓' : 'Подключить →'}</span>
    </button>
  `;

  // Email Link
  if (isDummyEmail) {
    identitiesHtml += `
      <button id="linkEmailBtn" class="w-full py-3 px-4 rounded-2xl flex items-center justify-between transition bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 active:scale-[0.99]">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <div class="text-left">
            <p class="font-bold text-white text-xs">Привязать Email</p>
            <p class="text-[10px] text-indigo-300/70">Для входа с паролем с любого устройства</p>
          </div>
        </div>
        <span class="text-xs text-indigo-300 font-bold px-2 py-1 rounded-xl bg-indigo-400/10">Привязать →</span>
      </button>
    `;
  } else {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-2xl flex items-center justify-between bg-white/5 border border-white/10">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-8 h-8 rounded-xl bg-white/10 text-white/60 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </span>
          <div class="min-w-0">
            <p class="font-bold text-white text-xs">Email</p>
            <p class="text-[10px] text-white/50 truncate">${userEmail}</p>
          </div>
        </div>
        <span class="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">Привязан ✓</span>
      </div>
    `;
  }

  // Phone Link
  if (userPhone) {
    identitiesHtml += `
      <div class="w-full py-3 px-4 rounded-2xl flex items-center justify-between bg-white/5 border border-white/10">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-xl bg-white/10 text-white/60 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </span>
          <div>
            <p class="font-bold text-white text-xs">Телефон</p>
            <p class="text-[10px] text-white/50">${userPhone}</p>
          </div>
        </div>
        <span class="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Подтвержден ✓</span>
      </div>
    `;
  }

  const activeTab = initialTab || window._settingsInitialTab || 'account';

  return `
    <div class="page-enter px-4 max-w-md mx-auto space-y-4">
      <!-- Top Navigation Header -->
      <div class="flex items-center gap-3 mb-4">
        <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-white tracking-wide">Настройки</h2>
          <p class="text-[11px] text-white/40">Управление аккаунтом, защита и персонализация</p>
        </div>
      </div>

      <!-- Segmented Navigation (5 tabs) -->
      <div class="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md mb-2">
        <button class="settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${activeTab==='account'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-tab="account">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="truncate">Аккаунт</span>
        </button>
        <button class="settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${activeTab==='security'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-tab="security">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span class="truncate">Защита</span>
        </button>
        <button class="settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${activeTab==='notifications'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-tab="notifications">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="truncate">Сигналы</span>
        </button>
        <button class="settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${activeTab==='language'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-tab="language">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span class="truncate">Язык</span>
        </button>
        <button class="settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 ${activeTab==='theme'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-tab="theme">
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <span class="truncate">Тема</span>
        </button>
      </div>

      <!-- Panels Container -->
      <div id="settingsPageCard">
        <!-- 0. Account panel -->
        <div id="settingsPanel-account" class="space-y-4 ${activeTab!=='account'?'hidden':''}">
          <!-- Profile summary card -->
          <div class="p-4 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 shadow-lg backdrop-blur-md space-y-3.5">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-white/15 flex items-center justify-center text-cyan-300 font-bold text-lg overflow-hidden flex-shrink-0 shadow-inner">
                ${userAvatar ? `<img src="${userAvatar}" alt="Avatar" class="w-full h-full object-cover">` : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-bold text-white text-sm truncate">${userNameDisplay}</p>
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex-shrink-0">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Активен
                  </span>
                </div>
                <p class="text-xs text-white/50 truncate">${userHandleDisplay}</p>
              </div>
              <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${roleBadgeClass}">
                ${roleDisplay}
              </span>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p class="text-[10px] text-white/40 mb-0.5">ID аккаунта</p>
                <div class="flex items-center justify-between gap-1">
                  <span class="font-mono text-xs font-semibold text-cyan-300 truncate">${idDisplay}</span>
                  <button id="copySettingsIdBtn" data-id="${rawIdForCopy}" class="text-white/40 hover:text-white p-1 rounded transition hover:bg-white/5" title="Скопировать ID">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              </div>
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p class="text-[10px] text-white/40 mb-0.5">Сессия</p>
                <span class="text-xs font-semibold text-white/90 truncate flex items-center gap-1.5">
                  <span class="text-cyan-400 text-sm">⚡</span>
                  ${isTgSession ? 'Telegram App' : 'Браузер'}
                </span>
              </div>
            </div>
          </div>

          <!-- Account Maintenance / Actions -->
          <div class="space-y-2">
            <p class="text-[11px] font-bold text-white/50 uppercase tracking-wider px-1">Управление сеансом</p>
            
            <button id="clearAppCacheBtn" class="w-full py-3 px-3.5 rounded-2xl flex items-center justify-between transition bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.99]">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </span>
                <div class="text-left">
                  <p class="font-bold text-white text-xs">Очистить кэш приложения</p>
                  <p class="text-[10px] text-white/40">Освободить память без сброса авторизации</p>
                </div>
              </div>
              <span class="text-xs text-amber-300 font-semibold px-2 py-1 rounded-lg bg-amber-400/10">Очистить</span>
            </button>

            <button id="settingsLogoutBtn" class="w-full py-3 px-3.5 rounded-2xl flex items-center justify-between transition bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.99]">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-xl bg-white/10 text-white/80 flex items-center justify-center flex-shrink-0">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                <div class="text-left">
                  <p class="font-bold text-white text-xs">Выйти из аккаунта</p>
                  <p class="text-[10px] text-white/40">Завершить текущий сеанс на этом устройстве</p>
                </div>
              </div>
              <span class="text-xs text-white/50 px-2 py-1 rounded-lg bg-white/5">Выйти →</span>
            </button>
          </div>

          <!-- Danger Zone -->
          <div class="rounded-2xl p-4 bg-rose-500/[0.06] border border-rose-500/25 space-y-3">
            <div class="flex items-start gap-2.5">
              <span class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
              <div>
                <p class="font-bold text-rose-300 text-xs">Опасная зона</p>
                <p class="text-[10px] text-rose-200/60 leading-relaxed mt-0.5">
                  Удаление профиля необратимо. Будут полностью аннулированы данные пользователя, история заказов, накопленные бонусы ICE и реферальная сеть.
                </p>
              </div>
            </div>

            <button id="settingsDeleteAccountBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 active:scale-[0.99]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Удалить аккаунт навсегда
            </button>
          </div>
        </div>

        <!-- 1. Security panel -->
        <div id="settingsPanel-security" class="space-y-3 ${activeTab!=='security'?'hidden':''}">
          <p class="text-white/60 text-xs">Способы авторизации и безопасность личного кабинета</p>
          <div class="space-y-2">
            ${identitiesHtml}
          </div>

          ${!isDummyEmail ? `
            <button id="changePasswordBtn" class="w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-left transition bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 active:scale-[0.99]">
              <span class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-white text-xs">Изменить пароль</p>
                <p class="text-[10px] text-white/50">Обновить постоянный пароль</p>
              </div>
              <span class="text-white/40 text-xs">→</span>
            </button>
          ` : ''}

          <button id="securityRecoveryBtn" class="w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-left transition bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 active:scale-[0.99]">
            <span class="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-white text-xs">Код восстановления аккаунта</p>
              <p class="text-[10px] text-white/50">Запасной ключ доступа</p>
            </div>
            <span class="text-rose-400 text-xs">→</span>
          </button>
        </div>

        <!-- 2. Notifications panel -->
        <div id="settingsPanel-notifications" class="space-y-3 ${activeTab!=='notifications'?'hidden':''}">
          <p class="text-white/60 text-xs">Настройка системных оповещений и пуш-уведомлений</p>
          <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white text-xs font-bold">Статусы заказов</p>
                <p class="text-[10px] text-white/40">Выкуп, склад в Китае, доставка в РБ</p>
              </div>
              ${toggle('notifyStatusChanges', notif.status_changes)}
            </div>
            <div class="border-t border-white/5 pt-3 flex items-center justify-between">
              <div>
                <p class="text-white text-xs font-bold">Новости и обновления</p>
                <p class="text-[10px] text-white/40">Новые функции, тарифы и расписание</p>
              </div>
              ${toggle('notifyNews', notif.news)}
            </div>
            <div class="border-t border-white/5 pt-3 flex items-center justify-between">
              <div>
                <p class="text-white text-xs font-bold">Акции и промокоды</p>
                <p class="text-[10px] text-white/40">Персональные скидки на доставку</p>
              </div>
              ${toggle('notifyPromotions', notif.promotions)}
            </div>
          </div>
        </div>

        <!-- 3. Language panel -->
        <div id="settingsPanel-language" class="space-y-3 ${activeTab!=='language'?'hidden':''}">
          <p class="text-white/60 text-xs">Выберите удобный язык интерфейса приложения</p>
          <div class="space-y-2">
            <button class="lang-btn w-full rounded-2xl p-3.5 border-2 transition text-left flex items-center justify-between ${currentLang==='ru'?'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-500/10':'border-white/10 bg-white/5'}" data-lang="ru">
              <div class="flex items-center gap-3">
                <span class="text-xl">🇷🇺</span>
                <div>
                  <p class="text-white text-xs font-bold">Русский</p>
                  <p class="text-[10px] text-white/40">Основной язык</p>
                </div>
              </div>
              <span class="text-xs ${currentLang==='ru'?'text-cyan-400 font-bold':'text-white/30'}">${currentLang==='ru'?'✓ Выбран':''}</span>
            </button>

            <button class="lang-btn w-full rounded-2xl p-3.5 border-2 transition text-left flex items-center justify-between ${currentLang==='be'?'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-500/10':'border-white/10 bg-white/5'}" data-lang="be">
              <div class="flex items-center gap-3">
                <span class="text-xl">🇧🇾</span>
                <div>
                  <p class="text-white text-xs font-bold">Беларуская</p>
                  <p class="text-[10px] text-white/40">Зроблена з любоўю</p>
                </div>
              </div>
              <span class="text-xs ${currentLang==='be'?'text-cyan-400 font-bold':'text-white/30'}">${currentLang==='be'?'✓ Выбран':''}</span>
            </button>

            <button class="lang-btn w-full rounded-2xl p-3.5 border-2 transition text-left flex items-center justify-between ${currentLang==='en'?'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-500/10':'border-white/10 bg-white/5'}" data-lang="en">
              <div class="flex items-center gap-3">
                <span class="text-xl">🇬🇧</span>
                <div>
                  <p class="text-white text-xs font-bold">English</p>
                  <p class="text-[10px] text-white/40">International</p>
                </div>
              </div>
              <span class="text-xs ${currentLang==='en'?'text-cyan-400 font-bold':'text-white/30'}">${currentLang==='en'?'✓ Выбран':''}</span>
            </button>
          </div>
        </div>

        <!-- 4. Theme panel -->
        <div id="settingsPanel-theme" class="space-y-3 ${activeTab!=='theme'?'hidden':''}">
          <p class="text-white/60 text-xs">Цветовая схема оформления интерфейса</p>
          <div class="grid grid-cols-2 gap-3">
            <button class="theme-btn rounded-2xl p-4 border-2 transition text-center ${currentTheme==='dark'?'border-cyan-400 bg-slate-900 shadow-md shadow-cyan-500/15':'border-white/10 bg-white/5'}" data-theme="dark">
              <div class="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 text-xl">
                🌙
              </div>
              <p class="text-white text-xs font-bold">Тёмная (Arctic)</p>
              <p class="text-[10px] text-cyan-300/80 mt-0.5">По умолчанию</p>
            </button>

            <button class="theme-btn rounded-2xl p-4 border-2 transition text-center ${currentTheme==='light'?'border-cyan-400 bg-slate-800 shadow-md shadow-cyan-500/15':'border-white/10 bg-white/5'}" data-theme="light">
              <div class="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 text-xl">
                ☀️
              </div>
              <p class="text-white text-xs font-bold">Светлая</p>
              <p class="text-[10px] text-white/40 mt-0.5">Контрастная</p>
            </button>
          </div>
          <button id="resetSettingsBtn" class="mt-3 w-full text-white/40 hover:text-white/70 text-xs py-2 transition flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Сбросить настройки к заводским
          </button>
        </div>
      </div>
    </div>
    ${typeof renderFooter === 'function' ? renderFooter() : ''}
  `;
}

function attachSettingsPageHandlers(initialTab = 'account') {
  // Helper for saving app_settings to DB in background
  async function persistAppSettings(partial) {
    if (!supabaseClient || !userId) return;
    try {
      const { data } = await supabaseClient.from('users').select('app_settings').eq('user_id', userId).maybeSingle();
      const current = data?.app_settings || {};
      const updated = { ...current, ...partial };
      await supabaseClient.from('users').update({ app_settings: updated }).eq('user_id', userId);
    } catch (e) {
      console.warn('Auto-save app_settings failed:', e);
    }
  }

  // Helper for saving notification_settings to DB in background
  async function persistNotifSettings(newNotif) {
    if (!supabaseClient || !userId) return;
    try {
      await supabaseClient.from('users').update({ notification_settings: newNotif }).eq('user_id', userId);
    } catch (e) {
      console.warn('Auto-save notification_settings failed:', e);
    }
  }

  // Segmented tab switching (5 tabs)
  document.querySelectorAll('.settings-page-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.settings-page-tab').forEach(t => {
        t.className = 'settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
      });
      tab.className = 'settings-page-tab py-2 px-0.5 text-[10px] font-bold rounded-xl transition-all duration-200 flex flex-col items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
      
      const target = tab.dataset.tab;
      window._settingsInitialTab = target;
      ['account', 'security', 'notifications', 'language', 'theme'].forEach(name => {
        const p = document.getElementById(`settingsPanel-${name}`);
        if (p) p.classList.toggle('hidden', name !== target);
      });
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    };
  });

  // Account: Copy ID
  const copyIdBtn = document.getElementById('copySettingsIdBtn');
  if (copyIdBtn) {
    copyIdBtn.onclick = () => {
      const idToCopy = copyIdBtn.dataset.id || '';
      if (idToCopy) {
        navigator.clipboard.writeText(idToCopy).then(() => {
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
          if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
            tgUtil.alert('ID скопирован в буфер: ' + idToCopy);
          }
        }).catch(() => {
          prompt('Ваш ID:', idToCopy);
        });
      }
    };
  }

  // Account: Clear Cache with confirmation
  const clearCacheBtn = document.getElementById('clearAppCacheBtn');
  if (clearCacheBtn) {
    clearCacheBtn.onclick = async () => {
      const confirmed = (typeof tgUtil !== 'undefined' && tgUtil.confirm)
        ? await tgUtil.confirm('Вы действительно хотите очистить кэш приложения? Данные авторизации сохранятся.')
        : confirm('Вы действительно хотите очистить кэш приложения? Данные авторизации сохранятся.');
      if (!confirmed) return;

      try {
        const preserveKeys = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth') || key === 'tg_user_id' || key === 'theme' || key === 'lang')) {
            preserveKeys[key] = localStorage.getItem(key);
          }
        }
        localStorage.clear();
        sessionStorage.clear();
        for (const [k, v] of Object.entries(preserveKeys)) {
          localStorage.setItem(k, v);
        }
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
          tgUtil.alert('✅ Кэш приложения успешно очищен!');
        }
      } catch (e) {
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Не удалось очистить кэш: ' + e.message);
      }
    };
  }

  // Account: Logout
  const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
  if (settingsLogoutBtn) {
    settingsLogoutBtn.onclick = () => {
      if (typeof window.logoutUser === 'function') {
        window.logoutUser();
      }
    };
  }

  // Account: Delete Account
  const settingsDeleteBtn = document.getElementById('settingsDeleteAccountBtn');
  if (settingsDeleteBtn) {
    settingsDeleteBtn.onclick = () => {
      if (typeof window.deleteUserAccount === 'function') {
        window.deleteUserAccount();
      }
    };
  }

  // Theme selection: Instant Auto-Save
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = () => {
      const targetTheme = btn.dataset.theme;
      document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.remove('border-cyan-400', 'shadow-md', 'shadow-cyan-500/15');
        b.classList.add('border-white/10');
      });
      btn.classList.remove('border-white/10');
      btn.classList.add('border-cyan-400', 'shadow-md', 'shadow-cyan-500/15');
      
      localStorage.setItem('theme', targetTheme);
      if (typeof applyTheme === 'function') applyTheme(targetTheme);
      persistAppSettings({ theme: targetTheme });
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
    };
  });

  // Language selection: Instant Auto-Save
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.onclick = () => {
      const targetLang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.remove('border-cyan-400', 'bg-cyan-950/30', 'shadow-md', 'shadow-cyan-500/10');
        b.classList.add('border-white/10', 'bg-white/5');
        const badge = b.querySelector('span:last-child');
        if (badge) { badge.textContent = ''; badge.className = 'text-xs text-white/30'; }
      });
      btn.classList.remove('border-white/10', 'bg-white/5');
      btn.classList.add('border-cyan-400', 'bg-cyan-950/30', 'shadow-md', 'shadow-cyan-500/10');
      const curBadge = btn.querySelector('span:last-child');
      if (curBadge) { curBadge.textContent = '✓ Выбран'; curBadge.className = 'text-xs text-cyan-400 font-bold'; }
      
      localStorage.setItem('lang', targetLang);
      persistAppSettings({ lang: targetLang });
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('selection');
      
      window._settingsInitialTab = 'language';
      if (typeof applyLanguage === 'function') applyLanguage(targetLang);
    };
  });

  // Signals (Notification toggles): Instant Auto-Save
  ['notifyStatusChanges', 'notifyNews', 'notifyPromotions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = () => {
        const sc = document.getElementById('notifyStatusChanges')?.checked ?? true;
        const sn = document.getElementById('notifyNews')?.checked ?? true;
        const sp = document.getElementById('notifyPromotions')?.checked ?? true;
        const newNotif = { status_changes: sc, news: sn, promotions: sp };
        
        localStorage.setItem('notification_settings', JSON.stringify(newNotif));
        persistNotifSettings(newNotif);
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
      };
    }
  });

  // Reset defaults
  const resetBtn = document.getElementById('resetSettingsBtn');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      const confirmed = (typeof tgUtil !== 'undefined' && tgUtil.confirm)
        ? await tgUtil.confirm('Сбросить все настройки приложения к исходным?')
        : confirm('Сбросить все настройки приложения к исходным?');
      if (!confirmed) return;

      const defaultTheme = 'dark';
      const defaultLang = 'ru';
      const defaultNotif = { status_changes: true, news: true, promotions: true };

      localStorage.setItem('theme', defaultTheme);
      localStorage.setItem('lang', defaultLang);
      localStorage.setItem('notification_settings', JSON.stringify(defaultNotif));

      persistAppSettings({ theme: defaultTheme, lang: defaultLang });
      persistNotifSettings(defaultNotif);

      document.querySelectorAll('.theme-btn').forEach(b => {
        b.classList.toggle('border-cyan-400', b.dataset.theme === 'dark');
        b.classList.toggle('border-white/10', b.dataset.theme !== 'dark');
      });
      const sc = document.getElementById('notifyStatusChanges');
      const sn = document.getElementById('notifyNews');
      const sp = document.getElementById('notifyPromotions');
      if (sc) sc.checked = true;
      if (sn) sn.checked = true;
      if (sp) sp.checked = true;

      if (typeof applyTheme === 'function') applyTheme(defaultTheme);
      window._settingsInitialTab = 'theme';
      if (typeof applyLanguage === 'function') applyLanguage(defaultLang);
      if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('medium');
      if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Настройки сброшены к значениям по умолчанию.');
    };
  }

  // Link Google
  const linkGoogle = document.getElementById('linkGoogleBtn');
  if (linkGoogle) {
    linkGoogle.onclick = async () => {
      try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.linkIdentity({ provider: 'google' });
        if (error) throw error;
      } catch (e) {
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Ошибка привязки Google: ' + e.message);
      }
    };
  }

  // Link Apple
  const linkApple = document.getElementById('linkAppleBtn');
  if (linkApple) {
    linkApple.onclick = () => {
      if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Привязка Apple ID будет доступна в следующем обновлении.');
    };
  }

  // Link Email
  const linkEmail = document.getElementById('linkEmailBtn');
  if (linkEmail) {
    linkEmail.onclick = async () => {
      const email = prompt('Введите ваш Email для привязки:');
      if (!email) return;
      const password = prompt('Придумайте пароль для входа (минимум 6 символов):');
      if (!password || password.length < 6) {
        if (password && typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пароль слишком короткий.');
        return;
      }
      try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.updateUser({ email, password });
        if (error) throw error;
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Email для подтверждения отправлен. Пожалуйста, подтвердите его.');
        location.reload();
      } catch (e) {
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Ошибка привязки Email: ' + e.message);
      }
    };
  }

  // Link Telegram
  const linkTelegram = document.getElementById('linkTelegramBtn');
  if (linkTelegram) {
    linkTelegram.onclick = () => {
      const widgetContainer = document.getElementById('settingsTelegramWidgetContainer');
      if (!widgetContainer) return;
      
      if (widgetContainer.classList.contains('hidden')) {
        widgetContainer.classList.remove('hidden');
        widgetContainer.innerHTML = '<p class="text-white/40 text-xs py-2">Загрузка виджета Telegram...</p>';
        
        window.onTelegramSettingsAuth = async function(user) {
          try {
            if (!supabaseClient) return;
            const { data: existing } = await supabaseClient.from('users')
              .select('user_id')
              .eq('telegram_id', user.id)
              .maybeSingle();
              
            if (existing) {
              if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Этот Telegram-аккаунт уже привязан к другому профилю.');
              return;
            }
            
            const { error } = await supabaseClient.from('users').update({
              telegram_id: user.id,
              username: user.username || null,
              full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
            }).eq('user_id', userId);
            
            if (error) throw error;
            if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Telegram успешно привязан!');
            if (typeof switchTab === 'function') switchTab('settings');
          } catch(e) {
            if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Ошибка привязки Telegram: ' + e.message);
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

  // Change Password
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.onclick = async () => {
      const newPassword = prompt('Введите новый пароль (минимум 6 символов):');
      if (!newPassword) return;
      if (newPassword.length < 6) {
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пароль слишком короткий. Минимум 6 символов.');
        return;
      }
      const confirmPassword = prompt('Повторите новый пароль:');
      if (!confirmPassword) return;
      if (newPassword !== confirmPassword) {
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Пароли не совпадают.');
        return;
      }
      try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('success');
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('✅ Пароль успешно изменён!');
      } catch(e) {
        if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('error');
        if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Ошибка смены пароля: ' + e.message);
      }
    };
  }

  // Account Recovery
  const recoveryBtn = document.getElementById('securityRecoveryBtn');
  if (recoveryBtn) {
    recoveryBtn.onclick = () => {
      if (typeof showRecoveryCodeModal === 'function') showRecoveryCodeModal();
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

  return `
    <div class="page-enter px-4 max-w-md mx-auto space-y-4">
      <!-- Top Navigation Header -->
      <div class="flex items-center justify-between mb-4">
        <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="text-center flex-1 px-2 min-w-0">
          <h2 class="text-xl font-bold text-white tracking-wide flex items-center justify-center gap-1.5 truncate">
            Уведомления
            <span id="notifBadgeCounter" class="${unreadCount > 0 ? '' : 'hidden'} ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">${unreadCount}</span>
          </h2>
          <p class="text-[11px] text-white/40 truncate">Статусы заказов, новости и бонусы</p>
        </div>
        <button id="markAllNotifsReadBtn" class="text-xs font-bold text-cyan-400 hover:text-cyan-300 py-1.5 px-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 active:scale-95 transition flex-shrink-0">
          Все прочтены
        </button>
      </div>

      <!-- Segmented Category Filters -->
      <div class="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md mb-2">
        <button class="notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center ${activeFilter==='all'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-filter="all">Все</button>
        <button class="notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center ${activeFilter==='orders'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-filter="orders">Заказы 📦</button>
        <button class="notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center ${activeFilter==='news'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-filter="news">Новости 📢</button>
        <button class="notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center ${activeFilter==='promos'?'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20':'text-white/60 hover:text-white hover:bg-white/5 active:scale-95'}" data-filter="promos">Акции 🎁</button>
      </div>

      <!-- Notification List Container -->
      <div id="notifsContainer" class="space-y-2.5">
        ${renderNotifsItemsHtml(notifications, activeFilter)}
      </div>
    </div>
    ${typeof renderFooter === 'function' ? renderFooter() : ''}
  `;
}

function renderNotifsItemsHtml(items, filter = 'all') {
  if (!items || items.length === 0) {
    return `
      <div class="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-2xl select-none">
          🔔
        </div>
        <p class="text-sm font-bold text-white">Уведомлений пока нет</p>
        <p class="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
          Здесь будут отображаться этапы доставки ваших заказов, персональные скидки и важные новости сервиса.
        </p>
      </div>
    `;
  }

  let filtered = items;
  if (filter === 'orders') {
    filtered = items.filter(n => {
      const txt = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
      return txt.includes('заказ') || txt.includes('посылк') || txt.includes('трек') || txt.includes('выкуп') || txt.includes('склад');
    });
  } else if (filter === 'news') {
    filtered = items.filter(n => {
      const txt = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
      return txt.includes('новост') || txt.includes('обновлен') || txt.includes('режим') || txt.includes('тариф');
    });
  } else if (filter === 'promos') {
    filtered = items.filter(n => {
      const txt = ((n.title || '') + ' ' + (n.body || '')).toLowerCase();
      return txt.includes('промо') || txt.includes('скидк') || txt.includes('бонус') || txt.includes('акци') || txt.includes('купон');
    });
  }

  if (filtered.length === 0) {
    return `
      <div class="text-center py-10 px-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
        <p class="text-xs font-bold text-white/60">В этом разделе нет уведомлений</p>
      </div>
    `;
  }

  return filtered.map(n => {
    const isUnread = !n.is_read;
    const bodyText = n.body || '';
    const titleText = n.title || 'Уведомление';
    const lower = (titleText + ' ' + bodyText).toLowerCase();
    
    let icon = '🔔';
    let iconBg = 'bg-cyan-500/15 text-cyan-400';
    if (lower.includes('заказ') || lower.includes('посылк') || lower.includes('трек')) {
      icon = '📦';
      iconBg = 'bg-blue-500/15 text-blue-400';
    } else if (lower.includes('промо') || lower.includes('скидк') || lower.includes('бонус')) {
      icon = '🎁';
      iconBg = 'bg-amber-500/15 text-amber-400';
    } else if (lower.includes('оплат') || lower.includes('баланс') || lower.includes('карт')) {
      icon = '💳';
      iconBg = 'bg-emerald-500/15 text-emerald-400';
    }

    let dateStr = '';
    try {
      dateStr = new Date(n.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (_) {}

    return `
      <div class="p-3.5 rounded-2xl transition-all duration-200 ${
        isUnread
          ? 'bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
          : 'bg-white/5 border border-white/5 hover:border-white/10'
      }">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
            ${icon}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-0.5">
              <p class="text-white text-xs font-bold truncate">${titleText}</p>
              ${isUnread ? '<span class="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 shadow-sm shadow-cyan-400"></span>' : ''}
            </div>
            ${bodyText ? `<p class="text-white/70 text-xs leading-relaxed break-words">${bodyText}</p>` : ''}
            <div class="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
              <p class="text-white/35 text-[10px] font-mono">${dateStr}</p>
              ${lower.includes('заказ') ? `
                <button class="text-[10px] font-bold text-cyan-400 hover:text-cyan-300" onclick="if(typeof switchTab==='function')switchTab('profile');">
                  Перейти к заказам →
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
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
      document.querySelectorAll('.notif-filter-tab').forEach(b => {
        b.className = 'notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center text-white/60 hover:text-white hover:bg-white/5 active:scale-95';
      });
      btn.className = 'notif-filter-tab py-2 px-1 text-[11px] font-bold rounded-xl transition-all duration-200 text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-white/20';
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
            badge.className = (freshUnread.length > 0 ? '' : 'hidden') + ' ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm';
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
