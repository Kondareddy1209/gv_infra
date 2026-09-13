# Telangana Cadastral GIS & Land Parcel Integration Guide

## Executive Summary
This document outlines the technical architecture, legal compliance considerations, and GIS data pipeline for integrating **Telangana State Official Cadastral Land Parcel Boundaries (TGRAC / Bhunaksha / Bhu Bharati)** with real-time satellite imagery and 3D land masterplans for the GV Infra real estate platform.

---

## 1. Official Government GIS Endpoints Identified

### Telangana State TGRAC (Telangana Geographic Information Regulatory & Auxiliary Center)
- **Bhunaksha MapServer (Parcels, ULB, Prohibited Lands):**  
  `https://tgrac.telangana.gov.in/arcgis/rest/services/Bhunaksha_Folder/Bhunaksha/MapServer`
- **Bhunaksha Cadastral 30cm Layer:**  
  `https://tgrac.telangana.gov.in/arcgis/rest/services/Bhunaksha_Folder/Bhunaksha_Cadastral/MapServer`
- **Bhu Bharati Official GIS Portal:**  
  `https://bhubharati.telangana.gov.in/gis/`

---

## 2. 5-Layer GIS Architecture

| Layer | Type | Data Source | Function |
|---|---|---|---|
| **Layer A** | Satellite Imagery | Esri World Imagery / Google Tile API | Real physical world & aerial view |
| **Layer B** | Telangana Cadastral | TGRAC ArcGIS REST / Bhunaksha 30cm | Legal survey & parcel polygon boundaries |
| **Layer C** | OpenStreetMap (OSM) | OSM Vector / Raster Tiles | Roads, highways, villages, landmarks |
| **Layer D** | Property Data Layer | PostgreSQL / PostGIS DB | Plot pricing, facing, Vastu, status, leads |
| **Layer E** | Project Masterplan | GeoJSON / 3D Mesh / Three.js | Gated community layout & individual plot overlays |

---

## 3. PostGIS Database Schema for Land Parcels

```sql
-- PostGIS Land Parcel Table
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE telangana_land_parcels (
    id SERIAL PRIMARY KEY,
    survey_number VARCHAR(50) NOT NULL,
    district VARCHAR(100) DEFAULT 'Khammam',
    mandal VARCHAR(100) DEFAULT 'Khammam Rural',
    village VARCHAR(100) DEFAULT 'Gurralapadu',
    area_acres NUMERIC(8,2),
    area_sq_yards NUMERIC(10,2),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    owner_info TEXT,
    parcel_status VARCHAR(50) DEFAULT 'VERIFIED',
    boundary_geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index for Fast Point-in-Polygon & Spatial Queries
CREATE INDEX idx_parcels_geom ON telangana_land_parcels USING GIST (boundary_geom);

-- Example Spatial Query: Point-In-Polygon Lookup
SELECT survey_number, district, mandal, village, area_acres
FROM telangana_land_parcels
WHERE ST_Contains(boundary_geom, ST_SetSRID(ST_MakePoint(80.14368, 17.24767), 4326));
```

---

## 4. Frontend Integration (`js/telangana-gis.js`)

The project includes `js/telangana-gis.js` which provides:
1. `searchBySurveyNumber(surveyNo, district, mandal, village)`
2. `identifyByCoordinates(lat, lng)` (Point-in-Polygon identification)
3. `highlightParcelOnMap(map, parcel)` (Glowing boundary overlay in MapLibre/Leaflet)
4. TGRAC REST query & identify fallback engine.

---

## 5. Important Legal & Compliance Notice

> **Disclaimer Requirement:**  
> "Map visualization only. Parcel boundaries and land records are displayed for informational purposes and should be independently verified with official Telangana Revenue / Bhu Bharati records before any financial transaction."

*Note: Before using TGRAC REST data for commercial redistribution, formal written confirmation should be requested from TGRAC / Telangana Revenue Department.*
