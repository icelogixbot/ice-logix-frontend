const fs = require('fs');
let html = fs.readFileSync('really_old_index.html', 'utf8');

// 1. Modify the Tabs HTML
const tabsRegex = /<!-- Tabs -->\s*<div class="flex rounded-xl p-1 mb-6 bg-white\/5 border border-white\/10">[\s\S]*?<!-- Auth Form -->/;
const newTabs = `<!-- Tabs -->
      <div class="flex rounded-xl p-1 mb-6 bg-white/5 border border-white/10 text-xs">
        <button id="authTabPhone" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white" style="background: linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3));">По телефону</button>
        <button id="authTabLogin" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white/50 bg-transparent">Вход</button>
        <button id="authTabRegister" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white/50 bg-transparent">Регистрация</button>
      </div>

      <!-- Phone Form -->
      <div id="authPhoneForm" class="space-y-4 mb-6 block">
        <div id="phoneInputStep">
          <label class="text-white/60 text-xs font-semibold block mb-1">Номер телефона</label>
          <input type="tel" id="authPhoneInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="+375XXXXXXXXX">
          <button id="authPhoneSendCodeBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Получить код</button>
        </div>
      </div>

      <!-- Auth Form -->`;

html = html.replace(tabsRegex, newTabs);

// Make email form hidden initially
html = html.replace(/<div id="authEmailForm" class="space-y-4 mb-6 block">/, '<div id="authEmailForm" class="space-y-4 mb-6 hidden">');

// 2. Revert Telegram Widget script block to static button alert
const replaceSocialsLogicRegex = /\/\/ --- Socials ---[\s\S]*?overlay\.querySelector\('#authSocialApple'\)\.onclick[\s\S]*?;/;

const newSocialsLogic = `// --- Socials ---
  overlay.querySelector('#authSocialTg').onclick = () => { tgUtil.alert('Вход через Telegram временно недоступен в браузерной версии.'); };
  overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно недоступен.'); };
  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };`;

html = html.replace(replaceSocialsLogicRegex, newSocialsLogic);

// 3. Tab switching logic update
const jsTabsLogicRegex = /let currentTab = 'login';[\s\S]*?overlay\.querySelector\('#authCloseBtn'\)\.onclick = \(\) => overlay\.remove\(\);/;

const newJsTabsLogic = `let currentTab = 'phone';
  
  const phoneTabBtn = overlay.querySelector('#authTabPhone');
  const loginTabBtn = overlay.querySelector('#authTabLogin');
  const registerTabBtn = overlay.querySelector('#authTabRegister');
  const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');
  const errEl = overlay.querySelector('#authErrorMsg');
  
  const phoneForm = overlay.querySelector('#authPhoneForm');
  const emailForm = overlay.querySelector('#authEmailForm');
  const phoneSendCodeBtn = overlay.querySelector('#authPhoneSendCodeBtn');

  if (phoneSendCodeBtn) {
    phoneSendCodeBtn.onclick = () => {
      tgUtil.alert('Вход по СМС временно недоступен. Используйте Email или Telegram.');
    };
  }

  const switchAuthTab = (tab) => {
    currentTab = tab;
    errEl.classList.add('hidden');
    
    // Reset all tabs
    [phoneTabBtn, loginTabBtn, registerTabBtn].forEach(btn => {
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(255,255,255,0.5)';
    });

    if (tab === 'phone') {
      phoneTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      phoneTabBtn.style.color = '#fff';
      phoneForm.classList.remove('hidden');
      phoneForm.classList.add('block');
      emailForm.classList.remove('block');
      emailForm.classList.add('hidden');
    } else if (tab === 'login') {
      loginTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      loginTabBtn.style.color = '#fff';
      phoneForm.classList.remove('block');
      phoneForm.classList.add('hidden');
      emailForm.classList.remove('hidden');
      emailForm.classList.add('block');
      emailSubmitBtn.textContent = 'Войти';
    } else if (tab === 'register') {
      registerTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      registerTabBtn.style.color = '#fff';
      phoneForm.classList.remove('block');
      phoneForm.classList.add('hidden');
      emailForm.classList.remove('hidden');
      emailForm.classList.add('block');
      emailSubmitBtn.textContent = 'Зарегистрироваться';
    }
  };

  phoneTabBtn.onclick = () => switchAuthTab('phone');
  loginTabBtn.onclick = () => switchAuthTab('login');
  registerTabBtn.onclick = () => switchAuthTab('register');
  
  overlay.querySelector('#authCloseBtn').onclick = () => overlay.remove();`;

html = html.replace(jsTabsLogicRegex, newJsTabsLogic);

// Fix the syntax error from original really_old_index.html duplicated variables
const badBlockRegex = /\/\/ --- Auth Flow ---[\s\S]*?const passwordInput = overlay\.querySelector\('#authPasswordInput'\);/;
const cleanBlock = `// --- Auth Flow ---
  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;
html = html.replace(badBlockRegex, cleanBlock);

// Remove the duplicated emailInput block safely
const duplicateVars = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');

  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;
const cleanVars = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;
html = html.replace(duplicateVars, cleanVars);

// Also remove duplicate AuthEmailForm blocks safely if any exist in really_old_index.html
const dupHtmlRegex = /<div id="authEmailForm" class="space-y-4 mb-6 block">[\s\S]*?<\/div>\s*<div id="authEmailForm" class="space-y-4 mb-6 hidden">[\s\S]*?<\/div>/;
const cleanHtml = `<div id="authEmailForm" class="space-y-4 mb-6 hidden">
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Email</label>
          <input type="email" id="authEmailInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="user@example.com">
        </div>
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Пароль</label>
          <input type="password" id="authPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Войти</button>
      </div>`;
html = html.replace(dupHtmlRegex, cleanHtml);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Restored cleanly from really_old_index.html!");
