/* Playground definition for the Worksection button (Button).
   Not part of the module: a site needs only button.css (plus beam.css +
   beam.js from border-beam/ for the beam variant).
   The button is a shared component: this tab is the master, other modules
   (the hero's CTAs) consume copies through the shell and follow the beam
   settings tuned here. */
(function () {
  'use strict';

  // beam knobs → custom properties on the beam button (the mono palette is fixed in button.css)
  const VARS = {
    duration: ['--beam-duration', 's'], arc: ['--beam-arc', ''], head: ['--beam-head', ''], strength: ['--beam-strength', ''],
    width: ['--beam-width', 'px'], bloomBlur: ['--beam-bloom-blur', 'px'], innerFeather: ['--beam-inner-feather', 'px'], brightness: ['--beam-brightness', ''],
  };
  const CSS_DEFAULTS = { duration: 2.4, arc: 14, head: 66, strength: 0.9, width: 1, bloomBlur: 6, innerFeather: 20, brightness: 1.3 };
  const defaults = Object.assign({ beam: true, trigger: 'always' }, CSS_DEFAULTS);

  // opts: { variant: primary|secondary|tertiary|accent|plain|white, size: 32|36|40|48|56, rounded, invert, label, href, tag, beam }
  const cls = o => ['btn', `btn-${o.size}`, `btn-${o.variant}`, o.rounded ? 'btn-rounded' : '', o.invert ? 'btn-invert' : ''].filter(Boolean).join(' ');
  const wantsBeam = (o, s) => !!s.beam && o.variant === 'primary' && o.beam !== false;

  // the markup the site uses (its own .btn system); the beam variant carries the effect's host class and attribute
  const markup = (o, s) => {
    const beam = wantsBeam(o, s);
    const tag = o.tag || 'a';
    const attrs = [`class="${cls(o)}${beam ? ' btn-beam beam' : ''}"`, tag === 'a' ? `href="${o.href || '#'}"` : 'type="button"', beam ? `data-beam data-trigger="${s.trigger}"` : ''].filter(Boolean).join(' ');
    return `<${tag} ${attrs}><span>${o.label}</span></${tag}>`;
  };

  // one place that pushes the state into a button: the specimens here and every copy other modules consume
  function applyTo(item, s) {
    const { el, opts } = item;
    const on = wantsBeam(opts, s) && !!window.BorderBeam;
    if (on !== !!item.inst) {
      if (on) {
        el.classList.add('btn-beam', 'beam');
        el.setAttribute('data-beam', '');
        item.inst = BorderBeam.attach(el, { trigger: s.trigger, respectReducedMotion: false });
      } else {
        item.inst.destroy();
        item.inst = null;
        const bloom = el.querySelector(':scope > .beam__bloom');
        if (bloom) bloom.remove();
        el.classList.remove('btn-beam', 'beam');
        el.removeAttribute('data-beam');
        el.removeAttribute('data-trigger');
        for (const [prop] of Object.values(VARS)) el.style.removeProperty(prop);
      }
    }
    if (!on) return;
    if (item.inst.trigger !== s.trigger) item.inst.setTrigger(s.trigger);
    el.dataset.trigger = s.trigger;
    for (const [k, [prop, unit]] of Object.entries(VARS)) el.style.setProperty(prop, s[k] + unit);
  }

  let state = null;
  const items = [];   // the specimens on this tab's stage

  Playground.provide('site-button', {
    create(host, opts) {
      const o = Object.assign({ variant: 'secondary', size: 48, rounded: true, label: 'Button', href: '#' }, opts);
      // the element is created without the beam; update() adds it when the state says so
      host.insertAdjacentHTML('beforeend', markup(o, { beam: false }));
      const item = { el: host.lastElementChild, opts: o, inst: null };
      return { el: item.el, update: s => applyTo(item, s) };
    },
    state: () => state || defaults,
    markup,
  });

  Playground.css(`
    .wsb { display: flex; flex-direction: column; gap: 28px; align-items: center; padding: 8px 0; }
    .wsb__row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; align-items: center; }
    .wsb__cap { width: 100%; text-align: center; font: 12px/16px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; color: rgba(0,0,0,.5); }
  `);

  const SPECIMENS = [
    { cap: 'Хіро: btn-48 btn-rounded', size: 48, rounded: true },
    { cap: 'Сайт за замовчуванням: btn-48, кути 12 px', size: 48, rounded: false },
    { cap: 'Шапка: btn-36 btn-rounded', size: 36, rounded: true },
  ];
  const VARIANTS = [
    { variant: 'primary', label: 'Get started' },
    { variant: 'secondary', label: 'Contact sales' },
    { variant: 'tertiary', label: 'Як це працює' },
    { variant: 'accent', label: 'Забронювати демо', tag: 'button' },
    { variant: 'plain', label: 'Увійти' },
  ];

  const snippet = s => {
    const vars = Object.entries(VARS).filter(([k]) => s[k] !== CSS_DEFAULTS[k]).map(([k, [p, u]]) => `  ${p}: ${s[k]}${u};`);
    return `<link rel="stylesheet" href="button.css">${s.beam ? `
<!-- beam-варіант потребує ефект border-beam поруч -->
<link rel="stylesheet" href="beam.css">` : ''}

<!-- на сайті ці класи вже є (.btn, розміри, варіанти); button.css потрібен лише поза сайтом і для .btn-beam -->
${VARIANTS.map(v => markup(Object.assign({ size: 48, rounded: true }, v), s)).join('\n')}

<!-- малий розмір, як у шапці -->
${VARIANTS.slice(0, 2).map(v => markup(Object.assign({ size: 36, rounded: true, beam: false }, v), s)).join('\n')}${s.beam ? `

<!-- beam.js сам вмикає ефект на кожному [data-beam] після завантаження сторінки -->
<script src="beam.js"><\/script>` : ''}${vars.length ? `

<style>
.btn.btn-beam {
${vars.join('\n')}
}
</style>` : ''}`;
  };

  const beamOn = s => s.beam;

  Playground.register({
    id: 'button',
    title: 'Button: кнопки сайту',
    tab: 'Button',
    kind: 'component',
    summary: 'Кнопки сайту, система .btn з worksection.com як є. На темній головній — промінь border-beam у моно.',
    dir: 'site-button',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'button.css', file: 'site-button/button.css' },
      { id: 'beamcss', label: 'beam.css', file: 'border-beam/beam.css' },
      { id: 'beamjs', label: 'beam.js', file: 'border-beam/beam.js' },
    ],
    defaults,
    presets: [
      { label: 'Mono beam', patch: Object.assign({}, defaults) },
      { label: 'Тихіший', patch: { beam: true, duration: 3.2, arc: 20, strength: 0.6, bloomBlur: 3, brightness: 1.1 } },
      { label: 'На ховер', patch: { beam: true, trigger: 'hover' } },
      { label: 'Без beam', patch: { beam: false } },
    ],
    acceptance: [
      { id: 'beam-only-on-dark-primary', run: () => {}, expect: () => items.every(it => (it.handle.el.classList.contains('beam') === it.handle.el.classList.contains('btn-primary'))) || 'beam on a non-primary or missing on a primary' },
      { id: 'beam-off-clears-copies-too', run: ctx => ctx.set({ beam: false }), expect: () => !document.querySelector('.btn.beam') || 'a .btn.beam is still around' },
      { id: 'beam-on-reaches-hero-cta', run: ctx => ctx.set({ beam: true }), expect: () => document.querySelectorAll('.hero__cta .btn.beam[data-active]').length === 1 || 'hero CTA has no active beam' },
      { id: 'hover-trigger-waits', run: ctx => ctx.set({ trigger: 'hover' }), wait: 20, expect: () => items.filter(it => it.handle.el.classList.contains('beam')).every(it => !it.handle.el.hasAttribute('data-active')) },
    ],
    controls: [
      { title: 'Beam на головній', items: [
        { type: 'check', key: 'beam', label: 'Промінь по межі темної кнопки' },
        { type: 'seg', key: 'trigger', label: 'Коли світить', options: [['always', 'Завжди'], ['hover', 'На наведення']], when: beamOn },
        { type: 'range', key: 'duration', label: 'Один оберт', min: 0.8, max: 6, step: 0.1, fmt: v => v.toFixed(1) + ' s', when: beamOn },
        { type: 'range', key: 'arc', label: 'Довжина дуги', min: 4, max: 30, step: 1, unit: '%', when: beamOn },
        { type: 'range', key: 'strength', label: 'Сила', min: 0, max: 2, step: 0.05, fmt: v => v.toFixed(2), when: beamOn },
        { type: 'range', key: 'brightness', label: 'Яскравість', min: 0.5, max: 2.5, step: 0.05, fmt: v => v.toFixed(2), when: beamOn },
        { type: 'range', key: 'width', label: 'Товщина обводки', min: 0.5, max: 3, step: 0.5, unit: 'px', when: beamOn },
        { type: 'range', key: 'bloomBlur', label: 'Розмиття bloom', min: 0, max: 20, step: 1, unit: 'px', when: beamOn },
        { type: 'range', key: 'innerFeather', label: 'Глибина внутрішнього сяйва', min: 0, max: 40, step: 1, unit: 'px', when: beamOn },
        { type: 'note', text: 'Палітра моно і радіус зашиті в button.css (.btn-beam), радіус іде від розміру й btn-rounded. Ці повзунки стають перевизначеннями у сніпеті. Ті самі значення отримують копії кнопок у Hero.' },
      ] },
    ],

    mount(ctx) {
      state = ctx.state;
      const wrap = document.createElement('div');
      wrap.className = 'wsb';
      ctx.frame.append(wrap);
      const provider = Playground.component('site-button');
      for (const sp of SPECIMENS) {
        const row = document.createElement('div');
        row.className = 'wsb__row';
        row.innerHTML = `<span class="wsb__cap">${sp.cap}</span>`;
        wrap.append(row);
        for (const v of VARIANTS) items.push({ handle: provider.create(row, Object.assign({ size: sp.size, rounded: sp.rounded }, v)) });
      }
      ctx.instance = items;
    },
    apply(ctx) {
      for (const it of items) it.handle.update(ctx.state);
      Playground.publish('site-button', ctx.state);
    },
    hint(ctx) {
      if (!ctx.state.beam) return 'Промінь вимкнено, кнопки статичні';
      return ctx.state.trigger === 'hover' ? 'Наведи на «Get started», щоб запустити промінь' : 'Промінь іде по межі темної кнопки; ті самі кнопки стоять у Hero';
    },
  });
})();
