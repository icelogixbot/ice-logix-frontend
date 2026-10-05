// ============================================================
// ICE LOGIX Module: ICE Resale & Group Delivery
// ============================================================
// ==================== ФАЗА 18: ICE Resale и Совместная доставка ====================

window.publishToResale = async (orderId, orderTitle) => {
  if (!userId) return tgUtil.alert('Необходима авторизация');
  
  const ok = await tgUtil.confirm('Введите цену продажи в BYN:\nКомиссия платформы 2% будет удержана при успешной сделке. Продолжить?');
  if (!ok) return;
  
  // Для надежности используем встроенный prompt браузера (работает в WebApp)
  const price = prompt('Введите цену продажи в BYN:');
  if (!price || isNaN(parseFloat(price))) return;
  
  const desc = prompt('Добавьте комментарий для покупателей (например, "Не подошел размер, маломерят"):');
  if (desc === null) return;
  
  tgUtil.haptic('light');
  glassToast('Отправка на модерацию...', { kind: 'info' });
  
  try {
    const { error } = await supabaseClient.from('resale_items').insert({
      user_id: userId,
      order_id: orderId,
      title: orderTitle || 'Товар из заказа',
      price_byn: parseFloat(price),
      description: desc,
      status: 'pending'
    });
    if (error) throw error;
    
    tgUtil.haptic('success');
    glassToast('Товар успешно отправлен на модерацию!', { kind: 'success' });
  } catch(e) {
    console.error(e);
    tgUtil.alert('Ошибка публикации: ' + e.message);
  }
};

async function renderResale() {
  tgUtil.haptic('light');
  if (!userId) return '<p class="text-center mt-10 text-red-400">Авторизуйтесь</p>';
  
  try {
    const { data, error } = await supabaseClient.from('resale_items').select('*, users(username, full_name)').eq('status', 'approved').order('created_at', { ascending: false });
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
        <button class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors" onclick="switchTab('catalogs')">
          <span class="ix text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span>
        </button>
        <h2 class="text-xl font-black text-white uppercase tracking-wider">ICE Resale <span class="text-pink-400">Наличие</span></h2>
      </div>
      <p class="text-xs text-white/50 mb-4 bg-white/5 p-3 rounded-xl">Покупайте новые оригинальные вещи напрямую у других клиентов, которым не подошел размер, по сниженным ценам. Комиссия сервиса — всего 2% за продажу.</p>
    `;
    
    if (!data || data.length === 0) {
      html += '<p class="text-center mt-10 text-white/70">В пристрое пока нет товаров</p>';
    } else {
      html += '<div class="grid grid-cols-2 gap-3">';
      html += data.map(item => `
        <div class="glass-card flex flex-col relative overflow-hidden">
          <div class="absolute top-2 right-2 bg-pink-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-pink-400 backdrop-blur-md z-20">В наличии</div>
          <div class="relative">
            ${renderCardMedia(getResaleImages(item), item.title)}
          </div>
          <div class="p-3 flex-1 flex flex-col">
            <p class="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">${item.title}</p>
            <p class="text-xs text-white/70 mb-2 line-clamp-2">${item.description || ''}</p>
            <p class="text-cyan-400 font-bold mb-2 mt-auto">${item.price_byn} BYN</p>
            <div class="flex items-center gap-1 text-[10px] text-white/50">
              <span class="ix" style="width:12px;height:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              ${item.users?.username ? '@' + item.users.username : (item.users?.full_name || 'Продавец')}
            </div>
          </div>
          <button class="w-full py-2.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-xs font-bold transition-colors border-t border-pink-500/30" onclick="window.open('https://t.me/${item.users?.username || ''}', '_blank')">Связаться</button>
        </div>
      `).join('');
      html += '</div>';
    }
    return html;
  } catch (e) {
    return `<p class="text-red-400 text-center mt-5">Ошибка загрузки: ${e.message}</p>`;
  }
}


// Global Exports
if (typeof renderResale === 'function') window.renderResale = renderResale;
