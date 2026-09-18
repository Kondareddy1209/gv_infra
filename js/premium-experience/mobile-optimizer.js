/**
 * MOBILE-OPTIMIZER.JS
 * Mobile-First Experience Optimization
 *
 * Handles responsive camera defaults, touch gesture support, device orientation,
 * gyroscope-based camera control, and mobile HUD adaptation.
 *
 * Usage:
 *   const mobileOptimizer = new MobileOptimizer(cesiumViewer, config);
 *   mobileOptimizer.initialize();
 */

class MobileOptimizer {
  constructor(viewer, config = {}) {
    this.viewer = viewer;
    this.config = config;
    this.isEnabled = window.innerWidth < 768;
    this.touchGesturesEnabled = true;
    this.gyroscopeEnabled = false;
    this.accelerometerEnabled = false;
    this.fullscreenMode = false;

    // Touch tracking
    this.touches = [];
    this.lastTouchDistance = 0;
    this.lastTouchAngle = 0;

    // Device orientation
    this.alpha = 0; // Z axis rotation
    this.beta = 0;  // X axis rotation (pitch)
    this.gamma = 0; // Y axis rotation (roll)

    // Accelerometer tracking
    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;

    // Mobile HUD elements
    this.hudElements = {
      zoomControl: null,
      panControl: null,
      rotateControl: null,
      fullscreenBtn: null,
      detailsDrawer: null
    };

    // Bottom sheet state
    this.drawerOpen = false;
    this.drawerHeight = 0;
    this.drawerStartY = 0;

    this.loadConfiguration();
  }

  /**
   * Load mobile configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.mobile };
        console.log('[MobileOptimizer] Configuration loaded');
      }
    } catch (err) {
      console.warn('[MobileOptimizer] Failed to load config:', err);
    }
  }

  /**
   * Initialize mobile optimization
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('[MobileOptimizer] Not a mobile device (window width >= 768px)');
      return false;
    }

    console.log('[MobileOptimizer] Initializing for mobile');

    // Set responsive camera defaults
    this.configureResponsiveCamera();

    // Enable touch gestures
    this.setupTouchGestures();

    // Set up device orientation
    this.requestPermissionAndSetupOrientation();

    // Set up accelerometer
    this.requestPermissionAndSetupAccelerometer();

    // Adapt HUD for mobile
    this.adaptHUDForMobile();

    // Set up bottom sheet for plot details
    this.initializeBottomSheet();

    // Listen for window resize to detect orientation change
    window.addEventListener('resize', () => this.handleOrientationChange());

    // Listen for view changes
    window.addEventListener('plot:selected', (e) => {
      this.showDetailsDrawer(e.detail);
    });

    this.emitInitialized();
    return true;
  }

  /**
   * Configure responsive camera for mobile
   * Wider field of view, auto-zoom for visibility
   */
  configureResponsiveCamera() {
    if (!this.viewer) return;

    const camera = this.viewer.camera;

    // Wider field of view for mobile (more area visible)
    const fov = this.config.camera?.fieldOfView || 60;
    camera.setView({
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0
      }
    });

    // Auto-zoom on plot selection
    this.viewer.screenSpaceEventHandler.setInputAction((movement) => {
      const pickedObject = this.viewer.scene.pick(movement.position);
      if (pickedObject && pickedObject.id) {
        this.zoomToEntity(pickedObject.id);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    console.log('[MobileOptimizer] Responsive camera configured');
  }

  /**
   * Set up touch gesture support
   */
  setupTouchGestures() {
    const canvas = this.viewer.canvas;

    // Pinch-zoom gesture
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const distance = this.getTouchDistance(e.touches[0], e.touches[1]);

        if (this.lastTouchDistance > 0) {
          const scale = distance / this.lastTouchDistance;
          this.handlePinchZoom(scale);
        }
        this.lastTouchDistance = distance;
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      this.touches = Array.from(e.touches);
      this.lastTouchDistance = 0;
    });

    canvas.addEventListener('touchend', (e) => {
      this.touches = Array.from(e.touches);
      this.lastTouchDistance = 0;
    });

    // Two-finger rotate gesture
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const angle = this.getTouchAngle(e.touches[0], e.touches[1]);

        if (this.lastTouchAngle > 0) {
          const rotation = angle - this.lastTouchAngle;
          this.handleTwoFingerRotate(rotation);
        }
        this.lastTouchAngle = angle;
      }
    });

    // Swipe-pan gesture
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (this.touches.length > 0) {
          const prevTouch = this.touches[0];
          const deltaX = touch.clientX - prevTouch.clientX;
          const deltaY = touch.clientY - prevTouch.clientY;
          this.handleSwipePan(deltaX, deltaY);
        }
      }
    });

    console.log('[MobileOptimizer] Touch gestures enabled');
  }

  /**
   * Calculate distance between two touch points
   */
  getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate angle between two touch points
   */
  getTouchAngle(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx);
  }

  /**
   * Handle pinch-zoom gesture
   */
  handlePinchZoom(scale) {
    if (!this.viewer) return;

    const camera = this.viewer.camera;
    const distance = Cesium.Cartesian3.distance(
      camera.position,
      camera.target || Cesium.Cartesian3.ZERO
    );

    const newDistance = distance / scale;
    const direction = Cesium.Cartesian3.subtract(
      camera.position,
      camera.target || Cesium.Cartesian3.ZERO,
      new Cesium.Cartesian3()
    );
    Cesium.Cartesian3.normalize(direction, direction);

    const newPosition = Cesium.Cartesian3.add(
      camera.target || Cesium.Cartesian3.ZERO,
      Cesium.Cartesian3.multiplyByScalar(direction, newDistance, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    camera.position = newPosition;
  }

  /**
   * Handle two-finger rotate gesture
   */
  handleTwoFingerRotate(rotation) {
    if (!this.viewer) return;

    const camera = this.viewer.camera;
    const heading = camera.heading + rotation;
    camera.setView({
      orientation: {
        heading: heading,
        pitch: camera.pitch,
        roll: camera.roll
      }
    });
  }

  /**
   * Handle swipe-pan gesture
   */
  handleSwipePan(deltaX, deltaY) {
    if (!this.viewer) return;

    const camera = this.viewer.camera;
    const moveRate = 0.1;

    camera.moveRight(deltaX * moveRate);
    camera.moveUp(deltaY * moveRate);
  }

  /**
   * Request device orientation permission (iOS 13+)
   */
  async requestPermissionAndSetupOrientation() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', (e) => {
              this.alpha = e.alpha || 0;
              this.beta = e.beta || 0;
              this.gamma = e.gamma || 0;
              this.emitOrientationChanged();
            });
            this.gyroscopeEnabled = true;
            console.log('[MobileOptimizer] Device orientation enabled');
          }
        } catch (err) {
          console.warn('[MobileOptimizer] Device orientation permission denied:', err);
        }
      } else {
        // Non-iOS devices
        window.addEventListener('deviceorientation', (e) => {
          this.alpha = e.alpha || 0;
          this.beta = e.beta || 0;
          this.gamma = e.gamma || 0;
          this.emitOrientationChanged();
        });
        this.gyroscopeEnabled = true;
      }
    }
  }

  /**
   * Request accelerometer permission (iOS 13+)
   */
  async requestPermissionAndSetupAccelerometer() {
    if (typeof DeviceMotionEvent !== 'undefined') {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('devicemotion', (e) => {
              this.accelX = e.acceleration.x || 0;
              this.accelY = e.acceleration.y || 0;
              this.accelZ = e.acceleration.z || 0;
              this.handleAccelerometerMovement();
            });
            this.accelerometerEnabled = true;
            console.log('[MobileOptimizer] Accelerometer enabled');
          }
        } catch (err) {
          console.warn('[MobileOptimizer] Accelerometer permission denied:', err);
        }
      } else {
        // Non-iOS devices
        window.addEventListener('devicemotion', (e) => {
          this.accelX = e.acceleration.x || 0;
          this.accelY = e.acceleration.y || 0;
          this.accelZ = e.acceleration.z || 0;
          this.handleAccelerometerMovement();
        });
        this.accelerometerEnabled = true;
      }
    }
  }

  /**
   * Handle accelerometer-based movement (tilt to move forward/backward)
   */
  handleAccelerometerMovement() {
    if (!this.viewer || !this.accelerometerEnabled) return;

    const camera = this.viewer.camera;
    const moveRate = 0.05;

    // Use accelY for forward/backward movement (device tilt)
    if (Math.abs(this.accelY) > 2) {
      const direction = this.accelY > 0 ? 1 : -1;
      camera.moveForward(direction * moveRate);
    }

    // Use accelX for left/right movement (device twist)
    if (Math.abs(this.accelX) > 2) {
      const direction = this.accelX > 0 ? 1 : -1;
      camera.moveRight(direction * moveRate);
    }
  }

  /**
   * Handle orientation changes (portrait/landscape)
   */
  handleOrientationChange() {
    const isNowMobile = window.innerWidth < 768;

    if (isNowMobile !== this.isEnabled) {
      this.isEnabled = isNowMobile;

      if (isNowMobile) {
        this.adaptHUDForMobile();
      } else {
        this.adaptHUDForDesktop();
      }

      this.emitOrientationChanged({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isNowMobile
      });
    }
  }

  /**
   * Adapt HUD for mobile (larger buttons, reduced clutter)
   */
  adaptHUDForMobile() {
    const container = this.viewer.container;

    // Hide default Cesium navigation controls
    this.viewer.navigationHelpButton.container.style.display = 'none';

    // Create mobile-specific HUD
    const hudContainer = document.createElement('div');
    hudContainer.className = 'mobile-hud';
    hudContainer.innerHTML = `
      <div class="mobile-controls">
        <button class="hud-btn zoom-in" aria-label="Zoom in">+</button>
        <button class="hud-btn zoom-out" aria-label="Zoom out">−</button>
        <button class="hud-btn rotate-left" aria-label="Rotate left">↶</button>
        <button class="hud-btn rotate-right" aria-label="Rotate right">↷</button>
        <button class="hud-btn fullscreen-toggle" aria-label="Toggle fullscreen">⛶</button>
      </div>
    `;

    container.appendChild(hudContainer);

    // Bind button handlers
    hudContainer.querySelector('.zoom-in').addEventListener('click', () => {
      this.viewer.camera.zoomIn();
    });

    hudContainer.querySelector('.zoom-out').addEventListener('click', () => {
      this.viewer.camera.zoomOut();
    });

    hudContainer.querySelector('.rotate-left').addEventListener('click', () => {
      this.viewer.camera.rotateLeft(Cesium.Math.toRadians(15));
    });

    hudContainer.querySelector('.rotate-right').addEventListener('click', () => {
      this.viewer.camera.rotateRight(Cesium.Math.toRadians(15));
    });

    hudContainer.querySelector('.fullscreen-toggle').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    this.hudElements.mobileHUD = hudContainer;
    console.log('[MobileOptimizer] Mobile HUD adapted');
  }

  /**
   * Adapt HUD for desktop
   */
  adaptHUDForDesktop() {
    this.viewer.navigationHelpButton.container.style.display = 'block';

    if (this.hudElements.mobileHUD) {
      this.hudElements.mobileHUD.remove();
      this.hudElements.mobileHUD = null;
    }

    console.log('[MobileOptimizer] Desktop HUD restored');
  }

  /**
   * Initialize bottom sheet for plot details (swipe-up drawer)
   */
  initializeBottomSheet() {
    const container = this.viewer.container;

    const sheet = document.createElement('div');
    sheet.className = 'bottom-sheet';
    sheet.id = 'plot-details-sheet';
    sheet.innerHTML = `
      <div class="sheet-header">
        <div class="handle"></div>
        <h2 id="sheet-title">Plot Details</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="sheet-content" id="sheet-content">
        <!-- Details will be populated here -->
      </div>
    `;

    container.appendChild(sheet);

    // Set up bottom sheet drag-to-close functionality
    const header = sheet.querySelector('.sheet-header');
    const handle = sheet.querySelector('.handle');
    const closeBtn = sheet.querySelector('.close-btn');

    let isDragging = false;
    let startY = 0;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      sheet.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaY = e.clientY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;

      const deltaY = e.clientY - startY;
      sheet.style.transition = 'transform 0.3s ease';

      if (deltaY > 100) {
        this.closeDetailsDrawer();
      } else {
        sheet.style.transform = 'translateY(0)';
      }
    });

    closeBtn.addEventListener('click', () => {
      this.closeDetailsDrawer();
    });

    this.hudElements.detailsDrawer = sheet;
    this.closeDetailsDrawer(); // Start hidden
  }

  /**
   * Show plot details in bottom sheet
   */
  showDetailsDrawer(plotData) {
    const sheet = this.hudElements.detailsDrawer;
    if (!sheet) return;

    const title = sheet.querySelector('#sheet-title');
    const content = sheet.querySelector('#sheet-content');

    title.textContent = plotData.name || 'Plot Details';
    content.innerHTML = `
      <div class="plot-info">
        <p><strong>Size:</strong> ${plotData.size || 'N/A'}</p>
        <p><strong>Price:</strong> ${plotData.price || 'N/A'}</p>
        <p><strong>Location:</strong> ${plotData.location || 'N/A'}</p>
        <button class="action-btn schedule-tour">Schedule Tour</button>
        <button class="action-btn whatsapp-enquiry">WhatsApp Enquiry</button>
      </div>
    `;

    // Bind action buttons
    content.querySelector('.schedule-tour').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('plot:schedule-tour', { detail: { plotId: plotData.id } }));
    });

    content.querySelector('.whatsapp-enquiry').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('plot:whatsapp-enquiry', { detail: { plotId: plotData.id } }));
    });

    sheet.style.transform = 'translateY(0)';
    this.drawerOpen = true;
  }

  /**
   * Close bottom sheet
   */
  closeDetailsDrawer() {
    const sheet = this.hudElements.detailsDrawer;
    if (!sheet) return;

    sheet.style.transform = 'translateY(100%)';
    this.drawerOpen = false;
  }

  /**
   * Toggle fullscreen immersive mode
   */
  toggleFullscreen() {
    const container = this.viewer.container;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.warn('[MobileOptimizer] Fullscreen request failed:', err);
      });
      this.fullscreenMode = true;
    } else {
      document.exitFullscreen();
      this.fullscreenMode = false;
    }

    this.emitFullscreenToggled();
  }

  /**
   * Zoom to entity smoothly
   */
  zoomToEntity(entity) {
    if (!this.viewer) return;

    this.viewer.zoomTo(entity, new Cesium.HeadingPitchRange(
      0,
      -30,
      500
    )).catch(err => {
      console.warn('[MobileOptimizer] Zoom failed:', err);
    });
  }

  /**
   * Get mobile status
   */
  getStatus() {
    return {
      isMobile: this.isEnabled,
      gyroscopeEnabled: this.gyroscopeEnabled,
      accelerometerEnabled: this.accelerometerEnabled,
      fullscreenMode: this.fullscreenMode,
      drawerOpen: this.drawerOpen,
      orientation: {
        alpha: this.alpha,
        beta: this.beta,
        gamma: this.gamma
      },
      acceleration: {
        x: this.accelX,
        y: this.accelY,
        z: this.accelZ
      }
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit mobile optimizer initialized
   */
  emitInitialized() {
    window.dispatchEvent(new CustomEvent('mobile:initialized', {
      detail: { optimizer: this }
    }));
  }

  /**
   * Emit orientation changed
   */
  emitOrientationChanged(data = {}) {
    window.dispatchEvent(new CustomEvent('mobile:orientation-changed', {
      detail: {
        angle: this.alpha,
        device: {
          alpha: this.alpha,
          beta: this.beta,
          gamma: this.gamma,
          ...data
        }
      }
    }));
  }

  /**
   * Emit fullscreen toggled
   */
  emitFullscreenToggled() {
    window.dispatchEvent(new CustomEvent('mobile:fullscreen-toggled', {
      detail: { fullscreenMode: this.fullscreenMode }
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.MobileOptimizer = MobileOptimizer;
}
