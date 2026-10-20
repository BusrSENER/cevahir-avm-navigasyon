const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

const startMarker = 'le={meta:{name:`İstanbul Cevahir AVM`';
const startIdx = code.indexOf(startMarker);
console.log('Start index:', startIdx);

// Extract from startMarker onwards
// We can use a JS parser or balance braces to find the exact end of the object
let braceCount = 0;
let started = false;
let endIdx = -1;

// The object starts at {meta:
const objStart = code.indexOf('{meta:', startIdx);

for (let i = objStart; i < code.length; i++) {
  const ch = code[i];
  if (ch === '`') {
    // skip template literal
    i++;
    while (i < code.length && code[i] !== '`') {
      if (code[i] === '\\') i++;
      i++;
    }
    continue;
  }
  if (ch === '"' || ch === "'") {
    const q = ch;
    i++;
    while (i < code.length && code[i] !== q) {
      if (code[i] === '\\') i++;
      i++;
    }
    continue;
  }
  if (ch === '{') {
    braceCount++;
    started = true;
  } else if (ch === '}') {
    braceCount--;
    if (started && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

console.log('Object ends at:', endIdx, 'Length:', endIdx - objStart);
const objCode = code.substring(objStart, endIdx);

// Evaluate or parse it safely
try {
  const data = eval('(' + objCode + ')');
  console.log('Successfully evaluated data!');
  console.log('Meta:', data.meta);
  console.log('Floors count:', data.floors.length);
  data.floors.forEach(f => {
    console.log(`Floor ${f.level}: ${f.rooms?.length || 0} rooms, ${f.amenities?.length || 0} amenities, ${f.portals?.length || 0} portals, ${f.graph?.nodes?.length || 0} nodes`);
  });
  
  // Save as cevahir_verified_data.json
  fs.writeFileSync('public/cevahir_verified_data.json', JSON.stringify(data, null, 2));
  console.log('Saved public/cevahir_verified_data.json successfully!');
} catch (e) {
  console.error('Eval error:', e);
}
