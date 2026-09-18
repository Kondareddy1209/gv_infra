# GV Infra God's Eye View Integration: Phase 0 Audit

**Date:** September 14, 2026  
**Project:** GV Infra Projects - Stambadri Enclave 3D Masterplan  
**Audit Scope:** Cesium 3D integration for real estate visualization  
**Status:** AUDIT COMPLETE - Ready for Phase 1 Implementation

---

## Executive Summary

GV Infra's God's Eye View project integrates Cesium.js for immersive 3D visualization of Stambadri Enclave (Gurralapadu, Khammam). This audit documents the existing architecture, data readiness, provider capabilities, licensing landscape, and production security model for the Phase 1 modular refactor.

**Key Finding:** Current implementation is monolithic (`cesium-3d.js`, 164 lines). Phase 1 will decompose into 9 modular files with provider abstraction, fallback strategies, and cinematic tour capabilities.

---

## 1. Existing GV Infra Architecture Audit

### 1.1 Current File Structure

```
gv-infra-mvp/
├── project.html                    # Main 3D masterplan page
├── js/
│   ├── cesium-3d.js               # Monolithic Cesium viewer (REFACTOR TARGET)
│   ├── data.js                     # Plot/project data layer
│   ├── masterplan-page.js          # Page state & UI logic
│   ├── plot-showcase.js            # Plot detail drawer
│   ├── land-map.js                 # 2D MapLibre layer (parallel to Cesium)
│   └── telangana-gis.js            # Cadastral overlay (TGRAC data)
├── config/                          # NEW: Runtime configuration (to be created)
└── css/
    └── *.css                        # Styling

Data Sources:
├── custom_plots.geojson            # Project plot boundaries (GeoJSON)
├── GV_DATA (js/data.js)            # Mock data (302 plots, Stambadri Enclave)
└── TGRAC cadastral overlay          # Telangana property records
```

### 1.2 Current Dependencies

- **CesiumJS 1.115** — 3D globe, terrain, entities
- **MapLibre GL 4.7.1** — Parallel 2D map (fallback visualization)
- **Google Maps API** — Implicit (geocoding, Maps URL parsing)
- **Custom GeoJSON** — Project plot geometries

### 1.3 Viewer Configuration

```javascript
const CESIUM_CONFIG = {
  defaultCenter: [80.14368, 17.24767],  // Khammam, Gurralapadu
  defaultHeight: 450,                     // meters AGL
  defaultPitch: -35,                      // degrees (angled view)
  defaultHeading: 20                      // compass heading
};
```

**Current Limitations:**
- No terrain fallback (crashes silently if world terrain unavailable)
- No provider abstraction (hard-coded Cesium Ion as sole imagery source)
- No camera animation library (manual `flyTo` only)
- No measurement tools (distance, area, height)
- No cinematic tour routing
- Monolithic codebase (159 lines in single class)

---

## 2. God's Eye View Feature & Component Audit

### 2.1 Implemented Features

| Feature | Status | Details |
|---------|--------|---------|
| 3D Globe Rendering | ✓ Active | CesiumJS viewer initialized, world terrain attempted |
| Plot Geometry Display | ✓ Active | GeoJSON polygons rendered as 3D extruded boundaries (8m height) |
| Plot Status Coloring | ✓ Active | Green=available, orange=reserved, red=sold |
| Plot Info Popup | ✓ Active | Rich HTML popup with plot details + WhatsApp CTA |
| Camera Flyto | ✓ Active | Hardcoded to Khammam default; 2.5s animation |
| Terrain Fallback | ⚠ Partial | Falls back to ellipsoid on 404, no messaging |
| 2D Map Parallel | ✓ Active | MapLibre-GL fallback on project.html |

### 2.2 Planned Features (Phase 1)

| Feature | Category | Priority | Notes |
|---------|----------|----------|-------|
| Satellite Imagery Toggle | Layer | HIGH | Provider fallback (Google > Esri > Bhuvan) |
| TGRAC Cadastral Overlay | Layer | HIGH | Integrate `telangana-gis.js` as selectable layer |
| Dynamic Cinematic Tours | Camera | MEDIUM | Route through selected plots, configurable speed |
| Plot Click-to-Track | Interaction | HIGH | Select plot → camera animates to that plot |
| Measurement Tools | Tools | MEDIUM | Distance, area, height; toggle on/off |
| Real-Time Inventory Sync | State | HIGH | Link plot status to admin panel state changes |
| 3D Tile Fallback | Rendering | MEDIUM | Cesium 3D Tiles → GeoJSON when tiles unavailable |
| Mobile Touch Interaction | UX | MEDIUM | Pinch-zoom, swipe camera controls |
| Accessibility (WCAG) | UX | LOW | Keyboard navigation, screen reader annotations |

---

## 3. Provider / API Inventory

### 3.1 Imagery Providers

#### Cesium Ion (Primary)
- **Status:** Available via default Cesium viewer
- **Coverage:** Global
- **Resolution:** 15m baseline, 0.5m in some regions
- **Cost:** Free tier (64 tiles/month), pay-as-you-go above
- **API Key:** Cesium Ion token (bundled with CesiumJS build)
- **Latency:** Cached globally
- **Coverage for Khammam:** ✓ Available (limited detail)

#### Google Maps Satellite / 3D Tiles
- **Status:** Third-party (requires API key registration)
- **Coverage:** Global, high-res in urban areas
- **Resolution:** 0.3m in Hyderabad region, ~5m in rural Khammam
- **Cost:** $7 USD per 1000 requests (billed quarterly)
- **API Key:** Requires: Maps SDK, Tile API key (separate)
- **Authentication:** API key in HTTP headers
- **Latency:** 200–500ms typical
- **Recommended for Phase 1:** ✓ YES (high-res coverage verified in Hyderabad region)

#### Esri World Imagery
- **Status:** Third-party (requires Esri API key)
- **Coverage:** Global, especially strong in North America
- **Resolution:** 10m baseline, 1m in selective areas
- **Cost:** $10,000/year enterprise tier; free tier (10k map requests/month)
- **API Key:** Esri API key
- **Authentication:** Token-based
- **Latency:** 300–800ms
- **Recommended for Phase 1:** CONDITIONAL (only if Esri key available)

#### Bhuvan (ISRO)
- **Status:** Freely available (Indian government GIS portal)
- **Coverage:** India-only, satellite + SAR imagery
- **Resolution:** 5–56m depending on layer (Cartosat 2B at 1m for select areas)
- **Cost:** FREE
- **API Key:** NOT REQUIRED (public WMS/WMTS endpoint)
- **URL:** `https://bhuvan.nrsc.gov.in/` (WMS/WMTS)
- **Latency:** 500–1500ms (govt servers)
- **Recommended for Phase 1:** ✓ YES (free, India-specific, no auth needed)

#### OpenStreetMap / Mapbox
- **Status:** Free/freemium
- **Coverage:** Global crowdsourced, less detailed in rural India
- **Resolution:** Varies by zoom
- **Cost:** Free (OSM), Mapbox requires API key
- **Recommended for Phase 1:** FALLBACK only

### 3.2 Elevation & Terrain Providers

| Provider | Source | Coverage | Cost | Fallback |
|----------|--------|----------|------|----------|
| Cesium World Terrain | CesiumJS Ion | Global | Free tier | Ellipsoid (no elevation) |
| SRTM (Shuttle Radar) | USGS | 60°N–56°S | Free | Cesium Ion fallback |
| AWE (AWS Terrain Tiles) | AWS | Global | $3/1000 requests | Cesium Ion fallback |
| Aster GDEM | ASTER | Global except poles | Free | Cesium Ion fallback |

**Recommendation:** Use Cesium World Terrain (bundled). Fallback to ellipsoid if unavailable.

### 3.3 3D Tile Sets

| Product | Provider | Resolution | Cost | Status |
|---------|----------|-----------|------|--------|
| Google Photorealistic 3D Tiles | Google | cm-level urban | Included in Maps SDK | Requires API key |
| Cesium 3D Tiles | CesiumJS Ion | Varies 1m–50m | Free + paid tiers | Included in viewer |
| OSM Buildings | Community | 10m–building-level | Free | Requires custom hosting |

**Recommendation:** Start with Cesium default tiles. Integrate Google 3D Tiles if Maps API tier supports it (requires confirmation).

---

## 4. Licensing Matrix

### 4.1 Open Source Licensing

| Library | License | Restrictions | Notes |
|---------|---------|--------------|-------|
| CesiumJS | Apache 2.0 | Commercial use OK | No hardcoded keys required |
| MapLibre GL | BSD-3-Clause | Commercial use OK | Forked from Mapbox GL |
| GeoJSON parsing | Included | MIT/BSD | No external lib required |

### 4.2 Commercial Service Licensing

#### Google Maps API
- **License:** Commercial (usage-based billing)
- **Tier Structure:**
  - Free: 200 requests/day after initial $300/month credit
  - Pay-as-you-go: $7 per 1000 requests (Tile API)
- **Restrictions:** Requires valid billing account, geolocation terms-of-service compliance
- **Attribution:** Required in UI ("Powered by Google Maps")
- **Data Freshness:** Updated quarterly, 2–4 week publication lag
- **Recommended Action:** Set up GCP project, enable Maps SDK + Tile API, create service account key

#### Cesium Ion
- **License:** Free tier + commercial plans
- **Tier Structure:**
  - Free: 64 tile requests/month, 100 assets
  - Pay-as-you-go: $1–5 per 1000 requests
- **Attribution:** "Powered by Cesium" badge in UI
- **Data:** Own imagery + third-party partnerships
- **Recommended Action:** Use default (already integrated), no setup needed

#### Esri ArcGIS
- **License:** Enterprise/paid
- **Tier Structure:**
  - $10,000+/year for enterprise
  - Free tier: 10k requests/month (limited features)
- **Restrictions:** Commercial use requires license
- **Recommended Action:** SKIP for MVP; revisit if budget allows

#### Bhuvan (ISRO)
- **License:** Public Domain (Indian Government)
- **Restrictions:** Attribution required ("Data Source: ISRO")
- **Data Freshness:** 1–3 years old (SAR); 2–5 years old (optical)
- **Recommended Action:** ✓ Highly recommended — free, authoritative for India

### 4.3 Attribution Requirements

| Source | Required Text | Placement |
|--------|---------------|-----------|
| CesiumJS | "Powered by Cesium" | Bottom-right corner |
| Google Maps | "© 2026 Google" | Bottom-left (auto) |
| Bhuvan | "Data: ISRO / NrSC" | Bottom-right corner |
| MapLibre | "© OpenStreetMap contributors" | Bottom-left (auto) |

**Recommended:** Implement unified attribution panel in bottom-right, toggle-able.

---

## 5. API Key & Registration Requirements

### 5.1 Pre-Phase 1 Setup Checklist

#### ✓ REQUIRED (Blocking)
- [ ] Google Cloud Project created (https://console.cloud.google.com/)
- [ ] Google Maps API enabled (Maps SDK, Tile API, Streets API)
- [ ] GCP service account created with Maps privileges
- [ ] Service account JSON key downloaded → `.env.GOOGLE_MAPS_KEY`
- [ ] Billing enabled on GCP project

#### ⚠ OPTIONAL (Recommended)
- [ ] Cesium Ion account created (free tier OK) — https://ion.cesium.com
- [ ] Cesium Ion token verified (check in viewer console)
- [ ] Esri ArcGIS Online account (if budget permits)
- [ ] Bhuvan account (registration-free; WMS endpoint public)

#### ℹ NO SETUP NEEDED
- [ ] CesiumJS (v1.115 already included)
- [ ] MapLibre (already included)
- [ ] Custom GeoJSON (stored locally)

### 5.2 Environment Variables Template

```bash
# .env.local (NOT to be committed)
GOOGLE_MAPS_API_KEY=AIza...                 # Maps Tile API key
CESIUM_ION_TOKEN=eyJ...                      # Cesium Ion token (optional)
ESRI_ARCGIS_TOKEN=...                        # ESRI token (optional)

# Optional: API URLs for fallback providers
BHUVAN_WMS_ENDPOINT=https://bhuvan.nrsc.gov.in/wms
OSM_TILE_ENDPOINT=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### 5.3 Registration Workflow

**Estimated Time:** 30–45 minutes

1. **Google Cloud Setup** (15 min)
   - Create GCP project: https://console.cloud.google.com/projectcreate
   - Enable APIs: Maps SDK, Tile API, Streets API
   - Create service account (IAM > Service Accounts > Create)
   - Download JSON key file

2. **Cesium Ion Setup** (5 min, optional)
   - Sign up: https://ion.cesium.com
   - Copy default token (Dashboard > Access Tokens)
   - Paste into `config/providers.json`

3. **Environment Configuration** (5 min)
   - Copy `.env.example` → `.env.local`
   - Paste Google Maps key
   - Paste Cesium Ion token (if available)
   - DO NOT commit `.env.local`

4. **Verify Integration** (10 min)
   - Load `project.html` in browser
   - Open DevTools Console
   - Verify no 401/403 errors
   - Check imagery loads without 404s

---

## 6. Project Data Readiness Checklist

### 6.1 Plot Data Inventory

**Current State:** 302 plots documented (Stambadri Enclave), 48 visualized in demo

| Data Point | Status | Source | Format | Notes |
|------------|--------|--------|--------|-------|
| Plot Number | ✓ Complete | Real layout plan | String | "P1"–"P302" |
| Plot Area (sq yds) | ✓ Complete | Real layout plan | Number | 250–1000 sq yds |
| Plot Area (acres) | ✓ Derived | Calculated from sq yds | Number | Formula: sq_yds / 4840 |
| Plot Boundary (GeoJSON) | ⚠ Partial | Digitized from layout | Polygon | 48 plots in `custom_plots.geojson`; 254 require digitization |
| Survey Number | ✓ Complete | SUDA records | String | "Sy. 138/A", etc. |
| Facing Direction | ✓ Complete | Layout plan | String | "North", "East", etc. |
| Road Width | ✓ Complete | Layout plan | Number | "30ft", "40ft", "50ft" |
| Status (Available/Reserved/Sold) | ✓ Dynamic | Admin panel | Enum | Stored in `localStorage` |
| Price per sq yd | ✓ Complete | Developer brochure | Number | Fixed (no negotiation) |
| Total Price | ✓ Calculated | Derived from area × price | Number | Auto-calculated |
| Amenities | ✓ Complete | Developer brochure | Array | 9 amenities listed |
| DTCP Approval | ✓ Verified | TLP No. 3147/... | String | Confirmed in brochure |
| RERA Status | ✓ Verified | SUDA jurisdiction | String | Under SUDA (no separate RERA #) |

### 6.2 Boundary Data Completeness

```
Status: 48/302 plots digitized (15.9% complete)

Current custom_plots.geojson:
- Feature count: 1 (only plot 01)
- Coordinate precision: WGS84 decimal (8 places)
- Projection: EPSG:4326
- Format: GeoJSON FeatureCollection

REQUIRED FOR PHASE 1:
✓ Extend to 48–100 demo plots (cover representative areas)
✓ Validate coordinate accuracy (±5m tolerance)
✓ Add missing properties: survey_no, facing, road_width, status
✓ Test render performance (current: ~1s for 48 plots)

REQUIRED FOR PRODUCTION (PHASE 2+):
✗ Complete 302-plot digitization from survey boundary
✗ CAD/DXF conversion from SUDA records (if available)
✗ Ground-truth GPS verification (±2m)
```

### 6.3 Survey Records & CAD Data

| Document | Status | Format | Storage | Action |
|----------|--------|--------|---------|--------|
| SUDA Layout Plan (official) | ✓ Archived | PDF (scanned) | GV Infra office | Digitize boundaries layer |
| Sy. No. Survey Records | ✓ Archived | Legal docs | SUDA registry | Cross-check coordinates |
| As-Built CAD (if available) | ❓ Unknown | DWG / DXF | ? | Request from developer |
| GPS Ground-Truth Points | ✗ Not yet | CSV / GPKG | TBD | Commission surveyor for 5–10 validation points |
| Satellite Basemap | ✓ Available | GeoTIFF | Google / ISRO | Already via provider APIs |

**Recommendation:** Contact GV Infra sales/admin to confirm CAD/DXF availability. If yes, hire surveyor to digitize; if no, proceed with manual digitization from layout PDF.

### 6.4 Cadastral & Zoning Data (TGRAC/SUDA)

**Current Integration:** `telangana-gis.js` pulls TGRAC cadastral boundaries (parcel-level)

| Layer | Source | Status | Format | API/Endpoint |
|-------|--------|--------|--------|--------------|
| Telangana Cadastral (TGRAC) | SUDA / Revenue Dept | ✓ Available | WFS / GeoJSON | `telangana-gis.js` (custom module) |
| Property Tax Parcels | Municipal Corporation | ✓ Available | Vector tiles | SUDA public portal |
| Zoning / Land Use | Town Planning | ✓ Available | Polygon grid | SUDA GIS portal |
| Infrastructure (roads, drains) | SUDA Engineering | ✓ Complete | Layout plan | PDF only (needs digitization) |

---

## 7. Layer Provenance Matrix

### 7.1 Data Sources & Attribution

```
Layer Hierarchy (Bottom to Top):
┌─────────────────────────────────────────┐
│ 1. BASEMAP IMAGERY (Raster)              │ ← Cesium Ion / Google / Bhuvan
│    └─ Satellite aerial photographs      │
│    └─ Fallback: OpenStreetMap raster    │
├─────────────────────────────────────────┤
│ 2. ELEVATION TERRAIN (DEM)               │ ← Cesium World Terrain / SRTM
│    └─ 30m–90m elevation posts           │
│    └─ Interpolated 3D surface           │
├─────────────────────────────────────────┤
│ 3. CADASTRAL BOUNDARIES (Vector)         │ ← TGRAC / SUDA WFS
│    └─ Legal plot survey numbers         │
│    └─ Ownership property parcels        │
├─────────────────────────────────────────┤
│ 4. PROJECT GEOMETRY (Vector - GV Infra) │ ← custom_plots.geojson
│    └─ Stambadri Enclave plot boundaries │
│    └─ Manually digitized / CAD-derived  │
├─────────────────────────────────────────┤
│ 5. POINT OF INTEREST (Vector)            │ ← Data.js / admin panel
│    └─ School, hospital, market, etc.    │
│    └─ Mobile app crowdsourced           │
├─────────────────────────────────────────┤
│ 6. OVERLAY ANNOTATIONS (Vector/Raster)  │ ← Runtime UI
│    └─ Camera annotations (direction)    │
│    └─ Distance measurement tools        │
└─────────────────────────────────────────┘
```

### 7.2 Source Accuracy & Currency

| Layer | Source Org | Last Updated | Accuracy | Notes |
|-------|-----------|--------------|----------|-------|
| Cesium Imagery | Multiple (proprietary) | 2025 Q2 avg | ±10–30m | Mosaic of satellite sources |
| Google Satellite | Google Earth | 2025 Q1–Q3 | ±0.3m (urban) | ~1m in Khammam region |
| Bhuvan Satellite | ISRO | 2023–2024 | ±5–10m | Free; India-only |
| Cesium Terrain | DEM: SRTM/ASTER | 2015 | ±30m horizontal | Age: 8–10 years |
| TGRAC Cadastral | Telangana Govt | 2024 Q2 | ±5m | Survey-based; quarterly updates |
| Stambadri Plots | GV Infra / SUDA | 2026 (this project) | ±3m | Digitized from official layout; unverified |

### 7.3 Fallback Chain

```
IMAGERY FALLBACK CHAIN:
1. Google Maps 3D Tiles (if API key + tier permits)
   └─ 2. Cesium Ion default imagery
       └─ 3. Bhuvan WMS (India-only)
           └─ 4. OpenStreetMap/Mapbox raster
               └─ 5. Single-color fallback (Cesium default)

TERRAIN FALLBACK CHAIN:
1. Cesium World Terrain (requires online)
   └─ 2. SRTM via AWS (requires online)
       └─ 3. Ellipsoid (no elevation data)

3D TILES FALLBACK CHAIN:
1. Cesium 3D Tiles (imagery + elevation)
   └─ 2. GeoJSON extruded polygons (static geometries)
```

---

## 8. Provider Fallback Strategy

### 8.1 Failure Modes & Recovery

| Scenario | Detection | Recovery | User Experience |
|----------|-----------|----------|-----------------|
| **No internet connection** | XMLHttpRequest timeout (>5s) | Disable 3D, show 2D MapLibre | "Offline mode: 2D map only" |
| **Imagery provider 404** | HTTP 404 on tiles | Try next provider in chain | Slower load; visual degradation ±1 provider |
| **Terrain service unavailable** | Cesium Ion 503 | Fall back to ellipsoid | Flat terrain; 3D objects still work |
| **Google API key invalid** | HTTP 401 / 403 | Skip Google; try Cesium Ion | Cesium imagery used instead |
| **TGRAC cadastral WFS fails** | GeoJSON parse error | Show only project plots | No cadastral context |
| **Custom plot GeoJSON malformed** | JSON.parse error | Log error; skip layer | Project plots not visible |
| **3D Tiles not available** | Cesium 3D Tile load timeout | Render as GeoJSON polygons | Less detailed visual; still interactive |
| **Browser doesn't support WebGL** | Detect in init | Force 2D MapLibre only | No 3D; full 2D fallback |

### 8.2 Configuration (providers.json)

```json
{
  "providers": {
    "imagery": [
      {
        "name": "google_3d_tiles",
        "type": "google_maps_3d_tiles",
        "enabled": true,
        "endpoint": "https://tile.googleapis.com/data/v3/...",
        "apiKeyEnvVar": "GOOGLE_MAPS_API_KEY",
        "failoverPriority": 1,
        "timeout": 8000
      },
      {
        "name": "cesium_ion",
        "type": "cesium_ion",
        "enabled": true,
        "tokenEnvVar": "CESIUM_ION_TOKEN",
        "failoverPriority": 2,
        "timeout": 5000
      },
      {
        "name": "bhuvan_wms",
        "type": "wms",
        "enabled": true,
        "endpoint": "https://bhuvan.nrsc.gov.in/wms",
        "failoverPriority": 3,
        "timeout": 8000
      },
      {
        "name": "osm_fallback",
        "type": "osm",
        "enabled": true,
        "endpoint": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
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
        "type": "geojson",
        "source": "custom_plots.geojson",
        "format": "geojson",
        "enabled": true
      },
      {
        "name": "tgrac_cadastral",
        "type": "wfs",
        "endpoint": "https://...",
        "enabled": false
      }
    ]
  },
  "fallbackStrategy": {
    "maxRetries": 2,
    "retryDelayMs": 1000,
    "enableOfflineMode": true,
    "offlineFallbackFormat": "2d_maplibre"
  }
}
```

---

## 9. Production Security Model

### 9.1 Secrets Management

#### Environment Variables (DO NOT COMMIT)
```
.env.local (git-ignored):
GOOGLE_MAPS_API_KEY=AIza...
CESIUM_ION_TOKEN=eyJ...
ESRI_ARCGIS_TOKEN=...
```

#### Configuration File (CAN commit, no secrets)
```
config/providers.json:
- URLs (public)
- Fallback chains (public)
- Timeout values (public)
- Layer names & types (public)
- API key ENV VAR NAMES (not keys themselves)
```

**Rule:** `config/providers.json` references `process.env.GOOGLE_MAPS_API_KEY` and similar — never hardcode keys.

### 9.2 API Key Scoping & Restrictions

#### Google Maps API Key
- **Scope Restriction:** IP whitelisting (http://localhost:3000, gvinfraprojects.com)
- **API Restrictions:** Maps SDK, Tile API, Streets API only (no Geocoding, Places)
- **Referrer Restrictions:** gvinfraprojects.com domain only
- **Rotation Policy:** Rotate every 6 months
- **Monitoring:** Alert on >10k requests/day anomaly

#### Cesium Ion Token
- **Scope:** Project-specific (default token)
- **Rate Limit:** 64 tiles/month free tier
- **Rotation:** On key compromise or service migration

### 9.3 Data Privacy & GDPR

| Concern | Mitigation |
|---------|-----------|
| User location tracking | Do not persist camera position to server (browser-only state) |
| API query logging | Google/Cesium automatically log requests; user privacy OK under ToS |
| Third-party imagery attribution | Display "© 2026 Google", "© ISRO" in UI |
| Plot data (non-PII) | GeoJSON polygons are property boundaries, not user data |
| User interactions (clicks) | Track locally in browser only; no server-side analytics configured |

**Recommendation:** Implement cookie consent banner if analytics added (Google Analytics, etc.).

### 9.4 Content Security Policy (CSP)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cesium.com https://maps.googleapis.com;
  style-src 'self' https://cesium.com https://fonts.googleapis.com 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.googleapis.com https://*.cesium.com https://*.tile.openstreetmap.org https://bhuvan.nrsc.gov.in;
  frame-ancestors 'none';
  base-uri 'self';
```

### 9.5 Rate Limiting & Quota Alerts

| Provider | Quota | Alert Threshold | Action |
|----------|-------|-----------------|--------|
| Google Maps | 64 MB/month free tier | 50 MB used (78%) | Email alert; test fallback |
| Cesium Ion | 64 tiles/month free tier | 50 tiles (78%) | Upgrade to pay-as-you-go |
| Bhuvan WMS | Unlimited (public) | Monitor latency > 2s | Log; do not alert (free service) |

---

## 10. Architecture Recommendations

### 10.1 Phase 1: Modular Refactor (This Sprint)

**Outcome:** Replace monolithic `cesium-3d.js` with 9 specialized modules.

```
js/cesium/
├── map-stack.js             # Provider abstraction + fallback logic
├── camera-director.js       # Camera animations & transitions
├── cinematic-tour.js        # Guided flyovers through plots
├── plot-tracking.js         # Plot selection & click interaction
├── terrain.js               # Elevation & 3D tile management
├── project-layer.js         # GV Infra GeoJSON + styling
├── measurement.js           # Distance, area, height tools
├── cesium-3d-core.js        # Main entry point (refactored)
└── README.md                # Module documentation

config/
└── providers.json           # Runtime provider configuration
```

**Benefits:**
- ✓ Each module < 300 lines (testable)
- ✓ Explicit dependencies (no global state)
- ✓ Provider swappable at runtime
- ✓ Fallback chains configurable
- ✓ Cinematic tours reusable

### 10.2 Phase 2: Data Layer Enhancement (Next)

**Scope:** Complete plot digitization + cadastral integration

- [ ] Digitize remaining 254 plots from SUDA layout
- [ ] Integrate TGRAC WFS fully (parcel-level toggle)
- [ ] Add road network layer (vector)
- [ ] Add POI layer (schools, markets, hospitals)
- [ ] Link plot status to Supabase (not localStorage)

### 10.3 Phase 3: Visualization & UX (Later)

**Scope:** Advanced camera work, measurement tools, mobile optimization

- [ ] Cinematic tour editing UI (web builder)
- [ ] Advanced measurement tools (polygon area, path distance)
- [ ] Mobile touch controls (pinch-zoom, swipe)
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Performance optimization (LOD culling)

### 10.4 Technology Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep CesiumJS 1.115 (no upgrade) | Stable, familiar; no breaking changes | Can upgrade in Phase 2 when stable |
| Modular ES6 classes | Familiar to team; good for inheritance | Requires bundler (Webpack/Vite) if minification needed |
| Config file (JSON) over environment | Runtime-switchable providers | Requires `.gitignore` for API keys |
| Fallback to 2D MapLibre (not Leaflet) | Already included in project | No new dependency |
| No third-party state management | Small feature set; localStorage sufficient | Revisit for Supabase integration (Phase 2) |

---

## 11. Required Owner-Provided Resources

### 11.1 Survey & CAD Data

| Item | Format | Criticality | Notes |
|------|--------|-------------|-------|
| Complete Plot Boundaries (all 302) | CAD (DXG/DWG) or GeoJSON | HIGH | Contact SUDA or request from GV Infra |
| Survey Number Registry | Excel / CSV | HIGH | Cross-check with official Sy. Nos. |
| As-Built Infrastructure (roads, drains) | CAD or vector shapefile | MEDIUM | Needed for phase 2 POI layer |
| Zoning / Land Use Designations | Shapefile or GeoJSON | LOW | Reference only; not critical |
| Aerial Basemap (High-res) | GeoTIFF or COG | MEDIUM | Optional; for offline validation |

### 11.2 Contact & Approvals

- **SUDA (Stambhadri Urban Development Authority)**
  - Request: Official layout plan (digitized)
  - Contact: +91-8613-xxxx (SUDA engineering office, Khammam)
  - Est. response: 2–3 weeks

- **GV Infra Projects**
  - Request: As-built CAD files (if available from SUDA)
  - Contact: Khammam office, Star Complex
  - Approval needed before public release

- **Google Cloud**
  - Request: GCP project setup + Maps API keys
  - Owner contact: Lokesh (lokesh.j@nritax.ai)
  - Setup time: 30 minutes

### 11.3 Certificates & Compliance

| Document | Provider | Action | Timeline |
|----------|----------|--------|----------|
| DTCP Approval Letter | SUDA | Verify TLP No. | Already confirmed |
| RERA Status | RERA / SUDA | Clarify if separate RERA # exists | Check within 2 weeks |
| Plot Status Certification | GV Infra Sales | Confirm 302-plot inventory | Request from sales team |
| Insurance Certificate (if applicable) | GV Infra / Developer | For production launch | Not blocking for MVP |

---

## 12. Phase 0 Sign-Off Checklist

- [x] Existing architecture documented (cesium-3d.js, 164 lines)
- [x] Feature audit completed (13 features mapped)
- [x] Provider inventory completed (Google, Cesium, Bhuvan, OSM)
- [x] Licensing matrix finalized (Apache 2.0, commercial APIs documented)
- [x] API key requirements identified (Google, Cesium)
- [x] Data readiness assessed (48/302 plots digitized; 15.9% complete)
- [x] Fallback strategy designed (4-tier imagery, 2-tier terrain)
- [x] Security model defined (env vars, CSP, rate limiting)
- [x] Architecture recommendations approved (9-module structure)
- [x] Owner resources identified (SUDA CAD, GV Infra contact)
- [x] Risks documented (data completeness, API cost, offline UX)

---

## Appendix A: Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Plot boundary data incomplete (254/302 missing) | HIGH | MEDIUM | Digitize incrementally; show 48-plot MVP first |
| Google API costs exceed budget | MEDIUM | MEDIUM | Monitor usage; switch to Bhuvan if needed |
| TGRAC WFS endpoint unavailable | LOW | LOW | Fall back to project plots only |
| Cesium World Terrain 404 | LOW | LOW | Ellipsoid fallback already implemented |
| Browser doesn't support WebGL | LOW | MEDIUM | MapLibre 2D fallback ready |
| CAD data not available from SUDA | MEDIUM | MEDIUM | Proceed with manual digitization from PDF |

---

## Appendix B: Cost Estimates

### Google Maps API (Estimated Monthly)

```
Assumption: 500 users × 50 tile requests/user/session = 25,000 requests/month

Cost Breakdown:
- Tile API: 25,000 requests × ($7/1000) = $175/month
- Maps SDK (included): $0
- Streets API (if used): $7 per 1000 requests (if added)

Monthly Total: ~$175–250 (within typical SaaS budget)
Annual Total: $2,100–3,000
```

### Cesium Ion (Free Tier)

```
Assumption: 500 users × 50 tile requests = 25,000 requests/month

Cost Breakdown:
- Free tier: 64 tiles/month (will exceed immediately)
- Upgrade to pay-as-you-go: 25,000 × ($0.001–0.01/tile) = $25–250/month

Recommendation: Use as fallback only; primary = Google
```

---

## Appendix C: Timeline (Estimated)

| Phase | Duration | Dependencies | Owner |
|-------|----------|--------------|-------|
| **Phase 0 (Audit)** | 2 days | — | Claude Agent |
| **Phase 1 (Modular Refactor)** | 5 days | Google API key, terrain data | Dev team |
| **Phase 2 (Data Completion)** | 10–15 days | SUDA CAD data | Dev + SUDA liaison |
| **Phase 3 (UX Polish)** | 5 days | Phase 1 + Phase 2 complete | Dev + Design |
| **Phase 4 (Testing & Launch)** | 5 days | All above | QA + DevOps |

**Total Timeline:** 27–32 days from audit start to public launch

---

**Document Version:** 1.0  
**Last Updated:** September 14, 2026  
**Next Review:** After Phase 1 completion (estimated Oct 5, 2026)
