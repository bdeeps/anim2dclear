// Chapter 1: frames and flip-books. A flip-book of Aamu hopping lies on the table. Each page is a live
// canvas drawing on a 3D page that flips over its spine. Beside it, a screen plays the same hop at the
// cinema rate of 24 frames a second, shot "on ones", "on twos" or "on threes", and a board counts drawings.
//
//  - Sound film runs at 24 frames per second (standard since the late 1920s; see FilmClear).
//  - "On ones" = a new drawing every frame (24 a second). "On twos" = each drawing is photographed for two
//    frames (12 drawings a second), the common saving in hand-drawn animation; "on threes" = 8 a second.
//    Émile Cohl's Fantasmagorie (1908) already used 700 drawings, each exposed twice (on twos).
//    Richard Williams, The Animator's Survival Kit (2001), on ones vs twos.
//  - Drawings per minute = 24 × 60 / exposure. These are drawings for ONE moving character on one layer:
//    real films need extra drawings for every other character and effect, so treat totals as a floor.
//  - Why still pictures seem to move (apparent motion, the phi phenomenon): FilmClear, chapter 2.
import { THREE, M, box, clamp } from '../kit.js';
import { board, text, rrect, COL, SANS, paper, drawAamu, hopPose, fitNarrow, inReel, fmtInt, FPS, TAU } from '../anim.js';

const PW = 1.3, PD = 0.95, THICK = 0.0045, HOP_FRAMES = 24;       // one hop lasts 1 s = 24 frames
const EXP = [{ v: 1, label: 'On ones' }, { v: 2, label: 'On twos' }, { v: 3, label: 'On threes' }];
const perMin = (e) => (FPS * 60) / e;

function drawPage(g, w, h, frame, n, count) {
  paper(g, w, h, { pegs: false, seed: 11 + n });
  g.strokeStyle = 'rgba(60,50,40,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, h - 34); g.lineTo(w - 24, h - 34); g.stroke();
  const P = hopPose(frame / HOP_FRAMES);
  drawAamu(g, w * 0.56, h - 36 - P.lift * 58, 40, { ...P, mouth: P.lift > 0.2 ? 'O' : 'smile', lw: 2.6 });
  text(g, String(n + 1), w - 16, h - 10, { font: `600 22px ${SANS}`, col: '#8a7f70', align: 'right' });
  text(g, `drawing ${n + 1} of ${count}`, 14, 26, { font: `18px ${SANS}`, col: '#8a7f70' });
}

export default {
  id: 'flipbook',
  short: 'Frames & flip-books',
  title: 'A pile of drawings that moves',
  subtitle: 'Thumb through a flip-book, then learn why animators draw “on twos”.',
  view: { pos: [0.3, 2.65, 3.95], target: [0.3, 0.45, -0.2] },
  learn: `<p>2D animation is a <b>flip-book</b> made big. An animator draws a character again and again, each drawing a tiny bit different. Show the drawings fast, one after another, and your brain sees one moving character. (Why that works, the <b>phi phenomenon</b>, is in <b>FilmClear</b>.)</p>
    <p>Cinema shows <b>24 frames a second</b>. Drawing a new picture for every frame is called animating <b>on ones</b>: 1,440 drawings for one minute. Most hand-drawn films save work by shooting each drawing <b>twice</b>: <b>on twos</b>, 12 drawings a second. It still looks smooth for most actions. Very fast moves, like a whip or a spin, go back on ones. Slow, stiff moves can even go <b>on threes</b>.</p>
    <p>Those numbers add up fast. A 90-minute film on twos needs about <b>65,000 drawings for just one character</b>. Add friends, effects and backgrounds and a feature can need hundreds of thousands. That is why studios split the work, which the next chapter shows.</p>
    <p class="tip"><b>Try it:</b> drag the flip speed down to 4 and watch the hop turn into separate pictures, then up to 12 or more. Switch between ones, twos and threes and compare the screen and the counts.</p>`,
  terms: [
    { t: 'Frame', d: 'One still picture in a film. Cinema shows 24 every second.' },
    { t: 'Drawing', d: 'One picture made by the animator. It can be held for one or more frames.' },
    { t: 'On ones', d: 'A new drawing for every frame: 24 drawings a second.' },
    { t: 'On twos', d: 'Each drawing held for two frames: 12 drawings a second, the usual choice.' },
    { t: 'Flip-book', d: 'A small book of drawings that seem to move when you flick the pages.' },
    { t: 'Exposure', d: 'How many frames one drawing is shown (photographed) for.' },
  ],
  defaults: { speed: 12, exp: 2, play: true },
  controls: [
    { key: 'speed', type: 'range', label: 'Flip speed', min: 1, max: 24, step: 1, ends: ['1 page a second', '24'], fmt: (v) => `${v} pages a second` },
    { key: 'exp', type: 'seg', label: 'Shoot the hop', options: EXP, fmt: (v) => `${FPS / v} drawings a second` },
    { key: 'play', type: 'toggle', label: 'Keep flipping', hint: 'Turn off to stop on one page and study the drawing.' },
  ],
  quiz: [
    { q: 'Cinema runs at 24 frames a second. How many drawings a second is “on twos”?', options: ['48', '24', '12', '2'], answer: 2, why: 'Each drawing is held for two frames, so 24 ÷ 2 = 12 drawings a second.' },
    { q: 'Why do most hand-drawn films animate on twos?', options: ['It halves the drawings and still looks smooth for most moves', 'Projectors cannot show more', 'Twos look sharper', 'It is required by law'], answer: 0, why: 'Twelve drawings a second is enough for most actions and halves the work. Fast moves may go on ones.' },
    { q: 'How many drawings is one minute of one character on ones?', options: ['60', '720', '1,440', '24,000'], answer: 2, why: '24 drawings a second × 60 seconds = 1,440.' },
  ],
  reel: [
    { ms: 5200, caption: 'A 2D cartoon is a flip-book made big: many drawings, each a little different.', set: { exp: 2, play: true }, anim: { speed: [3, 14] }, spin: 0, view: { pos: [-0.9, 2.6, 2.4], target: [-0.9, 0.4, 0.2] } },
    { ms: 5000, caption: 'On twos, each drawing is shown twice: 12 drawings for 24 frames a second.', set: { speed: 12, play: true }, anim: { exp: [1, 3] }, spin: 0, view: { pos: [0.6, 2.6, 3.6], target: [0.6, 0.8, -0.3] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const table = box(4.4, 0.1, 2.4, M.matte(0x5a4028, { roughness: 0.8 })); table.position.set(0.1, 0.05, -0.1); root.add(table);
    const TOP = 0.1, BX = -0.95, BZ = 0.35;

    // the flip-book: a card back cover, a spine clip and pages that pivot on the spine (x = BX)
    const cover = box(PW + 0.04, 0.012, PD + 0.04, M.matte(0x7a2e2e)); cover.position.set(BX + PW / 2, TOP + 0.006, BZ); root.add(cover);
    const coverL = box(PW + 0.04, 0.012, PD + 0.04, M.matte(0x7a2e2e)); coverL.position.set(BX - PW / 2, TOP + 0.006, BZ); root.add(coverL);
    const clip = box(0.05, 0.05, PD + 0.06, M.metal(0x2a2d34)); clip.position.set(BX, TOP + 0.03, BZ); root.add(clip);
    const pageMat = M.matte(0xf1ebde, { side: THREE.BackSide });
    let pages = [], count = 0;
    const buildPages = (exp) => {
      pages.forEach((p) => { root.remove(p.pivot); p.front.geometry.dispose(); p.front.material.map.dispose(); p.front.material.dispose(); });
      count = HOP_FRAMES / exp;
      pages = Array.from({ length: count }, (_, n) => {
        const pivot = new THREE.Group(); pivot.position.set(BX, TOP + 0.014, BZ); root.add(pivot);
        const c = document.createElement('canvas'); c.width = 256; c.height = 188;
        drawPage(c.getContext('2d'), 256, 188, n * exp, n, count);
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const geo = new THREE.PlaneGeometry(PW, PD); geo.rotateX(-Math.PI / 2); geo.translate(PW / 2, 0, 0);
        const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xf2f2f2 }));
        const back = new THREE.Mesh(geo, pageMat); back.castShadow = true;
        pivot.add(front, back);
        return { pivot, front };
      });
    };
    // the thumb that lets the pages go
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.16, 6, 14), M.matte(0xc98a5a, { roughness: 0.6 }));
    thumb.rotation.z = Math.PI / 2; thumb.rotation.y = 0.5; root.add(thumb);
    const lBook = stage.label('flip-book: one drawing per page', [BX + 0.1, 0.75, BZ + 0.35], root);

    // the screen: the hop played at 24 fps on ones, twos or threes, with a strip of the 24 frames
    let S = null;
    const scr = board(root, 1.9, 1.35, 760, 540, (g, w, h) => {
      g.fillStyle = '#07080c'; g.fillRect(0, 0, w, h);
      if (!S) return;
      const f = Math.floor(S.T * FPS) % HOP_FRAMES, drawn = f - (f % S.exp);
      g.save(); rrect(g, 30, 70, w - 60, 330, 8); g.clip(); paper(g, w, h, { pegs: false, seed: 5 }); g.restore();
      const P = hopPose(drawn / HOP_FRAMES);
      drawAamu(g, w / 2, 380 - P.lift * 130, 78, { ...P, mouth: P.lift > 0.2 ? 'O' : 'smile' });
      text(g, `24 fps, ${EXP[S.exp - 1].label.toLowerCase()}`, 30, 48, { font: `600 30px ${SANS}`, col: '#fff' });
      text(g, `frame ${f + 1}`, w - 30, 48, { font: `24px ${SANS}`, col: COL.soft, align: 'right' });
      // frame strip: 24 cells, joined where one drawing is held
      const cw = (w - 60) / 24, y = 440;
      for (let k = 0; k < 24; k++) {
        const x = 30 + k * cw, first = k % S.exp === 0, d = Math.floor(k / S.exp);
        g.fillStyle = d % 2 ? '#2a3550' : '#3b4a6b'; g.fillRect(x + (first ? 2 : 0), y, cw - (first ? 2 : 0), 40);
        if (first) text(g, String(d + 1), x + 6, y + 27, { font: `600 16px ${SANS}`, col: 'rgba(255,255,255,.8)' });
      }
      const cx = 30 + f * cw; g.strokeStyle = COL.hot; g.lineWidth = 3; g.strokeRect(cx + 1, y - 3, cw - 1, 46);
      text(g, `one second = 24 frames = ${FPS / S.exp} drawings`, 30, 516, { font: `22px ${SANS}`, col: COL.soft });
    }, [0.45, 1.0, -0.72]);
    scr.mesh.rotation.y = 0;
    const scrFrame = box(1.98, 1.43, 0.04, M.matte(0x111216)); scrFrame.position.set(0.45, 1.0, -0.75); root.add(scrFrame);
    const scrLeg = box(0.08, 0.2, 0.08, M.matte(0x111216)); scrLeg.position.set(0.45, 0.2, -0.78); root.add(scrLeg);

    // the count board
    const cnt = board(root, 1.9, 0.95, 840, 420, (g, w, h, exp = 2) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 18); g.fillStyle = '#efe8da'; g.fill();
      text(g, 'Drawings for ONE character', 28, 50, { font: `700 30px ${SANS}`, col: '#3b3833' });
      const cols = ['', 'a second', 'a minute', 'a 90-min film'], xs = [28, 300, 470, 640];
      cols.forEach((c, i) => text(g, c, xs[i], 104, { font: `600 22px ${SANS}`, col: '#6a6258' }));
      EXP.forEach((e, i) => {
        const y = 160 + i * 70, on = e.v === exp;
        if (on) { rrect(g, 14, y - 42, w - 28, 60, 12); g.fillStyle = 'rgba(56,189,248,.25)'; g.fill(); }
        const col = on ? '#12324a' : '#3b3833', font = `${on ? 700 : 500} 28px ${SANS}`;
        text(g, e.label, xs[0], y, { font, col });
        text(g, String(FPS / e.v), xs[1], y, { font, col });
        text(g, fmtInt(perMin(e.v)), xs[2], y, { font, col });
        text(g, fmtInt(perMin(e.v) * 90), xs[3], y, { font, col });
      });
      text(g, 'Every extra character, effect or background adds more.', 28, h - 22, { font: `20px ${SANS}`, col: '#6a6258' });
    }, [1.55, 0.58, 0.45]);
    cnt.mesh.rotation.set(-0.35, -0.55, 0, 'YXZ');
    const cntLeg = box(0.06, 0.2, 0.06, M.matte(0x2a2d34)); cntLeg.position.set(1.6, 0.16, 0.35); root.add(cntLeg);

    let T = 0, page = 0, flip = 0, builtExp = 0, pause = 0, shownExp = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [lBook]);
        const exp = clamp(Math.round(s.exp), 1, 3);
        if (exp !== builtExp) { builtExp = exp; buildPages(exp); page = 0; flip = 0; pause = 0; }
        if (exp !== shownExp) { shownExp = exp; cnt.redraw(exp); }
        T += dt;
        // flip pages at 'speed' pages a second; each flip takes 45% of a page's time
        if (s.play) {
          if (pause > 0) pause -= dt;
          else { flip += dt * s.speed; if (flip >= 1) { flip -= 1; page++; if (page >= count) { page = 0; pause = 0.35; flip = 0; } } }
        }
        const fk = clamp(flip / 0.45, 0, 1), turning = s.play && pause <= 0 ? fk * fk * (3 - 2 * fk) : 0;
        pages.forEach((p, i) => {
          let a = 0, y;
          if (i < page) { a = Math.PI; y = TOP + 0.014 + i * THICK; }
          else if (i === page) { a = turning * Math.PI; y = TOP + 0.014 + (count - 1 - i) * THICK * (1 - turning) + i * THICK * turning; }
          else y = TOP + 0.014 + (count - 1 - i) * THICK;
          p.pivot.rotation.z = a; p.pivot.position.y = y;
        });
        thumb.position.set(BX + PW + 0.02, TOP + 0.05 + (count - page) * THICK, BZ + PD / 2 - 0.05 - 0.04 * Math.sin(turning * Math.PI));
        S = { T, exp }; scr.redraw();
        if (inReel()) { lBook.visible = false; }
      },
      readout: (s) => {
        const e = clamp(Math.round(s.exp), 1, 3), dps = FPS / e;
        const real = count / Math.max(1, s.speed);
        return `<div class="big">${s.speed} pages a second</div>
          <div class="row"><span>Pages in this hop (${EXP[e - 1].label.toLowerCase()})</span><b>${count}</b></div>
          <div class="row"><span>One flip through takes</span><b>${real.toFixed(1)} s (film: 1.0 s)</b></div>
          <div class="row"><span>Real speed needs</span><b>${dps} pages a second</b></div>
          <div class="row"><span>Drawings per minute</span><b>${fmtInt(perMin(e))}</b></div>
          <small>${s.speed < 8 ? 'Below about 8 a second the hop breaks into separate pictures.' : 'Fast enough to read as one smooth hop.'}</small>`;
      },
      dispose() { stage.setShift(0, 0); pages.forEach((p) => p.front.material.map.dispose()); },
    };
  },
};
