# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Constraints

### Do not touch without an explicit request
- Visual design: colors, fonts, spacing, animations
- JSX markup of existing components and pages
- UI text (Dutch)
- Tailwind classes in existing files

### Work zone
- `src/lib/api.ts` — replacing mock function bodies with real calls
- New files: backend logic, integrations, edge functions
- State and data processing logic

### Product principles — never violate
- The child's photo is **never** persisted beyond the illustration generation step
- No secrets or API keys in frontend code — all keys live in server functions only
- Photo uploads go directly to storage via a presigned URL — never through the application server
- The photo must never appear in persistent state, logs, or request bodies sent to the application server

## Commands

```sh
npm run dev        # start dev server (Vite)
npm run build      # production build
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run format     # Prettier
```

No test suite is configured. The app is tested manually in the browser.

## Перед каждым пушем

**Обязательно** выполни перед каждым `git push`:

```sh
npm run build && npm run preview
```

После запуска `preview` открой каждую страницу в браузере и убедись, что они рендерятся без ошибок:

- `/` — лендинг
- `/bestellen` — мастер заказа (все 5 шагов)
- `/voorbeeld` — предпросмотр книги
- `/afrekenen` — чекаут
- `/privacybeleid` — политика конфиденциальности
- `/voorwaarden` — условия

**Пуш со сломанным билдом запрещён.** Если `npm run build` падает — сначала починить, потом пушить.

## Architecture

**Stack:** React 19 + TanStack Start (SSR) + TanStack Router + TanStack Query + Tailwind CSS v4 + shadcn/ui + Vite 8.

This is a Lovable-generated project. The live app is at `https://childs-voice-tale.lovable.app`. Do not force-push or amend/squash already-pushed commits — Lovable syncs from the connected branch and rewrites history on their side if you rewrite yours.

### Routing

Routes live in `src/routes/` and use TanStack Router's file-based routing. The generated route tree is in `src/routeTree.gen.ts` — do not edit it manually; it regenerates on `vite dev`.

| Route | File | Purpose |
|---|---|---|
| `/` | `routes/index.tsx` | Landing page |
| `/bestellen` | `routes/bestellen.tsx` | 5-step order wizard |
| `/voorbeeld` | `routes/voorbeeld.tsx` | Book preview + inline editing |
| `/afrekenen` | `routes/afrekenen.tsx` | Checkout + mock payment |
| `/privacybeleid` | `routes/privacybeleid.tsx` | Privacy policy (placeholder) |
| `/voorwaarden` | `routes/voorwaarden.tsx` | Terms (placeholder) |

The root layout (`routes/__root.tsx`) wraps everything in `QueryClientProvider` and `OrderProvider`.

### Global state

Order state flows through `src/lib/order-store.tsx` — a React Context (`OrderProvider`/`useOrder`) that holds the entire wizard state (`OrderState`). All four screens read from and write to this context; it is the single source of truth across wizard steps. The `GeneratedBook` (from the preview call) is also stored here.

Key types exported from `order-store.tsx`: `OrderState`, `IllustrationStyleId`, `AgeBracketId`, `ShippingAddress`, `AGE_BRACKETS`, `ILLUSTRATION_STYLES`.

### API layer

`src/lib/api.ts` contains async functions — some mocked, some live. Signatures are the stable contract:

- `generateBook(order)` → `GeneratedBook` — mocked
- `regenerateIllustration(spreadId, variantUrl)` → updated spread — mocked
- `cloneVoice(seconds)` → `{ voiceId }` — mocked
- `createOrder(order)` → `CreatedOrder` (order ID + delivery date) — mocked
- `joinWaitlist(email)` → calls `supabase/functions/join-waitlist` Edge Function via `fetch` — **live**

Also exports: `BOOK_PRICE`, `formatEuro`, `STYLE_IMAGES`, `mockIllustration`, `illustrationVariants`.

### Edge Functions

Located in `supabase/functions/`. Deployed to project `ffgbslqxuvcvbaolxybq`.

| Function | Purpose | Auth |
|---|---|---|
| `generate-story` | Generates book spreads via Gemini | Called by server |
| `join-waitlist` | Inserts email into `waitlist` table | Public (anon JWT) |

**Service role key rule:** `SUPABASE_SERVICE_ROLE_KEY` is only accessed via `Deno.env.get(...)` inside Edge Function code. It is never hardcoded, never imported in `src/`, and never committed to the repository. The anon key (public by design) is the only Supabase credential allowed in frontend code.

The `waitlist` table has no PostgREST INSERT policy accessible to browsers — all writes go through `join-waitlist` which uses the service role key server-side.

## Фото ребёнка — уточнение (иллюстрации)

Фото НЕ загружается в Supabase Storage. Поток: браузер → ресайз до 1024px
через canvas → base64 в теле запроса к Edge Function `generate-character` →
модель → ответ. Диска фото не касается.

Это сознательное отклонение от правила «только presigned upload»: здесь
storage вообще не участвует, и удалять нечего.

Запрещено:
- сохранять фото или его base64 в Storage, БД, localStorage, sessionStorage
- логировать тело запроса к generate-character
- включать содержимое фото в текст ошибки
- добавлять персональные поля в таблицу book_jobs

Character sheet (стилизованный рисунок) хранить можно — это то, что
продуктовая политика прямо разрешает вместо face-embedding.

### Reusable components

Located in `src/components/`:

- `VoiceRecorder` — mock audio recorder with animated waveform, timer, re-record; used in wizard steps 3 and 5
- `StyleCard` — illustration style selector card (aquarel / tekenfilm / sprookjesachtig / realistisch)
- `SpreadViewer` — horizontal carousel of book page spreads with inline text editing and illustration regeneration
- `PrivacyBadge` — GDPR trust block (photo/voice deletion guarantees)
- `MagicalLoader` — full-screen animated loading state with rotating Dutch status messages
- `SiteHeader` / `SiteFooter` / `Reveal` — layout and scroll-reveal animation wrapper

`src/components/ui/` contains shadcn/ui primitives — do not edit these directly unless patching a bug.

### Design system

"Cozy dark magic" aesthetic — dark, warm, magical, premium.

CSS custom properties defined in `src/styles.css`:
- `--background` → `#1C1A2E` (deep indigo)
- `--gold` → `#D4903A` (amber gold — primary CTAs)
- `--rose` → `#C8547E` (raspberry rose — emotional accents)
- `--cream` / `--foreground` → `#F2EDD8` (warm cream — text on dark)

Tailwind tokens `text-gold`, `bg-gold`, `text-rose`, `bg-rose`, `text-cream`, `bg-surface`, `bg-surface-2` map to these CSS vars. Typography: `font-serif` = Playfair Display (headings), `font-sans` = Inter (body). Both loaded via Google Fonts in the root route head.

### Language

All user-facing UI text is in Dutch (Netherlands). Code, comments, and variable names are in English.

### Vite config

`vite.config.ts` delegates to `@lovable.dev/vite-tanstack-config`, which registers TanStack Start, React, Tailwind, tsconfig paths, and Nitro. Do not manually add those plugins — duplicating them breaks the build. The `@` alias resolves to `src/`.
