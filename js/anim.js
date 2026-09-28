// Shared parts for Anim2DClear: canvas boards, easing and spacing maths, a small formant "voice" made with
// Web Audio, and the box's own drawings, redrawn live on canvases that become textures on 3D paper and cels:
//  - Aamu, a mango-headed kid designed for this box (about 3 heads tall, cute proportions),
//  - a bouncing ball, and simple props for the animation desk.
// Everything drawn here is original to this box. No studio's characters or frames are copied.
//
// Units in 3D are metres: +x right, +y up, +z towards the default viewer. Canvas drawings use pixels with
// y pointing down, so the character helpers take a baseline (feet) position and draw upwards.
import { THREE, M, box, clamp, lerp } from './kit.js';
import { audio } from './ui.js';

export const TAU = Math.PI * 2, D2R = Math.PI / 180;
export const FPS = 24;                          // sound film standard since the late 1920s (see FilmClear)
export const SANS = 'Geist, system-ui, sans-serif';
export const COL = {
  c: '#38bdf8', hot: '#ffd166', warm: '#ffb547', red: '#ff5a6e', good: '#7be08c', violet: '#c49bff',
  soft: 'rgba(255,255,255,.66)', dim: 'rgba(255,255,255,.42)', paper: '#f4efe3', lead: '#3b3833',
  prev: '#e0475b', next: '#2e9d6b', key: '#d8452f',
};
export const fmtInt = (v) => Math.round(v).toLocaleString('en-IN');

// ---------------------------------------------------------------- canvas helpers
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function text(g, s, x, y, { font = `20px ${SANS}`, col = 'rgba(255,255,255,.85)', align = 'left' } = {}) {
  g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left';
}
export function wrap(g, s, x, y, maxW, lh, opts = {}) {
  g.font = opts.font || `20px ${SANS}`;
  const words = String(s).split(' '); let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { text(g, line, x, yy, opts); line = w; yy += lh; } else line = t;
  }
  if (line) text(g, line, x, yy, opts);
  return yy + lh;
}
export function panelBg(g, w, h, a = 0.92) { g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 18); g.fillStyle = `rgba(10,12,18,${a})`; g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.16)'; g.stroke(); }
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Animation paper: warm off-white with a faint tooth, and optionally the three peg holes at the bottom.
export function paper(g, w, h, { tint = COL.paper, pegs = true, seed = 3 } = {}) {
  g.fillStyle = tint; g.fillRect(0, 0, w, h);
  const r = rng(seed); g.fillStyle = 'rgba(90,70,40,.05)';
  for (let i = 0; i < (w * h) / 300; i++) g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  if (pegs) {
    const y = h - h * 0.05, s = h * 0.018;
    g.fillStyle = 'rgba(40,36,30,.55)';
    g.beginPath(); g.arc(w / 2, y, s, 0, TAU); g.fill();
    for (const k of [-1, 1]) { rrect(g, w / 2 + k * w * 0.3 - s * 2, y - s * 0.6, s * 4, s * 1.2, s * 0.6); g.fill(); }
  }
}
// A canvas board in the scene (w × h metres, pxW × pxH pixels). draw(g, pxW, pxH, ...args).
export function board(parent, w, h, pxW, pxH, draw, pos, { opaque = false } = {}) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = (...a) => { draw(g, pxW, pxH, ...a); tex.needsUpdate = true; };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !opaque, toneMapped: false, side: THREE.DoubleSide }));
  if (pos) m.position.set(...pos);
  parent.add(m);
  redraw();
  return { tex, redraw, canvas: c, g, mesh: m, w, h, pxW, pxH };
}

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowStage = (stage) => stage.host.clientWidth < 560;
export function fitNarrow(stage, minor = [], y0 = -0.12) {
  const narrow = narrowStage(stage);
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Set a panel control from the stage (a drag on a board), so the slider and readout follow.
export function setControl(label, value) {
  const inp = [...document.querySelectorAll('#panel input[type=range]')].find((x) => x.getAttribute('aria-label') === label);
  if (!inp) return false;
  inp.value = value; inp.dispatchEvent(new Event('input'));
  return true;
}
export function pressSeg(value) {
  const b = [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.v === String(value));
  if (b) b.click();
  return !!b;
}
// Drag handling on canvas boards: hit(u, v) in board pixels decides whether a drag starts; move(u, v) follows.
// While dragging, orbiting is paused. Returns a function that removes the listeners.
export function dragOnBoards(stage, boards) {
  const el = stage.renderer.domElement, ray = new THREE.Raycaster(), v = new THREE.Vector2();
  let active = null;
  const pick = (e) => {
    const b = el.getBoundingClientRect();
    v.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(v, stage.camera);
    for (const bd of boards) {
      if (!bd.b.mesh.visible) continue;
      const h = ray.intersectObject(bd.b.mesh, false)[0];
      if (h && h.uv) return { bd, x: h.uv.x * bd.b.pxW, y: (1 - h.uv.y) * bd.b.pxH };
    }
    return null;
  };
  const down = (e) => {
    const p = pick(e); if (!p) return;
    if (p.bd.hit(p.x, p.y)) { active = p.bd; stage.controls.enabled = false; el.setPointerCapture?.(e.pointerId); e.preventDefault(); }
  };
  const move = (e) => {
    if (active) { const p = pick(e); if (p && p.bd === active) active.move(p.x, p.y); return; }
    if (e.buttons) return;
    const p = pick(e); if (p && p.bd.hover?.(p.x, p.y)) el.style.cursor = 'grab';
  };
  const up = () => { if (active) { active.end?.(); active = null; stage.controls.enabled = true; } };
  el.addEventListener('pointerdown', down, true); el.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  return () => { el.removeEventListener('pointerdown', down, true); el.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); stage.controls.enabled = true; };
}

// ---------------------------------------------------------------- timing maths
export const EASE = {
  linear: (u) => u,
  in: (u) => u * u,                                  // slow out of the first key, fast into the next
  out: (u) => 1 - (1 - u) * (1 - u),                 // fast out, slow into the next key
  inout: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)),
};
// CSS-style cubic Bézier timing curve from (0,0) to (1,1) with handles (x1,y1) and (x2,y2).
// The same maths as W3C CSS Easing Functions Level 1 and the curve editors in animation software.
export function cubicBezier(x1, y1, x2, y2) {
  const bx = (t) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  const dx = (t) => 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
  return (x) => {
    x = clamp(x, 0, 1);
    let t = x;
    for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t = clamp(t - (bx(t) - x) / d, 0, 1); }
    let lo = 0, hi = 1;
    for (let i = 0; i < 20 && Math.abs(bx(t) - x) > 1e-5; i++) { if (bx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return by(t);
  };
}
// Where n in-betweens fall between two keys (0 and 1), for a spacing style.
export function spacing(n, kind) {
  const f = { even: EASE.linear, slowin: EASE.out, slowout: EASE.in, both: EASE.inout }[kind] || EASE.linear;
  return Array.from({ length: n }, (_, j) => f((j + 1) / (n + 1)));
}

// ---------------------------------------------------------------- Aamu, the mango kid
// Mango outline in head units (about 1 = head radius), clockwise from the stem, with a small beak at lower right.
const MANGO = [[0, -1], [0.58, -0.88], [0.93, -0.42], [0.98, 0.18], [0.8, 0.68], [0.5, 0.98], [0.08, 1.02], [-0.45, 0.88], [-0.84, 0.46], [-0.95, -0.12], [-0.72, -0.72]];
function smoothPath(g, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath();
  let m = mid(pts[n - 1], pts[0]); g.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
  g.closePath();
}
export const AAMU = { skin: '#c98a5a', shirt: '#2fa39a', shorts: '#34405a', mango: '#ffbe3b', blush: '#ff8a3d', leaf: '#4caf50', line: '#2b2520', shoe: '#e4572e' };

// The eight mouth shapes used in this box (a common simplified set; studios each have their own chart).
export const VISEMES = {
  MBP: { name: 'M B P', w: 0.8, h: 0.06, note: 'lips pressed together; also the rest pose' },
  AI: { name: 'A I', w: 1.0, h: 0.72, top: true, tongue: true, note: 'jaw dropped, wide open' },
  E: { name: 'E', w: 1.08, h: 0.38, top: true, bot: true, note: 'wide, teeth showing' },
  O: { name: 'O', w: 0.62, h: 0.66, round: true, tongue: true, note: 'round and open' },
  U: { name: 'U / OO / W', w: 0.36, h: 0.34, round: true, note: 'small, pushed forward' },
  FV: { name: 'F V', w: 0.82, h: 0.26, top: true, lip: true, note: 'top teeth on the lower lip' },
  L: { name: 'L TH', w: 0.86, h: 0.52, top: true, tip: true, note: 'open, tongue tip up behind the teeth' },
  ETC: { name: 'C D G K N R S T Y Z', w: 0.92, h: 0.2, top: true, bot: true, note: 'teeth nearly closed' },
};
export const VIS_ORDER = ['MBP', 'AI', 'E', 'O', 'U', 'FV', 'L', 'ETC'];

// A mouth of width w pixels centred at (x, y). v: viseme key, or 'smile'.
export function drawMouth(g, x, y, w, v = 'smile', { line = AAMU.line, lw = 2 } = {}) {
  g.save(); g.translate(x, y); g.lineJoin = 'round'; g.lineCap = 'round';
  if (v === 'smile') {
    g.strokeStyle = line; g.lineWidth = lw * 1.3; g.beginPath(); g.arc(0, -w * 0.25, w * 0.42, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
    g.restore(); return;
  }
  const V = VISEMES[v] || VISEMES.MBP, mw = (w * V.w) / 2, mh = (w * V.h) / 2;
  if (v === 'MBP') {
    g.strokeStyle = line; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(-mw, 0); g.quadraticCurveTo(0, mh * 2.2, mw, 0); g.stroke();
    g.restore(); return;
  }
  // mouth opening
  g.beginPath();
  if (V.round) g.ellipse(0, 0, mw, mh, 0, 0, TAU);
  else { g.moveTo(-mw, -mh * 0.35); g.bezierCurveTo(-mw * 0.6, -mh * 1.05, mw * 0.6, -mh * 1.05, mw, -mh * 0.35); g.bezierCurveTo(mw * 0.8, mh * 1.25, -mw * 0.8, mh * 1.25, -mw, -mh * 0.35); g.closePath(); }
  g.fillStyle = '#5a1d24'; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#fff';
  if (V.top) g.fillRect(-mw, -mh * 1.2, mw * 2, mh * (V.lip ? 1.1 : 0.55));
  if (V.bot) g.fillRect(-mw, mh * 0.45, mw * 2, mh);
  if (V.tongue) { g.fillStyle = '#e46b7a'; g.beginPath(); g.ellipse(0, mh * 0.85, mw * 0.6, mh * 0.5, 0, 0, TAU); g.fill(); }
  if (V.tip) { g.fillStyle = '#e46b7a'; g.beginPath(); g.ellipse(0, -mh * 0.2, mw * 0.35, mh * 0.55, 0, 0, TAU); g.fill(); }
  if (V.lip) { g.fillStyle = '#d9707a'; g.beginPath(); g.ellipse(0, mh * 0.55, mw * 0.95, mh * 0.6, 0, 0, TAU); g.fill(); }
  g.restore();
  g.strokeStyle = line; g.lineWidth = lw; g.stroke();
  g.restore();
}

// Aamu, feet at (x, y) in canvas pixels, s pixels per body unit (standing height is about 3.1 units).
// Pose: crouch 0..1, stretch (1 normal, >1 taller and thinner), lean, armL/armR (0 down, PI up, radians
// outwards), legL/legR (swing, radians), tilt (head), leaf (extra leaf angle), mouth, blink 0..1, look -1..1,
// brow (raise 0..1), flip (face left), off (off-model), and a style: 'color' (ink and paint), 'ink' (lines
// only), or 'ghost' with a single colour for onion skins.
export function drawAamu(g, x, y, s, P = {}) {
  const { crouch = 0, stretch = 1, lean = 0, armL = 0.25, armR = 0.25, legL = 0, legR = 0, tilt = 0, leaf = 0, mouth = 'smile',
    blink = 0, look = 0, brow = 0, flip = false, off = false, noLeaf = false, style = 'color', ghost = '#e0475b', alpha = 1, lw = Math.max(1.5, s * 0.07) } = P;
  const paint = style === 'color', line = style === 'ghost' ? ghost : AAMU.line;
  g.save(); g.globalAlpha = alpha; g.translate(x, y);
  const sy = stretch, sx = 1 / Math.sqrt(stretch);
  g.scale(s * sx * (flip ? -1 : 1), -s * sy);                 // now y up, 1 = one body unit
  g.rotate(-lean);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const L = lw / s;                                           // line width in body units
  const legLen = 0.95 * (1 - 0.38 * crouch), hipY = legLen;
  // legs: hip → knee → foot, knees push outwards when crouching
  const leg = (side, swing) => {
    const hx = side * 0.2, fx = side * (0.26 + 0.1 * crouch) + Math.sin(swing) * 0.55, fy = Math.max(0, 0.16 * (1 - Math.cos(swing)) - 0.02);
    const kx = (hx + fx) / 2 + side * 0.22 * crouch, ky = (hipY + fy) / 2;
    g.beginPath(); g.moveTo(hx, hipY); g.lineTo(kx, ky); g.lineTo(fx, fy + 0.08);
    g.strokeStyle = line; g.lineWidth = 0.2 + L * 2; g.stroke();
    if (paint) { g.strokeStyle = AAMU.skin; g.lineWidth = 0.2; g.stroke(); }
    g.beginPath(); g.ellipse(fx + side * 0.06, fy + 0.07, 0.19, 0.09, 0, 0, TAU);
    if (paint) { g.fillStyle = AAMU.shoe; g.fill(); }
    g.strokeStyle = line; g.lineWidth = L; g.stroke();
  };
  leg(-1, legL); leg(1, legR);
  // body: shirt and shorts
  const by = hipY - 0.12, bh = 1.0 - 0.1 * crouch;
  g.beginPath(); g.moveTo(-0.34, by); g.bezierCurveTo(-0.46, by + bh * 0.5, -0.4, by + bh, 0, by + bh); g.bezierCurveTo(0.4, by + bh, 0.46, by + bh * 0.5, 0.34, by); g.closePath();
  if (paint) { g.fillStyle = AAMU.shirt; g.fill(); }
  g.strokeStyle = line; g.lineWidth = L; g.stroke();
  g.beginPath(); g.rect(-0.36, by - 0.02, 0.72, 0.26);
  if (paint) { g.fillStyle = AAMU.shorts; g.fill(); }
  g.stroke();
  // arms: shoulder → elbow → hand
  const sh = by + bh * 0.82;
  const arm = (side, a) => {
    const ang = -Math.PI / 2 + side * a;                      // 0 = hanging down
    const ex = side * 0.36 + Math.cos(ang) * 0.4, ey = sh + Math.sin(ang) * 0.4;
    const ang2 = ang + side * 0.35;
    const hx = ex + Math.cos(ang2) * 0.38, hy = ey + Math.sin(ang2) * 0.38;
    g.beginPath(); g.moveTo(side * 0.34, sh); g.lineTo(ex, ey); g.lineTo(hx, hy);
    g.strokeStyle = line; g.lineWidth = 0.16 + L * 2; g.stroke();
    if (paint) { g.strokeStyle = AAMU.skin; g.lineWidth = 0.16; g.stroke(); }
    g.beginPath(); g.arc(hx, hy, 0.12, 0, TAU); if (paint) { g.fillStyle = AAMU.skin; g.fill(); } g.strokeStyle = line; g.lineWidth = L; g.stroke();
  };
  arm(-1, armL); arm(1, armR);
  // head: the mango
  const hr = off ? 0.66 : 0.8, hy = by + bh + hr * 0.92;
  g.save(); g.translate(0, hy); g.rotate(-tilt - 0.12); g.scale(hr, -hr);                 // head units, y down again
  smoothPath(g, MANGO);
  if (paint) {
    const gr = g.createRadialGradient(0.45, 0.35, 0.1, 0.1, 0, 1.1);
    gr.addColorStop(0, AAMU.blush); gr.addColorStop(0.55, AAMU.mango); gr.addColorStop(1, '#f2c94c');
    g.fillStyle = gr; g.fill();
  }
  g.strokeStyle = line; g.lineWidth = L / hr; g.stroke();
  // stem and leaf (the leaf points right on model)
  const lside = off ? -1 : 1;
  g.beginPath(); g.moveTo(0, -1); g.lineTo(0.04, -1.2); g.lineWidth = (L / hr) * 1.6; g.stroke();
  if (!noLeaf) {
  g.save(); g.translate(0.04, -1.18); g.rotate(lside * (-0.5 + leaf) + (lside < 0 ? Math.PI : 0));
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.35, -0.3, 0.75, -0.05); g.quadraticCurveTo(0.35, 0.18, 0, 0);
  if (paint) { g.fillStyle = AAMU.leaf; g.fill(); }
  g.lineWidth = L / hr; g.stroke();
  g.beginPath(); g.moveTo(0.05, -0.01); g.lineTo(0.6, -0.06); g.lineWidth = (L / hr) * 0.6; g.stroke();
  g.restore();
  }
  // face
  const ey = off ? -0.42 : -0.02, eR = off ? [0.15, 0.21] : [0.19, 0.19];
  [-0.34, 0.3].forEach((ex, i) => {
    g.beginPath(); g.ellipse(ex, ey, eR[i] * 0.85, eR[i] * (1 - 0.92 * blink), 0, 0, TAU);
    if (paint || style === 'ink') { g.fillStyle = '#fff'; g.fill(); }
    g.lineWidth = L / hr; g.stroke();
    if (blink < 0.6) { g.beginPath(); g.arc(ex + look * 0.07, ey + 0.02, eR[i] * 0.45 * (1 - blink), 0, TAU); g.fillStyle = line; g.fill(); }
    // brows
    g.beginPath(); g.moveTo(ex - 0.13, ey - 0.3 - brow * 0.12 + (i ? 0.02 : 0)); g.quadraticCurveTo(ex, ey - 0.38 - brow * 0.16, ex + 0.13, ey - 0.3 - brow * 0.12); g.lineWidth = (L / hr) * 1.2; g.stroke();
  });
  if (paint) { g.fillStyle = 'rgba(255,90,80,.35)'; for (const cx of [-0.55, 0.55]) { g.beginPath(); g.ellipse(cx, 0.3, 0.14, 0.08, 0, 0, TAU); g.fill(); } }
  g.restore();
  // mouth, drawn upright in pixel space so its shapes read the same everywhere
  g.save(); g.translate(0, hy); g.rotate(-tilt - 0.12); g.scale(1, -1);
  const mw = hr * 0.55;
  g.scale(1 / s, 1 / s);                                       // mouth helper works in pixels
  drawMouth(g, 0, (off ? 0.12 : 0.42) * hr * s, mw * s, mouth, { line, lw: lw * 0.9 });
  g.restore();
  g.restore();
}

// Pose of Aamu hopping in place, k = 0..1 of one hop. Used by the flip-book.
// crouch (anticipation) → stretch at take-off → air → squash on landing → settle.
export function hopPose(k) {
  k = ((k % 1) + 1) % 1;
  const P = { crouch: 0, stretch: 1, armL: 0.25, armR: 0.25, lift: 0, leaf: 0 };
  if (k < 0.25) { const u = Math.sin((k / 0.25) * Math.PI / 2); P.crouch = 0.8 * u; P.armL = P.armR = 0.25 - 0.5 * u; P.stretch = 1 - 0.1 * u; }
  else if (k < 0.72) {
    const u = (k - 0.25) / 0.47;
    P.lift = 4 * u * (1 - u);                                  // a parabola: gravity
    P.stretch = 1 + 0.2 * Math.max(0, 1 - 3 * Math.min(u, 1 - u) * 1.4);
    P.armL = P.armR = 2.4 - 1.6 * Math.abs(u - 0.5) * 2; P.leaf = 0.6 * (u - 0.5);
  } else if (k < 0.82) { const u = (k - 0.72) / 0.1; P.crouch = 0.7 * Math.sin(u * Math.PI / 2); P.stretch = 0.88; P.armL = P.armR = 1.2 - u; P.leaf = 0.5; }
  else { const u = (k - 0.82) / 0.18; P.crouch = 0.7 * (1 - u); P.stretch = 1; P.armL = P.armR = 0.25; P.leaf = 0.5 * Math.cos(u * 9) * (1 - u); }
  return P;
}

// A ball of radius r at (x, y), squashed/stretched by sx, sy along angle ang (radians).
export function drawBall(g, x, y, r, { sx = 1, sy = 1, ang = 0, col = '#e4572e', style = 'color', ghost = '#e0475b', lw = 2.5, stripe = true } = {}) {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(sx, sy);
  g.beginPath(); g.arc(0, 0, r, 0, TAU);
  if (style === 'color') {
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, '#fff3e0'); gr.addColorStop(0.25, col); gr.addColorStop(1, shade(col, 0.55));
    g.fillStyle = gr; g.fill();
  }
  g.lineWidth = lw / Math.max(0.3, Math.min(sx, sy)); g.strokeStyle = style === 'ghost' ? ghost : AAMU.line; g.stroke();
  if (stripe && style === 'color') { g.beginPath(); g.ellipse(0, 0, r, r * 0.28, 0.5, 0, TAU); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.stroke(); }
  g.restore();
}
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * k, gg = ((n >> 8) & 255) * k, b = (n & 255) * k;
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

// ---------------------------------------------------------------- 3D props
// An animator's desk: a tilted top with a round, glowing light disc and a peg bar. The paper plane
// (w × h metres, a canvas texture you pass in) lies on the disc. Returns { group, paper, tilt }.
export function makeDesk({ tex, w = 1.2, h = 0.9, tilt = 0.42, top = 0.75 } = {}) {
  const g = new THREE.Group(), wood = M.matte(0x6b4a2e, { roughness: 0.7 }), dark = M.matte(0x2a2d34);
  const table = box(2.4, 0.06, 1.4, wood); table.position.y = top; g.add(table);
  for (const x of [-1.1, 1.1]) for (const z of [-0.6, 0.6]) { const l = box(0.06, top, 0.06, wood); l.position.set(x, top / 2, z); g.add(l); }
  const deck = new THREE.Group(); deck.position.set(0, top + 0.04, 0.55); deck.rotation.x = -Math.PI / 2 + tilt; g.add(deck);
  const board0 = box(1.9, 1.35, 0.05, M.matte(0x3a3f4b)); board0.position.set(0, 0.62, -0.03); deck.add(board0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 64), M.metal(0x8a919c, { roughness: 0.4 })); disc.rotation.x = Math.PI / 2; disc.position.set(0, 0.62, 0); deck.add(disc);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), M.glow(0xf6f1e4)); glass.position.set(0, 0.62, 0.012); deck.add(glass);
  const bar = box(0.9, 0.035, 0.02, M.metal(0xb9bec8)); bar.position.set(0, 0.62 - h / 2 + 0.03, 0.03); deck.add(bar);
  for (const x of [-0.36, 0, 0.36]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), M.metal(0xd0d4db)); p.rotation.x = Math.PI / 2; p.position.set(x, 0.62 - h / 2 + 0.05, 0.04); deck.add(p); }
  const paperM = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : M.matte(0xf4efe3));
  paperM.position.set(0, 0.62, 0.02); deck.add(paperM);
  const lamp = new THREE.Group(); lamp.position.set(1.0, top, -0.5); g.add(lamp);
  const arm1 = box(0.03, 0.7, 0.03, dark); arm1.position.y = 0.35; lamp.add(arm1);
  const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 20, 1, true), M.matte(0x2fa39a, { side: THREE.DoubleSide })); shadeM.position.set(-0.08, 0.72, 0.1); shadeM.rotation.z = 0.8; lamp.add(shadeM);
  return { group: g, deck, paper: paperM, disc, glass };
}
// A pencil, about 18 cm long, pointing along +x.
export function makePencil(color = 0xffc83d) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), M.matte(color)); body.rotation.z = Math.PI / 2; g.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.025, 6), M.matte(0xe8cfa6)); tip.rotation.z = -Math.PI / 2; tip.position.x = 0.0925; g.add(tip);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.008, 6), M.matte(0x222222)); lead.rotation.z = -Math.PI / 2; lead.position.x = 0.106; g.add(lead);
  const rub = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.015, 8), M.matte(0xff8fa3)); rub.rotation.z = Math.PI / 2; rub.position.x = -0.087; g.add(rub);
  return g;
}

// ---------------------------------------------------------------- a formant voice (Web Audio)
// A buzzy source (the vocal folds) passes through band-pass filters at the vowel's formants (the mouth
// and throat), a "source-filter" model of speech (Fant, 1960). Formant targets are rounded averages for
// children's vowels from Peterson & Barney (1952), J. Acoust. Soc. Am. 24, 175–184 (F1, F2, F3 in Hz).
export const FORMANTS = {
  i: [370, 3200, 3730], e: [690, 2610, 3570], a: [1030, 1370, 3170], o: [680, 1060, 3180], u: [430, 1170, 3260],
  ae: [1010, 2320, 3320], uh: [850, 1590, 3360], m: [300, 1200, 2700], l: [400, 1400, 3000], r: [560, 1820, 2160],
};
let ac = null;
export function audioCtx() {
  if (audio.muted) return null;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// Speak a line: phones [{ f: frames, v: formant key or null, voiced, noise: centre Hz or 0, to: glide key }].
// Returns { ctx, t0, stop } so the picture can follow the audio clock, or null when muted.
export function speak(phones, fps = FPS) {
  const ctx = audioCtx(); if (!ctx) return null;
  const t0 = ctx.currentTime + 0.08;
  const total = phones.reduce((a, p) => a + p.f, 0) / fps;
  const out = ctx.createGain(); out.gain.value = 0.22; out.connect(ctx.destination);
  const src = ctx.createOscillator(); src.type = 'sawtooth';
  const vg = ctx.createGain(); vg.gain.value = 0;
  const fs = [0, 1, 2].map((k) => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [6, 9, 10][k]; const gg = ctx.createGain(); gg.gain.value = [1, 0.7, 0.35][k]; vg.connect(f).connect(gg).connect(out); return f; });
  src.connect(vg);
  const len = Math.ceil(ctx.sampleRate * (total + 0.3)), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  const r = rng(7); for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 1.5; const ng = ctx.createGain(); ng.gain.value = 0;
  noise.connect(nf).connect(ng).connect(out);
  let t = t0, pitch = 290;
  src.frequency.setValueAtTime(pitch, t0);
  phones.forEach((p, i) => {
    const dur = p.f / fps, F = p.v ? FORMANTS[p.v] : null;
    if (F) fs.forEach((f, k) => { f.frequency.setValueAtTime(f.frequency.value || F[k], t); f.frequency.linearRampToValueAtTime(F[k], t + Math.min(0.05, dur)); });
    if (p.to) fs.forEach((f, k) => f.frequency.linearRampToValueAtTime(FORMANTS[p.to][k], t + dur));
    vg.gain.setTargetAtTime(p.voiced ? (p.v === 'm' || p.v === 'l' ? 0.35 : 1) : 0, t, 0.012);
    ng.gain.setTargetAtTime(p.noise ? (p.voiced ? 0.25 : 0.6) : 0, t, 0.01);
    if (p.noise) nf.frequency.setValueAtTime(p.noise, t);
    // a gentle falling pitch, lifted on stressed vowels: children's voices sit around 250–300 Hz
    pitch = p.stress ? 330 : Math.max(230, pitch - 6);
    src.frequency.linearRampToValueAtTime(pitch, t + dur);
    t += dur;
    if (i === phones.length - 1) { vg.gain.setTargetAtTime(0, t, 0.02); ng.gain.setTargetAtTime(0, t, 0.02); }
  });
  src.start(t0); noise.start(t0); src.stop(t + 0.2); noise.stop(t + 0.2);
  return { ctx, t0, total, stop: () => { try { src.stop(); noise.stop(); } catch { /* already stopped */ } } };
}

export { clamp, lerp, THREE, M, box };
