/**
 * CESIUM-INIT.JS
 * Initializes the Cesium 3D Viewer on page load
 *
 * Runs after all cesium modules are loaded and DOM is ready.
 * Exposes the viewer globally as window.Cesium3DViewer
 */

(function initCesium3D() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCesium3D);
    return;
  }

  // Check if container exists - Cesium is initialized on-demand in modal
  const container = document.getElementById('cesium-modal-canvas');
  if (!container) {
    console.log('[Cesium Init] Cesium will be initialized on-demand when 3D modal opens');
    return;
  }

  // Check if CesiumViewer3D is loaded
  if (typeof CesiumViewer3D === 'undefined') {
    console.error('[Cesium Init] CesiumViewer3D class not found. Make sure cesium-3d-core.js is loaded.');
    return;
  }

  // Check if Cesium is loaded
  if (typeof Cesium === 'undefined') {
    console.error('[Cesium Init] CesiumJS library not found');
    return;
  }

  // Create and initialize the viewer
  (async () => {
    try {
      Logger.info('Cesium Init', 'Starting Cesium 3D viewer initialization...');

      // Create viewer instance
      const viewer = new CesiumViewer3D('cesium-container');

      // Initialize
      const success = await viewer.initialize();

      if (success) {
        // Expose globally for other scripts
        window.Cesium3DViewer = viewer;

        Logger.info('Cesium Init', 'Cesium 3D viewer initialized successfully');

        // Initialize Khammam Reality 3D (enhanced visualization with streets, buildings, landmarks)
        try {
          if (typeof KhammamReality3D !== 'undefined') {
            console.log('%c🌍 Initializing Khammam Reality 3D...', 'color: #10b981; font-weight: bold;');
            const reality3d = new KhammamReality3D(viewer.viewer);
            await reality3d.initialize();

            // Create control panel
            if (typeof KhammamControlPanel !== 'undefined') {
              const controlPanel = new KhammamControlPanel(viewer.viewer, reality3d);
              controlPanel.createPanel();
            }

            window.Cesium3DReality = reality3d;
            console.log('%c✓ Khammam Reality 3D Ready', 'color:#10b981; font-weight:bold;');
          }
        } catch (err) {
          console.warn('⚠️  Khammam Reality 3D not available:', err.message);
        }

        // Emit ready event
        window.dispatchEvent(new CustomEvent('cesium3d:ready', {
          detail: { viewer }
        }));

        // Setup keyboard shortcuts
        setupKeyboardShortcuts(viewer);

        console.log('%c✓ Cesium 3D Viewer Ready', 'color:green; font-weight:bold;');
      } else {
        Logger.error('Cesium Init', 'Cesium 3D viewer initialization failed');
      }
    } catch (err) {
      Logger.error('Cesium Init', 'Initialization error:', err);
      console.error('[Cesium Init Error]', err);
    }
  })();

  /**
   * Setup keyboard shortcuts for the viewer
   */
  function setupKeyboardShortcuts(viewer) {
    document.addEventListener('keydown', (e) => {
      // Escape: Deselect current plot
      if (e.key === 'Escape') {
        if (viewer.plotTracker) {
          viewer.plotTracker.deselectPlot();
        }
      }

      // Space: Play/pause tour
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        if (viewer.cinematicTour) {
          const status = viewer.cinematicTour.getStatus();
          if (status?.isPlaying && !status?.isPaused) {
            viewer.cinematicTour.pause();
          } else if (status?.isPaused) {
            viewer.cinematicTour.resume();
          }
        }
      }

      // R: Reset camera
      if (e.key === 'r' || e.key === 'R') {
        if (viewer.cameraDirector) {
          viewer.cameraDirector.resetCamera();
        }
      }

      // M: Start measurement
      if (e.key === 'm' || e.key === 'M') {
        if (viewer.measurementTools) {
          window.dispatchEvent(new CustomEvent('measurement:start-distance'));
        }
      }
    });
  }
})();
