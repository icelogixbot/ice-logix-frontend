/* ICE LOGIX — Админка, экран «Контент» (этап 6): Тексты, Вопросы, Отзывы.
   Логика (таблицы dynamic_texts, faq_items, settings.reviews_config) перенесена из старых
   admin.js, вид — по ice-design-system. Только владелец; каждое сохранение пишется в журнал. */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD) return;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);

  const SECTIONS = [['texts', 'Тексты'], ['faq', 'Вопросы'], ['reviews', 'Отзывы']];
  let cur = 'texts';
  let token = 0;
  let textQuery = '';

  // ══════════════════ Помощники ══════════════════
  class VErr extends Error {}
  const bad = (m) => { throw new VErr(m); };
  const logAct = (a, d) => { try { if (typeof logAdminAction === 'function') logAdminAction(a, d); } catch (e) { /* журнал не мешает */ } };

  const fld = (label, inner, hint) =>
    `<label class="rd-ask-field"><span class="rd-label">${esc(label)}</span><span class="rd-field">${inner}</span>${hint ? `<span class="ad-hint">${esc(hint)}</span>` : ''}</label>`;
  const inp = (name, o = {}) =>
    `<input name="${name}" type="${o.type || 'text'}" value="${esc(o.value == null ? '' : o.value)}" placeholder="${esc(o.ph || '')}"${o.mode ? ` inputmode="${o.mode}"` : ''} autocomplete="off">`;
  const area = (name, value, ph, rows) =>
    `<textarea name="${name}" rows="${rows || 3}" placeholder="${esc(ph || '')}">${esc(value || '')}</textarea>`;
  const sw = (name, label, on, hint) =>
    `<label class="ad-st-sw"><span class="ad-st-sw-t"><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><span class="rd-switch"><input type="checkbox" name="${name}"${on ? ' checked' : ''}><span></span></span></label>`;
  const choice = (name, label, opts, sel) =>
    `<div class="rd-ask-field"><span class="rd-label">${esc(label)}</span><div class="ad-cat-chips" data-chips="${name}">${
      opts.map(([v, t]) => `<button type="button" class="rd-chip${sel === v ? ' on' : ''}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div></div>`;
  const val = (form, name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
  const checked = (form, name) => !!(form.elements[name] && form.elements[name].checked);
  const chipVal = (form, name) => {
    const b = form.querySelector(`[data-chips="${name}"] .rd-chip.on`);
    return b ? b.dataset.v : '';
  };
  const intOr = (s, d) => { const n = parseInt(String(s).replace(/\s/g, ''), 10); return Number.isFinite(n) ? n : d; };

  // Шторка с формой; «Сохранить» в липком низу
  function openForm(o) {
    return U().sheet({
      title: esc(o.title),
      html: `<form class="rd-ask ad-form ad-st-form" novalidate>${o.body}<p class="rd-ask-err" hidden></p>
        <div class="ad-st-foot"><button type="submit" class="rd-btn rd-btn-block" data-submit>${esc(o.submit || 'Сохранить')}</button></div></form>`,
      onOpen: (wrap, close) => {
        const form = wrap.querySelector('form');
        const err = form.querySelector('.rd-ask-err');
        const btn = form.querySelector('[data-submit]');
        form.querySelectorAll('[data-chips]').forEach((box) => {
          box.querySelectorAll('.rd-chip').forEach((b) => {
            b.onclick = () => { haptic('light'); box.querySelectorAll('.rd-chip').forEach((x) => x.classList.toggle('on', x === b)); };
          });
        });
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
          try { await o.save(form); haptic('success'); close(); }
          catch (x) {
            err.textContent = x instanceof VErr ? x.message : AD.errorText(x, 'Не получилось сохранить. Попробуйте ещё раз.');
            err.hidden = false; haptic('error');
          }
          btn.disabled = false;
        });
      },
    });
  }

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

  function groupBy(rows, key, fallback) {
    const map = new Map();
    rows.forEach((r) => { const k = r[key] || fallback; if (!map.has(k)) map.set(k, []); map.get(k).push(r); });
    return map;
  }

  // ══════════════════ Тексты ══════════════════
  let textRows = [];

  function renderTexts(host, ctx) {
    loadInto(host, ctx,
      () => sb().from('dynamic_texts').select('*').order('category', { ascending: true }).order('key', { ascending: true }),
      (rows) => {
        textRows = rows;
        if (!rows.length) {
          host.innerHTML = AD.emptyHtml({ icon: 'text', title: 'Текстов пока нет', text: 'Подписи и сообщения появятся здесь, когда их заведут в базе.' });
          return;
        }
        host.innerHTML = `
          <div class="rd-field">${I('search', 20)}<input type="search" id="adCtSearch" placeholder="Найти текст или ключ" enterkeyhint="search" value="${esc(textQuery)}" autocomplete="off"></div>
          <p class="rd-sub ad-ct-note">Тексты интерфейса, бота и рассылок.</p>
          <div id="adCtList"></div>`;
        const paint = () => {
          const q = textQuery.trim().toLowerCase();
          const shown = q ? textRows.filter((t) => `${t.key} ${t.description || ''} ${t.value || ''}`.toLowerCase().includes(q)) : textRows;
          const list = host.querySelector('#adCtList');
          if (!shown.length) { list.innerHTML = AD.emptyHtml({ icon: 'search', title: 'Ничего не нашли', text: 'Попробуйте другое слово.' }); return; }
          list.innerHTML = Array.from(groupBy(shown, 'category', 'Без раздела')).map(([cat, items]) => `
            <div class="rd-section"><h2>${esc(cat)}</h2></div>
            <div class="rd-card rd-list">${items.map((t) => `
              <div class="rd-row" role="button" tabindex="0" data-id="${esc(t.id)}">
                <span class="rd-row-body">
                  <span class="rd-row-title">${esc(t.description || t.key)}</span>
                  <span class="rd-row-text ad-ct-clip">${esc(t.value || 'Пусто')}</span>
                </span></div>`).join('')}</div>`).join('');
          list.querySelectorAll('.rd-row[data-id]').forEach((r) => {
            r.onclick = () => textForm(textRows.find((t) => String(t.id) === r.dataset.id), ctx);
          });
        };
        paint();
        const s = host.querySelector('#adCtSearch');
        s.oninput = () => { textQuery = s.value; paint(); };
      });
  }

  function textForm(t, ctx) {
    if (!t) return;
    openForm({
      title: t.description || 'Текст',
      body: `${fld('Текст', area('value', t.value, '', 6), 'Ключ: ' + t.key)}`,
      save: async (form) => {
        const value = form.elements.value.value;
        const { error } = await sb().from('dynamic_texts').update({ value, updated_at: new Date().toISOString() }).eq('id', t.id);
        if (error) throw error;
        logAct('update_dynamic_text', { key: t.key });
        U().toast('Текст сохранён', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Вопросы ══════════════════
  let faqRows = [];

  function renderFaq(host, ctx) {
    ctx.cta('Добавить вопрос', () => faqForm(null, ctx));
    loadInto(host, ctx,
      () => sb().from('faq_items').select('*').order('category', { ascending: true }).order('order_index', { ascending: true }),
      (rows) => {
        faqRows = rows;
        if (!rows.length) {
          host.innerHTML = AD.emptyHtml({ icon: 'help', title: 'Вопросов пока нет', text: 'Раздел помощи для клиентов пуст. Добавьте первый вопрос с ответом.', action: 'Добавить вопрос', actionId: 'adCtFaqAdd' });
          host.querySelector('#adCtFaqAdd').onclick = () => faqForm(null, ctx);
          return;
        }
        host.innerHTML = Array.from(groupBy(rows, 'category', 'Общее')).map(([cat, items]) => `
          <div class="rd-section"><h2>${esc(cat)}</h2></div>
          <div class="rd-card rd-list">${items.map((q) => `
            <div class="rd-row" role="button" tabindex="0" data-id="${esc(q.id)}">
              <span class="rd-row-body">
                <span class="rd-row-title">${esc(q.question)}${q.is_published === false ? ' <span class="rd-status warn">Скрыт</span>' : ''}</span>
                <span class="rd-row-text ad-ct-clip">${esc(q.answer)}</span>
              </span></div>`).join('')}</div>`).join('');
        host.querySelectorAll('.rd-row[data-id]').forEach((r) => {
          r.onclick = () => faqForm(faqRows.find((q) => String(q.id) === r.dataset.id), ctx);
        });
      });
  }

  function faqForm(q, ctx) {
    const edit = !!q;
    const cats = Array.from(new Set(faqRows.map((x) => x.category).filter(Boolean)));
    openForm({
      title: edit ? 'Вопрос' : 'Новый вопрос',
      body: `
        ${fld('Раздел', inp('category', { value: edit ? q.category : (cats[0] || 'Общее'), ph: 'Например, Оплата' }), cats.length ? 'Уже есть: ' + cats.join(', ') : '')}
        ${fld('Вопрос', inp('question', { value: edit ? q.question : '', ph: 'Как клиент это спросит' }))}
        ${fld('Ответ', area('answer', edit ? q.answer : '', 'Коротко и по делу', 5))}
        ${fld('Порядок в разделе', inp('order_index', { value: edit ? q.order_index : '', ph: 'Меньше число — выше', mode: 'numeric' }))}
        ${sw('is_published', 'Показывать клиентам', edit ? q.is_published !== false : true)}
        ${edit ? '<button type="button" class="rd-btn rd-btn-danger rd-btn-block ad-gap" data-del>Удалить вопрос</button>' : ''}`,
      onOpen: (form, wrap, close) => {
        const del = form.querySelector('[data-del]');
        if (del) del.onclick = async () => {
          if (!(await AD.confirmSheet('Удалить вопрос?', 'Вопрос пропадёт из раздела помощи. Вернуть его не получится.', 'Удалить', true))) return;
          try {
            const { error } = await sb().from('faq_items').delete().eq('id', q.id);
            if (error) throw error;
            logAct('delete_faq', { id: q.id, question: q.question });
            U().toast('Вопрос удалён', 'ok'); close(); ctx.reload();
          } catch (x) { AD.fail(x, 'Не получилось удалить'); }
        };
      },
      save: async (form) => {
        const category = val(form, 'category') || 'Общее';
        const question = val(form, 'question');
        const answer = val(form, 'answer');
        if (!question) bad('Напишите вопрос.');
        if (!answer) bad('Напишите ответ.');
        const sameCat = faqRows.filter((x) => x.category === category).map((x) => Number(x.order_index) || 0);
        const order_index = intOr(val(form, 'order_index'), (sameCat.length ? Math.max(...sameCat) : 0) + 1);
        const row = { category, question, answer, order_index, is_published: checked(form, 'is_published') };
        const r = edit ? await sb().from('faq_items').update(row).eq('id', q.id) : await sb().from('faq_items').insert(row);
        if (r.error) throw r.error;
        logAct(edit ? 'update_faq' : 'create_faq', { question });
        U().toast(edit ? 'Вопрос сохранён' : 'Вопрос добавлен', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ Отзывы ══════════════════
  // Читает reports-reviews.js: четыре ссылки и список партнёров. Остальные ключи конфига не трогаем.
  const LINKS = [
    ['yandex_maps_link', 'Яндекс.Карты', 'https://yandex.by/maps/org/…'],
    ['google_maps_link', 'Google Maps', 'https://maps.google.com/?cid=…'],
    ['gis_2_link', '2GIS', 'https://2gis.by/minsk/firm/…'],
    ['telegram_group_link', 'Группа в Telegram', 'https://t.me/…'],
  ];

  function renderReviews(host, ctx) {
    host.innerHTML = AD.loadingHtml(2);
    sb().from('settings').select('value').eq('key', 'reviews_config').maybeSingle().then(({ data, error }) => {
      if (!ctx.alive()) return;
      if (error) { AD.showError(host, 'Не получилось загрузить', AD.errorText(error), () => ctx.reload()); return; }
      const cfg = (data && data.value) || {};
      const partners = Array.isArray(cfg.partner_user_ids) ? cfg.partner_user_ids : [];
      host.innerHTML = `
        <div class="rd-card">
          <p class="rd-sub" style="margin-top:0">Куда клиентов зовут оставить отзыв. Пустые ссылки в приложении не показываются.</p>
          ${LINKS.map(([k, t, ph]) => fld(t, inp(k, { value: cfg[k] || '', ph, type: 'url' })).replace('<label', `<label data-k="${k}"`)).join('')}
          ${fld('Партнёры', inp('partners', { value: partners.join(', '), ph: 'Telegram ID через запятую' }), 'Эти клиенты не получают награду за отзывы')}
        </div>`;
      const saveRun = async () => {
        const next = Object.assign({}, cfg);
        LINKS.forEach(([k]) => {
          const el = host.querySelector(`[name="${k}"]`);
          const v = el ? el.value.trim() : '';
          if (v && !/^https?:\/\//i.test(v)) bad('Ссылка должна начинаться с https://');
          next[k] = v;
        });
        const raw = host.querySelector('[name="partners"]').value.trim();
        const ids = raw ? raw.split(/[\s,;]+/).filter(Boolean) : [];
        if (ids.some((x) => !/^\d+$/.test(x))) bad('Telegram ID — только цифры, через запятую.');
        next.partner_user_ids = ids.map(Number);
        const { error: e2 } = await sb().rpc('admin_save_content_settings', { p_rows: [{ key: 'reviews_config', value: next }] });
        if (e2) throw e2;
        window.currentReviewsConfig = next;
        logAct('update_reviews_config', { links: LINKS.filter(([k]) => next[k]).length, partners: ids.length });
        haptic('success');
        U().toast('Настройки отзывов сохранены', 'ok');
        ctx.reload();
      };
      ctx.cta('Сохранить', async () => {
        try { await saveRun(); } catch (x) { if (x instanceof VErr) U().toast(x.message, 'bad'); else AD.fail(x, 'Не получилось сохранить'); }
      });
    });
  }

  // ══════════════════ Экран ══════════════════
  const RENDER = { texts: renderTexts, faq: renderFaq, reviews: renderReviews };
  const counts = {};

  function chipsHtml() {
    return SECTIONS.map(([id, t]) => `<button type="button" class="rd-chip${id === cur ? ' on' : ''}" data-sec="${id}">${esc(t)}${counts[id] ? ` · ${counts[id]}` : ''}</button>`).join('');
  }
  function paintChips() {
    const box = document.getElementById('adContentChips');
    if (!box) return;
    box.innerHTML = chipsHtml();
    box.querySelectorAll('[data-sec]').forEach((b) => {
      b.onclick = () => { if (b.dataset.sec === cur) return; haptic('light'); openSection(b.dataset.sec); };
    });
  }
  function openSection(id) {
    const host = document.getElementById('adContentBody');
    if (!host || !RENDER[id]) return;
    cur = id;
    const my = ++token;
    AD.clearCta();
    paintChips();
    host.innerHTML = '';
    const ctx = {
      host,
      alive: () => my === token && document.getElementById('adContentBody') === host,
      reload: () => { if (my === token) openSection(id); },
      cta: (label, run) => { if (my === token) AD.mountCta({ label, run }, 'adContentRoot'); },
      setCount: (n) => { counts[id] = n; if (my === token) paintChips(); },
    };
    try { RENDER[id](host, ctx); } catch (e) {
      AD.showError(host, 'Раздел не открылся', AD.errorText(e), () => openSection(id));
    }
  }

  function renderContent(params, restored) {
    if (!restored) cur = (params && params.section && RENDER[params.section]) ? params.section : 'texts';
    const owner = typeof isOwner !== 'undefined' && isOwner;
    return `
      <div class="rd-screen page-enter ad-screen" id="adContentRoot">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Контент</h1><p class="rd-head-sub">Тексты, вопросы и отзывы</p></div>
          <button type="button" class="rd-back" id="adContentRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        ${owner ? `<div class="rd-chips ad-chips" id="adContentChips">${chipsHtml()}</div><div id="adContentBody"></div><div class="ad-cta-space"></div>`
          : `<div class="rd-card">${U().empty({ icon: 'lock', title: 'Только для владельца', text: 'Тексты, вопросы и курсы может менять только владелец.' })}</div>`}
      </div>`;
  }
  function attachContent() {
    if (!document.getElementById('adContentBody')) return;
    const r = document.getElementById('adContentRefresh');
    if (r) r.onclick = () => { haptic('light'); openSection(cur); };
    openSection(cur);
  }

  AD.screen('admin_content', {
    render: renderContent,
    attach: attachContent,
    save: () => ({ cur, textQuery }),
    restore: (s) => { if (s) { if (s.cur && RENDER[s.cur]) cur = s.cur; if (typeof s.textQuery === 'string') textQuery = s.textQuery; } return s; },
  });

  window.adminOpenContent = (section) => AD.open('admin_content', section ? { section } : {});
})();
