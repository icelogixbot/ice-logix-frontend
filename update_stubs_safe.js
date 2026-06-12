const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const tgWidgetCode = `  const tgContainer = overlay.querySelector('#authSocialTg').parentElement;
  if (tgContainer) {
    if (window.Telegram?.WebApp?.initData) {
      tgContainer.innerHTML = \`<button class="w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95" style="background: rgba(36,161,222,0.15); border: 1px solid rgba(36,161,222,0.3);" onclick="tgUtil.alert('Перезапустите Mini App для автоматического входа')"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color:#29b6f6;"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></button>\`;
    } else {
      tgContainer.innerHTML = ''; // clear dummy buttons
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
  
  overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно отключен.'); };
  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно отключен.'); };`;

function replaceSocialsBlock(htmlStr) {
    const startIndex = htmlStr.indexOf('  // --- Socials ---');
    if (startIndex === -1) return htmlStr;
    const endStr = "};";
    
    // Find the end of the apple block
    let currentIndex = startIndex;
    for(let i=0; i<3; i++) { // Tg, Google, Apple
        currentIndex = htmlStr.indexOf('};', currentIndex + 1);
        if (currentIndex === -1) return htmlStr; // parsing error
    }
    
    // The exact string to replace
    const blockToReplace = htmlStr.substring(startIndex, currentIndex + 2);
    
    const replacementBlock = `  // --- Socials ---
${tgWidgetCode}
`;
    
    return htmlStr.replace(blockToReplace, replacementBlock);
}

// First occurrence
let modified = replaceSocialsBlock(html);
// Second occurrence
modified = replaceSocialsBlock(modified);

fs.writeFileSync('index.html', modified, 'utf8');

// Handle Phone Stubs (there are two as well)
function replacePhoneBlock(htmlStr) {
    const sendCodeRegex = /const \{ error \} = await supabaseClient\.auth\.signInWithOtp\(\{ phone \}\);[\s\S]*?phoneCodeStep\.classList\.remove\('hidden'\);/;
    
    return htmlStr.replace(sendCodeRegex, `// Stub for phone auth
      tgUtil.alert('Вход по СМС временно недоступен. Используйте Email или Telegram.');
      throw new Error('СМС недоступны');`);
}

modified = replacePhoneBlock(modified);
modified = replacePhoneBlock(modified);

fs.writeFileSync('index.html', modified, 'utf8');
console.log("Safe replacement finished.");
