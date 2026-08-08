# CLAUDE.md — read this before every task

Amantrika is a SaaS product for **digital invitations to Indian celebrations**. A host builds an
invitation through a guided form, picks a theme, pays, and gets one shareable link. Guests open it
on a phone, read it, RSVP, and find the venue.

**`project-overview.md` is the single source of truth for the product.** `plan.md` is the execution
order. This file is the operating contract: the rules you follow while writing code. When this file
and `project-overview.md` disagree on product intent, `project-overview.md` wins — and you fix this
file in the same commit.

---

## 1. The three surfaces

| Surface | Routes | Audience | Priority |
|---|---|---|---|
| Marketing site | `(marketing)` — `/`, `/about`, `/blog`, `/showcase`, `/pricing`, `/contact`, legal | Strangers from Google and from LLMs | SEO + LLM discoverability + conversion |
| The app | `(app)`, `(partner)`, `(admin)` | Logged-in hosts, partners, you | Functional, boring, correct |
| The invitation | `i/[slug]`, `i/[slug]/[lang]` | 300 relatives on a 3G phone in a wedding hall | **Speed above everything** |

One Next.js app, one Supabase project, one deployment. If you ever find yourself proposing a second
service, stop and re-read this line.

---

## 2. Operating rules — non-negotiable

1. **`/i/[slug]` is the product.** Server Component. Under 100KB gzipped client JS. Fast on Slow 4G.
   Every dependency added to that route needs justification. Never fetch its first-paint data
   client-side. Never load the Google Maps JS SDK there — static map image + deep link only.
2. **The paywall is server-side**, driven by `status`. Never a CSS overlay, never a `::after` on
   body, never a client-side check. See §12 of the spec for what "structural watermark" means.
3. **Payment truth is the webhook.** The browser callback grants nothing and changes no database
   state. The webhook handler reads the raw body before any parser touches it. Idempotent by
   provider payment ID.
4. **Prices are computed in `src/lib/pricing.ts` only.** Never trust a client-supplied amount.
   Never compute a price in a component.
5. **Never branch on a hardcoded theme ID.** Behaviour comes from theme *capabilities*. Writing
   `themeId === 'royal-maroon'` in app code is forbidden — add a capability flag instead. This was
   the single worst piece of debt in the previous codebase.
6. **Guests get no direct table grants.** Public reads go through `get_public_invite()`. Writes go
   through `submit_rsvp()` and `submit_wish()`. All `security definer`. Anon has SELECT on nothing.
7. **The service-role key never leaves Route Handlers and `scripts/`.** Never in a Client Component,
   never in a `NEXT_PUBLIC_` variable. Use `serviceRoleKey()` from `src/lib/env.ts`.
8. **Invitation content is Zod-validated on every write** via `src/lib/schemas/invite-content.ts`.
   That file is the source of truth; the Postgres JSONB column is storage.
9. **A published slug is immutable.** It is on hundreds of WhatsApp messages.
10. **Every schema change is a migration file** from `supabase migration new`. Never edit the
    database through the dashboard. Never hand-write a migration timestamp.
11. **After any schema change:** regenerate `src/lib/supabase/types.generated.ts` and run typecheck.
    A migration not reflected in the types is a migration that isn't finished.
12. **Never log or expose guest PII** — phone numbers, addresses — outside the owner's
    authenticated dashboard. Hash IPs with a rotating salt; never store raw.

---

## 3. SEO rules

Search is the cheapest acquisition channel this product has, and the previous site left it unused.

- Every marketing page is **statically rendered** with a unique `<title>` (≤60 chars) and
  `description` (≤155 chars), a canonical URL, and OG + Twitter card metadata.
- **Exactly one `<h1>` per page.** Semantic heading hierarchy, no skipped levels, no headings used
  for styling.
- **JSON-LD on every page**, built by typed builders in `src/lib/seo/jsonld.ts` — never hand-written
  string templates. Schema per page type is tabulated in `project-overview.md` §19.2. `Event` JSON-LD
  is emitted **only** for published, non-hidden invitations — never when watermarked.
- `app/sitemap.ts` covers marketing pages, blog posts, showcase items, and published non-hidden
  invitations. `app/robots.ts` disallows `/dashboard`, `/admin`, `/partner`, `/api`, `/checkout`,
  `/onboarding`, `/auth`.
- **hreflang on every language version** of an invitation, plus `x-default` pointing at the base
  language. `lang` and `dir` set correctly on `<html>`; Urdu renders RTL.
- Alt text is **required on every image and enforced in the builder**. An empty alt is both an
  accessibility failure and an SEO one.
- Dynamic OG images via `next/og` for blog posts and published invitations. Watermarked invitations
  emit **no** `og:image` — that is a deliberate paywall mechanic, not an oversight.
- Core Web Vitals are a build gate, not a dashboard: LCP under 2.0s on Slow 4G, zero layout shift,
  explicit dimensions on every image.
- Never index: drafts, watermarked previews, `hide_from_search` invitations, mock checkout.

## 4. LLM-friendliness rules

People increasingly find products by asking a model, and models read pages differently from crawlers.

- **Serve real HTML.** Content that only exists after hydration is invisible to most retrievers.
  Anything a person should be able to learn about Amantrika must be in the server-rendered body.
- **`/llms.txt`** at the root: what Amantrika is, who it's for, pricing, key URLs, and where the
  docs live — plain Markdown, kept in sync when pricing or positioning changes.
- **Every marketing and blog page has a `.md` twin** served as `text/markdown` (e.g.
  `/blog/foo` → `/blog/foo.md`), generated from the same source, so a model can retrieve clean text
  without parsing the layout.
- **Answer-shaped content.** Lead each section with the claim, not the wind-up. Use question
  headings for FAQ content and mirror them into `FAQPage` JSON-LD so both the crawler and the model
  see the same answer.
- **State facts explicitly, not visually.** "₹999" in a pricing table cell is fine; "₹999" implied
  only by a highlighted card is not. Prices, language lists, and feature availability get stated in
  prose or a real `<table>`.
- **Stable, descriptive anchors** on every H2/H3 so a model can cite a fragment.
- Do not block `GPTBot`, `ClaudeBot`, `PerplexityBot`, or similar in `robots.ts` on marketing
  routes. Private routes are already disallowed for everyone.
- The guest invitation route is exempt from all of this — it is a private link for 300 relatives,
  not a document for retrieval.

---

## 5. Stack

Next.js 15 App Router + TypeScript strict · Tailwind v4 · Supabase (Postgres, Auth via
`@supabase/ssr`, Storage, Realtime) · Zod v4 · framer-motion · lucide-react · Resend · Vercel +
Vercel Cron · Vitest + Playwright + pgTAP · MDX for the blog.

No Redux, no Zustand, no tRPC, no ORM over Supabase, no third-party component library — Amantrika
has its own design system (§6). Server Components and Server Actions are the default; `"use client"`
is a deliberate exception that needs a reason.

**Environment** (`.env.example` is the checked-in contract):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-only
NEXT_PUBLIC_SITE_URL
PAYMENT_PROVIDER                   # 'mock' | 'dodo'
PAYMENT_WEBHOOK_SECRET             # server-only
DODO_API_KEY / DODO_WEBHOOK_SECRET # server-only, Phase 5
RESEND_API_KEY                     # server-only
GOOGLE_MAPS_API_KEY                # builder only — never on /i/[slug]
CRON_SECRET                        # guards /api/cron/*
TRANSLATION_API_KEY                # server-only, Phase 6
```

---

## 6. Repo layout (as it actually is)

This repo uses a `src/` prefix. Wherever `project-overview.md` §5 writes `app/` or `lib/`, read
`src/app/` and `src/lib/`.

```
src/app/            route groups; see §1
src/design-system/  tokens, motifs, patterns, borders, 77+ documented components
src/themes/         theme registry (8 themes today)
src/lib/            supabase clients, env, schemas, pricing, seo, i18n, payments
src/data/           demo/seed fixtures — not production data
supabase/migrations/
content/blog/       MDX posts
docs/               architecture, data-model, content-schema, i18n, payments, seo, roadmap
```

**The design system is an asset, not scaffolding.** It has 8 themes, per-theme tokens (fonts,
borders, textures, opening animations, rhythm), 32 custom icons, 10 background patterns, and a live
docs site at `/design-system`. Build on it. Do not introduce a component library, and do not
rebuild a component that already exists there — check `/design-system/components` first.

---

## 7. Known divergences from the spec

The repo was built against an earlier spec (`instruction.md`) before `project-overview.md` existed.
These gaps are real and are sequenced in `plan.md` Phase 0. Do not paper over them silently.

| Spec says | Repo has today |
|---|---|
| `/i/[slug]` canonical guest URL | `/invite/[slug]` |
| `invites`, `invite_events`, `invite_rsvps` … | `events`, `sub_events`, `rsvps` |
| `partners` with commission | `agents` with commission |
| `content` JSONB validated by one Zod schema | typed columns + several loose JSONB fields |
| `get_public_invite()` / `submit_rsvp()` security-definer RPCs | direct RLS reads |
| Marketing site, blog, showcase, pricing | landing page only |
| Multi-language content model | single language |
| Payments behind a provider interface | fake payment step in onboarding |
| Server-side structural watermark | none |

---

## 8. Working style

Run the CLIs yourself. Don't print commands to copy-paste unless they need a credential you can't
access. Never run `supabase db reset` against anything but local. Never run destructive SQL against
staging or production without asking explicitly in that message.

**Verify before claiming done** — run the typecheck, run the tests, hit the route. "Should work" is
not done. Commit in logical units. Ask one question rather than generating forty files that have to
be unpicked. When you hit an unspecified decision, make the smallest reversible choice and flag it
in your summary. Work one phase per session; end with a summary and a commit.

Open product decisions live in `project-overview.md` §25 — **ask, do not guess**, especially on real
prices, whether a free tier exists, and which languages ship first.
