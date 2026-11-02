// ============================================================
// ICE LOGIX: подтверждение белорусского номера (+375)
// Номер подтверждает сам Telegram (кнопка «Поделиться номером»), его принимает бот
// и записывает в users.phone. Один номер — один аккаунт (уникальный индекс в БД).
// Персонал (owner/admin/support) проходит без номера.
// ============================================================
(function () {
  'use strict';

  const STAFF = ['owner', 'admin', 'support'];
  const ICON = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3h3l1.6 4.2-2 1.4a11 11 0 0 0 5.2 5.2l1.4-2L21 13.4v3a2.6 2.6 0 0 1-2.8 2.6A16.6 16.6 0 0 1 4 4.8 2.6 2.6 0 0 1 6.6 3z"/></svg>';

  function tg() { return window.Telegram && window.Telegram.WebApp; }
  function tgUserId() { const u = tg() && tg().initDataUnsafe && tg().initDataUnsafe.user; return u ? u.id : null; }
  function validPhone(p) { return typeof p === 'string' && /^\+375\d{9}$/.test(p.replace(/[\s()-]/g, '')); }
  const REASONS = {
    not_by: 'Нужен белорусский номер +375. Другие номера мы не принимаем.',
    other_phone: 'К этому аккаунту уже привязан другой номер. Для замены напишите в поддержку.',
    taken: 'Этот номер уже занят другим аккаунтом. Если это ваш номер, напишите в поддержку.'
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function readProfile(userId) {
    try {
      const { data } = await window.supabaseClient.from('users').select('role, phone, settings').eq('user_id', userId).maybeSingle();
      return data || null;
    } catch (_) { return null; }
  }

  function injectStyle() {
    if (document.getElementById('pgStyle')) return;
    const st = document.createElement('style');
    st.id = 'pgStyle';
    st.textContent =
      '#phoneGate{position:fixed;inset:0;z-index:2000000000;background:var(--rd-bg);display:flex;align-items:center;justify-content:center;padding:24px;}' +
      '#phoneGate .pg-card{width:100%;max-width:380px;background:var(--rd-s1);border:1px solid var(--rd-line);border-radius:var(--rd-r22);padding:28px 22px 22px;text-align:center;}' +
      '#phoneGate .pg-ico{width:64px;height:64px;margin:0 auto 18px;border-radius:20px;background:var(--rd-s2);border:1px solid var(--rd-line);display:flex;align-items:center;justify-content:center;color:var(--rd-b300);}' +
      '#phoneGate h2{margin:0 0 10px;font-size:20px;font-weight:800;color:var(--rd-tx);}' +
      '#phoneGate p{margin:0 0 20px;font-size:14px;line-height:1.5;color:var(--rd-tx2);}' +
      '#phoneGate .pg-help{margin-top:12px;background:transparent;border:1px solid var(--rd-line);color:var(--rd-tx2);}' +
      '#phoneGate .pg-note{margin:14px 0 0;font-size:12px;color:var(--rd-tx3);}' +
      '#phoneGate .pg-err{margin:14px 0 0;font-size:13px;color:var(--rd-bad);min-height:0;}';
    document.head.appendChild(st);
  }

  function show(userId) {
    if (document.getElementById('phoneGate')) return;
    injectStyle();
    const el = document.createElement('div');
    el.id = 'phoneGate';
    el.innerHTML =
      '<div class="pg-card">' +
        '<div class="pg-ico">' + ICON + '</div>' +
        '<h2>Подтвердите номер</h2>' +
        '<p>Чтобы пользоваться ICE LOGIX, нужен белорусский номер +375. Это защищает ваш аккаунт и бонусы от подделок. Один номер — один аккаунт.</p>' +
        '<button class="rd-btn rd-btn-block" id="pgBtn" type="button">Поделиться номером</button>' +
        '<div class="pg-err" id="pgErr"></div>' +
        '<button class="rd-btn rd-btn-block pg-help" id="pgHelp" type="button">Не получается? Написать в поддержку</button>' +
        '<div class="pg-note">Номер видит только ICE LOGIX. Мы не звоним без вашего заказа.</div>' +
      '</div>';
    document.body.appendChild(el);

    const help = el.querySelector('#pgHelp');
    help.addEventListener('click', () => {
      if (typeof window.openSupport === 'function') window.openSupport({ reason: 'phone' });
      else if (tg() && tg().openTelegramLink) tg().openTelegramLink('https://t.me/icelogix_support_bot?start=phone');
    });
    const btn = el.querySelector('#pgBtn');
    const err = el.querySelector('#pgErr');
    const say = (t) => { err.textContent = t || ''; };

    btn.addEventListener('click', async () => {
      const app = tg();
      if (!app || typeof app.requestContact !== 'function') {
        say('Обновите Telegram до последней версии и откройте приложение снова.');
        return;
      }
      say('');
      btn.disabled = true;
      const before = await readProfile(userId);
      const seenAt = before && before.settings && before.settings.phone_check ? before.settings.phone_check.at : 0;
      app.requestContact(async (sent) => {
        if (!sent) { btn.disabled = false; say('Без номера войти не получится. Нажмите кнопку ещё раз и разрешите.'); return; }
        btn.textContent = 'Проверяем номер…';
        let reason = '';
        for (let i = 0; i < 40 && !reason; i++) {
          await sleep(i < 6 ? 400 : 800);
          const p = await readProfile(userId);
          if (p && validPhone(p.phone)) { el.remove(); try { app.HapticFeedback && app.HapticFeedback.notificationOccurred('success'); } catch (_) {} return; }
          const pc = p && p.settings && p.settings.phone_check;
          if (pc && pc.at !== seenAt) reason = pc.status;
        }
        btn.disabled = false;
        btn.textContent = 'Поделиться номером';
        say(REASONS[reason] || 'Номер не принят. Нужен белорусский +375, и на нём не должно быть другого аккаунта. Если это ваш номер, напишите в поддержку.');
      });
    });
  }

  async function run() {
    for (let i = 0; i < 75; i++) {
      const userId = tgUserId();
      if (userId && window.supabaseClient) {
        const { data } = await window.supabaseClient.auth.getSession();
        if (data && data.session) {
          const p = await readProfile(userId);
          if (!p) { await sleep(800); continue; }
          if (STAFF.includes(p.role) || validPhone(p.phone)) return;
          show(userId);
          return;
        }
      }
      await sleep(800);
    }
  }

  if (tg() && tg().initData) run();
})();
