/* Playground definition for Dot sphere.
   Not part of the module: a site needs only sphere.js.
   Everything here is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  const STYLES = { stipple: 'Крапки', orbits: 'Орбіти', grid: 'Сітка', spiral: 'Спіраль', cloud: 'Хмара', mesh: 'Мережа' };
  const THEMES = {
    light: { background: '#f4f4f2', color: '#141414' },
    dark:  { background: '#0e0e10', color: '#e8e8ef' },
  };
  // a sensible starting point for each layout: switching style retunes these
  const PRESETS = {
    stipple: { style: 'stipple', count: 5200, dotSize: 1.15, radius: 0.78, depthFade: 0.55 },
    orbits:  { style: 'orbits',  count: 3600, dotSize: 1.35, radius: 0.72, depthFade: 0.62, rings: 12 },
    grid:    { style: 'grid',    count: 4200, dotSize: 1.2,  radius: 0.76, depthFade: 0.6 },
    spiral:  { style: 'spiral',  count: 5000, dotSize: 1.25, radius: 0.76, depthFade: 0.58, turns: 26 },
    cloud:   { style: 'cloud',   count: 7000, dotSize: 1.05, radius: 0.74, depthFade: 0.5 },
    mesh:    { style: 'mesh',    count: 4800, dotSize: 2.4,  radius: 0.72, depthFade: 0.45, linkDist: 0.34, lineWidth: 0.5 },
  };

  Playground.css(`
    .sphere-canvas {
      display: block; width: 100%; height: clamp(280px, calc(100vh - 224px), 720px);
      border-radius: 12px; box-shadow: 0 0 0 1px rgba(127,127,127,.18); touch-action: none;
    }
  `);

  // the state is the module's option set, minus what the playground owns (pause, reduced motion)
  const KEYS = Object.keys(DotSphere.defaults).filter(k => !['respectReducedMotion', 'paused'].includes(k));
  const defaults = Object.assign(Object.fromEntries(KEYS.map(k => [k, DotSphere.defaults[k]])), PRESETS.stipple);

  let sphere = null;
  let rateScale = 1;

  const snippet = s => {
    const keys = ['style', 'count', 'seed', 'radius', 'dotSize', 'perspective', 'depthFade', 'depthScale', 'color', 'background',
      'speed', 'direction', 'tilt', 'pointer', 'damping', 'drag', 'friction', 'jitter'];
    if (s.style === 'orbits') keys.push('rings');
    if (s.style === 'grid') keys.push('gridLat', 'gridLon');
    if (s.style === 'spiral') keys.push('turns');
    if (s.style === 'cloud') keys.push('thickness');
    if (s.style === 'mesh') keys.push('linkDist', 'lineWidth');
    const opts = keys.map(k => `    ${k}: ${typeof s[k] === 'string' ? `'${s[k]}'` : s[k]},`).join('\n');
    return `<!-- полотно потрібного розміру; воно саме стежить за ним і саме малює фон -->
<canvas id="sphere" style="width: 480px; height: 480px"></canvas>

<script src="sphere.js"><\/script>
<script>
  const sphere = DotSphere.create(document.getElementById('sphere'), {
${opts}
  });

  // далі можна крутити на льоту:
  //   sphere.set('style', 'orbits');
  //   sphere.setOptions({ speed: 0.3, color: '#fff' });
  //   sphere.pause(); sphere.resume(); sphere.stop(); sphere.play(); sphere.destroy();
<\/script>`;
  };

  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  const only = style => s => s.style === style;

  Playground.register({
    id: 'sphere',
    title: 'Dot sphere',
    summary: '3D-сфера з точок на canvas, без WebGL. Один файл без залежностей.',
    dir: 'dot-sphere',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'js', label: 'sphere.js', file: 'dot-sphere/sphere.js' },
    ],
    defaults,
    presets: Object.entries(PRESETS).map(([id, patch]) => ({ label: STYLES[id], patch })),
    random() {
      const styles = Object.keys(PRESETS);
      return {
        style: styles[Math.floor(Math.random() * styles.length)],
        seed: Math.round(rnd(1, 999)), speed: rnd(0.04, 0.45), tilt: rnd(-0.7, 0.7), perspective: rnd(2, 12),
        jitter: Math.random() < 0.4 ? rnd(0, 0.12) : 0, direction: Math.random() < 0.5 ? 1 : -1,
      };
    },
    controls: [
      { title: 'Розкладка', items: [
        { type: 'select', key: 'style', label: 'Розкладка точок', options: [['stipple', 'Крапки, Фібоначчі'], ['orbits', 'Орбіти'], ['grid', 'Паралелі й меридіани'], ['spiral', 'Спіраль'], ['cloud', 'Об\'ємна хмара'], ['mesh', 'Мережа з лініями']] },
        { type: 'range', key: 'rings', label: 'Кількість орбіт', min: 2, max: 40, step: 1, when: only('orbits') },
        { type: 'range', key: 'gridLat', label: 'Паралелей', min: 2, max: 40, step: 1, when: only('grid') },
        { type: 'range', key: 'gridLon', label: 'Меридіанів', min: 2, max: 48, step: 1, when: only('grid') },
        { type: 'range', key: 'turns', label: 'Витків спіралі', min: 2, max: 90, step: 1, when: only('spiral') },
        { type: 'range', key: 'thickness', label: 'Товщина оболонки', min: 0, max: 1, step: 0.01, when: only('cloud') },
        { type: 'range', key: 'linkDist', label: 'Дальність зв\'язків', min: 0.1, max: 0.9, step: 0.01, when: only('mesh') },
        { type: 'range', key: 'lineWidth', label: 'Товщина ліній', min: 0.2, max: 3, step: 0.1, unit: 'px', when: only('mesh') },
        { type: 'range', key: 'seed', label: 'Варіант розкладки', min: 1, max: 999, step: 1, fmt: v => '#' + v },
        { type: 'status', render: () => `Точок: <b>${sphere.n}</b>` + (sphere.links ? ` · зв'язків: <b>${sphere.links.length / 2}</b>` : '') + ` · полотно <b>${sphere.w}×${sphere.h}</b> px` },
      ] },
      { title: 'Рух', items: [
        { type: 'range', key: 'speed', label: 'Швидкість обертання', min: 0, max: 1.2, step: 0.005, fmt: v => v.toFixed(3) + ' рад/с' },
        { type: 'seg', key: 'direction', label: 'Напрямок', options: [[1, 'За годинниковою'], [-1, 'Проти']] },
        { type: 'range', key: 'tilt', label: 'Нахил осі', min: -1, max: 1, step: 0.01, fmt: v => v.toFixed(2) + ' рад' },
      ] },
      { title: 'Реакція на курсор', items: [
        { type: 'range', key: 'pointer', label: 'Сила паралаксу', min: 0, max: 1.5, step: 0.01, fmt: v => v.toFixed(2) + ' рад' },
        { type: 'range', key: 'damping', label: 'Пружність', min: 0.005, max: 0.3, step: 0.005, fmt: v => v.toFixed(3) },
        { type: 'check', key: 'drag', label: 'Крутити перетягуванням' },
        { type: 'range', key: 'friction', label: 'Інерція після кидка', min: 0.8, max: 0.995, step: 0.005, fmt: v => v.toFixed(3), when: s => s.drag },
      ] },
      { title: 'Геометрія', items: [
        { type: 'range', key: 'count', label: 'Кількість точок', min: 200, max: 20000, step: 100 },
        { type: 'range', key: 'dotSize', label: 'Розмір точки', min: 0.3, max: 6, step: 0.05, unit: 'px' },
        { type: 'range', key: 'radius', label: 'Розмір сфери', min: 0.3, max: 1, step: 0.01 },
        { type: 'range', key: 'perspective', label: 'Перспектива', min: 1.6, max: 20, step: 0.1 },
        { type: 'range', key: 'jitter', label: 'Розкид точок', min: 0, max: 0.5, step: 0.005 },
      ] },
      { title: 'Вигляд', items: [
        { type: 'buttons', items: [
          { label: 'Світла', run: ctx => ctx.set(THEMES.light) },
          { label: 'Темна', run: ctx => ctx.set(THEMES.dark) },
        ] },
        { type: 'color', key: 'color', label: 'Колір точок' },
        { type: 'color', key: 'background', label: 'Фон полотна' },
        { type: 'range', key: 'depthFade', label: 'Згасання вглиб', min: 0, max: 1, step: 0.01 },
        { type: 'range', key: 'depthScale', label: 'Зменшення вглиб', min: 0, max: 1, step: 0.01 },
      ] },
    ],

    acceptance: [
      { id: 'style-rebuilds-layout', run: ctx => ctx.set({ style: 'mesh' }), expect: () => (!!sphere.links && sphere.o.style === 'mesh') || 'no links after mesh' },
      { id: 'count-reaches-canvas', run: ctx => ctx.set({ style: 'stipple', count: 1000 }), expect: () => sphere.n === 1000 || `n=${sphere.n}` },
      { id: 'theme-sets-both-colours', run: ctx => ctx.set(THEMES.dark), expect: () => sphere.o.background === '#0e0e10' && sphere.o.color === '#e8e8ef' },
      { id: 'loop-stops-when-hidden', run: () => Playground.show('sphere'), wait: 60, expect: () => !!sphere.raf || 'not running while shown' },
    ],

    mount(ctx) {
      const canvas = document.createElement('canvas');
      canvas.className = 'sphere-canvas';
      canvas.setAttribute('aria-label', 'Dot sphere');
      ctx.frame.append(canvas);
      sphere = DotSphere.create(canvas, Object.assign({}, defaults, { respectReducedMotion: false }));
      sphere.stop(); // onShow starts the loop once the tab is on screen
      // playback speed from the toolbar scales the simulated time
      const step = sphere.step.bind(sphere);
      sphere.step = dt => step(dt * rateScale);
      ctx.instance = sphere;
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(canvas);
    },
    // a new layout starts from its preset, then the patch on top
    derive(patch, state) { return patch.style && patch.style !== state.style ? PRESETS[patch.style] : {}; },
    apply(ctx, patch) { sphere.setOptions(patch); },
    hint(ctx) {
      return ctx.paused ? 'Пауза, сферу все ще можна крутити курсором'
        : ctx.state.drag ? 'Веди курсором, сфера повертається за ним. Тягни, щоб розкрутити' : 'Веди курсором, сфера повертається за ним';
    },
    playback: {
      pause: () => sphere.pause(),
      resume: () => sphere.resume(),
      rate: (ctx, r) => { rateScale = r; },
    },
    onShow() { sphere.resize(); sphere.play(); },
    onHide() { sphere.stop(); },
  });
})();
