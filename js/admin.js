document.addEventListener("DOMContentLoaded", () => {

  // ---------- Tab switching ----------
  document.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".tab-link").forEach((l) => l.classList.remove("active"));
      document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
      link.classList.add("active");
      document.getElementById(`tab-${link.dataset.tab}`).classList.add("active");
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
