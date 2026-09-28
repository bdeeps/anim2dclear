// Chapter 4: cels and the multiplane camera. A vertical multiplane stand holds four levels of artwork under a
// camera that looks straight down: a painted background, a glass of far trees, a transparent cel with Aamu
// walking, and a foreground of leaves. A second camera really photographs the stack (a render target shown
// on the monitor), so the parallax you see is true perspective, not a trick.
//
//  - Cels: transparent sheets (cellulose nitrate, later acetate) with the character inked on the front and
//    painted on the back, laid over a painted background. Earl Hurd's patent, 1914 (US 1,143,542, 1915).
//  - Multiplane: levels of artwork at different distances from the camera. For a sideways camera move d,
//    a level at distance z slides across the frame by d / (2 z tan(hfov/2)) of the frame width, so near
//    levels slide faster: parallax. Disney's camera (William Garity, 1937, first used on The Old Mill) held
//    up to seven levels, with the camera above shooting down. Earlier: Lotte Reiniger (c. 1923–26), Ub
//    Iwerks (1933). On the real stands the artwork levels were moved under a fixed camera; moving the
//    camera, as here, gives the same picture.
//  - Model sheet: the reference that keeps every artist's drawing of a character "on model".
import { THREE, M, box, clamp, approach } from '../kit.js';
import { board, text, rrect, COL, SANS, paper, drawAamu, fitNarrow, inReel, rng, TAU } from '../anim.js';

const CAM_Y = 3.45, VFOV = 21, ASPECT = 4 / 3;
const TANH = Math.tan((VFOV / 2) * Math.PI / 180), TANW = TANH * ASPECT;
const LEVELS = [
  { id: 'bg', name: 'Background painting', y: 0.2, flatY: 0.2 },
  { id: 'far', name: 'Far trees (on glass)', y: 0.9, flatY: 0.215 },
  { id: 'cel', name: 'Cel: Aamu', y: 1.5, flatY: 0.23 },
  { id: 'fg', name: 'Foreground leaves', y: 2.15, flatY: 0.245 },
];
const walkPose = (k) => { const a = Math.sin(k * TAU); return { legL: 0.42 * a, legR: -0.42 * a, armL: 0.35 + 0.3 * a, armR: 0.35 - 0.3 * a, lift: 0.05 * Math.abs(Math.cos(k * TAU)), leaf: -0.2 * a, tilt: 0.04 * a }; };

// Artwork for each level, drawn to fill the frame at that level's design distance (pixels: 800 × 520).
function paintLevel(id, g, w, h, st = {}) {
  g.clearRect(0, 0, w, h);
  const r = rng(id.length * 17 + 3);
  if (id === 'bg') {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#7cc6f2'); sky.addColorStop(0.6, '#ffe2b0'); sky.addColorStop(1, '#f7c98b');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff4c2'; g.beginPath(); g.arc(w * 0.72, h * 0.3, 40, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = ['#9bb7c9', '#7fa38f', '#5f8a5a'][k]; g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.55 + k * 0.1) - 40 * Math.sin(x / (90 + k * 40) + k * 2));
      g.lineTo(w, h); g.fill();
    }
    g.fillStyle = '#c9a36a'; g.fillRect(0, h * 0.8, w, h * 0.2);
  } else if (id === 'far') {
    for (let k = 0; k < 7; k++) {
      const x = (k / 6) * w + (r() - 0.5) * 60, y = h * 0.78;
      g.fillStyle = '#5b3a22'; g.fillRect(x - 7, y - 120, 14, 130);
      g.fillStyle = ['#2f7a4a', '#3d8f58', '#27693f'][k % 3]; g.beginPath(); g.ellipse(x, y - 150, 55, 70, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x - 30, y - 120, 40, 40, 0, 0, TAU); g.fill();
    }
  } else if (id === 'cel') {
    // a clear cel: nothing but the character. Paint sits on the back, ink on the front.
    const P = walkPose(st.k || 0);
    drawAamu(g, w / 2, h * 0.86 - P.lift * 60, 62, { ...P, style: st.ink ? 'ink' : 'color', off: st.off, mouth: 'smile' });
    if (st.ink) { g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(255,255,255,.0)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
  } else {
    for (let k = 0; k < 40; k++) {
      const left = k < 20, x = left ? r() * w * 0.18 : w - r() * w * 0.18, y = h - r() * h * 0.5;
      g.fillStyle = ['#1f5130', '#2b6b3c', '#184327'][k % 3]; g.save(); g.translate(x, y); g.rotate((left ? -1 : 1) * (0.3 + r() * 0.9));
      g.beginPath(); g.ellipse(0, -40, 16, 50, 0, 0, TAU); g.fill(); g.restore();
    }
    for (let x = 0; x < w; x += 9) { g.strokeStyle = '#2b5a2e'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (r() - 0.5) * 20, h - 20 - r() * 40); g.stroke(); }
  }
}

export default {
  id: 'cel',
  short: 'Cels & multiplane',
  title: 'Cels, backgrounds and the multiplane camera',
  subtitle: 'Stack clear cels over a painting, then spread the layers out to get real depth.',
  view: { pos: [1.2, 3.3, 5.9], target: [1.1, 1.55, 0] },
  learn: `<p>Redrawing a whole scene 12 times a second would be madness. So from the 1910s, studios drew the moving character on a clear plastic sheet called a <b>cel</b> (Earl Hurd’s patent, 1914). The lines were <b>inked</b> on the front and the colours <b>painted</b> on the back. One <b>background painting</b> sat underneath and stayed still, while only the cels changed.</p>
    <p>Flat cels have a problem: when the camera slides sideways, everything slides together, like a photo of a photo. Real depth needs <b>parallax</b>: near things pass faster than far things. Disney’s <b>multiplane camera</b> (1937) spread the artwork out on up to seven levels of glass, with the camera on top looking down. Levels near the camera slide across the frame much faster than the background.</p>
    <p>Many artists drawing one character must all draw it the same way. The <b>model sheet</b> shows the character from several sides with its rules. A drawing that breaks the rules is <b>off model</b>.</p>
    <p class="tip"><b>Try it:</b> truck the camera with the stack flat, then switch to Multiplane and truck again: watch the leaves race and the hills barely move on the monitor. Flip the cel to ink only, and try an off-model drawing.</p>`,
  terms: [
    { t: 'Cel', d: 'A clear plastic sheet with the character inked on the front and painted on the back.' },
    { t: 'Background', d: 'The painted scene behind the cels, usually held still for a whole shot.' },
    { t: 'Ink and paint', d: 'Tracing drawings onto cels in ink, then filling in the colours.' },
    { t: 'Parallax', d: 'Near things seem to move faster than far things when you move.' },
    { t: 'Multiplane camera', d: 'A camera stand with artwork on levels at different distances, for depth.' },
    { t: 'Truck', d: 'Moving the camera sideways.' },
    { t: 'Model sheet', d: 'The reference drawings that show exactly how a character should look.' },
    { t: 'Off model', d: 'A drawing that does not match the model sheet.' },
  ],
  defaults: { mode: 'multi', truck: 0, auto: true, ink: false, off: false, push: 0 },
  controls: [
    { key: 'mode', type: 'seg', label: 'The stack', options: [{ v: 'flat', label: 'Flat: all on one level' }, { v: 'multi', label: 'Multiplane' }] },
    { key: 'auto', type: 'toggle', label: 'Camera trucks by itself' },
    { key: 'truck', type: 'range', label: 'Truck the camera', min: -0.3, max: 0.3, step: 0.01, ends: ['left 30 cm', 'right 30 cm'], fmt: (v) => `${Math.round(v * 100)} cm` },
    { key: 'push', type: 'range', label: 'Push in (camera down)', min: 0, max: 0.6, step: 0.01, fmt: (v) => `${Math.round(v * 100)} cm` },
    { key: 'ink', type: 'toggle', label: 'Cel: ink lines only (before painting)' },
    { key: 'off', type: 'toggle', label: 'Draw Aamu off model' },
  ],
  onChange(s, key) { if (key === 'truck') s.auto = false; },
  quiz: [
    { q: 'On a cel, where did the colour paint usually go?', options: ['On the front, over the ink', 'On the back, behind the ink lines', 'On the background only', 'In the camera'], answer: 1, why: 'Ink went on the front and paint on the back, so the lines stayed crisp and the brush strokes did not show.' },
    { q: 'The camera trucks sideways over a multiplane stack. Which level slides fastest across the frame?', options: ['The background', 'The far trees', 'The level nearest the camera', 'They all move the same'], answer: 2, why: 'A level slides by the move divided by its distance, so near levels slide fastest: parallax.' },
    { q: 'What is a model sheet for?', options: ['Paying the actors', 'Keeping every artist’s drawings of a character the same', 'Timing the dialogue', 'Planning the camera'], answer: 1, why: 'It shows how the character looks from different sides and with rules, so everyone stays on model.' },
  ],
  reel: [
    { ms: 5200, caption: 'Characters were painted on clear cels, laid over one still background painting.', set: { mode: 'flat', auto: true, ink: false, off: false, push: 0 }, spin: 0, view: { pos: [0.6, 2.6, 3.6], target: [0.6, 1.1, 0] } },
    { ms: 5400, caption: 'A multiplane camera spreads the levels out, so near layers slide faster: real depth.', set: { mode: 'multi', auto: true, ink: false, off: false }, anim: { push: [0, 0.35] }, spin: 0, view: { pos: [1.5, 2.9, 5.4], target: [1.5, 1.7, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const RX = 0.55;
    // the stand: four posts, a base and a camera carriage on top
    const steel = M.metal(0x3a3f4b), base = box(2.2, 0.12, 1.7, M.matte(0x2a2d34)); base.position.set(RX, 0.06, 0); root.add(base);
    for (const x of [-1, 1]) for (const z of [-1, 1]) { const p = box(0.06, CAM_Y + 0.4, 0.06, steel); p.position.set(RX + x * 1.0, (CAM_Y + 0.4) / 2, z * 0.75); root.add(p); }
    const cam = new THREE.Group(); root.add(cam);
    const body = box(0.34, 0.26, 0.26, M.matte(0x1b1d22)); cam.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 20), M.matte(0x111216)); lens.position.y = -0.2; cam.add(lens);
    const rail = box(1.9, 0.05, 0.08, steel); rail.position.set(RX, CAM_Y + 0.22, 0); root.add(rail);
    // the levels: planes lying flat, facing up, each on a glass tray with a frame
    const levels = LEVELS.map((L, i) => {
      const zDesign = CAM_Y - L.y, fw = 2 * zDesign * TANW, fh = 2 * zDesign * TANH;
      const W = fw + 0.75, H = fh + 0.06;
      const c = document.createElement('canvas'); c.width = 900; c.height = Math.round((900 * H) / W);
      const g = c.getContext('2d'); paintLevel(L.id, g, c.width, c.height, { k: 0 });
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const grp = new THREE.Group(); grp.position.set(RX, L.y, 0); root.add(grp);
      const art = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: L.id !== 'bg', toneMapped: false, side: THREE.DoubleSide, depthWrite: L.id === 'bg' }));
      art.rotation.x = -Math.PI / 2; art.layers.enable(1); art.renderOrder = i; grp.add(art);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.95, 0.01, 1.45)), new THREE.LineBasicMaterial({ color: 0x8a919c })); grp.add(frame);
      const lab = stage.label(L.name, [RX + 0.6, L.y, 0.9], root);
      return { ...L, grp, art, tex, c, g, zDesign, lab, cur: L.y };
    });
    const lStand = stage.label('camera looks straight down', [RX, CAM_Y + 0.55, 0], root);

    // the photographing camera, and its picture on a monitor
    const rigCam = new THREE.PerspectiveCamera(VFOV, ASPECT, 0.05, 20); rigCam.layers.set(1);
    const rt = new THREE.WebGLRenderTarget(640, 480, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
    const MX = 2.75, MY = 2.3;
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.35), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false })); mon.position.set(MX, MY, 0); root.add(mon);
    const monF = box(1.9, 1.45, 0.05, M.matte(0x111216)); monF.position.set(MX, MY, -0.04); root.add(monF);
    const monPost = box(0.06, MY - 0.7, 0.06, M.matte(0x111216)); monPost.position.set(MX, (MY - 0.7) / 2, -0.06); root.add(monPost);
    const lMon = stage.label('what the camera photographs', [MX, MY + 0.82, 0], root);

    // the model sheet
    let sheetOff = null;
    const sheet = board(root, 1.8, 1.0, 900, 500, (g, w, h, off) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 16); g.fillStyle = '#efe8da'; g.fill();
      text(g, 'AAMU · model sheet', 24, 42, { font: `700 30px ${SANS}`, col: '#3b3833' });
      const base = 400, unit = 34;
      for (let k = 0; k <= 3; k++) { g.strokeStyle = 'rgba(40,90,160,.35)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(20, base - k * unit * 1.03); g.lineTo(560, base - k * unit * 1.03); g.stroke(); }
      g.setLineDash([]);
      drawAamu(g, 110, base, unit, { mouth: 'smile' });
      drawAamu(g, 250, base, unit, { mouth: 'O', brow: 1, armL: 2.2, armR: 2.2 });
      drawAamu(g, 390, base, unit, { mouth: 'E', tilt: 0.2, armR: 1.3, flip: true });
      text(g, 'happy', 110, 440, { font: `18px ${SANS}`, col: '#6a6258', align: 'center' });
      text(g, 'surprised', 250, 440, { font: `18px ${SANS}`, col: '#6a6258', align: 'center' });
      text(g, 'talking', 390, 440, { font: `18px ${SANS}`, col: '#6a6258', align: 'center' });
      const rules = ['About 3 heads tall', 'Head = one mango, beak lower right', 'Eyes on the middle line', 'Leaf always points right', 'Teal shirt #2FA39A', 'Mango #FFBE3B'];
      rules.forEach((r, i) => text(g, '• ' + r, 580, 100 + i * 40, { font: `20px ${SANS}`, col: '#3b3833' }));
      if (off) {
        g.save(); g.translate(740, 400); g.rotate(-0.15); g.strokeStyle = '#d8452f'; g.lineWidth = 5; rrect(g, -130, -34, 260, 64, 10); g.stroke();
        text(g, 'CEL IS OFF MODEL', 0, 10, { font: `800 26px ${SANS}`, col: '#d8452f', align: 'center' }); g.restore();
      } else text(g, 'The cel matches: on model', 580, 420, { font: `600 20px ${SANS}`, col: '#2e9d6b' });
    }, [MX, 0.95, 0.1]);

    let T = 0, lastK = -1, lastMode = '', truck = 0;
    const camPos = new THREE.Vector3();
    return {
      update(dt, s) {
        dt = Math.max(0, dt); T += dt;
        const narrow = fitNarrow(stage, [lStand, lMon, ...levels.map((l) => l.lab)]);
        truck = s.auto ? 0.25 * Math.sin(T * 0.6) : s.truck;
        if (s.auto && !inReel()) s.truck = Math.round(truck * 100) / 100;
        const flat = s.mode === 'flat';
        levels.forEach((L) => {
          const want = flat ? L.flatY : L.y;
          L.cur = approach(L.cur, want, 4, dt);
          L.grp.position.y = L.cur;
          // keep each level's picture the same size in frame at its current distance
          const k = (CAM_Y - L.cur) / L.zDesign; L.art.scale.set(k, k, 1);
          L.lab.position.y = L.cur + 0.03; L.lab.visible = !narrow && !inReel();
        });
        // walk cycle on twos: 12 drawings a second, 1 s per stride pair
        const kk = Math.floor(T * 12) / 12 % 1, drawKey = `${kk}|${s.ink}|${s.off}`;
        if (drawKey !== lastK) { lastK = drawKey; const L = levels[2]; paintLevel('cel', L.g, L.c.width, L.c.height, { k: kk, ink: s.ink, off: s.off }); L.tex.needsUpdate = true; }
        if (sheetOff !== s.off) { sheetOff = s.off; sheet.redraw(s.off); }
        const cy = CAM_Y - s.push;
        cam.position.set(RX + truck, cy + 0.13, 0);
        rigCam.position.set(RX + truck, cy, 0); rigCam.up.set(0, 0, -1); rigCam.lookAt(RX + truck, 0, 0);
        const r = stage.renderer; r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(); r.render(stage.scene, rigCam); r.setRenderTarget(null); r.setClearColor(0x000000, 0);
        lastMode = s.mode; void camPos;
      },
      readout: (s) => {
        const flat = s.mode === 'flat', d = s.auto ? truck : s.truck;
        const rows = levels.map((L) => {
          const z = CAM_Y - s.push - (flat ? L.flatY : L.y), frac = Math.abs(d) / (2 * z * TANW) * 100;
          return `<div class="row"><span>${L.name} · ${z.toFixed(2)} m away</span><b>${frac.toFixed(0)}%</b></div>`;
        }).join('');
        return `<div class="big">${flat ? 'Flat: no parallax' : 'Multiplane: parallax'}</div>
          <div class="row"><span>Camera truck</span><b>${Math.round(d * 100)} cm</b></div>
          ${rows}
          <small>How far each level slides across the frame width. ${s.off ? 'The cel is off model!' : ''}</small>`;
      },
      dispose() { rt.dispose(); stage.renderer.setClearColor(0x000000, 0); stage.setShift(0, 0); },
    };
  },
};
