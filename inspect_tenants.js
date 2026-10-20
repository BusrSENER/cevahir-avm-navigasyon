const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));

const shopsF2 = data.floors.find(f => f.level === 2).rooms.filter(r => ['shop', 'food', 'service'].includes(r.kind));
console.log('Total shops/food on Floor 2:', shopsF2.length);
shopsF2.slice(0, 10).forEach(s => console.log(s));
