// Recreates the sidebar collapse handle of the Stripe dashboard from the reference video.
// All numbers were measured frame by frame from the video (1920x1080), in video pixels.
// Hovering the handle nudges the sidebar edge in (expanded) or out (collapsed),
// and the handle bar bends into a chevron, straightening when the pointer leaves. Clicking collapses or expands the sidebar.
// Only the sidebar is drawn (the content area on the right is left out).
// The video is the real UI zoomed 3.2x, so the page draws it at 1/3.2 to get the real sidebar size.

import { buildProgress, CONTENT } from './progress.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);

const SCALE = 1 / 3.2; // CSS px per video px
const HANDLE_Y = 550; // handle center height in the video; on screen it sits at the vertical middle of the window
const EDGE = { open: 756.5, shut: 194 }; // right edge of the sidebar
const PEEK = 25.5; // how far the edge moves toward the other state on hover

// Handle: a vertical bar 27.5px right of the edge; on hover it becomes a chevron 32-49px from the edge.
const BAR = [[27.5, 531], [27.5, 550], [27.5, 569]];
const CHEVRON = {
  open: [[49, 533.7], [32, 549.8], [49, 566]], // expanded: collapse "<"
  shut: [[33.8, 533.7], [47.8, 549.8], [33.8, 566]], // collapsed: expand ">"
};
const BAR_IDLE = [138, 137, 150];
const BAR_HOT = [84, 91, 98];

// Timing (ms). The tooltip appears at once and only fades out, over 0.3s (style.css).
const EDGE_IN = 120;
const EDGE_OUT = 100;
const BEND_IN = 80;
const BEND_OUT = 100;
const FOLD_MS = 300; // how long the edge slides when collapsing or expanding
// The Things checklist sits in the content area: its video is zoomed about 2.4x (0.42 CSS px per video px).
const CONTENT_SCALE = 0.42 / (1 / 3.2);
const CONTENT_GAP = 56 * 3.2; // space between the sidebar edge and the checklist (56 CSS px)
const CONTENT_TOP = 36 * 3.2; // top of the checklist (36 CSS px)

const TIP = {
  open: { label: 'Collapse', dx: 79, width: 227, ink: 174 },
  shut: { label: 'Expand', dx: 78.3, width: 205.3, ink: 151 },
};

const ICON = {
  wallet: '<rect x="0.9" y="4.4" width="14.2" height="10.9" rx="2.4"/><path d="M1.9 4.4 10.9 1.3c.8-.3 1.6.3 1.6 1.1v2"/><circle cx="12.4" cy="9.6" r="0.95" class="dot"/>',
  billing: '<path d="M10.9 6.6V3.1A2.3 2.3 0 0 0 8.6.8H3A2.3 2.3 0 0 0 .7 3.1v9.4A2.3 2.3 0 0 0 3 14.8h.4"/><path d="M2.8 4.1h3.2M2.8 6.9h5.7"/><path d="M13.9 8.9a3.5 3.5 0 1 1-5.6 3.9"/><path d="M8.1 10.1v2.8h2.8"/>',
  reporting: '<path d="M1.65 1.2v13.35H15.3"/><path d="M5.5 10.6V4.4M8.6 10.6V5.8M11.9 10.6V1.25"/>',
  more: '<circle cx="2.2" cy="8" r="1.25" class="dot"/><circle cx="7.85" cy="8" r="1.25" class="dot"/><circle cx="13.5" cy="8" r="1.25" class="dot"/>',
  chevron: '<path d="M5.2 6.6 8 9.4l2.8-2.8"/>',
};

const NAV = [
  { icon: 'wallet', label: 'Payments', iconY: 163, baseline: 177, ink: 196 },
  { icon: 'billing', label: 'Billing', iconY: 258.5, baseline: 273, ink: 117 },
  { icon: 'reporting', label: 'Reporting', iconY: 354.5, baseline: 369, ink: 195 },
  { icon: 'more', label: 'More', iconY: 450.5, baseline: 465, ink: 100 },
];
const SHUT_SHIFT = -95; // when collapsed the heading row goes away and the icons move up one row

const scene = $('scene');
const navLabels = $('nav-labels');
const navIcons = $('nav-icons');
const content = $('content');
const clipRect = $('side-clip-rect');
const handle = $('handle');
const edge = $('edge');
const bar = $('bar');
const hit = $('hit');
const tip = $('tip');
const tipBox = $('tip-box');
const tipText = $('tip-text');

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.append(node);
  return node;
}

function icon(name, cx, cy, scale, color, width = 1.5) {
  const g = el('g', {
    class: 'line-icon',
    transform: `translate(${cx - 8 * scale} ${cy - 8 * scale}) scale(${scale})`,
    stroke: color,
    'stroke-width': width,
  });
  g.innerHTML = ICON[name];
  for (const dot of g.querySelectorAll('.dot')) {
    dot.setAttribute('fill', color);
    dot.setAttribute('stroke', 'none');
  }
  return g;
}

/* ------------------------------------------------------------- text fitting */

// The video uses the macOS system font. Inter stands in, sized so cap height and ink width match the video.
const measure = document.createElement('canvas').getContext('2d');
const capRatio = {};

function capOf(weight) {
  if (!capRatio[weight]) {
    measure.font = `${weight} 100px Inter`;
    capRatio[weight] = measure.measureText('H').actualBoundingBoxAscent / 100;
  }
  return capRatio[weight];
}

function fitText(node, spec, offsetX = 0) {
  const size = spec.cap / capOf(spec.weight);
  measure.font = `${spec.weight} ${size}px Inter`;
  const m = measure.measureText(spec.text);
  const natural = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
  const gaps = Math.max(1, [...spec.text].length - 1);
  node.textContent = spec.text;
  node.setAttribute('x', (offsetX + spec.x + m.actualBoundingBoxLeft).toFixed(2));
  node.setAttribute('y', spec.y);
  if (spec.fill) node.setAttribute('fill', spec.fill);
  node.style.font = `${spec.weight} ${size.toFixed(3)}px Inter, sans-serif`;
  node.style.letterSpacing = `${((spec.ink - natural) / gaps).toFixed(3)}px`;
}

/* ------------------------------------------------------------- scene */

let products = null;
let checklist = null;

function build() {
  const defs = el('defs', {}, scene);
  defs.innerHTML = `<linearGradient id="edge-fade" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#fbfbfb"/><stop offset=".38" stop-color="#f5f5f5"/>
    <stop offset=".5" stop-color="#f3f3f3"/><stop offset=".62" stop-color="#f5f5f5"/><stop offset=".8" stop-color="#fafafa"/>
    <stop offset="1" stop-color="#fff"/></linearGradient>`;
  scene.prepend(defs);
  edge.setAttribute('width', 3.2); // 1px on screen

  // Labels (heading, item names, chevrons) are clipped to the sidebar edge; icons move separately.
  products = el('text', {}, navLabels);
  for (const item of NAV) {
    navIcons.append(icon(item.icon, 93.5, item.iconY, 3.2, '#707279'));
    item.node = el('text', {}, navLabels);
    navLabels.append(icon('chevron', 662, item.baseline - 13, 3.2, '#78787a', 1.35));
  }
  checklist = buildProgress(content, fitText);
}

// Fit the visible area to the window: fixed scale, handle at the vertical middle.
function fitView() {
  const w = window.innerWidth / SCALE;
  const h = window.innerHeight / SCALE;
  scene.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
  // Middle of the window, but in short windows no higher than 300px so the tooltip stays below the checklist.
  const handleCss = Math.max(window.innerHeight / 2, Math.min(300, window.innerHeight - 40));
  const dy = handleCss / SCALE - HANDLE_Y;
  handle.setAttribute('transform', `translate(0 ${dy.toFixed(1)})`);
  tip.setAttribute('transform', `translate(0 ${dy.toFixed(1)})`);
  edge.setAttribute('y', -20);
  edge.setAttribute('height', (h + 40).toFixed(1));
}

function fitAll() {
  fitText(products, { text: 'Products', x: 58, y: 87, cap: 28, ink: 157, weight: 450, fill: '#636365' });
  for (const item of NAV) {
    fitText(item.node, { text: item.label, x: 161, y: item.baseline, cap: 33, ink: item.ink, weight: 440, fill: '#3b3b3e' });
  }
  const t = TIP[state.collapsed ? 'shut' : 'open'];
  fitText(tipText, { text: t.label, x: 0, y: 567, cap: 32.6, ink: t.ink, weight: 400, fill: '#fff' }, peekEdge() + t.dx + 27.5);
}

/* ------------------------------------------------------------- state and motion */

const state = { collapsed: false, hover: false };
// fold: 0 expanded to 1 collapsed (slides on toggle), peek: how far the edge moved on hover, bend: how far the bar is bent
const anim = { fold: 0, peek: 0, bend: 0 };
const tweens = new Map();
let frame = 0;

const idleEdge = () => (state.collapsed ? EDGE.shut : EDGE.open);
const peekEdge = () => (state.collapsed ? EDGE.shut + PEEK : EDGE.open - PEEK);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function tween(key, to, ms, ease = easeOut) {
  tweens.set(key, { from: anim[key], to, start: performance.now(), ms, ease });
  if (!frame) frame = requestAnimationFrame(tick);
}

function tick(now) {
  frame = 0;
  for (const [key, tw] of tweens) {
    const t = Math.min(1, (now - tw.start) / tw.ms);
    anim[key] = tw.from + (tw.to - tw.from) * tw.ease(t);
    if (t >= 1) tweens.delete(key);
  }
  render();
  if (tweens.size) frame = requestAnimationFrame(tick);
}

const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;

function edgeNow() {
  const base = EDGE.open + (EDGE.shut - EDGE.open) * anim.fold;
  const dir = state.collapsed ? 1 : -1;
  return base + dir * PEEK * anim.peek;
}

function render() {
  const x = edgeNow();
  edge.setAttribute('x', (x - 1.6).toFixed(2));
  clipRect.setAttribute('width', Math.max(0, x - 2).toFixed(2));
  hit.setAttribute('x', (x - 20).toFixed(2));
  // As in the reference, the items switch at once on click: collapsing hides the heading, names and chevrons and
  // moves the icons up a row; expanding brings them back, revealed by the edge as it slides open.
  navLabels.style.display = state.collapsed ? 'none' : '';
  navIcons.setAttribute('transform', `translate(0 ${state.collapsed ? SHUT_SHIFT : 0})`);
  // The checklist follows the sidebar edge (without the small hover nudge).
  const base = EDGE.open + (EDGE.shut - EDGE.open) * anim.fold;
  content.setAttribute('transform', `translate(${(base + CONTENT_GAP).toFixed(2)} ${CONTENT_TOP}) scale(${CONTENT_SCALE.toFixed(4)}) translate(${-CONTENT.x0} ${-CONTENT.y0})`);
  const target = CHEVRON[state.collapsed ? 'shut' : 'open'];
  const points = BAR.map(([bx, by], i) => {
    const [cx, cy] = target[i];
    return `${(x + bx + (cx - bx) * anim.bend).toFixed(2)},${(by + (cy - by) * anim.bend).toFixed(2)}`;
  });
  bar.setAttribute('points', points.join(' '));
  bar.setAttribute('stroke', mix(BAR_IDLE, BAR_HOT, anim.bend));
}

function layout() {
  hit.setAttribute('aria-label', state.collapsed ? 'Expand' : 'Collapse');
  const t = TIP[state.collapsed ? 'shut' : 'open'];
  tipBox.setAttribute('x', peekEdge() + t.dx);
  tipBox.setAttribute('width', t.width);
  fitAll();
  render();
}

function setHover(on) {
  if (state.hover === on) return;
  state.hover = on;
  tween('peek', on ? 1 : 0, on ? EDGE_IN : EDGE_OUT);
  tween('bend', on ? 1 : 0, on ? BEND_IN : BEND_OUT);
  tip.classList.toggle('on', on);
  tip.classList.toggle('fade', !on);
}

// On click the tooltip goes away and the edge slides to the other position; the handle follows the edge.
function toggle() {
  state.collapsed = !state.collapsed;
  state.hover = false;
  tip.classList.remove('on', 'fade');
  tween('fold', state.collapsed ? 1 : 0, FOLD_MS, easeInOut);
  tween('peek', 0, 120);
  tween('bend', 0, BEND_OUT);
  layout();
}

hit.addEventListener('pointerenter', () => {
  if (!tweens.has('fold')) setHover(true);
});
hit.addEventListener('pointerleave', () => setHover(false));
hit.addEventListener('click', () => {
  toggle();
  if (hit.matches(':focus-visible')) setHover(true);
});
hit.addEventListener('focus', () => {
  if (hit.matches(':focus-visible')) setHover(true);
});
hit.addEventListener('blur', () => setHover(false));
hit.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  toggle();
  setHover(true);
});
window.addEventListener('resize', fitView);

/* ------------------------------------------------------------- demo */

// For the gallery preview: with ?demo the page collapses the sidebar, checks the items, expands it and unchecks them.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demo() {
  hit.style.pointerEvents = 'none';
  checklist.disable();
  for (;;) {
    await wait(800);
    setHover(true);
    await wait(1200);
    toggle();
    await wait(700);
    for (let i = 0; i < checklist.count; i += 1) {
      await checklist.tap(i);
      await wait(800);
    }
    setHover(true);
    await wait(1200);
    toggle();
    await wait(700);
    for (let i = checklist.count - 1; i >= 0; i -= 1) {
      await checklist.tap(i);
      await wait(700);
    }
  }
}

// Used by the comparison tool to set the exact pose of a video frame.
window.__page = {
  pose({ collapsed = false, edge: edgeT = 0, bend = 0, tip: showTip = false } = {}) {
    if (state.collapsed !== collapsed) toggle();
    tweens.clear();
    state.hover = showTip;
    anim.fold = collapsed ? 1 : 0;
    anim.peek = edgeT;
    anim.bend = bend;
    tip.classList.toggle('on', showTip);
    tip.classList.remove('fade');
    render();
  },
};

build();
fitView();
layout();
Promise.all([400, 440, 450].map((weight) => document.fonts.load(`${weight} 40px Inter`)))
  .catch(() => {})
  .then(() => {
    for (const key of Object.keys(capRatio)) delete capRatio[key];
    fitAll();
    checklist.fitAll();
  });
if (new URLSearchParams(location.search).has('demo')) demo();
