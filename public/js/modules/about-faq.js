// ============================================================
// ICE LOGIX Module: About & FAQ
// ============================================================
// ==================== О НАС (ABOUT US) ====================
async function renderAboutUs() {
  return `
    <div class="flex items-center gap-3 mb-4 mt-2">
      <button id="backFromAboutBtn" type="button" class="global-back-btn !mb-0" title="Назад">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <div>
        <h2 class="text-xl font-bold text-white tracking-wide">О сервисе и помощь</h2>
        <p class="text-[11px] text-white/50">ICE LOGIX — твой проводник в мир шоппинга</p>
      </div>
    </div>
  
  <div class="space-y-4 page-enter pb-8">
    <!-- 1. Hero Brand Card -->
    <div class="glass-card text-center relative overflow-hidden p-6 rounded-2xl">
      <div class="absolute inset-0 bg-gradient-to-b from-cyan-500/15 via-transparent to-transparent pointer-events-none"></div>
      <img src="./assets/logo.png" class="h-20 mx-auto mb-3 drop-shadow-2xl relative z-10" alt="ICE LOGIX">
      <h2 class="text-2xl font-black text-white mb-1.5 tracking-wider relative z-10">ICE LOGIX</h2>
      <p class="text-cyan-300 font-semibold text-xs mb-4 relative z-10">Доставка мечты из любой точки мира</p>
      
      <div class="flex flex-wrap justify-center gap-1.5 relative z-10">
        <span class="status-badge bg-white/10 border-white/20 text-white text-[11px]">📍 Беларусь, г. Несвиж</span>
        <span class="status-badge bg-white/10 border-white/20 text-white text-[11px]">📦 Выкуп и Консолидация</span>
        <span class="status-badge bg-cyan-500/20 border-cyan-500/50 text-cyan-300 text-[11px]">🛡️ Официальные расчеты</span>
      </div>
    </div>

    <!-- 2. Быстрые действия / Помощь -->
    <div class="grid grid-cols-3 gap-2">
      <!-- Поддержка -->
      <button id="aboutTgSupportBtn" class="glass-card p-3 rounded-2xl text-center hover:bg-white/10 active:scale-95 transition flex flex-col items-center justify-center gap-1.5 border border-cyan-500/30">
        <div class="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center text-lg">
          💬
        </div>
        <span class="text-xs font-bold text-white">Поддержка</span>
        <span class="text-[9px] text-cyan-300/80">Чат в TG</span>
      </button>

      <!-- FAQ -->
      <button id="aboutFaqBtn" class="glass-card p-3 rounded-2xl text-center hover:bg-white/10 active:scale-95 transition flex flex-col items-center justify-center gap-1.5 border border-purple-500/30">
        <div class="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center text-lg">
          ❓
        </div>
        <span class="text-xs font-bold text-white">База знаний</span>
        <span class="text-[9px] text-purple-300/80">FAQ & Ответы</span>
      </button>

      <!-- Контакты -->
      <button id="aboutContactsBtn" class="glass-card p-3 rounded-2xl text-center hover:bg-white/10 active:scale-95 transition flex flex-col items-center justify-center gap-1.5 border border-emerald-500/30">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-lg">
          📞
        </div>
        <span class="text-xs font-bold text-white">Контакты</span>
        <span class="text-[9px] text-emerald-300/80">Офис & Реквизиты</span>
      </button>
    </div>

    <!-- 3. Условия и комиссии -->
    <div class="glass-card p-4 rounded-2xl space-y-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span class="text-lg">⚖️</span> Условия и комиссии сервиса
      </h3>
      <div class="space-y-2.5">
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-bold text-white text-xs">Комиссия сервиса — 20%</h4>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">ПРОЗРАЧНО</span>
          </div>
          <p class="text-[11px] text-white/70 leading-relaxed">
            Фиксированная комиссия 20% за выкуп, консолидацию и организацию логистики. С этой комиссии мы официально платим налоги в бюджет РБ. Никаких скрытых наценок!
          </p>
        </div>
        
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-bold text-white text-xs">Логистика из Китая — 10$ / кг</h4>
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">10-15 ДНЕЙ</span>
          </div>
          <p class="text-[11px] text-white/70 leading-relaxed">
            Наш официальный партнер — <strong class="text-cyan-400">ShopbyShop</strong>. Фиксированный тариф 10$ за килограмм (по фактическому или объемному весу).
          </p>
        </div>
        
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <h4 class="font-bold text-white text-xs mb-1">География доставки</h4>
          <p class="text-[11px] text-white/70 leading-relaxed">
            Стабильно доставляем из <strong>Китая (Poizon, Taobao, 1688)</strong>, <strong>Европы (Zalando)</strong> и <strong>России (Lamoda)</strong>. В разработке маршруты из США, ОАЭ и Кореи.
          </p>
        </div>
      </div>
    </div>
    
    <!-- 4. Юридическая прозрачность и документы -->
    <div class="glass-card p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 space-y-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span class="text-lg">📜</span> Юридическая прозрачность
      </h3>
      <p class="text-xs text-white/75 leading-relaxed">
        Сервис работает официально в соответствии с законодательством Республики Беларусь. Все расчеты фиксируются, на каждый заказ формируется электронный документ.
      </p>
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button id="aboutOfferBtn" class="btn-primary py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
          <span>📄</span> Публичная оферта
        </button>
        <button id="aboutPrivacyBtn" class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/90 active:scale-95 transition flex items-center justify-center gap-1.5">
          <span>🔒</span> Конфиденциальность
        </button>
      </div>
    </div>

    <!-- 5. Мы в социальных сетях -->
    <div class="glass-card p-4 rounded-2xl space-y-3">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <span class="text-lg">🌐</span> Мы в социальных сетях
      </h3>
      <p class="text-xs text-white/60">
        Подписывайся на наши каналы, чтобы следить за скидками, распаковками и новостями:
      </p>
      <div class="grid grid-cols-3 gap-2 pt-1">
        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="tg">
          <div class="w-8 h-8 rounded-lg bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">Telegram</span>
        </button>

        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="ig">
          <div class="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">Instagram</span>
        </button>

        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="tiktok">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.8a4.85 4.85 0 0 1-1.01-.11z"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">TikTok</span>
        </button>

        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="vk">
          <div class="w-8 h-8 rounded-lg bg-[#0077FF]/20 text-[#0077FF] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.597v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.684 4 8.277c0-.254.102-.491.597-.491h1.744c.447 0 .615.2.786.678.867 2.49 2.31 4.674 2.905 4.674.224 0 .33-.102.33-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v3.499c0 .373.17.508.271.508.224 0 .407-.135.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.491-.085.744-.576.744z"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">VK</span>
        </button>

        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="youtube">
          <div class="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">YouTube</span>
        </button>

        <button class="about-social-item p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1.5 active:scale-95 transition" data-social="pinterest">
          <div class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.494 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.342-.091.382-.294 1.197-.333 1.36-.053.21-.173.255-.399.149-1.492-.695-2.424-2.877-2.424-4.628 0-3.769 2.737-7.229 7.892-7.229 4.143 0 7.362 2.953 7.362 6.899 0 4.117-2.597 7.431-6.202 7.431-1.211 0-2.35-.63-2.739-1.373l-.747 2.846c-.27 1.029-.999 2.319-1.488 3.111C9.079 23.774 10.493 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
          </div>
          <span class="text-[11px] font-medium text-white/90">Pinterest</span>
        </button>
      </div>
    </div>

    <!-- 6. Официальные реквизиты -->
    <div class="glass-card p-4 rounded-2xl space-y-2 border border-white/10 text-center">
      <p class="text-xs font-semibold text-white/80">Официальные реквизиты сервиса</p>
      <div class="text-[11px] text-white/50 space-y-0.5">
        <p>ИП Иванов И.И. • УНП 123456789</p>
        <p>Зарегистрирован в Республике Беларусь</p>
      </div>
      <p class="text-[10px] text-white/40 pt-2 border-t border-white/5">
        ICE LOGIX © 2026. Все права защищены.<br>Доставка мечты из любой точки мира
      </p>
    </div>
  </div>
  `;
}

function attachAboutUsHandlers() {
  const backBtn = document.getElementById('backFromAboutBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      window.goBackGlobal();
    };
  }

  // 1. Поддержка
  const tgBtn = document.getElementById('aboutTgSupportBtn');
  if (tgBtn) {
    tgBtn.onclick = () => {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink('https://t.me/icelogix_support_bot');
      } else {
        window.open('https://t.me/icelogix_support_bot', '_blank');
      }
    };
  }

  // 2. FAQ
  const faqBtn = document.getElementById('aboutFaqBtn');
  if (faqBtn) {
    faqBtn.onclick = () => {
      currentSubScreen = 'faq';
      renderCurrentScreen();
    };
  }

  // 3. Контакты
  const contactsBtn = document.getElementById('aboutContactsBtn');
  if (contactsBtn) {
    contactsBtn.onclick = () => {
      if (typeof window.showContactsModal === 'function') {
        window.showContactsModal();
      } else {
        tgUtil.alert('Контакты: г. Несвиж, тел. +375 (29) 000-00-00');
      }
    };
  }

  // 4. Оферта
  const offerBtn = document.getElementById('aboutOfferBtn');
  if (offerBtn) {
    offerBtn.onclick = () => {
      if (typeof window.downloadAgreement === 'function') {
        window.downloadAgreement();
      } else {
        tgUtil.alert('Публичная оферта доступна в боте');
      }
    };
  }

  // 5. Конфиденциальность
  const privacyBtn = document.getElementById('aboutPrivacyBtn');
  if (privacyBtn) {
    privacyBtn.onclick = () => {
      tgUtil.alert('Политика конфиденциальности: ваши персональные данные надёжно зашифрованы и используются исключительно для оформления международной доставки в соответствии с законодательством Республики Беларусь.');
    };
  }

  // 6. Социальные сети
  document.querySelectorAll('.about-social-item').forEach(btn => {
    btn.onclick = () => {
      const social = btn.getAttribute('data-social');
      if (social === 'tg') {
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink('https://t.me/icelogix_channel');
        } else {
          window.open('https://t.me/icelogix_channel', '_blank');
        }
      } else {
        tgUtil.alert('Наш профиль в этой соцсети будет запущен в ближайшем релизе!');
      }
    };
  });
}



async function addToCart(productId, quantity = 1, skipAlert = false, isFromBtn = false) {
  if (!userId) {
    window.requireAuth('Авторизуйтесь для добавления товаров в корзину');
    return;
  }
  const pid = String(productId);
  window.cartQty = window.cartQty || {};
  const prevQty = window.cartQty[pid] || 0;
  const newQty = prevQty + quantity;
  
  // 1. Optimistically update local memory and UI
  window.cartQty[pid] = newQty;
  window._cartQtyLoaded = true;
  if (typeof updateProductCartUI === 'function') {
    if (isFromBtn) {
      setTimeout(() => updateProductCartUI(pid), 1200);
    } else {
      updateProductCartUI(pid);
    }
  }
  if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
  tgUtil.haptic('success');

  // 2. Perform DB sync in the background
  (async () => {
    try {
      const { data: existing } = await supabaseClient
        .from('cart')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        await supabaseClient
          .from('cart')
          .update({ quantity: existing.quantity + quantity, updated_at: new Date() })
          .eq('id', existing.id);
      } else {
        await supabaseClient
          .from('cart')
          .insert({ user_id: userId, product_id: productId, quantity });
      }
      await updateCartBadge();
    } catch (err) {
      console.error('addToCart background sync failed', err);
      // Revert local state and UI
      window.cartQty[pid] = prevQty;
      if (typeof updateProductCartUI === 'function') updateProductCartUI(pid);
      tgUtil.alert('Не удалось сохранить в корзину: ' + err.message);
    }
  })();
}

// ==================== INLINE CART QUANTITY STEPPER ====================
// Shows a "− [count] +" control in place of the "Add to cart" button once a
// product is in the cart. State is persisted in the Supabase `cart` table and
// mirrored in window.cartQty so every product card across all screens stays in sync.
window.cartQty = window.cartQty || {};

async function loadCartQty() {
  if (!window.userId && !userId) { window.cartQty = {}; return; }
  try {
    const { data } = await supabaseClient.from('cart').select('product_id, quantity').eq('user_id', userId);
    const map = {};
    (data || []).forEach(r => { map[String(r.product_id)] = r.quantity; });
    window.cartQty = map;
  } catch (e) {
    console.error('loadCartQty failed', e);
  }
}

const CART_ICON_SVG = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span>';

function cartAddBtnHTML(productId) {
  return `<button class="btn-primary addToCartBtn flex-1" data-product-id="${productId}">Корзина</button>`;
}

function cartStepperHTML(productId, qty) {
  return `<div class="cart-stepper flex-1" data-product-id="${productId}">`
    + `<button class="cart-step-btn" data-action="dec" data-product-id="${productId}" aria-label="Уменьшить">−</button>`
    + `<span class="cart-step-count" data-product-id="${productId}">${qty}</span>`
    + `<button class="cart-step-btn" data-action="inc" data-product-id="${productId}" aria-label="Увеличить">+</button>`
    + `</div>`;
}

function _nodeFromHTML(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  return wrap.firstElementChild;
}

function makeStepper(productId, qty) {
  return _nodeFromHTML(cartStepperHTML(productId, qty));
}

function makeAddBtn(productId) {
  const btn = _nodeFromHTML(cartAddBtnHTML(productId));
  btn.onclick = (e) => {
    e.stopPropagation();
    if (!window.userId && !userId) { window.requireAuth('Для добавления в корзину необходимо войти или зарегистрироваться.'); return; }
    btn.classList.add('adding-success');
    btn.innerHTML = `<span class="ix text-green-400 font-bold flex items-center justify-center gap-1" style="animation: scaleUp 0.3s ease;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><polyline points="20 6 9 17 4 12"/></svg></span>`;
    addToCart(productId, 1, true, true);
  };
  return btn;
}

// Replace any "Add to cart" buttons whose product is already in the cart with a stepper.
function decorateCartButtons(root) {
  root = root || document;
  if (!window.userId && !userId) return;
  if (!window._cartQtyLoaded) {
    loadCartQty().then(() => { window._cartQtyLoaded = true; decorateCartButtons(root); });
    return;
  }
  root.querySelectorAll('.addToCartBtn').forEach(btn => {
    const pid = String(btn.dataset.productId || '');
    if (!pid) return;
    const qty = window.cartQty[pid] || 0;
    if (qty > 0) btn.replaceWith(makeStepper(pid, qty));
  });
}

// Reflect the current quantity for one product across every card on screen.
function updateProductCartUI(productId) {
  const pid = String(productId);
  const qty = window.cartQty[pid] || 0;
  document.querySelectorAll('.cart-stepper').forEach(s => {
    if (String(s.dataset.productId) !== pid) return;
    if (qty > 0) {
      const c = s.querySelector('.cart-step-count');
      if (c) c.textContent = qty;
    } else {
      s.replaceWith(makeAddBtn(pid));
    }
  });
  if (qty > 0) {
    document.querySelectorAll('.addToCartBtn').forEach(btn => {
      if (String(btn.dataset.productId) === pid) btn.replaceWith(makeStepper(pid, qty));
    });
  }
}

// Persist a new quantity (qty <= 0 removes the item) and refresh the UI.
async function setCartQty(productId, qty) {
  const pid = String(productId);
  const prevQty = window.cartQty[pid] || 0;
  
  // 1. Optimistic update
  if (qty <= 0) {
    delete window.cartQty[pid];
  } else {
    window.cartQty[pid] = qty;
  }
  updateProductCartUI(pid);
  if (typeof _tabCache !== 'undefined') delete _tabCache['cart:'];
  tgUtil.haptic('light');

  // 2. Background sync
  (async () => {
    try {
      if (qty <= 0) {
        await supabaseClient.from('cart').delete().eq('user_id', userId).eq('product_id', productId);
      } else {
        const { data: existing } = await supabaseClient.from('cart').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
        if (existing) {
          await supabaseClient.from('cart').update({ quantity: qty, updated_at: new Date() }).eq('id', existing.id);
        } else {
          await supabaseClient.from('cart').insert({ user_id: userId, product_id: productId, quantity: qty });
        }
      }
      await updateCartBadge();
    } catch (e) {
      console.error('setCartQty background sync failed', e);
      // Revert state
      if (prevQty <= 0) {
        delete window.cartQty[pid];
      } else {
        window.cartQty[pid] = prevQty;
      }
      updateProductCartUI(pid);
      tgUtil.alert('Не удалось изменить корзину: ' + e.message);
    }
  })();
}

// One-time global setup: delegated +/- handler + observer that decorates new cards.
function initCartSteppers() {
  if (!window._cartStepHandler) {
    window._cartStepHandler = (e) => {
      const stepBtn = e.target.closest && e.target.closest('.cart-step-btn');
      if (!stepBtn) return;
      e.preventDefault();
      e.stopPropagation();
      if (!window.userId && !userId) { window.requireAuth('Для изменения корзины необходимо войти.'); return; }
      const pid = stepBtn.dataset.productId;
      const action = stepBtn.dataset.action;
      let qty = window.cartQty[String(pid)] || 0;
      qty = action === 'inc' ? qty + 1 : qty - 1;
      setCartQty(pid, qty);
    };
    // Capture phase so a stepper tap never bubbles to the card's navigation handler.
    document.addEventListener('click', window._cartStepHandler, true);
  }
  if (!window._cartObserver) {
    const content = document.getElementById('content');
    if (content) {
      let pending = false;
      window._cartObserver = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; decorateCartButtons(content); });
      });
      window._cartObserver.observe(content, { childList: true, subtree: true });
    }
  }
}
initCartSteppers();

// Вспомогательная функция для кнопки Назад в подэкранах
function ensureBackButtonForSubscreen() {
  // Уже добавлена кнопка вручную в каждом рендере, но можно оставить пустой
}

// ==================== РЕНДЕР FAQ ====================
async function renderFAQ() {
  let faqsHtml = '';
  try {
    const { data, error } = await supabaseClient.from('faq_items').select('*').eq('is_published', true).order('category', { ascending: true }).order('order_index', { ascending: true });
    if (error) throw error;
    
    if (!data || data.length === 0) {
      faqsHtml = window.UI.empty({ icon: 'help', title: 'Вопросов пока нет', text: 'Скоро здесь появятся ответы на частые вопросы.' });
    } else {
      const grouped = data.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
      }, {});
      
      for (const [cat, items] of Object.entries(grouped)) {
        faqsHtml += `
          <div class="faq-cat-group fq-group">
            <h3 class="fq-cat">${_escHtml(cat)}</h3>
            <div class="fq-items">
              ${items.map(item => `
                <div class="faq-item fq-item" data-search="${_escHtml((item.question + ' ' + item.answer).toLowerCase())}">
                  <button type="button" class="faq-btn fq-q" data-id="${item.id}">
                    <span>${item.question}</span>
                    <span class="faq-icon fq-chev">${window.UI.icon('chevD', 18)}</span>
                  </button>
                  <div class="faq-content hidden fq-a">
                    ${item.answer.replace(/\n/g, '<br>')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    const U = window.UI;
    return `
      <div class="rd-screen page-enter fq">
        <div class="rd-head">
          <button id="backFromFaqBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Частые вопросы</h1><p class="rd-head-sub">Заказы, доставка, оплата и возвраты</p></div>
        </div>
        <div class="sp-field fq-search">
          ${U.icon('search', 20)}
          <input type="text" id="faqSearchInput" placeholder="Найти ответ" autocomplete="off">
        </div>
        <div id="faqNoResults" class="hidden">${U.empty({ icon: 'search', title: 'Ничего не нашлось', text: 'Попробуйте другие слова или напишите нам в поддержку.' })}</div>
        <div id="faqList">${faqsHtml}</div>
      </div>
    `;
  } catch (err) {
    return `<div class="rd-screen page-enter">${window.UI.empty({ icon: 'alert', title: 'Не удалось загрузить вопросы', text: 'Проверьте интернет и попробуйте ещё раз.', action: 'Повторить', onclick: 'renderCurrentScreen()' })}</div>`;
  }
}

function attachFAQHandlers() {
  const backBtn = document.getElementById('backFromFaqBtn');
  if (backBtn) backBtn.addEventListener('click', () => { currentSubScreen = null; renderCurrentScreen(); });

  const faqSearch = document.getElementById('faqSearchInput');
  if (faqSearch) faqSearch.oninput = () => {
    const q = faqSearch.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('#faqList .faq-item').forEach(item => {
      const match = !q || (item.dataset.search || '').includes(q);
      item.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    document.querySelectorAll('#faqList .faq-cat-group').forEach(group => {
      const hasVisible = [...group.querySelectorAll('.faq-item')].some(i => i.style.display !== 'none');
      group.style.display = hasVisible ? '' : 'none';
    });
    const noRes = document.getElementById('faqNoResults');
    if (noRes) noRes.classList.toggle('hidden', visible > 0);
  };

  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.onclick = () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      const open = content.classList.contains('hidden');
      content.classList.toggle('hidden', !open);
      btn.closest('.faq-item')?.classList.toggle('open', open);
      if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    };
  });
}

function _escHtml(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

// ==================== МОДАЛЬНОЕ ОКНО КОНТАКТОВ И РЕКВИЗИТОВ ====================
function showContactsModal() {
  const existing = document.getElementById('contactsModalOverlay');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'contactsModalOverlay';
  overlay.className = 'fixed inset-0 z-[150] flex items-end justify-center bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-300';

  const sheet = document.createElement('div');
  sheet.className = 'bg-[#0f172a]/95 border-t border-cyan-500/30 rounded-t-3xl w-full max-w-lg p-5 pb-8 space-y-4 transform translate-y-full transition-transform duration-300 shadow-2xl overflow-y-auto max-h-[85vh] text-left relative';

  sheet.innerHTML = `
    <!-- Индикатор свайпа -->
    <div class="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2 cursor-pointer" id="contactsDragHandle"></div>

    <!-- Заголовок -->
    <div class="flex items-start justify-between border-b border-white/10 pb-3">
      <div>
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span class="text-cyan-400">📞</span> Контакты и реквизиты
        </h3>
        <p class="text-xs text-white/60 mt-0.5">ICE LOGIX — официальный сервис доставки</p>
      </div>
      <button id="closeContactsModalBtn" class="text-white/60 hover:text-white p-1 rounded-lg bg-white/5 active:scale-95 transition" title="Закрыть">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Список информационных карточек -->
    <div class="space-y-3 pt-1">
      <!-- 1. Служба заботы -->
      <div class="glass-card p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border border-cyan-500/30">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="text-base">🎧</span>
            <span class="font-bold text-white text-sm">Служба заботы о клиентах</span>
          </div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Онлайн 10:00–21:00
          </span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed mb-3">
          Вопросы по заказам, трек-номерам, подбору размера, выкупу и оплате.
        </p>
        <button id="contactsTgSupportBtn" class="btn-primary w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.967z"/>
          </svg>
          Написать в @icelogix_support_bot
        </button>
      </div>

      <!-- 2. Юридические данные -->
      <div class="glass-card p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-base">⚖️</span>
          <span class="font-bold text-white text-sm">Юридические данные</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-white/60">Наименование:</span>
            <span class="text-white font-medium text-right">ИП Иванов И.И.</span>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-white/60">УНП:</span>
            <div class="flex items-center gap-2">
              <span class="font-mono text-cyan-300 font-bold">123456789</span>
              <button class="contacts-copy-btn text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded active:scale-95 transition" data-copy="123456789">
                Копировать
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between py-1 border-b border-white/5">
            <span class="text-white/60">Юр. адрес:</span>
            <span class="text-white/90 text-right">Беларусь, г. Несвиж / Минск</span>
          </div>
          <div class="flex items-center justify-between py-1">
            <span class="text-white/60">Email:</span>
            <div class="flex items-center gap-2">
              <span class="text-white/90">support@icelogix.by</span>
              <button class="contacts-copy-btn text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded active:scale-95 transition" data-copy="support@icelogix.by">
                Копировать
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Партнерство и B2B -->
      <div class="glass-card p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-base">🏢</span>
          <span class="font-bold text-white text-sm">Партнерство и B2B</span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed mb-2">
          Дропшиппинг, оптовые заказы, сотрудничество с брендами и блогерами.
        </p>
        <div class="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5 text-xs">
          <span class="text-white/80">partners@icelogix.by</span>
          <button class="contacts-copy-btn text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 px-2.5 py-1 rounded-lg active:scale-95 transition" data-copy="partners@icelogix.by">
            Скопировать Email
          </button>
        </div>
      </div>

      <!-- 4. Доставка и склады -->
      <div class="glass-card p-3.5 rounded-2xl bg-white/5 border border-white/10">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-base">📦</span>
          <span class="font-bold text-white text-sm">Логистика и пункты выдачи</span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">
          Доставка осуществляется через партнерские пункты <strong class="text-white">СДЭК</strong>, <strong class="text-white">Европочта</strong>, <strong class="text-white">Белпочта</strong> или курьером лично в руки по Беларуси и СНГ.
        </p>
      </div>
    </div>

    <!-- Кнопка закрытия -->
    <div class="pt-2">
      <button id="closeContactsModalActionBtn" class="btn-secondary w-full py-2.5 rounded-xl text-white/80 hover:text-white text-xs font-semibold border border-white/10 active:scale-95 transition">
        Закрыть
      </button>
    </div>
  `;

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Плавное открытие
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    sheet.classList.remove('translate-y-full');
  });

  const closeModal = () => {
    overlay.classList.add('opacity-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => {
      overlay.remove();
      if (window.tgUtil?.setBackButton) {
        window.tgUtil.setBackButton(null);
      }
    }, 300);
  };

  // Обработчики закрытия
  document.getElementById('closeContactsModalBtn')?.addEventListener('click', closeModal);
  document.getElementById('closeContactsModalActionBtn')?.addEventListener('click', closeModal);
  document.getElementById('contactsDragHandle')?.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Кнопка перехода в Telegram
  document.getElementById('contactsTgSupportBtn')?.addEventListener('click', () => {
    const tgUrl = 'https://t.me/icelogix_support_bot';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
    }
  });

  // Кнопки копирования
  sheet.querySelectorAll('.contacts-copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.copy;
      if (!text) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      if (window.tgUtil?.haptic) {
        window.tgUtil.haptic('light');
      }

      const origText = btn.innerHTML;
      btn.innerHTML = '✓ Скопировано';
      btn.classList.add('text-emerald-400');
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.classList.remove('text-emerald-400');
      }, 2000);
    });
  });

  // Telegram WebApp BackButton
  if (window.tgUtil?.setBackButton) {
    window.tgUtil.setBackButton(closeModal);
  }
}

// Global Exports
if (typeof renderAboutUs === 'function') window.renderAboutUs = renderAboutUs;
if (typeof attachAboutUsHandlers === 'function') window.attachAboutUsHandlers = attachAboutUsHandlers;
if (typeof addToCart === 'function') window.addToCart = addToCart;
if (typeof loadCartQty === 'function') window.loadCartQty = loadCartQty;
if (typeof cartAddBtnHTML === 'function') window.cartAddBtnHTML = cartAddBtnHTML;
if (typeof cartStepperHTML === 'function') window.cartStepperHTML = cartStepperHTML;
if (typeof _nodeFromHTML === 'function') window._nodeFromHTML = _nodeFromHTML;
if (typeof makeStepper === 'function') window.makeStepper = makeStepper;
if (typeof makeAddBtn === 'function') window.makeAddBtn = makeAddBtn;
if (typeof decorateCartButtons === 'function') window.decorateCartButtons = decorateCartButtons;
if (typeof updateProductCartUI === 'function') window.updateProductCartUI = updateProductCartUI;
if (typeof setCartQty === 'function') window.setCartQty = setCartQty;
if (typeof initCartSteppers === 'function') window.initCartSteppers = initCartSteppers;
if (typeof ensureBackButtonForSubscreen === 'function') window.ensureBackButtonForSubscreen = ensureBackButtonForSubscreen;
if (typeof renderFAQ === 'function') window.renderFAQ = renderFAQ;
if (typeof attachFAQHandlers === 'function') window.attachFAQHandlers = attachFAQHandlers;
if (typeof showContactsModal === 'function') window.showContactsModal = showContactsModal;
if (typeof _escHtml === 'function') window._escHtml = _escHtml;
