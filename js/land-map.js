/* ============================================================
   ENHANCED Satellite land explorer — MapLibre GL + Esri World Imagery
   Features: 2D/3D tilt, road labels, GPS coordinate pin, smooth transitions,
   accessibility, performance optimization, open-source ready
   ============================================================ */

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Regional centre around Khammam / Gurralapadu area [lng, lat]
const REGION = [80.14368, 17.24767];
const MAP_CONFIG = {
  minZoom: 3,
  maxZoom: 19,
  defaultZoom: 12,
  maxPitch: 60,
  animationDuration: reducedMotion ? 0 : 850,
  flyToDuration: reducedMotion ? 0 : 1200
};

let map = null;
let mapReady = false;
let mapError = false;
let marker = null;
let labelsVisible = true;
let modelPromise = null;
let showcasePromise = null;

const REGION_NOTE = 'Regional imagery around Khammam. Enter site GPS coordinates below to centre the map on your property.';
const REGION_LINK = `https://www.google.com/maps/@${REGION[1]},${REGION[0]},13z/data=!3m1!1e3`;

/* Esri World Imagery — no API key required, attribution included */
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

function getStatusEl() {
  return $('land-map-status');
}

function setStatus(message, type = 'info') {
  const status = getStatusEl();
  if (!status) return;

  status.textContent = message;
  status.className = `land-map-status land-map-status-${type}`;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
}

function handleMapError(error, errorMessage) {
  mapError = true;
  console.error('[LandMap] Error:', error);
  setStatus(errorMessage, 'error');
}

function initMap(retries = 15) {
  const container = $('land-map');
  if (!container) return;

  if (!window.maplibregl) {
    if (retries > 0) {
      setTimeout(() => initMap(retries - 1), 200);
      return;
    }
    handleMapError(
      'MapLibre not loaded',
      'Satellite map unavailable — MapLibre library failed to load. The 3D layout preview still works.'
    );
    return;
  }

  try {
    map = new window.maplibregl.Map({
      container: 'land-map',
      style: SATELLITE_STYLE,
      center: REGION,
      zoom: MAP_CONFIG.defaultZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      maxPitch: MAP_CONFIG.maxPitch,
      attributionControl: { compact: true },
      touchZoomRotate: true,
      cooperativeGestures: true
    });

    // Navigation controls
    map.addControl(
      new window.maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );

    // Fullscreen control for desktop
    if (document.fullscreenEnabled) {
      map.addControl(new window.maplibregl.FullscreenControl(), 'top-right');
    }

    // Map load event
    map.on('load', () => {
      mapReady = true;
      mapError = false;
      setStatus(REGION_NOTE, 'info');

      // Prefetch tiles
      if (map.getLayer('satellite')) {
        map.setPaintProperty('satellite', 'raster-fade-duration', 300);
      }

      // Accessibility announcements
      const container = map.getContainer();
      if (container) {
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', 'Interactive satellite map explorer');
      }
    });

    // Error handling
    map.on('error', (event) => {
      const error = event?.error;
      console.warn('[LandMap] Map error event:', error);

      if (!mapReady && !mapError) {
        handleMapError(
          error,
          'Satellite imagery could not load. Check your connection. The 3D layout preview remains available.'
        );
      }
    });

    // Performance: Hide non-essential layers on mobile
    if (window.innerWidth < 768) {
      map.on('load', () => {
        if (map.getLayer('road-labels')) {
          map.setLayoutProperty('road-labels', 'visibility', 'none');
          labelsVisible = false;
        }
      });
    }

  } catch (err) {
    handleMapError(
      err,
      'Could not initialize map. Your browser may not support WebGL. The 3D layout preview still works.'
    );
  }
}

// View switching: 'land' (satellite) | 'model' (3D) | 'showcase' (cards)
async function switchView(view) {
  const sections = { land: 'land-explorer', model: 'layout-explorer', showcase: 'plot-showcase' };
  const buttons = { land: 'view-land', model: 'view-model', showcase: 'view-showcase' };

  Object.entries(sections).forEach(([key, id]) => {
    const el = $(id);
    if (el) el.hidden = key !== view;
  });

  Object.entries(buttons).forEach(([key, id]) => {
    const el = $(id);
    if (!el) return;
    const active = key === view;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });

  if (view === 'model') {
    const loading = $('layout-loading');
    if (loading) {
      loading.hidden = false;
      loading.textContent = 'Loading 3D layout preview…';
    }
    try {
      modelPromise ||= import('./masterplan-page.js');
      await modelPromise;
      if (loading) loading.hidden = true;
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
      if (loading) {
        loading.textContent = 'The 3D preview could not load. Check your connection; satellite map remains available.';
      }
      console.error('[LandMap] 3D preview load error:', error);
    }
  } else if (view === 'showcase') {
    try {
      showcasePromise ||= import('./plot-showcase.js');
      await showcasePromise;
    } catch (error) {
      console.error('[LandMap] Plot showcase load error:', error);
    }
  } else if (view === 'land') {
    const loading = $('layout-loading');
    if (loading) loading.hidden = true;
    if (!map) {
      initMap();
    } else if (mapReady) {
      map.resize();
    }
  }
}

function setPitch(tilted) {
  if (!map) return;

  const targetPitch = tilted ? 55 : 0;
  map.easeTo({
    pitch: targetPitch,
    duration: MAP_CONFIG.animationDuration
  });

  [['land-flat', !tilted], ['land-tilt', tilted]].forEach(([id, active]) => {
    const el = $(id);
    if (el) {
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
    }
  });

  if (mapReady) {
    setStatus(
      tilted
        ? '3D tilted view active. This tilts the satellite image for perspective.'
        : REGION_NOTE,
      'info'
    );
  }
}

function toggleLabels() {
  if (!map?.getLayer('road-labels')) return;

  labelsVisible = !labelsVisible;
  map.setLayoutProperty('road-labels', 'visibility', labelsVisible ? 'visible' : 'none');

  const btn = $('land-labels');
  if (btn) {
    btn.classList.toggle('active', labelsVisible);
    btn.setAttribute('aria-pressed', String(labelsVisible));
  }

  setStatus(
    labelsVisible ? 'Road labels visible' : 'Road labels hidden',
    'info'
  );
}

function resetMapView() {
  if (!map) return;

  marker?.remove();
  marker = null;

  const coordInput = $('land-coordinates');
  if (coordInput) coordInput.value = '';

  map.flyTo({
    center: REGION,
    zoom: MAP_CONFIG.defaultZoom,
    pitch: 0,
    bearing: 0,
    duration: MAP_CONFIG.flyToDuration
  });

  setPitch(false);

  const center = $('land-center');
  if (center) center.textContent = '17.24767° N, 80.14368° E';

  const link = $('land-external');
  if (link) link.href = REGION_LINK;

  const note = $('land-location-note');
  if (note) note.textContent = 'Regional view only. Enter site coordinates to inspect your land. Plot boundaries require a verified survey.';

  setStatus(REGION_NOTE, 'info');
}

function parseCoordinates(input) {
  const parts = input.trim().split(',').map(s => s.trim());
  if (parts.length !== 2) return null;

  const [lat, lng] = parts.map(Number);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 85.051129) return null;
  if (Math.abs(lng) > 180) return null;

  return { lat, lng };
}

function formatCoordinate(value, isLat) {
  const absVal = Math.abs(value).toFixed(5);
  const dir = isLat ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E');
  return `${absVal}° ${dir}`;
}

function goToCoordinates(lat, lng) {
  if (!mapReady) {
    setStatus('Map is still loading. Please wait and try again.', 'error');
    return;
  }

  if (mapError) {
    setStatus('Map has encountered an error. Please reload to continue.', 'error');
    return;
  }

  // Remove old marker
  marker?.remove();

  // Create new marker with custom styling
  marker = new window.maplibregl.Marker({
    color: '#d1a34b',
    scale: 1.2
  })
    .setLngLat([lng, lat])
    .setPopup(new window.maplibregl.Popup({ offset: [0, -30] }).setText(
      'Your location pin — not independently verified'
    ))
    .addTo(map);

  // Smooth animation to coordinates
  map.flyTo({
    center: [lng, lat],
    zoom: 17,
    duration: MAP_CONFIG.flyToDuration,
    padding: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Update display
  const center = $('land-center');
  if (center) {
    center.textContent = `${formatCoordinate(lat, true)}, ${formatCoordinate(lng, false)}`;
  }

  const link = $('land-external');
  if (link) {
    link.href = `https://www.google.com/maps/@${lat},${lng},17z/data=!3m1!1e3`;
  }

  const note = $('land-location-note');
  if (note) {
    note.textContent = 'User-entered pin (not verified). Imagery is not a legal survey.';
  }

  setStatus('Centered on entered coordinates. Pin marks this point only.', 'success');

  // Open popup with slight delay
  setTimeout(() => marker?.togglePopup(), 300);
}

function bindControls() {
  // View switcher buttons
  ['view-land', 'view-model', 'view-showcase'].forEach(id => {
    const btn = $(id);
    if (btn) {
      const view = id.replace('view-', '');
      btn.addEventListener('click', () => switchView(view));
    }
  });

  // Map pitch controls
  const flatBtn = $('land-flat');
  if (flatBtn) flatBtn.addEventListener('click', () => setPitch(false));

  const tiltBtn = $('land-tilt');
  if (tiltBtn) tiltBtn.addEventListener('click', () => setPitch(true));

  // Labels toggle
  const labelsBtn = $('land-labels');
  if (labelsBtn) {
    labelsBtn.addEventListener('click', toggleLabels);
  }

  // Reset button
  const resetBtn = $('land-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetMapView);
  }

  // Coordinate form submission
  const form = $('land-coordinate-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('land-coordinates');
      if (!input) return;

      const coords = parseCoordinates(input.value);
      if (!coords) {
        input.setCustomValidity(
          'Enter latitude (-85 to 85), longitude (-180 to 180), separated by comma. Example: 17.24767, 80.14368'
        );
        input.reportValidity();
        return;
      }

      input.setCustomValidity('');
      goToCoordinates(coords.lat, coords.lng);
    });
  }

  // Clear validation on input change
  const coordInput = $('land-coordinates');
  if (coordInput) {
    coordInput.addEventListener('input', (e) => e.target.setCustomValidity(''));
  }

  // Keyboard navigation for accessibility
  document.addEventListener('keydown', (e) => {
    if (!map || !mapReady) return;

    const step = 0.01; // ~1km at zoom 12
    const currentCenter = map.getCenter();
    let newCenter = null;

    switch(e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newCenter = [currentCenter.lng, currentCenter.lat + step];
        break;
      case 'ArrowDown':
        e.preventDefault();
        newCenter = [currentCenter.lng, currentCenter.lat - step];
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newCenter = [currentCenter.lng - step, currentCenter.lat];
        break;
      case 'ArrowRight':
        e.preventDefault();
        newCenter = [currentCenter.lng + step, currentCenter.lat];
        break;
    }

    if (newCenter) {
      map.panTo(newCenter, { duration: 100 });
    }
  });
}

function startup() {
  bindControls();
  switchView('model');

  // Initialize map when user switches to land view
  const viewLandBtn = $('view-land');
  if (viewLandBtn) {
    viewLandBtn.addEventListener('click', () => {
      if (!map && !mapError) {
        initMap();
      }
    }, { once: false });
  }
}

// DOMContentLoaded detection with fallback
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startup);
} else {
  startup();
}

// Global export for testing/debugging
window.LandMapAPI = {
  getMap: () => map,
  isReady: () => mapReady,
  getMarker: () => marker,
  goToCoordinates,
  switchView,
  resetView: resetMapView,
  toggleLabels,
  setPitch
};
