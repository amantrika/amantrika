# How Amantrika is put together

A map of the codebase, and *why* each part sits where it does. Read this before
moving anything — several of these boundaries exist for a reason that is not
obvious from the file names.

---

## The one-paragraph version

A Next.js App Router project on Supabase. Postgres is the authority: every access
rule is a row-level-security policy, and the app is not trusted to enforce
anything on its own. The public site, a guest's invitation, and the signed-in
tools are three different audiences, so they get three different shells.

---

## Routes — `src/app/`

Route groups (the `(name)` folders) exist to give each **audience** its own
layout without appearing in the URL.

| Group | URL | Audience | Shell |
| --- | --- | --- | --- |
| `(marketing)/` | `/blog`, `/about`, `/showcase`, `/roadmap` | Anyone, including search engines | `SiteHeader` / `SiteFooter` |
| `(auth)/` | `/login`, `/signup` | Signing in | Centred card, no nav |
| `(app)/` | `/dashboard`, `/agent`, `/admin`, `/profile` | Signed-in members | `DashboardShell` |
| *(none)* | `/invite/[slug]` | **Wedding guests** | None — deliberately |
| *(none)* | `/checkout/...` | Someone paying | Minimal |

**`/invite/[slug]` has no chrome on purpose.** An invitation is the couple's
page. Wrapping it in our navigation would make it feel like ours, and a guest
opening it is not our user — they are the couple's guest.

`/` is the landing page and sits at the root rather than in `(marketing)` because
it needs its own composition, but it uses the same shared header and footer.

### Two routes that are not pages

- `api/track` — records an invite view.
- `api/badge-click` — records a "Made with Amantrika" tap.

Both are hit by `sendBeacon`, so they return fast and never throw: counting
something must never cost a guest their navigation.

---

## Library — `src/lib/`

| Folder | What it owns |
| --- | --- |
| `supabase/` | Three clients, and the database types |
| `auth.ts`, `roles.ts` | Session, and role helpers |
| `cache.ts` | Cached public reads (see the split below) |
| `invites/` | **The invitation domain** — view model, reads, samples, assets, entitlements, showcase |
| `features/` | Feature requests and voting |
| `payments/` | Payment providers behind one interface |
| `content/` | MDX loading and rendering |
| `seo/` | Metadata and JSON-LD builders |
| `posthog/` | Analytics: client, server, logs, event catalogue |
| `email/`, `ai/` | Transactional mail, AI features |

### The three Supabase clients — this distinction matters

| Client | Session | Use for |
| --- | --- | --- |
| `createClient()` | Yes, reads cookies | Anything scoped to the signed-in person |
| `createPublicClient()` | No | Public reads **inside `unstable_cache`** |
| `createAdminClient()` | Service role, **bypasses RLS** | Trusted server work only |

`createClient()` reads cookies, and Next forbids touching a dynamic source inside
`unstable_cache` — using it there makes every cached page 500. That is what
`createPublicClient()` is for, and why `cache.ts` never calls the other one.

### `invites/queries.ts` vs `cache.ts`

Not duplication. `cache.ts` holds reads that are **identical for every visitor**
(pricing, the showcase gallery) and shares one result across everyone.
`invites/queries.ts` holds reads scoped to a person. Caching a per-user read behind a
shared key is how one account ends up seeing another's data — so that boundary is
a safety rule, not an optimisation.

---

## Components — three homes, three purposes

| Location | Contains |
| --- | --- |
| `src/design-system/` | Reusable primitives, theme-aware, no product knowledge |
| `src/design-system/brand/` | The Amantrika logo — the one place brand identity is drawn |
| `src/components/site/` | Site chrome — header, footer |
| `src/components/invite/`, `roadmap/` | Feature-specific pieces |

`brand/` is the exception that proves the design-system rule: it *is* product
knowledge, but it sits here because everything else in the app consumes it and
nothing consumes it back. The mark takes `currentColor` and `--logo-accent`, so
it recolours with the theme like any other primitive rather than carrying its
own hexes. The copies in `public/brand/` and the favicon at `src/app/icon.svg`
are the same geometry for contexts that get no CSS cascade — a favicon slot, an
`<img>`, a partner's press kit — and have to be edited alongside it.

The rule: if it knows what an *invitation* is, it does not belong in
`design-system/`. If it could appear in any product, it does not belong in
`components/`.

Colocated files — `EventWorkspace.tsx` next to its `page.tsx` — are used by one
route and stay with it. Moving them to a shared folder would imply a reuse that
does not exist.

---

## Database — `supabase/migrations/`

Append-only and ordered. **Never renumber an applied migration.** If a new file
sorts before one already applied, rename it to a later timestamp rather than
forcing it in with `--include-all`.

`events` is the tenant object. A wedding's partners live in `events.hosts`
(jsonb) rather than in columns, so a birthday with one celebrant and a corporate
event with three hosts use the same table with a different `event_type`.

Access rules are RLS policies, not app code. Three roles — `host`, `agent`,
`admin` — and admin is additionally gated by an `admin_allowlist` table with a
trigger, so `role = 'admin'` is impossible for any other address regardless of
which path the write comes from.

After every migration:

```bash
supabase gen types typescript --linked > src/lib/supabase/types.generated.ts
```

`types.ts` imports the generated file and layers back the jsonb shapes that
generation cannot express. **Never edit `types.generated.ts` by hand.**

---

## Content — `content/`

Blog posts and pages are MDX in git, not database rows: a change is reviewable in
a diff, and prose belongs in version control. `content/pages/changelog.mdx` and
`roadmap.mdx` are ordinary content pages.

`/roadmap` is the one hybrid — a dedicated route renders the MDX *and* the live
feature-request board beneath it, because half the page is our plan and half is
everyone else's.

---

## Where the boundaries are

Three layers guard the same thing, deliberately:

1. **Middleware** — redirects signed-out visitors, hides the design system off localhost.
2. **Page guards** — `requireRole(...)` sends the wrong role somewhere useful.
3. **RLS** — the real boundary. A forged session still reads nothing.

Layers 1 and 2 are courtesy. Layer 3 is security. If they ever disagree, RLS wins
and that is correct.
