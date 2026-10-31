// ============================================================
// ICE LOGIX · Админ-панель: Заказы (этап 2 ADMIN_PLAN.md)
// Список с поиском и этапами (вкладка admin_orders) и карточка заказа (admin_order).
// Заказ ведётся кнопками шагов, а не выбором статуса. Деньги и проверки — на сервере:
// admin_order_purchase, admin_order_weigh, admin_order_advance, admin_order_cancel и др.
// (миграция 20261031140000_admin_orders). Здесь только подсказки до нажатия, итог считает сервер.
// ============================================================
(function () {
  'use strict';

  const STAGES = [
    ['work', 'В работе'], ['paid', 'К выкупу'], ['awaiting_decision', 'Ждут решения'], ['bought', 'Выкуплены'],
    ['on_sklad_cn', 'На складе'], ['in_transit', 'В пути'], ['awaiting_payment', 'Ждут доплаты'], ['paid_second', 'Доплачены'],
    ['in_belarus', 'В Беларуси'], ['delivered', 'Получены'], ['unpaid', 'Не оплачены'], ['cancelled', 'Отменены'], ['archive', 'Архив'], ['all', 'Все'],
  ];
  const WORK_EXCLUDED = ['archive', 'unpaid', 'delivered', 'cancelled'];

  const STATUS = {
    pending: ['Не оплачен', 'warn'], paid: ['Оплачен, к выкупу', ''], awaiting_decision: ['Ждёт решения клиента', 'warn'],
    bought: ['Выкуплен', ''], on_sklad_cn: ['На складе в Китае', ''], in_transit: ['В пути', ''],
    awaiting_payment: ['Ждёт доплаты', 'warn'], paid_second: ['Доплачен', ''], in_belarus: ['В Беларуси', ''],
    delivered: ['Получен', 'ok'], cancelled: ['Отменён', 'bad'],
  };
  const STEPS = ['Оплачен', 'Выкуплен', 'Склад', 'В пути', 'Доплата', 'В Беларуси', 'Получен'];
  const STEP_INDEX = { pending: -1, paid: 0, awaiting_decision: 0, bought: 1, on_sklad_cn: 2, in_transit: 3, awaiting_payment: 4, paid_second: 4, in_belarus: 5, delivered: 6 };

  const EVENT_TEXT = {
    BALANCE_USED: 'Оплата с баланса', PAYMENT_RECEIVED: 'Платёж подтверждён', FIRST_PAYMENT_PAID: 'Первый платёж получен',
    SECOND_PAYMENT_PAID: 'Доплата получена', PURCHASE_RECORDED: 'Выкуп записан', PRICE_INCREASE_PROPOSED: 'Цена выросла, клиент решает',
    PRICE_INCREASE_ACCEPTED: 'Клиент согласился на новую цену', CANCELLED_PRICE_INCREASE: 'Клиент отказался, заказ отменён',
    WAREHOUSE_ARRIVED: 'Записаны вес и доставка', STATUS_CHANGED: 'Новый этап', STATUS_FORCED: 'Статус поправлен вручную',
    TRACKS_UPDATED: 'Обновлены трек-номера', SECOND_PAYMENT_CHANGED: 'Изменена сумма доплаты', CANCELLED_BY_OPERATOR: 'Заказ отменён',
    INSURANCE_REFUND: 'Выплата по страховке', PROBLEM_ORDER_RESOLVED: 'Расхождение закрыто',
  };
  const ACTOR_TEXT = { OPERATOR: 'Сотрудник', CLIENT: 'Клиент', SYSTEM: 'Система', WEBHOOK: 'Платёжная система' };
  const PAY_TYPE = { FIRST_PAYMENT: 'Первый платёж', SECOND_PAYMENT: 'Доплата', PRICE_ADJUSTMENT: 'Корректировка', TOPUP: 'Пополнение', OTHER: 'Платёж' };
  const PAY_METHOD = { manual: 'перевод', card: 'карта', card_token: 'привязанная карта', erip: 'ЕРИП', oplati: 'Оплати' };
  const PAY_STATUS = { PENDING: ['Ждёт проверки', 'warn'], CREATED: ['Создан', ''], PAID: ['Получен', 'ok'], DECLINED: ['Отклонён', 'bad'], FAILED: ['Ошибка', 'bad'], CANCELLED: ['Отменён', ''], EXPIRED: ['Истёк', ''], REQUIRES_REVIEW: ['Нужна проверка', 'warn'], REFUNDED: ['Возвращён', ''], PARTIALLY_REFUNDED: ['Возвращён частично', ''] };
  const RECEIVING = { SELF_PICKUP: 'Самовывоз', FORWARD_SHIPPING: 'Отправка клиенту' };

  const PAGE = 20;
  const list = { stage: 'work', search: '', rows: [], total: 0, counts: {}, timer: null, seq: 0 };
  let card = null;

  const U = () => window.UI;
  const esc = (s) => U().esc(s);
  const I = (name, size, opts) => U().icon(name, size, opts);
  const money = (v) => U().money(Number(v) || 0, { keepCents: true, digits: 2 });
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const fmt2 = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
  const cny = (v) => '¥' + fmt2(v);
  const shortId = (id) => String(id || '').slice(0, 8);
  const nick = (v) => String(v || '').replace(/^@+/, '');
  const dateTime = (ts) => (ts ? new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const daysSince = (ts) => (ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 86400000) : 0);
  const statusBadge = (st) => { const s = STATUS[st] || [st || 'Без статуса', '']; return `<span class="rd-status${s[1] ? ' ' + s[1] : ''}">${esc(s[0])}</span>`; };
  const fail = (error, text) => U().toast((error && error.message) || text || 'Не получилось', 'bad');
  const haptic = (kind) => { try { if (window.tgUtil && tgUtil.haptic) tgUtil.haptic(kind); } catch (_) {} };

  // ══ Список ══
  function openOrders(stage) {
    if (stage) list.stage = stage;
    list.search = '';
    switchTab('admin_orders');
  }

  function openOrder(id) {
    window._adminOrderId = id;
    switchTab('admin_order');
  }

  function chipsHtml() {
    const c = list.counts || {};
    const count = (k) => {
      if (k === 'all') return Object.values(c).reduce((a, b) => a + Number(b), 0);
      if (k === 'work') return Object.entries(c).reduce((a, [s, n]) => (WORK_EXCLUDED.includes(s) ? a : a + Number(n)), 0);
      return Number(c[k]) || 0;
    };
    return STAGES.map(([k, t]) => {
      const n = count(k);
      // пустые этапы не загромождают ряд, кроме основных
      if (!n && !['work', 'all', list.stage].includes(k)) return '';
      return `<button type="button" class="rd-chip${list.stage === k ? ' on' : ''}" data-stage="${k}">${t}${n ? ` · ${n}` : ''}</button>`;
    }).join('');
  }

  function orderRowHtml(r) {
    const days = daysSince(r.updated_at);
    const active = !['delivered', 'cancelled', 'pending'].includes(r.status) && !r.archived;
    const stuck = active && days > 7;
    const who = r.name || (nick(r.nick) ? '@' + nick(r.nick) : 'ID ' + r.user_id);
    const extra = Number(r.count) > 1 ? ` и ещё ${Number(r.count) - 1}` : '';
    return `
      <div class="ad-order" role="button" tabindex="0" data-order="${esc(r.id)}">
        <span class="ad-thumb">${/^https?:\/\//i.test(r.image || '') ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : I('box', 22)}</span>
        <span class="ad-order-body">
          <span class="ad-order-title">${esc(r.title || 'Заказ')}${esc(extra)}</span>
          <span class="ad-order-sub">${esc(who)}${r.toxic ? ' · <b class="ad-warn-text">сложный клиент</b>' : ''} · #${esc(shortId(r.id))}</span>
          <span class="ad-order-foot">
            ${statusBadge(r.status)}
            ${stuck ? `<span class="rd-status bad">${days} дн. без движения</span>` : ''}
            ${r.archived ? '<span class="rd-status">В архиве</span>' : ''}
          </span>
        </span>
        <span class="ad-order-sum">${money(r.total)}${Number(r.due) > 0 ? `<small>доплата ${money(r.due)}</small>` : ''}</span>
      </div>`;
  }

  function listBodyHtml() {
    if (!list.rows.length) {
      const text = list.search ? 'Проверьте номер, имя или трек и попробуйте ещё раз.' : 'На этом этапе заказов нет. Загляните в другие этапы выше.';
      return `<div class="rd-card">${U().empty({ icon: list.search ? 'search' : 'box', title: list.search ? 'Ничего не нашли' : 'Здесь пусто', text })}</div>`;
    }
    const more = list.rows.length < list.total
      ? `<button type="button" class="rd-btn rd-btn-ghost rd-btn-block ad-more" id="adOrdersMore">Показать ещё ${Math.min(PAGE, list.total - list.rows.length)}</button>` : '';
    return `<div class="rd-card rd-list ad-orders">${list.rows.map(orderRowHtml).join('')}</div>${more}`;
  }

  async function loadList(append) {
    const seq = ++list.seq;
    const { data, error } = await supabaseClient.rpc('admin_orders_list', {
      p_stage: list.stage, p_search: list.search || null, p_limit: PAGE, p_offset: append ? list.rows.length : 0,
    });
    if (seq !== list.seq || !document.getElementById('adOrdersBody')) return;
    if (error) {
      document.getElementById('adOrdersBody').innerHTML = `<div class="rd-card">${U().empty({ icon: 'alert', title: 'Не получилось загрузить', text: 'Проверьте интернет и обновите экран.', action: 'Обновить', actionId: 'adOrdersRetry' })}</div>`;
      const b = document.getElementById('adOrdersRetry');
      if (b) b.onclick = () => loadList(false);
      return;
    }
    const d = data || {};
    list.rows = append ? list.rows.concat(d.rows || []) : (d.rows || []);
    list.total = Number(d.total) || 0;
    list.counts = d.counts || {};
    paintList();
  }

  function paintList() {
    const chips = document.getElementById('adOrdersChips');
    const body = document.getElementById('adOrdersBody');
    if (!chips || !body) return;
    chips.innerHTML = chipsHtml();
    body.innerHTML = listBodyHtml();
    chips.querySelectorAll('[data-stage]').forEach((b) => {
      b.onclick = () => {
        if (list.stage === b.dataset.stage) return;
        haptic('light');
        list.stage = b.dataset.stage;
        chips.querySelectorAll('.rd-chip').forEach((x) => x.classList.toggle('on', x === b));
        body.innerHTML = '<div class="rd-card ad-skel rd-shimmer"></div>';
        loadList(false);
      };
    });
    body.querySelectorAll('[data-order]').forEach((row) => { row.onclick = () => openOrder(row.dataset.order); });
    const more = document.getElementById('adOrdersMore');
    if (more) more.onclick = () => { more.disabled = true; loadList(true); };
  }

  async function renderAdminOrders() {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Заказы</h1><p class="rd-head-sub">Выкуп, склад, доставка и деньги</p></div>
        </div>
        <div class="rd-field">${I('search', 20)}<input type="search" id="adOrdersSearch" placeholder="Номер, имя, @ник, трек или товар" autocomplete="off" enterkeyhint="search" value="${esc(list.search)}"></div>
        <div class="rd-chips ad-chips" id="adOrdersChips">${chipsHtml()}</div>
        <div id="adOrdersBody"><div class="rd-card ad-skel rd-shimmer"></div></div>
      </div>`;
  }

  function attachAdminOrdersHandlers() {
    const input = document.getElementById('adOrdersSearch');
    if (input) {
      input.oninput = () => {
        clearTimeout(list.timer);
        list.timer = setTimeout(() => {
          list.search = input.value.trim();
          // при поиске смотрим все этапы, иначе заказ из архива не найдётся
          if (list.search && list.stage === 'work') list.stage = 'all';
          loadList(false);
        }, 300);
      };
    }
    loadList(false);
  }

  // ══ Карточка ══
  async function renderAdminOrder() {
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Заказ #${esc(shortId(window._adminOrderId))}</h1><p class="rd-head-sub" id="adOrderSub">Загружаем…</p></div>
          <button type="button" class="rd-back" id="adOrderRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        <div id="adOrderBody"><div class="rd-card ad-skel rd-shimmer"></div></div>
      </div>`;
  }

  function attachAdminOrderHandlers() {
    const b = document.getElementById('adOrderRefresh');
    if (b) b.onclick = () => { haptic('light'); loadCard(); };
    loadCard();
  }

  async function loadCard() {
    const id = window._adminOrderId;
    const { data, error } = await supabaseClient.rpc('admin_order_card', { p_order: id });
    const body = document.getElementById('adOrderBody');
    if (!body || id !== window._adminOrderId) return;
    if (error) {
      body.innerHTML = `<div class="rd-card">${U().empty({ icon: 'alert', title: 'Не получилось открыть заказ', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Обновить', actionId: 'adOrderRetry' })}</div>`;
      const r = document.getElementById('adOrderRetry');
      if (r) r.onclick = loadCard;
      return;
    }
    card = data;
    const sub = document.getElementById('adOrderSub');
    if (sub) sub.textContent = `Оформлен ${dateTime(card.order.created_at)}`;
    body.innerHTML = cardHtml();
    bindCard();
  }

  // Следующий шаг заказа: главная кнопка внизу экрана
  function nextStep(o) {
    const weighed = (card.shipping || []).length > 0;
    switch (o.status) {
      case 'paid': return { label: 'Записать выкуп', run: purchaseSheet };
      case 'bought': return { label: 'Товар на складе в Китае', run: () => advanceSheet('on_sklad_cn') };
      case 'on_sklad_cn': return { label: 'Отправлен в Беларусь', run: () => advanceSheet('in_transit') };
      case 'in_transit': return weighed ? { label: 'Прибыл в Беларусь', run: () => advanceSheet('in_belarus') } : { label: 'Записать вес и доставку', run: weighSheet };
      case 'paid_second': return { label: 'Прибыл в Беларусь', run: () => advanceSheet('in_belarus') };
      case 'in_belarus': return { label: 'Клиент получил заказ', run: () => advanceSheet('delivered') };
      default: return null;
    }
  }

  function noticesHtml(o) {
    const out = [];
    const note = (tone, icon, title, text) => out.push(`<div class="ad-note ${tone}">${I(icon, 18)}<div><b>${title}</b>${text ? `<p>${text}</p>` : ''}</div></div>`);
    if (o.status === 'pending') note('warn', 'clock', 'Клиент ещё не оплатил', 'Выкупать рано. Заказ перейдёт к выкупу сам, когда платёж будет подтверждён.');
    if (o.status === 'awaiting_decision') note('warn', 'help', 'Ждём решения клиента', `Товар подорожал на ${money(o.additional_payment_required)}. Клиент согласится или отменит заказ, деньги вернутся сами.`);
    if (o.status === 'awaiting_payment') note('warn', 'receipt', `Ждём доплату ${money(o.amount_due)}`, 'Клиенту пришло уведомление, оплата в приложении. После оплаты заказ перейдёт дальше сам.');
    const flags = Array.isArray(o.flags) ? o.flags : [];
    if (o.status === 'paid' && flags.includes('client_priced')) note('warn', 'calc', 'Сверьте цену перед выкупом', 'Сумму посчитало приложение клиента. Сравните её с ценой на площадке.');
    const est = Number(o.weight_estimated) || 0;
    const act = Number(o.weight_actual) || 0;
    if (act && est && act - est > Math.max(0.3, est * 0.2)) note('bad', 'alert', 'Вес больше расчётного', `Ожидали ${est} кг, по факту ${act} кг. Проверьте, всё ли верно.`);
    if (card.user && card.user.toxic) note('bad', 'alert', 'Сложный клиент', 'Клиент отмечен как сложный. Общайтесь внимательнее и сохраняйте подтверждения.');
    return out.join('');
  }

  function stepsHtml(o) {
    if (o.status === 'cancelled') return '';
    const idx = STEP_INDEX[o.status];
    return `<div class="ad-steps" aria-label="Этап заказа">${STEPS.map((s, i) => `<span class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><b>${i < idx ? I('check', 12, { stroke: 3 }) : ''}</b>${s}</span>`).join('')}</div>`;
  }

  function itemsHtml(o) {
    const items = Array.isArray(o.items) && o.items.length ? o.items : (Array.isArray(o.cart_items) ? o.cart_items : []);
    if (!items.length) {
      return `<div class="rd-card ad-pad"><div class="ad-item-title">${esc(U().orderTitle(o))}</div>${/^https?:\/\//i.test(o.source_url || '') ? `<a class="rd-link" href="${esc(o.source_url)}" target="_blank" rel="noopener">Открыть на площадке ${I('external', 14)}</a>` : ''}</div>`;
    }
    return `<div class="rd-card rd-list">${items.map((it) => {
      const img = it.image_url || it.imageUrl || it.image || '';
      const url = it.url || o.source_url || '';
      const opts = [it.size, it.color, it.variant].filter(Boolean).map(esc).join(' · ');
      const qty = Number(it.quantity) || 1;
      const cur = String(it.currency || o.product_currency || '').toUpperCase();
      const price = Number(it.price) ? (cur === 'CNY' ? cny(it.price) : money(it.price)) : '';
      return `<div class="ad-item">
        <span class="ad-thumb">${/^https?:\/\//i.test(img) ? `<img src="${esc(img)}" alt="" loading="lazy">` : I('box', 22)}</span>
        <span class="ad-item-body">
          <span class="ad-item-title">${esc(it.title || it.name || 'Товар')}</span>
          <span class="ad-item-sub">${opts ? opts + ' · ' : ''}${qty} шт.${price ? ' · ' + price : ''}</span>
          ${/^https?:\/\//i.test(url) ? `<a class="rd-link" href="${esc(url)}" target="_blank" rel="noopener">Открыть на площадке ${I('external', 14)}</a>` : ''}
        </span>
      </div>`;
    }).join('')}</div>`;
  }

  function clientHtml() {
    const u = card.user;
    if (!u) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Профиль клиента не найден.</p></div>`;
    const name = u.name || (nick(u.nick) ? '@' + nick(u.nick) : 'ID ' + u.user_id);
    const bits = [nick(u.nick) ? '@' + esc(nick(u.nick)) : '', u.phone ? esc(u.phone) : '', `заказов: ${Number(u.orders) || 0}`, `баланс ${money(u.balance)}`].filter(Boolean).join(' · ');
    return `<div class="rd-card rd-list">
      <div class="rd-row ad-static">
        <span class="ad-ava" aria-hidden="true">${esc((name.replace('@', '').trim().charAt(0) || '?').toUpperCase())}</span>
        <span class="rd-row-body"><span class="rd-row-title">${esc(name)}${u.trusted ? '<span class="rd-badge">Проверенный</span>' : ''}</span><span class="rd-row-text">${bits}</span></span>
      </div>
      ${nick(u.nick) ? `<a class="rd-row ad-rowlink" href="https://t.me/${esc(nick(u.nick))}" target="_blank" rel="noopener"><span class="rd-ico">${I('send', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Написать в Telegram</span></span>${I('external', 18, { cls: 'rd-chev' })}</a>` : ''}
    </div>`;
  }

  function moneyHtml(o) {
    const firstPaid = !!o.first_payment_paid;
    const secondKnown = (card.shipping || []).length > 0 || !!o.second_payment_paid;
    const row = (label, value, tag, tone) => `<div class="ad-money-row"><span>${label}${tag ? ` <em class="${tone || ''}">${tag}</em>` : ''}</span><b>${value}</b></div>`;
    const snap = o.first_payment_snapshot && typeof o.first_payment_snapshot === 'object' ? o.first_payment_snapshot : null;
    const second = o.second_payment_snapshot && typeof o.second_payment_snapshot === 'object' ? o.second_payment_snapshot : null;
    const line = (label, v) => (Number(v) ? `<div class="ad-money-row small"><span>${label}</span><b>${money(v)}</b></div>` : '');
    const parts = snap ? [
      line('Товар', snap.product_cost_byn), line('Комиссия сервиса', snap.commission_byn), line('Упаковка', snap.packaging_cost_byn),
      line('Доставка по расчёту', snap.delivery_cost_byn), line('из неё резерв в первом платеже', snap.delivery_reserve_byn), line('Страховка', snap.insurance_byn),
      line('Пошлина', snap.customs_duty_byn), line('Буфер курса', snap.currency_buffer_byn), line('Доставка по Беларуси', snap.local_delivery_byn),
    ].join('') : '';
    const secondParts = second ? [
      line('Доставка по факту', second.delivery), line('Минус резерв', second.reserve), line('Страховка', second.insurance),
      line('Минск → Несвиж', second.local), line('Услуги склада', second.extra), line('Подорожание товара', second.price_diff),
      line('Вернулось на баланс', second.surplus),
    ].join('') : '';
    const refunds = Number(o.total_refunded) || 0;
    return `<div class="rd-card ad-pad">
      ${row('Сумма заказа', money(o.total_byn))}
      ${row('1-й этап', money(o.first_payment_amount || o.prepayment_amount), firstPaid ? 'оплачен' : 'не оплачен', firstPaid ? 'ok' : 'warn')}
      ${row('2-й этап', (secondKnown ? '' : '≈ ') + money(o.second_payment_amount), o.second_payment_paid ? 'оплачен' : (Number(o.amount_due) > 0 && o.status === 'awaiting_payment' ? 'к оплате' : 'после взвешивания'), o.second_payment_paid ? 'ok' : (o.status === 'awaiting_payment' ? 'warn' : ''))}
      <div class="ad-divider"></div>
      ${row('Оплачено', money(o.total_paid))}
      ${Number(o.balance_used) ? row('из них с баланса', money(o.balance_used)) : ''}
      ${refunds ? row('Вернули клиенту', money(refunds)) : ''}
      ${Number(o.amount_due) > 0 ? row('Осталось доплатить', money(o.amount_due)) : ''}
      ${parts ? `<details class="ad-details"><summary>Из чего сложился первый платёж ${I('chevD', 16)}</summary>${parts}</details>` : ''}
      ${secondParts ? `<details class="ad-details"><summary>Из чего сложилась доплата ${I('chevD', 16)}</summary>${secondParts}</details>` : ''}
    </div>`;
  }

  function paymentsHtml() {
    const pays = card.payments || [];
    if (!pays.length) return '';
    return `<div class="rd-section"><h2>Платежи</h2></div>
      <div class="rd-card rd-list">${pays.map((p) => {
        const st = PAY_STATUS[p.status] || [p.status, ''];
        const canDecide = p.status === 'PENDING' && p.method === 'manual';
        return `<div class="ad-pay">
          <div class="ad-pay-top"><span><b>${esc(PAY_TYPE[p.type] || 'Платёж')}</b> · ${money(p.amount)}</span><span class="rd-status${st[1] ? ' ' + st[1] : ''}">${esc(st[0])}</span></div>
          <div class="ad-pay-sub">${esc(PAY_METHOD[p.method] || p.method)} · ${esc(dateTime(p.paid_at || p.created_at))}</div>
          ${canDecide ? `<div class="ad-pay-btns"><button type="button" class="rd-btn rd-btn-sm" data-pay-ok="${esc(p.id)}">Деньги пришли</button><button type="button" class="rd-btn rd-btn-sm rd-btn-ghost" data-pay-no="${esc(p.id)}">Оплаты нет</button></div>` : ''}
        </div>`;
      }).join('')}</div>`;
  }

  function address(o) {
    const extra = o.extra_services || {};
    if (extra.receiving_address) return extra.receiving_address;
    return /[ А-Яа-яЁё|]/.test(o.tracking_number_by || '') ? o.tracking_number_by : '';
  }

  function deliveryHtml(o) {
    const addr = address(o);
    const byTrack = o.tracking_number_by && o.tracking_number_by !== addr ? o.tracking_number_by : '';
    const row = (label, value) => (value ? `<div class="ad-money-row"><span>${label}</span><b class="ad-select">${esc(value)}</b></div>` : '');
    const purchase = (card.purchases || []).find((p) => p.status === 'BOUGHT' || p.status === 'PURCHASED');
    const ship = (card.shipping || [])[0];
    const est = Number(o.weight_estimated) || 0;
    return `<div class="rd-card ad-pad">
      ${row('Получение', RECEIVING[o.selected_receiving_method] || '')}
      ${row('Адрес', addr)}
      ${purchase ? row('Заказ на площадке', purchase.platform_order) : ''}
      ${purchase ? row('Выкуплен за', `${cny(purchase.price_cny)}${Number(purchase.fee_cny) ? ' + сбор ' + cny(purchase.fee_cny) : ''}`) : ''}
      ${row('Вес', ship ? `${ship.weight} кг, по расчёту ${est} кг` : `${est} кг по расчёту`)}
      ${ship ? `<div class="ad-money-row"><span>Доставка по факту</span><b>${money(ship.delivery)}</b></div>` : ''}
      ${row('Трек в Китае', o.tracking_number_cn)}
      ${row('Международный трек', o.tracking_number_intl)}
      ${row('Трек по Беларуси', byTrack)}
    </div>`;
  }

  function eventDetail(e) {
    const v = e.value || {};
    const bits = [];
    if (e.type === 'STATUS_CHANGED' || e.type === 'STATUS_FORCED') { const s = STATUS[v.to]; bits.push(s ? s[0] : v.to); }
    if (v.track) bits.push('трек ' + v.track);
    if (e.type === 'PURCHASE_RECORDED' || e.type === 'PRICE_INCREASE_PROPOSED') {
      if (v.price_cny) bits.push(cny(v.price_cny));
      if (Number(v.percent)) bits.push((v.percent > 0 ? '+' : '') + String(v.percent).replace('.', ',') + '%');
    }
    if (e.type === 'WAREHOUSE_ARRIVED') { bits.push(`${v.weight} кг`); bits.push('доплата ' + fmt2(v.second)); }
    if (v.amount) bits.push(fmt2(v.amount));
    if (v.refund) bits.push('возврат ' + fmt2(v.refund));
    if (e.type === 'SECOND_PAYMENT_CHANGED') bits.push(`${fmt2(v.from)} → ${fmt2(v.to)}`);
    return bits;
  }

  function historyHtml() {
    const ev = card.events || [];
    if (!ev.length) return `<div class="rd-card ad-pad"><p class="rd-sub" style="margin:0">Событий пока нет.</p></div>`;
    return `<div class="rd-card ad-pad ad-timeline">${ev.map((e) => `
      <div class="ad-ev">
        <i aria-hidden="true"></i>
        <div>
          <b>${esc(EVENT_TEXT[e.type] || 'Событие')}</b>
          ${eventDetail(e).length ? `<p>${esc(eventDetail(e).join(' · '))}</p>` : ''}
          ${e.comment ? `<p>${esc(e.comment)}</p>` : ''}
          <small>${esc(ACTOR_TEXT[e.actor] || '')}${e.actor ? ' · ' : ''}${esc(dateTime(e.at))}</small>
        </div>
      </div>`).join('')}</div>`;
  }

  function actionsHtml(o) {
    const rows = [];
    const add = (id, icon, title, text) => rows.push(`<div class="rd-row" role="button" tabindex="0" data-act="${id}"><span class="rd-ico">${I(icon, 22)}</span><span class="rd-row-body"><span class="rd-row-title">${title}</span>${text ? `<span class="rd-row-text">${text}</span>` : ''}</span>${I('chevR', 22, { cls: 'rd-chev' })}</div>`);
    const weighed = (card.shipping || []).length > 0;
    if (['bought', 'on_sklad_cn'].includes(o.status) && !weighed) add('weigh', 'scan', 'Записать вес и доставку сейчас', 'Если посылку взвесили раньше отправки');
    if (o.status === 'awaiting_payment') add('due', 'pencil', 'Поправить сумму доплаты', 'Если ошиблись в весе или доставке');
    if (o.status === 'paid_second') add('transit', 'plane', 'Отметить: в пути', 'Если посылка ещё не выехала');
    add('chat', 'message', 'Чат с клиентом', Number(card.messages) ? `Сообщений: ${Number(card.messages)}` : 'Сообщений пока нет');
    add('tracks', 'truck', 'Трек-номера', 'Китай, международный, по Беларуси');
    add('manifest', 'receipt', 'Накладная', 'Файл для печати');
    add('legal', 'text', 'Шаблон ответа на претензию', 'Черновик, проверьте перед отправкой');
    if (!['cancelled', 'delivered'].includes(o.status)) add('cancel', 'x', 'Отменить заказ', 'Деньги вернутся клиенту на баланс');
    add('archive', 'box', o.archived_at ? 'Вернуть из архива' : 'Убрать в архив', o.archived_at ? '' : 'Завершённые и неоплаченные заказы');
    if (card.me && card.me.owner) add('force', 'sliders', 'Поправить статус вручную', 'Только для ошибок. Деньги не двигает');
    return `<div class="rd-card rd-list">${rows.join('')}</div>`;
  }

  function cardHtml() {
    const o = card.order;
    const next = nextStep(o);
    return `
      <div class="ad-order-head">
        ${statusBadge(o.status)}
        ${o.archived_at ? '<span class="rd-status">В архиве</span>' : ''}
        <span class="ad-order-total">${money(o.total_byn)}</span>
      </div>
      ${stepsHtml(o)}
      ${noticesHtml(o)}
      <div class="rd-section"><h2>Товары</h2></div>
      ${itemsHtml(o)}
      <div class="rd-section"><h2>Клиент</h2></div>
      ${clientHtml()}
      <div class="rd-section"><h2>Деньги</h2></div>
      ${moneyHtml(o)}
      ${paymentsHtml()}
      <div class="rd-section"><h2>Доставка</h2></div>
      ${deliveryHtml(o)}
      <div class="rd-section"><h2>Действия</h2></div>
      ${actionsHtml(o)}
      <div class="rd-section"><h2>История</h2></div>
      ${historyHtml()}
      ${next ? '<div class="ad-cta-space"></div>' : ''}`;
  }

  function bindCard() {
    const body = document.getElementById('adOrderBody');
    if (!body) return;
    const o = card.order;
    mountCta(nextStep(o));
    body.querySelectorAll('[data-act]').forEach((row) => { row.onclick = () => runAction(row.dataset.act); });
    body.querySelectorAll('[data-pay-ok]').forEach((b) => { b.onclick = () => confirmPayment(b.dataset.payOk); });
    body.querySelectorAll('[data-pay-no]').forEach((b) => { b.onclick = () => rejectPayment(b.dataset.payNo); });
  }

  // Кнопка следующего шага живёт в body: внутри экрана position: fixed ломается анимацией появления.
  // Убирается сама, как только карточка исчезла с экрана.
  let ctaWatch = null;
  function mountCta(next) {
    const old = document.getElementById('adNextCta');
    if (old) old.remove();
    if (ctaWatch) { ctaWatch.disconnect(); ctaWatch = null; }
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
      if (document.getElementById('adOrderBody')) return;
      el.remove();
      ctaWatch.disconnect();
      ctaWatch = null;
    });
    ctaWatch.observe(host, { childList: true, subtree: false });
  }

  function runAction(id) {
    const o = card.order;
    switch (id) {
      case 'weigh': return weighSheet();
      case 'due': return dueSheet();
      case 'transit': return advanceSheet('in_transit');
      case 'chat':
        if (typeof window.openSupportChat === 'function') return window.openSupportChat(o.id, true);
        return U().toast('Чат сейчас недоступен', 'bad');
      case 'tracks': return tracksSheet();
      case 'manifest':
        if (typeof window.generateShippingManifest === 'function') return window.generateShippingManifest(o.id);
        return U().toast('Накладная сейчас недоступна', 'bad');
      case 'legal': return legalSheet();
      case 'cancel': return cancelSheet();
      case 'archive': return archiveOrder();
      case 'force': return forceSheet();
      default: return null;
    }
  }

  // Общий вызов шага: блокирует кнопку, показывает ошибку сервера, обновляет карточку
  async function call(btn, rpc, args, okText) {
    if (btn) btn.disabled = true;
    const { data, error } = await supabaseClient.rpc(rpc, args);
    if (error) {
      if (btn) btn.disabled = false;
      haptic('error');
      fail(error);
      return null;
    }
    haptic('success');
    const text = typeof okText === 'function' ? okText(data) : okText;
    if (text) U().toast(text);
    await loadCard();
    return data || {};
  }

  // Шторка с полями и живой подсказкой; поля описаны как в UI.ask
  function formSheet(o) {
    const opt = o || {};
    U().sheet({
      title: opt.title,
      html: `<form class="rd-ask ad-form" novalidate>
        ${opt.text ? `<p class="rd-ask-text">${opt.text}</p>` : ''}
        ${(opt.fields || []).map((f) => `
          <label class="rd-ask-field">
            <span class="rd-label">${esc(f.label)}</span>
            <span class="rd-field"><input name="${f.name}" type="text" ${f.decimal ? 'inputmode="decimal"' : ''} autocomplete="off" value="${esc(f.value == null ? '' : f.value)}" placeholder="${esc(f.placeholder || '')}"></span>
            ${f.hint ? `<span class="ad-hint">${f.hint}</span>` : ''}
          </label>`).join('')}
        ${opt.extraHtml || ''}
        <div class="ad-preview" data-preview hidden></div>
        <p class="rd-ask-err" hidden></p>
        <button type="submit" class="rd-btn rd-btn-block${opt.danger ? ' rd-btn-danger' : ''}" data-submit>${esc(opt.action || 'Сохранить')}</button>
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
          if (!opt.preview) return;
          const r = opt.preview(values());
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
          const msg = opt.validate ? opt.validate(v) : '';
          if (msg) { err.textContent = msg; err.hidden = false; return; }
          err.hidden = true;
          const done = await opt.onSubmit(v, submit);
          if (done) close();
        });
      },
    });
  }

  // ── Выкуп ──
  function purchaseSheet() {
    const o = card.order;
    const cfg = card.config || {};
    const threshold = Number(cfg.threshold) || 3;
    const rate = Number(o.calculated_exchange_rate) || Number(o.cny_rate) || 0;
    const plan = Number(o.price_cny) || 0;
    const compare = String(o.product_currency || '').toUpperCase() === 'CNY' && plan > 0 && rate > 0;
    const rule = cfg.duoduo && typeof cfg.duoduo === 'object' ? cfg.duoduo : { percent: 3, min_cny: 2 };
    const feeOf = (p) => Math.round(Math.max(Number(rule.min_cny) || 0, p * (Number(rule.percent) || 0) / 100) * 100) / 100;
    formSheet({
      title: 'Записать выкуп',
      text: compare
        ? `В заказе ${cny(plan)}, курс ${String(rate).replace('.', ',')}. Сравним с ценой выкупа и пересчитаем сумму клиента.`
        : 'Цена для клиента зафиксирована при оформлении: доплаты и возврата не будет. Запишите, сколько заплатили.',
      fields: [
        { name: 'platform', label: 'Номер заказа на площадке', placeholder: 'Например, 260431-123456' },
        { name: 'price', label: 'Сколько заплатили за товар, ¥', decimal: true, value: compare ? fmt2(plan) : '', placeholder: '0,00' },
      ],
      extraHtml: `<label class="ad-check"><input type="checkbox" name="fee" checked><span>Сбор DuoDuo Pay (${Number(rule.percent) || 0}%, минимум ¥${Number(rule.min_cny) || 0}). Это наш расход, клиенту не добавляется</span></label>`,
      action: 'Записать выкуп',
      preview: (v) => {
        const p = num(v.price);
        if (!p) return null;
        const fee = v.fee ? feeOf(p) : 0;
        const head = `<div class="ad-money-row small"><span>Наш расход</span><b>${cny(p + fee)}</b></div>`;
        if (!compare) return { html: head, action: 'Записать выкуп' };
        const pct = (p - plan) / plan * 100;
        const diff = Math.round((p - plan) * rate * 100) / 100;
        const pctText = `${pct > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`;
        if (pct > threshold) return { tone: 'bad', action: 'Спросить клиента', html: `${head}<p><b>Подорожание ${pctText}, выше порога ${threshold}%.</b> Не выкупайте: клиент решит, согласен ли доплатить ${money(diff)}. Если откажется, деньги вернутся ему сами.</p>` };
        if (diff > 0) return { tone: 'warn', action: 'Записать выкуп', html: `${head}<p><b>Подорожание ${pctText}.</b> ${money(diff)} добавятся ко второму платежу клиента.</p>` };
        if (diff < 0) return { tone: 'ok', action: 'Записать выкуп', html: `${head}<p><b>Дешевле на ${pctText.replace('-', '')}.</b> ${money(Math.abs(diff))} сразу вернутся клиенту на баланс.</p>` };
        return { action: 'Записать выкуп', html: `${head}<p>Цена совпадает с заказом.</p>` };
      },
      validate: (v) => {
        const p = num(v.price);
        if (p <= 0) return 'Укажите цену выкупа';
        const over = compare && (p - plan) / plan * 100 > threshold;
        if (!over && !v.platform) return 'Укажите номер заказа на площадке';
        return '';
      },
      onSubmit: async (v, btn) => {
        const p = num(v.price);
        const data = await call(btn, 'admin_order_purchase', {
          p_order: o.id, p_platform_order: v.platform || '', p_price_cny: p, p_fee_cny: v.fee ? feeOf(p) : 0, p_comment: null,
        }, (d) => (d.result === 'decision' ? 'Клиенту ушёл вопрос о новой цене' : d.result === 'bought_refund' ? 'Выкуп записан, разница вернулась клиенту' : d.result === 'bought_extra' ? 'Выкуп записан, разница добавлена к доплате' : 'Выкуп записан'));
        return !!data;
      },
    });
  }

  // ── Вес и доставка ──
  function weighSheet() {
    const o = card.order;
    const cfg = card.config || {};
    const reserve = Number(o.delivery_reserve_amount) || 0;
    const insRate = o.insurance_enabled ? (Number(cfg.insurance_rate) || 0) : 0;
    const carried = Number(o.amount_due) || 0;
    const est = Number(o.weight_estimated) || 0;
    const estDelivery = Number(o.estimated_delivery_amount) || Number(o.delivery_cost_estimated) || 0;
    formSheet({
      title: 'Вес и доставка',
      text: `Запишите данные со склада. По расчёту было ${est} кг и доставка ${money(estDelivery)}.`,
      fields: [
        { name: 'weight', label: 'Фактический вес, кг', decimal: true, placeholder: '0,00' },
        { name: 'delivery', label: 'Стоимость доставки по факту', decimal: true, placeholder: '0,00' },
        { name: 'local', label: 'Доля Минск → Несвиж', decimal: true, placeholder: '0,00' },
        { name: 'extra', label: 'Услуги склада', decimal: true, placeholder: '0,00' },
      ],
      action: 'Выставить доплату',
      preview: (v) => {
        const d = num(v.delivery);
        if (!d) return null;
        const remainder = Math.max(d - reserve, 0);
        const surplus = Math.max(reserve - d, 0);
        const ins = Math.round(d * insRate * 100) / 100;
        const total = Math.round((remainder + ins + num(v.local) + num(v.extra) + carried) * 100) / 100;
        const r = (l, x) => (x ? `<div class="ad-money-row small"><span>${l}</span><b>${money(x)}</b></div>` : '');
        const w = num(v.weight);
        const heavy = w && est && w - est > Math.max(0.3, est * 0.2);
        return {
          tone: heavy ? 'warn' : '',
          action: total > 0 ? `Выставить доплату ${fmt2(total)}` : 'Записать без доплаты',
          html: `${r('Доставка сверх резерва', remainder)}${r('Страховка', ins)}${r('Минск → Несвиж', num(v.local))}${r('Услуги склада', num(v.extra))}${r('Подорожание товара', carried)}
            <div class="ad-money-row"><span>Клиент доплатит</span><b>${money(total)}</b></div>
            ${surplus ? `<p>Резерв больше факта: ${money(surplus)} вернутся на баланс клиента.</p>` : ''}
            ${heavy ? `<p><b>Вес заметно больше расчётного.</b> Проверьте, не ошиблись ли, и не пропало ли что-то из посылки.</p>` : ''}
            <p>Исправить вес потом нельзя, только сумму доплаты.</p>`,
        };
      },
      validate: (v) => (num(v.weight) <= 0 ? 'Укажите вес' : num(v.delivery) <= 0 ? 'Укажите стоимость доставки' : ''),
      onSubmit: async (v, btn) => {
        const data = await call(btn, 'admin_order_weigh', {
          p_order: o.id, p_weight: num(v.weight), p_delivery: num(v.delivery), p_local: num(v.local), p_extra: num(v.extra), p_comment: null,
        }, (d) => (Number(d.second) > 0 ? `Клиенту выставлена доплата ${fmt2(d.second)}` : 'Записано, доплата не нужна'));
        return !!data;
      },
    });
  }

  // ── Простые шаги ──
  function advanceSheet(to) {
    const o = card.order;
    const META = {
      on_sklad_cn: { title: 'Товар на складе в Китае', text: 'Клиенту придёт уведомление.', track: 'Трек продавца до склада (необязательно)', value: o.tracking_number_cn, action: 'Подтвердить' },
      in_transit: { title: 'Отправлен в Беларусь', text: 'Клиенту придёт уведомление с новым этапом.', track: 'Международный трек (необязательно)', value: o.tracking_number_intl, action: 'Подтвердить отправку' },
      in_belarus: { title: 'Прибыл в Беларусь', text: 'Посылка на складе в Беларуси. Клиенту придёт уведомление.', action: 'Подтвердить' },
      delivered: { title: 'Клиент получил заказ', text: 'Заказ завершится, клиент сможет оставить отзыв. Отменить этот шаг сможет только владелец.', action: 'Заказ получен' },
    }[to];
    formSheet({
      title: META.title,
      text: META.text,
      fields: META.track ? [{ name: 'track', label: META.track, value: META.value || '', placeholder: 'Номер отправления' }] : [],
      action: META.action,
      onSubmit: async (v, btn) => !!(await call(btn, 'admin_order_advance', { p_order: o.id, p_to: to, p_track: v.track || null, p_comment: null }, 'Этап обновлён')),
    });
  }

  function tracksSheet() {
    const o = card.order;
    const addr = address(o);
    formSheet({
      title: 'Трек-номера',
      fields: [
        { name: 'cn', label: 'В Китае', value: o.tracking_number_cn || '' },
        { name: 'intl', label: 'Международный', value: o.tracking_number_intl || '' },
        { name: 'by', label: 'По Беларуси', value: o.tracking_number_by && o.tracking_number_by !== addr ? o.tracking_number_by : '' },
      ],
      action: 'Сохранить',
      onSubmit: async (v, btn) => !!(await call(btn, 'admin_order_set_tracks', { p_order: o.id, p_cn: v.cn, p_intl: v.intl, p_by: v.by }, 'Трек-номера сохранены')),
    });
  }

  function dueSheet() {
    const o = card.order;
    formSheet({
      title: 'Сумма доплаты',
      text: `Сейчас ${money(o.amount_due)}. Неоплаченная заявка клиента отменится, он увидит новую сумму.`,
      fields: [
        { name: 'amount', label: 'Новая сумма', decimal: true, value: fmt2(o.amount_due) },
        { name: 'reason', label: 'Причина', placeholder: 'Например, ошиблись в весе' },
      ],
      action: 'Сохранить',
      validate: (v) => (v.amount === '' ? 'Укажите сумму' : !v.reason ? 'Укажите причину' : ''),
      onSubmit: async (v, btn) => !!(await call(btn, 'admin_order_set_due', { p_order: o.id, p_amount: num(v.amount), p_reason: v.reason }, 'Сумма изменена')),
    });
  }

  function cancelSheet() {
    const o = card.order;
    const max = Math.max(Math.round(((Number(o.total_paid) || 0) - (Number(o.total_refunded) || 0)) * 100) / 100, 0);
    formSheet({
      title: 'Отменить заказ',
      text: max > 0 ? `Клиент заплатил ${money(max)}. Вернуть можно всё или часть, например если товар уже выкуплен.` : 'Клиент ничего не платил, возвращать нечего.',
      fields: [
        { name: 'reason', label: 'Причина', placeholder: 'Например, товара нет в наличии' },
        ...(max > 0 ? [{ name: 'refund', label: 'Вернуть на баланс', decimal: true, value: fmt2(max) }] : []),
      ],
      action: 'Отменить заказ',
      danger: true,
      validate: (v) => (!v.reason ? 'Укажите причину' : (max > 0 && num(v.refund) > max ? `Вернуть можно не больше ${fmt2(max)}` : '')),
      onSubmit: async (v, btn) => !!(await call(btn, 'admin_order_cancel', { p_order: o.id, p_reason: v.reason, p_refund: max > 0 ? num(v.refund) : 0 },
        (d) => (Number(d.refund) > 0 ? `Заказ отменён, ${fmt2(d.refund)} на балансе клиента` : 'Заказ отменён'))),
    });
  }

  async function archiveOrder() {
    const o = card.order;
    await call(null, 'admin_order_archive', { p_order: o.id, p_archive: !o.archived_at }, o.archived_at ? 'Заказ возвращён из архива' : 'Заказ в архиве');
  }

  function forceSheet() {
    const o = card.order;
    const I2 = Object.entries(STATUS).filter(([k]) => k !== o.status);
    U().sheet({
      title: 'Поправить статус',
      html: `<p class="rd-sub" style="margin-top:0">Только чтобы исправить ошибку. Деньги и суммы не меняются, для этого есть отмена и правка доплаты. Клиенту придёт уведомление о новом статусе.</p>
        <div class="rd-card rd-list" style="margin-top:12px">${I2.map(([k, v]) => `<div class="rd-row ad-row-sm" role="button" tabindex="0" data-status="${k}"><span class="rd-row-body"><span class="rd-row-title">${esc(v[0])}</span></span></div>`).join('')}</div>`,
      onOpen: (wrap, close) => {
        wrap.querySelectorAll('[data-status]').forEach((row) => {
          row.onclick = async () => {
            close();
            const reason = await U().ask({
              title: STATUS[row.dataset.status][0], text: 'Причина сохранится в истории заказа.',
              fields: [{ name: 'reason', label: 'Причина', type: 'text' }], action: 'Поправить',
              validate: (x) => (x.reason ? '' : 'Укажите причину'),
            });
            if (reason === null) return;
            await call(null, 'admin_order_force_status', { p_order: o.id, p_status: row.dataset.status, p_reason: reason }, 'Статус поправлен');
          };
        });
      },
    });
  }

  async function confirmPayment(id) {
    const ok = await confirmSheet('Деньги пришли?', 'Сумма зачтётся клиенту, отменить это будет нельзя.', 'Деньги пришли');
    if (!ok) return;
    await call(null, 'admin_confirm_payment', { p_payment_id: id }, 'Оплата подтверждена');
  }

  async function rejectPayment(id) {
    const reason = await U().ask({
      title: 'Оплаты нет', text: 'Клиент увидит причину в истории.',
      fields: [{ name: 'reason', label: 'Причина', type: 'text', value: 'Оплата не найдена' }], action: 'Отклонить', danger: true,
    });
    if (reason === null) return;
    await call(null, 'admin_reject_payment', { p_payment_id: id, p_reason: reason }, 'Заявка отклонена');
  }

  function confirmSheet(title, text, action) {
    return new Promise((resolve) => {
      let done = false;
      U().sheet({
        title,
        html: `<p class="rd-sub" style="margin-top:0">${esc(text)}</p><button type="button" class="rd-btn rd-btn-block" style="margin-top:16px" data-yes>${esc(action)}</button>`,
        onClose: () => { if (!done) resolve(false); },
        onOpen: (wrap, close) => { wrap.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); close(); }; },
      });
    });
  }

  // ── Шаблон ответа на претензию: составляет бот (ai_requests), без сторонних сервисов ──
  async function legalSheet() {
    const UI = U();
    const o = card.order;
    const complaint = await UI.ask({
      title: 'Шаблон ответа', text: 'Опишите суть претензии клиента. Бот составит черновик, проверьте его перед отправкой.',
      fields: [{ name: 'text', label: 'Суть претензии', type: 'text', placeholder: 'Например, задержка доставки больше 30 дней' }], action: 'Составить',
      validate: (x) => (x.text ? '' : 'Опишите претензию'),
    });
    if (complaint === null) return;
    const { data: req, error } = await supabaseClient.from('ai_requests')
      .insert({ admin_id: Number(userId) || 0, prompt_text: `Заказ #${o.id}. Клиент (Telegram ID: ${o.user_id}). Суть претензии: ${complaint}. Составь официальный ответ клиенту.` })
      .select('id').single();
    if (error || !req) { fail(error, 'Не получилось отправить запрос'); return; }
    UI.toast('Составляем ответ…', 'info');
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (tries > 20) { clearInterval(timer); UI.toast('Бот не успел ответить. Попробуйте позже', 'bad'); return; }
      const { data: r } = await supabaseClient.from('ai_requests').select('status, response_text').eq('id', req.id).single();
      if (!r) return;
      if (r.status === 'error') { clearInterval(timer); UI.toast('Не получилось составить ответ', 'bad'); return; }
      if (r.status !== 'completed') return;
      clearInterval(timer);
      UI.sheet({
        title: 'Черновик ответа',
        html: `<p class="ad-draft">${esc(r.response_text)}</p><button type="button" class="rd-btn rd-btn-block" data-copy>${I('copy', 18)}Скопировать</button>`,
        onOpen: (wrap) => {
          wrap.querySelector('[data-copy]').onclick = async () => {
            try { await navigator.clipboard.writeText(r.response_text); UI.toast('Скопировано'); } catch (_) { UI.toast('Не получилось скопировать', 'bad'); }
          };
        },
      });
    }, 3000);
  }

  window.adminOpenOrders = openOrders;
  window.adminOpenOrder = openOrder;
  window.renderAdminOrders = renderAdminOrders;
  window.attachAdminOrdersHandlers = attachAdminOrdersHandlers;
  window.renderAdminOrder = renderAdminOrder;
  window.attachAdminOrderHandlers = attachAdminOrderHandlers;
})();
