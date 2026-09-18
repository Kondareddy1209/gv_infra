-- KHAMMAM 3D REAL ESTATE GIS - POSTGIS DATABASE SCHEMA (100% FREE DATA)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Layer Provenance Metadata
CREATE TABLE IF NOT EXISTS layer_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_name VARCHAR(100) NOT NULL UNIQUE,
  source_name VARCHAR(255) NOT NULL,
  source_url TEXT,
  acquisition_date DATE NOT NULL,
  license_type VARCHAR(100) NOT NULL,
  is_authoritative BOOLEAN DEFAULT false,
  attribution_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Administrative Units (District, Mandals, Villages)
CREATE TABLE IF NOT EXISTS administrative_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  unit_type VARCHAR(50) NOT NULL CHECK (unit_type IN ('district', 'mandal', 'village')),
  code VARCHAR(50),
  parent_id UUID REFERENCES administrative_units(id),
  boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
  boundary_utm GEOMETRY(MultiPolygon, 32644), -- UTM Zone 44N for Telangana
  area_sqkm NUMERIC(12, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_units_geom ON administrative_units USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_admin_units_type ON administrative_units(unit_type);

-- Authoritative Land Parcels (Survey & Sub-division Boundaries)
CREATE TABLE IF NOT EXISTS land_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_number VARCHAR(50) NOT NULL UNIQUE,
  survey_number VARCHAR(100) NOT NULL,
  village_name VARCHAR(100) DEFAULT 'Gurralapadu',
  extent_sqyards NUMERIC(12, 2) NOT NULL,
  facing VARCHAR(20) CHECK (facing IN ('North', 'East', 'West', 'South', 'North-East', 'North-West', 'South-East', 'South-West')),
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'hold')),
  price_per_sqyard NUMERIC(10, 2) DEFAULT 18500.00,
  total_price NUMERIC(14, 2),
  source_reference VARCHAR(255) DEFAULT 'Stambadri Enclave Survey',
  boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
  boundary_utm GEOMETRY(MultiPolygon, 32644),
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parcels_geom ON land_parcels USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON land_parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_survey ON land_parcels(survey_number);

-- Insert Default Provenance Metadata
INSERT INTO layer_provenance (layer_name, source_name, source_url, acquisition_date, license_type, is_authoritative, attribution_text)
VALUES 
('esri_satellite', 'Esri World Imagery', 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer', '2026-09-18', 'Public Free Access', false, 'Tiles © Esri'),
('custom_plots', 'GV Infra Stambadri Survey', 'custom_plots.geojson', '2026-09-18', 'Proprietary Survey Data', true, '© GV Infra Projects')
ON CONFLICT (layer_name) DO NOTHING;
