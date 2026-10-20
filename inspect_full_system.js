const fs = require('fs');

const data = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));
const places = JSON.parse(fs.readFileSync('public/cevahir_extracted_ue.json', 'utf8'));

console.log('Mall Meta:', data.meta);
console.log('Total Links (Escalators, Elevators, Stairs):', data.links?.length);
if (data.links?.length > 0) {
  console.log('Sample links:', data.links.slice(0, 5));
}

data.floors.forEach(f => {
  console.log(`Floor ${f.level}: ${f.rooms?.length} rooms, ${f.nodes?.length} nodes, ${f.edges?.length} edges`);
});

console.log('Total Places (Stores & Amenities):', places.length);
const f2Places = places.filter(p => p.floor === 2);
console.log('Floor 2 Places count:', f2Places.length);
console.log('Floor 2 Sample places:');
f2Places.slice(0, 10).forEach(p => {
  console.log(`- ${p.name} (id: ${p.id}, unit: ${p.unit}, kind: ${p.kind}, p: [${p.p}], doors: [${p.doors}])`);
});
