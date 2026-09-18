/**
 * CAMERA-DIRECTOR.JS
 * Camera Animation & Transition Manager
 *
 * Handles camera movements: flyTo, pan, zoom, cinematic transitions.
 * Provides easing functions and smooth animation chains.
 *
 * Usage:
 *   const director = new CameraDirector(viewer, config);
 *   director.flyToPlot(plotId); // Animate to specific plot
 *   director.zoomToLocation([lng, lat], 500); // Zoom to point
 *   director.startCinematicTour(plotIds); // Guided tour
 */

class CameraDirector {
  constructor(viewer, config = {}) {
    this.viewer = viewer;
    this.config = {
      defaultDuration: 2.5,
      defaultHeight: 450,
      defaultPitch: -35,
      defaultHeading: 20,
      ...config
    };
    this.isAnimating = false;
    this.animationQueue = [];
    this.tourActive = false;
  }

  /**
   * Fly to a specific geographic location
   * @param {number} latitude - Target latitude
   * @param {number} longitude - Target longitude
   * @param {number} height - Height above ground (meters)
   * @param {number} duration - Animation duration (seconds)
   * @param {Object} options - Additional Cesium camera options
   */
  async flyToLocation(latitude, longitude, height = 450, duration = 2.5, options = {}) {
    if (!this.viewer) return;

    return new Promise((resolve, reject) => {
      try {
        this.isAnimating = true;

        const destination = Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          height
        );

        const orientation = {
          heading: Cesium.Math.toRadians(options.heading ?? this.config.defaultHeading),
          pitch: Cesium.Math.toRadians(options.pitch ?? this.config.defaultPitch),
          roll: Cesium.Math.toRadians(options.roll ?? 0)
        };

        this.viewer.camera.flyTo({
          destination,
          orientation,
          duration: Math.max(duration, 0.5),
          easingFunction: options.easing || Cesium.EasingFunction.LINEAR_NONE,
          complete: () => {
            this.isAnimating = false;
            resolve();
          },
          cancel: () => {
            this.isAnimating = false;
            reject(new Error('Camera animation cancelled'));
          }
        });

      } catch (err) {
        this.isAnimating = false;
        Logger.error('Cesium', '[CameraDirector] Error flying to location:', err);
        reject(err);
      }
    });
  }

  /**
   * Fly to a plot by its bounding box
   * @param {Object} plot - Plot object with GeoJSON geometry
   * @param {number} duration - Animation duration
   */
  async flyToPlot(plot, duration = 2.5) {
    if (!plot || !plot.coordinates) {
      Logger.error('Cesium', '[CameraDirector] Invalid plot object');
      return;
    }

    try {
      // Calculate centroid and bounding box
      const bbox = this.calculateBoundingBox(plot.coordinates);
      const centroid = this.calculateCentroid(plot.coordinates);

      // Calculate appropriate height based on bounding box
      const width = bbox.maxLng - bbox.minLng;
      const height = this.calculateHeightForBoundingBox(width);

      await this.flyToLocation(
        centroid.lat,
        centroid.lng,
        height,
        duration,
        {
          pitch: -35,
          heading: 20
        }
      );

    } catch (err) {
      Logger.error('Cesium', '[CameraDirector] Error flying to plot:', err);
    }
  }

  /**
   * Zoom to a location with automatic height calculation
   * @param {number[]} coordinate - [longitude, latitude]
   * @param {number} zoomLevel - 1-28 (higher = closer)
   * @param {number} duration - Animation duration
   */
  async zoomToLocation(coordinate, zoomLevel = 15, duration = 1.5) {
    const height = this.calculateHeightFromZoom(zoomLevel);
    await this.flyToLocation(
      coordinate[1],
      coordinate[0],
      height,
      duration
    );
  }

  /**
   * Pan camera without changing altitude (smooth pan)
   * @param {number} deltaLat - Latitude offset
   * @param {number} deltaLng - Longitude offset
   * @param {number} duration - Pan duration
   */
  async panCamera(deltaLat, deltaLng, duration = 1.0) {
    const current = Cesium.Cartesian3.toDegrees(this.viewer.camera.position);
    const newLat = current.latitude + deltaLat;
    const newLng = current.longitude + deltaLng;

    await this.flyToLocation(
      newLat,
      newLng,
      current.height,
      duration,
      {
        heading: this.viewer.camera.heading,
        pitch: this.viewer.camera.pitch
      }
    );
  }

  /**
   * Rotate camera around plot (cinematic orbit)
   * @param {number[]} centerCoord - [lng, lat] center point
   * @param {number} radius - Orbit radius in meters
   * @param {number} rotations - Number of complete rotations
   * @param {number} totalDuration - Total animation time
   */
  async orbitPlot(centerCoord, radius = 300, rotations = 1, totalDuration = 10) {
    if (!this.viewer) return;

    const steps = 60; // Animation frames
    const totalSteps = steps * rotations;
    const stepDuration = totalDuration / totalSteps;

    for (let i = 0; i < totalSteps; i++) {
      if (!this.isAnimating) break;

      const angle = (i / totalSteps) * Math.PI * 2;
      const offsetLat = (radius / 111000) * Math.cos(angle);
      const offsetLng = (radius / (111000 * Math.cos(
        Cesium.Math.toRadians(centerCoord[1])
      ))) * Math.sin(angle);

      await this.flyToLocation(
        centerCoord[1] + offsetLat,
        centerCoord[0] + offsetLng,
        this.config.defaultHeight,
        stepDuration,
        {
          heading: angle,
          pitch: this.config.defaultPitch
        }
      );
    }
  }

  /**
   * Start a cinematic tour through multiple plots
   * @param {Array} plotIds - Array of plot IDs or plot objects
   * @param {Object} options - Tour options (speed, dwell time, orbit)
   */
  async startCinematicTour(plotIds, options = {}) {
    const defaults = {
      speed: 1.0, // 1.0 = normal, 0.5 = slow, 2.0 = fast
      dwellTime: 2.0, // Seconds to spend at each plot
      orbitEachPlot: true,
      orbitRadius: 300,
      transitionDuration: 2.5
    };

    const tourOptions = { ...defaults, ...options };

    if (this.tourActive) {
      Logger.warn('Cesium', '[CameraDirector] Tour already in progress');
      return;
    }

    this.tourActive = true;

    try {
      for (const plotId of plotIds) {
        if (!this.tourActive) break;

        const plot = this.resolvePlotObject(plotId);
        if (!plot) continue;

        // Fly to plot
        await this.flyToPlot(plot, tourOptions.transitionDuration / tourOptions.speed);

        // Optional: Orbit around plot
        if (tourOptions.orbitEachPlot) {
          const centroid = this.calculateCentroid(plot.coordinates);
          await this.orbitPlot(
            [centroid.lng, centroid.lat],
            tourOptions.orbitRadius,
            0.5, // Half rotation
            (tourOptions.dwellTime / tourOptions.speed)
          );
        } else {
          // Dwell at current location
          await this.sleep(tourOptions.dwellTime * 1000 / tourOptions.speed);
        }
      }

      Logger.info('Cesium', '[CameraDirector] Tour completed');

    } catch (err) {
      Logger.error('Cesium', '[CameraDirector] Tour error:', err);
    } finally {
      this.tourActive = false;
    }
  }

  /**
   * Stop active animation or tour
   */
  stopAnimation() {
    this.isAnimating = false;
    this.tourActive = false;
    if (this.viewer && this.viewer.camera) {
      this.viewer.camera.cancelFlight();
    }
  }

  /**
   * Reset camera to default home position
   */
  async resetCamera(duration = 2.5) {
    await this.flyToLocation(
      this.config.defaultCenter?.[1] ?? 17.24767,
      this.config.defaultCenter?.[0] ?? 80.14368,
      this.config.defaultHeight,
      duration
    );
  }

  // ========== UTILITY METHODS ==========

  /**
   * Calculate bounding box for a polygon
   */
  calculateBoundingBox(coordinates) {
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const coord of coordinates) {
      const lng = coord[0];
      const lat = coord[1];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }

    return { minLat, maxLat, minLng, maxLng };
  }

  /**
   * Calculate centroid (center point) of polygon
   */
  calculateCentroid(coordinates) {
    let sumLat = 0, sumLng = 0;
    for (const coord of coordinates) {
      sumLng += coord[0];
      sumLat += coord[1];
    }
    return {
      lat: sumLat / coordinates.length,
      lng: sumLng / coordinates.length
    };
  }

  /**
   * Calculate camera height based on bounding box width
   */
  calculateHeightForBoundingBox(widthDegrees) {
    // 1 degree ≈ 111 km
    const widthKm = widthDegrees * 111;
    const heightKm = widthKm * 1.2; // Add 20% margin

    // Convert to meters; minimum 200m, maximum 10000m
    const height = heightKm * 1000;
    return Math.max(200, Math.min(height, 10000));
  }

  /**
   * Calculate height from zoom level (Google Maps zoom convention)
   * Zoom 1 = world, Zoom 20 = street level
   */
  calculateHeightFromZoom(zoomLevel) {
    // Empirical formula for Cesium height based on zoom
    const maxZoom = 28;
    const normalizedZoom = Math.max(1, Math.min(zoomLevel, maxZoom));
    const height = 40075000 / (Math.pow(2, normalizedZoom) * 256) * 1.5;
    return Math.max(10, height);
  }

  /**
   * Resolve plot object from ID or return as-is if already object
   */
  resolvePlotObject(plotId) {
    if (typeof plotId === 'object' && plotId.coordinates) {
      return plotId;
    }

    if (typeof plotId === 'string' && window.GV_DATA) {
      const allPlots = window.GV_DATA.getAdminParcels?.();
      return allPlots?.find(p => p.id === plotId || p.title === plotId);
    }

    return null;
  }

  /**
   * Sleep utility for async delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get easing function by name
   */
  getEasingFunction(name) {
    const easingFunctions = {
      linear: Cesium.EasingFunction.LINEAR_NONE,
      easeInQuad: Cesium.EasingFunction.QUADRATIC_IN,
      easeOutQuad: Cesium.EasingFunction.QUADRATIC_OUT,
      easeInOutQuad: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      easeInCubic: Cesium.EasingFunction.CUBIC_IN,
      easeOutCubic: Cesium.EasingFunction.CUBIC_OUT,
      easeInOutCubic: Cesium.EasingFunction.CUBIC_IN_OUT
    };

    return easingFunctions[name] || Cesium.EasingFunction.LINEAR_NONE;
  }

  /**
   * Get animation status
   */
  getStatus() {
    return {
      isAnimating: this.isAnimating,
      tourActive: this.tourActive,
      queueLength: this.animationQueue.length
    };
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.CameraDirector = CameraDirector;
}
