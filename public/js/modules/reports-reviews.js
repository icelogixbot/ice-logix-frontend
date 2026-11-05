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

        const RV_PAGE = 10;
        const RV_CATS = [
          ['all', 'Все'], ['orders', 'Заказы'], ['promotions', 'Акции'], ['dropshipping', 'Дропшиппинг'],
          ['referral', 'Рефералка'], ['advertising', 'Реклама'],
          ['legitcheck', 'Legit Check'], ['partnership', 'Партнёрство']
        ];
        const RV_CAT_LABEL = Object.fromEntries(RV_CATS);
        const RV_SORTS = [['new', 'Новые'], ['best', 'Лучшие'], ['photo', 'С медиа']];
        const rvState = { cat: 'all', sort: 'new', stats: null, items: [], done: false, loading: false, token: 0, obs: null, failed: false };
        rvState.demoN = 0;
        // Сердечко лайка: пустое — контур, поставленный лайк — залитое
        function rvHeart(liked) { return UI.icon('heart', 24, { stroke: 2.2, fill: !!liked }); }
        // Значки плеера (линейные/залитые, как остальные иконки)
        const RV_PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 5.6v12.8a1 1 0 0 0 1.5.86l10.4-6.4a1 1 0 0 0 0-1.72L10 4.74a1 1 0 0 0-1.5.86z"/></svg>';
        const RV_PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.4"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4"/></svg>';
        const RV_MIC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';
        const RV_FLAG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>';
        const RV_MUTE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5m0-5-5 5"/></svg>';
        const RV_CAM ='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="12.5" height="12" rx="3"/><path d="m15.5 10.5 5-2.7v8.4l-5-2.7"/></svg>';

        function rvEsc(s) {
          return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        function rvFmtDate(d) {
          try {
            const dt = new Date(d);
            if (!d || isNaN(dt)) return '';
            const o = { timeZone: 'Europe/Minsk' };
            const day = dt.toLocaleDateString('ru-RU', { ...o, day: '2-digit', month: '2-digit', year: '2-digit' });
            const time = dt.toLocaleTimeString('ru-RU', { ...o, hour: '2-digit', minute: '2-digit' });
            return time + ', ' + day;
          } catch (e) { return ''; }
        }

        function rvPlural(n, f) {
          const a = Math.abs(n) % 100, b = a % 10;
          if (a > 10 && a < 20) return f[2];
          if (b > 1 && b < 5) return f[1];
          return b === 1 ? f[0] : f[2];
        }

        function rvCacheKey(cat, sort) { return 'reviews_p1_' + cat + '_' + sort; }
        function rvClearCache() {
          if (!(window.CacheDB && window.CacheDB.clear)) return;
          [rvState.cat, 'all'].forEach(c => RV_SORTS.forEach(([s]) => { try { window.CacheDB.clear(rvCacheKey(c, s)); } catch (e) {} }));
        }

        // Страница ленты: первая — с коротким кэшем, чтобы экран открывался сразу
        async function rvFetchPage(cat, sort, from) {
          const run = async () => {
            let q = supabaseClient.from('reviews')
              .select('id,user_id,user_name,category,rating,text,photo_urls:media_urls,is_verified,likes_count,created_at,order_ids,manager_reply,review_actions(details)')
              .eq('is_published', true)
              .is('resolves_review_id', null);
            if (cat !== 'all') q = q.eq('category', cat);
            if (sort === 'photo') q = q.neq('media_urls', '[]');
            if (sort === 'best') q = q.order('likes_count', { ascending: false }).order('rating', { ascending: false });
            const { data, error } = await q
              .order('created_at', { ascending: false })
              .range(from, from + RV_PAGE - 1);
            if (error) throw error;
            return rvEnrich(data || []);
          };
          const rows = (from === 0 && window.CacheDB) ? await window.CacheDB.get(rvCacheKey(cat, sort), run, 60000) : await run();
          await rvSyncReported(rows);
          return rows;
        }

        // На какие отзывы из ленты этот человек уже пожаловался (жалобы из мини-приложения и из чата — одна и та же запись)
        const rvReported = new Set();
        async function rvSyncReported(rows) {
          if (!userId || !Array.isArray(rows)) return;
          const ids = rows.map(r => r.id).filter(id => id && !rvIsDemoId(id));
          if (!ids.length) return;
          try {
            const { data, error } = await supabaseClient.rpc('review_my_reports', { p_reporter: userId, p_ids: ids });
            if (error || !Array.isArray(data)) return;
            ids.forEach(id => rvReported.delete(id));
            data.forEach(id => rvReported.add(typeof id === 'object' && id ? Object.values(id)[0] : id));
          } catch (e) {
            console.error('Failed to load user reports:', e);
          }
        }

        // Заказы из отзывов: номер ICE-… и товары. Сначала публичная функция review_orders_public (если она есть в базе),
        // иначе прямой запрос — RLS отдаст только свои и семейные заказы, остальные просто не покажутся
        const rvOrderMap = {};
        let rvOrdersRpcOff = false;
        async function rvFetchOrders(ids) {
          const need = ids.filter(id => id && !(id in rvOrderMap));
          if (!need.length) return;
          let rows = null;
          if (!rvOrdersRpcOff) {
            try {
              const { data, error } = await supabaseClient.rpc('review_orders_public', { p_order_ids: need });
              if (error) rvOrdersRpcOff = true; else rows = data || [];
            } catch (e) { rvOrdersRpcOff = true; }
          }
          if (!rows) {
            try {
              const { data } = await supabaseClient.from('orders')
                .select('id,public_number,items,source_url,title,title_translated').in('id', need);
              rows = data || [];
            } catch (e) { rows = []; }
          }
          rows.forEach(o => { if (o && o.id) rvOrderMap[o.id] = o; });
          need.forEach(id => { if (!(id in rvOrderMap)) rvOrderMap[id] = null; });
        }

        // Аватарки авторов: как в профиле Mini App (users.avatar_url). RLS чужие профили не отдаёт — спрашиваем публичную функцию; нет её/фото — остаётся буква
        const rvAvaMap = {};
        let rvAvaRpcOff = false;
        async function rvFetchAvatars(rows) {
          const need = rows.map(r => r.id).filter(id => id && !(id in rvAvaMap));
          if (need.length && !rvAvaRpcOff) {
            try {
              const { data, error } = await supabaseClient.rpc('review_avatars_public', { p_review_ids: need });
              if (error) { rvAvaRpcOff = true; }
              else {
              need.forEach(id => { rvAvaMap[id] = null; });
              (data || []).forEach(a => { if (a && a.review_id) rvAvaMap[a.review_id] = a.avatar_url || null; });
              }
            } catch (e) { rvAvaRpcOff = true; }
          }
          rows.forEach(r => { r.avatar_url = rvAvaMap[r.id] || null; });
        }

        async function rvEnrich(rows) {
          if (!rows || !rows.length) return rows || [];
          const orderIds = [];
          // Медиа отзывов из бота — {type, file_id, url}: бот копирует фото в хранилище и дописывает url; без url (файл только в Telegram) фото не показываем
          // Голосовые и кружки (voice / video_note) держим отдельным списком: url может не быть (файл только в Telegram) — тогда покажем плитку-заглушку
          rows.forEach(r => {
            const raw = Array.isArray(r.photo_urls) ? r.photo_urls : [];
            r.media = raw.filter(m => m && typeof m === 'object' && (m.type === 'voice' || m.type === 'video_note'))
              .map(m => ({ type: m.type, url: typeof m.url === 'string' && /^https:\/\//i.test(m.url) ? m.url : '', duration: Math.max(0, Math.round(Number(m.duration) || 0)) }));
            r.photo_urls = raw.map(u => (u && typeof u === 'object' ? (u.type === 'voice' || u.type === 'video_note' ? '' : u.url) : u)).filter(u => typeof u === 'string' && u);
          });
          rows.forEach(r => (Array.isArray(r.order_ids) ? r.order_ids : []).forEach(id => { if (!orderIds.includes(id)) orderIds.push(id); }));
          const solvedTask = Promise.resolve(supabaseClient.from('reviews')
            .select('id,user_name,rating,text,created_at,resolves_review_id')
            .eq('is_published', true).in('resolves_review_id', rows.map(r => r.id))
            .order('created_at', { ascending: true }))
            .then(({ data }) => {
              rows.forEach(r => { r.solved = []; });
              (data || []).forEach(c => { const p = rows.find(r => r.id === c.resolves_review_id); if (p) (p.solved = p.solved || []).push(c); });
            }, () => {});
          const avaTask = rvFetchAvatars(rows);
          await Promise.all([solvedTask, avaTask, orderIds.length ? rvFetchOrders(orderIds) : null]);
          rows.forEach(r => { r.orders = (Array.isArray(r.order_ids) ? r.order_ids : []).map(id => rvOrderMap[id]).filter(Boolean); });
          return rows;
        }

        // Товары заказов отзыва: картинка, название, ссылка для «Хочу так же»
        function rvOrderItems(r) {
          const out = [];
          const okUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '');
          ((r && r.orders) || []).forEach(o => {
            const list = Array.isArray(o.items) && o.items.length ? o.items : [{ url: o.source_url, title: o.title_translated || o.title }];
            list.forEach(it => {
              if (!it) return;
              out.push({
                url: okUrl(it.url) || (list.length === 1 ? okUrl(o.source_url) : ''),
                title: it.title || o.title_translated || o.title || 'Товар',
                img: okUrl(it.imageUrl || it.image_url || it.image),
                num: o.public_number || '',
                meta: [it.size, it.color].filter(Boolean).join(' · ')
              });
            });
          });
          return out;
        }

        // Отзыв по id: из ленты или отдельным запросом (для ссылок из группы)
        async function rvGetReview(id) {
          const known = (rvState.items || []).find(x => x.id === id);
          if (known && known.orders) return known;
          const { data } = await supabaseClient.from('reviews')
            .select('id,user_name,rating,order_ids').eq('id', id).maybeSingle();
          if (!data) return null;
          const list = await rvEnrich([data]);
          return list[0] || null;
        }

        // «Хочу так же» — «Расчёт по ссылке» с готовой ссылкой, расчёт стартует сам
        async function rvWantSame(reviewId, url) {
          if (!url && reviewId) {
            try {
              const r = await rvGetReview(reviewId);
              const it = rvOrderItems(r).find(x => x.url);
              url = it ? it.url : '';
            } catch (e) { url = ''; }
          }
          if (!url) { UI.toast('Товары этого отзыва пока недоступны'); return; }
          window._pendingCalcUrl = url;
          switchTab('calculator');
          if (typeof window.setCalcMode === 'function') window.setCalcMode('link');
        }

        function openReviewItems(reviewId) {
          if (!reviewId) return;
          window._rvItemsReviewId = reviewId;
          switchTab('reviewItems');
        }

        // Карточка «Вас ждёт отзыв» над лентой — только если в боте открыт запрос отзыва
        // Предложение Stories в приложении не показываем — его присылает только бот
        async function rvLoadAsk() {
          const box = document.getElementById('rvAsk');
          if (!box || !userId) return;
          let html = '';
          try {
            const { data, error } = await supabaseClient.from('review_requests')
              .select('id,status,order_ids').eq('user_id', userId).in('status', ['rating', 'writing'])
              .order('created_at', { ascending: false }).limit(1);
            if (!error && data && data.length) {
              const rq = data[0];
              const many = Array.isArray(rq.order_ids) && rq.order_ids.length > 1;
              const sub = rq.status === 'rating'
                ? (many ? 'Оцените заказы — это займёт минуту' : 'Оцените заказ — это займёт минуту')
                : 'Расскажите в боте, как всё прошло';
              html += `
              <button type="button" class="rv-ask" data-rv-ask>
                <span class="rv-ask-ic">${UI.icon('message', 24, { stroke: 2.2 })}</span>
                <span class="rv-ask-b"><b>Вас ждёт отзыв</b><small>${sub}</small></span>
                <span class="rv-ask-go">${UI.icon('chevR', 18, { stroke: 2.6 })}</span>
              </button>`;
            }
          } catch (e) { /* нет сети — карточку просто не показываем */ }
          box.innerHTML = html;
        }

        function rvOpenBot(start) {
          const u = 'https://t.me/icelogix_bot?start=' + start;
          const tgw = window.Telegram && window.Telegram.WebApp;
          if (tgw && typeof tgw.openTelegramLink === 'function') tgw.openTelegramLink(u);
          else openExternalLink(u);
        }
        function rvOpenBotReview() { rvOpenBot('review'); }

        // Лёгкая выборка оценок и категорий — для сводки рейтинга и счётчиков на чипах
        async function rvFetchStats() {
          const run = async () => {
            const { data, error } = await supabaseClient.from('reviews').select('category,rating').eq('is_published', true).range(0, 1999);
            if (error) throw error;
            return data || [];
          };
          return window.CacheDB ? window.CacheDB.get('reviews_stats', run, 300000) : run();
        }

        function rvStatsRows(cat) {
          return (rvState.stats || []).filter(r => cat === 'all' || r.category === cat);
        }

        function rvPlatformsHtml(config) {
          const sm = config.social_media_links || {};
          const maps = [
            ['yandex-maps', 'Яндекс Карты', reviewLink(config.yandex_maps_link, 'https://yandex.by/maps/'), 'Яндекс', 'yandex_maps_rating'],
            ['google-maps', 'Google Карты', reviewLink(config.google_maps_link, 'https://maps.google.com/'), 'Google', 'google_maps_rating'],
            ['2gis', '2ГИС', reviewLink(config.gis_2_link, 'https://2gis.by/'), '2ГИС', 'gis_2_rating']
          ];
          const socials = [
            ['telegram', 'Telegram', reviewLink(config.telegram_group_link, 'https://t.me/')],
            ['vk', 'ВКонтакте', reviewLink(sm.vk, 'https://vk.com/')],
            ['threads', 'Threads', reviewLink(sm.threads, 'https://www.threads.com/')],
            ['instagram', 'Instagram', reviewLink(sm.instagram, 'https://www.instagram.com/')],
            ['facebook', 'Facebook', reviewLink(sm.facebook, 'https://www.facebook.com/')]
          ];
          // Карты — три белые плитки на синем баннере (заголовок уже говорит «на картах», в плитке короткое имя), соцсети — круглые кнопки
          // Оценка площадки — только настоящая, из settings.reviews_config (yandex_maps_rating и т.д.); нет числа и заглушки — не показываем
          // Пока аккаунты на площадках не заведены — временные заглушки, настоящая оценка из настроек их перекроет
          const RATE_STUB = { yandex_maps_rating: 4.9, google_maps_rating: 4.8, gis_2_rating: 4.9 };
          const mapRate = (cfgKey) => {
            const v = Number(String(config[cfgKey] || RATE_STUB[cfgKey] || '').replace(',', '.'));
            return v >= 1 && v <= 5 ? `<span class="rv-map-rate">${v.toFixed(1).replace('.', ',')}<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z" fill="currentColor"/></svg></span>` : '';
          };
          const mapTile = ([key, name, url, short, rateKey], i) => `
            <button type="button" class="rv-map${mapRate(rateKey) ? ' has-rate' : ''}" style="--i:${i}" data-p="${key}" data-rv-url="${rvEsc(url)}" aria-label="${name}">
              <img class="rv-map-logo" src="/assets/reviews-platforms/${key}.webp?v=20261104_rv36" alt="" width="128" height="128" decoding="async">
              <span class="rv-map-foot"><span class="rv-map-name">${short}</span>${mapRate(rateKey)}</span>
              <span class="rv-map-go">${UI.icon('arrowR', 14, { stroke: 2.2 })}</span>
            </button>`;
          const socTile = ([key, name, url], i) => `
            <button type="button" class="rv-soc-btn" style="--i:${i + 3}" data-rv-url="${rvEsc(url)}" aria-label="${name}">
              <img src="/assets/reviews-platforms/${key}.webp?v=20261103_lg" alt="" width="32" height="32" decoding="async">
            </button>`;
          // Объёмная метка карты со звездой — декор баннера
          const art = `
            <svg class="rv-hub-art" viewBox="0 0 96 96" aria-hidden="true">
              <defs>
                <linearGradient id="rvArtPin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:#fff"/><stop offset=".55" style="stop-color:var(--rd-b300)"/><stop offset="1" style="stop-color:var(--rd-b400)"/></linearGradient>
                <linearGradient id="rvArtCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--rd-blue-hi)"/><stop offset="1" style="stop-color:var(--rd-blue)"/></linearGradient>
              </defs>
              <ellipse cx="50" cy="88" rx="18" ry="4" fill="#000" opacity=".22"/>
              <path d="M48 8c-16.6 0-30 12.9-30 29 0 20.4 30 48 30 48s30-27.6 30-48C78 20.9 64.6 8 48 8z" fill="url(#rvArtPin)"/>
              <circle cx="48" cy="37" r="16" fill="url(#rvArtCore)"/>
              <path d="m48 27.6 3 6.1 6.7.9-4.9 4.7 1.2 6.6-6-3.2-6 3.2 1.2-6.6-4.9-4.7 6.7-.9z" fill="#fff"/>
              <ellipse cx="36" cy="20" rx="8" ry="4.2" fill="#fff" opacity=".7" transform="rotate(-32 36 20)"/>
              <path d="M84 12l1.6 4.4L90 18l-4.4 1.6L84 24l-1.6-4.4L78 18l4.4-1.6z" fill="#fff" opacity=".85"/>
              <path d="M12 58l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" fill="#fff" opacity=".6"/>
            </svg>`;
          return `${art}
            <div class="rv-hub-head">
              <div class="rv-hub-title">Отзывы на картах</div>
              <div class="rv-hub-sub">Удалить отзыв не можем даже мы</div>
            </div>
            <div class="rv-maps">${maps.map(mapTile).join('')}</div>
            <div class="rv-soc"><span class="rv-soc-label">Отзывы в<br>наших<br>соцсетях</span><div class="rv-soc-row">${socials.map(socTile).join('')}</div></div>`;
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

        function rvAvaUrl(u) { return typeof u === 'string' && /^https:\/\//i.test(u) ? u : ''; }

        // Цвет аватарки зависит от имени: у каждого клиента свой градиент
        function rvAvatarStyle(name) {
          let h = 0;
          for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
          return `background:linear-gradient(135deg,hsl(${h} 88% 62%),hsl(${(h + 35) % 360} 82% 40%))`;
        }

        // Фото-мозаика: одно — крупное, два — пополам, три и больше — большое слева и два справа
        function rvPhotosHtml(photos) {
          if (!photos.length) return '';
          const cells = photos.slice(0, 3).map((u, i) =>
            `<button type="button" class="rv-ph" data-rv-ph="${i}" aria-label="Фото ${i + 1} из ${photos.length}"><img src="${rvEsc(u)}" alt="" loading="lazy" decoding="async">${i === 2 && photos.length > 3 ? `<span class="rv-ph-more">+${photos.length - 3}</span>` : ''}</button>`).join('');
          return `<div class="rv-photos n${Math.min(photos.length, 3)}">${cells}</div>`;
        }

        function rvReplyHtml(r) {
          const rp = r.reply;
          if (!rp || !rp.text) return '';
          return `
            <div class="rv-reply">
              <div class="rv-reply-h"><span class="rv-reply-ic">${UI.icon('shield', 13, { stroke: 2.4 })}</span><b>${rvEsc(rp.who || 'Команда ICE LOGIX')}</b></div>
              <p>${rvEsc(rp.text)}</p>
            </div>`;
        }

        function rvOrdersHtml(r) {
          const nums = (r.orders || []).map(o => o.public_number || (o.id ? String(o.id).slice(0, 8).toUpperCase() : '')).filter(Boolean);
          if (!nums.length) return '';
          return `<div class="rv-orders">${UI.icon('box', 15, { stroke: 2.2 })}<span>${nums.length > 1 ? 'Заказы' : 'Заказ'}: <b>${nums.map(rvEsc).join(', ')}</b></span></div>`;
        }

        function rvSolvedHtml(c) {
          const rating = Math.max(0, Math.min(5, Number(c.rating) || 0));
          return `
            <div class="rv-solved">
              <div class="rv-solved-h">
                <span class="rv-solved-badge">${UI.icon('checkCircle', 13, { stroke: 2.4 })}Решено</span>
                <span class="rv-solved-meta">${rvEsc(c.user_name || 'Клиент')} · ${rvFmtDate(c.created_at)}</span>
              </div>
              ${rating ? `<div class="rv-solved-stars" aria-label="Оценка ${rating} из 5">${[1, 2, 3, 4, 5].map(k => UI.icon('star', 14, { fill: k <= rating })).join('')}</div>` : ''}
              ${c.text ? `<p class="rv-solved-t">${rvEsc(c.text)}</p>` : ''}
            </div>`;
        }

        // Ответ менеджера под отзывом и новые отзывы клиента с плашкой «Решено»
        function rvManagerReplyHtml(r) {
          const solved = Array.isArray(r.solved) ? r.solved : [];
          if (!r.manager_reply && !solved.length) return '';
          return `
            <div class="rv-reply rv-mreply">
              ${r.manager_reply ? `<div class="rv-reply-h"><span class="rv-reply-ic">${UI.icon('shield', 13, { stroke: 2.4 })}</span><b>Ответ ICE LOGIX</b></div><p class="rv-mreply-t">${rvEsc(r.manager_reply)}</p>` : ''}
              ${solved.map(rvSolvedHtml).join('')}
            </div>`;
        }

        // Нижний блок карточки: «Хочу так же» и «Товар/Товары из отзыва» на одном уровне (только если у отзыва есть заказ)
        function rvBottomHtml(r) {
          if (!Array.isArray(r.order_ids) || !r.order_ids.length) return '';
          const cnt = rvOrderItems(r).length || r.order_ids.length;
          return `
            <div class="rv-acts">
              <button type="button" class="rv-act rv-act-main" data-rv-want>${UI.icon('sparkles', 17, { stroke: 2.2 })}<span>Хочу так же</span></button>
              <button type="button" class="rv-act" data-rv-items>${UI.icon('bag', 17, { stroke: 2.2 })}<span>${cnt > 1 ? 'Товары из отзыва' : 'Товар из отзыва'}</span></button>
            </div>`;
        }

        // Сердечко с счётчиком внизу карточки: зона касания 44x44, один тап ставит и снимает лайк
        function rvLikeHtml(r, liked) {
          const mine = !!userId && r.user_id != null && String(r.user_id) === String(userId);
          const sent = rvReported.has(r.id);
          // автору (и демо-карточке) жаловаться не на что — надпись и флажок не показываем
          const right = rvIsDemoId(r.id) || mine ? '' : `<span class="rv-foot-r"><span class="rv-foot-t">Хотите пожаловаться?</span><button type="button" class="rv-flag${sent ? ' sent' : ''}" data-rv-report aria-pressed="${sent ? 'true' : 'false'}" aria-label="${sent ? 'Отозвать жалобу' : 'Пожаловаться на отзыв'}" title="${sent ? 'Отозвать жалобу' : 'Пожаловаться'}">${RV_FLAG}</button></span>`;
          return `<div class="rv-foot"><div class="rv-likebox"><button type="button" class="rv-like ${liked ? 'on' : ''}" data-rv-like aria-pressed="${liked ? 'true' : 'false'}" aria-label="Полезный отзыв">${rvHeart(liked)}</button><span class="rv-like-n">${r.likes_count || 0}</span></div>${right}</div>`;
        }

        function rvIsDemoId(id) { return typeof id === 'string' && id.indexOf('demo-') === 0; }
        const rvDemoLiked = new Set();
        function rvIsLiked(r) {
          if (rvIsDemoId(r.id)) return rvDemoLiked.has(r.id);
          return !!(window.likedReviewsCache && window.likedReviewsCache.has(r.id));
        }

        function rvFmtDur(s) {
          s = Math.max(0, Math.round(Number(s) || 0));
          return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        }

        // Голосовое: кнопка, «волна» с прогрессом и время. Нет ссылки на файл — аккуратная плитка без кнопки
        function rvVoiceHtml(m, seed, demo) {
          const bars = 30;
          let h = 7;
          for (const c of String(seed)) h = (h * 33 + c.charCodeAt(0)) % 9973;
          const wave = Array.from({ length: bars }).map((_, k) => {
            h = (h * 31 + 17 + k) % 9973;
            return `<i style="--h:${22 + (h % 70)}%"></i>`;
          }).join('');
          const can = !!(m.url || demo);
          return `
            <div class="rv-voice${can ? '' : ' off'}" data-rv-voice data-dur="${m.duration || 0}" data-src="${rvEsc(m.url || '')}"${demo ? ' data-demo="1"' : ''}>
              ${can ? `<button type="button" class="rv-vplay" data-rv-play aria-label="Воспроизвести голосовое">${RV_PLAY}</button>` : `<span class="rv-vplay rv-vmic">${RV_MIC}</span>`}
              <div class="rv-vbody"><div class="rv-wave" aria-hidden="true">${wave}</div>${can ? '' : '<span class="rv-vnote-s">Голосовое сообщение в Telegram</span>'}</div>
              <span class="rv-vtime" data-rv-time>${m.duration ? rvFmtDur(m.duration) : ''}</span>
            </div>`;
        }

        // Кружок: круглое видео ~160px, тап запускает со звуком; кольцо вокруг — прогресс
        function rvVnoteHtml(m, seed, demo) {
          const can = !!(m.url || demo);
          let h = 0;
          for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) % 360;
          const inner = m.url
            ? `<video muted loop playsinline webkit-playsinline preload="metadata" src="${rvEsc(m.url)}#t=0.1"></video>`
            : `<span class="rv-vn-bg" style="background:linear-gradient(135deg,hsl(${h} 85% 60%),hsl(${(h + 40) % 360} 80% 38%))"></span>`;
          return `
            <div class="rv-vnote${can ? '' : ' off'}" data-rv-vnote data-dur="${m.duration || 0}" data-src="${rvEsc(m.url || '')}"${demo ? ' data-demo="1"' : ''}${m.url && !demo ? ' data-rv-auto' : ''}>
              <div class="rv-vn-disc">${inner}</div>
              ${m.url && !demo ? `<span class="rv-vn-snd" aria-hidden="true">${RV_MUTE}</span>` : ''}
              <svg class="rv-vn-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" class="rv-vn-track"/><circle cx="50" cy="50" r="48" pathLength="100" class="rv-vn-arc"/></svg>
              ${can ? `<button type="button" class="rv-vn-btn" data-rv-play aria-label="Воспроизвести кружок">${RV_PLAY}</button>` : `<span class="rv-vn-btn rv-vn-off">${RV_CAM}</span>`}
              ${m.duration ? `<span class="rv-vn-time" data-rv-time>${rvFmtDur(m.duration)}</span>` : ''}
              ${can ? '' : '<span class="rv-vn-cap">Кружок в Telegram</span>'}
            </div>`;
        }

        function rvMediaHtml(r) {
          const list = Array.isArray(r.media) ? r.media : [];
          if (!list.length) return '';
          const demo = rvIsDemoId(r.id);
          return `<div class="rv-media">${list.map((m, k) => m.type === 'voice' ? rvVoiceHtml(m, r.id + k, demo) : rvVnoteHtml(m, r.id + k, demo)).join('')}</div>`;
        }

        function rvCardHtml(r, i) {
          const photos = Array.isArray(r.photo_urls) ? r.photo_urls.filter(Boolean) : [];
          const liked = rvIsLiked(r);
          const rating = Math.max(0, Math.min(5, Number(r.rating) || 0));
          const name = r.user_name || 'Клиент';
          return `
            <article class="rv-card" data-review-id="${r.id}" style="--i:${Math.min(i || 0, 8)}">
              <div class="rv-top">
                <div class="rv-ava" style="${rvAvatarStyle(name)}">${rvEsc(name.charAt(0).toUpperCase())}${rvAvaUrl(r.avatar_url) ? `<img src="${rvEsc(rvAvaUrl(r.avatar_url))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>
                <div class="rv-who">
                  <div class="rv-name">${rvEsc(name)}</div>
                  <div class="rv-meta">${rvEsc(RV_CAT_LABEL[r.category] || 'Отзыв')} · ${rvFmtDate(r.created_at)}</div>
                </div>
              </div>
              <div class="rv-rate">
                <div class="rv-stars" aria-label="Оценка ${rating} из 5">${[1, 2, 3, 4, 5].map(k => UI.icon('star', 17, { fill: k <= rating })).join('')}</div>
                ${r.is_verified ? `<span class="rv-ok">${UI.icon('checkCircle', 13, { stroke: 2.4 })}Заказ подтверждён</span>` : ''}
                ${rvIsDemoId(r.id) ? '<span class="rv-demo" title="Пример для администратора, клиенты его не видят">Демо</span>' : ''}
              </div>
              <p class="rv-text">${rvEsc(r.text)}</p>
              ${rvPhotosHtml(photos)}
              ${rvMediaHtml(r)}
              ${rvDetailsHtml(r)}
              ${rvOrdersHtml(r)}
              ${rvReplyHtml(r)}
              ${rvManagerReplyHtml(r)}
              ${rvBottomHtml(r)}
              ${rvLikeHtml(r, liked)}
            </article>`;
        }

        // ---- Демо-отзывы: только во фронтенде и только для администратора. В базу не пишутся, лайки локальные ----
        function rvIsAdmin() { return typeof isOwner !== 'undefined' && !!isOwner; }
        function rvDemoPhoto(h1, h2) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},85%,62%)"/><stop offset="1" stop-color="hsl(${h2},80%,36%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="300" cy="80" r="70" fill="#fff" opacity=".16"/><circle cx="90" cy="250" r="90" fill="#fff" opacity=".1"/></svg>`;
          return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }
        // n — имя, r — оценка, t — текст, l — лайки, d — дней назад, p — фото (пары оттенков), v — голосовое (секунды), c — кружок (секунды)
        const RV_DEMO_RAW = {
          promotions: [
            { n: 'Анна К.', r: 5, t: 'Участвовала в акции, всё прошло чётко: условия объяснили заранее, заказ собрали без задержек. Осталась очень довольна.', l: 7, d: 1, p: [[215, 250]], v: 24 },
            { n: 'Дмитрий С.', r: 5, t: 'Понравилось, что в акции всё прозрачно, без скрытых условий. Менеджер отвечал быстро и по делу.', l: 4, d: 3 },
            { n: 'Марина П.', r: 4, t: 'Хорошая акция, подарок пришёл вместе с заказом. Единственное, хотелось бы больше вариантов на выбор.', l: 2, d: 6, p: [[330, 20], [170, 210]] }
          ],
          dropshipping: [
            { n: 'Сергей Л.', r: 5, t: 'Работаю по дропшиппингу уже несколько месяцев. Посылки уходят вовремя, трек выдают сразу, клиенты не жалуются.', l: 9, d: 1, c: 31 },
            { n: 'Екатерина В.', r: 5, t: 'Удобно, что не надо думать о складе и упаковке. Всё берут на себя, а мне остаётся общаться с покупателями.', l: 5, d: 2, p: [[200, 240]] },
            { n: 'Игорь Т.', r: 4, t: 'Хороший сервис для старта. Сначала разбирался с условиями, поддержка помогла и подсказала.', l: 3, d: 5 },
            { n: 'Алёна Ж.', r: 5, t: 'Запустила маленький магазин, заказы сопровождают на каждом шаге. Рекомендую всем, кто начинает.', l: 6, d: 8, v: 38 }
          ],
          referral: [
            { n: 'Павел Н.', r: 5, t: 'Позвал друзей по своей ссылке, бонусы пришли без лишних вопросов. Система простая и понятная.', l: 6, d: 1, v: 19 },
            { n: 'Ольга М.', r: 5, t: 'Реферальная программа порадовала: видно, кто зарегистрировался, и бонусы начисляются сразу.', l: 4, d: 4, p: [[280, 330]] },
            { n: 'Артём Б.', r: 4, t: 'Удобно делиться ссылкой в мессенджере. Хотелось бы побольше подсказок, как приглашать, но в целом отлично.', l: 2, d: 7 }
          ],
          advertising: [
            { n: 'Ирина Ф.', r: 5, t: 'Заказывала рекламу у ICE LOGIX: внятно объяснили, где и как она будет показываться. Отклик пришёл уже в первые дни.', l: 8, d: 2, c: 27 },
            { n: 'Максим Д.', r: 5, t: 'Всё по делу, без воды. Макеты согласовали быстро, отчёт после запуска прислали вовремя.', l: 3, d: 3, p: [[20, 350], [190, 230]] },
            { n: 'Юлия Р.', r: 4, t: 'Хорошая команда, быстро отвечают. Небольшие правки в тексте внесли в тот же день.', l: 2, d: 9 }
          ],
          legitcheck: [
            { n: 'Владислав К.', r: 5, t: 'Отправил кроссовки на проверку оригинальности. Получил подробный отчёт с фото деталей, всё понятно и убедительно.', l: 11, d: 1, p: [[140, 190], [215, 265]], v: 21 },
            { n: 'Наталья Г.', r: 5, t: 'Сомневалась, оригинал ли сумка. Эксперты разобрали каждую деталь и объяснили, на что смотрели. Теперь спокойна.', l: 7, d: 3, c: 34 },
            { n: 'Роман Е.', r: 4, t: 'Проверка прошла чётко, результат пришёл в срок. Спасибо за честное заключение.', l: 3, d: 6 },
            { n: 'Диана С.', r: 5, t: 'Очень помогла проверка перед покупкой на площадке. Рада, что не потратила деньги зря.', l: 5, d: 10, p: [[300, 350]] }
          ],
          partnership: [
            { n: 'Андрей Ш.', r: 5, t: 'Договорились о сотрудничестве быстро, условия понятные с первого разговора. Работать вместе комфортно.', l: 5, d: 2, v: 29 },
            { n: 'Елена Ч.', r: 5, t: 'Партнёрство оказалось взаимно полезным: общая аудитория, чёткие договорённости и живая обратная связь.', l: 4, d: 5, c: 25 },
            { n: 'Николай А.', r: 4, t: 'Хорошие люди, держат слово. Все этапы согласовывали заранее, сюрпризов не было.', l: 2, d: 11, p: [[180, 220]] }
          ]
        };

        // Демо для ленты: категория «Заказы» без демо, в «Все» — по одному из каждого раздела
        function rvDemoRows(cat, sort) {
          if (!rvIsAdmin() || cat === 'orders') return [];
          const cats = cat === 'all' ? Object.keys(RV_DEMO_RAW) : (RV_DEMO_RAW[cat] ? [cat] : []);
          const now = Date.now();
          let rows = [];
          cats.forEach(c => {
            const list = cat === 'all' ? RV_DEMO_RAW[c].slice(0, 1) : RV_DEMO_RAW[c];
            list.forEach((d, k) => {
              const media = [];
              if (d.v) media.push({ type: 'voice', url: '', duration: d.v });
              if (d.c) media.push({ type: 'video_note', url: '', duration: d.c });
              rows.push({
                id: `demo-${c}-${k}`, user_name: d.n, category: c, rating: d.r, text: d.t,
                photo_urls: (d.p || []).map(([a, b]) => rvDemoPhoto(a, b)), media,
                is_verified: false, likes_count: d.l, created_at: new Date(now - d.d * 86400000).toISOString(),
                order_ids: null, avatar_url: null
              });
            });
          });
          if (sort === 'photo') rows = rows.filter(r => r.photo_urls.length || r.media.length);
          if (sort === 'best') rows.sort((a, b) => (b.likes_count - a.likes_count) || (b.rating - a.rating));
          else rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
          return rows;
        }

        // Первая страница ленты с демо впереди (для администратора); demoN нужен, чтобы подгрузка не сбивалась
        function rvWithDemo(rows, cat, sort) {
          const demo = rvDemoRows(cat, sort);
          rvState.demoN = demo.length;
          return demo.concat(rows || []);
        }

        function rvSkeleton(n) {
          return Array.from({ length: n }).map(() => '<div class="rv-card rv-skel"><div class="rd-shimmer rv-sk-a"></div><div class="rd-shimmer rv-sk-b"></div><div class="rd-shimmer rv-sk-c"></div></div>').join('');
        }

        function rvEmptyHtml() {
          if (rvState.sort === 'photo') return UI.empty({ icon: 'image', title: 'Пока нет отзывов с медиа', text: 'Фотоотзывы появятся здесь, как только клиенты их добавят.' });
          return UI.empty({ icon: 'message', title: 'Пока нет отзывов', text: 'Отзывы появляются после получения заказа. Скоро здесь будут первые.' });
        }

        function rvListHtml(items) {
          return items.length ? items.map(rvCardHtml).join('') : rvEmptyHtml();
        }

        const RV_STAR = 22;
        // Сводка: крупный средний балл и полоски 5–1 звёзд 
        function rvSummaryHtml(cat) {
          const rows = rvStatsRows(cat).filter(r => Number(r.rating) >= 1);
          if (!rows.length) return '';
          const total = rows.length;
          const avg = rows.reduce((s, r) => s + Math.min(5, Math.round(Number(r.rating))), 0) / total;
          const full = Math.floor(avg), part = avg - full;
          const fillW = Math.min(RV_STAR * 5 + 4, full * (RV_STAR + 1) + part * RV_STAR);
          const stars = [1, 2, 3, 4, 5].map(() => `<svg viewBox="0 0 24 24" width="${RV_STAR}" height="${RV_STAR}" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z" fill="currentColor"/></svg>`).join('');
          return `
            <section class="rv-sum" aria-label="Средняя оценка">
              <div class="rv-sum-num">${avg.toFixed(1).replace('.', ',')}</div>
              <div class="rv-sum-mid">
                <div class="rv-sum-stars"><div class="rv-sum-st-bg">${stars}</div><div class="rv-sum-st-fg" style="width:${fillW.toFixed(1)}px">${stars}</div></div>
              </div>
            </section>`;
        }

        const RV_3D = (() => {
          const g = (id, a, b) => `<linearGradient id="rv3-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
                    const gl = (x, y, rx, ry, r) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${r} ${x} ${y})"/>`;
          const cube = (top, left, right) => `<polygon points="32,8 55,21 32,34 9,21" fill="${top}"/><polygon points="9,21 32,34 32,58 9,45" fill="${left}"/><polygon points="32,34 55,21 55,45 32,58" fill="${right}"/>`;
          const wrap = (inner) => `<svg class="rv-3d" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
          return {
            all: wrap(`<defs>${g('a1', '#d6ebff', '#4f8dff')}${g('a2', '#ffe27a', '#ffa91f')}</defs><rect x="6" y="6" width="23" height="23" rx="7" fill="url(#rv3-a1)"/><rect x="35" y="6" width="23" height="23" rx="7" fill="url(#rv3-a1)"/><rect x="6" y="35" width="23" height="23" rx="7" fill="url(#rv3-a1)"/><rect x="35" y="35" width="23" height="23" rx="7" fill="url(#rv3-a2)"/><path d="M46.5 39.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#fff"/><ellipse cx="14" cy="12.5" rx="5" ry="2" fill="#fff" opacity=".6" transform="rotate(-20 14 12.5)"/>`),
            orders: wrap(`${cube('#ffd793', '#ffa043', '#e3711a')}<polygon points="18.2,14.5 23.8,17.5 45.8,29.5 40.2,26.5" fill="#fff6dc" opacity=".92"/><polygon points="32,34 40.2,29.5 40.2,53.5 32,58" fill="#fff6dc" opacity=".16"/><rect x="13" y="34" width="9" height="7" rx="1.5" fill="#fff" opacity=".85" transform="skewY(30) translate(0 -7.5)"/>${gl(24, 19, 5, 2.2, -28)}`),
            promotions: wrap(`<defs>${g('q1', '#c7a8ff', '#6a35e0')}${g('q2', '#e0ccff', '#8f5af2')}${g('q3', '#ffe27a', '#ffa91f')}</defs><rect x="14" y="30" width="36" height="26" rx="4" fill="url(#rv3-q1)"/><rect x="10" y="22" width="44" height="11" rx="4" fill="url(#rv3-q2)"/><rect x="28.5" y="22" width="7" height="34" fill="url(#rv3-q3)"/><ellipse cx="23" cy="16" rx="8" ry="5.2" fill="none" stroke="#ffbe3a" stroke-width="3.4" transform="rotate(-24 23 16)"/><ellipse cx="41" cy="16" rx="8" ry="5.2" fill="none" stroke="#ffbe3a" stroke-width="3.4" transform="rotate(24 41 16)"/><circle cx="32" cy="19.5" r="4" fill="url(#rv3-q3)"/><rect x="16" y="34" width="6" height="14" rx="3" fill="#fff" opacity=".28"/>`),
            dropshipping: wrap(`<defs>${g('d1', '#ffe98a', '#f2a30f')}${g('d2', '#7df0b8', '#12a56e')}</defs><rect x="6" y="14" width="46" height="26" rx="4" fill="url(#rv3-d2)" transform="rotate(-9 29 27)"/><rect x="10" y="18" width="38" height="18" rx="2.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4" transform="rotate(-9 29 27)"/><circle cx="29" cy="26" r="5.2" fill="#fff" opacity=".85" transform="rotate(-9 29 27)"/><ellipse cx="41" cy="50" rx="15" ry="5.6" fill="#b86e00"/><rect x="26" y="40" width="30" height="10" fill="#d98a06"/><ellipse cx="41" cy="40" rx="15" ry="5.6" fill="url(#rv3-d1)"/><ellipse cx="41" cy="40" rx="9.5" ry="3.3" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.3"/><ellipse cx="22" cy="53" rx="12" ry="4.6" fill="#b86e00"/><rect x="10" y="46" width="24" height="7" fill="#d98a06"/><ellipse cx="22" cy="46" rx="12" ry="4.6" fill="url(#rv3-d1)"/><ellipse cx="22" cy="46" rx="7.2" ry="2.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>`),
            referral: wrap(`<defs>${g('r1', '#c7a8ff', '#6a35e0')}${g('r2', '#e0ccff', '#8f5af2')}${g('r3', '#ffe27a', '#ffa91f')}</defs><circle cx="41" cy="19" r="7.5" fill="url(#rv3-r2)"/><path d="M29 44c0-8.5 5-13.5 12-13.5s12 5 12 13.5v3H29z" fill="url(#rv3-r2)"/><circle cx="23" cy="23" r="9" fill="url(#rv3-r1)"/><path d="M6 52c0-10 6-16 17-16s17 6 17 16v4H6z" fill="url(#rv3-r1)"/><circle cx="49" cy="47" r="10" fill="url(#rv3-r3)"/><path d="M49 41v12M43 47h12" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="18" cy="17" rx="4" ry="2" fill="#fff" opacity=".5" transform="rotate(-30 18 17)"/>`),
            advertising: wrap(`<defs>${g('a1', '#ffab7e', '#ee3f24')}</defs><path d="M17 38l3 14a3 3 0 0 0 6 -1l-1.6 -12z" fill="#a82712"/><rect x="6" y="25" width="10" height="15" rx="3" fill="#c52f19"/><path d="M14 25L41 11V53L14 40Z" fill="url(#rv3-a1)"/><ellipse cx="42" cy="32" rx="6" ry="21" fill="#ffe3d4"/><ellipse cx="42" cy="32" rx="3.4" ry="15" fill="#ff8a63" opacity=".55"/><path d="M52 21q6 11 0 22" stroke="#ffb597" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M58 15q10 17 0 34" stroke="#ffb597" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/><path d="M18 30L36 21" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`),
            legitcheck: wrap(`<defs>${g('l1', '#8bf59a', '#1fae45')}</defs><path d="M32 5L54 13V30C54 44 44 53 32 58C20 53 10 44 10 30V13Z" fill="url(#rv3-l1)"/><path d="M32 5L54 13V30C54 44 44 53 32 58Z" fill="#0a7a2c" opacity=".3"/><path d="M21 32L29 40L44 24" stroke="#0a6b27" stroke-opacity=".5" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 2)"/><path d="M21 32L29 40L44 24" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="22" cy="15" rx="9" ry="3.4" fill="#fff" opacity=".5" transform="rotate(-18 22 15)"/>`),
            partnership: wrap(`<defs>${g('b1', '#a3adff', '#3a3fd8')}${g('b3', '#ffe27a', '#ffa91f')}</defs><path d="M24 24V17a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v7" stroke="#2f34b8" stroke-width="4.2" fill="none"/><rect x="7" y="22" width="50" height="34" rx="6" fill="url(#rv3-b1)"/><rect x="7" y="35" width="50" height="4" fill="#2328a0" opacity=".45"/><rect x="27.5" y="31" width="9" height="12" rx="2.4" fill="url(#rv3-b3)"/><rect x="11" y="26" width="42" height="3.2" rx="1.6" fill="#fff" opacity=".4"/>`)
          };
        })();

        function rvChipsHtml() {
          return RV_CATS.map(([id, label], k) => {
            const n = rvStatsRows(id).length;
            return `<button type="button" class="rv-cat c-${id} ${rvState.cat === id ? 'on' : ''}" data-rv-cat="${id}" style="--i:${k}" aria-pressed="${rvState.cat === id}">
              ${n ? `<b class="rv-cat-n">${n > 99 ? '99+' : n}</b>` : ''}<span class="rv-cat-ic">${RV_3D[id] || RV_3D.all}</span>
              <span class="rv-cat-t">${label}</span></button>`;
          }).join('');
        }

        function rvSortHtml() {
          return RV_SORTS.map(([id, label]) => `<button type="button" class="rv-sort-b ${rvState.sort === id ? 'on' : ''}" data-rv-sort="${id}">${label}</button>`).join('');
        }

        // Первая страница ленты из базы
        async function rvLoadFeed(cat, sort) {
          const rows = await rvFetchPage(cat, sort, 0);
          return { rows, done: rows.length < RV_PAGE };
        }

        async function renderReviews() {
          try {
            const cat = window.currentReviewsCategory || 'all';
            rvState.cat = cat;
            rvState.sort = 'new';
            rvState.failed = false;
            rvState.token++;
            const config = await loadReviewsConfig();
            const [, stats, feed] = await Promise.all([
              loadUserLikes(),
              rvFetchStats().catch(e => { console.error('Reviews stats error:', e); return null; }),
              rvFetchPage(cat, 'new', 0).then(rows => ({ rows })).catch(e => { console.error('Reviews feed error:', e); return null; })
            ]);

            if (userId) setTimeout(() => checkAndCreateDropshipperAction(), 0);

            rvState.stats = stats;
            let rows = feed ? feed.rows : null;
            rvState.done = !rows || rows.length < RV_PAGE;
            rvState.items = rvWithDemo(rows, cat, 'new');
            rows = rows === null && !rvState.demoN ? null : rvState.items;
            rvState.loading = false;

            return `
              <div class="rd-screen page-enter rv" id="rvRoot">
                <div class="rd-head">
                  <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${UI.icon('chevL', 22)}</button>
                  <div class="rd-head-txt"><h1 class="rd-head-title">Отзывы</h1><p class="rd-head-sub">Что говорят о нас клиенты</p></div>
                </div>

                <div class="rd-card rv-hub">${rvPlatformsHtml(config)}</div>
                <div id="rvAsk"></div>

                <div class="rv-cats" id="rvChips" role="group" aria-label="Разделы">${rvChipsHtml()}</div>
                <div class="rv-bar">
                  <div id="rvSum">${rvSummaryHtml(cat)}</div>
                  <div class="rv-sort" id="rvSort" role="group" aria-label="Сортировка">${rvSortHtml()}</div>
                </div>

                <div class="rv-list" id="rvList">${rows === null ? UI.empty({ icon: 'alert', title: 'Не удалось загрузить', text: 'Проверьте интернет и откройте раздел ещё раз.' }) : rvListHtml(rvState.items)}</div>
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
            const rows = await rvFetchPage(rvState.cat, rvState.sort, Math.max(0, rvState.items.length - (rvState.demoN || 0)));
            if (token !== rvState.token) { sk.remove(); return; }
            const known = new Set(rvState.items.map(r => r.id));
            const fresh = rows.filter(r => !known.has(r.id));
            rvState.items = rvState.items.concat(fresh);
            if (rows.length < RV_PAGE || !fresh.length) rvState.done = true;
            sk.remove();
            list.insertAdjacentHTML('beforeend', fresh.map(rvCardHtml).join(''));
            rvVnScan();
          } catch (e) {
            console.error('Reviews load more failed:', e);
            sk.remove();
          } finally {
            if (token === rvState.token) rvState.loading = false;
          }
        }

        // Перезагрузка ленты при смене категории или сортировки: сводка и чипы обновляются сразу
        async function rvReload() {
          const token = ++rvState.token;
          rvStopMedia();
          rvVnReset();
          rvState.items = [];
          rvState.demoN = 0;
          rvState.done = false;
          rvState.failed = false;
          rvState.loading = true;
          const list = document.getElementById('rvList');
          if (!list) return;
          document.querySelectorAll('#rvChips .rv-cat').forEach(c => { const on = c.dataset.rvCat === rvState.cat; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
          document.querySelectorAll('#rvSort .rv-sort-b').forEach(b => b.classList.toggle('on', b.dataset.rvSort === rvState.sort));
          const sum = document.getElementById('rvSum');
          if (sum) sum.innerHTML = rvSummaryHtml(rvState.cat);
          list.innerHTML = rvSkeleton(3);
          try {
            const { rows, done } = await rvLoadFeed(rvState.cat, rvState.sort);
            if (token !== rvState.token) return;
            rvState.items = rvWithDemo(rows, rvState.cat, rvState.sort);
            rvState.done = done;
            list.innerHTML = rvListHtml(rvState.items);
            rvVnScan();
          } catch (e) {
            console.error('Reviews reload failed:', e);
            if (token === rvState.token) { rvState.failed = true; list.innerHTML = UI.empty({ icon: 'alert', title: 'Не удалось загрузить', text: 'Попробуйте ещё раз.' }); }
          } finally {
            if (token === rvState.token) rvState.loading = false;
          }
        }

        function rvSwitchCategory(cat) {
          if (cat === rvState.cat && !rvState.failed) return;
          window.currentReviewsCategory = cat;
          rvState.cat = cat;
          return rvReload();
        }

        function rvSwitchSort(sort) {
          if (sort === rvState.sort && !rvState.failed) return;
          rvState.sort = sort;
          return rvReload();
        }

        // Просмотр фото на весь экран: свайп влево-вправо, счётчик, закрытие жестом вниз, крестиком или Esc
        function rvOpenLightbox(urls, start) {
          if (window.__rvLbClose) window.__rvLbClose();
          const el = document.createElement('div');
          el.id = 'rvLb';
          el.className = 'rv-lb';
          el.setAttribute('role', 'dialog');
          el.setAttribute('aria-label', 'Фото отзыва');
          el.innerHTML = `
            <div class="rv-lb-bar"><span class="rv-lb-n"></span><button type="button" class="rv-lb-x" aria-label="Закрыть">${UI.icon('x', 22)}</button></div>
            <div class="rv-lb-track">${urls.map(u => `<div class="rv-lb-slide"><img src="${rvEsc(u)}" alt="" draggable="false"></div>`).join('')}</div>`;
          document.body.appendChild(el);
          const track = el.querySelector('.rv-lb-track');
          const counter = el.querySelector('.rv-lb-n');
          const upd = () => { counter.textContent = (Math.round(track.scrollLeft / (track.clientWidth || 1)) + 1) + ' / ' + urls.length; };
          const onKey = (e) => { if (e.key === 'Escape') close(); };
          function close() {
            document.removeEventListener('keydown', onKey);
            if (window.__rvLbClose === close) window.__rvLbClose = null;
            el.classList.add('out');
            setTimeout(() => el.remove(), 200);
          }
          window.__rvLbClose = close;
          document.addEventListener('keydown', onKey);
          el.querySelector('.rv-lb-x').addEventListener('click', close);
          el.addEventListener('click', (e) => { if (e.target === el || e.target.classList.contains('rv-lb-slide')) close(); });
          requestAnimationFrame(() => { track.scrollLeft = (start || 0) * track.clientWidth; upd(); });
          upd();
          track.addEventListener('scroll', upd, { passive: true });
          let x0 = 0, y0 = 0, mode = null, dy = 0;
          track.addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; mode = null; dy = 0; }, { passive: true });
          track.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const mx = t.clientX - x0, my = t.clientY - y0;
            if (!mode && (Math.abs(mx) > 6 || Math.abs(my) > 6)) mode = Math.abs(my) > Math.abs(mx) && my > 0 ? 'v' : 'h';
            if (mode === 'v') {
              dy = Math.max(0, my);
              track.style.transition = 'none';
              track.style.transform = `translateY(${dy}px) scale(${1 - Math.min(dy, 300) / 1500})`;
              el.style.background = `rgba(0,0,0,${Math.max(0.25, 0.96 - dy / 420)})`;
            }
          }, { passive: true });
          track.addEventListener('touchend', () => {
            if (mode !== 'v') return;
            if (dy > 110) { close(); return; }
            track.style.transition = '';
            track.style.transform = '';
            el.style.background = '';
          });
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
          btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
          btn.innerHTML = rvHeart(liked);
          const n = card.querySelector('.rv-like-n');
          if (n) n.textContent = count;
          if (liked) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
        }

        async function toggleReviewLike(card, reviewId, forceOn) {
          const demo = rvIsDemoId(reviewId);
          if (!demo && !userId) { window.requireAuth('Для взаимодействия с отзывами необходимо войти.'); return; }
          window.likedReviewsCache = window.likedReviewsCache || new Set();
          const store = demo ? rvDemoLiked : window.likedReviewsCache;
          const wasLiked = store.has(reviewId);
          if (forceOn && wasLiked) return;
          const nEl = card.querySelector('.rv-like-n');
          let count = parseInt(nEl && nEl.textContent, 10) || 0;
          if (wasLiked) { store.delete(reviewId); count = Math.max(0, count - 1); }
          else { store.add(reviewId); count += 1; }
          rvSetLikeUi(card, !wasLiked, count);
          const item = rvState.items.find(r => r.id === reviewId);
          if (item) item.likes_count = count;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
          if (demo) return; // демо-отзывы живут только на экране: ни базы, ни кэша
          rvClearCache();
          try {
            if (wasLiked) await supabaseClient.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
            else await supabaseClient.from('review_likes').insert({ review_id: reviewId, user_id: userId });
          } catch (err) {
            console.error('Failed to sync like status:', err);
          }
        }

        // Жалоба на отзыв (ADR-051/052): повторное нажатие на флажок отзывает жалобу.
        // Пишут функции review_report_app / review_report_cancel; 3 разных жалобщика (мини-приложение + чат) скрывают отзыв (бот, REVIEW-004)
        async function rvReportReview(card, reviewId) {
          if (!userId) { window.requireAuth('Для жалобы необходимо войти.'); return; }
          const btn = card.querySelector('[data-rv-report]');
          if (!btn || btn.disabled) return;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
          const cancel = rvReported.has(reviewId);
          btn.disabled = true;
          try {
            const { data, error } = await supabaseClient.rpc(cancel ? 'review_report_cancel' : 'review_report_app', { p_review_id: reviewId, p_reporter: userId });
            if (error) throw error;
            if (!cancel && data === 'own') { btn.remove(); UI.toast('Это ваш отзыв'); return; }
            if (!cancel && data === 'gone') { rvReported.add(reviewId); btn.classList.add('sent'); btn.disabled = false; UI.toast('Отзыв уже скрыт'); return; }
            if (data !== 'ok') throw new Error('bad');
            if (cancel) rvReported.delete(reviewId); else rvReported.add(reviewId);
            btn.classList.toggle('sent', !cancel);
            btn.setAttribute('aria-pressed', cancel ? 'false' : 'true');
            btn.setAttribute('aria-label', cancel ? 'Пожаловаться на отзыв' : 'Отозвать жалобу');
            btn.title = cancel ? 'Пожаловаться' : 'Отозвать жалобу';
            btn.disabled = false;
            UI.toast(cancel ? 'Жалоба отозвана' : 'Жалоба отправлена. Нажмите ещё раз, чтобы отозвать');
          } catch (err) {
            console.error('Review report failed:', err);
            btn.disabled = false;
            UI.toast('Не удалось выполнить');
          }
        }

        // ---- Плеер голосовых и кружков: играет одно за раз; настоящий файл или демо-имитация (таймер + тихий тон) ----
        let rvCur = null;
        function rvMediaPaint(el, playing, t, dur) {
          el.classList.toggle('playing', playing);
          el.style.setProperty('--p', dur ? Math.min(1, Math.max(0, t / dur)).toFixed(3) : '0');
          const b = el.querySelector('[data-rv-play]');
          // иконку меняем только при смене состояния: перерисовка кнопки на каждом timeupdate нагружала главный поток
          if (b && el._pb !== playing) { el._pb = playing; b.innerHTML = playing ? RV_PAUSE : RV_PLAY; b.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести'); }
          const bars = el.querySelectorAll('.rv-wave i');
          if (bars.length) { const k = Math.round((dur ? t / dur : 0) * bars.length); bars.forEach((b, n) => b.classList.toggle('on', n < k)); }
          const tm = el.querySelector('[data-rv-time]');
          if (tm) tm.textContent = (playing || t > 0.05) ? rvFmtDur(t) : (dur ? rvFmtDur(dur) : '');
        }

        // Пауза (прогресс остаётся). Вызывается при переключении, смене ленты и уходе с экрана
        // revert = true: кружок вернуть в тихий автоплей (если он на экране), а не оставлять на паузе со звуком
        function rvStopMedia(revert) {
          const c = rvCur;
          rvCur = null;
          if (!c) return;
          clearInterval(c.timer);
          cancelAnimationFrame(c.raf);
          if (c.ctx) { try { c.ctx.close(); } catch (e) {} }
          const el = c.el;
          let t = c.t || 0;
          if (el._m) { try { el._m.pause(); } catch (e) {} t = el._m.currentTime || 0; }
          if (el.dataset.demo) el._t = t;
          if (el.isConnected) rvMediaPaint(el, false, t, c.dur);
          if (revert && el._ph) { rvVnDrop(el); return; }
          if (revert && el.isConnected) rvVnBack(el);
        }

        function rvMediaEnd(el, dur) {
          if (rvCur && rvCur.el === el) { clearInterval(rvCur.timer); cancelAnimationFrame(rvCur.raf); if (rvCur.ctx) { try { rvCur.ctx.close(); } catch (e) {} } rvCur = null; }
          el._t = 0;
          if (el._m) { try { el._m.currentTime = 0; } catch (e) {} }
          if (el.isConnected) rvMediaPaint(el, false, 0, dur);
          if (el._ph) rvVnDrop(el);
          else if (el.isConnected) rvVnBack(el);
        }

        // ---- Кружки как в Telegram: на экране сами играют по кругу без звука, тап — звук с начала ----
        let rvVnObs = null;

        // Выход из режима со звуком: без звука, по кругу; играет только пока кружок виден
        function rvVnBack(el) {
          if (!el.hasAttribute('data-rv-auto')) return;
          const v = el.querySelector('video');
          if (!v) return;
          if (el._snd) { el._snd = false; el.classList.remove('snd'); try { v.currentTime = 0; } catch (e) {} }
          v.muted = true; v.loop = true;
          if (el._vis) { v.preload = 'auto'; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
          else { try { v.pause(); } catch (e) {} }
        }

        // ---- Плавающий кружок (как в Telegram): со звуком ушёл с экрана — не останавливается, а едет в правый верхний угол ----
        let rvFloatTimer = null;
        const RV_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

        function rvVnFloatBox() {
          let box = document.getElementById('rvFloat');
          if (!box) {
            box = document.createElement('div');
            box.id = 'rvFloat';
            box.addEventListener('click', (e) => {
              const el = e.target.closest('[data-rv-vnote]');
              if (!el) return;
              if (e.target.closest('[data-rv-fclose]')) rvVnDrop(el); else rvMediaToggle(el);
            });
            document.body.appendChild(box);
          }
          return box;
        }

        // Убрать пустую коробку и таймер, когда плавающих кружков не осталось
        function rvVnFloatSync() {
          const box = document.getElementById('rvFloat');
          if (box && !box.children.length) box.remove();
          if (!document.getElementById('rvFloat') && rvFloatTimer) { clearInterval(rvFloatTimer); rvFloatTimer = null; }
        }

        function rvVnFloat(el) {
          if (el._ph || !el.isConnected) return;
          document.querySelectorAll('#rvFloat [data-rv-vnote]').forEach(o => rvVnDrop(o));
          const box = rvVnFloatBox();
          // на месте кружка в ленте остаётся пустышка того же размера: за ней следим, чтобы вернуть кружок обратно
          const ph = document.createElement('div');
          ph.className = 'rv-vn-ph';
          ph._fl = el; el._ph = ph;
          el.replaceWith(ph);
          box.appendChild(el);
          el.classList.add('rv-vn-fl');
          const x = document.createElement('button');
          x.type = 'button'; x.className = 'rv-vn-x'; x.setAttribute('data-rv-fclose', ''); x.setAttribute('aria-label', 'Закрыть кружок');
          x.innerHTML = RV_X;
          el.appendChild(x);
          el._vis = false;
          if (rvVnObs) { rvVnObs.unobserve(el); rvVnObs.observe(ph); }
          const v = el.querySelector('video');
          if (v && v.paused && rvCur && rvCur.el === el) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
          if (!rvFloatTimer) {
            rvFloatTimer = setInterval(() => {
              document.querySelectorAll('#rvFloat [data-rv-vnote]').forEach(o => { if (!o._ph || !o._ph.isConnected) rvVnDrop(o); });
              rvVnFloatSync();
            }, 1000);
          }
        }

        // Место кружка в ленте снова видно: вернуть его на карточку
        function rvVnUnfloat(el) {
          const ph = el._ph;
          if (!ph || !ph.isConnected) return;
          ph.replaceWith(el);
          el.classList.remove('rv-vn-fl');
          const x = el.querySelector('[data-rv-fclose]');
          if (x) x.remove();
          el._ph = null;
          el._vis = true;
          if (rvVnObs) { rvVnObs.unobserve(ph); rvVnObs.observe(el); }
          const v = el.querySelector('video');
          if (v && v.paused && rvCur && rvCur.el === el) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
          rvVnFloatSync();
        }

        // Закрыть плавающий кружок: звук стоп, на карточку — обратно в тихий автоплей (если карточки уже нет — убрать)
        function rvVnDrop(el) {
          if (rvCur && rvCur.el === el) rvStopMedia();
          const ph = el._ph;
          const v = el.querySelector('video');
          if (v) { try { v.pause(); } catch (e) {} }
          el._ph = null;
          el.classList.remove('rv-vn-fl');
          const x = el.querySelector('[data-rv-fclose]');
          if (x) x.remove();
          if (ph) { if (rvVnObs) rvVnObs.unobserve(ph); ph._fl = null; }
          if (ph && ph.isConnected) {
            ph.replaceWith(el);
            if (rvVnObs) rvVnObs.observe(el);
            rvVnBack(el);
          } else {
            el._vo = false;
            el.remove();
          }
          rvVnFloatSync();
        }

        function rvVnScan() {
          if (!('IntersectionObserver' in window)) return;
          if (!rvVnObs) {
            rvVnObs = new IntersectionObserver((entries) => {
              entries.forEach(en => {
                const tgt = en.target, r = en.intersectionRatio;
                // пустышка на месте уехавшего кружка: место снова видно — кружок возвращается
                if (tgt._fl) { if (r >= 0.6 && tgt._fl._ph === tgt) rvVnUnfloat(tgt._fl); return; }
                const el = tgt;
                el._vis = r >= 0.6;
                if (!el.isConnected || el._ph) return;
                if (el._vis) {
                  if (!el._snd) rvVnBack(el);
                } else if (el._snd) {
                  // совсем ушёл с экрана: играет со звуком — летит в угол, на паузе — возвращается в тихий режим
                  if (r < 0.05) { if (rvCur && rvCur.el === el) rvVnFloat(el); else rvVnBack(el); }
                } else {
                  const v = el.querySelector('video');
                  if (v) { try { v.pause(); } catch (e) {} }
                }
              });
            }, { threshold: [0, 0.05, 0.6] });
          }
          document.querySelectorAll('#rvRoot [data-rv-auto]').forEach(el => { if (!el._vo) { el._vo = true; rvVnObs.observe(el); } });
        }

        function rvVnReset() {
          document.querySelectorAll('#rvFloat [data-rv-vnote]').forEach(o => rvVnDrop(o));
          if (rvVnObs) { rvVnObs.disconnect(); rvVnObs = null; }
        }

        function rvMediaPlay(el) {
          rvStopMedia(true);
          document.querySelectorAll('[data-rv-auto].snd').forEach(o => { if (o === el) return; if (o._ph) rvVnDrop(o); else rvVnBack(o); });
          const video = el.hasAttribute('data-rv-vnote');
          let dur = Number(el.dataset.dur) || 0;
          const cur = { el, dur, t: 0 };
          rvCur = cur;
          if (typeof tgUtil !== 'undefined' && tgUtil.haptic) tgUtil.haptic('light');
          if (el.dataset.demo) {
            dur = dur || 20;
            cur.dur = dur;
            cur.t = el._t || 0;
            if (!video) {
              try {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) {
                  cur.ctx = new AC();
                  cur.osc = cur.ctx.createOscillator();
                  const g = cur.ctx.createGain();
                  g.gain.value = 0.03;
                  cur.osc.type = 'sine';
                  cur.osc.connect(g); g.connect(cur.ctx.destination);
                  cur.osc.start();
                }
              } catch (e) { cur.ctx = null; cur.osc = null; }
            }
            rvMediaPaint(el, true, cur.t, dur);
            cur.timer = setInterval(() => {
              if (!el.isConnected) { rvStopMedia(); return; }
              cur.t += 0.1;
              if (cur.osc) { try { cur.osc.frequency.value = [392, 523, 659, 523, 440][Math.floor(cur.t * 2.5) % 5]; } catch (e) {} }
              if (cur.t >= dur) { rvMediaEnd(el, dur); return; }
              rvMediaPaint(el, true, cur.t, dur);
            }, 100);
            return;
          }
          let node = el._m;
          if (!node) {
            node = video ? el.querySelector('video') : new Audio(el.dataset.src);
            if (!node) { rvCur = null; return; }
            node.preload = 'auto';
            if (video) node.playsInline = true;
            node.addEventListener('timeupdate', () => {
              if (!el.isConnected) { if (rvCur && rvCur.el === el) rvStopMedia(); else { try { node.pause(); } catch (e) {} } return; }
              if (rvCur && rvCur.el === el) rvMediaPaint(el, true, node.currentTime, Number(el.dataset.dur) || node.duration || 0);
            });
            node.addEventListener('ended', () => rvMediaEnd(el, Number(el.dataset.dur) || node.duration || 0));
            node.addEventListener('error', () => {
              if (rvCur && rvCur.el === el) rvCur = null;
              if (el.isConnected) { rvMediaPaint(el, false, 0, Number(el.dataset.dur) || 0); UI.toast('Не удалось воспроизвести'); }
            });
            el._m = node;
          }
          if (video) {
            // тап по играющему без звука кружку: со звуком и с начала; повторный тап после паузы продолжает с места
            // пауза → перемотка → звук → старт: так картинка и звук стартуют вместе, без «хвоста» от тихого цикла
            node.loop = false;
            if (!el._snd) {
              el._snd = true; el.classList.add('snd');
              try { node.pause(); if (node.currentTime > 0.05) node.currentTime = 0; } catch (e) {}
            }
            node.muted = false;
          }
          rvMediaPaint(el, true, node.currentTime || 0, dur || node.duration || 0);
          const p = node.play();
          if (p && p.catch) p.catch(() => { if (rvCur && rvCur.el === el) rvCur = null; rvMediaPaint(el, false, 0, dur); UI.toast('Не удалось воспроизвести'); });
          if (video) rvRingTick(cur, node);
        }

        // Кольцо вокруг кружка двигаем каждый кадр по реальному времени видео — плавно, без «ступенек» timeupdate
        function rvRingTick(cur, node) {
          const el = cur.el;
          const step = () => {
            if (rvCur !== cur || !el.isConnected) return;
            const d = Number(el.dataset.dur) || node.duration || 0;
            if (d) el.style.setProperty('--p', Math.min(1, node.currentTime / d).toFixed(4));
            cur.raf = requestAnimationFrame(step);
          };
          cancelAnimationFrame(cur.raf);
          cur.raf = requestAnimationFrame(step);
        }

        function rvMediaToggle(el) {
          if (!el || el.classList.contains('off')) return;
          if (rvCur && rvCur.el === el) rvStopMedia(); else rvMediaPlay(el);
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

        function attachReviewsHandlers() {
          const root = document.getElementById('rvRoot');
          if (!root) return;
          rvStopMedia();
          rvVnReset();

          // Нажатие на фильтры и сортировку срабатывает сразу при касании (без ожидания click), click потом не дублирует
          let tapAt = 0, pdX = 0, pdY = 0, pdEl = null;
          root.addEventListener('pointerdown', (e) => {
            pdEl = e.target.closest('[data-rv-cat],[data-rv-sort]');
            pdX = e.clientX; pdY = e.clientY;
            if (pdEl) pdEl.classList.add('rv-press');
          });
          const unpress = () => { root.querySelectorAll('.rv-press').forEach(b => b.classList.remove('rv-press')); };
          root.addEventListener('pointercancel', () => { pdEl = null; unpress(); });
          root.addEventListener('pointerup', (e) => {
            unpress();
            const el = e.target.closest('[data-rv-cat],[data-rv-sort]');
            if (!el || el !== pdEl || Math.abs(e.clientX - pdX) > 14 || Math.abs(e.clientY - pdY) > 14) { pdEl = null; return; }
            pdEl = null; tapAt = Date.now();
            if (el.dataset.rvSort) rvSwitchSort(el.dataset.rvSort); else rvSwitchCategory(el.dataset.rvCat);
          });

          root.addEventListener('click', (e) => {
            const t = e.target;
            if (Date.now() - tapAt < 700 && t.closest('[data-rv-cat],[data-rv-sort]')) return;
            const plat = t.closest('[data-rv-url]');
            if (plat) { openExternalLink(plat.dataset.rvUrl); return; }
            if (t.closest('[data-rv-ask]')) { rvOpenBotReview(); return; }
            const srt = t.closest('[data-rv-sort]');
            if (srt) { rvSwitchSort(srt.dataset.rvSort); return; }
            const chip = t.closest('[data-rv-cat]');
            if (chip) { rvSwitchCategory(chip.dataset.rvCat); return; }

            const card = t.closest('.rv-card');
            if (!card || !card.dataset.reviewId) return;
            const id = card.dataset.reviewId;
            if (t.closest('[data-rv-report]')) { rvReportReview(card, id); return; }
            if (t.closest('[data-rv-like]')) {
              // двойной тап по сердцу = одно переключение, а не два
              const nowL = Date.now();
              if (card._rvLikeAt && nowL - card._rvLikeAt < 450) return;
              card._rvLikeAt = nowL;
              toggleReviewLike(card, id);
              return;
            }
            const med = t.closest('[data-rv-voice],[data-rv-vnote]');
            if (med) { rvMediaToggle(med); return; }
            if (t.closest('[data-rv-want]')) { rvWantSame(id); return; }
            if (t.closest('[data-rv-items]')) { openReviewItems(id); return; }
            const ph = t.closest('[data-rv-ph]');
            if (ph) {
              const item = rvState.items.find(r => r.id === id);
              const urls = item && Array.isArray(item.photo_urls) ? item.photo_urls.filter(Boolean) : [];
              if (urls.length) rvOpenLightbox(urls, Number(ph.dataset.rvPh));
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

          // Двойное касание по карточке — лайк: окно 450 мс, допуск дрожания пальца 30 px, работает и мышью
          // (кнопки, фото и плееры не считаются: у них свои нажатия)
          let lastTap = 0, lastCard = null, lastX = 0, lastY = 0, dnX = 0, dnY = 0, dnOk = false;
          const rvTapSkip = '[data-rv-like],[data-rv-ph],[data-rv-voice],[data-rv-vnote],[data-rv-want],[data-rv-items],[data-rv-toggle],button,a,input,textarea';
          root.addEventListener('pointerdown', (e) => {
            dnX = e.clientX; dnY = e.clientY;
            dnOk = e.isPrimary !== false && (e.pointerType !== 'mouse' || e.button === 0);
          });
          root.addEventListener('pointercancel', () => { dnOk = false; lastTap = 0; lastCard = null; });
          root.addEventListener('pointerup', (e) => {
            if (!dnOk) return;
            dnOk = false;
            const card = e.target.closest('.rv-card');
            if (!card || !card.dataset.reviewId || e.target.closest(rvTapSkip)) { lastTap = 0; lastCard = null; return; }
            // сдвиг больше 10 px — это прокрутка, а не касание
            if (Math.abs(e.clientX - dnX) > 10 || Math.abs(e.clientY - dnY) > 10) { lastTap = 0; lastCard = null; return; }
            const now = Date.now();
            if (lastCard === card && now - lastTap < 450 && Math.hypot(e.clientX - lastX, e.clientY - lastY) <= 30) {
              const rect = card.getBoundingClientRect();
              triggerDoubleTapLike(card, card.dataset.reviewId, e.clientX - rect.left - 32, e.clientY - rect.top - 32);
              lastTap = 0; lastCard = null;
              return;
            }
            lastTap = now; lastCard = card; lastX = e.clientX; lastY = e.clientY;
          });

          rvLoadAsk();
          rvVnScan();

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

        const RV_BAG_ART = `<svg class="rv-ihero-art" viewBox="0 0 96 96" aria-hidden="true">
            <defs>
              <linearGradient id="rvBagA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfe0ff"/></linearGradient>
              <linearGradient id="rvBagB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc0ff"/><stop offset="1" stop-color="#5b8fff"/></linearGradient>
            </defs>
            <path d="M24 34h48l-4 46a6 6 0 0 1-6 5H34a6 6 0 0 1-6-5z" fill="url(#rvBagB)" transform="translate(6 4)" opacity=".55"/>
            <path d="M20 30h52l-4 48a6 6 0 0 1-6 5H30a6 6 0 0 1-6-5z" fill="url(#rvBagA)"/>
            <path d="M34 38V26a12 12 0 0 1 24 0v12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
            <circle cx="34" cy="40" r="3.4" fill="#5b8fff"/><circle cx="58" cy="40" r="3.4" fill="#5b8fff"/>
            <path d="m38 58 6 6 12-12" fill="none" stroke="#2f7bff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;

        // Экран «Товары из отзыва»: список товаров заказов, у каждого «Хочу так же»
        async function renderReviewItems() {
          const id = window._rvItemsReviewId;
          let r = null;
          try { r = id ? await rvGetReview(id) : null; } catch (e) { r = null; }
          const items = r ? rvOrderItems(r) : [];
          const nums = r ? (r.orders || []).map(o => o.public_number).filter(Boolean) : [];
          const rating = r ? Math.max(0, Math.min(5, Number(r.rating) || 0)) : 0;
          const list = items.length
            ? `<div class="rv-items">${items.map((it, i) => `
                <div class="rv-item" style="--i:${Math.min(i, 8)}">
                  <div class="rv-item-ph">${UI.icon('bag', 26)}${it.img ? `<img src="${rvEsc(it.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>
                  <div class="rv-item-b">
                    <div class="rv-item-t">${rvEsc(it.title)}</div>
                    ${it.meta || it.num ? `<div class="rv-item-m">${rvEsc([it.num, it.meta].filter(Boolean).join(' · '))}</div>` : ''}
                    ${it.url ? `<button type="button" class="rv-act rv-act-main rv-item-want" data-rv-want-url="${rvEsc(it.url)}">${UI.icon('sparkles', 16, { stroke: 2.2 })}<span>Хочу так же</span></button>` : ''}
                  </div>
                </div>`).join('')}</div>`
            : UI.empty({ icon: 'bag', title: 'Товары пока недоступны', text: 'Список товаров этого отзыва ещё не открыт. Загляните чуть позже.' });
          return `
            <div class="rd-screen page-enter rv-ipage" id="rvItemsRoot">
              <div class="rd-head">
                <button type="button" class="rd-back" data-rv-back aria-label="Назад">${UI.icon('chevL', 22)}</button>
                <div class="rd-head-txt"><h1 class="rd-head-title">Товары из отзыва</h1><p class="rd-head-sub">Закажите то же самое в пару касаний</p></div>
              </div>
              <section class="rd-card rv-hub rv-ihero">
                ${RV_BAG_ART}
                <div class="rv-ihero-t">${items.length ? `${items.length} ${rvPlural(items.length, ['товар', 'товара', 'товаров'])}` : 'Товары'}</div>
                <div class="rv-ihero-s">${r ? `${rvEsc(r.user_name || 'Клиент')}${rating ? ` · оценка ${rating} из 5` : ''}` : 'Отзыв не найден'}</div>
                ${nums.length ? `<div class="rv-ihero-nums">${nums.map(n => `<span>${UI.icon('box', 14, { stroke: 2.2 })}${rvEsc(n)}</span>`).join('')}</div>` : ''}
              </section>
              ${list}
            </div>`;
        }

        function attachReviewItemsHandlers() {
          const root = document.getElementById('rvItemsRoot');
          if (!root) return;
          root.addEventListener('click', (e) => {
            if (e.target.closest('[data-rv-back]')) {
              if (typeof window.goBackGlobal === 'function') window.goBackGlobal(); else switchTab('reviews');
              return;
            }
            const w = e.target.closest('[data-rv-want-url]');
            if (w) rvWantSame(null, w.dataset.rvWantUrl);
          });
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
        window.attachReviewsHandlers = attachReviewsHandlers;
        window.renderReviewItems = renderReviewItems;
        window.attachReviewItemsHandlers = attachReviewItemsHandlers;
        window.rvWantSame = rvWantSame;
        window.openReviewItems = openReviewItems;
