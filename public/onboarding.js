// ICE LOGIX — Онбординг-сторис (Vanilla JS, browser-ready)
// Интеграция: подключить как <script src="./onboarding.js"></script>
// Использование: window.iceLogixOnboarding.open()
// Версия: 2026.10.30 — новый дизайн: объёмные иконки, только реальные условия сервиса

(function (global) {
  'use strict';

  // =====================================================================
  // 1. CSS — вставляются один раз в <head>
  // =====================================================================
  const STYLES = `
.ice-stories-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: #05070B;
  display: flex; align-items: center; justify-content: center;
  animation: iceFadeIn 0.3s ease-out;
  -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none;
  font-family: 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif;
}
@keyframes iceFadeIn { from { opacity: 0; } to { opacity: 1; } }
.ice-story-frame { position: relative; width: 100%; max-width: 440px; height: 100%; overflow: hidden; display: flex; flex-direction: column; background: #05070B; }
@media (min-width: 768px) { .ice-story-frame { max-height: 92vh; border-radius: 32px; border: 1px solid #1C2738; box-shadow: 0 30px 80px rgba(0,0,0,0.6); } }
.ice-progress-container { position: absolute; top: calc(14px + env(safe-area-inset-top, 0px)); left: 16px; right: 64px; z-index: 10; display: flex; gap: 5px; }
.ice-progress-bar { flex: 1; height: 3px; background: rgba(255,255,255,0.16); border-radius: 3px; overflow: hidden; }
.ice-progress-fill { height: 100%; width: 0; background: #fff; border-radius: 3px; }
.ice-progress-fill.complete { width: 100% !important; }
.ice-close-btn { position: absolute; top: calc(4px + env(safe-area-inset-top, 0px)); right: 12px; z-index: 11; width: 40px; height: 40px; border-radius: 13px; border: 0; background: rgba(255,255,255,0.08); color: #F3F6FB; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ice-tap-zone-left, .ice-tap-zone-right { position: absolute; top: 60px; bottom: 120px; width: 35%; z-index: 5; }
.ice-tap-zone-left { left: 0; } .ice-tap-zone-right { right: 0; }
.ice-slide { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 80px 24px 130px; text-align: center; opacity: 0; pointer-events: none; transition: opacity .3s ease; }
.ice-slide.active { opacity: 1; pointer-events: auto; }
.ice-slide-glow { position: absolute; inset: 0; z-index: -1; background: radial-gradient(70% 45% at 50% 30%, var(--g, rgba(47,134,245,0.35)), transparent 70%); }
.ice-slide.active .ice-slide-art { animation: icePop .55s cubic-bezier(.3,1.5,.5,1) both; }
@keyframes icePop { from { transform: scale(.6) rotate(-10deg); opacity: 0; } to { transform: scale(1) rotate(-6deg); opacity: 1; } }
.ice-slide-art { width: 112px; height: 112px; margin-bottom: 26px; border-radius: 34px; display: flex; align-items: center; justify-content: center; color: #fff; transform: rotate(-6deg);
  background: var(--a, linear-gradient(150deg, #5AA8FF, #1650B8));
  box-shadow: 0 26px 50px -16px var(--s, rgba(31,111,224,0.9)), inset 0 3px 0 rgba(255,255,255,0.35), inset 0 -8px 16px rgba(0,20,70,0.35); }
.ice-slide-art svg { width: 52px; height: 52px; }
.ice-slide-art img { width: 96px; height: 96px; object-fit: contain; }
.ice-slide-title { margin: 0 0 10px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; color: #F3F6FB; }
.ice-slide-subtitle { margin: 0; max-width: 340px; font-size: 15.5px; line-height: 1.55; color: #A3AFC2; }
.ice-slide-list { list-style: none; padding: 6px 16px; margin: 22px 0 0; width: 100%; max-width: 380px; text-align: left; border-radius: 20px; background: #0B1018; border: 1px solid #1C2738; }
.ice-slide-list li { display: flex; align-items: center; gap: 12px; padding: 12px 0; font-size: 15px; line-height: 1.4; color: #F3F6FB; border-bottom: 1px solid #1C2738; }
.ice-slide-list li:last-child { border-bottom: 0; }
.ice-slide-list li > i { width: 36px; height: 36px; flex-shrink: 0; border-radius: 11px; background: rgba(77,163,255,0.13); color: #4DA3FF; display: flex; align-items: center; justify-content: center; font-style: normal; }
.ice-slide-list li > i svg { width: 19px; height: 19px; }
.ice-slide-list b { color: #fff; }
.ice-slide-bill { width: 100%; max-width: 340px; margin-top: 22px; padding: 6px 16px; border-radius: 20px; background: #0B1018; border: 1px solid #1C2738; text-align: left; }
.ice-slide-bill div { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; color: #A3AFC2; border-bottom: 1px solid #1C2738; }
.ice-slide-bill div b { color: #F3F6FB; font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; gap: 3px; }
.ice-slide-bill div:last-child { border-bottom: 0; font-size: 17px; color: #F3F6FB; font-weight: 800; }
.ice-slide-bill div:last-child b { font-size: 20px; }
.ice-slide-bill small { display: block; padding: 8px 0 6px; font-size: 12px; color: #7C899D; }
.ice-slide-cta { position: absolute; bottom: calc(26px + env(safe-area-inset-bottom, 0px)); left: 20px; right: 20px; z-index: 6; display: flex; flex-direction: column; gap: 10px; }
.ice-btn-primary { height: 54px; border: 0; border-radius: 16px; background: #1F6FE0; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 14px 28px -12px rgba(31,111,224,0.9); }
.ice-btn-primary:active, .ice-btn-secondary:active { transform: scale(0.98); }
.ice-btn-secondary { height: 50px; border: 1px solid #2A3A52; border-radius: 16px; background: transparent; color: #F3F6FB; font-size: 15px; font-weight: 700; cursor: pointer; }
.ice-btn-text { height: 40px; border: 0; background: transparent; color: #7C899D; font-size: 14px; font-weight: 600; cursor: pointer; }
.ice-next-hint { position: absolute; bottom: calc(34px + env(safe-area-inset-bottom, 0px)); left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 6px; color: #7C899D; font-size: 13.5px; font-weight: 600; animation: icePulse 2s infinite; }
@keyframes icePulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
`;

  function injectStyles() {
    if (document.getElementById('ice-onboarding-styles')) return;
    const s = document.createElement('style');
    s.id = 'ice-onboarding-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  // =====================================================================
  // 2. КОНТЕНТ СЛАЙДОВ - Ice Theme
  // =====================================================================
  // Иконки берём из общего набора приложения (window.UI), он уже загружен к моменту показа
  const ic = (name) => (global.UI && global.UI.icon ? global.UI.icon(name, 22) : '');
  const rub = () => (global.bynSign ? global.bynSign({ size: '0.85em' }) : '');

  const SLIDES = [
    {
      art: 'logo',
      title: 'Вещи из Китая с доставкой в Беларусь',
      subtitle: 'Poizon, Taobao, 1688 и другие площадки. Выкупим, проверим и привезём.',
    },
    {
      art: 'link',
      glow: 'rgba(47,134,245,0.32)',
      title: 'Как это работает',
      list: [
        ['link', 'Присылаете ссылку, фото или название вещи'],
        ['calc', 'Сразу видите цену под ключ'],
        ['box', 'Выкупаем, проверяем и отправляем'],
        ['truck', 'Через 10–15 дней забираете в Беларуси'],
      ],
    },
    {
      art: 'receipt',
      glow: 'rgba(61,214,140,0.25)',
      a: 'linear-gradient(150deg, #8AF2BE, #1E9E62)', s: 'rgba(43,191,118,0.8)',
      title: 'Цена без сюрпризов',
      subtitle: 'В итог уже входит всё: вещь, доставка и наша работа.',
      bill: true,
    },
    {
      art: 'gift',
      glow: 'rgba(255,194,74,0.25)',
      a: 'linear-gradient(150deg, #FFE08A, #E4962B)', s: 'rgba(242,169,59,0.8)',
      title: 'Бонусы и кошелёк',
      list: [
        ['wallet', 'Баланс в рублях: платите заказы в один тап'],
        ['users', '<b>7%</b> с заказов друзей, другу <b>3%</b> кэшбэка'],
        ['gift', 'Баллы меняются на скидки и подарки'],
      ],
    },
    {
      art: 'zap',
      title: 'Начнём?',
      subtitle: 'Посчитайте первую вещь, это бесплатно и без регистрации.',
      cta: [
        { type: 'primary', text: 'Посчитать вещь', action: 'calculator' },
        { type: 'secondary', text: 'Смотреть площадки', action: 'catalogs' },
        { type: 'text', text: 'Позже', action: 'close' },
      ],
    },
  ];

  // =====================================================================
  // 3. СОСТОЯНИЕ + РЕНДЕР
  // =====================================================================
  const SLIDE_DURATION_MS = 6000;
  let currentIndex = 0;
  let progressTimer = null;
  let progressStartTs = 0;
  let progressElapsed = 0;
  let isPaused = false;
  let overlayEl = null;

  function getEl(sel) { return overlayEl?.querySelector(sel); }

  function renderOverlay() {
    injectStyles();
    if (overlayEl) return; // уже открыт
    currentIndex = 0;

    const overlay = document.createElement('div');
    overlay.className = 'ice-stories-overlay';
    overlay.innerHTML = `
      <div class="ice-story-frame" id="iceStoryFrame">
        <div class="ice-progress-container">
          ${SLIDES.map((_, i) => `
            <div class="ice-progress-bar"><div class="ice-progress-fill" data-slide="${i}"></div></div>
          `).join('')}
        </div>
        <button type="button" class="ice-close-btn" id="iceCloseBtn" aria-label="Закрыть">${ic('x') || '✕'}</button>
        <div class="ice-tap-zone-left" id="iceZoneLeft"></div>
        <div class="ice-tap-zone-right" id="iceZoneRight"></div>
        ${SLIDES.map((s, i) => renderSlide(s, i)).join('')}
      </div>
    `;
    document.body.appendChild(overlay);
    overlayEl = overlay;

    getEl('#iceCloseBtn').addEventListener('click', closeOverlay);
    getEl('#iceZoneLeft').addEventListener('click', () => goTo(currentIndex - 1));
    getEl('#iceZoneRight').addEventListener('click', () => goTo(currentIndex + 1));

    const frame = getEl('#iceStoryFrame');
    frame.addEventListener('mousedown', pause);
    frame.addEventListener('touchstart', pause, { passive: true });
    frame.addEventListener('mouseup', resume);
    frame.addEventListener('touchend', resume);
    frame.addEventListener('mouseleave', resume);

    overlay.querySelectorAll('[data-cta]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.cta;
        if (action === 'close') closeOverlay();
        else if (action === 'newOrder') {
          closeOverlay();
          if (window.switchTab) window.switchTab('neworder');
        } else if (action === 'calculator') {
          closeOverlay();
          if (window.switchTab) window.switchTab('calculator');
        } else if (action === 'catalogs') {
          closeOverlay();
          if (window.switchTab) window.switchTab('catalogs', 'marketplaces');
        }
      });
    });

    document.addEventListener('keydown', onKey);
    goTo(0);
  }

  function renderSlide(s, idx) {
    const art = s.art === 'logo' ? '<img src="/assets/logo.png" alt="">' : ic(s.art);
    const artStyle = s.art === 'logo' ? 'background:linear-gradient(150deg,#123A80,#0B1B3E)' : (s.a ? `--a:${s.a};--s:${s.s}` : '');
    const listHtml = s.list ? `<ul class="ice-slide-list">${s.list.map(([icon, text]) => `<li><i>${ic(icon)}</i><span>${text}</span></li>`).join('')}</ul>` : '';
    const billHtml = s.bill ? `
      <div class="ice-slide-bill">
        <small>Пример: кроссовки за 625 ¥</small>
        <div><span>Вещь</span><b>281${rub()}</b></div>
        <div><span>Доставка</span><b>42${rub()}</b></div>
        <div><span>Комиссия</span><b>58${rub()}</b></div>
        <div><span>Итого</span><b>381${rub()}</b></div>
      </div>` : '';
    const ctaHtml = s.cta
      ? `<div class="ice-slide-cta">${s.cta.map(c => {
          const cls = c.type === 'primary' ? 'ice-btn-primary' : c.type === 'secondary' ? 'ice-btn-secondary' : 'ice-btn-text';
          return `<button type="button" class="${cls}" data-cta="${c.action}">${c.text}</button>`;
        }).join('')}</div>`
      : `<div class="ice-next-hint">Нажмите, чтобы дальше ${ic('chevR')}</div>`;

    return `
      <div class="ice-slide" data-slide="${idx}" style="${s.glow ? `--g:${s.glow}` : ''}">
        <div class="ice-slide-glow"></div>
        <div class="ice-slide-art" style="${artStyle}">${art}</div>
        <h2 class="ice-slide-title">${s.title}</h2>
        ${s.subtitle ? `<p class="ice-slide-subtitle">${s.subtitle}</p>` : ''}
        ${listHtml}
        ${billHtml}
        ${ctaHtml}
      </div>
    `;
  }

  function goTo(index) {
    if (!overlayEl) return;
    if (index < 0) { currentIndex = 0; return; }
    if (index >= SLIDES.length) { closeOverlay(); return; }
    currentIndex = index;
    overlayEl.querySelectorAll('.ice-slide').forEach(el => el.classList.remove('active'));
    overlayEl.querySelector(`.ice-slide[data-slide="${index}"]`)?.classList.add('active');
    overlayEl.querySelectorAll('.ice-progress-fill').forEach((el, i) => {
      if (i < index) { el.style.width = '100%'; el.classList.add('complete'); }
      else { el.style.width = '0%'; el.classList.remove('complete'); }
    });
    startProgress();
  }

  function startProgress(resetElapsed) {
    stopProgress();
    progressStartTs = Date.now();
    if (resetElapsed !== false) progressElapsed = 0;
    const fill = overlayEl?.querySelector(`.ice-progress-fill[data-slide="${currentIndex}"]`);
    const tick = () => {
      if (isPaused || !overlayEl) return;
      const now = Date.now();
      progressElapsed += now - progressStartTs;
      progressStartTs = now;
      const pct = Math.min(100, (progressElapsed / SLIDE_DURATION_MS) * 100);
      if (fill) fill.style.width = `${pct}%`;
      if (pct >= 100) { stopProgress(); goTo(currentIndex + 1); return; }
      progressTimer = requestAnimationFrame(tick);
    };
    progressTimer = requestAnimationFrame(tick);
  }
  function stopProgress() {
    if (progressTimer) { cancelAnimationFrame(progressTimer); progressTimer = null; }
  }

  function pause() { isPaused = true; }
  function resume() {
    if (isPaused) { isPaused = false; progressStartTs = Date.now(); startProgress(false); }
  }

  function onKey(e) {
    if (e.key === 'Escape') closeOverlay();
    else if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    else if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
  }

  function closeOverlay() {
    stopProgress();
    document.removeEventListener('keydown', onKey);
    overlayEl?.remove();
    overlayEl = null;
    try { localStorage.setItem('ice_onboarding_shown', '1'); } catch (_e) {}
  }

  // =====================================================================
  // 4. ЭКСПОРТ
  // =====================================================================
  global.iceLogixOnboarding = {
    open: renderOverlay,
    close: closeOverlay,
    hasBeenShown: () => {
      try { return localStorage.getItem('ice_onboarding_shown') === '1'; } catch (_e) { return false; }
    },
    reset: () => { try { localStorage.removeItem('ice_onboarding_shown'); } catch (_e) {} },
    version: '2026.05.08.02',
  };

})(typeof window !== 'undefined' ? window : globalThis);
