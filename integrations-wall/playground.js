/* Playground definition for the Integrations wall.
   Not part of the module: a site needs only wall.css + wall.js and its own
   tiles. The card around the wall (heading, arrow) is a stand-in for the
   promo block the wall sits in, like the one on ramp.com. */
(function () {
  'use strict';

  // tools Worksection connects to; the demo pulls brand marks from Simple Icons (CC0), a few from Devicon (MIT) where Simple Icons has none
  const DEVICON = n => `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${n}/${n}-original.svg`;
  const LOGOS = [
    ['slack', 'Slack', DEVICON('slack')], ['telegram', 'Telegram'], ['gmail', 'Gmail'], ['googlecalendar', 'Google Calendar'], ['googledrive', 'Google Drive'],
    ['zapier', 'Zapier'], ['jira', 'Jira'], ['trello', 'Trello'], ['github', 'GitHub'], ['gitlab', 'GitLab'],
    ['figma', 'Figma'], ['viber', 'Viber'], ['hubspot', 'HubSpot'], ['notion', 'Notion'], ['asana', 'Asana'],
    ['zoom', 'Zoom'], ['dropbox', 'Dropbox'], ['bitbucket', 'Bitbucket'], ['intercom', 'Intercom'], ['mailchimp', 'Mailchimp'],
    ['stripe', 'Stripe'], ['shopify', 'Shopify'], ['wordpress', 'WordPress'], ['discord', 'Discord'], ['whatsapp', 'WhatsApp'],
    ['miro', 'Miro'], ['airtable', 'Airtable'], ['todoist', 'Todoist'], ['confluence', 'Confluence'], ['loom', 'Loom'],
    ['zendesk', 'Zendesk'], ['salesforce', 'Salesforce', DEVICON('salesforce')], ['xero', 'Xero'], ['evernote', 'Evernote'], ['google', 'Google'],
    ['linear', 'Linear'], ['clickup', 'ClickUp'], ['jetbrains', 'JetBrains'], ['calendly', 'Calendly'], ['webflow', 'Webflow'],
  ];
  const src = ([slug, , url]) => url || `https://cdn.simpleicons.org/${slug}`;
  const tile = l => `<figure class="iwall__tile"><img src="${src(l)}" alt="${l[1]}" title="${l[1]}" loading="lazy"></figure>`;

  const KEYS = Object.keys(IntegrationsWall.defaults).filter(k => !['respectReducedMotion', 'paused'].includes(k));
  const defaults = Object.assign(Object.fromEntries(KEYS.map(k => [k, IntegrationsWall.defaults[k]])), { surface: '#ffffff', card: '#f4f2f0' });

  Playground.css(`
    .iw-card { position: relative; width: min(100%, 460px); margin: 0 auto; aspect-ratio: 421 / 526; overflow: hidden; border-radius: 12px; border: 1px solid rgba(0,0,0,.08); background: var(--iw-card, #f4f2f0); font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .iw-card__head { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 28px 24px 0 28px; pointer-events: none; }
    .iw-card__head h3 { margin: 0; max-width: 300px; font-size: 22px; line-height: 26px; font-weight: 500; letter-spacing: -.01em; color: #1e201f; }
    .iw-card__head h3 span { color: rgba(30, 32, 31, .5); }
    .iw-card__arrow { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; background: #fff; border: 1px solid rgba(0,0,0,.08); color: #1e201f; }
    .iw-card__arrow svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    .iw-card .iwall { position: absolute; inset: 0; }
    @container (max-width: 480px) { .iw-card__head h3 { font-size: 19px; line-height: 23px; } }
  `);

  let wall = null, root = null;
  let rateScale = 1;

  const snippet = s => {
    const opts = KEYS.filter(k => s[k] !== IntegrationsWall.defaults[k]).map(k => `  ${k}: ${JSON.stringify(s[k])},`);
    const vars = [];
    if (s.surface !== defaults.surface) vars.push(`--iw-surface: ${s.surface};`);
    return `<link rel="stylesheet" href="wall.css">
${vars.length ? `<style>\n  .iwall { ${vars.join(' ')} }\n</style>\n` : ''}
<!-- будь-яка кількість плиток: скрипт клонує їх по колу, щоб заповнити ${s.columns} × ${s.rows} клітинок -->
<div class="iwall" id="wall">
  <div class="iwall__sheet">
${LOGOS.slice(0, 6).map(l => '    ' + tile(l).replace(src(l), `logos/${l[0]}.svg`).replace(' loading="lazy"', '')).join('\n')}
    …
  </div>
</div>

<script src="wall.js"><\/script>
<script>
  const wall = IntegrationsWall.create(document.getElementById('wall')${opts.length ? `, {\n${opts.join('\n')}\n  }` : ''});
  // далі: wall.setOptions({ pan: 0.5 }); wall.pause(); wall.resume(); wall.destroy();
<\/script>`;
  };

  const masked = s => s.mask;

  Playground.register({
    id: 'integrations',
    title: 'Integrations wall',
    summary: 'Стіна логотипів інтеграцій: зміщена сітка плиток, що озирається за курсором, дрейфує сама й тане до країв.',
    dir: 'integrations-wall',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'wall.css', file: 'integrations-wall/wall.css' },
      { id: 'js', label: 'wall.js', file: 'integrations-wall/wall.js' },
    ],
    defaults,
    presets: [
      { label: 'Ramp', patch: Object.assign({}, defaults) },
      { label: 'Щільніше', patch: { columns: 10, rows: 12, tile: 48, gap: 14, radius: 10, logo: 22, pan: 0.5 } },
      { label: 'Спокійно', patch: { pan: 0.15, ease: 0.04, drift: 8, driftPeriod: 24, hoverScale: 1.04 } },
      { label: 'Рівна сітка', patch: { stagger: 0, maskRx: 70, maskRy: 62 } },
      { label: 'Без маски', patch: { mask: false, pan: 0.25 } },
    ],
    random() {
      const r = (a, b, d = 0) => +(a + Math.random() * (b - a)).toFixed(d);
      return { columns: r(5, 11), rows: r(7, 13), tile: r(40, 80), gap: r(8, 36), stagger: Math.random() < 0.3 ? 0 : r(0.2, 0.5, 2), pan: r(-0.6, 0.8, 2), drift: r(0, 40), driftPeriod: r(6, 24) };
    },
    stage: { bg: '#e9e9e7' },
    controls: [
      { title: 'Сітка', items: [
        { type: 'range', key: 'columns', label: 'Колонок', min: 3, max: 14, step: 1 },
        { type: 'range', key: 'rows', label: 'Рядків', min: 3, max: 16, step: 1 },
        { type: 'range', key: 'tile', label: 'Плитка', min: 32, max: 96, step: 2, unit: 'px' },
        { type: 'range', key: 'gap', label: 'Відступ', min: 0, max: 48, step: 1, unit: 'px' },
        { type: 'range', key: 'stagger', label: 'Зсув непарних рядків', min: 0, max: 1, step: 0.05, fmt: v => Math.round(v * 100) + ' %' },
        { type: 'range', key: 'radius', label: 'Радіус плитки', min: 0, max: 48, step: 1, unit: 'px' },
        { type: 'range', key: 'logo', label: 'Логотип', min: 12, max: 64, step: 1, unit: 'px' },
        { type: 'status', render: () => wall ? `Клітинок: <b>${wall.n}</b> · логотипів: <b>${LOGOS.length}</b> · аркуш <b>${wall.sheet.offsetWidth}×${wall.sheet.offsetHeight}</b> px` : '' },
      ] },
      { title: 'Рух', items: [
        { type: 'range', key: 'pan', label: 'Озирання за курсором', min: -1, max: 1, step: 0.05, fmt: v => v.toFixed(2) },
        { type: 'range', key: 'ease', label: 'Плавність', min: 0.02, max: 0.3, step: 0.01, fmt: v => v.toFixed(2) },
        { type: 'range', key: 'drift', label: 'Дрейф у спокої', min: 0, max: 60, step: 1, unit: 'px' },
        { type: 'range', key: 'driftPeriod', label: 'Період дрейфу', min: 4, max: 40, step: 1, unit: 's', when: s => s.drift > 0 },
        { type: 'range', key: 'hoverScale', label: 'Плитка під курсором', min: 1, max: 1.3, step: 0.01, fmt: v => '×' + v.toFixed(2) },
        { type: 'note', text: 'Від’ємне «озирання» рухає аркуш разом з курсором, додатне — назустріч, як вікно в більший простір.' },
      ] },
      { title: 'Маска', items: [
        { type: 'check', key: 'mask', label: 'Танення до країв' },
        { type: 'range', key: 'maskRx', label: 'Радіус по X', min: 20, max: 120, step: 1, unit: '%', when: masked },
        { type: 'range', key: 'maskRy', label: 'Радіус по Y', min: 20, max: 120, step: 1, unit: '%', when: masked },
        { type: 'range', key: 'maskX', label: 'Центр по X', min: 0, max: 100, step: 1, unit: '%', when: masked },
        { type: 'range', key: 'maskY', label: 'Центр по Y', min: 0, max: 100, step: 1, unit: '%', when: masked },
        { type: 'range', key: 'maskSolid', label: 'Чітка зона', min: 0, max: 95, step: 1, unit: '%', when: masked },
      ] },
      { title: 'Вигляд', items: [
        { type: 'color', key: 'surface', label: 'Плитка' },
        { type: 'color', key: 'card', label: 'Картка', proof: ctx => ctx.frame.querySelector('.iw-card').style.getPropertyValue('--iw-card') },
      ] },
    ],

    acceptance: [
      { id: 'pointer-pans-the-sheet', run: ctx => {
          const r = root.getBoundingClientRect();
          root.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + r.width * 0.9, clientY: r.top + r.height * 0.5 }));
        }, wait: 400, expect: () => (wall.px > 0 && wall.x < -5) || `x=${wall.x.toFixed(1)} px=${wall.px}` },
      { id: 'leave-returns-to-idle', run: () => root.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true })), wait: 60, expect: () => wall.px === null || 'pointer still tracked' },
      { id: 'columns-rebuild-cells', run: ctx => ctx.set({ columns: 4, rows: 5 }), expect: () => (wall.n === 20 && wall.sheet.querySelectorAll('.iwall__tile:not([hidden])').length === 20) || `n=${wall.n}` },
      { id: 'mask-reaches-css', run: ctx => ctx.set({ mask: true, maskRx: 33 }), expect: () => getComputedStyle(root).getPropertyValue('--iw-rx').trim() === '33%' || 'no --iw-rx' },
      { id: 'loop-stops-when-hidden', run: () => Playground.show('integrations'), wait: 60, expect: () => !!wall.raf || 'not running while shown' },
    ],

    mount(ctx) {
      ctx.frame.insertAdjacentHTML('beforeend', `<div class="iw-card"><div class="iw-card__head">
        <h3>200+ інтеграцій <span>з інструментами, якими ви вже користуєтесь</span></h3>
        <span class="iw-card__arrow"><svg viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"/></svg></span>
      </div><div class="iwall"><div class="iwall__sheet">${LOGOS.map(tile).join('')}</div></div></div>`);
      root = ctx.frame.querySelector('.iwall');
      wall = IntegrationsWall.create(root, Object.assign({}, IntegrationsWall.defaults, defaults, { respectReducedMotion: false }));
      wall.stop(); // onShow starts the loop once the tab is on screen
      const step = wall.step.bind(wall);
      wall.step = dt => step(dt * rateScale);
      ctx.instance = wall;
    },
    apply(ctx, patch) {
      const opts = {};
      for (const k of KEYS) if (k in patch) opts[k] = patch[k];
      wall.setOptions(opts);
      root.style.setProperty('--iw-surface', ctx.state.surface);
      root.parentNode.style.setProperty('--iw-card', ctx.state.card);
    },
    hint(ctx) {
      return ctx.paused ? 'Пауза: аркуш стоїть, плитки під курсором ще піднімаються'
        : ctx.state.pan ? 'Веди курсором по картці, аркуш озирається за ним' : 'Аркуш лише дрейфує; додай «озирання», щоб він реагував на курсор';
    },
    playback: {
      pause: () => wall.pause(),
      resume: () => wall.resume(),
      rate: (ctx, r) => { rateScale = r; },
    },
    onShow() { if (!wall.o.paused) wall.play(); },
    onHide() { wall.stop(); },
  });
})();
