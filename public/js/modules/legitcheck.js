// ============================================================

// ICE LOGIX Module: AI Legit Check

// ============================================================

// ==================== AI LEGIT CHECK MODULE ====================



async function renderLegitCheck() {
  const U = window.UI;
  const price = U.money(5);
  const disclaimerAccepted = localStorage.getItem('legitCheckDisclaimerAccepted') === 'true';
  const head = (sub) => `
    <div class="rd-head">
      <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${U.icon('chevL', 22)}</button>
      <div class="rd-head-txt"><h1 class="rd-head-title">Legit-Check</h1><p class="rd-head-sub">${sub}</p></div>
    </div>`;

  if (!disclaimerAccepted) {
    return `
      <div class="rd-screen page-enter lc">
        ${head('Проверка подлинности брендовых вещей')}
        <div class="lc-hero">
          <div class="lc-badge"><span>${U.icon('shield', 40)}</span><i>${U.icon('check', 18, { stroke: 3 })}</i></div>
          <h2>Проверим, оригинал ли вещь</h2>
          <p>Эксперты партнёра ShopbyShop вручную сверят швы, бирки, шрифты и фурнитуру с оригиналом.</p>
        </div>
        <div class="rd-card rd-list lc-facts">
          <div class="rd-row"><span class="rd-ico">${U.icon('users', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Смотрят живые эксперты</span><span class="rd-row-text">Опытные байеры, а не нейросеть</span></span></div>
          <div class="rd-row"><span class="rd-ico">${U.icon('clock', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Ответ до 24 часов</span><span class="rd-row-text">Обычно быстрее, уведомим в боте</span></span></div>
          <div class="rd-row"><span class="rd-ico">${U.icon('checkCircle', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Вердикт с пояснением</span><span class="rd-row-text">«Оригинал» или «Подделка» и почему</span></span></div>
        </div>
        <div class="lc-price"><span>Стоимость проверки</span><b>${price}</b></div>
        <p class="lc-note">Списывается с баланса, когда отправите фото.</p>
        <button id="acceptDisclaimerBtn" type="button" class="rd-btn rd-btn-block lc-go">Понятно, продолжить${U.icon('arrowR', 18)}</button>
      </div>
    `;
  }

  // Мои заявки (с быстрым кэшем)
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
        <div class="rd-section"><h2>Мои проверки</h2><span class="rd-pill">${checks.length}</span></div>
        <div class="hs-list">
          ${checks.map(c => {
            const urls = (c.photos || []).map(ph => ph.startsWith('http') ? ph : supabaseClient.storage.from('ugc').getPublicUrl(ph).data.publicUrl);
            const st = c.status === 'pending' ? ['warn', 'Эксперты смотрят'] : c.status === 'original' ? ['ok', 'Оригинал'] : ['bad', 'Подделка'];
            return `
              <div class="hs-card hs-col">
                <div class="hs-row-top"><span class="hs-title">${U.esc([c.brand, c.model].filter(Boolean).join(' ') || 'Проверка')}</span><span class="rd-status ${st[0]}">${st[1]}</span></div>
                ${urls.length ? `<div class="hs-thumbs" data-urls="${encodeURIComponent(JSON.stringify(urls))}">${urls.map((u, i) => `<img src="${U.esc(u)}" alt="" loading="lazy" onclick="window.showImagePreview(JSON.parse(decodeURIComponent(this.parentElement.dataset.urls)), ${i})">`).join('')}</div>` : ''}
                ${c.status === 'fake' && c.comments ? `<p class="hs-text">Почему: ${U.esc(c.comments)}</p>` : ''}
                <div class="hs-sub">№ ${c.id.slice(0, 8).toUpperCase()} · ${new Date(c.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
              </div>`;
          }).join('')}
        </div>
      `;
    }
  } catch (e) {
    console.error('Error loading user checks:', e);
  }

  return `
    <div class="rd-screen page-enter lc">
      ${head('Экспертная проверка оригинальности')}

      <div class="rd-card lc-form">
        <h2 class="lc-form-t">Новая проверка</h2>
        <div class="lc-two">
          <div><label class="rd-label" for="legitBrand">Бренд</label><div class="rd-field"><input type="text" id="legitBrand" placeholder="Nike, Stone Island" autocomplete="off"></div></div>
          <div><label class="rd-label" for="legitModel">Модель</label><div class="rd-field"><input type="text" id="legitModel" placeholder="Air Force 1" autocomplete="off"></div></div>
        </div>
        <label class="rd-label">Фото вещи, до 5 штук</label>
        <div id="legitPhotoZone" class="lc-drop" role="button" tabindex="0">
          <span class="lc-drop-ico">${U.icon('camera', 26)}</span>
          <b>Добавить фото</b>
          <span>Бирки, швы, стелька, логотип: чем чётче, тем точнее вердикт</span>
          <input type="file" id="legitPhotoInput" accept="image/*" multiple class="hidden">
        </div>
        <div id="legitPhotoPreview" class="hidden lc-prev"></div>
        <button id="runLegitCheckBtn" type="button" class="rd-btn rd-btn-block lc-go"><span>Отправить экспертам · ${price}</span></button>
      </div>

      ${requestsListHtml}
    </div>
  `;
}

function attachLegitCheckHandlers() {



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

        tgUtil.alert('Укажите бренд вещи.');

        return;

      }

      if (!modelVal) {

        tgUtil.alert('Укажите модель вещи.');

        return;

      }

      if (!window.legitPhotos || window.legitPhotos.length === 0) {

        tgUtil.alert('Добавьте хотя бы одно фото.');

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

        tgUtil.alert(`На балансе не хватает денег.\n\nПроверка стоит 5, а на балансе ${balance.toFixed(2)}.\nПополните кошелёк кнопкой «+» в шапке.`);

        return;

      }



      if (!(await tgUtil.confirm(`Отправить ${brandVal} ${modelVal} на проверку? С баланса спишется 5.`))) {

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



        // 3. Оплата и заявка — на сервере (pay_legit_check): цена из настроек, списание через журнал баланса
        const { data: paid, error: payErr } = await supabaseClient.rpc('pay_legit_check', {
          p_brand: brandVal,
          p_model: modelVal,
          p_photos: paths
        });
        if (payErr) throw payErr;
        const newBalance = Number(paid?.balance ?? (balance - cost));
        window.setUserBalance(newBalance);



        tgUtil.haptic('success');

        glassToast('Отправили экспертам. Ответ придёт в течение суток.', { kind: 'success' });

        

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
    `<div class="lc-ph">
      <img src="${trackBlobUrl('legit:photo:' + i, f)}" alt="">
      <button type="button" data-rm-legit-photo="${i}" aria-label="Убрать фото">${window.UI.icon('x', 14, { stroke: 2.6 })}</button>
      ${i === 0 ? '<span>Главное</span>' : ''}
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

