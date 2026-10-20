const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));

console.log('Sample rooms on Floor 2:');
const f2 = data.floors.find(f => f.level === 2);
console.log('Total rooms on Floor 2:', f2.rooms.length);
f2.rooms.slice(0, 15).forEach(r => {
  console.log(r);
});
