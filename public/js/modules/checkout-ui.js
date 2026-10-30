// ICE LOGIX: экран оформления заказа (скилл ice-design-system).
// Четыре блока и одна кнопка: вещи, получение, оплата, итог. Подробности — в шторках.
// Расчёт и создание заказа остаются в calculator.js (recalculateOrderTotals) и orders.js (createOrderFinal):
// они находят поля по id, поэтому все поля лежат в шторках постоянно, а шторки только показываются.
// Шторки и кнопка оплаты живут в #coOverlay прямо в body: у #content остаётся transform после анимации,
// и position: fixed внутри него не работает.
(function () {
  const OVERLAY_ID = 'coOverlay';
  const PVS_LABELS = {
    none: { title: 'Самовывоз в Несвиже', text: 'Бесплатно' },
    europoshta: { title: 'Европочта', text: 'Тариф оплачивается при получении' },
    belpochta: { title: 'Белпочта', text: 'Тариф оплачивается при получении' },
    sdek: { title: 'СДЭК', text: 'Тариф оплачивается при получении' }
  };
  const CITIES = ['Минск', 'Гомель', 'Брест', 'Гродно', 'Витебск', 'Могилев', 'Барановичи', 'Бобруйск', 'Пинск', 'Несвиж'];
  const DOCS = {
    offer: { title: 'Публичная оферта', url: '/legal/offer.html' },
    delivery: { title: 'Правила доставки', url: '/legal/delivery-rules.html' },
    privacy: { title: 'Обработка персональных данных', url: '/legal/privacy.html' }
  };

  const U = () => window.UI;
  const sign = () => (window.bynSign ? window.bynSign() : '');
  const num = (v) => window.moneyText(v);
  const $ = (id) => document.getElementById(id);
  const haptic = (k) => { try { window.tgUtil?.haptic?.(k); } catch (_) {} };
  const isFamilyMember = () => {
    const fam = window.userSettings?.family || {};
    return Boolean(fam.role === 'member' && fam.head_id);
  };
  const PAY_LABELS = { card: 'Картой', erip: 'Через ЕРИП', oplati: 'Через «Оплати»' };
  let busy = false;
  let termsResolve = null;

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function itemImage(it) {
    const url = it.image_url || it.imageUrl || (Array.isArray(it.photo_urls) && it.photo_urls[0]) || '';
    return /placeholder\.com/.test(url) ? '' : url;
  }

  function sheetHtml(id, title, body) {
    return `
      <div class="rd-sheet-wrap co-sheet" id="${id}" hidden>
        <div class="rd-sheet-backdrop" data-co-close="1"></div>
        <div class="rd-sheet" role="dialog" aria-modal="true" aria-label="${U().esc(title)}">
          <div class="rd-sheet-handle"></div>
          <div class="rd-sheet-head"><h3>${U().esc(title)}</h3><button type="button" class="rd-sheet-x" data-co-close="1" aria-label="Закрыть">${U().icon('x', 20)}</button></div>
          <div class="rd-sheet-body">${body}</div>
        </div>
      </div>`;
  }

  function toggleRow(id, title, text, price, checked, extraAttrs = '') {
    const priceHtml = price ? `<span class="co-opt-price">${price}</span>` : '';
    return `
      <label class="rd-row co-opt" for="${id}">
        <span class="rd-row-body"><span class="rd-row-title">${title}${priceHtml}</span>${text ? `<span class="rd-row-text">${text}</span>` : ''}</span>
        <span class="rd-switch"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${extraAttrs}><span></span></span>
      </label>`;
  }

  function itemsHtml(t) {
    const uI = U();
    return t.items.map((it, idx) => {
      const img = itemImage(it);
      const meta = [it.color, it.size ? `Размер ${it.size}` : ''].filter(Boolean).join(' · ');
      const qty = Number(it.quantity) || 1;
      return `
        <div class="co-item">
          <div class="co-thumb">${img ? `<img src="${uI.esc(img)}" alt="" loading="lazy" onerror="this.style.opacity=0">` : uI.icon('box', 22)}</div>
          <div class="co-item-body">
            <div class="co-item-title">${uI.esc(it.title || 'Вещь')}</div>
            ${meta ? `<div class="co-item-meta">${uI.esc(meta)}</div>` : ''}
            <div class="co-item-price"><span data-co-line="${idx}">${num((it.unit_byn ?? it.total_byn ?? 0) * qty)}</span>${sign()}${qty > 1 ? `<span class="co-item-qty">${qty} шт.</span>` : ''}</div>
          </div>
          <button type="button" class="co-item-del" onclick="window.deleteOrderItem(${idx})" aria-label="Убрать из заказа">${uI.icon('x', 18)}</button>
        </div>`;
    }).join('');
  }

  function deliverySheet(t) {
    const method = t.pvs?.method || 'none';
    const uI = U();
    const options = Object.keys(PVS_LABELS).map((k) => `
      <div class="rd-row co-radio ${k === method ? 'on' : ''}" role="radio" aria-checked="${k === method}" tabindex="0" data-co-pvs="${k}">
        <span class="rd-row-body"><span class="rd-row-title">${PVS_LABELS[k].title}</span><span class="rd-row-text">${PVS_LABELS[k].text}</span></span>
        <span class="co-dot"></span>
      </div>`).join('');
    return sheetHtml('coSheetDelivery', 'Получение', `
      <select id="pvsMethodSelect" data-gx-skip hidden>
        ${Object.keys(PVS_LABELS).map((k) => `<option value="${k}" ${k === method ? 'selected' : ''}>${PVS_LABELS[k].title}</option>`).join('')}
      </select>
      <div class="rd-card rd-list">${options}</div>
      <div id="pvsDetailContainer" class="co-pvs ${method === 'none' ? 'hidden' : ''}">
        <span class="rd-label">Город</span>
        <div class="rd-field"><select id="pvsCitySelect" class="co-select" data-gx-skip>${CITIES.map((c) => `<option value="${c}" ${t.pvs?.city === c ? 'selected' : ''}>${c}</option>`).join('')}</select>${uI.icon('chevD', 18)}</div>
        <span class="rd-label">Пункт выдачи</span>
        <div class="rd-field"><select id="pvsPointSelect" class="co-select" data-gx-skip></select>${uI.icon('chevD', 18)}</div>
        <button type="button" class="rd-btn rd-btn-ghost rd-btn-block" onclick="window.openYandexMapStub()">${uI.icon('pin', 18)}<span>Выбрать на карте</span></button>
      </div>
      ${window.userSettings?.free_delivery_tokens > 0 ? `
        <div class="rd-card rd-list co-gap">${toggleRow('orderUseFreeDelivery', 'Бесплатная доставка', 'Купон с колеса удачи', '', t.useFreeDelivery)}</div>` : ''}
      <button type="button" class="rd-btn rd-btn-block co-gap" data-co-close="1">Готово</button>`);
  }

  function paySheet() {
    return sheetHtml('coSheetPay', 'Способ оплаты', `
      <div class="fn-seg" id="checkoutPaymentMethodTabs">
        <button type="button" id="checkoutMethodTabCard" onclick="window.setCheckoutPaymentMethod('card')">Карта</button>
        <button type="button" id="checkoutMethodTabErip" onclick="window.setCheckoutPaymentMethod('erip')">ЕРИП</button>
        <button type="button" id="checkoutMethodTabOplati" onclick="window.setCheckoutPaymentMethod('oplati')">Оплати</button>
      </div>
      <div id="checkoutCardsList"></div>
      <p class="co-note-line" id="coPayNote" hidden></p>
      <button type="button" class="rd-btn rd-btn-block co-gap" data-co-close="1">Готово</button>`);
  }

  function promoSheet(t) {
    return sheetHtml('coSheetPromo', 'Промокод', `
      <div class="rd-field"><input type="text" id="promoCode" placeholder="Введите промокод" autocomplete="off" value="${U().esc(t.appliedPromo?.code || '')}"></div>
      <p id="promoMessage" class="co-note-line hidden"></p>
      <button type="button" id="applyPromoBtn" class="rd-btn rd-btn-block co-gap">Применить</button>`);
  }

  function extrasSheet(t) {
    const tab = window.activePackageTab || 'CN';
    const extras = (t.packageExtras && t.packageExtras[tab]) || {};
    const consolidated = (t.consolidation && t.consolidation[tab]) || false;
    const plus = (n) => `+${num(n)}${sign()}`;
    return sheetHtml('coSheetExtras', 'Дополнительные услуги', `
      <p class="co-note-line">Страховка посылки уже включена. Остальное по желанию.</p>
      <div class="rd-section co-sub"><h2>Проверка на складе</h2></div>
      <div class="rd-card rd-list">
        ${toggleRow('orderExtraPhoto', 'Детальные фото', 'Снимем вещь со всех сторон', plus(3), t.extraPhoto)}
        ${toggleRow('orderExtraMeasure', 'Замеры', 'Длина стельки или размеры одежды', plus(3), t.extraMeasure)}
        ${toggleRow('extraCheck', 'Проверка на брак', 'Осмотрим вещь перед отправкой', plus(5), extras.check, `onchange="window.togglePackageExtra('${tab}', 'check')"`)}
        ${toggleRow('orderRequiresVideoCheck', 'Видео со склада', 'Покажем вещь на видео', plus(10), t.requiresVideoCheck)}
      </div>
      <div class="rd-section co-sub"><h2>Упаковка</h2></div>
      <div class="rd-card rd-list">
        ${toggleRow('extraBubble', 'Пузырчатая плёнка', 'Для хрупких вещей', plus(3), extras.bubble, `onchange="window.togglePackageExtra('${tab}', 'bubble')"`)}
        ${toggleRow('extraWood', 'Деревянная обрешётка', 'Самая надёжная защита', plus(10), extras.wood, `onchange="window.togglePackageExtra('${tab}', 'wood')"`)}
        ${toggleRow('orderKeepBox', 'Сохранить оригинальную коробку', 'Посылка станет тяжелее на 300 г', '', t.keepBox)}
        ${t.items.length >= 2 ? toggleRow('pkgConsolidationCheck', 'Объединить в одну коробку', 'Все вещи заказа приедут вместе', `−${num(3)}${sign()}`, consolidated, `onchange="window.togglePackageConsolidation('${tab}')"`) : ''}
        ${toggleRow('orderIsGift', 'Это подарок', 'Скроем цену и чек', '', t.isGift)}
      </div>
      <button type="button" class="rd-btn rd-btn-block co-gap" data-co-close="1">Готово</button>`);
  }

  function render(vacationBanner) {
    const t = window.tempOrder;
    const uI = U();
    const count = t.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    const bal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
    return `
      <div class="rd-screen page-enter co">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${uI.icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Оформление заказа</h1><p class="rd-head-sub" id="coHeadSub">${count} ${plural(count, 'вещь', 'вещи', 'вещей')}</p></div>
        </div>
        ${vacationBanner || ''}

        <div class="rd-card co-items" id="orderItemsList">
          ${itemsHtml(t)}
          <button type="button" class="co-add" onclick="startOrderAddMode()">${uI.icon('plus', 18)}<span>Добавить вещь</span></button>
        </div>

        <div class="rd-section co-sub"><h2>Получение</h2></div>
        <div class="rd-card rd-list">
          <div class="rd-row" role="button" tabindex="0" data-co-open="coSheetDelivery">
            <span class="rd-ico">${uI.icon('truck', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title" id="coRowDeliveryTitle"></span><span class="rd-row-text" id="coRowDeliveryText"></span></span>
            ${uI.icon('chevR', 20)}
          </div>
        </div>

        <div class="rd-section co-sub"><h2>Оплата</h2></div>
        <div class="rd-card rd-list">
          <div class="rd-row" role="button" tabindex="0" data-co-open="coSheetPay">
            <span class="rd-ico">${uI.icon('card', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title" id="coRowPayTitle"></span><span class="rd-row-text" id="coRowPayText"></span></span>
            ${uI.icon('chevR', 20)}
          </div>
          <label class="rd-row co-opt" for="orderApplyBalance">
            <span class="rd-ico">${uI.icon('wallet', 22)}</span>
            <span class="rd-row-body">
              <span class="rd-row-title">Списать с баланса</span>
              <span class="rd-row-text"><span>Доступно <span id="checkoutUserBalance">${num(bal)}</span>${sign()}</span><span id="checkoutBalanceAmountRow" class="hidden"> · спишем <span id="checkoutBalanceUsedText"></span></span></span>
            </span>
            <span class="rd-switch"><input type="checkbox" id="orderApplyBalance" ${bal > 0 ? '' : 'disabled'}><span></span></span>
          </label>
          <div class="rd-row" role="button" tabindex="0" data-co-open="coSheetPromo">
            <span class="rd-ico">${uI.icon('percent', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title">Промокод</span><span class="rd-row-text" id="coRowPromoText">Если есть</span></span>
            ${uI.icon('chevR', 20)}
          </div>
          <div class="rd-row" role="button" tabindex="0" data-co-open="coSheetExtras">
            <span class="rd-ico">${uI.icon('sparkles', 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title">Дополнительные услуги</span><span class="rd-row-text" id="coRowExtrasText">Фото, проверка, упаковка</span></span>
            ${uI.icon('chevR', 20)}
          </div>
        </div>

        <div id="customsSplitPlaceholder"></div>

        <div class="rd-section co-sub"><h2>Итог</h2></div>
        <div class="rd-card co-total">
          <div id="coSumRows"></div>
          <div class="co-total-row co-total-all"><span>Всего за заказ</span><span><span id="orderTotal">—</span>${sign()}</span></div>
          <div class="co-total-now"><span>Сейчас</span><b><span id="firstPaymentAmount">—</span>${sign()}</b></div>
          <div id="coPayRows"></div>
          <div class="co-total-row"><span>После взвешивания на складе</span><span>≈&nbsp;<span id="secondPaymentEstimate">—</span>${sign()}</span></div>
          <button type="button" class="co-more" id="coBreakdownToggle" aria-expanded="false"><span>Что входит в цену вещей</span>${uI.icon('chevD', 18)}</button>
          <div id="coBreakdown" class="co-breakdown" hidden></div>
        </div>
      </div>

      <div id="${OVERLAY_ID}">
        <div class="rd-cta co-cta">
          <button type="button" id="createOrderFinal" class="rd-btn rd-btn-block"><span>Оплатить&nbsp;<span id="btnPayAmount">—</span>${sign()}</span></button>
        </div>
        ${deliverySheet(t)}
        ${paySheet()}
        ${promoSheet(t)}
        ${extrasSheet(t)}
        ${sheetHtml('coSheetConfirm', 'Подтверждение заказа', '<div id="coConfirmBody"></div>')}
      </div>`;
  }

  // --- Шторки -------------------------------------------------------------------------------
  function openSheet(id) {
    const el = $(id);
    if (!el) return;
    haptic('light');
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
  }
  function closeSheet(el) {
    el.classList.remove('show');
    setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 260);
    if (el.id === 'coSheetConfirm') settleTerms(false);
    refresh();
  }

  // Выносим шторки и кнопку в body и подключаем нажатия. Вызывается до поиска полей в attachNewOrderHandlers.
  function mount() {
    document.querySelectorAll(`body > #${OVERLAY_ID}`).forEach((n) => n.remove());
    const overlay = document.querySelector(`#content #${OVERLAY_ID}`);
    if (!overlay) return;
    document.body.appendChild(overlay);
    busy = false;
    termsResolve = null;

    overlay.addEventListener('click', (e) => {
      const doc = e.target.closest('[data-co-doc]');
      if (doc) { showDoc(doc.dataset.coDoc); return; }
      const accept = e.target.closest('[data-co-accept]');
      if (accept) { settleTerms(true); closeSheet(accept.closest('.co-sheet')); return; }
      const closer = e.target.closest('[data-co-close]');
      if (closer) { closeSheet(closer.closest('.co-sheet')); return; }
      const pvs = e.target.closest('[data-co-pvs]');
      if (pvs) {
        const sel = $('pvsMethodSelect');
        sel.value = pvs.dataset.coPvs;
        overlay.querySelectorAll('[data-co-pvs]').forEach((r) => {
          const on = r === pvs;
          r.classList.toggle('on', on);
          r.setAttribute('aria-checked', String(on));
        });
        sel.dispatchEvent(new Event('change'));
        haptic('selection');
      }
    });
    overlay.addEventListener('change', (e) => {
      if (e.target.name === 'selectedCheckoutCard') { markCardRows(); refresh(); }
      if (e.target.type === 'checkbox') haptic('light');
    });

    const screen = document.querySelector('#content .co');
    if (!screen) return;
    screen.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-co-open]');
      if (opener) openSheet(opener.dataset.coOpen);
    });
    const toggle = $('coBreakdownToggle');
    if (toggle) {
      toggle.onclick = () => {
        const box = $('coBreakdown');
        box.hidden = !box.hidden;
        toggle.setAttribute('aria-expanded', String(!box.hidden));
        toggle.classList.toggle('open', !box.hidden);
      };
    }
    window.setCheckoutPaymentMethod(window._checkoutPaymentMethod || 'card');
    if (window.IcePay) {
      window.IcePay.config().then((c) => { window._coGateway = Boolean(c.gateway); renderPayNote(); refresh(); });
    }
  }

  // --- Способ оплаты --------------------------------------------------------------------------
  function renderPayNote() {
    const note = $('coPayNote');
    if (!note) return;
    const method = window._checkoutPaymentMethod || 'card';
    let text = '';
    if (!window._coGateway) {
      text = 'Онлайн-оплата подключается. Сейчас оформим заказ, а оплату подтвердит оператор.';
    } else if (method === 'erip') {
      text = 'После нажатия «Оплатить» покажем номер счёта. Оплатите его в любом банке, деньги зачислятся сами.';
    } else if (method === 'oplati') {
      text = 'Пока оплату через «Оплати» подтверждает оператор.';
    } else {
      text = 'Карту вводите только на защищённой странице bePaid. Мы не храним её номер.';
    }
    note.textContent = text;
    note.hidden = false;
  }

  function markCardRows() {
    document.querySelectorAll('#checkoutCardsList .co-radio').forEach((r) => {
      const on = r.querySelector('input')?.checked;
      r.classList.toggle('on', Boolean(on));
    });
  }

  function renderCheckoutCards() {
    const box = $('checkoutCardsList');
    if (!box) return;
    const method = window._checkoutPaymentMethod || 'card';
    const uI = U();
    if (method !== 'card') {
      box.innerHTML = `<div class="rd-card rd-list"><div class="rd-row"><span class="rd-ico">${uI.icon(method === 'erip' ? 'receipt' : 'zap', 22)}</span><span class="rd-row-body"><span class="rd-row-title">${method === 'erip' ? 'Система «Расчёт» (ЕРИП)' : 'Сервис «Оплати»'}</span><span class="rd-row-text">${method === 'erip' ? 'Из интернет-банка любого банка' : 'Через приложение банка'}</span></span></div></div>`;
      renderPayNote();
      return;
    }
    const cards = Array.isArray(window.userCards) ? window.userCards : [];
    const selected = box.querySelector('input[name="selectedCheckoutCard"]:checked')?.value;
    const def = selected || (cards.find((c) => c.is_default) || cards[0])?.id || 'new';
    const rows = cards.map((c) => `
      <label class="rd-row co-radio">
        <input type="radio" name="selectedCheckoutCard" value="${uI.esc(c.id)}" ${c.id === def ? 'checked' : ''} hidden>
        <span class="rd-ico">${uI.icon('card', 22)}</span>
        <span class="rd-row-body"><span class="rd-row-title">•••• ${uI.esc(c.last4 || '')}</span><span class="rd-row-text">${uI.esc(c.card_brand || 'Карта')}${c.expiry_metadata ? ' · ' + uI.esc(c.expiry_metadata) : ''}</span></span>
        <span class="co-dot"></span>
      </label>`).join('');
    box.innerHTML = `
      <div class="rd-card rd-list">
        ${rows}
        <label class="rd-row co-radio">
          <input type="radio" name="selectedCheckoutCard" value="new" ${def === 'new' ? 'checked' : ''} hidden>
          <span class="rd-ico">${uI.icon('plus', 22)}</span>
          <span class="rd-row-body"><span class="rd-row-title">Новая карта</span><span class="rd-row-text">Запомним, чтобы платить быстрее</span></span>
          <span class="co-dot"></span>
        </label>
      </div>`;
    markCardRows();
    renderPayNote();
  }

  function setCheckoutPaymentMethod(method) {
    window._checkoutPaymentMethod = method;
    const tabs = { card: 'checkoutMethodTabCard', erip: 'checkoutMethodTabErip', oplati: 'checkoutMethodTabOplati' };
    Object.keys(tabs).forEach((k) => $(tabs[k])?.classList.toggle('on', k === method));
    renderCheckoutCards();
    refresh();
  }

  // --- Подписи и суммы. Вызывается после каждого пересчёта заказа --------------------------------
  function moneyRow(label, value) {
    const v = Number(value) || 0;
    return `<div class="co-total-row"><span>${U().esc(label)}</span><span>${v < 0 ? '−' : ''}${num(Math.abs(v))}${sign()}</span></div>`;
  }

  // Вещи считаем остатком от итога, чтобы строки всегда сходились с «Всего за заказ»
  function summaryRows(t) {
    const b = t.breakdown || {};
    const packaging = Number(b.packaging_cost_byn) || 0;
    const duty = Number(b.customs_duty_byn) || 0;
    const services = (Number(t.extras_total) || 0) + (Number(b.video_check_byn) || 0);
    const local = Number(b.local_delivery_byn) || 0;
    const discount = Number(t.discountAmount) || 0;
    const goods = Math.round(((Number(t.total_byn) || 0) - packaging - duty - services - local + discount) * 100) / 100;
    return moneyRow('Вещи', goods) + [
      ['Упаковка', packaging],
      ['Пошлина', duty],
      ['Услуги', services],
      ['Доставка по Беларуси', local],
      ['Скидка', -discount]
    ].filter((r) => r[1] !== 0).map((r) => moneyRow(r[0], r[1])).join('');
  }

  // Сумма этапа без вычетов, остаток к оплате и сколько покрыто балансом (в том числе уже списанным при сорвавшейся оплате)
  function payAmounts(t) {
    const stage = Math.max(0, Number(t.first_payment_subtotal_byn) || 0);
    const rest = Math.max(0, Number(t.first_payment_byn) || 0);
    return { stage, rest, fromBalance: Math.round((stage - rest) * 100) / 100 };
  }

  function payRows(t) {
    const { rest, fromBalance } = payAmounts(t);
    if (fromBalance <= 0) return '';
    return moneyRow('С баланса', -fromBalance)
      + (rest > 0 ? moneyRow(PAY_LABELS[window._checkoutPaymentMethod] || PAY_LABELS.card, rest) : '');
  }

  function breakdownHtml(t) {
    const b = t.breakdown || {};
    const rows = [
      ['Товар', b.product_cost_byn],
      ['Запас на курс', b.currency_buffer_byn],
      ['Комиссия ICE LOGIX', b.commission_byn],
      ['Доставка в Беларусь (оценка)', b.delivery_cost_byn],
      ['Страховка', b.insurance_byn]
    ].filter((r) => Number(r[1]) > 0).map((r) => moneyRow(r[0], r[1])).join('');
    const tail = Number(b.local_delivery_byn) > 0 ? ', страховка и доставка по Беларуси' : ' и страховка';
    return `${rows}<p class="co-note-line">После взвешивания доплачиваются остаток доставки${tail}.</p>`;
  }

  function payButtonHtml(t) {
    if (busy) return '<span>Оформляем заказ…</span>';
    const { stage, rest, fromBalance } = payAmounts(t);
    if (isFamilyMember() || stage <= 0) return '<span>Оформить заказ</span>';
    return `<span>${rest > 0 ? 'Оплатить' : 'Оплатить с баланса'}&nbsp;<span id="btnPayAmount">${num(rest > 0 ? rest : fromBalance)}</span>${sign()}</span>`;
  }

  // --- Подтверждение условий: шторка возвращает true, только если клиент нажал кнопку принятия ----
  function settleTerms(accepted) {
    if (!termsResolve) return;
    const resolve = termsResolve;
    termsResolve = null;
    resolve(accepted);
  }

  function confirmTerms({ family = false } = {}) {
    const t = window.tempOrder;
    const body = $('coConfirmBody');
    if (!t || !body || termsResolve) return Promise.resolve(false);
    const { stage } = payAmounts(t);
    const label = family || stage <= 0 ? 'Принять и оформить' : 'Принять и оплатить';
    const sums = family
      ? `${moneyRow('Всего за заказ', t.total_byn)}<p class="co-note-line">Заказ уйдёт на одобрение главе семейного бюджета.</p>`
      : `<div class="co-total-now"><span>Сейчас</span><b>${num(stage)}${sign()}</b></div>${payRows(t)}
         <div class="co-total-row"><span>После взвешивания на складе</span><span>≈&nbsp;${num(t.second_payment_est_byn)}${sign()}</span></div>
         ${moneyRow('Всего за заказ', t.total_byn)}`;
    body.innerHTML = `
      ${sums}
      <p class="co-terms">Нажимая «${label}», вы принимаете <button type="button" data-co-doc="offer">публичную оферту</button> и <button type="button" data-co-doc="delivery">правила доставки</button>. Как мы обрабатываем данные — в <button type="button" data-co-doc="privacy">политике</button>.</p>
      <button type="button" class="rd-btn rd-btn-block co-gap" data-co-accept="1">${label}</button>`;
    openSheet('coSheetConfirm');
    return new Promise((resolve) => { termsResolve = resolve; });
  }

  function setBusy(on) {
    busy = Boolean(on);
    const btn = $('createOrderFinal');
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    if (window.tempOrder?.first_payment_byn != null) btn.innerHTML = payButtonHtml(window.tempOrder);
  }

  // Подпись заказа: тот же состав и та же сумма этапа означают тот же заказ
  function orderSig(items, stageSum) {
    const parts = (items || []).map((it) => `${it.cartId ?? it.url ?? it.title}:${Number(it.quantity) || 1}`);
    return `${parts.join(',')}|${(Number(stageSum) || 0).toFixed(2)}`;
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  function refresh() {
    const t = window.tempOrder;
    if (!t || !$('coRowDeliveryTitle')) return;

    const pvs = t.pvs || { method: 'none' };
    const pv = PVS_LABELS[pvs.method] || PVS_LABELS.none;
    setText('coRowDeliveryTitle', pv.title);
    setText('coRowDeliveryText', pvs.method === 'none' ? pv.text : [pvs.city, pvs.point].filter(Boolean).join(', ') || pv.text);

    const method = window._checkoutPaymentMethod || 'card';
    if (method === 'card') {
      const val = document.querySelector('input[name="selectedCheckoutCard"]:checked')?.value;
      const card = (window.userCards || []).find((c) => c.id === val);
      setText('coRowPayTitle', card ? `Карта •••• ${card.last4}` : 'Новая карта');
      setText('coRowPayText', window._coGateway ? 'На защищённой странице bePaid' : 'Подтвердит оператор');
    } else {
      setText('coRowPayTitle', method === 'erip' ? 'ЕРИП' : 'Оплати');
      setText('coRowPayText', method === 'erip' && window._coGateway ? 'Покажем номер счёта' : 'Подтвердит оператор');
    }

    setHtml('coRowPromoText', t.appliedPromo?.code ? `${U().esc(t.appliedPromo.code)} · скидка ${num(t.discountAmount)}${sign()}` : 'Если есть');

    const extraIds = ['orderExtraPhoto', 'orderExtraMeasure', 'extraCheck', 'orderRequiresVideoCheck', 'extraBubble', 'extraWood', 'orderKeepBox', 'pkgConsolidationCheck', 'orderIsGift'];
    const on = extraIds.filter((id) => $(id)?.checked).length;
    const sum = (Number(t.extras_total) || 0) + (Number(t.breakdown?.video_check_byn) || 0);
    setHtml('coRowExtrasText', on ? `${on} ${plural(on, 'услуга', 'услуги', 'услуг')}${sum ? ` · ${sum > 0 ? '+' : '−'}${num(Math.abs(sum))}${sign()}` : ''}` : 'Фото, проверка, упаковка');

    const bal = Number(typeof balance !== 'undefined' ? (balance || 0) : 0);
    setText('checkoutUserBalance', num(bal));
    const balSwitch = $('orderApplyBalance');
    if (balSwitch) {
      balSwitch.disabled = bal <= 0;
      if (bal <= 0) balSwitch.checked = false;
    }

    if (t.first_payment_byn != null) {
      setText('firstPaymentAmount', num(payAmounts(t).stage));
      setText('secondPaymentEstimate', num(t.second_payment_est_byn));
      setText('orderTotal', num(t.total_byn));
      setHtml('coSumRows', summaryRows(t));
      setHtml('coPayRows', isFamilyMember() ? '' : payRows(t));
      setHtml('createOrderFinal', payButtonHtml(t));
    }
    t.items.forEach((it, idx) => {
      const el = document.querySelector(`[data-co-line="${idx}"]`);
      if (el) el.textContent = num((it.unit_byn ?? it.total_byn ?? 0) * (Number(it.quantity) || 1));
    });
    const days = t.breakdown?.delivery_days;
    const count = t.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
    setText('coHeadSub', `${count} ${plural(count, 'вещь', 'вещи', 'вещей')}${days && days[1] ? ` · ${days[0]}–${days[1]} рабочих дней` : ''}`);
    const box = $('coBreakdown');
    if (box) box.innerHTML = breakdownHtml(t);
  }

  // --- Документы ------------------------------------------------------------------------------
  async function showDoc(key) {
    const doc = DOCS[key];
    if (!doc) return;
    haptic('light');
    let html = '';
    try {
      const res = await fetch(doc.url);
      const parsed = new DOMParser().parseFromString(await res.text(), 'text/html');
      html = parsed.querySelector('main')?.innerHTML || '';
    } catch (_) {}
    U().sheet({ title: doc.title, html: `<div class="co-doc">${html || '<p>Не получилось открыть документ. Проверьте интернет.</p>'}</div>` });
  }

  window.togglePackageConsolidation = (country) => {
    const t = window.tempOrder;
    t.consolidation = t.consolidation || {};
    t.consolidation[country] = Boolean($('pkgConsolidationCheck')?.checked);
    window.recalculateOrderTotals();
  };

  window.setCheckoutPaymentMethod = setCheckoutPaymentMethod;
  window.renderCheckoutCards = renderCheckoutCards;
  window.CheckoutUI = { render, mount, refresh, showDoc, confirmTerms, setBusy, orderSig };
})();
