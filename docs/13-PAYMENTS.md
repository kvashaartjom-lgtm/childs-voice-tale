# Payments Architecture

## Flow
Create Order → Create Checkout Session → Payment Provider → Customer pays → Verified webhook → Payment=paid → Order=paid → Fulfillment.

Frontend must never mark an order paid.

## Store
Internal order id, provider, provider payment id, status, amount, currency, timestamps and webhook event/idempotency reference.

## Webhooks
Handlers must be idempotent. Duplicate events must not create duplicate fulfillment jobs.

## Tax
Backend records subtotal, tax, shipping, discount and total. Exact jurisdictional treatment requires accounting/legal validation.
