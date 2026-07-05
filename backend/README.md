# Rently API

NestJS modular monolith implementing the architecture in [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md). See that document for *why* it's structured this way — this README is just how to run it.

## Stack

TypeScript · NestJS 10 · TypeORM 0.3 (Postgres + PostGIS) · Redis · Passport/JWT · class-validator · Swagger · nestjs-pino

## Getting started

```bash
cp .env.example .env          # fill in real secrets before anything beyond local dev
docker compose up -d          # Postgres (with PostGIS) + Redis
npm install
npm run migration:run
npm run start:dev
```

API: `http://localhost:3000/api/v1`
Interactive API docs (Swagger, generated from the same decorators as the code — never hand-maintained separately): `http://localhost:3000/docs`

## Layered architecture, enforced by folder structure

```
src/
├── common/              Cross-cutting infrastructure every module depends on
│   ├── base/             BaseEntity, BaseRepository — shared persistence contract
│   ├── decorators/        @Public, @Roles, @CurrentUser, @CheckPolicies, @Idempotent
│   ├── errors/            ErrorCode enum + DomainException — the only exception Services throw
│   ├── filters/           AllExceptionsFilter — the one place an exception becomes an HTTP response
│   ├── guards/            JwtAuthGuard, RolesGuard, PoliciesGuard (registered globally, in this order)
│   ├── interceptors/      Logging, response envelope, idempotency replay
│   ├── middleware/        Request-id/correlation-id stamping
│   └── policies/          PolicyHandler interface — attribute-based authorization
├── config/               Typed configuration + Joi startup validation
├── database/             TypeORM DataSource, DatabaseModule, migrations/
└── modules/
    └── identity/         Auth, users, provider verification — see below
        ├── controllers/   HTTP only — routing, status codes, DTO binding
        ├── services/      All business logic
        ├── repositories/  All data access — Services never import TypeORM directly
        ├── entities/      TypeORM entities
        ├── dto/           class-validator request/response shapes
        ├── strategies/    Passport JWT strategy
        ├── policies/      Module-specific PolicyHandler implementations
        └── enums/
```

Every future module (`catalog`, `booking`, `payments`, `search`, `messaging`, `trust-safety`, `notifications`, `admin`) follows this exact internal shape. That consistency is deliberate — a developer who understands `identity/` can find their way around `booking/` without a tour.

## The rule that keeps modules independent

A module **never** imports another module's repository or entity directly. Cross-module reads happen through the other module's exported **service** (e.g., Booking calls `CatalogService.getListingPrice(id)`, not `ListingRepository.findOne(...)`). This is what makes the extraction path in `docs/ARCHITECTURE.md` §1 real — Search or Payments can be pulled into their own deployable without touching how other modules call them, because they were already talking through a service interface, not a shared database connection.

## What's implemented vs. scaffolded

| Module | Status |
|---|---|
| `identity` | Full: signup/login/refresh/logout, OTP verification, provider profile + verification queue, RBAC (`@Roles`) and an example ownership Policy (`@CheckPolicies`) |
| `catalog`, `booking`, `payments`, `search`, `messaging`, `trust-safety`, `notifications`, `admin` | Not yet implemented — see `docs/ARCHITECTURE.md` for their intended responsibilities. `catalog` and `booking` are next. |

## Testing

```bash
npm run test        # unit tests — Services and Policies, repositories mocked
npm run test:e2e     # e2e — full HTTP request through Nest's test app, against a real test database
npm run test:cov
```

See `docs/TESTING_STRATEGY.md` for what's expected at each layer.

## Migrations

Hand-authored, not `synchronize: true` — see `database.module.ts` for why. `migration:generate` diffs entities against the current schema when you need a starting point, but review and edit the generated SQL before committing it, especially for anything touching the `bookings` availability constraint.

```bash
npm run migration:generate -- src/database/migrations/DescriptiveName
npm run migration:run
npm run migration:revert
```
