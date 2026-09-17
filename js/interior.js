import * as THREE from "three";

// An illuminated artistic cross-section, not a photograph of inaccessible geology.
export const INTERIORS = [
  {
    depth: 0,
    name: "Crust",
    detail: "Fractured rock · mineral seams",
    color: "#8faaa9",
  },
  {
    depth: 35000,
    name: "Upper mantle",
    detail: "Hot silicate rock · mostly solid",
    color: "#e7a372",
  },
  {
    depth: 660000,
    name: "Lower mantle",
    detail: "Dense solid rock · extreme pressure",
    color: "#ff9b57",
  },
  {
    depth: 2891000,
    name: "Outer core",
    detail: "Liquid iron alloy · flowing metal",
    color: "#ffc763",
  },
  {
    depth: 5150000,
    name: "Inner core",
    detail: "Solid iron alloy · crystalline illustration",
    color: "#fff0bd",
  },
];
export function interiorStage(depth) {
  let stage = 0;
  for (let i = 1; i < INTERIORS.length; i++) {
    const width = i === 1 ? 8000 : 90000;
    const t = Math.max(
      0,
      Math.min(1, (depth - INTERIORS[i].depth + width) / (2 * width)),
    );
    stage += t * t * (3 - 2 * t);
  }
  return stage;
}
export function interiorDescription(depth) {
  return [...INTERIORS].reverse().find((x) => depth >= x.depth) ?? INTERIORS[0];
}
export class Interior {
  constructor(scene) {
    this.travel = 0;
    this.clock = 0;
    this.uniforms = {
      uStage: { value: 0 },
      uTravel: { value: 0 },
      uTime: { value: 0 },
      uShip: { value: 0 },
      uShipZ: { value: -80 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      extensions: { derivatives: true },
      vertexShader: `
        varying vec3 vRock;
        void main() {
          vRock = position;
          vec3 p = position;
          float relief = sin(p.y * .27 + atan(p.z,p.x)*7.)*.38
            + sin(p.y*.61 - atan(p.z,p.x)*11.)*.22;
          p.xz *= 1. + relief/14.;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
        }`,
      fragmentShader: `
        uniform float uStage, uTravel, uTime, uShip, uShipZ;
        varying vec3 vRock;
        float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float noise(vec3 p) {
          vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
            mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
            mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }
        float fbm(vec3 p) { return .55*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.07)+.05*noise(p*8.11); }
        vec2 crystalCell(vec2 p) {
          vec2 cell=floor(p),f=fract(p); float nearest=9.,second=9.,id=0.;
          for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
            vec2 g=vec2(float(x),float(y));
            vec2 point=vec2(hash(vec3(cell+g,2.)),hash(vec3(cell+g,9.)));
            vec2 d=g+point-f; float dist=dot(d,d);
            if(dist<nearest){second=nearest;nearest=dist;id=hash(vec3(cell+g,4.));}
            else second=min(second,dist);
          }
          return vec2(id,second-nearest);
        }
        void main() {
          // A cutaway exposes the buried hull outside the transparent tube.
          if(uShip>.001 && -vRock.z>14.-uShip*10. && abs(vRock.y-125.-uShipZ)<uShip*20.) discard;
          vec3 p=vec3(vRock.x,vRock.z,vRock.y-uTravel);
          float n=fbm(p*.35);
          float strata=sin(p.z*.6 + fbm(p*.13)*9. + sin(p.x*.3)*1.2);
          float aa=max(.018,fwidth(strata));
          float seams=1.-smoothstep(aa,aa+.09,abs(strata));
          float grain=noise(p*5.);
          vec3 crust=mix(vec3(.075,.10,.12),vec3(.38,.43,.42),n);
          crust *= .65 + .45*smoothstep(-.3,.3,strata);
          crust += vec3(.28,.45,.42)*seams*.65;
          vec3 mantle=mix(vec3(.11,.045,.025),vec3(.55,.24,.09),n);
          mantle*=.72+.32*grain;
          mantle+=vec3(1.,.28,.035)*pow(seams,2.)*(.2+.55*smoothstep(.3,.8,n));
          vec3 lower=mix(vec3(.19,.065,.022),vec3(.76,.33,.065),n);
          lower+=vec3(1.,.35,.035)*seams*.65;
          vec3 flow=p*.17; flow.z+=uTime*.07;
          float swirl=fbm(flow+vec3(fbm(flow+uTime*.025)*3.));
          float metal=sin(p.z*.17+p.x*.1+swirl*15.-uTime*.25)*.5+.5;
          vec3 outer=mix(vec3(.35,.075,.012),vec3(1.,.69,.17),smoothstep(.15,.85,metal));
          outer+=vec3(.8,.25,.02)*pow(metal,8.);
          vec2 facets=crystalCell(vec2(atan(p.y,p.x)*8.,p.z*.28)+n*.6);
          float crystal=1.-smoothstep(.012,.075,facets.y);
          vec3 inner=mix(vec3(.22,.13,.055),vec3(.64,.46,.21),facets.x);
          inner+=vec3(.35,.21,.06)*crystal;
          vec3 col=mix(crust,mantle,clamp(uStage,0.,1.));
          col=mix(col,lower,clamp(uStage-1.,0.,1.));
          col=mix(col,outer,clamp(uStage-2.,0.,1.));
          col=mix(col,inner,clamp(uStage-3.,0.,1.));
          // Fade far geometry into a continuous dark horizon, avoiding a hard end cap.
          float distanceInto=max(0.,125.-vRock.y);
          col *= .42;
          col=mix(col,vec3(.016,.022,.025),smoothstep(70.,270.,distanceInto));
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const rock = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, 320, 128, 160, true),
      this.material,
    );
    rock.rotation.x = Math.PI / 2;
    rock.position.z = -125;
    scene.add(rock);

    // Very light Fresnel reflection makes the tube readable while revealing the geology.
    const glassMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      vertexShader: `varying vec3 vNormal; varying vec3 vEye;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);vEye=-p.xyz;
          vNormal=normalMatrix*normal;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `varying vec3 vNormal; varying vec3 vEye;
        void main(){float f=pow(1.-abs(dot(normalize(vNormal),normalize(vEye))),3.);
          gl_FragColor=vec4(.38,.77,.85,.018+.075*f);
          #include <colorspace_fragment>
        }`,
    });
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(9.75, 9.75, 300, 96, 1, true),
      glassMaterial,
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.z = -120;
    glass.renderOrder = 2;
    scene.add(glass);

    // Mineral clusters protrude from the surrounding rock, always outside the glass.
    this.clusters = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({
        color: 0xb6c6c0,
        metalness: 0.45,
        roughness: 0.4,
        flatShading: true,
      }),
      100,
    );
    this.seeds = [];
    let seed = 184;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    this.dummy = new THREE.Object3D();
    for (let i = 0; i < 100; i++)
      this.seeds.push({
        a: rand() * Math.PI * 2,
        z: rand() * 270,
        scale: 0.3 + rand() * 0.9,
        spin: rand() * Math.PI,
      });
    scene.add(this.clusters);
    this.ship = new THREE.Group();
    const hull = new THREE.MeshStandardMaterial({
      color: 0x223b47,
      metalness: 0.8,
      roughness: 0.34,
      emissive: 0x10252f,
      emissiveIntensity: 0.6,
    });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x73f2dc });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 5.2, 160, 12),
      hull,
    );
    body.rotation.z = Math.PI / 2;
    this.ship.add(body);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(5.2, 22, 12), hull);
    bow.rotation.z = Math.PI / 2;
    bow.position.x = -91;
    this.ship.add(bow);
    for (let x = -70; x <= 70; x += 7) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(4.8, 0.12, 6, 12),
        hull,
      );
      rib.rotation.y = Math.PI / 2;
      rib.position.x = x;
      this.ship.add(rib);
      for (const z of [-2, 2]) {
        const window = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.07, 0.45),
          cyan,
        );
        window.position.set(x, -4.8, z);
        this.ship.add(window);
      }
    }
    for (const x of [-45, 35]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 32), hull);
      fin.rotation.y = 0.3;
      fin.position.set(x, 0, 0);
      this.ship.add(fin);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#102932";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = "#9df5dc";
    ctx.textAlign = "center";
    ctx.font = "bold 64px Arial";
    ctx.fillText("DEFINITELY A ROCK", 512, 112);
    ctx.font = "30px Arial";
    ctx.fillText("EARTH STORAGE · DO NOT DISTURB", 512, 180);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 5.5),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    sign.rotation.x = Math.PI / 2;
    sign.position.set(0, -5.25, 0);
    this.ship.add(sign);
    this.ship.position.y = 16;
    scene.add(this.ship);
    this.update(0, 0, false, 0);
  }
  update(depth, dt, running, velocity) {
    const appearance = Math.max(
      0,
      Math.min(1, (depth - 3000) / 5000, (35000 - depth) / 5000),
    );
    this.uniforms.uShip.value = appearance;
    this.ship.visible = appearance > 0;
    this.ship.position.z =
      -70 + Math.max(0, Math.min(1, (depth - 3000) / 32000)) * 100;
    this.uniforms.uShipZ.value = this.ship.position.z;
    const movement = running
      ? dt *
        Math.min(24, Math.sqrt(Math.abs(velocity)) * 0.24) *
        Math.sign(-velocity)
      : 0;
    this.travel += movement;
    if (running) this.clock += dt;
    this.uniforms.uStage.value = interiorStage(depth);
    this.uniforms.uTravel.value = this.travel;
    this.uniforms.uTime.value = this.clock;
    this.clusters.visible = depth < 2891000 || depth > 5150000;
    const core = depth > 5150000;
    this.clusters.material.color.set(core ? 0xffd38b : 0x99b7aa);
    this.clusters.material.emissive.set(core ? 0x523113 : 0x071213);
    this.seeds.forEach((s, i) => {
      const z = 20 - ((((s.z - this.travel) % 270) + 270) % 270);
      this.dummy.position.set(Math.cos(s.a) * 14.1, Math.sin(s.a) * 14.1, z);
      this.dummy.rotation.set(s.spin, s.a, s.spin * 0.5);
      this.dummy.scale.set(s.scale, s.scale * 1.8, s.scale * 0.65);
      this.dummy.updateMatrix();
      this.clusters.setMatrixAt(i, this.dummy.matrix);
    });
    this.clusters.instanceMatrix.needsUpdate = true;
  }
}
