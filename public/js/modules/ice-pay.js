// ICE LOGIX: оплата через серверную функцию payments (ADR-014).
// Пополнение, оплата этапа заказа, привязка и удаление карт. Деньги зачисляет только сервер.
// Пока платёжная система не подключена (BEPAID_MODE=off), сервер создаёт заявку, её подтверждает админ.
// Когда подключена: новая карта — страница bePaid, привязанная карта — списание по токену (банк может спросить код),
// ЕРИП — номер счёта для оплаты в любом банке. Номер карты в приложение не вводится.
(function () {
  const FN_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/payments';
  let _config = null;

  const U = () => window.UI;
  const money = (v) => (typeof window.formatBYN === 'function' ? window.formatBYN(v) : Number(v || 0).toFixed(2));   // только в вёрстке
  const moneyText = (v) => window.moneyText(v);   // для окон сообщений: они показывают текст как есть
  const haptic = (kind) => { try { window.tgUtil?.haptic?.(kind); } catch (_) {} };
  const say = (text) => (window.tgUtil?.alert ? window.tgUtil.alert(text) : alert(text));

  async function call(body) {
    const { data } = await window.supabaseClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { ok: false, error: 'Войдите в приложение' };
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (_e) {
      return { ok: false, error: 'Нет связи. Проверьте интернет и попробуйте ещё раз' };
    }
  }

  async function config() {
    if (_config) return _config;
    const r = await call({ action: 'config' });
    _config = r && r.ok ? r : { gateway: false, methods: { manual: true } };
    return _config;
  }

  function openPayPage(url) {
    try {
      if (window.Telegram?.WebApp?.openLink) window.Telegram.WebApp.openLink(url);
      else window.open(url, '_blank');
    } catch (_) { window.open(url, '_blank'); }
  }

  function showErip(erip, amount) {
    const lines = (erip.instruction || []).map((l) => `<li>${U().esc(l)}</li>`).join('');
    U().sheet({
      title: 'Оплата через ЕРИП',
      html: `
        <p class="rd-sub">Оплатите ${money(amount)} в любом банке или инфокиоске: ЕРИП → найдите ICE LOGIX и введите номер.</p>
        <div class="rd-card rd-list">
          <div class="rd-row"><span class="rd-row-body"><span class="rd-row-text">Номер для оплаты</span>
          <span class="rd-row-title" id="eripAccNo">${U().esc(erip.account_number)}</span></span>
          <button type="button" class="rd-btn rd-btn-sm rd-btn-tonal" id="eripCopyBtn">Скопировать</button></div>
        </div>
        ${lines ? `<ol class="rd-sub">${lines}</ol>` : ''}
        <p class="rd-sub">Деньги зачислятся сами, как только ЕРИП подтвердит оплату. Обычно это несколько минут.</p>`,
      onOpen(wrap) {
        wrap.querySelector('#eripCopyBtn')?.addEventListener('click', () => {
          navigator.clipboard?.writeText(String(erip.account_number)).then(() => U().toast('Номер скопирован')).catch(() => {});
        });
      }
    });
  }

  // Песочница (только для проверки админом, BEPAID_MODE=sandbox): «банк» подтверждает или отклоняет
  async function sandbox(res) {
    const ok = await window.tgUtil?.confirm?.('Песочница: банк подтверждает оплату? «Отмена» — отклонить.');
    await call({ action: 'sandbox_complete', payment_id: res.payment_id, bind_id: res.bind_id, result: ok ? 'ok' : 'fail' });
    U().toast(ok ? 'Песочница: оплачено' : 'Песочница: отклонено');
  }

  // Общая обработка ответа сервера. Возвращает ответ, чтобы вызывающий экран обновил себя.
  // manualText — что сказать, если платёжка не подключена и создана заявка для админа.
  async function finish(res, amount, manualText) {
    if (!res || !res.ok) {
      haptic('error');
      say(res?.error || 'Не получилось провести оплату');
      return res || { ok: false };
    }
    if (res.status === 'paid') {
      haptic('success');
      return res;
    }
    if (res.sandbox) {
      await sandbox(res);
      return res;
    }
    if (res.redirect_url) {
      haptic('medium');
      say(res.three_ds
        ? 'Банк просит подтвердить оплату кодом из SMS. Откроется страница банка, после подтверждения вернитесь в приложение.'
        : 'Откроется защищённая страница оплаты bePaid. После оплаты вернитесь в приложение: статус обновится сам.');
      openPayPage(res.redirect_url);
      return res;
    }
    if (res.erip) {
      showErip(res.erip, res.remaining ?? amount);
      return res;
    }
    if (res.manual && manualText) {
      haptic('success');
      say(manualText);
    }
    return res;
  }

  function defaultCard() {
    const cards = Array.isArray(window.userCards) ? window.userCards : [];
    return cards.find((c) => c.is_default) || cards[0] || null;
  }

  // Пополнение баланса. method: 'card' | 'erip' | 'oplati' | 'manual'. Для карты сама берёт основную привязанную.
  async function topup(amount, method = 'manual', opts = {}) {
    const amt = Math.round((parseFloat(amount) || 0) * 100) / 100;
    if (amt <= 0) return { ok: false };
    let m = method;
    let cardId = opts.card_id || null;
    if (m === 'card' && !opts.new_card) {
      const c = defaultCard();
      if (c && /^[0-9a-f-]{36}$/i.test(c.id)) { m = 'card_token'; cardId = c.id; }
    }
    const res = await call({ action: 'topup', amount: amt, method: m, card_id: cardId, save_card: opts.save_card !== false });
    return finish(res, amt, `Заявка на пополнение на ${moneyText(amt)} принята. Деньги появятся на балансе, как только мы увидим оплату.`);
  }

  // Оплата этапа заказа ('FIRST' | 'SECOND'). Сначала сколько разрешено с баланса, остаток — выбранным способом.
  // Сообщение для ручной заявки показывает вызывающий экран (у него свой текст).
  async function payOrder(orderId, stage, useBalance, method = 'manual', opts = {}) {
    let m = method;
    let cardId = opts.card_id || null;
    if (m === 'card' && !opts.new_card) {
      const c = cardId ? { id: cardId } : defaultCard();
      if (c && /^[0-9a-f-]{36}$/i.test(c.id)) { m = 'card_token'; cardId = c.id; }
    }
    const res = await call({ action: 'order', order_id: orderId, stage, use_balance: useBalance || 0, method: m, card_id: cardId, save_card: opts.save_card !== false });
    return finish(res, res?.remaining, null);
  }

  // Привязка карты: страница bePaid (карту вводят там). Без платёжки — понятное сообщение.
  async function bindCard() {
    const res = await call({ action: 'bind_card' });
    if (!res.ok) {
      say(res.error || 'Не получилось начать привязку карты');
      return res;
    }
    if (res.sandbox) {
      await sandbox(res);
      if (typeof window.loadUserCards === 'function') await window.loadUserCards();
      return res;
    }
    say('Откроется защищённая страница bePaid: введите карту там. Банк может спросить код из SMS. После этого вернитесь в приложение.');
    openPayPage(res.redirect_url);
    return res;
  }

  async function setDefaultCard(cardId) {
    const { error } = await window.supabaseClient.rpc('card_set_default', { p_card: cardId });
    if (error) { say(error.message); return false; }
    return true;
  }

  async function deleteCard(cardId) {
    const { error } = await window.supabaseClient.rpc('card_delete', { p_card: cardId });
    if (error) { say(error.message); return false; }
    return true;
  }

  async function gatewayOn() {
    const c = await config();
    return Boolean(c.gateway);
  }

  window.IcePay = { config, gatewayOn, topup, payOrder, bindCard, setDefaultCard, deleteCard };

  // Старое окно ввода номера карты в приложении заменено привязкой на странице bePaid
  window.openAddCardModal = function (onSuccess) {
    bindCard().then((r) => { if (r && r.ok && typeof onSuccess === 'function' && r.sandbox) onSuccess(); });
  };
})();
