const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Find all top-level data objects
// Around 304000
const sub = code.substring(304000, 340000);

// Look for array of stores or graph
// Let's find where the store list starts
const storeArrayIdx = code.indexOf('"id":"ID206"');
console.log('ID206 found at:', storeArrayIdx);

// Look backwards from storeArrayIdx to find the start of the array
let arrStart = storeArrayIdx;
while (arrStart > 0 && code[arrStart] !== '[') {
  arrStart--;
}
console.log('Store array starts at:', arrStart);
console.log('Context before store array:', code.substring(arrStart - 200, arrStart + 50));

// Find the end of the store array
let bracketCount = 0;
let started = false;
let arrEnd = -1;
for (let i = arrStart; i < code.length; i++) {
  if (code[i] === '[') {
    bracketCount++;
    started = true;
  } else if (code[i] === ']') {
    bracketCount--;
    if (started && bracketCount === 0) {
      arrEnd = i + 1;
      break;
    }
  }
}
console.log('Store array ends at:', arrEnd, 'length:', arrEnd - arrStart);

try {
  const stores = JSON.parse(code.substring(arrStart, arrEnd));
  console.log('Total stores in array:', stores.length);
  console.log('Stores per floor:');
  const perFloor = {};
  stores.forEach(s => {
    perFloor[s.floor] = (perFloor[s.floor] || 0) + 1;
  });
  console.log(perFloor);
  fs.writeFileSync('public/cevahir_verified_stores.json', JSON.stringify(stores, null, 2));
  console.log('Saved public/cevahir_verified_stores.json successfully!');
} catch (e) {
  console.error('Parse error:', e);
}
