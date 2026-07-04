# Rently — API Design

REST over HTTPS, versioned at the path (`/api/v1/...`), JSON everywhere. WebSocket channel for realtime messaging and booking-status pushes. This document defines conventions once so every endpoint is predictable — a Stripe-quality API is one where you can guess the next endpoint correctly before reading the docs.

## Conventions

- **Auth:** `Authorization: Bearer <JWT>`. Public endpoints (browse, search, listing detail) work unauthenticated; everything that mutates state requires a token.
- **Idempotency:** Any `POST` that creates a financial or booking side effect (`POST /bookings`, `POST /payments/charge`) **requires** an `Idempotency-Key` header. Replaying the same key returns the original response instead of re-executing — this is the single biggest defense against double-booking/double-charge from client retries.
- **Pagination:** Cursor-based (`?cursor=...&limit=20`), not offset — offset pagination silently breaks (skips/duplicates rows) on a live, frequently-written listings table.
- **Errors:** Consistent shape —
  ```json
  { "error": { "code": "BOOKING_DATES_UNAVAILABLE", "message": "These dates were just booked by someone else.", "details": {} } }
  ```
  Machine-readable `code` first, human message second — the frontend should never string-match on `message`.
- **Rate limits:** Returned via standard `X-RateLimit-*` headers; auth/OTP endpoints have materially tighter limits than browse endpoints.
- **Money:** Always transmitted as integer minor units (`amount_minor: 4500000` = ₦45,000.00), currency explicit (`currency: "NGN"`) — never a float.

---

## Resource groups

### Auth & Onboarding
```
POST   /auth/signup                  { email|phone, password, role }
POST   /auth/login
POST   /auth/otp/request              { phone }
POST   /auth/otp/verify               { phone, code }
POST   /auth/refresh
POST   /auth/logout
POST   /auth/password/reset-request
POST   /auth/password/reset
```

### Users & Provider Profiles
```
GET    /users/me
PATCH  /users/me
POST   /providers/profile             create/upgrade a user to Provider
GET    /providers/:id                 public provider profile (rating, verified badge, listings)
POST   /providers/:id/verification-documents     multipart upload
GET    /providers/me/verification-status
```

### Categories & Taxonomy
```
GET    /categories                    tree, includes attribute_schema per category
GET    /categories/:slug
```
*(Write endpoints for categories live under `/admin`, §Admin below — taxonomy changes are an admin action, never a public write.)*

### Listings
```
GET    /listings                      browse (see Search below for the filtered variant)
POST   /listings                      [Provider] create — validated against category.attribute_schema
GET    /listings/:id
PATCH  /listings/:id                  [Provider, owner only]
DELETE /listings/:id                  [Provider, owner only] soft delete
POST   /listings/:id/photos           multipart upload, ordered
POST   /listings/:id/publish          submits for admin moderation (status: draft → pending_review)
POST   /listings/:id/pause
POST   /listings/:id/duplicate
GET    /listings/:id/availability?from=&to=   returns booked/blocked ranges
POST   /listings/:id/availability-blocks      [Provider] manual block (maintenance etc.)
```

### Search & Discovery
```
GET    /search?q=&category=&lat=&lng=&radius_km=&price_min=&price_max=
              &available_from=&available_to=&rating_min=&sort=&cursor=
```
Backed by OpenSearch, not the primary Postgres read path — see `ARCHITECTURE.md` §2. Response includes facet counts per category/attribute for building filter UIs dynamically.

### Booking & Calendar
```
POST   /bookings                      { listing_id, from, to }  — requires Idempotency-Key
GET    /bookings/:id
GET    /bookings?role=renter|provider&status=
POST   /bookings/:id/approve          [Provider] — Request-to-Book mode only
POST   /bookings/:id/decline          [Provider]
POST   /bookings/:id/cancel           [Renter or Provider] — enforces cancellation_policy server-side
POST   /bookings/:id/complete         [Provider] marks rental as returned
```
`POST /bookings` performs, in a single DB transaction: availability check (relying on the `EXCLUDE` constraint as the final guarantee, not just a pre-check), fee calculation snapshot, and row creation. A 409 with `BOOKING_DATES_UNAVAILABLE` means the constraint caught a race — the client should immediately refresh availability.

### Payments
```
POST   /bookings/:id/payments/initiate     returns processor checkout session/reference — requires Idempotency-Key
POST   /webhooks/paystack                   signature-verified, moves escrow state on confirmation
POST   /webhooks/flutterwave
GET    /bookings/:id/payment
POST   /bookings/:id/refund                 [Admin, or system on approved cancellation]
GET    /providers/me/payouts
GET    /providers/me/earnings-summary
```
Webhooks are the source of truth for payment confirmation — the client-side "success" screen is optimistic UI, never the trigger that marks a booking paid.

### Messaging
```
GET    /conversations
GET    /conversations/:id/messages?cursor=
POST   /conversations/:id/messages
WS     /ws/conversations/:id           realtime push, falls back to polling if WS unavailable
```

### Reviews
```
POST   /bookings/:id/reviews          { rating, comment } — only after status=completed, one per direction
GET    /listings/:id/reviews
GET    /providers/:id/reviews
POST   /reviews/:id/response          [Provider] public reply
```

### Trust & Safety
```
POST   /reports                       { entity_type, entity_id, reason, description }
POST   /bookings/:id/disputes         { reason, description, evidence_urls[] }
GET    /disputes/:id
```

### Notifications
```
GET    /notifications?unread=true
POST   /notifications/:id/read
PATCH  /users/me/notification-preferences
```

### Admin
```
GET    /admin/providers/verification-queue
POST   /admin/providers/:id/verify | /reject
GET    /admin/listings/moderation-queue
POST   /admin/listings/:id/approve | /reject
POST   /admin/categories                    create/edit category + attribute_schema
PATCH  /admin/categories/:id
GET    /admin/disputes
POST   /admin/disputes/:id/resolve
GET    /admin/analytics/overview            GMV, active users, bookings, top categories
GET    /admin/audit-log?entity_type=&entity_id=
```

---

## Why these specific decisions

- **Cursor pagination everywhere** — offset pagination on a table receiving concurrent writes (new listings, cancelled bookings) produces skipped or duplicated results; this is a real bug users would hit on page 2 of search results during a busy period.
- **Webhooks as the payment source of truth** — trusting a client-side redirect as "payment succeeded" is a well-known fraud vector (user aborts after seeing the success page but before the webhook fires); server-confirmed state only.
- **Idempotency keys on financial/booking mutations** — a slow network causing a double-tap "Pay" button must never become a double charge. This one header is cheaper to build than the support/refund cost of getting it wrong once.
- **Error codes as the contract, messages as decoration** — lets the frontend show localized, friendly copy without the backend team needing to coordinate string changes with the frontend team.
