const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

console.log('Code around 304340:\n', code.substring(304330, 305000));
