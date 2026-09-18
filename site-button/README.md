# Button

Кнопки сайту. `button.css` — дзеркало системи `.btn` з worksection.com: ті самі класи, вкладеність і токени, значення зняті з живого сайту. Потрібне, щоб плейграунд і демо малювали кнопки точно як сайт. **На самому сайті цей файл не потрібен** — класи там уже є.

Нове тут одне: варіант `.btn-beam` — промінь [border-beam](../border-beam) у моно-стилі на темній головній кнопці.

## Файли

| Файл | Що це |
|---|---|
| `button.css` | система `.btn` як на сайті + модифікатор `.btn-beam` |
| `demo.html` | усі варіанти й розміри поруч |
| `playground.js` | опис для плейграунду. На сайт не потрібен |

На сайт беруть із цього файлу лише блок `.btn.btn-beam` (кінець файлу) і файли ефекту `beam.css` + `beam.js` з `../border-beam/`. Плейграунд: `../index.html`, вкладка «C : Button». Кнопка — компонент: її копії стоять у «S : Hero» і повторюють налаштування з цієї вкладки.

## Розмітка

```html
<a class="btn btn-48 btn-primary btn-rounded" href="…"><span>Get started</span></a>
<a class="btn btn-48 btn-secondary btn-rounded" href="…"><span>Contact sales</span></a>
<button type="button" class="btn btn-36 btn-accent btn-rounded"><span>Забронювати демо</span></button>
```

| Клас | Що це |
|---|---|
| `btn-32` `btn-36` (обидва 32 px), `btn-40`, `btn-48`, `btn-56` | розмір; шрифт тексту в `<span>` іде від розміру |
| `btn-primary` `btn-secondary` `btn-tertiary` `btn-accent` `btn-plain` `btn-white` `btn-ghost` | варіант |
| `btn-rounded` | пігулка (50 px) замість кутів 10–14 px |
| `btn-invert` | для темної підкладки (є у primary, secondary, tertiary) |
| `btn-square` | квадратна, під іконку |
| `btn-active`, `[disabled]` | стани |

## Промінь на головній

```html
<link rel="stylesheet" href="beam.css">
<link rel="stylesheet" href="button.css">   <!-- або лише блок .btn.btn-beam у свій CSS -->

<a class="btn btn-48 btn-primary btn-rounded btn-beam beam" data-beam data-trigger="always" href="…"><span>Get started</span></a>

<script src="beam.js"></script>   <!-- сам вмикає ефект на кожному [data-beam] -->
```

`beam.css` має йти перед `button.css`: `.btn-beam` перевизначає змінні ефекту. Радіус променя іде від розміру і `btn-rounded`, палітра моно. Підкрутити: `--beam-duration`, `--beam-arc`, `--beam-strength`, `--beam-bloom-blur`, `--beam-brightness` на `.btn-beam` (плейграунд віддає готовий блок зі змінами). `data-trigger="hover"` — промінь лише на наведення. Повний список змінних і API — у [border-beam/README.md](../border-beam/README.md).

## Що ще варто знати

- Вкладений CSS (`&`): Chrome і Edge 120+, Safari 17.2+, Firefox 117+. Сайт уже його використовує.
- `display: inline-flex` замість `flex` на сайті, щоб одиночна кнопка не рвала рядок; у флекс-рядах різниці немає.
- Ефект ставить на кнопку `overflow: hidden` і `isolation: isolate`; тінь кнопки лишається, бо вона зовнішня.
