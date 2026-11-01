// Потянуть вниз у верха страницы — обновить текущий экран (как на обычных сайтах).
// Не перезагружает приложение: сбрасывает кэши и заново рисует экран через renderCurrentScreen().
// Не включается на экранах с вводом (заказ, калькулятор, корзина, проверка паспорта), внутри
// окон и шторок (всё, что position: fixed), в горизонтальных лентах и в прокручиваемых блоках.
(function () {
  if (window.__pullRefreshInit) return;
  window.__pullRefreshInit = true;

  const THRESHOLD = 72;      // сколько тянуть, чтобы обновилось
  const MAX_PULL = 120;      // дальше индикатор не уезжает
  const MIN_SHOW_MS = 700;   // крутилка не мигает на быстрых экранах
  const BLOCKED_TABS = ['neworder', 'calculator', 'cart', 'legitcheck', 'kyc', 'checkout'];

  let el = null;
  let startY = 0, startX = 0, pull = 0, tracking = false, refreshing = false, armed = false;

  function build() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'ptr';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="ptr-dot">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path class="ptr-arrow" d="M12 5v12M6 12l6 6 6-6"/>' +
      '<path class="ptr-ring" d="M12 4a8 8 0 1 0 8 8"/>' +
      '</svg></div>';
    document.body.appendChild(el);
    return el;
  }

  function haptic(t) { try { if (window.tgUtil && window.tgUtil.haptic) window.tgUtil.haptic(t); } catch (_) {} }

  function scrollTop() { return window.scrollY || document.documentElement.scrollTop || 0; }

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

  function setPull(px) {
    const node = build();
    pull = px;
    const p = Math.min(1, px / THRESHOLD);
    node.style.setProperty('--ptr-y', px + 'px');
    node.style.setProperty('--ptr-p', p.toFixed(3));
    node.classList.toggle('ptr-ready', px >= THRESHOLD);
    node.classList.add('ptr-on');
  }

  function hide() {
    if (!el) return;
    el.classList.remove('ptr-on', 'ptr-ready', 'ptr-spin', 'ptr-drag');
    el.style.setProperty('--ptr-y', '0px');
  }

  // Сбросить то, что экраны держат в памяти, и заново нарисовать текущий экран
  async function softRefresh() {
    try { if (typeof _tabCache !== 'undefined') Object.keys(_tabCache).forEach((k) => { delete _tabCache[k]; }); } catch (_) {}
    try { if (typeof _pdCache !== 'undefined') _pdCache = {}; } catch (_) {}
    try { if (typeof window.invalidateAdminCache === 'function') window.invalidateAdminCache(); } catch (_) {}
    if (typeof renderCurrentScreen === 'function') await renderCurrentScreen();
  }

  async function run() {
    refreshing = true;
    const node = build();
    node.classList.remove('ptr-drag');
    node.classList.add('ptr-spin', 'ptr-on');
    node.style.setProperty('--ptr-y', '56px');
    haptic('medium');
    const t0 = Date.now();
    try { await softRefresh(); } catch (e) { console.warn('[pull-refresh]', e); }
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - t0));
    setTimeout(() => { hide(); refreshing = false; haptic('success'); }, wait);
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
    if (!e.touches || e.touches.length !== 1) { tracking = false; hide(); return; }
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    // вверх, вбок или страница уже поехала — это обычная прокрутка
    if (dy <= 0 || scrollTop() > 0 || (!armed && Math.abs(dx) > Math.abs(dy))) {
      if (armed) hide();
      tracking = false; armed = false;
      return;
    }
    if (dy < 8) return;                                  // дрожь пальца не считаем
    armed = true;
    const node = build();
    node.classList.add('ptr-drag');
    // чем дальше тянешь, тем туже
    const eased = Math.min(MAX_PULL, (dy - 8) * 0.55);
    const wasReady = pull >= THRESHOLD;
    setPull(eased);
    if (!wasReady && eased >= THRESHOLD) haptic('light');
  }, { passive: true });

  function end() {
    if (!tracking) return;
    const go = armed && pull >= THRESHOLD;
    tracking = false; armed = false;
    if (go) run(); else { hide(); pull = 0; }
  }
  document.addEventListener('touchend', end, { passive: true });
  document.addEventListener('touchcancel', () => { if (tracking && !refreshing) { hide(); pull = 0; } tracking = false; armed = false; }, { passive: true });

  window.PullRefresh = { run: () => (refreshing ? null : run()) };
})();
