# Border beam

Анімоване веселкове світло по межі елемента: різка обводка, м'яке внутрішнє сяйво і розмитий bloom, усі три крутить одна CSS-змінна. Чистий CSS + маленький контролер, без залежностей і без збірки. Порт [libraries.dev/beam](https://libraries.dev/beam).

## Файли

| Файл | Що це |
|---|---|
| `beam.css` | увесь ефект: три шари, `@property`, `@keyframes` |
| `beam.js` | контролер `BorderBeam`: вмикає і вимикає ефект, тригери, пауза |
| `demo.html` | приклад підключення |
| `figma-shader-prompt.md` | промпт для Figma Agent, що будує той самий ефект як shader fill |
| `playground.js` | опис для плейграунду: контроли, пресети, сніпет. На сайт не потрібен |

На сайт беруть `beam.css` + `beam.js`. Плейграунд: `../index.html`, вкладка «Border beam».

## Підключення

```html
<link rel="stylesheet" href="beam.css">

<div class="beam my-card" data-beam data-trigger="always">
  <!-- ваш контент -->
</div>

<script src="beam.js"></script>
```

Налаштування це звичайні CSS-змінні на елементі:

```css
.my-card {
  background: #1d1d1f;

  --beam-radius: 20px;      /* має збігатися з радіусом елемента */
  --beam-width: 1px;
  --beam-duration: 1.96s;   /* один оберт по межі */
  --beam-strength: 1;       /* загальна сила ефекту */
  --beam-hue-base: 0deg;    /* зсув усієї палітри */
}
```

Плейграунд показує готовий сніпет з будь-якими підкрученими значеннями.

## Як це працює

Ефект — три шари поверх вашого елемента, усі керуються однією змінною `--beam-angle`, яку крутить `@keyframes` (це можливо саме завдяки `@property`, бо звичайні CSS-змінні не анімуються):

1. `::after`, різка обводка. `conic-gradient` (біла дуга) поверх дев'яти `radial-gradient` з кольорами, притиснутими до країв. Вирізається в кільце через `mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)` + `mask-composite: exclude`.
2. `::before`, м'яке внутрішнє сяйво. Ті ж кольори, але замасковані широкою дугою `conic-gradient`, перетнутою з рамкою, що згасає до центру.
3. `.beam__bloom`, розмита копія обводки (`filter: blur()`), «гаряче» ядро променя. Цей `div` створює `beam.js`, у розмітці його писати не треба.

Зверху на все накладається повільний `hue-rotate`, через що палітра постійно «пливе».

## Режими

| `data-mode` | Що робить |
|---|---|
| (не вказано) | Промінь обертається по всій межі. |
| `travel` | Промінь їде вздовж нижньої межі, з кольоровими «голками», як у статус-панелі під час генерації. Найкраще на широких низьких елементах. |

## Тригери

`data-trigger="always"` (типово), `"hover"`, `"focus"`.

## API

```js
const b = BorderBeam.get(document.querySelector('.beam'));
b.show();               // показати (з fade-in)
b.hide();               // сховати (з fade-out)
b.pause(); b.play();    // заморозити / відновити анімацію
b.setTrigger('hover');
b.set('duration', '3s');// будь-яка --beam-* змінна
b.destroy();
```

`beam.js` сам ініціалізує всі `[data-beam]` на `DOMContentLoaded`. Динамічні елементи: `BorderBeam.attach(el, { trigger: 'hover' })` або `BorderBeam.enhance(container)`.

## Повний список змінних

| Змінна | Типово | Що робить |
|---|---|---|
| `--beam-radius` | `20px` | Радіус скруглення (має збігатися з вашим елементом). |
| `--beam-width` | `1px` | Товщина обводки. |
| `--beam-duration` | `1.96s` | Тривалість одного циклу. |
| `--beam-direction` | `normal` | `normal` / `reverse`. |
| `--beam-head` | `66` | Де саме на колі стоїть голова променя, у %. |
| `--beam-arc` | `12` | Половина довжини видимої дуги, у %. |
| `--beam-strength` | `1` | Множник яскравості для всіх шарів одразу. |
| `--beam-stroke-opacity` | `1` | Окремо обводка. |
| `--beam-inner-opacity` | `1` | Окремо внутрішнє сяйво. |
| `--beam-bloom-opacity` | `1` | Окремо bloom. |
| `--beam-bloom-blur` | `8px` | Розмиття bloom-шару. |
| `--beam-inner-feather` | `28px` | Наскільки глибоко всередину заходить сяйво. |
| `--beam-inner-shadow` | `.27` | Внутрішня біла рамка (`inset box-shadow`). |
| `--beam-hue-base` | `0deg` | Зсув усієї палітри. |
| `--beam-hue-range` | `30deg` | Амплітуда «дихання» відтінку. |
| `--beam-hue-duration` | `12s` | Період цього дихання. |
| `--beam-brightness` | `1.3` | Яскравість. |
| `--beam-saturate` | `1.2` | Насиченість. |
| `--beam-fade-in` / `--beam-fade-out` | `.6s` / `.5s` | Поява та зникання. |
| `--bc-1` … `--bc-9` | — | Дев'ять кольорів палітри. |
| `--beam-breathe-duration` | `4s` | Тільки `travel`: пульсація висоти. |
| `--beam-spike-duration` | `4.1s` | Тільки `travel`: мерехтіння голок. |
| `--beam-spike-scale` | `1` | Тільки `travel`: розмір голок. |

## Що ще варто знати

- При `prefers-reduced-motion: reduce` анімація зупиняється, сяйво лишається статичним. Вимкнути: `BorderBeam.attach(el, { respectReducedMotion: false })`. У плейграунді це вимкнено навмисно, інакше не було б що дивитися.
- Анімуються тільки `opacity`, `filter` і зареєстровані змінні, жодних layout-перерахунків. Але `blur()` на bloom-шарі не безкоштовний: не вішайте ефект на десятки елементів одночасно.
- Потрібні `@property` та `mask-composite`: Chrome і Edge 120+, Safari 16.4+, Firefox 128+. У старіших браузерах ефект просто не показується, елемент лишається звичайним.
