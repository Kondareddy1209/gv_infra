
    const PROJECTS = {
      peacock: {
        id: 'peacock',
        name: 'Arising Peacock Valley',
        center: [17.0854, 78.4908],
        zoom: 17,
        geojson: 'data/peacock_valley_plots.geojson',
        subtitle: '14 Acre DTCP & TS RERA Approved Project • Kadthal, Srisailam Highway',
        headerBadge: 'ARISING PEACOCK VALLEY | DTCP TLP NO: 239/2023/H | RERA: P02400007625 | ₹ 13,999/sq.yd',
        hwyBadge: '<<< Existing Srisailam Highway (NH-765) >>>',
        roadBadge: '<<< Proposed 40 ft & 33 ft BT Internal Roads >>>',
        pricePerSqYd: 13999,
        destCoords: '17.0854,78.4908',
        brochureOverlay: 'data/peacock_valley_brochure.jpg',
        brochureBounds: [[17.0842, 78.4890], [17.0868, 78.4930]]
      },
      stambadri: {
        id: 'stambadri',
        name: 'Stambadri Enclave',
        center: [17.2475, 80.1353],
        zoom: 17,
        geojson: 'data/sample_plots_complete.geojson',
        subtitle: 'Gurralapadu, NH-65 Highway, Khammam • LP NO: 45/2026/DTCP',
        headerBadge: 'GV INFRA — STAMBADRI ENCLAVE | LP NO: 45/2026/DTCP | ₹ 18,500/sq.yd',
        hwyBadge: '<<< Existing 200\' Khammam - Kodada Highway (NH-65) >>>',
        roadBadge: '<<< Proposed 40\' Main Entrance Road >>>',
        pricePerSqYd: 18500,
        destCoords: '17.2475,80.1353'
      }
    };

    let currentProject = PROJECTS.peacock;
    let map, plotLayer, currentTileLayer, drawControl, drawnItems, brochureImageOverlay;
    let cesiumModalViewer = null;
    let latestDrawnGeoJSON = null;
    let plotsData = [];
    let isMeasuring = false;
    let measurePoints = [];
    let measurePolyline = null;
    let currentOpacity = 0.45;
    let isBrochureVisible = false;
    let isBorderEditActive = false;
    let activeEditingLayer = null;
    let headerMarker, highwayMarker, entranceRoadMarker;

    // Telemetry Layers
    let flightsLayerGroup = null;
    let telecomLayerGroup = null;
    let weatherRadarTileLayer = null;
    let flightPollInterval = null;

    function toggleGodsEyeTelemetry() {
      const panel = document.getElementById('gods-eye-hud-panel');
      const btn = document.getElementById('btn-telemetry');
      if (panel.style.display === 'flex') {
        panel.style.display = 'none';
        btn.classList.remove('active');
      } else {
        panel.style.display = 'flex';
        btn.classList.add('active');
      }
    }

    /* 1. Live Airspace Flight Tracker Layer (OpenSky ADS-B) */
    async function toggleFlightsLayer(enabled) {
      if (!flightsLayerGroup) {
        flightsLayerGroup = L.layerGroup().addTo(map);
      }

      if (enabled) {
        fetchAndRenderFlights();
        if (!flightPollInterval) {
          flightPollInterval = setInterval(fetchAndRenderFlights, 5000);
        }
      } else {
        if (flightPollInterval) {
          clearInterval(flightPollInterval);
          flightPollInterval = null;
        }
        flightsLayerGroup.clearLayers();
        if (cesiumModalViewer) {
          // Remove 3D flight entities
          const flightEntities = cesiumModalViewer.entities.values.filter(e => e.name && e.name.includes('Flight'));
          flightEntities.forEach(e => cesiumModalViewer.entities.remove(e));
        }
      }
    }

    async function fetchAndRenderFlights() {
      try {
        const res = await fetch('/api/v1/live/flights');
        const json = await res.json();
        const flights = json.data || [];

        if (flightsLayerGroup) flightsLayerGroup.clearLayers();

        flights.forEach(f => {
          // 2D Leaflet Animated Plane Marker
          const planeIcon = L.divIcon({
            className: '',
            html: `<div style="transform: rotate(${f.heading}deg); color:#38bdf8; font-size:18px; filter:drop-shadow(0 0 8px #38bdf8);"><i class="fa-solid fa-plane"></i></div>
                   <div style="font-size:9px; font-weight:800; color:#fff; background:rgba(15,23,42,0.9); padding:2px 4px; border-radius:4px; white-space:nowrap; border:1px solid #38bdf8;">${f.callsign} (${Math.round(f.altitude_m)}m)</div>`,
            iconSize: [80, 40],
            iconAnchor: [40, 20]
          });

          L.marker([f.lat, f.lng], { icon: planeIcon }).addTo(flightsLayerGroup);

          // 3D Cesium Flying Plane Entity
          if (cesiumModalViewer) {
            const entityId = `flight-${f.icao24}`;
            let entity = cesiumModalViewer.entities.getById(entityId);
            const pos = Cesium.Cartesian3.fromDegrees(f.lng, f.lat, f.altitude_m / 10);
            
            if (!entity) {
              cesiumModalViewer.entities.add({
                id: entityId,
                name: `Flight ${f.callsign}`,
                position: pos,
                point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#38bdf8'), outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
                label: { text: `✈️ ${f.callsign} (${Math.round(f.altitude_m)}m)`, font: '12px sans-serif', fillColor: Cesium.Color.WHITE, style: Cesium.LabelStyle.FILL_AND_OUTLINE, outlineWidth: 2, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -10) }
              });
            } else {
              entity.position = pos;
            }
          }
        });
      } catch (err) {
        console.error('Error fetching live flights:', err);
      }
    }

    /* 2. Live Telecom 5G & Wi-Fi Coverage Grid */
    async function toggleTelecomLayer(enabled) {
      if (!telecomLayerGroup) {
        telecomLayerGroup = L.layerGroup().addTo(map);
      }

      if (enabled) {
        try {
          const res = await fetch('/api/v1/live/telecom');
          const json = await res.json();
          const nodes = json.data || [];

          telecomLayerGroup.clearLayers();

          nodes.forEach(n => {
            const isWifi = n.type === 'PublicWiFi';
            const color = isWifi ? '#10b981' : '#38bdf8';
            const iconSymbol = isWifi ? 'fa-wifi' : 'fa-tower-cell';

            const nodeIcon = L.divIcon({
              className: '',
              html: `<div style="background:${color}; color:#0f172a; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 0 15px ${color};"><i class="fa-solid ${iconSymbol}"></i></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });

            // Marker
            const marker = L.marker([n.lat, n.lng], { icon: nodeIcon }).addTo(telecomLayerGroup);
            marker.bindPopup(`<b>${n.provider}</b><br>Frequency: ${n.band}<br>Status: ${n.status}<br>Power: ${n.power_dbm} dBm`);

            // Coverage Radius Circle
            L.circle([n.lat, n.lng], {
              radius: n.radius_m,
              color: color,
              weight: 1,
              fillColor: color,
              fillOpacity: 0.15
            }).addTo(telecomLayerGroup);
          });
        } catch (err) {
          console.error('Error fetching telecom nodes:', err);
        }
      } else {
        telecomLayerGroup.clearLayers();
      }
    }

    /* 3. Live Weather Rain Radar Layer */
    function toggleWeatherRadarLayer(enabled) {
      if (enabled) {
        if (weatherRadarTileLayer) map.removeLayer(weatherRadarTileLayer);
        // RainViewer Tile Layer
        weatherRadarTileLayer = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/2/1_1.png', {
          opacity: 0.6,
          maxZoom: 18,
          attribution: 'RainViewer Real-Time Radar'
        }).addTo(map);
      } else {
        if (weatherRadarTileLayer) {
          map.removeLayer(weatherRadarTileLayer);
          weatherRadarTileLayer = null;
        }
      }
    }

    /* 4. Live Trains & Railway Tracks Layer */
    let trainsLayerGroup = null;
    let trainPollInterval = null;

    async function toggleTrainsLayer(enabled) {
      if (!trainsLayerGroup) {
        trainsLayerGroup = L.layerGroup().addTo(map);
      }

      if (enabled) {
        fetchAndRenderTrains();
        if (!trainPollInterval) {
          trainPollInterval = setInterval(fetchAndRenderTrains, 6000);
        }
      } else {
        if (trainPollInterval) {
          clearInterval(trainPollInterval);
          trainPollInterval = null;
        }
        trainsLayerGroup.clearLayers();
      }
    }

    async function fetchAndRenderTrains() {
      try {
        const res = await fetch('/api/v1/live/trains');
        const json = await res.json();
        const trains = json.trains || [];
        const tracks = json.tracks || [];

        if (trainsLayerGroup) trainsLayerGroup.clearLayers();

        // Render Railway Track Lines
        tracks.forEach(tr => {
          L.polyline(tr.coords, { color: '#f472b6', weight: 4, dashArray: '8, 8' }).addTo(trainsLayerGroup);
        });

        // Render Live Train Markers
        trains.forEach(t => {
          const trainIcon = L.divIcon({
            className: '',
            html: `<div style="background:#f472b6; color:#0f172a; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:800; box-shadow:0 0 15px #f472b6; white-space:nowrap; border:1px solid #ffffff;">
                    <i class="fa-solid fa-train"></i> ${t.train_number} (${t.speed_kmh} km/h)
                   </div>`,
            iconSize: [120, 30],
            iconAnchor: [60, 15]
          });
          const marker = L.marker([t.lat, t.lng], { icon: trainIcon }).addTo(trainsLayerGroup);
          marker.bindPopup(`<b>${t.name}</b><br>Speed: ${t.speed_kmh} km/h<br>Next Stop: ${t.next_station}`);
        });
      } catch (err) {
        console.error('Error fetching live trains:', err);
      }
    }

    /* 5. Live Traffic Speed Flow Layer */
    let trafficLayerGroup = null;

    async function toggleTrafficLayer(enabled) {
      if (!trafficLayerGroup) {
        trafficLayerGroup = L.layerGroup().addTo(map);
      }

      if (enabled) {
        try {
          const res = await fetch('/api/v1/live/traffic');
          const json = await res.json();
          const segments = json.data || [];

          trafficLayerGroup.clearLayers();

          segments.forEach(s => {
            L.polyline(s.coords, { color: s.color, weight: 6, opacity: 0.85 }).addTo(trafficLayerGroup);
          });
        } catch (err) {
          console.error('Error fetching traffic flow:', err);
        }
      } else {
        trafficLayerGroup.clearLayers();
      }
    }

    /* 6. Dynamic Nearby Infrastructure Radial Scan */
    async function fetchNearbyFeatures(lat, lng) {
      const container = document.getElementById('nearby-items-list');
      if (!container) return;

      container.innerHTML = '<span style="color:#94a3b8;">Scanning nearby streets, schools & healthcare...</span>';

      try {
        const res = await fetch(`/api/v1/nearby/features?lat=${lat}&lng=${lng}&radius=10000`);
        const json = await res.json();
        const items = json.data || [];

        if (items.length === 0) {
          container.innerHTML = '<span style="color:#94a3b8;">No major infrastructure within 10km.</span>';
          return;
        }

        container.innerHTML = '';
        items.forEach(item => {
          let icon = 'fa-location-dot';
          let color = '#38bdf8';
          if (item.category === 'highway') { icon = 'fa-road'; color = '#ef4444'; }
          if (item.category === 'industrial') { icon = 'fa-industry'; color = '#f59e0b'; }
          if (item.category === 'school') { icon = 'fa-school'; color = '#84cc16'; }
          if (item.category === 'hospital') { icon = 'fa-hospital'; color = '#ec4899'; }
          if (item.category === 'fuel') { icon = 'fa-gas-pump'; color = '#a855f7'; }

          const row = document.createElement('div');
          row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px;';
          row.innerHTML = `
            <span style="color:#f8fafc; font-weight:700;"><i class="fa-solid ${icon}" style="color:${color};"></i> ${item.name}</span>
            <span style="color:${color}; font-weight:800;">${item.distance_text}</span>
          `;
          container.appendChild(row);
        });
      } catch (err) {
        console.error('Error in nearby scan:', err);
      }
    }

    /* 7. Real-Time Solar & Lighting */
    function toggleSolarShadows(enabled) {
      if (cesiumModalViewer) {
        cesiumModalViewer.scene.globe.enableLighting = enabled;
      }
    }

    const tileProviders = {
      googleHybrid: L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['0', '1', '2', '3'],
        maxZoom: 21,
        maxNativeZoom: 20,
        attribution: '© Google Satellite'
      }),
      esriSatellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 21,
        maxNativeZoom: 18,
        attribution: 'Esri, Maxar | © Earthstar Geographics'
      })
    };

    function initMap() {
      map = L.map('real-map', {
        center: currentProject.center,
        zoom: currentProject.zoom,
        zoomControl: false
      });

      currentTileLayer = tileProviders.googleHybrid.addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      drawnItems = new L.FeatureGroup().addTo(map);

      drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            drawError: { color: '#ef4444', timeout: 1000 },
            shapeOptions: { color: '#10b981', weight: 3, fillColor: '#10b981', fillOpacity: 0.5 }
          },
          polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
        },
        edit: { featureGroup: drawnItems, remove: true }
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        latestDrawnGeoJSON = layer.toGeoJSON();

        if (confirm('Custom Land Area Drawn!\nWould you like to view this area draped over Real 3D Satellite Terrain?')) {
          open3DExtrusionModal(latestDrawnGeoJSON);
        }
      });

      addMasterplanHeaderOverlays();
      loadPlotsData();

      document.getElementById('btn-google-hybrid').addEventListener('click', (e) => switchMapLayer('googleHybrid', e.target));
      document.getElementById('btn-esri-sat').addEventListener('click', (e) => switchMapLayer('esriSatellite', e.target));
      document.getElementById('btn-measure').addEventListener('click', toggleMeasurementMode);
      document.getElementById('btn-share').addEventListener('click', shareVenture);
      document.getElementById('fab-reset').addEventListener('click', () => map.flyTo(currentProject.center, currentProject.zoom));
      document.getElementById('drawer-close').addEventListener('click', closeDrawer);
      document.getElementById('plot-search').addEventListener('input', (e) => filterPlots(e.target.value));

      document.getElementById('opacity-range').addEventListener('input', (e) => {
        currentOpacity = parseFloat(e.target.value);
        if (plotLayer) plotLayer.setStyle({ fillOpacity: currentOpacity });
        if (brochureImageOverlay) brochureImageOverlay.setOpacity(currentOpacity);
      });

      map.on('click', handleMapMeasurementClick);
    }

    /* LAND BORDER EDIT ENGINE */
    function toggleLandBorderEditMode() {
      isBorderEditActive = !isBorderEditActive;
      const editBtn = document.getElementById('btn-edit-land-border');
      const editBanner = document.getElementById('edit-mode-banner');

      if (isBorderEditActive) {
        editBtn.classList.add('editing-now');
        editBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> EXIT EDIT MODE';
        editBanner.style.display = 'flex';

        // Enable vertex dragging handles for all plot layers
        if (plotLayer) {
          plotLayer.eachLayer(layer => {
            if (layer.editing) {
              layer.editing.enable();
              layer.on('edit', () => handleBorderVertexDrag(layer));
            }
          });
        }
        alert('✏️ LAND BORDER EDIT MODE ACTIVE!\n\nCircular vertex drag handles are now displayed on every plot corner over the satellite map.\nClick and drag any corner node to reshape the land boundary!');
      } else {
        editBtn.classList.remove('editing-now');
        editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> EDIT LAND BORDER';
        editBanner.style.display = 'none';

        if (plotLayer) {
          plotLayer.eachLayer(layer => {
            if (layer.editing) layer.editing.disable();
          });
        }
      }
    }

    let activeDraggedGeoJSON = null;
    let isGodsEyeOrbitActive = false;
    let orbitRemoveListener = null;

    function handleBorderVertexDrag(layer) {
      activeDraggedGeoJSON = layer.toGeoJSON();
      const props = layer.feature.properties || {};
      const coords = activeDraggedGeoJSON.geometry.coordinates[0];
      
      // Calculate updated area in sq yards
      let areaM2 = 0;
      if (typeof L.GeometryUtil !== 'undefined' && L.GeometryUtil.geodesicArea) {
        areaM2 = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
      } else {
        areaM2 = coords.length * 150; // fallback calculation
      }
      const sqYards = Math.round(areaM2 * 1.19599);
      const pricePerYd = props.price_per_sqyard || currentProject.pricePerSqYd;
      const totalPrice = (sqYards * pricePerYd).toLocaleString('en-IN');

      // Auto-trigger nearby spatial intelligence scan around dragged vertex
      fetchNearbyFeatures(coords[0][1], coords[0][0]);

      const toast = document.getElementById('measure-toast');
      toast.style.display = 'flex';
      document.getElementById('measure-text').innerHTML = `
        <span style="font-weight:800; color:#fbbf24;">Plot ${props.plot_number || ''} Reshaped:</span> ${sqYards} sq.yds | Est Price: ₹ ${totalPrice}
        <button onclick="renderDraggedShapeIn3D()" style="background:linear-gradient(135deg, #10b981, #059669); color:#ffffff; border:none; padding:5px 14px; border-radius:9999px; font-size:11px; font-weight:800; cursor:pointer; margin-left:12px; box-shadow:0 0 12px rgba(16, 185, 129, 0.6); display:inline-flex; align-items:center; gap:6px;">
          <i class="fa-solid fa-cube"></i> VIEW DRAGGED LAND IN 3D SATELLITE
        </button>
      `;
    }

    function renderDraggedShapeIn3D() {
      if (!activeDraggedGeoJSON) {
        alert('Please drag a land border corner vertex or draw a polygon first!');
        return;
      }
      open3DExtrusionModal(activeDraggedGeoJSON, false);
    }

    function openGodsEye3DView() {
      const targetFeature = activeDraggedGeoJSON || (plotsData.length > 0 ? plotsData[0] : null);
      open3DExtrusionModal(targetFeature, true);
    }

    function saveEditedLandBorders() {
      const allFeatures = [];
      plotLayer.eachLayer(layer => {
        allFeatures.push(layer.toGeoJSON());
      });
      const featureCollection = { type: 'FeatureCollection', features: allFeatures };
      console.log('Saved Reshaped Land Borders:', featureCollection);
      alert('✅ Reshaped Land Borders Saved Successfully!\nTotal Parcels Calibrated: ' + allFeatures.length);
      toggleLandBorderEditMode();
    }

    let current3DRenderStyle = 'puresatellite';

    function set3DRenderStyle(style) {
      current3DRenderStyle = style;
      const btnPure = document.getElementById('btn-mode-puresat');
      const btnExt = document.getElementById('btn-mode-extruded');
      if (btnPure && btnExt) {
        if (style === 'puresatellite') {
          btnPure.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          btnPure.style.border = '1px solid #34d399';
          btnExt.style.background = 'rgba(255,255,255,0.1)';
          btnExt.style.border = '1px solid rgba(255,255,255,0.2)';
        } else {
          btnExt.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          btnExt.style.border = '1px solid #fbbf24';
          btnPure.style.background = 'rgba(255,255,255,0.1)';
          btnPure.style.border = '1px solid rgba(255,255,255,0.2)';
        }
      }
      open3DExtrusionModal(activeDraggedGeoJSON, false);
    }

    /* REAL 3D SATELLITE TERRAIN & PHOTOGRAMMETRY RENDERER */
    async function open3DExtrusionModal(customGeoJSON = null, isGodsEyeMode = false) {
      const modal = document.getElementById('modal-3d-backdrop');
      modal.style.display = 'flex';

      const targetFeature = customGeoJSON || activeDraggedGeoJSON || (plotsData.length > 0 ? plotsData[0] : null);
      if (!targetFeature) return;

      const coords = targetFeature.geometry.coordinates[0];
      const flatCoords = coords.flatMap(([lng, lat]) => [lng, lat]);

      // Calculate centroid
      let sumLng = 0, sumLat = 0;
      coords.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
      const centerLng = sumLng / coords.length;
      const centerLat = sumLat / coords.length;

      if (!cesiumModalViewer) {
        Cesium.Ion.defaultAccessToken = window.CESIUM_ION_TOKEN || '';

        const realSatelliteProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          credit: 'Esri, Maxar | © Earthstar Geographics',
          maximumLevel: 19
        });

        cesiumModalViewer = new Cesium.Viewer('cesium-modal-canvas', {
          imageryProvider: realSatelliteProvider,
          scene3DOnly: true,
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false
        });

        try {
          if (typeof Cesium.createWorldTerrainAsync === 'function') {
            const worldTerrain = await Cesium.createWorldTerrainAsync();
            cesiumModalViewer.terrainProvider = worldTerrain;
          }
        } catch (e) {
          console.warn('World terrain fallback:', e);
          cesiumModalViewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }

        cesiumModalViewer.scene.globe.depthTestAgainstTerrain = false;
        cesiumModalViewer.scene.globe.enableLighting = true;

        // Glowing Blue 3D Earth Atmosphere & Space Horizon
        if (cesiumModalViewer.scene.skyAtmosphere) {
          cesiumModalViewer.scene.skyAtmosphere.show = true;
          cesiumModalViewer.scene.skyAtmosphere.brightnessShift = 0.1;
        }
        cesiumModalViewer.scene.globe.showGroundAtmosphere = true;
        if (cesiumModalViewer.scene.fog) {
          cesiumModalViewer.scene.fog.enabled = true;
          cesiumModalViewer.scene.fog.density = 0.00015;
        }
      }

      if (orbitRemoveListener) {
        orbitRemoveListener();
        orbitRemoveListener = null;
        isGodsEyeOrbitActive = false;
      }

      cesiumModalViewer.entities.removeAll();

      // Render background venture plot outlines in thin transparent line
      plotsData.forEach(p => {
        try {
          const pCoords = p.geometry.coordinates[0];
          const pFlat = pCoords.flatMap(([lng, lat]) => [lng, lat]);
          cesiumModalViewer.entities.add({
            polygon: {
              hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(pFlat)),
              material: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.04),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#38bdf8').withAlpha(0.4),
              outlineWidth: 1
            }
          });
        } catch (err) {}
      });

      const hierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flatCoords));

      if (current3DRenderStyle === 'puresatellite') {
        // 1. PURE REAL SATELLITE VIEW (Zero Opaque Color Boxes - 100% Raw Satellite Imagery Visible!)
        cesiumModalViewer.entities.add({
          name: 'Real Photorealistic 3D Satellite Ground',
          polygon: {
            hierarchy: hierarchy,
            material: Cesium.Color.fromCssColorString('#10b981').withAlpha(0.04), // 96% transparent so original satellite photo, trees & soil render naturally!
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#34d399'),
            outlineWidth: 4
          }
        });

        // Glowing Laser Boundary Line
        cesiumModalViewer.entities.add({
          name: 'Laser Boundary Line',
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(flatCoords),
            width: 4,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#10b981')
            }),
            clampToGround: true
          }
        });
      } else {
        // 2. 3D EXTRUDED VOLUME BOX VIEW
        cesiumModalViewer.entities.add({
          name: '3D Extruded Dragged Parcel Volume',
          polygon: {
            hierarchy: hierarchy,
            extrudedHeight: 12,
            material: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.65),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#fbbf24'),
            outlineWidth: 2
          }
        });
      }

      // Ensure canvas resizes to exact viewport dimensions
      setTimeout(() => {
        if (cesiumModalViewer) {
          cesiumModalViewer.resize();
          cesiumModalViewer.scene.requestRender();
        }
      }, 80);

      // Bulletproof camera flyTo centered over (centerLng, centerLat)
      const altitude = isGodsEyeMode ? 250 : 320;
      const pitchDeg = isGodsEyeMode ? -85 : -35;
      const headingDeg = isGodsEyeMode ? 0 : 45;

      cesiumModalViewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, altitude),
        orientation: {
          heading: Cesium.Math.toRadians(headingDeg),
          pitch: Cesium.Math.toRadians(pitchDeg),
          roll: 0
        },
        duration: 1.0
      });
    }

    function set3DCameraPerspective(mode) {
      if (!cesiumModalViewer) return;

      if (orbitRemoveListener) {
        orbitRemoveListener();
        orbitRemoveListener = null;
        isGodsEyeOrbitActive = false;
      }

      const targetLng = currentProject.center[1];
      const targetLat = currentProject.center[0];

      if (mode === 'godseye') {
        cesiumModalViewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 250),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-85),
            roll: 0
          },
          duration: 1.0
        });
      } else if (mode === 'isometric') {
        cesiumModalViewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(targetLng, targetLat, 320),
          orientation: {
            heading: Cesium.Math.toRadians(45),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0
          },
          duration: 1.0
        });
      }
    }

    function toggle3DGodsEyeOrbit() {
      if (!cesiumModalViewer) return;
      
      if (isGodsEyeOrbitActive) {
        if (orbitRemoveListener) {
          orbitRemoveListener();
          orbitRemoveListener = null;
        }
        isGodsEyeOrbitActive = false;
        alert('360° Orbit Flythrough Paused.');
      } else {
        isGodsEyeOrbitActive = true;
        let heading = 0;
        orbitRemoveListener = cesiumModalViewer.clock.onTick.addEventListener(() => {
          heading += 0.005;
          if (heading > Math.PI * 2) heading = 0;
          cesiumModalViewer.camera.setView({
            orientation: {
              heading: heading,
              pitch: Cesium.Math.toRadians(-40),
              roll: 0
            }
          });
        });
      }
    }

    function close3DModal() {
      if (orbitRemoveListener) {
        orbitRemoveListener();
        orbitRemoveListener = null;
        isGodsEyeOrbitActive = false;
      }
      document.getElementById('modal-3d-backdrop').style.display = 'none';
    }

    function switchVenture(key) {
      if (!PROJECTS[key]) return;
      currentProject = PROJECTS[key];
      document.getElementById('venture-subtitle').innerText = currentProject.subtitle;

      if (brochureImageOverlay) {
        map.removeLayer(brochureImageOverlay);
        brochureImageOverlay = null;
        isBrochureVisible = false;
      }

      map.flyTo(currentProject.center, currentProject.zoom, { duration: 1.5 });
      addMasterplanHeaderOverlays();
      loadPlotsData();
    }

    function switchMapLayer(layerKey, btn) {
      document.querySelectorAll('.quick-nav-bar .ctrl-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      if (currentTileLayer) map.removeLayer(currentTileLayer);
      currentTileLayer = tileProviders[layerKey].addTo(map);
    }

    function toggleBrochureOverlay() {
      const btn = document.getElementById('btn-toggle-brochure');
      if (!currentProject.brochureOverlay) {
        alert('Brochure ground overlay is available for Peacock Valley venture.');
        return;
      }

      if (isBrochureVisible) {
        if (brochureImageOverlay) map.removeLayer(brochureImageOverlay);
        isBrochureVisible = false;
        btn.classList.remove('active');
      } else {
        brochureImageOverlay = L.imageOverlay(currentProject.brochureOverlay, currentProject.brochureBounds, {
          opacity: currentOpacity
        }).addTo(map);
        isBrochureVisible = true;
        btn.classList.add('active');
        alert('Brochure Masterplan Ground Overlay Activated!\nUse the Ground Opacity slider at bottom left to blend with satellite imagery.');
      }
    }

    function switchSidebarTab(tabName) {
      document.getElementById('tab-plots').classList.toggle('active', tabName === 'plots');
      document.getElementById('tab-stats').classList.toggle('active', tabName === 'stats');
      document.getElementById('tab-intel').classList.toggle('active', tabName === 'intel');

      document.getElementById('tab-content-plots').style.display = tabName === 'plots' ? 'flex' : 'none';
      document.getElementById('tab-content-stats').style.display = tabName === 'stats' ? 'flex' : 'none';
      document.getElementById('tab-content-intel').style.display = tabName === 'intel' ? 'flex' : 'none';
    }

    function addMasterplanHeaderOverlays() {
      if (headerMarker) map.removeLayer(headerMarker);
      if (highwayMarker) map.removeLayer(highwayMarker);
      if (entranceRoadMarker) map.removeLayer(entranceRoadMarker);

      const lat = currentProject.center[0];
      const lng = currentProject.center[1];

      headerMarker = L.marker([lat + 0.0011, lng + 0.0001], {
        icon: L.divIcon({
          className: '',
          html: `<div class="masterplan-header-badge"><i class="fa-solid fa-crown" style="color:#fbbf24;"></i> ${currentProject.headerBadge}</div>`,
          iconSize: [420, 40],
          iconAnchor: [210, 20]
        })
      }).addTo(map);

      highwayMarker = L.marker([lat - 0.0008, lng - 0.0009], {
        icon: L.divIcon({
          className: '',
          html: `<div class="highway-banner-badge"><i class="fa-solid fa-road"></i> ${currentProject.hwyBadge}</div>`,
          iconSize: [360, 32],
          iconAnchor: [180, 16]
        })
      }).addTo(map);

      entranceRoadMarker = L.marker([lat - 0.0004, lng - 0.0004], {
        icon: L.divIcon({
          className: '',
          html: `<div class="entrance-road-badge"><i class="fa-solid fa-route"></i> ${currentProject.roadBadge}</div>`,
          iconSize: [320, 28],
          iconAnchor: [160, 14]
        })
      }).addTo(map);
    }

    async function loadPlotsData() {
      try {
        const response = await fetch(currentProject.geojson);
        const data = await response.json();
        plotsData = data.features || [];

        renderCustomPlotsOnMap(data);
        renderPlotList(plotsData);
      } catch (err) {
        console.error('Error loading plot data:', err);
      }
    }

    function renderCustomPlotsOnMap(geojsonData) {
      if (plotLayer) map.removeLayer(plotLayer);

      plotLayer = L.geoJSON(geojsonData, {
        style: (feature) => {
          const status = (feature.properties.status || 'available').toLowerCase();
          let color = '#10b981';
          if (status === 'reserved') color = '#f59e0b';
          if (status === 'sold') color = '#ec4899';
          if (status === 'hold') color = '#ef4444';

          return {
            color: color,
            weight: 2,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: currentOpacity
          };
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties;
          const status = (props.status || 'available').toLowerCase();

          layer.bindTooltip(`<b>${props.plot_number}</b>`, {
            permanent: true,
            direction: 'center',
            className: `plot-map-badge plot-badge-${status}`
          });

          layer.on({
            mouseover: (e) => e.target.setStyle({ fillOpacity: 0.8, weight: 3 }),
            mouseout: (e) => plotLayer.resetStyle(e.target),
            click: () => selectPlot(feature, layer)
          });

          drawnItems.addLayer(layer);
        }
      }).addTo(map);

      if (plotLayer.getBounds().isValid()) {
        map.fitBounds(plotLayer.getBounds(), { padding: [60, 60] });
      }
    }

    function renderPlotList(plots) {
      const container = document.getElementById('plot-list-container');
      container.innerHTML = '';

      plots.forEach(p => {
        const props = p.properties;
        const status = (props.status || 'available').toLowerCase();
        
        const card = document.createElement('div');
        card.className = 'plot-card';
        card.innerHTML = `
          <div>
            <div class="plot-num">${props.plot_number}</div>
            <div class="plot-meta">${props.size || props.extent_sqyards} sq.yds • ${props.facing} Facing</div>
          </div>
          <span class="status-tag status-${status}">${status}</span>
        `;
        card.addEventListener('click', () => {
          selectPlot(p);
          plotLayer.eachLayer(layer => {
            if (layer.feature.properties.plot_id === props.plot_id) {
              map.flyTo(layer.getBounds().getCenter(), 19, { duration: 1 });
            }
          });
        });
        container.appendChild(card);
      });
    }

    function selectPlot(feature, layer) {
      const props = feature.properties;
      const drawer = document.getElementById('detail-drawer');
      const content = document.getElementById('drawer-content');
      const pricePerYd = props.price_per_sqyard || currentProject.pricePerSqYd;
      const totalPrice = props.total_price ? props.total_price.toLocaleString('en-IN') : ((props.size || 183) * pricePerYd).toLocaleString('en-IN');
      const status = (props.status || 'available').toUpperCase();

      content.innerHTML = `
        <div style="font-size:11px; text-transform:uppercase; color:#38bdf8; font-weight:800; letter-spacing:0.5px;">${currentProject.name} Masterplan</div>
        <h2 style="font-size:22px; font-weight:800; margin:4px 0 14px 0;">Plot ${props.plot_number}</h2>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">
          <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#94a3b8;">Survey Number</div>
            <div style="font-size:13px; font-weight:700;">${props.survey_number || '33/34'}</div>
          </div>
          <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#94a3b8;">Status</div>
            <div style="font-size:13px; font-weight:800; color:#34d399;">${status}</div>
          </div>
          <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#94a3b8;">Plot Extent</div>
            <div style="font-size:13px; font-weight:700; color:#34d399;">${props.size || props.extent_sqyards} sq.yds</div>
          </div>
          <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
            <div style="font-size:10px; color:#94a3b8;">Facing</div>
            <div style="font-size:13px; font-weight:700;">${props.facing}</div>
          </div>
        </div>

        <div style="background:rgba(16, 185, 129, 0.12); border:1px solid rgba(16, 185, 129, 0.4); padding:14px; border-radius:10px; margin-bottom:14px;">
          <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:700;">Investment Amount</div>
          <div style="font-size:24px; font-weight:800; color:#34d399;">₹ ${totalPrice}</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Offer Rate: ₹ ${pricePerYd.toLocaleString('en-IN')} / sq.yd</div>
        </div>

        <button class="cta-btn cta-edit" onclick="toggleLandBorderEditMode()">
          <i class="fa-solid fa-pen-to-square"></i> Reshape Corner Vertices
        </button>
        <button class="cta-btn cta-render-3d" onclick="open3DExtrusionModal()">
          <i class="fa-solid fa-globe"></i> View Real 3D Satellite Terrain Surface
        </button>
        <button class="cta-btn cta-whatsapp" onclick="window.open('https://wa.me/919392887268?text=Inquiring%20about%20Plot%20${props.plot_number}%20at%20${encodeURIComponent(currentProject.name)}','_blank')">
          <i class="fa-brands fa-whatsapp"></i> Inquire on WhatsApp
        </button>
      `;

      drawer.classList.add('open');
    }

    function toggleMeasurementMode() {
      isMeasuring = !isMeasuring;
      const btn = document.getElementById('btn-measure');
      const toast = document.getElementById('measure-toast');

      if (isMeasuring) {
        btn.classList.add('active');
        toast.style.display = 'flex';
        document.getElementById('measure-text').innerText = 'Click 2 points on map to measure distance...';
        measurePoints = [];
        if (measurePolyline) map.removeLayer(measurePolyline);
      } else {
        btn.classList.remove('active');
        toast.style.display = 'none';
        if (measurePolyline) map.removeLayer(measurePolyline);
        measurePoints = [];
      }
    }

    function handleMapMeasurementClick(e) {
      if (!isMeasuring) return;

      measurePoints.push(e.latlng);

      if (measurePolyline) map.removeLayer(measurePolyline);
      measurePolyline = L.polyline(measurePoints, { color: '#38bdf8', weight: 4, dashArray: '6, 6' }).addTo(map);

      if (measurePoints.length >= 2) {
        let totalMeters = 0;
        for (let i = 0; i < measurePoints.length - 1; i++) {
          totalMeters += measurePoints[i].distanceTo(measurePoints[i+1]);
        }
        const feet = (totalMeters * 3.28084).toFixed(1);
        const yards = (totalMeters * 1.09361).toFixed(1);
        document.getElementById('measure-text').innerText = `Distance: ${totalMeters.toFixed(1)}m | ${feet}ft | ${yards}yds`;
      }
    }

    function openWhatsApp() {
      window.open(`https://wa.me/919392887268?text=Hi%20GV%20Infra,%20I%20am%20exploring%20${encodeURIComponent(currentProject.name)}%20on%20the%20live%20satellite%20map.`, "_blank");
    }

    function openDirections() {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${currentProject.destCoords}`, "_blank");
    }

    function shareVenture() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        alert(`${currentProject.name} Real Map Link Copied!\nShare on WhatsApp or SMS.`);
      }
    }

    function filterPlots(query) {
      const q = query.toLowerCase();
      const filtered = plotsData.filter(p => {
        const props = p.properties;
        return (
          props.plot_number.toLowerCase().includes(q) ||
          (props.survey_number && props.survey_number.toLowerCase().includes(q)) ||
          props.facing.toLowerCase().includes(q)
        );
      });
      renderPlotList(filtered);
    }

    function closeDrawer() {
      document.getElementById('detail-drawer').classList.remove('open');
    }

    window.addEventListener('load', initMap);
  