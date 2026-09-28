// Chapter 2: keys and in-betweens. On an animator's desk (a tilted top with a light disc and a peg bar),
// the paper shows Aamu's jump across the page. Three KEY poses (take-off crouch, the top of the jump, the
// landing) are drawn by the key animator; the in-betweener fills the gaps following the TIMING CHART in
// the corner, whose tick marks say where each in-between falls. Onion skinning shows the neighbouring
// drawings as coloured ghosts, as light through paper does on a real light table. Every drawing also
// hangs on a line behind the desk, numbered as it would be on twos (1, 3, 5 ...).
//
//  - Key poses first, in-betweens later: Winsor McCay's "split system" for Gertie (1914); the job of the
//    in-betweener and the assistant animator grew in the 1920s–30s studios.
//  - Timing chart: a short ruler on the key drawing; ticks nearer a key mean the action slows into or out
//    of that key ("slow in", "slow out"). Richard Williams, The Animator's Survival Kit (2001).
//  - Numbering on twos: drawings are numbered by the frame they start on, so 1, 3, 5 ... (Williams).
//  - Onion-skin colours: many programs show earlier drawings in red and later ones in green or blue.
import { THREE, M, box, clamp, lerp } from '../kit.js';
import { board, text, rrect, COL, SANS, paper, drawAamu, spacing, makeDesk, makePencil, fitNarrow, inReel, FPS } from '../anim.js';

// Key poses in paper units (x 0..1 across, lift 0..1 up) and body pose.
const KEYS = [
  { x: 0.17, lift: 0, crouch: 0.75, stretch: 0.95, armL: -0.3, armR: -0.3, lean: 0.25, leaf: 0 },
  { x: 0.5, lift: 1, crouch: 0, stretch: 1.12, armL: 2.6, armR: 2.6, lean: -0.1, leaf: 0.6 },
  { x: 0.83, lift: 0, crouch: 0.7, stretch: 0.92, armL: 1.2, armR: 1.2, lean: -0.2, leaf: -0.5 },
];
const SPACE = [
  { v: 'even', label: 'Even' },
  { v: 'gravity', label: 'Slow at the top' },
  { v: 'both', label: 'Slow in & out' },
];
// Spacing for each half of the jump. Going up, the jump slows into the top key (slow in); coming down
// it speeds away from it (slow out). "Slow in & out" eases at both ends of each half.
const kindFor = (mode, seg) => (mode === 'even' ? 'even' : mode === 'both' ? 'both' : seg === 0 ? 'slowin' : 'slowout');
const mix = (A, B, f) => { const o = {}; for (const k in A) o[k] = lerp(A[k], B[k], f); return o; };
// In-betweens follow the ARC of the jump (a parabola), not a straight line between the keys.
const pathAt = (seg, f) => { const P = mix(KEYS[seg], KEYS[seg + 1], f); P.lift = seg === 0 ? 1 - (1 - f) * (1 - f) : 1 - f * f; return P; };

// The list of drawings: [{ pose, key: index or -1, f: fraction within its half, seg }]
function drawings(n, mode) {
  const list = [{ pose: KEYS[0], key: 0, seg: 0, f: 0 }];
  for (let seg = 0; seg < 2; seg++) {
    spacing(n, kindFor(mode, seg)).forEach((f) => list.push({ pose: pathAt(seg, f), key: -1, seg, f }));
    list.push({ pose: KEYS[seg + 1], key: seg + 1, seg, f: 1 });
  }
  return list;
}

export default {
  id: 'keys',
  short: 'Keys & in-betweens',
  title: 'Key poses and the drawings in between',
  subtitle: 'The key animator draws the big moments. The in-betweener fills the gaps.',
  view: { pos: [0.35, 2.2, 2.75], target: [0.3, 1.1, -0.2] },
  learn: `<p>Nobody draws an action from the first frame to the last in one go. The <b>key animator</b> first draws the <b>key poses</b>: the drawings that tell the story. Here that is the crouch, the top of the jump and the landing. Winsor McCay worked this way on <b>Gertie the Dinosaur</b> in 1914.</p>
    <p>Then an <b>in-betweener</b> (or assistant) draws the <b>in-betweens</b>. On the key drawing sits a little ruler called a <b>timing chart</b>. Its tick marks say exactly where each in-between goes. Ticks bunched near a key mean the move <b>slows in</b> to that key or <b>slows out</b> of it. A jump slows at the top, just as gravity does.</p>
    <p>To draw a drawing <i>between</i> two others, you must see all three. On a <b>light table</b> the paper is lit from behind, so the sheets underneath shine through. Software copies this as <b>onion skinning</b>: earlier drawings show as red ghosts, later ones as green.</p>
    <p class="tip"><b>Try it:</b> set in-betweens to 0 to see the keys alone, then add more. Switch the spacing from Even to Slow at the top and watch the ticks and the jump change. Slow the playback down to study each drawing.</p>`,
  terms: [
    { t: 'Key pose', d: 'A main drawing that shows an important moment of an action.' },
    { t: 'In-between', d: 'A drawing that fills the gap between two keys.' },
    { t: 'Timing chart', d: 'A small ruler on a key drawing showing where each in-between falls.' },
    { t: 'Spacing', d: 'How far apart the drawings are. Close together is slow, far apart is fast.' },
    { t: 'Slow in, slow out', d: 'Drawings bunched near a key, so the move eases into or out of it.' },
    { t: 'Light table', d: 'A desk with a light under glass, so you can see drawings through the paper.' },
    { t: 'Onion skin', d: 'Ghosts of the neighbouring drawings, shown while you draw one.' },
  ],
  defaults: { n: 3, mode: 'gravity', onion: true, rate: 1, keysOnly: false },
  controls: [
    { key: 'n', type: 'range', label: 'In-betweens between each pair of keys', min: 0, max: 7, step: 1, fmt: (v) => `${v}` },
    { key: 'mode', type: 'seg', label: 'Spacing', options: SPACE },
    { key: 'onion', type: 'toggle', label: 'Onion skin', hint: 'Red = drawings before, green = drawings after.' },
    { key: 'rate', type: 'seg', label: 'Playback', options: [{ v: 1, label: 'Real speed' }, { v: 0.25, label: '¼ speed' }, { v: 0, label: 'Hold' }] },
  ],
  quiz: [
    { q: 'Who draws the key poses?', options: ['The in-betweener', 'The key animator', 'The camera operator', 'The painter'], answer: 1, why: 'The key animator draws the story-telling poses; the in-betweener fills the gaps.' },
    { q: 'On a timing chart the ticks bunch up near the top key. What does the move do there?', options: ['Speeds up', 'Slows down', 'Stops for a second', 'Goes backwards'], answer: 1, why: 'Drawings close together cover little distance each frame, so the move slows: a slow in.' },
    { q: 'What does onion skinning show?', options: ['The paint colours', 'Faint ghosts of the drawings before and after', 'The camera moves', 'The sound track'], answer: 1, why: 'Like light through paper, it shows neighbouring drawings so you can draw one between them.' },
  ],
  reel: [
    { ms: 5000, caption: 'The key animator draws three poses: the crouch, the top of the jump and the landing.', set: { n: 0, mode: 'gravity', onion: true, rate: 0.25 }, spin: 0 },
    { ms: 5400, caption: 'In-betweeners fill the gaps, bunching drawings near the top so the jump slows like gravity.', set: { mode: 'gravity', onion: true, rate: 1 }, anim: { n: [1, 5] }, spin: 0, view: { pos: [0.1, 2.3, 2.1], target: [0.05, 1.1, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let S = null;
    const LX = 0.75;
    // the paper on the light disc: the current drawing, onion skins and the timing chart
    const PWpx = 900, PHpx = 660;
    const pc = document.createElement('canvas'); pc.width = PWpx; pc.height = PHpx;
    const pg = pc.getContext('2d'), ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8;
    const desk = makeDesk({ tex: ptex, w: 1.3, h: 0.95 }); root.add(desk.group);
    const pencil = makePencil(); pencil.position.set(0.55, 0.9, 0.62); pencil.rotation.set(-0.3, 0.6, 0.1); root.add(pencil);
    const toPx = (p) => [60 + p.x * (PWpx - 120), PHpx - 110 - p.lift * 260];
    const drawPaper = () => {
      const g = pg, w = PWpx, h = PHpx;
      paper(g, w, h, { seed: 21 });
      g.strokeStyle = 'rgba(60,50,40,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, h - 104); g.lineTo(w - 40, h - 104); g.stroke();
      if (!S) return;
      const { list, cur } = S;
      // the arc the jump follows (a light pencil guide)
      g.setLineDash([6, 8]); g.strokeStyle = 'rgba(80,70,60,.3)'; g.lineWidth = 2; g.beginPath();
      for (let k = 0; k <= 40; k++) { const seg = k <= 20 ? 0 : 1, f = seg ? (k - 20) / 20 : k / 20; const [x, y] = toPx(pathAt(seg, f)); k ? g.lineTo(x, y - 40) : g.moveTo(x, y - 40); }
      g.stroke(); g.setLineDash([]);
      if (S.onion) {
        for (let d = 3; d >= 1; d--) {
          for (const [i, col] of [[cur - d, '#e0475b'], [cur + d, '#2e9d6b']]) {
            if (i < 0 || i >= list.length) continue;
            const P = list[i].pose, [x, y] = toPx(P);
            drawAamu(g, x, y, 60, { ...P, style: 'ghost', ghost: col, alpha: 0.55 - d * 0.13, lw: 2 });
          }
        }
      }
      const D = list[cur], [x, y] = toPx(D.pose);
      drawAamu(g, x, y, 60, { ...D.pose, style: 'ink', mouth: D.pose.lift > 0.5 ? 'O' : 'smile', lw: 2.6 });
      // drawing number in the corner, circled if it is a key
      const num = cur * 2 + 1;
      text(g, String(num), w - 60, h - 40, { font: `700 34px ${SANS}`, col: D.key >= 0 ? COL.key : '#5b544a', align: 'center' });
      if (D.key >= 0) { g.strokeStyle = COL.key; g.lineWidth = 3; g.beginPath(); g.arc(w - 60, h - 52, 28, 0, TAU2); g.stroke(); }
      text(g, D.key >= 0 ? 'KEY' : 'in-between', w - 100, h - 40, { font: `600 18px ${SANS}`, col: D.key >= 0 ? COL.key : '#8a7f70', align: 'right' });
      // timing charts: one for each half, drawn as a ruler from key to key
      for (let seg = 0; seg < 2; seg++) {
        const x0 = w - 330 + seg * 150, y0 = 60, L = 170;
        text(g, seg ? 'top → land' : 'crouch → top', x0, y0 - 18, { font: `16px ${SANS}`, col: '#6a6258' });
        g.strokeStyle = '#3b3833'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 20, y0); g.lineTo(x0 + 20, y0 + L); g.stroke();
        const ticks = [0, ...spacing(S.n, kindFor(S.mode, seg)), 1];
        ticks.forEach((f, j) => {
          const yy = y0 + f * L, key = j === 0 || j === ticks.length - 1, idx = seg * (S.n + 1) + j, active = idx === cur;
          g.strokeStyle = active ? '#1c7ed6' : key ? COL.key : '#3b3833'; g.lineWidth = active ? 4 : 2;
          g.beginPath(); g.moveTo(x0 + (key ? 6 : 12), yy); g.lineTo(x0 + (key ? 34 : 28), yy); g.stroke();
          text(g, String(idx * 2 + 1), x0 + 40, yy + 6, { font: `${key ? 700 : 400} 16px ${SANS}`, col: key ? COL.key : '#5b544a' });
        });
      }
      ptex.needsUpdate = true;
    };

    // drawings hung on a line behind the desk
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.2, 6), M.matte(0xd9d2c3)); line.rotation.z = Math.PI / 2; line.scale.y = 0.75; line.position.set(LX, 2.05, -0.75); root.add(line);
    for (const x of [-1.2, 1.2]) { const post = box(0.05, 2.1, 0.05, M.matte(0x2a2d34)); post.position.set(LX + x, 1.05, -0.75); root.add(post); }
    let sheets = [], builtKey = '';
    const buildSheets = (list) => {
      sheets.forEach((sh) => { root.remove(sh.m); sh.m.geometry.dispose(); sh.m.material.map.dispose(); sh.m.material.dispose(); });
      const n = list.length, span = 2.3, w = Math.min(0.36, (span / n) * 0.92), h = w * 0.73;
      sheets = list.map((D, i) => {
        const c = document.createElement('canvas'); c.width = 220; c.height = 160;
        const g = c.getContext('2d'); paper(g, 220, 160, { seed: 40 + i });
        const P = D.pose;
        drawAamu(g, 20 + P.x * 180, 140 - P.lift * 70, 13, { ...P, style: 'ink', lw: 1.6 });
        text(g, String(i * 2 + 1), 204, 150, { font: `700 22px ${SANS}`, col: D.key >= 0 ? COL.key : '#5b544a', align: 'right' });
        if (D.key >= 0) text(g, 'KEY', 10, 24, { font: `700 18px ${SANS}`, col: COL.key });
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
        m.position.set(LX - span / 2 + (i + 0.5) * (span / n), 2.02 - h / 2, -0.74); root.add(m);
        return { m, y: m.position.y };
      });
    };
    const lKeys = stage.label('every drawing, numbered on twos', [LX + 0.5, 2.2, -0.75], root);
    const lDisc = stage.label('light table: the lamp shines up through the paper', [0.95, 0.75, 0.75], root);

    let T = 0, cur = 0, built = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lKeys, lDisc]);
        const n = clamp(Math.round(s.n), 0, 7);
        const list = drawings(n, s.mode);
        const key = `${n}|${s.mode}`;
        if (key !== builtKey) { builtKey = key; buildSheets(list); T = 0; }
        // play on twos: each drawing held 2 frames (1/12 s), then hold the last key for half a second
        T += dt * s.rate;
        const hold = 6, frames = list.length + hold;             // drawings, counted in twos
        const step = Math.floor(T * FPS / 2) % frames;
        cur = Math.min(list.length - 1, step);
        const b = `${key}|${cur}|${s.onion}`;
        if (b !== built) { built = b; S = { list, cur, n, mode: s.mode, onion: s.onion }; drawPaper(); }
        sheets.forEach((sh, i) => { sh.m.position.y = sh.y + (i === cur ? -0.05 : 0); sh.m.scale.setScalar(i === cur ? 1.12 : 1); });
        if (inReel()) { lKeys.visible = lDisc.visible = false; }
      },
      readout: (s) => {
        const n = clamp(Math.round(s.n), 0, 7), total = 3 + 2 * n, frames = total * 2;
        return `<div class="big">${total} drawings for one jump</div>
          <div class="row"><span>Keys (key animator)</span><b>3</b></div>
          <div class="row"><span>In-betweens (in-betweener)</span><b>${2 * n}</b></div>
          <div class="row"><span>Shot on twos</span><b>${frames} frames = ${(frames / FPS).toFixed(2)} s</b></div>
          <div class="row"><span>Now showing</span><b>drawing ${cur * 2 + 1}</b></div>
          <small>${n === 0 ? 'Keys alone: the jump teleports.' : s.mode === 'even' ? 'Even spacing: the same speed all the way, so it feels mechanical.' : 'Bunched ticks near the top: the jump hangs there, like real gravity.'}</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
const TAU2 = Math.PI * 2;
