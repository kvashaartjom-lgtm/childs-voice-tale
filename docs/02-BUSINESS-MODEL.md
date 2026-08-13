# Business Model

## Core model
The platform sells the personalized experience and physical book. Printers are B2B fulfillment suppliers and remain invisible to the customer-facing brand.

## Fulfillment strategy
### Phase 1
One qualified API-capable print-on-demand provider.

### Phase 2
Second provider for redundancy, geography, economics and quality comparison.

### Phase 3
Direct local printer contracts where volume justifies better unit economics or service.

## Provider abstraction
Order → FulfillmentRouter → ProviderAdapter → selected provider.

## Customer outcome
The platform owns customer communication and defective/damaged order handling. Provider contracts should define replacement/reimbursement procedures.

## Quality gate
Before activating a provider/country/product: physical test order → inspect paper, print, binding, trimming, cover, packaging, delivery and tracking → PASS/FAIL.
