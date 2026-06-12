const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const duplicateVars = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');

  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;

const cleanVars = `  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;

html = html.replace(duplicateVars, cleanVars);

// Fallback regex if precise string replacement fails due to \r\n differences
html = html.replace(/const emailInput = overlay\.querySelector\('#authEmailInput'\);\s*const passwordInput = overlay\.querySelector\('#authPasswordInput'\);\s*const emailInput = overlay\.querySelector\('#authEmailInput'\);\s*const passwordInput = overlay\.querySelector\('#authPasswordInput'\);/g, cleanVars);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed variable duplication');
