/* ICE LOGIX — Админка, экран «Витрина» (этап 5а): Товары, Площадки, Акции, Дропы.
   Логика (таблицы, поля, бакеты, проверки) перенесена из старого admin.js, вид — по ice-design-system.
   Разделы собираются из реестра AD.store: AD.store.addSection(id, title, icon, renderFn, countFn?)
   Другие файлы (admin-store-promo.js: Промокоды, Бонусы, Рассылка) добавляют свои вкладки так же.
     renderFn(host, ctx) — рисует раздел в host. ctx: {alive(), reload(), cta(label, run), setCount(n), host}
     countFn() — необязательно, число для подписи вкладки (можно вернуть промис). */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD) return;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);

  // ══════════════════ Реестр разделов ══════════════════
  const sections = [];
  const store = (AD.store = AD.store || {});
  store.sections = sections;
  store.addSection = function (id, title, icon, renderFn, countFn) {
    const ex = sections.find((s) => s.id === id);
    if (ex) Object.assign(ex, { title, icon, render: renderFn, count: countFn });
    else sections.push({ id, title, icon, render: renderFn, count: countFn });
    if (document.getElementById('adStoreChips')) paintChips();
  };
  store.reload = () => { if (document.getElementById('adStoreBody')) openSection(cur); };

  let cur = 'products';
  let token = 0;
  const counts = {};

  function chipsHtml() {
    return sections.map((s) => {
      const n = counts[s.id];
      return `<button type="button" class="rd-chip${s.id === cur ? ' on' : ''}" data-sec="${esc(s.id)}">${esc(s.title)}${n ? ` · ${n}` : ''}</button>`;
    }).join('');
  }
  function paintChips() {
    const box = document.getElementById('adStoreChips');
    if (!box) return;
    box.innerHTML = chipsHtml();
    box.querySelectorAll('[data-sec]').forEach((b) => {
      b.onclick = () => { if (b.dataset.sec === cur) return; haptic('light'); openSection(b.dataset.sec); };
    });
  }

  function openSection(id) {
    const s = sections.find((x) => x.id === id) || sections[0];
    const host = document.getElementById('adStoreBody');
    if (!s || !host) return;
    cur = s.id;
    const my = ++token;
    AD.clearCta();
    paintChips();
    host.innerHTML = '';
    const ctx = {
      host,
      alive: () => my === token && document.getElementById('adStoreBody') === host,
      reload: () => { if (my === token) openSection(s.id); },
      cta: (label, run) => { if (my === token) AD.mountCta({ label, run }, 'adStoreRoot'); },
      setCount: (n) => { counts[s.id] = n; if (my === token) paintChips(); },
    };
    try { s.render(host, ctx); } catch (e) {
      AD.showError(host, 'Раздел не открылся', AD.errorText(e), () => openSection(s.id));
    }
    if (typeof s.count === 'function' && counts[s.id] == null) {
      Promise.resolve().then(s.count).then((n) => { if (n != null && ctx.alive()) ctx.setCount(Number(n) || 0); }).catch(() => {});
    }
  }

  // ══════════════════ Общие помощники ══════════════════
  class VErr extends Error {}   // понятная ошибка проверки формы — показываем как есть
  const bad = (m) => { throw new VErr(m); };

  async function loadInto(host, ctx, fetchFn, paint) {
    host.innerHTML = AD.loadingHtml(3);
    let rows;
    try {
      const r = await fetchFn();
      if (r.error) throw r.error;
      rows = r.data || [];
    } catch (e) {
      if (!ctx.alive()) return;
      AD.showError(host, 'Не получилось загрузить', AD.errorText(e), () => loadInto(host, ctx, fetchFn, paint));
      return;
    }
    if (!ctx.alive()) return;
    paint(rows);
  }

  function logAct(action, details) {
    try { if (typeof logAdminAction === 'function') logAdminAction(action, details); } catch (e) { /* журнал не мешает работе */ }
  }
  function bustProducts() {
    try { if (window.CacheDB) CacheDB.clear('popularProducts'); } catch (e) { /* кэш не обязателен */ }
    try { if (typeof _tabCache !== 'undefined') { delete _tabCache['home:']; delete _tabCache['catalogs:']; } } catch (e) { /* ок */ }
  }
  function bustMarkets() {
    try { if (window.CacheDB) CacheDB.clear('marketplaces'); } catch (e) { /* ок */ }
    try { if (typeof _tabCache !== 'undefined') { delete _tabCache['home:']; delete _tabCache['catalogs:']; } } catch (e) { /* ок */ }
  }

  const fld = (label, inner, hint) =>
    `<label class="rd-ask-field"><span class="rd-label">${esc(label)}</span><span class="rd-field">${inner}</span>${hint ? `<span class="ad-hint">${esc(hint)}</span>` : ''}</label>`;
  const inp = (name, o = {}) =>
    `<input name="${name}" type="${o.type || 'text'}" value="${esc(o.value == null ? '' : o.value)}" placeholder="${esc(o.ph || '')}"${o.mode ? ` inputmode="${o.mode}"` : ''}${o.step ? ` step="${o.step}"` : ''} autocomplete="off">`;
  const area = (name, value, ph, rows) =>
    `<textarea name="${name}" rows="${rows || 3}" placeholder="${esc(ph || '')}">${esc(value || '')}</textarea>`;
  const sw = (name, label, on, hint) =>
    `<label class="ad-st-sw"><span class="ad-st-sw-t"><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><span class="rd-switch"><input type="checkbox" name="${name}"${on ? ' checked' : ''}><span></span></span></label>`;
  const choice = (name, label, opts, sel, multi) =>
    `<div class="rd-ask-field"><span class="rd-label">${esc(label)}</span><div class="ad-cat-chips" data-chips="${name}" data-multi="${multi ? 1 : 0}">${
      opts.map(([v, t]) => `<button type="button" class="rd-chip${sel.includes(v) ? ' on' : ''}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div></div>`;

  const chipVals = (form, name) =>
    Array.from(form.querySelectorAll(`[data-chips="${name}"] .rd-chip.on`)).map((b) => b.dataset.v);
  const val = (form, name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
  const checked = (form, name) => !!(form.elements[name] && form.elements[name].checked);

  function bindChips(form) {
    form.querySelectorAll('[data-chips]').forEach((box) => {
      const multi = box.dataset.multi === '1';
      box.querySelectorAll('.rd-chip').forEach((b) => {
        b.onclick = () => {
          haptic('light');
          if (multi) b.classList.toggle('on');
          else { box.querySelectorAll('.rd-chip').forEach((x) => x.classList.toggle('on', x === b)); }
        };
      });
    });
  }

  // Шторка с формой. «Сохранить» — в липком низу: видна при любой прокрутке и с клавиатурой.
  // o: {title, body, submit, extra, save(form)→промис, onOpen(form, wrap)}
  function openForm(o) {
    return U().sheet({
      title: o.title,
      html: `<form class="rd-ask ad-form ad-st-form" novalidate>${o.body}<p class="rd-ask-err" hidden></p>
        <div class="ad-st-foot"><button type="submit" class="rd-btn rd-btn-block" data-submit>${esc(o.submit || 'Сохранить')}</button></div></form>`,
      onOpen: (wrap, close) => {
        const form = wrap.querySelector('form');
        const err = form.querySelector('.rd-ask-err');
        const btn = form.querySelector('[data-submit]');
        bindChips(form);
        form.addEventListener('focusin', (e) => {
          if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox') {
            setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* ок */ } }, 320);
          }
        });
        if (o.onOpen) o.onOpen(form, wrap, close);
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          err.hidden = true;
          btn.disabled = true;
          try {
            await o.save(form);
            haptic('success');
            close();
          } catch (x) {
            err.textContent = x instanceof VErr ? x.message : AD.errorText(x, 'Не получилось сохранить. Попробуйте ещё раз.');
            err.hidden = false;
            haptic('error');
          }
          btn.disabled = false;
        });
      },
    });
  }

  // Загрузка одной картинки по кнопке: возвращает ссылку
  function pickFiles(multiple) {
    return new Promise((resolve) => {
      const f = document.createElement('input');
      f.type = 'file'; f.accept = 'image/*'; f.multiple = !!multiple;
      f.style.display = 'none';
      f.onchange = () => { const list = Array.from(f.files || []); f.remove(); resolve(list); };
      document.body.appendChild(f);
      f.click();
    });
  }

  // Блок фото в форме: urls — массив ссылок, max — сколько можно, up(file)→ссылка
  function photoBlock(form, holderId, urls, max, up, label) {
    const holder = form.querySelector('#' + holderId);
    const st = { urls, busy: 0 };
    const paint = () => {
      holder.innerHTML = st.urls.map((u, i) =>
        `<div class="ad-st-ph"><img src="${esc(u)}" alt="" loading="lazy"><button type="button" class="ad-st-ph-x" data-rm="${i}" aria-label="Убрать фото">${I('x', 14)}</button></div>`).join('') +
        (st.urls.length + st.busy < max
          ? `<button type="button" class="ad-st-ph ad-st-ph-add" data-add="1" aria-label="${esc(label)}">${I('camera', 22)}<span>${st.busy ? 'Загружаем…' : esc(label)}</span></button>` : '');
      holder.querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => { st.urls.splice(Number(b.dataset.rm), 1); paint(); }; });
      const add = holder.querySelector('[data-add]');
      if (add) add.onclick = async () => {
        const files = (await pickFiles(max > 1)).slice(0, max - st.urls.length - st.busy);
        for (const file of files) {
          st.busy++; paint();
          try { st.urls.push(await up(file)); } catch (e) { AD.fail(e, 'Фото не загрузилось'); }
          st.busy--; paint();
        }
      };
    };
    paint();
    return st;
  }

  const imgsOf = (v) => {
    try { if (typeof getProductImages === 'function') return getProductImages(v) || []; } catch (e) { /* ниже запасной разбор */ }
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const s = String(v).trim();
    if (s.startsWith('[')) { try { const a = JSON.parse(s); if (Array.isArray(a)) return a.filter(Boolean); } catch (e) { /* одна ссылка */ } }
    return [s];
  };

  const thumb = (url, icon) =>
    `<span class="ad-thumb ad-thumb-sm">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : I(icon, 20)}</span>`;

  // Помощники для соседних файлов (admin-store-promo.js)
  store.kit = { VErr, bad, loadInto, logAct, fld, inp, area, sw, choice, chipVals, val, checked, openForm, thumb };

  async function updateField(table, id, patch, okText) {
    const { error } = await sb().from(table).update(patch).eq('id', id);
    if (error) throw error;
    if (okText) U().toast(okText, 'ok');
  }

  // ══════════════════ Товары ══════════════════
  const CATS = ['Обувь', 'Одежда', 'Аксессуары'];
  const catOpts = CATS.map((c) => [c, c]);
  let prodFilter = 'all';
  let prodRows = [];

  const price = (p) => `${esc(String(p.price == null ? 0 : p.price))} ${esc(p.currency === 'CNY' || !p.currency ? '¥' : p.currency)}`;

  function renderProducts(host, ctx) {
    ctx.cta('Добавить товар', () => productForm(null, ctx));
    loadInto(host, ctx,
      () => sb().from('products').select('*').order('created_at', { ascending: false }),
      (rows) => { prodRows = rows; ctx.setCount(rows.length); paintProducts(host, ctx); });
  }

  function paintProducts(host, ctx) {
    const f = prodFilter;
    const rows = prodRows.filter((p) => f === 'home' ? p.show_on_home : f === 'drop' ? p.is_drop : true);
    const seg = `<div class="fn-seg ad-seg" id="adStProdSeg">${[['all', 'Все'], ['home', 'На главной'], ['drop', 'Дропы']]
      .map(([k, t]) => `<button type="button" data-f="${k}" class="${f === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    let body;
    if (!prodRows.length) {
      body = AD.emptyHtml({ icon: 'box', title: 'Товаров пока нет', text: 'Добавьте первый товар: он появится в каталоге и, если включить, на главной.', action: 'Добавить товар', actionId: 'adStEmptyAdd' });
    } else if (!rows.length) {
      body = AD.emptyHtml({ icon: 'search', title: 'Здесь пусто', text: 'Под этот фильтр ничего не подходит. Переключите вкладку выше.' });
    } else {
      body = `<div class="rd-card rd-list">${rows.map((p) => {
        const ph = imgsOf(p.image_url)[0];
        const off = p.is_active === false;
        return `<div class="rd-row" role="button" tabindex="0" data-id="${esc(p.id)}">
          ${thumb(ph, 'box')}
          <span class="rd-row-body">
            <span class="rd-row-title">${esc(p.title || 'Без названия')}${off ? ' <span class="rd-status warn">Скрыт</span>' : ''}</span>
            <span class="rd-row-text">${price(p)}${p.brand ? ' · ' + esc(p.brand) : ''}${p.category ? ' · ' + esc(p.category) : ''}</span>
            <span class="ad-st-tg">
              <button type="button" class="rd-chip${p.show_on_home ? ' on' : ''}" data-tg="show_on_home" data-id="${esc(p.id)}">На главной</button>
              <button type="button" class="rd-chip${p.is_drop ? ' on' : ''}" data-tg="is_drop" data-id="${esc(p.id)}">Дроп</button>
            </span>
          </span></div>`;
      }).join('')}</div>`;
    }
    host.innerHTML = (prodRows.length ? seg : '') + body;
    const add = host.querySelector('#adStEmptyAdd');
    if (add) add.onclick = () => productForm(null, ctx);
    host.querySelectorAll('#adStProdSeg [data-f]').forEach((b) => {
      b.onclick = () => { haptic('light'); prodFilter = b.dataset.f; paintProducts(host, ctx); };
    });
    host.querySelectorAll('.rd-row[data-id]').forEach((r) => {
      r.onclick = () => productForm(prodRows.find((p) => String(p.id) === r.dataset.id), ctx);
    });
    host.querySelectorAll('[data-tg]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const p = prodRows.find((x) => String(x.id) === b.dataset.id);
        if (!p) return;
        const k = b.dataset.tg;
        const next = !p[k];
        b.disabled = true;
        try {
          await updateField('products', p.id, { [k]: next });
          p[k] = next; bustProducts(); haptic('light');
          b.classList.toggle('on', next);
        } catch (x) { AD.fail(x, 'Не получилось переключить'); }
        b.disabled = false;
      };
    });
  }

  function productForm(p, ctx) {
    const edit = !!p;
    const urls = edit ? imgsOf(p.image_url).slice(0, 8) : [];
    let ph;
    openForm({
      title: edit ? 'Товар' : 'Новый товар',
      body: `
        ${fld('Название', inp('title', { value: edit ? p.title : '', ph: 'Например, кроссовки Nike Dunk' }))}
        ${fld('Цена в юанях', inp('price', { value: edit ? p.price : '', ph: '0', mode: 'decimal', type: 'number', step: '0.01' }))}
        ${choice('category', 'Категория', catOpts, [edit && p.category ? p.category : 'Обувь'], false)}
        ${fld('Бренд', inp('brand', { value: edit ? p.brand : '', ph: 'Необязательно' }))}
        ${fld('Ссылка на товар', inp('url', { value: edit ? p.url : '', ph: 'https://…', type: 'url' }))}
        ${fld('Описание', area('description', edit ? p.description : '', 'Коротко о товаре', 3))}
        <div class="rd-ask-field"><span class="rd-label">Фото (до 8, нужно хотя бы одно)</span><div class="ad-st-photos" id="adStPhotos"></div></div>
        ${sw('show_on_home', 'Показывать на главной', edit && p.show_on_home)}
        ${sw('is_drop', 'Товар из дропа', edit && p.is_drop, 'Появится в разделе дропов')}
        ${edit ? '<button type="button" class="rd-btn rd-btn-danger rd-btn-block ad-gap" data-del>Удалить товар</button>' : ''}`,
      onOpen: (form, wrap, close) => {
        ph = photoBlock(form, 'adStPhotos', urls, 8, (f) => (typeof uploadProductImage === 'function' ? uploadProductImage(f) : bad('Загрузка фото сейчас недоступна')), 'Добавить фото');
        const del = form.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await AD.confirmSheet('Удалить товар?', `«${p.title || 'Товар'}» пропадёт из каталога. Вернуть его не получится.`, 'Удалить', true))) return;
          try {
            const { error } = await sb().from('products').delete().eq('id', p.id);
            if (error) throw error;
            logAct('delete_product', { id: p.id, title: p.title });
            bustProducts(); U().toast('Товар удалён', 'ok'); close(); ctx.reload();
          } catch (x) { AD.fail(x, 'Не получилось удалить'); }
        };
      },
      save: async (form) => {
        const title = val(form, 'title');
        const priceN = parseFloat(String(val(form, 'price')).replace(',', '.'));
        if (!title) bad('Напишите название товара.');
        if (!isFinite(priceN) || priceN < 0 || !val(form, 'price')) bad('Укажите цену числом.');
        if (ph.busy) bad('Подождите, фото ещё загружается.');
        if (!ph.urls.length) bad('Добавьте хотя бы одно фото.');
        const rec = {
          title, price: priceN,
          description: val(form, 'description'),
          category: chipVals(form, 'category')[0] || 'Обувь',
          brand: val(form, 'brand'),
          image_url: ph.urls.length > 1 ? JSON.stringify(ph.urls) : ph.urls[0],
          url: val(form, 'url'),
          is_drop: checked(form, 'is_drop'),
          show_on_home: checked(form, 'show_on_home'),
        };
        if (edit) {
          const { error } = await sb().from('products').update(rec).eq('id', p.id);
          if (error) throw error;
          logAct('update_product', { id: p.id, title, price: priceN, is_drop: rec.is_drop });
        } else {
          const { error } = await sb().from('products').insert({ ...rec, currency: 'CNY', is_active: true });
          if (error) throw error;
          logAct('create_product', { title, category: rec.category, price: priceN, is_drop: rec.is_drop });
        }
        bustProducts();
        U().toast(edit ? 'Товар сохранён' : 'Товар добавлен', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Площадки ══════════════════
  const MK_CATS = catOpts;
  const MK_GENDER = [['Муж', 'Муж'], ['Жен', 'Жен'], ['Унисекс', 'Унисекс']];
  let mkRows = [];

  function renderMarkets(host, ctx) {
    ctx.cta('Добавить площадку', () => marketForm(null, ctx));
    loadInto(host, ctx,
      () => sb().from('marketplaces').select('*').order('sort_order', { ascending: true }),
      (rows) => {
        mkRows = rows; ctx.setCount(rows.length);
        if (!rows.length) {
          host.innerHTML = AD.emptyHtml({ icon: 'store', title: 'Площадок пока нет', text: 'Здесь живут магазины, откуда клиенты заказывают. Добавьте первую: название, сайт и страну.', action: 'Добавить площадку', actionId: 'adStEmptyAdd' });
          host.querySelector('#adStEmptyAdd').onclick = () => marketForm(null, ctx);
          return;
        }
        host.innerHTML = `<div class="rd-card rd-list">${rows.map((m) => `
          <div class="rd-row" role="button" tabindex="0" data-id="${esc(m.id)}">
            ${thumb(m.logo_url, 'store')}
            <span class="rd-row-body">
              <span class="rd-row-title">${esc(m.name || 'Без названия')}${m.is_active === false ? ' <span class="rd-status warn">Выключена</span>' : ''}${m.requires_vpn ? ' <span class="rd-status">VPN</span>' : ''}</span>
              <span class="rd-row-text">${esc(m.country || 'Страна не указана')}${Array.isArray(m.categories) && m.categories.length ? ' · ' + esc(m.categories.join(', ')) : ''}</span>
              <span class="ad-st-tg"><button type="button" class="rd-chip${m.show_on_home ? ' on' : ''}" data-tg="show_on_home" data-id="${esc(m.id)}">На главной</button></span>
            </span></div>`).join('')}</div>`;
        host.querySelectorAll('.rd-row[data-id]').forEach((r) => {
          r.onclick = () => marketForm(mkRows.find((m) => String(m.id) === r.dataset.id), ctx);
        });
        host.querySelectorAll('[data-tg]').forEach((b) => {
          b.onclick = async (e) => {
            e.stopPropagation();
            const m = mkRows.find((x) => String(x.id) === b.dataset.id);
            if (!m) return;
            const next = !m.show_on_home;
            b.disabled = true;
            try { await updateField('marketplaces', m.id, { show_on_home: next }); m.show_on_home = next; bustMarkets(); haptic('light'); b.classList.toggle('on', next); }
            catch (x) { AD.fail(x, 'Не получилось переключить'); }
            b.disabled = false;
          };
        });
      });
  }

  async function uploadLogo(file) {
    const safe = String(file.name || 'logo.png').replace(/[^\w.\-]+/g, '_');
    const path = `logos/${Date.now()}_${safe}`;
    const { error } = await sb().storage.from('marketplace-logos').upload(path, file);
    if (error) throw new Error('Логотип не загрузился: ' + error.message);
    return sb().storage.from('marketplace-logos').getPublicUrl(path).data.publicUrl;
  }

  function marketForm(m, ctx) {
    const edit = !!m;
    let logo;
    openForm({
      title: edit ? 'Площадка' : 'Новая площадка',
      body: `
        ${fld('Название', inp('name', { value: edit ? m.name : '', ph: 'Например, Poizon' }))}
        ${fld('Сайт', inp('website_url', { value: edit ? m.website_url : '', ph: 'https://…', type: 'url' }))}
        ${fld('Страна', inp('country', { value: edit ? m.country : '', ph: 'Китай' }))}
        ${fld('Суть одной строкой', inp('tagline', { value: edit ? m.tagline : '', ph: 'Оригиналы с проверкой подлинности' }), 'Показывается под названием в карточке.')}
        ${fld('Плашки', inp('badges', { value: edit && Array.isArray(m.badges) ? m.badges.join(', ') : '', ph: 'Оригиналы, Ресейл, Кроссовки' }), 'Через запятую, до трёх штук.')}
        ${fld('Описание', area('description', edit ? m.description : '', 'Что покупают на этой площадке', 3))}
        ${fld('Шаги «как заказать»', area('steps', edit && Array.isArray(m.steps) ? m.steps.join('\n') : '', 'Каждый шаг с новой строки', 5), 'Если пусто, клиент увидит общие шаги.')}
        ${fld('Приложение в App Store', inp('app_ios_url', { value: edit ? m.app_ios_url : '', ph: 'https://apps.apple.com/cn/app/…', type: 'url' }), 'Ссылка для iPhone (китайский App Store).')}
        ${fld('Приложение в Google Play', inp('app_android_url', { value: edit ? m.app_android_url : '', ph: 'https://play.google.com/store/apps/details?id=…', type: 'url' }), 'Для Android. Если приложения нет в Play — оставьте пустым, откроется сайт.')}
        ${fld('Подсказки по регистрации', area('register_steps', edit && Array.isArray(m.register_steps) ? m.register_steps.join('\n') : '', 'Каждый шаг с новой строки', 4), 'Показываются клиенту в мастере после установки приложения.')}
        ${fld('Заметка в инструкции', area('instruction', edit ? m.instruction : '', 'Необязательно: важное замечание под шагами', 3))}
        ${fld('Сложность (1–3)', inp('difficulty', { value: edit && m.difficulty ? m.difficulty : '', ph: '1 — легко, 3 — сложно', type: 'number', mode: 'numeric' }))}
        ${choice('categories', 'Категории', MK_CATS, edit && Array.isArray(m.categories) ? m.categories : [], true)}
        ${choice('gender', 'Для кого', MK_GENDER, edit && Array.isArray(m.gender) ? m.gender : [], true)}
        <div class="rd-ask-field"><span class="rd-label">Логотип</span><div class="ad-st-photos" id="adStLogo"></div></div>
        ${fld('Порядок в списке', inp('sort_order', { value: edit ? (m.sort_order == null ? 0 : m.sort_order) : 0, type: 'number', mode: 'numeric' }), 'Чем меньше число, тем выше площадка.')}
        ${sw('requires_vpn', 'Нужен VPN', edit && m.requires_vpn)}
        ${sw('needs_cn_account', 'Нужен китайский аккаунт', edit && m.needs_cn_account)}
        ${sw('is_active', 'Площадка включена', edit ? m.is_active !== false : true)}
        ${sw('show_on_home', 'Показывать на главной', edit && m.show_on_home)}
        ${edit ? '<button type="button" class="rd-btn rd-btn-danger rd-btn-block ad-gap" data-del>Удалить площадку</button>' : ''}`,
      onOpen: (form, wrap, close) => {
        logo = photoBlock(form, 'adStLogo', edit && m.logo_url ? [m.logo_url] : [], 1, uploadLogo, 'Загрузить');
        const del = form.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await AD.confirmSheet('Удалить площадку?', `«${m.name || 'Площадка'}» пропадёт из списка. Вернуть её не получится.`, 'Удалить', true))) return;
          try {
            const { error } = await sb().from('marketplaces').delete().eq('id', m.id);
            if (error) throw error;
            logAct('delete_marketplace', { id: m.id, name: m.name });
            bustMarkets(); U().toast('Площадка удалена', 'ok'); close(); ctx.reload();
          } catch (x) { AD.fail(x, 'Не получилось удалить'); }
        };
      },
      save: async (form) => {
        const name = val(form, 'name');
        let site = val(form, 'website_url');
        const country = val(form, 'country');
        if (!name) bad('Напишите название площадки.');
        if (!site) bad('Укажите сайт площадки.');
        if (!country) bad('Укажите страну.');
        if (!/^https?:\/\//i.test(site)) site = 'https://' + site;
        if (logo.busy) bad('Подождите, логотип ещё загружается.');
        const so = parseInt(val(form, 'sort_order'), 10);
        const df = parseInt(val(form, 'difficulty'), 10);
        const rec = {
          name, website_url: site, country,
          description: val(form, 'description'),
          instruction: val(form, 'instruction'),
          tagline: val(form, 'tagline') || null,
          badges: val(form, 'badges').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 3),
          app_ios_url: val(form, 'app_ios_url') || null,
          app_android_url: val(form, 'app_android_url') || null,
          register_steps: val(form, 'register_steps').split('\n').map((x) => x.trim()).filter(Boolean),
          steps: val(form, 'steps').split('\n').map((x) => x.trim()).filter(Boolean),
          difficulty: df >= 1 && df <= 3 ? df : null,
          needs_cn_account: checked(form, 'needs_cn_account'),
          categories: chipVals(form, 'categories'),
          gender: chipVals(form, 'gender'),
          requires_vpn: checked(form, 'requires_vpn'),
          logo_url: logo.urls[0] || null,
          sort_order: isFinite(so) ? so : 0,
          is_active: checked(form, 'is_active'),
          show_on_home: checked(form, 'show_on_home'),
        };
        const q = edit ? sb().from('marketplaces').update(rec).eq('id', m.id) : sb().from('marketplaces').insert(rec);
        const { error } = await q;
        if (error) throw error;
        logAct(edit ? 'update_marketplace' : 'create_marketplace', { name });
        bustMarkets();
        U().toast(edit ? 'Площадка сохранена' : 'Площадка добавлена', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Акции ══════════════════
  let prRows = [];

  function promoState(p) {
    if (typeof window.isPromotionLive === 'function') {
      try {
        const live = window.isPromotionLive(p);
        if (live) return ['ok', 'Идёт'];
      } catch (e) { /* считаем сами ниже */ }
    }
    const now = Date.now();
    if (p.is_active === false) return ['', 'Выключена'];
    if (p.starts_at && new Date(p.starts_at).getTime() > now) return ['warn', 'Ещё не началась'];
    if (p.expires_at && new Date(p.expires_at).getTime() < now) return ['bad', 'Закончилась'];
    return ['ok', 'Идёт'];
  }
  const discountText = (p) => p.discount_type === 'fixed' ? '−' + AD.money(p.discount_value) : '−' + (Number(p.discount_value) || 0) + '%';
  const period = (p) => {
    const a = p.starts_at ? AD.dateTime(p.starts_at) : '';
    const b = p.expires_at ? AD.dateTime(p.expires_at) : '';
    return a || b ? `${a || 'сразу'} — ${b || 'без срока'}` : 'Без срока';
  };
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };
  const fromLocalInput = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };

  function renderPromos(host, ctx) {
    ctx.cta('Добавить бонус', () => promoForm(null, ctx));
    loadInto(host, ctx,
      () => sb().from('promotions').select('*').order('created_at', { ascending: false }),
      (rows) => {
        prRows = rows; ctx.setCount(rows.length);
        const note = `<div class="ad-note">${I('info', 18)}<div><b>Бонус только рассказывает</b><p>Скидка в заказе работает через промокод. Создайте его в разделе «Промокоды».</p></div></div>`;
        if (!rows.length) {
          host.innerHTML = AD.emptyHtml({ icon: 'tag', title: 'Бонусов пока нет', text: 'Бонус — это баннер и условия для клиентов. Добавьте первую, когда будет что предложить.', action: 'Добавить бонус', actionId: 'adStEmptyAdd' }) + note;
          host.querySelector('#adStEmptyAdd').onclick = () => promoForm(null, ctx);
          return;
        }
        host.innerHTML = `<div class="rd-card rd-list">${rows.map((p) => {
          const [cls, txt] = promoState(p);
          return `<div class="rd-row" role="button" tabindex="0" data-id="${esc(p.id)}">
            ${thumb(p.banner_url, 'tag')}
            <span class="rd-row-body">
              <span class="rd-row-title">${esc(p.title || 'Без названия')} <span class="rd-status ${cls}">${txt}</span></span>
              <span class="rd-row-text">${discountText(p)} · ${esc(period(p))}</span>
            </span></div>`;
        }).join('')}</div>${note}`;
        host.querySelectorAll('.rd-row[data-id]').forEach((r) => {
          r.onclick = () => promoForm(prRows.find((p) => String(p.id) === r.dataset.id), ctx);
        });
      });
  }

  function promoForm(p, ctx) {
    const edit = !!p;
    let banner;
    openForm({
      title: edit ? 'Бонус' : 'Новый бонус',
      body: `
        ${fld('Название', inp('title', { value: edit ? p.title : '', ph: 'Например, Чёрная пятница' }))}
        ${fld('Описание', area('description', edit ? p.description : '', 'Условия простыми словами', 3))}
        <div class="rd-ask-field"><span class="rd-label">Баннер</span><div class="ad-st-photos" id="adStBanner"></div></div>
        ${choice('discount_type', 'Тип скидки', [['percent', 'Проценты'], ['fixed', 'Фиксированная']], [edit && p.discount_type === 'fixed' ? 'fixed' : 'percent'], false)}
        ${fld('Размер скидки', inp('discount_value', { value: edit ? p.discount_value : '', ph: '0', type: 'number', mode: 'decimal', step: '0.01' }))}
        ${fld('Минимальная сумма заказа', inp('min_order_amount', { value: edit ? (p.min_order_amount || 0) : 0, type: 'number', mode: 'decimal', step: '0.01' }))}
        ${fld('Начало', inp('starts_at', { value: edit ? toLocalInput(p.starts_at) : '', type: 'datetime-local' }), 'Пусто — сразу.')}
        ${fld('Конец', inp('expires_at', { value: edit ? toLocalInput(p.expires_at) : '', type: 'datetime-local' }), 'Пусто — без срока.')}
        ${fld('Сколько раз можно применить', inp('usage_limit', { value: edit && p.usage_limit != null ? p.usage_limit : '', type: 'number', mode: 'numeric', ph: 'Без ограничений' }))}
        ${fld('Текст пуша', area('push_text', edit ? p.push_text : '', 'Пусто — пуш не отправляем', 2))}
        ${fld('За сколько минут до начала слать пуш', inp('push_minutes_before', { value: edit && p.push_minutes_before != null ? p.push_minutes_before : 60, type: 'number', mode: 'numeric' }))}
        ${sw('is_active', 'Бонус включён', edit ? p.is_active !== false : true)}
        ${edit ? sw('push_again', 'Отправить пуш заново', false, 'Пуш уйдёт ещё раз в назначенное время') : ''}
        ${edit ? '<button type="button" class="rd-btn rd-btn-danger rd-btn-block ad-gap" data-del>Удалить бонус</button>' : ''}`,
      onOpen: (form, wrap, close) => {
        banner = photoBlock(form, 'adStBanner', edit && p.banner_url ? [p.banner_url] : [], 1, (f) => (typeof uploadProductImage === 'function' ? uploadProductImage(f) : bad('Загрузка фото сейчас недоступна')), 'Загрузить');
        const del = form.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await AD.confirmSheet('Удалить бонус?', `«${p.title || 'Бонус'}» пропадёт у клиентов. Вернуть её не получится.`, 'Удалить', true))) return;
          try {
            const { error } = await sb().from('promotions').delete().eq('id', p.id);
            if (error) throw error;
            logAct('delete_promotion', { id: p.id, title: p.title });
            U().toast('Бонус удалён', 'ok'); close(); ctx.reload();
          } catch (x) { AD.fail(x, 'Не получилось удалить'); }
        };
      },
      save: async (form) => {
        const title = val(form, 'title');
        const dv = parseFloat(String(val(form, 'discount_value')).replace(',', '.'));
        if (!title) bad('Напишите название бонуса.');
        if (!isFinite(dv) || dv <= 0) bad('Укажите размер скидки числом больше нуля.');
        const type = chipVals(form, 'discount_type')[0] || 'percent';
        if (type === 'percent' && dv > 100) bad('Скидка в процентах не может быть больше 100.');
        if (banner.busy) bad('Подождите, баннер ещё загружается.');
        const starts = fromLocalInput(val(form, 'starts_at'));
        const ends = fromLocalInput(val(form, 'expires_at'));
        if (starts && ends && new Date(ends) <= new Date(starts)) bad('Конец бонуса должен быть позже начала.');
        const ul = parseInt(val(form, 'usage_limit'), 10);
        const pm = parseInt(val(form, 'push_minutes_before'), 10);
        const mo = parseFloat(String(val(form, 'min_order_amount')).replace(',', '.'));
        const rec = {
          title,
          description: val(form, 'description'),
          banner_url: banner.urls[0] || null,
          discount_type: type,
          discount_value: dv,
          min_order_amount: isFinite(mo) && mo > 0 ? mo : 0,
          starts_at: starts,
          expires_at: ends,
          usage_limit: isFinite(ul) && ul > 0 ? ul : null,
          is_active: checked(form, 'is_active'),
          push_text: val(form, 'push_text') || null,
          push_minutes_before: isFinite(pm) && pm >= 0 ? pm : 60,
        };
        if (edit) {
          if (checked(form, 'push_again')) rec.push_sent = false;
          const { error } = await sb().from('promotions').update(rec).eq('id', p.id);
          if (error) throw error;
          logAct('update_promotion', { id: p.id, title });
        } else {
          const { error } = await sb().from('promotions').insert({ ...rec, push_sent: false });
          if (error) throw error;
          logAct('create_promotion', { title });
        }
        U().toast(edit ? 'Бонус сохранён' : 'Бонус добавлен', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Дропы ══════════════════
  const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const DROP_KEYS = ['drop_weekday', 'drop_hour', 'drop_minute', 'drop_duration_min', 'drop_enabled', 'drop_tz'];
  let dropCfg = {};
  let dropRows = [];

  const sv = (v) => (v == null ? '' : String(v).replace(/"/g, ''));
  function dropWindow() {
    const c = dropCfg;
    const wd = Math.min(7, Math.max(1, parseInt(c.drop_weekday || '6', 10) || 6));
    const hh = String(parseInt(c.drop_hour || '20', 10) || 0).padStart(2, '0');
    const mm = String(parseInt(c.drop_minute || '0', 10) || 0).padStart(2, '0');
    return { wd, hh, mm, dur: parseInt(c.drop_duration_min || '60', 10) || 60, on: c.drop_enabled !== 'false', tz: c.drop_tz || 'Europe/Minsk' };
  }

  function renderDrops(host, ctx) {
    ctx.cta('Настроить окно дропа', () => dropForm(ctx));
    loadInto(host, ctx,
      async () => {
        const [s, p] = await Promise.all([
          sb().from('settings').select('key, value').in('key', DROP_KEYS),
          sb().from('products').select('id, title, is_drop, is_active, image_url, price, currency').order('created_at', { ascending: false }).limit(100),
        ]);
        if (s.error) return { error: s.error };
        if (p.error) return { error: p.error };
        return { data: { s: s.data || [], p: p.data || [] } };
      },
      (d) => {
        dropCfg = {};
        d.s.forEach((r) => { dropCfg[r.key] = sv(r.value); });
        dropRows = d.p.slice().sort((a, b) => (b.is_drop ? 1 : 0) - (a.is_drop ? 1 : 0));
        ctx.setCount(dropRows.filter((x) => x.is_drop).length);
        paintDrops(host, ctx);
      });
  }

  function paintDrops(host, ctx) {
    const w = dropWindow();
    const win = `<div class="rd-card ad-pad">
      <div class="rd-row-title">${I('flame', 18)} Окно дропа ${w.on ? '<span class="rd-status ok">Включён</span>' : '<span class="rd-status warn">Выключен</span>'}</div>
      <p class="rd-row-text">Каждый день недели: ${esc(WEEKDAYS[w.wd - 1].toLowerCase())}, в ${w.hh}:${w.mm}. Длится ${w.dur} мин. Часовой пояс: ${esc(w.tz)}.</p></div>`;
    let list;
    if (!dropRows.length) {
      list = AD.emptyHtml({ icon: 'box', title: 'Товаров для дропа нет', text: 'Сначала добавьте товары в разделе «Товары», потом отметьте здесь, какие идут в дроп.' });
    } else {
      list = `<div class="rd-card rd-list">${dropRows.map((p) => `
        <div class="rd-row ad-static">
          ${thumb(imgsOf(p.image_url)[0], 'box')}
          <span class="rd-row-body">
            <span class="rd-row-title">${esc(p.title || 'Без названия')}${p.is_active === false ? ' <span class="rd-status warn">Скрыт</span>' : ''}</span>
            <span class="rd-row-text">${esc(String(p.price == null ? 0 : p.price))} ¥</span>
          </span>
          <label class="rd-switch" aria-label="В дропе"><input type="checkbox" data-drop="${esc(p.id)}"${p.is_drop ? ' checked' : ''}><span></span></label>
        </div>`).join('')}</div>`;
    }
    host.innerHTML = win + `<p class="ad-hint ad-pad">Товары в дропе</p>` + list;
    host.querySelectorAll('[data-drop]').forEach((c) => {
      c.onchange = async () => {
        const p = dropRows.find((x) => String(x.id) === c.dataset.drop);
        if (!p) return;
        const next = c.checked;
        c.disabled = true;
        try {
          await updateField('products', p.id, { is_drop: next });
          p.is_drop = next; bustProducts(); haptic('light');
          ctx.setCount(dropRows.filter((x) => x.is_drop).length);
        } catch (x) { c.checked = !next; AD.fail(x, 'Не получилось переключить'); }
        c.disabled = false;
      };
    });
  }

  function dropForm(ctx) {
    const w = dropWindow();
    openForm({
      title: 'Окно дропа',
      body: `
        ${sw('enabled', 'Дроп включён', w.on, 'Выключите, чтобы временно остановить дропы')}
        ${choice('weekday', 'День недели', WEEKDAYS.map((n, i) => [String(i + 1), n]), [String(w.wd)], false)}
        ${fld('Час начала (0–23)', inp('hour', { value: parseInt(w.hh, 10), type: 'number', mode: 'numeric' }))}
        ${fld('Минуты начала (0–59)', inp('minute', { value: parseInt(w.mm, 10), type: 'number', mode: 'numeric' }))}
        ${fld('Сколько длится, минут', inp('duration', { value: w.dur, type: 'number', mode: 'numeric' }), 'Часовой пояс ' + w.tz + ' меняется только на сервере.')}`,
      save: async (form) => {
        const hour = parseInt(val(form, 'hour'), 10);
        const minute = parseInt(val(form, 'minute'), 10);
        const dur = parseInt(val(form, 'duration'), 10);
        if (!isFinite(hour) || hour < 0 || hour > 23) bad('Час начала — число от 0 до 23.');
        if (!isFinite(minute) || minute < 0 || minute > 59) bad('Минуты начала — число от 0 до 59.');
        if (!isFinite(dur) || dur < 1 || dur > 1440) bad('Длительность — от 1 до 1440 минут.');
        const rows = [
          { key: 'drop_weekday', value: chipVals(form, 'weekday')[0] || '6' },
          { key: 'drop_hour', value: String(hour) },
          { key: 'drop_minute', value: String(minute) },
          { key: 'drop_duration_min', value: String(dur) },
          { key: 'drop_enabled', value: checked(form, 'enabled') ? 'true' : 'false' },
        ];
        const { error } = await sb().rpc('admin_save_content_settings', { p_rows: rows });
        if (error) throw error;
        logAct('update_drop_window', { hour, minute, dur });
        U().toast('Окно дропа сохранено', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Регистрация разделов (порядок важен) ══════════════════
  store.addSection('products', 'Товары', 'box', renderProducts);
  store.addSection('markets', 'Площадки', 'store', renderMarkets);
  store.addSection('promos', 'Бонусы', 'tag', renderPromos);
  store.addSection('drops', 'Дропы', 'flame', renderDrops);

  // ══════════════════ Экран ══════════════════
  function renderStore(params, restored) {
    if (!restored) cur = (params && params.section) || sections[0].id;
    return `
      <div class="rd-screen page-enter ad-screen" id="adStoreRoot">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Витрина</h1><p class="rd-head-sub">Товары, площадки, бонусы и дропы</p></div>
          <button type="button" class="rd-back" id="adStoreRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div class="rd-chips ad-chips" id="adStoreChips">${chipsHtml()}</div>
        <div id="adStoreBody"></div>
        <div class="ad-cta-space"></div>
      </div>`;
  }
  function attachStore() {
    const r = document.getElementById('adStoreRefresh');
    if (r) r.onclick = () => { haptic('light'); openSection(cur); };
    openSection(cur);
  }

  AD.screen('admin_store', {
    render: renderStore,
    attach: attachStore,
    save: () => ({ cur, prodFilter }),
    restore: (s) => { if (s) { if (s.cur) cur = s.cur; if (s.prodFilter) prodFilter = s.prodFilter; } return s; },
  });

  window.adminOpenStore = (section) => AD.open('admin_store', section ? { section } : {});
})();
