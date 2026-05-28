# 🚀 ANTIGRAVITY HANDOFF — START HERE

**Привет, Кирилл!** Это пакет документов чтобы ты перешёл с Devin на Antigravity без потери качества и без необходимости разбираться во всём заново.

> **Последнее обновление:** после мерджа PR #19 / PR #20 / PR #21 (см. ниже секцию «Что произошло между прошлой версией хэндоффа и этой»).

## ⚡ TL;DR — что делать прямо сейчас

1. Скачай Antigravity: <https://antigravity.google/download>
2. Установи через личный Gmail (бесплатная квота на топ-модели). **Если регистрация Google нужна с нуля** — у тебя уже отдельная инструкция со мной про немецкий VPN + sms-activate + прогрев аккаунта. Антигравити там же ставится.
3. Прочитай по порядку:
   1. [`02-SETUP-GUIDE.md`](./02-SETUP-GUIDE.md) — как установить, подключить репо, MCP, Claude Code
   2. [`03-USER-WORKFLOW.md`](./03-USER-WORKFLOW.md) — как вообще работать в Antigravity
   3. [`04-PROMPT-TEMPLATES.md`](./04-PROMPT-TEMPLATES.md) — готовые промпты (просто копируй-вставляй)
   4. [`05-PENDING-WORK.md`](./05-PENDING-WORK.md) — что осталось доделать (с готовыми промптами). **Начни с PRIORITY 0** — там три hot-bugs после моего PR-2 которые ты сам нашёл (кнопки «Все/Каталог» ведут не туда, убрать каталог брендов, design audit).
   5. [`06-TOKEN-ECONOMY.md`](./06-TOKEN-ECONOMY.md) — как экономить бесплатные лимиты
   6. [`07-DESIGN-SYSTEM.md`](./07-DESIGN-SYSTEM.md) — **новый файл**: описание нашей glass-дизайн-системы (ICON_PATHS, `ix()`, glass-modal, glass-select). Дай его агенту перед любой UI-задачей чтобы он не строил параллельные дизайн-системы.

Файл [`01-PROJECT-CHEATSHEET.md`](./01-PROJECT-CHEATSHEET.md) — это контекст ДЛЯ АГЕНТА, не для тебя. Когда начнёшь новую сессию в Antigravity — он подгрузится автоматически (он лежит в `.handoff/` в репо), либо закинь его агенту первым сообщением как `@file`. `AGENTS.md` в корне репо тоже обновлён — Antigravity его подцепит автоматически при открытии проекта.

## 📦 Что я подготовил (8 файлов)

| Файл | Для кого | Зачем |
|---|---|---|
| `00-START-HERE.md` | тебе | этот файл |
| `01-PROJECT-CHEATSHEET.md` | агенту | полный контекст проекта (бизнес + тех) |
| `02-SETUP-GUIDE.md` | тебе | установка Antigravity + MCP + Claude Code + дизайн-помощник |
| `03-USER-WORKFLOW.md` | тебе | как работать в Antigravity (для нулевика) |
| `04-PROMPT-TEMPLATES.md` | тебе | готовые промпты для частых задач + 3 hot-bugs |
| `05-PENDING-WORK.md` | тебе + агенту | что осталось доделать (PRIORITY 0 → 4) |
| `06-TOKEN-ECONOMY.md` | тебе | как не сжигать бесплатные лимиты |
| `07-DESIGN-SYSTEM.md` | **агенту** | **glass-дизайн-система: ICON_PATHS, `ix()`, glass-modal, glass-select. Обязательно для UI-задач.** |

## 🎯 Что произошло между прошлой версией хэндоффа и этой

В прошлой версии хэндоффа состояние было: **15 PR в main, PR-A.5 / PR-B / PR-C впереди**. С тех пор я закрыл ещё 4 PR — все замержены в main:

| PR | Что | Статус |
|---|---|---|
| **#18** | v0.dev полный UI-редизайн (большой визуальный рерайт под Tailwind glass-style) | ✅ merged |
| **#19** (PR-1 design pair) | Фиксы регрессий после v0.dev: 9 mojibake-байтов в строках («Ошибка парсин**��**а», «**��**аказ #» и т.д.), двойная снежинка в балансе (HTML был ❄️ + JS добавлял ' ❄️'), переполнение нижней навигации (заменил `flex space-around` на `grid 5×1fr`), перенос баланса из правой части шапки в левую (рядом с лого, по конвенции Life.by / Tinkoff) | ✅ merged |
| **#20** (PR-2 design pair) | Полный glassmorphism-pass: <br/>• **SVG-icon-система** — `ICON_PATHS` (~80 иконок) + хелпер `ix(name, opts)`, 420+ эмодзи заменены на SVG. Флаги стран и иконки таб-бара/шапки v0.dev — оставлены.<br/>• **Glass-модалка** — `glassModal()` / `tgUtil.alert/confirm/popup` теперь рендерятся как bottom-sheet с backdrop-blur, kind-aware иконкой.<br/>• **Glass-select-picker** — 21 нативный `<select>` обёрнут в full-screen bottom-sheet с поиском, optgroup, иконками опций через `data-icon`. MutationObserver авто-апгрейдит динамически вставленные.<br/>• **`glassToast()`**, снежинка в балансе теперь inline SVG с sparkle-анимацией, `CATEGORY_MAP` использует имена иконок. | ✅ merged |
| **#21** | Обновление этого хэндоффа: добавил PRIORITY 0 секцию в 05-PENDING-WORK.md с тремя hot-bugs после ревью пользователем + актуализировал AGENTS.md | ✅ merged |

**Что мы сделали параллельно (не PR-ы):**
- `AGENTS.md` в репо обновлён — Antigravity подгружает автоматически при открытии репо
- `.handoff/` пакет полностью обновлён (этот файл + 6 других + новый 07-DESIGN-SYSTEM.md)
- Knowledge note «icelogix project context» в Devin — синхронизирован

## 🚦 Куда остановились (мини-recap)

- ✅ **20 PR в `main`** (search, parsing, calculator, onboarding, Telegram WebApp APIs, skills, v0.dev редизайн, PR-1/PR-2 design pair, handoff updates)
- ✅ Backend на Gemini 2.5 Flash (40× дешевле Sonnet)
- ✅ **PR #15** замержен — Reference DB для легит-чека (Tier 1 MVP) + 100 reference photos в Supabase Storage.
- ✅ **PR #19 + #20** замержены — функционал + glassmorphism-дизайн на всех экранах.

**🔥 PRIORITY 0 (открой первым — это hot-bugs которые ты сам нашёл при ревью PR-2):**
- 🐛 **Bug #5** — кнопки «Все» и «Каталог» на главной (площадки / товары) ведут не на нужный sub-screen, а на лендинг «Каталоги». Корень: `switchTab()` ресетит `currentSubScreen=null`.
- 🐛 **Bug #6** — убрать плитку «Бренды» из экрана «Каталоги» (фильтр по брендам внутри Товаров — оставить).
- 🐛 **Bug #7** — design audit после PR-2 (там ещё есть кривые места, я не все экраны прошёлся).

**📋 PRIORITY 1 (легит-чек MVP):**
- **PR-B** — Edge Function `legit-check` (Gemini Vision pipeline) — не начат
- **PR-C** — UI кнопка «AI Проверка» — не начат

**🐛 PRIORITY 2 (старые баги):** navigation lag (#1), search-by-image игнорирует authenticity_tier (#2b), «Проверить изображение» missing/garbage (#3+#4)

**⚙️ PRIORITY 3+ (фичи и инфра):** replica routing, marketplace whitelist, passport encryption, WebPay, ShopByShop integration, oferta generator, и т.д. — см. `05-PENDING-WORK.md`.

## ❤️ Финальный совет

Самое важное правило: **не бойся писать короткие промпты на русском.** Антигравити-агент так же хорошо понимает русский, как Devin. Не нужно писать «You are a professional senior developer...» — пиши как мне писал: «сделай Х, потом Y». Если что-то непонятно — он сам спросит.

**Дополнительные правила после PR-1/PR-2:**

- Для UI-задач **обязательно** дай агенту `@file 07-DESIGN-SYSTEM.md` первым сообщением. Иначе он начнёт создавать новые CSS-классы / новые модалки / новые селекты вместо использования наших.
- Не давай агенту менять иконки таб-бара и шапки — это иконки из v0.dev, оставляем как референс.
- Не давай ему трогать флаги стран (🇨🇳🇵🇱 и т.д. в селекторе площадок) — это UX-конвенция.
- Если попросишь его «заменить эмодзи на иконки» где-то — он должен использовать `ix(name)` из существующего `ICON_PATHS`, а не создавать новые SVG inline. Список доступных имён см. в `07-DESIGN-SYSTEM.md`.

Удачи, бро. Хорошего полёта в Antigravity 🛰️

— Devin
