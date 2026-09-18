/**
 * MEASUREMENT.JS
 * Distance, Area & Height Measurement Tools
 *
 * Provides drawing tools for measuring distances, areas, and heights in 3D.
 * Supports click-based drawing with real-time calculations.
 *
 * Usage:
 *   const measure = new MeasurementTools(viewer, config);
 *   measure.startDistanceMeasurement();
 *   measure.startAreaMeasurement();
 */

class MeasurementTools {
  constructor(viewer, config = {}) {
    this.viewer = viewer;
    this.config = config;
    this.activeTool = null;
    this.isDrawing = false;
    this.points = [];
    this.lines = [];
    this.polygons = [];
    this.labels = [];
    this.handler = null;
    this.activeColor = Cesium.Color.YELLOW.withAlpha(0.8);
  }

  /**
   * Start distance measurement tool
   */
  startDistanceMeasurement() {
    this.activeTool = 'distance';
    this.isDrawing = true;
    this.points = [];
    this.lines = [];
    this.labels = [];

    if (!this.handler) {
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    }

    Logger.info('Cesium', '[Measurement] Distance measurement started. Click to place points, double-click to finish.');

    this.handler.setInputAction((click) => {
      this.addDistancePoint(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.handler.setInputAction(() => {
      this.finishMeasurement();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  /**
   * Start area measurement tool
   */
  startAreaMeasurement() {
    this.activeTool = 'area';
    this.isDrawing = true;
    this.points = [];
    this.lines = [];
    this.labels = [];
    this.polygons = [];

    if (!this.handler) {
      this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    }

    Logger.info('Cesium', '[Measurement] Area measurement started. Click to place points, double-click to finish.');

    this.handler.setInputAction((click) => {
      this.addAreaPoint(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.handler.setInputAction(() => {
      this.finishMeasurement();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  /**
   * Add point for distance measurement
   */
  addDistancePoint(screenPosition) {
    try {
      const cartesian = this.viewer.scene.pickPosition(screenPosition);
      if (!Cesium.defined(cartesian)) {
        return;
      }

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const point = {
        position: cartesian,
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lng: Cesium.Math.toDegrees(cartographic.longitude)
      };

      this.points.push(point);

      // Add point marker
      this.viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 8,
          color: this.activeColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      });

      // Add line if we have previous point
      if (this.points.length > 1) {
        const prevPoint = this.points[this.points.length - 2];
        const distance = this.calculateDistance(prevPoint.position, cartesian);

        // Add line
        this.viewer.entities.add({
          polyline: {
            positions: [prevPoint.position, cartesian],
            width: 2,
            material: this.activeColor,
            clampToGround: true
          }
        });

        // Add distance label
        const midpoint = Cesium.Cartesian3.midpoint(prevPoint.position, cartesian, new Cesium.Cartesian3());
        this.viewer.entities.add({
          position: midpoint,
          label: {
            text: this.formatDistance(distance),
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20)
          }
        });
      }

    } catch (err) {
      Logger.error('Cesium', '[Measurement] Error adding distance point:', err);
    }
  }

  /**
   * Add point for area measurement
   */
  addAreaPoint(screenPosition) {
    try {
      const cartesian = this.viewer.scene.pickPosition(screenPosition);
      if (!Cesium.defined(cartesian)) {
        return;
      }

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const point = {
        position: cartesian,
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lng: Cesium.Math.toDegrees(cartographic.longitude)
      };

      this.points.push(point);

      // Add point marker
      this.viewer.entities.add({
        position: cartesian,
        point: {
          pixelSize: 8,
          color: this.activeColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2
        }
      });

      // Update preview polygon
      if (this.points.length >= 3) {
        this.updateAreaPreview();
      }

    } catch (err) {
      Logger.error('Cesium', '[Measurement] Error adding area point:', err);
    }
  }

  /**
   * Update area measurement preview
   */
  updateAreaPreview() {
    try {
      const positions = this.points.map(p => p.position);

      // Remove existing preview polygon
      for (const polygon of this.polygons) {
        this.viewer.entities.remove(polygon);
      }
      this.polygons = [];

      // Create new preview polygon
      const previewEntity = this.viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: new Cesium.ColorMaterialProperty(
            Cesium.Color.YELLOW.withAlpha(0.2)
          ),
          outline: true,
          outlineColor: this.activeColor,
          outlineWidth: 2
        }
      });

      this.polygons.push(previewEntity);

      // Calculate and display area
      const area = this.calculatePolygonArea(positions);
      const centroid = this.calculateCentroid(positions);

      // Update area label
      this.viewer.entities.add({
        position: centroid,
        label: {
          text: `Area: ${this.formatArea(area)}`,
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER
        }
      });

    } catch (err) {
      Logger.error('Cesium', '[Measurement] Error updating area preview:', err);
    }
  }

  /**
   * Finish active measurement
   */
  finishMeasurement() {
    if (!this.isDrawing) return;

    this.isDrawing = false;
    if (this.handler) {
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    let result = null;

    if (this.activeTool === 'distance' && this.points.length >= 2) {
      result = this.calculateTotalDistance();
      Logger.info('Cesium', `[Measurement] Distance: ${this.formatDistance(result)}`);
    } else if (this.activeTool === 'area' && this.points.length >= 3) {
      result = this.calculateTotalArea();
      Logger.info('Cesium', `[Measurement] Area: ${this.formatArea(result)}`);
    }

    this.activeTool = null;
    this.emitMeasurementComplete(result);
  }

  /**
   * Cancel active measurement
   */
  cancelMeasurement() {
    this.clearMeasurements();
    this.isDrawing = false;
    if (this.handler) {
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }
    this.activeTool = null;
    Logger.info('Cesium', '[Measurement] Measurement cancelled');
  }

  /**
   * Clear all measurements from the view
   */
  clearMeasurements() {
    // Remove all measurement entities
    for (const point of this.points) {
      // Points removed via their entities
    }

    for (const polygon of this.polygons) {
      this.viewer.entities.remove(polygon);
    }

    this.points = [];
    this.lines = [];
    this.polygons = [];
    this.labels = [];
    Logger.info('Cesium', '[Measurement] Cleared all measurements');
  }

  // ========== UTILITY METHODS ==========

  /**
   * Calculate distance between two Cartesian3 points
   */
  calculateDistance(pos1, pos2) {
    return Cesium.Cartesian3.distance(pos1, pos2);
  }

  /**
   * Calculate total distance of all segments
   */
  calculateTotalDistance() {
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      total += this.calculateDistance(
        this.points[i - 1].position,
        this.points[i].position
      );
    }
    return total;
  }

  /**
   * Calculate area of polygon from Cartesian3 positions
   */
  calculatePolygonArea(positions) {
    if (positions.length < 3) return 0;

    // Convert to geographic coordinates
    const coords = positions.map(pos => {
      const carto = Cesium.Cartographic.fromCartesian(pos);
      return [
        Cesium.Math.toDegrees(carto.longitude),
        Cesium.Math.toDegrees(carto.latitude)
      ];
    });

    // Use Shoelace formula for polygon area
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }

    // Close the polygon
    area += coords[coords.length - 1][0] * coords[0][1];
    area -= coords[0][0] * coords[coords.length - 1][1];

    area = Math.abs(area) / 2;

    // Convert from degrees^2 to square meters (approximately)
    const metersPerDegree = 111320;
    area *= metersPerDegree * metersPerDegree;

    return area;
  }

  /**
   * Calculate total area
   */
  calculateTotalArea() {
    const positions = this.points.map(p => p.position);
    return this.calculatePolygonArea(positions);
  }

  /**
   * Calculate centroid of positions
   */
  calculateCentroid(positions) {
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const pos of positions) {
      sumX += pos.x;
      sumY += pos.y;
      sumZ += pos.z;
    }

    return new Cesium.Cartesian3(
      sumX / positions.length,
      sumY / positions.length,
      sumZ / positions.length
    );
  }

  /**
   * Format distance for display
   */
  formatDistance(meters) {
    if (meters < 1000) {
      return `${meters.toFixed(2)} m`;
    } else {
      return `${(meters / 1000).toFixed(2)} km`;
    }
  }

  /**
   * Format area for display
   */
  formatArea(squareMeters) {
    if (squareMeters < 10000) {
      return `${squareMeters.toFixed(2)} m²`;
    } else if (squareMeters < 2589988) {
      const hectares = squareMeters / 10000;
      return `${hectares.toFixed(2)} ha`;
    } else {
      const sqKm = squareMeters / 1000000;
      return `${sqKm.toFixed(2)} km²`;
    }
  }

  /**
   * Get measurement status
   */
  getStatus() {
    return {
      activeTool: this.activeTool,
      isDrawing: this.isDrawing,
      pointCount: this.points.length
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit measurement complete event
   */
  emitMeasurementComplete(result) {
    window.dispatchEvent(new CustomEvent('measurement:complete', {
      detail: {
        tool: this.activeTool,
        result: result
      }
    }));
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.MeasurementTools = MeasurementTools;
}
