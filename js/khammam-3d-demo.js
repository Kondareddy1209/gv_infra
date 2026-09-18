/**
 * KHAMMAM 3D REAL ESTATE GIS — COMPLETE DEMO
 * All 13 Features Ready for Approval
 */

class KhammamRealEstateGIS {
  constructor() {
    this.viewer = null;
    this.plots = [];
    this.selectedPlotId = null;
    this.allPlotEntities = {};
    this.billboardEntities = [];
    this.tourRunning = false;

    this.statusColors = {
      available: { color: Cesium.Color.fromCssColorString('#16A34A').withAlpha(0.8), label: 'Available', hex: '#16A34A', border: '#34D399' },   // Emerald Green
      reserved:  { color: Cesium.Color.fromCssColorString('#EAB308').withAlpha(0.8), label: 'Reserved',  hex: '#EAB308', border: '#FBBF24' },   // Gold
      sold:      { color: Cesium.Color.fromCssColorString('#DC2626').withAlpha(0.8), label: 'Sold',      hex: '#DC2626', border: '#F87171' },   // Crimson Red
      hold:      { color: Cesium.Color.fromCssColorString('#4B5563').withAlpha(0.8), label: 'On Hold',   hex: '#4B5563', border: '#9CA3AF' }    // Grey
    };

    // Khammam / Gurralapadu center
    this.khammamCenter = { lat: 17.2480, lng: 80.1365 };
  }

  /**
   * Initialize the entire 3D viewer
   */
  async init() {
    console.log('🚀 Initializing Khammam 3D Real Estate GIS...');

    try {
      // 1. Create Cesium viewer
      await this.createViewer();

      // 2. Enable Real 3D Atmospheric Lighting & Terrain Haze
      this.enable3DEffects();

      // 3. Load sample plots
      await this.loadPlots();

      // 4. Render 3D plot extrusions & floating price billboards
      this.renderPlotLayer();

      // 5. Setup interactivity
      this.setupInteractivity();

      // 6. Setup UI controls
      this.setupUI();

      // 7. Play Telugu greeting
      this.playTeluguGreeting();

      // Hide loading indicator
      const loader = document.getElementById('loading-indicator');
      if (loader) loader.style.display = 'none';

      console.log('✅ Khammam 3D GIS Ready!');
    } catch (err) {
      console.error('❌ Failed to initialize GIS App:', err);
      const loader = document.getElementById('loading-indicator');
      if (loader) {
        loader.innerHTML = `<div style="color:#ef4444; font-weight:bold; padding:20px;">Error loading viewer: ${err.message}</div>`;
      }
    }
  }

  async createViewer() {
    console.log('Creating Cesium viewer...');

    const container = document.getElementById('cesium-container');
    if (!container) {
      throw new Error('Cesium container element #cesium-container not found');
    }

    // Set Official Cesium Ion Access Token
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImpOSG5tR1R2VlpiakI3N1oiLCJqdGkiOiJlNzQyYjFkYy1mNTFhLTRmNDYtYWZlYS1lMDkzOWQxNTNhNTgiLCJpZCI6NTAwMjQ1LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODk3NTEyMDB9.afgAZ0_-DypvJYTakxIRlN22zwBQAOAvJTmjnoObJz4';

    // 100% Free High-Res Satellite Imagery (Esri World Imagery)
    const esriImagery = new Cesium.UrlTemplateImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri, Maxar, Earthstar Geographics',
      maximumLevel: 19
    });

    this.viewer = new Cesium.Viewer(container, {
      imageryProvider: esriImagery,
      scene3DOnly: true,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: true,
      infoBox: false,
      selectionIndicator: true,
      navigationHelpButton: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false
    });

    // Hide default credit container if present
    if (this.viewer.creditDisplay && this.viewer.creditDisplay.container) {
      this.viewer.creditDisplay.container.style.display = 'none';
    }

    // Try loading world terrain
    try {
      if (typeof Cesium.createWorldTerrainAsync === 'function') {
        const terrain = await Cesium.createWorldTerrainAsync();
        this.viewer.terrainProvider = terrain;
      }
    } catch (e) {
      console.warn('World terrain fallback to default ellipsoid:', e);
    }

    console.log('✅ Cesium viewer created');
  }

  /**
   * Enable 3D Effects, Depth Testing, Atmosphere & Golden Hour Haze
   */
  enable3DEffects() {
    const scene = this.viewer.scene;
    const globe = scene.globe;

    // Enable depth testing against terrain so 3D objects sit on top of hills
    globe.depthTestAgainstTerrain = true;
    globe.enableLighting = true;
    globe.dynamicAtmosphereLighting = true;
    globe.dynamicAtmosphereLightingFromSun = true;

    // Sky atmosphere and haze
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = true;
    if (scene.fog) {
      scene.fog.enabled = true;
      scene.fog.density = 0.0002;
    }

    // Set golden hour sun position for Khammam (September 18, 5:00 PM IST)
    const date = new Date(2026, 8, 18, 11, 30); // 11:30 UTC = 17:00 IST
    this.viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);

    console.log('✅ 3D Atmospheric Lighting & Terrain Haze enabled');
  }

  /**
   * Load plots from GeoJSON
   */
  async loadPlots() {
    console.log('Loading sample plots...');

    try {
      let response = await fetch(`custom_plots.geojson?t=${Date.now()}`);
      if (!response.ok) {
        response = await fetch(`data/sample_plots_complete.geojson?t=${Date.now()}`);
      }
      const geojson = await response.json();
      this.plots = geojson.features || [];
      console.log(`✅ Loaded ${this.plots.length} plots`);
    } catch (err) {
      console.error('❌ Failed to load plots:', err);
      this.plots = [];
    }
  }

  /**
   * Render all plots as 3D extrusions + floating 3D price billboards on terrain
   */
  renderPlotLayer() {
    console.log('Rendering plot layer with 3D extrusions & floating billboards...');

    this.plots.forEach(feature => {
      const props = feature.properties || {};
      const status = (props.status || 'available').toLowerCase();
      const statusColor = this.statusColors[status] || this.statusColors.available;

      if (!feature.geometry || !feature.geometry.coordinates || !feature.geometry.coordinates[0]) {
        return;
      }

      // Extract polygon coordinates
      const coords = feature.geometry.coordinates[0];
      const flatCoords = coords.flatMap(([lng, lat]) => [lng, lat]);

      // Calculate centroid of polygon for billboard pin
      let sumLng = 0, sumLat = 0;
      coords.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
      const centerLng = sumLng / coords.length;
      const centerLat = sumLat / coords.length;

      // Create polygon hierarchy
      const hierarchy = new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(flatCoords)
      );

      // Add extrusion height based on status
      const extrusionHeight = status === 'available' ? 14 : status === 'reserved' ? 10 : 6;
      const plotId = props.plot_id || props.plot_number || feature.id;
      const plotNum = props.plot_number || `Plot ${plotId}`;
      const priceLakhs = props.total_price_lakhs ? `₹${props.total_price_lakhs}L` : '₹35.1L';

      // 1. Create 3D Extruded Polygon Entity
      const entity = this.viewer.entities.add({
        id: `plot_${plotId}`,
        name: plotNum,
        polygon: {
          hierarchy: hierarchy,
          material: statusColor.color,
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
          outlineWidth: 2,
          extrudedHeight: extrusionHeight,
          height: 0
        },
        properties: props
      });

      this.allPlotEntities[plotId] = entity;

      // 2. Create Floating 3D Billboard Pin Badge
      const badgeCanvas = this.createPinBadgeCanvas(plotNum, priceLakhs, status, statusColor);
      const billboardPosition = Cesium.Cartesian3.fromDegrees(centerLng, centerLat, extrusionHeight + 15);

      const billboardEntity = this.viewer.entities.add({
        id: `badge_${plotId}`,
        position: billboardPosition,
        billboard: {
          image: badgeCanvas,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 3000, 0.4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 0),
            billboardPosition
          ],
          width: 2,
          material: Cesium.Color.fromCssColorString(statusColor.border).withAlpha(0.8)
        },
        properties: props
      });

      this.billboardEntities.push(billboardEntity);
    });

    // Zoom camera to frame all 48 rendered plots perfectly in view
    this.viewer.zoomTo(this.viewer.entities, new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0),
      Cesium.Math.toRadians(-40),
      0
    ));

    console.log(`✅ Rendered and framed ${this.plots.length} 3D plots & billboards`);
  }

  /**
   * Draw Canvas Badge for Floating 3D Billboard
   */
  createPinBadgeCanvas(plotNum, price, status, statusColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 65;
    const ctx = canvas.getContext('2d');

    // Background Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(8, 4, 134, 46, 8);
    ctx.fill();

    // Border Glow
    ctx.strokeStyle = statusColor.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Status Pill
    ctx.fillStyle = statusColor.hex;
    ctx.beginPath();
    ctx.roundRect(14, 10, 52, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(plotNum, 18, 23);

    // Price Text
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(price, 72, 24);

    // Status Subtext
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.fillText(statusColor.label.toUpperCase(), 14, 42);

    return canvas;
  }

  /**
   * Setup click interactivity for plot selection
   */
  setupInteractivity() {
    console.log('Setting up plot interactivity...');

    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    handler.setInputAction((click) => {
      const pickedObject = this.viewer.scene.pick(click.position);

      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id;
        const props = entity.properties ? entity.properties.getValue(Cesium.JulianDate.now()) : {};
        const plotId = props.plot_id || props.plot_number || entity.id.replace('plot_', '').replace('badge_', '');

        this.selectPlot(plotId);
      } else {
        this.deselectPlot();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    console.log('✅ Interactivity setup complete');
  }

  /**
   * Select a plot and show detail drawer
   */
  selectPlot(plotId) {
    console.log(`Selecting plot ${plotId}...`);

    this.deselectPlot();

    this.selectedPlotId = plotId;
    const entity = this.allPlotEntities[plotId];

    if (!entity) {
      console.warn(`Plot entity not found: ${plotId}`);
      return;
    }

    // Highlight selected plot
    if (entity.polygon) {
      entity.polygon.material = Cesium.Color.GOLD.withAlpha(0.95);
      entity.polygon.outlineColor = Cesium.Color.WHITE;
      entity.polygon.outlineWidth = 4;
    }

    // Fly camera to plot
    this.viewer.flyTo(entity, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-40), 200)
    });

    // Extract plot properties
    const props = entity.properties ? entity.properties.getValue(Cesium.JulianDate.now()) : {};

    // Show detail drawer
    this.showPlotDrawer(props);
  }

  /**
   * Deselect current plot
   */
  deselectPlot() {
    if (!this.selectedPlotId) return;

    const entity = this.allPlotEntities[this.selectedPlotId];
    if (entity && entity.polygon) {
      const props = entity.properties ? entity.properties.getValue(Cesium.JulianDate.now()) : {};
      const status = (props.status || 'available').toLowerCase();
      const statusColor = this.statusColors[status] || this.statusColors.available;

      entity.polygon.material = statusColor.color;
      entity.polygon.outlineColor = Cesium.Color.WHITE.withAlpha(0.9);
      entity.polygon.outlineWidth = 2;
    }

    this.selectedPlotId = null;
    closePlotDrawer();
  }

  /**
   * Show plot detail drawer
   */
  showPlotDrawer(props) {
    const drawer = document.getElementById('plot-detail-drawer');
    if (!drawer) return;

    const plotNum = props.plot_number || props.plot_id || 'N/A';
    const area = props.extent_sqyards || props.size || 1800;
    const pricePerSqYd = props.price_per_sqyard || 2000;
    const totalPrice = props.total_price || (area * pricePerSqYd);
    const totalPriceLakhs = props.total_price_lakhs || (totalPrice / 100000).toFixed(2);
    const facing = props.facing || 'East';
    const status = (props.status || 'available').toUpperCase();
    const surveyNum = props.survey_number || '45/A';

    // Calculate loan EMI (80% LTV, 15 years @ 8.5%)
    const loanAmount = totalPrice * 0.8;
    const monthlyRate = 8.5 / 12 / 100;
    const tenureMonths = 180;
    const emi = Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1));

    drawer.innerHTML = `
      <div class="drawer-header">
        <div>
          <h2>Plot ${plotNum}</h2>
          <div style="font-size:12px; opacity:0.8;">Survey No: ${surveyNum} • ${props.mandal || 'Gurralapadu'}</div>
        </div>
        <button class="close-btn" onclick="closePlotDrawer()">×</button>
      </div>

      <div class="plot-stat-grid">
        <div class="stat-card">
          <div class="stat-label">STATUS</div>
          <div class="stat-value" style="color: ${status === 'AVAILABLE' ? '#10b981' : status === 'RESERVED' ? '#f59e0b' : '#ef4444'};">${status}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">FACING (VASTU)</div>
          <div class="stat-value">${facing} 🧭</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">EXTENT</div>
          <div class="stat-value">${area.toLocaleString()} sq.yds</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">PRICE / SQ.YD</div>
          <div class="stat-value">₹${pricePerSqYd.toLocaleString()}</div>
        </div>
      </div>

      <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #10b981; font-weight: 600;">TOTAL INVESTMENT</div>
        <div style="font-size: 28px; font-weight: 800; color: #ffffff;">₹ ${totalPriceLakhs} Lakhs</div>
        <div style="font-size: 11px; opacity: 0.8;">(₹ ${totalPrice.toLocaleString()} Total)</div>
      </div>

      <!-- EMI Calculator Widget -->
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">💳 Est. Monthly EMI (80% Loan)</div>
        <div style="font-size: 20px; font-weight: 700; color: #38bdf8;" id="emi-result">₹ ${emi.toLocaleString('en-IN')}/mo</div>
        <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Based on 15-year tenure @ 8.5% p.a.</div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="action-btn whatsapp-btn" onclick="inquireOnWhatsApp('${plotNum}')">
          💬 Inquire on WhatsApp
        </button>
        <button class="action-btn call-btn" onclick="callSales('+919392887268')">
          📞 Call Sales (+91 93928 87268)
        </button>
      </div>
    `;

    drawer.classList.add('open');
  }

  /**
   * Setup UI events for filters and buttons
   */
  setupUI() {
    console.log('Setting up UI controls...');

    // Flyover Tour Button
    const tourBtn = document.getElementById('start-tour-btn');
    if (tourBtn) {
      tourBtn.addEventListener('click', () => this.startCinematicTour());
    }

    // Facing Filter
    const facingSelect = document.getElementById('filter-facing');
    if (facingSelect) {
      facingSelect.addEventListener('change', () => this.applyFilters());
    }

    // Status Filter
    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => this.applyFilters());
    }

    // Price Filter
    const priceSelect = document.getElementById('filter-price');
    if (priceSelect) {
      priceSelect.addEventListener('change', () => this.applyFilters());
    }

    console.log('✅ UI controls setup complete');
  }

  /**
   * Apply filters to plot layer and billboards
   */
  applyFilters() {
    const facingFilter = document.getElementById('filter-facing')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';
    const priceFilter = parseFloat(document.getElementById('filter-price')?.value || Infinity);

    console.log(`Filtering plots: facing=${facingFilter}, status=${statusFilter}, maxPrice=${priceFilter}`);

    let matchCount = 0;

    Object.values(this.allPlotEntities).forEach(entity => {
      const props = entity.properties ? entity.properties.getValue(Cesium.JulianDate.now()) : {};
      const facing = props.facing || '';
      const status = (props.status || 'available').toLowerCase();
      const price = props.price_per_sqyard || 0;
      const plotId = props.plot_id || props.plot_number;

      const matchesFacing = facingFilter === 'all' || facing === facingFilter;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesPrice = price <= priceFilter;

      const show = matchesFacing && matchesStatus && matchesPrice;
      entity.show = show;

      // Also toggle corresponding billboard pin
      const badgeEntity = this.viewer.entities.getById(`badge_${plotId}`);
      if (badgeEntity) badgeEntity.show = show;

      if (show) matchCount++;
    });

    console.log(`✅ ${matchCount} plots match filter criteria`);
  }

  /**
   * Start 3D Cinematic Flyover Tour
   */
  startCinematicTour() {
    if (this.tourRunning) return;
    this.tourRunning = true;

    console.log('🎬 Starting Cinematic Tour...');

    const waypoints = [
      { lng: 80.1350, lat: 17.2470, height: 450, heading: 0, pitch: -35 },
      { lng: 80.1380, lat: 17.2485, height: 350, heading: 90, pitch: -30 },
      { lng: 80.1365, lat: 17.2495, height: 300, heading: 180, pitch: -25 },
      { lng: 80.1350, lat: 17.2480, height: 600, heading: 0, pitch: -45 }
    ];

    let current = 0;

    const flyToNext = () => {
      if (current >= waypoints.length) {
        this.tourRunning = false;
        console.log('🎬 Tour complete');
        return;
      }

      const wp = waypoints[current];
      current++;

      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.height),
        orientation: {
          heading: Cesium.Math.toRadians(wp.heading),
          pitch: Cesium.Math.toRadians(wp.pitch),
          roll: 0
        },
        duration: 4,
        complete: () => {
          setTimeout(flyToNext, 1000);
        }
      });
    };

    flyToNext();
  }

  /**
   * Play Telugu Welcome Greeting via Browser Speech Synthesis
   */
  playTeluguGreeting() {
    if (!('speechSynthesis' in window)) return;

    try {
      const greetingText = "నమస్కారం! ఖమ్మం గుర్రాలపాడు శ్రీ స్తంభాద్రి ఎన్‌క్లేవ్‌కి స్వాగతం.";
      const utterance = new SpeechSynthesisUtterance(greetingText);
      utterance.lang = 'te-IN';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const teluguVoice = voices.find(v => v.lang.includes('te'));
      if (teluguVoice) utterance.voice = teluguVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis notice:', e);
    }
  }
}

// Global instance
let gisApp = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📌 DOM Ready - Initializing Khammam GIS...');
  gisApp = new KhammamRealEstateGIS();
  await gisApp.init();
});

// Helper functions for inline HTML event handlers
function closePlotDrawer() {
  const drawer = document.getElementById('plot-detail-drawer');
  if (drawer) drawer.classList.remove('open');
}

function inquireOnWhatsApp(plotNumber) {
  const message = `Hi GV Infra Projects, I'm interested in Plot ${plotNumber} at Stambadri Enclave. Please share more details.`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/919392887268?text=${encoded}`, '_blank');
}

function callSales(phone) {
  window.location.href = `tel:${phone}`;
}
