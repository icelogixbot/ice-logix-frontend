const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /\/\/ --- Socials ---[\s\S]*?overlay\.querySelector\('#authSocialTg'\)\.onclick[\s\S]*?overlay\.querySelector\('#authSocialGoogle'\)\.onclick[\s\S]*?overlay\.querySelector\('#authSocialApple'\)\.onclick[\s\S]*?\};\s*/g;

let matchCount = 0;
html = html.replace(regex, (match) => {
    matchCount++;
    return `// --- Socials ---
  initAuthSocials(overlay);
  `;
});

console.log("Replaced instances:", matchCount);

// Also we need to apply the phone stub correctly since we reverted the commit.
const phoneRegex = /const \{ error \} = await supabaseClient\.auth\.signInWithOtp\(\{ phone \}\);[\s\S]*?phoneCodeStep\.classList\.remove\('hidden'\);/g;

let phoneMatchCount = 0;
html = html.replace(phoneRegex, (match) => {
    phoneMatchCount++;
    return `// Stub for phone auth
      tgUtil.alert('Вход по СМС временно недоступен (подключение провайдера в процессе). Пожалуйста, используйте Email или Telegram.');
      throw new Error('СМС временно недоступны');`;
});
console.log("Replaced phone instances:", phoneMatchCount);

fs.writeFileSync('index.html', html, 'utf8');
