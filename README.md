# Gouden Verhaal

Build a premium web app called "KidStory AI" — a Dutch-market service that turns a real family story into a personalized, illustrated children's storybook. The child is the hero (their real face in AI illustrations), and the printed book contains QR codes that play recorded family voices (e.g., grandpa reading a part of the story).

IMPORTANT: This is a polished interactive MVP prototype. All AI generation, voice cloning, and payments are MOCKED with realistic fake data and loading states. Structure the code so a real backend can be plugged in later.

=== LANGUAGE ===

ALL user-facing UI text must be in DUTCH (Netherlands). Natural, warm, premium tone — not machine-translated. Code, comments, and variable names in English.

=== DESIGN SYSTEM (strict) ===

Aesthetic: "cozy dark magic" — think the Arcane series meets a luxury children's publisher. Dark, warm, magical, premium. NOT a typical bright pastel kids' site.

Colors:

- Background / primary dark: #1C1A2E (deep indigo)

- Accent gold: #D4903A (amber gold) — primary CTAs, highlights, magical details

- Accent rose: #C8547E (raspberry rose) — secondary accents, emotional highlights

- Light / text on dark: #F2EDD8 (warm cream)

- Derive subtle tints/shades of these for surfaces, borders, hover states. No pure white, no pure black.

Typography:

- Headings: Playfair Display (serif, elegant)

- UI / body: Inter

Load via Google Fonts.

Visual details:

- Soft glows around gold elements, subtle star/particle textures in hero areas

- Generous whitespace, large rounded corners (16–24px), soft shadows

- Book mockups and illustrations shown as elegant framed cards with warm glow

- Micro-animations: gentle fade/slide on scroll, soft hover lift on cards

- Fully responsive, mobile-first

=== APP STRUCTURE — 4 CORE SCREENS ===

--- SCREEN 1: LANDING PAGE (/) ---

Sections top to bottom:

1. Hero: headline "Jouw kind, de held van een echt familieverhaal" + subheadline about turning a real family memory into a magical illustrated book with the child's own face — and the voices of the family playable via QR codes in the printed book. Primary CTA button "Maak jullie boek" (gold). Secondary link "Bekijk een voorbeeld". Visual: elegant hardcover book mockup with a glowing QR code.

2. Sinterklaas campaign banner: "Op tijd voor Sinterklaas 🎁 — bestel vóór 20 november" with subtle countdown.

3. "Hoe het werkt" — 3 steps with icons:

   - "Vertel jullie verhaal" (record a 2–5 min voice message or type it)

   - "AI maakt het sprookje" (illustrated fairy tale with your child's face, in your chosen style)

   - "Scan & luister" (QR codes in the printed book play family voices — forever)

4. Emotional core section: "De stem van opa en oma — voor altijd bewaard". Explain that a grandparent's voice recorded today stays with the child forever via the QR code in the book. This is the signature feature — give it a full-width, emotionally strong section with rose accent.

5. Illustration styles gallery: 4 style cards (Aquarel, Tekenfilm, Sprookjesachtig, Realistisch) with placeholder images.

6. Privacy trust block (very prominent, not footer): "Wij bewaren geen gegevens van je kind." Three bullet points: photo deleted immediately after generation + email confirmation; voice recording deleted after processing; no AI training on your data. Shield/check icons, gold accents.

7. Pricing: single card — "Eén boek — €34,99": hardcover 24–32 pages, AI illustrations with your child's face, choice of style, 1 QR family voice, preview & edit before printing, PDF included, delivery in NL. CTA "Bestel nu".

8. FAQ accordion (6–8 questions in Dutch: how long does it take, what happens to the photo, how does the QR voice work, delivery time, can I edit the book, is it really my child's face).

9. Footer: minimal, links to Privacybeleid / Voorwaarden (placeholder pages), email signup "Blijf op de hoogte" (waitlist form, store locally/mock).

--- SCREEN 2: ORDER WIZARD (/bestellen) ---

Multi-step wizard with a progress indicator (5 steps), state preserved across steps:

Step 1 — "Over je kind": child's first name, age selector with 6 brackets (0–1, 1–2, 2–3, 3–5, 5–7, 7–8 jaar) shown as cards with a note that the story language and complexity adapt to age.

Step 2 — "Foto uploaden": drag & drop photo upload (mock, show preview). Directly under the uploader, a highlighted privacy notice: "Deze foto wordt direct na het genereren van de illustraties verwijderd. Je ontvangt hiervan een bevestiging per e-mail." Checkbox: parent confirms they are the parent/guardian and consent to processing (required).

Step 3 — "Jullie verhaal": two tabs.

   Tab A (default) "Inspreken" — a beautiful voice recorder UI (mock recording with animated waveform, timer 2–5 min, re-record option). Note: "Jouw stem wordt ook de voorleesstem in het boek — één opname, twee cadeaus."

   Tab B "Typen" — textarea with 4 guiding questions as placeholder prompts (What happened? Who was there? What made it special? How did it end?., in Dutch).

Step 4 — "Kies een stijl": the 4 illustration style cards, single select, plus an optional free-text field "Of beschrijf je eigen stijl". 

Step 5 — "Familiestem voor de QR-code": explain one family member's voice will be playable via QR in the printed book. Mock voice recorder (same component as step 3) + required consent checkbox: "Ik bevestig dat dit mijn eigen stem is en geef toestemming voor het klonen ervan. De originele opname wordt na verwerking verwijderd."

Then CTA "Genereer voorbeeld" → shows a magical full-screen loading state (animated, ~4 seconds, rotating Dutch status messages like "We toveren jullie verhaal om in een sprookje…") → navigates to preview.

--- SCREEN 3: BOOK PREVIEW (/voorbeeld) ---

- Header: "Jullie boek is klaar om te bekijken ✨"

- Page-spread viewer: horizontal carousel of 8–10 mock spreads. Each spread: placeholder illustration + story text overlay/below.

- Per spread: (a) "Tekst bewerken" — inline editable text; (b) "Illustratie opnieuw genereren" — opens a modal with 3 mock alternative variants to pick from.

- Visual indicators showing where QR codes will appear in the book (small gold QR badge on 2–3 spreads with tooltip "Hier klinkt de stem van [naam]").

- Sticky bottom bar: "Alles goed? → Naar bestellen" (gold CTA) + total price €34,99.

--- SCREEN 4: CHECKOUT (/afrekenen) ---

- Order summary card: book title, child name, style, hardcover 24–32 pages, 1 QR voice, PDF included. Price €34,99, shipping "Gratis verzending in Nederland (4–6 werkdagen)".

- Shipping address form (Dutch fields: Naam, Straat + huisnummer, Postcode, Plaats).

- Mock payment section with iDEAL as the primary payment method (bank selector dropdown — iDEAL is essential for the Dutch market), plus card option. No real payment processing.

- "Betaal €34,99" button → success screen: order confirmation + prominent reassurance block: "De foto van je kind wordt nu verwijderd. Je ontvangt binnen enkele minuten een bevestiging per e-mail. ✓" + expected delivery date + "PDF-versie komt naar je inbox".

=== TECHNICAL NOTES ===

- React + Tailwind, shadcn/ui where useful, react-router for the 4 routes

- Global order state (context or zustand) across the wizard

- All mock delays via setTimeout with skeleton/loading states

- Clean component structure: separate components for VoiceRecorder, StyleCard, SpreadViewer, PrivacyBadge — they will be reused

- Prepare a /lib/api.ts with stubbed async functions (generateBook, cloneVoice, createOrder) returning mock data, so real endpoints can replace them later

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://childs-voice-tale.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/130c1919-7769-4538-8608-5d1026b90946).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
