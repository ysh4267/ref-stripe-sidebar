// Things-style projects with progress pies, placed in the content area next to the sidebar (light colors).
// Coordinates are Things reference video pixels (1920x1080); the caller scales and moves the group.
// A project starts as a dashed grey circle. Clicking it draws a solid ring clockwise from 12 o'clock and
// unlocks its to-dos; checking a to-do fills the pie, as in the reference. Clicking again locks it.

const NS = 'http://www.w3.org/2000/svg';

const COLOR = '#3b82f6';
const RING = { dx: 69.8, r: 29.75, width: 7.5, pie: 21.5 }; // ring center is 69.8 right of the row band
const SWEEP_ON = 90; // pie fill time (ms)
const SWEEP_OFF = 100; // pie shrink time (ms)
const DRAW_RING = 300; // solid ring draw time (ms), see style.css
const PROJECT_GAP = 430; // vertical distance between projects
const FIRST_ITEM = 128; // first to-do below the project ring
const ITEM_PITCH = 85;

const PROJECTS = [
  { name: 'Project X', items: ['Sugar', 'Spice', 'Everything nice'], active: true },
  { name: 'Project Y', items: ['Flour', 'Butter', 'A pinch of salt'], active: false },
  { name: 'Project Z', items: ['Coffee', 'Oat milk', 'Ice'], active: false },
];

const X0 = 760; // left of the row band
const X1 = 1440; // right of the row band
const TOP = 406.5; // first project ring center
export const CONTENT = {
  x0: X0,
  y0: TOP - 33.5,
  x1: X1,
  y1: TOP + (PROJECTS.length - 1) * PROJECT_GAP + FIRST_ITEM + 2 * ITEM_PITCH + 42.5,
};

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

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Press, release inside to act: the same feel for project rings and to-dos.
function pressable(hit, target, act) {
  hit.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    try { hit.setPointerCapture(event.pointerId); } catch (e) { /* synthetic pointer */ }
    target.classList.add('pressed');
  });
  hit.addEventListener('pointerup', (event) => {
    if (!target.classList.contains('pressed')) return;
    target.classList.remove('pressed');
    const box = hit.getBoundingClientRect();
    if (event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom) act();
  });
  hit.addEventListener('pointercancel', () => target.classList.remove('pressed'));
  hit.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    act();
  });
}

// Builds the projects into `group`. `fitText(node, spec)` sizes text like the rest of the page.
export function buildProgress(group, fitText) {
  const texts = [];
  const projects = PROJECTS.map((spec, p) => {
    const cy = TOP + p * PROJECT_GAP;
    const cx = X0 + RING.dx;
    const g = el('g', { class: `project${spec.active ? ' active' : ''}` }, group);

    // Project icon: dashed grey circle when locked, solid ring with the progress pie when active.
    const icon = el('g', { class: 'icon' }, g);
    const dashes = 14;
    const period = (2 * Math.PI * RING.r) / dashes;
    el('circle', { class: 'ring-dash', cx, cy, r: RING.r, fill: 'none', stroke: '#b9b9be', 'stroke-width': 5, 'stroke-dasharray': `${(period * 0.55).toFixed(2)} ${(period * 0.45).toFixed(2)}`, transform: `rotate(-90 ${cx} ${cy})` }, icon);
    el('circle', { class: 'ring-solid', cx, cy, r: RING.r, fill: 'none', stroke: COLOR, 'stroke-width': RING.width, pathLength: 1, transform: `rotate(-90 ${cx} ${cy})` }, icon);
    const pie = el('path', { class: 'pie', fill: COLOR }, icon);
    texts.push([el('text', { class: 'title' }, g), { text: spec.name, x: 887, y: cy + 23, cap: 48.5, ink: 279, weight: 700, fill: '#1c1c1e' }]);
    for (const dx of [1200.5, 1220.5, 1240.5]) el('circle', { cx: dx, cy: cy + 2, r: 4.7, fill: '#a8a8ad' }, g);
    const ringHit = el('rect', { class: 'hit ring-hit', x: cx - 44, y: cy - 44, width: 88, height: 88, rx: 44, role: 'checkbox', tabindex: 0, 'aria-label': `Activate ${spec.name}`, 'aria-checked': String(spec.active) }, g);

    const project = { g, pie, ringHit, active: spec.active, rows: [], progress: { value: 0, from: 0, to: 0, start: 0, ms: 0, frame: 0 } };

    project.rows = spec.items.map((label, k) => {
      const icy = cy + FIRST_ITEM + k * ITEM_PITCH;
      const rg = el('g', { class: 'row' }, g);
      el('rect', { class: 'band', x: X0, y: icy - 42.5, width: X1 - X0, height: 85, rx: 16, fill: '#eeeef1' }, rg);
      const box = el('g', { class: 'box' }, rg);
      el('rect', { class: 'outline', x: 789.5, y: icy - 16.5, width: 33, height: 33, rx: 8, fill: 'none', stroke: '#c6c6cb', 'stroke-width': 2.8 }, box);
      const fill = el('g', { class: 'fill' }, box);
      el('rect', { x: 788, y: icy - 18, width: 36, height: 36, rx: 8.5, fill: COLOR }, fill);
      el('path', { class: 'check', d: `M797.5 ${icy + 0.5}l6 6.2 11.5-13`, pathLength: 1, fill: 'none', stroke: '#fff', 'stroke-width': 3.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fill);
      texts.push([el('text', { class: 'label' }, rg), { text: label, x: 854.5, y: icy + 14, cap: 30, weight: 500 }]);
      const hit = el('rect', { class: 'hit', x: 774, y: icy - 32, width: 64, height: 64, role: 'checkbox', tabindex: spec.active ? 0 : -1, 'aria-label': label, 'aria-checked': 'false', 'aria-disabled': String(!spec.active) }, rg);
      return { g: rg, hit, done: false };
    });
    return project;
  });

  const drawPie = (project) => {
    const cy = TOP + projects.indexOf(project) * PROJECT_GAP;
    project.pie.setAttribute('d', piePath(X0 + RING.dx, cy, RING.pie, project.progress.value));
  };
  const sweep = (project, value, ms, delay = 0) => {
    const pr = project.progress;
    Object.assign(pr, { from: pr.value, to: value, start: performance.now() + delay, ms });
    const tick = (now) => {
      pr.frame = 0;
      const t = Math.min(1, Math.max(0, (now - pr.start) / pr.ms));
      pr.value = pr.from + (pr.to - pr.from) * easeInOut(t);
      drawPie(project);
      if (t < 1) pr.frame = requestAnimationFrame(tick);
    };
    if (!pr.frame) pr.frame = requestAnimationFrame(tick);
  };
  const fraction = (project) => project.rows.filter((r) => r.done).length / project.rows.length;

  function setDone(project, row, done) {
    row.done = done;
    row.g.classList.toggle('done', done);
    row.hit.setAttribute('aria-checked', String(done));
    sweep(project, fraction(project), done ? SWEEP_ON : SWEEP_OFF);
  }

  // A locked project's to-do does nothing except nudge the dashed circle, as a hint.
  function hint(project) {
    project.g.classList.remove('nudge');
    void project.g.getBoundingClientRect();
    project.g.classList.add('nudge');
  }

  function setActive(project, active) {
    project.active = active;
    project.g.classList.toggle('active', active);
    project.g.classList.remove('nudge');
    project.ringHit.setAttribute('aria-checked', String(active));
    for (const row of project.rows) {
      row.hit.setAttribute('aria-disabled', String(!active));
      row.hit.setAttribute('tabindex', active ? '0' : '-1');
    }
    // The pie comes back once the ring has drawn, and empties right away when locking.
    if (active) sweep(project, fraction(project), SWEEP_ON * 2, DRAW_RING * 0.8);
    else sweep(project, 0, SWEEP_OFF);
  }

  for (const project of projects) {
    pressable(project.ringHit, project.g, () => setActive(project, !project.active));
    for (const row of project.rows) {
      pressable(row.hit, row.g, () => {
        if (project.active) setDone(project, row, !row.done);
        else hint(project);
      });
    }
    project.g.addEventListener('animationend', () => project.g.classList.remove('nudge'));
    drawPie(project);
  }

  const fitAll = () => {
    for (const [node, spec] of texts) fitText(node, spec);
  };
  fitAll();

  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // For the demo: press briefly, then act, like a click.
  async function tapRow(p, k) {
    const project = projects[p];
    const row = project.rows[k];
    row.g.classList.add('pressed');
    await pause(140);
    row.g.classList.remove('pressed');
    if (project.active) setDone(project, row, !row.done);
    else hint(project);
  }
  async function tapProject(p) {
    const project = projects[p];
    project.g.classList.add('pressed');
    await pause(140);
    project.g.classList.remove('pressed');
    setActive(project, !project.active);
  }

  return {
    fitAll,
    tapRow,
    tapProject,
    projects,
    disable: () => projects.forEach((pr) => {
      pr.ringHit.style.pointerEvents = 'none';
      pr.rows.forEach((r) => { r.hit.style.pointerEvents = 'none'; });
    }),
  };
}
