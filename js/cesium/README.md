# Cesium 3D Viewer - Modular Architecture

**Phase 1 Implementation: God's Eye View Integration for GV Infra**

This directory contains the refactored, modular Cesium.js integration for GV Infra's Stambadri Enclave 3D masterplan visualization.

---

## Architecture Overview

### Module Dependency Graph

```
cesium-3d-core.js (MAIN ENTRY POINT)
├── map-stack.js ...................... Provider abstraction + fallback chains
├── camera-director.js ................ Camera animations & transitions
├── cinematic-tour.js ................. Guided flyover experiences
├── plot-tracking.js .................. Plot selection & click interaction
├── terrain.js ........................ Elevation & 3D tiles
├── project-layer.js .................. GV Infra GeoJSON rendering
└── measurement.js .................... Distance/area tools

Configuration:
└── config/providers.json ............ Runtime provider configuration (imagery, terrain, fallback)
```

### Design Principles

- **Separation of Concerns:** Each module handles one responsibility
- **Runtime Configuration:** All providers configurable via `config/providers.json`
- **Graceful Fallback:** Multi-tier fallback chains for imagery & terrain
- **Event-Driven:** Modules communicate via window events (decoupled)
- **Immutable State:** No global mutation; each module owns its state

---

## Module Documentation

### 1. cesium-3d-core.js

**Main orchestration layer.** Initializes all sub-modules and provides unified API.

```javascript
// Auto-initialization (listens for #cesium-container)
const viewer = new CesiumViewer3D('cesium-container');
await viewer.initialize();

// Get module instances
const modules = viewer.getModules();
const { projectLayer, cameraDirector, plotTracker } = modules;

// Select plot
viewer.selectPlot('P1');

// Start tour
await viewer.startPresetTour('project-overview');

// Get status
const status = viewer.getStatus();
console.log(status.plotStats); // { total: 48, available: 28, reserved: 15, sold: 5 }
```

**Key Methods:**
- `initialize()` → Promise<boolean>
- `selectPlot(plotId)` → void
- `startPlotTour(plotId)` → Promise
- `startPresetTour(tourName)` → Promise
- `getModules()` → Object
- `getStatus()` → Object
- `destroy()` → void

---

### 2. map-stack.js

**Provider abstraction layer.** Manages imagery provider selection and fallback chains.

```javascript
const stack = new MapStack(viewer, config);
await stack.initializeProviders(); // Tries chain: Google → Cesium → Bhuvan → OSM

// Switch provider at runtime
await stack.switchProvider('bhuvan_wms');

// Get current provider
const provider = stack.getCurrentProvider();
// { imagery: 'cesium_ion', terrain: 'cesium_world_terrain', isOnline: true }

// Health check
const isHealthy = await stack.healthCheck();
```

**Fallback Chain (configured in providers.json):**
1. Google 3D Tiles (if API key available)
2. Cesium Ion (bundled default)
3. Bhuvan WMS (free, India-specific)
4. OpenStreetMap (ultimate fallback)

**Key Methods:**
- `initializeProviders()` → Promise<boolean>
- `switchProvider(name)` → Promise<boolean>
- `switchToNextProvider()` → Promise<boolean>
- `enableOfflineMode()` → boolean
- `getCurrentProvider()` → Object
- `healthCheck()` → Promise<boolean>

---

### 3. camera-director.js

**Camera animation & transition manager.** Handles smooth camera movements.

```javascript
const director = new CameraDirector(viewer, config);

// Fly to location
await director.flyToLocation(
  17.2475,    // latitude
  80.1435,    // longitude
  450,        // height above ground (meters)
  2.5,        // duration (seconds)
  { heading: 20, pitch: -35 }
);

// Zoom to location
await director.zoomToLocation([80.1435, 17.2475], 15); // Google Maps zoom level

// Fly to plot
await director.flyToPlot(plotObject, 2.0);

// Orbit around point
await director.orbitPlot([80.1435, 17.2475], 300, 1.5, 8); // radius, rotations, duration

// Pan camera
await director.panCamera(0.01, 0.01, 1.0); // delta_lat, delta_lng, duration

// Reset to home
await director.resetCamera();

// Stop animation
director.stopAnimation();
```

**Key Methods:**
- `flyToLocation(lat, lng, height, duration, options)` → Promise
- `flyToPlot(plot, duration)` → Promise
- `zoomToLocation(coord, zoomLevel, duration)` → Promise
- `panCamera(deltaLat, deltaLng, duration)` → Promise
- `orbitPlot(centerCoord, radius, rotations, duration)` → Promise
- `resetCamera(duration)` → Promise
- `stopAnimation()` → void
- `getStatus()` → Object

---

### 4. cinematic-tour.js

**Guided flyover experiences.** Pre-configured and dynamic tours.

```javascript
const tour = new CinematicTour(cameraDirector, config);

// Play preset tour
await tour.playPresetTour('project-overview', { speed: 1.0 });

// Create dynamic tour from plots
await tour.createDynamicTour(['P1', 'P2', 'P3'], {
  speed: 1.0,
  dwellTime: 2.0,
  orbitEachPlot: true,
  orbitRadius: 300
});

// Playback control
await tour.play();
tour.pause();
tour.resume();
tour.stop();

// Navigation
await tour.jumpToStep(5);

// Get status
const status = tour.getStatus();
// { isPlaying: true, currentStep: 2, totalSteps: 10, progress: 20 }

// List available presets
const presets = tour.getPresetTours();
// [
//   { id: 'project-overview', name: 'Project Overview', stepCount: 4 },
//   { id: 'highlights-tour', name: 'Key Features Tour', stepCount: 3 }
// ]
```

**Preset Tours:**
- `project-overview` — Cinematic flyover of entire project
- `highlights-tour` — Spotlight view of key infrastructure

**Step Types:**
- `location` — Fly to specific coordinate
- `plot` — Fly to plot boundary
- `orbit` — Circle around location
- `wait` — Pause for dwell time
- `annotation` — Display text overlay

**Key Methods:**
- `playPresetTour(name, options)` → Promise
- `createDynamicTour(plots, options)` → Promise
- `play(options)` → Promise
- `pause()` → boolean
- `resume()` → boolean
- `stop()` → boolean
- `jumpToStep(index)` → Promise<boolean>
- `getPresetTours()` → Array
- `getStatus()` → Object

**Events:**
- `tour:progress` — Emitted during playback with status
- `tour:complete` — Emitted when tour finishes
- `tour:pause`, `tour:resume`, `tour:stop`

---

### 5. plot-tracking.js

**Plot selection & click interaction.** Handles user interaction with plot geometry.

```javascript
const tracker = new PlotTracker(viewer, cameraDirector, config);
tracker.enableClickSelection();

// Select plot programmatically
tracker.selectPlot('P1');

// Deselect
tracker.deselectPlot();

// Register entity (internal)
tracker.registerPlotEntity('P1', cesiumEntity);

// Get selected plot
const selected = tracker.getSelectedPlot();
// { id: 'P1', title: 'Plot 1', areaAcres: 0.25, status: 'available', ... }

// Get status
const status = tracker.getStatus();
// { hasSelection: true, selectedPlotId: 'P1', isClickEnabled: true, registeredPlots: 48 }
```

**Features:**
- Click on plot polygon to select
- Highlight selected plot with golden color
- Auto-populate detail drawer with plot info
- Animate camera to selected plot
- WhatsApp & call CTAs in detail view
- Virtual tour button triggers cinematic tour

**Key Methods:**
- `enableClickSelection()` → void
- `selectPlot(plotId, entity?)` → void
- `deselectPlot()` → void
- `getSelectedPlot()` → Object
- `getStatus()` → Object

**Events:**
- `plot:selected` — Emitted when plot selected
- `plot:deselected` — Emitted when plot deselected

---

### 6. terrain.js

**Elevation & 3D tile management.** Manages terrain data and elevation queries.

```javascript
const terrain = new TerrainManager(viewer, config);
await terrain.initializeTerrain();

// Query elevation at single point
const elevation = await terrain.queryElevation(17.2475, 80.1435);
console.log(elevation); // 145.3 (meters)

// Batch query
const elevations = await terrain.queryElevationBatch([
  [17.2475, 80.1435],
  [17.2480, 80.1440],
  [17.2470, 80.1430]
]);

// Cache elevation data for performance
await terrain.cacheElevationData(plotCoordinates);

// Calculate slope
const slope = await terrain.calculateSlope(17.2475, 80.1435, 50); // degrees

// Enable visual enhancements
terrain.enableShadows();
terrain.enableLighting();

// Switch provider at runtime
await terrain.switchTerrainProvider('ellipsoid'); // Disable expensive terrain

// Get info
const info = terrain.getTerrainInfo();
// { provider: 'cesium_world_terrain', isInitialized: true, cachedPoints: 48, ... }
```

**Terrain Fallback Chain:**
1. Cesium World Terrain (requires internet)
2. Ellipsoid (no elevation; always available)

**Key Methods:**
- `initializeTerrain()` → Promise<boolean>
- `queryElevation(lat, lng)` → Promise<number>
- `queryElevationBatch(coords)` → Promise<Array<number>>
- `cacheElevationData(coords)` → Promise<boolean>
- `calculateSlope(lat, lng, radius)` → Promise<number>
- `switchTerrainProvider(name)` → Promise<boolean>
- `enableShadows()` → void
- `enableLighting()` → void
- `getTerrainInfo()` → Object

---

### 7. project-layer.js

**GV Infra GeoJSON rendering.** Renders and manages project plot geometries.

```javascript
const layer = new ProjectLayer(viewer, plotTracker, config);

// Load GeoJSON
await layer.loadProjectGeometry('custom_plots.geojson');

// Update plot status
layer.updatePlotStatus('P1', 'available');
layer.updatePlotStatus('P2', 'reserved');
layer.updatePlotStatus('P3', 'sold');

// Filter by status
layer.filterByStatus('available');  // Show only available
layer.filterByStatus('all');        // Show all

// Visibility control
layer.setVisibility(true);  // Show all plots
layer.setVisibility(false); // Hide all plots

// Get statistics
const stats = layer.getPlotStats();
// { total: 48, available: 28, reserved: 15, sold: 5 }

// Get entity by plot ID
const entity = layer.getPlotEntity('P1');

// Get all entities
const allEntities = layer.getAllPlotEntities();

// Reload geometry
await layer.reload();

// Clear layer
layer.clear();
```

**Styling by Status:**
- `available` → Green (#16A34A)
- `reserved` → Amber (#D97706)
- `sold` → Red (#DC2626)

**Key Methods:**
- `loadProjectGeometry(url)` → Promise<boolean>
- `updatePlotStatus(plotId, status)` → boolean
- `updateAllPlotsStyling()` → void
- `setVisibility(visible)` → void
- `filterByStatus(status)` → void
- `getPlotEntity(id)` → Object
- `getAllPlotEntities()` → Array
- `getPlotStats()` → Object
- `reload()` → Promise<boolean>
- `clear()` → void

---

### 8. measurement.js

**Distance, area & height tools.** Drawing-based measurement system.

```javascript
const measure = new MeasurementTools(viewer, config);

// Start distance measurement
measure.startDistanceMeasurement();
// (Click points on map, double-click to finish)

// Start area measurement
measure.startAreaMeasurement();
// (Click points on map, double-click to finish)

// Cancel current measurement
measure.cancelMeasurement();

// Clear all measurements from view
measure.clearMeasurements();

// Get status
const status = measure.getStatus();
// { activeTool: 'distance', isDrawing: true, pointCount: 3 }
```

**Measurement Events:**
- `measurement:complete` — Emitted with result (distance/area)

**Output Formats:**
- Distance: "1,234.56 m" or "12.34 km"
- Area: "5,000 m²" or "0.5 ha" or "0.005 km²"

**Key Methods:**
- `startDistanceMeasurement()` → void
- `startAreaMeasurement()` → void
- `cancelMeasurement()` → void
- `clearMeasurements()` → void
- `getStatus()` → Object

---

## Configuration (config/providers.json)

```json
{
  "providers": {
    "imagery": [
      {
        "name": "google_3d_tiles",
        "enabled": true,
        "failoverPriority": 1,
        "apiKeyEnvVar": "GOOGLE_MAPS_API_KEY",
        "timeout": 8000
      },
      {
        "name": "cesium_ion",
        "enabled": true,
        "failoverPriority": 2,
        "timeout": 5000
      },
      {
        "name": "bhuvan_wms",
        "enabled": true,
        "failoverPriority": 3,
        "endpoint": "https://bhuvan.nrsc.gov.in/wms",
        "timeout": 8000
      },
      {
        "name": "osm_fallback",
        "enabled": true,
        "failoverPriority": 4,
        "timeout": 5000
      }
    ],
    "terrain": [
      {
        "name": "cesium_world_terrain",
        "enabled": true,
        "timeout": 6000
      },
      {
        "name": "ellipsoid_fallback",
        "enabled": true
      }
    ],
    "featureLayers": [
      {
        "name": "project_plots",
        "source": "custom_plots.geojson",
        "enabled": true
      }
    ],
    "camera": {
      "defaultCenter": [80.14368, 17.24767],
      "defaultHeight": 450,
      "defaultPitch": -35,
      "defaultHeading": 20,
      "animationDuration": 2.5
    }
  }
}
```

---

## Integration with HTML

```html
<!-- Load Cesium Library -->
<link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Widgets/widgets.css">
<script src="https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/Cesium.js"></script>

<!-- Load Module Files (order matters) -->
<script src="js/cesium/map-stack.js"></script>
<script src="js/cesium/camera-director.js"></script>
<script src="js/cesium/cinematic-tour.js"></script>
<script src="js/cesium/plot-tracking.js"></script>
<script src="js/cesium/terrain.js"></script>
<script src="js/cesium/project-layer.js"></script>
<script src="js/cesium/measurement.js"></script>
<script src="js/cesium/cesium-3d-core.js"></script>

<!-- Container -->
<div id="cesium-container" style="width: 100%; height: 600px;"></div>
<div id="plot-detail-drawer" style="display: none; position: absolute; right: 20px; top: 20px; width: 300px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>

<!-- Auto-initializes on DOMContentLoaded, or manually: -->
<script>
  // Manual initialization
  const viewer = new CesiumViewer3D('cesium-container');
  await viewer.initialize();

  // Access modules
  const { projectLayer, cameraDirector } = viewer.getModules();

  // Listen for events
  window.addEventListener('plot:selected', (e) => {
    console.log('Selected:', e.detail.plot);
  });
</script>
```

---

## Event System

### Emitted Events

```javascript
// Plot selection
window.addEventListener('plot:selected', (e) => {
  console.log(e.detail.plot); // { id, title, status, ... }
});

window.addEventListener('plot:deselected', (e) => {
  console.log('Plot deselected');
});

// Cinematic tour
window.addEventListener('tour:progress', (e) => {
  console.log(e.detail); // { currentStep, totalSteps, progress% }
});

window.addEventListener('tour:complete', (e) => {
  console.log('Tour finished:', e.detail.tourName);
});

// Measurements
window.addEventListener('measurement:complete', (e) => {
  console.log(e.detail); // { tool: 'distance'|'area', result: number }
});

// Viewer ready
window.addEventListener('cesium3d:ready', (e) => {
  console.log('Viewer initialized:', e.detail.viewer);
});
```

### Triggered Events

```javascript
// Select plot
window.dispatchEvent(new CustomEvent('plot:select-request', {
  detail: { plotId: 'P1' }
}));

// Start tour
window.dispatchEvent(new CustomEvent('plot:start-tour', {
  detail: { plotId: 'P1' }
}));

// Update plot status (from admin panel)
window.dispatchEvent(new CustomEvent('plot:status-changed', {
  detail: { plotId: 'P1', status: 'available' }
}));

// Start measurements
window.dispatchEvent(new CustomEvent('measurement:start-distance'));
window.dispatchEvent(new CustomEvent('measurement:start-area'));
window.dispatchEvent(new CustomEvent('measurement:cancel'));
```

---

## API Key Setup

### Google Maps API

1. Create GCP project: https://console.cloud.google.com/projectcreate
2. Enable APIs: Maps SDK, Tile API, Streets API
3. Create service account (IAM > Service Accounts)
4. Download JSON key → Store in `.env.local`
5. Set environment variable:
   ```bash
   export GOOGLE_MAPS_API_KEY=AIza...
   ```

### Cesium Ion (Optional)

1. Sign up: https://ion.cesium.com
2. Copy default token from Dashboard
3. Set environment variable:
   ```bash
   export CESIUM_ION_TOKEN=eyJ...
   ```

---

## Debugging

```javascript
// Get full viewer status
const viewer = window.Cesium3DViewer;
console.log(viewer.getStatus());

// Check providers
const provider = viewer.mapStack.getCurrentProvider();
console.log(provider);

// Check error log
console.log(viewer.mapStack.getErrorLog());

// Monitor terrain
const terrainInfo = viewer.terrainManager.getTerrainInfo();
console.log(terrainInfo);

// Print plot stats
console.log(viewer.projectLayer.getPlotStats());

// Enable Cesium debug mode
Cesium.ExperimentalFeatures.enableWebGl2 = true;
```

---

## Performance Considerations

1. **Caching:** Elevation data cached to avoid repeated queries
2. **LOD (Level of Detail):** Cesium automatically manages tile LOD
3. **Entity Count:** Monitor entity count; >1000 entities may impact performance
4. **Provider Selection:** Bhuvan WMS slower than Cesium Ion; use as fallback only
5. **Terrain:** Disable terrain updates if performance critical
   ```javascript
   viewer.terrainManager.switchTerrainProvider('ellipsoid');
   ```

---

## Phase 2 Enhancements

- [ ] Complete 254 missing plot geometries
- [ ] TGRAC cadastral WFS integration
- [ ] Road network vector layer
- [ ] POI (schools, markets, hospitals) layer
- [ ] Supabase live inventory sync
- [ ] Advanced measurement UI
- [ ] Mobile touch controls
- [ ] WCAG 2.1 AA accessibility

---

## Version History

- **v1.0** (Sept 14, 2026) — Initial Phase 1 release, 8 modules, provider abstraction
