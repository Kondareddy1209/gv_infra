# GV Infra Projects — Runnable MVP (HTML + Three.js)

A working, static prototype of the platform: premium homepage, a real interactive
3D masterplan you can rotate/zoom/click, a plot detail drawer with Call/WhatsApp/
Book-Visit CTAs, and a demo admin panel that shows plot changes propagating live
to the public site — no backend required to run it.

## How to run

Browsers block ES module imports (`<script type="module">`) from the local
`file://` protocol, so you need a tiny local server — no install required:

**Option A — Python (comes with most systems):**
```bash
cd gv-infra
python3 -m http.server 8000
```
Then open **http://localhost:8000** in your browser.

**Option B — Node:**
```bash
cd gv-infra
npx serve .
```

**Option C — VS Code:** install the "Live Server" extension, right-click
`index.html` → "Open with Live Server".

Three.js and MapLibre GL are loaded from a CDN (unpkg), and the satellite
imagery comes from Esri's public World Imagery tile service (attribution is
rendered on the map; no API key needed). Three.js is wired via an import map — you do need
an internet connection for the 3D to render, but there's nothing to `npm install`.

## What to click through when demoing

1. **`index.html`** — homepage, rotating 3D preview in the hero, project showcase.
2. **`project.html`** — the main feature. Rotate/zoom the masterplan, click any
   colored block to open the plot drawer (price, facing, road width, status),
   try the search box (type a plot number like `114`) and the status/facing/size
   filters in the sidebar.
3. **`admin.html`** — open this in a second tab. Change a plot's status (e.g.
   Available → Sold) or its price, then switch back to the `project.html` tab
   (or refresh it) — the 3D masterplan and plot drawer reflect the change
   immediately, because both pages read from the same data layer.
4. Try **Book a Site Visit** or the homepage **callback form**, then check the
   **Leads** tab in `admin.html` — the enquiry shows up there.

## How it's structured

```
gv-infra/
├── index.html              Homepage
├── projects.html           Projects listing
├── project.html            Project page + 3D masterplan (the core feature)
├── admin.html              Demo admin panel (plots, pricing, leads)
├── css/
│   ├── style.css           Design system (tokens, layout, components)
│   └── land-map.css        Satellite land explorer (project.html only)
└── js/
    ├── data.js             Mock data layer — ALL "database" reads/writes go
    │                       through this file (GV_DATA.*). This is the single
    │                       place to swap for real Supabase/Postgres calls.
    ├── land-map.js          Satellite land explorer: MapLibre + Esri imagery,
    │                        2D/tilted controls, label toggle, coordinate pin,
    │                        and the lazy-load switch into the 3D layout
    ├── masterplan.js        Three.js scene: plot grid, lighting, raycasting,
    │                        camera fly-to, filter/highlight API
    ├── masterplan-page.js   Wires the 3D scene to the sidebar UI + plot drawer
    ├── hero-scene.js         Lightweight decorative 3D preview for the homepage
    ├── admin.js              Renders the admin tables, writes changes back
    │                         through GV_DATA
    └── main.js               Shared behaviors (callback form)
```

## Important — this is a demo, not production

- **All plot data is generated and stored in `localStorage`** (see `js/data.js`).
  There is no real database. Clearing your browser storage resets it (or click
  "Reset demo data" in the admin panel).
- **The satellite map is centred on the Khammam *region*, not on a verified
  site boundary.** `REGION` in `js/land-map.js` is a regional coordinate, and
  the UI says so throughout. Replace it with the surveyed site pin once that is
  confirmed — and note that satellite imagery is never a legal survey or proof
  of ownership, which is why no plot boundaries are drawn over it.
- **All prices, RERA/DTCP numbers, and plot counts are placeholders.** They are
  marked as such in the UI on purpose — do not publish this data as real without
  verifying it against GV Infra's actual records first.
- **WhatsApp/Call buttons use plain `tel:` and `wa.me` links** — this is the
  "click-to-chat" pattern, not the official WhatsApp Business API. Automated
  WhatsApp flows (booking confirmations, reminders, agent routing) require a
  real backend + an official WhatsApp Business Solution Provider (e.g. Interakt,
  WATI, Gupshup) — see the earlier architecture notes for that phase.

## Natural next steps

1. Swap `js/data.js` for real Supabase (or any Postgres+REST) calls — the rest
   of the app doesn't need to change since everything already goes through
   `GV_DATA`.
2. Replace the generated plot grid with your actual surveyed layout (real
   GeoJSON polygons instead of a uniform grid) once that data is available.
3. Add Supabase Auth + Row Level Security in front of `admin.html` before this
   goes anywhere near production — right now anyone with the URL can open it.
