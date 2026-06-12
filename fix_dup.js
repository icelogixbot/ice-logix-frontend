const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const badBlock = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');

  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;

const goodBlock = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;

if (html.includes(badBlock)) {
    html = html.replace(badBlock, goodBlock);
} else {
    // try removing it with regex if spaces mismatch
    html = html.replace(/const emailInput = overlay\.querySelector\('#authEmailInput'\);\s*const passwordInput = overlay\.querySelector\('#authPasswordInput'\);\s*const emailInput = overlay\.querySelector\('#authEmailInput'\);\s*const passwordInput = overlay\.querySelector\('#authPasswordInput'\);/g, goodBlock);
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed emailInput duplication');
