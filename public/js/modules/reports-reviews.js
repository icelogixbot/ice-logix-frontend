// ============================================================
// ICE LOGIX Module: Reports & Reviews
// ============================================================
    // ==================== РЕНДЕР ОТЧЁТОВ ====================
    async function renderReports() {
      try {
        let reportsData = null;
        if (window.CacheDB) {
          reportsData = await window.CacheDB.get('public_reports_feed', async () => {
            const [{ data: rep }, countRes] = await Promise.all([
              supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false }),
              supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').catch(() => ({ count: 120 }))
            ]);
            return { data: rep || [], count: countRes?.count || 120 };
          }, 60000);
        } else {
          const [{ data: rep }, countRes] = await Promise.all([
            supabaseClient.from('public_reports').select('*').eq('is_active', true).order('created_at', { ascending: false }),
            supabaseClient.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').catch(() => ({ count: 120 }))
          ]);
          reportsData = { data: rep || [], count: countRes?.count || 120 };
        }
        
        const data = reportsData?.data || [];
        const count = reportsData?.count || '120+';
        const statsHtml = `<div class="glass-card mb-4 p-3 flex justify-around items-center text-center"><div class="flex-1 border-r border-white/10"><p class="text-white/50 text-[10px] uppercase">Выкуплено</p><p class="text-white font-bold text-lg">${data.length}</p></div><div class="flex-1"><p class="text-white/50 text-[10px] uppercase">Доставлено</p><p class="text-cyan-400 font-bold text-lg">${count}</p></div></div>`;
        
        if (data.length === 0) {
          return `${statsHtml}<div class="text-center py-10"><p class="text-white/70">Пока нет публичных отчётов</p>${isOwner ? '<button id="addReportBtn" class="btn-primary mt-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить первый отчёт</button>' : ''}</div>${renderFooter()}`;
        }
        return `
          <div class="space-y-4">
            ${statsHtml}
            ${isOwner ? '<button id="addReportBtn" class="global-back-btn mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить отчёт</button>' : ''}
            ${data.map(report => {
              let mediaUrls = [];
              try { mediaUrls = JSON.parse(report.image_url); } catch(e) { mediaUrls = [report.image_url]; }
              if (!Array.isArray(mediaUrls)) mediaUrls = [report.image_url];
              
              const carouselHtml = mediaUrls.map((url, idx) => `
                <div class="w-full flex-shrink-0 relative h-72">
                  ${report.type === 'video' ? `<video src="${url}" class="w-full h-full object-cover" controls></video>` : `<img src="${url}" class="w-full h-full object-cover" alt="${report.title}" onclick="tgUtil.popup('${url}', 'Фото отчета')">`}
                  ${mediaUrls.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-full text-white text-[10px]">${idx + 1} / ${mediaUrls.length}</div>` : ''}
                </div>
              `).join('');

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
            `}).join('')}
          </div>
          ${renderFooter()}
        `;
      } catch (err) { return '<p class="text-center mt-10 text-red-400">Ошибка загрузки отчётов</p>'; }
    }

    function attachReportsHandlers() {
      const addBtn = document.getElementById('addReportBtn');
      if (addBtn) {
        addBtn.onclick = () => {
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
          modal.innerHTML = `
            <div class="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 class="text-white font-bold text-lg mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новый отчёт</h3>
              <input type="text" id="reportTitle" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="Заголовок">
              <textarea id="reportDesc" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3" placeholder="Описание" rows="3"></textarea>
              <select id="reportType" class="btn-secondary w-full p-3 rounded-xl border border-white/30 mb-3">
                <option value="photo">Фото</option>
                <option value="video">Видео</option>
              </select>

              <p class="text-white/60 text-xs mb-2 font-semibold">Фото/видео:</p>
              <div id="reportPhotoPreviews" class="flex flex-wrap gap-2 mb-3"></div>
              <label class="cursor-pointer flex items-center gap-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl px-4 py-3 mb-3 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex-shrink:0;color:#22d3ee" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span class="text-cyan-400 text-sm font-semibold">Выбрать из галереи</span>
                <input type="file" id="reportFileInput" accept="image/*,video/*" multiple class="hidden">
              </label>
              <span id="reportUploadStatus" class="text-xs text-white/50 mb-3 block"></span>

              <input type="url" id="reportProductUrl" class="btn-secondary w-full p-3 rounded-xl border border-cyan-500/30 mb-3" placeholder="Ссылка на оригинальный товар (для 'Хочу такой же')">
              <div class="flex gap-3 mt-4">
                <button id="saveReportBtn" class="btn-primary flex-1">Сохранить</button>
                <button id="cancelReportBtn" class="btn-secondary flex-1">Отмена</button>
              </div>
            </div>
          `;
          document.body.appendChild(modal);

          const uploadedUrls = [];
          const statusEl = modal.querySelector('#reportUploadStatus');
          const previewsEl = modal.querySelector('#reportPhotoPreviews');

          modal.querySelector('#reportFileInput').onchange = async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            statusEl.textContent = `⏳ Загрузка ${files.length} файл(а)...`;
            statusEl.className = 'text-xs text-yellow-400 mb-3 block';
            let ok = 0;
            for (const file of files) {
              try {
                const ext = file.name.split('.').pop();
                const fileName = `reports/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('ugc').upload(fileName, file, { contentType: file.type });
                if (upErr) throw upErr;
                const { data } = supabaseClient.storage.from('ugc').getPublicUrl(fileName);
                uploadedUrls.push(data.publicUrl);
                const thumb = document.createElement('div');
                thumb.style.cssText = 'width:60px;height:60px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);flex-shrink:0;';
                thumb.innerHTML = `<img src="${data.publicUrl}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">`;
                previewsEl.appendChild(thumb);
                ok++;
              } catch (err) { console.error('Upload error:', err); }
            }
            statusEl.textContent = ok === files.length ? `✅ Загружено ${ok} файл(а)` : `⚠️ Загружено ${ok} из ${files.length}`;
            statusEl.className = `text-xs mb-3 block ${ok === files.length ? 'text-green-400' : 'text-yellow-400'}`;
          };

          modal.querySelector('#cancelReportBtn').onclick = () => modal.remove();
          modal.querySelector('#saveReportBtn').onclick = async () => {
            const title = modal.querySelector('#reportTitle').value.trim();
            const description = modal.querySelector('#reportDesc').value.trim();
            const type = modal.querySelector('#reportType').value;
            const product_url = modal.querySelector('#reportProductUrl').value.trim();

            if (!title || uploadedUrls.length === 0) { tgUtil.alert('Заполните заголовок и добавьте хотя бы одно фото из галереи'); return; }

            const finalImageUrl = uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : uploadedUrls[0];
            try {
              await supabaseClient.from('public_reports').insert({ title, description, type, image_url: finalImageUrl, product_url, is_active: true, created_at: new Date().toISOString() });
              tgUtil.alert('Отчёт добавлен'); modal.remove(); renderCurrentScreen();
            } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
          };
        };
      }
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
        window.reviewsScreen = window.reviewsScreen || 'hub';
        window.currentReviewsCategory = window.currentReviewsCategory || 'all';
        window.currentReviewsCountry = window.currentReviewsCountry || 'all';
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
              bonus_internal_pct: 2.0,
              bonus_external_text_pct: 1.0,
              bonus_external_media_pct: 3.0,
              partner_user_ids: []
            };
          }
          return window.currentReviewsConfig;
        }

        async function renderReviews() {
          try {
            const [, config] = await Promise.all([
              loadUserLikes(),
              loadReviewsConfig()
            ]);

            // Run async dropshipper action evaluation in background if user is logged in
            if (userId) {
              setTimeout(() => checkAndCreateDropshipperAction(), 0);
            }

            if (window.reviewsScreen === 'hub') {
              return await renderReviewsHub(config);
            } else {
              return await renderReviewsFeed(config);
            }
          } catch (err) {
            console.error('Error rendering reviews screen:', err);
            return `<div class="p-4 text-center text-red-400">Ошибка загрузки отзывов: ${err.message}</div>`;
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

        async function renderReviewsHub(config) {
          let reviewsStats = { count: 184, avg: 4.9 };
          try {
            if (window.CacheDB) {
              reviewsStats = await window.CacheDB.get('reviews_hub_stats', async () => {
                const { data } = await supabaseClient.from('reviews').select('rating').eq('is_published', true);
                if (data && data.length > 0) {
                  const count = data.length;
                  const totalStars = data.reduce((sum, r) => sum + (r.rating || 0), 0);
                  return { count, avg: totalStars / count };
                }
                return { count: 0, avg: 4.9 };
              }, 60000);
            }
          } catch (e) {}
          const reviewsCount = reviewsStats.count;
          const avgRating = reviewsStats.avg;

          const categories = [
            { id: 'orders', label: 'Заказы', icon: '🛒', desc: 'Отзывы розничных клиентов о доставленных вещах' },
            { id: 'promotions', label: 'Акции / Розыгрыши', icon: '🎁', desc: 'Впечатления победителей конкурсов и участников акций' },
            { id: 'dropshipping', label: 'Дропшиппинг', icon: '💼', desc: 'Отзывы оптовых B2B-партнеров нашей программы' },
            { id: 'referral', label: 'Рефералка', icon: '👥', desc: 'Отзывы участников, получающих реферальные выплаты' },
            { id: 'advertising', label: 'Реклама', icon: '📢', desc: 'Отзывы блогеров и администраторов об интеграциях' },
            { id: 'academy', label: 'Обучение', icon: '🎓', desc: 'Отзывы учеников о курсах по самостоятельному выкупу' },
            { id: 'legitcheck', label: 'Legit Check', icon: '🔍', desc: 'Отзывы о проверке подлинности брендовых вещей' },
            { id: 'partnership', label: 'Партнерство', icon: '🤝', desc: 'Отзывы от B2B партнеров (ShopByShop, легит-чекеры)' }
          ];

          return `
            <div class="space-y-6 text-left mb-6">
              <!-- Визуальная досочка (Инфо-плашка) -->
              <div class="reviews-board p-5 border border-white/10 text-center relative overflow-hidden">
                <div class="absolute -right-10 -top-10 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl"></div>
                <div class="absolute -left-10 -bottom-10 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl"></div>
                
                <p class="text-cyan-400 text-[10px] font-extrabold uppercase tracking-widest mb-1">Рейтинг ICE LOGIX</p>
                <div class="flex justify-center items-baseline gap-1.5 my-2">
                  <span class="text-white text-4xl font-black">${avgRating.toFixed(1)}</span>
                  <span class="text-white/60 text-base font-semibold">/ 5.0</span>
                </div>
                
                <div class="flex justify-center gap-1 text-base mb-4">
                  ${'⭐'.repeat(Math.min(5, Math.max(1, Math.round(avgRating))))}${'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.max(1, Math.round(avgRating)))))}
                </div>

                <p class="text-white/50 text-[11px] mb-4">На основе ${reviewsCount} отзывов покупателей</p>

                <!-- Внешние гео-ресурсы и соцсети -->
                <div class="grid grid-cols-5 gap-2 border-t border-white/10 pt-4">
                  <button onclick="openExternalLink('${config.yandex_maps_link || 'https://yandex.by/maps/'}')" class="btn-secondary py-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5" title="Яндекс.Карты">
                    <span class="text-lg">🇷🇺</span>
                    <span class="text-[9px] font-extrabold text-white/70">Яндекс</span>
                  </button>
                  <button onclick="openExternalLink('${config.google_maps_link || 'https://maps.google.com/'}')" class="btn-secondary py-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5" title="Google Maps">
                    <span class="text-lg">🌐</span>
                    <span class="text-[9px] font-extrabold text-white/70">Google</span>
                  </button>
                  <button onclick="openExternalLink('${config.gis_2_link || 'https://2gis.by/'}')" class="btn-secondary py-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5" title="2ГИС">
                    <span class="text-lg">🟢</span>
                    <span class="text-[9px] font-extrabold text-white/70">2ГИС</span>
                  </button>
                  <button onclick="openExternalLink('${config.telegram_group_link || 'https://t.me/'}')" class="btn-secondary py-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5" title="Telegram Отзывы">
                    <span class="text-lg">💬</span>
                    <span class="text-[9px] font-extrabold text-white/70">Чат</span>
                  </button>
                  <button onclick="openExternalLink('${config.social_media_links?.vk || 'https://vk.com/'}')" class="btn-secondary py-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/5" title="ВКонтакте">
                    <span class="text-lg">🔵</span>
                    <span class="text-[9px] font-extrabold text-white/70">VK</span>
                  </button>
                </div>
              </div>

              <!-- Плиточная сетка категорий -->
              <div>
                <p class="text-white/60 text-xs font-black uppercase tracking-widest mb-3">Разделы отзывов</p>
                <div class="reviews-hub-grid">
                  <!-- Крупная кнопка Все отзывы -->
                  <div class="reviews-hub-tile-btn full-width" data-category="all">
                    <div class="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                    <div>
                      <h4 class="text-white font-extrabold text-sm leading-tight">Все отзывы</h4>
                      <p class="text-white/50 text-[10.5px] mt-0.5 leading-snug">Лента вообще всех отзывов сервиса ICE LOGIX</p>
                    </div>
                  </div>
                  
                  <!-- Остальные 8 категорий -->
                  ${categories.map(c => `
                    <div class="reviews-hub-tile-btn" data-category="${c.id}">
                      <div class="flex items-center justify-between w-full">
                        <span class="text-2xl">${c.icon}</span>
                        <span class="text-white/30 text-xs">➔</span>
                      </div>
                      <div>
                        <h4 class="text-white font-extrabold text-xs leading-tight">${c.label}</h4>
                        <p class="text-white/50 text-[9.5px] mt-1 leading-snug line-clamp-2">${c.desc}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            ${renderFooter()}
          `;
        }

        async function renderReviewsFeed(config) {
          const categories = [
            { id: 'all', label: 'Все отзывы' },
            { id: 'orders', label: 'Заказы 🛒' },
            { id: 'promotions', label: 'Акции 🎁' },
            { id: 'dropshipping', label: 'Дропшиппинг 💼' },
            { id: 'referral', label: 'Рефералка 💸' },
            { id: 'advertising', label: 'Реклама 📢' },
            { id: 'academy', label: 'Обучение 🎓' },
            { id: 'legitcheck', label: 'Legit Check 🔍' },
            { id: 'partnership', label: 'Партнерство 🤝' }
          ];

          const countries = [
            { id: 'all', label: 'Все страны 🌐', active: true },
            { id: 'china', label: 'Китай 🇨🇳', active: true },
            { id: 'russia', label: 'Россия 🇷🇺 (Скоро)', active: false },
            { id: 'europe', label: 'Евросоюз 🇪🇺 (Скоро)', active: false },
            { id: 'usa', label: 'США 🇺🇸 (Скоро)', active: false },
            { id: 'turkey', label: 'Турция 🇹🇷 (Скоро)', active: false },
            { id: 'japan', label: 'Япония 🇯🇵 (Скоро)', active: false },
            { id: 'korea', label: 'Южная Корея 🇰🇷 (Скоро)', active: false },
            { id: 'vietnam', label: 'Вьетнам 🇻🇳 (Скоро)', active: false },
            { id: 'uae', label: 'ОАЭ 🇦🇪 (Скоро)', active: false }
          ];

          // 1. Calculate specific category rating & total count
          let avgRating = 4.9;
          let categoryReviewsCount = 0;
          try {
            let statsQuery = supabaseClient.from('reviews').select('rating').eq('is_published', true);
            if (window.currentReviewsCategory !== 'all') {
              statsQuery = statsQuery.eq('category', window.currentReviewsCategory);
            }
            const { data } = await statsQuery;
            if (data && data.length > 0) {
              categoryReviewsCount = data.length;
              const totalStars = data.reduce((sum, r) => sum + (r.rating || 0), 0);
              avgRating = totalStars / categoryReviewsCount;
            }
          } catch(e) {
            console.error('Error getting feed stats:', e);
          }

          // 2. Fetch media files for horizontal ribbon gallery
          let ribbonPhotos = [];
          try {
            let ribbonQuery = supabaseClient.from('reviews')
              .select('photo_urls')
              .eq('is_published', true)
              .not('photo_urls', 'is', null);
              
            if (window.currentReviewsCategory !== 'all') {
              ribbonQuery = ribbonQuery.eq('category', window.currentReviewsCategory);
            }
            
            const { data: ribbonData } = await ribbonQuery.order('created_at', { ascending: false }).limit(30);
            if (ribbonData) {
              ribbonData.forEach(r => {
                if (Array.isArray(r.photo_urls)) {
                  r.photo_urls.forEach(url => {
                    if (url && ribbonPhotos.length < 15) {
                      ribbonPhotos.push(url);
                    }
                  });
                }
              });
            }
          } catch (e) {
            console.error('Error fetching gallery ribbon photos:', e);
          }

          // 3. Fetch review cards (paginated)
          const pageSize = 10;
          const fromRow = (reviewsPage - 1) * pageSize;
          const toRow = fromRow + pageSize - 1;

          let reviewsQuery = supabaseClient.from('reviews')
            .select('*, review_actions(*)', { count: 'exact' })
            .eq('is_published', true);

          if (window.currentReviewsCategory !== 'all') {
            reviewsQuery = reviewsQuery.eq('category', window.currentReviewsCategory);
          }
          if (window.currentReviewsCategory === 'orders' && window.currentReviewsCountry !== 'all') {
            reviewsQuery = reviewsQuery.eq('region', window.currentReviewsCountry);
          }

          // Sort: pinned first, then newest
          const { data: feedReviewsData, count: totalCount, error: fetchErr } = await reviewsQuery
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(fromRow, toRow);

          if (fetchErr) {
            console.error('Error fetching reviews feed:', fetchErr);
          }

          const feedReviews = feedReviewsData || [];
          reviewsTotalPages = Math.ceil((totalCount || 0) / pageSize) || 1;

          let pendingActionsCount = 0;
          if (userId) {
            try {
              const { data } = await supabaseClient.from('review_actions').select('id').eq('user_id', userId).eq('status', 'pending');
              pendingActionsCount = data ? data.length : 0;
            } catch (e) {}
          }
          const partnerUserIds = config.partner_user_ids || [];
          const isPartnerUser = userId && (
            partnerUserIds.map(id => id.toString()).includes(userId.toString()) ||
            (window.userRole === 'partner')
          );

          return `
            <div class="space-y-4 page-enter text-left mb-6">
              <div class="flex items-center gap-3">
                <button id="feedBackToHubBtn" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <span class="text-white text-lg">➔</span>
                </button>
                <div>
                  <h2 class="text-white text-xl font-bold leading-tight">Лента отзывов</h2>
                  <p class="text-white/40 text-[10.5px] uppercase font-bold tracking-wider">ICE LOGIX Feed</p>
                </div>
              </div>

              <!-- Категории скролл -->
              <div class="reviews-category-chips pb-1" id="feedCategoryChips">
                ${categories.map(c => `
                  <button class="filter-chip ${window.currentReviewsCategory === c.id ? 'active' : ''}" data-category="${c.id}">
                    ${c.label}
                  </button>
                `).join('')}
              </div>

              <!-- Страны скролл (если Заказы) -->
              ${window.currentReviewsCategory === 'orders' ? `
                <div class="reviews-country-chips pb-1" id="feedCountryChips">
                  ${countries.map(c => {
                    if (c.active) {
                      return `
                        <button class="filter-chip ${window.currentReviewsCountry === c.id ? 'active' : ''}" data-country="${c.id}">
                          ${c.label}
                        </button>
                      `;
                    } else {
                      return `
                        <button class="filter-chip disabled-future" disabled>
                          ${c.label}
                        </button>
                      `;
                    }
                  }).join('')}
                </div>
              ` : ''}

              <!-- Галерея медиа -->
              ${ribbonPhotos.length > 0 ? `
                <div class="space-y-1.5">
                  <p class="text-white/50 text-[10px] uppercase font-bold tracking-wider">Галерея покупателей</p>
                  <div class="reviews-gallery-ribbon">
                    ${ribbonPhotos.map((url, i) => `
                      <img src="${url}" class="reviews-gallery-item" onclick="event.stopPropagation(); window.showImagePreview(${JSON.stringify(ribbonPhotos)}, ${i})">
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Заголовок подраздела и статистика -->
              <div class="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 text-xs text-white/60">
                <span>⭐ Раздел: ${avgRating.toFixed(1)} / 5.0</span>
                <span>Всего: ${categoryReviewsCount} отзывов</span>
              </div>

              <!-- Список отзывов -->
              <div class="space-y-4 mt-2">
                ${feedReviews.length === 0 ? `
                  <div class="text-center py-12 text-white/50 bg-white/5 rounded-2xl border border-white/5">
                    <span class="text-3xl block mb-2">📭</span>
                    Пока нет отзывов в этой категории
                  </div>
                ` : feedReviews.map(review => {
                  const initials = (review.user_name || 'U').substring(0, 1).toUpperCase();
                  const hasPhotos = Array.isArray(review.photo_urls) && review.photo_urls.length > 0;
                  const isPinned = review.is_pinned === true;

                  let hasDetails = false;
                  let detailsHtml = '';
                  let targetAction = review.review_actions || review.target_action;
                  if (Array.isArray(targetAction)) {
                    targetAction = targetAction[0];
                  }

                  if (targetAction && targetAction.details) {
                    hasDetails = true;
                    const details = targetAction.details;
                    detailsHtml = `
                      <div class="text-[11px] text-white/70 space-y-1 font-medium text-left">
                        ${details.product ? `<div>🛍️ Товар: <span class="text-cyan-300">${details.product}</span></div>` : ''}
                        ${details.size ? `<div>📏 Размер: <span class="text-cyan-300">${details.size}</span></div>` : ''}
                        ${details.delivery ? `<div>📍 Доставка: <span class="text-cyan-300">${details.delivery}</span></div>` : ''}
                        ${details.term ? `<div>⏳ Срок: <span class="text-cyan-300">${details.term}</span></div>` : ''}
                        ${details.amount ? `<div>💰 Сумма: <span class="text-cyan-300">${details.amount}</span></div>` : ''}
                      </div>
                    `;
                  } else if (review.orders && Array.isArray(review.orders.items) && review.orders.items[0]) {
                    hasDetails = true;
                    const item = review.orders.items[0];
                    detailsHtml = `
                      <div class="text-[11px] text-white/70 space-y-1 font-medium text-left">
                        <div>🛍️ Товар: <span class="text-cyan-300">${item.title || item.title_translated || 'Товар'}</span></div>
                        <div>📏 Размер: <span class="text-cyan-300">${item.size || 'не указан'}</span></div>
                      </div>
                    `;
                  }

                  const isLiked = window.likedReviewsCache && window.likedReviewsCache.has(review.id);

                  return `
                    <div class="review-card-wb relative" data-review-id="${review.id}">
                      ${isOwner ? `
                        <button class="review-card-wb-pin-btn ${isPinned ? 'pinned' : ''}" onclick="event.stopPropagation(); toggleReviewPin('${review.id}')" title="${isPinned ? 'Открепить' : 'Закрепить'}">
                          📌
                        </button>
                      ` : (isPinned ? `
                        <div class="absolute right-4 top-4 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          📌 Закреплено
                        </div>
                      ` : '')}

                      <div class="review-card-wb-header">
                        <div class="review-card-wb-avatar">${initials}</div>
                        <div class="review-card-wb-info">
                          <div class="review-card-wb-name">
                            <span>${review.user_name || 'Клиент'}</span>
                          </div>
                          <div class="review-card-wb-meta">
                            <span class="review-card-wb-category">${review.category}</span>
                            <span class="review-card-wb-time">
                              ${new Date(review.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div class="review-card-wb-body">
                        ${hasPhotos ? `
                          <div class="review-card-wb-media-block">
                            ${review.photo_urls.slice(0, 2).map((url, i) => `
                              <img src="${url}" class="review-card-wb-media-preview" onclick="event.stopPropagation(); window.showImagePreview(${JSON.stringify(review.photo_urls)}, ${i})">
                            `).join('')}
                            ${review.photo_urls.length > 2 ? `
                              <div class="review-card-wb-media-more" onclick="event.stopPropagation(); window.showImagePreview(${JSON.stringify(review.photo_urls)}, 2)">
                                <img src="${review.photo_urls[2]}">
                                <div class="review-card-wb-media-more-overlay">+${review.photo_urls.length - 2}</div>
                              </div>
                            ` : ''}
                          </div>
                        ` : ''}

                        <div class="review-card-wb-text-container">
                          <div class="review-card-wb-stars">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                          </div>
                          <p class="review-card-wb-text">
                            "${review.text}"
                          </p>

                          ${hasDetails ? `
                            <div class="review-card-wb-collapsible">
                              <div class="review-card-wb-collapsible-trigger" data-expanded="false">
                                <span>⚙️ Детали действия</span>
                                <span>▼</span>
                              </div>
                              <div class="review-card-wb-collapsible-content">
                                ${detailsHtml}
                              </div>
                            </div>
                          ` : ''}
                        </div>
                      </div>

                      <div class="review-card-wb-footer">
                        ${review.is_verified ? `
                          <div class="review-card-wb-verified">
                            ✓ Заказ проверен
                          </div>
                        ` : '<div></div>'}
                        
                        <div class="review-like-btn-heart ${isLiked ? 'liked' : ''}" data-review-id="${review.id}">
                          <svg viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          <span class="likes-count font-bold">${review.likes_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Пагинация -->
              ${reviewsTotalPages > 1 ? `
                <div class="flex justify-center gap-2 mt-6">
                  <button id="feedPrevPage" class="btn-secondary px-4 py-2 text-xs" ${reviewsPage <= 1 ? 'disabled' : ''}>
                    Назад
                  </button>
                  <span class="text-white/50 text-xs py-2">
                    Страница ${reviewsPage} из ${reviewsTotalPages}
                  </span>
                  <button id="feedNextPage" class="btn-secondary px-4 py-2 text-xs" ${reviewsPage >= reviewsTotalPages ? 'disabled' : ''}>
                    Вперёд
                  </button>
                </div>
              ` : ''}

              <!-- Плавающая кнопка Оставить отзыв -->
              ${(pendingActionsCount > 0 || isPartnerUser) ? `
                <div class="reviews-write-footer-sticky">
                  <button id="feedLeaveReviewBtn" class="reviews-write-floating-btn">
                    ✍️ Оставить отзыв
                  </button>
                </div>
              ` : ''}
            </div>
            ${renderFooter()}
          `;
        }

        async function openReviewActionModal(preselectedTargetId) {
          if (!userId) { window.requireAuth('Для написания отзыва необходимо войти.'); return; }

          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto page-enter';
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
                <div class="glass-card max-w-md w-full p-6 text-center space-y-4">
                  <span class="text-4xl">🎉</span>
                  <h3 class="text-white font-bold text-lg">Нет доступных действий</h3>
                  <p class="text-white/60 text-xs text-left">
                    Вы выполнили все доступные действия для написания отзывов! Новые действия появятся автоматически после доставки ваших заказов или участия в реферальной системе.
                  </p>
                  <button class="btn-primary w-full py-2.5 rounded-xl font-bold" id="closeReviewModalBtn">Отлично</button>
                </div>
              `;
              modal.querySelector('#closeReviewModalBtn').onclick = () => {
                modal.remove();
                clearBlobUrls('review:');
                renderCurrentScreen();
              };
              return;
            }

            if (actions.length >= 2) {
              modal.innerHTML = `
                <div class="glass-card max-w-md w-full p-6 space-y-4 text-left">
                  <div class="flex justify-between items-center">
                    <h3 class="text-white font-extrabold text-lg">Доступные действия</h3>
                    <button class="text-white/40 hover:text-white text-sm" id="closeReviewModalBtn">✕</button>
                  </div>
                  <p class="text-white/60 text-xs">У вас есть несколько доступных действий для отзыва. Выберите одно, чтобы продолжить:</p>
                  <div class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    ${actions.map(a => `
                      <div class="p-3 bg-white/5 border border-white/10 hover:border-cyan-500/50 rounded-xl cursor-pointer transition select-action-card" data-action-id="${a.id}">
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
              <div class="glass-card max-w-md w-full p-6 space-y-4 text-left">
                <div class="flex justify-between items-center">
                  <h3 class="text-white font-extrabold text-lg">Оставить отзыв</h3>
                  <button class="text-white/40 hover:text-white text-sm" id="backToActionsBtn">✕</button>
                </div>

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
                      <option value="partnership">Партнерство 🤝</option>
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
                  🚀 Отправить отзыв
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
                      submitBtn.innerText = '🚀 Отправить отзыв';
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
                    submitBtn.innerText = '🚀 Отправить отзыв';
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
                  photo_urls: photoUrls,
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
                submitBtn.innerText = '🚀 Отправить отзыв';
              }
            };
          };

          showState();
        }

        async function triggerDoubleTapLike(card, reviewId, x, y) {
          if (!userId) { window.requireAuth('Для взаимодействия с отзывами необходимо войти.'); return; }

          const heart = document.createElement('div');
          heart.className = 'double-tap-heart';
          heart.style.left = `${x}px`;
          heart.style.top = `${y}px`;
          heart.innerHTML = `
            <svg viewBox="0 0 24 24" class="w-full h-full">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
          card.appendChild(heart);
          setTimeout(() => heart.remove(), 800);

          if (window.likedReviewsCache && !window.likedReviewsCache.has(reviewId)) {
            await toggleReviewLike(card, reviewId);
          }
        }

        async function toggleReviewLike(card, reviewId) {
          if (!userId) { window.requireAuth('Для взаимодействия с отзывами необходимо войти.'); return; }
          
          window.likedReviewsCache = window.likedReviewsCache || new Set();
          const isLiked = window.likedReviewsCache.has(reviewId);
          
          const likeBtn = card.querySelector('.review-like-btn-heart');
          const countSpan = likeBtn.querySelector('.likes-count');
          let count = parseInt(countSpan.innerText) || 0;

          if (isLiked) {
            window.likedReviewsCache.delete(reviewId);
            likeBtn.classList.remove('liked');
            count = Math.max(0, count - 1);
          } else {
            window.likedReviewsCache.add(reviewId);
            likeBtn.classList.add('liked');
            count = count + 1;
          }
          countSpan.innerText = count;

          try {
            if (isLiked) {
              await supabaseClient.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', userId);
            } else {
              await supabaseClient.from('review_likes').insert({ review_id: reviewId, user_id: userId });
            }
          } catch (err) {
            console.error('Failed to sync like status:', err);
          }
        }

        async function toggleReviewPin(reviewId) {
          if (!isOwner) return;
          try {
            const { data, error } = await supabaseClient.from('reviews').select('is_pinned').eq('id', reviewId).single();
            if (error || !data) throw error || new Error('Review not found');

            const newPinned = !data.is_pinned;
            const { error: updateErr } = await supabaseClient.from('reviews').update({ is_pinned: newPinned }).eq('id', reviewId);
            if (updateErr) throw updateErr;
            if (window.adminCache && window.adminCache.reviews) {
              const r = window.adminCache.reviews.find(r => r.id === reviewId);
              if (r) r.is_pinned = newPinned;
            }
            tgUtil.haptic('success');
            renderAdminScreen(false);
          } catch (e) {
            console.error('Failed to toggle review pin status:', e);
            tgUtil.alert('Не удалось изменить статус закрепления: ' + e.message);
          }
        }

        function attachReviewsHandlers() {
          if (window.reviewsScreen === 'hub') {
            const tiles = document.querySelectorAll('.reviews-hub-tile-btn');
            tiles.forEach(tile => {
              tile.onclick = () => {
                const cat = tile.getAttribute('data-category');
                window.currentReviewsCategory = cat;
                window.currentReviewsCountry = 'all';
                window.reviewsScreen = 'feed';
                reviewsPage = 1;
                renderCurrentScreen();
              };
            });

            const alertBanner = document.getElementById('hubPendingActionsAlert');
            if (alertBanner) {
              alertBanner.onclick = () => {
                openReviewActionModal();
              };
            }

            const leaveBtn = document.getElementById('hubLeaveReviewBtn');
            if (leaveBtn) {
              leaveBtn.onclick = () => {
                openReviewActionModal();
              };
            }
          }

          if (window.reviewsScreen === 'feed') {
            const backBtn = document.getElementById('feedBackToHubBtn');
            if (backBtn) {
              backBtn.onclick = () => {
                window.reviewsScreen = 'hub';
                renderCurrentScreen();
              };
            }

            const catChips = document.querySelectorAll('#feedCategoryChips button');
            catChips.forEach(chip => {
              chip.onclick = () => {
                window.currentReviewsCategory = chip.getAttribute('data-category');
                window.currentReviewsCountry = 'all';
                reviewsPage = 1;
                renderCurrentScreen();
              };
            });

            const countryChips = document.querySelectorAll('#feedCountryChips button');
            countryChips.forEach(chip => {
              chip.onclick = () => {
                window.currentReviewsCountry = chip.getAttribute('data-country');
                reviewsPage = 1;
                renderCurrentScreen();
              };
            });

            const prevBtn = document.getElementById('feedPrevPage');
            const nextBtn = document.getElementById('feedNextPage');
            if (prevBtn) prevBtn.onclick = () => { if (reviewsPage > 1) { reviewsPage--; renderAdminScreen(true); } };
            if (nextBtn) nextBtn.onclick = () => { if (reviewsPage < reviewsTotalPages) { reviewsPage++; renderAdminScreen(true); } };

            const leaveBtn = document.getElementById('feedLeaveReviewBtn');
            if (leaveBtn) {
              leaveBtn.onclick = () => {
                openReviewActionModal();
              };
            }

            const collapsibleTriggers = document.querySelectorAll('.review-card-wb-collapsible-trigger');
            collapsibleTriggers.forEach(trig => {
              trig.onclick = (e) => {
                e.stopPropagation();
                const card = trig.closest('.review-card-wb');
                const content = card.querySelector('.review-card-wb-collapsible-content');
                const arrow = trig.querySelector('span:last-child');
                const isExpanded = trig.getAttribute('data-expanded') === 'true';

                if (isExpanded) {
                  content.classList.remove('expanded');
                  trig.setAttribute('data-expanded', 'false');
                  arrow.style.transform = 'rotate(0deg)';
                } else {
                  content.classList.add('expanded');
                  trig.setAttribute('data-expanded', 'true');
                  arrow.style.transform = 'rotate(180deg)';
                }
              };
            });

            const cards = document.querySelectorAll('.review-card-wb');
            cards.forEach(card => {
              const reviewId = card.getAttribute('data-review-id');
              let lastTap = 0;
              card.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 300 && tapLength > 0) {
                  e.preventDefault();
                  const touch = e.changedTouches[0];
                  const rect = card.getBoundingClientRect();
                  const x = touch.clientX - rect.left;
                  const y = touch.clientY - rect.top;
                  triggerDoubleTapLike(card, reviewId, x, y);
                }
                lastTap = currentTime;
              });

              card.addEventListener('dblclick', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                triggerDoubleTapLike(card, reviewId, x, y);
              });

              const likeBtn = card.querySelector('.review-like-btn-heart');
              if (likeBtn) {
                likeBtn.onclick = (e) => {
                  e.stopPropagation();
                  toggleReviewLike(card, reviewId);
                };
              }
            });
          }
        }


// Global Exports
if (typeof renderReports === 'function') window.renderReports = renderReports;
if (typeof attachReportsHandlers === 'function') window.attachReportsHandlers = attachReportsHandlers;
if (typeof openExternalLink === 'function') window.openExternalLink = openExternalLink;
if (typeof loadUserLikes === 'function') window.loadUserLikes = loadUserLikes;
if (typeof loadReviewsConfig === 'function') window.loadReviewsConfig = loadReviewsConfig;
if (typeof renderReviews === 'function') window.renderReviews = renderReviews;
if (typeof checkAndCreateDropshipperAction === 'function') window.checkAndCreateDropshipperAction = checkAndCreateDropshipperAction;
if (typeof renderReviewsHub === 'function') window.renderReviewsHub = renderReviewsHub;
if (typeof renderReviewsFeed === 'function') window.renderReviewsFeed = renderReviewsFeed;
if (typeof openReviewActionModal === 'function') window.openReviewActionModal = openReviewActionModal;
if (typeof triggerDoubleTapLike === 'function') window.triggerDoubleTapLike = triggerDoubleTapLike;
if (typeof toggleReviewLike === 'function') window.toggleReviewLike = toggleReviewLike;
if (typeof toggleReviewPin === 'function') window.toggleReviewPin = toggleReviewPin;
if (typeof attachReviewsHandlers === 'function') window.attachReviewsHandlers = attachReviewsHandlers;
