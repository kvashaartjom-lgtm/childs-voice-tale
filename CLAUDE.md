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
npm run lint       # ESLint
npm run format     # Prettier
```

No test suite is configured. The app is tested manually in the browser.

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

### API layer (all mocked)

`src/lib/api.ts` contains stubbed async functions with fake delays. Replace function bodies with real fetch/server calls — signatures are the stable contract:

- `generateBook(order)` → `GeneratedBook`
- `regenerateIllustration(spreadId, variantUrl)` → updated spread
- `cloneVoice(seconds)` → `{ voiceId }`
- `createOrder(order)` → `CreatedOrder` (order ID + delivery date)
- `joinWaitlist(email)` → persisted to `localStorage` under `kidstory_waitlist`

Also exports: `BOOK_PRICE`, `formatEuro`, `STYLE_IMAGES`, `mockIllustration`, `illustrationVariants`.

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
