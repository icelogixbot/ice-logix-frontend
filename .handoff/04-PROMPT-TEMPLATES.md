# 04 — Готовые промпты (копируй-вставляй)

> Эти промпты протестированы со мной (Devin). Они должны хорошо работать в Antigravity. Если что-то не идёт — слегка переформулируй.

## 🚀 Самый первый промпт после установки

Когда впервые открываешь Antigravity на репо `ice-logix-frontend`, закинь это:

```
Прочитай AGENTS.md в корне репо + файлы .handoff/00-START-HERE.md, .handoff/01-PROJECT-CHEATSHEET.md, .handoff/05-PENDING-WORK.md и .handoff/07-DESIGN-SYSTEM.md.

В одном абзаце скажи:
1) что это за проект,
2) на чём остановилась команда (последние merged PR-ы #19/#20/#21 — глянь в 01-PROJECT-CHEATSHEET.md разделе «Merged PRs»),
3) какие три HOT-задачи в .handoff/05-PENDING-WORK.md PRIORITY 0 надо сделать в первую очередь.

Используй Supabase MCP чтобы проверить состояние таблиц `legit_check_brands` и `legit_check_models` (project ref: vrvwdagjpttvfvjanbwq). Должно быть 5 брендов и 50 моделей.
```

Если агент успешно ответит — значит контекст + MCP работают.

---

## 🔥 Hot-bugs (PRIORITY 0) — закинь первыми

Это три задачи которые остались после моего PR #20 (glassmorphism pass). Промпты ниже — копипаста, готовы к использованию.

### Hot-fix 0.1 — кнопки «Все/Каталог» на главной ведут не туда

```
@file .handoff/01-PROJECT-CHEATSHEET.md
@file .handoff/07-DESIGN-SYSTEM.md

Hot-fix bug #5: на главной экране кнопки «Все →» (в секции Площадки) и «Каталог →» (в секции Рекомендуем) должны открывать соответствующий sub-screen напрямую, а не лендинг «Каталоги».

Контекст:
- В index.html строка ~2816 функция switchTab(tabName) на строке ~2822 делает currentSubScreen = null.
- В строках ~3055-3062 обработчики moreMarketplacesBtn / moreProductsBtn выставляют currentSubScreen ПЕРЕД switchTab — поэтому он мгновенно сбрасывается.

Исправь:
- Вариант A (рекомендую): расширь сигнатуру switchTab(tabName, subScreen = null), внутри currentSubScreen = subScreen. На вызовах moreMarketplacesBtn / moreProductsBtn передавай вторым аргументом 'marketplaces' / 'productsCatalog'.
- Вариант B: в обработчиках кнопок сначала switchTab('catalogs'), потом currentSubScreen = 'marketplaces'/'productsCatalog', потом renderCurrentScreen().

Smoke-test:
- На главной нажми «Все →» рядом с «Площадки» — должен открыться экран ТОЛЬКО площадок.
- Аналогично «Каталог →» в «Рекомендуем» — экран ТОЛЬКО товаров.
- BackButton возвращает на главную.

PR с описанием на русском.
```

### Hot-fix 0.2 — убрать плитку «Бренды»

```
@file .handoff/01-PROJECT-CHEATSHEET.md

Hot-fix bug #6: удали плитку «Бренды» с экрана «Каталоги».

В index.html строки ~8339-8350 — блок:
<div class="glass-card cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all opacity-70" onclick="tgUtil.alert('Бренды появятся скоро!')">
  ...«Бренды», «Nike, Adidas, Supreme и другие», бейдж «Скоро»...
</div>

Удали этот блок целиком.

ВАЖНО: НЕ удаляй фильтр по бренду внутри Каталога Товаров (line ~7981, `<option value="all">Все бренды</option>` и map по allBrands) — этот dropdown остаётся. Удаляем ТОЛЬКО плитку «Бренды» с экрана выбора каталога.

Поищи через grep другие места упоминания «brands catalog» / «каталог брендов» как отдельного экрана — если ничего не нашлось, окей.

PR с описанием на русском.
```

### Hot-fix 0.3 — design audit после PR-2

```
@file .handoff/07-DESIGN-SYSTEM.md
@file .handoff/05-PENDING-WORK.md

Hot-fix bug #7: пройдись по всем экранам приложения на Vercel preview и найди визуальные косяки, оставшиеся после PR-2 (glassmorphism pass).

Workflow:
1. Открой Vercel preview главной ветки.
2. DevTools → device toolbar → iPhone 14 Pro (393×852).
3. Пройдись по каждому экрану и сделай скриншот того что выглядит странно:
   • Home (главная)
   • Калькулятор → все 4 mode (manual / link / photo / text-search)
   • Новый Заказ → все 4 mode
   • Каталоги → Площадки sub-screen (фильтры)
   • Каталоги → Товары sub-screen (фильтры)
   • Поиск (результаты по тексту / по фото)
   • Профиль
   • Академия
   • Отзывы
   • Глобальные: header (баланс слева, иконки справа), bottom-nav, BackButton

Что искать как «косяки»:
   - Островки старого дизайна (нет glass-фона / нет blur)
   - Эмодзи которые остались как unicode (должны быть SVG через ix('name')). Флаги стран — оставляем.
   - Кривые выравнивания, текст вылезает
   - Низкий контраст
   - Кнопки без glass-стиля
   - Разный стиль в одной секции

Что делать с каждым:
   1. Скриншот
   2. Поправь — используй ТОЛЬКО существующие компоненты из 07-DESIGN-SYSTEM.md (ix(), glass-card, filter-chip, glassModal, enhanceSelect). Не строй новые системы.
   3. Группируй фиксы по экранам.

Финальный PR на русском со скриншотами до/после.

Не меняй иконки таб-бара и шапки (v0.dev-овские оставляем).
```

---

## 📋 Шаблоны промптов по типу задачи

### 1. Реализовать новую Edge Function

```
Реализуй Edge Function `<имя>` в `supabase/functions/<имя>/index.ts`.

ВХОД: POST с JSON `<пример>`
ВЫХОД: JSON `<пример>`
ЛОГИКА: <псевдокод или описание>

Используй:
- OpenRouter для LLM (env OPENROUTER_API_KEY, OPENROUTER_TEXT_MODEL или OPENROUTER_VISION_MODEL)
- Supabase client (env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY auto-provided)
- Deno стиль, fetch URL из deno.land/x
- Try/catch обёртки с graceful fallback
- Strip markdown fences из LLM ответов перед JSON.parse

Деплой после `deno check`. Smoke-тестируй curl'ом.
Создай PR через git_pr с описанием по шаблону.
```

### 2. Добавить новый экран в frontend

```
@file .handoff/07-DESIGN-SYSTEM.md

Добавь экран `screen<Name>` в `index.html`. 

UI-описание: <текст>
Дизайн: <ссылка на v0.dev или картинка>
Куда переходим: из `screen<X>` по кнопке «<Y>»
Куда уходим обратно: по BackButton → `screen<X>`

Используй существующие паттерны:
- `tgUtil.setBackButton(handler)` для назад
- `tgUtil.setMainButton(text, handler)` для основной кнопки
- Иконки — ТОЛЬКО через `ix('name')` из ICON_PATHS (см. 07-DESIGN-SYSTEM.md). Никаких эмодзи кроме флагов стран.
- Модалки/алерты — `tgUtil.alert()` / `tgUtil.confirm()` (они уже под glassmorphism).
- Селекты — обычный `<select>` (авто-апгрейдится в glass-picker).
- Классы: glass-card, filter-chip, story-card, scroll-x, page-enter.
- Russian copy.

Найди как сделаны соседние экраны (`screenCalculator`, `screenNewOrder`) — копируй стиль.
PR.
```

### 3. Пофиксить баг

```
Баг: <описание поведения>
Где проявляется: <экран/функция>
Ожидаемое поведение: <текст>
Шаги воспроизведения: <если знаю>

Логи / стектрейс (если есть):
```
<вставь>
```

Найди причину через `grep` или Serena MCP. НЕ читай весь index.html — он 7200 строк.
Минимальный фикс, не рефакторь соседнее.
PR.
```

### 4. Добавить миграцию БД

```
Создай миграцию `supabase/migrations/<YYYYMMDDhhmmss>_<short_desc>.sql`.

Цель: <текст>
SQL: <DDL или DML>

Применяй через Supabase MCP (project ref vrvwdagjpttvfvjanbwq). НЕ редактируй существующие миграции — только append.
PR.
```

### 5. Сгенерить UI через v0.dev → адаптация

```
Я сгенерировал UI через v0.dev для экрана <X>. Код в React JSX:

```jsx
<вставь код от v0>
```

Задача: адаптируй под наш `index.html` (vanilla JS + Tailwind CDN, БЕЗ React). Замени:
- JSX → template literals или DOM-методы
- useState → обычные переменные / localStorage
- onClick={} → addEventListener
- className → class

Стиль и цвета сохрани. Куда вставить: <место>.
PR.
```

### 6. Адресовать Devin Review коммент

```
На PR #<X> пришёл коммент от Devin Review (ID <commentId>): <короткое описание>.

Прочитай полный текст коммента через `git_view_pr`, оцени:
- Если это реальный баг — пофикси
- Если это style/info — ответь в треде что noted
- Если это refactoring suggestion — оцени trade-off, ответь решением

Используй `git_comment_on_pr` с `in_reply_to=<commentId>` для ответа в треде.
```

### 7. Запросить ревью / merge

```
PR #<X> готов к мерджу. Проверь:
- CI зелёный (через git_pr_checks)
- Все Devin Review threads закрыты или адресованы
- Migration применена к проду (если есть)

Если ОК — смержь через git_pr merge. Если нет — скажи что блокирует.
```

---

## 🎯 Промпты для текущего pending работы

См. [`05-PENDING-WORK.md`](./05-PENDING-WORK.md) — там готовые промпты для каждого pending PR (A.5 / B / C / bugs).

---

## 💡 Универсальные правила

1. **Всегда** ссылайся на `01-PROJECT-CHEATSHEET.md` или `AGENTS.md` если задача требует контекста проекта.
2. **Всегда** проси PR в конце (не «просто внеси изменения»).
3. **Никогда** не проси сделать сразу 5 фич в одном промпте.
4. **Всегда** проси Russian в user-facing тексте.
5. Если задача про Edge Functions — проси smoke-test curl-ом.
6. Если задача про UI — проси проверить на Vercel preview.

---

## 🆘 Если ничего не понятно

Просто закинь агенту:

```
Я не разработчик. Объясни простыми словами что ты собираешься сделать перед тем как делать. И в конце скажи как я это могу проверить.
```

Любой нормальный агент адаптируется. Antigravity-Gemini 3 Pro делает это отлично.
