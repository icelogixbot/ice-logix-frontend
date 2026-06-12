const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The problematic block in index.html is:
//   // --- Auth Flow ---
//   const emailInput = overlay.querySelector('#authEmailInput');
//   const passwordInput = overlay.querySelector('#authPasswordInput');
//   const emailSubmitBtn = overlay.querySelector('#authEmailSubmitBtn');
//
//   const emailInput = overlay.querySelector('#authEmailInput');
//   const passwordInput = overlay.querySelector('#authPasswordInput');

// Let's replace all of that with a clean single declaration

const badBlockRegex = /\/\/ --- Auth Flow ---[\s\S]*?const passwordInput = overlay\.querySelector\('#authPasswordInput'\);/;

const cleanBlock = `// --- Auth Flow ---
  const emailInput = overlay.querySelector('#authEmailInput');
  const passwordInput = overlay.querySelector('#authPasswordInput');`;

// Wait, emailSubmitBtn is already declared higher up in the tabs logic.
// So we ONLY need emailInput and passwordInput here.

html = html.replace(badBlockRegex, cleanBlock);

// Also let's check for multiple authEmailForm blocks
// In my previous replace, I might have duplicated the HTML block.
const dupHtmlRegex = /<div id="authEmailForm" class="space-y-4 mb-6 block">[\s\S]*?<\/div>\s*<div id="authEmailForm" class="space-y-4 mb-6 hidden">[\s\S]*?<\/div>/;
const cleanHtml = `<div id="authEmailForm" class="space-y-4 mb-6 hidden">
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Email</label>
          <input type="email" id="authEmailInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="user@example.com">
        </div>
        <div>
          <label class="text-white/60 text-xs font-semibold block mb-1">Пароль</label>
          <input type="password" id="authPasswordInput" class="w-full p-3.5 rounded-xl text-white text-base bg-white/5 border border-white/20 focus:border-cyan-500 transition-colors" placeholder="••••••••">
        </div>
        <button id="authEmailSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-4 transition-all" style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">Войти</button>
      </div>`;

html = html.replace(dupHtmlRegex, cleanHtml);

fs.writeFileSync('index.html', html, 'utf8');
console.log("Syntax errors fixed!");
