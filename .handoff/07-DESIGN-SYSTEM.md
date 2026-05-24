# 07 — Дизайн-система Ice Logix (для агента)

> **Кто читает:** агент Antigravity (или любой другой LLM-агент) перед UI-задачей.
> **Обязательно загрузи этот файл первым (`@file 07-DESIGN-SYSTEM.md`) перед любой задачей про UI / иконки / модалки / селекты.**
> **Цель:** агент должен переиспользовать существующие компоненты, а не строить параллельные.

Эта система собрана в PR #19 (functional fixes) + PR #20 (glassmorphism pass). Она живёт целиком в одном `index.html` (~9300 строк), без отдельных JS-модулей.

---

## 1. Глобальный стиль — Glassmorphism (Life.by-inspired)

Ключевые CSS-классы которые уже определены и должны переиспользоваться:

| Класс | Назначение |
|---|---|
| `glass-card` | Полупрозрачная карточка с backdrop-blur, скруглением и тонкой обводкой. Базовый строительный блок секций. |
| `glass-modal` | Модалка-окно (внутри `glassModal()`). Сам не используешь — вызывай `glassModal({...})`. |
| `gx-sheet`, `gx-sheet-overlay` | Bottom-sheet picker для glass-select. Сам не используешь — вызывай `enhanceSelect()` / `enhanceAllSelects()`. |
| `glass-toast` + `toast-success/warning/error/info` | Транзиентное уведомление. Сам не используешь — вызывай `glassToast(msg, {kind})`. |
| `filter-chip` + `.active` | Кнопка-таблетка для фильтров (в каталогах, в админке). Уже есть стиль. |
| `story-card` + `story-icon` + `story-label` | Скруглённая иконка-плитка для горизонтальных сторис (площадки, рекомендации). |
| `scroll-x` | Горизонтальный скролл-контейнер с hidden scrollbar. |
| `global-back-btn` | Стандартная «Назад» кнопка в верхнем-левом углу sub-screen. |
| `page-enter` | Анимация появления страницы (используй `style="animation-delay: 0.Xs"` для каскада). |
| `skeleton` | Loading-плейсхолдер. |

**Палитра:**

```css
--ice-primary: #5BBFEB    /* primary blue (CTA, links) */
--ice-deep:    #2E9ED4    /* deeper blue (hover/active accents) */
--text-secondary: rgba(255,255,255,0.7)   /* main body text on glass */
--text-muted:     rgba(255,255,255,0.5)   /* помощь, sub-копии */
```

Все стили лежат внутри одного `<style>` блока в `<head>` файла `index.html`. Никаких внешних CSS-файлов нет. Tailwind подключён через CDN — можешь добавлять Tailwind-классы свободно.

---

## 2. SVG-иконки — `ICON_PATHS` + `ix(name, opts)`

В `index.html` определён объект `ICON_PATHS` с ~120 готовыми SVG-иконками (24×24 viewBox, currentColor stroke). Все эмодзи (кроме флагов стран и иконок таб-бара/шапки v0.dev) заменены на эти SVG.

### Использование

```js
// В JS-строке (например в renderHome()):
const html = `<button>${ix('cart')} В корзину</button>`;

// С опциями:
ix('check', { size: '20px', stroke: 1.5, cls: 'ix-accent' })

// Где результат — `<span class="ix"><svg>...</svg></span>`
```

### Опции `ix()`

| Опция | Default | Что делает |
|---|---|---|
| `size` | `''` (=1em) | Ширина и высота через inline `style="width:X;height:X"` |
| `stroke` | `2` | `stroke-width` SVG |
| `viewBox` | `'0 0 24 24'` | viewBox |
| `fill` | `'none'` | fill SVG (для filled icons: `'currentColor'`) |
| `cls` | `''` | Доп. CSS-класс на `<span>` (например `'ix-accent'`, `'ix-warning'`, `'ix-fill'`) |
| `style` | `''` | inline style на `<span>` |

### Helper-варианты для конкретных случаев

| Функция | Назначение |
|---|---|
| `brandFlake(opts)` | Stylized снежинка (для брендинга, не на балансе — баланс уже использует свою inline SVG). |
| `mpDot(color)` | Цветной кружок для статусов площадок (заменяет 🟢🟠🟡 эмодзи). |
| `starRow(rating, max=5)` | Ряд звёзд по rating (0..5). |

### Полный список доступных имён иконок (120 шт.)

**Статус / общие:** `check`, `x`, `info`, `warn`, `error`, `hourglass`, `celebrate`, `sparkles`

**Стрелки / навигация:** `arrowLeft`, `arrowRight`, `arrowUp`, `arrowDown`, `arrowUpRight`, `chevronLeft`, `chevronRight`, `chevronDown`, `chevronUp`, `externalLink`, `refresh`, `compare`

**Действия:** `plus`, `minus`, `edit`, `trash`, `copy`, `paste`, `save`, `send`, `filter`, `settings`, `search`, `eye`, `eyeOff`, `link`, `attach`, `upload`, `download`

**Пользователь / соц:** `user`, `users`, `crown`, `wave`, `bell`, `chat`, `mail`, `phone`

**Коммерция:** `cart`, `bag`, `package`, `truck`, `gift`, `tag`, `coins`, `wallet`, `card`, `diamond`, `heart`, `heartOutline`, `star`, `starHalf`, `fire`

**Контент:** `image`, `camera`, `video`, `file`, `clipboard`, `note`, `bookOpen`, `academy`

**Метрики:** `chart`, `trendingUp`, `trophy`

**Безопасность:** `shieldCheck`, `lock`, `unlock`, `key`

**Геолокация / время:** `globe`, `clock`, `calendar`, `mapPin`, `home`

**Раскладки:** `list`, `grid`, `menu`

**Прочее:** `flash`, `robot`, `airplane`, `moon`, `sun`, `database`, `passport`, `languages`

**Категории товаров:** `sneaker`, `boot`, `sandal`, `shoe`, `tshirt`, `jacket`, `pants`, `shorts`, `dress`, `suit`, `swim`, `backpack`, `bagHandle`, `walletSmall`, `belt`, `watch`, `sunglasses`, `cap`, `ring`, `flower`, `cosmetic`

**UI:** `smartphone`, `briefcase`, `pin`, `ticket`, `megaphone`, `box`, `newBadge`, `bot`

### Правила для агента

1. **Не создавай новые inline SVG.** Если нужна иконка — найди ближайшую в списке выше. Если правда нет подходящей — добавь новую запись в `ICON_PATHS` (внутри `const ICON_PATHS = { ... }` блока, ~строка 1535), а затем используй через `ix('myNewIcon')`.
2. **Не используй эмодзи в HTML.** Исключения: флаги стран в селекторе площадок (🇨🇳🇵🇱🇪🇺🇷🇺), иконки таб-бара и шапки v0.dev (их не трогаем).
3. **`CATEGORY_MAP`** (~строка 6420) уже переведён на имена иконок (например `{ name: 'Кроссовки', icon: 'sneaker' }`). Когда добавляешь новую категорию — добавляй с `icon: '<имя из списка>'`, а не с эмодзи.

---

## 3. Glass-модалка — `glassModal(opts)`

Замена `alert()` / `confirm()` / `tgUtil.alert()` / `tgUtil.confirm()`. **Уже подключена** — `tgUtil.alert/confirm/popup` теперь под капотом зовут `glassModal()`. Так что если ты пишешь новый код — просто используй `tgUtil.alert(...)` как раньше, и оно отрисует glass-стиль автоматически.

### Прямое использование

```js
const result = await glassModal({
  title: 'Заголовок',
  message: 'Текст сообщения',
  kind: 'confirm',   // 'info' | 'success' | 'warning' | 'error' | 'confirm'
  buttons: [
    { id: 'cancel', label: 'Отмена', variant: 'ghost' },
    { id: 'ok', label: 'Подтвердить', variant: 'primary' },  // variant: 'primary' | 'danger' | 'ghost' | ''
  ],
});
// result === 'ok' | 'cancel' | <id кнопки>
```

### Через `tgUtil` (предпочтительно для простых случаев)

```js
await tgUtil.alert('Сохранено');           // одиночная OK-кнопка
const yes = await tgUtil.confirm('Удалить?'); // boolean
await tgUtil.popup({                        // полный контроль
  title: '...', message: '...',
  buttons: [{ id: 'ok', type: 'default', text: 'OK' }]
});
```

### Поведение

- Bottom-sheet на мобиле (TMA), centered на десктопе
- Backdrop-blur 28px
- Kind-aware иконка слева от заголовка (берётся через `ix()`)
- На Telegram-клиентах с поддержкой нативного popup — fallback в native popup (для лучшего UX), если кнопок ≤ 3 и нет сложного `kind`. Этим управляет `tgUtil` сам.
- Поддерживает закрытие по клику на backdrop и по Escape.

### Auto-detection kind по тексту

`_guessKind(msg)` подбирает kind по префиксу:
- `❌` / `ошибк` / `не уда` / `сбой` → `error`
- `⚠` / `внимание` → `warning`
- `✅` / `🎉` / `готово` / `успешн` → `success`
- иначе → `info`

Так что старые места кода которые делают `tgUtil.alert('❌ Ошибка ...')` автоматом получают красную иконку.

---

## 4. Glass-toast — `glassToast(message, opts)`

Транзиентное уведомление (исчезает через 2.6с). Используй вместо коротких `alert()` для feedback после успешных действий.

```js
glassToast('Скопировано в буфер', { kind: 'success' });
glassToast('Не удалось загрузить', { kind: 'error', duration: 4000 });
```

`kind`: `'info'` | `'success'` | `'warning'` | `'error'` (default `info`).

---

## 5. Glass-select — `enhanceSelect(el)` / `enhanceAllSelects(root?)`

Заменяет нативный `<select>` на full-screen bottom-sheet picker с поиском и optgroup-поддержкой.

### Авто-апгрейд

`enhanceAllSelects()` вызывается при загрузке + при каждой смене таба, плюс MutationObserver следит за DOM и апгрейдит динамически вставленные `<select>` элементы. **Тебе обычно ничего не нужно делать** — просто пиши обычный `<select>` в HTML, и он автоматически станет glass-picker'ом.

### Опт-аут / параметры

| Атрибут на `<select>` | Что делает |
|---|---|
| `data-gx-skip="true"` | НЕ апгрейдить этот select (оставить нативным) |
| `data-gx-placeholder="Выбрать страну"` | Текст плейсхолдера если ничего не выбрано |
| `data-gx-title="Страна"` | Заголовок sheet-picker (иначе берётся из `<label>` рядом) |
| `data-icon="<icon-name>"` на `<option>` | Иконка опции (рендерится через `ix()`) |
| `data-icon` на `<optgroup>` | Иконка group-label |

### Пример

```html
<label for="countrySel">Страна</label>
<select id="countrySel" data-gx-title="Выбрать страну" data-gx-placeholder="Любая">
  <option value="">Любая</option>
  <optgroup label="Азия" data-icon="globe">
    <option value="cn" data-icon="globe">🇨🇳 Китай</option>
    <option value="jp" data-icon="globe">🇯🇵 Япония</option>
  </optgroup>
  <optgroup label="Европа" data-icon="globe">
    <option value="pl" data-icon="globe">🇵🇱 Польша</option>
  </optgroup>
</select>
```

### Поведение

- Поисковая строка появляется автоматически если опций > 8
- Optgroup рендерится как group-label (не кликабельный)
- При выборе — обновляет нативный `<select>` и диспатчит `change` event (так что вся существующая логика `onchange` продолжает работать без изменений)
- Закрытие: тап на backdrop / на крестик / Escape / свайп вниз на handle

---

## 6. Снежинка на балансе (специальный случай)

Иконка ❄️ на виджете баланса — **inline SVG с sparkle-анимацией**, не через `ix()`. Не трогай если задача не про баланс. Если задача про баланс — поищи `.brand-flake` или `.balance-flake` в CSS, и `<svg>` блок рядом с `headerBalance` в HTML.

---

## 7. Иконки которые НЕЛЬЗЯ трогать

| Что | Где | Почему |
|---|---|---|
| Флаги стран | селектор площадок, фильтр в Каталоге Площадок | UX-конвенция, эмодзи 🇨🇳🇵🇱🇪🇺🇷🇺 читаются лучше абстрактных иконок |
| Иконки таб-бара (5 кнопок снизу) | `<nav class="bottom-tab-bar">` | Сделаны v0.dev, оставлены как референс по запросу пользователя |
| Иконки шапки (bell, gear, avatar) | header справа | Сделаны v0.dev, оставлены как референс |

---

## 8. Checklist для агента перед UI-задачей

Когда получаешь UI-задачу:

- [ ] Прочитан этот файл (`07-DESIGN-SYSTEM.md`)
- [ ] Понимаю что использовать `ix(name)` вместо новых `<svg>`
- [ ] Понимаю что использовать `glass-card` / `filter-chip` / `story-card` / `glass-modal` / `glassToast` / `enhanceSelect`, а не делать свои стили
- [ ] Понимаю что НЕ менять флаги стран, таб-бар, иконки шапки
- [ ] Понимаю что новые `<select>` автоматически становятся glass-picker'ом (не нужно вручную ничего делать, только `data-icon` опционально)
- [ ] Понимаю что `tgUtil.alert/confirm/popup` уже сами идут через glass-модалку

---

## 9. Где это всё в коде

- `index.html:~1535-1645` — `ICON_PATHS` (объект)
- `index.html:1646-1657` — `function ix(name, opts)`
- `index.html:1663-1667` — `function brandFlake(opts)`
- `index.html:1670-1673` — `function mpDot(color)`
- `index.html:1676-1685` — `function starRow(rating, max)`
- `index.html:1690-1707` — glass modal root setup
- `index.html:1708-1757` — `function glassModal(opts)`
- `index.html:1758-1772` — `function glassToast(message, opts)`
- `index.html:1775-1785` — `_guessKind` / `_stripLeadEmoji` helpers
- `index.html:1787-1990` — glass-select system (`enhanceSelect`, `enhanceAllSelects`, `_gxRenderTrigger`, `_gxOpenSheet`, MutationObserver)
- Стили: все в `<style>` блоке в `<head>`. Ищи комментарии вида `/* ─── ICE LOGIX ICON SYSTEM ─── */`, `/* GLASS MODAL */`, `/* GX SELECT */`.

---

**TL;DR для агента:** не строй параллельные дизайн-системы. Используй `ix()`, `glassModal()`, `glassToast()`, `glass-card`, `filter-chip`. Новые `<select>` авто-апгрейдятся. Эмодзи не используй (кроме флагов). Иконки v0.dev в таб-баре и шапке не трогай.
