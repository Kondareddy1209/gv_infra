# Tamil Nadu Real Estate Platform - API Reference

## Free & Open Data APIs

### 1. OPENSTREETMAP OVERPASS API

**Endpoint:** `https://overpass-api.de/api/interpreter`

**Tamil Nadu Bounding Box:**
```
[bbox:8.0,76.5,13.5,80.5]
North: 13.5°
South: 8.0°
East: 80.5°
West: 76.5°
```

#### Query: All Hospitals in Tamil Nadu

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d '[bbox:8.0,76.5,13.5,80.5];
       (
         node["amenity"="hospital"];
         way["amenity"="hospital"];
         relation["amenity"="hospital"];
       );
       out geojson;'
```

**Response Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [80.2707, 13.0827]
      },
      "properties": {
        "amenity": "hospital",
        "name": "Hospital Name"
      }
    }
  ]
}
```

#### Query: All Schools

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d '[bbox:8.0,76.5,13.5,80.5];
       (
         node["amenity"="school"];
         way["amenity"="school"];
         relation["amenity"="school"];
       );
       out geojson;'
```

#### Query: Buildings (For Land Identification)

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d '[bbox:8.0,76.5,13.5,80.5];
       (
         way["building"];
         relation["building"];
       );
       out geojson;'
```

#### Query: Roads Near Location

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  -d '[bbox:13.0,80.2,13.1,80.3];
       (
         way["highway"];
       );
       out geojson;'
```

**Rate Limits:**
- Public service: ~1 request/second recommended
- No official limit but can be rate-limited
- **For production:** Use local Overpass instance or cache results

**Documentation:**
https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL

---

### 2. NOMINATIM GEOCODING (OpenStreetMap)

**Endpoint:** `https://nominatim.openstreetmap.org/`

#### Forward Geocoding (Address → Coordinates)

```bash
# Simple address search
curl "https://nominatim.openstreetmap.org/search?q=Chennai+Tamil+Nadu&format=json"

# Response:
[
  {
    "place_id": 123456,
    "license": "Data © OpenStreetMap contributors...",
    "osm_type": "relation",
    "osm_id": 123456,
    "boundingbox": ["8.0", "13.5", "76.5", "80.5"],
    "lat": "13.0827",
    "lon": "80.2707",
    "display_name": "Chennai, Tamil Nadu, India",
    "class": "boundary",
    "type": "administrative",
    "importance": 0.75
  }
]
```

#### Reverse Geocoding (Coordinates → Address)

```bash
curl "https://nominatim.openstreetmap.org/reverse?lat=13.0827&lon=80.2707&format=json"

# Response:
{
  "place_id": 123456,
  "osm_type": "way",
  "osm_id": 123456,
  "lat": "13.0827",
  "lon": "80.2707",
  "address": {
    "house_number": "123",
    "road": "MG Road",
    "suburb": "Teynampet",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postcode": "600018",
    "country": "India",
    "country_code": "in"
  },
  "display_name": "123, MG Road, Chennai, Tamil Nadu 600018, India"
}
```

**Rate Limits:**
- 1 request/second (public service)
- Use User-Agent header
- No API key needed

**Usage Policy:**
- ✅ Free
- ✅ Commercial use OK
- ✅ Attribution: "Powered by Nominatim"
- ❌ Cannot bulk-process without caching

**Self-Hosted:**
```bash
# Install Nominatim
git clone https://github.com/osm-search/Nominatim.git
cd Nominatim
./configure
make
sudo make install

# Import data
nominatim import --osm-file tamil-nadu.osm.pbf

# Query (local)
curl "http://localhost:8088/search?q=Chennai"
```

---

### 3. OSRM ROUTING (Open Source Routing Machine)

**Public Demo:** `https://router.project-osrm.org/`

#### Route Calculation

```bash
# Driving route from A to B
curl "https://router.project-osrm.org/route/v1/driving/80.2707,13.0827;80.1957,13.1929?overview=full&steps=true&continue_straight=default"

# Response:
{
  "code": "Ok",
  "routes": [
    {
      "geometry": {
        "coordinates": [[80.2707, 13.0827], [...], [80.1957, 13.1929]],
        "type": "LineString"
      },
      "legs": [
        {
          "steps": [...],
          "distance": 12500.5,
          "duration": 1200.3
        }
      ],
      "distance": 12500.5,
      "duration": 1200.3
    }
  ]
}
```

#### Distance Matrix (Multiple Locations)

```bash
# Distance between 3 points
curl "https://router.project-osrm.org/table/v1/driving/80.2707,13.0827;80.1957,13.1929;80.1234,13.1456"

# Response:
{
  "code": "Ok",
  "distances": [
    [0, 12500, 25000],
    [12500, 0, 15000],
    [25000, 15000, 0]
  ],
  "durations": [
    [0, 1200, 2500],
    [1200, 0, 1500],
    [2500, 1500, 0]
  ]
}
```

**Available Profiles:**
- `driving` - Car routing
- `walking` - Pedestrian routing
- `cycling` - Bicycle routing

**Self-Hosted Setup:**
```bash
# Build OSRM
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

# Prepare data
./osrm-extract ../osm-backend/data/tamil-nadu.osm.pbf -p ../osrm-backend/profiles/car.lua
./osrm-contract tamil-nadu.osm.brg

# Start server
./osrm-routed tamil-nadu.osm
# Access at http://localhost:5000
```

---

### 4. GEOFABRIK DOWNLOAD

**Base URL:** `https://download.geofabrik.de/`

#### India Extract

```
URL: https://download.geofabrik.de/asia/india-latest.osm.pbf
Size: ~650 MB (latest)
Format: PBF (Protocol Buffer)
Updated: Daily
License: ODbL 1.0
```

#### Download & Extract

```bash
# Download
wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# Extract Tamil Nadu using osmium
osmium extract -b 76.5,8.0,80.5,13.5 india-latest.osm.pbf -o tamil-nadu.osm.pbf

# Import to PostGIS
osm2pgsql --slim --database gis_db tamil-nadu.osm.pbf
```

**Alternative Formats Available:**
- `.osm.pbf` - Most efficient (recommended)
- `.osm.bz2` - Compressed XML
- `.shp.zip` - Shapefiles for GIS
- `.gpkg.zip` - GeoPackage

---

## Backend REST API Specification

### Properties Endpoints

#### List Properties

```
GET /api/v1/properties?district=Chennai&limit=50&offset=0
```

**Query Parameters:**
```
district     - Filter by district
taluk        - Filter by taluk
village      - Filter by village
verification - Filter by verification status
price_min    - Minimum price
price_max    - Maximum price
area_min     - Minimum area (sqft)
area_max     - Maximum area (sqft)
limit        - Results per page (max 100)
offset       - Pagination offset
sort         - Sort field (price, area, created_at)
order        - asc or desc
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 123,
      "survey_number": "45/1A",
      "district": "Chennai",
      "taluk": "Teynampet",
      "village": "Teynampet",
      "area": 2500,
      "area_unit": "sqft",
      "price": 12500000,
      "price_currency": "INR",
      "verification_status": "VERIFIED",
      "source": "USER_SUBMITTED",
      "coordinates": {
        "lat": 13.0827,
        "lon": 80.2707
      },
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0,
    "pages": 25
  }
}
```

#### Search Properties (Map View)

```
GET /api/v1/properties/map?bbox=76.5,8.0,80.5,13.5&zoom=12
```

**Response (GeoJSON):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [80.2707, 13.0827]
      },
      "properties": {
        "id": 123,
        "survey_number": "45/1A",
        "area": 2500,
        "price": 12500000,
        "verification_status": "VERIFIED"
      }
    }
  ]
}
```

#### Nearby Properties

```
GET /api/v1/properties/nearby?lat=13.0827&lon=80.2707&radius=5000
```

**Response:**
```json
{
  "status": "success",
  "center": { "lat": 13.0827, "lon": 80.2707 },
  "radius_meters": 5000,
  "results": [
    {
      "id": 123,
      "survey_number": "45/1A",
      "distance_meters": 1250,
      "area": 2500,
      "price": 12500000
    }
  ]
}
```

### Geocoding Endpoints

#### Forward Geocoding

```
GET /api/v1/geocode?address=123+MG+Road+Chennai&format=json
```

**Response:**
```json
{
  "status": "success",
  "results": [
    {
      "address": "123, MG Road, Teynampet, Chennai, Tamil Nadu 600018, India",
      "lat": 13.0827,
      "lon": 80.2707,
      "accuracy": "street",
      "bbox": {
        "north": 13.0830,
        "south": 13.0824,
        "east": 80.2710,
        "west": 80.2704
      }
    }
  ]
}
```

#### Reverse Geocoding

```
GET /api/v1/reverse-geocode?lat=13.0827&lon=80.2707
```

**Response:**
```json
{
  "status": "success",
  "address": "123, MG Road, Teynampet, Chennai, Tamil Nadu 600018, India",
  "components": {
    "house": "123",
    "street": "MG Road",
    "suburb": "Teynampet",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postcode": "600018",
    "country": "India"
  }
}
```

### Routing Endpoints

#### Distance & Route

```
GET /api/v1/route?from_lat=13.0827&from_lon=80.2707&to_lat=13.1929&to_lon=80.1957&profile=driving
```

**Response:**
```json
{
  "status": "success",
  "route": {
    "distance_meters": 12500,
    "duration_seconds": 1200,
    "duration_formatted": "20 mins",
    "geometry": {
      "type": "LineString",
      "coordinates": [[80.2707, 13.0827], [...], [80.1957, 13.1929]]
    },
    "steps": [
      {
        "instruction": "Head north on MG Road",
        "distance": 500,
        "duration": 30
      }
    ]
  }
}
```

### Administrative Boundaries

```
GET /api/v1/boundaries?type=district&parent=Tamil+Nadu
```

**Response:**
```json
{
  "status": "success",
  "boundaries": [
    {
      "name": "Chennai",
      "type": "district",
      "geom": { "type": "MultiPolygon", "coordinates": [...] },
      "bbox": [8.0, 76.5, 13.5, 80.5]
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid latitude value",
    "details": {
      "parameter": "lat",
      "value": "invalid"
    }
  }
}
```

**Common Error Codes:**
- `INVALID_PARAMETER` - Bad parameter format
- `MISSING_PARAMETER` - Required parameter missing
- `OUT_OF_BOUNDS` - Coordinates outside valid range
- `RATE_LIMITED` - API rate limit exceeded
- `NO_RESULTS` - No data found for query
- `SERVICE_ERROR` - Internal server error

---

## Rate Limiting & Caching Strategy

### Public APIs (Nominatim, Overpass, OSRM)

```
Rate Limit: 1-10 requests/second (depending on API)
Strategy: 
  1. Use self-hosted instances for production
  2. Cache frequently accessed geocoding
  3. Use local PostGIS for geographic queries
  4. Queue bulk requests
```

### Backend API

```
Rate Limit: 100 requests/minute (unauthenticated)
           1000 requests/minute (authenticated)

Caching:
  1. Nominatim results: 30 days
  2. OSRM routes: 7 days
  3. Property searches: 1 hour
  4. Boundary data: 30 days
```

---

## Attribution Requirements

Every API response or map display must include:

```html
<!-- For OpenStreetMap data -->
<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>

<!-- For Nominatim -->
Powered by <a href="https://nominatim.org/">Nominatim</a>

<!-- For OSRM -->
Routing by <a href="https://project-osrm.org/">OSRM</a>
```

---

## Production Configuration

### Environment Variables

```bash
# Nominatim
NOMINATIM_URL=http://localhost:8088
NOMINATIM_TIMEOUT=30

# OSRM
OSRM_URL=http://localhost:5000
OSRM_TIMEOUT=30

# PostGIS
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gis_db
DB_USER=postgres
DB_PASSWORD=***
DB_CONNECTION_POOL=20

# API Configuration
API_RATE_LIMIT=1000/minute
CACHE_TTL=3600
LOG_LEVEL=info
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: gis_db
      POSTGRES_PASSWORD: ***

  postgis:
    image: kartoza/postgis:14-latest
    depends_on:
      - postgres

  nominatim:
    image: nominatim/nominatim:latest
    volumes:
      - nominatim_data:/var/nominatim
    ports:
      - "8088:8088"

  osrm:
    image: osrm/osrm-backend:latest
    volumes:
      - ./data/tamil-nadu.osm:/data/tamil-nadu.osm
    ports:
      - "5000:5000"
```

---

**Status:** Ready for implementation
**Last Updated:** 2026-09-11

