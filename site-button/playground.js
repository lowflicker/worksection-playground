/* Playground definition for the Worksection button (Button).
   Not part of the module: a site has the .btn system already, and the
   playground loads it verbatim from site-css/buttons.css (button.css adds
   only the ws-icon box and .btn-beam). That file is the source of truth
   here: the panel offers exactly the classes it defines, the sheet under
   the configured button shows every look in every size, the snippet is
   the site's own markup.
   The button is a shared component: this tab is the master, other modules
   (the hero's CTAs) consume copies through the shell and follow the beam
   settings tuned here. */
(function () {
  'use strict';

  /* --- the system, as site-css/buttons.css defines it --------------------------------------- */
  // every look the CSS has, in its order; the invert ones are drawn on the dark surface they are made for
  const VARIANTS = [
    { id: 'primary', cls: 'btn-primary' },
    { id: 'primary-invert', cls: 'btn-primary btn-invert', dark: true },
    { id: 'primary-white', cls: 'btn-primary btn-white' },
    { id: 'secondary', cls: 'btn-secondary' },
    { id: 'secondary-invert', cls: 'btn-secondary btn-invert', dark: true },
    { id: 'tertiary', cls: 'btn-tertiary' },
    { id: 'tertiary-invert', cls: 'btn-tertiary btn-invert', dark: true },
    { id: 'accent', cls: 'btn-accent' },
    { id: 'plain', cls: 'btn-plain' },
    { id: 'ghost', cls: 'btn-ghost' },
  ];
  const CLS = Object.fromEntries(VARIANTS.map(v => [v.id, v.cls]));
  const isDark = id => !!(VARIANTS.find(v => v.id === id) || {}).dark;
  const SIZES = [32, 36, 40, 48, 56];
  const LABELS = ['Get started', 'Contact sales', 'Спробувати Worksection', 'Забронювати демо', 'Дивитись демо', 'Реєстрація', 'Увійти'];
  // the site's chevron (the carousel arrows), 16 px in btn-32/36 and 20 px above, as the site sizes its icons;
  // no fill on the path, so the variant colours it through ws-icon svg { fill }
  const ICON = size => {
    const px = size <= 36 ? 16 : 20;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.37569 3.57564C6.61 3.34132 6.9899 3.34132 7.22422 3.57564L11.2242 7.57564C11.3367 7.68816 11.4 7.84077 11.4 7.9999C11.4 8.15903 11.3367 8.31165 11.2242 8.42417L7.22422 12.4242C6.9899 12.6585 6.61 12.6585 6.37569 12.4242C6.14137 12.1899 6.14137 11.81 6.37569 11.5756L9.95142 7.9999L6.37569 4.42417C6.14137 4.18985 6.14137 3.80995 6.37569 3.57564Z"/></svg>`;
  };

  // beam knobs → custom properties on the beam button (the mono palette is fixed in button.css)
  const VARS = {
    duration: ['--beam-duration', 's'], arc: ['--beam-arc', ''], head: ['--beam-head', ''], strength: ['--beam-strength', ''],
    width: ['--beam-width', 'px'], bloomBlur: ['--beam-bloom-blur', 'px'], innerFeather: ['--beam-inner-feather', 'px'], brightness: ['--beam-brightness', ''],
  };
  const CSS_DEFAULTS = { duration: 2.4, arc: 14, head: 66, strength: 0.9, width: 1, bloomBlur: 6, innerFeather: 20, brightness: 1.3 };
  const defaults = Object.assign({
    tag: 'a', variant: 'primary', size: 48, rounded: true, icon: 'none', label: 'Get started', status: 'default',
    sheet: true,
    beam: true, trigger: 'always',
  }, CSS_DEFAULTS);
  // the keys that change the markup; a patch with one of them rebuilds the stage, the beam knobs only restyle
  const STRUCT = ['tag', 'variant', 'size', 'rounded', 'icon', 'label', 'status', 'sheet'];

  /* --- markup --------------------------------------------------------------------------------- */
  // opts: { variant, size, rounded, label, href, tag, icon: none|after|before|only, status: default|active|disabled, beam }
  //   variant is a VARIANTS id ('primary', 'secondary-invert', …); invert: true is the consumers' shorthand for the -invert look
  const norm = o => {
    const variant = o.invert && CLS[o.variant + '-invert'] ? o.variant + '-invert' : o.variant;
    return Object.assign({ tag: 'a', href: '#', icon: 'none', status: 'default' }, o, { variant });
  };
  const cls = o => ['btn', `btn-${o.size}`, CLS[o.variant] || `btn-${o.variant}`, o.rounded ? 'btn-rounded' : '', o.icon === 'only' ? 'btn-square' : '', o.status === 'active' ? 'btn-active' : ''].filter(Boolean).join(' ');
  const wantsBeam = (o, s) => !!s.beam && o.variant === 'primary' && o.beam !== false;

  // the markup the site uses; the beam variant carries the effect's host class and attribute
  const markup = (o, s) => {
    o = norm(o);
    const beam = wantsBeam(o, s);
    const attrs = [
      `class="${cls(o)}${beam ? ' btn-beam beam' : ''}"`,
      o.tag === 'a' ? `href="${o.href}"` : 'type="button"',
      o.status === 'disabled' ? 'disabled' : '',
      beam ? `data-beam data-trigger="${s.trigger}"` : '',
    ].filter(Boolean).join(' ');
    const icon = o.icon === 'none' ? '' : `<ws-icon>${ICON(o.size)}</ws-icon>`;
    const inner = o.icon === 'only' ? icon : o.icon === 'before' ? `${icon}<span>${o.label}</span>` : `<span>${o.label}</span>${icon}`;
    return `<${o.tag} ${attrs}>${inner}</${o.tag}>`;
  };
  const focusOpts = s => ({ tag: s.tag, variant: s.variant, size: s.size, rounded: s.rounded, icon: s.icon, label: s.label, status: s.status });

  // one place that pushes the beam state into a button: the specimens here and every copy other modules consume
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
  const items = [];   // every button on this stage: the configured one and the sheet
  let focus = null;   // the configured button's item
  let wrap = null;

  Playground.provide('site-button', {
    create(host, opts) {
      const o = norm(Object.assign({ variant: 'secondary', size: 48, rounded: true, label: 'Button' }, opts));
      // the element is created without the beam; update() adds it when the state says so
      host.insertAdjacentHTML('beforeend', markup(o, { beam: false }));
      const item = { el: host.lastElementChild, opts: o, inst: null };
      return { el: item.el, update: s => applyTo(item, s), item };
    },
    state: () => state || defaults,
    markup,
  });

  /* --- the stage: the configured button on its surface, the sheet under it ------------------- */
  Playground.css(`
    .wsb { display: flex; flex-direction: column; gap: 16px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wsb__card { padding: 24px; border-radius: 16px; background: var(--bg-surf-0); box-shadow: 0 0 0 1px var(--border-mid-high); color: var(--text-base-secondary); }
    .wsb__card--dark { background: var(--base-greengrey-990); box-shadow: none; color: var(--text-base-invert-secondary); }
    .wsb__focus { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 48px 24px 24px; }
    .wsb__tag { font: 12px/16px ui-monospace, SFMono-Regular, Menlo, monospace; text-align: center; overflow-wrap: anywhere; user-select: all; }
    .wsb__sheet { display: grid; grid-template-columns: repeat(5, max-content); gap: 16px 24px; align-items: center; overflow-x: auto; padding: 24px 32px 32px; }
    .wsb__head { display: contents; }
    .wsb__head span, .wsb__cap { font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; }
    .wsb__cap { grid-column: 1 / -1; margin-top: 8px; }
    .wsb__cell { display: flex; align-items: center; width: max-content; border-radius: 50px; }
    .wsb__cell.is-current { outline: 1.5px dashed rgba(127, 127, 127, .7); outline-offset: 6px; }
  `);

  const el = (tag, className) => { const n = document.createElement(tag); n.className = className; return n; };
  const openTag = html => html.slice(0, html.indexOf('>') + 1);

  function clear() {
    for (const it of items) if (it.inst) { it.inst.destroy(); it.inst = null; }
    items.length = 0;
    focus = null;
    wrap.replaceChildren();
  }
  function build(s) {
    clear();
    const provider = Playground.component('site-button');
    const add = (host, o) => { const it = provider.create(host, o).item; items.push(it); return it; };
    // the configured button, on the surface its variant is made for, with its tag line under it
    const card = el('div', `wsb__card wsb__focus${isDark(s.variant) ? ' wsb__card--dark' : ''}`);
    focus = add(card, focusOpts(s));
    const tag = el('code', 'wsb__tag');
    tag.textContent = openTag(markup(focusOpts(s), s));
    card.append(tag);
    wrap.append(card);
    if (!s.sheet) return;
    // the sheet: every look × every size with the same modifiers; light looks on the page, invert looks on dark
    for (const dark of [false, true]) {
      const sheet = el('div', `wsb__card wsb__sheet${dark ? ' wsb__card--dark' : ''}`);
      const head = el('div', 'wsb__head');
      head.innerHTML = SIZES.map(z => `<span>btn-${z}</span>`).join('');
      sheet.append(head);
      for (const v of VARIANTS.filter(v => !!v.dark === dark)) {
        const cap = el('div', 'wsb__cap');
        cap.textContent = v.cls;
        sheet.append(cap);
        for (const z of SIZES) {
          const cell = el('div', 'wsb__cell');
          const it = add(cell, Object.assign(focusOpts(s), { variant: v.id, size: z }));
          it.pick = { variant: v.id, size: z };
          if (v.id === s.variant && z === s.size) cell.classList.add('is-current');
          sheet.append(cell);
        }
      }
      wrap.append(sheet);
    }
  }

  /* --- code ----------------------------------------------------------------------------------- */
  const snippet = s => {
    const beam = wantsBeam(norm(focusOpts(s)), s);
    const vars = Object.entries(VARS).filter(([k]) => s[k] !== CSS_DEFAULTS[k]).map(([k, [p, u]]) => `  ${p}: ${s[k]}${u};`);
    return `<!-- класи .btn — з CSS сайту (assets/css/buttons.css), на сайті нічого підключати не треба.
     Поза сайтом: site-css/tokens.css + site-css/buttons.css; button.css дає бокс ws-icon і .btn-beam -->
${markup(focusOpts(s), s)}${beam ? `

<!-- промінь: ефект border-beam, beam.css перед button.css;
     beam.js сам вмикає його на кожному [data-beam] -->
<link rel="stylesheet" href="beam.css">
<link rel="stylesheet" href="button.css">
<script src="beam.js"><\/script>` : ''}${vars.length ? `

<style>
.btn.btn-beam {
${vars.join('\n')}
}
</style>` : ''}`;
  };
  const sheetMarkup = s => VARIANTS.map(v => `<!-- ${v.cls}${v.dark ? ' — на темному' : ''} -->\n` + SIZES.map(z => markup(Object.assign(focusOpts(s), { variant: v.id, size: z }), s)).join('\n')).join('\n\n');
  const CHEATSHEET = `Система .btn сайту — site-css/buttons.css (assets/css/buttons.css, дослівно). Клас = один рядок нижче.

Розміри      btn-32  btn-36  btn-40  btn-48  btn-56
             висота 32 · 32 · 40 · 48 · 56 px — btn-36 відрізняється від btn-32 лише шириною квадрата (36 px)
             кути   10 · 10 · 12 · 12 · 14 px
             шрифт  body-semi-xs · body-semi-xs · body-med-md · body-med-lg · body-med-lg (на <span>)
Варіанти     btn-primary  btn-secondary  btn-tertiary  btn-accent  btn-plain  btn-ghost
На темному   btn-primary btn-invert   btn-secondary btn-invert   btn-tertiary btn-invert
Білий        btn-primary btn-white — лише разом з btn-primary;
             свого кольору іконки не має — вона лишається білою від btn-primary
Пігулка      btn-rounded — border-radius: 50px !important
Квадрат      btn-square — ширина = висоті, всередині лише <ws-icon>; у btn-56 його нема
Стани        :hover і :active дає CSS; btn-active — натиснутий як клас;
             [disabled] — вигляд btn-ghost і pointer-events: none
Іконка       <ws-icon><svg width="16" height="16" …></ws-icon> у btn-32/36 (CSS примусово 16 px), width="20" у інших;
             path без fill бере колір варіанта (ws-icon svg { fill });
             бокс ws-icon 20×20 — з common.css сайту, тут у button.css
Тег          <a class="btn …" href="…"> — display: inline-flex
             <button class="btn …" type="button"> — display: flex
Нове         btn-beam — промінь border-beam на btn-primary; на сайті ще нема, передано розробникам`;

  const beamOn = s => s.beam;

  Playground.register({
    id: 'button',
    title: 'Button: кнопки сайту',
    tab: 'Button',
    kind: 'component',
    summary: 'Система .btn з worksection.com як є: кожен варіант, розмір і стан з buttons.css, розмітка сайту в сніпеті. На темній головній — промінь border-beam у моно.',
    dir: 'site-button',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'sheet', label: 'аркуш.html', render: sheetMarkup },
      { id: 'classes', label: 'класи', render: () => CHEATSHEET },
      { id: 'sitecss', label: 'buttons.css', file: 'site-css/buttons.css' },
      { id: 'css', label: 'button.css', file: 'site-button/button.css' },
      { id: 'beamcss', label: 'beam.css', file: 'border-beam/beam.css' },
      { id: 'beamjs', label: 'beam.js', file: 'border-beam/beam.js' },
    ],
    defaults,
    presets: [
      { label: 'Хіро CTA', patch: { tag: 'a', variant: 'primary', size: 48, rounded: true, icon: 'none', label: 'Get started', status: 'default', beam: true } },
      { label: 'Шапка: реєстрація', patch: { tag: 'a', variant: 'primary', size: 36, rounded: true, icon: 'none', label: 'Реєстрація', status: 'default' } },
      { label: 'Дивитись демо', patch: { tag: 'button', variant: 'secondary', size: 48, rounded: false, icon: 'after', label: 'Дивитись демо', status: 'default' } },
      { label: 'Стрілка каруселі', patch: { tag: 'button', variant: 'secondary', size: 32, rounded: false, icon: 'only', status: 'default' } },
      { label: 'На темному', patch: { tag: 'a', variant: 'primary-invert', size: 48, rounded: false, icon: 'none', label: 'Спробувати Worksection', status: 'default' } },
      { label: 'Beam на ховер', patch: { variant: 'primary', beam: true, trigger: 'hover' } },
      { label: 'Без beam', patch: { beam: false } },
    ],
    acceptance: [
      { id: 'sheet-shows-every-look-in-every-size', run: ctx => ctx.set({ sheet: true }), expect: ctx => { const n = ctx.frame.querySelectorAll('.wsb__sheet .btn').length; return n === VARIANTS.length * SIZES.length || `${n} buttons in the sheet`; } },
      { id: 'icon-only-is-square-without-a-span', run: ctx => ctx.set({ icon: 'only' }), expect: () => (focus.el.classList.contains('btn-square') && !focus.el.querySelector('span') && !!focus.el.querySelector('ws-icon svg')) || 'not square, a span left or no icon' },
      { id: 'disabled-is-the-attribute', run: ctx => ctx.set({ icon: 'none', status: 'disabled' }), expect: () => (focus.el.hasAttribute('disabled') && !focus.el.classList.contains('btn-active')) || 'disabled attribute missing' },
      { id: 'sheet-click-picks-the-look', run: ctx => { ctx.set({ status: 'default' }); items.find(it => it.pick && it.pick.variant === 'tertiary-invert' && it.pick.size === 32).el.click(); }, expect: ctx => (ctx.state.variant === 'tertiary-invert' && ctx.state.size === 32 && !!focus.el.closest('.wsb__card--dark')) || 'the click did not pick, or the surface is not dark' },
      { id: 'beam-only-on-the-plain-primary', run: ctx => ctx.set({ variant: 'primary', size: 48, beam: true }), expect: () => items.every(it => it.el.classList.contains('beam') === (it.opts.variant === 'primary')) || 'beam on a non-primary or missing on a primary' },
      { id: 'beam-off-clears-copies-too', run: ctx => ctx.set({ beam: false }), expect: () => !document.querySelector('.btn.beam') || 'a .btn.beam is still around' },
      { id: 'beam-on-reaches-hero-cta', run: ctx => ctx.set({ beam: true }), expect: () => document.querySelectorAll('.hero__cta .btn.beam[data-active]').length === 1 || 'hero CTA has no active beam' },
      { id: 'hover-trigger-waits', run: ctx => ctx.set({ trigger: 'hover' }), wait: 20, expect: () => items.filter(it => it.el.classList.contains('beam')).every(it => !it.el.hasAttribute('data-active')) },
    ],
    controls: [
      { title: 'Кнопка', items: [
        { type: 'select', key: 'variant', label: 'Варіант', options: VARIANTS.map(v => [v.id, v.cls]) },
        { type: 'seg', key: 'size', label: 'Розмір', options: SIZES.map(z => [z, String(z)]) },
        { type: 'seg', key: 'tag', label: 'Тег', options: [['a', '<a>'], ['button', '<button>']] },
        { type: 'select', key: 'label', label: 'Текст', options: LABELS.map(l => [l, l]), when: s => s.icon !== 'only' },
        { type: 'seg', key: 'icon', label: 'Іконка', options: [['none', 'Немає'], ['after', 'Після'], ['before', 'Перед'], ['only', 'Лише']] },
        { type: 'check', key: 'rounded', label: 'btn-rounded — пігулка' },
        { type: 'seg', key: 'status', label: 'Стан', options: [['default', 'Звичайний'], ['active', 'btn-active'], ['disabled', 'disabled']] },
        { type: 'note', text: 'Рівно те, що є в buttons.css сайту. Ховер і натискання живі; «Лише іконка» = btn-square (у btn-56 його нема, кнопка не квадратна).' },
      ] },
      { title: 'Аркуш', items: [
        { type: 'check', key: 'sheet', label: 'Усі варіанти × розміри під кнопкою', proof: ctx => !!ctx.frame.querySelector('.wsb__sheet') },
        { type: 'note', text: 'Клік по кнопці в аркуші робить її поточною. Пігулка, іконка, стан і текст застосовуються до всього аркуша.' },
      ] },
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
        { type: 'note', text: 'Лише на btn-primary без btn-invert/btn-white: тут, у рядку primary аркуша і на копіях у Hero. Палітра моно і радіус зашиті в button.css (.btn-beam); повзунки стають перевизначеннями у сніпеті.' },
      ] },
    ],

    mount(ctx) {
      state = ctx.state;
      wrap = el('div', 'wsb');
      ctx.frame.append(wrap);
      // a click on a sheet button makes it the configured one; the links never navigate here
      wrap.addEventListener('click', e => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        e.preventDefault();
        const it = items.find(i => i.el === btn);
        if (it && it.pick) ctx.set(it.pick);
      });
      ctx.instance = items;
    },
    apply(ctx, patch) {
      state = ctx.state;
      if (STRUCT.some(k => k in patch)) build(ctx.state);
      for (const it of items) applyTo(it, ctx.state);
      Playground.publish('site-button', ctx.state);
    },
    hint(ctx) {
      const s = ctx.state;
      if (s.beam && s.variant === 'primary' && s.trigger === 'hover') return 'Наведи на кнопку, щоб запустити промінь';
      if (s.sheet) return 'Клік по кнопці в аркуші робить її поточною; ховер живий, натиснуту дає btn-active';
      return 'Рядок під кнопкою — її тег і класи, повна розмітка в «Код»';
    },
  });
})();
