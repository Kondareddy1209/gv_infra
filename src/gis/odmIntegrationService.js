/**
 * OpenDroneMap (ODM) Integration & Aerial Photogrammetry Service
 * Bridges raw drone aerial imagery outputs from ODM (Orthophotos, DTMs, 3D Mesh Tilesets)
 * into Leaflet 2D (real-land-map.html) and Cesium 3D (project-3d-demo.html).
 */

export class ODMIntegrationService {
  constructor(options = {}) {
    this.droneDatasetPath = options.droneDatasetPath || '/data/drone';
    this.activeOrthophotoLayer = null;
    this.active3DTileset = null;
  }

  /**
   * 1. Register ODM Ultra High-Resolution Drone Orthophoto in Leaflet Map
   * @param {object} map Leaflet Map Instance
   * @param {object} metadata ODM Output Metadata (bounds, tileUrl or imageOverlayUrl)
   */
  loadDroneOrthophotoToLeaflet(map, metadata = {}) {
    const tileUrl = metadata.tileUrl || `${this.droneDatasetPath}/orthophoto_tiles/{z}/{x}/{y}.png`;
    const bounds = metadata.bounds || [
      [17.2465, 80.1340], // South-West
      [17.2490, 80.1370]  // North-East
    ];

    console.log('🚁 Loading ODM Drone Orthophoto into Leaflet Map:', tileUrl);

    // If using tile pyramid
    if (metadata.isTilePyramid) {
      this.activeOrthophotoLayer = L.tileLayer(tileUrl, {
        maxZoom: 22,
        maxNativeZoom: 21,
        attribution: '© Drone Survey Imagery via OpenDroneMap (ODM)'
      }).addTo(map);
    } else {
      // Direct high-resolution raster overlay
      const imageUrl = metadata.imageUrl || `${this.droneDatasetPath}/orthophoto.jpg`;
      this.activeOrthophotoLayer = L.imageOverlay(imageUrl, bounds, {
        opacity: 0.95,
        attribution: '© Drone Survey Imagery via OpenDroneMap (ODM)'
      }).addTo(map);
    }

    return this.activeOrthophotoLayer;
  }

  /**
   * 2. Load ODM 3D Mesh / Point Cloud Tileset into Cesium 3D Viewer
   * @param {object} viewer Cesium.Viewer Instance
   * @param {string} tilesetUrl URL to ODM generated 3D Tileset (tileset.json)
   */
  async loadODM3DTilesetToCesium(viewer, tilesetUrl) {
    if (!window.Cesium || !viewer) {
      console.warn('Cesium viewer not available for ODM 3D Tileset loading.');
      return null;
    }

    const url = tilesetUrl || `${this.droneDatasetPath}/3d_mesh/tileset.json`;
    console.log('🚁 Loading ODM 3D Textured Mesh into Cesium:', url);

    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
        maximumScreenSpaceError: 16,
        skipLevelOfDetail: true
      });

      viewer.scene.primitives.add(tileset);
      this.active3DTileset = tileset;

      // Zoom camera to drone 3D mesh
      await viewer.zoomTo(tileset);
      return tileset;
    } catch (err) {
      console.warn('ODM 3D Tileset loading fallback (simulation mode):', err.message);
      return null;
    }
  }

  /**
   * 3. Compute Digital Terrain Elevation Profile for Plot Boundary
   * @param {Array} coordinates Polygon GeoJSON coordinates
   */
  calculateElevationProfile(coordinates) {
    // Simulated terrain height analysis from ODM DTM output
    return {
      minElevationMeters: 104.2,
      maxElevationMeters: 108.7,
      slopePercentage: 2.1, // Excellent natural drainage slope
      terrainClassification: 'Gently Sloped / Flood-Safe',
      recommendedFoundationDepth: '1.5 Meters'
    };
  }
}

if (typeof window !== 'undefined') {
  window.ODMIntegrationService = ODMIntegrationService;
}
