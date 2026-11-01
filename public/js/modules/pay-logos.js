// ICE LOGIX: оригинальные логотипы способов оплаты (прозрачный фон, тёмная тема).
// Один источник для кошелька, оформления заказа, оплаты этапа и админки.
(function () {
  const BASE = '/assets/payment-methods/';
  const NAMES = {
    krok: 'КРОК', erip: 'ЕРИП', oplati: 'Оплати',
    belkart: 'Белкарт', visa: 'Visa', mastercard: 'Mastercard', mir: 'МИР', maestro: 'Maestro', unionpay: 'UnionPay'
  };
  const CARD_BRANDS = ['belkart', 'visa', 'mastercard', 'mir'];

  // Сам логотип: <img> нужной высоты (CSS .pm-logo)
  function payLogo(id, cls) {
    if (!NAMES[id]) return '';
    return `<img class="pm-logo pm-logo-${id}${cls ? ' ' + cls : ''}" src="${BASE}${id}.webp" alt="${NAMES[id]}" loading="lazy" decoding="async" draggable="false">`;
  }
  // Плитка 64×42 под логотип — слева в строке способа оплаты
  function payLogoTile(id) {
    return `<span class="pm-tile pm-tile-${id}">${payLogo(id)}</span>`;
  }
  // Ряд логотипов карт: Белкарт, Visa, Mastercard, МИР
  function payCardBrands(cls) {
    return `<span class="pm-brands${cls ? ' ' + cls : ''}">${CARD_BRANDS.map((b) => payLogo(b)).join('')}</span>`;
  }

  window.payLogo = payLogo;
  window.payLogoTile = payLogoTile;
  window.payCardBrands = payCardBrands;
  window.PAY_METHOD_NAMES = { card: 'Банковская карта', card_token: 'Банковская карта', erip: 'ЕРИП', oplati: 'Оплати', krok: 'КРОК', manual: 'Вручную' };
})();
