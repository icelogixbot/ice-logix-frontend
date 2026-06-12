const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The error is an extra `};` at the end of `authSocialApple` or similar.
// Let's replace the whole block manually to be absolutely certain it's clean and ends correctly.

const badSocialsStart = html.indexOf('// --- Socials ---');
const verifyCodeBtnStr = "document.getElementById('verifyCodeBtn').onclick";
const verifyCodeBtnIdx = html.indexOf(verifyCodeBtnStr);

if (badSocialsStart !== -1 && verifyCodeBtnIdx !== -1) {
    const newSocials = `// --- Socials ---
  overlay.querySelector('#authSocialTg').onclick = () => { tgUtil.alert('Вход через Telegram временно недоступен в браузерной версии.'); };
  overlay.querySelector('#authSocialGoogle').onclick = () => { tgUtil.alert('Вход через Google временно недоступен.'); };
  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };
}

  `;
    // We replace from badSocialsStart up to verifyCodeBtnIdx
    html = html.substring(0, badSocialsStart) + newSocials + html.substring(verifyCodeBtnIdx);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Fixed socials block precisely!");
} else {
    console.log("Could not find socials block bounds!");
}
