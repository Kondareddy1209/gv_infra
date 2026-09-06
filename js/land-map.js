/* ============================================================
   Satellite land explorer — MapLibre GL + Esri World Imagery
   Supports 2D/3D tilt, road labels, GPS coordinate pin, and
   smooth switching to the Three.js 3D masterplan preview.
   ============================================================ */

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Regional centre around Khammam / Gurralapadu area [lng, lat]
const REGION = [80.14368, 17.24767];
let map = null;
let mapReady = false;
let marker = null;
let labelsVisible = true;
let modelPromise = null;
let showcasePromise = null;

const REGION_NOTE = 'Regional imagery around Khammam. The exact project boundary is not marked — enter the site GPS pin below to centre the map on it.';
const REGION_LINK = `https://www.google.com/maps/@${REGION[1]},${REGION[0]},13z/data=!3m1!1e3`;

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
    map = new window.maplibregl.Map({
      container: 'land-map',
      style: SATELLITE_STYLE,
      center: REGION,
      zoom: 12,
      maxPitch: 60,
      attributionControl: { compact: true }
    });

    map.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => { 
      mapReady = true; 
      const status = getStatusEl();
      if (status) status.textContent = REGION_NOTE; 
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

// view: 'land' (satellite map) | 'model' (3D layout preview) | 'showcase' (plot cards)
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
  }
}

function setPitch(tilted) {
  map?.easeTo({ pitch: tilted ? 55 : 0, duration: reducedMotion ? 0 : 850 });
  [['land-flat', !tilted], ['land-tilt', tilted]].forEach(([id, active]) => {
    const el = $(id);
    if (el) {
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
    }
  });
  const status = getStatusEl();
  if (mapReady && status) {
    status.textContent = tilted
      ? 'Tilted aerial view. This angles the satellite image — it is not elevation-modelled terrain, and shows no plot boundaries.'
      : REGION_NOTE;
  }
}

function bindControls() {
  if ($('view-land')) $('view-land').addEventListener('click', () => switchView('land'));
  if ($('view-model')) $('view-model').addEventListener('click', () => switchView('model'));
  if ($('view-showcase')) $('view-showcase').addEventListener('click', () => switchView('showcase'));

  if ($('land-flat')) $('land-flat').addEventListener('click', () => setPitch(false));
  if ($('land-tilt')) $('land-tilt').addEventListener('click', () => setPitch(true));

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
      map?.flyTo({ center: REGION, zoom: 12, pitch: 0, bearing: 0, duration: reducedMotion ? 0 : 1000 });
      setPitch(false);
      if ($('land-center')) $('land-center').textContent = '17.24767° N, 80.14368° E';
      if ($('land-external')) $('land-external').href = REGION_LINK;
      if ($('land-location-note')) {
        $('land-location-note').textContent = 'Regional view only. Enter site coordinates to inspect your land. Plot boundaries require a verified survey.';
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
      if ($('land-external')) $('land-external').href = `https://www.google.com/maps/@${lat},${lng},17z/data=!3m1!1e3`;
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

// Start when document is ready
function startup() {
  bindControls();
  switchView('model');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startup);
} else {
  startup();
}
