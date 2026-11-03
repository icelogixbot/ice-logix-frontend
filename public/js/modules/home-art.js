// ============================================================
// ICE LOGIX: 3D-иллюстрации плиток главной (чистый SVG, без картинок)
// ============================================================
(function () {
  const sh = '<ellipse cx="32" cy="59" rx="17" ry="3.2" fill="#0a2a6b" opacity=".22"/>';
  const wrap = (body) => `<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false">${sh}${body}</svg>`;

  const ART = {
    // «Всё по шагам» — книга с закладкой
    onboarding: wrap(`
      <defs><linearGradient id="hmaB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FA2FF"/><stop offset="1" stop-color="#1F57C8"/></linearGradient></defs>
      <rect x="11" y="9" width="42" height="46" rx="7" fill="#12399A"/>
      <rect x="15" y="7" width="38" height="44" rx="5" fill="#EAF2FF"/>
      <rect x="12" y="11" width="40" height="45" rx="7" fill="url(#hmaB)"/>
      <rect x="12" y="11" width="40" height="45" rx="7" fill="none" stroke="#fff" stroke-opacity=".35"/>
      <path d="M40 11h8v19l-4-3.5L40 30z" fill="#FFB52E"/>
      <rect x="19" y="26" width="22" height="3.6" rx="1.8" fill="#fff" opacity=".95"/>
      <rect x="19" y="33" width="26" height="3.6" rx="1.8" fill="#fff" opacity=".7"/>
      <rect x="19" y="40" width="16" height="3.6" rx="1.8" fill="#fff" opacity=".5"/>`),
    // «Мои заказы» — коробка
    my_orders: wrap(`
      <defs>
        <linearGradient id="hmbT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAF3FF"/><stop offset="1" stop-color="#9CC4FF"/></linearGradient>
        <linearGradient id="hmbL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FA2FF"/><stop offset="1" stop-color="#2F6FE0"/></linearGradient>
        <linearGradient id="hmbR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A66D8"/><stop offset="1" stop-color="#14449F"/></linearGradient>
      </defs>
      <polygon points="8,20 32,32 32,58 8,46" fill="url(#hmbL)"/>
      <polygon points="56,20 32,32 32,58 56,46" fill="url(#hmbR)"/>
      <polygon points="32,7 56,20 32,32 8,20" fill="url(#hmbT)"/>
      <polygon points="26,10 38,16.5 32,20 20,13.5" fill="#fff" opacity=".8"/>
      <polygon points="30,33 34,35 34,45 30,43" fill="#FFB52E" opacity=".95"/>
      <polygon points="12,31 22,36 22,41 12,36" fill="#fff" opacity=".85"/>`),
    // «Акции» — ценник со знаком процента
    promo: wrap(`
      <defs><linearGradient id="hmcP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD76A"/><stop offset="1" stop-color="#FF8F1F"/></linearGradient></defs>
      <g transform="rotate(-14 32 32)">
        <rect x="11" y="15" width="42" height="34" rx="11" fill="#C25E00" opacity=".55" transform="translate(0 3)"/>
        <rect x="11" y="15" width="42" height="34" rx="11" fill="url(#hmcP)"/>
        <rect x="11" y="15" width="42" height="34" rx="11" fill="none" stroke="#fff" stroke-opacity=".55"/>
        <circle cx="20" cy="24" r="3.4" fill="#fff"/>
        <text x="36" y="42" text-anchor="middle" font-size="25" font-weight="900" fill="#fff" font-family="Arial,Helvetica,sans-serif">%</text>
      </g>`),
    // «Отзывы» — пухлая звезда
    reviews: wrap(`
      <defs><linearGradient id="hmdS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#FF9A1F"/></linearGradient></defs>
      <path d="M32 9l6.2 15.2 16.4.9-12.7 10.4 4.2 15.9L32 42.2 18 51.4l4.2-15.9L9.4 25.1l16.4-.9z" fill="#D9730A" opacity=".5" transform="translate(0 3)" stroke="#D9730A" stroke-opacity=".5" stroke-width="5" stroke-linejoin="round"/>
      <path d="M32 9l6.2 15.2 16.4.9-12.7 10.4 4.2 15.9L32 42.2 18 51.4l4.2-15.9L9.4 25.1l16.4-.9z" fill="url(#hmdS)" stroke="url(#hmdS)" stroke-width="5" stroke-linejoin="round"/>
      <path d="M32 13l-4.6 11.4-10.6.7z" fill="#fff" opacity=".45"/>`),
    // «Фотоотчёты» — фотоаппарат
    reports: wrap(`
      <defs>
        <linearGradient id="hmeC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FA2FF"/><stop offset="1" stop-color="#1F57C8"/></linearGradient>
        <radialGradient id="hmeL" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#9CC8FF"/><stop offset="1" stop-color="#0E2F7E"/></radialGradient>
      </defs>
      <rect x="21" y="12" width="22" height="12" rx="5" fill="#1B4EB5"/>
      <rect x="7" y="19" width="50" height="34" rx="10" fill="url(#hmeC)"/>
      <rect x="7" y="19" width="50" height="34" rx="10" fill="none" stroke="#fff" stroke-opacity=".4"/>
      <circle cx="32" cy="36" r="13" fill="#EAF3FF"/>
      <circle cx="32" cy="36" r="9.6" fill="url(#hmeL)"/>
      <circle cx="28.4" cy="32.4" r="2.8" fill="#fff" opacity=".85"/>
      <circle cx="49" cy="26" r="2.6" fill="#FFB52E"/>`),
    // «Легит-чек» — щит с галочкой
    legitcheck: wrap(`
      <defs><linearGradient id="hmfS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6FB0FF"/><stop offset="1" stop-color="#1F57C8"/></linearGradient></defs>
      <path d="M32 6l21 8v18c0 13-9 21-21 26C20 53 11 45 11 32V14z" fill="url(#hmfS)"/>
      <path d="M32 6l21 8v18c0 13-9 21-21 26z" fill="#0a2a6b" opacity=".18"/>
      <path d="M32 6l21 8v18c0 13-9 21-21 26C20 53 11 45 11 32V14z" fill="none" stroke="#fff" stroke-opacity=".45"/>
      <path d="M22 32.5l8 8 14-16" fill="none" stroke="#fff" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    // Крупная иллюстрация для шапки блока: посылка в полёте
    hero: `<svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hmgT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#BBD7FF"/></linearGradient>
        <linearGradient id="hmgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8DBBFF"/><stop offset="1" stop-color="#3C79E6"/></linearGradient>
        <linearGradient id="hmgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A86EE"/><stop offset="1" stop-color="#1D52BD"/></linearGradient>
      </defs>
      <ellipse cx="40" cy="73" rx="20" ry="3.4" fill="#06205a" opacity=".3"/>
      <polygon points="12,28 40,42 40,70 12,56" fill="url(#hmgL)"/>
      <polygon points="68,28 40,42 40,70 68,56" fill="url(#hmgR)"/>
      <polygon points="40,14 68,28 40,42 12,28" fill="url(#hmgT)"/>
      <polygon points="33,17 47,24 40,28 26,21" fill="#FFB52E"/>
      <polygon points="37,43 43,46 43,58 37,55" fill="#FFB52E" opacity=".95"/>
      <path d="M6 14h10M2 22h8M9 6h6" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>
    </svg>`,
  };

  window.HOME_ART = ART;
})();
