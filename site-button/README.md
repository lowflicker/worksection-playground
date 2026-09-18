# Button

Кнопки сайту — джерело правди про те, що є в коді. Система `.btn` тут не переписана: плейграунд і демо вантажать [`site-css/buttons.css`](../site-css/buttons.css) — це `assets/css/buttons.css` з worksection.com дослівно. Панель пропонує рівно ті класи, що в ньому є (варіант, розмір, тег, свій текст, іконка з сайту і її місце, пігулка, стан), «Показати всі варіанти» під кнопкою розгортає кожен варіант у кожному розмірі, сніпет — розмітку сайту.

Нове тут одне: `.btn-beam` — промінь [border-beam](../border-beam) у моно на темній головній кнопці (передано розробникам, скоро буде на сайті).

## Файли

| Файл | Що це |
|---|---|
| [`../site-css/buttons.css`](../site-css/buttons.css) | система `.btn` сайту як є. На сайт не потрібен — він уже там |
| `button.css` | те, чого на сайті за цією адресою нема: бокс `ws-icon` (на сайті він у `common.css`) і модифікатор `.btn-beam` |
| `demo.html` | статичний аркуш: усі варіанти × розміри, модифікатори, промінь |
| `playground.js` | опис для плейграунду. На сайт не потрібен |

На сайт із цієї теки береться лише блок `.btn.btn-beam` з `button.css` і файли ефекту `beam.css` + `beam.js` з `../border-beam/`. Плейграунд: `../index.html`, вкладка «Button». Кнопка — компонент: її копії стоять у «Hero» і повторюють налаштування променя з цієї вкладки.

## Розмітка

```html
<a class="btn btn-48 btn-primary btn-rounded" href="…"><span>Get started</span></a>
<button class="btn btn-40 btn-secondary" type="button"><span>Дивитись демо</span><ws-icon><svg width="20" height="20" …></svg></ws-icon></button>
<button class="btn btn-32 btn-secondary btn-square" type="button"><ws-icon><svg width="16" height="16" …></svg></ws-icon></button>
<button class="btn btn-48 btn-secondary" type="button" disabled><span>Недоступно</span></button>
```

| Клас | Що це |
|---|---|
| `btn-32` `btn-36` `btn-40` `btn-48` `btn-56` | розмір. Висота 32 · 32 · 40 · 48 · 56 px — `btn-36` відрізняється від `btn-32` лише шириною квадрата (36 px). Кути 10 · 10 · 12 · 12 · 14 px, шрифт на `<span>` — `--font-body-semi-xs` / `-med-md` / `-med-lg` |
| `btn-primary` `btn-secondary` `btn-tertiary` `btn-accent` `btn-plain` `btn-ghost` | варіант |
| `btn-invert` | для темної підкладки; є у `btn-primary`, `btn-secondary`, `btn-tertiary` |
| `btn-white` | лише разом з `btn-primary`. Свого кольору іконки не має — вона лишається білою від `btn-primary` |
| `btn-rounded` | пігулка: `border-radius: 50px !important` |
| `btn-square` | квадрат під іконку, ширина = висоті, всередині лише `<ws-icon>`. У `btn-56` такого правила нема |
| `btn-active` | натиснутий стан як клас (той самий вигляд, що `:active`) |
| `disabled` (атрибут) | вигляд `btn-ghost` і `pointer-events: none` |

- Тег: `<a class="btn …" href>` — `display: inline-flex`; `<button class="btn …" type="button">` — `display: flex`.
- Іконка: `<ws-icon><svg …></ws-icon>` після або перед `<span>`. У `btn-32`/`btn-36` CSS примусово робить svg 16 px, у більших розмір задає сам svg (на сайті 20 px). `path` без `fill` бере колір варіанта через `ws-icon svg { fill }`. Бокс `ws-icon` 20×20 px на сайті задає `common.css`; тут його дає `button.css`.
- `:hover` і `:active` — з CSS сайту, у плейграунді живі.

## Промінь на головній

```html
<link rel="stylesheet" href="beam.css">
<link rel="stylesheet" href="button.css">   <!-- або лише блок .btn.btn-beam у свій CSS -->

<a class="btn btn-48 btn-primary btn-rounded btn-beam beam" data-beam data-trigger="always" href="…"><span>Get started</span></a>

<script src="beam.js"></script>   <!-- сам вмикає ефект на кожному [data-beam] -->
```

Лише на `btn-primary` без `btn-invert`/`btn-white`. `beam.css` має йти перед `button.css`: `.btn-beam` перевизначає змінні ефекту. Радіус променя іде від розміру і `btn-rounded`, палітра моно. Підкрутити: `--beam-duration`, `--beam-arc`, `--beam-strength`, `--beam-bloom-blur`, `--beam-brightness` на `.btn-beam` (плейграунд віддає готовий блок зі змінами). `data-trigger="hover"` — промінь лише на наведення. Повний список змінних і API — у [border-beam/README.md](../border-beam/README.md).

## Що ще варто знати

- Вкладений CSS (`&`): Chrome і Edge 120+, Safari 17.2+, Firefox 117+. Сайт уже його використовує.
- Ефект ставить на кнопку `overflow: hidden` і `isolation: isolate`; тінь кнопки лишається, бо вона зовнішня.
- Оновити `site-css/buttons.css` з сайту — команда в [site-css/README.md](../site-css/README.md); після цього плейграунд покаже нові класи сам, `playground.js` треба поправити лише якщо додався варіант чи розмір.
