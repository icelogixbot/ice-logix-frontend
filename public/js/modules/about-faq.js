// ============================================================
// ICE LOGIX Module: About & FAQ
// ============================================================
// ==================== О НАС (ABOUT US) ====================
async function renderAboutUs() {
  return `
  <button id="backFromAboutBtn" class="global-back-btn mb-4">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
    Назад
  </button>
  
  <div class="space-y-4 page-enter pb-10">
    <div class="glass-card text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none"></div>
      <img src="./assets/logo.png" class="h-20 mx-auto mb-4 drop-shadow-2xl relative z-10" alt="ICE LOGIX">
      <h2 class="text-2xl font-black text-white mb-2 relative z-10">ICE LOGIX</h2>
      <p class="text-cyan-300 font-bold mb-4 relative z-10">Твой проводник в мир глобального шоппинга</p>
      
      <div class="flex flex-wrap justify-center gap-2 relative z-10">
        <span class="status-badge bg-white/10 border-white/20 text-white">📍 Беларусь, г. Несвиж</span>
        <span class="status-badge bg-white/10 border-white/20 text-white">📦 Выкуп и Доставка</span>
        <span class="status-badge bg-cyan-500/20 border-cyan-500/50 text-cyan-300">🧊 1 ICE = 1 BYN</span>
      </div>
    </div>

    <div class="glass-card">
      <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span class="text-xl">🤝</span> Наши условия и комиссии
      </h3>
      <div class="space-y-4">
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <h4 class="font-bold text-white mb-1">Комиссия сервиса — 20%</h4>
          <p class="text-sm text-white/70 leading-relaxed">
            Мы берем фиксированную комиссию 20% за выкуп, консолидацию и организацию логистики. С этой комиссии мы официально платим налоги в РБ. Никаких скрытых платежей!
          </p>
        </div>
        
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <h4 class="font-bold text-white mb-1">Логистика из Китая — 10$ / кг</h4>
          <p class="text-sm text-white/70 leading-relaxed">
            Наш официальный партнер — <strong class="text-cyan-400">ShopbyShop</strong>. Доставка из Китая имеет фиксированный тариф 10$ за килограмм (оплата по фактическому или объемному весу). Сроки: 10-15 дней.
          </p>
        </div>
        
        <div class="p-3 bg-white/5 rounded-xl border border-white/10">
          <h4 class="font-bold text-white mb-1">Другие страны</h4>
          <p class="text-sm text-white/70 leading-relaxed">
            На данный момент мы стабильно возим из <strong>Китая (Poizon, Taobao)</strong>, <strong>Европы (Zalando)</strong> и <strong>России (Lamoda)</strong>. 
            <br><br>
            В будущем мы откроем прямую доставку из США, Японии, Южной Кореи, ОАЭ и Турции.
          </p>
        </div>
      </div>
    </div>
    
    <div class="glass-card bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
      <h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span class="text-xl">📜</span> Юридическая прозрачность
      </h3>
      <p class="text-sm text-white/80 leading-relaxed mb-4">
        Мы работаем официально. При регистрации вы принимаете условия публичной оферты. Бот автоматически генерирует счета и инвойсы, чтобы гарантировать безопасность ваших средств и посылок.
      </p>
      <button class="btn-primary w-full" onclick="tgUtil.alert('Тут будет PDF файл публичной оферты')">Читать договор (Оферта)</button>
    </div>
    
    <p class="text-center text-xs text-white/40 mt-6">
      ICE LOGIX © 2026<br>Создано с 🧊 в Беларуси
    </p>
  </div>
  `;
}

function attachAboutUsHandlers() {
  document.getElementById('backFromAboutBtn').onclick = () => {
    currentSubScreen = null;
    renderCurrentScreen();
  };
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
      faqsHtml = '<p class="text-white/50 text-center py-4">База знаний пока пуста. (Заполните таблицу faq_items)</p>';
    } else {
      const grouped = data.reduce((acc, item) => {
        acc[item.category] = acc[item.category] || [];
        acc[item.category].push(item);
        return acc;
      }, {});
      
      for (const [cat, items] of Object.entries(grouped)) {
        faqsHtml += `
          <div class="faq-cat-group mb-6">
            <h3 class="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <span class="ix text-cyan-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> ${cat}
            </h3>
            <div class="space-y-2">
              ${items.map(item => `
                <div class="faq-item bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all" data-search="${_escHtml((item.question + ' ' + item.answer).toLowerCase())}">
                  <button class="faq-btn w-full p-4 flex justify-between items-center text-left hover:bg-white/5 transition" data-id="${item.id}">
                    <span class="text-white font-medium text-sm pr-4">${item.question}</span>
                    <span class="faq-icon ix transition-transform text-white/50"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </button>
                  <div class="faq-content hidden px-4 pb-4 text-white/70 text-xs leading-relaxed border-t border-white/5 pt-3">
                    ${item.answer.replace(/\n/g, '<br>')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    return `
      <button id="backFromFaqBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
      <div class="glass-card page-enter">
        <h2 class="text-xl font-bold mb-4 text-white">Частые вопросы (FAQ)</h2>
        <p class="text-white/50 text-xs mb-4">Здесь собраны ответы на самые популярные вопросы по заказам, доставке и финансам.</p>
        <div class="relative mb-6">
          <span class="ix absolute left-3 top-1/2 -translate-y-1/2 text-white/40"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input type="text" id="faqSearchInput" class="w-full bg-white/5 border border-white/15 rounded-xl py-2.5 pl-9 pr-3 text-white text-sm focus:border-cyan-400/50 focus:outline-none transition" placeholder="Поиск по вопросам и ответам...">
        </div>
        <p id="faqNoResults" class="hidden text-white/50 text-center py-4">Ничего не найдено.</p>
        <div id="faqList">${faqsHtml}</div>
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    return `<p class="text-red-400">Ошибка загрузки FAQ: ${err.message}</p>`;
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
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
      } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
      }
    };
  });
}

function _escHtml(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}


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
if (typeof _escHtml === 'function') window._escHtml = _escHtml;
