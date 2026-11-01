// ============================================================
// ICE LOGIX Module: Client Shared
// Клиентские экраны и помощники, которые раньше жили в старой админке (admin.js):
// вход в админку по код-паролю, журнал действий, кнопка «Назад», гайд по размерам,
// «Товары», распаковка за бонусы (UGC), реферальная сеть, согласование цены заказа.
// ============================================================


// ==================== ЖУРНАЛ ДЕЙСТВИЙ АДМИНА ====================
async function logAdminAction(action, details = {}) {
  if (!userId) return;
  try {
    // запись в журнал — только через серверную функцию (прямой insert в admin_logs закрыт)
    await supabaseClient.rpc('admin_log_action', {
      p_action: action,
      p_details: (details && typeof details === 'object') ? details : { value: String(details) }
    });
  } catch(e) { /* silent — never interrupt admin workflow */ }
}

// ==================== ВХОД В АДМИНКУ ====================
// Вход в админ-панель: подтверждение личным код-паролем (проверка на сервере, функция app-lock, ADR-013).
// Старый PIN из users.pin_code (открытым текстом, по умолчанию 0000) больше не используется.
async function renderAdmin2FA() {
  const U = window.UI;
  return `
    <div class="rd-screen page-enter">
      <div class="rd-head">
        <button type="button" class="rd-back" id="cancelAdmin2FA" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Админ-панель</h1><p class="rd-head-sub">Вход подтверждается код-паролем</p></div>
      </div>
      <div class="rd-empty" id="admin2faBox">
        <div class="rd-empty-ico">${U.icon('shield', 30)}</div>
        <div class="rd-empty-title">Подтвердите вход</div>
        <p class="rd-empty-text">Введите свой код-пароль. После 5 ошибок он блокируется, сбросить можно только через бота в Telegram.</p>
        <button type="button" class="rd-btn" id="admin2faBtn">Ввести код-пароль</button>
      </div>
    </div>
    ${renderFooter()}
  `;
}

function attachAdmin2FAHandlers() {
  const U = window.UI;
  const cancelBtn = document.getElementById('cancelAdmin2FA');
  if (cancelBtn) cancelBtn.onclick = () => switchTab('home');

  const showNotEnabled = () => {
    const box = document.getElementById('admin2faBox');
    if (!box) return;
    box.innerHTML = `
      <div class="rd-empty-ico">${U.icon('lock', 30)}</div>
      <div class="rd-empty-title">Включите код-пароль</div>
      <p class="rd-empty-text">Админ-панель открывается только после ввода личного код-пароля. Включите его в настройках, во вкладке «Защита».</p>
      <button type="button" class="rd-btn" id="admin2faSettingsBtn">Открыть настройки</button>`;
    const b = document.getElementById('admin2faSettingsBtn');
    if (b) b.onclick = () => showAppSettings('security');
  };

  const run = async () => {
    if (!window.AppLock) { U.toast('Не загрузился модуль защиты. Обновите приложение', 'bad'); return; }
    const res = await window.AppLock.verifyFlow('Вход в админ-панель');
    if (res === 'not_enabled') return showNotEnabled();
    if (res === true) {
      adminAuthenticated = true;
      window.invalidateAdminCache();
      renderAdminScreen(true);
    }
  };
  const btn = document.getElementById('admin2faBtn');
  if (btn) btn.onclick = run;
  run();
}


// ==================== КНОПКА НАЗАД ====================
// When running inside Telegram, we use the native BackButton (see syncTelegramBackButton).
// The in-page button is rendered only as a fallback for browsers without the Telegram WebApp SDK.
function ensureBackButton() {
  const oldBtn = document.getElementById('globalBackBtn');
  if (oldBtn) oldBtn.remove();
  if (window.Telegram?.WebApp?.BackButton) return;
  if (currentTab !== 'home' && currentTab !== 'catalogs' && currentTab !== 'reports' && currentTab !== 'reviews' && currentTab !== 'academy' && currentTab !== 'dropshipper' && currentTab !== 'products' && currentTab !== 'wishlist' && currentTab !== 'search' && currentTab !== 'notifications' && currentTab !== 'settings' && !document.querySelector('#content .rd-head')) {
    const contentDiv = document.getElementById('content');
    const btn = document.createElement('button');
    btn.id = 'globalBackBtn';
    btn.className = 'global-back-btn';
    btn.innerHTML = '<span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></span> Назад';
    btn.onclick = () => {
      tgUtil.haptic('light');
      if (previousTab && previousTab !== currentTab) switchTab(previousTab);
      else if (currentTab !== 'home') switchTab('home');
      else tg.close();
    };
    if (contentDiv.firstChild) contentDiv.insertBefore(btn, contentDiv.firstChild);
    else contentDiv.appendChild(btn);
  }
}

// ==================== ГАЙД ПО РАЗМЕРАМ ====================
window.renderSizeGuides = async () => {
  const U = window.UI;
  const guides = [
{ brand: 'Nike / Air Jordan', kind: 'Обувь', fit: 'В размер', tone: 'ok', text: 'Обычно идут <b>строго в размер</b>. Jordan 4 и Air Max 95 могут давить в носке: при широкой стопе берите на <b>0,5 размера больше</b>.', ex: 'US 9 = EU 42,5 = 27 см' },
{ brand: 'Yeezy / Adidas', kind: 'Обувь', fit: 'Маломерят', tone: 'warn', text: 'Yeezy Boost 350 V2 и 700 <b>заметно маломерят</b>. Заказывайте на <b>0,5–1 размер больше</b> обычного.', ex: 'US 9,5 = EU 43⅓ = 27,5 см' },
{ brand: 'Zara / Massimo Dutti', kind: 'Одежда', fit: 'Большемерят', tone: '', text: 'Куртки и пальто часто <b>свободного кроя</b>. Носите M — берите M, под неё влезет и толстый свитер.' },
{ brand: "Arc'teryx / The North Face", kind: 'Одежда', fit: 'По фигуре', tone: '', text: 'Куртки шьют по анатомическим лекалам. Хотите свободнее или носить с худи — берите <b>на размер больше</b>.' }
  ];
  return `
<div class="rd-screen page-enter sz">
  <div class="rd-head">
    <button type="button" class="rd-back" onclick="window.goBackGlobal ? window.goBackGlobal() : switchTab('catalogs')" aria-label="Назад">${U.icon('chevL', 22)}</button>
    <div class="rd-head-txt"><h1 class="rd-head-title">Гайд по размерам</h1><p class="rd-head-sub">Какие бренды маломерят, а какие нет</p></div>
  </div>
  <div class="sz-tip">${U.icon('ruler', 20)}<span>Измерьте стопу от пятки до большого пальца: это ваш размер в сантиметрах (CM/JP) на Poizon.</span></div>
  <div class="sz-list">
    ${guides.map(g => `
      <div class="sz-card">
        <div class="sz-top">
          <span class="sz-ico">${U.icon(g.kind === 'Обувь' ? 'ruler' : 'tag', 20)}</span>
          <div><b>${g.brand}</b><span>${g.kind}</span></div>
          <span class="rd-status ${g.tone}">${g.fit}</span>
        </div>
        <p>${g.text}</p>
        ${g.ex ? `<div class="sz-ex">${g.ex}</div>` : ''}
      </div>`).join('')}
  </div>
</div>
  `;
};

// ==================== ТОВАРЫ (скоро) ====================
async function renderProductsCatalog() {
  const U = window.UI;
  return `
    <div class="rd-screen page-enter soon">
      <div class="rd-head">
        <button id="backFromProductsCatalogBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Товары</h1><p class="rd-head-sub">Готовые вещи по фиксированной цене</p></div>
      </div>
      <div class="soon-hero">
        <div class="soon-art" aria-hidden="true"><span class="b1">${U.icon('bag', 30)}</span><span class="b2">${U.icon('box', 34)}</span><span class="b3">${U.icon('tag', 24)}</span></div>
        <span class="rd-soon">${U.icon('clock', 12)}Скоро</span>
        <h2>Готовим витрину</h2>
        <p>Соберём оригинальные вещи по фиксированной цене: выбрали, оплатили, получили. Без расчётов и ожидания ответа байера.</p>
      </div>
      <div class="rd-card rd-list">
        <div class="rd-row"><span class="rd-ico">${U.icon('tag', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Оригинальные бренды</span><span class="rd-row-text">Кроссовки, одежда и аксессуары</span></span></div>
        <div class="rd-row"><span class="rd-ico">${U.icon('zap', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Заказ в один тап</span><span class="rd-row-text">Цена сразу финальная, без калькулятора</span></span></div>
        <div class="rd-row"><span class="rd-ico">${U.icon('shield', 22)}</span><span class="rd-row-body"><span class="rd-row-title">Проверка подлинности</span><span class="rd-row-text">Каждую вещь проверяем перед отправкой</span></span></div>
      </div>
      <button id="returnToCatalogsFromProductsBtn" type="button" class="rd-btn rd-btn-block rd-btn-tonal soon-back">Смотреть площадки</button>
    </div>
  `;
}

function attachProductsCatalogHandlers() {
  const backBtn = document.getElementById('backFromProductsCatalogBtn');
  const returnBtn = document.getElementById('returnToCatalogsFromProductsBtn');
  const goBack = () => {
    currentSubScreen = null;
    renderCurrentScreen();
  };
  if (backBtn) backBtn.onclick = goBack;
  if (returnBtn) returnBtn.onclick = () => switchTab('catalogs', 'marketplaces');
}

// ==================== РАСПАКОВКА ЗА БОНУСЫ И РЕФЕРАЛЬНАЯ СЕТЬ ====================
async function renderUGC() {
  let mine = [];
  try {
    if (userId) {
      const { data } = await supabaseClient.from('ugc_videos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
      mine = data || [];
    }
  } catch (e) {}

  const U = window.UI;
  const st = (v) => v === 'approved' ? ['ok', 'Одобрено'] : v === 'rejected' ? ['bad', 'Отклонено'] : ['warn', 'На проверке'];
  const list = mine.length === 0
    ? `<p class="ug-none">Вы ещё не отправляли распаковок</p>`
    : mine.map(v => `
      <div class="ug-item">
        <span class="ug-item-ico">${U.icon('camera', 20)}</span>
        <div class="ug-item-body">
          <div class="ug-item-top"><b>${new Date(v.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</b><span class="rd-status ${st(v.status)[0]}">${st(v.status)[1]}</span></div>
          ${v.caption ? `<p>${U.esc(v.caption)}</p>` : ''}
          ${v.status === 'approved' && v.reward_ices ? `<p class="ok">Начислено ${v.reward_ices} бонусов</p>` : ''}
          ${v.status === 'rejected' && v.reject_reason ? `<p class="bad">Причина: ${U.esc(v.reject_reason)}</p>` : ''}
        </div>
      </div>`).join('');

  return `
    <div class="rd-screen page-enter ug">
      <div class="rd-head">
        <button id="ugcBackBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Распаковка за бонусы</h1><p class="rd-head-sub">Снимите, как открываете посылку</p></div>
      </div>

      <div class="ug-hero">
        <div class="ug-hero-art"><span>${U.icon('camera', 34)}</span><i class="ug-spark a">${U.icon('sparkles', 16)}</i><i class="ug-spark b">${U.icon('gift', 16)}</i></div>
        <div class="ug-steps">
          <div><b>1</b><span>Снимите видео распаковки заказа</span></div>
          <div><b>2</b><span>Загрузите его сюда, до 50 МБ</span></div>
          <div><b>3</b><span>После проверки начислим бонусы</span></div>
        </div>
      </div>

      <label class="ug-drop" for="ugcFileInput">
        <input type="file" id="ugcFileInput" accept="video/*" onchange="const f=this.files&&this.files[0]; document.getElementById('ugcFileName').textContent = f ? f.name : 'Выбрать видео'; this.closest('.ug-drop').classList.toggle('has', !!f);">
        <span class="ug-drop-ico">${U.icon('upload', 24)}</span>
        <span class="ug-drop-txt"><b id="ugcFileName">Выбрать видео</b><span>MP4 или MOV, до 50 МБ</span></span>
      </label>
      <div class="rd-field ug-cap"><textarea id="ugcCaption" rows="2" placeholder="Пара слов о заказе (необязательно)"></textarea></div>
      <button id="ugcUploadBtn" type="button" class="rd-btn rd-btn-block">${U.icon('send', 18)}Отправить на проверку</button>
      <div id="ugcUploadStatus" class="ug-status"></div>

      <div class="rd-section"><h2>Мои распаковки</h2>${mine.length ? `<span class="rd-pill">${mine.length}</span>` : ''}</div>
      <div class="rd-card ug-list">${list}</div>
    </div>
  `;
}

function attachUGCHandlers() {
  const back = document.getElementById('ugcBackBtn');
  if (back) back.onclick = () => { currentSubScreen = null; window.goBackGlobal(); };
  const btn = document.getElementById('ugcUploadBtn');
  if (!btn) return;
  btn.onclick = async () => {
    const fileInput = document.getElementById('ugcFileInput');
    const statusEl = document.getElementById('ugcUploadStatus');
    if (!userId) { tgUtil.alert('Откройте приложение через Telegram'); return; }
    if (!fileInput || !fileInput.files || !fileInput.files[0]) { tgUtil.alert('Выберите видео-файл'); return; }
    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) { tgUtil.alert('Видео слишком большое (макс. 50 МБ)'); return; }
    const caption = (document.getElementById('ugcCaption').value || '').trim();
    btn.disabled = true;
    statusEl.innerHTML = '<span class="ug-load"><i></i>Загружаем видео…</span>';
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${userId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabaseClient.storage.from('ugc').upload(path, file, { contentType: file.type || 'video/mp4', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabaseClient.storage.from('ugc').getPublicUrl(path);
      const videoUrl = pub.publicUrl;
      const { error: insErr } = await supabaseClient.from('ugc_videos').insert({
        user_id: userId, video_url: videoUrl, video_path: path, caption: caption || null, status: 'pending', forwarded: false
      });
      if (insErr) throw insErr;
      tgUtil.haptic && tgUtil.haptic('success');
      statusEl.innerHTML = '<span class="ok">Готово! Видео ушло на проверку.</span>';
      setTimeout(() => renderCurrentScreen(), 1200);
    } catch (e) {
      statusEl.innerHTML = `<span class="bad">Не получилось загрузить: ${e.message || e}</span>`;
      btn.disabled = false;
    }
  };
}

async function renderReferralTree() {
  let tree = [], stats = null;
  try {
    if (userId) {
      const { data: t } = await supabaseClient.rpc('get_referral_tree', { root_id: userId });
      tree = t || [];
      const { data: s } = await supabaseClient.rpc('get_referral_stats', { root_id: userId });
      stats = (s && s[0]) ? s[0] : null;
    }
  } catch (e) {}

  const byLevel = { 1: [], 2: [], 3: [] };
  tree.forEach(n => { if (byLevel[n.level]) byLevel[n.level].push(n); });
  const U = window.UI;
  const nodeName = (n) => (n.username ? '@' + n.username : (n.full_name || ('ID ' + n.user_id)));
  const earned = stats || { level1_count: 0, level2_count: 0, level3_count: 0, earned_l1: 0, earned_l2: 0, earned_l3: 0, total_earned: 0 };
  const total = (+earned.level1_count || 0) + (+earned.level2_count || 0) + (+earned.level3_count || 0) || tree.length;
  const levels = [
    { lvl: 1, label: 'Ваши друзья', hint: 'пригласили вы', got: earned.earned_l1 },
    { lvl: 2, label: 'Друзья друзей', hint: '2-я линия', got: earned.earned_l2 },
    { lvl: 3, label: 'Третья линия', hint: '3-я линия', got: earned.earned_l3 }
  ];
  const levelsHtml = levels.map(m => {
    const nodes = byLevel[m.lvl];
    return `
      <div class="rt-level">
        <div class="rt-level-h"><span class="rt-lvl l${m.lvl}">${m.lvl}</span><div><b>${m.label}</b><span>${nodes.length} чел. · заработано ${(+m.got || 0).toFixed(0)}</span></div></div>
        ${nodes.length === 0 ? '<p class="rt-none">Пока никого</p>' : `<div class="rt-nodes">${nodes.map(n => `
          <div class="rt-node"><span class="rt-ava l${m.lvl}">${U.esc(nodeName(n).replace('@', '').charAt(0).toUpperCase())}</span><span class="rt-name">${U.esc(nodeName(n))}</span><span class="rt-sub">пригласил ${n.direct_count || 0}</span></div>`).join('')}</div>`}
      </div>`;
  }).join('');

  return `
    <div class="rd-screen page-enter rt">
      <div class="rd-head">
        <button id="refTreeBackBtn" type="button" class="rd-back" aria-label="Назад">${U.icon('chevL', 22)}</button>
        <div class="rd-head-txt"><h1 class="rd-head-title">Моя сеть</h1><p class="rd-head-sub">Кого вы пригласили и сколько это принесло</p></div>
      </div>
      <div class="rt-sum">
        <div class="rt-sum-main"><span>Всего заработано</span><b>${(+earned.total_earned || 0).toFixed(0)}<em>бонусов</em></b></div>
        <div class="rt-sum-people">${U.icon('users', 18)}<b>${total}</b><span>чел. в сети</span></div>
        <div class="rt-bars">
          ${levels.map(m => `<div><span class="rt-lvl l${m.lvl}">${m.lvl}</span><b>${(+m.got || 0).toFixed(0)}</b><small>${byLevel[m.lvl].length} чел.</small></div>`).join('')}
        </div>
      </div>
      ${levelsHtml}
      <button type="button" class="rd-btn rd-btn-block rd-btn-tonal rt-invite" onclick="switchTab('referral')">${U.icon('send', 18)}Пригласить друзей</button>
    </div>
  `;
}

function attachReferralTreeHandlers() {
  const back = document.getElementById('refTreeBackBtn');
  if (back) back.onclick = () => { currentSubScreen = null; window.goBackGlobal(); };
}

// ==================== ПЕРЕХОД К ОТЗЫВУ ====================
function openReviewForm(actionIdOrOrderId) {
  switchTab('reviews');
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const btn = document.getElementById('hubLeaveReviewBtn') || document.getElementById('feedLeaveReviewBtn') || document.getElementById('leaveReviewBtn');
    if (btn) {
      clearInterval(timer);
      openReviewActionModal(actionIdOrOrderId);
    } else if (tries > 25) {
      clearInterval(timer);
    }
  }, 200);
}

// ==================== СОГЛАСОВАНИЕ ЦЕНЫ (клиент) ====================
// Решение клиента при подорожании — на сервере (order_price_decision): статус и возврат денег на баланс
async function priceDecision(orderId, accept) {
  const { data, error } = await window.supabaseClient.rpc('order_price_decision', { p_order_id: orderId, p_accept: accept });
  if (error) throw error;
  return data || {};
}

window.confirmOrderPriceIncrease = async function(orderId) {
  if (!confirm('Согласиться с новой ценой? Заказ уйдёт в работу.')) return;
  try {
    await priceDecision(orderId, true);
    if (window.tgUtil) {
      window.tgUtil.haptic('success');
      window.tgUtil.showPopup('Готово', 'Вы согласились с новой ценой. Оператор завершит выкуп.');
    }
    if (typeof window.renderCurrentScreen === 'function') window.renderCurrentScreen();
  } catch (e) {
    alert('Не получилось подтвердить: ' + e.message);
  }
};

window.cancelOrderDueToPrice = async function(orderId) {
  if (!confirm('Отменить заказ? Всё оплаченное вернётся на баланс.')) return;
  try {
    const res = await priceDecision(orderId, false);
    if (window.tgUtil) {
      window.tgUtil.haptic('success');
      window.tgUtil.showPopup('Заказ отменён', `На баланс вернулось ${window.moneyText(res.refund)}.`);
    }
    if (typeof window.renderCurrentScreen === 'function') window.renderCurrentScreen();
  } catch (e) {
    alert('Не получилось отменить: ' + e.message);
  }
};


// Global Exports
if (typeof logAdminAction === 'function') window.logAdminAction = logAdminAction;
if (typeof renderAdmin2FA === 'function') window.renderAdmin2FA = renderAdmin2FA;
if (typeof attachAdmin2FAHandlers === 'function') window.attachAdmin2FAHandlers = attachAdmin2FAHandlers;
if (typeof ensureBackButton === 'function') window.ensureBackButton = ensureBackButton;
if (typeof renderProductsCatalog === 'function') window.renderProductsCatalog = renderProductsCatalog;
if (typeof attachProductsCatalogHandlers === 'function') window.attachProductsCatalogHandlers = attachProductsCatalogHandlers;
if (typeof renderUGC === 'function') window.renderUGC = renderUGC;
if (typeof attachUGCHandlers === 'function') window.attachUGCHandlers = attachUGCHandlers;
if (typeof renderReferralTree === 'function') window.renderReferralTree = renderReferralTree;
if (typeof attachReferralTreeHandlers === 'function') window.attachReferralTreeHandlers = attachReferralTreeHandlers;
if (typeof openReviewForm === 'function') window.openReviewForm = openReviewForm;
