import { initMasterplan } from "./masterplan.js";

const plots = GV_DATA.getPlots();
const canvas = document.getElementById("masterplan-canvas");

const urlParams = new URLSearchParams(window.location.search);
let activeFilters = {
  status: urlParams.get("status") || "all",
  facing: urlParams.get("facing") || "all",
  size: urlParams.get("size") || "all",
  maxPrice: urlParams.has("price") ? Number(urlParams.get("price")) : 8000000,
  search: urlParams.get("search") || urlParams.get("plot") || ""
};

function matchesFilters(plot) {
  if (activeFilters.status !== "all" && plot.status !== activeFilters.status) return false;
  if (activeFilters.facing !== "all" && plot.facing !== activeFilters.facing) return false;
  if (activeFilters.size !== "all" && String(plot.area) !== activeFilters.size) return false;
  if (plot.price > activeFilters.maxPrice) return false;
  if (activeFilters.search && !String(plot.plotNumber).includes(activeFilters.search)) return false;
  return true;
}

function updateCount() {
  const matching = plots.filter(matchesFilters).length;
  document.getElementById("plot-count").textContent =
    `${matching} of ${plots.length} shown plots match your filters — this 3D preview illustrates ${plots.length} of the project's ${GV_DATA.project.totalPlots} total plots`;
}

const compassDial = document.getElementById("compass-dial");
const tooltipEl = document.getElementById("mp-hover-tooltip");

const mp = initMasterplan({
  canvas,
  onSelectPlot: (plot) => { if (plot) openDrawer(plot); },
  onHoverPlot: (plot, x, y) => updateTooltip(plot, x, y),
  onHeadingChange: (deg) => { compassDial.style.transform = `rotate(${deg}deg)`; },
});
// Small deliberate global bridge (same pattern as the already-global GV_DATA)
// so js/plot-showcase.js can fly the 3D view to a plot without a module import.
window.GV_MASTERPLAN = mp;

// ---------- Hover Tooltip Updater ----------
function updateTooltip(plot, clientX, clientY) {
  if (!plot || plot.status === "sold") {
    tooltipEl.classList.remove("visible");
    return;
  }
  const rect = canvas.parentElement.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  document.getElementById("tt-title").textContent = `Plot ${plot.plotNumber} · Block ${plot.block}`;
  document.getElementById("tt-area").textContent = `${plot.area} sqft`;
  document.getElementById("tt-facing").textContent = `${plot.facing} Facing`;
  document.getElementById("tt-price").textContent = GV_DATA.formatINR(plot.price);

  tooltipEl.style.left = `${relX}px`;
  tooltipEl.style.top = `${relY}px`;
  tooltipEl.classList.add("visible");
}

function refreshFilter() {
  mp.applyFilter(matchesFilters);
  updateCount();
}
refreshFilter();

// ---------- Chip & Range Filter Groups ----------
function wireChipGroup(containerId, key) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    [...el.children].forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activeFilters[key] = btn.dataset.value;
    refreshFilter();
  });
}
wireChipGroup("filter-status", "status");
wireChipGroup("filter-facing", "facing");
wireChipGroup("filter-size", "size");

function syncChipUI(containerId, activeVal) {
  const el = document.getElementById(containerId);
  if (!el) return;
  [...el.children].forEach((c) => {
    c.classList.toggle("active", c.dataset.value === activeVal);
  });
}
syncChipUI("filter-status", activeFilters.status);
syncChipUI("filter-facing", activeFilters.facing);
syncChipUI("filter-size", activeFilters.size);

// Price Range Slider Listener
const priceSlider = document.getElementById("filter-price");
const priceValLabel = document.getElementById("price-val-label");

if (priceSlider) {
  if (activeFilters.maxPrice < 8000000) priceSlider.value = activeFilters.maxPrice;
  priceSlider.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    activeFilters.maxPrice = val;
    priceValLabel.textContent = val >= 8000000 ? "All Prices" : `Under ${GV_DATA.formatINR(val)}`;
    refreshFilter();
  });
}

const searchInput = document.getElementById("plot-search");
if (searchInput) {
  if (activeFilters.search) searchInput.value = activeFilters.search;
  searchInput.addEventListener("input", (e) => {
    activeFilters.search = e.target.value.trim();
    refreshFilter();
    if (activeFilters.search.length >= 2) {
      const match = plots.find(p => String(p.plotNumber) === activeFilters.search);
      if (match) mp.focusPlot(match.id);
    }
  });

  if (activeFilters.search) {
    const match = plots.find(p => String(p.plotNumber) === activeFilters.search);
    if (match) setTimeout(() => { mp.focusPlot(match.id); openDrawer(match); }, 650);
  }
}

// ---------- Glassmorphic Toolbar Controls ----------
document.getElementById("btn-reset").addEventListener("click", () => mp.resetView());
document.getElementById("btn-fullscreen").addEventListener("click", () => {
  const area = canvas.closest(".mp-canvas-area");
  if (!document.fullscreenElement) area.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// Environment Lighting & Satellite Map Buttons
const btnEnvDay = document.getElementById("btn-env-day");
const btnEnvSunset = document.getElementById("btn-env-sunset");
const btnEnvNight = document.getElementById("btn-env-night");
const btnEnvSat = document.getElementById("btn-env-satellite");

function setEnvActive(activeBtn, mode) {
  [btnEnvDay, btnEnvSunset, btnEnvNight, btnEnvSat].forEach(b => b?.classList.remove("active"));
  activeBtn?.classList.add("active");
  mp.setEnvironmentMode(mode);
}

btnEnvDay?.addEventListener("click", () => setEnvActive(btnEnvDay, "day"));
btnEnvSunset?.addEventListener("click", () => setEnvActive(btnEnvSunset, "sunset"));
btnEnvNight?.addEventListener("click", () => setEnvActive(btnEnvNight, "night"));
btnEnvSat?.addEventListener("click", () => setEnvActive(btnEnvSat, "satellite"));

// 360° Drone Tour Modal Handlers
const droneModal = document.getElementById("drone-modal");
const btnDroneTour = document.getElementById("btn-drone-tour");
const droneClose = document.getElementById("drone-close");
const droneViewport = document.getElementById("drone-viewport");
const dronePanoImg = document.getElementById("drone-pano-img");

if (btnDroneTour && droneModal) {
  btnDroneTour.addEventListener("click", () => droneModal.classList.add("open"));
  droneClose.addEventListener("click", () => droneModal.classList.remove("open"));

  // Interactive 360° Panorama Drag Physics
  let isDragging = false;
  let startX = 0;
  let currentPanX = 0;

  droneViewport.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - currentPanX;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    currentPanX = e.clientX - startX;
    dronePanoImg.style.transform = `scale(1.25) translateX(${currentPanX * 0.4}px)`;
  });

  window.addEventListener("mouseup", () => { isDragging = false; });

  // Touch support for mobile
  droneViewport.addEventListener("touchstart", (e) => {
    isDragging = true;
    startX = e.touches[0].clientX - currentPanX;
  });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    currentPanX = e.touches[0].clientX - startX;
    dronePanoImg.style.transform = `scale(1.25) translateX(${currentPanX * 0.4}px)`;
  });

  window.addEventListener("touchend", () => { isDragging = false; });
}

// Street Walk Mode Toggle
const btnWalk = document.getElementById("btn-walk");
const btnActivity = document.getElementById("btn-activity");
const btnVr = document.getElementById("btn-vr");
const walkOverlay = document.getElementById("walk-overlay");
const btnExitWalk = document.getElementById("btn-exit-walk");

function setWalkActive(active) {
  const isWalk = mp.toggleWalkMode(active);
  btnWalk.classList.toggle("active", isWalk);
  walkOverlay.classList.toggle("is-hidden", !isWalk);
}

btnWalk.addEventListener("click", () => setWalkActive());
btnExitWalk.addEventListener("click", () => setWalkActive(false));

// Light activity makes the layout feel lived-in without distracting from plot selection.
btnActivity?.addEventListener("click", () => {
  const visible = mp.toggleActivity();
  btnActivity.classList.toggle("active", visible);
});

btnVr?.addEventListener("click", async () => {
  const active = mp.toggleVRMode();
  btnVr.classList.toggle("active", active);
  btnVr.textContent = active ? "✕ Exit VR" : "VR View";
  const area = canvas.closest(".mp-canvas-area");
  if (active && !document.fullscreenElement) {
    try { await area.requestFullscreen?.(); } catch (_) { /* Fullscreen is optional. */ }
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && btnVr?.classList.contains("active")) {
    mp.toggleVRMode(false);
    btnVr.classList.remove("active");
    btnVr.textContent = "VR View";
  }
});

// 3D Plot Number Badges Toggle
const btnLabels = document.getElementById("btn-labels");
btnLabels.addEventListener("click", () => {
  const shown = mp.togglePlotLabels();
  btnLabels.classList.toggle("active", shown);
});

// Vastu Mode Toggle
let colorMode = "status";
const btnVastu = document.getElementById("btn-vastu");
const legendStatus = document.getElementById("legend-status");
const legendVastu = document.getElementById("legend-vastu");
const mpHint = document.getElementById("mp-hint");

btnVastu.addEventListener("click", () => {
  colorMode = colorMode === "status" ? "vastu" : "status";
  mp.setColorMode(colorMode);
  btnVastu.classList.toggle("active", colorMode === "vastu");
  legendStatus.classList.toggle("is-hidden", colorMode === "vastu");
  legendVastu.classList.toggle("is-hidden", colorMode !== "vastu");
  mpHint.textContent = colorMode === "vastu"
    ? "Vastu view: plots coloured by facing · N marker shows true north · click a plot for guidance"
    : "Drag to orbit 3D view · scroll to zoom · click a plot to view details";
});

// ---------- Layer Toggle (roads / utilities / buildings) ----------
const btnLayers = document.getElementById("btn-layers");
const layersPanel = document.getElementById("layers-panel");
btnLayers?.addEventListener("click", () => {
  const open = layersPanel.classList.toggle("open");
  btnLayers.classList.toggle("active", open);
  btnLayers.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("#layers-panel input[type=checkbox]").forEach((box) => {
  box.addEventListener("change", () => mp.setLayerVisible(box.dataset.layer, box.checked));
});

// ---------- Measurement Tool ----------
// Deliberately reports scene units, not feet — see the comment in
// masterplan.js: the layout is stylised (every plot renders at one footprint
// regardless of its real sq.ft), so a feet conversion here would fabricate
// precision the model doesn't have.
const btnMeasure = document.getElementById("btn-measure");
const measurePanel = document.getElementById("measure-panel");
const measureReadout = document.getElementById("measure-readout");
const btnMeasureClear = document.getElementById("btn-measure-clear");

function updateMeasureReadout({ points, distance, area }) {
  if (points === 0) {
    measureReadout.textContent = "Click points on the layout to measure a distance, or 3+ to close a shape and see its area.";
  } else if (points === 1) {
    measureReadout.textContent = "1 point placed — click again to measure a distance.";
  } else {
    const parts = [`${distance.toFixed(1)} scene units total distance`];
    if (area > 0) parts.push(`${area.toFixed(1)} sq. scene units enclosed`);
    measureReadout.textContent = parts.join(" · ");
  }
}

btnMeasure?.addEventListener("click", () => {
  const active = mp.toggleMeasureMode(undefined, updateMeasureReadout);
  btnMeasure.classList.toggle("active", active);
  measurePanel.classList.toggle("open", active);
  if (active) {
    updateMeasureReadout({ points: 0, distance: 0, area: 0 });
    if (btnLayers?.classList.contains("active")) btnLayers.click();
    if (btnWalk.classList.contains("active")) setWalkActive(false);
  }
});
btnMeasureClear?.addEventListener("click", () => mp.clearMeasurement());

// ---------- Plot Drawer & EMI Calculator ----------
const drawer = document.getElementById("plot-drawer");
const scrim = document.getElementById("scrim");
let currentPlot = null;

function calculateEMI(principal, annualRatePercent, tenureYears) {
  const monthlyRate = annualRatePercent / 12 / 100;
  const numPayments = tenureYears * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return Math.round(emi);
}

function updateEMICalculator(plot) {
  const price = plot.price;
  const dp = Math.round(price * 0.2); // 20% down payment
  const loanAmt = price - dp;
  const tenureYears = Number(document.getElementById("emi-tenure-select").value);

  document.getElementById("emi-dp-val").textContent = GV_DATA.formatINR(dp);
  document.getElementById("emi-loan-val").textContent = GV_DATA.formatINR(loanAmt);

  const monthlyEMI = calculateEMI(loanAmt, 8.5, tenureYears);
  document.getElementById("emi-monthly-val").textContent = `${GV_DATA.formatINR(monthlyEMI)} / mo`;
}

document.getElementById("emi-tenure-select").addEventListener("change", () => {
  if (currentPlot) updateEMICalculator(currentPlot);
});

function openDrawer(plot) {
  currentPlot = plot;
  document.getElementById("drawer-block").textContent = `BLOCK ${plot.block} · PHASE 1`;
  document.getElementById("drawer-title").textContent = `Plot ${plot.plotNumber}`;

  const statusPill = document.getElementById("drawer-status");
  statusPill.textContent = GV_DATA.statusLabel(plot.status);
  statusPill.style.background = GV_DATA.statusColorHex(plot.status);

  document.getElementById("drawer-price").textContent =
    plot.status === "sold" ? "Sold" : GV_DATA.formatINR(plot.price);
  document.getElementById("drawer-updated").textContent = `Last updated: ${plot.lastUpdated}`;

  document.getElementById("spec-area").textContent = `${plot.area} sq.ft`;
  document.getElementById("spec-facing").textContent = `${plot.facing} Facing`;
  document.getElementById("spec-road").textContent = `${plot.roadWidthFt} ft`;
  document.getElementById("spec-corner").textContent = plot.isCorner ? "Yes" : "No";
  document.getElementById("spec-park").textContent = plot.isParkFacing ? "Yes" : "No";
  document.getElementById("spec-booking").textContent = GV_DATA.formatINR(plot.bookingAmount);

  updateEMICalculator(plot);

  const grade = GV_DATA.vastuGrade(plot);
  document.getElementById("vastu-dot").style.background = GV_DATA.vastuColorHex(grade);
  document.getElementById("vastu-grade").textContent = `${GV_DATA.vastuLabel(grade)} · ${plot.facing} facing`;
  document.getElementById("vastu-note").textContent = GV_DATA.vastuNote(plot);
  document.getElementById("vastu-disclaimer").textContent = GV_DATA.vastuDisclaimer;

  document.getElementById("cta-call").href = GV_DATA.telLink();
  document.getElementById("cta-whatsapp").href = GV_DATA.waLink(
    `Hi GV Infra, I am interested in Plot ${plot.plotNumber} at ${GV_DATA.project.name} (${plot.area} sq.ft, ${plot.facing} facing). Please share availability and booking details.`
  );

  drawer.classList.add("open");
  scrim.classList.add("open");
  logInteraction("plot_view", plot);
}

function closeDrawer() {
  drawer.classList.remove("open");
  scrim.classList.remove("open");
  currentPlot = null;
  mp.selectPlot(null);
}

document.getElementById("drawer-close").addEventListener("click", closeDrawer);
scrim.addEventListener("click", closeDrawer);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (drawer.classList.contains("open")) closeDrawer();
    const droneModal = document.getElementById("drone-modal");
    if (droneModal && droneModal.classList.contains("open")) droneModal.classList.remove("open");
    const compModal = document.getElementById("compare-modal");
    if (compModal && compModal.classList.contains("open")) compModal.classList.remove("open");
  }
});

document.getElementById("cta-visit").addEventListener("click", () => {
  if (!currentPlot) return;
  const name = prompt("Your name, to book a site visit:");
  if (!name || !name.trim()) return;
  const phone = prompt("Your phone number:");
  if (!phone || !phone.trim()) return;
  GV_DATA.saveLead({
    name: name.trim(),
    phone: phone.trim(),
    project: GV_DATA.project.name,
    plot: currentPlot.plotNumber,
    source: "website_3d_masterplan",
    status: "site_visit_booked",
  });
  logInteraction("site_visit_request", currentPlot);
  alert(`Thanks ${name.trim()} — we've noted your interest in Plot ${currentPlot.plotNumber} at ${GV_DATA.project.name}. Our sales team will call you to confirm a date.`);
});

document.getElementById("cta-save").addEventListener("click", () => {
  if (!currentPlot) return;
  const saved = JSON.parse(localStorage.getItem("gv_saved_plots") || "[]");
  if (!saved.includes(currentPlot.id)) saved.push(currentPlot.id);
  localStorage.setItem("gv_saved_plots", JSON.stringify(saved));
  alert(`Plot ${currentPlot.plotNumber} saved.`);
});

// ---------- Plot Comparison Modal ----------
const compareModal = document.getElementById("compare-modal");
const compareClose = document.getElementById("compare-close");
const compSelectP2 = document.getElementById("comp-select-p2");

document.getElementById("cta-compare").addEventListener("click", () => {
  if (!currentPlot) return;
  document.getElementById("comp-p1-num").textContent = currentPlot.plotNumber;
  document.getElementById("th-p1").textContent = `Plot ${currentPlot.plotNumber}`;

  // Populate 2nd plot dropdown
  compSelectP2.innerHTML = '<option value="">Choose a plot...</option>';
  plots.filter(p => p.id !== currentPlot.id).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `Plot ${p.plotNumber} (${p.area} sqft, ${p.facing}, ${GV_DATA.formatINR(p.price)})`;
    compSelectP2.appendChild(opt);
  });

  renderComparison(currentPlot, null);
  compareModal.classList.add("open");
});

compareClose.addEventListener("click", () => compareModal.classList.remove("open"));

compSelectP2.addEventListener("change", (e) => {
  const p2Id = e.target.value;
  const p2 = p2Id ? GV_DATA.getPlot(p2Id) : null;
  renderComparison(currentPlot, p2);
});

function renderComparison(p1, p2) {
  const tbody = document.getElementById("compare-tbody");
  if (!p2) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--ink-soft); padding:24px;">Select a 2nd plot from the dropdown above to view side-by-side comparison.</td></tr>`;
    return;
  }

  document.getElementById("th-p2").textContent = `Plot ${p2.plotNumber}`;

  const p1Emi = calculateEMI(p1.price * 0.8, 8.5, 20);
  const p2Emi = calculateEMI(p2.price * 0.8, 8.5, 20);

  const rows = [
    { label: "Status", v1: GV_DATA.statusLabel(p1.status), v2: GV_DATA.statusLabel(p2.status) },
    { label: "Total Price", v1: GV_DATA.formatINR(p1.price), v2: GV_DATA.formatINR(p2.price), highlight: p1.price !== p2.price },
    { label: "Area (sq.ft)", v1: `${p1.area} sqft`, v2: `${p2.area} sqft` },
    { label: "Rate / sq.ft", v1: GV_DATA.formatINR(p1.pricePerSqft), v2: GV_DATA.formatINR(p2.pricePerSqft) },
    { label: "Facing", v1: p1.facing, v2: p2.facing },
    { label: "Road Width", v1: `${p1.roadWidthFt} ft`, v2: `${p2.roadWidthFt} ft` },
    { label: "Vastu Rating", v1: GV_DATA.vastuLabel(GV_DATA.vastuGrade(p1)), v2: GV_DATA.vastuLabel(GV_DATA.vastuGrade(p2)) },
    { label: "Est. Monthly EMI", v1: `${GV_DATA.formatINR(p1Emi)} / mo`, v2: `${GV_DATA.formatINR(p2Emi)} / mo` }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr ${r.highlight ? 'style="background:#F0FDF4;"' : ''}>
      <td><strong>${r.label}</strong></td>
      <td>${r.v1}</td>
      <td>${r.v2}</td>
    </tr>
  `).join("");
}

function logInteraction(type, plot) {
  const log = JSON.parse(localStorage.getItem("gv_infra_interactions_v1") || "[]");
  log.unshift({ type, plot: plot?.plotNumber, project: GV_DATA.project.name, at: new Date().toISOString() });
  localStorage.setItem("gv_infra_interactions_v1", JSON.stringify(log.slice(0, 200)));
}

// Amenities Grid setup
const amenitiesGrid = document.getElementById("amenities-grid");
GV_DATA.project.amenities.forEach((a) => {
  const card = document.createElement("div");
  card.className = "doc-card";
  card.innerHTML = `<h4 style="margin-bottom:6px;">${a}</h4><p style="font-size:0.85rem; color:var(--ink-soft);">Included in Phase 1 development.</p>`;
  amenitiesGrid.appendChild(card);
});

function refreshLiveCounts() {
  const counts = GV_DATA.statusCounts();
  document.querySelectorAll("[data-live-count]").forEach((el) => {
    const key = el.dataset.liveCount;
    if (counts[key] !== undefined) el.textContent = counts[key];
  });
}

// Sync from Admin changes in another tab
window.addEventListener("storage", (e) => {
  if (e.key === "gv_infra_plots_v1") {
    GV_DATA.reloadPlots();
    mp.refreshColors();
    refreshFilter();
    refreshLiveCounts();
  }
});
