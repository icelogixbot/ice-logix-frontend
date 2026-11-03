// ============================================================
// ICE LOGIX Module: Reports & Reviews
// ============================================================
    function getReviewPlatformLogo(key) {
      if (typeof window !== 'undefined' && window.REVIEWS_PLATFORM_LOGOS && window.REVIEWS_PLATFORM_LOGOS[key]) {
        return window.REVIEWS_PLATFORM_LOGOS[key];
      }
      return `/assets/reviews-platforms/${key}.png`;
    }

    // ==================== РЕНДЕР ОТЧЁТОВ ====================
    async function renderReports() {
      try {
        let reportsData = null;
        if (window.CacheDB) {
          try {
            if (typeof window.CacheDB.delete === 'function') window.CacheDB.delete('public_reports_feed');
            if (typeof window.CacheDB.remove === 'function') window.CacheDB.remove('public_reports_feed');
          } catch(e) {}
          reportsData = await window.CacheDB.get('public_reports_feed_v3', async () => {
            const { data: rep } = await supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false });
            return { data: rep || [] };
          }, 30000);
        } else {
          const { data: rep } = await supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false });
          reportsData = { data: rep || [] };
        }
        
        const data = (reportsData?.data || []).filter(r => r && r.title && r.title.trim() && r.image_url);
        
        if (data.length === 0) {
          return `
            <div class="page-enter px-4 pb-8 max-w-md mx-auto space-y-4">
              <div class="flex items-center gap-3 mb-2 mt-2">
                <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <div class="flex-1 min-w-0">
                  <h2 class="text-xl font-bold text-white tracking-wide">Публичные отчёты</h2>
                  <p class="text-[11px] text-white/40">Фото и распаковки доставленных заказов</p>
                </div>
              </div>

              <div class="glass-card p-6 text-center border border-white/10 rounded-2xl relative overflow-hidden bg-white/[0.02] my-4 shadow-xl">
                <div class="absolute -right-8 -top-8 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div class="absolute -left-8 -bottom-8 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                
                <div class="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                
                <h3 class="text-white font-bold text-base tracking-wide">Пока нет опубликованных отчётов</h3>
                <p class="text-white/50 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                  Здесь публикуются живые фото и видео распаковок выкупленных заказов после их поступления на наш склад и вручения клиентам.
                </p>

                <div class="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-center gap-2 text-cyan-400 text-[11px] font-semibold">
                  <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Лента пополняется по мере доставок</span>
                </div>
              </div>
            </div>
            ${renderFooter()}
          `;
        }
        return `
          <div class="page-enter px-4 pb-8 max-w-md mx-auto space-y-4">
            <div class="flex items-center gap-3 mb-2 mt-2">
              <button type="button" class="global-back-btn !mb-0" onclick="window.goBackGlobal()" title="Назад">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div class="flex-1 min-w-0">
                <h2 class="text-xl font-bold text-white tracking-wide">Публичные отчёты</h2>
                <p class="text-[11px] text-white/40">Фото и видео доставленных заказов</p>
              </div>
            </div>
            <div class="space-y-4">
            ${data.map(report => {
              let mediaUrls = [];
              try { mediaUrls = JSON.parse(report.image_url); } catch(e) { mediaUrls = [report.image_url]; }
              if (!Array.isArray(mediaUrls)) mediaUrls = [report.image_url];

              return `
              <div class="glass-card overflow-hidden !p-0 border border-white/5 shadow-xl">
                <div class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                  ${mediaUrls.map((url, idx) => `
                    <div class="w-full flex-shrink-0 snap-start relative h-[320px]">
                      ${report.type === 'video' ? `<video src="${url}" class="w-full h-full object-cover" controls></video>` : `<img src="${url}" class="w-full h-full object-cover" alt="${report.title}" onclick="tgUtil.popup('${url}', 'Фото отчета')">`}
                      ${mediaUrls.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full text-white text-[10px]">${idx + 1} / ${mediaUrls.length}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
                <div class="p-4">
                  <h3 class="text-white font-bold text-lg leading-tight">${report.title}</h3>
                  <p class="text-white/70 text-sm mt-2 whitespace-pre-wrap">${report.description || ''}</p>
                  <div class="flex justify-between items-center mt-4">
                    <span class="text-white/40 text-[10px] uppercase font-bold tracking-wider">${new Date(report.created_at).toLocaleDateString('ru-RU')}</span>
                    ${report.product_url ? `<button class="btn-primary orderFromReportBtn transition !py-1.5 !px-3 !text-xs" data-url="${report.product_url}"><span class="ix text-[12px]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span> Хочу такой же</button>` : ''}
                  </div>
                </div>
              </div>
            `;}).join('')}
          </div>
          </div>
          ${renderFooter()}
        `;
      } catch (err) { return '<p class="text-center mt-10 text-red-400">Ошибка загрузки отчётов</p>'; }
    }

    function attachReportsHandlers() {
      document.querySelectorAll('.orderFromReportBtn').forEach(btn => {
        btn.onclick = () => {
          if (!window.userId) { window.requireAuth('Для оформления заказа необходимо войти или зарегистрироваться.'); return; }
          const url = btn.getAttribute('data-url');
          window.tempOrder = { url: url, price: 520, weight: 1, total: 0, discountAmount: 0, appliedPromo: null };
          switchTab('neworder');
        };
      });
    }

        // ==================== РЕНДЕР ОТЗЫВОВ ====================
        window.currentReviewsCategory = window.currentReviewsCategory || 'all';
        window.currentReviewsConfig = window.currentReviewsConfig || null;
        window.likedReviewsCache = window.likedReviewsCache || null;

        // Helper function for external links using Telegram SDK or browser window
        function openExternalLink(url) {
          if (!url) return;
          try {
            const tg = window.Telegram?.WebApp;
            if (tg && typeof tg.openLink === 'function') {
              tg.openLink(url);
            } else {
              window.open(url, '_blank');
            }
          } catch (e) {
            window.open(url, '_blank');
          }
        }

        async function loadUserLikes() {
          if (!userId) return;
          if (window.likedReviewsCache) return;
          try {
            const { data } = await supabaseClient.from('review_likes').select('review_id').eq('user_id', userId);
            window.likedReviewsCache = new Set();
            if (data) {
              data.forEach(item => window.likedReviewsCache.add(item.review_id));
            }
          } catch (e) {
            console.error('Failed to load user likes:', e);
          }
        }

        // Ссылка из настроек попадает в разметку: пропускаем только обычный http(s)-адрес без кавычек и скобок
        function reviewLink(u, fallback) {
          const s = String(u || '').trim();
          return /^https?:\/\/[^\s"'<>\\`]+$/i.test(s) ? s : fallback;
        }

        async function loadReviewsConfig() {
          if (window.currentReviewsConfig) return window.currentReviewsConfig;
          try {
            const { data, error } = await supabaseClient.from('settings').select('value').eq('key', 'reviews_config').single();
            if (!error && data && data.value) {
              window.currentReviewsConfig = data.value;
            }
          } catch (e) {
            console.error('Failed to load reviews config:', e);
          }
          if (!window.currentReviewsConfig) {
            window.currentReviewsConfig = {
              yandex_maps_link: "https://yandex.by/maps/org/ice_logix/12345678",
              google_maps_link: "https://maps.google.com/?cid=12345678",
              gis_2_link: "https://2gis.by/minsk/firm/12345678",
              telegram_group_link: "https://t.me/icelogix_reviews",
              partner_user_ids: []
            };
          }
          return window.currentReviewsConfig;
        }

        // ── Единый экран «Отзывы»: площадки сверху, лента с подгрузкой при прокрутке ──
        const RV_PAGE = 10;
        const RV_CATS = [
          ['all', 'Все'], ['orders', 'Заказы'], ['promotions', 'Акции'], ['dropshipping', 'Дропшиппинг'],
          ['referral', 'Рефералка'], ['advertising', 'Реклама'], ['academy', 'Обучение'],
          ['legitcheck', 'Legit Check'], ['partnership', 'Партнёрство']
        ];
        const RV_CAT_LABEL = Object.fromEntries(RV_CATS);
        const rvState = { cat: 'all', items: [], done: false, loading: false, token: 0, obs: null };

        function rvEsc(s) {
          return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        function rvFmtDate(d) {
          try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
        }

        // Первая страница ленты по категории: короткий кэш, чтобы экран открывался сразу
        async function rvFetchPage(cat, from) {
          const run = async () => {
            let q = supabaseClient.from('reviews')
              .select('id,user_name,category,rating,text,photo_urls:media_urls,is_verified,is_pinned,likes_count,created_at,review_actions(details)')
              .eq('is_published', true);
            if (cat !== 'all') q = q.eq('category', cat);
            const { data, error } = await q
              .order('is_pinned', { ascending: false })
              .order('created_at', { ascending: false })
              .range(from, from + RV_PAGE - 1);
            if (error) throw error;
            return data || [];
          };
          if (from === 0 && window.CacheDB) return window.CacheDB.get('reviews_p1_' + cat, run, 60000);
          return run();
        }

        function rvPlatformsHtml(config) {
          const sm = config.social_media_links || {};
          const row = list => list.map(([key, name, url]) => `
            <button type="button" class="rv-plat" data-rv-url="${rvEsc(url)}" aria-label="${name}">
              <img class="rv-plat-logo" src="/assets/reviews-platforms/${key}.webp" alt="" width="52" height="52" decoding="async">
              <span class="rv-plat-name">${name}</span>
            </button>`).join('');
          const maps = [
            ['yandex-maps', 'Яндекс Карты', reviewLink(config.yandex_maps_link, 'https://yandex.by/maps/')],
            ['google-maps', 'Google Maps', reviewLink(config.google_maps_link, 'https://maps.google.com/')],
            ['2gis', '2ГИС', reviewLink(config.gis_2_link, 'https://2gis.by/')]
          ];
          const socials = [
            ['telegram', 'Telegram', reviewLink(config.telegram_group_link, 'https://t.me/')],
            ['vk', 'ВКонтакте', reviewLink(sm.vk, 'https://vk.com/')],
            ['threads', 'Threads', reviewLink(sm.threads, 'https://www.threads.com/')],
            ['instagram', 'Instagram', reviewLink(sm.instagram, 'https://www.instagram.com/')],
            ['facebook', 'Facebook', reviewLink(sm.facebook, 'https://www.facebook.com/')]
          ];
          return `
            <p class="rv-hub-t">Отзывы о нас на независимых площадках</p>
            <div class="rv-plats">${row(maps)}</div>
            <div class="rv-hub-sep"></div>
            <p class="rv-hub-t">А ещё отзывы клиентов есть в наших соцсетях</p>
            <div class="rv-plats">${row(socials)}</div>`;
        }

        function rvDetailsHtml(r) {
          let a = r.review_actions;
          if (Array.isArray(a)) a = a[0];
          const d = a && a.details;
          if (!d) return '';
          const rows = [['Товар', d.product], ['Размер', d.size], ['Доставка', d.delivery], ['Срок', d.term], ['Сумма', d.amount]].filter(x => x[1]);
          if (!rows.length) return '';
          return `
            <button type="button" class="rv-more" data-rv-toggle aria-expanded="false"><span>Детали заказа</span>${UI.icon('chevD', 16)}</button>
            <div class="rv-det" hidden>${rows.map(([k, v]) => `<div class="rv-det-row"><span>${k}</span><b>${rvEsc(v)}</b></div>`).join('')}</div>`;
        }

        function rvCardHtml(r) {
          const photos = Array.isArray(r.photo_urls) ? r.photo_urls.filter(Boolean) : [];
          const liked = window.likedReviewsCache && window.likedReviewsCache.has(r.id);
          const rating = Math.max(0, Math.min(5, Number(r.rating) || 0));
          const name = r.user_name || 'Клиент';
          const pinBtn = isOwner
            ? `<button type="button" class="rv-pin ${r.is_pinned ? 'on' : ''}" data-rv-pin aria-label="${r.is_pinned ? 'Открепить' : 'Закрепить'}">${UI.icon('pin', 16, { fill: !!r.is_pinned })}</button>`
            : (r.is_pinned ? `<span class="rd-status rv-pinned">${UI.icon('pin', 12)}Закреплён</span>` : '');
          return `
            <article class="rd-card rv-card" data-review-id="${r.id}">
              <div class="rv-top">
                <div class="rv-ava">${rvEsc(name.charAt(0).toUpperCase())}</div>
                <div class="rv-who">
                  <div class="rv-name">${rvEsc(name)}${r.is_verified ? `<span class="rv-ok" title="Заказ подтверждён">${UI.icon('checkCircle', 14)}</span>` : ''}</div>
                  <div class="rv-meta">${rvEsc(RV_CAT_LABEL[r.category] || 'Отзыв')} · ${rvFmtDate(r.created_at)}</div>
                </div>
                ${pinBtn}
              </div>
              <div class="rv-stars" aria-label="Оценка ${rating} из 5">${[1, 2, 3, 4, 5].map(i => UI.icon('star', 16, { fill: i <= rating })).join('')}</div>
              <p class="rv-text">${rvEsc(r.text)}</p>
              ${photos.length ? `<div class="rv-photos">${photos.slice(0, 3).map((u, i) => `<button type="button" class="rv-ph" data-rv-ph="${i}"><img src="${rvEsc(u)}" alt="" loading="lazy" decoding="async">${i === 2 && photos.length > 3 ? `<span class="rv-ph-more">+${photos.length - 3}</span>` : ''}</button>`).join('')}</div>` : ''}
              ${rvDetailsHtml(r)}
              <div class="rv-foot">
                <button type="button" class="rv-like ${liked ? 'on' : ''}" data-rv-like aria-label="Нравится">${UI.icon('heart', 18, { fill: !!liked })}<span class="rv-like-n">${r.likes_count || 0}</span></button>
              </div>
            </article>`;
        }

        function rvSkeleton(n) {
          return Array.from({ length: n }).map(() => '<div class="rd-card rv-card rv-skel"><div class="rd-shimmer rv-sk-a"></div><div class="rd-shimmer rv-sk-b"></div><div class="rd-shimmer rv-sk-c"></div></div>').join('');
        }

        function rvEmptyHtml() {
          return UI.empty({ icon: 'message', title: 'Пока нет отзывов', text: 'Отзывы появляются после получения заказа. Скоро здесь будут первые.' });
        }

        function rvListHtml(items) {
          return items.length ? items.map(rvCardHtml).join('') : rvEmptyHtml();
        }

        async function renderReviews() {
          try {
            const cat = window.currentReviewsCategory || 'all';
            rvState.cat = cat;
            rvState.token++;
            const config = await loadReviewsConfig();
            const [, first] = await Promise.all([
              loadUserLikes(),
              rvFetchPage(cat, 0).catch(e => { console.error('Reviews feed error:', e); return null; })
            ]);

            if (userId) setTimeout(() => checkAndCreateDropshipperAction(), 0);

            rvState.items = first || [];
            rvState.done = !first || first.length < RV_PAGE;
            rvState.loading = false;

            return `
              <div class="rd-screen page-enter rv" id="rvRoot">
                <div class="rd-head">
                  <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${UI.icon('chevL', 22)}</button>
                  <div class="rd-head-txt"><h1 class="rd-head-title">Отзывы</h1><p class="rd-head-sub">Что говорят о нас клиенты</p></div>
                </div>

                <div class="rd-card rv-hub">${rvPlatformsHtml(config)}</div>

                <div class="rd-chips rv-chips" id="rvChips">
                  ${RV_CATS.map(([id, label]) => `<button type="button" class="rd-chip ${cat === id ? 'on' : ''}" data-rv-cat="${id}">${label}</button>`).join('')}
                </div>

                <div class="rv-list" id="rvList">${first === null ? UI.empty({ icon: 'alert', title: 'Не удалось загрузить', text: 'Проверьте интернет и откройте раздел ещё раз.' }) : rvListHtml(rvState.items)}</div>
                <div class="rv-sentinel" id="rvSentinel"></div>
              </div>`;
          } catch (err) {
            console.error('Error rendering reviews screen:', err);
            return UI.empty({ icon: 'alert', title: 'Ошибка загрузки отзывов', text: rvEsc(err.message) });
          }
        }

        async function rvLoadMore() {
          if (rvState.loading || rvState.done) return;
          const list = document.getElementById('rvList');
          if (!list || !rvState.items.length) return;
          const token = rvState.token;
          rvState.loading = true;
          const sk = document.createElement('div');
          sk.className = 'rv-more-skel';
          sk.innerHTML = rvSkeleton(1);
          list.appendChild(sk);
          try {
            const rows = await rvFetchPage(rvState.cat, rvState.items.length);
            if (token !== rvState.token) { sk.remove(); return; }
            const known = new Set(rvState.items.map(r => r.id));
            const fresh = rows.filter(r => !known.has(r.id));
            rvState.items = rvState.items.concat(fresh);
            if (rows.length < RV_PAGE || !fresh.length) rvState.done = true;
            sk.remove();
            list.insertAdjacentHTML('beforeend', fresh.map(rvCardHtml).join(''));
          } catch (e) {
            console.error('Reviews load more failed:', e);
            sk.remove();
          } finally {
            if (token === rvState.token) rvState.loading = false;
          }
        }

        async function rvSwitchCategory(cat) {
          if (cat === rvState.cat) return;
          window.currentReviewsCategory = cat;
          rvState.cat = cat;
          const token = ++rvState.token;
          rvState.items = [];
          rvState.done = false;
          rvState.loading = true;
          document.querySelectorAll('#rvChips .rd-chip').forEach(c => c.classList.toggle('on', c.dataset.rvCat === cat));
          const list = document.getElementById('rvList');
          if (!list) return;
          list.innerHTML = rvSkeleton(3);
          try {
            const rows = await rvFetchPage(cat, 0);
            if (token !== rvState.token) return;
            rvState.items = rows;
            rvState.done = rows.length < RV_PAGE;
            list.innerHTML = rvListHtml(rows);
          } catch (e) {
            console.error('Reviews category load failed:', e);
            if (token === rvState.token) { rvState.cat = ''; list.innerHTML = UI.empty({ icon: 'alert', title: 'Не удалось загрузить', text: 'Попробуйте ещё раз.' }); }
          } finally {
            if (token === rvState.token) rvState.loading = false;
          }
        }

        async function checkAndCreateDropshipperAction() {
          if (!userId) return;
          try {
            // 1. Check if user has dropshipper settings
            const { data: dsSettings, error: dsErr } = await supabaseClient.from('dropshipper_settings').select('user_id').eq('user_id', userId).maybeSingle();
            if (dsErr || !dsSettings) return;

            // 2. Count dropshipping reviews
            const { count: K, error: kErr } = await supabaseClient.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('category', 'dropshipping');
            if (kErr) return;

            // 3. Count completed payouts
            const { count: P, error: pErr } = await supabaseClient.from('payout_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['approved', 'completed']);
            if (pErr) return;

            // 4. Get S (sales)
            const { data: referrals, error: refErr } = await supabaseClient.from('referrals').select('referred_id').eq('referrer_id', userId);
            if (refErr || !referrals || referrals.length === 0) return;
            
            const referredIds = referrals.map(r => r.referred_id);
            const { count: S, error: sErr } = await supabaseClient.from('orders').select('id', { count: 'exact', head: true }).in('user_id', referredIds).eq('status', 'delivered').gt('drop_margin', 0);
            if (sErr) return;

            // 5. Qualify checks: K=0 -> S>=1 & P>=1; K>0 -> S>=1+3*K & P>=1
            let qualifies = false;
            if (K === 0) {
              qualifies = (S >= 1 && P >= 1);
            } else {
              qualifies = (S >= (1 + 3 * K) && P >= 1);
            }

            if (qualifies) {
              const targetId = 'dropshipping_' + K;
              // Check if it already exists to prevent duplicates
              const { data: existing, error: existErr } = await supabaseClient.from('review_actions').select('id').eq('category', 'dropshipping').eq('target_id', targetId).maybeSingle();
              if (!existErr && !existing) {
                await supabaseClient.from('review_actions').insert({
                  user_id: userId,
                  category: 'dropshipping',
                  target_id: targetId,
                  title: K === 0 ? 'Дропшиппинг (Первая продажа)' : `Дропшиппинг (Успешные продажи: ${S})`,
                  details: { product: 'Программа дропшиппинга B2B', amount: 'Выплаты по B2B-программе', delivery: 'РБ/РФ', term: 'Постоянно' },
                  status: 'pending'
                });
              }
            }
          } catch (err) {
            console.error('Error checking/creating dropshipper action:', err);
          }
        }

        async function openReviewActionModal(preselectedTargetId) {
          if (!userId) { window.requireAuth('Для написания отзыва необходимо войти.'); return; }

          const modal = document.createElement('div');
          modal.className = 'full-screen-modal-overlay page-enter';
          modal.id = 'reviewActionModal';
          document.body.appendChild(modal);

          let partnerUserIds = [];
          try {
            if (window.currentReviewsConfig) {
              partnerUserIds = window.currentReviewsConfig.partner_user_ids || [];
            }
          } catch (e) {}
          
          const isPartner = partnerUserIds.map(id => id.toString()).includes(userId.toString()) || (window.userRole === 'partner');

          // Dynamically check and create dropshipper action *before* fetching user actions
          await checkAndCreateDropshipperAction();

          let actions = [];
          try {
            const { data } = await supabaseClient.from('review_actions').select('*').eq('user_id', userId).eq('status', 'pending');
            if (data) actions = data;
          } catch (e) {
            console.error(e);
          }

          // If partner, permanently insert partnership review action locally
          if (isPartner) {
            actions.unshift({
              id: 'partnership_permanent',
              category: 'partnership',
              target_id: 'partnership_permanent',
              title: 'Партнерство B2B (Постоянно доступно)',
              details: { product: 'B2B Партнерство', delivery: 'РБ/РФ/СНГ', term: 'Постоянно' },
              status: 'pending'
            });
          }

          const matchedAction = preselectedTargetId ? actions.find(a => a.id === preselectedTargetId || a.target_id === preselectedTargetId) : null;

          const showState = () => {
            if (matchedAction) {
              showForm(matchedAction);
              return;
            }

            if (actions.length === 0) {
              modal.innerHTML = `
                <div class="full-screen-modal-header">
                  <button type="button" class="global-back-btn !mb-0" id="closeReviewModalBtn" title="Назад">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <div class="text-center">
                    <h3 class="text-white font-bold text-sm truncate">Отзывы</h3>
                  </div>
                  <div style="width: 48px;"></div>
                </div>
                <div class="full-screen-modal-body flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <span style="color: var(--rd-blue);">${UI.icon('checkCircle', 56)}</span>
                  <h3 class="text-white font-bold text-lg">Нет доступных действий</h3>
                  <p class="text-white/60 text-xs">
                    Вы выполнили все доступные действия для написания отзывов! Новые действия появятся автоматически после доставки ваших заказов или участия в реферальной системе.
                  </p>
                  <button class="btn-primary w-full max-w-xs py-3.5 rounded-xl font-bold" id="closeReviewModalBtn2">Отлично</button>
                </div>
              `;
              const closeHandler = () => {
                modal.remove();
                clearBlobUrls('review:');
                renderCurrentScreen();
              };
              modal.querySelector('#closeReviewModalBtn').onclick = closeHandler;
              const b2 = modal.querySelector('#closeReviewModalBtn2');
              if (b2) b2.onclick = closeHandler;
              return;
            }

            if (actions.length >= 2) {
              modal.innerHTML = `
                <div class="full-screen-modal-header">
                  <button type="button" class="global-back-btn !mb-0" id="closeReviewModalBtn" title="Назад">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <div class="text-center">
                    <h3 class="text-white font-bold text-sm truncate">Доступные действия</h3>
                    <p class="text-white/40 text-[10px]">Выберите заказ или категорию</p>
                  </div>
                  <div style="width: 48px;"></div>
                </div>
                <div class="full-screen-modal-body space-y-4 text-left">
                  <p class="text-white/60 text-xs">У вас есть несколько доступных действий для отзыва. Выберите одно, чтобы продолжить:</p>
                  <div class="space-y-2.5">
                    ${actions.map(a => `
                      <div class="p-3.5 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-2xl cursor-pointer transition select-action-card" data-action-id="${a.id}">
                        <div class="flex justify-between items-center text-left">
                          <span class="text-white font-bold text-xs uppercase bg-white/5 px-2 py-0.5 rounded-full">${a.category}</span>
                          <span class="text-[10px] text-white/40">Доступно</span>
                        </div>
                        <h4 class="text-white font-bold text-sm mt-1.5">${a.title}</h4>
                        ${a.details && a.details.product ? `
                          <p class="text-white/50 text-[11px] mt-1">Товар: ${a.details.product} (${a.details.size || 'размер не указан'})</p>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
              modal.querySelector('#closeReviewModalBtn').onclick = () => {
                modal.remove();
                clearBlobUrls('review:');
              };
              modal.querySelectorAll('.select-action-card').forEach(card => {
                card.onclick = () => {
                  const actionId = card.getAttribute('data-action-id');
                  const selectedAction = actions.find(a => a.id === actionId);
                  showForm(selectedAction);
                };
              });
            } else {
              const selectedAction = actions[0];
              showForm(selectedAction);
            }
          };

          const showForm = (action) => {
            const category = action ? action.category : 'orders';
            let selectedStars = 5;

            modal.innerHTML = `
              <div class="full-screen-modal-header">
                <button type="button" class="global-back-btn !mb-0" id="backToActionsBtn" title="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <div class="text-center">
                  <h3 class="text-white font-bold text-sm truncate">Оставить отзыв</h3>
                  <p class="text-white/40 text-[10px]">Честный отзыв клиента</p>
                </div>
                <div style="width: 48px;"></div>
              </div>

              <div class="full-screen-modal-body space-y-4 text-left">
                ${action ? `
                  <div class="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white/70 space-y-1 text-left">
                    <div class="font-bold text-cyan-400">Действие: ${action.title}</div>
                    ${action.details && action.details.product ? `
                      <div>🛍️ Товар: ${action.details.product}</div>
                      ${action.details.size ? `<div>📏 Размер: ${action.details.size}</div>` : ''}
                      ${action.details.delivery ? `<div>📍 Направление: ${action.details.delivery}</div>` : ''}
                    ` : ''}
                  </div>
                ` : `
                  <div class="space-y-1">
                    <label class="text-white/60 text-xs font-bold uppercase tracking-wider">Категория</label>
                    <select id="reviewFormCategory" class="btn-secondary w-full p-3 rounded-xl border border-white/10 text-white text-sm">
                      <option value="orders">Заказы 🛒</option>
                      <option value="promotions">Акции 🔥</option>
                      <option value="dropshipping">Дропшиппинг 📦</option>
                      <option value="referral">Рефералы 👥</option>
                      <option value="advertising">Реклама 📢</option>
                      <option value="academy">Академия 🎓</option>
                      <option value="legitcheck">Legit Check 🔍</option>
                      <option value="partnership">Партнерство 🏢</option>
                    </select>
                  </div>
                `}

                <div class="space-y-1 ${category === 'orders' ? '' : 'hidden'}" id="countrySelectContainer">
                  <label class="text-white/60 text-xs font-bold uppercase tracking-wider">Страна площадки</label>
                  <select id="reviewFormCountry" class="btn-secondary w-full p-3 rounded-xl border border-white/10 text-white text-sm">
                    <option value="china">Китай 🇨🇳</option>
                    <option value="europe">Европа 🇪🇺</option>
                    <option value="russia">Россия 🇷🇺</option>
                    <option value="usa">США 🇺🇸</option>
                    <option value="uae">ОАЭ 🇦🇪</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="text-white/60 text-xs font-bold uppercase tracking-wider block">Ваша оценка</label>
                  <div class="flex gap-2 text-2xl cursor-pointer" id="formStarsRow">
                    <span data-star="1" class="text-amber-400">★</span>
                    <span data-star="2" class="text-amber-400">★</span>
                    <span data-star="3" class="text-amber-400">★</span>
                    <span data-star="4" class="text-amber-400">★</span>
                    <span data-star="5" class="text-amber-400">★</span>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-white/60 text-xs font-bold uppercase tracking-wider block">Текст отзыва</label>
                  <textarea id="reviewFormText" class="btn-secondary w-full p-3 rounded-xl border border-white/10 text-white text-sm" rows="4" placeholder="Напишите честный отзыв..."></textarea>
                </div>

                <div class="space-y-1">
                  <label class="text-white/60 text-xs font-bold uppercase tracking-wider block">
                    Фото "Вживую" (До 3 штук)
                  </label>
                  <input type="file" id="reviewFormPhotos" multiple accept="image/*" class="w-full text-white text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-400 hover:file:bg-cyan-500/30">
                  <div id="reviewFormPhotoPreviews" class="flex gap-2 mt-2"></div>
                </div>

                <button id="submitReviewFormBtn" class="btn-primary w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2">
                  Отправить отзыв
                </button>
              </div>
            `;

            const backBtn = modal.querySelector('#backToActionsBtn');
            if (backBtn) {
              backBtn.onclick = () => {
                if (actions.length >= 2) {
                  showState();
                } else {
                  modal.remove();
                  clearBlobUrls('review:');
                }
              };
            }

            const catSel = modal.querySelector('#reviewFormCategory');
            if (catSel) {
              catSel.onchange = () => {
                const countryCont = modal.querySelector('#countrySelectContainer');
                if (catSel.value === 'orders') {
                  countryCont.classList.remove('hidden');
                } else {
                  countryCont.classList.add('hidden');
                }
              };
            }

            const starsRow = modal.querySelector('#formStarsRow');
            const starsSpans = starsRow.querySelectorAll('span');
            starsSpans.forEach(span => {
              span.onclick = () => {
                const val = parseInt(span.getAttribute('data-star'));
                selectedStars = val;
                starsSpans.forEach(s => {
                  const sVal = parseInt(s.getAttribute('data-star'));
                  if (sVal <= val) {
                    s.innerText = '★';
                    s.className = 'text-amber-400';
                  } else {
                    s.innerText = '☆';
                    s.className = 'text-white/30';
                  }
                });
              };
            });

            // Live image previews
            const photoInput = modal.querySelector('#reviewFormPhotos');
            photoInput.onchange = () => {
              const previewContainer = modal.querySelector('#reviewFormPhotoPreviews');
              if (!previewContainer) return;
              previewContainer.innerHTML = '';
              clearBlobUrls('review:');
              if (photoInput.files) {
                Array.from(photoInput.files).slice(0, 3).forEach((file, index) => {
                  const url = trackBlobUrl(`review:${index}`, file);
                  const img = document.createElement('img');
                  img.src = url;
                  img.className = 'w-16 h-16 object-cover rounded-lg border border-white/10';
                  previewContainer.appendChild(img);
                });
              }
            };

            const submitBtn = modal.querySelector('#submitReviewFormBtn');
            submitBtn.onclick = async () => {
              const text = modal.querySelector('#reviewFormText').value.trim();
              const finalCategory = action ? action.category : modal.querySelector('#reviewFormCategory').value;
              const finalCountry = (finalCategory === 'orders') ? modal.querySelector('#reviewFormCountry').value : null;

              if (!text) {
                tgUtil.alert('Пожалуйста, введите текст отзыва.');
                return;
              }

              submitBtn.disabled = true;
              submitBtn.innerText = 'Проверка AI...';

              try {
                // Client-side anti-flood check (1 review per 10 minutes limit)
                try {
                  const { data: lastReviews, error: lfErr } = await supabaseClient
                    .from('reviews')
                    .select('created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                  
                  if (!lfErr && lastReviews && lastReviews.length > 0) {
                    const lastTime = new Date(lastReviews[0].created_at).getTime();
                    const now = Date.now();
                    const diffMinutes = (now - lastTime) / (1000 * 60);
                    if (diffMinutes < 10) {
                      const waitMin = Math.ceil(10 - diffMinutes);
                      tgUtil.alert(`Вы не можете оставлять отзывы слишком часто. Пожалуйста, подождите ещё ${waitMin} мин.`);
                      submitBtn.disabled = false;
                      submitBtn.innerText = 'Отправить отзыв';
                      return;
                    }
                  }
                } catch (e) {
                  console.warn('Anti-flood check error:', e);
                }

                let processedText = text;
                try {
                  const aiResult = await supabaseClient.functions.invoke('ai-review-correction', {
                    body: { text: text }
                  });
                  if (aiResult && aiResult.data) {
                    if (aiResult.data.corrected && aiResult.data.text) {
                      processedText = aiResult.data.text;
                    } else if (aiResult.data.correctedText) {
                      processedText = aiResult.data.correctedText;
                    }
                  }
                } catch (e) {
                  console.warn('AI Correction call error:', e);
                }

                if (processedText !== text) {
                  const userConfirmed = await tgUtil.confirm(`Бот-помощник адаптировал ваш отзыв для публикации (заменил стоп-слова):\n\n"${processedText}"\n\nПродолжить отправку?`);
                  if (!userConfirmed) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Отправить отзыв';
                    return;
                  }
                }

                submitBtn.innerText = 'Загрузка фото...';

                let photoUrls = [];
                if (photoInput.files && photoInput.files.length > 0) {
                  for (let i = 0; i < photoInput.files.length; i++) {
                    if (i >= 3) break;
                    const file = photoInput.files[i];
                    const ext = file.name.split('.').pop() || 'jpg';
                    const filename = `review_${userId}_${Date.now()}_${i}.${ext}`;
                    const { data, error } = await supabaseClient.storage.from('review-photos').upload(filename, file);
                    if (error) throw error;
                    const { data: publicData } = supabaseClient.storage.from('review-photos').getPublicUrl(filename);
                    if (publicData) photoUrls.push(publicData.publicUrl);
                  }
                }

                submitBtn.innerText = 'Сохранение...';

                const reviewData = {
                  user_id: userId,
                  rating: selectedStars,
                  text: processedText,
                  user_name: userName || 'Пользователь',
                  is_verified: true,
                  media_urls: photoUrls,
                  category: finalCategory,
                  region: finalCountry,
                  target_action_id: (action && action.id !== 'partnership_permanent') ? action.id : null,
                  moderation_status: 'pending',
                  is_published: false
                };

                const { data: insertedReview, error: insertErr } = await supabaseClient.from('reviews').insert(reviewData).select().single();
                if (insertErr) throw insertErr;

                if (action && action.id !== 'partnership_permanent') {
                  await supabaseClient.from('review_actions').update({ status: 'reviewed' }).eq('id', action.id);
                  actions = actions.filter(a => a.id !== action.id);
                }

                tgUtil.alert('Спасибо за отзыв! Он появится после модерации.');

                if (actions.length > 0) {
                  const writeAnother = await tgUtil.confirm('У вас есть еще доступные действия для отзыва! Хотите написать еще один отзыв?');
                  if (writeAnother) {
                    showState();
                    return;
                  }
                }

                modal.remove();
                clearBlobUrls('review:');
                renderCurrentScreen();

              } catch (err) {
                console.error('Submit review error:', err);
                tgUtil.alert('Ошибка отправки: ' + err.message);
                submitBtn.disabled = false;
                submitBtn.innerText = 'Отправить отзыв';
              }
            };
          };

          showState();
        }

        function rvSetLikeUi(card, liked, count) {
          const btn = card.querySelector('[data-rv-like]');
          if (!btn) return;
          btn.classList.toggle('on', liked);
          btn.innerHTML = `${UI.icon('heart', 18, { fill: liked })}<span class="rv-like-n">${count}</span>`;
        }

        async function toggleReviewLike(card, reviewId, forceOn) {
          if (!userId) { window.requireAuth('Для взаимодействия с отзывами необходимо войти.'); return; }
          window.likedReviewsCache = window.likedReviewsCache || new Set();
          const wasLiked = window.likedReviewsCache.has(reviewId);
          if (forceOn && wasLiked) return;
          const nEl = card.querySelector('.rv-like-n');
          let count = parseInt(nEl && nEl.textContent, 10) || 0;
          if (wasLiked) { window.likedReviewsCache.delete(reviewId); count = Math.max(0, count - 1); }
          else { window.likedReviewsCache.add(reviewId); count += 1; }
          rvSetLikeUi(card, !wasLiked, count);
          const item = rvState.items.find(r => r.id === reviewId);
          if (item) item.likes_count = count;
          if (window.CacheDB && window.CacheDB.clear) { try { window.CacheDB.clear('reviews_p1_' + rvState.cat); } catch (e) {} }
          try {
            if (wasLiked) await supabaseClient.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
            else await supabaseClient.from('review_likes').insert({ review_id: reviewId, user_id: userId });
          } catch (err) {
            console.error('Failed to sync like status:', err);
          }
        }

        function triggerDoubleTapLike(card, reviewId, x, y) {
          const heart = document.createElement('div');
          heart.className = 'rv-heart-pop';
          heart.style.left = `${x}px`;
          heart.style.top = `${y}px`;
          heart.innerHTML = UI.icon('heart', 64, { fill: true });
          card.appendChild(heart);
          setTimeout(() => heart.remove(), 800);
          toggleReviewLike(card, reviewId, true);
        }

        async function toggleReviewPin(reviewId, card) {
          if (!isOwner) return;
          try {
            const item = rvState.items.find(r => r.id === reviewId);
            const newPinned = !(item && item.is_pinned);
            const { error } = await supabaseClient.from('reviews').update({ is_pinned: newPinned }).eq('id', reviewId);
            if (error) throw error;
            if (item) item.is_pinned = newPinned;
            tgUtil.haptic('success');
            const btn = card && card.querySelector('[data-rv-pin]');
            if (btn) {
              btn.classList.toggle('on', newPinned);
              btn.setAttribute('aria-label', newPinned ? 'Открепить' : 'Закрепить');
              btn.innerHTML = UI.icon('pin', 16, { fill: newPinned });
            }
            if (window.CacheDB && window.CacheDB.clear) { try { window.CacheDB.clear('reviews_p1_' + rvState.cat); } catch (e) {} }
          } catch (e) {
            console.error('Failed to toggle review pin status:', e);
            tgUtil.alert('Не удалось изменить закрепление: ' + e.message);
          }
        }

        function attachReviewsHandlers() {
          const root = document.getElementById('rvRoot');
          if (!root) return;

          root.addEventListener('click', (e) => {
            const t = e.target;
            const plat = t.closest('[data-rv-url]');
            if (plat) { openExternalLink(plat.dataset.rvUrl); return; }
            const chip = t.closest('[data-rv-cat]');
            if (chip) { rvSwitchCategory(chip.dataset.rvCat); return; }

            const card = t.closest('.rv-card');
            if (!card || !card.dataset.reviewId) return;
            const id = card.dataset.reviewId;
            if (t.closest('[data-rv-like]')) { toggleReviewLike(card, id); return; }
            if (t.closest('[data-rv-pin]')) { toggleReviewPin(id, card); return; }
            const ph = t.closest('[data-rv-ph]');
            if (ph) {
              const item = rvState.items.find(r => r.id === id);
              if (item && window.showImagePreview) window.showImagePreview(item.photo_urls.filter(Boolean), Number(ph.dataset.rvPh));
              return;
            }
            const tg = t.closest('[data-rv-toggle]');
            if (tg) {
              const det = card.querySelector('.rv-det');
              const open = tg.getAttribute('aria-expanded') !== 'true';
              tg.setAttribute('aria-expanded', open ? 'true' : 'false');
              if (det) det.hidden = !open;
            }
          });

          // Двойное касание по карточке — лайк
          let lastTap = 0, lastCard = null;
          root.addEventListener('touchend', (e) => {
            const card = e.target.closest('.rv-card');
            if (!card || !card.dataset.reviewId || e.target.closest('button')) return;
            const now = Date.now();
            if (lastCard === card && now - lastTap < 300 && now - lastTap > 0) {
              e.preventDefault();
              const touch = e.changedTouches[0];
              const rect = card.getBoundingClientRect();
              triggerDoubleTapLike(card, card.dataset.reviewId, touch.clientX - rect.left - 32, touch.clientY - rect.top - 32);
            }
            lastTap = now; lastCard = card;
          });

          // Подгрузка при прокрутке
          if (rvState.obs) rvState.obs.disconnect();
          const sentinel = document.getElementById('rvSentinel');
          if (sentinel && 'IntersectionObserver' in window) {
            rvState.obs = new IntersectionObserver((entries) => {
              if (entries.some(en => en.isIntersecting)) rvLoadMore();
            }, { rootMargin: '600px 0px' });
            rvState.obs.observe(sentinel);
          }
        }

        // Global Exports
        if (typeof renderReports === 'function') window.renderReports = renderReports;
        if (typeof attachReportsHandlers === 'function') window.attachReportsHandlers = attachReportsHandlers;
        window.openExternalLink = openExternalLink;
        window.loadUserLikes = loadUserLikes;
        window.loadReviewsConfig = loadReviewsConfig;
        window.renderReviews = renderReviews;
        window.checkAndCreateDropshipperAction = checkAndCreateDropshipperAction;
        window.openReviewActionModal = openReviewActionModal;
        window.triggerDoubleTapLike = triggerDoubleTapLike;
        window.toggleReviewLike = toggleReviewLike;
        window.toggleReviewPin = toggleReviewPin;
        window.attachReviewsHandlers = attachReviewsHandlers;
