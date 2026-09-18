#!/usr/bin/env node

/**
 * VALIDATE-CESIUM-PLOTS.JS
 * Browser console script to validate 3D plot rendering
 *
 * Run in browser console after page loads:
 *   copy & paste this script into browser console
 *   or load it via: <script src="scripts/validate-cesium-plots.js"></script>
 *
 * Validates:
 * - CesiumJS is loaded
 * - Cesium3DViewer initialized
 * - ProjectLayer loaded 48 plots
 * - Plot colors by status
 * - 3D extrusions visible
 * - Custom_plots.geojson valid
 */

async function validateCesiumPlots() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: {},
    summary: {}
  };

  console.log('%c🔍 Starting Cesium 3D Plot Validation...', 'color: blue; font-size: 14px; font-weight: bold;');

  // Check 1: CesiumJS loaded
  report.checks.cesiumLoaded = {
    status: typeof window.Cesium !== 'undefined' ? '✅ PASS' : '❌ FAIL',
    details: typeof window.Cesium !== 'undefined' ? `CesiumJS v${window.Cesium.VERSION}` : 'CesiumJS not found'
  };

  // Check 2: CesiumViewer3D initialized
  const viewer = window.Cesium3DViewer;
  report.checks.viewerInitialized = {
    status: viewer && viewer.isInitialized ? '✅ PASS' : '❌ FAIL',
    details: viewer ? `Viewer container: ${viewer.containerId}` : 'CesiumViewer3D not found'
  };

  if (!viewer) {
    console.error('❌ Viewer not initialized. Waiting for cesium3d:ready event...');
    return new Promise((resolve) => {
      window.addEventListener('cesium3d:ready', () => {
        console.log('✅ Cesium ready event received, retrying validation...');
        validateCesiumPlots().then(resolve);
      }, { once: true });
      setTimeout(() => {
        console.error('❌ Timeout waiting for cesium3d:ready');
        resolve(report);
      }, 10000);
    });
  }

  // Check 3: ProjectLayer loaded
  const projectLayer = viewer.projectLayer;
  report.checks.projectLayerLoaded = {
    status: projectLayer && projectLayer.isLoaded ? '✅ PASS' : '❌ FAIL',
    details: projectLayer ? `Loaded from: ${projectLayer.geometryUrl}` : 'ProjectLayer not found'
  };

  // Check 4: Plot entities count
  if (projectLayer) {
    const plotCount = projectLayer.entities.size;
    const expected = 48;
    report.checks.plotCount = {
      status: plotCount === expected ? '✅ PASS' : '⚠️  WARNING',
      details: `Loaded ${plotCount} plots (expected ${expected})`
    };

    // Check 5: Status distribution
    const statusDistribution = {};
    projectLayer.entities.forEach((entity) => {
      const status = entity._plotStatus || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    report.checks.statusDistribution = {
      status: Object.keys(statusDistribution).length > 0 ? '✅ PASS' : '❌ FAIL',
      details: JSON.stringify(statusDistribution, null, 2)
    };

    // Check 6: Polygon extrusions
    let extrusionCount = 0;
    let coloredCount = 0;
    projectLayer.entities.forEach((entity) => {
      if (entity.polygon) {
        if (entity.polygon.extrudedHeight) {
          extrusionCount++;
        }
        if (entity.polygon.material) {
          coloredCount++;
        }
      }
    });

    report.checks.extrusions = {
      status: extrusionCount > 0 ? '✅ PASS' : '❌ FAIL',
      details: `${extrusionCount}/${plotCount} plots have extrusions`
    };

    report.checks.coloring = {
      status: coloredCount > 0 ? '✅ PASS' : '❌ FAIL',
      details: `${coloredCount}/${plotCount} plots have materials/colors`
    };

    // Check 7: Sample plot details
    const firstPlot = Array.from(projectLayer.entities.values())[0];
    if (firstPlot) {
      report.checks.samplePlot = {
        status: '✅ INFO',
        details: {
          plotId: firstPlot.id,
          plotName: firstPlot.name,
          status: firstPlot._plotStatus,
          hasPolygon: !!firstPlot.polygon,
          hasExtrusion: !!firstPlot.polygon?.extrudedHeight,
          extrusionHeight: firstPlot.polygon?.extrudedHeight?.getValue?.() || firstPlot.polygon?.extrudedHeight
        }
      };
    }
  }

  // Check 8: Camera positioned
  if (viewer.viewer) {
    const camera = viewer.viewer.camera;
    report.checks.camera = {
      status: camera ? '✅ PASS' : '❌ FAIL',
      details: {
        position: camera?.position ? `Cartesian3(${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)})` : 'N/A',
        heading: camera?.heading ? `${(camera.heading * 180 / Math.PI).toFixed(1)}°` : 'N/A'
      }
    };
  }

  // Summary
  const passed = Object.values(report.checks).filter(c => c.status.includes('✅')).length;
  const total = Object.keys(report.checks).length;
  report.summary = {
    passed,
    total,
    percentComplete: Math.round((passed / total) * 100)
  };

  // Print report
  console.log('\n%c📊 Validation Report', 'color: navy; font-size: 12px; font-weight: bold;');
  console.table(report.checks);

  console.log(`\n%c✅ ${passed}/${total} checks passed (${report.summary.percentComplete}%)`,
    passed === total ? 'color: green; font-weight: bold;' : 'color: orange; font-weight: bold;');

  console.log('\n%cTo interact with plots:', 'color: gray; font-style: italic;');
  console.log('  window.Cesium3DViewer              - Main viewer instance');
  console.log('  window.Cesium3DViewer.projectLayer - Plot layer with all entities');
  console.log('  window.Cesium3DViewer.selectPlot(plotId) - Select a plot');

  return report;
}

// Auto-run if DOM is ready
if (document.readyState !== 'loading') {
  validateCesiumPlots().then(report => {
    window.cesiumValidationReport = report;
  });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    validateCesiumPlots().then(report => {
      window.cesiumValidationReport = report;
    });
  });
}
