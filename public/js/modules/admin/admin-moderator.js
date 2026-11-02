/* ICE LOGIX — Админка, экран «Модерация»: чаты и каналы, правила, стоп-слова, бан везде, журнал.
   Данные — серверные функции admin_mod_*. Сам бот-модератор живёт отдельно (ice-logix-moderator/). */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD) return;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);

  const SECTIONS = [['chats', 'Чаты'], ['words', 'Слова'], ['gban', 'Бан везде'], ['log', 'Журнал']];
  const PAGE = 30;
  let cur = 'chats';
  let token = 0;

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

  let chatCache = [];
  let chatSettings = null; // настройки открытого чата
  let chatId = null;

  const body = () => document.getElementById('adModBody');
  const alive = (my) => my === token && !!body();

  function renderRoot() {
    return `<div class="rd-screen page-enter ad-screen" id="adModRoot">
      <div class="rd-head">
        <button class="rd-back" onclick="window.goBackGlobal()">${I('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Модерация</h1><p class="rd-head-sub">Чаты, каналы и комментарии</p></div>
        <button class="rd-back" id="adModRefresh">${I('refresh', 20)}</button>
      </div>
      <div class="rd-chips ad-chips" id="adModChips">${SECTIONS.map(([id, t]) => `<button class="rd-chip${id === cur ? ' on' : ''}" data-sec="${id}">${t}</button>`).join('')}</div>
      <div id="adModBody"></div><div class="ad-cta-space"></div></div>`;
  }

  function attachRoot() {
    const chips = document.getElementById('adModChips');
    if (chips) chips.onclick = (e) => {
      const b = e.target.closest('[data-sec]');
      if (!b || b.dataset.sec === cur) return;
      haptic('light'); cur = b.dataset.sec;
      chips.querySelectorAll('.rd-chip').forEach((c) => c.classList.toggle('on', c === b));
      load();
    };
    const r = document.getElementById('adModRefresh');
    if (r) r.onclick = () => { haptic('light'); load(); };
    load();
  }

  function load() {
    const my = ++token;
    if (AD.clearCta) AD.clearCta();
    const host = body();
    if (!host) return;
    host.innerHTML = AD.loadingHtml(4);
    const fn = { chats: loadChats, words: loadWords, gban: loadGban, log: loadLog }[cur];
    fn(my, host);
  }

  const fail = (my, host, res) => {
    if (!alive(my)) return true;
    if (res.error) { AD.showError(host, 'Не удалось загрузить', AD.errorText(res.error), load); return true; }
    return false;
  };

  // ── Чаты ──
  async function loadChats(my, host) {
    const res = await AD.rpc('admin_mod_overview', {});
    if (fail(my, host, res)) return;
    const d = res.data || {};
    chatCache = d.chats || [];
    const stat = (n, t) => `<div class="rd-card" style="flex:1;padding:12px 14px"><div style="font-size:20px;font-weight:700">${AD.num(n || 0)}</div><div class="rd-row-text">${t}</div></div>`;
    const rows = chatCache.map((c) => {
      const warn = !c.bot_is_admin ? 'Бот не админ' : (!c.can_delete || !c.can_restrict ? 'Мало прав' : '');
      const st = !c.enabled ? '<span class="rd-status">Выключен</span>' : (warn ? `<span class="rd-status warn">${warn}</span>` : '<span class="rd-status ok">Работает</span>');
      const sub = [KIND_RU[c.kind] || 'Чат', c.username ? '@' + c.username : '', c.members ? AD.num(c.members) + ' уч.' : '', `${AD.num(c.actions_24h || 0)} действий за сутки`].filter(Boolean).join(' · ');
      return `<button class="rd-row" data-chat="${esc(c.chat_id)}"><div class="rd-row-body"><div class="rd-row-title">${esc(c.title || c.chat_id)}</div><div class="rd-row-text">${esc(sub)}</div></div>${st}</button>`;
    }).join('');
    host.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:12px">${stat(d.actions_24h, 'действий за сутки')}${stat(d.bans_24h, 'банов за сутки')}${stat(d.gbans, 'бан везде')}</div>
      ${chatCache.length ? `<div class="rd-card rd-list">${rows}</div>` : AD.emptyHtml({ icon: 'shield', title: 'Чатов пока нет', text: 'Добавьте бота-модератора администратором в чат или канал — он появится здесь сам.' })}`;
    host.querySelectorAll('[data-chat]').forEach((b) => { b.onclick = () => { haptic('light'); AD.open('admin_mod_chat', { chat_id: b.dataset.chat }); }; });
    if (chatCache.length && AD.mountCta) AD.mountCta({ label: 'Настройки для всех чатов', run: applyAll }, 'adModRoot');
  }

  // ── Форма настроек (общая для чата и «для всех») ──
  function fieldHtml(it, val) {
    const id = 'mod_' + it.k;
    if (it.t === 'switch') {
      return `<label class="ad-st-sw"><span class="ad-st-sw-t"><b>${it.l}</b>${it.h ? `<small>${it.h}</small>` : ''}</span><span class="rd-switch"><input type="checkbox" data-k="${it.k}"${val ? ' checked' : ''}><span></span></span></label>`;
    }
    let inp;
    if (it.t === 'sel') inp = `<span class="rd-field"><select style="flex:1;background:transparent;border:0;color:var(--rd-tx);font-size:15px;padding:12px 0" data-k="${it.k}">${it.opts.map(([v, t]) => `<option value="${v}"${v === val ? ' selected' : ''}>${t}</option>`).join('')}</select></span>`;
    else if (it.t === 'num') inp = `<span class="rd-field"><input type="number" inputmode="numeric" data-k="${it.k}" value="${esc(val)}" min="${it.min}" max="${it.max}"></span>`;
    else if (it.t === 'text') inp = `<span class="rd-field"><textarea rows="3" data-k="${it.k}">${esc(val)}</textarea></span>`;
    else if (it.t === 'list') inp = `<span class="rd-field"><input type="text" data-k="${it.k}" value="${esc((val || []).join(', '))}"></span>`;
    else inp = `<span class="rd-field"><input type="text" data-k="${it.k}" value="${esc(val)}"></span>`;
    return `<label class="ad-st-sw" style="flex-direction:column;align-items:stretch" for="${id}"><span class="ad-st-sw-t"><b>${it.l}</b>${it.h ? `<small>${it.h}</small>` : ''}</span>${inp.replace('data-k=', `id="${id}" data-k=`)}</label>`;
  }

  function formHtml(vals) {
    return GROUPS.map((g) => `<div class="rd-section"><h2>${g.title}</h2></div><div class="rd-card" style="padding:4px 14px">${g.items.map((it) => fieldHtml(it, vals[it.k])).join('')}</div>`).join('');
  }

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

  // Настройки для всех чатов: применяются только отмеченные группы
  function applyAll() {
    const vals = Object.assign({}, DEFAULTS);
    U().sheet({
      title: 'Настройки для всех чатов',
      html: `<p class="rd-row-text" style="margin-bottom:8px">Сохранённые значения заменят настройки во всех ${chatCache.length} чатах. Отметьте группы, которые нужно применить.</p>
        ${GROUPS.map((g, i) => `<label class="ad-st-sw"><span class="ad-st-sw-t"><b>${g.title}</b></span><span class="rd-switch"><input type="checkbox" data-grp="${i}"><span></span></span></label>`).join('')}
        <div id="modAllForm">${formHtml(vals)}</div>
        <button class="rd-btn rd-btn-block" id="modAllGo" style="margin-top:16px">Применить ко всем</button>`,
      onOpen(wrap, close) {
        wrap.querySelector('#modAllGo').onclick = async (e) => {
          const picked = [...wrap.querySelectorAll('[data-grp]')].filter((c) => c.checked).flatMap((c) => GROUPS[+c.dataset.grp].items.map((it) => it.k));
          if (!picked.length) { U().toast('Отметьте хотя бы одну группу'); return; }
          const ok = await AD.confirmSheet('Применить ко всем чатам?', `Будут изменены настройки в ${chatCache.length} чатах.`, 'Применить', false);
          if (!ok) return;
          const btn = e.currentTarget; btn.disabled = true;
          const res = await AD.rpc('admin_mod_apply_all', { p_settings: collect(wrap, picked) });
          btn.disabled = false;
          if (res.error) { AD.fail(res.error); return; }
          haptic('success'); U().toast('Применено'); close(); load();
        };
      },
    });
  }

  // ── Экран одного чата ──
  function renderChat(params) {
    chatId = String((params && params.chat_id) || chatId || '');
    return `<div class="rd-screen page-enter ad-screen" id="adModChatRoot">
      <div class="rd-head">
        <button class="rd-back" onclick="window.goBackGlobal()">${I('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title" id="adModChatTitle">Чат</h1><p class="rd-head-sub" id="adModChatSub">Настройки модерации</p></div>
        <button class="rd-back" id="adModChatRefresh">${I('refresh', 20)}</button>
      </div><div id="adModChatBody"></div><div class="ad-cta-space"></div></div>`;
  }

  async function loadChat() {
    const my = ++token;
    const host = document.getElementById('adModChatBody');
    if (!host) return;
    if (AD.clearCta) AD.clearCta();
    host.innerHTML = AD.loadingHtml(4);
    const res = await AD.rpc('admin_mod_chat', { p_chat_id: Number(chatId) });
    if (my !== token || !document.getElementById('adModChatBody')) return;
    if (res.error || !res.data) { AD.showError(host, 'Не удалось загрузить', AD.errorText(res.error), loadChat); return; }
    const c = res.data;
    chatSettings = Object.assign({}, DEFAULTS, c.settings || {});
    document.getElementById('adModChatTitle').textContent = c.title || 'Чат';
    document.getElementById('adModChatSub').textContent = [KIND_RU[c.kind] || 'Чат', c.username ? '@' + c.username : ''].filter(Boolean).join(' · ');
    const s = c.stats || {};
    const stat = (n, t) => `<div class="rd-card" style="flex:1;padding:12px 14px"><div style="font-size:20px;font-weight:700">${AD.num(n || 0)}</div><div class="rd-row-text">${t}</div></div>`;
    const rightsWarn = !c.bot_is_admin ? 'Бот не администратор этого чата — модерация не работает.'
      : (!c.can_delete || !c.can_restrict ? 'Боту не хватает прав: нужны «Удалять сообщения» и «Блокировать участников».' : '');
    host.innerHTML = `${rightsWarn ? `<div class="rd-card" style="padding:12px 14px;margin-bottom:12px"><span class="rd-status warn">Внимание</span> <span class="rd-row-text">${rightsWarn}</span></div>` : ''}
      ${c.kind === 'channel' && c.linked_chat_id ? `<div class="rd-row-text" style="margin-bottom:12px">Комментарии модерируются в связанной группе.</div>` : ''}
      <div style="display:flex;gap:8px;margin-bottom:12px">${stat(s.deleted_24h, 'удалено')}${stat(s.warned_24h, 'предупреждений')}${stat(s.banned_24h, 'банов')}</div>
      <div class="rd-card" style="padding:4px 14px"><label class="ad-st-sw"><span class="ad-st-sw-t"><b>Модерация включена</b><small>Стоп-слов в этом чате: ${AD.num(s.words || 0)}</small></span><span class="rd-switch"><input type="checkbox" id="modEnabled"${c.enabled ? ' checked' : ''}><span></span></span></label></div>
      <div id="modChatForm">${formHtml(chatSettings)}</div>`;
    if (AD.mountCta) AD.mountCta({ label: 'Сохранить', run: saveChat }, 'adModChatRoot');
  }

  async function saveChat() {
    const form = document.getElementById('modChatForm');
    const en = document.getElementById('modEnabled');
    if (!form || !en) return;
    const res = await AD.rpc('admin_mod_chat_save', { p_chat_id: Number(chatId), p_settings: collect(form), p_enabled: en.checked });
    if (res.error) { AD.fail(res.error); return; }
    haptic('success'); U().toast('Сохранено');
  }

  function attachChat() {
    const r = document.getElementById('adModChatRefresh');
    if (r) r.onclick = () => { haptic('light'); loadChat(); };
    loadChat();
  }

  // ── Стоп-слова ──
  async function loadWords(my, host) {
    const res = await AD.rpc('admin_mod_words_list', { p_chat_id: null });
    if (fail(my, host, res)) return;
    const list = res.data || [];
    const rows = list.map((w) => `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(w.word)}</div><div class="rd-row-text">${w.kind === 'regex' ? 'Шаблон' : 'Слово'}</div></div><button class="rd-back" data-del="${w.id}" aria-label="Удалить">${I('trash', 18)}</button></div>`).join('');
    host.innerHTML = list.length ? `<p class="rd-row-text" style="margin-bottom:8px">Общий список — для всех чатов.</p><div class="rd-card rd-list">${rows}</div>`
      : AD.emptyHtml({ icon: 'text', title: 'Список пуст', text: 'Добавьте слова, которые бот будет удалять.' });
    host.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        if (!(await AD.confirmSheet('Удалить слово?', '', 'Удалить', true))) return;
        const r = await AD.rpc('admin_mod_word_del', { p_id: Number(b.dataset.del) });
        if (r.error) { AD.fail(r.error); return; }
        haptic('light'); load();
      };
    });
    if (AD.mountCta) AD.mountCta({ label: 'Добавить слово', run: addWord }, 'adModRoot');
  }

  function addWord() {
    return AD.formSheet({
      title: 'Новое стоп-слово', action: 'Добавить',
      fields: [{ name: 'word', label: 'Слово или фраза', placeholder: 'например: казино' }],
      extraHtml: '<label class="ad-st-sw"><span class="ad-st-sw-t"><b>Это шаблон (regex)</b><small>Для продвинутых</small></span><span class="rd-switch"><input type="checkbox" name="regex"><span></span></span></label>',
      validate: (v) => (v.word && v.word.trim() ? '' : 'Введите слово'),
      onSubmit: async (v) => {
        const r = await AD.rpc('admin_mod_word_add', { p_chat_id: null, p_word: v.word.trim().toLowerCase(), p_kind: v.regex ? 'regex' : 'word' });
        if (r.error) { AD.fail(r.error); return false; }
        haptic('success'); load(); return true;
      },
    });
  }

  // ── Бан везде ──
  async function loadGban(my, host) {
    const res = await AD.rpc('admin_mod_gban_list', {});
    if (fail(my, host, res)) return;
    const list = res.data || [];
    const rows = list.map((g) => `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(g.user_name || g.user_id)}</div><div class="rd-row-text">${esc(g.user_id)}${g.reason ? ' · ' + esc(g.reason) : ''} · ${AD.timeAgo(g.created_at)}</div></div><button class="rd-back" data-un="${esc(g.user_id)}" aria-label="Снять бан">${I('x', 18)}</button></div>`).join('');
    host.innerHTML = list.length ? `<p class="rd-row-text" style="margin-bottom:8px">Эти люди забанены во всех чатах сразу.</p><div class="rd-card rd-list">${rows}</div>`
      : AD.emptyHtml({ icon: 'shield', title: 'Никто не забанен', text: 'Бан везде действует сразу во всех чатах и каналах.' });
    host.querySelectorAll('[data-un]').forEach((b) => {
      b.onclick = async () => {
        if (!(await AD.confirmSheet('Снять бан везде?', 'Человек сможет снова писать во всех чатах.', 'Снять', true))) return;
        const r = await AD.rpc('admin_mod_gban_del', { p_user_id: Number(b.dataset.un) });
        if (r.error) { AD.fail(r.error); return; }
        haptic('light'); load();
      };
    });
    if (AD.mountCta) AD.mountCta({ label: 'Забанить везде', run: addGban }, 'adModRoot');
  }

  function addGban() {
    return AD.formSheet({
      title: 'Бан везде', action: 'Забанить', danger: true,
      fields: [
        { name: 'uid', label: 'Номер пользователя в Telegram', placeholder: '123456789', hint: 'Узнать номер можно командой /id в чате' },
        { name: 'reason', label: 'Причина', placeholder: 'Спам' },
      ],
      validate: (v) => (/^\d{5,}$/.test((v.uid || '').trim()) ? '' : 'Нужен числовой номер'),
      onSubmit: async (v) => {
        const r = await AD.rpc('admin_mod_gban_add', { p_user_id: Number(v.uid.trim()), p_reason: (v.reason || '').trim() });
        if (r.error) { AD.fail(r.error); return false; }
        haptic('success'); load(); return true;
      },
    });
  }

  // ── Журнал ──
  async function loadLog(my, host) {
    const res = await AD.rpc('admin_mod_log', { p_chat_id: null, p_limit: PAGE, p_offset: 0 });
    if (fail(my, host, res)) return;
    const list = res.data || [];
    if (!list.length) { host.innerHTML = AD.emptyHtml({ icon: 'text', title: 'Журнал пуст', text: 'Здесь появятся действия бота-модератора.' }); return; }
    const rows = list.map((a) => {
      const what = ACTION_RU[a.action] || a.action;
      const rule = a.rule ? (RULE_RU[a.rule] || a.rule) : '';
      const sub = [a.chat_title, a.user_name || a.user_id, rule || a.reason, AD.timeAgo(a.created_at)].filter(Boolean).join(' · ');
      const un = (a.action === 'ban' || a.action === 'kick') && a.user_id
        ? `<button class="rd-back" data-unban="${esc(a.chat_id)}:${esc(a.user_id)}" aria-label="Разбанить">${I('x', 18)}</button>` : '';
      return `<div class="rd-row"><div class="rd-row-body"><div class="rd-row-title">${esc(what)}</div><div class="rd-row-text">${esc(sub)}</div></div>${un}</div>`;
    }).join('');
    host.innerHTML = `<div class="rd-card rd-list">${rows}</div>`;
    host.querySelectorAll('[data-unban]').forEach((b) => {
      b.onclick = async () => {
        const [c, u] = b.dataset.unban.split(':');
        if (!(await AD.confirmSheet('Разбанить?', 'Бот снимет бан в этом чате.', 'Разбанить', false))) return;
        const r = await AD.rpc('admin_mod_unban', { p_chat_id: Number(c), p_user_id: Number(u) });
        if (r.error) { AD.fail(r.error); return; }
        haptic('success'); U().toast('Запрос отправлен боту');
      };
    });
  }

  AD.screen('admin_moderator', {
    render: renderRoot,
    attach: attachRoot,
    save: () => ({ cur }),
    restore: (s) => { if (s && s.cur && SECTIONS.some((x) => x[0] === s.cur)) cur = s.cur; return s; },
  });
  AD.screen('admin_mod_chat', {
    render: renderChat,
    attach: attachChat,
    save: () => ({ chat_id: chatId }),
    restore: (s) => { if (s && s.chat_id) chatId = String(s.chat_id); return s; },
  });

  window.adminOpenModerator = () => AD.open('admin_moderator', {});
})();
