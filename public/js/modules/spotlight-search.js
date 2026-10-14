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

    return {
      userId: curUserId,
      userName,
      balance,
      cards: Array.isArray(cards) ? cards : [],
      deliveryInfo,
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
      summary: 'Принимаем карты банков РБ (Белкарт) и РФ (МИР) через bePaid. 1 ICE = 1 BYN.',
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
      keywords: ['каталог', 'каталоги', 'площадки', 'магазины', 'где купить', '1688', 'zalando', 'poizon'],
      subtitle: 'Poizon, Taobao, Zalando, 1688 и каталог готовых товаров',
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
      <div class="page-enter px-4 pb-28 max-w-md mx-auto space-y-4">
        <!-- Top Navigation Header -->
        <div class="flex items-center gap-3 mb-2 mt-2">
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

        <!-- Dynamic Content Body (Home or Search Results) -->
        <div id="spotlightContent" class="space-y-4"></div>
      </div>
      ${typeof renderFooter === 'function' ? renderFooter() : ''}
    `;
  }

  function attachSpotlightPageHandlers() {
    searchInputEl = document.getElementById('spotlightSearchInput');
    contentEl = document.getElementById('spotlightContent');
    clearBtnEl = document.getElementById('spotlightClearBtn');

    if (!searchInputEl || !contentEl) return;

    clearBtnEl.onclick = () => {
      searchInputEl.value = '';
      searchInputEl.focus();
      clearBtnEl.classList.add('hidden');
      renderSpotlightHome();
    };

    searchInputEl.addEventListener('input', (e) => {
      const q = e.target.value;
      if (q.trim().length > 0) {
        clearBtnEl.classList.remove('hidden');
      } else {
        clearBtnEl.classList.add('hidden');
      }

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
  // ENGINE 2: AI NATURAL LANGUAGE & WEIGHT DETECTOR
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

    // Semantic AI Answers for common user questions
    if (cleanLower.includes('минск') || (cleanLower.includes('беларус') && cleanLower.includes('доставк'))) {
      return {
        type: 'ai_answer',
        title: 'Доставка в Беларусь (Минск и все регионы)',
        badge: '✨ ИИ-Помощник',
        text: 'Все посылки из Китая прибывают на центральный сортировочный хаб в Минске, проходят таможенную очистку и передаются в пункты выдачи Европочты или СДЭК по всей Беларуси. Срок экспресс-авиа: 8–12 дней, авто: 18–25 дней.',
        actionTitle: 'Рассчитать в калькуляторе →',
        action: () => {
          if (typeof switchTab === 'function') switchTab('calculator');
        }
      };
    }

    if (cleanLower.includes('беларусбанк') || cleanLower.includes('приорбанк') || cleanLower.includes('сбер') || cleanLower.includes('мтбанк') || cleanLower.includes('альфа')) {
      return {
        type: 'ai_answer',
        title: 'Оплата картами белорусских банков',
        badge: '✨ ИИ-Финансы',
        text: 'Да, наш сервис официально принимает карты всех 20 банков Беларуси (Белкарт, Visa, Mastercard, МИР) через платежный шлюз bePaid. Данные шифруются по стандарту PCI-DSS, 0% скрытых комиссий.',
        actionTitle: 'Перейти к моим картам →',
        action: () => {
          if (typeof showUserFinances === 'function') showUserFinances();
          else if (typeof switchTab === 'function') switchTab('finances');
        }
      };
    }

    if (cleanLower.includes('размер') && (cleanLower.includes('обув') || cleanLower.includes('стельк') || cleanLower.includes('см'))) {
      return {
        type: 'ai_answer',
        title: 'Как выбрать правильный размер на Poizon',
        badge: '✨ ИИ-Гид по размерам',
        text: 'Всегда ориентируйтесь на длину стельки в сантиметрах (CM/JP) или европейский размер (EUR). В карточке каждой пары на Poizon реальные покупатели голосуют за посадку: "True to size" (в размер) или "Маломерит на 0.5".',
        actionTitle: 'Открыть каталоги Poizon →',
        action: () => {
          if (typeof switchTab === 'function') switchTab('catalogs');
        }
      };
    }

    if (cleanLower.includes('пошлин') || cleanLower.includes('200') || cleanLower.includes('лимит')) {
      return {
        type: 'ai_answer',
        title: 'Беспошлинный лимит 200€ и 31 кг',
        badge: '✨ ИИ-Таможня',
        text: 'В Беларуси и РФ беспошлинный порог для одной посылки составляет 200 евро и 31 кг. Если стоимость превышает 200€, таможня начисляет 15% только на сумму превышения (например, при заказе на 250€ пошлина составит всего 7.5€).',
        actionTitle: 'Инструкция по выкупу →',
        action: () => {
          if (typeof switchTab === 'function') switchTab('calculator');
        }
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
      { name: 'Poizon', country: 'Китай', desc: 'Кроссовки, одежда, электроника и легитчек', url: 'https://poizon.com', badge: '100% Оригинал', icon: '👟' },
      { name: 'Taobao', country: 'Китай', desc: 'Крупнейший гипермаркет Китая', url: 'https://taobao.com', badge: 'Низкие цены', icon: '🛍️' },
      { name: '1688', country: 'Китай', desc: 'Оптовая платформа Alibaba Group', url: 'https://1688.com', badge: 'Опт / Фабрики', icon: '📦' },
      { name: 'Zalando', country: 'Германия', desc: 'Европейский маркетплейс брендовой одежды', url: 'https://zalando.de', badge: 'Европа', icon: '🇪🇺' },
      { name: 'ASOS', country: 'Великобритания', desc: 'Британский интернет-магазин одежды', url: 'https://asos.com', badge: 'UK Сток', icon: '🇬🇧' },
      { name: 'Nike', country: 'США / ЕС', desc: 'Официальный магазин спортивного бренда', url: 'https://nike.com', badge: 'Официальный', icon: '✔️' },
      { name: 'GOAT', country: 'США', desc: 'Аутентичный сникер-маркетплейс', url: 'https://goat.com', badge: 'Редкие релизы', icon: '🐐' },
      { name: 'StockX', country: 'США', desc: 'Биржа кроссовок и стритвира', url: 'https://stockx.com', badge: 'Биржа', icon: '📈' },
      { name: 'Weidian', country: 'Китай', desc: 'Магазины независимых китайских дизайнеров', url: 'https://weidian.com', badge: 'Вейдиан', icon: '🏷️' }
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
        `💰 <span class="font-bold text-white">Итоговая стоимость с доставкой:</span> <span class="text-cyan-300 font-extrabold text-sm">≈ ${aiIntent.totalRub.toLocaleString('ru-RU')} ₽</span> или <span class="text-white font-bold">≈ ${aiIntent.totalByn} BYN</span>.`,
        `🇨🇳 <span class="font-bold text-white">Выкуп товара в Китае:</span> ${aiIntent.buyCostByn} BYN (по курсу ЦБ с официальной комиссией сервиса 20%).`,
        `✈️ <span class="font-bold text-white">Экспресс-авиадоставка:</span> ${aiIntent.shippingCostByn} BYN (тариф $10 за 1 кг). Оплачивается вторым этапом по точному весу.`,
        `⚖️ <span class="font-bold text-white">Таможня:</span> Пошлина 0 BYN (стоимость не превышает беспошлинный лимит 200€ на посылку).`
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
          `💵 <span class="font-bold text-white">Примерная стоимость под ключ:</span> <span class="text-cyan-300 font-black text-sm">≈ ${mathResult.totalEstRub.toLocaleString('ru-RU')} ₽</span> или <span class="text-white font-bold">≈ ${mathResult.totalEstByn} BYN</span> (${mathResult.cnyAmount} ¥).`,
          `📦 <span class="font-bold text-white">Выкуп без доставки:</span> ${mathResult.subtotalByn} BYN (курс ${mathResult.cnyRateByn} BYN/CNY).`
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
          `💵 <span class="font-bold text-white">${mathResult.amount} ${mathResult.currency}</span> = <span class="text-cyan-300 font-bold">≈ ${mathResult.bynEquivalent} BYN</span> (или ≈ ${mathResult.rubEquivalent.toLocaleString('ru-RU')} ₽).`
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
        bodyHtml = `Здравствуйте, ${userCtx.userName}! На вашем персональном балансе сейчас <span class="text-cyan-300 font-black text-sm">${userCtx.balance || 0} ICE</span> (эквивалент ${userCtx.balance || 0} BYN).`;
        bullets = [
          `💡 <span class="font-bold text-white">Номинал:</span> 1 ICE = 1 BYN. Баллы можно использовать для оплаты выкупа товаров на Poizon и доставки без банковских комиссий.`,
          `⚡ <span class="font-bold text-white">Пополнение:</span> Моментальное зачисление картами любых банков Беларуси через платежный шлюз bePaid (0% комиссии).`
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
      bodyHtml = `<span class="font-bold text-white text-[13px] block mb-1">${aiIntent.title}</span>${aiIntent.text}`;
      bullets = [
        `💡 <span class="font-bold text-white">Официальные условия:</span> ICE LOGIX работает по договору публичной оферты и является официальным зарегистрированным сервисом в Республике Беларусь.`,
        `🤝 <span class="font-bold text-white">Гарантия качества:</span> Полная ответственность за сохранность груза и 100% оригинальность подтверждается двойной экспертизой.`
      ];
      if (aiIntent.actionTitle) {
        actions = [
          `<button id="aiOverviewSemanticActionBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
            ${aiIntent.actionTitle}
          </button>`
        ];
      }
      sources = [`💡 База знаний ICE LOGIX`, `🛡️ Юридическая оферта`];
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
        `🔗 <span class="font-bold text-white">Поиск по ссылке:</span> Скопируйте ссылку на интересующую вещь прямо в приложении Poizon (Dewu), Taobao или 1688 и вставьте в строку поиска.`,
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
                <div class="aspect-square w-full rounded-xl bg-black/40 mb-2 overflow-hidden flex items-center justify-center border border-white/5">
                  ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover">` : `<span class="text-2xl">👟</span>`}
                </div>
                <div>
                  <p class="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">${p.brand || 'Товар'}</p>
                  <p class="text-white text-xs font-bold truncate mt-0.5">${highlightMatches(p.title, query)}</p>
                  <p class="text-xs font-black text-white/90 mt-1">${p.price ? p.price + ' BYN' : 'По запросу'}</p>
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

    // AI Overview Action: Semantic Action
    const semanticBtn = contentEl.querySelector('#aiOverviewSemanticActionBtn');
    if (semanticBtn && aiIntent?.action) {
      semanticBtn.onclick = aiIntent.action;
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
