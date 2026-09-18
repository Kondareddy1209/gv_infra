/**
 * Script to generate 48 realistic sample plots for Stambadri Enclave, Gurralapadu, Khammam
 * GeoJSON polygon grid with rich real estate attributes.
 */

const fs = require('fs');
const path = require('path');

const originLon = 80.1350;
const originLat = 17.2475;
const plotWidth = 0.00035;   // approx 35m width
const plotHeight = 0.00025;  // approx 25m depth
const roadGap = 0.00015;     // road width

const statuses = ['available', 'available', 'available', 'reserved', 'sold', 'available', 'reserved', 'sold', 'hold'];
const facings = ['East', 'North', 'West', 'South'];
const prices = [1600, 1800, 2000, 2200, 2400, 2500];

const features = [];
let plotId = 1;

for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 8; col++) {
    const numStr = String(plotId).padStart(2, '0');
    const plotNumber = `P-${numStr}`;
    
    // Add road gaps between col 3 and 4, and between row 2 and 3
    const xGap = (col >= 4 ? roadGap : 0);
    const yGap = (row >= 3 ? roadGap : 0);
    
    const minLon = originLon + col * plotWidth + xGap;
    const maxLon = minLon + plotWidth * 0.88; // 12% setback gap
    const minLat = originLat + row * plotHeight + yGap;
    const maxLat = minLat + plotHeight * 0.88;
    
    // Create polygon coordinates (counter-clockwise)
    const coordinates = [[
      [parseFloat(minLon.toFixed(6)), parseFloat(minLat.toFixed(6))],
      [parseFloat(maxLon.toFixed(6)), parseFloat(minLat.toFixed(6))],
      [parseFloat(maxLon.toFixed(6)), parseFloat(maxLat.toFixed(6))],
      [parseFloat(minLon.toFixed(6)), parseFloat(maxLat.toFixed(6))],
      [parseFloat(minLon.toFixed(6)), parseFloat(minLat.toFixed(6))]
    ]];
    
    const status = statuses[(plotId * 3) % statuses.length];
    const facing = facings[(plotId * 2) % facings.length];
    const pricePerSqYd = prices[plotId % prices.length];
    const areaSqYds = 1800 + ((plotId * 150) % 1200); // 1800 to 3000 sq yds
    const totalPrice = Math.round(areaSqYds * pricePerSqYd);
    
    features.push({
      type: "Feature",
      id: `PLOT-${numStr}`,
      properties: {
        plot_id: plotId,
        plot_number: plotNumber,
        survey_number: `45/A-${numStr}`,
        extent_sqyards: areaSqYds,
        size: areaSqYds,
        price_per_sqyard: pricePerSqYd,
        total_price_lakhs: (totalPrice / 100000).toFixed(2),
        total_price: totalPrice,
        facing: facing,
        status: status,
        contact: "+91 93928 87268",
        layout_name: "Stambadri Enclave",
        mandal: "Gurralapadu",
        district: "Khammam",
        dtcp_approved: true
      },
      geometry: {
        type: "Polygon",
        coordinates: coordinates
      }
    });
    
    plotId++;
  }
}

const geojson = {
  type: "FeatureCollection",
  name: "Stambadri Enclave - 48 Plots Masterplan",
  features: features
};

const path1 = path.resolve(__dirname, '../custom_plots.geojson');
const path2 = path.resolve(__dirname, '../data/sample_plots_complete.geojson');

fs.writeFileSync(path1, JSON.stringify(geojson, null, 2), 'utf8');
fs.writeFileSync(path2, JSON.stringify(geojson, null, 2), 'utf8');

console.log(`✅ Successfully generated and synced 48 plots in custom_plots.geojson and sample_plots_complete.geojson`);
