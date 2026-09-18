const fs = require('fs');

function analyzeGeoJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const features = data.features || [];
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

  features.forEach((f, idx) => {
    if (f.geometry && f.geometry.coordinates && f.geometry.coordinates[0]) {
      const ring = f.geometry.coordinates[0];
      ring.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
    }
  });

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  console.log(`=== File: ${filePath} ===`);
  console.log(`Total Features: ${features.length}`);
  console.log(`Bounds Lng: [${minLng}, ${maxLng}] | Lat: [${minLat}, ${maxLat}]`);
  console.log(`Center Lng: ${centerLng.toFixed(6)}, Lat: ${centerLat.toFixed(6)}`);
}

analyzeGeoJSON('custom_plots.geojson');
analyzeGeoJSON('data/sample_plots_complete.geojson');
analyzeGeoJSON('data/telangana_cadastral.geojson');
