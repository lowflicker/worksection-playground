/* Playground definition for the Worksection button (Button).
   Not part of the module: a site has the .btn system already, and the
   playground loads it verbatim from site-css/buttons.css (button.css adds
   only the ws-icon box and .btn-beam). That file is the source of truth
   here: the panel offers exactly the classes it defines, the sheet behind
   «Показати всі варіанти» shows every look in every size, the snippet is
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
  // the icons the site puts in its buttons (home page), each on its own grid; no fill on the paths,
  // so the variant colours them through ws-icon svg { fill }. 16 px in btn-32/36, 20 px above, as the site does
  const ICONS = {
    'chevron-right': { label: 'Шеврон →', box: 16, d: 'M6.37569 3.57564C6.61 3.34132 6.9899 3.34132 7.22422 3.57564L11.2242 7.57564C11.3367 7.68816 11.4 7.84077 11.4 7.9999C11.4 8.15903 11.3367 8.31165 11.2242 8.42417L7.22422 12.4242C6.9899 12.6585 6.61 12.6585 6.37569 12.4242C6.14137 12.1899 6.14137 11.81 6.37569 11.5756L9.95142 7.9999L6.37569 4.42417C6.14137 4.18985 6.14137 3.80995 6.37569 3.57564Z' },
    'chevron-left': { label: 'Шеврон ←', box: 16, d: 'M9.62436 3.57564C9.85868 3.80995 9.85868 4.18985 9.62436 4.42417L6.04863 7.9999L9.62436 11.5756C9.85868 11.81 9.85868 12.1899 9.62436 12.4242C9.39005 12.6585 9.01015 12.6585 8.77583 12.4242L4.77583 8.42417C4.66331 8.31165 4.6001 8.15903 4.6001 7.9999C4.6001 7.84077 4.66331 7.68816 4.77583 7.57564L8.77583 3.57564C9.01015 3.34132 9.39005 3.34132 9.62436 3.57564Z' },
    'chevron-down': { label: 'Шеврон ↓', box: 16, d: 'M8.00078 10.5999C7.86817 10.5999 7.741 10.5472 7.64723 10.4535L4.44723 7.25346C4.25197 7.05819 4.25197 6.74161 4.44723 6.54635C4.64249 6.35109 4.95907 6.35109 5.15434 6.54635L8.00078 9.3928L10.8472 6.54635C11.0425 6.35109 11.3591 6.35109 11.5543 6.54635C11.7496 6.74161 11.7496 7.05819 11.5543 7.25346L8.35433 10.4535C8.26057 10.5472 8.13339 10.5999 8.00078 10.5999Z' },
    'chevron-up': { label: 'Шеврон ↑', box: 20, d: 'M10 6.875C10.1658 6.875 10.3247 6.94085 10.4419 7.05806L14.4419 11.0581C14.686 11.3021 14.686 11.6979 14.4419 11.9419C14.1979 12.186 13.8021 12.186 13.5581 11.9419L10 8.38388L6.44194 11.9419C6.19786 12.186 5.80214 12.186 5.55806 11.9419C5.31398 11.6979 5.31398 11.3021 5.55806 11.0581L9.55806 7.05806C9.67527 6.94085 9.83424 6.875 10 6.875Z' },
    play: { label: 'Плей', box: 20, d: 'M12.9033 10.2093L8.41875 13.9408C8.24999 14.0812 8 13.9562 8 13.7314V6.26858C8 6.0438 8.24999 5.91883 8.41875 6.05925L12.9033 9.79067C13.0322 9.89799 13.0322 10.102 12.9033 10.2093Z' },
    globe: { label: 'Глобус (мова)', box: 16, d: 'M10.5523 2.13098C13.7937 3.54044 15.2789 7.31069 13.8694 10.5521C12.46 13.7936 8.68972 15.2787 5.44826 13.8693C2.2068 12.4599 0.721645 8.68959 2.13107 5.44813C3.54046 2.20676 7.31094 0.721757 10.5523 2.13098ZM7.00457 13.3087C9.26738 13.7353 11.6001 12.6665 12.7321 10.6028L10.359 9.57098C9.33637 11.6766 8.01785 12.7577 7.00457 13.3087ZM4.79663 12.3486C4.5086 11.2318 4.40003 9.5302 5.24253 7.34626L2.8697 6.31453C2.13246 8.54971 2.9416 10.9846 4.79663 12.3486ZM6.55921 6.82833C7.4 5.11457 8.43169 4.2 9.23269 3.709C9.53698 3.52247 9.81354 3.39373 10.0414 3.30554C10.1323 3.53234 10.2268 3.8224 10.2979 4.17216C10.4851 5.09284 10.5198 6.4711 9.83985 8.25479L6.55921 6.82833ZM6.16048 7.7454C5.48061 9.52898 5.51536 10.9072 5.70253 11.8278C5.77364 12.1776 5.86811 12.4676 5.95901 12.6944C6.18688 12.6062 6.46344 12.4775 6.76773 12.291C7.56869 11.8 8.60033 10.8855 9.44109 9.17185L6.16048 7.7454ZM5.64127 6.4292L3.26845 5.39747C4.40033 3.33394 6.7328 2.26512 8.99548 2.69142C7.98221 3.24254 6.66383 4.32366 5.64127 6.4292ZM10.7578 8.65393L13.1308 9.68574C13.8681 7.45054 13.0589 5.01564 11.2039 3.65159C11.4918 4.76851 11.6003 6.47006 10.7578 8.65393Z' },
    burger: { label: 'Бургер (меню)', box: 16, d: 'M3.2002 4.3999C3.2002 4.12376 3.42405 3.8999 3.7002 3.8999H12.3002C12.5763 3.8999 12.8002 4.12376 12.8002 4.3999C12.8002 4.67604 12.5763 4.8999 12.3002 4.8999H3.7002C3.42405 4.8999 3.2002 4.67604 3.2002 4.3999ZM3.2002 8.3999C3.2002 8.12376 3.42405 7.8999 3.7002 7.8999H12.3002C12.5763 7.8999 12.8002 8.12376 12.8002 8.3999C12.8002 8.67604 12.5763 8.8999 12.3002 8.8999H3.7002C3.42405 8.8999 3.2002 8.67604 3.2002 8.3999ZM3.2002 12.3999C3.2002 12.1238 3.42405 11.8999 3.7002 11.8999H8.3002C8.57634 11.8999 8.8002 12.1238 8.8002 12.3999C8.8002 12.676 8.57634 12.8999 8.3002 12.8999H3.7002C3.42405 12.8999 3.2002 12.676 3.2002 12.3999Z' },
  };
  const iconSvg = (id, size) => {
    const i = ICONS[id];
    if (!i) return '';
    const px = size <= 36 ? 16 : 20;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${i.box} ${i.box}" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="${i.d}"/></svg>`;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // beam knobs → custom properties on the beam button (the mono palette is fixed in button.css)
  const VARS = {
    duration: ['--beam-duration', 's'], arc: ['--beam-arc', ''], head: ['--beam-head', ''], strength: ['--beam-strength', ''],
    width: ['--beam-width', 'px'], bloomBlur: ['--beam-bloom-blur', 'px'], innerFeather: ['--beam-inner-feather', 'px'], brightness: ['--beam-brightness', ''],
  };
  const CSS_DEFAULTS = { duration: 2.4, arc: 14, head: 66, strength: 0.9, width: 1, bloomBlur: 6, innerFeather: 20, brightness: 1.3 };
  const defaults = Object.assign({
    tag: 'a', variant: 'primary', size: 48, rounded: true, label: 'Get started', icon: 'none', iconPos: 'after', status: 'default',
    sheet: false,
    beam: true, trigger: 'always',
  }, CSS_DEFAULTS);
  // the keys that change the markup; a patch with one of them rebuilds the stage, the beam knobs only restyle
  const STRUCT = ['tag', 'variant', 'size', 'rounded', 'label', 'icon', 'iconPos', 'status', 'sheet'];

  /* --- markup --------------------------------------------------------------------------------- */
  // opts: { variant, size, rounded, label, href, tag, icon: none | an ICONS id, iconPos: after | before | only,
  //         status: default | active | disabled, beam }
  //   variant is a VARIANTS id ('primary', 'secondary-invert', …); invert: true is the consumers' shorthand for the -invert look
  const norm = o => {
    const variant = o.invert && CLS[o.variant + '-invert'] ? o.variant + '-invert' : o.variant;
    return Object.assign({ tag: 'a', href: '#', icon: 'none', iconPos: 'after', status: 'default' }, o, { variant });
  };
  const iconOnly = o => o.icon !== 'none' && o.iconPos === 'only';
  const cls = o => ['btn', `btn-${o.size}`, CLS[o.variant] || `btn-${o.variant}`, o.rounded ? 'btn-rounded' : '', iconOnly(o) ? 'btn-square' : '', o.status === 'active' ? 'btn-active' : ''].filter(Boolean).join(' ');
  const wantsBeam = (o, s) => !!s.beam && o.variant === 'primary' && o.beam !== false;

  // the markup the site uses; the beam variant carries the effect's host class and attribute
  const markup = (o, s) => {
    o = norm(o);
    const beam = wantsBeam(o, s);
    const attrs = [
      `class="${cls(o)}${beam ? ' btn-beam beam' : ''}"`,
      o.tag === 'a' ? `href="${esc(o.href)}"` : 'type="button"',
      o.status === 'disabled' ? 'disabled' : '',
      beam ? `data-beam data-trigger="${s.trigger}"` : '',
    ].filter(Boolean).join(' ');
    const icon = o.icon === 'none' ? '' : `<ws-icon>${iconSvg(o.icon, o.size)}</ws-icon>`;
    const text = `<span>${esc(o.label)}</span>`;
    const inner = iconOnly(o) ? icon : o.iconPos === 'before' ? icon + text : text + icon;
    return `<${o.tag} ${attrs}>${inner}</${o.tag}>`;
  };
  const focusOpts = s => ({ tag: s.tag, variant: s.variant, size: s.size, rounded: s.rounded, label: s.label, icon: s.icon, iconPos: s.iconPos, status: s.status });

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
      // a placeholder link never leaves the playground (href="#" would open the catalogue)
      item.el.addEventListener('click', e => { if (item.el.getAttribute('href') === '#') e.preventDefault(); });
      return { el: item.el, update: s => applyTo(item, s), item };
    },
    state: () => state || defaults,
    markup,
  });

  /* --- the stage: the configured button on the canvas, the sheet behind a toggle under it ----- */
  // The buttons sit straight on the canvas; captions inherit the shell's text colour, so they read on either
  // theme. The site's page shows up only where the canvas would lie: the dark surface under the invert looks
  // always, the light one under the light looks when the canvas itself is dark.
  Playground.css(`
    .wsb { display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; padding: 24px 0 8px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wsb__focus { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .wsb__surf { display: inline-flex; padding: 24px 32px; border-radius: 20px; }
    .wsb__surf--dark { background: var(--base-greengrey-990); color: var(--text-base-invert-secondary); }
    :root[data-theme="dark"] .wsb__surf--light { background: var(--bg-surf-10); color: var(--text-base-secondary); }
    .wsb__tag { font: 12px/16px ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .65; text-align: center; overflow-wrap: anywhere; user-select: all; }
    .wsb__more { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 10px; border: 0; border-radius: 8px; background: none; color: inherit; opacity: .6; font-family: inherit; font-size: 12px; line-height: 16px; font-weight: 500; cursor: pointer; }
    .wsb__more:hover { opacity: 1; }
    .wsb__more svg { width: 14px; height: 14px; transition: transform 160ms; }
    .wsb__more.is-open svg { transform: rotate(180deg); }
    .wsb__scroll { width: 100%; overflow-x: auto; }
    .wsb__sheet { display: grid; grid-template-columns: repeat(5, max-content); gap: 16px 20px; align-items: center; width: max-content; margin: 0 auto; padding: 24px 32px 32px; }
    .wsb__head { display: contents; }
    .wsb__head span, .wsb__cap { font: 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .6; }
    .wsb__cap { grid-column: 1 / -1; margin-top: 8px; }
    .wsb__cell { display: flex; align-items: center; width: max-content; border-radius: 50px; }
    .wsb__cell.is-current { outline: 1.5px dashed rgba(127, 127, 127, .7); outline-offset: 6px; }
  `);

  const el = (tag, className) => { const n = document.createElement(tag); n.className = className; return n; };
  const openTag = html => html.slice(0, html.indexOf('>') + 1);
  const CHEVRON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

  function clear() {
    for (const it of items) if (it.inst) { it.inst.destroy(); it.inst = null; }
    items.length = 0;
    focus = null;
    wrap.replaceChildren();
  }
  function build(s, ctx) {
    clear();
    const provider = Playground.component('site-button');
    const add = (host, o) => { const it = provider.create(host, o).item; items.push(it); return it; };
    // the configured button straight on the canvas (an invert look gets the dark surface it is made for), its tag under it
    const box = el('div', 'wsb__focus');
    focus = add(box.appendChild(el('div', `wsb__surf wsb__surf--${isDark(s.variant) ? 'dark' : 'light'}`)), focusOpts(s));
    const tag = el('code', 'wsb__tag');
    tag.textContent = openTag(markup(focusOpts(s), s));
    box.append(tag);
    wrap.append(box);
    // the sheet lives behind a text button, so the stage is one button by default
    const more = el('button', `wsb__more${s.sheet ? ' is-open' : ''}`);
    more.type = 'button';
    more.innerHTML = `<span>${s.sheet ? 'Сховати варіанти' : 'Показати всі варіанти'}</span>${CHEVRON}`;
    more.addEventListener('click', () => ctx.set({ sheet: !ctx.state.sheet }));
    wrap.append(more);
    if (!s.sheet) return;
    // every look × every size with the same modifiers; the light looks on the canvas, the invert ones on dark
    for (const dark of [false, true]) {
      const sheet = el('div', `wsb__sheet wsb__surf wsb__surf--${dark ? 'dark' : 'light'}`);
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
      // wider than the stage, the sheet scrolls from its left edge instead of losing it to centring
      wrap.appendChild(el('div', 'wsb__scroll')).append(sheet);
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
  const hasIcon = s => s.icon !== 'none';

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
      { label: 'Хіро CTA', patch: { tag: 'a', variant: 'primary', size: 48, rounded: true, label: 'Get started', icon: 'none', status: 'default', beam: true } },
      { label: 'Шапка: реєстрація', patch: { tag: 'a', variant: 'primary', size: 36, rounded: true, label: 'Реєстрація', icon: 'none', status: 'default' } },
      { label: 'Дивитись демо', patch: { tag: 'button', variant: 'secondary', size: 48, rounded: false, label: 'Дивитись демо', icon: 'play', iconPos: 'after', status: 'default' } },
      { label: 'Мова', patch: { tag: 'button', variant: 'plain', size: 36, rounded: false, label: 'UA', icon: 'globe', iconPos: 'before', status: 'default' } },
      { label: 'Стрілка каруселі', patch: { tag: 'button', variant: 'secondary', size: 32, rounded: false, icon: 'chevron-right', iconPos: 'only', status: 'default' } },
      { label: 'На темному', patch: { tag: 'a', variant: 'primary-invert', size: 48, rounded: false, label: 'Спробувати Worksection', icon: 'none', status: 'default' } },
      { label: 'Beam на ховер', patch: { variant: 'primary', beam: true, trigger: 'hover' } },
      { label: 'Без beam', patch: { beam: false } },
    ],
    acceptance: [
      { id: 'sheet-shows-every-look-in-every-size', run: ctx => ctx.set({ sheet: true }), expect: ctx => { const n = ctx.frame.querySelectorAll('.wsb__sheet .btn').length; return n === VARIANTS.length * SIZES.length || `${n} buttons in the sheet`; } },
      { id: 'more-button-folds-the-sheet', run: ctx => ctx.frame.querySelector('.wsb__more').click(), expect: ctx => (!ctx.state.sheet && !ctx.frame.querySelector('.wsb__sheet')) || 'the sheet is still there' },
      { id: 'icon-only-is-square-without-a-span', run: ctx => ctx.set({ icon: 'chevron-right', iconPos: 'only' }), expect: () => (focus.el.classList.contains('btn-square') && !focus.el.querySelector('span') && !!focus.el.querySelector('ws-icon svg path')) || 'not square, a span left or no icon' },
      // the beam adds its own bloom child, so only the site's parts are compared
      { id: 'icon-before-the-text', run: ctx => ctx.set({ iconPos: 'before' }), expect: () => { const parts = [...focus.el.children].filter(c => c.matches('ws-icon, span')).map(c => c.tagName); return parts.join(' ') === 'WS-ICON SPAN' || `parts are ${parts.join(' ')}`; } },
      { id: 'typed-label-lands-on-the-button', run: ctx => ctx.set({ icon: 'none', label: 'Свій <текст>' }), expect: () => focus.el.textContent === 'Свій <текст>' || `label is "${focus.el.textContent}"` },
      { id: 'disabled-is-the-attribute', run: ctx => ctx.set({ status: 'disabled' }), expect: () => (focus.el.hasAttribute('disabled') && !focus.el.classList.contains('btn-active')) || 'disabled attribute missing' },
      { id: 'canvas-click-stays-in-the-module', run: ctx => { ctx.set({ status: 'default', tag: 'a' }); focus.el.click(); }, expect: ctx => (Playground.active && Playground.active.id === 'button' && location.hash !== '' && location.hash !== '#') || 'the click left the module' },
      { id: 'sheet-click-picks-the-look', run: ctx => { ctx.set({ sheet: true }); items.find(it => it.pick && it.pick.variant === 'tertiary-invert' && it.pick.size === 32).el.click(); }, expect: ctx => (ctx.state.variant === 'tertiary-invert' && ctx.state.size === 32 && !!focus.el.closest('.wsb__surf--dark')) || 'the click did not pick, or the surface is not dark' },
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
        { type: 'text', key: 'label', label: 'Текст', placeholder: 'Текст кнопки', maxlength: 60, when: s => !(hasIcon(s) && s.iconPos === 'only') },
        { type: 'check', key: 'rounded', label: 'btn-rounded — пігулка' },
        { type: 'seg', key: 'status', label: 'Стан', options: [['default', 'Звичайний'], ['active', 'btn-active'], ['disabled', 'disabled']] },
        { type: 'note', text: 'Рівно те, що є в buttons.css сайту. Ховер і натискання живі.' },
      ] },
      { title: 'Іконка', items: [
        { type: 'select', key: 'icon', label: 'Іконка', options: [['none', 'Немає']].concat(Object.entries(ICONS).map(([id, i]) => [id, i.label])) },
        { type: 'seg', key: 'iconPos', label: 'Де', options: [['after', 'Після тексту'], ['before', 'Перед'], ['only', 'Лише іконка']], when: hasIcon },
        { type: 'note', text: 'Іконки з кнопок сайту: svg у боксі ws-icon, 16 px у btn-32/36, 20 px у більших. «Лише іконка» = btn-square (у btn-56 його нема, кнопка не квадратна).' },
      ] },
      { title: 'Аркуш', items: [
        { type: 'check', key: 'sheet', label: 'Усі варіанти × розміри під кнопкою', proof: ctx => !!ctx.frame.querySelector('.wsb__sheet') },
        { type: 'note', text: 'Те саме, що кнопка «Показати всі варіанти» на сцені. Клік по кнопці в аркуші робить її поточною; пігулка, іконка, стан і текст застосовуються до всього аркуша.' },
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
      // a click on a sheet button makes it the configured one
      wrap.addEventListener('click', e => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        const it = items.find(i => i.el === btn);
        if (it && it.pick) ctx.set(it.pick);
      });
      ctx.instance = items;
    },
    apply(ctx, patch) {
      state = ctx.state;
      if (STRUCT.some(k => k in patch)) build(ctx.state, ctx);
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
