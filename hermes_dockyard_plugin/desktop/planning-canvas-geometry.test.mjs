// Planning canvas geometry — P1-1 (connector labels overprint) and
// P1-2 (frames escape the world / clip at the stage edge).
// Pure-function tests: no browser, no host. RED against the pre-fix layout.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutConnectors, layoutFrames, CANVAS_FRAME_PAD } from './planning-canvas-geometry.js';

const card = (id, x, y, tags = []) => ({ id, x, y, width: 240, height: 140, tags });
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const label = (text) => text; // identity labeller

// The exact demo fixture that produced the gibberish in the audit capture.
const FIXTURE_OBJECTS = [
  card('ev1', 80, 80, ['activation']), card('ev2', 80, 260, ['activation']),
  card('cl1', 400, 80, ['activation']), card('qu1', 400, 260),
  card('dc1', 720, 80, ['activation']), card('pl1', 720, 260, ['activation']),
  card('nt1', 1040, 80),
];
const FIXTURE_EDGES = [
  { id: 'c1', source: 'ev1', target: 'cl1', meaning: 'supports' },
  { id: 'c2', source: 'ev2', target: 'qu1', meaning: 'clarifies' },
  { id: 'c3', source: 'cl1', target: 'ev1', meaning: 'derived from' },
  { id: 'c4', source: 'pl1', target: 'dc1', meaning: 'implements' },
];

test('P1-1: reciprocal connectors do not share a label box', () => {
  const edges = layoutConnectors(FIXTURE_OBJECTS, FIXTURE_EDGES, label);
  const boxes = edges.map((e) => e.labelBox);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert.ok(!overlaps(boxes[i], boxes[j]), `labels ${edges[i].id} and ${edges[j].id} overlap`);
  }
});

test('P1-1: reciprocal connectors are drawn as two visibly separate lines', () => {
  const [a, , b] = layoutConnectors(FIXTURE_OBJECTS, FIXTURE_EDGES, label);
  const gap = Math.abs(a.y1 - b.y2) + Math.abs(a.y2 - b.y1);
  assert.ok(gap >= 8, `reciprocal lines must be offset, got gap ${gap}`);
});

test('P1-1: no label sits on top of any card (tidied / stacked layout)', () => {
  // Tidy stacks cards in a tight column: centre-to-centre midpoints land on cards.
  const stacked = [card('a', 60, 60), card('b', 60, 250), card('c', 60, 440), card('d', 340, 250)];
  const edges = layoutConnectors(stacked, [
    { id: 'e1', source: 'a', target: 'c', meaning: 'depends on' },
    { id: 'e2', source: 'b', target: 'd', meaning: 'implements' },
    { id: 'e3', source: 'd', target: 'b', meaning: 'raises a question' },
  ], label);
  for (const e of edges) for (const o of stacked) {
    assert.ok(!overlaps(e.labelBox, o), `label ${e.id} is drawn over card ${o.id}`);
  }
});

test('P1-1: connectors end at card borders, not card centres (arrowheads stay visible)', () => {
  const [e] = layoutConnectors(FIXTURE_OBJECTS, [FIXTURE_EDGES[0]], label);
  assert.equal(e.x1, 80 + 240); // right edge of ev1
  assert.equal(e.x2, 400);      // left edge of cl1
});

test('P1-2: a frame never extends outside the world, and keeps its label + padding', () => {
  const frames = layoutFrames([card('a', 0, 0, ['edge']), card('b', 300, 10, ['edge'])]);
  assert.equal(frames.length, 1);
  const f = frames[0];
  assert.ok(f.x >= 0 && f.y >= 0, `frame escapes world at ${f.x},${f.y}`);
});

test('P1-2: every tagged card sits inside its frame with the full padding', () => {
  for (const f of layoutFrames(FIXTURE_OBJECTS)) {
    for (const o of FIXTURE_OBJECTS.filter((item) => item.tags.includes(f.tag))) {
      assert.ok(o.x - f.x >= CANVAS_FRAME_PAD.side, `${o.id} left pad`);
      assert.ok(o.y - f.y >= CANVAS_FRAME_PAD.top, `${o.id} top pad (label room)`);
      assert.ok(f.x + f.width - (o.x + o.width) >= CANVAS_FRAME_PAD.side, `${o.id} right pad`);
      assert.ok(f.y + f.height - (o.y + o.height) >= CANVAS_FRAME_PAD.side, `${o.id} bottom pad`);
    }
  }
});

test('P1-2: frames need at least two members (unchanged rule)', () => {
  assert.equal(layoutFrames([card('solo', 100, 100, ['x'])]).length, 0);
});
