CREATE EXTENSION IF NOT EXISTS postgis;

-- =========================================================
-- OSM FEATURES
-- =========================================================

CREATE TABLE IF NOT EXISTS osm_features (
    id BIGSERIAL PRIMARY KEY,

    osm_id BIGINT NOT NULL,
    osm_type TEXT NOT NULL,

    name TEXT,

    category TEXT NOT NULL,
    subcategory TEXT,

    tags JSONB NOT NULL DEFAULT '{}'::jsonb,

    geom GEOMETRY(Geometry, 4326) NOT NULL,
    centroid GEOMETRY(Point, 4326),

    source TEXT NOT NULL DEFAULT 'OpenStreetMap',
    source_version TEXT,

    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (osm_id, osm_type)
);

CREATE INDEX IF NOT EXISTS osm_features_geom_gist_idx
ON osm_features USING GIST (geom);

CREATE INDEX IF NOT EXISTS osm_features_centroid_gist_idx
ON osm_features USING GIST (centroid);

CREATE INDEX IF NOT EXISTS osm_features_category_idx
ON osm_features(category);

CREATE INDEX IF NOT EXISTS osm_features_osm_id_idx
ON osm_features(osm_id);


-- =========================================================
-- VERIFIED PROPERTIES
-- =========================================================

CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,

    property_code TEXT UNIQUE NOT NULL,

    title TEXT NOT NULL,

    district TEXT NOT NULL,
    mandal TEXT,
    village TEXT,

    survey_number TEXT,

    land_type TEXT,

    area_value NUMERIC(14,4),
    area_unit TEXT,

    price NUMERIC(18,2),
    currency CHAR(3) DEFAULT 'INR',

    location GEOMETRY(Point, 4326),

    boundary GEOMETRY(MultiPolygon, 4326),

    verification_status TEXT NOT NULL DEFAULT 'PENDING',

    source_type TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT properties_verification_status_check
    CHECK (
        verification_status IN (
            'PENDING',
            'VERIFIED',
            'REJECTED'
        )
    )
);

CREATE INDEX IF NOT EXISTS properties_boundary_gist_idx
ON properties USING GIST(boundary);

CREATE INDEX IF NOT EXISTS properties_location_gist_idx
ON properties USING GIST(location);

CREATE INDEX IF NOT EXISTS properties_village_idx
ON properties(village);

CREATE INDEX IF NOT EXISTS properties_verification_idx
ON properties(verification_status);


-- =========================================================
-- OSM IMPORT RUNS
-- =========================================================

CREATE TABLE IF NOT EXISTS osm_import_runs (
    id BIGSERIAL PRIMARY KEY,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    bbox TEXT,

    feature_count INTEGER DEFAULT 0,

    status TEXT NOT NULL,

    error_message TEXT,

    source TEXT DEFAULT 'Overpass'
);

-- Initial Seed Data for Verified Properties
INSERT INTO properties (
    property_code, title, district, mandal, village, survey_number, land_type, area_value, area_unit, price, currency, location, verification_status, source_type
) VALUES (
    'LAND-001', 'Stambadri Enclave - Plot 01', 'Khammam', 'Khammam Urban', 'Gurralapadu', '45-A', 'Residential', 250.00, 'sq.yards', 4625000.00, 'INR', ST_SetSRID(ST_MakePoint(80.1512, 17.2475), 4326), 'VERIFIED', 'ADMIN_VERIFIED'
), (
    'LAND-002', 'Stambadri Enclave - Plot 02', 'Khammam', 'Khammam Urban', 'Gurralapadu', '45-A', 'Residential', 300.00, 'sq.yards', 5550000.00, 'INR', ST_SetSRID(ST_MakePoint(80.1515, 17.2478), 4326), 'VERIFIED', 'ADMIN_VERIFIED'
)
ON CONFLICT (property_code) DO NOTHING;

