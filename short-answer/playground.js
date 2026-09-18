/* Playground definition for Short answer (S : Short answer).
   Not part of the module: a site needs only short-answer.css + short-answer.js.
   Everything here is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  const PRESETS = [
    { label: 'Signal',    patch: { pulse: true,  reveal: true,  pulseInterval: 3200, pulseDuration: 1400, pulseLength: 48,  pulseWidth: 2.5, pulseGlow: 6,  sideReach: 0.45, charge: 700,  pulseEasing: 'cubic-bezier(.45, 0, .2, 1)' } },
    { label: 'Calm',      patch: { pulse: true,  reveal: true,  pulseInterval: 6000, pulseDuration: 2600, pulseLength: 140, pulseWidth: 2,   pulseGlow: 3,  sideReach: 0.6,  charge: 1200, pulseEasing: 'linear' } },
    { label: 'Comet',     patch: { pulse: true,  reveal: true,  pulseInterval: 1800, pulseDuration: 700,  pulseLength: 40,  pulseWidth: 3.5, pulseGlow: 12, sideReach: 0.3,  charge: 500,  pulseEasing: 'cubic-bezier(.7, 0, .84, 0)' } },
    { label: 'Draw only', patch: { pulse: false, reveal: true } },
    { label: 'Static',    patch: { pulse: false, reveal: false } },
  ];

  // the state is the module's option set, starting from the Signal preset
  const defaults = Object.assign(JSON.parse(JSON.stringify(ShortAnswer.defaults)), PRESETS[0].patch);

  let sa = null, root = null;

  const snippet = o => {
    const opts = o.options.map(x => `      {
        name: '${x.name}',
        text: '${x.text}',
        logo: '${x.logo}',
        tone: '${x.tone}',${x.cta ? `
        cta: { label: '${x.cta.label}', href: '${x.cta.href}' },` : ''}
      },`).join('\n');
    return `<link rel="stylesheet" href="short-answer.css">

<section id="answer" aria-label="Short answer"></section>

<script src="short-answer.js"><\/script>
<script>
  new ShortAnswer('#answer', {
    verdict: {
      title: '${o.verdict.title}',
      text: '${o.verdict.text}',
    },
    options: [
${opts}
    ],

    strokeWidth: ${o.strokeWidth},
    tension: ${o.tension},
    stackBelow: ${o.stackBelow},

    reveal: ${o.reveal},
    revealDuration: ${o.revealDuration},
    revealStagger: ${o.revealStagger},
    revealEasing: '${o.revealEasing}',

    pulse: ${o.pulse},
    pulseInterval: ${o.pulseInterval},
    pulseDuration: ${o.pulseDuration},
    pulseLength: ${o.pulseLength},
    pulseWidth: ${o.pulseWidth},
    pulseGlow: ${o.pulseGlow},
    pulseEasing: '${o.pulseEasing}',
    sideReach: ${o.sideReach},
    charge: ${o.charge},

    hover: ${o.hover},
    beam: ${o.beam},

    accent: '${o.accent}',
    neutralOpacity: ${o.neutralOpacity},
  });
<\/script>`;
  };

  const pulseOn = s => s.pulse;
  const revealOn = s => s.reveal;

  Playground.register({
    id: 'answer',
    title: 'Short answer',
    tab: 'S : Short answer',
    summary: 'Блок «S : Short answer»: вердикт і варіанти, зв\'язані живими конекторами.',
    dir: 'short-answer',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'short-answer.css', file: 'short-answer/short-answer.css' },
      { id: 'js', label: 'short-answer.js', file: 'short-answer/short-answer.js' },
    ],
    defaults,
    presets: PRESETS,
    controls: [
      { title: 'Імпульс', items: [
        { type: 'check', key: 'pulse', label: 'Пускати імпульси' },
        { type: 'range', key: 'pulseInterval', label: 'Пауза між імпульсами', min: 800, max: 8000, step: 100, unit: 'ms', when: pulseOn },
        { type: 'range', key: 'pulseDuration', label: 'Час у дорозі', min: 300, max: 4000, step: 50, unit: 'ms', when: pulseOn },
        { type: 'range', key: 'pulseLength', label: 'Довжина голови', min: 8, max: 200, step: 2, unit: 'px', when: pulseOn },
        { type: 'range', key: 'pulseWidth', label: 'Товщина імпульсу', min: 1, max: 6, step: 0.25, unit: 'px', when: pulseOn },
        { type: 'range', key: 'pulseGlow', label: 'Світіння голови', min: 0, max: 20, step: 1, unit: 'px', when: pulseOn },
        { type: 'range', key: 'sideReach', label: 'Куди доходить нейтральна гілка', min: 0.1, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + ' %', when: pulseOn },
        { type: 'range', key: 'charge', label: 'Підсвітка картки після приходу', min: 100, max: 2000, step: 50, unit: 'ms', when: pulseOn },
        { type: 'easing', key: 'pulseEasing', label: 'Easing імпульсу', when: pulseOn },
        { type: 'check', key: 'hover', label: 'Наведення на картку пускає імпульс по її лінії' },
        { type: 'buttons', items: [{ label: 'Імпульс зараз', primary: true, run: () => sa.pulse() }] },
      ] },
      { title: 'Поява', items: [
        { type: 'check', key: 'reveal', label: 'Малювати блок при вході на екран' },
        { type: 'range', key: 'revealDuration', label: 'Тривалість кроку', min: 200, max: 2500, step: 50, unit: 'ms', when: revealOn },
        { type: 'range', key: 'revealStagger', label: 'Затримка між лініями', min: 0, max: 800, step: 10, unit: 'ms', when: revealOn },
        { type: 'easing', key: 'revealEasing', label: 'Easing появи', when: revealOn },
        { type: 'buttons', items: [{ label: 'Програти появу', primary: true, run: () => sa.replay() }] },
      ] },
      { title: 'Лінії', items: [
        { type: 'range', key: 'strokeWidth', label: 'Товщина лінії', min: 0.5, max: 4, step: 0.25, unit: 'px' },
        { type: 'range', key: 'tension', label: 'Крутизна S-кривої', min: 0, max: 1.2, step: 0.05, fmt: v => v.toFixed(2) },
        { type: 'range', key: 'neutralOpacity', label: 'Прозорість нейтральної лінії', min: 0.03, max: 0.5, step: 0.01, fmt: v => Math.round(v * 100) + ' %' },
        { type: 'check', key: 'beam', label: 'Промінь по рамці кнопки' },
      ] },
      { title: 'Адаптив', items: [
        { type: 'range', key: 'stackBelow', label: 'Стек під ширину контейнера', min: 320, max: 1024, step: 10, unit: 'px' },
        { type: 'status', render: () => `Ширина контейнера: <b>${root.clientWidth}px</b> · режим: <b>${sa.stacked ? 'стек, нитка зліва' : 'поруч, S-криві'}</b>` },
      ] },
      { title: 'Вигляд', items: [
        { type: 'color', key: 'accent', label: 'Акцент' },
      ] },
    ],
    stage: { bg: '#ffffff' },

    mount(ctx) {
      root = document.createElement('section');
      root.setAttribute('aria-label', 'Short answer');
      ctx.frame.append(root);
      sa = new ShortAnswer(root, defaults);
      ctx.instance = sa;
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(root);
      root.addEventListener('sa:reveal', ctx.refresh);
      document.addEventListener('visibilitychange', ctx.refresh);
      new IntersectionObserver(() => setTimeout(ctx.refresh, 0)).observe(root);
    },
    apply(ctx, patch) { sa.setOptions(patch); },
    hint(ctx) {
      const s = ctx.state;
      return !s.pulse ? 'Імпульси вимкнені'
        : !sa.running ? 'Пауза'
        : document.hidden ? 'Вкладка прихована, імпульси на паузі'
        : !sa.visible ? 'Блок поза екраном, імпульси на паузі'
        : (s.hover ? 'Наведи на картку, щоб пустити імпульс по її лінії' : '');
    },
    playback: {
      pause: () => sa.stop(),
      resume: () => { if (!sa.running) sa.start(); },
    },
  });
})();
