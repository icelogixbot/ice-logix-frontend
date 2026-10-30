// ==============================================================================
// ICE LOGIX: Модуль Магазина Бонусов (ICE Rewards Shop)
// Витрина наград, покупка за баллы ICE, оформление заявок и история обменов
// ==============================================================================

(function() {
  let currentCategory = 'all';
  let bonusItemsCache = [];
  let userOrdersCache = [];

  function formatRewardText(text) {
    if (!text) return '';
    const signHtml = window.bynSign ? window.bynSign({ size: '0.82em' }) : '';
    // Single-pass replacement prevents re-scanning and corrupting the inserted SVG markup
    return String(text).replace(/(\d+(?:\.\d+)?)\s*(?:BYN|ICE)\b|\bBYN\b|\bICE\b(?!\s*LOGIX\b)/gi, (match, num) => {
      if (num) {
        return `<span style="white-space:nowrap">${num}&nbsp;${signHtml}</span>`;
      }
      return signHtml;
    });
  }

  const CAT_ICON = { coupons: 'tag', mobile: 'phone', merch: 'bag', gadgets: 'zap' };

  function renderRewardIcon(item) {
    const hasCustomImg = item.image_url && !item.image_url.includes('icl_currency_icon') && !item.image_url.includes('coupon_10byn') && (item.image_url.startsWith('http') || item.image_url.startsWith('/'));
    const ico = window.UI.icon(CAT_ICON[item.category] || 'gift', 30);
    if (hasCustomImg) {
      return `<img src="${item.image_url}" alt="" onerror="this.remove()"><span class="bs-ico">${ico}</span>`;
    }
    return `<span class="bs-ico">${ico}</span>`;
  }

  // Fallback стартовые товары (если база ещё наполняется)
  const FALLBACK_ITEMS = [
    {
      id: 'coupon-10',
      title: 'Купон на скидку 10',
      description: 'Скидка на комиссию вашего следующего заказа',
      category: 'coupons',
      price_ice: 10,
      image_url: '',
      badge: 'Популярно',
      stock: -1
    },
    {
      id: 'coupon-25',
      title: 'Купон на скидку 25',
      description: 'Скидка на комиссию любого крупного заказа',
      category: 'coupons',
      price_ice: 25,
      image_url: '',
      badge: 'Выгодно',
      stock: -1
    },
    {
      id: 'coupon-insurance',
      title: 'Бесплатная страховка 2%',
      description: '100% покрытие рисков международной логистики на один любой заказ',
      category: 'coupons',
      price_ice: 15,
      image_url: '',
      badge: 'Хит',
      stock: -1
    },
    {
      id: 'mobile-5',
      title: 'Пополнение телефона на 5',
      description: 'Моментальное пополнение баланса МТС, А1 или Life:)',
      category: 'mobile',
      price_ice: 5,
      image_url: '',
      badge: 'Связь',
      stock: -1
    },
    {
      id: 'mobile-10',
      title: 'Пополнение телефона на 10',
      description: 'Пополнение номера телефона любого мобильного оператора Беларуси',
      category: 'mobile',
      price_ice: 10,
      image_url: '',
      badge: 'Топ',
      stock: -1
    },
    {
      id: 'mobile-20',
      title: 'Пополнение телефона на 20',
      description: 'Пополнение номера телефона любого мобильного оператора Беларуси',
      category: 'mobile',
      price_ice: 20,
      image_url: '',
      badge: 'Максимум',
      stock: -1
    },
    {
      id: 'merch-stickers',
      title: 'Фирменный стикерпак ICE LOGIX',
      description: 'Набор из 10 голографических водостойких виниловых стикеров',
      category: 'merch',
      price_ice: 12,
      image_url: '',
      badge: 'Эксклюзив',
      stock: 45
    },
    {
      id: 'merch-socks',
      title: 'Фирменные носки ICE LOGIX (Black/Cyan)',
      description: 'Плотный премиальный хлопок, усиленная стопа и вышитый логотип',
      category: 'merch',
      price_ice: 18,
      image_url: '',
      badge: 'Дроп',
      stock: 28
    },
    {
      id: 'merch-tshirt',
      title: 'Оверсайз футболка ICE Heavyweight',
      description: 'Плотность 240g, стойкая шелкография, фирменная бирка с голограммой',
      category: 'merch',
      price_ice: 65,
      image_url: '',
      badge: 'Лимитка',
      stock: 12
    },
    {
      id: 'merch-hoodie',
      title: 'Худи ICE LOGIX Polar Fleece',
      description: 'Утеплённый оверсайз худи с премиальной вышивкой на груди',
      category: 'merch',
      price_ice: 120,
      image_url: '',
      badge: 'VIP',
      stock: 8
    },
    {
      id: 'gadget-cleaner',
      title: 'Набор для ухода за кроссовками',
      description: 'Профессиональная щётка, чистящая пена и влагозащитная микрофибра',
      category: 'gadgets',
      price_ice: 35,
      image_url: '',
      badge: 'Полезно',
      stock: 18
    },
    {
      id: 'gadget-shields',
      title: 'Силиконовые формодержатели Sneaker Shields',
      description: 'Защита от заломов носовой части обуви (пара, регулируемый размер)',
      category: 'gadgets',
      price_ice: 14,
      image_url: '',
      badge: 'Мастхэв',
      stock: 35
    },
    {
      id: 'gadget-powerbank',
      title: 'Повербанк ICE Power 10000mAh',
      description: 'Компактный внешний аккумулятор с быстрой зарядкой PD 22.5W',
      category: 'gadgets',
      price_ice: 75,
      image_url: '',
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

    const U = window.UI;
    const categories = [
      { id: 'all', label: 'Все', icon: 'sparkles' },
      { id: 'coupons', label: 'Купоны', icon: 'tag' },
      { id: 'mobile', label: 'Связь', icon: 'phone' },
      { id: 'merch', label: 'Мерч', icon: 'bag' },
      { id: 'gadgets', label: 'Уход и гаджеты', icon: 'zap' }
    ];

    const filteredItems = currentCategory === 'all'
      ? items
      : items.filter(it => it.category === currentCategory);

    const itemsHtml = filteredItems.length === 0
      ? `<div class="bs-empty">${U.empty({ icon: 'gift', title: 'Здесь пока пусто', text: 'В этой категории наград пока нет.' })}</div>`
      : filteredItems.map(item => {
          const canAfford = userBalance >= item.price_ice;
          const isOutOfStock = item.stock === 0;
          return `
            <div class="bs-item">
              <div class="bs-media c-${item.category || 'all'}">
                ${renderRewardIcon(item)}
                ${item.badge ? `<span class="bs-badge">${U.esc(item.badge)}</span>` : ''}
              </div>
              <div class="bs-body">
                <h4>${formatRewardText(item.title)}</h4>
                <p>${formatRewardText(item.description)}</p>
              </div>
              <div class="bs-foot">
                <div class="bs-price">${U.money(item.price_ice)}${item.stock > 0 ? `<small>осталось ${item.stock}</small>` : ''}</div>
                <button type="button" class="btn-redeem-item bs-get ${isOutOfStock ? 'off' : canAfford ? 'can' : 'need'}" data-item-id="${item.id}" ${isOutOfStock ? 'disabled' : ''}>
                  ${isOutOfStock ? 'Нет в наличии' : canAfford ? 'Забрать' : `Ещё ${(item.price_ice - userBalance).toFixed(0)}`}
                </button>
              </div>
            </div>
          `;
        }).join('');

    return `
      <div class="rd-screen page-enter bs">
      <div class="rd-head">
        <button id="bonusShopBackBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Магазин бонусов</h1><p class="rd-head-sub">Меняйте баллы на скидки и подарки</p></div>
        <button id="bonusHistoryBtn" type="button" class="rd-back" aria-label="Мои награды">${U.icon('history', 21)}</button>
      </div>

      <div class="bs-hero">
        <div class="bs-hero-l">
          <span>Ваши баллы</span>
          <b><span id="bonusShopUserBal">${userBalance.toFixed(2)}</span>${window.bynSign ? window.bynSign({ size: '0.8em' }) : ''}</b>
          <button type="button" class="bs-more" onclick="switchTab('referral')">Как накопить больше${U.icon('chevR', 15)}</button>
        </div>
        <div class="bs-hero-art" aria-hidden="true"><span class="g1">${U.icon('gift', 38)}</span><span class="g2">${U.icon('star', 18)}</span><span class="g3">${U.icon('sparkles', 16)}</span></div>
      </div>

      <div class="rd-chips bs-chips">
        ${categories.map(c => `<button type="button" class="bonus-category-chip rd-chip ${currentCategory === c.id ? 'on' : ''}" data-category="${c.id}">${U.icon(c.icon, 15)}${c.label}</button>`).join('')}
      </div>

      <div class="bs-grid" id="bonusItemsGrid">
        ${itemsHtml}
      </div>
      </div>

      <!-- Модальное окно оформления обмена (скрыто по умолчанию) -->
      <div id="bonusRedeemModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm hidden">
        <div class="glass-card w-full max-w-sm p-5 rounded-2xl border border-cyan-500/30 relative" style="background: #111827;">
          <button id="closeBonusRedeemModal" class="absolute top-4 right-4 text-white/60 hover:text-white text-lg font-bold">&times;</button>
          
          <div class="text-center mb-4">
            <span class="bs-modal-ico">${U.icon('gift', 28)}</span>
            <h3 class="text-white font-bold text-base mt-1" id="modalItemTitle">Обмен наград</h3>
            <p class="text-cyan-400 font-black text-sm mt-0.5 inline-flex items-center justify-center gap-1" id="modalItemPrice">0</p>
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
                <option value="SELF_PICKUP">Самовывоз в Несвиже, бесплатно</option>
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
              <button type="submit" id="submitBonusRedeemBtn" class="btn-primary w-full py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(77, 163, 255,0.4)]">
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
            <h3 class="text-white font-bold text-base flex items-center gap-2">${U.icon('history', 18)} Мои награды</h3>
            <button id="closeBonusHistoryModal" class="text-white/60 hover:text-white text-lg font-bold">&times;</button>
          </div>
          <div class="overflow-y-auto flex-1 py-3 space-y-2" id="bonusHistoryList">
            <p class="text-white/50 text-xs text-center py-4">Загрузка истории...</p>
          </div>
        </div>
      </div>

    `;
  }

  function attachBonusShopHandlers() {
    const backBtn = document.getElementById('bonusShopBackBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        if (typeof window.goBackGlobal === 'function') window.goBackGlobal(); else if (typeof window.switchTab === 'function') window.switchTab('profile');
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
            tgUtil.popup(`Награда стоит ${item.price_ice}, а у вас ${userBalance.toFixed(2)}. Приглашайте друзей, чтобы накопить быстрее.`, 'Пока не хватает баллов');
          } else {
            alert(`Недостаточно средств на балансе (${userBalance.toFixed(2)} из ${item.price_ice})`);
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
          listEl.innerHTML = window.UI.empty({ icon: 'gift', title: 'Наград пока нет', text: 'Выберите подарок в магазине, и он появится здесь.' });
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
              <span class="inline-flex items-center gap-1">Списано: <strong class="text-cyan-400">${ord.price_ice}</strong> ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}</span>
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
    document.getElementById('modalItemTitle').innerHTML = formatRewardText(item.title);
    document.getElementById('modalItemPrice').innerHTML = `${item.price_ice} ${window.bynSign ? window.bynSign({ color: 'cyan', size: '0.85em' }) : ''}`;

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
      alert('Недостаточно средств на балансе');
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
    }

    try {
      // Цену, списание, промокод купона и заявку делает сервер (buy_bonus_item)
      const { data: bought, error: buyErr } = await supabaseClient.rpc('buy_bonus_item', {
        p_item_id: item.id,
        p_payload: payload
      });
      if (buyErr) throw buyErr;
      const newBal = round2(Number(bought?.balance ?? userBalance));

      // Обновляем локальное состояние
      window.setUserBalance(newBal);
      window.icesBalance = newBal;
      const el = document.getElementById('bonusShopUserBal');
      if (el) el.textContent = newBal.toFixed(2);

      // Закрываем модалку
      document.getElementById('bonusRedeemModal').classList.add('hidden');

      // Показываем подтверждение
      if (typeof tgUtil !== 'undefined' && tgUtil.popup) {
        tgUtil.popup(`Награда «${item.title}» успешно оформлена! Заявка передана оператору ICE LOGIX. Списано: ${item.price_ice}.`, 'Успешный обмен');
      } else {
        alert(`Награда «${item.title}» оформлена! Списано: ${item.price_ice}.`);
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
