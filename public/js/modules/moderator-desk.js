/* ICE LOGIX — Модерация: отдельное мини-приложение бота-модератора (moderator-desk.html).
 * Вход: Telegram initData → функция telegram-auth → сессия Supabase; пускаем только владельца.
 * Данные — серверные функции admin_mod_* (они сами проверяют роль). Бот: ice-logix-moderator/. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Lg_XPmJiyjEfJ3HBZdridA_y6oozpr3';
  const MOD_BOT = 'icx_moder_adm_bot';
  const PAGE = 40;

  const U = window.UI;
  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;
  const icon = U.icon;
  const num = (n) => Number(n || 0).toLocaleString('ru-RU');

  const SECTIONS = [['chats', 'Чаты'], ['words', 'Слова'], ['gban', 'Бан везде'], ['log', 'Журнал']];
  const KIND_RU = { channel: 'Канал', supergroup: 'Группа', group: 'Группа' };
  const ACTION_RU = {
    delete: 'Удалено', ban: 'Бан', unban: 'Разбан', mute: 'Мут', unmute: 'Мут снят', kick: 'Исключён',
    warn: 'Предупреждение', unwarn: 'Предупреждение снято', gban: 'Бан везде', captcha_fail: 'Не прошёл проверку',
  };
  const RULE_RU = {
    link: 'Ссылка', forward: 'Пересылка', mention: 'Упоминание', flood: 'Флуд', repeat: 'Повтор', stopword: 'Стоп-слово',
    channel: 'Сообщение от канала', night: 'Ночной режим', newbie: 'Новичок с медиа', captcha: 'Проверка', raid: 'Рейд',
    gban: 'Бан везде', manual: 'Вручную', service: 'Служебное',
  };

  // Настройки по группам. Ключи и значения по умолчанию совпадают с DEFAULTS в moderator_bot.py
  const GROUPS = [
    { title: 'Новые участники', items: [
      { k: 'captcha', t: 'switch', l: 'Проверка «я не бот»', h: 'Новичок должен нажать кнопку' },
      { k: 'captcha_timeout', t: 'num', l: 'Время на проверку, сек', min: 20, max: 900 },
      { k: 'captcha_action', t: 'sel', l: 'Не прошёл проверку', opts: [['kick', 'Исключить'], ['ban', 'Забанить']] },
      { k: 'newbie_hours', t: 'num', l: 'Без медиа и ссылок первые, часов', h: '0 — выключено', min: 0, max: 720 },
      { k: 'antiraid', t: 'switch', l: 'Защита от рейда', h: 'Много входов подряд — блок новичков' },
      { k: 'raid_joins', t: 'num', l: 'Входов для тревоги', min: 3, max: 100 },
      { k: 'raid_seconds', t: 'num', l: 'За сколько секунд', min: 5, max: 600 },
      { k: 'welcome', t: 'switch', l: 'Приветствие' },
      { k: 'welcome_text', t: 'text', l: 'Текст приветствия', h: '{name} — имя участника' },
      { k: 'welcome_delete_sec', t: 'num', l: 'Убрать приветствие через, сек', h: '0 — не убирать', min: 0, max: 3600 },
      { k: 'rules_text', t: 'text', l: 'Правила чата', h: 'Показывает команда /rules' },
    ] },
    { title: 'Сообщения', items: [
      { k: 'antilink', t: 'switch', l: 'Удалять ссылки' },
      { k: 'allow_domains', t: 'list', l: 'Разрешённые домены', h: 'Через запятую, например icelogix.by' },
      { k: 'antiforward', t: 'switch', l: 'Удалять пересылки' },
      { k: 'antimention', t: 'switch', l: 'Удалять упоминания @' },
      { k: 'stopwords', t: 'switch', l: 'Стоп-слова', h: 'Список — во вкладке «Слова»' },
      { k: 'words_warn', t: 'switch', l: 'Предупреждать за стоп-слова' },
      { k: 'block_channels', t: 'switch', l: 'Блокировать сообщения от имени каналов', h: 'Для комментариев под постами' },
      { k: 'del_service', t: 'switch', l: 'Убирать «вошёл / вышел»' },
      { k: 'night', t: 'switch', l: 'Ночной режим', h: 'Ночью сообщения удаляются' },
      { k: 'night_from', t: 'num', l: 'Ночь с, час', min: 0, max: 23 },
      { k: 'night_to', t: 'num', l: 'Ночь до, час', min: 0, max: 23 },
    ] },
    { title: 'Флуд и повторы', items: [
      { k: 'antiflood', t: 'switch', l: 'Защита от флуда' },
      { k: 'flood_count', t: 'num', l: 'Сообщений', min: 2, max: 50 },
      { k: 'flood_seconds', t: 'num', l: 'За секунд', min: 2, max: 120 },
      { k: 'flood_mute_min', t: 'num', l: 'Мут за флуд, мин', min: 1, max: 10080 },
      { k: 'antirepeat', t: 'switch', l: 'Одинаковые сообщения подряд' },
      { k: 'repeat_count', t: 'num', l: 'Сколько повторов', min: 2, max: 20 },
    ] },
    { title: 'Предупреждения', items: [
      { k: 'warn_limit', t: 'num', l: 'Предупреждений до наказания', min: 1, max: 20 },
      { k: 'warn_action', t: 'sel', l: 'Наказание', opts: [['mute', 'Мут'], ['ban', 'Бан'], ['kick', 'Исключить']] },
      { k: 'warn_mute_min', t: 'num', l: 'Длительность мута, мин', min: 1, max: 525600 },
      { k: 'warn_ttl_days', t: 'num', l: 'Предупреждение живёт, дней', min: 1, max: 365 },
    ] },
    { title: 'Клиенты и журнал', items: [
      { k: 'trust_clients', t: 'switch', l: 'Доверять клиентам с заказами', h: 'Их сообщения не трогаем' },
      { k: 'log_chat_id', t: 'str', l: 'Чат для отчётов', h: 'Номер чата, куда бот пишет о действиях' },
      { k: 'log_deletes', t: 'switch', l: 'Писать об удалениях в чат отчётов' },
    ] },
  ];
  const DEFAULTS = {
    captcha: false, captcha_timeout: 120, captcha_action: 'kick', antilink: true, allow_domains: [], antiforward: false,
    antimention: false, antiflood: true, flood_count: 6, flood_seconds: 10, flood_mute_min: 10, antirepeat: true,
    repeat_count: 3, stopwords: true, words_warn: true, block_channels: true, newbie_hours: 0, warn_limit: 3,
    warn_action: 'mute', warn_mute_min: 1440, warn_ttl_days: 30, welcome: false,
    welcome_text: 'Добро пожаловать, {name}! Правила чата — команда /rules', welcome_delete_sec: 60, rules_text: '',
    night: false, night_from: 23, night_to: 7, antiraid: false, raid_joins: 8, raid_seconds: 30, del_service: true,
    trust_clients: true, log_chat_id: '', log_deletes: false,
  };

  const S = { sb: null, cur: 'chats', chats: [], chatId: null, token: 0, cta: null };

  function timeAgo(ts) {
    if (!ts) return '';
    const min = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  async function rpc(name, args) {
    try {
      const { data, error } = await S.sb.rpc(name, args || {});
      return { data, error };
    } catch (e) { return { data: null, error: e }; }
  }
  const fail = (err) => U.toast((err && err.message) || 'Не получилось, попробуйте ещё раз', 'bad');

  // ── Вход ──
  function gate(html) { const g = $('mdGate'); g.hidden = false; $('mdApp').hidden = true; g.innerHTML = html; }
  function denied(title, text, withClose) {
    gate(`<div class="rd-empty">
      <div class="rd-empty-ico">${icon('lock', 30)}</div>
      <div class="rd-empty-title">${title}</div>
      <p class="rd-empty-text">${text}</p>
      ${withClose ? '<button type="button" class="rd-btn" id="mdGateClose">Закрыть</button>' : ''}
    </div>`);
    const btn = $('mdGateClose');
    if (btn) btn.onclick = () => (tg && tg.close ? tg.close() : window.close());
  }

  async function init() {
    if (tg) {
      try { tg.ready(); tg.expand(); } catch (_) {}
      try {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--rd-bg').trim();
        if (bg) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); if (tg.setBottomBarColor) tg.setBottomBarColor(bg); }
      } catch (_) {}
    }
    if (!window.supabase || !window.supabase.createClient) {
      denied('Модерация не загрузилась', 'Закройте окно и откройте её заново.', true);
      return;
    }
    S.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    if (!tg || !tg.initData) {
      denied('Откройте из Telegram', `Модерация работает внутри Telegram: бот @${MOD_BOT}, кнопка «Модерация».`, false);
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
      const { data: me } = await S.sb.from('users').select('user_id, full_name, role').eq('auth_id', auth.session.user.id).maybeSingle();
      if (!me || me.role !== 'owner') {
        denied('Только для владельца', 'Модерация чатов и каналов доступна владельцу ICE LOGIX.', true);
        return;
      }
    } catch (e) {
      console.error('[mod] вход:', e);
      denied('Не получилось войти', 'Проверьте интернет, закройте окно и откройте модерацию заново.', true);
      return;
    }
    $('mdGate').hidden = true;
    $('mdApp').hidden = false;
    $('mdBack').innerHTML = icon('chevL', 22);
    $('mdRefresh').innerHTML = icon('refresh', 20);
    $('mdBack').onclick = showList;
    $('mdRefresh').onclick = () => (S.chatId ? loadChat() : load());
    if (tg && tg.BackButton) tg.BackButton.onClick(() => { if (S.chatId) showList(); else tg.close(); });
    $('mdChips').innerHTML = SECTIONS.map(([id, t]) => `<button class="rd-chip${id === S.cur ? ' on' : ''}" data-sec="${id}">${t}</button>`).join('');
    $('mdChips').onclick = (e) => {
      const b = e.target.closest('[data-sec]');
      if (!b || b.dataset.sec === S.cur) return;
      S.cur = b.dataset.sec;
      $('mdChips').querySelectorAll('.rd-chip').forEach((c) => c.classList.toggle('on', c === b));
      load();
    };
    showList();
  }

  // ── Каркас ──
  function setCta(label, run) {
    const box = $('mdCta');
    S.cta = run;
    box.hidden = !label;
    $('mdBody').classList.toggle('has-cta', !!label);
    if (label) $('mdCtaBtn').textContent = label;
  }
  const bindCta = () => { $('mdCtaBtn').onclick = async (e) => { if (!S.cta) return; const b = e.currentTarget; b.disabled = true; try { await S.cta(); } finally { b.disabled = false; } }; };

  function showList() {
    S.chatId = null;
    $('mdBack').hidden = true;
    $('mdTabs').hidden = false;
    $('mdTitle').textContent = 'Модерация';
    $('mdSub').textContent = 'Чаты, каналы и комментарии';
    if (tg && tg.BackButton) tg.BackButton.hide();
    load();
  }

  const loading = () => '<div class="rd-card rd-list">' + Array.from({ length: 4 }, () => '<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">&nbsp;</div><div class="rd-row-text">&nbsp;</div></div></div>').join('') + '</div>';
  const empty = (o) => U.empty(o);

  function load() {
    const my = ++S.token;
    setCta(null);
    const host = $('mdBody');
    host.innerHTML = loading();
    host.scrollTop = 0;
    ({ chats: loadChats, words: loadWords, gban: loadGban, log: loadLog })[S.cur](my, host);
  }

  function failed(my, host, res, retry) {
    if (my !== S.token) return true;
    if (res.error) {
      host.innerHTML = empty({ icon: 'lock', title: 'Не удалось загрузить', text: esc(res.error.message || 'Проверьте интернет') });
      return true;
    }
    return false;
  }

  // ── Чаты ──
  async function loadChats(my, host) {
    const res = await rpc('admin_mod_overview');
    if (failed(my, host, res)) return;
    const d = res.data || {};
    S.chats = d.chats || [];
    const stat = (n, t) => `<div class="rd-card md-stat"><b>${num(n)}</b><span>${t}</span></div>`;
    const rows = S.chats.map((c) => {
      const warn = !c.bot_is_admin ? 'Бот не админ' : (!c.can_delete || !c.can_restrict ? 'Мало прав' : '');
      const st = !c.enabled ? '<span class="rd-status">Выключен</span>' : (warn ? `<span class="rd-status warn">${warn}</span>` : '<span class="rd-status ok">Работает</span>');
      const sub = [KIND_RU[c.kind] || 'Чат', c.username ? '@' + c.username : '', c.members ? num(c.members) + ' уч.' : '', `${num(c.actions_24h)} действий за сутки`].filter(Boolean).join(' · ');
      return `<button class="rd-row" data-chat="${esc(c.chat_id)}"><div class="rd-row-body"><div class="rd-row-title">${esc(c.title || c.chat_id)}</div><div class="rd-row-text">${esc(sub)}</div></div>${st}</button>`;
    }).join('');
    host.innerHTML = `<div class="md-stats">${stat(d.actions_24h, 'действий за сутки')}${stat(d.bans_24h, 'банов за сутки')}${stat(d.gbans, 'бан везде')}</div>
      ${S.chats.length ? `<div class="rd-card rd-list">${rows}</div>` : empty({ icon: 'shield', title: 'Чатов пока нет', text: 'Бот появится в списке, как только в чате или канале что-то произойдёт: сообщение, пост или новый участник.' })}`;
    host.querySelectorAll('[data-chat]').forEach((b) => { b.onclick = () => openChat(b.dataset.chat); });
    if (S.chats.length) { setCta('Настройки для всех чатов', applyAll); bindCta(); }
  }

  // ── Форма настроек (общая для чата и «для всех») ──
  const swHtml = (it, val) => `<label class="md-sw"><span class="md-sw-t"><b>${it.l}</b>${it.h ? `<small>${it.h}</small>` : ''}</span><span class="rd-switch"><input type="checkbox" data-k="${it.k}"${val ? ' checked' : ''}><span></span></span></label>`;

  function fieldHtml(it, val) {
    if (it.t === 'switch') return swHtml(it, val);
    let inp;
    if (it.t === 'sel') inp = `<span class="rd-field"><select data-k="${it.k}">${it.opts.map(([v, t]) => `<option value="${v}"${v === val ? ' selected' : ''}>${t}</option>`).join('')}</select></span>`;
    else if (it.t === 'num') inp = `<span class="rd-field"><input type="number" inputmode="numeric" data-k="${it.k}" value="${esc(val)}" min="${it.min}" max="${it.max}"></span>`;
    else if (it.t === 'text') inp = `<span class="rd-field"><textarea rows="3" data-k="${it.k}">${esc(val)}</textarea></span>`;
    else if (it.t === 'list') inp = `<span class="rd-field"><input type="text" data-k="${it.k}" value="${esc((val || []).join(', '))}"></span>`;
    else inp = `<span class="rd-field"><input type="text" inputmode="numeric" data-k="${it.k}" value="${esc(val)}"></span>`;
    return `<label class="md-fld"><span class="md-sw-t"><b>${it.l}</b>${it.h ? `<small>${it.h}</small>` : ''}</span>${inp}</label>`;
  }
  const formHtml = (vals) => GROUPS.map((g) => `<div class="rd-section"><h2>${g.title}</h2></div><div class="rd-card md-card">${g.items.map((it) => fieldHtml(it, vals[it.k])).join('')}</div>`).join('');

  function collect(root, only) {
    const out = {};
    for (const g of GROUPS) for (const it of g.items) {
      if (only && !only.includes(it.k)) continue;
      const el = root.querySelector(`[data-k="${it.k}"]`);
      if (!el) continue;
      if (it.t === 'switch') out[it.k] = el.checked;
      else if (it.t === 'num') {
        let n = parseInt(el.value, 10);
        if (isNaN(n)) n = DEFAULTS[it.k];
        out[it.k] = Math.min(it.max, Math.max(it.min, n));
      } else if (it.t === 'list') out[it.k] = el.value.split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      else out[it.k] = el.value.trim();
    }
    return out;
  }

  // Подтверждение шторкой: Promise<boolean>
  function confirmSheet(title, text, action, danger) {
    return new Promise((resolve) => {
      let done = false;
      U.sheet({
        title,
        html: `${text ? `<p class="md-hint">${esc(text)}</p>` : ''}<button type="button" class="rd-btn rd-btn-block${danger ? ' rd-btn-danger' : ''}" id="mdYes">${esc(action)}</button>`,
        onClose: () => { if (!done) resolve(false); },
        onOpen: (wrap, close) => { wrap.querySelector('#mdYes').onclick = () => { done = true; resolve(true); close(); }; },
      });
    });
  }

  function applyAll() {
    U.sheet({
      title: 'Настройки для всех чатов',
      html: `<p class="md-hint">Сохранённые значения заменят настройки во всех ${S.chats.length} чатах. Отметьте группы, которые нужно применить.</p>
        ${GROUPS.map((g, i) => `<label class="md-grp"><b>${g.title}</b><span class="rd-switch"><input type="checkbox" data-grp="${i}"><span></span></span></label>`).join('')}
        <div id="mdAllForm">${formHtml(DEFAULTS)}</div>
        <button class="rd-btn rd-btn-block" id="mdAllGo" style="margin-top:16px">Применить ко всем</button>`,
      onOpen(wrap, close) {
        wrap.querySelector('#mdAllGo').onclick = async (e) => {
          const picked = [...wrap.querySelectorAll('[data-grp]')].filter((c) => c.checked).flatMap((c) => GROUPS[+c.dataset.grp].items.map((it) => it.k));
          if (!picked.length) { U.toast('Отметьте хотя бы одну группу'); return; }
          if (!(await confirmSheet('Применить ко всем чатам?', `Будут изменены настройки в ${S.chats.length} чатах.`, 'Применить', false))) return;
          const btn = e.currentTarget; btn.disabled = true;
          const res = await rpc('admin_mod_apply_all', { p_settings: collect(wrap, picked) });
          btn.disabled = false;
          if (res.error) { fail(res.error); return; }
          U.toast('Применено'); close(); load();
        };
      },
    });
  }

  // ── Один чат ──
  function openChat(id) {
    S.chatId = String(id);
    $('mdBack').hidden = false;
    $('mdTabs').hidden = true;
    if (tg && tg.BackButton) tg.BackButton.show();
    loadChat();
  }

  async function loadChat() {
    const my = ++S.token;
    const host = $('mdBody');
    setCta(null);
    host.innerHTML = loading();
    host.scrollTop = 0;
    const res = await rpc('admin_mod_chat', { p_chat_id: Number(S.chatId) });
    if (my !== S.token) return;
    if (res.error || !res.data) { host.innerHTML = empty({ icon: 'lock', title: 'Не удалось загрузить', text: esc((res.error && res.error.message) || 'Чат не найден') }); return; }
    const c = res.data;
    const vals = Object.assign({}, DEFAULTS, c.settings || {});
    $('mdTitle').textContent = c.title || 'Чат';
    $('mdSub').textContent = [KIND_RU[c.kind] || 'Чат', c.username ? '@' + c.username : ''].filter(Boolean).join(' · ');
    const s = c.stats || {};
    const stat = (n, t) => `<div class="rd-card md-stat"><b>${num(n)}</b><span>${t}</span></div>`;
    const warn = !c.bot_is_admin ? 'Бот не администратор этого чата — модерация не работает.'
      : (!c.can_delete || !c.can_restrict ? 'Боту не хватает прав: нужны «Удалять сообщения» и «Блокировать участников».' : '');
    host.innerHTML = `${warn ? `<div class="rd-card md-note"><span class="rd-status warn">Внимание</span><span class="md-hint" style="margin:0">${warn}</span></div>` : ''}
      ${c.kind === 'channel' && c.linked_chat_id ? '<p class="md-hint">Комментарии модерируются в связанной группе.</p>' : ''}
      <div class="md-stats">${stat(s.deleted_24h, 'удалено')}${stat(s.warned_24h, 'предупреждений')}${stat(s.banned_24h, 'банов')}</div>
      <div class="rd-card md-card"><label class="md-sw"><span class="md-sw-t"><b>Модерация включена</b><small>Стоп-слов в этом чате: ${num(s.words)}</small></span><span class="rd-switch"><input type="checkbox" id="mdEnabled"${c.enabled ? ' checked' : ''}><span></span></span></label></div>
      <div id="mdChatForm">${formHtml(vals)}</div>`;
    setCta('Сохранить', saveChat); bindCta();
  }

  async function saveChat() {
    const form = $('mdChatForm'), en = $('mdEnabled');
    if (!form || !en) return;
    const res = await rpc('admin_mod_chat_save', { p_chat_id: Number(S.chatId), p_settings: collect(form), p_enabled: en.checked });
    if (res.error) { fail(res.error); return; }
    U.toast('Сохранено');
  }

  // ── Стоп-слова ──
  async function loadWords(my, host) {
    const res = await rpc('admin_mod_words_list', { p_chat_id: null });
    if (failed(my, host, res)) return;
    const list = res.data || [];
    const rows = list.map((w) => `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(w.word)}</div><div class="rd-row-text">${w.kind === 'regex' ? 'Шаблон' : 'Слово'}</div></div><button class="md-icon-btn md-plain" data-del="${w.id}" aria-label="Удалить">${icon('trash', 18)}</button></div>`).join('');
    host.innerHTML = list.length ? `<p class="md-hint">Общий список — для всех чатов.</p><div class="rd-card rd-list">${rows}</div>`
      : empty({ icon: 'text', title: 'Список пуст', text: 'Добавьте слова, которые бот будет удалять.' });
    host.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmSheet('Удалить слово?', '', 'Удалить', true))) return;
        const r = await rpc('admin_mod_word_del', { p_id: Number(b.dataset.del) });
        if (r.error) { fail(r.error); return; }
        load();
      };
    });
    setCta('Добавить слово', addWord); bindCta();
  }

  function addWord() {
    return new Promise((resolve) => {
      U.sheet({
        title: 'Новое стоп-слово',
        onClose: resolve,
        html: `<label class="md-fld"><span class="rd-label">Слово или фраза</span><span class="rd-field"><input type="text" id="mdWord" placeholder="например: казино" autocomplete="off"></span></label>
          <label class="md-sw"><span class="md-sw-t"><b>Это шаблон (regex)</b><small>Для продвинутых</small></span><span class="rd-switch"><input type="checkbox" id="mdRegex"><span></span></span></label>
          <button class="rd-btn rd-btn-block" id="mdWordGo" style="margin-top:16px">Добавить</button>`,
        onOpen(wrap, close) {
          setTimeout(() => { const i = wrap.querySelector('#mdWord'); if (i) i.focus(); }, 320);
          wrap.querySelector('#mdWordGo').onclick = async (e) => {
            const w = wrap.querySelector('#mdWord').value.trim().toLowerCase();
            if (!w) { U.toast('Введите слово'); return; }
            const btn = e.currentTarget; btn.disabled = true;
            const r = await rpc('admin_mod_word_add', { p_chat_id: null, p_word: w, p_kind: wrap.querySelector('#mdRegex').checked ? 'regex' : 'word' });
            btn.disabled = false;
            if (r.error) { fail(r.error); return; }
            close(); load();
          };
        },
      });
    });
  }

  // ── Бан везде ──
  async function loadGban(my, host) {
    const res = await rpc('admin_mod_gban_list');
    if (failed(my, host, res)) return;
    const list = res.data || [];
    const rows = list.map((g) => `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(g.user_name || g.user_id)}</div><div class="rd-row-text">${esc(g.user_id)}${g.reason ? ' · ' + esc(g.reason) : ''} · ${timeAgo(g.created_at)}</div></div><button class="md-icon-btn md-plain" data-un="${esc(g.user_id)}" aria-label="Снять бан">${icon('x', 18)}</button></div>`).join('');
    host.innerHTML = list.length ? `<p class="md-hint">Эти люди забанены во всех чатах сразу.</p><div class="rd-card rd-list">${rows}</div>`
      : empty({ icon: 'shield', title: 'Никто не забанен', text: 'Бан везде действует сразу во всех чатах и каналах.' });
    host.querySelectorAll('[data-un]').forEach((b) => {
      b.onclick = async () => {
        if (!(await confirmSheet('Снять бан везде?', 'Человек сможет снова писать во всех чатах.', 'Снять', true))) return;
        const r = await rpc('admin_mod_gban_del', { p_user_id: Number(b.dataset.un) });
        if (r.error) { fail(r.error); return; }
        load();
      };
    });
    setCta('Забанить везде', addGban); bindCta();
  }

  function addGban() {
    return new Promise((resolve) => {
      U.sheet({
        title: 'Бан везде',
        onClose: resolve,
        html: `<label class="md-fld"><span class="rd-label">Номер пользователя в Telegram</span><span class="rd-field"><input type="text" inputmode="numeric" id="mdUid" placeholder="123456789" autocomplete="off"></span><small class="md-hint">Узнать номер можно командой /id в чате</small></label>
          <label class="md-fld"><span class="rd-label">Причина</span><span class="rd-field"><input type="text" id="mdReason" placeholder="Спам" autocomplete="off"></span></label>
          <button class="rd-btn rd-btn-block rd-btn-danger" id="mdGbanGo" style="margin-top:16px">Забанить</button>`,
        onOpen(wrap, close) {
          wrap.querySelector('#mdGbanGo').onclick = async (e) => {
            const uid = wrap.querySelector('#mdUid').value.trim();
            if (!/^\d{5,}$/.test(uid)) { U.toast('Нужен числовой номер'); return; }
            const btn = e.currentTarget; btn.disabled = true;
            const r = await rpc('admin_mod_gban_add', { p_user_id: Number(uid), p_reason: wrap.querySelector('#mdReason').value.trim() });
            btn.disabled = false;
            if (r.error) { fail(r.error); return; }
            close(); load();
          };
        },
      });
    });
  }

  // ── Журнал ──
  async function loadLog(my, host) {
    const res = await rpc('admin_mod_log', { p_chat_id: null, p_limit: PAGE, p_offset: 0 });
    if (failed(my, host, res)) return;
    const list = res.data || [];
    if (!list.length) { host.innerHTML = empty({ icon: 'text', title: 'Журнал пуст', text: 'Здесь появятся действия бота-модератора.' }); return; }
    const rows = list.map((a) => {
      const what = ACTION_RU[a.action] || a.action;
      const rule = a.rule ? (RULE_RU[a.rule] || a.rule) : '';
      const sub = [a.chat_title, a.user_name || a.user_id, rule || a.reason, timeAgo(a.created_at)].filter(Boolean).join(' · ');
      const un = (a.action === 'ban' || a.action === 'kick') && a.user_id
        ? `<button class="md-icon-btn md-plain" data-unban="${esc(a.chat_id)}:${esc(a.user_id)}" aria-label="Разбанить">${icon('x', 18)}</button>` : '';
      return `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(what)}</div><div class="rd-row-text">${esc(sub)}</div></div>${un}</div>`;
    }).join('');
    host.innerHTML = `<div class="rd-card rd-list">${rows}</div>`;
    host.querySelectorAll('[data-unban]').forEach((b) => {
      b.onclick = async () => {
        const [c, u] = b.dataset.unban.split(':');
        if (!(await confirmSheet('Разбанить?', 'Бот снимет бан в этом чате.', 'Разбанить', false))) return;
        const r = await rpc('admin_mod_unban', { p_chat_id: Number(c), p_user_id: Number(u) });
        if (r.error) { fail(r.error); return; }
        U.toast('Запрос отправлен боту');
      };
    });
  }

  init();
})();
