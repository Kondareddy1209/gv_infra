# India Real Estate Platform - GIS Integration Guide

## 📍 Project Overview

This is a comprehensive guide for building a real estate platform in Tamil Nadu, India using **free and open data sources**. All data has been verified for legitimate public access with no scraping, bypassing, or misuse of government systems.

**Status:** Research + Implementation Ready
**Target Region:** Tamil Nadu, India
**Data Sources:** OpenStreetMap, Government Open Data, Self-hosted Services

---

## 🎯 Quick Start

### For Developers

1. **Read First:**
   - `docs/INDIA_GIS_DATA_SOURCES.md` - Data sources and licensing
   - `docs/API_REFERENCE.md` - API specifications

2. **Setup:**
   - `docs/POSTGIS_SETUP_GUIDE.md` - Database setup

3. **Implement:**
   - Backend APIs based on spec
   - Frontend map using MapLibre GL JS
   - Geocoding and routing services

### For Project Managers

- **Architecture:** Microservices (PostGIS, Nominatim, OSRM)
- **Timeline:** 6-8 weeks (with team)
- **Cost:** FREE (open source stack)
- **Scalability:** Horizontal (all services self-hosted)

---

## 📦 What's Included

### Documentation Files

| File | Purpose | Size |
|------|---------|------|
| `INDIA_GIS_DATA_SOURCES.md` | Complete data source guide | 3000+ lines |
| `POSTGIS_SETUP_GUIDE.md` | Database setup & queries | 1500+ lines |
| `API_REFERENCE.md` | REST API specification | 650+ lines |
| `README_GIS_INTEGRATION.md` | This file | 500+ lines |

### Data Files

```
data/
├── khammam-map.osm        # Sample OSM data for Khammam region
│                          # (Applicable to any Tamil Nadu region)
└── [To be downloaded]
    ├── india-latest.osm.pbf    # India OSM extract (650 MB)
    └── tamil-nadu.osm.pbf      # Filtered Tamil Nadu extract
```

### Code & Implementation

```
js/
├── osm-parser.js           # OSM XML parser (no dependencies)
└── land-map.js             # Enhanced land map viewer

local-map.html              # Interactive infrastructure map viewer

docs/
├── SQL schema             # PostgreSQL setup
├── API specifications     # Backend endpoints
└── Configuration guides   # Service setup
```

---

## 🗺️ Data Sources Summary

### OpenStreetMap (Free & Open)

**What:** Geographic data contributed by millions (roads, buildings, amenities)
**License:** ODbL 1.0 ✅ Commercial use OK (with attribution)
**Coverage:** Excellent in urban Tamil Nadu
**Access:** Web export, Overpass API, Geofabrik downloads
**Cost:** FREE

```bash
# Example: Get all hospitals in Tamil Nadu
curl "https://overpass-api.de/api/interpreter" \
  -d '[bbox:8.0,76.5,13.5,80.5];
       (node["amenity"="hospital"];way["amenity"="hospital"];);
       out geojson;'
```

### Geofabrik (Free Downloads)

**What:** Daily bulk exports of OpenStreetMap
**Size:** India extract ~650 MB, Tamil Nadu ~50-80 MB
**Format:** PBF (efficient), Shapefile, GeoPackage
**Update:** Daily
**Cost:** FREE

```bash
# Download & filter for Tamil Nadu
wget https://download.geofabrik.de/asia/india-latest.osm.pbf
osmium extract -b 76.5,8.0,80.5,13.5 india-latest.osm.pbf -o tn.osm.pbf
```

### Nominatim (Free Geocoding)

**What:** Address ↔ Coordinates conversion
**Based on:** OpenStreetMap
**License:** ODbL 1.0 ✅ Commercial use OK
**Access:** Public API (rate limited) or self-hosted
**Cost:** FREE

```bash
# Geocode an address
curl "https://nominatim.openstreetmap.org/search?q=Chennai+Tamil+Nadu&format=json"
```

### OSRM (Free Routing)

**What:** Calculate routes and distances
**License:** AGPL / BSD - Open source
**Access:** Public demo (limited) or self-hosted
**Cost:** FREE (self-hosted)

```bash
# Calculate distance
curl "https://router.project-osrm.org/route/v1/driving/80.2707,13.0827;80.1957,13.1929"
```

### data.gov.in (Government Data)

**What:** Various government datasets (administrative boundaries, etc.)
**License:** Varies by dataset (check each one)
**Access:** Web portal, API, CSV/GeoJSON downloads
**Cost:** FREE
**Note:** Limited real estate data available

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────┐
│       Frontend (MapLibre GL JS)     │
│  - Interactive map display          │
│  - Property search & filtering      │
│  - Amenity visualization            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│         Backend REST API (Node/Python)          │
│ ┌─────────────────────────────────────────────┐ │
│ │ Properties   │ Geocoding  │ Routing         │ │
│ │ /properties  │ /geocode   │ /route          │ │
│ │ /nearby      │ /reverse   │ /distance       │ │
│ └─────────────────────────────────────────────┘ │
└──────────┬─────────────┬──────────────┬─────────┘
           │             │              │
    ┌──────▼───┐  ┌──────▼──┐  ┌──────▼────┐
    │ PostGIS  │  │Nominatim│  │   OSRM    │
    │          │  │(local)  │  │  (local)  │
    │PostgreSQL│  │          │  │           │
    └──────────┘  └─────────┘  └───────────┘
         │
    ┌────▼────────────────────────────┐
    │  OSM Data (Tamil Nadu extract)  │
    │  - Buildings                    │
    │  - Roads & infrastructure       │
    │  - Amenities                    │
    │  - Administrative boundaries    │
    └─────────────────────────────────┘
```

---

## 💾 Database Schema

### Core Tables

```sql
-- Main properties table
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  survey_number VARCHAR(100),
  district, taluk, village VARCHAR(100),
  latitude, longitude DECIMAL,
  geom GEOMETRY(POINT, 4326),
  area, area_unit,
  land_use, verification_status,
  price, created_at, ...
);

-- Government verification data
CREATE TABLE government_verification (
  property_id BIGINT REFERENCES properties(id),
  patta_status, chitta_status, adangal_status,
  ec_status, verification_date, ...
);

-- OSM features near property
CREATE TABLE osm_features (
  property_id BIGINT,
  feature_type, name, geom,
  distance_meters, ...
);

-- Administrative boundaries
CREATE TABLE administrative_boundaries (
  name, level, geom GEOMETRY(MULTIPOLYGON, 4326),
  ...
);
```

**See:** `docs/POSTGIS_SETUP_GUIDE.md` for complete schema

---

## 🔌 Backend API Endpoints

All endpoints return JSON with consistent format:

```json
{
  "status": "success|error",
  "data": { /* ... */ },
  "meta": { /* pagination, etc */ }
}
```

### Properties

```
GET  /api/v1/properties                    List all
GET  /api/v1/properties/:id                Get one
GET  /api/v1/properties/search             Advanced search
GET  /api/v1/properties/nearby             Near location
GET  /api/v1/properties/map                Map view (GeoJSON)
POST /api/v1/properties                    Create
POST /api/v1/properties/:id/verify         Verify
```

### Geocoding

```
GET  /api/v1/geocode                       Address → Coords
GET  /api/v1/reverse-geocode               Coords → Address
GET  /api/v1/route                         Calculate route
GET  /api/v1/boundaries                    Admin boundaries
```

**See:** `docs/API_REFERENCE.md` for full specification

---

## 🌐 Frontend Map

### Technology: MapLibre GL JS

```html
<script src='https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js'></script>

<div id='map' style='height: 600px'></div>

<script>
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://...',
    center: [80.2707, 13.0827],
    zoom: 10
  });

  // Add property boundaries
  map.on('load', () => {
    map.addSource('properties', {
      type: 'geojson',
      data: '/api/v1/properties/map?district=Chennai'
    });

    map.addLayer({
      id: 'property-boundaries',
      type: 'fill',
      source: 'properties',
      paint: {
        'fill-color': '#088',
        'fill-opacity': 0.8
      }
    });
  });
</script>
```

### Features

- ✅ Interactive property boundaries
- ✅ Search & filter
- ✅ Amenity overlays
- ✅ Nearby facilities
- ✅ Distance measurement
- ✅ Mobile responsive

---

## 📋 Data Classification

### Category A: Government Data
- Source: Official government
- Example: Published land records
- Display: "Government Verified" (only if official)
- Commercial: Check license per dataset

### Category B: Geographic Data
- Source: OpenStreetMap, Geofabrik
- Example: Roads, buildings, amenities
- Display: "Map data © OpenStreetMap contributors"
- Commercial: ✅ YES (with attribution)

### Category C: User/Business Data
- Source: User submissions, broker listings
- Example: Property listings, prices
- Display: "User Submitted" or "Broker Listing"
- Commercial: ✅ YES (user's data)

**IMPORTANT:** Never claim Category B or C as Category A!

---

## ✅ Property Verification System

```
UNVERIFIED (gray)
└─ User submits property
   
USER_SUBMITTED (blue)
└─ User uploads documents
   
DOCUMENT_UPLOADED (yellow)
└─ Documents reviewed
   
DOCUMENT_CHECKED (orange)
└─ Field verification done
   
GOVERNMENT_DATA_MATCHED (green)
└─ Matched with official records
   
FULLY_VERIFIED (dark green)
└─ All checks passed
```

**Rule:** Never display "Government Verified" without official government source

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] PostgreSQL + PostGIS setup
- [ ] Download India extract from Geofabrik
- [ ] Filter for Tamil Nadu
- [ ] Import into PostGIS
- [ ] Create schema
- [ ] Deploy locally

### Phase 2: Geocoding & Routing (Week 3)
- [ ] Set up Nominatim
- [ ] Set up OSRM
- [ ] Create API wrappers
- [ ] Test integration

### Phase 3: Frontend (Week 4)
- [ ] MapLibre GL JS
- [ ] Property display
- [ ] Search & filter
- [ ] Mobile responsive

### Phase 4: User Features (Week 5-6)
- [ ] User authentication
- [ ] Property submission
- [ ] Document upload
- [ ] Verification workflow

### Phase 5: Government Integration (Ongoing)
- [ ] Research APIs
- [ ] Coordinate with departments
- [ ] Implement verification feeds

### Phase 6: Production (Week 7-8)
- [ ] Performance tuning
- [ ] Security hardening
- [ ] Backup strategy
- [ ] Monitoring

---

## 📊 Performance Expectations

### Database Queries

```
Properties search:    < 100ms
Nearby search (5km):  < 200ms
Amenity queries:      < 150ms
```

### API Response Times

```
List properties:      < 500ms (with caching)
Geocode:             < 1000ms (cache reduces to 50ms)
Route calculation:   < 2000ms (depends on distance)
```

### Self-Hosted Services

```
Nominatim:  ~2GB RAM,  can handle 1000s of geocoding/day
OSRM:       ~4GB RAM,  can handle 100s of routing/day
PostGIS:    Scales to millions of properties
```

---

## 🔒 Legal & Compliance

### Required Attributions

```html
<!-- OpenStreetMap -->
<a href="https://www.openstreetmap.org/copyright">
  © OpenStreetMap contributors
</a>

<!-- Nominatim -->
Powered by <a href="https://nominatim.org/">Nominatim</a>

<!-- OSRM -->
Routing by <a href="https://project-osrm.org/">OSRM</a>
```

### Commercial Use

- ✅ OpenStreetMap: OK (ODbL 1.0)
- ✅ Nominatim: OK (ODbL 1.0)
- ✅ OSRM: OK (AGPL/BSD)
- ❓ Government data: Check each dataset

### What You CANNOT Claim

- ❌ "Government Verified" (unless official)
- ❌ "Legal Title" (without government records)
- ❌ "No Disputes" (cannot verify)
- ❌ "Ready to Transact" (needs legal review)

---

## 🛠️ Technology Stack

### Backend Options

**Option A: Node.js (Recommended for Real Estate)**
```bash
- Express.js (API server)
- PostGIS Node client
- Bull (job queue)
- Redis (caching)
```

**Option B: Python**
```bash
- Flask/FastAPI
- psycopg2 (PostGIS)
- Celery (job queue)
- Redis (caching)
```

### Frontend
```bash
- MapLibre GL JS (mapping)
- React.js (UI)
- Tailwind CSS (styling)
- Axios (API client)
```

### Deployment
```bash
- Docker Compose (development)
- Kubernetes (production)
- Ubuntu 20.04+ (host OS)
```

---

## 📚 Additional Resources

### Official Documentation

- [OpenStreetMap Wiki](https://wiki.openstreetmap.org/)
- [Overpass API Guide](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [PostGIS Manual](https://postgis.net/docs/)
- [Nominatim Docs](https://nominatim.org/release-docs/latest/)
- [OSRM API](https://github.com/Project-OSRM/osrm-backend/wiki/HTTP-Server)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)

### Tools for Development

- **QGIS**: Desktop GIS for inspecting OSM data
- **PostGIS**: Database for spatial queries
- **Osmium**: Fast OSM file manipulation
- **osm2pgsql**: Import OSM to PostGIS

### Related Services

- **Geofabrik**: OSM extracts
- **data.gov.in**: Indian government data
- **Overpass Turbo**: Interactive Overpass query builder

---

## ⚠️ Important Disclaimers

### This Platform Can Do

✅ Display geographic information from OpenStreetMap
✅ Show property listings from users  
✅ Calculate distances to amenities
✅ Help users find properties
✅ Provide map-based search
✅ Display government-published data

### This Platform CANNOT

❌ Verify legal ownership (requires government records)
❌ Claim "Government Verified" (without official source)
❌ Replace legal title search
❌ Guarantee no disputes
❌ Provide legal advice

### Compliance Notes

- Comply with local real estate regulations
- Follow data protection laws (DISHA, GDPR)
- Require user consent for data processing
- Maintain audit trails
- Provide clear terms of service
- Display data source clearly
- Recommend legal review before transactions

---

## 🤝 Contributing

### How to Add Government Data

1. Research the official source
2. Verify public access (no scraping)
3. Document the API/download
4. Test the integration
5. Add to `INDIA_GIS_DATA_SOURCES.md`
6. Update this README

### How to Improve OSM Data

1. Visit [OpenStreetMap.org](https://www.openstreetmap.org/)
2. Zoom to Tamil Nadu
3. Click "Edit"
4. Add/correct information
5. Save with descriptive comment

---

## 📞 Support & Questions

### Documentation

All implementation details are in:
- `docs/INDIA_GIS_DATA_SOURCES.md` - Complete data guide
- `docs/POSTGIS_SETUP_GUIDE.md` - Database setup
- `docs/API_REFERENCE.md` - API specifications

### Troubleshooting

**PostGIS import failing?**
→ Check `docs/POSTGIS_SETUP_GUIDE.md` Step 5-6

**API rate limited?**
→ Self-host Nominatim/OSRM (see setup guides)

**Property queries slow?**
→ Check indexes (see POSTGIS_SETUP_GUIDE.md)

**Map not showing data?**
→ Verify GeoJSON format in `docs/API_REFERENCE.md`

---

## 📈 Next Steps

1. **Read:** Full documentation in `docs/` folder
2. **Setup:** PostgreSQL + PostGIS (`POSTGIS_SETUP_GUIDE.md`)
3. **Download:** Tamil Nadu OSM data (Geofabrik)
4. **Import:** Data into PostGIS
5. **Build:** Backend APIs (spec in `API_REFERENCE.md`)
6. **Deploy:** Frontend with MapLibre GL JS
7. **Integrate:** Geocoding and routing services

---

## 📄 License

All documentation and code in this project:
- **License:** MIT (your code)
- **Data Attribution:** ODbL 1.0 (OpenStreetMap)
- **Services:** See individual service licenses

**Important:** Always attribute OpenStreetMap contributors

---

**Project Status:** Implementation Ready
**Last Updated:** 2026-09-11
**Maintained By:** Development Team

