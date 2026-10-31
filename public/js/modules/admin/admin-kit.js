// ============================================================
// ICE LOGIX · Админ-панель: общий каркас (window.AD)
// Этап 1 ADMIN_PLAN.md. Здесь всё, что нужно любому разделу админки:
//  1) помощники: esc, money, num, dateTime, statusBadge, call (вызов функции на сервере с понятной ошибкой);
//  2) шторки: formSheet (поля + живая подсказка), confirmSheet, плавающая кнопка mountCta;
//  3) состояния: загрузка, пусто, ошибка с повтором;
//  4) список с поиском, чипами и «Показать ещё» (AD.list);
//  5) настоящий стек экранов: AD.open(вкладка, параметры) / AD.back(), восстановление прокрутки и фильтров,
//     уход в окно поддержки и возврат без повторного входа (AD.openDesk / AD.resume).
// Разметка только из готовых классов rd-* (ice-redesign.css) и ad-* (ice-admin.css), шторки — UI.sheet (ice-ui.js).
// Каждый раздел — свой файл: регистрирует вкладку через AD.screen(...) и больше не трогает навигацию руками.
// ============================================================
(function () {
  'use strict';

  const U = () => window.UI;
  const esc = (s) => U().esc(s);
  const I = (name, size, opts) => U().icon(name, size, opts);

  // ══ Помощники ══
  // Сумма: тот же вид, что и во всём приложении (символ рубля через bynSign/formatBYN), без слова «BYN»
  const money = (v, opts) => U().money(Number(v) || 0, Object.assign({ keepCents: true, digits: 2 }, opts || {}));
  const num = (v) => {
    const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const fmt2 = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
  const shortId = (id) => String(id || '').slice(0, 8);
  const nick = (v) => String(v || '').replace(/^@+/, '');
  const dateTime = (ts) => (ts ? new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const daysSince = (ts) => (ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : 0);
  function timeAgo(ts) {
    if (!ts) return 'нет данных';
    const min = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    return new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }
  const haptic = (kind) => { try { if (window.tgUtil && tgUtil.haptic) tgUtil.haptic(kind); } catch (_) {} };

  // map: { код: ['Подпись', 'ok'|'warn'|'bad'|''] }
  function statusBadge(map, st) {
    const s = (map && map[st]) || [st || 'Без статуса', ''];
    return `<span class="rd-status${s[1] ? ' ' + s[1] : ''}">${esc(s[0])}</span>`;
  }

  // Ошибка сервера простыми словами: русские тексты функций показываем как есть, остальное переводим
  function errorText(error, fallback) {
    const msg = String((error && error.message) || '');
    if (/[А-Яа-яЁё]/.test(msg)) return msg;
    if (/failed to fetch|network|load failed|timeout/i.test(msg)) return 'Нет связи с сервером. Проверьте интернет';
    if (/permission|forbidden|not allowed|42501|jwt/i.test(msg)) return 'Не хватает прав для этого действия';
    return fallback || 'Не получилось. Попробуйте ещё раз';
  }
  const fail = (error, text) => U().toast(errorText(error, text), 'bad');

  // Запрос к серверу: { data, error } без исключений
  async function rpc(name, args) {
    try {
      return await supabaseClient.rpc(name, args || {});
    } catch (e) {
      return { data: null, error: e };
    }
  }

  // Вызов действия: блокирует кнопку, показывает ошибку, при успехе — подтверждение и обновление экрана.
  // opts: { ok: 'текст' | (data)=>текст, after: async ()=>{} }  → данные ответа или null при ошибке
  async function call(btn, name, args, opts) {
    const o = typeof opts === 'string' || typeof opts === 'function' ? { ok: opts } : (opts || {});
    if (btn) btn.disabled = true;
    const { data, error } = await rpc(name, args);
    if (error) {
      if (btn) btn.disabled = false;
      haptic('error');
      fail(error);
      return null;
    }
    haptic('success');
    const text = typeof o.ok === 'function' ? o.ok(data) : o.ok;
    if (text) U().toast(text);
    if (typeof o.after === 'function') await o.after(data);
    return data || {};
  }

  // ══ Состояния ══
  const loadingHtml = (n) => '<div class="rd-card ad-skel rd-shimmer"></div>'.repeat(n || 1);
  function emptyHtml(o) {
    return `<div class="rd-card">${U().empty(o)}</div>`;
  }
  // Ошибка с кнопкой «Обновить»: возвращает разметку; повтор навешивает retry(host)
  function errorHtml(title, text, retryId) {
    return emptyHtml({ icon: 'alert', title: title || 'Не получилось загрузить', text: text || 'Проверьте интернет и обновите экран.', action: 'Обновить', actionId: retryId || 'adRetry' });
  }
  function showError(host, title, text, retry) {
    if (!host) return;
    host.innerHTML = errorHtml(title, text, 'adRetry');
    const b = host.querySelector('#adRetry');
    if (b && retry) b.onclick = retry;
  }

  // ══ Шторки ══
  // Шторка с полями и живой подсказкой.
  // opt: { title, text, fields:[{name,label,value,placeholder,decimal,hint}], extraHtml, action, danger,
  //        preview(values)→{html,tone,action}, validate(values)→текст ошибки, onSubmit(values, btn)→Promise<true|false> }
  function formSheet(opt) {
    const o = opt || {};
    U().sheet({
      title: o.title,
      html: `<form class="rd-ask ad-form" novalidate>
        ${o.text ? `<p class="rd-ask-text">${o.text}</p>` : ''}
        ${(o.fields || []).map((f) => `
          <label class="rd-ask-field">
            <span class="rd-label">${esc(f.label)}</span>
            <span class="rd-field"><input name="${esc(f.name)}" type="text" ${f.decimal ? 'inputmode="decimal"' : ''} autocomplete="off" value="${esc(f.value == null ? '' : f.value)}" placeholder="${esc(f.placeholder || '')}"></span>
            ${f.hint ? `<span class="ad-hint">${f.hint}</span>` : ''}
          </label>`).join('')}
        ${o.extraHtml || ''}
        <div class="ad-preview" data-preview hidden></div>
        <p class="rd-ask-err" hidden></p>
        <button type="submit" class="rd-btn rd-btn-block${o.danger ? ' rd-btn-danger' : ''}" data-submit>${esc(o.action || 'Сохранить')}</button>
      </form>`,
      onOpen: (wrap, close) => {
        const form = wrap.querySelector('form');
        const err = wrap.querySelector('.rd-ask-err');
        const prev = wrap.querySelector('[data-preview]');
        const submit = wrap.querySelector('[data-submit]');
        const values = () => {
          const v = {};
          form.querySelectorAll('input').forEach((i) => { v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
          return v;
        };
        const refresh = () => {
          if (!o.preview) return;
          const r = o.preview(values());
          prev.hidden = !r || !r.html;
          prev.className = `ad-preview ${(r && r.tone) || ''}`;
          prev.innerHTML = (r && r.html) || '';
          if (r && r.action) submit.textContent = r.action;
        };
        form.addEventListener('input', refresh);
        form.addEventListener('change', refresh);
        refresh();
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const v = values();
          const msg = o.validate ? o.validate(v) : '';
          if (msg) { err.textContent = msg; err.hidden = false; return; }
          err.hidden = true;
          const done = await o.onSubmit(v, submit);
          if (done) close();
        });
      },
    });
  }

  // Вопрос «точно?»: Promise<true|false>. Закрыли шторку — false.
  function confirmSheet(title, text, action, danger) {
    return new Promise((resolve) => {
      let done = false;
      U().sheet({
        title,
        html: `<p class="rd-sub" style="margin-top:0">${esc(text)}</p><button type="button" class="rd-btn rd-btn-block${danger ? ' rd-btn-danger' : ''}" style="margin-top:16px" data-yes>${esc(action)}</button>`,
        onClose: () => { if (!done) resolve(false); },
        onOpen: (wrap, close) => { wrap.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); close(); }; },
      });
    });
  }

  // Плавающая панель действия. Живёт в body: внутри экрана position: fixed ломается анимацией появления.
  // Убирается сама, когда экран сменился. aliveId — id элемента внутри экрана, пока он на месте, панель нужна.
  // next: { label, run } или null (убрать)
  let ctaWatch = null;
  function clearCta() {
    const old = document.getElementById('adNextCta');
    if (old) old.remove();
    if (ctaWatch) { ctaWatch.disconnect(); ctaWatch = null; }
  }
  function mountCta(next, aliveId) {
    clearCta();
    if (!next) return;
    const el = document.createElement('div');
    el.id = 'adNextCta';
    el.className = 'rd-cta';
    el.innerHTML = `<button type="button" class="rd-btn rd-btn-block" id="adNextStep">${esc(next.label)}</button>`;
    el.firstChild.onclick = () => { haptic('light'); next.run(); };
    document.body.appendChild(el);
    const host = document.getElementById('content');
    if (!host) return;
    ctaWatch = new MutationObserver(() => {
      if (aliveId && document.getElementById(aliveId)) return;
      clearCta();
    });
    ctaWatch.observe(host, { childList: true, subtree: false });
  }

  // ══ Список с поиском, чипами и «Показать ещё» ══
  // cfg: {
  //   id: 'adOrders' (префикс id элементов), rpc: 'admin_orders_list',
  //   chips: [[ключ, подпись]], chip: ключ по умолчанию, chipCount(counts, ключ)→число, chipAlways: [ключи, которые видны даже с нулём],
  //   searchPlaceholder, pageSize,
  //   args(state, limit, offset)→аргументы функции, rowHtml(строка)→разметка, onRow(строка, элемент),
  //   empty(state)→{icon,title,text}, onSearch(state) — поправить фильтры перед поиском, onData(data) — когда пришли данные
  // }
  function list(cfg) {
    const PAGE = cfg.pageSize || 20;
    const st = { chip: cfg.chip || (cfg.chips && cfg.chips[0] && cfg.chips[0][0]) || '', q: '', rows: [], total: 0, counts: {}, timer: null, seq: 0 };
    const el = (suffix) => document.getElementById(cfg.id + suffix);

    function chipsHtml() {
      if (!cfg.chips) return '';
      return cfg.chips.map(([k, t]) => {
        const n = cfg.chipCount ? Number(cfg.chipCount(st.counts || {}, k)) || 0 : 0;
        if (!n && cfg.chipCount && !(cfg.chipAlways || []).includes(k) && st.chip !== k) return '';
        return `<button type="button" class="rd-chip${st.chip === k ? ' on' : ''}" data-chip="${esc(k)}">${esc(t)}${n ? ` · ${n}` : ''}</button>`;
      }).join('');
    }

    function bodyHtml() {
      if (!st.rows.length) {
        const e = cfg.empty ? cfg.empty(st) : { icon: 'box', title: 'Здесь пусто', text: '' };
        return emptyHtml(e);
      }
      const left = st.total - st.rows.length;
      const more = left > 0 ? `<button type="button" class="rd-btn rd-btn-ghost rd-btn-block ad-more" id="${cfg.id}More">Показать ещё ${Math.min(PAGE, left)}</button>` : '';
      return `<div class="rd-card rd-list ${esc(cfg.listClass || '')}">${st.rows.map(cfg.rowHtml).join('')}</div>${more}`;
    }

    // Разметка шапки списка: поиск, чипы и место под строки
    function shellHtml() {
      return `
        ${cfg.noSearch ? '' : `<div class="rd-field">${I('search', 20)}<input type="search" id="${cfg.id}Search" placeholder="${esc(cfg.searchPlaceholder || 'Поиск')}" autocomplete="off" enterkeyhint="search" value="${esc(st.q)}"></div>`}
        ${cfg.chips ? `<div class="rd-chips ad-chips" id="${cfg.id}Chips">${chipsHtml()}</div>` : ''}
        <div id="${cfg.id}Body">${loadingHtml()}</div>`;
    }

    function paint() {
      const chips = el('Chips');
      const body = el('Body');
      if (!body) return;
      if (chips) {
        chips.innerHTML = chipsHtml();
        chips.querySelectorAll('[data-chip]').forEach((b) => {
          b.onclick = () => {
            if (st.chip === b.dataset.chip) return;
            haptic('light');
            st.chip = b.dataset.chip;
            chips.querySelectorAll('.rd-chip').forEach((x) => x.classList.toggle('on', x === b));
            body.innerHTML = loadingHtml();
            load(false);
          };
        });
      }
      body.innerHTML = bodyHtml();
      body.querySelectorAll('[data-row]').forEach((row) => {
        row.onclick = () => { if (cfg.onRow) cfg.onRow(row.dataset.row, row); };
      });
      const more = el('More');
      if (more) more.onclick = () => { more.disabled = true; load(true); };
    }

    // append — дозагрузить следующую страницу; keep — сколько строк показать после возврата на экран
    async function load(append, keep) {
      const seq = ++st.seq;
      const limit = keep || PAGE;
      const offset = append ? st.rows.length : 0;
      const { data, error } = await rpc(cfg.rpc, cfg.args(st, limit, offset));
      if (seq !== st.seq || !el('Body')) return;
      if (error) {
        showError(el('Body'), 'Не получилось загрузить', 'Проверьте интернет и обновите экран.', () => { el('Body').innerHTML = loadingHtml(); load(false, keep); });
        return;
      }
      const d = data || {};
      st.rows = append ? st.rows.concat(d.rows || []) : (d.rows || []);
      st.total = Number(d.total) || 0;
      st.counts = d.counts || {};
      if (cfg.onData) cfg.onData(d, st);
      paint();
      restoreScroll();
    }

    function attach(restored) {
      const input = el('Search');
      if (input) {
        input.oninput = () => {
          clearTimeout(st.timer);
          st.timer = setTimeout(() => {
            st.q = input.value.trim();
            if (cfg.onSearch) cfg.onSearch(st);
            const c = el('Chips');
            if (c) c.innerHTML = chipsHtml();
            load(false);
          }, 300);
        };
      }
      load(false, restored && restored.loaded > PAGE ? restored.loaded : 0);
    }

    // Что запомнить при уходе с экрана и как вернуть
    const save = () => ({ chip: st.chip, q: st.q, loaded: st.rows.length });
    const restore = (s) => { if (s) { st.chip = s.chip; st.q = s.q || ''; } return s; };

    return { state: st, shellHtml, attach, load, paint, save, restore, reload: () => load(false, st.rows.length > PAGE ? st.rows.length : 0) };
  }

  // ══ Навигация: стек экранов ══
  const screens = {};       // вкладка → { render(params), attach(params, restored), save(), restore(state), guard(params) }
  let stack = [];           // [{ tab, params, scroll, state }]
  let params = {};          // параметры текущего экрана
  let pending = null;       // что вернуть после загрузки данных: { tab, scroll, state }
  let skip = false;         // следующий switchTab сделан самим AD, стек трогать не нужно
  const isAdminTab = (t) => t === 'admin' || String(t || '').startsWith('admin_');
  const cur = () => (typeof currentTab !== 'undefined' ? currentTab : '');

  function screen(tab, def) { screens[tab] = def; }
  const has = (tab) => !!screens[tab];

  // Разметка и подключение вкладки, вызывает router.js. null — открывать нечего, вернуться на Пульт
  async function renderTab(tab) {
    const def = screens[tab];
    if (!def) return null;
    if (def.guard && !def.guard(params)) return null;
    const restored = pending && pending.tab === tab ? pending.state : null;
    if (restored && def.restore) def.restore(restored);
    return def.render(params, restored);
  }
  function attachTab(tab) {
    const def = screens[tab];
    if (def && def.attach) def.attach(params, pending && pending.tab === tab ? pending.state : null);
  }

  function snapshotCurrent() {
    const def = screens[cur()];
    return {
      tab: cur(),
      params: params,
      scroll: window.scrollY || document.documentElement.scrollTop || 0,
      state: def && def.save ? def.save() : null,
    };
  }

  function go(tab) {
    skip = true;
    if (tab === cur()) {
      skip = false;
      if (typeof renderCurrentScreen === 'function') renderCurrentScreen();
      return;
    }
    switchTab(tab);
  }

  // Перейти на экран админки: текущий (с прокруткой и фильтрами) кладётся в стек
  function open(tab, p) {
    if (isAdminTab(cur())) stack.push(snapshotCurrent());
    else stack = [];
    params = p || {};
    pending = null;
    go(tab);
  }

  // Назад: на предыдущий экран админки; с Пульта — в профиль
  function back() {
    if (stack.length) {
      const e = stack.pop();
      params = e.params || {};
      pending = { tab: e.tab, scroll: e.scroll, state: e.state };
      go(e.tab);
      return true;
    }
    pending = null;
    params = {};
    if (cur() === 'admin') switchTab('profile'); else switchTab('admin');
    return true;
  }

  // Прокрутка возвращается после того, как данные появились: раньше список пустой и короткий
  function restoreScroll() {
    if (!pending) return;
    const y = pending.scroll || 0;
    const tab = pending.tab;
    pending = null;
    requestAnimationFrame(() => {
      if (cur() === tab) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    });
  }

  // Вызывает switchTab (app-core.js) перед каждой сменой вкладки
  function onSwitch(prev, next) {
    if (!isAdminTab(next)) { stack = []; params = {}; pending = null; clearCta(); return; }
    if (skip) { skip = false; return; }
    // прямой switchTab('admin_...') из старого кода: ведём себя как AD.open
    if (next === 'admin') { stack = []; params = {}; pending = null; return; }
    if (isAdminTab(prev) && prev !== next) stack.push(snapshotCurrent());
    else if (!isAdminTab(prev)) stack = [];
    params = {};
    pending = null;
  }

  // ══ Окно поддержки: уходим со страницы, возвращаемся без повторного ввода код-пароля ══
  const KEEP = 'ice_admin_return';
  const KEEP_TTL = 15 * 60 * 1000;

  // Запомнить, где мы были, и открыть окно поддержки. Страница при этом перезагрузится.
  function openDesk(query) {
    try {
      const snap = snapshotCurrent();
      sessionStorage.setItem(KEEP, JSON.stringify({ t: Date.now(), back: false, tab: snap.tab, params: snap.params, state: snap.state, scroll: snap.scroll, stack }));
    } catch (_) {}
    window.location.href = '/support-desk.html?from=admin' + (query ? '&' + query : '');
  }

  // При запуске приложения: если окно поддержки вернуло сюда (кнопка «Назад»), открыть админку на прежнем месте.
  // Метка back ставится окном поддержки, поэтому простое повторное открытие приложения код-пароль не обходит.
  function resume() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(KEEP) || 'null');
      sessionStorage.removeItem(KEEP);
    } catch (_) { saved = null; }
    if (!saved || !saved.back || Date.now() - Number(saved.t) > KEEP_TTL) return false;
    if (typeof isOwner === 'undefined' || !isOwner || !isAdminTab(saved.tab)) return false;
    adminAuthenticated = true;
    stack = Array.isArray(saved.stack) ? saved.stack.filter((e) => e && isAdminTab(e.tab)) : [];
    params = saved.params || {};
    pending = { tab: saved.tab, scroll: saved.scroll || 0, state: saved.state || null };
    skip = true;
    switchTab(saved.tab);
    return true;
  }

  window.AD = {
    // помощники
    esc, money, num, fmt2, shortId, nick, dateTime, daysSince, timeAgo, haptic, statusBadge, errorText, fail, rpc, call,
    // состояния и шторки
    loadingHtml, emptyHtml, errorHtml, showError, formSheet, confirmSheet, mountCta, clearCta,
    // список
    list,
    // навигация
    screen, has, renderTab, attachTab, open, back, restoreScroll, onSwitch, openDesk, resume,
    isAdminTab,
    get params() { return params; },
    get depth() { return stack.length; },
  };
})();
