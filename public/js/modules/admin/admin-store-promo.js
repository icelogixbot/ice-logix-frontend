/* ICE LOGIX — Админка, экран «Витрина» (этап 5б): Промокоды, Бонусы, Рассылка.
   Разделы подключаются через AD.store.addSection(id, title, icon, renderFn).
   Вид строго по ice-design-system, готовые классы rd-*, ad-*, ad-st-*.
   Символ ₽ вместо текстового названия валюты, бонусы — «ICE». */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD || !AD.store || !AD.store.kit) return;

  const K = AD.store.kit;
  const { bad, loadInto, logAct, fld, inp, area, sw, choice, chipVals, val, checked, openForm } = K;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);

  const formatMoney = (v) => (typeof window.formatBYN === 'function' ? window.formatBYN(v) : (AD && AD.money ? AD.money(v) : (Number(v) || 0).toFixed(2) + ' ₽'));

  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };

  // ══════════════════ 1. ПРОМОКОДЫ ══════════════════
  let promoRows = [];

  function promoStatus(r) {
    if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) {
      return ['bad', 'Истёк'];
    }
    if (r.usage_limit && Number(r.used || 0) >= Number(r.usage_limit)) {
      return ['warn', 'Лимит исчерпан'];
    }
    if (r.is_active === false) {
      return ['', 'Выключен'];
    }
    return ['ok', 'Включён'];
  }

  function fmtPromoDate(iso) {
    if (!iso) return 'бессрочно';
    const d = new Date(iso);
    if (isNaN(d)) return 'бессрочно';
    const z = (n) => String(n).padStart(2, '0');
    return `до ${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  const discountLabel = (r) =>
    r.discount_type === 'fixed'
      ? '−' + formatMoney(r.discount_value)
      : '−' + (Number(r.discount_value) || 0) + '%';

  function renderPromocodes(host, ctx) {
    ctx.cta('Добавить промокод', () => promoCodeForm(null, ctx));
    loadInto(
      host,
      ctx,
      () => sb().rpc('admin_promocodes'),
      (rows) => {
        promoRows = Array.isArray(rows) ? rows : [];
        const activeCount = promoRows.filter((r) => r.is_active !== false).length;
        ctx.setCount(activeCount);
        paintPromocodes(host, ctx);
      }
    );
  }

  function paintPromocodes(host, ctx) {
    const note = `<div class="ad-note">${I('info', 18)}<div><b>Промокоды</b><p>Лимит и срок проверяются при оформлении заказа.</p></div></div>`;
    if (!promoRows.length) {
      host.innerHTML =
        AD.emptyHtml({
          icon: 'tag',
          title: 'Промокодов пока нет',
          text: 'Создайте первый промокод для скидок клиентам.',
          action: 'Добавить промокод',
          actionId: 'adStEmptyAddPromo',
        }) + note;
      const b = host.querySelector('#adStEmptyAddPromo');
      if (b) b.onclick = () => promoCodeForm(null, ctx);
      return;
    }

    const listHtml = promoRows
      .map((r) => {
        const [cls, txt] = promoStatus(r);
        const usedStr = r.usage_limit
          ? `Использован ${r.used || 0} из ${r.usage_limit}`
          : `Использован ${r.used || 0} (без лимита)`;
        const sumStr = `Скидки на сумму: ${formatMoney(r.discount_sum || 0)}`;
        const expStr = fmtPromoDate(r.expires_at);
        const sub = `${usedStr} · ${sumStr} · ${expStr}`;
        return `
          <div class="rd-row" role="button" tabindex="0" data-promo="${esc(r.id)}">
            <span class="rd-ico">${I('tag', 20)}</span>
            <span class="rd-row-body">
              <span class="rd-row-title">${esc(r.code)} · ${discountLabel(r)} <span class="rd-status${cls ? ' ' + cls : ''}">${txt}</span></span>
              <span class="rd-row-text">${sub}</span>
            </span>
            ${I('chevR', 18, { cls: 'rd-chev' })}
          </div>`;
      })
      .join('');

    host.innerHTML = `<div class="rd-card rd-list">${listHtml}</div>${note}`;
    host.querySelectorAll('[data-promo]').forEach((row) => {
      row.onclick = () => {
        const item = promoRows.find((x) => String(x.id) === row.dataset.promo);
        if (item) promoCodeForm(item, ctx);
      };
    });
  }

  function promoCodeForm(p, ctx) {
    const edit = !!p;
    openForm({
      title: edit ? 'Промокод' : 'Новый промокод',
      body: `
        ${fld('Код промокода', inp('code', { value: edit ? p.code : '', ph: 'Например, SALE10' }), 'Латинские буквы и цифры')}
        ${choice('discount_type', 'Тип скидки', [['percent', 'Проценты'], ['fixed', 'Фиксированная']], [edit && p.discount_type === 'fixed' ? 'fixed' : 'percent'], false)}
        ${fld('Размер скидки', inp('discount_value', { value: edit ? p.discount_value : '', ph: '0', type: 'number', mode: 'decimal', step: '0.01' }))}
        ${fld('Срок действия до', inp('expires_at', { value: edit && p.expires_at ? toLocalInput(p.expires_at) : '', type: 'datetime-local' }), 'Пусто — бессрочно')}
        ${fld('Лимит применений', inp('usage_limit', { value: edit && p.usage_limit != null ? p.usage_limit : '', type: 'number', mode: 'numeric', ph: 'Без ограничений' }), 'Пусто — без ограничений')}
        ${sw('is_active', 'Включён', edit ? p.is_active !== false : true, 'Клиенты могут применить промокод')}`,
      save: async (form) => {
        const code = val(form, 'code');
        if (!code) bad('Укажите код промокода.');
        const type = chipVals(form, 'discount_type')[0] || 'percent';
        const dv = parseFloat(String(val(form, 'discount_value')).replace(',', '.'));
        if (!isFinite(dv) || dv <= 0) bad('Укажите размер скидки числом больше нуля.');
        if (type === 'percent' && (dv < 1 || dv > 100)) bad('Скидка в процентах должна быть от 1 до 100.');
        const expVal = val(form, 'expires_at');
        let expires = null;
        if (expVal) {
          const d = new Date(expVal);
          if (isNaN(d)) bad('Укажите корректную дату срока действия.');
          expires = d.toISOString();
        }
        const limVal = val(form, 'usage_limit');
        let limit = null;
        if (limVal) {
          const n = parseInt(limVal, 10);
          if (!isFinite(n) || n <= 0) bad('Лимит применений должен быть целым числом больше нуля.');
          limit = n;
        }
        const active = checked(form, 'is_active');

        const { error } = await sb().rpc('admin_promocode_save', {
          p_id: edit ? p.id : null,
          p_code: code,
          p_type: type,
          p_value: dv,
          p_active: active,
          p_expires: expires,
          p_limit: limit,
        });
        if (error) throw error;
        logAct(edit ? 'update_promocode' : 'create_promocode', { code, type, value: dv });
        U().toast(edit ? 'Промокод сохранён' : 'Промокод добавлен', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ 2. БОНУСЫ ══════════════════
  const BONUS_CATS = [
    ['coupons', 'Купоны'],
    ['mobile', 'Мобильная связь'],
    ['merch', 'Мерч'],
    ['gadgets', 'Гаджеты'],
  ];

  const bonusCatLabel = (cat) => {
    const found = BONUS_CATS.find(([k]) => k === cat);
    return found ? found[1] : (cat || 'Товар');
  };

  const LABELS = {
    phone: 'Телефон',
    operator: 'Оператор',
    name: 'Имя',
    full_name: 'Имя',
    email: 'Почта',
    address: 'Адрес',
    nickname: 'Ник',
    username: 'Ник',
    comment: 'Комментарий',
  };
  const SKIP = ['category', 'created_at', 'user_id', 'item_id', 'id'];
  const contact = (p) => {
    if (!p || typeof p !== 'object') return '';
    return Object.entries(p)
      .filter(([k, v]) => !SKIP.includes(k) && v !== null && v !== '' && typeof v !== 'object')
      .map(([k, v]) => `${esc(LABELS[k] || k)}: ${esc(v)}`)
      .join(' · ');
  };

  function renderBonus(host, ctx) {
    ctx.cta('Добавить товар', () => bonusItemForm(null, ctx));
    loadInto(
      host,
      ctx,
      () => sb().rpc('admin_bonus_overview'),
      (data) => paintBonus(data || {}, host, ctx)
    );
  }

  function paintBonus(data, host, ctx) {
    const items = Array.isArray(data.items) ? data.items : [];
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const pending = orders
      .filter((o) => o.status === 'PENDING')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const closed = orders
      .filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED')
      .slice(0, 10);

    ctx.setCount(pending.length);

    let pendingHtml = '';
    if (pending.length) {
      pendingHtml = `
        <div class="rd-section"><h2>Ждут выдачи</h2></div>
        <div class="rd-card ad-sheet-list">
          ${pending
            .map((o) => {
              const nick = o.username ? String(o.username).replace(/^@+/, '') : '';
              const clientStr = (o.client || 'Клиент') + (nick ? ` (@${nick})` : '');
              const dateStr = AD.dateTime(o.created_at);
              const cStr = contact(o.contact_payload);
              return `
                <div class="ad-pay" data-order-box="${esc(o.id)}">
                  <div class="ad-pay-top">
                    <b>${esc(o.item_title || 'Товар')}</b>
                    <span>${esc(String(o.price_ice))} ICE</span>
                  </div>
                  <div class="ad-pay-sub">${esc(clientStr)} · ${esc(dateStr)}</div>
                  ${cStr ? `<div class="ad-pay-sub">${cStr}</div>` : ''}
                  <div class="ad-pay-btns">
                    <button type="button" class="rd-btn rd-btn-sm" data-done="${esc(o.id)}">Выдан</button>
                    <button type="button" class="rd-btn rd-btn-sm rd-btn-danger" data-cancel="${esc(o.id)}" data-ice="${esc(String(o.price_ice))}">Отменить и вернуть ICE</button>
                  </div>
                </div>`;
            })
            .join('')}
        </div>`;
    } else {
      pendingHtml = `
        <div class="rd-card ad-calm">
          <span class="ad-dot ok"></span>
          <span class="rd-row-title">Все заказы за бонусы выданы</span>
        </div>`;
    }

    let itemsHtml = '';
    if (items.length) {
      itemsHtml = `
        <div class="rd-section"><h2>Товары за бонусы</h2></div>
        <div class="rd-card rd-list">
          ${items
            .map((it) => {
              const stockText = it.stock === -1 ? 'без ограничений' : 'остаток: ' + it.stock;
              const catText = bonusCatLabel(it.category);
              return `
                <div class="rd-row" role="button" tabindex="0" data-item="${esc(it.id)}">
                  <span class="rd-ico">${I('gift', 20)}</span>
                  <span class="rd-row-body">
                    <span class="rd-row-title">${esc(it.title)} ${it.is_active !== false ? '<span class="rd-status ok">Включён</span>' : '<span class="rd-status">Выключен</span>'}${it.badge ? ` <span class="rd-status">${esc(it.badge)}</span>` : ''}</span>
                    <span class="rd-row-text">${esc(catText)} · ${esc(String(it.price_ice))} ICE · ${esc(stockText)}</span>
                  </span>
                  ${I('chevR', 18, { cls: 'rd-chev' })}
                </div>`;
            })
            .join('')}
        </div>`;
    } else {
      itemsHtml = `
        <div class="rd-section"><h2>Товары за бонусы</h2></div>
        <div class="rd-card">
          ${U().empty({
            icon: 'gift',
            title: 'Товаров пока нет',
            text: 'Добавьте купоны, мерч или другие подарки за ICE.',
            action: 'Добавить товар',
            actionId: 'adBonusAddEmpty',
          })}
        </div>`;
    }

    let closedHtml = '';
    if (closed.length) {
      closedHtml = `
        <div class="rd-section"><h2>История выдачи</h2></div>
        <div class="rd-card rd-list">
          ${closed
            .map((o) => {
              const nick = o.username ? String(o.username).replace(/^@+/, '') : '';
              const clientStr = (o.client || 'Клиент') + (nick ? ` (@${nick})` : '');
              const isDone = o.status === 'COMPLETED';
              return `
                <div class="rd-row ad-static">
                  <span class="rd-row-body">
                    <span class="rd-row-title">${esc(o.item_title || 'Товар')} · ${esc(String(o.price_ice))} ICE <span class="rd-status ${isDone ? 'ok' : 'bad'}">${isDone ? 'Выдан' : 'Отменён'}</span></span>
                    <span class="rd-row-text">${esc(clientStr)} · ${esc(AD.dateTime(o.created_at))}</span>
                  </span>
                </div>`;
            })
            .join('')}
        </div>`;
    }

    host.innerHTML = pendingHtml + itemsHtml + closedHtml;

    const addEmptyBtn = host.querySelector('#adBonusAddEmpty');
    if (addEmptyBtn) addEmptyBtn.onclick = () => bonusItemForm(null, ctx);

    host.querySelectorAll('[data-item]').forEach((r) => {
      r.onclick = () => {
        const item = items.find((x) => String(x.id) === r.dataset.item);
        if (item) bonusItemForm(item, ctx);
      };
    });

    host.querySelectorAll('[data-done]').forEach((btn) => {
      btn.onclick = async () => {
        const card = btn.closest('[data-order-box]');
        const btns = card ? card.querySelectorAll('button') : [btn];
        btns.forEach((b) => (b.disabled = true));
        try {
          const { error } = await sb().rpc('admin_bonus_order_close', {
            p_id: btn.dataset.done,
            p_done: true,
            p_note: null,
          });
          if (error) throw error;
          if (!ctx.alive()) return;
          logAct('bonus_order_done', { id: btn.dataset.done });
          haptic('success');
          U().toast('Заказ выдан', 'ok');
          ctx.reload();
        } catch (e) {
          btns.forEach((b) => (b.disabled = false));
          AD.fail(e, 'Не получилось отметить заказ');
        }
      };
    });

    host.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.onclick = async () => {
        const ice = btn.dataset.ice || '0';
        const ok = await AD.confirmSheet(
          'Отменить заказ?',
          `Клиенту вернутся ${ice} ICE, товар вернётся на склад.`,
          'Отменить заказ',
          true
        );
        if (!ctx.alive()) return;
        if (!ok) return;

        const note = await U().ask({
          title: 'Причина отмены',
          text: 'Укажите причину для клиента (необязательно).',
          fields: [{ name: 'note', placeholder: 'Например, нет в наличии' }],
          action: 'Подтвердить отмену',
          danger: true,
        });
        if (!ctx.alive()) return;
        if (note === null) return;

        const card = btn.closest('[data-order-box]');
        const btns = card ? card.querySelectorAll('button') : [btn];
        btns.forEach((b) => (b.disabled = true));
        try {
          const { error } = await sb().rpc('admin_bonus_order_close', {
            p_id: btn.dataset.cancel,
            p_done: false,
            p_note: note && String(note).trim() ? String(note).trim() : null,
          });
          if (error) throw error;
          if (!ctx.alive()) return;
          logAct('bonus_order_cancel', { id: btn.dataset.cancel, note });
          haptic('success');
          U().toast('Заказ отменён, ICE возвращены', 'ok');
          ctx.reload();
        } catch (e) {
          btns.forEach((b) => (b.disabled = false));
          AD.fail(e, 'Не получилось отменить заказ');
        }
      };
    });
  }

  function bonusItemForm(it, ctx) {
    const edit = !!it;
    openForm({
      title: edit ? 'Товар за бонусы' : 'Новый товар за бонусы',
      body: `
        ${fld('Название', inp('title', { value: edit ? it.title : '', ph: 'От 2 до 100 символов' }))}
        ${fld('Описание', area('description', edit ? it.description : '', 'Условия получения или описание', 3))}
        ${choice('category', 'Категория', BONUS_CATS, [edit && it.category ? it.category : 'coupons'], false)}
        ${fld('Цена в ICE', inp('price_ice', { value: edit && it.price_ice != null ? it.price_ice : 0, type: 'number', mode: 'numeric' }), 'Стоимость в баллах ICE')}
        ${fld('Остаток', inp('stock', { value: edit && it.stock != null ? it.stock : -1, type: 'number', mode: 'numeric' }), '-1 — без ограничений')}
        ${fld('Метка (badge)', inp('badge', { value: edit ? it.badge || '' : '', ph: 'Например, Хит' }), 'Необязательно')}
        ${fld('Порядок сортировки', inp('sort_order', { value: edit && it.sort_order != null ? it.sort_order : 0, type: 'number', mode: 'numeric' }))}
        ${sw('is_active', 'Показывать клиентам', edit ? it.is_active !== false : true, 'Товар виден в бонусном магазине')}`,
      save: async (form) => {
        const title = val(form, 'title');
        if (!title || title.length < 2 || title.length > 100) bad('Название должно быть от 2 до 100 символов.');
        const description = val(form, 'description');
        const category = chipVals(form, 'category')[0] || 'coupons';
        const price = parseInt(val(form, 'price_ice'), 10);
        if (!isFinite(price) || price < 0) bad('Цена в ICE должна быть числом ≥ 0.');
        const stock = parseInt(val(form, 'stock'), 10);
        if (!isFinite(stock) || stock < -1) bad('Остаток должен быть числом ≥ -1 (-1 — без ограничений).');
        const badge = val(form, 'badge') || null;
        const sort = parseInt(val(form, 'sort_order'), 10);
        const sort_order = isFinite(sort) ? sort : 0;
        const active = checked(form, 'is_active');

        const { error } = await sb().rpc('admin_bonus_item_save', {
          p_id: edit ? it.id : null,
          p_title: title,
          p_description: description,
          p_category: category,
          p_price: price,
          p_stock: stock,
          p_active: active,
          p_badge: badge,
          p_sort: sort_order,
        });
        if (error) throw error;
        logAct(edit ? 'update_bonus_item' : 'create_bonus_item', { title, price, category });
        U().toast(edit ? 'Товар сохранён' : 'Товар добавлен', 'ok');
        ctx.reload();
      },
    });
  }

  // ══════════════════ 3. РАССЫЛКА ══════════════════
  function genKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '');
    }
    return 'key_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function renderNews(host, ctx) {
    let pKey = genKey();
    let lastTitle = '';
    let lastText = '';

    host.innerHTML = `
      <div class="rd-card ad-pad">
        <form class="rd-ask ad-form" novalidate id="adNewsForm">
          <label class="rd-ask-field">
            <span class="rd-label" style="display:flex;justify-content:space-between">
              <span>Заголовок рассылки</span>
              <span class="ad-hint" id="adNewsTitleCount" style="margin:0">0 / 100</span>
            </span>
            <span class="rd-field">
              <input name="title" type="text" maxlength="100" placeholder="Короткий заголовок" autocomplete="off">
            </span>
            <span class="ad-hint">От 3 до 100 символов</span>
          </label>
          <label class="rd-ask-field">
            <span class="rd-label" style="display:flex;justify-content:space-between">
              <span>Текст сообщения</span>
              <span class="ad-hint" id="adNewsTextCount" style="margin:0">0 / 1000</span>
            </span>
            <span class="rd-field" style="min-height:120px;align-items:flex-start">
              <textarea name="text" rows="5" maxlength="1000" placeholder="Подробный текст новости или предложения…" style="resize:vertical"></textarea>
            </span>
            <span class="ad-hint">От 10 до 1000 символов</span>
          </label>
          <p class="rd-ask-err" id="adNewsErr" hidden></p>
        </form>
      </div>
      <div class="ad-note">
        ${I('info', 18)}
        <div>
          <b>Уведомление клиентам</b>
          <p>Рассылка приходит клиентам в Telegram от бота сервиса. Перед реальной отправкой вы увидите точное число получателей.</p>
        </div>
      </div>`;

    const form = host.querySelector('#adNewsForm');
    const titleInp = form.querySelector('[name="title"]');
    const textInp = form.querySelector('[name="text"]');
    const errEl = form.querySelector('#adNewsErr');
    const titleCount = form.querySelector('#adNewsTitleCount');
    const textCount = form.querySelector('#adNewsTextCount');

    function showErr(msg) {
      if (!errEl) return;
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
      if (msg) haptic('error');
    }

    function updateCounters() {
      if (titleCount) titleCount.textContent = `${titleInp.value.length} / 100`;
      if (textCount) textCount.textContent = `${textInp.value.length} / 1000`;
    }

    function onInput() {
      showErr('');
      updateCounters();
      if (titleInp.value !== lastTitle || textInp.value !== lastText) {
        lastTitle = titleInp.value;
        lastText = textInp.value;
        pKey = genKey();
      }
    }

    titleInp.addEventListener('input', onInput);
    textInp.addEventListener('input', onInput);

    async function handleSend() {
      showErr('');
      const title = titleInp.value.trim();
      const text = textInp.value.trim();

      if (title.length < 3 || title.length > 100) {
        showErr('Заголовок должен быть от 3 до 100 символов.');
        return;
      }
      if (text.length < 10 || text.length > 1000) {
        showErr('Текст сообщения должен быть от 10 до 1000 символов.');
        return;
      }

      const ctaBtn = document.getElementById('adNextStep');
      if (ctaBtn) ctaBtn.disabled = true;

      let recipients = 0;
      try {
        const { data, error } = await sb().rpc('admin_send_news', {
          p_title: title,
          p_text: text,
          p_key: 'preview-не-нужен',
          p_dry_run: true,
        });
        if (error) throw error;
        recipients = Number(data && data.recipients) || 0;
      } catch (e) {
        if (ctaBtn) ctaBtn.disabled = false;
        showErr(AD.errorText(e));
        return;
      }

      if (!ctx.alive()) return;

      if (recipients <= 0) {
        if (ctaBtn) ctaBtn.disabled = false;
        showErr('Получателей нет');
        return;
      }

      const ok = await AD.confirmSheet(
        'Отправить рассылку?',
        `Получат ${recipients} клиентов. Отозвать после отправки нельзя.`,
        'Отправить',
        true
      );

      if (!ctx.alive()) return;

      if (!ok) {
        if (ctaBtn) ctaBtn.disabled = false;
        return;
      }

      if (ctaBtn) ctaBtn.disabled = true;

      try {
        const { error } = await sb().rpc('admin_send_news', {
          p_title: title,
          p_text: text,
          p_key: pKey,
          p_dry_run: false,
        });
        if (error) throw error;
        if (!ctx.alive()) return;
        logAct('admin_send_news', { title, recipients, key: pKey });
        haptic('success');
        U().toast(`Рассылка поставлена в очередь: ${recipients} получателей`, 'ok');
        titleInp.value = '';
        textInp.value = '';
        lastTitle = '';
        lastText = '';
        updateCounters();
        pKey = genKey();
      } catch (e) {
        if (!ctx.alive()) return;
        showErr(AD.errorText(e));
      } finally {
        if (ctaBtn) ctaBtn.disabled = false;
      }
    }

    ctx.cta('Проверить и отправить', handleSend);
  }

  // ══════════════════ Регистрация разделов ══════════════════
  AD.store.addSection('promocodes', 'Промокоды', 'tag', renderPromocodes);
  AD.store.addSection('bonus', 'Бонусы', 'gift', renderBonus);
  AD.store.addSection('news', 'Рассылка', 'bell', renderNews);

  window.adminStorePromo = { renderPromocodes, renderBonus, renderNews };
})();
