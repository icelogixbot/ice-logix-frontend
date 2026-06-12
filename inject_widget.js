const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add window.onTelegramAuth
const onTelegramAuthCode = `
  window.onTelegramAuth = async function(user) {
    const errEl = document.getElementById('authError');
    if(errEl) errEl.classList.add('hidden');
    try {
      const res = await fetch('https://vrvwdagjpttvfvjanbwq.supabase.co/functions/v1/telegram-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetData: user })
      });
      const data = await res.json();
      if (data.ok && data.session) {
        await supabaseClient.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        const overlay = document.getElementById('authSocialTgContainer')?.closest('.fixed.inset-0.bg-black\\\\/90');
        if (overlay) await handleAuthSuccess(overlay);
        else location.reload();
      } else {
        throw new Error(data.error || 'Ошибка входа');
      }
    } catch(e) {
      if(errEl) {
        errEl.textContent = e.message || 'Ошибка Telegram Widget';
        errEl.classList.remove('hidden');
      }
    }
  };
`;

if (!html.includes('window.onTelegramAuth')) {
  // Inject before document.addEventListener('DOMContentLoaded')
  html = html.replace("document.addEventListener('DOMContentLoaded', async () => {", onTelegramAuthCode + "\n  document.addEventListener('DOMContentLoaded', async () => {");
}

// 2. Modify the Telegram button in showAuthModal
// Find: <button id="authSocialTg"...>...</button>
// Replace with: <div id="authSocialTgContainer"></div>
const tgButtonRegex = /<button id="authSocialTg"[\s\S]*?<\/button>/;
if (html.match(tgButtonRegex)) {
  html = html.replace(tgButtonRegex, '<div id="authSocialTgContainer" class="flex items-center justify-center"></div>');
}

// 3. Inject script logic inside showAuthModal
// We need to inject the script into the container after the modal is added to DOM.
// Find: overlay.querySelector('#authSocialGoogle').onclick
const scriptInjection = `
  const tgContainer = overlay.querySelector('#authSocialTgContainer');
  if (tgContainer) {
    if (window.Telegram?.WebApp?.initData) {
      tgContainer.innerHTML = \`<button class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(36,161,222,0.15); border: 1px solid rgba(36,161,222,0.3);" onclick="tgUtil.alert('Перезапустите бота для автоматического входа')"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#29b6f6;"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></button>\`;
    } else {
      const script = document.createElement('script');
      script.async = true;
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "icelogix_bot");
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      tgContainer.appendChild(script);
    }
  }

  // Remove old handler if any
  const oldTgHandlerRegex = /overlay\.querySelector\\\('#authSocialTg'\\\)[\s\S]*?\};\s*/g;
  html = html.replace(oldTgHandlerRegex, '');
`;

html = html.replace(/overlay\.querySelector\('#authSocialGoogle'\)\.onclick/, scriptInjection + "\n  overlay.querySelector('#authSocialGoogle').onclick");

fs.writeFileSync('index.html', html, 'utf8');
console.log("Widget injected");
