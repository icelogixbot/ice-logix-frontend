// Просмотр фото на весь экран, как в Pinduoduo: window.PhotoViewer.open(urls, start).
// Листать вбок, щипком увеличивать и двигать, двойное нажатие — приблизить, смахнуть вниз или нажать — закрыть.

(function () {
  'use strict';

  const MAX_SCALE = 5;
  const DOUBLE_SCALE = 2.5;
  const GAP = 16;
  const TAP_MS = 280;

  let closeActive = null;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const haptic = (kind) => {
    try { window.Telegram.WebApp.HapticFeedback.impactOccurred(kind); } catch (_) { /* вне Telegram */ }
  };

  function open(urls, start) {
    const list = (urls || []).filter(Boolean);
    if (!list.length || closeActive) return;

    const U = window.UI;
    const root = document.createElement('div');
    root.className = 'pv';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Просмотр фото');
    root.innerHTML = `
      <div class="pv-bg"></div>
      <div class="pv-track">${list.map(() => '<div class="pv-slide"><img class="pv-img" alt="" draggable="false"></div>').join('')}</div>
      <div class="pv-bar">
        <span class="pv-count"></span>
        <button type="button" class="pv-close" aria-label="Закрыть">${U && U.icon ? U.icon('x', 22) : '×'}</button>
      </div>`;
    document.body.appendChild(root);

    const bg = root.querySelector('.pv-bg');
    const track = root.querySelector('.pv-track');
    const count = root.querySelector('.pv-count');
    const imgs = Array.from(root.querySelectorAll('.pv-img'));

    let index = clamp(parseInt(start, 10) || 0, 0, list.length - 1);
    let scale = 1, tx = 0, ty = 0; // положение текущего фото относительно центра экрана
    let W = 0, H = 0, left = 0, top = 0;

    const pointers = new Map();
    let mode = null; // pan | pinch | swipe | dismiss | ignore
    let from = null;
    let pinch = null;
    let lastTap = null;
    let tapTimer = null;

    function measure() {
      const r = root.getBoundingClientRect();
      W = r.width; H = r.height; left = r.left; top = r.top;
    }
    const local = (p) => ({ x: p.x - left - W / 2, y: p.y - top - H / 2 });

    function fitted() {
      const im = imgs[index];
      if (!im.naturalWidth || !im.naturalHeight) return { w: W, h: H };
      const r = Math.min(W / im.naturalWidth, H / im.naturalHeight);
      return { w: im.naturalWidth * r, h: im.naturalHeight * r };
    }

    function bound(s, x, y) {
      const f = fitted();
      const mx = Math.max(0, (f.w * s - W) / 2);
      const my = Math.max(0, (f.h * s - H) / 2);
      return { x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
    }

    function drawImage(animated) {
      const im = imgs[index];
      im.classList.toggle('pv-anim', !!animated);
      im.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    }

    function drawTrack(dx, dy, animated) {
      track.classList.toggle('pv-anim', !!animated);
      track.style.transform = `translate3d(${-index * (W + GAP) + (dx || 0)}px, ${dy || 0}px, 0)`;
      bg.classList.toggle('pv-anim', !!animated);
      bg.style.opacity = String(clamp(1 - (dy || 0) / (H * 0.7 || 1), 0.25, 1));
    }

    function setZoom(s, x, y, animated) {
      const p = bound(s, x, y);
      scale = s; tx = p.x; ty = p.y;
      drawImage(animated);
    }

    function loadAround() {
      [index, index - 1, index + 1].forEach((i) => {
        if (imgs[i] && !imgs[i].getAttribute('src')) imgs[i].src = list[i];
      });
    }

    function goTo(i) {
      const next = clamp(i, 0, list.length - 1);
      if (next !== index) {
        setZoom(1, 0, 0, false); // ушли с фото — оно снова целиком
        index = next;
        haptic('light');
      }
      scale = 1; tx = 0; ty = 0;
      count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
      drawImage(false);
      drawTrack(0, 0, true);
      loadAround();
    }

    function toggleZoom(p) {
      if (scale > 1.01) { setZoom(1, 0, 0, true); return; }
      setZoom(DOUBLE_SCALE, p.x - p.x * DOUBLE_SCALE, p.y - p.y * DOUBLE_SCALE, true);
      haptic('light');
    }

    function startPinch() {
      const [a, b] = Array.from(pointers.values());
      const c = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: scale, px: (c.x - tx) / scale, py: (c.y - ty) / scale };
      mode = 'pinch';
      drawTrack(0, 0, true);
    }

    function startOne(p) {
      from = { x: p.x, y: p.y, t: Date.now(), tx, ty };
    }

    function onDown(e) {
      if (e.target.closest && e.target.closest('.pv-close')) return;
      e.preventDefault();
      try { root.setPointerCapture(e.pointerId); } catch (_) { /* указатель уже отпущен */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        startPinch();
      } else if (pointers.size === 1) {
        mode = null;
        startOne(pointers.get(e.pointerId));
      }
    }

    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (mode === 'pinch' && pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values());
        const c = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        const s = clamp(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 1, MAX_SCALE);
        setZoom(s, c.x - pinch.px * s, c.y - pinch.py * s, false); // точка между пальцами остаётся на месте
        return;
      }
      if (pointers.size !== 1 || !from) return;

      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (!mode) {
        if (Math.hypot(dx, dy) < 8) return;
        if (scale > 1.01) mode = 'pan';
        else if (Math.abs(dx) > Math.abs(dy)) mode = 'swipe';
        else mode = dy > 0 ? 'dismiss' : 'ignore';
      }
      if (mode === 'pan') {
        setZoom(scale, from.tx + dx, from.ty + dy, false);
      } else if (mode === 'swipe') {
        const edge = (index === 0 && dx > 0) || (index === list.length - 1 && dx < 0);
        drawTrack(edge ? dx * 0.3 : dx, 0, false);
      } else if (mode === 'dismiss') {
        drawTrack(0, dy, false);
      }
    }

    function onUp(e) {
      if (!pointers.has(e.pointerId)) return;
      const end = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);

      if (pointers.size === 1) { // один палец из двух убрали: продолжаем двигать оставшимся
        startOne(Array.from(pointers.values())[0]);
        mode = scale > 1.01 ? 'pan' : 'ignore';
        return;
      }
      if (pointers.size > 1) { startPinch(); return; }

      const wasMode = mode;
      mode = null;
      if (e.type === 'pointercancel') { drawTrack(0, 0, true); return; }
      if (!from) return;
      const dx = end.x - from.x;
      const dy = end.y - from.y;
      const dt = Math.max(1, Date.now() - from.t);

      if (wasMode === 'swipe') {
        const fast = Math.abs(dx) / dt > 0.5;
        goTo(Math.abs(dx) > W * 0.2 || fast ? index + (dx < 0 ? 1 : -1) : index);
      } else if (wasMode === 'dismiss') {
        if (dy > 110 || dy / dt > 0.7) close(); else drawTrack(0, 0, true);
      } else if (!wasMode) {
        onTap(local(end));
      }
    }

    function onTap(p) {
      const now = Date.now();
      if (lastTap && now - lastTap.t < TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40) {
        clearTimeout(tapTimer);
        lastTap = null;
        toggleZoom(p);
        return;
      }
      lastTap = { t: now, x: p.x, y: p.y };
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { if (scale <= 1.01) close(); }, TAP_MS);
    }

    function onWheel(e) { // компьютер: колесо приближает к указателю
      e.preventDefault();
      const c = local({ x: e.clientX, y: e.clientY });
      const s = clamp(scale * Math.exp(-e.deltaY * 0.002), 1, MAX_SCALE);
      const px = (c.x - tx) / scale;
      const py = (c.y - ty) / scale;
      setZoom(s, c.x - px * s, c.y - py * s, false);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    }

    function onResize() {
      measure();
      setZoom(scale, tx, ty, false);
      drawTrack(0, 0, false);
    }

    // Кнопка «назад» Telegram закрывает фото, а не экран под ним
    const backBtn = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.BackButton;
    const backWasVisible = !!(backBtn && backBtn.isVisible);
    const goBackBefore = window.goBackGlobal;
    if (typeof goBackBefore === 'function') window.goBackGlobal = () => close();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      closeActive = null;
      clearTimeout(tapTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (typeof goBackBefore === 'function') window.goBackGlobal = goBackBefore;
      if (backBtn) {
        try {
          backBtn.offClick(close);
          if (!backWasVisible) backBtn.hide();
        } catch (_) { /* старая версия Telegram */ }
      }
      document.body.style.overflow = prevOverflow;
      root.classList.add('pv-out');
      setTimeout(() => root.remove(), 160);
    }
    closeActive = close;

    if (backBtn) {
      try { backBtn.onClick(close); backBtn.show(); } catch (_) { /* старая версия Telegram */ }
    }

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('wheel', onWheel, { passive: false });
    root.querySelector('.pv-close').addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    imgs.forEach((im, i) => im.addEventListener('load', () => { if (i === index) setZoom(scale, tx, ty, false); }));

    measure();
    track.style.transform = `translate3d(${-index * (W + GAP)}px, 0, 0)`;
    count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
    loadAround();
    haptic('light');
  }

  window.PhotoViewer = { open, close: () => { if (closeActive) closeActive(); } };
})();
