# PostGIS Setup Guide for Tamil Nadu Real Estate Platform

## Installation & Configuration

### 1. Install PostgreSQL + PostGIS (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL and PostGIS
sudo apt install -y postgresql postgresql-contrib postgis postgresql-14-postgis-3

# Verify installation
psql --version
# Output: psql (PostgreSQL) 14.x

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostGIS
sudo -u postgres psql -c "SELECT version();"
```

### 2. Create Database and Enable PostGIS

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE gis_db;

# Connect to new database
\c gis_db

# Enable PostGIS extension
CREATE EXTENSION postgis;

# Verify PostGIS
SELECT PostGIS_version();
-- Output: POSTGIS="3.x.x" ...

# Create schema for OSM data
CREATE SCHEMA osm;

# Create schema for application data
CREATE SCHEMA app;

# Exit
\q
```

### 3. Install OSM Import Tools

```bash
# Install osm2pgsql (converts OSM to PostgreSQL)
sudo apt install -y osm2pgsql

# Install osmium-tool (filters/manipulates OSM data)
sudo apt install -y osmium-tool

# Verify
osm2pgsql --version
osmium --version
```

### 4. Download Tamil Nadu Data

**Option A: From Geofabrik (Recommended for India)**

```bash
# Create data directory
mkdir -p ~/gis-data && cd ~/gis-data

# Download India extract (latest)
wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# This gives you all of India (currently ~650 MB)
# To get only Tamil Nadu, extract using osmium
```

**Option B: Extract Tamil Nadu from India extract**

```bash
# Extract Tamil Nadu bounding box
# Tamil Nadu: North 13.5, South 8.0, East 80.5, West 76.5

osmium extract \
  -b 76.5,8.0,80.5,13.5 \
  india-latest.osm.pbf \
  -o tamil-nadu.osm.pbf

# Verify extraction
osm2pgsql --latlong tamil-nadu.osm.pbf | head -20
```

### 5. Import OSM Data into PostGIS

**Method 1: Using osm2pgsql (Simple)**

```bash
# Create flat nodes file (faster import)
sudo mkdir -p /data/osm-nodes
sudo chown postgres:postgres /data/osm-nodes

# Import Tamil Nadu data
osm2pgsql \
  --slim \
  --log-progress true \
  --number-processes 4 \
  --cache 350 \
  --flat-nodes /data/osm-nodes/tamil-nadu.nodes \
  --style /usr/share/osm2pgsql/default.style \
  --database gis_db \
  --username postgres \
  --host localhost \
  tamil-nadu.osm.pbf

# This creates tables:
# - planet_osm_point
# - planet_osm_line
# - planet_osm_polygon
# - planet_osm_roads
# - planet_osm_ways
```

**Method 2: Using pgsql style (Alternative)**

```bash
osm2pgsql \
  --slim \
  --create \
  --style /usr/share/osm2pgsql/style.sql \
  --database gis_db \
  --number-processes 4 \
  tamil-nadu.osm.pbf
```

### 6. Verify Import

```bash
# Connect to database
psql -d gis_db -U postgres

# Check tables created
\dt planet_osm_*

# Count features
SELECT COUNT(*) FROM planet_osm_point;  -- Should be millions
SELECT COUNT(*) FROM planet_osm_polygon;  -- Should be millions
SELECT COUNT(*) FROM planet_osm_line;  -- Should be millions

# Check for schools
SELECT name, way FROM planet_osm_point 
WHERE amenity = 'school' 
LIMIT 5;

# Check for hospitals
SELECT name FROM planet_osm_polygon 
WHERE amenity = 'hospital' 
LIMIT 5;

# Exit
\q
```

---

## Create Application Schema

### 1. Create Core Tables

```sql
-- Connect to gis_db first
psql -d gis_db -U postgres

-- Create application schema
CREATE SCHEMA IF NOT EXISTS real_estate;
SET search_path TO real_estate;

-- Properties Table
CREATE TABLE properties (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identification
  source VARCHAR(50) NOT NULL DEFAULT 'USER_SUBMITTED',
  source_id VARCHAR(255),
  
  -- Location Details
  survey_number VARCHAR(100),
  subdivision_number VARCHAR(100),
  district VARCHAR(100) NOT NULL,
  taluk VARCHAR(100),
  village VARCHAR(100),
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geom GEOMETRY(POINT, 4326),
  
  -- Property Details
  area DECIMAL(12, 2),
  area_unit VARCHAR(20),  -- 'sqft', 'sqm', 'acres', 'cents'
  land_use VARCHAR(100),
  road_access VARCHAR(255),
  
  -- Status & Verification
  verification_status VARCHAR(50) DEFAULT 'UNVERIFIED',
  price DECIMAL(15, 2),
  price_currency VARCHAR(10) DEFAULT 'INR',
  listing_status VARCHAR(50) DEFAULT 'ACTIVE',
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  
  CONSTRAINT fk_district_check CHECK (district IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_properties_geom ON properties USING GIST(geom);
CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_taluk ON properties(taluk);
CREATE INDEX idx_properties_village ON properties(village);
CREATE INDEX idx_properties_verification ON properties(verification_status);
CREATE INDEX idx_properties_status ON properties(listing_status);
CREATE INDEX idx_properties_created ON properties(created_at DESC);

-- Property Boundaries
CREATE TABLE property_boundaries (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  boundary GEOMETRY(POLYGON, 4326) NOT NULL,
  source VARCHAR(50) DEFAULT 'USER_SURVEYED',  -- 'OSM', 'USER_SURVEYED', 'GOVERNMENT'
  accuracy_meters DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT boundary_non_empty CHECK (ST_IsValid(boundary) AND ST_Area(boundary) > 0)
);

CREATE INDEX idx_property_boundaries_geom ON property_boundaries USING GIST(boundary);
CREATE INDEX idx_property_boundaries_property ON property_boundaries(property_id);

-- Government Verification
CREATE TABLE government_verification (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  patta_status VARCHAR(50),  -- 'NOT_CHECKED', 'VERIFIED', 'DISPUTED', 'NOT_APPLICABLE'
  chitta_status VARCHAR(50),
  adangal_status VARCHAR(50),
  ec_status VARCHAR(50),  -- Encumbrance Certificate
  document_reference VARCHAR(255),
  verification_date DATE,
  verified_by VARCHAR(255),
  verification_source VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OSM Features Near Property
CREATE TABLE osm_features (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  osm_id BIGINT,
  feature_type VARCHAR(50),  -- 'school', 'hospital', 'road', 'park', 'shop'
  name VARCHAR(255),
  geom GEOMETRY(POINT, 4326),
  distance_meters DECIMAL(10, 2) NOT NULL,
  amenity_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_osm_features_property ON osm_features(property_id);
CREATE INDEX idx_osm_features_type ON osm_features(feature_type);
CREATE INDEX idx_osm_features_distance ON osm_features(distance_meters);

-- Administrative Boundaries
CREATE TABLE administrative_boundaries (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL,  -- 'country', 'state', 'district', 'taluk', 'village'
  parent_id BIGINT REFERENCES administrative_boundaries(id),
  geom GEOMETRY(MULTIPOLYGON, 4326),
  osm_id BIGINT,
  population INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_geom CHECK (ST_IsValid(geom))
);

CREATE INDEX idx_admin_boundaries_name ON administrative_boundaries(name);
CREATE INDEX idx_admin_boundaries_level ON administrative_boundaries(level);
CREATE INDEX idx_admin_boundaries_geom ON administrative_boundaries USING GIST(geom);
CREATE INDEX idx_admin_boundaries_parent ON administrative_boundaries(parent_id);

-- Address Geocoding Cache
CREATE TABLE address_cache (
  id BIGSERIAL PRIMARY KEY,
  address VARCHAR(500) NOT NULL UNIQUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geom GEOGRAPHY(POINT, 4326),
  source VARCHAR(50),  -- 'NOMINATIM', 'USER', 'GOVERNMENT'
  accuracy VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_address_cache_address ON address_cache(address);
CREATE INDEX idx_address_cache_geom ON address_cache USING GIST(geom);

-- Distance & Route Cache
CREATE TABLE distance_cache (
  id BIGSERIAL PRIMARY KEY,
  from_lat DECIMAL(10, 8) NOT NULL,
  from_lon DECIMAL(11, 8) NOT NULL,
  to_lat DECIMAL(10, 8) NOT NULL,
  to_lon DECIMAL(11, 8) NOT NULL,
  distance_meters DECIMAL(12, 2) NOT NULL,
  duration_seconds INTEGER,
  route_type VARCHAR(50) DEFAULT 'driving',  -- 'driving', 'walking', 'cycling'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  CONSTRAINT distance_positive CHECK (distance_meters > 0)
);

CREATE INDEX idx_distance_cache_from ON distance_cache(from_lat, from_lon);
CREATE INDEX idx_distance_cache_to ON distance_cache(to_lat, to_lon);

-- Extract villages and taluks from OSM for quick reference
CREATE MATERIALIZED VIEW administrative_reference AS
SELECT DISTINCT 
  p.osm_id,
  p.name,
  p.admin_level,
  ST_Centroid(p.way) as center,
  p.way as geom
FROM public.planet_osm_polygon p
WHERE p.admin_level IN ('6', '8', '9', '10')  -- Taluk, Village, etc.
  AND p.name IS NOT NULL;

CREATE INDEX idx_admin_ref_name ON administrative_reference(name);
CREATE INDEX idx_admin_ref_geom ON administrative_reference USING GIST(geom);
```

### 2. Create Useful Functions

```sql
-- Distance between two properties
CREATE OR REPLACE FUNCTION property_distance_km(
  prop_id_1 BIGINT,
  prop_id_2 BIGINT
) RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT ST_Distance(
      (SELECT geom FROM properties WHERE id = prop_id_1)::geography,
      (SELECT geom FROM properties WHERE id = prop_id_2)::geography
    ) / 1000
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find properties within distance
CREATE OR REPLACE FUNCTION properties_within_radius(
  center_lat DECIMAL,
  center_lon DECIMAL,
  radius_km INTEGER
) RETURNS TABLE(
  id BIGINT,
  name VARCHAR,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.survey_number, p.village) as name,
    (ST_Distance(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography
    ) / 1000) as distance_km
  FROM properties p
  WHERE ST_DWithin(
    p.geom::geography,
    ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get nearby amenities for property
CREATE OR REPLACE FUNCTION property_nearby_amenities(
  prop_id BIGINT,
  radius_meters INTEGER DEFAULT 5000
) RETURNS TABLE(
  amenity_type VARCHAR,
  name VARCHAR,
  distance_meters DECIMAL,
  count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.amenity::VARCHAR,
    p.name,
    MIN(ST_Distance(
      ST_SetSRID(ST_MakePoint(prop.longitude, prop.latitude), 4326)::geography,
      COALESCE(p.way::geography, ST_SetSRID(ST_Point(p.lon, p.lat), 4326)::geography)
    )) as distance_meters,
    COUNT(*) as count
  FROM public.planet_osm_polygon p
  CROSS JOIN properties prop
  WHERE prop.id = prop_id
    AND p.amenity IS NOT NULL
    AND ST_DWithin(
      COALESCE(p.way::geography, ST_SetSRID(ST_Point(p.lon, p.lat), 4326)::geography),
      ST_SetSRID(ST_MakePoint(prop.longitude, prop.latitude), 4326)::geography,
      radius_meters
    )
  GROUP BY p.amenity, p.name
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3. Create Views for Frontend

```sql
-- Properties with verification status
CREATE VIEW property_listing AS
SELECT 
  p.id,
  p.survey_number,
  p.district,
  p.taluk,
  p.village,
  p.area,
  p.area_unit,
  p.price,
  p.verification_status,
  p.geom,
  CASE 
    WHEN gv.patta_status = 'VERIFIED' THEN TRUE 
    ELSE FALSE 
  END as govt_verified,
  ST_AsGeoJSON(p.geom) as geojson
FROM real_estate.properties p
LEFT JOIN real_estate.government_verification gv ON p.id = gv.property_id
WHERE p.listing_status = 'ACTIVE';

-- Amenity heatmap
CREATE VIEW amenity_heatmap AS
SELECT 
  (p.lon + p.lat)::VARCHAR as grid_cell,
  p.amenity,
  COUNT(*) as count,
  ST_ClusterIntersecting(p.way) as clusters
FROM public.planet_osm_polygon p
WHERE p.amenity IN ('school', 'hospital', 'police', 'bank')
GROUP BY grid_cell, p.amenity;
```

---

## Query Examples

### Search Properties

```sql
-- Properties in a district
SELECT id, survey_number, area, price 
FROM real_estate.properties
WHERE district = 'Chennai'
  AND verification_status != 'UNVERIFIED'
ORDER BY created_at DESC
LIMIT 50;

-- Properties by area
SELECT id, survey_number, area, area_unit, price
FROM real_estate.properties
WHERE area BETWEEN 1000 AND 5000
  AND area_unit = 'sqft'
ORDER BY price DESC;

-- Verified properties in village
SELECT id, survey_number, area, price
FROM real_estate.properties
WHERE village = 'Avadi'
  AND verification_status IN ('FULLY_VERIFIED', 'GOVERNMENT_DATA_MATCHED')
ORDER BY area;
```

### Geographic Queries

```sql
-- Properties within 5 km of a point
SELECT id, survey_number, area,
  ST_Distance(geom::geography, 
    ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography) / 1000 as distance_km
FROM real_estate.properties
WHERE ST_DWithin(geom::geography,
  ST_SetSRID(ST_MakePoint(80.2707, 13.0827), 4326)::geography, 5000)
ORDER BY distance_km;

-- Properties in a district boundary
SELECT p.id, p.survey_number, p.area
FROM real_estate.properties p, real_estate.administrative_boundaries ab
WHERE ab.name = 'Chennai' AND ab.level = 'district'
  AND ST_Within(p.geom, ab.geom);

-- Nearest hospital to property
SELECT DISTINCT ON (p.id) p.id, hosp.name,
  ST_Distance(p.geom::geography, hosp.way::geography) / 1000 as distance_km
FROM real_estate.properties p
CROSS JOIN public.planet_osm_polygon hosp
WHERE hosp.amenity = 'hospital'
  AND p.id = 123
ORDER BY p.id, distance_km;
```

### Statistics

```sql
-- Property count by district
SELECT district, COUNT(*) as count, AVG(price) as avg_price
FROM real_estate.properties
WHERE verification_status NOT IN ('UNVERIFIED', 'USER_SUBMITTED')
GROUP BY district
ORDER BY count DESC;

-- Amenity coverage
SELECT amenity_type, COUNT(*) as count
FROM real_estate.osm_features
GROUP BY amenity_type
ORDER BY count DESC;

-- Verification status distribution
SELECT verification_status, COUNT(*) as count
FROM real_estate.properties
GROUP BY verification_status;
```

---

## Performance Tuning

### 1. Create Indexes for Common Queries

```sql
-- Already included in schema creation above
-- Key indexes for real estate queries:
-- - GIST on geometries (for spatial queries)
-- - B-tree on text (district, taluk, village)
-- - B-tree on dates (for recent listings)
```

### 2. VACUUM and ANALYZE

```bash
# Regular maintenance (add to crontab)
psql -d gis_db -c "VACUUM ANALYZE real_estate.properties;"
psql -d gis_db -c "VACUUM ANALYZE real_estate.osm_features;"

# Or via SQL
VACUUM ANALYZE real_estate.properties;
ANALYZE real_estate.administrative_boundaries;
```

### 3. Enable Query Planner Statistics

```sql
-- Increase table statistics for better query planning
ALTER TABLE real_estate.properties ALTER COLUMN geom SET STATISTICS 1000;
ANALYZE real_estate.properties;
```

---

## Backup & Recovery

### Backup

```bash
# Full database backup
pg_dump -d gis_db -U postgres > gis_db_backup.sql

# Compressed backup
pg_dump -d gis_db -U postgres | gzip > gis_db_backup.sql.gz

# Custom format (faster restore)
pg_dump -d gis_db -U postgres -Fc -f gis_db_backup.dump
```

### Restore

```bash
# From SQL backup
psql -d gis_db -U postgres -f gis_db_backup.sql

# From custom format
pg_restore -d gis_db -U postgres gis_db_backup.dump
```

---

## Production Checklist

- [ ] PostgreSQL running on stable version (14+)
- [ ] PostGIS properly installed and verified
- [ ] Tamil Nadu OSM data imported
- [ ] Indexes created
- [ ] Functions tested
- [ ] Views accessible
- [ ] Backup scheduled daily
- [ ] Connection pooling configured
- [ ] WAL (Write-Ahead Logging) enabled
- [ ] Monitoring alerts set up

---

**Status:** Ready for implementation
**Last Updated:** 2026-09-11

