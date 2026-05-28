const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
let count = 0;

content = content.replace(/class="([^"]*)bg-cyan-500(?:\/70)?(?:\shover:bg-cyan-600|\shover:bg-cyan-500)?(?:\spx-[0-9]+)?(?:\spy-[0-9.]+)?(?:\srounded(?:-xl|-full|-lg|-md)?)?(?:\stext-(?:white|xs|sm|lg))?(?:\sfont-bold)?([^"]*)"/g, (match, before, after) => {
    count++;
    let cls = (before + after).replace(/\s+/g, ' ').trim();
    if (cls) return "class=\"btn-primary " + cls + "\"";
    return "class=\"btn-primary\"";
});

content = content.replace(/class="([^"]*)bg-white\/20(?:\shover:bg-white\/30)?(?:\spx-[0-9]+)?(?:\spy-[0-9.]+)?(?:\srounded(?:-xl|-full|-lg|-md)?)?(?:\stext-(?:white\/70|xs|sm))?([^"]*)"/g, (match, before, after) => {
    if (before.includes('cart-qty-btn') || before.includes('instruction-btn')) return match;
    count++;
    let cls = (before + after).replace(/\s+/g, ' ').trim();
    if (cls) return "class=\"btn-secondary " + cls + "\"";
    return "class=\"btn-secondary\"";
});

fs.writeFileSync('index.html', content, 'utf8');
console.log('Replaced ' + count + ' button occurrences.');
