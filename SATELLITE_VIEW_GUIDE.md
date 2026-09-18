# 🛰️ Satellite View — Access & Features

## Quick Start

**Open:** `/project.html` → **Click:** "Real Satellite Map" button

---

## 📍 What You See

```
✅ Esri World Imagery (live satellite photos)
✅ 48 custom plot polygons overlaid (from custom_plots.geojson)
✅ Plot labels with number & size
✅ Color-coded by status:
   🟢 Green   = Available plots
   🟡 Gold    = Reserved plots
   ⚫ Gray     = Sold plots
✅ Interactive controls:
   • Zoom: Scroll wheel
   • Pan: Click & drag
   • Tilt: Mouse + Ctrl
   • Rotate: Ctrl + drag
```

---

## 🎮 Controls

| Action | Control | Result |
|--------|---------|--------|
| **Zoom In** | Scroll ⬆️ | Closer view |
| **Zoom Out** | Scroll ⬇️ | Wider view |
| **Pan** | Click + Drag | Move map |
| **Rotate** | Ctrl + Drag | Change bearing |
| **Tilt 3D** | Ctrl + Scroll | Elevation view |
| **Reset** | "Reset View" button | Back to default |

---

## 🗺️ Features

### **1. Road Labels**
- Road labels on/off toggle
- Shows internal roads, highways, landmarks

### **2. GPS Coordinate Input**
- Enter exact GPS coordinates: `17.2476, 80.1437`
- Paste Google Maps URL: `https://maps.google.com/?q=17.2476,80.1437`
- Quick preset pins for Khammam locations

### **3. 2D/3D Toggle**
- **2D Mode** (Default): Top-down orthographic view
- **3D Mode**: Elevated aerial perspective

### **4. Compass**
- Shows current bearing (N / NE / E / SE / S / etc.)
- Click to reset to North (0°)

### **5. Custom Plot Overlay**
- Green fill with white outline
- Plot number labels in center
- Square yardage (sqyds) displayed
- Click plot → See details in sidebar

---

## 📊 Layer Information

| Layer | Source | Type |
|-------|--------|------|
| **Satellite Imagery** | Esri World Imagery | Raster tiles |
| **Road Labels** | Esri Reference Layer | Vector labels |
| **Custom Plots** | `custom_plots.geojson` | Vector polygons |
| **Plot Labels** | GeoJSON properties | Vector text |

---

## 🔗 Data Attributes

Each plot polygon has these properties:

```json
{
  "plot_id": 1,
  "plot_number": "P-01",
  "survey_number": "45/A-01",
  "extent_sqyards": 1950,
  "price_per_sqyard": 1800,
  "total_price": 3510000,
  "facing": "West",
  "status": "reserved",
  "contact": "+91 93928 87268",
  "layout_name": "Stambadri Enclave",
  "district": "Khammam"
}
```

Access via: Click plot → Sidebar or hover tooltip

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Map not loading** | Check internet connection; Esri CDN must be accessible |
| **Plots not visible** | Zoom to level 14+ to see 30cm detail |
| **Labels missing** | Toggle "Road Labels" button on |
| **Can't click plots** | Ensure you're on the "Real Satellite Map" tab |
| **Satellite imagery blurry** | This is satellite resolution at this zoom level |

---

## 🔄 Switching Between Views

You have **4 different visualizations**:

```
┌─────────────────────────────────────────────┐
│  VIEW SWITCHER BUTTONS                      │
├─────────────────────────────────────────────┤
│ [3D Layout]  [Real Satellite Map]  [Cards]  │
│ [Terrain Globe]                             │
└─────────────────────────────────────────────┘

1. 3D Layout         → Three.js interactive 3D
2. Real Satellite   → MapLibre GL map (you are here)
3. Plot Cards       → Card-based grid view
4. Terrain Globe    → CesiumJS 3D globe
```

---

## 🎯 Use Cases

### **For Site Visitors:**
"Explore the exact land boundaries on satellite imagery"

### **For Sales Team:**
"Show clients real satellite context + plot footprints"

### **For Urban Planners:**
"Verify road access, connectivity, proximity to landmarks"

### **For Land Surveyors:**
"Compare DTCP boundaries with ground reality"

---

## 📱 Mobile Support

- ✅ Touch pan & zoom
- ✅ Responsive layout
- ⚠️ Labels may be small on mobile
- ✅ All controls functional on touch devices

---

## 🔐 Data Privacy

- Satellite imagery © Esri (public, non-sensitive)
- Custom plot data: Your own DTCP GeoJSON
- No personal data collected
- All processing client-side (no server tracking)

---

**Ready to explore? Open `project.html` and click "Real Satellite Map"! 🛰️**
