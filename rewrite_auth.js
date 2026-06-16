const fs = require('fs');

const newAuthCode = `function showAuthPage() {
  const overlay = document.createElement('div');
  overlay.id = 'authPageOverlay';
  overlay.className = 'fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 overflow-y-auto backdrop-blur-md';
  overlay.style.cssText = 'background: rgba(15, 23, 42, 0.85);';

  overlay.innerHTML = \`
    <div class="w-full max-w-sm bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl p-6 overflow-hidden relative">
      <button id="authCloseBtn" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      
      <div class="text-center mb-6 mt-2">
        <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2)); border: 1px solid rgba(6,182,212,0.3);">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#22d3ee;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 class="text-white text-2xl font-bold mb-1">ICE LOGIX</h2>
        <p class="text-white/50 text-sm" id="authSubtitle">Вход в систему</p>
      </div>

      <!-- Главные табы: Вход / Регистрация -->
      <div class="flex rounded-xl p-1 mb-5 bg-white/5 border border-white/10 text-xs">
        <button id="authTabLogin" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white" style="background: linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3));">Вход</button>
        <button id="authTabRegister" class="flex-1 py-2.5 rounded-lg font-bold transition-all text-white/50 bg-transparent">Регистрация</button>
      </div>

      <!-- Выбор метода: Почта / СМС -->
      <div class="flex rounded-xl p-1 mb-4 bg-slate-800/50 border border-white/5 text-[10px]">
        <button id="methodTabEmail" class="flex-1 py-1.5 rounded-md font-bold transition-all text-white bg-white/10">Email</button>
        <button id="methodTabPhone" class="flex-1 py-1.5 rounded-md font-bold transition-all text-white/40 bg-transparent">Телефон</button>
      </div>

      <!-- Phone Form -->
      <div id="authPhoneForm" class="space-y-4 mb-6 hidden">
        <div id="phoneInputStep">
          <label class="text-white/60 text-xs font-semibold block mb-1">Номер телефона</label>
          <input type="tel" id="authPhoneInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="+375XXXXXXXXX">
          <button id="authPhoneSendCodeBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Получить код</button>
        </div>
      </div>

      <!-- Email Form -->
      <div id="authEmailForm" class="space-y-4 mb-6 block">
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Email</label>
          <input type="email" id="authEmailInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="user@example.com">
        </div>
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Пароль</label>
          <input type="password" id="authPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <div id="authConfirmPasswordContainer" class="hidden">
          <label class="text-white/60 text-xs font-semibold block mb-1">Подтвердите пароль</label>
          <input type="password" id="authConfirmPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Войти</button>
      </div>

      <p id="authErrorMsg" class="text-red-400 text-xs text-center mb-4 hidden bg-red-500/10 p-2 rounded-lg"></p>

      <!-- Divider -->
      <div class="flex items-center gap-3 mb-5">
        <div class="flex-1 border-t border-white/10"></div>
        <span class="text-white/30 text-[10px] uppercase tracking-wider font-bold">Или через соцсети</span>
        <div class="flex-1 border-t border-white/10"></div>
      </div>

      <!-- Social buttons -->
      <div class="flex gap-3 justify-center">
        <button id="authSocialTg" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(36,161,222,0.15); border: 1px solid rgba(36,161,222,0.3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#29b6f6;"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        </button>
        <button id="authSocialGoogle" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.25);">
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        </button>
        <button id="authSocialApple" class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#ffffff;"><path d="M16.365 21.444c-1.332 1.405-2.651 1.4-3.955.086-1.19-1.2-2.316-1.187-3.486 0-1.385 1.4-2.721 1.428-4.043.08-3.036-3.111-4.707-8.31-2.482-12.825 1.134-2.296 3.013-3.714 5.234-3.743 1.572-.016 3.031.975 4.02.975.986 0 2.833-1.182 4.793-1.01 1.637.067 3.125.77 4.148 2.106-3.415 2.115-2.88 6.772.634 8.163-.787 2.111-1.956 4.316-3.863 6.168zM15.426 5.518c-.85.98-2.126 1.611-3.266 1.516-.25-1.428.468-2.85 1.258-3.791.905-1.083 2.304-1.727 3.402-1.631.183 1.428-.48 2.838-1.394 3.906z"/></svg>
        </button>
      </div>
    </div>
  \`;

  document.body.appendChild(overlay);

  let currentTab = 'login';
  let currentMethod = 'email';
  
  const loginTabBtn = overlay.querySelector('#authTabLogin');
  const registerTabBtn = overlay.querySelector('#authTabRegister');
  const subtitle = overlay.querySelector('#authSubtitle');

  const methodEmailBtn = overlay.querySelector('#methodTabEmail');
  const methodPhoneBtn = overlay.querySelector('#methodTabPhone');
  
  const errEl = overlay.querySelector('#authErrorMsg');
  
  const phoneForm = overlay.querySelector('#authPhoneForm');
  const emailForm = overlay.querySelector('#authEmailForm');
  const confirmPwdContainer = overlay.querySelector('#authConfirmPasswordContainer');
  
  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');
  const confirmPasswordInput = overlay.querySelector('#authConfirmPasswordInput');
  const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');

  overlay.querySelector('#authCloseBtn').onclick = () => overlay.remove();

  const switchAuthTab = (tab) => {
    currentTab = tab;
    errEl.classList.add('hidden');
    
    emailInput.value = '';
    passwordInput.value = '';
    confirmPasswordInput.value = '';
    
    if (tab === 'login') {
      loginTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      loginTabBtn.style.color = '#fff';
      registerTabBtn.style.background = 'transparent';
      registerTabBtn.style.color = 'rgba(255,255,255,0.5)';
      subtitle.textContent = 'Вход в систему';
      confirmPwdContainer.classList.add('hidden');
      emailSubmitBtn.textContent = 'Войти';
    } else {
      registerTabBtn.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(139,92,246,0.3))';
      registerTabBtn.style.color = '#fff';
      loginTabBtn.style.background = 'transparent';
      loginTabBtn.style.color = 'rgba(255,255,255,0.5)';
      subtitle.textContent = 'Регистрация аккаунта';
      confirmPwdContainer.classList.remove('hidden');
      emailSubmitBtn.textContent = 'Зарегистрироваться';
    }
  };

  const switchMethodTab = (method) => {
    currentMethod = method;
    errEl.classList.add('hidden');
    if (method === 'email') {
      methodEmailBtn.style.background = 'rgba(255,255,255,0.1)';
      methodEmailBtn.style.color = '#fff';
      methodPhoneBtn.style.background = 'transparent';
      methodPhoneBtn.style.color = 'rgba(255,255,255,0.4)';
      emailForm.classList.remove('hidden');
      emailForm.classList.add('block');
      phoneForm.classList.remove('block');
      phoneForm.classList.add('hidden');
    } else {
      methodPhoneBtn.style.background = 'rgba(255,255,255,0.1)';
      methodPhoneBtn.style.color = '#fff';
      methodEmailBtn.style.background = 'transparent';
      methodEmailBtn.style.color = 'rgba(255,255,255,0.4)';
      phoneForm.classList.remove('hidden');
      phoneForm.classList.add('block');
      emailForm.classList.remove('block');
      emailForm.classList.add('hidden');
    }
  };

  loginTabBtn.onclick = () => switchAuthTab('login');
  registerTabBtn.onclick = () => switchAuthTab('register');

  methodEmailBtn.onclick = () => switchMethodTab('email');
  methodPhoneBtn.onclick = () => switchMethodTab('phone');

  const phoneSendCodeBtn = overlay.querySelector('#authPhoneSendCodeBtn');
  if (phoneSendCodeBtn) {
    phoneSendCodeBtn.onclick = () => {
      tgUtil.alert('Вход по СМС временно недоступен. Используйте Email или Telegram.');
    };
  }

  // --- Auth Flow ---
  emailSubmitBtn.onclick = async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { errEl.textContent = 'Заполните email и пароль'; errEl.classList.remove('hidden'); return; }
    
    if (currentTab === 'register') {
      if (password.length < 6) {
        errEl.textContent = 'Пароль должен быть не менее 6 символов';
        errEl.classList.remove('hidden');
        return;
      }
      if (password !== confirmPasswordInput.value) {
        errEl.textContent = 'Пароли не совпадают';
        errEl.classList.remove('hidden');
        return;
      }
    }
    
    errEl.classList.add('hidden');
    emailSubmitBtn.textContent = 'Ожидайте...'; emailSubmitBtn.disabled = true;
    try {
      if (currentTab === 'login') {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
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

  // --- Socials ---
  overlay.querySelector('#authSocialTg').onclick = () => { tgUtil.alert('Вход через Telegram временно недоступен в браузерной версии.'); };
  overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно недоступен.'); };
  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };
}
`;

let html = fs.readFileSync('index.html', 'utf8');

const startIdx = html.indexOf('function showAuthPage() {');
const endIdx = html.indexOf('async function renderCart() {');

if (startIdx !== -1 && endIdx !== -1) {
  html = html.substring(0, startIdx) + newAuthCode + "\\n" + html.substring(endIdx);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Replaced showAuthPage successfully!');
} else {
  console.log('Could not find function bounds.');
}
