/* ICE LOGIX — Админка, экран «Система» (этап 7): Службы, Очереди, Журнал действий.
   Только чтение. Только владелец. Сводка берётся серверной функцией admin_system_overview,
   журнал — прямым запросом к admin_logs (читать его может админ). */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD) return;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);

  const SECTIONS = [['services', 'Службы'], ['queues', 'Очереди'], ['log', 'Журнал']];
  const PAGE = 30;
  let cur = 'services';
  let token = 0;
  let logAction = '';

  // Живой воркер отвечает не реже раза в несколько минут
  const ALIVE_MS = 5 * 60 * 1000;

  const STATUS_RU = {
    pending: 'Ждут', queued: 'Ждут', processing: 'В работе', running: 'В работе', in_progress: 'В работе',
    done: 'Готово', sent: 'Отправлено', completed: 'Готово', success: 'Готово',
    error: 'Ошибка', failed: 'Ошибка', cancelled: 'Отменено', skipped: 'Пропущено',
  };
  const BAD_STATUS = { error: 1, failed: 1 };
  const statusRu = (s) => STATUS_RU[s] || s;

  const ACTION_RU = {
    update_payments_pause: 'Пауза приёма заказов',
    update_payment_requisites: 'Смена реквизитов',
    update_exchange_buffer: 'Запас на курс',
    update_financial_configs: 'Денежные настройки',
    update_referral_settings: 'Реферальная программа',
    toggle_promo: 'Промокод включён/выключен',
    archive_order: 'Заказ в архив',
    order_status: 'Статус заказа',
    update_product: 'Правка товара',
    export_csv: 'Выгрузка в таблицу',
    view_analytics: 'Просмотр аналитики',
    payment_confirm: 'Оплата подтверждена',
    payment_reject: 'Оплата отклонена',
    expense_add: 'Расход добавлен',
    expense_delete: 'Расход удалён',
  };
  const actionRu = (a) => ACTION_RU[a] || String(a || '').replace(/_/g, ' ');

  const section = (title) => `<div class="rd-section"><h2>${esc(title)}</h2></div>`;
  const must = (r) => { if (r.error) throw r.error; return r.data; };
  const when = (iso) => {
    if (!iso) return '—';
    // admin_logs.created_at без часового пояса — считаем UTC
    const s = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z';
    return AD.timeAgo ? AD.timeAgo(s) : new Date(s).toLocaleString('ru-RU');
  };

  async function loadInto(host, ctx, fetchFn, paint) {
    host.innerHTML = AD.loadingHtml(3);
    let data;
    try { data = await fetchFn(); } catch (e) {
      if (!ctx.alive()) return;
      AD.showError(host, 'Не получилось загрузить', AD.errorText(e), () => loadInto(host, ctx, fetchFn, paint));
      return;
    }
    if (!ctx.alive()) return;
    paint(data);
  }

  const overview = async () => must(await sb().rpc('admin_system_overview')) || {};

  // ══════════════════ Службы ══════════════════
  function workerInfo(info) {
    if (!info || typeof info !== 'object') return '';
    const keys = ['host', 'hostname', 'name', 'version'];
    return keys.map((k) => info[k]).filter(Boolean).map(String).join(' · ');
  }

  function renderServices(host, ctx) {
    loadInto(host, ctx, overview, (o) => {
      const workers = Array.isArray(o.workers) ? o.workers : [];
      const now = Date.now();
      const rows = workers.map((w) => {
        const alive = w.last_seen && (now - new Date(w.last_seen).getTime()) < ALIVE_MS;
        const sub = [workerInfo(w.info), w.last_seen ? 'ответил ' + when(w.last_seen) : 'ещё ни разу не отвечал'].filter(Boolean).join(' · ');
        return `<div class="rd-row">
          <div class="rd-row-body"><div class="rd-row-title">${esc(String(w.id || 'Служба'))}</div><div class="rd-row-text">${esc(sub)}</div></div>
          <span class="rd-status ${alive ? 'ok' : 'warn'}">${alive ? 'Работает' : 'Не отвечает'}</span>
        </div>`;
      }).join('');
      host.innerHTML = `
        <p class="rd-sub ad-hint">Службы, которые выполняют работу в фоне: проверку фото, паспортов, сканирование. Если служба не отвечает больше 5 минут — на компьютере, где она запущена, её нужно перезапустить.</p>
        ${section('Фоновые службы')}
        ${workers.length ? `<div class="rd-card rd-list">${rows}</div>`
          : `<div class="rd-card">${U().empty({ icon: 'clock', title: 'Служб пока нет', text: 'Ни одна фоновая служба ещё не выходила на связь.' })}</div>`}`;
    });
  }

  // ══════════════════ Очереди ══════════════════
  function statusLine(by) {
    const keys = Object.keys(by || {});
    if (!keys.length) return '<span class="ad-hint">Пусто</span>';
    return keys.map((k) => `<span class="rd-status${BAD_STATUS[k] ? ' bad' : ''}">${esc(statusRu(k))} · ${Number(by[k]) || 0}</span>`).join(' ');
  }
  function errList(items, kindLabel) {
    if (!Array.isArray(items) || !items.length) return '';
    return `<div class="rd-card rd-list">${items.map((e) => `<div class="rd-row">
      <div class="rd-row-body"><div class="rd-row-title">${esc(e.kind || kindLabel)}${e.attempts ? ` · попыток: ${Number(e.attempts)}` : ''}</div>
      <div class="rd-row-text">${esc(e.error || 'Без описания')}</div>
      <div class="rd-row-text ad-hint">${esc(when(e.at))}</div></div>
    </div>`).join('')}</div>`;
  }

  function renderQueues(host, ctx) {
    loadInto(host, ctx, overview, (o) => {
      const jobs = o.jobs || {}, ntf = o.notifications || {}, ev = o.events || {};
      const block = (title, hint, q, errs, label) => `
        ${section(title)}
        <div class="rd-card"><div class="ad-hint">${esc(hint)}</div><div class="ad-chips-inline">${statusLine(q.by_status)}</div></div>
        ${errList(errs, label)}`;
      host.innerHTML = `
        <p class="rd-sub ad-hint">Сколько задач ждёт, выполняется и закончилось ошибкой. Показаны последние пять ошибок в каждой очереди.</p>
        ${block('Задачи фоновых служб', 'Проверки и сканирование', jobs, jobs.errors, 'Задача')}
        ${block('Уведомления клиентам', 'Сообщения в Telegram', ntf, ntf.failed, 'Уведомление')}
        ${block('События для команды', 'Оповещения сотрудникам', ev, ev.failed, 'Событие')}`;
    });
  }

  // ══════════════════ Журнал ══════════════════
  function detailsText(d) {
    if (d == null) return '';
    let s;
    try { s = typeof d === 'string' ? d : JSON.stringify(d); } catch (e) { return ''; }
    if (!s || s === '{}' || s === 'null') return '';
    return s.length > 160 ? s.slice(0, 160) + '…' : s;
  }

  function renderLog(host, ctx) {
    let offset = 0;
    let names = {};
    const rowsHtml = (list) => list.map((l) => {
      const who = names[l.admin_id] || (l.admin_id ? '#' + l.admin_id : 'Система');
      const target = [l.target_type, l.target_id].filter(Boolean).join(' ');
      const det = detailsText(l.details);
      return `<div class="rd-row">
        <div class="rd-row-body">
          <div class="rd-row-title">${esc(actionRu(l.action))}</div>
          <div class="rd-row-text">${esc(who)}${target ? ' · ' + esc(target) : ''} · ${esc(when(l.created_at))}</div>
          ${det ? `<div class="rd-row-text ad-hint">${esc(det)}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    async function fetchPage() {
      let q = sb().from('admin_logs').select('id,admin_id,action,target_type,target_id,details,created_at')
        .order('created_at', { ascending: false }).range(offset, offset + PAGE - 1);
      if (logAction) q = q.eq('action', logAction);
      const list = must(await q) || [];
      const need = [...new Set(list.map((l) => l.admin_id).filter((id) => id && !names[id]))];
      if (need.length) {
        const us = must(await sb().from('users').select('user_id,full_name,username').in('user_id', need)) || [];
        us.forEach((u) => { names[u.user_id] = u.full_name || (u.username ? '@' + String(u.username).replace(/^@+/, '') : '#' + u.user_id); });
      }
      return list;
    }

    loadInto(host, ctx, async () => {
      const [acts, first] = await Promise.all([
        sb().from('admin_logs').select('action').order('created_at', { ascending: false }).limit(300),
        fetchPage(),
      ]);
      return { acts: [...new Set((must(acts) || []).map((r) => r.action).filter(Boolean))], first };
    }, ({ acts, first }) => {
      offset = first.length;
      const opts = ['<option value="">Все действия</option>'].concat(
        acts.map((a) => `<option value="${esc(a)}"${a === logAction ? ' selected' : ''}>${esc(actionRu(a))}</option>`)).join('');
      host.innerHTML = `
        <div class="rd-card"><label class="rd-ask-field"><span class="rd-label">Действие</span><span class="rd-field"><select id="adLogFilter">${opts}</select></span></label></div>
        ${section('Что делали сотрудники')}
        <div class="rd-card rd-list" id="adLogList">${first.length ? rowsHtml(first) : U().empty({ icon: 'clock', title: 'Записей нет', text: 'По этому действию в журнале пока пусто.' })}</div>
        <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" id="adLogMore"${first.length < PAGE ? ' hidden' : ''}>Показать ещё</button>`;
      host.querySelector('#adLogFilter').onchange = (e) => { logAction = e.target.value; haptic('light'); ctx.reload(); };
      const more = host.querySelector('#adLogMore');
      more.onclick = async () => {
        more.disabled = true;
        try {
          const list = await fetchPage();
          if (!ctx.alive()) return;
          offset += list.length;
          host.querySelector('#adLogList').insertAdjacentHTML('beforeend', rowsHtml(list));
          if (list.length < PAGE) more.hidden = true;
        } catch (x) { AD.fail(x, 'Не получилось загрузить'); }
        more.disabled = false;
      };
    });
  }

  // ══════════════════ Экран ══════════════════
  const RENDER = { services: renderServices, queues: renderQueues, log: renderLog };

  function chipsHtml() {
    return SECTIONS.map(([id, t]) => `<button type="button" class="rd-chip${id === cur ? ' on' : ''}" data-sec="${id}">${esc(t)}</button>`).join('');
  }
  function paintChips() {
    const box = document.getElementById('adSystemChips');
    if (!box) return;
    box.innerHTML = chipsHtml();
    box.querySelectorAll('[data-sec]').forEach((b) => {
      b.onclick = () => { if (b.dataset.sec === cur) return; haptic('light'); openSection(b.dataset.sec); };
    });
  }
  function openSection(id) {
    const host = document.getElementById('adSystemBody');
    if (!host || !RENDER[id]) return;
    cur = id;
    const my = ++token;
    paintChips();
    host.innerHTML = '';
    const ctx = {
      host,
      alive: () => my === token && document.getElementById('adSystemBody') === host,
      reload: () => { if (my === token) openSection(id); },
    };
    try { RENDER[id](host, ctx); } catch (e) {
      AD.showError(host, 'Раздел не открылся', AD.errorText(e), () => openSection(id));
    }
  }

  function renderSystem(params, restored) {
    if (!restored) {
      cur = (params && params.section && RENDER[params.section]) ? params.section : 'services';
      logAction = '';
    }
    const owner = typeof isOwner !== 'undefined' && isOwner;
    return `
      <div class="rd-screen page-enter ad-screen" id="adSystemRoot">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Система</h1><p class="rd-head-sub">Фоновые службы, очереди и журнал</p></div>
          <button type="button" class="rd-back" id="adSystemRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        ${owner ? `<div class="rd-chips ad-chips" id="adSystemChips">${chipsHtml()}</div><div id="adSystemBody"></div>`
          : `<div class="rd-card">${U().empty({ icon: 'lock', title: 'Только для владельца', text: 'Состояние системы видит только владелец.' })}</div>`}
      </div>`;
  }
  function attachSystem() {
    if (!document.getElementById('adSystemBody')) return;
    const r = document.getElementById('adSystemRefresh');
    if (r) r.onclick = () => { haptic('light'); openSection(cur); };
    openSection(cur);
  }

  AD.screen('admin_system', {
    render: renderSystem,
    attach: attachSystem,
    save: () => ({ cur, logAction }),
    restore: (s) => { if (s) { if (s.cur && RENDER[s.cur]) cur = s.cur; logAction = s.logAction || ''; } return s; },
  });

  window.adminOpenSystem = (section) => AD.open('admin_system', section ? { section } : {});
})();
