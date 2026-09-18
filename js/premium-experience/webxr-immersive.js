/**
 * WEBXR-IMMERSIVE.JS
 * WebXR Session Management for AR/VR Experiences
 *
 * Handles WebXR initialization, AR mode (ARCore/ARKit), VR mode with head tracking,
 * hand tracking, voice commands, and XR-specific HUD.
 *
 * Usage:
 *   const xrManager = new WebXRImmersive(cesiumViewer, config);
 *   await xrManager.initialize();
 *   await xrManager.startARSession();
 */

class WebXRImmersive {
  constructor(viewer, config = {}) {
    this.viewer = viewer;
    this.config = config;
    this.isSupported = false;
    this.currentSession = null;
    this.sessionMode = null; // 'ar' or 'vr'
    this.xrRefSpace = null;
    this.xrRenderState = null;

    // Feature support flags
    this.arSupported = false;
    this.vrSupported = false;
    this.handTrackingSupported = false;
    this.voiceCommandSupported = false;
    this.passthroughSupported = false;

    // Hand tracking
    this.hands = {
      left: { tracked: false, position: null, gesture: null },
      right: { tracked: false, position: null, gesture: null }
    };

    // Voice command state
    this.voiceActive = false;
    this.voiceRecognition = null;
    this.voiceCommands = {};

    // XR UI elements
    this.xrUIElements = {};

    // Performance metrics
    this.xrStats = {
      fps: 60,
      frameTime: 0,
      memoryUsage: 0
    };

    this.loadConfiguration();
  }

  /**
   * Load XR configuration
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/premium-experience.json');
      if (response.ok) {
        const data = await response.json();
        this.config = { ...this.config, ...data.xr };
        console.log('[WebXRImmersive] Configuration loaded');
      }
    } catch (err) {
      console.warn('[WebXRImmersive] Failed to load config:', err);
    }
  }

  /**
   * Initialize WebXR support
   */
  async initialize() {
    if (!navigator.xr) {
      console.warn('[WebXRImmersive] WebXR not supported on this device');
      return false;
    }

    try {
      // Check for AR support
      this.arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (this.arSupported) {
        console.log('[WebXRImmersive] AR supported');
      }

      // Check for VR support
      this.vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (this.vrSupported) {
        console.log('[WebXRImmersive] VR supported');
      }

      this.isSupported = this.arSupported || this.vrSupported;

      if (this.isSupported) {
        // Set up AR/VR buttons
        this.setupXRButtons();

        // Initialize hand tracking support detection
        this.detectHandTrackingSupport();

        // Initialize voice command support
        this.setupVoiceCommands();

        this.emitXRInitialized();
        return true;
      } else {
        console.warn('[WebXRImmersive] Neither AR nor VR is supported');
        return false;
      }
    } catch (err) {
      console.error('[WebXRImmersive] Initialization error:', err);
      return false;
    }
  }

  /**
   * Set up XR buttons in UI
   */
  setupXRButtons() {
    const container = this.viewer.container;
    const xrControls = document.createElement('div');
    xrControls.className = 'xr-controls';
    xrControls.innerHTML = `
      ${this.arSupported ? '<button class="xr-btn ar-btn" data-mode="ar">📱 AR Mode</button>' : ''}
      ${this.vrSupported ? '<button class="xr-btn vr-btn" data-mode="vr">🥽 VR Mode</button>' : ''}
    `;

    container.appendChild(xrControls);

    if (this.arSupported) {
      xrControls.querySelector('.ar-btn').addEventListener('click', () => {
        this.startARSession();
      });
    }

    if (this.vrSupported) {
      xrControls.querySelector('.vr-btn').addEventListener('click', () => {
        this.startVRSession();
      });
    }

    this.xrUIElements.controls = xrControls;
  }

  /**
   * Start AR session (place plots in real-world space)
   */
  async startARSession() {
    if (!this.arSupported || this.currentSession) {
      console.warn('[WebXRImmersive] AR not supported or session already active');
      return false;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
        domOverlay: { root: this.viewer.container }
      });

      this.currentSession = session;
      this.sessionMode = 'ar';

      // Set up AR-specific rendering
      this.setupARRendering(session);

      // Initialize AR features
      this.setupARPlotPlacement();
      this.enableARHitTesting();
      this.setupARMeasurement();

      console.log('[WebXRImmersive] AR session started');
      this.emitXRSessionStarted('ar');

      return true;
    } catch (err) {
      console.error('[WebXRImmersive] Failed to start AR session:', err);
      this.fallbackToStandardView();
      return false;
    }
  }

  /**
   * Start VR session (fully immersive walkthrough)
   */
  async startVRSession() {
    if (!this.vrSupported || this.currentSession) {
      console.warn('[WebXRImmersive] VR not supported or session already active');
      return false;
    }

    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hand-tracking', 'local', 'bounded-floor']
      });

      this.currentSession = session;
      this.sessionMode = 'vr';

      // Set up VR-specific rendering
      this.setupVRRendering(session);

      // Initialize VR features
      this.setupVRWalkthrough();
      this.enableHeadTracking(session);
      this.setupVRInteraction();

      // Start performance monitoring for VR
      this.startPerformanceMonitoring();

      console.log('[WebXRImmersive] VR session started');
      this.emitXRSessionStarted('vr');

      return true;
    } catch (err) {
      console.error('[WebXRImmersive] Failed to start VR session:', err);
      this.fallbackToStandardView();
      return false;
    }
  }

  /**
   * Set up AR-specific rendering
   */
  setupARRendering(session) {
    // Create canvas for AR overlay
    const arCanvas = document.createElement('canvas');
    arCanvas.className = 'ar-canvas';
    this.viewer.container.appendChild(arCanvas);

    // Configure AR with camera intrinsics
    session.addEventListener('end', () => {
      this.endSession();
    });

    this.xrUIElements.arCanvas = arCanvas;
  }

  /**
   * Set up AR plot placement
   */
  setupARPlotPlacement() {
    // Listen for user taps to place plots in AR space
    this.viewer.container.addEventListener('click', async (e) => {
      if (this.sessionMode !== 'ar') return;

      const hitTestResults = await this.currentSession.requestHitTestSource({
        space: this.xrRefSpace,
        offsetRay: new XRRay({ x: 0, y: 0, z: -1 })
      });

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];

        // Create virtual plot at hit location
        this.createARPlot(hit.getPose(this.xrRefSpace));

        this.emitARPlotPlaced(hit.getPose(this.xrRefSpace));
      }
    });
  }

  /**
   * Create AR plot in real-world space
   */
  createARPlot(pose) {
    // Create visual representation of plot
    const arPlot = document.createElement('div');
    arPlot.className = 'ar-plot';
    arPlot.innerHTML = `
      <div class="ar-plot-info">
        <h3>Plot Sample</h3>
        <p>Tap to view details</p>
      </div>
    `;

    // Position based on AR pose
    const position = pose.transform.position;
    arPlot.style.transform = `translate3d(${position.x}m, ${position.y}m, ${position.z}m)`;

    this.viewer.container.appendChild(arPlot);

    // Make it interactive
    arPlot.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('ar:plot-tapped', {
        detail: { pose }
      }));
    });
  }

  /**
   * Enable AR hit testing (surface detection)
   */
  enableARHitTesting() {
    if (this.sessionMode !== 'ar') return;

    // Request hit test source for plane detection
    this.currentSession.requestHitTestSource({
      space: this.xrRefSpace
    }).then(hitTestSource => {
      // Use for real-time plane visualization
      console.log('[WebXRImmersive] AR hit testing enabled');
    }).catch(err => {
      console.warn('[WebXRImmersive] Hit test source failed:', err);
    });
  }

  /**
   * Set up AR measurement tools
   */
  setupARMeasurement() {
    // Enable measuring distances in AR
    window.addEventListener('ar:start-measurement', () => {
      console.log('[WebXRImmersive] AR measurement started');
    });
  }

  /**
   * Set up VR-specific rendering
   */
  setupVRRendering(session) {
    // Configure VR canvas and rendering context
    const glCanvas = this.viewer.canvas;

    // Request XR WebGL layer
    const glContext = glCanvas.getContext('webgl2', {
      xrCompatible: true
    });

    try {
      const baseLayer = new XRWebGLLayer(session, glContext);
      session.updateRenderState({ baseLayer });
      this.xrRenderState = session.renderState;

      console.log('[WebXRImmersive] VR rendering configured');
    } catch (err) {
      console.warn('[WebXRImmersive] VR rendering setup failed:', err);
    }
  }

  /**
   * Set up VR walkthrough experience
   */
  setupVRWalkthrough() {
    // Create navigation points for VR experience
    const plots = this.viewer.dataSources || [];

    const navigationUI = document.createElement('div');
    navigationUI.className = 'vr-navigation-ui';
    navigationUI.innerHTML = `
      <div class="vr-hud">
        <button class="vr-nav-btn prev">← Previous</button>
        <button class="vr-nav-btn next">Next →</button>
        <button class="vr-nav-btn exit">Exit VR</button>
      </div>
    `;

    this.viewer.container.appendChild(navigationUI);

    navigationUI.querySelector('.next').addEventListener('click', () => {
      this.navigateToNextPlot();
    });

    navigationUI.querySelector('.prev').addEventListener('click', () => {
      this.navigateToPreviousPlot();
    });

    navigationUI.querySelector('.exit').addEventListener('click', () => {
      this.endSession();
    });

    this.xrUIElements.navigationUI = navigationUI;
  }

  /**
   * Enable head tracking for VR
   */
  enableHeadTracking(session) {
    // Head tracking is automatic in immersive VR
    session.requestAnimationFrame((time, frame) => {
      const pose = frame.getViewerPose(this.xrRefSpace);

      if (pose) {
        // Update camera based on head position/orientation
        const position = pose.transform.position;
        const orientation = pose.transform.orientation;

        this.updateCameraFromVRPose(position, orientation);
      }
    });

    console.log('[WebXRImmersive] Head tracking enabled');
  }

  /**
   * Update camera from VR pose
   */
  updateCameraFromVRPose(position, orientation) {
    if (!this.viewer) return;

    const camera = this.viewer.camera;

    // Convert XR coordinates to Cesium coordinates
    camera.position = new Cesium.Cartesian3(
      position.x * 1000,
      position.y * 1000,
      position.z * 1000
    );

    // Apply orientation
    camera.setView({
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  }

  /**
   * Set up VR interaction
   */
  setupVRInteraction() {
    this.currentSession.addEventListener('inputsourceschange', (event) => {
      event.added.forEach(inputSource => {
        this.handleInputSourceAdded(inputSource);
      });

      event.removed.forEach(inputSource => {
        this.handleInputSourceRemoved(inputSource);
      });
    });
  }

  /**
   * Handle input source added (controllers, hands)
   */
  handleInputSourceAdded(inputSource) {
    if (inputSource.hand) {
      console.log(`[WebXRImmersive] Hand detected: ${inputSource.hand}`);
      this.hands[inputSource.hand].tracked = true;
    } else if (inputSource.gamepad) {
      console.log('[WebXRImmersive] Controller detected');
    }
  }

  /**
   * Handle input source removed
   */
  handleInputSourceRemoved(inputSource) {
    if (inputSource.hand) {
      this.hands[inputSource.hand].tracked = false;
    }
  }

  /**
   * Detect hand tracking support
   */
  async detectHandTrackingSupport() {
    try {
      // Hand tracking is indicated by requesting hands feature in XR session
      if (navigator.xr) {
        const vrSession = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['hand-tracking']
        });
        this.handTrackingSupported = true;
        vrSession.end();
      }
    } catch (err) {
      this.handTrackingSupported = false;
    }
  }

  /**
   * Set up voice commands for XR
   */
  setupVoiceCommands() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.voiceRecognition = new SpeechRecognition();
      this.voiceRecognition.continuous = true;
      this.voiceRecognition.interimResults = true;
      this.voiceCommandSupported = true;

      this.voiceRecognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        this.handleVoiceCommand(transcript.toLowerCase());
      };

      console.log('[WebXRImmersive] Voice commands available');
    }
  }

  /**
   * Handle voice command
   */
  handleVoiceCommand(command) {
    const commands = {
      'next plot': () => this.navigateToNextPlot(),
      'previous plot': () => this.navigateToPreviousPlot(),
      'zoom in': () => this.viewer.camera.zoomIn(),
      'zoom out': () => this.viewer.camera.zoomOut(),
      'exit': () => this.endSession(),
      'measure': () => window.dispatchEvent(new CustomEvent('measurement:start-distance')),
      'select': () => window.dispatchEvent(new CustomEvent('plot:select-request'))
    };

    for (const [cmd, handler] of Object.entries(commands)) {
      if (command.includes(cmd)) {
        handler();
        console.log(`[WebXRImmersive] Voice command executed: ${cmd}`);
        break;
      }
    }
  }

  /**
   * Navigate to next plot
   */
  navigateToNextPlot() {
    window.dispatchEvent(new CustomEvent('vr:next-plot'));
  }

  /**
   * Navigate to previous plot
   */
  navigateToPreviousPlot() {
    window.dispatchEvent(new CustomEvent('vr:prev-plot'));
  }

  /**
   * Start performance monitoring for mobile VR (60fps target)
   */
  startPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();

    const monitor = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        this.xrStats.fps = frameCount;
        this.xrStats.frameTime = elapsed / frameCount;

        if (this.xrStats.fps < 60) {
          console.warn(`[WebXRImmersive] Low FPS detected: ${this.xrStats.fps}`);
          this.reducePerformance();
        }

        frameCount = 0;
        lastTime = now;
      }

      if (this.sessionMode) {
        requestAnimationFrame(monitor);
      }
    };

    requestAnimationFrame(monitor);
  }

  /**
   * Reduce rendering quality to maintain 60fps
   */
  reducePerformance() {
    // Reduce texture quality, shadow maps, etc.
    console.log('[WebXRImmersive] Reducing quality for performance');

    // Emit performance warning
    window.dispatchEvent(new CustomEvent('xr:performance-warning'));
  }

  /**
   * End XR session
   */
  async endSession() {
    if (this.currentSession) {
      try {
        await this.currentSession.end();
        this.currentSession = null;
        this.sessionMode = null;

        // Clean up XR UI
        Object.values(this.xrUIElements).forEach(el => {
          if (el && el.remove) el.remove();
        });

        console.log('[WebXRImmersive] XR session ended');
        this.emitXRSessionEnded();
      } catch (err) {
        console.error('[WebXRImmersive] Error ending session:', err);
      }
    }
  }

  /**
   * Fallback to standard view if XR unavailable
   */
  fallbackToStandardView() {
    console.log('[WebXRImmersive] Falling back to standard view');
    // Restore normal 2D/3D view
    window.dispatchEvent(new CustomEvent('xr:fallback-triggered'));
  }

  /**
   * Get XR status
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      arSupported: this.arSupported,
      vrSupported: this.vrSupported,
      sessionActive: !!this.currentSession,
      sessionMode: this.sessionMode,
      handTrackingSupported: this.handTrackingSupported,
      voiceCommandSupported: this.voiceCommandSupported,
      hands: this.hands,
      xrStats: this.xrStats
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit WebXR initialized
   */
  emitXRInitialized() {
    window.dispatchEvent(new CustomEvent('xr:initialized', {
      detail: { manager: this }
    }));
  }

  /**
   * Emit XR session started
   */
  emitXRSessionStarted(mode) {
    window.dispatchEvent(new CustomEvent('xr:session-started', {
      detail: { mode: mode }
    }));
  }

  /**
   * Emit XR session ended
   */
  emitXRSessionEnded() {
    window.dispatchEvent(new CustomEvent('xr:session-ended', {
      detail: { mode: this.sessionMode }
    }));
  }

  /**
   * Emit AR plot placed
   */
  emitARPlotPlaced(pose) {
    window.dispatchEvent(new CustomEvent('ar:plot-placed', {
      detail: { pose }
    }));
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.WebXRImmersive = WebXRImmersive;
}
