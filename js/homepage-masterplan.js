/* ============================================================
   Homepage Masterplan Preview Controller
   Handles 2D MapLibre/3D Three.js mode switching
   ============================================================ */

import { initMasterplan } from "./masterplan.js";

const $ = (id) => document.getElementById(id);

let masterplanInstance = null;
let mapInstance = null;
let currentMode = '2d';
let isInitializing = false;
let mapReady = false;
let mapControls = null;
let conceptualOverlay = null;

// Reuse satellite style from land-map.js architecture
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
    },
    reference: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Labels &copy; Esri'
    }
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite' },
    { id: 'road-labels', type: 'raster', source: 'reference' }
  ]
};

// Initialize homepage masterplan viewer
function init() {
  const btn2D = $('hp-mp-2d');
  const btn3D = $('hp-mp-3d');
  const canvas = $('hp-mp-3d-canvas');
  const view2D = $('hp-mp-2d-view');
  const loading = $('hp-mp-loading');

  if (!btn2D || !btn3D || !canvas || !view2D) return;

  // Mode switching
  btn2D.addEventListener('click', () => switchMode('2d'));
  btn3D.addEventListener('click', () => switchMode('3d'));

  const demoConfig = window.GV_DATA?.getMasterplanDemo?.() || { defaultMode: '2d' };
  currentMode = demoConfig.defaultMode === '3d' ? '3d' : '2d';
  updateUI(currentMode);

  // Keep 3D lazy-loaded unless an administrator explicitly selects it as the demo default.
  if (currentMode === '3d') load3DView();
  else init2DMap();

  // Handle resize
  window.addEventListener('resize', handleResize);
  window.addEventListener('storage', handleSharedDataChange);
}

function switchMode(mode) {
  if (mode === currentMode || isInitializing) return;

  currentMode = mode;
  updateUI(mode);

  if (mode === '3d') {
    load3DView();
  } else {
    show2DView();
  }
}

function updateUI(mode) {
  const btn2D = $('hp-mp-2d');
  const btn3D = $('hp-mp-3d');

  if (btn2D && btn3D) {
    btn2D.classList.toggle('active', mode === '2d');
    btn3D.classList.toggle('active', mode === '3d');
  }
}

function init2DMap(retries = 15) {
  const container = $('hp-mp-map-container');
  if (!container) return;

  if (!window.maplibregl) {
    if (retries > 0) {
      setTimeout(() => init2DMap(retries - 1), 200);
      return;
    }
    console.warn('MapLibre GL not available for homepage 2D view');
    return;
  }

  try {
    // Get the regional center from GV_DATA; no exact boundary is implied.
    const center = window.GV_DATA?.getProjectLocation()?.coordinates?.center;
    if (!center) {
      console.warn('Homepage map location is not configured');
      return;
    }
    
    const demoConfig = window.GV_DATA?.getMasterplanDemo?.() || {};
    mapInstance = new window.maplibregl.Map({
      container: 'hp-mp-map-container',
      style: SATELLITE_STYLE,
      center: center,
      zoom: demoConfig.mapZoom || 14.5,
      maxPitch: 0,
      attributionControl: { compact: true },
      interactive: true
    });

    addMapControls(demoConfig);
    syncConceptualOverlay(demoConfig);

    mapInstance.on('load', () => {
      mapReady = true;
      syncMapPresentation(demoConfig);
    });

    mapInstance.on('error', (event) => {
      console.warn('Homepage map notice:', event?.error || event);
    });
  } catch (err) {
    console.error('Error initializing homepage map:', err);
  }
}

function addMapControls(config) {
  if (!mapInstance) return;
  if (!config.showMapControls && mapControls) {
    mapInstance.removeControl(mapControls);
    mapControls = null;
    return;
  }
  if (!config.showMapControls || mapControls) return;
  mapControls = new window.maplibregl.NavigationControl({
    showCompass: true,
    showZoom: true,
    visualizePitch: false
  });
  mapInstance.addControl(mapControls, 'bottom-right');
}

function createConceptualOverlay() {
  const element = document.createElement('div');
  element.className = 'hp-mp-conceptual-overlay';
  element.setAttribute('aria-label', 'Conceptual project overlay, demo visualization');
  element.innerHTML = `
    <div class="hp-mp-conceptual-scale">
      <div class="hp-mp-conceptual-label">
        <span class="hp-mp-conceptual-kicker">CONCEPTUAL DEMO</span>
        <strong class="hp-mp-conceptual-name"></strong>
      </div>
      <div class="hp-mp-conceptual-footprint">
        <div class="hp-mp-demo-road hp-mp-demo-road-main"></div>
        <div class="hp-mp-demo-road hp-mp-demo-road-cross"></div>
        <div class="hp-mp-demo-open-space hp-mp-demo-park-a">OPEN SPACE</div>
        <div class="hp-mp-demo-open-space hp-mp-demo-park-b">PARK</div>
        <div class="hp-mp-demo-amenity hp-mp-demo-amenity-a">AMENITY</div>
        <div class="hp-mp-demo-amenity hp-mp-demo-amenity-b">ENTRY</div>
        <div class="hp-mp-demo-plots"></div>
      </div>
      <div class="hp-mp-conceptual-disclaimer">Conceptual project overlay · Demo visualization</div>
    </div>`;
  return element;
}

function syncConceptualOverlay(config) {
  if (!mapInstance) return;
  if (!conceptualOverlay) {
    conceptualOverlay = createConceptualOverlay();
    new window.maplibregl.Marker({ element: conceptualOverlay, anchor: 'center' })
      .setLngLat(window.GV_DATA.getProjectLocation().coordinates.center)
      .addTo(mapInstance);
  }

  conceptualOverlay.style.display = config.overlayVisible ? '' : 'none';
  const scale = conceptualOverlay.querySelector('.hp-mp-conceptual-scale');
  if (scale) scale.style.transform = `scale(${config.overlayScale})`;
  const name = conceptualOverlay.querySelector('.hp-mp-conceptual-name');
  if (name) name.textContent = config.displayName;

  const plots = window.GV_DATA.getPlots();
  const plotGrid = conceptualOverlay.querySelector('.hp-mp-demo-plots');
  if (plotGrid) {
    plotGrid.innerHTML = plots.map((plot) => `<span class="hp-mp-demo-plot hp-mp-demo-plot-${plot.status}" title="${window.GV_DATA.statusLabel(plot.status)}"></span>`).join('');
  }
  conceptualOverlay.classList.toggle('hide-roads', !config.showRoads);
  conceptualOverlay.classList.toggle('hide-open-spaces', !config.showOpenSpaces);
  conceptualOverlay.classList.toggle('hide-amenities', !config.showAmenities);
}

function syncMapPresentation(config) {
  if (!mapInstance) return;
  if (mapReady && mapInstance.getLayer('road-labels')) {
    mapInstance.setLayoutProperty('road-labels', 'visibility', config.showMapLabels ? 'visible' : 'none');
  }
  addMapControls(config);
  if (mapReady && typeof config.mapZoom === 'number' && Math.abs(mapInstance.getZoom() - config.mapZoom) > 0.1) {
    mapInstance.easeTo({ zoom: config.mapZoom, duration: 450 });
  }
  syncConceptualOverlay(config);
}

function handleSharedDataChange(event) {
  if (event.key && event.key !== 'gv_infra_plots_v1' && event.key !== 'gv_infra_masterplan_demo_v1') return;
  if (window.GV_DATA?.reloadPlots) window.GV_DATA.reloadPlots();
  const config = window.GV_DATA?.getMasterplanDemo?.() || {};
  if (mapInstance) syncMapPresentation(config);
  if (masterplanInstance?.refreshColors) masterplanInstance.refreshColors();
  if (config.defaultMode !== currentMode && !isInitializing) {
    currentMode = config.defaultMode === '3d' ? '3d' : '2d';
    updateUI(currentMode);
  }
}

function show2DView() {
  const view2D = $('hp-mp-2d-view');
  const canvas = $('hp-mp-3d-canvas');
  const loading = $('hp-mp-loading');

  if (view2D) view2D.style.display = 'block';
  if (canvas) canvas.style.display = 'none';
  if (loading) loading.style.display = 'none';

  if (!mapInstance) init2DMap();

  // Resize map to fit container
  if (mapInstance && mapReady) {
    setTimeout(() => {
      mapInstance.resize();
    }, 100);
  }

  // Pause 3D rendering if active
  if (masterplanInstance && masterplanInstance.pause) {
    masterplanInstance.pause();
  }
}

async function load3DView() {
  const view2D = $('hp-mp-2d-view');
  const canvas = $('hp-mp-3d-canvas');
  const loading = $('hp-mp-loading');

  if (!canvas) return;

  // Show loading state
  if (view2D) view2D.style.display = 'none';
  if (loading) loading.style.display = 'flex';

  isInitializing = true;

  try {
    // Initialize Three.js masterplan if not already loaded
    if (!masterplanInstance) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for smooth transition

      masterplanInstance = initMasterplan({
        canvas: canvas,
        onSelectPlot: () => {}, // No-op on homepage
        onHoverPlot: () => {}, // No-op on homepage
        onHeadingChange: () => {}, // No-op on homepage
        homepagePresentation: true
      });

      // Keep the homepage presentation framing instead of resetting to the full-page view.
    } else {
      // Resume existing instance
      if (masterplanInstance.resume) {
        masterplanInstance.resume();
      }
    }

    // Show 3D canvas
    if (loading) loading.style.display = 'none';
    if (canvas) canvas.style.display = 'block';

    // Trigger resize to ensure proper canvas dimensions
    handleResize();

  } catch (error) {
    console.error('Failed to load 3D masterplan:', error);
    
    // Fall back to 2D on error
    if (loading) {
      loading.innerHTML = `
        <p style="color:var(--ink-soft); text-align:center; padding:20px;">
          3D preview temporarily unavailable.<br>
          <a href="project.html" style="color:var(--brand-green); text-decoration:underline;">View full masterplan →</a>
        </p>
      `;
    }
  } finally {
    isInitializing = false;
  }
}

function handleResize() {
  if (currentMode === '3d' && masterplanInstance) {
    const canvas = $('hp-mp-3d-canvas');
    if (canvas && masterplanInstance.handleResize) {
      masterplanInstance.handleResize();
    }
  } else if (currentMode === '2d' && mapInstance && mapReady) {
    mapInstance.resize();
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
