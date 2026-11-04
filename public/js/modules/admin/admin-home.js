// ============================================================
// ICE LOGIX · Админ-панель: Пульт (главный экран админки)
// «Что требует внимания», сводка за период, состояние сервиса, разделы.
// Цифры отдаёт сервер одной функцией admin_overview() (миграция 20261031130000_admin_core).
// Разделы, которые ещё не перенесены в новый вид, открывают «Все инструменты» (старая админка, admin.js)
// сразу на нужном блоке. План перехода — ADMIN_PLAN.md.
// ============================================================
(function () {
  'use strict';

  const ROLE_TEXT = { owner: 'Владелец', admin: 'Админ', support: 'Поддержка' };

  // Что требует внимания: ключ из admin_overview().attention → строка Пульта
  const ATTENTION = [
    { k: 'payments_pending', icon: 'wallet', tone: 'warn', title: 'Оплаты на проверке', text: 'Клиент сообщил об оплате. Проверьте, пришли ли деньги', go: { money: 'review' } },
    { k: 'orders_to_buy', icon: 'cart', title: 'Оплачены, ждут выкупа', text: 'Выкупите на площадке и запишите номер заказа', go: { orders: 'paid' } },
    { k: 'awaiting_decision', icon: 'help', title: 'Ждут решения клиента', text: 'Товар подорожал, клиент решает, согласен ли', go: { orders: 'awaiting_decision' } },
    { k: 'awaiting_payment', icon: 'receipt', title: 'Ждут второго платежа', text: 'Клиенту выставлена доплата за доставку', go: { orders: 'awaiting_payment' } },
    { k: 'stuck', icon: 'clock', tone: 'bad', title: 'Без движения больше 7 дней', text: 'Заказы в работе, у которых давно не менялся статус', go: { orders: 'work' } },
    { k: 'tickets', icon: 'message', tone: 'warn', title: 'Обращения без ответа', text: 'Клиенты ждут ответа в поддержке', go: { desk: true } },
    { k: 'claims', icon: 'shield', title: 'Страховые претензии', text: 'Посылка потерялась или пришла повреждённой', go: { tab: 'admin_inbox', params: { kind: 'claims' } } },
    { k: 'disputes', icon: 'alert', tone: 'bad', title: 'Споры по заказам', text: 'Клиент открыл спор', go: { tab: 'admin_inbox', params: { kind: 'disputes' } } },
    { k: 'bonus_orders', icon: 'gift', title: 'Заказы бонусного магазина', text: 'Выдайте клиенту то, что он купил за бонусы', go: { bonus: true } },
    { k: 'reviews', icon: 'star', title: 'Отзывы на модерации', text: 'Опубликуйте или отклоните', go: { tab: 'admin_inbox', params: { kind: 'reviews' } } },
    { k: 'ugc', icon: 'camera', title: 'Распаковки на модерации', text: 'Видео клиентов за награду', go: { tab: 'admin_inbox', params: { kind: 'ugc' } } },
    { k: 'kyc', icon: 'idcard', title: 'Паспорта на проверке', text: 'Откройте заявку, проверьте данные и фото', go: { tab: 'admin_kyc' } },
    { k: 'payouts', icon: 'coins', title: 'Заявки на выплату', text: 'Дропшипперы просят вывести деньги', go: { money: 'payouts' } },
    { k: 'legit', icon: 'scan', title: 'Заявки Legit-Check', text: 'Клиенты ждут вердикт по фото', go: { tab: 'admin_inbox', params: { kind: 'legit' } } },
    { k: 'resale', icon: 'tag', title: 'Пристрой на модерации', text: 'Объявления о перепродаже', go: { tab: 'admin_inbox', params: { kind: 'resale' } } },
  ];

  // Разделы Пульта. Пока раздел не перенесён, он ведёт в «Все инструменты» на нужный блок.
  const SECTIONS = [
    { id: 'orders', icon: 'box', title: 'Заказы', text: 'Выкуп, склад, доставка, трек-номера', go: { orders: 'work' }, count: (a) => a.orders_to_buy + a.awaiting_decision + a.awaiting_payment },
    { id: 'money', icon: 'wallet', title: 'Деньги', text: 'Оплаты, выплаты, сверка, отчёт', go: { money: 'review' }, count: (a) => a.payments_pending + a.payouts },
    { id: 'clients', icon: 'users', title: 'Клиенты', text: 'Поиск, баланс, история', go: { tab: 'admin_clients' } },
    { id: 'inbox', icon: 'message', title: 'Обращения', text: 'Поддержка, претензии, споры, отзывы', go: { tab: 'admin_inbox' }, count: (a) => n(a.tickets) + n(a.claims) + n(a.disputes) + n(a.legit) + n(a.reviews) + n(a.ugc) + n(a.resale) },
    { id: 'store', icon: 'store', title: 'Витрина', text: 'Товары, акции, промокоды', go: { tab: 'admin_store' } },
    { id: 'content', icon: 'text', title: 'Контент', text: 'Тексты, вопросы, отзывы', go: { tab: 'admin_content' } },
    { id: 'team', icon: 'crown', title: 'Сотрудники', text: 'Кто работает и что может', go: { tab: 'admin_team' } },
    { id: 'settings', icon: 'sliders', title: 'Настройки', text: 'Оплата, реквизиты, ставки, рефералы', go: { tab: 'admin_settings' } },
    { id: 'moderator', icon: 'shield', title: 'Модерация', text: 'Чаты, каналы, комментарии, бан везде', go: { tab: 'admin_moderator' } },
    { id: 'system', icon: 'shield', title: 'Система', text: 'Службы, очереди, журнал действий', go: { tab: 'admin_system' } },
  ];

  const PERIODS = [['today', 'Сегодня'], ['d7', '7 дней'], ['d30', '30 дней']];
  let period = 'today';
  let lastData = null;
  let pollTimer = null;

  const AD = window.AD;
  const U = () => window.UI;
  const esc = AD.esc;
  const n = (v) => Number(v) || 0;
  const timeAgo = AD.timeAgo;

  // ── Переходы: все через стек AD, чтобы «Назад» возвращал на Пульт на то же место ──
  function go(target) {
    if (!target) return;
    if (target.info) { U().toast(target.info, 'info'); return; }
    if (target.tab) { AD.open(target.tab, target.params); return; }
    if (target.orders) { AD.open('admin_orders', { stage: target.orders }); return; }
    if (target.money) { AD.open('admin_money', { view: target.money }); return; }
    if (target.desk) { AD.openDesk(); return; }
    if (target.bonus) { AD.open('admin_store', { section: 'bonus' }); return; }
  }

  // ── Отпуск байера из строки «Состояние сервиса» ──
  async function openVacation() {
    const UI = U();
    const cur = (lastData && lastData.health && lastData.health.vacation) || window.buyerVacation || { active: false, days: 0 };
    UI.sheet({
      title: 'Отпуск байера',
      html: `
        <p class="rd-sub" style="margin-top:0">Когда включено, ко всем срокам доставки добавляются дни задержки, а клиенты видят предупреждение в калькуляторе.</p>
        <div class="rd-card rd-list" style="margin-top:14px">
          <label class="rd-row">
            <span class="rd-row-body"><span class="rd-row-title">Отпуск включён</span></span>
            <span class="rd-switch"><input type="checkbox" id="adVacOn" ${cur.active ? 'checked' : ''}><span></span></span>
          </label>
        </div>
        <label class="rd-label" for="adVacDays" style="margin-top:14px">Сколько дней добавить</label>
        <div class="rd-field"><input type="number" id="adVacDays" min="0" max="90" inputmode="numeric" value="${n(cur.days) || 10}"></div>
        <button type="button" class="rd-btn rd-btn-block" id="adVacSave" style="margin-top:16px">Сохранить</button>`,
      onOpen: (wrap, close) => {
        wrap.querySelector('#adVacSave').onclick = async () => {
          const active = wrap.querySelector('#adVacOn').checked;
          const days = Math.max(0, Math.min(90, parseInt(wrap.querySelector('#adVacDays').value, 10) || 0));
          const data = await AD.call(wrap.querySelector('#adVacSave'), 'admin_set_vacation', { p_active: active, p_days: days },
            active ? `Отпуск включён: +${days} дн. к срокам` : 'Отпуск выключен');
          if (!data) return;
          window.buyerVacation = typeof data.active === 'boolean' ? data : { active, days };
          close();
          refresh();
        };
      },
    });
  }

  // ── Отрисовка ──
  function attentionHtml(a) {
    const I = U().icon;
    const rows = ATTENTION.filter((x) => n(a[x.k]) > 0);
    if (!rows.length) {
      return `<div class="rd-card ad-calm"><span class="rd-ico">${I('checkCircle', 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">Всё спокойно</span><span class="rd-row-text">Новых оплат, заказов к выкупу и обращений нет</span></span></div>`;
    }
    return `<div class="rd-card rd-list">${rows.map((x) => `
      <div class="rd-row" role="button" tabindex="0" data-att="${x.k}">
        <span class="rd-ico">${I(x.icon, 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">${x.title}</span><span class="rd-row-text">${x.text}</span></span>
        <span class="ad-count${x.tone ? ' ' + x.tone : ''}">${n(a[x.k])}</span>
      </div>`).join('')}</div>`;
  }

  function statsHtml(st) {
    const UI = U();
    const p = (st && st[period]) || {};
    const tile = (label, value, hint) => `
      <div class="rd-card ad-kpi">
        <div class="ad-kpi-label">${label}</div>
        <div class="ad-kpi-value">${value}</div>
        ${hint ? `<div class="ad-kpi-hint">${hint}</div>` : ''}
      </div>`;
    return `
      <div class="fn-seg ad-seg">${PERIODS.map(([k, t]) => `<button type="button" data-period="${k}" class="${k === period ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="ad-kpis">
        ${tile('Новых заказов', n(p.orders), 'без отменённых')}
        ${tile('Оборот', UI.money(n(p.turnover), { keepCents: true, digits: 2 }), 'оплаченные заказы')}
        ${tile('Комиссия сервиса', UI.money(n(p.commission), { keepCents: true, digits: 2 }), 'по тем же заказам')}
        ${tile('Новых клиентов', n(p.new_users), 'открыли приложение')}
      </div>`;
  }

  function healthHtml(h) {
    const I = U().icon;
    const vac = h.vacation || {};
    const row = (dot, ico, title, text, attr) => `
      <div class="rd-row${attr ? '' : ' ad-static'}" ${attr || ''}>
        <span class="rd-ico">${I(ico, 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">${title}</span><span class="rd-row-text">${text}</span></span>
        <span class="ad-dot ${dot}" aria-hidden="true"></span>
      </div>`;
    return `<div class="rd-card rd-list">
      ${row(h.payments_paused ? 'bad' : 'ok', 'card', h.payments_paused ? 'Оплаты на паузе' : 'Оплаты принимаются',
        h.payments_paused ? esc(h.pause_reason || 'Причина не указана') + '. Включить — командой /resume_sales в боте' : 'Клиенты могут оплачивать заказы')}
      ${row(h.pdd_online ? 'ok' : 'bad', 'search', h.pdd_online ? 'Поиск Pinduoduo работает' : 'Поиск Pinduoduo не на связи',
        h.pdd_online ? 'Ноутбук с эмулятором отвечает' : 'Ноутбук не отвечал: ' + esc(timeAgo(h.pdd_last_seen)))}
      ${row(n(h.notify_failed) ? 'warn' : 'ok', 'bell', n(h.notify_failed) ? `Не дошло уведомлений: ${n(h.notify_failed)}` : 'Уведомления доходят',
        n(h.notify_failed) ? 'За неделю. Чаще всего клиент заблокировал бота' : (n(h.notify_queued) ? `В очереди: ${n(h.notify_queued)}` : 'Очередь пуста'))}
      ${row(h.last_backup && (Date.now() - new Date(h.last_backup).getTime()) < 36 * 3600e3 ? 'ok' : 'warn', 'history', 'Ночная копия базы',
        h.last_backup ? 'Последняя: ' + esc(timeAgo(h.last_backup)) : 'Отчётов о копии пока нет')}
      ${row(vac.active ? 'warn' : 'ok', 'calendar', vac.active ? `Отпуск байера: +${n(vac.days)} дн.` : 'Отпуск байера выключен',
        'Нажмите, чтобы изменить', 'role="button" tabindex="0" id="adVacationRow"')}
    </div>`;
  }

  function sectionsHtml(a, role) {
    const I = U().icon;
    return `<div class="ad-tiles">${SECTIONS.filter((s) => (s.id !== 'team' || role === 'owner' || role === 'admin') && ((s.id !== 'settings' && s.id !== 'system') || role === 'owner')).map((s) => {
      const c = s.count ? n(s.count(a)) : 0;
      return `<button type="button" class="rd-card ad-tile" data-section="${s.id}">
        <span class="rd-ico">${I(s.icon, 22)}</span>
        ${c ? `<span class="ad-count">${c}</span>` : ''}
        <span class="ad-tile-title">${s.title}</span>
        <span class="ad-tile-text">${s.text}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function bodyHtml(d) {
    const a = d.attention || {};
    const role = (d.me && d.me.role) || '';
    return `
      <div class="rd-section"><h2>Требует внимания</h2></div>
      ${attentionHtml(a)}
      <div class="rd-section"><h2>Сводка</h2></div>
      <div id="adStats">${statsHtml(d.stats)}</div>
      <div class="rd-section"><h2>Состояние сервиса</h2></div>
      ${healthHtml(d.health || {})}
      <div class="rd-section"><h2>Разделы</h2></div>
      ${sectionsHtml(a, role)}
      <p class="ad-updated">Обновлено ${new Date(d.at || Date.now()).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. Цифры обновляются сами каждые 30 секунд.</p>`;
  }

  function skeletonHtml() {
    return `
      <div class="rd-section"><h2>Требует внимания</h2></div>
      ${AD.loadingHtml()}
      <div class="rd-section"><h2>Сводка</h2></div>
      <div class="ad-kpis">${'<div class="rd-card ad-kpi ad-skel-sm rd-shimmer"></div>'.repeat(4)}</div>`;
  }

  async function renderAdminHome() {
    if (!isOwner) return '<div class="rd-screen">' + U().empty({ icon: 'lock', title: 'Нет доступа', text: 'Админ-панель доступна только сотрудникам.' }) + '</div>';
    const I = U().icon;
    const role = lastData && lastData.me ? ROLE_TEXT[lastData.me.role] || '' : '';
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Админ-панель</h1><p class="rd-head-sub" id="adRole">${role || 'Пульт управления'}</p></div>
          <button type="button" class="rd-back" id="adRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div id="adBody">${lastData ? bodyHtml(lastData) : skeletonHtml()}</div>
      </div>`;
  }

  function bind() {
    const body = document.getElementById('adBody');
    if (!body) return;
    body.querySelectorAll('[data-att]').forEach((row) => {
      const x = ATTENTION.find((a) => a.k === row.dataset.att);
      row.onclick = () => go(x && x.go);
    });
    body.querySelectorAll('[data-section]').forEach((btn) => {
      const s = SECTIONS.find((x) => x.id === btn.dataset.section);
      btn.onclick = () => go(s && s.go);
    });
    body.querySelectorAll('[data-period]').forEach((btn) => {
      btn.onclick = () => {
        period = btn.dataset.period;
        const box = document.getElementById('adStats');
        if (box && lastData) { box.innerHTML = statsHtml(lastData.stats); bind(); }
      };
    });
    const vac = document.getElementById('adVacationRow');
    if (vac) vac.onclick = openVacation;
  }

  async function refresh(manual) {
    const body = document.getElementById('adBody');
    if (!body) return;
    const { data, error } = await AD.rpc('admin_overview');
    if (!document.getElementById('adBody')) return;
    if (error) {
      if (manual || !lastData) AD.showError(body, 'Не получилось загрузить', 'Проверьте интернет и обновите экран.', () => refresh(true));
      return;
    }
    lastData = data;
    const roleEl = document.getElementById('adRole');
    if (roleEl && data.me) roleEl.textContent = ROLE_TEXT[data.me.role] || 'Пульт управления';
    body.innerHTML = bodyHtml(data);
    bind();
    AD.restoreScroll();
    if (manual) U().toast('Обновлено');
  }

  function attachAdminHomeHandlers() {
    const btn = document.getElementById('adRefresh');
    if (btn) btn.onclick = () => { AD.haptic('light'); refresh(true); };
    bind();
    // цифры с прошлого раза уже на экране: прокрутку возвращаем сразу, не дожидаясь сервера
    if (lastData) AD.restoreScroll();
    refresh(false);
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (currentTab !== 'admin' || !document.getElementById('adBody')) { clearInterval(pollTimer); return; }
      if (document.visibilityState === 'visible') refresh(false);
    }, 30000);
  }

  window.renderAdminHome = renderAdminHome;
  window.attachAdminHomeHandlers = attachAdminHomeHandlers;
  window.adminHomeRoleText = ROLE_TEXT;
})();
