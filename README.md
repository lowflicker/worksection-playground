# Worksection blocks playground

Плейграунд для блоків промосайту Worksection і візуальних ефектів для UI: крутиш параметри, бачиш результат, копіюєш готовий код.

Онлайн: https://lowflicker.github.io/worksection-playground/

| Вкладка | Модуль | Що це |
|---|---|---|
| S : Clients | [`logo-wall/`](logo-wall) | логотипи клієнтів, свап через блюр хвилею |
| S : Short answer | [`short-answer/`](short-answer) | вердикт і варіанти, зв'язані живими конекторами |
| Float actions | [`float-actions/`](float-actions) | кнопки support і ringostat поверх сайту |
| Border beam | [`border-beam/`](border-beam) | веселкове світло по межі елемента, чистий CSS |
| Dot sphere | [`dot-sphere/`](dot-sphere) | 3D-сфера з точок на canvas, реагує на курсор |

Кожен модуль: `*.css` + `*.js` без залежностей, `demo.html`, `README.md`.

Плейграунд це один `index.html`, у який усі модулі інлайняться, тому він працює з `file://` і на GitHub Pages без сервера. Перезібрати після правок модулів:

```bash
python3 build-playground.py
```

Джерело плейграунду: `playground.template.html`.
