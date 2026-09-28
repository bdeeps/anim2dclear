// Chapter 6: lip sync and acting. A line of dialogue is broken into sounds and written, frame by frame, on
// an exposure sheet (X-sheet or dope sheet). Each sound gets one of eight mouth shapes (visemes) from the
// mouth chart, and Aamu's face is redrawn live for every frame. "Play" speaks the line with a tiny formant
// synthesiser made with Web Audio (see anim.js), and the mouth follows the audio clock. Nothing plays when
// the sound is muted; the picture still animates.
//
//  - X-sheets: one row per frame, with columns for dialogue, action notes, the drawing numbers on each level
//    and camera instructions. Richard Williams, The Animator's Survival Kit (2001); John Halas & Roger
//    Manvell, The Technique of Film Animation (1959).
//  - Many animators put the mouth shape one or two frames AHEAD of the sound it matches, because we notice a
//    late mouth more than an early one (a rule of thumb, not a law; the slider lets you judge).
//  - Mouth sets: studios use their own charts of roughly 6 to 12 shapes; eight is a common simple set.
import { THREE, M, box, clamp } from '../kit.js';
import { board, text, rrect, COL, SANS, paper, drawAamu, drawMouth, VISEMES, VIS_ORDER, speak, fitNarrow, inReel, FPS, TAU } from '../anim.js';
import { audio } from '../ui.js';

// Lines, broken into sounds: f = frames at 24 fps, vis = mouth shape, v = vowel formants (anim.js),
// voiced = the vocal folds buzz, noise = hiss centre in Hz (for h, f, s, sh, z), stress = a stressed syllable.
const LINES = {
  hello: { text: 'Hello, I’m Aamu!', phones: [
    { t: '', vis: 'MBP', f: 4 },
    { t: 'H', vis: 'E', f: 3, noise: 1800, v: 'e' },
    { t: 'E', vis: 'E', f: 4, v: 'e', voiced: true },
    { t: 'L', vis: 'L', f: 3, v: 'l', voiced: true },
    { t: 'O', vis: 'O', f: 7, v: 'o', to: 'u', voiced: true, stress: true },
    { t: '', vis: 'MBP', f: 5 },
    { t: 'I', vis: 'AI', f: 6, v: 'a', to: 'i', voiced: true, stress: true },
    { t: 'M', vis: 'MBP', f: 3, v: 'm', voiced: true },
    { t: 'AA', vis: 'AI', f: 6, v: 'a', voiced: true, stress: true },
    { t: 'M', vis: 'MBP', f: 3, v: 'm', voiced: true },
    { t: 'OO', vis: 'U', f: 8, v: 'u', voiced: true },
    { t: '', vis: 'MBP', f: 6 },
  ] },
  five: { text: 'Five fresh mangoes!', phones: [
    { t: '', vis: 'MBP', f: 4 },
    { t: 'F', vis: 'FV', f: 3, noise: 5000 },
    { t: 'I', vis: 'AI', f: 6, v: 'a', to: 'i', voiced: true, stress: true },
    { t: 'V', vis: 'FV', f: 2, v: 'uh', voiced: true, noise: 4000 },
    { t: 'F', vis: 'FV', f: 2, noise: 5000 },
    { t: 'R', vis: 'ETC', f: 2, v: 'r', voiced: true },
    { t: 'E', vis: 'E', f: 4, v: 'e', voiced: true },
    { t: 'SH', vis: 'ETC', f: 4, noise: 2800 },
    { t: '', vis: 'MBP', f: 3 },
    { t: 'M', vis: 'MBP', f: 3, v: 'm', voiced: true },
    { t: 'A', vis: 'AI', f: 6, v: 'ae', voiced: true, stress: true },
    { t: 'N', vis: 'ETC', f: 2, v: 'm', voiced: true },
    { t: 'G', vis: 'ETC', f: 2, v: 'uh', voiced: true },
    { t: 'O', vis: 'O', f: 6, v: 'o', to: 'u', voiced: true },
    { t: 'Z', vis: 'ETC', f: 3, v: 'i', voiced: true, noise: 6000 },
    { t: '', vis: 'MBP', f: 6 },
  ] },
};
// Frame-by-frame table for a line: [{ phone index, start of phone? }]
function frames(line) {
  const out = [];
  line.phones.forEach((p, i) => { for (let k = 0; k < p.f; k++) out.push({ i, p, first: k === 0 }); });
  return out;
}
// Acting notes: blink in the pauses, lift the brows and tilt the head on stressed syllables.
function acting(F, f) {
  const cur = F[clamp(f, 0, F.length - 1)];
  const notes = [];
  if (cur.first && cur.p.stress) notes.push('brows up, head tilt');
  if (cur.first && !cur.p.t && cur.i > 0) notes.push('blink');
  return notes.join(', ');
}

export default {
  id: 'lipsync',
  short: 'Lip sync & acting',
  title: 'Lip sync: drawing the sounds of speech',
  subtitle: 'Break a line into sounds on an X-sheet, pick a mouth for each frame, and add acting.',
  view: { pos: [0.1, 1.25, 3.7], target: [0.1, 1.0, 0] },
  learn: `<p>For a talking character the <b>voice is recorded first</b>. Then someone does a <b>track reading</b>: listening frame by frame and writing each sound on the <b>exposure sheet</b> (X-sheet, or dope sheet). It has one row per frame, 24 rows for every second, with columns for dialogue, action notes and the drawings to use.</p>
    <p>Your mouth makes many sounds with the same shape, so animators use a small <b>mouth chart</b>. Here Aamu has eight shapes, called <b>visemes</b>: M B P (closed), A I (wide open), E, O, U, F V, L, and one for most other consonants. The animator picks the mouth for each frame from the X-sheet. Many put the mouth <b>a frame or two before</b> the sound, because a late mouth looks wrong and an early one does not.</p>
    <p>A moving mouth alone looks like a puppet. <b>Acting</b> brings it to life: a head tilt on the important word, eyebrows that lift, a blink in the pause. The best animators study how real people talk, and some film themselves as reference.</p>
    <p class="tip"><b>Try it:</b> press Play with the sound on and watch the mouth follow the voice. Slide the mouth timing to 4 frames late, then to 2 early. Turn acting off and see how much life disappears.</p>`,
  terms: [
    { t: 'Lip sync', d: 'Matching a character’s mouth shapes to the recorded voice.' },
    { t: 'X-sheet (exposure sheet)', d: 'A chart with one row per frame, listing sounds, actions and drawings.' },
    { t: 'Track reading', d: 'Writing down which sound happens on which frame of a recording.' },
    { t: 'Viseme', d: 'A mouth shape that goes with one or more speech sounds.' },
    { t: 'Phoneme', d: 'A single sound of a language, like the “m” in mango.' },
    { t: 'Formant', d: 'A band of frequencies the mouth and throat make louder; it gives each vowel its sound.' },
  ],
  defaults: { line: 'hello', lead: 1, acting: true },
  controls: [
    { key: 'play', type: 'buttons', label: 'Hear it', items: [{ label: '▶ Play the line with voice', act: (s, inst) => inst?.play?.() }] },
    { key: 'line', type: 'seg', label: 'Line of dialogue', options: [{ v: 'hello', label: 'Hello, I’m Aamu!' }, { v: 'five', label: 'Five fresh mangoes!' }] },
    { key: 'lead', type: 'range', label: 'Mouth timing', min: -4, max: 3, step: 1, ends: ['4 frames late', '3 early'], fmt: (v) => (v === 0 ? 'exactly on the sound' : v > 0 ? `${v} frame${v > 1 ? 's' : ''} early` : `${-v} frame${v < -1 ? 's' : ''} late`) },
    { key: 'acting', type: 'toggle', label: 'Acting (head, brows, blinks)' },
  ],
  quiz: [
    { q: 'In animation, what usually comes first: the voice or the mouth drawings?', options: ['The mouth drawings', 'The voice recording', 'They are made at the same time', 'The music'], answer: 1, why: 'The voice is recorded first, read frame by frame onto the X-sheet, and then the mouths are drawn to fit.' },
    { q: 'What does one row of an X-sheet stand for?', options: ['One second', 'One frame', 'One scene', 'One drawing sheet'], answer: 1, why: 'Each row is one frame, so a second of film fills 24 rows.' },
    { q: 'Many animators put mouth shapes one or two frames early. Why?', options: ['Sound travels slower than light in cinemas', 'A late mouth looks wrong, an early one does not', 'It saves drawings', 'Projectors run fast'], answer: 1, why: 'We notice a mouth that trails the sound much more than one that leads it slightly.' },
  ],
  reel: [
    { ms: 5000, caption: 'Each frame of speech gets one of eight mouth shapes, plus a head tilt and a blink.', set: { line: 'five', lead: 1, acting: true }, spin: 0, view: { pos: [-0.3, 1.3, 3.0], target: [-0.3, 1.1, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let S = null;
    // the face on a cel over a light table
    const face = board(root, 1.45, 1.55, 580, 620, (g, w, h) => {
      paper(g, w, h, { seed: 61 });
      if (!S) return;
      drawAamu(g, w / 2 - 10, h + 150, 180, { mouth: S.vis, tilt: S.tilt, brow: S.brow, blink: S.blink, look: S.look, armL: 0.25, armR: 0.25 });
      text(g, `frame ${S.f + 1}`, 20, 36, { font: `600 24px ${SANS}`, col: '#6a6258' });
      text(g, VISEMES[S.vis].name, w - 20, 36, { font: `700 24px ${SANS}`, col: '#d8452f', align: 'right' });
    }, [0, 1.2, 0]);
    const faceF = box(1.55, 1.65, 0.04, M.matte(0x2a2d34)); faceF.position.set(0, 1.2, -0.04); root.add(faceF);
    const post = box(0.08, 0.45, 0.08, M.matte(0x2a2d34)); post.position.set(0, 0.2, -0.05); root.add(post);

    // the X-sheet
    const xs = board(root, 1.05, 1.75, 420, 700, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 12); g.fillStyle = '#f3efe4'; g.fill();
      text(g, 'EXPOSURE SHEET', 16, 32, { font: `700 22px ${SANS}`, col: '#3b3833' });
      if (!S) return;
      const cols = [[16, 'FR'], [70, 'DIAL'], [140, 'MOUTH'], [240, 'ACTION']];
      cols.forEach(([x, t]) => text(g, t, x, 62, { font: `700 15px ${SANS}`, col: '#6a6258' }));
      const rows = 24, rh = (h - 90) / rows, start = Math.max(0, Math.min(S.F.length - rows, S.f - 8));
      for (let r = 0; r < rows; r++) {
        const f = start + r; if (f >= S.F.length) break;
        const y = 76 + r * rh, row = S.F[f], mouthF = S.F[clamp(f + S.lead, 0, S.F.length - 1)];
        if (f === S.f) { g.fillStyle = 'rgba(56,189,248,.28)'; g.fillRect(6, y, w - 12, rh); }
        g.strokeStyle = (f + 1) % 6 === 0 ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.1)'; g.beginPath(); g.moveTo(6, y + rh); g.lineTo(w - 6, y + rh); g.stroke();
        text(g, String(f + 1), 16, y + rh - 7, { font: `15px ${SANS}`, col: '#6a6258' });
        if (row.first && row.p.t) text(g, row.p.t, 70, y + rh - 7, { font: `700 17px ${SANS}`, col: '#3b3833' });
        else if (row.p.t) { g.strokeStyle = '#3b3833'; g.beginPath(); g.moveTo(80, y); g.lineTo(80, y + rh); g.stroke(); }
        text(g, mouthF.p.vis, 140, y + rh - 7, { font: `600 15px ${SANS}`, col: '#d8452f' });
        if (S.acting) text(g, acting(S.F, f + S.lead), 240, y + rh - 7, { font: `13px ${SANS}`, col: '#1c6ea4' });
      }
      [62, 132, 232].forEach((x) => { g.strokeStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(x, 44); g.lineTo(x, h - 10); g.stroke(); });
    }, [1.45, 1.15, 0.2]);
    xs.mesh.rotation.y = -0.3;

    // the mouth chart
    const chart = board(root, 1.15, 0.72, 575, 360, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 12); g.fillStyle = '#f3efe4'; g.fill();
      text(g, 'Mouth chart: 8 shapes', 16, 32, { font: `700 22px ${SANS}`, col: '#3b3833' });
      VIS_ORDER.forEach((k, i) => {
        const cx = 72 + (i % 4) * 140, cy = 110 + Math.floor(i / 4) * 140, on = S && S.vis === k;
        rrect(g, cx - 62, cy - 58, 124, 128, 10); g.fillStyle = on ? '#ffe7a3' : '#fff'; g.fill(); g.strokeStyle = on ? '#d8452f' : 'rgba(0,0,0,.15)'; g.lineWidth = on ? 4 : 1.5; g.stroke();
        g.fillStyle = '#ffcf6a'; g.beginPath(); g.ellipse(cx, cy, 52, 40, 0, 0, TAU); g.fill();
        drawMouth(g, cx, cy, 64, k, { lw: 2.5 });
        text(g, VISEMES[k].name.length > 10 ? 'etc: C D G K…' : VISEMES[k].name, cx, cy + 62, { font: `600 15px ${SANS}`, col: '#3b3833', align: 'center' });
      });
    }, [-1.42, 0.72, 0.3]);
    chart.mesh.rotation.y = 0.3;

    // the sound track, read frame by frame
    const trk = board(root, 2.4, 0.42, 1200, 210, (g, w, h) => {
      g.clearRect(0, 0, w, h); rrect(g, 2, 2, w - 4, h - 4, 12); g.fillStyle = 'rgba(16,19,27,.95)'; g.fill();
      if (!S) return;
      const n = S.F.length, fx = (f) => 20 + (f / n) * (w - 40);
      text(g, `Track reading: “${S.text}” · ${n} frames = ${(n / FPS).toFixed(2)} s`, 20, 30, { font: `600 20px ${SANS}`, col: '#e8eef8' });
      text(g, 'red: the sound now · green: the mouth drawn', w - 20, 30, { font: `18px ${SANS}`, col: COL.soft, align: 'right' });
      for (let f = 0; f < n; f++) {
        const p = S.F[f].p, amp = p.voiced ? (p.v === 'm' || p.v === 'l' ? 0.4 : 1) : p.noise ? 0.45 : 0.03;
        const x = fx(f), bw = (w - 40) / n;
        for (let k = 0; k < 4; k++) { const a = amp * (0.6 + 0.4 * Math.sin(f * 2.3 + k * 1.7)) * 55; g.fillStyle = p.noise && !p.voiced ? '#c49bff' : '#38bdf8'; g.fillRect(x + (k * bw) / 4, 118 - a, bw / 4 - 1, a * 2); }
        if (S.F[f].first && p.t) text(g, p.t, x + 2, 196, { font: `700 16px ${SANS}`, col: COL.hot });
      }
      g.strokeStyle = '#ff5a6e'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx(S.f), 44); g.lineTo(fx(S.f), 176); g.stroke();
      if (S.lead) { g.strokeStyle = '#7be08c'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(fx(S.f + S.lead), 44); g.lineTo(fx(S.f + S.lead), 176); g.stroke(); g.setLineDash([]); }
    }, [0, 0.22, 0.7]);
    trk.mesh.rotation.x = -0.75;

    let T = 0, voice = null, lineKey = '', F = [], tiltS = 0, browS = 0;
    const inst = {
      play() {
        T = 0; voice?.stop?.();
        voice = audio.muted ? null : speak(LINES[S?.lineKey || 'hello'].phones);
      },
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, []);
        if (s.line !== lineKey) { lineKey = s.line; F = frames(LINES[s.line]); T = 0; voice?.stop?.(); voice = null; }
        const gap = 0.7, loop = F.length / FPS + gap;
        if (voice && voice.ctx) { T = voice.ctx.currentTime - voice.t0; if (T > voice.total + 0.2) voice = null; }
        else { T += dt; if (T > loop) T -= loop; }
        const f = clamp(Math.floor(Math.max(0, T) * FPS), 0, F.length - 1);
        const lead = Math.round(s.lead), mf = clamp(f + lead, 0, F.length - 1), row = F[mf];
        // acting: tilt and brows rise on stressed syllables and relax; blink at the pauses
        let tiltT = 0, browT = 0, blink = 0;
        if (s.acting) {
          if (row.p.stress) { tiltT = 0.14; browT = 1; }
          let k = mf; while (k > 0 && F[k].i === row.i) k--;
          const since = mf - k;
          if (!row.p.t && row.i > 0 && since < 3) blink = since === 1 ? 1 : 0.6;
        }
        tiltS += (tiltT - tiltS) * Math.min(1, dt * 8); browS += (browT - browS) * Math.min(1, dt * 10);
        S = { vis: row.p.vis, f, F, lead, acting: s.acting, text: LINES[s.line].text, lineKey: s.line, tilt: s.acting ? tiltS : 0, brow: s.acting ? browS : 0, blink, look: s.acting ? Math.sin(T * 1.3) * 0.4 : 0 };
        face.redraw(); xs.redraw(); chart.redraw(); trk.redraw();
      },
      readout: (s) => {
        if (!S) return '';
        const cur = S.F[S.f], lead = Math.round(s.lead);
        const judge = lead < 0 ? 'The mouth trails the voice: it looks dubbed.' : lead > 2 ? 'Too early: the mouth moves before the sound.' : 'Feels in sync.';
        return `<div class="big">Mouth: ${VISEMES[S.vis].name}</div>
          <div class="row"><span>Line</span><b>${S.text}</b></div>
          <div class="row"><span>Frame</span><b>${S.f + 1} of ${S.F.length}</b></div>
          <div class="row"><span>Sound now</span><b>${cur.p.t || '(pause)'}</b></div>
          <div class="row"><span>Mouth timing</span><b>${lead === 0 ? 'on the sound' : lead > 0 ? lead + ' early' : -lead + ' late'}</b></div>
          <small>${judge} ${audio.muted ? 'Sound is off (♪ button, top right).' : ''}</small>`;
      },
      dispose() { voice?.stop?.(); stage.setShift(0, 0); },
    };
    return inst;
  },
};
