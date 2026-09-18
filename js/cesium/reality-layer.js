/**
 * REALITY-LAYER.JS
 * Real-world terrain and photorealistic 3D tiles for GV Infra Cesium viewer.
 *
 * Phase 2A: Cesium World Terrain (elevation, slopes, lighting, water mask)
 * Phase 2D: Google Photorealistic 3D Tiles (optional, additive enhancement)
 *
 * Follows provider fallback strategy:
 *   World Terrain → Ellipsoid fallback (no elevation)
 *   Photorealistic tiles → silent fail (non-critical enhancement)
 *
 * Usage:
 *   await RealityLayer.loadRealityMode(viewer, { photorealistic: false });
 */

(function (global) {
  'use strict';

  // Use shared logger if available, fall back to a console-compatible no-op
  const L = global.Logger || {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  /**
   * Phase 2A — Load Cesium World Terrain.
   * Uses Cesium.Terrain.fromWorldTerrain() (CesiumJS ≥ 1.107).
   * Falls back gracefully to EllipsoidTerrainProvider if unavailable.
   *
   * @param {Cesium.Viewer} viewer
   * @returns {Promise<Cesium.Terrain|null>} terrain instance or null on fallback
   */
  async function addRealTerrain(viewer) {
    if (!viewer) throw new Error('[RealityLayer] Cesium viewer is required');

    try {
      // Prefer the modern Cesium.Terrain API (CesiumJS 1.107+)
      if (typeof Cesium.Terrain?.fromWorldTerrain === 'function') {
        const terrain = await Cesium.Terrain.fromWorldTerrain({
          requestVertexNormals: true, // enables per-vertex lighting / slope shading
          requestWaterMask: true      // enables ocean/lake water effect
        });
        viewer.terrainProvider = terrain;
        L.info('RealityLayer', 'Cesium World Terrain loaded', { api: 'Cesium.Terrain.fromWorldTerrain' });
        return terrain;
      }

      // Legacy fallback for older CesiumJS builds (< 1.107)
      const legacyTerrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
        requestVertexNormals: true,
        requestWaterMask: true
      });
      viewer.terrainProvider = legacyTerrain;
      L.info('RealityLayer', 'Cesium World Terrain loaded', { api: 'CesiumTerrainProvider.fromIonAssetId' });
      return legacyTerrain;

    } catch (err) {
      // Non-fatal: fall back to flat ellipsoid so the globe still renders
      L.warn('RealityLayer', 'World Terrain failed — using ellipsoid fallback', { message: err.message });
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      return null;
    }
  }

  /**
   * Enable globe lighting so slopes are shaded realistically.
   * Should be called after terrain is set.
   *
   * @param {Cesium.Viewer} viewer
   */
  function enableTerrainLighting(viewer) {
    if (!viewer) return;
    try {
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.dynamicAtmosphereLighting = true;
      viewer.scene.globe.dynamicAtmosphereLightingFromSun = false;
      L.info('RealityLayer', 'Terrain lighting enabled');
    } catch (err) {
      L.warn('RealityLayer', 'Could not enable terrain lighting', { message: err.message });
    }
  }

  /**
   * Phase 2D — Add Google Photorealistic 3D Tiles.
   * This is an ADDITIVE enhancement — failure is silently swallowed.
   * Do NOT disable globe here (we keep terrain + globe as the base).
   *
   * Requires a valid Google Maps API key configured on Cesium ion.
   * Attribution: © Google
   *
   * @param {Cesium.Viewer} viewer
   * @returns {Promise<Cesium.Cesium3DTileset|null>} tileset or null
   */
  async function addPhotorealisticTiles(viewer) {
    if (!viewer) throw new Error('[RealityLayer] Cesium viewer is required');

    try {
      // CesiumJS 1.107+ helper that wires up the Google tile endpoint
      if (typeof Cesium.createGooglePhotorealistic3DTileset !== 'function') {
        L.warn('RealityLayer', 'createGooglePhotorealistic3DTileset not available in this CesiumJS build');
        return null;
      }

      const tileset = await Cesium.createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(tileset);

      // Fade in the tileset so the transition isn't jarring
      tileset.style = new Cesium.Cesium3DTileStyle();
      tileset.maximumScreenSpaceError = 16; // balance quality vs. performance

      L.info('RealityLayer', 'Google Photorealistic 3D Tiles loaded');
      return tileset;

    } catch (err) {
      // This is optional — log it but never block the viewer from loading
      L.warn('RealityLayer', 'Photorealistic 3D Tiles unavailable (expected without Google API key)', {
        message: err.message
      });
      return null;
    }
  }

  /**
   * Fly the camera to the real Stambadri Enclave coordinates.
   * Uses the config values from providers.json → camera block.
   *
   * @param {Cesium.Viewer} viewer
   * @param {object} cameraConfig  { defaultCenter, defaultHeight, defaultPitch, defaultHeading, animationDuration }
   */
  function flyToProjectSite(viewer, cameraConfig = {}) {
    const [lng, lat] = cameraConfig.defaultCenter || [80.14368, 17.24767];
    const height    = cameraConfig.defaultHeight   || 1200;
    const heading   = Cesium.Math.toRadians(cameraConfig.defaultHeading || 20);
    const pitch     = Cesium.Math.toRadians(cameraConfig.defaultPitch   || -35);
    const duration  = cameraConfig.animationDuration ?? 2.5;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      orientation: { heading, pitch, roll: 0 },
      duration
    });

    L.info('RealityLayer', 'Camera flying to project site', { lat, lng, height });
  }

  /**
   * Master entry point — Phase 2A → 2D pipeline.
   *
   * Steps executed in order:
   *  1. Set Cesium World Terrain (with ellipsoid fallback)
   *  2. Enable terrain lighting
   *  3. Optionally load Photorealistic 3D Tiles
   *  4. Fly camera to real project coordinates
   *
   * @param {Cesium.Viewer} viewer
   * @param {object} options
   * @param {boolean}  [options.photorealistic=false]   Enable Phase 2D tiles
   * @param {object}   [options.cameraConfig]           From providers.json → camera
   * @returns {Promise<{terrain, photorealisticTiles}>}
   */
  async function loadRealityMode(viewer, options = {}) {
    const { photorealistic = false, cameraConfig = {} } = options;

    const result = { terrain: null, photorealisticTiles: null };

    // 2A — terrain (always attempted)
    result.terrain = await addRealTerrain(viewer);

    // 2B — terrain lighting (always enabled)
    enableTerrainLighting(viewer);

    // 2D — photorealistic tiles (opt-in; needs Google API key)
    if (photorealistic) {
      result.photorealisticTiles = await addPhotorealisticTiles(viewer);
    }

    // 2E — fly to real site coordinates
    flyToProjectSite(viewer, cameraConfig);

    L.info('RealityLayer', 'Reality mode ready', {
      terrainLoaded: !!result.terrain,
      photorealisticLoaded: !!result.photorealisticTiles
    });

    return result;
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  global.RealityLayer = {
    addRealTerrain,
    addPhotorealisticTiles,
    enableTerrainLighting,
    flyToProjectSite,
    loadRealityMode
  };

})(window);
