/**
 * CESIUM-3D-CORE.JS
 * Main Cesium 3D Viewer Orchestration
 *
 * Coordinates all Cesium modules: provider stack, camera direction, plot tracking,
 * terrain management, cinematic tours, and measurement tools.
 *
 * Replaces old monolithic cesium-3d.js with modular architecture.
 *
 * Usage:
 *   const viewer = new CesiumViewer3D('cesium-container', config);
 *   await viewer.initialize();
 *   viewer.selectPlot(plotId);
 */

class CesiumViewer3D {
  constructor(containerId = 'cesium-container', config = {}) {
    this.containerId = containerId;
    this.config = config;
    this.viewer = null;
    this.isInitialized = false;

    // Module instances
    this.mapStack = null;
    this.cameraDirector = null;
    this.cinematicTour = null;
    this.plotTracker = null;
    this.realityLayer = null;    // Phase 2A-2D
    this.projectLayer = null;
    this.measurementTools = null;

    // Load configuration
    this.loadConfiguration();
  }

  /**
   * Load provider configuration from config/providers.json
   */
  async loadConfiguration() {
    try {
      const response = await fetch('config/providers.json');
      if (response.ok) {
        this.config = await response.json();
        Logger.info('Cesium', '[CesiumViewer3D] Configuration loaded');
      }
    } catch (err) {
      Logger.warn('Cesium', '[CesiumViewer3D] Failed to load config:', err);
      // Use default config passed in constructor
    }
  }

  /**
   * Initialize the entire 3D viewer with all modules
   */
  async initialize() {
    try {
      Logger.info('Cesium', '[CesiumViewer3D] Initializing...');

      // Check CesiumJS is loaded
      if (!window.Cesium) {
        Logger.error('Cesium', '[CesiumViewer3D] CesiumJS not loaded');
        return false;
      }

      // Get container
      const container = document.getElementById(this.containerId);
      if (!container) {
        Logger.error('Cesium', `[CesiumViewer3D] Container not found: ${this.containerId}`);
        return false;
      }

      // Create Cesium viewer
      const viewerOptions = {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: true,
        geocoder: false,
        homeButton: false,
        infoBox: true,
        sceneModePicker: false,
        selectionIndicator: true,
        navigationHelpButton: false,
        creditDisplay: this.createCustomCreditDisplay()
      };

      this.viewer = new Cesium.Viewer(this.containerId, viewerOptions);

      // Hide default Cesium credit
      if (this.viewer.creditDisplay?.container) {
        this.viewer.creditDisplay.container.style.display = 'none';
      }

      Logger.info('Cesium', '[CesiumViewer3D] Viewer created');

      // Initialize provider stack (imagery + terrain with fallback)
      this.mapStack = new MapStack(this.viewer, this.config);
      const providerSuccess = await this.mapStack.initializeProviders();

      if (!providerSuccess) {
        Logger.warn('Cesium', '[CesiumViewer3D] Provider initialization had issues; checking fallback');
      }

      // Phase 2A-2D: Real terrain, lighting, optional photorealistic tiles
      await this.initializeReality();

      // Initialize camera director
      this.cameraDirector = new CameraDirector(this.viewer, {
        defaultCenter: this.config.providers?.camera?.defaultCenter,
        defaultHeight: this.config.providers?.camera?.defaultHeight,
        defaultPitch: this.config.providers?.camera?.defaultPitch,
        defaultHeading: this.config.providers?.camera?.defaultHeading
      });

      // Initialize plot tracker
      this.plotTracker = new PlotTracker(this.viewer, this.cameraDirector, this.config);
      this.plotTracker.enableClickSelection();

      // Initialize project layer (load GeoJSON)
      this.projectLayer = new ProjectLayer(this.viewer, this.plotTracker, this.config);
      const geomUrl = this.config.providers?.featureLayers?.[0]?.source || 'custom_plots.geojson';
      await this.projectLayer.loadProjectGeometry(geomUrl);

      // Initialize cinematic tour
      this.cinematicTour = new CinematicTour(this.cameraDirector, this.config);

      // Initialize measurement tools
      this.measurementTools = new MeasurementTools(this.viewer, this.config);

      // Bind event listeners
      this.bindEventListeners();

      // Move camera to default location
      await this.cameraDirector.resetCamera();

      this.isInitialized = true;
      Logger.info('Cesium', '[CesiumViewer3D] Initialization complete');

      // Emit ready event
      this.emitReadyEvent();

      return true;

    } catch (err) {
      Logger.error('Cesium', '[CesiumViewer3D] Initialization error:', err);
      return false;
    }
  }

  /**
   * Bind UI and data event listeners
   */
  bindEventListeners() {
    // Listen for admin panel plot status updates
    window.addEventListener('plot:status-changed', (e) => {
      const { plotId, status } = e.detail;
      this.projectLayer.updatePlotStatus(plotId, status);
    });

    // Listen for plot selection from other sources (not just clicks)
    window.addEventListener('plot:select-request', (e) => {
      this.selectPlot(e.detail.plotId);
    });

    // Listen for tour requests
    window.addEventListener('plot:start-tour', (e) => {
      this.startPlotTour(e.detail.plotId);
    });

    // Listen for measurement requests
    window.addEventListener('measurement:start-distance', () => {
      this.measurementTools.startDistanceMeasurement();
    });

    window.addEventListener('measurement:start-area', () => {
      this.measurementTools.startAreaMeasurement();
    });

    window.addEventListener('measurement:cancel', () => {
      this.measurementTools.cancelMeasurement();
    });
  }

  /**
   * Phase 2A-2D — Load real-world terrain and (optionally) photorealistic 3D tiles.
   * Reads config from providers.json.
   * Falls back gracefully: World Terrain → ellipsoid; 3D tiles → silent skip.
   */
  async initializeReality() {
    if (!this.viewer) throw new Error('[CesiumViewer3D] Viewer not initialized');

    if (typeof RealityLayer === 'undefined') {
      Logger.warn('Cesium', '[CesiumViewer3D] RealityLayer not loaded — skipping terrain upgrade');
      return;
    }

    const photorealistic = this.config?.photorealisticTiles?.enabled === true;
    const cameraConfig   = this.config?.providers?.camera || {};

    this.realityLayer = await RealityLayer.loadRealityMode(this.viewer, {
      photorealistic,
      cameraConfig
    });
  }

  /**
   * Select a plot programmatically
   */
  selectPlot(plotId) {
    this.plotTracker.selectPlot(plotId);
  }

  /**
   * Start cinematic tour of specific plot(s)
   */
  async startPlotTour(plotId) {
    const plot = this.projectLayer.getPlotEntity(plotId);
    if (!plot) {
      Logger.error('Cesium', `[CesiumViewer3D] Plot not found: ${plotId}`);
      return;
    }

    await this.cinematicTour.createDynamicTour([plotId], {
      speed: 1.0,
      dwellTime: 3.0,
      orbitEachPlot: true,
      orbitRadius: 300
    });

    await this.cinematicTour.play();
  }

  /**
   * Start preset cinematic tour
   */
  async startPresetTour(tourName) {
    await this.cinematicTour.playPresetTour(tourName);
  }

  /**
   * Get all module instances for external access
   */
  getModules() {
    return {
      viewer: this.viewer,
      mapStack: this.mapStack,
      cameraDirector: this.cameraDirector,
      cinematicTour: this.cinematicTour,
      plotTracker: this.plotTracker,
      realityLayer: this.realityLayer,
      projectLayer: this.projectLayer,
      measurementTools: this.measurementTools
    };
  }

  /**
   * Get current system status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      provider: this.mapStack?.getCurrentProvider(),
      terrainLoaded: !!this.realityLayer?.terrain,
      photorealisticLoaded: !!this.realityLayer?.photorealisticTiles,
      selectedPlot: this.plotTracker?.getSelectedPlot(),
      camera: this.cameraDirector?.getStatus(),
      tour: this.cinematicTour?.getStatus(),
      measurement: this.measurementTools?.getStatus(),
      plotStats: this.projectLayer?.getPlotStats()
    };
  }

  /**
   * Create custom credit display
   */
  createCustomCreditDisplay() {
    return new Cesium.CreditDisplay(
      document.createElement('div'),
      false,
      document.createElement('div')
    );
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit viewer ready event
   */
  emitReadyEvent() {
    window.dispatchEvent(new CustomEvent('cesium3d:ready', {
      detail: { viewer: this }
    }));
  }

  /**
   * Cleanup and destroy viewer
   */
  destroy() {
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
    this.isInitialized = false;
    Logger.info('Cesium', '[CesiumViewer3D] Viewer destroyed');
  }
}

// Global export
if (typeof window !== 'undefined') {
  window.CesiumViewer3D = CesiumViewer3D;
}

// ========== AUTO-INITIALIZE IF ELEMENT EXISTS ==========

// Automatically initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('cesium-container')) {
    try {
      const cesium3d = new CesiumViewer3D('cesium-container');
      const success = await cesium3d.initialize();

      if (success) {
        window.Cesium3DViewer = cesium3d;
        Logger.info('Cesium', '[CesiumViewer3D] Auto-initialization successful');
      } else {
        Logger.error('Cesium', '[CesiumViewer3D] Auto-initialization failed');
      }
    } catch (err) {
      Logger.error('Cesium', '[CesiumViewer3D] Auto-initialization error:', err);
    }
  }
});
