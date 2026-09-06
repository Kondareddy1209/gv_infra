/* Lightweight auto-rotating aerial preview for the homepage hero.
   Enhanced with mini 3D house structures, asphalt roads, and trees. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.getElementById("hero-canvas");
if (canvas) {
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(11, 9, 13);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.enableZoom = false;
  controls.enablePan = false;

  scene.add(new THREE.HemisphereLight(0xfff2d9, 0x1a2a1c, 0.9));
  const sun = new THREE.DirectionalLight(0xffe9c2, 1.4);
  sun.position.set(10, 15, 8);
  sun.castShadow = true;
  scene.add(sun);

  // Ground Plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 14),
    new THREE.MeshStandardMaterial({ color: 0x3E7036, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Raised site pad: it gives the miniature development a clear, landscaped edge.
  const estatePad = new THREE.Mesh(
    new THREE.BoxGeometry(15.8, 0.16, 11.8),
    new THREE.MeshStandardMaterial({ color: 0x78a65b, roughness: 0.95 })
  );
  estatePad.position.y = 0.06;
  estatePad.receiveShadow = true;
  scene.add(estatePad);

  // Asphalt roads
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3D3B38, roughness: 0.8 });
  const r1 = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.8), roadMat);
  r1.rotation.x = -Math.PI / 2;
  r1.position.set(0, 0.01, -2.2);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.8), roadMat);
  r2.rotation.x = -Math.PI / 2;
  r2.position.set(0, 0.01, 2.2);
  scene.add(r1, r2);

  // A tree-lined main boulevard through the centre.
  const boulevard = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 11.8), roadMat);
  boulevard.rotation.x = -Math.PI / 2;
  boulevard.position.set(0.15, 0.16, 0);
  scene.add(boulevard);

  // Decorative plot grid with mini 3D houses on sold plots
  const cols = 6, rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === Math.floor(cols / 2)) continue; // central park gap
      const isSold = (r + c) % 3 === 0;
      const h = isSold ? 0.2 : 0.4;
      const color = isSold ? 0x837C6D : 0x3E7A4F;

      const plotMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, h, 0.85),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
      );
      const x = (c - cols / 2) * 1.15 + 0.58;
      const z = (r - rows / 2) * 1.05;
      plotMesh.position.set(x, h / 2, z);
      plotMesh.castShadow = true;
      plotMesh.receiveShadow = true;
      scene.add(plotMesh);

      // Add mini villa roof for sold plots
      if (isSold) {
        const villaBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.6, 0.55),
          new THREE.MeshStandardMaterial({ color: 0xF5F0EB })
        );
        villaBody.position.set(x, 0.5, z);
        villaBody.castShadow = true;

        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 0.35, 4),
          new THREE.MeshStandardMaterial({ color: 0x943828 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(x, 0.95, z);
        roof.castShadow = true;

        scene.add(villaBody, roof);

        const pool = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.05, 0.34),
          new THREE.MeshStandardMaterial({ color: 0x2c9ec9, metalness: .25, roughness: .2 })
        );
        pool.position.set(x + .32, .23, z - .15);
        scene.add(pool);
      }
    }
  }

  // Central Park with Fountain & Trees
  const park = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.08, rows * 1.05),
    new THREE.MeshStandardMaterial({ color: 0x2A6024 })
  );
  park.position.set(0.58, 0.04, 0);
  scene.add(park);

  for (let z = -1.8; z <= 1.8; z += 1.2) {
    const tree = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x1E4620 })
    );
    tree.position.set(0.58, 0.45, z);
    tree.castShadow = true;
    scene.add(tree);
  }

  // Tree clusters and warm site lighting make the overview read as a real community.
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b402a, roughness: .9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x235b2c, roughness: .85 });
  for (let z = -4.8; z <= 4.8; z += 1.35) {
    [-7.3, 7.3].forEach((x, index) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.05, .09, .7, 6), trunkMat);
      trunk.position.set(x, .42, z + (index ? .15 : -.15));
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(.38, 0), leafMat);
      crown.position.set(x, 1.02, z + (index ? .15 : -.15));
      scene.add(trunk, crown);
    });
  }

  const gate = new THREE.Group();
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xe8dfcf, roughness: .55 });
  [-1.25, 1.25].forEach(x => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.25, .3), gateMat);
    pillar.position.set(x, .7, -5.7);
    gate.add(pillar);
  });
  const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(3.05, .25, .32), gateMat);
  gateBeam.position.set(0, 1.3, -5.7);
  gate.add(gateBeam);
  scene.add(gate);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}
