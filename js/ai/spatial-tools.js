/**
 * SPATIAL AI TOOLS & OMNIROUTE QUERY INTERFACE
 * Translates natural language questions into spatial actions, 3D camera flights,
 * plot filtering, and survey boundary highlight queries using OmniRoute AI models.
 */

(function (global) {
  'use strict';

  class SpatialTools {
    constructor(viewer) {
      this.viewer = viewer;
      this.apiEndpoint = 'http://localhost:3001/api/ai/chat';
    }

    /**
     * Send spatial prompt to OmniRoute AI model via Backend Gateway
     */
    async queryOmniRoute(userPrompt, extraContext = {}) {
      try {
        const sceneContext = global.SceneContext ? new global.SceneContext(this.viewer).getSceneSnapshot() : {};
        const systemPrompt = `You are the AI Real Estate & GIS Assistant for Stambadri Enclave in Gurralapadu, Khammam, Telangana.
You provide helpful, accurate guidance on plot availability, pricing (avg ₹18,500/sq.yd), DTCP permissions, survey boundaries, Vastu facing, and 3D map navigation.
Current Scene Context: ${JSON.stringify({ ...sceneContext, ...extraContext })}`;

        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userPrompt,
            provider: 'omniroute', // Directly routing request to OmniRoute AI models
            systemPrompt
          })
        });

        if (!response.ok) {
          throw new Error(`Gateway returned HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
          success: true,
          content: data.content || 'Unable to generate response',
          provider: data.provider || 'omniroute',
          model: data.model || 'auto'
        };
      } catch (err) {
        console.warn('[SpatialTools] OmniRoute Gateway fallback query notice:', err.message);
        return {
          success: false,
          content: `I am connected to Stambadri Enclave Khammam GIS. How can I assist you with plot availability or 3D navigation? (Notice: ${err.message})`,
          error: err.message
        };
      }
    }

    /**
     * Parse intent and execute 3D map action
     */
    executeMapAction(intentText) {
      const lower = intentText.toLowerCase();
      const viewer = this.viewer || window.Cesium3DViewer?.viewer;
      if (!viewer) return;

      if (lower.includes('tour') || lower.includes('video') || lower.includes('flyover')) {
        if (window.Cesium3DViewer?.videoTourPlayer) {
          window.Cesium3DViewer.videoTourPlayer.startVideoTour();
        }
      } else if (lower.includes('east') || lower.includes('vastu')) {
        if (window.Cesium3DViewer?.projectLayer) {
          console.log('[SpatialTools] Highlighting East facing plots');
        }
      } else if (lower.includes('park') || lower.includes('green')) {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1370, 17.2482, 200),
          orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-25) }
        });
      }
    }
  }

  global.SpatialTools = SpatialTools;
})(window);
