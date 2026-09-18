/**
 * SCENE CONTEXT SERIALIZER FOR AI (OMNIROUTE INTEGRATION)
 * Captures 3D map telemetry, selected plot information, camera position,
 * and spatial constraints to feed context into OmniRoute AI models.
 */

(function (global) {
  'use strict';

  class SceneContext {
    constructor(viewer) {
      this.viewer = viewer;
    }

    /**
     * Get snapshot of current 3D map scene context for AI
     */
    getSceneSnapshot() {
      const viewer = this.viewer || window.Cesium3DViewer?.viewer;
      if (!viewer) {
        return {
          project: "Stambadri Enclave, Gurralapadu, Khammam",
          camera: { altitude: 450, latitude: 17.2485, longitude: 80.1365 },
          selectedPlot: null,
          totalPlots: 302
        };
      }

      const camera = viewer.camera;
      const cartographic = Cesium.Cartographic.fromCartesian(camera.position);

      const selectedPlot = window.Cesium3DViewer?.plotTracker?.getSelectedPlot?.() || null;

      return {
        project: "Stambadri Enclave, Gurralapadu, Khammam-Kodada Highway, Telangana",
        location: "Khammam, Telangana",
        dtcpSanctionNo: "10482/2026/H",
        camera: {
          latitude: Number((Cesium.Math.toDegrees(cartographic.latitude)).toFixed(6)),
          longitude: Number((Cesium.Math.toDegrees(cartographic.longitude)).toFixed(6)),
          altitudeMeters: Math.round(cartographic.height),
          pitchDegrees: Math.round(Cesium.Math.toDegrees(camera.pitch)),
          headingDegrees: Math.round(Cesium.Math.toDegrees(camera.heading))
        },
        selectedPlot: selectedPlot ? {
          id: selectedPlot.id,
          plotNumber: selectedPlot.plotNumber || selectedPlot.id,
          status: selectedPlot.status || 'available',
          sizeSqYards: selectedPlot.size || 250,
          facing: selectedPlot.facing || 'East',
          priceEstimated: selectedPlot.price || '₹34.5 Lakhs'
        } : null,
        totalPlots: 302,
        availablePlots: 28,
        avgPricePerSqYard: 18500
      };
    }
  }

  global.SceneContext = SceneContext;
})(window);
