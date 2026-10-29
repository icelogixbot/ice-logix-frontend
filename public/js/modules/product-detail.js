// ============================================================
// ICE LOGIX · Страница товара
// Открывается из любой карточки товара (window.openProduct(id)).
// Рендерится как обычный экран внутри #content: шапка и нижнее меню остаются.
// ============================================================

let _pdCache = {};

window.openProduct = function (productId) {
  if (!productId) return;
  window._pdId = String(productId);
  window._pdFromTab = (typeof currentTab !== 'undefined' && currentTab !== 'product') ? currentTab : (window._pdFromTab || 'home');
  if (typeof switchTab === 'function') switchTab('product');
};

async function _pdLoad(id) {
  if (_pdCache[id]) return _pdCache[id];
  const sb = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
  if (!sb) return null;
  const { data } = await sb.from('products').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const p = (typeof preprocessProducts === 'function') ? preprocessProducts([data])[0] : data;
  _pdCache[id] = p;
  return p;
}

async function _pdSimilar(p) {
  const sb = (typeof supabaseClient !== 'undefined' && supabaseClient) ? supabaseClient : window.supabaseClient;
  if (!sb) return [];
  try {
    let q = sb.from('products').select('*').eq('is_active', true).neq('id', p.id).order('created_at', { ascending: false }).limit(8);
    if (p.category) q = q.eq('category', p.category);
    const { data } = await q;
    return (typeof preprocessProducts === 'function') ? preprocessProducts(data || []) : (data || []);
  } catch (_) { return []; }
}

async function renderProductDetail() {
  const U = window.UI;
  const id = window._pdId;
  const p = id ? await _pdLoad(id) : null;
  if (!p) {
    return `<div class="rd-screen page-enter">${U.screenHead({ title: 'Товар' })}${U.empty({ icon: 'box', title: 'Товар не найден', text: 'Возможно, его уже сняли с витрины. Посмотрите другие подборки на главной.', action: 'На главную', onclick: "window.switchTab('home')" })}</div>`;
  }

  const imgs = U.productImages(p);
  const pr = U.productPriceByn(p);
  const inWish = (typeof wishlist !== 'undefined' && wishlist && wishlist.has) ? wishlist.has(p.id) : false;
  const brand = (p.brand || '').trim();
  const encoded = encodeURIComponent(JSON.stringify(imgs));
  const desc = (p.description || '').trim();

  const gallery = imgs.length
    ? `<div class="pd-gallery" data-urls="${encoded}">${imgs.map((u, i) => `<div class="pd-slide" data-idx="${i}"><img src="${U.esc(u)}" alt="${U.esc(p.title || 'Фото товара')}" ${i ? 'loading="lazy"' : ''} decoding="async"></div>`).join('')}</div>
       ${imgs.length > 1 ? `<div class="pd-dots">${imgs.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><span class="pd-counter">1 / ${imgs.length}</span>` : ''}`
    : `<div class="pd-gallery pd-noimg">${U.icon('image', 48)}</div>`;

  const priceHtml = pr.amount
    ? `<div class="pd-price">${U.money(pr.amount, { cls: 'rd-price-big', prefix: pr.estimate ? '≈ ' : '' })}</div>
       <div class="pd-price-note">${pr.estimate ? 'Под ключ: выкуп, доставка до Минска и страховка' : 'Цена с доставкой по Беларуси уточняется при оформлении'}</div>`
    : `<div class="pd-price"><span class="rd-price-big">Цена по запросу</span></div><div class="pd-price-note">Напишите нам, и мы посчитаем стоимость</div>`;

  return `
    <div class="pd page-enter" data-product-id="${U.esc(p.id)}">
      <div class="pd-media">
        ${gallery}
        <button type="button" class="pd-round pd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="pd-actions">
          <button type="button" class="pd-round" id="pdShareBtn" aria-label="Поделиться">${U.icon('share', 20)}</button>
          <button type="button" class="pd-round wishlist-heart${inWish ? ' text-red-500' : ''}" data-product-id="${U.esc(p.id)}" aria-label="В избранное">${typeof getHeartIcon === 'function' ? getHeartIcon(inWish) : U.icon('heart', 20)}</button>
        </div>
      </div>

      <div class="pd-info">
        ${priceHtml}
        <h1 class="pd-title">${brand ? `<span class="pd-brand">${U.esc(brand)}</span>` : ''}${U.esc(p.title || 'Товар')}</h1>
        <div class="pd-chips">
          ${p.category ? `<span class="rd-status">${U.esc(p.category)}</span>` : ''}
          <span class="rd-status">${U.icon('plane', 14)}Из Китая</span>
          <span class="rd-status ok">${U.icon('shield', 14)}Проверим перед отправкой</span>
        </div>

        <div class="rd-card rd-list pd-facts">
          <div class="rd-row"><span class="rd-ico">${U.icon('truck', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Доставка в Беларусь</span><span class="rd-row-text">Привезём до Минска, дальше почтой или в пункт выдачи</span></span></div>
          <div class="rd-row"><span class="rd-ico">${U.icon('camera', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Фото со склада</span><span class="rd-row-text">Покажем вещь до отправки, чтобы вы были спокойны</span></span></div>
          <div class="rd-row"><span class="rd-ico">${U.icon('shield', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Страховка посылки</span><span class="rd-row-text">Если что-то случится в пути, вернём деньги</span></span></div>
        </div>

        ${desc ? `
        <div class="pd-block">
          <h2 class="pd-h2">Описание</h2>
          <p class="pd-desc" id="pdDesc">${U.esc(desc)}</p>
          ${desc.length > 220 ? '<button type="button" class="rd-link" id="pdDescMore">Читать полностью</button>' : ''}
        </div>` : ''}

        <div class="pd-block">
          <h2 class="pd-h2">Как это работает</h2>
          <ol class="pd-steps">
            <li><b>Оформляете заказ</b><span>Выбираете размер и цвет, платите часть стоимости</span></li>
            <li><b>Выкупаем и проверяем</b><span>Покупаем на площадке и присылаем фото со склада</span></li>
            <li><b>Привозим в Беларусь</b><span>Доплачиваете доставку и получаете посылку</span></li>
          </ol>
        </div>

        <div class="pd-block" id="pdSimilarBlock" hidden>
          <div class="rd-section" style="margin-top:0"><h2>Похожие товары</h2></div>
          <div class="pd-similar" id="pdSimilar"></div>
        </div>
      </div>

      <div class="rd-cta pd-cta">
        <button type="button" class="rd-btn rd-btn-tonal pd-cart-btn" id="pdAddCart">${U.icon('cart', 20)}В корзину</button>
        <button type="button" class="rd-btn pd-buy-btn" id="pdBuyNow">Купить</button>
      </div>
    </div>`;
}

function attachProductDetailHandlers() {
  const U = window.UI;
  const root = document.querySelector('.pd');
  if (!root) return;
  const id = root.dataset.productId;
  const p = _pdCache[id];

  // подсветка вкладки, с которой пришли
  try {
    const from = window._pdFromTab;
    if (from) document.querySelector(`.tab-item[data-tab="${from}"]`)?.classList.add('active');
  } catch (_) {}

  // полноэкранный просмотр фото
  const gal = root.querySelector('.pd-gallery');
  if (gal && gal.dataset.urls) {
    gal.addEventListener('click', (e) => {
      const slide = e.target.closest('.pd-slide');
      if (!slide) return;
      try { window.showImagePreview(JSON.parse(decodeURIComponent(gal.dataset.urls)), parseInt(slide.dataset.idx, 10) || 0); } catch (_) {}
    });
  }

  const more = document.getElementById('pdDescMore');
  if (more) more.onclick = () => { document.getElementById('pdDesc')?.classList.add('open'); more.remove(); };

  const share = document.getElementById('pdShareBtn');
  if (share) share.onclick = async () => {
    const title = p ? (p.title || 'Товар') : 'Товар';
    const link = 'https://t.me/icelogix_bot';
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.openTelegramLink) { tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Смотри, что нашёл в ICE LOGIX: ' + title)}`); return; }
      await navigator.clipboard.writeText(`${title} — ${link}`);
      U.toast('Ссылка скопирована');
    } catch (_) { U.toast('Не получилось поделиться', 'bad'); }
  };

  const add = document.getElementById('pdAddCart');
  if (add) add.onclick = async () => {
    if (!window.userId) { window.requireAuth('Войдите, чтобы добавлять товары в корзину.'); return; }
    add.classList.add('is-busy');
    try { await addToCart(id, 1, true); U.toast('Добавлено в корзину'); } catch (_) { U.toast('Не удалось добавить', 'bad'); }
    add.classList.remove('is-busy');
  };

  const buy = document.getElementById('pdBuyNow');
  if (buy) buy.onclick = async () => {
    if (!window.userId) { window.requireAuth('Войдите, чтобы оформить заказ.'); return; }
    const price = p ? parseFloat(p.price) : NaN;
    if (p && p.url && !isNaN(price) && window.iceLogixPricing) {
      window.tempOrder = { url: p.url, price, weight: 1, total: window.iceLogixPricing.quickEstimate(price, 1), discountAmount: 0, appliedPromo: null };
      switchTab('neworder');
      return;
    }
    try { await addToCart(id, 1, true); } catch (_) {}
    switchTab('cart');
  };

  // просмотр товара для рекомендаций
  try {
    if (window.userId && id) supabaseClient.from('user_views').upsert({ user_id: window.userId, product_id: id }, { onConflict: 'user_id,product_id' }).then(() => {});
  } catch (_) {}

  // похожие товары
  if (p) {
    _pdSimilar(p).then((list) => {
      const box = document.getElementById('pdSimilar');
      const block = document.getElementById('pdSimilarBlock');
      if (!box || !block || !list.length) return;
      const wl = (typeof wishlist !== 'undefined' && wishlist) ? wishlist : null;
      box.innerHTML = list.map((it) => U.productCard(it, wl && wl.has ? wl.has(it.id) : false)).join('');
      block.hidden = false;
      box.querySelectorAll('.addToCartBtn').forEach((b) => {
        b.onclick = async (e) => {
          e.stopPropagation();
          if (!window.userId) { window.requireAuth('Войдите, чтобы добавлять товары в корзину.'); return; }
          await addToCart(b.dataset.productId, 1, true);
          U.toast('Добавлено в корзину');
        };
      });
    });
  }
}

window.renderProductDetail = renderProductDetail;
window.attachProductDetailHandlers = attachProductDetailHandlers;
