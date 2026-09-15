/* Playground definition for Border beam.
   Not part of the module: a site needs only beam.css + beam.js.
   Everything here is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  // state key -> custom property on the host element, with its unit
  const VARS = {
    radius: ['--beam-radius', 'px'], width: ['--beam-width', 'px'],
    duration: ['--beam-duration', 's'], direction: ['--beam-direction', ''],
    head: ['--beam-head', ''], arc: ['--beam-arc', ''],
    strength: ['--beam-strength', ''], strokeOpacity: ['--beam-stroke-opacity', ''],
    innerOpacity: ['--beam-inner-opacity', ''], bloomOpacity: ['--beam-bloom-opacity', ''],
    bloomBlur: ['--beam-bloom-blur', 'px'], innerFeather: ['--beam-inner-feather', 'px'], innerShadow: ['--beam-inner-shadow', ''],
    hueBase: ['--beam-hue-base', 'deg'], hueRange: ['--beam-hue-range', 'deg'], hueDuration: ['--beam-hue-duration', 's'],
    brightness: ['--beam-brightness', ''], saturate: ['--beam-saturate', ''],
    fadeIn: ['--beam-fade-in', 's'], fadeOut: ['--beam-fade-out', 's'],
    breatheDuration: ['--beam-breathe-duration', 's'], spikeDuration: ['--beam-spike-duration', 's'], spikeScale: ['--beam-spike-scale', ''],
  };

  const PALETTES = {
    aurora: { label: 'Aurora', colors: ['#ff3264', '#288cff', '#32c850', '#1eb9aa', '#6446ff', '#288cff', '#ff7828', '#f032b4', '#b428f0'] },
    sunset: { label: 'Sunset', colors: ['#ff2d55', '#ff6b2c', '#ffb02e', '#ff4d8d', '#ff3c78', '#ffa53d', '#ff7a18', '#ff2f6d', '#d9345f'] },
    ocean:  { label: 'Ocean',  colors: ['#1ec8ff', '#2b6bff', '#12e0c0', '#0fa5c9', '#5b4dff', '#2f8fff', '#00d4ff', '#7a5cff', '#3ad1ff'] },
    toxic:  { label: 'Toxic',  colors: ['#b6ff2e', '#25e88a', '#00ffc2', '#7bff3d', '#22d1a0', '#4dff9e', '#d4ff1f', '#00e5a0', '#8cff45'] },
    candy:  { label: 'Candy',  colors: ['#ff5fd2', '#7a5cff', '#ff8ae0', '#c05cff', '#5c8cff', '#ff6fa8', '#ffa3ec', '#e05cff', '#9d6bff'] },
    mono:   { label: 'Mono',   colors: ['#ffffff', '#d6d6de', '#ffffff', '#c9c9d4', '#e8e8ef', '#ffffff', '#d0d0d8', '#ffffff', '#bcbcc6'] },
  };

  // demo elements: the shapes the beam usually sits on. Each has its radius and the mode it was designed for
  const DEMOS = {
    chat:   { label: 'Чат-інпут',     radius: 20, cls: 'bb-chat',  mode: 'spin',   html: '<div class="bb-chat__top">@</div><div class="bb-chat__ph">Build anything…</div><div class="bb-chat__row"><span class="bb-pill">Agent ⌄</span><span class="bb-pill">Auto ⌄</span><span class="bb-chat__send">↑</span></div>' },
    card:   { label: 'Картка',        radius: 16, cls: 'bb-card',  mode: 'spin',   html: '<div class="bb-card__line bb-card__line--title"></div><div class="bb-card__line"></div><div class="bb-card__line bb-card__line--short"></div>' },
    bar:    { label: 'Статус-панель', radius: 20, cls: 'bb-bar',   mode: 'travel', html: '<span class="bb-bar__dot"></span><span>Генерую відповідь…</span><span class="bb-bar__spacer">esc, зупинити</span>' },
    button: { label: 'Кнопка',        radius: 12, cls: 'bb-btn',   mode: 'spin',   html: '✦ Generate' },
    input:  { label: 'Поле вводу',    radius: 12, cls: 'bb-input', mode: 'spin',   html: 'Пошук по проєкту…' },
    tile:   { label: 'Плитка',        radius: 18, cls: 'bb-tile',  mode: 'spin',   html: '✦' },
  };
  const MODE_DURATION = { spin: 1.96, travel: 3.1 };

  Playground.css(`
    .bb-frame { display: grid; place-items: center; }
    .bb-demo {
      --bb-fg: #eeeeef; --bb-dim: rgba(238,238,239,.56); --bb-faint: rgba(238,238,239,.34);
      background: var(--bb-surface, #1d1d1f); color: var(--bb-fg); max-width: 100%;
      font: 400 14px/1.5 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased;
    }
    .bb-chat { width: 348px; padding: 14px 14px 12px; display: flex; flex-direction: column; gap: 10px; }
    .bb-chat__top { display: flex; align-items: center; gap: 8px; color: var(--bb-faint); }
    .bb-chat__ph { font-size: 14px; color: rgba(238,238,239,.3); padding: 2px 0 12px; }
    .bb-chat__row { display: flex; align-items: center; gap: 8px; }
    .bb-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--bb-dim); padding: 5px 9px; border-radius: 8px; background: rgba(255,255,255,.05); }
    .bb-chat__send { margin-left: auto; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.08); color: var(--bb-dim); font-size: 13px; }
    .bb-card { width: 250px; padding: 24px 26px; display: flex; flex-direction: column; gap: 10px; }
    .bb-card__line { height: 8px; border-radius: 4px; background: rgba(238,238,239,.08); }
    .bb-card__line--title { height: 10px; width: 55%; background: rgba(238,238,239,.14); }
    .bb-card__line--short { width: 78%; }
    .bb-btn { padding: 11px 22px; font-size: 13.5px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
    .bb-input { width: 300px; padding: 12px 14px; font-size: 13.5px; color: rgba(238,238,239,.42); }
    .bb-tile { width: 64px; height: 64px; display: grid; place-items: center; font-size: 22px; }
    .bb-bar { width: 366px; height: 42px; display: flex; align-items: center; gap: 10px; padding: 0 15px; font-size: 13px; color: var(--bb-dim); }
    .bb-bar__dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: rgba(238,238,239,.45); }
    .bb-bar__spacer { margin-left: auto; font-size: 12px; color: var(--bb-faint); }
  `);

  const defaults = {
    demo: 'chat', mode: 'spin', trigger: 'always', palette: 'aurora',
    radius: 20, width: 1, duration: 1.96, direction: 'normal', head: 66, arc: 12,
    strength: 1, strokeOpacity: 1, innerOpacity: 1, bloomOpacity: 1, bloomBlur: 8, innerFeather: 28, innerShadow: 0.27,
    hueBase: 0, hueRange: 30, hueDuration: 12, brightness: 1.3, saturate: 1.2,
    fadeIn: 0.6, fadeOut: 0.5, breatheDuration: 4, spikeDuration: 4.1, spikeScale: 1,
    surface: '#1d1d1f',
  };
  const effect = Object.fromEntries(Object.entries(defaults).filter(([k]) => !['demo', 'trigger', 'surface'].includes(k)));

  let host = null, inst = null;

  function mountDemo(ctx) {
    const s = ctx.state, d = DEMOS[s.demo];
    if (inst) inst.destroy();
    ctx.frame.innerHTML = '';
    host = document.createElement('div');
    host.className = `beam bb-demo ${d.cls}`;
    host.setAttribute('data-beam', '');
    host.innerHTML = d.html;
    host.dataset.demoId = s.demo;
    if (s.demo === 'input') host.tabIndex = 0;
    ctx.frame.append(host);
    // the playground exists to show motion, so reduced-motion is not honoured here
    inst = BorderBeam.attach(host, { trigger: s.trigger, respectReducedMotion: false });
    if (ctx.paused) inst.pause();
    ctx.instance = inst;
  }

  function varsBlock(s, pad) {
    const keys = ['radius', 'width', 'duration', 'direction', 'fadeIn', 'fadeOut',
      ...(s.mode === 'spin' ? ['head', 'arc'] : ['breatheDuration', 'spikeDuration', 'spikeScale']),
      'strength', 'strokeOpacity', 'innerOpacity', 'bloomOpacity', 'bloomBlur', 'innerFeather', 'innerShadow',
      'hueBase', 'hueRange', 'hueDuration', 'brightness', 'saturate'];
    const p = PALETTES[s.palette];
    return keys.map(k => `${pad}${VARS[k][0]}: ${s[k]}${VARS[k][1]};`).join('\n') +
      `\n\n${pad}/* палітра: ${p.label} */\n` + p.colors.map((c, i) => `${pad}--bc-${i + 1}: ${c};`).join('\n');
  }

  const snippet = s => `<link rel="stylesheet" href="beam.css">

<!-- будь-який елемент стає носієм ефекту -->
<div class="beam my-card" data-beam data-mode="${s.mode}" data-trigger="${s.trigger}">
  <!-- ваш контент -->
</div>

<script src="beam.js"><\/script>

<!-- налаштування це звичайні CSS-змінні на носії -->
<style>
  .my-card {
    background: ${s.surface};

${varsBlock(s, '    ')}
  }
</style>

<!-- керування з JS, за потреби:
     const b = BorderBeam.get(document.querySelector('.beam'));
     b.show(); b.hide(); b.pause(); b.play();
     b.setTrigger('hover'); b.set('duration', '3s');
-->`;

  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
  const onlySpin = s => s.mode === 'spin';
  const onlyTravel = s => s.mode === 'travel';

  Playground.register({
    id: 'beam',
    title: 'Border beam',
    summary: 'Веселкове світло по межі елемента. Чистий CSS + маленький контролер.',
    dir: 'border-beam',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'beam.css', file: 'border-beam/beam.css' },
      { id: 'js', label: 'beam.js', file: 'border-beam/beam.js' },
    ],
    defaults,
    presets: [
      { label: 'Default', patch: effect },
      { label: 'Status bar', patch: Object.assign({}, effect, { demo: 'bar', mode: 'travel', duration: 3.1 }) },
      { label: 'Soft', patch: { mode: 'spin', palette: 'ocean', duration: 3.2, arc: 22, strength: 0.7, bloomBlur: 12, bloomOpacity: 0.8, innerFeather: 40, hueRange: 20, saturate: 1 } },
      { label: 'Neon', patch: { mode: 'spin', palette: 'toxic', duration: 1.4, arc: 10, width: 1.5, strength: 1.5, bloomOpacity: 2, bloomBlur: 14, brightness: 1.6, saturate: 1.4 } },
      { label: 'Mono', patch: { mode: 'spin', palette: 'mono', duration: 2.4, arc: 14, strength: 0.9, saturate: 0, hueRange: 0, bloomBlur: 6 } },
    ],
    random() {
      const palettes = Object.keys(PALETTES);
      return {
        palette: palettes[Math.floor(Math.random() * palettes.length)],
        duration: rnd(0.9, 5), head: rnd(0, 100), arc: rnd(4, 30), strength: rnd(0.6, 1.8),
        hueBase: Math.round(rnd(-180, 180)), hueRange: Math.round(rnd(0, 90)), bloomBlur: rnd(2, 18),
        direction: Math.random() < 0.5 ? 'normal' : 'reverse',
      };
    },
    controls: [
      { title: 'Сценарій', items: [
        { type: 'select', key: 'demo', label: 'Елемент', options: Object.entries(DEMOS).map(([id, d]) => [id, d.label]) },
        { type: 'seg', key: 'mode', label: 'Режим', options: [['spin', 'Обертання по межі'], ['travel', 'Нижня межа']] },
        { type: 'seg', key: 'trigger', label: 'Тригер', options: [['always', 'Завжди'], ['hover', 'Наведення'], ['focus', 'Фокус']] },
        { type: 'buttons', items: [
          { label: 'Програти появу', primary: true, run: ctx => { inst.hide(); setTimeout(() => inst.show(), ctx.state.fadeOut * 1000 + 40); } },
        ] },
        { type: 'status', render: ctx => `Режим: <b>${ctx.state.mode === 'travel' ? 'нижня межа' : 'обертання'}</b> · цикл <b>${(+ctx.state.duration).toFixed(2)} s</b> · палітра <b>${PALETTES[ctx.state.palette].label}</b>` },
      ] },
      { title: 'Промінь', items: [
        { type: 'range', key: 'duration', label: 'Тривалість циклу', min: 0.3, max: 10, step: 0.02, fmt: v => v.toFixed(2) + ' s' },
        { type: 'seg', key: 'direction', label: 'Напрямок', options: [['normal', 'За годинниковою'], ['reverse', 'Проти']] },
        { type: 'range', key: 'strength', label: 'Загальна сила', min: 0, max: 3, step: 0.01 },
        { type: 'range', key: 'head', label: 'Позиція голови', min: 0, max: 100, step: 0.5, unit: '%', when: onlySpin },
        { type: 'range', key: 'arc', label: 'Довжина дуги', min: 1, max: 45, step: 0.5, unit: '%', when: onlySpin },
        { type: 'range', key: 'breatheDuration', label: 'Пульсація висоти', min: 1, max: 12, step: 0.1, unit: 's', when: onlyTravel },
        { type: 'range', key: 'spikeDuration', label: 'Мерехтіння голок', min: 1, max: 12, step: 0.1, unit: 's', when: onlyTravel },
        { type: 'range', key: 'spikeScale', label: 'Розмір голок', min: 0, max: 3, step: 0.01, when: onlyTravel },
      ] },
      { title: 'Геометрія', items: [
        { type: 'range', key: 'radius', label: 'Радіус скруглення', min: 0, max: 60, step: 1, unit: 'px' },
        { type: 'range', key: 'width', label: 'Товщина обводки', min: 0.5, max: 6, step: 0.5, unit: 'px' },
        { type: 'range', key: 'innerFeather', label: 'Глибина внутрішнього сяйва', min: 0, max: 90, step: 1, unit: 'px' },
      ] },
      { title: 'Шари', items: [
        { type: 'range', key: 'strokeOpacity', label: 'Обводка', min: 0, max: 2, step: 0.01 },
        { type: 'range', key: 'innerOpacity', label: 'Внутрішнє сяйво', min: 0, max: 2, step: 0.01 },
        { type: 'range', key: 'bloomOpacity', label: 'Bloom', min: 0, max: 3, step: 0.01 },
        { type: 'range', key: 'bloomBlur', label: 'Розмиття bloom', min: 0, max: 30, step: 0.5, unit: 'px' },
        { type: 'range', key: 'innerShadow', label: 'Внутрішня рамка', min: 0, max: 1, step: 0.01 },
      ] },
      { title: 'Колір', items: [
        { type: 'swatch', key: 'palette', label: 'Палітра', options: Object.entries(PALETTES).map(([id, p]) => ({ id, label: p.label, css: `conic-gradient(${p.colors.join(',')},${p.colors[0]})` })) },
        { type: 'range', key: 'hueBase', label: 'Зсув відтінку', min: -180, max: 180, step: 1, unit: '°' },
        { type: 'range', key: 'hueRange', label: 'Амплітуда відтінку', min: 0, max: 180, step: 1, unit: '°' },
        { type: 'range', key: 'hueDuration', label: 'Період відтінку', min: 1, max: 40, step: 0.5, unit: 's' },
        { type: 'range', key: 'saturate', label: 'Насиченість', min: 0, max: 3, step: 0.01 },
        { type: 'range', key: 'brightness', label: 'Яскравість', min: 0.2, max: 3, step: 0.01 },
        { type: 'color', key: 'surface', label: 'Колір елемента' },
      ] },
      { title: 'Поява і зникання', collapsed: true, items: [
        { type: 'range', key: 'fadeIn', label: 'Поява', min: 0, max: 3, step: 0.05, unit: 's' },
        { type: 'range', key: 'fadeOut', label: 'Зникання', min: 0, max: 3, step: 0.05, unit: 's' },
      ] },
    ],
    stage: { resizable: false, bg: '#0e0e10' },

    mount(ctx) {
      ctx.frame.classList.add('bb-frame');
      mountDemo(ctx);
    },
    // a new demo element brings its radius and the mode it was made for; a new mode brings its own tempo
    derive(patch, state) {
      const out = {};
      if (patch.demo && patch.demo !== state.demo) { out.radius = DEMOS[patch.demo].radius; out.mode = DEMOS[patch.demo].mode; }
      const mode = patch.mode || out.mode;
      if (mode && mode !== state.mode && patch.duration == null) out.duration = MODE_DURATION[mode];
      return out;
    },
    apply(ctx) {
      const s = ctx.state;
      if (!host || host.dataset.demoId !== s.demo) mountDemo(ctx);
      host.setAttribute('data-mode', s.mode);
      for (const [k, [prop, unit]] of Object.entries(VARS)) host.style.setProperty(prop, s[k] + unit);
      PALETTES[s.palette].colors.forEach((c, i) => host.style.setProperty('--bc-' + (i + 1), c));
      host.style.setProperty('--bb-surface', s.surface);
      if (inst.trigger !== s.trigger) inst.setTrigger(s.trigger);
    },
    hint(ctx) {
      const s = ctx.state;
      return ctx.paused ? 'Пауза'
        : s.trigger === 'hover' ? 'Наведи курсор на елемент, щоб запустити промінь'
        : s.trigger === 'focus' ? 'Клікни в елемент (фокус), щоб запустити промінь'
        : s.mode === 'travel' ? 'Промінь їде вздовж нижньої межі, найкраще на широких низьких елементах' : 'Промінь обертається по всій межі';
    },
    playback: {
      pause: () => inst && inst.pause(),
      resume: () => inst && inst.play(),
    },
  });
})();
