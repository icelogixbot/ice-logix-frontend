// Потянуть вниз у верха страницы — обновить текущий экран (как в Wildberries).
// Страница сама едет вниз за пальцем, в освободившемся месте проявляется спиннер.
// Не перезагружает приложение: сбрасывает кэши данных и заново рисует экран через renderCurrentScreen().
// Не включается на экранах с вводом (заказ, калькулятор, корзина, проверка паспорта), внутри
// окон и шторок (всё, что position: fixed) и внутри блоков, прокрученных не к самому верху.
// Горизонтальные ленты (баннеры, карточки) жест не блокируют: вбок листает лента, вниз — обновление.
(function () {
  if (window.__pullRefreshInit) return;
  window.__pullRefreshInit = true;

  const THRESHOLD = 60;      // на сколько px должна уехать страница, чтобы обновилось
  const MAX_PULL = 150;      // предел, к которому страница подходит всё медленнее
  const HOLD = 56;           // на сколько страница остаётся опущенной, пока идёт обновление
  const SPINNER = 28;        // размер спиннера, px
  const DEAD_ZONE = 6;       // дрожь пальца не считаем
  const MIN_SHOW_MS = 800;   // спиннер не мигает на быстрых экранах
  const BACK_MS = 300;       // сколько страница возвращается на место
  const EASE = 'cubic-bezier(.22,.9,.3,1)';
  const IN_MS = 260;         // сколько новый экран проявляется на месте скелетона
  const HOLD_MS = 340;       // пока страница доезжает до спиннера, экран не перерисовываем (тяжёлая работа сбила бы анимацию)
  const BLOCKED_TABS = ['neworder', 'calculator', 'cart', 'legitcheck', 'kyc', 'checkout'];

  let el = null;
  let startY = 0, startX = 0, pull = 0;
  let tracking = false, armed = false, refreshing = false, releasing = false, ready = false;
  let headerBottom = 0, firstTop = 0;   // где кончается шапка и где начинается первый блок экрана (на старте жеста)
  let raf = 0, backTimer = 0;

  function build() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'ptr';
    el.setAttribute('aria-hidden', 'true');
    let spokes = '';
    for (let i = 0; i < 12; i++) {
      // 12 лучей по кругу, i=11 — самый «свежий»
      spokes += '<line class="ptr-spoke" style="--i:' + i + '" x1="12" y1="2.5" x2="12" y2="7" transform="rotate(' + (i * 30) + ' 12 12)"/>';
    }
    el.innerHTML = '<svg class="ptr-spinner" viewBox="0 0 24 24" width="' + SPINNER + '" height="' + SPINNER + '">' + spokes + '</svg>';
    document.body.appendChild(el);
    return el;
  }

  function haptic(t) { try { if (window.tgUtil && window.tgUtil.haptic) window.tgUtil.haptic(t); } catch (_) {} }
  function scrollTop() { return window.scrollY || document.documentElement.scrollTop || 0; }
  function contentEl() { return document.getElementById('content'); }

  // Резиновое сопротивление: сперва почти 1:1, дальше всё туже, к MAX_PULL подходит плавно
  function rubber(d) { return d <= 0 ? 0 : (MAX_PULL * d) / (d + MAX_PULL * 1.2); }

  // Можно ли начинать жест с этого места
  function canStart(target) {
    if (refreshing || releasing) return false;
    if (scrollTop() > 0) return false;
    let tab = '';
    try { tab = typeof currentTab !== 'undefined' ? currentTab : ''; } catch (_) {}
    if (BLOCKED_TABS.includes(tab)) return false;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
    for (let n = target; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.nodeType !== 1) continue;
      const cs = getComputedStyle(n);
      if (cs.position === 'fixed') return false;                       // шапка, меню, окна, шторки
      const oy = cs.overflowY;
      // вертикальный блок, уже прокрученный вниз, сам заберёт жест; горизонтальные ленты не мешают
      if ((oy === 'auto' || oy === 'scroll') && n.scrollTop > 0) return false;
    }
    return true;
  }

  // Замеряем, где шапка и где начало экрана — чтобы поставить спиннер ровно посередине просвета
  function measure() {
    const header = document.querySelector('.app-header');
    const c = contentEl();
    headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const first = c && c.firstElementChild;
    firstTop = first ? first.getBoundingClientRect().top : (c ? c.getBoundingClientRect().top + 96 : headerBottom + 16);
  }

  // Рисуем кадр: страница уехала на px вниз; спиннер — по центру просвета между шапкой и первым блоком
  function paint(px, p, fade) {
    const node = build();
    const c = contentEl();
    if (c) c.style.translate = '0 ' + px.toFixed(1) + 'px';
    const gap = Math.max(0, firstTop + px - headerBottom);
    node.style.setProperty('--ptr-y', (headerBottom + gap / 2 - SPINNER / 2).toFixed(1) + 'px');
    node.style.setProperty('--ptr-p', p.toFixed(3));
    // пока просвет меньше спиннера, он проявляется, а не торчит из-под шапки
    node.style.setProperty('--ptr-o', fade ? Math.max(0, Math.min(1, (gap - 4) / SPINNER)).toFixed(3) : '1');
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (armed) paint(pull, Math.min(1, pull / THRESHOLD), true);
    });
  }

  function start() {
    armed = true;
    clearTimeout(backTimer);
    measure();
    const c = contentEl();
    if (c) { c.style.transition = 'none'; c.style.willChange = 'translate'; }
    const node = build();
    node.classList.remove('ptr-spin');
    node.classList.add('ptr-drag', 'ptr-on');
  }

  // Вернуть страницу на место; когда доехала — снимаем смещение совсем (иначе fixed-окна внутри уехали бы)
  function release() {
    releasing = true;
    armed = false; ready = false; pull = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    const c = contentEl();
    if (c) {
      c.style.transition = 'translate ' + BACK_MS + 'ms ' + EASE;
      c.style.translate = '0 0';
    }
    if (el) el.classList.remove('ptr-on', 'ptr-spin', 'ptr-drag');
    clearTimeout(backTimer);
    backTimer = setTimeout(() => {
      const cc = contentEl();
      if (cc) { cc.style.translate = ''; cc.style.transition = ''; cc.style.willChange = ''; }
      releasing = false;
      refreshing = false;
    }, BACK_MS + 30);
  }

  // Скелетон: детали экрана гаснут и остаются серые пустые блоки (стили — .ptr-skel в ice-screens.css)
  // Находит крупные «плитки» (карточки, баннеры, обложки) — самые внешние, с фоном или картинкой, не мельче 56×40.
  // Они получают .ptr-blk: ровный силуэт, всё внутри скрыто (никаких вложенных блоков, точек и плашек).
  function markBlocks(c) {
    const cr = c.getBoundingClientRect();
    const walk = (el) => {
      for (const ch of el.children) {
        if (ch.tagName === 'SCRIPT' || ch.tagName === 'STYLE') continue;
        const r = ch.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        const cs = getComputedStyle(ch);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const big = r.width >= 56 && r.height >= 40 && r.width <= cr.width + 2;
        const media = ch.tagName === 'IMG' || ch.tagName === 'VIDEO' || ch.tagName === 'CANVAS';
        const bg = cs.backgroundImage !== 'none' || !/^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$|^transparent$/.test(cs.backgroundColor);
        if (big && (bg || media)) { ch.classList.add('ptr-blk'); continue; }
        if (ch.firstElementChild) walk(ch);
      }
    };
    walk(c);
  }

  let skelObs = null;
  function skeleton(on) {
    const c = contentEl();
    if (!c) return;
    c.querySelectorAll('.ptr-blk').forEach((n) => n.classList.remove('ptr-blk'));
    if (skelObs) { skelObs.disconnect(); skelObs = null; }
    if (on) {
      try { markBlocks(c); } catch (_) {}
      // экран перерисовывается прямо под скелетоном — новые плитки отмечаем сразу, до отрисовки кадра
      skelObs = new MutationObserver(() => {
        skelObs.disconnect();
        c.classList.remove('ptr-skel');                  // без скелетона фоны читаются как есть (перекраска синхронная, кадр не рисуется)
        try { markBlocks(c); } catch (_) {}
        c.classList.add('ptr-skel');
        skelObs.observe(c, { childList: true, subtree: true });
      });
      skelObs.observe(c, { childList: true, subtree: true });
    }
    c.classList.toggle('ptr-skel', on);
    if (!on) {
      c.classList.add('ptr-in');
      setTimeout(() => { const cc = contentEl(); if (cc) cc.classList.remove('ptr-in'); }, IN_MS + 40);
    }
  }

  // Сбросить всё, что приложение держит в памяти, и заново нарисовать текущий экран
  async function softRefresh() {
    try { if (typeof _tabCache !== 'undefined') Object.keys(_tabCache).forEach((k) => { delete _tabCache[k]; }); } catch (_) {}
    try { if (typeof _pdCache !== 'undefined') _pdCache = {}; } catch (_) {}
    try { if (typeof _memHomeDbMarketplaces !== 'undefined') _memHomeDbMarketplaces = null; } catch (_) {}
    try { if (typeof _memHomeProductsList !== 'undefined') _memHomeProductsList = null; } catch (_) {}
    try { if (window.CacheDB && typeof window.CacheDB.clearAll === 'function') window.CacheDB.clearAll(); } catch (_) {}
    try {
      const f = window._financesCache;
      if (f) Object.keys(f).forEach((k) => { f[k] = Array.isArray(f[k]) ? [] : null; });
    } catch (_) {}
    try { if (typeof window.invalidateAdminCache === 'function') window.invalidateAdminCache(); } catch (_) {}
    if (typeof renderCurrentScreen === 'function') await renderCurrentScreen();
  }

  async function run() {
    refreshing = true;
    clearTimeout(backTimer);
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!armed) measure();                                // запуск не жестом (PullRefresh.run())
    armed = false;
    const node = build();
    const c = contentEl();
    if (c) {
      c.style.willChange = 'translate';
      c.style.transition = 'translate .32s ' + EASE;
    }
    node.classList.remove('ptr-drag');
    node.classList.add('ptr-spin', 'ptr-on');
    paint(HOLD, 1, false);
    haptic('medium');
    const t0 = Date.now();
    if (c) c.classList.add('ptr-run');                    // на время обновления гасим собственные «въезды» экрана
    skeleton(true);
    await new Promise((r) => setTimeout(r, HOLD_MS));     // страница доехала, скелетон показан — теперь можно грузить
    try { await softRefresh(); } catch (e) { console.warn('[pull-refresh]', e); }
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - t0));
    setTimeout(() => {
      skeleton(false);                                    // скелетон сменяется новым экраном, пока страница возвращается на место
      release();
      haptic('success');
      setTimeout(() => { const cc = contentEl(); if (cc) cc.classList.remove('ptr-run'); }, IN_MS + 80);
    }, wait);
  }

  document.addEventListener('touchstart', (e) => {
    tracking = false;
    if (armed) return;
    if (!e.touches || e.touches.length !== 1) return;
    if (!canStart(e.target)) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    if (!e.touches || e.touches.length !== 1) {          // второй палец — это уже не наш жест
      tracking = false;
      if (armed) release();
      return;
    }
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    if (!armed) {
      // пока палец не сдвинулся заметно, направление не решаем (дрожь в 1–2 px не должна срывать жест)
      if (Math.hypot(dx, dy) < DEAD_ZONE + 2) return;
      // вверх, вбок или страница уже поехала — это обычная прокрутка
      if (dy <= 0 || scrollTop() > 0 || Math.abs(dx) > Math.abs(dy)) { tracking = false; return; }
      start();
    } else if (scrollTop() > 0) {                         // пока тянули, страница вдруг поехала вверх
      tracking = false;
      release();
      return;
    }
    // палец можно вести обратно — страница едет следом, жест не отменяется
    pull = rubber(dy - DEAD_ZONE);
    const nowReady = pull >= THRESHOLD;
    if (nowReady !== ready) {
      ready = nowReady;
      if (ready) haptic('light');
    }
    schedule();
    // на старых iOS без overscroll-behavior страница иначе сама «пружинит» вместе с нашим сдвигом
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!tracking) return;
    tracking = false;
    if (!armed) return;
    if (pull >= THRESHOLD) run(); else release();
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    if (!tracking) return;
    tracking = false;
    if (armed) release();
  }, { passive: true });

  window.PullRefresh = { run: () => (refreshing || releasing ? null : run()) };
})();
