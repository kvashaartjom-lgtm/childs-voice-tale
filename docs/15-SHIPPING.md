# Shipping

## Flow
Print Job → Shipment → Carrier → Tracking → Delivery.

## Normalized statuses
pending, label_created, in_transit, out_for_delivery, delivered, exception, returned.

Customer sees normalized tracking, not provider-specific implementation details.

Future: multiple carriers, country-specific routing, tracking webhooks, delivery estimates and returns/replacements.
