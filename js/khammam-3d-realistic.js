/**
 * REALISTIC 3D LAND VIEWER WITH REAL-TIME 2D SYNC
 * - Ground-level plot boundaries (no artificial extrusions)
 * - Real satellite imagery showing through
 * - Glowing boundary lines that mark actual edited plots
 * - Real-time sync with 2D border editor
 */

class KhammamRealistic3D {
  constructor() {
    this.viewer = null;
    this.plots = [];
    this.plotEntities = {}; // id -> entity
    this.selectedPlotId = null;
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.syncDebounce = 500; // ms

    // More realistic, natural color scheme for status
    this.statusColors = {
      available: {
        fill: '#10b981',      // Emerald
        outline: '#34d399',   // Light emerald glow
        opacity: 0.15         // Very transparent - let terrain show
      },
      reserved: {
        fill: '#f59e0b',      // Amber
        outline: '#fbbf24',   // Light amber glow
        opacity: 0.12
      },
      sold: {
        fill: '#ef4444',      // Red
        outline: '#fca5a5',   // Light red glow
        opacity: 0.10
      },
      hold: {
        fill: '#6b7280',      // Gray
        outline: '#9ca3af',   // Light gray
        opacity: 0.08
      }
    };

    // Khammam center
    this.center = { lat: 17.2480, lng: 80.1365 };
  }

  /**
   * Initialize realistic 3D viewer
   */
  async init() {
    console.log('🌍 Initializing Realistic 3D Land Viewer with 2D Sync...');

    try {
      await this.createViewer();
      await this.loadPlots();
      this.renderPlotBoundaries();
      this.setupInteractivity();
      this.setupSync();

      // Hide loading
      const loader = document.getElementById('loading-indicator');
      if (loader) setTimeout(() => loader.style.display = 'none', 1000);

      console.log('✅ Realistic 3D Viewer Ready!');
    } catch (err) {
      console.error('❌ Init failed:', err);
    }
  }

  /**
   * Create Cesium viewer with realistic settings
   */
  async createViewer() {
    const container = document.getElementById('cesium-container');
    if (!container) throw new Error('No #cesium-container found');

    // Google Satellite imagery (shows actual land)
    const googleSat = new Cesium.UrlTemplateImageryProvider({
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      credit: '© Google Satellite'
    });

    // Create viewer with terrain enabled
    this.viewer = new Cesium.Viewer(container, {
      imageryProvider: googleSat,
      scene3DOnly: true,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: true,
      infoBox: false,
      selectionIndicator: true,
      navigationHelpButton: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false
    });

    // Enable depth testing so ground boundaries sit on terrain
    this.viewer.scene.globe.depthTestAgainstTerrain = true;
    this.viewer.scene.globe.enableLighting = true;
    this.viewer.scene.globe.dynamicAtmosphereLighting = true;

    // Load world terrain for realistic elevation
    try {
      if (typeof Cesium.createWorldTerrainAsync === 'function') {
        const terrain = await Cesium.createWorldTerrainAsync();
        this.viewer.terrainProvider = terrain;
      }
    } catch (e) {
      console.warn('Terrain fallback:', e.message);
    }

    // Golden hour lighting
    const date = new Date(2026, 8, 18, 11, 30);
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);

    // Fly to venture center
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(this.center.lng, this.center.lat, 800),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    });

    console.log('✅ Cesium viewer created with realistic settings');
  }

  /**
   * Load plots from GeoJSON
   */
  async loadPlots() {
    try {
      let response = await fetch(`custom_plots.geojson?t=${Date.now()}`);
      if (!response.ok) {
        response = await fetch(`data/sample_plots_complete.geojson?t=${Date.now()}`);
      }
      const geojson = await response.json();
      this.plots = geojson.features || [];
      console.log(`✅ Loaded ${this.plots.length} plots`);
    } catch (err) {
      console.error('❌ Load plots failed:', err);
      this.plots = [];
    }
  }

  /**
   * Render REALISTIC ground-level plot boundaries (not extrusions!)
   */
  renderPlotBoundaries() {
    console.log('Rendering realistic ground-level boundaries...');

    this.plots.forEach(feature => {
      const props = feature.properties || {};
      const status = (props.status || 'available').toLowerCase();
      const colors = this.statusColors[status] || this.statusColors.available;
      const plotId = props.plot_id || props.plot_number || feature.id;

      if (!feature.geometry?.coordinates?.[0]) return;

      const coords = feature.geometry.coordinates[0];
      const flatCoords = coords.flatMap(([lng, lat]) => [lng, lat]);

      // Create hierarchy for ground-level polygon
      const hierarchy = new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(flatCoords)
      );

      // REALISTIC: Ground-level polygon with very transparent fill
      // This shows the satellite imagery through with just a subtle boundary
      const entity = this.viewer.entities.add({
        id: `plot_${plotId}`,
        name: `Plot ${plotId}`,
        polygon: {
          hierarchy: hierarchy,
          // Transparent fill - let satellite show through
          material: Cesium.Color.fromCssColorString(colors.fill)
            .withAlpha(colors.opacity),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colors.outline)
            .withAlpha(0.85),
          outlineWidth: 3,
          // NO EXTRUSION - stay on ground level
          height: 0,
          // Enable shadows for depth perception
          shadows: Cesium.ShadowMode.RECEIVE
        },
        properties: props,
        // Custom data for sync
        _lastUpdated: Date.now(),
        _isEdited: false // Track if this plot was edited from 2D
      });

      this.plotEntities[plotId] = entity;

      // Add subtle polyline outline for better visibility
      const outline = this.viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(flatCoords.concat(flatCoords.slice(0, 2))),
          width: 2,
          material: Cesium.Color.fromCssColorString(colors.outline).withAlpha(0.6),
          clampToGround: true
        }
      });
    });

    // Zoom to show all plots nicely
    this.viewer.zoomTo(this.viewer.entities, new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-45),
      0
    ));

    console.log(`✅ Rendered ${this.plots.length} realistic ground-level boundaries`);
  }

  /**
   * Sync with 2D editor - watch for GeoJSON changes and update 3D
   */
  setupSync() {
    console.log('Setting up 2D-3D sync...');

    // Poll for changes from 2D editor (Leaflet)
    this.syncInterval = setInterval(() => {
      this.checkFor2DChanges();
    }, 1000);

    // Also listen for broadcast messages from 2D editor
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'PLOT_EDITED') {
        console.log('📡 Received plot edit event from 2D:', event.data.plotId);
        this.updatePlotIn3D(event.data.plotId, event.data.geometry);
      }
    });
  }

  /**
   * Check if 2D editor has modified any plots
   * by comparing timestamps and geometry
   */
  checkFor2DChanges() {
    try {
      // Look for global land editor instance from real-land-map.html
      if (!window.landEditorInstance) return;

      const leafletFeatures = window.landEditorInstance.drawnItems?.toGeoJSON?.();
      if (!leafletFeatures?.features) return;

      // Check each Leaflet drawn feature
      leafletFeatures.features.forEach(feature => {
        const plotId = feature.properties?.plot_id || feature.properties?.id;
        if (!plotId) return;

        // Check if this plot exists in 3D and if geometry changed
        const entity3D = this.plotEntities[plotId];
        if (!entity3D) return;

        const feature3D = this.plots.find(p =>
          (p.properties?.plot_id || p.properties?.plot_number) === plotId
        );
        if (!feature3D) return;

        // Compare geometries to detect changes
        const coordsChanged = JSON.stringify(feature.geometry.coordinates) !==
                             JSON.stringify(feature3D.geometry.coordinates);

        if (coordsChanged) {
          console.log(`🔄 Syncing plot ${plotId} from 2D to 3D...`);
          this.updatePlotIn3D(plotId, feature.geometry, feature.properties);
        }
      });
    } catch (err) {
      // Silent - normal when 2D editor not loaded
    }
  }

  /**
   * Update a plot's 3D boundary when 2D edits occur
   */
  updatePlotIn3D(plotId, geometry, properties) {
    const entity = this.plotEntities[plotId];
    if (!entity) {
      console.warn(`Plot ${plotId} not found in 3D`);
      return;
    }

    try {
      if (!geometry?.coordinates?.[0]) {
        console.warn(`Invalid geometry for plot ${plotId}`);
        return;
      }

      const coords = geometry.coordinates[0];
      const flatCoords = coords.flatMap(([lng, lat]) => [lng, lat]);
      const hierarchy = new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(flatCoords)
      );

      // Update polygon hierarchy
      entity.polygon.hierarchy = hierarchy;

      // Update properties if changed
      if (properties) {
        entity.properties = properties;
      }

      // Mark as edited with visual indicator
      entity._isEdited = true;
      entity._lastUpdated = Date.now();

      // VISUAL FEEDBACK: Brighten outline temporarily to show it was edited
      const originalWidth = entity.polygon.outlineWidth;
      const originalOpacity = entity.polygon.outlineColor.alpha;

      entity.polygon.outlineWidth = 5;
      entity.polygon.outlineColor = entity.polygon.outlineColor.withAlpha(1.0);

      // Fade back to normal after 2 seconds
      setTimeout(() => {
        if (this.selectedPlotId !== plotId) {
          entity.polygon.outlineWidth = originalWidth;
          entity.polygon.outlineColor = entity.polygon.outlineColor.withAlpha(originalOpacity);
        }
      }, 2000);

      console.log(`✅ Updated plot ${plotId} in 3D`);

      // Fly camera to updated plot for visual confirmation
      this.viewer.flyTo(entity, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 400)
      });

    } catch (err) {
      console.error(`Error updating plot ${plotId}:`, err);
    }
  }

  /**
   * Handle click selection on plots
   */
  setupInteractivity() {
    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    handler.setInputAction((click) => {
      const pickedObject = this.viewer.scene.pick(click.position);

      if (Cesium.defined(pickedObject) && pickedObject.id?.id?.startsWith('plot_')) {
        const entity = pickedObject.id;
        const plotId = entity.id.replace('plot_', '');
        this.selectPlot(plotId);
      } else {
        this.deselectPlot();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * Select and highlight a plot
   */
  selectPlot(plotId) {
    this.deselectPlot();
    this.selectedPlotId = plotId;

    const entity = this.plotEntities[plotId];
    if (!entity || !entity.polygon) return;

    // Brighten on selection (increase opacity and glow)
    const currentColor = entity.polygon.material;
    entity.polygon.outlineWidth = 5;
    entity.polygon.material = entity.polygon.material.color.withAlpha(0.35);

    console.log(`Selected plot ${plotId}`);
  }

  /**
   * Deselect current plot
   */
  deselectPlot() {
    if (!this.selectedPlotId) return;

    const entity = this.plotEntities[this.selectedPlotId];
    if (!entity || !entity.polygon) return;

    const props = entity.properties || {};
    const status = (props.status || 'available').toLowerCase();
    const colors = this.statusColors[status] || this.statusColors.available;

    // Reset to normal transparency
    entity.polygon.material = Cesium.Color.fromCssColorString(colors.fill)
      .withAlpha(colors.opacity);
    entity.polygon.outlineWidth = 3;

    this.selectedPlotId = null;
  }

  /**
   * Cleanup on exit
   */
  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.viewer) this.viewer.destroy();
  }
}

// Global instance
let realistic3D = null;

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📍 Starting Realistic 3D Land Viewer...');
  realistic3D = new KhammamRealistic3D();
  await realistic3D.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (realistic3D) realistic3D.destroy();
  });
});
