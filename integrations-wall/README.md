# Integrations wall

Стіна логотипів інтеграцій, як блок «200+ Integrations» на ramp.com: зміщена сітка плиток, більша за свій бокс, озирається за курсором, повільно дрейфує в спокої й тане до країв через еліптичну маску. Плитка під курсором піднімається.

## Файли

| Файл | Що це |
|---|---|
| `wall.css` | бокс, аркуш, плитки, маска; усе візуальне живе тут на кастомних властивостях `--iw-*` |
| `wall.js` | `IntegrationsWall`, без залежностей: розкладає плитки, клонує їх по колу до потрібної кількості клітинок, рухає аркуш |
| `demo.html` | приклад підключення |
| `playground.js` | опис для плейграунду: контроли, пресети, сніпет. На сайт не потрібен |

## Підключення

```html
<link rel="stylesheet" href="wall.css">

<div class="iwall" id="wall">
  <div class="iwall__sheet">
    <figure class="iwall__tile"><img src="logos/slack.svg" alt="Slack"></figure>
    <figure class="iwall__tile"><img src="logos/telegram.svg" alt="Telegram"></figure>
    …
  </div>
</div>

<script src="wall.js"></script>
<script>
  const wall = IntegrationsWall.create(document.getElementById('wall'), { pan: 0.35 });
</script>
```

Модуль — лише стіна. Боксу потрібен розмір (він `position: relative; overflow: hidden`); у картці з заголовком найпростіше дати йому `position: absolute; inset: 0`, а текст покласти поверх з `z-index`. Кількість плиток довільна: скрипт клонує їх по колу, щоб заповнити `columns × rows` клітинок, зайві ховає. За замовчуванням (`0`) сітка сама рахується від розміру боксу з запасом у плитку з кожного боку, тож край аркуша ніколи не видно. Або без JS-ініціалізації: `<div class="iwall" data-iwall data-iwall-columns="9">`.

Опції з дефолтами й коментарями у шапці `wall.js`: сітка (`columns`, `rows`, `tile`, `gap`, `stagger`, `radius`, `logo`), рух (`pan`, `ease`, `drift`, `driftPeriod`, `hoverScale`), маска (`mask`, `maskX/Y`, `maskRx/Ry`, `maskSolid`). `wall.setOptions({...})`, `pause()`, `resume()`, `destroy()`.

## Логотипи

У плейграунді й у `demo.html` бренд-марки беруться з CDN Simple Icons (CC0) і Devicon (MIT), тож без інтернету плитки порожні. На сайті поклади свої SVG у `logos/` і вкажи їх у `src`. Фон плитки — `--iw-surface`, розмір логотипа — опція `logo`.

`prefers-reduced-motion`: без дрейфу й озирання, плитки лишаються.
