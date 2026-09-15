/* Playground definition for Logo wall (S : Clients).
   Not part of the module: a site needs only logo-wall.css + logo-wall.js
   and its own SVG files.
   Everything here is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  // the demo pool; on a site you pass your own paths, see the snippet
  const NAMES = ['1plus1', 'as', 'atl', 'brain-tank', 'comfy', 'dominos', 'hotline-finance', 'ibis', 'klo', 'knygarnya', 'mcdonalds', 'mon',
    'orner', 'publicis-groupe', 'roman-ua', 'skelar', 'stb', 'suspilne', 'synevo', 'tet', 'tez-tour', 'ukrainer', 'varus', 'vml'];
  const LOGOS = NAMES.map(n => `logo-wall/logos/${n}.svg`);

  const PRESETS = {
    wave:   { label: 'Wave',   patch: { mode: 'wave',   waveOrder: 'diagonal', interval: 3500, stagger: 120, duration: 900,  easing: 'cubic-bezier(.65, 0, .35, 1)', blur: 12, scale: 0.96, enter: { x: -12, y: 0 }, exit: { x: 12, y: 0 },  overlap: 1 } },
    soft:   { label: 'Soft',   patch: { mode: 'single', waveOrder: 'diagonal', interval: 1800, stagger: 90,  duration: 900,  easing: 'cubic-bezier(.4, 0, .2, 1)',   blur: 10, scale: 0.94, enter: { x: 0, y: 6 },   exit: { x: 0, y: -6 },  overlap: 1 } },
    dreamy: { label: 'Dreamy', patch: { mode: 'single', waveOrder: 'diagonal', interval: 2400, stagger: 90,  duration: 1800, easing: 'cubic-bezier(.22, 1, .36, 1)', blur: 18, scale: 1.04, enter: { x: 0, y: 0 },   exit: { x: 0, y: 0 },   overlap: 1 } },
    snappy: { label: 'Snappy', patch: { mode: 'pair',   waveOrder: 'diagonal', interval: 1200, stagger: 90,  duration: 450,  easing: 'cubic-bezier(.16, 1, .3, 1)',  blur: 8,  scale: 0.9,  enter: { x: 0, y: 10 },  exit: { x: 0, y: -10 }, overlap: 0.6 } },
    rows:   { label: 'Rows',   patch: { mode: 'row',    waveOrder: 'diagonal', interval: 3000, stagger: 120, duration: 1100, easing: 'cubic-bezier(.22, 1, .36, 1)', blur: 14, scale: 0.95, enter: { x: -8, y: 0 },  exit: { x: 8, y: 0 },   overlap: 1 } },
  };

  // the state is the module's option set (minus the logo list), starting from the Wave preset
  const KEYS = Object.keys(LogoWall.defaults).filter(k => k !== 'logos');
  const defaults = Object.assign(Object.fromEntries(KEYS.map(k => [k, LogoWall.defaults[k]])), PRESETS.wave.patch, {
    rows: 2, columns: { desktop: 5, tablet: 4, mobile: 3, small: 2 }, layoutDuration: 600, layoutEasing: 'cubic-bezier(.22, 1, .36, 1)', color: '#8a8a8a', pauseOnHover: true,
  });

  const EASINGS = [
    ['cubic-bezier(.65, 0, .35, 1)', 'in-out-cubic'], ['cubic-bezier(.4, 0, .2, 1)', 'standard'], ['cubic-bezier(.22, 1, .36, 1)', 'out-quint'],
    ['cubic-bezier(.16, 1, .3, 1)', 'out-expo'], ['ease-in-out', 'ease-in-out'], ['linear', 'linear'],
  ];

  let wall = null, root = null;

  const snippet = o => `<link rel="stylesheet" href="logo-wall.css">

<section id="clients" aria-label="Our clients"></section>

<script src="logo-wall.js"><\/script>
<script>
  new LogoWall('#clients', {
    logos: [
${NAMES.map(n => `      'logos/${n}.svg',`).join('\n')}
    ],
    rows: ${o.rows},
    columns: { desktop: ${o.columns.desktop}, tablet: ${o.columns.tablet}, mobile: ${o.columns.mobile}, small: ${o.columns.small} },

    mode: '${o.mode}',
    waveOrder: '${o.waveOrder}',
    interval: ${o.interval},
    stagger: ${o.stagger},
    pauseOnHover: ${o.pauseOnHover},

    duration: ${o.duration},
    easing: '${o.easing}',
    blur: ${o.blur},
    scale: ${o.scale},
    enter: { x: ${o.enter.x}, y: ${o.enter.y} },
    exit: { x: ${o.exit.x}, y: ${o.exit.y} },
    overlap: ${o.overlap},

    layoutDuration: ${o.layoutDuration},
    layoutEasing: '${o.layoutEasing}',

    color: '${o.color}',
  });
<\/script>`;

  Playground.register({
    id: 'logos',
    title: 'Logo blur swap',
    tab: 'S : Clients',
    summary: 'Блок «S : Clients»: логотипи клієнтів, свап через блюр хвилею.',
    dir: 'logo-wall',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'logo-wall.css', file: 'logo-wall/logo-wall.css' },
      { id: 'js', label: 'logo-wall.js', file: 'logo-wall/logo-wall.js' },
      { id: 'logos', label: 'logos/', render: () => NAMES.map(n => `logo-wall/logos/${n}.svg`).join('\n') + '\n\nЩоб додати логотип: поклади монохромний SVG з viewBox у logos/ і додай шлях у список logos в ініціалізації.' },
    ],
    defaults,
    presets: Object.values(PRESETS),
    controls: [
      { title: 'Сценарій', items: [
        { type: 'select', key: 'mode', label: 'Режим', options: [['wave', 'Хвиля по всіх'], ['row', 'По рядах'], ['single', 'По одному (random)'], ['pair', 'По 2 за раз (random)']] },
        { type: 'select', key: 'waveOrder', label: 'Порядок хвилі', options: [['diagonal', 'По колонках, діагональ'], ['columns', 'По колонках, ряди разом'], ['reading', 'По порядку читання']], when: s => s.mode === 'wave' },
        { type: 'range', key: 'interval', label: 'Пауза між свапами', min: 300, max: 8000, step: 100, unit: 'ms' },
        { type: 'range', key: 'stagger', label: 'Затримка між слотами', min: 0, max: 400, step: 10, unit: 'ms' },
        { type: 'check', key: 'pauseOnHover', label: 'Пауза при наведенні' },
        { type: 'buttons', items: [{ label: 'Свапнути зараз', primary: true, run: () => wall.swap() }] },
        { type: 'status', render: () => {
          const n = (wall.slots || []).length, total = (wall.logos || []).length, reserve = Math.max(0, total - n);
          return `Слотів: <b>${n}</b> · лого в пулі: <b>${total}</b> · в резерві: <b>${reserve}</b>` + (reserve < n ? '<br>Резерву не вистачає на всі слоти, частина лого переїжджає між слотами.' : '');
        } },
      ] },
      { title: 'Перехід', items: [
        { type: 'range', key: 'duration', label: 'Тривалість', min: 200, max: 3000, step: 50, unit: 'ms' },
        { type: 'range', key: 'blur', label: 'Блюр', min: 0, max: 30, step: 1, unit: 'px' },
        { type: 'range', key: 'scale', label: 'Scale прихованого стану', min: 0.7, max: 1.2, step: 0.01, fmt: v => v.toFixed(2) },
        { type: 'range', key: 'enter.x', label: 'Зсув X (вхід)', min: -40, max: 40, step: 1, unit: 'px' },
        { type: 'range', key: 'exit.x', label: 'Зсув X (вихід)', min: -40, max: 40, step: 1, unit: 'px' },
        { type: 'range', key: 'enter.y', label: 'Зсув Y (вхід)', min: -30, max: 30, step: 1, unit: 'px' },
        { type: 'range', key: 'exit.y', label: 'Зсув Y (вихід)', min: -30, max: 30, step: 1, unit: 'px' },
        { type: 'range', key: 'overlap', label: 'Перекриття вхід/вихід', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + ' %' },
        { type: 'select', key: 'easing', label: 'Easing', options: EASINGS },
      ] },
      { title: 'Адаптив', items: [
        { type: 'select', key: 'rows', label: 'Рядів', options: [[1, '1'], [2, '2'], [3, '3']] },
        { type: 'select', key: 'columns.desktop', label: 'Колонок, desktop (≥ 960)', options: [[3, '3'], [4, '4'], [5, '5'], [6, '6']] },
        { type: 'select', key: 'columns.tablet', label: 'Колонок, tablet (600–959)', options: [[2, '2'], [3, '3'], [4, '4'], [5, '5']] },
        { type: 'select', key: 'columns.mobile', label: 'Колонок, mobile (360–599)', options: [[2, '2'], [3, '3'], [4, '4']] },
        { type: 'select', key: 'columns.small', label: 'Колонок, small (< 360)', options: [[2, '2'], [3, '3']] },
        { type: 'range', key: 'layoutDuration', label: 'Перехід між брейкпоінтами', min: 0, max: 1500, step: 50, unit: 'ms' },
        { type: 'select', key: 'layoutEasing', label: 'Easing адаптиву', options: EASINGS.slice(0, 4) },
        { type: 'status', render: () => {
          const w = root.clientWidth;
          const bp = w >= 960 ? 'desktop' : w >= 600 ? 'tablet' : w >= 360 ? 'mobile' : 'small';
          return `Ширина контейнера: <b>${w}px</b> · брейкпоінт: <b>${bp}</b> · колонок: <b>${wall.cols}</b>`;
        } },
      ] },
      { title: 'Вигляд', items: [
        { type: 'color', key: 'color', label: 'Колір лого' },
      ] },
    ],

    mount(ctx) {
      root = document.createElement('section');
      root.setAttribute('aria-label', 'Clients');
      ctx.frame.append(root);
      wall = new LogoWall(root, Object.assign({}, defaults, { logos: LOGOS }));
      ctx.instance = wall;
      wall.ready.then(ctx.refresh);
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(root);
      document.addEventListener('visibilitychange', ctx.refresh);
      new IntersectionObserver(() => setTimeout(ctx.refresh, 0)).observe(root);
    },
    apply(ctx, patch) { wall.setOptions(patch); },
    hint(ctx) {
      return !wall.running ? 'Пауза'
        : document.hidden ? 'Вкладка прихована, автоплей на паузі'
        : !wall.visible ? 'Блок поза екраном, автоплей на паузі'
        : (ctx.state.pauseOnHover ? 'Наведи на блок, щоб зупинити' : '');
    },
    playback: {
      pause: () => wall.stop(),
      resume: () => { if (!wall.running) wall.start(); },
    },
  });
})();
