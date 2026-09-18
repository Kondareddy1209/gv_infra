# God's Eye View for GV Infra: Quick Start Guide

**TL;DR:** Complete modular 3D real estate platform with graceful fallbacks.

---

## 5-Minute Setup

### 1. Clone & Install
```bash
git clone <repo>
cd gv-infra-mvp
npm install
```

### 2. Environment Setup
```bash
# Copy .env.example to .env
cp .env.example .env

# Add your keys:
# GOOGLE_MAPS_API_KEY=your-key
# CESIUM_ION_TOKEN=your-token
# OPENAI_API_KEY=your-key (Phase 2 optional)
```

### 3. Start Dev Server
```bash
npm run dev
# Opens http://localhost:3000
```

### 4. View the Demo
- **Homepage** (index.html): Hero section with 3D canvas
- **3D Masterplan** (project.html): Interactive globe
- **Admin Panel** (admin.html): Manage plot inventory

---

## Architecture at a Glance

### Before (Monolithic)
```
cesium-3d.js (164 lines)
├─ hardcoded provider
├─ basic terrain
├─ simple GeoJSON rendering
└─ no fallbacks → app breaks if provider fails
```

### After (Modular)
```
cesium-3d-init.js (orchestrator)
├─ map-stack.js (provider chain: Google → Cesium → Bhuvan → OSM → Offline)
├─ camera-director.js (smooth transitions)
├─ cinematic-tour.js (guided flyovers)
├─ plot-tracking.js (click-to-select)
├─ project-layer.js (GeoJSON render)
├─ terrain.js (elevation chain)
└─ measurement.js (distance/area tools)
   + visualization/ (HUD, effects, annotations)
   + ai/ (voice commands, spatial AI)
   + advanced-experiences/ (drone flights, 360°, WebXR)
```

---

## Usage Examples

### Initialize the Viewer
```javascript
// Old way (monolithic):
const viewer = new CesiumLandViewer('cesium-container');
await viewer.init();

// New way (modular + fallbacks):
const viewer = new Cesium.Viewer('cesium-container');
const mapStack = new MapStack(viewer, providersConfig);
await mapStack.initializeProviders(); // Handles fallback chain

const camera = new CameraDirector(viewer);
const tour = new CinematicTour(camera);
const plots = new ProjectLayer(viewer);
const tracking = new PlotTracking(viewer);
```

### Fly to a Location
```javascript
const camera = window.cameraDirector;
await camera.flyToLocation(17.24767, 80.14368, 450, 2.5);
// lat, lng, height(m), duration(s)
```

### Start a Cinematic Tour
```javascript
const tour = window.cinematicTour;
tour.playPresetTour('project-overview'); // Built-in tour
// or
tour.createDynamicTour([plot1, plot2, plot3]); // Custom
```

### Select a Plot
```javascript
const tracking = window.plotTracking;
tracking.selectPlot('S-101'); // Highlight plot, show info drawer

// Listen for selection changes
window.addEventListener('plot:selected', (e) => {
  console.log('Selected plot:', e.detail.plot);
});
```

### Measure Distance
```javascript
const measurer = window.measurementTools;
measurer.startMeasure('distance'); // Click on map to measure
measurer.getMeasurements(); // Get all measurements
```

### Use Voice Commands (Phase 2)
```javascript
const voice = window.voiceAgent;
await voice.startListening(); // Activate microphone
// User says: "Zoom to plot 25"
// → Interpreted by AI
// → Executed: camera.flyToPlot(plot25)
```

### Apply Day/Sunset/Night Effect (Phase 3)
```javascript
const effects = window.visualEffects;
effects.setDaytime();   // Standard daylight
effects.setSunset();    // Golden hour
effects.setNight();     // Dark + street lights
```

---

## File Structure

```
js/
├── cesium/
│   ├── cesium-3d-init.js         ← Start here
│   ├── map-stack.js               ← Provider management
│   ├── camera-director.js         ← Camera control
│   ├── cinematic-tour.js          ← Tours
│   ├── plot-tracking.js           ← Selection
│   ├── terrain.js                 ← Elevation
│   ├── project-layer.js           ← GeoJSON
│   ├── measurement.js             ← Tools
│   └── advanced-experiences.js    ← Phase 4
├── ai/
│   ├── voice-agent.js             ← Microphone
│   ├── scene-context.js           ← State serialization
│   └── spatial-tools.js           ← AI functions
├── visualization/
│   ├── hud.js                     ← Dashboard
│   ├── effects.js                 ← Atmosphere
│   └── annotations.js             ← Whiteboard
├── data.js                        ← Mock data
├── main.js                        ← Page initialization
└── ...

config/
└── providers.json                 ← Provider configuration

data/
├── stambadri-boundary.geojson    ← Project boundary
├── plots-inventory.geojson       ← Plot geometries
├── roads-network.geojson         ← Road lines
└── amenities.geojson             ← POIs
```

---

## Configuration

### config/providers.json
```json
{
  "providers": {
    "imagery": [
      {
        "name": "google_3d_tiles",
        "enabled": true,
        "failoverPriority": 1
      },
      {
        "name": "cesium_ion",
        "enabled": true,
        "failoverPriority": 2
      }
    ],
    "terrain": [
      {
        "name": "cesium_world_terrain",
        "enabled": true
      }
    ]
  }
}
```

**Fallback Priority:**
- 1 = Try first
- 2 = If 1 fails, try this
- 3 = If 2 fails, try this
- etc.

If all fail → **Offline Mode** (project geometry only, no satellite/terrain)

---

## Security Best Practices

✅ **DO:**
- Store API keys in `.env` (not committed)
- Use server-side proxy for OpenAI/Google APIs
- Validate user input on server
- Use HTTPS in production
- Implement rate limiting

❌ **DON'T:**
- Hardcode API keys in JS files
- Expose keys in HTML data attributes
- Call paid APIs directly from client
- Skip CORS validation
- Log sensitive data to console

---

## Troubleshooting

### Problem: "Cesium not loaded"
**Solution:** Make sure CesiumJS is loaded before running:
```html
<script src="https://cesium.com/downloads/cesiumjs/releases/1.114/Cesium.js"></script>
```

### Problem: Map not showing, all providers failed
**Solution:** Check error log:
```javascript
console.log(window.mapStack.getErrorLog());
```
Common causes:
- API key invalid or expired
- Network timeout (check connection)
- CORS blocked (check browser console)

### Problem: Offline mode activated but plots not showing
**Solution:** Ensure GeoJSON files are loaded:
```javascript
console.log(window.GV_DATA.getAdminParcels());
```

### Problem: Tour not playing
**Solution:** Check tour status:
```javascript
window.cinematicTour.getStatus();
// Check if isPlaying, isPaused, or error
```

### Problem: Voice commands not working
**Solution:** Check API proxy is running and keys are set:
```javascript
window.voiceAgent.healthCheck(); // Returns true if ready
```

---

## Testing Checklist

- [ ] Homepage loads (hero 3D canvas works)
- [ ] project.html loads (Cesium globe renders)
- [ ] Plot selection works (click plot → highlight)
- [ ] Tour plays (click "Explore" button)
- [ ] Camera transitions smooth (no stuttering)
- [ ] Offline mode works (disable provider, app stays usable)
- [ ] Voice commands execute (Phase 2)
- [ ] Effects render correctly (Phase 3)
- [ ] Performance is good (monitor in DevTools)

---

## Performance Targets

| Metric | Target | How to Check |
|--------|--------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | DevTools > Lighthouse |
| INP (Interaction to Paint) | < 200ms | DevTools > Responsiveness |
| CLS (Cumulative Layout Shift) | < 0.1 | DevTools > Lighthouse |
| Initial Tile Load | < 3s | Network tab |
| Camera Animation | 60 FPS | DevTools > Performance |

---

## Production Deployment

### Environment Setup
1. Create GCP project for Google Maps API
2. Enable billing (Google charges per tile)
3. Get Cesium Ion token from cesium.com
4. Set up OpenAI API key (Phase 2)
5. Deploy server proxy for API key brokering

### Pre-Launch Checklist
- [ ] All API keys configured
- [ ] Provider fallback chain tested
- [ ] Security audit passed
- [ ] Performance benchmarked
- [ ] Error tracking enabled (Sentry/LogRocket)
- [ ] Rate limiting configured
- [ ] SSL/HTTPS enabled
- [ ] Monitoring set up (DataDog/New Relic)

### Deploy Steps
```bash
# Build for production
npm run build

# Run tests
npm run test

# Deploy to server
npm run deploy

# Monitor
npm run logs
```

---

## Getting Help

### Documentation
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Full architecture
- [PHASE_0_AUDIT.md](PHASE_0_AUDIT.md) - Licensing & data readiness
- [Cesium.js Docs](https://cesium.com/learn/cesiumjs/) - Official reference

### Support
- GitHub Issues for bugs
- Discussions for questions
- Email: info@gvinfraprojects.com (for GV Infra specific questions)

---

## What's Next?

1. **Phase 1** ✅ - Real 3D core (in progress)
2. **Phase 2** 🔨 - Spatial AI (voice commands)
3. **Phase 3** 🔨 - Sales experience (HUD, effects)
4. **Phase 4** 🔨 - Premium features (drone, 360°, WebXR)

Each phase builds on the previous one. You can launch with Phase 1 alone and add features incrementally.

---

**Ready to build? Start with `npm run dev` and open project.html in your browser!**
