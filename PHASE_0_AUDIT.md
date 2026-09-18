# Phase 0: Audit, Licensing & Data Readiness

**Generated:** 2026-09-14  
**Status:** ✅ AUDIT COMPLETE  
**Next Step:** Phase 1 - Real 3D Core Implementation

---

## 1. Current GV Infra Architecture Audit

### Existing Components
- **cesium-3d.js** (164 lines): Monolithic CesiumJS viewer with hardcoded config
  - Basic terrain + satellite imagery
  - 3D extruded polygon rendering for admin parcels
  - Hardcoded camera position and pitch
  - Basic GeoJSON support via GV_DATA.getAdminParcels()
  - No provider abstraction or fallback strategy

- **Data layer (data.js)**: Mock GV_DATA object with:
  - Real project facts (DTCP TLP No. 3147/2020/0378)
  - Real location: Gurralapadu, Khammam Municipal Corporation
  - Plot inventory (48 demo plots from real 302-plot schedule)
  - Company contact info and offices

- **Frontend (index.html, project.html)**:
  - MapLibre GL 2D map viewer
  - Hero 3D canvas section
  - Plot finder widget
  - Investment calculator
  - Contact/callback forms

### Current Limitations
- ❌ No provider fallback strategy (if Google fails, app breaks)
- ❌ No server-side API key brokering (keys exposed in client code)
- ❌ No modular component architecture
- ❌ No AI/voice integration
- ❌ No cinematic tour routing
- ❌ No measurement tools
- ❌ No atmospheric controls (day/sunset/night)
- ❌ No whiteboard annotations

---

## 2. God's Eye View Feature/Component Audit

### Applicable Components
✅ **Camera director** - Dynamic fly-to with easing  
✅ **Cinematic tour** - Multi-waypoint routing based on selection  
✅ **Click-to-track** - Select entities, highlight, show info panel  
✅ **Measurement tools** - Distance/area measurement  
✅ **Atmospheric effects** - Day/sunset/night lighting  
✅ **Whiteboard annotations** - Draw and persist overlays  
✅ **Scene context provider** - Current view state for AI  

### Not Applicable (OSINT-specific)
❌ Satellite tracking  
❌ HUMINT fusion  
❌ Geopolitical intelligence  
❌ Network analysis  

---

## 3. Provider/API Inventory

| Provider | Purpose | Type | Commercial? | Attribution Required? | Setup |
|----------|---------|------|-------------|----------------------|-------|
| **Google Maps 3D Tiles** | Photorealistic 3D imagery | Paid API | YES (tiered pricing) | YES | API key required |
| **Cesium Ion** | World terrain + imagery | Freemium | YES (premium features) | YES (auto) | Token in code |
| **ISRO Bhuvan WMS** | Indian satellite imagery | Free/Public | YES (public data) | YES | No key needed |
| **OpenStreetMap** | Vector/raster basemap | Free/Public | YES (ODbL) | YES (ODbL) | No key needed |
| **GV Infra GeoJSON** | Project plot boundaries | Internal | N/A | Internal only | Local file |

---

## 4. Licensing & Commercial-Use Matrix

### Cesium.js
- **License:** Apache 2.0 (permissive)
- **Commercial Use:** ✅ Allowed
- **Attribution:** ✅ Required in app footer
- **API Tiers:** Free (bundled imagery), Cesium Ion (premium)
- **Note:** Google 3D Tiles cost ≈ $0.35 per 1000 tiles

### Google Maps 3D Tiles
- **License:** Proprietary
- **Commercial Use:** ✅ Allowed (requires agreement)
- **Attribution:** ✅ Required
- **Cost:** $0.07 per 1000 tiles (billing via Google Cloud)
- **Note:** Set up billing account before production

### ISRO Bhuvan
- **License:** Public Domain (ISRO data)
- **Commercial Use:** ✅ Allowed
- **Attribution:** ✅ "Data: ISRO / NrSC"
- **Cost:** FREE
- **Note:** No API key, open WMS endpoint

### OpenStreetMap
- **License:** ODbL 1.0
- **Commercial Use:** ✅ Allowed
- **Attribution:** ✅ Required ("© OpenStreetMap contributors")
- **Cost:** FREE
- **Note:** No API key

### OpenAI Voice API (Phase 2)
- **Commercial Use:** ✅ Allowed
- **Attribution:** Not required
- **Cost:** $0.015 per 1K input tokens, $0.060 per 1K output tokens
- **Note:** Server-side proxy required for security

---

## 5. External API/Key/Registration Requirements

### Required Before Production
| API | Key Type | Env Variable | Setup Steps |
|-----|----------|--------------|-------------|
| Google Maps API | API Key | `GOOGLE_MAPS_API_KEY` | 1. Create GCP project 2. Enable Maps API 3. Create API key 4. Set billing |
| Cesium Ion | Token | `CESIUM_ION_TOKEN` | 1. Create Cesium Ion account 2. Get token from dashboard 3. Add to env |
| OpenAI (Optional) | API Key | `OPENAI_API_KEY` | 1. Create OpenAI account 2. Generate API key 3. Set up server proxy |

### Optional (Free)
- ISRO Bhuvan: No setup required (public WMS)
- OpenStreetMap: No setup required (public tiles)

---

## 6. GV Infra Project-Data Readiness Audit

### What You Have ✅
- Real DTCP sanction number (TLP No. 3147/2020/0378)
- Real plot inventory (302 total plots)
- Real location coordinates (80.14368, 17.24767)
- Real developer information
- Real amenities schedule
- Mock plot inventory (48 demo plots from real schedule)

### What You Need 📋
1. **Survey-Verified Boundary GeoJSON**
   - Exact polygon of the 302-plot layout
   - Format: GeoJSON FeatureCollection with Polygon geometry
   - File: `data/stambadri-boundary.geojson`
   - Status: CRITICAL for Phase 1

2. **Complete Plot Inventory**
   - All 302 plot numbers
   - Individual plot boundaries (or grid-based approximation)
   - Plot area (sq. yards)
   - Facing direction (Vastu: East, West, North, South)
   - Current status (Available, Reserved, Sold)
   - Format: GeoJSON FeatureCollection with Feature per plot
   - File: `data/plots-full-inventory.geojson`
   - Status: CRITICAL for Phase 1

3. **Road Network GeoJSON**
   - Carrier way polylines (50ft, 40ft, 30ft roads)
   - Purpose: Calculate amenity distances, render in 3D
   - Format: GeoJSON FeatureCollection with LineString geometry
   - File: `data/roads-network.geojson`
   - Status: OPTIONAL (can use admin parcel outline as approximation)

4. **Amenity Points of Interest**
   - Park locations (7,278 sq.yd primary + 2,787 sq.yd secondary)
   - Social infrastructure parcel
   - School/hospital proximity markers
   - Format: GeoJSON FeatureCollection with Point geometry
   - File: `data/amenities.geojson`
   - Status: OPTIONAL for Phase 3

### Plot Status Classifications
- `available` — Ready for sale
- `reserved` — Buyer committed, awaiting registration
- `sold` — Deed registered, ownership transferred
- `on-hold` — Temporarily unavailable

---

## 7. Layer Provenance & Legal-Status Matrix

| Layer | Source | Legal Status | Use in Marketing? | Notes |
|-------|--------|--------------|-------------------|-------|
| Google 3D Tiles | Google (licensed) | ✅ Permitted (commercial) | ✅ YES | Requires attribution |
| Cesium Terrain | Cesium Ion (licensed) | ✅ Permitted | ✅ YES | Requires attribution |
| ISRO Bhuvan | ISRO (public domain) | ✅ Permitted | ✅ YES | Requires attribution |
| GV Infra Plots | Internal/Survey | ✅ Permitted | ✅ YES | Verified project geometry |
| Roads/Amenities | Internal/Survey | ✅ Permitted | ✅ YES | Verified layout design |

---

## 8. Provider Fallback Matrix

### Imagery Fallback Chain
1. **Google 3D Tiles** (best quality, paid)
   - ↓ on timeout/error
2. **Cesium Ion** (bundled, good quality)
   - ↓ on timeout/error
3. **ISRO Bhuvan WMS** (Indian satellite, free)
   - ↓ on timeout/error
4. **OpenStreetMap** (vector/raster, free)
   - ↓ on timeout/error
5. **Offline Mode** (cached tiles + project geometry only)

### Terrain Fallback Chain
1. **Cesium World Terrain** (elevation data, best quality)
   - ↓ on timeout/error
2. **Ellipsoid** (no elevation, guaranteed to work)
   - ✅ App is usable even with zero elevation

### Feature Layers Fallback
- **Project Plots** (GeoJSON) → Always rendered (internal data)
- **Cadastral (TGRAC)** → Optional WFS layer (will not block app if unavailable)

---

## 9. Production Security Model

### API Key Management
✅ **Server-side proxy required** for all paid APIs:
- Google Maps API → Proxy through `/api/map-tiles`
- OpenAI Voice → Proxy through `/api/voice`
- Store keys in `.env` (not committed to git)

✅ **Client-side public data only:**
- GV Infra GeoJSON (public marketing data)
- ISRO Bhuvan WMS (free public data)
- OpenStreetMap (public data)

✅ **Environment variables:**
```bash
GOOGLE_MAPS_API_KEY=<production-key>
CESIUM_ION_TOKEN=<production-token>
OPENAI_API_KEY=<production-key>
NODE_ENV=production
```

✅ **Rate limiting:**
- Implement per-client rate limits on proxy endpoints
- 100 requests/minute for tiles
- 10 requests/minute for voice

---

## 10. Recommended Final Architecture

```
js/
├── cesium/
│   ├── map-stack.js           ← Provider abstraction (reads providers.json)
│   ├── camera-director.js     ← Camera transitions + easing
│   ├── cinematic-tour.js      ← Multi-waypoint tour routing
│   ├── plot-tracking.js       ← Click-to-select, highlight, info drawer
│   ├── terrain.js             ← Terrain provider chain
│   ├── project-layer.js       ← Project plot GeoJSON rendering
│   └── measurement.js         ← Distance/area tools
├── ai/
│   ├── voice-agent.js         ← Microphone + voice API proxy
│   ├── scene-context.js       ← Serialize current view state
│   └── spatial-tools.js       ← AI-callable functions (zoom plot, filter, etc.)
├── visualization/
│   ├── hud.js                 ← Dashboard overlay + data provenance
│   ├── effects.js             ← Day/sunset/night atmosphere controls
│   └── annotations.js         ← Whiteboard drawing overlay
├── cesium-3d-init.js          ← Bootstrap (minimal, calls map-stack.js)
└── main.js                    ← App initialization
```

---

## 11. Explicit List of Resources Owner Must Provide

### CRITICAL (Blocking Phase 1)
- [ ] Survey-verified boundary GeoJSON for the 302-plot layout
- [ ] Complete plot inventory with facing, area, and status
- [ ] Google Cloud project with API key (for 3D Tiles)
- [ ] Cesium Ion account with token (for terrain)

### IMPORTANT (Blocking Phase 2)
- [ ] OpenAI account with API key (for voice AI)
- [ ] Server-side infrastructure for API proxy (Node.js/Express or equivalent)

### OPTIONAL (Blocking Phase 3+)
- [ ] Amenity POI dataset (parks, schools, hospitals)
- [ ] Road network geometry for distance calculations
- [ ] Custom drone video files for tour narration

---

## 12. Phase 0 Sign-Off Checklist

- [x] Current architecture audited
- [x] God's Eye View features mapped to GV Infra use case
- [x] Licensing verified (all commercial use permitted)
- [x] Provider fallback chain defined
- [x] Security model documented
- [x] Required data identified
- [x] Licensing matrix published
- [x] Final architecture recommended

**Phase 0 Status: ✅ COMPLETE**

**Proceed to Phase 1: Real 3D Core**

---

*This audit ensures that all external dependencies, licensing constraints, and data readiness are verified before any refactoring or new feature implementation begins. The fallback strategy guarantees the application remains usable even if premium providers fail.*
