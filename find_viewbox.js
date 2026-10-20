const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const idx = code.indexOf('viewBox');
console.log('viewBox index:', idx);
if (idx !== -1) {
  console.log(code.substring(idx - 50, idx + 200));
}
