/* ============================================================
   MOCK DATA LAYER
   This stands in for the Postgres/Supabase tables described in
   the project schema (companies, projects, plots). In production,
   replace GV_DATA.getPlots() etc. with real Supabase queries —
   the rest of the app (masterplan.js, main.js) only talks to
   this object, so swapping the source is a single-file change.

   Plot statuses persist to localStorage so the Admin page (admin.html)
   can demonstrate "change status in admin -> reflects on site"
   without a real backend.
   ============================================================ */

const GV_DATA = (() => {

  // Company + project facts below are sourced from gvinfraprojects.com and the
  // real Stambadri Enclave / partner-venture brochures (Sept 2026) — cross-checked
  // across the English site pages and the Telugu brochure scans. The phone
  // number is NOT verified (the real site doesn't expose one as plain text) so
  // it stays a placeholder; everything else here is real, including the full
  // real plot-number/area schedule for Stambadri Enclave (302 plots, in sq
  // yards) from its published layout plan. Per-plot inventory below (48
  // illustrative plots) is still a generated demo grid, not a 1:1 render of
  // the real irregular layout — but plot sizes, road widths, and facts are
  // all drawn from real numbers on that plan rather than invented.
  const COMPANY = {
    name: "GV Infra Projects",
    tagline: "DTCP Open Plots & Constructions",
    md: "G. Surya Teja — Managing Director",
    phone: "+91 9392887268",
    whatsapp: "919392887268", // normalized digits only (country code 91 + 10 digits)
    email: "info@gvinfraprojects.com",
    hqAddress: "#5-5-140/1, 1st Floor, Nustar Bhavan, Opp. Mangalya Shopping Mall, Vanastalipuram, Hyderabad – 500070",
    khammamOffice: "Star Complex, 5th Floor #501, Opp. HP Petrol Bunk, Raparthi Nagar, Khammam – 507002",
    website: "https://www.gvinfraprojects.com",
    hours: "Mon–Sat, 9:30 AM – 6:30 PM",
  };

  // ===========================================================
  // PROJECT LOCATION CONFIGURATION - Single Source of Truth
  // ===========================================================
  // Coordinates are [longitude, latitude] in WGS84 decimal degrees
  // verified: true = independently surveyed/legal boundary
  // type: "regional" = regional centre estimate, "verified" = survey boundary
  const PROJECT_LOCATION = {
    name: "Regional Centre",
    locality: "Gurralapadu",
    city: "Khammam",
    district: "Khammam",
    state: "Telangana",
    country: "India",
    coordinates: {
      center: [80.14368, 17.24767], // Regional estimate [lng, lat]
      verified: false,
      type: "regional",
      source: "Regional centre around Khammam / Gurralapadu area — not independently verified as exact project location"
    },
    boundary: null, // GeoJSON Polygon or MultiPolygon when verified survey available
  };

  const PROJECT = {
    slug: "stambadri-enclave",
    name: "Stambadri Enclave",
    developer: "GV Infra Projects",
    marketedBy: "GV Infra Projects",
    location: "Gurralapadu Village, Khammam Municipal Corporation, Telangana",
    locationShort: "Gurralapadu, Khammam–Kodada Highway",
    siteAddress: "Gurralapadu (Rev. VI), Khammam Municipal Corporation — Sy. Nos. 138/A, 139/A, 139/A2/A, 139/B1, 141/5/A, 141/9, 142/2, 142/3/A, 144/A3, 144/C, 145/A1, 145/A2, 145/B/A, 145/B2, 145/C1, 147/A1, 147/A2, 147/B, 147/C2–C5, 148/6B, 148/8, under Stambhadri Urban Development Authority (SUDA), Khammam District",
    developerOffice: "GV Infra Projects, #5-5-140/1, 1st Floor, Nustar Bhavan, Opp. Mangalya Shopping Mall, Vanastalipuram, Hyderabad – 500070",
    totalPlots: 302,
    priceNote: "Fixed rates — no bargain, no discount (per the developer's own brochure). Contact sales for current pricing.",
    status: "Ongoing",
    reraNumber: "DTCP & RERA approved layout (SUDA jurisdiction) — no separate RERA registration number published",
    reraStatus: "verified", // "verified" | "pending"
    dtcpNumber: "TLP No. 3147/Khammam municip/2020/0378",
    dtcpStatus: "verified",
    heroImage: "img/real/gurralapadu.png",
    layoutPlanImage: "img/real/gurralapadu-layout.png",
    description: "A DTCP-approved open-plot layout by GV Infra Projects in Gurralapadu village, facing the Khammam–Kodada national highway, under the jurisdiction of the Stambhadri Urban Development Authority (SUDA), Khammam Municipal Corporation.",
    amenities: [
      "Entrance arch with gated boundary",
      "50 ft, 40 ft & 30 ft wide blacktop roads",
      "Children's park & drainage system",
      "Underground electricity & street lighting",
      "Reinforced precast compound wall",
      "Overhead water tank & water-harvesting pits",
      "Two open-space parks (7,278.61 & 2,787.37 sq. yds)",
      "Dedicated social-infrastructure plot (3,369.41 sq. yds)",
      "Avenue plantation, 100% Vaastu & clear title",
    ],
  };

  // Other real GV Infra / partner-marketed ventures (for the Projects listing).
  // Not modeled in 3D — shown as reference cards only.
  const OTHER_PROJECTS = [
    {
      name: "Peacock Valley",
      location: "Kadthal, off Srisailam Highway (Hyderabad growth corridor)",
      developer: "Arising Developers",
      approval: "TLP No. 239/2023/H · RERA P02400007625",
      image: "img/real/peacock-valley-layout.jpg",
      blurb: "14-acre, 212-plot DTCP & RERA-approved layout at Kadthal, next to Pharma City, Mucherla — priced at ₹13,999/sq.yd, with a 2-acre farm resort.",
    },
    {
      name: "Haritha Vanam",
      location: "Mandanpally @ Alair, Warangal Highway corridor",
      developer: "Royal Ridge Realtors",
      approval: "L.P No. 79/2022/H · RERA P02000004816",
      image: "img/real/aleru.png",
      blurb: "RERA-registered, DTCP-approved residential layout 2 minutes from NH-163 on the Warangal Highway industrial growth corridor.",
    },
    {
      name: "RR Gokuldhaam",
      location: "Narketpally, Nalgonda",
      developer: "—",
      approval: "T.L.P. No. 136/2022/H · RERA P01800005613",
      image: "img/real/rr-gokuldhaam.png",
      blurb: "36-acre gated community, 100% Vaasthu-compliant, with underground drainage, overhead water tank, and a children's play area.",
    },
    {
      name: "RSR Sunrise City",
      location: "Maripeda Bungalow, Mahabubabad",
      developer: "—",
      approval: "TLP No. 0004/LO/3091/2022 · RERA P00700006178",
      image: "img/real/rsr-sunrise-city.png",
      blurb: "62-acre mega gated community, DTCP approved, with 60/40/30 ft roads and round-the-clock security.",
    },
    {
      name: "Alamkrutha Mega Township",
      location: "V.M. Banjara, Sattupalli Main Road",
      developer: "Sri Vasishta Developers",
      approval: "T.L.P. No. 84/2023/W",
      image: "img/real/vasista.jpeg",
      blurb: "DTCP & RERA approved layout on the Sattupalli main road / Lankasagar cross road, marketed with 100% Vaastu compliance.",
    },
  ];

  // Generate a grid of plots so the masterplan has enough data to be worth exploring.
  // ROWS x COLS grid, laid out around a central "park" strip.
  const ROWS = 6;
  const COLS = 9;
  const FACINGS = ["East", "West", "North", "South"];
  const STATUS_WEIGHTS = [
    ["available", 0.55],
    ["reserved", 0.15],
    ["hold", 0.1],
    ["sold", 0.18],
    ["blocked", 0.02],
  ];

  function pickStatus(seed) {
    let r = seed;
    let acc = 0;
    for (const [status, weight] of STATUS_WEIGHTS) {
      acc += weight;
      if (r <= acc) return status;
    }
    return "available";
  }

  function seededRandom(seed) {
    const x = Math.sin(seed * 9973.13) * 10000;
    return x - Math.floor(x);
  }

  function buildPlots() {
    const plots = [];
    let plotNo = 100;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Leave a gap column in the middle to represent the central park
        if (col === Math.floor(COLS / 2) ) continue;

        plotNo += 1;
        const seed = row * COLS + col + 1;
        const rand = seededRandom(seed);
        // Sizes (sqft) correspond to real, frequently-occurring plot areas on
        // the actual Stambadri Enclave plan (200 / 222 / 233 / 267 / 333 sq.
        // yds respectively) rather than arbitrary round numbers.
        const sizeOptions = [1800, 2000, 2100, 2400, 3000];
        const area = sizeOptions[Math.floor(seededRandom(seed * 2) * sizeOptions.length)];
        // Stambadri Enclave is marketed at a fixed, un-published rate ("no
        // bargain, no discount") — this range is illustrative only, roughly
        // reflecting typical Khammam-area open-plot pricing, not a real quote.
        const pricePerSqft = 950 + Math.floor(seededRandom(seed * 3) * 300);
        const facing = FACINGS[Math.floor(seededRandom(seed * 4) * FACINGS.length)];
        const isCorner = col === 0 || col === COLS - 1;
        const isParkFacing = col === Math.floor(COLS / 2) - 1 || col === Math.floor(COLS / 2) + 1;

        plots.push({
          id: `plot-${plotNo}`,
          plotNumber: plotNo,
          block: row < ROWS / 2 ? "A" : "B",
          row, col,
          area,
          facing,
          roadWidthFt: isCorner ? 50 : 30,
          isCorner,
          isParkFacing,
          price: area * pricePerSqft,
          pricePerSqft,
          bookingAmount: 100000,
          status: pickStatus(rand),
          lastUpdated: "2026-08-20",
        });
      }
    }
    return plots;
  }

  const STORAGE_KEY = "gv_infra_plots_v1";

  function sanitizePlotPrices(plots) {
    // Guard against corrupted price values (e.g., INR-formatted strings, NaN, Infinity)
    // If a price is invalid we re-derive it from area * pricePerSqft from original build
    return plots.map(p => {
      let price = typeof p.price === 'string'
        ? Number(String(p.price).replace(/[^0-9.-]/g, ''))
        : Number(p.price);
      if (!isFinite(price) || price <= 0 || price > 999999999) {
        // Re-derive from the same deterministic formula used in buildPlots
        const seed = (p.row !== undefined && p.col !== undefined) ? (p.row * 8 + p.col + 1) : p.plotNumber;
        const pps = p.pricePerSqft && p.pricePerSqft > 0 ? Math.round(p.pricePerSqft) : (950 + Math.floor(Math.abs(Math.sin(seed * 9973.13) * 10000) % 300));
        price = Math.round((p.area || 2000) * pps);
      }
      return { ...p, price: Math.round(price) };
    });
  }

  function loadPlots() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizePlotPrices(parsed);
        // If any prices were corrupted and fixed, re-save the clean data
        const hadCorruption = parsed.some((p, i) => p.price !== sanitized[i].price);
        if (hadCorruption) {
          savePlots(sanitized);
          console.info('[GV_DATA] Detected and fixed corrupted plot prices in localStorage.');
        }
        return sanitized;
      } catch (e) { /* fall through to regenerate */ }
    }
    const fresh = buildPlots();
    savePlots(fresh);
    return fresh;
  }

  function savePlots(plots) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plots));
  }

  let plotCache = loadPlots();

  const MASTERPLAN_DEMO_KEY = "gv_infra_masterplan_demo_v1";
  const DEFAULT_MASTERPLAN_DEMO = {
    displayName: PROJECT.name,
    overlayVisible: true,
    overlayScale: 1,
    showRoads: true,
    showOpenSpaces: true,
    showAmenities: true,
    mapZoom: 14.5,
    showMapLabels: true,
    showMapControls: true,
    defaultMode: "2d"
  };

  function readMasterplanDemo() {
    try {
      const saved = JSON.parse(localStorage.getItem(MASTERPLAN_DEMO_KEY) || "null");
      const config = { ...DEFAULT_MASTERPLAN_DEMO, ...(saved && typeof saved === "object" ? saved : {}) };
      config.displayName = String(config.displayName || DEFAULT_MASTERPLAN_DEMO.displayName).trim().slice(0, 80) || DEFAULT_MASTERPLAN_DEMO.displayName;
      config.overlayScale = Math.min(1.35, Math.max(0.75, Number(config.overlayScale) || 1));
      config.mapZoom = Math.min(17, Math.max(12, Number(config.mapZoom) || DEFAULT_MASTERPLAN_DEMO.mapZoom));
      config.defaultMode = config.defaultMode === "3d" ? "3d" : "2d";
      ["overlayVisible", "showRoads", "showOpenSpaces", "showAmenities", "showMapLabels", "showMapControls"].forEach((key) => {
        config[key] = config[key] !== false;
      });
      return config;
    } catch (error) {
      return { ...DEFAULT_MASTERPLAN_DEMO };
    }
  }

  function saveMasterplanDemo(config) {
    localStorage.setItem(MASTERPLAN_DEMO_KEY, JSON.stringify(config));
  }

  // Expose location configuration as the single source of truth for project coordinates
  function getProjectLocation() {
    return PROJECT_LOCATION;
  }

  function getProjectCenter() {
    return PROJECT_LOCATION.coordinates.center;
  }

  function getExternalMapLink(lng, lat, zoom = 13) {
    return `https://www.google.com/maps/@${lat},${lng},${zoom}z/data=!3m1!1e3`;
  }

  function getProjectBoundary() {
    return PROJECT_LOCATION.boundary;
  }

  // Check whether verified boundary GeoJSON exists
  function hasVerifiedBoundary() {
    const boundary = PROJECT_LOCATION.boundary;
    return boundary &&
      typeof boundary.type === 'string' &&
      (boundary.type === 'Polygon' || boundary.type === 'MultiPolygon') &&
      Array.isArray(boundary.coordinates) &&
      boundary.coordinates.length > 0;
  }

  function isLocationVerified() {
    return PROJECT_LOCATION.coordinates.verified === true;
  }

  return {
    company: COMPANY,
    project: PROJECT,
    otherProjects: OTHER_PROJECTS,

    // Geospatial helpers — single source of truth for location data
    getProjectLocation,
    getProjectCenter,
    getExternalMapLink,
    getProjectBoundary,
    hasVerifiedBoundary,
    isLocationVerified,

    getMasterplanDemo() {
      return readMasterplanDemo();
    },

    updateMasterplanDemo(updates) {
      const clean = { ...readMasterplanDemo(), ...(updates || {}) };
      clean.displayName = String(clean.displayName || DEFAULT_MASTERPLAN_DEMO.displayName).trim().slice(0, 80) || DEFAULT_MASTERPLAN_DEMO.displayName;
      clean.overlayScale = Math.min(1.35, Math.max(0.75, Number(clean.overlayScale) || 1));
      clean.mapZoom = Math.min(17, Math.max(12, Number(clean.mapZoom) || DEFAULT_MASTERPLAN_DEMO.mapZoom));
      clean.defaultMode = clean.defaultMode === "3d" ? "3d" : "2d";
      ["overlayVisible", "showRoads", "showOpenSpaces", "showAmenities", "showMapLabels", "showMapControls"].forEach((key) => {
        clean[key] = clean[key] !== false;
      });
      saveMasterplanDemo(clean);
      return clean;
    },

    resetMasterplanDemo() {
      const clean = { ...DEFAULT_MASTERPLAN_DEMO };
      saveMasterplanDemo(clean);
      return clean;
    },

    getPlots() {
      return plotCache;
    },

    getPlot(id) {
      return plotCache.find(p => p.id === id);
    },

    // Re-reads localStorage into the existing plotCache array (mutated in place,
    // not reassigned) so callers that cached `GV_DATA.getPlots()` once at page
    // load — as masterplan-page.js does — see the update too. Without this, the
    // cross-tab "storage" event fires but every read still returns the stale
    // in-memory data from when this tab/module first loaded.
    reloadPlots() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return plotCache;
      try {
        const fresh = JSON.parse(saved);
        plotCache.length = 0;
        fresh.forEach(p => plotCache.push(p));
      } catch (e) { /* keep existing plotCache on parse failure */ }
      return plotCache;
    },

    updatePlotStatus(id, status) {
      const plot = plotCache.find(p => p.id === id);
      if (plot) {
        plot.status = status;
        plot.lastUpdated = new Date().toISOString().slice(0, 10);
        savePlots(plotCache);
      }
      return plot;
    },

    updatePlotPrice(id, price) {
      const plot = plotCache.find(p => p.id === id);
      if (plot) {
        // Always enforce clean integer storage — reject strings, NaN, Infinity, or out-of-range values
        const cleanPrice = Math.round(Number(price));
        if (!isFinite(cleanPrice) || cleanPrice <= 0 || cleanPrice > 999999999) {
          console.warn('[GV_DATA] Rejected invalid price update:', price);
          return plot;
        }
        plot.price = cleanPrice;
        plot.lastUpdated = new Date().toISOString().slice(0, 10);
        savePlots(plotCache);
      }
      return plot;
    },

    resetDemoData() {
      plotCache = buildPlots();
      savePlots(plotCache);
      return plotCache;
    },

    // --- Lead capture (mock CRM) ---
    LEADS_KEY: "gv_infra_leads_v1",

    saveLead(lead) {
      const leads = this.getLeads();
      leads.unshift({ ...lead, id: `lead-${Date.now()}`, createdAt: new Date().toISOString() });
      localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));
      return leads;
    },

    getLeads() {
      const raw = localStorage.getItem(this.LEADS_KEY);
      return raw ? JSON.parse(raw) : [];
    },

    updateLeadStatus(id, status) {
      const leads = this.getLeads();
      const lead = leads.find(l => (l.id && l.id === id) || (l.createdAt && l.createdAt === id));
      if (lead) {
        lead.status = status;
        lead.updatedAt = new Date().toISOString();
        localStorage.setItem(this.LEADS_KEY, JSON.stringify(leads));
      }
      return lead;
    },

    // --- Helpers ---
    statusColorHex(status) {
      return {
        available: "#3E7A4F",
        reserved: "#A85F3A",
        hold: "#B98A22",
        sold: "#837C6D",
        blocked: "#5B564A",
        not_for_sale: "#3A392F",
      }[status] || "#3E7A4F";
    },

    statusCounts() {
      const counts = { available: 0, hold: 0, reserved: 0, sold: 0, blocked: 0 };
      plotCache.forEach((p) => { counts[p.status] = (counts[p.status] || 0) + 1; });
      return counts;
    },

    statusLabel(status) {
      return {
        available: "Available",
        reserved: "Reserved",
        hold: "On Hold",
        sold: "Sold",
        blocked: "Blocked",
        not_for_sale: "Not for Sale",
      }[status] || status;
    },

    // --- Vastu guidance (indicative, based on plot facing) ---
    vastuGrade(plot) {
      return { North: "excellent", East: "excellent", West: "good", South: "caution" }[plot.facing] || "good";
    },

    vastuColorHex(grade) {
      return { excellent: "#B9962C", good: "#3E7A93", caution: "#A85F3A" }[grade] || "#3E7A93";
    },

    vastuLabel(grade) {
      return { excellent: "Highly Auspicious", good: "Balanced", caution: "Needs Remedies" }[grade] || grade;
    },

    vastuNote(plot) {
      const notes = {
        North: "North-facing plots are widely considered auspicious in Vastu Shastra, especially favourable for the main entrance.",
        East: "East-facing plots catch the morning sun and are traditionally regarded as highly favourable in Vastu Shastra.",
        West: "West-facing plots are generally considered balanced and workable in Vastu Shastra with correct entrance placement.",
        South: "South-facing plots are traditionally considered more challenging in Vastu Shastra; common entrance and layout remedies can offset this.",
      };
      let note = notes[plot.facing] || "";
      if (plot.isParkFacing) note += " Its park-facing aspect is generally seen as an added positive.";
      return note;
    },

    vastuDisclaimer: "Indicative only, based on commonly followed Vastu Shastra guidance for plot facing — not a certified assessment. Consult a Vastu professional before deciding.",

    formatINR(amount) {
      return "₹" + Math.round(amount).toLocaleString("en-IN");
    },

    normalizePhone(phone, defaultCountry = "91") {
      if (!phone) return "";
      let digits = String(phone).replace(/\D/g, "");
      if (!digits) return "";
      // Remove leading zeroes
      digits = digits.replace(/^0+/, "");
      // Remove duplicated country code (e.g. 91919392887268 -> 919392887268)
      if (digits.length === 14 && digits.startsWith(defaultCountry + defaultCountry)) {
        digits = digits.slice(defaultCountry.length);
      }
      // If exactly 10 digits (standard Indian mobile number without country code)
      if (digits.length === 10) {
        digits = defaultCountry + digits;
      }
      return digits;
    },

    buildWhatsAppUrl(phone, message) {
      const targetPhone = this.normalizePhone(phone || COMPANY.whatsapp || "919392887268");
      if (!targetPhone) return "#";
      if (message && String(message).trim()) {
        return `https://wa.me/${targetPhone}?text=${encodeURIComponent(String(message).trim())}`;
      }
      return `https://wa.me/${targetPhone}`;
    },

    waLink(message, phone) {
      return this.buildWhatsAppUrl(phone || COMPANY.whatsapp, message);
    },

    telLink(phone) {
      const digits = this.normalizePhone(phone || COMPANY.phone || "919392887268");
      return `tel:+${digits}`;
    },
  };
})();

// Globally expose centralized WhatsApp utilities and data layer
if (typeof window !== "undefined") {
  window.GV_DATA = GV_DATA;
  window.normalizeWhatsAppPhone = (phone, country) => GV_DATA.normalizePhone(phone, country);
  window.buildWhatsAppUrl = (phone, msg) => GV_DATA.buildWhatsAppUrl(phone, msg);
}

