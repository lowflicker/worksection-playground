# site-css — CSS з worksection.com

Копії стилів просайту (`worksection.com/assets/css/`, збірка `cache3729`, знято 2026-09-18). Це орієнтир для модулів: там, де на сайті є токен для кольору, шрифту чи тіні, модуль бере його, а не власне число. У шелі плейграунду і на канвасі ці змінні не вживаються ніколи.

## Що вантажиться

`tokens.css` — єдина точка входу, лише `:root`-змінні (443), у порядку сайту:

| Файл | Що всередині |
|---|---|
| `palette.css` | сира палітра: `--base-greengrey-*`, `--base-white-a-*`, `--color-lime-*`, `--color-emerald-*`… |
| `named.colors.css` | семантичні акценти: `--accent-primary-*`, `--accent-secondary-*`, `--danger-*`, `--warning-*` |
| `colors.css` | ролі: `--text-base-*`, `--bg-surf-*`, `--border-*`, `--btn-b-*`, `--input-*`, `--global-state-focus-*` |
| `shadows.css` | `--shadow-small` … `--shadow-large`, inset-варіанти |
| `fonts.css` | родини, розміри, інтерліньяж і зібрані шорткати `--font-display-*`, `--font-heading-*`, `--font-body-*`; `body.mobile` — мобільні розміри. Без `@font-face` — файли шрифтів сайт не віддає крос-доменно |

Підключено в `index.html` до CSS модулів і в кожному `demo.html`. На самому сайті нічого з цього не потрібно — токени там уже є.

## Довідка (не вантажиться)

| Файл | Навіщо |
|---|---|
| `buttons.css` | справжня система `.btn`; `site-button/button.css` — її дзеркало плюс `.btn-beam` |
| `menu.css` | випадайки шапки (`.menu`, `--menu-width`) |
| `main.css` | рамка сторінки (`body`, `.section`, `.section-*`, `.section-header`, `.canvas`) і всі секції головної: `.hero`, `.logotypes`, `.header`, `.tabs`, `.carousel`, `.footer`… — дивитись, як секція зверстана на сайті, перш ніж робити модуль |
| `adaptive.css` | брейкпоінти сайту: `min-width: 1240` (десктоп), `max-width: 991 / 800 / 620 / 470 / 380`; `.mobile-only` |
| `common.css` | ресет `* { margin: 0; padding: 0 }`, `ws-icon`, `.grid__universal`, `.accordion`. Через глобальний ресет його не можна вантажити в плейграунд; модуль має виглядати правильно і з ним, і без нього |

Не збережено: `modal.css`, `longFeatures-mobile.css` (сторінкове) і все з `/css/` — це апка, не просайт.

## Оновити

```bash
for f in palette named.colors colors shadows buttons menu common main adaptive; do curl -sS "https://worksection.com/assets/css/$f.css" -o "site-css/$f.css"; done
```

`fonts.css` — вручну: зняти `@font-face` зверху, лишити коментар. Після оновлення — `git diff`, і якщо змінилися імена токенів, `grep` по модулях.
