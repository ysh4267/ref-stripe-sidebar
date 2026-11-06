// The Things project progress pie, placed in the content area next to the sidebar (light colors).
// Coordinates are Things reference video pixels (1920x1080); the caller scales and moves the group.
// Checking an item fills the pie next to the title clockwise from 12 o'clock; unchecking shrinks it again.

const NS = 'http://www.w3.org/2000/svg';

const RING = { cx: 829.8, cy: 406.5, r: 29.75, width: 7.5, pie: 21.5, color: '#3b82f6' };
const SWEEP_ON = 90; // fill time (ms)
const SWEEP_OFF = 100; // shrink time (ms)
export const CONTENT = { x0: 760, y0: 373, x1: 1440, y1: 925 }; // area taken by the pie, title and checklist

const ITEMS = [
  { label: 'Sugar', cy: 712, baseline: 726, ink: 111 },
  { label: 'Spice', cy: 797, baseline: 810, ink: 105 },
  { label: 'Everything nice', cy: 882, baseline: 895, ink: 296 },
];

function el(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}

function piePath(cx, cy, r, fraction) {
  if (fraction <= 0.0005) return '';
  if (fraction >= 0.9995) return `M${cx} ${cy - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}Z`;
  const a = -Math.PI / 2 + fraction * Math.PI * 2;
  const x = cx + r * Math.cos(a);
  const y = cy + r * Math.sin(a);
  return `M${cx} ${cy}V${cy - r}A${r} ${r} 0 ${fraction > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)}Z`;
}

// Builds the checklist into `group`. `fitText(node, spec)` sizes text like the rest of the page.
export function buildProgress(group, fitText) {
  const texts = [];
  el('circle', { cx: RING.cx, cy: RING.cy, r: RING.r, fill: 'none', stroke: RING.color, 'stroke-width': RING.width }, group);
  const pie = el('path', { fill: RING.color }, group);
  texts.push([el('text', {}, group), { text: 'Project X', x: 887, y: 429.5, cap: 48.5, ink: 279, weight: 700, fill: '#1c1c1e' }]);
  for (const cx of [1200.5, 1220.5, 1240.5]) el('circle', { cx, cy: 408.5, r: 4.7, fill: '#a8a8ad' }, group);

  const rows = ITEMS.map((item) => {
    const g = el('g', { class: 'row' }, group);
    el('rect', { class: 'band', x: CONTENT.x0, y: item.cy - 42.5, width: CONTENT.x1 - CONTENT.x0, height: 85, rx: 16, fill: '#eeeef1' }, g);
    const box = el('g', { class: 'box' }, g);
    el('rect', { class: 'outline', x: 789.5, y: item.cy - 16.5, width: 33, height: 33, rx: 8, fill: 'none', stroke: '#c6c6cb', 'stroke-width': 2.8 }, box);
    const fill = el('g', { class: 'fill' }, box);
    el('rect', { x: 788, y: item.cy - 18, width: 36, height: 36, rx: 8.5, fill: RING.color }, fill);
    el('path', { class: 'check', d: `M797.5 ${item.cy + 0.5}l6 6.2 11.5-13`, pathLength: 1, fill: 'none', stroke: '#fff', 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fill);
    const label = el('text', { class: 'label' }, g);
    texts.push([label, { text: item.label, x: 854.5, y: item.baseline, cap: 30, ink: item.ink, weight: 500 }]);
    const hit = el('rect', { class: 'hit', x: 774, y: item.cy - 32, width: 64, height: 64, role: 'checkbox', tabindex: 0, 'aria-label': item.label, 'aria-checked': 'false' }, g);
    return { g, hit, done: false };
  });

  const progress = { value: 0, from: 0, to: 0, start: 0, ms: 0 };
  let frame = 0;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const draw = () => pie.setAttribute('d', piePath(RING.cx, RING.cy, RING.pie, progress.value));
  const tick = (now) => {
    frame = 0;
    const t = Math.min(1, (now - progress.start) / progress.ms);
    progress.value = progress.from + (progress.to - progress.from) * easeInOut(t);
    draw();
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  const sweepTo = (value, ms) => {
    Object.assign(progress, { from: progress.value, to: value, start: performance.now(), ms });
    if (!frame) frame = requestAnimationFrame(tick);
  };

  function setDone(row, done) {
    row.done = done;
    row.g.classList.toggle('done', done);
    row.hit.setAttribute('aria-checked', String(done));
    sweepTo(rows.filter((r) => r.done).length / rows.length, done ? SWEEP_ON : SWEEP_OFF);
  }

  // The row highlights while pressed and the check toggles on release.
  for (const row of rows) {
    const press = (on) => row.g.classList.toggle('pressed', on);
    row.hit.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      try { row.hit.setPointerCapture(event.pointerId); } catch (e) { /* synthetic pointer */ }
      press(true);
    });
    row.hit.addEventListener('pointerup', (event) => {
      if (!row.g.classList.contains('pressed')) return;
      press(false);
      const box = row.hit.getBoundingClientRect();
      const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (inside) setDone(row, !row.done);
    });
    row.hit.addEventListener('pointercancel', () => press(false));
    row.hit.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      setDone(row, !row.done);
    });
  }

  const fitAll = () => {
    for (const [node, spec] of texts) fitText(node, spec);
  };
  fitAll();
  draw();

  // For the demo: press a row briefly, then toggle it.
  async function tap(index) {
    const row = rows[index];
    row.g.classList.add('pressed');
    await new Promise((resolve) => setTimeout(resolve, 140));
    row.g.classList.remove('pressed');
    setDone(row, !row.done);
  }

  return { fitAll, tap, rows, count: rows.length, disable: () => rows.forEach((r) => { r.hit.style.pointerEvents = 'none'; }) };
}
