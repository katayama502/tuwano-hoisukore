import * as THREE from 'three';

/**
 * TsuwanoScene — Interactive 3D Miniature Island & Ambient Petal Engine
 * Natural, pop, gentle WebGL world for つわのホイスコーレ
 */
export class TsuwanoScene {
  constructor(canvas, heroTargetEl) {
    this.canvas = canvas;
    this.heroTargetEl = heroTargetEl;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mood = 'day'; // 'day' | 'night'
    this.moodFactor = 0; // 0 = day, 1 = night (smoothly lerped)

    this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.drag = { active: false, moved: false, startX: 0, startY: 0, rotY: 0, targetRotY: 0 };
    this.bounce = { velocity: 0, offset: 0, scalePunch: 0 };
    this.scrollProgress = 0;

    this.trees = [];
    this.clouds = [];
    this.kois = [];
    this.windowMeshes = [];
    this.flames = [];
    this.embers = [];
    this.smokePuffs = [];
    this.burstPetals = [];

    this.init();
  }

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3.2, 10.6);

    // Lighting
    this.setupLights();

    // Main Floating Diorama Group
    this.worldPivot = new THREE.Group();
    this.scene.add(this.worldPivot);

    this.islandGroup = new THREE.Group();
    this.worldPivot.add(this.islandGroup);

    this.buildIslandBase();
    this.buildStreamAndKoi();
    this.buildTsuwanoHouses();
    this.buildBotanicalTrees();
    this.buildCampfire();
    this.buildCloudsAndSkyBody();
    this.buildAmbientParticles();
    this.buildStars();

    // Position diorama cleanly in hero space
    this.updateLayout();

    // Events
    this.bindEvents();

    // Animation loop
    this.clock = new THREE.Clock();
    this.animate();
  }

  setupLights() {
    // Soft sky-to-meadow bounce light
    this.hemiLight = new THREE.HemisphereLight(0xfff9e8, 0x8cc08e, 1.15);
    this.scene.add(this.hemiLight);

    // Main warm sunlight / moonlight
    this.dirLight = new THREE.DirectionalLight(0xfff4d6, 1.55);
    this.dirLight.position.set(6, 9, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 25;
    const d = 5;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Gentle pastel fill rim light
    this.rimLight = new THREE.DirectionalLight(0xaad5e6, 0.55);
    this.rimLight.position.set(-6, 4, -5);
    this.scene.add(this.rimLight);

    // Campfire local point light
    this.fireLight = new THREE.PointLight(0xff9b42, 0.5, 5.5, 1.8);
    this.fireLight.position.set(0.95, 0.72, 0.85);
    this.scene.add(this.fireLight);
  }

  buildIslandBase() {
    // Sculpted rolling meadow top
    const topGeo = new THREE.CylinderGeometry(2.55, 2.38, 0.58, 36, 4);
    const pos = topGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (y > 0.1) {
        // Gentle Tsuwano valley hills on the back-left & back-right
        const hill1 = Math.exp(-((x + 1.15) ** 2 + (z + 0.95) ** 2) * 0.65) * 0.72;
        const hill2 = Math.exp(-((x - 1.25) ** 2 + (z + 0.85) ** 2) * 0.85) * 0.55;
        const softWave = Math.sin(x * 1.4) * Math.cos(z * 1.3) * 0.08;
        const edgeDip = r > 2.2 ? (r - 2.2) * -0.25 : 0;
        pos.setY(i, y + hill1 + hill2 + softWave + edgeDip);
      }
    }
    topGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x76b879,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: false
    });
    const meadow = new THREE.Mesh(topGeo, grassMat);
    meadow.position.y = 0.02;
    meadow.receiveShadow = true;
    meadow.castShadow = true;
    this.islandGroup.add(meadow);

    // Warm clay earth base (floating cone-rounded underside)
    const baseGeo = new THREE.ConeGeometry(2.36, 1.65, 28, 3);
    baseGeo.rotateX(Math.PI);
    const bPos = baseGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const x = bPos.getX(i);
      const y = bPos.getY(i);
      const z = bPos.getZ(i);
      const wobble = Math.sin(x * 2.3 + z * 1.7) * 0.09;
      if (y < 0.7) {
        bPos.setX(i, x * (1 + wobble * 0.4));
        bPos.setZ(i, z * (1 - wobble * 0.4));
      }
    }
    baseGeo.computeVertexNormals();

    const earthMat = new THREE.MeshStandardMaterial({
      color: 0xd6b08c,
      roughness: 0.92,
      metalness: 0.0
    });
    const earth = new THREE.Mesh(baseGeo, earthMat);
    earth.position.y = -1.04;
    earth.receiveShadow = true;
    this.islandGroup.add(earth);

    // Terracotta soil rim band
    const rimGeo = new THREE.TorusGeometry(2.37, 0.12, 10, 36);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x5ca163,
      roughness: 0.88
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -0.18;
    this.islandGroup.add(rim);

    // Floating mini pebble satellites underneath
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xc9a17c, roughness: 0.9 });
    const pebbles = [
      { pos: [-1.45, -1.65, 0.9], s: 0.24 },
      { pos: [1.5, -1.45, 0.75], s: 0.19 },
      { pos: [0.35, -2.08, -0.5], s: 0.16 }
    ];
    pebbles.forEach((p, idx) => {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(p.s, 1), pebbleMat);
      mesh.position.set(...p.pos);
      mesh.userData = { baseY: p.pos[1], phase: idx * 1.9 };
      this.islandGroup.add(mesh);
      this.clouds.push({ mesh, type: 'pebble', baseY: p.pos[1], phase: idx * 2.1 });
    });
  }

  buildStreamAndKoi() {
    // Graceful S-curve canal stream across the miniature valley
    this.streamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 0.34, -1.95),
      new THREE.Vector3(-0.15, 0.33, -0.85),
      new THREE.Vector3(0.28, 0.33, 0.15),
      new THREE.Vector3(-0.22, 0.32, 1.15),
      new THREE.Vector3(-0.42, 0.26, 2.15)
    ]);

    const streamGeo = new THREE.TubeGeometry(this.streamCurve, 44, 0.22, 8, false);
    streamGeo.scale(1, 0.22, 1);
    const streamMat = new THREE.MeshStandardMaterial({
      color: 0x77c9d4,
      emissive: 0x1a5666,
      emissiveIntensity: 0.14,
      roughness: 0.18,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88
    });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.y = 0.26;
    stream.receiveShadow = true;
    this.islandGroup.add(stream);

    // Cute miniature wooden footbridge arching over the stream
    const bridgeGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9b6b43, roughness: 0.85 });
    for (let i = -2; i <= 2; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.42), woodMat);
      plank.position.set(i * 0.125, Math.cos(i * 0.42) * 0.07, 0);
      plank.rotation.z = -i * 0.08;
      plank.castShadow = true;
      bridgeGroup.add(plank);
    }
    bridgeGroup.position.set(0.15, 0.38, 0.05);
    bridgeGroup.rotation.y = 0.28;
    this.islandGroup.add(bridgeGroup);

    // 3 Tiny colorful Tsuwano Koi swimming along the stream!
    const koiColors = [0xe86443, 0xf4c95d, 0xfff7eb];
    koiColors.forEach((col, i) => {
      const koi = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.032, 0.08, 4, 8),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })
      );
      koi.rotation.x = Math.PI / 2;
      this.islandGroup.add(koi);
      this.kois.push({
        mesh: koi,
        t: i * 0.32,
        speed: 0.055 + i * 0.012,
        lateral: (i - 1) * 0.06
      });
    });
  }

  createHouse({ x, y, z, rotY = 0, scale = 1, hasChimney = false }) {
    const group = new THREE.Group();

    // White plaster walls (Tsuwano traditional Shirakabe)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xfaf5ea, roughness: 0.82 });
    const baseWall = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.5), wallMat);
    baseWall.position.y = 0.21;
    baseWall.castShadow = true;
    baseWall.receiveShadow = true;
    group.add(baseWall);

    // Dark timber foundation skirt (Namako-kabe accent)
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x4b423b, roughness: 0.9 });
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.1, 0.52), skirtMat);
    skirt.position.y = 0.05;
    group.add(skirt);

    // Distinctive Tsuwano Sekishu Terracotta Red Gabled Roof!
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xc96245,
      roughness: 0.65,
      metalness: 0.06
    });
    const roofGeo = new THREE.ConeGeometry(0.54, 0.38, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.58;
    roof.scale.set(1.12, 1, 0.92);
    roof.castShadow = true;
    group.add(roof);

    // Cozy Glowing Windows (light up warmly in Hygge Night mode!)
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xffe49c,
      emissive: 0xffb647,
      emissiveIntensity: 0.18,
      roughness: 0.3
    });
    const winGeo = new THREE.BoxGeometry(0.14, 0.14, 0.04);
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(-0.14, 0.25, 0.25);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(0.14, 0.25, 0.25);
    const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.14), winMat);
    winSide.position.set(0.31, 0.25, 0);
    group.add(win1, win2, winSide);
    this.windowMeshes.push(winMat);

    // Tiny wooden door
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.2, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.85 })
    );
    door.position.set(0, 0.13, 0.255);
    group.add(door);

    if (hasChimney) {
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.24, 0.11),
        new THREE.MeshStandardMaterial({ color: 0xb3553b, roughness: 0.8 })
      );
      chimney.position.set(0.18, 0.65, -0.06);
      chimney.castShadow = true;
      group.add(chimney);

      // Gentle rising smoke puffs
      const puffMat = new THREE.MeshStandardMaterial({
        color: 0xfffbf2,
        roughness: 1,
        transparent: true,
        opacity: 0.55
      });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), puffMat.clone());
        puff.position.set(0.18, 0.82 + i * 0.18, -0.06);
        group.add(puff);
        this.smokePuffs.push({ mesh: puff, phase: i * 0.25, baseX: 0.18, baseZ: -0.06 });
      }
    }

    group.position.set(x, y, z);
    group.rotation.y = rotY;
    group.scale.setScalar(scale);
    this.islandGroup.add(group);
  }

  buildTsuwanoHouses() {
    // Main Højskole House (cozy base with chimney)
    this.createHouse({ x: -1.05, y: 0.36, z: 0.32, rotY: 0.42, scale: 1.08, hasChimney: true });
    // Kitchen / Dialogue Annex
    this.createHouse({ x: -1.48, y: 0.48, z: -0.55, rotY: 0.88, scale: 0.82 });
    // Town Hall / Neighbor House across the stream
    this.createHouse({ x: 1.12, y: 0.44, z: -0.58, rotY: -0.55, scale: 0.9 });
  }

  createTree({ x, y, z, type = 'pine', color = 0x4d8b55, scale = 1 }) {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x875e3e, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.35, 8), trunkMat);
    trunk.position.y = 0.17;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });

    if (type === 'pine') {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.48, 8), leafMat);
      c1.position.y = 0.46;
      c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 8), leafMat);
      c2.position.y = 0.72;
      c2.castShadow = true;
      group.add(c1, c2);
    } else {
      // Pop rounded blossom or broad-leaf tree
      const s1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.29, 1), leafMat);
      s1.position.y = 0.52;
      s1.castShadow = true;
      const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), leafMat);
      s2.position.set(0.14, 0.44, 0.08);
      group.add(s1, s2);
    }

    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    this.islandGroup.add(group);
    this.trees.push({
      mesh: group,
      phase: Math.random() * Math.PI * 2,
      swayAmp: 0.035 + Math.random() * 0.025
    });
  }

  buildBotanicalTrees() {
    const specs = [
      { x: -1.1, y: 0.85, z: -1.18, type: 'pine', color: 0x3b7a4a, scale: 1.05 },
      { x: -1.65, y: 0.72, z: -1.1, type: 'round', color: 0xf4b6c2, scale: 0.92 }, // Spring Sakura
      { x: -0.58, y: 0.65, z: -1.42, type: 'pine', color: 0x5da168, scale: 0.85 },
      { x: 0.52, y: 0.54, z: -1.35, type: 'round', color: 0x99cc6b, scale: 0.9 },
      { x: 1.28, y: 0.78, z: -1.15, type: 'pine', color: 0x3a7349, scale: 1.1 },
      { x: 1.75, y: 0.62, z: -0.65, type: 'round', color: 0xf7c2cb, scale: 0.85 }, // Spring Sakura
      { x: 1.82, y: 0.42, z: 0.2, type: 'pine', color: 0x559862, scale: 0.95 },
      { x: -1.88, y: 0.36, z: 0.48, type: 'round', color: 0x8cc678, scale: 0.88 },
      { x: -1.32, y: 0.32, z: 1.38, type: 'round', color: 0xf5b8c6, scale: 0.82 }, // Sakura near front
      { x: 0.45, y: 0.3, z: 1.78, type: 'pine', color: 0x4d8b55, scale: 0.72 }
    ];
    specs.forEach((spec) => this.createTree(spec));
  }

  buildCampfire() {
    const campGroup = new THREE.Group();
    campGroup.position.set(0.95, 0.32, 0.88);

    // Circle of little river stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8f8c84, roughness: 0.92 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), stoneMat);
      stone.position.set(Math.cos(a) * 0.24, 0.03, Math.sin(a) * 0.24);
      campGroup.add(stone);
    }

    // Crossed logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x6e472b, roughness: 0.95 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.34, 6), logMat);
      log.rotation.z = Math.PI / 2 - 0.18;
      log.rotation.y = (i * Math.PI) / 3;
      log.position.y = 0.06;
      campGroup.add(log);
    }

    // Animated layered cozy flames
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.34, 7),
      new THREE.MeshBasicMaterial({ color: 0xf07842, transparent: true, opacity: 0.9 })
    );
    outerFlame.position.y = 0.2;
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.24, 7),
      new THREE.MeshBasicMaterial({ color: 0xffdf6b, transparent: true, opacity: 0.95 })
    );
    innerFlame.position.y = 0.17;
    campGroup.add(outerFlame, innerFlame);
    this.flames.push(outerFlame, innerFlame);

    // Two tiny wooden dialogue benches facing the fire
    const benchMat = new THREE.MeshStandardMaterial({ color: 0xa67449, roughness: 0.85 });
    [0.55, 2.35].forEach((angle) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.11), benchMat);
      bench.position.set(Math.cos(angle) * 0.56, 0.06, Math.sin(angle) * 0.56);
      bench.lookAt(0, 0.06, 0);
      bench.castShadow = true;
      campGroup.add(bench);
    });

    // Rising glowing ember sparks
    for (let i = 0; i < 8; i++) {
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffcf60, transparent: true, opacity: 0.85 })
      );
      campGroup.add(ember);
      this.embers.push({
        mesh: ember,
        phase: Math.random() * Math.PI * 2,
        speed: 0.45 + Math.random() * 0.45,
        radius: 0.06 + Math.random() * 0.1
      });
    }

    this.islandGroup.add(campGroup);
  }

  buildCloudsAndSkyBody() {
    // 3 Fluffy stylized clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.92
    });
    this.cloudMaterial = cloudMat;

    const cloudConfigs = [
      { pos: [-1.85, 2.15, -0.7], s: 0.88, speed: 0.28 },
      { pos: [1.75, 2.35, -1.2], s: 0.72, speed: 0.22 },
      { pos: [0.25, 2.55, -1.8], s: 0.62, speed: 0.18 }
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const cGroup = new THREE.Group();
      const parts = [
        [0, 0, 0, 0.34],
        [-0.28, -0.05, 0.04, 0.24],
        [0.29, -0.04, -0.02, 0.26],
        [0.08, 0.14, -0.04, 0.22]
      ];
      parts.forEach(([px, py, pz, r]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), cloudMat);
        puff.position.set(px, py, pz);
        cGroup.add(puff);
      });
      cGroup.position.set(...cfg.pos);
      cGroup.scale.setScalar(cfg.s);
      this.islandGroup.add(cGroup);
      this.clouds.push({
        mesh: cGroup,
        type: 'cloud',
        baseX: cfg.pos[0],
        baseY: cfg.pos[1],
        phase: idx * 2.1,
        speed: cfg.speed
      });
    });

    // Cheerful floating Sun orb (Day) & Crescent Moon (Night)
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xf7d265 })
    );
    this.sunMesh.position.set(2.35, 2.35, -1.7);
    this.islandGroup.add(this.sunMesh);

    // Subtle sun halo
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf9de85, transparent: true, opacity: 0.25 })
    );
    this.sunMesh.add(sunHalo);

    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff2c2 })
    );
    this.moonMesh.position.set(-2.15, 0.8, -1.8);
    this.moonMesh.scale.setScalar(0.01);
    this.islandGroup.add(this.moonMesh);
  }

  buildAmbientParticles() {
    // Soft floating pastel petals / fireflies across the full viewport
    const count = 64;
    this.ambientGroup = new THREE.Group();
    this.scene.add(this.ambientGroup);

    const palette = [0x8cc996, 0xf4c95d, 0xf7b8c6, 0xf2a38a, 0x9cd2df];
    const petalGeo = new THREE.CircleGeometry(0.075, 6);

    this.ambientParticles = [];
    for (let i = 0; i < count; i++) {
      const col = palette[i % palette.length];
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55
      });
      const mesh = new THREE.Mesh(petalGeo, mat);
      const x = (Math.random() - 0.5) * 16;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 6 - 1;
      mesh.position.set(x, y, z);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      const s = 0.65 + Math.random() * 0.9;
      mesh.scale.set(s, s * 0.68, s);
      this.ambientGroup.add(mesh);

      this.ambientParticles.push({
        mesh,
        dayColor: new THREE.Color(col),
        nightColor: new THREE.Color(i % 2 === 0 ? 0xffdd78 : 0x9be5c4),
        baseX: x,
        speedY: 0.14 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 1.4
      });
    }
  }

  buildStars() {
    const starCount = 120;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 11 - 2.5;
      positions[i * 3 + 2] = -6 - Math.random() * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xfff6d4,
      size: 0.11,
      transparent: true,
      opacity: 0
    });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  /**
   * Playful elastic island bounce + celebratory petal swirl!
   */
  triggerPopBurst(accentHex = null) {
    this.bounce.velocity = 0.22;
    this.bounce.scalePunch = 0.14;

    const colors = accentHex
      ? [accentHex, 0xf4c95d, 0xf7b8c6, 0x8cc996]
      : [0xf4c95d, 0xf7b8c6, 0x7ac08a, 0xe87a5d, 0x9cd2df];

    const origin = new THREE.Vector3();
    if (this.scrollProgress < 0.75) {
      this.worldPivot.getWorldPosition(origin);
      origin.y += 0.6;
    } else {
      origin.set(0, -0.3, 1.5);
    }

    const petalGeo = new THREE.CircleGeometry(0.085, 5);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(petalGeo, mat);
      mesh.position.copy(origin);
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.35;
      const speed = 0.045 + Math.random() * 0.07;
      mesh.scale.set(1, 0.65, 1);
      this.scene.add(mesh);
      this.burstPetals.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 0.06 + Math.random() * 0.08,
        vz: Math.sin(angle) * speed,
        life: 1.0,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
  }

  setMood(mode) {
    this.mood = mode === 'night' ? 'night' : 'day';
  }

  updateLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    // Place floating island neatly inside hero visual space
    if (w > 1024) {
      this.basePos = { x: 2.35, y: -0.18, z: 0.1 };
      this.baseScale = Math.min(1.06, Math.max(0.86, w / 1380));
    } else if (w > 640) {
      this.basePos = { x: 0, y: 1.45, z: -0.4 };
      this.baseScale = 0.76;
    } else {
      this.basePos = { x: 0, y: 1.52, z: -0.9 };
      this.baseScale = 0.64;
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.updateLayout(), { passive: true });

    window.addEventListener(
      'scroll',
      () => {
        const heroH = Math.max(window.innerHeight, 620);
        this.scrollProgress = Math.min(window.scrollY / heroH, 2.5);
      },
      { passive: true }
    );

    window.addEventListener(
      'pointermove',
      (e) => {
        this.pointer.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        this.pointer.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

        if (this.drag.active) {
          const dx = e.clientX - this.drag.startX;
          if (Math.abs(dx) > 4) this.drag.moved = true;
          this.drag.targetRotY += dx * 0.009;
          this.drag.startX = e.clientX;
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener('pointerdown', (e) => {
      this.drag.active = true;
      this.drag.moved = false;
      this.drag.startX = e.clientX;
      this.drag.startY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      if (this.drag.active && !this.drag.moved) {
        this.triggerPopBurst();
      }
      this.drag.active = false;
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();

    // Smoothly interpolate Day (0) <-> Hygge Night (1)
    const targetMood = this.mood === 'night' ? 1 : 0;
    this.moodFactor += (targetMood - this.moodFactor) * Math.min(delta * 3.2, 1);
    const m = this.moodFactor;

    // Update lighting colors & intensities
    this.hemiLight.color.setHex(0xfff9e8).lerp(new THREE.Color(0x526b8c), m);
    this.hemiLight.groundColor.setHex(0x8cc08e).lerp(new THREE.Color(0x1f362c), m);
    this.hemiLight.intensity = 1.15 - m * 0.52;

    this.dirLight.color.setHex(0xfff4d6).lerp(new THREE.Color(0x9cbbe8), m);
    this.dirLight.intensity = 1.55 - m * 0.92;

    // Campfire light blooms warmly in night mode with soft natural flicker
    const flicker = Math.sin(t * 9.5) * 0.12 + Math.cos(t * 14.3) * 0.07;
    this.fireLight.intensity = 0.45 + m * 2.75 + flicker * (0.3 + m * 0.7);
    this.fireLight.position.set(
      this.worldPivot.position.x + 0.95 * this.baseScale,
      this.worldPivot.position.y + 0.65 * this.baseScale,
      this.worldPivot.position.z + 0.85 * this.baseScale
    );

    // Warm house windows glow at night
    this.windowMeshes.forEach((mat) => {
      mat.emissiveIntensity = 0.16 + m * 1.65;
    });

    // Cloud tint & Stars fade-in
    this.cloudMaterial.color.setHex(0xffffff).lerp(new THREE.Color(0x5f758e), m);
    this.cloudMaterial.opacity = 0.9 - m * 0.35;
    this.starsMat.opacity = m * 0.85;
    if (this.stars) {
      this.stars.rotation.y = t * 0.015;
    }

    // Sun <-> Moon arc transition
    this.sunMesh.position.y = 2.35 - m * 2.1;
    this.sunMesh.scale.setScalar(Math.max(0.01, 1 - m * 0.95));
    this.moonMesh.position.y = 0.75 + m * 1.55;
    this.moonMesh.scale.setScalar(Math.max(0.01, m));

    // Smooth pointer parallax
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.06;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.06;

    // Gentle elastic bounce physics
    this.bounce.offset += this.bounce.velocity;
    this.bounce.velocity += -this.bounce.offset * 0.16;
    this.bounce.velocity *= 0.82;
    this.bounce.scalePunch *= 0.86;

    // Scroll choreography: glide island upward and fade gracefully as user scrolls past hero
    const scrollEase = Math.min(this.scrollProgress, 1.35);
    const floatY = this.reducedMotion ? 0 : Math.sin(t * 1.15) * 0.13;

    this.worldPivot.position.x = this.basePos.x + scrollEase * 1.65;
    this.worldPivot.position.y = this.basePos.y + floatY + this.bounce.offset + scrollEase * 2.8;
    this.worldPivot.position.z = this.basePos.z - scrollEase * 2.2;

    const sBase = Math.max(0.15, this.baseScale * (1 - scrollEase * 0.32));
    this.worldPivot.scale.set(
      sBase * (1 + this.bounce.scalePunch * 0.65),
      sBase * (1 - this.bounce.scalePunch * 0.5),
      sBase * (1 + this.bounce.scalePunch * 0.65)
    );

    // Gentle continuous auto-rotation + drag + mouse parallax
    if (!this.reducedMotion) {
      this.drag.targetRotY += delta * 0.11;
    }
    this.drag.rotY += (this.drag.targetRotY - this.drag.rotY) * 0.08;
    this.islandGroup.rotation.y = this.drag.rotY + this.pointer.x * 0.22;
    this.islandGroup.rotation.x = 0.12 - this.pointer.y * 0.1;

    if (!this.reducedMotion) {
      // Sway botanical trees
      this.trees.forEach((tr) => {
        tr.mesh.rotation.z = Math.sin(t * 1.7 + tr.phase) * tr.swayAmp;
        tr.mesh.rotation.x = Math.cos(t * 1.3 + tr.phase) * (tr.swayAmp * 0.6);
      });

      // Drift clouds & float pebbles
      this.clouds.forEach((c) => {
        if (c.type === 'cloud') {
          c.mesh.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * 0.42;
          c.mesh.position.y = c.baseY + Math.cos(t * 0.9 + c.phase) * 0.07;
        } else {
          c.mesh.position.y = c.baseY + Math.sin(t * 1.6 + c.phase) * 0.09;
        }
      });

      // Swim tiny koi along the stream curve
      this.kois.forEach((k) => {
        k.t = (k.t + delta * k.speed) % 1;
        const pt = this.streamCurve.getPointAt(k.t);
        const tangent = this.streamCurve.getTangentAt(k.t);
        k.mesh.position.set(pt.x + k.lateral, 0.355, pt.z);
        k.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
      });

      // Dance campfire flames & rise embers
      this.flames.forEach((fl, idx) => {
        const pulse = 1 + Math.sin(t * 11 + idx * 2.1) * 0.15;
        fl.scale.set(1, pulse * (0.85 + m * 0.45), 1);
      });
      this.embers.forEach((eb) => {
        const cycle = (t * eb.speed + eb.phase) % 1;
        eb.mesh.position.set(
          Math.cos(cycle * 5 + eb.phase) * eb.radius,
          0.18 + cycle * 0.85,
          Math.sin(cycle * 5 + eb.phase) * eb.radius
        );
        eb.mesh.material.opacity = (1 - cycle) * (0.45 + m * 0.55);
      });

      // Chimney smoke puffs
      this.smokePuffs.forEach((sp) => {
        const cycle = (t * 0.32 + sp.phase) % 1;
        sp.mesh.position.set(
          sp.baseX + Math.sin(cycle * 4) * 0.06,
          0.8 + cycle * 0.72,
          sp.baseZ
        );
        const sc = 0.65 + cycle * 1.1;
        sp.mesh.scale.setScalar(sc);
        sp.mesh.material.opacity = (1 - cycle) * 0.48;
      });

      // Ambient drifting petals (Day) / glowing fireflies (Night)
      this.ambientParticles.forEach((p) => {
        p.mesh.position.y += delta * p.speedY * (m > 0.5 ? 0.55 : -0.75);
        p.mesh.position.x = p.baseX + Math.sin(t * 0.75 + p.phase) * 0.48;
        p.mesh.rotation.x += delta * p.rotSpeed;
        p.mesh.rotation.y += delta * p.rotSpeed * 0.8;

        if (p.mesh.position.y < -5.2) p.mesh.position.y = 5.2;
        if (p.mesh.position.y > 5.2) p.mesh.position.y = -5.2;

        p.mesh.material.color.copy(p.dayColor).lerp(p.nightColor, m);
        p.mesh.material.opacity = 0.48 + Math.sin(t * 2.5 + p.phase) * 0.18 * (0.3 + m);
      });
    }

    // Update celebratory burst petals
    for (let i = this.burstPetals.length - 1; i >= 0; i--) {
      const bp = this.burstPetals[i];
      bp.mesh.position.x += bp.vx;
      bp.mesh.position.y += bp.vy;
      bp.mesh.position.z += bp.vz;
      bp.vy -= 0.0022;
      bp.mesh.rotation.x += bp.spin;
      bp.mesh.rotation.z += bp.spin * 1.3;
      bp.life -= delta * 0.85;
      bp.mesh.material.opacity = Math.max(0, bp.life);

      if (bp.life <= 0) {
        this.scene.remove(bp.mesh);
        bp.mesh.geometry.dispose();
        bp.mesh.material.dispose();
        this.burstPetals.splice(i, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
