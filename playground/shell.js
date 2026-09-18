/* ==========================================================================
   Playground shell. The universal chrome around the modules: nothing here
   ships with a module, and a module never talks to the shell except through
   Playground.register() from its own playground.js.

   What the shell does for every module:
     - renders the settings panel from a declarative list of controls,
       keeps the state, saves it in the browser, packs it into share links
     - stage tools: pause, playback speed, frame width, zoom, grid, guides, fps
     - named saves for the developers and notes pinned to the module's
       elements, both in Supabase behind a company sign-in (or local)
     - the code drawer: generated snippet with changed lines highlighted,
       plus the module's source files, plus copy
     - light / dark theme, keyboard shortcuts, the mobile bottom sheet

   Module contract — Playground.register({ ... }). Every key is optional
   unless marked required:
     id        string   required. URL hash and storage key
     title     string   required. Panel heading
     tab       string   Short label for the switch pill and menu, defaults to title
     kind      'section' | 'component' | 'effect'   files the catalogue card and
               the switch entry, and picks the glyph in front of the name.
               Defaults to 'effect'
     summary   string   One line under the heading
     dir       string   Module folder, for the README link
     tabs      [{ id, label, file }] or [{ id, label, render(state, ctx) }]
               Code drawer tabs. A `file` tab shows the source file,
               a `render` tab shows generated text (changed lines vs defaults
               are highlighted)
     defaults  object   required. The full state, plain JSON values only
     presets   [{ label, patch }]
     random    (ctx) => patch    adds a "Випадково" button
     controls  [{ title, when(state), items: [item] }]   panel groups
       item.type  range | select | seg | check | color | text | swatch | chips | easing | buttons | status | note
       item.key   state key, may be a dotted path ('enter.x')
       item.when  (state) => boolean, hides the item
       range:   min, max, step, unit | fmt(v)
       select / seg: options [[value, label], …]
       text:    a string; placeholder, maxlength
       swatch:  options [{ id, label, css }]
       chips:   value is an array of ids; options [{ id, label, icon? }] toggle, values outside
                the options show as removable chips; add { placeholder, parse(text) => id | null }
                lets the user type a new one
       easing:  value is a CSS timing function string; a bezier editor with presets
       buttons: items [{ label, primary, run(ctx) }]
       status:  render(ctx) => html
       note:    text
     stage     { className, bg, resizable, resizableH, frame, frameH }
               bg is a plate under the block, for a module that needs a page
               colour of its own behind it; without it the block sits straight
               on the shell's canvas, and the Сцена group can add one.
               resizable defaults to true: the left and right edges drag.
               resizableH adds the bottom edge, for a module that owns its
               height instead of filling the stage. frame / frameH are the
               default size in px; 0 (the default) means "fill the stage"
     mount     (ctx) required. Build the demo inside ctx.frame
     apply     (ctx, patch) required. Push a state patch into the live demo
     derive    (patch, state) => patch   extra keys implied by a change,
               applied under the patch (e.g. a demo element implies a radius)
     reset     (ctx)   after the state went back to defaults
     hint      (ctx) => string   the line under the stage
     playback  { pause(ctx), resume(ctx), rate(ctx, r) }   for motion the
               shell cannot reach through getAnimations() (timers, canvas)
     onShow    (ctx), onHide(ctx)
     acceptance [{ id, run(ctx), wait?, expect(ctx) -> true | reason }]
               rows Playground.check() runs after it has proven every keyed
               control generically (alternative value -> state -> snippet or
               the item's own proof(ctx); proof: false marks playground-only)

   ctx: { id, state, defaults, ui, frame, stage, instance, set(patch),
          reset(), refresh(), paused, rate }

   Shared components. When one module's demo needs another module inside it
   (the header above the hero), the master adapter provides it by name and
   the other consumes it; they never reference each other's files:
     Playground.provide(name, { create(host, opts) -> { el, update(state) }, state(), markup?(opts, state) })
     Playground.consume(name, host, opts?, onMount?)   a copy inside host
     Playground.publish(name, state)                   master's apply() pushes changes
     Playground.component(name)                        provider def, e.g. its markup() for a snippet
   ========================================================================== */
(function () {
  'use strict';

  const REPO = 'https://github.com/lowflicker/worksection-playground';
  const STORE = 'ws-playground:';
  const FRAME_PRESETS = [0, 1440, 1024, 768, 390, 320];
  const RATES = [0.1, 0.25, 0.5, 1];
  const ZOOMS = [0.5, 1, 2];

  /* ---------- helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const h = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const merge = (target, patch) => {
    for (const k of Object.keys(patch)) {
      if (isObj(patch[k]) && isObj(target[k])) merge(target[k], patch[k]);
      else target[k] = isObj(patch[k]) ? clone(patch[k]) : patch[k];
    }
    return target;
  };
  const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, path, v) => { const ks = path.split('.'); let cur = o; ks.slice(0, -1).forEach(k => { cur = cur[k] = cur[k] || {}; }); cur[ks[ks.length - 1]] = v; return o; };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fmtNum = v => String(Math.round(v * 1000) / 1000);
  const store = {
    get(k, fallback) { try { const raw = localStorage.getItem(k); return raw == null ? fallback : JSON.parse(raw); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // Named saves for the developers live in Supabase (table `presets`, see playground/presets.sql). The anon key is
  // made for browsers — row-level security decides what it may do. Without a url the saves stay in this browser.
  const REMOTE = {
    url: 'https://mczdzxxqowefduehllnu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jemR6eHhxb3dlZmR1ZWhsbG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NDIwMzUsImV4cCI6MjEwNTMxODAzNX0.L9aLRgy3wPA_tpJskasQWoQD2sBouRBesYWB_TI7GG0',
    domain: 'worksection.ua', // the Google Workspace whose people may save; the policies in presets.sql enforce it
  };
  const b64e = str => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64d = str => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/'))));
  const stamp = () => new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  let uidN = 0;
  const uid = () => 'pg-' + (++uidN);

  /* ---------- registry ---------- */
  const modules = [];
  const byId = {};
  let active = null;
  let paused = false;
  let rate = 1;
  const tools = Object.assign({ zoom: 1, grid: false, guides: false, notes: true, notebar: false }, store.get(STORE + 'tools', {}));
  const groupsCollapsed = store.get(STORE + 'groups', {});

  /* What a module is, and the glyph that says so. The kind files the catalogue
     card and the switch entry; it used to be parsed out of an `S :` / `C :`
     prefix on the tab label, which is why those labels carried one. */
  const KIND = {
    section: { label: 'Секції', icon:
      '<svg class="i" viewBox="0 0 16 16"><rect x="2.5" y="1.5" width="11" height="13" rx="2"/><path d="M2.5 6h11M2.5 10h11"/></svg>' },
    component: { label: 'Компоненти', icon:
      '<svg class="i" viewBox="0 0 16 16"><path d="M8 2.2 13.8 8 8 13.8 2.2 8z"/></svg>' },
    effect: { label: 'Ефекти', icon:
      '<svg class="i" viewBox="0 0 16 16"><path d="M8 2 9.3 6.2 13.5 7.5 9.3 8.8 8 13 6.7 8.8 2.5 7.5 6.7 6.2z"/></svg>' },
  };

  const els = {};
  function bindShell() {
    ['views', 'home', 'catalog', 'crumb', 'btn-home', 'crumb-title', 'crumb-label', 'crumb-icon', 'crumb-menu', 'topbar', 'actions', 'toolbar', 'tb-play', 'tb-rates', 'tb-width', 'tb-width-badge', 'tb-width-in', 'tb-width-sep', 'tb-zooms', 'tb-grid', 'tb-guides', 'tb-fps',
     'drawer', 'drawer-tabs', 'drawer-code', 'drawer-copy', 'drawer-files', 'drawer-legend', 'drawer-readme',
     'btn-bell', 'bell-n', 'bell', 'notebar', 'nb-fold', 'nb-count-min', 'nb-toggle', 'nb-count', 'nb-prev', 'nb-pos', 'nb-next', 'nb-add', 'nb-copy',
     'btn-panel', 'btn-theme', 'btn-help', 'help'].forEach(id => { els[id] = document.getElementById(id); });
  }

  /* ===== Registering a module: the view skeleton, the panel, the demo ===== */
  function register(def) {
    if (!def || !def.id || !def.defaults || !def.mount || !def.apply) throw new Error('Playground.register: id, defaults, mount and apply are required');
    // bg is the plate under the block: unset means the block sits straight on the
    // shell's canvas, which is what a site block should do unless it needs a page
    // colour of its own behind it (the beam demo does)
    const stageDef = Object.assign({ resizable: true, bg: '' }, def.stage || {});
    const m = {
      id: def.id, def, defaults: clone(def.defaults), state: clone(def.defaults),
      ui: { frame: stageDef.frame || 0, frameH: stageDef.frameH || 0, bg: stageDef.bg },
      fields: [], groups: [], rz: null, instance: null,
    };
    byId[m.id] = m;
    modules.push(m);

    // view skeleton
    const app = h('div', 'app'); app.hidden = true; app.dataset.module = m.id;
    const stage = h('main', 'stage' + (stageDef.className ? ' ' + stageDef.className : ''));
    const body = h('div', 'stage__body');
    const frame = h('div', 'frame');
    const hint = h('div', 'stage-hint');
    if (stageDef.resizable) { m.rz = makeResizable(m, frame); body.append(m.rz.el); } else body.append(frame);
    body.append(hint);
    // the notes layer sits over the body, outside its stacking context: no module z-index reaches it
    const notes = h('div', 'notes'); notes.hidden = true;
    notes.addEventListener('pointerdown', e => pickDown(m, e));
    notes.addEventListener('pointermove', e => { pickMove(m, e); pickDrag(m, e); });
    notes.addEventListener('pointerup', e => pickUp(m, e));
    notes.addEventListener('click', e => { if (m.notes.pick && !m.notes.pick.drag && !m.notes.pick.wasDrag && !e.target.closest('.note-card, .note-pin')) pickChoose(m, e); m.notes.pick && (m.notes.pick.wasDrag = false); });
    stage.append(body, notes);
    m.notes = { rows: null, pins: [], open: null, pick: null, compose: null };
    const panel = h('aside', 'panel');
    const scroll = h('div', 'panel__scroll');
    scroll.addEventListener('scroll', () => closeEasing(), { passive: true });
    panel.append(scroll);
    app.append(stage, panel);
    els.views.append(app);
    m.els = { app, stage, body, frame, hint, panel, scroll, notes };

    // the catalogue card and the switch entry, both filed under the module's kind
    m.kind = KIND[def.kind] ? def.kind : 'effect';
    const files = (def.tabs || []).filter(t => t.file).map(t => `<span>${esc(t.label)}</span>`).join('');
    const card = h('button', 'card', `<span class="card__name">${KIND[m.kind].icon}${esc(def.title)}</span><span class="card__sum">${esc(def.summary || '')}</span><span class="card__files">${files}</span>`);
    card.type = 'button'; card.dataset.view = m.id;
    card.addEventListener('click', () => show(m.id));
    const group = $(`.home__group[data-kind="${m.kind}"]`, els.catalog);
    $('.home__grid', group).append(card);
    const kindHead = $('.home__kind h2', group);
    if (!kindHead.previousElementSibling) kindHead.insertAdjacentHTML('beforebegin', KIND[m.kind].icon);
    const item = h('button', '', KIND[m.kind].icon + esc(def.tab || def.title));
    item.type = 'button'; item.dataset.view = m.id; item.setAttribute('role', 'menuitem');
    item.addEventListener('click', () => { closeMenu(); show(m.id); });
    $(`.crumb__group[data-kind="${m.kind}"]`, els['crumb-menu']).append(item);

    // the module's view of the shell
    m.ctx = {
      id: m.id, state: m.state, defaults: m.defaults, ui: m.ui, frame, stage, instance: null,
      set: patch => setState(m, patch),
      reset: () => reset(m),
      refresh: () => refresh(m),
      get paused() { return paused; },
      get rate() { return rate; },
    };

    buildPanel(m);
    def.mount(m.ctx);
    m.instance = m.ctx.instance;
    def.apply(m.ctx, clone(m.state));
    refresh(m);
    return m.ctx;
  }

  /* ---------- state ---------- */
  function setState(m, patch) {
    patch = clone(patch);
    if (m.def.derive) patch = merge(clone(m.def.derive(patch, m.state) || {}), patch);
    merge(m.state, patch);
    m.def.apply(m.ctx, patch);
    refresh(m);
  }

  function reset(m) {
    m.ui.frame = (m.def.stage && m.def.stage.frame) || 0;
    m.ui.frameH = (m.def.stage && m.def.stage.frameH) || 0;
    m.ui.bg = (m.def.stage && m.def.stage.bg) || '';
    for (const k of Object.keys(m.state)) delete m.state[k];
    Object.assign(m.state, clone(m.defaults));
    m.def.apply(m.ctx, clone(m.defaults));
    if (m.def.reset) m.def.reset(m.ctx);
    refresh(m);
  }

  function refresh(m) {
    const s = m.state;
    for (const g of m.groups) g.el.hidden = !!(g.def.when && !g.def.when(s));
    for (const f of m.fields) {
      const show = !(f.item.when && !f.item.when(s));
      f.el.hidden = !show;
      if (show && f.sync) f.sync(s);
    }
    if (m.presetBtns) m.presetBtns.forEach(b => b.el.classList.toggle('is-active', Object.keys(b.patch).every(k => same(getPath(s, k), b.patch[k]))));
    m.els.hint.textContent = m.def.hint ? (m.def.hint(m.ctx) || '') : '';
    m.els.stage.classList.toggle('stage--bare', !m.ui.bg);
    if (m.ui.bg) m.els.stage.style.setProperty('--stage-bg', m.ui.bg);
    if (m.bgInput) {
      if (m.ui.bg) m.bgInput.value = m.ui.bg;
      m.bgInput.disabled = !m.ui.bg;
      m.bgOn.checked = !!m.ui.bg;
    }
    if (m.rz) m.rz.sync();
    if (m === active) { syncToolbar(); renderDrawer(); }
    saveStatus(m);
  }

  /* ===== Panel ===== */
  const ICON = {
    reset: '<svg class="i" viewBox="0 0 16 16"><path d="M3 8a5 5 0 1 0 1.5-3.6"/><path d="M3 2.5v3h3"/></svg>',
    caret: '<svg class="i" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>',
    code: '<svg class="i" viewBox="0 0 16 16"><path d="M6 4 2 8l4 4M10 4l4 4-4 4"/></svg>',
    link: '<svg class="i" viewBox="0 0 16 16"><path d="M6.5 9.5 9.5 6.5M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1"/></svg>',
    close: '<svg class="i" viewBox="0 0 16 16"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg>',
  };

  function buildPanel(m) {
    const def = m.def, scroll = m.els.scroll, panel = m.els.panel;
    scroll.innerHTML = '';

    // head: title, reset everything, collapse everything
    const head = h('div', 'panel__head');
    head.innerHTML = `<h1>${esc(def.title)}</h1><button type="button" class="icon" data-do="reset" title="Скинути всі налаштування">${ICON.reset}</button><button type="button" class="icon" data-do="fold" title="Згорнути / розгорнути всі групи">${ICON.caret}</button>`;
    head.addEventListener('click', e => {
      const b = e.target.closest('[data-do]'); if (!b) return;
      if (b.dataset.do === 'reset') reset(m);
      else { const open = m.groups.some(g => !g.el.classList.contains('is-collapsed')); m.groups.forEach(g => setCollapsed(m, g, open)); }
    });
    panel.prepend(head);
    if (def.summary) scroll.append(h('p', 'sub', esc(def.summary)));

    // save / share
    const save = h('div', 'save');
    save.innerHTML = '<button type="button" data-do="save">Зберегти</button><button type="button" data-do="clear">Забути збережене</button><span class="save__status"></span>';
    save.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (b) saveAction(m, b.dataset.do); });
    m.saveStatusEl = $('.save__status', save);
    scroll.append(save);

    // foot: the actions pinned to the bottom, as in a design tool
    const foot = h('div', 'panel__foot');
    foot.innerHTML = `<button type="button" class="primary" data-do="code" title="Код блоку з поточними значеннями (C)">${ICON.code}Код</button><button type="button" data-do="link" title="Посилання з поточними налаштуваннями">${ICON.link}Посилання</button>`;
    foot.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (!b) return; if (b.dataset.do === 'code') openDrawer(); else saveAction(m, 'link'); });
    panel.append(foot);

    // shared saves: the list, a name and the save button
    const sh = h('div', 'shared');
    sh.innerHTML = `<div class="shared__list"><p class="shared__empty">…</p></div><div class="shared__add"><input type="text" placeholder="Назва збереження" maxlength="80" autocomplete="off"><button type="button" data-do="save">Зберегти для розробника</button></div><div class="shared__auth"></div><span class="save__status shared__status"></span>`;
    m.sharedListEl = $('.shared__list', sh);
    m.sharedAddEl = $('.shared__add', sh);
    m.sharedAuthEl = $('.shared__auth', sh);
    m.sharedNameEl = $('input', sh);
    m.sharedStatusEl = $('.shared__status', sh);
    renderAuth(m);
    sh.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (!b) return; const row = b.closest('.shared__row'); sharedAction(m, b.dataset.do, row && row.dataset.id); });
    m.sharedNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') sharedAction(m, 'save'); });
    scroll.append(group(m, { title: 'Збережені для розробника' }, sh));
    renderShared(m);

    // notes: the list, «new» and a Markdown copy for the handoff
    const nt = h('div', 'notes-list');
    nt.innerHTML = `<div class="notes__filter" hidden></div><div class="notes__list"><p class="shared__empty">…</p></div><span class="save__status notes__status"></span>`;
    m.notesListEl = $('.notes__list', nt);
    m.notesFilterEl = $('.notes__filter', nt);
    m.notesFilterEl.addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (!b) return; m.notes.filter = b.dataset.filter; renderNotesList(m); });
    m.notesStatusEl = $('.notes__status', nt);
    nt.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (!b) return; const row = b.closest('.notes__row'); notesAction(m, b.dataset.do, row && row.dataset.id); });
    scroll.append(group(m, { title: 'Нотатки до елементів' }, nt));

    // presets, random, reset
    if (def.presets || def.random) {
      const body = h('div');
      if (def.presets) {
        const row = h('div', 'presets');
        m.presetBtns = def.presets.map(p => {
          const b = h('button', '', esc(p.label)); b.type = 'button';
          b.addEventListener('click', () => setState(m, p.patch));
          row.append(b);
          return { el: b, patch: p.patch };
        });
        body.append(row);
      }
      if (def.random) {
        const row2 = h('div', 'row-btns');
        const b = h('button', '', 'Випадково'); b.type = 'button'; b.addEventListener('click', () => setState(m, def.random(m.ctx) || {})); row2.append(b);
        body.append(row2);
      }
      scroll.append(group(m, { title: 'Пресети' }, body));
    }

    // the module's own controls
    for (const g of def.controls || []) {
      const body = h('div');
      for (const it of g.items || []) {
        const f = buildField(m, it);
        if (!f) continue;
        m.fields.push(f);
        body.append(f.el);
      }
      scroll.append(group(m, g, body));
    }

    // scene: things about the stage, not the module
    const scene = h('div');
    const bgField = h('div', 'field inline');
    const bgId = uid(), bgOnId = uid();
    bgField.innerHTML = `<div class="check"><input type="checkbox" id="${bgOnId}"><label for="${bgOnId}">Підкладка під блоком</label></div><input type="color" id="${bgId}">`;
    m.bgOn = $('input[type=checkbox]', bgField);
    m.bgInput = $('input[type=color]', bgField);
    m.bgInput.value = m.ui.bg || '#f5f5f5';
    m.bgInput.addEventListener('input', () => { m.ui.bg = m.bgInput.value; refresh(m); });
    m.bgOn.addEventListener('change', () => { m.ui.bg = m.bgOn.checked ? (m.bgInput.value || '#f5f5f5') : ''; refresh(m); });
    scene.append(bgField);
    scroll.append(group(m, { title: 'Сцена', collapsed: true }, scene));
  }

  function setCollapsed(m, g, on) {
    g.el.classList.toggle('is-collapsed', on);
    groupsCollapsed[m.id + '/' + g.def.title] = on;
    store.set(STORE + 'groups', groupsCollapsed);
  }

  function group(m, g, body) {
    const wrap = h('div', 'group');
    const key = m.id + '/' + g.title;
    const head = h('h2', '', `<span>${esc(g.title)}</span><div class="group__tools"><button type="button" class="reset" title="Скинути цю групу">${ICON.reset}</button><button type="button" class="caret" title="Згорнути">${ICON.caret}</button></div>`);
    body.classList.add('group__body');
    if (!(g.items || []).some(it => it.key)) $('.reset', head).remove();
    const rec = { el: wrap, def: g };
    wrap.classList.toggle('is-collapsed', key in groupsCollapsed ? groupsCollapsed[key] : !!g.collapsed);
    head.addEventListener('click', e => {
      if (e.target.closest('.reset')) {
        // the group's own keys back to their defaults; items without a key (buttons, status) have nothing to reset
        const patch = {};
        for (const it of g.items || []) if (it.key) setPath(patch, it.key, getPath(m.defaults, it.key));
        if (Object.keys(patch).length) setState(m, patch);
        return;
      }
      setCollapsed(m, rec, !wrap.classList.contains('is-collapsed'));
    });
    wrap.append(head, body);
    m.groups.push(rec);
    return wrap;
  }

  function coerce(m, key, raw) {
    const d = getPath(m.defaults, key);
    if (typeof d === 'number') return +raw;
    if (typeof d === 'boolean') return raw === true || raw === 'true';
    return raw;
  }

  function buildField(m, it) {
    const t = it.type;
    const id = uid();
    const label = it.label ? esc(it.label) : '';

    if (t === 'range') {
      const el = h('div', 'field', `<label for="${id}">${label}</label><output></output><input type="range" id="${id}" min="${it.min}" max="${it.max}" step="${it.step == null ? 1 : it.step}">`);
      const input = $('input', el), out = $('output', el);
      const fill = () => input.style.setProperty('--fill', ((input.value - it.min) / (it.max - it.min) * 100) + '%');
      input.addEventListener('input', () => { fill(); setState(m, setPath({}, it.key, parseFloat(input.value))); });
      // double-click the label: back to the default value
      $('label', el).addEventListener('dblclick', () => setState(m, setPath({}, it.key, getPath(m.defaults, it.key))));
      return { el, item: it, sync: s => { const v = getPath(s, it.key); input.value = v; fill(); out.textContent = it.fmt ? it.fmt(v) : fmtNum(v) + (it.unit ? ' ' + it.unit : ''); } };
    }
    if (t === 'select') {
      const el = h('div', 'field inline', `<label for="${id}">${label}</label><select id="${id}">${it.options.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`);
      const sel = $('select', el);
      sel.addEventListener('change', () => setState(m, setPath({}, it.key, coerce(m, it.key, sel.value))));
      return { el, item: it, sync: s => { sel.value = String(getPath(s, it.key)); } };
    }
    if (t === 'seg') {
      const el = h('div', 'field', `<label>${label}</label><span></span><div class="seg${it.wrap ? ' seg--wrap' : ''}">${it.options.map(o => `<button type="button" data-v="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div>`);
      const btns = $$('button', el);
      btns.forEach(b => b.addEventListener('click', () => setState(m, setPath({}, it.key, coerce(m, it.key, b.dataset.v)))));
      return { el, item: it, sync: s => { const v = String(getPath(s, it.key)); btns.forEach(b => b.classList.toggle('is-active', b.dataset.v === v)); } };
    }
    if (t === 'check') {
      const el = h('div', 'check', `<input type="checkbox" id="${id}"><label for="${id}">${label}</label>`);
      const cb = $('input', el);
      cb.addEventListener('change', () => setState(m, setPath({}, it.key, cb.checked)));
      return { el, item: it, sync: s => { cb.checked = !!getPath(s, it.key); } };
    }
    if (t === 'color') {
      const el = h('div', 'field inline', `<label for="${id}">${label}</label><input type="color" id="${id}">`);
      const input = $('input', el);
      input.addEventListener('input', () => setState(m, setPath({}, it.key, input.value)));
      return { el, item: it, sync: s => { input.value = getPath(s, it.key); } };
    }
    if (t === 'text') {
      const el = h('div', 'field', `<label for="${id}">${label}</label><input type="text" id="${id}"${it.placeholder ? ` placeholder="${esc(it.placeholder)}"` : ''}${it.maxlength ? ` maxlength="${it.maxlength}"` : ''} autocomplete="off" spellcheck="false">`);
      const input = $('input', el);
      // every keystroke lands in the state, so the stage follows the typing
      input.addEventListener('input', () => setState(m, setPath({}, it.key, input.value)));
      // only a real change is written back, so the caret survives the sync
      return { el, item: it, sync: s => { const v = String(getPath(s, it.key) ?? ''); if (input.value !== v) input.value = v; } };
    }
    if (t === 'swatch') {
      const el = h('div', 'field', `<label>${label}</label><output></output><div class="swatches">${it.options.map(o => `<button type="button" class="swatch" data-v="${esc(o.id)}" title="${esc(o.label)}" style="background:${o.css}"></button>`).join('')}</div>`);
      const btns = $$('button', el), out = $('output', el);
      btns.forEach(b => b.addEventListener('click', () => setState(m, setPath({}, it.key, b.dataset.v))));
      return { el, item: it, sync: s => { const v = getPath(s, it.key); btns.forEach(b => b.classList.toggle('is-active', b.dataset.v === v)); const o = it.options.find(x => x.id === v); out.textContent = o ? o.label : ''; } };
    }
    if (t === 'chips') {
      const el = h('div', 'field', `<label>${label}</label><output></output><div class="chips"></div>${it.add ? `<div class="chips__add"><input type="text" placeholder="${esc(it.add.placeholder || '')}" aria-label="${esc(it.add.placeholder || 'Додати')}"></div>` : ''}`);
      const box = $('.chips', el), out = $('output', el), inp = $('input', el);
      const get = () => (getPath(m.state, it.key) || []).slice();
      const put = v => setState(m, setPath({}, it.key, v));
      const toggle = id => { const v = get(); const i = v.indexOf(id); i < 0 ? v.push(id) : v.splice(i, 1); put(v); };
      if (inp) inp.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const id = it.add.parse ? it.add.parse(inp.value.trim()) : inp.value.trim();
        if (!id) return;
        const v = get(); if (!v.includes(id)) v.push(id); put(v);
        inp.value = '';
      });
      return { el, item: it, sync: s => {
        const v = getPath(s, it.key) || [];
        const known = it.options.map(o => o.id);
        const extra = v.filter(x => !known.includes(x));
        const chip = (id, label, icon, on, x) => `<button type="button" class="chip${on ? ' is-active' : ''}" data-v="${esc(id)}" title="${esc(label)}">${icon ? `<img src="${esc(icon)}" alt="">` : ''}<span>${esc(label)}</span>${x ? '<i>×</i>' : ''}</button>`;
        const html = it.options.map(o => chip(o.id, o.label, o.icon, v.includes(o.id))).join('')
          + extra.map(id => chip(id, it.add && it.add.label ? it.add.label(id) : id, it.add && it.add.icon ? it.add.icon(id) : '', true, true)).join('');
        if (box.dataset.html !== html) { box.dataset.html = html; box.innerHTML = html; $$('.chip', box).forEach(b => b.addEventListener('click', () => toggle(b.dataset.v))); }
        out.textContent = v.length + ' з ' + (known.length + extra.length);
      } };
    }
    if (t === 'easing') {
      const el = h('div', 'field', `<label>${label}</label><output></output><button type="button" class="easing" style="grid-column: 1 / -1">${curveIcon([0, 0, 1, 1])}<code></code></button>`);
      const btn = $('button', el), out = $('output', el), code = $('code', el);
      const get = () => parseEasing(getPath(m.state, it.key)) || [0.25, 0.1, 0.25, 1];
      btn.addEventListener('click', () => (popOn && popOn.anchor === btn ? closeEasing() : openEasing(btn, get, p => setState(m, setPath({}, it.key, fmtEasing(p))))));
      return { el, item: it, sync: s => {
        const raw = getPath(s, it.key), p = parseEasing(raw);
        if (!p) { out.textContent = '?'; code.textContent = String(raw); return; }
        out.textContent = easingName(p) || 'своя';
        code.textContent = fmtEasing(p);
        btn.firstElementChild.outerHTML = curveIcon(p);
      } };
    }
    if (t === 'buttons') {
      const el = h('div', 'row-btns');
      for (const b of it.items) {
        const btn = h('button', b.primary ? 'primary' : '', esc(b.label)); btn.type = 'button';
        btn.addEventListener('click', () => { b.run(m.ctx); refresh(m); });
        el.append(btn);
      }
      return { el, item: it };
    }
    if (t === 'status') {
      const el = h('div', 'status');
      return { el, item: it, sync: () => { el.innerHTML = it.render(m.ctx) || ''; } };
    }
    if (t === 'note') return { el: h('p', 'note', it.text), item: it };
    return null;
  }

  /* ===== Easing control: a cubic-bezier editor with presets, after Toolcraft's timeline easing editor ===== */
  // the value in the state is the CSS string the module gets: a keyword or cubic-bezier(x1, y1, x2, y2)
  const EASING_KEYWORDS = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
  const EASING_PRESETS = [
    { cat: 'Основні', items: [['Linear', [0, 0, 1, 1]], ['Ease', [0.25, 0.1, 0.25, 1]], ['Standard', [0.4, 0, 0.2, 1]], ['Smooth', [0.65, 0, 0.35, 1]], ['Soft in-out', [0.45, 0, 0.2, 1]]] },
    { cat: 'Out', items: [['Ease out', [0, 0, 0.58, 1]], ['Quick out', [0, 0, 0.2, 1]], ['Out cubic', [0.215, 0.61, 0.355, 1]], ['Out quint', [0.22, 1, 0.36, 1]], ['Out expo', [0.16, 1, 0.3, 1]], ['Snappy out', [0.19, 1, 0.22, 1]]] },
    { cat: 'In', items: [['Ease in', [0.42, 0, 1, 1]], ['In circ', [0.6, 0.04, 0.98, 0.335]], ['In quint', [0.755, 0.05, 0.855, 0.06]], ['In expo', [0.7, 0, 0.84, 0]]] },
    { cat: 'In out', items: [['Ease in-out', [0.42, 0, 0.58, 1]], ['In-out cubic', [0.65, 0, 0.35, 1]], ['In-out quart', [0.77, 0, 0.175, 1]], ['In-out quint', [0.86, 0, 0.07, 1]], ['In-out expo', [1, 0, 0, 1]]] },
    { cat: 'Виразні', items: [['Back out', [0.34, 1.56, 0.64, 1]], ['Swift out', [0.175, 0.885, 0.32, 1.1]], ['Back in', [0.36, 0, 0.66, -0.56]], ['Anticipate', [1, -0.4, 0.35, 0.95]]] },
  ];
  const num = n => String(Math.round(n * 1000) / 1000).replace(/^(-?)0\./, '$1.');
  const fmtEasing = p => `cubic-bezier(${p.map(num).join(', ')})`;
  function parseEasing(v) {
    if (Array.isArray(v) && v.length === 4) return v.map(Number);
    if (typeof v !== 'string') return null;
    const s = v.trim().toLowerCase();
    if (EASING_KEYWORDS[s]) return EASING_KEYWORDS[s].slice();
    const m = s.match(/cubic-bezier\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x.trim()));
    if (p.length !== 4 || p.some(x => !Number.isFinite(x))) return null;
    return [Math.min(1, Math.max(0, p[0])), p[1], Math.min(1, Math.max(0, p[2])), p[3]];
  }
  const easingName = p => { for (const g of EASING_PRESETS) for (const [label, q] of g.items) if (q.every((x, i) => Math.abs(x - p[i]) < 0.006)) return label; return null; };
  // curve path inside a box: size px, pad px of margin (overshoot draws outside the box)
  const curvePath = (p, size, pad) => {
    const X = x => pad + x * size, Y = y => pad + (1 - y) * size;
    return `M ${X(0)} ${Y(0)} C ${X(p[0])} ${Y(p[1])}, ${X(p[2])} ${Y(p[3])}, ${X(1)} ${Y(1)}`;
  };
  const curveIcon = p => `<svg class="easing__icon" viewBox="0 0 22 22" aria-hidden="true"><path d="${curvePath(p, 14, 4)}"/></svg>`;

  // one popover for the whole page, moved under whichever easing field opened it
  let pop = null, popOn = null;
  function easingPopover() {
    if (pop) return pop;
    pop = h('div', 'pop pop--easing');
    pop.hidden = true;
    pop.innerHTML = `
      <svg class="ease-ed" viewBox="0 0 200 200" width="200" height="200">
        <rect class="ease-ed__box" x="40" y="40" width="120" height="120"/>
        <g class="ease-ed__grid">${[0.25, 0.5, 0.75].map(t => `<line x1="${40 + t * 120}" y1="40" x2="${40 + t * 120}" y2="160"/><line x1="40" y1="${40 + t * 120}" x2="160" y2="${40 + t * 120}"/>`).join('')}</g>
        <line class="ease-ed__diag" x1="40" y1="160" x2="160" y2="40"/>
        <line class="ease-ed__arm" data-arm="1"/><line class="ease-ed__arm" data-arm="2"/>
        <path class="ease-ed__curve"/>
        <circle class="ease-ed__end" cx="40" cy="160" r="3"/><circle class="ease-ed__end" cx="160" cy="40" r="3"/>
        <circle class="ease-ed__pt" data-pt="1" r="6"/><circle class="ease-ed__pt" data-pt="2" r="6"/>
      </svg>
      <div class="ease-preview"><i></i></div>
      <input type="text" class="ease-input" spellcheck="false" aria-label="cubic-bezier">
      <div class="ease-presets">${EASING_PRESETS.map(g => `<div class="ease-presets__cat">${esc(g.cat)}</div><div class="ease-presets__row">${g.items.map(([label, p]) => `<button type="button" data-ease="${fmtEasing(p)}" title="${esc(label)}">${curveIcon(p)}<span>${esc(label)}</span></button>`).join('')}</div>`).join('')}</div>`;
    document.body.append(pop);

    const svg = $('.ease-ed', pop), input = $('.ease-input', pop), preview = $('.ease-preview i', pop);
    const X = x => 40 + x * 120, Y = y => 40 + (1 - y) * 120;
    const paint = p => {
      $('.ease-ed__curve', pop).setAttribute('d', curvePath(p, 120, 40));
      const a1 = $('[data-arm="1"]', pop), a2 = $('[data-arm="2"]', pop);
      a1.setAttribute('x1', X(0)); a1.setAttribute('y1', Y(0)); a1.setAttribute('x2', X(p[0])); a1.setAttribute('y2', Y(p[1]));
      a2.setAttribute('x1', X(1)); a2.setAttribute('y1', Y(1)); a2.setAttribute('x2', X(p[2])); a2.setAttribute('y2', Y(p[3]));
      $('[data-pt="1"]', pop).setAttribute('cx', X(p[0])); $('[data-pt="1"]', pop).setAttribute('cy', Y(p[1]));
      $('[data-pt="2"]', pop).setAttribute('cx', X(p[2])); $('[data-pt="2"]', pop).setAttribute('cy', Y(p[3]));
      if (document.activeElement !== input) input.value = fmtEasing(p);
      input.classList.remove('is-bad');
      const cur = fmtEasing(p);
      $$('[data-ease]', pop).forEach(b => b.classList.toggle('is-active', b.dataset.ease === cur));
      preview.style.animationTimingFunction = cur;
      preview.style.animation = 'none'; void preview.offsetWidth; preview.style.animation = '';
    };
    pop.paint = paint;

    // drag a control point: x stays in 0..1 (CSS demands it), y may overshoot
    let drag = 0;
    const toPt = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 200, (e.clientY - r.top) / r.height * 200]; };
    svg.addEventListener('pointerdown', e => {
      const pt = e.target.closest('[data-pt]'); if (!pt) return;
      drag = +pt.dataset.pt; svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', e => {
      if (!drag || !popOn) return;
      const [px, py] = toPt(e);
      const p = popOn.get();
      const x = Math.min(1, Math.max(0, (px - 40) / 120)), y = Math.round(Math.min(2, Math.max(-1, 1 - (py - 40) / 120)) * 100) / 100;
      if (drag === 1) { p[0] = x; p[1] = y; } else { p[2] = x; p[3] = y; }
      popOn.set(p);
    });
    svg.addEventListener('pointerup', () => { drag = 0; });
    svg.addEventListener('pointercancel', () => { drag = 0; });
    input.addEventListener('input', () => { const p = parseEasing(input.value); input.classList.toggle('is-bad', !p); if (p && popOn) popOn.set(p, true); });
    input.addEventListener('blur', () => { if (popOn) paint(popOn.get()); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    pop.addEventListener('click', e => { const b = e.target.closest('[data-ease]'); if (b && popOn) popOn.set(parseEasing(b.dataset.ease)); });
    document.addEventListener('pointerdown', e => { if (!pop.hidden && !e.target.closest('.pop--easing, .easing')) closeEasing(); }, true);
    return pop;
  }
  function openEasing(anchor, get, set) {
    const el = easingPopover();
    popOn = { anchor, get, set: (p, quiet) => { set(p); if (!quiet) el.paint(get()); else { const cur = fmtEasing(get()); $$('[data-ease]', el).forEach(b => b.classList.toggle('is-active', b.dataset.ease === cur)); } } };
    el.hidden = false;
    el.paint(get());
    // under the field, kept inside the viewport
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, hgt = el.offsetHeight;
    let left = Math.min(r.right - w, window.innerWidth - w - 8); left = Math.max(8, left);
    let top = r.bottom + 6; if (top + hgt > window.innerHeight - 8) top = Math.max(8, r.top - hgt - 6);
    el.style.left = left + 'px'; el.style.top = top + 'px';
    anchor.classList.add('is-open');
  }
  function closeEasing() { if (pop) pop.hidden = true; if (popOn) popOn.anchor.classList.remove('is-open'); popOn = null; }

  /* ===== Save / share: the browser keeps the state, links carry it ===== */
  const snapshot = m => ({ state: clone(m.state), ui: { frame: m.ui.frame, frameH: m.ui.frameH, bg: m.ui.bg } });
  function restoreSnapshot(m, d) {
    if (!d || typeof d !== 'object') return;
    const sd = m.def.stage || {};
    if (d.ui) {
      // a key that is absent (a save from before the module had that size) falls
      // back to the module's default, not to 0 — 0 means "fill the stage"
      m.ui.frame  = 'frame'  in d.ui ? (d.ui.frame  || 0) : (sd.frame  || 0);
      m.ui.frameH = 'frameH' in d.ui ? (d.ui.frameH || 0) : (sd.frameH || 0);
      m.ui.bg = 'bg' in d.ui ? (d.ui.bg || '') : (sd.bg || '');
    }
    if (d.state) setState(m, d.state);
  }

  function saveStatus(m, text) {
    const box = m.saveStatusEl; if (!box) return;
    const was = store.get(STORE + m.id, null);
    const dirty = !!was && !same(was, snapshot(m));
    box.classList.toggle('is-dirty', dirty);
    if (text) { box.textContent = text; return; }
    box.textContent = !was ? '' : dirty ? 'Є незбережені зміни' : 'Збережено в цьому браузері';
  }

  async function saveAction(m, act) {
    if (act === 'save') { store.set(STORE + m.id, snapshot(m)); saveStatus(m, 'Збережено, ' + stamp()); }
    else if (act === 'link') {
      const url = `${location.origin}${location.pathname}#${m.id}?s=${b64e(JSON.stringify(snapshot(m)))}`;
      try { await navigator.clipboard.writeText(url); saveStatus(m, 'Посилання скопійовано'); } catch (e) { prompt('Скопіюй посилання', url); }
      history.replaceState(null, '', url);
    } else if (act === 'clear') { store.del(STORE + m.id); saveStatus(m, 'Збережене видалено'); }
  }

  function restoreAll(hashView, hashQuery) {
    const fromLink = hashQuery && new URLSearchParams(hashQuery).get('s');
    for (const m of modules) {
      try {
        if (fromLink && m.id === hashView) { restoreSnapshot(m, JSON.parse(b64d(fromLink))); saveStatus(m, 'Відкрито з посилання'); continue; }
        const saved = store.get(STORE + m.id, null);
        if (saved) { restoreSnapshot(m, saved); saveStatus(m, 'Відновлено збережене'); }
      } catch (e) { saveStatus(m, 'Не вдалося прочитати збережене'); }
    }
  }

  /* ===== Sign-in: a link to the company mailbox, through Supabase Auth (GoTrue's REST, no SDK) =====
     Reading stays open so a link works for anyone; saving and deleting need a signed-in person from the
     company's domain. The row policies in presets.sql are the real gate — the shell only asks for the
     sign-in, carries the token and shows who is in; nothing it checks is trusted by the server.
     PKCE: the mail's link brings back a one-time code that only the browser holding the verifier can
     turn into a session, so no tokens travel in the address bar and a forwarded or scanned mail is
     worth nothing. The session lives in this browser. */
  const SESSION_KEY = STORE + 'session';
  const auth = {
    session: store.get(SESSION_KEY, null),
    error: '', // what went wrong on the way back, shown once in the panel
    get user() { return auth.session ? auth.session.user : null; },
    claims(token) { try { return JSON.parse(b64d(token.split('.')[1])); } catch (e) { return {}; } },
    keep(tokens) {
      if (!tokens || !tokens.access_token) return auth.drop();
      setTimeout(loadBell, 0); // a session means notifications to fetch
      const c = auth.claims(tokens.access_token), email = c.email || '';
      // the name is what the list shows to anyone with the link, so never the full address
      auth.session = {
        access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: (c.exp || 0) * 1000,
        user: { id: c.sub, email, name: email.split('@')[0] },
      };
      store.set(SESSION_KEY, auth.session);
      modules.forEach(renderAuth);
    },
    drop() { auth.session = null; store.del(SESSION_KEY); modules.forEach(renderAuth); setTimeout(loadBell, 0); },
    // an access token lives an hour; it is renewed a minute early, on the way to a request
    async token() {
      const s = auth.session; if (!s) return null;
      if (Date.now() < s.expires_at - 60e3) return s.access_token;
      try {
        const r = await fetch(`${REMOTE.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: REMOTE.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        if (!r.ok) throw new Error(r.status);
        auth.keep(await r.json());
        return auth.session.access_token;
      } catch (e) { auth.drop(); return null; }
    },
    async post(path, body) {
      const r = await fetch(`${REMOTE.url}/auth/v1/${path}`, { method: 'POST', headers: { apikey: REMOTE.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) {
        let msg = 'Supabase ' + r.status;
        try { const e = await r.json(); msg = e.msg || e.error_description || e.message || msg; } catch (e) {}
        throw new Error(r.status === 429 ? 'забагато спроб, зачекай трохи' : msg);
      }
      return r.json();
    },
    // step 1: the mail; the verifier and the hash the person left from wait in this browser
    async signIn(email) {
      email = (email || '').trim().toLowerCase();
      if (!email.endsWith('@' + REMOTE.domain)) throw new Error('потрібна пошта @' + REMOTE.domain);
      const verifier = Array.from(crypto.getRandomValues(new Uint8Array(48)), b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'[b % 66]).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      store.set(STORE + 'auth-flow', { verifier, back: location.hash });
      await auth.post('otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { email, create_user: true, code_challenge: challenge, code_challenge_method: 's256' });
      return email;
    },
    // step 2, on the way back: ?code=… is swapped for a session and the address is cleaned up
    async land() {
      const q = new URLSearchParams(location.search);
      if (!q.has('code') && !q.has('error_description') && !q.has('error')) return;
      const flow = store.get(STORE + 'auth-flow', null); store.del(STORE + 'auth-flow');
      history.replaceState(null, '', location.pathname + ((flow && flow.back) || location.hash));
      if (q.has('code') && flow) {
        try { auth.keep(await auth.post('token?grant_type=pkce', { auth_code: q.get('code'), code_verifier: flow.verifier })); }
        catch (e) { auth.error = e.message; }
      } else auth.error = q.get('error_description') || q.get('error') || 'відкрий посилання в тому самому браузері, де просив лист';
      if (auth.error) { modules.forEach(renderAuth); auth.error = ''; }
    },
    async signOut() {
      const t = await auth.token();
      if (t) fetch(`${REMOTE.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: REMOTE.anonKey, Authorization: 'Bearer ' + t } }).catch(() => {});
      auth.drop();
    },
  };
  function renderAuth(m) {
    const box = m.sharedAuthEl; if (!box) return;
    if (!REMOTE.url) { box.hidden = true; return; }
    const u = auth.user;
    box.hidden = !u;
    box.innerHTML = u ? `<span class="shared__who" title="${esc(u.email)}">${esc(u.name)}</span><button type="button" data-do="out">Вийти</button>` : '';
    if (auth.error) sharedStatus(m, 'Не вдалося увійти: ' + auth.error, true);
    // what was being done before the round trip through the mailbox comes back with the person:
    // the name typed for a save, or the note that was about to be pinned
    const pending = store.get(STORE + 'auth-pending', null);
    if (u && pending && pending.module === m.id) {
      store.del(STORE + 'auth-pending');
      if (pending.note) saveNote(m, pending.note);
      else { m.sharedNameEl.value = pending.name; sharedStatus(m, 'Ти в системі — тепер «Зберегти»'); }
    }
    if (m.sharedRendered) renderShared(m); // whose rows may be deleted changed
    if (m.notes.rows) renderNotesList(m);
  }
  // the save button is for everyone; the sign-in is asked for only when it is pressed.
  // extra: what to carry over the round trip besides the module (a note about to be saved)
  let signInEl;
  function openSignIn(m, extra) {
    if (!signInEl) {
      signInEl = h('div', 'modal');
      signInEl.innerHTML = `<div class="modal__backdrop"></div>
      <form class="modal__card">
        <div class="modal__mark"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4 8 8 5.5L20 8"/></svg></div>
        <h3>Увійди, щоб зберегти</h3>
        <p class="modal__lead">Збережене бачать усі, а зберігати можуть люди з <b>@${esc(REMOTE.domain)}</b>. На пошту прийде посилання для входу — відкрий його в цьому ж браузері, і повернешся сюди.</p>
        <label class="modal__field"><span>Робоча пошта</span><input type="email" placeholder="ім'я@${esc(REMOTE.domain)}" autocomplete="email" spellcheck="false" required></label>
        <p class="modal__sent"><b></b>Відкрий посилання з листа — він може йти хвилину. Ця вкладка почекає.</p>
        <p class="modal__status"></p>
        <button type="submit" class="modal__primary">Надіслати посилання</button>
        <button type="button" class="modal__ghost" data-do="cancel">Скасувати</button>
      </form>`;
      document.body.append(signInEl);
      const form = $('form', signInEl), card = $('.modal__card', signInEl), input = $('input', signInEl), status = $('.modal__status', signInEl);
      const close = () => { signInEl.hidden = true; };
      $('.modal__backdrop', signInEl).addEventListener('click', close);
      $('[data-do="cancel"]', signInEl).addEventListener('click', close);
      signInEl.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const mod = signInEl.module;
        store.set(STORE + 'auth-pending', Object.assign({ module: mod.id, name: mod.sharedNameEl.value.trim() }, signInEl.extra || {}));
        status.textContent = '';
        try {
          const email = await auth.signIn(input.value);
          $('.modal__sent b', signInEl).textContent = `Лист пішов на ${email}.`;
          card.classList.add('is-sent');
          $('[data-do="cancel"]', signInEl).textContent = 'Закрити';
          input.value = '';
        } catch (err) { status.textContent = err.message; input.focus(); }
      });
    }
    signInEl.module = m;
    signInEl.extra = extra || null;
    $('.modal__status', signInEl).textContent = '';
    $('.modal__card', signInEl).classList.remove('is-sent');
    $('[data-do="cancel"]', signInEl).textContent = 'Скасувати';
    signInEl.hidden = false;
    $('input', signInEl).focus();
  }

  /* ===== Shared saves: a named snapshot for the developers, with a short link (#<id>?p=<save>) =====
     One interface, two backends: Supabase's REST (plain fetch, no SDK) when REMOTE is set, else this
     browser's storage — so the panel and the links behave the same either way. A row is
     { id, module, name, author, owner, snapshot, created_at }. */
  const SHARED_KEY = STORE + 'shared';
  const localShared = {
    all: () => store.get(SHARED_KEY, []),
    async list(module) { return localShared.all().filter(p => p.module === module); },
    async get(id) { return localShared.all().find(p => p.id === id) || null; },
    async save(p) {
      const item = Object.assign({ id: Math.random().toString(36).slice(2, 10), created_at: new Date().toISOString() }, p);
      store.set(SHARED_KEY, [item].concat(localShared.all()));
      return item;
    },
    async remove(id) { store.set(SHARED_KEY, localShared.all().filter(p => p.id !== id)); },
  };
  // one call to PostgREST for every table the shell keeps: the session's token when there is one, else the anon key
  async function rest(table, query, opts) {
    const token = await auth.token();
    const headers = { apikey: REMOTE.anonKey, Authorization: 'Bearer ' + (token || REMOTE.anonKey), 'Content-Type': 'application/json', Prefer: 'return=representation' };
    const r = await fetch(`${REMOTE.url}/rest/v1/${table}${query}`, Object.assign({ headers }, opts));
    if (!r.ok) {
      // a policy says no → 401 for anon, 403 for a signed-in person (a stale token is 401 too)
      let msg = 'Supabase ' + r.status;
      try { const e = await r.json(); if (e.message) msg = e.message; } catch (e) {}
      if (r.status === 401) { if (token) auth.drop(); msg = 'потрібно увійти'; }
      if (r.status === 403) msg = 'дозволено лише людям з @' + REMOTE.domain;
      throw new Error(msg);
    }
    return r.status === 204 ? null : r.json();
  }
  // a policy that says no to an update or a delete is not an error to PostgREST — the row is just left out.
  // So both ask for the row back and treat an empty answer as the refusal it is
  const touched = rows => { if (!rows || !rows.length) throw new Error(auth.user ? 'дозволено лише авторові' : 'потрібно увійти'); return rows[0]; };
  const remoteShared = {
    list: module => rest('presets', `?module=eq.${encodeURIComponent(module)}&select=id,module,name,author,owner,created_at&order=created_at.desc`),
    get: async id => (await rest('presets', `?id=eq.${encodeURIComponent(id)}&select=*`))[0] || null,
    save: async p => (await rest('presets', '', { method: 'POST', body: JSON.stringify(p) }))[0],
    remove: async id => touched(await rest('presets', `?id=eq.${encodeURIComponent(id)}&select=id`, { method: 'DELETE' })),
  };
  const shared = REMOTE.url && REMOTE.anonKey ? remoteShared : localShared;
  const sharedLink = (m, id) => `${location.origin}${location.pathname}#${m.id}?p=${id}`;
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }); };

  function sharedStatus(m, text, bad) {
    if (!m.sharedStatusEl) return;
    m.sharedStatusEl.textContent = text || '';
    m.sharedStatusEl.classList.toggle('is-dirty', !!bad);
  }
  async function renderShared(m) {
    const box = m.sharedListEl; if (!box) return;
    let rows;
    m.sharedRendered = true;
    try { rows = await shared.list(m.id); } catch (e) { box.innerHTML = ''; sharedStatus(m, 'Не вдалося прочитати збережені: ' + e.message, true); return; }
    // only the person who saved a row may delete it (the policy says so; the shell just hides the button)
    const mine = p => !REMOTE.url || (auth.user && p.owner === auth.user.id);
    box.innerHTML = rows.length ? rows.map(p => `<div class="shared__row${mine(p) ? ' is-own' : ''}" data-id="${esc(p.id)}"><button type="button" class="shared__item" data-do="open" title="Відкрити"><b>${esc(p.name)}</b><small>${esc([p.author, when(p.created_at)].filter(Boolean).join(' · '))}</small></button><button type="button" class="icon" data-do="link" title="Скопіювати посилання">${ICON.link}</button><button type="button" class="icon" data-do="del" title="Видалити">${ICON.close}</button></div>`).join('') : '<p class="shared__empty">Ще нічого не збережено</p>';
  }
  async function openShared(m, id) {
    try {
      const item = await shared.get(id);
      if (!item) { sharedStatus(m, 'Такого збереження вже нема', true); return false; }
      restoreSnapshot(m, item.snapshot);
      history.replaceState(null, '', sharedLink(m, id));
      sharedStatus(m, `Відкрито «${item.name}»`);
      return true;
    } catch (e) { sharedStatus(m, 'Не вдалося відкрити: ' + e.message, true); return false; }
  }
  async function sharedAction(m, act, id) {
    if (act === 'open') return openShared(m, id);
    if (act === 'out') return auth.signOut();
    if (act === 'link') {
      const url = sharedLink(m, id);
      try { await navigator.clipboard.writeText(url); sharedStatus(m, 'Посилання скопійовано'); } catch (e) { prompt('Скопіюй посилання', url); }
      return;
    }
    if (act === 'del') {
      if (!confirm('Видалити це збереження для всіх?')) return;
      try { await shared.remove(id); sharedStatus(m, 'Видалено'); renderShared(m); } catch (e) { sharedStatus(m, 'Не вдалося видалити: ' + e.message, true); }
      return;
    }
    if (act === 'save') {
      const name = m.sharedNameEl.value.trim();
      if (!name) { m.sharedNameEl.focus(); sharedStatus(m, 'Дай збереженню назву', true); return; }
      if (REMOTE.url && !auth.user) return openSignIn(m);
      // the author is the signed-in person (Google's name); without a server, asked once per browser
      let author = auth.user ? auth.user.name : store.get(STORE + 'author', '');
      if (!author) { author = (prompt('Як тебе підписати в списку збережень?') || '').trim(); if (author) store.set(STORE + 'author', author); }
      try {
        const item = await shared.save({ module: m.id, name, author, snapshot: snapshot(m) });
        m.sharedNameEl.value = '';
        history.replaceState(null, '', sharedLink(m, item.id));
        sharedStatus(m, `Збережено «${item.name}», посилання в адресному рядку`);
        renderShared(m);
      } catch (e) { sharedStatus(m, 'Не вдалося зберегти: ' + e.message, true); }
    }
  }

  /* ===== Notes: annotations pinned to a module's elements =====
     A note is { id, module, selector, label, text, author, owner, done, created_at }: a CSS path from the
     module's frame to an element, and what the designer says about it — why it differs from the site,
     what to watch when porting. The pins live in .notes, a layer over the stage outside the module's
     stacking context, and follow their elements every frame while shown, so zoom, scroll and the
     module's own motion cost nothing. Same backend and sign-in as the shared saves. */
  const NOTES_KEY = STORE + 'notes';
  const localNotes = {
    all: () => store.get(NOTES_KEY, []),
    async list(module) { return localNotes.all().filter(n => n.module === module); },
    async save(n) { const item = Object.assign({ id: Math.random().toString(36).slice(2, 10), created_at: new Date().toISOString(), done: false }, n); store.set(NOTES_KEY, localNotes.all().concat([item])); return item; },
    async update(id, patch) { store.set(NOTES_KEY, localNotes.all().map(n => n.id === id ? Object.assign({}, n, patch) : n)); },
    async remove(id) { store.set(NOTES_KEY, localNotes.all().filter(n => n.id !== id)); },
    async reply(noteId, r) { const item = Object.assign({ id: Math.random().toString(36).slice(2, 10), note_id: noteId, created_at: new Date().toISOString() }, r); store.set(NOTES_KEY, localNotes.all().map(n => n.id === noteId ? Object.assign({}, n, { note_replies: (n.note_replies || []).concat([item]) }) : n)); return item; },
    async unreply(noteId, id) { store.set(NOTES_KEY, localNotes.all().map(n => n.id === noteId ? Object.assign({}, n, { note_replies: (n.note_replies || []).filter(r => r.id !== id) }) : n)); },
  };
  const remoteNotes = {
    list: module => rest('notes', `?module=eq.${encodeURIComponent(module)}&select=*,note_replies(*)&order=created_at.asc&note_replies.order=created_at.asc`),
    save: async n => (await rest('notes', '', { method: 'POST', body: JSON.stringify(n) }))[0],
    update: async (id, patch) => touched(await rest('notes', `?id=eq.${encodeURIComponent(id)}&select=id`, { method: 'PATCH', body: JSON.stringify(patch) })),
    remove: async id => touched(await rest('notes', `?id=eq.${encodeURIComponent(id)}&select=id`, { method: 'DELETE' })),
    reply: async (noteId, r) => (await rest('note_replies', '', { method: 'POST', body: JSON.stringify(Object.assign({ note_id: noteId }, r)) }))[0],
    unreply: async (noteId, id) => touched(await rest('note_replies', `?id=eq.${encodeURIComponent(id)}&select=id`, { method: 'DELETE' })),
  };
  const notesDb = REMOTE.url && REMOTE.anonKey ? remoteNotes : localNotes;
  const noteLink = (m, id) => `${location.origin}${location.pathname}#${m.id}?n=${id}`;

  // the path to an element: tag + up to two classes per step, nth-of-type only where that is ambiguous,
  // and it starts over at the nearest id. State classes (is-…, …--open, .beam) are skipped: they come and go
  const STATE_CLASS = /^(is-|has-|js-)|--(open|active|compact|dragging|on|off|hover)$|^(active|open|hover|focus|beam)$/;
  function pathTo(el, root) {
    const parts = [];
    for (let n = el; n && n !== root && n.parentElement; n = n.parentElement) {
      const tag = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(`${tag}#${CSS.escape(n.id)}`); break; }
      let s = tag + [...n.classList].filter(c => !STATE_CLASS.test(c)).slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
      const kin = [...n.parentElement.children];
      if (kin.filter(k => k.matches(s)).length > 1) s += `:nth-of-type(${kin.filter(k => k.tagName === n.tagName).indexOf(n) + 1})`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  }
  const noteTarget = (m, sel) => { try { return m.els.frame.querySelector(sel); } catch (e) { return null; } };
  // what a note is about: the pin's colour and the list's filter
  const KINDS = [
    ['change', 'Зміна', '<svg class="i" viewBox="0 0 16 16"><path d="M3 5.5h9l-2.5-2.5M13 10.5H4l2.5 2.5"/></svg>'],
    ['attention', 'Увага', '<svg class="i" viewBox="0 0 16 16"><path d="M8 2.5 14 13H2z"/><path d="M8 6.5v3.2M8 11.4v.1"/></svg>'],
    ['question', 'Питання', '<svg class="i" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M6.2 6.4a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.8.6-.8 1.2M8 11.3v.1"/></svg>'],
    ['bug', 'Баг', '<svg class="i" viewBox="0 0 16 16"><path d="M5.5 7a2.5 2.5 0 0 1 5 0v3.5a2.5 2.5 0 0 1-5 0z"/><path d="M6 4.5l-1-1.5M10 4.5l1-1.5M5.5 8.5H3M13 8.5h-2.5M5.7 11.3 4 13M10.3 11.3 12 13M3.5 5.5l2 1.2M12.5 5.5l-2 1.2"/></svg>'],
  ];
  const kindOf = k => KINDS.find(x => x[0] === k) || KINDS[0];
  const kindLabel = k => kindOf(k)[1];
  const kindIcon = k => kindOf(k)[2];
  // a small dropdown: the current kind as icon + word, a list of the four under it
  function kindPicker(value, onChange) {
    const el = h('div', 'note-kind');
    let v = value || 'change';
    const draw = () => { el.innerHTML = `<button type="button" class="note-kind__btn" data-kind="${v}" aria-haspopup="listbox" title="Тип нотатки">${kindIcon(v)}<span>${kindLabel(v)}</span>${ICON.caret}</button><div class="note-kind__menu" role="listbox" hidden>${KINDS.map(([k, l, i]) => `<button type="button" role="option" data-pick="${k}" class="${k === v ? 'is-on' : ''}" aria-selected="${k === v}">${i}<span>${l}</span></button>`).join('')}</div>`; };
    draw();
    el.addEventListener('click', e => {
      const pick = e.target.closest('[data-pick]');
      if (pick) { v = pick.dataset.pick; draw(); if (onChange) onChange(v); return; }
      if (e.target.closest('.note-kind__btn')) $('.note-kind__menu', el).hidden = !$('.note-kind__menu', el).hidden;
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('.note-kind__menu', el).hidden) { e.stopPropagation(); $('.note-kind__menu', el).hidden = true; } });
    const away = e => { if (!el.isConnected) return document.removeEventListener('click', away); if (!el.contains(e.target)) { const mm = $('.note-kind__menu', el); if (mm) mm.hidden = true; } };
    document.addEventListener('click', away);
    Object.defineProperty(el, 'value', { get: () => v });
    return el;
  }
  // the element's styles at the time of the note: what a developer would open DevTools for
  const STYLE_PROPS = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'background-color', 'border-radius', 'box-shadow', 'padding', 'gap', 'width', 'height'];
  function snapStyles(el) {
    const cs = getComputedStyle(el), out = {};
    for (const k of STYLE_PROPS) {
      let v = cs.getPropertyValue(k).trim();
      if (!v || v === 'none' || v === 'normal' || v === 'rgba(0, 0, 0, 0)' || v === '0px' || v === 'auto') continue;
      if (k === 'font-family') v = v.split(',')[0].replace(/["']/g, '');
      if (k === 'box-shadow' && v.length > 60) v = v.slice(0, 57) + '…';
      v = v.replace(/(\d+\.\d\d)\d+px/g, '$1px');
      out[k] = v;
    }
    return out;
  }
  // @name in a text: a link-looking chip; the handle is the part of the address before @
  const mentions = text => esc(text).replace(/(^|[^\w@])@([a-z0-9][a-z0-9._-]*[a-z0-9])/gi, '$1<mark class="note-at">@$2</mark>');
  let people = null; // handles seen in notes and replies, for the suggestions under a field
  async function loadPeople() {
    if (people) return people;
    try { people = REMOTE.url ? (await rest('note_people', '?select=handle')).map(r => r.handle) : []; } catch (e) { people = []; }
    return people;
  }
  // typing @ in a field: the matching handles under it, a click or Tab completes
  function mentionable(field, host) {
    const box = h('div', 'note-at__list'); box.hidden = true; host.append(box);
    const at = () => { const v = field.value.slice(0, field.selectionStart); const mm = v.match(/(?:^|\s)@([a-z0-9._-]*)$/i); return mm ? mm[1].toLowerCase() : null; };
    const refresh = async () => {
      const q = at(); if (q === null) { box.hidden = true; return; }
      const list = (await loadPeople()).filter(hd => hd.toLowerCase().startsWith(q) && hd.toLowerCase() !== q).slice(0, 6);
      box.innerHTML = list.map(hd => `<button type="button" data-handle="${esc(hd)}">@${esc(hd)}</button>`).join('');
      box.hidden = !list.length;
    };
    const pick = hd => { const v = field.value, i = field.selectionStart; const head = v.slice(0, i).replace(/@[a-z0-9._-]*$/i, '@' + hd + ' '); field.value = head + v.slice(i); field.focus(); field.setSelectionRange(head.length, head.length); box.hidden = true; };
    field.addEventListener('input', refresh);
    field.addEventListener('keydown', e => { if (!box.hidden && (e.key === 'Tab' || (e.key === 'Enter' && box.children.length === 1))) { e.preventDefault(); pick(box.firstElementChild.dataset.handle); } if (e.key === 'Escape' && !box.hidden) { e.stopPropagation(); box.hidden = true; } });
    box.addEventListener('mousedown', e => { const b = e.target.closest('[data-handle]'); if (b) { e.preventDefault(); pick(b.dataset.handle); } });
    field.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  }
  const noteLabel = sel => sel.split(' > ').pop().replace(/:nth-of-type\(\d+\)/, '');
  // a region: fractions of the element's box, so it follows the element through any width
  const areaOf = (r, box) => ({ x: +((box.left - r.left) / r.width).toFixed(4), y: +((box.top - r.top) / r.height).toFixed(4), w: +(box.width / r.width).toFixed(4), h: +(box.height / r.height).toFixed(4) });
  const rectOf = (r, a) => { if (!a) return r; const left = r.left + r.width * a.x, top = r.top + r.height * a.y, width = r.width * a.w, height = r.height * a.h; return { left, top, width, height, right: left + width, bottom: top + height }; };
  const noteRect = (m, row) => { const t = noteTarget(m, row.selector); return t ? rectOf(t.getBoundingClientRect(), row.area) : null; };
  const noteName = row => (row.area ? 'область у ' : '') + (row.label || noteLabel(row.selector));
  // what has been looked at in this browser: a pin gets a dot when a note has replies it has not shown yet
  const SEEN_KEY = STORE + 'seen';
  const seenReplies = id => store.get(SEEN_KEY, {})[id] || 0;
  const markSeen = row => { const all = store.get(SEEN_KEY, {}); all[row.id] = (row.note_replies || []).length; store.set(SEEN_KEY, all); };
  const noteMine = row => !REMOTE.url || (auth.user && row.owner === auth.user.id);

  async function loadNotes(m) {
    const n = m.notes;
    try { n.rows = await notesDb.list(m.id); } catch (e) { n.rows = []; notesStatus(m, 'Не вдалося прочитати нотатки: ' + e.message, true); }
    buildPins(m);
    renderNotesList(m);
    syncToolbar();
  }
  function notesStatus(m, text, bad) {
    if (!m.notesStatusEl) return;
    m.notesStatusEl.textContent = text || '';
    m.notesStatusEl.classList.toggle('is-dirty', !!bad);
  }
  // one pin + one outline per row; the card is built when the pin opens
  function buildPins(m) {
    const n = m.notes, layer = m.els.notes;
    for (const p of n.pins) { p.el.remove(); p.box.remove(); if (p.card) p.card.remove(); if (p.peek) p.peek.remove(); }
    n.pins = n.rows.map((row, i) => {
      const el = h('button', 'note-pin', String(i + 1)); el.type = 'button'; el.dataset.kind = row.kind || 'change';
      el.classList.toggle('has-new', (row.note_replies || []).length > seenReplies(row.id));
      const box = h('div', 'note-box');
      el.addEventListener('pointerenter', () => { p.hover = true; if (!p.card && !p.peek) { p.peek = notePeek(m, p); layer.append(p.peek); } });
      el.addEventListener('pointerleave', () => { p.hover = false; if (p.peek) { p.peek.remove(); p.peek = null; } });
      el.addEventListener('click', e => { e.stopPropagation(); toggleNote(m, row.id); });
      const p = { row, el, box, card: null, hover: false };
      layer.append(box, el);
      return p;
    });
    n.pins.forEach(p => { p.el.classList.toggle('is-done', !!p.row.done); });
    if (n.open && !n.pins.some(p => p.row.id === n.open)) n.open = null;
  }
  function pinOf(m, id) { return m.notes.pins.find(p => p.row.id === id); }
  function toggleNote(m, id) {
    const n = m.notes;
    if (n.open === id) { closeNote(m); return; }
    closeNote(m);
    const p = pinOf(m, id); if (!p) return;
    n.open = id;
    p.el.classList.add('is-open');
    p.el.classList.remove('has-new'); markSeen(p.row);
    if (p.peek) { p.peek.remove(); p.peek = null; }
    p.card = noteCard(m, p);
    m.els.notes.append(p.card);
    if (m === active) syncNotebar();
  }
  function closeNote(m) {
    const n = m.notes;
    const p = n.open && pinOf(m, n.open);
    if (p && p.card) { p.card.remove(); p.card = null; p.el.classList.remove('is-open'); }
    n.open = null;
    if (m === active) syncNotebar();
  }
  // from the list or a link: the layer on, the element in view, the card open
  function openNote(m, id) {
    if (!tools.notes) setTool('notes', true);
    const p = pinOf(m, id); if (!p) return;
    const t = noteTarget(m, p.row.selector);
    if (!t) { notesStatus(m, 'Елемента цієї нотатки вже нема — «Вказати» прив\'яже її знову', true); return; }
    if (t) t.scrollIntoView({ block: 'center', inline: 'center' });
    if (m.notes.open !== id) toggleNote(m, id);
  }
  // a person on the card: initials in a tinted circle, the name, the time
  const initials = name => (name || '?').split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const person = (name, iso) => `<span class="note-card__avatar">${esc(initials(name))}</span><span class="note-card__who"><b>${esc(name || 'хтось')}</b><small>${esc(when(iso))}</small></span>`;
  const NOTE_ICON = {
    check: '<svg class="i" viewBox="0 0 16 16"><path d="m3.5 8.5 3 3 6-7"/></svg>',
    more: '<svg class="i" viewBox="0 0 16 16"><circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    send: '<svg class="i" viewBox="0 0 16 16"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"/></svg>',
    trash: '<svg class="i" viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5v-1h3v1M4.5 4.5l.6 8h5.8l.6-8"/></svg>',
    pen: '<svg class="i" viewBox="0 0 16 16"><path d="m10.5 3 2.5 2.5-7 7H3.5V10z"/></svg>',
    aim: '<svg class="i" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.5"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3"/></svg>',
  };
  // the card is a thread, after Figma's comments: who and when, the text, what it is pinned to, the
  // replies, a field to answer in; resolve and a menu (link, edit and delete for the author) up top
  function noteCard(m, p) {
    const row = p.row;
    const card = h('div', 'note-card' + (row.done ? ' is-done' : ''));
    card.addEventListener('pointerenter', () => { p.cardHover = true; });
    card.addEventListener('pointerleave', () => { p.cardHover = false; const menu = $('.note-card__menu', card); if (menu) menu.hidden = true; });
    const render = () => {
      const mine = noteMine(row);
      card.classList.toggle('is-done', !!row.done);
      card.innerHTML = `<div class="note-card__head">${person(row.author, row.created_at)}<span class="note-card__tools">
          <button type="button" class="icon${row.done ? ' is-on' : ''}" data-do="done" title="${row.done ? 'Знову відкрити' : 'Вирішено'}">${NOTE_ICON.check}</button>
          <button type="button" class="icon" data-do="menu" title="Ще" aria-haspopup="menu">${NOTE_ICON.more}</button>
          <button type="button" class="icon" data-do="close" title="Закрити (Esc)">${ICON.close}</button></span></div>
        <div class="note-card__menu" hidden><button type="button" data-do="link">${ICON.link}Скопіювати посилання</button>${row.snapshot ? `<button type="button" data-do="state">${ICON.reset}Показати стан нотатки</button>` : ''}${mine ? `<button type="button" data-do="edit">${NOTE_ICON.pen}Редагувати текст і тип</button><button type="button" data-do="repoint">${NOTE_ICON.aim}Перев'язати до іншого</button><button type="button" class="is-bad" data-do="del">${NOTE_ICON.trash}Видалити</button>` : ''}</div>
        <div class="note-card__text">${mentions(row.text)}</div>
        <div class="note-card__chips"><span class="note-card__kind" data-kind="${esc(row.kind || 'change')}">${kindIcon(row.kind)}${esc(kindLabel(row.kind))}</span><code class="note-card__sel" title="${esc(row.selector)}">${esc(noteName(row))}</code></div>
        ${row.styles && Object.keys(row.styles).length ? `<details class="note-card__styles"><summary>Стилі елемента <small>${Object.keys(row.styles).length}</small></summary><dl>${Object.entries(row.styles).sort((a, b) => STYLE_PROPS.indexOf(a[0]) - STYLE_PROPS.indexOf(b[0])).map(([k, v]) => `<dt>${esc(k)}</dt><dd title="${esc(v)}">${esc(v)}</dd>`).join('')}</dl></details>` : ''}
        ${(row.note_replies || []).length ? `<div class="note-card__thread">${row.note_replies.map(r => `<div class="note-card__reply" data-reply="${esc(r.id)}"><div class="note-card__head">${person(r.author, r.created_at)}${!REMOTE.url || (auth.user && r.owner === auth.user.id) ? `<button type="button" class="icon" data-do="unreply" title="Видалити відповідь">${ICON.close}</button>` : ''}</div><div class="note-card__text">${mentions(r.text)}</div></div>`).join('')}</div>` : ''}
        <form class="note-card__answer"><input type="text" placeholder="Відповісти…" maxlength="600" autocomplete="off"><button type="submit" class="icon" title="Надіслати (Enter)">${NOTE_ICON.send}</button></form>`;
      mentionable($('form input', card), $('form', card));
      $('form', card).addEventListener('submit', async e => {
        e.preventDefault();
        const input = $('form input', card), text = input.value.trim();
        if (!text) return;
        if (REMOTE.url && !auth.user) { openSignIn(m); return; }
        try {
          const r = await notesDb.reply(row.id, { text, author: auth.user ? auth.user.name : store.get(STORE + 'author', '') || null });
          row.note_replies = (row.note_replies || []).concat([r]);
          markSeen(row);
          render(); renderNotesList(m); $('input', card).focus();
        } catch (err) { notesStatus(m, 'Не вдалося відповісти: ' + err.message, true); }
      });
    };
    const edit = () => {
      const t = $('.note-card__text', card);
      const ta = h('textarea', 'note-card__edit'); ta.value = row.text; ta.rows = 3; ta.maxLength = 600;
      const rowEl = h('div', 'note-card__row'); rowEl.innerHTML = `<span></span><span class="note-card__tools"><button type="button" data-do="cancel-edit">Скасувати</button><button type="button" class="primary" data-do="save-edit">Зберегти</button></span>`;
      const kp = kindPicker(row.kind || 'change'); rowEl.firstElementChild.replaceWith(kp); card.kindPicker = kp;
      t.replaceWith(ta); ta.after(rowEl); ta.focus(); mentionable(ta, card);
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('[data-do="save-edit"]', card).click(); if (e.key === 'Escape') { e.stopPropagation(); render(); } });
    };
    card.addEventListener('click', async e => {
      const b = e.target.closest('[data-do]'); if (!b) return;
      const act = b.dataset.do, menu = $('.note-card__menu', card);
      if (act !== 'menu' && menu) menu.hidden = true;
      if (act === 'close') closeNote(m);
      else if (act === 'menu') menu.hidden = !menu.hidden;
      else if (act === 'done') {
        if (REMOTE.url && !auth.user) { openSignIn(m); return; }
        const done = !row.done;
        try { await notesDb.update(row.id, { done }); row.done = done; p.el.classList.toggle('is-done', done); render(); renderNotesList(m); syncNotebar(); }
        catch (err) { notesStatus(m, 'Не вдалося позначити: ' + err.message, true); }
      }
      else if (act === 'link') { const url = noteLink(m, row.id); try { await navigator.clipboard.writeText(url); notesStatus(m, 'Посилання скопійовано'); } catch (err) { prompt('Скопіюй посилання', url); } }
      else if (act === 'state') { restoreSnapshot(m, row.snapshot); notesStatus(m, 'Стан на момент нотатки'); }
      else if (act === 'edit') edit();
      else if (act === 'cancel-edit') render();
      else if (act === 'save-edit') {
        const text = $('textarea', card).value.trim(); if (!text) return;
        const kind = card.kindPicker ? card.kindPicker.value : (row.kind || 'change');
        try { await notesDb.update(row.id, { text, kind }); row.text = text; row.kind = kind; p.el.dataset.kind = kind; render(); renderNotesList(m); }
        catch (err) { notesStatus(m, 'Не вдалося зберегти: ' + err.message, true); }
      }
      else if (act === 'repoint') { closeNote(m); startPick(m, row); }
      else if (act === 'del') {
        if (!confirm('Видалити цю нотатку для всіх?')) return;
        try { await notesDb.remove(row.id); closeNote(m); m.notes.rows = m.notes.rows.filter(r => r.id !== row.id); buildPins(m); renderNotesList(m); syncToolbar(); }
        catch (err) { notesStatus(m, 'Не вдалося видалити: ' + err.message, true); }
      }
      else if (act === 'unreply') {
        const id = b.closest('[data-reply]').dataset.reply;
        try { await notesDb.unreply(row.id, id); row.note_replies = row.note_replies.filter(r => r.id !== id); render(); renderNotesList(m); }
        catch (err) { notesStatus(m, 'Не вдалося видалити: ' + err.message, true); }
      }
    });
    render();
    return card;
  }
  // a glance at a pin: the text, without opening the thread
  function notePeek(m, p) {
    const el = h('div', 'note-peek');
    const nr = (p.row.note_replies || []).length, unseen = nr > seenReplies(p.row.id);
    el.innerHTML = `<div class="note-card__head">${person(p.row.author, p.row.created_at)}</div><div class="note-peek__text">${esc(p.row.text)}</div>${nr ? `<small${unseen ? ' class="is-new"' : ''}>${nr} відп.${unseen ? ' · є нові' : ''}</small>` : ''}`;
    return el;
  }

  // a new note: pick an element under the pointer, then say what about it
  function startPick(m, rebind) {
    const n = m.notes;
    cancelPick(m);
    if (!tools.notes) setTool('notes', true);
    if (!tools.notebar) setTool('notebar', true);
    n.pick = { el: null, box: h('div', 'note-box note-box--pick'), tag: h('div', 'note-tag'), rebind: rebind || null, down: null, drag: null };
    m.els.notes.append(n.pick.box, n.pick.tag);
    m.els.notes.classList.add('is-picking');
    notesStatus(m, (rebind ? `Вкажи заново, до чого нотатка «${rebind.text.slice(0, 30)}»: ` : '') + 'клацни елемент або обведи область. Esc — скасувати');
  }
  // the region being drawn: from the point the button went down to the pointer
  function pickDown(m, e) {
    const n = m.notes; if (!n.pick || e.button !== 0 || e.target.closest('.note-card')) return;
    n.pick.down = { x: e.clientX, y: e.clientY };
  }
  function pickDrag(m, e) {
    const n = m.notes; if (!n.pick || !n.pick.down) return;
    const d = n.pick.down, dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!n.pick.drag && Math.hypot(dx, dy) < 5) return;
    const sr = m.els.stage.getBoundingClientRect();
    const left = Math.min(d.x, e.clientX), top = Math.min(d.y, e.clientY);
    n.pick.drag = { left, top, width: Math.abs(dx), height: Math.abs(dy), right: left + Math.abs(dx), bottom: top + Math.abs(dy) };
    n.pick.tag.textContent = `${Math.round(n.pick.drag.width)} × ${Math.round(n.pick.drag.height)}`;
    void sr;
  }
  function pickUp(m, e) {
    const n = m.notes; if (!n.pick || !n.pick.down) return;
    const drag = n.pick.drag; n.pick.down = null; n.pick.drag = null;
    if (!drag) return; // a click: the click handler takes the element
    n.pick.wasDrag = true;
    if (drag.width < 8 || drag.height < 8) return;
    // the region belongs to the smallest element that holds it whole, so it follows that element's box
    let el = underPointer(m, drag.left + drag.width / 2, drag.top + drag.height / 2) || m.els.frame.firstElementChild;
    const holds = x => { const r = x.getBoundingClientRect(); return r.left <= drag.left + 1 && r.top <= drag.top + 1 && r.right >= drag.right - 1 && r.bottom >= drag.bottom - 1; };
    while (el && el !== m.els.frame && !holds(el)) el = el.parentElement;
    if (!el || el === m.els.frame) el = m.els.frame.firstElementChild;
    if (!el) return;
    const area = areaOf(el.getBoundingClientRect(), drag);
    if (n.pick.rebind) rebindNote(m, n.pick.rebind, el, area); else startCompose(m, el, '', area);
  }
  async function rebindNote(m, row, el, area) {
    const selector = pathTo(el, m.els.frame), label = noteLabel(selector);
    try {
      await notesDb.update(row.id, { selector, label, area: area || null });
      Object.assign(row, { selector, label, area: area || null });
      cancelPick(m); buildPins(m); renderNotesList(m); openNote(m, row.id);
      notesStatus(m, 'Нотатку перев\'язано');
    } catch (e) { notesStatus(m, 'Не вдалося перев\'язати: ' + e.message, true); }
  }
  function cancelPick(m) {
    const n = m.notes;
    if (n.pick) { n.pick.box.remove(); n.pick.tag.remove(); n.pick = null; }
    if (n.compose) { n.compose.card.remove(); n.compose.box.remove(); n.compose = null; }
    m.els.notes.classList.remove('is-picking');
  }
  // what the pointer is over inside the frame; the layer itself and the shell's chrome are skipped, and a
  // bare text or icon child yields to the button, link or box it sits in — that is what one means
  const INLINE = 'span, b, i, u, em, strong, small, code, svg, svg *, ws-icon, path';
  function underPointer(m, x, y) {
    const frame = m.els.frame;
    for (let el of document.elementsFromPoint(x, y)) {
      if (el === frame || !frame.contains(el)) continue;
      while (el.parentElement !== frame && el.matches(INLINE)) el = el.parentElement;
      return el;
    }
    return null;
  }
  function pickMove(m, e) {
    const n = m.notes; if (!n.pick) return;
    n.pick.el = underPointer(m, e.clientX, e.clientY);
    n.pick.tag.textContent = n.pick.el ? noteLabel(pathTo(n.pick.el, m.els.frame)) : '';
  }
  function pickChoose(m, e) {
    const n = m.notes; if (!n.pick) return;
    const el = underPointer(m, e.clientX, e.clientY); if (!el) return;
    if (n.pick.rebind) rebindNote(m, n.pick.rebind, el, null); else startCompose(m, el);
  }
  function startCompose(m, el, text, area) {
    const n = m.notes;
    cancelPick(m);
    m.els.notes.classList.add('is-picking'); // still a modal moment on the stage
    const card = h('div', 'note-card note-card--compose');
    card.innerHTML = `<div class="note-card__head">${auth.user ? person(auth.user.name, new Date().toISOString()) : '<span class="note-card__avatar">?</span><span class="note-card__who"><b>Нова нотатка</b><small>до елемента</small></span>'}</div>
      <textarea rows="3" placeholder="Що тут не так, як на сайті, або на що звернути увагу. @ім'я — сказати комусь" maxlength="600"></textarea>
      <code class="note-card__sel"></code>
      <div class="note-card__row"><button type="button" data-do="up" title="Взяти батьківський елемент">Ширше</button><span class="note-card__tools"><button type="button" data-do="cancel">Скасувати</button><button type="button" class="primary" data-do="save">Зберегти</button></span></div>`;
    n.compose = { el, card, box: h('div', 'note-box note-box--pick'), hover: false, last: null, area: area || null };
    card.addEventListener('pointerenter', () => { n.compose.hover = true; });
    card.addEventListener('pointerleave', () => { n.compose.hover = false; });
    const sel = () => pathTo(n.compose.el, m.els.frame);
    const label = $('code', card), ta = $('textarea', card);
    const relabel = () => { label.textContent = (n.compose.area ? 'область у ' : '') + noteLabel(sel()); label.title = sel(); };
    if (area) $('[data-do="up"]', card).hidden = true; // a region is already what it is
    relabel();
    if (text) ta.value = text;
    mentionable(ta, card);
    const kp = kindPicker('change'); $('.note-card__head', card).append(kp);
    card.addEventListener('click', e => {
      if (e.target.closest('.note-kind')) return;
      const b = e.target.closest('[data-do]'); if (!b) return;
      if (b.dataset.do === 'cancel') cancelPick(m);
      else if (b.dataset.do === 'up') { const up = n.compose.el.parentElement; if (up && up !== m.els.frame) { n.compose.el = up; relabel(); } }
      else if (b.dataset.do === 'save') saveNote(m, { selector: sel(), label: noteLabel(sel()), area: n.compose.area, text: ta.value.trim(), kind: kp.value, styles: n.compose.area ? null : snapStyles(n.compose.el), snapshot: snapshot(m) });
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('[data-do="save"]', card).click(); } if (e.key === 'Escape') { e.stopPropagation(); cancelPick(m); } });
    m.els.notes.append(n.compose.box, card);
    ta.focus();
  }
  async function saveNote(m, note) {
    if (!note.text) { notesStatus(m, 'Напиши, що тут не так', true); return; }
    if (REMOTE.url && !auth.user) { openSignIn(m, { note }); return; }
    try {
      const row = await notesDb.save({ module: m.id, selector: note.selector, label: note.label, area: note.area || null, text: note.text, kind: note.kind || 'change', styles: note.styles || null, snapshot: note.snapshot || null, author: auth.user ? auth.user.name : store.get(STORE + 'author', '') || null });
      people = null; // a new author may be among the handles now
      cancelPick(m);
      m.notes.rows = (m.notes.rows || []).concat([row]);
      buildPins(m); renderNotesList(m); syncToolbar();
      if (!tools.notes) setTool('notes', true);
      toggleNote(m, row.id);
      notesStatus(m, 'Нотатку збережено');
    } catch (e) { notesStatus(m, 'Не вдалося зберегти: ' + e.message, true); }
  }

  // every frame while the layer shows: pins on their elements, the open card beside its pin,
  // anything scrolled out of the stage's window hidden with it
  const ptr = { x: -1, y: -1 };
  document.addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
  const overPin = r => ptr.x >= r.left - 7 && ptr.x <= r.left + 29 && ptr.y >= r.top - 29 && ptr.y <= r.top + 7; // the 22 px pin above the corner, plus its hit area
  function drawNotes(m) {
    const n = m.notes, layer = m.els.notes;
    const on = tools.notes || !!n.pick || !!n.compose;
    layer.hidden = !on;
    if (!on) return;
    const sr = m.els.stage.getBoundingClientRect(), br = m.els.body.getBoundingClientRect();
    const seen = r => r.bottom > br.top && r.top < br.bottom && r.right > br.left && r.left < br.right;
    // the position is the `translate` property, not `transform`: the pin scales on hover, and a scale
    // multiplies whatever `transform` holds (the offset would fly by 12 %), while `translate` comes first
    const put = (el, r, dx, dy) => { el.style.translate = `${Math.round(r.left - sr.left + (dx || 0))}px ${Math.round(r.top - sr.top + (dy || 0))}px`; };
    const fit = (box, r) => { put(box, r); box.style.width = r.width + 'px'; box.style.height = r.height + 'px'; };
    // the card stands beside what it is about, never over it: to the right, else left, else under,
    // else above; the wire then runs from the pin to the card's nearest edge
    const beside = (card, r, pinAt) => {
      const w = card.offsetWidth || 288, hh = card.offsetHeight || 80, G = 14;
      const L = r.left - sr.left, T = r.top - sr.top, R = r.right - sr.left, B = r.bottom - sr.top;
      let x, y;
      if (R + G + w <= sr.width - 8) { x = R + G; y = T - 8; }
      else if (L - G - w >= 8) { x = L - G - w; y = T - 8; }
      else if (B + G + hh <= sr.height - 8) { x = L; y = B + G; }
      else { x = L; y = T - G - hh; }
      x = Math.min(Math.max(8, x), Math.max(8, sr.width - 8 - w));
      y = Math.min(Math.max(8, y), Math.max(8, sr.height - 8 - hh));
      card.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
      if (!pinAt) return;
      // the wire: from the pin's centre to the middle of the card's edge that faces it
      const px = pinAt.x - sr.left, py = pinAt.y - sr.top;
      const ex = px < x ? x : px > x + w ? x + w : px, ey = py < y ? y : py > y + hh ? y + hh : py;
      const cx = Math.min(Math.max(px, x), x + w), cy = Math.min(Math.max(py, y), y + hh);
      wire(px, py, px < x || px > x + w ? ex : cx, py < y || py > y + hh ? ey : cy);
    };
    let wireEl = layer.querySelector('.note-wire');
    if (!wireEl) { wireEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); wireEl.setAttribute('class', 'note-wire'); layer.prepend(wireEl); }
    wireEl.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`); wireEl.style.width = sr.width + 'px'; wireEl.style.height = sr.height + 'px';
    let wired = false;
    const wire = (x1, y1, x2, y2) => { wired = true; wireEl.innerHTML = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><circle cx="${x2}" cy="${y2}" r="2.5"/>`; };
    for (const p of n.pins) {
      const t = noteTarget(m, p.row.selector);
      const elRect = t && t.getBoundingClientRect();
      const live = t && rectOf(elRect, p.row.area);
      // A pin overlaps its element, so pointing at it ends the element's hover; if the element moves
      // on hover (a lifted card, a scaled screenshot), the pin would slide out from under the pointer,
      // the hover would return, and so on — a flicker. So while the pointer is inside the pin (its
      // last drawn box, not the browser's hover, which lags a moving element) or on its card, the pin
      // stays where it was; the outline keeps following the element.
      const held = (p.last && overPin(p.last)) || p.cardHover;
      const r = held && p.last ? p.last : live;
      // a region's card keeps clear of the whole element the region sits in, so neighbours stay visible
      const avoidLive = p.row.area ? elRect : live;
      const avoid = held && p.lastAvoid ? p.lastAvoid : avoidLive;
      if (!held) { p.last = live; p.lastAvoid = avoidLive; }
      const show = !!r && seen(r) && !(r.width === 0 && r.height === 0);
      p.el.hidden = !show;
      p.box.hidden = !show || !(p.hover || n.open === p.row.id);
      if (p.card) p.card.hidden = !show;
      if (!show) continue;
      put(p.el, r, 0, -22); // bottom-left corner of the pin on the element's top-left corner
      p.box.classList.toggle('note-box--area', !!p.row.area);
      if (live) fit(p.box, live);
      // a region's card keeps clear of the whole element the region sits in, so neighbours stay visible
      if (p.card) beside(p.card, avoid || r, { x: r.left + 11, y: r.top - 11 });
      if (p.peek) beside(p.peek, r);
    }
    if (n.pick) {
      const r = n.pick.drag || (n.pick.el && n.pick.el.getBoundingClientRect());
      n.pick.box.hidden = !r; n.pick.tag.hidden = !r;
      n.pick.box.classList.toggle('note-box--area', !!n.pick.drag);
      if (r) { fit(n.pick.box, r); put(n.pick.tag, r, 0, -22); }
    }
    if (n.compose) {
      const elRect = n.compose.el.getBoundingClientRect(), live = rectOf(elRect, n.compose.area);
      const r = n.compose.hover && n.compose.last ? n.compose.last : live; // same hold while typing
      const avoid = n.compose.hover && n.compose.lastAvoid ? n.compose.lastAvoid : (n.compose.area ? elRect : live);
      if (!n.compose.hover) { n.compose.last = live; n.compose.lastAvoid = n.compose.area ? elRect : live; }
      n.compose.box.classList.toggle('note-box--area', !!n.compose.area);
      fit(n.compose.box, live);
      beside(n.compose.card, avoid, { x: r.left, y: r.top });
    }
    if (!wired) wireEl.innerHTML = '';
  }
  function notesLoop() {
    if (active && !active.els.app.hidden && active.notes) drawNotes(active);
    requestAnimationFrame(notesLoop);
  }

  // the panel's list: every note, in order, with the ones whose element is gone marked
  function renderNotesList(m) {
    const box = m.notesListEl; if (!box) return;
    const rows = m.notes.rows || [];
    const f = m.notes.filter || 'all';
    const counts = Object.fromEntries(KINDS.map(([k]) => [k, rows.filter(r => (r.kind || 'change') === k).length]));
    if (m.notesFilterEl) {
      m.notesFilterEl.hidden = rows.length < 2;
      m.notesFilterEl.innerHTML = [['all', 'Усі', rows.length]].concat(KINDS.map(([k, l]) => [k, l, counts[k]])).filter(([k, , c]) => k === 'all' || c).map(([k, l, c]) => `<button type="button" data-filter="${k}" class="${f === k ? 'is-on' : ''}">${l} <small>${c}</small></button>`).join('');
    }
    box.innerHTML = rows.length ? rows.map((r, i) => {
      if (f !== 'all' && (r.kind || 'change') !== f) return '';
      const lost = !noteTarget(m, r.selector);
      return `<div class="notes__row${r.done ? ' is-done' : ''}${lost ? ' is-lost' : ''}" data-id="${esc(r.id)}" data-kind="${esc(r.kind || 'change')}"><button type="button" class="notes__item" data-do="open" title="${esc(lost ? 'Елемент не знайдено: ' + r.selector : r.selector)}"><b>${i + 1}</b><span>${esc(r.text)}</span><small>${esc([noteName(r), r.author, (r.note_replies || []).length ? r.note_replies.length + ' відп.' : '', lost ? 'елемента вже нема' : ''].filter(Boolean).join(' · '))}</small></button>${lost ? `<button type="button" class="notes__rebind" data-do="rebind" title="Вказати елемент або область заново">Вказати</button>` : ''}${noteMine(r) ? `<button type="button" class="icon" data-do="del" title="Видалити">${ICON.close}</button>` : ''}</div>`;
    }).join('') : '<p class="shared__empty">Ще нема нотаток: «Нотатка» внизу сцени — і клацни елемент</p>';
    if (m === active) syncNotebar();
  }
  // the bar under the stage: the toggle with the count of what is still to do, prev / next through the
  // pins, «new» and the Markdown copy
  function syncNotebar() {
    const m = active; if (!m) return;
    const rows = m.notes.rows || [], todo = rows.filter(r => !r.done).length;
    const i = m.notes.open ? rows.findIndex(r => r.id === m.notes.open) : -1;
    els['nb-toggle'].classList.toggle('is-on', tools.notes);
    els['nb-count'].textContent = els['nb-count-min'].textContent = todo;
    els['nb-count'].hidden = !todo; els['nb-count-min'].hidden = !todo || tools.notebar;
    els.notebar.classList.toggle('is-min', !tools.notebar);
    els['nb-fold'].title = tools.notebar ? 'Згорнути' : 'Нотатки до елементів' + (todo ? `: ${todo} до роботи` : '');
    els['nb-pos'].textContent = rows.length ? (i >= 0 ? `${i + 1} / ${rows.length}` : String(rows.length)) : '–';
    els['nb-prev'].disabled = els['nb-next'].disabled = rows.length < 2 && i >= 0 || !rows.length;
    els.notebar.classList.toggle('is-off', !tools.notes);
  }
  function stepNote(m, d) {
    const rows = m.notes.rows || []; if (!rows.length) return;
    const i = m.notes.open ? rows.findIndex(r => r.id === m.notes.open) : -1;
    openNote(m, rows[(i + d + rows.length) % rows.length].id);
  }
  async function notesAction(m, act, id) {
    if (act === 'new') return startPick(m);
    if (act === 'copy') {
      const rows = m.notes.rows || [];
      const md = rows.map((r, i) => `- [${r.done ? 'x' : ' '}] ${i + 1}. \`${noteName(r)}\` — ${r.text}${r.author ? ` (${r.author})` : ''}`).join('\n');
      try { await navigator.clipboard.writeText(`## ${m.def.title}\n${md}`); notesStatus(m, 'Список скопійовано як Markdown'); } catch (e) { prompt('Скопіюй', md); }
      return;
    }
    if (act === 'open') return openNote(m, id);
    if (act === 'rebind') { const row = (m.notes.rows || []).find(r => r.id === id); if (row) startPick(m, row); return; }
    if (act === 'del') {
      if (!confirm('Видалити цю нотатку для всіх?')) return;
      try { await notesDb.remove(id); if (m.notes.open === id) closeNote(m); m.notes.rows = m.notes.rows.filter(r => r.id !== id); buildPins(m); renderNotesList(m); syncToolbar(); }
      catch (e) { notesStatus(m, 'Не вдалося видалити: ' + e.message, true); }
    }
  }

  /* ===== The bell: what happened to my notes =====
     A row per thing to tell the signed-in person: a reply under their note, or @their.name in a text.
     The database writes them (a trigger, presets.sql); the shell only reads its own and marks them
     read. Polled once a minute while signed in; the bell sits next to the home button. */
  const bell = { rows: [], timer: 0 };
  async function loadBell() {
    if (!REMOTE.url || !auth.user) { bell.rows = []; syncBell(); return; }
    try { bell.rows = await rest('notifications', '?select=*&order=created_at.desc&limit=40'); } catch (e) { bell.rows = []; }
    syncBell();
  }
  function syncBell() {
    const on = !!(REMOTE.url && auth.user);
    els['btn-bell'].hidden = !on;
    const unread = bell.rows.filter(r => !r.read).length;
    els['bell-n'].textContent = unread; els['bell-n'].hidden = !unread;
    els['btn-bell'].title = unread ? `${unread} нов${unread === 1 ? 'е' : unread < 5 ? 'і' : 'их'} — відповіді та згадки` : 'Сповіщення: відповіді під твоїми нотатками та згадки';
    if (!on) { clearInterval(bell.timer); bell.timer = 0; }
    else if (!bell.timer) bell.timer = setInterval(loadBell, 60000);
    if (!els.bell.hidden) renderBell();
  }
  function renderBell() {
    const box = $('.bell__list', els.bell);
    const rows = bell.rows;
    box.innerHTML = rows.length ? rows.map(r => `<button type="button" class="bell__item${r.read ? '' : ' is-new'}" data-id="${esc(r.id)}" data-module="${esc(r.module)}" data-note="${esc(r.note_id)}">
        <span class="note-card__avatar">${esc(initials(r.from_author))}</span>
        <span class="bell__body"><b>${esc(r.from_author || 'хтось')}</b> ${r.kind === 'reply' ? 'відповів під твоєю нотаткою' : 'згадав тебе'} <em>${esc((byId[r.module] || {}).def ? byId[r.module].def.tab || byId[r.module].def.title : r.module)}</em><span class="bell__text">${esc(r.text || '')}</span><small>${esc(when(r.created_at))}</small></span></button>`).join('')
      : '<p class="shared__empty">Поки тихо: тут будуть відповіді під твоїми нотатками та згадки @' + esc(auth.user ? auth.user.name : '') + '</p>';
    $('.bell__all', els.bell).hidden = !rows.some(r => !r.read);
  }
  async function markBell(ids) {
    if (!ids.length) return;
    bell.rows.forEach(r => { if (ids.includes(r.id)) r.read = true; });
    syncBell();
    try { await rest('notifications', `?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id`, { method: 'PATCH', body: JSON.stringify({ read: true }) }); } catch (e) {}
  }
  function openBell(on) {
    const show = on == null ? els.bell.hidden : on;
    els.bell.hidden = !show;
    els['btn-bell'].classList.toggle('is-on', show);
    if (show) { renderBell(); loadBell(); }
  }
  function buildBell() {
    els['btn-bell'].addEventListener('click', e => { e.stopPropagation(); closeMenu(); openBell(); });
    els.bell.addEventListener('click', e => {
      const all = e.target.closest('.bell__all');
      if (all) { markBell(bell.rows.filter(r => !r.read).map(r => r.id)); return; }
      const it = e.target.closest('.bell__item'); if (!it) return;
      markBell([it.dataset.id]);
      openBell(false);
      location.hash = `#${it.dataset.module}?n=${it.dataset.note}`;
    });
    document.addEventListener('click', e => { if (!els.bell.hidden && !e.target.closest('#bell, #btn-bell')) openBell(false); });
  }

  /* ===== Resizable frame: drag either edge, the frame stays centred ===== */
  function makeResizable(m, frame) {
    const el = h('div', 'rz');
    el.append(frame);
    const maxW = () => {
      const p = el.parentNode; if (!p) return 0;
      const st = getComputedStyle(p);
      return (p.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)) / tools.zoom;
    };
    // the height the frame could have: the body minus its padding and minus
    // whatever else is rendered in it (the hint, and the gap it brings)
    const maxH = () => {
      const p = el.parentNode; if (!p) return 0;
      const st = getComputedStyle(p);
      let h = p.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
      const gap = parseFloat(st.rowGap) || 0;
      for (const sib of p.children) if (sib !== el && sib.offsetParent !== null) h -= sib.offsetHeight + gap;
      return h / tools.zoom;
    };
    const getW = () => m.ui.frame;
    const setW = w => { m.ui.frame = w; refresh(m); };
    const getH = () => m.ui.frameH;
    const setH = hh => { m.ui.frameH = hh; refresh(m); };
    // a typed or stepped width: not narrower than 280, at the stage's width it is auto again
    const clamp = w => { const max = maxW(); w = Math.round(Math.max(w, 280)); return w >= max - 1 ? 0 : w; };
    const clampH = hh => { const max = maxH(); hh = Math.round(Math.max(hh, 160)); return hh >= max - 1 ? 0 : hh; };
    let raf = 0;
    const apply = w => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setW(w)); };
    let rafH = 0;
    const applyH = hh => { cancelAnimationFrame(rafH); rafH = requestAnimationFrame(() => setH(hh)); };

    ['l', 'r'].forEach(side => {
      const hd = h('div', `rz__handle rz__handle--${side}`, '<span class="rz__grip"></span>');
      hd.tabIndex = 0; hd.setAttribute('role', 'slider'); hd.setAttribute('aria-label', 'Ширина рамки, стрілки вліво і вправо');
      el.append(hd);
      let sx = 0, sw = 0, on = false;
      hd.addEventListener('pointerdown', e => { on = true; sx = e.clientX; sw = el.offsetWidth; try { hd.setPointerCapture(e.pointerId); } catch (err) {} el.classList.add('is-dragging'); });
      hd.addEventListener('pointermove', e => {
        if (!on) return;
        const dx = (side === 'r' ? e.clientX - sx : sx - e.clientX) / tools.zoom;
        const max = maxW();
        const w = Math.round(Math.min(Math.max(sw + dx * 2, 280), max));
        apply(w >= max - 1 ? 0 : w);
      });
      const end = () => { if (!on) return; on = false; el.classList.remove('is-dragging'); };
      hd.addEventListener('pointerup', end);
      hd.addEventListener('pointercancel', end);
      hd.addEventListener('keydown', e => {
        const d = e.key === 'ArrowLeft' ? -10 : e.key === 'ArrowRight' ? 10 : 0;
        if (!d) return;
        e.preventDefault();
        const w = Math.max(280, (getW() || el.offsetWidth) + (side === 'r' ? d : -d));
        setW(w >= maxW() ? 0 : w);
      });
    });

    // the bottom edge, for modules that own their height instead of filling the stage
    if (m.def.stage && m.def.stage.resizableH) {
      const hd = h('div', 'rz__handle rz__handle--b', '<span class="rz__grip"></span>');
      hd.tabIndex = 0; hd.setAttribute('role', 'slider'); hd.setAttribute('aria-label', 'Висота блоку, стрілки вгору і вниз');
      el.append(hd);
      let sy = 0, sh = 0, on = false;
      hd.addEventListener('pointerdown', e => { on = true; sy = e.clientY; sh = el.offsetHeight; try { hd.setPointerCapture(e.pointerId); } catch (err) {} el.classList.add('is-dragging'); });
      hd.addEventListener('pointermove', e => {
        if (!on) return;
        applyH(clampH(sh + (e.clientY - sy) / tools.zoom));
      });
      const endH = () => { if (!on) return; on = false; el.classList.remove('is-dragging'); };
      hd.addEventListener('pointerup', endH);
      hd.addEventListener('pointercancel', endH);
      hd.addEventListener('keydown', e => {
        const d = e.key === 'ArrowUp' ? -10 : e.key === 'ArrowDown' ? 10 : 0;
        if (!d) return;
        e.preventDefault();
        setH(clampH((getH() || el.offsetHeight) + d));
      });
    }

    const rz = { el, getW, setW, clamp, getH, setH, clampH, sync() {
      const w = getW(), hh = getH();
      el.style.setProperty('--frame-w', w ? w + 'px' : '100%');
      el.style.setProperty('--frame-h', hh ? hh + 'px' : '');
      el.classList.toggle('is-fixed', !!w);
      el.classList.toggle('is-fixed-h', !!hh);
      if (m === active) syncWidth();
    } };
    new ResizeObserver(() => { if (!getW()) requestAnimationFrame(rz.sync); }).observe(el);
    return rz;
  }

  /* ===== Stage toolbar ===== */
  // The pill never wraps to a second row: when the row gets too narrow it scrolls
  // inside itself, and the side that still has controls fades out as the hint.
  function syncTbFade() {
    const tb = els.toolbar, max = tb.scrollWidth - tb.clientWidth;
    tb.classList.toggle('can-l', tb.scrollLeft > 1);
    tb.classList.toggle('can-r', max > 1 && tb.scrollLeft < max - 1);
  }

  function buildToolbar() {
    els.toolbar.addEventListener('scroll', syncTbFade, { passive: true });
    new ResizeObserver(syncTbFade).observe(els.toolbar);
    els['tb-play'].addEventListener('click', () => setPaused(!paused));
    els['tb-rates'].innerHTML = RATES.map(r => `<button type="button" data-rate="${r}">${r}×</button>`).join('');
    $$('[data-rate]', els['tb-rates']).forEach(b => b.addEventListener('click', () => setRate(+b.dataset.rate)));
    els['tb-width'].innerHTML = FRAME_PRESETS.map(w => `<button type="button" data-w="${w}">${w || 'Auto'}</button>`).join('');
    $$('[data-w]', els['tb-width']).forEach(b => b.addEventListener('click', () => { if (active && active.rz) active.rz.setW(+b.dataset.w); }));
    // the badge is a field: a number commits on Enter / blur, empty or wider than the stage means auto, arrows step by 10 (100 with Shift)
    const inp = els['tb-width-in'];
    const commit = () => {
      const rz = active && active.rz; if (!rz) return;
      const n = parseInt(inp.value, 10);
      if (!inp.value.trim() || !(n > 0)) rz.setW(0); else rz.setW(rz.clamp(n));
      syncWidth();
    };
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('change', commit);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { commit(); inp.blur(); }
      else if (e.key === 'Escape') { syncWidth(true); inp.blur(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const rz = active && active.rz; if (!rz) return;
        const step = (e.shiftKey ? 100 : 10) * (e.key === 'ArrowUp' ? 1 : -1);
        rz.setW(rz.clamp((parseInt(inp.value, 10) || rz.el.offsetWidth) + step));
        syncWidth(true);
      }
      e.stopPropagation(); // the shell's shortcuts (Space, digits…) stay out of the field
    });
    inp.addEventListener('keyup', e => e.stopPropagation());
    els['tb-zooms'].innerHTML = ZOOMS.map(z => `<button type="button" data-zoom="${z}">${z * 100}%</button>`).join('');
    $$('[data-zoom]', els['tb-zooms']).forEach(b => b.addEventListener('click', () => setZoom(+b.dataset.zoom)));
    els['tb-grid'].addEventListener('click', () => setTool('grid', !tools.grid));
    els['tb-guides'].addEventListener('click', () => setTool('guides', !tools.guides));
    els['nb-fold'].addEventListener('click', () => setTool('notebar', !tools.notebar));
    els['nb-toggle'].addEventListener('click', () => setTool('notes', !tools.notes));
    els['nb-add'].addEventListener('click', () => { if (active) startPick(active); });
    els['nb-copy'].addEventListener('click', () => { if (active) notesAction(active, 'copy'); });
    els['nb-prev'].addEventListener('click', () => { if (active) stepNote(active, -1); });
    els['nb-next'].addEventListener('click', () => { if (active) stepNote(active, 1); });
    // a click anywhere else closes the open card; the pins and cards handle their own clicks
    document.addEventListener('click', e => { if (active && active.notes.open && !e.target.closest('.note-card, .note-pin, .notes__row, .nb')) closeNote(active); });
    setZoom(tools.zoom, true);
    setTool('grid', tools.grid, true);
    setTool('guides', tools.guides, true);
    setTool('notes', tools.notes, true);
    requestAnimationFrame(notesLoop);
    buildBell();
    loadBell();
    setRate(1);
    requestAnimationFrame(tick);
  }

  function syncToolbar() {
    $$('[data-rate]', els['tb-rates']).forEach(b => b.classList.toggle('is-active', +b.dataset.rate === rate));
    $$('[data-zoom]', els['tb-zooms']).forEach(b => b.classList.toggle('is-active', +b.dataset.zoom === tools.zoom));
    els['tb-grid'].classList.toggle('is-on', tools.grid);
    els['tb-guides'].classList.toggle('is-on', tools.guides);
    syncNotebar();
    document.body.classList.toggle('is-paused', paused);
    syncWidth();
    syncTbFade();
  }

  function syncWidth(force) {
    const rz = active && active.rz;
    els['tb-width'].hidden = els['tb-width-badge'].hidden = els['tb-width-sep'].hidden = !rz;
    if (!rz) return;
    const w = rz.getW();
    const inp = els['tb-width-in'];
    if (force || document.activeElement !== inp) inp.value = w || rz.el.offsetWidth;
    $('small', els['tb-width-badge']).hidden = !!w;
    $$('[data-w]', els['tb-width']).forEach(b => b.classList.toggle('is-active', +b.dataset.w === w));
  }

  function setPaused(p) {
    paused = p;
    document.body.classList.toggle('is-paused', p);
    if (!active) return;
    for (const a of active.els.stage.getAnimations({ subtree: true })) p ? a.pause() : a.play();
    const pb = active.def.playback || {};
    if (p && pb.pause) pb.pause(active.ctx);
    if (!p && pb.resume) pb.resume(active.ctx);
    refresh(active);
  }

  function setRate(r) {
    rate = r;
    if (active) {
      for (const a of active.els.stage.getAnimations({ subtree: true })) a.playbackRate = r;
      const pb = active.def.playback || {};
      if (pb.rate) pb.rate(active.ctx, r);
      refresh(active);
    } else syncToolbar();
  }

  function setZoom(z, silent) {
    tools.zoom = z;
    store.set(STORE + 'tools', tools);
    $$('.stage__body > .rz, .stage__body > .frame').forEach(el => { el.style.zoom = z; });
    if (!silent) { for (const m of modules) if (m.rz) m.rz.sync(); }
    if (!silent && active) refresh(active); else syncToolbar();
  }

  function setTool(name, on, silent) {
    tools[name] = on;
    store.set(STORE + 'tools', tools);
    for (const m of modules) m.els.stage.toggleAttribute('data-' + name, on);
    syncToolbar();
  }

  // fps meter, and the playback rate / pause enforced on animations that start later
  let lastT = 0, frames = 0, acc = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    if (lastT) {
      frames++; acc += t - lastT;
      if (acc >= 500) {
        const fps = frames * 1000 / acc;
        els['tb-fps'].innerHTML = `${Math.round(fps)} fps <small>· ${(acc / frames).toFixed(1)} ms</small>`;
        els['tb-fps'].classList.toggle('is-low', fps < 45 && !document.hidden);
        frames = 0; acc = 0;
      }
    }
    lastT = t;
    if (active && (paused || rate !== 1)) {
      for (const a of active.els.stage.getAnimations({ subtree: true })) {
        if (paused) { if (a.playState === 'running') a.pause(); }
        else if (a.playbackRate !== rate) a.playbackRate = rate;
      }
    }
  }

  /* ===== Code drawer ===== */
  const sources = {};
  let drawerTab = null, drawerText = '', drawerKey = '';

  function openDrawer() {
    if (!active || !(active.def.tabs || []).length) return;
    const ids = active.def.tabs.map(t => t.id);
    if (!ids.includes(drawerTab)) drawerTab = ids[0];
    els.drawer.hidden = false;
    renderDrawer();
  }
  function closeDrawer() { els.drawer.hidden = true; }

  function renderDrawer() {
    if (els.drawer.hidden || !active) return;
    const m = active, tabs = m.def.tabs || [];
    const t = tabs.find(x => x.id === drawerTab) || tabs[0];
    if (!t) return;
    if (els['drawer-tabs'].dataset.key !== m.id + '/' + t.id) {
      els['drawer-tabs'].dataset.key = m.id + '/' + t.id;
      els['drawer-tabs'].innerHTML = tabs.map(x => `<button type="button" data-tab="${esc(x.id)}" class="${x.id === t.id ? 'is-active' : ''}">${esc(x.label)}</button>`).join('');
      $$('[data-tab]', els['drawer-tabs']).forEach(b => b.addEventListener('click', () => { drawerTab = b.dataset.tab; renderDrawer(); }));
    }

    let text, changed = null, muted = false;
    if (t.render) {
      text = t.render(m.state, m.ctx) || '';
      const base = new Set(t.render(m.defaults, m.ctx).split('\n'));
      changed = text.split('\n').map(l => l.trim() !== '' && !base.has(l));
    } else if (t.file) {
      const src = sources[t.file];
      if (src === undefined) { loadSource(t.file); text = '// завантаження…'; muted = true; }
      else if (src === null) { text = `// Не вдалося прочитати ${t.file}.\n// Плейграунд треба відкрити через сервер (python -m http.server),\n// або взяти файл на GitHub: ${REPO}/blob/main/${t.file}`; muted = true; }
      else text = src;
    } else text = '';
    // refresh() re-renders on every stage event; only touch the DOM when the text actually changed, so the code keeps its scroll position
    const key = m.id + '/' + t.id + '\n' + text;
    if (key === drawerKey) return;
    drawerKey = key;
    drawerText = text;
    els['drawer-code'].innerHTML = text.split('\n').map((l, i) => `<span class="ln${changed && changed[i] ? ' ln--changed' : ''}${muted ? ' ln--muted' : ''}">${esc(l)}</span>`).join('');
    els['drawer-legend'].hidden = !(changed && changed.some(Boolean));
    const files = tabs.filter(x => x.file).map(x => `<code>${esc(x.file)}</code>`);
    els['drawer-files'].innerHTML = files.length ? 'Файли: ' + files.join(', ') : '';
    els['drawer-readme'].hidden = !m.def.dir;
    if (m.def.dir) els['drawer-readme'].href = `${REPO}/tree/main/${m.def.dir}`;
  }

  function loadSource(file) {
    sources[file] = undefined;
    fetch(file).then(r => (r.ok ? r.text() : null)).catch(() => null).then(text => { sources[file] = text; renderDrawer(); });
  }

  /* ===== Theme, panel, help, keyboard ===== */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    store.set(STORE + 'theme', t);
  }
  function togglePanel(on) {
    const hidden = on == null ? !document.body.classList.contains('no-panel') : on;
    document.body.classList.toggle('no-panel', hidden);
    els['btn-panel'].classList.toggle('is-on', hidden);
    store.set(STORE + 'panel', hidden ? 'hidden' : 'shown');
    if (active && active.rz) requestAnimationFrame(() => active.rz.sync());
  }

  function openMenu(on) {
    const open = on == null ? els['crumb-menu'].hidden : on;
    els['crumb-menu'].hidden = !open;
    els['crumb-title'].setAttribute('aria-expanded', String(open));
  }
  const closeMenu = () => openMenu(false);

  function bindGlobal() {
    els['btn-panel'].addEventListener('click', () => togglePanel());
    els['btn-home'].addEventListener('click', home);
    els['crumb-title'].addEventListener('click', () => openMenu());
    document.addEventListener('pointerdown', e => { if (!els['crumb-menu'].hidden && !e.target.closest('#crumb')) closeMenu(); });
    els['btn-theme'].addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    els['btn-help'].addEventListener('click', () => { els.help.hidden = !els.help.hidden; });
    $$('[data-drawer-close]', els.drawer).forEach(n => n.addEventListener('click', closeDrawer));
    els['drawer-copy'].addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(drawerText); } catch (e) {}
      els['drawer-copy'].textContent = 'Скопійовано';
      setTimeout(() => { els['drawer-copy'].textContent = 'Скопіювати'; }, 1200);
    });
    document.addEventListener('click', e => { if (!els.help.hidden && !e.target.closest('#help, #btn-help')) els.help.hidden = true; });
    if (store.get(STORE + 'panel', 'shown') === 'hidden') togglePanel(true);

    document.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { closeDrawer(); closeEasing(); closeMenu(); openBell(false); els.help.hidden = true; if (active) { cancelPick(active); closeNote(active); } return; }
      if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      // e.code is layout-independent (works on the Ukrainian layout too); fall back to the key for synthetic events
      const k = e.key || '';
      const c = e.code || (k === ' ' ? 'Space' : k === '[' ? 'BracketLeft' : k === ']' ? 'BracketRight' : k === '\\' ? 'Backslash' : /^[a-z]$/i.test(k) ? 'Key' + k.toUpperCase() : '');
      if (c === 'Space') { e.preventDefault(); setPaused(!paused); }
      else if (c === 'BracketLeft') setRate(RATES[Math.max(0, RATES.indexOf(rate) - 1)]);
      else if (c === 'BracketRight') setRate(RATES[Math.min(RATES.length - 1, RATES.indexOf(rate) + 1)]);
      else if (c === 'KeyG') setTool('grid', !tools.grid);
      else if (c === 'KeyL') setTool('guides', !tools.guides);
      else if (c === 'KeyN' && e.shiftKey) { if (active) startPick(active); }
      else if (c === 'KeyN') setTool('notes', !tools.notes);
      else if (c === 'KeyZ') setZoom(ZOOMS[(ZOOMS.indexOf(tools.zoom) + 1) % ZOOMS.length]);
      else if (c === 'KeyC') els.drawer.hidden ? openDrawer() : closeDrawer();
      else if (c === 'KeyT') els['btn-theme'].click();
      else if (c === 'KeyH') home();
      else if (c === 'Backslash') togglePanel();
      else if (e.key === '?') els.help.hidden = !els.help.hidden;
    });
  }

  /* ===== Mobile bottom sheet: one state for every panel ===== */
  const sheet = { state: store.get(STORE + 'sheet', 'half'), peek: 60 };
  const SHEET_LABEL = { collapsed: 'згорнуто', half: 'половина', full: 'весь екран' };
  function setSheet(state) {
    sheet.state = state;
    document.body.classList.remove('sheet-collapsed', 'sheet-half', 'sheet-full');
    document.body.classList.add('sheet-' + state);
    $$('.panel').forEach(p => { p.style.height = ''; p.classList.remove('is-dragging'); });
    $$('.panel__expand').forEach(b => { b.textContent = state === 'full' ? 'Менше' : 'Більше'; });
    $$('.panel__title small').forEach(el => { el.textContent = SHEET_LABEL[state]; });
    store.set(STORE + 'sheet', state);
  }
  function bindSheet(m) {
    const panel = m.els.panel;
    const handle = h('div', 'panel__handle', '<span class="panel__title">Налаштування<small></small></span><button type="button" class="panel__expand">Більше</button>');
    panel.prepend(handle);
    $('.panel__expand', handle).addEventListener('click', e => { e.stopPropagation(); setSheet(sheet.state === 'full' ? 'half' : 'full'); });
    let startY = 0, startH = 0, moved = false, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (e.target.closest('.panel__expand')) return;
      dragging = true; startY = e.clientY; startH = panel.offsetHeight; moved = false;
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dy = startY - e.clientY;
      if (!moved && Math.abs(dy) > 6) { moved = true; panel.classList.add('is-dragging'); }
      if (!moved) return;
      panel.style.height = Math.min(Math.max(startH + dy, sheet.peek), window.innerHeight * 0.95) + 'px';
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      const hgt = panel.offsetHeight, ih = window.innerHeight;
      const pts = { collapsed: sheet.peek, half: ih * 0.5, full: ih * 0.92 };
      setSheet(Object.keys(pts).sort((a, b) => Math.abs(pts[a] - hgt) - Math.abs(pts[b] - hgt))[0]);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('click', e => { if (e.target.closest('.panel__expand') || moved) return; setSheet(sheet.state === 'collapsed' ? 'half' : 'collapsed'); });
  }

  /* ===== View switching ===== */
  function show(id) {
    const m = byId[id] || modules[0];
    if (!m) return;
    if (active && active !== m) {
      if (active.def.onHide) active.def.onHide(active.ctx);
      active.els.app.hidden = true;
    }
    closeEasing();
    active = m;
    els.home.hidden = true;
    document.body.classList.remove('is-home');
    m.els.app.hidden = false;
    els.topbar.append(els.actions);   // back from the catalogue head, at the row's right edge
    m.els.stage.prepend(els.topbar);
    els['crumb-label'].textContent = m.def.tab || m.def.title;
    els['crumb-icon'].innerHTML = KIND[m.kind].icon;
    $$('[data-view]', els['crumb-menu']).forEach(b => b.classList.toggle('is-active', b.dataset.view === m.id));
    history.replaceState(null, '', '#' + m.id);
    store.set(STORE + 'view', m.id);
    const pb = m.def.playback || {};
    if (paused && pb.pause) pb.pause(m.ctx);
    if (!paused && pb.resume) pb.resume(m.ctx);
    if (pb.rate) pb.rate(m.ctx, rate);
    if (m.def.onShow) m.def.onShow(m.ctx);
    m.els.stage.append(els.notebar); // the notes bar follows the stage on screen, like the tool pill
    if (!m.notes.rows) loadNotes(m); // once per module, the first time it is on screen
    // observers and sizes only exist once the view is displayed
    setTimeout(() => { for (const a of m.els.stage.getAnimations({ subtree: true })) { a.playbackRate = rate; if (paused) a.pause(); } refresh(m); }, 50);
    syncToolbar();
    renderDrawer();
  }

  // the catalogue: no module on screen, the actions pill moves into the page head
  function home() {
    if (active) {
      if (active.def.onHide) active.def.onHide(active.ctx);
      active.els.app.hidden = true;
      active = null;
    }
    closeDrawer(); closeEasing(); closeMenu(); els.help.hidden = true;
    els.home.hidden = false;
    document.body.classList.add('is-home');
    $('.home__head', els.home).append(els.actions);
    history.replaceState(null, '', location.pathname + location.search);
    store.set(STORE + 'view', '');
  }

  /* how many modules ended up in each kind, once they have all registered */
  function countCatalogue() {
    $$('.home__group', els.catalog).forEach(g => {
      $('.home__count', g).textContent = $$('.card', g).length || '';
    });
  }

  /* ---------- boot: a module from the hash, else the catalogue ---------- */
  async function boot() {
    countCatalogue();
    await auth.land(); // back from the mailbox? the code becomes a session, the hash comes back first
    const [hashView, hashQuery] = location.hash.slice(1).split('?');
    restoreAll(hashView, hashQuery);
    modules.forEach(bindSheet);
    setSheet(sheet.state);
    byId[hashView] ? show(hashView) : home();
    // a shared save arrives after the module is up: it is fetched, then laid over the state
    const sharedOf = q => q && new URLSearchParams(q).get('p');
    // a note link: the module's notes are fetched on show; the card opens once they are in
    const noteOf = q => q && new URLSearchParams(q).get('n');
    const land = (m, q) => {
      if (sharedOf(q)) openShared(m, sharedOf(q));
      if (noteOf(q)) {
        const id = noteOf(q);
        const go = () => { if (!m.notes.rows) return setTimeout(go, 100); const row = m.notes.rows.find(r => r.id === id); if (row && row.snapshot) restoreSnapshot(m, row.snapshot); openNote(m, id); };
        go();
      }
    };
    if (byId[hashView]) land(byId[hashView], hashQuery);
    window.addEventListener('hashchange', () => {
      const [id, q] = location.hash.slice(1).split('?');
      if (byId[id]) { show(id); land(byId[id], q); } else if (!id) home();
    });
  }

  /* ---------- dev helpers: cheap answers from the console instead of reading files or taking screenshots ---------- */
  // what a module offers, in a few hundred characters: groups, items with key / type / range, presets, tabs, state
  function describe(id) {
    const m = byId[id] || active;
    if (!m) return null;
    return {
      id: m.id, title: m.def.title, tabs: (m.def.tabs || []).map(t => t.id + (t.file ? ':file' : ':render')),
      presets: (m.def.presets || []).map(p => p.label), random: !!m.def.random, resizable: !!m.rz, playback: Object.keys(m.def.playback || {}),
      acceptance: (m.def.acceptance || []).map(r => r.id),
      controls: (m.def.controls || []).map(g => ({ group: g.title, items: (g.items || []).map(it =>
        it.type + ':' + (it.key || (it.items ? it.items.map(b => b.label).join('|') : '')) + (it.type === 'range' ? `[${it.min}..${it.max}/${it.step == null ? 1 : it.step}]` : '') + (it.when ? '?' : '')) })),
      state: clone(m.state),
    };
  }

  /* ---------- acceptance: every visible control proves it works, after Toolcraft's acceptance rows ----------
     Generic proof for a keyed control: set an alternative value → the state holds it → something observable
     changed (the item's own proof(ctx), else the module's snippet). A module adds rows in def.acceptance for
     behaviour only the DOM shows: { id, run(ctx), wait?, expect(ctx) → true | reason }. */
  const wait = ms => new Promise(res => setTimeout(res, ms));
  const ALT = {
    range: (it, v) => (v === it.max ? it.min : it.max),
    select: (it, v) => { const o = it.options.find(o => String(o[0]) !== String(v)); return o ? o[0] : v; },
    seg: (it, v) => { const o = it.options.find(o => String(o[0]) !== String(v)); return o ? o[0] : v; },
    check: (it, v) => !v,
    color: (it, v) => (String(v).toLowerCase() === '#123456' ? '#654321' : '#123456'),
    text: (it, v) => (v === 'Інший текст' ? 'Текст' : 'Інший текст'),
    swatch: (it, v) => { const o = it.options.find(o => o.id !== v); return o ? o.id : v; },
    chips: (it, v) => { const a = (v || []).slice(); const id = it.options[0] && it.options[0].id; if (id == null) return a; const i = a.indexOf(id); i < 0 ? a.push(id) : a.splice(i, 1); return a; },
    easing: (it, v) => (v === 'cubic-bezier(.19, 1, .22, 1)' ? 'linear' : 'cubic-bezier(.19, 1, .22, 1)'),
  };
  async function proveControls(m) {
    const tab = (m.def.tabs || []).find(t => t.render);
    const res = { pass: 0, fail: [], unproven: [] };
    for (const f of m.fields) {
      const it = f.item;
      // hidden by when(): out of reach for the user right now, proven when its condition holds
      if (!it.key || !ALT[it.type] || f.el.hidden) continue;
      if (it.proof === false) { res.unproven.push(it.key + ': playground-only'); continue; }
      const before = clone(getPath(m.state, it.key));
      const alt = ALT[it.type](it, before);
      if (same(alt, before)) { res.unproven.push(it.key + ': no alternative value'); continue; }
      const observe = () => (it.proof ? it.proof(m.ctx) : tab ? tab.render(m.state, m.ctx) : null);
      const obs0 = observe();
      try {
        setState(m, setPath({}, it.key, alt));
        await wait(0);
        const got = getPath(m.state, it.key);
        if (!same(got, alt)) res.fail.push(`${it.key}: state is ${JSON.stringify(got)}, expected ${JSON.stringify(alt)}`);
        else if (obs0 === null) res.unproven.push(it.key + ': nothing observable');
        else if (same(obs0, observe())) res.fail.push(it.key + ': state changed but nothing observable did');
        else res.pass++;
        setState(m, setPath({}, it.key, before));
      } catch (e) { res.fail.push(it.key + ': ' + (e.message || e)); }
    }
    return res;
  }
  async function proveRows(m) {
    const res = { pass: 0, fail: [] };
    for (const row of m.def.acceptance || []) {
      try {
        await row.run(m.ctx);
        await wait(row.wait || 0);
        const ok = row.expect(m.ctx);
        if (ok === true) res.pass++; else res.fail.push(row.id + (typeof ok === 'string' ? ': ' + ok : ''));
      } catch (e) { res.fail.push(row.id + ': ' + (e.message || e)); }
    }
    return res;
  }

  // check(id?): smoke + acceptance for every module (or one). State and the active view are restored afterwards
  async function check(only) {
    const report = { ok: true, errors: [], warnings: [], modules: {} };
    const onErr = e => {
      const msg = String((e.error && e.error.stack) || e.message || e).split('\n').slice(0, 2).join(' ');
      // Chrome reports this when layout changes inside a ResizeObserver callback; the modules do that on purpose and it is harmless
      (/ResizeObserver loop/.test(msg) ? report.warnings : report.errors).push(msg);
    };
    window.addEventListener('error', onErr);
    const start = active && active.id;
    for (const m of modules) {
      if (only && m.id !== only) continue;
      const r = report.modules[m.id] = {};
      const before = snapshot(m);
      try {
        show(m.id);
        await wait(120);
        r.shown = !m.els.app.hidden && m.els.stage.contains(els.toolbar);
        r.fields = m.fields.length + ' (' + m.fields.filter(f => f.el.hidden).length + ' hidden)';
        if (m.def.presets && m.def.presets.length) setState(m, m.def.presets[0].patch);
        reset(m);
        r.reset = same(m.state, m.defaults) ? 'ok' : 'state differs from defaults';
        for (const t of m.def.tabs || []) if (t.render) { const txt = t.render(m.state, m.ctx); if (typeof txt !== 'string' || txt.length < 20) r['tab:' + t.id] = 'empty'; }
        if (m.def.hint) r.hint = m.def.hint(m.ctx) || '';
        for (const f of m.fields) if (f.item.type === 'status' && f.sync) f.sync(m.state);
        const c = await proveControls(m);
        r.controls = `${c.pass} proven` + (c.fail.length ? `, ${c.fail.length} FAILED` : '') + (c.unproven.length ? `, ${c.unproven.length} unproven` : '');
        if (c.fail.length) r.controlsFailed = c.fail;
        if (c.unproven.length) r.unproven = c.unproven;
        reset(m);
        if (m.def.acceptance) {
          const a = await proveRows(m);
          r.rows = `${a.pass} of ${(m.def.acceptance || []).length} passed`;
          if (a.fail.length) r.rowsFailed = a.fail;
        }
        if (r.controlsFailed || r.rowsFailed || r.reset !== 'ok' || !r.shown) report.ok = false;
      } catch (e) { r.error = String(e.stack || e).split('\n').slice(0, 2).join(' '); report.ok = false; }
      if (m.def.reset) m.def.reset(m.ctx);
      restoreSnapshot(m, before);
    }
    await wait(120);
    window.removeEventListener('error', onErr);
    if (report.errors.length) report.ok = false;
    start ? show(start) : home();
    report.fps = els['tb-fps'].textContent;
    return report;
  }

  /* ---------- shared components: one adapter provides, others consume, the master's state flows to every copy ---------- */
  // Adapters never reference each other; a component travels by name through the shell.
  // provide(name, { create(host, opts) -> { el, update(state) }, state(), markup?(opts, state) })
  //                                                the master registers a factory, its current state and, optionally, markup for snippets
  // consume(name, host, opts?, onMount?)           a copy is created in host as soon as the provider exists
  // publish(name, state)                           the master pushes a change to every copy
  // component(name)                                the provider's definition, for snippets that embed the component
  const provided = {};
  const consumers = {};
  function mountConsumer(name, c) {
    if (c.handle) return;
    c.handle = provided[name].create(c.host, c.opts || {});
    if (c.handle.update) c.handle.update(provided[name].state());
    if (c.onMount) c.onMount(c.handle);
  }
  function provide(name, def) {
    provided[name] = def;
    (consumers[name] || []).forEach(c => mountConsumer(name, c));
  }
  function consume(name, host, opts, onMount) {
    const c = { host, opts, onMount, handle: null };
    (consumers[name] = consumers[name] || []).push(c);
    if (provided[name]) mountConsumer(name, c);
    return c;
  }
  const component = name => provided[name] || null;
  function publish(name, state) {
    (consumers[name] || []).forEach(c => { if (c.handle && c.handle.update) c.handle.update(state); });
  }

  /* ---------- public ---------- */
  const styles = [];
  window.Playground = {
    register,
    // playground-only css for a module (demo surfaces, stand-ins): keeps the exported files clean
    css(text) { const s = document.createElement('style'); s.textContent = text; document.head.append(s); styles.push(s); },
    show, home,
    get active() { return active && active.ctx; },
    provide, consume, publish, component,
    describe, check,
    esc, fmt: fmtNum,
  };

  bindShell();
  buildToolbar();
  bindGlobal();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})();
