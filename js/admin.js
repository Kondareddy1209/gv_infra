document.addEventListener("DOMContentLoaded", () => {

  // ---------- Tab switching ----------
  document.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
      document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
      link.classList.add("active");
      const tabId = link.dataset.tab;
      document.getElementById(`tab-${tabId}`).classList.add("active");

      if (tabId === 'land-marker' && !adminMap) {
        initAdminLandMap();
      }
    });
  });

  const STATUSES = ["available", "hold", "reserved", "sold", "blocked"];

  function renderDashboard() {
    const plots = GV_DATA.getPlots();
    const leads = GV_DATA.getLeads();
    const kpiRow = document.getElementById("kpi-row");
    const available = plots.filter(p => p.status === "available").length;
    const sold = plots.filter(p => p.status === "sold").length;

    kpiRow.innerHTML = `
      <div class="kpi"><div class="num">${leads.length}</div><div class="label">Total leads captured</div></div>
      <div class="kpi"><div class="num">${plots.length}</div><div class="label">Total plots</div></div>
      <div class="kpi"><div class="num">${available}</div><div class="label">Available now</div></div>
      <div class="kpi"><div class="num">${sold}</div><div class="label">Sold</div></div>
    `;

    const breakdownBody = document.getElementById("status-breakdown");
    breakdownBody.innerHTML = STATUSES.map(s => {
      const count = plots.filter(p => p.status === s).length;
      return `<tr><td>${GV_DATA.statusLabel(s)}</td><td>${count}</td></tr>`;
    }).join("");
  }

  function renderPlotsTable() {
    const plots = GV_DATA.getPlots().slice().sort((a, b) => a.plotNumber - b.plotNumber);
    const tbody = document.getElementById("plots-table");
    tbody.innerHTML = plots.map(p => `
      <tr data-id="${p.id}">
        <td>${p.plotNumber}</td>
        <td>${p.block}</td>
        <td>${p.area} sq.ft</td>
        <td>${p.facing}</td>
        <td>
          <select class="status-select">
            ${STATUSES.map(s => `<option value="${s}" ${s === p.status ? "selected" : ""}>${GV_DATA.statusLabel(s)}</option>`).join("")}
          </select>
        </td>
        <td><input type="number" class="price-input" value="${p.price}" step="10000"></td>
        <td>${p.lastUpdated}</td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const id = e.target.closest("tr").dataset.id;
        GV_DATA.updatePlotStatus(id, e.target.value);
        renderDashboard();
        renderPlotsTable();
      });
    });

    tbody.querySelectorAll(".price-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = e.target.closest("tr").dataset.id;
        GV_DATA.updatePlotPrice(id, Number(e.target.value));
        renderPlotsTable();
      });
    });
  }

  function renderLeadsTable() {
    const leads = GV_DATA.getLeads();
    const tbody = document.getElementById("leads-table");
    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--ink-soft);">No leads captured yet — try the callback form on the homepage or "Book a Site Visit" on the masterplan page.</td></tr>`;
      return;
    }
    tbody.innerHTML = leads.map(l => `
      <tr>
        <td>${l.name || "—"}</td>
        <td>${l.phone || "—"}</td>
        <td>${l.project || "—"}</td>
        <td>${l.plot || "—"}</td>
        <td>${l.source || "—"}</td>
        <td>${l.status || "new"}</td>
        <td>${new Date(l.createdAt).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");
  }

  // ---------- INTERACTIVE LAND BOUNDARY MARKER ----------
  let adminMap = null;
  let drawnPoints = [];
  let currentPolygonLayer = null;
  let adminMarkersGroup = null;

  function initAdminLandMap() {
    if (!window.L) return;
    const mapEl = document.getElementById("admin-map");
    if (!mapEl) return;

    // Khammam Gurralapadu center [lat, lng]
    const center = [17.24767, 80.14368];
    adminMap = L.map("admin-map").setView(center, 15);

    // Esri World Imagery Satellite Tile Layer
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri Satellite Imagery"
    }).addTo(adminMap);

    // Reference Labels
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}").addTo(adminMap);

    adminMarkersGroup = L.layerGroup().addTo(adminMap);

    // Click map to drop points for polygon boundary
    adminMap.on("click", (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      drawnPoints.push([lng, lat]);

      updateDrawnPolygon();
    });

    document.getElementById("btn-clear-draw").addEventListener("click", () => {
      drawnPoints = [];
      updateDrawnPolygon();
    });

    renderAdminParcelsTable();
    renderExistingParcelsOnAdminMap();
  }

  function updateDrawnPolygon() {
    if (!adminMap) return;
    adminMarkersGroup.clearLayers();

    if (drawnPoints.length > 0) {
      // Draw point markers
      drawnPoints.forEach((pt, idx) => {
        L.circleMarker([pt[1], pt[0]], {
          radius: 6,
          fillColor: "#F59E0B",
          color: "#fff",
          weight: 2,
          fillOpacity: 1
        }).bindPopup(`Vertex ${idx + 1}`).addTo(adminMarkersGroup);
      });

      // Draw polygon if 3+ points
      if (drawnPoints.length >= 3) {
        const latLngs = drawnPoints.map(p => [p[1], p[0]]);
        L.polygon(latLngs, {
          color: "#15803D",
          fillColor: "#4ADE80",
          fillOpacity: 0.45,
          weight: 3
        }).addTo(adminMarkersGroup);
      }
    }
  }

  function renderExistingParcelsOnAdminMap() {
    if (!adminMap) return;
    const parcels = GV_DATA.getAdminParcels();
    parcels.forEach(p => {
      if (p.coordinates && p.coordinates.length >= 3) {
        const latLngs = p.coordinates.map(pt => [pt[1], pt[0]]);
        const poly = L.polygon(latLngs, {
          color: p.status === 'available' ? '#15803D' : (p.status === 'reserved' ? '#D97706' : '#DC2626'),
          fillColor: p.status === 'available' ? '#4ADE80' : '#FCD34D',
          fillOpacity: 0.3,
          weight: 2
        }).addTo(adminMap);

        poly.bindPopup(`
          <strong>${p.title}</strong><br>
          Survey No: ${p.surveyNo}<br>
          Area: ${p.areaAcres} Acres<br>
          Price: ?${p.priceTotal.toLocaleString("en-IN")}
        `);
      }
    });
  }

  function renderAdminParcelsTable() {
    const parcels = GV_DATA.getAdminParcels();
    const tbody = document.getElementById("admin-parcels-table");
    if (!tbody) return;

    if (!parcels.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--ink-soft);">No custom land boundaries created yet. Click on the map to draw your first land parcel!</td></tr>`;
      return;
    }

    tbody.innerHTML = parcels.map(p => `
      <tr>
        <td><strong>${p.title}</strong></td>
        <td>${p.surveyNo}</td>
        <td>${p.areaAcres} Acres</td>
        <td>?${Number(p.priceTotal).toLocaleString("en-IN")}</td>
        <td>${p.facing}</td>
        <td><span style="background:${p.status === 'available' ? '#dcfce7' : '#fef3c7'}; color:${p.status === 'available' ? '#166534' : '#92400e'}; padding:2px 8px; border-radius:10px; font-weight:700; font-size:0.75rem;">${p.status.toUpperCase()}</span></td>
        <td>
          <button class="btn btn-outline btn-small btn-delete-parcel" data-id="${p.id}" style="padding:2px 8px; font-size:0.75rem; color:#dc2626;">Delete</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-delete-parcel").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        if (confirm("Delete this marked land boundary? It will be removed from the public website.")) {
          GV_DATA.deleteAdminParcel(id);
          renderAdminParcelsTable();
          if (adminMap) {
            adminMap.eachLayer(layer => {
              if (layer instanceof L.Polygon) adminMap.removeLayer(layer);
            });
            renderExistingParcelsOnAdminMap();
          }
        }
      });
    });
  }

  // Handle Form Submit to Save Parcel
  const parcelForm = document.getElementById("admin-parcel-form");
  if (parcelForm) {
    parcelForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (drawnPoints.length < 3) {
        alert("Please click at least 3 points on the map to draw a valid land parcel boundary polygon!");
        return;
      }

      // Close polygon loop
      const coords = [...drawnPoints];
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push(coords[0]);
      }

      // Calculate centroid
      const avgLng = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
      const avgLat = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;

      const newParcel = {
        title: document.getElementById("parcel-title").value,
        surveyNo: document.getElementById("parcel-survey").value,
        district: document.getElementById("parcel-district").value,
        mandal: document.getElementById("parcel-mandal").value,
        village: document.getElementById("parcel-village").value,
        areaAcres: parseFloat(document.getElementById("parcel-area").value),
        areaSqYds: Math.round(parseFloat(document.getElementById("parcel-area").value) * 4840),
        priceTotal: parseFloat(document.getElementById("parcel-price").value),
        status: document.getElementById("parcel-status").value,
        facing: document.getElementById("parcel-facing").value,
        lat: avgLat,
        lng: avgLng,
        coordinates: coords,
        owner: "GV Infra Approved Listing"
      };

      GV_DATA.saveAdminParcel(newParcel);
      alert("? Land Parcel Boundary Saved & Published Live to Website!");

      // Reset form & drawing state
      parcelForm.reset();
      drawnPoints = [];
      updateDrawnPolygon();
      renderAdminParcelsTable();
      renderExistingParcelsOnAdminMap();
    });
  }

  document.getElementById("reset-demo").addEventListener("click", () => {
    if (confirm("Reset all demo plot data to its original state?")) {
      GV_DATA.resetDemoData();
      renderDashboard();
      renderPlotsTable();
    }
  });

  renderDashboard();
  renderPlotsTable();
  renderLeadsTable();
});
