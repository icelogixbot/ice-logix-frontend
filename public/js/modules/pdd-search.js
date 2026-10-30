// ============================================================
// ICE LOGIX Module: Поиск товаров по фото и по описанию
// Ищет внутри приложения Pinduoduo (наш поисковый сервер с эмулятором)
// через очередь pdd_jobs: pdd_job_create → pdd_job_status.
// Критерии клиента: подлинность, бюджет под ключ, «дешевле ↔ качественнее», площадка.
// ============================================================

(function () {
  'use strict';

  const U = () => window.UI;
  const POLL_MS = 1500;
  const MAX_WAIT_MS = 4 * 60 * 1000;
  const PLATFORMS = [
    { id: 'pinduoduo', label: 'Pinduoduo', ready: true },
    { id: 'taobao', label: 'Taobao', ready: false },
    { id: 'poizon', label: 'Poizon', ready: false },
    { id: '1688', label: '1688', ready: false },
  ];
  const VERDICT = {
    original: { text: 'Оригинал', tone: 'ok' },
    likely_original: { text: 'Похоже на оригинал', tone: 'ok' },
    replica: { text: 'Реплика', tone: 'warn' },
    no_brand: { text: 'Без бренда', tone: '' },
    unknown: { text: 'Не определили', tone: '' },
  };

  // Состояние экрана живёт между перерисовками (калькулятор перерисовывает экран целиком)
  const S = window._pddSearchState = window._pddSearchState || {
    authenticity: 'any',
    priority: 50,
    budget: '',
    files: [],
    previews: [],
    query: '',
    hint: '',
    job: null,
    results: null,
    error: null,
  };

  const esc = (t) => (U() && U().esc ? U().esc(t) : String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const icon = (n, s) => (U() ? U().icon(n, s || 20) : '');
  const money = (v) => (U() ? U().money(v, { keepCents: false }) : String(v));
  const haptic = (k) => { try { window.tgUtil && window.tgUtil.haptic && window.tgUtil.haptic(k); } catch (_) { /* нет Telegram */ } };

  function userId() {
    return window.userId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null;
  }

  function fullPriceByn(item) {
    if (typeof window.calculateAllInclusiveByn !== 'function' || !item.price_cny) return null;
    return window.calculateAllInclusiveByn(item.price_cny, item.category || item.title_ru || '').totalByn;
  }

  // ── Разметка ──────────────────────────────────────────────────────────────
  function render(mode) {
    const isPhoto = mode === 'photo';
    const title = isPhoto ? 'Поиск по фото' : 'Поиск по описанию';
    const sub = isPhoto ? 'Найдём такую же вещь на Pinduoduo' : 'Опишите вещь своими словами';

    const photoBlock = `
      <div class="ps-drop" id="psDrop" role="button" tabindex="0">
        <span class="ps-drop-ico">${icon('camera', 26)}</span>
        <span class="ps-drop-title">Загрузить фото</span>
        <span class="ps-drop-text">Фото вещи или скриншот из соцсетей, до 3 штук</span>
        <input type="file" id="psFile" accept="image/*" multiple hidden>
      </div>
      <div class="ps-thumbs" id="psThumbs">${thumbs()}</div>
      <label class="rd-label" for="psHint">Уточнение</label>
      <div class="rd-field">${icon('pencil', 18)}<input type="text" id="psHint" maxlength="120" placeholder="Например: чёрные, мужские" value="${esc(S.hint)}"></div>`;

    const textBlock = `
      <label class="rd-label" for="psQuery">Что ищем</label>
      <div class="rd-field">${icon('search', 18)}<input type="text" id="psQuery" maxlength="160" placeholder="Например: серое худи Nike оверсайз" value="${esc(S.query)}"></div>`;

    return `
      <div class="rd-screen page-enter ps">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.setCalcMode('hub')" aria-label="Назад">${icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">${title}</h1><p class="rd-head-sub">${sub}</p></div>
        </div>

        <div class="rd-card ps-form">
          ${isPhoto ? photoBlock : textBlock}

          <div class="rd-label">Площадка</div>
          <div class="rd-chips ps-platforms">
            ${PLATFORMS.map((p) => `<button type="button" class="rd-chip${p.ready ? ' on' : ''}" ${p.ready ? '' : 'disabled'} data-platform="${p.id}">${p.label}</button>`).join('')}
          </div>
          <p class="ps-note">Пока ищем только на Pinduoduo, остальные площадки подключаем.</p>

          <div class="rd-label">Подлинность</div>
          <div class="fn-seg ps-seg" id="psAuth">
            <button type="button" data-v="any" class="${S.authenticity === 'any' ? 'on' : ''}">Неважно</button>
            <button type="button" data-v="original" class="${S.authenticity === 'original' ? 'on' : ''}">Оригинал</button>
            <button type="button" data-v="replica" class="${S.authenticity === 'replica' ? 'on' : ''}">Реплика</button>
          </div>

          <label class="rd-label" for="psBudget">Бюджет под ключ</label>
          <div class="rd-field">${icon('wallet', 18)}<input type="number" inputmode="decimal" min="0" id="psBudget" placeholder="Не ограничен" value="${esc(S.budget)}"><span class="ps-cur">${window.bynSign ? window.bynSign() : ''}</span></div>

          <div class="ps-prio">
            <div class="ps-prio-head"><span>Дешевле</span><span>Качественнее</span></div>
            <input type="range" min="0" max="100" step="10" id="psPrio" value="${S.priority}" aria-label="Что важнее: цена или качество">
          </div>

          <button type="button" class="rd-btn rd-btn-block" id="psGo">${icon('search', 18)} Найти</button>
        </div>

        <div id="psOut">${renderOut()}</div>
      </div>`;
  }

  function thumbs() {
    return S.previews.map((src, i) => `
      <div class="ps-thumb"><img src="${src}" alt=""><button type="button" data-rm="${i}" aria-label="Убрать фото">${icon('x', 14)}</button></div>`).join('');
  }

  function renderOut() {
    if (S.error) {
      return `<div class="rd-empty">
        <div class="rd-empty-ico">${icon('alert', 26)}</div>
        <div class="rd-empty-title">${esc(S.error.title)}</div>
        <p class="rd-empty-text">${esc(S.error.text)}</p>
        <button type="button" class="rd-btn rd-btn-ghost" onclick="window.setCalcMode('link')">Вставить ссылку на товар</button>
      </div>`;
    }
    if (S.job && !S.results) {
      const p = S.job.progress || {};
      const pct = Math.max(4, Math.min(100, p.pct || 4));
      const label = S.job.queue_position > 0
        ? `Перед вами в очереди: ${S.job.queue_position}`
        : (p.label || 'Запускаем поиск');
      return `<div class="rd-card ps-progress" aria-live="polite">
        <div class="ps-progress-label">${esc(label)}</div>
        <div class="ps-bar"><i style="width:${pct}%"></i></div>
        <p class="ps-note">Ищем прямо в приложении Pinduoduo, это занимает до минуты.</p>
      </div>`;
    }
    if (!S.results) return '';
    return renderResults(S.results);
  }

  function renderResults(res) {
    let items = Array.isArray(res.items) ? res.items.slice() : [];
    const budget = parseFloat(S.budget) || 0;
    items.forEach((it) => { it._full = fullPriceByn(it); });
    const inBudget = budget ? items.filter((it) => it._full == null || it._full <= budget) : items;
    const over = budget ? items.length - inBudget.length : 0;
    items = inBudget;

    if (!items.length) {
      return `<div class="rd-empty">
        <div class="rd-empty-ico">${icon('search', 26)}</div>
        <div class="rd-empty-title">${over ? 'В бюджет ничего не попало' : 'Ничего не нашли'}</div>
        <p class="rd-empty-text">${over ? `Нашли ${over} вариантов дороже. Увеличьте бюджет или уберите его.` : 'Попробуйте другое фото или опишите вещь иначе.'}</p>
      </div>`;
    }
    const q = res.query_ru || res.query || '';
    return `
      <div class="rd-section"><h2>Нашли ${items.length}</h2>${over ? `<span class="rd-pill">ещё ${over} дороже бюджета</span>` : ''}</div>
      ${q ? `<p class="ps-note ps-query">Искали: ${esc(q)}</p>` : ''}
      <div class="ps-list">${items.map(card).join('')}</div>`;
  }

  function card(it, i) {
    const v = VERDICT[it.verdict] || VERDICT.unknown;
    const title = it.title_ru || it.title || 'Товар с Pinduoduo';
    const full = it._full;
    const facts = [it.sales_text, it.shop_name].filter(Boolean).map(esc).join(' · ');
    return `
      <div class="rd-card ps-item${it.url ? '' : ' wait'}" role="button" tabindex="0" data-pick="${i}" ${it.url ? '' : 'aria-disabled="true"'}>
        <div class="ps-item-img">${it.image_url ? `<img src="${esc(it.image_url)}" alt="" loading="lazy">` : icon('image', 26)}</div>
        <div class="ps-item-body">
          <div class="ps-item-title">${esc(title)}</div>
          ${facts ? `<div class="ps-item-facts">${facts}</div>` : ''}
          <div class="ps-item-tags">
            <span class="rd-status ${v.tone}">${v.text}</span>
            ${(it.tags || []).slice(0, 2).map((t) => `<span class="rd-status">${esc(t)}</span>`).join('')}
          </div>
          ${it.reason ? `<div class="ps-item-reason">${esc(it.reason)}</div>` : ''}
          <div class="ps-item-price">
            ${full != null ? `<span class="rd-price">${money(full)}</span><span class="ps-item-sub">под ключ</span>` : ''}
            ${it.price_cny ? `<span class="ps-item-sub">¥${esc(it.price_cny)} на площадке</span>` : ''}
          </div>
          ${it.url ? '' : '<div class="ps-item-wait"><span class="ug-load"><i></i>Получаем ссылку на товар…</span></div>'}
        </div>
      </div>`;
  }

  function redrawOut() {
    const out = document.getElementById('psOut');
    if (out) out.innerHTML = renderOut();
    bindResults();
  }

  // ── Обработчики ───────────────────────────────────────────────────────────
  function attach(mode) {
    const $ = (id) => document.getElementById(id);
    const drop = $('psDrop');
    const file = $('psFile');
    if (drop && file) {
      drop.onclick = () => file.click();
      drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') file.click(); };
      file.onchange = () => {
        const add = Array.from(file.files || []).filter((f) => f.type.startsWith('image/'));
        for (const f of add) {
          if (S.files.length >= 3) break;
          S.files.push(f);
          S.previews.push(URL.createObjectURL(f));
        }
        file.value = '';
        redrawThumbs();
      };
    }
    redrawThumbs();

    const hint = $('psHint');
    if (hint) hint.oninput = () => { S.hint = hint.value; };
    const query = $('psQuery');
    if (query) {
      query.oninput = () => { S.query = query.value; };
      query.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); run(mode); } };
    }
    const budget = $('psBudget');
    if (budget) budget.oninput = () => { S.budget = budget.value; if (S.results) redrawOut(); };
    const prio = $('psPrio');
    if (prio) prio.oninput = () => { S.priority = parseInt(prio.value, 10) || 50; };

    document.querySelectorAll('#psAuth button').forEach((b) => {
      b.onclick = () => {
        haptic('selection');
        S.authenticity = b.dataset.v;
        document.querySelectorAll('#psAuth button').forEach((x) => x.classList.toggle('on', x === b));
      };
    });

    const go = $('psGo');
    if (go) go.onclick = () => run(mode);
    bindResults();
    if (S.job && S.job.id && S.job.status !== 'done' && !S.error && !S._polling) poll();
  }

  function redrawThumbs() {
    const box = document.getElementById('psThumbs');
    if (!box) return;
    box.innerHTML = thumbs();
    box.querySelectorAll('[data-rm]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const i = parseInt(b.dataset.rm, 10);
        try { URL.revokeObjectURL(S.previews[i]); } catch (_) { /* уже освобождён */ }
        S.files.splice(i, 1);
        S.previews.splice(i, 1);
        redrawThumbs();
      };
    });
  }

  function bindResults() {
    document.querySelectorAll('#psOut [data-pick]').forEach((el) => {
      const open = () => pick(parseInt(el.dataset.pick, 10));
      el.onclick = open;
      el.onkeydown = (e) => { if (e.key === 'Enter') open(); };
    });
  }

  // Выбор результата: передаём ссылку в расчёт по ссылке, там уже есть выбор размера и цвета
  function pick(i) {
    const budget = parseFloat(S.budget) || 0;
    const items = (S.results?.items || []).filter((it) => !budget || it._full == null || it._full <= budget);
    const it = items[i];
    if (!it || !it.url) return;
    haptic('medium');
    window._pendingCalcUrl = it.url;
    window.setCalcMode('link');
  }

  async function uploadPhotos() {
    let sessionId = null;
    try { sessionId = localStorage.getItem('icelogix_session_id'); } catch (_) { /* приватный режим */ }
    if (!sessionId) {
      sessionId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      try { localStorage.setItem('icelogix_session_id', sessionId); } catch (_) { /* приватный режим */ }
    }
    const paths = [];
    for (const f of S.files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-40);
      const path = `${sessionId}/${Date.now()}_search_${safe}`;
      const { error } = await window.supabaseClient.storage.from('product-screenshots').upload(path, f, { contentType: f.type, upsert: false });
      if (error) throw new Error('upload');
      paths.push(path);
    }
    return paths;
  }

  async function run(mode) {
    const sb = window.supabaseClient;
    if (!sb) return;
    const isPhoto = mode === 'photo';
    if (isPhoto && !S.files.length) { U()?.toast('Добавьте хотя бы одно фото'); return; }
    if (!isPhoto && (S.query || '').trim().length < 3) { U()?.toast('Опишите вещь хотя бы парой слов'); return; }

    haptic('medium');
    S.results = null;
    S.error = null;
    S.job = { progress: { label: isPhoto ? 'Загружаем фото' : 'Запускаем поиск', pct: 4 } };
    redrawOut();
    const go = document.getElementById('psGo');
    if (go) go.disabled = true;

    try {
      const { data: online } = await sb.rpc('pdd_worker_online');
      if (!online) {
        throw Object.assign(new Error('offline'), {
          ui: { title: 'Поиск сейчас недоступен', text: 'Наш сервер поиска не на связи. Попробуйте чуть позже или нажмите «Ввести цену вручную».' },
        });
      }
      const budget = parseFloat(S.budget) || null;
      let cnyRate = 0.45;
      try { cnyRate = window.iceLogixPricing?.rates?.CNY_to_BYN || cnyRate; } catch (_) { /* курс по умолчанию */ }
      const input = {
        authenticity: S.authenticity,
        priority: S.priority,
        platforms: ['pinduoduo'],
        // Бюджет под ключ → примерный потолок цены на площадке (без доставки и комиссии)
        max_price_cny: budget ? Math.round(budget / cnyRate) : null,
      };
      if (isPhoto) {
        input.images = await uploadPhotos();
        if (S.hint.trim()) input.hint = S.hint.trim().slice(0, 120);
      } else {
        input.text = S.query.trim().slice(0, 160);
      }
      const { data: created, error } = await sb.rpc('pdd_job_create', {
        p_kind: isPhoto ? 'search_image' : 'search_text',
        p_input: input,
        p_user_id: userId(),
      });
      if (error || !created?.id) {
        const busy = /too many/.test(error?.message || '');
        throw Object.assign(new Error('create'), {
          ui: busy
            ? { title: 'Уже ищем для вас', text: 'Дождитесь окончания предыдущих поисков и попробуйте снова.' }
            : { title: 'Не получилось начать поиск', text: 'Проверьте интернет и попробуйте ещё раз.' },
        });
      }
      S.job = { id: created.id, token: created.token, progress: { label: 'Ставим в очередь', pct: 6 }, startedAt: Date.now() };
      redrawOut();
      poll();
    } catch (e) {
      S.job = null;
      S.error = e.ui || { title: 'Не получилось начать поиск', text: 'Проверьте интернет и попробуйте ещё раз.' };
      haptic('error');
      redrawOut();
      if (go) go.disabled = false;
    }
  }

  async function poll() {
    const sb = window.supabaseClient;
    if (!S.job || !S.job.id || S._polling) return;
    S._polling = true;
    try {
      while (S.job && S.job.status !== 'done') {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (!S.job) break;
        const { data } = await sb.rpc('pdd_job_status', { p_id: S.job.id, p_token: S.job.token });
        if (!data || !data.ok) continue;
        S.job = { ...S.job, ...data };
        if (data.status === 'done' || data.status === 'partial') {
          if (data.result) S.results = data.result;
          if (data.status === 'done') haptic('success');
        } else if (data.status === 'error' || data.status === 'cancelled') {
          S.error = { title: 'Поиск не удался', text: data.error || 'Попробуйте ещё раз чуть позже.' };
          S.job = null;
        } else if (!data.worker_online && data.status === 'queued') {
          S.error = { title: 'Поиск сейчас недоступен', text: 'Наш сервер поиска не на связи. Попробуйте чуть позже или посчитайте вручную по цене товара.' };
          S.job = null;
        } else if (Date.now() - (S.job.startedAt || Date.now()) > MAX_WAIT_MS) {
          S.error = { title: 'Поиск занял слишком долго', text: 'Попробуйте ещё раз или вставьте ссылку на товар.' };
          S.job = null;
        }
        if (!document.getElementById('psOut')) break; // ушли с экрана: продолжим, когда вернутся
        redrawOut();
      }
    } finally {
      S._polling = false;
      const go = document.getElementById('psGo');
      if (go && (S.results || S.error)) go.disabled = false;
    }
  }

  window.PddSearch = { render, attach };
})();
