# 🧪 TESTING GUIDE — REALISTIC 3D WITH 2D SYNC

## 🚀 Quick Start

### 1. Server Status
```
✅ GIS Server Running: http://localhost:3001
Status: OFFLINE (GeoJSON Cache Engine)
```

### 2. Open the 3D Viewer
**URL:** http://localhost:3001/project-3d-demo.html

**What you'll see:**
- Cesium 3D globe at Khammam location
- Ground-level plot boundaries with glowing outlines
- Satellite imagery (Google Maps) visible underneath
- Plot status indicators with subtle coloring:
  - **Green outline** = Available
  - **Amber outline** = Reserved
  - **Red outline** = Sold
  - **Gray outline** = On Hold

---

## 🎮 Interactive Features

### Click on a Plot
1. **Click anywhere on a plot boundary** in the 3D view
2. Expected result:
   - Plot boundary becomes highlighted (brighter)
   - Camera smoothly flies to focus on that plot
   - Detail panel shows plot info (size, price, etc.)

### Rotate/Pan the View
- **Left Mouse Drag** = Rotate 3D view
- **Right Mouse Drag** = Pan map
- **Scroll Wheel** = Zoom in/out
- **Double-Click** = Reset to default view

### Toggle Plot Filters
Top-right panel has filters:
- **Facing Direction** (East/West/North/South)
- **Status** (Available/Reserved/Sold/Hold)
- **Max Price** (up to ₹2,500/sq.yd)

*Filtered plots will hide from both 3D and legend*

---

## 🔄 Testing 2D-3D Sync

### Open Both Views Side-by-Side
1. **Window 1:** `http://localhost:3001/project-3d-demo.html` (3D viewer)
2. **Window 2:** `http://localhost:3001/real-land-map.html` (2D editor)

### Edit a Plot in 2D
1. **In the 2D editor window:**
   - Find the "✏️ EDIT LAND BORDER" button
   - Click it to enable border editing mode
   - **Drag any plot corner** to reshape the boundary
   - Release the mouse — border is now edited

### Watch 3D Auto-Update
1. **In the 3D viewer window:**
   - Look for the plot you just edited
   - **Within 1-2 seconds**, the 3D boundary should update
   - **Camera will fly to the edited plot** (auto-zoom)
   - **Boundary will glow brightly** for 2 seconds
   - Then fade back to normal

**Expected behavior:**
```
2D View (Edit)       3D View (Auto-Sync)
─────────────────────────────────────────
User drags corner → 3D polygon updates
                 → Camera flies to plot
                 → Boundary glows
                 → Shows updated geometry
```

---

## 📊 Key Visual Differences

### Realistic Ground-Level View
```
BEFORE (Artificial):
┌─────────────────────────────┐
│  BRIGHT GREEN SOLID BLOCK   │  ← Hides satellite
│  (15ft extruded polygon)    │
└─────────────────────────────┘

AFTER (Realistic):
┌─────────────────────────────┐
│  Satellite photo with        │  ← See trees, roads,
│  subtle green tint (15%)     │     buildings clearly
│  and GLOWING green outline   │
└─────────────────────────────┘
```

### What Changed
| Aspect | Before | After |
|--------|--------|-------|
| **Extrusion** | 15ft blocks | Ground-level (0ft) |
| **Transparency** | 80% opaque | 15% opaque |
| **Satellite** | Hidden | **100% visible** |
| **Boundaries** | Soft edges | **Glowing lines** |
| **Terrain** | Flat | **Real elevation** |

---

## 🐛 Troubleshooting

### 3D Viewer Not Loading
**Problem:** Black screen or "Loading..." forever

**Solution:**
1. Check browser console (F12 → Console tab)
2. Verify Cesium token is set (check `.env` file)
3. Try refreshing page (Ctrl+R)
4. Check server is running: `http://localhost:3001/health`

### 2D-3D Not Syncing
**Problem:** Edit plot in 2D, but 3D doesn't update

**Solution:**
1. Check both windows are on same server port (3001)
2. Check browser console for errors
3. Wait up to 2 seconds (polling interval)
4. Make sure plot has a `plot_id` in properties
5. Try clicking the plot in 3D to select it first

### Boundaries Not Visible in 3D
**Problem:** Can see satellite but no plot outlines

**Solution:**
1. Zoom out slightly (scroll wheel down)
2. Boundaries are thin glowing lines, not thick blocks
3. Look for subtle color tinting on ground
4. Try rotating view (drag mouse) to see outlines from different angle
5. Check if plots are filtered out (check filter panel)

### Performance Issues
**Problem:** 3D viewer is slow or laggy

**Solution:**
1. Reduce map zoom level (zoom out)
2. Close filter panel to free up GPU
3. Disable animation in browser (Settings)
4. Try different browser (Chrome usually faster)

---

## 📱 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| **Chrome 120+** | ✅ Full support | Best performance |
| **Firefox 121+** | ✅ Full support | Good performance |
| **Safari 17+** | ✅ Full support | Apple users |
| **Edge 120+** | ✅ Full support | Windows users |

---

## 🎯 Expected Outcome

After testing, you should see:

1. **Realistic 3D visualization**
   - ✅ Satellite photos clearly visible
   - ✅ Plot boundaries marked with glowing lines
   - ✅ Ground-level (not artificial extrusions)
   - ✅ Real terrain elevation showing through

2. **2D-3D Synchronization**
   - ✅ Edit borders in 2D
   - ✅ 3D updates automatically
   - ✅ Camera flies to edited plot
   - ✅ Boundary glows briefly

3. **User Experience**
   - ✅ Natural, photorealistic appearance
   - ✅ Clear plot boundary markers
   - ✅ Interactive plot selection
   - ✅ Real-time editing feedback

---

## 🔗 Support URLs

```
3D Viewer:       http://localhost:3001/project-3d-demo.html
2D Editor:       http://localhost:3001/real-land-map.html
Server Health:   http://localhost:3001/health
API Endpoints:   http://localhost:3001/api/v1/
```

---

## 💾 Saving Your Work

When you edit plot borders in the 2D editor:
1. Changes are stored in browser session
2. To persist changes: use database or export GeoJSON
3. See `scripts/seed_db.js` for schema

---

## 📝 Next Steps

After confirming the improvements work:

1. **If satisfied:** Use the new realistic viewer as default
2. **If want more:** Consider exploded cutaway view (subsurface layers)
3. **If want different:** Adjust colors/opacity in `js/khammam-3d-realistic.js`

---

**Questions?** Check the console (F12) for detailed logs and error messages.
