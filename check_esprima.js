const fs = require('fs');
const esprima = require('esprima');
const code = fs.readFileSync('test.js', 'utf8');

const tokens = esprima.tokenize(code, { loc: true, tolerant: true });

let stack = [];
for (let t of tokens) {
  if (t.type === 'Punctuator') {
    if (t.value === '{') {
      stack.push(t);
    } else if (t.value === '}') {
      stack.pop();
    }
  }
}

console.log("Unclosed { found at:");
for (let t of stack) {
  console.log(`Line: ${t.loc.start.line}, Col: ${t.loc.start.column}`);
}
