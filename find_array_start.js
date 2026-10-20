const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Search for the start of the stores array
// Let's search for "unit":"101" or the first store
const idxKiko = code.indexOf('"name":"Kiko Milano"');
console.log('Kiko at:', idxKiko);

// Let's find variable name before the array, e.g. =[{id:
// Search backwards from idxKiko for =[{ or :[{
let p = idxKiko;
while (p > 0) {
  if (code.substring(p, p + 2) === '=[') {
    console.log('Found "=[" at', p);
    console.log(code.substring(p - 50, p + 80));
    break;
  }
  p--;
}
