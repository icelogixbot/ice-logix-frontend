// Код-пароль приложения и вход по Face ID / отпечатку (ADR-013).
// Все проверки на сервере (функция app-lock): здесь только экран с клавиатурой и вызовы.
// Экран блокировки: при запуске и если приложение было свёрнуто дольше LOCK_AFTER_MS.
// window.AppLock: boot, status, lock, enableFlow, disableFlow, changeFlow, bioEnableFlow, bioDisableFlow, verifyFlow
(function () {
  const LOCK_AFTER_MS = 2 * 60 * 1000;
  const LS_FLAG = 'ice_app_lock'; // '1' — показать экран сразу при запуске, ещё до ответа сервера
  const state = { enabled: false, blocked: false, bioDevice: false, unlocked: false, checked: false, hiddenAt: 0 };
  let lockCtrl = null;

  const U = () => window.UI;
  const tg = () => window.Telegram && window.Telegram.WebApp;
  const haptic = (t) => { try { if (window.tgUtil && window.tgUtil.haptic) window.tgUtil.haptic(t); } catch (_) {} };
  const lsGet = () => { try { return localStorage.getItem(LS_FLAG) === '1'; } catch (_) { return false; } };
  const lsSet = (on) => { try { on ? localStorage.setItem(LS_FLAG, '1') : localStorage.removeItem(LS_FLAG); } catch (_) {} };
  const hasSession = () => { try { return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch (_) { return false; } };

  const ERR = {
    format: 'Код-пароль — это 4 цифры',
    weak: 'Слишком простой код. Не подойдут 1234, 1111, 2580 и похожие',
    telegram: 'Включить код-пароль можно только в приложении внутри Telegram',
    telegram_mismatch: 'Этот Telegram не привязан к вашему аккаунту',
    exists: 'Код-пароль уже включён',
    not_enabled: 'Код-пароль не включён',
    code_expired: 'Код из Telegram устарел. Запросите новый',
    too_many: 'Слишком много запросов кода. Попробуйте через час',
    bio_unknown: 'Вход по биометрии на этом телефоне выключен. Введите код',
    bio_failed: 'Не получилось войти по биометрии. Введите код',
    device: 'Не удалось определить телефон',
    auth: 'Не получилось подтвердить вход. Закройте приложение полностью и откройте снова',
    server: 'Не получилось проверить. Проверьте интернет и попробуйте ещё раз',
  };
  const errText = (r) => (r && ERR[r.error]) || ERR.server;

  function isWeak(pin) {
    if (/^(\d)\1{3}$/.test(pin)) return true;
    const d = pin.split('').map(Number);
    const up = d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10);
    const down = d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10);
    return up || down || pin === '1212' || pin === '2580';
  }

  async function waitReady(ms) {
    const until = Date.now() + (ms || 15000);
    while (Date.now() < until) {
      if (window.supabaseClient && window.userId) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  }

  // Сессии входа нет (истекла или вход не прошёл при запуске) — входим заново по подписанным данным Telegram
  async function reauth() {
    const app = tg();
    if (!app || !app.initData) return false;
    try {
      const { data } = await window.supabaseClient.functions.invoke('telegram-auth', { body: { initData: app.initData } });
      if (data && data.ok && data.session) {
        await window.supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function call(action, body) {
    try {
      const { data, error } = await window.supabaseClient.functions.invoke('app-lock', { body: { action, ...(body || {}) } });
      if (error) {
        try { return await error.context.json(); } catch (_) { return { ok: false, error: 'server' }; }
      }
      return data || { ok: false, error: 'server' };
    } catch (_) {
      return { ok: false, error: 'server' };
    }
  }

  async function api(action, body) {
    if (!(await waitReady())) return { ok: false, error: 'auth' };
    const r = await call(action, body);
    if (r && r.error === 'auth' && (await reauth())) return call(action, body);
    return r;
  }

  // ── Биометрия Telegram (BiometricManager, Bot API 7.2+) ──
  let bioPromise = null;
  function bio() {
    if (bioPromise) return bioPromise;
    bioPromise = new Promise((resolve) => {
      const app = tg();
      const b = app && app.BiometricManager;
      if (!b || !(app.isVersionAtLeast && app.isVersionAtLeast('7.2'))) return resolve(null);
      if (b.isInited) return resolve(b);
      const t = setTimeout(() => resolve(b.isInited ? b : null), 2500);
      try { b.init(() => { clearTimeout(t); resolve(b); }); } catch (_) { clearTimeout(t); resolve(null); }
    });
    return bioPromise;
  }
  const bioLabel = (b) => (b && b.biometricType === 'face' ? 'Face ID' : b && b.biometricType === 'finger' ? 'отпечатку' : 'биометрии');
  const bioRequest = (b, reason) => new Promise((r) => { try { b.requestAccess({ reason }, (ok) => r(!!ok)); } catch (_) { r(false); } });
  const bioAuth = (b, reason) => new Promise((r) => { try { b.authenticate({ reason }, (ok, token) => r(ok ? token : null)); } catch (_) { r(null); } });
  const bioSave = (b, token) => new Promise((r) => { try { b.updateBiometricToken(token, (ok) => r(!!ok)); } catch (_) { r(false); } });

  // ── Экран с клавиатурой ──
  // o: { title, text, closable, bioText, onPin(pin, ctrl), onBio(ctrl), onForgot(ctrl), onClose() }
  function openPad(o) {
    const ui = U();
    const el = document.createElement('div');
    el.className = 'lk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', o.title || 'Код-пароль');
    const key = (d) => `<button type="button" class="lk-key" data-d="${d}" aria-label="${d}">${d}</button>`;
    el.innerHTML = `
      <div class="lk-top">${o.closable ? `<button type="button" class="rd-back lk-close" aria-label="Закрыть">${ui.icon('x', 22)}</button>` : ''}</div>
      <div class="lk-body">
        <div class="lk-ico">${ui.icon('lock', 30)}</div>
        <h2 class="lk-title">${ui.esc(o.title || 'Введите код-пароль')}</h2>
        <p class="lk-text" aria-live="polite">${ui.esc(o.text || '')}</p>
        <div class="lk-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="lk-blocked" hidden></div>
      </div>
      <div class="lk-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join('')}
        ${o.onBio ? `<button type="button" class="lk-key lk-fn lk-bio" aria-label="Войти по ${ui.esc(o.bioText || 'биометрии')}">${ui.icon(o.bioText === 'Face ID' ? 'faceid' : 'fingerprint', 30)}</button>` : '<span></span>'}
        ${key(0)}
        <button type="button" class="lk-key lk-fn lk-del" aria-label="Стереть">${ui.icon('backspace', 28)}</button>
      </div>
      ${o.onForgot ? '<button type="button" class="lk-link">Забыли код-пароль?</button>' : '<span class="lk-link-gap"></span>'}`;
    document.body.appendChild(el);
    document.body.classList.add('lk-open');
    requestAnimationFrame(() => el.classList.add('show'));

    let pin = '';
    let busy = false;
    const dots = el.querySelectorAll('.lk-dots i');
    const textEl = el.querySelector('.lk-text');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const ctrl = {
      el,
      hasBio: !!o.onBio,
      setText(t, tone) { textEl.textContent = t || ''; textEl.className = 'lk-text' + (tone ? ' ' + tone : ''); },
      clear() { pin = ''; paint(); },
      shake() {
        haptic('error');
        el.classList.remove('lk-shake');
        void el.offsetWidth;
        el.classList.add('lk-shake');
      },
      busy(b) { busy = b; el.classList.toggle('lk-busy', b); },
      blocked(html) {
        const box = el.querySelector('.lk-blocked');
        box.innerHTML = html;
        box.hidden = !html;
        el.classList.toggle('lk-is-blocked', !!html);
      },
      close() {
        el.classList.remove('show');
        setTimeout(() => { el.remove(); if (!document.querySelector('.lk')) document.body.classList.remove('lk-open'); }, 200);
      },
    };

    const press = async (d) => {
      if (busy || pin.length >= 4) return;
      haptic('light');
      pin += d;
      paint();
      if (pin.length === 4 && o.onPin) {
        const value = pin;
        ctrl.busy(true);
        try { await o.onPin(value, ctrl); } finally { ctrl.busy(false); }
      }
    };
    el.addEventListener('click', (e) => {
      const k = e.target.closest('.lk-key[data-d]');
      if (k) return press(k.dataset.d);
      if (e.target.closest('.lk-del')) { if (!busy && pin) { pin = pin.slice(0, -1); paint(); } return; }
      if (e.target.closest('.lk-bio') && o.onBio && !busy) return o.onBio(ctrl);
      if (e.target.closest('.lk-link') && o.onForgot && !busy) return o.onForgot(ctrl);
      if (e.target.closest('.lk-close')) { ctrl.close(); if (o.onClose) o.onClose(); }
    });
    el.addEventListener('keydown', (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace' && !busy) { pin = pin.slice(0, -1); paint(); }
    });
    el.tabIndex = -1;
    setTimeout(() => el.focus(), 50);
    return ctrl;
  }

  // Собрать 4 цифры (без сервера). Закрыли — null.
  function askPin(title, text, tone) {
    return new Promise((resolve) => {
      const c = openPad({
        title, text, closable: true,
        onPin: (pin, ctrl) => { ctrl.close(); resolve(pin); },
        onClose: () => resolve(null),
      });
      if (tone) c.setText(text, tone);
    });
  }

  // Новый код дважды, с проверкой «слишком простой»
  async function askNewPin(title) {
    let text = 'Придумайте 4 цифры. Не подойдут 1234, 1111 и похожие';
    let tone = '';
    for (;;) {
      const p1 = await askPin(title, text, tone);
      if (!p1) return null;
      if (isWeak(p1)) { text = ERR.weak; tone = 'bad'; continue; }
      const p2 = await askPin('Повторите код-пароль', 'Введите те же 4 цифры ещё раз');
      if (!p2) return null;
      if (p1 !== p2) { text = 'Коды не совпали. Придумайте код ещё раз'; tone = 'bad'; continue; }
      return p1;
    }
  }

  function unlock() {
    state.unlocked = true;
    state.blocked = false;
    if (lockCtrl) { lockCtrl.close(); lockCtrl = null; }
    haptic('success');
  }

  function blockedHtml() {
    return `<p>Код-пароль заблокирован после 5 неверных попыток. Чтобы войти, получите код сброса от нашего бота в Telegram.</p>
      <button type="button" class="rd-btn rd-btn-block lk-reset">Получить код в Telegram</button>`;
  }

  // «Забыли код»: 6 цифр от бота → новый код-пароль. Face ID после сброса включается заново.
  async function forgotFlow(ctrl) {
    const ui = U();
    const r = await api('reset_request');
    if (!r.ok) { ui.toast(errText(r), 'bad'); return false; }
    ui.toast('Код отправлен в Telegram. Он придёт в течение минуты');
    for (;;) {
      const v = await ui.ask({
        title: 'Новый код-пароль',
        text: `Введите 6 цифр из сообщения бота ICE LOGIX (код действует ${r.ttl_min || 10} минут) и придумайте новый код-пароль.`,
        fields: [
          { name: 'code', label: 'Код из Telegram', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '6 цифр' },
          { name: 'pin', label: 'Новый код-пароль', type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: '4 цифры' },
          { name: 'repeat', label: 'Ещё раз', type: 'password', inputmode: 'numeric', autocomplete: 'new-password', placeholder: '4 цифры' },
        ],
        action: 'Сохранить код-пароль',
        validate: (x) => !/^\d{6}$/.test(x.code) ? 'Код из Telegram — 6 цифр'
          : !/^\d{4}$/.test(x.pin) ? ERR.format
          : isWeak(x.pin) ? ERR.weak
          : x.pin !== x.repeat ? 'Коды-пароли не совпали' : '',
      });
      if (!v) return false;
      const res = await api('reset_confirm', { code: v.code, new_pin: v.pin });
      if (res.ok) {
        state.bioDevice = false;
        const b = await bio();
        if (b && b.isBiometricTokenSaved) await bioSave(b, '');
        if (ctrl) ctrl.blocked('');
        unlock();
        ui.toast('Новый код-пароль сохранён');
        return true;
      }
      if (res.error === 'code_wrong') { ui.toast(`Неверный код из Telegram. Осталось попыток: ${res.left}`, 'bad'); continue; }
      ui.toast(errText(res), 'bad');
      if (res.error === 'code_expired') return false;
    }
  }

  async function bioUnlock(ctrl) {
    const b = await bio();
    if (!b) return;
    const token = await bioAuth(b, 'Вход в ICE LOGIX');
    if (!token) return;
    ctrl.busy(true);
    const r = await api('bio_verify', { device_id: b.deviceId, token });
    ctrl.busy(false);
    if (r.ok) return unlock();
    if (r.blocked) { state.blocked = true; return ctrl.blocked(blockedHtml()); }
    if (r.error === 'bio_unknown') {
      state.bioDevice = false;
      const btn = ctrl.el.querySelector('.lk-bio');
      if (btn) btn.style.visibility = 'hidden';
    }
    ctrl.setText(errText(r), 'bad');
  }

  async function lock() {
    if (lockCtrl) return;
    state.unlocked = false;
    const b = state.bioDevice ? await bio() : null;
    lockCtrl = openPad({
      title: 'Введите код-пароль',
      text: 'Приложение защищено код-паролем',
      bioText: bioLabel(b),
      onBio: b ? (c) => bioUnlock(c) : null,
      onForgot: (c) => forgotFlow(c),
      onPin: async (pin, c) => {
        const r = await api('verify', { pin });
        if (r.ok) return unlock();
        c.clear();
        if (r.blocked) { state.blocked = true; c.shake(); return c.blocked(blockedHtml()); }
        c.shake();
        c.setText(r.left != null ? `Неверный код. Осталось попыток: ${r.left}` : errText(r), 'bad');
      },
    });
    lockCtrl.el.addEventListener('click', (e) => { if (e.target.closest('.lk-reset')) forgotFlow(lockCtrl); });
    if (state.blocked) lockCtrl.blocked(blockedHtml());
    else if (b) setTimeout(() => { if (lockCtrl) bioUnlock(lockCtrl); }, 350);
  }

  // Состояние с сервера. Вызывается после загрузки профиля (app-core) и экраном настроек.
  async function refresh() {
    const b = await bio();
    const r = await api('status', { device_id: b ? b.deviceId : '' });
    if (!r.ok) return null;
    state.enabled = !!r.enabled;
    state.blocked = !!r.blocked;
    state.bioDevice = !!r.bio_device;
    state.checked = true;
    lsSet(state.enabled);
    return r;
  }

  async function boot() {
    const r = await refresh();
    if (!r) return; // сервер не ответил: если экран уже показан по флагу, он остаётся
    if (state.enabled && !state.unlocked) {
      // Экран, показанный при запуске по флагу, пересобираем, если на этом телефоне включён вход по биометрии
      if (lockCtrl && state.bioDevice && !lockCtrl.hasBio && !state.blocked) { lockCtrl.close(); lockCtrl = null; }
      if (lockCtrl && state.blocked) lockCtrl.blocked(blockedHtml());
      if (!lockCtrl) lock();
    } else if (!state.enabled && lockCtrl) {
      lockCtrl.close();
      lockCtrl = null;
    }
  }

  async function status() {
    if (!state.checked) await refresh();
    const b = await bio();
    return {
      enabled: state.enabled,
      blocked: state.blocked,
      bioDevice: state.bioDevice,
      bioAvailable: !!(b && b.isBiometricAvailable),
      bioName: b && b.biometricType === 'face' ? 'Face ID' : 'отпечатку пальца',
      inTelegram: !!(tg() && tg().initData),
    };
  }

  async function enableFlow() {
    const ui = U();
    const app = tg();
    if (!app || !app.initData) { ui.toast(ERR.telegram, 'info'); return false; }
    const pin = await askNewPin('Придумайте код-пароль');
    if (!pin) return false;
    const r = await api('setup', { pin, init_data: app.initData });
    if (!r.ok) { ui.toast(errText(r), 'bad'); return false; }
    state.enabled = true;
    state.unlocked = true;
    state.blocked = false;
    lsSet(true);
    haptic('success');
    ui.toast('Код-пароль включён');
    const b = await bio();
    if (b && b.isBiometricAvailable && await window.tgUtil.confirm(`Входить по ${bioLabel(b)} вместо ввода кода на этом телефоне?`)) {
      await bioEnableFlow(pin);
    }
    return true;
  }

  // Ввести код и сразу проверить его действием action на сервере; при ошибке — повторить с остатком попыток
  async function withServerPin(title, action, extra) {
    const ui = U();
    let text = 'Введите текущий код-пароль';
    let tone = '';
    for (;;) {
      const pin = await askPin(title, text, tone);
      if (!pin) return null;
      const r = await api(action, { pin, ...(extra || {}) });
      if (r.ok) return { pin, r };
      if (r.blocked) { state.blocked = true; ui.toast('Код-пароль заблокирован. Сбросьте его через Telegram', 'bad'); lock(); return null; }
      if (r.left != null) { text = `Неверный код. Осталось попыток: ${r.left}`; tone = 'bad'; continue; }
      ui.toast(errText(r), 'bad');
      return null;
    }
  }

  async function disableFlow() {
    const res = await withServerPin('Выключить код-пароль', 'disable');
    if (!res) return false;
    state.enabled = false;
    state.bioDevice = false;
    lsSet(false);
    const b = await bio();
    if (b && b.isBiometricTokenSaved) await bioSave(b, '');
    U().toast('Код-пароль выключен');
    return true;
  }

  async function changeFlow() {
    const ui = U();
    const old = await askPin('Сменить код-пароль', 'Введите текущий код-пароль');
    if (!old) return false;
    const next = await askNewPin('Новый код-пароль');
    if (!next) return false;
    const r = await api('change', { pin: old, new_pin: next });
    if (r.ok) { haptic('success'); ui.toast('Код-пароль изменён'); return true; }
    if (r.blocked) { state.blocked = true; ui.toast('Код-пароль заблокирован. Сбросьте его через Telegram', 'bad'); lock(); return false; }
    ui.toast(r.left != null ? `Текущий код неверный. Осталось попыток: ${r.left}` : errText(r), 'bad');
    return false;
  }

  async function bioEnableFlow(knownPin) {
    const ui = U();
    const b = await bio();
    if (!b || !b.isBiometricAvailable) { ui.toast('На этом телефоне вход по биометрии недоступен', 'info'); return false; }
    if (!b.isAccessGranted) {
      const granted = await bioRequest(b, 'Чтобы входить в ICE LOGIX без ввода кода');
      if (!granted) {
        ui.toast('Разрешите доступ к биометрии в настройках Telegram', 'info');
        try { b.openSettings(); } catch (_) {}
        return false;
      }
    }
    let res;
    if (knownPin) {
      const r = await api('bio_enable', { pin: knownPin, device_id: b.deviceId, type: b.biometricType });
      res = r.ok ? { r } : null;
      if (!r.ok) ui.toast(errText(r), 'bad');
    } else {
      res = await withServerPin(`Вход по ${bioLabel(b)}`, 'bio_enable', { device_id: b.deviceId, type: b.biometricType });
    }
    if (!res || !res.r.token) return false;
    if (!(await bioSave(b, res.r.token))) {
      await api('bio_disable', { device_id: b.deviceId });
      ui.toast('Telegram не сохранил ключ. Попробуйте ещё раз', 'bad');
      return false;
    }
    state.bioDevice = true;
    haptic('success');
    ui.toast(`Вход по ${bioLabel(b)} включён`);
    return true;
  }

  async function bioDisableFlow() {
    const b = await bio();
    if (b) await bioSave(b, '');
    await api('bio_disable', { device_id: b ? b.deviceId : '' });
    state.bioDevice = false;
    U().toast('Вход по биометрии выключен');
    return true;
  }

  // Подтверждение кодом (вход в админ-панель). Возвращает true / false / 'not_enabled'.
  async function verifyFlow(title) {
    await status();
    if (!state.enabled) return 'not_enabled';
    if (state.blocked) { lock(); return false; }
    const res = await withServerPin(title || 'Подтвердите код-паролем', 'verify');
    return !!res;
  }

  // ── Блокировка после фона ──
  const markHidden = () => { state.hiddenAt = Date.now(); };
  const checkReturn = () => {
    if (state.enabled && state.unlocked && state.hiddenAt && Date.now() - state.hiddenAt > LOCK_AFTER_MS) lock();
    state.hiddenAt = 0;
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? markHidden() : checkReturn()));
  try {
    const app = tg();
    if (app && app.onEvent) {
      app.onEvent('deactivated', markHidden);
      app.onEvent('activated', checkReturn);
    }
  } catch (_) {}

  // Если код-пароль был включён — экран сразу при запуске, ещё до загрузки данных
  if (lsGet() && hasSession()) {
    const early = () => { if (!state.unlocked) lock(); };
    if (document.body) early(); else document.addEventListener('DOMContentLoaded', early);
  }

  window.AppLock = { boot, status, lock, enableFlow, disableFlow, changeFlow, bioEnableFlow, bioDisableFlow, verifyFlow };
})();
