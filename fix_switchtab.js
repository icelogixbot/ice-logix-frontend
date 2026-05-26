const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Find switchTab function and add the cleanup lines
content = content.replace(
    /function switchTab\(tabName, subScreen = null\) \{\n\s*if \(tabName !== 'neworder'\) \{\n\s*window.tempOrder = null;\n\s*\}/,
    "function switchTab(tabName, subScreen = null) {\n      if (tabName !== 'neworder') {\n      window.tempOrder = null;\n      }\n      tgUtil.hideMainButton();\n      tgUtil.setBackButton(null);"
);

fs.writeFileSync('index.html', content, 'utf8');
console.log('Added cleanup handlers to switchTab.');
