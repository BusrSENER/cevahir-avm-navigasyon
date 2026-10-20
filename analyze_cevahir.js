const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Look for viewBox or SVG elements in the code
const viewBoxMatches = code.match(/viewBox[=:]["'][^"']+["']/g);
console.log('viewBox matches:', viewBoxMatches);

// Search for floor data
const floorMatches = code.match(/\{[^}]*floor[^}]*\}/gi);
console.log('floor sample matches count:', floorMatches ? floorMatches.length : 0);

// Look for function names or variable declarations
const varNames = ['floors', 'FLOORS', 'stores', 'STORES', 'amenities', 'AMENITIES', 'routes', 'GRAPH'];
varNames.forEach(v => {
  const idx = code.indexOf(v);
  if (idx !== -1) {
    console.log(`Found "${v}" around position ${idx}:`);
    console.log(code.substring(Math.max(0, idx - 50), Math.min(code.length, idx + 200)));
    console.log('---');
  }
});
