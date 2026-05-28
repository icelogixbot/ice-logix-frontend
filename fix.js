const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

let count = 0;
// Using single quotes everywhere inside the JS to avoid PowerShell escaping issues
let regex1 = /tgUtil\.alert\('<span class=.ix ix-(success|error|warning|info).>.*?<\/svg><\/span>\s*(.*?)'\)/g;
content = content.replace(regex1, (match, kind, msg) => {
    count++;
    let prefix = '';
    if (kind === 'success') prefix = '✅ ';
    else if (kind === 'error') prefix = '❌ ';
    else if (kind === 'warning') prefix = '⚠️ ';
    return "tgUtil.alert('" + prefix + msg + "')";
});

let regex2 = /tgUtil\.alert\('<span class=.ix ix-(success|error|warning|info).>.*?<\/svg><\/span>\s*'\s*\+\s*(.*?)\)/g;
content = content.replace(regex2, (match, kind, msgExp) => {
    count++;
    let prefix = '';
    if (kind === 'success') prefix = '✅ ';
    else if (kind === 'error') prefix = '❌ ';
    else if (kind === 'warning') prefix = '⚠️ ';
    return "tgUtil.alert('" + prefix + "' + " + msgExp + ")";
});

fs.writeFileSync('index.html', content, 'utf8');
console.log('Replaced ' + count + ' occurrences.');
