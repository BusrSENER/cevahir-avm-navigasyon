const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Find where ue ends
const idxUe = code.indexOf('ue=JSON.parse');
// Find the closing of this JSON.parse
const closeIdx = code.indexOf('`)', idxUe);
console.log('ue ends at:', closeIdx);
console.log('Next 1500 chars after ue:\n', code.substring(closeIdx + 2, closeIdx + 1500));
