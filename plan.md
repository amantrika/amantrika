# plan.md — execution plan for Amantrika

`project-overview.md` says *what* to build. This file says *in what order*, *against what already
exists*, and *how we know each piece is done*. `CLAUDE.md` holds the rules that apply throughout.

Written 8 Aug 2026, against the repo at commit `5dadad2`.

---

## A. Where the repo actually stands

There is a real, substantial codebase here — but it was built against `instruction.md`, an earlier
and narrower spec. `project-overview.md` supersedes it. The honest summary:

**Built and worth keeping**
- Next.js 15 App Router, TypeScript strict, Tailwind v4, Vercel-ready.
- A genuinely large design system: tokens, 8 themes with per-theme fonts/borders/textures/opening
  animations, 32 custom wedding icons, 10 background patterns, 77+ documented components, and a
  live docs site at `/design-system`. **This is the single most valuable asset in the repo.**
- Supabase wired end to end: auth with cookie sessions via `@supabase/ssr`, RLS across the schema,
  route protection in `middleware.ts`, storage uploads, analytics RPCs, generated types.
- Working flows: signup/login, onboarding builder, `/invite/[slug]` renderer with 9 sections,
  dashboard, admin, agent referral.

**Built against the wrong shape (must change)**
- Guest URL is `/invite/[slug]`; the spec's canonical is `/i/[slug]`, and old `invite.amantrika.com`
  links are circulating with real guests.
- Schema names diverge: `events`/`sub_events`/`rsvps` vs `invites`/`invite_events`/`invite_rsvps`;
  `agents` vs `partners`.
- Content lives in typed columns plus loose JSONB, not one Zod-validated `content` document.
- Public reads go through RLS directly; the spec requires `security definer` RPCs with zero anon
  grants.
- Onboarding's payment step is a fake UI, not a provider interface with a signed webhook.

**Built since this plan was written (8 Aug 2026)**
The content layer: MDX blog with validated frontmatter, pagination, category and tag listings,
sidebar and table of contents, related posts, RSS; MDX content pages; the typed JSON-LD suite;
sitemap and robots; and the LLM surface (`/llms.txt`, `/llms-full.txt`, `.md` twins of every public
page). Seven posts and three content pages are live. See §B rows 45–51.

**Not built at all**
Showcase · pricing page · legal pages · server-side watermark and paywall ·
pricing engine and entitlements · real orders · multi-language content, routing, and fonts · guest
list and personalised tokens · nudge/expiry/archive crons · transactional email · the SEO suite
(JSON-LD, hreflang, OG images, RSS) · the LLM suite (`llms.txt`, markdown twins) · tests of any kind.

**Consequence:** this is not a green-field build of the 7 phases in `project-overview.md` §23. It is
a **reconciliation followed by those phases**, and Phase 0 below is the reconciliation.

---

## B. Section menu — every system in the spec, and where it lands

Read this as the index. Each row is a system named in `project-overview.md`, its spec section, its
status today, and the phase that delivers it.

### Product and rules

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 1 | What Amantrika is · three surfaces | §1 | app surface only | 0 |
| 2 | Locked decisions | §2 | partially honoured | 0 |
| 3 | Operating rules → `CLAUDE.md` | §3 | ✅ written | done |
| 4 | Stack | §4 | ✅ matches | done |
| 5 | Directory structure | §5 | `src/` prefix variant | 0 |
| 6 | `docs/` expansion | §How-to-use | missing | 0 |

### Domain model

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 7 | Event types registry · celebrants-as-roles | §6 | enum exists, no registry | 1 |
| 8 | Core tables · indexes | §7 | different names | 1 |
| 9 | RLS policies | §7.1 | exists, needs re-cut | 1 |
| 10 | `get_public_invite` / `submit_rsvp` / `submit_wish` / `track_view` | §7.1 | missing | 1 |
| 11 | **Content Zod schema — the most important file** | §8 | missing | 1 |
| 12 | Seed data · pgTAP · clean replay | §23 P1 | missing | 1 |

### Guest-facing

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 13 | `/i/[slug]` Server Component renderer | §17, §22 | client-heavy `/invite/[slug]` | 2 |
| 14 | Watermark kit · structural, per-request nonce | §12 | missing | 2 |
| 15 | Status branching (draft/preview/published/expired/archived) | §12 | draft/published only | 2 |
| 16 | RSVP with per-event selection, progressive enhancement | §17 | localStorage-ish | 2 |
| 17 | Calendar (ICS + Google), countdown, static map, WhatsApp share | §17 | partial | 2 |
| 18 | `track_view` wiring · no third-party script | §16.1 | `/api/track` route | 2 |
| 19 | Two themes beautiful at 360px | §23 P2 | 8 themes, unaudited | 2 |
| 20 | Guestbook · photo wall · livestream · dress code · FAQ · gifts · seating · QR · PWA/offline | §17 | components exist, unwired | 6–7 |

### Host-facing

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 21 | Auth, cookie sessions, no localStorage | §22 | ✅ done | done |
| 22 | Dashboard with completion rings | §18 | dashboard, no scoring | 3 |
| 23 | Builder as one edit surface with a block list (not a wizard) | §23 P3 | linear 6-step wizard | 3 |
| 24 | Declarative field config · `visibleWhen` off capabilities | §23 P3 | hardcoded steps | 3 |
| 25 | 800ms debounced autosave, Zod-validated | §23 P3 | localStorage draft | 3 |
| 26 | Image upload: crop, WebP, magic-byte, 8MB, RLS prefix | §23 P3 | basic upload | 3 |
| 27 | Slug picker: live uniqueness, blocklist, immutable when published | §23 P3 | fake check | 3 |
| 28 | Permissions + feature flags UI | §10 | missing | 3 |
| 29 | Completion score · resume tokens · `/resume/[token]` | §15 | missing | 3 |
| 30 | Nudge cron + email sequence | §15, §21 | missing | 4 |
| 31 | Guest list, CSV import, personalised tokens, broadcast, delivery tracking | §16.3, §18 | mock table | 6 |
| 32 | RSVP management, CSV export, printable PDF, deadline | §18 | mock table | 5 |
| 33 | Analytics dashboard + Realtime "Live now" | §16 | mock KPIs | 6 |
| 34 | Content tools: version history, duplicate, co-host, print PDF, QR | §18 | missing | 7 |

### Commerce

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 35 | `lib/pricing.ts` — the only price computation | §14 | missing | 4 |
| 36 | `lib/entitlements.ts` — the only entitlement answer | §10.2 | missing | 4 |
| 37 | Payment provider interface | §13.1 | missing | 4 |
| 38 | Mock provider posting real signed webhooks | §13.2 | fake UI step | 4 |
| 39 | Webhook: raw body, signature, idempotency, SKU effects | §13.3 | missing | 4 |
| 40 | Early-bird discount as savings, never a penalty | §14 | missing | 4 |
| 41 | Save-the-date presentation, upgrades in place | §14 | missing | 4 |
| 42 | Expiry cron · archive offer cron · archive SKU | §14 | missing | 4 |
| 43 | DodoPayments provider · UPI confirmed | §13.4 | missing | 5 |
| 44 | Partners: apply, approve, wholesale, ownership transfer | §20 | `agents` referral model | 6 |

### Content, SEO, LLM

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 45 | Marketing pages, statically rendered | §1, §19 | ✅ shell, about, how-it-works, contact | done |
| 46 | MDX blog, Zod-validated frontmatter, custom components, TOC, related posts, pagination | §19.1 | ✅ 7 posts live | done |
| 47 | JSON-LD builders, every schema, validated in Rich Results | §19.2 | ✅ built; **Rich Results check outstanding** | 5 |
| 48 | Sitemap · robots · canonicals · RSS · OG images | §19.3 | ✅ except OG images; hreflang waits on i18n | 5 |
| 49 | Content taxonomy + keyword scaffold (incl. per-language) | §19.4 | ✅ 5 categories, tags; per-language pending | 6 |
| 50 | Migrate old copy; restore "Our Story"; drop fake testimonials; fix the 6 known bugs | §19.5 | "Our Story" restored on `/about`; **legal pages not migrated** | 5 |
| 51 | **LLM discoverability: `llms.txt`, markdown twins, answer-shaped copy** | CLAUDE.md §4 | ✅ `/llms.txt`, `/llms-full.txt`, `.md` twins | done |
| 51a | Pricing page with real numbers | §14, §25.1 | missing — blocked on the pricing decision | 4 |
| 52 | Showcase: consent, sanitised clone, admin curation | §10.1 | missing | 6 |

### Languages

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 53 | 12 languages declared: code, native name, script, dir, font stack | §11.1 | missing | 6 |
| 54 | `invite_translations` partial-override + deep merge + field fallback | §11.2 | missing | 6 |
| 55 | `/i/{slug}/{lang}` routing, per-language cache tags, share-sheet language | §11.3 | missing | 6 |
| 56 | Machine draft → side-by-side review → publish gate | §11.4 | missing | 6 |
| 57 | Transliteration for names, `Intl` for dates/numbers | §11.4 | missing | 6 |
| 58 | Script-aware subsetted font loading | §11.5 | 8 fonts, all loaded | 2 (budget), 6 (full) |
| 59 | `language_pack` SKU | §14 | missing | 6 |

### Cross-cutting

| # | System | Spec | Today | Phase |
|---|---|---|---|---|
| 60 | Transactional email via Resend, React Email templates | §21 | missing | 4 |
| 61 | Performance budget enforced in CI (<100KB gz on `/i/[slug]`) | §22 | unmeasured | 2 |
| 62 | Security: rate limits, CSP, magic-byte, constant-time compare | §22 | partial | 3–4 |
| 63 | Accessibility: WCAG 2.1 AA, contrast per palette, reduced motion | §22 | motion ✅, rest unaudited | 2 |
| 64 | Testing: Vitest, Playwright, pgTAP, forged-webhook negative test | §22 | **none** | 1 onward |
| 65 | CI/CD: GitHub Actions, preview per PR, `db push` in deploy | §22 | missing | 1 |
| 66 | Mongo → Postgres migration, slugs preserved | §23 P5 | missing | 5 |
| 67 | Admin surfaces: invites, partners, showcase, submissions | §5 | one admin page | 6 |

---

## C. The phases

One phase per session. A phase is done when its exit criteria pass — not when the code is written.
Do not start a phase before the previous one is on staging and approved.

### Phase 0 — Reconciliation and docs *(no product features)*

The repo and the spec disagree. Settle it on paper before writing schema.

1. Write `docs/` as separate documents, expanded so a second developer could build without asking:
   `architecture.md`, `data-model.md`, `content-schema.md`, `i18n.md`, `payments.md`, `seo.md`
   (SEO **and** LLM), `roadmap.md`.
2. Decide and record the rename map: `events→invites`, `sub_events→invite_events`,
   `rsvps→invite_rsvps`, `agents→partners`, `/invite/[slug]→/i/[slug]`.
3. Decide the migration stance — **recommended: rewrite the schema cleanly** rather than renaming
   incrementally, since there is no production data yet. Confirm that assumption before Phase 1.
4. Keep `/invite/[slug]` as a permanent 301 to `/i/[slug]`, and add the hostname middleware that
   301s `invite.amantrika.com/{slug}` to `amantrika.com/i/{slug}`. Existing guest links must never
   404 (spec §2.2).
5. Map each of the 8 existing themes onto the `themes.capabilities` shape (§9). Any theme behaviour
   that can't be expressed as a capability flag is a bug in the capability model — fix the model.
6. Stand up CI now, empty: typecheck, lint, build. Tests get added to it from Phase 1.

**Exit:** docs reviewed by the user; rename map agreed; CI green on `main`.

### Phase 1 — Foundation

Content Zod schema **first, before any SQL** (`src/lib/schemas/invite-content.ts`) ·
`src/lib/event-types.ts` registry · migrations, one per logical unit · RLS · the four security-definer
RPCs · `is_admin()`, `updated_at` trigger, profile-on-signup trigger · seed: 5 themes with real
capability flags, 2 profiles, 2 realistic invitations (one published with 4 events and 3 RSVPs, one
draft at 45%) · pgTAP asserting anon can read no drafts, RSVPs, guest lists, or view data ·
`supabase db reset` replays clean · regenerate types.

**Argue with the content schema now if you're going to.** Changing it after launch means migrating
every saved invitation.

**Exit:** `supabase db reset` clean; pgTAP green in CI; types regenerated; typecheck passes.

### Phase 2 — Guest renderer

`src/lib/watermark.ts` with unit tests (no stable class across two calls; removing every element
matching any one selector leaves other watermarks intact) · `/i/[slug]` as a Server Component,
cached and tagged per language · status branching per §12 · `generateMetadata` with OG images and
hreflang · `Event` JSON-LD for published only · **two themes** (`classic-elegance`, `indian-touch`
— or the two closest existing themes) genuinely beautiful at 360px · RSVP Server Action with
progressive enhancement · add-to-calendar · countdown · static map · `track_view` · bundle analyzer
reporting the real gzipped number, wired as a failing CI gate.

This phase is where the existing `/invite/[slug]` client code gets converted, not ported. Every
`"use client"` that survives needs a stated reason.

**Exit:** both themes reviewed at 360px and 1440px; `/i/[slug]` under 100KB gz, enforced in CI; a
watermarked preview verifiably survives dev-tools deletion of any single selector.

### Phase 3 — Auth, builder, drafts

Dashboard with completion rings · the builder as **a single edit surface with a block list, not a
linear wizard** — left rail with toggles and drag-to-reorder, bottom sheet on mobile, sticky header
with theme switcher and palette picker · one generic field renderer driven by declarative config,
`visibleWhen` reading capabilities, never a theme ID · 800ms debounced autosave via Server Action,
Zod-validated, quiet "Saved", no modals · image upload with crop, WebP, Storage RLS by user prefix,
magic-byte check, 8MB cap, **alt text required** · slug picker with live uniqueness, reserved
blocklist, immutable once published · permissions and feature flags UI with plain-language copy,
default off, no pre-ticked boxes · completion scoring · resume tokens and `/resume/[token]`.

**Exit:** build on one theme, switch to another, nothing is lost, unsupported blocks grey out *with
an explanation*. Demonstrate it.

### Phase 4 — Payments, publishing, lifecycle email

`src/lib/pricing.ts` with exhaustive boundary tests (89/90/179/180/269/270 days) ·
`src/lib/entitlements.ts` · the provider interface · the mock provider POSTing real HMAC-signed
webhooks to the real handler · `/api/payments/webhook` with idempotency and SKU effects ·
checkout UI framing early-bird as savings, never as a late penalty · save-the-date presentation ·
expiry cron · archive-offer cron and SKU · Resend + React Email templates · the nudge sequence
ledgered in `invite_nudges`, including the 72-hour email with a rendered preview of their own
invitation · one-click unsubscribe honoured immediately.

**Exit:** Playwright covers build → pay → publish, and a forged-signature webhook that changes
nothing. Mock checkout is hard-disabled in production.

### Phase 5 — Marketing, content, SEO, LLM, migration

All marketing pages statically rendered · MDX blog with Zod-validated frontmatter, custom
components, auto TOC, related posts, injected CTAs · the full JSON-LD suite validated against
Google's Rich Results Test · sitemap, robots, canonicals, RSS, dynamic OG images · **`llms.txt` and
per-page markdown twins** · contact and newsletter as real Server Actions that actually submit ·
category/tag taxonomy and the keyword scaffold including per-language targets · migrate the old copy
verbatim, restore the "Our Story" founder narrative onto `/about`, omit the fake testimonials and
template logos entirely rather than replacing them with new fake data · fix the six known content
bugs (301 `/what-is-invitation-website`, the "Refund Eligibility" heading, the misnamed
`TermsAndCondition` component, the commented-out Refund Policy footer link, the dead contact form,
the dead newsletter form) · **DodoPayments** replacing the mock, with UPI confirmed ·
`scripts/migrate/` for Mongo → Postgres with a dry-run mode, preserving `legacy_id` and **preserving
slugs exactly**, forcing password reset rather than importing bcrypt hashes.

Run the migration against **staging only**. Report row counts and five spot-checked invitations end
to end. Do not touch production. Keep the Atlas cluster as a cold read-only backup for 30 days.

**Exit:** Rich Results Test clean on every page type; Lighthouse SEO 100 on marketing; `llms.txt`
and one markdown twin verified by fetching them; staging migration report delivered.

### Phase 6 — Languages, guests, analytics, showcase, partners

The full translation system — storage, machine draft, side-by-side review, transliteration for
names, per-language routing and cache tags, hreflang, script-aware font loading (a Tamil invitation
must not download Devanagari) · `language_pack` SKU · guest list, CSV import, personalised tokens,
delivery tracking, targeted reminders, plus-one caps · analytics dashboard and the Realtime "Live
now" panel · showcase with consent, sanitised clones, and admin curation · partners end to end,
including ownership transfer · admin surfaces.

**Exit:** a Hindi invitation shares as `/i/{slug}/hi` with correct hreflang and only Devanagari
fonts downloaded; a showcase clone provably contains no address, phone, or UPI.

### Phase 7 — Expansion

Themes 3–5 · additional event types from the §6 registry · guestbook · guest photo wall ·
livestream · custom domains · PWA and offline (a service worker caching the last-rendered
invitation — wedding halls have terrible signal, and that is exactly when guests open the link) ·
co-host access · version history.

**Exit:** the new themes and event types required **zero** builder changes. If they didn't, the
capability model is wrong and we fix the model, not the theme.

---

## D. Rules that apply in every phase

- Ship nothing to `/i/[slug]` without re-measuring the bundle.
- Every schema change: migration file → regenerate types → typecheck.
- Every new page: title, description, canonical, JSON-LD, one H1, and a markdown twin if it's public.
- Every new form: Server Action, Zod-validated, rate-limited.
- No fabricated content ever reaches production — no invented testimonials, no placeholder Lorem,
  no template partner logos. An empty section beats a fake one.
- End each session with a summary of what changed, what you decided that wasn't specified, what
  you're uncertain about, and what you'd push back on in the spec now that you've built against it.

---

## E. Decisions needed before Phase 1

These block real work and should not be guessed (spec §25):

1. **Is there production data to preserve?** Determines whether Phase 0 rewrites the schema or
   renames it incrementally. *Assumed no until told otherwise.*
2. **Real prices.** Every number in the spec is a placeholder. Pricing gates Phase 4.
3. **How free is free** — watermarked forever, or a clean single-page invitation? Gates the theme
   table in Phase 1.
4. **Is there a free tier in v1 at all**, or is the funnel top a watermarked preview of a paid theme?
5. **Which languages ship first** beyond Hindi, and are any bundled into a tier? Gates the
   entitlement resolver.
6. **Brand** — keep coral `#e35d5d` and the script wordmark, or refresh? This rebuild is the
   cheapest moment to change it.
7. **Machine translation provider.** Needed before Phase 6.
8. **Guest photo uploads** — storage cost and moderation burden are both real. In or out?
