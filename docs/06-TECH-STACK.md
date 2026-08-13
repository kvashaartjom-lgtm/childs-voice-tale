# Technical Architecture

## Existing foundation
React, TypeScript, TanStack Start/Router, Supabase, Edge Functions, Gemini, i18n.

## Layers
Client: web/iOS/Android.
Backend: auth, books, generation, payments, orders, fulfillment, audio, user data.
Database: Supabase/Postgres system of record.
Storage: private generated assets.
Providers: AI, TTS/voice, payments, printing, shipping.

## Rule
External provider APIs must be replaceable without changing the core product domain model.
