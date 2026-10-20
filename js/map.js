/**
 * İstanbul Cevahir AVM - İnteraktif Vektörel Harita Motoru
 * SVG Pan/Zoom, Mağaza Poligonları & Marka Logo İşaretleyicileri
 */

class MallMap {
  constructor(containerId, mallData, onStoreClick) {
    this.container = document.getElementById(containerId);
    this.mallData = mallData;
    this.onStoreClick = onStoreClick;

    this.currentFloor = 2;
    this.activeRoute = null;
    this.activeStartStore = null;
    this.activeTargetStore = null;

    // Görünüm Modu ('anchor' = Sade / Ana Mağazalar, 'all' = Tüm Mağazalar)
    this.displayMode = 'anchor';
    this.activeCategoryFilter = 'all';
    this.wasZoomedIn = false;

    // Pan & Zoom State
    this.scale = 1.0;
    this.minScale = 0.5;
    this.maxScale = 4.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // ViewBox dimensions (standart cevahir-rehber upright vertical space)
    this.vbWidth = this.mallData.meta?.width || 516;
    this.vbHeight = this.mallData.meta?.height || 735;

    this.initMap();
    this.setupEventListeners();
  }

  initMap() {
    this.container.innerHTML = `
      <div id="map-viewport" class="select-none" style="position: absolute; width: ${this.vbWidth}px; height: ${this.vbHeight}px; transform-origin: 0 0; will-change: transform;">
        <!-- SVG Floor Layer -->
        <div id="svg-layer" class="absolute inset-0 pointer-events-auto" style="width: ${this.vbWidth}px; height: ${this.vbHeight}px; z-index: 5;"></div>
        
        <!-- Navigation Route SVG Layer -->
        <svg id="route-svg" class="absolute inset-0 pointer-events-none" width="${this.vbWidth}" height="${this.vbHeight}" viewBox="0 0 ${this.vbWidth} ${this.vbHeight}" style="z-index: 15;"></svg>
        
        <!-- HTML Markers Layer (Brand Logos & Icons) -->
        <div id="markers-layer" class="absolute inset-0 pointer-events-none" style="width: ${this.vbWidth}px; height: ${this.vbHeight}px; z-index: 25;"></div>

        <!-- Animated Shopping Cart Layer -->
        <div id="avatar-layer" class="absolute inset-0 pointer-events-none" style="width: ${this.vbWidth}px; height: ${this.vbHeight}px; z-index: 45;"></div>
      </div>
    `;

    this.viewport = document.getElementById('map-viewport');
    this.svgLayer = document.getElementById('svg-layer');
    this.routeSvg = document.getElementById('route-svg');
    this.markersLayer = document.getElementById('markers-layer');
    this.avatarLayer = document.getElementById('avatar-layer');

    this.loadFloor(this.currentFloor).then(() => {
      // Kat yüklendikten sonra ekranı ortala ve tam sığdır
      setTimeout(() => this.resetView(), 50);
    });
  }

  /**
   * Seçilen katın SVG haritasını yükler ve ham debug metinlerini temizler
   */
  async loadFloor(floorNum) {
    this.currentFloor = floorNum;
    const floorInfo = this.mallData.floors[floorNum];
    if (!floorInfo) return;

    try {
      const resp = await fetch(`public/svg/${floorNum}.svg`);
      if (!resp.ok) throw new Error(`SVG fetch failed: ${resp.status}`);
      const svgText = await resp.text();

      this.svgLayer.innerHTML = svgText;
      const svgEl = this.svgLayer.querySelector('svg');
      if (svgEl) {
        svgEl.id = 'map-svg-element';
        svgEl.setAttribute('width', `${this.vbWidth}`);
        svgEl.setAttribute('height', `${this.vbHeight}`);
        svgEl.setAttribute('viewBox', `0 0 ${this.vbWidth} ${this.vbHeight}`);
        svgEl.style.width = `${this.vbWidth}px`;
        svgEl.style.height = `${this.vbHeight}px`;
        svgEl.style.display = 'block';

        // SVG içindeki ham Inkscape debug yazılarını temizle
        const junk = svgEl.querySelectorAll('text, tspan, #Writing, [id*="Writing"], [id*="writing"]');
        junk.forEach(el => el.remove());

        this.attachStoreInteractivity(svgEl, floorNum);
      }

      this.renderBrandMarkers(floorNum);
      this.renderRoute();
      this.updateTransform();

      // Floor Header Banner'ı Güncelle
      const titleEl = document.getElementById('floor-title-text') || document.getElementById('floor-banner-badge');
      const subtitleEl = document.getElementById('floor-subtitle-text') || document.getElementById('floor-banner-subtitle');
      if (titleEl) titleEl.textContent = `${floorNum}. Kat`;
      if (subtitleEl && floorInfo) subtitleEl.textContent = floorInfo.subtitle || floorInfo.label || '';

      // Sidebar segmented tab kat numarasını güncelle
      const thisFloorNumEl = document.getElementById('this-floor-num');
      if (thisFloorNumEl) thisFloorNumEl.textContent = floorNum;

      // Watermark Kat Numarası (.map__watermark from cevahir-rehber)
      let watermarkEl = document.getElementById('map-watermark');
      if (watermarkEl) {
        watermarkEl.textContent = floorNum;
      }
      watermarkEl.style.animation = 'none';
      void watermarkEl.offsetWidth; // reflow tetikle
      watermarkEl.style.animation = '';

      if (window.simulator && typeof window.simulator.checkVisibility === 'function') {
        window.simulator.checkVisibility();
      }

    } catch (err) {
      console.error(`Error loading floor ${floorNum}:`, err);
    }
  }

  /**
   * SVG içindeki mağaza poligonlarına hover ve tıklama olayları ekler
   */
  attachStoreInteractivity(svgEl, floorNum) {
    const floorStores = this.mallData.floors[floorNum]?.stores || [];
    const storeMap = new Map();
    floorStores.forEach(s => {
      storeMap.set(s.id, s);
      if (s.raw_id) storeMap.set(s.raw_id, s);
      if (s.unit) storeMap.set(`ID${s.unit}`, s);
    });

    const catClassMap = {
      fashion: 'g-moda',
      shoes: 'g-ayakkabi',
      food: 'g-yeme',
      tech: 'g-elektronik',
      cosmetics: 'g-kozmetik',
      sports: 'g-spor',
      home: 'g-ev',
      entertainment: 'g-cocuk',
      service: 'g-hizmet',
      atm: 'g-hizmet',
      wc: 'g-hizmet'
    };

    const paths = svgEl.querySelectorAll('path');
    paths.forEach(path => {
      const id = path.getAttribute('id') || '';
      const dataId = path.getAttribute('data-id') || '';
      const cleanId = id.replace('x', '').replace('-8', '');
      const store = storeMap.get(id) || storeMap.get(dataId) || storeMap.get(cleanId);

      if (store) {
        path.classList.add('store-polygon', 'room', 'room--tenant');
        path.classList.add(`cat-${store.category}`);
        if (catClassMap[store.category]) {
          path.classList.add(catClassMap[store.category]);
        }
        path.setAttribute('data-store-id', store.id);

        path.addEventListener('mouseenter', () => {
          this.highlightStore(store.id, true);
        });

        path.addEventListener('mouseleave', () => {
          this.highlightStore(store.id, false);
        });

        path.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.onStoreClick) {
            this.onStoreClick(store);
          }
        });
      }
    });
  }

  /**
   * Kat üzerindeki mağaza logolarını ve etiketlerini oluşturur
   * LOD (Level of Detail) ve çakışma önleyici akıllı algoritma
   */
  renderBrandMarkers(floorNum) {
    this.markersLayer.innerHTML = '';
    const allFloorStores = this.mallData.floors[floorNum]?.stores || [];
    if (!allFloorStores.length) return;

    // 1. Kategori Filtresi
    let filteredStores = allFloorStores;
    if (this.activeCategoryFilter && this.activeCategoryFilter !== 'all') {
      filteredStores = filteredStores.filter(s => s.category === this.activeCategoryFilter);
    }

    // 2. Görünüm Modu & Zoom Kontrolü (Level of Detail - LOD)
    // Sade Görünüm modunda sadece Anchor mağazalar görünür.
    // Yakınlaşınca (scale >= 1.35) veya "Tümünü Göster" modunda ikincil mağazalar da açılır.
    const isZoomedIn = this.scale >= 1.35;
    const isFiltered = this.activeCategoryFilter && this.activeCategoryFilter !== 'all';
    const showAll = this.displayMode === 'all' || isZoomedIn || isFiltered;

    const candidateStores = showAll 
      ? filteredStores 
      : filteredStores.filter(s => s.is_anchor);

    // 3. Akıllı Çakışma Engelleme (Spatial Collision Avoidance)
    // Anchor mağazalar her zaman önceliklidir; çok yakın marker'ların üst üste binmesi engellenir
    const placedPositions = [];
    const minDistance = this.scale >= 2.0 ? 16 : (this.scale >= 1.35 ? 24 : 34); // Dinamik SVG koordinat mesafesi

    // Anchor mağazaları ilk önce sırala
    const sortedStores = [...candidateStores].sort((a, b) => (b.is_anchor ? 1 : 0) - (a.is_anchor ? 1 : 0));

    sortedStores.forEach(store => {
      if (typeof store.cx !== 'number' || typeof store.cy !== 'number') return;

      // İkincil mağazalar için çakışma kontrolü
      if (!store.is_anchor && !isFiltered) {
        const collides = placedPositions.some(pos => Math.hypot(pos.x - store.cx, pos.y - store.cy) < minDistance);
        if (collides) return;
      }

      placedPositions.push({ x: store.cx, y: store.cy, id: store.id });

      const marker = document.createElement('div');
      const isAnchor = !!store.is_anchor;
      marker.className = `logo-tile-marker store-marker-${store.id} ${isAnchor ? 'is-anchor' : 'is-secondary'}`;
      marker.setAttribute('data-store-id', store.id);
      marker.style.left = `${store.cx}px`;
      marker.style.top = `${store.cy}px`;
      marker.title = `${store.name} (${floorNum}. Kat)`;

      const logoSVG = window.getBrandLogoSVG 
        ? window.getBrandLogoSVG(store.name, store.category) 
        : (window.createMonogramSVG ? window.createMonogramSVG(store.name, store.category) : `<div>${store.name.charAt(0)}</div>`);

      marker.innerHTML = `
        <div class="logo-tile">
          ${logoSVG}
        </div>
      `;

      marker.addEventListener('mouseenter', () => {
        this.highlightStore(store.id, true);
      });

      marker.addEventListener('mouseleave', () => {
        this.highlightStore(store.id, false);
      });

      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onStoreClick) {
          this.onStoreClick(store);
        }
      });

      this.markersLayer.appendChild(marker);
    });

    // 4. Cevahir Amenities (Tuvalet, ATM, Mescit, vb. - Filtrelendiğinde veya odaklanıldığında temiz ikonlar)
    const amenities = this.mallData.floors[floorNum]?.amenities || [];
    const AMENITY_ICONS = {
      wc: '🚻',
      atm: '💳',
      pharmacy: '💊',
      infirmary: '🩺',
      baby: '🍼',
      prayer: '🕌',
      info: 'ℹ️',
      valet: '🚗',
      carpark: '🅿️',
      taxfree: '💎',
      entrance: '🚪',
      metro: '🚇'
    };

    // Sadece amenity filtresi seçilmişse veya yakınlaşıldığında göster
    if (isFiltered || isZoomedIn) {
      amenities.forEach(amenity => {
        if (isFiltered) {
          if (this.activeCategoryFilter === 'atm' && amenity.kind !== 'atm') return;
          if (this.activeCategoryFilter === 'wc' && amenity.kind !== 'wc') return;
          if (this.activeCategoryFilter === 'service' && !['info', 'taxfree', 'pharmacy', 'infirmary', 'baby', 'prayer', 'valet'].includes(amenity.kind)) return;
          if (!['atm', 'wc', 'service'].includes(this.activeCategoryFilter)) return;
        }

        if (typeof amenity.cx !== 'number' || typeof amenity.cy !== 'number') return;

        const aMarker = document.createElement('div');
        aMarker.className = `amenity-marker amenity-badge-${amenity.kind}`;
        aMarker.setAttribute('data-amenity-id', amenity.id);
        aMarker.style.left = `${amenity.cx}px`;
        aMarker.style.top = `${amenity.cy}px`;
        aMarker.title = amenity.name;

        const icon = AMENITY_ICONS[amenity.kind] || '📍';

        aMarker.innerHTML = `
          <div class="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-xs pointer-events-auto hover:scale-110 transition-transform">
            <span>${icon}</span>
          </div>
        `;

        aMarker.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.onStoreClick) {
            this.onStoreClick(amenity);
          }
        });

        this.markersLayer.appendChild(aMarker);
      });
    }
  }

  getCategoryBg(cat) {
    const map = {
      fashion: '#8b5cf6',
      food: '#f97316',
      tech: '#06b6d4',
      cosmetics: '#ec4899',
      sports: '#10b981',
      home: '#eab308',
      entertainment: '#f43f5e',
      service: '#64748b',
      atm: '#10b981',
      wc: '#0284c7'
    };
    return map[cat] || '#64748b';
  }

  /**
   * Aktif rotayı mevcut katta çizer (4-Katmanlı Neon Rota - cevahir-rehber.web.app ilhamı)
   */
  renderRoute() {
    this.routeSvg.innerHTML = '';
    if (!this.activeRoute) return;

    const floorNodes = this.activeRoute.segmentsByFloor ? this.activeRoute.segmentsByFloor[this.currentFloor] : null;
    const floorInfo = this.mallData.floors[this.currentFloor];
    const tx = floorInfo?.transform?.tx || 0;
    const ty = floorInfo?.transform?.ty || 0;

    if (floorNodes && floorNodes.length >= 2) {
      // SVG koordinatlarına dönüştür
      const points = floorNodes.map(n => {
        const nx = (n.gx ?? n.x) + tx;
        const ny = (n.gy ?? n.y) + ty;
        return `${nx},${ny}`;
      }).join(' ');

      // 1. Ambient Glow (Geniş mavi/cyan ışıma katmanı)
      const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      glowPath.setAttribute('points', points);
      glowPath.setAttribute('class', 'route__glow');

      // 2. Route Casing (Dış sınır çizgisi)
      const casePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      casePath.setAttribute('points', points);
      casePath.setAttribute('class', 'route__case');

      // 3. Neon Core Line (Canlı neon cyan yol)
      const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      linePath.setAttribute('points', points);
      linePath.setAttribute('class', 'route__line');

      // 4. Flowing Pearl Dash (Akıp giden inci noktacıklar animasyonu)
      const flowPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      flowPath.setAttribute('points', points);
      flowPath.setAttribute('class', 'route__flow');

      this.routeSvg.appendChild(glowPath);
      this.routeSvg.appendChild(casePath);
      this.routeSvg.appendChild(linePath);
      this.routeSvg.appendChild(flowPath);
    }

    // 5. Kat Değişim "Hop" Butonları (.hop from cevahir-rehber)
    if (this.activeRoute.pathNodes && this.activeRoute.pathNodes.length > 1) {
      for (let i = 0; i < this.activeRoute.pathNodes.length - 1; i++) {
        const curr = this.activeRoute.pathNodes[i];
        const next = this.activeRoute.pathNodes[i + 1];
        if (curr.floor === this.currentFloor && next.floor !== this.currentFloor) {
          const isUp = next.floor > curr.floor;
          const arrow = isUp ? '↑ ' : '↓ ';
          const hopG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          hopG.setAttribute('class', 'hop');
          hopG.setAttribute('data-floor', next.floor);
          const cx = (curr.gx ?? curr.x) + tx;
          const cy = (curr.gy ?? curr.y) + ty;
          hopG.setAttribute('transform', `translate(${cx}, ${cy})`);
          hopG.innerHTML = `
            <rect x="-46" y="-40" width="92" height="28" rx="14"></rect>
            <path d="M-5 -12 L0 -5 L5 -12 Z"></path>
            <text y="-21.5" text-anchor="middle">${arrow}${next.floor}. Kat</text>
          `;
          hopG.addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadFloor(next.floor);
            const pills = document.querySelectorAll('.floor-pill, .floors__btn');
            pills.forEach(p => {
              if (parseInt(p.dataset.floor, 10) === next.floor) {
                p.classList.add('active', 'floors__btn--on');
              } else {
                p.classList.remove('active', 'floors__btn--on');
              }
            });
          });
          this.routeSvg.appendChild(hopG);
        }
      }

      // Başlangıç ve Bitiş Noktası Pinleri (Bu kattaysa)
      const firstNode = this.activeRoute.pathNodes[0];
      const lastNode = this.activeRoute.pathNodes[this.activeRoute.pathNodes.length - 1];

      if (firstNode && firstNode.floor === this.currentFloor) {
        this.renderPin((firstNode.gx ?? firstNode.x) + tx, (firstNode.gy ?? firstNode.y) + ty, 'start', 'Başlangıç');
      }

      if (lastNode && lastNode.floor === this.currentFloor) {
        this.renderPin((lastNode.gx ?? lastNode.x) + tx, (lastNode.gy ?? lastNode.y) + ty, 'end', 'Hedef');
      }
    }
  }

  renderPin(x, y, type, label) {
    const isStart = type === 'start';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);

    if (isStart) {
      g.setAttribute('class', 'pin pin--start');
      g.innerHTML = `
        <circle r="16" class="pin__pulse"></circle>
        <circle r="8" class="pin__dot"></circle>
      `;
    } else {
      g.setAttribute('class', 'pin pin--end');
      g.innerHTML = `
        <ellipse cy="1" rx="8" ry="3" class="pin__shadow"></ellipse>
        <g class="pin__drop">
          <path d="M0 0 C-3 -9 -13 -14 -13 -25 a13 13 0 0 1 26 0 C13 -14 3 -9 0 0 Z"></path>
          <circle cy="-25" r="5" class="pin__eye"></circle>
        </g>
      `;
    }
    this.routeSvg.appendChild(g);
  }

  setRoute(routeData) {
    this.activeRoute = routeData;
    this.renderRoute();
  }

  clearRoute() {
    this.activeRoute = null;
    this.routeSvg.innerHTML = '';
  }

  highlightStore(storeId, isHovered) {
    const el = this.svgLayer.querySelector(`[data-store-id="${storeId}"]`);
    if (el) {
      if (isHovered) {
        el.style.filter = 'brightness(1.3) drop-shadow(0 0 8px rgba(255,255,255,0.7))';
      } else if (!el.classList.contains('active-target') && !el.classList.contains('active-start')) {
        el.style.filter = '';
      }
    }
  }

  setSelectedStores(startStore, targetStore) {
    this.activeStartStore = startStore;
    this.activeTargetStore = targetStore;

    // Önceki seçimleri temizle
    this.svgLayer.querySelectorAll('.store-polygon').forEach(p => {
      p.classList.remove('active-start', 'active-target');
    });

    if (startStore && startStore.floor === this.currentFloor) {
      const p = this.svgLayer.querySelector(`[data-store-id="${startStore.id}"]`);
      if (p) p.classList.add('active-start');
    }

    if (targetStore && targetStore.floor === this.currentFloor) {
      const p = this.svgLayer.querySelector(`[data-store-id="${targetStore.id}"]`);
      if (p) p.classList.add('active-target');
    }
  }

  /**
   * Pan ve Zoom Olay Dinleyicileri
   */
  setupEventListeners() {
    // Mouse Drag
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse Wheel Zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

      // Mouse pozisyonuna göre merkezleme
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });

    // Touch Support (Mobil Dokunmatik)
    let initialTouchDist = 0;
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX - this.panX;
        this.startY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        initialTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - this.startX;
        this.panY = e.touches[0].clientY - this.startY;
        this.updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / initialTouchDist;
        this.scale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
        initialTouchDist = dist;
        this.updateTransform();
      }
    }, { passive: false });

    this.container.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Pencere boyutu değiştiğinde
    window.addEventListener('resize', () => {
      this.updateTransform();
    });
  }

  updateTransform() {
    const t = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.viewport.style.transform = t;
    this.viewport.style.transformOrigin = '0 0';

    // Yakınlaşma durumuna göre LOD kontrolü (zoom >= 1.35 olduğunda ikincil mağazaları da aç)
    const isZoomedIn = this.scale >= 1.35;
    if (this.wasZoomedIn !== isZoomedIn) {
      this.wasZoomedIn = isZoomedIn;
      this.renderBrandMarkers(this.currentFloor);
    }

    // Yakınlaşma seviyesine göre etiketlerin netliği
    if (this.scale < 0.95) {
      this.markersLayer.classList.add('low-zoom');
    } else {
      this.markersLayer.classList.remove('low-zoom');
    }
  }

  setDisplayMode(mode) {
    this.displayMode = mode; // 'anchor' | 'all'
    this.renderBrandMarkers(this.currentFloor);
  }

  toggleDisplayMode() {
    this.displayMode = this.displayMode === 'anchor' ? 'all' : 'anchor';
    this.renderBrandMarkers(this.currentFloor);
    return this.displayMode;
  }

  setCategoryFilter(category) {
    this.activeCategoryFilter = category;
    this.renderBrandMarkers(this.currentFloor);
  }

  zoom(factor) {
    this.scale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
    this.updateTransform();
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.25, this.maxScale);
    this.updateTransform();
  }

  zoomOut() {
    this.scale = Math.max(this.scale * 0.8, this.minScale);
    this.updateTransform();
  }

  resetView() {
    const rect = this.container.getBoundingClientRect();
    const scaleX = rect.width / this.vbWidth;
    const scaleY = rect.height / this.vbHeight;
    this.scale = Math.min(scaleX, scaleY) * 0.95;

    this.panX = (rect.width - this.vbWidth * this.scale) / 2;
    this.panY = (rect.height - this.vbHeight * this.scale) / 2;

    this.updateTransform();
  }

  /**
   * Pürüzsüz ease-in-out Fly-To / Zoom-In Kamera Animasyonu
   * @param {number} x - Hedef X koordinatı (SVG sahne alanı)
   * @param {number} y - Hedef Y koordinatı (SVG sahne alanı)
   * @param {number} targetScale - Hedef yakınlaşma seviyesi (varsayılan: 1.85)
   * @param {number} duration - Uçuş animasyon süresi ms (varsayılan: 650)
   */
  flyTo(x, y, targetScale = 1.85, duration = 650) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (this.flyToAnimFrame) {
      cancelAnimationFrame(this.flyToAnimFrame);
      this.flyToAnimFrame = null;
    }

    const startScale = this.scale;
    const startPanX = this.panX;
    const startPanY = this.panY;

    const clampedTargetScale = Math.min(Math.max(targetScale, this.minScale), this.maxScale);
    const endPanX = rect.width / 2 - x * clampedTargetScale;
    const endPanY = rect.height / 2 - y * clampedTargetScale;

    const startTime = performance.now();

    // Pürüzsüz easeInOutCubic eğrisi
    const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = easeInOutCubic(progress);

      this.scale = startScale + (clampedTargetScale - startScale) * ease;
      this.panX = startPanX + (endPanX - startPanX) * ease;
      this.panY = startPanY + (endPanY - startPanY) * ease;

      this.updateTransform();

      if (progress < 1.0) {
        this.flyToAnimFrame = requestAnimationFrame(animate);
      } else {
        this.flyToAnimFrame = null;
      }
    };

    this.flyToAnimFrame = requestAnimationFrame(animate);
  }

  focusOnPoint(x, y, targetScale = 1.85) {
    this.flyTo(x, y, targetScale, 650);
  }
}

window.MallMap = MallMap;
