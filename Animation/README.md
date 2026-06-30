# Decision network — hero animation (v2)

A layered, densely-connected neural/decision-tree network: many small "raw
data" nodes on the outside funnel through "signal" and "thesis" layers
into a single bright "decision" core at the center, with coherent signal
cascades rippling through the network and a live data HUD.

**This is v2** — a significant rebuild from the original version, adding
real density, lateral connections, structured nodes, and an actual
signal-propagation system instead of independent looping pulses. See
"What changed from v1" below if you're comparing.

| Color | Hex | Role |
|---|---|---|
| Black | `#09070D` | background |
| Pearl Beige | `#FFEEC7` | decision core / brightest signals |
| Apricot Cream | `#FFC67E` | thesis layer |
| Toasted Almond | `#D98452` | signal layer |
| Coffee Bean | `#7B5132` | raw data layer (outermost, dimmest) |

## How to run

1. Open this folder in VS Code.
2. Install the **Live Server** extension if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

No build step — Three.js loads from CDN.

## What changed from v1

| | v1 | v2 |
|---|---|---|
| Connections per node | 1-2 (sparse tree) | 2-4 to next layer + 1-2 lateral peers (dense web) |
| Edge rendering | Flat GL lines | Instanced cylinders — real visible thickness, glow scales with activation |
| Signal flow | Independent per-edge loop, no relationship between pulses | Coherent cascades: a signal originates at a random data node and visibly ripples layer-by-layer to the core |
| Node structure | Single flat sphere + glow | Core sphere + rotating wireframe icosahedron shell + orbital ring (layers 1+) |
| Node brightness | Fixed pulse only | Pulse **+** cascade activation — nodes visibly light up as signals pass through |
| Data readout | None | HUD: node/edge/cascade counts, live "confidence" derived from core activation |
| Draw calls | ~6 | 8 (shells and rings are now instanced too, despite ~59 shells + ~27 rings) |

## Structure of the network

Four layers, same as before but denser:

1. **Raw data** (32 nodes) — outermost ring, dim coffee/almond tones.
2. **Signals** (18 nodes) — middle ring, almond/apricot.
3. **Thesis** (8 nodes) — inner ring, apricot/pearl.
4. **Decision** (1 node) — the bright pearl core.

Each node now connects to **2-4** nearest neighbors in the next layer
(weighted by distance — closer targets get higher "strength," which
drives edge thickness/brightness), instead of a sparse 1-2. Every layer
also gets **lateral peer connections** (1-2 nearest same-layer neighbors,
deduplicated) rendered as thinner, dimmer almond-tinted edges — visually
distinct from the brighter feed-forward apricot edges, so the network
reads as an actual graph with both hierarchy and peer relationships.

## Cascading signal propagation

This is the core new system. Every ~2.2 seconds, `spawnCascade()`:

1. Picks a random raw-data node as the origin.
2. Follows its strongest outgoing edge into the signal layer, then the
   strongest edge from there into the thesis layer, then into the core —
   building one coherent path from data to decision (with occasional
   randomness so it's not always the literal strongest edge, keeping
   variety).
3. Stores that path with a start time and duration.

Every frame, each active cascade computes how far along its path the
"signal" has traveled (`currentLayerFloat`), and every node on the path
gets its `targetActivation` raised based on how close the wavefront is to
that node's layer — producing a visible brightness wave that travels
outside-in, smoothly fading in and out, rather than every node/edge
pulsing independently with no visual relationship to its neighbors.

Node `activation` (smoothed via exponential easing toward
`targetActivation`) drives: node scale, node/edge color brightness, glow
sprite size, ring opacity/scale, and the wireframe shell's opacity. The
decision core's activation also feeds the HUD's live "confidence"
percentage and the core point-light's intensity — so when a cascade
reaches the core, you'll see the whole center of the network visibly
flash brighter.

## Performance

All per-node/per-edge visual elements are `InstancedMesh` or `Points`,
so draw call count stays at **8 total** regardless of network size:
`nodeMesh`, `glowPoints`, `edgeMesh`, `lateralMesh`, `pulsePoints`,
`shellMesh`, `ringMesh`, `stars`. The wireframe shells and orbital rings
were originally implemented in early development as one object per node
(~86 extra draw calls) and converted to instanced meshes before shipping
specifically to avoid that cost — worth knowing if you extend this further
and are tempted to add more per-node objects: keep them instanced.

The per-frame CPU cost is dominated by JS loops over ~59 nodes and
~220 edges (forward + lateral combined) updating matrices/colors —
trivial for any modern device.

## Customization

Key tunables near the top of `main.js`:

- `LAYER_CONFIG` — node counts, ring radius, depth spread, size range per
  layer.
- Feed-forward connection count: `2 + Math.floor(Math.random() * 3)` (the
  `maxConnections` line) — increase for an even denser web.
- Lateral connection count: `1 + (Math.random() > 0.5 ? 1 : 0)` — same
  idea for peer links.
- `CASCADE_INTERVAL` — seconds between new signal cascades. Lower = more
  frequent, busier-feeling network. Higher = calmer, more occasional.
- Cascade duration (`duration: 2.6` in `spawnCascade`) — how long a single
  cascade takes to travel from data to decision.
- Activation falloff curve: `Math.max(0, 1 - dist * 1.4)` in the cascade
  application loop — higher multiplier = sharper/narrower activation wave,
  lower = broader/softer glow spread.

### Ideas for further iteration

- On scroll, animate the camera to fly *through* the decision core into
  the dashboard, or have the core "open up" into your portfolio view.
- Trigger a cascade explicitly when the user takes an action elsewhere on
  the page (e.g. saving a new thesis entry), so the network visibly
  "thinks" in response to real interaction.
- Color-code thesis-layer nodes by sentiment (bullish/bearish) for a more
  literal tie-in, though this would deviate from the current
  palette-only approach.

## File structure

```
decision-tree-network/
├── index.html    — page markup, hero text, HUD readout, vignette, styles
├── main.js       — Three.js scene, network generation, cascades, animation
└── README.md     — this file
```
