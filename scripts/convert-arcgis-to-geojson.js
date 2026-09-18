/**
 * Utility script to convert ArcGIS REST JSON FeatureSet (esriGeometryPolygon)
 * to standard GeoJSON FeatureCollection.
 *
 * Usage:
 *   node scripts/convert-arcgis-to-geojson.js path/to/arcgis_input.json path/to/output.geojson
 */

const fs = require('fs');
const path = require('path');

function esriRingsToGeoJSONCoordinates(rings) {
  return rings;
}

function convertEsriFeatureToGeoJSON(feature) {
  const properties = feature.attributes || {};
  let geometry = null;

  if (feature.geometry && feature.geometry.rings) {
    const rings = esriRingsToGeoJSONCoordinates(feature.geometry.rings);
    if (rings.length === 1) {
      geometry = {
        type: "Polygon",
        coordinates: rings
      };
    } else {
      geometry = {
        type: "MultiPolygon",
        coordinates: rings.map(ring => [ring])
      };
    }
  }

  return {
    type: "Feature",
    properties: properties,
    geometry: geometry
  };
}

function convertArcGISJSONToGeoJSON(arcgisJson) {
  const features = (arcgisJson.features || []).map(convertEsriFeatureToGeoJSON);
  return {
    type: "FeatureCollection",
    features: features
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("Usage: node scripts/convert-arcgis-to-geojson.js <arcgis_input.json> [output.geojson]");
    process.exit(1);
  }

  const inputFile = path.resolve(args[0]);
  const outputFile = args[1] ? path.resolve(args[1]) : path.resolve(__dirname, '../data/converted_cadastral.geojson');

  try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    const arcgisJson = JSON.parse(rawData);
    const geojson = convertArcGISJSONToGeoJSON(arcgisJson);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(geojson, null, 2), 'utf8');
    console.log(`✅ Successfully converted ${geojson.features.length} ArcGIS features to GeoJSON: ${outputFile}`);
  } catch (err) {
    console.error("❌ Conversion failed:", err.message);
  }
}

module.exports = { convertArcGISJSONToGeoJSON, convertEsriFeatureToGeoJSON };
