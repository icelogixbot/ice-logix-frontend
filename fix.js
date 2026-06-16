const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add window.requireAuth and guard switchTab
html = html.replace(
  `    function switchTab(tabName, subScreen = null) {\n      tgUtil.hideMainButton();`,
  `    window.requireAuth = function(msg) {
      if (window.userId) return true;
      if (window.tgUtil && window.tgUtil.popup) {
        tgUtil.popup({
          title: 'Требуется авторизация',
          message: msg || 'Пожалуйста, авторизуйтесь для доступа к этому разделу.',
          buttons: [
            { id: 'cancel', text: 'Отмена', type: 'cancel' },
            { id: 'login', text: 'Войти/Зарегистрироваться' }
          ]
        }).then(res => {
          if (res === 'login') {
            if (typeof showAuthPage === 'function') showAuthPage();
          } else {
            switchTab('home');
          }
        });
      } else {
        if (confirm(msg || 'Пожалуйста, авторизуйтесь. Перейти к авторизации?')) {
          if (typeof showAuthPage === 'function') showAuthPage();
        } else {
          switchTab('home');
        }
      }
      return false;
    };

    function switchTab(tabName, subScreen = null) {
      if (['profile', 'neworder', 'calculator', 'legitcheck', 'academy', 'resale'].includes(tabName) && !window.userId) {
        window.requireAuth('Пожалуйста, авторизуйтесь для доступа к этому разделу.');
        return;
      }
      tgUtil.hideMainButton();`
);

// 2. Hide settings, notifications, balance island for guests in updateUI/init
html = html.replace(
  `        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
          settingsBtn.onclick = () => showAppSettings('theme');
        }
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
          notificationsBtn.onclick = () => showNotificationsPanel();
        }
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
          loginBtn.onclick = () => showAuthPage();
          if (!isRegistered) {
            loginBtn.style.display = 'inline-block';
            loginBtn.style.padding = '6px 14px';
            loginBtn.style.fontSize = '13px';
          } else {
            loginBtn.style.display = 'none';
          }
        }`,
  `        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
          settingsBtn.onclick = () => showAppSettings('theme');
          if (!isRegistered) settingsBtn.style.display = 'none';
        }
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
          notificationsBtn.onclick = () => showNotificationsPanel();
          if (!isRegistered) notificationsBtn.style.display = 'none';
        }
        const balanceIsland = document.getElementById('balanceIsland');
        if (balanceIsland && !isRegistered) {
          balanceIsland.style.display = 'none';
        }
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
          loginBtn.onclick = () => showAuthPage();
          if (!isRegistered) {
            loginBtn.style.display = 'inline-block';
            loginBtn.style.padding = '6px 14px';
            loginBtn.style.fontSize = '13px';
            loginBtn.textContent = 'Войти/Регистрация';
          } else {
            loginBtn.style.display = 'none';
          }
        }`
);

// 3. Guard addToCart
html = html.replace(
  `async function addToCart(productId, quantity = 1, skipAlert = false) {\n  if (!userId) {\n    const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');`,
  `async function addToCart(productId, quantity = 1, skipAlert = false) {\n  if (!window.userId) {\n    window.requireAuth('Пожалуйста, авторизуйтесь для добавления товаров в корзину.');\n    return;\n  }\n  if (!userId) {\n    const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');`
);

// 4. Guard wishlist heart
html = html.replaceAll(
  `heart.onclick = async (e) => {`,
  `heart.onclick = async (e) => {
          if (!window.userId) { window.requireAuth('Пожалуйста, авторизуйтесь для добавления в избранное.'); return; }`
);

// 5. Guard "Хочу такой же" in reports
html = html.replaceAll(
  `onclick="switchTab('calculator', 'from_report')"`,
  `onclick="if(!window.userId){window.requireAuth('Пожалуйста, авторизуйтесь для заказа.'); return false;} switchTab('calculator', 'from_report')"`
);
// Also for neworder (depending on what it points to)
html = html.replaceAll(
  `onclick="switchTab('neworder')`,
  `onclick="if(!window.userId){window.requireAuth('Пожалуйста, авторизуйтесь для заказа.'); return false;} switchTab('neworder')`
);

// 6. Guard Fortune Wheel
html = html.replaceAll(
  `document.getElementById('spinWheelBtn').onclick = async () => {`,
  `document.getElementById('spinWheelBtn').onclick = async () => {\n  if(!window.userId){ window.requireAuth('Пожалуйста, авторизуйтесь для участия.'); return; }`
);

// 7. Guard "Заказать" in product cards 
html = html.replaceAll(
  `const orderBtn = div.querySelector('.orderBtn');
      if (orderBtn) {
        orderBtn.onclick = (e) => {
          e.stopPropagation();
          switchTab('calculator', p);
        };
      }`,
  `const orderBtn = div.querySelector('.orderBtn');
      if (orderBtn) {
        orderBtn.onclick = (e) => {
          e.stopPropagation();
          if(!window.userId) { window.requireAuth('Пожалуйста, авторизуйтесь для заказа.'); return; }
          switchTab('calculator', p);
        };
      }`
);

// 8. Promotions check
html = html.replaceAll(
  `const partakeBtn = div.querySelector('.promoPartakeBtn');
      if (partakeBtn) {
        partakeBtn.onclick = (e) => {`,
  `const partakeBtn = div.querySelector('.promoPartakeBtn');
      if (partakeBtn) {
        partakeBtn.onclick = (e) => {
          if(!window.userId) { window.requireAuth('Пожалуйста, авторизуйтесь для участия.'); return; }`
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed index.html successfully!');
