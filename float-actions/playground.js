/* Playground definition for Float actions.
   Not part of the module: a site needs only float-actions.css + float-actions.js.
   The fake browser, the skeleton site and the stand-in widget live here,
   because on the playground the buttons must sit inside a frame, not on body.
   Everything else is what the playground shell (playground/shell.js) asks
   for: the state, the controls, the presets and the generated snippet. */
(function () {
  'use strict';

  // the module only sees keys; the site's i18n resolves them (here: two dictionaries)
  const I18N = {
    en: FloatActions.defaults.t,
    uk: {
      'fa.support.label': 'Написати в чат',
      'fa.ringostat.label': 'Замовити дзвінок',
      'fa.nudge.message': 'Привіт! Допомогти обрати тариф?',
      'fa.dismiss': 'Закрити',
    },
  };

  const PRESETS = [
    { label: 'Default', patch: { fold: true, foldAfter: 32, peek: 6, unfoldDelay: 0, nudge: true, nudgeAfter: 8000, labels: true, labelDelay: 80, hoverScale: 1.05, showAfter: 0, enterDelay: 600, easing: 'cubic-bezier(.22, 1, .36, 1)', avoidMode: 'lift', actions: FloatActions.defaults.actions } },
    { label: 'Quiet',   patch: { fold: false, nudge: false, labels: true, labelDelay: 200, hoverScale: 1.05, showAfter: 400, enterDelay: 0, easing: 'cubic-bezier(.22, 1, .36, 1)', avoidMode: 'hide', actions: FloatActions.defaults.actions } },
    { label: 'Lively',  patch: { fold: true, foldAfter: 16, peek: 8, unfoldDelay: 0, nudge: true, nudgeAfter: 3000, labels: true, labelDelay: 0, hoverScale: 1.1, showAfter: 0, enterDelay: 300, easing: 'cubic-bezier(.34, 1.56, .64, 1)', avoidMode: 'lift', actions: FloatActions.defaults.actions } },
    { label: 'Single',  patch: { fold: false, nudge: true, nudgeAfter: 6000, labels: true, labelDelay: 80, hoverScale: 1.05, showAfter: 0, enterDelay: 600, easing: 'cubic-bezier(.22, 1, .36, 1)', avoidMode: 'lift', actions: [FloatActions.defaults.actions[0]] } },
  ];

  // module options that are plain values (functions, the scroller and the dictionary are wired at mount)
  const MODULE_KEYS = Object.keys(FloatActions.defaults).filter(k => !['t', 'onAction', 'onClose', 'fixed', 'scroller'].includes(k));
  const defaults = Object.assign(
    JSON.parse(JSON.stringify(Object.fromEntries(MODULE_KEYS.map(k => [k, FloatActions.defaults[k]])))),
    PRESETS[0].patch,
    { lang: 'en', widgetDelay: 700 }   // playground-only: dictionary and the simulated widget load time
  );

  Playground.css(`
    .browser {
      position: relative; display: flex; flex-direction: column; width: 100%; flex: 1 1 auto; min-height: 240px;
      border-radius: 12px; background: #fff; overflow: hidden;
      box-shadow: 0 0 0 1px #e4e4e4, 0 16px 40px -16px rgba(0,0,0,.18);
    }
    .browser__bar { flex: none; display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; background: #f4f5f5; border-bottom: 1px solid #e4e4e4; }
    .browser__dot { width: 10px; height: 10px; border-radius: 50%; background: #dddfde; }
    .browser__url { flex: 1; height: 20px; margin-left: 8px; border-radius: 6px; background: #fff; box-shadow: 0 0 0 1px #e4e4e4; }
    .browser__view { position: relative; flex: 1; min-height: 0; }
    .browser__scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; }
    .browser__overlay { position: absolute; inset: 0; pointer-events: none; }

    /* stand-in for a third-party widget loaded on click */
    .fake-widget {
      position: absolute; right: 24px; bottom: calc(24px + 56px + 12px); width: 360px; max-width: calc(100% - 48px); height: min(460px, calc(100% - 140px));
      border-radius: 20px; background: #fff; overflow: hidden; pointer-events: auto;
      box-shadow: 0 0 0 1px rgba(13,28,20,.08), 0 8px 16px -6px rgba(12,24,48,.16), 0 24px 48px -12px rgba(12,24,48,.28);
      opacity: 0; transform: translateY(12px) scale(.94); transform-origin: bottom right; visibility: hidden;
      transition: opacity 160ms cubic-bezier(.65,0,.35,1), transform 200ms cubic-bezier(.65,0,.35,1), visibility 0s linear 200ms;
    }
    .fake-widget.is-on { opacity: 1; transform: none; visibility: visible; transition: opacity 180ms cubic-bezier(.65,0,.35,1), transform 320ms cubic-bezier(.22,1,.36,1), visibility 0s; }
    .fake-widget.is-compact { inset: 0; width: auto; max-width: none; height: auto; border-radius: 0; transform-origin: bottom center; }
    .fake-widget__head { position: relative; height: 72px; background: var(--fw, #4a83f4); }
    .fake-widget__x { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; background: rgba(255,255,255,.22); color: #fff; font: 18px/32px sans-serif; cursor: pointer; }
    .fake-widget__body { display: flex; flex-direction: column; gap: 10px; padding: 20px; }
    .fake-widget__body i { display: block; height: 10px; border-radius: 5px; background: #eaebeb; }
    .fake-widget__body i:nth-child(2) { width: 78%; } .fake-widget__body i:nth-child(3) { width: 52%; }
    .fake-widget__body i.box { height: 44px; border-radius: 12px; margin-top: 12px; background: #f4f5f5; box-shadow: inset 0 0 0 1px #dddfde; }

    /* skeleton site: rectangles only, the footer is what the buttons avoid */
    .sk { --sk: #eaebeb; --sk-2: #dddfde; --sk-ink: #2d2f2e; container-type: inline-size; }
    .sk__wrap { max-width: 1024px; margin: 0 auto; padding: 0 24px; }
    .sk i, .sk b { display: block; border-radius: 6px; background: var(--sk); }
    .sk b { background: var(--sk-2); }
    .sk__nav { position: sticky; top: 0; z-index: 2; height: 64px; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); border-bottom: 1px solid #eef0ef; }
    .sk__nav .sk__wrap { display: flex; align-items: center; gap: 24px; height: 100%; }
    .sk__logo { width: 112px; height: 24px; border-radius: 6px; background: var(--sk-ink) !important; }
    .sk__menu { display: flex; gap: 20px; margin-left: 16px; }
    .sk__menu i { width: 52px; height: 10px; border-radius: 5px; }
    .sk__navcta { margin-left: auto; width: 104px; height: 36px; border-radius: 10px; background: var(--sk-ink) !important; }
    .sk__hero { padding: 96px 0 64px; text-align: center; }
    .sk__hero .sk__wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .sk__eyebrow { width: 128px; height: 12px; border-radius: 6px; }
    .sk__h1 { width: 64%; max-width: 620px; height: 40px; border-radius: 10px; }
    .sk__h1 + .sk__h1 { width: 44%; }
    .sk__sub { width: 48%; max-width: 460px; height: 12px; border-radius: 6px; margin-top: 8px; }
    .sk__sub + .sk__sub { width: 36%; margin-top: 0; }
    .sk__btns { display: flex; gap: 12px; margin-top: 18px; }
    .sk__btns i { width: 148px; height: 48px; border-radius: 12px; }
    .sk__btns i:first-child { background: var(--sk-ink); }
    .sk__shot { width: 100%; aspect-ratio: 16 / 9; margin-top: 40px; border-radius: 20px; background: var(--sk-2); box-shadow: inset 0 0 0 1px rgba(0,0,0,.04); }
    .sk__logos { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; padding: 32px 0 80px; }
    .sk__logos i { width: 96px; height: 24px; border-radius: 5px; opacity: .8; }
    .sk__section { padding: 0 0 96px; }
    .sk__head { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 40px; }
    .sk__h2 { width: 42%; max-width: 440px; height: 28px; border-radius: 8px; }
    .sk__lead { width: 34%; max-width: 360px; height: 12px; border-radius: 6px; }
    .sk__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .sk__card { display: flex; flex-direction: column; gap: 10px; padding: 24px; border-radius: 20px; background: #f7f8f8; border: 1px solid #eef0ef; }
    .sk__card b { width: 40px; height: 40px; border-radius: 12px; margin-bottom: 6px; }
    .sk__card i.t { width: 60%; height: 14px; border-radius: 7px; }
    .sk__card i.l { width: 100%; height: 10px; border-radius: 5px; }
    .sk__card i.l.s { width: 72%; }
    .sk__card i.price { width: 44%; height: 32px; border-radius: 8px; margin: 6px 0; }
    .sk__card i.cta { width: 100%; height: 44px; border-radius: 12px; margin-top: 10px; background: var(--sk-2); }
    .sk__card--hi { background: #fff; border-color: #cdd0cf; box-shadow: 0 12px 32px -20px rgba(0,0,0,.25); }
    .sk__card--hi i.cta { background: var(--sk-ink); }
    .sk__band { padding: 72px 0; background: #1e201f; }
    .sk__band .sk__wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .sk__band i { background: rgba(255,255,255,.14); }
    .sk__band i.cta { width: 160px; height: 48px; border-radius: 12px; margin-top: 12px; background: #fff; }
    .sk__quotes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
    .sk__quote { display: flex; flex-direction: column; gap: 10px; padding: 28px; border-radius: 20px; border: 1px solid #eef0ef; }
    .sk__who { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
    .sk__who b { width: 40px; height: 40px; border-radius: 50%; }
    .sk__who span { display: flex; flex-direction: column; gap: 6px; }
    .sk__who i { width: 120px; height: 10px; border-radius: 5px; }
    .sk__who i + i { width: 80px; }
    .sk__footer { padding: 64px 0 40px; background: #f4f5f5; border-top: 1px solid #e4e4e4; }
    .sk__cols { display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: 32px; }
    .sk__col { display: flex; flex-direction: column; gap: 12px; }
    .sk__col i { width: 70%; height: 10px; border-radius: 5px; }
    .sk__col i:first-child { width: 50%; height: 12px; background: var(--sk-2); }
    .sk__legal { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e4e4e4; }
    .sk__legal i { width: 180px; height: 10px; border-radius: 5px; }
    @container (max-width: 760px) {
      .sk__menu { display: none; }
      .sk__hero { padding: 56px 0 40px; }
      .sk__h1 { width: 88%; height: 30px; } .sk__h1 + .sk__h1 { width: 64%; }
      .sk__sub { width: 80%; } .sk__sub + .sk__sub { width: 60%; }
      .sk__btns { flex-direction: column; width: 100%; } .sk__btns i { width: 100%; }
      .sk__grid, .sk__quotes { grid-template-columns: 1fr; }
      .sk__h2 { width: 72%; } .sk__lead { width: 56%; }
      .sk__cols { grid-template-columns: 1fr 1fr; }
      .sk__section { padding-bottom: 64px; }
    }
  `);

  const SITE = `
    <header class="sk__nav"><div class="sk__wrap"><i class="sk__logo"></i><span class="sk__menu"><i></i><i></i><i></i><i></i><i></i></span><i class="sk__navcta"></i></div></header>
    <section class="sk__hero"><div class="sk__wrap">
      <i class="sk__eyebrow"></i><i class="sk__h1"></i><i class="sk__h1"></i><i class="sk__sub"></i><i class="sk__sub"></i>
      <span class="sk__btns"><i></i><i></i></span><i class="sk__shot"></i>
    </div></section>
    <section class="sk__logos"><i></i><i></i><i></i><i></i><i></i><i></i></section>
    <section class="sk__section"><div class="sk__wrap">
      <div class="sk__head"><i class="sk__h2"></i><i class="sk__lead"></i></div>
      <div class="sk__grid">${'<div class="sk__card"><b></b><i class="t"></i><i class="l"></i><i class="l"></i><i class="l s"></i></div>'.repeat(3)}</div>
    </div></section>
    <section class="sk__section"><div class="sk__wrap">
      <div class="sk__head"><i class="sk__h2"></i><i class="sk__lead"></i></div>
      <i class="sk__shot" style="margin-top:0"></i>
    </div></section>
    <section class="sk__section"><div class="sk__wrap">
      <div class="sk__head"><i class="sk__h2"></i></div>
      <div class="sk__quotes">${'<div class="sk__quote"><i class="l" style="height:10px;width:100%"></i><i class="l" style="height:10px;width:92%"></i><i class="l" style="height:10px;width:64%"></i><div class="sk__who"><b></b><span><i></i><i></i></span></div></div>'.repeat(2)}</div>
    </div></section>
    <section class="sk__section"><div class="sk__wrap">
      <div class="sk__head"><i class="sk__h2"></i><i class="sk__lead"></i></div>
      <div class="sk__grid">
        <div class="sk__card"><i class="t"></i><i class="price"></i><i class="l"></i><i class="l"></i><i class="l s"></i><i class="cta"></i></div>
        <div class="sk__card sk__card--hi"><i class="t"></i><i class="price"></i><i class="l"></i><i class="l"></i><i class="l"></i><i class="l s"></i><i class="cta"></i></div>
        <div class="sk__card"><i class="t"></i><i class="price"></i><i class="l"></i><i class="l"></i><i class="l s"></i><i class="cta"></i></div>
      </div>
    </div></section>
    <section class="sk__band"><div class="sk__wrap"><i class="sk__h2"></i><i class="sk__lead"></i><i class="cta"></i></div></section>
    <footer class="sk__footer" data-fa-avoid><div class="sk__wrap">
      <div class="sk__cols">
        <div class="sk__col"><i class="sk__logo"></i><i></i><i></i></div>
        ${'<div class="sk__col"><i></i><i></i><i></i><i></i><i></i></div>'.repeat(4)}
      </div>
      <div class="sk__legal"><i></i><i style="width:120px"></i></div>
    </div></footer>`;

  let fa = null, scroll = null, overlay = null, widget = null, widgetTimer = 0, state = null;

  // third-party widget stand-in: click → loading → a grey box "opens" → active
  function openWidget(id, inst) {
    clearTimeout(widgetTimer);
    widget.classList.remove('is-on');
    inst.loading(id);
    widgetTimer = setTimeout(() => {
      widget.style.setProperty('--fw', inst.options.color);
      widget.classList.toggle('is-compact', inst.layer.classList.contains('is-compact'));
      widget.classList.add('is-on');
      inst.active(id);
    }, state.widgetDelay);
  }
  function closeWidget(id, inst) {
    clearTimeout(widgetTimer);
    widget.classList.remove('is-on');
    if (id) inst.idle(id);
  }
  const clickAction = id => { const it = fa.items.find(i => i.a.id === id); if (it) it.btn.click(); };

  const snippet = o => {
    const acts = o.actions.map(a => `      { id: '${a.id}', icon: '${a.icon}', label: '${a.label}' },`).join('\n');
    const dict = I18N[o.lang];
    return `<link rel="stylesheet" href="float-actions.css">

<!-- the footer (or anything else) the buttons must not cover -->
<footer data-fa-avoid>…</footer>

<script src="float-actions.js"><\/script>
<script>
  new FloatActions(document.body, {
    actions: [
${acts}
    ],

    // texts are keys, resolved through t: plug in the site's i18n
    // (function key => string) or pass a dictionary per language
    t: key => i18n.t(key),
    // current "${o.lang}" dictionary for reference:
${Object.entries(dict).map(([k, v]) => `    //   '${k}': '${v}',`).join('\n')}
    strings: { dismiss: '${o.strings.dismiss}' },

    // the click hands over to a third-party widget, loaded on demand
    onAction(id, fa) {
      fa.loading(id);                       // spinner while the script loads
      loadWidget(id).then(widget => {       // your loader: Intercom, Crisp, Ringostat…
        widget.open();
        fa.active(id);                      // cross icon, other buttons step aside
        widget.onClose(() => fa.idle(id));  // widget closed from inside
      });
    },
    onClose(id, fa) {                       // cross or Escape
      widgets[id].close();
      fa.idle(id);
    },
    whenActive: '${o.whenActive}',
    whenActiveCompact: '${o.whenActiveCompact}',

    size: ${o.size},
    gap: ${o.gap},
    offset: { right: ${o.offset.right}, bottom: ${o.offset.bottom} },
    color: '${o.color}',
    hoverScale: ${o.hoverScale},

    showAfter: ${o.showAfter},
    enterDelay: ${o.enterDelay},
    labels: ${o.labels},
    labelDelay: ${o.labelDelay},

    fold: ${o.fold},
    foldAfter: ${o.foldAfter},
    unfoldDelay: ${o.unfoldDelay},
    peek: ${o.peek},

    nudge: ${o.nudge},
    nudgeAfter: ${o.nudgeAfter},
    nudgeMessage: '${o.nudgeMessage}',
    bubbleFor: ${o.bubbleFor},

    avoid: '${o.avoid}',
    avoidMode: '${o.avoidMode}',

    easing: '${o.easing}',
    compactBelow: ${o.compactBelow},
  });
<\/script>`;
  };

  const foldOn = s => s.fold;
  const nudgeOn = s => s.nudge;
  const labelsOn = s => s.labels;

  Playground.register({
    id: 'fab',
    title: 'Float actions',
    summary: 'Кнопки support і ringostat поверх сайту. Сайт і сторонній віджет тут скелети.',
    dir: 'float-actions',
    tabs: [
      { id: 'html', label: 'index.html', render: snippet },
      { id: 'css', label: 'float-actions.css', file: 'float-actions/float-actions.css' },
      { id: 'js', label: 'float-actions.js', file: 'float-actions/float-actions.js' },
    ],
    defaults,
    presets: PRESETS,
    controls: [
      { title: 'Сценарій', items: [
        { type: 'buttons', items: [
          { label: 'Програти появу', primary: true, run: () => fa.reset() },
          { label: 'Нудж зараз', run: () => fa.nudge() },
          { label: 'До футера', run: () => scroll.scrollTo({ top: scroll.scrollHeight, behavior: 'smooth' }) },
        ] },
        { type: 'status', render: () => {
          const L = fa.layer.classList;
          const loading = fa.items.find(i => i.btn.classList.contains('is-loading'));
          const st = !fa.shown ? 'ще не з\'явились' : loading ? `вантажиться віджет: ${loading.a.id}` : fa.activeId ? `віджет відкритий: ${fa.activeId}` : L.contains('is-away') ? 'сховані за футером' : fa.folded ? 'складені (скрол)' : 'на місці';
          const lift = parseFloat(fa.layer.style.getPropertyValue('--fa-lift')) || 0;
          return `Стан: <b>${st}</b>` + (lift ? ` · підняті на <b>${Math.round(lift)}px</b>` : '') + (fa.nudged ? ' · нудж уже був' : '');
        } },
      ] },
      { title: 'Клік і сторонній віджет', items: [
        { type: 'range', key: 'widgetDelay', label: 'Час завантаження віджета (імітація)', min: 0, max: 3000, step: 100, unit: 'ms' },
        { type: 'select', key: 'whenActive', label: 'Інші кнопки, поки віджет відкритий', options: [['others', 'Відходять, активна стає хрестиком'], ['all', 'Ховаються всі, віджет закривається сам'], ['none', 'Лишаються']] },
        { type: 'select', key: 'whenActiveCompact', label: 'Те саме на мобільному', options: [['all', 'Ховаються всі, віджет на весь екран'], ['others', 'Відходять, активна стає хрестиком'], ['none', 'Лишаються']] },
        { type: 'buttons', items: [
          { label: 'Клік по support', run: () => clickAction('support') },
          { label: 'Клік по ringostat', run: () => clickAction('ringostat') },
          { label: 'Закрити віджет', run: () => closeWidget(fa.activeId, fa) },
        ] },
      ] },
      { title: 'Поява', items: [
        { type: 'range', key: 'showAfter', label: 'Показати після скролу (0 = одразу)', min: 0, max: 1200, step: 50, unit: 'px' },
        { type: 'range', key: 'enterDelay', label: 'Затримка появи', min: 0, max: 3000, step: 100, unit: 'ms' },
        { type: 'easing', key: 'easing', label: 'Easing появи і розкладання' },
      ] },
      { title: 'Скрол', items: [
        { type: 'check', key: 'fold', label: 'Складати при скролі вниз, розкладати при скролі вгору' },
        { type: 'range', key: 'foldAfter', label: 'Гістерезис: px в один бік до перемикання', min: 8, max: 200, step: 4, unit: 'px', when: foldOn },
        { type: 'range', key: 'peek', label: 'Скільки визирає складена', min: 0, max: 16, step: 1, unit: 'px', when: foldOn },
        { type: 'range', key: 'unfoldDelay', label: 'Розкладати після зупинки (0 = лише при скролі вгору)', min: 0, max: 3000, step: 100, fmt: v => (v ? v + ' ms' : 'вимк.'), when: foldOn },
        { type: 'select', key: 'avoidMode', label: 'Коли футер на екрані', options: [['lift', 'Підняти над футером'], ['hide', 'Сховати'], ['none', 'Нічого']] },
      ] },
      { title: 'Наведення', items: [
        { type: 'check', key: 'labels', label: 'Підпис при наведенні' },
        { type: 'range', key: 'labelDelay', label: 'Затримка підпису', min: 0, max: 600, step: 20, unit: 'ms', when: labelsOn },
        { type: 'seg', key: 'lang', label: 'Мова текстів (через ключі і t)', options: [['en', 'English'], ['uk', 'Українська']] },
        { type: 'range', key: 'hoverScale', label: 'Scale при наведенні', min: 1, max: 1.2, step: 0.01, fmt: v => v.toFixed(2) },
      ] },
      { title: 'Нудж', items: [
        { type: 'check', key: 'nudge', label: 'Нагадати про себе, якщо не чіпали' },
        { type: 'range', key: 'nudgeAfter', label: 'Через', min: 1000, max: 30000, step: 500, fmt: v => (v / 1000).toFixed(1) + ' s', when: nudgeOn },
        { type: 'range', key: 'bubbleFor', label: 'Повідомлення висить', min: 2000, max: 15000, step: 500, fmt: v => (v / 1000).toFixed(1) + ' s', when: nudgeOn },
      ] },
      { title: 'Адаптив', items: [
        { type: 'range', key: 'compactBelow', label: 'Компактний режим під ширину', min: 320, max: 1024, step: 10, unit: 'px' },
        { type: 'status', render: () => `Ширина рамки: <b>${overlay.clientWidth}px</b> · режим: <b>${fa.layer.classList.contains('is-compact') ? 'компактний, панель як шторка' : 'десктоп'}</b>` },
      ] },
      { title: 'Вигляд', items: [
        { type: 'range', key: 'size', label: 'Розмір кнопки', min: 40, max: 72, step: 2, unit: 'px' },
        { type: 'range', key: 'gap', label: 'Відступ між кнопками', min: 4, max: 20, step: 1, unit: 'px' },
        { type: 'range', key: 'offset.bottom', label: 'Відступ від кута', min: 8, max: 48, step: 2, unit: 'px' },
        { type: 'color', key: 'color', label: 'Колір' },
      ] },
    ],
    stage: { className: 'stage--fill' },

    mount(ctx) {
      state = ctx.state;
      const browser = document.createElement('div');
      browser.className = 'browser';
      browser.innerHTML = `
        <div class="browser__bar"><span class="browser__dot"></span><span class="browser__dot"></span><span class="browser__dot"></span><span class="browser__url"></span></div>
        <div class="browser__view">
          <div class="browser__scroll"><div class="sk">${SITE}</div></div>
          <div class="browser__overlay">
            <div class="fake-widget" aria-hidden="true"><div class="fake-widget__head"><button type="button" class="fake-widget__x" aria-label="Close">×</button></div><div class="fake-widget__body"><i></i><i></i><i></i><i class="box"></i><i class="box"></i></div></div>
          </div>
        </div>`;
      ctx.frame.append(browser);
      scroll = browser.querySelector('.browser__scroll');
      overlay = browser.querySelector('.browser__overlay');
      widget = browser.querySelector('.fake-widget');
      // on a site the buttons mount on body; here they live in the frame, hence fixed: false and a scroller
      const opts = Object.fromEntries(MODULE_KEYS.map(k => [k, defaults[k]]));
      fa = new FloatActions(overlay, Object.assign(opts, { fixed: false, scroller: scroll, t: I18N[defaults.lang], onAction: openWidget, onClose: closeWidget }));
      ctx.instance = fa;
      widget.querySelector('.fake-widget__x').addEventListener('click', () => { closeWidget(fa.activeId, fa); ctx.refresh(); });
      new ResizeObserver(() => requestAnimationFrame(ctx.refresh)).observe(overlay);
      scroll.addEventListener('scroll', () => requestAnimationFrame(ctx.refresh), { passive: true });
      ['fa:show', 'fa:action', 'fa:close', 'fa:nudge'].forEach(ev => overlay.addEventListener(ev, () => setTimeout(ctx.refresh, 0)));
      new MutationObserver(ctx.refresh).observe(fa.layer, { attributes: true, attributeFilter: ['class', 'style'] });
    },
    // one "offset from the corner" control drives both sides
    derive(patch) { return patch.offset && patch.offset.bottom != null ? { offset: { right: patch.offset.bottom } } : {}; },
    apply(ctx, patch) {
      const mod = Object.fromEntries(Object.entries(patch).filter(([k]) => MODULE_KEYS.includes(k)));
      if ('offset' in patch) mod.offset = ctx.state.offset;
      if ('lang' in patch) mod.t = I18N[patch.lang];
      if (Object.keys(mod).length) fa.setOptions(mod);
    },
    reset(ctx) {
      closeWidget(fa.activeId, fa);
      scroll.scrollTo({ top: 0 });
      fa.reset();
    },
    hint(ctx) {
      const o = ctx.state;
      if (fa.activeId) return fa.layer.classList.contains('is-compact') && o.whenActiveCompact === 'all' ? 'На мобільному віджет на весь екран, наші кнопки сховані, закриває його власний хрестик' : 'Хрестик або Esc закриває віджет';
      return !fa.shown ? (o.showAfter ? `Кнопки з'являться після ${o.showAfter}px скролу` : 'Кнопки от-от з\'являться')
        : o.fold ? 'Скрол униз складає кнопки, скрол угору або наведення розкладає' : 'Наведи на кнопку, клікни, щоб відкрити віджет';
    },
  });
})();
