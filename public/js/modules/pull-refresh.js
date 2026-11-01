// Потянуть вниз у верха страницы — обновить текущий экран (как в Wildberries).
// Страница сама едет вниз за пальцем, в освободившемся месте проявляется спиннер.
// Не перезагружает приложение: сбрасывает кэши данных и заново рисует экран через renderCurrentScreen().
// Не включается на экранах с вводом (заказ, калькулятор, корзина, проверка паспорта), внутри
// окон и шторок (всё, что position: fixed), в горизонтальных лентах и в прокручиваемых блоках.
(function () {
  if (window.__pullRefreshInit) return;
  window.__pullRefreshInit = true;

  const THRESHOLD = 64;      // на сколько px должна уехать страница, чтобы обновилось
  const MAX_PULL = 110;      // дальше страница не уезжает
  const HOLD = 56;           // на сколько страница остаётся опущенной, пока идёт обновление
  const SPINNER = 28;        // размер спиннера, px
  const MIN_SHOW_MS = 800;   // спиннер не мигает на быстрых экранах
  const BLOCKED_TABS = ['neworder', 'calculator', 'cart', 'legitcheck', 'kyc', 'checkout'];

  let el = null;
  let startY = 0, startX = 0, pull = 0, tracking = false, refreshing = false, armed = false;
  let headerBottom = 0, firstTop = 0;   // где кончается шапка и где начинается первый блок экрана (на старте жеста)

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

  // Можно ли начинать жест с этого места
  function canStart(target) {
    if (refreshing) return false;
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
      const oy = cs.overflowY, ox = cs.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 2) return false;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 2) return false;
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

  // Страница уехала на px вниз; спиннер — по центру просвета между шапкой и первым блоком
  function place(px) {
    const node = build();
    const c = contentEl();
    if (c) c.style.translate = '0 ' + px + 'px';
    const gap = Math.max(0, firstTop + px - headerBottom);
    node.style.setProperty('--ptr-y', (headerBottom + gap / 2 - SPINNER / 2).toFixed(1) + 'px');
  }

  function setPull(px) {
    const node = build();
    pull = px;
    node.style.setProperty('--ptr-p', Math.min(1, px / THRESHOLD).toFixed(3));
    node.classList.toggle('ptr-ready', px >= THRESHOLD);
    node.classList.add('ptr-on');
    place(px);
  }

  // Вернуть страницу на место; после анимации снимаем смещение совсем (иначе fixed-окна внутри уехали бы)
  function release() {
    const c = contentEl();
    if (c) {
      c.style.transition = 'translate .28s cubic-bezier(.2,.8,.2,1)';
      c.style.translate = '0 0';
      setTimeout(() => { c.style.translate = ''; c.style.transition = ''; }, 320);
    }
    if (el) el.classList.remove('ptr-on', 'ptr-ready', 'ptr-spin', 'ptr-drag');
    pull = 0;
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
    const node = build();
    const c = contentEl();
    if (c) c.style.transition = 'translate .28s cubic-bezier(.2,.8,.2,1)';
    node.classList.remove('ptr-drag', 'ptr-ready');
    node.classList.add('ptr-spin', 'ptr-on');
    node.style.setProperty('--ptr-p', '1');
    place(HOLD);
    haptic('medium');
    const t0 = Date.now();
    try { await softRefresh(); } catch (e) { console.warn('[pull-refresh]', e); }
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - t0));
    setTimeout(() => { release(); refreshing = false; haptic('success'); }, wait);
  }

  document.addEventListener('touchstart', (e) => {
    tracking = false; armed = false;
    if (!e.touches || e.touches.length !== 1) return;
    if (!canStart(e.target)) return;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    tracking = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!tracking || refreshing) return;
    if (!e.touches || e.touches.length !== 1) { tracking = false; if (armed) release(); armed = false; return; }
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    // вверх, вбок или страница уже поехала — это обычная прокрутка
    if (dy <= 0 || scrollTop() > 0 || (!armed && Math.abs(dx) > Math.abs(dy))) {
      if (armed) release();
      tracking = false; armed = false;
      return;
    }
    if (dy < 8) return;                                  // дрожь пальца не считаем
    if (!armed) {
      armed = true;
      measure();
      const c = contentEl();
      if (c) c.style.transition = 'none';
      build().classList.add('ptr-drag');
    }
    // чем дальше тянешь, тем туже
    const eased = Math.min(MAX_PULL, (dy - 8) * 0.5);
    const wasReady = pull >= THRESHOLD;
    setPull(eased);
    if (!wasReady && eased >= THRESHOLD) haptic('light');
  }, { passive: true });

  function end() {
    if (!tracking) return;
    const go = armed && pull >= THRESHOLD;
    const wasArmed = armed;
    tracking = false; armed = false;
    if (go) run(); else if (wasArmed) release();
  }
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', () => {
    if (tracking && !refreshing && armed) release();
    tracking = false; armed = false;
  }, { passive: true });

  window.PullRefresh = { run: () => (refreshing ? null : run()) };
})();
