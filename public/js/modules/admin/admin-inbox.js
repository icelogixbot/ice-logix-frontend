// ============================================================
// ICE LOGIX · Админ-панель: Обращения (этап 4 ADMIN_PLAN.md)
// Одна очередь на всё, что ждёт решения: поддержка, претензии, споры, Legit-Check,
// отзывы, видео-распаковки и пристрой. Экран admin_inbox — чипы со счётчиками, переключатель
// «Ждут / Готово» и список по 20 штук. Карточка admin_inbox_item — данные и кнопки решения.
// Поддержку здесь не дублируем: строка открывает окно поддержки (AD.openDesk('ticket=…')).
// Сервер (миграция 20261031210000_admin_inbox): admin_inbox_counts, admin_inbox_list, admin_dispute_card,
// admin_dispute_reply, admin_dispute_decision, admin_legit_verdict, admin_resale_decision, а также прежние
// admin_claim_decision, admin_review_decision, admin_ugc_decision. Роли проверяет сервер.
// Деньги (возврат по претензии и спору, «не удалось проверить», награда за видео) — через код-пароль.
// ============================================================
(function () {
  'use strict';

  const PAGE = 20;
  const KINDS = [
    ['support', 'Поддержка'], ['claims', 'Претензии'], ['disputes', 'Споры'], ['legit', 'Legit-Check'],
    ['reviews', 'Отзывы'], ['ugc', 'Распаковки'], ['resale', 'Пристрой'],
  ];
  const ONE = {
    support: 'Обращение', claims: 'Страховая претензия', disputes: 'Спор по заказу', legit: 'Legit-Check',
    reviews: 'Отзыв', ugc: 'Видео-распаковка', resale: 'Пристрой',
  };
  const ICON = { support: 'message', claims: 'shield', disputes: 'alert', legit: 'scan', reviews: 'star', ugc: 'camera', resale: 'tag' };
  const EMPTY = {
    support: ['message', 'Все обращения отвечены', 'Новые сообщения клиентов появятся здесь.'],
    claims: ['shield', 'Претензий на проверке нет', 'Когда клиент сообщит о потерянной или повреждённой посылке, заявка появится здесь.'],
    disputes: ['alert', 'Открытых споров нет', 'Если клиент откроет спор по заказу, он появится здесь.'],
    legit: ['scan', 'Заявок на проверку нет', 'Клиенты присылают фото, а вы выносите вердикт.'],
    reviews: ['star', 'Отзывов на модерации нет', 'Новые отзывы клиентов появятся здесь.'],
    ugc: ['camera', 'Видео на модерации нет', 'Распаковки клиентов за награду появятся здесь.'],
    resale: ['tag', 'Объявлений на модерации нет', 'Объявления о перепродаже появятся здесь.'],
  };
  const STATUS = {
    support: { open: ['Открыто', 'warn'], new: ['Новое', 'warn'], pending: ['Ждёт ответа', 'warn'], in_progress: ['В работе', ''], answered: ['Отвечено', ''], resolved: ['Решено', 'ok'], closed: ['Закрыто', ''] },
    claims: { pending: ['Ждёт решения', 'warn'], approved: ['Одобрена', 'ok'], rejected: ['Отклонена', 'bad'] },
    disputes: { open: ['Открыт', 'warn'], in_progress: ['В работе', ''], escalated: ['Передан выше', 'bad'], resolved: ['Решён', 'ok'], rejected: ['Отклонён', 'bad'], closed: ['Закрыт', ''] },
    legit: { pending: ['Ждёт вердикта', 'warn'], original: ['Оригинал', 'ok'], fake: ['Подделка', 'bad'], impossible: ['Не удалось проверить', ''] },
    reviews: { pending: ['На модерации', 'warn'], approved: ['Опубликован', 'ok'], rejected: ['Отклонён', 'bad'] },
    ugc: { pending: ['На модерации', 'warn'], approved: ['Одобрено', 'ok'], rejected: ['Отклонено', 'bad'] },
    resale: { pending: ['На модерации', 'warn'], approved: ['Опубликовано', 'ok'], reserved: ['Куплено, деньги удержаны', 'warn'], sold: ['Продано', 'ok'], rejected: ['Отклонено', 'bad'] },
  };
  const KIND_SET = KINDS.map((k) => k[0]);

  const AD = window.AD;
  const U = () => window.UI;
  const esc = AD.esc;
  const I = (name, size, opts) => U().icon(name, size, opts);
  const money = AD.money;
  const nick = AD.nick;
  const haptic = AD.haptic;
  const formSheet = AD.formSheet;
  const confirmSheet = AD.confirmSheet;

  let kind = 'support';
  let status = 'pending';
  let counts = null;
  let pollTimer = null;
  const cache = {}; // «вид:id» → строка списка, чтобы карточка открывалась без лишнего запроса

  // ── Мелкие помощники ──
  function toDate(ts) {
    if (!ts) return null;
    const s = String(ts);
    const d = new Date(/[zZ]$|[+-]\d\d(:?\d\d)?$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const when = (ts) => {
    const d = toDate(ts);
    return d ? d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  };
  function ago(ts) {
    const d = toDate(ts);
    if (!d) return '';
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    const days = Math.round(h / 24);
    return days < 30 ? `${days} дн. назад` : when(ts);
  }
  const num = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
  const nameOf = (c) => (c && (c.name || (nick(c.username) ? '@' + nick(c.username) : ''))) || 'Клиент';
  const avaOf = (name) => `<span class="ad-ava" aria-hidden="true">${esc((String(name).replace('@', '').trim().charAt(0) || '?').toUpperCase())}</span>`;
  const badge = (k, st) => {
    const m = (STATUS[k] || {})[st];
    return m ? `<span class="rd-status ${m[1]}">${esc(m[0])}</span>` : '';
  };
  const kvRow = (label, value) => `<div class="ad-money-row"><span>${label}</span><b>${value}</b></div>`;
  const section = (title) => `<div class="rd-section"><h2>${esc(title)}</h2></div>`;
  // Для текста код-пароля: деньги без разметки
  const plainMoney = (v) => (typeof window.formatBYN === 'function' ? String(window.formatBYN(v)).replace(/<[^>]*>/g, '') : String(Math.round((Number(v) || 0) * 100) / 100));
  const shortOrder = (id) => (id ? 'Заказ ' + esc(AD.shortId(id)) : '');
  const leave = () => setTimeout(() => AD.back(), 30);

  // Код-пароль перед выдачей денег
  async function codeOk(text) {
    if (window.AppLock && typeof window.AppLock.verifyFlow === 'function') {
      const ok = await window.AppLock.verifyFlow(text);
      if (ok !== true) {
        if (ok === 'not_enabled') U().toast('Сначала включите код-пароль в настройках', 'bad');
        return false;
      }
    }
    return true;
  }

  // Ссылка на файл: готовая или путь в хранилище ugc
  function mediaUrl(p) {
    const s = String(p || '');
    if (/^https?:\/\//i.test(s)) return s;
    try { return supabaseClient.storage.from('ugc').getPublicUrl(s).data.publicUrl || ''; } catch (_) { return ''; }
  }
  const isVideo = (u) => /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(u);

  // Окно с многострочным полем (formSheet читает только однострочные)
  function textSheet(o) {
    U().sheet({
      title: o.title,
      html: `<form class="rd-ask ad-form" novalidate>
        ${o.text ? `<p class="rd-ask-text">${o.text}</p>` : ''}
        <label class="rd-ask-field">
          <span class="rd-label">${esc(o.label)}</span>
          <span class="rd-field"><textarea class="ad-inb-area" name="t" rows="${o.rows || 5}" maxlength="${o.max || 2000}" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea></span>
        </label>
        <p class="rd-ask-err" hidden></p>
        <button type="submit" class="rd-btn rd-btn-block" data-submit>${esc(o.action)}</button>
      </form>`,
      onOpen: (wrap, close) => {
        const form = wrap.querySelector('form');
        const err = wrap.querySelector('.rd-ask-err');
        const submit = wrap.querySelector('[data-submit]');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const v = form.querySelector('textarea').value.trim();
          if (o.min && v.length < o.min) { err.textContent = o.minText || 'Напишите чуть подробнее'; err.hidden = false; return; }
          err.hidden = true;
          submit.disabled = true;
          const done = await o.onSubmit(v, submit);
          submit.disabled = false;
          if (done) close();
        });
      },
    });
  }

  function viewMedia(url) {
    const html = isVideo(url)
      ? `<video class="ad-photo" src="${esc(url)}" controls playsinline preload="metadata"></video>`
      : `<img class="ad-photo" src="${esc(url)}" alt="Фото из обращения">`;
    U().sheet({ title: 'Просмотр', html });
  }

  // ══════════════════ Список ══════════════════
  function describe(k, r) {
    if (k === 'support') {
      return { title: r.subject || (r.number ? `Обращение № ${r.number}` : 'Обращение в поддержку'), text: r.last_message || 'Сообщений пока нет', badge: badge(k, r.status), time: r.last_message_at || r.created_at };
    }
    if (k === 'claims') {
      const max = Number(r.max_refund) || 0;
      return { title: 'Страховая претензия', text: r.description || 'Без описания', badge: badge(k, r.status), extra: max > 0 && r.status === 'pending' ? `Можно вернуть до ${money(max)}` : '', time: r.created_at };
    }
    if (k === 'disputes') {
      return { title: r.subject || 'Спор по заказу', text: r.description || 'Без описания', badge: badge(k, r.status), extra: Number(r.messages_count) ? `Сообщений: ${Number(r.messages_count)}` : '', time: r.created_at };
    }
    if (k === 'legit') {
      const n = Array.isArray(r.photos) ? r.photos.length : 0;
      return { title: [r.brand, r.model].filter(Boolean).join(' ') || 'Проверка на подлинность', text: n ? `Фото: ${n}` : 'Без фото', badge: badge(k, r.status), time: r.created_at };
    }
    if (k === 'reviews') {
      return { title: `Отзыв: ${Number(r.rating) || 0} из 5`, text: r.text || 'Без текста', badge: badge(k, r.status), extra: Number(r.media_count) ? `Фото и видео: ${Number(r.media_count)}` : '', time: r.created_at };
    }
    if (k === 'ugc') {
      return { title: 'Видео-распаковка', text: r.caption || 'Без подписи', badge: badge(k, r.status), time: r.created_at };
    }
    return { title: r.title || 'Объявление', text: r.description || 'Без описания', badge: badge(k, r.status), extra: Number(r.price_byn) > 0 ? `Цена ${money(r.price_byn)}` : '', time: r.created_at };
  }

  function rowHtml(r) {
    const d = describe(kind, r);
    const name = nameOf(r.client);
    const foot = [d.badge, d.extra ? `<span class="ad-mute">${esc(d.extra)}</span>` : '', `<span class="ad-mute">${esc(name)}${d.time ? ' · ' + esc(ago(d.time)) : ''}</span>`].filter(Boolean).join('');
    return `
      <div class="rd-row" role="button" tabindex="0" data-row="${esc(r.id)}">
        ${avaOf(name)}
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(d.title)}</span>
          <span class="rd-row-text">${esc(d.text)}</span>
          <span class="ad-order-foot">${foot}</span>
        </span>
        ${I('chevR', 22, { cls: 'rd-chev' })}
      </div>`;
  }

  const list = AD.list({
    id: 'adInbList',
    rpc: 'admin_inbox_list',
    noSearch: true,
    chip: 'pending',
    pageSize: PAGE,
    listClass: 'ad-inbox',
    args: (st, limit, offset) => ({ p_kind: kind, p_status: st.chip === 'done' ? 'done' : 'pending', p_limit: limit, p_offset: offset }),
    rowHtml,
    onData: (d) => { (d.rows || []).forEach((r) => { cache[kind + ':' + r.id] = r; }); },
    onRow: (id) => {
      if (kind === 'support') { AD.openDesk('ticket=' + encodeURIComponent(id)); return; }
      AD.open('admin_inbox_item', { kind, id });
    },
    empty: (st) => {
      if (st.chip === 'done') return { icon: 'history', title: 'Здесь пока пусто', text: 'Обработанные обращения появятся в этом списке.' };
      const e = EMPTY[kind];
      return { icon: e[0], title: e[1], text: e[2] };
    },
  });

  function kindsHtml() {
    return KINDS.map(([k, t]) => {
      const n = counts ? Number(counts[k]) || 0 : 0;
      return `<button type="button" class="rd-chip${k === kind ? ' on' : ''}" data-kind="${k}">${esc(t)}${n ? ` · ${n}` : ''}</button>`;
    }).join('');
  }

  function paintTop() {
    const box = document.getElementById('adInbKinds');
    if (!box) return;
    box.innerHTML = kindsHtml();
    box.querySelectorAll('[data-kind]').forEach((b) => { b.onclick = () => setKind(b.dataset.kind); });
    const seg = document.getElementById('adInbSeg');
    if (seg) seg.querySelectorAll('[data-st]').forEach((b) => b.classList.toggle('on', b.dataset.st === status));
    const sub = document.getElementById('adInbSub');
    if (sub) {
      const total = counts ? Number(counts.total) || 0 : 0;
      sub.textContent = counts ? (total ? `Ждут решения: ${total}` : 'Всё разобрано, ждущих нет') : 'Поддержка, претензии, споры, отзывы';
    }
  }

  function reloadList() {
    const body = document.getElementById('adInbListBody');
    if (body) body.innerHTML = AD.loadingHtml();
    list.state.chip = status;
    list.state.rows = [];
    list.state.total = 0;
    list.load(false);
  }

  function setKind(k) {
    if (k === kind || !KIND_SET.includes(k)) return;
    haptic('light');
    kind = k;
    status = 'pending';
    paintTop();
    reloadList();
  }

  async function loadCounts() {
    const { data } = await AD.rpc('admin_inbox_counts', {});
    if (data && document.getElementById('adInbKinds')) { counts = data; paintTop(); }
  }

  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  function startPoll() {
    stopPoll();
    pollTimer = setInterval(() => {
      const here = typeof currentTab !== 'undefined' ? currentTab : '';
      if (here !== 'admin_inbox' || !document.getElementById('adInbKinds')) { stopPoll(); return; }
      if (document.visibilityState !== 'visible') return;
      loadCounts();
      list.reload();
    }, 30000);
  }

  function renderInbox(params, restored) {
    if (!restored) {
      if (params && KIND_SET.includes(params.kind)) kind = params.kind;
      status = 'pending';
      list.state.chip = 'pending';
    }
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Обращения</h1><p class="rd-head-sub" id="adInbSub">Поддержка, претензии, споры, отзывы</p></div>
          <button type="button" class="rd-back" id="adInbRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div class="rd-chips ad-chips" id="adInbKinds">${kindsHtml()}</div>
        <div class="fn-seg ad-seg ad-inb-seg" id="adInbSeg">
          <button type="button" data-st="pending" class="${status === 'pending' ? 'on' : ''}">Ждут</button>
          <button type="button" data-st="done" class="${status === 'done' ? 'on' : ''}">Готово</button>
        </div>
        ${list.shellHtml()}
      </div>`;
  }

  function attachInbox(params, restored) {
    paintTop();
    document.querySelectorAll('#adInbSeg [data-st]').forEach((b) => {
      b.onclick = () => {
        if (status === b.dataset.st) return;
        haptic('light');
        status = b.dataset.st;
        paintTop();
        reloadList();
      };
    });
    const refresh = document.getElementById('adInbRefresh');
    if (refresh) refresh.onclick = () => { haptic('light'); loadCounts(); reloadList(); };
    list.state.chip = status;
    list.attach(restored);
    loadCounts();
    startPoll();
  }

  // ══════════════════ Карточка ══════════════════
  async function findRow(k, id) {
    for (const st of ['pending', 'done']) {
      const { data } = await AD.rpc('admin_inbox_list', { p_kind: k, p_status: st, p_limit: 50, p_offset: 0 });
      const hit = data && (data.rows || []).find((r) => String(r.id) === String(id));
      if (hit) { cache[k + ':' + id] = hit; return hit; }
    }
    return null;
  }

  function renderItem(params) {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">${esc(ONE[params.kind] || 'Обращение')}</h1><p class="rd-head-sub" id="adInbItemSub">Загружаем…</p></div>
          <button type="button" class="rd-back" id="adInbItemRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div id="adInbItemBody">${AD.loadingHtml()}</div>
      </div>`;
  }

  function attachItem() {
    const r = document.getElementById('adInbItemRefresh');
    if (r) r.onclick = () => { haptic('light'); loadItem(true); };
    loadItem(false);
  }

  async function loadItem(force) {
    const k = AD.params.kind;
    const id = AD.params.id;
    const body = document.getElementById('adInbItemBody');
    if (!body) return;
    const alive = () => document.getElementById('adInbItemBody') && AD.params.id === id && AD.params.kind === k;
    const retry = () => { body.innerHTML = AD.loadingHtml(); loadItem(true); };
    let data = null;
    if (k === 'disputes') {
      const r = await AD.rpc('admin_dispute_card', { p_id: id });
      if (!alive()) return;
      if (r.error) { AD.showError(body, 'Не получилось открыть спор', AD.errorText(r.error, 'Проверьте интернет и попробуйте ещё раз.'), retry); return; }
      data = r.data;
    } else {
      if (force) delete cache[k + ':' + id];
      data = cache[k + ':' + id] || await findRow(k, id);
      if (!alive()) return;
    }
    if (!data) { AD.showError(body, 'Не получилось открыть обращение', 'Возможно, его уже обработали или пропал интернет. Вернитесь к списку и обновите его.', retry); return; }
    body.innerHTML = cardHtml(k, data);
    bindCard(k, data, body);
    const sub = document.getElementById('adInbItemSub');
    if (sub) sub.textContent = nameOf(data.client) + (data.created_at ? ' · ' + ago(data.created_at) : '');
    AD.restoreScroll();
  }

  function topCard(k, d, title, extraHtml) {
    return `
      <div class="rd-card ad-pad">
        <div class="ad-inb-top"><b>${esc(title)}</b>${badge(k, d.status)}</div>
        ${extraHtml || ''}
      </div>`;
  }
  const textBlock = (t) => (t ? `<p class="ad-inb-text">${esc(t)}</p>` : '');
  const noteBlock = (tone, title, text) => `<div class="ad-note ${tone}">${I(tone === 'bad' ? 'alert' : 'shield', 20)}<div><b>${esc(title)}</b><p>${esc(text)}</p></div></div>`;

  function linksHtml(d) {
    const c = d.client || {};
    const clientRow = c.user_id ? `
      <div class="rd-row" role="button" tabindex="0" data-client="${esc(c.user_id)}">
        ${avaOf(nameOf(c))}
        <span class="rd-row-body"><span class="rd-row-title">${esc(nameOf(c))}</span><span class="rd-row-text">Открыть карточку клиента</span></span>
        ${I('chevR', 22, { cls: 'rd-chev' })}
      </div>` : '';
    const orderId = d.order_id || (d.order && d.order.id);
    const orderRow = orderId ? `
      <div class="rd-row" role="button" tabindex="0" data-order="${esc(orderId)}">
        <span class="rd-ico">${I('box', 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">${shortOrder(orderId)}</span><span class="rd-row-text">Открыть заказ</span></span>
        ${I('chevR', 22, { cls: 'rd-chev' })}
      </div>` : '';
    return clientRow || orderRow ? `<div class="rd-card rd-list">${clientRow}${orderRow}</div>` : '';
  }

  const actions = (html) => `<div class="ad-inb-actions">${html}</div>`;
  const btn = (id, label, cls) => `<button type="button" class="rd-btn rd-btn-block ${cls || ''}" id="${id}">${esc(label)}</button>`;

  function mediaGrid(urls) {
    const list2 = urls.filter(Boolean);
    if (!list2.length) return '';
    return `<div class="ad-inb-media">${list2.map((u) => (isVideo(u)
      ? `<button type="button" class="ad-inb-thumb" data-media="${esc(u)}" aria-label="Смотреть видео">${I('camera', 24)}<span>Видео</span></button>`
      : `<button type="button" class="ad-inb-thumb" data-media="${esc(u)}" aria-label="Открыть фото"><img src="${esc(u)}" alt="Фото из обращения" loading="lazy"></button>`)).join('')}</div>`;
  }

  function cardHtml(k, d) {
    let h = '';
    if (k === 'claims') {
      const max = Number(d.max_refund) || 0;
      h += topCard(k, d, 'Что случилось', textBlock(d.description || 'Клиент не описал, что произошло'));
      h += `<div class="rd-card ad-pad">${kvRow('Заказ', d.order_id ? esc(AD.shortId(d.order_id)) : 'не указан')}${kvRow('Можно вернуть', money(max))}</div>`;
      if (d.status === 'rejected' && d.rejection_reason) h += noteBlock('bad', 'Причина отказа', d.rejection_reason);
      h += linksHtml(d);
      if (d.status === 'pending') {
        h += actions(btn('adInbApprove', 'Одобрить и вернуть деньги') + btn('adInbReject', 'Отклонить', 'rd-btn-danger') + btn('adInbLegal', 'Составить юридический ответ', 'rd-btn-ghost'));
        if (max <= 0) h += '<p class="ad-hint">По этому заказу нечего возвращать: оплаченная сумма уже возвращена или заказ не указан.</p>';
      }
    } else if (k === 'disputes') {
      h += disputeHtml(d);
    } else if (k === 'legit') {
      const photos = (Array.isArray(d.photos) ? d.photos : []).map(mediaUrl);
      h += topCard(k, d, [d.brand, d.model].filter(Boolean).join(' ') || 'Проверка на подлинность', textBlock(d.comments && d.status === 'pending' ? 'Комментарий клиента: ' + d.comments : ''));
      h += section('Фото от клиента') + (photos.filter(Boolean).length ? mediaGrid(photos) : '<p class="ad-hint">Клиент не приложил фото.</p>');
      const paid = Number(d.paid) || 0;
      h += `<div class="rd-card ad-pad">${kvRow('Клиент заплатил', money(paid))}${d.refunded ? kvRow('Деньги', 'возвращены') : ''}</div>`;
      if (d.status !== 'pending' && d.comments) h += noteBlock('', 'Ваш комментарий', d.comments);
      h += linksHtml(d);
      if (d.status === 'pending') h += actions(btn('adInbOriginal', 'Оригинал') + btn('adInbFake', 'Подделка', 'rd-btn-danger') + btn('adInbImpossible', 'Не удалось проверить', 'rd-btn-ghost') + '<p class="ad-hint">Если проверить не удалось, клиенту вернутся деньги за проверку.</p>');
    } else if (k === 'reviews') {
      const media = (Array.isArray(d.media_urls) ? d.media_urls : []).filter((u) => /^https?:\/\//i.test(String(u)));
      h += topCard(k, d, `Оценка ${Number(d.rating) || 0} из 5${d.category ? ' · ' + d.category : ''}`, textBlock(d.text || 'Клиент не оставил текста'));
      if (media.length) h += section('Фото и видео') + mediaGrid(media);
      h += `<div class="rd-card ad-pad">${kvRow('ICE BONUS за отзыв', reviewHasVideo(d) ? (d.bonus_given ? 'уже выдан' : '+1, при одобрении') : 'не положен')}</div>`;
      h += '<p class="ad-hint">ICE BONUS даётся только за отзыв с видео: 1 бонус = минус 1 п.п. комиссии. С одними фото бонуса нет, отзыв всё равно можно принять.</p>';
      if (d.status === 'rejected' && d.moderation_reason) h += noteBlock('bad', 'Причина отказа', d.moderation_reason);
      h += '<div id="adRvMore"></div>';
      // заказы с номерами ICE и оценками рисует reviewMore, здесь только клиент
      h += linksHtml(Object.assign({}, d, { order_id: null, order: null }));
      h += actions((d.status === 'pending' ? btn('adInbApprove', 'Принять') + btn('adInbReject', 'Отклонить', 'rd-btn-danger') : '') + btn('adRvReply', 'Ответить клиенту', 'rd-btn-ghost'));
    } else if (k === 'ugc') {
      const v = /^https?:\/\//i.test(String(d.video_url || '')) ? d.video_url : '';
      h += topCard(k, d, 'Видео-распаковка', textBlock(d.caption));
      h += v ? `<div class="rd-card ad-pad"><video class="ad-photo" src="${esc(v)}" controls playsinline preload="metadata"></video></div>` : '<p class="ad-hint">Видео не открывается: ссылки на файл нет.</p>';
      if (d.status === 'approved' && Number(d.reward_ices) > 0) h += `<div class="rd-card ad-pad">${kvRow('Награда', money(d.reward_ices))}</div>`;
      if (d.status === 'rejected' && d.reject_reason) h += noteBlock('bad', 'Причина отказа', d.reject_reason);
      h += linksHtml(d);
      if (d.status === 'pending') h += actions(btn('adInbApprove', 'Одобрить и выдать награду') + btn('adInbReject', 'Отклонить', 'rd-btn-danger'));
    } else {
      h += topCard(k, d, d.title || 'Объявление', textBlock(d.description));
      const RS = { new_tags: 'Новое, с бирками', new: 'Новое, без бирок', excellent: 'Отличное', good: 'Хорошее' };
      const rsPh = (Array.isArray(d.photos) ? d.photos : []).map((x) => { try { return supabaseClient.storage.from('product-screenshots').getPublicUrl(x).data.publicUrl || ''; } catch (_) { return ''; } }).filter(Boolean);
      if (rsPh.length) h += section('Фото') + mediaGrid(rsPh);
      h += `<div class="rd-card ad-pad">${Number(d.price_byn) > 0 ? kvRow('Цена', money(d.price_byn)) : ''}${d.size ? kvRow('Размер', d.size) : ''}${d.condition ? kvRow('Состояние', RS[d.condition] || d.condition) : ''}${d.brand ? kvRow('Бренд', d.brand) : ''}${d.buyer_id ? kvRow('Покупатель', String(d.buyer_id)) : ''}</div>`;
      h += linksHtml(d);
      if (d.status === 'pending') h += actions(btn('adInbApprove', 'Опубликовать') + btn('adInbReject', 'Отклонить', 'rd-btn-danger'));
      if (d.status === 'reserved') h += actions(btn('adInbRelease', 'Вернуть деньги покупателю', 'rd-btn-danger') + '<p class="ad-hint">Деньги вернутся покупателю, вещь снова станет доступна в каталоге.</p>');
    }
    return `<div class="ad-inb-card">${h}</div>`;
  }

  function disputeHtml(d) {
    const o = d.order || {};
    const max = Number(o.max_refund) || 0;
    let h = topCard('disputes', d, d.subject || 'Спор по заказу', textBlock(d.description));
    if (!d.finished && d.escalation_deadline) h += `<p class="ad-hint">Ответить клиенту нужно до ${esc(when(d.escalation_deadline))}.</p>`;
    if (o.id) h += `<div class="rd-card ad-pad">${kvRow('Клиент оплатил', money(o.total_paid))}${kvRow('Уже возвращено', money(o.total_refunded))}${kvRow('Можно вернуть', money(max))}</div>`;
    const msgs = Array.isArray(d.messages) ? d.messages : [];
    h += section('Переписка');
    h += msgs.length
      ? `<div class="ad-inb-thread">${msgs.map((m) => `
          <div class="ad-msg${m.is_client ? '' : ' mine'}">
            <span class="ad-msg-who">${esc(m.is_client ? nameOf(d.client) : (m.name || 'Поддержка'))} · ${esc(when(m.created_at))}</span>
            <p>${esc(m.text)}</p>
          </div>`).join('')}</div>`
      : '<p class="ad-hint">В переписке пока ничего нет.</p>';
    if (d.finished && d.resolution) h += noteBlock('', 'Решение', d.resolution);
    h += linksHtml(d);
    if (!d.finished) {
      let a = btn('adInbReply', 'Ответить клиенту');
      if (d.status === 'open') a += btn('adInbTake', 'Взять в работу', 'rd-btn-ghost');
      if (o.id && max > 0) a += btn('adInbRefund', 'Вернуть деньги');
      a += btn('adInbReject', 'Отклонить спор', 'rd-btn-danger');
      h += actions(a);
    }
    return h;
  }

  // ══════════════════ Кнопки карточки ══════════════════
  function bindCard(k, d, root) {
    const on = (id, fn) => { const el = root.querySelector('#' + id); if (el) el.onclick = fn; };
    root.querySelectorAll('[data-client]').forEach((r) => { r.onclick = () => AD.open('admin_client', { id: r.dataset.client }); });
    root.querySelectorAll('[data-order]').forEach((r) => { r.onclick = () => AD.open('admin_order', { id: r.dataset.order }); });
    root.querySelectorAll('[data-media]').forEach((b) => { b.onclick = () => viewMedia(b.dataset.media); });
    const reload = () => { cache[k + ':' + d.id] = undefined; loadItem(true); };

    if (k === 'claims') {
      on('adInbApprove', () => claimApprove(d));
      on('adInbReject', () => rejectSheet('Отклонить претензию', 'Клиент увидит причину. Напишите её понятно и спокойно.', (v, b) => AD.call(b, 'admin_claim_decision', { p_claim: d.id, p_approve: false, p_reason: v }, { ok: 'Претензия отклонена' })));
      on('adInbLegal', () => legalAnswer(d));
    } else if (k === 'disputes') {
      on('adInbReply', () => disputeReply(d, reload));
      on('adInbTake', async () => { haptic('light'); const b = root.querySelector('#adInbTake'); if (await AD.call(b, 'admin_dispute_decision', { p_id: d.id, p_decision: 'take' }, { ok: 'Спор взят в работу' }) !== null) reload(); });
      on('adInbRefund', () => disputeRefund(d));
      on('adInbReject', () => rejectSheet('Отклонить спор', 'Клиент получит ваше объяснение. Деньги не возвращаются.', (v, b) => AD.call(b, 'admin_dispute_decision', { p_id: d.id, p_decision: 'reject', p_comment: v, p_refund: null }, { ok: 'Спор отклонён' })));
    } else if (k === 'legit') {
      on('adInbOriginal', () => legitVerdict(d, 'original'));
      on('adInbFake', () => legitVerdict(d, 'fake'));
      on('adInbImpossible', () => legitVerdict(d, 'impossible'));
    } else if (k === 'reviews') {
      on('adInbApprove', () => reviewApprove(d));
      reviewMore(d, root, on, reload);
      on('adInbReject', () => rejectSheet('Отклонить отзыв', 'Отзыв не будет опубликован. Напишите причину.', (v, b) => AD.call(b, 'admin_review_decision', { p_review: d.id, p_approve: false, p_reason: v }, { ok: 'Отзыв отклонён' })));
    } else if (k === 'ugc') {
      on('adInbApprove', () => ugcApprove(d));
      on('adInbReject', () => rejectSheet('Отклонить видео', 'Клиент увидит причину. Напишите её понятно.', (v, b) => AD.call(b, 'admin_ugc_decision', { p_id: d.id, p_approve: false, p_reward: 0, p_reason: v }, { ok: 'Видео отклонено' })));
    } else if (k === 'resale') {
      on('adInbRelease', async () => {
        if (!await confirmSheet('Вернуть деньги покупателю?', 'Сделка отменится, вещь вернётся в каталог.', 'Вернуть')) return;
        if (await AD.call(null, 'admin_resale_release', { p_id: d.id, p_relist: true }, { ok: 'Деньги возвращены' }) !== null) leave();
      });
      on('adInbApprove', async () => {
        if (!await confirmSheet('Опубликовать объявление?', 'Оно появится у клиентов в разделе пристроя.', 'Опубликовать')) return;
        if (await AD.call(null, 'admin_resale_decision', { p_id: d.id, p_approve: true }, { ok: 'Объявление опубликовано' }) !== null) leave();
      });
      on('adInbReject', () => rejectSheet('Отклонить объявление', 'Клиент увидит причину. Напишите её понятно.', (v, b) => AD.call(b, 'admin_resale_decision', { p_id: d.id, p_approve: false, p_reason: v }, { ok: 'Объявление отклонено' })));
    }
  }

  // Общий диалог отказа с причиной. call(причина, кнопка) возвращает результат запроса, null — ошибка
  function rejectSheet(title, text, call) {
    formSheet({
      title, text: esc(text),
      fields: [{ name: 'reason', label: 'Причина', placeholder: 'Например: на фото не видно повреждений' }],
      action: 'Отклонить', danger: true,
      validate: (v) => (v.reason.length < 3 ? 'Напишите причину хотя бы в несколько слов' : ''),
      onSubmit: async (v, b) => {
        if (await call(v.reason, b) === null) return false;
        leave();
        return true;
      },
    });
  }

  function claimApprove(c) {
    const max = Number(c.max_refund) || 0;
    formSheet({
      title: 'Одобрить претензию',
      text: max > 0 ? `Деньги сразу вернутся клиенту на баланс. Можно вернуть не больше ${money(max)}.` : 'По этому заказу нечего возвращать.',
      fields: [{ name: 'amount', label: 'Сумма возврата', value: max > 0 ? String(max) : '', decimal: true }],
      action: 'Одобрить и вернуть деньги',
      validate: (v) => {
        const a = num(v.amount);
        if (!(a > 0)) return 'Введите сумму больше нуля';
        if (a > max + 0.001) return max > 0 ? 'Сумма больше, чем можно вернуть по заказу' : 'По этому заказу нечего возвращать';
        return '';
      },
      onSubmit: async (v, b) => {
        const a = num(v.amount);
        if (!await codeOk(`Вернуть клиенту ${plainMoney(a)} по претензии`)) return false;
        if (await AD.call(b, 'admin_claim_decision', { p_claim: c.id, p_approve: true, p_amount: a }, { ok: 'Претензия одобрена, деньги возвращены' }) === null) return false;
        leave();
        return true;
      },
    });
  }

  // Юридический ответ: заявка уходит боту в ai_requests, он готовит шаблон по готовым текстам (без сторонних ИИ)
  function legalAnswer(c) {
    textSheet({
      title: 'Юридический ответ',
      text: esc('Проверьте суть претензии. Бот подготовит шаблон ответа, его можно будет скопировать.'),
      label: 'Суть претензии', value: c.description || '', min: 5, minText: 'Опишите суть претензии',
      action: 'Составить ответ',
      onSubmit: async (text) => {
        const adminId = Number(window.userId || (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user && Telegram.WebApp.initDataUnsafe.user.id)) || 0;
        const prompt = `Заказ #${c.order_id || 'не указан'}. Клиент (Telegram ID: ${(c.client && c.client.user_id) || ''}). Суть претензии: ${text}. Составь официальный ответ клиенту.`;
        let id = null;
        try {
          const r = await supabaseClient.from('ai_requests').insert({ admin_id: adminId, prompt_text: prompt }).select('id').single();
          if (r.error) throw r.error;
          id = r.data.id;
        } catch (e) {
          console.error('ai_requests insert', e);
          U().toast('Не получилось отправить заявку. Попробуйте ещё раз.', 'bad');
          return false;
        }
        U().toast('Готовим ответ, это займёт несколько секунд', 'info');
        pollLegal(id);
        return true;
      },
    });
  }

  function pollLegal(id) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const here = typeof currentTab !== 'undefined' ? currentTab : '';
      if (here !== 'admin_inbox_item') { clearInterval(timer); return; }
      if (tries > 20) { clearInterval(timer); U().toast('Ответ не успел подготовиться. Попробуйте позже.', 'bad'); return; }
      try {
        const { data, error } = await supabaseClient.from('ai_requests').select('status, response_text').eq('id', id).single();
        if (error) return;
        if (data.status === 'error') { clearInterval(timer); U().toast('Не удалось составить ответ. Попробуйте позже.', 'bad'); return; }
        if (data.status === 'completed') {
          clearInterval(timer);
          const text = String(data.response_text || '');
          U().sheet({
            title: 'Юридический ответ',
            html: `<p class="rd-sub ad-inb-first">Это шаблон. Проверьте его перед отправкой клиенту.</p><div class="rd-card ad-pad"><p class="ad-inb-text">${esc(text)}</p></div><button type="button" class="rd-btn rd-btn-block ad-inb-copy" data-copy>Скопировать</button>`,
            onOpen: (wrap) => {
              wrap.querySelector('[data-copy]').onclick = async () => {
                try { await navigator.clipboard.writeText(text); U().toast('Скопировано', 'info'); } catch (_) { U().toast('Не получилось скопировать, выделите текст вручную', 'bad'); }
              };
            },
          });
        }
      } catch (_) { /* следующая попытка */ }
    }, 3000);
  }

  function disputeReply(d, reload) {
    textSheet({
      title: 'Ответ клиенту',
      text: esc('Клиент получит сообщение в приложении.'),
      label: 'Ваш ответ', placeholder: 'Напишите коротко и по делу', min: 2, minText: 'Напишите ответ',
      action: 'Отправить',
      onSubmit: async (text, b) => {
        if (await AD.call(b, 'admin_dispute_reply', { p_id: d.id, p_text: text }, { ok: 'Ответ отправлен' }) === null) return false;
        reload();
        return true;
      },
    });
  }

  function disputeRefund(d) {
    const max = Number((d.order || {}).max_refund) || 0;
    formSheet({
      title: 'Вернуть деньги по спору',
      text: `Деньги сразу вернутся клиенту на баланс, спор закроется. Можно вернуть не больше ${money(max)}.`,
      fields: [
        { name: 'amount', label: 'Сумма возврата', value: String(max), decimal: true },
        { name: 'comment', label: 'Что написать клиенту', placeholder: 'Например: вернули деньги за повреждённый товар' },
      ],
      action: 'Вернуть деньги',
      validate: (v) => {
        const a = num(v.amount);
        if (!(a > 0)) return 'Введите сумму больше нуля';
        if (a > max + 0.001) return 'Сумма больше, чем можно вернуть по заказу';
        if (v.comment.length < 3) return 'Напишите клиенту пару слов о решении';
        return '';
      },
      onSubmit: async (v, b) => {
        const a = num(v.amount);
        if (!await codeOk(`Вернуть клиенту ${plainMoney(a)} по спору`)) return false;
        if (await AD.call(b, 'admin_dispute_decision', { p_id: d.id, p_decision: 'refund', p_comment: v.comment, p_refund: a }, { ok: 'Деньги возвращены, спор закрыт' }) === null) return false;
        leave();
        return true;
      },
    });
  }

  const VERDICT = {
    original: { title: 'Оригинал', ok: 'Вердикт отправлен клиенту: оригинал', hint: 'Клиент получит вердикт и ваш комментарий.' },
    fake: { title: 'Подделка', ok: 'Вердикт отправлен клиенту: подделка', hint: 'Клиент получит вердикт и ваш комментарий.' },
    impossible: { title: 'Не удалось проверить', ok: 'Клиенту возвращены деньги за проверку', hint: '' },
  };
  function legitVerdict(d, v) {
    const m = VERDICT[v];
    const paid = Number(d.paid) || 0;
    const refundText = v === 'impossible'
      ? (paid > 0 ? `Клиенту вернутся деньги за проверку: ${money(paid)}. Это действие нельзя отменить.` : 'Деньги за проверку списаны не были, возвращать нечего.')
      : m.hint;
    formSheet({
      title: `Вердикт: ${m.title}`,
      text: refundText,
      fields: [{ name: 'comment', label: 'Комментарий клиенту', placeholder: v === 'impossible' ? 'Например: по этим фото не определить' : 'Что вы проверили' }],
      action: v === 'impossible' && paid > 0 ? 'Вернуть деньги и закрыть' : 'Отправить вердикт',
      danger: v === 'impossible' && paid > 0,
      validate: (x) => (x.comment.length < 3 ? 'Напишите комментарий хотя бы в несколько слов' : ''),
      onSubmit: async (x, b) => {
        if (v === 'impossible' && paid > 0 && !await codeOk(`Вернуть клиенту ${plainMoney(paid)} за проверку`)) return false;
        if (await AD.call(b, 'admin_legit_verdict', { p_id: d.id, p_verdict: v, p_comment: x.comment }, { ok: m.ok }) === null) return false;
        leave();
        return true;
      },
    });
  }

  // Новые поля отзыва (этап 1): номера ICE, оценки по заказам, источник, согласие, ответ менеджера.
  // admin_inbox_list их не отдаёт — дочитываем из reviews/orders (админу RLS разрешает).
  async function reviewMore(d, root, on, reload) {
    let extra = null;
    on('adRvReply', () => reviewReply(d, extra, reload));
    const sb = window.supabaseClient;
    const box = root.querySelector('#adRvMore');
    if (!sb || !box) return;
    const { data: r, error } = await sb.from('reviews')
      .select('order_id, order_ids, order_ratings, source, consent_at, consent_version, manager_reply, manager_reply_at')
      .eq('id', d.id).maybeSingle();
    if (!box.isConnected) return;
    if (error || !r) {
      if (d.order_id) box.innerHTML = linksHtml({ order_id: d.order_id });
      box.querySelectorAll('[data-order]').forEach((x) => { x.onclick = () => AD.open('admin_order', { id: x.dataset.order }); });
      return;
    }
    extra = r;
    const ratings = r.order_ratings && typeof r.order_ratings === 'object' ? r.order_ratings : {};
    const ids = [...new Set([...(Array.isArray(r.order_ids) ? r.order_ids : []), ...Object.keys(ratings), r.order_id].filter(Boolean))];
    const nums = {};
    if (ids.length) {
      const o = await sb.from('orders').select('id, public_number').in('id', ids);
      (o.data || []).forEach((x) => { nums[x.id] = x.public_number; });
      if (!box.isConnected) return;
    }
    const star = (n) => (Number(n) ? `${Number(n)} из 5` : 'без оценки');
    let h = '';
    if (ids.length) {
      h += section(ids.length > 1 ? 'Заказы в отзыве' : 'Заказ в отзыве') + '<div class="rd-card rd-list">' + ids.map((id) => `
        <div class="rd-row" role="button" tabindex="0" data-order="${esc(id)}">
          <span class="rd-ico">${I('box', 22)}</span>
          <span class="rd-row-body"><span class="rd-row-title">${esc(nums[id] || 'Заказ ' + AD.shortId(id))}</span><span class="rd-row-text">Оценка: ${esc(star(ratings[id]))}</span></span>
          ${I('chevR', 22, { cls: 'rd-chev' })}
        </div>`).join('') + '</div>';
    }
    h += `<div class="rd-card ad-pad">${kvRow('Откуда', r.source === 'bot' ? 'Telegram-бот' : 'Приложение')}${kvRow('Согласие на публикацию', r.consent_at ? esc('дано ' + when(r.consent_at)) : 'нет')}</div>`;
    if (r.manager_reply) h += noteBlock('', 'Ваш ответ' + (r.manager_reply_at ? ' · ' + when(r.manager_reply_at) : ''), r.manager_reply);
    box.innerHTML = h;
    box.querySelectorAll('[data-order]').forEach((x) => { x.onclick = () => AD.open('admin_order', { id: x.dataset.order }); });
    const b = root.querySelector('#adRvReply');
    if (b && r.manager_reply) b.textContent = 'Изменить ответ';
  }

  function reviewReply(d, extra, reload) {
    textSheet({
      title: 'Ответ клиенту',
      text: 'Ответ увидят под отзывом. Пишите спокойно и по делу.',
      label: 'Ответ',
      value: (extra && extra.manager_reply) || '',
      placeholder: 'Спасибо за отзыв! …',
      min: 2,
      minText: 'Напишите ответ',
      max: 1000,
      action: 'Сохранить ответ',
      onSubmit: async (v) => {
        const { error } = await window.supabaseClient.from('reviews')
          .update({ manager_reply: v, manager_reply_at: new Date().toISOString() }).eq('id', d.id);
        if (error) { AD.fail(error); return false; }
        AD.haptic('success');
        U().toast('Ответ сохранён', 'ok');
        reload();
        return true;
      },
    });
  }

  // как ice_review_has_video в БД: у бота медиа — объекты {type}, у Mini App — ссылки
  function reviewHasVideo(d) {
    return (Array.isArray(d.media_urls) ? d.media_urls : []).some((m) => (m && typeof m === 'object')
      ? (m.type === 'video' || m.type === 'video_note')
      : /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(m)));
  }

  async function reviewApprove(d) {
    const hasVideo = reviewHasVideo(d);
    const text = hasVideo
      ? (d.bonus_given ? 'Отзыв увидят все клиенты. ICE BONUS за него уже выдан раньше.' : 'Отзыв увидят все клиенты. Клиент получит ICE BONUS за видео (если не исчерпан лимит на заказ или всего).')
      : 'Отзыв увидят все клиенты. ICE BONUS не начисляется: он положен только за отзыв с видео.';
    if (!await confirmSheet('Принять отзыв?', text, 'Принять и опубликовать')) return;
    if (await AD.call(null, 'admin_review_decision', { p_review: d.id, p_approve: true }, { ok: hasVideo && !d.bonus_given ? 'Отзыв опубликован, ICE BONUS начислен' : 'Отзыв опубликован' }) !== null) leave();
  }

  function ugcApprove(d) {
    formSheet({
      title: 'Одобрить видео',
      text: 'Награда сразу зачислится клиенту на баланс. Если награда не нужна, оставьте ноль.',
      fields: [{ name: 'reward', label: 'Награда', value: '0', decimal: true, hint: 'От 0 до 1000' }],
      action: 'Одобрить',
      validate: (v) => {
        const r = num(v.reward);
        if (!Number.isFinite(r) || r < 0 || r > 1000) return 'Награда должна быть от 0 до 1000';
        return '';
      },
      onSubmit: async (v, b) => {
        const r = num(v.reward);
        if (r > 0 && !await codeOk(`Выдать награду ${plainMoney(r)} за видео`)) return false;
        if (await AD.call(b, 'admin_ugc_decision', { p_id: d.id, p_approve: true, p_reward: r }, { ok: r > 0 ? 'Видео одобрено, награда выдана' : 'Видео одобрено' }) === null) return false;
        leave();
        return true;
      },
    });
  }

  // ══════════════════ Регистрация ══════════════════
  AD.screen('admin_inbox', {
    render: renderInbox,
    attach: attachInbox,
    save: () => ({ kind, status, chip: status, q: '', loaded: list.state.rows.length }),
    restore: (s) => {
      if (s) { if (KIND_SET.includes(s.kind)) kind = s.kind; status = s.status === 'done' ? 'done' : 'pending'; list.state.chip = status; }
      return s;
    },
  });
  AD.screen('admin_inbox_item', {
    guard: (p) => !!(p && p.id && p.kind && p.kind !== 'support' && KIND_SET.includes(p.kind)),
    render: renderItem,
    attach: attachItem,
  });

  window.adminOpenInbox = (k) => AD.open('admin_inbox', k ? { kind: k } : {});
})();
