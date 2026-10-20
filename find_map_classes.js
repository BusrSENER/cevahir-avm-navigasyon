const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const keywords = ['map__svg', 'room--', 'map__slab', 'place__pin'];
keywords.forEach(k => {
  const i = code.indexOf(k);
  if (i !== -1) {
    console.log(`Found ${k} at ${i}:`);
    console.log(code.substring(i - 100, i + 300));
    console.log('---');
  }
});
