# God's Eye View Integration: Implementation Guide

**Project:** GV Infra Spatial Intelligence Platform  
**Status:** Phase 0 ✅ | Phase 1-4 🔨 In Progress  
**Last Updated:** 2026-09-14

---

## Architecture Overview

The refactored architecture transforms the monolithic `cesium-3d.js` into a modular, provider-independent stack:

```
┌─────────────────────────────────────────────────────────────────┐
│                  GV Infra Map Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ VISUALIZATION LAYER (Phase 3)                              │
│  │  ├─ hud.js (dashboard overlay)                              │
│  │  ├─ effects.js (day/sunset/night)                           │
│  │  └─ annotations.js (whiteboard)                             │
│  │                                                              │
│  ├─ AI LAYER (Phase 2)                                         │
│  │  ├─ voice-agent.js (microphone → API proxy)                 │
│  │  ├─ scene-context.js (serialize view state)                 │
│  │  └─ spatial-tools.js (AI-callable functions)                │
│  │                                                              │
│  ├─ CESIUM CORE (Phase 1)                                      │
│  │  ├─ cesium-3d-init.js (bootstrap)                           │
│  │  ├─ map-stack.js (provider abstraction)                     │
│  │  ├─ camera-director.js (camera transitions)                 │
│  │  ├─ cinematic-tour.js (guided tours)                        │
│  │  ├─ plot-tracking.js (click → select → info)                │
│  │  ├─ project-layer.js (GeoJSON rendering)                    │
│  │  ├─ terrain.js (terrain provider chain)                     │
│  │  ├─ measurement.js (distance/area tools)                    │
│  │  └─ advanced-experiences.js (Phase 4: drone, 360°, etc.)   │
│  │                                                              │
│  ├─ CONFIGURATION                                              │
│  │  └─ config/providers.json (runtime provider config)          │
│  │                                                              │
│  └─ DATA LAYER                                                  │
│     └─ js/data.js (GV_DATA mock → Supabase in production)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Real 3D Core (CRITICAL)

### 1.1 Components

#### map-stack.js ✅
**Purpose:** Provider abstraction layer with fallback chain  
**Key Methods:**
- `async init()` - Load config and initialize providers
- `async loadConfig()` - Fetch providers.json
- `async setupTerrain()` - Initialize terrain chain
- `async setupImagery()` - Initialize imagery chain
- `enableOfflineMode()` - Fallback to 2D MapLibre
- `getAttributionHTML()` - Legal attribution for all providers

**Fallback Chain:**
1. Google 3D Tiles (paid, best quality)
2. Cesium Ion (bundled, good quality)
3. ISRO Bhuvan WMS (free, Indian satellite)
4. OpenStreetMap (free, vector/raster)
5. Offline Mode (cached + project geometry only)

#### camera-director.js ✅
**Purpose:** Camera animations and transitions  
**Key Methods:**
- `async flyToLocation(lat, lng, height, duration, options)` - Fly to coordinates
- `async flyToPlot(plot, duration)` - Fly to specific plot
- `async zoomToLocation(coord, zoomLevel, duration)` - Zoom with auto height
- `async orbitPlot(centerCoord, radius, rotations, duration)` - Cinematic orbit
- `async startCinematicTour(plotIds, options)` - Multi-plot tour

**Used By:** CinematicTour, PlotTracking, UI event handlers

#### cinematic-tour.js ✅
**Purpose:** Guided flyover experiences  
**Key Methods:**
- `async playPresetTour(tourName, options)` - Play built-in tour
- `async createDynamicTour(plots, options)` - Generate custom tour from selections
- `async play(options)` - Start playback
- `pause()`, `resume()`, `stop()` - Playback controls
- `getStatus()` - Tour progress info

**Preset Tours:**
- `project-overview` - Full enclave flyover
- `highlights-tour` - Key amenities focus

#### plot-tracking.js 🔨 (To Be Created)
**Purpose:** Click-to-select plots, highlight, show info drawer  
**Methods:**
- `onPlotClick(entity)` - Handle click event
- `selectPlot(plotId)` - Highlight selected plot
- `showPlotInfo(plot)` - Display info drawer with CTA
- `deselect()` - Clear selection

#### terrain.js 🔨 (To Be Created)
**Purpose:** Terrain provider initialization and fallback  
**Methods:**
- `async initializeTerrain()` - Setup provider chain
- `async switchTerrainProvider(name)` - Runtime swap

#### project-layer.js 🔨 (To Be Created)
**Purpose:** Render GV Infra project GeoJSON  
**Methods:**
- `async loadProjectBoundary()` - Fetch verified survey boundary
- `async renderPlots()` - Add plot polygons to viewer
- `setPlotStyle(plotId, color, opacity)` - Update styling

#### measurement.js 🔨 (To Be Created)
**Purpose:** Distance and area measurement tools  
**Methods:**
- `startMeasure(type)` - Begin distance/area mode
- `clearMeasurements()` - Remove all measurements
- `getMeasurements()` - Export measurements

#### cesium-3d-init.js 🔨 (To Be Created)
**Purpose:** Bootstrap file that initializes all Phase 1 modules  
**Replaces:** Old cesium-3d.js  
**Initialization Order:**
1. Create Cesium Viewer
2. Initialize MapStack (providers)
3. Initialize CameraDirector (camera control)
4. Initialize CinematicTour (tours)
5. Initialize TerrainProvider (elevation)
6. Initialize ProjectLayer (project geometry)
7. Initialize PlotTracking (interactivity)
8. Initialize MeasurementTools (tools)
9. Set up event listeners

---

## Phase 2: Spatial AI (IN PROGRESS)

### 2.1 Components

#### voice-agent.js 🔨 (To Be Created)
**Purpose:** Voice command interface with server-side API proxy  
**Key Methods:**
- `async startListening()` - Activate microphone
- `async stopListening()` - Deactivate microphone
- `async transcribeAudio(audioBlob)` - Send to server proxy
- `async interpretCommand(transcript)` - Call AI API via proxy
- `async executeCommand(command)` - Trigger map actions

**Security Model:**
- ✅ API keys stored server-side only (not in client code)
- ✅ OpenAI API calls proxied through `/api/voice` endpoint
- ✅ Rate limiting on proxy (10 req/min per client)

**Example Commands:**
- "Zoom to plot 25"
- "Show me east-facing plots under 20 lakhs"
- "Measure distance to the highway"
- "Start the project overview tour"

#### scene-context.js 🔨 (To Be Created)
**Purpose:** Serialize current map state for AI consumption  
**Methods:**
- `getSceneContext()` - Export current view, selected plots, filters
- `setSceneContext(context)` - Restore previously saved context
- `watchViewChanges(callback)` - Observe changes

**Context Shape:**
```javascript
{
  camera: { lat, lng, height, heading, pitch },
  selectedPlots: [plotIds],
  visiblePlots: [plotIds],
  filters: { facing: 'East', maxPrice: 2000000 },
  measuredDistances: [{ label, distance_m }],
  lastAction: 'plot_selected'
}
```

#### spatial-tools.js 🔨 (To Be Created)
**Purpose:** AI-callable function implementations  
**Methods:**
- `zoomToPlot(plotId, duration?)` - Focus on specific plot
- `filterPlots(criteria)` - Show/hide based on filters
- `measureDistance(from, to)` - Calculate distance
- `showNearestAmenity(plotId, type)` - Find closest school/hospital
- `playTourForPlots(plotIds)` - Generate dynamic tour

---

## Phase 3: Sales Experience (TO DO)

### 3.1 Components

#### hud.js 🔨 (To Be Created)
**Purpose:** Dashboard overlay with real estate focus  
**Elements:**
- Plot details panel (on selection)
- Data provenance labels ("Satellite: Visual Reference", "GV Infra: Verified")
- EMI calculator widget
- Status legend (Available, Reserved, Sold)
- WhatsApp/Call CTA buttons

#### effects.js 🔨 (To Be Created)
**Purpose:** Atmospheric controls (day/sunset/night)  
**Methods:**
- `setDaytime()` - Standard daylight lighting
- `setSunset()` - Golden hour lighting effect
- `setNight()` - Dark lighting with street lights
- `getEffectPresets()` - List available atmospheres

**Implementation:** Adjust Cesium `viewer.scene.light` and post-processing

#### annotations.js 🔨 (To Be Created)
**Purpose:** Whiteboard drawing overlay  
**Methods:**
- `startDrawing()` - Enter draw mode
- `addPolyline(coordinates, color)` - Draw line
- `addPolygon(coordinates, color, opacity)` - Draw area
- `addLabel(coordinate, text)` - Add text annotation
- `clearAll()` - Remove all annotations
- `exportAnnotations()` - Save as GeoJSON

---

## Phase 4: Premium Experience (TO DO)

### 4.1 Components

#### advanced-experiences.js 🔨 (To Be Created)
**Purpose:** Advanced features for premium engagement  
**Methods:**
- `startDroneSplineFlight()` - Smooth drone-like path animation
- `show360View(plotId)` - Panoramic view from plot
- `playNarration(text, voice='en-US')` - Guided narration during tour
- `generateShareableURL(sceneState)` - Create shareable link with saved view
- `enableWebXR()` - AR mode for mobile devices

---

## Integration Checklist

### Before Production Deployment

- [ ] **Licensing Verified** (Phase 0)
  - [ ] Google Maps API key configured (GCP billing enabled)
  - [ ] Cesium Ion token valid
  - [ ] OpenAI key (Phase 2) for voice

- [ ] **Data Ready** (Phase 0)
  - [ ] Survey-verified project boundary GeoJSON
  - [ ] Complete 302-plot inventory with facing/area
  - [ ] Road network GeoJSON
  - [ ] Amenity POI dataset

- [ ] **Phase 1 Tests**
  - [ ] All providers tested in fallback chain
  - [ ] Offline mode functional (MapLibre fallback works)
  - [ ] Plot selection and highlighting works
  - [ ] Camera animations smooth and responsive

- [ ] **Phase 2 Tests**
  - [ ] Voice transcription works end-to-end
  - [ ] API proxy serving requests without leaking keys
  - [ ] AI commands execute correctly

- [ ] **Phase 3 Tests**
  - [ ] HUD overlay renders correctly
  - [ ] Effects (day/sunset/night) work smoothly
  - [ ] Annotations can be drawn, saved, exported

- [ ] **Security Audit**
  - [ ] No API keys in client code
  - [ ] Server-side proxy for OpenAI/Google
  - [ ] Rate limiting on all endpoints
  - [ ] CORS configured correctly

- [ ] **Performance Baseline**
  - [ ] Initial load < 3s (LCP < 2.5s)
  - [ ] Camera animations smooth @ 60 FPS
  - [ ] Tile loading doesn't block UI
  - [ ] No memory leaks in long sessions

---

## File Dependencies

```
cesium-3d-init.js
├── map-stack.js (providers)
├── camera-director.js (camera control)
├── cinematic-tour.js (tours)
├── terrain.js (elevation)
├── project-layer.js (geometry)
├── plot-tracking.js (interactivity)
├── measurement.js (tools)
│
├── voice-agent.js (Phase 2)
│   ├── scene-context.js
│   └── spatial-tools.js
│
└── visualization/
    ├── hud.js (Phase 3)
    ├── effects.js (Phase 3)
    ├── annotations.js (Phase 3)
    └── advanced-experiences.js (Phase 4)
```

---

## Configuration (config/providers.json)

```json
{
  "providers": {
    "imagery": [
      { "name": "google_3d_tiles", "enabled": true, "failoverPriority": 1 },
      { "name": "cesium_ion", "enabled": true, "failoverPriority": 2 },
      { "name": "bhuvan_wms", "enabled": true, "failoverPriority": 3 },
      { "name": "osm_fallback", "enabled": true, "failoverPriority": 4 }
    ],
    "terrain": [
      { "name": "cesium_world_terrain", "enabled": true },
      { "name": "ellipsoid_fallback", "enabled": true }
    ]
  }
}
```

---

## Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Create `.env` (not committed to git):
```bash
GOOGLE_MAPS_API_KEY=your-production-key
CESIUM_ION_TOKEN=your-token
OPENAI_API_KEY=your-key  # For Phase 2
NODE_ENV=development
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Load index.html (Homepage)
- Hero 3D canvas works (Phase 1)
- 3D Masterplan tab works (Phase 1)

### 5. Load project.html (3D Viewer)
- Cesium globe renders (Phase 1)
- Plot selection works (Phase 1)
- Tours execute (Phase 1)

---

## API Proxy Endpoints (Phase 2+)

### Server Setup (Node.js/Express)
```javascript
// /api/voice - OpenAI voice API proxy
POST /api/voice
Body: { audioBlob, language: 'en-US' }
Response: { transcript, interpretedCommand, confidence }

// /api/map-tiles - Google 3D Tiles proxy
GET /api/map-tiles/:tilePath?key=internal-only
Response: tile bytes

// /api/commands - AI spatial command execution
POST /api/commands
Body: { command: 'zoom to plot 25', sceneContext: {...} }
Response: { executed: true, result: {...} }
```

---

## Debugging

### Check Provider Status
```javascript
// In browser console
window.mapStack.getCurrentProvider()
// Output: { imagery: 'cesium_ion', terrain: 'cesium_world_terrain', isOnline: true }
```

### View Error Log
```javascript
window.mapStack.getErrorLog()
// Shows all provider failures and fallbacks
```

### Camera Status
```javascript
window.cameraDirector.getStatus()
// Output: { isAnimating: false, tourActive: false, queueLength: 0 }
```

### Tour Progress
```javascript
window.cinematicTour.getStatus()
// Output: { isPlaying: true, currentStep: 3, totalSteps: 10, progress: 30 }
```

---

## Performance Tips

1. **Provider Caching**: Tile cache survives page reloads
2. **Lazy Loading**: Imagery loaded only when visible
3. **Terrain Decimation**: Use lower detail for mobile
4. **Plot Clustering**: Group far-away plots at low zoom
5. **Selective Rendering**: Hide plots outside viewport

---

## Production Checklist

- [ ] All Phase 0 requirements met
- [ ] Phase 1 complete and tested
- [ ] Phase 2 API proxy secure
- [ ] Phase 3 UI polished
- [ ] Phase 4 (optional) features working
- [ ] Security audit passed
- [ ] Performance targets met (LCP < 2.5s)
- [ ] Error tracking configured
- [ ] Rate limiting enabled
- [ ] SSL/HTTPS enforced

---

**Next:** Execute Phase 1 architecture build, then Phase 2-4 features.
