# Current State

Ревизия по коду на ветке `claude/cool-cray-f9zwil`, HEAD `b70ce7b` (2026-08-13; дата в доке — дата коммита, не сегодняшняя).
Источник правды — код. Прежняя версия файла и `34-AUDIT.md` не использовались как источник; расхождения с ними — в конце.

Не проверялось: `npm run build` (в окружении нет `node_modules`), работа в браузере, содержимое задеплоенных Edge Functions и их `verify_jwt` (в репозитории нет `supabase/config.toml`), реальное наличие секретов/бакетов в проекте `ffgbslqxuvcvbaolxybq`.

Статусы: **работает** — выполняет реальную работу end-to-end; **частично** — реальная часть есть, но условно или с дырами; **мок** — возвращает заглушку; **отсутствует** — кода нет.

---

## 1. Функциональная матрица

| Область | Статус | Файлы | Откуда вызывается | Провайдер | Где хранится результат |
|---|---|---|---|---|---|
| Генерация истории | **частично** | `supabase/functions/generate-story/index.ts`, `src/lib/api.ts` (`fetchStoryTexts`, `generateBook`) | Браузер → `supabase.functions.invoke("generate-story")` → Edge Function | Gemini `gemini-flash-latest` (модель зашита в коде функции) | Только React state (`order.book`). В БД/Storage не пишется |
| Персонаж по фото | **работает** (при условиях, см. 2.2) | `generate-character/index.ts`, `_shared/imagegen.ts`, `_shared/prompts.ts`, `src/lib/photo.ts`, `api.ts` (`generateCharacter`) | Браузер (`voorbeeld.tsx` useEffect) → Edge Function | Gemini `gemini-2.5-flash-image` (env `IMAGE_MODEL` переопределяет) | `book_jobs` (строка) + Storage `characters/{jobId}/sheet.png` (private). Фото не сохраняется |
| Генерация страниц | **частично** | `generate-page/index.ts`, `api.ts` (`generatePage`), `voorbeeld.tsx` | Браузер сам крутит цикл по 10 спредам → Edge Function на каждую страницу | Gemini (тот же) | Storage `pages/{jobId}/NN.png` (private), в UI — signed URL на 1 ч в `useState` страницы. В `book_jobs` страницы не отражаются |
| Стиль рисовки | **частично** | `order-store.tsx` (`ILLUSTRATION_STYLES`), `api.ts` (`STYLE_MAP`), `_shared/prompts.ts` | Браузер выбирает, Edge Function применяет | — | `OrderState.styleId` (память); `book_jobs.style_id` |
| Визард заказа (5 шагов) | **частично** | `src/routes/bestellen.tsx`, `order-store.tsx`, `VoiceRecorder.tsx`, `StyleCard.tsx` | Браузер | — | Только `OrderProvider` (React Context, без персистентности: reload = потеря заказа) |
| Превью книги | **частично** | `src/routes/voorbeeld.tsx`, `SpreadViewer.tsx` | Браузер | — | `order.book` (текст, правки) + локальный `generatedImages` (картинки) |
| i18n | **работает** (UI) / **частично** (остальное) | `src/i18n.ts`, `src/locales/{nl,en}.json`, `SiteHeader.tsx`, `__root.tsx` | Браузер | react-i18next | `localStorage["kidstory_lang"]` |
| Обработка фото | **работает** | `bestellen.tsx` (`handleFile`), `src/lib/photo.ts`, `generate-character/index.ts` | Браузер → Edge Function | Gemini (inline_data) | Нигде не персистится |
| Лист ожидания | **работает** | `supabase/functions/join-waitlist`, `api.ts` (`joinWaitlist`), `SiteFooter.tsx` | Браузер → `fetch` → Edge Function (anon JWT) | Supabase | Таблица `waitlist` |
| Голос (запись) | **мок** | `VoiceRecorder.tsx` | Браузер | — | Нигде. Компонент — только таймер (`setInterval`), `getUserMedia`/`MediaRecorder` нет: аудио не записывается |
| Клон голоса | **мок, мёртвый код** | `api.ts` `cloneVoice` | Нигде не вызывается | — | — |
| Перегенерация иллюстрации | **мок** | `api.ts` `regenerateIllustration` + `illustrationVariants`, `SpreadViewer.tsx` | Браузер | — | `order.book.spreads[].imageUrl` ← картинка из статического пула `src/assets/*` |
| Заказ / оплата | **мок** | `api.ts` `createOrder`, `afrekenen.tsx` | Браузер | нет (ни Stripe, ни Mollie) | Нигде. ID заказа `KS-<random>` |
| Цена | **захардкожена** | `api.ts:32` `BOOK_PRICE = 34.99` | Браузер | — | — |
| QR на страницах | **мок** | `api.ts:118` (`hasQrCode` для спредов 2, 6, 10), `SpreadViewer.tsx` | Браузер | — | Статический флаг. URL/токена нет |
| Печать, доставка, трекинг | **отсутствует** | — | — | — | `estimatedDelivery` = `now + 6 дней`, считается в `createOrder` |
| Аккаунты / auth | **отсутствует** | — | — | — | — |
| Юр. страницы | **заглушки** | `privacybeleid.tsx`, `voorwaarden.tsx` | — | — | — |

---

## 2. Детали по пунктам

### 2.1 История
- Реальный вызов Gemini происходит **только** если `storyMode === "type"` и `storyText.trim().length >= 40` (`api.ts:71`). Режим по умолчанию — `"record"`: аудио не записывается и не расшифровывается, поэтому в этом режиме **всегда** возвращаются статические `MOCK_TEXTS_NL/EN` с подстановкой имени.
- Заголовок всегда мок: `"{name} en de Gouden Lantaarn"` / `"{name} and the Golden Lantern"` (`api.ts:108`), даже когда текст сгенерирован.
- Любая ошибка Edge Function (`catch` → `null`, `api.ts:89`) **молча** подменяется моком. Пользователь не узнаёт, что получил шаблонный текст, и может оформить заказ.
- Edge Function: язык `nl|en` из запроса, возрастная сетка длины, ровно 10 спредов (`responseSchema`), 1 повтор при невалидной структуре, 429 не повторяется. CORS-заголовки объявлены локально (не из `_shared/cors.ts`). Текст ошибки провайдера (до 300 символов тела ответа) может уйти клиенту в `error`.
- Язык читается из `localStorage` прямо в `generateBook` (обход гонки с эффектом в `__root.tsx`).

### 2.2 Персонаж по фото
- Поток: `<input type=file>` → `FileReader.readAsDataURL` → `OrderState.photoDataUrl` (React Context) → в `voorbeeld.tsx` `fetch(dataUrl).blob()` → `prepareChildPhoto` (canvas ≤1024px, JPEG q0.9, EXIF теряется, canvas обнуляется, base64) → `supabase.functions.invoke("generate-character", {photo, styleId, pageCount})` → Gemini `inline_data` → PNG-лист в `characters`.
- Фото не попадает в Storage, БД, localStorage/sessionStorage. Функция логирует только `message`. Лимит `MAX_PHOTO_BYTES` проверяется по длине base64-строки.
- `photoDataUrl` очищается в `voorbeeld.tsx:81` **только после успешного** ответа `generate-character` и в `afrekenen.tsx:63` после «оплаты». Если генерация упала или пользователь не дошёл до `/voorbeeld`, фото остаётся в памяти Context до закрытия вкладки/оплаты.
- Запуск условен: нужны `order.book`, `order.photoDataUrl` и `order.styleId` (`voorbeeld.tsx:58`). При отсутствии любого условия (например, выбран только `customStyle`) генерации нет, показываются мок-картинки.
- Ошибка персонажа — молчаливый откат на мок-картинки (`return` в `catch`).
- Character sheet хранится в `characters` без TTL/очистки (политикой разрешено).

### 2.3 Страницы / иллюстрации
- Оркестрация — `useEffect` в `voorbeeld.tsx:57–109`: последовательный цикл по спредам, между ними `sleep(3000)`, на каждый — `generate-page`.
- Сценой служит `text.slice(0, 800)` (текст спреда) → напрямую в `pagePrompt`. `generate-page` принимает произвольный `scene` 10–800 символов от любого вызывающего.
- **Генерация зависит от жизни компонента, а не только вкладки.** Cleanup эффекта ставит `cancelled = true` при любом размонтировании `/voorbeeld`, в том числе при переходе на `/afrekenen` кнопкой «Bestellen». Страницы, не успевшие сгенерироваться, не догенерируются; вернувшись на `/voorbeeld`, повторно не запустить — `photoDataUrl` уже `null`.
- Готовые URL лежат в `generatedImages` (`useState` страницы), **не** в `order.book`. После ухода со страницы/перезагрузки они теряются; на чекаут и в «заказ» не попадают. Signed URL живут 1 час.
- Ошибка страницы — молча остаётся мок-картинка.
- `book_jobs.status` проходит только `character_pending → character_ready | failed`. Статусов страниц, прогресса, ретраев на уровне задачи нет. Ретраи (3, экспоненциальные) — только внутри одного вызова `callImageModel`.
- `generate-page` читает лист через `String.fromCharCode(...new Uint8Array(...))` — spread больших массивов; для крупных PNG возможен `RangeError` (не проверялось на реальных размерах).

### 2.4 Стиль
- UI: 4 стиля + свободное поле `customStyle`.
- `STYLE_MAP`: `aquarel→aquarel`, `tekenfilm→cartoon`, `sprookjesachtig→sprookje`, **`realistisch→null`** (политика: реализм + реальное лицо запрещены). Пользователь, выбравший «Realistisch», получает `style_not_supported` внутри `generateCharacter` → молчаливый откат на мок-картинки; в UI о причине ничего нет.
- `customStyle` пишется в Context и показывается на чекауте, но **ни в одну функцию не передаётся** и на генерацию не влияет.
- В `prompts.ts` есть стиль `strip`, которого нет в UI.

### 2.5 Визард
- 5 шагов: имя+возраст → фото+согласие → история (запись/текст) → стиль → голос (или пропуск). Валидация шагов — `canContinue` в `bestellen.tsx`.
- Шаг 3 «запись» требует `storyRecordingSeconds >= 120` — это значение таймера мок-рекордера.
- Шаг 5: `familyVoiceSeconds > 0` и согласие, либо `voiceSkipped`. Голос никуда не отправляется.
- `handleGenerate` вызывает `generateBook`, затем искусственная пауза `setTimeout 3600` для `MagicalLoader`.
- Возрастные группы и стили в `order-store.tsx` хранят голландские `label/note/name/description`, которые UI не использует (читает `t(...)`).

### 2.6 Превью
- `/voorbeeld` без прохождения визарда включает демо-режим (`!order.childName.trim()`): `generateBook(order)` → моковая книга.
- Правка текста спреда сохраняется только в Context.
- Кнопка «перегенерировать» → `regenerateIllustration(spreadId, url)` — задержка 1.4 с и возврат одной из трёх статических картинок пула. Реальной перегенерации нет.
- Цена в нижней панели — `BOOK_PRICE`.

### 2.7 i18n
- nl/en: по 205 ключей, расхождений ключей нет (проверено скриптом).
- Не переведено / не через i18n: `head()` мета-теги всех роутов (голландские строки); `alt` в `SpreadViewer.tsx:58` («Illustratie…») и `StyleCard.tsx:28` («Illustratiestijl…»); `formatEuro` и дата доставки жёстко `nl-NL`; список банков; описания стилей в `order-store.tsx`; моковые тексты книги дублируются в `api.ts` на двух языках.
- Язык: SSR всегда `nl`, сохранённый выбор применяется после гидрации (`__root.tsx`).

---

## 3. Бизнес-логика, смешанная с UI

Прямых вызовов `supabase`, Gemini или `fetch` к бэкенду в компонентах и роутах **нет**: всё сосредоточено в `src/lib/api.ts` (динамический `import("./supabase")`). Смешение — иного рода:

| Файл:строки | Что смешано |
|---|---|
| `src/routes/voorbeeld.tsx:57–109` | Оркестрация генерации (fetch data-URL → blob → `generateCharacter` → цикл `generatePage` + sleep + отмена), управление жизненным циклом фото (`update({photoDataUrl:null})`), слияние результатов в локальный state — всё в `useEffect` страницы |
| `src/routes/voorbeeld.tsx:40–53` | Загрузка/генерация книги для демо-режима из компонента |
| `src/routes/bestellen.tsx:58–63` | Чтение файла (`FileReader`) и запись data URL фото в глобальный Context |
| `src/routes/bestellen.tsx:65–73` | `generateBook` + искусственный `setTimeout(3600)` в обработчике кнопки |
| `src/routes/bestellen.tsx:49–56` | Бизнес-правила допуска шагов (минимум 120 с записи, >40 символов) прямо в компоненте |
| `src/routes/afrekenen.tsx:62–65` | Решение об «успехе оплаты» (`createOrder` → `setConfirmed`) и очистка фото в обработчике |
| `src/routes/afrekenen.tsx:40` | Список банков (данные) в файле роута |
| `src/routes/afrekenen.tsx:274–296`, `index.tsx:278`, `voorbeeld.tsx:187` | Расчёт/показ цены из клиентской константы |
| `src/components/SpreadViewer.tsx:40–46` | Вызов `regenerateIllustration` и применение результата в компоненте |
| `src/components/SiteFooter.tsx:42–50` | Вызов `joinWaitlist` из обработчика формы |
| `src/lib/api.ts:96–99` | Слой данных читает `localStorage` и `i18n` (UI-состояние) для определения языка |
| `src/lib/api.ts` (целиком) | Смесь: моки, реальные вызовы, статические ассеты, форматирование (`formatEuro`) в одном модуле |

---

## 4. Нарушения правил (`32-CLAUDE-CODE-RULES.md`, `CLAUDE.md`, AD-*)

| Правило | Где нарушено |
|---|---|
| «hard-code payment success in frontend» / AD-007 / 13-PAYMENTS | `afrekenen.tsx:62–65`: клиент сам подтверждает заказ; провайдера и webhook нет |
| «hard-code one global price/country» / 03-MONETIZATION / AD-008 / AD-013 | `api.ts:32` `BOOK_PRICE`; 5 мест использования (`afrekenen.tsx` ×3, `index.tsx:278`, `voorbeeld.tsx:187`); `afrekenen.tsx` meta («€34,99», «gratis verzending in Nederland», «4–6 werkdagen»); `BANKS` (только NL, `afrekenen.tsx:40`); `formatEuro` — `nl-NL`/`EUR`; `createOrder` — `nl-NL` дата и +6 дней |
| «make browser lifetime a dependency for generation» / AD-009 / 08-AI-ILLUSTRATIONS | `voorbeeld.tsx:57–109`; ещё и зависимость от монтирования страницы (см. 2.3) |
| «Photo must never appear in persistent state» (CLAUDE.md) | Соблюдено для persistent-хранилищ. Остаточный риск: фото живёт в Context до успеха генерации/оплаты (2.2) |
| Сервер — источник истины по заказу и генерации (AD-008, 10-ARCHITECTURE) | Нет серверных сущностей заказа/книги; результат генерации не связан с заказом |
| «use migrations» | Соблюдено для `waitlist`, `book_jobs`, бакетов. Остальные таблицы из 11-DATABASE.md не созданы |
| «handle retries for async jobs» | Ретраи только внутри одного вызова модели; нет ретраев/статусов уровня задачи |
| Ключи на фронте | **Не нарушено.** Gemini/service-role ключей в `src/` нет (grep). Anon key и URL проекта зашиты как fallback в `supabase.ts` — разрешено CLAUDE.md |
| «update docs when architecture changes» | Прежний `31-CURRENT-STATE.md` перечислял «character/page generation» как готовое и не упоминал оркестрацию в браузере |
| Безопасность Edge Functions (риск, не явное правило) | `generate-character`/`generate-page`: нет авторизации пользователя, привязки `jobId` к владельцу, лимитов — любой с anon-ключом может расходовать квоту Gemini и писать в Storage; `Access-Control-Allow-Origin: *`. `verify_jwt` не зафиксирован в репозитории |
| Честность UI (риск) | Молчаливый откат на мок (текст, картинки, «Realistisch», `customStyle`) — пользователь может оплатить книгу с шаблонным содержимым |

Правила про детский голос, жёсткую привязку принтера и webhooks не нарушены только потому, что соответствующего кода нет.

---

## 5. База данных и хранилище

Миграции: `20250101000000_create_waitlist.sql`, `20260810000000_create_book_jobs.sql`.

- `waitlist(id, email UNIQUE, created_at)` — RLS включён, политика anon INSERT. Запись фактически идёт через `join-waitlist` (service role).
- `book_jobs(id, created_at, style_id, page_count, status, error)` — RLS включён, политик нет (только service role). Личных данных нет.
- Storage: бакеты `characters`, `pages` (private). Нет политик, TTL, очистки.
- Таблицы из `11-DATABASE.md`: **0 из 19** (`generation_jobs` ≈ `book_jobs` с другой схемой: нет `job_type`, `progress`, `retry_count`, `provider`, `provider_job_id`, привязки к книге/версии).

## 6. Edge Functions (4)

| Функция | Что делает | Секреты |
|---|---|---|
| `generate-story` | 10 спредов текста, Gemini | `GEMINI_API_KEY` |
| `generate-character` | Лист персонажа по фото → Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `IMAGE_MODEL` (опц.) |
| `generate-page` | Иллюстрация страницы по листу → Storage | те же |
| `join-waitlist` | Вставка email | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

Общее: `_shared/imagegen.ts` (единая точка смены провайдера картинок), `_shared/prompts.ts`, `_shared/cors.ts`.

## 7. Не реализовано

Реальная оплата и webhook, заказы и их жизненный цикл, каталог/цены на бэкенде, аккаунты и RLS по пользователям, асинхронная job-система генерации, персистентность книги и заказа, печать/Fulfillment, доставка/трекинг, запись и обработка голоса, QR-доступ, налоги/страны, юридические тексты (страницы-заглушки), тесты (в проекте нет тестового набора).

---

## 8. Таблица расхождений: «было в документе → на самом деле»

Источники: прежний `31-CURRENT-STATE.md` и `34-AUDIT.md`.

| Было в документе | На самом деле |
|---|---|
| 31: «story generation … существует» | Только при режиме «type» и ≥40 символов; режим по умолчанию «record» всегда даёт мок; заголовок всегда мок; ошибки молча → мок |
| 31: «character generation, page generation» как готовая основа | Работают как отдельные Edge Functions, но запускаются из браузера условно (нужны фото+стиль+книга), без статусов страниц; результат не привязан к заказу |
| 31: «order wizard, preview» как готовые | Визард работает на клиентском state без персистентности; запись голоса — таймер без аудио; перегенерация иллюстраций — мок |
| 31: «temporary photo-processing foundation» | Реализовано: ресайз/EXIF-strip в браузере → base64 → Edge Function → модель; нигде не хранится. Но очистка из Context только после успеха/оплаты |
| 31: «i18n» (в целом готово) | UI-строки покрыты (205/205 ключей), но meta-теги, alt, формат валюты/даты, банки, описания стилей — вне i18n |
| 31: не упоминал оркестрацию в браузере | Нарушение AD-009 (`voorbeeld.tsx:57–109`) |
| 34: «`generate-character/index.ts:80` `update({ photoDataUrl: null … })` — очищается из контекста» | Неверно: Edge Function не имеет доступа к React Context; очистка — `voorbeeld.tsx:81` (и `afrekenen.tsx:63`). У функции всего 82 строки и такого вызова нет |
| 34: ссылки `api.ts:141`, `voorbeeld.tsx:70`, `generate-character:79` | Верны. Неточны лишь `photo.ts:21` (реально `photo.ts:17`) и `generate-character:54` (реально `:52`) |
| 34: при закрытии вкладки «текущий fetch завершится, следующая итерация не стартует» | Закрытие вкладки убивает JS целиком. Но `cancelled=true` срабатывает и при **навигации на `/afrekenen`** — это реальный и более частый сценарий |
| 34: «сгенерированные страницы не будут сохранены в `generatedImages`» | Верно, но важнее: `generatedImages` — локальный state страницы, не `order.book`; на чекаут картинки не передаются никогда |
| 34: «`book_jobs` остаётся в `character_ready` без записей о незавершённых страницах» | Верно, плюс: статусов страниц в схеме нет вообще |
| 34: «QR: `hasQrCode: true` на спредах 1, 5, 9» | Индексы 1, 5, 9 (0-based) = спреды 2, 6, 10 (`api.ts:118`) |
| 34: «`cloneVoice()` в `api.ts:172` … VoiceRecorder записывает аудио локально» | `cloneVoice` нигде не вызывается; `VoiceRecorder` аудио **не записывает** (нет `getUserMedia`/`MediaRecorder`), только считает секунды |
| 34: «Стиль» — не рассматривался | `realistisch` молча отключён (`STYLE_MAP → null`), `customStyle` не используется генерацией, `strip` есть в промптах, но не в UI |
| 34: «Цена захардкожена в 5 местах в UI» | Подтверждено (+ определение в `api.ts`, + meta-текст и `formatEuro`/дата в `nl-NL`) |
| 34: «Накладывает ключи: `generate-story` — `GEMINI_API_KEY`» | Верно. Дополнительно: модель `gemini-flash-latest` зашита, не конфигурируется |
| 34: Нарушение «use migrations» — «Суперсет» | Формулировка некорректна: правило не нарушено (все существующие таблицы и бакеты созданы миграциями) |
| 34: Нарушение «make webhooks idempotent» | Нечего нарушать: webhooks нет. Релевантно только как отсутствие функциональности |
| 34 и 31: молчат о безопасности Edge Functions и молчаливых откатах на мок | Добавлено: нет авторизации/лимитов у `generate-*`, `CORS *`, пользователь не информируется о подмене мок-данными |
| 31/34: «Gemini» как единственный провайдер | Подтверждено: текст — `gemini-flash-latest`, картинки — `gemini-2.5-flash-image` (через `IMAGE_MODEL`). Абстракция картинок есть (`_shared/imagegen.ts`), у текста — функция `callLLM` внутри `generate-story` |
