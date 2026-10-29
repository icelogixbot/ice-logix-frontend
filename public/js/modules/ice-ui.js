// ============================================================
// ICE LOGIX · UI kit нового дизайна
// Единые иконки, цены, карточка товара, шапки экранов, пустые состояния,
// всплывающие уведомления и шторки. Стили: public/css/ice-redesign.css + ice-screens.css.
// Правила: скилл ice-design-system.
// ============================================================
(function () {
  'use strict';

  // ── Иконки: линейные, 24×24, stroke = currentColor ──
  const P = {
    home: '<path d="M3.5 10.8 12 3.5l8.5 7.3V19a1.5 1.5 0 0 1-1.5 1.5h-3.8v-5.7H8.8v5.7H5A1.5 1.5 0 0 1 3.5 19z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    cart: '<circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17.5" cy="19.5" r="1.4"/><path d="M2.5 4h2.8l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.5-1.1L20 8H6.2"/>',
    bag: '<path d="M5.5 8h13l-1 12a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    user: '<circle cx="12" cy="8.2" r="4"/><path d="M4.5 20.5c.6-3.6 3.6-5.6 7.5-5.6s6.9 2 7.5 5.6"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.5-3 3-4.8 6.5-4.8s6 1.8 6.5 4.8"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.9c2.2.5 3.7 2 4 4.6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
    bell: '<path d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 5.6 2.2 7 2.2 7H4s2.2-1.4 2.2-7z"/><path d="M10 19.8a2.2 2.2 0 0 0 4 0"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.6 12 20 12 20z"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    chevR: '<path d="m9.5 6 6 6-6 6"/>',
    chevL: '<path d="m14.5 6-6 6 6 6"/>',
    chevD: '<path d="m6 9.5 6 6 6-6"/>',
    arrowR: '<path d="M5 12h14m-5.5-5.5L19 12l-5.5 5.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.2 12.3 2.6 2.6 5-5.3"/>',
    share: '<path d="M12 15V4m0 0L8 8m4-4 4 4M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
    camera: '<path d="M4.5 8h3l1.5-2.3h6L16.5 8h3a1 1 0 0 1 1 1v9.2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.2" r="3.3"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 18 5-5 4 4 2.5-2.5 3.5 3.5"/>',
    link: '<path d="M10.2 13.8a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1.1-1.1"/>',
    text: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4.5 7h15M9.5 11v6M14.5 11v6M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M9 7V4.5h6V7"/>',
    tag: '<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.6 6.6a1.5 1.5 0 0 1-2.1 0z"/><circle cx="8" cy="8" r="1.1"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13.5h17M12 9S10.6 4.2 8.3 5.3 9 9 12 9zm0 0s1.4-4.8 3.7-3.7S15 9 12 9z"/>',
    box: '<path d="m12 3.2 8 4.3v9l-8 4.3-8-4.3v-9z"/><path d="m4 7.5 8 4.3 8-4.3M12 11.8v8.8"/>',
    truck: '<path d="M2.5 6.5h11v9.5h-11zM13.5 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    plane: '<path d="M10.5 13.5 4 12l-1.5-1.5L5 10l5.5.8L15 5.5a2.1 2.1 0 0 1 3 3l-5.3 4.5.8 5.5-.5 2.5-1.5-1.5z"/>',
    shield: '<path d="M12 3.2 5 5.9v5.5c0 4.4 2.9 7.7 7 9.4 4.1-1.7 7-5 7-9.4V5.9z"/><path d="m8.8 12 2.3 2.3 4.2-4.4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    wallet: '<path d="M4 7.5V17a2 2 0 0 0 2 2h12.5a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5zm0 0A2.5 2.5 0 0 1 6.5 5H18"/><path d="M15.8 13.5h.01"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
    percent: '<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
    book: '<path d="M12 6.5C10.3 5.2 8 4.7 4.5 4.8v12.4c3.5-.1 5.8.4 7.5 1.7 1.7-1.3 4-1.8 7.5-1.7V4.8c-3.5-.1-5.8.4-7.5 1.7zM12 6.5v12.4"/>',
    cap: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11.5V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.5"/>',
    message: '<path d="M5 4.8h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.2L7.5 20v-3.2H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 4.8z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.1-2.5 3.6M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17.3h.01"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7.2 8.2 6 8.2-6"/>',
    key: '<circle cx="8" cy="15.5" r="4"/><path d="m10.9 12.6 8.6-8.6M16.5 7l2.5 2.5M14 9.5l2 2"/>',
    devices: '<rect x="2.5" y="4.5" width="13" height="10" rx="2"/><path d="M6 18.5h6M9 14.5v4"/><rect x="16" y="9" width="5.5" height="10.5" rx="1.5"/>',
    moon: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.8 6.8 0 0 0 10 10z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    vibrate: '<rect x="7.5" y="4" width="9" height="16" rx="2"/><path d="M4 9v6M20 9v6M11 17h2"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.3 3.6-8.4.4 1.9 1.4 2.9 2.4 3.4.2-2.6 1.6-4.9 3.4-6.4-.2 2.9 1.3 4.6 2.6 6.4 1 1.4 1.5 3 1.5 4.9 0 3.6-3 6.2-7 6.2z"/>',
    sparkles: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    receipt: '<path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    logout: '<path d="M14 4.5h4.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16l4-4-4-4M14 12H4"/>',
    crown: '<path d="m3.5 8 4.5 4 4-6.5 4 6.5 4.5-4-1.5 10.5h-14z"/>',
    zap: '<path d="M13 3 5 13.5h6.5L10.5 21 19 10h-6.5z"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16"/>',
    upload: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    send: '<path d="m21 3-9.5 9.5M21 3l-6.5 18-3-8.5L3 9.5z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ruler: '<path d="m4 15.5 11.5-11.5 4.5 4.5L8.5 20z"/><path d="m8 11.5 1.8 1.8M10.8 8.7l1.8 1.8M13.6 5.9l1.8 1.8"/>',
    store: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5v10h16v-10M9.5 19.5v-5h5v5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8"/><path d="M12 8v4.5l3 1.8"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16c.5-1.6 1.7-2.4 3.2-2.4s2.7.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
    phone: '<path d="M5 4h3.5l1.5 4.5-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
    coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M9.5 15.8c.9.4 2.2.7 3.5.7 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5"/>',
    snow: '<path d="M12 3v18M4.6 7.5l14.8 9M19.4 7.5l-14.8 9"/><path d="m9.5 4.7 2.5 1.6 2.5-1.6M9.5 19.3l2.5-1.6 2.5 1.6"/>',
  };

  function icon(name, size, opts) {
    const o = opts || {};
    const s = size || 24;
    const sw = o.stroke || 1.8;
    const fill = o.fill ? 'currentColor' : 'none';
    const cls = o.cls ? ` class="${o.cls}"` : '';
    const body = P[name] || P.info;
    return `<svg${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  // ── Экранирование ──
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ── Деньги: «1 234,50» + символ рубля ──
  function money(amount, opts) {
    const o = opts || {};
    const n = Number(amount) || 0;
    const digits = o.digits != null ? o.digits : (Math.round(n) === n && !o.keepCents ? 0 : 2);
    const txt = n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/ /g, ' ');
    const sign = typeof window.bynSign === 'function' ? window.bynSign({ size: '0.82em' }) : 'Br';
    return `<span class="rd-money${o.cls ? ' ' + o.cls : ''}">${o.prefix || ''}${txt}${sign}</span>`;
  }

  // Цена товара в рублях: BYN как есть, остальные валюты считаем под ключ через движок цен
  function productPriceByn(p) {
    const price = Number(p && p.price) || 0;
    const cur = String((p && (p.currency || p.product_currency)) || 'BYN').toUpperCase(); // design-ok: код валюты в данных
    if (!price) return { amount: 0, estimate: false };
    if (cur === 'BYN') return { amount: price, estimate: false }; // design-ok
    try {
      if (window.iceLogixPricing && typeof window.iceLogixPricing.quickEstimate === 'function') {
        const v = window.iceLogixPricing.quickEstimate(price, Number(p.weight_kg) || 1, cur, p.country || 'CN');
        if (v > 0) return { amount: v, estimate: true };
      }
    } catch (_) {}
    return { amount: 0, estimate: true };
  }

  function productImages(p) {
    let imgs = [];
    if (Array.isArray(p.image_urls) && p.image_urls.length) imgs = p.image_urls;
    else if (typeof window.getProductImages === 'function') imgs = window.getProductImages(p.image_urls || p.image_url);
    else if (p.image_url) imgs = [p.image_url];
    return imgs.filter(Boolean);
  }

  // ── Карточка товара (сетка 2 колонки) ──
  function productCard(p, inWish) {
    const imgs = productImages(p);
    const pr = productPriceByn(p);
    const brand = (p.brand || '').trim();
    const title = esc(p.title || 'Товар');
    const media = imgs.length
      ? `<div class="pc-slider" data-count="${imgs.length}">${imgs.slice(0, 6).map((u, i) => `<div class="pc-slide"><img src="${esc(u)}" alt="${title}" ${i ? 'loading="lazy"' : ''} decoding="async"></div>`).join('')}</div>
         ${imgs.length > 1 ? `<div class="pc-dots">${imgs.slice(0, 6).map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}`
      : `<div class="pc-noimg">${icon('image', 32)}</div>`;
    return `
      <article class="pc product-card" data-product-id="${esc(p.id)}" data-url="${esc(p.url || '')}" data-price="${esc(p.price)}" role="button" tabindex="0">
        <div class="pc-media">
          ${media}
          <button type="button" class="pc-fav wishlist-heart${inWish ? ' on' : ''}" data-product-id="${esc(p.id)}" aria-label="В избранное">${icon('heart', 18, { fill: !!inWish })}</button>
          ${p.is_drop ? '<span class="pc-tag">Дроп</span>' : ''}
        </div>
        <div class="pc-body">
          <div class="pc-price">${pr.amount ? (pr.estimate ? money(pr.amount, { prefix: '≈ ' }) : money(pr.amount)) : '<span class="pc-ask">Цена по запросу</span>'}</div>
          <div class="pc-title">${brand ? `<b>${esc(brand)}</b> · ` : ''}${title}</div>
          ${pr.estimate ? '<div class="pc-meta">Под ключ с доставкой</div>' : ''}
        </div>
        <button type="button" class="pc-add addToCartBtn" data-product-id="${esc(p.id)}" aria-label="В корзину">${icon('cart', 18)}<span>В корзину</span></button>
      </article>`;
  }

  // ── Шапка экрана с кнопкой «Назад» ──
  function screenHead(o) {
    const opt = o || {};
    return `
      <div class="rd-head">
        ${opt.back === false ? '' : `<button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${icon('chevL', 22)}</button>`}
        <div class="rd-head-txt">
          <h1 class="rd-head-title">${opt.title || ''}</h1>
          ${opt.sub ? `<p class="rd-head-sub">${opt.sub}</p>` : ''}
        </div>
        ${opt.right || ''}
      </div>`;
  }

  // ── Пустое состояние ──
  function empty(o) {
    const opt = o || {};
    return `
      <div class="rd-empty">
        <div class="rd-empty-ico">${icon(opt.icon || 'box', 30)}</div>
        <div class="rd-empty-title">${opt.title || 'Здесь пока пусто'}</div>
        ${opt.text ? `<p class="rd-empty-text">${opt.text}</p>` : ''}
        ${opt.action ? `<button type="button" class="rd-btn" ${opt.actionId ? `id="${opt.actionId}"` : ''} ${opt.onclick ? `onclick="${opt.onclick}"` : ''}>${opt.action}</button>` : ''}
      </div>`;
  }

  // ── Скелетон сетки товаров ──
  function gridSkeleton(n) {
    return Array.from({ length: n || 4 }).map(() => '<div class="pc pc-skel"><div class="pc-media rd-shimmer"></div><div class="rd-shimmer rd-sk-line w60"></div><div class="rd-shimmer rd-sk-line w90"></div></div>').join('');
  }

  // ── Всплывающее уведомление ──
  function toast(message, kind) {
    try {
      let host = document.getElementById('rdToastHost');
      if (!host) {
        host = document.createElement('div');
        host.id = 'rdToastHost';
        host.className = 'rd-toast-host';
        document.body.appendChild(host);
      }
      const el = document.createElement('div');
      const k = kind || 'ok';
      el.className = `rd-toast ${k}`;
      el.innerHTML = `${icon(k === 'bad' ? 'alert' : k === 'info' ? 'info' : 'checkCircle', 20)}<span>${esc(message)}</span>`;
      host.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2400);
    } catch (_) {}
  }

  // ── Шторка снизу (для коротких выборов: размер, способ и т.п.) ──
  function sheet(o) {
    const opt = o || {};
    const wrap = document.createElement('div');
    wrap.className = 'rd-sheet-wrap';
    wrap.innerHTML = `
      <div class="rd-sheet-backdrop" data-close="1"></div>
      <div class="rd-sheet" role="dialog" aria-modal="true">
        <div class="rd-sheet-handle"></div>
        ${opt.title ? `<div class="rd-sheet-head"><h3>${opt.title}</h3><button type="button" class="rd-sheet-x" data-close="1" aria-label="Закрыть">${icon('x', 20)}</button></div>` : ''}
        <div class="rd-sheet-body">${opt.html || ''}</div>
      </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = () => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 260);
      if (typeof opt.onClose === 'function') opt.onClose();
    };
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    if (typeof opt.onOpen === 'function') opt.onOpen(wrap, close);
    return { el: wrap, close };
  }

  // ── Шторка с полями ввода вместо prompt(): ответ в Promise, null если закрыли ──
  // fields: [{ name, label, type, value, placeholder, autocomplete, inputmode }]; validate(values) → текст ошибки или ''
  function ask(o) {
    const opt = o || {};
    const fields = opt.fields && opt.fields.length ? opt.fields : [{ name: 'value', type: 'text' }];
    return new Promise((resolve) => {
      let done = false;
      const html = `
        <form class="rd-ask" novalidate>
          ${opt.text ? `<p class="rd-ask-text">${opt.text}</p>` : ''}
          ${fields.map((f) => `
            <label class="rd-ask-field">
              ${f.label ? `<span class="rd-label">${esc(f.label)}</span>` : ''}
              <span class="rd-field"><input name="${esc(f.name)}" type="${esc(f.type || 'text')}" value="${esc(f.value == null ? '' : f.value)}" placeholder="${esc(f.placeholder || '')}" autocomplete="${esc(f.autocomplete || 'off')}" ${f.inputmode ? `inputmode="${esc(f.inputmode)}"` : ''}></span>
            </label>`).join('')}
          <p class="rd-ask-err" hidden></p>
          <button type="submit" class="rd-btn rd-btn-block${opt.danger ? ' rd-btn-danger' : ''}">${esc(opt.action || 'Готово')}</button>
        </form>`;
      sheet({
        title: opt.title || '',
        html,
        onClose: () => { if (!done) resolve(null); },
        onOpen: (wrap, close) => {
          const form = wrap.querySelector('form');
          const err = wrap.querySelector('.rd-ask-err');
          setTimeout(() => { const first = form.querySelector('input'); if (first) first.focus(); }, 320);
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const values = {};
            fields.forEach((f) => { values[f.name] = (form.elements[f.name].value || '').trim(); });
            const msg = typeof opt.validate === 'function' ? opt.validate(values) : '';
            if (msg) { err.textContent = msg; err.hidden = false; return; }
            done = true;
            resolve(fields.length === 1 ? values[fields[0].name] : values);
            close();
          });
        },
      });
    });
  }

  // ── Точки слайдеров карточек (делегировано, работает для любых .pc-slider) ──
  document.addEventListener('scroll', (e) => {
    const s = e.target;
    if (!s || !s.classList || !(s.classList.contains('pc-slider') || s.classList.contains('pd-gallery'))) return;
    const dots = s.parentElement && s.parentElement.querySelectorAll(s.classList.contains('pd-gallery') ? '.pd-dots i' : '.pc-dots i');
    if (!dots || !dots.length || !s.clientWidth) return;
    const idx = Math.round(s.scrollLeft / s.clientWidth);
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    const counter = s.parentElement.querySelector('.pd-counter');
    if (counter) counter.textContent = `${idx + 1} / ${dots.length}`;
  }, true);

  // ── Нажатие на карточку товара открывает страницу товара ──
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.pc.product-card');
    if (!card || e.target.closest('button, a, .pc-dots')) return;
    const id = card.dataset.productId;
    if (id && typeof window.openProduct === 'function') window.openProduct(id);
  });

  // ── Статус заказа по-человечески ──
  const ORDER_STATUS = {
    pending: ['В обработке', ''], paid: ['Оплачен', ''], bought: ['Выкуплен', ''],
    on_sklad_cn: ['На складе в Китае', ''], in_transit: ['Летит в Беларусь', ''], customs: ['На таможне', 'warn'],
    awaiting_payment: ['Ждёт доплаты', 'warn'], paid_second: ['Доплачен', ''], in_belarus: ['В Беларуси', ''],
    ready_for_pickup: ['Готов к выдаче', 'ok'], dispatched: ['Отправлен вам', ''], delivered: ['Получен', 'ok'],
    awaiting_decision: ['Нужно ваше решение', 'warn'], problem_order: ['Есть проблема', 'bad'],
    refunded: ['Возврат на баланс', 'bad'], cancelled: ['Отменён', 'bad'],
  };
  function orderStatus(st) {
    const v = ORDER_STATUS[st];
    return v ? { text: v[0], tone: v[1] } : { text: st || 'Без статуса', tone: '' };
  }

  // Название и картинка заказа: из полей заказа, первой позиции или по адресу площадки
  const SHOP_BY_HOST = [[/dewu|poizon/, 'Poizon'], [/taobao/, 'Taobao'], [/tmall/, 'Tmall'], [/yangkeduo|pinduoduo|pdd/, 'Pinduoduo'], [/1688/, '1688'], [/jd\.com|jd\.hk/, 'JD'], [/goofish|xianyu/, 'Goofish'], [/95fen/, '95fen'], [/amazon|a\.co\//, 'Amazon']];
  function orderItems(o) {
    return Array.isArray(o && o.items) && o.items.length ? o.items : (Array.isArray(o && o.cart_items) ? o.cart_items : []);
  }
  function orderTitle(o) {
    const items = orderItems(o);
    const it = items[0] || {};
    let t = (o.title || o.title_translated || o.title_original || it.title || it.name || [it.brand, it.model].filter(Boolean).join(' ') || '').trim();
    if (!t) {
      const src = String(o.source_url || it.url || '');
      const hit = SHOP_BY_HOST.find(([re]) => re.test(src));
      t = hit ? `Заказ с ${hit[1]}` : (it.platform ? `Заказ с ${it.platform}` : 'Заказ по ссылке');
    }
    return items.length > 1 ? `${t} и ещё ${items.length - 1}` : t;
  }
  function orderImage(o) {
    const it = orderItems(o)[0] || {};
    return it.imageUrl || it.image_url || it.image || (Array.isArray(o.photo_reports) && o.photo_reports[0]) || '';
  }

  // Старые модули (оформление заказа, окна профиля) зовут escHtmlC, которого нигде не было — даём им общий esc
  if (typeof window.escHtmlC !== 'function') window.escHtmlC = esc;

  window.UI = { orderTitle, orderImage, orderStatus, icon, esc, money, productPriceByn, productImages, productCard, screenHead, empty, gridSkeleton, toast, sheet, ask };
})();
