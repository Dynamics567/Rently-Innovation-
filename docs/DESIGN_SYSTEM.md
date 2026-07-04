# Rently — Design System

The bar is not "looks clean." It's: does a first-time user trust this enough to hand over their card, and does a provider trust it enough to hand over their inventory calendar? Every decision below is in service of that, not decoration for its own sake.

## Design principles

1. **Trust is a rendered element, not a value statement.** Verification badges, escrow messaging, provider response times, and review counts are placed at the *decision moment* (next to the price, not buried in an About page) — because trust signals only work if they're visible exactly when doubt would otherwise creep in.
2. **Reduce the decision, don't decorate it.** A renter comparing five tents shouldn't need to think about the UI. Cards surface exactly the five facts that drive a booking decision (price, rating, location, category, availability) — nothing else competes for attention.
3. **One primary action per screen.** Every view has exactly one high-emphasis button. If two things feel equally important, one of them is wrong.
4. **Motion explains state change, it doesn't perform.** Transitions exist to answer "what just happened" (a card became a detail page, a booking became a confirmation) — 200–350ms, always `ease-out`-family curves, never a bounce or a spring for functional UI.
5. **Accessible by default, not by audit.** Contrast, focus rings, and semantic markup are load-bearing parts of the component, not a WCAG pass applied afterward.

---

## Foundations

### Color

Rently's mark uses a confident blue with a teal accent — the palette extends that into a full functional system, not just a hero gradient.

| Token | Value | Use |
|---|---|---|
| `--blue` | `#155EEF` | Primary actions, links, focus state |
| `--blue-dark` | `#0B3FC4` | Hover/active state of primary |
| `--blue-soft` | `#EEF3FF` | Selected states, info backgrounds |
| `--teal` | `#00A896` | Secondary brand accent — verification, success-adjacent brand moments |
| `--teal-dark` | `#00786C` | Hover state of teal |
| `--navy` | `#0B1220` | Headings, hero backgrounds |
| `--ink` | `#101828` | Body text |
| `--gray-700 / 500 / 300 / 200 / 100 / 50` | `#344054 → #F9FAFB` | Text/border/surface scale, six steps — enough range to express hierarchy without inventing one-off grays per component |
| `--success` / `--success-soft` | `#12B76A` / `#ECFDF3` | Confirmed bookings, verified states |
| `--warning` / `--warning-soft` | `#F79009` / `#FFFAEB` | Pending approval, request-to-book |
| `--danger` | `#F04438` | Errors, destructive actions, disputes |

**Contrast commitment:** every text/background pairing in the system meets **WCAG 2.1 AA** (4.5:1 body text, 3:1 large text/UI components). `--gray-500` is the lightest gray permitted for body text; anything lighter is decorative only.

### Typography

| Role | Font | Notes |
|---|---|---|
| Display / Headings | **Plus Jakarta Sans** (600–800) | Geometric but warm — avoids the coldness of a pure grotesque while staying modern enough to sit next to Stripe/Linear-quality UI |
| Body / UI | **Inter** (400–700) | The industry-standard UI face for a reason: exceptional legibility at small sizes, huge language coverage for future localization (PRD §15.15) |

Type scale (8pt-adjacent, not arbitrary): `12 / 13 / 14.5 / 15.5 / 17 / 21 / 26 / 32 / 44px`. Line height 1.2 for headings, 1.55–1.7 for body — tight enough to feel designed, loose enough to read comfortably on mobile.

### Spacing & layout

Strict **8-point grid** (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`). No arbitrary padding values — this is what makes a page built by three different engineers still look like one product.

Content max-width: `1240px` container, `24px` gutters. Card grids collapse `3 → 2 → 1` columns at `980px` / `620px` breakpoints — mobile is the design target, not an afterthought resize.

### Radius & elevation

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 8px | Buttons, inputs, small chips |
| `--r-md` | 12px | Cards, panels |
| `--r-lg` | 20px | Hero surfaces, modals, booking widget |
| `--r-full` | 999px | Pills, avatars, tags |

Three-tier shadow scale (`sm/md/lg`) — soft, low-opacity, blue-neutral shadows (`rgba(16,24,40,...)`), never pure black. Elevation increases only on hover/focus, communicating interactivity, not just decoration.

---

## Components (contract, not just appearance)

### Buttons
- **Primary** (`--blue`): one per screen, the action that moves the user forward (Book, Pay, Publish Listing).
- **Teal**: reserved for provider-side/earn-adjacent actions — keeps a subtle semantic split between "spend" (blue) and "earn" (teal) flows.
- **Outline/Ghost**: secondary and tertiary actions.
- Every button defines **five states**: default, hover, active/pressed, focus-visible (2px blue ring, never removed), disabled (50% opacity + `cursor: not-allowed`). A button with only a hover state is an unfinished component.

### Cards (listing card)
Fixed anatomy, always in this order: category-colored media → favorite affordance → category label → title (max 2 lines, truncated) → location → price/unit + rating. This ordering is deliberate: category and price are the two facts a scanning user filters on first.

### Forms & inputs
- Label above field, always visible (no placeholder-as-label — it disappears exactly when the user needs it, on focus, which fails a core accessibility heuristic).
- Error state: red border + inline message below the field, not a toast that disappears before it's read.
- Success state (e.g., OTP verified): teal border + check icon, quiet, not a modal interruption.

### Empty / loading / error states
No blank screens, ever:
- **Empty** ("no results in this category yet"): explain why, offer the one next action (reset filters, browse all).
- **Loading**: skeleton shapes matching the real layout (card-shaped placeholders), not a generic spinner — reduces perceived wait and prevents layout shift when content arrives.
- **Error**: what happened, in plain language, plus a retry action. Never a raw error code or stack trace surfaced to a renter or provider.

### The booking widget (highest-stakes component in the product)
This is where trust and conversion are decided, so it gets the most explicit rules:
- Price is the largest, first thing seen.
- Instant Book vs. Request to Book is a **colored, labeled state** (`success` green vs. `warning` amber), never left implicit — a renter must never be surprised that their card was charged before approval.
- The price breakdown is always itemized (rental fee → service fee → deposit → total) and recalculates live as dates change — never a black-box total.
- The primary CTA label changes with mode ("Book Instantly" vs. "Request to Book") — the button describes what happens next, not a generic "Submit."

---

## Motion

| Interaction | Duration | Easing |
|---|---|---|
| View transition (page/route change) | 300–350ms | `cubic-bezier(.22,1,.36,1)` (ease-out, decelerate) |
| Hover elevation (card lift) | 200ms | ease-out |
| Button press feedback | 150ms | ease-out |

Rule: **nothing animates on load just to look alive.** Motion is reserved for direct responses to a user action or a genuine state change (booking confirmed, item favorited) — anything else is noise competing with the content.

---

## Accessibility commitments (not aspirations)

- All interactive elements reachable and operable by keyboard alone, including the full booking flow (date inputs, payment method selection, confirm).
- Icon-only buttons (favorite, message, notification) always carry an `aria-label` — an icon is not a label.
- Focus-visible outlines are never suppressed for aesthetic reasons.
- Color is never the *only* signal — status uses icon + color + text label together (e.g., "✓ Verified", not just a green dot).
- Form errors are announced to assistive tech via `aria-live`, not just visually styled.
- Target WCAG 2.1 AA platform-wide per PRD §10; AAA contrast on core conversion paths (search, booking, checkout) where feasible without compromising the palette.

---

## Dark mode readiness

Tokens are defined as semantic CSS custom properties (`--blue`, `--ink`, `--gray-*`) rather than hardcoded hex values inline — a dark theme is a second value set for the same token names, not a parallel component library. Not built for MVP, but the token architecture doesn't block it later (matches PRD's "architecture should allow future growth" principle applied to the design system, not just the backend).
