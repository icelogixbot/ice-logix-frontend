// ============================================================
// ICE LOGIX · Админ-панель: Клиенты и Паспорта (этап 3 ADMIN_PLAN.md)
// Список клиентов с поиском и фильтрами (admin_clients), карточка клиента (admin_client),
// очередь паспортов (admin_kyc) и карточка заявки (admin_kyc_item).
// Построен на каркасе admin-kit.js (window.AD). Все проверки и деньги — на сервере:
// admin_clients_list, admin_client_card, admin_user_restrict, admin_adjust_balance,
// admin_kyc_list, admin_kyc_card, admin_kyc_photo, admin_kyc_decision (миграция 20261031190000_admin_clients).
// Фото паспорта лежит в закрытом хранилище: сначала запрос admin_kyc_photo (он пишет просмотр в журнал),
// потом временная ссылка на 60 секунд.
// ============================================================
(function () {
  'use strict';

  const PAGE = 20;

  const FILTERS = [
    ['all', 'Все'], ['new', 'Новые'], ['balance', 'С балансом'], ['orders', 'С заказами'],
    ['hard', 'Сложные'], ['banned', 'Заблокированные'], ['dropship', 'Дропшипперы'],
  ];
  const FILTER_EMPTY = {
    new: ['users', 'Новых клиентов нет', 'За последнюю неделю никто не зарегистрировался.'],
    balance: ['wallet', 'Ни у кого нет денег на балансе', 'Здесь появятся клиенты с положительным балансом.'],
    orders: ['box', 'Заказов пока ни у кого нет', 'Как только клиент оформит заказ, он появится здесь.'],
    hard: ['alert', 'Сложных клиентов нет', 'Сюда попадают клиенты с пометкой или предупреждениями.'],
    banned: ['lock', 'Заблокированных нет', 'Все клиенты могут оформлять заказы.'],
    dropship: ['store', 'Дропшипперов пока нет', 'Здесь будут клиенты, которые работают как дропшипперы.'],
  };

  const KYC_CHIPS = [['pending', 'Ждут проверки'], ['verified', 'Подтверждены'], ['rejected', 'Отклонены'], ['all', 'Все']];
  const KYC_STATUS = { pending: ['Ждёт проверки', 'warn'], verified: ['Подтверждён', 'ok'], rejected: ['Отклонён', 'bad'] };

  const ORDER_STATUS = {
    pending: ['Не оплачен', 'warn'], paid: ['Оплачен, к выкупу', ''], awaiting_decision: ['Ждёт решения клиента', 'warn'],
    bought: ['Выкуплен', ''], on_sklad_cn: ['На складе в Китае', ''], in_transit: ['В пути', ''],
    awaiting_payment: ['Ждёт доплаты', 'warn'], paid_second: ['Доплачен', ''], in_belarus: ['В Беларуси', ''],
    delivered: ['Получен', 'ok'], cancelled: ['Отменён', 'bad'],
  };
  const TICKET_STATUS = {
    open: ['Открыто', 'warn'], new: ['Новое', 'warn'], pending: ['Ждёт ответа', 'warn'], in_progress: ['В работе', ''],
    answered: ['Отвечено', ''], resolved: ['Решено', 'ok'], closed: ['Закрыто', ''],
  };

  // Подписи движений по балансу (как в кошельке клиента wallet.js) плюс корректировка владельца
  const CREDIT_TEXT = {
    REFUND_TO_BALANCE: 'Мгновенный возврат средств', REFUND: 'Мгновенный возврат средств', REFERRAL_BONUS: 'Бонус за друга',
    DELIVERY_SURPLUS: 'Сдача от пересчёта веса', PRICE_DROP: 'Компенсация снижения цены', TOPUP_ERIP: 'Пополнение через ЕРИП',
    TOPUP_OPLATI: 'Пополнение через «Оплати»', TOPUP_KROK: 'Пополнение через КРОК', TOPUP_CARD: 'Пополнение с банковской карты', ADMIN_ADJUSTMENT: 'Корректировка администратора',
    UGC_REWARD: 'Награда за видео-распаковку',
  };
  const DEBIT_TEXT = {
    USED_FOR_ORDER: 'Оплата заказа товаров', SECOND_STAGE_PAY: 'Оплата международной доставки', ADMIN_ADJUSTMENT: 'Корректировка администратора',
  };

  const ROLE_TEXT = { owner: 'Владелец', admin: 'Администратор', support: 'Поддержка' };

  const AD = window.AD;
  const U = () => window.UI;
  const esc = AD.esc;
  const I = (name, size, opts) => U().icon(name, size, opts);
  const money = AD.money;
  const shortId = AD.shortId;
  const nick = AD.nick;
  const haptic = AD.haptic;
  const formSheet = AD.formSheet;
  const confirmSheet = AD.confirmSheet;

  // Метки времени без часового пояса сервер хранит по UTC
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
  const dayOf = (ts) => {
    const d = toDate(ts);
    return d ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  };
  // Дата без времени из поля date (2001-05-17): пересчёта поясов тут не нужно
  function plainDate(v) {
    const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(String(v || ''));
    return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v || '');
  }
  function ago(ts) {
    const d = toDate(ts);
    if (!d) return 'давно';
    const min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    const days = Math.round(h / 24);
    return days < 30 ? `${days} дн. назад` : dayOf(ts);
  }

  const nameOf = (p) => (p && (p.name || (nick(p.nick) ? '@' + nick(p.nick) : ''))) || 'ID ' + ((p && p.user_id) || '');
  const avaOf = (name) => `<span class="ad-ava" aria-hidden="true">${esc((String(name).replace('@', '').trim().charAt(0) || '?').toUpperCase())}</span>`;
  const ledgerText = (dir, reason) => ((String(dir).toUpperCase() === 'DEBIT' ? DEBIT_TEXT : CREDIT_TEXT)[reason]) || (String(dir).toUpperCase() === 'DEBIT' ? 'Списание с кошелька' : 'Пополнение кошелька');
  const badge = (map, st) => (map[st] ? AD.statusBadge(map, st) : '');
  const kvRow = (label, value) => `<div class="ad-money-row"><span>${label}</span><b>${value}</b></div>`;
  const section = (title) => `<div class="rd-section"><h2>${title}</h2></div>`;

  function kycBadge(st) {
    if (st === 'pending') return '<span class="rd-status warn">Паспорт на проверке</span>';
    if (st === 'verified') return '<span class="rd-status ok">Паспорт подтверждён</span>';
    return '';
  }

  // ══════════════════ Список клиентов ══════════════════
  const list = AD.list({
    id: 'adClients',
    rpc: 'admin_clients_list',
    chips: FILTERS,
    chip: 'all',
    chipAlways: ['all'],
    chipCount: (c, k) => Number(c && c[k]) || 0,
    searchPlaceholder: 'Имя, @ник, телефон или ID',
    pageSize: PAGE,
    listClass: 'ad-clients',
    args: (st, limit, offset) => ({ p_filter: st.chip, p_search: st.q || null, p_limit: limit, p_offset: offset }),
    rowHtml: clientRowHtml,
    onRow: (id) => AD.open('admin_client', { id }),
    empty: (st) => {
      if (st.q) return { icon: 'search', title: 'Никого не нашли', text: 'Проверьте имя, ник, телефон или ID и попробуйте ещё раз.' };
      const f = FILTER_EMPTY[st.chip];
      return f ? { icon: f[0], title: f[1], text: f[2] } : { icon: 'users', title: 'Клиентов пока нет', text: 'Как только кто-то зайдёт в приложение, он появится здесь.' };
    },
  });

  function clientRowHtml(r) {
    const name = nameOf(r);
    const sub = [nick(r.nick) && r.name ? '@' + nick(r.nick) : '', r.phone || '', `заказов: ${Number(r.orders) || 0}`].filter(Boolean).map(esc).join(' · ');
    const flags = [
      r.banned ? '<span class="rd-status bad">Заблокирован</span>' : '',
      r.toxic ? '<span class="rd-status warn">Сложный</span>' : '',
      Number(r.warnings) > 0 && !r.banned ? `<span class="rd-status warn">Предупреждений: ${Number(r.warnings)}</span>` : '',
      kycBadge(r.kyc),
      r.dropship ? '<span class="rd-badge">Дропшиппер</span>' : '',
      r.trusted ? '<span class="rd-badge">Проверенный</span>' : '',
    ].filter(Boolean).join('');
    return `
      <div class="rd-row" role="button" tabindex="0" data-row="${esc(r.user_id)}">
        ${avaOf(name)}
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(name)}</span>
          <span class="rd-row-text">${sub}</span>
          ${flags ? `<span class="ad-order-foot">${flags}</span>` : ''}
        </span>
        <span class="ad-order-sum">${money(r.balance)}<small class="ad-mute">на балансе</small></span>
      </div>`;
  }

  function renderClients(params, restored) {
    if (!restored) list.state.q = '';
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Клиенты</h1><p class="rd-head-sub">Поиск, баланс, заказы и паспорта</p></div>
        </div>
        <div class="rd-card rd-list ad-kyc-entry">
          <div class="rd-row" role="button" tabindex="0" id="adKycEntry">
            <span class="rd-ico">${I('idcard', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title">Паспорта</span><span class="rd-row-text" id="adKycEntryText">Заявки на проверку документов</span></span>
            ${I('chevR', 22, { cls: 'rd-chev' })}
          </div>
        </div>
        ${list.shellHtml()}
      </div>`;
  }

  async function attachClients(params, restored) {
    const entry = document.getElementById('adKycEntry');
    if (entry) entry.onclick = () => AD.open('admin_kyc', {});
    list.attach(restored);
    const { data } = await AD.rpc('admin_kyc_list', { p_status: 'pending', p_limit: 1, p_offset: 0 });
    const t = document.getElementById('adKycEntryText');
    if (!t || !data) return;
    const n = Number(data.counts && data.counts.pending) || 0;
    t.textContent = n > 0 ? `Ждут проверки: ${n}` : 'Новых заявок нет';
    if (n > 0) t.classList.add('ad-warn-text');
  }

  // ══════════════════ Карточка клиента ══════════════════
  let card = null;
  let isOwner = null;

  function renderClient(params) {
    const id = params && params.id;
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Клиент</h1><p class="rd-head-sub" id="adClientSub">ID ${esc(id)}</p></div>
          <button type="button" class="rd-back" id="adClientRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div id="adClientBody">${AD.loadingHtml(2)}</div>
      </div>`;
  }

  function attachClient() {
    const b = document.getElementById('adClientRefresh');
    if (b) b.onclick = () => { haptic('light'); loadClient(); };
    loadClient();
  }

  async function checkOwner() {
    if (isOwner !== null) return isOwner;
    try {
      const { data, error } = await supabaseClient.rpc('app_is_owner');
      if (!error) isOwner = data === true;
    } catch (_) { /* считаем, что не владелец */ }
    return isOwner === true;
  }

  async function loadClient() {
    const id = AD.params.id;
    const [res] = await Promise.all([AD.rpc('admin_client_card', { p_user: Number(id) }), checkOwner()]);
    const body = document.getElementById('adClientBody');
    if (!body || String(id) !== String(AD.params.id)) return;
    if (res.error) {
      AD.showError(body, 'Не получилось открыть клиента', AD.errorText(res.error, 'Проверьте интернет и попробуйте ещё раз.'), loadClient);
      return;
    }
    card = res.data;
    const sub = document.getElementById('adClientSub');
    if (sub) sub.textContent = `ID ${card.profile.user_id}`;
    body.innerHTML = clientCardHtml();
    bindClient();
    AD.restoreScroll();
  }

  const canRestrict = (p) => p.role !== 'owner' && (p.role !== 'admin' || isOwner === true);

  function noticesHtml(p) {
    const out = [];
    const note = (tone, icon, title, text) => out.push(`<div class="ad-note ${tone}">${I(icon, 18)}<div><b>${title}</b>${text ? `<p>${text}</p>` : ''}</div></div>`);
    if (p.banned) {
      const until = p.ban_expires_at ? `до ${esc(dayOf(p.ban_expires_at))}` : 'без срока';
      note('bad', 'lock', `Заблокирован ${until}`, `${p.ban_reason ? 'Причина: ' + esc(p.ban_reason) + '. ' : ''}Заказы оформить и оплатить он не сможет.`);
    }
    if (p.toxic) note('warn', 'alert', 'Помечен как сложный клиент', 'Пометку видят только сотрудники.');
    if (Number(p.warnings) > 0 && !p.banned) note('warn', 'alert', `Предупреждений: ${Number(p.warnings)} из 3`, 'На третьем предупреждении аккаунт блокируется сам.');
    return out.join('');
  }

  function profileHtml() {
    const p = card.profile;
    const name = nameOf(p);
    const bits = [
      nick(p.nick) && p.name ? '@' + nick(p.nick) : '', p.phone || '',
      p.created_at ? 'в приложении с ' + dayOf(p.created_at) : '', p.last_activity ? 'заходил ' + ago(p.last_activity) : '',
    ].filter(Boolean).map(esc).join(' · ');
    const flags = [
      ROLE_TEXT[p.role] ? `<span class="rd-badge">${esc(ROLE_TEXT[p.role])}</span>` : '',
      p.banned ? '<span class="rd-status bad">Заблокирован</span>' : '',
      p.toxic ? '<span class="rd-status warn">Сложный</span>' : '',
      p.trusted ? '<span class="rd-badge">Проверенный</span>' : '',
      card.dropshipper ? '<span class="rd-badge">Дропшиппер</span>' : '',
    ].filter(Boolean).join('');
    return `<div class="rd-card rd-list">
      <div class="rd-row ad-static">
        ${avaOf(name)}
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(name)}</span>
          <span class="rd-row-text">${bits}</span>
          ${flags ? `<span class="ad-order-foot">${flags}</span>` : ''}
        </span>
      </div>
      ${nick(p.nick) ? `<a class="rd-row ad-rowlink" href="https://t.me/${esc(nick(p.nick))}" target="_blank" rel="noopener"><span class="rd-ico">${I('send', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Написать в Telegram</span></span>${I('external', 18, { cls: 'rd-chev' })}</a>` : ''}
    </div>${noticesHtml(p)}`;
  }

  function actionRow(id, icon, title, text) {
    return `<div class="rd-row" role="button" tabindex="0" data-act="${id}"><span class="rd-ico">${I(icon, 22)}</span><span class="rd-row-body"><span class="rd-row-title">${title}</span><span class="rd-row-text">${text}</span></span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`;
  }

  function actionsHtml() {
    const p = card.profile;
    const rows = [];
    if (canRestrict(p)) rows.push(actionRow('restrict', 'shield', 'Ограничения', 'Блокировка, предупреждение, пометка «сложный клиент»'));
    if (isOwner === true) rows.push(actionRow('balance', 'wallet', 'Изменить баланс', 'Начислить или списать вручную, с причиной'));
    rows.push(actionRow('review', 'star', 'Запросить отзыв', 'Бот попросит оценить заказы, Legit Check, партнёрство или другое'));
    if (!rows.length) return '';
    return section('Действия') + `<div class="rd-card rd-list">${rows.join('')}</div>`;
  }

  function ledgerHtml() {
    const rows = card.ledger || [];
    if (!rows.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Движений по балансу пока не было.</p></div>`;
    return `<div class="rd-card rd-list">${rows.map((l) => {
      const debit = String(l.direction || l.type).toUpperCase() === 'DEBIT';
      const sub = [esc(when(l.at) || ''), l.balance_after != null ? 'остаток ' + money(l.balance_after) : '', l.reason === 'ADMIN_ADJUSTMENT' && l.by ? esc(l.by) : ''].filter(Boolean);
      const body = `<span class="rd-row-body"><span class="rd-row-title">${esc(ledgerText(l.direction || l.type, l.reason))}</span><span class="rd-row-text">${sub.join(' · ')}</span></span>
        <span class="ad-order-sum${debit ? '' : ' plus'}">${debit ? '−' : '+'}${money(Math.abs(Number(l.amount) || 0))}</span>`;
      return l.order_id
        ? `<div class="rd-row" role="button" tabindex="0" data-order="${esc(l.order_id)}">${body}</div>`
        : `<div class="rd-row ad-static">${body}</div>`;
    }).join('')}</div>`;
  }

  function ordersHtml() {
    const rows = card.orders || [];
    if (!rows.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Заказов пока нет.</p></div>`;
    const more = Number(card.orders_total) > rows.length ? `<p class="ad-updated">Показаны последние ${rows.length} из ${Number(card.orders_total)}</p>` : '';
    return `<div class="rd-card rd-list">${rows.map((o) => `
      <div class="rd-row" role="button" tabindex="0" data-order="${esc(o.id)}">
        <span class="rd-ico">${I('box', 22)}</span>
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(o.title || 'Заказ')}</span>
          <span class="rd-row-text"><span data-ice="${esc(o.id)}">${esc(o.public_number || '#' + shortId(o.id))}</span> · ${esc(when(o.created_at))}</span>
          <span class="ad-order-foot">${AD.statusBadge(ORDER_STATUS, o.status)}${o.archived ? '<span class="rd-status">В архиве</span>' : ''}</span>
        </span>
        <span class="ad-order-sum">${money(o.total)}</span>
      </div>`).join('')}</div>${more}`;
  }

  function referralsHtml() {
    const p = card.profile;
    const rows = card.referrals || [];
    const parts = [];
    if (p.referrer) {
      parts.push(`<div class="rd-row" role="button" tabindex="0" data-client="${esc(p.referrer.user_id)}">
        <span class="rd-ico">${I('users', 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">${esc(nameOf(p.referrer))}</span><span class="rd-row-text">Пригласил этого клиента</span></span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`);
    }
    rows.forEach((r) => {
      parts.push(`<div class="rd-row" role="button" tabindex="0" data-client="${esc(r.user_id)}">
        ${avaOf(nameOf(r))}
        <span class="rd-row-body"><span class="rd-row-title">${esc(nameOf(r))}</span><span class="rd-row-text">пришёл ${esc(when(r.at))} · заказов: ${Number(r.orders) || 0}</span></span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`);
    });
    if (!parts.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Этот клиент никого не приглашал, и его никто не приглашал.</p></div>`;
    const more = Number(card.referrals_total) > rows.length ? `<p class="ad-updated">Показаны последние ${rows.length} из ${Number(card.referrals_total)}</p>` : '';
    return `<div class="rd-card rd-list">${parts.join('')}</div>${more}`;
  }

  function passportHtml() {
    const k = card.kyc || {};
    const st = k.status;
    if (!st || st === 'none' || !k.last_id) {
      return `<div class="rd-card rd-list"><div class="rd-row ad-static"><span class="rd-ico">${I('idcard', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Паспорт не присылал</span><span class="rd-row-text">Заявок на проверку нет</span></span></div></div>`;
    }
    const info = st === 'pending' ? 'Отправлен ' + when(k.submitted_at) : st === 'verified' ? 'Подтверждён ' + when(k.verified_at) : (k.reason ? 'Причина отказа: ' + k.reason : 'Отклонён');
    return `<div class="rd-card rd-list"><div class="rd-row" role="button" tabindex="0" data-kyc="${esc(k.last_id)}">
      <span class="rd-ico">${I('idcard', 22)}</span>
      <span class="rd-row-body"><span class="rd-row-title">Паспорт ${AD.statusBadge(KYC_STATUS, st)}</span><span class="rd-row-text">${esc(info)}</span></span>${I('chevR', 22, { cls: 'rd-chev' })}</div></div>`;
  }

  function ticketsHtml() {
    const rows = card.tickets || [];
    if (!rows.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Обращений в поддержку не было.</p></div>`;
    return `<div class="rd-card rd-list">${rows.map((t) => `
      <div class="rd-row" role="button" tabindex="0" data-ticket="${esc(t.id)}">
        <span class="rd-ico">${I('message', 22)}</span>
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(t.subject || 'Обращение' + (t.number ? ' №' + t.number : ''))}</span>
          <span class="rd-row-text">${esc(t.last || 'Без сообщений')}</span>
          <span class="ad-order-foot">${badge(TICKET_STATUS, t.status)}<span class="ad-order-sub">${esc(ago(t.at))}</span></span>
        </span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`).join('')}</div>`;
  }

  function histText(h) {
    const d = (h && h.details && typeof h.details === 'object') ? h.details : {};
    const why = d.reason ? ` Причина: ${d.reason}.` : '';
    switch (h.action) {
      case 'ban_user': return `Заблокирован ${d.days ? 'на ' + d.days + ' дн.' : 'без срока'}${d.auto ? ' (после третьего предупреждения)' : ''}.${why}`;
      case 'unban_user': return 'Блокировка снята.';
      case 'warn_user': return `Предупреждение${d.warnings_count ? ' №' + d.warnings_count : ''}.${why}`;
      case 'mark_toxic': return `Помечен как сложный клиент.${why}`;
      case 'unmark_toxic': return 'Пометка «сложный клиент» снята.';
      case 'adjust_balance': {
        const a = Number(d.amount) || 0;
        return `Баланс ${a >= 0 ? 'пополнен' : 'уменьшен'} на ${money(Math.abs(a))}.${why}`;
      }
      case 'set_role': return 'Изменена роль сотрудника.';
      case 'kyc_approve': return 'Паспорт подтверждён.';
      case 'kyc_reject': return `Паспорт отклонён.${why}`;
      case 'kyc_photo_view': return 'Сотрудник открыл фото паспорта.';
      case 'ugc_approve': return `Видео-распаковка одобрена${d.reward ? ', награда ' + money(Number(d.reward)) : ''}.`;
      case 'ugc_reject': return 'Видео-распаковка отклонена.';
      default: return 'Действие сотрудника.';
    }
  }

  function historyHtml() {
    const rows = card.history || [];
    if (!rows.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Сотрудники пока ничего с этим клиентом не делали.</p></div>`;
    return `<div class="rd-card rd-list">${rows.map((h) => `
      <div class="rd-row ad-static"><span class="rd-row-body"><span class="rd-row-title">${esc(histText(h))}</span><span class="rd-row-text">${esc(when(h.at))}${h.admin ? ' · ' + esc(h.admin) : ''}</span></span></div>`).join('')}</div>`;
  }

  function clientCardHtml() {
    const p = card.profile;
    const refs = Number(p.referral_count) || 0;
    return `
      ${profileHtml()}
      ${actionsHtml()}
      ${section('Баланс')}
      <div class="rd-card ad-pad">
        ${kvRow('Сейчас на балансе', money(p.balance))}
        ${kvRow('Заказов всего', Number(card.orders_total) || 0)}
        ${kvRow('Приглашено друзей', refs)}
      </div>
      <div class="ad-gap"></div>
      ${ledgerHtml()}
      ${section('Заказы')}
      ${ordersHtml()}
      ${section('Рефералы')}
      ${referralsHtml()}
      ${section('Паспорт')}
      ${passportHtml()}
      ${section('Обращения в поддержку')}
      ${ticketsHtml()}
      ${section('Что делали сотрудники')}
      ${historyHtml()}`;
  }

  function bindClient() {
    const body = document.getElementById('adClientBody');
    if (!body) return;
    body.querySelectorAll('[data-act]').forEach((r) => { r.onclick = () => { haptic('light'); runAction(r.dataset.act); }; });
    body.querySelectorAll('[data-order]').forEach((r) => { r.onclick = () => AD.open('admin_order', { id: r.dataset.order }); });
    body.querySelectorAll('[data-client]').forEach((r) => { r.onclick = () => AD.open('admin_client', { id: r.dataset.client }); });
    body.querySelectorAll('[data-kyc]').forEach((r) => { r.onclick = () => AD.open('admin_kyc_item', { id: r.dataset.kyc }); });
    body.querySelectorAll('[data-ticket]').forEach((r) => { r.onclick = () => AD.openDesk('ticket=' + r.dataset.ticket); });
    loadIceNums(body);
  }

  // Номера ICE-1234567 у заказов: admin_client_card их не отдаёт — дочитываем из orders
  async function loadIceNums(body) {
    const spans = [...body.querySelectorAll('[data-ice]')].filter((el) => !/^ICE-/.test(el.textContent));
    if (!spans.length || !window.supabaseClient) return;
    const { data, error } = await window.supabaseClient.from('orders').select('id, public_number').in('id', spans.map((el) => el.dataset.ice));
    if (error || !data) return;
    const nums = {};
    data.forEach((r) => { nums[r.id] = r.public_number; });
    spans.forEach((el) => { if (nums[el.dataset.ice]) el.textContent = nums[el.dataset.ice]; });
  }

  function runAction(id) {
    if (id === 'restrict') restrictSheet();
    else if (id === 'balance') balanceFlow();
    else if (id === 'review') reviewRequestSheet();
  }

  // ── Запрос отзыва ── строку в review_requests подхватывает бот (review_flow.py) и пишет клиенту
  const REVIEW_TOPICS = [
    ['orders', 'box', 'Заказы', 'Оценить последние полученные заказы'],
    ['legit_check', 'scan', 'Legit Check', 'Проверку на подлинность'],
    ['referral', 'users', 'Рефералка', 'Реферальную программу'],
    ['promo', 'gift', 'Акции/Розыгрыши', 'Акции и розыгрыши'],
    ['dropshipping', 'truck', 'Дропшиппинг', 'Работу по дропшиппингу'],
    ['partnership', 'shield', 'Партнёрство', 'Сотрудничество с нами'],
    ['ads', 'tag', 'Реклама', 'Рекламу у нас'],
  ];

  function reviewRequestSheet() {
    U().sheet({
      title: 'О чём попросить отзыв',
      html: `<div class="rd-card rd-list">${REVIEW_TOPICS.map((t) => `<div class="rd-row ad-row-sm" role="button" tabindex="0" data-t="${t[0]}"><span class="rd-ico">${I(t[1], 22)}</span><span class="rd-row-body"><span class="rd-row-title">${t[2]}</span><span class="rd-row-text">${t[3]}</span></span></div>`).join('')}</div>`,
      onOpen: (wrap, close) => {
        wrap.querySelectorAll('[data-t]').forEach((row) => {
          row.onclick = () => { const k = row.dataset.t; close(); setTimeout(() => reviewRequestSend(k), 180); };
        });
      },
    });
  }

  let reviewSending = false;
  async function reviewRequestSend(topic) {
    if (reviewSending || !card) return;
    const t = REVIEW_TOPICS.find((x) => x[0] === topic);
    const uid = Number(card.profile.user_id);
    if (!t || !uid) return;
    if (!await confirmSheet('Запросить отзыв?', `Тема: ${t[2]}. Бот в ближайшие минуты напишет ${nameOf(card.profile)} и попросит поставить оценку и пару слов.`, 'Отправить запрос')) return;
    reviewSending = true;
    try {
      const { error } = await window.supabaseClient.from('review_requests')
        .insert({ user_id: uid, order_ids: [], topic, send_at: new Date().toISOString(), status: 'scheduled' });
      if (error) { haptic('error'); AD.fail(error); return; }
      haptic('success');
      U().toast('Запрос отзыва отправлен', 'ok');
    } finally {
      reviewSending = false;
    }
  }

  // ── Ограничения ──
  function restrictRpc(btn, action, reason, days, okText) {
    return AD.call(btn, 'admin_user_restrict', {
      p_user: Number(card.profile.user_id), p_action: action, p_reason: reason || null, p_days: days || null,
    }, { ok: okText, after: loadClient });
  }

  function restrictSheet() {
    const p = card.profile;
    const items = [];
    if (p.banned) items.push(['unban', 'lock', 'Снять блокировку', 'Клиент снова сможет оформлять и оплачивать заказы']);
    else items.push(['ban', 'lock', 'Заблокировать', 'Не сможет оформлять и оплачивать новые заказы']);
    items.push(['warn', 'alert', 'Выдать предупреждение', `Сейчас предупреждений: ${Number(p.warnings) || 0}. На третьем блокировка включится сама`]);
    items.push(p.toxic ? ['untoxic', 'shield', 'Снять пометку «сложный клиент»', 'Клиент перестанет быть отмеченным'] : ['toxic', 'shield', 'Пометить как сложного клиента', 'Метку видят только сотрудники, заказы не блокируются']);
    U().sheet({
      title: 'Ограничения',
      html: `<div class="rd-card rd-list">${items.map((it) => `<div class="rd-row ad-row-sm" role="button" tabindex="0" data-r="${it[0]}"><span class="rd-ico">${I(it[1], 22)}</span><span class="rd-row-body"><span class="rd-row-title">${it[2]}</span><span class="rd-row-text">${it[3]}</span></span></div>`).join('')}</div>`,
      onOpen: (wrap, close) => {
        wrap.querySelectorAll('[data-r]').forEach((row) => {
          row.onclick = () => { const k = row.dataset.r; close(); setTimeout(() => restrictStep(k), 180); };
        });
      },
    });
  }

  async function restrictStep(kind) {
    const name = nameOf(card.profile);
    if (kind === 'ban') {
      formSheet({
        title: 'Заблокировать клиента',
        text: `${esc(name)} не сможет оформлять и оплачивать новые заказы. Уже оплаченные заказы продолжат идти.`,
        fields: [
          { name: 'reason', label: 'Причина', placeholder: 'Например: возвраты без причины' },
          { name: 'days', label: 'На сколько дней', placeholder: 'Пусто — без срока', decimal: true, hint: 'От 1 до 365 дней. Если оставить пустым, блокировка будет без срока.' },
        ],
        action: 'Заблокировать',
        danger: true,
        validate: (v) => {
          if (v.reason.length < 3) return 'Напишите причину: хотя бы пару слов';
          if (v.days && !(/^\d+$/.test(v.days) && Number(v.days) >= 1 && Number(v.days) <= 365)) return 'Срок — целое число дней от 1 до 365';
          return '';
        },
        onSubmit: async (v, btn) => (await restrictRpc(btn, 'ban', v.reason, v.days ? Number(v.days) : null, 'Клиент заблокирован')) !== null,
      });
    } else if (kind === 'unban') {
      if (await confirmSheet('Снять блокировку?', `${name} снова сможет оформлять и оплачивать заказы.`, 'Снять блокировку')) await restrictRpc(null, 'unban', null, null, 'Блокировка снята');
    } else if (kind === 'warn') {
      formSheet({
        title: 'Предупреждение клиенту',
        text: `Сейчас предупреждений: ${Number(card.profile.warnings) || 0}. На третьем аккаунт заблокируется сам.`,
        fields: [{ name: 'reason', label: 'За что', placeholder: 'Например: грубость в чате поддержки' }],
        action: 'Выдать предупреждение',
        validate: (v) => (v.reason.length < 3 ? 'Напишите, за что предупреждение' : ''),
        onSubmit: async (v, btn) => (await restrictRpc(btn, 'warn', v.reason, null, (d) => (d && d.auto_ban ? 'Третье предупреждение: клиент заблокирован' : 'Предупреждение выдано'))) !== null,
      });
    } else if (kind === 'toxic') {
      formSheet({
        title: 'Сложный клиент',
        text: 'Пометку видят только сотрудники. Заказы клиента это не блокирует.',
        fields: [{ name: 'reason', label: 'Что случилось (по желанию)', placeholder: 'Например: спорит по каждому заказу' }],
        action: 'Пометить',
        onSubmit: async (v, btn) => (await restrictRpc(btn, 'toxic', v.reason || null, null, 'Клиент помечен')) !== null,
      });
    } else if (kind === 'untoxic') {
      if (await confirmSheet('Снять пометку?', 'Клиент перестанет быть отмеченным как сложный.', 'Снять пометку')) await restrictRpc(null, 'untoxic', null, null, 'Пометка снята');
    }
  }

  // ── Баланс: только владелец, с код-паролем ──
  async function balanceFlow() {
    if (!(await checkOwner())) { U().toast('Баланс может менять только владелец', 'bad'); return; }
    if (window.AppLock && typeof window.AppLock.verifyFlow === 'function') {
      const ok = await window.AppLock.verifyFlow('Изменить баланс клиента');
      if (ok !== true) {
        if (ok === 'not_enabled') U().toast('Сначала включите код-пароль в настройках', 'bad');
        return;
      }
    }
    const p = card.profile;
    const now = Number(p.balance) || 0;
    // ключ повтора: одно открытие окна = одно списание/начисление, даже если нажать дважды
    const idemKey = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    formSheet({
      title: 'Изменить баланс',
      text: `${esc(nameOf(p))}. Сейчас на балансе ${money(now)}.`,
      fields: [
        { name: 'amount', label: 'Сумма', placeholder: '+50 начислить, -20 списать', decimal: true, hint: 'Со знаком плюс — начисляем, со знаком минус — списываем.' },
        { name: 'reason', label: 'Причина', placeholder: 'Например: компенсация за задержку' },
      ],
      action: 'Изменить баланс',
      preview: (v) => {
        const a = AD.num(v.amount);
        if (!a) return null;
        const after = Math.round((now + a) * 100) / 100;
        return {
          tone: after < 0 ? 'warn' : '',
          html: `${a > 0 ? 'Начислим' : 'Спишем'} ${money(Math.abs(a))}. На балансе станет ${money(after)}.`,
        };
      },
      validate: (v) => {
        const a = AD.num(v.amount);
        if (!a) return 'Введите сумму со знаком: +50 или -20';
        if (Math.abs(a) > 100000) return 'Слишком большая сумма. Проверьте её ещё раз';
        if (v.reason.length < 3) return 'Напишите причину: клиент увидит её в истории баланса';
        return '';
      },
      onSubmit: async (v, btn) => {
        const data = await AD.call(btn, 'admin_adjust_balance', { p_user: Number(p.user_id), p_amount: AD.num(v.amount), p_reason: v.reason, p_idempotency_key: idemKey }, { ok: 'Баланс изменён', after: loadClient });
        return data !== null;
      },
    });
  }

  // ══════════════════ Очередь паспортов ══════════════════
  const kycList = AD.list({
    id: 'adKyc',
    rpc: 'admin_kyc_list',
    chips: KYC_CHIPS,
    chip: 'pending',
    chipAlways: ['pending'],
    chipCount: (c, k) => (k === 'all' ? Object.values(c || {}).reduce((a, b) => a + Number(b), 0) : Number(c && c[k]) || 0),
    noSearch: true,
    pageSize: PAGE,
    listClass: 'ad-kyc',
    args: (st, limit, offset) => ({ p_status: st.chip, p_limit: limit, p_offset: offset }),
    rowHtml: (r) => {
      const name = nameOf(r);
      const sub = [nick(r.nick) && r.name ? '@' + nick(r.nick) : '', 'прислал ' + when(r.created_at)].filter(Boolean).map(esc).join(' · ');
      return `
        <div class="rd-row" role="button" tabindex="0" data-row="${esc(r.id)}">
          ${avaOf(name)}
          <span class="rd-row-body">
            <span class="rd-row-title">${esc(name)}</span>
            <span class="rd-row-text">${sub}</span>
            <span class="ad-order-foot">${AD.statusBadge(KYC_STATUS, r.status)}${r.has_photo ? '' : '<span class="rd-status bad">Без фото</span>'}</span>
          </span>
          ${I('chevR', 22, { cls: 'rd-chev' })}
        </div>`;
    },
    onRow: (id) => AD.open('admin_kyc_item', { id }),
    empty: (st) => ({
      icon: 'idcard',
      title: st.chip === 'pending' ? 'Очередь пуста' : 'Здесь пока ничего нет',
      text: st.chip === 'pending' ? 'Новых заявок на проверку паспорта нет. Загляните позже.' : 'Заявок с таким статусом пока нет.',
    }),
  });

  function renderKycList(params, restored) {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Паспорта</h1><p class="rd-head-sub">Проверка документов клиентов</p></div>
        </div>
        ${kycList.shellHtml()}
      </div>`;
  }

  // ══════════════════ Карточка заявки ══════════════════
  let kyc = null;

  function renderKycItem() {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Паспорт</h1><p class="rd-head-sub" id="adKycSub">Загружаем…</p></div>
          <button type="button" class="rd-back" id="adKycRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div id="adKycBody">${AD.loadingHtml(2)}</div>
      </div>`;
  }

  function attachKycItem() {
    const b = document.getElementById('adKycRefresh');
    if (b) b.onclick = () => { haptic('light'); loadKyc(); };
    loadKyc();
  }

  async function loadKyc() {
    const id = AD.params.id;
    const { data, error } = await AD.rpc('admin_kyc_card', { p_id: id });
    const body = document.getElementById('adKycBody');
    if (!body || id !== AD.params.id) return;
    if (error) {
      AD.showError(body, 'Не получилось открыть заявку', AD.errorText(error, 'Проверьте интернет и попробуйте ещё раз.'), loadKyc);
      return;
    }
    kyc = data;
    const sub = document.getElementById('adKycSub');
    if (sub) sub.textContent = `Прислан ${when(kyc.created_at)}`;
    body.innerHTML = kycHtml();
    bindKyc();
    AD.restoreScroll();
  }

  function genderText(g) {
    const s = String(g || '').toLowerCase();
    if (/^(m|male|м|муж)/.test(s)) return 'Мужской';
    if (/^(f|female|ж|жен)/.test(s)) return 'Женский';
    return '';
  }

  function kycHtml() {
    const k = kyc;
    const d = k.doc || {};
    const u = k.user || {};
    const pending = k.status === 'pending';
    const notes = [];
    if (d.is_adult === false) notes.push(`<div class="ad-note warn">${I('alert', 18)}<div><b>Клиенту нет 18 лет</b><p>${d.parental_consent ? 'Согласие родителей отмечено.' : 'Согласие родителей не отмечено.'}</p></div></div>`);
    if (!k.has_photo) notes.push(`<div class="ad-note bad">${I('alert', 18)}<div><b>Фото документа нет</b><p>Без фото подтверждать паспорт нельзя. Отклоните заявку и попросите прислать снова.</p></div></div>`);
    const rows = [
      d.full_name ? kvRow('ФИО', esc(d.full_name)) : '',
      d.birth_date ? kvRow('Дата рождения', `${esc(plainDate(d.birth_date))}${d.age != null ? ` <em>${Number(d.age)} лет</em>` : ''}`) : '',
      genderText(d.gender) ? kvRow('Пол', genderText(d.gender)) : '',
      d.series_tail ? kvRow('Серия', `…${esc(d.series_tail)}`) : '',
      d.number_tail ? kvRow('Номер', `…${esc(d.number_tail)}`) : '',
      d.issue_date ? kvRow('Выдан', esc(plainDate(d.issue_date))) : '',
      d.issued_by ? kvRow('Кем выдан', esc(d.issued_by)) : '',
    ].filter(Boolean).join('');
    const decided = !pending ? `
      <div class="rd-card ad-pad">
        <div class="ad-order-head">${AD.statusBadge(KYC_STATUS, k.status)}</div>
        ${k.moderated_at ? `<p class="ad-order-sub">${esc(when(k.moderated_at))}${k.moderator ? ' · ' + esc(k.moderator) : ''}</p>` : ''}
        ${k.reason ? `<p class="rd-sub" style="margin:8px 0 0">Причина: ${esc(k.reason)}</p>` : ''}
      </div>` : '';
    const others = (k.others || []).length ? `${section('Другие заявки клиента')}<div class="rd-card rd-list">${k.others.map((o) => `
      <div class="rd-row ad-row-sm" role="button" tabindex="0" data-kyc="${esc(o.id)}"><span class="rd-ico">${I('idcard', 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">${AD.statusBadge(KYC_STATUS, o.status)}</span><span class="rd-row-text">${esc(when(o.at))}${o.reason ? ' · ' + esc(o.reason) : ''}</span></span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`).join('')}</div>` : '';
    return `
      <div class="rd-card rd-list">
        <div class="rd-row" role="button" tabindex="0" data-client="${esc(u.user_id)}">
          ${avaOf(nameOf(u))}
          <span class="rd-row-body"><span class="rd-row-title">${esc(nameOf(u))}</span><span class="rd-row-text">Открыть карточку клиента</span></span>${I('chevR', 22, { cls: 'rd-chev' })}
        </div>
      </div>
      ${notes.join('')}
      ${section('Данные из заявки')}
      <div class="rd-card ad-pad">${rows || '<p class="rd-sub" style="margin:0">Клиент не заполнил данные документа.</p>'}
        <p class="ad-hint">Серию и номер показываем не полностью: только последние три символа.</p>
      </div>
      ${section('Фото документа')}
      <div class="rd-card ad-pad">
        <button type="button" class="rd-btn rd-btn-block rd-btn-tonal" id="adKycPhoto"${k.has_photo ? '' : ' disabled'}>${I('eye', 18)}Показать фото</button>
        <p class="ad-hint">Каждый просмотр записывается в журнал: кто и когда смотрел. Ссылка на фото живёт одну минуту.</p>
      </div>
      ${pending ? `
        ${section('Решение')}
        <div class="rd-card ad-pad ad-sheet-list">
          <button type="button" class="rd-btn rd-btn-block" id="adKycOk">Подтвердить паспорт</button>
          <button type="button" class="rd-btn rd-btn-block rd-btn-danger" id="adKycNo">Отклонить с причиной</button>
          <p class="ad-hint">Клиент получит сообщение от бота с вашим решением.</p>
        </div>` : `${section('Решение')}${decided}`}
      ${others}`;
  }

  function bindKyc() {
    const body = document.getElementById('adKycBody');
    if (!body) return;
    const photo = document.getElementById('adKycPhoto');
    if (photo) photo.onclick = () => showPhoto(photo);
    const ok = document.getElementById('adKycOk');
    if (ok) ok.onclick = () => approveKyc(ok);
    const no = document.getElementById('adKycNo');
    if (no) no.onclick = () => rejectKyc();
    body.querySelectorAll('[data-client]').forEach((r) => { r.onclick = () => AD.open('admin_client', { id: r.dataset.client }); });
    body.querySelectorAll('[data-kyc]').forEach((r) => { r.onclick = () => AD.open('admin_kyc_item', { id: r.dataset.kyc }); });
  }

  async function showPhoto(btn) {
    const id = AD.params.id;
    const data = await AD.call(btn, 'admin_kyc_photo', { p_id: id });
    if (!data) return;
    btn.disabled = false;
    if (!data.path) { U().toast('Фото не нашлось', 'bad'); return; }
    let url = '';
    try {
      const res = await supabaseClient.storage.from(data.bucket || 'kyc-documents').createSignedUrl(data.path, 60);
      if (res.error || !res.data) throw res.error || new Error('no url');
      url = res.data.signedUrl;
    } catch (_) {
      U().toast('Не получилось открыть фото. Попробуйте ещё раз', 'bad');
      return;
    }
    U().sheet({
      title: 'Фото документа',
      html: `<img class="ad-photo" src="${esc(url)}" alt="Фото паспорта клиента"><p class="ad-hint">Ссылка перестанет работать через минуту. Просмотр записан в журнал.</p>`,
    });
  }

  async function approveKyc(btn) {
    const ok = await confirmSheet('Подтвердить паспорт?', 'Клиент получит сообщение, что документ подтверждён.', 'Подтвердить');
    if (!ok) return;
    await AD.call(btn, 'admin_kyc_decision', { p_id: AD.params.id, p_approve: true, p_reason: null }, { ok: 'Паспорт подтверждён', after: loadKyc });
  }

  function rejectKyc() {
    formSheet({
      title: 'Отклонить паспорт',
      text: 'Клиент увидит причину в сообщении от бота. Напишите, что нужно исправить.',
      fields: [{ name: 'reason', label: 'Причина', placeholder: 'Например: фото размытое, не видно номер' }],
      action: 'Отклонить',
      danger: true,
      validate: (v) => (v.reason.length < 3 ? 'Напишите причину: клиент увидит её' : ''),
      onSubmit: async (v, btn) => (await AD.call(btn, 'admin_kyc_decision', { p_id: AD.params.id, p_approve: false, p_reason: v.reason }, { ok: 'Заявка отклонена', after: loadKyc })) !== null,
    });
  }

  // ══════════════════ Подключение ══════════════════
  window.adminOpenClients = () => AD.open('admin_clients', {});
  window.adminOpenClient = (id) => AD.open('admin_client', { id });
  window.adminOpenKyc = () => AD.open('admin_kyc', {});

  AD.screen('admin_clients', {
    render: renderClients,
    attach: attachClients,
    save: list.save,
    restore: list.restore,
  });
  AD.screen('admin_client', {
    guard: (params) => !!(params && params.id),
    render: renderClient,
    attach: attachClient,
  });
  AD.screen('admin_kyc', {
    render: renderKycList,
    attach: (params, restored) => kycList.attach(restored),
    save: kycList.save,
    restore: kycList.restore,
  });
  AD.screen('admin_kyc_item', {
    guard: (params) => !!(params && params.id),
    render: renderKycItem,
    attach: attachKycItem,
  });
})();
