/* =========================================================
   DECISION NETWORK v2 — Investment Journal Hero Animation
   
   A dense, richly-connected layered network simulating real
   analysis flow: raw data -> aggregated signals -> thesis
   branches -> a single decision core. This version adds:
   
   - Dense many-to-many connections (each node links to several
     targets in the next layer, weighted by proximity) instead
     of 1-2 sparse links
   - Lateral "peer" connections within each layer (real network
     diagrams show intra-layer relationships, not just a strict
     tree)
   - Tube-geometry edges with real visible thickness and additive
     glow, instead of flat GL lines
   - True cascading signal propagation: activation visibly
     ripples layer-by-layer in synchronized waves (a "thought"
     moving through the network), not just independent looping
     pulses with no relationship to each other
   - Structured nodes: each is a core sphere + rotating orbital
     ring + outer wireframe shell, sized/lit by current activation
     - not a single flat sphere
   - A HUD data readout (node/edge/cascade counts, live "confidence"
     metric derived from core activation)
   ========================================================= */

const container = document.getElementById('canvas-container');

// ---------- SCENE SETUP ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09070D);
scene.fog = new THREE.FogExp2(0x09070D, 0.024);

const camera = new THREE.PerspectiveCamera(
  48, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set(0, 1.5, 17);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: false, powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// ---------- COLOR PALETTE ----------
const COLORS = {
  black: 0x09070D, pearl: 0xFFEEC7, apricot: 0xFFC67E,
  almond: 0xD98452, coffee: 0x7B5132
};
const palette = [
  new THREE.Color(COLORS.pearl), new THREE.Color(COLORS.apricot),
  new THREE.Color(COLORS.almond), new THREE.Color(COLORS.coffee)
];

// ---------- LIGHTING ----------
scene.add(new THREE.AmbientLight(0xFFEEC7, 0.3));
const coreLight = new THREE.PointLight(0xFFEEC7, 2.5, 14);
scene.add(coreLight);

// =========================================================
// NETWORK GENERATION
// =========================================================

const LAYER_CONFIG = [
  { count: 32, radius: 10.5, depthSpread: 6.5, sizeRange: [0.045, 0.085] }, // raw data
  { count: 18, radius: 7.0,  depthSpread: 4.5, sizeRange: [0.07, 0.12] },   // signals
  { count: 8,  radius: 3.6,  depthSpread: 2.6, sizeRange: [0.11, 0.17] },   // thesis
  { count: 1,  radius: 0,    depthSpread: 0,   sizeRange: [0.36, 0.36] }    // decision core
];

const nodes = [];
const edges = [];        // forward (feed-forward) connections, layer L -> L+1
const lateralEdges = []; // peer connections within the same layer

let nodeIdCounter = 0;

LAYER_CONFIG.forEach((layerCfg, layerIndex) => {
  for (let i = 0; i < layerCfg.count; i++) {
    let x, y, z;
    if (layerCfg.radius === 0) {
      x = 0; y = 0; z = 0;
    } else {
      const angle = (i / layerCfg.count) * Math.PI * 2 + layerIndex * 0.4;
      const r = layerCfg.radius * (0.7 + Math.random() * 0.3);
      x = Math.cos(angle) * r;
      y = Math.sin(angle * 1.3) * r * 0.45 + (Math.random() - 0.5) * 1.5;
      z = (Math.random() - 0.5) * layerCfg.depthSpread;
    }

    const size = THREE.MathUtils.lerp(layerCfg.sizeRange[0], layerCfg.sizeRange[1], Math.random());

    let color;
    if (layerIndex === 0) color = palette[3].clone().lerp(palette[2], Math.random() * 0.6);
    else if (layerIndex === 1) color = palette[2].clone().lerp(palette[1], Math.random() * 0.7);
    else if (layerIndex === 2) color = palette[1].clone().lerp(palette[0], Math.random() * 0.6);
    else color = palette[0].clone();

    nodes.push({
      id: nodeIdCounter++,
      position: new THREE.Vector3(x, y, z),
      basePosition: new THREE.Vector3(x, y, z),
      size, color, layer: layerIndex,
      pulsePhase: Math.random() * Math.PI * 2,
      driftSeed: Math.random() * 1000,
      activation: 0.15,
      targetActivation: 0.15
    });
  }
});

// ---------- FEED-FORWARD CONNECTIONS (dense, many-to-many) ----------
for (let layerIndex = 0; layerIndex < LAYER_CONFIG.length - 1; layerIndex++) {
  const currentLayerNodes = nodes.filter(n => n.layer === layerIndex);
  const nextLayerNodes = nodes.filter(n => n.layer === layerIndex + 1);

  currentLayerNodes.forEach(node => {
    const sorted = [...nextLayerNodes].sort((a, b) =>
      node.basePosition.distanceTo(a.basePosition) - node.basePosition.distanceTo(b.basePosition)
    );

    const maxConnections = nextLayerNodes.length === 1
      ? 1
      : Math.min(nextLayerNodes.length, 2 + Math.floor(Math.random() * 3));

    for (let c = 0; c < maxConnections; c++) {
      const target = sorted[Math.min(c, sorted.length - 1)];
      const strength = 1 - c * 0.22;
      edges.push({
        from: node, to: target,
        strength,
        pulseSpeed: 0.4 + Math.random() * 0.5,
        pulseOffset: Math.random(),
        cascadeDelay: layerIndex * 0.35 + Math.random() * 0.15
      });
    }
  });
}

// ---------- LATERAL (PEER) CONNECTIONS WITHIN EACH LAYER ----------
for (let layerIndex = 0; layerIndex < LAYER_CONFIG.length; layerIndex++) {
  const layerNodes = nodes.filter(n => n.layer === layerIndex);
  if (layerNodes.length < 3) continue;

  layerNodes.forEach(node => {
    const sorted = [...layerNodes]
      .filter(n => n !== node)
      .sort((a, b) => node.basePosition.distanceTo(a.basePosition) - node.basePosition.distanceTo(b.basePosition));

    const connCount = Math.min(sorted.length, 1 + (Math.random() > 0.5 ? 1 : 0));
    for (let c = 0; c < connCount; c++) {
      const target = sorted[c];
      const exists = lateralEdges.some(e =>
        (e.from === node && e.to === target) || (e.from === target && e.to === node)
      );
      if (!exists) {
        lateralEdges.push({ from: node, to: target, pulsePhase: Math.random() * Math.PI * 2 });
      }
    }
  });
}

// =========================================================
// RENDERING: NODES — core sphere + orbital ring + wireframe shell
// =========================================================

const nodeGeo = new THREE.SphereGeometry(1, 16, 16);
const nodeMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMaterial, nodes.length);
nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nodes.length * 3), 3);
scene.add(nodeMesh);

const shellGeo = new THREE.IcosahedronGeometry(1, 1);
const shellEdgesGeo = new THREE.EdgesGeometry(shellGeo);

// EdgesGeometry/LineSegments can't be instanced directly in r128, so we
// approximate the "wireframe shell" look with a thin instanced
// icosahedron mesh rendered with a wireframe material instead — same
// visual result (faceted outline around each node), single draw call
// for all 59 shells instead of 59 separate LineSegments objects.
const shellMaterial = new THREE.MeshBasicMaterial({
  color: 0xFFEEC7, wireframe: true, transparent: true,
  opacity: 0.18, blending: THREE.AdditiveBlending, toneMapped: false
});
const shellMesh = new THREE.InstancedMesh(shellGeo, shellMaterial, nodes.length);
scene.add(shellMesh);

// orbital rings — instanced (only nodes in layer >= 1 get a ring; we
// still allocate one instance per such node and hide unused ones by
// scaling to zero if needed, but since every layer>=1 node gets a ring
// here, no hiding is necessary)
const ringNodes = nodes.filter(n => n.layer >= 1);
const ringGeo = new THREE.TorusGeometry(1.5, 0.04, 6, 24);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0xFFC67E, transparent: true, opacity: 0.35,
  blending: THREE.AdditiveBlending, toneMapped: false
});
const ringMesh = new THREE.InstancedMesh(ringGeo, ringMaterial, ringNodes.length);
ringMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ringNodes.length * 3), 3);
scene.add(ringMesh);

const ringSpins = ringNodes.map(() => (0.3 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1));
const ringBaseRotX = ringNodes.map(() => Math.random() * Math.PI);
const ringBaseRotY = ringNodes.map(() => Math.random() * Math.PI);

// ---------- GLOW SPRITES ----------
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}
const glowTexture = createGlowTexture();

const glowGeo = new THREE.BufferGeometry();
const glowPositions = new Float32Array(nodes.length * 3);
const glowColors = new Float32Array(nodes.length * 3);
const glowSizes = new Float32Array(nodes.length);

nodes.forEach((node, i) => {
  glowPositions[i*3] = node.position.x;
  glowPositions[i*3+1] = node.position.y;
  glowPositions[i*3+2] = node.position.z;
  glowColors[i*3] = node.color.r; glowColors[i*3+1] = node.color.g; glowColors[i*3+2] = node.color.b;
  glowSizes[i] = node.size * (node.layer === 3 ? 16 : 9);
});

glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
glowGeo.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));

const glowMaterial = new THREE.ShaderMaterial({
  uniforms: { pointTexture: { value: glowTexture } },
  vertexShader: `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    void main() {
      vec4 tex = texture2D(pointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, 1.0) * tex;
    }
  `,
  vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
});
const glowPoints = new THREE.Points(glowGeo, glowMaterial);
scene.add(glowPoints);

// =========================================================
// RENDERING: EDGES — thin instanced cylinders for real visible
// thickness, repositioned via matrices each frame (cheap).
// =========================================================

const edgeCylGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
const edgeMaterial = new THREE.MeshBasicMaterial({
  color: 0xFFC67E, transparent: true, opacity: 0.22,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const edgeMesh = new THREE.InstancedMesh(edgeCylGeo, edgeMaterial, edges.length);
edgeMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(edges.length * 3), 3);
scene.add(edgeMesh);

const lateralMaterial = new THREE.MeshBasicMaterial({
  color: 0xD98452, transparent: true, opacity: 0.1,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const lateralMesh = new THREE.InstancedMesh(edgeCylGeo, lateralMaterial, lateralEdges.length);
scene.add(lateralMesh);

const edgeDummy = new THREE.Object3D();

function orientEdgeInstance(mesh, index, from, to, radius) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  if (length < 0.001) return;
  const mid = from.clone().add(to).multiplyScalar(0.5);
  edgeDummy.position.copy(mid);
  edgeDummy.scale.set(radius, length, radius);
  const axis = new THREE.Vector3(0, 1, 0);
  edgeDummy.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
  edgeDummy.updateMatrix();
  mesh.setMatrixAt(index, edgeDummy.matrix);
}

// =========================================================
// RENDERING: PULSES traveling along edges (1 per edge, looping)
// =========================================================

const pulseGeo = new THREE.BufferGeometry();
const pulsePositions = new Float32Array(edges.length * 3);
const pulseColors = new Float32Array(edges.length * 3);
const pulseSizes = new Float32Array(edges.length);

edges.forEach((edge, i) => {
  const c = edge.to.color;
  pulseColors[i*3] = c.r; pulseColors[i*3+1] = c.g; pulseColors[i*3+2] = c.b;
  pulseSizes[i] = 5 + Math.random() * 4;
});

pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));
pulseGeo.setAttribute('size', new THREE.BufferAttribute(pulseSizes, 1));

const pulseMaterial = new THREE.ShaderMaterial({
  uniforms: { pointTexture: { value: glowTexture } },
  vertexShader: `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    void main() {
      vec4 tex = texture2D(pointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, 1.0) * tex;
    }
  `,
  vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
});
const pulsePoints = new THREE.Points(pulseGeo, pulseMaterial);
scene.add(pulsePoints);

// =========================================================
// CASCADING SIGNAL PROPAGATION
//
// Periodically a "thought" originates at a random raw-data node
// and cascades inward layer by layer, raising activation of
// nodes along its path and fading as it passes — a coherent
// signal flow rather than independent unrelated pulses.
// =========================================================

const cascades = [];
let cascadeCount = 0;
let lastCascadeTime = -10;
const CASCADE_INTERVAL = 2.2;

const nodesByLayer = LAYER_CONFIG.map((_, i) => nodes.filter(n => n.layer === i));

function spawnCascade(elapsed) {
  const origin = nodesByLayer[0][Math.floor(Math.random() * nodesByLayer[0].length)];
  const path = [origin];

  let current = origin;
  for (let layerIndex = 0; layerIndex < LAYER_CONFIG.length - 1; layerIndex++) {
    const outgoing = edges.filter(e => e.from === current);
    if (outgoing.length === 0) break;
    outgoing.sort((a, b) => b.strength - a.strength);
    const chosen = outgoing[Math.random() < 0.7 ? 0 : Math.min(1, outgoing.length - 1)];
    path.push(chosen.to);
    current = chosen.to;
  }

  cascades.push({ startTime: elapsed, path, duration: 2.6 });
  cascadeCount++;
}

// =========================================================
// BACKGROUND STARFIELD
// =========================================================
const STAR_COUNT = 1800;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
const starColors = new Float32Array(STAR_COUNT * 3);
const starSizes = new Float32Array(STAR_COUNT);

for (let i = 0; i < STAR_COUNT; i++) {
  const radius = 25 + Math.random() * 50;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random() * 2) - 1);
  starPositions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i*3+1] = radius * Math.cos(phi);
  starPositions[i*3+2] = radius * Math.sin(phi) * Math.sin(theta);
  const c = palette[Math.floor(Math.random() * palette.length)].clone();
  c.multiplyScalar(0.2 + Math.random() * 0.5);
  starColors[i*3] = c.r; starColors[i*3+1] = c.g; starColors[i*3+2] = c.b;
  starSizes[i] = Math.random() * 1.2 + 0.3;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

const starMaterial = new THREE.ShaderMaterial({
  uniforms: { pointTexture: { value: glowTexture } },
  vertexShader: `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (150.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    void main() {
      vec4 tex = texture2D(pointTexture, gl_PointCoord);
      gl_FragColor = vec4(vColor, 0.7) * tex;
    }
  `,
  vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
});
const stars = new THREE.Points(starGeo, starMaterial);
scene.add(stars);

// =========================================================
// MOUSE / SCROLL INTERACTION
// =========================================================
let mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  targetRotY = mouseX * 0.3;
  targetRotX = mouseY * 0.15;
});
let scrollY = 0;
window.addEventListener('scroll', () => { scrollY = window.scrollY; });

// =========================================================
// HUD ELEMENTS
// =========================================================
const hudNodes = document.getElementById('hud-nodes');
const hudEdges = document.getElementById('hud-edges');
const hudCascades = document.getElementById('hud-cascades');
const hudConfidence = document.getElementById('hud-confidence');
const hudTime = document.getElementById('hud-time');

hudNodes.textContent = nodes.length;
hudEdges.textContent = edges.length + lateralEdges.length;

// =========================================================
// ANIMATION LOOP
// =========================================================
const clock = new THREE.Clock();
const dummy = new THREE.Object3D();
const colorObj = new THREE.Color();

const networkGroup = new THREE.Group();
networkGroup.add(nodeMesh, glowPoints, edgeMesh, lateralMesh, pulsePoints, shellMesh, ringMesh);
scene.add(networkGroup);

const coreNode = nodes.find(n => n.layer === 3);

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  const dt = clock.getDelta();

  // ---------- SPAWN CASCADES PERIODICALLY ----------
  if (elapsed - lastCascadeTime > CASCADE_INTERVAL) {
    spawnCascade(elapsed);
    lastCascadeTime = elapsed;
    hudCascades.textContent = cascadeCount;
  }

  // ---------- DECAY ALL TARGET ACTIVATIONS TOWARD BASELINE ----------
  nodes.forEach(n => { n.targetActivation = 0.15; });

  // ---------- APPLY ACTIVE CASCADES ----------
  for (let i = cascades.length - 1; i >= 0; i--) {
    const cascade = cascades[i];
    const age = elapsed - cascade.startTime;
    if (age > cascade.duration) {
      cascades.splice(i, 1);
      continue;
    }

    const progress = age / cascade.duration;
    const currentLayerFloat = progress * (cascade.path.length - 1);

    cascade.path.forEach((node, idx) => {
      const dist = Math.abs(currentLayerFloat - idx);
      const activation = Math.max(0, 1 - dist * 1.4);
      node.targetActivation = Math.max(node.targetActivation, activation);
    });
  }

  if (coreNode) {
    coreLight.intensity = 1.5 + coreNode.activation * 4;
  }

  // ---------- NODE DRIFT + ACTIVATION SMOOTHING + RENDER ----------
  nodes.forEach((node, i) => {
    const driftX = Math.sin(elapsed * 0.3 + node.driftSeed) * 0.08;
    const driftY = Math.cos(elapsed * 0.25 + node.driftSeed * 1.3) * 0.08;
    const driftZ = Math.sin(elapsed * 0.2 + node.driftSeed * 0.7) * 0.08;
    node.position.set(
      node.basePosition.x + driftX,
      node.basePosition.y + driftY,
      node.basePosition.z + driftZ
    );

    node.activation += (node.targetActivation - node.activation) * Math.min(1, dt * 4);

    const pulse = 1 + Math.sin(elapsed * 1.5 + node.pulsePhase) * 0.12;
    const activationBoost = 1 + node.activation * 0.9;
    const scale = node.size * pulse * activationBoost;

    dummy.position.copy(node.position);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    nodeMesh.setMatrixAt(i, dummy.matrix);

    colorObj.copy(node.color).multiplyScalar(0.7 + pulse * 0.2 + node.activation * 0.6);
    nodeMesh.setColorAt(i, colorObj);

    glowPositions[i*3] = node.position.x;
    glowPositions[i*3+1] = node.position.y;
    glowPositions[i*3+2] = node.position.z;
    glowSizes[i] = node.size * (node.layer === 3 ? 16 : 9) * (1 + node.activation * 0.8);
  });

  nodeMesh.instanceMatrix.needsUpdate = true;
  nodeMesh.instanceColor.needsUpdate = true;
  glowPoints.geometry.attributes.position.needsUpdate = true;
  glowPoints.geometry.attributes.size.needsUpdate = true;

  // ---------- SHELLS (instanced wireframe icosahedra) ----------
  nodes.forEach((node, i) => {
    const shellScale = node.size * 1.5 * (1 + node.activation * 0.15);
    dummy.position.copy(node.position);
    dummy.scale.set(shellScale, shellScale, shellScale);
    dummy.rotation.set(elapsed * 0.15 + node.driftSeed, elapsed * 0.22 + node.driftSeed, 0);
    dummy.updateMatrix();
    shellMesh.setMatrixAt(i, dummy.matrix);
  });
  shellMesh.instanceMatrix.needsUpdate = true;
  shellMesh.material.opacity = 0.14 + (coreNode ? coreNode.activation * 0.1 : 0);

  // ---------- ORBITAL RINGS (instanced) ----------
  ringNodes.forEach((node, i) => {
    const ringScale = node.size * 0.9 * (1 + node.activation * 0.5);
    dummy.position.copy(node.position);
    dummy.scale.set(ringScale, ringScale, ringScale);
    dummy.rotation.set(
      ringBaseRotX[i],
      ringBaseRotY[i],
      elapsed * ringSpins[i]
    );
    dummy.updateMatrix();
    ringMesh.setMatrixAt(i, dummy.matrix);
    colorObj.copy(node.color).multiplyScalar(0.6 + node.activation * 0.8);
    ringMesh.setColorAt(i, colorObj);
  });
  ringMesh.instanceMatrix.needsUpdate = true;
  ringMesh.instanceColor.needsUpdate = true;

  // ---------- EDGES ----------
  edges.forEach((edge, i) => {
    const avgActivation = (edge.from.activation + edge.to.activation) / 2;
    const radius = 0.012 + edge.strength * 0.012 + avgActivation * 0.025;
    orientEdgeInstance(edgeMesh, i, edge.from.position, edge.to.position, radius);
    colorObj.copy(edge.to.color).multiplyScalar(0.5 + avgActivation * 1.2);
    edgeMesh.setColorAt(i, colorObj);
  });
  edgeMesh.instanceMatrix.needsUpdate = true;
  edgeMesh.instanceColor.needsUpdate = true;

  lateralEdges.forEach((edge, i) => {
    orientEdgeInstance(lateralMesh, i, edge.from.position, edge.to.position, 0.006);
  });
  lateralMesh.instanceMatrix.needsUpdate = true;

  // ---------- PULSES TRAVELING ALONG EDGES ----------
  edges.forEach((edge, i) => {
    const t = ((elapsed * edge.pulseSpeed) + edge.pulseOffset) % 1;
    const eased = t * t * (3 - 2 * t);
    pulsePositions[i*3]   = THREE.MathUtils.lerp(edge.from.position.x, edge.to.position.x, eased);
    pulsePositions[i*3+1] = THREE.MathUtils.lerp(edge.from.position.y, edge.to.position.y, eased);
    pulsePositions[i*3+2] = THREE.MathUtils.lerp(edge.from.position.z, edge.to.position.z, eased);
    const fade = Math.sin(t * Math.PI);
    const avgActivation = (edge.from.activation + edge.to.activation) / 2;
    pulseSizes[i] = (4 + avgActivation * 6 + Math.sin(elapsed*3+i)*1.5) * (0.3 + fade * 0.9);
  });
  pulseGeo.attributes.position.needsUpdate = true;
  pulseGeo.attributes.size.needsUpdate = true;

  // ---------- WHOLE NETWORK SLOW ROTATION ----------
  networkGroup.rotation.y = elapsed * 0.035;
  networkGroup.rotation.x = Math.sin(elapsed * 0.07) * 0.05;

  // ---------- STARFIELD ----------
  stars.rotation.y = elapsed * 0.008;

  // ---------- HUD UPDATES ----------
  hudTime.textContent = elapsed.toFixed(1);
  if (coreNode) {
    hudConfidence.textContent = Math.round(15 + coreNode.activation * 85);
  }

  // ---------- CAMERA ----------
  const scrollFactor = Math.min(scrollY / window.innerHeight, 1);
  const targetX = targetRotY * 5;
  const targetY = 1.5 + targetRotX * 2.5 + scrollFactor * 5;
  const targetZ = 17 - scrollFactor * 6;
  camera.position.x += (targetX - camera.position.x) * 0.02;
  camera.position.y += (targetY - camera.position.y) * 0.02;
  camera.position.z += (targetZ - camera.position.z) * 0.02;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// =========================================================
// RESIZE
// =========================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================
// START
// =========================================================
animate();

window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading').classList.add('hidden');
  }, 400);
});
