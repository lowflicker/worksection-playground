# Short answer

Блок «Short answer»: вердикт зліва, варіанти справа, між ними живі конектори. При вході на екран лінії малюються від вердикту до карток, далі по них періодично йде імпульс. Гілка до нейтрального варіанта гасне на півдорозі, гілка до акцентного доходить і на мить підсвічує картку. Наведення на картку пускає імпульс по її лінії.

## Файли

| Файл | Що це |
|---|---|
| `short-answer.css` | стилі блоку |
| `short-answer.js` | клас `ShortAnswer`, без залежностей, логотипи Trello і Worksection вшиті |
| `demo.html` | приклад підключення |
| `playground.js` | опис для плейграунду: контроли, пресети, сніпет. На сайт не потрібен |

На сайт беруть `short-answer.css` + `short-answer.js`. Плейграунд: `../index.html`, вкладка «Short answer».

## Підключення

```html
<link rel="stylesheet" href="short-answer.css">

<section id="answer" aria-label="Short answer"></section>

<script src="short-answer.js"></script>
<script>
  new ShortAnswer('#answer', {
    verdict: { title: 'Short answer', text: '…' },
    options: [
      { name: 'Trello, If all you need is a simple board', text: '…', logo: 'trello', tone: 'neutral' },
      { name: 'Worksection, If you need the full process', text: '…', logo: 'worksection', tone: 'accent',
        cta: { label: 'Get started Free', href: '/signup' } },
    ],
  });
</script>
```

Усі інші опції мають дефолти. Повний список з коментарями у шапці `short-answer.js`. Плейграунд показує готовий сніпет з будь-якими підкрученими значеннями.

`tone: 'accent'` вмикає синю рамку, фон і повний імпульс. `tone: 'neutral'` дає сіру картку, імпульс по її лінії гасне на `sideReach`. Карток може бути більше двох, конектори рахуються від DOM.

`logo` приймає `'trello'`, `'worksection'` або рядок з власним `<svg>`.

## Як це працює

- Лінії малюються в SVG поверх блоку з реальних координат карток, тож підлаштовуються під висоту тексту і ширину контейнера.
- Поруч (ширина контейнера ≥ `stackBelow`): S-криві від правого краю вердикту до лівого краю кожної картки, як у Figma.
- Стек (< `stackBelow`): картки під вердиктом, лінія стає ниткою вздовж лівого краю з закругленим коліном у кожну картку.
- Імпульс: дві копії шляху зі `stroke-dasharray`, коротка яскрава голова з тінню і довший блідий хвіст, зсув анімується через Web Animations API.
- Промінь по рамці кнопки зроблений на CSS conic-gradient з маскою, а не WebGPU-шейдером із Figma.

## Що ще варто знати

- Імпульси йдуть тільки поки блок на екрані і вкладка активна.
- При `prefers-reduced-motion` немає ні появи, ні імпульсів, ні променя: блок просто показаний.
- Події на корені: `sa:reveal` після появи, `sa:pulse` з `detail.index` коли імпульс стартує по акцентній гілці.
- Методи: `setOptions(patch)`, `pulse(index?)`, `replay()`, `start()`, `stop()`, `destroy()`.
