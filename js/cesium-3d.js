/**
 * CESIUMJS 3D GLOBE & PHOTOREALISTIC 3D TERRAIN INTEGRATION ENGINE
 * Powers real 3D terrain elevation, Google 3D Tiles rendering, and 
 * 3D extruded land parcel boundaries for Khammam & Telangana real estate.
 */

const CESIUM_CONFIG = {
  defaultCenter: [80.14368, 17.24767], // [lng, lat] Gurralapadu, Khammam
  defaultHeight: 450, // Meters above ground
  defaultPitch: -35,   // Degrees camera tilt
  defaultHeading: 20   // Compass orientation
};

class CesiumLandViewer {
  constructor(containerId = 'cesium-container') {
    this.containerId = containerId;
    this.viewer = null;
    this.isReady = false;
    this.dataSources = {};
  }

  async init() {
    if (this.viewer) return;

    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (!window.Cesium) {
      console.warn("[Cesium3D] CesiumJS library not yet loaded.");
      return;
    }

    try {
      // Initialize Cesium 3D Viewer with World Terrain & Imagery
      this.viewer = new Cesium.Viewer(this.containerId, {
        terrainProvider: await Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true
        }),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: true,
        geocoder: false,
        homeButton: false,
        infoBox: true,
        sceneModePicker: false,
        selectionIndicator: true,
        navigationHelpButton: false
      });

      // Hide default credit logo for clean UI
      const creditDisplay = this.viewer.creditDisplay;
      if (creditDisplay && creditDisplay.container) {
        creditDisplay.container.style.display = 'none';
      }

      this.isReady = true;
      console.log("[Cesium3D] Cesium 3D Globe initialized successfully.");

      // Fly Camera to Khammam Project Location with 3D Terrain Perspective
      this.flyToLocation(
        CESIUM_CONFIG.defaultCenter[1],
        CESIUM_CONFIG.defaultCenter[0],
        CESIUM_CONFIG.defaultHeight,
        CESIUM_CONFIG.defaultPitch,
        CESIUM_CONFIG.defaultHeading
      );

      // Render Admin-Marked Land Parcels in 3D
      this.renderAdminParcels3D();

    } catch (err) {
      console.error("[Cesium3D] Error initializing CesiumJS viewer:", err);
    }
  }

  flyToLocation(lat, lng, height = 450, pitch = -35, heading = 20) {
    if (!this.viewer) return;

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0.0
      },
      duration: 2.5
    });
  }

  renderAdminParcels3D() {
    if (!this.viewer || !window.GV_DATA?.getAdminParcels) return;

    const parcels = window.GV_DATA.getAdminParcels();
    if (!parcels || !parcels.length) return;

    parcels.forEach((p, idx) => {
      if (!p.coordinates || p.coordinates.length < 3) return;

      // Convert [lng, lat] arrays to flat Cesium Cartesian degrees
      const flatDegrees = [];
      p.coordinates.forEach(pt => {
        flatDegrees.push(pt[0], pt[1]);
      });

      const color = p.status === 'available' 
        ? Cesium.Color.fromCssColorString('#16A34A').withAlpha(0.5)
        : (p.status === 'reserved' 
            ? Cesium.Color.fromCssColorString('#D97706').withAlpha(0.5)
            : Cesium.Color.fromCssColorString('#DC2626').withAlpha(0.5));

      const outlineColor = p.status === 'available'
        ? Cesium.Color.fromCssColorString('#15803D')
        : Cesium.Color.fromCssColorString('#B45309');

      // Add 3D Extruded Polygon Boundary for Parcel
      this.viewer.entities.add({
        name: `${p.title} (Survey ${p.surveyNo})`,
        description: `
          <div style="font-family: sans-serif; padding: 10px;">
            <h3 style="margin-top:0; color:#15803D;">${p.title}</h3>
            <p><strong>Survey No:</strong> ${p.surveyNo}</p>
            <p><strong>Location:</strong> ${p.village}, ${p.mandal}, ${p.district}</p>
            <p><strong>Total Area:</strong> ${p.areaAcres} Acres (${p.areaSqYds?.toLocaleString()} sq yds)</p>
            <p><strong>Asking Price:</strong> ?${Number(p.priceTotal).toLocaleString("en-IN")}</p>
            <p><strong>Facing:</strong> ${p.facing} Facing</p>
            <p><strong>Status:</strong> <span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-weight:bold;">${p.status.toUpperCase()}</span></p>
            <a href="https://wa.me/919000000000?text=Hi%20GV%20Infra,%20I%20want%20details%20about%20${encodeURIComponent(p.title)}" target="_blank" style="background:#16a34a; color:white; padding:8px 14px; border-radius:8px; text-decoration:none; display:inline-block; font-weight:bold; margin-top:10px;">
              ?? Chat on WhatsApp Direct ?
            </a>
          </div>
        `,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(flatDegrees),
          extrudedHeight: 8, // 8 meters 3D height extrusion above ground
          material: color,
          outline: true,
          outlineColor: outlineColor,
          outlineWidth: 3.0
        }
      });
    });
  }
}

// Global Export & Instance
if (typeof window !== 'undefined') {
  window.CesiumLandViewer = CesiumLandViewer;
}
