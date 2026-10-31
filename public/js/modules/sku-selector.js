// ============================================================
// ICE LOGIX: окно выбора варианта товара Pinduoduo (цвет, размер, количество)
// Данные приходят из движка Pinduoduo (tools/pdd_engine, product.to_legacy_bundle):
// галерея, вердикт «оригинал / реплика», продажи, магазин, характеристики, отзывы,
// таблица размеров и price_matrix (ключ «сырой_цвет|сырой_размер»).
// Вызов: window.openSkuSelectorModal(productData, onConfirm); закрыть: window.closeSkuModal().
// ============================================================

(function () {
  'use strict';

  let _activeSheet = null;

  function closeSkuModal() {
    if (!_activeSheet) return;
    const s = _activeSheet;
    _activeSheet = null;
    s.close();
  }

  window.closeSkuModal = closeSkuModal;

  const VERDICT = {
    original: { text: 'Оригинал', tone: 'ok' },
    likely_original: { text: 'Похоже на оригинал', tone: 'ok' },
    replica: { text: 'Реплика', tone: 'warn' },
    no_brand: { text: 'Без бренда', tone: '' },
    unknown: { text: 'Подлинность не определили', tone: '' },
  };
  const HAS_CJK = /[一-鿿]/;

  const haptic = (kind) => {
    if (window.tgUtil && typeof window.tgUtil.haptic === 'function') window.tgUtil.haptic(kind);
  };

  function formatStandardSize(val) {
    if (!val) return '';
    let str = String(val).trim();

    // Убираем рекламные хвосты вида （关注优先发货）
    str = str.replace(/[\(（].*?优先发货[\)）]|关注优先发货|优先发货/g, '').trim();
    str = str.replace(/[\(（].*?发货[\)）]/g, '').trim();

    // Вес в цзинях → кг: «M 建议90-110斤» → «M (45–55 кг)»
    let weightPart = '';
    const rangeMatch = str.match(/(?:建议)?\s*(\d+)\s*[-–—~至]\s*(\d+)\s*(?:斤)?/);
    if (rangeMatch) {
      const v1 = parseInt(rangeMatch[1], 10);
      const v2 = parseInt(rangeMatch[2], 10);
      if (v1 >= 60 && v1 <= 240 && v2 >= 60 && v2 <= 260) {
        weightPart = ` (${Math.round(v1 * 0.5)}–${Math.round(v2 * 0.5)} кг)`;
        str = str.replace(/\(?(?:建议)?\s*\d+\s*[-–—~至]\s*\d+\s*(?:斤)?\)?/g, '').trim();
      }
    } else {
      const singleMatch = str.match(/(?:建议)?\s*(\d+)\s*斤/);
      if (singleMatch) {
        weightPart = ` (${Math.round(parseInt(singleMatch[1], 10) * 0.5)} кг)`;
        str = str.replace(/\(?(?:建议)?\s*\d+\s*斤\)?/g, '').trim();
      }
    }

    str = str.replace(/亚洲尺码|欧码|美码|尺码|标准码|正码|建议|码/g, '').trim();

    if (/^(均码|free|onesize|one\s*size)$/i.test(str)) return `Универсальный${weightPart}`;

    const low = str.toLowerCase();
    const numXl = low.match(/^(\d+)\s*x+l$/);
    if (numXl) {
      str = `${numXl[1]}XL`;
    } else if (/^x+l$/.test(low)) {
      const xCount = (low.match(/x/g) || []).length;
      str = xCount === 1 ? 'XL' : `${xCount}XL`;
    } else if (/^x+s$/.test(low)) {
      const xCount = (low.match(/x/g) || []).length;
      str = xCount === 1 ? 'XS' : `${xCount}XS`;
    } else if (/^[sml]$/.test(low)) {
      str = low.toUpperCase();
    } else {
      str = str.replace(/\b([xX]{2,})[lL]\b/g, (_, xs) => `${xs.length}XL`);
      str = str.replace(/\b([xX])[lL]\b/g, 'XL');
      str = str.replace(/\b(\d+)\s*[xX]+[lL]\b/g, (_, n) => `${n}XL`);
      str = str.replace(/\b([xX]{2,})[sS]\b/g, (_, xs) => `${xs.length}XS`);
      str = str.replace(/\b([xX])[sS]\b/g, 'XS');
      str = str.replace(/\b([sml])\b/gi, (m) => m.toUpperCase());
    }

    return `${str}${weightPart}`.trim() || val;
  }

  // Курс юаня к рублю из движка цен (тот же, что в калькуляторе), запасной 0,45
  function cnyRate() {
    try {
      const r = window.iceLogixPricing && window.iceLogixPricing.rates && window.iceLogixPricing.rates.CNY_to_BYN;
      if (r) return r;
    } catch (_) { /* движок цен ещё не загрузился */ }
    return 0.45;
  }

  window.openSkuSelectorModal = function (productData, onConfirm) {
    const U = window.UI;
    const esc = (s) => (U && U.esc ? U.esc(s == null ? '' : String(s)) : String(s == null ? '' : s));
    const icon = (n, s) => (U && U.icon ? U.icon(n, s) : '');
    const money = (byn) => (U && U.money ? U.money(byn, { keepCents: true, digits: 2 })
      : (typeof window.formatBYN === 'function' ? window.formatBYN(byn) : String(byn)));
    const cnyText = (v) => `¥${Math.round((Number(v) || 0) * 100) / 100}`;

    haptic('medium');
    closeSkuModal();

    // 1. Группы вариантов: новый формат spec_groups или старые colors/sizes
    let rawGroups = [];
    if (productData.spec_groups && productData.spec_groups.length > 0) {
      rawGroups = productData.spec_groups;
    } else {
      if ((productData.visual_options && productData.visual_options.length > 0) || (productData.colors && productData.colors.length > 0)) {
        rawGroups.push({ id: 'group_color', title: 'Цвет', type: 'visual', options: productData.visual_options || productData.colors });
      }
      if ((productData.spec_options && productData.spec_options.length > 0) || (productData.sizes && productData.sizes.length > 0)) {
        rawGroups.push({ id: 'group_size', title: 'Размер', type: 'spec', options: productData.spec_options || productData.sizes });
      }
    }
    const groups = rawGroups
      .filter((g) => g && g.options && g.options.length > 0)
      .map((g, i) => ({ ...g, id: g.id || `group_${i}` }))
      .sort((a, b) => (a.type === 'visual' ? 0 : 1) - (b.type === 'visual' ? 0 : 1));

    const visualGroup = groups.find((g) => g.type === 'visual') || null;
    const sizeGroup = groups.find((g) => g.type === 'spec') || null;
    const isSizeGroup = (g) => g.title === 'Размер' || String(g.id).includes('size');
    const rawOf = (o) => (o ? (o.raw_name || o.name || '') : '');
    const optLabel = (g, o) => {
      const name = o.name_ru || o.name || o.raw_name || '';
      // Движок уже переводит цзини в кг («S (30–45 кг)»): второй раз не пересчитываем
      return isSizeGroup(g) && !/кг/.test(name) ? formatStandardSize(name) : name;
    };

    // 2. Цена и наличие из price_matrix: «цвет|размер», при одной группе — просто имя варианта
    const matrix = productData.price_matrix || {};
    const hasMatrix = Object.keys(matrix).length > 0;
    function cellFor(visOpt, sizeOpt) {
      if (!hasMatrix) return null;
      if (visualGroup && sizeGroup) return matrix[`${rawOf(visOpt)}|${rawOf(sizeOpt)}`] || null;
      return matrix[rawOf(visOpt || sizeOpt)] || null;
    }
    const optAvailable = (g, o) => {
      if (o.disabled) return false;
      if (!hasMatrix) return true;
      if (visualGroup && sizeGroup && g === sizeGroup) {
        const cell = cellFor(selectedState[visualGroup.id], o);
        return !cell || cell.in_stock !== false;
      }
      if (!(visualGroup && sizeGroup)) {
        const cell = matrix[rawOf(o)];
        return !cell || cell.in_stock !== false;
      }
      return true;
    };

    const selectedState = {};
    groups.forEach((grp) => {
      const opts = grp.options || [];
      selectedState[grp.id] = opts.find((o) => o.selected && !o.disabled) || opts.find((o) => !o.disabled) || opts[0] || null;
    });
    if (sizeGroup && !optAvailable(sizeGroup, selectedState[sizeGroup.id])) {
      selectedState[sizeGroup.id] = sizeGroup.options.find((o) => optAvailable(sizeGroup, o)) || selectedState[sizeGroup.id];
    }

    const basePriceCny = Number(productData.price_cny) || 0;
    let currentPriceCny = basePriceCny;
    let currentEstimated = false;
    let currentInStock = true;
    const masterImg = productData.image_url || '';
    let currentImgUrl = (visualGroup && selectedState[visualGroup.id] && selectedState[visualGroup.id].image_url) || masterImg;

    function recomputePrice() {
      const vis = visualGroup ? selectedState[visualGroup.id] : null;
      const size = sizeGroup ? selectedState[sizeGroup.id] : null;
      const cell = cellFor(vis, size);
      currentEstimated = false;
      currentInStock = true;
      if (cell) {
        if (cell.in_stock === false) currentInStock = false;
        if (cell.price_cny > 0) currentPriceCny = cell.price_cny;
        currentEstimated = !!cell.estimated;
        return;
      }
      const priced = [size, vis].find((o) => o && Number(o.price_cny) > 0);
      currentPriceCny = priced ? Number(priced.price_cny) : basePriceCny;
    }
    recomputePrice();

    function getCombinedSummary() {
      const parts = [];
      if (visualGroup && selectedState[visualGroup.id]) parts.push(optLabel(visualGroup, selectedState[visualGroup.id]));
      groups.filter((g) => g.type === 'spec').forEach((g) => {
        const s = selectedState[g.id];
        if (!s) return;
        const name = optLabel(g, s);
        parts.push(isSizeGroup(g) || /^(размер|память)/i.test(name) ? name : `${g.title}: ${name}`);
      });
      return parts.join(' · ') || 'Стандарт';
    }

    // 3. Разметка
    const gallery = (productData.gallery && productData.gallery.length ? productData.gallery : [masterImg]).filter(Boolean);
    const v = VERDICT[productData.verdict] || null;
    const reason = productData.verdict_reason || productData.reason || '';
    const tags = (productData.tags || []).filter((t) => t && !HAS_CJK.test(t)).slice(0, 3);
    const facts = [productData.sales_text, productData.rating].filter(Boolean);

    const shop = productData.shop || {};
    const shopName = shop.name || productData.shop_name || '';
    const shopFacts = [shop.age, shop.sales ? `${shop.sales} в магазине` : '', shop.fans].filter(Boolean);

    const specs = (productData.specs || []).map((s) => {
      const ru = s.ru || '';
      const cut = ru.indexOf(':');
      if (ru && cut > 0 && !HAS_CJK.test(ru)) return { k: ru.slice(0, cut).trim(), v: ru.slice(cut + 1).trim() };
      return { k: s.k, v: s.v };
    }).filter((s) => s.k && s.v && !HAS_CJK.test(s.k + s.v)); // без перевода строку не показываем
    const reviewTags = (productData.review_tags || []).filter((t) => t && !HAS_CJK.test(t)).slice(0, 8);
    const reviews = (productData.reviews || []).map((r) => (typeof r === 'string' ? r : r.text)).filter((t) => t && !HAS_CJK.test(t)).slice(0, 4);
    const chart = productData.size_chart && productData.size_chart.rows && productData.size_chart.rows.length ? productData.size_chart : null;

    const optionHtml = (grp, opt, optIdx) => {
      const isSel = selectedState[grp.id] === opt;
      const avail = optAvailable(grp, opt);
      const label = optLabel(grp, opt);
      const thumb = grp.type === 'visual' ? (opt.thumb_url || opt.image_url) : '';
      return `
        <button type="button" class="sk-opt${grp.type === 'visual' ? ' sk-opt-vis' : ''}${isSel ? ' on' : ''}${avail ? '' : ' off'}"
          data-group-id="${esc(grp.id)}" data-opt-idx="${optIdx}" ${avail ? '' : 'aria-disabled="true"'}>
          ${grp.type === 'visual' ? (thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<span class="sk-opt-noimg">${icon('image', 18)}</span>`) : ''}
          <span class="sk-opt-body"><span class="sk-opt-name">${esc(label)}</span><span class="sk-opt-price"></span></span>
        </button>`;
    };

    const groupsHtml = groups.map((grp) => `
      <div class="sk-group">
        <div class="sk-group-head">
          <span class="sk-group-title">${esc(grp.title)}</span>
          <span class="sk-group-sel" id="skuSelectedLabel_${esc(grp.id)}">${selectedState[grp.id] ? esc(optLabel(grp, selectedState[grp.id])) : 'Не выбран'}</span>
        </div>
        <div class="sk-opts${grp.type === 'visual' ? ' sk-opts-vis' : ''}">
          ${(grp.options || []).map((o, i) => optionHtml(grp, o, i)).join('')}
        </div>
      </div>`).join('');

    const chartHtml = chart ? `
      <details class="rd-card sk-more">
        <summary>${icon('sliders', 18)}<span>Таблица размеров, ${esc(chart.unit || 'см')}</span>${icon('chevD', 18)}</summary>
        <div class="sk-table-wrap"><table class="sk-table">
          <thead><tr><th>Размер</th>${chart.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
          <tbody>${chart.rows.map((r) => `<tr><td>${esc(r.size)}</td>${(r.values || []).map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
      </details>` : '';

    const html = `
      <div class="sk">
        <div class="sk-gallery" id="skGallery">
          ${gallery.map((src, i) => `<div class="sk-slide"><img src="${esc(src)}" alt="" ${i ? 'loading="lazy"' : ''}></div>`).join('')}
        </div>
        ${gallery.length ? `<div class="sk-count">${gallery.length > 1 ? `${gallery.length} фото. Нажмите, чтобы рассмотреть` : 'Нажмите на фото, чтобы рассмотреть'}</div>` : ''}

        <div class="sk-title">${esc(productData.title_ru || productData.title || 'Товар с Pinduoduo')}</div>
        <div class="sk-price">
          <span class="rd-price-big" id="skuModalPrice">${cnyText(currentPriceCny)}</span>
          <span class="sk-price-sub" id="skuModalPriceRu">≈ ${money(currentPriceCny * cnyRate())} на площадке</span>
        </div>
        <p class="sk-note" id="skuPriceNote" ${currentEstimated || !currentInStock ? '' : 'hidden'}>${!currentInStock ? 'Этого варианта нет в наличии' : 'Цена этого варианта примерная, уточним при выкупе'}</p>

        ${v || tags.length ? `<div class="sk-badges">${v ? `<span class="rd-status ${v.tone}">${icon('shield', 14)}${v.text}</span>` : ''}${tags.map((t) => `<span class="rd-status">${esc(t)}</span>`).join('')}</div>` : ''}
        ${reason ? `<p class="sk-reason">${esc(reason)}</p>` : ''}
        ${facts.length ? `<div class="sk-facts">${facts.map(esc).join(' · ')}</div>` : ''}

        ${groupsHtml}
        ${chartHtml}

        <div class="rd-card sk-qty">
          <div class="sk-qty-body"><span class="sk-qty-title">Количество</span><span class="sk-qty-sub" id="skuSummaryPill">${esc(getCombinedSummary())}</span></div>
          <div class="sk-stepper">
            <button type="button" id="skuQtyMinus" aria-label="Меньше">${icon('minus', 18)}</button>
            <span id="skuQtyVal">1</span>
            <button type="button" id="skuQtyPlus" aria-label="Больше">${icon('plus', 18)}</button>
          </div>
        </div>
        <div class="sk-alert" id="skuCustomsAlert" hidden></div>
        <button type="button" id="skuAddVariantBtn" class="rd-btn rd-btn-ghost rd-btn-block sk-add">${icon('plus', 18)}Добавить ещё вариант</button>

        <div id="skuBundleSection" class="sk-bundle" hidden>
          <div class="rd-section"><h2>В заказе <span id="skuBundleCount">0</span> шт.</h2><button type="button" class="rd-link" id="skuClearBundleBtn">Очистить</button></div>
          <div id="skuBundleList" class="rd-card rd-list"></div>
        </div>

        ${shopName ? `
          <div class="rd-card rd-list sk-block">
            <div class="rd-row"><span class="rd-ico">${icon('bag', 22)}</span>
              <span class="rd-row-body"><span class="rd-row-title">${esc(shopName)}</span><span class="rd-row-text">${esc(shopFacts.length ? shopFacts.join(' · ') : 'Магазин на Pinduoduo')}</span></span>
            </div>
          </div>` : ''}

        ${specs.length ? `
          <div class="sk-h">Характеристики</div>
          <div class="rd-card sk-specs">${specs.map((s) => `<div class="sk-spec"><span>${esc(s.k)}</span><b>${esc(s.v)}</b></div>`).join('')}</div>` : ''}

        ${reviewTags.length || reviews.length ? `
          <div class="sk-h">Что пишут покупатели</div>
          ${reviewTags.length ? `<div class="sk-badges">${reviewTags.map((t) => `<span class="rd-status">${esc(t)}</span>`).join('')}</div>` : ''}
          ${reviews.map((t) => `<div class="rd-card sk-review">${esc(t)}</div>`).join('')}
          <p class="sk-reason">Отзывы переведены автоматически с китайского.</p>` : ''}

        <div class="sk-foot">
          <button type="button" id="skuApplyBtn" class="rd-btn rd-btn-block"></button>
        </div>
      </div>`;

    const sh = U.sheet({ title: 'Выберите вариант', html, onClose: () => { if (_activeSheet === sh) _activeSheet = null; } });
    _activeSheet = sh;
    const root = sh.el;
    const $ = (sel) => root.querySelector(sel);

    // 4. Логика
    let currentQty = 1;
    const bundleItems = []; // { id, key, color, size, quantity, price, image_url, summary }

    function updatePriceDisplay() {
      const pEl = $('#skuModalPrice');
      const prEl = $('#skuModalPriceRu');
      const note = $('#skuPriceNote');
      if (pEl) pEl.textContent = cnyText(currentPriceCny);
      if (prEl) prEl.innerHTML = `≈ ${money(currentPriceCny * cnyRate())} на площадке`;
      if (note) {
        note.hidden = currentInStock && !currentEstimated;
        note.textContent = !currentInStock ? 'Этого варианта нет в наличии' : 'Цена этого варианта примерная, уточним при выкупе';
        note.classList.toggle('bad', !currentInStock);
      }
      updateFooterButton();
    }

    function updateSummaryDisplay() {
      const pill = $('#skuSummaryPill');
      if (pill) pill.textContent = getCombinedSummary();
      updateFooterButton();
    }

    function updateFooterButton() {
      const btn = $('#skuApplyBtn');
      if (!btn) return;
      if (bundleItems.length === 0) {
        const total = Math.round(currentPriceCny * currentQty * 100) / 100;
        btn.textContent = currentInStock ? `Выбрать · ${currentQty} шт. · ${cnyText(total)}` : 'Выберите вариант в наличии';
        btn.disabled = !currentInStock;
      } else {
        const totalQty = bundleItems.reduce((a, it) => a + it.quantity, 0);
        const total = Math.round(bundleItems.reduce((a, it) => a + it.price * it.quantity, 0) * 100) / 100;
        btn.textContent = `Подтвердить · ${totalQty} шт. · ${cnyText(total)}`;
        btn.disabled = false;
      }
    }

    const MAX_CUSTOMS_SINGLE_VARIANT = 2; // не больше 2 шт. одного цвета и размера для физлиц
    const MAX_CUSTOMS_TOTAL_PRODUCT = 3; // не больше 3 шт. одного товара в посылке

    const sellerLimit = parseInt(productData.seller_limit_qty || 0, 10);
    const getEffectiveVariantLimit = () => (sellerLimit > 0 && sellerLimit < MAX_CUSTOMS_SINGLE_VARIANT ? sellerLimit : MAX_CUSTOMS_SINGLE_VARIANT);

    function showCustomsWarning(msg) {
      const el = $('#skuCustomsAlert');
      if (!el) return;
      el.innerHTML = `${icon('alert', 18)}<span>${esc(msg)}</span>`;
      el.hidden = false;
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.hidden = true; }, 4500);
    }

    function refreshAvailability() {
      if (!sizeGroup) return;
      root.querySelectorAll(`.sk-opt[data-group-id="${CSS.escape(sizeGroup.id)}"]`).forEach((b) => {
        const opt = sizeGroup.options[parseInt(b.dataset.optIdx, 10)];
        const avail = optAvailable(sizeGroup, opt);
        b.classList.toggle('off', !avail);
        if (avail) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true');
      });
    }

    // Цена на чипе: при двух группах — вместе с выбранным вариантом другой группы
    const cellPrice = (cell) => (cell && cell.in_stock !== false && Number(cell.price_cny) > 0 ? Number(cell.price_cny) : 0);
    function optPrice(g, o) {
      if (!hasMatrix) return { price: 0, estimated: false };
      let cell;
      if (visualGroup && sizeGroup && g === visualGroup) {
        cell = cellFor(o, selectedState[sizeGroup.id]);
        if (!cellPrice(cell)) { // выбранного размера в этом цвете нет: самая низкая цена цвета
          const row = sizeGroup.options.map((s) => cellFor(o, s)).filter(cellPrice);
          cell = row.sort((x, y) => cellPrice(x) - cellPrice(y))[0];
        }
      } else if (visualGroup && sizeGroup) {
        cell = g === sizeGroup ? cellFor(selectedState[visualGroup.id], o) : null;
      } else {
        cell = matrix[rawOf(o)];
      }
      return { price: cellPrice(cell), estimated: !!(cell && cell.estimated) };
    }

    function refreshOptPrices() {
      groups.forEach((g) => {
        const vals = (g.options || []).map((o) => optPrice(g, o));
        const differ = new Set(vals.map((x) => x.price).filter(Boolean)).size > 1; // одинаковые цены не показываем
        root.querySelectorAll(`.sk-opt[data-group-id="${CSS.escape(g.id)}"] .sk-opt-price`).forEach((el) => {
          const val = vals[parseInt(el.closest('.sk-opt').dataset.optIdx, 10)];
          el.textContent = differ && val && val.price ? `${val.estimated ? '≈ ' : ''}${cnyText(val.price)}` : '';
        });
      });
    }
    refreshOptPrices();

    // Галерея — фото объявления в их порядке, первой идёт обложка. Выбранный цвет её не подменяет:
    // фото цвета уже среди них — листаем к нему, иначе показываем отдельным слайдом в начале
    function showColorPhoto(url) {
      const gal = $('#skGallery');
      if (!gal || !url) return;
      let temp = gal.querySelector('.sk-slide-color');
      const found = Array.from(gal.querySelectorAll('.sk-slide:not(.sk-slide-color) img')).find((im) => im.getAttribute('src') === url);
      if (found) {
        if (temp) temp.remove();
        gal.scrollTo({ left: found.parentElement.offsetLeft - gal.offsetLeft - 16, behavior: 'smooth' });
        return;
      }
      if (!temp) {
        temp = document.createElement('div');
        temp.className = 'sk-slide sk-slide-color';
        temp.innerHTML = '<img alt="">';
        gal.prepend(temp);
      }
      temp.querySelector('img').src = url;
      gal.scrollTo({ left: 0, behavior: 'smooth' });
    }

    $('#skGallery').addEventListener('click', (e) => {
      const im = e.target.closest('.sk-slide img');
      if (!im || !window.PhotoViewer) return;
      const all = Array.from($('#skGallery').querySelectorAll('.sk-slide img'));
      window.PhotoViewer.open(all.map((x) => x.getAttribute('src')), all.indexOf(im));
    });

    const qtyValEl = $('#skuQtyVal');
    $('#skuQtyMinus').onclick = () => {
      if (currentQty <= 1) return;
      currentQty--;
      qtyValEl.textContent = currentQty;
      haptic('light');
      updateFooterButton();
    };
    $('#skuQtyPlus').onclick = () => {
      const lim = getEffectiveVariantLimit();
      if (currentQty >= lim) {
        haptic('error');
        showCustomsWarning(sellerLimit > 0 && sellerLimit < MAX_CUSTOMS_SINGLE_VARIANT
          ? `Продавец продаёт не больше ${sellerLimit} шт. в одни руки`
          : `Не больше ${lim} шт. одного варианта: иначе таможня примет посылку за коммерческую партию`);
        return;
      }
      currentQty++;
      qtyValEl.textContent = currentQty;
      haptic('light');
      updateFooterButton();
    };

    function renderBundleList() {
      const section = $('#skuBundleSection');
      const listEl = $('#skuBundleList');
      const countEl = $('#skuBundleCount');
      if (!section || !listEl) return;
      if (bundleItems.length === 0) {
        section.hidden = true;
        listEl.innerHTML = '';
        updateFooterButton();
        return;
      }
      section.hidden = false;
      countEl.textContent = bundleItems.reduce((a, it) => a + it.quantity, 0);
      listEl.innerHTML = bundleItems.map((it) => `
        <div class="rd-row sk-bundle-row">
          ${it.image_url ? `<img class="sk-bundle-img" src="${esc(it.image_url)}" alt="">` : `<span class="rd-ico">${icon('image', 20)}</span>`}
          <span class="rd-row-body"><span class="rd-row-title">${esc(it.summary)}</span><span class="rd-row-text">${cnyText(it.price)} × ${it.quantity}</span></span>
          <div class="sk-stepper sk-stepper-sm">
            <button type="button" class="bundle-minus" data-id="${it.id}" aria-label="Меньше">${icon('minus', 16)}</button>
            <span>${it.quantity}</span>
            <button type="button" class="bundle-plus" data-id="${it.id}" aria-label="Больше">${icon('plus', 16)}</button>
          </div>
          <button type="button" class="sk-del bundle-del" data-id="${it.id}" aria-label="Убрать">${icon('trash', 18)}</button>
        </div>`).join('');

      listEl.querySelectorAll('.bundle-minus').forEach((b) => {
        b.onclick = () => {
          const found = bundleItems.find((it) => it.id === b.dataset.id);
          if (!found) return;
          if (found.quantity > 1) found.quantity--;
          else bundleItems.splice(bundleItems.indexOf(found), 1);
          haptic('light');
          renderBundleList();
        };
      });
      listEl.querySelectorAll('.bundle-plus').forEach((b) => {
        b.onclick = () => {
          const found = bundleItems.find((it) => it.id === b.dataset.id);
          if (!found) return;
          const lim = getEffectiveVariantLimit();
          const totalQty = bundleItems.reduce((a, it) => a + it.quantity, 0);
          if (found.quantity >= lim) {
            haptic('error');
            showCustomsWarning(`Не больше ${lim} шт. одного варианта для физлиц`);
            return;
          }
          if (totalQty >= MAX_CUSTOMS_TOTAL_PRODUCT) {
            haptic('error');
            showCustomsWarning(`В одной посылке не больше ${MAX_CUSTOMS_TOTAL_PRODUCT} шт. одного товара: иначе это коммерческая партия`);
            return;
          }
          found.quantity++;
          haptic('light');
          renderBundleList();
        };
      });
      listEl.querySelectorAll('.bundle-del').forEach((b) => {
        b.onclick = () => {
          const idx = bundleItems.findIndex((it) => it.id === b.dataset.id);
          if (idx === -1) return;
          bundleItems.splice(idx, 1);
          haptic('medium');
          renderBundleList();
        };
      });
      updateFooterButton();
    }

    function selectionNames() {
      const colorOpt = visualGroup ? selectedState[visualGroup.id] : null;
      const colorName = colorOpt ? optLabel(visualGroup, colorOpt) : '';
      const sizeName = groups.filter((g) => g.type === 'spec').map((g) => (selectedState[g.id] ? optLabel(g, selectedState[g.id]) : '')).filter(Boolean).join(', ');
      return { colorName, sizeName };
    }

    $('#skuAddVariantBtn').onclick = () => {
      if (!currentInStock) {
        haptic('error');
        showCustomsWarning('Этого варианта нет в наличии, выберите другой');
        return;
      }
      const totalBundleQty = bundleItems.reduce((a, it) => a + it.quantity, 0);
      if (totalBundleQty + currentQty > MAX_CUSTOMS_TOTAL_PRODUCT) {
        haptic('error');
        showCustomsWarning(`В одной посылке не больше ${MAX_CUSTOMS_TOTAL_PRODUCT} шт. одного товара`);
        return;
      }
      const { colorName, sizeName } = selectionNames();
      const comboKey = `${colorName}___${sizeName}`;
      const existing = bundleItems.find((it) => it.key === comboKey);
      if (existing) {
        const lim = getEffectiveVariantLimit();
        if (existing.quantity + currentQty > lim) {
          haptic('error');
          showCustomsWarning(`Не больше ${lim} шт. одного варианта`);
          return;
        }
        existing.quantity += currentQty;
      } else {
        bundleItems.push({
          id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          key: comboKey,
          color: colorName,
          size: sizeName,
          quantity: currentQty,
          price: currentPriceCny,
          image_url: currentImgUrl || masterImg,
          summary: getCombinedSummary(),
        });
      }
      currentQty = 1;
      qtyValEl.textContent = '1';
      haptic('success');
      renderBundleList();
    };

    $('#skuClearBundleBtn').onclick = () => {
      bundleItems.length = 0;
      haptic('light');
      renderBundleList();
    };

    root.querySelectorAll('.sk-opt').forEach((btn) => {
      btn.onclick = () => {
        const grp = groups.find((g) => g.id === btn.dataset.groupId);
        if (!grp) return;
        const opt = (grp.options || [])[parseInt(btn.dataset.optIdx, 10)];
        if (!opt) return;
        if (btn.classList.contains('off')) {
          haptic('error');
          showCustomsWarning(grp === sizeGroup && visualGroup ? 'Этого размера нет в выбранном цвете' : 'Этого варианта нет в наличии');
          return;
        }
        haptic('light');
        selectedState[grp.id] = opt;
        root.querySelectorAll(`.sk-opt[data-group-id="${CSS.escape(grp.id)}"]`).forEach((b) => b.classList.toggle('on', b === btn));
        const lbl = root.querySelector(`#skuSelectedLabel_${CSS.escape(grp.id)}`);
        if (lbl) lbl.textContent = optLabel(grp, opt);

        if (grp === visualGroup) {
          refreshAvailability();
          const img = opt.image_url || opt.thumb_url || masterImg;
          if (img) {
            currentImgUrl = img;
            showColorPhoto(img);
          }
        }
        refreshOptPrices();
        recomputePrice();
        updatePriceDisplay();
        updateSummaryDisplay();
      };
    });

    $('#skuApplyBtn').onclick = () => {
      if (bundleItems.length === 0 && !currentInStock) return;
      haptic('success');
      closeSkuModal();
      if (typeof onConfirm !== 'function') return;
      const title = productData.title_ru || productData.title;
      if (bundleItems.length > 0) {
        const totalQty = bundleItems.reduce((a, it) => a + it.quantity, 0);
        const totalCny = Math.round(bundleItems.reduce((a, it) => a + it.price * it.quantity, 0) * 100) / 100;
        const summaryParts = bundleItems.map((it) => `${it.summary} × ${it.quantity} шт.`);
        onConfirm({
          is_bundle: true,
          items: bundleItems,
          total_quantity: totalQty,
          total_price_cny: totalCny,
          price: bundleItems[0].price,
          quantity: totalQty,
          color: bundleItems.map((it) => it.color).filter(Boolean).join(', '),
          size: bundleItems.map((it) => it.size).filter(Boolean).join(', '),
          variant_summary: summaryParts.join('; '),
          full_status: `${title} · ${summaryParts.join('; ')}`,
          image_url: bundleItems[0].image_url || currentImgUrl || masterImg,
          title,
          brand: productData.brand || '',
          category: productData.category || '',
          marketplace: 'pinduoduo',
        });
        return;
      }
      const { colorName, sizeName } = selectionNames();
      const totalCny = Math.round(currentPriceCny * currentQty * 100) / 100;
      const summary = `${getCombinedSummary()}${currentQty > 1 ? ` × ${currentQty} шт.` : ''}`;
      onConfirm({
        is_bundle: false,
        items: [{
          id: 'b_' + Date.now(),
          color: colorName,
          size: sizeName,
          quantity: currentQty,
          price: currentPriceCny,
          image_url: currentImgUrl || masterImg,
          summary: getCombinedSummary(),
        }],
        total_quantity: currentQty,
        total_price_cny: totalCny,
        quantity: currentQty,
        color: colorName,
        size: sizeName,
        variant_summary: summary,
        full_status: `${title} · ${summary}`,
        price: currentPriceCny,
        image_url: currentImgUrl || masterImg,
        title,
        brand: productData.brand || '',
        category: productData.category || '',
        marketplace: 'pinduoduo',
      });
    };

    updatePriceDisplay();
  };
})();
