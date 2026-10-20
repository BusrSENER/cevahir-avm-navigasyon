/**
 * Cevahir Rehber - İstanbul Cevahir AVM İnteraktif Harita & Navigasyon
 * Sol Panel (3 Sütunlu Mağaza Kartları), Kategori & İhtiyaç Filtreleri, Alışveriş Sepeti Navigasyonu
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. AVM Verilerini Yükle
    const resp = await fetch('public/mall_data.json');
    if (!resp.ok) throw new Error('Veriler yüklenemedi: ' + resp.status);
    const mallData = await resp.json();

    // 2. Modülleri Başlat
    const navEngine = new NavigationEngine(mallData);

    let mallMap = null;
    let simulator = null;

    let selectedStartStore = null;
    let selectedTargetStore = null;
    let activeRouteMode = 'escalator'; // 'escalator' | 'elevator'
    let currentFloor = 2; // Başlangıç katı 2 (kullanıcı ekran görüntüsü referansı)
    let filterTab = 'this_floor'; // 'this_floor' | 'all_floors'
    let activeCategory = 'all';
    let searchQuery = '';

    // DOM Elementleri
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const gpsQuickBtn = document.getElementById('gps-quick-btn');
    const tabThisFloor = document.getElementById('tab-this-floor');
    const tabAllFloors = document.getElementById('tab-all-floors');
    const thisFloorNumSpan = document.getElementById('this-floor-num');
    const storeGrid = document.getElementById('sidebar-store-grid');

    const sidebarQuickNav = document.getElementById('sidebar-quick-nav');
    const quickNavInfoBox = document.getElementById('quick-nav-info-box');
    const quickNavLogo = document.getElementById('quick-nav-logo');
    const quickNavName = document.getElementById('quick-nav-name');
    const quickNavFloor = document.getElementById('quick-nav-floor');
    const quickRouteBtn = document.getElementById('quick-route-btn');

    // Detaylı POI (Point of Interest) Kartı DOM Elemanları
    const sidebarTabsContainer = document.getElementById('sidebar-tabs-container');
    const sidebarPoiDetail = document.getElementById('sidebar-poi-detail');
    const poiBackBtn = document.getElementById('poi-back-btn');
    const poiLogo = document.getElementById('poi-logo');
    const poiName = document.getElementById('poi-name');
    const poiCategory = document.getElementById('poi-category');
    const poiFloorBadge = document.getElementById('poi-floor-badge');
    const poiUnitNo = document.getElementById('poi-unit-no');
    const poiCampaignCard = document.getElementById('poi-campaign-card');
    const poiCampaignBadge = document.getElementById('poi-campaign-badge');
    const poiCampaignText = document.getElementById('poi-campaign-text');
    const poiCouponCode = document.getElementById('poi-coupon-code');
    const poiCopyCouponBtn = document.getElementById('poi-copy-coupon-btn');
    const poiRouteBtn = document.getElementById('poi-route-btn');
    const poiStartBtn = document.getElementById('poi-start-btn');
    const poiSidebarRoute = document.getElementById('poi-sidebar-route');
    const poiRouteSummary = document.getElementById('poi-route-summary');
    const poiStepsList = document.getElementById('poi-steps-list');

    const routePanel = document.getElementById('route-panel');
    const routeInfoCard = document.getElementById('route-info-card');
    const routeDistEl = document.getElementById('route-distance');
    const routeTimeEl = document.getElementById('route-time');
    const routeFloorsEl = document.getElementById('route-floors');
    const routeStartLabel = document.getElementById('route-start-label');
    const routeTargetLabel = document.getElementById('route-target-label');
    const routeSwapBtn = document.getElementById('route-swap-btn');
    const routeStepsContainer = document.getElementById('route-steps-container');
    const clearRouteBtn = document.getElementById('clear-route-btn');

    const routeModeEscalator = document.getElementById('mode-escalator');
    const routeModeElevator = document.getElementById('mode-elevator');
    const navModePreview = document.getElementById('nav-mode-preview');
    const navModeGps = document.getElementById('nav-mode-gps');
    let currentNavType = 'preview'; // 'preview' | 'gps'

    const simPlayBtn = document.getElementById('sim-play-btn');
    const simPlayText = document.getElementById('sim-play-text');
    const simResetBtn = document.getElementById('sim-reset-btn');
    const simSpeed1 = document.getElementById('sim-speed-1');
    const simSpeed2 = document.getElementById('sim-speed-2');
    const simSpeed4 = document.getElementById('sim-speed-4');
    const simProgressBar = document.getElementById('sim-progress-bar');

    const floorPills = document.querySelectorAll('.floor-pill');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const resetViewBtn = document.getElementById('reset-view-btn');

    const storeModal = document.getElementById('store-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalStoreLogo = document.getElementById('modal-store-logo-wrapper');
    const modalStoreName = document.getElementById('modal-store-name');
    const modalStoreCategory = document.getElementById('modal-store-category');
    const modalStoreFloor = document.getElementById('modal-store-floor');
    const modalStoreLoc = document.getElementById('modal-store-loc');
    const modalCampaignCard = document.getElementById('modal-campaign-card');
    const modalCampaignBadge = document.getElementById('modal-campaign-badge');
    const modalCampaignExpires = document.getElementById('modal-campaign-expires');
    const modalCampaignTitle = document.getElementById('modal-campaign-title');
    const modalCampaignDiscount = document.getElementById('modal-campaign-discount');
    const modalCampaignCode = document.getElementById('modal-campaign-code');
    const modalCampaignCodeBtn = document.getElementById('modal-campaign-code-btn');
    const modalSetStartBtn = document.getElementById('modal-set-start-btn');
    const modalSetTargetBtn = document.getElementById('modal-set-target-btn');
    const modalPreviewBtn = document.getElementById('modal-preview-btn');
    const modalStartNavBtn = document.getElementById('modal-start-nav-btn');

    const locationModal = document.getElementById('location-modal');
    const locationModalClose = document.getElementById('location-modal-close');
    const locBtnGps = document.getElementById('loc-btn-gps');
    const locEntranceBtns = document.querySelectorAll('.loc-entrance-btn');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');

    // 3. Tema Yönetimi (Varsayılan Aydınlık Mod - Ekran Görüntüsü Referansı)
    const savedTheme = localStorage.getItem('cevahir_theme') || 'light';
    applyTheme(savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark');
        const nextTheme = isDark ? 'light' : 'dark';
        applyTheme(nextTheme);
        localStorage.setItem('cevahir_theme', nextTheme);
      });
    }

    function applyTheme(theme) {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
        if (themeToggleBtn) {
          themeToggleBtn.title = 'Aydınlık Moda Geç';
          themeToggleBtn.classList.remove('text-slate-600');
          themeToggleBtn.classList.add('text-amber-400');
        }
      } else {
        document.documentElement.classList.remove('dark');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
        if (themeToggleBtn) {
          themeToggleBtn.title = 'Karanlık Moda Geç';
          themeToggleBtn.classList.remove('text-amber-400');
          themeToggleBtn.classList.add('text-slate-600');
        }
      }
      if (window.lucide) {
        lucide.createIcons();
      }
    }

    // 4. Harita Motorunu Başlat (Kat 2 ile açılır)
    mallMap = new MallMap('svg-container', mallData, (store) => {
      selectStore(store);
      openStoreModal(store);
    });

    // 5. Simülatörü Başlat
    simulator = new CartSimulator(
      mallMap,
      (progress, stepIndex) => {
        if (simProgressBar) {
          simProgressBar.style.width = `${progress * 100}%`;
        }
        highlightCurrentInstruction(stepIndex);
      },
      (newFloor) => {
        currentFloor = newFloor;
        updateFloorUI(newFloor);
      },
      () => {
        if (simPlayBtn) {
          simPlayBtn.innerHTML = `
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span>Tekrar Başlat</span>
          `;
          if (window.lucide) lucide.createIcons();
        }
      }
    );
    window.simulator = simulator;

    // 6. Sol Panel: Mağaza Kartları Gridini Oluşturma
    function getAllStores() {
      const stores = [];
      Object.keys(mallData.floors).forEach(fl => {
        const flNum = parseInt(fl, 10);
        (mallData.floors[fl].stores || []).forEach(s => {
          stores.push({ ...s, floor: flNum });
        });
      });
      return stores;
    }

    function renderSidebarStoreGrid() {
      if (!storeGrid) return;

      let list = [];
      if (filterTab === 'this_floor') {
        const floorStores = mallData.floors[currentFloor]?.stores || [];
        list = floorStores.map(s => ({ ...s, floor: currentFloor }));
      } else {
        list = getAllStores();
      }

      // Kategori Filtresi
      if (activeCategory && activeCategory !== 'all') {
        list = list.filter(s => {
          if (activeCategory === 'fashion') return ['fashion'].includes(s.category);
          if (activeCategory === 'shoes') return ['shoes', 'fashion'].includes(s.category) && (s.name.toLowerCase().includes('ayakkabı') || s.name.toLowerCase().includes('flo') || s.name.toLowerCase().includes('derimod') || s.name.toLowerCase().includes('çanta') || s.category === 'shoes');
          if (activeCategory === 'sports') return ['sports'].includes(s.category);
          if (activeCategory === 'tech') return ['tech'].includes(s.category);
          if (activeCategory === 'cosmetics') return ['cosmetics'].includes(s.category);
          if (activeCategory === 'food') return ['food'].includes(s.category);
          if (activeCategory === 'home') return ['home'].includes(s.category);
          if (activeCategory === 'entertainment') return ['entertainment'].includes(s.category);
          if (activeCategory === 'service') return ['service'].includes(s.category);
          return s.category === activeCategory;
        });
      }

      // Arama Filtresi
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(s => 
          s.name.toLowerCase().includes(q) || 
          (s.category && s.category.toLowerCase().includes(q))
        );
      }

      // Alfabetik sırala
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

      if (list.length === 0) {
        storeGrid.innerHTML = `
          <div class="col-span-3 py-12 text-center text-slate-400">
            <div class="text-3xl mb-2">🔍</div>
            <div class="text-xs font-semibold text-slate-600 dark:text-slate-300">Mağaza bulunamadı</div>
            <div class="text-[11px] text-slate-400 mt-1">Farklı bir arama veya kategori deneyebilirsiniz.</div>
          </div>
        `;
        return;
      }

      storeGrid.innerHTML = list.map(store => {
        const logoSVG = window.getBrandLogoSVG 
          ? window.getBrandLogoSVG(store.name, store.category) 
          : (window.createMonogramSVG ? window.createMonogramSVG(store.name, store.category) : `<div>${store.name.charAt(0)}</div>`);

        const isSelected = selectedTargetStore && selectedTargetStore.id === store.id;

        return `
          <div class="store-card ${isSelected ? 'is-active' : ''}" data-store-id="${store.id}" data-floor="${store.floor}">
            <div class="store-card__logo">
              ${logoSVG}
            </div>
            <div class="store-card__name">${store.name}</div>
            <div class="store-card__floor">${store.floor}. Kat</div>
          </div>
        `;
      }).join('');

      // Kartlara tıklama olayı
      storeGrid.querySelectorAll('.store-card').forEach(card => {
        card.addEventListener('click', () => {
          const storeId = card.dataset.storeId;
          const storeFl = parseInt(card.dataset.floor, 10);
          const store = (mallData.floors[storeFl]?.stores || []).find(s => s.id === storeId);
          if (store) {
            selectStore({ ...store, floor: storeFl });
          }
        });
      });
    }

    // 7. Mağaza Seçimi & Odaklanma
    function selectStore(store) {
      selectedTargetStore = store;

      // Mağaza kartlarındaki aktif sınıfını güncelle
      storeGrid.querySelectorAll('.store-card').forEach(c => {
        if (c.dataset.storeId === store.id) {
          c.classList.add('is-active');
        } else {
          c.classList.remove('is-active');
        }
      });

      // Farklı kattaysa o kata geç
      if (mallMap.currentFloor !== store.floor) {
        currentFloor = store.floor;
        updateFloorUI(store.floor);
        mallMap.loadFloor(store.floor).then(() => {
          mallMap.flyTo(store.cx, store.cy, 1.85, 650);
          mallMap.highlightStore(store.id, true);
        });
      } else {
        mallMap.flyTo(store.cx, store.cy, 1.85, 650);
        mallMap.highlightStore(store.id, true);
      }

      // Hızlı Navigasyon Barını Göster
      if (sidebarQuickNav) {
        const logoSVG = window.getBrandLogoSVG 
          ? window.getBrandLogoSVG(store.name, store.category) 
          : (window.createMonogramSVG ? window.createMonogramSVG(store.name, store.category) : '');
        quickNavLogo.innerHTML = logoSVG;
        quickNavName.textContent = store.name;
        quickNavFloor.textContent = `${store.floor}. Kat`;
        sidebarQuickNav.classList.remove('hidden');
      }

      // Sol Panel Detaylı POI Kartını Güncelle ve Göster
      renderPoiDetail(store);
    }

    // Detaylı POI Kartını Doldurma ve Sol Paneli Güncelleme
    function renderPoiDetail(store) {
      if (!sidebarPoiDetail) return;

      // 1. Logoyu ayarla
      if (poiLogo) {
        const logoSVG = window.getBrandLogoSVG 
          ? window.getBrandLogoSVG(store.name, store.category) 
          : (window.createMonogramSVG ? window.createMonogramSVG(store.name, store.category) : `<span>${store.name.charAt(0)}</span>`);
        poiLogo.innerHTML = logoSVG;
      }

      // 2. İsim & Kategori & Kat
      if (poiName) poiName.textContent = store.name;
      if (poiFloorBadge) poiFloorBadge.textContent = `${store.floor}. Kat`;
      if (poiUnitNo) poiUnitNo.textContent = `Kapı No: ${store.unit || store.id || '-'}`;

      const catNames = {
        fashion: 'Moda & Giyim',
        shoes: 'Ayakkabı & Çanta',
        sports: 'Spor & Outdoor',
        tech: 'Teknoloji & Elektronik',
        cosmetics: 'Kozmetik & Bakım',
        food: 'Yeme & İçme',
        home: 'Ev & Yaşam',
        entertainment: 'Eğlence & Çocuk',
        service: 'Hizmet & Danışma'
      };
      if (poiCategory) poiCategory.textContent = catNames[store.category] || store.category || 'Mağaza';

      // 3. Kampanya Bilgisi
      if (store.campaign && poiCampaignCard) {
        poiCampaignCard.classList.remove('hidden');
        if (poiCampaignBadge) poiCampaignBadge.textContent = store.campaign.discount || '%20 İndirim';
        if (poiCampaignText) poiCampaignText.textContent = store.campaign.description || store.campaign.title || 'Sezon indirimleri';
        if (poiCouponCode) poiCouponCode.textContent = store.campaign.code || 'CEVAHIR20';
      } else if (poiCampaignCard) {
        poiCampaignCard.classList.add('hidden');
      }

      // 4. Sol Panel Görünümünü Değiştir (Grid'i gizle, POI detayını göster)
      if (storeGrid) storeGrid.classList.add('hidden');
      if (sidebarTabsContainer) sidebarTabsContainer.classList.add('hidden');
      sidebarPoiDetail.classList.remove('hidden');

      if (window.lucide) lucide.createIcons();
    }

    // POI Geri Butonu: Grid Görünümüne Geri Dön
    if (poiBackBtn) {
      poiBackBtn.addEventListener('click', () => {
        if (sidebarPoiDetail) sidebarPoiDetail.classList.add('hidden');
        if (storeGrid) storeGrid.classList.remove('hidden');
        if (sidebarTabsContainer) sidebarTabsContainer.classList.remove('hidden');
      });
    }

    // POI Yol Tarifi Butonu
    if (poiRouteBtn) {
      poiRouteBtn.addEventListener('click', () => {
        if (!selectedTargetStore) return;
        startNavigationTo(selectedTargetStore);
      });
    }

    // POI Başlangıç Noktası Yap Butonu
    if (poiStartBtn) {
      poiStartBtn.addEventListener('click', () => {
        if (!selectedTargetStore) return;
        selectedStartStore = selectedTargetStore;
        if (routeStartLabel) routeStartLabel.textContent = `${selectedStartStore.name} (${selectedStartStore.floor}. Kat)`;
        showToast(`${selectedStartStore.name} başlangıç noktası olarak belirlendi. Şimdi gitmek istediğiniz mağazayı seçebilirsiniz.`, 'success', 'Başlangıç Belirlendi');
        poiStartBtn.innerHTML = `
          <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500"></i>
          <span>Başlangıç Olarak Belirlendi</span>
        `;
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
          poiStartBtn.innerHTML = `
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span>Başlangıç Noktası Yap</span>
          `;
          if (window.lucide) lucide.createIcons();
        }, 2000);
      });
    }

    // POI Kupon Kodu Kopyalama
    if (poiCopyCouponBtn && poiCouponCode) {
      poiCopyCouponBtn.addEventListener('click', () => {
        const code = poiCouponCode.textContent.trim();
        navigator.clipboard.writeText(code).then(() => {
          poiCopyCouponBtn.textContent = 'Kopyalandı! ✓';
          setTimeout(() => {
            poiCopyCouponBtn.textContent = 'Kodu Kopyala';
          }, 2000);
        });
      });
    }

    // Hızlı Navigasyon Barındaki Mağaza Kutusuna Tıklandığında POI Kartını Aç
    if (quickNavInfoBox) {
      quickNavInfoBox.addEventListener('click', () => {
        if (selectedTargetStore) renderPoiDetail(selectedTargetStore);
      });
    }

    // Hızlı "Yol Tarifi" Butonu
    if (quickRouteBtn) {
      quickRouteBtn.addEventListener('click', () => {
        if (!selectedTargetStore) return;
        startNavigationTo(selectedTargetStore);
      });
    }

    // 8. Kat Değişimi Yönetimi
    function updateFloorUI(floorNum) {
      currentFloor = floorNum;

      // Dikey Kat butonlarını güncelle
      floorPills.forEach(btn => {
        const fl = parseInt(btn.dataset.floor, 10);
        if (fl === floorNum) {
          btn.classList.add('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-md');
          btn.classList.remove('text-slate-600', 'dark:text-slate-300');
        } else {
          btn.classList.remove('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-md');
          btn.classList.add('text-slate-600', 'dark:text-slate-300');
        }
      });

      // Sol Panel Segmented Tab kat numarasını güncelle
      if (thisFloorNumSpan) {
        thisFloorNumSpan.textContent = floorNum;
      }

      // Sol üst kat kartını güncelle
      const titleEl = document.getElementById('floor-title-text');
      const subtitleEl = document.getElementById('floor-subtitle-text');
      const floorInfo = mallData.floors[floorNum];
      if (titleEl) titleEl.textContent = `${floorNum}. Kat`;
      if (subtitleEl && floorInfo) subtitleEl.textContent = floorInfo.subtitle || floorInfo.label || '';

      // Dev Watermark'ı güncelle
      const watermarkEl = document.getElementById('map-watermark');
      if (watermarkEl) watermarkEl.textContent = floorNum;

      // Mağaza listesini yeniden render et
      renderSidebarStoreGrid();

      // Simülatör arabasını mevcut kata göre göster/gizle
      if (simulator && typeof simulator.checkVisibility === 'function') {
        simulator.checkVisibility();
      }
    }

    floorPills.forEach(btn => {
      btn.addEventListener('click', () => {
        const fl = parseInt(btn.dataset.floor, 10);
        if (fl === mallMap.currentFloor) return;
        mallMap.loadFloor(fl);
        updateFloorUI(fl);
      });
    });

    // 9. Segmented Control Tabs (Bu katta vs Tüm katlar)
    if (tabThisFloor && tabAllFloors) {
      tabThisFloor.addEventListener('click', () => {
        filterTab = 'this_floor';
        tabThisFloor.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        tabThisFloor.classList.remove('text-slate-500', 'dark:text-slate-400');
        tabAllFloors.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        tabAllFloors.classList.add('text-slate-500', 'dark:text-slate-400');
        renderSidebarStoreGrid();
      });

      tabAllFloors.addEventListener('click', () => {
        filterTab = 'all_floors';
        tabAllFloors.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        tabAllFloors.classList.remove('text-slate-500', 'dark:text-slate-400');
        tabThisFloor.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
        tabThisFloor.classList.add('text-slate-500', 'dark:text-slate-400');
        renderSidebarStoreGrid();
      });
    }

    // 10. Kategori Çipleri (Moda, Spor, Yeme-İçme, vb.)
    const catPills = document.querySelectorAll('.cat-pill');
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => {
          p.classList.remove('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-sm');
          p.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');
        });

        pill.classList.add('active', 'bg-slate-900', 'dark:bg-white', 'text-white', 'dark:text-slate-900', 'shadow-sm');
        pill.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300');

        activeCategory = pill.dataset.category || 'all';
        renderSidebarStoreGrid();
        if (mallMap) {
          mallMap.setCategoryFilter(activeCategory);
        }
      });
    });

    // 11. Hızlı İhtiyaçlar (Tuvalet, Giriş, Revir, Güvenlik, ATM, Otopark, Mescit, Bebek Odası)
    const amenityPills = document.querySelectorAll('.amenity-pill');
    amenityPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const rawKind = pill.dataset.amenity;
        if (!rawKind) return;

        let kindsToMatch = [rawKind];
        if (rawKind === 'entrance' || rawKind === 'entry') kindsToMatch = ['entrance', 'metro', 'carpark'];
        if (rawKind === 'carpark' || rawKind === 'parking') kindsToMatch = ['carpark'];
        if (rawKind === 'infirmary') kindsToMatch = ['infirmary'];
        if (rawKind === 'info') kindsToMatch = ['info'];

        const pool = [...(mallData.amenities || []), ...(mallData.entrances || [])];

        // Önce mevcut kattaki amenity'yi ara
        let match = pool.find(a => kindsToMatch.includes(a.kind) && a.floor === mallMap.currentFloor);
        if (!match) {
          match = pool.find(a => kindsToMatch.includes(a.kind));
        }

        if (match) {
          if (mallMap.currentFloor !== match.floor) {
            mallMap.loadFloor(match.floor).then(() => {
              mallMap.focusOnPoint(match.cx, match.cy, 1.8);
            });
            updateFloorUI(match.floor);
          } else {
            mallMap.focusOnPoint(match.cx, match.cy, 1.8);
          }
          openStoreModal(match);
        }
      });
    });

    // 12. Arama Çubuğu & GPS Buton Olayları
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchClearBtn) {
          searchClearBtn.classList.toggle('hidden', !searchQuery);
        }
        renderSidebarStoreGrid();
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.classList.add('hidden');
        renderSidebarStoreGrid();
        searchInput.focus();
      });
    }

    // GPS & Konum Seçici Modalı Olayları
    if (gpsQuickBtn) {
      gpsQuickBtn.addEventListener('click', () => {
        if (locationModal) locationModal.classList.remove('hidden');
      });
    }

    if (locationModalClose) {
      locationModalClose.addEventListener('click', () => {
        if (locationModal) locationModal.classList.add('hidden');
      });
    }

    if (locBtnGps) {
      locBtnGps.addEventListener('click', () => {
        locBtnGps.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="animate-spin">🔄</span>
            <span>GPS Konumunuz Alınıyor...</span>
          </div>
        `;
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const metroEnt = (mallData.entrances || []).find(e => e.id === 'entrance101' || e.name.toLowerCase().includes('metro')) || mallData.entrances[0];
              selectedStartStore = metroEnt;
              if (routeStartLabel) routeStartLabel.textContent = `📍 GPS: ${metroEnt.name} (1. Kat)`;
              locBtnGps.innerHTML = `
                <div class="flex items-center gap-2 text-emerald-600">
                  <span>✓</span>
                  <span>Konumunuz Algılandı (Metro Girişi)</span>
                </div>
              `;
              setTimeout(() => {
                if (locationModal) locationModal.classList.add('hidden');
                locBtnGps.innerHTML = `
                  <div class="flex items-center gap-2.5">
                    <i data-lucide="crosshair" class="w-4 h-4 text-cyan-500 animate-pulse"></i>
                    <span>Cihaz Konumumu Algıla (GPS)</span>
                  </div>
                  <span class="text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full">Otomatik</span>
                `;
                if (window.lucide) lucide.createIcons();
                if (selectedTargetStore) {
                  startNavigationTo(selectedTargetStore, 'gps');
                }
              }, 800);
            },
            (err) => {
              const metroEnt = (mallData.entrances || []).find(e => e.id === 'entrance101' || e.name.toLowerCase().includes('metro')) || mallData.entrances[0];
              selectedStartStore = metroEnt;
              if (routeStartLabel) routeStartLabel.textContent = `${metroEnt.name} (1. Kat)`;
              if (locationModal) locationModal.classList.add('hidden');
              if (selectedTargetStore) startNavigationTo(selectedTargetStore, 'preview');
            },
            { timeout: 5000, enableHighAccuracy: true }
          );
        } else {
          const metroEnt = (mallData.entrances || []).find(e => e.id === 'entrance101' || e.name.toLowerCase().includes('metro')) || mallData.entrances[0];
          selectedStartStore = metroEnt;
          if (routeStartLabel) routeStartLabel.textContent = `${metroEnt.name} (1. Kat)`;
          if (locationModal) locationModal.classList.add('hidden');
        }
      });
    }

    locEntranceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const entId = btn.dataset.entranceId;
        const ent = (mallData.entrances || []).find(e => e.id === entId) || mallData.entrances[0];
        if (ent) {
          selectedStartStore = ent;
          if (routeStartLabel) routeStartLabel.textContent = `${ent.name} (${ent.floor}. Kat)`;
          if (locationModal) locationModal.classList.add('hidden');
          if (selectedTargetStore) {
            startNavigationTo(selectedTargetStore, currentNavType);
          }
        }
      });
    });

    if (routeStartLabel) {
      routeStartLabel.addEventListener('click', () => {
        if (locationModal) locationModal.classList.remove('hidden');
      });
    }

    if (routeSwapBtn) {
      routeSwapBtn.addEventListener('click', () => {
        if (!selectedStartStore || !selectedTargetStore) return;
        const temp = selectedStartStore;
        selectedStartStore = selectedTargetStore;
        selectedTargetStore = temp;

        if (routeStartLabel) routeStartLabel.textContent = `${selectedStartStore.name} (${selectedStartStore.floor}. Kat)`;
        if (routeTargetLabel) routeTargetLabel.textContent = `${selectedTargetStore.name} (${selectedTargetStore.floor}. Kat)`;

        startNavigationTo(selectedTargetStore, currentNavType);
      });
    }

    // 13. Zoom Butonları
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => mallMap.zoom(1.25));
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => mallMap.zoom(0.8));
    }
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => mallMap.resetView());
    }

    // 14. Modern Noir Toast / Snackbar Bildirim Motoru
    function showToast(message, type = 'info', title = '') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast-item toast-${type}`;

      const iconMap = {
        error: '⚠️',
        warning: '⚡',
        success: '✓',
        info: '🧭'
      };

      const titleMap = {
        error: title || 'Hata',
        warning: title || 'Dikkat',
        success: title || 'Başarılı',
        info: title || 'Rota Rehberi'
      };

      const icon = iconMap[type] || 'ℹ️';

      toast.innerHTML = `
        <div class="w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0 bg-white/10 shadow-inner">
          <span>${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold font-heading mb-0.5 tracking-tight">${titleMap[type]}</div>
          <div class="text-[11px] opacity-90 leading-snug">${message}</div>
        </div>
        <button class="toast-close-btn opacity-60 hover:opacity-100 transition-opacity p-1 -mr-1">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
        </button>
      `;

      const closeToast = () => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 260);
      };

      toast.querySelector('.toast-close-btn').addEventListener('click', closeToast);
      container.appendChild(toast);

      setTimeout(closeToast, 4000);
    }

    // 15. Navigasyon Hesaplama & Başlatma Fonksiyonu (Önizleme vs Canlı GPS)
    function startNavigationTo(targetStore, navType = 'preview') {
      selectedTargetStore = targetStore;
      currentNavType = navType;

      // Varsayılan Başlangıç Noktası Belirleme
      let defaultStart = null;
      if (targetStore.floor === 1) {
        defaultStart = (mallData.entrances || []).find(e => e.id === 'entrance101' || e.name.toLowerCase().includes('metro')) || mallData.entrances[0];
      } else {
        defaultStart = (mallData.entrances || []).find(e => e.id === 'entrance201' || e.name.toLowerCase().includes('büyükdere')) || mallData.entrances[0];
      }

      // Eğer hedef mağaza ile başlangıç noktası aynı seçilmişse (örn: Koton başlangıç yapılıp Koton'a yol tarifi istendiğinde)
      if (selectedStartStore && (selectedStartStore.id === targetStore.id || (selectedStartStore.nav_node && selectedStartStore.nav_node === targetStore.nav_node))) {
        selectedStartStore = defaultStart;
        showToast(`Hedef seçildiğinden, başlangıç noktası olarak otomatik ${defaultStart.name} belirlendi.`, 'info', 'Başlangıç Güncellendi');
      }

      if (!selectedStartStore) {
        selectedStartStore = defaultStart;
      }

      const startNode = selectedStartStore.nav_node || selectedStartStore.node;
      const targetNode = selectedTargetStore.nav_node || selectedTargetStore.node;

      if (!startNode || !targetNode) {
        showToast('Seçilen noktalar için navigasyon bağlantısı kurulamadı.', 'error', 'Rota Hatası');
        return;
      }

      const routeResult = navEngine.findRoute(startNode, targetNode, activeRouteMode);
      if (!routeResult) {
        showToast('Bu iki nokta arasında uygun rota bulunamadı.', 'error', 'Rota Bulunamadı');
        return;
      }

      // Harita ve Simülatöre Rota Gönderimi
      mallMap.setRoute(routeResult);
      mallMap.setSelectedStores(selectedStartStore, selectedTargetStore);
      simulator.setRoute(routeResult);

      // Başlangıç ve Hedef Etiketlerini Güncelle
      if (routeStartLabel) routeStartLabel.textContent = `${selectedStartStore.name} (${selectedStartStore.floor}. Kat)`;
      if (routeTargetLabel) routeTargetLabel.textContent = `${selectedTargetStore.name} (${selectedTargetStore.floor}. Kat)`;

      // Rota Bilgi Kartını Doldur
      if (routeDistEl) routeDistEl.textContent = `${routeResult.totalDistance} m`;
      if (routeTimeEl) routeTimeEl.textContent = `${routeResult.estimatedMinutes} dk`;
      if (poiRouteSummary) poiRouteSummary.textContent = `${routeResult.totalDistance} m · ~${routeResult.estimatedMinutes} dk`;

      const startFloor = routeResult.pathNodes[0].floor;
      const endFloor = routeResult.pathNodes[routeResult.pathNodes.length - 1].floor;
      if (routeFloorsEl) {
        if (startFloor === endFloor) {
          routeFloorsEl.textContent = `Aynı Kat (${startFloor}. Kat)`;
        } else {
          const modeLabel = activeRouteMode === 'elevator' ? 'Asansör' : 'Yürüyen Merdiven';
          routeFloorsEl.textContent = `${startFloor}. Kat ➔ ${endFloor}. Kat (${modeLabel})`;
        }
      }

      // Nav Modu UI Güncellemesi
      if (navModePreview && navModeGps) {
        if (navType === 'preview') {
          navModePreview.className = 'flex-1 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm flex items-center justify-center gap-1 transition-all';
          navModeGps.className = 'flex-1 py-1.5 text-xs font-semibold rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1 transition-all';
        } else {
          navModeGps.className = 'flex-1 py-1.5 text-xs font-bold rounded-xl bg-cyan-600 text-white shadow-sm flex items-center justify-center gap-1 transition-all';
          navModePreview.className = 'flex-1 py-1.5 text-xs font-semibold rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1 transition-all';
        }
      }

      // Kat Butonlarına Rota Göstergesi Ekle
      floorPills.forEach(p => {
        const fl = parseInt(p.dataset.floor, 10);
        if (routeResult.segmentsByFloor[fl]) {
          p.classList.add('has-route', 'floors__btn--route');
        } else {
          p.classList.remove('has-route', 'floors__btn--route');
        }
      });

      // Talimat Listesini Oluştur
      renderInstructionsList(routeResult.instructions);

      // Rota Kartını Göster
      if (routeInfoCard) {
        routeInfoCard.classList.remove('hidden');
      }

      // Başlangıç Katına ve Noktasına Odaklan
      const sNode = routeResult.pathNodes[0];
      const sx = sNode?.gx ?? sNode?.x;
      const sy = sNode?.gy ?? sNode?.y;

      if (mallMap.currentFloor !== startFloor) {
        mallMap.loadFloor(startFloor).then(() => {
          updateFloorUI(startFloor);
          if (typeof sx === 'number' && typeof sy === 'number') {
            mallMap.flyTo(sx, sy, 1.6, 500);
          }
        });
      } else if (typeof sx === 'number' && typeof sy === 'number') {
        mallMap.flyTo(sx, sy, 1.6, 500);
      }

      // Sepeti / Simülatörü Otomatik Başlat!
      setTimeout(() => {
        simulator.start();
        if (simPlayBtn && simPlayText) {
          simPlayText.textContent = 'Durdur';
          simPlayBtn.querySelector('i')?.setAttribute('data-lucide', 'pause');
          if (window.lucide) lucide.createIcons();
        }
      }, 350);
    }

    if (navModePreview) {
      navModePreview.addEventListener('click', () => {
        if (selectedTargetStore) startNavigationTo(selectedTargetStore, 'preview');
      });
    }

    if (navModeGps) {
      navModeGps.addEventListener('click', () => {
        if (selectedTargetStore) startNavigationTo(selectedTargetStore, 'gps');
      });
    }

    function renderInstructionsList(instructions) {
      const html = instructions.map((inst, idx) => `
        <div class="instruction-item flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 transition-colors" data-step="${idx}">
          <div class="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
            ${idx + 1}
          </div>
          <div class="text-[11px] text-slate-700 dark:text-slate-200 leading-snug font-medium">
            ${inst.text}
          </div>
        </div>
      `).join('');

      if (routeStepsContainer) {
        routeStepsContainer.innerHTML = html;
      }

      if (poiStepsList) {
        poiStepsList.innerHTML = html;
      }

      if (poiSidebarRoute) {
        poiSidebarRoute.classList.remove('hidden');
      }
    }

    function highlightCurrentInstruction(nodeIndex) {
      const stepIdx = Math.floor(nodeIndex / 3);
      [routeStepsContainer, poiStepsList].forEach(container => {
        if (!container) return;
        const items = container.querySelectorAll('.instruction-item');
        items.forEach((item, idx) => {
          if (idx === stepIdx) {
            item.classList.add('bg-cyan-500/20', 'border-cyan-400/50');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            item.classList.remove('bg-cyan-500/20', 'border-cyan-400/50');
          }
        });
      });
    }

    // Rota Kapatma Butonu
    if (clearRouteBtn) {
      clearRouteBtn.addEventListener('click', () => {
        simulator.stop();
        mallMap.clearRoute();
        selectedStartStore = null;
        selectedTargetStore = null;
        if (routeInfoCard) routeInfoCard.classList.add('hidden');
        if (poiSidebarRoute) poiSidebarRoute.classList.add('hidden');
        floorPills.forEach(p => p.classList.remove('has-route', 'floors__btn--route'));
      });
    }

    // Ulaşım Modu Değiştirme (Yürüyen Merdiven vs Asansör)
    if (routeModeEscalator && routeModeElevator) {
      routeModeEscalator.addEventListener('click', () => {
        activeRouteMode = 'escalator';
        routeModeEscalator.className = 'flex-1 py-1.5 px-2.5 rounded-xl border border-red-500 bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm';
        routeModeElevator.className = 'flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all';
        if (selectedTargetStore) startNavigationTo(selectedTargetStore, currentNavType);
      });

      routeModeElevator.addEventListener('click', () => {
        activeRouteMode = 'elevator';
        routeModeElevator.className = 'flex-1 py-1.5 px-2.5 rounded-xl border border-red-500 bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm';
        routeModeEscalator.className = 'flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all';
        if (selectedTargetStore) startNavigationTo(selectedTargetStore, currentNavType);
      });
    }

    // Simülatör Kontrolleri
    if (simPlayBtn) {
      simPlayBtn.addEventListener('click', () => {
        if (simulator.isPlaying) {
          simulator.pause();
          if (simPlayText) simPlayText.textContent = 'Devam Et';
          simPlayBtn.querySelector('i')?.setAttribute('data-lucide', 'play');
        } else {
          simulator.resume();
          if (simPlayText) simPlayText.textContent = 'Durdur';
          simPlayBtn.querySelector('i')?.setAttribute('data-lucide', 'pause');
        }
        if (window.lucide) lucide.createIcons();
      });
    }

    if (simResetBtn) {
      simResetBtn.addEventListener('click', () => {
        simulator.stop();
        if (simProgressBar) simProgressBar.style.width = '0%';
        if (simPlayBtn && simPlayText) {
          simPlayText.textContent = 'Sepeti Başlat';
          simPlayBtn.querySelector('i')?.setAttribute('data-lucide', 'play');
          if (window.lucide) lucide.createIcons();
        }
      });
    }

    // Hız Butonları
    [simSpeed1, simSpeed2, simSpeed4].forEach((btn, idx) => {
      if (!btn) return;
      const speeds = [1, 2, 4];
      btn.addEventListener('click', () => {
        [simSpeed1, simSpeed2, simSpeed4].forEach(b => {
          b.className = 'px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:text-slate-900 dark:hover:text-white';
        });
        btn.className = 'px-2 py-1 rounded-lg bg-cyan-600 text-white font-bold';
        simulator.setSpeed(speeds[idx]);
      });
    });

    // 15. Mağaza Detay, Kampanya & Rota Modalı
    function openStoreModal(store) {
      if (!storeModal) return;

      const AMENITY_ICONS = {
        wc: '🚻',
        atm: '💳',
        pharmacy: '💊',
        infirmary: '🩺',
        baby: '🍼',
        prayer: '🕌',
        info: '🛡️',
        valet: '🚗',
        carpark: '🅿️',
        taxfree: '💎',
        entrance: '🚪',
        metro: '🚇'
      };

      let logoSVG = '';
      if (store.kind && AMENITY_ICONS[store.kind]) {
        logoSVG = `<span class="text-3xl">${AMENITY_ICONS[store.kind]}</span>`;
      } else {
        logoSVG = window.getBrandLogoSVG 
          ? window.getBrandLogoSVG(store.name, store.category) 
          : (window.createMonogramSVG ? window.createMonogramSVG(store.name, store.category) : '');
      }

      modalStoreLogo.innerHTML = logoSVG;
      modalStoreName.textContent = store.name;
      modalStoreCategory.textContent = store.category || 'Mağaza';
      modalStoreFloor.textContent = `${store.floor || currentFloor}. Kat • No: ${store.id || store.unit || ''}`;
      modalStoreLoc.textContent = `İstanbul Cevahir AVM • ${store.sub || 'Kat ' + (store.floor || currentFloor)}`;

      // Kampanya Bilgisi
      if (store.campaign && modalCampaignCard) {
        modalCampaignCard.classList.remove('hidden');
        if (modalCampaignBadge) modalCampaignBadge.textContent = store.campaign.badge || '🔥 Kampanya';
        if (modalCampaignExpires) modalCampaignExpires.textContent = store.campaign.expires || 'Bugün Geçerli';
        if (modalCampaignTitle) modalCampaignTitle.textContent = store.campaign.title || 'Özel İndirim';
        if (modalCampaignDiscount) modalCampaignDiscount.textContent = store.campaign.discount || '%20 İndirim';
        if (modalCampaignCode) modalCampaignCode.textContent = `KOD: ${store.campaign.code || 'CEVAHIR'}`;

        if (modalCampaignCodeBtn) {
          modalCampaignCodeBtn.onclick = (e) => {
            e.stopPropagation();
            if (navigator.clipboard) {
              navigator.clipboard.writeText(store.campaign.code || 'CEVAHIR');
            }
            const orig = modalCampaignCode.textContent;
            modalCampaignCode.textContent = 'KOPYALANDI! ✓';
            setTimeout(() => {
              modalCampaignCode.textContent = orig;
            }, 1400);
          };
        }
      } else if (modalCampaignCard) {
        modalCampaignCard.classList.add('hidden');
      }

      // Buton İşlevleri
      modalSetStartBtn.onclick = () => {
        selectedStartStore = store;
        storeModal.classList.add('hidden');
        if (routeStartLabel) routeStartLabel.textContent = `${store.name} (${store.floor}. Kat)`;
        if (selectedTargetStore && selectedTargetStore.id !== store.id) {
          startNavigationTo(selectedTargetStore, 'preview');
        } else {
          showToast(`${store.name} başlangıç noktası olarak seçildi. Şimdi gitmek istediğiniz hedef mağazayı seçebilirsiniz.`, 'success', 'Başlangıç Belirlendi');
        }
      };

      modalSetTargetBtn.onclick = () => {
        selectedTargetStore = store;
        storeModal.classList.add('hidden');
        if (routeTargetLabel) routeTargetLabel.textContent = `${store.name} (${store.floor}. Kat)`;
        startNavigationTo(store, 'preview');
      };

      modalPreviewBtn.onclick = () => {
        storeModal.classList.add('hidden');
        startNavigationTo(store, 'preview');
      };

      modalStartNavBtn.onclick = () => {
        storeModal.classList.add('hidden');
        startNavigationTo(store, 'gps');
      };

      storeModal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        storeModal.classList.add('hidden');
      });
    }

    // Başlangıç Gridini Oluştur
    renderSidebarStoreGrid();
    updateFloorUI(2);

  } catch (err) {
    console.error('Uygulama başlatma hatası:', err);
  }
});
