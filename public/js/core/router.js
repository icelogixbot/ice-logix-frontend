// ============================================================
// ICE LOGIX Engine: Router & Lifecycle Watchdog
// ============================================================
    // [EXTRACTED MODULE] Dropshipper Cabinet is loaded from /js/modules/dropship.js
    // [EXTRACTED MODULE] Academy is loaded from /js/modules/academy.js
    // [EXTRACTED MODULE] Reports & Reviews is loaded from /js/modules/reports-reviews.js


    // [EXTRACTED MODULE] Admin Panel Core is loaded from /js/modules/admin.js
    async function renderAdminScreen(force = true) {
      if (force) {
        window.invalidateAdminCache();
      }
      const contentDiv = document.getElementById('content');
      const currentHeight = contentDiv ? contentDiv.offsetHeight : 0;
      if (contentDiv && currentHeight > 0) {
        contentDiv.style.minHeight = `${currentHeight}px`;
      }
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      _suppressSpinner = true;
      try {
        await renderCurrentScreen();
      } finally {
        _suppressSpinner = false;
        if (contentDiv) {
          contentDiv.style.minHeight = '';
        }
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPos, behavior: 'instant' });
      });
    }

    async function renderCurrentScreen() {
      const contentDiv = document.getElementById('content');
      syncTelegramBackButton();
      
      let shadowBannerHtml = '';
      if (isShadowMode && originalAdminId) {
        shadowBannerHtml = `
          <div class="bg-red-500 text-white text-center py-2 px-4 text-xs font-bold w-full fixed top-0 left-0 z-[100] flex justify-between items-center shadow-lg">
            <span>ВНИМАНИЕ: Режим юзера (ID: <span class="font-mono bg-black/20 px-1 rounded">${userId}</span>)</span>
            <button id="exitShadowModeBtn" class="bg-white text-red-500 px-3 py-1 rounded shadow hover:bg-white/90 active:scale-95 transition">Вернуться в админку</button>
          </div>
          <div class="h-10 w-full"></div> <!-- spacer -->
        `;
      }

      // Seamless instant render — previous content remains visible until new screen is ready

      if (currentSubScreen === 'about') {
        contentDiv.innerHTML = shadowBannerHtml + await renderAboutUs();
        attachAboutUsHandlers();
        ensureBackButtonForSubscreen();
        if (isShadowMode) attachShadowModeExit();
        return;
      }
      if (currentSubScreen === 'myOrders') {
        contentDiv.innerHTML = shadowBannerHtml + await renderMyOrders();
        const backBtn = document.getElementById('backToProfileBtn');
        if (backBtn) backBtn.onclick = () => { currentSubScreen = null; renderCurrentScreen(); };
        if (isShadowMode) attachShadowModeExit();
        return;
      }
      if (currentSubScreen === 'marketplaces') {
        contentDiv.innerHTML = shadowBannerHtml + await renderMarketplaces();
        attachMarketplacesHandlers();
        ensureBackButtonForSubscreen();
        if (isShadowMode) attachShadowModeExit();
        return;
      }
      if (currentSubScreen === 'sizeGuides') {
        contentDiv.innerHTML = shadowBannerHtml + await renderSizeGuides();
        ensureBackButtonForSubscreen();
        if (isShadowMode) attachShadowModeExit();
        return;
      }
      if (currentSubScreen === 'productsCatalog') {
        contentDiv.innerHTML = shadowBannerHtml + await renderProductsCatalog();
        attachProductsCatalogHandlers();
        ensureBackButtonForSubscreen();
        if (isShadowMode) attachShadowModeExit();
        return;
      }
      if (currentSubScreen === 'faq') {
        contentDiv.innerHTML = shadowBannerHtml + await renderFAQ();
        attachFAQHandlers();
        ensureBackButtonForSubscreen();
        if (isShadowMode) attachShadowModeExit();
        return;
      }

      if (currentTab !== 'calculator') {
        window.activePromotionId = null;
        window.currentPromotion = null;
      }

      if (currentTab === 'home') {
        try {
          const homeHtml = await renderHome();
          contentDiv.innerHTML = shadowBannerHtml + homeHtml;
          attachHomeHandlers();
        } catch (e) {
          console.error('Failed to render home tab:', e);
        }
      } else if (currentTab === 'calculator') {
        contentDiv.innerHTML = shadowBannerHtml + await renderCalculator();
        attachCalculatorHandlers();
      } else if (currentTab === 'neworder') {
        contentDiv.innerHTML = shadowBannerHtml + await renderNewOrder();
        attachNewOrderHandlers();
      } else if (currentTab === 'legitcheck') {
        contentDiv.innerHTML = shadowBannerHtml + await renderLegitCheck();
        attachLegitCheckHandlers();
      } else if (currentTab === 'wishlist') {
        contentDiv.innerHTML = shadowBannerHtml + await renderWishlist();
        attachWishlistHandlers();
      } else if (currentTab === 'catalogs') {
        contentDiv.innerHTML = shadowBannerHtml + await renderCatalogs();
        attachCatalogsHandlers();
      } else if (currentTab === 'profile') {
        contentDiv.innerHTML = shadowBannerHtml + await renderProfile();
        attachProfileHandlers();
        loadProfileExtras();
      } else if (currentTab === 'dropshipper') {
        contentDiv.innerHTML = shadowBannerHtml + await renderDropshipper();
        attachDropshipperHandlers();
      } else if (currentTab === 'academy') {
        contentDiv.innerHTML = shadowBannerHtml + await renderAcademy();
        attachAcademyHandlers();
      } else if (currentTab === 'admin' && isOwner) {
        if (!adminAuthenticated) {
          contentDiv.innerHTML = await renderAdmin2FA();
          attachAdmin2FAHandlers();
          window.scrollTo(0, 0);
        } else {
          contentDiv.innerHTML = await renderAdmin();
          attachAdminHandlers();
          window.scrollTo(0, 0);
        }
      } else if (currentTab === 'reports') {
        contentDiv.innerHTML = shadowBannerHtml + await renderReports();
        attachReportsHandlers();
      } else if (currentTab === 'reviews') {
        contentDiv.innerHTML = shadowBannerHtml + await renderReviews();
        attachReviewsHandlers();
      } else if (currentTab === 'cart') {
        contentDiv.innerHTML = shadowBannerHtml + await renderCart();
        attachCartHandlers();
      } else if (currentTab === 'promo') {
        contentDiv.innerHTML = shadowBannerHtml + await renderPromoPage();
        attachPromoPageHandlers();
      } else if (currentTab === 'history') {
        contentDiv.innerHTML = shadowBannerHtml + await renderHistory();
        attachHistoryHandlers();
      } else if (currentTab === 'resale') {
        contentDiv.innerHTML = shadowBannerHtml + await renderResale();
      } else if (currentTab === 'admin_resale' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminResale();
      } else if (currentTab === 'admin_reviews_config' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminReviewsConfig();
        attachAdminReviewsConfigHandlers();
      } else if (currentTab === 'admin_analytics' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminAnalytics();
        if (typeof attachAdminAnalyticsHandlers === 'function') attachAdminAnalyticsHandlers();
      } else if (currentTab === 'admin_crm' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminCRM();
        if (typeof attachAdminCRMHandlers === 'function') attachAdminCRMHandlers();
      } else if (currentTab === 'admin_suppliers' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminSuppliers();
        attachAdminSuppliersHandlers();
      } else if (currentTab === 'ugc') {
        contentDiv.innerHTML = shadowBannerHtml + await renderUGC();
        attachUGCHandlers();
      } else if (currentTab === 'reftree') {
        contentDiv.innerHTML = shadowBannerHtml + await renderReferralTree();
        attachReferralTreeHandlers();
      } else if (currentTab === 'admin_marketing' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminMarketing();
        attachAdminMarketingHandlers();
      } else if (currentTab === 'admin_texts' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminTexts();
        attachAdminTextsHandlers();
      } else if (currentTab === 'admin_faq' && isOwner) {
        if (!adminAuthenticated) { switchTab('admin'); return; }
        contentDiv.innerHTML = await renderAdminFAQ();
        attachAdminFAQHandlers();
      } else {
        contentDiv.innerHTML = '<div class="text-center py-10">Страница не найдена</div>';
      }
      
      if (isShadowMode) attachShadowModeExit();

      scrollToPageTop();

      if (currentTab !== 'home' && currentTab !== 'catalogs' && currentTab !== 'reports' && currentTab !== 'reviews' && currentTab !== 'academy' && currentTab !== 'dropshipper' && currentTab !== 'products' && currentTab !== 'wishlist' && !currentSubScreen) {
        ensureBackButton();
      }
      initCardSliders();
      // Save rendered HTML to cache for instant restore on next tab/screen switch
      const _ck = (currentTab || '') + ':' + (currentSubScreen || '');
      if (contentDiv && contentDiv.innerHTML) {
        _tabCache[_ck] = { html: contentDiv.innerHTML, ts: Date.now() };
        try {
          if (currentTab === 'home' && !currentSubScreen) {
            localStorage.setItem('ice_tab_home_v2', contentDiv.innerHTML);
          }
          const _persistKeys = ['reports:', 'reviews:', 'promo:', 'academy:', 'legitcheck:', 'calculator:', 'catalogs:'];
          if (_persistKeys.includes(_ck)) {
            const _toSave = {};
            _persistKeys.forEach(k => { if (_tabCache[k]?.html) _toSave[k] = _tabCache[k]; });
            localStorage.setItem('ice_tab_screens_v2', JSON.stringify(_toSave));
          }
        } catch(e) {}
      }
    }

    function attachShadowModeExit() {
      const btn = document.getElementById('exitShadowModeBtn');
      if (btn) {
        btn.onclick = () => {
          userId = originalAdminId;
          originalAdminId = null;
          isShadowMode = false;
          tgUtil.alert('Вы вернулись в админку');
          currentSubScreen = null;
          switchTab('admin');
        };
      }
    }

    // [EXTRACTED MODULE] Catalogs & Marketplaces is loaded from /js/modules/catalogs.js
// ==================== ШИФРОВАНИЕ И УТИЛИТЫ ====================
const ICE_ENCRYPT_KEY = 'ICE_LOGIX_2026_SEC_v1';

function encryptData(obj) {
  return CryptoJS.AES.encrypt(JSON.stringify(obj), ICE_ENCRYPT_KEY).toString();
}
function decryptData(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, ICE_ENCRYPT_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch { return null; }
}
function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone || '';
  return phone.slice(0, 4) + ' ** *** ' + phone.slice(-4);
}
function maskCard(cardNumber) {
  const n = (cardNumber || '').replace(/\s/g, '');
  if (n.length < 4) return '****';
  return '**** **** **** ' + n.slice(-4);
}
function applyTheme(theme) {
  if (theme === window._currentAppliedTheme) return;
  window._currentAppliedTheme = theme;
  document.documentElement.classList.add('no-transitions');
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
  }
  // Force layout reflow only when theme actually changed
  void document.documentElement.offsetHeight;
  setTimeout(() => {
    document.documentElement.classList.remove('no-transitions');
  }, 50);
}

function showSizeTablesModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 overflow-y-auto';
  
  let activeCategory = 'shoes';
  let activeBrand = 'Nike';
  
  const getShoesData = (brand) => {
    switch (brand) {
      case 'Nike':
        return [
          { eu: '38.5', us: '6.0', uk: '5.5', cm: '24.0 см' },
          { eu: '39', us: '6.5', uk: '6.0', cm: '24.5 см' },
          { eu: '40', us: '7.0', uk: '6.0', cm: '25.0 см' },
          { eu: '40.5', us: '7.5', uk: '6.5', cm: '25.5 см' },
          { eu: '41', us: '8.0', uk: '7.0', cm: '26.0 см' },
          { eu: '42', us: '8.5', uk: '7.5', cm: '26.5 см' },
          { eu: '42.5', us: '9.0', uk: '8.0', cm: '27.0 см' },
          { eu: '43', us: '9.5', uk: '8.5', cm: '27.5 см' },
          { eu: '44', us: '10.0', uk: '9.0', cm: '28.0 см' },
          { eu: '44.5', us: '10.5', uk: '9.5', cm: '28.5 см' },
          { eu: '45', us: '11.0', uk: '10.0', cm: '29.0 см' },
          { eu: '46', us: '12.0', uk: '11.0', cm: '30.0 см' }
        ];
      case 'Pinduoduo':
        return [
          { eu: '35 CHN', us: '35 EU', uk: '22.5 см', cm: 'Маломерит' },
          { eu: '36 CHN', us: '36 EU', uk: '23.0 см', cm: 'Маломерит' },
          { eu: '37 CHN', us: '37 EU', uk: '23.5 см', cm: 'Маломерит' },
          { eu: '38 CHN', us: '38 EU', uk: '24.0 см', cm: 'Маломерит' },
          { eu: '39 CHN', us: '39 EU', uk: '24.5 см', cm: 'В размер' },
          { eu: '40 CHN', us: '40 EU', uk: '25.0 см', cm: 'В размер' },
          { eu: '41 CHN', us: '41 EU', uk: '25.5 см', cm: 'В размер' },
          { eu: '42 CHN', us: '42 EU', uk: '26.0 см', cm: 'В размер' },
          { eu: '43 CHN', us: '43 EU', uk: '26.5 см', cm: 'Маломерит' },
          { eu: '44 CHN', us: '44 EU', uk: '27.0 см', cm: 'Маломерит' }
        ];
      case 'Zara':
      case 'H&M':
      case 'Vinted':
      default:
        return [
          { eu: '36 EU', us: '3.5 UK', uk: '23.0 см', cm: 'В размер' },
          { eu: '37 EU', us: '4.0 UK', uk: '23.5 см', cm: 'В размер' },
          { eu: '38 EU', us: '5.0 UK', uk: '24.3 см', cm: 'В размер' },
          { eu: '39 EU', us: '6.0 UK', uk: '25.0 см', cm: 'В размер' },
          { eu: '40 EU', us: '6.5 UK', uk: '25.8 см', cm: 'В размер' },
          { eu: '41 EU', us: '7.5 UK', uk: '26.5 см', cm: 'В размер' },
          { eu: '42 EU', us: '8.0 UK', uk: '27.0 см', cm: 'В размер' },
          { eu: '43 EU', us: '9.0 UK', uk: '28.0 см', cm: 'В размер' },
          { eu: '44 EU', us: '9.5 UK', uk: '28.5 см', cm: 'В размер' },
          { eu: '45 EU', us: '10.5 UK', uk: '29.3 см', cm: 'В размер' }
        ];
    }
  };

  const getClothingData = (brand) => {
    switch (brand) {
      case 'Zara':
        return [
          { size: 'XS', height: '165 см', weight: '88 см', chest: '72 см' },
          { size: 'S', height: '170 см', chest: '92 см', weight: '76 см' },
          { size: 'M', height: '175 см', chest: '96 см', weight: '80 см' },
          { size: 'L', height: '180 см', chest: '104 см', weight: '88 см' },
          { size: 'XL', height: '185 см', chest: '112 см', weight: '96 см' },
          { size: 'XXL', height: '190 см', chest: '120 см', weight: '104 см' }
        ];
      case 'H&M':
        return [
          { size: 'XS', height: '160-165 см', weight: '84-88 см', chest: '70-74 см' },
          { size: 'S', height: '165-170 см', weight: '88-92 см', chest: '74-78 см' },
          { size: 'M', height: '170-175 см', weight: '92-96 см', chest: '78-82 см' },
          { size: 'L', height: '175-180 см', weight: '96-100 см', chest: '82-86 см' },
          { size: 'XL', height: '180-185 см', weight: '100-104 см', chest: '86-90 см' },
          { size: 'XXL', height: '185-190 см', weight: '104-108 см', chest: '90-94 см' }
        ];
      case 'Pinduoduo':
        return [
          { size: 'M (CHN)', height: '160-165 см', weight: '45-52 кг', chest: 'Рост до 165' },
          { size: 'L (CHN)', height: '165-170 см', weight: '52-60 кг', chest: 'Рост до 170' },
          { size: 'XL (CHN)', height: '170-175 см', weight: '60-68 кг', chest: 'Рост до 175' },
          { size: '2XL (CHN)', height: '175-180 см', weight: '68-75 кг', chest: 'Рост до 180' },
          { size: '3XL (CHN)', height: '180-185 см', weight: '75-83 кг', chest: 'Рост до 185' },
          { size: '4XL (CHN)', height: '185-190 см', weight: '83-92 кг', chest: 'Рост до 190' }
        ];
      case 'Nike':
        return [
          { size: 'XS', height: '168 см', weight: '82-88 см', chest: '72-77 см' },
          { size: 'S', height: '173 см', weight: '88-96 см', chest: '77-83 см' },
          { size: 'M', height: '178 см', weight: '96-104 см', chest: '83-89 см' },
          { size: 'L', height: '183 см', weight: '104-112 см', chest: '89-97 см' },
          { size: 'XL', height: '188 см', weight: '112-124 см', chest: '97-109 см' },
          { size: 'XXL', height: '193 см', weight: '124-136 см', chest: '109-121 см' }
        ];
      case 'Vinted':
      default:
        return [
          { size: 'XS', height: '160 см', weight: '80-84 см', chest: '64-68 см' },
          { size: 'S', height: '165 см', weight: '84-88 см', chest: '68-72 см' },
          { size: 'M', height: '170 см', weight: '88-92 см', chest: '72-76 см' },
          { size: 'L', height: '175 см', weight: '92-96 см', chest: '76-80 см' },
          { size: 'XL', height: '180 см', weight: '96-100 см', chest: '80-84 см' }
        ];
    }
  };
  
  const renderModalContent = () => {
    const brands = ['Nike', 'Zara', 'H&M', 'Vinted', 'Pinduoduo'];
    const categories = [
      { id: 'shoes', label: '👟 Обувь' },
      { id: 'clothing', label: '👕 Одежда' }
    ];
    
    const categoryTabsHtml = categories.map(c => `
      <button class="flex-1 py-2 text-center text-xs font-bold rounded-xl border transition ${activeCategory === c.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 hover:bg-white/5 text-white/70'}" onclick="window.setSizeTableCategory('${c.id}')">
        ${c.label}
      </button>
    `).join('');
    
    const brandTabsHtml = brands.map(b => `
      <button class="px-3 py-1.5 text-center text-[11px] font-bold rounded-lg border transition whitespace-nowrap ${activeBrand === b ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/50 hover:text-white'}" onclick="window.setSizeTableBrand('${b}')">
        ${b}
      </button>
    `).join('');
    
    let tableHtml = '';
    
    if (activeCategory === 'shoes') {
      const data = getShoesData(activeBrand);
      const isChina = activeBrand === 'Pinduoduo';
      const col1 = isChina ? 'Площадка' : 'Размер';
      const col2 = isChina ? 'EU аналог' : 'US аналог';
      const col3 = isChina ? 'Длина стопы' : 'UK аналог';
      const col4 = isChina ? 'Посадка' : 'Стелька';
      
      tableHtml = `
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-white/10 text-white/60">
              <th class="py-2 font-semibold">${col1}</th>
              <th class="py-2 font-semibold">${col2}</th>
              <th class="py-2 font-semibold">${col3}</th>
              <th class="py-2 font-semibold">${col4}</th>
              <th class="py-2 text-right">Выбрать</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-white/80">
            ${data.map(row => {
              const applyVal = row.eu.split(' ')[0];
              return `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="py-2.5 font-mono font-bold text-cyan-400">${row.eu}</td>
                  <td class="py-2.5 font-mono">${row.us}</td>
                  <td class="py-2.5 font-mono">${row.uk}</td>
                  <td class="py-2.5 font-mono text-white/70">${row.cm}</td>
                  <td class="py-2.5 text-right">
                    <button class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-2.5 py-1 rounded text-[10px] transition" onclick="window.applySelectedSize('${applyVal}')">Выбрать</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      const data = getClothingData(activeBrand);
      const isChina = activeBrand === 'Pinduoduo';
      const col1 = 'Размер';
      const col2 = 'Рост (см)';
      const col3 = isChina ? 'Вес (кг)' : 'Обхват груди';
      const col4 = isChina ? 'Рекомендация' : 'Обхват талии';
      
      tableHtml = `
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-white/10 text-white/60">
              <th class="py-2 font-semibold">${col1}</th>
              <th class="py-2 font-semibold">${col2}</th>
              <th class="py-2 font-semibold">${col3}</th>
              <th class="py-2 font-semibold">${col4}</th>
              <th class="py-2 text-right">Выбрать</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-white/80">
            ${data.map(row => {
              const applyVal = row.size.split(' ')[0];
              return `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="py-2.5 font-bold text-cyan-400">${row.size}</td>
                  <td class="py-2.5 font-mono">${row.height}</td>
                  <td class="py-2.5 font-mono">${row.chest}</td>
                  <td class="py-2.5 font-mono text-white/70">${row.weight}</td>
                  <td class="py-2.5 text-right">
                    <button class="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold px-2.5 py-1 rounded text-[10px] transition" onclick="window.applySelectedSize('${applyVal}')">Выбрать</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
    
    return `
      <div class="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden page-enter">
        <div class="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 class="text-white font-bold text-base flex items-center gap-1.5">
              ${ix('compare', { cls: 'text-cyan-400' })}
              <span>Справочник размеров</span>
            </h3>
            <p class="text-white/50 text-[10px] mt-0.5">Выберите нужный размер для автоподстановки</p>
          </div>
          <button id="closeSizeTablesBtn" class="text-white/50 hover:text-white transition-colors text-lg">${ix('x')}</button>
        </div>
        
        <div class="p-4 space-y-4 overflow-y-auto flex-1">
          <!-- Category Tabs -->
          <div class="flex gap-2">
            ${categoryTabsHtml}
          </div>
          
          <!-- Brand Tabs (horizontal scrollable list) -->
          <div class="overflow-x-auto flex gap-1.5 pb-2 scrollbar-none border-b border-white/5">
            ${brandTabsHtml}
          </div>
          
          <!-- Table -->
          <div class="bg-white/5 p-3 rounded-xl border border-white/5 max-h-[40vh] overflow-y-auto">
            ${tableHtml}
          </div>
          
          <!-- Footer Tip -->
          <p class="text-white/40 text-[10px] text-center leading-relaxed">
            💡 Размерные сетки указаны на основе официальных стандартов брендов. Для точного соответствия вы также можете заполнить свои физические замеры!
          </p>
        </div>
      </div>
    `;
  };
  
  modal.innerHTML = renderModalContent();
  document.body.appendChild(modal);
  
  window.setSizeTableCategory = (cat) => {
    tgUtil.haptic('light');
    activeCategory = cat;
    // Set default brand based on category compatibility
    if (cat === 'shoes') activeBrand = 'Nike';
    else activeBrand = 'Zara';
    modal.innerHTML = renderModalContent();
  };
  
  window.setSizeTableBrand = (brand) => {
    tgUtil.haptic('light');
    activeBrand = brand;
    modal.innerHTML = renderModalContent();
  };
  
  window.applySelectedSize = (size) => {
    tgUtil.haptic('success');
    const calcSizeEl = document.getElementById('calcSize');
    const orderSizeEl = document.getElementById('orderSize');
    
    if (currentTab === 'calculator' && calcSizeEl) {
      calcSizeEl.value = size;
      const changeEvent = new Event('change', { bubbles: true });
      calcSizeEl.dispatchEvent(changeEvent);
      glassToast(`Размер ${size} применен в калькулятор!`, { kind: 'success' });
    } else if (currentTab === 'neworder' && orderSizeEl) {
      orderSizeEl.value = size;
      glassToast(`Размер ${size} применен в заказ!`, { kind: 'success' });
    } else {
      if (calcSizeEl) calcSizeEl.value = size;
      if (orderSizeEl) orderSizeEl.value = size;
      glassToast(`Размер ${size} выбран!`, { kind: 'success' });
    }
    modal.remove();
  };
  
  // Use robust event delegation for close button
  modal.addEventListener('click', (e) => {
    if (e.target.closest('#closeSizeTablesBtn')) {
      modal.remove();
    }
  });
}

window.switchPackageTab = (country) => {
  tgUtil.haptic('light');
  window.activePackageTab = country;
  renderCurrentScreen();
};

window.togglePackageConsolidation = (country) => {
  tgUtil.haptic('light');
  window.tempOrder.consolidation = window.tempOrder.consolidation || {};
  const checkbox = document.getElementById('pkgConsolidationCheck');
  if (checkbox) {
    window.tempOrder.consolidation[country] = checkbox.checked;
  }
  recalculateOrderTotals();
};

  // ================== ПАГИНАЦИЯ ЗАКАЗОВ ==================
  const prevBtn = document.getElementById('adminOrdersPrev');
  const nextBtn = document.getElementById('adminOrdersNext');
  if (prevBtn) prevBtn.onclick = () => { if (adminOrdersPage > 1) { adminOrdersPage--; renderCurrentScreen(); } };
  if (nextBtn) nextBtn.onclick = () => { if (adminOrdersPage < adminOrdersTotalPages) { adminOrdersPage++; renderCurrentScreen(); } };
    // ================== СМЕНА СТАТУСА ЗАКАЗА (ДЕЛЕГИРОВАНИЕ) ==================
    if (!window._statusChangeHandler) {
    window._statusChangeHandler = async (e) => {
      if (e.target.classList.contains('changeOrderStatus')) {
        const select = e.target;
        const newStatus = select.value;
        if (!newStatus) return;
        const orderId = select.dataset.orderId;
        const userId = select.dataset.userId;
        const previousStatus = select.dataset.previousStatus;
        if (!confirm(`Изменить статус заказа на "${getStatusText(newStatus)}"?`)) {
          select.value = previousStatus || '';
          return;
        }
        try {
          const { error } = await supabaseClient.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
          if (error) throw error;
          logAdminAction('order_status', { orderId, newStatus, previousStatus });
          const statusMessages = {
            'paid': '✅ Ваш заказ оплачен! Мы приступаем к выкупу.',
            'bought': '🛍️ Товар выкуплен! Ожидайте отправки на склад.',
            'on_sklad_cn': '📦 Товар на складе в Китае. Идёт подготовка к отправке.',
            'in_transit': '🚚 Ваш заказ в пути! Трек-номер появится позже.',
            'in_belarus': '🇧🇾 Товар в Беларуси! Скоро будет доставлен.',
            'delivered': '🎉 Заказ доставлен! Спасибо, что выбрали ICE LOGIX!'
          };
          const message = statusMessages[newStatus];
          if (message) {
            await sendNotification(userId, message, orderId);
          }
          renderCurrentScreen();
        } catch (err) {
          alert('Ошибка: ' + err.message);
          select.value = previousStatus || '';
        }
      }
    };
    document.addEventListener('change', window._statusChangeHandler);
  }
    // [EXTRACTED MODULE] Profile Modals & Settings is loaded from /js/modules/profile-modals.js
    // [EXTRACTED MODULE] Promotions & History is loaded from /js/modules/promos-history.js
    // [EXTRACTED MODULE] AI Legit Check is loaded from /js/modules/legitcheck.js
    // [EXTRACTED MODULE] ICE Resale & Group Delivery is loaded from /js/modules/resale.js
    // [EXTRACTED MODULE] Admin Analytics & CRM is loaded from /js/modules/admin-analytics.js
        // ==================== ЗАПУСК ====================
        init();

        // ==================== WATCHDOG: content disappear guard ====================
        // Starts 3s after init to avoid triggering during initial load
        setTimeout(() => {
          let _contentWatchdogTimer = null;
          const _contentDiv = document.getElementById('content');
          if (_contentDiv && typeof MutationObserver !== 'undefined') {
            const _watchdog = new MutationObserver(() => {
              clearTimeout(_contentWatchdogTimer);
              _contentWatchdogTimer = setTimeout(() => {
                if (_contentDiv.innerHTML.trim().length === 0) {
                  console.warn('[ICE LOGIX] Content watchdog triggered — re-rendering');
                  renderCurrentScreen();
                }
              }, 1500);
            });
            _watchdog.observe(_contentDiv, { childList: true, subtree: false });
          }
        }, 3000);