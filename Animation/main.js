'use strict';

// Animation main script (extracted from embedded HTML)
// Expects a <canvas id="c"></canvas> in the document and THREE already loaded.

// ── renderer ──────────────────────────────────────────────
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = false;

// global error handler: show errors in the loading overlay so they are visible
window.addEventListener('error', (ev) => {
  console.error('Runtime error:', ev.error || ev.message);
  const ld = document.getElementById('loading');
  if (ld) {
    ld.classList.remove('hidden');
    ld.innerHTML = '<span style="color:#ffb4a3;">Error: '+
      (ev.error?.message || ev.message || 'Unknown') +
      '</span><pre style="color:#ffd;max-height:220px;overflow:auto;">'+
      (ev.error?.stack || '') +'</pre>';
  }
});
window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled rejection:', ev.reason);
  const ld = document.getElementById('loading');
  if (ld) {
    ld.classList.remove('hidden');
    ld.innerHTML = '<span style="color:#ffb4a3;">Promise Rejection</span><pre style="color:#ffd;max-height:220px;overflow:auto;">'+
      (ev.reason && ev.reason.stack) ? ev.reason.stack : String(ev.reason) +'</pre>';
  }
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09070D);
scene.fog = new THREE.FogExp2(0x09070D, 0.013);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 0, 30);
camera.lookAt(0, 0, 0);

// ── lighting ───────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xFFEEC7, 0.18));
const coreLight = new THREE.PointLight(0xFFC67E, 2.2, 22);
scene.add(coreLight);

// ── palette (warm amber/pearl from v1) ─────────────────────
const PAL = {
  pearl:   new THREE.Color(0xFFEEC7),
  apricot: new THREE.Color(0xFFC67E),
  almond:  new THREE.Color(0xD98452),
  coffee:  new THREE.Color(0x7B5132),
  dark:    new THREE.Color(0x09070D),
};

// ── glow sprite texture ────────────────────────────────────
function makeGlowTex() {
  const sz = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(sz/2,sz/2,0, sz/2,sz/2,sz/2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,230,180,0.9)');
  g.addColorStop(0.4,  'rgba(255,190,100,0.35)');
  g.addColorStop(0.75, 'rgba(200,130,60,0.08)');
  g.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  const t = new THREE.Texture(cv);
  t.needsUpdate = true;
  return t;
}
const glowTex = makeGlowTex();

// ── shared shader snippets ─────────────────────────────────
const ptVert = `
  attribute float size;
  varying vec3 vCol;
  void main() {
    vCol = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (380.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }`;
const ptFrag = `
  uniform sampler2D tex;
  varying vec3 vCol;
  void main() {
    vec4 s = texture2D(tex, gl_PointCoord);
    gl_FragColor = vec4(vCol, 1.0) * s;
  }`;

function makeSpriteMat() {
  return new THREE.ShaderMaterial({
    uniforms: { tex: { value: glowTex } },
    vertexShader: ptVert,
    fragmentShader: ptFrag,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

// ══════════════════════════════════════════════════════════
// NEURON LAYOUT
// ══════════════════════════════════════════════════════════
const N = 32;
const neurons = [];

for (let i = 0; i < N; i++) {
  // Fibonacci sphere for even distribution
  const phi   = Math.acos(1 - 2*(i+0.5)/N);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const r     = 8.5 + Math.random() * 4.5;
  const pos   = new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta) * 0.65,
    r * Math.cos(phi)
  );
  const somaR = 0.20 + Math.random() * 0.20;

  // colour: deeper nodes get coffee/almond, outer get apricot/pearl
  const depthT = (r - 8.5) / 4.5;
  const col = PAL.coffee.clone().lerp(PAL.pearl, depthT * 0.7 + Math.random() * 0.3);

  neurons.push({
    id: i, pos, somaR, col,
    activation: 0, targetAct: 0,
    restPhase: Math.random() * Math.PI * 2,
    driftSeed: Math.random() * 500,
  });
}

// ── synaptic connections ───────────────────────────────────
const synapses = [];
neurons.forEach(n => {
  const byDist = neurons
    .filter(o => o !== n)
    .sort((a,b) => n.pos.distanceTo(a.pos) - n.pos.distanceTo(b.pos));
  const k = 2 + Math.floor(Math.random() * 3); // 2-4 connections
  for (let c = 0; c < Math.min(k, byDist.length); c++) {
    const tgt = byDist[c];
    if (!synapses.some(s =>
      (s.from===n && s.to===tgt) || (s.from===tgt && s.to===n)
    )) {
      synapses.push({
        from: n, to: tgt,
        strength: 1 - c * 0.22,
        pulseT: Math.random(),
        pulseSpd: 0.10 + Math.random() * 0.14,
        active: false, activeT: 0,
        curve: null, axonMat: null, termMat: null,
      });
    }
  }
});

// ══════════════════════════════════════════════════════════
// GEOMETRY
// ══════════════════════════════════════════════════════════
const root = new THREE.Group();
scene.add(root);

// ── soma meshes ────────────────────────────────────────────
const somaGroup  = new THREE.Group();
const somaMeshes = [];
root.add(somaGroup);

neurons.forEach(n => {
  // slightly organic sphere via vertex perturbation
  const geo = new THREE.SphereGeometry(n.somaR, 22, 16);
  const pa  = geo.attributes.position;
  for (let v = 0; v < pa.count; v++) {
    const jitter = 1 + (Math.random() - 0.5) * 0.09;
    pa.setXYZ(v, pa.getX(v)*jitter, pa.getY(v)*jitter, pa.getZ(v)*jitter);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    color:            n.col,
    emissive:         n.col,
    emissiveIntensity: 0.12,
    shininess:        55,
    transparent:      true,
    opacity:          0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(n.pos);
  somaGroup.add(mesh);
  somaMeshes.push(mesh);

  // nucleus hint
  const nucGeo = new THREE.SphereGeometry(n.somaR * 0.4, 10, 10);
  const nucMat = new THREE.MeshBasicMaterial({
    color: PAL.pearl, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const nucMesh = new THREE.Mesh(nucGeo, nucMat);
  nucMesh.position.copy(n.pos);
  somaGroup.add(nucMesh);
});

// ── dendrites ─────────────────────────────────────────────
const dendGroup = new THREE.Group();
root.add(dendGroup);

function catmullCurve(origin, dir, length, steps) {
  const pts = [origin.clone()];
  let cur = origin.clone();
  let d   = dir.clone().normalize();
  for (let s = 0; s < steps; s++) {
    d.x += (Math.random()-0.5)*0.45;
    d.y += (Math.random()-0.5)*0.45;
    d.z += (Math.random()-0.5)*0.45;
    d.normalize();
    const sl = (length/steps) * (0.65 + Math.random()*0.7);
    cur = cur.clone().addScaledVector(d, sl);
    pts.push(cur.clone());
  }
  return new THREE.CatmullRomCurve3(pts);
}

neurons.forEach(n => {
  const numD = 5 + Math.floor(Math.random() * 4); // 5-8 dendrites
  for (let d = 0; d < numD; d++) {
    const ang  = (d / numD) * Math.PI * 2 + (Math.random()-0.5)*0.5;
    const elev = (Math.random()-0.5) * Math.PI * 0.75;
    const dir  = new THREE.Vector3(
      Math.cos(ang)*Math.cos(elev),
      Math.sin(elev),
      Math.sin(ang)*Math.cos(elev)
    );
    const len    = 0.55 + Math.random() * 1.1;
    const curve  = catmullCurve(n.pos, dir, len, 5);
    const radius = 0.013 + Math.random()*0.010;

    const geo = new THREE.TubeGeometry(curve, 12, radius, 5, false);
    const mat = new THREE.MeshBasicMaterial({
      color: n.col.clone().lerp(PAL.almond, 0.4),
      transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    dendGroup.add(new THREE.Mesh(geo, mat));

    // secondary branch (~50% chance)
    if (Math.random() > 0.5) {
      const branchOrigin = curve.getPoint(0.45 + Math.random()*0.3);
      const bDir = dir.clone();
      bDir.x += (Math.random()-0.5)*1.4;
      bDir.y += (Math.random()-0.5)*1.4;
      bDir.z += (Math.random()-0.5)*1.4;
      bDir.normalize();
      const bc  = catmullCurve(branchOrigin, bDir, len*0.48, 4);
      const bGeo = new THREE.TubeGeometry(bc, 8, radius*0.6, 4, false);
      dendGroup.add(new THREE.Mesh(bGeo, mat.clone()));

      // tertiary (~25% chance)
      if (Math.random() > 0.75) {
        const tOrigin = bc.getPoint(0.4 + Math.random()*0.3);
        const tDir = bDir.clone();
        tDir.x += (Math.random()-0.5)*1.6;
        tDir.y += (Math.random()-0.5)*1.6;
        tDir.z += (Math.random()-0.5)*1.6;
        tDir.normalize();
        const tc  = catmullCurve(tOrigin, tDir, len*0.28, 3);
        const tGeo = new THREE.TubeGeometry(tc, 6, radius*0.4, 4, false);
        dendGroup.add(new THREE.Mesh(tGeo, mat.clone()));
      }
    }
  }
});

// ── axons + myelin + terminals ────────────────────────────
const axonGroup = new THREE.Group();
root.add(axonGroup);

synapses.forEach(syn => {
  const a   = syn.from.pos;
  const b   = syn.to.pos;
  const mid = a.clone().lerp(b, 0.5);
  const perp = new THREE.Vector3(
    Math.random()-0.5, Math.random()-0.5, Math.random()-0.5
  ).normalize().multiplyScalar(a.distanceTo(b) * (0.14 + Math.random()*0.18));
  mid.add(perp);

  const startPt = a.clone().addScaledVector(b.clone().sub(a).normalize(), syn.from.somaR + 0.06);
  const endPt   = b.clone().addScaledVector(a.clone().sub(b).normalize(), syn.to.somaR   + 0.06);
  const curve   = new THREE.CatmullRomCurve3([startPt, mid, endPt]);
  syn.curve     = curve;

  const r   = 0.016 + syn.strength * 0.014;
  const col = syn.from.col.clone().lerp(PAL.almond, 0.35);

  // axon tube
  const axGeo = new THREE.TubeGeometry(curve, 22, r, 6, false);
  const axMat = new THREE.MeshBasicMaterial({
    color: col, transparent: true, opacity: 0.20,
    blending: THREE.AdditiveBlending,
  });
  axonGroup.add(new THREE.Mesh(axGeo, axMat));
  syn.axonMat = axMat;

  // myelin rings (nodes of Ranvier)
  const mCount = 4 + Math.round(syn.strength * 3);
  for (let m = 1; m < mCount; m++) {
    const t    = m / mCount;
    const pt   = curve.getPoint(t);
    const tang = curve.getTangent(t).normalize();
    const rGeo = new THREE.TorusGeometry(r * 3.2, r * 0.9, 5, 12);
    const rMat = new THREE.MeshBasicMaterial({
      color: PAL.coffee, transparent: true, opacity: 0.30,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.position.copy(pt);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), tang);
    axonGroup.add(ring);
  }

  // synaptic terminal bulb
  const termPt  = curve.getPoint(0.93);
  const termGeo = new THREE.SphereGeometry(r * 4.2, 10, 10);
  const termMat = new THREE.MeshBasicMaterial({
    color: col, transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending,
  });
  const term = new THREE.Mesh(termGeo, termMat);
  term.position.copy(termPt);
  axonGroup.add(term);
  syn.termMat  = termMat;
  syn.termMesh = term;
});

// ── synaptic pulse sprites ─────────────────────────────────
const nSyn    = synapses.length;
const pulsePA = new Float32Array(nSyn * 3);
const pulseCA = new Float32Array(nSyn * 3);
const pulseSA = new Float32Array(nSyn);

synapses.forEach((syn, i) => {
  const c = syn.from.col.clone().lerp(PAL.pearl, 0.5);
  pulseCA[i*3]   = c.r;
  pulseCA[i*3+1] = c.g;
  pulseCA[i*3+2] = c.b;
  pulseSA[i]     = 0;
});

const pulseGeo = new THREE.BufferGeometry();
pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePA, 3));
pulseGeo.setAttribute('color',    new THREE.BufferAttribute(pulseCA, 3));
pulseGeo.setAttribute('size',     new THREE.BufferAttribute(pulseSA, 1));
const pulsePts = new THREE.Points(pulseGeo, makeSpriteMat());
scene.add(pulsePts);

// ── soma glow sprites ──────────────────────────────────────
const somaGlowPA = new Float32Array(N * 3);
const somaGlowCA = new Float32Array(N * 3);
const somaGlowSA = new Float32Array(N);
neurons.forEach((n, i) => {
  somaGlowPA[i*3]   = n.pos.x;
  somaGlowPA[i*3+1] = n.pos.y;
  somaGlowPA[i*3+2] = n.pos.z;
  somaGlowCA[i*3]   = n.col.r;
  somaGlowCA[i*3+1] = n.col.g;
  somaGlowCA[i*3+2] = n.col.b;
  somaGlowSA[i]     = n.somaR * 16;
});
const somaGlowGeo = new THREE.BufferGeometry();
somaGlowGeo.setAttribute('position', new THREE.BufferAttribute(somaGlowPA, 3));
somaGlowGeo.setAttribute('color',    new THREE.BufferAttribute(somaGlowCA, 3));
somaGlowGeo.setAttribute('size',     new THREE.BufferAttribute(somaGlowSA, 1));
const somaGlowPts = new THREE.Points(somaGlowGeo, makeSpriteMat());
scene.add(somaGlowPts);

// ── traveling point lights ─────────────────────────────────
const fireLights = Array.from({length:5}, () => {
  const l = new THREE.PointLight(0xFFC67E, 0, 10);
  scene.add(l);
  return { l, synIdx: -1, t: 0 };
});
let lightCursor = 0;

// ══════════════════════════════════════════════════════════
// FIRING SYSTEM
// ══════════════════════════════════════════════════════════
const firingQueue = [];
let lastFire  = 0;
let totalFire = 0;

function queueFire(id, delay) {
  firingQueue.push({ id, at: performance.now()/1000 + (delay||0) });
}
function spontFire() {
  queueFire(Math.floor(Math.random()*N), 0);
  totalFire++;
}

// ══════════════════════════════════════════════════════════
// ANIMATION LOOP
// ══════════════════════════════════════════════════════════
const clock = new THREE.Clock();
let mx = 0, my = 0;
window.addEventListener('mousemove', e => {
  mx = (e.clientX/window.innerWidth)*2 - 1;
  my = (e.clientY/window.innerHeight)*2 - 1;
});

// cache HUD elements (they may be removed)
const hudHN = document.getElementById('hn');
const hudHS = document.getElementById('hs');
const hudHF = document.getElementById('hf');

function animate() {
  requestAnimationFrame(animate);
  const dt      = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  const now     = performance.now() / 1000;

  // spontaneous firing every 1.5-2.5s
  if (elapsed - lastFire > 1.5 + Math.random()) {
    spontFire();
    lastFire = elapsed;
  }

  // process queue
  for (let i = firingQueue.length-1; i >= 0; i--) {
    const item = firingQueue[i];
    if (now < item.at) continue;
    const n = neurons[item.id];
    n.targetAct = 1.0;
    synapses.forEach(syn => {
      if (syn.from !== n) return;
      syn.active  = true;
      syn.activeT = 0;
      // assign traveling light
      const lObj = fireLights[lightCursor % fireLights.length];
      lObj.synIdx = synapses.indexOf(syn);
      lObj.t = 0;
      lightCursor++;
      // cascade
      queueFire(syn.to.id, 0.45 + (1-syn.strength)*0.7);
      totalFire++;
    });
    firingQueue.splice(i, 1);
  }

  // ── update neurons ──────────────────────────────────────
  neurons.forEach((n, i) => {
    n.targetAct *= 0.93;
    n.activation += (n.targetAct - n.activation) * Math.min(1, dt*5.5);

    const breathe = 1 + Math.sin(elapsed*0.75 + n.restPhase)*0.035;
    const fireS   = 1 + n.activation * 0.32;
    somaMeshes[i].scale.setScalar(breathe * fireS);

    const fc = n.col.clone().lerp(PAL.pearl, n.activation*0.8);
    somaMeshes[i].material.color.copy(fc);
    somaMeshes[i].material.emissive.copy(fc);
    somaMeshes[i].material.emissiveIntensity = 0.10 + n.activation*0.75;

    somaGlowSA[i]     = n.somaR * (13 + n.activation*30);
    somaGlowCA[i*3]   = fc.r;
    somaGlowCA[i*3+1] = fc.g;
    somaGlowCA[i*3+2] = fc.b;
  });
  somaGlowGeo.attributes.size.needsUpdate  = true;
  somaGlowGeo.attributes.color.needsUpdate = true;

  // core light tracks average activation
  const avgAct = neurons.reduce((s,n)=>s+n.activation,0)/N;
  coreLight.intensity = 1.4 + avgAct * 5;

  // ── update synapses + pulses ────────────────────────────
  synapses.forEach((syn, i) => {
    if (syn.active) {
      syn.activeT += dt * syn.pulseSpd * 2.2;
      if (syn.activeT >= 1) { syn.active=false; syn.activeT=0; }
    } else {
      // ambient drift
      syn.pulseT = (syn.pulseT + dt * syn.pulseSpd * 0.25) % 1;
    }

    const t    = syn.active ? syn.activeT : syn.pulseT;
    // smooth step easing
    const ease = t*t*(3-2*t);
    const pt   = syn.curve.getPoint(Math.min(ease, 0.99));
    pulsePA[i*3]   = pt.x;
    pulsePA[i*3+1] = pt.y;
    pulsePA[i*3+2] = pt.z;

    const fade  = Math.sin(t * Math.PI);
    const bright = syn.active ? 1.0 : 0.12;
    pulseSA[i]  = fade * bright * (syn.active ? 11 : 4);

    // axon opacity pulses with signal
    syn.axonMat.opacity = syn.active
      ? 0.45 + fade*0.45
      : 0.16 + (syn.from.activation + syn.to.activation)*0.07;

    // terminal flash
    const termFade = syn.active && t > 0.82 ? (t-0.82)/0.18 : 0;
    syn.termMat.opacity = 0.35 + syn.from.activation*0.25 + termFade*0.6;
    syn.termMat.color.copy(
      syn.from.col.clone().lerp(PAL.pearl, termFade*0.85)
    );
  });
  pulseGeo.attributes.position.needsUpdate = true;
  pulseGeo.attributes.size.needsUpdate     = true;

  // ── traveling lights ────────────────────────────────────
  fireLights.forEach(lObj => {
    if (lObj.synIdx < 0) return;
    lObj.t += dt * 1.6;
    if (lObj.t >= 1) { lObj.l.intensity=0; lObj.synIdx=-1; return; }
    const syn = synapses[lObj.synIdx];
    lObj.l.position.copy(syn.curve.getPoint(Math.min(lObj.t, 0.99)));
    lObj.l.intensity = Math.sin(lObj.t * Math.PI) * 4.0;
    lObj.l.color.copy(PAL.apricot);
  });

  // ── scene rotation ──────────────────────────────────────
  root.rotation.y = elapsed * 0.016;
  root.rotation.x = Math.sin(elapsed * 0.038) * 0.055;

  // ── mouse parallax ──────────────────────────────────────
  camera.position.x += (mx*5  - camera.position.x) * 0.010;
  camera.position.y += (-my*3 - camera.position.y) * 0.010;
  camera.lookAt(0, 0, 0);

  if (hudHN) hudHN.textContent = N;
  if (hudHS) hudHS.textContent = synapses.length;
  if (hudHF) hudHF.textContent = totalFire;

  renderer.render(scene, camera);
}

// hide loading overlay if present (keeps it if user removed overlay)
const __loadingEl = document.getElementById('loading');
if (__loadingEl) setTimeout(() => __loadingEl.classList.add('hidden'), 400);

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
