# Architecture Decisions

- AD-001: Physical book is the primary commercial product.
- AD-002: Website is primary commerce; mobile apps share the backend.
- AD-003: One shared backend/database/API.
- AD-004: Printer abstraction exists from day one even with one MVP provider.
- AD-005: Printers are B2B fulfillment partners.
- AD-006: Platform owns the customer-facing outcome.
- AD-007: Payment becomes `paid` only after verified provider webhook.
- AD-008: Backend is source of truth for price, tax, order, payment, printer and shipping state.
- AD-009: AI generation is asynchronous and browser-independent.
- AD-010: Original child photos are temporary.
- AD-011: Adult voices only.
- AD-012: QR codes resolve through stable platform URLs, not raw storage URLs.
- AD-013: Country/language/locale/currency/tax/printer/shipping are configuration/data.
- AD-014: Physical formats are product variants.
- AD-015: Subscription comes after the core purchase/fulfillment loop.
- AD-016: Preserve existing UI unless architecture explicitly requires change.
- AD-017: No privileged secrets in frontend.
