# Integrations wall

Стіна логотипів інтеграцій, як блок «200+ Integrations» на ramp.com: зміщена сітка плиток, більша за свій бокс, озирається за курсором, повільно дрейфує в спокої й тане до країв через еліптичну маску. Плитка під курсором піднімається.

## Файли

| Файл | Що це |
|---|---|
| `wall.css` | бокс, аркуш, плитки, танення до країв; усе візуальне живе тут на кастомних властивостях `--iw-*` |
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

За замовчуванням — інтеграції Worksection (Google Drive / Docs / Sheets / Slides, Slack, Telegram, Viber, Gmail, Google Calendar, Outlook, Apple Calendar, Zapier, Make). У плейграунді група «Логотипи» вмикає й вимикає марки з каталогу, а в поле можна вписати `logos:назва` з набору SVG Logos на icon-sets.iconify.design, slug із simpleicons.org або URL до свого SVG; сніпет перелічує плитки в тому ж порядку. Марки в плейграунді та `demo.html` — оригінальні кольорові: SVG Logos через Iconify (CC0), Wikimedia Commons (Google Docs / Sheets / Slides, Viber, Outlook, Apple Calendar) і Simple Icons лише там, де марка й так одноколірна; усе з CDN, тож без інтернету плитки порожні. На сайті поклади свої SVG у `logos/` і вкажи їх у `src`. Фон плитки — `--iw-surface`, розмір логотипа — опція `logo`. Короткий список не повторюється смугами: рядки йдуть по списку з кроком золотого перетину.

Танення до країв — не `mask-image` (маска на боксі перемальовувала б усі логотипи щокадру), а статичний радіальний градієнт кольору фону поверх аркуша. Колір береться автоматично з фону за боксом (`fade: 'auto'`, перечитується двічі на секунду), або задай свій: `fade: '#fff'`.

`prefers-reduced-motion`: без дрейфу й озирання, плитки лишаються.
