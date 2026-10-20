const fs = require('fs');

const mall = JSON.parse(fs.readFileSync('public/cevahir_verified_data.json', 'utf8'));
const places = JSON.parse(fs.readFileSync('public/cevahir_extracted_ue.json', 'utf8'));

// Floor subtitles and labels
const floorMeta = {
  1: { label: '1. Kat', subtitle: 'Metro · Market · Teknoloji' },
  2: { label: '2. Kat', subtitle: 'Ana Giriş · Moda · Sinema' },
  3: { label: '3. Kat', subtitle: 'Moda · Aksesuar · Danışma' },
  4: { label: '4. Kat', subtitle: 'Spor · Genç Giyim · Ayakkabı' },
  5: { label: '5. Kat', subtitle: 'Yemek Katı · Fast Food · Restoranlar' },
  6: { label: '6. Kat', subtitle: 'Teras · Eğlence · Sinema' }
};

// Anchor brands
const anchorNames = [
  'zara', 'koton', 'lcw', 'lc waikiki', 'boyner', 'flo', 'defacto', 'starbucks',
  'marks & spencer', 'marks&spencer', 'd&r', 'paribu cineverse', 'migros', 'koçtaş',
  'teknosa', 'mediamarkt', 'decathlon', 'mavi', 'mango', 'sephora', 'pull&bear', 'bershka'
];

function isAnchor(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return anchorNames.some(a => n.includes(a));
}

// Category-specific campaign templates for real-world mall experience
const categoryCampaigns = {
  fashion: [
    { title: 'Büyük Sezon İndirimi', discount: '%50\'ye Varan İndirim', type: 'daily', badge: '🔥 %50 İndirim', expires: 'Bugün 22:00\'a kadar' },
    { title: 'Saatlik Flaş İndirim', discount: 'İkinci Ürüne %50 İndirim', type: 'hourly', badge: '⏰ Flaş Fırsat', expires: '14:00 - 18:00 Arası' },
    { title: 'Cevahir Özel Günleri', discount: 'Sepette Ekstra %20 İndirim', type: 'daily', badge: '🎉 Ekstra %20', expires: 'Hafta Sonu Geçerli' },
    { title: 'Yeni Sezon Lansmanı', discount: '1000 TL Üzerine 250 TL İndirim', type: 'daily', badge: '✨ Lansman Fırsatı', expires: 'Bugün Geçerli' }
  ],
  shoes: [
    { title: 'Ayakkabı Festivali', discount: '2. Çiftte %40 İndirim', type: 'daily', badge: '👟 2.ye %40', expires: 'Bugün Geçerli' },
    { title: 'Çanta & Aksesuar İndirimi', discount: 'Net %30 İndirim', type: 'hourly', badge: '👜 %30 İndirim', expires: '15:00 - 19:00 Arası' },
    { title: 'Sezon Sonu Ayakkabı İndirimi', discount: 'Tüm Modellerde %35 İndirim', type: 'daily', badge: '🔥 %35 İndirim', expires: 'Hafta Sonu Geçerli' }
  ],
  sports: [
    { title: 'Spor & Outdoor Günleri', discount: 'Seçili Ürünlerde %35 İndirim', type: 'daily', badge: '🏃 %35 İndirim', expires: 'Stoklarla Sınırlı' },
    { title: 'Sneaker Fırsat Saati', discount: 'Tüm Sneakerlarda %20 İndirim', type: 'hourly', badge: '⏰ Flaş İndirim', expires: '16:00 - 20:00 Arası' },
    { title: 'Spor Kıyafet Kampanyası', discount: '3 Al 2 Öde Fırsatı', type: 'daily', badge: '⚡ 3 Al 2 Öde', expires: 'Bugün Geçerli' }
  ],
  tech: [
    { title: 'Teknoloji Fırsatları', discount: 'Aksesuarlarda 1 Alana 1 Bedava', type: 'daily', badge: '📱 1 Alana 1', expires: 'Bugün Geçerli' },
    { title: 'Elektronik Saat İndirimi', discount: 'Kulaklık & Şarjlarda %25 İndirim', type: 'hourly', badge: '🎧 %25 İndirim', expires: '13:00 - 17:00 Arası' },
    { title: 'Cevahir Tech Günleri', discount: 'Telefon Kılıflarında %40 İndirim', type: 'daily', badge: '💻 %40 İndirim', expires: 'Bugün Geçerli' }
  ],
  cosmetics: [
    { title: 'Güzellik & Bakım Günleri', discount: 'Parfümlerde %30 İndirim', type: 'daily', badge: '💄 %30 İndirim', expires: 'Bugün 22:00\'a kadar' },
    { title: 'Cilt Bakımı Flaş Fırsatı', discount: '2. Ürüne %50 İndirim', type: 'hourly', badge: '✨ Flaş Bakım', expires: '14:00 - 18:00 Arası' },
    { title: 'Makyaj Ürünlerinde İndirim', discount: '3 Alana 1 Hediye', type: 'daily', badge: '🎁 Hediye Ürün', expires: 'Bugün Geçerli' }
  ],
  food: [
    { title: 'Öğle & Akşam Menü Fırsatı', discount: 'Menü Yanında Tatlı / İçecek Bedava', type: 'hourly', badge: '🍔 Menü Fırsatı', expires: '12:00 - 15:00 & 18:00 - 21:00' },
    { title: 'Kahve Saati Kampanyası', discount: 'Kahve Yanında Kurabiye %50 İndirimli', type: 'hourly', badge: '☕ Kahve Saati', expires: '15:00 - 19:00 Arası' },
    { title: 'Aile & Arkadaş Menüsü', discount: '3 Menü Alana 1 Menü Bedava', type: 'daily', badge: '🍕 3 Al 2 Öde', expires: 'Tüm Gün Geçerli' }
  ],
  home: [
    { title: 'Ev & Yaşam Kampanyası', discount: 'Tüm Ev Tekstilinde %40 İndirim', type: 'daily', badge: '🏠 %40 İndirim', expires: 'Bugün Geçerli' },
    { title: 'Mutfak Ürünleri İndirimi', discount: '3 Al 2 Öde Fırsatı', type: 'daily', badge: '🍳 3 Al 2 Öde', expires: 'Stoklarla Sınırlı' }
  ],
  entertainment: [
    { title: 'Sinema & Eğlence Paketi', discount: 'Büyük Boy Mısır & İçecek %25 İndirimli', type: 'hourly', badge: '🍿 Sinema Fırsatı', expires: 'Seans Öncesi Geçerli' },
    { title: 'Oyun Alanı Jeton Kampanyası', discount: '50 Jeton Alana 20 Jeton Hediye', type: 'daily', badge: '🎮 Hediye Jeton', expires: 'Bugün Geçerli' }
  ],
  service: [
    { title: 'Cevahir Hizmet Avantajı', discount: 'Cevahir Kart ile Ücretsiz Hizmet', type: 'daily', badge: 'ℹ️ Cevahir Ayrıcalığı', expires: '10:00 - 22:00' }
  ]
};

function getCampaignForStore(store, idx, category) {
  const catList = categoryCampaigns[category] || categoryCampaigns.fashion;
  const tmpl = catList[(store.name.length + idx) % catList.length];
  return {
    active: true,
    title: tmpl.title,
    discount: tmpl.discount,
    type: tmpl.type,
    badge: tmpl.badge,
    expires: tmpl.expires,
    code: 'CEVAHIR' + (100 + ((store.name.length * 17 + idx * 7) % 899))
  };
}

// Category translator
function getCategoryCode(place) {
  if (!place) return 'fashion';
  if (place.kind === 'food') return 'food';
  if (place.kind === 'atm') return 'atm';
  if (place.kind === 'wc') return 'wc';
  if (place.kind === 'service' || place.kind === 'infirmary' || place.kind === 'prayer' || place.kind === 'baby' || place.kind === 'valet' || place.kind === 'locker' || place.kind === 'info' || place.kind === 'taxfree') return 'service';
  if (!place.cats || !place.cats.length) return 'fashion';
  
  const c = place.cats[0].toLowerCase();
  if (c.includes('kadin') || c.includes('erkek') || c.includes('giyim') || c.includes('moda') || c.includes('ic-giyim')) return 'fashion';
  if (c.includes('ayakkabi') || c.includes('canta')) return 'shoes';
  if (c.includes('spor') || c.includes('outdoor')) return 'sports';
  if (c.includes('elektronik') || c.includes('teknoloji') || c.includes('gsm')) return 'tech';
  if (c.includes('ev') || c.includes('dekorasyon') || c.includes('tekstil')) return 'home';
  if (c.includes('kozmetik') || c.includes('bakim') || c.includes('parfum')) return 'cosmetics';
  if (c.includes('aksesuar') || c.includes('optik') || c.includes('taki') || c.includes('saat')) return 'accessories';
  if (c.includes('cocuk') || c.includes('oyuncak') || c.includes('sinema') || c.includes('eglence')) return 'entertainment';
  if (c.includes('yeme') || c.includes('cafe') || c.includes('restoran') || c.includes('fast-food')) return 'food';
  return 'service';
}

// Assemble floors and places
const unifiedFloors = {};
const allAmenities = [];
const allEntrances = [];

for (let l = 1; l <= 6; l++) {
  const meta = floorMeta[l];
  const floorRooms = mall.floors.find(f => f.level === l);
  const floorPlaces = places.filter(p => p.floor === l);

  const floorStores = [];
  const floorAmenities = [];
  const floorPortals = [];

  floorPlaces.forEach((p, idx) => {
    const isAmenityKind = ['wc', 'atm', 'infirmary', 'prayer', 'baby', 'valet', 'locker', 'info', 'taxfree'].includes(p.kind);
    const isEntranceKind = ['entrance', 'metro', 'carpark'].includes(p.kind);

    // Exact room polygon centroid matching (Strict Cartesian Bounding)
    const matchingRoom = floorRooms?.rooms?.find(r => r.id === p.id || r.id === p.unit || r.id === 'ID' + p.unit);
    const exactCx = matchingRoom && matchingRoom.c ? matchingRoom.c[0] : p.p[0];
    const exactCy = matchingRoom && matchingRoom.c ? matchingRoom.c[1] : p.p[1];

    const storeObj = {
      id: p.id,
      unit: p.unit || '',
      name: p.name,
      sub: p.sub || '',
      category: getCategoryCode(p),
      kind: p.kind,
      floor: l,
      cx: exactCx,
      cy: exactCy,
      room_id: matchingRoom ? matchingRoom.id : (p.id || ''),
      doors: p.doors || [],
      doorP: p.doorP || [],
      near: p.near || '',
      phone: p.phone || '',
      logo: p.logo || '',
      is_anchor: isAnchor(p.name),
      campaign: getCampaignForStore(p, idx, getCategoryCode(p))
    };

    if (isEntranceKind) {
      allEntrances.push(storeObj);
      floorAmenities.push(storeObj);
    } else if (isAmenityKind) {
      allAmenities.push(storeObj);
      floorAmenities.push(storeObj);
    } else {
      floorStores.push(storeObj);
    }
  });

  // Extract portals from floor.icons
  if (floorRooms && floorRooms.icons) {
    floorRooms.icons.forEach((ic, iIdx) => {
      floorPortals.push({
        id: `portal_${l}_${iIdx}`,
        type: ic.type,
        x: ic.p[0],
        y: ic.p[1],
        floor: l
      });
    });
  }

  unifiedFloors[l] = {
    level: l,
    label: meta.label,
    subtitle: meta.subtitle,
    stores: floorStores,
    amenities: floorAmenities,
    portals: floorPortals
  };
}

// Build unified global navigation graph
// We map each floor's nodes and links
const unifiedGraph = {
  nodes: {},
  adj: {}
};

// Floor node offset helper
const floorOffsets = {};
let totalGlobalNodes = 0;

mall.floors.forEach(f => {
  floorOffsets[f.level] = totalGlobalNodes;
  (f.nodes || []).forEach((coord, nIdx) => {
    const globalId = `n_${f.level}_${nIdx}`;
    unifiedGraph.nodes[globalId] = {
      id: globalId,
      floor: f.level,
      localIdx: nIdx,
      x: coord[0],
      y: coord[1]
    };
    unifiedGraph.adj[globalId] = [];
  });
  totalGlobalNodes += (f.nodes || []).length;
});

// Add intra-floor walking edges
const mPerUnit = mall.meta.mPerUnit || 0.55;

mall.floors.forEach(f => {
  (f.edges || []).forEach(([u, v]) => {
    const uId = `n_${f.level}_${u}`;
    const vId = `n_${f.level}_${v}`;
    const nu = unifiedGraph.nodes[uId];
    const nv = unifiedGraph.nodes[vId];
    if (nu && nv) {
      const dist = Math.hypot(nu.x - nv.x, nu.y - nv.y);
      unifiedGraph.adj[uId].push({ to: vId, dist: dist, type: 'walk' });
      unifiedGraph.adj[vId].push({ to: uId, dist: dist, type: 'walk' });
    }
  });
});

// Add inter-floor vertical link edges (escalators, elevators, stairs)
const linkCosts = {
  escalator: { cost: 22, type: 'stairs' },
  stairs: { cost: 38, type: 'stairs' },
  elevator: { cost: 45, type: 'elevator' }
};

(mall.links || []).forEach(link => {
  const [flA, idxA] = link.a;
  const [flB, idxB] = link.b;
  const idA = `n_${flA}_${idxA}`;
  const idB = `n_${flB}_${idxB}`;

  const cfg = linkCosts[link.kind] || linkCosts.escalator;
  const edgeDist = cfg.cost * Math.abs(flA - flB);

  if (unifiedGraph.adj[idA] && unifiedGraph.adj[idB]) {
    unifiedGraph.adj[idA].push({ to: idB, dist: edgeDist, type: cfg.type, portalKind: link.kind });
    unifiedGraph.adj[idB].push({ to: idA, dist: edgeDist, type: cfg.type, portalKind: link.kind });
  }
});

// Link places/stores to their closest door nodes in the graph
places.forEach(p => {
  const fl = p.floor;
  let targetNodeId = null;
  if (p.doors && p.doors.length) {
    targetNodeId = `n_${fl}_${p.doors[0]}`;
  } else {
    // find nearest node on same floor
    const fNodes = mall.floors.find(f => f.level === fl)?.nodes || [];
    let minDist = Infinity;
    let bestIdx = 0;
    fNodes.forEach((coord, idx) => {
      const d = Math.hypot(coord[0] - p.p[0], coord[1] - p.p[1]);
      if (d < minDist) {
        minDist = d;
        bestIdx = idx;
      }
    });
    targetNodeId = `n_${fl}_${bestIdx}`;
  }

  // update place nav_node
  const flStores = unifiedFloors[fl]?.stores || [];
  const sMatch = flStores.find(s => s.id === p.id);
  if (sMatch) sMatch.nav_node = targetNodeId;

  const aMatch = allAmenities.find(a => a.id === p.id);
  if (aMatch) aMatch.nav_node = targetNodeId;

  const eMatch = allEntrances.find(e => e.id === p.id);
  if (eMatch) eMatch.nav_node = targetNodeId;
});

// Final JSON structure
const unifiedMallData = {
  meta: mall.meta,
  floors: unifiedFloors,
  amenities: allAmenities,
  entrances: allEntrances,
  links: mall.links || [],
  graph: unifiedGraph
};

fs.writeFileSync('public/mall_data.json', JSON.stringify(unifiedMallData, null, 2));
console.log('Saved public/mall_data.json successfully!');
console.log(`Summary: 6 floors, ${places.length} places, ${allAmenities.length} amenities, ${allEntrances.length} entrances, ${Object.keys(unifiedGraph.nodes).length} graph nodes.`);
