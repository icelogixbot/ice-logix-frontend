// ============================================================
// ICE LOGIX Engine: Core & Global State
// ============================================================
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.classList.add('light-theme');
    }

    const i18n = {
      ru: {
        tab_home: 'Главная',
        tab_calc: 'Калькулятор',
        tab_order: 'Заказ',
        tab_catalogs: 'Каталоги',
        tab_profile: 'Профиль',
        quick_actions: 'Быстрые действия',
        my_orders: 'Мои заказы',
        my_orders_sub: 'История покупок',
        favorites: 'Избранное',
        favorites_sub: 'Сохранённое',
        cart: 'Корзина',
        cart_sub: 'Товары к заказу',
        history: 'История',
        history_sub: 'Транзакции и заказы',
        other: 'Другое',
        my_data: 'Мои данные',
        my_data_sub: 'ФИО, телефон, паспорт и замеры',
        dropshipper_cabinet: 'Кабинет дропшиппера',
        dropshipper_cabinet_sub: 'Управление магазином',
        earn_with_us: 'Зарабатывай с нами',
        earn_with_us_sub: 'Стань партнёром ICE LOGIX',
        settings_title: 'Настройки',
        settings_save: 'Сохранить',
        settings_cancel: 'Отмена',
        settings_lang: 'Язык',
        settings_theme: 'Тема',
        settings_notifications: 'Уведомления',
        settings_security: 'Безопасность'
      },
      be: {
        tab_home: 'Галоўная',
        tab_calc: 'Калькулятар',
        tab_order: 'Заказ',
        tab_catalogs: 'Каталогі',
        tab_profile: 'Профіль',
        quick_actions: 'Хуткія дзеянні',
        my_orders: 'Мае заказы',
        my_orders_sub: 'Гісторыя пакупак',
        favorites: 'Обранае',
        favorites_sub: 'Захаванае',
        cart: 'Кошык',
        cart_sub: 'Тавары да заказу',
        history: 'Гісторыя',
        history_sub: 'Транзакцыі і заказы',
        other: 'Іншае',
        my_data: 'Мае дадзеныя',
        my_data_sub: 'ФІА, тэлефон, пашпарт і замеры',
        dropshipper_cabinet: 'Кабінет дропшыпера',
        dropshipper_cabinet_sub: 'Кіраванне крамай',
        earn_with_us: 'Зарабляй з намі',
        earn_with_us_sub: 'Стань партнёрам ICE LOGIX',
        settings_title: 'Налады',
        settings_save: 'Захаваць',
        settings_cancel: 'Адмена',
        settings_lang: 'Мова',
        settings_theme: 'Тэма',
        settings_notifications: 'Апавяшчэнні',
        settings_security: 'Бяспека'
      },
      en: {
        tab_home: 'Home',
        tab_calc: 'Calculator',
        tab_order: 'Order',
        tab_catalogs: 'Catalogs',
        tab_profile: 'Profile',
        quick_actions: 'Quick Actions',
        my_orders: 'My Orders',
        my_orders_sub: 'Purchase history',
        favorites: 'Favorites',
        favorites_sub: 'Saved items',
        cart: 'Cart',
        cart_sub: 'Items to order',
        history: 'History',
        history_sub: 'Transactions & orders',
        other: 'Other',
        my_data: 'My Info',
        my_data_sub: 'Name, phone, passport & size',
        dropshipper_cabinet: 'Dropshipper Cabinet',
        dropshipper_cabinet_sub: 'Store management',
        earn_with_us: 'Earn with us',
        earn_with_us_sub: 'Become an ICE LOGIX partner',
        settings_title: 'Settings',
        settings_save: 'Save',
        settings_cancel: 'Cancel',
        settings_lang: 'Language',
        settings_theme: 'Theme',
        settings_notifications: 'Notifications',
        settings_security: 'Security'
      }
    };

    function t(key, fallback = '') {
      const lang = localStorage.getItem('lang') || 'ru';
      return i18n[lang]?.[key] || fallback || key;
    }

    let _googleTranslateInitStarted = false;
    let _googleTranslateLoaded = false;

    function setGoogleTranslateLanguage(langCode) {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        const val = langCode === 'ru' ? '' : langCode;
        if (combo.value !== val) {
          combo.value = val;
          combo.dispatchEvent(new Event('change'));
        }
      } else {
        setTimeout(() => setGoogleTranslateLanguage(langCode), 300);
      }
    }

    function initGoogleTranslateWidget() {
      if (_googleTranslateInitStarted) return;
      _googleTranslateInitStarted = true;

      const container = document.createElement('div');
      container.id = 'google_translate_element';
      container.style.display = 'none';
      document.body.appendChild(container);

      window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
          pageLanguage: 'ru',
          includedLanguages: 'ru,en,be',
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
        _googleTranslateLoaded = true;
        
        const savedLang = localStorage.getItem('lang') || 'ru';
        if (savedLang !== 'ru') {
          setTimeout(() => {
            setGoogleTranslateLanguage(savedLang);
          }, 500);
        }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(script);

      const style = document.createElement('style');
      style.id = 'google-translate-styles';
      style.innerHTML = `
        iframe.skiptranslate,
        iframe[class*="skiptranslate"],
        .goog-logo-link,
        .goog-te-gadget span,
        .goog-te-banner-frame,
        #goog-gt-tt,
        .goog-te-balloon-frame {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
        }
      `;
      document.head.appendChild(style);
    }

    function applyLanguage(lang) {
      localStorage.setItem('lang', lang);
      const tabLabels = {
        home: t('tab_home', 'Главная'),
        calculator: t('tab_calc', 'Калькулятор'),
        neworder: t('tab_order', 'Заказ'),
        catalogs: t('tab_catalogs', 'Каталоги'),
        profile: t('tab_profile', 'Профиль')
      };
      document.querySelectorAll('#tabBar .tab-item').forEach(item => {
        const tabName = item.dataset.tab;
        const labelSpan = item.querySelector('.tab-label');
        if (labelSpan && tabLabels[tabName]) {
          labelSpan.textContent = tabLabels[tabName];
        }
      });
      if (typeof renderCurrentScreen === 'function') {
        renderCurrentScreen();
      }
      // Translate the freshly rendered UI (and keep doing so for late async content)
      _setupTranslationObserver();
      if (lang !== 'ru') {
        requestAnimationFrame(() => translateDOM(document.body));
      }
      
      // Load and trigger Google Translate widget for dynamic content
      initGoogleTranslateWidget();
      setGoogleTranslateLanguage(lang);
    }

    // ============================================================
    // Runtime UI translation layer (RU source -> BE / EN)
    // The whole app is authored in Russian. Instead of wrapping every
    // hardcoded string, we translate the rendered DOM in place using the
    // dictionary below, and re-run on every render/modal via a MutationObserver.
    // Switching back to RU simply re-renders the (Russian) source.
    // ============================================================
    // UI_DICT is loaded from /js/ui-dict.js
    const UI_DICT = window.UI_DICT || {};

    function _translateString(s, lang) {
      const dict = UI_DICT[lang];
      if (!dict || !s) return null;
      const key = s.trim();
      if (!key) return null;
      const val = dict[key];
      if (val === undefined) return null;
      const lead = s.slice(0, s.length - s.trimStart().length);
      const trail = s.slice(s.trimEnd().length);
      return lead + val + trail;
    }

    function translateDOM(root) {
      const lang = localStorage.getItem('lang') || 'ru';
      if (lang === 'ru' || !UI_DICT[lang]) return;
      if (!root) root = document.body;
      if (root.nodeType === 3) {
        const tr = _translateString(root.nodeValue, lang);
        if (tr !== null && tr !== root.nodeValue) root.nodeValue = tr;
        return;
      }
      if (root.nodeType !== 1) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const p = node.parentNode;
          if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || (p.closest && p.closest('svg')))) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(node => {
        const tr = _translateString(node.nodeValue, lang);
        if (tr !== null && tr !== node.nodeValue) node.nodeValue = tr;
      });
      const withPh = root.querySelectorAll ? root.querySelectorAll('[placeholder]') : [];
      withPh.forEach(el => {
        const tr = _translateString(el.getAttribute('placeholder') || '', lang);
        if (tr !== null) el.setAttribute('placeholder', tr.trim());
      });
    }

    function _setupTranslationObserver() {
      if (window._i18nObserver) return;
      let queue = new Set();
      let throttleTimeout = null;
      
      window._i18nObserver = new MutationObserver(muts => {
        const lang = localStorage.getItem('lang') || 'ru';
        if (lang === 'ru') return;
        
        for (const m of muts) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 || node.nodeType === 3) {
              queue.add(node);
            }
          }
        }
        
        if (queue.size === 0) return;
        if (throttleTimeout) return;
        
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          
          const nodesArray = Array.from(queue);
          queue.clear();
          
          const topLevelNodes = nodesArray.filter(node => {
            if (node.nodeType === 3 && node.parentNode && nodesArray.includes(node.parentNode)) {
              return false;
            }
            if (node.nodeType === 1) {
              let parent = node.parentNode;
              while (parent) {
                if (nodesArray.includes(parent)) return false;
                parent = parent.parentNode;
              }
            }
            return true;
          });
          
          requestAnimationFrame(() => {
            topLevelNodes.forEach(node => {
              if (node.parentNode || node.nodeType === 3) {
                translateDOM(node);
              }
            });
          });
        }, 80);
      });
      window._i18nObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Apply language on load immediately
    setTimeout(() => {
      applyLanguage(localStorage.getItem('lang') || 'ru');
    }, 0);

    function _esc(s) {
      if (s == null) return '';
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    window._esc = _esc;

    function preprocessProducts(products) {
      if (!products) return [];
      const fallbacks = {
        'Nike Dunk Low': 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&auto=format&fit=crop&q=80',
        'Jordan 1 Retro': 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=500&auto=format&fit=crop&q=80',
        'Yeezy 350': 'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=500&auto=format&fit=crop&q=80',
        'Adidas Samba': 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=80',
        'New Balance 550': 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80',
        'Asics Gel Kayano': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80',
        'Puma Suede': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&auto=format&fit=crop&q=80',
        'Reebok Club C': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80',
        'Converse Chuck': 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&auto=format&fit=crop&q=80',
        'Vans Old Skool': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
      };
      return products.map((p) => {
        // Clone to avoid mutating cached CacheDB references
        p = { ...p };
        // Parse image_urls JSON array if present (set by bot for carousel posts)
        if (p.image_urls && typeof p.image_urls === 'string') {
          try { p.image_urls = JSON.parse(p.image_urls); } catch(e) { p.image_urls = null; }
        }
        if (!p.image_urls || !Array.isArray(p.image_urls) || p.image_urls.length === 0) {
          p.image_urls = null;
        }
        // Fix image_url fallback
        if (!p.image_url || p.image_url.includes('placeholder.com') || p.image_url === '') {
          const firstImg = (p.image_urls && p.image_urls[0]) || null;
          p.image_url = firstImg || fallbacks[p.title] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80';
        }
        return p;
      });
    }

    function getProductImages(imageUrl) {
      if (!imageUrl) return [];
      let urls = [];
      const trimmed = String(imageUrl).trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          urls = JSON.parse(trimmed);
        } catch (e) {
          urls = [imageUrl];
        }
      } else if (trimmed.includes(',')) {
        urls = trimmed.split(',').map(u => u.trim());
      } else {
        urls = [imageUrl];
      }
      return (Array.isArray(urls) ? urls : [urls]).map(u => String(u).trim()).filter(Boolean);
    }

    function getResaleImages(item) {
      if (item.image_url) return getProductImages(item.image_url);
      if (item.images) return getProductImages(item.images);
      
      const orderItems = item.orders?.items || item.orders?.cart_items;
      if (Array.isArray(orderItems) && orderItems.length > 0) {
        const img = orderItems[0].imageUrl || orderItems[0].image_url || orderItems[0].image;
        if (img) return getProductImages(img);
      }
      
      if (item.orders && Array.isArray(item.orders.photo_reports) && item.orders.photo_reports.length > 0) {
        return item.orders.photo_reports;
      }
      
      return ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80'];
    }

    function renderCardMedia(mediaUrls, cardTitle) {
      let images = Array.isArray(mediaUrls) ? mediaUrls : getProductImages(mediaUrls);
      if (images.length === 0) {
        images = ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80'];
      }
      
      const escapedImages = encodeURIComponent(JSON.stringify(images));
      if (images.length <= 1) {
        const imgUrl = images[0];
        return `
          <div class="card-photo-container cursor-pointer" data-preview-urls="${escapedImages}" data-preview-index="0" onclick="event.stopPropagation(); window.showImagePreview(['${imgUrl}'], 0)">
            <img src="${imgUrl}" class="w-full h-full object-cover cursor-zoom-in" alt="${cardTitle}">
          </div>
        `;
      }

      return `
        <div class="card-photo-container cursor-pointer">
          <div class="card-slider">
            ${images.map((url, idx) => `
              <div class="card-slide cursor-pointer" data-preview-urls="${escapedImages}" data-preview-index="${idx}">
                <img src="${url}" class="w-full h-full object-cover cursor-zoom-in" alt="${cardTitle}" ${idx > 0 ? 'loading="lazy"' : ''}>
              </div>
            `).join('')}
          </div>
          <div class="card-dots">
            ${images.map((_, idx) => `
              <div class="card-dot ${idx === 0 ? 'active' : ''}"></div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function initCardSliders() {
      // 1. Single photo containers tap
      document.querySelectorAll('.card-photo-container').forEach(container => {
        if (container.dataset.tapInitialized) return;
        container.dataset.tapInitialized = 'true';
        if (!container.querySelector('.card-slider')) {
          container.addEventListener('click', (e) => {
            e.stopPropagation();
            const rawUrls = container.dataset.previewUrls;
            if (rawUrls) {
              try {
                const urls = JSON.parse(decodeURIComponent(rawUrls));
                window.showImagePreview(urls, 0);
              } catch(err) {}
            }
          });
        }
      });

      // 2. Multi-photo sliders
      document.querySelectorAll('.card-slider').forEach(slider => {
        if (slider.dataset.sliderInitialized) return;
        slider.dataset.sliderInitialized = 'true';

        let touchStartX = 0;
        let touchStartY = 0;
        let hasMoved = false;

        slider.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            hasMoved = false;
          }
        }, { passive: true });

        slider.addEventListener('touchmove', (e) => {
          if (e.touches.length === 1) {
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);
            if (dx > 7 || dy > 7) {
              hasMoved = true;
            }
          }
        }, { passive: true });

        slider.querySelectorAll('.card-slide').forEach((slide) => {
          slide.addEventListener('click', (e) => {
            if (hasMoved) return;
            e.stopPropagation();
            try {
              const rawUrls = slide.dataset.previewUrls;
              const idx = parseInt(slide.dataset.previewIndex || '0', 10);
              const urls = rawUrls ? JSON.parse(decodeURIComponent(rawUrls)) : [];
              if (urls.length > 0) {
                window.showImagePreview(urls, idx);
              }
            } catch(err) {
              console.error('Preview error:', err);
            }
          });
        });

        slider.addEventListener('scroll', () => {
          const width = slider.clientWidth;
          if (width <= 0) return;
          const index = Math.round(slider.scrollLeft / width);
          const dots = slider.parentElement.querySelectorAll('.card-dot');
          dots.forEach((dot, idx) => dot.classList.toggle('active', idx === index));
        }, { passive: true });
      });
    }

    window.showImagePreview = (urls, startIndex = 0) => {
      if (typeof urls === 'string') urls = [urls];
      if (!urls || urls.length === 0) return;

      const modal = document.createElement('div');
      modal.className = 'image-preview-modal';
      
      modal.innerHTML = `
        <div class="image-preview-backdrop"></div>
        <div class="image-preview-inner">
          <button class="image-preview-zoom-btn" title="Увеличить">+</button>
          <button class="image-preview-close">&times;</button>
          <div class="image-preview-slider">
            ${urls.map((url, idx) => `
              <div class="image-preview-slide">
                <img src="${url}" alt="Product image preview">
              </div>
            `).join('')}
          </div>
          ${urls.length > 1 ? `
            <div class="image-preview-dots">
              ${urls.map((_, idx) => `
                <div class="image-preview-dot ${idx === startIndex ? 'active' : ''}"></div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;

      document.body.appendChild(modal);

      const slider = modal.querySelector('.image-preview-slider');
      const zoomBtn = modal.querySelector('.image-preview-zoom-btn');
      let currentIndex = startIndex;

      setTimeout(() => {
        if (slider && startIndex > 0) {
          slider.scrollLeft = startIndex * slider.clientWidth;
        }
      }, 50);

      const updateZoomState = (img, zoomIn) => {
        if (zoomIn) {
          img.classList.add('is-zoomed');
          slider.style.overflowX = 'hidden';
          if (zoomBtn) zoomBtn.textContent = '−';
        } else {
          img.classList.remove('is-zoomed');
          img.style.transform = '';
          slider.style.overflowX = 'auto';
          if (zoomBtn) zoomBtn.textContent = '+';
        }
      };

      if (zoomBtn) {
        zoomBtn.onclick = (e) => {
          e.stopPropagation();
          const slides = modal.querySelectorAll('.image-preview-slide img');
          const currentImg = slides[currentIndex];
          if (currentImg) {
            const isZoomed = currentImg.classList.contains('is-zoomed');
            updateZoomState(currentImg, !isZoomed);
          }
        };
      }

      modal.querySelectorAll('.image-preview-slide img').forEach((img) => {
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          const isZoomed = img.classList.contains('is-zoomed');
          updateZoomState(img, !isZoomed);
        });

        let panStartX = 0, panStartY = 0;
        let curPanX = 0, curPanY = 0;
        img.addEventListener('touchstart', (e) => {
          if (img.classList.contains('is-zoomed') && e.touches.length === 1) {
            panStartX = e.touches[0].clientX - curPanX;
            panStartY = e.touches[0].clientY - curPanY;
          }
        }, { passive: true });

        img.addEventListener('touchmove', (e) => {
          if (img.classList.contains('is-zoomed') && e.touches.length === 1) {
            curPanX = e.touches[0].clientX - panStartX;
            curPanY = e.touches[0].clientY - panStartY;
            img.style.transform = `scale(2.2) translate(${curPanX / 2.2}px, ${curPanY / 2.2}px)`;
          }
        }, { passive: true });
      });

      if (urls.length > 1) {
        slider.addEventListener('scroll', () => {
          const index = Math.round(slider.scrollLeft / slider.clientWidth);
          currentIndex = index;
          const dots = modal.querySelectorAll('.image-preview-dot');
          dots.forEach((dot, idx) => {
            if (idx === index) dot.classList.add('active');
            else dot.classList.remove('active');
          });
        });
      }

      const closeBtn = modal.querySelector('.image-preview-close');
      const backdrop = modal.querySelector('.image-preview-backdrop');
      
      const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => {
          modal.remove();
        }, 200);
      };

      closeBtn.onclick = closeModal;
      backdrop.onclick = closeModal;
    };

    function preprocessMarketplaces(marketplaces) {
      if (!marketplaces) return [];
      return marketplaces.map(mp => {
        if (!mp.logo_url || mp.logo_url === '' || mp.logo_url.includes('clearbit.com')) {
          const nameLower = (mp.name || '').toLowerCase();
          let domain = '';
          if (nameLower.includes('пиндуодуо') || nameLower.includes('pinduoduo')) {
            domain = 'pinduoduo.com';
          } else if (nameLower.includes('poizon') || nameLower.includes('dewu')) {
            domain = 'dewu.com';
          } else if (nameLower.includes('taobao')) {
            domain = 'taobao.com';
          } else if (nameLower.includes('1688')) {
            domain = '1688.com';
          } else if (nameLower.includes('zalando')) {
            domain = 'zalando.de';
          } else if (nameLower.includes('nike')) {
            domain = 'nike.com';
          } else if (nameLower.includes('asos')) {
            domain = 'asos.com';
          } else if (mp.website_url) {
            try {
              domain = new URL(mp.website_url).hostname;
            } catch(e) {}
          }
          if (domain) {
            mp.logo_url = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
          }
        }
        return mp;
      });
    }

    function getHeartIcon(isActive) {
      if (isActive) {
        return `<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>`;
      } else {
        return `<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>`;
      }
    }

    window.toggleProductWishlist = async function(productId, heartElement) {
      if (!window.userId) {
        window.requireAuth('Пожалуйста, авторизуйтесь для добавления в избранное.');
        return;
      }
      
      const isAdding = !wishlist.has(productId);
      
      // Оптимистичное обновление UI
      if (isAdding) {
        wishlist.add(productId);
        if (heartElement) {
          heartElement.innerHTML = getHeartIcon(true);
          heartElement.classList.add('text-red-500');
          heartElement.classList.remove('text-white/50');
        }
      } else {
        wishlist.delete(productId);
        if (heartElement) {
          heartElement.innerHTML = getHeartIcon(false);
          heartElement.classList.remove('text-red-500');
          heartElement.classList.add('text-white/50');
        }
      }
      tgUtil.haptic('light');
      delete _tabCache['wishlist:'];
      delete _tabCache['home:'];
      delete _tabCache['catalogs:'];
      updateCartBadge();

      try {
        if (isAdding) {
          const { error } = await supabaseClient.from('wishlist').insert({ user_id: window.userId, product_id: productId });
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from('wishlist').delete().eq('user_id', window.userId).eq('product_id', productId);
          if (error) throw error;
        }
        
        if (currentTab === 'wishlist') {
          renderCurrentScreen();
        }
      } catch (err) {
        console.error('Ошибка изменения избранного:', err);
        // Откатываем UI при ошибке
        if (isAdding) {
          wishlist.delete(productId);
          if (heartElement) {
            heartElement.innerHTML = getHeartIcon(false);
            heartElement.classList.remove('text-red-500');
            heartElement.classList.add('text-white/50');
          }
        } else {
          wishlist.add(productId);
          if (heartElement) {
            heartElement.innerHTML = getHeartIcon(true);
            heartElement.classList.add('text-red-500');
            heartElement.classList.remove('text-white/50');
          }
        }
        tgUtil.alert('Не удалось обновить избранное: ' + err.message);
      }
    };

    // Глобальное делегирование событий для сердечек избранного с перехватом клика
    document.addEventListener('click', (e) => {
      const heart = e.target.closest('.wishlist-heart');
      if (heart) {
        e.preventDefault();
        e.stopPropagation();
        const productId = heart.dataset.productId;
        if (productId) {
          window.toggleProductWishlist(productId, heart);
        }
      }
    }, true);

    // --- APP CACHE FOR BLAZING FAST NAVIGATION (Stale-While-Revalidate + LocalStorage) ---
    window.CacheDB = {
      data: (() => {
        try {
          const s = localStorage.getItem('ice_cache_db');
          return s ? JSON.parse(s) : {};
        } catch(e) { return {}; }
      })(),
      save() {
        try {
          localStorage.setItem('ice_cache_db', JSON.stringify(this.data));
        } catch(e) {}
      },
      async get(key, fetcher, ttl = 600000) { // 10 mins cache
        const now = Date.now();
        const cached = this.data[key];
        if (cached && (now - cached.timestamp < ttl)) {
          return cached.value;
        }
        // Instant Return: if we have cached data, return it immediately and revalidate in background
        if (cached && cached.value) {
          fetcher().then(fresh => {
            if (fresh) {
              this.data[key] = { value: fresh, timestamp: Date.now() };
              this.save();
            }
          }).catch(() => {});
          return cached.value;
        }
        try {
          const val = await fetcher();
          if (val) {
            this.data[key] = { value: val, timestamp: now };
            this.save();
          }
          return val;
        } catch(e) {
          return cached?.value || null;
        }
      },
      clear(key) { delete this.data[key]; this.save(); },
      clearAll() { this.data = {}; this.save(); }
    };

    // Tab HTML cache: store rendered innerHTML per tab for instant restore on re-visit
    const _tabCache = {};
    try {
      const _savedScreens = localStorage.getItem('ice_tab_screens_v2');
      if (_savedScreens) {
        const _parsed = JSON.parse(_savedScreens);
        if (_parsed && typeof _parsed === 'object') {
          Object.assign(_tabCache, _parsed);
        }
      }
      const _savedHome = localStorage.getItem('ice_tab_home_v2');
      if (_savedHome) _tabCache['home:'] = { html: _savedHome, ts: Date.now() };
    } catch(e) {}
    let _suppressSpinner = false;

    // ─── BLOB URL TRACKING (prevent memory leaks from photo previews) ───

    // ─── GLOBAL FOOTER EVENT DELEGATION ───
    document.addEventListener('click', (e) => {
      const footerLink = e.target.closest('.footer-link');
      if (footerLink) {
        e.preventDefault();
        const link = footerLink.getAttribute('data-link');
        if (link === 'faq') {
          currentSubScreen = 'faq';
          renderCurrentScreen();
        } else if (link === 'about') {
          currentSubScreen = 'about';
          renderCurrentScreen();
        } else if (link === 'offer') {
          downloadAgreement();
        } else {
          tgUtil.alert(footerLink.innerText + ' будет доступно позже');
        }
        return;
      }

      const socialIcon = e.target.closest('.social-icon');
      if (socialIcon) {
        e.preventDefault();
        tgUtil.alert('Соцсети будут подключены позже');
        return;
      }
    });

    const _photoBlobUrls = new Map();
    function trackBlobUrl(key, file) {
      const old = _photoBlobUrls.get(key);
      if (old) URL.revokeObjectURL(old);
      const url = URL.createObjectURL(file);
      _photoBlobUrls.set(key, url);
      return url;
    }
    function clearBlobUrls(prefix) {
      for (const [key, url] of _photoBlobUrls.entries()) {
        if (!prefix || key.startsWith(prefix)) {
          URL.revokeObjectURL(url);
          _photoBlobUrls.delete(key);
        }
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ICE LOGIX ICON SYSTEM — inline SVG icons rendered via ix(name, opts)
    // 24×24 viewBox, currentColor stroke, 2px stroke, round caps. Glass-style.
    // ═════════════════════════════════════════════════════════════════════════
    // ICON_PATHS is loaded from /js/icons-data.js
    const ICON_PATHS = window.ICON_PATHS || {};

    /**
     * Render an inline SVG icon.
     * @param {string} name - icon name from ICON_PATHS.
     * @param {object} opts - { size, cls, stroke, fill, viewBox, style }.
     * @returns {string} HTML string.
     */
    function ix(name, opts = {}) {
      const p = ICON_PATHS[name];
      if (!p) return '';
      const cls = ['ix', opts.cls || ''].filter(Boolean).join(' ');
      const sz  = opts.size || '';
      const sw  = opts.stroke ?? 2;
      const vb  = opts.viewBox || '0 0 24 24';
      const fill= opts.fill || 'none';
      const stl = opts.style ? ` style="${opts.style}"` : '';
      const szAttr = sz ? ` style="width:${sz};height:${sz}"` : '';
      return `<span class="${cls}"${szAttr}${stl}><svg viewBox="${vb}" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg></span>`;
    }

    /**
     * Render the brand snowflake as a styled SVG (replaces the ❄️ emoji
     * for non-balance places that still want a stylized snowflake).
     */
    function brandFlake(opts = {}) {
      const sz = opts.size || '1.35em';
      const cls = ['brand-flake', opts.cls || ''].filter(Boolean).join(' ');
      return `<span class="${cls}" style="width:${sz};height:${sz}" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" style="width:100%;height:100%;object-fit:contain;"></span>`;
    }

    /** Render a marketplace colored dot — replaces 🟢🟠🟡🟤⚫🔵 emoji. */
    function mpDot(color) {
      const safe = String(color || '#9CA3AF').replace(/[^#a-zA-Z0-9(),.\s]/g, '');
      return `<span class="mp-dot" style="background:${safe}" aria-hidden="true"></span>`;
    }

    /** Render a 1-5 star rating row using star icons. */
    function starRow(rating, max = 5) {
      const r = Math.max(0, Math.min(max, Number(rating) || 0));
      let html = '<span class="star-row">';
      for (let i = 1; i <= max; i++) {
        if (i <= Math.floor(r)) html += ix('star', { cls: 'ix-fill' });
        else if (i - r < 1) html += ix('starHalf', { cls: 'ix-fill' });
        else html += `<span class="ix" style="color: rgba(255,255,255,0.25)">${ix('star').replace('<span class="ix">','').replace('</span>','')}</span>`;
      }
      return html + '</span>';
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GLASS MODAL — in-app alert / confirm / popup that replaces native dialogs
    // ═════════════════════════════════════════════════════════════════════════
    let _glassModalRoot = null;
    function _ensureGlassModalRoot() {
      if (_glassModalRoot && document.body.contains(_glassModalRoot)) return _glassModalRoot;
      _glassModalRoot = document.createElement('div');
      _glassModalRoot.id = 'glassModalRoot';
      document.body.appendChild(_glassModalRoot);
      return _glassModalRoot;
    }

    /**
     * Show a glass-style modal (alert / confirm / custom buttons).
     * @param {object} opts - { title, message, kind, buttons }
     *   - title: header text (string)
     *   - message: body text (string)
     *   - kind: 'info' | 'success' | 'warning' | 'error' | 'confirm'
     *   - buttons: array of { id, label, variant: 'primary'|'danger'|'ghost'|'' }
     * @returns {Promise<string>} resolves to clicked button id (or 'ok'/'cancel').
     */
    function glassModal(opts = {}) {
      const root = _ensureGlassModalRoot();
      const kind = opts.kind || 'info';
      const iconName = ({ success: 'check', warning: 'warn', error: 'error', info: 'info', confirm: 'info' })[kind] || 'info';
      const title = opts.title || ({ success: 'Готово', warning: 'Внимание', error: 'Ошибка', info: 'Сообщение', confirm: 'Подтверждение' })[kind];
      const message = opts.message || '';
      const buttons = opts.buttons && opts.buttons.length ? opts.buttons : [{ id: 'ok', label: 'Понятно', variant: 'primary' }];

      const overlay = document.createElement('div');
      overlay.className = 'glass-modal-overlay';
      overlay.innerHTML = `
        <div class="glass-modal" role="dialog" aria-modal="true">
          <div class="glass-modal-header">
            <div class="glass-modal-icon ${kind}">${ix(iconName, { size: '24px' })}</div>
            <div class="glass-modal-title"></div>
          </div>
          <div class="glass-modal-body"></div>
          <div class="glass-modal-footer"></div>
        </div>
      `;
      overlay.querySelector('.glass-modal-title').textContent = title;
      overlay.querySelector('.glass-modal-body').textContent = message;
      const footer = overlay.querySelector('.glass-modal-footer');
      buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = 'glass-modal-btn ' + (b.variant || '');
        btn.textContent = b.label;
        btn.dataset.id = b.id;
        footer.appendChild(btn);
      });
      root.innerHTML = '';
      root.appendChild(overlay);
      // Trigger CSS transition
      requestAnimationFrame(() => overlay.classList.add('show'));

      return new Promise((resolve) => {
        const close = (id) => {
          overlay.classList.remove('show');
          setTimeout(() => { try { overlay.remove(); } catch {} resolve(id); }, 260);
        };
        footer.querySelectorAll('.glass-modal-btn').forEach((btn) => {
          btn.addEventListener('click', () => close(btn.dataset.id));
        });
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) close('cancel');
        });
      });
    }

    /** Show a non-blocking glass toast (auto-dismisses). */
    function glassToast(message, opts = {}) {
      const kind = opts.kind || 'info';
      const iconName = ({ success: 'check', warning: 'warn', error: 'error', info: 'info' })[kind] || 'info';
      const duration = opts.duration ?? 2600;
      const node = document.createElement('div');
      node.className = `glass-toast toast-${kind}`;
      node.innerHTML = `${ix(iconName, { size: '20px' })}<span></span>`;
      node.querySelector('span').textContent = String(message ?? '');
      document.body.appendChild(node);
      requestAnimationFrame(() => node.classList.add('show'));
      setTimeout(() => {
        node.classList.remove('show');
        setTimeout(() => { try { node.remove(); } catch {} }, 300);
      }, duration);
    }

    /** Heuristic to pick a glass-modal kind from message text. */
    function _guessKind(msg) {
      const s = String(msg || '');
      if (/^❌|ошибк|не уда|не удалось|сбой|fail/i.test(s)) return 'error';
      if (/^⚠|внимание|warn/i.test(s)) return 'warning';
      if (/^(✅|🎉)|готово|успешн|успех|создан|сохранён/i.test(s)) return 'success';
      return 'info';
    }
    /** Strip leading emoji prefix from a message (we render icon separately). */
    function _stripLeadEmoji(msg) {
      return String(msg || '').replace(/^[\s]*[❌⚠️✅🎉ℹ️📦🔍]+\s*/u, '').trim();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GLASS SELECT — enhances native <select> elements with a sheet picker
    // ═════════════════════════════════════════════════════════════════════════
    function _gxRenderTrigger(sel, wrap) {
      const placeholder = sel.dataset.gxPlaceholder || 'Выбрать…';
      const opt = sel.options[sel.selectedIndex];
      const value = opt && opt.value !== '' ? opt.text : '';
      const iconName = opt && opt.dataset?.icon;
      const isPlaceholder = !value;
      const trig = wrap.querySelector('.gx-select-trigger');
      const valueSpan = trig.querySelector('.gx-select-trigger-value');
      if (isPlaceholder) {
        valueSpan.textContent = placeholder;
      } else if (iconName) {
        valueSpan.innerHTML = `${ix(iconName, { size: '18px' })}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>`;
      } else {
        valueSpan.textContent = value;
      }
      trig.classList.toggle('placeholder', isPlaceholder);
    }

    function _gxOpenSheet(sel, wrap) {
      const title = sel.dataset.gxTitle || sel.previousElementSibling?.textContent?.trim() || 'Выбрать';
      const overlay = document.createElement('div');
      overlay.className = 'gx-sheet-overlay';
      overlay.innerHTML = `
        <div class="gx-sheet" role="dialog" aria-modal="true">
          <div class="gx-sheet-handle"></div>
          <div class="gx-sheet-header">
            <div class="gx-sheet-title"></div>
            <button class="gx-sheet-close" aria-label="Закрыть">${ix('x', { size: '18px' })}</button>
          </div>
          <div class="gx-sheet-search" hidden>
            ${ix('search', { size: '16px' })}
            <input type="text" placeholder="Поиск…" autocomplete="off" />
          </div>
          <div class="gx-sheet-list" role="listbox"></div>
        </div>
      `;
      overlay.querySelector('.gx-sheet-title').textContent = title;
      const list = overlay.querySelector('.gx-sheet-list');
      const search = overlay.querySelector('.gx-sheet-search');
      const searchInput = overlay.querySelector('input');
      const currentValue = sel.value;
      const options = [];
      // Walk options, supporting <optgroup>. Pick up data-icon attributes when set.
      Array.from(sel.children).forEach((child) => {
        if (child.tagName === 'OPTGROUP') {
          options.push({ group: child.label, icon: child.dataset?.icon || '' });
          Array.from(child.children).forEach((o) => {
            options.push({ value: o.value, label: o.text, icon: o.dataset?.icon || '', disabled: o.disabled });
          });
        } else {
          options.push({ value: child.value, label: child.text, icon: child.dataset?.icon || '', disabled: child.disabled });
        }
      });
      if (options.length > 8) search.hidden = false;

      const renderList = (filter = '') => {
        const q = filter.toLowerCase().trim();
        const items = [];
        let visible = 0;
        options.forEach((o) => {
          if (o.group) {
            const groupIcon = o.icon ? ix(o.icon, { size: '14px' }) : '';
            items.push(`<div class="gx-sheet-group-label">${groupIcon}<span style="margin-left:6px;vertical-align:middle">${escapeHtml(o.group)}</span></div>`);
          } else {
            if (q && !o.label.toLowerCase().includes(q)) return;
            const sel2 = (o.value === currentValue);
            const iconHtml = o.icon ? ix(o.icon, { size: '20px' }) : '';
            items.push(`<button class="gx-sheet-opt" role="option" data-value="${escapeHtml(o.value)}" aria-selected="${sel2}" ${o.disabled ? 'disabled' : ''}>
              ${iconHtml}<span class="gx-sheet-opt-label">${escapeHtml(o.label)}</span>
              <span class="gx-sheet-opt-check">${ix('check', { size: '18px' })}</span>
            </button>`);
            visible++;
          }
        });
        list.innerHTML = visible ? items.join('') : `<div class="gx-sheet-empty">Ничего не найдено</div>`;
      };

      const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      renderList();
      searchInput?.addEventListener('input', (e) => renderList(e.target.value));

      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.classList.add('show'); wrap.classList.add('open'); });

      const close = () => {
        overlay.classList.remove('show');
        wrap.classList.remove('open');
        setTimeout(() => { try { overlay.remove(); } catch {} }, 280);
      };
      overlay.querySelector('.gx-sheet-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('.gx-sheet-opt');
        if (!btn || btn.disabled) return;
        sel.value = btn.dataset.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        _gxRenderTrigger(sel, wrap);
        close();
      });
    }

    /**
     * Enhance a native <select> with a glass sheet picker.
     * Original <select> stays in DOM (hidden) so form submission and JS reads
     * (`getElementById(...).value`) keep working unchanged.
     */
    function enhanceSelect(sel) {
      if (!sel || sel.dataset.gxEnhanced) return;
      sel.dataset.gxEnhanced = '1';
      const wrap = document.createElement('div');
      wrap.className = 'gx-select-wrap';
      // Preserve any explicit className that was on the select for layout (e.g. flex-1)
      const layoutClasses = (sel.className || '').match(/\b(flex-1|min-w-0)\b/g);
      if (layoutClasses) wrap.classList.add(...layoutClasses);

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'gx-select-trigger';
      trigger.innerHTML = `<span class="gx-select-trigger-value"></span>${ix('chevronDown', { cls: 'ix-chevron', size: '18px' })}`;

      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(trigger);
      wrap.appendChild(sel);
      sel.classList.add('gx-select-native');

      _gxRenderTrigger(sel, wrap);
      trigger.addEventListener('click', (e) => { e.preventDefault(); _gxOpenSheet(sel, wrap); });
      sel.addEventListener('change', () => _gxRenderTrigger(sel, wrap));
    }

    /** Enhance every <select> in a container (default: document). */
    function enhanceAllSelects(root = document) {
      root.querySelectorAll('select:not(.gx-select-native):not([data-gx-skip])').forEach(enhanceSelect);
    }

    // Re-enhance after any DOM mutation that adds new <select> elements.
    // Lightweight observer scoped to <body> children; debounced.
    let _gxObserverScheduled = false;
    function _scheduleGxScan() {
      if (_gxObserverScheduled) return;
      _gxObserverScheduled = true;
      requestAnimationFrame(() => {
        _gxObserverScheduled = false;
        try { enhanceAllSelects(document.body); } catch {}
      });
    }
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => _scheduleGxScan()).observe(document.documentElement, { childList: true, subtree: true });
    }

    // ─── CATEGORY MAP (наименование товара) ──────────────────────────────────
    // value = текст, который сохраняется в БД и показывается в карточке
    // broad = широкая категория для weight_standards / отчётов / каталога площадок
    // defaultWeight = подставится в поле «Вес» если weight_standards не нашёл точное совпадение
    // .icon: name from ICON_PATHS — rendered as inline SVG in glass-select picker.
    // (Native <option> elements can't render SVG, so the dropdown that's visible
    // is the glass-style sheet, which reads data-icon from each option.)
    const CATEGORY_MAP = [
      // Обувь
      { value: 'Кроссовки',  icon: 'sneaker', broad: 'Обувь',       defaultWeight: 1.2 },
      { value: 'Кеды',       icon: 'sneaker', broad: 'Обувь',       defaultWeight: 0.9 },
      { value: 'Боты',       icon: 'boot',    broad: 'Обувь',       defaultWeight: 1.5 },
      { value: 'Ботинки',    icon: 'boot',    broad: 'Обувь',       defaultWeight: 1.4 },
      { value: 'Сандалии',   icon: 'sandal',  broad: 'Обувь',       defaultWeight: 0.6 },
      { value: 'Туфли',      icon: 'shoe',    broad: 'Обувь',       defaultWeight: 0.9 },
      // Одежда
      { value: 'Футболка',   icon: 'tshirt',  broad: 'Одежда',      defaultWeight: 0.3 },
      { value: 'Поло',       icon: 'tshirt',  broad: 'Одежда',      defaultWeight: 0.35 },
      { value: 'Худи',       icon: 'jacket',  broad: 'Одежда',      defaultWeight: 0.7 },
      { value: 'Свитшот',    icon: 'jacket',  broad: 'Одежда',      defaultWeight: 0.6 },
      { value: 'Толстовка',  icon: 'jacket',  broad: 'Одежда',      defaultWeight: 0.7 },
      { value: 'Джинсы',     icon: 'pants',   broad: 'Одежда',      defaultWeight: 0.7 },
      { value: 'Брюки',      icon: 'pants',   broad: 'Одежда',      defaultWeight: 0.6 },
      { value: 'Шорты',      icon: 'shorts',  broad: 'Одежда',      defaultWeight: 0.4 },
      { value: 'Куртка',     icon: 'jacket',  broad: 'Одежда',      defaultWeight: 1.0 },
      { value: 'Пуховик',    icon: 'jacket',  broad: 'Одежда',      defaultWeight: 1.5 },
      { value: 'Пальто',     icon: 'jacket',  broad: 'Одежда',      defaultWeight: 1.6 },
      { value: 'Платье',     icon: 'dress',   broad: 'Одежда',      defaultWeight: 0.5 },
      { value: 'Юбка',       icon: 'dress',   broad: 'Одежда',      defaultWeight: 0.4 },
      { value: 'Костюм',     icon: 'suit',    broad: 'Одежда',      defaultWeight: 1.5 },
      { value: 'Купальник',  icon: 'swim',    broad: 'Одежда',      defaultWeight: 0.2 },
      // Аксессуары
      { value: 'Рюкзак',     icon: 'backpack',    broad: 'Аксессуары',  defaultWeight: 1.0 },
      { value: 'Сумка',      icon: 'bagHandle',   broad: 'Аксессуары',  defaultWeight: 0.7 },
      { value: 'Кошелёк',    icon: 'walletSmall', broad: 'Аксессуары',  defaultWeight: 0.2 },
      { value: 'Ремень',     icon: 'belt',        broad: 'Аксессуары',  defaultWeight: 0.3 },
      { value: 'Часы',       icon: 'watch',       broad: 'Аксессуары',  defaultWeight: 0.4 },
      { value: 'Очки',       icon: 'sunglasses',  broad: 'Аксессуары',  defaultWeight: 0.2 },
      { value: 'Шапка',      icon: 'cap',         broad: 'Аксессуары',  defaultWeight: 0.2 },
      { value: 'Бижутерия',  icon: 'ring',        broad: 'Аксессуары',  defaultWeight: 0.1 },
      { value: 'Парфюм',     icon: 'flower',      broad: 'Аксессуары',  defaultWeight: 0.5 },
      { value: 'Косметика',  icon: 'cosmetic',    broad: 'Аксессуары',  defaultWeight: 0.5 },
      { value: 'Электроника',icon: 'smartphone',  broad: 'Аксессуары',  defaultWeight: 1.0 },
      { value: 'Другое',     icon: 'box',         broad: 'Аксессуары',  defaultWeight: 0.5 },
    ];
    // Group → icon name (rendered via ix() in glass-select sheet).
    const CATEGORY_GROUP_ICONS = { 'Обувь': 'sneaker', 'Одежда': 'tshirt', 'Аксессуары': 'briefcase' };
    // Иерархическая выборка через optgroup: 3 группы (Обувь / Одежда / Аксессуары)
    // Note: native <option> can't render SVG, so the visible UI is the glass-sheet
    // picker which reads data-icon from each option. The plain `value` is what's
    // submitted to forms / what JS reads (no emoji prefix).
    function renderCategoryOptions() {
      const groups = ['Обувь', 'Одежда', 'Аксессуары'];
      let html = '<option value="">— наименование товара —</option>';
      for (const g of groups) {
        const items = CATEGORY_MAP.filter(c => c.broad === g);
        if (!items.length) continue;
        html += `<optgroup label="${g}" data-icon="${CATEGORY_GROUP_ICONS[g] || ''}">`;
        for (const c of items) {
          html += `<option value="${c.value}" data-icon="${c.icon}" data-broad="${c.broad}" data-default-weight="${c.defaultWeight}">${c.value}</option>`;
        }
        html += '</optgroup>';
      }
      return html;
    }
    function getCategoryBroad(specific) {
      const it = CATEGORY_MAP.find(c => c.value === specific);
      return it ? it.broad : (specific || null);
    }

    // ─── 2-step category UI ──────────────────────────────────────────────────
    // Превращает существующий <select id="..."> в двухуровневый выбор:
    //   шаг 1 — Обувь / Одежда / Аксессуары (broad-select добавлен сверху)
    //   шаг 2 — конкретное наименование (master-select, опции отфильтрованы)
    // Это менее перегруженно для мобильного UX и стилистически чище.
    function enhanceCategoryTwoStep(selectId) {
      const master = document.getElementById(selectId);
      if (!master || master.dataset.twoStepEnhanced === '1') return;
      master.dataset.twoStepEnhanced = '1';

      const groups = ['Обувь', 'Одежда', 'Аксессуары'];

      // Создаём broad-select
      const broad = document.createElement('select');
      broad.id = selectId + 'Broad';
      broad.className = master.className;
      broad.innerHTML = '<option value="">— тип товара —</option>' +
        groups.map(g => `<option value="${g}" data-icon="${CATEGORY_GROUP_ICONS[g] || ''}">${g}</option>`).join('');

      // Вставляем перед master
      master.parentNode.insertBefore(broad, master);

      // Сохраняем оригинальный HTML опций для восстановления
      const originalHTML = master.innerHTML;

      // Изначально master скрыт (broad ещё не выбран)
      master.style.display = 'none';

      function rebuildSpecific(broadValue) {
        if (!broadValue) {
          master.innerHTML = originalHTML;
          master.style.display = 'none';
          master.value = '';
          return;
        }
        const items = CATEGORY_MAP.filter(c => c.broad === broadValue);
        let html = `<option value="">— конкретное наименование —</option>`;
        for (const c of items) {
          html += `<option value="${c.value}" data-icon="${c.icon}" data-broad="${c.broad}" data-default-weight="${c.defaultWeight}">${c.value}</option>`;
        }
        master.innerHTML = html;
        master.style.display = '';
        master.value = '';
      }

      // Если master уже имел выбранное значение (например, прилетело из парсера)
      const initial = master.value;
      if (initial) {
        const broadVal = getCategoryBroad(initial);
        if (broadVal) {
          broad.value = broadVal;
          rebuildSpecific(broadVal);
          master.value = initial;
        }
      }

      broad.addEventListener('change', () => {
        rebuildSpecific(broad.value);
        // Триггерим событие на master чтобы существующие onchange-хендлеры (вес и т.д.) сработали
        master.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Также если кто-то снаружи задаёт master.value программно (парсер) — поддержим broad
      const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      Object.defineProperty(master, 'value', {
        get() { return origDescriptor.get.call(this); },
        set(v) {
          const broadVal = getCategoryBroad(v);
          if (broadVal && broad.value !== broadVal) {
            broad.value = broadVal;
            rebuildSpecific(broadVal);
          }
          origDescriptor.set.call(this, v);
        },
        configurable: true,
      });
    }

    window.updateCategoryHint = (selectId, hintId) => {
      const selectEl = document.getElementById(selectId);
      const hintEl = document.getElementById(hintId);
      if (!selectEl || !hintEl) return;
      const opt = selectEl.options[selectEl.selectedIndex];
      if (opt && opt.dataset.defaultWeight) {
        hintEl.innerText = `💡 Обычно весит ~${opt.dataset.defaultWeight} кг`;
        hintEl.classList.remove('hidden');
      } else {
        hintEl.classList.add('hidden');
      }
    };

    // ─── ВАЛИДАЦИЯ ЗАКАЗА перед отправкой ────────────────────────────────────
    // Особенно важно для режима «Вручную» — там данные не проходят парсер.
    // Возвращает массив ошибок (пустой = всё ок).
    const ALLOWED_MARKETPLACE_HOSTS = [
      'poizon.com', 'dewu.com', 'taobao.com', 'tmall.com', '1688.com', 'jd.com', 'xianyu.com',
      'zalando.pl', 'zalando.de', 'zalando.com', 'zalando-lounge.pl', 'asos.com', 'farfetch.com',
      'aboutyou.com', 'aboutyou.de', 'sneakerstudio.com', 'endclothing.com', 'ssense.com',
      'wildberries.ru', 'wildberries.by', 'ozon.ru', 'lamoda.ru', 'lamoda.by',
      'amazon.com', 'amazon.de', 'amazon.co.uk', 'ebay.com', 'aliexpress.com', 'aliexpress.ru',
      'shein.com', 'temu.com', 'h-m.com', 'hm.com', 'uniqlo.com',
    ];
    // Разумные диапазоны цены по валюте (в исходной валюте)
    const PRICE_RANGES = {
      CNY: [10, 50000], USD: [3, 5000], EUR: [3, 5000], GBP: [3, 5000],
      RUB: [100, 500000], BYN: [3, 15000], PLN: [10, 20000],
      JPY: [300, 500000], KRW: [3000, 5000000],
    };
    function validateOrderBeforeSubmit(order) {
      const errors = [];
      if (!order) { errors.push('Нет данных заказа'); return errors; }

      // 1. Цена
      const price = parseFloat(order.price);
      if (!isFinite(price) || price <= 0) {
        errors.push('Укажите цену товара (число > 0)');
      } else {
        const range = PRICE_RANGES[order.currency];
        if (range && (price < range[0] || price > range[1])) {
          errors.push(`Цена ${price} ${order.currency} вне разумного диапазона (${range[0]}–${range[1]}). Уверены что цена в ${order.currency}?`);
        }
      }

      // 2. Валюта
      if (!order.currency) errors.push('Выберите валюту');

      // 3. Вес
      const weight = parseFloat(order.weight);
      if (!isFinite(weight) || weight <= 0) {
        errors.push('Укажите вес (> 0 кг)');
      } else if (weight < 0.05) {
        errors.push('Вес слишком маленький (минимум 0.05 кг)');
      } else if (weight > 30) {
        errors.push('Вес слишком большой (максимум 30 кг — мы не возим грузовые)');
      }

      // 4. Категория
      if (!order.category) errors.push('Выберите наименование товара');

      // 5. Страна
      if (!order.country) errors.push('Выберите страну площадки');

      // 6. URL — если введён, должен быть валидным http(s)://
      const url = (order.url || '').trim();
      if (url) {
        try {
          const u = new URL(url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            errors.push('Ссылка должна начинаться с http:// или https://');
          } else {
            // Проверка домена (warning, не ошибка — мы не хотим блокировать неизвестные площадки)
            const host = u.hostname.toLowerCase().replace(/^www\./, '');
            const isKnown = ALLOWED_MARKETPLACE_HOSTS.some(h => host === h || host.endsWith('.' + h));
            if (!isKnown && !window.confirm(`Площадка ${host} не из нашего списка. Продолжить?`)) {
              errors.push('Подтверждение площадки отменено');
            }
          }
        } catch {
          errors.push('Ссылка не похожа на валидный URL');
        }
      }

      // 7. Кросс-проверка валюта ⇄ страна (мягкая — warning, не блокируем)
      const COUNTRY_DEFAULT_CURRENCY = { CN: 'CNY', PL: 'PLN', DE: 'EUR', UK: 'GBP', US: 'USD', RU: 'RUB', BY: 'BYN', JP: 'JPY', KR: 'KRW', EU: 'EUR' };
      if (order.country && order.currency && COUNTRY_DEFAULT_CURRENCY[order.country] && COUNTRY_DEFAULT_CURRENCY[order.country] !== order.currency) {
        const expected = COUNTRY_DEFAULT_CURRENCY[order.country];
        const ok = window.confirm(`Странно: страна ${order.country} обычно использует ${expected}, а вы выбрали ${order.currency}. Продолжить?`);
        if (!ok) errors.push('Несоответствие валюты и страны');
      }

      return errors;
    }
    function getCategoryDefaultWeight(specific) {
      const it = CATEGORY_MAP.find(c => c.value === specific);
      return it ? it.defaultWeight : null;
    }
    // Подбираем option в селекте по значению. Если LLM вернул широкую категорию ("Обувь"),
    // подставляем первое наименование с тем же broad. Если ничего не найдено — возвращает null.
    function findCategoryOption(selectEl, raw) {
      if (!selectEl || !raw) return null;
      const opts = Array.from(selectEl.options);
      const exact = opts.find(o => o.value === raw);
      if (exact) return exact;
      // Сравним без регистра
      const ci = opts.find(o => o.value.toLowerCase() === String(raw).toLowerCase());
      if (ci) return ci;
      // Если raw = широкая категория — берём первое наименование с таким broad
      const broadMatch = opts.find(o => o.dataset && o.dataset.broad === raw);
      if (broadMatch) return broadMatch;
      return null;
    }

    // ==================== PREMIUM CODES & CONSTANTS ====================
    // PVS_DATA is loaded from /js/pvz-data.js
    const PVS_DATA = window.PVS_DATA || {};

    const FORTUNE_REWARDS = [
      { text: '5 ❄️', type: 'ice', value: 5, color: '#3A86F0', weight: 40 },
      { text: '10 ❄️', type: 'ice', value: 10, color: '#00F2FE', weight: 25 },
      { text: '20 ❄️', type: 'ice', value: 20, color: '#7000FF', weight: 10 },
      { text: 'Скидка 5%', type: 'promo', value: 'ICE5', color: '#FF007F', weight: 10 },
      { text: 'Скидка 10%', type: 'promo', value: 'ICE10', color: '#FF7F00', weight: 5 },
      { text: 'Доставка 0', type: 'delivery', value: 'FREE', color: '#00FF7F', weight: 5 },
      { text: 'Повезет завтра', type: 'try_again', value: null, color: '#7F7F7F', weight: 5 }
    ];

    function getFortuneSpinCooldown() {
      const lastSpin = window.userSettings?.last_fortune_spin;
      if (!lastSpin) return 0;
      const elapsed = Date.now() - new Date(lastSpin).getTime();
      const cooldown = 24 * 60 * 60 * 1000;
      return Math.max(0, cooldown - elapsed);
    }

    function getAISizeRecommendation(category, height, weight, measure, brand = '') {
      if (!height && !weight && !measure) return null;
      
      const isShoes = ['Обувь', 'Кеды', 'Кроссовки', 'Ботинки', 'Сланцы', 'shoes', 'sneakers', 'boots', 'sandals'].some(keyword => 
        category.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isShoes) {
        if (measure) {
          const cm = parseFloat(measure);
          let eu = 35 + Math.round((cm - 22) * 1.5);
          let us = 4 + Math.round((cm - 22) * 1.0);
          return `Рекомендуем размер **EU ${eu}** / **US ${us}** (длина стельки ${cm} см).`;
        }
        return `Укажите длину стельки в см для точного подбора обуви.`;
      }
      
      if (height && weight) {
        const h = parseInt(height);
        const w = parseFloat(weight);
        
        let size = 'M';
        if (h < 165 && w < 55) size = 'XS';
        else if (h < 172 && w < 65) size = 'S';
        else if (h < 178 && w < 75) size = 'M';
        else if (h < 185 && w < 85) size = 'L';
        else if (h < 192 && w < 95) size = 'XL';
        else size = 'XXL';
        
        let advice = `Рекомендуем размер **${size}** на основе вашего роста (${h} см) и веса (${w} кг).`;
        if (brand) {
          advice += ` Внимание: бренд ${brand} может маломерить, если сомневаетесь — берите на размер больше.`;
        }
        return advice;
      }
      
      return `Заполните рост и вес (для одежды) или стельку (для обуви) для автоподбора размера.`;
    }

    async function showWheelOfFortuneModal() {
      if (!window.userId) { window.requireAuth('Авторизуйтесь, чтобы крутить Колесо Фортуны и выигрывать призы!'); return; }
      const cd = getFortuneSpinCooldown();
      if (cd > 0) {
        glassToast('Колесо Фортуны доступно один раз в 24 часа!', { kind: 'error' });
        return;
      }

      tgUtil.haptic('impact');

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[120] p-4';
      modal.innerHTML = `
        <div class="glass-card alert-modal-card max-w-sm w-full p-5 text-center flex flex-col items-center relative overflow-hidden border border-white/20 shadow-2xl" style="background: rgba(15, 23, 42, 0.9);">
          <div class="absolute -left-20 -top-20 w-44 h-44 rounded-full blur-3xl opacity-30" style="background: var(--ice-primary);"></div>
          <div class="absolute -right-20 -bottom-20 w-44 h-44 rounded-full blur-3xl opacity-20" style="background: #8B5CF6;"></div>

          <div class="w-full flex justify-between items-center mb-4 relative z-10">
            <h3 class="text-white font-bold text-base flex items-center gap-1.5">
              🔮 Колесо Удачи
            </h3>
            <button id="closeFortuneModalBtn" class="text-white/50 hover:text-white transition-colors text-lg">&times;</button>
          </div>

          <div class="relative w-[300px] h-[300px] my-4 flex items-center justify-center">
            <canvas id="fortuneWheelCanvas" width="300" height="300" class="w-[300px] h-[300px]"></canvas>
          </div>

          <p id="fortuneStatusText" class="text-white/80 text-sm font-semibold mb-5 h-5 relative z-10">Испытайте вашу удачу!</p>

          <button id="startFortuneSpinBtn" class="btn-primary w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 shadow-lg relative z-10" style="background: linear-gradient(135deg, var(--ice-primary), #8B5CF6); border: none;">
            🔮 ЗАПУСТИТЬ КОЛЕСО!
          </button>
        </div>
      `;
      document.body.appendChild(modal);

      const canvas = document.getElementById('fortuneWheelCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const drawWheel = (rotation) => {
        const size = 300;
        const radius = size / 2;
        ctx.clearRect(0, 0, size, size);
        
        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(rotation);
        
        const N = FORTUNE_REWARDS.length;
        const segmentAngle = (2 * Math.PI) / N;
        
        for (let i = 0; i < N; i++) {
          const r = FORTUNE_REWARDS[i];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius - 10, i * segmentAngle, (i + 1) * segmentAngle);
          ctx.closePath();
          
          const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
          grad.addColorStop(0, '#0F172A');
          grad.addColorStop(1, r.color);
          ctx.fillStyle = grad;
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          ctx.save();
          ctx.rotate(i * segmentAngle + segmentAngle / 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px Nunito';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4;
          ctx.fillText(r.text, radius - 25, 0);
          ctx.restore();
        }
        
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(radius, radius, 22, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(radius, radius, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(radius - 10, 10);
        ctx.lineTo(radius + 10, 10);
        ctx.lineTo(radius, 28);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      let currentRotation = 0;
      drawWheel(currentRotation);

      const closeModal = () => modal.remove();
      document.getElementById('closeFortuneModalBtn').onclick = closeModal;

      const spinBtn = document.getElementById('startFortuneSpinBtn');
      if (spinBtn) {
        spinBtn.onclick = async () => {
          spinBtn.disabled = true;
          spinBtn.innerText = 'Крутится...';
          spinBtn.style.opacity = '0.7';
          const closeBtn = document.getElementById('closeFortuneModalBtn');
          if (closeBtn) closeBtn.style.display = 'none';

          const rand = Math.random() * 100;
          let sum = 0;
          let targetIndex = 0;
          for (let i = 0; i < FORTUNE_REWARDS.length; i++) {
            sum += FORTUNE_REWARDS[i].weight;
            if (rand <= sum) {
              targetIndex = i;
              break;
            }
          }
          const reward = FORTUNE_REWARDS[targetIndex];

          const N = FORTUNE_REWARDS.length;
          const segmentAngle = (2 * Math.PI) / N;
          const stopAngle = (1.5 * Math.PI) - (targetIndex + 0.5) * segmentAngle + (10 * Math.PI);

          let startTime = null;
          const duration = 4000;
          let lastSpunSegment = -1;

          const animate = async (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            currentRotation = easeOut * stopAngle;
            
            const currentSegment = Math.floor(((1.5 * Math.PI - currentRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) / segmentAngle);
            if (currentSegment !== lastSpunSegment) {
              tgUtil.haptic('light');
              lastSpunSegment = currentSegment;
            }

            drawWheel(currentRotation);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              tgUtil.haptic('success');
              
              try {
                const nowStr = new Date().toISOString();
                const updatedSettings = {
                  ...window.userSettings,
                  last_fortune_spin: nowStr
                };

                let updateData = { settings: updatedSettings };
                let resultText = '';

                if (reward.type === 'ice') {
                  const addedIce = reward.value;
                  const newBalance = balance + addedIce;
                  updateData.ices_balance = newBalance;
                  balance = newBalance;
                  document.getElementById('headerBalance').innerText = newBalance;
                  resultText = `🎉 Вы выиграли ${addedIce} ICE!`;
                } else if (reward.type === 'promo') {
                  const promoPercent = reward.value === 'ICE5' ? 5 : 10;
                  const generatedPromo = 'ICE' + promoPercent + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                  
                  const { error: promoErr } = await supabaseClient.from('promocodes').insert({
                    code: generatedPromo,
                    discount_type: 'percent',
                    discount_value: promoPercent,
                    is_active: true
                  });
                  if (promoErr) throw promoErr;
                  
                  resultText = `🎉 Промокод на ${promoPercent}%: ${generatedPromo}`;
                } else if (reward.type === 'delivery') {
                  updatedSettings.free_delivery_tokens = (updatedSettings.free_delivery_tokens || 0) + 1;
                  updateData.settings = updatedSettings;
                  resultText = `🎉 Бесплатная доставка на следующий заказ!`;
                } else {
                  resultText = `🍀 Повезет завтра! Удачи!`;
                }

                const { error: userUpErr } = await supabaseClient.from('users').update(updateData).eq('user_id', userId);
                if (userUpErr) throw userUpErr;

                window.userSettings = updatedSettings;

                const statusTextEl = document.getElementById('fortuneStatusText');
                if (statusTextEl) {
                  statusTextEl.innerHTML = `<span class="text-green-400 font-bold">${resultText}</span>`;
                  statusTextEl.classList.add('scale-105');
                }
                
                spinBtn.innerText = 'Отлично!';
                spinBtn.disabled = false;
                spinBtn.style.opacity = '1';
                spinBtn.onclick = () => {
                  closeModal();
                  renderCurrentScreen();
                };

              } catch (dbErr) {
                console.error('Error saving fortune reward:', dbErr);
                glassToast('Ошибка награды: ' + dbErr.message, { kind: 'error' });
                spinBtn.innerText = 'Закрыть';
                spinBtn.disabled = false;
                spinBtn.onclick = closeModal;
              }
            }
          };

          requestAnimationFrame(animate);
        };
      }
    }

    window.onTelegramAuth = async function(user) {
      const errEl = document.getElementById('authErrorMsg');
      if(errEl) errEl.classList.add('hidden');
      try {
        const res = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgetData: user })
        });
        const data = await res.json();
        if (data.ok && data.session) {
          await supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
          const overlay = document.querySelector('.fixed.inset-0.bg-black\\/90');
          if (overlay && typeof handleAuthSuccess === 'function') await handleAuthSuccess(overlay);
          else location.reload();
        } else {
          throw new Error(data.error || 'Ошибка входа');
        }
      } catch(e) {
        if(errEl) {
          errEl.textContent = e.message || 'Ошибка Telegram Widget';
          errEl.classList.remove('hidden');
        } else {
          tgUtil.alert(e.message || 'Ошибка Telegram Widget');
        }
      }
    };

    let tg = null, userId = null, userName = 'Гость', userAvatarUrl = null, isOwner = false, supabaseClient = null;
    let isRegistered = false;
    let balance = 0;
    try {
      const _cu = localStorage.getItem('ice_cached_user');
      if (_cu) {
        const _parsed = JSON.parse(_cu);
        if (_parsed) {
          if (_parsed.isRegistered) isRegistered = true;
          if (_parsed.userId) userId = _parsed.userId;
          if (_parsed.userName) userName = _parsed.userName;
          if (_parsed.balance !== undefined) balance = _parsed.balance;
          if (_parsed.userAvatarUrl) userAvatarUrl = _parsed.userAvatarUrl;
          if (_parsed.isOwner !== undefined) isOwner = _parsed.isOwner;
        }
      }
    } catch(e) {}
    window._currentAppliedTheme = 'dark';

    Object.defineProperty(window, 'userId', {
      get() { return userId; },
      set(val) { userId = val; }
    });
    let originalAdminId = null;
    let isShadowMode = false;
    let adminAuthenticated = false;
    window.adminCache = null;
    window.invalidateAdminCache = function() {
      window.adminCache = null;
    };
    let currentTab = null, previousTab = null, currentSubScreen = null;

    // ==================== Telegram WebApp native helpers ====================
    // Wraps Telegram.WebApp APIs with graceful fallback to browser primitives.
    // Use tgUtil.alert / tgUtil.confirm / tgUtil.haptic / tgUtil.popup throughout the app.
    const tgUtil = {
      get _tg() { return window.Telegram?.WebApp || null; },

      alert(message, callback) {
        const msg = String(message ?? '');
        const kind = _guessKind(msg);
        const body = _stripLeadEmoji(msg);
        try {
          glassModal({ kind, message: body }).then(() => { if (typeof callback === 'function') callback(); });
          return;
        } catch (_) {}
        const w = this._tg;
        if (w?.showAlert) {
          try { w.showAlert(msg, callback); return; } catch {}
        }
        window.alert(msg);
        if (typeof callback === 'function') callback();
      },

      confirm(message) {
        const msg = String(message ?? '');
        return new Promise((resolve) => {
          try {
            glassModal({
              kind: 'confirm',
              message: _stripLeadEmoji(msg),
              buttons: [
                { id: 'cancel', label: 'Отмена', variant: 'ghost' },
                { id: 'ok',     label: 'Продолжить', variant: 'primary' },
              ],
            }).then((id) => resolve(id === 'ok'));
            return;
          } catch (_) {}
          const w = this._tg;
          if (w?.showConfirm) {
            try { w.showConfirm(msg, (ok) => resolve(!!ok)); return; } catch {}
          }
          resolve(window.confirm(msg));
        });
      },

      // Haptic feedback disabled per user request
      haptic(type) {
        // Disabled: no device vibrations
        return;
      },

      // Rich popup with up to 3 buttons — uses our glass modal by default.
      popup(opts) {
        return new Promise((resolve) => {
          try {
            const o = opts || {};
            const kind = o.kind || _guessKind(o.message || o.title || '');
            const buttons = (Array.isArray(o.buttons) && o.buttons.length)
              ? o.buttons.map((b) => ({
                  id: b.id || b.text || 'ok',
                  label: b.text || b.label || 'OK',
                  variant: b.type === 'destructive' ? 'danger' : (b.type === 'cancel' ? 'ghost' : 'primary'),
                }))
              : [{ id: 'ok', label: 'Понятно', variant: 'primary' }];
            glassModal({ kind, title: o.title, message: _stripLeadEmoji(o.message || ''), buttons }).then((id) => resolve(id || null));
            return;
          } catch (_) {}
          const w = this._tg;
          if (w?.showPopup) {
            try { w.showPopup(opts, (id) => resolve(id ?? null)); return; } catch {}
          }
          window.alert(opts?.message || opts?.title || '');
          resolve(null);
        });
      },

      // Non-blocking toast notification (auto-dismisses).
      toast(message, opts = {}) {
        try { glassToast(message, opts); } catch {}
      },

      // Telegram's offClick(cb) removes a listener by reference (=== comparison).
      // We must remember the exact handler we registered, otherwise the listener
      // accumulates on each call and every back-button tap fires N times.
      _bbHandler: null,
      _mbHandler: null,

      // Wires Telegram's native BackButton in the header. Replaces in-page back UI.
      setBackButton(handler) {
        const bb = this._tg?.BackButton;
        if (!bb) return;
        try {
          if (this._bbHandler) bb.offClick(this._bbHandler);
          this._bbHandler = null;
          if (handler) {
            this._bbHandler = handler;
            bb.onClick(handler);
            bb.show();
          } else {
            bb.hide();
          }
        } catch {}
      },

      // Wires Telegram's native MainButton (sticky bottom button).
      setMainButton({ text, onClick, color, textColor, isLoading } = {}) {
        const mb = this._tg?.MainButton;
        if (!mb) return;
        try {
          if (this._mbHandler) mb.offClick(this._mbHandler);
          this._mbHandler = null;
          if (!text || !onClick) { mb.hide(); return; }
          mb.setText(text);
          if (color) mb.color = color;
          if (textColor) mb.textColor = textColor;
          if (isLoading) mb.showProgress(false); else mb.hideProgress();
          this._mbHandler = onClick;
          mb.onClick(onClick);
          mb.enable();
          mb.show();
        } catch {}
      },

      hideMainButton() {
        const mb = this._tg?.MainButton;
        try {
          mb?.hide();
          if (this._mbHandler && mb) mb.offClick(this._mbHandler);
          this._mbHandler = null;
        } catch {}
      },

      // CloudStorage with localStorage fallback.
      async cloudGet(key) {
        const cs = this._tg?.CloudStorage;
        if (cs?.getItem) {
          return new Promise((resolve) => {
            try { cs.getItem(key, (err, value) => resolve(err ? null : (value ?? null))); }
            catch { resolve(null); }
          });
        }
        try { return localStorage.getItem(key); } catch { return null; }
      },
      async cloudSet(key, value) {
        const cs = this._tg?.CloudStorage;
        if (cs?.setItem) {
          return new Promise((resolve) => {
            try { cs.setItem(key, String(value ?? ''), (err) => resolve(!err)); }
            catch { resolve(false); }
          });
        }
        try { localStorage.setItem(key, String(value ?? '')); return true; } catch { return false; }
      },
      async cloudRemove(key) {
        const cs = this._tg?.CloudStorage;
        if (cs?.removeItem) {
          return new Promise((resolve) => {
            try { cs.removeItem(key, (err) => resolve(!err)); }
            catch { resolve(false); }
          });
        }
        try { localStorage.removeItem(key); return true; } catch { return false; }
      },
      openLink(url) {
        if (!url) return;
        try {
          const w = this._tg;
          if (w?.openLink) {
            w.openLink(url);
            return;
          }
        } catch (_) {}
        window.open(url, '_blank');
      },
    };
    window.tgUtil = tgUtil;
    // ==================== /Telegram WebApp native helpers ====================

    let adminOrdersMode = 'active'; // 'active' или 'archived'
    let adminOrdersPage = 1;
let adminOrdersFilter = 'all';
let adminOrdersTotalPages = 1;
    let userLimits = { dailyCount: 0, lastDate: null, isTrusted: false };
    let userPaidOrdersCount = 0;
    
    const ALL_COUNTRIES = [
      { code: 'CN', name: 'Китай', platforms: 'Poizon, Taobao, 1688', flag: '🇨🇳', desc: 'Огромный выбор, лучшие цены на оригиналы', active: true },
      { code: 'RU', name: 'Россия', platforms: 'WB, Ozon, Lamoda', flag: '🇷🇺', desc: 'Сверхбыстрая доставка, без пошлин ЕАЭС', active: false },
      { code: 'EU', name: 'Евросоюз', platforms: 'Zalando, ASOS, Farfetch', flag: '🇪🇺', desc: '100% оригинальные европейские коллекции', active: false },
      { code: 'US', name: 'США', platforms: 'StockX, eBay, Amazon', flag: '🇺🇸', desc: 'Доставка брендовых вещей из-за океана', active: false },
      { code: 'TR', name: 'Турция', platforms: 'Trendyol, Zara, H&M', flag: '🇹🇷', desc: 'Выгодный шопинг из турецких магазинов', active: false },
      { code: 'JP', name: 'Япония', platforms: 'Mercari, Yahoo, Rakuten', flag: '🇯🇵', desc: 'Уникальные товары и аукционы Японии', active: false },
      { code: 'KR', name: 'Южная Корея', platforms: 'Kream, Musinsa, Coupang', flag: '🇰🇷', desc: 'Корейская мода и косметика напрямую', active: false },
      { code: 'VN', name: 'Вьетнам', platforms: 'Shopee, Lazada, Tiki', flag: '🇻🇳', desc: 'Доступные цены из местных маркетплейсов', active: false },
      { code: 'AE', name: 'ОАЭ', platforms: 'Amazon, Noon, Ounass', flag: '🇦🇪', desc: 'Доставка из торговых центров и сайтов Дубая', active: false }
    ];

    const LIMITS_CONFIG = {
      guest: { manual: 3, ai: 1 },
      registered: {
        manual: Infinity,
        ai: (ordersCount) => {
          if (ordersCount >= 7) return 50;
          if (ordersCount >= 3) return 30;
          if (ordersCount >= 1) return 15;
          return 3;
        }
      }
    };

    const tgCloudStorage = {
      setItem(key, val) {
        return new Promise((resolve) => {
          try {
            const tg = window.Telegram?.WebApp;
            if (tg?.CloudStorage?.setItem) {
              tg.CloudStorage.setItem(key, String(val), (err, success) => {
                resolve(success);
              });
            } else {
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      },
      getItem(key) {
        return new Promise((resolve) => {
          try {
            const tg = window.Telegram?.WebApp;
            if (tg?.CloudStorage?.getItem) {
              tg.CloudStorage.getItem(key, (err, val) => {
                resolve(val || null);
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      }
    };

    async function getGuestLimitData() {
      const today = new Date().toDateString();
      const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'browser';
      const cloudKey = `ice_guest_limit_data_${tgUserId}`;
      const localKey = 'ice_guest_limit_data';
      
      let data = null;
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) data = JSON.parse(raw);
      } catch (e) {}
      
      if (window.Telegram?.WebApp?.CloudStorage) {
        try {
          const cloudRaw = await tgCloudStorage.getItem(cloudKey);
          if (cloudRaw) {
            const cloudData = JSON.parse(cloudRaw);
            if (!data || (cloudData.date === today && data.date !== today) || (cloudData.date === today && cloudData.ai_count > data.ai_count)) {
              data = cloudData;
            }
          }
        } catch (e) {}
      }
      
      if (!data || data.date !== today) {
        data = {
          date: today,
          manual_count: 0,
          ai_count: 0
        };
      }
      return data;
    }

    async function saveGuestLimitData(data) {
      const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'browser';
      const cloudKey = `ice_guest_limit_data_${tgUserId}`;
      const localKey = 'ice_guest_limit_data';
      
      const raw = JSON.stringify(data);
      try {
        localStorage.setItem(localKey, raw);
      } catch (e) {}
      
      if (window.Telegram?.WebApp?.CloudStorage) {
        try {
          await tgCloudStorage.setItem(cloudKey, raw);
        } catch (e) {}
      }
    }

    async function getCalculatorLimits() {
      const today = new Date().toDateString();
      
      if (!userId) {
        const guestData = await getGuestLimitData();
        const maxManual = LIMITS_CONFIG.guest.manual;
        const maxAi = LIMITS_CONFIG.guest.ai;
        
        return {
          isRegistered: false,
          manual: {
            current: guestData.manual_count,
            max: maxManual,
            remaining: Math.max(0, maxManual - guestData.manual_count),
            allowed: guestData.manual_count < maxManual
          },
          ai: {
            current: guestData.ai_count,
            max: maxAi,
            remaining: Math.max(0, maxAi - guestData.ai_count),
            allowed: guestData.ai_count < maxAi
          }
        };
      } else {
        let currentCount = userLimits.dailyCount;
        let lastDate = userLimits.lastDate;
        if (lastDate !== today) {
          currentCount = 0;
          userLimits.dailyCount = 0;
          userLimits.lastDate = today;
          try {
            await supabaseClient.from('users').update({ daily_requests_count: 0, last_request_date: new Date().toISOString() }).eq('user_id', userId);
          } catch (e) {}
        }
        
        const ordersCount = userPaidOrdersCount || 0;
        const maxAi = LIMITS_CONFIG.registered.ai(ordersCount);
        
        return {
          isRegistered: true,
          ordersCount,
          manual: {
            current: 0,
            max: Infinity,
            remaining: Infinity,
            allowed: true
          },
          ai: {
            current: currentCount,
            max: maxAi,
            remaining: Math.max(0, maxAi - currentCount),
            allowed: currentCount < maxAi
          }
        };
      }
    }

    async function incrementLimitCount(mode) {
      const today = new Date().toDateString();
      if (!userId) {
        const guestData = await getGuestLimitData();
        if (mode === 'manual') {
          guestData.manual_count++;
        } else {
          guestData.ai_count++;
        }
        await saveGuestLimitData(guestData);
      } else {
        if (mode === 'manual') return;
        userLimits.dailyCount++;
        userLimits.lastDate = today;
        try {
          await supabaseClient.from('users').update({ daily_requests_count: userLimits.dailyCount, last_request_date: new Date().toISOString() }).eq('user_id', userId);
        } catch (e) {}
      }
    }

    async function fetchUserPaidOrdersCount() {
      if (!userId) {
        userPaidOrdersCount = 0;
        return;
      }
      try {
        const { count, error } = await supabaseClient
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('status', 'in', '(cancelled,pending)');
        if (!error && count !== null) {
          userPaidOrdersCount = count;
        }
      } catch (e) {
        console.error('Error fetching paid orders count:', e);
      }
    }
    let appliedPromo = null;
    let userReferralCode = null;
    let wishlist = new Set();
    window.wishlist = wishlist;
    let productsPage = 1;
    let productsFilter = { category: 'all', brand: 'all', sort: 'new' };
    let productsTotalPages = 1;
    let isLoadingMoreProducts = false;
    let reviewsPage = 1;
    let reviewsTotalPages = 1;
    
    // AI Legit check state
    window.legitPhotos = [];
    window.legitResult = null;

    // Global key for Edge Function calls (Authorization header)
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc4MzgsImV4cCI6MjA5MTIzMzgzOH0.P9GQSW6NLN1BhR66PX-LP4ysZBXFeWIXRYIRvhRjo1c';

    // ─── ФИНАЛЬНАЯ МОДАЛКА-ПРЕВЬЮ ПЕРЕД СОХРАНЕНИЕМ ───────────────────────────
    // Показывает: фото-кандидат (image confirmation), сравнение цены с рынком,
    // полный обзор заказа. Возвращает Promise<boolean> — true если пользователь подтвердил.
    function _ipMoneyFmt(v) { return (Math.round(Number(v || 0) * 100) / 100).toFixed(2); }
    function showOrderPreviewModal(order) {
      return new Promise((resolve) => {
        const title = order?.title || '';
        const brand = order?.brand || '';
        const marketplace = order?.marketplaceName || order?.marketplace || '';
        const price = Number(order?.price || 0);
        const currency = order?.currency || '';
        const size = order?.size || '';
        const country = order?.country || '';
        const weight = Number(order?.weight || 0);
        const totalByn = Number(order?.total_byn ?? order?.total ?? 0);
        const discount = Number(order?.discountAmount || 0);

        const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"'\/]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'}[c]));

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
        overlay.innerHTML = `
          <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 border border-white/10 shadow-2xl">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-bold text-white"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></span> Проверьте заказ</h3>
              <button id="ipClose" class="text-white/60 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div id="ipMatchPanel" class="bg-white/5 border border-white/10 rounded-xl p-3 mb-3 hidden">
              <p class="text-xs text-white/60 mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Похоже на этот товар:</p>
              <div class="flex gap-3 items-center">
                <img id="ipMatchImg" src="" class="w-20 h-20 rounded-lg object-cover bg-white/10 hidden">
                <div class="flex-1 min-w-0">
                  <p id="ipMatchTitle" class="text-sm text-white font-medium truncate"></p>
                  <p id="ipMatchPrice" class="text-xs text-cyan-400 mt-1"></p>
                  <a id="ipMatchLink" href="#" target="_blank" class="text-xs text-blue-400 hover:underline truncate block">Открыть <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></a>
                </div>
              </div>
            </div>

            <div id="ipPriceWarn" class="bg-orange-500/15 border border-orange-400/30 rounded-xl p-3 mb-3 text-sm text-orange-100 hidden"></div>

            <div class="bg-white/5 rounded-xl p-3 mb-3 space-y-1.5 text-sm">
              <div class="flex justify-between"><span class="text-white/60">Товар:</span><span class="text-white text-right ml-2">${_esc(title || '—')}</span></div>
              ${brand ? `<div class="flex justify-between"><span class="text-white/60">Бренд:</span><span class="text-white">${_esc(brand)}</span></div>` : ''}
              ${marketplace ? `<div class="flex justify-between"><span class="text-white/60">Площадка:</span><span class="text-white">${_esc(marketplace)}</span></div>` : ''}
              ${size ? `<div class="flex justify-between"><span class="text-white/60">Размер:</span><span class="text-white">${_esc(size)}</span></div>` : ''}
              ${country ? `<div class="flex justify-between"><span class="text-white/60">Страна:</span><span class="text-white">${_esc(country)}</span></div>` : ''}
              ${weight ? `<div class="flex justify-between"><span class="text-white/60">Вес:</span><span class="text-white">${weight.toFixed(2)} кг</span></div>` : ''}
              ${price ? `<div class="flex justify-between"><span class="text-white/60">Цена товара:</span><span class="text-white">${_ipMoneyFmt(price)} ${_esc(currency)}</span></div>` : ''}
              ${totalByn ? `
                <div class="flex justify-between text-base font-bold pt-2 border-t border-white/10 mb-2">
                  <span class="text-white">Итого:</span>
                  <span class="text-cyan-400">${_ipMoneyFmt(totalByn - discount)} BYN</span>
                </div>
                <div class="p-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-[10px] space-y-1 mt-2">
                  <p class="text-yellow-400 font-bold flex items-center gap-1">
                    ${ix('trending-up', { size: '12px' })} Выгода заказа в ICE LOGIX
                  </p>
                  <p class="text-white/70">
                    Цена в ТЦ Минска: <span class="text-red-400 line-through font-mono font-bold">${_ipMoneyFmt((totalByn - discount) * 1.7)} BYN</span><br>
                    🔥 Ваша экономия: <strong class="text-green-400 font-bold font-mono">${_ipMoneyFmt((totalByn - discount) * 0.7)} BYN (41%)</strong>!
                  </p>
                </div>
              ` : ''}
            </div>

            <div class="flex gap-2">
              <button id="ipBack" class="btn-secondary flex-1 bg-white/10 hover: text-white px-4 py-3 rounded-xl text-sm font-semibold"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
              <button id="ipConfirm" class="flex-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-bold flex-1"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Сохранить заказ</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);

        const finish = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#ipClose').onclick = () => finish(false);
        overlay.querySelector('#ipBack').onclick = () => finish(false);
        overlay.querySelector('#ipConfirm').onclick = () => finish(true);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });

        // Фоновый поиск: image confirmation + price comparison
        if (title && supabaseClient && window.iceLogixPricing) {
          const q = [brand, title].filter(Boolean).join(' ').trim();
          supabaseClient.functions.invoke('search-products', { body: { query: q, topN: 3, user_id: userId } })
            .then(({ data, error }) => {
              if (error || !data?.ok || !Array.isArray(data.results) || data.results.length === 0) return;
              const first = data.results.find(r => r.image_url || r.title) || data.results[0];
              if (!first) return;
              const panel = overlay.querySelector('#ipMatchPanel');
              const img = overlay.querySelector('#ipMatchImg');
              const tEl = overlay.querySelector('#ipMatchTitle');
              const pEl = overlay.querySelector('#ipMatchPrice');
              const lEl = overlay.querySelector('#ipMatchLink');
              if (panel) panel.classList.remove('hidden');
              if (img && first.image_url) { img.src = getProductImages(first.image_url)[0] || ''; img.classList.remove('hidden'); }
              if (tEl) tEl.textContent = first.title || '';
              if (pEl && first.price && first.currency) {
                pEl.textContent = `${_ipMoneyFmt(first.price)} ${first.currency}`;
              }
              if (lEl && first.url) { lEl.href = first.url; }

              // Price comparison: avg по результатам в той же валюте
              if (price && currency) {
                const sameCcy = data.results.filter(r => r.price && r.currency === currency);
                if (sameCcy.length >= 2) {
                  const avg = sameCcy.reduce((s, r) => s + r.price, 0) / sameCcy.length;
                  const dev = Math.abs(price - avg) / avg;
                  if (dev > 0.2) {
                    const warn = overlay.querySelector('#ipPriceWarn');
                    if (warn) {
                      warn.classList.remove('hidden');
                      const direction = price > avg ? 'выше' : 'ниже';
                      warn.innerHTML = `<span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Ваша цена <b>${_ipMoneyFmt(price)} ${_esc(currency)}</b> на ${(dev * 100).toFixed(0)}% ${direction} средней по рынку (~${_ipMoneyFmt(avg)} ${_esc(currency)} на ${sameCcy.length} площадках). Перепроверьте.`;
                    }
                  }
                }
              }
            })
            .catch(() => { /* silent — модалка работает без preview */ });
        }
      });
    }

    function dismissSplashScreen() {
      const splash = document.getElementById('iceSplashScreen');
      if (splash && !splash.classList.contains('ice-splash-hidden')) {
        splash.classList.add('ice-splash-hidden');
        setTimeout(() => {
          try { splash.remove(); } catch (e) {}
        }, 450);
      }
    }
    window.dismissSplashScreen = dismissSplashScreen;
    setTimeout(dismissSplashScreen, 2800);

    async function init() {
      console.log("=== ICE LOGIX VERSION: 2026.05.24.02 ===");
      try {
        // Fast restore cached user balance and avatar IMMEDIATELY for 0ms rendering
        try {
          const _cached = localStorage.getItem('ice_cached_user');
          if (_cached) {
            const _cu = JSON.parse(_cached);
            if (_cu) {
              if (_cu.balance !== undefined) {
                balance = _cu.balance;
                const _hb = document.getElementById('headerBalance');
                if (_hb) _hb.innerText = balance;
              }
              if (_cu.userName) {
                userName = _cu.userName;
                const _un = document.getElementById('userNameHeader');
                if (_un) _un.innerText = userName;
              }
              if (_cu.userAvatarUrl) {
                userAvatarUrl = _cu.userAvatarUrl;
                const _av = document.getElementById('avatar');
                if (_av) _av.innerHTML = `<img src="${userAvatarUrl}" class="w-full h-full object-cover">`;
              }
              if (_cu.userId) userId = _cu.userId;
              if (_cu.isOwner !== undefined) isOwner = _cu.isOwner;
              if (_cu.isRegistered) isRegistered = true;
            }
          }
        } catch(e) {}

        // Safe Telegram check
        if (window.Telegram && window.Telegram.WebApp) {
          tg = window.Telegram.WebApp;
          try { tg.ready(); } catch {}
          try { tg.expand(); } catch {}
          // Enable closing-confirmation so accidental swipes don't kill the WebApp mid-checkout.
          try { tg.enableClosingConfirmation?.(); } catch {}
          // Match the Telegram chrome (header + background + bottom bar) to pure black (#000000) so the WebApp blends in seamlessly.
          try { tg.setHeaderColor?.('#000000'); } catch {}
          try { tg.setBackgroundColor?.('#000000'); } catch {}
          try { tg.setBottomBarColor?.('#000000'); } catch {}
          // Mark <body> so CSS hides duplicate in-page back buttons when native BackButton is available.
          if (tg?.BackButton) document.body.classList.add('tg-native-back');
          const user = tg.initDataUnsafe?.user;
          if (user) {
            if (!userName || userName === 'Гость') userName = user.first_name || user.username || 'Гость';
            if (!userAvatarUrl && user.photo_url) userAvatarUrl = user.photo_url;
            const _av = document.getElementById('avatar');
            if (_av && userAvatarUrl) _av.innerHTML = `<img src="${userAvatarUrl}" class="w-full h-full object-cover">`;
          }
        } else {
          console.warn('Telegram WebApp is not available. Running in browser preview mode.');
        }

        // Safe Supabase check
        const SUPABASE_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc4MzgsImV4cCI6MjA5MTIzMzgzOH0.P9GQSW6NLN1BhR66PX-LP4ysZBXFeWIXRYIRvhRjo1c';
        
        if (window.supabase) {
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          window.supabaseClient = supabaseClient;
        } else {
          console.error('Supabase SDK failed to load. Database calls will be disabled.');
        }

        if (supabaseClient) {
          try {
            await loadAppSettings();
          } catch (err) {
            console.error('Error loading app settings:', err);
          }
          // --- STRICT AUTHENTICATION FLOW ---
          let activeSession = null;
          try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            activeSession = session;
            
            if (!activeSession && tg?.initData && localStorage.getItem('ice_logged_out') !== 'true') {
                try {
                    const res = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initData: tg.initData })
                    });
                    const data = await res.json();
                    if (data.ok && data.session) {
                        await supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
                        activeSession = data.session;
                    }
                } catch(e) { console.error('Telegram Auth Error', e); }
            }
            
            if (activeSession) {
                let uId = null;
                try {
                    const { data: profile } = await supabaseClient.from('users').select('user_id').eq('auth_id', activeSession.user.id).single();
                    if (profile) uId = profile.user_id;
                } catch (err) {
                    console.warn('Profile not found in users table for auth_id:', activeSession.user.id);
                }
                userId = uId || activeSession.user.id;
                isRegistered = true;
            }
          } catch (err) {
            console.error('Authentication Flow Error:', err);
          }
          // --- END AUTHENTICATION FLOW ---

          try {
            await loadUserData();
          } catch (err) {
            console.error('Error loading user data:', err);
          }
          try {

          } catch (err) {
            console.error('Error migrating guest cart:', err);
          }
          try {
            await initReferralCode();
          } catch (err) {
            console.error('Error initializing referral code:', err);
          }
          try {
            await loadWishlist();
          } catch (err) {
            console.error('Error loading wishlist:', err);
          }
        }
        
        if (!isRegistered && !userId) {
          if (!userName) userName = 'Гость';
        }

        attachEventListeners();
        const avatarDiv = document.querySelector('#avatar');
        if (avatarDiv) {
          if (userAvatarUrl) {
            const currentImg = avatarDiv.querySelector('img');
            if (!currentImg || currentImg.getAttribute('src') !== userAvatarUrl) {
              avatarDiv.innerHTML = `<img src="${userAvatarUrl}" class="w-full h-full object-cover">`;
            }
          } else {
            const initial = (userName || 'Гость').charAt(0).toUpperCase();
            if (avatarDiv.innerText !== initial) avatarDiv.innerText = initial;
          }
        }
        const userNameHeader = document.querySelector('#userNameHeader');
        if (userNameHeader && userName && userNameHeader.innerText !== userName) {
          userNameHeader.innerText = userName;
        }
        const logoImg = document.getElementById('logoImg');
        if (logoImg) {
          logoImg.onclick = () => { animateClick(logoImg); switchTab('home'); };
        }
        const userCard = document.getElementById('userCard');
        if (userCard) {
          const targetDisp = isRegistered ? '' : 'none';
          if (userCard.style.display !== targetDisp) userCard.style.display = targetDisp;
        }
        const avatar = document.getElementById('avatar');
        if (avatar) {
          avatar.onclick = () => { animateClick(avatar); switchTab('profile'); };
        }
        // Скрыть баланс, уведомления, настройки для неавторизованных
        const balanceIsland = document.getElementById('balanceIsland');
        if (balanceIsland) {
          const targetDisp = isRegistered ? '' : 'none';
          if (balanceIsland.style.display !== targetDisp) balanceIsland.style.display = targetDisp;
        }
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
          settingsBtn.onclick = () => showAppSettings('security');
          const targetDisp = isRegistered ? '' : 'none';
          if (settingsBtn.style.display !== targetDisp) settingsBtn.style.display = targetDisp;
        }
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
          notificationsBtn.onclick = () => showNotificationsPanel();
          const targetDisp = isRegistered ? '' : 'none';
          if (notificationsBtn.style.display !== targetDisp) notificationsBtn.style.display = targetDisp;
        }
        const loginBtn = document.getElementById('loginBtn');
        const headerRight = document.querySelector('.header-right');
        if (loginBtn) {
          loginBtn.onclick = () => showAuthPage();
          if (!isRegistered) {
            if (headerRight) {
              headerRight.style.flex = '0 0 50%';
              headerRight.style.justifyContent = 'flex-end';
            }
            loginBtn.style.display = 'inline-flex';
            loginBtn.style.width = '100%';
            loginBtn.style.justifyContent = 'center';
            loginBtn.style.alignItems = 'center';
            loginBtn.style.gap = '6px';
            loginBtn.style.padding = '8px 16px';
            loginBtn.style.fontSize = '13px';
            loginBtn.style.fontWeight = '700';
            loginBtn.style.borderRadius = '14px';
            loginBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.15))';
            loginBtn.style.border = '1px solid rgba(6,182,212,0.4)';
            loginBtn.style.color = '#22d3ee';
            loginBtn.style.whiteSpace = 'nowrap';
            loginBtn.style.boxShadow = '0 2px 12px rgba(6,182,212,0.25)';
            loginBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Войти/Зарегистрироваться';
          } else {
            if (headerRight) {
              headerRight.style.flex = '';
              headerRight.style.justifyContent = '';
            }
            loginBtn.style.display = 'none';
            loginBtn.style.width = '';
            loginBtn.style.justifyContent = '';
          }
        }

        // Прогреваем кэш курсов НБРБ (1 час) — для quickEstimate в списках
        if (window.iceLogixPricing?.warmRates) window.iceLogixPricing.warmRates();
        // Автоматически открываем онбординг для новых пользователей
        if (!localStorage.getItem('ice_onboarding_shown') && window.iceLogixOnboarding) {
          setTimeout(() => window.iceLogixOnboarding.open(), 800);
        }

        // Performance: recover UI if app was backgrounded and content disappeared
        // window._appReady is set to true after first renderCurrentScreen completes
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && window._appReady) {
            const contentDiv = document.getElementById('content');
            if (contentDiv && (!contentDiv.innerHTML || contentDiv.innerHTML.trim().length < 50)) {
              renderCurrentScreen();
            }
          }
        });

        // Performance: handle Telegram WebApp activation/deactivation
        try {
          tg?.onEvent?.('activated', () => {
            if (!window._appReady) return;
            const contentDiv = document.getElementById('content');
            if (contentDiv && (!contentDiv.innerHTML || contentDiv.innerHTML.trim().length < 50)) {
              renderCurrentScreen();
            }
          });
        } catch(e) {}

        // Performance: pre-warm caches on idle so every section opens instantly with 0ms delay
        const _prewarm = () => {
          if (window.CacheDB && window.supabaseClient) {
            // 1. Pre-warm marketplaces
            if (!window.marketplacesCache) {
              supabaseClient.from('marketplaces').select('*').eq('is_active', true).order('sort_order', { ascending: true })
                .then(({ data }) => { if (data) window.marketplacesCache = preprocessMarketplaces(data); }).catch(() => {});
            }
            // 2. Pre-warm popular products
            window.CacheDB.get('popularProducts', async () => {
              const { data: homeProds } = await supabaseClient.from('products').select('*').eq('is_active', true).eq('show_on_home', true).limit(10);
              if (homeProds && homeProds.length > 0) return homeProds;
              const { data } = await supabaseClient.from('products').select('*').eq('is_active', true).limit(10);
              return data;
            }, 600000).catch(() => {});
            // 3. Pre-warm promotions
            window.CacheDB.get('promotions_page', async () => {
              const { data } = await supabaseClient.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(10);
              return data || [];
            }, 600000).catch(() => {});
            // 4. Pre-warm reports & reviews
            window.CacheDB.get('public_reports_feed', async () => {
              const [{ data: rep }, countRes] = await Promise.all([
                supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false }),
                supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').catch(() => ({ count: 120 }))
              ]);
              return { data: rep || [], count: countRes?.count || 120 };
            }, 600000).catch(() => {});
            window.CacheDB.get('reviews_hub_stats', async () => {
              const { data } = await supabaseClient.from('reviews').select('rating').eq('is_published', true);
              if (data && data.length > 0) {
                const count = data.length;
                const totalStars = data.reduce((sum, r) => sum + (r.rating || 0), 0);
                return { count, avg: totalStars / count };
              }
              return { count: 0, avg: 4.9 };
            }, 600000).catch(() => {});
            // 5. Pre-warm academy
            window.CacheDB.get('academy_catalog', async () => {
              const { data: courses } = await supabaseClient.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: true });
              if (!courses || courses.length === 0) return { courses: [], lessons: [] };
              const courseIds = courses.map(c => c.id);
              const { data: lessons } = await supabaseClient.from('lessons').select('*').in('course_id', courseIds).order('order_index', { ascending: true });
              return { courses, lessons: lessons || [] };
            }, 600000).catch(() => {});
            // 6. Pre-warm reviews config
            if (typeof loadReviewsConfig === 'function') loadReviewsConfig().catch(() => {});
            // 7. Notifications & Legit-checks
            if (userId) {
              supabaseClient.from('user_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
                .then(({ data }) => {
                  if (data) {
                    try { localStorage.setItem('ice_cached_notifs_' + userId, JSON.stringify(data)); } catch(e) {}
                    const unread = data.filter(n => !n.is_read);
                    const badge = document.getElementById('notifBadge');
                    if (badge && unread.length > 0) {
                      badge.textContent = unread.length > 99 ? '99+' : unread.length;
                      badge.classList.remove('hidden');
                    }
                  }
                }).catch(() => {});
              window.CacheDB.get('legit_checks_' + userId, async () => {
                const { data } = await supabaseClient.from('legit_check_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
                return data || [];
              }, 60000).catch(() => {});
            }

            // 8. Pre-render quick lineup screens into memory cache so 1st click is 0ms
            setTimeout(() => {
              try {
                if (!_tabCache['reports:']) renderReports().then(h => { if (h) _tabCache['reports:'] = { html: h, ts: Date.now() }; }).catch(() => {});
                if (!_tabCache['reviews:']) renderReviews().then(h => { if (h) _tabCache['reviews:'] = { html: h, ts: Date.now() }; }).catch(() => {});
                if (!_tabCache['promo:']) renderPromoPage().then(h => { if (h) _tabCache['promo:'] = { html: h, ts: Date.now() }; }).catch(() => {});
                if (!_tabCache['academy:']) renderAcademy().then(h => { if (h) _tabCache['academy:'] = { html: h, ts: Date.now() }; }).catch(() => {});
                if (userId && !_tabCache['legitcheck:']) renderLegitCheck().then(h => { if (h) _tabCache['legitcheck:'] = { html: h, ts: Date.now() }; }).catch(() => {});
              } catch(e) {}
            }, 400);
          }
        };
        if ('requestIdleCallback' in window) {
          requestIdleCallback(_prewarm, { timeout: 2000 });
        } else {
          setTimeout(_prewarm, 1500);
        }
      } catch (globalInitErr) {
        console.error('CRITICAL ERROR during init():', globalInitErr);
      } finally {
        // Safe boot without double-rendering or flickering navigation bars
        try {
          const _c = document.getElementById('content');
          const _hasContent = _c && _c.innerHTML && _c.innerHTML.trim().length > 100;
          if (!window._homeRenderedOnce || !_hasContent) {
            currentTab = null;
            switchTab('home');
            window._homeRenderedOnce = true;
          } else {
            attachHomeHandlers();
            if (!_tabCache['home:']) {
              if (_c && _c.innerHTML) _tabCache['home:'] = { html: _c.innerHTML, ts: Date.now() };
            }
          }
          window._appReady = true;
          dismissSplashScreen();
        } catch (tabErr) {
          console.error('Failed to switch tab to home:', tabErr);
        }

        // Deep-link: ?startapp=review_<order_id> → авто-открытие формы отзыва
        try {
          const sp = tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('tgWebAppStartParam') || '';
          if (sp && sp.indexOf('review_') === 0) {
            const orderId = sp.slice('review_'.length);
            setTimeout(() => { try { openReviewForm(orderId); } catch (e) { console.error('openReviewForm failed:', e); } }, 600);
          }
        } catch (dlErr) { console.error('deep-link handling failed:', dlErr); }
      }

      // Watch for category selects to apply 2-step UI enhancement
      try {
        const enhanceAllCategorySelects = () => {
          ['calcCategory', 'orderCategory', 'productCategory'].forEach(enhanceCategoryTwoStep);
        };
        enhanceAllCategorySelects();
        const moEnhance = new MutationObserver(enhanceAllCategorySelects);
        moEnhance.observe(document.body, { childList: true, subtree: true });
      } catch (observerErr) {
        console.error('Failed to initialize category select observer:', observerErr);
      }
    }

    // ФАЗА 1: Загрузка настроек (пауза платежей, реквизиты)
    window.appSettings = null;
    async function loadAppSettings() {
      if (!supabaseClient) return;
      const { data, error } = await supabaseClient.from('app_settings').select('*').eq('id', 1).single();
      if (!error && data) {
        window.appSettings = data;
      }
    }

    async function loadUserData() {
      if (!userId) return;
      
      const { data, error } = await supabaseClient.from('users')
        .select('role, ices_balance, referral_code, referral_count, referral_bonus, daily_requests_count, last_request_date, is_trusted, settings, phone, avatar_url, full_name, username')
        .eq('user_id', userId).maybeSingle();
        
      if (!error && data) {
        isRegistered = true;
        isOwner = (data.role === 'owner' || data.role === 'admin');
        balance = data.ices_balance || 0;
        userReferralCode = data.referral_code;
        userLimits.dailyCount = data.daily_requests_count || 0;
        userLimits.lastDate = data.last_request_date ? new Date(data.last_request_date).toDateString() : null;
        userLimits.isTrusted = data.is_trusted || false;
        
        // Save user's sizes in a global variable for auto-population
        window.userSizing = data.settings?.sizing || null;
        window.userSettings = data.settings || {};
        
        userName = data.full_name || data.username || userName || 'Гость';
        if (data.avatar_url) {
          userAvatarUrl = data.avatar_url;
        }

        try {
          localStorage.setItem('ice_cached_user', JSON.stringify({
            userId,
            userName,
            balance,
            userAvatarUrl,
            isRegistered: true,
            isOwner
          }));
        } catch(e) {}

        // Live update header details if DOM is loaded without unnecessary re-rendering
        const avatarDiv = document.querySelector('#avatar');
        if (avatarDiv) {
          if (userAvatarUrl) {
            const currentImg = avatarDiv.querySelector('img');
            if (!currentImg || currentImg.getAttribute('src') !== userAvatarUrl) {
              avatarDiv.innerHTML = `<img src="${userAvatarUrl}" class="w-full h-full object-cover">`;
            }
          } else {
            const initial = (userName || 'Гость').charAt(0).toUpperCase();
            if (avatarDiv.innerText !== initial) avatarDiv.innerText = initial;
          }
        }
        const userNameHeader = document.querySelector('#userNameHeader');
        if (userNameHeader && userNameHeader.innerText !== userName) {
          userNameHeader.innerText = userName;
        }

        const _hb = document.getElementById('headerBalance');
        if (_hb && _hb.innerText != balance) {
          _hb.innerText = balance;
        }
        if (data.settings?.theme && data.settings.theme !== window._currentAppliedTheme) {
          applyTheme(data.settings.theme);
        }
        // Update family balance in header — fire-and-forget, must not block init
        setTimeout(() => updateHeaderFamilyBalance().catch(() => {}), 0);

        // Fetch paid orders count and last order size for limits & sizes
        setTimeout(async () => {
          await fetchUserPaidOrdersCount();
          try {
            const { data: lastOrder } = await supabaseClient
              .from('orders')
              .select('items')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastOrder && lastOrder.items && lastOrder.items[0]) {
              window.lastOrderSize = lastOrder.items[0].size || null;
            }
          } catch(e) {}
        }, 100);
      } else {
        isRegistered = true;
        applyTheme('dark');
        
        // Fallback: Create default row in users table client-side if missing
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          try {
            await supabaseClient.from('users').insert({
              user_id: userId,
              auth_id: session.user.id,
              role: 'user',
              ices_balance: 0
            });
          } catch (insertErr) {
            console.error('Failed to auto-create user profile row:', insertErr);
          }
        }
      }

      // Fetch global vacation & exchange buffer settings from the owner's row
      try {
        const { data: ownerRow } = await supabaseClient.from('users').select('settings').eq('role', 'owner').limit(1).maybeSingle();
        if (ownerRow && ownerRow.settings) {
          if (ownerRow.settings.buyer_vacation) {
            window.buyerVacation = ownerRow.settings.buyer_vacation;
          } else {
            window.buyerVacation = { active: false, days: 0 };
          }
          if (ownerRow.settings.exchange_buffer !== undefined) {
            window.iceLogixPricing.CONFIG.currency_buffer_pct = parseFloat(ownerRow.settings.exchange_buffer);
          }
        }
      } catch (err) {
        console.error('Error loading global vacation/buffer settings:', err);
      }
    }

    const HARD_DOMAINS = [
      'pinduoduo.com', 'yangkeduo.com',
      'goofish.com', 'xianyu.com',
      'xiaohongshu.com',
      'poizon.com', 'dewu.com',
      'taobao.com', 'tmall.com',
      '1688.com', 'jd.com'
    ];

    function isHardDomain(url) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return HARD_DOMAINS.some(d => host.includes(d));
      } catch { return false; }
    }

    async function getScreenshotUrl(path) {
      const { data, error } = await supabaseClient.storage
        .from('product-screenshots')
        .createSignedUrl(path, 600);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    }

    async function uploadProductImage(file) {
      if (!supabaseClient) throw new Error('Клиент Supabase не инициализирован');
      let sessionId = localStorage.getItem('icelogix_session_id');
      if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem('icelogix_session_id', sessionId); }
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${sessionId}/products/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const { error: uploadError } = await supabaseClient.storage
        .from('ugc')
        .upload(fileName, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error('Ошибка при загрузке изображения: ' + uploadError.message);
      const { data } = supabaseClient.storage.from('ugc').getPublicUrl(fileName);
      return data.publicUrl;
    }

    async function processScreenshot(taskId, file) {
      let sessionId = localStorage.getItem('icelogix_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem('icelogix_session_id', sessionId);
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
      const path = `${sessionId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabaseClient.storage
        .from('product-screenshots')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(`Не удалось загрузить файл: ${uploadErr.message}`);
      const { data, error } = await supabaseClient.functions.invoke('parse-screenshot', {
        body: { jobId: taskId, screenshotPath: path },
      });
      if (error) throw new Error(`Ошибка распознавания: ${error.message}`);
      return data;
    }

    function applyScreenshotResult(data, context) {
      const currencySymbols = { GBP: '£', USD: '$', EUR: '€', CNY: '¥', RUB: '₽', BYN: 'Br' };
      if (context === 'calc') {
        if (data.price != null && Number(data.price) > 0) {
          const el = document.getElementById('calcPrice');
          if (el) el.value = data.price;
        }
        if (data.currency) {
          const sel = document.getElementById('calcCurrency');
          if (sel) { const opt = Array.from(sel.options).find(o => o.value === data.currency); if (opt) sel.value = data.currency; }
          const lbl = document.getElementById('calcPriceCurrency');
          if (lbl) lbl.innerText = currencySymbols[data.currency] || data.currency;
        }
        const titleInp = document.getElementById('calcTitle');
        if (titleInp && data.title && !titleInp.value) titleInp.value = data.title;
      } else {
        if (data.price != null && Number(data.price) > 0) {
          const el = document.getElementById('orderPrice');
          if (el) el.value = data.price;
        }
        if (data.currency) {
          const sel = document.getElementById('orderCurrency');
          if (sel) { const opt = Array.from(sel.options).find(o => o.value === data.currency); if (opt) sel.value = data.currency; }
          const lbl = document.getElementById('orderPriceCurrency');
          if (lbl) lbl.innerText = currencySymbols[data.currency] || data.currency;
        }
        const titleInp = document.getElementById('orderTitle');
        if (titleInp && data.title && !titleInp.value) titleInp.value = data.title;
        if (typeof update === 'function') update();
      }
    }

    function showScreenshotWidget(taskId, checkData, context) {
      const containerId = context === 'calc' ? 'calcScreenshotWidget' : 'orderScreenshotWidget';
      const container = document.getElementById(containerId);
      if (!container) return;

      const hint = checkData.error_message ||
        'Эта площадка отдаёт данные товара только в приложении. Загрузите скриншот — мы извлечём название и цену автоматически.';

      container.innerHTML = `
        <div class="screenshot-widget">
          <p style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:600;margin-bottom:4px"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Не удалось автоматически распознать товар</p>
          <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:10px">${hint}</p>
          <div class="screenshot-actions">
            <button id="swUploadBtn" style="background:#3b82f6;color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span> Загрузить скриншот</button>
            <button id="swManualBtn" style="background:rgba(255,255,255,0.12);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.12)'"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Ввести вручную</button>
          </div>
          <div id="swUploadZone" style="display:none;margin-top:12px">
            <div class="screenshot-upload-zone" id="swDropZone">
              <div style="font-size:28px;margin-bottom:6px"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin-bottom:4px">Перетащите файл или нажмите для выбора</p>
              <p style="color:rgba(255,255,255,0.4);font-size:11px">Скриншот страницы товара из приложения.<br>Должны быть видны название и цена.<br>JPEG · PNG · WEBP · HEIC — до 10 МБ</p>
              <input type="file" id="swFileInput" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" style="display:none">
            </div>
            <img id="swPreview" class="screenshot-preview" style="display:none" alt="preview">
            <div id="swRecognizeWrap" style="display:none;text-align:center;margin-top:10px">
              <button id="swRecognizeBtn" style="background:#06b6d4;color:#fff;border:none;border-radius:10px;padding:9px 22px;font-size:13px;font-weight:600;cursor:pointer"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Распознать товар</button>
            </div>
            <div id="swStatus" style="display:none;font-size:12px;text-align:center;margin-top:8px"></div>
          </div>
        </div>`;
      container.classList.remove('hidden');

      let selectedFile = null;

      const uploadBtn = document.getElementById('swUploadBtn');
      const manualBtn = document.getElementById('swManualBtn');
      const uploadZone = document.getElementById('swUploadZone');
      const dropZone = document.getElementById('swDropZone');
      const fileInput = document.getElementById('swFileInput');
      const preview = document.getElementById('swPreview');
      const recognizeWrap = document.getElementById('swRecognizeWrap');
      const recognizeBtn = document.getElementById('swRecognizeBtn');
      const statusEl = document.getElementById('swStatus');

      uploadBtn.addEventListener('click', () => {
        uploadZone.style.display = 'block';
        uploadBtn.style.display = 'none';
      });

      manualBtn.addEventListener('click', () => {
        container.innerHTML = '';
        container.classList.add('hidden');
      });

      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      });

      fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

      function handleFile(file) {
        if (file.size > 10 * 1024 * 1024) { tgUtil.alert('Файл слишком большой. Максимум 10 МБ.'); return; }
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = ev => {
          preview.src = ev.target.result;
          preview.style.display = 'block';
          dropZone.classList.add('has-file');
          recognizeWrap.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }

      recognizeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        recognizeBtn.disabled = true;
        recognizeBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Распознаём…';
        statusEl.style.display = 'none';
        try {
          const data = await processScreenshot(taskId, selectedFile);
          if (data.status === 'done') {
            applyScreenshotResult(data, context);
            if (data.confidence === 'low') {
              container.innerHTML = '<div class="confidence-low"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Распознавание с низкой уверенностью, проверьте поля перед сохранением</div>';
            } else {
              container.innerHTML = '';
              container.classList.add('hidden');
            }
          } else {
            container.innerHTML = '<div class="screenshot-widget"><p style="color:rgba(255,255,255,0.8);font-size:13px"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Не удалось распознать на скриншоте — введите данные вручную</p></div>';
          }
        } catch (err) {
          recognizeBtn.disabled = false;
          recognizeBtn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span> Распознать товар';
          statusEl.style.display = 'block';
          statusEl.style.color = '#f87171';
          statusEl.innerHTML = '<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ' + err.message;
        }
      });
    }

    async function checkAndUpdateLimit(mode = 'ai') {
      const limits = await getCalculatorLimits();
      const item = mode === 'manual' ? limits.manual : limits.ai;
      return {
        allowed: item.allowed,
        currentCount: item.current,
        maxRequests: item.max,
        remaining: item.remaining
      };
    }

    async function initReferralCode() {
      if (!userId) return;
      if (userReferralCode) return;
      const code = 'ICE' + userId.toString().slice(-6);
      try {
        await supabaseClient.from('users').update({ referral_code: code }).eq('user_id', userId);
        userReferralCode = code;
      } catch(e) { console.log(e); }
    }

    async function loadWishlist() {
      if (!userId) return;
      try {
        const { data } = await supabaseClient.from('wishlist').select('product_id').eq('user_id', userId);
        if (data) data.forEach(item => wishlist.add(item.product_id));
      } catch(e) {}
    }

    function animateClick(el) {
      if (!el) return;
      el.classList.add('click-animate');
      setTimeout(() => el.classList.remove('click-animate'), 180);
    }
    window.animateClick = animateClick;

    function attachEventListeners() {
      document.getElementById('addBalanceBtn').onclick = (e) => {
        if (e) e.stopPropagation();
        tgUtil.haptic('medium');
        const amount = prompt('Введите сумму пополнения (в ICE / BYN):', '50');
        if (amount && !isNaN(amount) && Number(amount) > 0) {
          tgUtil.alert(`Готовим счет на ${amount} Telegram Stars...`);
          // Здесь будет вызов bot api для генерации инвойса Telegram Stars
          // Временно симулируем пополнение для тестирования
          setTimeout(async () => {
            const addedIce = Number(amount);
            const { data: u } = await supabaseClient.from('users').select('ices_balance').eq('user_id', userId).single();
            const newBal = (u.ices_balance || 0) + addedIce;
            await supabaseClient.from('users').update({ ices_balance: newBal }).eq('user_id', userId);
            balance = newBal;
            document.getElementById('headerBalance').innerText = balance;
            tgUtil.haptic('success');
            tgUtil.alert(`Баланс успешно пополнен на ${addedIce} ICE!`);
          }, 1500);
        }
      };
      document.querySelectorAll('.tab-item').forEach(tab => {
        tab.onclick = () => {
          const tabName = tab.getAttribute('data-tab');
          // Блокируем разделы "Заказ" и "Профиль" для неавторизованных
          if (!window.userId && tabName === 'neworder') {
            window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.');
            return;
          }
          if (!window.userId && tabName === 'profile') {
            window.requireAuth('Для доступа к профилю необходимо войти или зарегистрироваться.');
            return;
          }
          currentSubScreen = null;
          appliedPromo = null;
          switchTab(tabName);
        };
      });
    }

    function _silentRefreshHandlers(tab) {
      try {
        if (tab === 'home') attachHomeHandlers();
        else if (tab === 'calculator') attachCalculatorHandlers();
        else if (tab === 'neworder') attachNewOrderHandlers();
        else if (tab === 'legitcheck') attachLegitCheckHandlers();
        else if (tab === 'wishlist') attachWishlistHandlers();
        else if (tab === 'catalogs') attachCatalogsHandlers();
        else if (tab === 'profile') { attachProfileHandlers(); if (typeof loadProfileExtras === 'function') loadProfileExtras(); }
        else if (tab === 'dropshipper') attachDropshipperHandlers();
        else if (tab === 'academy') attachAcademyHandlers();
        else if (tab === 'cart') attachCartHandlers();
        else if (tab === 'promo') attachPromoPageHandlers();
        else if (tab === 'history') attachHistoryHandlers();
        else if (tab === 'reviews') attachReviewsHandlers();
        else if (tab === 'ugc') attachUGCHandlers();
        else if (tab === 'reftree') attachReferralTreeHandlers();
        initCardSliders();
        if (isShadowMode) attachShadowModeExit();
      } catch(e) {}
    }

    function switchTab(tabName, subScreen = null) {
      if (typeof scrollToPageTop === 'function') scrollToPageTop();
      tgUtil.hideMainButton();
      if (tabName !== 'neworder') {
        window.tempOrder = null;
      }

      // If user is already on this exact tab and subscreen, only early-return if content is actually rendered
      const _contentEl = document.getElementById('content');
      const _hasRenderedContent = _contentEl && _contentEl.innerHTML && _contentEl.innerHTML.trim().length > 100;
      if (currentTab === tabName && currentSubScreen === subScreen && _hasRenderedContent) {
        scrollToPageTop();
        return;
      }

      if (currentTab && currentTab !== tabName) previousTab = currentTab;
      currentTab = tabName;
      currentSubScreen = subScreen;
      if (tabName !== 'calculator') clearBlobUrls('calc:');
      if (tabName !== 'neworder') clearBlobUrls('order:');
      if (tabName !== 'legitcheck') {
        clearBlobUrls('legit:');
        window.legitPhotos = [];
        window.legitResult = null;
      }
      const currentActive = document.querySelector('.tab-item.active');
      const targetActive = document.querySelector(`.tab-item[data-tab="${tabName}"]`);
      if (currentActive !== targetActive) {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        if (targetActive) targetActive.classList.add('active');
      }
      tgUtil.haptic('selection');
      
      // Restore from HTML cache for instant screen switch (0ms delay, no flicker)
      const _ck = (tabName || '') + ':' + (subScreen || '');
      if (_tabCache[_ck] && Date.now() - _tabCache[_ck].ts < 600000) {
        const _cd = document.getElementById('content');
        if (_cd) {
          _cd.innerHTML = _tabCache[_ck].html;
          scrollToPageTop();
          _silentRefreshHandlers(tabName);
          return;
        }
      }
      scrollToPageTop();
      renderCurrentScreen();
    }

    // Wires Telegram's native BackButton based on current tab/subscreen.
    // On 'home' — hides the BackButton. Anywhere else — shows it and on tap returns to home or previousTab.
    function syncTelegramBackButton() {
      const isRoot = currentTab === 'home' && !currentSubScreen;
      if (isRoot) {
        tgUtil.setBackButton(null);
        return;
      }
      
      if (currentTab === 'new-order') {
        tgUtil.setBackButton(() => {
          tgUtil.haptic('light');
          if (window.orderAddMode) {
            if (window.orderAddSubMode) {
              window.orderAddSubMode = null;
              window.orderLinkAnalyzed = false;
              renderCurrentScreen();
              syncTelegramBackButton();
            } else {
              window.orderAddMode = false;
              renderCurrentScreen();
              syncTelegramBackButton();
            }
            return;
          }
          if (previousTab && previousTab !== currentTab) {
            switchTab(previousTab);
          } else {
            switchTab('home');
          }
        });
        return;
      }

      tgUtil.setBackButton(() => {
        tgUtil.haptic('light');
        if (currentSubScreen) {
          currentSubScreen = null;
          renderCurrentScreen();
          syncTelegramBackButton();
          return;
        }
        if (previousTab && previousTab !== currentTab) {
          switchTab(previousTab);
        } else {
          switchTab('home');
        }
      });
    }

    function renderFooter() {
      return `
        <div class="app-footer">
          <img src="./assets/logo.png" class="footer-logo" alt="ICE LOGIX">
          <div class="social-icons">
            <div class="social-icon" data-social="tg" title="Telegram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div class="social-icon" data-social="tiktok" title="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.8a4.85 4.85 0 0 1-1.01-.11z"/>
              </svg>
            </div>
            <div class="social-icon" data-social="ig" title="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </div>
            <div class="social-icon" data-social="pinterest" title="Pinterest">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.494 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.342-.091.382-.294 1.197-.333 1.36-.053.21-.173.255-.399.149-1.492-.695-2.424-2.877-2.424-4.628 0-3.769 2.737-7.229 7.892-7.229 4.143 0 7.362 2.953 7.362 6.899 0 4.117-2.597 7.431-6.202 7.431-1.211 0-2.35-.63-2.739-1.373l-.747 2.846c-.27 1.029-.999 2.319-1.488 3.111C9.079 23.774 10.493 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
              </svg>
            </div>
            <div class="social-icon" data-social="vk" title="VK">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.597v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.684 4 8.277c0-.254.102-.491.597-.491h1.744c.447 0 .615.2.786.678.867 2.49 2.31 4.674 2.905 4.674.224 0 .33-.102.33-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.644v3.499c0 .373.17.508.271.508.224 0 .407-.135.814-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.491-.085.744-.576.744z"/>
              </svg>
            </div>
            <div class="social-icon" data-social="youtube" title="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
          </div>
          <div class="footer-links">
            <span class="footer-link" data-link="offer">Публичная оферта</span>
            <span class="footer-link" data-link="privacy">Политика конфиденциальности</span>
            <span class="footer-link" data-link="contacts">Контакты</span>
            <span class="footer-link" data-link="faq">Ответы на вопросы (FAQ)</span>
          </div>
          <div class="copyright">
            ИП Иванов И.И., УНП 123456789<br>
            © 2025 ICE LOGIX. Доставка мечты из любой точки мира <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span>
          </div>
        </div>
      `;
    }

    async function renderPromoBanners() {
      try {
        let dbPromos = [];
        try {
          const data = await window.CacheDB.get('promotions', async () => {
            const { data, error } = await supabaseClient
              .from('promotions')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(5);
            if (error) throw error;
            return data;
          }, 300000);
          if (data && data.length > 0) dbPromos = data;
        } catch (e) {
          console.error('Ошибка загрузки баннеров:', e);
        }

        const fallbackSlides = [
          {
            id: 'promo-sale',
            bg: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f43f5e 100%)',
            badge: 'ДО 70% ВЫГОДЫ',
            title: 'БОЛЬШАЯ РАСПРОДАЖА',
            subtitle: 'Оригинальные кроссовки и одежда из Poizon, Taobao & 1688',
            btnText: 'В каталог',
            action: 'catalog'
          },
          {
            id: 'promo-legit',
            bg: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)',
            badge: '100% ОРИГИНАЛ',
            title: 'ЛЕГИТ-ЧЕК В ПОДАРОК',
            subtitle: 'Двойная проверка подлинности и бирки перед отправкой',
            btnText: 'Проверить вещь',
            action: 'legit'
          },
          {
            id: 'promo-delivery',
            bg: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
            badge: 'БЫСТРАЯ ДОСТАВКА',
            title: 'ЛУЧШИЙ КУРС ВАЛЮТ',
            subtitle: 'Экспресс-доставка из Китая и Европы от 7 рабочих дней',
            btnText: 'В калькулятор',
            action: 'calculator'
          }
        ];

        let slides = [];
        if (dbPromos.length > 0) {
          dbPromos.forEach(p => {
            slides.push({
              id: p.id,
              isDb: true,
              bannerUrl: p.banner_url,
              title: p.title || 'Специальное предложение',
              subtitle: p.description || 'Активируйте акцию для расчета в калькуляторе'
            });
          });
        }

        if (slides.length < 3) {
          fallbackSlides.forEach(fb => {
            if (slides.length < 3) slides.push(fb);
          });
        }

        return slides.map(s => {
          if (s.isDb && s.bannerUrl) {
            return `
              <div class="banner-slide" data-promotion-id="${s.id}" style="background-image: url('${s.bannerUrl}');">
                <div class="banner-content">
                  <span class="banner-badge">АКЦИЯ ICE LOGIX</span>
                  <h3 class="banner-title">${s.title}</h3>
                  <p class="banner-subtitle">${s.subtitle}</p>
                  <span class="banner-btn">Применить скидку →</span>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="banner-slide" data-promo-action="${s.action || 'catalog'}" style="background: ${s.bg};">
                <div class="banner-content">
                  <span class="banner-badge">${s.badge}</span>
                  <h3 class="banner-title">${s.title}</h3>
                  <p class="banner-subtitle">${s.subtitle}</p>
                  <span class="banner-btn">${s.btnText} →</span>
                </div>
              </div>
            `;
          }
        }).join('');
      } catch (err) {
        console.error('Ошибка рендера баннеров:', err);
        return '';
      }
    }

    function initBannerAutoScroll() {
      const container = document.getElementById('promoBannersContainer');
      const dotsContainer = document.getElementById('bannerDots');
      if (!container) return;

      if (window._bannerScrollInterval) {
        clearInterval(window._bannerScrollInterval);
        window._bannerScrollInterval = null;
      }

      const slides = container.querySelectorAll('.banner-slide');
      const count = slides.length;
      if (count <= 1) {
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
      }

      if (dotsContainer) {
        dotsContainer.innerHTML = Array.from({ length: count })
          .map((_, i) => `<span class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`)
          .join('');

        dotsContainer.querySelectorAll('.banner-dot').forEach(dot => {
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(dot.dataset.index, 10);
            scrollToSlide(idx);
          });
        });
      }

      let currentIndex = 0;
      let isInteracting = false;
      let resumeTimer = null;

      function updateDots(idx) {
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('.banner-dot');
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
      }

      function scrollToSlide(idx) {
        if (!container || slides.length === 0) return;
        currentIndex = (idx + count) % count;
        const targetSlide = slides[currentIndex];
        if (targetSlide) {
          container.scrollTo({
            left: targetSlide.offsetLeft,
            behavior: 'smooth'
          });
          updateDots(currentIndex);
        }
      }

      function nextSlide() {
        if (isInteracting) return;
        const next = (currentIndex + 1) % count;
        scrollToSlide(next);
      }

      function startTimer() {
        stopTimer();
        window._bannerScrollInterval = setInterval(nextSlide, 4200);
      }

      function stopTimer() {
        if (window._bannerScrollInterval) {
          clearInterval(window._bannerScrollInterval);
          window._bannerScrollInterval = null;
        }
      }

      let scrollTimeout;
      container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const scrollPos = container.scrollLeft;
          const w = container.clientWidth || 1;
          const newIdx = Math.round(scrollPos / w);
          if (newIdx >= 0 && newIdx < count && newIdx !== currentIndex) {
            currentIndex = newIdx;
            updateDots(currentIndex);
          }
        }, 50);
      }, { passive: true });

      const onStart = () => {
        isInteracting = true;
        clearTimeout(resumeTimer);
        stopTimer();
      };
      const onEnd = () => {
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
          isInteracting = false;
          startTimer();
        }, 2500);
      };

      container.addEventListener('touchstart', onStart, { passive: true });
      container.addEventListener('touchend', onEnd, { passive: true });
      container.addEventListener('mouseenter', onStart);
      container.addEventListener('mouseleave', onEnd);

      startTimer();
    }

