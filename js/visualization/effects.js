/**
 * REAL 3D EFFECTS ENGINE FOR KHAMMAM REAL ESTATE
 * Atmospheric Lighting, 3D Plot Extrusions, Sun & Shadow Simulation, and Visual Enhancements
 */

(function (global) {
  'use strict';

  class RealEstate3DEffects {
    constructor(viewer) {
      this.viewer = viewer;
      this.isEnabled = true;
      this.sunAnimationTimer = null;
      this.activeEnvironment = 'day'; // 'day' | 'golden' | 'dusk' | 'night'
    }

    /**
     * Initialize all 3D effects on the Cesium viewer
     */
    init() {
      if (!this.viewer || !this.viewer.scene) return;

      console.log('[3D Effects] Initializing Real 3D Visual Engine for Khammam...');

      // 1. Enable Terrain Lighting & Depth Testing
      this.enableLightingAndAtmosphere();

      // 2. Enable Shadows
      this.enableShadows();

      // 3. Set Initial Sun Position for Khammam (17.2473° N, 80.1514° E)
      this.setEnvironmentMode('golden');

      // 4. Inject Dynamic Glowing Pulse Shader Style for Plot Selection
      this.injectStyles();
    }

    /**
     * Enable Globe Depth Testing, Terrain Lighting & Sky Atmosphere
     */
    enableLightingAndAtmosphere() {
      const scene = this.viewer.scene;
      const globe = scene.globe;

      // Enable depth testing against terrain so 3D objects don't clip through hills
      globe.depthTestAgainstTerrain = true;

      // Enable terrain shading & sun-based atmospheric lighting
      globe.enableLighting = true;
      globe.dynamicAtmosphereLighting = true;
      globe.dynamicAtmosphereLightingFromSun = true;

      // Enable atmosphere & fog effect for realistic distance haze over Khammam hills
      if (scene.skyAtmosphere) {
        scene.skyAtmosphere.show = true;
      }
      if (scene.fog) {
        scene.fog.enabled = true;
        scene.fog.density = 0.0002;
        scene.fog.screenSpaceErrorFactor = 2.0;
      }
    }

    /**
     * Enable Realistic Sun Shadows on 3D Terrain & Extruded Parcels
     */
    enableShadows() {
      try {
        this.viewer.shadows = true;
        this.viewer.terrainShadows = Cesium.ShadowMode.ENABLED;
        this.viewer.shadowMap.softShadows = true;
        this.viewer.shadowMap.darkness = 0.45;
        console.log('[3D Effects] Soft terrain shadows enabled');
      } catch (err) {
        console.warn('[3D Effects] Shadow map initialization warning:', err.message);
      }
    }

    /**
     * Set Environment Preset (Day, Golden Hour, Dusk, Night)
     * Adjusts Sun JulianDate clock for Khammam coordinates
     */
    setEnvironmentMode(mode) {
      this.activeEnvironment = mode;
      const clock = this.viewer.clock;
      
      // Khammam Date: September 18, 2026 (IST is UTC+5:30)
      let targetHourUTC = 10; // Default ~3:30 PM IST

      switch (mode) {
        case 'day':
          targetHourUTC = 7; // 12:30 PM IST (High Sun)
          break;
        case 'golden':
          targetHourUTC = 11.5; // 5:00 PM IST (Golden Afternoon Glow)
          break;
        case 'dusk':
          targetHourUTC = 13; // 6:30 PM IST (Sunset / Twilight)
          break;
        case 'night':
          targetHourUTC = 16; // 9:30 PM IST (Night)
          break;
      }

      const dateStr = `2026-09-18T${String(Math.floor(targetHourUTC)).padStart(2, '0')}:${String(Math.round((targetHourUTC % 1) * 60)).padStart(2, '0')}:00Z`;
      clock.currentTime = Cesium.JulianDate.fromIso8601(dateStr);
      clock.shouldAnimate = false;

      // Adjust atmosphere lighting intensity
      if (this.viewer.scene.globe) {
        if (mode === 'night') {
          this.viewer.scene.globe.enableLighting = true;
          this.viewer.scene.globe.showGroundAtmosphere = false;
        } else {
          this.viewer.scene.globe.enableLighting = true;
          this.viewer.scene.globe.showGroundAtmosphere = true;
        }
      }

      console.log(`[3D Effects] Environment switched to '${mode}' (${dateStr})`);
    }

    /**
     * Animate Sun Position Across the Sky (Time-lapse simulation)
     */
    toggleSunTimeLapse(speedFactor = 100) {
      const clock = this.viewer.clock;
      if (clock.shouldAnimate) {
        clock.shouldAnimate = false;
        console.log('[3D Effects] Time-lapse paused');
      } else {
        clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        clock.multiplier = speedFactor;
        clock.shouldAnimate = true;
        console.log(`[3D Effects] Time-lapse running at ${speedFactor}x speed`);
      }
    }

    /**
     * Apply 3D Extrusion & Metallic Shading to Plot Entities
     * @param {Cesium.EntityCollection} entities
     * @param {number} defaultHeight
     */
    apply3DPlotExtrusions(entities, defaultHeight = 6.0) {
      if (!entities) return;

      const values = typeof entities.values !== 'undefined' ? entities.values : entities;
      let count = 0;

      for (const entity of values) {
        if (entity.polygon) {
          // Set extruded height in meters above terrain
          entity.polygon.extrudedHeight = defaultHeight;
          entity.polygon.height = 0; // Clamped base on terrain
          entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
          entity.polygon.extrudedHeightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
          
          // Enhanced outline rendering
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.8);
          entity.polygon.outlineWidth = 2;

          count++;
        }
      }

      console.log(`[3D Effects] Extruded ${count} plot polygons into 3D volumes (${defaultHeight}m height)`);
    }

    /**
     * Pulse Selection Glow on Highlighted Plot Entity
     * @param {Cesium.Entity} entity
     * @param {string} colorHex
     */
    highlight3DPlotWithPulse(entity, colorHex = '#10B981') {
      if (!entity || !entity.polygon) return;

      const baseColor = Cesium.Color.fromCssColorString(colorHex);
      
      // Dynamic pulsing material property using system clock
      let alphaDirection = 1;
      let currentAlpha = 0.6;

      entity.polygon.material = new Cesium.CallbackProperty(() => {
        currentAlpha += 0.015 * alphaDirection;
        if (currentAlpha >= 0.85) alphaDirection = -1;
        if (currentAlpha <= 0.45) alphaDirection = 1;
        return baseColor.withAlpha(currentAlpha);
      }, false);

      // Elevated 3D highlight height
      entity.polygon.extrudedHeight = 12.0;
      entity.polygon.outlineColor = Cesium.Color.GOLD;
      entity.polygon.outlineWidth = 4;
    }

    injectStyles() {
      if (document.getElementById('cesium-3d-effects-style')) return;
      const style = document.createElement('style');
      style.id = 'cesium-3d-effects-style';
      style.textContent = `
        .cesium-3d-glow-badge {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
          border: 1px solid #10B981;
          transition: all 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Export to global scope
  global.RealEstate3DEffects = RealEstate3DEffects;
})(window);
