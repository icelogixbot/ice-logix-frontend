const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const securityPanelRegex = /<div id="settingsPanel-security"[\s\S]*?<\/div>/;

const newSecurityPanel = `<div id="settingsPanel-security" class="p-5 overflow-y-auto flex-1 space-y-4 \${initialTab!=='security'?'hidden':''}">
        <p class="text-white/60 text-sm">Управление способами входа и безопасностью.</p>
        
        <div class="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p class="text-white text-xs font-semibold uppercase tracking-wider mb-2 text-white/50">Привязка аккаунтов</p>
          
          <button id="linkGoogleBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition" style="background: rgba(234,67,53,0.1); border: 1px solid rgba(234,67,53,0.25);">
            <div class="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span class="font-semibold text-white text-sm">Google</span>
            </div>
            <span class="text-xs text-white/50">Привязать</span>
          </button>
          
          <button id="linkAppleBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <div class="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="color:#ffffff;"><path d="M16.365 21.444c-1.332 1.405-2.651 1.4-3.955.086-1.19-1.2-2.316-1.187-3.486 0-1.385 1.4-2.721 1.428-4.043.08-3.036-3.111-4.707-8.31-2.482-12.825 1.134-2.296 3.013-3.714 5.234-3.743 1.572-.016 3.031.975 4.02.975.986 0 2.833-1.182 4.793-1.01 1.637.067 3.125.77 4.148 2.106-3.415 2.115-2.88 6.772.634 8.163-.787 2.111-1.956 4.316-3.863 6.168zM15.426 5.518c-.85.98-2.126 1.611-3.266 1.516-.25-1.428.468-2.85 1.258-3.791.905-1.083 2.304-1.727 3.402-1.631.183 1.428-.48 2.838-1.394 3.906z"/></svg>
              <span class="font-semibold text-white text-sm">Apple</span>
            </div>
            <span class="text-xs text-white/50">Привязать</span>
          </button>
          
          <button id="addEmailPasswordBtn" class="w-full py-3 px-4 rounded-xl flex items-center justify-between transition" style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3);">
            <div class="flex items-center gap-3">
              <span class="ix text-purple-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              <span class="font-semibold text-white text-sm">Добавить пароль</span>
            </div>
            <span class="text-xs text-white/50">Установить</span>
          </button>
        </div>

        <button id="securityRecoveryBtn" class="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-left transition" style="background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);">
          <span class="ix"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          <div class="flex-1">
            <p class="font-semibold text-white text-sm">Сброс аккаунта</p>
            <p class="text-xs text-white/50">Полный выход со всех устройств</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:rgba(255,255,255,0.4);"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>`;

html = html.replace(securityPanelRegex, newSecurityPanel);

// Now inject the JS handlers for these buttons into the modal
const jsInjectionRegex = /modal\.querySelector\('#resetSettingsBtn'\)\.onclick = \(\) => \{[\s\S]*?\};/;
const newJsLogic = `modal.querySelector('#resetSettingsBtn').onclick = () => {
    selectedTheme = 'dark'; applyTheme('dark');
    modal.querySelectorAll('.theme-btn').forEach(b => { b.classList.toggle('border-cyan-500', b.dataset.theme === 'dark'); b.classList.toggle('border-white/20', b.dataset.theme !== 'dark'); });
    modal.querySelector('#notifyStatusChanges').checked = true;
    modal.querySelector('#notifyNews').checked = true;
    modal.querySelector('#notifyPromotions').checked = true;
  };

  const linkGoogle = modal.querySelector('#linkGoogleBtn');
  if (linkGoogle) {
    linkGoogle.onclick = async () => {
      try {
        const { error } = await supabaseClient.auth.linkIdentity({ provider: 'google' });
        if (error) throw error;
      } catch(e) { tgUtil.alert('Ошибка привязки Google: ' + e.message); }
    };
  }

  const linkApple = modal.querySelector('#linkAppleBtn');
  if (linkApple) {
    linkApple.onclick = () => {
      tgUtil.alert('Привязка Apple временно отключена.');
    };
  }

  const addPassword = modal.querySelector('#addEmailPasswordBtn');
  if (addPassword) {
    addPassword.onclick = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.email?.includes('@icelogix.local')) {
        tgUtil.alert('Вы вошли через Telegram. В целях безопасности, смена пароля для таких аккаунтов пока недоступна.');
        return;
      }
      const newPwd = prompt('Введите новый пароль для входа по Email (минимум 6 символов):');
      if (!newPwd || newPwd.length < 6) {
        if (newPwd !== null) tgUtil.alert('Пароль слишком короткий.');
        return;
      }
      try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
        if (error) throw error;
        tgUtil.alert('Пароль успешно установлен! Теперь вы можете входить по Email.');
      } catch(e) {
        tgUtil.alert('Ошибка установки пароля: ' + e.message);
      }
    };
  }`;

html = html.replace(jsInjectionRegex, newJsLogic);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Account linking UI added");
