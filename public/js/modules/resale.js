// ============================================================
// ICE LOGIX Module: ICE Resale & Group Delivery
// ============================================================
// ==================== ФАЗА 18: ICE Resale и Совместная доставка ====================

// Заявка «Вещи от клиентов»: шторка с формой → RPC resale_submit (поддержка проверяет, потом вещь попадает в каталог)
window.publishToResale = (orderId, orderTitle, orderTotal) => {
  const U = window.UI;
  if (!U || !window.supabaseClient) return;
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
  const toast = (msg, kind) => (typeof glassToast === 'function' ? glassToast(msg, { kind }) : U.toast(msg));
  const files = [];
  const total = Number(orderTotal || 0);
  const hint = total > 0
    ? `<p class="rd-ask-text">Вы заплатили за заказ ${U.money(total, { keepCents: true, digits: 2 })} ${window.bynSign ? window.bynSign() : ''}. Цену ставите вы, комиссии нет: покупатель платит ровно столько, сколько вы укажете.</p>`
    : '<p class="rd-ask-text">Цену ставите вы, комиссии нет: покупатель платит ровно столько, сколько вы укажете.</p>';
  const field = (label, inner) => `<label class="rd-ask-field"><span class="rd-label">${label}</span><span class="rd-field">${inner}</span></label>`;
  const html = `
    <form class="rd-ask" novalidate>
      <p class="rd-ask-text">Не подошёл размер или цвет? Расскажите о вещи — мы проверим заявку и покажем её другим клиентам.</p>
      ${field('Название', `<input name="title" type="text" maxlength="120" value="${U.esc(orderTitle || '')}" autocomplete="off">`)}
      <div class="rd-ask-field">
        <span class="rd-label">Фото (от 1 до 8)</span>
        <div class="rs-photos" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button type="button" class="rd-btn rd-btn-ghost rs-add">${U.icon('plus', 18)}Добавить фото</button>
          <span class="rs-count rd-label"></span>
        </div>
        <input class="rs-file" type="file" accept="image/*" multiple hidden>
      </div>
      ${field('Размер', '<input name="size" type="text" maxlength="20" placeholder="Например, 42 или M" autocomplete="off">')}
      ${field('Состояние', `<select name="condition">
        <option value="">Выберите</option>
        <option value="new_tags">Новое, с бирками</option>
        <option value="new">Новое, без бирок</option>
        <option value="excellent">Отличное</option>
        <option value="good">Хорошее</option>
      </select>`)}
      ${field('Бренд (необязательно)', '<input name="brand" type="text" maxlength="60" autocomplete="off">')}
      ${field('Описание (необязательно)', '<textarea name="description" rows="3" maxlength="1000" placeholder="Что важно знать покупателю"></textarea>')}
      ${hint}
      ${field(`Цена, ${window.bynSign ? window.bynSign() : ''}`, '<input name="price" type="text" inputmode="decimal" placeholder="0" autocomplete="off">')}
      <p class="rd-ask-err" hidden></p>
      <button type="submit" class="rd-btn rd-btn-block">Отправить на проверку</button>
    </form>`;
  U.sheet({
    title: 'Помочь продать',
    html,
    onOpen: (wrap, close) => {
      const form = wrap.querySelector('form');
      const err = wrap.querySelector('.rd-ask-err');
      const fileInp = wrap.querySelector('.rs-file');
      const count = wrap.querySelector('.rs-count');
      const submit = form.querySelector('button[type="submit"]');
      const showErr = (m) => { err.textContent = m; err.hidden = !m; };
      const upd = () => { count.textContent = files.length ? `Выбрано: ${files.length}` : ''; };
      wrap.querySelector('.rs-add').addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', () => {
        Array.from(fileInp.files || []).forEach((f) => { if (files.length < 8 && /^image\//.test(f.type)) files.push(f); });
        fileInp.value = '';
        upd();
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = {};
        ['title', 'size', 'condition', 'brand', 'description', 'price'].forEach((n) => { v[n] = (form.elements[n].value || '').trim(); });
        const price = Number(String(v.price).replace(',', '.'));
        if (v.title.length < 3) return showErr('Укажите название вещи');
        if (!files.length) return showErr('Добавьте хотя бы одно фото');
        if (!v.condition) return showErr('Выберите состояние');
        if (!(price > 0) || price > 100000) return showErr('Укажите цену');
        showErr('');
        submit.disabled = true;
        submit.textContent = 'Отправляем…';
        try {
          let sessionId = localStorage.getItem('icelogix_session_id');
          if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem('icelogix_session_id', sessionId); }
          const photos = [];
          for (const f of files) {
            const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
            const path = `${sessionId}/${Date.now()}_resale_${safe}`;
            const { error: upErr } = await window.supabaseClient.storage.from('product-screenshots').upload(path, f, { contentType: f.type, upsert: false });
            if (upErr) throw new Error('Не удалось загрузить фото');
            photos.push(path);
          }
          const { error } = await window.supabaseClient.rpc('resale_submit', {
            p_order: orderId, p_title: v.title, p_description: v.description || null, p_price: price,
            p_size: v.size || null, p_condition: v.condition, p_brand: v.brand || null, p_photos: photos,
          });
          if (error) throw error;
          toast('Заявка отправлена. Мы проверим её и сообщим в приложении', 'success');
          close();
          if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
        } catch (ex) {
          showErr(ex.message || 'Не получилось отправить, попробуйте ещё раз');
          submit.disabled = false;
          submit.textContent = 'Отправить на проверку';
        }
      });
    },
  });
};

window.withdrawResale = async (id) => {
  if (!window.supabaseClient) return;
  const { error } = await window.supabaseClient.rpc('resale_withdraw', { p_id: id });
  if (error) { if (typeof glassToast === 'function') glassToast(error.message, { kind: 'error' }); return; }
  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

async function renderResale() {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) {
    tgUtil.haptic('light');
  }

  return `
    <div class="space-y-4 page-enter">
      <div class="flex items-center gap-3 mb-4 mt-2">
        <button type="button" class="global-back-btn !mb-0" onclick="switchTab('catalogs')" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white tracking-wide">ICE Resale</h2>
          <p class="text-[11px] text-white/40">Товары в наличии и совместная доставка</p>
        </div>
      </div>

      <div class="glass-card p-6 text-center flex flex-col items-center relative overflow-hidden my-3 border border-pink-500/25">
        <div class="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-pink-500/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div class="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative" style="background: linear-gradient(135deg, rgba(77, 163, 255,0.25), rgba(219,39,119,0.12)); border: 1px solid rgba(77, 163, 255,0.35);">
          <span class="text-4xl text-pink-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </span>
          <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-black shadow-lg">
            ⏳
          </span>
        </div>

        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 mb-3 tracking-wider uppercase">
          <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
          Раздел в разработке
        </div>

        <h2 class="text-xl font-black text-white mb-2">ICE Resale <span class="text-pink-400">(Наличие)</span></h2>
        <p class="text-sm text-white/70 max-w-sm leading-relaxed mb-6">
          Сервис покупки и продажи оригинальных вещей между клиентами с минимальной комиссией всего 2% готовится к открытию. Скоро вы сможете продавать свои вещи и покупать товары из наличия с моментальной доставкой!
        </p>

        <div class="w-full space-y-2.5 max-w-sm mb-6 text-left">
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center font-bold text-base flex-shrink-0">🤝</div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Безопасная сделка</p>
              <p class="text-[11px] text-white/50 mt-0.5">Деньги переводятся продавцу только после подтверждения получения</p>
            </div>
          </div>
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-base flex-shrink-0">💸</div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Минимальная комиссия 2%</p>
              <p class="text-[11px] text-white/50 mt-0.5">Честные и прозрачные условия продажи вещей между пользователями</p>
            </div>
          </div>
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-base flex-shrink-0">📦</div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Быстрая доставка</p>
              <p class="text-[11px] text-white/50 mt-0.5">Вещи из наличия отправляются в течение 1–2 дней по РБ и РФ</p>
            </div>
          </div>
        </div>

        <button onclick="switchTab('catalogs')" class="btn-primary w-full max-w-sm py-3 rounded-xl text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white transition-all flex items-center justify-center gap-2">
          <span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
          Вернуться к каталогам
        </button>
      </div>
      ${typeof renderFooter === 'function' ? renderFooter() : ''}
    </div>
  `;
}

// Global Exports
if (typeof renderResale === 'function') window.renderResale = renderResale;
