/**
 * İstanbul Cevahir AVM - Çok Katlı İç Mekan Navigasyon Motoru
 * Dijkstra Yol Bulma & Adım Adım Türkçe Yönlendirme Algoritması
 */

class NavigationEngine {
  constructor(mallData) {
    this.mallData = mallData;
    this.nodes = mallData.graph.nodes;
    this.adj = mallData.graph.adj;
    this.stores = mallData.stores;
    this.floors = mallData.floors;
    this.entrances = mallData.entrances;
  }

  /**
   * İki nokta arasında en kısa yolu Dijkstra ile hesaplar
   * @param {string} startNodeId 
   * @param {string} targetNodeId 
   * @param {string} mode - 'escalator' | 'elevator' | 'both'
   * @returns {Object} { distance, path, segmentsByFloor, instructions }
   */
  findRoute(startNodeId, targetNodeId, mode = 'escalator') {
    if (!startNodeId || !targetNodeId) {
      return null;
    }

    // Aynı noktaysa veya hedefin tam yanındaysa anında varış rotası dön
    if (startNodeId === targetNodeId) {
      const nodeData = this.nodes[startNodeId];
      if (!nodeData) return null;
      const nx = nodeData.x;
      const ny = nodeData.y;
      const ngx = nodeData.gx !== undefined ? nodeData.gx : nx;
      const ngy = nodeData.gy !== undefined ? nodeData.gy : ny;
      return {
        totalDistance: 0,
        totalUnits: 0,
        estimatedMinutes: 0,
        pathNodes: [{
          id: startNodeId,
          floor: nodeData.floor,
          x: nx,
          y: ny,
          gx: ngx,
          gy: ngy,
          edgeType: 'start'
        }],
        segmentsByFloor: {
          [nodeData.floor]: [{
            id: startNodeId,
            floor: nodeData.floor,
            x: nx,
            y: ny,
            gx: ngx,
            gy: ngy
          }]
        },
        instructions: [{
          step: 1,
          type: 'destination',
          icon: 'check-circle',
          floor: nodeData.floor,
          text: 'Şu anda hedefin yanındasınız.'
        }],
        mode
      };
    }

    // 1. Tercih edilen mod ile dene
    let result = this._runDijkstra(startNodeId, targetNodeId, mode);

    // 2. Eğer tekil modla (örn: sadece asansör veya sadece yürüyen merdiven) yol bulunamazsa, 
    // kullanıcıyı yolda bırakmamak için otomatik olarak hibrit ('both') mod ile dene
    if (!result && mode !== 'both') {
      result = this._runDijkstra(startNodeId, targetNodeId, 'both');
      if (result) {
        result.fallbackUsed = true;
      }
    }

    return result;
  }

  /**
   * Dijkstra algoritması çekirdek fonksiyonu
   */
  _runDijkstra(startNodeId, targetNodeId, mode) {
    const dist = {};
    const prev = {};
    const pq = new PriorityQueue();

    dist[startNodeId] = 0;
    pq.enqueue(startNodeId, 0);

    const allowedTransfers = mode === 'escalator' 
      ? ['stairs'] 
      : mode === 'elevator' 
        ? ['elevator'] 
        : ['stairs', 'elevator'];

    while (!pq.isEmpty()) {
      const { element: u, priority: d } = pq.dequeue();

      if (u === targetNodeId) break;
      if (d > dist[u]) continue;

      const neighbors = this.adj[u] || [];
      for (const edge of neighbors) {
        const { to: v, dist: w, type: etype, meta } = edge;

        // Transfer filtrelemesi
        if ((etype === 'stairs' || etype === 'elevator') && !allowedTransfers.includes(etype)) {
          continue;
        }

        const newDist = d + w;
        if (newDist < (dist[v] ?? Infinity)) {
          dist[v] = newDist;
          prev[v] = { from: u, type: etype, meta, dist: w };
          pq.enqueue(v, newDist);
        }
      }
    }

    if (dist[targetNodeId] === undefined || dist[targetNodeId] === Infinity) {
      return null;
    }

    // Yolu geriye doğru inşa et
    let curr = targetNodeId;
    const pathNodes = [];

    while (curr) {
      const nodeData = this.nodes[curr];
      const prevEdge = prev[curr];
      const nx = nodeData.x;
      const ny = nodeData.y;
      const ngx = nodeData.gx !== undefined ? nodeData.gx : nx;
      const ngy = nodeData.gy !== undefined ? nodeData.gy : ny;
      pathNodes.push({
        id: curr,
        floor: nodeData.floor,
        x: nx,
        y: ny,
        gx: ngx,
        gy: ngy,
        edgeType: prevEdge?.type || 'start',
        meta: prevEdge?.meta || '',
        edgeDist: prevEdge?.dist || 0
      });
      curr = prevEdge ? prevEdge.from : null;
    }

    pathNodes.reverse();

    // Katlara göre segmentleri ayır
    const segmentsByFloor = this.splitPathByFloor(pathNodes);

    // Adım adım yönlendirmeleri oluştur
    const instructions = this.generateInstructions(pathNodes, mode);

    // Metrikler (1 SVG birimi ≈ 0.45 metre)
    const scaleFactor = 0.45;
    const distanceMeters = Math.round(dist[targetNodeId] * scaleFactor);
    const estimatedMinutes = Math.max(1, Math.round((distanceMeters / 60) * 10) / 10);

    return {
      totalDistance: distanceMeters,
      totalUnits: Math.round(dist[targetNodeId]),
      estimatedMinutes,
      pathNodes,
      segmentsByFloor,
      instructions,
      mode
    };
  }

  /**
   * Çok katlı rota noktalarını katlarına göre gruplar
   */
  splitPathByFloor(pathNodes) {
    const segments = {};
    let currentFloor = null;

    for (const node of pathNodes) {
      const fl = node.floor;
      if (!segments[fl]) {
        segments[fl] = [];
      }
      segments[fl].push(node);
      currentFloor = fl;
    }

    return segments;
  }

  /**
   * Adım adım Türkçe yönlendirme talimatları üretir
   */
  generateInstructions(pathNodes, mode) {
    const instructions = [];
    if (pathNodes.length < 2) return instructions;

    let currentFloor = pathNodes[0].floor;
    let accumulatedWalk = 0;
    let lastHeading = null;

    instructions.push({
      step: 1,
      type: 'start',
      icon: 'map-pin',
      floor: currentFloor,
      text: `${this.getFloorName(currentFloor)} üzerinde yolculuğa başlayın.`
    });

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const n1 = pathNodes[i];
      const n2 = pathNodes[i + 1];
      const edgeType = n2.edgeType;
      const meta = n2.meta;

      if (edgeType === 'stairs') {
        if (accumulatedWalk > 5) {
          instructions.push({
            type: 'walk',
            icon: 'arrow-up',
            floor: currentFloor,
            text: `Koridorda yaklaşık ${Math.round(accumulatedWalk * 0.45)} metre düz ilerleyin.`
          });
          accumulatedWalk = 0;
        }

        instructions.push({
          type: 'stairs',
          icon: 'trending-up',
          floor: n1.floor,
          targetFloor: n2.floor,
          text: `⚡ Yürüyen merdivene binerek ${this.getFloorName(n2.floor)}'a geçin.`
        });
        currentFloor = n2.floor;
        lastHeading = null;
      } else if (edgeType === 'elevator') {
        if (accumulatedWalk > 5) {
          instructions.push({
            type: 'walk',
            icon: 'arrow-up',
            floor: currentFloor,
            text: `Koridorda yaklaşık ${Math.round(accumulatedWalk * 0.45)} metre düz ilerleyin.`
          });
          accumulatedWalk = 0;
        }

        instructions.push({
          type: 'elevator',
          icon: 'chevrons-up-down',
          floor: n1.floor,
          targetFloor: n2.floor,
          text: `🛗 Asansöre binerek doğrudan ${this.getFloorName(n2.floor)}'a çıkın.`
        });
        currentFloor = n2.floor;
        lastHeading = null;
      } else {
        // Normal yürüyüş
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const segDist = Math.hypot(dx, dy);
        accumulatedWalk += segDist;

        const heading = Math.atan2(dy, dx) * (180 / Math.PI);

        if (lastHeading !== null) {
          let diff = heading - lastHeading;
          while (diff > 180) diff -= 360;
          while (diff < -180) diff += 360;

          // Belirgin bir dönüş varsa
          if (Math.abs(diff) > 40 && accumulatedWalk > 18) {
            const turnDirection = diff > 0 ? 'sağa' : 'sola';
            instructions.push({
              type: 'turn',
              icon: diff > 0 ? 'corner-up-right' : 'corner-up-left',
              floor: currentFloor,
              text: `${Math.round(accumulatedWalk * 0.45)}m ilerledikten sonra ${turnDirection} dönün.`
            });
            accumulatedWalk = 0;
          }
        }

        lastHeading = heading;
      }
    }

    if (accumulatedWalk > 5) {
      instructions.push({
        type: 'walk',
        icon: 'arrow-up',
        floor: currentFloor,
        text: `Son olarak ${Math.round(accumulatedWalk * 0.45)} metre ilerleyin.`
      });
    }

    instructions.push({
      type: 'finish',
      icon: 'flag',
      floor: currentFloor,
      text: `Hedefinize ulaştınız! Mağaza tam karşınızda.`
    });

    return instructions;
  }

  getFloorName(floorNum) {
    const names = {
      1: "1. Kat (Metro & Market)",
      2: "2. Kat (Zemin & Cadde)",
      3: "3. Kat (1. Kat & Moda)",
      4: "4. Kat (2. Kat & Spor)",
      5: "5. Kat (Yemek Katı)",
      6: "6. Kat (Sinema & Eğlence)"
    };
    return names[floorNum] || `${floorNum}. Kat`;
  }
}

/**
 * Min-Priority Queue (Dijkstra için optimize ikili öbek)
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift();
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

if (typeof window !== 'undefined') window.NavigationEngine = NavigationEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = NavigationEngine;
