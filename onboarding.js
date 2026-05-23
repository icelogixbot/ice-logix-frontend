// ICE LOGIX — Онбординг-сторис (Vanilla JS, browser-ready)
// Интеграция: подключить как <script src="./onboarding.js"></script>
// Использование: window.iceLogixOnboarding.open()
// Версия: 2026.05.23.01 — Glassmorphism Redesign

(function (global) {
  'use strict';

  // =====================================================================
  // 1. CSS — вставляются один раз в <head>
  // =====================================================================
  const STYLES = `
.ice-stories-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex; align-items: center; justify-content: center;
  animation: iceFadeIn 0.3s ease-out;
}
@keyframes iceFadeIn { from { opacity: 0; } to { opacity: 1; } }
.ice-story-frame {
  position: relative;
  width: 100%; max-width: 420px; height: 100%; max-height: 100vh;
  background: linear-gradient(165deg, #0A1628 0%, #0F2847 50%, #1A3A5C 100%);
  overflow: hidden;
  display: flex; flex-direction: column;
}
@media (min-width: 768px) {
  .ice-story-frame { 
    max-height: 90vh; 
    border-radius: 32px; 
    box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 80px rgba(91,191,235,0.15);
    border: 1px solid rgba(255,255,255,0.1);
  }
}
.ice-progress-container {
  position: absolute; top: 16px; left: 16px; right: 16px; z-index: 10;
  display: flex; gap: 6px;
}
.ice-progress-bar {
  flex: 1; height: 4px; background: rgba(255,255,255,0.2);
  border-radius: 4px; overflow: hidden;
}
.ice-progress-fill {
  height: 100%; width: 0; 
  background: linear-gradient(90deg, #5BBFEB, #2E9ED4);
  border-radius: 4px;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px rgba(91,191,235,0.5);
}
.ice-progress-fill.complete { width: 100% !important; }
.ice-close-btn {
  position: absolute; top: 24px; right: 20px; z-index: 11;
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  font-size: 18px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s ease;
}
.ice-close-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.05);
}
.ice-tap-zone-left, .ice-tap-zone-right {
  position: absolute; top: 0; bottom: 0; width: 35%; z-index: 5;
}
.ice-tap-zone-left { left: 0; }
.ice-tap-zone-right { right: 0; }
.ice-slide {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  padding: 70px 28px 110px;
  text-align: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.4s ease, transform 0.4s ease;
  transform: scale(0.95);
}
.ice-slide.active { 
  opacity: 1; 
  pointer-events: auto;
  transform: scale(1);
}
.ice-slide-emoji { 
  font-size: 72px; 
  margin-bottom: 20px; 
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  animation: iceFloat 3s ease-in-out infinite;
}
@keyframes iceFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.ice-slide-title {
  font-size: 26px; font-weight: 800; color: white;
  margin-bottom: 14px; line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}
.ice-slide-subtitle {
  font-size: 15px; color: rgba(255,255,255,0.8);
  line-height: 1.6; margin-bottom: 16px;
}
.ice-slide-list {
  list-style: none; padding: 0; margin: 16px 0 0 0; text-align: left;
  color: rgba(255,255,255,0.9); font-size: 14px;
}
.ice-slide-list li { 
  padding: 10px 0; 
  line-height: 1.5;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.ice-slide-list li:last-child { border-bottom: none; }
.ice-slide-card {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 16px 20px;
  border: 1px solid rgba(255,255,255,0.15);
  color: white; font-size: 14px; line-height: 1.6;
  margin-top: 16px;
  max-width: 100%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
.ice-slide-pre {
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  padding: 14px 18px;
  font-family: 'JetBrains Mono', Menlo, monospace;
  font-size: 12px;
  color: rgba(255,255,255,0.9);
  white-space: pre;
  text-align: left;
  max-width: 100%;
  overflow-x: auto;
  margin-top: 16px;
  border: 1px solid rgba(255,255,255,0.1);
}
.ice-slide-table {
  width: 100%; border-collapse: collapse; color: white; font-size: 13px;
}
.ice-slide-table th, .ice-slide-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  text-align: left;
}
.ice-slide-table th { 
  font-weight: 700; 
  color: rgba(255,255,255,0.6);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ice-slide-cta {
  position: absolute; bottom: 32px; left: 24px; right: 24px;
  display: flex; flex-direction: column; gap: 12px;
}
.ice-btn-primary {
  width: 100%; padding: 16px 24px;
  background: linear-gradient(135deg, #5BBFEB 0%, #2E9ED4 100%);
  color: white;
  border: none; border-radius: 18px;
  font-size: 16px; font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 20px rgba(91,191,235,0.4);
}
.ice-btn-primary:hover { 
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 30px rgba(91,191,235,0.5);
}
.ice-btn-primary:active { transform: scale(0.98); }
.ice-btn-secondary {
  width: 100%; padding: 14px 20px;
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(8px);
  color: white;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.ice-btn-secondary:hover {
  background: rgba(255,255,255,0.15);
  border-color: rgba(255,255,255,0.35);
}
.ice-btn-text {
  background: transparent; border: none;
  color: rgba(255,255,255,0.6);
  font-size: 14px; font-weight: 500;
  cursor: pointer;
  padding: 8px;
  transition: color 0.2s ease;
}
.ice-btn-text:hover { color: white; }
.ice-next-hint {
  position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
  color: rgba(255,255,255,0.5); font-size: 13px;
  animation: icePulse 2s infinite;
  display: flex; align-items: center; gap: 6px;
}
@keyframes icePulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
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
  const SLIDES = [
    {
      emoji: '❄️',
      title: 'Добро пожаловать в ICE LOGIX!',
      subtitle: 'Доставляем мечту из любой точки мира. Poizon, Taobao, Zalando, ASOS и 50+ площадок',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 50%, #1A3A5C 100%)',
    },
    {
      emoji: '🛍️',
      title: 'Как это работает?',
      subtitle: '',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 100%)',
      list: [
        '🔗 Находишь товар и скидываешь нам ссылку',
        '💰 Мы считаем полную стоимость — без сюрпризов',
        '📦 Покупаем, проверяем, доставляем до двери',
      ],
    },
    {
      emoji: '🌍',
      title: 'Доставляем из 4+ стран',
      subtitle: '',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 100%)',
      list: [
        '🇨🇳 <b>Китай</b> — Poizon, Dewu, Taobao, 1688',
        '🇵🇱 <b>Польша / ЕС</b> — Zalando, ASOS, H&M',
        '🇷🇺 <b>Россия</b> — Lamoda, WB, Ozon',
      ],
      card: '🕒 США, Япония, Корея, ОАЭ — <b>скоро добавим</b>',
    },
    {
      emoji: '💎',
      title: 'Честные цены',
      subtitle: 'Всё включено в итоговую стоимость',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 100%)',
      pre: `📦 Товар:              281 BYN
✈️ Доставка:            42 BYN
🤝 Комиссия:           58 BYN
═══════════════════════════
💵 ИТОГО:             381 BYN`,
    },
    {
      emoji: '❄️',
      title: 'Что такое ICE?',
      subtitle: 'Наша внутренняя валюта = ваша выгода',
      bg: 'linear-gradient(165deg, #0A1628 0%, #1A7BB5 100%)',
      list: [
        '⚖️ <b>1 BYN = 1 ICE</b> — простой курс',
        '🎁 Кэшбэк с каждого заказа',
        '💰 Тратишь на следующие покупки (до 50%)',
        '👥 Бонусы за приглашённых друзей',
      ],
    },
    {
      emoji: '📈',
      title: 'Программа лояльности',
      subtitle: 'Больше заказов = больше выгоды',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 100%)',
      table: [
        ['Уровень', 'Заказов', 'Бонус'],
        ['🆕 Новичок', '1-3', 'Стандарт'],
        ['🛍️ Шопоголик', '4-10', '−10% комиссия'],
        ['💎 VIP', '11+', '−20% + приоритет'],
      ],
    },
    {
      emoji: '⏱️',
      title: 'Сроки доставки',
      subtitle: '',
      bg: 'linear-gradient(165deg, #0A1628 0%, #0F2847 100%)',
      list: [
        '🇨🇳 <b>Китай</b>: 10-15 дней (авиа) или 30-45 (море)',
        '🇵🇱 <b>Польша</b>: 5-10 дней',
        '🇷🇺 <b>Россия</b>: 3-7 дней',
      ],
      card: '📍 Доставка до любого города Беларуси',
    },
    {
      emoji: '🚀',
      title: 'Готовы начать?',
      subtitle: 'Создайте первый заказ прямо сейчас',
      bg: 'linear-gradient(165deg, #0A1628 0%, #1A7BB5 60%, #5BBFEB 100%)',
      list: [
        '⚡ Регистрация за 30 секунд',
        '🎁 Приветственный бонус: <b>15 ICE</b>',
        '🧮 Калькулятор работает без регистрации',
      ],
      cta: [
        { type: 'primary', text: '✨ Создать заказ', action: 'newOrder' },
        { type: 'secondary', text: '🧮 Посчитать стоимость', action: 'calculator' },
        { type: 'text', text: 'Закрыть', action: 'close' },
      ],
    },
  ];

  // =====================================================================
  // 3. СОСТОЯНИЕ + РЕНДЕР
  // =====================================================================
  const SLIDE_DURATION_MS = 5000;
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
        <button class="ice-close-btn" id="iceCloseBtn" aria-label="Закрыть">✕</button>
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
          if (window.switchTab) window.switchTab('calc');
        }
      });
    });

    document.addEventListener('keydown', onKey);
    goTo(0);
  }

  function renderSlide(s, idx) {
    const listHtml = s.list ? `<ul class="ice-slide-list">${s.list.map(item => `<li>${item}</li>`).join('')}</ul>` : '';
    const cardHtml = s.card ? `<div class="ice-slide-card">${s.card}</div>` : '';
    const preHtml = s.pre ? `<div class="ice-slide-pre">${s.pre}</div>` : '';
    let tableHtml = '';
    if (s.table) {
      const [header, ...rows] = s.table;
      tableHtml = `<div class="ice-slide-card" style="padding:8px 10px;"><table class="ice-slide-table"><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    const ctaHtml = s.cta
      ? `<div class="ice-slide-cta">${s.cta.map(c => {
          const cls = c.type === 'primary' ? 'ice-btn-primary' : c.type === 'secondary' ? 'ice-btn-secondary' : 'ice-btn-text';
          return `<button class="${cls}" data-cta="${c.action}">${c.text}</button>`;
        }).join('')}</div>`
      : `<div class="ice-next-hint">Тап для следующего →</div>`;

    const subtitleHtml = s.subtitle ? `<p class="ice-slide-subtitle">${s.subtitle}</p>` : '';

    return `
      <div class="ice-slide" data-slide="${idx}" style="background: ${s.bg};">
        <div class="ice-slide-emoji">${s.emoji}</div>
        <h2 class="ice-slide-title">${s.title}</h2>
        ${subtitleHtml}
        ${listHtml}
        ${cardHtml}
        ${preHtml}
        ${tableHtml}
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
