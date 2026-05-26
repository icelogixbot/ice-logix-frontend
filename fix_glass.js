const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
let count = 0;

content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl p-5 shadow-lg"/g, () => { count++; return 'class="glass-card"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl p-4"/g, () => { count++; return 'class="glass-card"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl p-4 mt-4"/g, () => { count++; return 'class="glass-card mt-4"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-xl p-4 border border-white\/10"/g, () => { count++; return 'class="glass-card"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white\/10"/g, () => { count++; return 'class="glass-card overflow-hidden !p-0"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-2xl max-w-md w-full p-5"/g, () => { count++; return 'class="glass-card max-w-md w-full"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3"/g, () => { count++; return 'class="glass-card p-3 flex items-center gap-3"'; });
content = content.replace(/class="bg-white\/10 backdrop-blur-md rounded-xl p-4 mt-4"/g, () => { count++; return 'class="glass-card mt-4"'; });
content = content.replace(/class="course-card bg-white\/10 backdrop-blur-md rounded-2xl p-4 border border-white\/10"/g, () => { count++; return 'class="course-card glass-card"'; });

fs.writeFileSync('index.html', content, 'utf8');
console.log('Replaced ' + count + ' occurrences.');
