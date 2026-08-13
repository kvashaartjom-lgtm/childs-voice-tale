# 34-AUDIT.md — Аудит фактического состояния

Дата: 2026-08-13. Только факты — никаких предложений.

---

## 1. База данных

### Реально существующие миграции

| Файл | Создаёт |
|---|---|
| `20250101000000_create_waitlist.sql` | таблица `waitlist`, RLS-политика anon INSERT |
| `20260810000000_create_book_jobs.sql` | таблица `book_jobs`, бакеты `characters` и `pages` (private) |

### Схема book_jobs (реальная)

```
book_jobs(id uuid PK, created_at timestamptz, style_id text, page_count int, status text, error text)
RLS: включён, политик нет → доступ только через service_role
```

### Схема waitlist (реальная)

```
waitlist(id uuid PK, email text UNIQUE, created_at timestamptz)
RLS: anon INSERT only
```

### Сравнение с 11-DATABASE.md

| Таблица из 11-DATABASE.md | Статус |
|---|---|
| `profiles` | **отсутствует** |
| `families` | **отсутствует** |
| `children` | **отсутствует** |
| `books` | **отсутствует** |
| `book_versions` | **отсутствует** |
| `book_pages` | **отсутствует** |
| `generation_jobs` | **отсутствует** — вместо неё `book_jobs` (упрощённая: нет `job_type`, `progress`, `retry_count`, `provider`, `provider_job_id`) |
| `products` | **отсутствует** |
| `product_variants` | **отсутствует** |
| `product_prices` | **отсутствует** |
| `orders` | **отсутствует** |
| `payments` | **отсутствует** |
| `fulfillment_providers` | **отсутствует** |
| `print_jobs` | **отсутствует** |
| `shipments` | **отсутствует** |
| `voice_profiles` | **отсутствует** |
| `audio_assets` | **отсутствует** |
| `qr_access` | **отсутствует** |

Таблицы, которых нет в 11-DATABASE.md, но есть в коде: `waitlist`, `book_jobs`.

**Итог:** из 19 таблиц спецификации существуют 0. `book_jobs` — частичный аналог `generation_jobs` с другой схемой.

---

## 2. Генерация иллюстраций

### Где живёт оркестрация

`src/routes/voorbeeld.tsx`, строки 57–109: `useEffect` в браузере.

```
useEffect (deps: [order.book]):
  1. generateCharacter(blob, styleId, spreads.length)    ← Edge Fn
  2. for i in 0..spreads.length:
       await generatePage(jobId, i, scene)               ← Edge Fn
       await sleep(3000)
```

Вызывает страницы последовательно сам браузер. Завершение зависит от времени жизни вкладки.

### Что происходит при закрытии вкладки

- Cleanup-функция `useEffect` устанавливает `cancelled = true`.
- Текущий in-flight `fetch` к Edge Function **завершится** (Edge Function доводит запрос до конца на сервере).
- Следующая итерация цикла (`i+1`) **не стартует** — `if (cancelled) break`.
- Состояние `book_jobs` в БД остаётся в статусе `character_ready` без записей о незавершённых страницах.
- Сгенерированные страницы не будут сохранены в `generatedImages` (React state уничтожен).

**Вывод:** процесс генерации страниц не переживает закрытие вкладки.

### Сравнение с документацией

- **08-AI-ILLUSTRATIONS.md**: «Browser does not orchestrate multi-page generation. Backend/job system owns it.» — **нарушено**.
- **AD-009** (05-ARCHITECTURE-DECISIONS.md): «AI generation is asynchronous and browser-independent.» — **нарушено**.

---

## 3. Все Edge Functions

| Функция | Назначение | Ключи |
|---|---|---|
| `join-waitlist` | INSERT email в `waitlist` (unique, idempotent через 23505) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `generate-story` | Генерирует 10 спредов текста через Gemini (text-only) | `GEMINI_API_KEY` |
| `generate-character` | Создаёт character sheet из фото ребёнка, сохраняет в `characters` бакет | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `IMAGE_MODEL` (env, опц.) |
| `generate-page` | Генерирует иллюстрацию страницы по sheet из `characters`, сохраняет в `pages` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `IMAGE_MODEL` (env, опц.) |

**Дополнительно:** `_shared/cors.ts`, `_shared/imagegen.ts`, `_shared/prompts.ts` — вспомогательные модули, не являются самостоятельными функциями.

**Примечание:** `generate-story` и `join-waitlist` определяют CORS-заголовки локально, не импортируя из `_shared/cors.ts`.

---

## 4. Фото ребёнка: путь данных

```
[пользователь выбирает файл]
       ↓
OrderState.photoDataUrl  ← data URL, только React memory, НЕ localStorage
       ↓
voorbeeld.tsx:70   fetch(photoUrl).then(r => r.blob())   ← blob в памяти
       ↓
api.ts:141         generateCharacter(blob, styleId, ...)
       ↓
photo.ts:21        prepareChildPhoto(photo as File)
                   - createImageBitmap → canvas resize ≤1024px
                   - canvas.toBlob (JPEG q0.9) → EXIF уничтожен
                   - canvas.width = 0 → пиксели обнулены
                   - btoa → base64 строка в памяти
       ↓
api.ts:144         supabase.functions.invoke("generate-character", { body: { photo: prepared, ... } })
       ↓
generate-character/index.ts:54   callImageModel(prompt, [{ mimeType, data: photo.data }])
                                 → Gemini API (inline_data)
       ↓
generate-character/index.ts:57   "С этой строки фото больше нигде не участвует"
       ↓
generate-character/index.ts:80   update({ photoDataUrl: null, photoName: null })  ← очищается из контекста
```

**Попадает ли фото в Storage или БД?** Нет. В `characters` бакет загружается `sheet.png` — сгенерированная иллюстрация, не оригинальное фото.

**Попадает ли фото в логи?** В `generate-character/index.ts:79` логируется только `message` (строка), не тело запроса. `imagegen.ts:88` содержит комментарий: «Тело ответа не логируем целиком — в нём может быть эхо запроса».

**Итог:** путь данных соответствует требованиям 04-LEGAL-PRIVACY.md и 20-PRIVACY.md.

---

## 5. Оплата

### Реальное состояние

`src/lib/api.ts`, строки 177–190:

```typescript
export async function createOrder(_order: OrderState): Promise<CreatedOrder> {
  await delay(2200);                       // ← искусственная задержка
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 6);
  return {
    id: `KS-${Math.floor(100000 + Math.random() * 899999)}`,  // ← случайный ID
    total: BOOK_PRICE,
    estimatedDelivery: delivery.toLocaleDateString("nl-NL", ...),
  };
}
```

`src/routes/afrekenen.tsx`, строки 60–66:

```typescript
const pay = async () => {
  setProcessing(true);
  const result = await createOrder(order);   // ← мок, всегда успешен
  update({ photoDataUrl: null, photoName: null });
  setConfirmed(result);                      // ← фронтенд сам ставит "успех"
  ...
};
```

### Сравнение с документацией

- **AD-007**: «Payment becomes `paid` only after verified provider webhook.» — **нарушено**: нет провайдера, нет webhook, фронтенд сам выставляет успех.
- **13-PAYMENTS.md**: «Frontend must never mark an order paid.» — **нарушено**: `setConfirmed(result)` на строке 65.
- **13-PAYMENTS.md**: «Handlers must be idempotent.» — **не применимо**: webhook отсутствует.
- Реальные провайдеры iDEAL / Stripe / Mollie: **не подключены** (список банков и card form — UI-заглушки).

---

## 6. Цена и продукт

### Захардкоженные константы

| Местоположение | Содержимое |
|---|---|
| `src/lib/api.ts:32` | `export const BOOK_PRICE = 34.99` |
| `src/routes/afrekenen.tsx:18` | `import { BOOK_PRICE, ... } from "@/lib/api"` |
| `src/routes/afrekenen.tsx:275` | `formatEuro(BOOK_PRICE)` — итог в сайдбаре |
| `src/routes/afrekenen.tsx:282` | `formatEuro(BOOK_PRICE)` — итоговая строка |
| `src/routes/afrekenen.tsx:295` | `formatEuro(BOOK_PRICE)` — текст кнопки |
| `src/routes/afrekenen.tsx:31` | OG-meta description: «€34,99 inclusief gratis verzending in Nederland» |
| `src/routes/afrekenen.tsx:40` | `const BANKS = ["ABN AMRO", "ASN Bank", ...]` — фиксированный список NL-банков |

### Сравнение с документацией

- **03-MONETIZATION.md**: «Never use a single global `BOOK_PRICE` as the business source of truth.» — **нарушено**.
- **AD-008**: «Backend is source of truth for price, tax, order, payment...» — **нарушено**: цена считается на фронтенде.
- **AD-013**: «Country/language/locale/currency/tax/printer/shipping are configuration/data.» — **нарушено**: страна NL и список банков захардкожены.
- Таблицы `products`, `product_variants`, `product_prices` из 11-DATABASE.md: **отсутствуют**.

---

## 7. Голос, QR, печать, доставка

| Область | Что реально есть | Что требует пак |
|---|---|---|
| **Голос** | `cloneVoice()` в `api.ts:172`: `await delay(1200); return { voiceId: \`voice_...\` }` — мок. `VoiceRecorder` компонент записывает аудио локально, но не отправляет его никуда. | Провайдер TTS, consent flow, `voice_profiles` таблица, deletion workflow (20-PRIVACY.md, 30-ROADMAP.md Phase 3) |
| **QR** | `hasQrCode: true` на спредах 1, 5, 9 — статические флаги в `generateBook()` (`api.ts:118`). `SpreadViewer` показывает иконку QR, реальный код/URL не генерируется. `qr_access` таблица отсутствует. | Stable platform URL → token → audio asset (AD-012, 20-PRIVACY.md) |
| **Печать** | Нет `FulfillmentRouter`, нет `ProviderAdapter`, нет `PrintJob`. `createOrder()` — мок. | FulfillmentRouter → ProviderAdapter → внешний провайдер (14-PRINTING.md, 02-BUSINESS-MODEL.md) |
| **Доставка** | `estimatedDelivery = new Date() + 6 дней` — вычисляется локально в моке `createOrder()`. Shipment-таблицы нет. | Carrier → tracking → normalized statuses (15-SHIPPING.md) |

---

## Сводная таблица

| Область | Что в коде | Что требует пак | Расхождение | Критичность |
|---|---|---|---|---|
| БД: таблицы | `waitlist`, `book_jobs` (2 таблицы) | 19 таблиц по 11-DATABASE.md | 17 таблиц отсутствуют; `book_jobs` ≠ `generation_jobs` по схеме | Высокая |
| Storage | `characters`, `pages` (private) | Аналогично — плюс будущие `audio_assets` | Соответствует текущим потребностям генерации | Нет |
| Генерация: оркестрация | `useEffect` в браузере, sequential loop | Бэкенд job-система, browser-independent (AD-009) | Закрытие вкладки прерывает цикл; нарушение AD-009 | Критическая |
| Edge Functions | 4 функции (join-waitlist, generate-story, generate-character, generate-page) | Весь бэкенд (платежи, заказы, выполнение, трекинг, QR, голос) | Только генерация и email-лист | Высокая |
| Фото ребёнка | Memory only → base64 → Edge Fn → Gemini → удалено | Временный, не персистировать | Требованиям соответствует | Нет |
| Оплата | Полный мок: `delay(2200)` + random ID | Реальный провайдер + idempotent webhook (AD-007, 13-PAYMENTS.md) | Нет провайдера, нет webhook, фронтенд сам выставляет успех | Критическая |
| Цена | `BOOK_PRICE = 34.99` константа во фронтенде | Backend source of truth, product_variants/prices (AD-008, 03-MONETIZATION.md) | Цена захардкожена в 5 местах в UI | Высокая |
| Страна/банки | NL-банки захардкожены в `afrekenen.tsx:40`, OG-meta: «в Nederland» | Configuration/data (AD-013) | Жёсткая привязка к NL | Высокая |
| Голос | `cloneVoice()` — мок; VoiceRecorder не отправляет данные | Реальный TTS провайдер + consent + deletion | Полная заглушка | Средняя (Phase 3) |
| QR | `hasQrCode` = статический флаг; нет таблицы, нет URL | Stable token → audio (AD-012) | Полная заглушка | Средняя (Phase 3) |
| Печать | Нет ни одного адаптера | FulfillmentRouter + ProviderAdapter (14-PRINTING.md) | Полная заглушка | Средняя (Phase 1) |
| Доставка | `date + 6` в моке | Carrier → tracking → statuses (15-SHIPPING.md) | Полная заглушка | Средняя (Phase 1) |
| Accounts | Нет auth/profiles | `profiles`, `families`, `children` (11-DATABASE.md) | Нет пользовательских аккаунтов | Высокая (Phase 1) |

---

## Нарушения 32-CLAUDE-CODE-RULES.md

| Правило | Место нарушения | Описание |
|---|---|---|
| «never hard-code payment success in frontend» | `src/routes/afrekenen.tsx:62–65` | `const result = await createOrder(order); setConfirmed(result)` — фронтенд принимает решение об успехе оплаты |
| «never hard-code one global price/country» | `src/lib/api.ts:32` | `export const BOOK_PRICE = 34.99` |
| «never hard-code one global price/country» | `src/routes/afrekenen.tsx:31` | OG-meta description содержит «€34,99» и «in Nederland» |
| «never hard-code one global price/country» | `src/routes/afrekenen.tsx:40` | `const BANKS = ["ABN AMRO", ...]` — фиксированный список только нидерландских банков |
| «make browser lifetime a dependency for generation» | `src/routes/voorbeeld.tsx:57–109` | Вся оркестрация generate-page — useEffect в браузере; процесс обрывается при закрытии вкладки |
| «make webhooks idempotent» | Вся система | Webhook отсутствует полностью; правило не нарушено буквально, но обход через мок нарушает AD-007 |
| «use migrations for database changes» | Суперсет | Из 19 таблиц спека только 2 имеют миграции; остальные не созданы даже в dev. Правило технически не нарушено (незаписанного нет), но спецификация игнорируется. |
| «update docs when architecture changes» | `docs/31-CURRENT-STATE.md` | Файл описывает «character generation, page generation» как существующие, но не фиксирует отклонение от AD-009 (browser orchestration) |
