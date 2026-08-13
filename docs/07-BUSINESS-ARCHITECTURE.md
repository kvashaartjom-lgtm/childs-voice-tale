# Business Architecture

## Core lifecycle
USER → FAMILY → CHILD → BOOK → BOOK VERSION → ORDER → PAYMENT → FULFILLMENT → PRINT JOB → SHIPMENT → DELIVERY

## Keep separate
- Book: creative product
- Book Version: specific content/assets version
- Generation Job: AI task
- Order: commercial transaction
- Print Job: production request
- Shipment: physical delivery

## Order states
draft → awaiting_payment → paid → fulfillment_pending → printing → shipped → delivered

Exception states should be explicit.

## Generation states
queued → generating → review_ready → completed
Possible: failed, cancelled, retrying.
