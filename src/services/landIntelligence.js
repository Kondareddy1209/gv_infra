/**
 * LAND INTELLIGENCE SERVICE
 * PostGIS spatial query engine for property connectivity analysis
 * Calculates: nearest road/highway/railway station, nearby amenities, water bodies
 * Supports dual-mode: Live PostGIS + Offline Haversine fallback
 */

const fs = require('fs');
const path = require('path');

let pgPool = null;

// Initialize PostgreSQL pool if available
try {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/khammam_realestate';
  pgPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000
  });
  console.log('[LandIntelligence] PostgreSQL Pool initialized with PostGIS');
} catch (err) {
  console.log('[LandIntelligence] pg module not installed or local DB offline; using GeoJSON fallback');
}

/**
 * Cache file path for offline operation
 */
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'osm_features_cache.json');
const CATEGORY_ALIASES = {
  buildings: 'building'
};

/**
 * Load OSM features from cache for offline operation
 */
function loadOSMFeatures() {
  if (!fs.existsSync(CACHE_FILE_PATH)) {
    console.log('[LandIntelligence] No OSM cache file found');
    return [];
  }
  
  try {
    const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
    const features = JSON.parse(cacheData);
    console.log(`[LandIntelligence] Loaded ${features.length} OSM features from cache`);
    return features;
  } catch (error) {
    console.error('[LandIntelligence] Error loading OSM cache:', error.message);
    return [];
  }
}

/**
 * Haversine distance calculation for offline fallback
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate property intelligence using PostGIS
 * @param {number} propertyId - Property ID
 * @param {number} lat - Property latitude
 * @param {number} lon - Property longitude
 * @returns {Promise<Object>} Intelligence data
 */
async function calculateIntelligencePostGIS(propertyId, lat, lon) {
  if (!pgPool) {
    throw new Error('PostgreSQL not available');
  }
  
  console.log(`[LandIntelligence] Calculating intelligence for property ${propertyId} using PostGIS...`);
  
  try {
    const intelligence = {
      property_id: propertyId,
      connectivity: {},
      nearby_amenities: {},
      source: 'POSTGIS',
      computed_at: new Date().toISOString()
    };
    
    // Nearest road
    const nearestRoadQuery = `
      SELECT 
        name, 
        subcategory,
        ST_Distance(geom::GEOGRAPHY, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY) as distance_m
      FROM osm_features
      WHERE category = 'transport' AND subcategory LIKE 'highway_%'
      ORDER BY distance_m
      LIMIT 1
    `;
    const roadResult = await pgPool.query(nearestRoadQuery, [lon, lat]);
    if (roadResult.rows.length > 0) {
      intelligence.connectivity.nearest_road = {
        name: roadResult.rows[0].name,
        type: roadResult.rows[0].subcategory,
        distance_m: parseFloat(roadResult.rows[0].distance_m)
      };
    }
    
    // Nearest highway
    const nearestHighwayQuery = `
      SELECT 
        name, 
        subcategory,
        ST_Distance(geom::GEOGRAPHY, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY) as distance_m
      FROM osm_features
      WHERE category = 'transport' AND (subcategory = 'highway_motorway' OR subcategory = 'highway_trunk' OR tags->'ref' IS NOT NULL)
      ORDER BY distance_m
      LIMIT 1
    `;
    const highwayResult = await pgPool.query(nearestHighwayQuery, [lon, lat]);
    if (highwayResult.rows.length > 0) {
      intelligence.connectivity.nearest_highway = {
        name: highwayResult.rows[0].name,
        type: highwayResult.rows[0].subcategory,
        distance_m: parseFloat(highwayResult.rows[0].distance_m)
      };
    }
    
    // Nearest railway station
    const nearestRailwayQuery = `
      SELECT 
        name, 
        subcategory,
        ST_Distance(geom::GEOGRAPHY, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY) as distance_m
      FROM osm_features
      WHERE category = 'transport' AND subcategory LIKE 'railway_%'
      ORDER BY distance_m
      LIMIT 1
    `;
    const railwayResult = await pgPool.query(nearestRailwayQuery, [lon, lat]);
    if (railwayResult.rows.length > 0) {
      intelligence.connectivity.nearest_railway = {
        name: railwayResult.rows[0].name,
        type: railwayResult.rows[0].subcategory,
        distance_m: parseFloat(railwayResult.rows[0].distance_m)
      };
    }
    
    // Nearest water body
    const nearestWaterQuery = `
      SELECT 
        name, 
        subcategory,
        ST_Distance(geom::GEOGRAPHY, ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY) as distance_m
      FROM osm_features
      WHERE category = 'water'
      ORDER BY distance_m
      LIMIT 1
    `;
    const waterResult = await pgPool.query(nearestWaterQuery, [lon, lat]);
    if (waterResult.rows.length > 0) {
      intelligence.connectivity.nearest_water = {
        name: waterResult.rows[0].name,
        type: waterResult.rows[0].subcategory,
        distance_m: parseFloat(waterResult.rows[0].distance_m)
      };
    }
    
    // Amenities within 3km
    const amenities3kmQuery = `
      SELECT category, COUNT(*) as count
      FROM osm_features
      WHERE ST_DWithin(
        geom::GEOGRAPHY, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY, 
        3000
      )
      GROUP BY category
    `;
    const amenities3kmResult = await pgPool.query(amenities3kmQuery, [lon, lat]);
    intelligence.nearby_amenities.within_3km = {};
    for (const row of amenities3kmResult.rows) {
      intelligence.nearby_amenities.within_3km[row.category] = parseInt(row.count);
    }
    
    // Amenities within 5km
    const amenities5kmQuery = `
      SELECT category, COUNT(*) as count
      FROM osm_features
      WHERE ST_DWithin(
        geom::GEOGRAPHY, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY, 
        5000
      )
      GROUP BY category
    `;
    const amenities5kmResult = await pgPool.query(amenities5kmQuery, [lon, lat]);
    intelligence.nearby_amenities.within_5km = {};
    for (const row of amenities5kmResult.rows) {
      intelligence.nearby_amenities.within_5km[row.category] = parseInt(row.count);
    }
    
    // Specific counts for key categories
    intelligence.nearby_amenities.schools_within_3km = intelligence.nearby_amenities.within_3km.education || 0;
    intelligence.nearby_amenities.hospitals_within_3km = intelligence.nearby_amenities.within_3km.healthcare || 0;
    intelligence.nearby_amenities.commercial_within_3km = intelligence.nearby_amenities.within_3km.commercial || 0;
    intelligence.nearby_amenities.schools_within_5km = intelligence.nearby_amenities.within_5km.education || 0;
    intelligence.nearby_amenities.hospitals_within_5km = intelligence.nearby_amenities.within_5km.healthcare || 0;
    intelligence.nearby_amenities.commercial_within_5km = intelligence.nearby_amenities.within_5km.commercial || 0;
    
    return intelligence;
  } catch (error) {
    console.error('[LandIntelligence] PostGIS calculation failed:', error.message);
    throw error;
  }
}

/**
 * Calculate property intelligence using offline Haversine fallback
 * @param {number} propertyId - Property ID
 * @param {number} lat - Property latitude
 * @param {number} lon - Property longitude
 * @returns {Promise<Object>} Intelligence data
 */
async function calculateIntelligenceOffline(propertyId, lat, lon) {
  console.log(`[LandIntelligence] Calculating intelligence for property ${propertyId} using offline fallback...`);
  
  const features = loadOSMFeatures();
  
  const intelligence = {
    property_id: propertyId,
    connectivity: {},
    nearby_amenities: {},
    source: 'OFFLINE_CACHE',
    computed_at: new Date().toISOString()
  };
  
  // Calculate distances for all features
  const featuresWithDistance = features
    .filter(f => f.latitude !== null && f.longitude !== null)
    .map(f => ({
      ...f,
      distance_m: haversineDistance(lat, lon, f.latitude, f.longitude)
    }));
  
  // Nearest road
  const roads = featuresWithDistance.filter(f => f.category === 'transport' && f.subcategory?.startsWith('highway_'));
  if (roads.length > 0) {
    roads.sort((a, b) => a.distance_m - b.distance_m);
    intelligence.connectivity.nearest_road = {
      name: roads[0].name,
      type: roads[0].subcategory,
      distance_m: roads[0].distance_m
    };
  }
  
  // Nearest highway
  const highways = featuresWithDistance.filter(f => 
    f.category === 'transport' && 
    (f.subcategory === 'highway_motorway' || f.subcategory === 'highway_trunk' || f.tags?.ref)
  );
  if (highways.length > 0) {
    highways.sort((a, b) => a.distance_m - b.distance_m);
    intelligence.connectivity.nearest_highway = {
      name: highways[0].name,
      type: highways[0].subcategory,
      distance_m: highways[0].distance_m
    };
  }
  
  // Nearest railway
  const railways = featuresWithDistance.filter(f => f.category === 'transport' && f.subcategory?.startsWith('railway_'));
  if (railways.length > 0) {
    railways.sort((a, b) => a.distance_m - b.distance_m);
    intelligence.connectivity.nearest_railway = {
      name: railways[0].name,
      type: railways[0].subcategory,
      distance_m: railways[0].distance_m
    };
  }
  
  // Nearest water
  const water = featuresWithDistance.filter(f => f.category === 'water');
  if (water.length > 0) {
    water.sort((a, b) => a.distance_m - b.distance_m);
    intelligence.connectivity.nearest_water = {
      name: water[0].name,
      type: water[0].subcategory,
      distance_m: water[0].distance_m
    };
  }
  
  // Amenities within 3km
  const within3km = featuresWithDistance.filter(f => f.distance_m <= 3000);
  intelligence.nearby_amenities.within_3km = {};
  for (const feature of within3km) {
    const category = feature.category || 'other';
    intelligence.nearby_amenities.within_3km[category] = (intelligence.nearby_amenities.within_3km[category] || 0) + 1;
  }
  
  // Amenities within 5km
  const within5km = featuresWithDistance.filter(f => f.distance_m <= 5000);
  intelligence.nearby_amenities.within_5km = {};
  for (const feature of within5km) {
    const category = feature.category || 'other';
    intelligence.nearby_amenities.within_5km[category] = (intelligence.nearby_amenities.within_5km[category] || 0) + 1;
  }
  
  // Specific counts
  intelligence.nearby_amenities.schools_within_3km = intelligence.nearby_amenities.within_3km.education || 0;
  intelligence.nearby_amenities.hospitals_within_3km = intelligence.nearby_amenities.within_3km.healthcare || 0;
  intelligence.nearby_amenities.commercial_within_3km = intelligence.nearby_amenities.within_3km.commercial || 0;
  intelligence.nearby_amenities.schools_within_5km = intelligence.nearby_amenities.within_5km.education || 0;
  intelligence.nearby_amenities.hospitals_within_5km = intelligence.nearby_amenities.within_5km.healthcare || 0;
  intelligence.nearby_amenities.commercial_within_5km = intelligence.nearby_amenities.within_5km.commercial || 0;
  
  return intelligence;
}

/**
 * Calculate property intelligence with dual-mode support
 * @param {number} propertyId - Property ID
 * @param {number} lat - Property latitude
 * @param {number} lon - Property longitude
 * @returns {Promise<Object>} Intelligence data
 */
async function calculateIntelligence(propertyId, lat, lon) {
  if (pgPool) {
    try {
      return await calculateIntelligencePostGIS(propertyId, lat, lon);
    } catch (error) {
      console.warn('[LandIntelligence] PostGIS failed, falling back to offline mode:', error.message);
      return await calculateIntelligenceOffline(propertyId, lat, lon);
    }
  } else {
    return await calculateIntelligenceOffline(propertyId, lat, lon);
  }
}

/**
 * Get OSM features by category with spatial filtering
 * @param {string} category - Feature category
 * @param {number} lat - Center latitude (optional)
 * @param {number} lon - Center longitude (optional)
 * @param {number} radiusKm - Search radius in km (optional)
 * @returns {Promise<Array>} Array of features
 */
async function getFeaturesByCategory(category, lat = null, lon = null, radiusKm = null) {
  const normalizedCategory = CATEGORY_ALIASES[category] || category;

  if (pgPool) {
    try {
      let query = 'SELECT * FROM osm_features';
      const params = [];

      if (normalizedCategory !== 'all') {
        query += ' WHERE category = $1';
        params.push(normalizedCategory);
      }
      
      if (lat !== null && lon !== null && radiusKm !== null) {
        const parameterOffset = params.length + 1;
        query += `${params.length ? ' AND' : ' WHERE'} ST_DWithin(geom::GEOGRAPHY, ST_SetSRID(ST_MakePoint($${parameterOffset}, $${parameterOffset + 1}), 4326)::GEOGRAPHY, $${parameterOffset + 2})`;
        params.push(lon, lat, radiusKm * 1000); // Convert km to meters
      }
      
      const result = await pgPool.query(query, params);
      return result.rows;
    } catch (error) {
      console.warn('[LandIntelligence] PostGIS query failed, using cache:', error.message);
    }
  }
  
  // Fallback to cache
  const features = loadOSMFeatures();
  let filtered = normalizedCategory === 'all'
    ? features
    : features.filter(f => f.category === normalizedCategory);
  
  if (lat !== null && lon !== null && radiusKm !== null) {
    filtered = filtered.filter(f => {
      if (f.latitude === null || f.longitude === null) return false;
      const distance = haversineDistance(lat, lon, f.latitude, f.longitude);
      return distance <= radiusKm * 1000;
    });
  }
  
  return filtered;
}

/**
 * Get property verification status
 * @param {number} propertyId - Property ID
 * @returns {Promise<Object>} Property verification data
 */
async function getPropertyVerification(propertyId) {
  if (!pgPool) {
    // Return mock data for offline mode
    return {
      property_id: propertyId,
      verification_status: 'pending',
      source_type: 'ADMIN_VERIFIED',
      verified_at: null
    };
  }
  
  try {
    const query = 'SELECT id, verification_status, source_type, updated_at FROM properties WHERE id = $1';
    const result = await pgPool.query(query, [propertyId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      property_id: result.rows[0].id,
      verification_status: result.rows[0].verification_status,
      source_type: result.rows[0].source_type,
      verified_at: result.rows[0].updated_at
    };
  } catch (error) {
    console.error('[LandIntelligence] Error getting property verification:', error.message);
    return null;
  }
}

module.exports = {
  calculateIntelligence,
  calculateIntelligencePostGIS,
  calculateIntelligenceOffline,
  getFeaturesByCategory,
  getPropertyVerification,
  haversineDistance,
  loadOSMFeatures
};
