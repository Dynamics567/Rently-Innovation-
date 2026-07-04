# Rently Innovation Hub

**Access Made Simple. Ownership Made Optional.**

Rently is a multi-category rental marketplace for Nigeria — an aggregator that connects Renters who need temporary access to items, equipment, spaces or services with Providers who own assets and want to monetize them. Unlike single-tenant rental software (Booqable-style), Rently is the discovery and trust layer across dozens of categories: events, AV equipment, tools, vehicles, real estate, fashion, musical instruments, and more.

This repository holds the product design and technical architecture for Rently, prepared for **Dynamic Technology Ltd.**

---

## What's here

| | |
|---|---|
| 🖱️ [`prototype/index.html`](prototype/index.html) | Fully clickable, self-contained hi-fi prototype — Discover → Search → Listing → Book → Pay → Confirmation, plus a Provider Dashboard. Open it directly in any browser, no build step. |
| 🏗️ [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture: modular monolith design, domain boundaries, tech stack rationale, the three hardest technical problems (double-booking, payment idempotency, escrow correctness) solved explicitly, scalability path, security, CI/CD, cloud topology. |
| 🗄️ [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Full entity model with an ERD, table-by-table field definitions, and the reasoning behind the harder calls (JSONB category attributes, ledger-based escrow, `EXCLUDE` constraints for availability). |
| 🔌 [`docs/API_DESIGN.md`](docs/API_DESIGN.md) | REST API surface by resource, idempotency/pagination/error conventions, and why each convention exists. |
| 🎨 [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Design principles, tokens (color/type/spacing/elevation), component contracts, motion rules, and accessibility commitments. |
| 🗺️ [`docs/INFORMATION_ARCHITECTURE.md`](docs/INFORMATION_ARCHITECTURE.md) | Full route map, navigation model per role, and sequence diagrams for the three key flows (booking, provider onboarding, disputes). |

## Viewing the prototype

No install required — it's a single self-contained HTML file:

```bash
open prototype/index.html        # macOS
start prototype/index.html       # Windows
```

Or serve it locally for a more realistic feel:

```bash
npx serve prototype
```

## Product snapshot

| | |
|---|---|
| **Primary market** | Nigeria (payment rails: Paystack, Flutterwave, mobile money) |
| **MVP categories** | Event & Party, AV Equipment, Tools & Construction, Real Estate & Spaces (4 of 11 total taxonomy categories — see PRD §14 for the phased rollout rationale) |
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
├── prototype/
│   └── index.html              interactive hi-fi mockup (renter flow + provider dashboard)
└── docs/
    ├── ARCHITECTURE.md
    ├── DATABASE_SCHEMA.md
    ├── API_DESIGN.md
    ├── DESIGN_SYSTEM.md
    └── INFORMATION_ARCHITECTURE.md
```

## Status

**Draft v1.0 — design & architecture phase.** Not yet implemented in code. Open questions tracked against the source PRD include final commission structure, Instant Book vs. Request-to-Book policy at launch, and the verification standard for providers (ID-only vs. business registration). See `docs/ARCHITECTURE.md` §9 for what is deliberately deferred past MVP.

---

*A Dynamic Technology Ltd. product.*
