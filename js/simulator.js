/**
 * İstanbul Cevahir AVM - Alışveriş Sepeti (Shopping Cart) Navigasyon Simülatörü
 * santral-map mantığında köpek yerine yönlenen ve kat değiştiren Alışveriş Sepeti
 */

class CartSimulator {
  constructor(mallMap, onProgress, onFloorChange, onComplete) {
    this.map = mallMap;
    this.onProgress = onProgress;
    this.onFloorChange = onFloorChange;
    this.onComplete = onComplete;

    this.activeRoute = null;
    this.pathNodes = [];
    this.currentIndex = 0;
    this.subProgress = 0; // 0..1 between node i and i+1

    this.isPlaying = false;
    this.speed = 1.0; // 1x, 2x, 4x
    this.followCamera = true;
    this.animFrameId = null;
    this.lastTime = 0;
    this.facingX = 1; // 1: right, -1: left (flips horizontally based on dx)

    // Cart avatar DOM element
    this.cartEl = null;
    this.createCartAvatar();
  }

  createCartAvatar() {
    this.cartEl = document.createElement('div');
    this.cartEl.className = 'cart-avatar hidden';
    this.cartEl.innerHTML = `
      <div class="cart-beacon"></div>
      <div class="cart-marker" id="cart-mascot">
        <div id="cart-rotator" class="cart-rotator-wrapper">
          <svg viewBox="-20 -35 45 42" width="48" height="48" class="cart-svg-el">
            <!-- Ground Shadow -->
            <ellipse class="cart__shadow" cx="0" cy="1.5" rx="14" ry="3.2" />
            
            <!-- Cart Body (breathes when idle, rattles when rolling) -->
            <g class="cart__body">
              <!-- Handle -->
              <path d="M-15.5 -25.5 h4.2 l2.3 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
              
              <!-- Basket Wireframe Body -->
              <path d="M-10 -20 h24.5 a1.5 1.5 0 0 1 1.45 1.9 l-2.7 9.7 a2.6 2.6 0 0 1-2.5 1.9 H-4.6 a2.6 2.6 0 0 1-2.5 -1.9 Z" fill="var(--cart-basket-bg)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
              
              <!-- Basket Grid Wires -->
              <path d="M-3.5 -19.5 l1.5 12 M3.5 -19.5 v12 M10 -19.5 l-1.3 12 M-8.5 -14 h23" stroke="currentColor" stroke-width="1.2" opacity="0.6" fill="none" />
              
              <!-- Packages inside basket (Coral & Mint from cevahir-rehber) -->
              <rect x="-4" y="-27" width="6.5" height="8" rx="1.2" fill="#ff7a59" stroke="#e05330" stroke-width="0.8" />
              <rect x="3.5" y="-25" width="7" height="6" rx="1.2" fill="#2fbf8a" stroke="#1d9b6c" stroke-width="0.8" />
              <path d="M-1 -27 v-2.5 a1 1 0 0 1 2 0 v2.5" stroke="#ffffff" stroke-width="0.9" fill="none" />
              
              <!-- Chassis -->
              <path d="M-7 -6.5 l-1.5 3.5 h20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </g>

            <!-- Wheels (spin when moving!) -->
            <g class="cart__wheel" transform="translate(-6, -2.6)">
              <g class="cart__wheel-hub">
                <circle r="3.2" fill="currentColor" />
                <circle r="1.8" fill="#ffffff" />
                <path d="M-2 0 h4 M0 -2 v4" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
              </g>
            </g>
            <g class="cart__wheel" transform="translate(9.5, -2.6)">
              <g class="cart__wheel-hub">
                <circle r="3.2" fill="currentColor" />
                <circle r="1.8" fill="#ffffff" />
                <path d="M-2 0 h4 M0 -2 v4" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    `;

    this.map.avatarLayer.appendChild(this.cartEl);
    this.cartMascotEl = this.cartEl.querySelector('#cart-mascot');
    this.rotatorEl = this.cartEl.querySelector('#cart-rotator');
  }

  setRoute(routeData) {
    this.stop();
    this.activeRoute = routeData;
    this.pathNodes = routeData?.pathNodes || [];
    this.currentIndex = 0;
    this.subProgress = 0;

    if (this.pathNodes.length > 0) {
      const startNode = this.pathNodes[0];
      const sx = startNode.gx ?? startNode.x;
      const sy = startNode.gy ?? startNode.y;
      
      // İlk kata geç
      if (this.map.currentFloor !== startNode.floor) {
        this.map.loadFloor(startNode.floor);
      }

      this.updateCartPosition(sx, sy, 0, 0);
      this.checkVisibility();
    } else {
      if (this.cartEl) {
        this.cartEl.classList.add('hidden');
        this.cartEl.style.display = 'none';
      }
    }
  }

  checkVisibility() {
    if (!this.activeRoute || !this.pathNodes || this.pathNodes.length === 0) {
      if (this.cartEl) {
        this.cartEl.classList.add('hidden');
        this.cartEl.style.display = 'none';
      }
      return;
    }
    const currNode = this.pathNodes[this.currentIndex] || this.pathNodes[0];
    if (this.cartEl) {
      if (this.map.currentFloor === currNode.floor) {
        this.cartEl.classList.remove('hidden');
        this.cartEl.style.display = 'block';
      } else {
        this.cartEl.style.display = 'none';
      }
    }
  }

  start() {
    this.play();
  }

  resume() {
    this.play();
  }

  play() {
    if (!this.activeRoute || this.pathNodes.length < 2) return;
    this.isPlaying = true;
    this.checkVisibility();
    if (this.cartMascotEl) this.cartMascotEl.classList.add('cart--rolling');
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  pause() {
    this.isPlaying = false;
    if (this.cartMascotEl) this.cartMascotEl.classList.remove('cart--rolling');
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    this.subProgress = 0;
    if (this.cartMascotEl) this.cartMascotEl.classList.remove('cart--rolling');
    if (this.pathNodes.length > 0) {
      const startNode = this.pathNodes[0];
      this.updateCartPosition(startNode.gx ?? startNode.x, startNode.gy ?? startNode.y, 0, 0);
      this.checkVisibility();
    }
  }

  setSpeed(speedVal) {
    this.speed = speedVal;
  }

  setFollowCamera(val) {
    this.followCamera = val;
  }

  loop(currentTime) {
    if (!this.isPlaying) return;

    const delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Bir adımdan diğerine ilerleme hızı (birim/sn)
    const baseSpeed = 70 * this.speed;

    if (this.currentIndex < this.pathNodes.length - 1) {
      const n1 = this.pathNodes[this.currentIndex];
      const n2 = this.pathNodes[this.currentIndex + 1];

      // Kat Değişimi Kontrolü (Asansör veya Yürüyen Merdiven)
      if (n1.floor !== n2.floor) {
        this.handleFloorTransition(n1, n2);
        return;
      }

      // Aynı kat içinde yürüyüş
      const n1x = n1.gx ?? n1.x;
      const n1y = n1.gy ?? n1.y;
      const n2x = n2.gx ?? n2.x;
      const n2y = n2.gy ?? n2.y;

      const dx = n2x - n1x;
      const dy = n2y - n1y;
      const segDist = Math.hypot(dx, dy);

      if (segDist > 0.001) {
        this.subProgress += (baseSpeed * delta) / segDist;
      } else {
        this.subProgress = 1.0;
      }

      let curX, curY;

      if (this.subProgress >= 1.0) {
        this.currentIndex++;
        this.subProgress = 0;
        curX = n2x;
        curY = n2y;
      } else {
        curX = n1x + dx * this.subProgress;
        curY = n1y + dy * this.subProgress;
      }

      // Eğer şu anki kat kullanıcının baktığı kattan farklıysa, haritayı güncelle
      if (this.map.currentFloor !== n1.floor) {
        this.map.loadFloor(n1.floor);
      }

      this.checkVisibility();
      this.updateCartPosition(curX, curY, dx, dy);

      // İlerleme yüzdesi
      const totalProgress = (this.currentIndex + this.subProgress) / (this.pathNodes.length - 1);
      if (this.onProgress) {
        this.onProgress(totalProgress, this.currentIndex, n1);
      }

      // Kamerayı takip ettir
      if (this.followCamera) {
        this.map.focusOnPoint(curX, curY, this.map.scale);
      }

      this.animFrameId = requestAnimationFrame((t) => this.loop(t));
    } else {
      // Simülasyon bitti!
      this.isPlaying = false;
      if (this.cartMascotEl) this.cartMascotEl.classList.remove('cart--rolling');
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * Kat Değiştirme Animasyonu (Asansör / Yürüyen Merdiven)
   */
  handleFloorTransition(fromNode, toNode) {
    this.pause();

    const isStairs = toNode.edgeType === 'stairs';
    const message = isStairs
      ? `⚡ Yürüyen Merdiven ile ${toNode.floor}. Kata Çıkılıyor...`
      : `🛗 Asansör ile ${toNode.floor}. Kata Çıkılıyor...`;

    // Ekranda kat değişim bildirimini göster
    this.showFloorTransitionModal(message, fromNode.floor, toNode.floor, () => {
      // Yeni kata geç
      this.currentIndex++;
      this.subProgress = 0;

      this.map.loadFloor(toNode.floor).then(() => {
        const nx = toNode.gx ?? toNode.x;
        const ny = toNode.gy ?? toNode.y;
        this.updateCartPosition(nx, ny, 0, 0);
        this.checkVisibility();

        if (this.onFloorChange) {
          this.onFloorChange(toNode.floor);
        }

        if (this.followCamera) {
          this.map.focusOnPoint(nx, ny, this.map.scale);
        }

        // Kısa beklemeden sonra devam et
        setTimeout(() => {
          this.isPlaying = true;
          if (this.cartMascotEl) this.cartMascotEl.classList.add('cart--rolling');
          this.lastTime = performance.now();
          this.loop(this.lastTime);
        }, 600);
      });
    });
  }

  showFloorTransitionModal(message, fromFloor, toFloor, callback) {
    let banner = document.getElementById('floor-transition-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'floor-transition-banner';
      banner.className = 'floor-transition-banner';
      document.body.appendChild(banner);
    }

    const isUp = toFloor > fromFloor;
    const arrow = isUp ? '↑' : '↓';

    banner.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-3xl animate-bounce">
        ${arrow}
      </div>
      <div class="text-xl font-bold font-heading text-white text-center">${message}</div>
      <div class="text-sm text-cyan-300 font-medium">Kat ${fromFloor} ➔ Kat ${toFloor}</div>
    `;

    banner.classList.add('visible');

    setTimeout(() => {
      banner.classList.remove('visible');
      if (callback) callback();
    }, 1500);
  }

  updateCartPosition(x, y, dx, dy) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) return;
    this.cartEl.style.left = `${x}px`;
    this.cartEl.style.top = `${y}px`;

    if (typeof dx === 'number') {
      if (dx < -0.05) {
        this.facingX = -1;
      } else if (dx > 0.05) {
        this.facingX = 1;
      }
    }

    let angleDeg = 0;
    if (typeof dx === 'number' && typeof dy === 'number' && (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)) {
      const rawAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (this.facingX === 1) {
        angleDeg = Math.max(-25, Math.min(25, rawAngle));
      } else {
        const normAngle = rawAngle > 0 ? (180 - rawAngle) : (-180 - rawAngle);
        angleDeg = Math.max(-25, Math.min(25, -normAngle));
      }
    }

    if (this.rotatorEl) {
      this.rotatorEl.style.transform = `scale(${this.facingX}, 1) rotate(${angleDeg}deg)`;
    }
  }
}

window.CartSimulator = CartSimulator;
