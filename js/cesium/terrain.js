/**
 * TERRAIN.JS
 * Elevation & 3D Tile Management
 *
 * Handles elevation data, 3D tile sets, and terrain mesh management.
 * Provides fallback chains for tile unavailability.
 *
 * Usage:
 *   const terrain = new TerrainManager(viewer, config);
 *   await terrain.initializeTerrain();
 *   terrain.enableElevationQuery();
 */

class TerrainManager {
  constructor(viewer, config = {}) {
    this.viewer = viewer;
    this.config = config;
    this.currentTerrainProvider = null;
    this.elevationData = new Map();
    this.isInitialized = false;
    this.enableElevationQuery = false;
  }

  /**
   * Initialize terrain with fallback chain
   */
  async initializeTerrain() {
    try {
      const terrainConfig = this.config.providers?.terrain || [];

      for (const terrainProvider of terrainConfig) {
        if (!terrainProvider.enabled) continue;

        try {
          const success = await this.initializeProvider(terrainProvider);
          if (success) {
            this.currentTerrainProvider = terrainProvider.name;
            this.isInitialized = true;
            Logger.info('Cesium', `[Terrain] Initialized: ${terrainProvider.name}`);
            return true;
          }
        } catch (err) {
          Logger.warn('Cesium', `[Terrain] Provider failed: ${terrainProvider.name} - ${err.message}`);
          continue;
        }
      }

      Logger.warn('Cesium', '[Terrain] All terrain providers failed; using ellipsoid');
      this.currentTerrainProvider = 'ellipsoid';
      return false;

    } catch (err) {
      Logger.error('Cesium', '[Terrain] Error initializing terrain:', err);
      return false;
    }
  }

  /**
   * Initialize a single terrain provider
   */
  async initializeProvider(terrainProvider) {
    switch (terrainProvider.type) {
      case 'cesium_ion_terrain':
        return this.initCesiumWorldTerrain(terrainProvider);
      case 'ellipsoid':
        return this.initEllipsoid();
      default:
        throw new Error(`Unknown terrain type: ${terrainProvider.type}`);
    }
  }

  /**
   * Initialize Cesium World Terrain
   */
  async initCesiumWorldTerrain(config) {
    try {
      if (typeof Cesium.createWorldTerrainAsync !== 'function') {
        throw new Error('Cesium World Terrain function not available');
      }

      const terrainProvider = await Cesium.createWorldTerrainAsync({
        requestWaterMask: config.options?.requestWaterMask ?? true,
        requestVertexNormals: config.options?.requestVertexNormals ?? true
      });

      this.viewer.terrainProvider = terrainProvider;
      return true;

    } catch (err) {
      throw new Error(`Cesium World Terrain initialization failed: ${err.message}`);
    }
  }

  /**
   * Initialize ellipsoid (no elevation)
   */
  initEllipsoid() {
    this.viewer.terrainProvider = Cesium.EllipsoidTerrainProvider.instance;
    return true;
  }

  /**
   * Query elevation at a specific coordinate
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<number>} Elevation in meters
   */
  async queryElevation(lat, lng) {
    try {
      const positions = [
        Cesium.Cartographic.fromDegrees(lng, lat, 0)
      ];

      const elevations = await Cesium.sampleTerrainMostDetailed(
        this.viewer.terrainProvider,
        positions
      );

      if (elevations && elevations.length > 0) {
        return elevations[0].height ?? 0;
      }

      return 0;

    } catch (err) {
      Logger.warn('Cesium', `[Terrain] Elevation query failed for (${lat}, ${lng}):`, err);
      return 0;
    }
  }

  /**
   * Query elevation for multiple coordinates
   * @param {Array} coordinates - Array of [lat, lng] pairs
   * @returns {Promise<Array>} Array of elevation values
   */
  async queryElevationBatch(coordinates) {
    try {
      const positions = coordinates.map(coord =>
        Cesium.Cartographic.fromDegrees(coord[1], coord[0], 0)
      );

      const elevations = await Cesium.sampleTerrainMostDetailed(
        this.viewer.terrainProvider,
        positions
      );

      return elevations.map(e => e.height ?? 0);

    } catch (err) {
      Logger.warn('Cesium', '[Terrain] Batch elevation query failed:', err);
      return coordinates.map(() => 0);
    }
  }

  /**
   * Get terrain height at coordinate
   * Synchronous operation (returns cached or 0 if not cached)
   */
  getHeightAtCoordinate(lat, lng) {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    return this.elevationData.get(key) ?? 0;
  }

  /**
   * Cache elevation data for coordinates
   */
  async cacheElevationData(coordinates) {
    try {
      const elevations = await this.queryElevationBatch(coordinates);

      coordinates.forEach((coord, idx) => {
        const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
        this.elevationData.set(key, elevations[idx]);
      });

      Logger.info('Cesium', `[Terrain] Cached elevation data for ${coordinates.length} points`);
      return true;

    } catch (err) {
      Logger.warn('Cesium', '[Terrain] Error caching elevation data:', err);
      return false;
    }
  }

  /**
   * Calculate slope at coordinate (rise/run for tilted terrain)
   */
  async calculateSlope(lat, lng, sampleRadius = 50) {
    try {
      // Sample 4 corners around the point
      const offset = sampleRadius / 111000; // Convert meters to degrees

      const corners = [
        [lat + offset, lng + offset],
        [lat + offset, lng - offset],
        [lat - offset, lng + offset],
        [lat - offset, lng - offset]
      ];

      const elevations = await this.queryElevationBatch(corners);
      const heightDiff = Math.max(...elevations) - Math.min(...elevations);
      const distance = sampleRadius * 2;

      const slope = Math.atan(heightDiff / distance) * (180 / Math.PI);
      return slope;

    } catch (err) {
      Logger.warn('Cesium', '[Terrain] Slope calculation failed:', err);
      return 0;
    }
  }

  /**
   * Switch to different terrain provider at runtime
   */
  async switchTerrainProvider(providerName) {
    const config = this.config.providers?.terrain || [];
    const provider = config.find(p => p.name === providerName);

    if (!provider) {
      Logger.error('Cesium', `[Terrain] Unknown terrain provider: ${providerName}`);
      return false;
    }

    try {
      const success = await this.initializeProvider(provider);
      if (success) {
        this.currentTerrainProvider = providerName;
        Logger.info('Cesium', `[Terrain] Switched to: ${providerName}`);
      }
      return success;

    } catch (err) {
      Logger.error('Cesium', `[Terrain] Failed to switch to ${providerName}:`, err);
      return false;
    }
  }

  /**
   * Enable shadows (improves terrain visualization)
   */
  enableShadows() {
    if (this.viewer.scene) {
      this.viewer.scene.shadowMap.enabled = true;
      this.viewer.scene.shadowMap.size = 2048;
      Logger.info('Cesium', '[Terrain] Shadows enabled');
    }
  }

  /**
   * Enable lighting
   */
  enableLighting() {
    if (this.viewer.scene) {
      this.viewer.scene.globe.enableLighting = true;
      Logger.info('Cesium', '[Terrain] Lighting enabled');
    }
  }

  /**
   * Set viewer to show terrain wireframe (debug)
   */
  showTerrainWireframe(show = true) {
    if (this.viewer.scene && this.viewer.scene.globe) {
      this.viewer.scene.globe.showGroundAtmosphere = !show;
    }
  }

  /**
   * Get terrain info
   */
  getTerrainInfo() {
    return {
      provider: this.currentTerrainProvider,
      isInitialized: this.isInitialized,
      cachedPoints: this.elevationData.size,
      shadowsEnabled: this.viewer.scene?.shadowMap?.enabled ?? false,
      lightingEnabled: this.viewer.scene?.globe?.enableLighting ?? false
    };
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.TerrainManager = TerrainManager;
}
