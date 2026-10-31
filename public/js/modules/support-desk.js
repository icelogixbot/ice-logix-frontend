/**
 * ICE LOGIX — пульт поддержки (support-desk.html).
 *
 * Вход: подпись Telegram → функция telegram-auth → сессия Supabase → роль owner/admin/support (app_is_support).
 * Открывается из бота поддержки (кнопка «Пульт», карточки обращений) и из основного бота.
 *
 * Чтение и правки без Telegram (взять себе, заметки, шаблоны, привязка заказа) — напрямую в базе под RLS.
 * Всё, что уходит клиенту (ответ, файл, закрытие, повтор), — через функцию support-api:
 * токен бота поддержки живёт только на сервере.
 * Сводку обращения (последнее сообщение, кто ждёт) обновляет триггер базы, карточки в боте — сам бот.
 * Вибро-отклика нет: владелец просил его отключить.
 */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Lg_XPmJiyjEfJ3HBZdridA_y6oozpr3';
  const API_URL = `${SUPABASE_URL}/functions/v1/support-api`;
  const SUPPORT_BOT = 'icelogix_support_bot';
  const CLOSED_LIMIT = 100;
  const MAX_FILE = 20 * 1024 * 1024;

  const U = window.UI;
  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;
  const icon = U.icon;
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // Значок рубля для UI.money (в пульте нет app-core.js, где он объявлен для приложения)
  if (typeof window.bynSign !== 'function') {
    window.bynSign = (opts = {}) => `<svg class="byn-sign" style="height:${opts.size || '0.92em'}" viewBox="0 0 650 800" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M113 0H558V89H202V329H412A235 235 0 0 1 647 564A235 235 0 0 1 412 800H113V608H0V519H113V0ZM202 418H412A146 146 0 0 1 558 564A146 146 0 0 1 412 710H202V608H404V519H202V418Z"/></svg>`;
  }

  const ROLE_NAMES = { owner: 'владелец', admin: 'администратор', support: 'оператор' };
  const KYC_NAMES = { verified: 'Проверен', pending: 'На проверке', rejected: 'Отклонён', not_submitted: 'Не отправлен' };
  const FILTERS = [
    { id: 'waiting', label: 'Ждут ответа' },
    { id: 'mine', label: 'Мои' },
    { id: 'open', label: 'Открытые' },
    { id: 'closed', label: 'Закрытые' },
  ];
  const TICKET_FIELDS = 'id, number, user_id, user_name, user_handle, status, subject, order_id, source, operator_id, waiting_since, last_message_text, last_message_at, last_sender, unread_by_operator, created_at, closed_at, rating, reopened_count';

  const S = {
    sb: null,
    me: null,            // { tg, user_id, name, role }
    tickets: new Map(),
    filter: null,
    query: '',
    activeId: null,
    messages: [],
    orders: new Map(),   // кэш заказов для чипа «Заказ»
    team: new Map(),     // telegram id → имя (подписи «кто ответил»)
    attach: null,
    mode: 'reply',
    templates: null,
    blobUrls: new Map(),
    channel: null,
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) {} },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ВРЕМЯ И ТЕКСТ
  // ══════════════════════════════════════════════════════════════════════════

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const hm = (d) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  function shortTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (sameDay(d, now)) return hm(d);
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay(d, y)) return 'вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  }

  function dayLabel(d) {
    const now = new Date();
    if (sameDay(d, now)) return 'Сегодня';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay(d, y)) return 'Вчера';
    return d.toLocaleDateString('ru-RU', d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function waitMinutes(iso) {
    return iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)) : 0;
  }

  function minutesText(m) {
    if (m < 1) return 'меньше минуты';
    if (m < 60) return `${m} мин`;
    if (m < 1440) return `${Math.floor(m / 60)} ч ${m % 60} мин`;
    return `${Math.floor(m / 1440)} дн`;
  }

  // Ссылки в тексте сообщения кликабельны (после экранирования, так что разметку не внедрить)
  function richText(text) {
    return esc(text || '')
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»])/g, '<a href="$1" data-link="$1">$1</a>')
      .replace(/\n/g, '<br>');
  }

  // Подтверждение необратимого действия (UI.ask без полей всё равно рисует поле ввода)
  function confirmSheet(title, text, action) {
    return new Promise((resolve) => {
      let done = false;
      U.sheet({
        title,
        html: `<p class="sd-note-text">${text}</p><div class="sd-sheet-btns">
          <button type="button" class="rd-btn rd-btn-danger rd-btn-block" data-yes="1">${action}</button>
          <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" data-close="1">Отмена</button></div>`,
        onClose: () => { if (!done) resolve(false); },
        onOpen: (wrap, close) => { wrap.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); close(); }; },
      });
    });
  }

  const initial = (name) => esc(((name || 'К').trim()[0] || 'К').toUpperCase());
  const firstName = (t) => ((t && t.user_name) || '').trim().split(/\s+/)[0] || '';
  const isMine = (t) => t && S.me && Number(t.operator_id) === S.me.tg;

  // ══════════════════════════════════════════════════════════════════════════
  // СЕРВЕР
  // ══════════════════════════════════════════════════════════════════════════

  async function api(body, file) {
    const { data } = await S.sb.auth.getSession();
    const headers = { Authorization: `Bearer ${data && data.session ? data.session.access_token : ''}`, apikey: SUPABASE_KEY };
    let init;
    if (file) {
      const fd = new FormData();
      Object.entries(body).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)));
      fd.append('file', file, file.name || 'file');
      init = { method: 'POST', headers, body: fd };
    } else {
      headers['Content-Type'] = 'application/json';
      init = { method: 'POST', headers, body: JSON.stringify(body) };
    }
    const res = await fetch(API_URL, init);
    if (body.action === 'file') {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Файл недоступен');
      }
      return res.blob();
    }
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.ok === false) throw new Error(out.error || 'Сервер не ответил, попробуйте ещё раз');
    return out;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ВХОД
  // ══════════════════════════════════════════════════════════════════════════

  function gate(html) {
    const el = $('sdGate');
    el.hidden = false;
    el.innerHTML = html;
    $('sdApp').hidden = true;
  }

  function denied(title, text, withClose) {
    gate(`<div class="rd-empty">
      <div class="rd-empty-ico">${icon('lock', 30)}</div>
      <div class="rd-empty-title">${title}</div>
      <p class="rd-empty-text">${text}</p>
      ${withClose ? '<button type="button" class="rd-btn" id="sdGateClose">Закрыть</button>' : ''}
    </div>`);
    const btn = $('sdGateClose');
    if (btn) btn.onclick = () => (tg && tg.close ? tg.close() : window.close());
  }

  async function init() {
    if (tg) {
      try { tg.ready(); tg.expand(); } catch (_) {}
      try {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--rd-bg').trim();
        if (bg) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); if (tg.setBottomBarColor) tg.setBottomBarColor(bg); }
      } catch (_) {}
      if (tg.BackButton) tg.BackButton.onClick(backToList);
    }
    if (!window.supabase || !window.supabase.createClient) {
      denied('Пульт не загрузился', 'Закройте окно и откройте пульт заново.', true);
      return;
    }
    S.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    if (!tg || !tg.initData) {
      denied('Откройте пульт из Telegram', `Пульт работает внутри Telegram: бот @${SUPPORT_BOT}, кнопка «Пульт».`, false);
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const auth = await res.json();
      if (!auth.ok || !auth.session) throw new Error(auth.error || 'auth');
      await S.sb.auth.setSession({ access_token: auth.session.access_token, refresh_token: auth.session.refresh_token });
      const { data: me } = await S.sb.from('users').select('user_id, telegram_id, full_name, username, role')
        .eq('auth_id', auth.session.user.id).maybeSingle();
      if (!me || !ROLE_NAMES[me.role]) {
        denied('Пульт только для команды поддержки', `Если вы оператор, попросите владельца добавить вас: команда /team в боте @${SUPPORT_BOT}.`, true);
        return;
      }
      const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
      S.me = {
        tg: Number(me.telegram_id || me.user_id),
        user_id: me.user_id,
        name: me.full_name || (tgUser && tgUser.first_name) || 'Оператор',
        role: me.role,
      };
    } catch (e) {
      console.error('[desk] вход:', e);
      denied('Не получилось войти', 'Проверьте интернет, закройте окно и откройте пульт заново.', true);
      return;
    }

    $('sdGate').hidden = true;
    $('sdApp').hidden = false;
    paintStatic();
    bind();
    await Promise.all([loadTickets(), loadTeamNames()]);
    subscribe();

    const params = new URLSearchParams(location.search);
    const start = params.get('ticket') || (isDesktop() ? store.get('sd_active') : null);
    if (start) await openTicket(start);
    setInterval(() => { renderList(); if (S.activeId) renderWho(); }, 30000);
  }

  function paintStatic() {
    $('sdMe').textContent = `${S.me.name} · ${ROLE_NAMES[S.me.role]}`;
    $('sdTemplatesBtn').innerHTML = icon('zap', 22);
    $('sdTeamBtn').innerHTML = icon('users', 22);
    $('sdSearchField').insertAdjacentHTML('afterbegin', icon('search', 20));
    $('sdBack').innerHTML = icon('chevL', 22);
    $('sdTplBtn').innerHTML = icon('zap', 22);
    $('sdFileBtn').innerHTML = icon('image', 22);
    $('sdSend').innerHTML = icon('send', 20);
    $('sdChatEmpty').innerHTML = U.empty({ icon: 'message', title: 'Выберите обращение', text: 'Слева список: сначала те, кто ждёт ответа дольше всех.' });
  }

  async function loadTeamNames() {
    try {
      const { data } = await S.sb.rpc('support_team');
      (data || []).forEach((m) => S.team.set(Number(m.user_id), m.name || (m.username || '').replace(/^@/, '')));
    } catch (_) { /* подписи «кто ответил» необязательны */ }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // СПИСОК ОБРАЩЕНИЙ
  // ══════════════════════════════════════════════════════════════════════════

  async function loadTickets() {
    if (!S.tickets.size) $('sdTickets').innerHTML = `<div class="rd-card">${'<div class="sd-skel rd-shimmer"></div>'.repeat(5)}</div>`;
    try {
      const [open, closed] = await Promise.all([
        S.sb.from('support_tickets').select(TICKET_FIELDS).neq('status', 'closed').order('last_message_at', { ascending: false }),
        S.sb.from('support_tickets').select(TICKET_FIELDS).eq('status', 'closed').order('closed_at', { ascending: false }).limit(CLOSED_LIMIT),
      ]);
      if (open.error) throw open.error;
      S.tickets = new Map([...(open.data || []), ...(closed.data || [])].map((t) => [t.id, t]));
      if (!S.filter) {
        const saved = store.get('sd_filter');
        S.filter = FILTERS.some((f) => f.id === saved) ? saved : (count('waiting') ? 'waiting' : 'open');
      }
      renderFilters();
      renderList();
    } catch (e) {
      console.error('[desk] список:', e);
      $('sdTickets').innerHTML = U.empty({ icon: 'alert', title: 'Список не загрузился', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Обновить', actionId: 'sdReload' });
      const b = $('sdReload');
      if (b) b.onclick = loadTickets;
    }
  }

  function inFilter(t, f) {
    if (f === 'waiting') return t.status === 'open';
    if (f === 'mine') return t.status !== 'closed' && isMine(t);
    if (f === 'open') return t.status !== 'closed';
    return t.status === 'closed';
  }

  function count(f) {
    let n = 0;
    S.tickets.forEach((t) => { if (inFilter(t, f)) n++; });
    return n;
  }

  function renderFilters() {
    $('sdFilters').innerHTML = FILTERS.map((f) => {
      const n = f.id === 'closed' ? 0 : count(f.id);
      return `<button type="button" class="rd-chip${S.filter === f.id ? ' on' : ''}" role="tab" aria-selected="${S.filter === f.id}" data-filter="${f.id}">${f.label}${n ? `<span class="sd-chip-n">${n}</span>` : ''}</button>`;
    }).join('');
  }

  function matches(t, q) {
    if (!q) return true;
    if (/^#?\d+$/.test(q)) {
      const n = q.replace('#', '');
      if (String(t.number) === n || String(t.user_id) === n) return true;
    }
    return [t.user_name, t.user_handle, t.last_message_text, t.subject].some((v) => (v || '').toLowerCase().includes(q));
  }

  function sortedList() {
    const q = S.query.trim().toLowerCase();
    const list = [...S.tickets.values()].filter((t) => inFilter(t, S.filter) && matches(t, q));
    if (S.filter === 'waiting') return list.sort((a, b) => new Date(a.waiting_since || a.last_message_at) - new Date(b.waiting_since || b.last_message_at));
    if (S.filter === 'closed') return list.sort((a, b) => new Date(b.closed_at || b.last_message_at) - new Date(a.closed_at || a.last_message_at));
    return list.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  }

  function statusPill(t) {
    if (t.status === 'closed') return `<span class="rd-status sd-muted">${icon('check', 13)}Закрыто${t.rating ? ` · оценка ${t.rating}` : ''}</span>`;
    if (t.waiting_since) {
      const m = waitMinutes(t.waiting_since);
      const tone = m >= 120 ? ' bad' : m >= 30 ? ' warn' : '';
      return `<span class="rd-status${tone}">${icon('clock', 13)}Ждёт ${minutesText(m)}</span>`;
    }
    return `<span class="rd-status">${icon('check', 13)}Отвечено</span>`;
  }

  function lastLine(t) {
    const prefix = t.last_sender === 'operator' ? '<em>Поддержка:</em> ' : '';
    return prefix + esc(t.last_message_text || t.subject || 'Новое обращение');
  }

  function renderList() {
    const box = $('sdTickets');
    const list = sortedList();
    if (!list.length) {
      const empty = S.query
        ? { icon: 'search', title: 'Ничего не нашлось', text: 'Попробуйте имя, часть текста или номер обращения.' }
        : S.filter === 'waiting'
          ? { icon: 'checkCircle', title: 'Все ответы отправлены', text: 'Новые обращения появятся здесь сразу, как клиент напишет боту.' }
          : S.filter === 'mine'
            ? { icon: 'user', title: 'У вас нет обращений', text: 'Нажмите «Взять себе» в обращении, и оно появится здесь.' }
            : S.filter === 'closed'
              ? { icon: 'history', title: 'Закрытых пока нет', text: 'Здесь будут последние 100 закрытых обращений.' }
              : { icon: 'message', title: 'Открытых обращений нет', text: `Клиенты пишут в бот @${SUPPORT_BOT}, обращения появятся здесь.` };
      box.innerHTML = U.empty(empty);
      return;
    }
    box.innerHTML = `<div class="rd-card">${list.map((t) => `
      <button type="button" class="sd-row${t.id === S.activeId ? ' on' : ''}${t.unread_by_operator ? ' unread' : ''}" data-id="${t.id}">
        <span class="sd-ava">${initial(t.user_name)}${t.unread_by_operator ? '<i class="sd-dot"></i>' : ''}</span>
        <span class="sd-row-body">
          <span class="sd-row-top"><span class="sd-row-name">${esc(t.user_name || 'Клиент')}</span><time class="sd-time">${shortTime(t.last_message_at)}</time></span>
          <span class="sd-row-text">${lastLine(t)}</span>
          <span class="sd-row-meta">
            <span class="sd-num">#${t.number}</span>
            ${t.order_id ? `<span class="sd-tag">${icon('box', 13)}заказ</span>` : ''}
            ${t.operator_id && !isMine(t) && t.status !== 'closed' ? `<span class="sd-tag">${icon('user', 13)}${esc(S.team.get(Number(t.operator_id)) || 'коллега')}</span>` : ''}
            ${statusPill(t)}
          </span>
        </span>
      </button>`).join('')}</div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ДИАЛОГ
  // ══════════════════════════════════════════════════════════════════════════

  const active = () => S.tickets.get(S.activeId);

  async function openTicket(id) {
    let t = S.tickets.get(id);
    if (!t) {
      const { data } = await S.sb.from('support_tickets').select(TICKET_FIELDS).eq('id', id).maybeSingle();
      if (!data) { U.toast('Обращение не найдено', 'bad'); return; }
      S.tickets.set(id, data);
      t = data;
    }
    saveDraft();
    S.activeId = id;
    S.attach = null;
    store.set('sd_active', id);
    $('sdChatEmpty').hidden = true;
    $('sdRoom').hidden = false;
    $('sdApp').classList.add('in-chat');
    if (tg && tg.BackButton && !isDesktop()) tg.BackButton.show();

    setMode('reply');
    renderWho();
    renderActions();
    renderAttach();
    renderList();
    $('sdMsgs').innerHTML = '<div class="sd-gate-spin" style="margin:40px auto"></div>';
    $('sdInput').value = store.get(`sd_draft_${id}`) || '';
    autosize();

    const { data, error } = await S.sb.from('support_messages').select('*').eq('ticket_id', id)
      .order('created_at', { ascending: true }).limit(500);
    if (S.activeId !== id) return;
    if (error) {
      $('sdMsgs').innerHTML = U.empty({ icon: 'alert', title: 'Переписка не загрузилась', text: 'Попробуйте открыть обращение ещё раз.' });
      return;
    }
    S.messages = data || [];
    renderMessages(true);
    if (!coarse) $('sdInput').focus();

    if (t.unread_by_operator) {
      t.unread_by_operator = false;
      renderList();
      S.sb.from('support_tickets').update({ unread_by_operator: false }).eq('id', id).then(() => {});
    }
  }

  function backToList() {
    saveDraft();
    $('sdApp').classList.remove('in-chat');
    if (tg && tg.BackButton) tg.BackButton.hide();
    if (!isDesktop()) {
      S.activeId = null;
      store.set('sd_active', null);
    }
    updateClosingConfirmation();
    renderList();
  }

  function renderWho() {
    const t = active();
    if (!t) return;
    let sub;
    if (t.status === 'closed') sub = `#${t.number} · закрыто`;
    else if (t.waiting_since) sub = `#${t.number} · ждёт ответа ${minutesText(waitMinutes(t.waiting_since))}`;
    else sub = `#${t.number} · отвечено`;
    if (t.user_handle) sub += ` · @${t.user_handle}`;
    $('sdWho').innerHTML = `
      <span class="sd-ava">${initial(t.user_name)}</span>
      <span class="sd-who-txt"><span class="sd-who-name">${esc(t.user_name || 'Клиент')}</span><span class="sd-who-sub">${esc(sub)}</span></span>
      ${icon('chevR', 20)}`;
  }

  async function renderActions() {
    const t = active();
    if (!t) return;
    const btns = [];
    if (t.order_id) btns.push(`<button type="button" class="rd-btn rd-btn-sm rd-btn-tonal sd-order-chip" data-act="client">${icon('box', 16)}<span id="sdOrderLabel">Заказ</span></button>`);
    if (t.status !== 'closed' && !isMine(t)) btns.push(`<button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-act="take">${icon('user', 16)}Взять себе</button>`);
    if (t.status !== 'closed') btns.push(`<button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-act="close">${icon('checkCircle', 16)}Закрыть обращение</button>`);
    else btns.push(`<button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-act="reopen">${icon('refresh', 16)}Открыть снова</button>`);
    btns.push(`<button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-act="client">${icon('idcard', 16)}Клиент и заказы</button>`);
    $('sdActions').innerHTML = btns.join('');

    if (t.order_id) {
      const o = await getOrder(t.order_id);
      const label = $('sdOrderLabel');
      if (o && label && S.activeId === t.id) label.textContent = `${U.orderTitle(o)} · ${U.orderStatus(o.status).text}`;
    }
  }

  async function getOrder(id) {
    if (S.orders.has(id)) return S.orders.get(id);
    const { data } = await S.sb.from('orders')
      .select('id, user_id, status, title, title_translated, title_original, items, cart_items, source_url, created_at, total_byn')
      .eq('id', id).maybeSingle();
    if (data) S.orders.set(id, data);
    return data;
  }

  function senderLabel(m) {
    if (m.is_internal) return `${icon('pencil', 13)}Заметка · ${esc(m.sender_name || 'команда')} · клиент не видит`;
    if (m.sender_type === 'operator' && S.team.size > 1) return esc(m.sender_name || S.team.get(Number(m.sender_id)) || 'Поддержка');
    return '';
  }

  function mediaHtml(m) {
    if (!m.media_type) return '';
    const id = esc(m.id);
    const pending = String(m.id).startsWith('tmp-');
    if (m.media_type === 'photo' || (m.media_type === 'sticker' && m.mime_type === 'image/webp')) {
      if (pending && m._preview) return `<span class="sd-photo"><img src="${m._preview}" alt=""></span>`;
      return `<button type="button" class="sd-photo${m.media_type === 'sticker' ? ' sticker' : ''}" data-photo="${id}" aria-label="Открыть фото"><span class="sd-ph">${icon('image', 28)}</span></button>`;
    }
    const kinds = {
      video: ['Видео', 'Показать', 'camera'], animation: ['GIF', 'Показать', 'image'], video_note: ['Видеосообщение', 'Показать', 'camera'],
      voice: ['Голосовое сообщение', 'Прослушать', 'message'], audio: ['Аудио', 'Прослушать', 'message'],
      document: ['Файл', 'Открыть', 'receipt'], sticker: ['Стикер', 'Показать', 'image'],
    };
    const [label, hint, ico] = kinds[m.media_type] || ['Вложение', 'Открыть', 'receipt'];
    const play = ['video', 'animation', 'video_note', 'voice', 'audio'].includes(m.media_type);
    return `<button type="button" class="sd-file" ${pending ? 'disabled' : `data-${play ? 'play' : 'doc'}="${id}"`}>
      <span class="sd-file-ico">${icon(ico, 18)}</span>
      <span class="sd-file-txt"><span class="sd-file-name">${esc(m.file_name || label)}</span><span class="sd-file-hint">${pending ? 'Отправляется…' : hint}</span></span>
    </button>`;
  }

  function messageHtml(m) {
    const time = hm(new Date(m.created_at));
    if (m.sender_type === 'system') return `<div class="sd-sys">${esc(m.text)} · ${time}</div>`;
    const cls = m.is_internal ? 'note' : m.sender_type === 'operator' ? 'out' : 'in';
    const pending = String(m.id).startsWith('tmp-');
    const who = senderLabel(m);
    let html = `<div class="sd-msg ${cls}${pending ? ' pending' : ''}" data-mid="${esc(m.id)}">
      ${who ? `<div class="sd-msg-who">${who}</div>` : ''}
      ${mediaHtml(m)}
      ${m.text ? `<div class="sd-msg-text">${richText(m.text)}</div>` : ''}
      <div class="sd-msg-foot">${pending ? 'Отправляется…' : time}</div>
    </div>`;
    if (m.delivery === 'failed') {
      html += `<button type="button" class="sd-fail" data-retry="${esc(m.id)}">${icon('alert', 15)}Не доставлено · Повторить</button>`;
    }
    return html;
  }

  function renderMessages(toBottom) {
    const box = $('sdMsgs');
    const t = active();
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (!S.messages.length) {
      box.innerHTML = U.empty({ icon: 'message', title: 'Сообщений пока нет', text: 'Напишите клиенту первым, ответ придёт ему в бот поддержки.' });
      return;
    }
    let lastDay = '';
    const parts = [];
    if (t && t.source === 'order') parts.push('<div class="sd-sys">Клиент написал из карточки заказа</div>');
    else if (t && t.source === 'app') parts.push('<div class="sd-sys">Клиент написал из приложения</div>');
    S.messages.forEach((m) => {
      const d = new Date(m.created_at);
      const key = d.toDateString();
      if (key !== lastDay) { parts.push(`<div class="sd-day">${dayLabel(d)}</div>`); lastDay = key; }
      parts.push(messageHtml(m));
    });
    box.innerHTML = parts.join('');
    observeMedia();
    if (toBottom || nearBottom) box.scrollTop = box.scrollHeight;
  }

  // ── Вложения: фото подгружаем, когда они видны; видео и голос — по нажатию ──

  let mediaObserver = null;
  function observeMedia() {
    const items = $('sdMsgs').querySelectorAll('[data-photo]');
    if (!('IntersectionObserver' in window)) { items.forEach(loadPhoto); return; }
    if (!mediaObserver) {
      mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { mediaObserver.unobserve(e.target); loadPhoto(e.target); } });
      }, { root: $('sdMsgs'), rootMargin: '200px' });
    }
    items.forEach((el) => mediaObserver.observe(el));
  }

  async function blobUrl(messageId) {
    if (S.blobUrls.has(messageId)) return S.blobUrls.get(messageId);
    const blob = await api({ action: 'file', message_id: messageId });
    const url = URL.createObjectURL(blob);
    S.blobUrls.set(messageId, url);
    return url;
  }

  async function loadPhoto(el) {
    const id = el.dataset.photo;
    try {
      const url = await blobUrl(id);
      const box = $('sdMsgs');
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      el.innerHTML = `<img src="${url}" alt="Фото из переписки">`;
      const img = el.querySelector('img');
      img.onload = () => { if (atBottom) box.scrollTop = box.scrollHeight; };
    } catch (e) {
      el.innerHTML = `<span class="sd-ph">${icon('alert', 22)}</span>`;
      el.title = e.message;
    }
  }

  async function playMedia(btn) {
    const id = btn.dataset.play;
    const m = S.messages.find((x) => String(x.id) === id);
    if (!m) return;
    btn.querySelector('.sd-file-hint').textContent = 'Загружаю…';
    try {
      const url = await blobUrl(id);
      const isAudio = m.media_type === 'voice' || m.media_type === 'audio';
      const el = document.createElement(isAudio ? 'audio' : 'video');
      el.src = url;
      el.controls = true;
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      if (m.media_type === 'animation') { el.loop = true; el.muted = true; }
      btn.replaceWith(el);
    } catch (e) {
      btn.querySelector('.sd-file-hint').textContent = e.message;
    }
  }

  async function openDoc(btn) {
    const hint = btn.querySelector('.sd-file-hint');
    hint.textContent = 'Готовлю ссылку…';
    try {
      const { url } = await api({ action: 'link', message_id: btn.dataset.doc });
      if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener');
      hint.textContent = 'Открыть';
    } catch (e) {
      hint.textContent = e.message;
    }
  }

  function viewPhoto(src) {
    const v = document.createElement('div');
    v.className = 'sd-viewer';
    v.innerHTML = `<img src="${src}" alt="Фото"><button type="button" class="sd-icon-btn" aria-label="Закрыть">${icon('x', 22)}</button>`;
    v.onclick = () => v.remove();
    document.body.appendChild(v);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ОТПРАВКА
  // ══════════════════════════════════════════════════════════════════════════

  function setMode(mode) {
    S.mode = mode;
    $('sdComposer').classList.toggle('note', mode === 'note');
    $('sdMode').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('sdInput').placeholder = mode === 'note' ? 'Заметка для команды, клиент её не увидит' : 'Ответ клиенту';
    $('sdFileBtn').disabled = mode === 'note';
    if (mode === 'note' && S.attach) { S.attach = null; renderAttach(); }
  }

  function autosize() {
    const el = $('sdInput');
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 140)}px`;
    $('sdSend').disabled = !el.value.trim() && !S.attach;
    updateClosingConfirmation();
  }

  function updateClosingConfirmation() {
    if (!tg) return;
    const dirty = !!(S.activeId && ($('sdInput').value.trim() || S.attach));
    try { if (dirty) tg.enableClosingConfirmation(); else tg.disableClosingConfirmation(); } catch (_) {}
  }

  function saveDraft() {
    if (!S.activeId) return;
    store.set(`sd_draft_${S.activeId}`, $('sdInput').value.trim() ? $('sdInput').value : null);
  }

  function renderAttach() {
    const box = $('sdAttach');
    const f = S.attach;
    if (!f) { box.hidden = true; box.innerHTML = ''; autosize(); return; }
    const isImg = f.type.startsWith('image/');
    const size = f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(f.size / 1024))} КБ`;
    box.hidden = false;
    box.innerHTML = `
      ${isImg ? `<img src="${f._preview}" alt="">` : `<span class="sd-file-ico">${icon('receipt', 18)}</span>`}
      <span class="sd-file-txt"><span class="sd-file-name">${esc(f.name)}</span><span class="sd-file-hint">${size}${isImg ? ' · фото' : ''}</span></span>
      <button type="button" class="sd-cbtn" id="sdAttachX" aria-label="Убрать вложение">${icon('x', 18)}</button>`;
    $('sdAttachX').onclick = () => { S.attach = null; renderAttach(); };
    autosize();
  }

  function pickFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE) { U.toast('Файл больше 20 МБ, Telegram его не примет', 'bad'); return; }
    if (file.type.startsWith('image/')) file._preview = URL.createObjectURL(file);
    S.attach = file;
    setMode('reply');
    renderAttach();
  }

  async function send() {
    const t = active();
    const input = $('sdInput');
    const text = input.value.trim();
    const file = S.attach;
    if (!t || (!text && !file)) return;
    if (text.length > 4000) { U.toast('Сообщение длиннее 4000 символов, разбейте его на части', 'bad'); return; }

    input.value = '';
    store.set(`sd_draft_${t.id}`, null);
    S.attach = null;
    renderAttach();
    autosize();

    if (S.mode === 'note') {
      const { data, error } = await S.sb.from('support_messages').insert({
        ticket_id: t.id, sender_type: 'operator', sender_id: S.me.tg, sender_name: S.me.name, text, is_internal: true,
      }).select('*').single();
      if (error) { input.value = text; autosize(); U.toast('Заметка не сохранилась', 'bad'); return; }
      upsertMessage(data);
      return;
    }

    const tmp = {
      id: `tmp-${Date.now()}`, ticket_id: t.id, sender_type: 'operator', sender_id: S.me.tg, sender_name: S.me.name,
      text, created_at: new Date().toISOString(), media_type: file ? (file.type.startsWith('image/') ? 'photo' : 'document') : null,
      file_name: file ? file.name : null, _preview: file && file._preview,
    };
    S.messages.push(tmp);
    renderMessages(true);
    try {
      const res = await api({ action: 'reply', ticket_id: t.id, text }, file);
      S.messages = S.messages.filter((m) => m.id !== tmp.id);
      if (res.message) upsertMessage(res.message); else renderMessages();
      if (!res.delivered) U.toast(res.error || 'Сообщение не доставлено', 'bad');
    } catch (e) {
      S.messages = S.messages.filter((m) => m.id !== tmp.id);
      renderMessages();
      input.value = text;
      if (file) { S.attach = file; renderAttach(); }
      autosize();
      U.toast(e.message, 'bad');
    }
  }

  async function retry(id) {
    try {
      const res = await api({ action: 'retry', message_id: id });
      if (!res.delivered) { U.toast(res.error || 'Снова не доставлено', 'bad'); return; }
      S.messages = S.messages.filter((m) => String(m.id) !== String(res.replaced));
      if (res.message) upsertMessage(res.message); else renderMessages();
      U.toast('Доставлено');
    } catch (e) {
      U.toast(e.message, 'bad');
    }
  }

  function upsertMessage(m) {
    if (!m || m.ticket_id !== S.activeId) return;
    const i = S.messages.findIndex((x) => String(x.id) === String(m.id));
    if (i >= 0) S.messages[i] = m;
    else {
      // Пришло из реального времени раньше ответа сервера — убираем черновой пузырь с тем же текстом
      const tmpIdx = S.messages.findIndex((x) => String(x.id).startsWith('tmp-') && m.sender_type === 'operator'
        && Number(m.sender_id) === S.me.tg && (x.text || '') === (m.text || ''));
      if (tmpIdx >= 0) S.messages.splice(tmpIdx, 1);
      S.messages.push(m);
      S.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
    renderMessages(m.sender_type !== 'client' || undefined);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ДЕЙСТВИЯ С ОБРАЩЕНИЕМ
  // ══════════════════════════════════════════════════════════════════════════

  function patchTicket(id, fields) {
    const t = S.tickets.get(id);
    if (t) Object.assign(t, fields);
    renderFilters();
    renderList();
    if (id === S.activeId) { renderWho(); renderActions(); }
  }

  async function take() {
    const t = active();
    const { error } = await S.sb.from('support_tickets').update({ operator_id: S.me.tg }).eq('id', t.id);
    if (error) { U.toast('Не получилось', 'bad'); return; }
    patchTicket(t.id, { operator_id: S.me.tg });
    U.toast('Обращение ваше');
  }

  function closeAsk() {
    const t = active();
    U.sheet({
      title: `Закрыть обращение #${t.number}?`,
      html: `<p class="sd-note-text">Клиент получит сообщение о закрытии и сможет оценить ответ или нажать «Вопрос не решён», тогда обращение откроется снова.</p>
        <div class="sd-sheet-btns">
          <button type="button" class="rd-btn rd-btn-block" data-close-notify="1">Закрыть и попросить оценку</button>
          <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" data-close-notify="0">Закрыть без сообщения клиенту</button>
        </div>`,
      onOpen: (wrap, close) => {
        wrap.querySelectorAll('[data-close-notify]').forEach((b) => {
          b.onclick = async () => {
            b.disabled = true;
            try {
              await api({ action: 'close', ticket_id: t.id, notify: b.dataset.closeNotify === '1' });
              patchTicket(t.id, { status: 'closed', waiting_since: null, closed_at: new Date().toISOString() });
              close();
              U.toast(`Обращение #${t.number} закрыто`);
            } catch (e) {
              b.disabled = false;
              U.toast(e.message, 'bad');
            }
          };
        });
      },
    });
  }

  async function reopen() {
    const t = active();
    const { error } = await S.sb.from('support_tickets').update({ status: 'in_progress' }).eq('id', t.id);
    if (error) { U.toast('Не получилось открыть', 'bad'); return; }
    await S.sb.from('support_messages').insert({ ticket_id: t.id, sender_type: 'system', sender_id: S.me.tg, sender_name: S.me.name, text: `${S.me.name} открыл обращение снова` });
    patchTicket(t.id, { status: 'in_progress', closed_at: null });
  }

  // ── Шторка «Клиент и заказы» ──
  async function clientSheet() {
    const t = active();
    const sheet = U.sheet({ title: 'Клиент', html: '<div class="sd-gate-spin" style="margin:30px auto"></div>' });
    const [userRes, ordersRes, historyRes] = await Promise.all([
      S.sb.from('users').select('full_name, username, phone, kyc_status, ices_balance, created_at').eq('user_id', t.user_id).maybeSingle(),
      S.sb.from('orders').select('id, status, title, title_translated, title_original, items, cart_items, source_url, created_at, total_byn')
        .eq('user_id', t.user_id).order('created_at', { ascending: false }).limit(10),
      S.sb.from('support_tickets').select('id, number, status, subject, created_at').eq('user_id', t.user_id).neq('id', t.id)
        .order('created_at', { ascending: false }).limit(10),
    ]);
    const u = userRes.data || {};
    const orders = ordersRes.data || [];
    orders.forEach((o) => S.orders.set(o.id, o));
    const history = historyRes.data || [];
    const handle = (t.user_handle || u.username || '').replace(/^@/, '');
    const body = sheet.el.querySelector('.rd-sheet-body');
    if (!body) return;

    body.innerHTML = `
      <div class="sd-client">
        <span class="sd-ava">${initial(t.user_name || u.full_name)}</span>
        <div><div class="sd-client-name">${esc(t.user_name || u.full_name || 'Клиент')}</div>
        <div class="sd-client-sub">${handle ? `@${esc(handle)} · ` : ''}ID ${t.user_id}</div></div>
      </div>
      <dl class="rd-card sd-kv" style="margin-top:14px">
        ${userRes.data ? `
          <dt>Баланс</dt><dd>${U.money(u.ices_balance || 0, { keepCents: true, digits: 2 })}</dd>
          <dt>Паспорт</dt><dd>${esc(KYC_NAMES[u.kyc_status] || 'Не отправлен')}</dd>
          ${u.phone ? `<dt>Телефон</dt><dd>${esc(u.phone)}</dd>` : ''}
          ${u.created_at ? `<dt>С нами с</dt><dd>${new Date(u.created_at).toLocaleDateString('ru-RU')}</dd>` : ''}
        ` : '<dt>Профиль</dt><dd>Ещё не открывал приложение</dd>'}
      </dl>
      <div class="sd-sheet-btns">
        ${handle ? `<button type="button" class="rd-btn rd-btn-ghost rd-btn-block" data-tg="${esc(handle)}">${icon('send', 18)}Открыть чат в Telegram</button>` : ''}
        <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" data-copy="${t.user_id}">${icon('copy', 18)}Скопировать ID</button>
      </div>

      <div class="sd-sheet-sec">Заказы${orders.length ? ' · нажмите, чтобы связать с обращением' : ''}</div>
      ${orders.length ? `<div class="rd-card">${orders.map((o) => {
        const st = U.orderStatus(o.status);
        const linked = o.id === t.order_id;
        return `<button type="button" class="sd-line" data-order="${o.id}">
          <span class="rd-ico">${icon('box', 20)}</span>
          <span class="sd-line-body"><span class="sd-line-title">${esc(U.orderTitle(o))}</span>
          <span class="sd-line-text">${new Date(o.created_at).toLocaleDateString('ru-RU')}${o.total_byn ? ` · ${U.money(o.total_byn, { keepCents: true, digits: 2 })}` : ''}</span></span>
          ${linked ? `<span class="rd-status ok">${icon('link', 13)}В обращении</span>` : `<span class="rd-status${st.tone ? ' ' + st.tone : ''}">${esc(st.text)}</span>`}
        </button>`;
      }).join('')}</div>` : '<p class="sd-note-text">Заказов пока нет.</p>'}

      <div class="sd-sheet-sec">Прошлые обращения</div>
      ${history.length ? `<div class="rd-card">${history.map((h) => `
        <button type="button" class="sd-line" data-ticket="${h.id}">
          <span class="sd-line-body"><span class="sd-line-title">#${h.number} · ${esc(h.subject || 'Без темы')}</span>
          <span class="sd-line-text">${h.created_at ? new Date(h.created_at).toLocaleDateString('ru-RU') + ' · ' : ''}${h.status === 'closed' ? 'закрыто' : 'открыто'}</span></span>
          ${icon('chevR', 20, { cls: 'rd-chev' })}
        </button>`).join('')}</div>` : '<p class="sd-note-text">Это первое обращение клиента.</p>'}`;

    body.onclick = async (e) => {
      const tgBtn = e.target.closest('[data-tg]');
      if (tgBtn) { const url = `https://t.me/${tgBtn.dataset.tg}`; if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank'); return; }
      const copy = e.target.closest('[data-copy]');
      if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copy); U.toast('ID скопирован'); } catch (_) { U.toast(copy.dataset.copy, 'info'); } return; }
      const ord = e.target.closest('[data-order]');
      if (ord) {
        const orderId = ord.dataset.order === t.order_id ? null : ord.dataset.order;
        const { error } = await S.sb.from('support_tickets').update({ order_id: orderId }).eq('id', t.id);
        if (error) { U.toast('Не получилось', 'bad'); return; }
        patchTicket(t.id, { order_id: orderId });
        sheet.close();
        U.toast(orderId ? 'Заказ связан с обращением' : 'Заказ отвязан');
        return;
      }
      const tk = e.target.closest('[data-ticket]');
      if (tk) { sheet.close(); openTicket(tk.dataset.ticket); }
    };
  }

  // ── Шаблоны ответов ──
  async function loadTemplates() {
    const { data } = await S.sb.from('support_templates').select('*').order('sort').order('created_at');
    S.templates = data || [];
    return S.templates;
  }

  function fillTemplate(body) {
    const name = firstName(active());
    return body.replace(/\{имя\}/g, name).replace(/\s+([,!?.])/g, '$1').replace(/,\s*!/g, '!');
  }

  async function templatesSheet(insertMode) {
    const list = S.templates || await loadTemplates();
    const sheet = U.sheet({
      title: insertMode ? 'Шаблоны ответов' : 'Шаблоны ответов',
      html: `
        ${list.length ? `<div class="rd-card">${list.map((tp) => `
          <div class="sd-line" ${insertMode ? `data-use="${tp.id}" role="button" tabindex="0"` : ''}>
            <span class="sd-line-body"><span class="sd-line-title">${esc(tp.title)}</span><span class="sd-line-text clamp">${esc(tp.body)}</span></span>
            ${insertMode ? '' : `<span class="sd-line-actions">
              <button type="button" class="sd-cbtn" data-edit="${tp.id}" aria-label="Изменить">${icon('pencil', 18)}</button>
              <button type="button" class="sd-cbtn" data-del="${tp.id}" aria-label="Удалить">${icon('trash', 18)}</button></span>`}
          </div>`).join('')}</div>` : '<p class="sd-note-text">Шаблонов пока нет. Добавьте ответы, которые пишете чаще всего.</p>'}
        <p class="sd-note-text" style="margin-top:12px">${insertMode ? 'Слово {имя} в шаблоне заменится на имя клиента.' : 'В тексте можно написать {имя} — подставится имя клиента.'}</p>
        <div class="sd-sheet-btns">
          ${insertMode ? '<button type="button" class="rd-btn rd-btn-ghost rd-btn-block" data-manage="1">Изменить шаблоны</button>'
            : `<button type="button" class="rd-btn rd-btn-block" data-new="1">${icon('plus', 18)}Новый шаблон</button>`}
        </div>`,
      onOpen: (wrap, close) => {
        wrap.querySelector('.rd-sheet-body').onclick = async (e) => {
          const use = e.target.closest('[data-use]');
          if (use) {
            const tp = list.find((x) => x.id === use.dataset.use);
            const input = $('sdInput');
            input.value = (input.value.trim() ? input.value.trimEnd() + '\n' : '') + fillTemplate(tp.body);
            autosize();
            close();
            input.focus();
            return;
          }
          if (e.target.closest('[data-manage]')) { close(); templatesSheet(false); return; }
          if (e.target.closest('[data-new]')) { close(); editTemplate(null); return; }
          const ed = e.target.closest('[data-edit]');
          if (ed) { close(); editTemplate(list.find((x) => x.id === ed.dataset.edit)); return; }
          const del = e.target.closest('[data-del]');
          if (del) {
            const tp = list.find((x) => x.id === del.dataset.del);
            close();
            if (!await confirmSheet(`Удалить «${esc(tp.title)}»?`, 'Шаблон пропадёт у всей команды.', 'Удалить шаблон')) { templatesSheet(false); return; }
            const { error } = await S.sb.from('support_templates').delete().eq('id', tp.id);
            if (error) { U.toast('Не получилось удалить', 'bad'); return; }
            await loadTemplates();
            templatesSheet(false);
          }
        };
      },
    });
    return sheet;
  }

  function editTemplate(tp) {
    U.sheet({
      title: tp ? 'Изменить шаблон' : 'Новый шаблон',
      html: `<form class="sd-form" novalidate>
        <label><span class="rd-label">Короткое название</span><span class="rd-field"><input name="title" maxlength="40" value="${esc(tp ? tp.title : '')}" placeholder="Например, Сроки доставки" autocomplete="off"></span></label>
        <label><span class="rd-label">Текст ответа</span><span class="rd-field"><textarea name="body" class="sd-textarea" maxlength="2000" placeholder="Здравствуйте, {имя}! …">${esc(tp ? tp.body : '')}</textarea></span></label>
        <p class="rd-ask-err" hidden></p>
        <button type="submit" class="rd-btn rd-btn-block">Сохранить</button>
      </form>`,
      onOpen: (wrap, close) => {
        const form = wrap.querySelector('form');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const title = form.elements.title.value.trim();
          const body = form.elements.body.value.trim();
          const err = form.querySelector('.rd-ask-err');
          if (!title || !body) { err.textContent = 'Заполните название и текст'; err.hidden = false; return; }
          const row = { title, body, updated_at: new Date().toISOString() };
          const q = tp
            ? S.sb.from('support_templates').update(row).eq('id', tp.id)
            : S.sb.from('support_templates').insert({ ...row, sort: ((S.templates || []).length + 1) * 10, created_by: S.me.tg });
          const { error } = await q;
          if (error) { err.textContent = 'Не сохранилось, попробуйте ещё раз'; err.hidden = false; return; }
          await loadTemplates();
          close();
          U.toast('Шаблон сохранён');
          templatesSheet(false);
        };
      },
    });
  }

  // ── Команда ──
  async function teamSheet() {
    const owner = S.me.role === 'owner';
    const sheet = U.sheet({ title: 'Команда поддержки', html: '<div class="sd-gate-spin" style="margin:30px auto"></div>' });
    const render = async () => {
      const { data, error } = await S.sb.rpc('support_team');
      const body = sheet.el.querySelector('.rd-sheet-body');
      if (!body) return;
      if (error) { body.innerHTML = U.empty({ icon: 'alert', title: 'Не загрузилось', text: 'Попробуйте ещё раз.' }); return; }
      body.innerHTML = `
        <div class="rd-card">${(data || []).map((m) => {
          const self = Number(m.user_id) === S.me.user_id;
          const canBell = owner || self;
          return `<div class="sd-line">
            <span class="sd-ava">${initial(m.name || m.username)}</span>
            <span class="sd-line-body">
              <span class="sd-line-title">${esc(m.name || (m.username || '').replace(/^@/, '') || m.user_id)}${self ? ' (вы)' : ''}</span>
              <span class="sd-line-text">${ROLE_NAMES[m.role] || m.role}${m.role === 'support' && !m.has_login ? ' · ещё не открывал пульт' : ''} · уведомления ${m.notify ? 'вкл' : 'выкл'}</span>
            </span>
            ${canBell ? `<label class="rd-switch" aria-label="Уведомления о новых обращениях"><input type="checkbox" data-bell="${m.user_id}" ${m.notify ? 'checked' : ''}><span></span></label>` : ''}
            ${owner && m.role === 'support' ? `<button type="button" class="sd-cbtn" data-remove="${m.user_id}" data-name="${esc(m.name || '')}" aria-label="Убрать из операторов">${icon('trash', 18)}</button>` : ''}
          </div>`;
        }).join('')}</div>
        <p class="sd-note-text" style="margin-top:12px">Переключатель — приходят ли карточки новых обращений в бот поддержки.</p>
        ${owner ? `<div class="sd-sheet-btns"><button type="button" class="rd-btn rd-btn-block" data-add="1">${icon('plus', 18)}Добавить оператора</button></div>
          <p class="sd-note-text" style="margin-top:12px">Самый простой способ — в боте @${SUPPORT_BOT}: команда /team → «Добавить оператора» → выбрать человека из контактов.</p>`
          : '<p class="sd-note-text">Добавлять и убирать операторов может владелец.</p>'}`;
    };
    await render();
    sheet.el.addEventListener('change', async (e) => {
      const bell = e.target.closest('[data-bell]');
      if (!bell) return;
      const { error } = await S.sb.rpc('support_set_notify', { p_user: Number(bell.dataset.bell), p_on: bell.checked });
      if (error) { bell.checked = !bell.checked; U.toast(error.message || 'Не получилось', 'bad'); return; }
      U.toast(bell.checked ? 'Уведомления включены' : 'Уведомления выключены');
      render();
    });
    sheet.el.addEventListener('click', async (e) => {
      const rm = e.target.closest('[data-remove]');
      if (rm) {
        const ok = await confirmSheet(`Убрать ${esc(rm.dataset.name || 'оператора')}?`, 'Он потеряет доступ к пульту и перестанет получать обращения.', 'Убрать из операторов');
        if (!ok) return;
        const { error } = await S.sb.rpc('support_set_operator', { p_user: Number(rm.dataset.remove), p_on: false });
        if (error) { U.toast(error.message || 'Не получилось', 'bad'); return; }
        U.toast('Убрали из операторов');
        render();
        return;
      }
      if (e.target.closest('[data-add]')) {
        const id = await U.ask({
          title: 'Новый оператор',
          text: 'Введите числовой Telegram ID человека. Если не знаете его, добавьте оператора из бота поддержки: /team → «Добавить оператора».',
          fields: [{ name: 'id', label: 'Telegram ID', inputmode: 'numeric', placeholder: 'Например, 123456789' }],
          action: 'Сделать оператором',
          validate: (v) => (/^\d{5,15}$/.test(v.id) ? '' : 'Нужен числовой ID, только цифры'),
        });
        if (!id) return;
        const { error } = await S.sb.rpc('support_set_operator', { p_user: Number(id), p_on: true });
        if (error) { U.toast(error.message || 'Не получилось', 'bad'); return; }
        U.toast('Готово. Попросите его нажать «Начать» в боте поддержки');
        loadTeamNames();
        render();
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // РЕАЛЬНОЕ ВРЕМЯ
  // ══════════════════════════════════════════════════════════════════════════

  function subscribe() {
    if (S.channel) S.sb.removeChannel(S.channel);
    S.channel = S.sb.channel(`support-desk-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (p) => {
        if (p.eventType === 'DELETE') { S.tickets.delete(p.old.id); renderFilters(); renderList(); return; }
        const row = p.new;
        const prev = S.tickets.get(row.id);
        const merged = Object.assign({}, prev || {}, row);
        if (row.id === S.activeId && document.visibilityState === 'visible' && $('sdApp').classList.contains('in-chat')) merged.unread_by_operator = false;
        S.tickets.set(row.id, merged);
        renderFilters();
        renderList();
        if (row.id === S.activeId) {
          renderWho();
          if (!prev || prev.status !== row.status || prev.operator_id !== row.operator_id || prev.order_id !== row.order_id) renderActions();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (p) => {
        upsertMessage(p.new);
        if (p.new.ticket_id === S.activeId && p.new.sender_type === 'client') {
          S.sb.from('support_tickets').update({ unread_by_operator: false }).eq('id', S.activeId).then(() => {});
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_messages' }, (p) => {
        const before = S.messages.length;
        S.messages = S.messages.filter((m) => String(m.id) !== String(p.old.id));
        if (S.messages.length !== before) renderMessages();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => { subscribe(); loadTickets(); }, 4000);
        }
      });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // СОБЫТИЯ
  // ══════════════════════════════════════════════════════════════════════════

  function bind() {
    $('sdFilters').onclick = (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      S.filter = b.dataset.filter;
      store.set('sd_filter', S.filter);
      renderFilters();
      renderList();
      $('sdTickets').scrollTop = 0;
    };
    $('sdSearch').oninput = (e) => { S.query = e.target.value; renderList(); };
    $('sdTickets').onclick = (e) => {
      const row = e.target.closest('[data-id]');
      if (row) openTicket(row.dataset.id);
    };
    $('sdBack').onclick = backToList;
    $('sdWho').onclick = clientSheet;
    $('sdActions').onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      ({ take, close: closeAsk, reopen, client: clientSheet })[b.dataset.act]();
    };
    $('sdTeamBtn').onclick = teamSheet;
    $('sdTemplatesBtn').onclick = () => templatesSheet(false);
    $('sdTplBtn').onclick = () => templatesSheet(true);
    $('sdMode').onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); };
    $('sdFileBtn').onclick = () => $('sdFileInput').click();
    $('sdFileInput').onchange = (e) => { pickFile(e.target.files[0]); e.target.value = ''; };
    $('sdSend').onclick = send;

    const input = $('sdInput');
    input.oninput = autosize;
    input.onblur = saveDraft;
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !coarse) { e.preventDefault(); send(); }
    };
    input.addEventListener('paste', (e) => {
      const file = [...(e.clipboardData ? e.clipboardData.files : [])][0];
      if (file && S.mode === 'reply') { e.preventDefault(); pickFile(file); }
    });

    $('sdMsgs').onclick = (e) => {
      const link = e.target.closest('[data-link]');
      if (link) { e.preventDefault(); if (tg && tg.openLink) tg.openLink(link.dataset.link); else window.open(link.dataset.link, '_blank', 'noopener'); return; }
      const photo = e.target.closest('[data-photo]');
      if (photo) { const img = photo.querySelector('img'); if (img) viewPhoto(img.src); return; }
      const play = e.target.closest('[data-play]');
      if (play) { playMedia(play); return; }
      const doc = e.target.closest('[data-doc]');
      if (doc) { openDoc(doc); return; }
      const re = e.target.closest('[data-retry]');
      if (re) { re.disabled = true; retry(re.dataset.retry).finally(() => { re.disabled = false; }); }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        loadTickets();
        if (S.activeId) {
          S.sb.from('support_messages').select('*').eq('ticket_id', S.activeId).order('created_at', { ascending: true }).limit(500)
            .then(({ data }) => { if (data) { S.messages = data; renderMessages(); } });
        }
      } else {
        saveDraft();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
