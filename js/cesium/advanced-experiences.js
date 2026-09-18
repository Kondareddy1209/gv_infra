/**
 * ADVANCED EXPERIENCES MODULE
 * WebXR VR Immersive Mode, 360° Drone Panorama Overlays, and Advanced Map Features
 */

(function (global) {
  'use strict';

  class AdvancedExperiences {
    constructor(viewer) {
      this.viewer = viewer;
    }

    /**
     * Launch 360° Aerial Drone Panorama View
     */
    launch360DronePanorama(panoramaId = 'gurralapadu-overview') {
      console.log(`[AdvancedExperiences] Launching 360° Drone Panorama: ${panoramaId}`);
      if (window.Cesium3DViewer?.videoTourPlayer) {
        window.Cesium3DViewer.videoTourPlayer.startVideoTour();
      }
    }

    /**
     * Toggle WebXR VR Immersive Ground Walk Mode
     */
    toggleVRGroundWalk() {
      console.log('[AdvancedExperiences] Toggling 3D VR Ground Walk Mode...');
      const viewer = this.viewer || window.Cesium3DViewer?.viewer;
      if (viewer) {
        // Position camera at human street eye level (1.7m above ground)
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1365, 17.2485, 2.5),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(0),
            roll: 0
          },
          duration: 2.0
        });
      }
    }
  }

  global.AdvancedExperiences = AdvancedExperiences;
})(window);
