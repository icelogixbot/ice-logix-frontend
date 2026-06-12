const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `        // Update UI states
        if (!isRegistered) {
          const loginBtn = document.getElementById('loginBtn');
          if (loginBtn) {
            loginBtn.style.display = 'inline-block';
            loginBtn.style.padding = '6px 14px';
            loginBtn.style.fontSize = '13px';
          }
        }`;

const replacementStr = `        // Update UI states
        if (!isRegistered) {
          // Hide TG profile info if not officially registered
          userName = 'Гость';
          userAvatarUrl = null;
          
          const loginBtn = document.getElementById('loginBtn');
          if (loginBtn) {
            loginBtn.style.display = 'inline-block';
            loginBtn.style.padding = '6px 14px';
            loginBtn.style.fontSize = '13px';
          }
        }`;

if (html.includes(targetStr)) {
    html = html.replace(targetStr, replacementStr);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Fixed profile info leak!');
} else {
    // try finding the block with regex since spaces might differ
    const fallbackRegex = /\/\/\s*Update UI states\s*if\s*\(!isRegistered\)\s*\{\s*const loginBtn = document\.getElementById\('loginBtn'\);/;
    if (fallbackRegex.test(html)) {
        html = html.replace(fallbackRegex, `// Update UI states
        if (!isRegistered) {
          userName = 'Гость';
          userAvatarUrl = null;
          const loginBtn = document.getElementById('loginBtn');`);
        fs.writeFileSync('index.html', html, 'utf8');
        console.log('Fixed profile info leak (fallback)!');
    } else {
        console.log('Could not find the target block!');
    }
}
