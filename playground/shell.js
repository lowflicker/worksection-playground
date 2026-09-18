/* ==========================================================================
   Playground shell. The universal chrome around the modules: nothing here
   ships with a module, and a module never talks to the shell except through
   Playground.register() from its own playground.js.

   What the shell does for every module:
     - renders the settings panel from a declarative list of controls,
       keeps the state, saves it in the browser, packs it into share links
     - stage tools: pause, playback speed, frame width, zoom, grid, guides, fps
     - the code drawer: generated snippet with changed lines highlighted,
       plus the module's source files, plus copy
     - light / dark theme, keyboard shortcuts, the mobile bottom sheet

   Module contract — Playground.register({ ... }). Every key is optional
   unless marked required:
     id        string   required. URL hash and storage key
     title     string   required. Panel heading
     tab       string   Topbar label, defaults to title
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
       item.type  range | select | seg | check | color | swatch | buttons | status | note
       item.key   state key, may be a dotted path ('enter.x')
       item.when  (state) => boolean, hides the item
       range:   min, max, step, unit | fmt(v)
       select / seg: options [[value, label], …]
       swatch:  options [{ id, label, css }]
       buttons: items [{ label, primary, run(ctx) }]
       status:  render(ctx) => html
       note:    text
     stage     { className, bg, resizable }   resizable defaults to true
     mount     (ctx) required. Build the demo inside ctx.frame
     apply     (ctx, patch) required. Push a state patch into the live demo
     derive    (patch, state) => patch   extra keys implied by a change,
               applied under the patch (e.g. a demo element implies a radius)
     reset     (ctx)   after the state went back to defaults
     hint      (ctx) => string   the line under the stage
     playback  { pause(ctx), resume(ctx), rate(ctx, r) }   for motion the
               shell cannot reach through getAnimations() (timers, canvas)
     onShow    (ctx), onHide(ctx)

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
  const tools = Object.assign({ zoom: 1, grid: false, guides: false }, store.get(STORE + 'tools', {}));
  const groupsCollapsed = store.get(STORE + 'groups', {});

  const els = {};
  function bindShell() {
    ['views', 'tabs', 'toolbar', 'tb-play', 'tb-rates', 'tb-width', 'tb-width-badge', 'tb-width-sep', 'tb-zooms', 'tb-grid', 'tb-guides', 'tb-fps',
     'drawer', 'drawer-tabs', 'drawer-code', 'drawer-copy', 'drawer-files', 'drawer-legend', 'drawer-readme',
     'btn-code', 'btn-panel', 'btn-theme', 'btn-help', 'help'].forEach(id => { els[id] = document.getElementById(id); });
  }

  /* ===== Registering a module: the view skeleton, the panel, the demo ===== */
  function register(def) {
    if (!def || !def.id || !def.defaults || !def.mount || !def.apply) throw new Error('Playground.register: id, defaults, mount and apply are required');
    const stageDef = Object.assign({ resizable: true, bg: '#f5f5f5' }, def.stage || {});
    const m = {
      id: def.id, def, defaults: clone(def.defaults), state: clone(def.defaults),
      ui: { frame: 0, bg: stageDef.bg }, fields: [], groups: [], rz: null, instance: null,
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
    stage.append(body);
    const panel = h('aside', 'panel');
    const scroll = h('div', 'panel__scroll');
    panel.append(scroll);
    app.append(stage, panel);
    els.views.append(app);
    m.els = { app, stage, body, frame, hint, panel, scroll };

    // topbar tab
    const tab = h('button', '', esc(def.tab || def.title));
    tab.type = 'button'; tab.dataset.view = m.id;
    tab.addEventListener('click', () => show(m.id));
    els.tabs.append(tab);

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
    m.ui.frame = 0;
    m.ui.bg = (m.def.stage && m.def.stage.bg) || '#f5f5f5';
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
    m.els.stage.style.setProperty('--stage-bg', m.ui.bg);
    if (m.bgInput) m.bgInput.value = m.ui.bg;
    if (m.rz) m.rz.sync();
    if (m === active) { syncToolbar(); renderDrawer(); }
    saveStatus(m);
  }

  /* ===== Panel ===== */
  function buildPanel(m) {
    const def = m.def, scroll = m.els.scroll;
    scroll.innerHTML = '';
    scroll.append(h('h1', '', esc(def.title)));
    if (def.summary) scroll.append(h('p', 'sub', esc(def.summary)));

    // save / share
    const save = h('div', 'save');
    save.innerHTML = '<button type="button" class="primary" data-do="save">Зберегти</button><button type="button" data-do="link">Посилання</button><button type="button" data-do="clear">Забути</button><span class="save__status"></span>';
    save.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (b) saveAction(m, b.dataset.do); });
    m.saveStatusEl = $('.save__status', save);
    scroll.append(save);

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
      const row2 = h('div', 'row-btns'); row2.style.marginTop = '8px';
      if (def.random) { const b = h('button', '', 'Випадково'); b.type = 'button'; b.addEventListener('click', () => setState(m, def.random(m.ctx) || {})); row2.append(b); }
      const r = h('button', '', 'Скинути'); r.type = 'button'; r.addEventListener('click', () => reset(m)); row2.append(r);
      body.append(row2);
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
    const bgId = uid();
    bgField.innerHTML = `<label for="${bgId}">Фон сцени</label><input type="color" id="${bgId}">`;
    m.bgInput = $('input', bgField);
    m.bgInput.addEventListener('input', () => { m.ui.bg = m.bgInput.value; refresh(m); });
    scene.append(bgField);
    scroll.append(group(m, { title: 'Сцена', collapsed: true }, scene));
  }

  function group(m, g, body) {
    const wrap = h('div', 'group');
    const key = m.id + '/' + g.title;
    const head = h('h2', '', esc(g.title));
    body.classList.add('group__body');
    const collapsed = key in groupsCollapsed ? groupsCollapsed[key] : !!g.collapsed;
    wrap.classList.toggle('is-collapsed', collapsed);
    head.addEventListener('click', () => {
      const on = wrap.classList.toggle('is-collapsed');
      groupsCollapsed[key] = on;
      store.set(STORE + 'groups', groupsCollapsed);
    });
    wrap.append(head, body);
    m.groups.push({ el: wrap, def: g });
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
      input.addEventListener('input', () => setState(m, setPath({}, it.key, parseFloat(input.value))));
      // double-click the label: back to the default value
      $('label', el).addEventListener('dblclick', () => setState(m, setPath({}, it.key, getPath(m.defaults, it.key))));
      return { el, item: it, sync: s => { const v = getPath(s, it.key); input.value = v; out.textContent = it.fmt ? it.fmt(v) : fmtNum(v) + (it.unit ? ' ' + it.unit : ''); } };
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
    if (t === 'swatch') {
      const el = h('div', 'field', `<label>${label}</label><output></output><div class="swatches">${it.options.map(o => `<button type="button" class="swatch" data-v="${esc(o.id)}" title="${esc(o.label)}" style="background:${o.css}"></button>`).join('')}</div>`);
      const btns = $$('button', el), out = $('output', el);
      btns.forEach(b => b.addEventListener('click', () => setState(m, setPath({}, it.key, b.dataset.v))));
      return { el, item: it, sync: s => { const v = getPath(s, it.key); btns.forEach(b => b.classList.toggle('is-active', b.dataset.v === v)); const o = it.options.find(x => x.id === v); out.textContent = o ? o.label : ''; } };
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

  /* ===== Save / share: the browser keeps the state, links carry it ===== */
  const snapshot = m => ({ state: clone(m.state), ui: { frame: m.ui.frame, bg: m.ui.bg } });
  function restoreSnapshot(m, d) {
    if (!d || typeof d !== 'object') return;
    if (d.ui) { m.ui.frame = d.ui.frame || 0; if (d.ui.bg) m.ui.bg = d.ui.bg; }
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

  /* ===== Resizable frame: drag either edge, the frame stays centred ===== */
  function makeResizable(m, frame) {
    const el = h('div', 'rz');
    el.append(frame);
    const maxW = () => {
      const p = el.parentNode; if (!p) return 0;
      const st = getComputedStyle(p);
      return (p.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)) / tools.zoom;
    };
    const getW = () => m.ui.frame;
    const setW = w => { m.ui.frame = w; refresh(m); };
    let raf = 0;
    const apply = w => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setW(w)); };

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

    const rz = { el, getW, setW, sync() {
      const w = getW();
      el.style.setProperty('--frame-w', w ? w + 'px' : '100%');
      el.classList.toggle('is-fixed', !!w);
      if (m === active) syncWidth();
    } };
    new ResizeObserver(() => { if (!getW()) requestAnimationFrame(rz.sync); }).observe(el);
    return rz;
  }

  /* ===== Stage toolbar ===== */
  function buildToolbar() {
    els['tb-play'].addEventListener('click', () => setPaused(!paused));
    els['tb-rates'].innerHTML = RATES.map(r => `<button type="button" data-rate="${r}">${r}×</button>`).join('');
    $$('[data-rate]', els['tb-rates']).forEach(b => b.addEventListener('click', () => setRate(+b.dataset.rate)));
    els['tb-width'].innerHTML = FRAME_PRESETS.map(w => `<button type="button" data-w="${w}">${w || 'Auto'}</button>`).join('');
    $$('[data-w]', els['tb-width']).forEach(b => b.addEventListener('click', () => { if (active && active.rz) active.rz.setW(+b.dataset.w); }));
    els['tb-zooms'].innerHTML = ZOOMS.map(z => `<button type="button" data-zoom="${z}">${z * 100}%</button>`).join('');
    $$('[data-zoom]', els['tb-zooms']).forEach(b => b.addEventListener('click', () => setZoom(+b.dataset.zoom)));
    els['tb-grid'].addEventListener('click', () => setTool('grid', !tools.grid));
    els['tb-guides'].addEventListener('click', () => setTool('guides', !tools.guides));
    setZoom(tools.zoom, true);
    setTool('grid', tools.grid, true);
    setTool('guides', tools.guides, true);
    setRate(1);
    requestAnimationFrame(tick);
  }

  function syncToolbar() {
    $$('[data-rate]', els['tb-rates']).forEach(b => b.classList.toggle('is-active', +b.dataset.rate === rate));
    $$('[data-zoom]', els['tb-zooms']).forEach(b => b.classList.toggle('is-active', +b.dataset.zoom === tools.zoom));
    els['tb-grid'].classList.toggle('is-on', tools.grid);
    els['tb-guides'].classList.toggle('is-on', tools.guides);
    document.body.classList.toggle('is-paused', paused);
    syncWidth();
  }

  function syncWidth() {
    const rz = active && active.rz;
    els['tb-width'].hidden = els['tb-width-badge'].hidden = els['tb-width-sep'].hidden = !rz;
    if (!rz) return;
    const w = rz.getW();
    els['tb-width-badge'].innerHTML = w ? `${w} px` : `${rz.el.offsetWidth} px<small>auto</small>`;
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

  function bindGlobal() {
    els['btn-code'].addEventListener('click', () => (els.drawer.hidden ? openDrawer() : closeDrawer()));
    els['btn-panel'].addEventListener('click', () => togglePanel());
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
      if (e.key === 'Escape') { closeDrawer(); els.help.hidden = true; return; }
      if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      // e.code is layout-independent (works on the Ukrainian layout too); fall back to the key for synthetic events
      const k = e.key || '';
      const c = e.code || (k === ' ' ? 'Space' : k === '[' ? 'BracketLeft' : k === ']' ? 'BracketRight' : k === '\\' ? 'Backslash' : /^[a-z]$/i.test(k) ? 'Key' + k.toUpperCase() : /^[1-9]$/.test(k) ? 'Digit' + k : '');
      if (c === 'Space') { e.preventDefault(); setPaused(!paused); }
      else if (c === 'BracketLeft') setRate(RATES[Math.max(0, RATES.indexOf(rate) - 1)]);
      else if (c === 'BracketRight') setRate(RATES[Math.min(RATES.length - 1, RATES.indexOf(rate) + 1)]);
      else if (c === 'KeyG') setTool('grid', !tools.grid);
      else if (c === 'KeyL') setTool('guides', !tools.guides);
      else if (c === 'KeyZ') setZoom(ZOOMS[(ZOOMS.indexOf(tools.zoom) + 1) % ZOOMS.length]);
      else if (c === 'KeyC') els.drawer.hidden ? openDrawer() : closeDrawer();
      else if (c === 'KeyT') els['btn-theme'].click();
      else if (c === 'Backslash') togglePanel();
      else if (e.key === '?') els.help.hidden = !els.help.hidden;
      else if (/^Digit[1-9]$/.test(c)) { const m = modules[+c.slice(5) - 1]; if (m) show(m.id); }
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
    active = m;
    m.els.app.hidden = false;
    m.els.stage.prepend(els.toolbar);
    $$('[data-view]', els.tabs).forEach(b => b.classList.toggle('is-active', b.dataset.view === m.id));
    history.replaceState(null, '', '#' + m.id);
    store.set(STORE + 'view', m.id);
    const pb = m.def.playback || {};
    if (paused && pb.pause) pb.pause(m.ctx);
    if (!paused && pb.resume) pb.resume(m.ctx);
    if (pb.rate) pb.rate(m.ctx, rate);
    if (m.def.onShow) m.def.onShow(m.ctx);
    // observers and sizes only exist once the view is displayed
    setTimeout(() => { for (const a of m.els.stage.getAnimations({ subtree: true })) { a.playbackRate = rate; if (paused) a.pause(); } refresh(m); }, 50);
    syncToolbar();
    renderDrawer();
  }

  /* ---------- boot ---------- */
  function boot() {
    const [hashView, hashQuery] = location.hash.slice(1).split('?');
    restoreAll(hashView, hashQuery);
    modules.forEach(bindSheet);
    setSheet(sheet.state);
    const saved = store.get(STORE + 'view', null);
    show(byId[hashView] ? hashView : byId[saved] ? saved : modules[0] && modules[0].id);
  }

  /* ---------- dev helpers: cheap answers from the console instead of reading files or taking screenshots ---------- */
  // what a module offers, in a few hundred characters: groups, items with key / type / range, presets, tabs, state
  function describe(id) {
    const m = byId[id] || active;
    if (!m) return null;
    return {
      id: m.id, title: m.def.title, tabs: (m.def.tabs || []).map(t => t.id + (t.file ? ':file' : ':render')),
      presets: (m.def.presets || []).map(p => p.label), random: !!m.def.random, resizable: !!m.rz, playback: Object.keys(m.def.playback || {}),
      controls: (m.def.controls || []).map(g => ({ group: g.title, items: (g.items || []).map(it =>
        it.type + ':' + (it.key || (it.items ? it.items.map(b => b.label).join('|') : '')) + (it.type === 'range' ? `[${it.min}..${it.max}/${it.step == null ? 1 : it.step}]` : '') + (it.when ? '?' : '')) })),
      state: clone(m.state),
    };
  }

  // smoke test: every module shown, first preset applied, reset, snippets rendered; state is restored afterwards
  async function check() {
    const report = { errors: [], warnings: [], modules: {} };
    const onErr = e => {
      const msg = String((e.error && e.error.stack) || e.message || e).split('\n').slice(0, 2).join(' ');
      // Chrome reports this when layout changes inside a ResizeObserver callback; the modules do that on purpose and it is harmless
      (/ResizeObserver loop/.test(msg) ? report.warnings : report.errors).push(msg);
    };
    window.addEventListener('error', onErr);
    const start = active && active.id;
    const wait = ms => new Promise(res => setTimeout(res, ms));
    for (const m of modules) {
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
      } catch (e) { r.error = String(e.stack || e).split('\n').slice(0, 2).join(' '); }
      restoreSnapshot(m, before);
    }
    await wait(120);
    window.removeEventListener('error', onErr);
    if (start) show(start);
    report.fps = els['tb-fps'].textContent;
    report.console = 'check the browser console for warnings';
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
    show,
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
