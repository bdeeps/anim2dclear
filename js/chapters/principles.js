// Chapter 3: the 12 principles of animation (Frank Thomas & Ollie Johnston, "The Illusion of Life: Disney
// Animation", Abbeville Press, 1981). A pencil-test board plays the classic exercise, a bouncing ball, and
// six principles can be switched on and off: squash and stretch, slow in and slow out, arcs, anticipation,
// follow-through (a little tail on the ball) and timing/weight (a rubber ball, a beach ball or a bowling
// ball). Exaggeration is a slider. The other principles are tappable cards on a pinboard.
//
// The ball's motion is real physics, simulated at 240 steps a second, then "animated" from its keys:
//  - gravity g = 9.81 m/s²; air drag F = ½ ρ Cd A v² with ρ = 1.2 kg/m³ and Cd ≈ 0.47 for a sphere;
//  - coefficient of restitution e (rebound speed ÷ impact speed). Rubber ball e ≈ 0.75 (a basketball or
//    tennis ball is about 0.75 to 0.85; ITF and FIBA drop tests). Beach ball about 0.6 (estimate). A
//    bowling ball on a hard floor hardly bounces; e ≈ 0.15 is our estimate. Rolling slows by rolling
//    resistance (estimates: rubber 0.6 m/s², beach 1.2 m/s², bowling 0.2 m/s²);
//  - a 40 cm, 100 g beach ball has terminal speed √(2mg / ρCdA) ≈ 5 m/s, so drag matters; a 7.26 kg
//    (16 lb, the heaviest legal, World Bowling) 21.8 cm bowling ball's is about 80 m/s, so it ignores air.
// With "slow in and out" off, the ball moves at an even speed between its keys (contacts and peaks). With
// "arcs" off, it travels in straight lines between the keys. Those are the two classic beginner mistakes.
import { THREE, M, box, clamp, lerp } from '../kit.js';
import { board, text, wrap, rrect, COL, SANS, paper, drawAamu, drawBall, hopPose, fitNarrow, inReel, pressSeg, TAU } from '../anim.js';

const G = 9.81, RHO = 1.2, CD = 0.47;
const BALLS = {
  rubber: { name: 'Rubber ball', m: 0.06, d: 0.065, e: 0.75, roll: 0.6, soft: 1, r: 30, col: '#e4572e' },
  beach: { name: 'Beach ball', m: 0.1, d: 0.4, e: 0.6, roll: 1.2, soft: 1.5, r: 54, col: '#38bdf8' },
  bowling: { name: 'Bowling ball', m: 7.26, d: 0.218, e: 0.15, roll: 0.2, soft: 0.05, r: 40, col: '#3a3f7a' },
};
const vTerm = (b) => Math.sqrt((2 * b.m * G) / (RHO * CD * Math.PI * (b.d / 2) ** 2));
const PX = 300, X0 = 150, GROUND = 650;                         // board pixels per metre, start x, floor line
const V0 = [0.8, 4.4];                                           // the same toss for every ball, m/s

// Simulate the toss: samples every 1/240 s of [t, x, y, vx, vy] in metres, plus keys (contacts and peaks).
function simulate(b) {
  const dt = 1 / 240, k = (0.5 * RHO * CD * Math.PI * (b.d / 2) ** 2) / b.m;
  let x = 0, y = 0, vx = V0[0], vy = V0[1], t = 0, rolling = false;
  const S = [[0, 0, 0, vx, vy]], keys = [{ i: 0, type: 'launch', v: Math.hypot(vx, vy) }];
  for (let n = 0; n < 240 * 8; n++) {
    if (!rolling) {
      const v = Math.hypot(vx, vy), ax = -k * v * vx, ay = -G - k * v * vy;
      const pvy = vy;
      vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt;
      if (pvy > 0 && vy <= 0) keys.push({ i: S.length, type: 'peak' });
      if (y <= 0) {
        y = 0; const imp = -vy; vy = imp * b.e;
        keys.push({ i: S.length, type: 'contact', v: imp });
        if (vy < 0.35) { vy = 0; rolling = true; }
      }
    } else {
      vx = Math.max(0, vx - b.roll * dt); x += vx * dt; t += dt;
    }
    S.push([t, x, y, vx, vy]);
    if ((rolling && vx <= 0) || x > 3.1) break;
  }
  keys.push({ i: S.length - 1, type: 'end' });
  // cumulative arc length, for even spacing along the path
  const L = [0]; for (let i = 1; i < S.length; i++) L.push(L[i - 1] + Math.hypot(S[i][1] - S[i - 1][1], S[i][2] - S[i - 1][2]));
  return { S, keys, L, dur: S[S.length - 1][0] };
}
// Where the animated ball is at time t (s after launch) for the switched-on principles.
function place(sim, t, ease, arcs) {
  const { S, keys, L } = sim, n = S.length - 1;
  const i = clamp(Math.round(t * 240), 0, n);
  if (ease && arcs) return [S[i][1], S[i][2]];
  let a = 0; while (a < keys.length - 2 && keys[a + 1].i <= i) a++;
  const A = keys[a], B = keys[a + 1], sA = S[A.i], sB = S[B.i];
  if (B.i === A.i) return [sA[1], sA[2]];
  const u = (i - A.i) / (B.i - A.i);
  if (!ease && arcs) { const target = L[A.i] + u * (L[B.i] - L[A.i]); let j = A.i; while (j < B.i && L[j] < target) j++; return [S[j][1], S[j][2]]; }
  let p = u;                                                     // arcs off: straight line between keys
  if (ease) { const dy = sB[2] - sA[2]; p = Math.abs(dy) > 1e-4 ? (S[i][2] - sA[2]) / dy : (S[i][1] - sA[1]) / Math.max(1e-4, sB[1] - sA[1]); }
  return [lerp(sA[1], sB[1], p), lerp(sA[2], sB[2], p)];
}

const CARDS = [
  { id: 'squash', n: 1, name: 'Squash and stretch', toggle: 'Squash and stretch' },
  { id: 'antic', n: 2, name: 'Anticipation', toggle: 'Anticipation' },
  { id: 'staging', n: 3, name: 'Staging' },
  { id: 'straight', n: 4, name: 'Straight ahead & pose to pose' },
  { id: 'follow', n: 5, name: 'Follow through & overlap', toggle: 'Follow-through (the tail)' },
  { id: 'ease', n: 6, name: 'Slow in and slow out', toggle: 'Slow in and slow out' },
  { id: 'arcs', n: 7, name: 'Arcs', toggle: 'Arcs' },
  { id: 'secondary', n: 8, name: 'Secondary action' },
  { id: 'timing', n: 9, name: 'Timing (and weight)' },
  { id: 'exag', n: 10, name: 'Exaggeration' },
  { id: 'solid', n: 11, name: 'Solid drawing' },
  { id: 'appeal', n: 12, name: 'Appeal' },
];
const INFO = {
  squash: 'A soft thing flattens when it hits and stretches when it flies fast, keeping the same volume. It shows what the thing is made of.',
  antic: 'A small move the other way before the big move: a crouch before a jump. It warns the audience something is coming.',
  staging: 'Show one idea at a time, as clearly as possible. A good pose reads even as a black silhouette.',
  straight: 'Straight ahead: draw frame after frame, good for fire and splashes. Pose to pose: plan the keys first, then fill in. Most scenes mix both.',
  follow: 'Loose parts keep moving after the body stops, then settle. Different parts move at different times: overlapping action.',
  ease: 'Real things speed up and slow down. More drawings near a key make the move ease in and out.',
  arcs: 'Almost everything moves along curved paths: a thrown ball, a swinging arm, a turning head.',
  secondary: 'A smaller action that supports the main one: here the leaf flaps while Aamu hops.',
  timing: 'The number of frames an action takes. It tells us how heavy something is, and how a character feels.',
  exag: 'Push poses and movement further than real life, so they read clearly and feel alive.',
  solid: 'Draw forms as solid objects in 3D space, with weight, volume and light, not as flat shapes.',
  appeal: 'A character we want to watch: clear, simple shapes and an interesting design, hero or villain.',
};

// A black silhouette of Aamu, drawn via a scratch canvas.
const scratch = document.createElement('canvas'); scratch.width = 260; scratch.height = 300;
function silhouette(g, x, y, s, P) {
  const c = scratch.getContext('2d'); c.clearRect(0, 0, 260, 300); c.globalCompositeOperation = 'source-over';
  drawAamu(c, 130, 285, s, P); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#16181d'; c.fillRect(0, 0, 260, 300); c.globalCompositeOperation = 'source-over';
  g.drawImage(scratch, x - 130, y - 285);
}

export default {
  id: 'principles',
  short: 'The 12 principles',
  title: 'Twelve principles that make drawings feel alive',
  subtitle: 'Switch principles on and off on the animator’s oldest exercise: a bouncing ball.',
  view: { pos: [0.55, 1.35, 4.6], target: [0.55, 1.25, 0] },
  learn: `<p>In the 1930s, Disney’s animators kept asking why some scenes felt real and others felt stiff. Two of them, <b>Frank Thomas and Ollie Johnston</b>, wrote the answers down in <b>The Illusion of Life</b> (1981): the <b>12 principles of animation</b>. Animators still learn them first, for pencil, for software and for 3D.</p>
    <p>Every student starts with a <b>bouncing ball</b>. With <b>squash and stretch</b> it looks soft. <b>Slow in and slow out</b> lets it hang at the top of each bounce, as gravity does. <b>Arcs</b> keep it on a curved path. <b>Anticipation</b> is the little crouch before it leaps, and <b>follow-through</b> is the tail that keeps swinging after the ball stops.</p>
    <p><b>Timing</b> tells us about <b>weight</b>. The same toss gives a rubber ball lots of bounces, a beach ball a slow, floaty drift (air drag matters when you are light and big), and a bowling ball one thud and a long roll. Tap the other cards on the board for staging, straight ahead vs pose to pose, secondary action, exaggeration, solid drawing and appeal.</p>
    <p class="tip"><b>Try it:</b> turn off slow in and out, then arcs, and see the ball go robotic. Switch to the bowling ball, then the beach ball. Push exaggeration up for a cartoony bounce.</p>`,
  terms: [
    { t: 'Squash and stretch', d: 'Flattening on impact and stretching in fast motion, keeping the same volume.' },
    { t: 'Anticipation', d: 'A small opposite move that prepares for the main action.' },
    { t: 'Follow-through', d: 'Loose parts carry on moving after the main body stops.' },
    { t: 'Arc', d: 'The curved path that most natural movement follows.' },
    { t: 'Timing', d: 'How many frames an action takes, which shows weight and mood.' },
    { t: 'Coefficient of restitution', d: 'Rebound speed divided by impact speed: how bouncy something is.' },
    { t: 'Pose to pose', d: 'Planning the key poses first, then drawing the in-betweens.' },
  ],
  defaults: { squash: true, ease: true, arcs: true, antic: true, follow: true, ball: 'rubber', exag: 1, trail: true, card: 'staging' },
  controls: [
    { key: 'ball', type: 'seg', label: 'Timing and weight', options: Object.entries(BALLS).map(([v, b]) => ({ v, label: b.name })) },
    { key: 'squash', type: 'toggle', label: 'Squash and stretch' },
    { key: 'ease', type: 'toggle', label: 'Slow in and slow out' },
    { key: 'arcs', type: 'toggle', label: 'Arcs' },
    { key: 'antic', type: 'toggle', label: 'Anticipation' },
    { key: 'follow', type: 'toggle', label: 'Follow-through (the tail)' },
    { key: 'exag', type: 'range', label: 'Exaggeration', min: 0.3, max: 2.2, step: 0.05, ends: ['subtle', 'cartoony'], fmt: (v) => v.toFixed(2) + '×' },
    { key: 'trail', type: 'toggle', label: 'Show the spacing', hint: 'Faint balls mark every drawing on twos over the last second.' },
    { key: 'card', type: 'seg', label: 'Principle card', options: [{ v: 'staging', label: 'Staging' }, { v: 'straight', label: 'Straight/pose' }, { v: 'secondary', label: 'Secondary' }, { v: 'exag', label: 'Exaggeration' }, { v: 'solid', label: 'Solid drawing' }, { v: 'appeal', label: 'Appeal' }] },
  ],
  quiz: [
    { q: 'Who wrote the 12 principles down in The Illusion of Life (1981)?', options: ['Walt Disney', 'Frank Thomas and Ollie Johnston', 'Winsor McCay', 'Richard Williams'], answer: 1, why: 'Two of Disney’s senior animators, Frank Thomas and Ollie Johnston, published them in 1981.' },
    { q: 'You turn off slow in and slow out. What happens to the ball?', options: ['It moves at an even, mechanical speed', 'It stops squashing', 'It moves in straight lines', 'It gets heavier'], answer: 0, why: 'Without easing, the drawings are evenly spaced, so the ball never hangs at the top.' },
    { q: 'The same toss: which ball bounces the fewest times?', options: ['Rubber ball', 'Beach ball', 'Bowling ball'], answer: 2, why: 'A bowling ball keeps very little of its speed on impact (low restitution), so it thuds and rolls.' },
  ],
  reel: [
    { ms: 5200, caption: 'Squash, stretch, slow in and out, and arcs turn a circle into a bouncing ball.', set: { ball: 'rubber', squash: true, ease: true, arcs: true, antic: true, follow: true, exag: 1.2, trail: true }, spin: 0, view: { pos: [-0.35, 1.2, 2.6], target: [-0.35, 0.95, 0] } },
    { ms: 5000, caption: 'Timing shows weight: a beach ball floats, a bowling ball thuds once and rolls.', set: { ball: 'bowling', squash: true, ease: true, arcs: true, trail: true, exag: 1 }, anim: { ball: ['bowling', 'beach'] }, spin: 0, view: { pos: [-0.35, 1.2, 2.6], target: [-0.35, 0.95, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let S = null;
    // the pencil-test board on an easel
    const PX0 = -0.35, PY0 = 0.78;
    const pb = board(root, 2.4, 1.44, 1200, 720, (g, w, h) => {
      paper(g, w, h, { seed: 31 });
      g.strokeStyle = 'rgba(60,50,40,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, GROUND + 2); g.lineTo(w - 30, GROUND + 2); g.stroke();
      if (!S) return;
      const b = BALLS[S.ball];
      if (S.trail) S.trailPts.forEach(([x, y, sx, sy, a]) => drawBall(g, x, y, b.r, { sx, sy, ang: a, style: 'ghost', ghost: 'rgba(60,90,160,.35)', lw: 2, stripe: false }));
      // tail (drawn behind the ball)
      const [x, y] = S.pos;
      g.strokeStyle = '#2b2520'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath();
      let tx = x + Math.cos(S.tail[0]) * b.r * 0.9 * S.sx, ty = y + Math.sin(S.tail[0]) * b.r * 0.9 * S.sy;
      g.moveTo(tx, ty);
      S.tail.forEach((a) => { tx += Math.cos(a) * b.r * 0.42; ty += Math.sin(a) * b.r * 0.42; g.lineTo(tx, ty); });
      g.stroke();
      g.fillStyle = '#7be08c'; g.beginPath(); g.arc(tx, ty, 6, 0, TAU); g.fill();
      drawBall(g, x, y, b.r, { sx: S.sx, sy: S.sy, ang: S.ang, col: b.col });
      text(g, `${b.name}`, 30, 50, { font: `700 30px ${SANS}`, col: '#3b3833' });
      const on = ['squash', 'ease', 'arcs', 'antic', 'follow'].filter((k) => S[k]).length;
      text(g, `${on} of 5 principles on · exaggeration ${S.exag.toFixed(1)}×`, 30, 84, { font: `22px ${SANS}`, col: '#6a6258' });
      text(g, `${(S.t).toFixed(2)} s`, w - 30, 50, { font: `600 26px ${SANS}`, col: '#6a6258', align: 'right' });
    }, [PX0, PY0, 0], { opaque: true });
    const easel = new THREE.Group(); root.add(easel);
    const wood = M.matte(0x6b4a2e);
    for (const x of [-1.28, 1.28]) { const leg = box(0.06, 1.9, 0.06, wood); leg.position.set(PX0 + x, 0.95, -0.06); easel.add(leg); }
    const ledge = box(2.5, 0.05, 0.12, wood); ledge.position.set(PX0, PY0 - 0.745, 0.02); root.add(ledge);

    // the pinboard of 12 cards, and a detail board under it
    const BX = 1.95, BY = 1.45;
    const cork = box(1.9, 1.15, 0.04, M.matte(0xb08a5a, { roughness: 1 })); cork.position.set(BX, BY, -0.05); root.add(cork);
    const cards = CARDS.map((c, i) => {
      const cb = board(root, 0.42, 0.3, 252, 180, (g, w, h, on, sel) => {
        g.clearRect(0, 0, w, h); rrect(g, 3, 3, w - 6, h - 6, 12); g.fillStyle = sel ? '#fff7d6' : '#f4efe3'; g.fill();
        g.lineWidth = sel ? 6 : 2; g.strokeStyle = sel ? '#ffb547' : 'rgba(0,0,0,.2)'; g.stroke();
        text(g, String(c.n), 18, 44, { font: `700 36px ${SANS}`, col: '#d8452f' });
        wrap(g, c.name, 18, 86, w - 36, 28, { font: `600 23px ${SANS}`, col: '#3b3833' });
        if (on !== undefined) { g.fillStyle = on ? '#2e9d6b' : '#b9b2a5'; g.beginPath(); g.arc(w - 30, 32, 13, 0, TAU); g.fill(); text(g, on ? 'ON' : 'OFF', w - 52, 38, { font: `700 16px ${SANS}`, col: on ? '#2e9d6b' : '#8a8378', align: 'right' }); }
      }, [BX - 0.69 + (i % 4) * 0.46, BY + 0.36 - Math.floor(i / 4) * 0.36, 0.0]);
      cb.card = c; cb.mesh.userData.card = c; stage.pickables.push(cb.mesh);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M.plastic(0xd8452f)); pin.position.set(cb.mesh.position.x, cb.mesh.position.y + 0.12, 0.02); root.add(pin);
      return cb;
    });
    let D = null;
    const det = board(root, 1.9, 0.84, 1140, 504, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 18); g.fillStyle = '#efe8da'; g.fill();
      if (!D) return;
      const c = CARDS.find((k) => k.id === D.card);
      text(g, `${c.n}. ${c.name}`, 28, 52, { font: `700 32px ${SANS}`, col: '#3b3833' });
      wrap(g, INFO[c.id], 28, 100, 520, 32, { font: `24px ${SANS}`, col: '#4a443c' });
      const t = D.T, cx = 830, gy = 470;
      g.save(); rrect(g, 580, 20, 540, 464, 14); g.fillStyle = '#f8f4ea'; g.fill(); g.clip();
      if (c.id === 'staging') {
        silhouette(g, 720, gy, 60, { armR: -0.9, armL: 0.15 }); silhouette(g, 960, gy, 60, { armR: 1.75, armL: 0.15 });
        text(g, 'arm hidden: unclear', 720, 60, { font: `600 22px ${SANS}`, col: '#d8452f', align: 'center' });
        text(g, 'arm clear: reads!', 960, 60, { font: `600 22px ${SANS}`, col: '#2e9d6b', align: 'center' });
      } else if (c.id === 'straight') {
        const order = [[1, 2, 3, 4, 5], [1, 5, 3, 2, 4]];
        order.forEach((o, r) => {
          text(g, r ? 'Pose to pose: keys 1 and 5 first' : 'Straight ahead: 1, 2, 3 …', 600, 80 + r * 200, { font: `600 22px ${SANS}`, col: '#3b3833' });
          const k = Math.floor(t * 2) % 7;
          o.forEach((num, j) => {
            const x = 600 + (num - 1) * 102, y = 100 + r * 200, lit = j < k;
            rrect(g, x, y, 88, 110, 8); g.fillStyle = lit ? '#fff' : 'rgba(0,0,0,.04)'; g.fill(); g.strokeStyle = (r && (num === 1 || num === 5)) ? '#d8452f' : '#8a8378'; g.lineWidth = 2; g.stroke();
            if (lit) drawBall(g, x + 44, y + 90 - Math.sin(((num - 1) / 4) * Math.PI) * 60, 12, { col: '#e4572e', stripe: false });
            text(g, String(num), x + 8, y + 22, { font: `600 18px ${SANS}`, col: '#6a6258' });
            if (lit) text(g, `#${j + 1}`, x + 80, y + 22, { font: `16px ${SANS}`, col: '#1c7ed6', align: 'right' });
          });
        });
      } else if (c.id === 'secondary') {
        const P = hopPose(t * 0.8);
        P.leaf = Math.sin(t * 9) * 0.9;
        drawAamu(g, cx, gy - 10 - P.lift * 110, 70, P);
        text(g, 'main action: the hop · secondary: the leaf flaps', cx, 60, { font: `600 20px ${SANS}`, col: '#3b3833', align: 'center' });
      } else if (c.id === 'exag') {
        const q = 0.5 + 0.5 * Math.sin(t * 4);
        [[700, 1, 'real'], [960, D.exag, `${D.exag.toFixed(1)}× (slider)`]].forEach(([x, k, lab]) => {
          const sq = clamp(0.25 * k * q, 0, 0.6);
          drawBall(g, x, gy - 40 * (1 - sq), 40, { sx: 1 / (1 - sq), sy: 1 - sq, col: '#e4572e' });
          text(g, lab, x, 70, { font: `600 22px ${SANS}`, col: '#3b3833', align: 'center' });
        });
        g.strokeStyle = '#8a8378'; g.beginPath(); g.moveTo(600, gy); g.lineTo(1100, gy); g.stroke();
      } else if (c.id === 'solid') {
        // a box in two-point perspective with light from the upper left, and a mango with contour lines
        const bx = 720, by = 300;
        g.fillStyle = '#e8c07a'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 80, by - 40); g.lineTo(bx + 80, by + 60); g.lineTo(bx, by + 110); g.closePath(); g.fill();
        g.fillStyle = '#c9974b'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 90, by - 45); g.lineTo(bx - 90, by + 60); g.lineTo(bx, by + 110); g.closePath(); g.fill();
        g.fillStyle = '#f6dfad'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 80, by - 40); g.lineTo(bx - 10, by - 80); g.lineTo(bx - 90, by - 45); g.closePath(); g.fill();
        const gr = g.createRadialGradient(935, 210, 10, 960, 250, 110); gr.addColorStop(0, '#fff0c0'); gr.addColorStop(0.5, '#ffbe3b'); gr.addColorStop(1, '#c46a1c');
        g.fillStyle = gr; g.beginPath(); g.ellipse(960, 260, 95, 115, -0.2 + Math.sin(t) * 0.1, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(90,50,10,.45)'; g.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(960, 260 + k * 38, 95 * Math.sqrt(1 - (k / 3) ** 2), 16, -0.2, 0, Math.PI); g.stroke(); }
        g.beginPath(); g.ellipse(960 + Math.sin(t) * 30, 260, 30, 115, -0.2, 0, TAU); g.stroke();
        text(g, 'volume, light and contour lines', 850, 460, { font: `600 20px ${SANS}`, col: '#3b3833', align: 'center' });
      } else {
        drawAamu(g, 720, gy - 20, 62, { armR: 2.2 + Math.sin(t * 5) * 0.3, mouth: 'smile', tilt: 0.1 });
        drawAamu(g, 960, gy - 20, 62, { armR: 0.5, armL: 0.5, off: true, style: 'ink', mouth: 'MBP', blink: 0.5 });
        text(g, 'clear shapes, big eyes', 720, 60, { font: `600 20px ${SANS}`, col: '#2e9d6b', align: 'center' });
        text(g, 'muddled, off-model', 960, 60, { font: `600 20px ${SANS}`, col: '#d8452f', align: 'center' });
      }
      g.restore();
    }, [BX, 0.42, 0]);
    const lCards = stage.label('tap a card', [BX, BY + 0.66, 0], root);

    let sim = null, simKey = '', T = -1, tail = [-Math.PI / 2, -Math.PI / 2, -Math.PI / 2], tw = [0, 0, 0], trail = [], lastDraw = -1;
    const cardState = [];
    return {
      pick(o) {
        const c = o.userData.card; if (!c) return;
        if (c.toggle) { const inp = [...document.querySelectorAll('#panel .ctl-toggle input')].find((x) => x.getAttribute('aria-label') === c.toggle); inp?.click(); }
        else if (c.id === 'timing') { const order = Object.keys(BALLS); pressSeg(order[(order.indexOf(S?.ball || 'rubber') + 1) % 3]); }
        else pressSeg(c.id);
      },
      update(dt, s, time) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lCards]);
        const b = BALLS[s.ball] || BALLS.rubber;
        if (s.ball !== simKey) { simKey = s.ball; sim = simulate(b); T = -1; trail = []; }
        const pre = s.antic ? 0.75 : 0.35;                       // hold, plus the anticipation crouch
        T += dt;
        if (T > sim.dur + 0.8) { T = -pre; trail = []; }
        if (T < -pre) T = -pre;
        const t = Math.max(0, T);
        const toPx = ([x, y]) => [X0 + x * PX, GROUND - y * PX];
        let [px, py] = toPx(place(sim, t, s.ease, s.arcs));
        const [qx, qy] = toPx(place(sim, Math.max(0, t - 1 / 60), s.ease, s.arcs));
        const vx = (px - qx) * 60 / PX, vy = -(py - qy) * 60 / PX, sp = Math.hypot(vx, vy);
        let sx = 1, sy = 1, ang = 0;
        const ex = s.exag;
        if (s.squash && T >= 0) {
          const st = clamp(sp * 0.05 * b.soft * ex, 0, 0.5);
          if (sp > 0.3) { sy = 1 + st; sx = 1 / sy; ang = Math.atan2(-vx, -vy); }            // stretch along the motion, same area
          // squash in the frames around each contact
          for (const k of sim.keys) if (k.type === 'contact') {
            const dtc = Math.abs(t - sim.S[k.i][0]);
            if (dtc < 0.045) { const q = clamp(k.v * 0.07 * b.soft * ex, 0, 0.55) * (1 - dtc / 0.045); sy = 1 - q; sx = 1 / (1 - q); ang = 0; }
          }
        }
        if (T < 0 && s.antic) {                                // anticipation: squash down and lean back, then go
          const u = clamp((T + 0.4) / 0.4, 0, 1), a = Math.sin(u * Math.PI) * (u < 0.85 ? 1 : 0.6);
          const q = clamp(0.3 * a * ex * Math.max(0.3, b.soft), 0, 0.6);
          sy = 1 - q; sx = 1 / (1 - q); px -= 14 * a * ex;
        }
        py -= b.r * sy;                                         // sit on the floor line by the ball's bottom
        if (ang !== 0) { py += b.r * sy - b.r; }
        // follow-through: a three-part tail that trails the motion on springs
        const target = sp > 0.2 ? Math.atan2(vy, -vx) : -Math.PI / 2;
        let prev = target;
        for (let k = 0; k < 3; k++) {
          const want = k === 0 ? target : prev;
          if (s.follow) {
            let d = want - tail[k]; d = Math.atan2(Math.sin(d), Math.cos(d));
            tw[k] += (d * 90 - tw[k] * 5) * dt; tail[k] += tw[k] * dt;
          } else { tail[k] = target; tw[k] = 0; }
          prev = tail[k];
        }
        // the spacing trail: one ghost per drawing on twos
        const dn = Math.floor(t * 12);
        if (T >= 0 && dn !== lastDraw) { lastDraw = dn; trail.push([px, py, sx, sy, ang, t]); }
        trail = trail.filter((p) => t - p[5] < 1.0 && p[5] <= t);
        S = { ...s, pos: [px, py], sx, sy, ang, tail: [...tail], t, trailPts: trail };
        pb.redraw();
        cards.forEach((cb) => {
          const c = cb.card, on = c.toggle ? !!s[c.id] : undefined, sel = s.card === c.id;
          const k = `${on}|${sel}`;
          if (cardState[c.n] !== k) { cardState[c.n] = k; cb.redraw(on, sel); }
        });
        D = { card: s.card, T: time, exag: s.exag }; det.redraw();
        if (inReel()) lCards.visible = false;
      },
      readout: (s) => {
        const b = BALLS[s.ball] || BALLS.rubber;
        if (!sim) return '';
        const bounces = sim.keys.filter((k) => k.type === 'contact').length;
        const peaks = sim.keys.filter((k) => k.type === 'peak').map((k) => sim.S[k.i][2]);
        const second = peaks[1] ? `${Math.round(peaks[1] * 100)} cm` : 'none';
        return `<div class="big">${b.name}: ${bounces} bounce${bounces === 1 ? '' : 's'}</div>
          <div class="row"><span>${b.m < 1 ? Math.round(b.m * 1000) + ' g' : b.m + ' kg'}, ${Math.round(b.d * 100)} cm · bounciness</span><b>${b.e}</b></div>
          <div class="row"><span>First arc peak, then next</span><b>${Math.round(peaks[0] * 100)} cm, ${second}</b></div>
          <div class="row"><span>Air-drag top speed</span><b>${vTerm(b).toFixed(0)} m/s</b></div>
          <div class="row"><span>Whole move</span><b>${sim.dur.toFixed(1)} s = ${Math.round(sim.dur * 24)} frames</b></div>
          <small>Same toss every time: ${V0[1]} m/s up, ${V0[0]} m/s across.</small>`;
      },
      dispose() { stage.setShift(0, 0); },
    };
  },
};
