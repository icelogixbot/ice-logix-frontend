// ============================================================
// ICE LOGIX Module: Academy
// ============================================================
// ==================== РЕНДЕР АКАДЕМИИ ====================
async function renderAcademy() {
  try {
    // 1. Fetch courses and lessons (cached in CacheDB)
    let catalog = null;
    if (window.CacheDB) {
      catalog = await window.CacheDB.get('academy_catalog', async () => {
        const { data: courses } = await supabaseClient.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: true });
        if (!courses || courses.length === 0) return { courses: [], lessons: [] };
        const courseIds = courses.map(c => c.id);
        const { data: lessons } = await supabaseClient.from('lessons').select('*').in('course_id', courseIds).order('order_index', { ascending: true });
        return { courses, lessons: lessons || [] };
      }, 60000);
    } else {
      const { data: courses } = await supabaseClient.from('courses').select('*').eq('is_active', true).order('created_at', { ascending: true });
      if (!courses || courses.length === 0) catalog = { courses: [], lessons: [] };
      else {
        const courseIds = courses.map(c => c.id);
        const { data: lessons } = await supabaseClient.from('lessons').select('*').in('course_id', courseIds).order('order_index', { ascending: true });
        catalog = { courses, lessons: lessons || [] };
      }
    }

    const courses = catalog?.courses || [];
    const allLessonsData = catalog?.lessons || [];

    if (!courses || courses.length === 0) {
      return `
        <button id="backFromAcademyBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="text-center py-10">
          <p class="text-white/70">Курсы пока не добавлены</p>
          ${isOwner ? '<button id="addCourseBtn" class="btn-primary mt-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить курс</button>' : ''}
        </div>
        ${renderFooter()}
      `;
    }

    let userProgress = {};
    let userCourseIds = new Set();
    let userCoursePurchases = {};
    if (userId) {
      try {
        const [progRes, ucRes] = await Promise.all([
          supabaseClient.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', userId),
          supabaseClient.from('user_courses').select('course_id, purchased_at').eq('user_id', userId)
        ]);
        (progRes?.data || []).forEach(p => { if (p.is_completed) userProgress[p.lesson_id] = true; });
        (ucRes?.data || []).forEach(uc => { userCourseIds.add(uc.course_id); userCoursePurchases[uc.course_id] = uc.purchased_at; });
      } catch(e) {}
    }

    const lessonsByCourse = {};
    (allLessonsData || []).forEach(l => {
      if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
      lessonsByCourse[l.course_id].push(l);
    });

    const coursesWithLessons = courses.map(course => {
      const ls = lessonsByCourse[course.id] || [];
      const completedCount = ls.filter(l => userProgress[l.id]).length;
      const totalCount = ls.length;
      const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      const isPurchased = course.price_ice === 0 || userCourseIds.has(course.id);
      const allCompleted = totalCount > 0 && completedCount === totalCount;
      return { ...course, lessons: ls, progress, isPurchased, allCompleted, purchasedAt: userCoursePurchases[course.id] || null };
    });

    const ctIcon = t => ({ video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[t] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>');

    const lessonStatus = (lesson, course) => {
      if (userProgress[lesson.id]) return '<span class="text-green-400 text-xs"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Пройдено</span>';
      if (!course.isPurchased && course.price_ice > 0) return '<span class="text-white/30 text-xs"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Требует покупки</span>';
      if (lesson.is_locked) return '<span class="text-yellow-400 text-xs"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Заблокировано</span>';
      if (lesson.unlock_delay_hours > 0 && course.purchasedAt) {
        const unlock = new Date(course.purchasedAt).getTime() + lesson.unlock_delay_hours * 3600000;
        if (Date.now() < unlock) {
          const h = Math.ceil((unlock - Date.now()) / 3600000);
          return `<span class="text-orange-400 text-xs"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Через ${h}ч</span>`;
        }
      }
      return '<span class="text-cyan-400 text-xs">▶ Начать</span>';
    };

    const lessonAccessible = (lesson, course) => {
      if (!course.isPurchased && course.price_ice > 0) return false;
      if (lesson.is_locked) return false;
      if (lesson.unlock_delay_hours > 0 && course.purchasedAt) {
        const unlock = new Date(course.purchasedAt).getTime() + lesson.unlock_delay_hours * 3600000;
        if (Date.now() < unlock) return false;
      }
      return true;
    };

    return `
      <div class="space-y-4">
        <button id="backFromAcademyBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        ${isOwner ? '<button id="addCourseBtn" class="global-back-btn mb-2"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить курс</button>' : ''}
        ${coursesWithLessons.map(course => `
          <div class="course-card glass-card" data-course-id="${course.id}" data-is-purchased="${course.isPurchased}" data-price-ice="${course.price_ice}">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-white font-bold text-lg">${course.title}</h3>
                <p class="text-white/60 text-sm mt-0.5">${course.description || ''}</p>
                <div class="mt-2 flex items-center gap-2">
                  <div class="btn-secondary flex-1 h-1.5 overflow-hidden">
                    <div class="h-full bg-cyan-400 rounded-full" style="width:${course.progress}%"></div>
                  </div>
                  <span class="text-white/50 text-xs flex-shrink-0">${course.progress}% · ${course.lessons.filter(l => userProgress[l.id]).length}/${course.lessons.length}</span>
                </div>
              </div>
              <div class="ml-3 text-right flex-shrink-0">
                <span class="text-cyan-400 font-bold text-sm">${course.price_ice > 0 ? course.price_ice + ' <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span>' : 'Бесплатно'}</span>
                ${course.isPurchased && course.price_ice > 0 ? '<p class="text-green-400 text-xs mt-1"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Куплено</p>' : ''}
              </div>
            </div>
            ${!course.isPurchased && course.price_ice > 0 ? `<button class="buyCourseBtn mt-3 w-full bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 rounded-xl font-bold text-sm" data-course-id="${course.id}" data-price="${course.price_ice}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></span> Купить за ${course.price_ice} <span class="brand-flake" aria-hidden="true"><img src="./assets/icl_currency_icon.png" alt="ICL" class="w-full h-full object-contain"></span></button>` : ''}
            ${course.allCompleted && course.lessons.length > 0 ? `<button class="getCertBtn mt-2 w-full bg-gradient-to-r from-yellow-400 to-orange-500 py-2.5 rounded-xl font-bold text-sm text-slate-900" data-course-id="${course.id}" data-title="${course.title.replace(/"/g,'&quot;')}"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47 1-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47 1 .97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></span> Получить сертификат</button>` : ''}
            <div class="lessons-container hidden mt-3 space-y-1.5" data-course="${course.id}" data-loaded="true">
              ${course.lessons.length === 0
                ? '<p class="text-white/40 text-sm text-center py-3">В этом курсе пока нет уроков</p>'
                : course.lessons.map(lesson => {
                    const accessible = lessonAccessible(lesson, course);
                    const typeLabel = { video: 'Видео', quiz: 'Тест', file: 'Файл', text: 'Текст' }[lesson.content_type] || 'Текст';
                    return `<div class="lesson-item bg-white/5 rounded-xl p-3 transition ${accessible ? 'cursor-pointer hover:bg-white/10' : 'opacity-50'}" data-lesson-id="${lesson.id}" data-course-id="${course.id}" data-accessible="${accessible}">
                      <div class="flex justify-between items-center gap-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <span class="text-lg flex-shrink-0">${ctIcon(lesson.content_type || 'text')}</span>
                          <div class="min-w-0">
                            <p class="text-white text-sm font-medium truncate">${lesson.title || 'Без названия'}</p>
                            <p class="text-white/40 text-xs">${typeLabel}</p>
                          </div>
                        </div>
                        ${lessonStatus(lesson, course)}
                      </div>
                    </div>`;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) {
    console.error('renderAcademy:', err);
    return '<p class="text-center mt-10 text-red-400">Ошибка загрузки курсов</p>';
  }
}

    function attachAcademyHandlers() {
      const backBtn = document.getElementById('backFromAcademyBtn');
      if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));

      // ── completeLesson ──────────────────────────────────────────────
      async function completeLesson(lessonId, courseId) {
        if (!userId) return;
        try {
          await supabaseClient.from('user_lessons_progress').upsert(
            { user_id: userId, lesson_id: lessonId, is_completed: true, completed_at: new Date().toISOString() },
            { onConflict: 'user_id,lesson_id' }
          );
          // Update badge in DOM
          const lessonEl = document.querySelector(`.lesson-item[data-lesson-id="${lessonId}"]`);
          if (lessonEl) {
            const badge = lessonEl.querySelector('span:last-child');
            if (badge) { badge.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Пройдено'; badge.className = 'text-green-400 text-xs'; }
          }
          // Recalculate course progress
          const { data: ls } = await supabaseClient.from('lessons').select('id').eq('course_id', courseId);
          const { data: pr } = await supabaseClient.from('user_lessons_progress').select('lesson_id').eq('user_id', userId).eq('is_completed', true);
          const doneIds = new Set(pr?.map(p => p.lesson_id) || []);
          const total = ls?.length || 0;
          const done = ls?.filter(l => doneIds.has(l.id)).length || 0;
          const pct = total > 0 ? Math.round(done / total * 100) : 0;
          const card = document.querySelector(`[data-course-id="${courseId}"]`);
          if (card) {
            const bar = card.querySelector('.h-full.bg-cyan-400');
            if (bar) bar.style.width = pct + '%';
            const pctTxt = card.querySelector('.text-white\\/50.text-xs.flex-shrink-0');
            if (pctTxt) pctTxt.textContent = `${pct}% · ${done}/${total}`;
            if (done === total && total > 0 && !card.querySelector('.getCertBtn')) {
              const title = card.querySelector('h3')?.textContent || '';
              const certBtn = document.createElement('button');
              certBtn.className = 'getCertBtn mt-2 w-full bg-gradient-to-r from-yellow-400 to-orange-500 py-2.5 rounded-xl font-bold text-sm text-slate-900';
              certBtn.dataset.courseId = courseId;
              certBtn.dataset.title = title;
              certBtn.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Получить статус "Проверенный партнер"';
              certBtn.onclick = () => handleGetCert(courseId, title);
              card.querySelector('.lessons-container')?.before(certBtn);
            }
          }
        } catch(e) { console.error('completeLesson:', e); }
      }

      // ── showLessonModal ─────────────────────────────────────────────
      function showLessonModal(data, courseId) {
        let contentHtml = '';
        if (data.content_type === 'text') {
          contentHtml = `
            <div class="text-white/90 leading-relaxed text-sm space-y-3" style="user-select:none;-webkit-user-select:none">${data.content}</div>
            <p class="text-white/10 text-xs text-right mt-3">© ICE LOGIX · ${userId}</p>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Отметить как пройденное</button>`;
        } else if (data.content_type === 'video') {
          contentHtml = `
            <div class="relative">
              <video id="lessonVideo" src="${data.content}" class="w-full rounded-xl" controls controlsList="nodownload" oncontextmenu="return false"></video>
              <div class="absolute bottom-10 right-2 text-white/20 text-xs pointer-events-none select-none">ID:${userId}</div>
            </div>
            <p class="text-white/40 text-xs mt-1 text-center"><span class="ix ix-warning"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg></span> Только для личного использования · ID: ${userId}</p>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Отметить как пройденное</button>`;
        } else if (data.content_type === 'quiz') {
          try {
            const quiz = JSON.parse(data.content);
            const threshold = quiz.pass_threshold || 70;
            contentHtml = `
              <div id="quizForm" class="space-y-4">
                ${quiz.questions.map((q, qi) => `
                  <div class="bg-white/5 rounded-xl p-3">
                    <p class="text-white text-sm font-medium mb-2">${qi + 1}. ${q.text}</p>
                    ${q.options.map((opt, oi) => `
                      <label class="flex items-center gap-2 mb-1.5 cursor-pointer">
                        <input type="radio" name="q${qi}" value="${oi}" class="accent-cyan-400">
                        <span class="text-white/80 text-sm">${opt}</span>
                      </label>`).join('')}
                  </div>`).join('')}
              </div>
              <div id="quizResult" class="hidden mt-3 p-3 rounded-xl text-center"></div>
              <button id="checkQuizBtn" class="btn-primary mt-4 w-full"
                data-questions='${JSON.stringify(quiz.questions).replace(/'/g,"&#39;")}'
                data-threshold="${threshold}" data-lid="${data.id}" data-cid="${courseId}">Проверить ответы</button>`;
          } catch { contentHtml = '<p class="text-red-400">Ошибка формата теста</p>'; }
        } else {
          contentHtml = `
            <div class="text-center py-6">
              <p class="text-5xl mb-4"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></p>
              <p class="text-white font-bold mb-4">${data.title}</p>
              <button id="openFileBtn" class="btn-primary" data-url="${data.content}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg></span> Открыть материал</button>
            </div>
            <button class="markDoneBtn mt-4 w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-xl font-bold" data-lid="${data.id}" data-cid="${courseId}"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Отметить как пройденное</button>`;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
          <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-white font-bold text-lg flex-1 mr-3">${data.title}</h3>
              <button class="closeLessonModal text-white/50 hover:text-white text-2xl flex-shrink-0 leading-none">&times;</button>
            </div>
            ${contentHtml}
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('.closeLessonModal').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

        // video ended → auto-complete
        const vid = modal.querySelector('#lessonVideo');
        if (vid) vid.addEventListener('ended', async () => { await completeLesson(data.id, courseId); tgUtil.alert('✅ Урок пройден!'); });

        // mark done
        modal.querySelectorAll('.markDoneBtn').forEach(btn => {
          btn.onclick = async () => {
            await completeLesson(btn.dataset.lid, btn.dataset.cid);
            btn.innerHTML = '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Пройдено!'; btn.disabled = true;
            btn.className = btn.className.replace('bg-green-600', 'bg-green-900') + ' cursor-not-allowed opacity-60';
          };
        });

        // file open
        const fileBtn = modal.querySelector('#openFileBtn');
        if (fileBtn) fileBtn.onclick = () => { tgUtil.alert('Документ защищён водяным знаком. Не распространяйте.'); window.open(fileBtn.dataset.url, '_blank'); };

        // quiz check
        const checkBtn = modal.querySelector('#checkQuizBtn');
        if (checkBtn) {
          checkBtn.onclick = async () => {
            const questions = JSON.parse(checkBtn.dataset.questions);
            const threshold = parseInt(checkBtn.dataset.threshold);
            
            // Check all questions answered
            let allAnswered = true;
            questions.forEach((q, qi) => {
              const sel = modal.querySelector(`input[name="q${qi}"]:checked`);
              const qBlock = modal.querySelectorAll('#quizForm > div')[qi];
              if (!sel) {
                allAnswered = false;
                if (qBlock) { qBlock.classList.add('border', 'border-red-500/50'); qBlock.style.animation = 'shake 0.3s'; }
              } else {
                if (qBlock) qBlock.classList.remove('border', 'border-red-500/50');
              }
            });
            if (!allAnswered) {
              glassToast('Ответьте на все вопросы', { kind: 'warning' });
              return;
            }

            let correct = 0;
            questions.forEach((q, qi) => {
              const sel = modal.querySelector(`input[name="q${qi}"]:checked`);
              const qBlock = modal.querySelectorAll('#quizForm > div')[qi];
              const isCorrect = sel && parseInt(sel.value) === q.correct;
              if (isCorrect) {
                correct++;
                if (qBlock) { qBlock.classList.remove('border-red-500/50'); qBlock.classList.add('border', 'border-green-500/50'); }
              } else {
                if (qBlock) { qBlock.classList.remove('border-green-500/50'); qBlock.classList.add('border', 'border-red-500/50'); }
              }
            });
            const score = Math.round(correct / questions.length * 100);
            const resultDiv = modal.querySelector('#quizResult');
            resultDiv.classList.remove('hidden');
            if (score >= threshold) {
              resultDiv.className = 'mt-3 p-3 rounded-xl text-center bg-green-500/20 border border-green-500/50';
              resultDiv.innerHTML = `<p class="text-green-400 font-bold"><span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.8 11.3 2.9 7.1L21 8M9 16l-3 3-3-3M9 8l3-3 3 3"/><circle cx="12" cy="12" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/></svg></span> Тест пройден! ${correct}/${questions.length} (${score}%)</p>`;
              await completeLesson(checkBtn.dataset.lid, checkBtn.dataset.cid);
              checkBtn.remove();
            } else {
              resultDiv.className = 'mt-3 p-3 rounded-xl text-center bg-red-500/20 border border-red-500/50';
              resultDiv.innerHTML = `<p class="text-red-400 font-bold"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> ${correct}/${questions.length} (${score}%). Нужно ${threshold}%+</p><p class="text-white/50 text-xs mt-1">Попробуйте ещё раз</p>`;
            }
          };
        }
      }



      // ── handleGetCert ───────────────────────────────────────────────
      async function handleGetCert(courseId, courseTitle) {
        try {
          tgUtil.alert('Подтверждаем статус...');
          await supabaseClient.from('users').update({ is_trusted: true }).eq('user_id', userId);
          userLimits.isTrusted = true;
          tgUtil.alert(`Поздравляем! Статус "Проверенный партнер" успешно получен! 🎉`);
          renderCurrentScreen();
        } catch(e) { tgUtil.alert('Ошибка: ' + e.message); }
      }

      // ── addCourse (owner) ───────────────────────────────────────────
      const addBtn = document.getElementById('addCourseBtn');
      if (addBtn && isOwner) addBtn.onclick = () => openCourseForm(null);

      // ── buyCourseBtn ────────────────────────────────────────────────
      document.querySelectorAll('.buyCourseBtn').forEach(btn => {
        btn.onclick = async () => {
          const courseId = btn.dataset.courseId;
          const price = parseInt(btn.dataset.price);
          if (!userId) { tgUtil.alert('Авторизуйтесь'); return; }
          if (balance < price) { tgUtil.alert('Недостаточно средств'); return; }
          try {
            const { error: e1 } = await supabaseClient.from('users').update({ ices_balance: balance - price }).eq('user_id', userId);
            if (e1) throw e1;
            await supabaseClient.from('user_courses').upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
            balance -= price;
            document.getElementById('headerBalance').innerText = balance;
            tgUtil.alert('✅ Курс куплен! Приятного обучения!');
            renderCurrentScreen();
          } catch (err) { tgUtil.alert('Ошибка: ' + err.message); }
        };
      });


      // ── getCertBtn ──────────────────────────────────────────────────
      document.querySelectorAll('.getCertBtn').forEach(btn => {
        btn.onclick = () => handleGetCert(btn.dataset.courseId, btn.dataset.title);
      });

      // ── helpers for lesson items ────────────────────────────────────
      const lessonItemHtml = (lesson, courseId, isPurchased, priceIce) => {
        const accessible = (isPurchased || priceIce === 0) && !lesson.is_locked;
        const ctIcon = { video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[lesson.content_type] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>';
        const ctLabel = { video: 'Видео', quiz: 'Тест', file: 'Файл' }[lesson.content_type] || 'Текст';
        return `<div class="lesson-item bg-white/5 rounded-xl p-3 transition ${accessible ? 'cursor-pointer hover:bg-white/10' : 'opacity-50'}"
          data-lesson-id="${lesson.id}" data-course-id="${courseId}" data-accessible="${accessible}">
          <div class="flex justify-between items-center gap-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <span class="text-lg flex-shrink-0">${ctIcon}</span>
              <div class="min-w-0">
                <p class="text-white text-sm font-medium truncate">${lesson.title || 'Без названия'}</p>
                <p class="text-white/40 text-xs">${ctLabel}</p>
              </div>
            </div>
            <span class="text-cyan-400 text-xs">▶ Начать</span>
          </div>
        </div>`;
      };

      const attachLessonItemHandlers = (container) => {
        container.querySelectorAll('.lesson-item').forEach(item => {
          item.onclick = async (e) => {
            e.stopPropagation(); // prevent card click from toggling the container
            if (item.dataset.accessible === 'false') return;
            try {
              const { data, error } = await supabaseClient.from('lessons').select('*').eq('id', item.dataset.lessonId).single();
              if (error) throw error;
              showLessonModal(data, item.dataset.courseId);
            } catch(e) { tgUtil.alert('Ошибка загрузки урока: ' + e.message); }
          };
        });
      };

      // Attach handlers to pre-rendered lesson items
      document.querySelectorAll('.lessons-container').forEach(container => {
        attachLessonItemHandlers(container);
      });

      // ── toggle lessons list (with lazy reload) ──────────────────────
      document.querySelectorAll('.course-card').forEach(card => {
        card.onclick = async (e) => {
          if (e.target.closest('button')) return;
          if (e.target.closest('.lesson-item')) return; // handled by lesson item handler
          const container = card.querySelector('.lessons-container');
          if (!container) return;

          // If lessons are not yet loaded (or reload forced), fetch them
          if (!container.dataset.loaded) {
            container.innerHTML = '<p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка уроков...</p>';
            container.classList.remove('hidden');
            const courseId = card.dataset.courseId;
            const isPurchased = card.dataset.isPurchased === 'true';
            const priceIce = parseInt(card.dataset.priceIce) || 0;
            try {
              const { data: lessons, error } = await supabaseClient
                .from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
              if (error) throw error;
              if (!lessons || lessons.length === 0) {
                container.innerHTML = '<p class="text-white/40 text-sm text-center py-3">В этом курсе пока нет уроков</p>';
              } else {
                container.innerHTML = lessons.map(l => lessonItemHtml(l, courseId, isPurchased, priceIce)).join('');
                attachLessonItemHandlers(container);
              }
              container.dataset.loaded = 'true';
            } catch(err) {
              container.innerHTML = '<p class="text-red-400 text-xs text-center py-3">Ошибка загрузки уроков</p>';
            }
            return;
          }
          container.classList.toggle('hidden');
        };
      });
    }


    // ==================== ГЛОБАЛЬНЫЕ МОДАЛЫ КУРСОВ ====================
    function openCourseForm(course = null) {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <h3 class="text-white font-bold text-lg mb-4">${course ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Редактировать курс' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новый курс'}</h3>
          <label class="text-white/60 text-xs">Название</label>
          <input id="mCourseTitle" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="Название курса" value="${course?.title || ''}">
          <label class="text-white/60 text-xs">Описание</label>
          <textarea id="mCourseDesc" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" rows="2" placeholder="Описание">${course?.description || ''}</textarea>
          <label class="text-white/60 text-xs">Цена (айсы, 0 = бесплатно)</label>
          <input type="number" id="mCoursePrice" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" value="${course?.price_ice ?? 0}">
          <label class="text-white/60 text-xs">Доступ для</label>
          <select id="mCourseAccess" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3">
            <option value="all" ${course?.role_access === 'all' || !course ? 'selected' : ''}>Все</option>
            <option value="client" ${course?.role_access === 'client' ? 'selected' : ''}>Клиенты</option>
            <option value="dropshipper" ${course?.role_access === 'dropshipper' ? 'selected' : ''}>Дропшипперы</option>
          </select>
          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" id="mCourseActive" ${course?.is_active !== false ? 'checked' : ''}>
            <label for="mCourseActive" class="text-white/70 text-sm">Активен</label>
          </div>
          <div class="flex gap-3">
            <button id="mCourseSave" class="btn-primary flex-1">Сохранить</button>
            <button id="mCourseCancel" class="btn-secondary flex-1">Отмена</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('#mCourseCancel').onclick = () => modal.remove();
      modal.querySelector('#mCourseSave').onclick = async () => {
        const title = modal.querySelector('#mCourseTitle').value.trim();
        const description = modal.querySelector('#mCourseDesc').value.trim();
        const price_ice = parseInt(modal.querySelector('#mCoursePrice').value) || 0;
        const role_access = modal.querySelector('#mCourseAccess').value;
        const is_active = modal.querySelector('#mCourseActive').checked;
        if (!title) { tgUtil.alert('Введите название'); return; }
        try {
          if (course) {
            await supabaseClient.from('courses').update({ title, description, price_ice, role_access, is_active }).eq('id', course.id);
          } else {
            await supabaseClient.from('courses').insert({ title, description, price_ice, role_access, is_active });
          }
          modal.remove();
          renderCurrentScreen();
        } catch(e) { tgUtil.alert('Ошибка: ' + e.message); }
      };
    }

    async function manageLessonsModal(courseId) {
      const ctIcon  = t => ({ video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>' }[t] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>');
      const ctLabel = t => ({ video: 'Видео', quiz: 'Тест', file: 'Файл' }[t] || 'Текст');

      const { data: course } = await supabaseClient.from('courses').select('title').eq('id', courseId).single();

      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start mb-1">
            <div>
              <h3 class="text-white font-bold text-lg"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span> Уроки курса</h3>
              <p class="text-cyan-400 text-sm">${course?.title || ''}</p>
            </div>
            <button class="closeMgr text-white/50 hover:text-white text-2xl flex-shrink-0 ml-3">&times;</button>
          </div>
          <div class="flex gap-2 my-4">
            <button id="addLessonBtn" class="btn-primary flex-1"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Добавить урок</button>
            <button id="refreshLessonsBtn" class="btn-secondary" title="Обновить список"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span></button>
          </div>
          <div class="space-y-2" id="lessonsMgrList">
            <p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка...</p>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.closeMgr').onclick = () => modal.remove();

      const listEl = modal.querySelector('#lessonsMgrList');

      // ── render one lesson row ────────────────────────────────────────
      const lessonRowHtml = l => `
        <div class="flex items-center gap-2 p-2.5 bg-white/5 rounded-xl">
          <span class="text-xl flex-shrink-0">${ctIcon(l.content_type)}</span>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm font-medium truncate">${l.title}</p>
            <p class="text-white/40 text-xs">#${l.order_index} · ${ctLabel(l.content_type)} · ${l.is_locked ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> Заблокировано' : '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span> Открыто'}${l.unlock_delay_hours > 0 ? ' · <span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> ' + l.unlock_delay_hours + 'ч' : ''}</p>
          </div>
          <button class="btn-secondary previewLessonBtn bg-white/10 hover:" data-lid="${l.id}" title="Предпросмотр"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span></button>
          <button class="btn-secondary editLessonBtn" data-lid="${l.id}"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="deleteLessonBtn bg-red-600/60 hover:bg-red-600/80 px-2 py-1 rounded text-xs" data-lid="${l.id}"><span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></span></button>
        </div>`;

      // ── attach handlers to current list items ────────────────────────
      const attachListHandlers = () => {
        listEl.querySelectorAll('.previewLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            const { data: l } = await supabaseClient.from('lessons').select('*').eq('id', btn.dataset.lid).single();
            if (l) previewLessonAdmin(l);
          };
        });
        listEl.querySelectorAll('.editLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            const { data: l } = await supabaseClient.from('lessons').select('*').eq('id', btn.dataset.lid).single();
            // Open lesson form ON TOP of this modal (z-[70] > z-[60]); modal stays open
            if (l) openLessonForm(courseId, l, l.order_index, refreshList);
          };
        });
        listEl.querySelectorAll('.deleteLessonBtn').forEach(btn => {
          btn.onclick = async () => {
            if (!(await tgUtil.confirm('Удалить урок? Прогресс пользователей тоже будет удалён.'))) return;
            tgUtil.haptic('warning');
            const { error } = await supabaseClient.from('lessons').delete().eq('id', btn.dataset.lid);
            if (error) { tgUtil.alert('Ошибка удаления: ' + error.message); return; }
            await refreshList();
          };
        });
      };

      // ── re-fetch and re-render the lessons list in place ─────────────
      const refreshList = async () => {
        listEl.innerHTML = '<p class="text-white/40 text-xs text-center py-3"><span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Загрузка...</p>';
        const { data: freshLessons, error } = await supabaseClient
          .from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true });
        if (error) { listEl.innerHTML = `<p class="text-red-400 text-xs text-center py-3">Ошибка: ${error.message}</p>`; return; }
        const freshLs = freshLessons || [];
        const nextIdx = freshLs.length > 0 ? Math.max(...freshLs.map(l => l.order_index ?? 0)) + 1 : 1;
        // Keep the add button's nextIdx up to date
        modal.querySelector('#addLessonBtn').onclick = () => openLessonForm(courseId, null, nextIdx, refreshList);
        if (freshLs.length === 0) {
          listEl.innerHTML = '<p class="text-white/40 text-sm text-center py-4">В этом курсе пока нет уроков. Добавьте первый!</p>';
        } else {
          listEl.innerHTML = freshLs.map(lessonRowHtml).join('');
          attachListHandlers();
        }
      };

      // Initial load
      await refreshList();
      modal.querySelector('#refreshLessonsBtn').onclick = refreshList;
    }

    function openLessonForm(courseId, lesson = null, defaultOrderIndex = 0, onSave = null) {
      const contentPlaceholders = {
        text: 'Введите текст урока (поддерживается HTML)',
        video: 'https://example.com/video.mp4',
        quiz: '{"questions":[{"text":"Вопрос?","options":["A","B","C"],"correct":0}],"pass_threshold":70}',
        file: 'https://example.com/document.pdf'
      };
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
          <h3 class="text-white font-bold text-lg mb-1">${lesson ? '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> Редактировать урок' : '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span> Новый урок'}</h3>
          <p class="text-white/40 text-xs mb-4">course_id: ${courseId}</p>

          <label class="text-white/60 text-xs">Название <span class="text-red-400">*</span></label>
          <input id="mLessonTitle" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3" placeholder="Название урока" value="${lesson?.title || ''}">

          <label class="text-white/60 text-xs">Тип контента</label>
          <select id="mLessonType" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3">
            <option value="text" ${!lesson || lesson.content_type === 'text' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> Текст / HTML</option>
            <option value="video" ${lesson?.content_type === 'video' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> Видео (URL)</option>
            <option value="quiz" ${lesson?.content_type === 'quiz' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> Тест (JSON)</option>
            <option value="file" ${lesson?.content_type === 'file' ? 'selected' : ''}><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span> Файл (URL)</option>
          </select>

          <label class="text-white/60 text-xs">Контент <span class="text-red-400">*</span></label>
          <p id="mContentHint" class="text-white/30 text-xs mt-0.5 mb-1"></p>
          <textarea id="mLessonContent" class="btn-secondary w-full mt-1 p-3 rounded-xl border border-white/30 mb-3 font-mono text-sm" rows="5"
            placeholder="${contentPlaceholders[lesson?.content_type || 'text']}">${lesson?.content || ''}</textarea>

          <div class="flex gap-3 mb-3">
            <div class="flex-1">
              <label class="text-white/60 text-xs">Порядок (#)</label>
              <input type="number" id="mLessonOrder" class="btn-secondary w-full mt-1 p-2 rounded-xl border border-white/30" value="${lesson?.order_index ?? defaultOrderIndex}" min="0">
            </div>
            <div class="flex-1" id="mDelayRow" style="${lesson?.is_locked || lesson?.unlock_delay_hours > 0 ? '' : 'opacity:0.4'}">
              <label class="text-white/60 text-xs">Задержка (часы)</label>
              <input type="number" id="mLessonDelay" class="btn-secondary w-full mt-1 p-2 rounded-xl border border-white/30" value="${lesson?.unlock_delay_hours ?? 0}" min="0">
            </div>
          </div>

          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" id="mLessonLocked" ${lesson?.is_locked ? 'checked' : ''}>
            <label for="mLessonLocked" class="text-white/70 text-sm">Заблокирован вручную (или дрип-контент)</label>
          </div>

          <div class="flex gap-3">
            <button id="mLessonSave" class="btn-primary flex-1">Сохранить</button>
            <button id="mLessonCancel" class="btn-secondary flex-1">Отмена</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // Dynamic content placeholder based on type
      const typeSelect = modal.querySelector('#mLessonType');
      const contentArea = modal.querySelector('#mLessonContent');
      const hintEl = modal.querySelector('#mContentHint');
      const hints = {
        text: 'HTML-контент урока',
        video: 'Прямая ссылка на видео (.mp4) или YouTube',
        quiz: 'JSON: { questions:[{text,options:[],correct:0}], pass_threshold:70 }',
        file: 'Прямая ссылка на файл (PDF, ZIP…)'
      };
      const updateHint = () => {
        hintEl.textContent = hints[typeSelect.value] || '';
        contentArea.placeholder = contentPlaceholders[typeSelect.value] || '';
      };
      updateHint();
      typeSelect.addEventListener('change', updateHint);

      // Toggle delay row visibility with is_locked
      const lockedCheck = modal.querySelector('#mLessonLocked');
      const delayRow = modal.querySelector('#mDelayRow');
      lockedCheck.addEventListener('change', () => {
        delayRow.style.opacity = lockedCheck.checked ? '1' : '0.4';
      });

      modal.querySelector('#mLessonCancel').onclick = () => modal.remove();
      modal.querySelector('#mLessonSave').onclick = async () => {
        const title = modal.querySelector('#mLessonTitle').value.trim();
        const content_type = typeSelect.value;
        const content = contentArea.value.trim();
        const order_index = parseInt(modal.querySelector('#mLessonOrder').value) || 0;
        const unlock_delay_hours = lockedCheck.checked ? (parseInt(modal.querySelector('#mLessonDelay').value) || 0) : 0;
        const is_locked = lockedCheck.checked;
        if (!title) { tgUtil.alert('Введите название урока'); return; }
        if (!content) { tgUtil.alert('Заполните поле «Контент»'); return; }
        const saveBtn = modal.querySelector('#mLessonSave');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="ix ix-mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span> Сохранение...';
        try {
          const payload = {
            course_id: courseId,
            title,
            content_type,
            content,
            order_index,
            is_locked,
            unlock_delay_hours
          };
          let error;
          if (lesson) {
            ({ error } = await supabaseClient.from('lessons').update(payload).eq('id', lesson.id));
          } else {
            ({ error } = await supabaseClient.from('lessons').insert(payload));
          }
          if (error) throw new Error(error.message);
          tgUtil.alert('✅ Урок сохранён');
          modal.remove();
          if (onSave) await onSave(); else renderCurrentScreen();
        } catch(e) {
          tgUtil.alert('<span class="ix ix-error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></span> Ошибка сохранения: ' + e.message);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Сохранить';
        }
      };
    }

    function previewLessonAdmin(lesson) {
      const ctLabels = { video: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span> Видео', quiz: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span> Тест', file: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span> Файл', text: '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span> Текст' };
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4';
      let contentHtml = '';
      if (lesson.content_type === 'video') {
        contentHtml = `<video src="${lesson.content}" class="w-full rounded-xl" controls></video>`;
      } else if (lesson.content_type === 'file') {
        contentHtml = `<div class="text-center py-4"><p class="text-4xl mb-3"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span></p><a href="${lesson.content}" target="_blank" class="text-cyan-400 underline break-all">${lesson.content}</a></div>`;
      } else if (lesson.content_type === 'quiz') {
        try {
          const quiz = JSON.parse(lesson.content);
          contentHtml = `<div class="space-y-3">${quiz.questions.map((q, i) => `
            <div class="bg-white/5 rounded-xl p-3">
              <p class="text-white text-sm font-medium mb-2">${i + 1}. ${q.text}</p>
              ${q.options.map((o, oi) => `<p class="text-sm ${oi === q.correct ? 'text-green-400 font-bold' : 'text-white/60'}">  ${oi === q.correct ? '<span class="ix ix-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></span>' : '○'} ${o}</p>`).join('')}
            </div>`).join('')}<p class="text-white/40 text-xs">Порог: ${quiz.pass_threshold || 70}%</p></div>`;
        } catch { contentHtml = `<pre class="text-white/70 text-xs whitespace-pre-wrap break-all">${lesson.content}</pre>`; }
      } else {
        contentHtml = `<div class="text-white/90 text-sm leading-relaxed">${lesson.content}</div>`;
      }
      modal.innerHTML = `
        <div class="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white/40 text-xs">${ctLabels[lesson.content_type] || '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>'} · Предпросмотр</p>
              <h3 class="text-white font-bold text-lg">${lesson.title}</h3>
            </div>
            <button class="closePreview text-white/50 hover:text-white text-2xl flex-shrink-0 ml-3">&times;</button>
          </div>
          <div class="border-t border-white/10 pt-4">${contentHtml}</div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.closePreview').onclick = () => modal.remove();
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    async function renderWishlist() {
  if (!userId) return '<p class="text-center mt-10 text-white/70">Авторизуйтесь</p>';
  try {
    const { data: wishlistItems, error } = await supabaseClient.from('wishlist').select('product_id, products(*)').eq('user_id', userId);
    if (error) throw error;
    if (!wishlistItems || wishlistItems.length === 0) {
      return `
        <button id="backFromWishlistBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
        <div class="flex-1"><p class="text-center mt-10 text-white/70">У вас пока нет избранных товаров</p></div>
        ${renderFooter()}
      `;
    }
    return `
      <button id="backFromWishlistBtn" class="global-back-btn"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад</button>
      <div class="grid grid-cols-2 gap-4">
        ${wishlistItems.map(item => {
          let p = item.products;
          if (!p) return '';
          p = preprocessProducts([p])[0];
          return `
            <div class="product-card" data-product-id="${p.id}">
              <div class="aspect-square bg-white/10 flex items-center justify-center relative">
                <img src="${getProductImages(p.image_url)[0] || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover">
                <span class="absolute top-0 right-0 wishlist-heart text-red-500 z-20" data-product-id="${p.id}">${getHeartIcon(true)}</span>
              </div>
              <div class="p-2">
                <p class="text-white font-bold text-sm truncate">${p.title}</p>
                <p class="text-cyan-400 text-xs">${p.price} ${p.currency}</p>
                <div class="flex gap-1 mt-2">
                  <button class="btn-primary addToCartBtn flex-1" data-product-id="${p.id}">Корзина</button>
                  <button class="buyNowBtn flex-1" data-url="${p.url}" data-price="${p.price}">Заказать</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${renderFooter()}
    `;
  } catch (err) { return '<p class="text-center mt-10 text-red-400">Ошибка загрузки избранного</p>'; }
}

function attachWishlistHandlers() {
  const backBtn = document.getElementById('backFromWishlistBtn');
  if (backBtn) backBtn.addEventListener('click', () => switchTab('profile'));

  document.querySelectorAll('.wishlist-heart').forEach(heart => {
    heart.addEventListener('click', (e) => {
      e.stopPropagation();
      tgUtil.haptic('light');
      const productId = heart.dataset.productId;
      const card = heart.closest('.product-card');
      if (card) {
        card.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          card.remove();
          const grid = document.querySelector('.grid.grid-cols-2');
          if (grid && grid.children.length === 0) {
            renderCurrentScreen();
          }
        }, 120);
      }
      wishlist.delete(productId);
      delete _tabCache['wishlist:'];
      delete _tabCache['home:'];
      delete _tabCache['catalogs:'];
      updateCartBadge();
      supabaseClient.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId).catch(console.error);
    });
  });

  // Внутри loadHomeProducts, после grid.innerHTML = ...
document.querySelectorAll('.addToCartBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const productId = btn.dataset.productId;
    if (productId) addToCart(productId);
  };
});

document.querySelectorAll('.buyNowBtn').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const url = btn.dataset.url;
    const price = parseFloat(btn.dataset.price);
    if (url && !isNaN(price)) {
      window.tempOrder = {
        url: url,
        price: price,
        weight: 1,
        total: window.iceLogixPricing.quickEstimate(price, 1),
        discountAmount: 0,
        appliedPromo: null
      };
      switchTab('neworder');
    }
  };
});



}


// Global Exports
if (typeof renderAcademy === 'function') window.renderAcademy = renderAcademy;
if (typeof attachAcademyHandlers === 'function') window.attachAcademyHandlers = attachAcademyHandlers;
if (typeof completeLesson === 'function') window.completeLesson = completeLesson;
if (typeof showLessonModal === 'function') window.showLessonModal = showLessonModal;
if (typeof handleGetCert === 'function') window.handleGetCert = handleGetCert;
if (typeof openCourseForm === 'function') window.openCourseForm = openCourseForm;
if (typeof manageLessonsModal === 'function') window.manageLessonsModal = manageLessonsModal;
if (typeof openLessonForm === 'function') window.openLessonForm = openLessonForm;
if (typeof previewLessonAdmin === 'function') window.previewLessonAdmin = previewLessonAdmin;
if (typeof renderWishlist === 'function') window.renderWishlist = renderWishlist;
if (typeof attachWishlistHandlers === 'function') window.attachWishlistHandlers = attachWishlistHandlers;
