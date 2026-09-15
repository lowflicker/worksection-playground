# Worksection playground — guide for AI assistants

Read this first. It tells you what the repo is, where things live, and which
files you actually need to open for a given task. Most tasks touch one module
folder or `playground/`; never both blindly.

## What this is

A playground for promo-site blocks and UI effects. Dmytro (designer) builds
the effects here with an AI; the **audience is the developers** in his
company, who copy a module's files into the site. Two strictly separate parts:

1. **Modules** (`logo-wall/`, `short-answer/`, `float-actions/`, `border-beam/`,
   `dot-sphere/`): the product. Plain HTML + CSS + vanilla JS, no dependencies,
   no build, no frameworks — ever. These files are what gets exported.
2. **Shell** (`playground/`): the chrome around the modules. Never exported,
   may use anything, currently vanilla with no deps. Knows nothing about any
   specific module.

The two talk only through `Playground.register(def)` called from a module's
`playground.js`. Do not leak playground-only code into module files; do not
special-case a module inside the shell.

Live: https://lowflicker.github.io/worksection-playground/ (GitHub Pages, `main`).

## Map

```
index.html              static page: loads shell, then each module's css/js + its playground.js. No build step.
playground/shell.js     the shell (~730 lines). Its header comment IS the module contract — read the header, not the file.
playground/shell.css    shell styles. Design tokens on :root and :root[data-theme="dark"]; everything else uses them.
<module>/<name>.css/js  the exported effect. Public API + options documented in the file header and README.
<module>/demo.html      minimal standalone page with the module (works from file://).
<module>/README.md      for developers, in Ukrainian: files, install snippet, options, API, events, notes.
<module>/playground.js  adapter: Playground.register({...}). Declarative; copy a neighbour when adding a module.
README.md               developer-facing overview + how to add a module.
```

Modules and their globals: `LogoWall` (id `logos`), `ShortAnswer` (`answer`),
`FloatActions` (`fab`), `BorderBeam` (`beam`), `DotSphere` (`sphere`).
Each exposes `.defaults`; adapters build their state from it.

## The contract in one screen

`Playground.register({ id, title, tab?, summary?, dir, tabs, defaults, presets?,
random?, controls, stage?, mount, apply, derive?, reset?, hint?, playback?, onShow?, onHide? })`

- `defaults` — the full state, plain JSON. Adapters usually derive it from
  `<Module>.defaults` minus non-serialisable keys (functions, DOM refs) and
  minus what the shell owns (`paused`, reduced motion).
- `controls` — groups of items. Types: `range | select | seg | check | color |
  swatch | buttons | status | note`. `key` may be a dotted path (`enter.x`).
  `when(state)` hides an item or a group. Select/seg values are coerced to the
  type of the default (number / boolean / string).
- `mount(ctx)` builds the demo into `ctx.frame`; `apply(ctx, patch)` pushes a
  patch into the live instance (`inst.setOptions(patch)` for most modules).
- `derive(patch, state)` returns keys implied by a change (a demo element
  implies a radius; a new sphere layout implies its preset). Deep-merged
  *under* the patch, so the patch wins.
- `tabs` — code drawer: `{ id, label, render(state) }` for generated text
  (changed lines vs `render(defaults)` are highlighted) or `{ id, label, file }`
  for a source file fetched over HTTP.
- `playback` hooks only for motion the shell cannot reach via
  `element.getAnimations()`: timers (`wall.stop()`), canvas (`sphere.pause()`).
  CSS/WAAPI animations are paused and rate-scaled by the shell itself.
- `ctx` = `{ id, state, defaults, ui, frame, stage, instance, set(patch), reset(), refresh(), paused, rate }`.
  Call `ctx.refresh()` from module events (resize, intersection, custom events)
  so hints and status lines stay current.
- Playground-only CSS for an adapter goes through `Playground.css(text)`.

Shell-owned features (never reimplement in an adapter): pause / speed
(0.1×–1×), frame width presets + drag, zoom 50/100/200 %, 8 px grid, centre
guides, fps meter, code drawer + copy, save / share link (state in URL hash
`#<id>?s=<base64 json>`), stage background, light / dark theme, panel hide,
keyboard shortcuts (`?` in the topbar lists them), mobile bottom sheet,
collapsible groups. localStorage keys are prefixed `ws-playground:`.

## Adding a module

1. `my-block/` with `my-block.css`, `my-block.js`, `demo.html`, `README.md`
   (same README skeleton as the neighbours: Файли / Підключення / options / API / Що ще варто знати).
2. `my-block/playground.js` — start from the closest neighbour:
   `dot-sphere/` (canvas, simplest), `border-beam/` (CSS-variable driven, demo
   surfaces, derive), `logo-wall/` (options object + presets), `float-actions/`
   (needs a fake environment around the module).
3. `index.html`: `<link>` in head, module `<script>` + `playground.js` at the end of body.

## Working here

- Run: any static server from the repo root, e.g. `python -m http.server 5174`.
  `file://` does not work for the playground (modules are fetched); `demo.html` does.
  From the sibling `vis-effects-for-ui` folder there is a launch config `worksection-playground` serving this repo on 5174.
- Verify in the browser before claiming done: no console errors on load, every
  tab renders, the changed control affects the demo, the code drawer snippet
  reflects it. Views are switchable from the console via `Playground.show(id)`;
  `Playground.active` is the current ctx.
- Language: UI strings, panel labels, hints and READMEs in Ukrainian; code,
  comments and commit messages in English. Comments explain intent, not
  mechanics; keep the existing terse style.
- Style: 2-space indent, single quotes, IIFE + `'use strict'`, no semicolon-free
  style, no classes for adapters, ES2020 is fine (the audience is modern
  browsers; `@property`, `mask-composite` are already required by beam).
- Git: commit with a descriptive message (subject + short body on the why);
  `main` is deployed by Pages, so ask before pushing. Line endings: LF in the
  repo (`core.autocrlf=true` on this Windows machine warns, that is fine).

## Gotchas

- `derive` must return a fresh object (the shell deep-merges into it).
- Do not put `paused` into an adapter's `defaults`: reset would unpause.
- ResizeObserver callbacks that call `ctx.refresh()` should go through
  `requestAnimationFrame` (refresh touches layout).
- The drawer re-renders on every `refresh()`; it is keyed on the text, so
  keep `render(state)` deterministic.
- `zoom` is applied to `.rz` / `.frame`; drag maths in the shell divides by it.
  A 100 %-wide frame at 200 % lays out at half the px (browser-zoom semantics);
  a fixed width (e.g. 390) is magnified as is.
- Old artefacts you may see referenced in history: `build-playground.py`,
  `playground.template.html`, inlined `<script id="src-…">`. They are gone;
  do not bring the build step back.
