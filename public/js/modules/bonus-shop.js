// ==============================================================================
// ICE LOGIX: Модуль Магазина Бонусов (ICE Rewards Shop)
// Витрина наград, покупка за баллы ICE, оформление заявок и история обменов
// ==============================================================================

(function() {
  let currentCategory = 'all';
  let bonusItemsCache = [];
  let userOrdersCache = [];

  // Fallback стартовые товары (если база ещё наполняется)
  const FALLBACK_ITEMS = [
    {
      id: 'coupon-10',
      title: 'Купон на скидку 10 BYN',
      description: 'Скидка 10 BYN на комиссию вашего следующего заказа',
      category: 'coupons',
      price_ice: 10,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Популярно',
      stock: -1
    },
    {
      id: 'coupon-25',
      title: 'Купон на скидку 25 BYN',
      description: 'Скидка 25 BYN на комиссию любого крупного заказа',
      category: 'coupons',
      price_ice: 25,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Выгодно',
      stock: -1
    },
    {
      id: 'coupon-insurance',
      title: 'Бесплатная страховка 2%',
      description: '100% покрытие рисков международной логистики на один любой заказ',
      category: 'coupons',
      price_ice: 15,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Хит',
      stock: -1
    },
    {
      id: 'mobile-5',
      title: 'Пополнение телефона 5 BYN',
      description: 'Моментальное пополнение баланса МТС, А1 или Life:)',
      category: 'mobile',
      price_ice: 5,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Связь',
      stock: -1
    },
    {
      id: 'mobile-10',
      title: 'Пополнение телефона 10 BYN',
      description: 'Пополнение номера телефона любого мобильного оператора Беларуси',
      category: 'mobile',
      price_ice: 10,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Топ',
      stock: -1
    },
    {
      id: 'mobile-20',
      title: 'Пополнение телефона 20 BYN',
      description: 'Пополнение номера телефона любого мобильного оператора Беларуси',
      category: 'mobile',
      price_ice: 20,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Максимум',
      stock: -1
    },
    {
      id: 'merch-stickers',
      title: 'Фирменный стикерпак ICE LOGIX',
      description: 'Набор из 10 голографических водостойких виниловых стикеров',
      category: 'merch',
      price_ice: 12,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Эксклюзив',
      stock: 45
    },
    {
      id: 'merch-socks',
      title: 'Фирменные носки ICE LOGIX (Black/Cyan)',
      description: 'Плотный премиальный хлопок, усиленная стопа и вышитый логотип',
      category: 'merch',
      price_ice: 18,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Дроп',
      stock: 28
    },
    {
      id: 'merch-tshirt',
      title: 'Оверсайз футболка ICE Heavyweight',
      description: 'Плотность 240g, стойкая шелкография, фирменная бирка с голограммой',
      category: 'merch',
      price_ice: 65,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Лимитка',
      stock: 12
    },
    {
      id: 'merch-hoodie',
      title: 'Худи ICE LOGIX Polar Fleece',
      description: 'Утеплённый оверсайз худи с премиальной вышивкой на груди',
      category: 'merch',
      price_ice: 120,
      image_url: './assets/icl_currency_icon.png',
      badge: 'VIP',
      stock: 8
    },
    {
      id: 'gadget-cleaner',
      title: 'Набор для ухода за кроссовками',
      description: 'Профессиональная щётка, чистящая пена и влагозащитная микрофибра',
      category: 'gadgets',
      price_ice: 35,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Полезно',
      stock: 18
    },
    {
      id: 'gadget-shields',
      title: 'Силиконовые формодержатели Sneaker Shields',
      description: 'Защита от заломов носовой части обуви (пара, регулируемый размер)',
      category: 'gadgets',
      price_ice: 14,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Мастхэв',
      stock: 35
    },
    {
      id: 'gadget-powerbank',
      title: 'Повербанк ICE Power 10000mAh',
      description: 'Компактный внешний аккумулятор с быстрой зарядкой PD 22.5W',
      category: 'gadgets',
      price_ice: 75,
      image_url: './assets/icl_currency_icon.png',
      badge: 'Гаджет',
      stock: 6
    }
  ];

  async function loadBonusItems() {
    try {
      if (typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient
          .from('bonus_shop_items')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          bonusItemsCache = data;
          return data;
        }
      }
    } catch (e) {
      console.warn('loadBonusItems error:', e);
    }
    bonusItemsCache = FALLBACK_ITEMS;
    return FALLBACK_ITEMS;
  }

  async function loadUserBonusOrders() {
    try {
      const uid = window.userId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
      if (typeof supabaseClient !== 'undefined' && uid) {
        const { data } = await supabaseClient
          .from('bonus_shop_orders')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });
        userOrdersCache = data || [];
        return userOrdersCache;
      }
    } catch (e) {
      console.warn('loadUserBonusOrders error:', e);
    }
    userOrdersCache = [];
    return [];
  }

  async function renderBonusShop() {
    const items = await loadBonusItems();
    const userBalance = Number(window.balance || window.icesBalance || 0);

    const categories = [
      { id: 'all', label: 'Все награды', icon: '✨' },
      { id: 'coupons', label: 'Купоны и скидки', icon: '🎟️' },
      { id: 'mobile', label: 'Баланс связи', icon: '📱' },
      { id: 'merch', label: 'Мерч ICE LOGIX', icon: '👕' },
      { id: 'gadgets', label: 'Гаджеты и уход', icon: '🎧' }
    ];

    const filteredItems = currentCategory === 'all'
      ? items
      : items.filter(it => it.category === currentCategory);

    const itemsHtml = filteredItems.length === 0
      ? `<div class="p-8 text-center glass-card"><p class="text-white/60 text-sm">В этой категории пока нет наград</p></div>`
      : filteredItems.map(item => {
          const canAfford = userBalance >= item.price_ice;
          const isOutOfStock = item.stock === 0;
          return `
            <div class="glass-card flex flex-col justify-between p-3.5 relative overflow-hidden transition-all duration-300 hover:border-cyan-500/40" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
              ${item.badge ? `
                <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide" style="background: linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.3)); border: 1px solid rgba(6,182,212,0.5); color: #67e8f9;">
                  ${item.badge}
                </div>
              ` : ''}
              
              <div class="flex items-start gap-3 mb-3">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 p-2" style="background: linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.05)); border: 1px solid rgba(6,182,212,0.2);">
                  <img src="${item.image_url || './assets/icl_currency_icon.png'}" alt="${item.title}" class="w-full h-full object-contain" onerror="this.src='./assets/icl_currency_icon.png'">
                </div>
                <div class="flex-1 min-w-0 pr-12">
                  <h4 class="text-white font-bold text-sm leading-snug line-clamp-2">${item.title}</h4>
                  <p class="text-white/50 text-[11px] mt-1 line-clamp-2 leading-relaxed">${item.description || ''}</p>
                </div>
              </div>

              <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-cyan-400 font-black text-base">${item.price_ice}</span>
                    <span class="text-[11px] font-bold text-cyan-300/80">ICE</span>
                    <span class="text-[10px] text-white/40">(~${item.price_ice} BYN)</span>
                  </div>
                  ${item.stock > 0 ? `<p class="text-[10px] text-white/40">Осталось: ${item.stock} шт.</p>` : ''}
                </div>

                <button 
                  class="btn-redeem-item px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    isOutOfStock 
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : canAfford 
                        ? 'btn-primary shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                        : 'bg-white/10 text-white/50 hover:bg-white/15'
                  }"
                  data-item-id="${item.id}"
                  ${isOutOfStock ? 'disabled' : ''}
                >
                  ${isOutOfStock ? 'Закончился' : canAfford ? 'Забрать' : `Нужно ещё ${(item.price_ice - userBalance).toFixed(0)}`}
                </button>
              </div>
            </div>
          `;
        }).join('');

    return `
      <!-- Стандартная кнопка возврата -->
      <button id="bonusShopBackBtn" class="global-back-btn mb-3">
        <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span>
        Назад в профиль
      </button>

      <!-- Главный баннер магазина бонусов -->
      <div class="relative overflow-hidden p-4 mb-4 rounded-2xl" style="background: linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.12)); border: 1px solid rgba(6,182,212,0.35);">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="text-xl">🎁</span>
              <h2 class="text-lg font-black text-white">Магазин бонусов ICE</h2>
            </div>
            <p class="text-white/60 text-xs mt-0.5">Обменивайте баллы за заказы и рефералов на реальные награды</p>
          </div>
          <button id="bonusHistoryBtn" class="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/80 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5">
            <span>📦</span> Мои награды
          </button>
        </div>

        <!-- Виджет баланса и кнопка перехода в рефералку -->
        <div class="p-3 rounded-xl flex items-center justify-between" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);">
          <div>
            <p class="text-[10px] uppercase font-bold tracking-wider text-white/50">Ваш баланс ICE</p>
            <div class="flex items-baseline gap-1.5 mt-0.5">
              <span class="text-2xl font-black text-cyan-400" id="bonusShopUserBal">${userBalance.toFixed(2)}</span>
              <span class="text-xs font-bold text-white/70">ICE</span>
              <span class="text-[11px] text-emerald-400 font-semibold">(1 ICE = 1 BYN)</span>
            </div>
          </div>
          <button onclick="switchTab('reftree')" class="px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all flex items-center gap-1.5">
            <span>🌳</span> Как накопить больше?
          </button>
        </div>
      </div>

      <!-- Фильтры категорий -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        ${categories.map(c => `
          <button 
            class="bonus-category-chip px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
              currentCategory === c.id 
                ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
            }"
            data-category="${c.id}"
          >
            <span>${c.icon}</span> ${c.label}
          </button>
        `).join('')}
      </div>

      <!-- Список товаров -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6" id="bonusItemsGrid">
        ${itemsHtml}
      </div>

      <!-- Модальное окно оформления обмена (скрыто по умолчанию) -->
      <div id="bonusRedeemModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
        <div class="glass-card w-full max-w-sm p-5 rounded-2xl border border-cyan-500/30 relative" style="background: #111827;">
          <button id="closeBonusRedeemModal" class="absolute top-4 right-4 text-white/60 hover:text-white text-lg font-bold">&times;</button>
          
          <div class="text-center mb-4">
            <span class="text-3xl">🎉</span>
            <h3 class="text-white font-bold text-base mt-1" id="modalItemTitle">Обмен наград</h3>
            <p class="text-cyan-400 font-black text-sm mt-0.5" id="modalItemPrice">0 ICE</p>
          </div>

          <form id="bonusRedeemForm" class="space-y-3">
            <input type="hidden" id="modalItemId" value="">

            <!-- Поля для мобильной связи -->
            <div id="mobileFields" class="space-y-2 hidden">
              <label class="text-white/70 text-xs font-bold block">Оператор связи:</label>
              <select id="mobileOperatorSelect" class="btn-secondary w-full p-2.5 rounded-xl text-xs text-white">
                <option value="A1">A1 (Velcom)</option>
                <option value="MTS">МТС Беларусь</option>
                <option value="LIFE">Life:)</option>
              </select>
              <label class="text-white/70 text-xs font-bold block">Номер телефона:</label>
              <input type="tel" id="mobilePhoneInput" class="btn-secondary w-full p-2.5 rounded-xl text-xs text-white" placeholder="+375 (XX) XXX-XX-XX">
            </div>

            <!-- Поля для мерча и гаджетов -->
            <div id="physicalFields" class="space-y-2 hidden">
              <div id="merchSizeBlock" class="hidden">
                <label class="text-white/70 text-xs font-bold block">Размер:</label>
                <div class="flex gap-2">
                  <button type="button" class="merch-size-btn flex-1 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white bg-white/5 active" data-size="M">M</button>
                  <button type="button" class="merch-size-btn flex-1 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white bg-white/5" data-size="L">L</button>
                  <button type="button" class="merch-size-btn flex-1 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white bg-white/5" data-size="XL">XL</button>
                  <button type="button" class="merch-size-btn flex-1 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white bg-white/5" data-size="XXL">XXL</button>
                </div>
              </div>
              <label class="text-white/70 text-xs font-bold block">Способ получения:</label>
              <select id="physicalDeliverySelect" class="btn-secondary w-full p-2.5 rounded-xl text-xs text-white">
                <option value="SELF_PICKUP">Самовывоз (Несвиж Hub, 0 BYN)</option>
                <option value="EVROPOCHTA">Европочта до ПВЗ</option>
                <option value="CDEK">СДЭК по Беларуси</option>
              </select>
              <label class="text-white/70 text-xs font-bold block">Адрес ПВЗ или доставка:</label>
              <input type="text" id="physicalAddressInput" class="btn-secondary w-full p-2.5 rounded-xl text-xs text-white" placeholder="Город, адрес отделения или улицы">
              <label class="text-white/70 text-xs font-bold block">Контактный телефон:</label>
              <input type="tel" id="physicalPhoneInput" class="btn-secondary w-full p-2.5 rounded-xl text-xs text-white" placeholder="+375 ...">
            </div>

            <!-- Поля для купонов -->
            <div id="couponFields" class="space-y-2 hidden">
              <div class="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
                Купон будет автоматически привязан к вашему профилю и готов к списанию при следующем заказе.
              </div>
            </div>

            <div class="pt-2">
              <button type="submit" id="submitBonusRedeemBtn" class="btn-primary w-full py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                Подтвердить обмен
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Модальное окно истории наград -->
      <div id="bonusHistoryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
        <div class="glass-card w-full max-w-md p-5 rounded-2xl border border-white/10 relative max-h-[80vh] flex flex-col" style="background: #111827;">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 class="text-white font-bold text-sm flex items-center gap-2"><span>📦</span> Мои полученные награды</h3>
            <button id="closeBonusHistoryModal" class="text-white/60 hover:text-white text-lg font-bold">&times;</button>
          </div>
          <div class="overflow-y-auto flex-1 py-3 space-y-2" id="bonusHistoryList">
            <p class="text-white/50 text-xs text-center py-4">Загрузка истории...</p>
          </div>
        </div>
      </div>

      ${typeof renderFooter === 'function' ? renderFooter() : ''}
    `;
  }

  function attachBonusShopHandlers() {
    const backBtn = document.getElementById('bonusShopBackBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        if (typeof window.switchTab === 'function') window.switchTab('profile');
      };
    }

    // Переключение категорий
    document.querySelectorAll('.bonus-category-chip').forEach(chip => {
      chip.onclick = () => {
        currentCategory = chip.dataset.category;
        if (typeof window.switchTab === 'function') window.switchTab('bonus_shop');
      };
    });

    // Открытие модалки на обмен
    document.querySelectorAll('.btn-redeem-item').forEach(btn => {
      btn.onclick = () => {
        const itemId = btn.dataset.itemId;
        const item = bonusItemsCache.find(it => String(it.id) === String(itemId));
        if (!item) return;

        const userBalance = Number(window.balance || window.icesBalance || 0);
        if (userBalance < item.price_ice) {
          if (typeof tgUtil !== 'undefined' && tgUtil.popup) {
            tgUtil.popup(`Для получения этой награды необходимо ${item.price_ice} ICE. На вашем балансе сейчас ${userBalance.toFixed(2)} ICE. Приглашайте друзей, чтобы накопить баллы!`, 'Недостаточно ICE');
          } else {
            alert(`Недостаточно ICE (${userBalance.toFixed(2)} из ${item.price_ice})`);
          }
          return;
        }

        openRedeemModal(item);
      };
    });

    // Модалка истории наград
    const histBtn = document.getElementById('bonusHistoryBtn');
    const histModal = document.getElementById('bonusHistoryModal');
    const closeHist = document.getElementById('closeBonusHistoryModal');
    if (histBtn && histModal) {
      histBtn.onclick = async () => {
        histModal.classList.remove('hidden');
        const listEl = document.getElementById('bonusHistoryList');
        const orders = await loadUserBonusOrders();
        if (!orders || orders.length === 0) {
          listEl.innerHTML = '<p class="text-white/50 text-xs text-center py-6">Вы ещё не обменивали баллы на награды</p>';
          return;
        }
        const statusMap = {
          'PENDING': '<span class="text-amber-400 font-bold text-[10px] bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">В обработке</span>',
          'PROCESSING': '<span class="text-cyan-400 font-bold text-[10px] bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">Собирается</span>',
          'COMPLETED': '<span class="text-emerald-400 font-bold text-[10px] bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Выполнено</span>',
          'CANCELLED': '<span class="text-red-400 font-bold text-[10px] bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">Отклонено</span>'
        };
        listEl.innerHTML = orders.map(ord => `
          <div class="p-3 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center justify-between mb-1">
              <span class="text-white font-bold text-xs">${ord.item_title}</span>
              ${statusMap[ord.status] || ord.status}
            </div>
            <div class="flex items-center justify-between text-[11px] text-white/50">
              <span>Списано: <strong class="text-cyan-400">${ord.price_ice} ICE</strong></span>
              <span>${new Date(ord.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('');
      };
    }
    if (closeHist && histModal) {
      closeHist.onclick = () => histModal.classList.add('hidden');
    }

    // Закрытие формы обмена
    const redeemModal = document.getElementById('bonusRedeemModal');
    const closeRedeem = document.getElementById('closeBonusRedeemModal');
    if (closeRedeem && redeemModal) {
      closeRedeem.onclick = () => redeemModal.classList.add('hidden');
    }

    // Выбор размера
    document.querySelectorAll('.merch-size-btn').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('.merch-size-btn').forEach(x => x.classList.remove('active', 'border-cyan-400', 'text-cyan-400'));
        b.classList.add('active', 'border-cyan-400', 'text-cyan-400');
      };
    });

    // Сабмит формы обмена
    const form = document.getElementById('bonusRedeemForm');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await handleRedeemSubmit();
      };
    }
  }

  function openRedeemModal(item) {
    const modal = document.getElementById('bonusRedeemModal');
    if (!modal) return;

    document.getElementById('modalItemId').value = item.id;
    document.getElementById('modalItemTitle').textContent = item.title;
    document.getElementById('modalItemPrice').textContent = `${item.price_ice} ICE`;

    const mobileFields = document.getElementById('mobileFields');
    const physicalFields = document.getElementById('physicalFields');
    const merchSizeBlock = document.getElementById('merchSizeBlock');
    const couponFields = document.getElementById('couponFields');

    mobileFields.classList.add('hidden');
    physicalFields.classList.add('hidden');
    merchSizeBlock.classList.add('hidden');
    couponFields.classList.add('hidden');

    if (item.category === 'mobile') {
      mobileFields.classList.remove('hidden');
    } else if (item.category === 'merch' || item.category === 'gadgets') {
      physicalFields.classList.remove('hidden');
      if (item.category === 'merch' && (item.title.toLowerCase().includes('футболка') || item.title.toLowerCase().includes('худи') || item.title.toLowerCase().includes('носки'))) {
        merchSizeBlock.classList.remove('hidden');
      }
    } else if (item.category === 'coupons') {
      couponFields.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
  }

  async function handleRedeemSubmit() {
    const itemId = document.getElementById('modalItemId').value;
    const item = bonusItemsCache.find(it => String(it.id) === String(itemId));
    if (!item) return;

    const userBalance = Number(window.balance || window.icesBalance || 0);
    if (userBalance < item.price_ice) {
      alert('Недостаточно ICE');
      return;
    }

    const uid = window.userId || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
    if (!uid) {
      alert('Ошибка авторизации пользователя');
      return;
    }

    const submitBtn = document.getElementById('submitBonusRedeemBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Оформляем...';

    // Формируем payload
    const payload = {
      category: item.category,
      created_at: new Date().toISOString()
    };

    if (item.category === 'mobile') {
      const op = document.getElementById('mobileOperatorSelect').value;
      const ph = document.getElementById('mobilePhoneInput').value.trim();
      if (!ph || ph.length < 7) {
        alert('Пожалуйста, укажите корректный номер телефона');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Подтвердить обмен';
        return;
      }
      payload.operator = op;
      payload.phone = ph;
    } else if (item.category === 'merch' || item.category === 'gadgets') {
      const activeSize = document.querySelector('.merch-size-btn.active');
      payload.size = activeSize ? activeSize.dataset.size : 'One Size';
      payload.delivery_method = document.getElementById('physicalDeliverySelect').value;
      payload.address = document.getElementById('physicalAddressInput').value.trim();
      payload.phone = document.getElementById('physicalPhoneInput').value.trim();
      if (!payload.phone) {
        alert('Пожалуйста, укажите контактный телефон для доставки');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Подтвердить обмен';
        return;
      }
    } else if (item.category === 'coupons') {
      payload.promo_code = `ICE-REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    try {
      // 1. Списание с ices_balance
      const newBal = round2(userBalance - item.price_ice);
      if (typeof supabaseClient !== 'undefined') {
        const { error: balErr } = await supabaseClient
          .from('users')
          .update({ ices_balance: newBal })
          .eq('user_id', uid);
        if (balErr) throw balErr;

        // 2. Запись в balance_entries
        try {
          await supabaseClient.from('balance_entries').insert({
            user_id: uid,
            type: 'BONUS_SHOP_PURCHASE',
            direction: 'DEBIT',
            amount: item.price_ice,
            reason: `Обмен бонусов на: ${item.title}`
          });
        } catch (e) {
          console.warn('balance_entries write warning:', e);
        }

        // 3. Создание заявки в bonus_shop_orders
        const { error: ordErr } = await supabaseClient.from('bonus_shop_orders').insert({
          user_id: uid,
          item_id: (typeof item.id === 'string' && item.id.length > 20) ? item.id : null,
          item_title: item.title,
          category: item.category,
          price_ice: item.price_ice,
          contact_payload: payload,
          status: 'PENDING'
        });
        if (ordErr) console.warn('bonus_shop_orders warning:', ordErr);
      }

      // Обновляем локальное состояние
      window.balance = newBal;
      window.icesBalance = newBal;
      const el = document.getElementById('bonusShopUserBal');
      if (el) el.textContent = newBal.toFixed(2);
      const hb = document.getElementById('headerBalance');
      if (hb) hb.textContent = newBal.toFixed(2);

      // Закрываем модалку
      document.getElementById('bonusRedeemModal').classList.add('hidden');

      // Показываем подтверждение
      if (typeof tgUtil !== 'undefined' && tgUtil.popup) {
        tgUtil.popup(`Награда «${item.title}» успешно оформлена! Заявка передана оператору ICE LOGIX. Списано: ${item.price_ice} ICE.`, 'Успешный обмен');
      } else {
        alert(`Награда «${item.title}» оформлена! Списано: ${item.price_ice} ICE.`);
      }

      // Перезагрузка страницы
      if (typeof window.switchTab === 'function') {
        window.switchTab('bonus_shop');
      }
    } catch (err) {
      console.error('Ошибка при обмене бонусов:', err);
      alert('Произошла ошибка при списании баллов. Пожалуйста, попробуйте позже.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Подтвердить обмен';
    }
  }

  function round2(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  // Экспорт в глобальное пространство
  window.renderBonusShop = renderBonusShop;
  window.attachBonusShopHandlers = attachBonusShopHandlers;
})();
