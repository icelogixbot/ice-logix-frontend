const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `        }
        
        attachEventListeners();
        
        const avatarDiv = document.querySelector('#avatar');`;

const replacementStr = `        }
        
        if (!isRegistered) {
          userName = 'Гость';
          userAvatarUrl = null;
        }

        attachEventListeners();
        
        const avatarDiv = document.querySelector('#avatar');`;

if (html.includes(targetStr)) {
    html = html.replace(targetStr, replacementStr);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('Fixed profile override!');
} else {
    // Regex fallback
    const fallbackRegex = /\}\s*attachEventListeners\(\);\s*const avatarDiv = document\.querySelector\('#avatar'\);/;
    if (fallbackRegex.test(html)) {
        html = html.replace(fallbackRegex, `}
        
        if (!isRegistered) {
          userName = 'Гость';
          userAvatarUrl = null;
        }

        attachEventListeners();
        const avatarDiv = document.querySelector('#avatar');`);
        fs.writeFileSync('index.html', html, 'utf8');
        console.log('Fixed profile override (fallback)!');
    } else {
        console.log('Could not find the target block for override!');
    }
}
