const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const idx = code.indexOf('tt=');
console.log('tt= found at:', idx);
if (idx !== -1) {
  console.log(code.substring(idx - 20, idx + 400));
}
