const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Search for escalator or elevator rendering in SVG
const idx = code.indexOf('portal');
console.log('portal occurrences:', code.split('portal').length - 1);

// Let's search for how escalators/stairs/elevators are displayed
const keywords = ['escalator', 'elevator', 'stairs'];
keywords.forEach(k => {
  const i = code.indexOf(k);
  if (i !== -1) {
    console.log(`Keyword ${k} around ${i}:`);
    console.log(code.substring(Math.max(0, i - 100), Math.min(code.length, i + 200)));
    console.log('---');
  }
});
