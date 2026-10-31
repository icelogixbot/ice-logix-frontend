/* ICE LOGIX — Админка, экран «Настройки» (этап 7): Работа, Деньги, Реферал.
   Перенесено из старой формы владельца (profile-modals.js) и admin.js; в списке только то, что реально читает
   расчёт или бот. Отпуск байера остаётся на Пульте. Только владелец; каждое сохранение пишется в журнал. */
(function () {
  'use strict';
  const AD = window.AD;
  if (!AD) return;

  const U = () => window.UI;
  const esc = AD.esc;
  const I = (n, s, o) => U().icon(n, s, o);
  const haptic = (k) => AD.haptic && AD.haptic(k);
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);
  const cur$ = () => (typeof window.bynSign === 'function' ? window.bynSign() : '₽');

  const SECTIONS = [['work', 'Работа'], ['money', 'Деньги'], ['ref', 'Реферал']];
  let cur = 'work';
  let token = 0;

  // ══════════════════ Помощники ══════════════════
  class VErr extends Error {}
  const bad = (m) => { throw new VErr(m); };
  const logAct = (a, d) => { try { if (typeof logAdminAction === 'function') logAdminAction(a, d); } catch (e) { /* журнал не мешает */ } };

  const fld = (label, inner, hint) =>
    `<label class="rd-ask-field"><span class="rd-label">${esc(label)}</span><span class="rd-field">${inner}</span>${hint ? `<span class="ad-hint">${esc(hint)}</span>` : ''}</label>`;
  const inp = (name, o = {}) =>
    `<input name="${name}" type="${o.type || 'text'}" value="${esc(o.value == null ? '' : o.value)}" placeholder="${esc(o.ph || '')}"${o.mode ? ` inputmode="${o.mode}"` : ''} autocomplete="off">`;
  const sw = (name, label, on, hint) =>
    `<label class="ad-st-sw"><span class="ad-st-sw-t"><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span><span class="rd-switch"><input type="checkbox" name="${name}"${on ? ' checked' : ''}><span></span></span></label>`;
  const val = (form, name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
  const checked = (form, name) => !!(form.elements[name] && form.elements[name].checked);
  const numIn = (form, name, label, min, max) => {
    const raw = val(form, name).replace(',', '.');
    const v = Number(raw);
    if (!raw || !Number.isFinite(v)) bad(`«${label}»: введите число.`);
    if (v < min || v > max) bad(`«${label}»: от ${min} до ${max}.`);
    return v;
  };
  const r4 = (x) => Math.round(x * 10000) / 10000;
  const section = (title) => `<div class="rd-section"><h2>${esc(title)}</h2></div>`;

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
  const must = (r) => { if (r.error) throw r.error; return r.data; };

  // Запись с проверкой, что строка действительно изменилась (RLS молча отбрасывает чужие правки)
  async function updateRow(table, match, patch) {
    let q = sb().from(table).update(patch);
    Object.keys(match).forEach((k) => { q = q.eq(k, match[k]); });
    const { data, error } = await q.select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Сервер не принял изменение. Проверьте права доступа.');
    return data[0];
  }

  // ══════════════════ Работа ══════════════════
  function renderWork(host, ctx) {
    loadInto(host, ctx, async () => {
      const [a, s] = await Promise.all([
        sb().from('app_settings').select('*').eq('id', 1).maybeSingle(),
        sb().from('settings').select('value').eq('key', 'exchange_buffer').maybeSingle(),
      ]);
      return { app: must(a) || {}, buffer: must(s) };
    }, ({ app, buffer }) => {
      const req = (app.payment_requisites && typeof app.payment_requisites === 'object') ? app.payment_requisites : {};
      const bufVal = buffer && buffer.value != null ? Number(buffer.value) : 3;
      host.innerHTML = `
        <form class="rd-ask ad-form" id="adStForm" novalidate>
          ${section('Оплата заказов')}
          <div class="rd-card">
            ${sw('paused', 'Приём заказов на паузе', !!app.is_payments_paused, 'Клиенты не смогут оформить заказ и увидят причину ниже')}
            ${fld('Причина для клиентов', inp('reason', { value: app.pause_reason || '', ph: 'Например: технические работы до вечера' }))}
          </div>
          ${section('Реквизиты')}
          <div class="rd-card">
            ${fld('Карта для оплаты', inp('card', { value: req.card || '', ph: '0000 0000 0000 0000', mode: 'numeric' }), 'Её видят клиенты при оплате переводом')}
            ${fld('Номер в ЕРИП', inp('erip', { value: req.erip || '', ph: 'Путь или код услуги' }))}
          </div>
          ${section('Курс юаня')}
          <div class="rd-card">
            ${fld('Запас на курс, %', inp('buffer', { value: Number.isFinite(bufVal) ? bufVal : 3, mode: 'decimal' }), 'Добавляется к курсу в расчёте цены, чтобы колебания курса не съедали маржу')}
          </div>
          <p class="rd-ask-err" hidden></p>
        </form>
        <p class="rd-sub ad-hint">Отпуск байера включается на Пульте — в строке «Состояние сервиса».</p>`;
      const form = host.querySelector('#adStForm');
      const err = form.querySelector('.rd-ask-err');
      form.addEventListener('submit', (e) => e.preventDefault());
      ctx.cta('Сохранить', async () => {
        err.hidden = true;
        try {
          const paused = checked(form, 'paused');
          const reason = val(form, 'reason');
          if (paused && !reason) bad('Напишите причину паузы — её увидят клиенты.');
          const card = val(form, 'card');
          const digits = card.replace(/[\s-]/g, '');
          if (card && !/^\d{12,19}$/.test(digits)) bad('Карта — только цифры, от 12 до 19.');
          const erip = val(form, 'erip');
          const buf = numIn(form, 'buffer', 'Запас на курс', 0, 20);

          const reqChanged = card !== (req.card || '') || erip !== (req.erip || '');
          const payChanged = paused !== !!app.is_payments_paused || reason !== (app.pause_reason || '');
          const bufChanged = buf !== bufVal;
          if (!reqChanged && !payChanged && !bufChanged) { U().toast('Ничего не изменилось', 'info'); return; }

          if (reqChanged) {
            const ok = await AD.confirmSheet('Сменить реквизиты?', 'Клиенты сразу начнут переводить деньги по новым реквизитам. Проверьте номер карты ещё раз.', 'Сменить');
            if (!ok) return;
          }
          if (payChanged && paused && !app.is_payments_paused) {
            const ok = await AD.confirmSheet('Поставить приём заказов на паузу?', 'Новые заказы нельзя будет оформить, пока вы не снимете паузу.', 'Поставить на паузу', true);
            if (!ok) return;
          }

          if (payChanged || reqChanged) {
            const row = await updateRow('app_settings', { id: 1 }, {
              is_payments_paused: paused,
              pause_reason: reason,
              payment_requisites: Object.assign({}, req, { card, erip }),
            });
            window.appSettings = Object.assign({}, window.appSettings || {}, row);
          }
          if (bufChanged) {
            const { error } = await sb().from('settings').upsert({ key: 'exchange_buffer', value: buf, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
            try { window.iceLogixPricing.CONFIG.currency_buffer_pct = buf; } catch (x) { /* расчёт ещё не загружен */ }
          }
          if (payChanged) logAct('update_payments_pause', { paused, has_reason: !!reason });
          if (reqChanged) logAct('update_payment_requisites', { card_changed: card !== (req.card || ''), erip_changed: erip !== (req.erip || '') });
          if (bufChanged) logAct('update_exchange_buffer', { from: bufVal, to: buf });
          haptic('success');
          U().toast('Настройки сохранены', 'ok');
          ctx.reload();
        } catch (x) {
          if (x instanceof VErr) { err.textContent = x.message; err.hidden = false; haptic('error'); }
          else AD.fail(x, 'Не получилось сохранить');
        }
      });
    });
  }

  // ══════════════════ Деньги ══════════════════
  function renderMoney(host, ctx) {
    loadInto(host, ctx, async () => {
      const rows = must(await sb().from('financial_configs').select('key,value,description'));
      const m = {};
      (rows || []).forEach((r) => { m[r.key] = r.value; });
      return m;
    }, (m) => {
      const num = (k, d) => (m[k] != null && Number.isFinite(Number(m[k])) ? Number(m[k]) : d);
      const duo = (m.duoduo_fee_rule && typeof m.duoduo_fee_rule === 'object') ? m.duoduo_fee_rule : { type: 'percent_with_min', percent: 3, min_cny: 2 };
      const pct = (k, d) => r4(num(k, d) * 100);
      const c = cur$();
      host.innerHTML = `
        <form class="rd-ask ad-form" id="adStForm" novalidate>
          <p class="rd-sub ad-hint">Здесь только то, что читают платежи и карточка заказа. Изменения действуют сразу на новые операции.</p>
          ${section('Пополнение кошелька')}
          <div class="rd-card">
            ${fld(`Минимум за раз, ${c}`, inp('topup_min', { value: num('topup_min', 1), mode: 'decimal' }))}
            ${fld(`Максимум за раз, ${c}`, inp('topup_max', { value: num('topup_max', 5000), mode: 'decimal' }))}
          </div>
          ${section('Услуги')}
          <div class="rd-card">
            ${fld(`Проверка Legit-Check, ${c}`, inp('legit_check_price', { value: num('legit_check_price', 5), mode: 'decimal' }), 'Цена за одну ручную проверку')}
            ${fld('Страховка, % от стоимости', inp('insurance_rate', { value: pct('insurance_rate', 0.02), mode: 'decimal' }))}
          </div>
          ${section('Выкуп')}
          <div class="rd-card">
            ${fld('Допустимое изменение цены, %', inp('price_change_small_percent', { value: num('price_change_small_percent', 3), mode: 'decimal' }), 'Если цена у продавца выросла меньше — выкуп идёт без остановки')}
            ${fld('Сбор DuoDuo Pay, %', inp('duo_percent', { value: Number(duo.percent) || 0, mode: 'decimal' }))}
            ${fld('Минимум сбора DuoDuo Pay, ¥', inp('duo_min', { value: Number(duo.min_cny) || 0, mode: 'decimal' }))}
          </div>
          ${section('Карты')}
          <div class="rd-card">
            ${fld('Сколько карт можно привязать', inp('card_limit', { value: num('card_limit', 5), mode: 'numeric' }))}
          </div>
          <p class="rd-ask-err" hidden></p>
        </form>`;
      const form = host.querySelector('#adStForm');
      const err = form.querySelector('.rd-ask-err');
      form.addEventListener('submit', (e) => e.preventDefault());
      ctx.cta('Сохранить', async () => {
        err.hidden = true;
        try {
          const tMin = numIn(form, 'topup_min', 'Минимум пополнения', 0.01, 100000);
          const tMax = numIn(form, 'topup_max', 'Максимум пополнения', 0.01, 1000000);
          if (tMax < tMin) bad('Максимум пополнения не может быть меньше минимума.');
          const next = {
            topup_min: tMin,
            topup_max: tMax,
            legit_check_price: numIn(form, 'legit_check_price', 'Проверка Legit-Check', 0, 1000),
            insurance_rate: r4(numIn(form, 'insurance_rate', 'Страховка', 0, 30) / 100),
            price_change_small_percent: numIn(form, 'price_change_small_percent', 'Допустимое изменение цены', 0, 50),
            duoduo_fee_rule: Object.assign({}, duo, {
              percent: numIn(form, 'duo_percent', 'Сбор DuoDuo Pay', 0, 30),
              min_cny: numIn(form, 'duo_min', 'Минимум сбора DuoDuo Pay', 0, 1000),
            }),
            card_limit: Math.round(numIn(form, 'card_limit', 'Лимит карт', 1, 20)),
          };
          const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
          const changed = Object.keys(next).filter((k) => !same(next[k], m[k]));
          if (!changed.length) { U().toast('Ничего не изменилось', 'info'); return; }
          const ok = await AD.confirmSheet('Изменить денежные настройки?', `Меняется параметров: ${changed.length}. Новые значения сразу применятся к платежам и заказам.`, 'Сохранить');
          if (!ok) return;
          const stamp = new Date().toISOString();
          for (const k of changed) await updateRow('financial_configs', { key: k }, { value: next[k], updated_at: stamp });
          const diff = {};
          changed.forEach((k) => { diff[k] = { from: m[k], to: next[k] }; });
          logAct('update_financial_configs', diff);
          haptic('success');
          U().toast('Настройки сохранены', 'ok');
          ctx.reload();
        } catch (x) {
          if (x instanceof VErr) { err.textContent = x.message; err.hidden = false; haptic('error'); }
          else AD.fail(x, 'Не получилось сохранить');
        }
      });
    });
  }

  // ══════════════════ Реферал ══════════════════
  function renderRef(host, ctx) {
    loadInto(host, ctx, async () => must(await sb().from('app_settings').select('*').eq('id', 1).maybeSingle()) || {}, (app) => {
      const nz = (v, d) => (v != null && Number.isFinite(Number(v)) ? Number(v) : d);
      host.innerHTML = `
        <form class="rd-ask ad-form" id="adStForm" novalidate>
          <p class="rd-sub ad-hint">Проценты считаются от комиссии сервиса с заказа приглашённого, а не от его суммы.</p>
          <div class="rd-card">
            ${sw('enabled', 'Реферальная программа', app.referral_enabled !== false, 'Выключите — начисления прекратятся')}
            ${sw('first_only', 'Только за первый заказ', app.referral_first_order_only !== false, 'Иначе — за каждый заказ приглашённого')}
          </div>
          ${section('Проценты')}
          <div class="rd-card">
            ${fld('Тому, кто пригласил, %', inp('referrer', { value: nz(app.referral_referrer_percent, 7), mode: 'decimal' }))}
            ${fld('Приглашённому, %', inp('referee', { value: nz(app.referral_referee_percent, 3), mode: 'decimal' }))}
            ${fld(`Минимальная комиссия заказа, ${cur$()}`, inp('min_comm', { value: nz(app.referral_min_order_commission, 0), mode: 'decimal' }), 'Ниже этой суммы бонус не начисляется')}
          </div>
          <p class="rd-ask-err" hidden></p>
        </form>`;
      const form = host.querySelector('#adStForm');
      const err = form.querySelector('.rd-ask-err');
      form.addEventListener('submit', (e) => e.preventDefault());
      ctx.cta('Сохранить', async () => {
        err.hidden = true;
        try {
          const patch = {
            referral_enabled: checked(form, 'enabled'),
            referral_first_order_only: checked(form, 'first_only'),
            referral_referrer_percent: numIn(form, 'referrer', 'Проценты пригласившему', 0, 50),
            referral_referee_percent: numIn(form, 'referee', 'Проценты приглашённому', 0, 50),
            referral_min_order_commission: numIn(form, 'min_comm', 'Минимальная комиссия', 0, 100000),
          };
          const changed = Object.keys(patch).filter((k) => patch[k] !== app[k] && !(typeof patch[k] === 'number' && Number(app[k]) === patch[k]));
          if (!changed.length) { U().toast('Ничего не изменилось', 'info'); return; }
          const row = await updateRow('app_settings', { id: 1 }, patch);
          window.appSettings = Object.assign({}, window.appSettings || {}, row);
          const diff = {};
          changed.forEach((k) => { diff[k] = { from: app[k], to: patch[k] }; });
          logAct('update_referral_settings', diff);
          haptic('success');
          U().toast('Реферальная программа обновлена', 'ok');
          ctx.reload();
        } catch (x) {
          if (x instanceof VErr) { err.textContent = x.message; err.hidden = false; haptic('error'); }
          else AD.fail(x, 'Не получилось сохранить');
        }
      });
    });
  }

  // ══════════════════ Экран ══════════════════
  const RENDER = { work: renderWork, money: renderMoney, ref: renderRef };

  function chipsHtml() {
    return SECTIONS.map(([id, t]) => `<button type="button" class="rd-chip${id === cur ? ' on' : ''}" data-sec="${id}">${esc(t)}</button>`).join('');
  }
  function paintChips() {
    const box = document.getElementById('adSettingsChips');
    if (!box) return;
    box.innerHTML = chipsHtml();
    box.querySelectorAll('[data-sec]').forEach((b) => {
      b.onclick = () => { if (b.dataset.sec === cur) return; haptic('light'); openSection(b.dataset.sec); };
    });
  }
  function openSection(id) {
    const host = document.getElementById('adSettingsBody');
    if (!host || !RENDER[id]) return;
    cur = id;
    const my = ++token;
    AD.clearCta();
    paintChips();
    host.innerHTML = '';
    const ctx = {
      host,
      alive: () => my === token && document.getElementById('adSettingsBody') === host,
      reload: () => { if (my === token) openSection(id); },
      cta: (label, run) => { if (my === token) AD.mountCta({ label, run }, 'adSettingsRoot'); },
    };
    try { RENDER[id](host, ctx); } catch (e) {
      AD.showError(host, 'Раздел не открылся', AD.errorText(e), () => openSection(id));
    }
  }

  function renderSettings(params, restored) {
    if (!restored) cur = (params && params.section && RENDER[params.section]) ? params.section : 'work';
    const owner = typeof isOwner !== 'undefined' && isOwner;
    return `
      <div class="rd-screen page-enter ad-screen" id="adSettingsRoot">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Настройки</h1><p class="rd-head-sub">Оплата, реквизиты, ставки и рефералы</p></div>
          <button type="button" class="rd-back" id="adSettingsRefresh" aria-label="Обновить">${I('refresh', 20)}</button>
        </div>
        ${owner ? `<div class="rd-chips ad-chips" id="adSettingsChips">${chipsHtml()}</div><div id="adSettingsBody"></div><div class="ad-cta-space"></div>`
          : `<div class="rd-card">${U().empty({ icon: 'lock', title: 'Только для владельца', text: 'Настройки сервиса может менять только владелец.' })}</div>`}
      </div>`;
  }
  function attachSettings() {
    if (!document.getElementById('adSettingsBody')) return;
    const r = document.getElementById('adSettingsRefresh');
    if (r) r.onclick = () => { haptic('light'); openSection(cur); };
    openSection(cur);
  }

  AD.screen('admin_settings', {
    render: renderSettings,
    attach: attachSettings,
    save: () => ({ cur }),
    restore: (s) => { if (s && s.cur && RENDER[s.cur]) cur = s.cur; return s; },
  });

  window.adminOpenSettings = (section) => AD.open('admin_settings', section ? { section } : {});
})();
