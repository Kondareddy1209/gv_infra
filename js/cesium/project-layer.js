/**
 * PROJECT-LAYER.JS
 * GV Infra Project Geometry Rendering
 *
 * Renders project plot boundaries from GeoJSON, applies styling based on status,
 * and manages layer visibility and interaction.
 *
 * Usage:
 *   const layer = new ProjectLayer(viewer, plotTracker, config);
 *   await layer.loadProjectGeometry('custom_plots.geojson');
 *   layer.updatePlotStatus(plotId, 'available');
 */

class ProjectLayer {
  constructor(viewer, plotTracker, config = {}) {
    this.viewer = viewer;
    this.plotTracker = plotTracker;
    this.config = config;
    this.dataSource = null;
    this.entities = new Map(); // plotId -> entity
    this.geometryUrl = null;
    this.isLoaded = false;
    this.styleConfig = {
      available: {
        color: '#2E6E45',
        opacity: 0.6,
        outlineColor: '#1a4d2e',
        outlineWidth: 2,
        extrudedHeight: 12
      },
      reserved: {
        color: '#B58A1C',
        opacity: 0.6,
        outlineColor: '#8b6a15',
        outlineWidth: 2,
        extrudedHeight: 12
      },
      hold: {
        color: '#A65B2E',
        opacity: 0.6,
        outlineColor: '#7a4122',
        outlineWidth: 2,
        extrudedHeight: 12
      },
      sold: {
        color: '#706B61',
        opacity: 0.6,
        outlineColor: '#4a4640',
        outlineWidth: 2,
        extrudedHeight: 12
      },
      blocked: {
        color: '#4B5563',
        opacity: 0.5,
        outlineColor: '#2d3544',
        outlineWidth: 2,
        extrudedHeight: 10
      }
    };
  }

  /**
   * Load project geometry from GeoJSON file
   * @param {string} geojsonUrl - URL to GeoJSON file
   */
  async loadProjectGeometry(geojsonUrl) {
    try {
      Logger.info('Cesium', `[ProjectLayer] Loading geometry from: ${geojsonUrl}`);

      this.geometryUrl = geojsonUrl;
      const geojson = await this.fetchGeoJSON(geojsonUrl);

      if (!geojson || !geojson.features) {
        throw new Error('Invalid GeoJSON structure');
      }

      this.dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
        stroke: Cesium.Color.WHITE,
        fill: Cesium.Color.BLUE.withAlpha(0.1),
        strokeWidth: 2,
        markerSize: 48,
        clampToGround: true
      });

      this.viewer.dataSources.add(this.dataSource);

      // Process each feature
      const entities = this.dataSource.entities.values;
      for (const entity of entities) {
        this.processPlotEntity(entity);
      }

      this.isLoaded = true;
      Logger.info('Cesium', `[ProjectLayer] Loaded ${entities.length} plots`);
      return true;

    } catch (err) {
      Logger.error('Cesium', '[ProjectLayer] Error loading geometry:', err);
      return false;
    }
  }

  /**
   * Fetch GeoJSON from URL
   */
  async fetchGeoJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    } catch (err) {
      throw new Error(`Failed to fetch GeoJSON: ${err.message}`);
    }
  }

  /**
   * Process individual plot entity
   */
  processPlotEntity(entity) {
    try {
      const props = entity.properties;
      const plotId = props?.plot_number || props?.id || entity.id;
      let status = props?.status?.getValue ? props.status.getValue(Cesium.JulianDate.now()) : (props?.status || 'available');
      if (typeof status === 'string') {
        status = status.toLowerCase().trim();
        if (status === 'availble') status = 'available'; // Fix typo from geojson
      }

      // Create polygon entity with proper styling
      const newEntity = this.createPlotEntity(plotId, entity, status);

      // Register with tracker
      if (this.plotTracker) {
        this.plotTracker.registerPlotEntity(plotId, newEntity);
      }

      // Store reference
      this.entities.set(plotId, newEntity);

      // Remove original entity
      this.dataSource.entities.remove(entity);

    } catch (err) {
      Logger.warn('Cesium', '[ProjectLayer] Error processing entity:', err);
    }
  }

  /**
   * Create styled polygon entity for plot
   */
  createPlotEntity(plotId, geoJsonEntity, status) {
    const style = this.getStyleForStatus(status);

    // Extract coordinates from GeoJSON geometry
    let coordinates = [];
    if (geoJsonEntity.polygon) {
      // Cesium GeoJSON has polygon property
      coordinates = geoJsonEntity.polygon.getValue(Cesium.JulianDate.now())
        ?.positionsScratchCompressed || [];
    }

    // Create polygon hierarchy
    const hierarchy = this.createPolygonHierarchy(geoJsonEntity);

    const entity = this.viewer.entities.add({
      id: plotId,
      name: `Plot ${plotId}`,
      position: geoJsonEntity.position,
      polygon: {
        hierarchy: hierarchy,
        material: new Cesium.ColorMaterialProperty(
          Cesium.Color.fromCssColorString(style.color)
            .withAlpha(style.opacity)
        ),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(style.outlineColor),
        outlineWidth: style.outlineWidth,
        extrudedHeight: style.extrudedHeight,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      },
      properties: {
        plot_id: plotId,
        status: status,
        size: geoJsonEntity.properties?.size,
        developer: 'GV Infra Projects'
      }
    });

    // Store styling for later reference
    entity._plotStyle = style;
    entity._plotStatus = status;

    return entity;
  }

  /**
   * Create polygon hierarchy from GeoJSON entity
   */
  createPolygonHierarchy(geoJsonEntity) {
    try {
      // Try to extract coordinates from various possible structures
      let coordinates = [];

      if (geoJsonEntity.polygon) {
        const polygon = geoJsonEntity.polygon.getValue(Cesium.JulianDate.now());
        if (polygon && polygon.positionsScratchCompressed) {
          coordinates = polygon.positionsScratchCompressed;
        }
      }

      if (coordinates.length === 0 && geoJsonEntity.position) {
        // Fallback: use single point
        return new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromArray([
            geoJsonEntity.position.x,
            geoJsonEntity.position.y,
            geoJsonEntity.position.z
          ])
        );
      }

      return new Cesium.PolygonHierarchy(coordinates);

    } catch (err) {
      Logger.warn('Cesium', '[ProjectLayer] Error creating polygon hierarchy:', err);
      // Return minimal valid hierarchy
      return new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray([80.14, 17.24, 80.15, 17.24, 80.15, 17.25])
      );
    }
  }

  /**
   * Get style config for plot status
   */
  getStyleForStatus(status) {
    const normalized = status?.toLowerCase() ?? 'available';
    return this.styleConfig[normalized] || this.styleConfig.available;
  }

  /**
   * Update plot status and restyle
   * @param {string} plotId - Plot ID
   * @param {string} status - New status: 'available', 'reserved', 'sold'
   */
  updatePlotStatus(plotId, status) {
    const entity = this.entities.get(plotId);
    if (!entity || !entity.polygon) {
      Logger.warn('Cesium', `[ProjectLayer] Plot not found: ${plotId}`);
      return false;
    }

    const style = this.getStyleForStatus(status);

    // Update styling
    entity.polygon.material = new Cesium.ColorMaterialProperty(
      Cesium.Color.fromCssColorString(style.color)
        .withAlpha(style.opacity)
    );
    entity.polygon.outlineColor = Cesium.Color.fromCssColorString(style.outlineColor);
    entity.polygon.outlineWidth = style.outlineWidth;

    // Update stored status
    entity._plotStatus = status;
    if (entity.properties) {
      entity.properties.status = status;
    }

    Logger.info('Cesium', `[ProjectLayer] Updated ${plotId} status to ${status}`);
    return true;
  }

  /**
   * Update styling for all plots
   */
  updateAllPlotsStyling() {
    for (const [plotId, entity] of this.entities) {
      const status = entity._plotStatus || 'available';
      this.updatePlotStatus(plotId, status);
    }
  }

  /**
   * Hide/show project layer
   */
  setVisibility(visible) {
    if (this.dataSource) {
      this.dataSource.show = visible;
    }

    for (const [_, entity] of this.entities) {
      entity.show = visible;
    }

    Logger.info('Cesium', `[ProjectLayer] Visibility set to: ${visible}`);
  }

  /**
   * Filter plots by status
   * @param {string} status - Status to show: 'available', 'reserved', 'sold', or 'all'
   */
  filterByStatus(status) {
    for (const [_, entity] of this.entities) {
      const entityStatus = entity._plotStatus || 'available';
      entity.show = (status === 'all') || (entityStatus === status);
    }

    Logger.info('Cesium', `[ProjectLayer] Filtered to status: ${status}`);
  }

  /**
   * Get plot entity
   */
  getPlotEntity(plotId) {
    return this.entities.get(plotId);
  }

  /**
   * Get all plot entities
   */
  getAllPlotEntities() {
    return Array.from(this.entities.values());
  }

  /**
   * Get plot statistics
   */
  getPlotStats() {
    const stats = {
      total: this.entities.size,
      available: 0,
      reserved: 0,
      sold: 0
    };

    for (const [_, entity] of this.entities) {
      const status = entity._plotStatus || 'available';
      if (status in stats) {
        stats[status]++;
      }
    }

    return stats;
  }

  /**
   * Clear all project geometry
   */
  clear() {
    if (this.dataSource) {
      this.viewer.dataSources.remove(this.dataSource);
    }

    this.entities.clear();
    this.isLoaded = false;
    Logger.info('Cesium', '[ProjectLayer] Cleared all geometry');
  }

  /**
   * Reload geometry
   */
  async reload() {
    if (!this.geometryUrl) {
      Logger.error('Cesium', '[ProjectLayer] No geometry URL set');
      return false;
    }

    this.clear();
    return this.loadProjectGeometry(this.geometryUrl);
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.ProjectLayer = ProjectLayer;
}
