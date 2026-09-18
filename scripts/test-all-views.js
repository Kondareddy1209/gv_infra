/**
 * TEST-ALL-VIEWS.JS
 * Comprehensive test of all visualization views
 *
 * Tests:
 * 1. 3D Masterplan (Three.js canvas)
 * 2. Satellite Map (MapLibre GL)
 * 3. Plot Showcase (Card grid)
 * 4. Cesium 3D Globe (Cesium.js)
 */

async function testAllViews() {
  console.log('%c🧪 Testing All Visualization Views...', 'color: blue; font-size: 14px; font-weight: bold;');

  const report = {
    timestamp: new Date().toISOString(),
    views: {},
    issues: []
  };

  // Test 1: 3D Masterplan (Three.js)
  console.log('\n%c1️⃣  Testing 3D Masterplan View...', 'color: navy; font-weight: bold;');
  const canvasEl = document.getElementById('masterplan-canvas');
  if (canvasEl) {
    const isVisible = canvasEl.offsetHeight > 0 && canvasEl.offsetWidth > 0;
    report.views.masterplan = {
      status: isVisible ? '✅ READY' : '⚠️  HIDDEN',
      canvas: canvasEl ? 'Present' : 'Missing',
      dimensions: `${canvasEl.offsetWidth}x${canvasEl.offsetHeight}`,
      parent: canvasEl.parentElement?.className || 'unknown'
    };
    console.log(`✅ Canvas element found: ${canvasEl.offsetWidth}x${canvasEl.offsetHeight}px`);
  } else {
    report.views.masterplan = { status: '❌ FAIL', error: 'Canvas not found' };
    report.issues.push('Masterplan canvas #masterplan-canvas not found');
    console.error('❌ Canvas #masterplan-canvas not found');
  }

  // Test 2: Satellite Map (MapLibre)
  console.log('\n%c2️⃣  Testing Satellite Map View...', 'color: navy; font-weight: bold;');
  const landMapEl = document.getElementById('land-map');
  if (landMapEl) {
    const isVisible = landMapEl.offsetHeight > 0 && landMapEl.offsetWidth > 0;
    const mapState = window.map ? 'MapLibre instance found' : 'No MapLibre instance yet';
    report.views.satelliteMap = {
      status: isVisible ? '✅ READY' : '⚠️  HIDDEN',
      container: landMapEl ? 'Present' : 'Missing',
      dimensions: `${landMapEl.offsetWidth}x${landMapEl.offsetHeight}`,
      mapLibre: mapState
    };
    console.log(`✅ Satellite map container found: ${landMapEl.offsetWidth}x${landMapEl.offsetHeight}px`);
    console.log(`   ${mapState}`);
  } else {
    report.views.satelliteMap = { status: '❌ FAIL', error: 'Container not found' };
    report.issues.push('Satellite map container #land-map not found');
    console.error('❌ Satellite map #land-map not found');
  }

  // Test 3: Plot Showcase (Card grid)
  console.log('\n%c3️⃣  Testing Plot Showcase View...', 'color: navy; font-weight: bold;');
  const showcaseEl = document.getElementById('plot-showcase');
  const showcaseGridEl = document.getElementById('sc-grid');
  if (showcaseEl && showcaseGridEl) {
    const cardCount = showcaseGridEl.querySelectorAll('.sc-card').length;
    report.views.plotShowcase = {
      status: showcaseEl ? '✅ READY' : '⚠️  HIDDEN',
      container: 'Present',
      cardCount: cardCount,
      loadedCards: cardCount > 0 ? `${cardCount} cards` : 'Not loaded yet'
    };
    console.log(`✅ Plot showcase container found`);
    console.log(`   Cards loaded: ${cardCount}`);
  } else {
    report.views.plotShowcase = { status: '❌ FAIL', error: 'Container or grid not found' };
    if (!showcaseEl) report.issues.push('Plot showcase #plot-showcase not found');
    if (!showcaseGridEl) report.issues.push('Plot grid #sc-grid not found');
  }

  // Test 4: Cesium 3D Globe
  console.log('\n%c4️⃣  Testing Cesium 3D Globe View...', 'color: navy; font-weight: bold;');
  const cesiumContainerEl = document.getElementById('cesium-container');
  const cesiumViewer = window.Cesium3DViewer;
  if (cesiumContainerEl) {
    const isVisible = cesiumContainerEl.offsetHeight > 0 && cesiumContainerEl.offsetWidth > 0;
    const hasViewer = cesiumViewer && cesiumViewer.viewer ? 'Viewer initialized' : 'Awaiting initialization';
    report.views.cesium = {
      status: cesiumViewer?.isInitialized ? '✅ READY' : '⏳ INITIALIZING',
      container: 'Present',
      dimensions: `${cesiumContainerEl.offsetWidth}x${cesiumContainerEl.offsetHeight}`,
      viewer: hasViewer,
      plots: cesiumViewer?.projectLayer?.entities?.size || 0
    };
    console.log(`✅ Cesium container found: ${cesiumContainerEl.offsetWidth}x${cesiumContainerEl.offsetHeight}px`);
    console.log(`   ${hasViewer}`);
    if (cesiumViewer?.projectLayer?.entities?.size) {
      console.log(`   Plots loaded: ${cesiumViewer.projectLayer.entities.size}`);
    }
  } else {
    report.views.cesium = { status: '❌ FAIL', error: 'Container not found' };
    report.issues.push('Cesium container #cesium-container not found');
  }

  // Test 5: View Switcher Buttons
  console.log('\n%c5️⃣  Testing View Switcher...', 'color: navy; font-weight: bold;');
  const buttons = [
    { id: 'view-model', name: '3D Layout' },
    { id: 'view-land', name: 'Satellite Map' },
    { id: 'view-showcase', name: 'Plot Cards' },
    { id: 'view-cesium', name: 'Terrain Globe' }
  ];

  const buttonStatus = {};
  buttons.forEach(btn => {
    const el = document.getElementById(btn.id);
    buttonStatus[btn.name] = el ? '✅ Present' : '❌ Missing';
    if (el) {
      console.log(`✅ ${btn.name} button found`);
    } else {
      console.error(`❌ ${btn.name} button #${btn.id} not found`);
      report.issues.push(`View button #${btn.id} not found`);
    }
  });
  report.views.viewSwitcher = buttonStatus;

  // Test 6: Data Layer
  console.log('\n%c6️⃣  Testing Data Layer...', 'color: navy; font-weight: bold;');
  if (window.GV_DATA) {
    const plots = window.GV_DATA.getPlots();
    const statusCounts = window.GV_DATA.statusCounts?.();
    report.views.dataLayer = {
      status: '✅ READY',
      totalPlots: plots?.length || 0,
      statusCounts: statusCounts
    };
    console.log(`✅ GV_DATA available`);
    console.log(`   Total plots: ${plots?.length || 0}`);
    if (statusCounts) {
      console.log(`   Status counts:`, statusCounts);
    }
  } else {
    report.views.dataLayer = { status: '⚠️  NOT READY', error: 'GV_DATA not available' };
    report.issues.push('GV_DATA not available yet');
  }

  // Summary
  const readyCount = Object.values(report.views).filter(v =>
    (v.status || '').includes('✅') || (v.status || '').includes('⏳')
  ).length;
  const totalCount = Object.keys(report.views).length;

  console.log('\n%c📊 Summary', 'color: navy; font-size: 12px; font-weight: bold;');
  console.table(report.views);

  if (report.issues.length > 0) {
    console.log('\n%c⚠️  Issues Found:', 'color: red; font-weight: bold;');
    report.issues.forEach(issue => console.log(`  • ${issue}`));
  }

  console.log(`\n%c${readyCount}/${totalCount} views ready or initializing`,
    readyCount === totalCount ? 'color: green; font-weight: bold;' : 'color: orange; font-weight: bold;');

  return report;
}

// Auto-run on DOM ready
if (document.readyState !== 'loading') {
  testAllViews().then(report => {
    window.viewTestReport = report;
  });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    testAllViews().then(report => {
      window.viewTestReport = report;
    });
  });
}
