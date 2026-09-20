/**
 * END-TO-END ROUTE & API VERIFICATION TEST
 * Tests all navigation routes, API endpoints, and data flows
 * Run with: node scripts/test-e2e-routes.js
 */

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:8000';

const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

async function testRoute(method, path, expectedStatus = 200) {
  try {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, { method });
    const success = response.status === expectedStatus;

    if (success) {
      console.log(`✅ ${method} ${path} → ${response.status}`);
      tests.passed++;
    } else {
      console.log(`❌ ${method} ${path} → ${response.status} (expected ${expectedStatus})`);
      tests.failed++;
      tests.errors.push({ path, status: response.status, expected: expectedStatus });
    }
    return success;
  } catch (err) {
    console.log(`❌ ${method} ${path} → ERROR: ${err.message}`);
    tests.failed++;
    tests.errors.push({ path, error: err.message });
    return false;
  }
}

async function testJSON(method, path, expectedStatus = 200) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, { method });
    const data = await response.json();

    if (response.status === expectedStatus && data) {
      console.log(`✅ ${method} ${path} → ${response.status} (JSON OK)`);
      tests.passed++;
      return true;
    } else {
      console.log(`❌ ${method} ${path} → ${response.status}`);
      tests.failed++;
      tests.errors.push({ path, status: response.status });
      return false;
    }
  } catch (err) {
    console.log(`❌ ${method} ${path} → ERROR: ${err.message}`);
    tests.failed++;
    tests.errors.push({ path, error: err.message });
    return false;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         END-TO-END ROUTE & API VERIFICATION TEST            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔧 TESTING SERVER HEALTH & CONFIG\n');
  await testRoute('GET', '/health');
  await testJSON('GET', '/api/v1/config/public');

  console.log('\n🗺️  TESTING GEOSPATIAL & LAND INTELLIGENCE ENDPOINTS\n');
  await testJSON('GET', '/api/gis/plots/search');
  await testJSON('GET', '/api/v1/properties/LAND-001/intelligence');
  await testJSON('GET', '/api/v1/osm/features?category=healthcare');
  await testJSON('GET', '/api/v1/nearby/features?lat=17.0854&lng=78.4908');

  console.log('\n🌍 TESTING ENVIRONMENTAL INTELLIGENCE ENDPOINTS\n');
  await testJSON('GET', '/api/v1/environmental/solar?lat=17.0854&lng=78.4908');
  await testJSON('GET', '/api/v1/environmental/weather?lat=17.0854&lng=78.4908');
  await testJSON('GET', '/api/v1/environmental/airquality?lat=17.0854&lng=78.4908');
  await testJSON('GET', '/api/v1/environmental/elevation?lat=17.0854&lng=78.4908');
  await testJSON('GET', '/api/v1/environmental/water?lat=17.0854&lng=78.4908');
  await testJSON('GET', '/api/v1/environmental/commute?lat=17.0854&lng=78.4908');

  console.log('\n📡 TESTING REAL-TIME DATA FEEDS\n');
  await testJSON('GET', '/api/v1/live/flights');
  await testJSON('GET', '/api/v1/live/trains');
  await testJSON('GET', '/api/v1/live/traffic');
  await testJSON('GET', '/api/v1/live/telecom');

  console.log('\n📄 TESTING FRONTEND PAGES (Static)\n');
  await testRoute('GET', `${FRONTEND_URL}/index.html`);
  await testRoute('GET', `${FRONTEND_URL}/real-land-map.html`);
  await testRoute('GET', `${FRONTEND_URL}/project.html`);
  await testRoute('GET', `${FRONTEND_URL}/exploded-3d.html`);
  await testRoute('GET', `${FRONTEND_URL}/projects.html`);

  console.log('\n📦 TESTING DATA FILES\n');
  await testRoute('GET', `${FRONTEND_URL}/data/peacock_valley_plots.geojson`);
  await testRoute('GET', `${FRONTEND_URL}/data/stambadri_plots.geojson`);

  console.log('\n✨ TESTING JAVASCRIPT MODULES\n');
  await testRoute('GET', `${FRONTEND_URL}/js/vastu-generator.js`);
  await testRoute('GET', `${FRONTEND_URL}/js/land-intelligence-ui.js`);
  await testRoute('GET', `${FRONTEND_URL}/js/cesium-init.js`);

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`✅ PASSED: ${tests.passed}`);
  console.log(`❌ FAILED: ${tests.failed}`);
  console.log(`📊 TOTAL:  ${tests.passed + tests.failed}\n`);

  if (tests.failed > 0) {
    console.log('Failed Tests:');
    tests.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.path}`);
      if (err.error) console.log(`     Error: ${err.error}`);
      if (err.status) console.log(`     Status: ${err.status} (expected ${err.expected || 'success'})`);
    });
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED! Platform is fully operational.\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
