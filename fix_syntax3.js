const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix 1: The extra '};' at the end of the Socials block
html = html.replace("overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); }; };", "overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };");

// Fix 2: Restore emailSubmitBtn declaration
// Find:
//   const registerTabBtn = overlay.querySelector('#authTabRegister');
//   const errEl = overlay.querySelector('#authErrorMsg');
// And add emailSubmitBtn
html = html.replace(
  "const registerTabBtn = overlay.querySelector('#authTabRegister');\n  const errEl = overlay.querySelector('#authErrorMsg');",
  "const registerTabBtn = overlay.querySelector('#authTabRegister');\n  const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');\n  const errEl = overlay.querySelector('#authErrorMsg');"
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed extra brace and missing variable');
