/**
 * HEADS-UP DISPLAY (HUD) & INTERACTIVE 3D CONTROLS FOR KHAMMAM REAL ESTATE
 * Floating 3D Map Control Overlay for Camera, Environment Lighting, Layers, and Fly-to Camera Views
 */

(function (global) {
  'use strict';

  class RealEstateHUD {
    constructor(viewer, effectsEngine) {
      this.viewer = viewer;
      this.effectsEngine = effectsEngine;
      this.container = null;
      this.is2DMode = false;
    }

    /**
     * Build and render HUD UI overlay on viewer container
     */
    init() {
      if (!this.viewer || document.getElementById('cesium-hud-overlay')) return;

      console.log('[HUD] Initializing Interactive 3D Control Panel...');

      const viewerContainer = this.viewer.container || document.getElementById('cesium-container');
      if (!viewerContainer) return;

      this.container = document.createElement('div');
      this.container.id = 'cesium-hud-overlay';
      this.container.innerHTML = `
        <div class="hud-panel hud-top-left">
          <div class="hud-brand-badge">
            <span class="hud-pulse-dot"></span>
            <span class="hud-title">KHAMMAM 3D REAL ESTATE</span>
          </div>
          <div class="hud-location-tag">Gurralapadu | DTCP Approved | 302 Plots</div>
        </div>

        <div class="hud-panel hud-top-right">
          <div class="hud-btn-group">
            <button class="hud-btn" id="hud-btn-day" title="Day Lighting">☀️ Day</button>
            <button class="hud-btn active" id="hud-btn-golden" title="Golden Hour">🌅 Golden</button>
            <button class="hud-btn" id="hud-btn-dusk" title="Dusk / Sunset">🌆 Dusk</button>
            <button class="hud-btn" id="hud-btn-night" title="Night View">🌙 Night</button>
          </div>
          <div class="hud-btn-group" style="margin-top: 8px;">
            <button class="hud-btn" id="hud-btn-timelapse" title="Toggle Sun Motion">⏯️ Sun Motion</button>
            <button class="hud-btn" id="hud-btn-mode3d" title="Switch 3D / 2D View">🌐 <span id="hud-mode-label">3D View</span></button>
          </div>
        </div>

        <div class="hud-panel hud-bottom-left">
          <div class="hud-flyto-title">QUICK CAMERA LOCATIONS</div>
          <div class="hud-quick-links">
            <button class="hud-chip" id="fly-khammam-city">🏢 Khammam City</button>
            <button class="hud-chip active" id="fly-stambadri-masterplan">🏡 Stambadri Enclave</button>
            <button class="hud-chip" id="fly-central-park">🌳 Central Park</button>
            <button class="hud-chip" id="fly-kodad-highway">🛣️ Kodad Highway</button>
          </div>
        </div>

        <div class="hud-panel hud-bottom-right">
          <div class="hud-stats-card">
            <div class="hud-stat-item">
              <span class="hud-stat-val" id="hud-alt-val">450m</span>
              <span class="hud-stat-lbl">ALTITUDE</span>
            </div>
            <div class="hud-stat-item">
              <span class="hud-stat-val" id="hud-pitch-val">-35°</span>
              <span class="hud-stat-lbl">PITCH</span>
            </div>
          </div>
        </div>
      `;

      viewerContainer.appendChild(this.container);
      this.injectHUDStyles();
      this.bindEvents();
      this.startCameraTelemetry();
    }

    bindEvents() {
      // Lighting Environment Switches
      const setEnv = (mode, btnId) => {
        if (this.effectsEngine) this.effectsEngine.setEnvironmentMode(mode);
        document.querySelectorAll('.hud-top-right .hud-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById(btnId);
        if (activeBtn) activeBtn.classList.add('active');
      };

      document.getElementById('hud-btn-day')?.addEventListener('click', () => setEnv('day', 'hud-btn-day'));
      document.getElementById('hud-btn-golden')?.addEventListener('click', () => setEnv('golden', 'hud-btn-golden'));
      document.getElementById('hud-btn-dusk')?.addEventListener('click', () => setEnv('dusk', 'hud-btn-dusk'));
      document.getElementById('hud-btn-night')?.addEventListener('click', () => setEnv('night', 'hud-btn-night'));

      // Sun Timelapse
      document.getElementById('hud-btn-timelapse')?.addEventListener('click', () => {
        if (this.effectsEngine) this.effectsEngine.toggleSunTimeLapse(150);
      });

      // 3D / 2D Toggle
      document.getElementById('hud-btn-mode3d')?.addEventListener('click', () => {
        const scene = this.viewer.scene;
        const modeLabel = document.getElementById('hud-mode-label');
        if (this.is2DMode) {
          scene.morphTo3D(1.5);
          this.is2DMode = false;
          if (modeLabel) modeLabel.textContent = '3D View';
        } else {
          scene.morphTo2D(1.5);
          this.is2DMode = true;
          if (modeLabel) modeLabel.textContent = '2D Map';
        }
      });

      // Fly-to Camera Points
      document.getElementById('fly-khammam-city')?.addEventListener('click', () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1514, 17.2473, 2500),
          orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45) },
          duration: 2.0
        });
      });

      document.getElementById('fly-stambadri-masterplan')?.addEventListener('click', () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1365, 17.2485, 450),
          orientation: { heading: Cesium.Math.toRadians(30), pitch: Cesium.Math.toRadians(-35) },
          duration: 2.0
        });
      });

      document.getElementById('fly-central-park')?.addEventListener('click', () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1370, 17.2482, 180),
          orientation: { heading: Cesium.Math.toRadians(45), pitch: Cesium.Math.toRadians(-25) },
          duration: 1.8
        });
      });

      document.getElementById('fly-kodad-highway')?.addEventListener('click', () => {
        this.viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(80.1400, 17.2450, 600),
          orientation: { heading: Cesium.Math.toRadians(310), pitch: Cesium.Math.toRadians(-30) },
          duration: 2.0
        });
      });
    }

    startCameraTelemetry() {
      if (!this.viewer) return;
      this.viewer.camera.changed.addEventListener(() => {
        const cartographic = Cesium.Cartographic.fromCartesian(this.viewer.camera.position);
        const altMeters = Math.round(cartographic.height);
        const pitchDegrees = Math.round(Cesium.Math.toDegrees(this.viewer.camera.pitch));

        const altElem = document.getElementById('hud-alt-val');
        const pitchElem = document.getElementById('hud-pitch-val');
        if (altElem) altElem.textContent = `${altMeters}m`;
        if (pitchElem) pitchElem.textContent = `${pitchDegrees}°`;
      });
    }

    injectHUDStyles() {
      if (document.getElementById('cesium-hud-styles')) return;
      const style = document.createElement('style');
      style.id = 'cesium-hud-styles';
      style.textContent = `
        #cesium-hud-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 100;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .hud-panel {
          position: absolute;
          pointer-events: auto;
        }
        .hud-top-left { top: 16px; left: 16px; }
        .hud-top-right { top: 16px; right: 16px; }
        .hud-bottom-left { bottom: 24px; left: 16px; }
        .hud-bottom-right { bottom: 24px; right: 16px; }

        .hud-brand-badge {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 700;
          font-size: 0.88rem;
          letter-spacing: 0.05em;
        }
        .hud-pulse-dot {
          width: 8px; height: 8px;
          background: #10B981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10B981;
          animation: hudPulse 1.8s infinite;
        }
        @keyframes hudPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .hud-location-tag {
          font-size: 0.72rem;
          color: #94A3B8;
          margin-top: 4px;
          margin-left: 2px;
        }
        .hud-btn-group {
          display: flex;
          gap: 6px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .hud-btn {
          background: transparent;
          border: none;
          color: #94A3B8;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .hud-btn:hover { color: white; background: rgba(255, 255, 255, 0.1); }
        .hud-btn.active { color: #10B981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }

        .hud-flyto-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: #94A3B8;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }
        .hud-quick-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .hud-chip {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #E2E8F0;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.76rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .hud-chip:hover { background: #1E293B; border-color: #38BDF8; color: white; }

        .hud-stats-card {
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 6px 12px;
          display: flex;
          gap: 16px;
        }
        .hud-stat-item { text-align: center; }
        .hud-stat-val { display: block; color: #38BDF8; font-weight: 700; font-size: 0.85rem; }
        .hud-stat-lbl { display: block; color: #64748B; font-size: 0.62rem; font-weight: 600; }
      `;
      document.head.appendChild(style);
    }
  }

  global.RealEstateHUD = RealEstateHUD;
})(window);
