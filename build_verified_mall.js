const fs = require('fs');

const mall = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));
const places = JSON.parse(fs.readFileSync('public/cevahir_extracted_ue.json', 'utf8'));

console.log('Processing Mall data:');
console.log('Meta:', mall.meta);
console.log('Floors:', mall.floors.length);
console.log('Total places:', places.length);

// Category mapping helper
function getCatClass(place) {
  if (!place || !place.cats || !place.cats.length) {
    if (place?.kind === 'food') return 'yeme';
    if (place?.kind === 'service' || place?.kind === 'atm' || place?.kind === 'wc') return 'hizmet';
    return 'moda';
  }
  const c = place.cats[0].toLowerCase();
  if (c.includes('kadin') || c.includes('erkek') || c.includes('giyim') || c.includes('moda') || c.includes('ic-giyim')) return 'moda';
  if (c.includes('ayakkabi') || c.includes('canta')) return 'ayakkabi';
  if (c.includes('spor') || c.includes('outdoor')) return 'spor';
  if (c.includes('elektronik') || c.includes('teknoloji') || c.includes('gsm')) return 'elektronik';
  if (c.includes('ev') || c.includes('dekorasyon') || c.includes('tekstil')) return 'ev';
  if (c.includes('kozmetik') || c.includes('bakim') || c.includes('parfum')) return 'kozmetik';
  if (c.includes('aksesuar') || c.includes('optik') || c.includes('taki') || c.includes('saat')) return 'aksesuar';
  if (c.includes('cocuk') || c.includes('oyuncak') || c.includes('sinema') || c.includes('eglence')) return 'cocuk';
  if (c.includes('yeme') || c.includes('cafe') || c.includes('restoran') || c.includes('fast-food')) return 'yeme';
  return 'hizmet';
}

// Map places by ID
const placesMap = new Map();
places.forEach(p => placesMap.set(p.id, p));

// Build upright SVGs for each floor (1 to 6)
mall.floors.forEach(floor => {
  const level = floor.level;
  const vbWidth = mall.meta.width;   // 516
  const vbHeight = mall.meta.height; // 735

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbWidth} ${vbHeight}" width="100%" height="100%" class="map__svg">
  <defs>
    <filter id="slab-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Base Slab Background / Corridors -->
  <g id="FloorSlab" class="map__slab">
`;

  // 1. Walking corridors & Slabs
  const walkRooms = floor.rooms.filter(r => r.kind === 'walk');
  walkRooms.forEach((r, idx) => {
    svgContent += `    <path id="${r.id || 'walk_' + idx}" class="slab corridor-path" d="${r.d}" fillRule="evenodd" />\n`;
  });

  // 2. Voids (Atrium cutouts)
  const voidRooms = floor.rooms.filter(r => r.kind === 'void');
  if (voidRooms.length) {
    svgContent += `  </g>\n  <g id="FloorVoids">\n`;
    voidRooms.forEach((r, idx) => {
      svgContent += `    <path id="${r.id || 'void_' + idx}" class="void" d="${r.d}" fillRule="evenodd" />\n`;
    });
  }

  // 3. Core Walls
  const coreRooms = floor.rooms.filter(r => r.kind === 'core');
  if (coreRooms.length) {
    svgContent += `  </g>\n  <g id="FloorCores">\n`;
    coreRooms.forEach((r, idx) => {
      svgContent += `    <path id="${r.id || 'core_' + idx}" class="room-wall" d="${r.d}" fillRule="evenodd" />\n`;
    });
  }

  // 4. Store Tenant Units (shop, food, service, green)
  const tenantRooms = floor.rooms.filter(r => ['shop', 'food', 'service', 'green'].includes(r.kind));
  svgContent += `  </g>\n  <g id="FloorRooms">\n`;
  tenantRooms.forEach(r => {
    const place = placesMap.get(r.id);
    const catClass = place ? getCatClass(place) : (r.kind === 'food' ? 'yeme' : 'moda');
    const isTenant = !!place;
    const classes = [
      'room',
      `room--${r.kind}`,
      isTenant ? `room--tenant g-${catClass} cat-${catClass}` : 'room--vacant',
      'store-polygon'
    ].join(' ');

    svgContent += `    <path id="${r.id}" class="${classes}" d="${r.d}" fillRule="evenodd" data-id="${place ? place.id : r.id}" />\n`;
  });

  // 5. Portals (Escalator, Elevator, Stairs icons directly on SVG)
  if (floor.icons && floor.icons.length) {
    svgContent += `  </g>\n  <g id="FloorIcons" class="pointer-events-none">\n`;
    floor.icons.forEach((ic, idx) => {
      const [ix, iy] = ic.p;
      if (ic.type === 'escalator') {
        svgContent += `    <g transform="translate(${ix}, ${iy})" class="portal-svg portal-escalator" opacity="0.85">
      <circle r="6" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1.2"/>
      <path d="M-3 2 L3 -2 M1 -2 L3 -2 L3 0" stroke="#10b981" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>\n`;
      } else if (ic.type === 'elevator') {
        svgContent += `    <g transform="translate(${ix}, ${iy})" class="portal-svg portal-elevator" opacity="0.9">
      <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#0284c7" fill-opacity="0.2" stroke="#0284c7" stroke-width="1.2"/>
      <path d="M-2 -3 L0 -5 L2 -3 M-2 3 L0 5 L2 3" stroke="#0284c7" stroke-width="1" stroke-linecap="round" fill="none"/>
    </g>\n`;
      } else if (ic.type === 'stairs') {
        svgContent += `    <g transform="translate(${ix}, ${iy})" class="portal-svg portal-stairs" opacity="0.6">
      <path d="M-4 3 H-1 V0 H2 V-3 H4" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>\n`;
      }
    });
  }

  svgContent += `  </g>\n</svg>`;

  fs.writeFileSync(`public/svg/${level}.svg`, svgContent);
  console.log(`Generated public/svg/${level}.svg (Rooms: ${tenantRooms.length}, Voids: ${voidRooms.length}, Icons: ${floor.icons?.length || 0})`);
});

console.log('All 6 floor SVGs successfully built in upright 516x735 coordinates!');
