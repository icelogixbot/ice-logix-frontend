const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(
    /const queryLine = \(queryText && sourceLabel\)\n\s*\? <div class="text-xs text-white\/50 mb-2">\$\{sourceLabel\}: <span class="text-cyan-300">"\$\{escHtmlC\(queryText\)\}"<\/span><\/div>\n\s*: '';/,
    "const queryLine = (queryText && sourceLabel)\n      ? <div class=\"text-xs text-white/50 mb-2\">\: <span class=\"text-cyan-300\">\"\\"</span></div>\n      : '';\n    const replicaBanner = payload.authenticity_tier === 'replica' ? <div class=\"bg-orange-500/20 border border-orange-500/50 text-orange-400 p-2 rounded-lg text-xs font-bold mb-3 flex items-center gap-2\"><span class=\"ix\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg></span> 🔍 Найдены реплики</div> : '';"
);

content = content.replace(
    /<div class="flex flex-col gap-2">\$\{cards\}<\/div>/,
    "\n      <div class=\"flex flex-col gap-2\"></div>"
);

fs.writeFileSync('index.html', content, 'utf8');
console.log('Modified index.html replica banner');
