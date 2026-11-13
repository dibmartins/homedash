// Carro 3D da tela de manutenção: um SUV compacto estilizado, feito só com código (modelo original, sem arquivo 3D externo).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function mountCar(el, opts = {}) {
  const W = el.clientWidth, H = el.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.5));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure || 1.0;
  renderer.shadowMap.enabled = true;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(opts.fov || 30, W / H, 0.1, 100);
  const cp = opts.camera || [6.8, 2.6, 6.8];
  camera.position.set(...cp);
  camera.lookAt(0, opts.lookY ?? 0.75, 0);

  const accent = new THREE.Color(opts.accent || "#22d3ee");
  const paint = new THREE.MeshPhysicalMaterial({ color: opts.paint || "#eef1f4", metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 });
  const black = new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.55, metalness: 0.2 });
  const plastic = new THREE.MeshStandardMaterial({ color: "#1a1b1f", roughness: 0.85 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#0b0f16", metalness: 0.6, roughness: 0.05, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 1, roughness: 0.18 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#2b2e34", metalness: 0.9, roughness: 0.3 });
  const tire = new THREE.MeshStandardMaterial({ color: "#0c0c0d", roughness: 0.9 });
  const headL = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8f6ff", emissiveIntensity: 2.2 });
  const tailL = new THREE.MeshStandardMaterial({ color: "#ff2a2a", emissive: "#ff1a1a", emissiveIntensity: 1.8 });

  const car = new THREE.Group();
  const L = 4.2, Wd = 1.76, wr = 0.37, wx = 1.3, wy = 0.37;

  // perfil lateral da carroceria (até a linha da cintura), com caixas de roda
  const s = new THREE.Shape();
  s.moveTo(-2.06, 0.42);
  s.lineTo(-2.1, 0.95);
  s.lineTo(-2.04, 1.06);
  s.lineTo(0.95, 1.06);
  s.quadraticCurveTo(1.7, 1.0, 2.02, 0.9);
  s.quadraticCurveTo(2.14, 0.8, 2.12, 0.5);
  s.lineTo(2.04, 0.34);
  s.lineTo(wx + 0.47, 0.34);
  s.absarc(wx, wy, 0.47, 0.06, Math.PI - 0.06, false);
  s.lineTo(-wx + 0.47, 0.34);
  s.absarc(-wx, wy, 0.47, 0.06, Math.PI - 0.06, false);
  s.lineTo(-1.98, 0.34);
  s.lineTo(-2.06, 0.42);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: Wd - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 6, curveSegments: 32 });
  bodyGeo.translate(0, 0, -(Wd - 0.16) / 2);
  const body = new THREE.Mesh(bodyGeo, paint); body.castShadow = true; car.add(body);

  // estufa (vidros)
  const g = new THREE.Shape();
  g.moveTo(-2.0, 1.04);
  g.lineTo(0.95, 1.04);
  g.lineTo(0.25, 1.52);
  g.lineTo(-1.66, 1.56);
  g.quadraticCurveTo(-1.98, 1.54, -2.04, 1.3);
  g.lineTo(-2.0, 1.04);
  const glassGeo = new THREE.ExtrudeGeometry(g, { depth: Wd - 0.34, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4 });
  glassGeo.translate(0, 0, -(Wd - 0.34) / 2);
  car.add(new THREE.Mesh(glassGeo, glass));

  // teto na cor da carroceria + rack
  const r = new THREE.Shape();
  r.moveTo(-2.0, 1.5); r.lineTo(0.24, 1.5); r.lineTo(0.17, 1.6); r.lineTo(-1.7, 1.63); r.quadraticCurveTo(-1.98, 1.61, -2.0, 1.5);
  const roofGeo = new THREE.ExtrudeGeometry(r, { depth: Wd - 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4 });
  roofGeo.translate(0, 0, -(Wd - 0.3) / 2);
  car.add(new THREE.Mesh(roofGeo, paint));
  for (const z of [-0.68, 0.68]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.045, 0.05), black);
    rail.position.set(-0.75, 1.69, z); car.add(rail);
  }
  // colunas B e C escuras
  for (const z of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.02), black);
    b.position.set(-0.6, 1.3, z * (Wd / 2 - 0.12)); b.rotation.z = -0.08; car.add(b);
  }

  // faixa preta frontal com faróis (assinatura de luz)
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, Wd - 0.1), black);
  grille.position.set(2.13, 0.78, 0); car.add(grille);
  for (const z of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.42), headL);
    hl.position.set(2.165, 0.83, z * 0.6); car.add(hl);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.3), headL);
    drl.position.set(2.17, 0.73, z * 0.66); car.add(drl);
  }
  const logo = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 32), chrome);
  logo.rotation.y = Math.PI / 2; logo.position.set(2.17, 0.8, 0); car.add(logo);
  // para-choque inferior / grade baixa
  const lowG = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 1.1), plastic);
  lowG.position.set(2.1, 0.5, 0); car.add(lowG);

  // traseira: faixa refletiva escura ligando as lanternas
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, Wd - 0.2), new THREE.MeshStandardMaterial({ color: "#3a0b0b", emissive: "#5a0000", emissiveIntensity: 0.6, roughness: 0.2 }));
  band.position.set(-2.135, 0.92, 0); car.add(band);
  for (const z of [-1, 1]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.36), tailL);
    tl.position.set(-2.13, 0.92, z * 0.66); car.add(tl);
  }
  const rearPl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 1.4), plastic);
  rearPl.position.set(-2.1, 0.45, 0); car.add(rearPl);

  // moldura preta das caixas de roda e saia lateral
  for (const x of [-wx, wx]) for (const z of [-1, 1]) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 40, Math.PI - 0.1), plastic);
    arch.position.set(x, wy, z * (Wd / 2 - 0.01)); arch.rotation.z = 0.05; car.add(arch);
  }
  for (const z of [-1, 1]) {
    const sk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.05), plastic);
    sk.position.set(0, 0.4, z * (Wd / 2 - 0.01)); car.add(sk);
    // retrovisores
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.16), paint);
    m.position.set(0.78, 1.12, z * (Wd / 2 + 0.06)); car.add(m);
    // maçanetas
    for (const x of [0.1, -0.95]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.02), black);
      h.position.set(x, 0.98, z * (Wd / 2 + 0.005)); car.add(h);
    }
  }

  // rodas
  const wheels = [];
  function wheel() {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(wr - 0.09, 0.1, 16, 48), tire);
    t.scale.z = 1.3; w.add(t);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(wr - 0.11, wr - 0.11, 0.2, 48), rimMat);
    disc.rotation.x = Math.PI / 2; w.add(disc);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, wr - 0.13, 0.03), chrome);
      sp.position.y = (wr - 0.13) / 2; const p = new THREE.Group(); p.add(sp);
      p.rotation.z = (i / 5) * Math.PI * 2; p.position.z = 0.11; w.add(p);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 20), chrome);
    hub.rotation.x = Math.PI / 2; w.add(hub);
    return w;
  }
  for (const x of [-wx, wx]) for (const z of [-1, 1]) {
    const w = wheel(); w.position.set(x, wy, z * (Wd / 2 - 0.1));
    if (z < 0) w.rotation.y = Math.PI;
    car.add(w); wheels.push(w);
  }

  car.scale.set(0.92, 1.04, 1.02);
  car.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(car);

  // piso: disco com brilho + anel de destaque (plataforma giratória)
  const floorTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d"); const gr = x.createRadialGradient(256, 256, 10, 256, 256, 256);
    gr.addColorStop(0, "rgba(60,70,85,0.9)"); gr.addColorStop(0.5, "rgba(25,30,38,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512); return new THREE.CanvasTexture(c);
  })();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; scene.add(floor);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.6 }));
  shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.position.y = 0.002; shadowPlane.receiveShadow = true; scene.add(shadowPlane);
  const ringMats = [];
  if (opts.ring !== false) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.75, 2.8, 128), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.86, 3.3, 128), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.08 }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.003; scene.add(ring2);
    ringMats.push(ring.material, ring2.material);
  }

  const key = new THREE.DirectionalLight("#ffffff", 2.2); key.position.set(4, 8, 3); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(accent, 1.4); rim.position.set(-5, 3, -4); scene.add(rim);
  scene.add(new THREE.HemisphereLight("#9fb3c8", "#000000", 0.4));

  car.rotation.y = opts.angle ?? -0.6;
  const spin = opts.spin ?? 0.12; // radianos por segundo: uma volta a cada ~50 s
  const minFrame = 1000 / (opts.fps || 30); // 30 quadros por segundo bastam para um giro lento
  let last = performance.now(), drawn = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (t - drawn < minFrame) return;
    const dt = Math.min(0.2, (t - last) / 1000); last = t; drawn = t;
    car.rotation.y += spin * dt;
    renderer.render(scene, camera);
  }
  renderer.render(scene, camera);
  if (spin) requestAnimationFrame(frame);
  window.addEventListener("resize", () => {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  });
  return {
    setAccent(c) { const col = new THREE.Color(c); ringMats.forEach(m => m.color.copy(col)); rim.color.copy(col); renderer.render(scene, camera); },
    setPaint(c) { paint.color.set(c); renderer.render(scene, camera); },
  };
}
