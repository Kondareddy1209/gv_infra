/* ============================================================
   MASTERPLAN 3D ENGINE (Three.js)
   Renders Stambadri Enclave as a realistic 3D land environment:
   - Ground terrain with road network and plot boundaries
   - Dynamic lighting (Day / Sunset / Night / Satellite)
   - 3D Entrance Arch & Gated boundary
   - 3D Clubhouse & Swimming Pool
   - Landscaped Central Park (multiple tree species, benches, flowerbeds)
   - Realistic 3D Villa / House models built on sold/reserved plots
   - Streetlight poles with emissive glow for Night mode
   - Floating 3D Plot Number Badges & edge outlines
   - Environment modes: Day ☀️, Golden Hour 🌅, Night 🌙
   - First-Person Street Walkthrough Mode (WASD / Arrows)
   - Interactive Raycasting hover tooltip & selection
   ============================================================ */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function initMasterplan({ canvas, onSelectPlot, onHoverPlot, onHeadingChange }) {
  const plots = GV_DATA.getPlots();

  // ---------- Scene & Renderer Setup ----------
  const scene = new THREE.Scene();
  const skyColors = {
    day: 0xEBF4F6,
    sunset: 0xFDE6D2,
    night: 0x0B132B,
    satellite: 0x93B5C6
  };
  const fogColors = {
    day: 0xDCE8EC,
    sunset: 0xF7D0B2,
    night: 0x070B19,
    satellite: 0x88AAB9
  };

  let currentEnv = "day";
  let vrMode = false;
  scene.background = new THREE.Color(skyColors.day);
  scene.fog = new THREE.FogExp2(fogColors.day, 0.007);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
  camera.position.set(30, 28, 36);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 6;
  controls.maxDistance = 110;

  // ---------- Environment Lighting ----------
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445533, 0.85);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff5ea, 1.25);
  sunLight.position.set(35, 45, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -45;
  sunLight.shadow.camera.right = 45;
  sunLight.shadow.camera.top = 45;
  sunLight.shadow.camera.bottom = -45;
  sunLight.shadow.bias = -0.0001;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambientLight);

  // Streetlights collection for night illumination
  const streetLights = [];
  const activityActors = [];
  let activityVisible = true;

  // Layer toggles: roads/utilities/buildings meshes are pushed into these as
  // they're created below, so visibility can be flipped without restructuring
  // the scene graph (park, terrain and plot pads always stay visible — they
  // are the base layout, not an optional layer).
  const roadMeshes = [];
  const utilityMeshes = [];
  const buildingMeshes = [];
  function setLayerVisible(layer, visible) {
    const layers = { roads: roadMeshes, utilities: utilityMeshes, buildings: buildingMeshes };
    (layers[layer] || []).forEach((mesh) => { mesh.visible = visible; });
  }

  function setEnvironmentMode(mode) {
    const wasSatellite = currentEnv === "satellite";
    currentEnv = mode;
    scene.background.set(skyColors[mode] || skyColors.day);
    scene.fog.color.set(fogColors[mode] || fogColors.day);

    if (mode === "day") {
      hemiLight.color.setHex(0xffffff);
      hemiLight.groundColor.setHex(0x445533);
      hemiLight.intensity = 0.85;
      sunLight.color.setHex(0xfff5ea);
      sunLight.intensity = 1.25;
      sunLight.position.set(35, 45, 15);
      streetLights.forEach(l => { l.light.intensity = 0; l.bulb.material.emissive.setHex(0x222222); });
    } else if (mode === "sunset") {
      hemiLight.color.setHex(0xffaa77);
      hemiLight.groundColor.setHex(0x332211);
      hemiLight.intensity = 0.65;
      sunLight.color.setHex(0xff7733);
      sunLight.intensity = 1.4;
      sunLight.position.set(50, 15, -25);
      streetLights.forEach(l => { l.light.intensity = 0.8; l.bulb.material.emissive.setHex(0xffaa44); });
    } else if (mode === "night") {
      hemiLight.color.setHex(0x1B263B);
      hemiLight.groundColor.setHex(0x0D1B2A);
      hemiLight.intensity = 0.25;
      sunLight.color.setHex(0x415A77);
      sunLight.intensity = 0.2;
      sunLight.position.set(-20, 40, -20);
      streetLights.forEach(l => { l.light.intensity = 2.2; l.bulb.material.emissive.setHex(0xffea9F); });
    } else if (mode === "satellite") {
      hemiLight.color.setHex(0xDDEEFF);
      hemiLight.groundColor.setHex(0x223322);
      hemiLight.intensity = 1.1;
      sunLight.color.setHex(0xffffff);
      sunLight.intensity = 1.4;
      sunLight.position.set(10, 80, 10);
      streetLights.forEach(l => { l.light.intensity = 0; l.bulb.material.emissive.setHex(0x222222); });
    }

    // Satellite mode should actually look like a top-down map, not just a
    // recolored perspective view — fly the camera to a near-vertical angle.
    if (mode === "satellite") {
      if (isWalkMode) toggleWalkMode(false);
      flyToTopDown();
    } else if (wasSatellite) {
      animateCameraTo(new THREE.Vector3(0, 0, 0));
    }
  }

  function flyToTopDown() {
    const startTarget = controls.target.clone();
    const startCam = camera.position.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);
    const endCam = new THREE.Vector3(0.5, 70, 0.5);
    const duration = 900;
    const startTime = performance.now();

    if (flyAnim) cancelAnimationFrame(flyAnim);
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startCam, endCam, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();
      if (t < 1) flyAnim = requestAnimationFrame(step);
    }
    flyAnim = requestAnimationFrame(step);
  }

  // ---------- Textures Generation ----------
  function createGrassTexture() {
    const cnv = document.createElement("canvas");
    cnv.width = 256; cnv.height = 256;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#3B6E36";
    ctx.fillRect(0, 0, 256, 256);
    // Add realistic grass blade variations
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const h = 2 + Math.random() * 4;
      ctx.fillStyle = Math.random() > 0.5 ? "#2D5A27" : (Math.random() > 0.5 ? "#4C8B46" : "#254D20");
      ctx.fillRect(x, y, 1.5, h);
    }
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }

  function createRoadTexture() {
    const cnv = document.createElement("canvas");
    cnv.width = 128; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#3A3835";
    ctx.fillRect(0, 0, 128, 128);
    // Road noise & dashed yellow center line
    ctx.fillStyle = "#2D2B28";
    for (let i = 0; i < 800; i++) {
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    ctx.fillStyle = "#E5B94A";
    ctx.fillRect(58, 10, 12, 40);
    ctx.fillRect(58, 78, 12, 40);
    const tex = new THREE.CanvasTexture(cnv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 10);
    return tex;
  }

  // ---------- Ground & Terrain ----------
  const grassTex = createGrassTexture();
  const groundGeo = new THREE.PlaneGeometry(160, 120);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  scene.add(ground);

  // A few earth-toned parcels outside the boundary prevent the site from
  // feeling like it is floating on a single flat green plane.
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x9a7955, roughness: 1 });
  [[-56, -34, 24, 16], [53, 31, 30, 18], [-54, 34, 28, 14]].forEach(([x, z, w, d]) => {
    const parcel = new THREE.Mesh(new THREE.PlaneGeometry(w, d), soilMat);
    parcel.rotation.x = -Math.PI / 2;
    parcel.position.set(x, -0.035, z);
    scene.add(parcel);
  });

  // ---------- Layout Geometry Math ----------
  const ROWS = 6, COLS = 9;
  const cellW = 3.6, cellD = 3.2;
  const gapX = 0.6, gapZ = 0.8;
  const gridW = COLS * (cellW + gapX);
  const gridD = ROWS * (cellD + gapZ);
  const originX = -gridW / 2;
  const originZ = -gridD / 2;

  function plotPosition(plot) {
    const x = originX + plot.col * (cellW + gapX) + cellW / 2;
    const z = originZ + plot.row * (cellD + gapZ) + cellD / 2;
    return { x, z };
  }

  // Asphalt roads with curbs
  const roadMat = new THREE.MeshStandardMaterial({ map: createRoadTexture(), roughness: 0.8 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.7 });

  for (let row = 0; row <= ROWS; row++) {
    const z = originZ + row * (cellD + gapZ) - gapZ / 2;
    const isMainRoad = row === 0 || row === ROWS || row === Math.floor(ROWS / 2);
    const roadWidth = isMainRoad ? 1.0 : 0.75;

    const road = new THREE.Mesh(new THREE.PlaneGeometry(gridW + 8, roadWidth), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    road.receiveShadow = true;
    scene.add(road);
    roadMeshes.push(road);

    // Curb strips
    const curb1 = new THREE.Mesh(new THREE.BoxGeometry(gridW + 8, 0.08, 0.08), curbMat);
    curb1.position.set(0, 0.04, z - roadWidth / 2 - 0.04);
    const curb2 = new THREE.Mesh(new THREE.BoxGeometry(gridW + 8, 0.08, 0.08), curbMat);
    curb2.position.set(0, 0.04, z + roadWidth / 2 + 0.04);
    scene.add(curb1, curb2);
    roadMeshes.push(curb1, curb2);

    // Add streetlight posts along main roads
    if (row % 2 === 0) {
      [-gridW / 2 - 2, 0, gridW / 2 + 2].forEach(x => {
        const pole = makeStreetLight();
        pole.position.set(x, 0, z - roadWidth / 2 - 0.2);
        scene.add(pole);
        utilityMeshes.push(pole);
      });
    }
  }

  // Service lanes and park promenades give the layout an understandable road hierarchy.
  const serviceRoadMat = new THREE.MeshStandardMaterial({ color: 0x4b4944, roughness: 0.86 });
  [-gridW / 2 - 1.55, gridW / 2 + 1.55].forEach(x => {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, gridD + 6), serviceRoadMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(x, 0.025, 0);
    lane.receiveShadow = true;
    scene.add(lane);
    roadMeshes.push(lane);
  });

  function makeStreetLight() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 })
    );
    pole.position.y = 1.1;
    pole.castShadow = true;

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    arm.position.set(0.12, 2.15, 0);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222 })
    );
    bulb.position.set(0.25, 2.1, 0);

    const light = new THREE.PointLight(0xffea9F, 0, 8);
    light.position.set(0.25, 2.05, 0);

    group.add(pole, arm, bulb, light);
    streetLights.push({ light, bulb });
    return group;
  }

  // ---------- Central Park & Landscaping ----------
  const parkGeo = new THREE.BoxGeometry(cellW * 0.95, 0.1, gridD);
  const parkMat = new THREE.MeshStandardMaterial({ color: 0x3E7036, roughness: 0.8 });
  const park = new THREE.Mesh(parkGeo, parkMat);
  park.position.set(0, 0.05, 0);
  park.receiveShadow = true;
  scene.add(park);

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd8c9ab, roughness: 0.9 });
  [-1.25, 1.25].forEach(x => {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(0.34, gridD - 0.45), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.115, 0);
    scene.add(path);
  });

  // Central Fountain
  const fountainGroup = new THREE.Group();
  const fBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.0, 0.3, 16),
    new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.5 })
  );
  fBase.position.y = 0.15;
  const fWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0x24A0ED, roughness: 0.1, metalness: 0.6 })
  );
  fWater.position.y = 0.22;
  fountainGroup.add(fBase, fWater);
  fountainGroup.position.set(0, 0, 0);
  scene.add(fountainGroup);

  // Landscaping Trees & Benches
  for (let z = -gridD / 2 + 1.5; z <= gridD / 2 - 1.5; z += 2.8) {
    if (Math.abs(z) < 1) continue; // Keep space around fountain
    scene.add(makeTree(-cellW * 0.72, z, z % 2 === 0 ? "broadleaf" : "palm"));
    scene.add(makeTree(cellW * 0.72, z, z % 3 === 0 ? "pine" : "broadleaf"));
    if (Math.abs(z) > 3) {
      scene.add(makeBench(-cellW * 0.5, z));
      scene.add(makeBench(cellW * 0.5, z, Math.PI));
    }
  }

  function makeTree(x, z, type = "broadleaf") {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 0.9 })
    );
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    g.add(trunk);

    if (type === "palm") {
      const leaves = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 1.1, 4),
          new THREE.MeshStandardMaterial({ color: 0x2A6024, roughness: 0.8 })
        );
        leaf.rotation.z = Math.PI / 3;
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.position.y = 0.85;
        leaves.add(leaf);
      }
      g.add(leaves);
    } else if (type === "pine") {
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.4, 7),
        new THREE.MeshStandardMaterial({ color: 0x1E4620, roughness: 0.85 })
      );
      foliage.position.y = 1.05;
      foliage.castShadow = true;
      g.add(foliage);
    } else {
      const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.6, 1),
        new THREE.MeshStandardMaterial({ color: 0x33682E, roughness: 0.85 })
      );
      foliage.position.y = 0.95;
      foliage.castShadow = true;
      g.add(foliage);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function makeSiteLabel(text, x, z, width = 3.1) {
    const cnv = document.createElement("canvas");
    cnv.width = 512; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "rgba(20, 52, 37, 0.86)";
    ctx.beginPath();
    ctx.roundRect(12, 18, 488, 92, 22);
    ctx.fill();
    ctx.fillStyle = "#F6E8B1";
    ctx.font = "700 34px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), transparent: true }));
    sprite.position.set(x, 1.2, z);
    sprite.scale.set(width, width * 0.25, 1);
    return sprite;
  }

  function makeBench(x, z, rotY = 0) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7A5230, roughness: 0.8 })
    );
    b.position.set(x, 0.1, z);
    b.rotation.y = rotY;
    return b;
  }

  // ---------- Small moving life: walkers in the park and cars on the roads ----------
  // These deliberately use compact geometry so animation stays smooth on phones.
  function makeHuman(shirtColor = 0x2f6b52) {
    const person = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.8 });
    const fabric = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x263746, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.32, 8), fabric);
    body.position.y = 0.44;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), skin);
    head.position.y = 0.68;
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.27, 6), trousers);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.055, 0.145, 0);
    rightLeg.position.set(0.055, 0.145, 0);
    person.add(body, head, leftLeg, rightLeg);
    person.userData.leftLeg = leftLeg;
    person.userData.rightLeg = rightLeg;
    person.castShadow = true;
    return person;
  }

  function makeMovingCar(color = 0x1c5c92) {
    const car = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9ad0e5, metalness: 0.45, roughness: 0.15 });
    const tyre = new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.9 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.86), paint);
    base.position.y = 0.16;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.43), glass);
    cabin.position.set(0, 0.33, -0.03);
    car.add(base, cabin);
    [-0.22, 0.22].forEach(x => [-0.27, 0.27].forEach(z => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8), tyre);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.09, z);
      car.add(wheel);
    }));
    return car;
  }

  function addActivityActor(actor, path, speed, phase = 0, kind = "walker") {
    actor.userData.path = path;
    actor.userData.speed = speed;
    actor.userData.phase = phase;
    actor.userData.kind = kind;
    activityActors.push(actor);
    scene.add(actor);
  }

  function createSiteActivity() {
    const parkStart = -gridD / 2 + 1;
    const parkEnd = gridD / 2 - 1;
    addActivityActor(makeHuman(0xc37635), { axis: "z", fixed: -1.25, start: parkStart, end: parkEnd }, 0.055, 0.04);
    addActivityActor(makeHuman(0x2f6b52), { axis: "z", fixed: 1.25, start: parkStart, end: parkEnd }, 0.04, 0.46);
    addActivityActor(makeHuman(0x7c4d8e), { axis: "z", fixed: -1.25, start: parkStart, end: parkEnd }, 0.048, 0.77);

    const innerRoadZ = originZ + Math.floor(ROWS / 2) * (cellD + gapZ) - gapZ / 2;
    const roadStart = -gridW / 2 - 3;
    const roadEnd = gridW / 2 + 3;
    addActivityActor(makeMovingCar(0x255f91), { axis: "x", fixed: innerRoadZ + 0.18, start: roadStart, end: roadEnd }, 0.032, 0.12, "car");
    addActivityActor(makeMovingCar(0xb84b3d), { axis: "x", fixed: originZ - gapZ / 2 + 0.2, start: roadStart, end: roadEnd }, 0.025, 0.64, "car");
  }

  function updateSiteActivity(elapsed) {
    if (!activityVisible) return;
    activityActors.forEach((actor) => {
      const { path, speed, phase, kind } = actor.userData;
      const t = (elapsed * speed + phase) % 1;
      const pingPong = t < 0.5 ? t * 2 : (1 - t) * 2;
      const direction = t < 0.5 ? 1 : -1;
      const value = THREE.MathUtils.lerp(path.start, path.end, pingPong);
      if (path.axis === "z") {
        actor.position.set(path.fixed, 0.12, value);
        actor.rotation.y = direction > 0 ? 0 : Math.PI;
        actor.position.y = 0.12 + Math.abs(Math.sin(elapsed * 7 + phase * 8)) * 0.018;
        actor.userData.leftLeg.rotation.x = Math.sin(elapsed * 7 + phase * 8) * 0.55;
        actor.userData.rightLeg.rotation.x = -Math.sin(elapsed * 7 + phase * 8) * 0.55;
      } else {
        actor.position.set(value, 0.05, path.fixed);
        actor.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    });
  }

  function toggleActivity(show) {
    activityVisible = show !== undefined ? show : !activityVisible;
    activityActors.forEach(actor => { actor.visible = activityVisible; });
    return activityVisible;
  }

  // ---------- 3D Entrance Gate & Arch ----------
  function makeEntranceArch() {
    const g = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xE2D8C3, roughness: 0.6 });

    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), pillarMat);
    p1.position.set(-3.5, 1.6, originZ - 4);
    p1.castShadow = true;

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), pillarMat);
    p2.position.set(3.5, 1.6, originZ - 4);
    p2.castShadow = true;

    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.5, 0.5), pillarMat);
    beam.position.set(0, 3.1, originZ - 4);
    beam.castShadow = true;

    // Welcome Signboard Text Sprite
    const cnv = document.createElement("canvas");
    cnv.width = 512; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#1E3A2B";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#E5B94A";
    ctx.font = "bold 44px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GV INFRA · STAMBADRI ENCLAVE", 256, 64);
    const signTex = new THREE.CanvasTexture(cnv);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.1), signMat);
    sign.position.set(0, 3.15, originZ - 3.74);

    g.add(p1, p2, beam, sign);
    return g;
  }
  scene.add(makeEntranceArch());

  // A low compound wall and identity labels make the boundary feel intentional.
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd7cfbf, roughness: 0.8 });
  const wallY = 0.42;
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(gridW + 8, 0.84, 0.2), wallMat);
  northWall.position.set(0, wallY, originZ - 5.1);
  const southWall = northWall.clone();
  southWall.position.z = -originZ + 5.1;
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.84, gridD + 10.2), wallMat);
  westWall.position.set(-gridW / 2 - 4, wallY, 0);
  const eastWall = westWall.clone();
  eastWall.position.x = gridW / 2 + 4;
  scene.add(northWall, southWall, westWall, eastWall);
  scene.add(makeSiteLabel("CENTRAL GREEN", 0, 2.4, 2.7));

  // ---------- 3D Clubhouse & Swimming Pool ----------
  function makeClubhouse() {
    const g = new THREE.Group();
    // Building structure
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(7.0, 2.4, 4.5),
      new THREE.MeshStandardMaterial({ color: 0xF4EBE1, roughness: 0.5 })
    );
    body.position.set(gridW / 2 + 5.5, 1.2, 0);
    body.castShadow = true;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.3, 5.0),
      new THREE.MeshStandardMaterial({ color: 0x4A3B32, roughness: 0.7 })
    );
    roof.position.set(gridW / 2 + 5.5, 2.5, 0);
    roof.castShadow = true;

    // Swimming pool deck & water
    const poolDeck = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.1, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xDCD5C6, roughness: 0.4 })
    );
    poolDeck.position.set(gridW / 2 + 5.5, 0.05, -5.5);

    const poolWater = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.12, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x00A896, roughness: 0.1, metalness: 0.8 })
    );
    poolWater.position.set(gridW / 2 + 5.5, 0.08, -5.5);

    g.add(body, roof, poolDeck, poolWater);
    return g;
  }
  const clubhouse = makeClubhouse();
  scene.add(clubhouse);
  buildingMeshes.push(clubhouse);

  // ---------- North Marker ----------
  function makeCompassMarker() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
    );
    base.position.y = 0.04;
    group.add(base);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    pole.position.y = 0.8;
    pole.castShadow = true;
    group.add(pole);

    const cnv = document.createElement("canvas");
    cnv.width = 128; cnv.height = 128;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "#E00B41";
    ctx.font = "bold 84px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 64, 64);
    const labelMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv) });
    const sprite = new THREE.Sprite(labelMat);
    sprite.position.y = 1.8;
    sprite.scale.set(1.2, 1.2, 1.2);
    group.add(sprite);

    return group;
  }
  const compassMarker = makeCompassMarker();
  compassMarker.position.set(0, 0, originZ - 3);
  scene.add(compassMarker);

  // ---------- Plots & 3D House Rendering ----------
  const plotMeshes = new Map();
  const plotGroup = new THREE.Group();
  const labelSprites = new Map();
  let showPlotLabels = true;

  let colorMode = "status"; // "status" | "vastu"
  function colorForPlot(plot) {
    return colorMode === "vastu"
      ? GV_DATA.vastuColorHex(GV_DATA.vastuGrade(plot))
      : GV_DATA.statusColorHex(plot.status);
  }

  // 3D House / Villa Mesh Generator for Sold/Reserved Plots
  function createVillaModel(cellW, cellD) {
    const vGroup = new THREE.Group();
    const w = cellW * 0.72;
    const d = cellD * 0.65;
    const h = 1.1;

    // House Main Walls
    const houseBody = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0xF5F0EB, roughness: 0.5 })
    );
    houseBody.position.y = h / 2 + 0.05;
    houseBody.castShadow = true;

    // Sloped Roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.75, 0.65, 4),
      new THREE.MeshStandardMaterial({ color: 0x943828, roughness: 0.7 })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = h + 0.35;
    roof.castShadow = true;

    // Entrance Door
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x4A2E19 })
    );
    door.position.set(0, 0.35, d / 2 + 0.01);

    // Windows
    const winMat = new THREE.MeshStandardMaterial({ color: 0x64B5F6, roughness: 0.2 });
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), winMat);
    w1.position.set(-w / 3, 0.65, d / 2 + 0.01);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), winMat);
    w2.position.set(w / 3, 0.65, d / 2 + 0.01);

    // Driveway & Parked Car
    const driveway = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, d * 0.8),
      new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    driveway.rotation.x = -Math.PI / 2;
    driveway.position.set(w / 2 + 0.2, 0.02, 0);

    const car = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.3, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2A4365, metalness: 0.6, roughness: 0.3 })
    );
    car.position.set(w / 2 + 0.2, 0.16, 0);
    car.castShadow = true;

    const porch = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.5, 0.08, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c7, roughness: 0.65 })
    );
    porch.position.set(0, 0.1, d / 2 + 0.16);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.45, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x875449, roughness: 0.8 })
    );
    chimney.position.set(-w * 0.25, h + 0.65, 0);

    vGroup.add(houseBody, roof, door, w1, w2, driveway, car, porch, chimney);
    return vGroup;
  }

  function createPlotLabelSprite(plotNo) {
    const cnv = document.createElement("canvas");
    cnv.width = 128; cnv.height = 64;
    const ctx = cnv.getContext("2d");
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    ctx.roundRect(10, 8, 108, 48, 12);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`#${plotNo}`, 64, 32);

    const tex = new THREE.CanvasTexture(cnv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.7, 1);
    return sprite;
  }

  plots.forEach((plot) => {
    const plotContainer = new THREE.Group();
    const { x, z } = plotPosition(plot);
    plotContainer.position.set(x, 0, z);

    // Plot Base Slab
    const h = plot.status === "sold" ? 0.25 : 0.45;
    const geo = new THREE.BoxGeometry(cellW, h, cellD);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorForPlot(plot)),
      roughness: 0.6,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.plotId = plot.id;
    mesh.userData.baseColor = mat.color.clone();

    plotContainer.add(mesh);

    // Plot Boundary Edges Outline
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1.5, transparent: true, opacity: 0.4 });
    const line = new THREE.LineSegments(edges, lineMat);
    line.position.y = h / 2;
    plotContainer.add(line);

    // Render 3D Villa House on Sold plots
    if (plot.status === "sold" || plot.status === "reserved") {
      const villa = createVillaModel(cellW, cellD);
      plotContainer.add(villa);
      buildingMeshes.push(villa);
    }

    // Floating 3D Plot Number Badge
    const labelSprite = createPlotLabelSprite(plot.plotNumber);
    labelSprite.position.y = h + 1.1;
    plotContainer.add(labelSprite);
    labelSprites.set(plot.id, labelSprite);

    plotGroup.add(plotContainer);
    plotMeshes.set(plot.id, mesh);
  });
  scene.add(plotGroup);
  createSiteActivity();

  // ---------- Raycasting: Hover & Selection ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredMesh = null;
  let selectedId = null;

  // ---------- Measurement tool ----------
  // The scene is a stylised layout, not a to-scale architectural model (every
  // plot renders at the same footprint regardless of its real sq.ft — see
  // plotPosition/cellW/cellD above), so this deliberately reports scene units
  // rather than fabricating a feet/metre conversion the model can't back up.
  const measureGroup = new THREE.Group();
  scene.add(measureGroup);
  const measureGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const measureDotMat = new THREE.MeshBasicMaterial({ color: 0xd1a34b });
  const measureLineMat = new THREE.LineBasicMaterial({ color: 0xd1a34b, linewidth: 2 });
  let measureMode = false;
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
    measurePoints.forEach((p) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), measureDotMat);
      dot.position.set(p.x, 0.05, p.z);
      measureGroup.add(dot);
    });
    if (measurePoints.length > 1) {
      const linePts = measurePoints.map((p) => new THREE.Vector3(p.x, 0.05, p.z));
      if (measurePoints.length > 2) linePts.push(linePts[0].clone()); // close the shape once an area is measurable
      const geo = new THREE.BufferGeometry().setFromPoints(linePts);
      measureGroup.add(new THREE.Line(geo, measureLineMat));
    }
    let totalDistance = 0;
    for (let i = 1; i < measurePoints.length; i++) totalDistance += measurePoints[i - 1].distanceTo(measurePoints[i]);
    const area = measurePoints.length > 2 ? polygonArea(measurePoints) : 0;
    if (onMeasureUpdate) onMeasureUpdate({ points: measurePoints.length, distance: totalDistance, area });
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

  function setPointerFromEvent(evt) {
    const rect = renderer.domElement.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return { clientX, clientY };
  }

  function pickPlotMesh() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(Array.from(plotMeshes.values()));
    return intersects.length ? intersects[0].object : null;
  }

  renderer.domElement.addEventListener("pointermove", (evt) => {
    if (isWalkMode) return; // Hover tooltip disabled in FPV mode
    const { clientX, clientY } = setPointerFromEvent(evt);
    const mesh = pickPlotMesh();

    if (hoveredMesh && hoveredMesh !== mesh && hoveredMesh.userData.plotId !== selectedId) {
      hoveredMesh.scale.set(1, 1, 1);
      hoveredMesh.material.emissive.setHex(0x000000);
    }

    if (mesh) {
      renderer.domElement.style.cursor = "pointer";
      if (mesh.userData.plotId !== selectedId) {
        mesh.scale.set(1.04, 1.1, 1.04);
        mesh.material.emissive.setHex(0x222222);
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
    plotMeshes.forEach((m) => {
      m.scale.set(1, 1, 1);
      m.material.emissive.setHex(0x000000);
    });
    selectedId = id || null;
    if (!id) return;
    const mesh = plotMeshes.get(id);
    if (!mesh) return;

    mesh.scale.set(1.08, 1.2, 1.08);
    mesh.material.emissive.setHex(0x333311);

    if (flyTo && !isWalkMode) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      animateCameraTo(worldPos);
    }
    if (onSelectPlot) onSelectPlot(GV_DATA.getPlot(id));
  }

  // ---------- Camera Fly-To Animation ----------
  let flyAnim = null;
  function animateCameraTo(targetPos) {
    const startTarget = controls.target.clone();
    const startCam = camera.position.clone();
    const offset = new THREE.Vector3(10, 10, 10);
    const endCam = targetPos.clone().add(offset);
    const endTarget = targetPos.clone();
    const duration = 750;
    const startTime = performance.now();

    if (flyAnim) cancelAnimationFrame(flyAnim);
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startCam, endCam, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();
      if (t < 1) flyAnim = requestAnimationFrame(step);
    }
    flyAnim = requestAnimationFrame(step);
  }

  // ---------- First-Person Street Walkthrough Mode (FPV) ----------
  let isWalkMode = false;
  const moveKeys = { forward: false, backward: false, left: false, right: false };
  const walkSpeed = 0.18;

  function toggleWalkMode(enable) {
    isWalkMode = enable !== undefined ? enable : !isWalkMode;
    if (isWalkMode) {
      camera.position.set(0, 1.7, originZ - 2);
      controls.target.set(0, 1.7, originZ + 5);
      controls.maxPolarAngle = Math.PI / 1.9;
      controls.minDistance = 0.1;
    } else {
      camera.position.set(30, 28, 36);
      controls.target.set(0, 0, 0);
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minDistance = 6;
    }
    controls.update();
    return isWalkMode;
  }

  window.addEventListener("keydown", (e) => {
    if (!isWalkMode) return;
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") moveKeys.forward = true;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") moveKeys.backward = true;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") moveKeys.left = true;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") moveKeys.right = true;
  });

  window.addEventListener("keyup", (e) => {
    if (!isWalkMode) return;
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") moveKeys.forward = false;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") moveKeys.backward = false;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") moveKeys.left = false;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") moveKeys.right = false;
  });

  function updateWalkMovement() {
    if (!isWalkMode) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);

    if (moveKeys.forward) {
      camera.position.addScaledVector(dir, walkSpeed);
      controls.target.addScaledVector(dir, walkSpeed);
    }
    if (moveKeys.backward) {
      camera.position.addScaledVector(dir, -walkSpeed);
      controls.target.addScaledVector(dir, -walkSpeed);
    }
    if (moveKeys.left) {
      camera.position.addScaledVector(sideDir, walkSpeed);
      controls.target.addScaledVector(sideDir, walkSpeed);
    }
    if (moveKeys.right) {
      camera.position.addScaledVector(sideDir, -walkSpeed);
      controls.target.addScaledVector(sideDir, -walkSpeed);
    }
  }

  // ---------- Public Filter & Control API ----------
  function applyFilter(predicate) {
    plotMeshes.forEach((mesh, id) => {
      const plot = GV_DATA.getPlot(id);
      const match = predicate(plot);
      mesh.material.opacity = match ? 1 : 0.15;
      mesh.material.transparent = !match;
      const sprite = labelSprites.get(id);
      if (sprite) sprite.visible = match && showPlotLabels;
    });
  }

  function togglePlotLabels(show) {
    showPlotLabels = show !== undefined ? show : !showPlotLabels;
    labelSprites.forEach((s) => { s.visible = showPlotLabels; });
    return showPlotLabels;
  }

  function focusPlot(id) {
    selectPlot(id, { flyTo: true });
  }

  function resetView() {
    if (isWalkMode) toggleWalkMode(false);
    animateCameraTo(new THREE.Vector3(0, 0, 0));
  }

  function refreshColors() {
    plotMeshes.forEach((mesh, id) => {
      const plot = GV_DATA.getPlot(id);
      mesh.material.color.set(colorForPlot(plot));
      mesh.userData.baseColor = mesh.material.color.clone();
    });
  }

  function setColorMode(mode) {
    colorMode = mode === "vastu" ? "vastu" : "status";
    refreshColors();
  }

  // Lightweight stereoscopic rendering for Cardboard-style mobile viewers.
  // It deliberately stays within the normal Three.js canvas: no headset,
  // account, or special browser API is needed for a useful VR-like preview.
  function toggleVRMode(enable) {
    vrMode = enable !== undefined ? enable : !vrMode;
    const area = renderer.domElement.closest(".mp-canvas-area");
    area?.classList.toggle("vr-active", vrMode);
    return vrMode;
  }

  function renderStereo() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const halfWidth = Math.floor(size.x / 2);
    const originalX = camera.position.x;
    const originalAspect = camera.aspect;
    const eyeOffset = 0.09;

    renderer.setScissorTest(true);
    camera.aspect = halfWidth / size.y;
    camera.updateProjectionMatrix();

    renderer.setViewport(0, 0, halfWidth, size.y);
    renderer.setScissor(0, 0, halfWidth, size.y);
    camera.position.x = originalX - eyeOffset;
    renderer.render(scene, camera);

    renderer.setViewport(halfWidth, 0, size.x - halfWidth, size.y);
    renderer.setScissor(halfWidth, 0, size.x - halfWidth, size.y);
    camera.position.x = originalX + eyeOffset;
    renderer.render(scene, camera);

    camera.position.x = originalX;
    camera.aspect = originalAspect;
    camera.updateProjectionMatrix();
    renderer.setScissorTest(false);
  }

  function getHeadingDeg() {
    const dx = camera.position.x - controls.target.x;
    const dz = camera.position.z - controls.target.z;
    const bearing = Math.atan2(dx, -dz);
    return THREE.MathUtils.radToDeg(bearing);
  }

  // ---------- Resize Handling ----------
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height || 580;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Render Loop ----------
  const sceneClock = new THREE.Clock();
  function animate() {
    updateSiteActivity(sceneClock.getElapsedTime());
    updateWalkMovement();
    controls.update();
    if (vrMode) renderStereo();
    else renderer.render(scene, camera);
    if (onHeadingChange) onHeadingChange(getHeadingDeg());
    requestAnimationFrame(animate);
  }
  animate();

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
    clearMeasurement
  };
}
