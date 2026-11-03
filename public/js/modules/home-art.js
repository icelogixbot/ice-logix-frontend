// ============================================================
// ICE LOGIX: объёмные иллюстрации главной (чистый SVG, без картинок)
// Каждая иллюстрация — функция от префикса: id градиентов не повторяются,
// даже если картинка стоит на экране дважды (плитка, трекер, баннер).
// ============================================================
(function () {
  const svg = (vb, body) => `<svg viewBox="0 0 ${vb} ${vb}" width="100%" height="100%" aria-hidden="true" focusable="false">${body}</svg>`;
  // мягкая тень под предметом
  const shadow = (p, cx, cy, rx, ry) => `<radialGradient id="${p}sh"><stop offset="0" stop-color="#021442" stop-opacity=".45"/><stop offset="1" stop-color="#021442" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${p}sh)"/>`;
  // блик сверху вниз
  const gloss = (p) => `<linearGradient id="${p}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

  // «Всё по шагам» — планшет с чек-листом
  const steps = (p) => svg(64, `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7DB7FF"/><stop offset=".55" stop-color="#2F7BFF"/><stop offset="1" stop-color="#1747B8"/></linearGradient>
      <linearGradient id="${p}pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#DCE9FF"/></linearGradient>
      <linearGradient id="${p}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#F29A12"/></linearGradient>
      ${gloss(p)}${shadow(p, 32, 59, 19, 3.6)}
      <rect x="12" y="11" width="40" height="47" rx="8" fill="#0F3590"/>
      <rect x="12" y="8" width="40" height="47" rx="8" fill="url(#${p}b)"/>
      <rect x="17" y="14" width="30" height="36" rx="4.5" fill="url(#${p}pp)"/>
      <circle cx="23" cy="22" r="3.3" fill="#2F7BFF"/><path d="M21.4 22l1.2 1.2 2.2-2.4" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="29" y="20.3" width="14" height="3.4" rx="1.7" fill="#9DB9E8"/>
      <circle cx="23" cy="31" r="3.3" fill="#2F7BFF"/><path d="M21.4 31l1.2 1.2 2.2-2.4" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="29" y="29.3" width="11" height="3.4" rx="1.7" fill="#9DB9E8"/>
      <circle cx="23" cy="40" r="3.3" fill="none" stroke="#9DB9E8" stroke-width="1.6"/>
      <rect x="29" y="38.3" width="13" height="3.4" rx="1.7" fill="#C9D8F2"/>
      <rect x="23" y="4" width="18" height="9" rx="4.5" fill="#B86A00"/>
      <rect x="23" y="3" width="18" height="8.4" rx="4.2" fill="url(#${p}c)"/>
      <rect x="26" y="4.2" width="12" height="2.6" rx="1.3" fill="#fff" opacity=".6"/>
      <path d="M16 9.5h32a4 4 0 0 1 4 4v3c-8-3-28-3-40 0v-3a4 4 0 0 1 4-4z" fill="url(#${p}gl)" opacity=".55"/>`);

  // «Мои заказы» — коробка
  const box = (p) => svg(64, `<defs>
      <linearGradient id="${p}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE7B8"/><stop offset="1" stop-color="#F5B860"/></linearGradient>
      <linearGradient id="${p}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0A64A"/><stop offset="1" stop-color="#C9731E"/></linearGradient>
      <linearGradient id="${p}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C8741F"/><stop offset="1" stop-color="#9A4F0D"/></linearGradient>
      ${shadow(p, 32, 58, 21, 3.8)}
      <polygon points="7,21 32,33 32,58 7,46" fill="url(#${p}l)"/>
      <polygon points="57,21 32,33 32,58 57,46" fill="url(#${p}r)"/>
      <polygon points="32,8 57,21 32,33 7,21" fill="url(#${p}t)"/>
      <polygon points="25,11.5 50,24 44,27 19,14.5" fill="#2F7BFF"/>
      <polygon points="44,27 50,24 50,34 44,37" fill="#1B53C9"/>
      <polygon points="32,8 57,21 54.5,22.3 32,11" fill="#fff" opacity=".55"/>
      <polygon points="11,30 23,36 23,42 11,36" fill="#fff" opacity=".9"/>
      <path d="M13 33.5l7 3.5" stroke="#C9731E" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M7 21l25 12v25" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>`);

  // «Акции» — ценник с процентом
  const tag = (p) => svg(64, `<defs>
      <linearGradient id="${p}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8AA0"/><stop offset=".5" stop-color="#FF4D6D"/><stop offset="1" stop-color="#D3123E"/></linearGradient>
      ${gloss(p)}${shadow(p, 32, 59, 19, 3.6)}
      <g transform="rotate(-16 32 32)">
        <path d="M14 17h28l12 15-12 15H14a6 6 0 0 1-6-6V23a6 6 0 0 1 6-6z" fill="#8E0A2A" transform="translate(1.5 3.5)"/>
        <path d="M14 17h28l12 15-12 15H14a6 6 0 0 1-6-6V23a6 6 0 0 1 6-6z" fill="url(#${p}t)"/>
        <path d="M14 17h28l5 6.3H12a10 10 0 0 0-4 1V23a6 6 0 0 1 6-6z" fill="url(#${p}gl)" opacity=".7"/>
        <circle cx="44.5" cy="32" r="3.4" fill="#8E0A2A"/><circle cx="44.5" cy="31.4" r="2.4" fill="#FFD1DA"/>
        <circle cx="19" cy="25.5" r="3.6" fill="none" stroke="#fff" stroke-width="2.6"/>
        <circle cx="31" cy="38.5" r="3.6" fill="none" stroke="#fff" stroke-width="2.6"/>
        <path d="M31.5 24l-13 16" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
      </g>
      <path d="M54 9l1.3 3.2 3.2 1.3-3.2 1.3L54 18l-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#FFD76A"/>`);

  // «Отзывы» — облачко с золотой звездой
  const star = (p) => svg(64, `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8CC0FF"/><stop offset="1" stop-color="#2F6FE0"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".45" stop-color="#FFC933"/><stop offset="1" stop-color="#F28C0F"/></linearGradient>
      ${shadow(p, 32, 59, 19, 3.6)}
      <path d="M10 13h32a6 6 0 0 1 6 6v17a6 6 0 0 1-6 6H24l-9 7v-7h-5a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6z" fill="#123E9E" transform="translate(0 2.5)"/>
      <path d="M10 13h32a6 6 0 0 1 6 6v17a6 6 0 0 1-6 6H24l-9 7v-7h-5a6 6 0 0 1-6-6V19a6 6 0 0 1 6-6z" fill="url(#${p}b)"/>
      <rect x="10" y="20" width="18" height="3.2" rx="1.6" fill="#fff" opacity=".85"/>
      <rect x="10" y="27" width="12" height="3.2" rx="1.6" fill="#fff" opacity=".6"/>
      <path d="M45 22l4.3 9.3 10.2 1.1-7.6 6.9 2.1 10L45 44.2l-9 5.1 2.1-10-7.6-6.9 10.2-1.1z" fill="#B85C00" transform="translate(0 2.5)" stroke="#B85C00" stroke-width="3" stroke-linejoin="round"/>
      <path d="M45 22l4.3 9.3 10.2 1.1-7.6 6.9 2.1 10L45 44.2l-9 5.1 2.1-10-7.6-6.9 10.2-1.1z" fill="url(#${p}s)" stroke="url(#${p}s)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M45 25.5l-2.7 6.4-6.6.8z" fill="#fff" opacity=".7"/>`);

  // «Фотоотчёты» — фотоаппарат
  const camera = (p) => svg(64, `<defs>
      <linearGradient id="${p}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4A5568"/><stop offset="1" stop-color="#1A202C"/></linearGradient>
      <linearGradient id="${p}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC0FF"/><stop offset="1" stop-color="#2F6FE0"/></linearGradient>
      <radialGradient id="${p}l" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="#B8DAFF"/><stop offset=".35" stop-color="#3D7BEA"/><stop offset="1" stop-color="#071A4A"/></radialGradient>
      ${gloss(p)}${shadow(p, 32, 59, 22, 3.6)}
      <rect x="20" y="11" width="20" height="10" rx="4" fill="#2D3748"/>
      <rect x="6" y="20" width="52" height="35" rx="10" fill="#0E1626" transform="translate(0 2.5)"/>
      <rect x="6" y="18" width="52" height="35" rx="10" fill="url(#${p}f)"/>
      <rect x="6" y="18" width="52" height="11" rx="10" fill="url(#${p}gl)" opacity=".55"/>
      <circle cx="32" cy="37" r="15" fill="url(#${p}c)"/>
      <circle cx="32" cy="37" r="12.5" fill="#E6EEFB"/>
      <circle cx="32" cy="37" r="10" fill="url(#${p}l)"/>
      <circle cx="28.3" cy="33.3" r="3" fill="#fff" opacity=".9"/>
      <circle cx="35.5" cy="40.5" r="1.3" fill="#fff" opacity=".5"/>
      <rect x="45" y="22.5" width="8" height="5" rx="2.5" fill="#FFD76A"/>
      <circle cx="13" cy="25" r="2" fill="#fff" opacity=".85"/>`);

  // «Легит-чек» — щит с галочкой
  const shield = (p) => svg(64, `<defs>
      <linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7EF0C2"/><stop offset=".5" stop-color="#1FC98A"/><stop offset="1" stop-color="#0A8A5C"/></linearGradient>
      <linearGradient id="${p}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3B0"/><stop offset="1" stop-color="#E8A317"/></linearGradient>
      ${gloss(p)}${shadow(p, 32, 59, 18, 3.4)}
      <path d="M32 7l22 8.5v17c0 13.5-9.5 21.5-22 26.5-12.5-5-22-13-22-26.5v-17z" fill="#05583A" transform="translate(0 2.5)"/>
      <path d="M32 5l22 8.5v17c0 13.5-9.5 21.5-22 26.5-12.5-5-22-13-22-26.5v-17z" fill="url(#${p}r)"/>
      <path d="M32 9.2l18 7v14.3c0 11-7.7 17.8-18 22.1-10.3-4.3-18-11.1-18-22.1V16.2z" fill="url(#${p}s)"/>
      <path d="M32 9.2l18 7v6c-6-2.5-30-2.5-36 0v-6z" fill="url(#${p}gl)" opacity=".6"/>
      <path d="M22.5 31.5l7 7 12.5-13.5" fill="none" stroke="#04452D" stroke-opacity=".35" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.6)"/>
      <path d="M22.5 31.5l7 7 12.5-13.5" fill="none" stroke="#fff" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>`);

  // Трекер заказа — грузовичок
  const truck = (p) => svg(64, `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#C9DCFF"/></linearGradient>
      <linearGradient id="${p}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD76A"/><stop offset="1" stop-color="#F28C0F"/></linearGradient>
      ${shadow(p, 32, 55, 25, 3.4)}
      <rect x="5" y="15" width="34" height="29" rx="5" fill="#0F3590" transform="translate(0 2.5)"/>
      <rect x="5" y="15" width="34" height="29" rx="5" fill="url(#${p}b)"/>
      <path d="M39 22h10l9 10v12H39z" fill="#B85C00" transform="translate(0 2.5)"/>
      <path d="M39 22h10l9 10v12H39z" fill="url(#${p}c)"/>
      <path d="M43 25.5h5l5.5 6.5H43z" fill="#0F3590" opacity=".85"/>
      <rect x="10" y="21" width="16" height="3" rx="1.5" fill="#2F7BFF"/>
      <rect x="10" y="27" width="10" height="3" rx="1.5" fill="#2F7BFF" opacity=".5"/>
      <circle cx="16" cy="46" r="6" fill="#1A202C"/><circle cx="16" cy="46" r="2.6" fill="#CBD5E0"/>
      <circle cx="47" cy="46" r="6" fill="#1A202C"/><circle cx="47" cy="46" r="2.6" fill="#CBD5E0"/>`);

  // ── Крупные иллюстрации для баннеров (вид 120×120) ──
  // Монета юаня
  const coin = (p) => svg(120, `<defs>
      <radialGradient id="${p}f" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FFF6C4"/><stop offset=".45" stop-color="#FFCB3D"/><stop offset="1" stop-color="#E08A00"/></radialGradient>
      <linearGradient id="${p}e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C46F00"/><stop offset="1" stop-color="#7A3F00"/></linearGradient>
      <linearGradient id="${p}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset="1" stop-color="#E39A12"/></linearGradient>
      ${shadow(p, 62, 110, 38, 6)}
      <ellipse cx="34" cy="92" rx="22" ry="8" fill="url(#${p}e)"/><ellipse cx="34" cy="86" rx="22" ry="8" fill="url(#${p}g)"/>
      <ellipse cx="34" cy="80" rx="22" ry="8" fill="url(#${p}e)"/><ellipse cx="34" cy="74" rx="22" ry="8" fill="url(#${p}g)"/>
      <ellipse cx="34" cy="74" rx="15" ry="5" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/>
      <circle cx="74" cy="56" r="37" fill="url(#${p}e)"/>
      <circle cx="68" cy="52" r="37" fill="url(#${p}f)"/>
      <circle cx="68" cy="52" r="28" fill="none" stroke="#B86500" stroke-opacity=".45" stroke-width="3"/>
      <circle cx="68" cy="52" r="28" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" transform="translate(-1 -1)"/>
      <text x="69.5" y="67.5" text-anchor="middle" font-size="44" font-weight="900" fill="#9A4F00" font-family="Arial,Helvetica,sans-serif">¥</text>
      <text x="68" y="66" text-anchor="middle" font-size="44" font-weight="900" fill="#FFF8D6" font-family="Arial,Helvetica,sans-serif">¥</text>
      <path d="M44 30a34 34 0 0 1 30-14" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/>
      <path d="M104 14l2.2 5.4 5.4 2.2-5.4 2.2-2.2 5.4-2.2-5.4-5.4-2.2 5.4-2.2z" fill="#fff"/>
      <path d="M16 36l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5z" fill="#fff" opacity=".8"/>`);

  // Подарок (приглашай друзей)
  const gift = (p) => svg(120, `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8AA0"/><stop offset="1" stop-color="#E0234E"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C21640"/><stop offset="1" stop-color="#8A0B2C"/></linearGradient>
      <linearGradient id="${p}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset="1" stop-color="#F2A10F"/></linearGradient>
      ${gloss(p)}${shadow(p, 60, 110, 40, 6)}
      <path d="M20 50h70v52a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill="url(#${p}b)"/>
      <path d="M90 50l12-6v52a6 6 0 0 1-3 5l-9 6z" fill="url(#${p}s)"/>
      <rect x="47" y="50" width="16" height="58" fill="url(#${p}r)"/>
      <path d="M63 50l12-6v58l-12 6z" fill="#C97A00"/>
      <path d="M14 36h76v16H14z" fill="url(#${p}b)"/>
      <path d="M14 36l12-6h76l-12 6z" fill="#FFB3C2"/>
      <path d="M90 36l12-6v16l-12 6z" fill="url(#${p}s)"/>
      <rect x="45" y="36" width="20" height="16" fill="url(#${p}r)"/>
      <path d="M45 36l12-6h20l-12 6z" fill="#FFF3C4"/>
      <path d="M14 36h76v6c-20-2-56-2-76 0z" fill="url(#${p}gl)" opacity=".6"/>
      <path d="M58 31c-10-16-30-14-24-2 4 7 18 4 24 2z" fill="url(#${p}r)" stroke="#C97A00" stroke-width="1.5"/>
      <path d="M62 31c10-16 30-14 24-2-4 7-18 4-24 2z" fill="url(#${p}r)" stroke="#C97A00" stroke-width="1.5"/>
      <circle cx="60" cy="31" r="5" fill="#F2A10F"/>
      <path d="M106 66l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>
      <path d="M8 76l1.4 3.4 3.4 1.4-3.4 1.4L8 85.6l-1.4-3.4-3.4-1.4 3.4-1.4z" fill="#fff" opacity=".8"/>`);

  // Пакет с покупками (каталог)
  const bag = (p) => svg(120, `<defs>
      <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#D4E4FF"/></linearGradient>
      <linearGradient id="${p}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9DB8E8"/><stop offset="1" stop-color="#6F8FC9"/></linearGradient>
      <linearGradient id="${p}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD76A"/><stop offset="1" stop-color="#F28C0F"/></linearGradient>
      ${shadow(p, 60, 110, 40, 6)}
      <path d="M44 40V30a16 16 0 0 1 32 0v10" fill="none" stroke="#0F3590" stroke-width="6" stroke-linecap="round"/>
      <path d="M22 40h66l4 62a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="url(#${p}b)"/>
      <path d="M88 40l12-8 6 66a6 6 0 0 1-3 6l-11 4z" fill="url(#${p}s)"/>
      <path d="M22 40l12-8h66l-12 8z" fill="#EAF2FF"/>
      <path d="M44 40V30a16 16 0 0 1 32 0v10" fill="none" stroke="#2F7BFF" stroke-width="5" stroke-linecap="round" transform="translate(0 -1)"/>
      <circle cx="44" cy="44" r="3.5" fill="#0F3590"/><circle cx="76" cy="44" r="3.5" fill="#0F3590"/>
      <rect x="34" y="62" width="42" height="26" rx="13" fill="url(#${p}t)"/>
      <text x="55" y="81" text-anchor="middle" font-size="16" font-weight="900" fill="#fff" font-family="Arial,Helvetica,sans-serif">CN</text>
      <path d="M104 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>`);

  const ART = {
    onboarding: steps('hqa'),
    my_orders: box('hqb'),
    promo: tag('hqc'),
    reviews: star('hqd'),
    reports: camera('hqe'),
    legitcheck: shield('hqf'),
    track: truck('hqg'),
    // баннеры
    bRate: coin('hba'),
    bGift: gift('hbb'),
    bLegit: shield('hbc'),
    bBag: bag('hbd'),
    bPromo: tag('hbe'),
  };

  window.HOME_ART = ART;
})();
