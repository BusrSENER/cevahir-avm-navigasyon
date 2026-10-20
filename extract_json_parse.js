const fs = require('fs');

const code = fs.readFileSync('cevahir_site.js', 'utf8');

// Find all occurrences of JSON.parse(`
const regex = /([a-zA-Z0-9_$]+)=JSON\.parse\(`([^`\\]*(?:\\.[^`\\]*)*)`\)/g;
let match;
let count = 0;

while ((match = regex.exec(code)) !== null) {
  count++;
  const varName = match[1];
  const jsonStr = match[2];
  try {
    const parsed = JSON.parse(jsonStr);
    console.log(`Match ${count}: var "${varName}", type: ${Array.isArray(parsed) ? 'Array (' + parsed.length + ')' : typeof parsed}`);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log('  First item:', parsed[0]);
    }
    fs.writeFileSync(`public/cevahir_extracted_${varName}.json`, JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.error(`Failed to parse var ${varName}:`, e.message);
  }
}
