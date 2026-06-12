const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Modify the Tabs HTML
const tabsRegex = /<!-- Tabs -->[\s\S]*?<!-- Auth Form -->/;
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

// Modify the display properties of Email forms
// Currently authEmailForm is block, let's make it hidden initially since Phone is default
html = html.replace(/<div id="authEmailForm" class="space-y-4 mb-6 block">/, '<div id="authEmailForm" class="space-y-4 mb-6 hidden">');

// 2. Revert Telegram Widget script block to static button alert
const socialsLogicRegex = /\/\/ --- Socials ---[\s\S]*?\/\/ --- Socials ---/;
// Wait, I replaced it earlier, let's find the exact block for socials in JS logic
// The block is:
//   // --- Socials ---
//   const tgContainer = overlay.querySelector('#authSocialTg').parentElement;
//   if (tgContainer) {
//     if (window.Telegram?.WebApp?.initData) {
// ...
//     }
//   }
//   
//   overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно отключен.'); };
//   overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно отключен.'); };

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

fs.writeFileSync('index.html', html, 'utf8');
console.log("Reverted Telegram widget, added back Phone form stub.");
