const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));

data.floors.forEach(f => {
  console.log(`Floor ${f.level}: ${f.icons?.length || 0} icons`);
  if (f.icons) {
    const types = {};
    f.icons.forEach(i => types[i.type] = (types[i.type] || 0) + 1);
    console.log('  Types:', types);
  }
});
