// ============================================================
// ICE LOGIX · Админ-панель: Деньги (этап 2 ADMIN_HANDOFF.md, этап 3 ADMIN_PLAN.md)
// Вкладка admin_money: оплаты на проверке (заявки «Я оплатил» через ЕРИП, Оплати, перевод, пополнения),
// все платежи, журнал баланса, возвраты, выплаты дропшипперам, сверка заказов, расходы.
// Вкладка admin_money_report: отчёт за период и выгрузка таблицы без личных данных.
// Данные и действия — только серверные функции (миграция 20261031170000_admin_money):
// admin_money_list, admin_confirm_payment, admin_reject_payment, admin_payout_decision, admin_payout_card,
// admin_recon_resolve, admin_expense_add, admin_expense_delete, admin_money_report.
// Построен на каркасе admin-kit.js (window.AD).
// ============================================================
(function () {
  'use strict';

  const AD = window.AD;
  const U = () => window.UI;
  const esc = AD.esc;
  const I = (name, size, opts) => U().icon(name, size, opts);
  const money = AD.money;
  const num = AD.num;
  const fmt2 = AD.fmt2;
  const shortId = AD.shortId;
  const nick = AD.nick;
  const dateTime = AD.dateTime;
  const daysSince = AD.daysSince;
  const haptic = AD.haptic;

  const VIEWS = [
    ['review', 'На проверке'], ['payments', 'Платежи'], ['ledger', 'Журнал баланса'], ['refunds', 'Возвраты'],
    ['payouts', 'Выплаты'], ['recon', 'Сверка'], ['expenses', 'Расходы'],
  ];
  const VIEW_KEYS = VIEWS.map((v) => v[0]);

  const PAY_TYPE = { TOPUP: 'Пополнение баланса', FIRST_PAYMENT: 'Оплата заказа', SECOND_PAYMENT: 'Доплата за доставку', PRICE_ADJUSTMENT: 'Корректировка', OTHER: 'Платёж' };
  const PAY_METHOD = { manual: 'Перевод', card: 'Карта', card_token: 'Привязанная карта', erip: 'ЕРИП', oplati: 'Оплати' };
  const PAY_STATUS = {
    PENDING: ['Ждёт проверки', 'warn'], REQUIRES_REVIEW: ['Нужна проверка', 'warn'], CREATED: ['Создан', ''], PAID: ['Получен', 'ok'],
    DECLINED: ['Отклонён', 'bad'], FAILED: ['Ошибка оплаты', 'bad'], CANCELLED: ['Отменён', ''], EXPIRED: ['Истёк', ''],
    REFUNDED: ['Возвращён', ''], PARTIALLY_REFUNDED: ['Возвращён частично', ''],
  };
  const REFUND_STATUS = {
    REQUESTED: ['Запрошен', 'warn'], APPROVED: ['Одобрен', ''], PROCESSING: ['В работе', 'warn'],
    COMPLETED: ['Выполнен', 'ok'], REJECTED: ['Отклонён', 'bad'], FAILED: ['Ошибка', 'bad'],
  };
  const REFUND_DEST = { BALANCE: 'на баланс', CARD: 'на карту' };
  const PAYOUT_STATUS = { pending: ['Ждёт решения', 'warn'], approved: ['Одобрена, переведите', 'warn'], completed: ['Переведено', 'ok'], rejected: ['Отклонена', 'bad'] };
  const ISSUE_SHORT = { paid_mismatch: 'Оплата не сходится', refund_mismatch: 'Возвраты не сходятся', refund_balance_mismatch: 'Возвраты и журнал', cancelled_held: 'Деньги не вернули' };
  const ISSUE_TEXT = {
    paid_mismatch: '«Оплачено» в заказе не равно сумме полученных платежей и списаний с баланса.',
    refund_mismatch: '«Возвращено» в заказе не равно сумме записей о возвратах.',
    refund_balance_mismatch: 'Возвраты на баланс не совпадают с зачислениями в журнале баланса.',
    cancelled_held: 'Заказ отменён, но клиенту вернули не всё, что он заплатил.',
  };
  const EXPENSE_CATS = ['Реклама', 'Доставка', 'Упаковка', 'Сервисы и подписки', 'Зарплата', 'Прочее'];

  let pollTimer = null;

  const who = (r) => r.name || (nick(r.nick) ? '@' + nick(r.nick) : (r.user_id ? 'ID ' + r.user_id : 'Клиент'));
  const badge = (map, st) => AD.statusBadge(map, st);
  const signed = (r) => `${r.direction === 'DEBIT' ? '−' : '+'}${money(r.amount)}`;
  const isPast = (ts) => !!ts && new Date(ts).getTime() < Date.now();
  const kv = (label, value) => `<div class="ad-money-row"><span>${esc(label)}</span><b>${value}</b></div>`;
  const dayText = (ts) => (ts ? new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  function openOrder(id) {
    if (id) AD.open('admin_order', { id });
  }

  // ══ Список ══
  const list = AD.list({
    id: 'adMoney',
    rpc: 'admin_money_list',
    chips: VIEWS,
    chip: 'review',
    chipAlways: VIEW_KEYS,
    chipCount: (c, k) => (['review', 'payouts', 'recon'].includes(k) ? Number(c[k]) || 0 : 0),
    searchPlaceholder: 'Имя, @ник, ID клиента или номер заказа',
    pageSize: 20,
    listClass: 'ad-orders',
    note: true,
    args: (st, limit, offset) => ({ p_view: st.chip, p_search: st.q || null, p_limit: limit, p_offset: offset }),
    rowHtml: rowHtml,
    onRow: (id) => {
      const r = list.state.rows.find((x) => String(x.id) === String(id));
      if (r) openRow(r);
    },
    onData: onData,
    empty: (st) => (st.q ? { icon: 'search', title: 'Ничего не нашли', text: 'Проверьте имя, ID или номер заказа.' } : EMPTY[st.chip] || EMPTY.review),
  });

  const EMPTY = {
    review: { icon: 'checkCircle', title: 'Всё проверено', text: 'Когда клиент нажмёт «Я оплатил», заявка появится здесь.' },
    payments: { icon: 'receipt', title: 'Платежей пока нет', text: 'Здесь будут все оплаты заказов и пополнения баланса.' },
    ledger: { icon: 'history', title: 'Журнал пуст', text: 'Здесь видно каждое движение по балансу клиентов.' },
    refunds: { icon: 'history', title: 'Возвратов не было', text: 'Возвраты появляются при отмене заказа, удешевлении товара и выплате по страховке.' },
    payouts: { icon: 'coins', title: 'Заявок на выплату нет', text: 'Дропшипперы просят вывести заработок из своего кабинета.' },
    recon: { icon: 'checkCircle', title: 'Расхождений нет', text: 'Суммы во всех заказах в работе сходятся с платежами, балансом и возвратами.' },
    expenses: { icon: 'receipt', title: 'Расходов пока нет', text: 'Записывайте траты на рекламу, упаковку и сервисы — они попадут в отчёт.' },
  };

  function rowHtml(r) {
    switch (r.kind) {
      case 'payment': return paymentRow(r);
      case 'ledger': return ledgerRow(r);
      case 'refund': return refundRow(r);
      case 'payout': return payoutRow(r);
      case 'recon': return reconRow(r);
      case 'expense': return expenseRow(r);
      default: return '';
    }
  }

  function row(id, icon, title, sub, foot, sum) {
    return `
      <div class="ad-order" role="button" tabindex="0" data-row="${esc(id)}">
        <span class="ad-thumb ad-thumb-sm">${I(icon, 20)}</span>
        <span class="ad-order-body">
          <span class="ad-order-title">${title}</span>
          <span class="ad-order-sub">${sub}</span>
          ${foot ? `<span class="ad-order-foot">${foot}</span>` : ''}
        </span>
        <span class="ad-order-sum">${sum}</span>
      </div>`;
  }

  function paymentRow(r) {
    const title = esc(PAY_TYPE[r.type] || 'Платёж') + (r.order_id ? ` · ${esc(r.order_title || '#' + shortId(r.order_id))}` : '');
    const sub = `${esc(who(r))} · ${esc(PAY_METHOD[r.method] || 'Перевод')} · ${esc(dateTime(r.created_at))}`;
    const waiting = ['PENDING', 'REQUIRES_REVIEW'].includes(r.status);
    const days = waiting ? daysSince(r.created_at) : 0;
    const foot = badge(PAY_STATUS, r.status)
      + (waiting && isPast(r.expires_at) ? '<span class="rd-status bad">Срок заявки истёк</span>' : '')
      + (waiting && days >= 1 ? `<span class="rd-status">${days} дн. ждёт</span>` : '');
    return row(r.id, r.type === 'TOPUP' ? 'wallet' : 'receipt', title, sub, foot, money(r.amount));
  }

  function ledgerRow(r) {
    const by = r.by_id && String(r.by_id) !== String(r.user_id) ? ` · сделал ${esc(r.by_name || 'сотрудник')}` : '';
    const sub = `${esc(who(r))} · ${esc(dateTime(r.created_at))}${by}`;
    const foot = r.order_id ? `<span class="rd-status">Заказ #${esc(shortId(r.order_id))}</span>` : '';
    const sum = `<span class="${r.direction === 'CREDIT' ? 'ad-in' : ''}">${signed(r)}</span>${r.balance_after != null ? `<small class="ad-mute">остаток ${money(r.balance_after)}</small>` : ''}`;
    return row(r.id, r.direction === 'CREDIT' ? 'plus' : 'minus', esc(r.label || 'Движение по балансу'), sub, foot, sum);
  }

  function refundRow(r) {
    const title = `Возврат ${esc(REFUND_DEST[r.destination] || '')}${r.order_title ? ' · ' + esc(r.order_title) : ''}`;
    const sub = `${esc(who(r))} · ${esc(dateTime(r.created_at))}`;
    const foot = badge(REFUND_STATUS, r.status) + (r.reason ? `<span class="rd-status">${esc(String(r.reason).slice(0, 40))}</span>` : '');
    return row(r.id, 'history', title, sub, foot, money(r.amount));
  }

  function payoutRow(r) {
    const s = r.stats || {};
    const over = r.status === 'pending' && num(r.amount) > num(s.available) + 0.005;
    const sub = `Выплата дропшипперу · ${esc(dateTime(r.created_at))} · ${r.last4 ? 'карта •••• ' + esc(r.last4) : 'карты нет'}`;
    const foot = badge(PAYOUT_STATUS, r.status) + (over ? '<span class="rd-status bad">Больше заработанного</span>' : '');
    return row(r.id, 'coins', esc(who(r)), sub, foot, money(r.amount));
  }

  function reconRow(r) {
    const st = U().orderStatus ? U().orderStatus(r.status) : { text: r.status };
    const sub = `${esc(who(r))} · #${esc(shortId(r.order_id))} · ${esc(st.text || '')}`;
    const foot = (r.issues || []).map((k) => `<span class="rd-status warn">${esc(ISSUE_SHORT[k] || 'Расхождение')}</span>`).join('');
    return row(r.id, 'alert', esc(r.order_title || 'Заказ'), sub, foot, `${money(r.total_paid)}<small class="ad-mute">оплачено</small>`);
  }

  function expenseRow(r) {
    const sub = `${r.description ? esc(String(r.description).slice(0, 60)) + ' · ' : ''}${esc(dayText(r.created_at))}`;
    return row(r.id, 'tag', esc(r.category || 'Без статьи'), sub, '', money(r.amount));
  }

  // Строка-итог под чипами и плавающая кнопка «Добавить расход»
  function onData(d, st) {
    const note = document.getElementById('adMoneyNote');
    const total = Number(d.total) || 0;
    const sum = Number(d.sum) || 0;
    const counts = d.counts || {};
    let text = '';
    if (!st.q) {
      if (st.chip === 'review' && total) text = `${total} ${plural(total, 'заявка', 'заявки', 'заявок')} на ${money(sum)}. Подтверждайте, только когда деньги пришли.`;
      else if (st.chip === 'payouts' && sum > 0) text = `Ждут решения или перевода: ${money(sum)}`;
      else if (st.chip === 'recon' && total) text = 'Заказы в работе, где суммы не сходятся. Откройте и проверьте по истории заказа.';
      else if (st.chip === 'expenses') text = `В этом месяце: ${money(counts.expenses_month || 0)}${total ? ` · всего записано ${money(sum)}` : ''}`;
    } else if (total) {
      text = `Найдено: ${total}`;
    }
    if (note) {
      note.hidden = !text;
      note.innerHTML = text;
    }
    const space = document.getElementById('adMoneySpace');
    if (st.chip === 'expenses') {
      AD.mountCta({ label: 'Добавить расход', run: addExpense }, 'adMoneyBody');
      if (space) space.hidden = false;
    } else {
      AD.clearCta();
      if (space) space.hidden = true;
    }
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function renderAdminMoney(params, restored) {
    if (!restored) {
      list.state.q = '';
      list.state.chip = params && VIEW_KEYS.includes(params.view) ? params.view : 'review';
    }
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Деньги</h1><p class="rd-head-sub">Оплаты, возвраты, выплаты и расходы</p></div>
          <button type="button" class="rd-back" id="adMoneyRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div class="rd-card rd-list ad-money-top">
          <div class="rd-row" role="button" tabindex="0" id="adMoneyReport">
            <span class="rd-ico">${I('calc', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title">Отчёт за период</span><span class="rd-row-text">Оборот, комиссия, поступления, возвраты и расходы</span></span>
            ${I('chevR', 22, { cls: 'rd-chev' })}
          </div>
        </div>
        ${list.shellHtml()}
        <div class="ad-cta-space" id="adMoneySpace" hidden></div>
      </div>`;
  }

  function attachAdminMoney(params, restored) {
    const rep = document.getElementById('adMoneyReport');
    if (rep) rep.onclick = () => { haptic('light'); AD.open('admin_money_report'); };
    const ref = document.getElementById('adMoneyRefresh');
    if (ref) ref.onclick = () => { haptic('light'); list.reload(); };
    list.attach(restored);
    // Заявки и выплаты обновляются сами раз в 30 секунд, пока экран открыт и не открыта шторка
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!document.getElementById('adMoneyBody')) { clearInterval(pollTimer); pollTimer = null; return; }
      if (document.hidden || document.querySelector('.rd-sheet-wrap') || list.state.q) return;
      if (list.state.chip === 'review' || list.state.chip === 'payouts') list.reload();
    }, 30000);
  }

  // ══ Карточки строк (шторки) ══
  function openRow(r) {
    haptic('light');
    if (r.kind === 'payment') paymentSheet(r);
    else if (r.kind === 'ledger') ledgerSheet(r);
    else if (r.kind === 'refund') refundSheet(r);
    else if (r.kind === 'payout') payoutSheet(r);
    else if (r.kind === 'recon') reconSheet(r);
    else if (r.kind === 'expense') expenseSheet(r);
  }

  function btns(items) {
    const html = items.filter(Boolean).map((b) => `<button type="button" class="rd-btn rd-btn-block${b.cls ? ' ' + b.cls : ''}" data-act="${esc(b.act)}">${esc(b.label)}</button>`).join('');
    return html ? `<div class="ad-sheet-btns">${html}</div>` : '';
  }
  function bindActs(wrap, close, acts) {
    wrap.querySelectorAll('[data-act]').forEach((b) => {
      b.onclick = () => { const fn = acts[b.dataset.act]; if (fn) fn(b, close); };
    });
  }

  // ── Оплата / заявка «Я оплатил» ──
  function paymentSheet(p) {
    const waiting = ['PENDING', 'REQUIRES_REVIEW'].includes(p.status);
    const canDecide = waiting && (p.provider === 'manual' || p.status === 'REQUIRES_REVIEW');
    const html = `
      <div class="ad-head-sum">${money(p.amount)} ${badge(PAY_STATUS, p.status)}</div>
      ${kv('Клиент', `${esc(who(p))} <em>ID ${esc(p.user_id)}</em>`)}
      ${kv('Способ', esc(PAY_METHOD[p.method] || 'Перевод'))}
      ${p.order_id ? kv('Заказ', `${esc(p.order_title || 'Заказ')} <em>#${esc(shortId(p.order_id))}</em>`) : ''}
      ${kv('Номер заявки', `<span class="ad-select">${esc(shortId(p.id))}</span>`)}
      ${kv('Создана', esc(dateTime(p.created_at)))}
      ${waiting && p.expires_at ? kv('Действует до', `${esc(dateTime(p.expires_at))}${isPast(p.expires_at) ? ' <em class="warn">истекла</em>' : ''}`) : ''}
      ${p.paid_at ? kv('Зачислена', esc(dateTime(p.paid_at))) : ''}
      ${p.failure_reason && !waiting ? kv('Причина', esc(p.failure_reason)) : ''}
      ${canDecide ? `<div class="ad-note warn">${I('info', 20)}<div><b>Проверьте поступление</b><p>Найдите в банке или ЕРИП платёж на эту сумму от клиента. ${p.type === 'TOPUP' ? 'После подтверждения сумма придёт на баланс клиента.' : 'После подтверждения этап заказа станет оплаченным.'}</p></div></div>` : ''}
      ${btns([
        canDecide && { act: 'ok', label: 'Деньги пришли' },
        canDecide && { act: 'no', label: 'Оплаты нет', cls: 'rd-btn-ghost' },
        p.order_id && { act: 'order', label: 'Открыть заказ', cls: 'rd-btn-ghost' },
      ])}`;
    U().sheet({
      title: esc(PAY_TYPE[p.type] || 'Платёж'),
      html,
      onOpen: (wrap, close) => bindActs(wrap, close, {
        ok: async (b) => {
          const yes = await AD.confirmSheet('Деньги пришли?', 'Сумма зачтётся клиенту. Отменить это будет нельзя.', 'Деньги пришли');
          if (!yes) return;
          close();
          await AD.call(null, 'admin_confirm_payment', { p_payment_id: p.id }, {
            ok: (d) => (d && d.already ? 'Эта оплата уже подтверждена' : 'Оплата подтверждена'),
            after: () => list.reload(),
          });
        },
        no: async () => {
          const reason = await U().ask({
            title: 'Оплаты нет', text: 'Клиент увидит причину в истории платежей.',
            fields: [{ name: 'reason', label: 'Причина', type: 'text', value: 'Оплата не найдена' }], action: 'Отклонить заявку', danger: true,
            validate: (v) => (v.reason ? '' : 'Напишите причину'),
          });
          if (reason === null) return;
          close();
          await AD.call(null, 'admin_reject_payment', { p_payment_id: p.id, p_reason: reason }, { ok: 'Заявка отклонена', after: () => list.reload() });
        },
        order: () => { close(); openOrder(p.order_id); },
      }),
    });
  }

  // ── Движение по балансу ──
  function ledgerSheet(r) {
    const by = !r.by_id ? 'Система' : String(r.by_id) === String(r.user_id) ? 'Сам клиент' : (r.by_name || 'Сотрудник');
    U().sheet({
      title: esc(r.label || 'Движение по балансу'),
      html: `
        <div class="ad-head-sum"><span class="${r.direction === 'CREDIT' ? 'ad-in' : ''}">${signed(r)}</span></div>
        ${kv('Клиент', `${esc(who(r))} <em>ID ${esc(r.user_id)}</em>`)}
        ${r.balance_after != null ? kv('Баланс после', money(r.balance_after)) : ''}
        ${kv('Когда', esc(dateTime(r.created_at)))}
        ${kv('Кто сделал', esc(by))}
        ${r.order_id ? kv('Заказ', `#${esc(shortId(r.order_id))}`) : ''}
        ${btns([r.order_id && { act: 'order', label: 'Открыть заказ', cls: 'rd-btn-ghost' }])}`,
      onOpen: (wrap, close) => bindActs(wrap, close, { order: () => { close(); openOrder(r.order_id); } }),
    });
  }

  // ── Возврат ──
  function refundSheet(r) {
    U().sheet({
      title: 'Возврат',
      html: `
        <div class="ad-head-sum">${money(r.amount)} ${badge(REFUND_STATUS, r.status)}</div>
        ${kv('Клиент', `${esc(who(r))} <em>ID ${esc(r.user_id)}</em>`)}
        ${kv('Куда', esc(REFUND_DEST[r.destination] || 'на баланс'))}
        ${r.reason ? kv('Причина', esc(r.reason)) : ''}
        ${kv('Когда', esc(dateTime(r.completed_at || r.created_at)))}
        ${r.order_id ? kv('Заказ', `${esc(r.order_title || 'Заказ')} <em>#${esc(shortId(r.order_id))}</em>`) : ''}
        ${btns([r.order_id && { act: 'order', label: 'Открыть заказ', cls: 'rd-btn-ghost' }])}`,
      onOpen: (wrap, close) => bindActs(wrap, close, { order: () => { close(); openOrder(r.order_id); } }),
    });
  }

  // ── Выплата дропшипперу ──
  function payoutSheet(r) {
    const s = r.stats || {};
    const over = r.status === 'pending' && num(r.amount) > num(s.available) + 0.005;
    const html = `
      <div class="ad-head-sum">${money(r.amount)} ${badge(PAYOUT_STATUS, r.status)}</div>
      ${kv('Дропшиппер', `${esc(who(r))} <em>ID ${esc(r.user_id)}</em>`)}
      ${kv('Заявка от', esc(dateTime(r.created_at)))}
      ${kv('Заработано', `${money(s.earned)} <em>${esc(s.orders || 0)} ${plural(Number(s.orders) || 0, 'заказ', 'заказа', 'заказов')}</em>`)}
      ${kv('Уже выплачено и одобрено', money(s.paid_out))}
      ${kv('Доступно сейчас', `${money(Math.max(num(s.available), 0))}${over ? ' <em class="warn">меньше заявки</em>' : ''}`)}
      ${kv('Карта', r.last4 ? '•••• ' + esc(r.last4) : 'не указана')}
      <div class="ad-note">${I('info', 20)}<div><b>Откуда заработок</b><p>Наценка дропшиппера с оплаченных и не отменённых заказов клиентов, которых он привёл. Баланс в приложении не меняется: деньги переводятся на карту.</p></div></div>
      ${over ? `<div class="ad-note bad">${I('alert', 20)}<div><b>Заявка больше заработанного</b><p>Одобрить её нельзя. Отклоните и попросите дропшиппера отправить новую на доступную сумму.</p></div></div>` : ''}
      ${r.status === 'approved' && !r.last4 ? `<div class="ad-note warn">${I('alert', 20)}<div><b>Карта не указана</b><p>Попросите дропшиппера добавить карту в кабинете, потом переведите.</p></div></div>` : ''}
      <div id="adPayoutCard"></div>
      ${btns([
        r.status === 'pending' && !over && { act: 'approve', label: 'Одобрить выплату' },
        r.status === 'approved' && r.last4 && { act: 'card', label: 'Показать номер карты', cls: 'rd-btn-tonal' },
        r.status === 'approved' && { act: 'paid', label: 'Деньги переведены' },
        ['pending', 'approved'].includes(r.status) && { act: 'reject', label: 'Отклонить', cls: 'rd-btn-ghost' },
      ])}`;
    U().sheet({
      title: 'Заявка на выплату',
      html,
      onOpen: (wrap, close) => bindActs(wrap, close, {
        approve: async () => {
          const yes = await AD.confirmSheet('Одобрить выплату?', 'Сумма уйдёт из доступного заработка дропшиппера. После одобрения откроется номер карты для перевода.', 'Одобрить');
          if (!yes) return;
          close();
          const d = await AD.call(null, 'admin_payout_decision', { p_request: r.id, p_action: 'approve' }, { ok: 'Выплата одобрена. Переведите деньги на карту' });
          if (d) { r.status = 'approved'; list.reload(); payoutSheet(r); }
        },
        card: async (b) => {
          const d = await AD.call(b, 'admin_payout_card', { p_request: r.id }, {});
          const box = wrap.querySelector('#adPayoutCard');
          if (!d || !box) return;
          if (!d.card) { box.innerHTML = `<div class="ad-note warn">${I('alert', 20)}<div><b>Карту не нашли</b><p>Попросите дропшиппера заново добавить карту в кабинете.</p></div></div>`; return; }
          const digits = String(d.card).replace(/\D/g, '');
          box.innerHTML = `<div class="ad-preview"><span class="ad-card-num ad-select">${esc(digits.replace(/(\d{4})(?=\d)/g, '$1 '))}</span>
            <button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-copy>Скопировать</button></div>`;
          box.querySelector('[data-copy]').onclick = async () => {
            if (await copyText(digits)) U().toast('Номер карты скопирован'); else U().toast('Не получилось скопировать', 'bad');
          };
          b.remove();
        },
        paid: async () => {
          const yes = await AD.confirmSheet('Деньги переведены?', `Отметьте, только когда перевод на карту уже сделан. Дропшиппер увидит заявку как выполненную.`, 'Да, переведено');
          if (!yes) return;
          close();
          await AD.call(null, 'admin_payout_decision', { p_request: r.id, p_action: 'paid' }, { ok: 'Выплата отмечена', after: () => list.reload() });
        },
        reject: async () => {
          const reason = await U().ask({
            title: 'Отклонить выплату', text: 'Причина сохранится в журнале действий.',
            fields: [{ name: 'reason', label: 'Причина', type: 'text', value: over ? 'Сумма больше заработанного' : '' }], action: 'Отклонить', danger: true,
            validate: (v) => (v.reason ? '' : 'Напишите причину'),
          });
          if (reason === null) return;
          close();
          await AD.call(null, 'admin_payout_decision', { p_request: r.id, p_action: 'reject', p_reason: reason }, { ok: 'Заявка отклонена', after: () => list.reload() });
        },
      }),
    });
  }

  // ── Расхождение по заказу ──
  function reconSheet(r) {
    const diffPaid = num(r.total_paid) - (num(r.paid_payments) + num(r.paid_balance));
    const issues = (r.issues || []).map((k) => `<p>${esc(ISSUE_TEXT[k] || 'Суммы не сходятся.')}</p>`).join('');
    U().sheet({
      title: esc(r.order_title || 'Заказ') + ' · #' + esc(shortId(r.order_id)),
      html: `
        <div class="ad-note warn">${I('alert', 20)}<div><b>Что не сходится</b>${issues}</div></div>
        <div class="ad-divider"></div>
        ${kv('Сумма заказа', money(r.total))}
        ${kv('Оплачено по заказу', money(r.total_paid))}
        ${kv('Платежи получены', money(r.paid_payments))}
        ${kv('Списано с баланса', money(r.paid_balance))}
        ${Math.abs(diffPaid) > 0.009 ? kv('Разница', `${diffPaid > 0 ? '+' : '−'}${money(Math.abs(diffPaid))}`) : ''}
        <div class="ad-divider"></div>
        ${kv('Возвращено по заказу', money(r.total_refunded))}
        ${kv('Записи о возвратах', money(r.refunds_done))}
        ${kv('Из них на баланс', money(r.refunds_balance))}
        ${kv('Зачислено на баланс как возврат', money(r.balance_refund_credits))}
        <p class="ad-hint">Отметка «Проверено» деньги не меняет: комментарий попадёт в историю заказа. Если суммы снова изменятся, заказ вернётся в этот список.</p>
        ${btns([
          { act: 'order', label: 'Открыть заказ', cls: 'rd-btn-ghost' },
          { act: 'done', label: 'Проверено, отметить' },
        ])}`,
      onOpen: (wrap, close) => bindActs(wrap, close, {
        order: () => { close(); openOrder(r.order_id); },
        done: async () => {
          const comment = await U().ask({
            title: 'Что проверили?', text: 'Например: «Сверил с выпиской, деньги пришли наличными».',
            fields: [{ name: 'comment', label: 'Комментарий', type: 'text' }], action: 'Отметить проверенным',
            validate: (v) => (v.comment ? '' : 'Напишите пару слов'),
          });
          if (comment === null) return;
          close();
          await AD.call(null, 'admin_recon_resolve', { p_order: r.order_id, p_comment: comment }, { ok: 'Отметили. Комментарий в истории заказа', after: () => list.reload() });
        },
      }),
    });
  }

  // ── Расход ──
  function expenseSheet(e) {
    U().sheet({
      title: esc(e.category || 'Расход'),
      html: `
        <div class="ad-head-sum">${money(e.amount)}</div>
        ${kv('Статья', esc(e.category || 'Без статьи'))}
        ${e.description ? kv('Описание', esc(e.description)) : ''}
        ${kv('Дата', esc(dayText(e.created_at)))}
        ${btns([{ act: 'del', label: 'Удалить расход', cls: 'rd-btn-ghost' }])}`,
      onOpen: (wrap, close) => bindActs(wrap, close, {
        del: async () => {
          const yes = await AD.confirmSheet('Удалить расход?', 'Он пропадёт из списка и отчёта. Копия останется в журнале действий.', 'Удалить', true);
          if (!yes) return;
          close();
          await AD.call(null, 'admin_expense_delete', { p_id: e.id }, { ok: 'Расход удалён', after: () => list.reload() });
        },
      }),
    });
  }

  // «31.10.2026» → '2026-10-31'; пусто → null; ошибка → false
  function parseDay(s) {
    const t = String(s || '').trim();
    if (!t) return null;
    const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!m) return false;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return false;
    return isoDay(d);
  }
  function isoDay(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const ruDay = (d) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function addExpense() {
    const chips = EXPENSE_CATS.map((c) => `<button type="button" class="rd-chip" data-cat="${esc(c)}" onclick="var f=this.closest('form').querySelector('input[name=category]');f.value=this.dataset.cat;f.dispatchEvent(new Event('input',{bubbles:true}))">${esc(c)}</button>`).join('');
    AD.formSheet({
      title: 'Новый расход',
      fields: [
        { name: 'amount', label: 'Сумма', decimal: true, placeholder: '0,00' },
        { name: 'category', label: 'Статья', placeholder: 'Например, реклама', hint: `<span class="rd-chips ad-cat-chips">${chips}</span>` },
        { name: 'description', label: 'Описание (необязательно)', placeholder: 'За что и кому' },
        { name: 'date', label: 'Дата', value: ruDay(new Date()), placeholder: 'ДД.ММ.ГГГГ', hint: 'Можно записать трату задним числом' },
      ],
      action: 'Записать расход',
      preview: (v) => (num(v.amount) > 0 ? { html: `Запишем <b>${money(num(v.amount))}</b>${v.category ? ` по статье «${esc(v.category)}»` : ''}` } : null),
      validate: (v) => {
        if (!(num(v.amount) > 0)) return 'Укажите сумму';
        if (num(v.amount) > 1000000) return 'Слишком большая сумма';
        if (!v.category) return 'Укажите статью или выберите из списка';
        const d = parseDay(v.date);
        if (d === false) return 'Дата в виде ДД.ММ.ГГГГ';
        if (d && d > isoDay(new Date())) return 'Дата не может быть в будущем';
        return '';
      },
      onSubmit: async (v, btn) => {
        const d = await AD.call(btn, 'admin_expense_add', {
          p_amount: num(v.amount), p_category: v.category, p_description: v.description || null, p_date: parseDay(v.date) || null,
        }, { ok: 'Расход записан', after: () => list.reload() });
        return !!d;
      },
    });
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) { /* ниже запасной способ */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) { return false; }
  }

  // ══ Отчёт за период ══
  const PERIODS = [['today', 'Сегодня'], ['d7', '7 дней'], ['d30', '30 дней'], ['month', 'Этот месяц'], ['prev', 'Прошлый месяц'], ['custom', 'Свой период']];
  const rep = { period: 'month', from: null, to: null, data: null, seq: 0 };

  function periodRange(k) {
    const now = new Date();
    const day = (y, m, d) => new Date(y, m, d);
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = day(y, m, now.getDate());
    const back = (n) => day(y, m, now.getDate() - n);
    switch (k) {
      case 'today': return [today, today];
      case 'd7': return [back(6), today];
      case 'd30': return [back(29), today];
      case 'prev': return [day(y, m - 1, 1), day(y, m, 0)];
      case 'custom': return rep.from && rep.to ? [rep.from, rep.to] : [day(y, m, 1), today];
      default: return [day(y, m, 1), today];
    }
  }

  function renderReport() {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Отчёт за период</h1><p class="rd-head-sub" id="adRepSub">Загружаем…</p></div>
        </div>
        <div class="rd-chips ad-chips" id="adRepChips">${PERIODS.map(([k, t]) => `<button type="button" class="rd-chip${rep.period === k ? ' on' : ''}" data-period="${k}">${t}</button>`).join('')}</div>
        <div id="adRepBody">${AD.loadingHtml(2)}</div>
      </div>`;
  }

  function attachReport() {
    const chips = document.getElementById('adRepChips');
    if (chips) {
      chips.querySelectorAll('[data-period]').forEach((b) => {
        b.onclick = async () => {
          haptic('light');
          if (b.dataset.period === 'custom') {
            const ok = await askCustom();
            if (!ok) return;
          }
          rep.period = b.dataset.period;
          chips.querySelectorAll('.rd-chip').forEach((x) => x.classList.toggle('on', x === b));
          loadReport();
        };
      });
    }
    loadReport();
  }

  async function askCustom() {
    const [f, t] = periodRange('custom');
    const v = await U().ask({
      title: 'Свой период', text: 'Даты включительно, в виде ДД.ММ.ГГГГ.',
      fields: [
        { name: 'from', label: 'С', type: 'text', value: ruDay(f), inputmode: 'numeric' },
        { name: 'to', label: 'По', type: 'text', value: ruDay(t), inputmode: 'numeric' },
      ],
      action: 'Показать',
      validate: (x) => {
        const a = parseDay(x.from);
        const b = parseDay(x.to);
        if (!a || !b) return 'Даты в виде ДД.ММ.ГГГГ';
        if (a > b) return 'Начало позже конца';
        return '';
      },
    });
    if (!v) return false;
    const toDate = (iso) => { const p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
    rep.from = toDate(parseDay(v.from));
    rep.to = toDate(parseDay(v.to));
    return true;
  }

  async function loadReport() {
    const body = document.getElementById('adRepBody');
    const sub = document.getElementById('adRepSub');
    if (!body) return;
    const [f, t] = periodRange(rep.period);
    const seq = ++rep.seq;
    body.innerHTML = AD.loadingHtml(2);
    if (sub) sub.textContent = f.getTime() === t.getTime() ? dayText(f) : `${ruDay(f)} — ${ruDay(t)}`;
    const { data, error } = await AD.rpc('admin_money_report', { p_from: isoDay(f), p_to: isoDay(t) });
    if (seq !== rep.seq || !document.getElementById('adRepBody')) return;
    if (error) { AD.showError(body, 'Не получилось собрать отчёт', AD.errorText(error, 'Проверьте интернет и обновите экран.'), loadReport); return; }
    rep.data = data || {};
    body.innerHTML = reportHtml(rep.data);
    const exp = document.getElementById('adRepExport');
    if (exp) exp.onclick = () => exportCsv(rep.data, f, t);
  }

  function reportHtml(d) {
    const o = d.orders || {};
    const mi = d.money_in || {};
    const bal = d.balance || {};
    const ref = d.refunds || {};
    const ex = d.expenses || {};
    const net = num(o.commission) - num(ex.total);
    const tile = (label, value, hint) => `<div class="rd-card ad-kpi"><div class="ad-kpi-label">${label}</div><div class="ad-kpi-value">${value}</div>${hint ? `<div class="ad-kpi-hint">${hint}</div>` : ''}</div>`;
    const methods = Object.entries(mi.methods || {}).sort((a, b) => num(b[1]) - num(a[1]))
      .map(([k, v]) => `<div class="ad-money-row small"><span>${esc(PAY_METHOD[k] || 'Другое')}</span><b>${money(v)}</b></div>`).join('');
    const cats = (ex.by_category || []).map((c) => `<div class="ad-money-row small"><span>${esc(c.category)} <em>${esc(c.count)}</em></span><b>${money(c.sum)}</b></div>`).join('');
    const empty = !num(o.count) && !num(mi.count) && !num(ex.count) && !num(ref.count);
    return `
      <div class="ad-kpis">
        ${tile('Оплаченных заказов', esc(num(o.count)), 'созданы в этот период')}
        ${tile('Оборот', money(o.turnover), 'сумма этих заказов')}
        ${tile('Комиссия сервиса', money(o.commission), 'по тем же заказам')}
        ${tile('Комиссия минус расходы', `${net < 0 ? '−' : ''}${money(Math.abs(net))}`, 'без курсовой разницы')}
      </div>
      ${empty ? `<div class="rd-card ad-pad ad-gap">${U().empty({ icon: 'calc', title: 'За этот период пусто', text: 'Ни заказов, ни платежей, ни расходов. Выберите другой период выше.' })}</div>` : ''}

      <div class="rd-section"><h2>Поступления</h2></div>
      <div class="rd-card ad-pad">
        ${kv('Всего получено', `${money(mi.total)} <em>${esc(num(mi.count))} ${plural(num(mi.count), 'платёж', 'платежа', 'платежей')}</em>`)}
        ${kv('Оплаты заказов', money(mi.orders))}
        ${kv('Пополнения баланса', `${money(mi.topup)} <em>${esc(num(mi.topup_count))}</em>`)}
        ${methods ? `<div class="ad-divider"></div>${methods}` : ''}
      </div>

      <div class="rd-section"><h2>Заказы</h2></div>
      <div class="rd-card ad-pad">
        ${kv('Оплачены', esc(num(o.count)))}
        ${kv('Оборот', money(o.turnover))}
        ${kv('Комиссия сервиса', money(o.commission))}
        ${kv('Пошлины', money(o.duties))}
        ${kv('Страховка', money(o.insurance))}
        ${kv('Отменены', esc(num(o.cancelled)))}
        ${kv('Созданы, но не оплачены', esc(num(o.unpaid)))}
      </div>

      <div class="rd-section"><h2>Баланс клиентов</h2></div>
      <div class="rd-card ad-pad">
        ${kv('Оплачено заказов с баланса', money(bal.used_for_orders))}
        ${kv('Начислено бонусов', money(bal.bonuses))}
        ${kv('Покупки за баланс', money(bal.purchases))}
        ${kv('Правки сотрудниками', `+${money(bal.adjust_plus)} / −${money(bal.adjust_minus)}`)}
      </div>

      <div class="rd-section"><h2>Ушло</h2></div>
      <div class="rd-card ad-pad">
        ${kv('Возвраты', `${money(ref.total)} <em>${esc(num(ref.count))}</em>`)}
        ${kv('Выплаты дропшипперам', money(d.payouts))}
        ${kv('Расходы', `${money(ex.total)} <em>${esc(num(ex.count))}</em>`)}
        ${cats ? `<div class="ad-divider"></div>${cats}` : ''}
      </div>

      <p class="ad-updated">Заказы и оборот считаются по дате создания заказа, деньги — по дате зачисления. Время — минское.</p>
      <button type="button" class="rd-btn rd-btn-ghost rd-btn-block ad-gap" id="adRepExport">${I('upload', 20)} Выгрузить таблицу</button>`;
  }

  // Таблица для Excel: точка с запятой, запятая в дробях. Без имён и контактов клиентов.
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function exportCsv(d, f, t) {
    if (!d) return;
    const o = d.orders || {};
    const mi = d.money_in || {};
    const ex = d.expenses || {};
    const st = (s) => (U().orderStatus ? U().orderStatus(s).text : s);
    const lines = [];
    lines.push(['Отчёт ICE LOGIX', `${ruDay(f)} — ${ruDay(t)}`].map(csvCell).join(';'));
    lines.push('');
    [['Оплаченных заказов', o.count], ['Оборот', fmt2(o.turnover)], ['Комиссия сервиса', fmt2(o.commission)], ['Пошлины', fmt2(o.duties)],
      ['Получено всего', fmt2(mi.total)], ['Пополнения баланса', fmt2(mi.topup)], ['Возвраты', fmt2((d.refunds || {}).total)],
      ['Выплаты дропшипперам', fmt2(d.payouts)], ['Расходы', fmt2(ex.total)]].forEach((r) => lines.push(r.map(csvCell).join(';')));
    lines.push('');
    lines.push(['Дата', 'Заказ', 'Статус', 'Сумма заказа', 'Комиссия', 'Пошлина', 'Оплачено', 'Возвращено'].join(';'));
    (d.rows || []).forEach((r) => lines.push([
      r.created_at ? ruDay(new Date(r.created_at)) : '', shortId(r.id), st(r.status),
      fmt2(r.total), fmt2(r.commission), fmt2(r.duty), fmt2(r.paid), fmt2(r.refunded),
    ].map(csvCell).join(';')));
    if ((ex.by_category || []).length) {
      lines.push('');
      lines.push(['Статья расходов', 'Сумма', 'Записей'].join(';'));
      ex.by_category.forEach((c) => lines.push([c.category, fmt2(c.sum), c.count].map(csvCell).join(';')));
    }
    saveCsv(lines.join('\r\n'), `icelogix-otchet-${isoDay(f)}-${isoDay(t)}.csv`);
  }

  // Внутри Telegram на телефоне обычное скачивание файла не работает: делимся файлом,
  // а если и это нельзя — копируем таблицу, её можно вставить в Заметки или Google Таблицы.
  async function saveCsv(text, name) {
    const tg = window.Telegram && window.Telegram.WebApp;
    const mobile = !!(tg && /^(ios|android)$/i.test(String(tg.platform || '')));
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    try {
      const file = new File([blob], name, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    if (mobile) {
      if (await copyText(text)) U().toast('Таблица скопирована: вставьте её в Заметки или Google Таблицы');
      else U().toast('Не получилось выгрузить таблицу', 'bad');
      return;
    }
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      U().toast('Таблица сохранена');
    } catch (_) {
      if (await copyText(text)) U().toast('Таблица скопирована');
      else U().toast('Не получилось выгрузить таблицу', 'bad');
    }
  }

  AD.screen('admin_money', {
    render: renderAdminMoney,
    attach: attachAdminMoney,
    save: list.save,
    restore: list.restore,
  });
  AD.screen('admin_money_report', {
    render: renderReport,
    attach: attachReport,
  });
})();
