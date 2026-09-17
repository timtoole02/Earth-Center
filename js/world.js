import * as THREE from "three";
import { R, SHELLS, layerAt } from "./physics.js";
export class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x070e14);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.localClippingEnabled = true;
    container.append(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 500);
    this.planet = new THREE.Scene();
    this.shaft = new THREE.Scene();
    this.shaft.fog = new THREE.FogExp2(0x0c1116, 0.019);
    this.shaft.background = this.shaft.fog.color.clone();
    this.view = "earth";
    this.look = { x: 0, y: 0 };
    this.offset = 0;
    this.createPlanet();
    this.createShaft();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    let drag = null;
    container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY };
      container.setPointerCapture(e.pointerId);
    });
    container.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.look.x = THREE.MathUtils.clamp(
        this.look.x + (e.clientX - drag.x) * 0.003,
        -0.65,
        0.65,
      );
      this.look.y = THREE.MathUtils.clamp(
        this.look.y + (e.clientY - drag.y) * 0.003,
        -0.4,
        0.4,
      );
      drag = { x: e.clientX, y: e.clientY };
    });
    const release = () => {
      drag = null;
    };
    container.addEventListener("pointerup", release);
    container.addEventListener("pointercancel", release);
    container.addEventListener("lostpointercapture", release);
    window.addEventListener("blur", release);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.code === "KeyP") release();
    });
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  setView(view) {
    this.view = view;
    this.look = { x: 0, y: 0 };
  }
  createPlanet() {
    const ambient = new THREE.AmbientLight(0xc2dfe8, 2);
    this.planet.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(-5, 9, 14);
    this.planet.add(sun);
    this.globe = new THREE.Group();
    this.planet.add(this.globe);
    const tex = new THREE.TextureLoader().load("assets/earth_atmos_2048.jpg");
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(5, 96, 64),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.88,
        clippingPlanes: [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
      }),
    );
    earth.rotation.y = -0.6;
    this.globe.add(earth);
    // Left half is a true-scale cross section; right half retains the textured globe.
    [...SHELLS].reverse().forEach((s, i) => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry((s.radius / R) * 5, 128, Math.PI / 2, Math.PI),
        new THREE.MeshBasicMaterial({ color: s.color, side: THREE.DoubleSide }),
      );
      mesh.position.z = 0.04 + i * 0.012;
      this.globe.add(mesh);
      const points = [];
      for (let j = 0; j <= 128; j++) {
        const a = Math.PI / 2 + (j / 128) * Math.PI;
        points.push(
          new THREE.Vector3(
            ((Math.cos(a) * s.radius) / R) * 5,
            ((Math.sin(a) * s.radius) / R) * 5,
            0.13,
          ),
        );
      }
      this.globe.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: 0xffe9c8,
            transparent: true,
            opacity: 0.2,
          }),
        ),
      );
    });
    // Fine strata give the cutaway depth without implying additional model layers.
    for (let i = 0; i < 42; i++) {
      const rad = 0.3 + i * 0.111;
      const pts = [];
      for (let j = 0; j <= 100; j++) {
        const a = Math.PI / 2 + (j / 100) * Math.PI;
        const r = rad + Math.sin(a * 14 + i) * 0.016;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.16));
      }
      this.globe.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({
            color: 0x391c18,
            transparent: true,
            opacity: 0.15,
          }),
        ),
      );
    }
    const tunnel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 10.45, 12),
      new THREE.MeshBasicMaterial({ color: 0x0a1920 }),
    );
    tunnel.position.z = 0.24;
    this.globe.add(tunnel);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 5.35, 0.31),
        new THREE.Vector3(0, -5.35, 0.31),
      ]),
      new THREE.LineBasicMaterial({
        color: 0xa5f4e4,
        transparent: true,
        opacity: 0.65,
      }),
    );
    this.globe.add(line);
    this.marker = new THREE.Group();
    this.marker.position.z = 0.4;
    this.marker.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 20, 12),
        new THREE.MeshBasicMaterial({ color: 0xeafffa }),
      ),
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.18, 40),
      new THREE.MeshBasicMaterial({
        color: 0x93ffe8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.marker.add(halo);
    this.globe.add(this.marker);
    for (const y of [-5.12, 5.12]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x8ce1d3 }),
      );
      ring.position.set(0, y, 0.32);
      this.globe.add(ring);
    }
    const positions = new Float32Array(1600 * 3);
    let seed = 47;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1600; i++) {
      positions[i * 3] = (random() - 0.5) * 130;
      positions[i * 3 + 1] = (random() - 0.5) * 100;
      positions[i * 3 + 2] = -15 - random() * 65;
    }
    const stars = new THREE.BufferGeometry();
    stars.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.planet.add(
      new THREE.Points(
        stars,
        new THREE.PointsMaterial({
          color: 0xabc9d1,
          size: 0.035,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    const atmosphere = new THREE.Mesh(
      new THREE.RingGeometry(5.015, 5.045, 160),
      new THREE.MeshBasicMaterial({
        color: 0x639fac,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.globe.add(atmosphere);
  }
  createShaft() {
    this.shaft.add(new THREE.AmbientLight(0x769aab, 2));
    this.light = new THREE.PointLight(0x99e7eb, 160, 130, 1.3);
    this.light.position.set(0, 0, 4);
    this.shaft.add(this.light);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = "#77716a";
    c.fillRect(0, 0, 256, 256);
    let seed = 93;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 4500; i++) {
      const a = rand() * 0.15;
      c.fillStyle = `rgba(${rand() > 0.5 ? "255,255,255" : "0,0,0"},${a})`;
      c.fillRect(rand() * 256, rand() * 256, rand() * 28 + 1, rand() * 7 + 1);
    }
    for (let i = 0; i < 30; i++) {
      c.strokeStyle = "#252b2944";
      c.beginPath();
      let y = rand() * 256;
      c.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) c.lineTo(x, (y += rand() * 12 - 6));
      c.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 18);
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x627577,
      map: texture,
      roughness: 0.96,
      side: THREE.BackSide,
    });
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 10, 230, 64, 1, true),
      this.wallMaterial,
    );
    wall.rotation.x = Math.PI / 2;
    wall.position.z = -100;
    this.shaft.add(wall);
    this.rings = [];
    const ringGeometry = new THREE.TorusGeometry(9.55, 0.11, 6, 72);
    const trimGeometry = new THREE.TorusGeometry(9.3, 0.026, 5, 72);
    for (let i = 0; i < 28; i++) {
      const group = new THREE.Group();
      group.add(
        new THREE.Mesh(
          ringGeometry,
          new THREE.MeshStandardMaterial({
            color: 0x233941,
            metalness: 0.65,
            roughness: 0.45,
          }),
        ),
      );
      group.add(
        new THREE.Mesh(
          trimGeometry,
          new THREE.MeshBasicMaterial({
            color: 0x6fc6c8,
            transparent: true,
            opacity: 0.8,
          }),
        ),
      );
      this.shaft.add(group);
      this.rings.push(group);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 230, 6),
        new THREE.MeshStandardMaterial({
          color: 0x415f67,
          metalness: 0.7,
          roughness: 0.45,
        }),
      );
      rail.rotation.x = Math.PI / 2;
      rail.position.set(Math.cos(a) * 9.4, Math.sin(a) * 9.4, -100);
      this.shaft.add(rail);
      if (i % 2 === 0) {
        const stripe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 230, 5),
          new THREE.MeshBasicMaterial({ color: 0xe9a86a }),
        );
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(Math.cos(a) * 9.25, Math.sin(a) * 9.25, -100);
        this.shaft.add(stripe);
      }
    }
    this.exit = new THREE.Mesh(
      new THREE.CircleGeometry(9.6, 64),
      new THREE.MeshBasicMaterial({
        color: 0x9ee7eb,
        transparent: true,
        opacity: 0,
      }),
    );
    this.exit.position.z = -204;
    this.shaft.add(this.exit);
    // A compact capsule frame stays with the camera; no simulated lateral collision.
    this.cockpit = new THREE.Group();
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(7.4, 0.24, 10, 80),
      new THREE.MeshStandardMaterial({
        color: 0x1b3038,
        metalness: 0.7,
        roughness: 0.45,
      }),
    );
    rim.position.z = -7.5;
    this.cockpit.add(rim);
    const rimLight = new THREE.Mesh(
      new THREE.TorusGeometry(7.13, 0.025, 6, 80),
      new THREE.MeshBasicMaterial({ color: 0x8ce1d3 }),
    );
    rimLight.position.z = -7.48;
    this.cockpit.add(rimLight);
    this.shaft.add(this.cockpit);
  }
  render(state, dt, running) {
    if (this.view === "earth") {
      const narrow = innerWidth < 760;
      this.camera.position.set(
        this.look.x * 2,
        this.look.y * 2,
        narrow ? 32 : 20.5,
      );
      this.camera.lookAt(0, 0, 0);
      this.marker.position.y = (5 * state.x) / R;
      this.renderer.render(this.planet, this.camera);
    } else {
      // Distance is compressed visually at high speed. Phase accumulation avoids jumps
      // when speed or the time multiplier changes; physics coordinates remain unscaled.
      if (running)
        this.offset =
          (this.offset +
            dt *
              (1 + Math.min(28, Math.sqrt(Math.abs(state.v)) * 0.3)) *
              Math.sign(-state.v || 1)) %
          8;
      this.rings.forEach((ring, i) => {
        ring.position.z = 8 - i * 8 + this.offset;
      });
      const col = new THREE.Color(layerAt(state.x).color);
      this.wallMaterial.color.lerp(col, 0.045);
      this.shaft.fog.color.copy(this.wallMaterial.color).multiplyScalar(0.06);
      this.shaft.background.copy(this.shaft.fog.color);
      const farSide = state.x < 0;
      this.exit.material.opacity = farSide
        ? THREE.MathUtils.smoothstep(Math.abs(state.x) / R, 0.93, 1)
        : 0;
      this.camera.position.set(0, 0, 3);
      this.camera.lookAt(this.look.x * 12, -this.look.y * 12, -25);
      this.cockpit.quaternion.copy(this.camera.quaternion);
      this.cockpit.position.copy(this.camera.position);
      this.renderer.render(this.shaft, this.camera);
    }
  }
}
