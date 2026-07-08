# Rently Innovation Hub

**Access Made Simple. Ownership Made Optional.**

Rently is a multi-category rental marketplace for Nigeria — an aggregator that connects Renters who need temporary access to items, equipment, spaces or services with Providers who own assets and want to monetize them. Unlike single-tenant rental software (Booqable-style), Rently is the discovery and trust layer across dozens of categories: events, AV equipment, tools, vehicles, real estate, fashion, musical instruments, and more.

This repository holds the product design and technical architecture for Rently, prepared for **Dynamic Technology Ltd.**

---

## What's here

The prototype is a full front-to-back visual pass across the entire product — one editorial design language (Fraunces/Inter, warm paper palette, asymmetric layout, no stock photography) carried consistently from the marketing homepage through to the provider earnings table, sharing a single design-system stylesheet and script so every screen reads as one handcrafted product rather than a set of disconnected mockups.

| Page | What it covers |
|---|---|
| [`prototype/homepage.html`](prototype/homepage.html) | Marketing homepage — asymmetric imagery collage, Airbnb-grade floating search (recent/popular searches, location autocomplete, custom date-range calendar), bento category browser, editorial rental-card marketplace grid, trust numbers, provider pitch. |
| [`prototype/browse.html`](prototype/browse.html) | Search & browse results — category chips, sidebar filters (price, Instant Book, verified, rating), sort, map/list toggle, live client-side filtering with an empty state. |
| [`prototype/listing.html`](prototype/listing.html) | Listing detail — photo gallery, specs, provider profile, review breakdown, and the booking widget (highest-stakes component: price-first, Instant Book vs. Request to Book as a labeled state, itemized live breakdown, escrow messaging). |
| [`prototype/checkout.html`](prototype/checkout.html) | Booking flow — Review → Verify (OTP) → Pay (card/transfer/USSD) → Confirmation, with a persistent order summary and escrow trust messaging throughout. |
| [`prototype/auth.html`](prototype/auth.html) | Login / sign-up, renter vs. provider role selection, OTP verification for new accounts. |
| [`prototype/dashboard-renter.html`](prototype/dashboard-renter.html) | Renter dashboard — bookings (by status), favorites, messages, account settings. |
| [`prototype/dashboard-provider.html`](prototype/dashboard-provider.html) | Provider dashboard — KPI overview, listings management (+ add-listing modal), booking requests (approve/decline), earnings ledger, payout & verification settings. |
| [`prototype/assets/rently.css`](prototype/assets/rently.css) / [`rently.js`](prototype/assets/rently.js) | The shared design system: tokens, nav, buttons, badges, cards, forms, tables, modals, the date-range picker, icon set, and all mock data — the single source of truth every page above pulls from. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture: modular monolith design, domain boundaries, tech stack rationale, the three hardest technical problems (double-booking, payment idempotency, escrow correctness) solved explicitly, scalability path, security, CI/CD, cloud topology. |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Full entity model with an ERD, table-by-table field definitions, and the reasoning behind the harder calls (JSONB category attributes, ledger-based escrow, `EXCLUDE` constraints for availability). |
| [`docs/API_DESIGN.md`](docs/API_DESIGN.md) | REST API surface by resource, idempotency/pagination/error conventions, and why each convention exists. |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Design principles, tokens (color/type/spacing/elevation), component contracts, motion rules, and accessibility commitments — being brought in line with the palette actually implemented in `prototype/assets/rently.css`. |
| [`docs/INFORMATION_ARCHITECTURE.md`](docs/INFORMATION_ARCHITECTURE.md) | Full route map, navigation model per role, and sequence diagrams for the three key flows (booking, provider onboarding, disputes). |

## Viewing the prototype

No install required — it's static HTML/CSS/JS with no build step:

```bash
npx serve prototype
```

Then open `http://localhost:3000` (redirects to the homepage), or jump straight to any screen: `/browse.html`, `/listing.html?id=l1`, `/checkout.html`, `/auth.html`, `/dashboard-renter.html`, `/dashboard-provider.html`.

You can also open any file directly (`start prototype/homepage.html` on Windows, `open prototype/homepage.html` on macOS) — cross-page links and the shared stylesheet resolve via relative paths either way.

## Product snapshot

| | |
|---|---|
| **Primary market** | Nigeria (payment rails: Paystack, Flutterwave, mobile money) |
| **MVP categories** | Event & Party, AV Equipment, Tools & Construction, Real Estate & Spaces (4 of 10 total taxonomy categories — see PRD §14 for the phased rollout rationale) |
| **Core loop** | Discover → Book (Instant or Request) → Escrow Payment → Complete → Review |
| **Trust mechanisms** | ID/business verification, escrow-held payments, two-way reviews tied to completed bookings, documented dispute resolution |
| **Success bar** | Provider response time < 24hrs, dispute/cancellation rate < 5%, average rating ≥ 4.3/5 |

## Recommended stack (see `docs/ARCHITECTURE.md` for the full reasoning)

```
Frontend    Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion
Backend     NestJS (TypeScript) — modular monolith, domain-bounded modules
Database    PostgreSQL + PostGIS  ·  Redis (cache/locks/queues)  ·  OpenSearch (faceted search)
Storage     Cloudflare R2 (S3-compatible)
Payments    Paystack + Flutterwave, behind a common processor-adapter interface
Auth        Clerk at MVP → self-hosted post–Series A
Infra       AWS af-south-1 behind Cloudflare (CDN/WAF/DNS) · Terraform · GitHub Actions
Observability  OpenTelemetry + Grafana stack · Sentry
```

## Repository structure

```
Rently-Innovation-Hub/
├── README.md
├── vercel.json
├── prototype/
│   ├── index.html                 redirects to homepage.html (keeps the root URL working)
│   ├── homepage.html               marketing homepage
│   ├── browse.html                 search & browse results
│   ├── listing.html                listing detail + booking widget
│   ├── checkout.html               booking flow (review → verify → pay → confirm)
│   ├── auth.html                   login / sign-up / OTP
│   ├── dashboard-renter.html       renter dashboard
│   ├── dashboard-provider.html     provider dashboard
│   └── assets/
│       ├── rently.css              design system: tokens + every shared component
│       └── rently.js               icon set, duotone art, mock data, shared interactions
├── backend/                        NestJS scaffold (see backend/README.md)
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── API_DESIGN.md
    ├── DESIGN_SYSTEM.md
    └── INFORMATION_ARCHITECTURE.md
```

## Status

**Draft v1.0 — design & architecture phase.** Not yet implemented in code beyond the NestJS scaffold in `backend/`. The full front-of-house flow — homepage, browse, listing detail, checkout, auth, and both dashboards — now shares one editorial design language end to end via `prototype/assets/`. Open questions tracked against the source PRD include final commission structure, Instant Book vs. Request-to-Book policy at launch, and the verification standard for providers (ID-only vs. business registration). See `docs/ARCHITECTURE.md` §9 for what is deliberately deferred past MVP.

---

*A Dynamic Technology Ltd. product.*
