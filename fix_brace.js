const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const strWithBrace = `  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };
}

  document.getElementById('verifyCodeBtn').onclick`;

const strWithoutBrace = `  overlay.querySelector('#authSocialApple').onclick = () => { tgUtil.alert('Вход через Apple временно недоступен.'); };

  document.getElementById('verifyCodeBtn').onclick`;

if (html.includes(strWithBrace)) {
    html = html.replace(strWithBrace, strWithoutBrace);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Fixed extra brace!');
} else {
    console.log('Could not find the block to replace.');
}
