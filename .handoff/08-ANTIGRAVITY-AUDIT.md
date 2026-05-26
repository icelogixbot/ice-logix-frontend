# Antigravity Audit — May 2026 (post PR #22 → PR #40)

> **Назначение этого файла.** Antigravity между PR #22 и PR #40 закатил
> 18 merges (54 коммита, +5 200 строк в `index.html`). Это первый сквозной
> аудит результата: где функционал реально работает, где сломан, где
> «AI» оказался не-AI, где Antigravity заново предложил то, что уже сделано.
>
> **Открой этот файл в Antigravity перед любым новым запросом «предложи фичи».**
> Это твой источник истины «что уже сделано» — не доверяй памяти модели.

---

## TL;DR

| Категория | Найдено | Исправлено в этом PR |
|---|---|---|
| Сломанные вызовы Edge Function | 1 (phantom `send-notification`) | ✅ да |
| Дубли уведомлений в Telegram | 2 места (admin status, `updateOrderStatus`) | ✅ да |
| Несовпадение названий статусов между фронтом и `notify-status` | 3 alias-а отсутствовали | ✅ да |
| Pre-existing TS-ошибки в Edge Functions | 2 функции (`notify-status`, `shopbyshop-webhook`) | ✅ да |
| Мёртвый код | `PARSE_PRODUCT_URL` константа | ✅ да |
| Маркетинговое «AI» не являющееся AI | `getAISizeRecommendation` — heuristic | задокументировано |
| Эмодзи там где должен быть `ix()` | ~60 не-флаговых эмодзи | задокументировано |
| Регрессия URL-парсера в калькуляторе | «парсинг недоступен» при вставке ссылки | задокументировано |

---

## 1. Что Antigravity успел сделать (хронология PR #23 → #40)

| PR | Что добавил | Статус |
|---|---|---|
| #23 | switchTab sub-screen routing + убран каталог «Бренды» | ✅ работает |
| #24 | Design audit (Bug #7), nav lag (Bug #1), tier indicator (Bug #2b) | ✅ работает |
| #25 | Edge Function `legit-check` (PR-B) | ⚠️ Edge Function задеплоен, но не вызывается из `index.html`. AI legit-check кнопки убраны в PR #37 → функция-сирота. |
| #26 | UI Premium AI Legit Check (PR-C) | ⚠️ кнопки убраны в PR #37 |
| #27 | SPA-переходы, click-physics, custom scrollbars, AI Circular Glows | ✅ работает |
| #28 | Step-by-step Multi-item Wizards в Calculator + Checkout | ✅ работает |
| #29 | UI overhaul + фикс багов 5/6 | ✅ работает |
| #30 | Unified profile settings, customs duty, vacation mode, exchange-rate buffer | ✅ работает |
| #31 | Wheel of Fortune, PVS selector, Track timeline countdown, AI Size Advisor | ⚠️ Size Advisor НЕ AI (см. §3.2) |
| #32 | Split & Ship разделитель, smart paste, размерные сетки, авто-бэкап | ⚠️ Split & Ship — только подсказка в UI, нет реальной логики разделения |
| #33 | Multi-cart, commission contract, налоговый отчёт, unlimited AI Size Advisor | ✅ работает |
| #34 | Family budget, rates tracker, locked VIP, in-app support chat | ✅ работает |
| #35 | Currency rates chart, VIP confetti, support chat | ✅ работает |
| #36 | Replica routing, fix Apify links | ✅ работает |
| #37 | Vault encryption паспортов + B2B dashboard. Убраны AI authenticity check кнопки. | ✅ работает |
| #38 | Academy mark-done + quiz validation | ✅ работает |
| #39 | ShopByShop logistics integration (`shopbyshop-webhook`) | ✅ работает (после фикса TS-ошибки) |
| #40 | Photo reviews + 5 BYN cashback + Telegram push notifications | ⚠️ Push notifications ломались (см. §2.1) |

---

## 2. Сломанное / починенное в этом PR

### 2.1. Phantom Edge Function `send-notification`

**Что:** `index.html` вызывал `send-notification` в **четырёх местах** —
admin-чейндж статуса заказа, страховое возмещение одобрено, recovery-код
и универсальный helper `sendNotification()`. Edge Function никогда не
существовал → все вызовы возвращали 404 / fetch-error и тихо проглатывались
в `catch`.

Конкретные последствия для пользователя:
- При смене статуса заказа из admin-панели → пользователь **не получал**
  богатый message с SVG-иконками («Товар выкуплен!»). Получал только
  плэйн-текст от `notify-status` (если `notify-status` тоже фурычил).
- При запросе восстановления доступа → код **не приходил** в Telegram.
- При одобрении страховой претензии → пользователь **не уведомлялся**.

**Fix:** Создан `supabase/functions/send-notification/index.ts` с тем же
API, что фронт ожидает: `{ user_id, message, order_id? }`. Внутри
вычищает HTML/SVG-теги перед отправкой в Telegram (потому что Bot API
не рендерит `<svg>`).

**Деплой:** после merge нужно задеплоить через Antigravity Supabase MCP
или вручную:
```
supabase functions deploy send-notification --project-ref vrvwdagjpttvfvjanbwq
```

### 2.2. Дубль уведомлений: `notify-status` + `sendNotification` стреляли вместе

**Что:** В двух местах (admin select onchange `index.html:9836` и
`updateOrderStatus` `index.html:10433`) фронт сначала инвокал
`notify-status`, потом дополнительно вызывал `sendNotification` с
богатым HTML-сообщением. После починки §2.1 пользователь начал бы
получать **два** Telegram-сообщения за один смен статуса.

**Fix:** Убран параллельный `notify-status` invoke в обоих местах.
`notify-status` остаётся каноническим pipeline для **внешних** пингов
(ShopByShop webhook). Богатый message для admin actions идёт через
`sendNotification`.

### 2.3. Несовпадение названий статусов

**Что:** Канонический набор статусов в `index.html` /
`pricing-engine` / `getStatusText()`:
```
pending → paid → bought → on_sklad_cn → in_transit → in_belarus → delivered (+ cancelled)
```
А `notify-status` знал только:
```
pending → paid → ordered → at_warehouse → in_transit → delivered (+ cancelled)
```
→ когда ShopByShop пинговал webhook со статусом `bought`, `notify-status`
не находил его в `statusMap` и отправлял пользователю сырой
machine-string вместо человеческого «🛒 Выкуплен с площадки».

**Fix:** Добавлены 3 канонических статуса (`bought`, `on_sklad_cn`,
`in_belarus`). Старые имена (`ordered`, `at_warehouse`) оставлены
**aliases**-ами на тот случай, если у ShopByShop захардкожены в их
систему.

### 2.4. Pre-existing TypeScript-ошибки в Edge Functions

В `notify-status/index.ts` и `shopbyshop-webhook/index.ts` был
`error.message` на `unknown` (TS18046). Antigravity их не отловил
потому что Supabase CLI не запускает `deno check` по умолчанию.
Починено в обоих файлах — `error instanceof Error ? error.message : String(error)`.

### 2.5. Мёртвая константа `PARSE_PRODUCT_URL`

`index.html:2859` декларировал `PARSE_PRODUCT_URL =
'.../functions/v1/parse-product'`. Функция `parse-product` не существует
(есть только `parse-screenshot` и `parse-worker`). Константа нигде не
используется. Удалена.

---

## 3. Что НЕ исправлено в этом PR (задокументировано для следующих заходов)

### 3.1. URL-парсер в калькуляторе фактически отключён

`index.html:4247`:
```js
} else if (urlValue.startsWith('http')) {
  tgUtil.alert('Автоматический парсинг пока недоступен. Введите данные вручную.');
}
```

При вставке URL без скриншота фронт лезет в кэш `parsed_products`, не
находит, и **выкидывает** пользователя на ручной ввод. При этом у нас
есть `parse-worker` Edge Function (Firecrawl backend) и
`parse-screenshot` (скриншот → данные). Pipeline для «URL → данные»
должен инжектить URL в `parse_queue` и поллить `parsed_products` пока
не появится result. Antigravity недоделал.

**Промпт для Antigravity:**
> Открой `.handoff/08-ANTIGRAVITY-AUDIT.md` §3.1. В `index.html:4220-4250`
> допиши URL-парсер: при вставке URL → INSERT в `parse_queue` со status='pending'
> → поллинг `parsed_products` через `select.eq('url', urlValue)` каждые 2с
> до 30с → когда появилось — наполнить поля. parse-worker сам прочитает
> очередь, вызовет Firecrawl и положит результат. Если за 30с не пришло
> ничего — fallback на текущий alert.

### 3.2. AI Size Advisor — не AI, а формула

`index.html:2378` `getAISizeRecommendation()` — простая функция
`if-else` по росту/весу/стельке. Никаких LLM-вызовов нет. Но в UI
рисуется «🔮 ИИ-Советник» с маркетинговой плашкой. Это **misleading**
для пользователя.

Два варианта:
- **a.** Переименовать UI-плашку в просто «Подбор размера» (быстрый,
  честный).
- **b.** Действительно подключить к OpenRouter Gemini Flash для
  персонализации (учёт бренда — Nike vs H&M размерятся по-разному).
  Это +1 invoke за каждый change → token-cost. Закладывать только
  для VIP-юзеров.

### 3.3. Эмодзи которые должны быть SVG

После PR #20 (`glassmorphism overhaul`) мы договорились что **все
эмодзи кроме флагов и таб-бара** становятся `ix('name')`. После
Antigravity-итераций в коде остались:

| Эмодзи | Кол-во | Куда дёрнуть |
|---|---|---|
| ✅ | 9 | `ix('success')` или `ix('check')` |
| 🔍 | 8 | `ix('search')` |
| 🎉 | 7 | `ix('party')` |
| ❌ | 6 | `ix('close')` или `ix('error')` |
| 🔮 | 6 | `ix('sparkle')` или новая иконка `crystal-ball` |
| 🔥 | 6 | `ix('fire')` |
| 🛡 | 6 | `ix('shield')` |
| ⚡ | 6 | `ix('zap')` |
| 🟢🔴 | 9 | inline status-dot div вместо emoji |
| ⚠ | 5 | `ix('warning')` |
| ❄ | 4 | `ix('snowflake')` |

**Не лечил в этом PR**, чтобы не раздувать diff. Промпт для Antigravity:
> Открой `.handoff/07-DESIGN-SYSTEM.md` (там список ICON_PATHS). Замени
> каждое не-флаговое эмодзи в `index.html` (кроме таб-бара) на
> соответствующий `<span class="ix"><svg>...</svg></span>` через
> `ix('name')`. Для status-dot (🟢🔴🟡) используй
> `<span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>`.
> Не трогай флаги стран (🇨🇳🇧🇾🇵🇱🇷🇺 etc.) — они остаются emoji
> по UX-конвенции.

### 3.4. Edge Function `legit-check` — сирота

Создан в PR #25, мигрирован в БД, но `index.html` его не вызывает
(вместо этого делает прямой INSERT в `legit_check_requests`). В PR #37
кнопки «AI authenticity check» убраны → Edge Function вообще не имеет
точки входа из фронта.

**Решение:** либо удалить (чистый код), либо подключить как «премиум
авто-проверка по 15 BYN» вместо ручного review. Решать после регистрации
ИП — связано с pricing-стратегией.

### 3.5. Split & Ship — только подсказка, без логики

`index.html:5199` рисует подсказку «Превышен лимит €200! Можете
разделить заказ на двух получателей в Мои данные». Но реальной
функции, которая берёт заказ и делит его на два insert-а с разными
получателями, **нет**. Это TODO из роадмапа фазы 1, не реализован.

---

## 4. Прогресс по 09-features-roadmap.md (250+ функций)

Сверка статусов «❌ TODO» в `/home/ubuntu/icelogix-work/legal/09-features-roadmap.md` с реальным состоянием кода:

### Фаза 1: MVP

| Roadmap-пункт | Реальный статус |
|---|---|
| Калькулятор стоимости (1) | ✅ Сделан (`pricing-engine.js` + `renderCalculator`) |
| Умный калькулятор / таможенный лимит (15, 80) | ✅ Сделан |
| Авто-затягивание курса каждые 15 мин (34) | ✅ Сделан (`warmRates` + NBRB API) |
| Сбор данных о товаре (2) | ✅ Сделан |
| Авторегистрация через Telegram (13) | ✅ Сделан |
| Выбор региона с курсами (13) | ✅ Сделан (`COUNTRY_AVAILABILITY`) |
| Обучающие сторис (13) | ✅ Сделан (`onboarding.html`) |
| Split & Ship (25) | ⚠️ Только UI-подсказка, без бэка |
| Мульти-корзина (16) | ✅ Сделана (PR #33) |
| Каталог с категориями (4) | ✅ Сделан |
| База площадок (14) | ✅ Сделана + user whitelist (PR #36) |
| Парсинг ссылок (14) | ⚠️ `parse-screenshot` работает, URL-flow в калькуляторе обрезан (§3.1) |
| Сравнение цен (24) | ❌ Не сделано |
| Размерные сетки (32) | ✅ Сделан (size advisor — но heuristic, не AI) |
| Подборки Must Have (14) | ❌ Не сделано |
| Трекинг 8-этапной статус-шкалы (5) | ✅ Сделан |
| Трекинг 360° с фотоотчётом (16) | ⚠️ Структура есть, фотоотчёт-pipeline нет |
| Push-уведомления (12) | ✅ Сделан в этом PR (после фикса phantom Edge Function) |
| Зеркальный трекинг ShopByShop (141) | ✅ Сделан (PR #39, `shopbyshop-webhook`) |
| ЕРИП / Stars / карты (9, 17) | ❌ Не сделано (ждёт регистрации) |
| Мульти-валютный кошелёк (17) | ❌ Не сделано |
| FAQ (3) | ❌ Не сделано (нужны тексты) |
| Чат с менеджером (19) | ✅ Сделан (`order_messages` + PR #34 in-app chat) |
| База знаний / Wiki (137) | ❌ Не сделано |
| Генерация счетов / актов в PDF (10) | ❌ Не сделано (есть `pdf-generator` Edge Function в working dir, но не задеплоен) |

### Фаза 2: Расширение

| Roadmap-пункт | Реальный статус |
|---|---|
| Партнёрская программа / рефералы (11) | ✅ Сделана (`referrals` table) |
| Уровни клиента (20) | ✅ Сделаны (newbie/shopper/vip) |
| Колесо фортуны (30) | ✅ Сделано (PR #31) |
| Реф. дерево (135) | ❌ Не сделано |
| Трекер курса (29) | ✅ Сделан (PR #35) |
| Price Watchdog (76) | ❌ Не сделано |
| Поиск по фото (23) | ✅ Сделан (`search-by-image` + Apify) |
| Совместные закупки (27, 70) | ✅ Family budget (PR #34) |
| UGC видео-распаковки (134) | ❌ Не сделано |
| Отзывы с фото + кэшбэк (235, 60) | ✅ Сделаны (PR #40) |
| Галерея реальности (236) | ❌ Не сделано |
| Выбор ПВЗ (26) | ✅ Сделан (PR #31, СДЭК/Белпочта/Европочта) |
| Каскадный выбор адреса (257) | ❌ Не сделано |
| Мои адреса (257) | ⚠️ Профиль хранит один адрес, без множественности |

### Фаза 3: Премиум

| Roadmap-пункт | Реальный статус |
|---|---|
| Legit Check (22) | ⚠️ Ручной (DB-запись + admin review). AI-pipeline (`legit-check` Edge Function) задеплоен но не подключён. |
| AI Size Advisor (35) | ⚠️ Heuristic, не AI (§3.2) |
| Анти-фейк сканер (38) | ❌ Не сделано (был в PR #25-26, удалён в PR #37) |
| Матрица рисков (78) | ❌ Не сделано |
| Трекер настроения (71) | ❌ Не сделано |
| Авто-расчёт выгоды vs Lamoda (233) | ❌ Не сделано |
| Консолидация посылок (18) | ❌ Не сделано |
| Доп. услуги (пузырчатка) (18) | ❌ Не сделано |
| Цифровое страхование (21) | ✅ Сделано (`insurance_claims` table + PR #32) |
| Архив фотоотчётов 90 дней (122) | ❌ Не сделано |
| Экстренная смена реквизитов (121) | ❌ Не сделано |
| Детектор подозрительных ссылок (124) | ❌ Не сделано |
| Зеркало базы в Google Sheets (82) | ⚠️ Авто-бэкап админкой (PR #32), но не Google Sheets |
| CRM Trello-стиль (33) | ❌ Не сделано |
| Шифрование паспортов (36) | ✅ Сделано (PR #37, `vault_encryption` migration) |
| Премиум emoji в боте (130) | ❌ Не сделано |

### Фаза 4: Будущее

| Roadmap-пункт | Реальный статус |
|---|---|
| Академия байера (1003) | ✅ Сделан (`courses`/`lessons` tables + PR #38) |
| 1-on-1 консультации | ❌ Не сделано |
| B2B-кабинет / дропшипперы | ✅ Сделан (PR #37, B2B dashboard metrics) |
| Биржа заданий (133) | ❌ Не сделано |
| Закрытый канал «Горящих товаров» (31) | ❌ Не сделано |
| Дропы на 1 час (136) | ❌ Не сделано (есть UI-кнопка → tgUtil.alert 'будет позже') |

---

## 5. Что Antigravity всё ещё может предложить как «новое»

Эти фичи **уже есть в коде**, поэтому если в следующем чате Gemini 3 Pro
их «предложит» — это галлюцинация, ткни ему в нос этим файлом:

- ✅ Калькулятор стоимости
- ✅ Мульти-корзина (`addToCart`, `cart` table)
- ✅ Семейный бюджет (`window.userSettings.family`)
- ✅ Wheel of Fortune (`showWheelOfFortuneModal`)
- ✅ Size Advisor (heuristic)
- ✅ Vault encryption паспортов (`save_passport_secure` RPC)
- ✅ Reviews с фото + кэшбэк (`reviews` table, photos+cashback columns)
- ✅ Logistics tracking ShopByShop (`logistics_events` + webhook)
- ✅ Push-notifications при смене статуса
- ✅ Currency rates chart
- ✅ In-app support chat (`order_messages` table)
- ✅ B2B/Dropshipper dashboard
- ✅ Академия + квизы + сертификаты
- ✅ ПВЗ выбор (3 carrier-а)
- ✅ Promo codes + Promotions admin
- ✅ Insurance claims
- ✅ User-specific marketplace whitelist
- ✅ Vacation mode / exchange-rate buffer

---

## 6. Что РЕАЛЬНО ещё стоит добавить (по приоритету)

Это список где Antigravity может реально помочь — функции из роадмапа,
которых сейчас нет в коде:

### Спринт A (быстрые wins, < 1 день каждая)
1. **Сравнение цен «vs Lamoda / РБ»** (#24, #233) — компонент `<PriceCompare/>` под рассчётом в калькуляторе. Можно мокать данные через таблицу `local_prices` (manual entry от админа).
2. **Detector подозрительных ссылок** (#124) — checkbox-валидатор по whitelist (`marketplaces` table) при вставке URL.
3. **Подборки Must Have** (#14) — новый таб в каталоге, выводит `products` где `tags @> ['must_have']`. Админу — UI добавить тег.
4. **Каскадный выбор адреса** (#257) — `<select>` Область → Район → Город на client-side из захардкоженного JSON (есть готовые списки РБ).
5. **Мои адреса** (#257) — таблица `user_addresses` (user_id, label, full_address, is_default), CRUD UI в Профиле.

### Спринт B (средние, ≤ 2 дня)
6. **Split & Ship** (#25) — допилить логику разделения. При нажатии на UI-подсказку → модалка «выбрать 2-го получателя» → создать 2 ордера с разделёнными items, привязать общим `parent_order_id`.
7. **Реф. дерево визуализация** (#135) — компонент на канвасе или treeview, показывает уровни рефералов и их активность.
8. **Архив фотоотчётов 90 дней** (#122) — `report_photos` bucket в Storage, retention RLS на 90 дней, UI в Профиле «Мои фотоотчёты».
9. **Price Watchdog** (#76) — таблица `price_watch (user_id, url, target_price)`, cron-функция раз в день парсит, push уведомление при снижении.
10. **Anti-Fake Scanner возвращение** (#38) — переподключить `legit-check` Edge Function в UI (или удалить функцию-сироту).

### Спринт C (требуют доп. инфры)
11. **Google Sheets backup** (#82) — Google Apps Script + service account credentials.
12. **CRM Trello-стиль** (#33) — drag-and-drop колонки статусов, отдельный admin-view.
13. **PDF-инвойсы** (#10) — задеплоить `pdf-generator` Edge Function (есть в `/home/ubuntu/icelogix-work/pdf-generator/`).
14. **Trigger Telegram premium emoji** (#130) — требуют Telegram Premium API + custom emoji set.

---

## 7. Как использовать этот файл с Antigravity

В каждом первом промпте новой сессии вставляй:

```
Прочитай:
  @file .handoff/01-PROJECT-CHEATSHEET.md
  @file .handoff/05-PENDING-WORK.md
  @file .handoff/08-ANTIGRAVITY-AUDIT.md

Перед тем как предлагать любые новые фичи — открой §5
(«что ты можешь предложить как новое»). Если фича из этого
списка — НЕ предлагай. Если из §6 — предлагай.

Перед изменением UI — открой @file .handoff/07-DESIGN-SYSTEM.md
и используй ix() вместо эмодзи (кроме флагов и таб-бара).

Перед фиксом бага — grep по `index.html` и подтверди что бага
реально нет (не доверяй памяти модели).
```

И не давай Antigravity свободу «предложи что улучшить» без
жёстких constraints — он **всегда** будет предлагать то, что
выглядит логично, а не то, что реально нужно.

---

## 8. Что починилось этим PR (короткий список)

- `supabase/functions/send-notification/index.ts` — **новая** функция, заменяет phantom-вызов
- `supabase/functions/notify-status/index.ts` — расширен statusMap (bought/on_sklad_cn/in_belarus), починен TS error
- `supabase/functions/shopbyshop-webhook/index.ts` — починен TS error
- `index.html` — убран phantom-инвок `notify-status` в 2 admin-handler-ах (теперь только sendNotification), удалена мёртвая константа `PARSE_PRODUCT_URL`
- `.handoff/08-ANTIGRAVITY-AUDIT.md` — **новый** этот файл
- `.handoff/01-PROJECT-CHEATSHEET.md` — обновлён список merged-PR + ссылка на аудит

**Деплой Edge Functions** (после merge):
```
supabase functions deploy send-notification --project-ref vrvwdagjpttvfvjanbwq
supabase functions deploy notify-status     --project-ref vrvwdagjpttvfvjanbwq
supabase functions deploy shopbyshop-webhook --project-ref vrvwdagjpttvfvjanbwq
```
