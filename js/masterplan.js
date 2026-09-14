/* ============================================================
   MASTERPLAN 3D ENGINE (Three.js) — Premium Architectural Edition
   Stambadri Enclave – GV Infra Projects

   Premium architectural visualization:
   - Warm Deccan sandstone terrain
   - Near-flat land parcels with restrained status accents
   - Hierarchical road network (main entrance / primary / secondary)
   - Muted, realistic landscaping with instanced trees
   - Architectural lighting (warm sun, controlled shadows)
   - Smooth orbit / hover / selection transitions
   - Day | Sunset | Night | Satellite environment modes
   - First-Person Street Walkthrough (WASD/Arrows)
   - Stereoscopic VR preview
   - Raycasting hover tooltip & plot selection
   - Measurement tool
   - All original public API preserved
   ============================================================ */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function initMasterplan({ canvas, onSelectPlot, onHoverPlot, onHeadingChange, homepagePresentation = false }) {
  const plots = GV_DATA.getPlots();

  // ─────────────────────────────────────────────────────────
  // Scene & Renderer
  // ─────────────────────────────────────────────────────────
  const scene = new THREE.Scene();

  // Sky & fog colours per environment — warm architectural palette
  const skyColors = {
    day:       0xE8E2D8,   // warm ivory
    sunset:    0xE8C8A0,   // amber dusk
    night:     0x0B1220,   // deep blue-black
    satellite: 0xC8C4BC,   // neutral grey (top-down)
  };
  const fogColors = {
    day:       0xDED8CC,
    sunset:    0xD8B888,
    night:     0x080E1A,
    satellite: 0xC0BCB4,
  };

  let currentEnv = "day";
  let vrMode = false;
  scene.background = new THREE.Color(skyColors.day);
  scene.fog = new THREE.FogExp2(fogColors.day, 0.006);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  // Architectural presentation angle — slightly above, clear entrance view
  camera.position.set(28, 22, 38);
  if (homepagePresentation) {
    camera.position.set(22, 20, 28);
    camera.fov = 38;
    camera.updateProjectionMatrix();
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.15;  // prevent underground view
  controls.minDistance = 5;
  controls.maxDistance = 90;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.6;

  // ─────────────────────────────────────────────────────────
  // Architectural Lighting Composition
  // ─────────────────────────────────────────────────────────
  // Hemisphere: warm sky / cool earth — mimics Deccan open sky
  const hemiLight = new THREE.HemisphereLight(0xF5EEE0, 0x3C4030, 0.72);
  scene.add(hemiLight);

  // Directional sun: warm, slightly south-west for dramatic plot shadows
  const sunLight = new THREE.DirectionalLight(0xFFF8E8, 1.05);
  sunLight.position.set(28, 40, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width  = 1024;  // balanced performance vs quality
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.left   = -40;
  sunLight.shadow.camera.right  =  40;
  sunLight.shadow.camera.top    =  40;
  sunLight.shadow.camera.bottom = -40;
  sunLight.shadow.bias = -0.0002;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  // Fill light: very soft, prevents harsh shadow undersides
  const fillLight = new THREE.AmbientLight(0xEFECE4, 0.18);
  scene.add(fillLight);

  // Streetlights collection for night illumination
  const streetLights = [];
  const activityActors = [];
  let activityVisible = true;

  // Layer toggles
  const roadMeshes     = [];
  const utilityMeshes  = [];
  const buildingMeshes = [];

  function setLayerVisible(layer, visible) {
    const layers = { roads: roadMeshes, utilities: utilityMeshes, buildings: buildingMeshes };
    (layers[layer] || []).forEach((mesh) => { mesh.visible = visible; });
  }

  // ─────────────────────────────────────────────────────────
  // Environment Mode Switching
  // ─────────────────────────────────────────────────────────
  function setEnvironmentMode(mode) {
    const wasSatellite = currentEnv === "satellite";
    currentEnv = mode;
    scene.background.set(skyColors[mode] ?? skyColors.day);
    scene.fog.color.set(fogColors[mode] ?? fogColors.day);

    if (mode === "day") {
      hemiLight.color.setHex(0xF5EEE0);
      hemiLight.groundColor.setHex(0x3C4030);
      hemiLight.intensity = 0.72;
      sunLight.color.setHex(0xFFF8E8);
      sunLight.intensity = 1.05;
      sunLight.position.set(28, 40, 20);
      fillLight.intensity = 0.18;
      streetLights.forEach(l => {
        l.light.intensity = 0;
        l.bulb.material.emissive.setHex(0x181412);
      });
    } else if (mode === "sunset") {
      hemiLight.color.setHex(0xF0A87A);
      hemiLight.groundColor.setHex(0x2A1E12);
      hemiLight.intensity = 0.58;
      sunLight.color.setHex(0xFFAA58);
      sunLight.intensity = 1.15;
      sunLight.position.set(48, 12, -28);
      fillLight.intensity = 0.12;
      streetLights.forEach(l => {
        l.light.intensity = 1.0;
        l.bulb.material.emissive.setHex(0xFFBB66);
      });
    } else if (mode === "night") {
      hemiLight.color.setHex(0x1A2540);
      hemiLight.groundColor.setHex(0x0E1520);
      hemiLight.intensity = 0.22;
      sunLight.color.setHex(0x3A4F72);
      sunLight.intensity = 0.15;
      sunLight.position.set(-18, 38, -22);
      fillLight.intensity = 0.08;
      streetLights.forEach(l => {
        l.light.intensity = 2.0;
        l.bulb.material.emissive.setHex(0xFFF0B8);
      });
    } else if (mode === "satellite") {
      hemiLight.color.setHex(0xE8E8E8);
      hemiLight.groundColor.setHex(0x303828);
      hemiLight.intensity = 1.0;
      sunLight.color.setHex(0xFFFFFF);
      sunLight.intensity = 1.2;
      sunLight.position.set(8, 80, 8);
      fillLight.intensity = 0.28;
      streetLights.forEach(l => {
        l.light.intensity = 0;
        l.bulb.material.emissive.setHex(0x181412);
      });
    }

    if (mode === "satellite") {
      if (isWalkMode) toggleWalkMode(false);
      flyToTopDown();
    } else if (wasSatellite) {
      animateCameraTo(new THREE.Vector3(0, 0, 0));
    }
  }

  function flyToTopDown() {
    const startTarget = controls.target.clone();
    const startCam    = camera.position.clone();
    const endTarget   = new THREE.Vector3(0, 0, 0);
    const endCam      = new THREE.Vector3(0.5, 72, 0.5);
    const duration    = 900;
    const startTime   = performance.now();

    if (flyAnim) cancelAnimationFrame(flyAnim);
    function step(now) {
      const t    = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startCam, endCam, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();
      if (t < 1) flyAnim = requestAnimationFrame(step);
    }
    flyAnim = requestAnimationFrame(step);
  }

  // ─────────────────────────────────────────────────────────
  // Texture Generation — Warm Architectural Palette
  // ─────────────────────────────────────────────────────────

  /** Deccan sandstone / dry earth ground — warm ivory with subtle variation */
  function createGroundTexture() {
    const cnv = document.createElement("canvas");
    cnv.width = 512; cnv.height = 512;
    const ctx = cnv.getContext("2d");
    // Base: warm sandstone
    ctx.fillStyle = "#DDD8CC";
    ctx.fillRect(0, 0, 512, 512);
    // Subtle gravel/earth variation
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random();
      ctx.fillStyle = r > 0.6
        ? `rgba(195,185,170,${0.15 + Math.random() * 0.2})`
        : `rgba(215,208,195,${0.1 + Math.random() * 0.15})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 14);
    return tex;
  }

  /** Blacktop road — dark asphalt with subtle centre line markings */
  function createRoadTexture() {
    const cnv = document.createElement("canvas");
    cnv.width = 128; cnv.height = 256;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#3C3A36";
    ctx.fillRect(0, 0, 128, 256);
    // Asphalt grain
    ctx.fillStyle = "#2E2C28";
    for (let i = 0; i < 1200; i++) {
      ctx.fillRect(Math.random() * 128, Math.random() * 256, 1 + Math.random(), 1 + Math.random());
    }
    // Centre dashes (thin, ivory-white)
    ctx.fillStyle = "rgba(235,230,215,0.55)";
    for (let y = 10; y < 256; y += 36) {
      ctx.fillRect(61, y, 6, 18);
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 12);
    return tex;
  }

  /** Secondary / service road — plain asphalt, no markings */
  function createServiceRoadTexture() {
    const cnv = document.createElement("canvas");
    cnv.width = 64; cnv.height = 64;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#464340";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#3A3835";
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  // ─────────────────────────────────────────────────────────
  // Shared Geometry + Material Cache
  // ─────────────────────────────────────────────────────────
  const _geoCache = new Map();
  const _matCache = new Map();

  function cachedGeo(key, factory) {
    if (!_geoCache.has(key)) _geoCache.set(key, factory());
    return _geoCache.get(key);
  }
  function cachedMat(key, factory) {
    if (!_matCache.has(key)) _matCache.set(key, factory());
    return _matCache.get(key);
  }

  // ─────────────────────────────────────────────────────────
  // Ground & Terrain
  // ─────────────────────────────────────────────────────────
  const groundTex = createGroundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 140),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // Off-site parcels — slightly darker earth hints at context outside boundary
  const offSiteMat = cachedMat("offsite", () =>
    new THREE.MeshStandardMaterial({ color: 0xC8BFB0, roughness: 1, metalness: 0 })
  );
  [[-58, -32, 28, 18], [55, 30, 32, 20], [-55, 35, 26, 16]].forEach(([x, z, w, d]) => {
    const parcel = new THREE.Mesh(new THREE.PlaneGeometry(w, d), offSiteMat);
    parcel.rotation.x = -Math.PI / 2;
    parcel.position.set(x, -0.01, z);
    scene.add(parcel);
  });

  // ─────────────────────────────────────────────────────────
  // Layout Mathematics
  // ─────────────────────────────────────────────────────────
  const ROWS = 6, COLS = 9;
  const cellW = 3.6, cellD = 3.2;
  const gapX  = 0.7, gapZ  = 0.9;   // slightly wider for roads
  const gridW = COLS * (cellW + gapX);
  const gridD = ROWS * (cellD + gapZ);
  const originX = -gridW / 2;
  const originZ = -gridD / 2;

  function plotPosition(plot) {
    const x = originX + plot.col * (cellW + gapX) + cellW / 2;
    const z = originZ + plot.row * (cellD + gapZ) + cellD / 2;
    return { x, z };
  }

  // ─────────────────────────────────────────────────────────
  // Road Network — Hierarchical
  // ─────────────────────────────────────────────────────────
  const roadTex = createRoadTexture();
  const svcRoadTex = createServiceRoadTexture();

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.88,
    metalness: 0,
  });
  const svcRoadMat = new THREE.MeshStandardMaterial({
    map: svcRoadTex,
    roughness: 0.92,
    metalness: 0,
  });
  const curbMat = cachedMat("curb", () =>
    new THREE.MeshStandardMaterial({ color: 0xB8B0A2, roughness: 0.8, metalness: 0 })
  );

  // Horizontal roads (between rows of plots)
  for (let row = 0; row <= ROWS; row++) {
    const z = originZ + row * (cellD + gapZ) - gapZ / 2;
    // Road hierarchy: entrance (row 0) is main 50ft, mid-row is 40ft, others 30ft
    const isMain     = row === 0 || row === ROWS;
    const isMid      = row === Math.floor(ROWS / 2);
    const roadWidth  = isMain ? 1.1 : isMid ? 0.9 : 0.72;

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(gridW + 10, roadWidth),
      isMain ? roadMat : svcRoadMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.015, z);
    road.receiveShadow = true;
    scene.add(road);
    roadMeshes.push(road);

    // Curbs — thin precise strips
    const curbH = 0.04;
    const curbD = 0.07;
    const curbGeo = cachedGeo(`curb-${gridW}`, () =>
      new THREE.BoxGeometry(gridW + 10, curbH, curbD)
    );
    const c1 = new THREE.Mesh(curbGeo, curbMat);
    c1.position.set(0, curbH / 2, z - roadWidth / 2 - curbD / 2);
    const c2 = new THREE.Mesh(curbGeo, curbMat);
    c2.position.set(0, curbH / 2, z + roadWidth / 2 + curbD / 2);
    scene.add(c1, c2);
    roadMeshes.push(c1, c2);

    // Streetlight posts at main and mid roads only
    if (isMain || isMid) {
      const xPositions = [-gridW / 2 - 1.8, 0, gridW / 2 + 1.8];
      xPositions.forEach(xp => {
        const pole = makeStreetLight();
        pole.position.set(xp, 0, z - roadWidth / 2 - 0.25);
        scene.add(pole);
        utilityMeshes.push(pole);
      });
    }
  }

  // Vertical spine road (main entrance axis — runs south-north through centre)
  const spineRoad = new THREE.Mesh(
    new THREE.PlaneGeometry(gapX * 1.2, gridD + 12),
    roadMat
  );
  spineRoad.rotation.x = -Math.PI / 2;
  spineRoad.position.set(0, 0.016, 0);
  spineRoad.receiveShadow = true;
  scene.add(spineRoad);
  roadMeshes.push(spineRoad);

  // Side service lanes
  [-gridW / 2 - 1.6, gridW / 2 + 1.6].forEach(x => {
    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, gridD + 8),
      svcRoadMat
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.014, 0);
    lane.receiveShadow = true;
    scene.add(lane);
    roadMeshes.push(lane);
  });

  // ─────────────────────────────────────────────────────────
  // Streetlight Post
  // ─────────────────────────────────────────────────────────
  function makeStreetLight() {
    const group = new THREE.Group();

    const poleMat = cachedMat("pole", () =>
      new THREE.MeshStandardMaterial({ color: 0x1A1818, metalness: 0.75, roughness: 0.35 })
    );
    const pole = new THREE.Mesh(
      cachedGeo("poleGeo", () => new THREE.CylinderGeometry(0.035, 0.055, 2.4, 7)),
      poleMat
    );
    pole.position.y = 1.2;
    pole.castShadow = true;

    const arm = new THREE.Mesh(
      cachedGeo("armGeo", () => new THREE.BoxGeometry(0.28, 0.035, 0.035)),
      poleMat
    );
    arm.position.set(0.1, 2.32, 0);

    const bulb = new THREE.Mesh(
      cachedGeo("bulbGeo", () => new THREE.SphereGeometry(0.07, 7, 7)),
      new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        emissive: 0x181412,
        emissiveIntensity: 1,
      })
    );
    bulb.position.set(0.2, 2.27, 0);

    const light = new THREE.PointLight(0xFFF5D6, 0, 7);
    light.position.set(0.2, 2.22, 0);

    group.add(pole, arm, bulb, light);
    streetLights.push({ light, bulb });
    return group;
  }

  // ─────────────────────────────────────────────────────────
  // Central Park & Landscaping
  // ─────────────────────────────────────────────────────────
  const parkW = cellW * 0.92;

  // Park base — muted sage green
  const parkMat = cachedMat("park", () =>
    new THREE.MeshStandardMaterial({ color: 0x3A6438, roughness: 0.85, metalness: 0 })
  );
  const park = new THREE.Mesh(
    new THREE.BoxGeometry(parkW, 0.06, gridD),
    parkMat
  );
  park.position.set(0, 0.03, 0);
  park.receiveShadow = true;
  scene.add(park);

  // Park inner paths (warm ivory gravel)
  const pathMat = cachedMat("path", () =>
    new THREE.MeshStandardMaterial({ color: 0xD4C8B0, roughness: 0.9, metalness: 0 })
  );
  [-1.1, 1.1].forEach(x => {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, gridD - 0.6),
      pathMat
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.07, 0);
    scene.add(path);
  });

  // Central Fountain — restrained grey marble
  const fountainGroup = new THREE.Group();
  const fBaseMat = cachedMat("fBase", () =>
    new THREE.MeshStandardMaterial({ color: 0xC8C2B8, roughness: 0.55, metalness: 0.05 })
  );
  const fWaterMat = cachedMat("fWater", () =>
    new THREE.MeshStandardMaterial({ color: 0x3A7AB8, roughness: 0.08, metalness: 0.7 })
  );
  const fBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.92, 0.25, 16), fBaseMat
  );
  fBase.position.set(0, 0.125, 0);
  fountainGroup.add(fBase);

  const fWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.16, 16), fWaterMat
  );
  fWater.position.set(0, 0.21, 0);
  fountainGroup.add(fWater);
  scene.add(fountainGroup);

  // Site label (Central Green)
  scene.add(makeSiteLabel("CENTRAL GREEN", 0, 2.4, 2.6));

  // ─────────────────────────────────────────────────────────
  // Instanced Trees — efficient landscaping
  // ─────────────────────────────────────────────────────────
  // Canopy instancing: use a single InstancedMesh for all park-side canopies
  const treeCanopyGeo  = new THREE.IcosahedronGeometry(0.52, 0);
  const treeCanopyMat  = new THREE.MeshStandardMaterial({
    color: 0x2D5E2A,
    roughness: 0.88,
    metalness: 0,
    flatShading: true,   // gives a subtle faceted architectural look
  });
  const treeTrunkMat   = cachedMat("trunk", () =>
    new THREE.MeshStandardMaterial({ color: 0x5A3D28, roughness: 0.92 })
  );
  const treeTrunkGeo   = cachedGeo("trunkGeo", () =>
    new THREE.CylinderGeometry(0.055, 0.085, 0.75, 6)
  );

  // Collect tree transforms for instancing
  const treePositions = [];
  for (let z = -gridD / 2 + 1.5; z <= gridD / 2 - 1.5; z += 2.6) {
    if (Math.abs(z) < 1.0) continue;
    treePositions.push({ x: -parkW * 0.72, z });
    treePositions.push({ x:  parkW * 0.72, z });
  }

  // Additional roadside trees along entrance
  for (let x = -gridW / 2 + 1; x <= gridW / 2 - 1; x += 4.5) {
    treePositions.push({ x, z: originZ - 5.8 });
  }

  const treeCount = treePositions.length;
  const treeInstancedMesh = new THREE.InstancedMesh(treeCanopyGeo, treeCanopyMat, treeCount);
  treeInstancedMesh.castShadow = true;
  treeInstancedMesh.receiveShadow = false;

  const _dummy = new THREE.Object3D();
  treePositions.forEach((pos, i) => {
    const scale = 0.85 + Math.sin(i * 7.3) * 0.2;
    _dummy.position.set(pos.x, 0.82 + scale * 0.12, pos.z);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    treeInstancedMesh.setMatrixAt(i, _dummy.matrix);
  });
  treeInstancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(treeInstancedMesh);

  // Trunks (small, share a BoxGeometry for near-trunks)
  treePositions.slice(0, Math.min(treeCount, 24)).forEach(pos => {
    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.set(pos.x, 0.375, pos.z);
    trunk.castShadow = true;
    scene.add(trunk);
  });

  // Benches in park — minimal
  const benchMat = cachedMat("bench", () =>
    new THREE.MeshStandardMaterial({ color: 0x7A5E38, roughness: 0.82 })
  );
  const benchGeo = cachedGeo("benchGeo", () => new THREE.BoxGeometry(0.55, 0.12, 0.22));
  for (let z = -gridD / 2 + 2.5; z < gridD / 2 - 2; z += 5) {
    if (Math.abs(z) < 0.8) continue;
    [-1.0, 1.0].forEach(x => {
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(x, 0.1, z);
      bench.rotation.y = x > 0 ? Math.PI : 0;
      scene.add(bench);
    });
  }

  // ─────────────────────────────────────────────────────────
  // Site Label Sprite Helper
  // ─────────────────────────────────────────────────────────
  function makeSiteLabel(text, x, z, width = 3.0) {
    const cnv = document.createElement("canvas");
    cnv.width = 512; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = "rgba(20, 54, 40, 0.82)";
    ctx.beginPath();
    ctx.roundRect(16, 22, 480, 84, 6);
    ctx.fill();
    ctx.fillStyle = "#E8D8A0";
    ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), transparent: true })
    );
    sprite.position.set(x, 1.1, z);
    sprite.scale.set(width, width * 0.25, 1);
    return sprite;
  }

  // ─────────────────────────────────────────────────────────
  // Entrance Arch — Refined
  // ─────────────────────────────────────────────────────────
  function makeEntranceArch() {
    const g = new THREE.Group();

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xDDD4C0,
      roughness: 0.6,
      metalness: 0.03,
    });

    // Pillars
    const pillarGeo = cachedGeo("pillar", () => new THREE.BoxGeometry(0.55, 3.6, 0.55));
    const p1 = new THREE.Mesh(pillarGeo, pillarMat);
    p1.position.set(-3.6, 1.8, originZ - 4.5);
    p1.castShadow = true;

    const p2 = new THREE.Mesh(pillarGeo, pillarMat);
    p2.position.set(3.6, 1.8, originZ - 4.5);
    p2.castShadow = true;

    // Beam
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(8.0, 0.42, 0.45),
      pillarMat
    );
    beam.position.set(0, 3.38, originZ - 4.5);
    beam.castShadow = true;

    // Cap details on pillars
    const capGeo = cachedGeo("pillarCap", () => new THREE.BoxGeometry(0.68, 0.12, 0.68));
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xC8B89A,
      roughness: 0.55,
      metalness: 0.08,
    });
    [p1, p2].forEach(p => {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.copy(p.position).add(new THREE.Vector3(0, 1.86, 0));
      g.add(cap);
    });

    // Signboard — dark forest with gold text
    const cnv = document.createElement("canvas");
    cnv.width = 640; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#143628";
    ctx.fillRect(0, 0, 640, 128);
    // Subtle border line
    ctx.strokeStyle = "#C49E4F";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 624, 112);
    ctx.fillStyle = "#C49E4F";
    ctx.font = "600 36px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GV INFRA  ·  STAMBADRI ENCLAVE", 320, 64);
    const signMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cnv) });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 1.0), signMat);
    sign.position.set(0, 3.38, originZ - 4.27);

    // Forecourt paving in front of gate
    const courtMat = cachedMat("court", () =>
      new THREE.MeshStandardMaterial({ color: 0xCCC4B4, roughness: 0.88, metalness: 0 })
    );
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 4.0),
      courtMat
    );
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, 0.01, originZ - 6.5);
    g.add(court);

    g.add(p1, p2, beam, sign);
    return g;
  }
  scene.add(makeEntranceArch());

  // ─────────────────────────────────────────────────────────
  // Boundary Walls — Limestone tone
  // ─────────────────────────────────────────────────────────
  const wallMat = cachedMat("wall", () =>
    new THREE.MeshStandardMaterial({ color: 0xCDC5B4, roughness: 0.82, metalness: 0 })
  );
  const wallY = 0.45, wallH = 0.90;

  const nWall = new THREE.Mesh(new THREE.BoxGeometry(gridW + 10, wallH, 0.18), wallMat);
  nWall.position.set(0, wallY, originZ - 5.5);
  const sWall = new THREE.Mesh(new THREE.BoxGeometry(gridW + 10, wallH, 0.18), wallMat);
  sWall.position.set(0, wallY, -originZ + 5.5);
  const wWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, wallH, gridD + 11.0), wallMat);
  wWall.position.set(-gridW / 2 - 4.5, wallY, 0);
  const eWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, wallH, gridD + 11.0), wallMat);
  eWall.position.set(gridW / 2 + 4.5, wallY, 0);
  scene.add(nWall, sWall, wWall, eWall);

  // Wall top cap — thin bronze-toned strip
  const wallCapMat = cachedMat("wallCap", () =>
    new THREE.MeshStandardMaterial({ color: 0xB8A888, roughness: 0.6, metalness: 0.08 })
  );
  const nCap = new THREE.Mesh(new THREE.BoxGeometry(gridW + 10, 0.04, 0.22), wallCapMat);
  nCap.position.set(0, wallY + wallH / 2 + 0.02, originZ - 5.5);
  const sCap = nCap.clone(); sCap.position.z = -originZ + 5.5;
  scene.add(nCap, sCap);

  // ─────────────────────────────────────────────────────────
  // Clubhouse & Swimming Pool — Restrained
  // ─────────────────────────────────────────────────────────
  function makeClubhouse() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xF0EBE0,
      roughness: 0.52,
      metalness: 0,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4A3D30,
      roughness: 0.72,
      metalness: 0,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.6, 4.8), bodyMat);
    body.position.set(gridW / 2 + 5.8, 1.3, 0);
    body.castShadow = true;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.28, 5.4), roofMat);
    roof.position.set(gridW / 2 + 5.8, 2.74, 0);
    roof.castShadow = true;

    // Pool deck
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xD8D0C0, roughness: 0.42 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.08, 4.2), deckMat);
    deck.position.set(gridW / 2 + 5.8, 0.04, -6.0);

    // Pool water
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2E7AB0,
      roughness: 0.06,
      metalness: 0.75,
    });
    const pool = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.8), waterMat);
    pool.position.set(gridW / 2 + 5.8, 0.07, -6.0);

    g.add(body, roof, deck, pool);
    g.add(makeSiteLabel("CLUBHOUSE", gridW / 2 + 5.8, -2.0, 2.2));
    return g;
  }
  const clubhouse = makeClubhouse();
  scene.add(clubhouse);
  buildingMeshes.push(clubhouse);

  // ─────────────────────────────────────────────────────────
  // North Compass Marker
  // ─────────────────────────────────────────────────────────
  function makeCompassMarker() {
    const group = new THREE.Group();
    const baseMat = cachedMat("compassBase", () =>
      new THREE.MeshStandardMaterial({ color: 0xD8D0C4, roughness: 0.7 })
    );
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.36, 0.07, 18),
      baseMat
    );
    base.position.y = 0.035;
    group.add(base);

    const poleMat = cachedMat("compassPole", () =>
      new THREE.MeshStandardMaterial({ color: 0x1A1818 })
    );
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.5, 7),
      poleMat
    );
    pole.position.y = 0.75;
    pole.castShadow = true;
    group.add(pole);

    const cnv = document.createElement("canvas");
    cnv.width = 96; cnv.height = 96;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#C02828";
    ctx.font = "bold 72px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 48, 48);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv) }));
    sp.position.y = 1.7;
    sp.scale.set(0.9, 0.9, 1);
    group.add(sp);

    return group;
  }
  const compass = makeCompassMarker();
  compass.position.set(0, 0, originZ - 3.2);
  scene.add(compass);

  // ─────────────────────────────────────────────────────────
  // Plot Material System
  // ─────────────────────────────────────────────────────────
  // Status → base material color (restrained earth tones)
  const PLOT_BASE_COLORS = {
    available:   0xD0C8B8,  // warm sandstone — open land
    reserved:    0xC8B898,  // slightly warmer, slightly tanned
    hold:        0xC4BAA0,  // muted ochre
    sold:        0xB8ACA0,  // warm taupe — occupied
    blocked:     0xA8A098,  // neutral grey
    not_for_sale:0x9C9890,
  };

  // Status accent color (thin strip on top of slab)
  const STATUS_ACCENT_HEX = {
    available:    0x2E6E45,  // forest green
    reserved:     0xA65B2E,  // terracotta
    hold:         0xB58A1C,  // ochre-gold
    sold:         0x6A6358,  // neutral dark
    blocked:      0x4A4540,
    not_for_sale: 0x3C3830,
  };

  function colorForPlot(plot) {
    if (colorMode === "vastu") {
      const hex = GV_DATA.vastuColorHex(GV_DATA.vastuGrade(plot));
      return new THREE.Color(hex);
    }
    const hexStr = GV_DATA.statusColorHex(plot.status);
    // Map GV_DATA color strings to architectural palette
    return new THREE.Color(PLOT_BASE_COLORS[plot.status] ?? PLOT_BASE_COLORS.available);
  }

  function accentColorForPlot(plot) {
    if (colorMode === "vastu") return new THREE.Color(GV_DATA.vastuColorHex(GV_DATA.vastuGrade(plot)));
    return new THREE.Color(STATUS_ACCENT_HEX[plot.status] ?? STATUS_ACCENT_HEX.available);
  }

  // ─────────────────────────────────────────────────────────
  // Villa / House Model (for sold/reserved plots)
  // ─────────────────────────────────────────────────────────
  function createVillaModel(cW, cD) {
    const vg = new THREE.Group();
    const w = cW * 0.7, d = cD * 0.62, h = 0.95;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xF0EBE2, roughness: 0.55, metalness: 0 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8A3C28, roughness: 0.72, metalness: 0 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x90B8C8, roughness: 0.1, metalness: 0.45 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    body.position.y = h / 2 + 0.05;
    body.castShadow = true;

    const roofCone = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.72, 0.58, 4),
      roofMat
    );
    roofCone.rotation.y = Math.PI / 4;
    roofCone.position.y = h + 0.32;
    roofCone.castShadow = true;

    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), glassMat);
    win.position.set(0, 0.6, d / 2 + 0.005);

    const porch = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.48, 0.07, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xD4CCB8, roughness: 0.68 })
    );
    porch.position.set(0, 0.07, d / 2 + 0.13);

    vg.add(body, roofCone, win, porch);
    return vg;
  }

  // ─────────────────────────────────────────────────────────
  // Plot Label Sprite — Clean, Unobtrusive
  // ─────────────────────────────────────────────────────────
  function createPlotLabelSprite(plotNo) {
    const cnv = document.createElement("canvas");
    cnv.width = 96; cnv.height = 48;
    const ctx = cnv.getContext("2d");
    ctx.clearRect(0, 0, 96, 48);
    // Warm ivory pill
    ctx.fillStyle = "rgba(250, 248, 244, 0.92)";
    ctx.beginPath();
    ctx.roundRect(4, 4, 88, 40, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(140, 128, 110, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#10191E";
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(plotNo), 48, 24);

    const tex = new THREE.CanvasTexture(cnv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.1, 0.55, 1);
    return sprite;
  }

  // ─────────────────────────────────────────────────────────
  // Plot Geometry Construction
  // ─────────────────────────────────────────────────────────
  const plotMeshes   = new Map();
  const accentMeshes = new Map();  // thin status accent strips
  const plotGroup    = new THREE.Group();
  const labelSprites = new Map();
  let showPlotLabels = true;
  let colorMode      = "status";

  // Shared plot edge geometry
  const plotEdgeMat = cachedMat("plotEdge", () =>
    new THREE.LineBasicMaterial({
      color: 0x8A7E6A,
      transparent: true,
      opacity: 0.28,
    })
  );

  plots.forEach((plot) => {
    const container = new THREE.Group();
    const { x, z } = plotPosition(plot);
    container.position.set(x, 0, z);

    // Near-flat land parcel slab
    const slabH = plot.status === "sold" || plot.status === "reserved" ? 0.06 : 0.07;
    const geo = new THREE.BoxGeometry(cellW - 0.05, slabH, cellD - 0.05);
    const mat = new THREE.MeshStandardMaterial({
      color: colorForPlot(plot),
      roughness: 0.85,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = slabH / 2;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.plotId   = plot.id;
    mesh.userData.baseColor = mat.color.clone();
    mesh.userData.slabH    = slabH;

    // Boundary edge lines
    const edges    = new THREE.EdgesGeometry(geo);
    const edgeLine = new THREE.LineSegments(edges, plotEdgeMat);
    edgeLine.position.y = slabH / 2;
    container.add(mesh, edgeLine);

    // Thin accent strip on top — communicates availability with colour restraint
    const accentH    = 0.025;
    const accentGeo  = new THREE.BoxGeometry(cellW - 0.05, accentH, cellD - 0.05);
    const accentMat  = new THREE.MeshStandardMaterial({
      color: accentColorForPlot(plot),
      roughness: 0.7,
      metalness: 0.05,
    });
    const accentMesh = new THREE.Mesh(accentGeo, accentMat);
    accentMesh.position.y = slabH + accentH / 2;
    container.add(accentMesh);
    accentMeshes.set(plot.id, accentMesh);

    // Villa on sold/reserved
    if (plot.status === "sold" || plot.status === "reserved") {
      const villa = createVillaModel(cellW, cellD);
      container.add(villa);
      buildingMeshes.push(villa);
    }

    // Floating plot number label
    const label = createPlotLabelSprite(plot.plotNumber);
    label.position.y = slabH + 0.9;
    container.add(label);
    labelSprites.set(plot.id, label);

    plotGroup.add(container);
    plotMeshes.set(plot.id, mesh);
  });
  scene.add(plotGroup);

  // ─────────────────────────────────────────────────────────
  // Site Activity — Walkers & Cars
  // ─────────────────────────────────────────────────────────
  function makeHuman(shirtColor = 0x4A6A5A) {
    const person = new THREE.Group();
    const skinMat   = cachedMat("skin", () => new THREE.MeshStandardMaterial({ color: 0x8B5A3C, roughness: 0.8 }));
    const fabricMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
    const legMat    = cachedMat("legs", () => new THREE.MeshStandardMaterial({ color: 0x2C3A42, roughness: 0.9 }));

    const body      = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.3, 7), fabricMat);
    body.position.y = 0.43;
    const head      = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 7), skinMat);
    head.position.y = 0.65;
    const legGeo    = new THREE.CylinderGeometry(0.033, 0.038, 0.26, 5);
    const lL        = new THREE.Mesh(legGeo, legMat);
    lL.position.set(-0.05, 0.13, 0);
    const lR        = new THREE.Mesh(legGeo, legMat);
    lR.position.set(0.05, 0.13, 0);

    person.add(body, head, lL, lR);
    person.userData.leftLeg  = lL;
    person.userData.rightLeg = lR;
    return person;
  }

  function makeMovingCar(color = 0x3A4A58) {
    const car     = new THREE.Group();
    const paint   = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 });
    const glass   = new THREE.MeshStandardMaterial({ color: 0x8AAAB8, metalness: 0.5, roughness: 0.12 });
    const tyreMat = cachedMat("tyre", () => new THREE.MeshStandardMaterial({ color: 0x1E2226, roughness: 0.92 }));

    const base  = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.82), paint);
    base.position.y = 0.15;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.4), glass);
    cabin.position.set(0, 0.32, -0.02);
    car.add(base, cabin);

    const tyrGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.048, 7);
    [-0.21, 0.21].forEach(xp => [-0.25, 0.25].forEach(zp => {
      const w = new THREE.Mesh(tyrGeo, tyreMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(xp, 0.08, zp);
      car.add(w);
    }));
    return car;
  }

  function addActivityActor(actor, path, speed, phase = 0, kind = "walker") {
    actor.userData = { ...actor.userData, path, speed, phase, kind };
    activityActors.push(actor);
    scene.add(actor);
  }

  function createSiteActivity() {
    const pStart = -gridD / 2 + 1, pEnd = gridD / 2 - 1;
    // Neutral, architectural shirt tones
    addActivityActor(makeHuman(0x5A6E62), { axis: "z", fixed: -1.1, start: pStart, end: pEnd }, 0.050, 0.04);
    addActivityActor(makeHuman(0x3E4E5A), { axis: "z", fixed:  1.1, start: pStart, end: pEnd }, 0.038, 0.46);
    addActivityActor(makeHuman(0x6A5E4A), { axis: "z", fixed: -1.1, start: pStart, end: pEnd }, 0.044, 0.77);

    const midZ  = originZ + Math.floor(ROWS / 2) * (cellD + gapZ) - gapZ / 2;
    const rStart = -gridW / 2 - 3, rEnd = gridW / 2 + 3;
    addActivityActor(makeMovingCar(0x3A4858), { axis: "x", fixed: midZ + 0.18,     start: rStart, end: rEnd }, 0.028, 0.12, "car");
    addActivityActor(makeMovingCar(0x4A3A32), { axis: "x", fixed: originZ - gapZ / 2 + 0.2, start: rStart, end: rEnd }, 0.022, 0.64, "car");
  }

  function updateSiteActivity(elapsed) {
    if (!activityVisible) return;
    activityActors.forEach((actor) => {
      const { path, speed, phase, kind } = actor.userData;
      const t        = (elapsed * speed + phase) % 1;
      const pingPong = t < 0.5 ? t * 2 : (1 - t) * 2;
      const direction = t < 0.5 ? 1 : -1;
      const value    = THREE.MathUtils.lerp(path.start, path.end, pingPong);
      if (path.axis === "z") {
        actor.position.set(path.fixed, 0.10, value);
        actor.rotation.y = direction > 0 ? 0 : Math.PI;
        actor.position.y = 0.10 + Math.abs(Math.sin(elapsed * 6.8 + phase * 8)) * 0.016;
        if (actor.userData.leftLeg) {
          actor.userData.leftLeg.rotation.x  =  Math.sin(elapsed * 6.8 + phase * 8) * 0.5;
          actor.userData.rightLeg.rotation.x = -Math.sin(elapsed * 6.8 + phase * 8) * 0.5;
        }
      } else {
        actor.position.set(value, 0.04, path.fixed);
        actor.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  }

  function toggleActivity(show) {
    activityVisible = show !== undefined ? show : !activityVisible;
    activityActors.forEach(a => { a.visible = activityVisible; });
    return activityVisible;
  }

  createSiteActivity();

  // ─────────────────────────────────────────────────────────
  // Raycasting — Hover & Selection
  // ─────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer   = new THREE.Vector2();
  let hoveredMesh = null;
  let selectedId  = null;

  // Hover target: subtle elevation, warm emissive — NOT dramatic scale
  const HOVER_LIFT  = 0.06;   // world-units above resting y
  const SELECT_LIFT = 0.10;

  function liftMesh(mesh, lift) {
    if (!mesh) return;
    const slabH = mesh.userData.slabH ?? 0.07;
    mesh.position.y = slabH / 2 + lift;
  }

  function resetMeshLift(mesh) {
    if (!mesh) return;
    const slabH = mesh.userData.slabH ?? 0.07;
    mesh.position.y = slabH / 2;
  }

  function setPointerFromEvent(evt) {
    const rect    = renderer.domElement.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    pointer.x = ((clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return { clientX, clientY };
  }

  function pickPlotMesh() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(Array.from(plotMeshes.values()));
    return intersects.length ? intersects[0].object : null;
  }

  renderer.domElement.addEventListener("pointermove", (evt) => {
    if (isWalkMode) return;
    const { clientX, clientY } = setPointerFromEvent(evt);
    const mesh = pickPlotMesh();

    if (hoveredMesh && hoveredMesh !== mesh && hoveredMesh.userData.plotId !== selectedId) {
      resetMeshLift(hoveredMesh);
      hoveredMesh.material.emissive.setHex(0x000000);
    }

    if (mesh) {
      renderer.domElement.style.cursor = "pointer";
      if (mesh.userData.plotId !== selectedId) {
        liftMesh(mesh, HOVER_LIFT);
        mesh.material.emissive.setHex(0x120E08);  // very warm, subtle
      }
      hoveredMesh = mesh;
      const plot = GV_DATA.getPlot(mesh.userData.plotId);
      if (onHoverPlot) onHoverPlot(plot, clientX, clientY);
    } else {
      renderer.domElement.style.cursor = "grab";
      hoveredMesh = null;
      if (onHoverPlot) onHoverPlot(null, 0, 0);
    }
  });

  renderer.domElement.addEventListener("click", (evt) => {
    if (measureMode) { addMeasurePoint(evt); return; }
    setPointerFromEvent(evt);
    const mesh = pickPlotMesh();
    if (mesh) selectPlot(mesh.userData.plotId);
  });

  function selectPlot(id, { flyTo = true } = {}) {
    // Deselect previous
    plotMeshes.forEach((m) => {
      resetMeshLift(m);
      m.material.emissive.setHex(0x000000);
    });
    selectedId = id || null;
    if (!id) return;

    const mesh = plotMeshes.get(id);
    if (!mesh) return;

    liftMesh(mesh, SELECT_LIFT);
    mesh.material.emissive.setHex(0x1E1408);  // warm bronze-brown tint

    if (flyTo && !isWalkMode) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      animateCameraTo(worldPos);
    }
    if (onSelectPlot) onSelectPlot(GV_DATA.getPlot(id));
  }

  // ─────────────────────────────────────────────────────────
  // Camera Fly-To Animation
  // ─────────────────────────────────────────────────────────
  let flyAnim = null;

  function animateCameraTo(targetPos) {
    const startTarget = controls.target.clone();
    const startCam    = camera.position.clone();

    // Calculate a good orbit position: 12 units back and elevated
    const dir    = startCam.clone().sub(controls.target).normalize();
    const offset = dir.multiplyScalar(12).add(new THREE.Vector3(0, 8, 0));
    const endCam = targetPos.clone().add(offset);
    const endTarget = targetPos.clone();
    const duration  = 820;
    const startTime = performance.now();

    if (flyAnim) cancelAnimationFrame(flyAnim);
    function step(now) {
      const t    = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startCam, endCam, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();
      if (t < 1) flyAnim = requestAnimationFrame(step);
    }
    flyAnim = requestAnimationFrame(step);
  }

  // ─────────────────────────────────────────────────────────
  // Measurement Tool
  // ─────────────────────────────────────────────────────────
  const measureGroup = new THREE.Group();
  scene.add(measureGroup);
  const measureGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const measureDotMat  = new THREE.MeshBasicMaterial({ color: 0xC49E4F });
  const measureLineMat = new THREE.LineBasicMaterial({ color: 0xC49E4F, linewidth: 2 });
  let measureMode   = false;
  let measurePoints = [];
  let onMeasureUpdate = null;

  function polygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      area += a.x * b.z - b.x * a.z;
    }
    return Math.abs(area) / 2;
  }

  function rebuildMeasureVisuals() {
    measureGroup.clear();
    measurePoints.forEach(p => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 9), measureDotMat);
      dot.position.set(p.x, 0.04, p.z);
      measureGroup.add(dot);
    });
    if (measurePoints.length > 1) {
      const pts = measurePoints.map(p => new THREE.Vector3(p.x, 0.04, p.z));
      if (measurePoints.length > 2) pts.push(pts[0].clone());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      measureGroup.add(new THREE.Line(geo, measureLineMat));
    }
    let totalDist = 0;
    for (let i = 1; i < measurePoints.length; i++) totalDist += measurePoints[i - 1].distanceTo(measurePoints[i]);
    const area = measurePoints.length > 2 ? polygonArea(measurePoints) : 0;
    if (onMeasureUpdate) onMeasureUpdate({ points: measurePoints.length, distance: totalDist, area });
  }

  function toggleMeasureMode(enable, onUpdate) {
    measureMode = enable !== undefined ? enable : !measureMode;
    if (onUpdate) onMeasureUpdate = onUpdate;
    if (!measureMode) {
      measurePoints = [];
      measureGroup.clear();
    } else if (isWalkMode) {
      toggleWalkMode(false);
    }
    renderer.domElement.style.cursor = measureMode ? "crosshair" : "grab";
    return measureMode;
  }

  function addMeasurePoint(evt) {
    setPointerFromEvent(evt);
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(measureGroundPlane, hit)) {
      measurePoints.push(hit);
      rebuildMeasureVisuals();
    }
  }

  function clearMeasurement() {
    measurePoints = [];
    rebuildMeasureVisuals();
  }

  // ─────────────────────────────────────────────────────────
  // First-Person Walkthrough Mode
  // ─────────────────────────────────────────────────────────
  let isWalkMode = false;
  const moveKeys = { forward: false, backward: false, left: false, right: false };
  const walkSpeed = 0.16;

  function toggleWalkMode(enable) {
    isWalkMode = enable !== undefined ? enable : !isWalkMode;
    if (isWalkMode) {
      camera.position.set(0, 1.72, originZ - 2);
      controls.target.set(0, 1.72, originZ + 5);
      controls.maxPolarAngle = Math.PI / 1.88;
      controls.minDistance   = 0.1;
    } else {
      camera.position.set(28, 22, 38);
      controls.target.set(0, 0, 0);
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minDistance   = 5;
    }
    controls.update();
    return isWalkMode;
  }

  window.addEventListener("keydown", (e) => {
    if (!isWalkMode) return;
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp")    moveKeys.forward  = true;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown")  moveKeys.backward = true;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")  moveKeys.left     = true;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") moveKeys.right    = true;
  });
  window.addEventListener("keyup", (e) => {
    if (!isWalkMode) return;
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp")    moveKeys.forward  = false;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown")  moveKeys.backward = false;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft")  moveKeys.left     = false;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") moveKeys.right    = false;
  });

  function updateWalkMovement() {
    if (!isWalkMode) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    if (moveKeys.forward)  { camera.position.addScaledVector(dir,  walkSpeed); controls.target.addScaledVector(dir,  walkSpeed); }
    if (moveKeys.backward) { camera.position.addScaledVector(dir, -walkSpeed); controls.target.addScaledVector(dir, -walkSpeed); }
    if (moveKeys.left)     { camera.position.addScaledVector(side,  walkSpeed); controls.target.addScaledVector(side,  walkSpeed); }
    if (moveKeys.right)    { camera.position.addScaledVector(side, -walkSpeed); controls.target.addScaledVector(side, -walkSpeed); }
  }

  // ─────────────────────────────────────────────────────────
  // Public Filter & Control API
  // ─────────────────────────────────────────────────────────
  function applyFilter(predicate) {
    plotMeshes.forEach((mesh, id) => {
      const plot  = GV_DATA.getPlot(id);
      const match = predicate(plot);
      mesh.material.opacity      = match ? 1 : 0.14;
      mesh.material.transparent  = !match;
      const accent = accentMeshes.get(id);
      if (accent) {
        accent.material.opacity     = match ? 1 : 0.10;
        accent.material.transparent = !match;
      }
      const sprite = labelSprites.get(id);
      if (sprite) sprite.visible = match && showPlotLabels;
    });
  }

  function togglePlotLabels(show) {
    showPlotLabels = show !== undefined ? show : !showPlotLabels;
    labelSprites.forEach(s => { s.visible = showPlotLabels; });
    return showPlotLabels;
  }

  function focusPlot(id) { selectPlot(id, { flyTo: true }); }

  function resetView() {
    if (isWalkMode) toggleWalkMode(false);
    animateCameraTo(new THREE.Vector3(0, 0, 0));
  }

  function refreshColors() {
    plotMeshes.forEach((mesh, id) => {
      const plot = GV_DATA.getPlot(id);
      mesh.material.color.copy(colorForPlot(plot));
      mesh.userData.baseColor = mesh.material.color.clone();
    });
    accentMeshes.forEach((mesh, id) => {
      const plot = GV_DATA.getPlot(id);
      mesh.material.color.copy(accentColorForPlot(plot));
    });
  }

  function setColorMode(mode) {
    colorMode = mode === "vastu" ? "vastu" : "status";
    refreshColors();
  }

  // ─────────────────────────────────────────────────────────
  // VR Stereoscopic Mode
  // ─────────────────────────────────────────────────────────
  function toggleVRMode(enable) {
    vrMode = enable !== undefined ? enable : !vrMode;
    const area = renderer.domElement.closest(".mp-canvas-area");
    area?.classList.toggle("vr-active", vrMode);
    return vrMode;
  }

  function renderStereo() {
    const size      = renderer.getDrawingBufferSize(new THREE.Vector2());
    const halfW     = Math.floor(size.x / 2);
    const origX     = camera.position.x;
    const origAsp   = camera.aspect;
    const eyeOffset = 0.09;

    renderer.setScissorTest(true);
    camera.aspect = halfW / size.y;
    camera.updateProjectionMatrix();

    renderer.setViewport(0, 0, halfW, size.y);
    renderer.setScissor(0, 0, halfW, size.y);
    camera.position.x = origX - eyeOffset;
    renderer.render(scene, camera);

    renderer.setViewport(halfW, 0, size.x - halfW, size.y);
    renderer.setScissor(halfW, 0, size.x - halfW, size.y);
    camera.position.x = origX + eyeOffset;
    renderer.render(scene, camera);

    camera.position.x = origX;
    camera.aspect     = origAsp;
    camera.updateProjectionMatrix();
    renderer.setScissorTest(false);
  }

  function getHeadingDeg() {
    const dx = camera.position.x - controls.target.x;
    const dz = camera.position.z - controls.target.z;
    return THREE.MathUtils.radToDeg(Math.atan2(dx, -dz));
  }

  // ─────────────────────────────────────────────────────────
  // Distance-Based Label Scaling
  // ─────────────────────────────────────────────────────────
  function updateLabelScales() {
    const camDist = camera.position.distanceTo(controls.target);
    // Fade/scale labels: visible at mid-zoom, fade at extremes
    const norm  = Math.max(0, Math.min(1, (camDist - 6) / 50));
    const scale = THREE.MathUtils.lerp(1.4, 0.7, norm);
    const alpha = norm > 0.85 ? Math.max(0, 1 - (norm - 0.85) / 0.15) : 1;

    labelSprites.forEach(sprite => {
      if (!sprite.visible) return;
      sprite.scale.set(scale * 1.1, scale * 0.55, 1);
      sprite.material.opacity = alpha;
    });
  }

  // ─────────────────────────────────────────────────────────
  // Resize Handler
  // ─────────────────────────────────────────────────────────
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const w    = rect.width;
    const h    = rect.height || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ─────────────────────────────────────────────────────────
  // Render Loop
  // ─────────────────────────────────────────────────────────
  const sceneClock = new THREE.Clock();
  let paused = false;
  function animate() {
    if (paused) return;
    updateSiteActivity(sceneClock.getElapsedTime());
    updateWalkMovement();
    controls.update();
    updateLabelScales();
    if (vrMode) renderStereo();
    else renderer.render(scene, camera);
    if (onHeadingChange) onHeadingChange(getHeadingDeg());
    requestAnimationFrame(animate);
  }
  function pause() {
    paused = true;
  }
  function resume() {
    if (!paused) return;
    paused = false;
    requestAnimationFrame(animate);
  }
  animate();

  // Alias for the homepage controller — resizes the renderer to its container.
  function handleResize() {
    resize();
  }

  // ─────────────────────────────────────────────────────────
  // Public API — identical surface to original
  // ─────────────────────────────────────────────────────────
  return {
    applyFilter,
    focusPlot,
    resetView,
    refreshColors,
    selectPlot,
    setColorMode,
    setEnvironmentMode,
    toggleActivity,
    toggleVRMode,
    toggleWalkMode,
    togglePlotLabels,
    getHeadingDeg,
    setLayerVisible,
    toggleMeasureMode,
    clearMeasurement,
    // Homepage controller lifecycle hooks (no-op safe; full-page page ignores them)
    pause,
    resume,
    handleResize,
  };
}
