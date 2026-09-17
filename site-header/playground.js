/* Playground definition for the site header.
   Not part of the module: a site needs only header.css + header.js.
   The markup is built here (the site has its own menu), and the frame gets a
   stand-in page under the bar so the compaction on scroll has something to
   scroll. Everything else is what the shell asks for. */
(function () {
  'use strict';

  const ICONS = {
    logo: '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 0C8.9725 0 0 8.9725 0 20C0 31.0275 8.9725 40 20 40C31.0275 40 40 31.0275 40 20C40 8.9725 31.0275 0 20 0ZM32.5 12.5C32.5 14.4825 31.5108 16.2375 30 17.2917C28.9983 17.965 28.3333 19.1192 28.3333 20.4167V24.995V25C28.3333 27.7617 26.095 30 23.3333 30C22.0508 30 20.885 29.5133 20 28.7192C19.115 29.5125 17.9492 30 16.6667 30C13.905 30 11.6667 27.7617 11.6667 25V24.995V18.3333C11.6667 17.4133 12.4133 16.6667 13.3333 16.6667C14.2533 16.6667 15 17.4133 15 18.3333V24.995C15 25.915 15.7475 26.6617 16.6667 26.6617C17.5858 26.6617 18.3333 25.915 18.3333 24.995V21.6617C18.3333 20.7417 19.08 19.995 20 19.995C20.92 19.995 21.6667 20.7417 21.6667 21.6617V24.995C21.6667 25.915 22.4142 26.6617 23.3333 26.6617C24.2525 26.6617 25 25.915 25 24.995V15.8333C25 12.6117 27.6117 10 30.8333 10H31.25C31.94 10 32.5 10.56 32.5 11.25V12.5Z" fill="currentColor"/></svg>',
    down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7.83 10.32 4.85 6.74c-.11-.14-.01-.34.17-.34h5.97c.18 0 .28.2.17.34l-2.99 3.58a.21.21 0 0 1-.33 0Z"/></svg>',
    globe: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.55 2.13a6.5 6.5 0 1 1-5.1 11.74 6.5 6.5 0 0 1 5.1-11.74ZM7 13.31a5.5 5.5 0 0 0 5.73-2.71l-2.37-1.03C9.34 11.68 8.02 12.76 7 13.31Zm-2.2-.96c-.29-1.12-.4-2.82.44-5l-2.37-1.03a5.5 5.5 0 0 0 1.93 6.03Zm1.76-5.52c.84-1.71 1.87-2.63 2.67-3.12.3-.19.58-.32.81-.4.09.22.18.51.26.86.19.92.22 2.3-.46 4.08L6.56 6.83Zm-.4.92c-.68 1.78-.65 3.16-.46 4.08.07.35.17.64.26.87.23-.09.5-.22.81-.4.8-.49 1.83-1.41 2.67-3.12L6.16 7.75Zm-.52-1.32L3.27 5.4A5.5 5.5 0 0 1 9 2.69c-1.01.55-2.33 1.63-3.36 3.74Zm5.12 2.22 2.37 1.03a5.5 5.5 0 0 0-1.93-6.03c.29 1.12.4 2.82-.44 5Z"/></svg>',
    burger: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.2 4.4a.5.5 0 0 1 .5-.5h8.6a.5.5 0 0 1 0 1H3.7a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h8.6a.5.5 0 0 1 0 1H3.7a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h4.6a.5.5 0 0 1 0 1H3.7a.5.5 0 0 1-.5-.5Z"/></svg>',
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.98 3.98a.6.6 0 0 1 .85 0L8 7.15l3.18-3.18a.6.6 0 1 1 .85.85L8.85 8l3.18 3.18a.6.6 0 1 1-.85.85L8 8.85l-3.18 3.18a.6.6 0 1 1-.85-.85L7.15 8 3.98 4.82a.6.6 0 0 1 0-.85Z"/></svg>',
  };

  // the menu as the site has it; a real site fills this from its own routing
  const MENU = [
    { label: 'Продукт', links: [['Задачі', '#'], ['Діаграма Ганта', '#'], ['Канбан', '#'], ['Облік часу', '#'], ['Звіти', '#'], ['Інтеграції', '#']] },
    { label: 'Рішення', links: [['Для агенцій', '#'], ['Для IT-команд', '#'], ['Для будівництва', '#'], ['Для виробництва', '#']] },
    { label: 'Допомога', links: [['База знань', '#'], ['Відеоуроки', '#'], ['Блог', '#'], ['Підтримка', '#']] },
    { label: 'Ціни', href: '#' },
  ];

  // playground-only knobs → custom properties on .site-header
  const VARS = { width: ['--sh-width', 'px'], compactWidth: ['--sh-width-compact', 'px'], radius: ['--sh-radius', 'px'], blur: ['--sh-blur', 'px'], top: ['--sh-top', 'px'] };
  const CSS_DEFAULTS = { width: 1360, compactWidth: 1024, radius: 48, blur: 6, top: 12, alpha: 80 };
  const defaults = Object.assign({}, SiteHeader.defaults, CSS_DEFAULTS);

  const item = m => m.links
    ? `<div class="site-header__group">
            <button type="button" class="site-header__item" aria-expanded="false"><span>${m.label}</span>${ICONS.down}</button>
            <div class="site-header__panel">
              ${m.links.map(([t, h]) => `<a class="site-header__link" href="${h}">${t}</a>`).join('\n              ')}
            </div>
          </div>`
    : `<a class="site-header__item" href="${m.href}"><span>${m.label}</span></a>`;

  const markup = () => `<header class="site-header" id="header">
  <div class="site-header__bar">
    <div class="site-header__left">
      <a class="site-header__brand" href="/" aria-label="Worksection">${ICONS.logo}<span>worksection</span></a>
      <nav class="site-header__menu" aria-label="Головне меню">
        ${MENU.map(item).join('\n        ')}
      </nav>
    </div>
    <div class="site-header__actions">
      <button type="button" class="site-header__btn site-header__btn--plain site-header__lang" aria-label="Мова: українська">${ICONS.globe}<span>UA</span>${ICONS.down}</button>
      <a class="site-header__btn site-header__btn--plain" href="#"><span>Увійти</span></a>
      <a class="site-header__btn site-header__btn--accent" href="#"><span>Забронювати демо</span></a>
      <a class="site-header__btn site-header__btn--primary" href="#"><span>Реєстрація</span></a>
      <button type="button" class="site-header__burger" aria-expanded="false" aria-label="Меню">${ICONS.burger}${ICONS.close}</button>
    </div>
  </div>
</header>`;

  const snippet = s => {
    const vars = Object.entries(VARS).filter(([k]) => s[k] !== CSS_DEFAULTS[k]).map(([k, [p, u]]) => `  ${p}: ${s[k]}${u};`);
    if (s.alpha !== CSS_DEFAULTS.alpha) vars.push(`  --sh-surface: rgba(255, 255, 255, ${(s.alpha / 100).toFixed(2)});`);
    return `<link rel="stylesheet" href="header.css">

<!-- шапка йде першою в <body>, одразу над хіро; sticky, тож вона тримається зверху сама.
     Меню написане один раз: мобільний лист header.js збирає з нього -->
${markup()}

<script src="header.js"><\/script>
<script>
  new SiteHeader('#header', {
    sticky: ${s.sticky},
    compact: ${s.compact},
    compactAfter: ${s.compactAfter},
    trigger: '${s.trigger}',
    hoverDelay: ${s.hoverDelay},
    closeDelay: ${s.closeDelay},
  });
<\/script>${vars.length ? `

<style>
.site-header {
${vars.join('\n')}
}
</style>` : ''}`;
  };

  Playground.css(`
    /* a window of its own: the bar sticks to this scroller, not to the stage, exactly as it will to the site's window */
    .sh-browser { position: relative; width: 100%; flex: 1 1 auto; min-height: 320px; border-radius: 12px; overflow: hidden; background: #eaebeb; box-shadow: 0 0 0 1px #e4e4e4, 0 16px 40px -16px rgba(0,0,0,.18); }
    .sh-browser__scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; }
    .sh-page { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: rgba(0,0,0,.93); container-type: inline-size; }
    .sh-page__hero { padding: 24px 24px 0; text-align: center; }
    .sh-page__title { margin: 12px auto 0; max-width: 14ch; font-family: "Fixel Display", "Fixel Variable", inherit; font-size: clamp(32px, 6cqw, 64px); font-weight: 500; line-height: 1.05; letter-spacing: -.02em; }
    .sh-page__lead { margin: 20px auto 0; max-width: 52ch; font-size: clamp(14px, 1.3cqw, 16px); line-height: 1.5; color: rgba(0,0,0,.66); }
    .sh-page__cta { display: flex; justify-content: center; gap: 8px; margin-top: 28px; }
    .sh-page__cta span { display: inline-flex; align-items: center; height: 40px; padding: 0 20px; border-radius: 40px; font-size: 14px; font-weight: 600; background: #1e201f; color: #fff; }
    .sh-page__cta span + span { background: rgba(22,34,34,.09); color: rgba(0,0,0,.93); }
    .sh-page__stage { height: 62cqw; max-height: 720px; margin: 40px 24px 0; border-radius: 16px 16px 0 0; background: #fff; box-shadow: 0 0 0 1px rgba(13,28,20,.14), 0 24px 48px -24px rgba(0,0,0,.25); }
    .sh-page__block { height: 320px; margin: 24px; border-radius: 16px; background: rgba(255,255,255,.6); }
  `);

  const page = () => `<div class="sh-browser"><div class="sh-browser__scroll"><div class="sh-page">
    ${markup()}
    <div class="sh-page__hero">
      <h1 class="sh-page__title">Project management built for teams, not just tasks</h1>
      <p class="sh-page__lead">Тут стоятиме S : Hero. Ця сторінка лише для скролу: пігулка над нею стискається, меню відкриваються, на вузькому фреймі бургер відкриває лист.</p>
      <div class="sh-page__cta"><span>Get started</span><span>Contact sales</span></div>
      <div class="sh-page__stage"></div>
    </div>
    <div class="sh-page__block"></div>
    <div class="sh-page__block"></div>
  </div></div></div>`;

  // The real S : Hero under the bar, as on the site. It comes from the hero's own demo page
  // over HTTP (the adapters never see each other); the stand-in above stays if that fails
  async function placeHero(holder) {
    if (!window.Hero) return;
    const html = await fetch('hero-section/demo.html').then(r => r.ok ? r.text() : '');
    const m = html.match(/<section class="hero"[\s\S]*?<\/section>/);
    if (!m) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = m[0].replace(/(^|[\s"',])img\//g, '$1hero-section/img/');
    const hero = tpl.content.firstElementChild;
    hero.removeAttribute('id');
    holder.replaceWith(hero);
    new Hero(hero);
  }

  let root = null, bar = null, scroller = null;
  const layout = () => root.clientWidth >= 1240 ? 'широка' : root.clientWidth >= 620 ? 'планшет' : 'телефон';

  Playground.register({
    id: 'header',
    title: 'Header: шапка сайту',
    tab: 'S : Header',
    summary: 'Шапка worksection.com: липка пігулка з меню і CTA, стискається на скролі, на вузькому лягає в бургер і лист.',
    dir: 'site-header',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'header.css', file: 'site-header/header.css' },
      { id: 'js', label: 'header.js', file: 'site-header/header.js' },
    ],
    defaults,
    presets: [{ label: 'worksection.com', patch: Object.assign({}, defaults) }],
    stage: { className: 'stage--fill' },
    controls: [
      { title: 'Пігулка', items: [
        { type: 'range', key: 'width', label: 'Ширина у спокої', min: 800, max: 1600, step: 20, unit: 'px' },
        { type: 'range', key: 'compactWidth', label: 'Ширина після скролу', min: 600, max: 1400, step: 20, unit: 'px', when: s => s.compact && s.sticky },
        { type: 'range', key: 'radius', label: 'Радіус', min: 0, max: 48, step: 2, unit: 'px' },
        { type: 'range', key: 'alpha', label: 'Непрозорість фону', min: 40, max: 100, step: 5, unit: ' %' },
        { type: 'range', key: 'blur', label: 'Розмиття під пігулкою', min: 0, max: 24, step: 1, unit: 'px' },
        { type: 'range', key: 'top', label: 'Відступ зверху', min: 0, max: 32, step: 2, unit: 'px' },
        { type: 'status', render: () => `Ширина: <b>${root.clientWidth}px</b> · розкладка: <b>${layout()}</b> · пігулка: <b>${root.classList.contains('site-header--compact') ? 'стиснута' : 'у спокої'}</b>` },
      ] },
      { title: 'Поведінка', items: [
        { type: 'check', key: 'sticky', label: 'Липка (sticky)' },
        { type: 'check', key: 'compact', label: 'Стискається після скролу', when: s => s.sticky },
        { type: 'range', key: 'compactAfter', label: 'Стискати після', min: 0, max: 200, step: 4, unit: 'px', when: s => s.sticky && s.compact },
        { type: 'seg', key: 'trigger', label: 'Меню відкриває', options: [['hover', 'Наведення'], ['click', 'Клік']] },
        { type: 'range', key: 'hoverDelay', label: 'Затримка відкриття', min: 0, max: 400, step: 20, unit: 'ms', when: s => s.trigger === 'hover' },
        { type: 'range', key: 'closeDelay', label: 'Затримка закриття', min: 0, max: 600, step: 20, unit: 'ms', when: s => s.trigger === 'hover' },
        { type: 'buttons', items: [
          { label: 'Нагору', run: () => scroller.scrollTo({ top: 0, behavior: 'smooth' }) },
          { label: 'Прокрутити вниз', primary: true, run: () => scroller.scrollTo({ top: 400, behavior: 'smooth' }) },
          { label: 'Меню', run: () => bar.toggle() },
        ] },
        { type: 'note', text: 'Стиснення без слухача скролу: перед шапкою стоїть сентинел на 1 px, IntersectionObserver дивиться, чи він ще у в’юпорті. Тому працює і на сайті, де скролиться window, і тут, де скролиться це вікно. Ширина шапки читається з контейнера, тож пресети фрейму (390 / 320) показують мобільну розкладку.' },
      ] },
    ],

    mount(ctx) {
      ctx.frame.insertAdjacentHTML('beforeend', page());
      root = ctx.frame.querySelector('.site-header');
      scroller = ctx.frame.querySelector('.sh-browser__scroll');
      scroller.addEventListener('scroll', () => requestAnimationFrame(ctx.refresh), { passive: true });
      bar = new SiteHeader(root);
      ctx.instance = bar;
      placeHero(ctx.frame.querySelector('.sh-page__hero'));
      root.addEventListener('header:compact', () => requestAnimationFrame(ctx.refresh));
      root.addEventListener('header:open', () => requestAnimationFrame(ctx.refresh));
      root.addEventListener('header:close', () => requestAnimationFrame(ctx.refresh));
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(root);
    },
    apply(ctx, patch) {
      const s = ctx.state;
      const opt = {};
      for (const k of Object.keys(SiteHeader.defaults)) if (k in patch) opt[k] = s[k];
      if (Object.keys(opt).length) bar.setOptions(opt);
      for (const [k, [prop, unit]] of Object.entries(VARS)) root.style.setProperty(prop, s[k] + unit);
      root.style.setProperty('--sh-surface', `rgba(255, 255, 255, ${(s.alpha / 100).toFixed(2)})`);
    },
    onHide() { if (bar) bar.close(); },
    hint() {
      if (bar.isOpen) return 'Мобільне меню відкрите: Escape або хрестик закриває';
      if (root.clientWidth < 1240) return `Розкладка «${layout()}»: меню в бургері, у пігулці лишились бренд і реєстрація`;
      return root.classList.contains('site-header--compact') ? 'Пігулка стиснута до ширини після скролу' : 'Прокрути сторінку: пігулка стиснеться. Наведи на «Продукт», щоб відкрити меню';
    },
  });
})();
