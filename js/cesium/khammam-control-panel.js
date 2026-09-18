/**
 * KHAMMAM-CONTROL-PANEL.JS
 * UI Controls for Khammam Reality 3D Visualization
 *
 * Provides interactive controls for:
 * - Mode switching (orbital, street-walk, aerial tour, etc.)
 * - Layer visibility (streets, buildings, landmarks, plots)
 * - Measurement tools
 * - Time of day simulation
 * - Data export
 */

class KhammamControlPanel {
  constructor(viewer, reality3d) {
    this.viewer = viewer;
    this.reality3d = reality3d;
    this.isPanelOpen = false;
  }

  /**
   * Create and inject control panel UI
   */
  createPanel() {
    console.log('🎮 Creating Khammam control panel...');

    const panelHTML = `
      <div id="khammam-control-panel" class="control-panel" style="
        position: absolute;
        top: 20px;
        right: 20px;
        width: 320px;
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 20px;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        z-index: 100;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🌍 Khammam Reality 3D</h3>
          <button id="panel-toggle" style="
            background: transparent;
            color: #fff;
            border: none;
            cursor: pointer;
            font-size: 18px;
          ">−</button>
        </div>

        <!-- VISUALIZATION MODES -->
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 600; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; opacity: 0.7;">Visualization Modes</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="mode-btn" data-mode="orbital" style="
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.2);
              background: rgba(59, 130, 246, 0.2);
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            ">🛰️ Orbital</button>
            <button class="mode-btn" data-mode="street-walk" style="
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.2);
              background: rgba(75, 85, 99, 0.2);
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            ">🚶 Walk</button>
            <button class="mode-btn" data-mode="aerial-tour" style="
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.2);
              background: rgba(75, 85, 99, 0.2);
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            ">🚁 Tour</button>
            <button class="mode-btn" data-mode="overhead-map" style="
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.2);
              background: rgba(75, 85, 99, 0.2);
              color: #fff;
              cursor: pointer;
              font-size: 12px;
              transition: all 0.2s;
            ">🗺️ Map</button>
          </div>
        </div>

        <!-- LAYERS VISIBILITY -->
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 600; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; opacity: 0.7;">Layers</div>
          <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" class="layer-toggle" data-layer="streets" checked style="margin-right: 8px; cursor: pointer;">
            <span>🛣️ Streets & Roads</span>
          </label>
          <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" class="layer-toggle" data-layer="buildings" checked style="margin-right: 8px; cursor: pointer;">
            <span>🏢 Buildings (3D)</span>
          </label>
          <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" class="layer-toggle" data-layer="landmarks" checked style="margin-right: 8px; cursor: pointer;">
            <span>📍 Landmarks & POIs</span>
          </label>
          <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
            <input type="checkbox" class="layer-toggle" data-layer="plots" checked style="margin-right: 8px; cursor: pointer;">
            <span>🏘️ Stambadri Plots</span>
          </label>
        </div>

        <!-- TOOLS -->
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 600; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; opacity: 0.7;">Tools</div>
          <button id="measure-btn" style="
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(75, 85, 99, 0.15);
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          ">📐 Measure Distance</button>
          <button id="screenshot-btn" style="
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(75, 85, 99, 0.15);
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          ">📸 Capture</button>
          <button id="streetview-btn" style="
            width: 100%;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(75, 85, 99, 0.15);
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          ">👁️ Street View</button>
        </div>

        <!-- INFO PANEL -->
        <div style="
          background: rgba(75, 85, 99, 0.2);
          border-radius: 6px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 8px;">📍 Location: Khammam, Telangana</div>
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 8px;">🏠 Project: Stambadri Enclave</div>
          <div style="font-size: 11px; opacity: 0.8;">📊 <span id="entity-count">Loading...</span></div>
        </div>

        <!-- LEGEND -->
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px;">
          <div style="font-weight: 600; margin-bottom: 8px; opacity: 0.8;">Plot Status</div>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <span style="padding: 3px 6px; background: rgba(46, 110, 69, 0.5); border-radius: 3px;">🟢 Available</span>
            <span style="padding: 3px 6px; background: rgba(181, 138, 28, 0.5); border-radius: 3px;">🟡 Reserved</span>
            <span style="padding: 3px 6px; background: rgba(166, 91, 46, 0.5); border-radius: 3px;">🟠 Hold</span>
            <span style="padding: 3px 6px; background: rgba(112, 107, 97, 0.5); border-radius: 3px;">⚫ Sold</span>
          </div>
        </div>
      </div>
    `;

    // Inject panel into page
    const container = document.querySelector('.cesium-viewer') || document.body;
    const panel = document.createElement('div');
    panel.innerHTML = panelHTML;
    container.appendChild(panel.firstElementChild);

    this.panel = document.getElementById('khammam-control-panel');
    this.attachEventListeners();
    this.updateEntityCount();

    console.log('✅ Control panel created');
  }

  /**
   * Attach event listeners to panel controls
   */
  attachEventListeners() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.reality3d.switchMode(mode);

        // Update button styling
        document.querySelectorAll('.mode-btn').forEach(b => {
          b.style.background = 'rgba(75, 85, 99, 0.2)';
        });
        btn.style.background = 'rgba(59, 130, 246, 0.5)';
      });
    });

    // Layer toggles
    document.querySelectorAll('.layer-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const layer = e.target.dataset.layer;
        const isVisible = e.target.checked;
        this.toggleLayer(layer, isVisible);
      });
    });

    // Tools
    document.getElementById('measure-btn')?.addEventListener('click', () => {
      window.measureDistance?.();
    });

    document.getElementById('screenshot-btn')?.addEventListener('click', () => {
      this.reality3d.captureScreenshot();
    });

    document.getElementById('streetview-btn')?.addEventListener('click', () => {
      this.reality3d.openStreetView(17.2476, 80.1437);
    });

    // Panel toggle
    document.getElementById('panel-toggle')?.addEventListener('click', () => {
      this.isPanelOpen = !this.isPanelOpen;
      const content = this.panel.querySelector('div:not(#panel-toggle)');
      const allDivs = Array.from(this.panel.querySelectorAll(':scope > div')).filter(d => d.id !== 'panel-toggle');
      allDivs.forEach(div => {
        div.style.display = this.isPanelOpen ? 'block' : 'none';
      });
    });
  }

  /**
   * Toggle layer visibility
   */
  toggleLayer(layerName, isVisible) {
    const dataSource = this.reality3d.dataSources[layerName];
    if (dataSource) {
      dataSource.show = isVisible;
      console.log(`${layerName}: ${isVisible ? 'visible' : 'hidden'}`);
    }
  }

  /**
   * Update entity count display
   */
  updateEntityCount() {
    let totalEntities = 0;

    Object.values(this.reality3d.dataSources).forEach(ds => {
      if (ds && ds.entities) {
        totalEntities += ds.entities.values.length;
      }
    });

    const el = document.getElementById('entity-count');
    if (el) {
      el.textContent = `Entities: ${totalEntities}`;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KhammamControlPanel;
}
