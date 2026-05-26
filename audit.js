const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

const findings = [];
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const flagRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/gu; // Country flags

lines.forEach((line, i) => {
    const num = i + 1;
    if (line.includes('class=\"card\"')) findings.push(num + ': Old card class: ' + line.trim());
    if (line.includes('tgUtil.alert') && !line.includes('//')) findings.push(num + ': tgUtil.alert (check if needed): ' + line.trim());
    if (line.includes('alert(') && !line.includes('tgUtil.alert') && !line.includes('//')) findings.push(num + ': alert(): ' + line.trim());
    
    // Check for emojis
    let matches = line.match(emojiRegex);
    if (matches) {
        // filter out flags and allowed emojis
        matches = matches.filter(m => {
            const isFlag = m.match(flagRegex);
            const isAllowed = ['❄️', '🇨🇳', '🇵🇱', '🇪🇺', '🇷🇺'].includes(m) || m === '❄';
            return !isFlag && !isAllowed;
        });
        if (matches.length > 0) {
            findings.push(num + ': Emoji found (' + matches.join(',') + '): ' + line.trim().substring(0, 100));
        }
    }
});

console.log('Total findings: ' + findings.length);
console.log(findings.slice(0, 50).join('\n'));
