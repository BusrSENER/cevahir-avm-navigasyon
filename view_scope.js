const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

console.log(code.substring(380500, 381500));
