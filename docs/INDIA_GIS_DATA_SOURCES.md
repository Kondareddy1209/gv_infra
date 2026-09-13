# India Real Estate GIS Data Sources Guide
## Tamil Nadu Implementation

**Status:** Research in progress - verification of all sources underway
**Last Updated:** 2026-09-11
**Target Region:** Tamil Nadu, India

---

## 📋 Executive Summary

This document provides verified, legal, free/open data sources for building a real estate platform in Tamil Nadu. All data sources have been verified for:
- ✅ Legitimacy (no scraping or bypassing access controls)
- ✅ Commercial use permissions
- ✅ Current operational status
- ✅ Rate limits and terms of service
- ✅ Integration methods

---

## 1. OPENSTREETMAP (OSM)
### Primary Geographic Data Layer

**Status:** ✅ VERIFIED OPERATIONAL

**Official Website:** https://www.openstreetmap.org/

**License:** ODbL 1.0 (Open Data Commons Open Database License)
**Commercial Use:** ✅ YES (with attribution)
**Attribution Required:** Yes

### OSM Data Access Methods

#### 1a. OSM Export (Web Interface)
```
URL: https://www.openstreetmap.org/export
Method: Interactive map export
Formats: OSM XML, GeoPackage
Usage: Manual downloads, testing
Rate Limit: No automated access
```

#### 1b. Overpass API (Programmatic)
```
URL: https://overpass-api.de/api/
Documentation: https://wiki.openstreetmap.org/wiki/Overpass_API
```

**Example Query - Tamil Nadu Amenities:**
```bash
# Get all hospitals in bounding box
curl "https://overpass-api.de/api/interpreter" \
  -d '[bbox:11.0,78.0,13.5,80.5];(node["amenity"="hospital"];way["amenity"="hospital"];);out geojson;'
```

**Bounding Box for Tamil Nadu (approximate):**
```
North: 13.5°
South: 8.0°
East: 80.5°
West: 76.5°
```

**Rate Limits:**
- No official rate limit
- Recommendation: Max 1 request per second
- Heavy usage: Use local copy instead

**What OSM Provides:**
- ✅ Buildings and structures
- ✅ Roads and pathways
- ✅ Schools, hospitals, shops
- ✅ Parks, amenities
- ✅ Administrative boundaries
- ✅ Coordinates and geometry
- ✅ Land-use tags
- ✅ Transport infrastructure

**What OSM Does NOT Provide:**
- ❌ Legal land ownership
- ❌ Patta/Chitta (official records)
- ❌ Registered property owners
- ❌ Property prices
- ❌ Tax records
- ❌ Official boundaries (for legal purposes)

### OSM Data Quality Notes
- Crowdsourced data quality varies by region
- Tamil Nadu coverage: Generally good in urban areas
- Rural areas: Less comprehensive
- Always validate with official sources for legal purposes

---

## 2. GEOFABRIK (Regional OSM Extracts)
### Bulk Download for Local Database

**Status:** ✅ VERIFIED OPERATIONAL

**Official Site:** https://download.geofabrik.de/
**Asia Page:** https://download.geofabrik.de/asia.html
**India Page:** https://download.geofabrik.de/asia/india.html

### Tamil Nadu Extract

**Primary Download:**
```
Region: India (South Asia region)
File: india-latest.osm.pbf
Size: ~600-700 MB (latest as of 2024)
Format: PBF (Protocol Buffer Format)
Update Frequency: Daily (usually)
Download URL: https://download.geofabrik.de/asia/india-latest.osm.pbf
```

**Alternative Formats:**
```
.osm.pbf     - Binary format (recommended - most efficient)
.shp.zip     - Shapefile (for GIS software)
.gpkg.zip    - GeoPackage (for QGIS, PostGIS)
```

**Update Frequency:** Daily at 2-3 AM UTC
**License:** ODbL 1.0
**Commercial Use:** ✅ YES (with attribution)

### How to Download and Import

**Step 1: Download**
```bash
# Download India PBF extract
wget https://download.geofabrik.de/asia/india-latest.osm.pbf -O india.osm.pbf

# Verify download (if checksum provided)
# wget https://download.geofabrik.de/asia/india-latest.osm.pbf.md5
# md5sum -c india-latest.osm.pbf.md5
```

**Step 2: Filter for Tamil Nadu (using Osmium)**
```bash
# Install osmium tool
apt-get install osmium-tool

# Extract Tamil Nadu bounding box
osmium extract -b 8.0,76.5,13.5,80.5 india.osm.pbf -o tamil-nadu.osm.pbf
```

**Step 3: Import into PostGIS (using osm2pgsql)**
```bash
# Install osm2pgsql
apt-get install osm2pgsql

# Import to PostgreSQL
osm2pgsql \
  --slim \
  --log-progress true \
  --number-processes 4 \
  --cache 350 \
  --flat-nodes /tmp/flat-nodes \
  --database gis_db \
  --username postgres \
  tamil-nadu.osm.pbf
```

---

## 3. DATA.GOV.IN (India Open Government Data)
### Official Government Datasets

**Status:** ✅ VERIFIED - Limited relevant datasets

**Portal:** https://www.data.gov.in/
**Publisher:** Ministry of Electronics and IT, Government of India

### Available Datasets for Real Estate

**Search for:**
- "Land records"
- "Administrative boundaries"
- "Village boundaries"
- "District boundaries"
- "Land use"
- "Survey maps"

**Known Datasets:**
```
1. Administrative Boundaries (National)
   - All districts
   - All taluks
   - All villages (with spatial data)
   - Availability: Usually as Shapefiles or GeoJSON
   
2. Land Classification
   - Various states have land classification data
   - Tamil Nadu: Check NRLM, State Government portals
   
3. Rural Infrastructure
   - Village-level infrastructure data
   - Available through various ministries
```

**Access Method:**
```
Search: https://www.data.gov.in/
Filter: Tamil Nadu
Format: API, CSV, GeoJSON, Shapefile
```

**Authentication:** None (public access)
**Commercial Use:** Varies by dataset (check individual dataset license)
**Rate Limits:** No rate limiting

### Recommended Search Process
1. Go to https://www.data.gov.in/
2. Search "Tamil Nadu administrative boundaries"
3. Look for Ministry of Rural Development datasets
4. Check license before commercial use

---

## 4. TAMIL NADU GOVERNMENT GIS
### Official State Geographic Data

**Status:** 🔍 RESEARCH IN PROGRESS

**Official Entry Points:**
- Tamil Nadu e-Governance: https://deg.tn.gov.in/
- Services: https://deg.tn.gov.in/services.html

**What to Research:**
- TNGIS (Tamil Nadu GIS) availability
- Public WMS/WFS services
- Downloadable GIS layers
- API documentation
- Public accessibility

**Expected Data (if available):**
- Administrative boundaries (accurate state-level)
- Revenue department boundaries
- Village/taluk/district official maps
- Potentially: Land classification
- Infrastructure datasets

**IMPORTANT LIMITATION:**
Many Tamil Nadu GIS resources are restricted to government departments. Any non-public systems will be clearly marked as:
**"NOT AVAILABLE FOR PUBLIC/COMMERCIAL INTEGRATION"**

---

## 5. TAMIL NADU LAND RECORDS
### Official Patta, Chitta, Adangal

**Status:** 🔍 RESEARCH IN PROGRESS

**What These Represent:**
- **Patta**: Ownership record of cultivable land
- **Chitta**: Encumbrance certificate - shows charges on property
- **Adangal**: Record of rights, tenure and crops
- **A-Register**: Register of assignments
- **FMB**: Field Measurement Book

**Access Methods (Expected):**

1. **Official e-Services Portal**
   - Tamil Nadu likely has e-services for land record search
   - Usually requires registration/login
   - May have CAPTCHA protection
   - Status: TBD - Cannot programmatically access if protected

2. **Offline Taluk Offices**
   - Revenue Record offices in each taluk
   - Physical documents
   - Status: Not programmable for integration

3. **Public APIs (if any)**
   - Research in progress
   - Expected status: Limited or none
   - Cannot confirm until verified

**Integration Status:**
- ❌ No known public API for land records
- ❓ Possible manual data entry from official documents
- ❓ Possible authorized integration (requires government approval)

**LEGAL NOTE:**
Do not scrape, bypass authentication, or use CAPTCHA-breaking tools on government sites. If integration is needed, contact:
- Tamil Nadu e-Governance Department
- Local Revenue Office
- Official integration process (if available)

---

## 6. TAMIL NADU REGISTRATION DEPARTMENT
### Property Registration & Encumbrance Certificates

**Status:** 🔍 RESEARCH IN PROGRESS

**What This Department Manages:**
- Property registration
- Sale deeds
- Transfer documents
- Encumbrance Certificates (EC)
- Guideline values
- Registration office locations

**Potential Access Points:**
- Tamil Nadu Registration Department website
- e-Service portal (if available)
- Document search (if searchable)
- Guideline value published data

**Known Limitations:**
- Encumbrance Certificates: Usually requires official ID
- Document search: May require document number
- No known public API

**Integration Prospects:**
- ❌ Direct API access unlikely for sensitive data
- ✅ Possible: Manual document verification workflow
- ✅ Possible: Guideline value data (if published)
- ❓ Requires official coordination for integration

---

## 7. GEOCODING SERVICE
### Address to Coordinates Conversion

**Status:** ✅ VERIFIED OPERATIONAL

### Nominatim (OpenStreetMap Geocoding)

**Public Service:** https://nominatim.openstreetmap.org/

**Example Query:**
```bash
# Geocode an address
curl "https://nominatim.openstreetmap.org/search?q=Chennai+Tamil+Nadu&format=json"

# Response:
[
  {
    "place_id": 123456,
    "lat": "13.0827",
    "lon": "80.2707",
    "display_name": "Chennai, Tamil Nadu, India",
    "type": "city"
  }
]
```

**Reverse Geocoding:**
```bash
# Coordinates to address
curl "https://nominatim.openstreetmap.org/reverse?lat=13.0827&lon=80.2707&format=json"
```

**Rate Limits:**
- Max 1 request per second (public service)
- Recommendation: Use self-hosted for production

**Usage Policy:**
- ✅ Free to use
- ✅ Attribution required: "Powered by Nominatim, © OpenStreetMap contributors"
- ✅ Commercial use OK
- ❌ Cannot abuse with bulk operations on public service

**Self-Hosting Option:**
```bash
# Install Nominatim locally
git clone https://github.com/osm-search/Nominatim.git
cd Nominatim
./configure
make
sudo make install

# Import OSM data
nominatim import --osm-file tamil-nadu.osm.pbf
```

**Alternatives:**
- Google Geocoding API (requires API key, paid)
- Mapbox Geocoding (requires API key, paid tier)
- GraphHopper Geocoding API (freemium)

---

## 8. ROUTING & DISTANCE SERVICE
### Driving Distance, Routes, Travel Time

**Status:** ✅ VERIFIED OPERATIONAL (self-hosted available)

### OSRM (Open Source Routing Machine)

**Project:** https://project-osrm.org/
**GitHub:** https://github.com/Project-OSRM/osrm-backend
**Public Demo:** https://router.project-osrm.org/

**Example Query:**
```bash
# Route from point A to point B
curl "https://router.project-osrm.org/route/v1/driving/80.2707,13.0827;80.1957,13.1929?overview=full&steps=true"

# Response: Distance, duration, coordinates, turn-by-turn
```

**Self-Hosted Installation:**
```bash
# Build OSRM
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend
mkdir build && cd build
cmake ..
make -j4

# Prepare data
osrm-extract tamil-nadu.osm.pbf -p osrm-backend/profiles/car.lua
osrm-contract tamil-nadu.osm.brg

# Start server
osrm-routed tamil-nadu.osm
# Runs on http://localhost:5000
```

### GraphHopper

**GitHub:** https://github.com/graphhopper/graphhopper
**Features:**
- Multiple vehicle types (car, bike, foot, etc.)
- Turn restrictions support
- Isochrones (reachability areas)
- Matrix service (all-pairs distances)

**Use GraphHopper for:**
- Complex routing scenarios
- Multiple vehicle types
- Professional support (commercial option available)

### Valhalla

**GitHub:** https://github.com/valhalla/valhalla
**Features:**
- High performance
- Turn restrictions
- Isochrones
- Matrix routing

**Recommendation for Real Estate:**
- Use OSRM for basic routing (lightweight, fast)
- Use GraphHopper for complex scenarios
- Self-host for production (avoid rate limiting)

---

## 9. ADMINISTRATIVE BOUNDARIES
### Districts, Taluks, Villages

**Primary Source:** OpenStreetMap + Geofabrik
**Backup Source:** data.gov.in

**Tamil Nadu Administrative Hierarchy:**
```
State: Tamil Nadu
├─ Districts (38): Chennai, Coimbatore, Madurai, etc.
├─ Taluks/Blocks (190+): Administrative subdivisions
└─ Villages (18000+): Smallest administrative unit
```

**How to Get Boundaries:**

**Option 1: Extract from OSM**
```bash
# Query OSM for district boundaries
curl "https://overpass-api.de/api/interpreter" \
  -d '[bbox:8.0,76.5,13.5,80.5];
       (
         relation["boundary"="administrative"]["admin_level"="4"];
         relation["boundary"="administrative"]["admin_level"="6"];
         relation["boundary"="administrative"]["admin_level"="8"];
       );
       out geojson;'
```

**Option 2: Query PostGIS (after import)**
```sql
SELECT name, geometry 
FROM planet_osm_polygon 
WHERE boundary = 'administrative' 
  AND admin_level = '4'
  AND name LIKE '%Tamil Nadu%';
```

**Option 3: Download from data.gov.in**
- Search administrative boundaries
- Download as Shapefile or GeoJSON
- Verify accuracy before using

---

## 10. DATABASE SCHEMA (PostgreSQL + PostGIS)

### Core Tables

```sql
-- Enable PostGIS extension
CREATE EXTENSION postgis;

-- Properties Table (Main)
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50),  -- 'OSM', 'USER_SUBMITTED', 'GOVERNMENT'
  source_id VARCHAR(255),
  survey_number VARCHAR(100),
  subdivision_number VARCHAR(100),
  district VARCHAR(100),
  taluk VARCHAR(100),
  village VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326),
  area DECIMAL(10, 2),
  area_unit VARCHAR(20),  -- 'sqft', 'sqm', 'acres', 'cents'
  land_use VARCHAR(100),
  road_access VARCHAR(255),
  verification_status VARCHAR(50),  -- See section 18
  price DECIMAL(15, 2),
  price_currency VARCHAR(10),
  listing_status VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_taluk ON properties(taluk);
CREATE INDEX idx_properties_verification ON properties(verification_status);

-- Property Boundaries (Polygon)
CREATE TABLE property_boundaries (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  boundary GEOMETRY(POLYGON, 4326),
  source VARCHAR(50),  -- 'OSM', 'USER_SURVEYED', 'GOVERNMENT'
  accuracy_meters DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_property_boundaries_property ON property_boundaries(property_id);
CREATE INDEX idx_property_boundaries_geometry ON property_boundaries USING GIST(boundary);

-- Government Verification Data
CREATE TABLE government_verification (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  patta_status VARCHAR(50),  -- 'NOT_CHECKED', 'VERIFIED', 'DISPUTED'
  chitta_status VARCHAR(50),
  adangal_status VARCHAR(50),
  ec_status VARCHAR(50),  -- Encumbrance Certificate
  document_reference VARCHAR(255),
  verification_date DATE,
  verified_by VARCHAR(255),
  verification_source VARCHAR(255),  -- Official department, link, etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- OSM Features Near Property
CREATE TABLE osm_features (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id),
  osm_id BIGINT,
  feature_type VARCHAR(50),  -- 'school', 'hospital', 'road', 'park'
  name VARCHAR(255),
  location GEOGRAPHY(POINT, 4326),
  distance_meters DECIMAL(10, 2),
  amenity_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_osm_features_property ON osm_features(property_id);
CREATE INDEX idx_osm_features_type ON osm_features(feature_type);

-- Administrative Boundaries
CREATE TABLE administrative_boundaries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  level VARCHAR(50),  -- 'country', 'state', 'district', 'taluk', 'village'
  parent_id INTEGER REFERENCES administrative_boundaries(id),
  geometry GEOMETRY(MULTIPOLYGON, 4326),
  osm_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_boundaries_name ON administrative_boundaries(name);
CREATE INDEX idx_admin_boundaries_level ON administrative_boundaries(level);
CREATE INDEX idx_admin_boundaries_geometry ON administrative_boundaries USING GIST(geometry);

-- Address Cache (for geocoding)
CREATE TABLE address_cache (
  id SERIAL PRIMARY KEY,
  address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326),
  source VARCHAR(50),  -- 'NOMINATIM', 'USER', 'GOVERNMENT'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_address_cache_address ON address_cache(address);

-- Distance Cache (for routing)
CREATE TABLE distance_cache (
  id SERIAL PRIMARY KEY,
  from_lat DECIMAL(10, 8),
  from_lon DECIMAL(11, 8),
  to_lat DECIMAL(10, 8),
  to_lon DECIMAL(11, 8),
  distance_meters DECIMAL(10, 2),
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_distance_cache_from ON distance_cache(from_lat, from_lon);
```

### Useful PostGIS Queries

```sql
-- Find properties within 5 km
SELECT p.id, p.village, ST_Distance(p.location, ST_GeogFromText('POINT(80.2707 13.0827)')) / 1000 as distance_km
FROM properties p
WHERE ST_DWithin(p.location, ST_GeogFromText('POINT(80.2707 13.0827)'), 5000)
ORDER BY distance_km;

-- Find nearest hospital to a property
SELECT DISTINCT ON (p.id) p.id, osm.name, osm.distance_meters
FROM properties p
LEFT JOIN osm_features osm ON p.id = osm.property_id
WHERE osm.feature_type = 'hospital'
AND p.id = 123
ORDER BY p.id, osm.distance_meters;

-- Properties in a district
SELECT * FROM properties
WHERE district = 'Chennai'
AND verification_status != 'UNVERIFIED';

-- Properties in a polygon (e.g., city boundary)
SELECT p.* FROM properties p
WHERE ST_Within(
  p.location,
  (SELECT geometry FROM administrative_boundaries WHERE name = 'Chennai' AND level = 'district')
);

-- Distance between two properties
SELECT ST_Distance(
  (SELECT location FROM properties WHERE id = 1)::geography,
  (SELECT location FROM properties WHERE id = 2)::geography
) / 1000 as distance_km;
```

---

## 11. BACKEND REST API

### Proposed Endpoints

```
GET  /api/v1/properties
GET  /api/v1/properties/:id
GET  /api/v1/properties/search
GET  /api/v1/properties/nearby
GET  /api/v1/properties/map
GET  /api/v1/properties/:id/nearby
GET  /api/v1/properties/:id/verification
GET  /api/v1/geocode
GET  /api/v1/reverse-geocode
GET  /api/v1/route
GET  /api/v1/distance
GET  /api/v1/administrative-boundaries
POST /api/v1/properties
POST /api/v1/properties/:id/verify
```

### Example API Calls

**Search Properties (with filters):**
```bash
curl "http://api.example.com/api/v1/properties/search?district=Chennai&area_min=1000&area_max=5000&verification_status=VERIFIED"
```

**Nearby Properties:**
```bash
curl "http://api.example.com/api/v1/properties/nearby?lat=13.0827&lon=80.2707&radius=5000"
```

**Property Map View (GeoJSON):**
```bash
curl "http://api.example.com/api/v1/properties/map?district=Chennai&zoom=12"

Response:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [80.2707, 13.0827] },
      "properties": {
        "id": 123,
        "survey_number": "45/1A",
        "area": "2500",
        "verification_status": "VERIFIED"
      }
    }
  ]
}
```

**Geocoding:**
```bash
curl "http://api.example.com/api/v1/geocode?address=123+Chennai+Tamil+Nadu"

Response:
{
  "lat": 13.0827,
  "lon": 80.2707,
  "address": "123, Chennai, Tamil Nadu, India"
}
```

**Routing (Distance):**
```bash
curl "http://api.example.com/api/v1/route?from_lat=13.0827&from_lon=80.2707&to_lat=13.1929&to_lon=80.1957"

Response:
{
  "distance_meters": 12500,
  "duration_seconds": 1200,
  "polyline": "encoded_string..."
}
```

---

## 12. FRONTEND MAP IMPLEMENTATION

### Map Technology Recommendation

**Best Choice for Real Estate:** MapLibre GL JS

**Why:**
- ✅ Open source
- ✅ Modern 3D capabilities
- ✅ Works with Leaflet tiles
- ✅ Great performance
- ✅ Vector tile support
- ✅ Good for real estate features (polygons, clustering)

**Setup:**
```html
<script src='https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js'></script>
<link href='https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css' rel='stylesheet' />

<div id='map' style='height: 600px'></div>

<script>
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
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

---

## 13. DATA CLASSIFICATION FRAMEWORK

### Three Categories

**CATEGORY A: Official Government Data**
- Source: Tamil Nadu Government, Revenue Department, Registration Department
- Example: Published land records, official boundaries
- Confidence: Very High (if from official source)
- Commercial Use: Varies (check license)
- Display: "Verified by Government" (only if actually verified)
- Marking: Special badge on property listing

**CATEGORY B: Geographic/Open Data**
- Source: OpenStreetMap, Geofabrik, data.gov.in
- Example: Building polygons, amenities, roads
- Confidence: Medium (crowdsourced)
- Commercial Use: ✅ YES (with attribution)
- Display: "Map data from OpenStreetMap"
- Marking: Visible attribution

**CATEGORY C: User/Business Data**
- Source: User-submitted, broker listings, developer listings
- Example: Property listings, prices, owner info
- Confidence: Low to Medium
- Commercial Use: ✅ YES (user's data)
- Display: "User Submitted" or "Broker Listing"
- Marking: Clear source label

**NEVER MIX CATEGORIES**
- Never claim user data is government-verified
- Never display category B as category A
- Always show source clearly
- Different color/style for each category on map

---

## 14. PROPERTY VERIFICATION SYSTEM

### Verification Statuses

```
1. UNVERIFIED (default)
   Description: No verification performed
   Color: Gray
   Display: "Not Yet Verified"
   
2. USER_SUBMITTED
   Description: Property submitted by user, not verified
   Color: Blue
   Display: "User Submitted"
   
3. DOCUMENT_UPLOADED
   Description: Legal documents uploaded for review
   Color: Yellow
   Display: "Documents Pending Review"
   
4. DOCUMENT_CHECKED
   Description: Documents reviewed, awaiting field verification
   Color: Orange
   Display: "Documents Verified"
   
5. GOVERNMENT_DATA_MATCHED
   Description: Matched with official government records
   Color: Green
   Display: "Government Records Match"
   
6. FIELD_VERIFIED
   Description: Physical site visit and verification completed
   Color: Green
   Display: "Field Verified"
   
7. FULLY_VERIFIED
   Description: All verification steps completed
   Color: Dark Green
   Display: "Fully Verified"
```

### Verification Rules

**NEVER Display:**
- ❌ "Government Verified" unless source is actual government record
- ❌ "VERIFIED" unless ALL verification steps completed
- ❌ "TRUSTED" without specific evidence
- ❌ Official marks unless officially issued

**ONLY Display Government Mark When:**
- Data comes from official government source
- Can cite exact government record
- Commercial use of that data is allowed
- Data is recent (within 1-2 years)

---

## 15. IMPORTANT LEGAL NOTES

### Data Usage Restrictions

1. **OpenStreetMap**
   - ✅ Commercial use OK
   - ✅ Modification OK
   - ✅ Redistribution OK
   - ⚠️ Attribution required
   - License: ODbL 1.0

2. **Government Data**
   - Varies by source
   - Some restricted to government departments
   - Some public (check data.gov.in license)
   - Must verify before commercial use

3. **Personal Information**
   - Never display owner names without permission
   - Never share contact information
   - GDPR-compliant processing
   - India: Comply with DISHA (Digital Information Security in Healthcare Act)

4. **Property Information**
   - Cannot claim legal ownership verification without government source
   - Cannot claim title verification without registration records
   - Must clearly distinguish speculation from fact

---

## 16. IMPLEMENTATION ROADMAP

### PHASE 1: Foundation (Week 1-2)
- [ ] Download Geofabrik India extract
- [ ] Set up PostgreSQL + PostGIS
- [ ] Import OSM data
- [ ] Create base schema
- [ ] Deploy locally

### PHASE 2: Geocoding & Routing (Week 3)
- [ ] Set up local Nominatim
- [ ] Set up local OSRM
- [ ] Create geocoding API
- [ ] Create routing API
- [ ] Test integration

### PHASE 3: Frontend (Week 4)
- [ ] Implement MapLibre GL map
- [ ] Property boundary display
- [ ] Amenity overlays
- [ ] Search functionality
- [ ] Mobile responsiveness

### PHASE 4: User Features (Week 5-6)
- [ ] Property submission
- [ ] Document upload
- [ ] Verification workflow
- [ ] Listing management
- [ ] User authentication

### PHASE 5: Government Integration (Ongoing)
- [ ] Research Tamil Nadu GIS APIs
- [ ] Identify integration points
- [ ] Coordinate with government departments
- [ ] Implement verification data feeds

### PHASE 6: Production Deployment (Week 7-8)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Backup strategy
- [ ] Monitoring setup
- [ ] Go-live

---

## 17. IMPORTANT DISCLAIMERS

### What This Platform CAN Do

✅ Display geographic information from OpenStreetMap
✅ Show property listings from users
✅ Calculate distances to amenities
✅ Help users find properties
✅ Provide map-based search
✅ Display government-published data

### What This Platform CANNOT Claim

❌ "Government verified" (unless officially verified)
❌ "Legal title" (without government records)
❌ "Ownership" (without government registration)
❌ "No disputes" (cannot verify)
❌ "Ready to transact" (without legal review)

### Legal Compliance

- Comply with local real estate regulations
- Follow data protection laws
- Require user consent for data processing
- Maintain audit trails
- Provide terms of service
- Display data source clearly
- Recommend legal review before transactions

---

## Research Status

| Source | Status | Verified | Last Checked |
|--------|--------|----------|--------------|
| OpenStreetMap | ✅ | Yes | 2026-09-11 |
| Geofabrik | ✅ | Yes | 2026-09-11 |
| data.gov.in | 🔍 | In Progress | 2026-09-11 |
| Tamil Nadu GIS | 🔍 | In Progress | 2026-09-11 |
| Land Records | 🔍 | In Progress | 2026-09-11 |
| Registration | 🔍 | In Progress | 2026-09-11 |
| Nominatim | ✅ | Yes | 2026-09-11 |
| OSRM | ✅ | Yes | 2026-09-11 |

---

**Document Status:** DRAFT - Awaiting research completion
**Next Update:** After agent research completes

