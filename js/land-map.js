/* ============================================================
   Satellite land explorer — MapLibre GL + Esri World Imagery
   Supports 2D/3D tilt, road labels, GPS coordinate pin, and
   smooth switching to the Three.js 3D masterplan preview.
   ============================================================ */

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Geospatial state — all location data flows from GV_DATA.project
let map = null;
let mapReady = false;
let marker = null;
let labelsVisible = true;
let modelPromise = null;
let showcasePromise = null;
let currentPin = null;
let currentMode = '2d'; // '2d' or '3d'
let compassDial = null;

function getLocationConfig() {
  return window.GV_DATA ? window.GV_DATA.getProjectLocation() : null;
}

function getLocationCenter() {
  const config = getLocationConfig();
  return config ? config.coordinates.center : null;
}

function getLocationNote() {
  const config = getLocationConfig();
  if (!config) return 'Regional imagery around Khammam. The exact project boundary is not marked — enter the site GPS pin below to centre the map on it.';
  return config.coordinates.verified
    ? 'Verified project location. Satellite imagery is not a legal survey or proof of ownership.'
    : 'Regional imagery around Khammam. The exact project boundary is not marked — enter the site GPS pin below to centre the map on it.';
}

function getExternalMapLink(lng, lat, zoom = 13) {
  const config = getLocationConfig();
  if (config && window.GV_DATA && typeof window.GV_DATA.getExternalMapLink === 'function') {
    return window.GV_DATA.getExternalMapLink(lng, lat, zoom);
  }
  return `https://www.google.com/maps/@${lat},${lng},${zoom}z/data=!3m1!1e3`;
}

/* Esri World Imagery — no API key, attribution required. Place/road labels come
   from a separate transparent overlay so the Road labels button can hide them
   without also hiding the imagery. */
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

function initMap(retries = 15) {
  const container = $('land-map');
  if (!container) return;

  if (!window.maplibregl) {
    if (retries > 0) {
      setTimeout(() => initMap(retries - 1), 200);
      return;
    }
    const status = getStatusEl();
    if (status) {
      status.textContent = 'Satellite imagery is unavailable — MapLibre library could not be reached. The illustrative 3D layout preview still works.';
    }
    return;
  }

  try {
    const center = getLocationCenter();
    if (!center) {
      const status = getStatusEl();
      if (status) status.textContent = 'Project location not configured.';
      return;
    }
    map = new window.maplibregl.Map({
      container: 'land-map',
      style: SATELLITE_STYLE,
      center: center,
      zoom: 12,
      maxPitch: 60,
      attributionControl: { compact: true }
    });

    map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Sync compass with map bearing changes
    map.on('rotate', () => {
      updateCompass();
    });

    map.on('load', () => {
      mapReady = true;
      const status = getStatusEl();
      if (status) status.textContent = getLocationNote();
      updateCompass();
    });

    map.on('error', (event) => {
      console.warn('Satellite map notice:', event?.error || event);
      const status = getStatusEl();
      if (!mapReady && status) {
        status.textContent = 'Satellite imagery could not load. Check your connection and reload; the illustrative 3D layout preview still works.';
      }
    });
  } catch (err) {
    console.error('Error initializing map:', err);
    const status = getStatusEl();
    if (status) {
      status.textContent = 'Could not start 3D map engine. Your browser or GPU may not support WebGL. The 3D layout preview is still available.';
    }
  }
}

// View switching: 'land' (satellite) | 'model' (3D) | 'showcase' (cards) | 'cesium' (3D Globe)
let cesiumInstance = null;
async function switchView(view) {
  const sections = { land: 'land-explorer', model: 'layout-explorer', showcase: 'plot-showcase', cesium: 'cesium-explorer' };
  const buttons = { land: 'view-land', model: 'view-model', showcase: 'view-showcase', cesium: 'view-cesium' };

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
      loading.textContent = 'Loading illustrative 3D layout…';
    }
    try {
      modelPromise ||= import('./masterplan-page.js');
      await modelPromise;
      if (loading) loading.hidden = true;
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
      if (loading) {
        loading.textContent = 'The 3D preview could not load. Check your connection and reload; the satellite map remains available.';
      }
      console.error('3D preview:', error);
    }
  } else if (view === 'showcase') {
    try {
      showcasePromise ||= import('./plot-showcase.js');
      await showcasePromise;
    } catch (error) {
      console.error('Plot showcase:', error);
    }
  } else if (view === 'land') {
    const loading = $('layout-loading');
    if (loading) loading.hidden = true;
    if (!map) {
      initMap();
    } else {
      map.resize();
    }
  } else if (view === 'cesium') {
    if (window.CesiumLandViewer) {
      cesiumInstance ||= new window.CesiumLandViewer('cesium-container');
      cesiumInstance.init();
    }
  }
}

function setMapMode(mode) {
  if (!map || !mapReady) return;
  currentMode = mode;
  
  const is3D = mode === '3d';
  const targetPitch = is3D ? 50 : 0;
  
  map.easeTo({ 
    pitch: targetPitch, 
    duration: reducedMotion ? 0 : 650 
  });
  
  [['land-2d', !is3D], ['land-3d', is3D]].forEach(([id, active]) => {
    const el = $(id);
    if (el) {
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
    }
  });
  
  const status = getStatusEl();
  if (status) {
    status.textContent = is3D
      ? 'Elevated 3D aerial perspective. This angles the satellite imagery — not elevation-modelled terrain. No plot boundaries shown.'
      : getLocationNote();
  }
}

function updateCompass() {
  if (!map || !compassDial) return;
  const bearing = map.getBearing();
  compassDial.style.transform = `rotate(${bearing}deg)`;
}

function resetBearing() {
  if (!map || !mapReady) return;
  map.easeTo({ bearing: 0, duration: reducedMotion ? 0 : 450 });
}

function bindControls() {
  compassDial = $('land-compass-dial');
  
  if ($('view-land')) $('view-land').addEventListener('click', () => switchView('land'));
  if ($('view-model')) $('view-model').addEventListener('click', () => switchView('model'));
  if ($('view-showcase')) $('view-showcase').addEventListener('click', () => switchView('showcase'));
  if ($('view-cesium')) $('view-cesium').addEventListener('click', () => switchView('cesium'));

  if ($('land-2d')) $('land-2d').addEventListener('click', () => setMapMode('2d'));
  if ($('land-3d')) $('land-3d').addEventListener('click', () => setMapMode('3d'));
  
  if ($('land-compass')) {
    $('land-compass').addEventListener('click', () => resetBearing());
  }

  if ($('land-labels')) {
    $('land-labels').addEventListener('click', () => {
      if (!map?.getLayer('road-labels')) return;
      labelsVisible = !labelsVisible;
      map.setLayoutProperty('road-labels', 'visibility', labelsVisible ? 'visible' : 'none');
      $('land-labels').classList.toggle('active', labelsVisible);
      $('land-labels').setAttribute('aria-pressed', String(labelsVisible));
    });
  }

  if ($('land-reset')) {
    $('land-reset').addEventListener('click', () => {
      marker?.remove();
      marker = null;
      if ($('land-coordinates')) $('land-coordinates').value = '';
      
      const center = getLocationCenter();
      if (map && center) {
        const targetPitch = currentMode === '3d' ? 50 : 0;
        map.flyTo({ 
          center: center, 
          zoom: 12, 
          pitch: targetPitch, 
          bearing: 0, 
          duration: reducedMotion ? 0 : 1000 
        });
      }
      
      if ($('land-center') && center) {
        const [lng, lat] = center;
        $('land-center').textContent = `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(5)}° ${lng < 0 ? 'W' : 'E'}`;
      }
      if ($('land-external') && center) {
        $('land-external').href = getExternalMapLink(center[0], center[1]);
      }
      if ($('land-location-note')) {
        $('land-location-note').textContent = getLocationNote();
      }
      
      const status = getStatusEl();
      if (status) {
        status.textContent = currentMode === '3d'
          ? 'Elevated 3D aerial perspective. This angles the satellite imagery — not elevation-modelled terrain. No plot boundaries shown.'
          : getLocationNote();
      }
    });
  }

  if ($('land-coordinate-form')) {
    $('land-coordinate-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = $('land-coordinates');
      if (!input) return;
      const parts = input.value.trim().split(',').map(s => s.trim());
      const [lat, lng] = parts.map(Number);
      if (parts.length !== 2 || parts.some(s => !s) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85.051129 || Math.abs(lng) > 180) {
        input.setCustomValidity('Enter latitude (-85.051129 to 85.051129), longitude (-180 to 180), separated by a comma.');
        input.reportValidity();
        return;
      }
      const status = getStatusEl();
      if (!mapReady) {
        if (status) status.textContent = 'Map is not ready. Wait for imagery or reload to retry.';
        return;
      }
      marker?.remove();
      marker = new window.maplibregl.Marker({ color: '#d1a34b' })
        .setLngLat([lng, lat])
        .setPopup(new window.maplibregl.Popup().setText('Your entered pin — not independently verified.'))
        .addTo(map);
      map.flyTo({ center: [lng, lat], zoom: 17, duration: reducedMotion ? 0 : 1200 });
      if ($('land-center')) $('land-center').textContent = `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(5)}° ${lng < 0 ? 'W' : 'E'}`;
      if ($('land-external')) $('land-external').href = getExternalMapLink(lng, lat, 17);
      if ($('land-location-note')) {
        $('land-location-note').textContent = 'User-entered pin, not verified by GV Infra. Imagery is not a legal survey or proof of ownership.';
      }
      if (status) status.textContent = 'Centred on the coordinates you entered. The pin marks that point only — it is not a surveyed plot boundary.';
    });
  }

  if ($('land-coordinates')) {
    $('land-coordinates').addEventListener('input', (e) => e.target.setCustomValidity(''));
  }
}

// Initialize land-map UI from centralized location configuration
function initLandLocation() {
  const center = getLocationCenter();
  if (!center) return;
  const [lng, lat] = center;
  if ($('land-center')) {
    $('land-center').textContent = `${Math.abs(lat).toFixed(5)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(5)}° ${lng < 0 ? 'W' : 'E'}`;
  }
  if ($('land-external')) {
    $('land-external').href = getExternalMapLink(lng, lat, 13);
  }
  if ($('land-location-note')) {
    $('land-location-note').textContent = getLocationNote();
  }
}

// Start when document is ready
function startup() {
  initLandLocation();
  bindControls();
  switchView('model');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startup);
} else {
  startup();
}
