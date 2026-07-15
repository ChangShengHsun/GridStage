/**
 * Builds two demo choreographies for the GridStage demo video and emits a
 * same-origin seed page (apps/web/public/seed-demo.html) that writes them into
 * the app's library (localStorage keys `gridstage-doc:<id>` + `gridstage-library`).
 *
 * Deterministic ids → re-running overwrites cleanly, no duplicates.
 * ponytail: demo aids. Delete this file + public/seed-demo.html after filming.
 *
 * Run:  node demo/build-demo-docs.mjs
 * Use:  open the app dev server, visit /seed-demo.html, click the button,
 *       then open the app's Library and pick a demo.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'seed-demo.html');

const STAGE_W = 12;
const STAGE_H = 8;
const HOLD = 4000; // ms a formation holds
const GAP = 4000; // ms of travel to the next formation
const PALETTE = ['#e8843c', '#5b8ff0', '#58b5a4', '#d0668f', '#8f7ee0'];

/** A performance shell matching store.createInitialDoc()'s shape. */
function performance(id, title) {
  return {
    id,
    orgId: 'local',
    title,
    stageWidth: STAGE_W,
    stageHeight: STAGE_H,
    bpm: 120,
    audioAssetId: null,
    beatMarkersMs: [],
    sections: [],
    countSegments: [],
  };
}

function performer(docId, i, name, badge) {
  return {
    id: `${docId}-p${i + 1}`,
    performanceId: docId,
    name,
    color: PALETTE[i % PALETTE.length],
    role: '',
    avatarUrl: null,
    badge,
  };
}

/**
 * @param frames array of { name, transitionType, spots }, spots = array aligned
 *   to the cast: { x, y, rot, control? }. `control` (one {x,y}) bows the path
 *   OUT of this frame when transitionType is 'curve'.
 */
function buildDoc(docId, title, cast, frames) {
  const formations = [];
  const positions = {};
  frames.forEach((frame, fi) => {
    const fid = `${docId}-f${fi + 1}`;
    formations.push({
      id: fid,
      performanceId: docId,
      orderIndex: fi,
      startTimeMs: fi * (HOLD + GAP),
      durationMs: HOLD,
      transitionType: frame.transitionType,
      name: frame.name,
    });
    positions[fid] = {};
    cast.forEach((p, pi) => {
      const spot = frame.spots[pi];
      const pos = { formationId: fid, performerId: p.id, x: spot.x, y: spot.y, rotation: spot.rot };
      if (frame.transitionType === 'curve' && spot.control) {
        pos.curveControlPoints = [spot.control];
      }
      positions[fid][p.id] = pos;
    });
  });
  return {
    performance: performance(docId, title),
    performers: cast,
    props: [],
    formations,
    positions,
    comments: [],
    annotations: [],
  };
}

// ── Demo A: solo focus, straight + curved paths, varied facings (stages 2 & 3)
const castA = [
  performer('demo-paths', 0, 'Ava', 'A'),
  performer('demo-paths', 1, 'Ben', 'B'),
  performer('demo-paths', 2, 'Cleo', 'C'),
];
const docA = buildDoc('demo-paths', 'Demo · Paths & Facing', castA, [
  {
    name: 'Line — face front',
    transitionType: 'linear', // straight travel to frame 2
    spots: [
      { x: 3, y: 6.5, rot: 0 },
      { x: 6, y: 6.5, rot: 0 },
      { x: 9, y: 6.5, rot: 0 },
    ],
  },
  {
    name: 'Spread — turned',
    transitionType: 'curve', // curved travel to frame 3
    spots: [
      { x: 2, y: 2, rot: 90, control: { x: 2.5, y: 4.5 } }, // faces stage-right
      { x: 6, y: 4, rot: 180, control: { x: 8, y: 4.5 } }, // faces upstage
      { x: 10, y: 6, rot: 0, control: { x: 10, y: 3 } }, // faces audience
    ],
  },
  {
    name: 'Cluster — face front',
    transitionType: 'linear',
    spots: [
      { x: 5, y: 3, rot: 0 },
      { x: 6, y: 5, rot: 0 },
      { x: 7, y: 3, rot: 0 },
    ],
  },
]);

// ── Demo B: five dancers, five template-style formations (stage 4)
const castB = [0, 1, 2, 3, 4].map((i) => performer('demo-five', i, `D${i + 1}`, String(i + 1)));
const docB = buildDoc('demo-five', 'Demo · Five Dancers', castB, [
  {
    name: 'Line',
    transitionType: 'linear',
    spots: [
      { x: 2, y: 6.5, rot: 0 },
      { x: 4, y: 6.5, rot: 0 },
      { x: 6, y: 6.5, rot: 0 },
      { x: 8, y: 6.5, rot: 0 },
      { x: 10, y: 6.5, rot: 0 },
    ],
  },
  {
    name: 'V',
    transitionType: 'linear',
    spots: [
      { x: 6, y: 2, rot: 0 },
      { x: 4, y: 3.5, rot: 0 },
      { x: 8, y: 3.5, rot: 0 },
      { x: 2, y: 5, rot: 0 },
      { x: 10, y: 5, rot: 0 },
    ],
  },
  {
    name: 'Circle',
    transitionType: 'curve', // curved travel to the two rows
    spots: [
      { x: 6, y: 1.5, rot: 0, control: { x: 4.5, y: 3.5 } },
      { x: 3.6, y: 3.3, rot: 0, control: { x: 4.8, y: 1.5 } },
      { x: 4.55, y: 6.1, rot: 0, control: { x: 5, y: 4 } },
      { x: 7.45, y: 6.1, rot: 0, control: { x: 6.2, y: 7.5 } },
      { x: 8.4, y: 3.3, rot: 0, control: { x: 9.5, y: 4.65 } },
    ],
  },
  {
    name: 'Two rows',
    transitionType: 'linear',
    spots: [
      { x: 4, y: 3, rot: 0 },
      { x: 6, y: 3, rot: 0 },
      { x: 8, y: 3, rot: 0 },
      { x: 5, y: 6, rot: 0 },
      { x: 7, y: 6, rot: 0 },
    ],
  },
  {
    name: 'Diagonal — turned',
    transitionType: 'linear',
    spots: [
      { x: 2, y: 7, rot: 45 },
      { x: 4, y: 6, rot: 45 },
      { x: 6, y: 5, rot: 45 },
      { x: 8, y: 4, rot: 45 },
      { x: 10, y: 3, rot: 45 },
    ],
  },
]);

// ── sanity checks: every formation places every cast member, curves have a point
function verify(doc) {
  for (const f of doc.formations) {
    for (const p of doc.performers) {
      const pos = doc.positions[f.id]?.[p.id];
      if (!pos) throw new Error(`${doc.performance.title}: ${f.name} missing ${p.name}`);
      if (pos.x < 0 || pos.x > STAGE_W || pos.y < 0 || pos.y > STAGE_H) {
        throw new Error(`${doc.performance.title}: ${f.name}/${p.name} off stage (${pos.x},${pos.y})`);
      }
      if (f.transitionType === 'curve' && !pos.curveControlPoints) {
        throw new Error(`${doc.performance.title}: ${f.name}/${p.name} curve without control point`);
      }
    }
  }
  console.log(
    `✓ ${doc.performance.title}: ${doc.performers.length} dancers, ${doc.formations.length} formations ` +
      `(${doc.formations.filter((f) => f.transitionType === 'curve').length} curved transitions)`,
  );
}
verify(docA);
verify(docB);

const docs = [docA, docB];
const entries = docs.map((d) => ({ id: d.performance.id, title: d.performance.title }));

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GridStage — 載入示範舞碼</title>
<style>
  body { font-family: system-ui, sans-serif; background: #191512; color: #efe7dc;
    display: grid; place-items: center; min-height: 100vh; margin: 0; }
  main { max-width: 30rem; padding: 2rem; text-align: center; }
  button { font-size: 1rem; padding: .7rem 1.4rem; border-radius: 8px; border: 0;
    background: #e8843c; color: #1a1410; font-weight: 600; cursor: pointer; }
  a { color: #e8843c; }
  ul { text-align: left; line-height: 1.6; }
  #done { margin-top: 1rem; color: #58b5a4; min-height: 1.2em; }
</style>
</head>
<body>
<main>
  <h1>GridStage 示範舞碼</h1>
  <p>按下按鈕，把兩份示範舞碼載入這個瀏覽器的作品庫（Library）：</p>
  <ul>
    ${entries.map((e) => `<li>${e.title}</li>`).join('\n    ')}
  </ul>
  <button id="seed">載入示範舞碼</button>
  <p id="done"></p>
  <p><a href="/">← 回到 GridStage</a>，開啟左上角的 Library 就能看到。</p>
</main>
<script>
  const DOCS = ${JSON.stringify(docs)};
  document.getElementById('seed').addEventListener('click', () => {
    const index = JSON.parse(localStorage.getItem('gridstage-library') || '[]');
    const byId = new Map(index.map((e) => [e.id, e]));
    for (const doc of DOCS) {
      localStorage.setItem('gridstage-doc:' + doc.performance.id, JSON.stringify(doc));
      byId.set(doc.performance.id, {
        id: doc.performance.id,
        title: doc.performance.title,
        updatedAt: new Date().toISOString(),
        tags: (byId.get(doc.performance.id) || {}).tags || [],
        archived: false,
      });
    }
    localStorage.setItem('gridstage-library', JSON.stringify([...byId.values()]));
    document.getElementById('done').textContent = '✓ 已載入 ' + DOCS.length + ' 份，去 Library 開啟吧。';
  });
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`✓ wrote ${OUT}`);
