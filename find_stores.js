const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const storeNames = ['Koton', 'Zara', 'Defacto', 'FLO', 'LCW', 'Starbucks', 'M&S'];

storeNames.forEach(name => {
  const idx = code.indexOf(name);
  if (idx !== -1) {
    console.log(`Found "${name}" at index ${idx}:`);
    console.log(code.substring(Math.max(0, idx - 100), Math.min(code.length, idx + 250)));
    console.log('===');
  }
});
