const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The exact string in index.html right now (since we reverted the bad commit)
const searchStr1 = `  // --- Socials ---
  overlay.querySelector('#authSocialTg').onclick = () => {
    tgUtil.alert('Авторизация через Telegram будет происходить автоматически при переходе из бота.');
  };
  overlay.querySelector('#authSocialGoogle').onclick = async () => {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch(e) { tgUtil.alert('Google OAuth Ошибка: ' + e.message); }
  };
  overlay.querySelector('#authSocialApple').onclick = async () => {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'apple' });
      if (error) throw error;
    } catch(e) { tgUtil.alert('Apple OAuth Ошибка: ' + e.message); }
  };`;

const searchStr2 = searchStr1; // It appears twice, once for showAuthPage and once for showAuthModal

// Let's replace ALL instances of this string with initAuthSocials(overlay);
const replacement = `  // --- Socials ---
  initAuthSocials(overlay);`;

if (html.includes(searchStr1)) {
    html = html.split(searchStr1).join(replacement);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Successfully replaced socials with initAuthSocials.");
} else {
    // maybe encoding issues, let's try a regex
    const regex = /\/\/ --- Socials ---[\s\S]*?overlay\.querySelector\('#authSocialApple'\)\.onclick = async \(\) => \{[\s\S]*?catch\(e\) \{ tgUtil\.alert\('Apple OAuth Ошибка: ' \+ e\.message\); \}\s*\};/g;
    
    if (html.match(regex)) {
        html = html.replace(regex, replacement);
        fs.writeFileSync('index.html', html, 'utf8');
        console.log("Successfully replaced socials using regex.");
    } else {
        console.log("Failed to find the Socials block. Check encoding or exact string.");
    }
}
