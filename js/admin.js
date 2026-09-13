/**
 * GV INFRA PROJECTS — Property Operations & Inventory Console
 * Controller Script (Pure Vanilla JS, Tabular Operations, Zero Dependencies)
 */

// Expose administrative operations API globally for tests and integrations
window.GV_ADMIN = {
  updatePlotStatus(id, status) {
    if (typeof GV_DATA !== "undefined" && GV_DATA.updatePlotStatus) {
      const updated = GV_DATA.updatePlotStatus(id, status);
      window.dispatchEvent(new Event("storage"));
      return updated;
    }
  },
  updatePlotPrice(id, price) {
    if (typeof GV_DATA !== "undefined" && GV_DATA.updatePlotPrice) {
      const updated = GV_DATA.updatePlotPrice(id, price);
      window.dispatchEvent(new Event("storage"));
      return updated;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Check if GV_DATA is present
  if (typeof GV_DATA === "undefined") {
    console.error("GV_DATA is not defined. Ensure js/data.js is loaded prior to admin.js.");
    return;
  }

  // Admin Authentication Guard (Client-Side MVP Authorization Layer)
  const gate = document.getElementById("admin-auth-gate");
  const shell = document.querySelector(".admin-shell");
  const userBadge = document.getElementById("admin-user-badge");
  const userName = document.getElementById("admin-user-name");
  const logoutBtn = document.getElementById("admin-logout-btn");

  if (typeof GV_AUTH === "undefined" || !GV_AUTH.isAdmin()) {
    if (gate) gate.style.display = "flex";
    if (shell) shell.style.display = "none";
    if (userBadge) userBadge.style.display = "none";

    const gateForm = document.getElementById("admin-gate-form");
    const quickBtn = document.getElementById("admin-gate-quick-btn");
    const errEl = document.getElementById("admin-gate-error");

    if (quickBtn) {
      quickBtn.onclick = () => {
        if (typeof GV_AUTH !== "undefined") {
          const creds = GV_AUTH.getDemoCredentials();
          document.getElementById("admin-gate-email").value = creds.admin.email;
          document.getElementById("admin-gate-pass").value = creds.admin.password;
        }
      };
    }

    if (gateForm) {
      gateForm.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById("admin-gate-email").value;
        const pass = document.getElementById("admin-gate-pass").value;
        if (typeof GV_AUTH !== "undefined") {
          const res = GV_AUTH.login(email, pass);
          if (res.success && GV_AUTH.isAdmin()) {
            window.location.reload();
          } else {
            if (errEl) errEl.textContent = res.message || "Unauthorized: Administrator credentials required.";
          }
        }
      };
    }
    // Block further execution of operational console scripts
    return;
  } else {
    if (gate) gate.style.display = "none";
    if (shell) shell.style.display = "grid";
    if (userBadge) {
      userBadge.style.display = "inline-flex";
      const cur = GV_AUTH.getCurrentUser();
      if (cur && userName) userName.textContent = cur.name || "Administrator";
    }
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (typeof GV_AUTH !== "undefined") {
          GV_AUTH.logout();
          window.location.reload();
        }
      };
    }
  }

  // Cross-tab synchronization: re-check authorization if auth state changes
  window.addEventListener("gv-auth-change", () => {
    enforceAdminAuth();
  });

  // Ensure sample realistic leads exist if localStorage has none yet
  seedInitialLeadsIfEmpty();

  // State Management
  const state = {
    activeView: "overview",
    inventoryFilters: {
      search: "",
      status: "",
      block: "",
      facing: "",
      sort: "plotNumber-asc"
    },
    leadFilters: {
      search: "",
      status: "",
      sort: "newest"
    },
    editingPlotId: null,
    activeLead: null
  };

  const STATUSES = ["available", "reserved", "hold", "sold", "blocked"];

  // Cache DOM Elements
  const els = {
    sidebar: document.getElementById("admin-sidebar"),
    mobileToggle: document.getElementById("mobile-nav-toggle"),
    navButtons: document.querySelectorAll(".nav-btn"),
    viewSections: document.querySelectorAll(".view-section"),
    refreshBtn: document.getElementById("btn-refresh-data"),
    syncBadge: document.getElementById("sync-status"),
    toastContainer: document.getElementById("toast-container"),
    
    // Badges
    badgePlots: document.getElementById("nav-badge-plots"),
    badgeLeads: document.getElementById("nav-badge-leads"),

    // Overview
    overviewMetrics: document.getElementById("overview-metrics-strip"),
    distBarTrack: document.getElementById("dist-bar-track"),
    distBarLegend: document.getElementById("dist-bar-legend"),
    overviewRecentLeads: document.getElementById("overview-recent-leads"),
    overviewBtnInventory: document.getElementById("overview-btn-inventory"),
    overviewBtnAllLeads: document.getElementById("overview-btn-all-leads"),

    // Inventory
    invSearch: document.getElementById("inventory-search"),
    filterStatus: document.getElementById("filter-status"),
    filterBlock: document.getElementById("filter-block"),
    filterFacing: document.getElementById("filter-facing"),
    sortPlots: document.getElementById("sort-plots"),
    btnResetFilters: document.getElementById("btn-reset-filters"),
    btnEmptyReset: document.getElementById("btn-empty-reset"),
    invCount: document.getElementById("inventory-count-indicator"),
    invTableBody: document.getElementById("inventory-table-body"),
    invEmpty: document.getElementById("inventory-empty"),
    btnExportInventory: document.getElementById("btn-export-inventory"),

    // Leads
    leadsSearch: document.getElementById("leads-search"),
    filterLeadStatus: document.getElementById("filter-lead-status"),
    sortLeads: document.getElementById("sort-leads"),
    btnResetLeadsFilters: document.getElementById("btn-reset-leads-filters"),
    leadsCount: document.getElementById("leads-count-indicator"),
    leadsTableBody: document.getElementById("leads-table-body"),
    leadsEmpty: document.getElementById("leads-empty"),
    btnExportLeads: document.getElementById("btn-export-leads"),

    // Pricing
    pricingMetrics: document.getElementById("pricing-metrics-strip"),
    pricingBlockBreakdown: document.getElementById("pricing-block-breakdown"),

    // Settings
    diagPlotsCount: document.getElementById("diag-plots-count"),
    diagLeadsCount: document.getElementById("diag-leads-count"),
    diagStorageSize: document.getElementById("diag-storage-size"),
    diagLastSync: document.getElementById("diag-last-sync"),
    masterplanDemoName: document.getElementById("masterplan-demo-name"),
    masterplanDemoZoom: document.getElementById("masterplan-demo-zoom"),
    masterplanDemoScale: document.getElementById("masterplan-demo-scale"),
    masterplanDemoMode: document.getElementById("masterplan-demo-mode"),
    masterplanDemoOverlay: document.getElementById("masterplan-demo-overlay"),
    masterplanDemoRoads: document.getElementById("masterplan-demo-roads"),
    masterplanDemoOpenSpaces: document.getElementById("masterplan-demo-open-spaces"),
    masterplanDemoAmenities: document.getElementById("masterplan-demo-amenities"),
    masterplanDemoLabels: document.getElementById("masterplan-demo-labels"),
    masterplanDemoControls: document.getElementById("masterplan-demo-controls"),
    btnSaveMasterplanDemo: document.getElementById("btn-save-masterplan-demo"),
    btnResetMasterplanDemo: document.getElementById("btn-reset-masterplan-demo"),
    masterplanDemoSaveStatus: document.getElementById("masterplan-demo-save-status"),
    btnExportFullJson: document.getElementById("btn-export-full-json"),
    btnOpenResetModal: document.getElementById("btn-open-reset-modal"),

    // Drawer
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    drawerLeadName: document.getElementById("drawer-lead-name"),
    drawerLeadId: document.getElementById("drawer-lead-id"),
    drawerLeadPhone: document.getElementById("drawer-lead-phone"),
    drawerLeadPlot: document.getElementById("drawer-lead-plot"),
    drawerLeadProject: document.getElementById("drawer-lead-project"),
    drawerLeadSource: document.getElementById("drawer-lead-source"),
    drawerLeadDate: document.getElementById("drawer-lead-date"),
    drawerLeadStatusSelect: document.getElementById("drawer-lead-status-select"),
    drawerBtnWhatsApp: document.getElementById("drawer-btn-whatsapp"),
    drawerBtnCall: document.getElementById("drawer-btn-call"),
    drawerCloseBtn: document.getElementById("drawer-close-btn"),

    // Modal
    resetModal: document.getElementById("reset-modal"),
    resetModalClose: document.getElementById("reset-modal-close"),
    resetModalCancel: document.getElementById("reset-modal-cancel"),
    resetModalConfirm: document.getElementById("reset-modal-confirm")
  };

  /* -------------------------------------------------------------
     1. NOTIFICATION TOAST SYSTEM
  ------------------------------------------------------------- */
  function showToast(message, type) {
    if (!els.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast-msg" + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
    const iconColor = type === 'success' ? '#17A858' : type === 'error' ? '#C72323' : '#9A7832';
    toast.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>${escapeHtml(message)}</span>
    `;
    els.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 280);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* -------------------------------------------------------------
     2. NAVIGATION & TAB SWITCHING
  ------------------------------------------------------------- */
  function switchView(viewName) {
    state.activeView = viewName;
    els.navButtons.forEach(btn => {
      const isActive = btn.dataset.view === viewName;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    els.viewSections.forEach(sec => {
      sec.classList.toggle("active", sec.id === `view-${viewName}`);
    });

    // Close mobile nav if open
    if (els.sidebar.classList.contains("mobile-open")) {
      els.sidebar.classList.remove("mobile-open");
    }

    renderCurrentView();
  }

  els.navButtons.forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  if (els.mobileToggle) {
    els.mobileToggle.addEventListener("click", () => {
      els.sidebar.classList.toggle("mobile-open");
    });
  }

  if (els.overviewBtnInventory) {
    els.overviewBtnInventory.addEventListener("click", () => switchView("inventory"));
  }

  if (els.overviewBtnAllLeads) {
    els.overviewBtnAllLeads.addEventListener("click", () => switchView("leads"));
  }

  if (els.refreshBtn) {
    els.refreshBtn.addEventListener("click", () => {
      GV_DATA.reloadPlots();
      refreshAll();
      showToast("Operations data refreshed from local store.");
    });
  }

  /* -------------------------------------------------------------
     3. OVERVIEW RENDERER
  ------------------------------------------------------------- */
  function renderOverview() {
    const plots = GV_DATA.getPlots();
    const leads = GV_DATA.getLeads();

    const counts = { available: 0, reserved: 0, hold: 0, sold: 0, blocked: 0 };
    plots.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });

    const total = plots.length;
    const availPercent = total ? Math.round((counts.available / total) * 100) : 0;
    const soldPercent = total ? Math.round((counts.sold / total) * 100) : 0;

    // Metrics Strip
    els.overviewMetrics.innerHTML = `
      <div class="metric-block accent-forest">
        <div class="metric-label">Total Inventory</div>
        <div class="metric-val">${total}</div>
        <div class="metric-sub">302 masterplan schedule</div>
      </div>
      <div class="metric-block accent-avail">
        <div class="metric-label">Available Plots</div>
        <div class="metric-val">${counts.available}</div>
        <div class="metric-sub">${availPercent}% available for sale</div>
      </div>
      <div class="metric-block accent-hold">
        <div class="metric-label">Hold &amp; Reserved</div>
        <div class="metric-val">${counts.reserved + counts.hold}</div>
        <div class="metric-sub">${counts.reserved} reserved · ${counts.hold} hold</div>
      </div>
      <div class="metric-block accent-sold">
        <div class="metric-label">Sold Units</div>
        <div class="metric-val">${counts.sold}</div>
        <div class="metric-sub">${soldPercent}% inventory absorbed</div>
      </div>
      <div class="metric-block accent-bronze">
        <div class="metric-label">Inbound Leads</div>
        <div class="metric-val">${leads.length}</div>
        <div class="metric-sub">Active pipeline buyer inquiries</div>
      </div>
    `;

    // Distribution Bar
    const statusKeys = [
      { key: "available", label: "Available", class: "seg-avail", dot: "var(--status-avail-color)" },
      { key: "reserved", label: "Reserved", class: "seg-res", dot: "var(--status-res-color)" },
      { key: "hold", label: "On Hold", class: "seg-hold", dot: "var(--status-hold-color)" },
      { key: "sold", label: "Sold", class: "seg-sold", dot: "var(--status-sold-color)" },
      { key: "blocked", label: "Blocked", class: "seg-blocked", dot: "var(--status-blocked-color)" }
    ];

    els.distBarTrack.innerHTML = statusKeys.map(s => {
      const c = counts[s.key] || 0;
      const pct = total ? (c / total) * 100 : 0;
      return `<div class="dist-bar-seg ${s.class}" style="width: ${pct}%;" title="${s.label}: ${c} (${Math.round(pct)}%)"></div>`;
    }).join("");

    els.distBarLegend.innerHTML = statusKeys.map(s => {
      const c = counts[s.key] || 0;
      return `
        <span class="legend-item">
          <span class="legend-dot" style="background:${s.dot};"></span>
          <span>${s.label}: <strong>${c}</strong></span>
        </span>
      `;
    }).join("");

    // Recent Leads Table
    const recentLeads = leads.slice(0, 5);
    if (!recentLeads.length) {
      els.overviewRecentLeads.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 24px; color: var(--admin-ink-muted);">
            No buyer inquiries captured yet. Try the callback form or "Book a Site Visit" on the masterplan page.
          </td>
        </tr>
      `;
    } else {
      els.overviewRecentLeads.innerHTML = recentLeads.map(l => {
        const leadId = l.id || l.createdAt;
        const formattedDate = l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—";
        return `
          <tr data-lead-id="${leadId}">
            <td style="font-weight:700;">${escapeHtml(l.name || "Anonymous Prospect")}</td>
            <td><code>${escapeHtml(l.phone || "—")}</code></td>
            <td>${l.plot ? `Plot #${l.plot}` : "General Venture"}</td>
            <td><span style="font-size:0.75rem; color:var(--admin-ink-muted);">${formatSource(l.source)}</span></td>
            <td>${renderPipelineBadge(l.status)}</td>
            <td style="font-size:0.75rem; color:var(--admin-ink-muted);">${formattedDate}</td>
            <td style="text-align: right;">
              <button class="btn-op btn-op-default btn-view-lead" data-id="${leadId}" style="height:26px; padding:0 8px; font-size:0.72rem;">Inspect</button>
            </td>
          </tr>
        `;
      }).join("");

      els.overviewRecentLeads.querySelectorAll(".btn-view-lead").forEach(btn => {
        btn.addEventListener("click", () => openLeadDrawer(btn.dataset.id));
      });
    }
  }

  /* -------------------------------------------------------------
     4. INVENTORY RENDERER
  ------------------------------------------------------------- */
  function getFilteredPlots() {
    let plots = GV_DATA.getPlots().slice();

    // Search
    const search = state.inventoryFilters.search.trim().toLowerCase();
    if (search) {
      plots = plots.filter(p => {
        return (
          String(p.plotNumber).includes(search) ||
          p.facing.toLowerCase().includes(search) ||
          p.block.toLowerCase().includes(search) ||
          String(p.area).includes(search)
        );
      });
    }

    // Filter Status
    if (state.inventoryFilters.status) {
      plots = plots.filter(p => p.status === state.inventoryFilters.status);
    }

    // Filter Block
    if (state.inventoryFilters.block) {
      plots = plots.filter(p => p.block === state.inventoryFilters.block);
    }

    // Filter Facing
    if (state.inventoryFilters.facing) {
      plots = plots.filter(p => p.facing === state.inventoryFilters.facing);
    }

    // Sort
    const [field, direction] = state.inventoryFilters.sort.split("-");
    plots.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      if (direction === "desc") {
        return valB > valA ? 1 : valB < valA ? -1 : 0;
      } else {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      }
    });

    return plots;
  }

  function renderInventory() {
    const allPlots = GV_DATA.getPlots();
    const filteredPlots = getFilteredPlots();

    els.invCount.textContent = `Showing ${filteredPlots.length} of ${allPlots.length} units`;

    if (!filteredPlots.length) {
      els.invTableBody.innerHTML = "";
      els.invEmpty.style.display = "block";
      return;
    }

    els.invEmpty.style.display = "none";

    els.invTableBody.innerHTML = filteredPlots.map(p => {
      const isEditing = state.editingPlotId === p.id;

      return `
        <tr data-plot-id="${p.id}">
          <td style="font-weight: 800; font-variant-numeric: tabular-nums;">${p.plotNumber}</td>
          <td><span style="font-weight: 700; color: var(--admin-forest);">${p.block}</span></td>
          <td class="num-col" style="font-weight: 600;">${p.area.toLocaleString("en-IN")}</td>
          <td>
            <span style="font-size: 0.76rem; font-weight: 600; color: var(--admin-ink-secondary);">${p.facing}</span>
            ${p.isCorner ? '<span style="font-size:0.66rem; background:#F1EFEA; padding:1px 4px; border-radius:2px; margin-left:4px; font-weight:700;">Corner</span>' : ''}
          </td>
          <td>${p.roadWidthFt} ft</td>
          <td>
            <select class="table-status-select" data-id="${p.id}" aria-label="Change status for Plot ${p.plotNumber}">
              ${STATUSES.map(s => `<option value="${s}" ${s === p.status ? "selected" : ""}>${GV_DATA.statusLabel(s)}</option>`).join("")}
            </select>
          </td>
          <td class="num-col">
            ${isEditing ? `
              <div class="price-edit-box">
                <input type="number" class="price-input-field" value="${p.price}" step="5000" min="100000" data-id="${p.id}">
                <button class="btn-price-save" data-id="${p.id}" title="Save Price">✓</button>
                <button class="btn-price-cancel" title="Cancel">✕</button>
              </div>
            ` : `
              <div class="price-display-wrapper">
                <span class="price-text">${GV_DATA.formatINR(p.price)}</span>
                <button class="btn-price-edit" data-id="${p.id}" title="Edit Price" aria-label="Edit price for Plot ${p.plotNumber}">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
              </div>
            `}
          </td>
          <td style="font-size: 0.74rem; color: var(--admin-ink-muted);">${p.lastUpdated || "—"}</td>
          <td style="text-align: right;">
            <a href="project.html" target="_blank" rel="noopener" class="btn-op btn-op-default" style="height:26px; padding:0 8px; font-size:0.72rem; text-decoration:none;" title="Inspect in 3D masterplan">
              3D View
            </a>
          </td>
        </tr>
      `;
    }).join("");

    // Status change listener
    els.invTableBody.querySelectorAll(".table-status-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        const plot = GV_DATA.getPlot(id);
        GV_DATA.updatePlotStatus(id, newStatus);
        showToast(`Plot ${plot ? plot.plotNumber : id} updated to ${GV_DATA.statusLabel(newStatus)}`);
        
        // Notify storage listeners across tabs
        window.dispatchEvent(new Event("storage"));
        
        renderOverview();
        renderInventory();
        renderPricing();
        renderSettings();
      });
    });

    // Inline price edit triggers
    els.invTableBody.querySelectorAll(".btn-price-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        state.editingPlotId = btn.dataset.id;
        renderInventory();
        const input = els.invTableBody.querySelector(`input[data-id="${btn.dataset.id}"]`);
        if (input) {
          input.focus();
          input.select();
        }
      });
    });

    // Inline price save
    els.invTableBody.querySelectorAll(".btn-price-save").forEach(btn => {
      btn.addEventListener("click", () => {
        const row = btn.closest("tr");
        const id = btn.dataset.id || (row ? row.dataset.plotId : null);
        const input = row ? row.querySelector(".price-input-field") : els.invTableBody.querySelector(`input[data-id="${id}"]`);
        if (!input) return;

        const val = Number(input.value);
        if (isNaN(val) || val <= 0) {
          showToast("Error: Please enter a valid positive price value.");
          return;
        }

        const plot = GV_DATA.getPlot(id);
        GV_DATA.updatePlotPrice(id, Math.round(val));
        state.editingPlotId = null;
        showToast(`Plot ${plot ? plot.plotNumber : id} price updated to ${GV_DATA.formatINR(val)}`);

        // Notify storage listeners across tabs
        window.dispatchEvent(new Event("storage"));

        renderInventory();
        renderPricing();
        renderSettings();
      });
    });

    // Inline price cancel
    els.invTableBody.querySelectorAll(".btn-price-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        state.editingPlotId = null;
        renderInventory();
      });
    });

    // Allow Enter key to save price
    els.invTableBody.querySelectorAll(".price-input-field").forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const saveBtn = input.nextElementSibling;
          if (saveBtn) saveBtn.click();
        } else if (e.key === "Escape") {
          state.editingPlotId = null;
          renderInventory();
        }
      });
    });
  }

  // Inventory Filter Events
  els.invSearch.addEventListener("input", (e) => {
    state.inventoryFilters.search = e.target.value;
    renderInventory();
  });

  els.filterStatus.addEventListener("change", (e) => {
    state.inventoryFilters.status = e.target.value;
    renderInventory();
  });

  els.filterBlock.addEventListener("change", (e) => {
    state.inventoryFilters.block = e.target.value;
    renderInventory();
  });

  els.filterFacing.addEventListener("change", (e) => {
    state.inventoryFilters.facing = e.target.value;
    renderInventory();
  });

  els.sortPlots.addEventListener("change", (e) => {
    state.inventoryFilters.sort = e.target.value;
    renderInventory();
  });

  function resetInventoryFilters() {
    state.inventoryFilters.search = "";
    state.inventoryFilters.status = "";
    state.inventoryFilters.block = "";
    state.inventoryFilters.facing = "";
    state.inventoryFilters.sort = "plotNumber-asc";

    els.invSearch.value = "";
    els.filterStatus.value = "";
    els.filterBlock.value = "";
    els.filterFacing.value = "";
    els.sortPlots.value = "plotNumber-asc";

    renderInventory();
  }

  els.btnResetFilters.addEventListener("click", resetInventoryFilters);
  if (els.btnEmptyReset) els.btnEmptyReset.addEventListener("click", resetInventoryFilters);

  // Table header sorting
  document.querySelectorAll("#inventory-data-table th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const field = th.dataset.sort;
      const currentSort = state.inventoryFilters.sort;
      let newSort = `${field}-asc`;
      if (currentSort === `${field}-asc`) {
        newSort = `${field}-desc`;
      }
      state.inventoryFilters.sort = newSort;
      els.sortPlots.value = newSort;
      renderInventory();
    });
  });

  // Export inventory to CSV
  if (els.btnExportInventory) {
    els.btnExportInventory.addEventListener("click", () => {
      const plots = GV_DATA.getPlots();
      const headers = ["Plot Number", "Block", "Area (SqFt)", "Facing", "Road Width (Ft)", "Status", "Price (INR)", "Last Updated"];
      const rows = plots.map(p => [
        p.plotNumber,
        p.block,
        p.area,
        p.facing,
        p.roadWidthFt,
        p.status,
        p.price,
        p.lastUpdated
      ]);
      const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
      downloadFile(csv, `gv-infra-inventory-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
      showToast("Inventory exported as CSV.");
    });
  }

  /* -------------------------------------------------------------
     5. LEADS RENDERER
  ------------------------------------------------------------- */
  function getFilteredLeads() {
    let leads = GV_DATA.getLeads().slice();

    // Search
    const search = state.leadFilters.search.trim().toLowerCase();
    if (search) {
      leads = leads.filter(l => {
        return (
          (l.name && l.name.toLowerCase().includes(search)) ||
          (l.phone && l.phone.toLowerCase().includes(search)) ||
          (l.plot && String(l.plot).toLowerCase().includes(search)) ||
          (l.source && l.source.toLowerCase().includes(search))
        );
      });
    }

    // Pipeline status
    if (state.leadFilters.status) {
      leads = leads.filter(l => (l.status || "new") === state.leadFilters.status);
    }

    // Sort
    if (state.leadFilters.sort === "newest") {
      leads.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      leads.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }

    return leads;
  }

  function renderLeads() {
    const allLeads = GV_DATA.getLeads();
    const filteredLeads = getFilteredLeads();

    els.leadsCount.textContent = `Showing ${filteredLeads.length} of ${allLeads.length} enquiries`;

    if (!filteredLeads.length) {
      els.leadsTableBody.innerHTML = "";
      els.leadsEmpty.style.display = "block";
      return;
    }

    els.leadsEmpty.style.display = "none";

    els.leadsTableBody.innerHTML = filteredLeads.map(l => {
      const leadId = l.id || l.createdAt;
      const formattedDate = l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—";
      const leadMsg = `Hello ${l.name || 'Sir/Madam'}, thank you for inquiring about ${l.project || GV_DATA.project.name}. How can we assist you today?`;
      const waLink = l.phone ? GV_DATA.buildWhatsAppUrl(l.phone, leadMsg) : "#";
      const telLink = l.phone ? GV_DATA.telLink(l.phone) : "#";

      return `
        <tr data-lead-id="${leadId}">
          <td style="font-weight: 700; color: var(--admin-ink);">${escapeHtml(l.name || "Anonymous Prospect")}</td>
          <td><code>${escapeHtml(l.phone || "—")}</code></td>
          <td>${escapeHtml(l.project || GV_DATA.project.name)}</td>
          <td>${l.plot ? `<strong>Plot #${escapeHtml(l.plot)}</strong>` : '<span style="color:var(--admin-ink-muted);">General</span>'}</td>
          <td><span style="font-size: 0.74rem; color: var(--admin-ink-muted);">${formatSource(l.source)}</span></td>
          <td>${renderPipelineBadge(l.status)}</td>
          <td style="font-size: 0.74rem; color: var(--admin-ink-muted);">${formattedDate}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn-op btn-op-default btn-inspect-lead" data-id="${leadId}" style="height:26px; padding:0 8px; font-size:0.72rem;">Details</button>
            ${l.phone ? `
              <a href="${waLink}" target="_blank" rel="noopener" class="btn-op" style="background:#15803D; color:#FFF; height:26px; padding:0 8px; font-size:0.72rem; text-decoration:none; margin-left:4px;" title="WhatsApp Prospect">WA</a>
              <a href="${telLink}" class="btn-op btn-op-default" style="height:26px; padding:0 8px; font-size:0.72rem; text-decoration:none; margin-left:4px;" title="Call Prospect">Call</a>
            ` : ''}
          </td>
        </tr>
      `;
    }).join("");

    els.leadsTableBody.querySelectorAll(".btn-inspect-lead").forEach(btn => {
      btn.addEventListener("click", () => openLeadDrawer(btn.dataset.id));
    });
  }

  // Lead Filters
  els.leadsSearch.addEventListener("input", (e) => {
    state.leadFilters.search = e.target.value;
    renderLeads();
  });

  els.filterLeadStatus.addEventListener("change", (e) => {
    state.leadFilters.status = e.target.value;
    renderLeads();
  });

  els.sortLeads.addEventListener("change", (e) => {
    state.leadFilters.sort = e.target.value;
    renderLeads();
  });

  els.btnResetLeadsFilters.addEventListener("click", () => {
    state.leadFilters.search = "";
    state.leadFilters.status = "";
    state.leadFilters.sort = "newest";

    els.leadsSearch.value = "";
    els.filterLeadStatus.value = "";
    els.sortLeads.value = "newest";

    renderLeads();
  });

  if (els.btnExportLeads) {
    els.btnExportLeads.addEventListener("click", () => {
      const leads = GV_DATA.getLeads();
      downloadFile(JSON.stringify(leads, null, 2), `gv-infra-leads-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      showToast("Leads exported as JSON.");
    });
  }

  /* -------------------------------------------------------------
     6. LEAD DETAIL DRAWER
  ------------------------------------------------------------- */
  function openLeadDrawer(leadId) {
    const leads = GV_DATA.getLeads();
    const lead = leads.find(l => (l.id && l.id === leadId) || (l.createdAt && l.createdAt === leadId));
    if (!lead) return;

    state.activeLead = lead;

    els.drawerLeadName.textContent = lead.name || "Anonymous Prospect";
    els.drawerLeadId.textContent = lead.id || `LEAD-${Date.now()}`;
    els.drawerLeadPhone.textContent = lead.phone || "Not provided";
    els.drawerLeadPlot.textContent = lead.plot ? `Plot #${lead.plot}` : "General Venture Enquiry";
    els.drawerLeadProject.textContent = lead.project || GV_DATA.project.name;
    els.drawerLeadSource.textContent = formatSource(lead.source);
    els.drawerLeadDate.textContent = lead.createdAt ? new Date(lead.createdAt).toLocaleString("en-IN") : "—";
    els.drawerLeadStatusSelect.value = lead.status || "new";

    // Pipeline progress bar
    const pipeline = ['new', 'contacted', 'site_visit_booked', 'qualified', 'closed'];
    const currentStageIdx = pipeline.indexOf(lead.status || 'new');
    const pipelineTrack = document.getElementById('drawer-pipeline-track');
    if (pipelineTrack) {
      pipelineTrack.innerHTML = pipeline.map((stage, i) => {
        let cls = 'pipeline-step';
        if (i < currentStageIdx) cls += ' completed';
        else if (i === currentStageIdx) cls += ' active';
        return `<div class="${cls}" title="${formatPipeline(stage)}"></div>`;
      }).join('');
    }

    // Person-specific WhatsApp / Call action links
    if (lead.phone) {
      const leadName = lead.name || 'Sir/Madam';
      const plotRef = lead.plot ? `Plot #${lead.plot} at ` : '';
      const project = lead.project || GV_DATA.project.name;
      const msg = `Hello ${leadName}, this is GV Infra Projects. Thank you for your enquiry regarding ${plotRef}${project}. Our sales team is ready to assist you with site visit arrangements and plot details. When would be a convenient time to speak?`;
      const waUrl = GV_DATA.buildWhatsAppUrl(lead.phone, msg);
      els.drawerBtnWhatsApp.href = waUrl;
      els.drawerBtnWhatsApp.onclick = (e) => {
        e.preventDefault();
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      };
      els.drawerBtnWhatsApp.style.display = 'inline-flex';

      const telUrl = GV_DATA.telLink(lead.phone);
      els.drawerBtnCall.href = telUrl;
      els.drawerBtnCall.style.display = 'inline-flex';
    } else {
      els.drawerBtnWhatsApp.style.display = 'none';
      els.drawerBtnCall.style.display = 'none';
    }

    els.drawerBackdrop.classList.add('open');
  }

  function closeLeadDrawer() {
    els.drawerBackdrop.classList.remove("open");
    state.activeLead = null;
  }

  els.drawerCloseBtn.addEventListener("click", closeLeadDrawer);
  els.drawerBackdrop.addEventListener("click", (e) => {
    if (e.target === els.drawerBackdrop) closeLeadDrawer();
  });

  els.drawerLeadStatusSelect.addEventListener("change", (e) => {
    if (!state.activeLead) return;
    const newStatus = e.target.value;
    const id = state.activeLead.id || state.activeLead.createdAt;
    GV_DATA.updateLeadStatus(id, newStatus);
    state.activeLead.status = newStatus;
    showToast(`Lead pipeline updated to: ${formatPipeline(newStatus)}`);

    // Broadcast sync
    window.dispatchEvent(new Event("storage"));

    renderOverview();
    renderLeads();
  });

  /* -------------------------------------------------------------
     7. PRICING VIEW RENDERER
  ------------------------------------------------------------- */
  function renderPricing() {
    const plots = GV_DATA.getPlots();
    if (!plots.length) return;

    let totalValuation = 0;
    let totalSqFt = 0;
    const blockA = plots.filter(p => p.block === "A");
    const blockB = plots.filter(p => p.block === "B");

    plots.forEach(p => {
      totalValuation += p.price;
      totalSqFt += p.area;
    });

    const avgOverallRate = totalSqFt ? Math.round(totalValuation / totalSqFt) : 0;
    const avgPriceBlockA = blockA.length ? Math.round(blockA.reduce((sum, p) => sum + p.price, 0) / blockA.length) : 0;
    const avgPriceBlockB = blockB.length ? Math.round(blockB.reduce((sum, p) => sum + p.price, 0) / blockB.length) : 0;

    els.pricingMetrics.innerHTML = `
      <div class="metric-block accent-forest">
        <div class="metric-label">Avg Rate / Sq.Ft</div>
        <div class="metric-val">₹${avgOverallRate.toLocaleString("en-IN")}</div>
        <div class="metric-sub">Weighted across all 48 units</div>
      </div>
      <div class="metric-block accent-bronze">
        <div class="metric-label">Block A Avg Price</div>
        <div class="metric-val">${GV_DATA.formatINR(avgPriceBlockA)}</div>
        <div class="metric-sub">${blockA.length} plots in Block A</div>
      </div>
      <div class="metric-block accent-avail">
        <div class="metric-label">Block B Avg Price</div>
        <div class="metric-val">${GV_DATA.formatINR(avgPriceBlockB)}</div>
        <div class="metric-sub">${blockB.length} plots in Block B</div>
      </div>
      <div class="metric-block accent-sold">
        <div class="metric-label">Portfolio Valuation</div>
        <div class="metric-val">₹${(totalValuation / 10000000).toFixed(2)} Cr</div>
        <div class="metric-sub">Gross inventory value (${GV_DATA.formatINR(totalValuation)})</div>
      </div>
    `;

    // Block Breakdown
    const blocks = ["A", "B"];
    els.pricingBlockBreakdown.innerHTML = blocks.map(b => {
      const bPlots = plots.filter(p => p.block === b);
      const bTotalSqFt = bPlots.reduce((sum, p) => sum + p.area, 0);
      const bTotalVal = bPlots.reduce((sum, p) => sum + p.price, 0);
      const bAvgRate = bTotalSqFt ? Math.round(bTotalVal / bTotalSqFt) : 0;
      const prices = bPlots.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return `
        <tr>
          <td style="font-weight:700;">Block ${b}</td>
          <td class="num-col">${bPlots.length}</td>
          <td class="num-col">${bTotalSqFt.toLocaleString("en-IN")}</td>
          <td class="num-col"><strong>₹${bAvgRate.toLocaleString("en-IN")}</strong></td>
          <td class="num-col">${GV_DATA.formatINR(minPrice)}</td>
          <td class="num-col">${GV_DATA.formatINR(maxPrice)}</td>
          <td class="num-col" style="font-weight:700; color:var(--admin-forest);">${GV_DATA.formatINR(bTotalVal)}</td>
        </tr>
      `;
    }).join("");
  }

  /* -------------------------------------------------------------
     8. SETTINGS & SYSTEM DIAGNOSTICS
  ------------------------------------------------------------- */
  function renderSettings() {
    const plots = GV_DATA.getPlots();
    const leads = GV_DATA.getLeads();

    els.diagPlotsCount.textContent = `${plots.length} units`;
    els.diagLeadsCount.textContent = `${leads.length} records`;

    const plotsRaw = localStorage.getItem("gv_infra_plots_v1") || "";
    const leadsRaw = localStorage.getItem("gv_infra_leads_v1") || "";
    const totalBytes = (plotsRaw.length + leadsRaw.length) * 2; // UTF-16
    els.diagStorageSize.textContent = `~${Math.round(totalBytes / 1024)} KB`;

    els.diagLastSync.textContent = new Date().toLocaleTimeString("en-IN");

    const demo = GV_DATA.getMasterplanDemo?.();
    if (!demo) return;
    if (els.masterplanDemoName) els.masterplanDemoName.value = demo.displayName;
    if (els.masterplanDemoZoom) els.masterplanDemoZoom.value = demo.mapZoom;
    if (els.masterplanDemoScale) els.masterplanDemoScale.value = demo.overlayScale;
    if (els.masterplanDemoMode) els.masterplanDemoMode.value = demo.defaultMode;
    if (els.masterplanDemoOverlay) els.masterplanDemoOverlay.checked = demo.overlayVisible;
    if (els.masterplanDemoRoads) els.masterplanDemoRoads.checked = demo.showRoads;
    if (els.masterplanDemoOpenSpaces) els.masterplanDemoOpenSpaces.checked = demo.showOpenSpaces;
    if (els.masterplanDemoAmenities) els.masterplanDemoAmenities.checked = demo.showAmenities;
    if (els.masterplanDemoLabels) els.masterplanDemoLabels.checked = demo.showMapLabels;
    if (els.masterplanDemoControls) els.masterplanDemoControls.checked = demo.showMapControls;
  }

  function saveMasterplanDemoSettings() {
    const demo = GV_DATA.updateMasterplanDemo({
      displayName: els.masterplanDemoName?.value,
      mapZoom: els.masterplanDemoZoom?.value,
      overlayScale: els.masterplanDemoScale?.value,
      defaultMode: els.masterplanDemoMode?.value,
      overlayVisible: els.masterplanDemoOverlay?.checked,
      showRoads: els.masterplanDemoRoads?.checked,
      showOpenSpaces: els.masterplanDemoOpenSpaces?.checked,
      showAmenities: els.masterplanDemoAmenities?.checked,
      showMapLabels: els.masterplanDemoLabels?.checked,
      showMapControls: els.masterplanDemoControls?.checked
    });
    if (els.masterplanDemoSaveStatus) els.masterplanDemoSaveStatus.textContent = `Saved ${demo.displayName} demo settings.`;
    window.dispatchEvent(new Event("storage"));
    showToast("Masterplan demo presentation saved.", "success");
  }

  if (els.btnSaveMasterplanDemo) {
    els.btnSaveMasterplanDemo.addEventListener("click", saveMasterplanDemoSettings);
  }

  if (els.btnResetMasterplanDemo) {
    els.btnResetMasterplanDemo.addEventListener("click", () => {
      GV_DATA.resetMasterplanDemo();
      renderSettings();
      window.dispatchEvent(new Event("storage"));
      showToast("Masterplan demo presentation reset.", "success");
    });
  }

  // Backup download
  if (els.btnExportFullJson) {
    els.btnExportFullJson.addEventListener("click", () => {
      const backup = {
        exportedAt: new Date().toISOString(),
        system: "GV Infra Property Operations Console",
        project: GV_DATA.project,
        masterplanDemo: GV_DATA.getMasterplanDemo?.(),
        plots: GV_DATA.getPlots(),
        leads: GV_DATA.getLeads()
      };
      downloadFile(JSON.stringify(backup, null, 2), `gv-infra-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      showToast("Full backup downloaded successfully.", "success");
    });
  }

  // Sanitize / fix corrupted prices manually
  const btnSanitize = document.getElementById('btn-sanitize-prices');
  if (btnSanitize) {
    btnSanitize.addEventListener('click', () => {
      // Force reload from localStorage with sanitization pass
      GV_DATA.reloadPlots();
      refreshAll();
      showToast('Plot prices verified and sanitized.', 'success');
    });
  }

  // Reset Modal Handlers
  if (els.btnOpenResetModal) {
    els.btnOpenResetModal.addEventListener("click", () => {
      els.resetModal.classList.add("open");
    });
  }

  function closeResetModal() {
    els.resetModal.classList.remove("open");
  }

  if (els.resetModalClose) els.resetModalClose.addEventListener("click", closeResetModal);
  if (els.resetModalCancel) els.resetModalCancel.addEventListener("click", closeResetModal);

  if (els.resetModalConfirm) {
    els.resetModalConfirm.addEventListener("click", () => {
      GV_DATA.resetDemoData();
      closeResetModal();
      showToast("Demo inventory successfully restored to default state.");
      window.dispatchEvent(new Event("storage"));
      refreshAll();
    });
  }

  // ESC key handler for modals and drawers
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (els.drawerBackdrop.classList.contains("open")) closeLeadDrawer();
      if (els.resetModal.classList.contains("open")) closeResetModal();
      if (state.editingPlotId) {
        state.editingPlotId = null;
        renderInventory();
      }
    }
  });

  /* -------------------------------------------------------------
     9. CROSS-TAB STATE SYNCHRONIZATION
  ------------------------------------------------------------- */
  window.addEventListener("storage", (e) => {
    if (!e.key || e.key === "gv_infra_plots_v1" || e.key === "gv_infra_leads_v1") {
      GV_DATA.reloadPlots();
      refreshAll();
      if (els.syncBadge) {
        els.syncBadge.style.borderColor = "#10B981";
        setTimeout(() => {
          if (els.syncBadge) els.syncBadge.style.borderColor = "rgba(255, 255, 255, 0.08)";
        }, 1200);
      }
    }
  });

  /* -------------------------------------------------------------
     10. HELPERS & SEED DATA
  ------------------------------------------------------------- */
  function renderCurrentView() {
    switch (state.activeView) {
      case "overview":
        renderOverview();
        break;
      case "inventory":
        renderInventory();
        break;
      case "leads":
        renderLeads();
        break;
      case "pricing":
        renderPricing();
        break;
      case "settings":
        renderSettings();
        break;
    }
  }

  function refreshAll() {
    const plots = GV_DATA.getPlots();
    const leads = GV_DATA.getLeads();

    if (els.badgePlots) els.badgePlots.textContent = plots.length;
    if (els.badgeLeads) els.badgeLeads.textContent = leads.length;

    renderOverview();
    renderInventory();
    renderLeads();
    renderPricing();
    renderSettings();
  }

  function renderPipelineBadge(status) {
    const s = status || "new";
    const badges = {
      new: '<span class="status-pill pill-available"><span class="status-dot-sm"></span>New Enquiry</span>',
      contacted: '<span class="status-pill pill-hold"><span class="status-dot-sm"></span>Contacted</span>',
      site_visit_booked: '<span class="status-pill pill-reserved"><span class="status-dot-sm"></span>Site Visit Booked</span>',
      qualified: '<span class="status-pill pill-available"><span class="status-dot-sm"></span>Qualified</span>',
      closed: '<span class="status-pill pill-sold"><span class="status-dot-sm"></span>Closed</span>'
    };
    return badges[s] || `<span class="status-pill pill-blocked">${escapeHtml(s)}</span>`;
  }

  function formatPipeline(status) {
    const labels = {
      new: "New Enquiry",
      contacted: "Contacted",
      site_visit_booked: "Site Visit Booked",
      qualified: "Qualified",
      closed: "Closed"
    };
    return labels[status] || status;
  }

  function formatSource(source) {
    if (!source) return "Website";
    if (source === "website_3d_masterplan") return "3D Masterplan";
    if (source === "website_callback_form") return "Callback Form";
    return source.replace(/_/g, " ");
  }

  function cleanPhone(phone) {
    return GV_DATA.normalizePhone(phone);
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function seedInitialLeadsIfEmpty() {
    let leads = GV_DATA.getLeads();
    if (!leads || leads.length === 0) {
      leads = [
        {
          id: "lead-1000",
          name: "Ambavaram Tirumala Kondareddy",
          phone: "9392887268",
          project: "Stambadri Enclave",
          plot: 114,
          source: "website_3d_masterplan",
          status: "site_visit_booked",
          createdAt: new Date().toISOString()
        },
        {
          id: "lead-1001",
          name: "Ramesh Babu K.",
          phone: "+91 98480 22334",
          project: "Stambadri Enclave",
          plot: 114,
          source: "website_3d_masterplan",
          status: "site_visit_booked",
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
          id: "lead-1002",
          name: "Dr. Lakshmi Narayana",
          phone: "+91 94401 55667",
          project: "Stambadri Enclave",
          plot: 101,
          source: "website_callback_form",
          status: "contacted",
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: "lead-1003",
          name: "Venkat Rao Cherukuri",
          phone: "+91 99890 11223",
          project: "Stambadri Enclave",
          plot: 128,
          source: "website_3d_masterplan",
          status: "new",
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ];
      localStorage.setItem(GV_DATA.LEADS_KEY, JSON.stringify(leads));
    } else if (!leads.some(l => l.name === "Ambavaram Tirumala Kondareddy")) {
      leads.unshift({
        id: "lead-1000",
        name: "Ambavaram Tirumala Kondareddy",
        phone: "9392887268",
        project: "Stambadri Enclave",
        plot: 114,
        source: "website_3d_masterplan",
        status: "site_visit_booked",
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(GV_DATA.LEADS_KEY, JSON.stringify(leads));
    }
  }

  // Initial Boot
  refreshAll();
});
