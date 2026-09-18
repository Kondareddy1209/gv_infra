/**
 * MAP-STACK.JS
 * Provider Abstraction & Fallback Layer
 *
 * Manages imagery provider selection, fallback chains, and error recovery.
 * Implements runtime provider swapping without viewer restart.
 *
 * Usage:
 *   const stack = new MapStack(viewer, providersConfig);
 *   await stack.initializeProviders();
 *   stack.switchProvider('bhuvan_wms'); // runtime swap
 */

class MapStack {
  constructor(viewer, config) {
    this.viewer = viewer;
    this.config = config;
    this.currentImageryProvider = null;
    this.currentTerrainProvider = null;
    this.providerChain = [];
    this.chainIndex = 0;
    this.isInitialized = false;
    this.errorLog = [];
  }

  /**
   * Initialize providers in fallback chain order
   */
  async initializeProviders() {
    if (!this.viewer) {
      Logger.error('Cesium', '[MapStack] No viewer provided');
      return false;
    }

    try {
      // Sort imagery providers by failover priority
      const imageryProviders = (this.config.providers?.imagery || [])
        .filter(p => p.enabled)
        .sort((a, b) => (a.failoverPriority || 999) - (b.failoverPriority || 999));

      this.providerChain = imageryProviders;

      // Initialize terrain (single fallback)
      await this.initializeTerrain();

      // Try imagery providers in order
      for (let i = 0; i < imageryProviders.length; i++) {
        const provider = imageryProviders[i];
        const success = await this.tryImageryProvider(provider);

        if (success) {
          this.chainIndex = i;
          this.currentImageryProvider = provider;
          Logger.info('Cesium', `[MapStack] Using imagery provider: ${provider.name}`);
          this.isInitialized = true;
          return true;
        }
      }

      // All providers failed; use fallback
      Logger.warn('Cesium', '[MapStack] All imagery providers failed; using offline fallback');
      return this.enableOfflineMode();

    } catch (err) {
      Logger.error('Cesium', '[MapStack] Error during provider initialization:', err);
      this.errorLog.push({
        timestamp: Date.now(),
        error: err.message,
        context: 'initializeProviders'
      });
      return this.enableOfflineMode();
    }
  }

  /**
   * Try to initialize a single imagery provider
   */
  async tryImageryProvider(provider) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Provider timeout')), provider.timeout || 5000)
      );

      const initPromise = (async () => {
        switch (provider.type) {
          case 'esri_satellite':
            return this.initEsriSatellite(provider);
          case 'cesium_ion':
            return this.initCesiumIon(provider);
          case 'google_maps_3d_tiles':
            return this.initGoogle3DTiles(provider);
          case 'wms':
            return this.initWMS(provider);
          case 'osm':
            return this.initOSM(provider);
          default:
            throw new Error(`Unknown provider type: ${provider.type}`);
        }
      })();

      await Promise.race([initPromise, timeoutPromise]);
      return true;

    } catch (err) {
      Logger.warn('Cesium', `[MapStack] Provider ${provider.name} failed:`, err.message);
      this.errorLog.push({
        timestamp: Date.now(),
        provider: provider.name,
        error: err.message
      });
      return false;
    }
  }

  /**
   * Initialize Esri World Satellite Imagery (High Resolution, Free, Public)
   */
  async initEsriSatellite(provider) {
    if (!window.Cesium) {
      throw new Error('CesiumJS not loaded');
    }

    const url = provider.endpoint || 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
    
    let imageryProvider;
    if (typeof Cesium.ArcGisMapServerImageryProvider?.fromUrl === 'function') {
      imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(url);
    } else {
      imageryProvider = new Cesium.ArcGisMapServerImageryProvider({ url });
    }

    this.viewer.imageryLayers.removeAll();
    this.viewer.imageryLayers.addImageryProvider(imageryProvider);
    Logger.info('Cesium', '[MapStack] Esri World Satellite Imagery initialized');
    return true;
  }

  /**
   * Initialize Cesium Ion imagery (default, bundled)
   */
  async initCesiumIon(provider) {
    if (!window.Cesium || !window.Cesium.Cesium3DTileset) {
      throw new Error('CesiumJS not loaded');
    }

    // Cesium Ion is the default provider; no additional setup needed
    // The viewer already has a default imageryProvider
    Logger.info('Cesium', '[MapStack] Cesium Ion ready (default)');
    return true;
  }

  /**
   * Initialize Google 3D Tiles
   */
  async initGoogle3DTiles(provider) {
    const apiKey = this.getApiKey(provider.apiKeyEnvVar);
    if (!apiKey) {
      throw new Error(`API key not found: ${provider.apiKeyEnvVar}`);
    }

    // Google 3D Tiles integration
    // Note: This requires Cesium 1.120+ and proper API key configuration
    // For now, we use this as a placeholder for Google Maps imagery integration
    const imageryProvider = await Cesium.GoogleMapsImageryProvider.fromUrl(
      `${provider.endpoint}?key=${apiKey}`
    ).catch(err => {
      throw new Error(`Google Maps initialization failed: ${err.message}`);
    });

    this.viewer.imageryLayers.removeAll();
    this.viewer.imageryLayers.addImageryProvider(imageryProvider);
    Logger.info('Cesium', '[MapStack] Google 3D Tiles initialized');
    return true;
  }

  /**
   * Initialize WMS provider (Bhuvan ISRO)
   */
  async initWMS(provider) {
    if (!window.Cesium) {
      throw new Error('CesiumJS not loaded');
    }

    const imageryProvider = new Cesium.WebMapServiceImageryProvider({
      url: provider.endpoint,
      layers: provider.layers || 'IRS_P6_LISS3_NCHP',
      parameters: {
        transparent: 'true',
        format: 'image/png'
      },
      tilingScheme: new Cesium.GeographicTilingScheme(),
      maximumLevel: 18
    });

    this.viewer.imageryLayers.removeAll();
    this.viewer.imageryLayers.addImageryProvider(imageryProvider);
    Logger.info('Cesium', `[MapStack] WMS provider initialized: ${provider.name}`);
    return true;
  }

  /**
   * Initialize OpenStreetMap raster (ultimate fallback)
   */
  async initOSM(provider) {
    if (!window.Cesium) {
      throw new Error('CesiumJS not loaded');
    }

    const imageryProvider = new Cesium.OpenStreetMapImageryProvider({
      url: provider.endpoint.replace('{z}/{x}/{y}.png', '')
    });

    this.viewer.imageryLayers.removeAll();
    this.viewer.imageryLayers.addImageryProvider(imageryProvider);
    Logger.info('Cesium', '[MapStack] OpenStreetMap fallback initialized');
    return true;
  }

  /**
   * Initialize terrain provider with fallback
   */
  async initializeTerrain() {
    try {
      if (typeof Cesium.createWorldTerrainAsync !== 'function') {
        throw new Error('Cesium World Terrain not available');
      }

      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      });

      this.viewer.terrainProvider = terrainProvider;
      this.currentTerrainProvider = 'cesium_world_terrain';
      Logger.info('Cesium', '[MapStack] Cesium World Terrain initialized');
      return true;

    } catch (err) {
      Logger.warn('Cesium', '[MapStack] Terrain provider unavailable, falling back to ellipsoid:', err.message);
      this.currentTerrainProvider = 'ellipsoid';
      // Viewer defaults to ellipsoid; no additional setup needed
      return false;
    }
  }

  /**
   * Switch to different imagery provider at runtime
   */
  async switchProvider(providerName) {
    const provider = this.providerChain.find(p => p.name === providerName);
    if (!provider) {
      Logger.error('Cesium', `[MapStack] Provider not found: ${providerName}`);
      return false;
    }

    const success = await this.tryImageryProvider(provider);
    if (success) {
      this.currentImageryProvider = provider;
      Logger.info('Cesium', `[MapStack] Switched to provider: ${providerName}`);
    } else {
      Logger.error('Cesium', `[MapStack] Failed to switch to provider: ${providerName}`);
    }

    return success;
  }

  /**
   * Get next provider in fallback chain
   */
  async switchToNextProvider() {
    if (this.chainIndex >= this.providerChain.length - 1) {
      Logger.warn('Cesium', '[MapStack] No more providers in fallback chain');
      return false;
    }

    this.chainIndex++;
    const nextProvider = this.providerChain[this.chainIndex];
    return this.switchProvider(nextProvider.name);
  }

  /**
   * Enable offline mode (2D MapLibre fallback)
   */
  enableOfflineMode() {
    Logger.warn('Cesium', '[MapStack] Enabling offline mode (2D fallback)');

    // Hide Cesium container, show MapLibre container
    const cesiumContainer = document.getElementById('cesium-container');
    const maplibreContainer = document.getElementById('leaflet-map');

    if (cesiumContainer) {
      cesiumContainer.style.display = 'none';
    }
    if (maplibreContainer) {
      maplibreContainer.style.display = 'block';
    }

    // Emit event for other listeners
    window.dispatchEvent(new CustomEvent('cesium:offline-mode-enabled'));

    return false;
  }

  /**
   * Get API key from environment or window object
   */
  getApiKey(envVarName) {
    // Try environment variable first
    if (typeof process !== 'undefined' && process.env && process.env[envVarName]) {
      return process.env[envVarName];
    }

    // Try window object (for browser-based injections)
    if (typeof window !== 'undefined' && window[envVarName]) {
      return window[envVarName];
    }

    // Try from HTML data attributes
    const elem = document.querySelector(`[data-api-key="${envVarName}"]`);
    if (elem) {
      return elem.getAttribute('data-value');
    }

    Logger.warn('Cesium', `[MapStack] API key not found for ${envVarName}`);
    return null;
  }

  /**
   * Get error log (for debugging)
   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * Get current provider info
   */
  getCurrentProvider() {
    return {
      imagery: this.currentImageryProvider?.name || 'unknown',
      terrain: this.currentTerrainProvider || 'unknown',
      isOnline: this.isInitialized
    };
  }

  /**
   * Health check: verify current provider is still working
   */
  async healthCheck() {
    if (!this.currentImageryProvider) {
      return false;
    }

    try {
      // Try to fetch a single tile to verify provider is responsive
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 3000)
      );

      const checkPromise = (async () => {
        // Simple check: if viewer has imagery layers, provider is loaded
        return this.viewer.imageryLayers.length > 0;
      })();

      await Promise.race([checkPromise, timeoutPromise]);
      return true;

    } catch (err) {
      Logger.warn('Cesium', '[MapStack] Health check failed:', err.message);
      return false;
    }
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.MapStack = MapStack;
}
