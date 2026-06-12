const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace the Tabs definition
const oldTabsRegex = /<div class="flex rounded-xl p-1 mb-6 bg-white\/5 border border-white\/10">[\s\S]*?<\/div>/;

const newTabs = `<div class="flex rounded-xl p-1 mb-6 bg-white/5 border border-white/10">
        <button id="authTabLogin" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all text-white" style="background: linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3));">Вход</button>
        <button id="authTabRegister" class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all text-white/50 bg-transparent">Регистрация</button>
      </div>`;

html = html.replace(oldTabsRegex, newTabs);

// Remove the old phone form logic completely
const oldPhoneFormRegex = /<!-- Phone Form -->[\s\S]*?<!-- Email Form -->/;
const newAuthForm = `<!-- Auth Form -->
      <div id="authEmailForm" class="space-y-4 mb-6 block">
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Email</label>
          <input type="email" id="authEmailInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="your@email.com">
        </div>
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Пароль</label>
          <input type="password" id="authPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Войти</button>
      </div>`;

html = html.replace(oldPhoneFormRegex, newAuthForm);

// Now JS logic
const oldJsLogicRegex = /let currentTab = 'phone';[\s\S]*?\/\/ --- Email Flow ---/g;
const newJsLogic = `let currentTab = 'login';
  
  const loginTabBtn = overlay.querySelector('#authTabLogin');
  const registerTabBtn = overlay.querySelector('#authTabRegister');
  const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');
  const errEl = overlay.querySelector('#authErrorMsg');

  const switchAuthTab = (tab) => {
    currentTab = tab;
    errEl.classList.add('hidden');
    if (tab === 'login') {
      loginTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      loginTabBtn.style.color = '#fff';
      registerTabBtn.style.background = 'transparent';
      registerTabBtn.style.color = 'rgba(255,255,255,0.5)';
      emailSubmitBtn.textContent = 'Войти';
    } else {
      registerTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      registerTabBtn.style.color = '#fff';
      loginTabBtn.style.background = 'transparent';
      loginTabBtn.style.color = 'rgba(255,255,255,0.5)';
      emailSubmitBtn.textContent = 'Зарегистрироваться';
    }
  };

  loginTabBtn.onclick = () => switchAuthTab('login');
  registerTabBtn.onclick = () => switchAuthTab('register');
  
  overlay.querySelector('#authCloseBtn').onclick = () => overlay.remove();

  // --- Auth Flow ---`;

html = html.replace(oldJsLogicRegex, newJsLogic);

// Modify the submit handler
const oldSubmitRegex = /emailSubmitBtn\.onclick = async \(\) => \{[\s\S]*?\/\/ --- Socials ---/g;
const newSubmit = `const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');

  emailSubmitBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { errEl.textContent = 'Заполните email и пароль'; errEl.classList.remove('hidden'); return; }
    errEl.classList.add('hidden');
    emailSubmitBtn.textContent = 'Ожидайте...'; emailSubmitBtn.disabled = true;
    try {
      if (currentTab === 'login') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase sign-up returns session if email_confirm is off. If it's on, session is null.
        // We will try to sign in just in case.
        await supabaseClient.auth.signInWithPassword({ email, password });
      }
      await handleAuthSuccess(overlay);
    } catch (e) {
      errEl.textContent = e.message || 'Ошибка авторизации';
      errEl.classList.remove('hidden');
      emailSubmitBtn.textContent = currentTab === 'login' ? 'Войти' : 'Зарегистрироваться'; 
      emailSubmitBtn.disabled = false;
    }
  };

  // --- Socials ---`;

html = html.replace(oldSubmitRegex, newSubmit);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Replaced Tabs correctly");
