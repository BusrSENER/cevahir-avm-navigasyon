const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const matches = code.match(/campaign[^;]{1,200}/gi) || [];
console.log('Campaign matches in site.js:');
matches.forEach(m => console.log('-', m));
