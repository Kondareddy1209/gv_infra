/**
 * POSTGRESQL + POSTGIS POOL CONNECTOR
 * Configures PostgreSQL client pool with fallback to mock/local memory dataset
 * if a live PostgreSQL database is not connected.
 */

const fs = require('fs');
const path = require('path');

let pgPool = null;

try {
  const { Pool } = require('pg');
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/khammam_gis';
  pgPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2000
  });
  console.log('[Database] PostgreSQL Pool initialized with PostGIS');
} catch (err) {
  console.log('[Database] pg module not installed or local DB offline; using GeoJSON fallback dataset');
}

function getGeometryCentroid(geometry) {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  const points = [];
  const collectPoints = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && value.every((item) => typeof item === 'number')) {
      points.push(value);
      return;
    }
    value.forEach(collectPoints);
  };

  collectPoints(coordinates);
  if (points.length === 0) return null;

  const totals = points.reduce(
    (accumulator, [longitude, latitude]) => ({
      longitude: accumulator.longitude + longitude,
      latitude: accumulator.latitude + latitude
    }),
    { longitude: 0, latitude: 0 }
  );

  return {
    longitude: totals.longitude / points.length,
    latitude: totals.latitude / points.length
  };
}

/**
 * Helper to query PostGIS database or fallback to custom_plots.geojson
 */
async function query(text, params = []) {
  if (pgPool) {
    try {
      return await pgPool.query(text, params);
    } catch (err) {
      console.warn('[Database] PostGIS query failed; falling back to local GeoJSON dataset:', err.message);
    }
  }

  // Load custom_plots.geojson fallback dataset
  const geojsonPath = path.join(process.cwd(), 'custom_plots.geojson');
  let plots = [];

  if (fs.existsSync(geojsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
      plots = (data.features || []).map((feat, idx) => {
        const props = feat.properties || {};
        const centroid = getGeometryCentroid(feat.geometry);
        const extentSqyards = props.extent_sqyards || props.size || 250;
        const pricePerSqyard = props.price_per_sqyard || 18500;
        return {
          id: props.plot_id || `plot-${idx + 1}`,
          plot_number: props.plot_number || String(idx + 1).padStart(2, '0'),
          survey_number: props.survey_number || '45-A',
          extent_sqyards: extentSqyards,
          facing: props.facing || (idx % 2 === 0 ? 'East' : 'North'),
          status: (props.status || 'available').trim(),
          price_per_sqyard: pricePerSqyard,
          total_price: props.total_price || extentSqyards * pricePerSqyard,
          latitude: centroid?.latitude ?? null,
          longitude: centroid?.longitude ?? null,
          boundary_geojson: JSON.stringify(feat.geometry)
        };
      });
    } catch (e) {
      console.error('[Database] Failed parsing fallback GeoJSON:', e);
    }
  }

  // Basic filter simulation for memory fallback
  let filtered = [...plots];

  if (text.includes('FROM properties') && text.includes('WHERE id = $1')) {
    filtered = filtered.filter((plot) => String(plot.id) === String(params[0]));
  }

  // Parameter filter matching
  if (text.includes('status =')) {
    const statusVal = params[0];
    if (statusVal && statusVal !== 'all') {
      filtered = filtered.filter(p => p.status.toLowerCase() === statusVal.toLowerCase());
    }
  }

  if (text.includes('facing =')) {
    const facingVal = params[1] || params[0];
    if (facingVal && facingVal !== 'all') {
      filtered = filtered.filter(p => p.facing.toLowerCase() === facingVal.toLowerCase());
    }
  }

  if (text.includes('total_price <=')) {
    const maxPrice = params[params.length - 1];
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => p.total_price <= maxPrice);
    }
  }

  return { rows: filtered, count: filtered.length };
}

module.exports = {
  query,
  getGeometryCentroid
};
