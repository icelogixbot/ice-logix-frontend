// ============================================================
// ICE LOGIX Module: AI Legit Check
// ============================================================
// ==================== AI LEGIT CHECK MODULE ====================

async function renderLegitCheck() {
  const disclaimerAccepted = localStorage.getItem('legitCheckDisclaimerAccepted') === 'true';

  if (!disclaimerAccepted) {
    return `
      <button id="backFromLegitBtn" class="global-back-btn mb-4 flex items-center gap-1 text-white/80 hover:text-white transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Назад
      </button>
      <div class="glass-card font-sans">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🔍 Экспертный Legit-Check</span>
        </h2>
        <div class="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-5 text-sm space-y-3">
          <p class="font-bold text-white text-base">⚠️ Проверка подлинности брендовых вещей</p>
          <p class="text-white/80 leading-relaxed text-sm">
            Услуга <strong>Legit-Check</strong> предоставляется нашими партнерами из <strong>ShopbyShop</strong>. Профессиональные эксперты вручную проверят ваши фотографии на соответствие оригинальным деталям (швы, бирки, шрифты, фурнитура).
          </p>
          <p class="text-white/80 leading-relaxed text-xs">
            • Проверка выполняется вручную опытными байерами.<br>
            • Время рассмотрения заявки составляет <strong>до 24 часов</strong>.<br>
            • Вы получите официальный вердикт: Оригинал или Подделка с комментариями эксперта.
          </p>
          <p class="text-cyan-400 leading-relaxed font-bold text-sm">
            Стоимость проверки: 5 ICE (списывается с вашего баланса).
          </p>
        </div>
        <button id="acceptDisclaimerBtn" class="btn-primary w-full py-3 rounded-xl font-bold transition uppercase tracking-wider text-xs font-sans">
          Принять и продолжить
        </button>
      </div>
      ${renderFooter()}
    `;
  }

  // Load user's submitted legit check requests with instant CacheDB
  let requestsListHtml = '';
  try {
    let checks = null;
    if (window.CacheDB && userId) {
      checks = await window.CacheDB.get('legit_checks_' + userId, async () => {
        const { data } = await supabaseClient.from('legit_check_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        return data || [];
      }, 30000);
    } else if (supabaseClient && userId) {
      const { data } = await supabaseClient.from('legit_check_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      checks = data;
    }

    if (checks && checks.length > 0) {
      requestsListHtml = `
        <div class="glass-card mb-4 font-sans">
          <h3 class="text-white font-bold text-sm mb-3 flex items-center gap-1.5">
            <span>📋 Ваши заявки на Legit-Check</span>
          </h3>
          <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
            ${checks.map(c => {
              const imageUrls = (c.photos || []).map(p => {
                if (p.startsWith('http')) return p;
                return supabaseClient.storage.from('ugc').getPublicUrl(p).data.publicUrl;
              });

              const isPending = c.status === 'pending';
              const isOriginal = c.status === 'original';
              const isFake = c.status === 'fake';

              return `
                <div class="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2 text-left text-xs font-sans">
                  <div class="flex justify-between items-center text-[10px] text-white/40">
                    <span>${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                    <span class="font-mono">#${c.id.slice(0, 8)}</span>
                  </div>
                  <div>
                    <p class="text-white font-bold">${c.brand} ${c.model}</p>
                    <div class="grid grid-cols-5 gap-1.5 mt-1.5">
                      ${imageUrls.map(url => `
                        <div class="aspect-square rounded-lg bg-white/10 overflow-hidden cursor-pointer border border-white/5 hover:border-cyan-500 transition" onclick="window.open('${url}', '_blank')">
                          <img src="${url}" class="w-full h-full object-cover">
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  
                  ${isPending ? `
                    <div class="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg text-center font-sans">
                      🔍 НА РАССМОТРЕНИИ ЭКСПЕРТАМИ
                    </div>
                  ` : isOriginal ? `
                    <div class="p-2 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold rounded-lg text-center font-sans">
                      🟢 ВЕРДИКТ: ОРИГИНАЛ (Сертификат подтвержден)
                    </div>
                  ` : `
                    <div class="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-lg text-left font-sans">
                      🔴 ВЕРДИКТ: ПОДДЕЛКА
                      ${c.comments ? '<p class="font-normal text-[9px] text-white/50 mt-1 font-sans">Причина: ' + c.comments + '</p>' : ''}
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.error('Error loading user checks:', e);
  }

  return `
    <button id="backFromLegitBtn" class="global-back-btn mb-4 flex items-center gap-1 text-white/80 hover:text-white transition">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Назад
    </button>
    
    ${requestsListHtml}

    <div class="glass-card font-sans">
      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🔍 Заказать новый Legit-Check</span>
      </h2>

      <div class="space-y-4 font-sans">
        <p class="text-white/70 text-xs leading-relaxed bg-white/5 p-3 rounded-xl">
          Загрузите качественные фотографии (бирки, швы, стелька, логотипы) и укажите бренд/модель. 
          Стоимость: <strong>5 ICE</strong> с баланса.
        </p>

        <div>
          <label class="text-white/70 text-sm font-semibold mb-1 block">Бренд *</label>
          <input type="text" id="legitBrand" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Например: Nike, Stone Island">
        </div>

        <div>
          <label class="text-white/70 text-sm font-semibold mb-1 block">Модель *</label>
          <input type="text" id="legitModel" class="btn-secondary w-full p-3 rounded-xl border border-white/30 text-sm" placeholder="Например: Air Force 1, Zip Hoodie">
        </div>

        <div>
          <label class="text-white/70 text-sm font-semibold mb-1 block">Фотографии товара (до 5 штук) *</label>
          <div id="legitPhotoZone" class="mt-1 p-5 border border-dashed border-white/30 rounded-2xl text-center cursor-pointer hover:bg-white/5 transition">
            <span class="text-2xl block mb-1 text-cyan-400"><span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span></span>
            <span class="text-xs text-white/70 font-semibold block">Нажмите для выбора или перетащите фото</span>
            <span class="text-[10px] text-white/40 block mt-1">Добавьте детальные фотографии швов и бирок</span>
            <input type="file" id="legitPhotoInput" accept="image/*" multiple class="hidden">
          </div>
          <div id="legitPhotoPreview" class="hidden mt-3 grid grid-cols-3 gap-2"></div>
        </div>

        <button id="runLegitCheckBtn" class="btn-primary w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
          <span>Отправить экспертам (5 ICE)</span>
        </button>
      </div>
    </div>
    ${renderFooter()}
  `;
}

function attachLegitCheckHandlers() {
  const backBtn = document.getElementById('backFromLegitBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      if (previousTab && previousTab !== 'legitcheck') {
        switchTab(previousTab);
      } else {
        switchTab('calculator');
      }
    };
  }

  const acceptDisclaimerBtn = document.getElementById('acceptDisclaimerBtn');
  if (acceptDisclaimerBtn) {
    acceptDisclaimerBtn.onclick = () => {
      localStorage.setItem('legitCheckDisclaimerAccepted', 'true');
      renderCurrentScreen();
    };
    return;
  }

  // Upload handlers
  const legitPhotoZone = document.getElementById('legitPhotoZone');
  const legitPhotoInput = document.getElementById('legitPhotoInput');

  if (legitPhotoZone && legitPhotoInput) {
    legitPhotoZone.onclick = () => legitPhotoInput.click();
    legitPhotoZone.ondragover = (ev) => { ev.preventDefault(); legitPhotoZone.classList.add('bg-white/10'); };
    legitPhotoZone.ondragleave = () => legitPhotoZone.classList.remove('bg-white/10');
    legitPhotoZone.ondrop = (ev) => {
      ev.preventDefault();
      legitPhotoZone.classList.remove('bg-white/10');
      handleLegitPhotoFiles(ev.dataTransfer?.files);
    };
    legitPhotoInput.onchange = () => handleLegitPhotoFiles(legitPhotoInput.files);
  }

  function handleLegitPhotoFiles(files) {
    if (!files || !files.length) return;
    if (!window.legitPhotos) window.legitPhotos = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 10 * 1024 * 1024) { tgUtil.alert(`${f.name}: Файл больше 10 МБ`); continue; }
      if (window.legitPhotos.length >= 5) { tgUtil.alert('Можно загрузить максимум 5 фото'); break; }
      window.legitPhotos.push(f);
    }
    renderLegitPhotoPreviews();
  }

  // Submit manual Legit Check request
  const runLegitCheckBtn = document.getElementById('runLegitCheckBtn');
  if (runLegitCheckBtn) {
    runLegitCheckBtn.onclick = async () => {
      const brandVal = document.getElementById('legitBrand')?.value.trim() || '';
      const modelVal = document.getElementById('legitModel')?.value.trim() || '';

      if (!brandVal) {
        tgUtil.alert('Пожалуйста, укажите бренд!');
        return;
      }
      if (!modelVal) {
        tgUtil.alert('Пожалуйста, укажите модель!');
        return;
      }
      if (!window.legitPhotos || window.legitPhotos.length === 0) {
        tgUtil.alert('Пожалуйста, добавьте хотя бы одно фото!');
        return;
      }

      // 1. Check user balance (5 BYN)
      const cost = 5.00;
      const { data: userRec, error: fErr } = await supabaseClient
        .from('users')
        .select('ices_balance')
        .eq('user_id', userId)
        .single();
        
      if (fErr) {
        tgUtil.alert('Не удалось получить баланс: ' + fErr.message);
        return;
      }
      const balance = userRec ? (userRec.ices_balance || 0) : 0;
      if (balance < cost) {
        tgUtil.alert(`❌ Недостаточно средств на балансе!\n\nСтоимость ручной проверки: 5 ICE.\nВаш баланс: ${balance.toFixed(2)} ICE.\n\nПожалуйста, пополните баланс в шапке приложения.`);
        return;
      }

      if (!(await tgUtil.confirm(`Заказать ручную проверку подлинности ${brandVal} ${modelVal} за 5 ICE?`))) {
        return;
      }

      const originalBtnText = runLegitCheckBtn.innerHTML;
      runLegitCheckBtn.innerHTML = `
        <span class="inline-block animate-spin mr-2">⏳</span>
        <span>Отправка фотографий...</span>
      `;
      runLegitCheckBtn.disabled = true;

      try {
        // 2. Upload photographs to Storage
        let sessionId = localStorage.getItem('icelogix_session_id');
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem('icelogix_session_id', sessionId);
        }

        const uploadPromises = window.legitPhotos.map(async (file) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
          const path = `${sessionId}/legit_${Date.now()}_${safeName}`;
          const { error: uploadErr } = await supabaseClient.storage
            .from('ugc')
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadErr) throw new Error(`Не удалось загрузить файл: ${uploadErr.message}`);
          return path;
        });

        const paths = await Promise.all(uploadPromises);

        // 3. Deduct balance in DB
        const newBalance = balance - cost;
        const { error: balErr } = await supabaseClient
          .from('users')
          .update({ ices_balance: newBalance })
          .eq('user_id', userId);
        if (balErr) throw balErr;
        
        // Обновляем локальный UI баланс
        window.balance = newBalance;
        const balEl = document.getElementById('headerBalance');
        if (balEl) balEl.innerText = newBalance;

        // 4. Log transaction
        await supabaseClient.from('transactions').insert({
          user_id: userId,
          amount: -cost,
          type: 'legit_check',
          description: `Оплата ручной проверки Legit-Check (${brandVal} ${modelVal})`
        });

        // 5. Create legit check request row in DB
        const { error: reqErr } = await supabaseClient.from('legit_check_requests').insert({
          user_id: userId,
          brand: brandVal,
          model: modelVal,
          photos: paths,
          status: 'pending'
        });
        if (reqErr) throw reqErr;

        tgUtil.haptic('success');
        glassToast('Заявка успешно отправлена экспертам ShopbyShop!', { kind: 'success' });
        
        // Reset local variables
        window.legitPhotos = [];
        clearBlobUrls('legit:');

        renderCurrentScreen();
      } catch (err) {
        console.error(err);
        tgUtil.alert('Ошибка отправки: ' + (err.message || 'Неизвестная ошибка'));
        runLegitCheckBtn.innerHTML = originalBtnText;
        runLegitCheckBtn.disabled = false;
      }
    };
  }
}

function renderLegitPhotoPreviews() {
  const preview = document.getElementById('legitPhotoPreview');
  if (!preview) return;
  if (!window.legitPhotos || window.legitPhotos.length === 0) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
    return;
  }
  preview.classList.remove('hidden');
  preview.innerHTML = window.legitPhotos.map((f, i) =>
    `<div class="relative">
      <img src="${trackBlobUrl('legit:photo:' + i, f)}" class="rounded-xl w-full h-24 object-cover">
      <button type="button" data-rm-legit-photo="${i}" class="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center shadow-lg">×</button>
      ${i === 0 ? `<span class="absolute bottom-1 left-1 bg-cyan-500/80 text-[9px] font-bold px-1.5 py-0.5 rounded text-white border border-cyan-400">Главное</span>` : ''}
    </div>`).join('');
  
  preview.querySelectorAll('[data-rm-legit-photo]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.rmLegitPhoto, 10);
      window.legitPhotos.splice(i, 1);
      renderLegitPhotoPreviews();
    };
  });
}


// Global Exports
if (typeof renderLegitCheck === 'function') window.renderLegitCheck = renderLegitCheck;
if (typeof attachLegitCheckHandlers === 'function') window.attachLegitCheckHandlers = attachLegitCheckHandlers;
if (typeof handleLegitPhotoFiles === 'function') window.handleLegitPhotoFiles = handleLegitPhotoFiles;
if (typeof renderLegitPhotoPreviews === 'function') window.renderLegitPhotoPreviews = renderLegitPhotoPreviews;
