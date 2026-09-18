/**
 * CINEMATIC-TOUR.JS
 * Guided Flyover Experiences
 *
 * Manages pre-configured cinematic tours through the project.
 * Tours can be triggered by plot selection, defined as routes, or generated dynamically.
 *
 * Usage:
 *   const tour = new CinematicTour(cameraDirector, config);
 *   tour.playPresetTour('project-overview'); // Play preset
 *   tour.createDynamicTour([plotA, plotB, plotC]); // Custom tour
 *   tour.pause(); tour.resume(); tour.stop();
 */

class CinematicTour {
  constructor(cameraDirector, config = {}) {
    this.cameraDirector = cameraDirector;
    this.config = config;
    this.currentTour = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentStepIndex = 0;
    this.tourSteps = [];
    this.presetTours = this.initializePresetTours();
  }

  /**
   * Initialize predefined cinematic tours
   */
  initializePresetTours() {
    return {
      'project-overview': {
        name: 'Project Overview',
        description: 'Cinematic flyover of the entire Stambadri Enclave project',
        steps: [
          {
            type: 'location',
            lat: 17.2475,
            lng: 80.1435,
            height: 1000,
            duration: 3,
            pitch: -35,
            heading: 0,
            annotation: 'Welcome to Stambadri Enclave'
          },
          {
            type: 'location',
            lat: 17.2480,
            lng: 80.1440,
            height: 800,
            duration: 4,
            pitch: -40,
            heading: 90,
            annotation: 'Exploring the property boundaries'
          },
          {
            type: 'orbit',
            lat: 17.2475,
            lng: 80.1435,
            height: 600,
            radius: 400,
            rotations: 1.5,
            duration: 8,
            annotation: 'Detailed view of the project layout'
          },
          {
            type: 'location',
            lat: 17.2475,
            lng: 80.1435,
            height: 450,
            duration: 2,
            pitch: -35,
            heading: 20,
            annotation: 'End of tour'
          }
        ]
      },
      'highlights-tour': {
        name: 'Key Features Tour',
        description: 'Spotlight view of infrastructure and amenities',
        steps: [
          {
            type: 'location',
            lat: 17.2475,
            lng: 80.1435,
            height: 600,
            duration: 2.5,
            pitch: -35,
            heading: 0,
            annotation: 'Main entrance area'
          },
          {
            type: 'location',
            lat: 17.2485,
            lng: 80.1425,
            height: 500,
            duration: 2.5,
            pitch: -30,
            heading: 45,
            annotation: 'Road network and infrastructure'
          },
          {
            type: 'location',
            lat: 17.2465,
            lng: 80.1445,
            height: 500,
            duration: 2.5,
            pitch: -30,
            heading: -45,
            annotation: 'Parks and open spaces'
          }
        ]
      }
    };
  }

  /**
   * Play a preset tour by name
   * @param {string} tourName - Name of preset tour
   * @param {Object} options - Override options
   */
  async playPresetTour(tourName, options = {}) {
    const preset = this.presetTours[tourName];
    if (!preset) {
      Logger.error('Cesium', `[CinematicTour] Unknown preset tour: ${tourName}`);
      return false;
    }

    this.currentTour = {
      name: preset.name,
      description: preset.description,
      steps: preset.steps
    };

    return this.play(options);
  }

  /**
   * Create a dynamic tour from plot array
   * @param {Array} plots - Array of plot objects or IDs
   * @param {Object} options - Tour configuration
   */
  async createDynamicTour(plots, options = {}) {
    const defaults = {
      speed: 1.0,
      dwellTime: 2.0,
      orbitEachPlot: true,
      orbitRadius: 300,
      transitionDuration: 2.5
    };

    const tourConfig = { ...defaults, ...options };

    try {
      const steps = [];

      for (const plot of plots) {
        const plotObj = this.resolvePlot(plot);
        if (!plotObj) continue;

        // Fly-to step
        steps.push({
          type: 'plot',
          plotId: plotObj.id || plotObj.title,
          plotData: plotObj,
          duration: tourConfig.transitionDuration / tourConfig.speed
        });

        // Orbit step (optional)
        if (tourConfig.orbitEachPlot) {
          const centroid = this.calculateCentroid(plotObj.coordinates);
          steps.push({
            type: 'orbit',
            lat: centroid.lat,
            lng: centroid.lng,
            height: 450,
            radius: tourConfig.orbitRadius,
            rotations: 0.5,
            duration: tourConfig.dwellTime / tourConfig.speed
          });
        } else {
          // Dwell step
          steps.push({
            type: 'wait',
            duration: tourConfig.dwellTime / tourConfig.speed
          });
        }
      }

      this.currentTour = {
        name: `Custom Tour - ${plots.length} plots`,
        description: 'User-generated tour',
        steps: steps
      };

      return this.play();

    } catch (err) {
      Logger.error('Cesium', '[CinematicTour] Error creating dynamic tour:', err);
      return false;
    }
  }

  /**
   * Play current tour
   * @param {Object} options - Playback options (speed, loop, etc.)
   */
  async play(options = {}) {
    if (!this.currentTour) {
      Logger.error('Cesium', '[CinematicTour] No tour loaded');
      return false;
    }

    if (this.isPlaying) {
      Logger.warn('Cesium', '[CinematicTour] Tour already playing');
      return false;
    }

    const playbackOptions = {
      speed: 1.0,
      loop: false,
      startFromStep: 0,
      ...options
    };

    this.isPlaying = true;
    this.isPaused = false;
    this.currentStepIndex = playbackOptions.startFromStep;

    try {
      await this.executeSteps(playbackOptions);
      return true;
    } catch (err) {
      Logger.error('Cesium', '[CinematicTour] Error during playback:', err);
      return false;
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Execute tour steps sequentially
   */
  async executeSteps(options) {
    while (this.currentStepIndex < this.currentTour.steps.length) {
      if (!this.isPlaying) break;

      // Handle pause
      while (this.isPaused) {
        await this.sleep(100);
      }

      const step = this.currentTour.steps[this.currentStepIndex];
      await this.executeStep(step, options.speed);
      this.currentStepIndex++;

      // Emit progress event
      this.emitProgressEvent();
    }

    // Tour completed
    this.emitCompleteEvent();
  }

  /**
   * Execute a single tour step
   */
  async executeStep(step, speed = 1.0) {
    try {
      const adjustedDuration = step.duration / speed;

      switch (step.type) {
        case 'location':
          await this.cameraDirector.flyToLocation(
            step.lat,
            step.lng,
            step.height,
            adjustedDuration,
            { heading: step.heading ?? 0, pitch: step.pitch ?? -35 }
          );
          break;

        case 'plot':
          if (step.plotData) {
            await this.cameraDirector.flyToPlot(step.plotData, adjustedDuration);
          }
          break;

        case 'orbit':
          await this.cameraDirector.orbitPlot(
            [step.lng, step.lat],
            step.radius ?? 300,
            step.rotations ?? 1,
            adjustedDuration
          );
          break;

        case 'wait':
          await this.sleep(adjustedDuration * 1000);
          break;

        case 'annotation':
          this.showAnnotation(step.text, step.duration ?? 2);
          break;

        default:
          Logger.warn('Cesium', '[CinematicTour] Unknown step type:', step.type);
      }

    } catch (err) {
      Logger.error('Cesium', '[CinematicTour] Error executing step:', err);
    }
  }

  /**
   * Pause current tour
   */
  pause() {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true;
      this.cameraDirector.stopAnimation();
      Logger.info('Cesium', '[CinematicTour] Tour paused');
      this.emitPauseEvent();
      return true;
    }
    return false;
  }

  /**
   * Resume paused tour
   */
  resume() {
    if (this.isPaused && this.isPlaying) {
      this.isPaused = false;
      Logger.info('Cesium', '[CinematicTour] Tour resumed');
      this.emitResumeEvent();
      return true;
    }
    return false;
  }

  /**
   * Stop tour completely
   */
  stop() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.isPaused = false;
      this.cameraDirector.stopAnimation();
      this.currentStepIndex = 0;
      Logger.info('Cesium', '[CinematicTour] Tour stopped');
      this.emitStopEvent();
      return true;
    }
    return false;
  }

  /**
   * Jump to specific step in tour
   */
  async jumpToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.currentTour.steps.length) {
      Logger.error('Cesium', '[CinematicTour] Invalid step index');
      return false;
    }

    this.currentStepIndex = stepIndex;
    return true;
  }

  /**
   * Get available preset tours
   */
  getPresetTours() {
    return Object.entries(this.presetTours).map(([id, tour]) => ({
      id,
      name: tour.name,
      description: tour.description,
      stepCount: tour.steps.length
    }));
  }

  /**
   * Get current tour status
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTourName: this.currentTour?.name,
      currentStep: this.currentStepIndex,
      totalSteps: this.currentTour?.steps?.length ?? 0,
      progress: this.currentTour
        ? (this.currentStepIndex / this.currentTour.steps.length) * 100
        : 0
    };
  }

  // ========== UTILITY METHODS ==========

  /**
   * Calculate centroid of polygon
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
   * Resolve plot object from ID or object
   */
  resolvePlot(plot) {
    if (typeof plot === 'object' && plot.coordinates) {
      return plot;
    }

    if (typeof plot === 'string' && window.GV_DATA) {
      const allPlots = window.GV_DATA.getAdminParcels?.();
      return allPlots?.find(p => p.id === plot || p.title === plot);
    }

    return null;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show annotation on screen
   */
  showAnnotation(text, duration = 2) {
    // Emit event for UI to show annotation
    window.dispatchEvent(new CustomEvent('tour:annotation', {
      detail: { text, duration }
    }));
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit progress event
   */
  emitProgressEvent() {
    window.dispatchEvent(new CustomEvent('tour:progress', {
      detail: this.getStatus()
    }));
  }

  /**
   * Emit complete event
   */
  emitCompleteEvent() {
    window.dispatchEvent(new CustomEvent('tour:complete', {
      detail: { tourName: this.currentTour?.name }
    }));
  }

  /**
   * Emit pause event
   */
  emitPauseEvent() {
    window.dispatchEvent(new CustomEvent('tour:pause'));
  }

  /**
   * Emit resume event
   */
  emitResumeEvent() {
    window.dispatchEvent(new CustomEvent('tour:resume'));
  }

  /**
   * Emit stop event
   */
  emitStopEvent() {
    window.dispatchEvent(new CustomEvent('tour:stop'));
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.CinematicTour = CinematicTour;
}
