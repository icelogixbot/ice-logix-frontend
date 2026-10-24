// ============================================================
// ICE LOGIX Module: Universal Spotlight Search (Pro Page v4)
// High-performance intelligent search rendered directly inside
// the main content view (header and footer remain visible).
// ============================================================

(function () {
  'use strict';

  let searchInputEl = null;
  let contentEl = null;
  let clearBtnEl = null;
  let placeholderTimer = null;
  let currentPlaceholderIndex = 0;
  let debounceTimeout = null;
  let searchRequestId = 0;

  const MAX_HISTORY_ITEMS = 6;

  const ROTATING_PLACEHOLDERS = [
    'Спроси ИИ: "Пуховик 850¥ вес 2 кг" 🤖',
    'Ищи: "Где моя посылка?" 📦',
    'Ищи: "Мой баланс и карты" 💳',
    'Вставь ссылку на Poizon 🔗',
    'Спроси ИИ: "Когда приедет в Минск?" ⏱️',
    'Ищи: "Nike Dunk Low" 👟',
    'Спроси ИИ: "Карта Беларусбанка" 🇧🇾',
    'Ищи: "Таможенный лимит 200€" ⚖️',
    'Ищи: "Страховка посылки" 🛡️',
    'Ищи: "Trapstar / Corteiz" 👕'
  ];

  // ============================================================
  // USER PROFILE CONTEXT (STRICT ISOLATION & PERSONALIZATION)
  // ============================================================

  function getUserContext() {
    let tgUser = null;
    try {
      tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    } catch (_) {}

    let cachedUser = {};
    try {
      cachedUser = JSON.parse(localStorage.getItem('ice_cached_user') || '{}');
    } catch (_) {}

    const curUserId = window.userId || tgUser?.id || cachedUser?.userId || null;
    const userName = cachedUser?.userName || tgUser?.first_name || 'Гость';
    const balance = cachedUser?.balance !== undefined ? cachedUser.balance : (window.userBalance || 0);
    const isRegistered = !!(cachedUser?.isRegistered || window.isRegistered || curUserId);

    // Saved payment cards
    let cards = window.userCards || [];
    if ((!cards || !cards.length) && curUserId) {
      try {
        const cachedCards = localStorage.getItem('ice_payment_methods_' + curUserId);
        if (cachedCards) cards = JSON.parse(cachedCards) || [];
      } catch (_) {}
    }

    // Delivery address
    let deliveryInfo = null;
    try {
      const rawDelivery = localStorage.getItem('ice_delivery_address') || localStorage.getItem('ice_cached_address');
      if (rawDelivery) deliveryInfo = JSON.parse(rawDelivery);
    } catch (_) {}

    // Isolated user orders for instant autocomplete
    let orders = [];
    if (curUserId) {
      try {
        const cached = localStorage.getItem('ice_cached_orders_' + curUserId);
        if (cached) orders = JSON.parse(cached) || [];
      } catch (_) {}
    }

    return {
      userId: curUserId,
      userName,
      balance,
      cards: Array.isArray(cards) ? cards : [],
      deliveryInfo,
      orders: Array.isArray(orders) ? orders : [],
      isRegistered
    };
  }

  // ============================================================
  // PERSONAL RECENT SEARCHES HISTORY
  // ============================================================

  function getHistoryStorageKey() {
    const userCtx = getUserContext();
    return 'ice_spotlight_history_' + (userCtx.userId || 'guest');
  }

  function getSearchHistory() {
    try {
      const raw = localStorage.getItem(getHistoryStorageKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveQueryToHistory(q) {
    const clean = (q || '').trim();
    if (!clean || clean.length < 2 || clean.startsWith('http')) return;
    try {
      let history = getSearchHistory();
      history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
      history.unshift(clean);
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }
      localStorage.setItem(getHistoryStorageKey(), JSON.stringify(history));
    } catch (e) {}
  }

  function clearSearchHistory() {
    try {
      localStorage.removeItem(getHistoryStorageKey());
      renderSpotlightHome();
    } catch (e) {}
  }

  // ============================================================
  // KNOWLEDGE BASE (12 CURATED FAQ TOPICS)
  // ============================================================

  const FAQ_INDEX = [
    {
      id: 'faq_delivery_terms',
      title: 'Сроки доставки из Китая в Беларусь и РФ',
      keywords: ['сроки', 'срок', 'время', 'сколько', 'дней', 'когда', 'приедет', 'доставка', 'скорость', 'авиа', 'авто', 'минск'],
      summary: 'Экспресс авиа: 8–12 дней. Автодоставка: 18–25 дней.',
      details: 'Доставка организуется через нашего официального партнера ShopbyShop. Товар поступает на транзитный склад в Китае, проходит проверку, после чего отправляется в Беларусь или РФ.',
      badge: '⏱️ Сроки',
      color: 'cyan'
    },
    {
      id: 'faq_commission',
      title: 'Комиссия сервиса ICE LOGIX',
      keywords: ['комиссия', 'процент', 'сколько берете', 'стоимость услуг', 'наценка', 'цена', 'условия', '20%'],
      summary: 'Фиксированная комиссия 20% за выкуп и консолидацию.',
      details: 'Никаких скрытых платежей. В комиссию входит проверка оригинальности, фотоотчет на складе, общение с продавцом и оформление документов. Официальная работа и налоги в РБ.',
      badge: '🤝 Комиссия',
      color: 'blue'
    },
    {
      id: 'faq_customs',
      title: 'Таможенные лимиты и пошлины (РБ и РФ)',
      keywords: ['таможня', 'пошлина', 'лимит', '200', 'евро', 'налог', 'растаможка', 'превышение', 'вес', '31'],
      summary: 'Беспошлинный лимит — 200€ и 31 кг на одну посылку.',
      details: 'Если стоимость превышает 200€ или вес более 31 кг, таможенная пошлина составляет 15% от суммы превышения, но не менее 2€ за каждый лишний килограмм.',
      badge: '⚖️ Таможня',
      color: 'emerald'
    },
    {
      id: 'faq_tariffs',
      title: 'Тариф за вес посылки',
      keywords: ['тариф', 'вес', 'цена за кг', 'килограмм', 'оплата веса', 'shopbyshop', 'стоимость доставки', '10$'],
      summary: 'Тариф логистики — 10$ за килограмм фактического или объемного веса.',
      details: 'Оплата за вес происходит вторым этапом, когда посылка взвешена на складе в Китае и готова к вылету.',
      badge: '📦 Тариф',
      color: 'amber'
    },
    {
      id: 'faq_how_to_order',
      title: 'Как сделать заказ с Poizon / Taobao',
      keywords: ['как заказать', 'заказ', 'инструкция', 'пойзон', 'poizon', 'taobao', 'ссылка', 'новичок', 'купить'],
      summary: '1. Скопируй ссылку в Poizon → 2. Вставь в Калькулятор → 3. Оплати выкуп.',
      details: 'После оформления заказа наш оператор в Китае выкупает позицию в течение 1–3 часов и направляет на склад для легитчека.',
      badge: '💡 Инструкция',
      color: 'violet'
    },
    {
      id: 'faq_guarantee',
      title: 'Гарантия подлинности и легитчек',
      keywords: ['гарантия', 'оригинал', 'подделка', 'паль', 'легит', 'брак', 'возврат', 'проверка', 'сертификат'],
      summary: '100% оригинальность с Poizon с фирменными пломбами и сертификатом.',
      details: 'Каждая пара проходит двойную экспертизу на платформе Poizon и дополнительный визуальный осмотр на нашем складе перед отправкой.',
      badge: '🛡️ Защита',
      color: 'emerald'
    },
    {
      id: 'faq_payments',
      title: 'Способы оплаты и валюта',
      keywords: ['оплата', 'карта', 'карты', 'белкарт', 'мир', 'bepaid', 'visa', 'mastercard', 'валюта', 'рубли', 'byn', 'платеж'],
      summary: 'Принимаем карты банков РБ (Белкарт), ЕРИП, Оплати и РФ (МИР) через bePaid без скрытых комиссий.',
      details: 'Безопасная оплата через шлюз bePaid с поддержкой 3D-Secure. Данные карт шифруются по стандарту PCI-DSS.',
      badge: '💳 Оплата',
      color: 'cyan'
    },
    {
      id: 'faq_insurance',
      title: 'Страховка груза и гарантия безопасности',
      keywords: ['страховка', 'страхование', 'потеря', 'компенсация', 'разбили', 'украли', 'пропала', 'риски'],
      summary: 'Все посылки застрахованы на 100% стоимости выкупа.',
      details: 'В случае утери посылки при транспортировке или повреждения содержимого клиент получает полную компенсацию стоимости товара и доставки.',
      badge: '🛡️ Страховка',
      color: 'blue'
    },
    {
      id: 'faq_sizes',
      title: 'Как подобрать размер обуви и одежды',
      keywords: ['размер', 'размеры', 'сетка', 'обувь', 'стелька', 'см', 'евро', 'us', 'eur', 'маломерят'],
      summary: 'Ориентируйтесь на длину стопы в сантиметрах (CM/JP) или EUR размер.',
      details: 'В приложении Poizon для каждой модели указаны точные отзывы покупателей: "True to size", "Маломерит на полразмера". Рекомендуем замерять длину стельки своей удобной обуви.',
      badge: '📏 Размеры',
      color: 'amber'
    },
    {
      id: 'faq_two_steps',
      title: 'Почему оплата разбита на 2 этапа?',
      keywords: ['2 этапа', 'два этапа', 'второй платеж', 'почему отдельно', 'оплата веса', 'раздельно'],
      summary: '1-й платеж — за выкуп товара. 2-й платеж — точная оплата за фактический вес.',
      details: 'Мы не берем примерную стоимость доставки заранее. Оплата за доставку происходит только после того, как товар прибудет на склад в Китае и будет точно взвешен.',
      badge: '✌️ 2 Этапа',
      color: 'violet'
    },
    {
      id: 'faq_tracking',
      title: 'Где отслеживать статус посылки?',
      keywords: ['трекинг', 'отследить', 'где посылка', 'статус', 'номер трека', 'сдэк', 'европочта'],
      summary: 'Все этапы обновляются в профиле Mini App и через Telegram-бота.',
      details: 'После выкупа вы видите статусы: «Выкуплен» → «На складе в Китае» → «В пути» → «Прибыл в Беларусь/РФ». По прибытии выдается трек-номер СДЭК или Европочты.',
      badge: '📍 Трекинг',
      color: 'emerald'
    },
    {
      id: 'faq_refund',
      title: 'Условия возврата и отмена заказа',
      keywords: ['возврат', 'отмена', 'отменить', 'вернуть деньги', 'брак', 'дефект'],
      summary: 'Бесплатный возврат продавцу при обнаружении брака на складе в Китае.',
      details: 'Если при проверке на китайском складе обнаружен брак, не тот размер или цвет — мы возвращаем товар продавцу и делаем полный возврат средств клиенту.',
      badge: '🔄 Возврат',
      color: 'rose'
    }
  ];

  // ============================================================
  // APP NAVIGATION SHORTCUTS
  // ============================================================

  const APP_SHORTCUTS = [
    {
      id: 'shortcut_finances',
      title: 'Финансы и привязанные карты',
      keywords: ['финансы', 'карта', 'карты', 'кошелек', 'баланс', 'пластик', 'bepaid', 'оплата', 'банк'],
      subtitle: 'Управление банковскими картами, купонами и балансом',
      iconSvg: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
      action: () => {
        if (typeof showUserFinances === 'function') {
          showUserFinances();
        } else if (typeof switchTab === 'function') {
          switchTab('finances');
        }
      }
    },
    {
      id: 'shortcut_promos',
      title: 'Промокоды и купоны',
      keywords: ['промокод', 'купон', 'скидка', 'бонус', 'акция', 'промо'],
      subtitle: 'Активация промокодов на выкуп и скидок на доставку',
      iconSvg: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
      action: () => {
        if (typeof showPromosModal === 'function') {
          showPromosModal();
        } else if (typeof switchTab === 'function') {
          switchTab('profile');
        }
      }
    },
    {
      id: 'shortcut_calculator',
      title: 'Калькулятор доставки',
      keywords: ['калькулятор', 'расчет', 'посчитать', 'стоимость', 'цена', 'сколько стоит'],
      subtitle: 'Точный расчет стоимости выкупа с учетом веса и доставки',
      iconSvg: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/>',
      action: () => {
        if (typeof switchTab === 'function') switchTab('calculator');
      }
    },
    {
      id: 'shortcut_neworder',
      title: 'Оформить новый заказ',
      keywords: ['новый заказ', 'оформить', 'заказать', 'купить', 'выкуп'],
      subtitle: 'Быстрое оформление выкупа с Poizon, Taobao и других маркетплейсов',
      iconSvg: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      action: () => {
        if (typeof switchTab === 'function') switchTab('neworder');
      }
    },
    {
      id: 'shortcut_catalogs',
      title: 'Каталоги и маркетплейсы',
      keywords: ['каталог', 'каталоги', 'площадки', 'маркетплейсы', 'магазины', 'где купить', 'dewu', 'taobao', 'pinduoduo', 'goofish', '95'],
      subtitle: 'Dewu, TaoBao, Pinduoduo, Goofish, 95, JD, Tmall',
      iconSvg: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      action: () => {
        if (typeof switchTab === 'function') switchTab('catalogs');
      }
    },
    {
      id: 'shortcut_reports',
      title: 'Фотоотчеты со склада',
      keywords: ['отчеты', 'отчет', 'фото', 'склад', 'отзывы', 'проверка', 'реальные фото'],
      subtitle: 'Живые фотографии выкупленных и доставленных посылок',
      iconSvg: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
      action: () => {
        if (typeof showReportsScreen === 'function') {
          showReportsScreen();
        } else if (typeof switchTab === 'function') {
          switchTab('profile');
        }
      }
    },
    {
      id: 'shortcut_legitcheck',
      title: 'Легитчек сервис (Legit Check)',
      keywords: ['легитчек', 'легит', 'оригинал', 'экспертиза', 'проверка вещи', 'подлинность'],
      subtitle: 'Проверка подлинности ваших вещей профессиональными экспертами',
      iconSvg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
      action: () => {
        if (typeof showLegitCheckScreen === 'function') {
          showLegitCheckScreen();
        } else if (typeof switchTab === 'function') {
          switchTab('profile');
        }
      }
    },
    {
      id: 'shortcut_resale',
      title: 'Маркет наличия (Resale)',
      keywords: ['наличие', 'ресейл', 'resale', 'купить из наличия', 'продать', 'вещи в наличии'],
      subtitle: 'Покупка и продажа оригинальных вещей с быстрой доставкой по РБ',
      iconSvg: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
      action: () => {
        if (typeof switchTab === 'function') switchTab('resale');
      }
    },
    {
      id: 'shortcut_manager',
      title: 'Служба заботы 24/7 (Поддержка)',
      keywords: ['поддержка', 'менеджер', 'помощь', 'связь', 'оператор', 'вопрос', 'чат', 'служба заботы'],
      subtitle: 'Официальный Telegram-бот поддержки @icelogix_support_bot',
      iconSvg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      action: () => {
        const tgLink = 'https://t.me/icelogix_support_bot';
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(tgLink);
        } else {
          window.open(tgLink, '_blank');
        }
      }
    }
  ];

  // ============================================================
  // POPULAR BRANDS
  // ============================================================

  const POPULAR_BRANDS = [
    { name: 'Nike', category: 'Обувь & Одежда', aliases: ['найк', 'nike', 'dunk', 'данки', 'air force', 'af1'] },
    { name: 'Jordan', category: 'Баскетбольная классика', aliases: ['джордан', 'jordan', 'aj1', 'aj4'] },
    { name: 'Trapstar', category: 'Стритвир Лондон', aliases: ['трапстар', 'trapstar', 'пуховик', 'сумка'] },
    { name: 'Corteiz', category: 'Британский хайп', aliases: ['кортез', 'corteiz', 'худи', 'штаны', 'crts'] },
    { name: 'Stussy', category: 'Калифорнийский стиль', aliases: ['стуси', 'stussy', 'футболка', 'зипка'] },
    { name: 'Supreme', category: 'Культовый бренд', aliases: ['суприм', 'supreme', 'бокс лого'] },
    { name: 'New Balance', category: 'Кроссовки и комфорт', aliases: ['нью беланс', 'new balance', 'nb', '1906', '2002r', '530'] },
    { name: 'Adidas', category: 'Спорт & Samba/Gazelle', aliases: ['адидас', 'adidas', 'samba', 'campus', 'gazelle'] },
    { name: 'Arc\'teryx', category: 'Технологичный аутдор', aliases: ['арктерикс', 'arcteryx', 'куртка', 'мембрана', 'птица'] },
    { name: 'Carhartt WIP', category: 'Ворквер эстетика', aliases: ['кархарт', 'carhartt', 'куртка', 'штаны'] },
    { name: 'UGG', category: 'Зимняя обувь', aliases: ['угги', 'ugg', 'тапочки', 'сапоги'] }
  ];

  // ============================================================
  // GOOGLE AI-STYLE PROMPT INSPIRATION & EXPLORATION (STEP 1)
  // ============================================================

  let activePromptCategoryId = 'orders';

  const PROMPT_CATEGORIES = [
    {
      id: 'orders',
      icon: '📦',
      label: 'Заказы и профиль',
      prompts: [
        { title: 'Где моя посылка?', desc: 'Статус, трек-номер и местонахождение', q: 'где моя посылка' },
        { title: 'Мой баланс и карты', desc: 'Привязанные способы оплаты и ICE баллы', q: 'мой баланс и карты' },
        { title: 'Мой адрес доставки', desc: 'Куда направляются ваши посылки', q: 'мой адрес доставки' },
        { title: 'История покупок', desc: 'Список всех оформленных заказов', q: 'мои заказы' }
      ]
    },
    {
      id: 'clothes',
      icon: '👟',
      label: 'Одежда и размеры',
      prompts: [
        { title: 'Таблица размеров обуви', desc: 'Сравнение EU, US, UK и сантиметров (CM)', q: 'размерная сетка кроссовок' },
        { title: 'Как сидит Trapstar и Corteiz?', desc: 'Особенности кроя: оверсайз или в размер', q: 'как сидит Trapstar и Corteiz' },
        { title: 'Зимние куртки и пуховики', desc: 'Arc\'teryx, The North Face, Trapstar', q: 'зимние куртки и пуховики' },
        { title: 'Как выбрать размер на Пойзоне?', desc: 'Замеры стельки и бирка в сантиметрах', q: 'как выбрать размер на Poizon' }
      ]
    },
    {
      id: 'delivery',
      icon: '⏱️',
      label: 'Доставка и цены',
      prompts: [
        { title: 'Пуховик 850¥ вес 2 кг в Минск', desc: 'Мгновенный расчет доставки с пошлиной', q: 'пуховик 850¥ вес 2 кг в Минск' },
        { title: 'Сроки авиа и авто доставки', desc: 'Сколько дней идет из Китая в Беларусь/РФ', q: 'сроки доставки из Китая' },
        { title: 'Таможенный лимит 200€', desc: 'Как рассчитывается пошлина при превышении', q: 'таможенный лимит 200 евро' },
        { title: 'Страховка груза и гарантия', desc: 'Защита от утери и повреждения при пути', q: 'страховка груза' }
      ]
    },
    {
      id: 'poizon',
      icon: '🛍️',
      label: 'Poizon и выкуп',
      prompts: [
        { title: 'Синяя или черная кнопка?', desc: 'В чем разница между тарифами Poizon', q: 'синяя или черная кнопка Poizon' },
        { title: 'Как заказать по ссылке?', desc: 'Вставка ссылки на товар в ICE LOGIX', q: 'как заказать по ссылке Poizon' },
        { title: 'Проверка оригинальности', desc: 'Легит-чек, сертификаты и синие пломбы', q: 'проверка оригинальности Poizon' },
        { title: 'Комиссия ICE LOGIX 20%', desc: 'Что входит в официальную комиссию', q: 'комиссия 20% ICE LOGIX' }
      ]
    }
  ];

  // ============================================================
  // PAGE RENDERER (NATIVE TAB VIEW INSIDE #content)
  // ============================================================

  async function renderSpotlightPage() {
    return `
      <div class="page-enter px-4 max-w-md mx-auto space-y-4">
        <!-- Top Navigation Header -->
        <div class="flex items-center gap-3 mb-4">
          <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-white tracking-wide">Глобальный поиск</h2>
              <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">AI Active</span>
            </div>
            <p class="text-[11px] text-white/40 truncate">Заказы, бренды, товары, расчет цен и помощь ИИ</p>
          </div>
        </div>

        <!-- Search Input Field Container -->
        <div class="relative flex items-center group">
          <span class="absolute left-4 text-cyan-400 pointer-events-none flex items-center justify-center transition-colors group-focus-within:text-cyan-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="text" id="spotlightSearchInput"
            class="w-full bg-slate-900/80 backdrop-blur-md border border-white/15 focus:border-cyan-400 focus:bg-slate-900/95 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl py-3.5 pl-11 pr-11 text-white placeholder-white/35 text-sm font-semibold outline-none transition-all shadow-lg"
            placeholder="Спроси ИИ или введи запрос... 🤖"
            enterkeyhint="search"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <button id="spotlightClearBtn" class="absolute right-3.5 text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition hidden" title="Очистить">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Google AI Autocomplete & Suggestion Pills Bar (Step 4) -->
        <div id="spotlightSuggestionsBar" class="hidden overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 transition-all duration-200">
          <!-- Dynamic Horizontal Scrollable Suggestion Pills -->
        </div>

        <!-- Dynamic Content Body (Home or Search Results) -->
        <div id="spotlightContent" class="space-y-4"></div>
      </div>
      ${typeof renderFooter === 'function' ? renderFooter() : ''}
    `;
  }

  // ============================================================
  // GOOGLE AI AUTOCOMPLETE & INSTANT SUGGESTION PILLS (STEP 4)
  // Personal profile binding, live autocomplete & query pills
  // ============================================================

  let suggestionsBarEl = null;

  function getGoogleSuggestions(rawQ, userCtx) {
    const q = (rawQ || '').trim().toLowerCase();
    const suggestions = [];
    if (!q || q.length < 1) return [];

    // 1. Personal Orders Binding (Instant profile tracking)
    if (userCtx.orders && userCtx.orders.length > 0) {
      const topOrder = userCtx.orders[0];
      const ordNum = topOrder.order_number || topOrder.id?.slice(0, 8);
      const isOrderQuery = q.includes('заказ') || q.includes('посылк') || q.includes('трек') || q.includes('где');
      
      if (isOrderQuery || (ordNum && String(ordNum).toLowerCase().includes(q))) {
        suggestions.push({
          icon: '📦',
          text: `Мой заказ #${ordNum}`,
          q: `где посылка #${ordNum}`
        });
        if (topOrder.track_number) {
          suggestions.push({
            icon: '📍',
            text: `Трек-номер: ${topOrder.track_number}`,
            q: topOrder.track_number
          });
        }
      }
    }

    // 2. Personal Delivery City Binding
    if (userCtx.deliveryInfo?.city) {
      const userCity = userCtx.deliveryInfo.city.toLowerCase();
      if (q.includes('доставк') || q.includes('город') || userCity.includes(q)) {
        suggestions.push({
          icon: '🚚',
          text: `Доставка в ${userCtx.deliveryInfo.city}`,
          q: `доставка в ${userCtx.deliveryInfo.city}`
        });
      }
    }

    // 3. Personal Balance & Cards Binding
    if (q.includes('баланс') || q.includes('счет') || q.includes('ice') || q.includes('кошел')) {
      suggestions.push({
        icon: '💎',
        text: `Мой баланс: ${userCtx.balance || 0} ICE`,
        q: 'мой баланс'
      });
    }
    if (q.includes('карт') || q.includes('оплат') || q.includes('bepaid')) {
      suggestions.push({
        icon: '💳',
        text: userCtx.cards.length > 0 ? `Привязано карт: ${userCtx.cards.length}` : 'Привязать карту bePaid',
        q: 'мои карты'
      });
      suggestions.push({
        icon: '✌️',
        text: 'Почему оплата в 2 этапа?',
        q: 'почему 2 этапа'
      });
    }

    // 4. Instant Numeric CNY Currency Conversions
    const numMatch = q.match(/^(\d{2,6})\s*(¥|юаней|юань|ю|cny)?$/);
    if (numMatch) {
      const val = numMatch[1];
      suggestions.push({ icon: '🇨🇳', text: `${val} ¥ в рублях (BYN / RUB)`, q: `${val} ¥` });
      suggestions.push({ icon: '⚡', text: `${val} ¥ вес 1.5 кг «под ключ»`, q: `кроссовки ${val}¥ вес 1.5 кг` });
      suggestions.push({ icon: '🧥', text: `Пуховик ${val} ¥ вес 2 кг`, q: `пуховик ${val}¥ вес 2 кг` });
    }

    // 5. Intelligent match with AI_KNOWLEDGE_TOPICS
    if (typeof AI_KNOWLEDGE_TOPICS !== 'undefined') {
      for (const topic of AI_KNOWLEDGE_TOPICS) {
        if (suggestions.length >= 6) break;
        const matchesKeyword = topic.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
        if (matchesKeyword) {
          if (topic.id === 'authenticity_slang') {
            if (!suggestions.some(s => s.q === 'паль или ориг')) {
              suggestions.push({ icon: '🛡️', text: 'Как отличить паль от оригинала', q: 'паль или ориг' });
              suggestions.push({ icon: '🏷️', text: 'Синие пломбы и сертификаты Poizon', q: 'синие пломбы poizon' });
            }
          } else if (topic.id === 'silhouette_dunk') {
            if (!suggestions.some(s => s.q === 'dunk panda')) {
              suggestions.push({ icon: '👟', text: 'Dunk Low True to Size (размеры)', q: 'размеры dunk low' });
              suggestions.push({ icon: '🛹', text: 'SB Dunk vs Dunk Low', q: 'sb dunk' });
            }
          } else if (topic.id === 'silhouette_jordan4') {
            if (!suggestions.some(s => s.q === 'jordan 4')) {
              suggestions.push({ icon: '🏀', text: 'Jordan 4: посадка и вес коробки', q: 'как сидят jordan 4' });
              suggestions.push({ icon: '🔥', text: 'Jordan 4 Black Cat & Military Black', q: 'jordan 4 military black' });
            }
          } else if (topic.id === 'silhouette_af1') {
            if (!suggestions.some(s => s.q === 'air force 1')) {
              suggestions.push({ icon: '👟', text: 'Air Force 1 ’07 белый/черный', q: 'air force 1' });
              suggestions.push({ icon: '📏', text: 'AF1 большемерят на 0.5?', q: 'размеры air force 1' });
            }
          } else if (topic.id === 'silhouette_nb') {
            if (!suggestions.some(s => s.q.includes('new balance'))) {
              suggestions.push({ icon: '👟', text: 'New Balance 1906R и 2002R', q: 'new balance 1906' });
              suggestions.push({ icon: '🏃', text: 'NB 530 дышащая сетка', q: 'nb 530' });
            }
          } else if (topic.id === 'silhouette_adidas_samba_campus') {
            if (!suggestions.some(s => s.q.includes('samba'))) {
              suggestions.push({ icon: '👟', text: 'Adidas Samba OG маломерят?', q: 'adidas samba' });
              suggestions.push({ icon: '🛹', text: 'Campus 00s дутые кеды', q: 'adidas campus 00s' });
            }
          } else if (topic.id === 'silhouette_travis_yeezy') {
            if (!suggestions.some(s => s.q.includes('travis') || s.q.includes('yeezy'))) {
              suggestions.push({ icon: '🔥', text: 'Travis Scott x Jordan Retro', q: 'трэвис скотт' });
              suggestions.push({ icon: '👟', text: 'Yeezy Slides маломерят (+2)', q: 'yeezy slides' });
            }
          } else if (topic.id === 'streetwear_trapstar_corteiz') {
            if (!suggestions.some(s => s.q.includes('trapstar') || s.q.includes('кортез'))) {
              suggestions.push({ icon: '🇬🇧', text: 'Пуховик Trapstar Decoded', q: 'пуховик трапстар' });
              suggestions.push({ icon: '👕', text: 'Corteiz худи и штаны оверсайз', q: 'худи кортез' });
            }
          } else if (topic.id === 'outdoor_arcteryx_tnf') {
            if (!suggestions.some(s => s.q.includes('arcteryx') || s.q.includes('nuptse'))) {
              suggestions.push({ icon: '🏔️', text: 'Arc\'teryx куртка GORE-TEX', q: 'куртка arcteryx' });
              suggestions.push({ icon: '❄️', text: 'TNF Nuptse 1996 пуховик 700', q: 'пуховик tnf nuptse' });
            }
          } else if (topic.id === 'shoes_ugg') {
            if (!suggestions.some(s => s.q.includes('ugg'))) {
              suggestions.push({ icon: '❄️', text: 'UGG Tasman и Ultra Mini', q: 'угги тасман' });
            }
          } else if (topic.id === 'delivery_belarus_cities') {
            if (!suggestions.some(s => s.q.includes('беларус'))) {
              suggestions.push({ icon: '🇧🇾', text: 'Доставка в Минск и регионы РБ', q: 'доставка по беларуси' });
              suggestions.push({ icon: '📦', text: 'Пункты Европочты и СДЭК', q: 'пункты выдачи европочта' });
            }
          } else if (topic.id === 'delivery_russia_cities') {
            if (!suggestions.some(s => s.q.includes('москв'))) {
              suggestions.push({ icon: '🇷🇺', text: 'Доставка в Москву и СПб (СДЭК)', q: 'доставка в москву сдэк' });
            }
          } else if (topic.id === 'poizon_blue_black_btn') {
            suggestions.push({ icon: '🛍️', text: 'Синяя или черная кнопка Poizon?', q: 'синяя или черная кнопка пойзон' });
          } else if (topic.id === 'customs_limits') {
            suggestions.push({ icon: '⚖️', text: 'Таможенный лимит 200€ и пошлина', q: 'таможенный лимит 200 евро' });
          } else if (topic.id === 'support_care_service') {
            suggestions.push({ icon: '🎧', text: 'Служба заботы 24/7 (Telegram)', q: 'связаться с поддержкой' });
          }
        }
      }
    }

    // 6. Match with POPULAR_BRANDS
    if (typeof POPULAR_BRANDS !== 'undefined') {
      for (const b of POPULAR_BRANDS) {
        if (suggestions.length >= 6) break;
        const isMatch = b.name.toLowerCase().includes(q) || b.aliases.some(a => a.includes(q) || q.includes(a));
        if (isMatch && !suggestions.some(s => s.q.toLowerCase() === b.name.toLowerCase())) {
          suggestions.push({ icon: '🏷️', text: `${b.name} (${b.category})`, q: b.name });
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  function updateGoogleSuggestions(q) {
    if (!suggestionsBarEl) suggestionsBarEl = document.getElementById('spotlightSuggestionsBar');
    if (!suggestionsBarEl) return;

    const userCtx = getUserContext();
    const suggestions = getGoogleSuggestions(q, userCtx);

    if (!suggestions || suggestions.length === 0 || !q.trim()) {
      suggestionsBarEl.classList.add('hidden');
      suggestionsBarEl.innerHTML = '';
      return;
    }

    suggestionsBarEl.classList.remove('hidden');
    suggestionsBarEl.innerHTML = `
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1 pl-1 pr-0.5">
          <span>✨</span>
        </span>
        ${suggestions.map(s => `
          <button type="button" class="google-suggestion-pill flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/25 hover:border-cyan-400 text-white/90 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all shadow-sm shadow-cyan-950/40 backdrop-blur-md" data-suggestion-trigger="${s.q}">
            <span class="text-xs">${s.icon}</span>
            <span>${s.text}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Attach click listeners to suggestion pills
    suggestionsBarEl.querySelectorAll('[data-suggestion-trigger]').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetQ = btn.getAttribute('data-suggestion-trigger');
        if (targetQ && searchInputEl) {
          searchInputEl.value = targetQ;
          clearBtnEl?.classList.remove('hidden');
          saveQueryToHistory(targetQ);
          updateGoogleSuggestions(targetQ);
          handleSearchQuery(targetQ);
          searchInputEl.focus();
        }
      };
    });
  }

    function attachSpotlightPageHandlers() {
    searchInputEl = document.getElementById('spotlightSearchInput');
    contentEl = document.getElementById('spotlightContent');
    clearBtnEl = document.getElementById('spotlightClearBtn');

    if (!searchInputEl || !contentEl) return;

    suggestionsBarEl = document.getElementById('spotlightSuggestionsBar');

    clearBtnEl.onclick = () => {
      searchInputEl.value = '';
      searchInputEl.focus();
      clearBtnEl.classList.add('hidden');
      updateGoogleSuggestions('');
      renderSpotlightHome();
    };

    searchInputEl.addEventListener('input', (e) => {
      const q = e.target.value;
      if (q.trim().length > 0) {
        clearBtnEl.classList.remove('hidden');
      } else {
        clearBtnEl.classList.add('hidden');
      }

      // Live 0ms Google Suggestion Pills
      updateGoogleSuggestions(q);

      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        handleSearchQuery(q);
      }, 140);
    });

    searchInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInputEl.value.trim();
        if (q) {
          saveQueryToHistory(q);
          searchInputEl.blur();
        }
      }
    });

    searchInputEl.addEventListener('focus', () => {
      stopPlaceholderAnimation();
    });

    searchInputEl.addEventListener('blur', () => {
      if (!searchInputEl.value.trim()) {
        startPlaceholderAnimation();
      }
    });

    // Handle pending initial query or start fresh
    if (window._pendingSpotlightQuery) {
      const initQ = window._pendingSpotlightQuery;
      delete window._pendingSpotlightQuery;
      searchInputEl.value = initQ;
      clearBtnEl.classList.remove('hidden');
      handleSearchQuery(initQ);
    } else {
      renderSpotlightHome();
      startPlaceholderAnimation();
    }
  }

  // ============================================================
  // PLACEHOLDER ROTATION
  // ============================================================

  function startPlaceholderAnimation() {
    stopPlaceholderAnimation();
    placeholderTimer = setInterval(() => {
      if (!searchInputEl || searchInputEl.value.trim().length > 0) return;
      currentPlaceholderIndex = (currentPlaceholderIndex + 1) % ROTATING_PLACEHOLDERS.length;
      searchInputEl.placeholder = ROTATING_PLACEHOLDERS[currentPlaceholderIndex];
    }, 2800);
  }

  function stopPlaceholderAnimation() {
    if (placeholderTimer) {
      clearInterval(placeholderTimer);
      placeholderTimer = null;
    }
  }

  // ============================================================
  // HIGHLIGHT MATCHES HELPER
  // ============================================================

  function highlightMatches(text, query) {
    if (!text || !query) return text || '';
    const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!cleanQ || cleanQ.length < 2) return text;
    try {
      const regex = new RegExp(`(${cleanQ})`, 'gi');
      return String(text).replace(regex, '<span class="text-cyan-400 font-extrabold bg-cyan-400/10 rounded px-0.5">$1</span>');
    } catch (e) {
      return text;
    }
  }

  // ============================================================
  // EMPTY STATE / PERSONALIZED GOOGLE AI HOME SCREEN (STEP 1)
  // ============================================================

  function renderSpotlightHome() {
    if (!contentEl) return;
    updateGoogleSuggestions('');

    const userCtx = getUserContext();
    const history = getSearchHistory();
    const activeCategory = PROMPT_CATEGORIES.find(c => c.id === activePromptCategoryId) || PROMPT_CATEGORIES[0];

    contentEl.innerHTML = `
      <div class="space-y-4 animate-fadeIn">
        
        <!-- Recent Searches Row (Compact & Clean) -->
        ${history.length > 0 ? `
          <div class="space-y-1.5">
            <div class="flex items-center justify-between px-0.5">
              <span class="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white/40">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Недавние запросы
              </span>
              <button id="spotlightClearHistoryBtn" class="text-[11px] text-cyan-400/80 hover:text-cyan-300 transition font-medium">
                Очистить
              </button>
            </div>
            <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              ${history.map(item => `
                <button class="spotlight-chip flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:border-cyan-400/40 text-white/80 hover:text-white text-xs font-medium transition active:scale-95 flex items-center gap-1.5 backdrop-blur-sm shadow-sm" data-search-trigger="${item}">
                  <span class="text-[10px] text-cyan-400/70">🕒</span>
                  <span class="truncate max-w-[180px]">${item}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Google AI Style Prompt Inspiration Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-0.5">
            <span class="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <span class="text-cyan-400">✨</span> ИИ-поиск и подсказки
            </span>
            <span class="text-[10px] text-cyan-300 font-semibold px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Google AI Mode
            </span>
          </div>

          <!-- Category Selector Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
            ${PROMPT_CATEGORIES.map(cat => {
              const isActive = cat.id === activeCategory.id;
              return `
                <button type="button" class="prompt-category-btn flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border border-cyan-400/50 text-cyan-200 shadow-sm shadow-cyan-500/15'
                    : 'bg-slate-900/60 hover:bg-slate-900/90 border border-white/10 text-white/60 hover:text-white'
                }" data-category-id="${cat.id}">
                  <span>${cat.icon}</span>
                  <span>${cat.label}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Prompt Cards for Selected Category -->
          <div class="space-y-2">
            ${activeCategory.prompts.map(p => `
              <div class="spotlight-prompt-item p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900/95 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition-all duration-200 active:scale-[0.99] flex items-center justify-between group backdrop-blur-md shadow-sm" data-search-trigger="${p.q}">
                <div class="flex items-center gap-3 min-w-0 pr-2">
                  <div class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/40 transition-all flex-shrink-0 text-sm">
                    ${activeCategory.icon}
                  </div>
                  <div class="min-w-0">
                    <p class="text-white text-xs font-bold leading-tight group-hover:text-cyan-200 transition-colors truncate">
                      ${p.title}
                    </p>
                    <p class="text-[11px] text-white/45 mt-0.5 leading-snug line-clamp-1">
                      ${p.desc}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0 text-white/30 group-hover:text-cyan-300 transition-colors">
                  <span class="text-[10px] font-semibold hidden group-hover:inline transition-opacity">Искать</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-0.5 transition-transform">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Subtle AI Footnote -->
        <div class="pt-3 pb-1 flex items-center justify-center gap-2 text-[11px] text-white/35 text-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-400/70">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <span>Спрашивайте на человеческом языке — ИИ найдет точный ответ</span>
        </div>

      </div>
    `;

    // Category button click handlers
    contentEl.querySelectorAll('.prompt-category-btn').forEach(btn => {
      btn.onclick = () => {
        const catId = btn.getAttribute('data-category-id');
        if (catId && catId !== activePromptCategoryId) {
          activePromptCategoryId = catId;
          renderSpotlightHome();
        }
      };
    });

    // Attach click triggers to all cards and chips
    contentEl.querySelectorAll('[data-search-trigger]').forEach(btn => {
      btn.onclick = () => {
        const query = btn.getAttribute('data-search-trigger');
        if (searchInputEl) {
          searchInputEl.value = query;
          clearBtnEl?.classList.remove('hidden');
          saveQueryToHistory(query);
          handleSearchQuery(query);
          searchInputEl.focus();
        }
      };
    });

    const clearHistoryBtn = contentEl.querySelector('#spotlightClearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.onclick = clearSearchHistory;
    }
  }

  // ============================================================
  // SEARCH LOGIC & DISPATCHER (AI & MULTI-ENGINE)
  // ============================================================

  async function handleSearchQuery(rawQuery) {
    if (!contentEl) return;
    const query = (rawQuery || '').trim();
    if (!query) {
      renderSpotlightHome();
      return;
    }

    const currentReq = ++searchRequestId;
    const cleanLower = query.toLowerCase();
    const userCtx = getUserContext();

    // 1. Check for User Profile Contextual Match (Personal Balance, Cards, Address)
    const profileMatch = detectProfileIntent(cleanLower, userCtx);

    // 2. Check for AI Natural Language Intent & Weight Formula
    const aiIntent = detectAiIntent(query, cleanLower, userCtx);

    // 3. Check for Direct Product Link / URL
    const detectedUrl = detectProductUrl(query);

    // 4. Check for Instant Currency / Math Calculation
    const mathResult = detectMathOrCurrency(query);

    // 5. Check for App Navigation Shortcuts
    const matchingShortcuts = APP_SHORTCUTS.filter(s => {
      return s.title.toLowerCase().includes(cleanLower) ||
             s.subtitle.toLowerCase().includes(cleanLower) ||
             s.keywords.some(k => k.includes(cleanLower) || cleanLower.includes(k));
    });

    // 6. Check for FAQ / Knowledge Base
    const matchingFaq = FAQ_INDEX.filter(f => {
      return f.title.toLowerCase().includes(cleanLower) ||
             f.summary.toLowerCase().includes(cleanLower) ||
             f.details.toLowerCase().includes(cleanLower) ||
             f.keywords.some(k => cleanLower.includes(k) || k.includes(cleanLower));
    });

    // 7. Check for Popular Brands
    const matchingBrands = POPULAR_BRANDS.filter(b => {
      return b.name.toLowerCase().includes(cleanLower) ||
             b.category.toLowerCase().includes(cleanLower) ||
             b.aliases.some(a => cleanLower.includes(a) || a.includes(cleanLower));
    });

    // 8. Check for Marketplaces
    const matchingMarketplaces = searchMarketplaces(cleanLower);

    // 9. Check for User's Isolated Orders & Catalog Products (async)
    const [matchingOrders, matchingProducts] = await Promise.all([
      searchUserOrders(query, userCtx),
      searchCatalogProducts(query)
    ]);

    // Check if this request is still the freshest one
    if (currentReq !== searchRequestId) return;

    // Render Results View
    renderSearchResults({
      query,
      userCtx,
      profileMatch,
      aiIntent,
      detectedUrl,
      mathResult, 
      matchingShortcuts, 
      matchingFaq, 
      matchingBrands, 
      matchingMarketplaces,
      matchingOrders, 
      matchingProducts 
    });
  }

  // ============================================================
  // ENGINE 1: PERSONAL PROFILE INTENT DETECTOR
  // ============================================================

  function detectProfileIntent(cleanLower, userCtx) {
    if (cleanLower.includes('баланс') || cleanLower.includes('мой счет') || cleanLower.includes('кошелек') || cleanLower === 'ice') {
      return {
        type: 'balance',
        title: 'Мой ICE Баланс',
        balance: userCtx.balance || 0,
        userName: userCtx.userName
      };
    }

    if (cleanLower.includes('карт') || cleanLower.includes('пластик') || cleanLower.includes('bepaid') || cleanLower.includes('привяз')) {
      return {
        type: 'cards',
        title: 'Мои банковские карты',
        cards: userCtx.cards,
        count: userCtx.cards.length
      };
    }

    if (cleanLower.includes('адрес') || cleanLower.includes('сдэк') || cleanLower.includes('европочт') || cleanLower.includes('куда достав')) {
      return {
        type: 'address',
        title: 'Адрес и пункт выдачи',
        deliveryInfo: userCtx.deliveryInfo
      };
    }

    return null;
  }

  // ============================================================
  // COMPREHENSIVE AI KNOWLEDGE GRAPH (STEP 3)
  // Slang, Sneaker Silhouettes, Streetwear, Delivery Cities,
  // Payment Rationale, Legit-Check, Customs Limits & Security
  // ============================================================

  const AI_KNOWLEDGE_TOPICS = [
    {
      id: 'authenticity_slang',
      keywords: ['паль', 'пален', 'ориг', 'оригинал', 'реплик', 'легит', 'легитчек', 'подделк', 'люкс копия', 'люкс-копия', 'фейк', 'фейки', 'настоящ', 'пали'],
      title: 'Гарантия подлинности: 100% оригинал (никаких реплик и пали)',
      badge: '🛡️ Гарантия подлинности',
      summary: 'ICE LOGIX выкупает товары исключительно с официальных платформ Poizon (Dewu), где действует строжайшая многоуровневая система легитчека. Мы принципиально не работаем с репликами, копиями и палью.',
      bullets: [
        '🔬 <span class="font-bold text-white">Двойная экспертиза:</span> Каждая пара исследуется в лаборатории Poizon на оптических спектрометрах, под ультрафиолетом и экспертами вручную.',
        '🏷️ <span class="font-bold text-white">Фирменная пломба:</span> Товар запечатывается в защитную коробку с уникальной номерной пломбой и QR-сертификатом подлинности.',
        '🤝 <span class="font-bold text-white">100% защита:</span> Если вещь не проходит экспертизу на складе в Китае, средства мгновенно возвращаются покупателю в полном объеме.'
      ],
      actionTitle: 'Узнать подробнее о легитчеке →',
      actionType: 'legitcheck',
      sources: ['🛡️ Лаборатория Poizon Verification', '📜 Официальная гарантия ICE LOGIX']
    },
    {
      id: 'silhouette_dunk',
      keywords: ['dunk', 'данки', 'данков', 'данках', 'dunk low', 'sb dunk', 'панда dunk', 'panda dunk', 'панда'],
      title: 'Nike Dunk Low & High: подбор размера и особенности',
      badge: '👟 Силуэт Dunk',
      summary: 'Культовый силуэт Nike Dunk на Poizon доступен в сотнях оригинальных расцветок (Panda, Grey Fog, Olive) по ценам от 350–500 ¥ (существенно выгоднее европейского ритейла).',
      bullets: [
        '📏 <span class="font-bold text-white">Посадка Dunk Low:</span> Идут строго в размер (True to size). Ориентируйтесь на стандартный размер Nike EUR или длину стопы в CM.',
        '🛹 <span class="font-bold text-white">Посадка SB Dunk:</span> Из-за утолщенного мягкого язычка и амортизирующей стельки Zoom Air рекомендуется брать на 0.5 размера больше.',
        '💰 <span class="font-bold text-white">Выгода выкупа:</span> На Poizon расцветки Panda и популярные коллаборации стоят на 30–50% дешевле ритейла в СНГ.'
      ],
      actionTitle: 'Смотреть Nike в каталоге →',
      actionType: 'brand_Nike',
      sources: ['👟 Nike Heritage Archive', '📊 Статистика цен Poizon']
    },
    {
      id: 'silhouette_jordan4',
      keywords: ['jordan 4', 'aj4', 'джордан 4', 'четверки', 'четверок', 'четверках', 'black cat', 'military black', 'bred reimagined'],
      title: 'Air Jordan 4 Retro: легендарная классика Тинкера Хэтфилда',
      badge: '🏀 Силуэт Jordan 4',
      summary: 'Одна из самых желанных моделей стритвира (Military Black, Pine Green, Bred Reimagined, Black Cat) доступна для официального выкупа с Poizon.',
      bullets: [
        '📏 <span class="font-bold text-white">Посадка и комфорт:</span> Модель имеет жесткий анатомический носок. Людям со стандартной или широкой стопой рекомендуется брать на 0.5 размера больше обычного Nike.',
        '📦 <span class="font-bold text-white">Вес посылки:</span> Пара Jordan 4 с массивной фирменной коробкой весит в среднем 1.5–1.7 кг.',
        '🛡️ <span class="font-bold text-white">Аутентификация:</span> На Jordan 4 приходится много подделок на рынке. На Poizon каждая пара проходит проверку геометрии сетки, швов и маркировок.'
      ],
      actionTitle: 'Смотреть Jordan в каталоге →',
      actionType: 'brand_Jordan',
      sources: ['🏀 Jordan Retro Catalog', '🛡️ Legit Check Verified']
    },
    {
      id: 'silhouette_af1',
      keywords: ['air force', 'af1', 'форсы', 'форсов', 'форсах', 'force 1', 'аир форс', 'белые форсы'],
      title: 'Nike Air Force 1 \'07: базовая городская классика',
      badge: '👟 Силуэт Air Force 1',
      summary: 'Белые и черные Air Force 1 \'07 — главный бестселлер Poizon по самым выгодным ценам (от 500–650 ¥ за оригинальную пару из натуральной кожи).',
      bullets: [
        '📏 <span class="font-bold text-white">Посадка:</span> Air Force 1 традиционно слегка большемерят. Большинству покупателей подходит размер на 0.5 меньше привычного, либо ориентируйтесь строго по сантиметрам стельки (CM).',
        '⚖️ <span class="font-bold text-white">Вес:</span> Классическая пара в коробке весит около 1.2–1.4 кг.',
        '🌧️ <span class="font-bold text-white">Практичность:</span> Натуральная плотная кожа легко очищается и долго держит форму.'
      ],
      actionTitle: 'Рассчитать выкуп AF1 →',
      actionType: 'calculator',
      sources: ['👟 Nike Air Force 1 Index', '⚡ ICE LOGIX Calculator']
    },
    {
      id: 'silhouette_nb',
      keywords: ['1906', '1906r', '2002r', '530', 'new balance', 'нью беланс', 'нб 1906', 'нб 2002', 'nb 1906', 'nb 2002', 'nb 530'],
      title: 'New Balance 1906R / 2002R / 530: максимальный комфорт',
      badge: '👟 New Balance Lifestyle',
      summary: 'Флагманские беговые ретро-силуэты New Balance с технологичной амортизацией N-ergy и подошвой Abzorb — абсолютные лидеры по удобству для города.',
      bullets: [
        '📏 <span class="font-bold text-white">Посадка 1906R и 2002R:</span> Идут размер в размер (TTS). Если стопа широкая — лучше взять на 0.5 размера больше.',
        '📏 <span class="font-bold text-white">Посадка NB 530:</span> Дышащая легкая сетка, сидят свободно, ориентируйтесь строго на EUR размер.',
        '💰 <span class="font-bold text-white">Выгода в Китае:</span> New Balance официально производится в Азии, поэтому цены на Poizon часто в 1.5–2 раза ниже ритейла в СНГ.'
      ],
      actionTitle: 'Смотреть New Balance →',
      actionType: 'brand_New Balance',
      sources: ['👟 NB Tech Specs (N-ergy)', '🏷️ Каталог Poizon']
    },
    {
      id: 'silhouette_adidas_samba_campus',
      keywords: ['самба', 'samba', 'campus', 'кампус', 'campus 00s', 'кампусы', 'газели', 'gazelle', 'самбы', 'самбах'],
      title: 'Adidas Samba OG / Campus 00s / Gazelle: винтажный тренд',
      badge: '👟 Adidas Originals',
      summary: 'Главные хиты уличной моды: культовая низкая Samba OG и массивные дутые скейтерские Campus 00s по ценам от 380–550 ¥.',
      bullets: [
        '📏 <span class="font-bold text-white">Adidas Samba OG:</span> Модель достаточно узкая с низким подъемом — рекомендуется брать на 0.5 размера больше своего EUR.',
        '🛹 <span class="font-bold text-white">Adidas Campus 00s:</span> Дутые скейтерские кеды с широкими шнурками. Идут размер в размер.',
        '🌿 <span class="font-bold text-white">Материалы:</span> Натуральная замша, кожа и классический Т-образный носок (T-toe).'
      ],
      actionTitle: 'Смотреть Adidas в каталоге →',
      actionType: 'brand_Adidas',
      sources: ['👟 Adidas Originals Spec', '📊 Poizon Trends 2026']
    },
    {
      id: 'silhouette_travis_yeezy',
      keywords: ['трэвис', 'травис', 'travis', 'скотт', 'yeezy', 'изи', 'слайды', 'slides', 'foam runner', 'пены', '350 v2', 'бусты'],
      title: 'Коллаборации Travis Scott & линейка Yeezy: премиум-сегмент',
      badge: '🔥 Премиум & Лимитки',
      summary: 'Редчайшие коллаборации Travis Scott x Jordan / Nike, а также оригинальные Yeezy Boost 350 v2, Slides и Foam Runner доступны для выкупа.',
      bullets: [
        '📏 <span class="font-bold text-white">Размеры Yeezy & Slides:</span> Yeezy маломерят минимум на 1 размер! Тапочки Slides и сабо Foam Runner обязательно берите на 1–2 размера больше своего обычного.',
        '🛡️ <span class="font-bold text-white">Строжайшая аутентификация:</span> Все редкие пары проверяются по базам данных фабричных партий и защитным чипам Poizon.',
        '✈️ <span class="font-bold text-white">100% страховка:</span> Дорогостоящие пары страхуются на полную стоимость на всех этапах доставки.'
      ],
      actionTitle: 'Открыть калькулятор цен →',
      actionType: 'calculator',
      sources: ['🔥 Poizon Limited Division', '🛡️ 100% Insurance Guarantee']
    },
    {
      id: 'streetwear_trapstar_corteiz',
      keywords: ['трапстар', 'trapstar', 'кортез', 'corteiz', 'crts', 'трапстара', 'кортеза', 'худи кортез', 'пуховик трапстар', 'hyperdrive'],
      title: 'Британский дрилл и стритвир: Trapstar London & Corteiz RTW',
      badge: '🇬🇧 UK Streetwear',
      summary: 'Оригинальные пуховики Trapstar Hyperdrive / Decoded, сумки-мессенджеры, а также худи и штаны Corteiz Alcatraz.',
      bullets: [
        '📏 <span class="font-bold text-white">Пуховики Trapstar:</span> Плотный приталенный силуэт. Если планируете носить поверх толстого худи — берите на размер больше привычного.',
        '👕 <span class="font-bold text-white">Corteiz худи и штаны:</span> Фирменный оверсайз крой из плотного тяжелого хлопка (400–450 GSM).',
        '📦 <span class="font-bold text-white">Вес посылки:</span> Пуховик Trapstar весит около 1.5–1.9 кг, сумка 0.3 кг, комплект худи+штаны около 1.3 кг.'
      ],
      actionTitle: 'Смотреть бренды стритвира →',
      actionType: 'brand_Trapstar',
      sources: ['🇬🇧 London Streetwear Guide', '🏷️ Poizon Apparel']
    },
    {
      id: 'outdoor_arcteryx_tnf',
      keywords: ['арктерикс', 'arcteryx', 'куртка с птицей', 'тнф', 'нуптсе', 'nuptse', 'the north face', 'норт фейс', 'мембрана', 'gore-tex', 'гортекс'],
      title: 'Аутдор: куртки Arc\'teryx и пуховики The North Face Nuptse 1996',
      badge: '🏔️ Outdoor & GORE-TEX',
      summary: 'Оригинальные мембранные куртки Arc\'teryx (Beta, Alpha) и культовые пуховики The North Face 1996 Retro Nuptse (натуральный пух 700 Fill Down).',
      bullets: [
        '🌧️ <span class="font-bold text-white">Arc\'teryx GORE-TEX:</span> Ветро- и влагозащита высочайшего уровня. Крой рассчитан на многослойность (термобелье + флис + мембрана).',
        '❄️ <span class="font-bold text-white">The North Face Nuptse:</span> Классический объемный крой со складывающимся капюшоном. Вес пуховика около 0.9–1.1 кг.',
        '🛡️ <span class="font-bold text-white">Аутентификация:</span> Подлинность голограмм, фурнитуры YKK Vislon и вышивки проверяется экспертами Poizon.'
      ],
      actionTitle: 'Смотреть Arc\'teryx в каталоге →',
      actionType: 'brand_Arc\'teryx',
      sources: ['🏔️ GORE-TEX Tech Lab', '🛡️ Legit Check Certified']
    },
    {
      id: 'shoes_ugg',
      keywords: ['угги', 'ugg', 'угг', 'тапочки ugg', 'tazz', 'tasman', 'ultra mini', 'ультра мини', 'тасман', 'тазз'],
      title: 'UGG Australia: оригинальные Ultra Mini, Tasman и Tazz',
      badge: '❄️ Зимняя обувь UGG',
      summary: 'Натуральная овчина, теплая мягкая стелька UGGplush и фирменная подошва Treadlite. На Poizon доступны все популярные цвета (Chestnut, Black, Mustard Seed).',
      bullets: [
        '📏 <span class="font-bold text-white">Посадка:</span> Из-за густого меха внутри новая пара сидит очень плотно. В течение нескольких дней мех усаживается по стопе. Рекомендуется брать свой размер или на 0.5 больше.',
        '⚖️ <span class="font-bold text-white">Вес посылки:</span> Тапочки Tasman около 0.7–0.9 кг, сапожки Ultra Mini около 1.0–1.2 кг.',
        '🐑 <span class="font-bold text-white">100% натуральная замша:</span> Защита от холода до -25°C.'
      ],
      actionTitle: 'Смотреть UGG в каталоге →',
      actionType: 'brand_UGG',
      sources: ['❄️ UGG Authentic Materials', '🏷️ Poizon Catalog']
    },
    {
      id: 'delivery_belarus_cities',
      keywords: ['гомел', 'брест', 'гродн', 'витебск', 'могилев', 'полоцк', 'бобруйск', 'баранович', 'беларус', 'европочт', 'рб', 'минск'],
      title: 'Доставка по всем городам и регионам Беларуси',
      badge: '🇧🇾 Доставка по Беларуси',
      summary: 'Все посылки прибывают рейсом из Китая на центральный сортировочный хаб в Минске, проходят таможню и за 24–48 часов доставляются в любой пункт Европочты или СДЭК в вашем городе.',
      bullets: [
        '📦 <span class="font-bold text-white">Пункты выдачи:</span> Более 500 отделений Европочты и СДЭК по всей Беларуси — забирайте рядом с домом.',
        '⏱️ <span class="font-bold text-white">Сроки:</span> Авиарейс из Китая 8–12 рабочих дней + 1–2 дня пересылка по Беларуси.',
        '💳 <span class="font-bold text-white">Оплата:</span> Карты любых белорусских банков (Белкарт, Visa, Mastercard), ЕРИП и Оплати без скрытых комиссий.'
      ],
      actionTitle: 'Рассчитать доставку в калькуляторе →',
      actionType: 'calculator',
      sources: ['🚚 Европочта & СДЭК Сеть', '🇧🇾 Таможня Минск-2']
    },
    {
      id: 'delivery_russia_cities',
      keywords: ['москв', 'питер', 'спб', 'петербург', 'санкт-петербург', 'росси', 'рф', 'екатеринбург', 'новосибирск', 'казан', 'краснодар', 'ростов'],
      title: 'Доставка в Москву, Санкт-Петербург и любые города России',
      badge: '🇷🇺 Доставка по РФ',
      summary: 'ICE LOGIX организует бесперебойную доставку оригинальных товаров с Poizon в Российскую Федерацию с выдачей в пунктах СДЭК.',
      bullets: [
        '🚚 <span class="font-bold text-white">Пункты выдачи:</span> Любое удобное отделение СДЭК в вашем городе или курьерская доставка до двери.',
        '⏱️ <span class="font-bold text-white">Сроки:</span> Авиадоставка 10–14 дней до Москвы и СПб, в регионы РФ 12–16 дней.',
        '💳 <span class="font-bold text-white">Оплата:</span> Принимаем карты МИР через защищенный шлюз bePaid.'
      ],
      actionTitle: 'Рассчитать доставку в РФ →',
      actionType: 'calculator',
      sources: ['🚚 Логистическая сеть СДЭК', '💳 Платежи МИР']
    },
    {
      id: 'process_two_steps',
      keywords: ['2 этапа', 'два этапа', 'двухэтапная', 'второй платеж', 'почему отдельно', 'оплата веса', 'раздельно', 'почему 2', 'зачем два платежа', 'второй этап'],
      title: 'Прозрачная двухэтапная оплата ICE LOGIX',
      badge: '✌️ Система 2 этапов',
      summary: 'Мы не берем приблизительные суммы за доставку заранее — вы платите строго за реальный вес посылки без переплат.',
      bullets: [
        '1️⃣ <span class="font-bold text-white">Этап 1 (Выкуп):</span> Оплата стоимости товара на Poizon + комиссия сервиса 20%. Товар сразу выкупается и направляется на склад.',
        '2️⃣ <span class="font-bold text-white">Этап 2 (Доставка):</span> Когда посылка прибывает на китайский склад, она взвешивается на электронных весах. Вы оплачиваете фактический вес ($10/кг).',
        '🛡️ <span class="font-bold text-white">Честность:</span> Никаких скрытых округлений — если посылка весит 1.25 кг, вы платите ровно за 1.25 кг.'
      ],
      actionTitle: 'Рассчитать тарифы →',
      actionType: 'calculator',
      sources: ['⚖️ Регламент тарификации', '🤝 Финансовая прозрачность']
    },
    {
      id: 'poizon_blue_black_btn',
      keywords: ['синяя кнопка', 'черная кнопка', 'синяя или черная', 'кнопки пойзон', 'кнопка poizon', 'быстрая доставка пойзон', 'синей кнопки', 'черной кнопки'],
      title: 'Разница между кнопками на Poizon (Синяя vs Черная)',
      badge: '🛍️ Poizon Экспресс vs Стандарт',
      summary: 'На платформе Poizon у каждого размера есть несколько вариантов покупки от разных продавцов:',
      bullets: [
        '🔵 <span class="font-bold text-white">Синяя кнопка (Экспресс 95):</span> Товар уже находится на складе Poizon и прошел предварительную проверку. Отправляется на наш транзитный склад за 1–2 дня.',
        '⚫ <span class="font-bold text-white">Черная кнопка (Стандарт):</span> Товар находится у частного продавца. Сначала отправляется в лабораторию Poizon на легитчек (2–4 дня), затем к нам.',
        '💡 <span class="font-bold text-white">Совет:</span> Если разница в цене невелика, всегда выбирайте синюю кнопку для максимальной скорости.'
      ],
      actionTitle: 'Перейти в каталог Poizon →',
      actionType: 'catalogs',
      sources: ['🛍️ Poizon Dewu Guide', '⚡ ICE LOGIX Экспресс']
    },
    {
      id: 'customs_limits',
      keywords: ['таможн', 'пошлин', 'лимит', '200', 'евро', 'налог', 'растаможк', 'превышен', '31 кг'],
      title: 'Таможенные лимиты ЕАЭС: 200€ и 31 кг на посылку',
      badge: '⚖️ Таможенные правила',
      summary: 'Для физических лиц в Беларуси и России действует беспошлинный порог в 200 евро и 31 кг на одно международное отправление.',
      bullets: [
        '📦 <span class="font-bold text-white">Без пошлины:</span> Любые товары до 200€ (≈ 1550–1600 ¥) ввозятся с нулевой пошлиной (0 ₽).',
        '📊 <span class="font-bold text-white">При превышении:</span> Пошлина составляет 15% только от суммы превышения (например, при заказе на 250€ пошлина 15% от 50€ = 7.5€).',
        '🤝 <span class="font-bold text-white">Помощь сервиса:</span> Поможем грамотно распределить позиции на несколько посылок, если заказывается несколько дорогих вещей.'
      ],
      actionTitle: 'Рассчитать пошлину в калькуляторе →',
      actionType: 'calculator',
      sources: ['⚖️ Таможенный кодекс ЕАЭС', '📋 Нормы ввоза 2026']
    },
    {
      id: 'security_bepaid',
      keywords: ['bepaid', 'безопасность', 'беларусбанк', 'приорбанк', 'сбер', 'мтбанк', 'альфа', 'белкарт', 'карты', 'картами', 'платеж', 'защита карты'],
      title: 'Безопасность банковских платежей через шлюз bePaid',
      badge: '🔒 Финансовая безопасность',
      summary: 'Все транзакции в ICE LOGIX обрабатываются национальным платежным провайдером bePaid в соответствии с законодательством Республики Беларусь.',
      bullets: [
        '🛡️ <span class="font-bold text-white">Стандарт PCI-DSS Level 1:</span> Данные банковских карт никогда не сохраняются на наших серверах и токенизируются на стороне банка.',
        '🔐 <span class="font-bold text-white">Поддержка 3D-Secure:</span> Подтверждение каждой операции одноразовым СМС-кодом от вашего банка.',
        '🇧🇾 <span class="font-bold text-white">Все банки Беларуси:</span> Беларусбанк, Приорбанк, Альфа-Банк, Сбер Банк, МТБанк и любые карты Белкарт.'
      ],
      actionTitle: 'Управление картами в профиле →',
      actionType: 'finances',
      sources: ['💳 Провайдер bePaid', '🔒 Стандарт PCI-DSS']
    },
    {
      id: 'support_care_service',
      keywords: ['поддерж', 'поддержка', 'поддержку', 'поддержкой', 'поддержке', 'менеджер', 'менеджера', 'оператор', 'оператора', 'помощь', 'помогите', 'связь', 'связаться', 'вопрос', 'чат', 'служба заботы', 'человек', 'живой'],
      title: 'Служба заботы ICE LOGIX: живая поддержка 24/7',
      badge: '🎧 Персональная забота',
      summary: 'Если вам нужна помощь с поиском редкой пары, замерами стельки или расчетом — наши специалисты готовы помочь в Telegram.',
      bullets: [
        '🙋 <span class="font-bold text-white">Поиск по фото:</span> Пришлите скриншот модели из Instagram, TikTok или Pinterest — найдем лучшую цену на Poizon.',
        '⚡ <span class="font-bold text-white">Быстрый ответ:</span> Среднее время ответа оператора — до 5–10 минут.',
        '📍 <span class="font-bold text-white">Индивидуальное ведение:</span> Отслеживаем заказ до момента вручения в пункте выдачи.'
      ],
      actionTitle: 'Написать оператору в Telegram →',
      actionType: 'support',
      sources: ['🎧 @icelogix_support_bot', '👥 Команда заботы']
    }
  ];

  // ============================================================
  // ENGINE 2: AI NATURAL LANGUAGE & INTENT DETECTOR
  // ============================================================

  function detectAiIntent(rawQ, cleanLower, userCtx) {
    const priceMatch = cleanLower.match(/(\d+[\.,]?\d*)\s*(¥|юаней|юань|ю|cny|rmb)/i) || cleanLower.match(/(\d{2,6})\s*¥/);
    const weightMatch = cleanLower.match(/(\d+[\.,]?\d*)\s*(кг|kg|кило|килограмм)/i) || cleanLower.match(/вес[а-я\s:]+(\d+[\.,]?\d*)/i);

    if (priceMatch && weightMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      const weight = parseFloat(weightMatch[1].replace(',', '.'));

      if (!isNaN(price) && !isNaN(weight) && price > 0 && weight > 0) {
        const cnyRateByn = window.currentRates?.CNY_to_BYN || 0.45;
        const cnyRateRub = 13.8;
        const usdRateByn = window.currentRates?.USD_to_BYN || 3.28;
        const usdRateRub = 94.0;
        const commissionRate = 1.20; // 20%
        const tariffPerKgUsd = 10; // $10/kg

        const buyCostByn = price * cnyRateByn * commissionRate;
        const buyCostRub = price * cnyRateRub * commissionRate;
        const shippingCostByn = weight * tariffPerKgUsd * usdRateByn;
        const shippingCostRub = weight * tariffPerKgUsd * usdRateRub;

        const totalByn = (buyCostByn + shippingCostByn).toFixed(1);
        const totalRub = Math.round(buyCostRub + shippingCostRub);

        let itemName = 'Товар';
        if (cleanLower.includes('пуховик') || cleanLower.includes('куртка')) itemName = 'Куртка / Пуховик';
        else if (cleanLower.includes('кроссовк') || cleanLower.includes('обувь') || cleanLower.includes('кеды') || cleanLower.includes('ботинк')) itemName = 'Обувь';
        else if (cleanLower.includes('худи') || cleanLower.includes('зипк') || cleanLower.includes('толстовк')) itemName = 'Худи / Свитшот';
        else if (cleanLower.includes('штаны') || cleanLower.includes('джинс')) itemName = 'Штаны / Джинсы';
        else if (cleanLower.includes('футболк') || cleanLower.includes('майк')) itemName = 'Футболка';

        return {
          type: 'complex_calc',
          badge: '✨ ИИ-Расчет «Под ключ»',
          itemName,
          priceCny: price,
          weightKg: weight,
          totalByn,
          totalRub,
          buyCostByn: buyCostByn.toFixed(1),
          shippingCostByn: shippingCostByn.toFixed(1)
        };
      }
    }

    // Scan Comprehensive AI Knowledge Topics (Slang, Silhouettes, Cities, Logistics, Security)
    let bestTopic = null;
    let highestScore = 0;

    for (const topic of AI_KNOWLEDGE_TOPICS) {
      let score = 0;
      for (const kw of topic.keywords) {
        const kwLower = kw.toLowerCase();
        if (cleanLower === kwLower) {
          score += 10; // Exact match
        } else if (cleanLower.includes(kwLower)) {
          // Substring match
          score += (kwLower.length >= 4) ? 4 : 2;
        } else {
          // Word token match
          const words = cleanLower.split(/\s+/);
          if (words.includes(kwLower)) {
            score += 3;
          }
        }
      }

      if (score > highestScore && score >= 2) {
        highestScore = score;
        bestTopic = topic;
      }
    }

    if (bestTopic) {
      return {
        type: 'ai_answer',
        topicId: bestTopic.id,
        title: bestTopic.title,
        badge: bestTopic.badge,
        summary: bestTopic.summary,
        bullets: bestTopic.bullets,
        actionTitle: bestTopic.actionTitle,
        actionType: bestTopic.actionType,
        sources: bestTopic.sources
      };
    }

    return null;
  }

  // ============================================================
  // ENGINE 3: SMART URL & LINK DETECTOR
  // ============================================================

  function detectProductUrl(q) {
    const raw = q.trim();
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|cn|de|org|ru|by|net)\/[^\s]*)/i;
    const match = raw.match(urlPattern);

    if (match) {
      let fullUrl = match[1];
      if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl;

      let platformName = 'Маркетплейс';
      let icon = '🔗';
      let platformBadge = 'Внешняя ссылка';

      const lower = fullUrl.toLowerCase();
      if (lower.includes('dewu.com') || lower.includes('poizon.com')) {
        platformName = 'Poizon (Dewu)';
        icon = '👟';
        platformBadge = 'Китай • Оригинал';
      } else if (lower.includes('taobao.com') || lower.includes('tmall.com')) {
        platformName = 'Taobao / Tmall';
        icon = '🛍️';
        platformBadge = 'Китай • Выкуп';
      } else if (lower.includes('1688.com')) {
        platformName = '1688 (Опт)';
        icon = '📦';
        platformBadge = 'Китай • Оптовый склад';
      } else if (lower.includes('weidian.com')) {
        platformName = 'Weidian (Вейдиан)';
        icon = '🏷️';
        platformBadge = 'Китай • Магазин';
      } else if (lower.includes('zalando')) {
        platformName = 'Zalando';
        icon = '🇪🇺';
        platformBadge = 'Европа • Германия';
      } else if (lower.includes('asos.com')) {
        platformName = 'ASOS';
        icon = '🇬🇧';
        platformBadge = 'Европа • UK';
      } else if (lower.includes('nike.com')) {
        platformName = 'Nike Official';
        icon = '✔️';
        platformBadge = 'США / ЕС';
      }

      return {
        url: fullUrl,
        platformName,
        icon,
        platformBadge
      };
    }
    return null;
  }

  // ============================================================
  // ENGINE 4: MULTI-CURRENCY & MATH CALCULATOR
  // ============================================================

  function detectMathOrCurrency(q) {
    const cleaned = q.replace(/\s+/g, '').toLowerCase();

    const isMathExpr = /^(\d+[\.,]?\d*)([\+\-\*\/])(\d+[\.,]?\d*)$/.test(cleaned);
    if (isMathExpr) {
      try {
        const expr = cleaned.replace(/,/g, '.');
        const parts = expr.match(/^(\d+\.?\d*)([\+\-\*\/])(\d+\.?\d*)$/);
        if (parts) {
          const a = parseFloat(parts[1]);
          const op = parts[2];
          const b = parseFloat(parts[3]);
          let res = 0;
          if (op === '+') res = a + b;
          else if (op === '-') res = a - b;
          else if (op === '*') res = a * b;
          else if (op === '/') res = b !== 0 ? a / b : 0;

          return {
            type: 'math',
            expression: `${a} ${op} ${b}`,
            result: Math.round(res * 100) / 100
          };
        }
      } catch (e) {}
    }

    const cnyMatch = cleaned.match(/^(\d+[\.,]?\d*)(¥|юаней|юань|ю|cny|rmb)$/i) ||
                     cleaned.match(/^(¥|cny|rmb)(\d+[\.,]?\d*)$/i);
    const usdMatch = cleaned.match(/^(\d+[\.,]?\d*)(\$|usd|долларов|доллар|бакс|баксов)$/i) ||
                     cleaned.match(/^(\$|usd)(\d+[\.,]?\d*)$/i);
    const eurMatch = cleaned.match(/^(\d+[\.,]?\d*)(€|eur|евро)$/i) ||
                     cleaned.match(/^(€|eur)(\d+[\.,]?\d*)$/i);
    const rubMatch = cleaned.match(/^(\d+[\.,]?\d*)(₽|rub|руб|рублей|р)$/i);
    const bynMatch = cleaned.match(/^(\d+[\.,]?\d*)(byn|белруб|бел|бр)$/i);
    const numberOnlyMatch = cleaned.match(/^(\d{2,6})$/);

    const matchObj = cnyMatch || usdMatch || eurMatch || rubMatch || bynMatch || numberOnlyMatch;
    if (!matchObj) return null;

    let currency = 'CNY';
    let rawNumStr = '';

    if (cnyMatch) {
      currency = 'CNY';
      rawNumStr = cnyMatch[1] === '¥' || cnyMatch[1] === 'cny' || cnyMatch[1] === 'rmb' ? cnyMatch[2] : cnyMatch[1];
    } else if (usdMatch) {
      currency = 'USD';
      rawNumStr = usdMatch[1] === '$' || usdMatch[1] === 'usd' ? usdMatch[2] : usdMatch[1];
    } else if (eurMatch) {
      currency = 'EUR';
      rawNumStr = eurMatch[1] === '€' || eurMatch[1] === 'eur' ? eurMatch[2] : eurMatch[1];
    } else if (rubMatch) {
      currency = 'RUB';
      rawNumStr = rubMatch[1];
    } else if (bynMatch) {
      currency = 'BYN';
      rawNumStr = bynMatch[1];
    } else if (numberOnlyMatch) {
      currency = 'CNY';
      rawNumStr = numberOnlyMatch[1];
    }

    const amount = parseFloat(rawNumStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0 || amount > 1000000) return null;

    const cnyRateByn = window.currentRates?.CNY_to_BYN || 0.45;
    const cnyRateRub = 13.8;
    const usdRateByn = window.currentRates?.USD_to_BYN || 3.28;
    const eurRateByn = window.currentRates?.EUR_to_BYN || 3.59;
    const commissionRate = 1.20; // 20%
    const deliveryEstRub = 1200;
    const deliveryEstByn = 38;

    if (currency === 'CNY') {
      const subtotalRub = Math.round(amount * cnyRateRub * commissionRate);
      const totalEstRub = subtotalRub + deliveryEstRub;
      const subtotalByn = (amount * cnyRateByn * commissionRate).toFixed(1);
      const totalEstByn = (parseFloat(subtotalByn) + deliveryEstByn).toFixed(1);

      return {
        type: 'cny',
        currency: 'CNY',
        cnyAmount: amount,
        totalEstRub,
        totalEstByn,
        subtotalRub,
        subtotalByn,
        cnyRateByn
      };
    } else {
      let bynEquivalent = 0;
      let rubEquivalent = 0;

      if (currency === 'USD') {
        bynEquivalent = (amount * usdRateByn).toFixed(1);
        rubEquivalent = Math.round(amount * 94);
      } else if (currency === 'EUR') {
        bynEquivalent = (amount * eurRateByn).toFixed(1);
        rubEquivalent = Math.round(amount * 102);
      } else if (currency === 'RUB') {
        bynEquivalent = (amount * 0.035).toFixed(1);
        rubEquivalent = Math.round(amount);
      } else if (currency === 'BYN') {
        bynEquivalent = amount.toFixed(1);
        rubEquivalent = Math.round(amount * 28.5);
      }

      return {
        type: 'currency',
        currency,
        amount,
        bynEquivalent,
        rubEquivalent
      };
    }
  }

  // ============================================================
  // ENGINE 5: MARKETPLACES SEARCH
  // ============================================================

  function searchMarketplaces(cleanLower) {
    const list = [
      { name: 'Dewu', country: 'Китай', desc: 'Кроссовки, одежда, стритвир и 100% легитчек', url: 'https://dewu.com', badge: '100% Оригинал', icon: '👟' },
      { name: 'TaoBao', country: 'Китай', desc: 'Крупнейший гипермаркет Китая от Alibaba Group', url: 'https://taobao.com', badge: 'Выгодные цены', icon: '🛍️' },
      { name: 'Pinduoduo', country: 'Китай', desc: 'Платформа совместных покупок по фабричным ценам', url: 'https://mobile.yangkeduo.com', badge: 'Фабрики', icon: '📦' },
      { name: 'Goofish', country: 'Китай', desc: 'Главная ресейл-биржа Китая от Alibaba (Xianyu)', url: 'https://www.goofish.com', badge: 'Ресейл', icon: '🐟' },
      { name: '95', country: 'Китай', desc: 'Премиальный аутлет-ресейл экосистемы Dewu с легитчеком', url: 'https://www.95fen.com', badge: 'Аутлет / Легит', icon: '✨' },
      { name: 'JD', country: 'Китай', desc: 'Флагманский ритейлер моды, обуви и премиальной техники', url: 'https://www.jd.com', badge: 'Гарантия качества', icon: '🐶' },
      { name: 'Tmall', country: 'Китай', desc: 'Официальные бутики мировых брендов (Alibaba Group)', url: 'https://www.tmall.com', badge: 'Флагманские бутики', icon: '🐱' }
    ];

    return list.filter(m => {
      return m.name.toLowerCase().includes(cleanLower) ||
             m.country.toLowerCase().includes(cleanLower) ||
             m.desc.toLowerCase().includes(cleanLower);
    });
  }

  // ============================================================
  // ENGINE 6: STRICTLY ISOLATED USER ORDERS & TRACKING SEARCH
  // ============================================================

  async function searchUserOrders(q, userCtx) {
    const clean = q.trim();
    if (!clean || clean.length < 2) return [];

    if (!userCtx.userId) return [];

    let orders = [];
    try {
      const cached = localStorage.getItem('ice_cached_orders_' + userCtx.userId);
      if (cached) {
        orders = JSON.parse(cached) || [];
      }

      let matched = orders.filter(o => {
        const idStr = String(o.id || '');
        const numStr = String(o.order_number || '');
        const trackStr = String(o.track_number || o.tracking_number || '').toLowerCase();
        const titleStr = String(o.title || o.product_name || '').toLowerCase();
        const qLower = clean.toLowerCase();

        const isIntent = qLower.includes('заказ') || qLower.includes('посылк') || qLower.includes('трек') || qLower.includes('где');

        return isIntent ||
               idStr.includes(clean) ||
               numStr.includes(clean) ||
               trackStr.includes(qLower) ||
               titleStr.includes(qLower);
      });

      if (matched.length === 0 && window.supabaseClient && clean.length >= 3) {
        const { data } = await window.supabaseClient
          .from('orders')
          .select('id, order_number, track_number, tracking_number, status, title, price_byn, created_at')
          .eq('user_id', userCtx.userId)
          .or(`order_number.ilike.%${clean}%,track_number.ilike.%${clean}%,title.ilike.%${clean}%`)
          .limit(4);

        if (data && data.length > 0) {
          matched = data;
        }
      }

      return matched;
    } catch (e) {
      return [];
    }
  }

  // ============================================================
  // ENGINE 7: CATALOG PRODUCTS SEARCH
  // ============================================================

  async function searchCatalogProducts(q) {
    const clean = q.trim();
    if (!clean || clean.length < 2 || !window.supabaseClient) return [];

    try {
      const { data } = await window.supabaseClient
        .from('products')
        .select('id, title, brand, price, image_url, category')
        .eq('is_active', true)
        .or(`title.ilike.%${clean}%,brand.ilike.%${clean}%`)
        .limit(4);

      return data || [];
    } catch (e) {
      return [];
    }
  }

  // ============================================================
  // GOOGLE AI OVERVIEW SYNTHESIZER (STEP 2)
  // Generates authoritative, personalized, natural language
  // syntheses inspired by Google's generative AI overview.
  // ============================================================

  function buildGoogleAiOverview({
    query,
    userCtx,
    profileMatch,
    aiIntent,
    detectedUrl,
    mathResult,
    matchingOrders,
    matchingFaq,
    matchingBrands,
    matchingProducts,
    matchingMarketplaces,
    matchingShortcuts
  }) {
    const qLower = (query || '').toLowerCase().trim();
    let bodyHtml = '';
    let bullets = [];
    let actions = [];
    let sources = [];

    // --- Scenario 1: Detected Direct Product Link (Poizon, Taobao, 1688, etc.) ---
    if (detectedUrl) {
      bodyHtml = `Обнаружена прямая ссылка на каталог <span class="text-cyan-300 font-bold">${detectedUrl.platformName}</span>. Товар доступен для официального выкупа в Китае, прохождения экспертизы на подлинность (легитчек) и экспресс-доставки в Беларусь или РФ.`;
      bullets = [
        `🔍 <span class="font-bold text-white">Проверка оригинальности:</span> Каждая позиция проверяется экспертами на складе Poizon с выдачей синей пломбы и QR-сертификата.`,
        `⏱️ <span class="font-bold text-white">Сроки доставки:</span> Экспресс-авиа 8–12 рабочих дней до Минска с дальнейшей отправкой Европочтой или СДЭК.`
      ];
      actions = [
        `<button id="aiOverviewCalcUrlBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md flex items-center gap-1.5">
          <span>⚡</span> Рассчитать в калькуляторе
        </button>`,
        `<button id="aiOverviewOrderUrlBtn" class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1.5">
          <span>📝</span> Оформить выкуп
        </button>`
      ];
      sources = [`🔗 Маркетплейс ${detectedUrl.platformName}`, `🛡️ Экспертиза ICE LOGIX`, `✈️ ShopbyShop Logistics`];
    }
    // --- Scenario 2: Complex Price + Weight Calculation ---
    else if (aiIntent && aiIntent.type === 'complex_calc') {
      bodyHtml = `ИИ выполнил полный экспресс-расчет «под ключ» для категории <span class="text-white font-bold">${aiIntent.itemName}</span> (${aiIntent.priceCny} ¥, вес ${aiIntent.weightKg} кг):`;
      bullets = [
        `💰 <span class="font-bold text-white">Итоговая стоимость с доставкой:</span> <span class="text-cyan-300 font-extrabold text-sm">≈ ${aiIntent.totalRub.toLocaleString('ru-RU')} ₽</span> или <span class="text-white font-bold inline-flex items-center gap-0.5">≈ ${aiIntent.totalByn} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span>.`,
        `🇨🇳 <span class="font-bold text-white">Выкуп товара в Китае:</span> <span class="inline-flex items-center gap-0.5">${aiIntent.buyCostByn} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span> (по курсу ЦБ с официальной комиссией сервиса 20%).`,
        `✈️ <span class="font-bold text-white">Экспресс-авиадоставка:</span> <span class="inline-flex items-center gap-0.5">${aiIntent.shippingCostByn} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span> (тариф $10 за 1 кг). Оплачивается вторым этапом по точному весу.`,
        `⚖️ <span class="font-bold text-white">Таможня:</span> Пошлина 0 (стоимость не превышает беспошлинный лимит 200€ на посылку).`
      ];
      actions = [
        `<button id="aiOverviewApplyCalcBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md flex items-center gap-1.5">
          <span>🚀</span> Перенести в заказ
        </button>`
      ];
      sources = [`🤖 Калькулятор тарифов ICE LOGIX`, `✈️ Логистика ShopbyShop`, `⚖️ Таможенный лимит 200€`];
    }
    // --- Scenario 3: Currency / Math Widget ---
    else if (mathResult) {
      if (mathResult.type === 'cny') {
        bodyHtml = `Экспресс-конвертация суммы в юанях по актуальному курсу с учетом официального выкупа и комиссии ICE LOGIX (20%):`;
        bullets = [
          `💵 <span class="font-bold text-white">Примерная стоимость под ключ:</span> <span class="text-cyan-300 font-black text-sm">≈ ${mathResult.totalEstRub.toLocaleString('ru-RU')} ₽</span> или <span class="text-white font-bold inline-flex items-center gap-0.5">≈ ${mathResult.totalEstByn} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span> (${mathResult.cnyAmount} ¥).`,
          `📦 <span class="font-bold text-white">Выкуп без доставки:</span> <span class="inline-flex items-center gap-0.5">${mathResult.subtotalByn} ${window.bynSign ? window.bynSign({ color: 'white', size: '0.85em' }) : ''}</span> (курс ${mathResult.cnyRateByn} к CNY).`
        ];
        actions = [
          `<button id="aiOverviewOpenCalcBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            Открыть калькулятор →
          </button>`
        ];
        sources = [`🇨🇳 Курс ЦБ / НБРБ`, `🤝 Комиссия 20%`];
      } else if (mathResult.type === 'currency') {
        bodyHtml = `Конвертация валюты по официальному курсу:`;
        bullets = [
          `💵 <span class="font-bold text-white">${mathResult.amount} ${mathResult.currency}</span> = <span class="text-cyan-300 font-bold inline-flex items-center gap-0.5">≈ ${mathResult.bynEquivalent} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span> (или ≈ ${mathResult.rubEquivalent.toLocaleString('ru-RU')} ₽).`
        ];
        sources = [`🏦 Официальный курс валют`];
      } else if (mathResult.type === 'math') {
        bodyHtml = `Результат арифметического расчета:`;
        bullets = [
          `🔢 <span class="font-mono text-white/80">${mathResult.expression}</span> = <span class="text-cyan-300 font-black text-lg font-mono">${mathResult.result}</span>`
        ];
        sources = [`⚡ Встроенный калькулятор`];
      }
    }
    // --- Scenario 4: User Profile Intent (Balance or Saved Cards or Delivery Address) ---
    else if (profileMatch) {
      if (profileMatch.type === 'balance') {
        bodyHtml = `Здравствуйте, ${userCtx.userName}! На вашем персональном балансе сейчас <span class="text-cyan-300 font-black text-sm inline-flex items-center gap-1">${userCtx.balance || 0} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span>.`;
        bullets = [
          `💡 <span class="font-bold text-white">Использование:</span> Средства на балансе можно использовать для моментальной оплаты выкупа товаров и доставки без банковских комиссий.`,
          `⚡ <span class="font-bold text-white">Пополнение:</span> Моментальное зачисление через ЕРИП, Оплати и картами любых банков Беларуси (0% комиссии).`
        ];
        actions = [
          `<button id="aiOverviewFinancesBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            Перейти в «Финансы» →
          </button>`
        ];
        sources = [`👤 Ваш профиль @${userCtx.userId || 'user'}`, `💳 Платежный шлюз bePaid`];
      } else if (profileMatch.type === 'cards') {
        const cardCount = userCtx.cards.length;
        bodyHtml = cardCount > 0
          ? `К вашему профилю надежно привязано <span class="text-cyan-300 font-bold">${cardCount} ${cardCount === 1 ? 'банковская карта' : 'банковские карты'}</span> для быстрой оплаты в 1 клик.`
          : `К вашему профилю пока не привязаны банковские карты. Сервис ICE LOGIX поддерживает карты всех 20 банков Беларуси.`;
        bullets = [
          `🛡️ <span class="font-bold text-white">Безопасность:</span> Данные карт не хранятся на наших серверах, а токенизируются по стандарту безопасности PCI-DSS Level 1 через шлюз bePaid.`,
          `🇧🇾 <span class="font-bold text-white">Поддерживаемые банки:</span> Беларусбанк, Приорбанк, Альфа-Банк, МТБанк, Сбер Банк, Белинвестбанк и все остальные банки РБ (Белкарт, Visa, Mastercard, МИР).`
        ];
        actions = [
          `<button id="aiOverviewManageCardsBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            ${cardCount > 0 ? 'Управление картами →' : '+ Привязать карту'}
          </button>`
        ];
        sources = [`💳 Токенизация bePaid`, `🔒 Стандарт PCI-DSS`];
      } else if (profileMatch.type === 'address') {
        const addr = userCtx.deliveryInfo;
        bodyHtml = addr
          ? `Ваш текущий сохраненный адрес доставки: <span class="text-white font-bold">${addr.city || ''}, ${addr.address || addr.pvz_address || 'Пункт выдачи'}</span> (служба: ${addr.carrier || 'Европочта / СДЭК'}).`
          : `В вашем профиле еще не сохранен адрес пункта выдачи. Вы сможете указать ближайшее отделение СДЭК или Европочты при первом оформлении заказа.`;
        bullets = [
          `📦 <span class="font-bold text-white">Службы выдачи:</span> Европочта (вся Беларусь), СДЭК (Беларусь и РФ), Белпочта.`,
          `⏱️ <span class="font-bold text-white">Срок по прибытии:</span> 1–2 дня после прохождения таможенного контроля в Минске.`
        ];
        actions = [
          `<button id="aiOverviewProfileBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            Открыть профиль →
          </button>`
        ];
        sources = [`👤 Профиль пользователя`, `🚚 Европочта & СДЭК`];
      }
    }
    // --- Scenario 5: User Orders / Tracking Inquiry ---
    else if (qLower.includes('посылк') || qLower.includes('заказ') || qLower.includes('трек') || qLower.includes('где') || matchingOrders.length > 0) {
      if (matchingOrders.length > 0) {
        const topOrder = matchingOrders[0];
        const statusTitle = formatOrderStatus(topOrder.status);
        const orderNum = topOrder.order_number || topOrder.id?.slice(0, 8);
        bodyHtml = `Здравствуйте, ${userCtx.userName}! По вашему запросу найден заказ <span class="text-white font-bold">#${orderNum}</span> (${topOrder.title || 'Товар с Poizon'}). Текущий этап: <span class="text-cyan-300 font-extrabold">${statusTitle}</span>.`;
        bullets = [
          `📍 <span class="font-bold text-white">Трек-номер:</span> ${topOrder.track_number ? `<code class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-[11px]">${topOrder.track_number}</code>` : '<span class="text-white/60">Формируется на складе в Китае</span>'}.`,
          `✈️ <span class="font-bold text-white">Маршрут:</span> Транзитный склад Китая → Сортировочный хаб в Минске → Пункт выдачи (${userCtx.deliveryInfo?.city || 'Беларусь / РФ'}).`,
          `🛡️ <span class="font-bold text-white">Страховка:</span> Посылка застрахована на 100% стоимости выкупа.`
        ];
        actions = [
          `<button class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md" onclick="window.spotlightOpenOrder('${topOrder.id}')">
            Открыть детали заказа #${orderNum} →
          </button>`
        ];
        sources = [`👤 Профиль @${userCtx.userId || 'user'}`, `📦 База заказов Supabase`, `📍 Трекинг ShopbyShop`];
      } else {
        bodyHtml = `Здравствуйте, ${userCtx.userName}! В вашем профиле пока нет оформленных посылок. Как только вы сделаете первый заказ, здесь в режиме реального времени появится его трек-номер, видеоотчет проверки и статус перемещения.`;
        bullets = [
          `💡 <span class="font-bold text-white">Как сделать заказ:</span> Скопируйте ссылку на интересующую вещь в приложении Poizon и вставьте её в наш калькулятор.`,
          `⏱️ <span class="font-bold text-white">Сроки доставки:</span> Авиадоставка 8–12 дней с момента поступления на китайский склад.`
        ];
        actions = [
          `<button id="aiOverviewStartOrderBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            Оформить первый заказ →
          </button>`
        ];
        sources = [`👤 Профиль пользователя`, `📦 База заказов ICE LOGIX`];
      }
    }
    // --- Scenario 6: Dedicated AI Semantic Q&A Intent ---
    else if (aiIntent && aiIntent.type === 'ai_answer') {
      bodyHtml = `<span class="font-bold text-white text-[13px] block mb-1">${aiIntent.title}</span>${aiIntent.summary || aiIntent.text}`;
      bullets = (aiIntent.bullets && aiIntent.bullets.length > 0)
        ? aiIntent.bullets
        : [
            `💡 <span class="font-bold text-white">Официальные условия:</span> ICE LOGIX работает по договору публичной оферты и является официальным зарегистрированным сервисом в Республике Беларусь.`,
            `🤝 <span class="font-bold text-white">Гарантия качества:</span> Полная ответственность за сохранность груза и 100% оригинальность подтверждается двойной экспертизой.`
          ];
      if (aiIntent.actionTitle) {
        actions = [
          `<button id="aiOverviewSemanticActionBtn" data-action-type="${aiIntent.actionType || ''}" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md flex items-center gap-1.5">
            ${aiIntent.actionTitle}
          </button>`
        ];
      }
      sources = aiIntent.sources || [`💡 База знаний ICE LOGIX`, `🛡️ Юридическая оферта`];
    }
    // --- Scenario 7: Knowledge Base FAQ Match ---
    else if (matchingFaq.length > 0) {
      const topFaq = matchingFaq[0];
      bodyHtml = `<span class="font-bold text-white text-[13px] block mb-1">${topFaq.title}</span>${topFaq.summary}`;
      bullets = [
        `📌 <span class="font-bold text-white">Подробности:</span> ${topFaq.details}`,
        `⏱️ <span class="font-bold text-white">Оперативность:</span> Служба заботы ICE LOGIX готова проконсультировать вас по любым нестандартным отправлениям.`
      ];
      actions = [
        `<button id="aiOverviewAskSupportBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md flex items-center gap-1.5">
          <span>🎧</span> Служба заботы 24/7
        </button>`
      ];
      sources = [`💡 База знаний FAQ`, `📋 Регламент обслуживания`];
    }
    // --- Scenario 8: Brand & Streetwear Match ---
    else if (matchingBrands.length > 0) {
      const topBrand = matchingBrands[0];
      bodyHtml = `Бренд <span class="text-white font-bold">${topBrand.name}</span> (${topBrand.category}) доступен для выкупа с китайского маркетплейса Poizon (Dewu) по ценам существенно выгоднее европейского ритейла.`;
      bullets = [
        `👟 <span class="font-bold text-white">Оригинальность:</span> 100% аутентичный товар с фирменными пломбами Poizon, сертификатом экспертизы и сканируемым QR-кодом.`,
        `📏 <span class="font-bold text-white">Подбор размера:</span> Для обуви и одежды ${topBrand.name} рекомендуем ориентироваться на замеры длины стельки в сантиметрах (CM/JP) или европейский размер (EUR).`
      ];
      actions = [
        `<button class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md" onclick="window.spotlightOpenBrand('${topBrand.name}')">
          Смотреть ${topBrand.name} в каталоге →
        </button>`
      ];
      sources = [`👟 Poizon Global Verified`, `🏷️ Каталог брендов`];
    }
    // --- Scenario 9: Size Guide / Shoes / Clothing specific queries ---
    else if (qLower.includes('размер') || qLower.includes('стельк') || qLower.includes('сетка')) {
      bodyHtml = `Рекомендации ИИ по подбору размера обуви и одежды на Poizon:`;
      bullets = [
        `👟 <span class="font-bold text-white">Обувь:</span> Ориентируйтесь на длину стопы в сантиметрах (CM / JP) или европейский размер (EUR).`,
        `👕 <span class="font-bold text-white">Одежда:</span> В карточке каждого товара есть таблица фактических замеров изделия (длина по спине, обхват груди, рукав).`,
        `💡 <span class="font-bold text-white">Голосование покупателей:</span> В блоке "True to size" реальные владельцы отмечают, садится вещь в размер или требует брать на полразмера больше.`
      ];
      actions = [
        `<button id="aiOverviewOpenCatalogsBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
          Открыть каталоги Poizon →
        </button>`
      ];
      sources = [`📏 Размерная сетка Poizon`, `👟 Эксперты ICE LOGIX`];
    }
    // --- Scenario 10: Delivery Terms / Customs specific queries ---
    else if (qLower.includes('доставк') || qLower.includes('срок') || qLower.includes('когда') || qLower.includes('минск') || qLower.includes('пошлин') || qLower.includes('таможн')) {
      bodyHtml = `Сроки и таможенные правила доставки ICE LOGIX в Беларусь и РФ:`;
      bullets = [
        `✈️ <span class="font-bold text-white">Экспресс-авиа (ShopbyShop):</span> 8–12 дней от китайского склада до центрального хаба в Минске.`,
        `⚖️ <span class="font-bold text-white">Таможенный лимит:</span> Беспошлинно до 200€ и 31 кг на одну посылку (при превышении — 15% от суммы превышения).`,
        `🚚 <span class="font-bold text-white">Выдача:</span> СДЭК и Европочта по всей Беларуси и РФ (1–2 дня после выпуска с таможни).`
      ];
      actions = [
        `<button id="aiOverviewOpenCalcBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
          Рассчитать в калькуляторе →
        </button>`
      ];
      sources = [`✈️ ShopbyShop Logistics`, `⚖️ Таможенный комитет ЕАЭС`];
    }
    // --- Scenario 11: General Fallback Synthesis ---
    else {
      bodyHtml = `По запросу «<span class="text-cyan-300 font-bold">${query}</span>» точных прямых совпадений в каталоге не обнаружено. Однако вы можете:`;
      bullets = [
        `🔗 <span class="font-bold text-white">Поиск по ссылке:</span> Скопируйте ссылку на интересующую вещь прямо в приложении Dewu, TaoBao или Pinduoduo и вставьте в строку поиска.`,
        `🎧 <span class="font-bold text-white">Помощь человека:</span> Наша Служба заботы 24/7 найдет любую модель обуви или одежды по фото или названию.`
      ];
      actions = [
        `<button id="aiOverviewAskSupportBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md flex items-center gap-1.5">
          <span>🎧</span> Спросить у оператора
        </button>`
      ];
      sources = [`🤖 Персональный ИИ`, `💡 База знаний ICE LOGIX`];
    }

    return `
      <div class="google-ai-overview-card p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 via-slate-900/90 to-slate-900/95 border-t-2 border-t-cyan-400 border-x border-b border-white/10 shadow-2xl backdrop-blur-xl space-y-3 animate-fadeIn">
        
        <!-- Header: Sparkle + AI Overview Badge -->
        <div class="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xs shadow-md shadow-cyan-500/20">
              ✨
            </div>
            <span class="text-xs font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200">
              AI Overview
            </span>
            <span class="text-[9px] px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 font-bold border border-cyan-400/25">
              Персональный ИИ
            </span>
          </div>
          <span class="text-[10px] text-white/40 flex items-center gap-1 font-medium">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Синтезировано
          </span>
        </div>

        <!-- Synthesized Natural Answer -->
        <div class="text-xs text-white/90 leading-relaxed">
          ${bodyHtml}
        </div>

        <!-- Structured Key Highlights (Bullets) -->
        ${bullets.length > 0 ? `
          <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5 text-[11px] text-white/80">
            ${bullets.map(b => `<div class="leading-snug">${b}</div>`).join('')}
          </div>
        ` : ''}

        <!-- Interactive Quick Actions (Chips) -->
        ${actions.length > 0 ? `
          <div class="pt-1 flex flex-wrap gap-2">
            ${actions.join('')}
          </div>
        ` : ''}

        <!-- Sources / Citations (Google Style) -->
        ${sources.length > 0 ? `
          <div class="pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span class="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex-shrink-0">Источники:</span>
            ${sources.map(s => `
              <span class="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-cyan-300/80 border border-white/5 font-medium">
                ${s}
              </span>
            `).join('')}
          </div>
        ` : ''}

      </div>
    `;
  }

  // ============================================================
  // RENDER SEARCH RESULTS (GOOGLE AI ARCHITECTURE)
  // ============================================================

  function renderSearchResults({ 
    query,
    userCtx,
    profileMatch,
    aiIntent,
    detectedUrl,
    mathResult, 
    matchingShortcuts, 
    matchingFaq, 
    matchingBrands, 
    matchingMarketplaces,
    matchingOrders, 
    matchingProducts 
  }) {
    if (!contentEl) return;

    let html = `<div class="space-y-4 animate-fadeIn">`;

    // ── TOP: GOOGLE AI OVERVIEW SYNTHESIS CARD ──
    html += buildGoogleAiOverview({
      query,
      userCtx,
      profileMatch,
      aiIntent,
      detectedUrl,
      mathResult,
      matchingOrders,
      matchingFaq,
      matchingBrands,
      matchingProducts,
      matchingMarketplaces,
      matchingShortcuts
    });

    // ── STRUCTURED RESULTS BELOW AI OVERVIEW ──

    // 1. Specific User Orders & Parcels
    if (matchingOrders.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>📦</span> Ваши посылки (${matchingOrders.length})
          </p>
          <div class="space-y-2">
            ${matchingOrders.map(o => `
              <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/30 flex items-center justify-between transition cursor-pointer" onclick="window.spotlightOpenOrder('${o.id}')">
                <div class="flex-1 min-w-0 pr-3">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-bold text-white">#${highlightMatches(o.order_number || o.id?.slice(0, 8), query)}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ${formatOrderStatus(o.status)}
                    </span>
                  </div>
                  ${o.track_number ? `
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] text-white/50 font-mono">Трек: ${highlightMatches(o.track_number, query)}</span>
                      <button type="button" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-400/10 active:scale-95 transition" onclick="event.stopPropagation(); if (navigator.clipboard) navigator.clipboard.writeText('${o.track_number}'); if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light'); if (typeof tgUtil !== 'undefined' && tgUtil.alert) tgUtil.alert('Трек-номер скопирован: ${o.track_number}');">
                        Копировать
                      </button>
                    </div>
                  ` : ''}
                </div>
                <button class="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition flex-shrink-0">
                  Детали
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. Detected URL Preview
    if (detectedUrl) {
      html += `
        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
              <span>${detectedUrl.icon}</span> Ссылка: ${detectedUrl.platformName}
            </span>
            <span class="text-[9px] px-2 py-0.5 rounded bg-white/10 text-white/60">${detectedUrl.platformBadge}</span>
          </div>
          <p class="text-xs text-white/60 font-mono truncate">${detectedUrl.url}</p>
        </div>
      `;
    }

    // 3. Catalog Products
    if (matchingProducts.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>🛍️</span> Товары в каталоге (${matchingProducts.length})
          </p>
          <div class="grid grid-cols-2 gap-2">
            ${matchingProducts.map(p => `
              <div class="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-98 flex flex-col justify-between" onclick="window.spotlightOpenProduct('${p.id}')">
                <div class="aspect-[3/4] w-full rounded-xl bg-black/40 mb-2 overflow-hidden flex items-center justify-center border border-white/5" style="aspect-ratio: 3/4;">
                  ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover">` : `<span class="text-2xl">👟</span>`}
                </div>
                <div>
                  <p class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">${p.brand || 'Товар'}</p>
                  <p class="text-white text-xs font-bold truncate mt-0.5">${highlightMatches(p.title, query)}</p>
                  <p class="text-xs font-black text-white/90 mt-1 inline-flex items-baseline gap-1">${p.price ? p.price + ' ' + (window.bynSign ? window.bynSign() : '') : 'По запросу'}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 4. Marketplaces
    if (matchingMarketplaces.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>🌐</span> Маркетплейсы (${matchingMarketplaces.length})
          </p>
          <div class="space-y-2">
            ${matchingMarketplaces.map(m => `
              <div class="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 flex items-center justify-between cursor-pointer transition active:scale-[0.99]" onclick="window.spotlightOpenMarketplace('${m.name}')">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-white/10 text-xl flex items-center justify-center flex-shrink-0">
                    ${m.icon}
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-white text-sm font-bold">${highlightMatches(m.name, query)}</p>
                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">${m.country}</span>
                    </div>
                    <p class="text-xs text-white/50 truncate mt-0.5">${m.desc}</p>
                  </div>
                </div>
                <span class="text-cyan-400 text-xs font-bold px-2 py-1 rounded-lg bg-cyan-500/10 flex-shrink-0">Открыть →</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 5. Quick Navigation Shortcuts
    if (matchingShortcuts.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>🧭</span> Быстрый переход (${matchingShortcuts.length})
          </p>
          <div class="space-y-2">
            ${matchingShortcuts.map(s => `
              <div class="spotlight-shortcut-item p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 flex items-center gap-3.5 cursor-pointer transition active:scale-[0.99]" data-shortcut-id="${s.id}">
                <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${s.iconSvg}
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-white text-sm font-bold">${highlightMatches(s.title, query)}</p>
                  <p class="text-xs text-white/50 truncate mt-0.5">${s.subtitle}</p>
                </div>
                <span class="text-white/30 text-sm font-bold pr-1">→</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 6. Popular Brands
    if (matchingBrands.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>👟</span> Бренды (${matchingBrands.length})
          </p>
          <div class="grid grid-cols-2 gap-2">
            ${matchingBrands.map(b => `
              <div class="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-98" onclick="window.spotlightOpenBrand('${b.name}')">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-white text-xs font-bold">${highlightMatches(b.name, query)}</p>
                  <span class="text-cyan-400 text-xs">→</span>
                </div>
                <p class="text-[10px] text-white/50 leading-tight">${b.category}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    contentEl.innerHTML = html;

    // Attach All Handlers
    attachSearchResultsHandlers({ query, userCtx, profileMatch, aiIntent, detectedUrl, mathResult });
  }

  // ============================================================
  // ATTACH SEARCH RESULTS HANDLERS
  // ============================================================

  function attachSearchResultsHandlers({ query, userCtx, profileMatch, aiIntent, detectedUrl, mathResult }) {
    if (!contentEl) return;

    // AI Overview Action: Calc from URL
    const calcUrlBtn = contentEl.querySelector('#aiOverviewCalcUrlBtn');
    if (calcUrlBtn && detectedUrl) {
      calcUrlBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('calculator');
        setTimeout(() => {
          const urlInput = document.getElementById('itemUrl') || document.getElementById('productUrl');
          if (urlInput) {
            urlInput.value = detectedUrl.url;
            urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 250);
      };
    }

    // AI Overview Action: Order from URL
    const orderUrlBtn = contentEl.querySelector('#aiOverviewOrderUrlBtn');
    if (orderUrlBtn && detectedUrl) {
      orderUrlBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('neworder');
        setTimeout(() => {
          const orderUrlInput = document.getElementById('orderItemUrl');
          if (orderUrlInput) {
            orderUrlInput.value = detectedUrl.url;
            orderUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 250);
      };
    }

    // AI Overview Action: Apply Complex Calc to Order / Calculator
    const applyCalcBtn = contentEl.querySelector('#aiOverviewApplyCalcBtn');
    if (applyCalcBtn && aiIntent) {
      applyCalcBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('calculator');
        setTimeout(() => {
          const priceInput = document.getElementById('itemPrice');
          const weightInput = document.getElementById('itemWeight');
          if (priceInput) {
            priceInput.value = aiIntent.priceCny;
            priceInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (weightInput) {
            weightInput.value = aiIntent.weightKg;
            weightInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 250);
      };
    }

    // AI Overview Action: Open Calculator
    const openCalcBtn = contentEl.querySelector('#aiOverviewOpenCalcBtn');
    if (openCalcBtn) {
      openCalcBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('calculator');
      };
    }

    // AI Overview Action: Finances
    const financesBtn = contentEl.querySelector('#aiOverviewFinancesBtn');
    if (financesBtn) {
      financesBtn.onclick = () => {
        if (typeof showUserFinances === 'function') showUserFinances();
        else if (typeof switchTab === 'function') switchTab('finances');
      };
    }

    // AI Overview Action: Manage Cards
    const manageCardsBtn = contentEl.querySelector('#aiOverviewManageCardsBtn');
    if (manageCardsBtn) {
      manageCardsBtn.onclick = () => {
        if (userCtx.cards.length > 0) {
          window._financesManageMode = true;
          if (typeof showUserFinances === 'function') showUserFinances();
          else if (typeof switchTab === 'function') switchTab('finances');
        } else {
          if (typeof window.openAddCardModal === 'function') window.openAddCardModal();
        }
      };
    }

    // AI Overview Action: Profile
    const profileBtn = contentEl.querySelector('#aiOverviewProfileBtn');
    if (profileBtn) {
      profileBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('profile');
      };
    }

    // AI Overview Action: Start First Order
    const startOrderBtn = contentEl.querySelector('#aiOverviewStartOrderBtn');
    if (startOrderBtn) {
      startOrderBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('neworder');
      };
    }

    // AI Overview Action: Semantic Action (Step 3 Action Router)
    const semanticBtn = contentEl.querySelector('#aiOverviewSemanticActionBtn');
    if (semanticBtn) {
      semanticBtn.onclick = () => {
        const actionType = semanticBtn.getAttribute('data-action-type');
        if (actionType === 'catalogs') {
          if (typeof switchTab === 'function') switchTab('catalogs');
        } else if (actionType === 'calculator') {
          if (typeof switchTab === 'function') switchTab('calculator');
        } else if (actionType === 'finances') {
          if (typeof showUserFinances === 'function') showUserFinances();
          else if (typeof switchTab === 'function') switchTab('finances');
        } else if (actionType === 'legitcheck') {
          if (typeof showLegitCheckScreen === 'function') showLegitCheckScreen();
          else if (typeof switchTab === 'function') switchTab('profile');
        } else if (actionType === 'support') {
          const tgLink = 'https://t.me/icelogix_support_bot';
          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(tgLink);
          } else {
            window.open(tgLink, '_blank');
          }
        } else if (actionType && actionType.startsWith('brand_')) {
          const brandName = actionType.replace('brand_', '');
          if (typeof window.spotlightOpenBrand === 'function') {
            window.spotlightOpenBrand(brandName);
          } else if (typeof switchTab === 'function') {
            switchTab('catalogs');
          }
        } else if (aiIntent?.action) {
          aiIntent.action();
        }
      };
    }

    // AI Overview Action: Open Catalogs
    const catalogsBtn = contentEl.querySelector('#aiOverviewOpenCatalogsBtn');
    if (catalogsBtn) {
      catalogsBtn.onclick = () => {
        if (typeof switchTab === 'function') switchTab('catalogs');
      };
    }

    // AI Overview Action: Ask Support
    const supportBtns = contentEl.querySelectorAll('#aiOverviewAskSupportBtn');
    supportBtns.forEach(btn => {
      btn.onclick = () => {
        const tgLink = 'https://t.me/icelogix_support_bot';
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(tgLink);
        } else {
          window.open(tgLink, '_blank');
        }
      };
    });

    // Shortcut clicks
    contentEl.querySelectorAll('.spotlight-shortcut-item').forEach(item => {
      const sid = item.getAttribute('data-shortcut-id');
      const shortcutObj = APP_SHORTCUTS.find(s => s.id === sid);
      if (shortcutObj) {
        item.onclick = shortcutObj.action;
      }
    });
  }

  function formatOrderStatus(st) {
    const dict = {
      pending: 'Обработка',
      paid: 'Оплачен',
      bought: 'Выкуплен в Китае',
      on_sklad_cn: 'На складе в Китае',
      in_transit: 'В пути в Беларусь',
      in_belarus: 'В Беларуси',
      delivered: 'Доставлен',
      cancelled: 'Отменен'
    };
    return dict[st] || st || 'В обработке';
  }

  // ============================================================
  // GLOBAL EXPORTS & ROUTING INTEGRATION
  // ============================================================

  window.renderSpotlightPage = renderSpotlightPage;
  window.attachSpotlightPageHandlers = attachSpotlightPageHandlers;

  window.openSpotlightSearch = function (initialQuery = '') {
    window._pendingSpotlightQuery = initialQuery;
    if (typeof switchTab === 'function') {
      switchTab('search');
    }
  };

  window.closeSpotlightSearch = function () {
    if (typeof window.goBackGlobal === 'function') {
      window.goBackGlobal();
    }
  };

  window.spotlightOpenOrder = function (orderId) {
    if (typeof openOrderDetailsModal === 'function') {
      openOrderDetailsModal(orderId);
    } else if (typeof switchTab === 'function') {
      switchTab('profile');
    }
  };

  window.spotlightOpenBrand = function (brandName) {
    if (typeof window.productsFilter !== 'undefined') {
      window.productsFilter.brand = brandName;
    }
    if (typeof switchTab === 'function') {
      switchTab('catalogs');
      setTimeout(() => {
        const prodBtn = document.getElementById('openProductsCatalogBtn');
        if (prodBtn) prodBtn.click();
      }, 100);
    }
  };

  window.spotlightOpenMarketplace = function (name) {
    if (typeof switchTab === 'function') {
      switchTab('catalogs');
      setTimeout(() => {
        const mpBtn = document.getElementById('openMarketplacesBtn');
        if (mpBtn) mpBtn.click();
      }, 100);
    }
  };

  window.spotlightOpenProduct = function (productId) {
    if (typeof showProductModal === 'function') {
      showProductModal(productId);
    } else if (typeof switchTab === 'function') {
      switchTab('catalogs');
    }
  };

})();
