const fs = require('fs');
const acornLoose = require('acorn-loose');
const acornWalk = require('acorn-walk');
const code = fs.readFileSync('test.js', 'utf8');

const ast = acornLoose.parse(code, { ecmaVersion: 2022, locations: true });

let lastNode = null;
acornWalk.simple(ast, {
  ExpressionStatement(node) {
    if (!lastNode || node.end > lastNode.end) lastNode = node;
  },
  FunctionDeclaration(node) {
    if (!lastNode || node.end > lastNode.end) lastNode = node;
  }
});

console.log("Last successfully parsed node type:", lastNode.type);
console.log("Last successfully parsed node location:", lastNode.loc.start, lastNode.loc.end);
console.log("Code snippet at last node:");
console.log(code.substring(lastNode.start, lastNode.end));
