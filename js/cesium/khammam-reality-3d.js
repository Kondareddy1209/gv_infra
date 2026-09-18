/**
 * KHAMMAM-REALITY-3D.JS
 * Comprehensive Real 3D Khammam Visualization
 *
 * Integrates:
 * - Real Cesium terrain & satellite imagery
 * - OpenStreetMap streets, buildings, landmarks
 * - Google Street View
 * - Real elevation data
 * - POI (schools, hospitals, landmarks)
 * - Route visualization
 * - 3D building extrusions
 * - Interactive street-level exploration
 */

class KhammamReality3D {
  constructor(viewer) {
    this.viewer = viewer;
    this.khammamCenter = { lat: 17.2476, lng: 80.1437 };
    this.khammamBounds = {
      north: 17.2700,
      south: 17.2250,
      east: 80.1600,
      west: 80.1250
    };

    this.dataSources = {
      streets: null,
      buildings: null,
      landmarks: null,
      routes: null
    };

    this.modes = {
      current: 'orbital',
      available: ['orbital', 'street-walk', 'aerial-tour', 'overhead-map', 'street-view']
    };
  }

  /**
   * Initialize full 3D Khammam reality environment
   */
  async initialize() {
    console.log('🌍 Initializing Khammam Reality 3D...');

    try {
      // 1. Setup enhanced terrain
      await this.setupEnhancedTerrain();

      // 2. Load real street networks
      await this.loadStreetNetworks();

      // 3. Load building footprints with extrusion
      await this.loadBuildingFootprints();

      // 4. Load landmarks & POIs
      await this.loadLandmarks();

      // 5. Add Stambadri plots overlay
      await this.addStambadriPlots();

      // 6. Setup interactive modes
      this.setupModes();

      // 7. Add measurement & analysis tools
      this.setupAnalysisTools();

      console.log('✅ Khammam Reality 3D initialized');
      return true;
    } catch (err) {
      console.error('❌ Initialization failed:', err);
      return false;
    }
  }

  /**
   * Setup enhanced terrain with real elevation
   */
  async setupEnhancedTerrain() {
    console.log('🗻 Loading real terrain data...');

    try {
      // Use Cesium World Terrain (already set in viewer)
      // Add Copernicus DEM for high-resolution elevation
      const copernicus = await Cesium.CopernicusDemProvider.fromUrl(
        'https://cloud.sdsc.edu/v1/AUTH_terrafusion/Raster/SRTM_GL30/SRTM_GL30_srtm/'
      );

      this.viewer.terrainProvider = copernicus;

      // Enable shadows for terrain
      this.viewer.shadowMap.enabled = true;
      this.viewer.shadowMap.softShadows = true;

      console.log('✅ Terrain with real elevation loaded');
    } catch (err) {
      console.warn('⚠️  Copernicus DEM fallback to Cesium World Terrain:', err);
      // Already has Cesium World Terrain as fallback
    }
  }

  /**
   * Load real street networks from OpenStreetMap
   */
  async loadStreetNetworks() {
    console.log('🛣️  Loading street networks from OpenStreetMap...');

    try {
      // Fetch OSM data using Overpass API
      const overpassQuery = this.buildOverpassQuery('way["highway"]');
      const osmData = await this.queryOverpassAPI(overpassQuery);

      if (!osmData || !osmData.features) {
        console.warn('⚠️  No OSM data found, using synthetic streets');
        return;
      }

      // Convert OSM GeoJSON to Cesium entities
      const dataSource = await Cesium.GeoJsonDataSource.load(osmData);
      this.viewer.dataSources.add(dataSource);

      // Style streets by road type
      dataSource.entities.values.forEach(entity => {
        const highway = entity.properties?.highway?.getValue?.() || 'road';
        const style = this.getStreetStyle(highway);

        entity.polyline = {
          positions: entity.polygon ? this.polygonToPolyline(entity.polygon) : [],
          width: style.width,
          material: Cesium.Color.fromCssColorString(style.color).withAlpha(0.7),
          clampToGround: true
        };

        delete entity.polygon; // Remove polygon, we're using polyline
      });

      this.dataSources.streets = dataSource;
      console.log(`✅ Loaded ${osmData.features.length} street segments`);

    } catch (err) {
      console.error('❌ Failed to load streets:', err);
    }
  }

  /**
   * Load building footprints with 3D extrusions
   */
  async loadBuildingFootprints() {
    console.log('🏢 Loading building footprints...');

    try {
      // Query OSM for buildings
      const overpassQuery = this.buildOverpassQuery('way["building"]');
      const buildingData = await this.queryOverpassAPI(overpassQuery);

      if (!buildingData || !buildingData.features) {
        console.warn('⚠️  No building data found');
        return;
      }

      const dataSource = new Cesium.CustomDataSource('buildings');

      // Create 3D building polygons
      buildingData.features.forEach((feature, idx) => {
        const coords = feature.geometry.coordinates[0];

        // Convert to Cesium positions
        const positions = coords.map(([lng, lat]) =>
          Cesium.Cartesian3.fromDegrees(lng, lat, 0)
        );

        const buildingHeight = this.estimateBuildingHeight(feature.properties);

        const entity = dataSource.entities.add({
          id: `building-${idx}`,
          name: feature.properties?.name || `Building ${idx}`,
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(positions),
            material: Cesium.Color.LIGHTGRAY.withAlpha(0.6),
            outline: true,
            outlineColor: Cesium.Color.DARKGRAY
          },
          properties: feature.properties,
          // 3D extrusion
          extrudedHeight: buildingHeight
        });
      });

      this.viewer.dataSources.add(dataSource);
      this.dataSources.buildings = dataSource;
      console.log(`✅ Loaded ${buildingData.features.length} buildings`);

    } catch (err) {
      console.error('❌ Failed to load buildings:', err);
    }
  }

  /**
   * Load landmarks, schools, hospitals, temples, etc.
   */
  async loadLandmarks() {
    console.log('📍 Loading landmarks & POIs...');

    try {
      // Query multiple landmark types
      const landmarkTypes = [
        { type: 'amenity="school"', icon: '🏫', name: 'Schools' },
        { type: 'amenity="hospital"', icon: '🏥', name: 'Hospitals' },
        { type: 'amenity="police"', icon: '🚓', name: 'Police' },
        { type: 'building="temple"', icon: '🕉️', name: 'Temples' },
        { type: 'amenity="restaurant"', icon: '🍽️', name: 'Restaurants' },
        { type: 'shop', icon: '🏪', name: 'Shops' }
      ];

      const dataSource = new Cesium.CustomDataSource('landmarks');
      let totalCount = 0;

      for (const landmark of landmarkTypes) {
        try {
          const query = this.buildOverpassQuery(`node[${landmark.type}]`);
          const data = await this.queryOverpassAPI(query, 2000); // 2s timeout

          if (!data?.elements) continue;

          data.elements.forEach((element, idx) => {
            if (!element.lat || !element.lon) return;

            const entity = dataSource.entities.add({
              position: Cesium.Cartesian3.fromDegrees(element.lon, element.lat, 50),
              point: {
                pixelSize: 8,
                color: this.getLandmarkColor(landmark.type),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
              },
              label: {
                text: landmark.icon,
                font: '24px Arial',
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                pixelOffset: new Cesium.Cartesian2(0, -10)
              },
              name: `${landmark.name}: ${element.tags?.name || 'Unnamed'}`,
              properties: element.tags || {}
            });
          });

          totalCount += (data.elements?.length || 0);
          console.log(`  ✅ ${landmark.name}: ${data.elements?.length || 0}`);
        } catch (err) {
          console.warn(`  ⚠️  ${landmark.type}: ${err.message}`);
        }
      }

      if (totalCount > 0) {
        this.viewer.dataSources.add(dataSource);
        this.dataSources.landmarks = dataSource;
      }

      console.log(`✅ Loaded ${totalCount} landmarks & POIs`);

    } catch (err) {
      console.error('❌ Failed to load landmarks:', err);
    }
  }

  /**
   * Add Stambadri Enclave plots as reality overlay
   */
  async addStambadriPlots() {
    console.log('🏘️  Overlaying Stambadri Enclave plots...');

    try {
      const response = await fetch('custom_plots.geojson');
      if (!response.ok) throw new Error('GeoJSON not found');

      const geojson = await response.json();
      const dataSource = await Cesium.GeoJsonDataSource.load(geojson);

      dataSource.entities.values.forEach(entity => {
        const status = entity.properties?.status?.getValue?.() || 'available';
        const color = this.getPlotColor(status);

        entity.polygon = {
          hierarchy: entity.polygon,
          material: Cesium.Color.fromCssColorString(color).withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          extrudedHeight: 15
        };
      });

      this.viewer.dataSources.add(dataSource);
      console.log(`✅ Stambadri plots overlaid`);

    } catch (err) {
      console.warn('⚠️  Could not overlay Stambadri plots:', err);
    }
  }

  /**
   * Setup interactive visualization modes
   */
  setupModes() {
    console.log('🎬 Setting up interactive modes...');

    // Orbital mode (default) - rotating camera around Khammam
    this.addMode('orbital', {
      setup: () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            this.khammamCenter.lng,
            this.khammamCenter.lat,
            5000 // 5km altitude
          ),
          orientation: {
            heading: 0,
            pitch: -45,
            roll: 0
          },
          duration: 3
        });
      },
      update: () => {
        // Smooth rotation
        const camera = this.viewer.camera;
        camera.setView({
          destination: camera.position,
          orientation: {
            heading: Cesium.Math.toRadians((Date.now() / 50) % 360),
            pitch: camera.pitch,
            roll: camera.roll
          }
        });
      }
    });

    // Street-walk mode - first-person navigation
    this.addMode('street-walk', {
      setup: () => {
        // Start at ground level on a main street
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            this.khammamCenter.lng,
            this.khammamCenter.lat,
            2
          ),
          orientation: {
            heading: 0,
            pitch: 0,
            roll: 0
          },
          duration: 2
        });

        // Enable WASD controls for walking
        document.addEventListener('keydown', (e) => {
          const speed = 50;
          const camera = this.viewer.camera;

          switch(e.key.toLowerCase()) {
            case 'w': camera.moveForward(speed); break;
            case 'a': camera.moveLeft(speed); break;
            case 's': camera.moveBackward(speed); break;
            case 'd': camera.moveRight(speed); break;
          }
        });
      }
    });

    // Aerial tour mode - cinematic flight path
    this.addMode('aerial-tour', {
      setup: () => {
        const camera = this.viewer.camera;

        // Create flight path through key locations
        const waypoints = [
          { lng: 80.1437, lat: 17.2476, height: 2000 }, // Stambadri center
          { lng: 80.1500, lat: 17.2400, height: 2500 }, // Highway view
          { lng: 80.1300, lat: 17.2550, height: 2000 }, // Village overview
          { lng: 80.1437, lat: 17.2476, height: 3000 }  // Back to center
        ];

        let currentWaypoint = 0;
        const animateFlight = () => {
          const wp = waypoints[currentWaypoint];
          camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.height),
            duration: 10
          });

          currentWaypoint = (currentWaypoint + 1) % waypoints.length;
          setTimeout(animateFlight, 12000);
        };

        animateFlight();
      }
    });

    // Overhead map mode - 2D-like top-down view
    this.addMode('overhead-map', {
      setup: () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            this.khammamCenter.lng,
            this.khammamCenter.lat,
            8000
          ),
          orientation: {
            heading: 0,
            pitch: -90, // Straight down
            roll: 0
          },
          duration: 2
        });
      }
    });

    // Street View mode - integrated Google Street View
    this.addMode('street-view', {
      setup: () => {
        this.openStreetView(this.khammamCenter.lat, this.khammamCenter.lng);
      }
    });

    console.log('✅ Modes configured');
  }

  /**
   * Setup analysis & measurement tools
   */
  setupAnalysisTools() {
    console.log('📐 Setting up analysis tools...');

    // Add measurement tool
    this.viewer.selectedEntityChanged.addEventListener((entity) => {
      if (entity && entity.name) {
        console.log('Selected:', entity.name);

        // Show properties in sidebar
        if (entity.properties) {
          const props = entity.properties;
          console.log('Properties:', props);
        }
      }
    });

    // Add distance measurement
    window.measureDistance = () => {
      const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
      const positions = [];

      handler.setInputAction((click) => {
        const pickedObject = this.viewer.scene.pick(click.position);
        const cartesian = this.viewer.scene.pickPosition(click.position);

        if (Cesium.defined(cartesian)) {
          positions.push(cartesian);

          // Draw point
          this.viewer.entities.add({
            position: cartesian,
            point: {
              pixelSize: 6,
              color: Cesium.Color.RED,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2
            }
          });

          // Draw line if we have 2+ points
          if (positions.length >= 2) {
            const distance = Cesium.Cartesian3.distance(
              positions[positions.length - 2],
              positions[positions.length - 1]
            );

            console.log(`Distance: ${(distance / 1000).toFixed(2)} km`);

            this.viewer.entities.add({
              polyline: {
                positions: [
                  positions[positions.length - 2],
                  positions[positions.length - 1]
                ],
                width: 2,
                material: Cesium.Color.YELLOW,
                clampToGround: true
              }
            });
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      handler.setInputAction(() => {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    };

    console.log('✅ Analysis tools ready');
  }

  /**
   * Build Overpass API query
   */
  buildOverpassQuery(filter) {
    return `
      [bbox:${this.khammamBounds.south},${this.khammamBounds.west},${this.khammamBounds.north},${this.khammamBounds.east}]
      [out:json];
      (${filter};);
      out center;
    `;
  }

  /**
   * Query Overpass API for OSM data
   */
  async queryOverpassAPI(query, timeout = 5000) {
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Convert OSM data to GeoJSON
      return this.osmToGeoJSON(data);
    } catch (err) {
      console.warn('⚠️  Overpass API error:', err.message);
      return null;
    }
  }

  /**
   * Convert OSM data to GeoJSON
   */
  osmToGeoJSON(osmData) {
    const features = [];

    if (osmData.elements) {
      osmData.elements.forEach(element => {
        if (element.type === 'node' && element.lat && element.lon) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [element.lon, element.lat]
            },
            properties: element.tags || {}
          });
        } else if (element.type === 'way' && element.geometry) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: element.geometry.map(p => [p.lon, p.lat])
            },
            properties: element.tags || {}
          });
        }
      });
    }

    return { type: 'FeatureCollection', features };
  }

  /**
   * Get street styling by highway type
   */
  getStreetStyle(highwayType) {
    const styles = {
      motorway: { width: 8, color: '#FF0000' },
      trunk: { width: 7, color: '#FF3333' },
      primary: { width: 6, color: '#FF6600' },
      secondary: { width: 5, color: '#FFCC00' },
      tertiary: { width: 4, color: '#FFFF00' },
      residential: { width: 3, color: '#FFFFFF' },
      service: { width: 2, color: '#CCCCCC' },
      road: { width: 3, color: '#EEEEEE' }
    };

    return styles[highwayType] || styles.road;
  }

  /**
   * Estimate building height based on properties
   */
  estimateBuildingHeight(properties) {
    if (properties?.height) {
      const m = parseInt(properties.height);
      return isNaN(m) ? 20 : m;
    }
    if (properties?.levels) {
      return parseInt(properties.levels) * 3.5;
    }

    // Default: random 2-5 stories
    return 7 + Math.random() * 15;
  }

  /**
   * Get landmark color by type
   */
  getLandmarkColor(type) {
    const colors = {
      'amenity="school"': Cesium.Color.BLUE,
      'amenity="hospital"': Cesium.Color.RED,
      'amenity="police"': Cesium.Color.DARKBLUE,
      'building="temple"': Cesium.Color.ORANGE,
      'amenity="restaurant"': Cesium.Color.YELLOW,
      'shop': Cesium.Color.GREEN
    };

    return colors[type] || Cesium.Color.GRAY;
  }

  /**
   * Get plot color by status
   */
  getPlotColor(status) {
    const colors = {
      available: '#2E6E45',
      reserved: '#B58A1C',
      hold: '#A65B2E',
      sold: '#706B61'
    };

    return colors[status] || '#CCCCCC';
  }

  /**
   * Add visualization mode
   */
  addMode(name, config) {
    this.viewer[`mode_${name}`] = config;
  }

  /**
   * Switch to visualization mode
   */
  switchMode(modeName) {
    if (this.viewer[`mode_${modeName}`]) {
      this.modes.current = modeName;
      this.viewer[`mode_${modeName}`].setup();
      console.log(`📺 Switched to ${modeName} mode`);
    }
  }

  /**
   * Open Google Street View
   */
  openStreetView(lat, lng) {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
    window.open(url, 'streetview');
  }

  /**
   * Export visualization as screenshot/video
   */
  async captureScreenshot(filename = 'khammam-3d.png') {
    try {
      const canvas = this.viewer.scene.canvas;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
      console.log('✅ Screenshot saved');
    } catch (err) {
      console.error('❌ Screenshot failed:', err);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KhammamReality3D;
}
