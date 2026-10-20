const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Look for JSX svg creation
const idx = code.indexOf('516 735');
console.log('516 735 found at:', idx);
if (idx !== -1) {
  console.log(code.substring(idx - 100, idx + 300));
}
