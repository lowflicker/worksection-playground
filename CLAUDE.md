# Worksection playground — guide for AI assistants

Read this first, then open only what the task needs. Most tasks touch one
module folder *or* `playground/`, never both.

## What this is

A playground for promo-site blocks and UI effects. Dmytro (designer) builds
effects here with an AI; the **audience is the developers** in his company,
who copy a module's files into the site. Two strictly separate parts:

1. **Modules** (`logo-wall/`, `short-answer/`, `float-actions/`, `border-beam/`,
   `dot-sphere/`, `hero-section/`, `site-header/`, `site-button/`) — the product. Plain HTML + CSS + vanilla JS, no deps, no
   build, no frameworks, ever. These files are what gets exported.
2. **Shell** (`playground/`) — the chrome around them. Never exported, knows
   nothing about any specific module, currently vanilla with no deps.

They talk only through `Playground.register(def)` from a module's
`playground.js`. No playground-only code in module files; no module-specific
code in the shell.

Live: https://lowflicker.github.io/worksection-playground/ (Pages, `main`).

## Map

```
index.html              static page: shell, then each module's css/js + its playground.js. No build.
playground/shell.js     the shell. Header comment = the module contract. ~750 lines, sectioned.
playground/shell.css    shell styles; tokens on :root / :root[data-theme="dark"].
<module>/<name>.css/js  the exported effect. API and options in the file header + README.
<module>/playground.js  adapter: Playground.register({...}), declarative, 150–380 lines.
<module>/demo.html      standalone page with the module (works from file://).
<module>/README.md      for developers, Ukrainian.
README.md               developer overview + how to add a module.
.claude/launch.json     `playground` config: python http.server on 5174.
```

Globals / ids: `LogoWall`→`logos`, `ShortAnswer`→`answer`, `FloatActions`→`fab`,
`BorderBeam`→`beam`, `DotSphere`→`sphere`, `Hero`→`hero`, `SiteHeader`→`header`, button (no JS, `button.css`)→`button`.
Tab prefixes: `S :` = section of the site, `C :` = component reused inside sections. Each module exposes `.defaults`.
`hero-section/` is markup-first: the adapter builds the HTML, `hero.js` only
enhances it; its breakpoints are container queries, so the frame width
presets (390 / 320) show the narrow composition. Its stage is the site's
first screen: a scroller window (`stage--fill`) with the site header on top
and the hero under it. `site-header/` is the same kind (markup-first,
container queries) and shows the bar alone: no page, the compact state is a
toggle button, the mobile sheet is sized to the stage.

**Shared components** (masters publish, copies follow; edit only the master):
- header: `site-header/playground.js` provides `site-header`; the hero consumes it.
- button: `site-button/playground.js` provides `site-button` (opts `{ variant, size, rounded, label, href, beam }`);
  the hero consumes two for its CTAs and takes their snippet markup from
  `Playground.component('site-button').markup()`. `button.css` mirrors the site's
  own `.btn` system (classes, tokens, values from worksection.com); only
  `.btn-beam` is new. Load order: `beam.css` before `button.css`.
- Demo pages (`*/demo.html`) carry static copies of component markup for
  developers — keep them in sync when a master changes.

## Token discipline

Reading is the main cost. In this order:

1. **Outline before content.** One-line section markers exist in every big file:
   `grep -nE '^\s*/\* (-{3,}|={3,}) ' FILE` (add `-A1` for banner blocks in
   module files). Then `Read` only the range you need (`offset`/`limit`).
2. **Ask the running page instead of reading adapters.** In the browser:
   `Playground.describe('beam')` → groups, keys, types, ranges, presets, tabs,
   state. `Playground.active` → current ctx (`state`, `set`, `instance`).
3. **Never open effect files (`<name>.js/css`) for a playground task**; open
   them only to change the effect itself. Never open READMEs unless editing docs.
4. **Edit, don't rewrite.** Use the `Edit` tool with a small unique anchor.
   Do not modify existing files through shell scripts (python/sed): the
   harness echoes the whole changed file back into context. `Write` only for
   new files.
5. **Verify cheaply.** `await Playground.check()` (or `check('hero')`) — one
   call: smoke (shown, preset, reset, snippets) + acceptance (every keyed
   control proven: alternative value → state → snippet or `proof(ctx)`;
   then the module's `acceptance` rows). `ok: true` or the failing ids;
   state restored. Then
   `read_console_messages` (errors only), then targeted `javascript_tool`
   asserts. A screenshot only when the change is visual, one, `scale: 0.5`.
   Do not re-check modules you did not touch. Batch browser steps with
   `browser_batch`.
6. **Don't explore.** The map above is complete; `ls`/`find`/`cat` of the
   tree is waste. New module → copy the closest neighbour, don't survey all.
7. **Answer short.** Dmytro reads Ukrainian; one screen, no plan restating.

## The contract (full text: header of `playground/shell.js`)

`Playground.register({ id, title, tab?, summary?, dir, tabs, defaults,
presets?, random?, controls, stage?, mount, apply, derive?, reset?, hint?,
playback?, onShow?, onHide? })`

- `defaults` — full state, plain JSON; usually `<Module>.defaults` minus
  functions/DOM refs and minus what the shell owns (`paused`).
- `controls` — groups of items: `range | select | seg | check | color | swatch
  | easing | buttons | status | note`; `key` may be dotted (`enter.x`); `when(state)`
  hides; select/seg values coerced to the default's type. `easing` edits a CSS
  timing-function string in a bezier popover (presets, drag, text input).
- `mount(ctx)` builds into `ctx.frame`; `apply(ctx, patch)` → usually
  `inst.setOptions(patch)`; `derive(patch, state)` returns implied keys,
  deep-merged *under* the patch (return a fresh object).
- `tabs` — `{ id, label, render(state) }` (diff vs defaults highlighted) or
  `{ id, label, file }` (fetched over HTTP).
- `playback` hooks only for motion outside `getAnimations()` (timers, canvas).
- `ctx` = `{ id, state, defaults, ui, frame, stage, instance, set, reset, refresh, paused, rate }`.
  Call `ctx.refresh()` from module events. Playground-only CSS → `Playground.css()`.
- `acceptance: [{ id, run(ctx), wait?, expect(ctx) → true | reason }]` — rows for
  behaviour only the DOM shows (a class, a child count, an instance flag).
  Every module has 4–5. A keyed item may set `proof(ctx)` (its own observable)
  or `proof: false` (playground-only knob). New control → it is proven
  automatically; new behaviour → add a row.
- Shared components: `Playground.provide(name, { create(host, opts) → { el, update(state) }, state(), markup?(opts, state) })`
  in the master, `Playground.consume(name, host, opts?)` in the consumer,
  `Playground.publish(name, state)` from the master's `apply`,
  `Playground.component(name)` for a snippet that embeds the component.
  Never import another adapter's markup by hand.

Shell owns (never reimplement in an adapter): pause / speed, frame width,
zoom, grid, guides, fps, code drawer + copy, save / share link
(`#<id>?s=<base64>`), stage bg, theme, panel hide, shortcuts (`?`), mobile
sheet, collapsible groups. localStorage prefix `ws-playground:`.

## Adding a module

1. `my-block/` with `my-block.css`, `my-block.js`, `demo.html`, `README.md`.
2. `my-block/playground.js` from the closest neighbour: `dot-sphere/` (canvas,
   simplest), `border-beam/` (CSS vars, demo surfaces, derive), `logo-wall/`
   (options + presets), `float-actions/` (fake environment around the module).
3. `index.html`: `<link>` in head, module `<script>` + `playground.js` at the end of body.
4. `acceptance` rows in the adapter; `await Playground.check('my-block')` must be `ok`.

## Working here

- Run: `preview_start` with `playground` (or `python -m http.server 5174`).
  `file://` does not work for the playground; `demo.html` does.
- Language: UI strings, hints, READMEs, commit-visible copy in Ukrainian;
  code, comments, commit messages in English. Comments say why, tersely.
- Style: 2-space, single quotes, IIFE + `'use strict'`, ES2020 ok. Match the
  surrounding file.
- Git: one commit per task, subject + why in the body. `main` deploys to
  Pages — ask before pushing. LF in repo (CRLF warnings on Windows are fine).
- Syntax check without a browser: `node --check FILE`.

## Gotchas

- `derive` returns a fresh object; `paused` never in `defaults`.
- ResizeObserver → `requestAnimationFrame(ctx.refresh)`, not `ctx.refresh` directly.
- `render(state)` must be deterministic (drawer is keyed on its text).
- Zoom: 100 %-wide frame at 200 % lays out at half the px (browser-zoom
  semantics); fixed widths are magnified as is.
- `build-playground.py` / `playground.template.html` / inlined `src-*` scripts
  exist only in history. Do not bring a build step back.

## Status (keep to 5 lines, update when it changes)

- 2026-09-16: shell rewrite done, 5 modules on the new contract, pushed.
- 2026-09-16: `hero-section/` (Figma hero, tap-to-swap on phones; `img/build.py` rebuilds the screenshots from PNG).
- 2026-09-17: `site-header/` (worksection.com top bar; its demo stacks it on the hero).
- 2026-09-18: header shows only the bar, hero = first screen (header + hero); `site-button/` (site's .btn mirror + mono beam), hero CTAs are its copies.
- 2026-09-18: shell redesigned after Toolcraft (glass panel, tool pill, section reset); `easing` control (bezier editor); `check()` = acceptance, all green.
- Old folder `Desktop/vis-effects-for-ui` is superseded; work from this repo.
- `.claude/launch.json` runs `python3` (no bare `python` on this Mac).
