# Worksection blocks playground

Плейграунд для блоків промосайту Worksection: крутиш параметри, бачиш результат, копіюєш готовий код.

Онлайн: після публікації на GitHub Pages адреса буде `https://<user>.github.io/<repo>/`.

| Вкладка | Модуль | Що це |
|---|---|---|
| S : Clients | [`logo-wall/`](logo-wall) | логотипи клієнтів, свап через блюр хвилею |
| S : Short answer | [`short-answer/`](short-answer) | вердикт і варіанти, зв'язані живими конекторами |
| Float actions | [`float-actions/`](float-actions) | кнопки support і ringostat поверх сайту |

Кожен модуль: `*.css` + `*.js` без залежностей, `demo.html`, `README.md`.

Перезібрати `index.html` після правок модулів:

```bash
python3 logo-wall/build-playground.py
```
