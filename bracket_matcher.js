const fs = require('fs');
const code = fs.readFileSync('test.js', 'utf8');

let stack = [];
let i = 0;
while (i < code.length) {
  const c = code[i];
  if (c === '/' && code[i+1] === '/') {
    while (i < code.length && code[i] !== '\n') i++;
  } else if (c === '/' && code[i+1] === '*') {
    i += 2;
    while (i < code.length - 1 && !(code[i] === '*' && code[i+1] === '/')) i++;
    i += 2;
  } else if (c === "'" || c === '"' || c === '`') {
    const quote = c;
    i++;
    while (i < code.length) {
      if (code[i] === '\\') i += 2;
      else if (code[i] === quote) { i++; break; }
      // handle template literal interpolation
      else if (quote === '`' && code[i] === '$' && code[i+1] === '{') {
          // nested bracket inside template literal!
          // to keep it simple, we don't fully parse nested template literals.
          // since this codebase has complex nesting, let's just use acorn!
          i++;
      }
      else i++;
    }
  } else if (c === '{') {
    stack.push(i);
    i++;
  } else if (c === '}') {
    stack.pop();
    i++;
  } else {
    i++;
  }
}

const lines = code.split('\n');
function getLine(idx) {
  let len = 0;
  for(let i=0; i<lines.length; i++) {
    len += lines[i].length + 1;
    if (len > idx) return i + 1;
  }
  return -1;
}

console.log("Unclosed { at lines:", stack.map(getLine));
