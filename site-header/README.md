# Site header

Шапка worksection.com як окремий модуль: липка пігулка з брендом, меню з випадайками, мовою, входом і двома CTA. На скролі стискається (1360 → 1024 px), нижче 1240 px лишає у пігулці бренд, реєстрацію і бургер, бургер відкриває лист на всю висоту з тим самим меню. Без залежностей, без збірки. Кладеться над `hero-section/` як є: і в плейграунді, і в демо [`demo.html`](demo.html) під шапкою стоїть справжній Hero.

## Підключення

```html
<!-- кнопки в діях це компонент сайту (.btn, buttons.css — на сайті вже є). Промінь на чорній:
     beam.css + beam.js з border-beam/ і button.css з .btn-beam, як у хіро -->
<link rel="stylesheet" href="beam.css">
<link rel="stylesheet" href="button.css">
<link rel="stylesheet" href="header.css">

<header class="site-header" id="header">
  <div class="site-header__bar">
    <div class="site-header__left">
      <a class="site-header__brand" href="/"><svg …/><span>worksection</span></a>
      <nav class="site-header__menu" aria-label="Main menu">
        <div class="site-header__group">
          <button type="button" class="site-header__item" aria-expanded="false"><span>Product</span><svg …/></button>
          <div class="site-header__panel">                <!-- site-header__panel--2: two columns, as «Solutions» -->
            <a class="site-header__link" href="…">Overview</a>
            …
          </div>
        </div>
        …
        <a class="site-header__item" href="…"><span>Pricing</span></a>
      </nav>
    </div>
    <div class="site-header__actions">
      <button type="button" class="site-header__btn site-header__btn--plain site-header__lang">…<span>EN</span>…</button>
      <a class="btn btn-36 btn-plain btn-rounded" href="…"><span>Log in</span></a>
      <a class="btn btn-36 btn-accent btn-rounded" href="…"><span>Book a demo</span></a>
      <a class="btn btn-36 btn-primary btn-rounded btn-beam beam" data-beam data-trigger="always" style="--beam-duration: 4.8s" href="…"><span>Registration</span></a>
      <button type="button" class="site-header__burger" aria-expanded="false" aria-label="Menu"><svg …/><svg …/></button>
    </div>
  </div>
</header>

<script src="beam.js"></script>
<script src="header.js"></script>
<script>new SiteHeader('#header');</script>
```

Повна розмітка з іконками у вкладці «index.html» плейграунду. Шапка йде першою в `body`; вона `position: sticky`, тож тримається зверху сама, а хіро чи будь-який інший блок просто йде наступним. Меню написане один раз: мобільний лист `header.js` збирає з `.site-header__menu` і `.site-header__actions`. Три кнопки дій — звичайні `.btn` сайту (`btn-36`, `btn-rounded`; `btn-plain` / `btn-accent` / `btn-primary`), шапка їх лише розставляє; чорна несе `btn-beam` — промінь з border-beam/ (без `beam.js` вона просто чорна кнопка). Без JS шапка теж працює: липка пігулка з живими посиланнями, лише без випадайок і листа.

## Опції

| Опція | Типово | Що робить |
|---|---|---|
| `sticky` | `true` | Липка. `false`: їде разом зі сторінкою |
| `compact` | `true` | Стискати пігулку після скролу |
| `compactAfter` | `24` | px скролу до стиснення |
| `trigger` | `'hover'` | Як відкриваються випадайки з мишею: `'hover'` або `'click'`. Тач і клавіатура завжди клік / фокус |
| `hoverDelay` | `60` | мс до відкриття при наведенні |
| `closeDelay` | `160` | мс, поки курсор може вийти за межі і повернутись |

## API

```js
const bar = new SiteHeader('#header', { compactAfter: 40 });
bar.open(); bar.close(); bar.toggle();   // мобільний лист
bar.isOpen;                              // чи відкритий
bar.setOptions({ trigger: 'click' });    // будь-яка опція на льоту
bar.destroy();
```

Події на корені: `header:compact` (`detail.compact`), `header:open`, `header:close`.

## Як це працює

Стиснення без слухача скролу. `header.js` ставить перед шапкою сентинел на 1 px, зсунутий на `compactAfter` вниз, і дивиться на нього через IntersectionObserver: щойно сентинел виходить з в’юпорту, шапка отримує `site-header--compact`, пігулка звужує `max-width` до `--sh-width-compact`, а меню підтягує відступи. Це працює однаково, коли скролиться window і коли скролиться внутрішній контейнер.

Випадайки: наведення (лише на пристроях з мишею, з `hoverDelay`), фокус і клік відкривають `.site-header__group` через `data-open`; Escape, клік поза групою, вихід курсора (з `closeDelay`) або втрата фокусу закривають. Панель має невидимий місток над собою, тож рух курсора з пункту в панель не закриває її. Відкритою може бути одна.

Лист: бургер перемикає `site-header--open` і `aria-expanded`. Пігулка стає плоскою білою смугою на всю ширину, під нею з’являється лист на висоту в’юпорту (`--sh-sheet-h`, коли сторінка скролиться не window, `header.js` ставить її сам). Найближчий скрол-контейнер на час відкриття отримує `overflow: hidden`. Групи в листі це акордеони, підпункти ті самі посилання, що й у панелях. Escape закриває і повертає фокус на бургер; якщо шапка знову стала ширшою за 1240 px, лист закривається сам.

Брейкпоінти це container queries на самій шапці (`container-type: inline-size`), тому пресети ширини фрейму у плейграунді показують справжню мобільну розкладку. Запити міряють content box, тож бокові відступи живуть на пігулці, а не на шапці. Розкладки: ≥ 1240 px повна; 620–1239 px пігулка 566 px, бренд + реєстрація + бургер; < 620 px пігулка на всю ширину мінус 20 px з боку; < 470 px бренд на 80 %.

## Змінні

Усе на `.site-header`: шрифти (`--sh-font`, `--sh-font-brand`), кольори тексту (`--sh-ink`, `--sh-ink-2`, `--sh-ink-3`), фон пігулки `--sh-surface` (з альфою, під нею `--sh-blur`), `--sh-tint` для ховерів, палітра кнопок (`--sh-accent*`, `--sh-dark*`), тінь `--sh-shadow`, геометрія (`--sh-width`, `--sh-width-compact`, `--sh-radius`, `--sh-top`, `--sh-bottom`, `--sh-gutter`), анімація (`--sh-speed`, `--sh-ease`) і `--sh-z`.

## На що звернути увагу

- `backdrop-filter` на пігулці коштує композитору окремий шар; на слабких телефонах при скролі це помітно. Якщо треба, `--sh-blur: 0` і непрозорий `--sh-surface`.
- Відкриття меню на вузькому — перехід, а не підміна: пігулка розтягується у
  плоску смугу (ширина, паддинг, радіус, фон і блюр — усі в одному `transition`
  на `--sh-speed`), лист проявляється по `opacity`, а його вміст осідає на місце.
  Ніщо не ховається через `display`, бо display не анімується: лист і розділи
  меню зняті `visibility`, і вона гасне вже після затухання. Розділ меню
  розкривається рядком сітки `0fr → 1fr`, тож решта пунктів не стрибає вниз;
  посилання лежать в `.site-header__sheet-list` — саме його висоту й обрізає
  рядок. При `prefers-reduced-motion: reduce` усе це вимикається.
- Шапка не має власних шрифтів: очікує Inter і Work Sans зі сторінки, інакше системний.
  Вордмарк («worksection» поруч зі знаком) набраний Work Sans 600 через `--sh-font-brand`,
  тож сторінка має цей шрифт дати. У плейграунді й у [`demo.html`](demo.html) він приходить
  з Google Fonts:
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@600&display=swap">`.
  Свій набір шрифтів підставляється в `--sh-font` і `--sh-font-brand`, файл чіпати не треба.
- Панелі випадайок тут це прості списки посилань. Мегаменю сайту з колонками й описами лягає в ту саму `.site-header__panel`, стилі кнопок не чіпаються.
- `header.js` вставляє сентинел перед `<header>`; якщо шапка перший елемент у `body`, він стане першим, це нормально.
