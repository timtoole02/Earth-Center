import * as THREE from "three";
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * smooth(t);
export class Arrival {
  constructor(world) {
    this.world = world;
    this.phase = "arrival";
    this.time = 0;
    this.clock = 0;
    this.paused = false;
    this.camera = new THREE.PerspectiveCamera(
      48,
      innerWidth / innerHeight,
      0.1,
      2000,
    );
    this.space = new THREE.Scene();
    this.space.background = new THREE.Color(0x030a14);
    const texture = new THREE.TextureLoader().load(
      "assets/earth_atmos_2048.jpg",
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    this.space.add(new THREE.AmbientLight(0xb4d8ff, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(10, 10, 20);
    this.space.add(sun);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(10, 96, 64),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }),
    );
    earth.rotation.y = 2.4;
    this.space.add(earth);
    const positions = [];
    for (let i = 0; i < 900; i++) {
      const a = i * 2.39996,
        z = 1 - (2 * i) / 900,
        r = Math.sqrt(1 - z * z);
      positions.push(Math.cos(a) * r * 130, z * 130, Math.sin(a) * r * 130);
    }
    const stars = new THREE.BufferGeometry();
    stars.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.space.add(
      new THREE.Points(
        stars,
        new THREE.PointsMaterial({ size: 0.15, color: 0xc4e4ff }),
      ),
    );
    this.station = new THREE.Scene();
    this.station.background = new THREE.Color(0x91c7df);
    this.station.fog = new THREE.Fog(0x91c7df, 95, 250);
    this.station.add(new THREE.HemisphereLight(0xddefff, 0x485f49, 3));
    const daylight = new THREE.DirectionalLight(0xffedcb, 3);
    daylight.position.set(10, 35, 20);
    this.station.add(daylight);
    this.white = new THREE.MeshStandardMaterial({
      color: 0xd7ded9,
      roughness: 0.5,
      metalness: 0.2,
    });
    this.dark = new THREE.MeshStandardMaterial({
      color: 0x203841,
      metalness: 0.6,
      roughness: 0.4,
    });
    this.glass = new THREE.MeshPhysicalMaterial({
      color: 0x8bd2db,
      transparent: true,
      opacity: 0.17,
      roughness: 0.08,
      metalness: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.glow = new THREE.MeshBasicMaterial({ color: 0x8df5de });
    this.gold = new THREE.MeshStandardMaterial({
      color: 0xe9b975,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.makeStation(texture);
  }
  box(w, h, d, x, y, z, material = this.white, parent = this.station) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  label(text, sub, w, h, x, y, z, parent = this.station) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#102931";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4c68c";
    ctx.font = "bold 66px Arial";
    ctx.fillText(text, 512, 111);
    ctx.fillStyle = "#a7e5db";
    ctx.font = "25px Arial";
    ctx.fillText(sub, 512, 180);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  floor(size, color, y) {
    const shape = new THREE.Shape();
    shape.moveTo(-size, -size);
    shape.lineTo(size, -size);
    shape.lineTo(size, size);
    shape.lineTo(-size, size);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 4, 2.45, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    this.station.add(mesh);
  }
  person(color, x, z, scale = 1) {
    const group = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({
      color: 0xc99571,
      roughness: 0.8,
    });
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.26, 0.5, 4, 8),
      cloth,
    );
    torso.position.y = 1.12;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
    head.position.y = 1.88;
    group.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48),
      new THREE.MeshStandardMaterial({ color: 0x352a28 }),
    );
    hair.position.y = 1.94;
    group.add(hair);
    const limbs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.15, 0.85, 0);
      this.box(0.19, 0.65, 0.22, 0, -0.32, 0, this.dark, leg);
      this.box(0.21, 0.14, 0.34, 0, -0.66, 0.06, this.dark, leg);
      group.add(leg);
      limbs.push(leg);
      const arm = new THREE.Group();
      arm.position.set(side * 0.34, 1.4, 0);
      this.box(0.16, 0.56, 0.18, 0, -0.27, 0, cloth, arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), skin);
      hand.position.y = -0.6;
      arm.add(hand);
      group.add(arm);
      limbs.push(arm);
    }
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.027, 6, 6),
        this.dark,
      );
      eye.position.set(side * 0.085, 1.91, 0.21);
      group.add(eye);
    }
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    this.station.add(group);
    group.userData.limbs = limbs;
    return group;
  }
  makeStation(texture) {
    this.floor(200, 0x68836b, -0.32);
    this.floor(17, 0xc3ccc7, 0);
    // A glass pavilion with open front doors, structural fins, and a luminous canopy.
    for (const x of [-15, 15]) this.box(0.12, 9, 24, x, 4.5, 0, this.glass);
    this.box(30, 9, 0.12, 0, 4.5, -12, this.glass);
    for (const x of [-10, 10]) this.box(10, 9, 0.12, x, 4.5, 12, this.glass);
    this.box(31, 0.18, 25, 0, 9, 0, this.glass);
    for (let x = -15; x <= 15; x += 5) {
      for (const z of [-12, 12]) this.box(0.18, 9, 0.2, x, 4.5, z, this.white);
      this.box(0.13, 0.16, 24, x, 9, 0, this.white);
    }
    for (const z of [-12, -6, 0, 6, 12]) {
      this.box(30, 0.14, 0.13, 0, 9, z, this.white);
    }
    this.box(31, 0.6, 1, 0, 8.5, 12.3, this.dark);
    this.box(31, 0.045, 0.05, 0, 8.12, 12.85, this.glow);
    this.label(
      "EARTH CENTER",
      "A JOURNEY BEYOND THE SURFACE",
      13,
      3.25,
      0,
      6.65,
      12.7,
    );
    this.label(
      "THE GRAVITY GATE",
      "OBSERVATION CAPSULE 01 · NOW BOARDING",
      13,
      3.25,
      0,
      6,
      -11.8,
    );
    this.label(
      "EXPEDITION LOUNGE",
      "YOUR WORLD. FROM THE INSIDE.",
      7,
      1.75,
      -9,
      4,
      -10.5,
    );
    // The queue winds through the pavilion and out into the plaza.
    const queue = [
      [-6, 1],
      [-6, 3],
      [-6, 5],
      [-6, 7],
      [-9, 7],
      [-9, 5],
      [-9, 3],
      [-9, 1],
      [-11, 10],
      [-10, 14],
      [-7, 16],
      [-4, 17],
    ];
    this.guests = queue.map(([x, z], i) => {
      const p = this.person(
        [0x527c9b, 0xc17467, 0xbaa56e, 0x6d9b85, 0xa7b6c7][i % 5],
        x,
        z,
        i % 4 === 0 ? 0.82 : 1,
      );
      p.rotation.y = i < 8 ? 0.45 : Math.PI;
      return p;
    });
    for (const x of [-4.5, -7.5, -10.5]) {
      for (const z of [0, 4, 8]) {
        this.box(0.07, 1, 0.07, x, 0.5, z, this.gold);
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 10, 8),
          this.gold,
        );
        cap.position.set(x, 1, z);
        this.station.add(cap);
      }
      this.box(
        0.045,
        0.05,
        8,
        x,
        0.95,
        4,
        new THREE.MeshStandardMaterial({ color: 0x856047 }),
      );
    }
    // A small science exhibit and luminous orbit rings lend the queue its ride theme.
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 40, 32),
      new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0x123c4d,
        emissiveIntensity: 0.2,
      }),
    );
    globe.position.set(9, 3, -5);
    this.station.add(globe);
    this.box(3, 1, 3, 9, 0.5, -5, this.dark);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.025, 6, 80),
        this.gold,
      );
      ring.position.copy(globe.position);
      ring.rotation.set(i * 0.7, 0.5 + i * 0.5, 0);
      this.station.add(ring);
    }
    this.label("6,371 KM", "TO THE CENTER OF YOUR WORLD", 5, 1.25, 9, 6, -7);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      const tree = new THREE.Group();
      this.box(
        0.45,
        3,
        0.45,
        0,
        1.5,
        0,
        new THREE.MeshStandardMaterial({ color: 0x5e5744 }),
        tree,
      );
      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(2, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x386e55 }),
      );
      foliage.position.y = 5;
      tree.add(foliage);
      tree.position.set(Math.cos(a) * 29, 0, Math.sin(a) * 29);
      this.station.add(tree);
    }
    for (let i = 0; i < 8; i++) {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(25 + i * 2, 25 + i * 4, 7),
        new THREE.MeshStandardMaterial({ color: 0x789789 }),
      );
      hill.position.set((i - 4) * 45, 5, -100 - Math.abs(i - 4) * 5);
      this.station.add(hill);
    }
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 28, 48, 1, true),
      this.glass,
    );
    tube.position.set(0, -5, -4);
    this.station.add(tube);
    for (let y = -17; y <= 9; y += 2) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.43, 0.07, 8, 64),
        this.dark,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, y, -4);
      this.station.add(ring);
    }
    this.capsule = new THREE.Group();
    this.capsule.position.z = -4;
    this.station.add(this.capsule);
    for (const y of [0.18, 4.2]) {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 0.22, 48),
        this.dark,
      );
      base.position.y = y;
      this.capsule.add(base);
      const light = new THREE.Mesh(
        new THREE.TorusGeometry(1.82, 0.045, 8, 64),
        this.glow,
      );
      light.rotation.x = Math.PI / 2;
      light.position.y = y + 0.13;
      this.capsule.add(light);
    }
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(
        1.78,
        1.78,
        3.8,
        48,
        1,
        true,
        Math.PI / 3,
        (Math.PI * 4) / 3,
      ),
      this.glass,
    );
    body.position.y = 2.15;
    this.capsule.add(body);
    for (const x of [-1.6, 1.6])
      this.box(0.09, 4, 0.09, x, 2, 0, this.gold, this.capsule);
    this.doors = [-1, 1].map((side) =>
      this.box(
        1.5,
        3.6,
        0.04,
        side * 1.55,
        2.2,
        1.45,
        this.glass,
        this.capsule,
      ),
    );
    this.label("01", "EARTH CENTER", 1.6, 0.4, 0, 3.7, 1.72, this.capsule);
    this.hero = this.person(0xf1ac58, 0, 4);
    this.hero.rotation.y = Math.PI;
    this.attendant = this.person(0x56a8a4, 3, -1);
    this.attendant.rotation.y = -0.6;
    this.box(1.5, 1.1, 0.7, 3, 0.55, 0, this.dark);
    this.box(1.3, 0.05, 0.65, 3, 1.13, 0, this.glow);
  }
  start() {
    this.phase = "arrival";
    this.time = 0;
    this.paused = false;
  }
  ready() {
    this.phase = "ready";
    this.time = 12;
    this.paused = false;
    this.capsule.position.y = 0;
    this.hero.position.set(0, 0, 4);
    this.hero.userData.limbs.forEach((limb) => (limb.rotation.x = 0));
    this.doors.forEach(
      (door, i) => (door.position.x = (i === 0 ? -1 : 1) * 1.55),
    );
  }
  board() {
    this.phase = "boarding";
    this.time = 0;
    this.paused = false;
  }
  skip() {
    if (this.phase === "arrival") this.ready();
    else if (this.phase === "boarding") this.phase = "done";
  }
  update(dt) {
    if (!this.paused) {
      this.clock += dt;
      if (this.phase !== "ready") this.time += dt;
    }
    this.camera.fov = innerWidth < 760 ? 70 : 48;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    let scene = this.station,
      fade = 0,
      caption = "";
    if (this.phase === "arrival") {
      const t = this.time;
      if (t < 6.5) {
        scene = this.space;
        const f = smooth(t / 6.5);
        this.camera.position.set(
          mix(24, 1.1, f),
          mix(13, 1.8, f),
          mix(34, 10.45, f),
        );
        this.camera.lookAt(0, 0, 0);
        caption =
          t < 3
            ? "A whole world beneath your feet."
            : "Destination: Earth Center.";
        fade = smooth((t - 5.9) / 0.6);
      } else {
        const u = (t - 6.5) / 5.5;
        this.camera.position.set(
          mix(48, 22, u),
          mix(36, 12, u),
          mix(60, 32, u),
        );
        this.camera.lookAt(0, 3, 0);
        fade = 1 - smooth((t - 6.5) / 0.6);
        caption = "Welcome to the gravity gate.";
      }
      if (t >= 12) this.ready();
    }
    if (this.phase === "ready") {
      this.camera.position.set(22, 12, 32);
      this.camera.lookAt(0, 3, 0);
    }
    if (this.phase === "boarding") {
      const t = this.time;
      const walk = smooth((t - 2) / 4);
      this.hero.position.set(0, 0, mix(4, -4, walk));
      for (let i = 0; i < this.hero.userData.limbs.length; i++)
        this.hero.userData.limbs[i].rotation.x =
          t > 2 && t < 6 ? Math.sin(t * 9 + i * Math.PI) * 0.38 : 0;
      const door = smooth((t - 6) / 1.2);
      this.doors.forEach(
        (d, i) => (d.position.x = (i === 0 ? -1 : 1) * mix(1.55, 0.75, door)),
      );
      this.capsule.position.y = -8 * smooth((t - 7.5) / 3.5);
      if (t > 6) this.hero.position.y = this.capsule.position.y + 0.2;
      if (t < 7.5) {
        this.camera.position.set(
          mix(5, 4, t / 7.5),
          mix(3.2, 3.5, t / 7.5),
          mix(10, 5, t / 7.5),
        );
        this.camera.lookAt(0, 1.8, -1);
        caption =
          t < 2
            ? "You're next. Welcome aboard, explorer."
            : t < 6
              ? "Step inside your glass observation capsule."
              : "Doors sealed. Your journey awaits.";
      } else {
        const f = smooth((t - 7.5) / 3.5);
        this.camera.position.set(
          mix(4, 1.1, f),
          mix(4, 2.5, f),
          mix(5, -1.2, f),
        );
        this.camera.lookAt(0, this.capsule.position.y + 1.5, -4);
        caption = "Lowering to the release hatch…";
      }
      fade = smooth((t - 10.5) / 0.5);
      if (t >= 11) this.phase = "done";
    }
    this.guests.forEach((g, i) => {
      g.rotation.y =
        (i < 8 ? 0.45 : Math.PI) + Math.sin(this.clock * 0.6 + i) * 0.12;
      g.userData.limbs[1].rotation.z = Math.sin(this.clock + i) * 0.06;
    });
    this.attendant.userData.limbs[3].rotation.z =
      -1.9 + Math.sin(this.clock * 3) * 0.22;
    if (
      innerWidth < 760 &&
      (this.phase === "ready" || (this.phase === "arrival" && this.time >= 6.5))
    ) {
      this.camera.position.multiplyScalar(1.35);
      this.camera.lookAt(0, 3, 0);
    }
    this.world.renderer.render(scene, this.camera);
    return { fade, caption };
  }
}
