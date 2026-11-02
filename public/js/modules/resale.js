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
    ? `<p class="rd-ask-text">Вы заплатили за заказ ${U.money(total, { keepCents: true })} ${window.bynSign ? window.bynSign() : ''}. Цену ставите вы, комиссии нет: покупатель платит ровно столько, сколько вы укажете.</p>`
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

const RS_COND = { new_tags: 'Новое, с бирками', new: 'Новое, без бирок', excellent: 'Отличное', good: 'Хорошее' };
const rsPhoto = (path) => {
  if (!path || !window.supabaseClient) return '';
  return window.supabaseClient.storage.from('product-screenshots').getPublicUrl(path).data.publicUrl;
};

async function renderResale() {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
  const U = window.UI;
  const head = `
    <div class="rd-head">
      <button type="button" class="rd-back" onclick="window.goBackGlobal ? window.goBackGlobal() : switchTab('catalogs')" aria-label="Назад">${U.icon('chevL', 22)}</button>
      <div class="rd-head-txt"><h1 class="rd-head-title">Вещи от клиентов</h1><p class="rd-head-sub">Проверено командой ICE LOGIX</p></div>
    </div>`;
  try {
    const sb = window.supabaseClient;
    const [catRes, subRes, myRes] = await Promise.all([
      sb.rpc('resale_catalog'),
      sb.from('resale_subscriptions').select('user_id').limit(1),
      sb.rpc('resale_my_purchases'),
    ]);
    const mine = (myRes.data || []).map((m) => `<div class="rd-row" style="cursor:default"><span class="rd-row-body"><span class="rd-row-title">${U.esc(m.title)}</span><span class="rd-row-text">${U.money(Number(m.price_byn), { keepCents: true })} · деньги у нас, ждём вашего подтверждения</span></span><button type="button" class="rd-btn" onclick="resaleConfirm('${m.id}')">Получил</button></div>`).join('');
    const mineBlock = mine ? `<div class="rd-card rd-list" style="margin-bottom:16px">${mine}</div>` : '';
    if (catRes.error) throw catRes.error;
    const items = catRes.data || [];
    window._resaleItems = items;
    const subscribed = !!(subRes.data && subRes.data.length);
    const subBtn = subscribed
      ? `<button type="button" class="rd-btn rd-btn-ghost rd-btn-block" onclick="resaleSubscribe(false)">${U.icon('check', 18)}Вы подписаны — отключить</button>`
      : `<button type="button" class="rd-btn rd-btn-block" onclick="resaleSubscribe(true)">${U.icon('bell', 18)}Сообщить о новых вещах</button>`;

    if (!items.length) {
      const steps = [
        ['camera', 'Клиент выкупил вещь', 'Не подошёл размер или цвет — он выставляет её здесь.'],
        ['shield', 'Мы проверяем', 'Смотрим фото и состояние, только потом показываем всем.'],
        ['wallet', 'Деньги в безопасности', 'Оплата с баланса ICE LOGIX. Продавцу деньги уходят после того, как вы получили вещь.'],
      ].map(([ic, t, tx]) => `<div class="rd-row" style="cursor:default"><span class="rd-ico">${U.icon(ic, 22)}</span><span class="rd-row-body"><span class="rd-row-title">${t}</span><span class="rd-row-text">${tx}</span></span></div>`).join('');
      return `<div class="rd-screen page-enter">${head}
        ${mineBlock}${U.empty({ icon: 'tag', title: 'Пока нет вещей', text: 'Как только клиенты выставят новые вещи, они появятся здесь. Мы можем сообщить вам первыми.' })}
        <div style="margin-top:4px">${subBtn}</div>
        <div class="rd-card rd-list" style="margin-top:20px">${steps}</div>
      </div>${typeof renderFooter === 'function' ? renderFooter() : ''}`;
    }
    const cards = items.map((it) => {
      const ph = Array.isArray(it.photos) && it.photos[0] ? rsPhoto(it.photos[0]) : '';
      const fresh = it.approved_at && (Date.now() - new Date(it.approved_at).getTime()) < 7 * 864e5;
      return `<button type="button" class="rs-card" onclick="resaleOpen('${it.id}')">
        <span class="rs-img">${ph ? `<img src="${U.esc(ph)}" alt="" loading="lazy" decoding="async">` : U.icon('tag', 28)}${fresh ? '<span class="rd-status ok rs-new">Новинка</span>' : ''}</span>
        <span class="rs-price">${U.money(Number(it.price_byn), { keepCents: true })}</span>
        <span class="rs-name">${U.esc(it.title)}</span>
        <span class="rs-meta">${it.size ? 'Размер ' + U.esc(it.size) : ''}${it.size && it.condition ? ' · ' : ''}${U.esc(RS_COND[it.condition] || '')}</span>
      </button>`;
    }).join('');
    return `<div class="rd-screen page-enter">${head}
      ${mineBlock}<div class="rs-grid">${cards}</div>
      <div style="margin-top:18px">${subBtn}</div>
    </div>${typeof renderFooter === 'function' ? renderFooter() : ''}`;
  } catch (e) {
    console.error(e);
    return `<div class="rd-screen page-enter">${head}${U.empty({ icon: 'alert', title: 'Не удалось загрузить', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Повторить', onclick: 'renderCurrentScreen()' })}</div>`;
  }
}

window.resaleSubscribe = async (on) => {
  const { error } = await window.supabaseClient.rpc('resale_subscribe', { p_on: !!on });
  const toast = (m, k) => window.UI.toast(m, k);
  if (error) return toast(error.message, 'error');
  toast(on ? 'Готово. Сообщим, когда появятся новые вещи' : 'Уведомления отключены', 'success');
  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

window.resaleOpen = (id) => {
  const U = window.UI;
  const it = (window._resaleItems || []).find((x) => x.id === id);
  if (!it) return;
  const photos = (Array.isArray(it.photos) ? it.photos : []).map(rsPhoto).filter(Boolean);
  const price = U.money(Number(it.price_byn), { keepCents: true });
  const rows = [['Размер', it.size], ['Состояние', RS_COND[it.condition]], ['Бренд', it.brand]]
    .filter((r) => r[1]).map((r) => `<div class="rs-kv"><span>${r[0]}</span><b>${U.esc(r[1])}</b></div>`).join('');
  U.sheet({
    title: U.esc(it.title),
    html: `
      ${photos.length ? `<div class="rs-gal">${photos.map((u) => `<img src="${U.esc(u)}" alt="" decoding="async">`).join('')}</div>` : ''}
      <div class="rs-detail">
        <div class="rs-dprice">${price}</div>
        ${rows}
        ${it.description ? `<p class="rd-ask-text">${U.esc(it.description)}</p>` : ''}
        <p class="rd-ask-text">Комиссии нет. Деньги списываются с баланса и уходят продавцу только после того, как вы получите вещь.</p>
        <button type="button" class="rd-btn rd-btn-block rs-buy">Купить за ${price}</button>
      </div>`,
    onOpen: (wrap, close) => {
      wrap.querySelector('.rs-buy').addEventListener('click', () => { close(); window.resaleBuy(id); });
    },
  });
};

window.resaleBuy = async (id) => {
  const U = window.UI;
  const { error } = await window.supabaseClient.rpc('resale_buy', { p_id: id });
  if (error) {
    U.toast(error.message, 'error');
    if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
    return;
  }
  U.toast('Куплено. Деньги у нас — продавцу они уйдут, когда вы получите вещь', 'success');
  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

window.resaleConfirm = async (id) => {
  const U = window.UI;
  const { error } = await window.supabaseClient.rpc('resale_confirm', { p_id: id });
  if (error) return U.toast(error.message, 'error');
  U.toast('Спасибо! Сделка завершена', 'success');
  if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
};

// Global Exports
if (typeof renderResale === 'function') window.renderResale = renderResale;
