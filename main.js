// Stripe 대시보드의 사이드바 접기 손잡이를 레퍼런스 영상 그대로 다시 그린다.
// 모든 수치는 영상(1920x1080)을 프레임 단위로 재서 얻은 값이고, 단위는 영상 픽셀이다.
// 손잡이에 올리면 사이드바 경계선이 살짝 줄어들거나(펼친 상태) 늘어나고(접힌 상태),
// 손잡이 막대가 꺾쇠로 꺾였다가 포인터가 떠나면 다시 펴진다. 누르면 사이드바가 접히고 펼쳐진다.
// 화면에는 사이드바와 관련된 것만 둔다(오른쪽 본문은 뺐다).
// 영상은 실제 화면을 3.2배 키운 것이라, 화면에는 1/3.2 로 줄여 실제 사이드바 크기로 그린다.

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);

const SCALE = 1 / 3.2; // 영상 1px 이 화면에서 차지하는 크기(CSS px)
const HANDLE_Y = 550; // 영상에서 손잡이 가운데 높이. 화면에서는 창 세로 가운데에 둔다
const EDGE = { open: 756.5, shut: 194 }; // 사이드바 오른쪽 경계선
const PEEK = 25.5; // 손잡이에 올리면 경계선이 반대 상태 쪽으로 이만큼 밀린다

// 손잡이. 평소에는 경계선 오른쪽 27.5px 의 세로 막대이고, 올리면 경계선 기준 32~49px 자리의 꺾쇠가 된다.
const BAR = [[27.5, 531], [27.5, 550], [27.5, 569]];
const CHEVRON = {
  open: [[49, 533.7], [32, 549.8], [49, 566]], // 펼친 상태: 접기 "<"
  shut: [[33.8, 533.7], [47.8, 549.8], [33.8, 566]], // 접힌 상태: 펼치기 ">"
};
const BAR_IDLE = [138, 137, 150];
const BAR_HOT = [84, 91, 98];

// 시간(ms). 이름표는 바로 뜨고 사라질 때만 0.3초 흐려진다(style.css).
const EDGE_IN = 120;
const EDGE_OUT = 100;
const BEND_IN = 80;
const BEND_OUT = 100;
const FOLD_MS = 300; // 접고 펼 때 경계선이 미끄러지는 시간

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
const SHUT_SHIFT = -95; // 접으면 제목 줄이 사라지고 아이콘이 한 줄 올라간다

const scene = $('scene');
const navLabels = $('nav-labels');
const navIcons = $('nav-icons');
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

/* ------------------------------------------------------------- 글자 맞추기 */

// 영상의 글꼴은 맥의 시스템 글꼴이다. Inter 로 대신하되, 대문자 높이와 잉크 폭을 영상과 같게 맞춘다.
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
  node.setAttribute('fill', spec.fill);
  node.style.font = `${spec.weight} ${size.toFixed(3)}px Inter, sans-serif`;
  node.style.letterSpacing = `${((spec.ink - natural) / gaps).toFixed(3)}px`;
}

/* ------------------------------------------------------------- 장면 */

let products = null;

function build() {
  const defs = el('defs', {}, scene);
  defs.innerHTML = `<linearGradient id="edge-fade" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#fbfbfb"/><stop offset=".38" stop-color="#f5f5f5"/>
    <stop offset=".5" stop-color="#f3f3f3"/><stop offset=".62" stop-color="#f5f5f5"/><stop offset=".8" stop-color="#fafafa"/>
    <stop offset="1" stop-color="#fff"/></linearGradient>`;
  scene.prepend(defs);
  edge.setAttribute('width', 3.2); // 화면에서 1px

  // 이름(제목, 항목 이름, 꺾쇠)은 사이드바 경계 안쪽만 보이고, 아이콘은 따로 움직인다.
  products = el('text', {}, navLabels);
  for (const item of NAV) {
    navIcons.append(icon(item.icon, 93.5, item.iconY, 3.2, '#707279'));
    item.node = el('text', {}, navLabels);
    navLabels.append(icon('chevron', 662, item.baseline - 13, 3.2, '#78787a', 1.35));
  }
}

// 창 크기에 맞춰 보이는 범위를 정한다. 크기는 고정 배율, 손잡이는 창 세로 가운데.
function fitView() {
  const w = window.innerWidth / SCALE;
  const h = window.innerHeight / SCALE;
  scene.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
  const dy = h / 2 - HANDLE_Y;
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

/* ------------------------------------------------------------- 상태와 움직임 */

const state = { collapsed: false, hover: false };
// fold: 0 펼침 ~ 1 접힘(접고 펼 때 미끄러진다), peek: 손잡이에 올렸을 때 경계선이 밀린 정도, bend: 막대가 꺾인 정도
const anim = { fold: 0, peek: 0, bend: 0 };
const tweens = new Map();
let frame = 0;

const idleEdge = () => (state.collapsed ? EDGE.shut : EDGE.open);
const peekEdge = () => (state.collapsed ? EDGE.shut + PEEK : EDGE.open - PEEK);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

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
  // 접힐 때 이름은 빨리 흐려지고, 펼 때는 경계선이 거의 다 열린 뒤에 나타난다.
  const shown = state.collapsed ? clamp01(1 - anim.fold * 2.4) : clamp01((0.55 - anim.fold) / 0.55);
  navLabels.setAttribute('opacity', shown.toFixed(3));
  navIcons.setAttribute('transform', `translate(0 ${(SHUT_SHIFT * anim.fold).toFixed(2)})`);
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

// 누르면 이름표를 내리고 경계선이 반대 자리로 미끄러진다. 손잡이도 경계선을 따라간다.
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

/* ------------------------------------------------------------- 시연 */

// 갤러리 미리보기용. 주소에 ?demo 를 붙이면 포인터 없이 올리기와 누르기를 되풀이한다.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function demo() {
  hit.style.pointerEvents = 'none';
  for (;;) {
    await wait(900);
    setHover(true);
    await wait(1500);
    toggle();
    await wait(1000);
    setHover(true);
    await wait(1500);
    toggle();
  }
}

// 비교 도구(tools/compare.html)가 영상의 한 장면과 같은 자세를 바로 만들 때 쓴다.
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
  });
if (new URLSearchParams(location.search).has('demo')) demo();
