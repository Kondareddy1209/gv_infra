/* ============================================================
   Premium Plot Showcase — card-based plot browser (project.html).
   Loaded lazily by js/land-map.js when the "Plot showcase" tab is
   first opened. Reads/writes nothing of its own — all plot data
   comes from the shared GV_DATA layer, same as the 3D masterplan.
   ============================================================ */

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 12;

const grid = $('sc-grid');
const countEl = $('sc-count');
const loadMoreBtn = $('sc-load-more');

let plots = GV_DATA.getPlots();
let filters = { status: 'all', facing: 'all', size: 'all', maxPrice: 8000000 };
let visibleCount = PAGE_SIZE;
let compareIds = []; // up to 2 plot ids selected for comparison

function matchesFilters(plot) {
  if (filters.status !== 'all' && plot.status !== filters.status) return false;
  if (filters.facing !== 'all' && plot.facing !== filters.facing) return false;
  if (filters.size !== 'all' && String(plot.area) !== filters.size) return false;
  if (plot.price > filters.maxPrice) return false;
  return true;
}

function swatchStyle(plot) {
  return `background: #FFFFFF; border-top: 3px solid ${GV_DATA.statusColorHex(plot.status)};`;
}

function cardHTML(plot) {
  const statusLabel = GV_DATA.statusLabel(plot.status);
  const statusColor = GV_DATA.statusColorHex(plot.status);
  const checked = compareIds.includes(plot.id) ? 'checked' : '';
  const disableCompare = compareIds.length >= 2 && !compareIds.includes(plot.id);
  return `
  <div class="sc-card" data-plot-id="${plot.id}">
    <div class="sc-card-inner">
      <div class="sc-card-face sc-card-front" style="${swatchStyle(plot)}">
        <div class="sc-front-head">
          <div>
            <div class="sc-plot-no">Plot ${plot.plotNumber}${plot.owner ? ` · ${plot.owner}` : ''}</div>
            <div class="sc-plot-block">Block ${plot.block} · Phase 1</div>
          </div>
          <span class="sc-status-badge" style="background:${statusColor}">${statusLabel}</span>
        </div>

        <div class="sc-front-body">
          <div class="sc-plot-specs-row">
            <div class="sc-plot-spec-item">
              <div class="k">Area</div>
              <div class="v">${plot.area} sqft</div>
            </div>
            <div class="sc-plot-spec-item">
              <div class="k">Facing</div>
              <div class="v">${plot.facing}</div>
            </div>
            <div class="sc-plot-spec-item">
              <div class="k">Road Width</div>
              <div class="v">${plot.roadWidthFt} ft</div>
            </div>
            <div class="sc-plot-spec-item">
              <div class="k">Vastu</div>
              <div class="v" style="color:var(--brand-forest);">${GV_DATA.vastuLabel(GV_DATA.vastuGrade(plot))}</div>
            </div>
          </div>

          <div>
            <div class="sc-plot-price">${GV_DATA.formatINR(plot.price)}</div>
            <div class="sc-plot-rate">${GV_DATA.formatINR(plot.pricePerSqft)} / sqft · Fixed rate</div>
          </div>
        </div>

        <div class="sc-front-footer">
          <button class="sc-flip-btn" data-flip="${plot.id}" aria-label="Show plot ${plot.plotNumber} details" title="Flip for specifications">
            View Details &rarr;
          </button>
          <span style="font-size:0.72rem; color:var(--ink-soft); font-weight:500;">Tap to Flip</span>
        </div>
      </div>

      <div class="sc-card-face sc-card-back">
        <div class="sc-back-header">
          <div>
            <div class="sc-plot-no">Plot ${plot.plotNumber}${plot.owner ? ` · ${plot.owner}` : ''}</div>
            <div class="sc-plot-block">Block ${plot.block} · Specifications</div>
          </div>
          <div class="sc-back-header-right">
            <span class="sc-status-badge" style="background:${statusColor}">${statusLabel}</span>
            <button class="sc-flip-btn" data-flip="${plot.id}" aria-label="Show plot ${plot.plotNumber} front" title="Flip back" style="font-size:1.1rem; padding:0 4px;">&times;</button>
          </div>
        </div>

        <div class="sc-back-body">
          <dl class="sc-spec-list">
            <div><dt>Facing</dt><dd>${plot.facing}</dd></div>
            <div><dt>Carriageway</dt><dd>${plot.roadWidthFt} ft BT Road</dd></div>
            <div><dt>Corner Plot</dt><dd>${plot.isCorner ? 'Yes' : 'No'}</dd></div>
            <div><dt>Park Facing</dt><dd>${plot.isParkFacing ? 'Yes' : 'No'}</dd></div>
            <div><dt>Booking Deposit</dt><dd>${GV_DATA.formatINR(plot.bookingAmount)}</dd></div>
            <div><dt>Total Value</dt><dd class="sc-spec-price">${GV_DATA.formatINR(plot.price)}</dd></div>
          </dl>

          <div class="sc-back-actions">
            <button class="btn btn-primary btn-small sc-view-3d" data-plot-id="${plot.id}">View in 3D Model ↗</button>
            <label class="sc-compare-check ${disableCompare ? 'disabled' : ''}">
              <input type="checkbox" data-compare-id="${plot.id}" ${checked} ${disableCompare ? 'disabled' : ''}>
              Add to comparison
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function render() {
  const matching = plots.filter(matchesFilters);
  const shown = matching.slice(0, visibleCount);
  grid.innerHTML = shown.length
    ? shown.map(cardHTML).join('')
    : '<p class="sc-empty">No plots match these filters. Try widening your price range or status.</p>';
  countEl.textContent = `${matching.length} of ${plots.length} shown plots match your filters — illustrative demo grid (48 of the project's ${GV_DATA.project.totalPlots} total plots). Prices are illustrative: ${GV_DATA.project.priceNote}`;
  loadMoreBtn.hidden = visibleCount >= matching.length;

  grid.querySelectorAll('.sc-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      // If clicking inside back actions, don't toggle card flip
      if (e.target.closest('.sc-view-3d') || e.target.closest('.sc-compare-check')) {
        return;
      }
      // If user clicked the flip button on either face OR clicked anywhere on the front card face OR back header
      if (e.target.closest('.sc-flip-btn') || e.target.closest('.sc-card-front') || e.target.closest('.sc-back-header')) {
        const isFlipped = card.classList.toggle('flipped');
        card.classList.toggle('selected', isFlipped);
      }
    });
  });

  grid.querySelectorAll('.sc-view-3d').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewInModel(btn.dataset.plotId);
    });
  });

  grid.querySelectorAll('[data-compare-id]').forEach((box) => {
    box.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleCompare(box.dataset.compareId, box.checked);
    });
  });
}

// Reuses the existing 3D-view tab switch (js/land-map.js) rather than
// duplicating its lazy-load logic, then flies the camera once it's ready.
function viewInModel(plotId) {
  $('view-model')?.click();
  let attempts = 0;
  const poll = setInterval(() => {
    attempts += 1;
    if (window.GV_MASTERPLAN) {
      clearInterval(poll);
      window.GV_MASTERPLAN.focusPlot(plotId);
    } else if (attempts > 100) {
      clearInterval(poll); // ~10s — the 3D preview likely failed to load; land-map.js already shows that error.
    }
  }, 100);
}

function toggleCompare(plotId, checked) {
  if (checked) {
    if (compareIds.length >= 2) return; // shouldn't happen — checkbox is disabled once 2 are picked
    compareIds.push(plotId);
  } else {
    compareIds = compareIds.filter((id) => id !== plotId);
  }
  updateCompareTray();
  // Deliberately not a full render(): that rebuilds every card's innerHTML,
  // which would snap any card the user had flipped open back to its front
  // face right as they check its "add to compare" box. Just refresh the
  // checkbox states in place instead.
  grid.querySelectorAll('[data-compare-id]').forEach((box) => {
    const disableIt = compareIds.length >= 2 && !compareIds.includes(box.dataset.compareId);
    box.disabled = disableIt;
    box.closest('.sc-compare-check')?.classList.toggle('disabled', disableIt);
  });
}

function updateCompareTray() {
  const tray = $('sc-compare-tray');
  const chips = $('sc-compare-chips');
  const openBtn = $('sc-compare-open');
  const label = $('sc-compare-tray-label');
  tray.hidden = compareIds.length === 0;
  chips.innerHTML = compareIds
    .map((id) => {
      const p = GV_DATA.getPlot(id);
      return p ? `<span class="compare-tray-chip">Plot ${p.plotNumber}</span>` : '';
    })
    .join('');
  openBtn.disabled = compareIds.length !== 2;
  label.textContent = compareIds.length === 2
    ? 'Ready to compare'
    : `Select ${2 - compareIds.length} more plot${compareIds.length === 0 ? 's' : ''} to compare`;
}

function renderComparison() {
  const [p1, p2] = compareIds.map((id) => GV_DATA.getPlot(id));
  if (!p1 || !p2) return;
  $('sc-th-p1').textContent = `Plot ${p1.plotNumber}`;
  $('sc-th-p2').textContent = `Plot ${p2.plotNumber}`;
  const rows = [
    ['Status', GV_DATA.statusLabel(p1.status), GV_DATA.statusLabel(p2.status)],
    ['Price', GV_DATA.formatINR(p1.price), GV_DATA.formatINR(p2.price)],
    ['Area', `${p1.area} sq.ft`, `${p2.area} sq.ft`],
    ['Facing', p1.facing, p2.facing],
    ['Road width', `${p1.roadWidthFt} ft`, `${p2.roadWidthFt} ft`],
    ['Corner plot', p1.isCorner ? 'Yes' : 'No', p2.isCorner ? 'Yes' : 'No'],
    ['Park facing', p1.isParkFacing ? 'Yes' : 'No', p2.isParkFacing ? 'Yes' : 'No'],
    ['Booking amount', GV_DATA.formatINR(p1.bookingAmount), GV_DATA.formatINR(p2.bookingAmount)],
  ];
  $('sc-compare-tbody').innerHTML = rows
    .map(([label, v1, v2]) => `<tr><td>${label}</td><td>${v1}</td><td>${v2}</td></tr>`)
    .join('');
}

// ---------- Filter bar ----------
$('sc-filter-status').addEventListener('change', (e) => { filters.status = e.target.value; visibleCount = PAGE_SIZE; render(); });
$('sc-filter-facing').addEventListener('change', (e) => { filters.facing = e.target.value; visibleCount = PAGE_SIZE; render(); });
$('sc-filter-size').addEventListener('change', (e) => { filters.size = e.target.value; visibleCount = PAGE_SIZE; render(); });
$('sc-filter-price').addEventListener('change', (e) => { filters.maxPrice = Number(e.target.value); visibleCount = PAGE_SIZE; render(); });

loadMoreBtn.addEventListener('click', () => { visibleCount += PAGE_SIZE; render(); });

$('sc-compare-open').addEventListener('click', () => {
  renderComparison();
  $('sc-compare-modal').classList.add('open');
});
$('sc-compare-close').addEventListener('click', () => $('sc-compare-modal').classList.remove('open'));
$('sc-compare-clear').addEventListener('click', () => {
  compareIds = [];
  updateCompareTray();
  render();
});

// Keep the showcase in sync if the admin panel changes plot status/price
// in another tab — same cross-tab pattern as js/masterplan-page.js.
window.addEventListener('storage', (e) => {
  if (e.key === 'gv_infra_plots_v1') {
    GV_DATA.reloadPlots();
    plots = GV_DATA.getPlots();
    render();
  }
});

render();
