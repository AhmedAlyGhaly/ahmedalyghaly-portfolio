/* Home page: hero compare slider, selected-work previews, "inside the process" loop.
   Shared by index.html and index-ar.html; all copy comes from <script id="home-i18n">. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const t = JSON.parse($('#home-i18n').textContent);

  /* ---------- hero: design ⇄ build ---------- */
  const stage = $('#stage'), range = $('#cmp');
  let touched = false, raf = 0;
  const setV = v => {
    stage.style.setProperty('--v', v);
    range.value = v;
    const d = Math.round(v);
    range.setAttribute('aria-valuetext', t.valueText.replace('{d}', d).replace('{b}', 100 - d));
  };
  range.addEventListener('input', () => { touched = true; cancelAnimationFrame(raf); setV(+range.value); });
  if (reduce) {
    setV(46);
  } else {
    setV(100);
    const t0 = performance.now() + 600, dur = 1800;
    const tick = now => {
      if (touched) return;
      const p = Math.max(0, Math.min(1, (now - t0) / dur));
      setV(100 - 54 * ease(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* ---------- selected work ---------- */
  const list = $('.work-grid .list'), preview = $('#preview');
  const projs = $$('.proj', list);
  $$('template[id^="v"]').forEach((tpl, i) => {
    const proj = projs[i];
    if (!proj) return;
    const viz = document.createElement('div');
    viz.className = 'viz';
    const cap = document.createElement('span');
    cap.className = 'viz-cap';
    cap.textContent = proj.dataset.type || '';
    viz.append(tpl.content.cloneNode(true), cap);
    preview.append(viz);
    $('.thumb', proj).append(tpl.content.cloneNode(true));
  });

  const vizs = $$('.viz', preview);
  let active = -1;
  const activate = el => {
    const i = projs.indexOf(el);
    if (i < 0 || i === active) return;
    active = i;
    projs.forEach((p, j) => p.classList.toggle('is-active', i === j));
    vizs.forEach((v, j) => v.classList.toggle('on', i === j));
  };
  list.addEventListener('pointerover', e => activate(e.target.closest('.proj')));
  list.addEventListener('focusin', e => activate(e.target.closest('.proj')));
  activate(projs[0]);

  /* distance each screenshot scrolls inside its frame; reads batched before writes */
  const shots = $$('.shot').map(s => ({ s, img: $('img', s) }));
  const fitScroll = () => {
    const dists = shots.map(({ s, img }) => Math.max(0, img.offsetHeight - s.clientHeight));
    shots.forEach(({ img }, i) => {
      img.style.setProperty('--dist', `${dists[i]}px`);
      img.style.setProperty('--dur', `${(dists[i] / 80).toFixed(1)}s`);
    });
  };
  const ro = new ResizeObserver(fitScroll);
  shots.forEach(({ s, img }) => {
    ro.observe(s);
    if (!img.complete) img.addEventListener('load', fitScroll, { once: true });
  });
  fitScroll();

  const thumbIO = new IntersectionObserver(
    es => es.forEach(e => e.target.classList.toggle('on', e.isIntersecting)),
    { threshold: .6 }
  );
  $$('.thumb').forEach(th => thumbIO.observe(th));

  /* ---------- inside the process ---------- */
  const { steps, files } = t;
  const last = steps.length - 1;

  const svg = $('#loop-svg'), NS = 'http://www.w3.org/2000/svg';
  const C = { x: 440, y: 210, r: 140 };
  const ang = [, , 180, 252, 324, 396, 468];
  const rad = a => a * Math.PI / 180;
  const onRing = a => ({ x: C.x + C.r * Math.cos(rad(a)), y: C.y + C.r * Math.sin(rad(a)) });
  const P = i => i < 2 ? { x: 60 + 120 * i, y: 210 } : onRing(ang[i]);
  const el = (name, attrs, parent = svg) => {
    const e = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent.append(e);
    return e;
  };
  const arrow = (x, y, rot) =>
    el('path', { d: 'M-5 -4L5 0L-5 4Z', transform: `translate(${x} ${y}) rotate(${rot})`, class: 'lp-arrow' });

  el('line', { x1: 60, y1: 210, x2: 300, y2: 210, class: 'lp-line' });
  el('circle', { cx: C.x, cy: C.y, r: C.r, class: 'lp-line' });
  arrow(120, 210, 0); arrow(240, 210, 0);
  ang.slice(2).forEach(a => { const m = a + 36, p = onRing(m); arrow(p.x, p.y, m + 90); });

  const labelPos = (i, p) => {
    if (i < 3) return { x: p.x, y: p.y + 30, a: 'middle' };
    if (i === 3) return { x: p.x, y: p.y - 18, a: 'middle' };
    if (i === 4 || i === 5) return { x: p.x + 18, y: p.y + 5, a: 'start' };
    return { x: p.x, y: p.y + 32, a: 'middle' };
  };

  /* SVG nodes are a pointer shortcut; the chips below are the keyboard/AT path */
  const nodes = steps.map((s, i) => {
    const p = P(i), g = el('g', { class: 'lp-node' });
    el('circle', { cx: p.x, cy: p.y, r: 9, class: 'lp-dot' }, g);
    const l = labelPos(i, p);
    el('text', { x: l.x, y: l.y, 'text-anchor': l.a, class: 'lp-label' }, g).textContent = s.name;
    g.addEventListener('click', () => jump(i));
    return g;
  });
  const halo = el('circle', { r: 16, class: 'lp-halo' });
  const token = el('circle', { r: 5.5, class: 'lp-token' });
  let tx = 0, ty = 0;
  const place = (x, y) => {
    tx = x; ty = y;
    [token, halo].forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
  };

  const panel = $('#panel'), quote = $('#lp-quote'), aside = $('#lp-aside'), next = $('#next');
  const stepEl = $('#lp-step'), fileEl = $('#lp-file'), loopsEl = $('#lp-loops');
  const chipsBox = $('#chips');
  const chips = steps.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip-btn'; b.textContent = s.name;
    b.addEventListener('click', () => jump(i));
    chipsBox.append(b);
    return b;
  });

  let cur = 0, loops = 0, tid = 0, rt = 0;

  const render = () => {
    const s = steps[cur];
    stepEl.textContent = s.name;
    fileEl.textContent = cur < 2 ? t.untitled : files[Math.min(loops, files.length - 1)];
    loopsEl.textContent = cur < 2 ? t.start : `${t.loop}${loops + 1}`;
    quote.textContent = s.q;
    aside.textContent = s.a;
    nodes.forEach((g, i) => g.classList.toggle('is-on', i === cur));
    chips.forEach((c, i) => c.setAttribute('aria-current', i === cur ? 'step' : 'false'));
    next.textContent = cur === last ? t.back : `${t.next}${steps[cur + 1].name}`;
    panel.classList.remove('shown');
    clearTimeout(rt);
    rt = setTimeout(() => panel.classList.add('shown'), reduce ? 0 : 900);
  };

  const tween = (fn, dur) => {
    const id = ++tid;
    if (reduce) { fn(1); return; }
    const t0 = performance.now();
    const f = now => {
      if (id !== tid) return;
      const p = Math.min(1, (now - t0) / dur);
      fn(ease(p));
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  const line = (from, to) =>
    tween(e => place(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e), 650);
  const arc = (a0, a1) =>
    tween(e => { const p = onRing(a0 + (a1 - a0) * e); place(p.x, p.y); }, 750);

  const goNext = () => {
    if (cur === last) {
      loops++; cur = 2; render(); arc(468, 540);
    } else {
      const prev = cur; cur++; render();
      if (prev < 2) line(P(prev), P(cur)); else arc(ang[prev], ang[prev] + 72);
    }
  };
  function jump(i) {
    if (i === cur) return;
    const from = { x: tx, y: ty };
    cur = i; render(); line(from, P(i));
  }
  next.addEventListener('click', goNext);

  place(P(0).x, P(0).y);
  render();
})();
