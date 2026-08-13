# System Architecture v2

## Target
Website + iOS + Android → shared backend → AI → payment → tax → fulfillment router → printer/provider → shipment → customer.

## Domains
Creative: Book, BookVersion, BookPage, GenerationJob.
Commercial: Product, ProductVariant, Order, Payment, Tax.
Operational: Fulfillment, PrintJob, Shipment.
Media: VoiceProfile, AudioAsset, QRAccess.

## Client
Clients request actions and display state. They do not calculate authoritative totals, mark payments paid, choose arbitrary printers, control long-running generation, or expose provider secrets.

## Backend
Backend owns pricing, tax, order state, generation state, provider selection, payment verification and fulfillment submission.
