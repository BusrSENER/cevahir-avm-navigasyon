const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Find the start of the data structure around position 220236
// Let's search for mPerUnit or builtAt
const marker = 'mPerUnit';
const idx = code.indexOf(marker);

// Scan backwards to find the start of the object
let start = idx;
while (start > 0 && code[start] !== '{') {
  start--;
}
// Maybe the parent object starts earlier, let's find the start of the mall object
const searchSub = code.substring(Math.max(0, idx - 500), idx + 200);
console.log('Context before marker:\n', searchSub);
