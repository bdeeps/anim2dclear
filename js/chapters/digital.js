// Chapter 5: digital 2D. Aamu as a cut-out puppet: flat pieces (head, body, arms, legs) joined at pivots,
// as in cut-out animation and the vector "rigs" of software such as Toon Boom Harmony and Adobe Animate.
// You set keyframes on a timeline; the computer draws the in-betweens (a "tween") by following an easing
// curve, which you can drag in the curve editor. Switch to frame-by-frame to see the same wave drawn anew
// for every drawing, the way it is done on paper or in TVPaint or Krita.
//
//  - Easing curves here are cubic Béziers from (0,0) to (1,1), the same maths as W3C CSS Easing Functions
//    Level 1; its named presets are ease-in (0.42,0,1,1), ease-out (0,0,0.58,1), ease-in-out (0.42,0,0.58,1).
//    The "overshoot" preset (0.34,1.56,0.64,1) goes past the key and settles back.
//  - Cut-out animation long predates computers: Quirino Cristiani's El Apóstol (1917) and Lotte Reiniger's
//    silhouette film The Adventures of Prince Achmed (1926).
import { THREE, M, box, clamp, lerp, approach } from '../kit.js';
import { board, text, rrect, COL, SANS, paper, drawAamu, drawMouth, AAMU, cubicBezier, dragOnBoards, setControl, pressSeg, fitNarrow, inReel, rng, FPS, TAU } from '../anim.js';

const LEN = 36;                                                   // frames in the loop: 1.5 s at 24 fps
const PRESETS = { linear: [0, 0, 1, 1], in: [0.42, 0, 1, 1], out: [0, 0, 0.58, 1], inout: [0.42, 0, 0.58, 1], back: [0.34, 1.56, 0.64, 1] };
const EASES = [{ v: 'linear', label: 'Linear' }, { v: 'in', label: 'Ease in' }, { v: 'out', label: 'Ease out' }, { v: 'inout', label: 'Ease in-out' }, { v: 'back', label: 'Overshoot' }, { v: 'custom', label: 'Your curve' }];

// The keyed value (0 = arm down, 1 = arm up) at frame f, with keys at 0, K and LEN.
function valueAt(f, K, ease) {
  f = ((f % LEN) + LEN) % LEN;
  return f < K ? ease(f / K) : 1 - ease((f - K) / (LEN - K));
}
// A cut-out piece: a plane with a canvas drawing whose pivot sits at (px, py) in the piece's pixels.
function piece(w, h, pxW, pxH, pivot, draw) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  draw(c.getContext('2d'), pxW, pxH);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, alphaTest: 0.05 }));
  m.position.set(w / 2 - (pivot[0] / pxW) * w, -(h / 2 - (pivot[1] / pxH) * h), 0);
  const g = new THREE.Group(); g.add(m);
  return g;
}
const ink = (g, lw = 6) => { g.strokeStyle = AAMU.line; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; };

export default {
  id: 'digital',
  short: 'Digital 2D',
  title: 'Rigs, tweens and curves: 2D on a computer',
  subtitle: 'Key a cut-out puppet, let the computer draw the in-betweens, and shape them with an easing curve.',
  view: { pos: [0.75, 1.45, 4.9], target: [0.75, 1.3, 0] },
  learn: `<p>Today almost all 2D animation is made on computers, in two main ways. <b>Frame by frame</b> is still drawing: every drawing is made by hand, with a pen on a tablet, in programs like <b>TVPaint</b>, <b>Krita</b> or <b>Toon Boom Harmony</b>. It can change shapes freely, but costs a drawing every frame or two.</p>
    <p>The other way is a <b>rig</b>: the character is cut into pieces (head, body, upper arm, forearm) joined at <b>pivots</b>, like a paper puppet. This is <b>cut-out animation</b>, which is older than computers: Lotte Reiniger made a whole feature from paper cut-outs in 1926. Now software such as <b>Harmony</b> and <b>Adobe Animate</b> does it with vector shapes and bones, and many TV series are made this way.</p>
    <p>With a rig you set <b>keyframes</b>: “arm down on frame 1, arm up on frame 12”. The computer draws the in-betweens: a <b>tween</b>. How it spaces them is set by an <b>easing curve</b>. A straight line gives even spacing and a robotic move. An S-shaped curve gives slow in and slow out, the same principle as the timing chart in chapter 2.</p>
    <p class="tip"><b>Try it:</b> drag the middle keyframe diamond along the timeline, and drag the two round handles in the curve editor. Try Overshoot, then switch to Frame by frame and compare.</p>`,
  terms: [
    { t: 'Frame by frame', d: 'Animation where each drawing is made by hand.' },
    { t: 'Rig', d: 'A character built from pieces joined at pivots, moved by the animator instead of redrawn.' },
    { t: 'Cut-out animation', d: 'Animating flat pieces, of paper or of vector art, moved a little each frame.' },
    { t: 'Pivot', d: 'The point a piece turns around, like a shoulder or elbow.' },
    { t: 'Keyframe', d: 'A frame where the animator sets a value; the computer fills in between.' },
    { t: 'Tween', d: 'In-betweens calculated by the computer between two keyframes.' },
    { t: 'Easing curve', d: 'A graph that says how fast a tween moves at each moment.' },
  ],
  defaults: { mode: 'rig', ease: 'inout', bez: [0.42, 0, 0.58, 1], keyAt: 12, pivots: true, play: true },
  controls: [
    { key: 'mode', type: 'seg', label: 'Method', options: [{ v: 'rig', label: 'Cut-out rig + tween' }, { v: 'fbf', label: 'Frame by frame' }] },
    { key: 'ease', type: 'seg', label: 'Easing curve', options: EASES, fmt: (v, s) => `cubic-bezier(${s.bez.map((x) => +x.toFixed(2)).join(', ')})` },
    { key: 'keyAt', type: 'range', label: 'Middle keyframe at frame', min: 4, max: 32, step: 1, ends: ['early', 'late'], fmt: (v) => `frame ${v + 1}` },
    { key: 'pivots', type: 'toggle', label: 'Show pivots and bones' },
    { key: 'play', type: 'toggle', label: 'Play' },
  ],
  onChange(s, key) { if (key === 'ease' && PRESETS[s.ease]) s.bez = [...PRESETS[s.ease]]; },
  quiz: [
    { q: 'In a rig, what does the animator set, and what does the computer do?', options: ['The animator draws every frame; the computer colours them', 'The animator sets keyframes; the computer tweens the frames between', 'The computer sets keys; the animator draws in-betweens', 'Nothing is keyed'], answer: 1, why: 'The animator keys the important poses and the software calculates the in-betweens: a tween.' },
    { q: 'A tween with a straight-line easing curve moves…', options: ['with slow in and slow out', 'at an even, mechanical speed', 'backwards', 'on twos'], answer: 1, why: 'A straight line means equal steps every frame, which looks robotic. An S-curve eases in and out.' },
    { q: 'What can frame-by-frame do that a simple cut-out rig cannot?', options: ['Move pieces around pivots', 'Change the shape of the drawing freely', 'Play at 24 fps', 'Use colour'], answer: 1, why: 'Each drawing is new, so shapes can squash, smear and change. A rig can only move and turn its pieces.' },
  ],
  reel: [
    { ms: 5000, caption: 'Rigs are keyed; the computer tweens, and an easing curve turns robotic into smooth.', set: { mode: 'rig', ease: 'linear', bez: [0, 0, 1, 1], pivots: true, play: true, keyAt: 12 }, anim: { ease: ['linear', 'inout'] }, spin: 0, view: { pos: [0.9, 1.4, 3.3], target: [0.9, 0.95, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const PX = 0.15;
    // a backdrop panel like an app's stage
    const back = board(root, 2.0, 2.1, 400, 420, (g, w, h) => { paper(g, w, h, { pegs: false, tint: '#f1ede4', seed: 9 }); g.strokeStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [PX, 1.05, -0.08], { opaque: true });
    void back;
    // ---- the puppet (metres; about 1.7 m tall on a 2 m panel)
    const pup = new THREE.Group(); pup.position.set(PX, 0.12, 0); root.add(pup);
    const legs = [-1, 1].map((sd) => { const p = piece(0.2, 0.6, 60, 180, [30, 10], (g, w, h) => { ink(g, 5); g.fillStyle = AAMU.skin; rrect(g, 18, 4, 24, 150, 10); g.fill(); g.stroke(); g.fillStyle = AAMU.shoe; g.beginPath(); g.ellipse(30 + sd * 6, 160, 26, 14, 0, 0, TAU); g.fill(); g.stroke(); }); p.position.set(sd * 0.1, 0.6, -0.01); pup.add(p); return p; });
    const torso = piece(0.5, 0.62, 150, 186, [75, 180], (g) => { ink(g, 5); g.fillStyle = AAMU.shorts; g.fillRect(14, 140, 122, 42); g.strokeRect(14, 140, 122, 42); g.fillStyle = AAMU.shirt; g.beginPath(); g.moveTo(18, 150); g.bezierCurveTo(4, 80, 20, 6, 75, 6); g.bezierCurveTo(130, 6, 146, 80, 132, 150); g.closePath(); g.fill(); g.stroke(); });
    torso.position.set(0, 0.6, 0); pup.add(torso);
    const headG = new THREE.Group(); headG.position.set(0, 0.58, 0.01); torso.add(headG);
    const head = piece(0.62, 0.72, 186, 216, [93, 206], (g, w, h) => { g.save(); drawAamuHead(g, w, h); g.restore(); });
    headG.add(head);
    const leafG = new THREE.Group(); leafG.position.set(0.03, 0.6, 0.012); headG.add(leafG);
    const leaf = piece(0.3, 0.14, 90, 42, [4, 30], (g) => { ink(g, 3); g.fillStyle = AAMU.leaf; g.beginPath(); g.moveTo(4, 30); g.quadraticCurveTo(40, -4, 86, 20); g.quadraticCurveTo(40, 42, 4, 30); g.fill(); g.stroke(); });
    leaf.rotation.z = 0.35; leafG.add(leaf);
    const armPiece = (len) => piece(0.12, len, 36, 120, [18, 8], (g, w, h) => { ink(g, 4); g.fillStyle = AAMU.skin; rrect(g, 7, 2, 22, h - 6, 10); g.fill(); g.stroke(); });
    const mkArm = (sd) => {
      const sh = new THREE.Group(); sh.position.set(sd * 0.2, 0.5, 0.02); torso.add(sh);
      const up = armPiece(0.34); sh.add(up);
      const el = new THREE.Group(); el.position.set(0, -0.3, 0.005); sh.add(el);
      const fo = armPiece(0.34); el.add(fo);
      const hand = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), M.glow(0xc98a5a)); hand.position.set(0, -0.32, 0.006); el.add(hand);
      return { sh, el };
    };
    const armR = mkArm(1), armL = mkArm(-1);
    // pivots and bones
    const pivMat = M.glow(0xffd166), boneMat = M.glow(0x38bdf8);
    const pivotsList = [torso, headG, leafG, armR.sh, armR.el, armL.sh, armL.el, ...legs];
    const pivDots = pivotsList.map((o) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), pivMat); d.position.z = 0.06; o.add(d); return d; });
    const bones = [[armR.sh, [0, -0.3, 0.05]], [armR.el, [0, -0.3, 0.05]], [armL.sh, [0, -0.3, 0.05]], [armL.el, [0, -0.3, 0.05]], [torso, [0, 0.58, 0.05]], [headG, [0.03, 0.6, 0.05]]].map(([o, end]) => {
      const L = Math.hypot(end[0], end[1]);
      const b = new THREE.Mesh(new THREE.ConeGeometry(0.022, L, 4), boneMat); b.position.set(end[0] / 2, end[1] / 2, 0.05); b.rotation.z = Math.atan2(-end[0], end[1]); o.add(b); return b;
    });
    const lPiv = stage.label('pivots: the joints of the rig', [PX - 0.75, 0.9, 0.1], root);

    // ---- frame-by-frame plane
    const fbf = board(root, 1.9, 2.0, 380, 400, () => {}, [PX, 1.07, 0.03]);
    fbf.mesh.visible = false;

    // ---- the timeline board
    let TS = null;
    const tl = board(root, 3.0, 0.78, 1200, 312, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 16); g.fillStyle = 'rgba(16,19,27,.95)'; g.fill();
      if (!TS) return;
      const x0 = 70, x1 = w - 40, y0 = 60, y1 = 240, fx = (f) => x0 + (f / LEN) * (x1 - x0), vy = (v) => y1 - v * (y1 - y0);
      text(g, 'Timeline · arm raise', 20, 34, { font: `600 22px ${SANS}`, col: '#e8eef8' });
      text(g, `frame ${Math.floor(TS.f) + 1} of ${LEN}`, w - 30, 34, { font: `20px ${SANS}`, col: COL.soft, align: 'right' });
      for (let f = 0; f <= LEN; f++) { g.strokeStyle = f % 6 ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(fx(f), y0 - 6); g.lineTo(fx(f), y1 + 8); g.stroke(); if (f % 6 === 0) text(g, String(f + 1), fx(f), h - 34, { font: `16px ${SANS}`, col: COL.dim, align: 'center' }); }
      text(g, 'up', 20, y0 + 6, { font: `16px ${SANS}`, col: COL.dim }); text(g, 'down', 14, y1 + 6, { font: `16px ${SANS}`, col: COL.dim });
      // the value curve and the tweened frames
      g.strokeStyle = 'rgba(56,189,248,.5)'; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k <= 240; k++) { const f = (k / 240) * LEN, v = valueAt(f, TS.K, TS.ease); k ? g.lineTo(fx(f), vy(v)) : g.moveTo(fx(f), vy(v)); } g.stroke();
      const step = TS.mode === 'fbf' ? 2 : 1;
      for (let f = 0; f < LEN; f += step) { const v = valueAt(f, TS.K, TS.ease); g.fillStyle = TS.mode === 'fbf' ? '#c49bff' : '#38bdf8'; g.beginPath(); g.arc(fx(f), vy(v), 5, 0, TAU); g.fill(); }
      // keyframes
      [[0, 0], [TS.K, 1], [LEN, 0]].forEach(([f, v], i) => {
        g.save(); g.translate(fx(f), vy(v)); g.rotate(Math.PI / 4); g.fillStyle = i === 1 ? '#ffd166' : '#ffb547'; g.fillRect(-11, -11, 22, 22); g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(-11, -11, 22, 22); g.restore();
      });
      text(g, '◆ drag me', fx(TS.K) + 18, vy(1) + 6, { font: `600 18px ${SANS}`, col: '#ffd166' });
      g.strokeStyle = '#ff5a6e'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx(TS.f), y0 - 14); g.lineTo(fx(TS.f), y1 + 14); g.stroke();
      text(g, TS.mode === 'fbf' ? 'purple dots: hand drawings on twos' : 'blue dots: frames the computer tweened', x0, h - 10, { font: `16px ${SANS}`, col: COL.soft });
    }, [0.75, 0.2, 1.0]);
    tl.mesh.rotation.x = -1.05;

    // ---- the curve editor
    let CS = null;
    const CE = { x0: 110, y0: 500, size: 290 };                     // curve box in board pixels (y up from y0)
    const ce = board(root, 1.15, 1.2, 540, 564, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 16); g.fillStyle = 'rgba(16,19,27,.95)'; g.fill();
      if (!CS) return;
      const { x0, y0, size } = CE, P = (x, y) => [x0 + x * size, y0 - y * size];
      text(g, 'Easing curve', 20, 36, { font: `600 24px ${SANS}`, col: '#e8eef8' });
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.strokeRect(x0, y0 - size, size, size);
      text(g, 'time →', x0 + size - 60, y0 + 30, { font: `16px ${SANS}`, col: COL.dim });
      g.save(); g.translate(x0 - 20, y0 - size + 70); g.rotate(-Math.PI / 2); text(g, 'value →', 0, 0, { font: `16px ${SANS}`, col: COL.dim }); g.restore();
      const [a, b, c, d] = CS.bez;
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(...P(0, 0)); g.lineTo(...P(a, b)); g.moveTo(...P(1, 1)); g.lineTo(...P(c, d)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#38bdf8'; g.lineWidth = 4; g.beginPath(); g.moveTo(...P(0, 0)); g.bezierCurveTo(...P(a, b), ...P(c, d), ...P(1, 1)); g.stroke();
      for (const [hx, hy] of [[a, b], [c, d]]) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(...P(hx, hy), 13, 0, TAU); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke(); }
      // the moving dot: where this frame is on the curve
      const [px, py] = P(CS.u, CS.ease(CS.u)); g.fillStyle = '#ff5a6e'; g.beginPath(); g.arc(px, py, 9, 0, TAU); g.fill();
      text(g, `cubic-bezier(${CS.bez.map((x) => x.toFixed(2)).join(', ')})`, 20, h - 22, { font: `18px ${SANS}`, col: COL.soft });
    }, [2.05, 1.15, 0.1]);
    ce.mesh.rotation.y = -0.3;

    const undrag = dragOnBoards(stage, [
      { b: tl, hit: (x, y) => TS && Math.hypot(x - (70 + (TS.K / LEN) * (1200 - 110)), y - 60) < 40, hover: (x, y) => TS && Math.hypot(x - (70 + (TS.K / LEN) * (1200 - 110)), y - 60) < 40,
        move: (x) => { const f = clamp(Math.round(((x - 70) / (1200 - 110)) * LEN), 4, 32); setControl('Middle keyframe at frame', f); } },
      { b: ce, hit(x, y) { if (!CS) return false; const [a, b, c, d] = CS.bez, { x0, y0, size } = CE; this.which = Math.hypot(x - (x0 + a * size), y - (y0 - b * size)) < 30 ? 0 : Math.hypot(x - (x0 + c * size), y - (y0 - d * size)) < 30 ? 1 : -1; return this.which >= 0; },
        hover(x, y) { const [a, b, c, d] = CS?.bez || [], { x0, y0, size } = CE; return CS && (Math.hypot(x - (x0 + a * size), y - (y0 - b * size)) < 30 || Math.hypot(x - (x0 + c * size), y - (y0 - d * size)) < 30); },
        move(x, y) { const { x0, y0, size } = CE, hx = clamp((x - x0) / size, 0, 1), hy = clamp((y0 - y) / size, -0.6, 1.6); const s = window.anim2dclear?.settings; if (!s) return; const bz = [...s.bez]; bz[this.which * 2] = hx; bz[this.which * 2 + 1] = hy; s.bez = bz; if (s.ease !== 'custom') pressSeg('custom'); } },
    ]);

    let T = 0, lastDraw = -1, leafA = 0, leafW = 0, prevV = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [lPiv]);
        if (s.play) T += dt;
        const bez = Array.isArray(s.bez) && s.bez.length === 4 ? s.bez : PRESETS.inout;
        const ease = cubicBezier(...bez), K = clamp(Math.round(s.keyAt), 4, 32);
        const fr = (T * FPS) % LEN;
        const fUsed = s.mode === 'fbf' ? Math.floor(fr / 2) * 2 : Math.floor(fr);
        const v = valueAt(fUsed, K, ease);
        const rig = s.mode === 'rig';
        // rig pose from the keyed value
        armR.sh.rotation.z = lerp(0.15, 2.7, v); armR.el.rotation.z = lerp(0.1, 0.7, v) + 0.25 * Math.sin(T * 10) * v * v;
        armL.sh.rotation.z = -0.15 - 0.1 * v; armL.el.rotation.z = -0.1;
        headG.rotation.z = -0.18 * v;
        // secondary action: the leaf lags and wobbles on a spring
        const dv = (v - prevV) / Math.max(1e-3, dt); prevV = v;
        leafW += (-(leafA - clamp(-dv * 0.08, -0.8, 0.8)) * 120 - leafW * 7) * dt; leafA += leafW * dt;
        leafG.rotation.z = leafA;
        pup.visible = rig; fbf.mesh.visible = !rig;
        pivDots.forEach((d) => { d.visible = s.pivots && rig; }); bones.forEach((b) => { b.visible = s.pivots && rig; });
        lPiv.visible = s.pivots && rig && !narrow && !inReel();
        if (!rig && fUsed !== lastDraw) {
          lastDraw = fUsed;
          const r = rng(fUsed * 7 + 1), g = fbf.g;
          g.clearRect(0, 0, 380, 400);
          // each drawing is redrawn by hand: a little line "boil", and shapes can squash and smear
          drawAamu(g, 190 + (r() - 0.5) * 3, 392 + (r() - 0.5) * 2, 110 + (r() - 0.5) * 1.5, {
            armR: lerp(0.15, 2.7, v), armL: 0.2, tilt: 0.18 * v, stretch: 1 + 0.06 * Math.sin(v * Math.PI), leaf: -leafA,
            mouth: v > 0.6 ? 'E' : 'smile', brow: v, lw: 2.6 + r() * 0.8,
          });
          fbf.tex.needsUpdate = true;
        }
        TS = { f: fr, K, ease, mode: s.mode }; tl.redraw();
        CS = { bez, ease, u: fr < K ? fr / K : (fr - K) / (LEN - K) }; ce.redraw();
      },
      readout: (s) => {
        const bez = s.bez || PRESETS.inout, ease = cubicBezier(...bez), K = Math.round(s.keyAt), fr = Math.floor((T * FPS) % LEN), v = valueAt(fr, K, ease);
        return `<div class="big">${s.mode === 'rig' ? 'Tween: 0 new drawings' : `Frame by frame: ${LEN / 2} drawings`}</div>
          <div class="row"><span>Keyframes</span><b>1, ${K + 1}, ${LEN + 1}</b></div>
          <div class="row"><span>Frame now</span><b>${fr + 1}</b></div>
          <div class="row"><span>Arm raised</span><b>${Math.round(v * 100)}% = ${Math.round(lerp(0.15, 2.7, v) * 57.3)}°</b></div>
          <div class="row"><span>Curve</span><b>${bez.map((x) => x.toFixed(2)).join(', ')}</b></div>
          <small>${v > 1.001 ? 'Overshoot: past the key, then settling back.' : 'Drag the keyframe diamond and the curve handles on stage.'}</small>`;
      },
      dispose() { undrag(); stage.setShift(0, 0); },
    };
  },
};

// Aamu's head alone, for the rig (drawn with the shared drawing, then trimmed to the head).
function drawAamuHead(g, w, h) {
  const c = document.createElement('canvas'); c.width = 400; c.height = 520;
  drawAamu(c.getContext('2d'), 200, 500, 130, { armL: 0.1, armR: 0.1, noLeaf: true });
  // the head sits roughly between y = 40 and 265 in that drawing
  g.drawImage(c, 90, 24, 220, 256, 0, 0, w, h);
}
void drawMouth;
