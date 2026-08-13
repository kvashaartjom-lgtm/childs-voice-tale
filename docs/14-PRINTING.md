# Printing / Fulfillment

## MVP
One qualified API-capable provider.

## Flow
Order → FulfillmentRouter → ProviderAdapter → external provider.

## Adapter responsibilities
Validate product, upload print assets, create print order, retrieve status, process webhooks/status, retrieve tracking and normalize errors.

## Router responsibilities
Country/product availability, routing rules, provider selection and future fallback.

## Provider selection
Compare print cost, shipping cost, delivery time, country/product coverage, quality, defect rate, API reliability, tracking, replacement policy and SLA.

## Quality gate
Provider/country/product becomes ACTIVE only after a successful physical test order.

## Candidate
Lulu is a candidate for evaluation; it is not locked as the permanent provider. Compare actual unit economics, quality and delivery before production selection.
