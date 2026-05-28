const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// The new design system uses .glass-card for cards, .filter-chip, etc.
let count = 0;
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white\/10 flex flex-col h-full"/g, () => {
    count++;
    return 'class="product-card flex flex-col h-full"'; // product-card has glass-card properties + hover effects
});

content = content.replace(/class="aspect-square bg-white\/20 flex items-center justify-center p-4 relative"/g, () => {
    count++;
    return 'class="aspect-square flex items-center justify-center p-4 relative" style="background: var(--glass-bg-strong);"';
});

content = content.replace(/class="text-white\/70 text-xs bg-white\/10 px-2 py-0\.5 rounded-full"/g, () => {
    count++;
    return 'class="text-xs px-2 py-0.5 rounded-full" style="color: var(--text-secondary); background: var(--glass-bg);"';
});

fs.writeFileSync('index.html', content, 'utf8');
console.log('Replaced ' + count + ' occurrences.');
