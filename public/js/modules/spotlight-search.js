// ============================================================
// ICE LOGIX Module: Universal Spotlight Search (AI & Profile v3)
// Personalized AI-Powered Search: User Profile Data, 
// Natural Language AI Engine, Link Detector, and Live Tracking.
// ============================================================

(function () {
  'use strict';

  let spotlightModalEl = null;
  let searchInputEl = null;
  let contentEl = null;
  let clearBtnEl = null;
  let placeholderTimer = null;
  let currentPlaceholderIndex = 0;
  let debounceTimeout = null;
  let isSearchActive = false;
  let searchRequestId = 0;

  // Touch swipe to dismiss variables
  let touchStartY = 0;
  let touchMoveY = 0;

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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
        closeSpotlightSearch();
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
  // DOM CREATION & LIFECYCLE
  // ============================================================

  function buildSpotlightDom() {
    if (document.getElementById('spotlightModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'spotlightModal';
    overlay.className = 'fixed inset-0 z-[120] flex flex-col bg-black/90 backdrop-blur-2xl opacity-0 pointer-events-none transition-all duration-200';
    overlay.style.webkitBackdropFilter = 'blur(25px)';

    overlay.innerHTML = `
      <!-- Top Search Bar Container -->
      <div id="spotlightHeader" class="p-3 border-b border-white/10 bg-[#0d121a]/95 flex flex-col gap-2 shadow-lg flex-shrink-0 select-none" style="padding-top: max(12px, env(safe-area-inset-top));">
        
        <!-- Pull to dismiss indicator (Mobile) -->
        <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1"></div>

        <div class="flex items-center gap-2.5">
          <div class="relative flex-1 flex items-center">
            <span class="absolute left-3.5 text-cyan-400 pointer-events-none flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input type="text" id="spotlightSearchInput"
              class="w-full bg-white/5 border border-white/15 focus:border-cyan-400 focus:bg-white/10 rounded-2xl py-2.5 pl-11 pr-9 text-white placeholder-white/40 text-sm font-semibold outline-none transition-all shadow-inner"
              placeholder="Спроси ИИ или введи запрос... 🤖"
              enterkeyhint="search"
              autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
            <button id="spotlightClearBtn" class="absolute right-3 text-white/40 hover:text-white p-1 transition hidden" title="Очистить">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <button id="spotlightCloseBtn" class="text-white/70 hover:text-white text-sm font-bold px-2 py-2 transition active:scale-95 flex-shrink-0">
            Отмена
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content Container -->
      <div id="spotlightContent" class="flex-1 overflow-y-auto p-4 space-y-5 pb-28">
        <!-- Injected dynamically -->
      </div>
    `;

    document.body.appendChild(overlay);

    spotlightModalEl = overlay;
    searchInputEl = overlay.querySelector('#spotlightSearchInput');
    contentEl = overlay.querySelector('#spotlightContent');
    clearBtnEl = overlay.querySelector('#spotlightClearBtn');

    // Setup Event Listeners
    overlay.querySelector('#spotlightCloseBtn').onclick = closeSpotlightSearch;
    
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

    // Enter key handling (blur mobile keyboard, save history)
    searchInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInputEl.value.trim();
        if (q) {
          saveQueryToHistory(q);
          searchInputEl.blur();
        }
      } else if (e.key === 'Escape') {
        closeSpotlightSearch();
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

    // Mobile Swipe Down to Dismiss Header
    const headerEl = overlay.querySelector('#spotlightHeader');
    headerEl.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchMoveY = touchStartY;
    }, { passive: true });

    headerEl.addEventListener('touchmove', (e) => {
      touchMoveY = e.touches[0].clientY;
    }, { passive: true });

    headerEl.addEventListener('touchend', () => {
      if (touchMoveY - touchStartY > 65) {
        closeSpotlightSearch();
      }
    });
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
  // EMPTY STATE / PERSONALIZED HOME SCREEN
  // ============================================================

  function renderSpotlightHome() {
    if (!contentEl) return;

    const userCtx = getUserContext();
    const history = getSearchHistory();

    contentEl.innerHTML = `
      <div class="space-y-5 animate-fadeIn">
        
        <!-- Personalized Welcome Pill -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/20 border border-cyan-500/25 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-lg flex-shrink-0">
              ✨
            </div>
            <div>
              <p class="text-white text-xs font-bold leading-tight">
                ${userCtx.isRegistered ? `Привет, ${userCtx.userName}! 👋` : 'Привет! Умный поиск ICE LOGIX'}
              </p>
              <p class="text-[11px] text-cyan-300/80 mt-0.5">
                ${userCtx.isRegistered ? `Баланс: <span class="font-bold text-white">${userCtx.balance || 0} ICE</span> • Привязано карт: <span class="font-bold text-white">${userCtx.cards.length}</span>` : 'ИИ готов рассчитать доставку и найти товар'}
              </p>
            </div>
          </div>
          <span class="text-[10px] px-2 py-1 rounded-lg bg-cyan-400/15 text-cyan-300 font-bold border border-cyan-400/30">AI Active</span>
        </div>

        <!-- Recent Searches Block (Personal for this User) -->
        ${history.length > 0 ? `
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white/40">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Вы недавно искали
              </span>
              <button id="spotlightClearHistoryBtn" class="text-[11px] text-cyan-400/80 hover:text-cyan-300 transition">
                Очистить
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              ${history.map(item => `
                <button class="spotlight-chip px-3 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-500/25 text-cyan-200 hover:text-white text-xs font-medium transition active:scale-95 flex items-center gap-1.5" data-search-trigger="${item}">
                  <span class="text-[10px] text-cyan-400/60">🕒</span>
                  <span>${item}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4 Quick Action Cards (2x2 Grid) -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="spotlight-quick-card p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-[0.98]" data-search-trigger="где моя посылка">
            <div class="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <p class="text-white text-xs font-bold leading-tight">Мои посылки</p>
            <p class="text-[11px] text-white/50 mt-0.5 leading-snug">Статусы и трек-номера</p>
          </div>

          <div class="spotlight-quick-card p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-[0.98]" data-search-trigger="пуховик 700¥ 2 кг">
            <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 font-black text-sm">
              ✨
            </div>
            <p class="text-white text-xs font-bold leading-tight">ИИ Расчет веса</p>
            <p class="text-[11px] text-white/50 mt-0.5 leading-snug">"Пуховик 700¥ 2 кг"</p>
          </div>

          <div class="spotlight-quick-card p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-[0.98]" data-search-trigger="мои карты">
            <div class="w-8 h-8 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <p class="text-white text-xs font-bold leading-tight">Мои финансы</p>
            <p class="text-[11px] text-white/50 mt-0.5 leading-snug">Карты, баланс, купоны</p>
          </div>

          <div class="spotlight-quick-card p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 cursor-pointer transition active:scale-[0.98]" data-search-trigger="когда приедет посылка в Минск">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p class="text-white text-xs font-bold leading-tight">Вопрос к ИИ</p>
            <p class="text-[11px] text-white/50 mt-0.5 leading-snug">Сроки, таможня, пошлины</p>
          </div>
        </div>

        <!-- AI Prompt Suggestions (Natural Language Chips) -->
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>🤖</span> ИИ-вопросы на обычном языке
          </p>
          <div class="flex flex-wrap gap-2">
            ${[
              { label: '📦 Где моя посылка?', q: 'где моя посылка' },
              { label: '💳 Мои привязанные карты', q: 'мои карты' },
              { label: '💰 Мой баланс ICE', q: 'мой баланс' },
              { label: '🧥 Куртка 650¥ вес 1.5 кг', q: 'куртка 650¥ 1.5 кг' },
              { label: '🇧🇾 Оплата картой Беларусбанка', q: 'оплата картой Беларусбанка' },
              { label: '⏱️ Сроки доставки в Минск', q: 'сроки доставки в Минск' },
              { label: '⚖️ Как не платить пошлину 200€?', q: 'таможня 200 евро' },
              { label: '👟 Кроссовки Nike 450¥', q: 'кроссовки Nike 450¥' },
              { label: '🛡️ Что если посылку потеряют?', q: 'страховка груза' },
              { label: '📏 Как подобрать размер обуви?', q: 'как подобрать размер' }
            ].map(tag => `
              <button class="spotlight-chip px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition active:scale-95" data-search-trigger="${tag.q}">
                ${tag.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Popular Brands Showcase -->
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide">Популярные бренды</p>
          <div class="grid grid-cols-2 gap-2">
            ${POPULAR_BRANDS.slice(0, 4).map(b => `
              <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/30 flex items-center justify-between cursor-pointer transition active:scale-98" data-search-trigger="${b.name}">
                <div>
                  <p class="text-white text-xs font-bold">${b.name}</p>
                  <p class="text-[10px] text-white/40">${b.category}</p>
                </div>
                <span class="text-white/30 text-xs">→</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

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
    // 1. Balance Intent
    if (cleanLower.includes('баланс') || cleanLower.includes('мой счет') || cleanLower.includes('кошелек') || cleanLower === 'ice') {
      return {
        type: 'balance',
        title: 'Мой ICE Баланс',
        balance: userCtx.balance || 0,
        userName: userCtx.userName
      };
    }

    // 2. Saved Cards Intent
    if (cleanLower.includes('карт') || cleanLower.includes('пластик') || cleanLower.includes('bepaid') || cleanLower.includes('привяз')) {
      return {
        type: 'cards',
        title: 'Мои банковские карты',
        cards: userCtx.cards,
        count: userCtx.cards.length
      };
    }

    // 3. Delivery Address Intent
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
    // A. Complex calculation with Price AND Weight (e.g., "пуховик 800¥ 2 кг", "куртка 600 юаней 1.5 кг")
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

        // Detect category name
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

    // B. Semantic AI Answers for common user questions
    // Question: Delivery to Belarus / Minsk
    if (cleanLower.includes('минск') || (cleanLower.includes('беларус') && cleanLower.includes('доставк'))) {
      return {
        type: 'ai_answer',
        title: 'Доставка в Беларусь (Минск и все регионы)',
        badge: '✨ ИИ-Помощник',
        text: 'Все посылки из Китая прибывают на центральный сортировочный хаб в Минске, проходят таможенную очистку и передаются в пункты выдачи Европочты или СДЭК по всей Беларуси. Срок экспресс-авиа: 8–12 дней, авто: 18–25 дней.',
        actionTitle: 'Рассчитать в калькуляторе →',
        action: () => {
          closeSpotlightSearch();
          if (typeof switchTab === 'function') switchTab('calculator');
        }
      };
    }

    // Question: Belarusian banks payment
    if (cleanLower.includes('беларусбанк') || cleanLower.includes('приорбанк') || cleanLower.includes('сбер') || cleanLower.includes('мтбанк') || cleanLower.includes('альфа')) {
      return {
        type: 'ai_answer',
        title: 'Оплата картами белорусских банков',
        badge: '✨ ИИ-Финансы',
        text: 'Да, наш сервис официально принимает карты всех 20 банков Беларуси (Белкарт, Visa, Mastercard, МИР) через платежный шлюз bePaid. Данные шифруются по стандарту PCI-DSS, 0% скрытых комиссий.',
        actionTitle: 'Перейти к моим картам →',
        action: () => {
          closeSpotlightSearch();
          if (typeof showUserFinances === 'function') showUserFinances();
          else if (typeof switchTab === 'function') switchTab('finances');
        }
      };
    }

    // Question: Shoe sizes guidance
    if (cleanLower.includes('размер') && (cleanLower.includes('обув') || cleanLower.includes('стельк') || cleanLower.includes('см'))) {
      return {
        type: 'ai_answer',
        title: 'Как выбрать правильный размер на Poizon',
        badge: '✨ ИИ-Гид по размерам',
        text: 'Всегда ориентируйтесь на длину стельки в сантиметрах (CM/JP) или европейский размер (EUR). В карточке каждой пары на Poizon реальные покупатели голосуют за посадку: "True to size" (в размер) или "Маломерит на 0.5".',
        actionTitle: 'Открыть каталоги Poizon →',
        action: () => {
          closeSpotlightSearch();
          if (typeof switchTab === 'function') switchTab('catalogs');
        }
      };
    }

    // Question: Customs 200 EUR limit
    if (cleanLower.includes('пошлин') || cleanLower.includes('200') || cleanLower.includes('лимит')) {
      return {
        type: 'ai_answer',
        title: 'Беспошлинный лимит 200€ и 31 кг',
        badge: '✨ ИИ-Таможня',
        text: 'В Беларуси и РФ беспошлинный порог для одной посылки составляет 200 евро и 31 кг. Если стоимость превышает 200€, таможня начисляет 15% только на сумму превышения (например, при заказе на 250€ пошлина составит всего 7.5€).',
        actionTitle: 'Инструкция по выкупу →',
        action: () => {
          closeSpotlightSearch();
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

    // 1. Check for arithmetic formula like "400+120", "500*2", "1200/3", "450-50"
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

    // 2. Check for Currency patterns
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

    // Privacy & Security: Only query orders of the current user
    if (!userCtx.userId) return [];

    let orders = [];
    try {
      // 1. Try user's personal cached orders
      const cached = localStorage.getItem('ice_cached_orders_' + userCtx.userId);
      if (cached) {
        orders = JSON.parse(cached) || [];
      }

      // Filter locally first
      let matched = orders.filter(o => {
        const idStr = String(o.id || '');
        const numStr = String(o.order_number || '');
        const trackStr = String(o.track_number || o.tracking_number || '').toLowerCase();
        const titleStr = String(o.title || o.product_name || '').toLowerCase();
        const qLower = clean.toLowerCase();

        // Also match keywords like "заказ", "где посылка", "трек"
        const isIntent = qLower.includes('заказ') || qLower.includes('посылк') || qLower.includes('трек') || qLower.includes('где');

        return isIntent ||
               idStr.includes(clean) ||
               numStr.includes(clean) ||
               trackStr.includes(qLower) ||
               titleStr.includes(qLower);
      });

      // 2. Query Supabase strictly filtered by user_id
      if (matched.length === 0 && window.supabaseClient && clean.length >= 3) {
        const { data } = await window.supabaseClient
          .from('orders')
          .select('id, order_number, track_number, tracking_number, status, title, price_byn, created_at')
          .eq('user_id', userCtx.userId) // STRICT USER ISOLATION
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
  // RENDER SEARCH RESULTS
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

    const hasAnyResults = !!(
      profileMatch ||
      aiIntent ||
      detectedUrl ||
      mathResult || 
      matchingShortcuts.length || 
      matchingFaq.length || 
      matchingBrands.length || 
      matchingMarketplaces.length ||
      matchingOrders.length || 
      matchingProducts.length
    );

    if (!hasAnyResults) {
      contentEl.innerHTML = `
        <div class="text-center py-12 px-4 space-y-4 animate-fadeIn">
          <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-white/30 text-2xl">
            🔍
          </div>
          <div>
            <p class="text-white font-bold text-base">Ничего не найдено</p>
            <p class="text-white/50 text-xs mt-1">По запросу «${query}» нет точных совпадений</p>
          </div>
          <div class="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
            <button id="spotlightAskManagerBtn" class="btn-primary py-2.5 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Спросить у службы заботы
            </button>
            <button id="spotlightBackHomeBtn" class="py-2.5 px-4 text-xs font-semibold text-white/60 hover:text-white rounded-xl transition">
              Вернуться к подсказкам
            </button>
          </div>
        </div>
      `;

      contentEl.querySelector('#spotlightAskManagerBtn').onclick = () => {
        closeSpotlightSearch();
        const tgLink = 'https://t.me/icelogix_support_bot';
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(tgLink);
        } else {
          window.open(tgLink, '_blank');
        }
      };

      contentEl.querySelector('#spotlightBackHomeBtn').onclick = () => {
        if (searchInputEl) searchInputEl.value = '';
        renderSpotlightHome();
      };
      return;
    }

    let html = `<div class="space-y-5 animate-fadeIn">`;

    // ── 1. PERSONAL PROFILE MATCH (BALANCE, CARDS, ADDRESS) ──
    if (profileMatch) {
      if (profileMatch.type === 'balance') {
        html += `
          <div class="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-blue-950/50 to-slate-900 border border-cyan-400/30 shadow-xl space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>💰</span> ${profileMatch.title}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold">Личный счет</span>
            </div>
            <div class="flex items-baseline justify-between py-1">
              <div>
                <p class="text-3xl font-black text-white tracking-tight">${profileMatch.balance} <span class="text-cyan-400 text-xl font-bold">ICE</span></p>
                <p class="text-xs text-white/50 mt-0.5">Эквивалент: ${profileMatch.balance} BYN (1 ICE = 1 BYN)</p>
              </div>
              <button id="spotlightTopUpBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
                В Финансы →
              </button>
            </div>
            <p class="text-[10px] text-white/40 border-t border-white/10 pt-2">
              Баллами можно оплачивать выкуп товаров с Poizon и доставку по СНГ без комиссии.
            </p>
          </div>
        `;
      } else if (profileMatch.type === 'cards') {
        html += `
          <div class="p-4 rounded-2xl bg-gradient-to-br from-violet-950/60 to-slate-900 border border-violet-500/30 shadow-xl space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                <span>💳</span> ${profileMatch.title} (${profileMatch.count})
              </span>
              <button id="spotlightManageCardsBtn" class="text-[11px] text-cyan-400 font-bold hover:underline">
                Управление →
              </button>
            </div>
            ${profileMatch.cards.length > 0 ? `
              <div class="space-y-2">
                ${profileMatch.cards.map(c => `
                  <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                        ${c.brand === 'belkart' ? 'БЕЛ' : c.brand === 'mir' ? 'МИР' : 'CARD'}
                      </div>
                      <p class="text-xs text-white font-mono font-bold">•••• ${c.last4 || '****'}</p>
                    </div>
                    <span class="text-[10px] ${c.is_default ? 'text-cyan-400 font-bold' : 'text-white/40'}">
                      ${c.is_default ? '★ Основная' : 'Сохраненная'}
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-center space-y-2">
                <p class="text-xs text-white/60">У вас пока нет привязанных карт bePaid</p>
                <button id="spotlightAddCardBtn" class="btn-primary py-2 px-3 text-xs font-bold rounded-xl">
                  + Привязать карту
                </button>
              </div>
            `}
          </div>
        `;
      }
    }

    // ── 2. AI NATURAL LANGUAGE INTENT (COMPLEX CALCULATION OR SMART ANSWER) ──
    if (aiIntent) {
      if (aiIntent.type === 'complex_calc') {
        html += `
          <div class="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-blue-950/50 to-indigo-950/40 border border-cyan-400/40 shadow-xl space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>🤖</span> ${aiIntent.badge}
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
                ${aiIntent.itemName}
              </span>
            </div>
            
            <div class="flex items-baseline justify-between py-1">
              <div>
                <p class="text-2xl font-black text-white tracking-tight">≈ ${aiIntent.totalRub.toLocaleString('ru-RU')} ₽</p>
                <p class="text-xs text-cyan-300 font-semibold mt-0.5">или ≈ ${aiIntent.totalByn} BYN с доставкой</p>
              </div>
              <button id="spotlightAiApplyBtn" class="px-3.5 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
                В заказ →
              </button>
            </div>

            <div class="p-2.5 rounded-xl bg-black/30 border border-white/5 text-[11px] text-white/70 space-y-1">
              <div class="flex justify-between">
                <span>Товар (${aiIntent.priceCny}¥ + 20% выкуп):</span>
                <span class="text-white font-semibold">${aiIntent.buyCostByn} BYN</span>
              </div>
              <div class="flex justify-between">
                <span>Авиадоставка (${aiIntent.weightKg} кг × $10):</span>
                <span class="text-white font-semibold">${aiIntent.shippingCostByn} BYN</span>
              </div>
            </div>
          </div>
        `;
      } else if (aiIntent.type === 'ai_answer') {
        html += `
          <div class="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-cyan-950/40 border border-cyan-500/30 shadow-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>✨</span> ${aiIntent.badge}
              </span>
              <span class="text-[10px] text-white/40">Прямой ответ</span>
            </div>
            <h4 class="text-sm font-bold text-white">${aiIntent.title}</h4>
            <p class="text-xs text-white/80 leading-relaxed">${aiIntent.text}</p>
            ${aiIntent.actionTitle ? `
              <div class="pt-1">
                <button id="spotlightAiActionBtn" class="btn-primary py-2 px-3 text-xs font-bold rounded-xl">
                  ${aiIntent.actionTitle}
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }
    }

    // ── 3. DETECTED URL CARD ──
    if (detectedUrl) {
      html += `
        <div class="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 to-blue-950/50 border border-cyan-400/40 shadow-xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <span>${detectedUrl.icon}</span> Ссылка на товар распознана
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
              ${detectedUrl.platformBadge}
            </span>
          </div>
          <div>
            <p class="text-white text-sm font-bold">${detectedUrl.platformName}</p>
            <p class="text-white/60 text-xs truncate font-mono mt-0.5">${detectedUrl.url}</p>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
            <button id="spotlightUrlCalcBtn" class="py-2.5 px-3 rounded-xl bg-cyan-400 text-black text-xs font-black hover:bg-cyan-300 transition active:scale-95 text-center">
              Рассчитать в калькуляторе →
            </button>
            <button id="spotlightUrlOrderBtn" class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95 text-center">
              Оформить выкуп
            </button>
          </div>
        </div>
      `;
    }

    // ── 4. MATH / CURRENCY WIDGET ──
    if (mathResult && !aiIntent) {
      if (mathResult.type === 'cny') {
        html += `
          <div class="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 shadow-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>🇨🇳</span> Экспресс-расчет стоимости
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold">Курс онлайн</span>
            </div>
            <div class="flex items-baseline justify-between py-1">
              <div>
                <p class="text-2xl font-black text-white tracking-tight">≈ ${mathResult.totalEstRub.toLocaleString('ru-RU')} ₽</p>
                <p class="text-xs text-cyan-300 font-semibold mt-0.5">или ≈ ${mathResult.totalEstByn} BYN (${mathResult.cnyAmount} ¥)</p>
              </div>
              <button id="spotlightOpenCalcBtn" class="px-3 py-2 rounded-xl bg-cyan-400 text-black font-black text-xs hover:bg-cyan-300 transition active:scale-95 shadow-md">
                В калькулятор →
              </button>
            </div>
            <p class="text-[10px] text-white/50 mt-2 border-t border-white/10 pt-2 leading-relaxed">
              Включает выкуп товара (${mathResult.cnyAmount}¥), комиссию сервиса 20% и среднюю доставку в СНГ.
            </p>
          </div>
        `;
      } else if (mathResult.type === 'currency') {
        html += `
          <div class="p-4 rounded-2xl bg-white/5 border border-white/15 shadow-lg space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Конвертер валют</span>
              <span class="text-[10px] text-white/40">Официальный курс</span>
            </div>
            <div class="flex items-baseline justify-between">
              <div>
                <p class="text-xl font-black text-white">${mathResult.amount} ${mathResult.currency} = ≈ ${mathResult.bynEquivalent} BYN</p>
                <p class="text-xs text-white/50 mt-0.5">или ≈ ${mathResult.rubEquivalent.toLocaleString('ru-RU')} ₽ (RUB)</p>
              </div>
            </div>
          </div>
        `;
      } else if (mathResult.type === 'math') {
        html += `
          <div class="p-3.5 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-between">
            <div>
              <p class="text-[10px] text-white/40 uppercase font-bold tracking-wide">Быстрый счет</p>
              <p class="text-base text-white/70 font-mono">${mathResult.expression} =</p>
            </div>
            <p class="text-2xl font-black text-cyan-400 font-mono">${mathResult.result}</p>
          </div>
        `;
      }
    }

    // ── 5. USER'S ISOLATED ORDERS & TRACKING ──
    if (matchingOrders.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>📦</span> Ваши заказы и посылки (${matchingOrders.length})
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
                  <p class="text-xs text-white/70 truncate">${highlightMatches(o.title || 'Товар с Poizon', query)}</p>
                  ${o.track_number ? `<p class="text-[10px] text-white/40 mt-0.5 font-mono">Трек: ${highlightMatches(o.track_number, query)}</p>` : ''}
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

    // ── 6. CATALOG PRODUCTS ──
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

    // ── 7. MARKETPLACES ──
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

    // ── 8. QUICK ACTIONS & APP SHORTCUTS ──
    if (matchingShortcuts.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>🧭</span> Быстрый переход (${matchingShortcuts.length})
          </p>
          <div class="space-y-2">
            ${matchingShortcuts.map(s => `
              <div class="spotlight-shortcut-item p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/40 flex items-center gap-3.5 cursor-pointer transition active:scale-[0.99]" data-shortcut-id="${s.id}">
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

    // ── 9. FAQ / KNOWLEDGE BASE ──
    if (matchingFaq.length > 0) {
      html += `
        <div class="space-y-2">
          <p class="text-xs font-bold text-white/60 uppercase tracking-wide flex items-center gap-1.5">
            <span>💡</span> База знаний (${matchingFaq.length})
          </p>
          <div class="space-y-2.5">
            ${matchingFaq.map(f => `
              <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-bold text-white flex items-center gap-2">
                    ${highlightMatches(f.title, query)}
                  </h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                    ${f.badge}
                  </span>
                </div>
                <p class="text-xs text-cyan-300 font-semibold leading-relaxed">
                  ${f.summary}
                </p>
                <p class="text-xs text-white/60 leading-relaxed border-t border-white/5 pt-1.5">
                  ${f.details}
                </p>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // ── 10. BRANDS ──
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

    // Attach Profile Actions
    const topUpBtn = contentEl.querySelector('#spotlightTopUpBtn');
    if (topUpBtn) {
      topUpBtn.onclick = () => {
        closeSpotlightSearch();
        if (typeof showUserFinances === 'function') showUserFinances();
        else if (typeof switchTab === 'function') switchTab('finances');
      };
    }

    const manageCardsBtn = contentEl.querySelector('#spotlightManageCardsBtn');
    if (manageCardsBtn) {
      manageCardsBtn.onclick = () => {
        closeSpotlightSearch();
        if (typeof showUserFinances === 'function') {
          window._financesManageMode = true;
          showUserFinances();
        } else if (typeof switchTab === 'function') {
          switchTab('finances');
        }
      };
    }

    const addCardBtn = contentEl.querySelector('#spotlightAddCardBtn');
    if (addCardBtn) {
      addCardBtn.onclick = () => {
        closeSpotlightSearch();
        if (typeof window.openAddCardModal === 'function') {
          window.openAddCardModal();
        }
      };
    }

    // Attach AI Actions
    if (aiIntent) {
      if (aiIntent.type === 'complex_calc') {
        const applyBtn = contentEl.querySelector('#spotlightAiApplyBtn');
        if (applyBtn) {
          applyBtn.onclick = () => {
            closeSpotlightSearch();
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
      } else if (aiIntent.type === 'ai_answer' && aiIntent.action) {
        const aiActionBtn = contentEl.querySelector('#spotlightAiActionBtn');
        if (aiActionBtn) {
          aiActionBtn.onclick = aiIntent.action;
        }
      }
    }

    // Attach actions for URL card
    if (detectedUrl) {
      const urlCalcBtn = contentEl.querySelector('#spotlightUrlCalcBtn');
      if (urlCalcBtn) {
        urlCalcBtn.onclick = () => {
          closeSpotlightSearch();
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

      const urlOrderBtn = contentEl.querySelector('#spotlightUrlOrderBtn');
      if (urlOrderBtn) {
        urlOrderBtn.onclick = () => {
          closeSpotlightSearch();
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
    }

    // Attach shortcut clicks
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
  // GLOBAL EXPORTS
  // ============================================================

  window.openSpotlightSearch = function (initialQuery = '') {
    buildSpotlightDom();
    if (!spotlightModalEl) return;

    if (typeof tgUtil !== 'undefined' && tgUtil.haptic) {
      tgUtil.haptic('light');
    }

    isSearchActive = true;
    spotlightModalEl.classList.remove('opacity-0', 'pointer-events-none');
    spotlightModalEl.classList.add('opacity-100');
    document.body.style.overflow = 'hidden';

    // Hook Telegram native back button
    if (typeof tgUtil !== 'undefined' && tgUtil.setBackButton) {
      tgUtil.setBackButton(() => {
        closeSpotlightSearch();
      });
    }

    if (initialQuery) {
      searchInputEl.value = initialQuery;
      clearBtnEl?.classList.remove('hidden');
      handleSearchQuery(initialQuery);
    } else {
      searchInputEl.value = '';
      clearBtnEl?.classList.add('hidden');
      renderSpotlightHome();
      startPlaceholderAnimation();
    }

    setTimeout(() => {
      searchInputEl?.focus();
    }, 120);
  };

  window.closeSpotlightSearch = function () {
    if (!spotlightModalEl || !isSearchActive) return;

    isSearchActive = false;
    stopPlaceholderAnimation();
    spotlightModalEl.classList.remove('opacity-100');
    spotlightModalEl.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';

    if (searchInputEl) searchInputEl.blur();

    // Restore telegram back button
    if (typeof syncTelegramBackButton === 'function') {
      syncTelegramBackButton();
    } else if (typeof tgUtil !== 'undefined' && tgUtil.setBackButton) {
      tgUtil.setBackButton(null);
    }
  };

  window.spotlightOpenOrder = function (orderId) {
    closeSpotlightSearch();
    if (typeof openOrderDetailsModal === 'function') {
      openOrderDetailsModal(orderId);
    } else if (typeof switchTab === 'function') {
      switchTab('profile');
    }
  };

  window.spotlightOpenBrand = function (brandName) {
    closeSpotlightSearch();
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
    closeSpotlightSearch();
    if (typeof switchTab === 'function') {
      switchTab('catalogs');
      setTimeout(() => {
        const mpBtn = document.getElementById('openMarketplacesBtn');
        if (mpBtn) mpBtn.click();
      }, 100);
    }
  };

  window.spotlightOpenProduct = function (productId) {
    closeSpotlightSearch();
    if (typeof showProductModal === 'function') {
      showProductModal(productId);
    } else if (typeof switchTab === 'function') {
      switchTab('catalogs');
    }
  };

  // Global back hook integration
  const prevGoBack = window.goBackGlobal;
  window.goBackGlobal = function () {
    if (isSearchActive) {
      closeSpotlightSearch();
      return true;
    }
    if (typeof prevGoBack === 'function') {
      return prevGoBack();
    }
    return false;
  };

})();
