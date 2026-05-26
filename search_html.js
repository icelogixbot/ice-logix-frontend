const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

const query = process.argv[2] || 'profile';
console.log(`Searching for "${query}"...`);

let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes(query.toLowerCase())) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
    count++;
    if (count > 40) {
      console.log('Too many matches, truncating...');
      break;
    }
  }
}
console.log(`Found ${count} matches.`);
