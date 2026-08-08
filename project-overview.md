# Amantrika — Product Specification & Build Instructions

**Single source of truth.** This file defines what Amantrika is, what it does, how it is built, and in what order. A project skeleton already exists; this is not a scaffolding guide.

---

## How to use this file (instructions to the coding agent)

Before writing any code:

1. **Audit the existing repo.** Report framework version, installed packages, current route structure, whether Supabase is initialised, what's deployed. Tell me what already aligns with this spec and what conflicts.
2. **Generate `CLAUDE.md`** at the repo root from §3 (Operating rules) and §4 (Stack). This is what you read before every future task.
3. **Generate `docs/`** as a set of documents, not one file — `docs/architecture.md`, `docs/data-model.md`, `docs/content-schema.md`, `docs/i18n.md`, `docs/payments.md`, `docs/seo.md`, `docs/roadmap.md`. Expand from this spec into something a second developer could build from without asking me questions.
4. **Stop and show me those files.** Do not start Phase 1 until I have read them.

Then work one phase per session, fresh session each time, ending with a summary and a commit.

---

# PART I — THE PRODUCT

## 1. What Amantrika is

Amantrika is a SaaS product for **digital invitations to Indian celebrations**. A host — a couple, a family, or an approved partner acting for them — builds an invitation through a guided form, chooses a visual theme, pays, and receives a single shareable link. Guests open that link on their phone, read the invitation, RSVP, and find their way to the venue.

The product replaces the printed card, and it does things a printed card cannot: it updates when the venue changes, it collects RSVPs automatically, it shows a countdown, it gives directions, it holds the photo gallery afterwards, and it exists in whatever language each guest reads most comfortably.

**Phase 1 is dedicated to Hindu-tradition Indian weddings** — that is the market, the vocabulary, and the visual language the first themes are built for. The data model is deliberately general enough to expand into engagements, receptions, baby showers, birthdays, anniversaries, griha pravesh, mundan, and thread ceremonies without a schema migration. See §6.

**The three surfaces, one codebase:**

| Surface | Route group | Audience | Priority |
|---|---|---|---|
| Marketing site | `(marketing)` | Strangers who found you via Google | SEO and conversion |
| The app | `(app)`, `(partner)`, `(admin)` | Logged-in hosts, partners, you | Functional, boring, correct |
| The invitation | `i/[slug]` | 300 relatives on a 3G phone at a wedding hall | **Speed above everything** |

Previously these were three separate systems — `amantrika.com`, `invite.amantrika.com`, and a Node/MongoDB API at `server.amantrika.com`. They collapse into **one Next.js app, one Supabase project, one deployment.** If you ever find yourself proposing a second service, stop and re-read this paragraph.

---

## 2. Locked decisions

Do not reopen these mid-build.

| # | Decision | Why |
|---|---|---|
| 2.1 | One Next.js app, one Supabase project, one deployment | Two codebases on one data model means two places to sync forever |
| 2.2 | Canonical guest URL is `amantrika.com/i/{slug}`. `invite.amantrika.com/{slug}` 301s to it from the same deployment via hostname middleware | Existing links are circulating with real guests at real weddings. They must never 404 |
| 2.3 | The invitation is **data + theme**, not a layout. Content is structured JSONB; themes are React components that read it. No drag-and-drop, no canvas, no per-user CSS | Quality control, mobile editability, partner speed, and new themes without touching the builder |
| 2.4 | Theme switching is reversible at any time with zero content loss | Headline feature. Market it |
| 2.5 | The paywall is **server-side**. Watermarks are rendered into the HTML by the server | Client-side watermarks die to one dev-tools keystroke |
| 2.6 | Payment truth comes from the **webhook**, never the browser callback | The old app trusted the client. That is an exploitable revenue leak |
| 2.7 | Payments go through a **provider interface**. Phase 1 ships a mock provider; DodoPayments plugs in later without touching business logic | You are not ready to integrate a real processor, but the trust boundary must be built correctly from day one |
| 2.8 | Multiple invitations per user | The old single-invite `localStorage.inviteId` assumption is dropped. Partners require multiples |
| 2.9 | Multi-language is a **first-class part of the content model**, not a bolt-on | Retrofitting i18n into a saved-content schema means migrating every live invitation |
| 2.10 | Blog is **MDX in the repo**, not a database CMS | Content is versioned with the code, renders statically, and needs no admin UI |
| 2.11 | Every partial invitation is a real database row from the first keystroke | This is what makes abandoned-draft recovery possible, and it is a major revenue lever |
| 2.12 | Showcase requires **explicit opt-in consent** and shows a sanitised clone, never the live invitation | Publishing a family's photos, venue address, and phone numbers without asking is a privacy violation, not a growth hack |

---

## 3. Operating rules

These are the rules that go into `CLAUDE.md`.

1. **`/i/[slug]` is the product.** Server Component. Under 100KB gzipped client JS. Fast on Slow 4G. Every dependency added to that route needs justification. Never fetch its first-paint data client-side.
2. **The paywall is server-side**, driven by `invite.status`. Never a CSS overlay, never a `::after` on body, never a client-side check.
3. **Payment truth is the webhook.** The browser callback grants nothing and changes no database state. The webhook handler reads the raw body for signature verification — no body parser touches it first. Idempotent by provider payment ID.
4. **Prices are computed in `lib/pricing.ts` only.** Never trust a client-supplied amount. Never compute a price in a component.
5. **Never branch on a hardcoded theme ID.** Behaviour comes from `themes.capabilities`. Writing `themeId === '677441...'` is forbidden — add a capability flag instead. This was the single worst piece of debt in the previous codebase.
6. **Guests get no direct table grants.** Public reads go through `get_public_invite()`. Writes go through `submit_rsvp()` and `submit_wish()`. All `security definer`. Anon has SELECT on nothing.
7. **The service-role key never leaves Route Handlers and `scripts/`.** Never in a Client Component, never in a `NEXT_PUBLIC_` variable.
8. **`invites.content` is Zod-validated on every write** via `lib/schemas/invite-content.ts`. That file is the source of truth; the Postgres column is storage.
9. **A published slug is immutable.** It is on hundreds of WhatsApp messages.
10. **Every schema change is a migration file** from `supabase migration new`. Never edit the database through the dashboard. Never hand-write a migration timestamp.
11. **After any schema change:** regenerate `lib/database.types.ts` and run typecheck. A migration not reflected in the types is a migration that isn't finished.
12. **Never log or expose guest PII** — phone numbers, addresses — outside the owner's authenticated dashboard.

**Working style:** Run the CLIs yourself. Don't print commands for me to copy-paste unless they need a credential you can't access. Never run `supabase db reset` against anything but local. Never run destructive SQL against staging or production without asking explicitly in that message. Verify before claiming done — run the typecheck, run the tests, hit the route; "should work" is not done. Commit in logical units. Ask one question rather than generating forty files I have to unpick. When you hit an unspecified decision, make the smallest reversible choice and flag it in your summary.

---

## 4. Stack

Next.js (App Router) + TypeScript strict · Tailwind · Supabase (Postgres, Auth via `@supabase/ssr`, Storage, Realtime) · Zod · Resend · Vercel + Vercel Cron · Vitest + Playwright + pgTAP · MDX for the blog.

No Redux, no Zustand, no tRPC, no ORM over Supabase, no component library. Server Components and Server Actions are the default; `"use client"` is a deliberate exception that needs a reason.

**Environment:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-only
NEXT_PUBLIC_SITE_URL
PAYMENT_PROVIDER                   # 'mock' | 'dodo'
PAYMENT_WEBHOOK_SECRET             # server-only
DODO_API_KEY                       # server-only, Phase 5
DODO_WEBHOOK_SECRET                # server-only, Phase 5
RESEND_API_KEY                     # server-only
GOOGLE_MAPS_API_KEY                # builder only — never load the SDK on /i/[slug]
CRON_SECRET                        # guards /api/cron/*
TRANSLATION_API_KEY                # server-only, Phase 4
```

---

## 5. Directory structure

```
app/
  (marketing)/   /, /about, /blog, /blog/[slug], /showcase, /contact, /pricing, legal
  (auth)/        /signin, /signup, /forgot-password, /resume/[token]
  (app)/         /dashboard, /dashboard/invites/[id]/{edit,guests,rsvp,analytics,settings}
  (partner)/     /partner/apply, /partner/dashboard
  (admin)/       /admin/{invites,partners,showcase,submissions}
  i/[slug]/                  guest invitation, default language
  i/[slug]/[lang]/           guest invitation, translated
  api/payments/webhook/route.ts
  api/cron/{expire,nudge,archive-offer}/route.ts
  api/og/[slug]/route.tsx    dynamic Open Graph image
lib/
  supabase/{server,client,service}.ts
  schemas/invite-content.ts        Zod — source of truth
  pricing.ts                       the ONLY place a price is computed
  watermark.ts                     server-side watermark injection
  payments/{index,provider,mock,dodo}.ts
  i18n/{languages,resolve,merge}.ts
  seo/{jsonld,metadata}.ts
  analytics/track.ts
themes/<identifier>/index.tsx      one folder per theme
content/blog/*.mdx
components/{builder,ui,blocks}/
supabase/{migrations,seed.sql,tests}/
scripts/migrate/                   one-off Mongo → Postgres, not app code
docs/
```

---

# PART II — DOMAIN MODEL

## 6. Event types and the expansion path

Phase 1 ships weddings only. But the schema must not hardcode "bride" and "groom" into places that are expensive to change later, or you will be doing a full content migration the first time someone asks for a baby shower.

**The rule: `content.celebrants` is an array of roles, not two named fields.**

```ts
Celebrant = {
  role: 'bride' | 'groom' | 'child' | 'honoree' | 'host' | 'couple',
  name: LocalizedString,
  photo?: StoragePath,
  mother_name?, father_name?, native_place?, about?: LocalizedString,
  socials?: { instagram?, facebook?, x? },
}
```

A wedding has exactly two celebrants with roles `bride` and `groom`. The Phase 1 builder hardcodes that assumption in the **UI layer** — the form shows "Bride details" and "Groom details" — while the **storage layer** stays general. Themes read `celebrants` and may branch on role.

**Event type registry** (`lib/event-types.ts`), each entry declaring its celebrant roles, default blocks, default event names, and vocabulary:

| Key | Label | Celebrants | Ships |
|---|---|---|---|
| `wedding` | Wedding | bride + groom | Phase 1 |
| `engagement` | Engagement / Roka | bride + groom | Phase 6 |
| `reception` | Reception | couple | Phase 6 |
| `baby_shower` | Godh Bharai / Baby Shower | honoree | Phase 7 |
| `birthday` | Birthday | honoree | Phase 7 |
| `anniversary` | Anniversary | couple | Phase 7 |
| `griha_pravesh` | Griha Pravesh | host | Phase 7 |
| `mundan` | Mundan / Chudakarana | child | Phase 7 |
| `upanayana` | Thread Ceremony | child | Phase 7 |
| `corporate` | Corporate event | host | Later |

Adding an event type must require **no schema migration** — only a registry entry, default block set, and at least one theme declaring support for it in `capabilities.event_types`.

---

## 7. Data model

Postgres on Supabase. snake_case. UUID primary keys. Every table migrated from MongoDB carries `legacy_id text` until cutover is verified, then drops it.

```sql
profiles(
  id uuid pk references auth.users on delete cascade,
  first_name, last_name, email text unique, phone,
  role text default 'couple',          -- couple | partner | admin
  preferred_language text default 'en',
  marketing_opt_in boolean default false,
  legacy_id, created_at)

themes(
  id uuid pk, legacy_id text unique,
  name, identifier text unique, description,
  tier text default 'premium',         -- free | premium | luxury → drives price
  base_price_inr numeric(10,2),
  preview_images text[], sequence int,
  capabilities jsonb not null,         -- see §9
  is_active boolean default true, created_at)

invites(
  id uuid pk, legacy_id text unique,
  user_id uuid references profiles on delete cascade,
  partner_id uuid references partners,
  theme_id uuid references themes,
  slug text unique,
  status text default 'draft',         -- draft | preview | published | expired | archived
  event_type text default 'wedding',
  event_date date,
  timezone text default 'Asia/Kolkata',

  default_language text default 'en',
  enabled_languages text[] default '{en}',

  theme_config jsonb,                  -- {"palette":"blush","font_pair":"serif-classic"}
  content jsonb,                       -- ALL content in default_language, see §8
  rsvp_config jsonb,
  feature_flags jsonb default '{}',    -- see §10 — per-invite toggles
  permissions jsonb default '{}',      -- see §10 — host consent flags

  completion_score int default 0,      -- 0-100, drives nudges and the dashboard
  last_edited_at timestamptz,
  published_at, expires_at,
  is_showcased boolean default false,
  showcase_tags text[],
  created_at, updated_at)

invite_translations(
  id uuid pk,
  invite_id uuid references invites on delete cascade,
  lang text not null,                  -- 'hi','gu','mr','ta','te','kn','bn','pa','ml','or','ur'
  content jsonb not null,              -- partial override; deep-merged over base
  status text default 'draft',         -- draft | machine | reviewed | published
  translated_by text,                  -- 'machine' | 'user' | 'partner'
  created_at, updated_at,
  unique(invite_id, lang))

invite_events(
  id uuid pk, invite_id uuid references invites on delete cascade,
  name jsonb,                          -- localized
  starts_at timestamptz, ends_at timestamptz,
  venue jsonb, address jsonb,          -- localized
  latitude numeric, longitude numeric,
  maps_url text, vibe jsonb, dress_code jsonb, photo text,
  contact_name text, contact_phone text,
  rsvp_enabled boolean default true,
  sort_index int default 0)

invite_rsvps(
  id uuid pk, invite_id uuid references invites on delete cascade,
  guest_token_id uuid references invite_guest_tokens,   -- null for open links
  name, phone, email,
  attending boolean, guest_count int default 0,
  adults int, children int,
  date_of_arrival date, time_of_arrival text, arrival_venue text,
  attending_event_ids uuid[],
  meal_preference text, message text,
  lang text, ip_hash text,
  submitted_at timestamptz default now())

invite_guests(                         -- the host's own guest list
  id uuid pk, invite_id uuid references invites on delete cascade,
  display_name text,                   -- "The Sharma Family"
  phone, email, side text,             -- bride | groom | both
  group_label text, expected_count int default 1,
  notes text, created_at)

invite_guest_tokens(                   -- personalised share links
  id uuid pk, invite_id uuid, guest_id uuid references invite_guests on delete cascade,
  token text unique, lang text,
  first_opened_at timestamptz, open_count int default 0,
  responded_at timestamptz, created_at)

invite_views(                          -- live view analytics
  id bigserial pk, invite_id uuid references invites on delete cascade,
  guest_token_id uuid, session_hash text, lang text,
  referrer_kind text,                  -- whatsapp | direct | social | search | other
  device_kind text,                    -- mobile | tablet | desktop
  country text, duration_ms int,
  viewed_at timestamptz default now())

invite_wishes(                         -- guestbook
  id uuid pk, invite_id uuid references invites on delete cascade,
  name text, message text, photo text,
  status text default 'pending',       -- pending | approved | hidden
  ip_hash text, submitted_at timestamptz default now())

invite_nudges(                         -- abandoned-draft recovery ledger
  id uuid pk, invite_id uuid references invites on delete cascade,
  kind text,                           -- draft_1h | draft_24h | draft_72h | draft_7d
                                       -- | rsvp_reminder | archive_offer
  sent_at timestamptz default now(),
  unique(invite_id, kind))

orders(
  id uuid pk, invite_id uuid, user_id uuid references profiles,
  sku text,                            -- invite | language_pack | archive
                                       -- | custom_domain | partner_credit
  sku_meta jsonb,                      -- e.g. {"lang":"hi"} for a language pack
  theme_tier text,
  list_price_inr numeric(10,2), discount_inr numeric(10,2) default 0,
  discount_reason text, amount_inr numeric(10,2),
  currency text default 'INR',
  provider text,                       -- mock | dodo
  provider_order_id text unique, provider_payment_id text,
  status text default 'created',       -- created | paid | failed | refunded
  paid_at, created_at)

partners(
  id uuid pk, user_id uuid unique references profiles,
  business_name, business_type,        -- planner | printer | photographer | anchor
  city, phone, portfolio_url,
  status text default 'pending',       -- pending | approved | rejected | suspended
  commission_rate numeric(4,3) default 0.70,
  approved_at, approved_by, created_at)

contact_submissions(id, name, email, message, created_at, handled boolean default false)
newsletter_subscribers(id, name, email unique, created_at, unsubscribed_at)
```

**Indexes that matter:** `invites(slug)` unique, `invites(user_id, status)`, `invites(status, expires_at)` for the expiry cron, `invites(status, completion_score, last_edited_at)` for the nudge cron, `invite_views(invite_id, viewed_at desc)`, `invite_guest_tokens(token)` unique.

### 7.1 Row-Level Security

RLS enabled on `invites`, `invite_translations`, `invite_events`, `invite_rsvps`, `invite_guests`, `invite_guest_tokens`, `invite_wishes`, `invite_views`, `orders`, `partners`.

- **Owners:** full CRUD where `auth.uid() = user_id`
- **Partners:** read/write invites where `partner_id` matches their record **and** the partner is `approved`
- **Admins:** bypass via `is_admin()` checking `profiles.role`
- **Guests: zero direct grants.** Every public interaction goes through a `security definer` function:

```sql
get_public_invite(p_slug text, p_lang text default null) returns jsonb
-- The ONLY public read path. Returns invite + theme + events + wishes(approved)
-- + render_mode ('published' | 'watermarked') + resolved language + available_languages.
-- NEVER returns user_id, partner_id, orders, RSVP submissions, guest list, or view data.
-- Returns null for draft, and for archived-but-lapsed.

submit_rsvp(p_slug text, p_payload jsonb, p_token text default null) returns jsonb
-- Validates the invite is published, enforces required fields per rsvp_config,
-- rate-limits by hashed IP, marks the guest token responded if supplied.

submit_wish(p_slug text, p_payload jsonb) returns jsonb
-- Inserts with status='pending'. Rate-limited. Never auto-approves.

track_view(p_slug text, p_payload jsonb) returns void
-- Inserts an invite_views row. Fire-and-forget. Rate-limited per session hash.
```

---

## 8. The content schema

**This is the most important file in the codebase.** Everything reads from it. Changing it after launch means migrating every saved invitation. Write `lib/schemas/invite-content.ts` in Zod **before writing any SQL.**

```ts
type LocalizedString = string
// Stored as a plain string in the invite's default language.
// Translations live in invite_translations.content at the same JSON path.
// This keeps the base document readable and makes a language a billable row.

InviteContent = {
  presentation: 'save_the_date' | 'full',

  hero: {
    celebrants: Celebrant[],        // see §6
    hashtag?: string,
    tagline?: LocalizedString,
    banner_photo?: StoragePath,
    couple_photo?: StoragePath,
  },

  quote?:    { text?: LocalizedString, attribution?: string, photo?: StoragePath },
  venue:     { address: LocalizedString, latitude?, longitude?, phone?, maps_url?,
               landmark?: LocalizedString },
  hosts?:    { best_compliments_from?: LocalizedString,
               inviting_with_great_pleasure?: LocalizedString,
               warm_regards?: LocalizedString },
  story?:    { milestones: { title: LocalizedString, date?,
                             description: LocalizedString, photo? }[] },
  gallery?:  { photos: StoragePath[], caption?: LocalizedString },
  travel?:   { hotels: { name, address: LocalizedString, notes?: LocalizedString,
                         phone?, booking_code?, maps_url? }[],
               transport_notes?: LocalizedString },
  dress_code?: { note?: LocalizedString,
                 palettes: { event_id?, label: LocalizedString, colors: string[] }[] },
  faq?:      { items: { question: LocalizedString, answer: LocalizedString }[] },
  contacts?: { people: { name, role: LocalizedString, phone, whatsapp? }[] },
  gifts?:    { message?: LocalizedString, upi_id?, registry_url? },
  livestream?: { url?, platform?, starts_at?, note?: LocalizedString },

  block_order:    BlockKey[],
  enabled_blocks: BlockKey[],
}
```

**Rules:**

- Every optional block is genuinely optional. **A theme must render acceptably with only `hero`, `venue`, and one event.** Test this.
- Themes read `enabled_blocks` and `block_order`. If a theme's capabilities say it does not support a block, the builder greys that toggle out **with an explanation** rather than hiding it silently.
- **Image fields store a Supabase Storage path, never a full URL.** URLs are constructed at render time so the bucket can move.
- Proper nouns (names, hashtags, UPI IDs, booking codes, URLs) are **not** localized strings. Names get *transliteration* rather than translation — see §11.
- Provide `createEmptyContent(eventType, themeCapabilities)` producing a valid skeleton with sensible `block_order` for that event type.

---

# PART III — SYSTEMS

## 9. Themes and the capability model

A theme is a folder in `themes/` exporting:

```ts
export default function Theme(props: {
  content: InviteContent
  config: ThemeConfig           // palette, font pair
  events: InviteEvent[]
  renderMode: 'published' | 'watermarked'
  lang: string
  watermark: WatermarkKit       // server-generated, see §12
}): JSX.Element
```

Capabilities live in the `themes` table, **never in code**:

```json
{
  "event_types": ["wedding", "engagement"],
  "supports_banner_photo": true,
  "supports_couple_photo": false,
  "requires_individual_photos": true,
  "supported_blocks": ["hero","quote","venue","hosts","story","gallery",
                       "travel","dress_code","faq","contacts","gifts"],
  "supports_countdown": true,
  "supports_music": false,
  "scripts": ["latin", "devanagari", "gujarati", "tamil"],
  "rtl_capable": false,
  "palettes": ["blush","emerald","ivory","midnight"],
  "font_pairs": ["serif-classic","modern-sans","devanagari-classic"]
}
```

A theme must: render acceptably with minimal content · respect `enabled_blocks` and `block_order` · declare capabilities in its table row (inserted via migration, never a dashboard insert) · ship **zero client JS** unless it genuinely needs interactivity · declare which scripts it has fonts for.

**Adding a theme must require no changes to the builder.** If it does, the capability model is wrong — fix the model, don't special-case the theme.

---

## 10. Permissions and feature flags

Two separate JSONB columns on `invites`, because they answer different questions.

### 10.1 `permissions` — what the host has consented to

Every one of these is a checkbox in the builder's Settings block, **default off**, with plain-language copy explaining exactly what it means. No dark patterns, no pre-ticked boxes, no burying consent in Terms.

```json
{
  "showcase_consent": false,
  "showcase_anonymise": true,
  "allow_testimonial_request": false,
  "allow_guest_photo_upload": false,
  "allow_guestbook": true,
  "guestbook_auto_approve": false,
  "show_view_count_publicly": false,
  "allow_search_indexing": true,
  "share_rsvp_with_partner": false,
  "marketing_emails": false
}
```

**`showcase_consent` is the one you asked about.** The mechanics:

- Presented in the builder as: *"Can we feature your invitation in our public gallery? We'll create a copy with your address, phone numbers, and payment details removed. You can withdraw this at any time."*
- Setting it true only makes the invitation **eligible**. An admin still curates from `/admin/showcase`.
- On showcase, the system generates a **sanitised clone** — a separate invite row with `status='archived'`, a `showcase-` slug prefix, venue address reduced to city only, all phone numbers stripped, UPI ID and registry URLs removed, guest contacts removed, and (if `showcase_anonymise`) first names only.
- The showcase links to the clone. **Never to the couple's live invitation.**
- Withdrawing consent unpublishes the clone within one cron cycle and emails the host to confirm.
- Store an audit trail: who consented, when, from what IP, and what the consent text said at that moment.

### 10.2 `feature_flags` — what this invitation has switched on

```json
{
  "rsvp_enabled": true,
  "rsvp_deadline": "2026-02-01",
  "rsvp_per_event": true,
  "collect_meal_preference": false,
  "guestbook_enabled": true,
  "countdown_enabled": true,
  "music_enabled": false,
  "music_track": null,
  "livestream_enabled": false,
  "gallery_guest_uploads": false,
  "password_protected": false,
  "password_hash": null,
  "hide_from_search": false
}
```

Some flags are gated by tier or by a purchased add-on — the resolver in `lib/entitlements.ts` is the single place that answers "can this invitation use this feature," combining theme tier, purchased SKUs, and flag state. Never check entitlement inline in a component.

---

## 11. The language system

This is a differentiator and it needs to be built properly. India has more than twenty scheduled languages, and the grandmother who receives the invitation may not read English.

### 11.1 Supported languages

Ship: **English (en), Hindi (hi), Gujarati (gu), Marathi (mr), Tamil (ta), Telugu (te), Kannada (kn), Bengali (bn), Punjabi/Gurmukhi (pa), Malayalam (ml), Odia (or), Urdu (ur, RTL).**

`lib/i18n/languages.ts` declares for each: ISO code, native name, English name, script, text direction, font stack, and whether the UI (not just the invitation) is translated.

### 11.2 Storage model

The invitation's base `content` is stored in `invites.default_language`. Each additional language is a row in `invite_translations` holding a **partial content override**, deep-merged over the base at render time. Field-level fallback: an untranslated field falls back to the base language rather than rendering empty.

Why this shape rather than `{ en: "...", hi: "..." }` on every field: adding a language never rewrites the base document, the base stays readable and diffable, translation status is tracked per language, and a language is naturally a billable row.

### 11.3 URL and share mechanics — this is what you specified

- Default language renders at **`/i/{slug}`**.
- Other languages render at **`/i/{slug}/{lang}`** — e.g. `/i/ananya-weds-rohan/hi`.
- The language toggle on the invitation is a **navigation control**, not client-side state. Selecting Hindi navigates to `/i/{slug}/hi`. This means **the URL in the address bar always reflects the language being viewed, so copying the link or hitting the WhatsApp share button naturally shares that language version.** That was the requirement, and routing rather than state is what satisfies it cleanly.
- The share sheet says explicitly which language is being shared: *"Sharing the Hindi version"*, with a one-tap switch.
- Each language version is **separately cached and separately tagged** (`invite:{slug}:{lang}`).
- Every language version emits `<link rel="alternate" hreflang="...">` for every enabled language plus `x-default` pointing at the base.
- `lang` and `dir` attributes are set correctly on `<html>`. Urdu renders RTL.
- Guest tokens (§14) carry a language, so a personalised link to a Tamil-speaking relative opens in Tamil automatically.

### 11.4 Translation workflow

1. Host enables a language (purchases the add-on unless it is included in their tier).
2. System produces a **machine draft** for every localized field, marked `status='machine'`, with a visible banner in the builder: *"Machine-translated. Please review before publishing."*
3. Host edits in a **side-by-side view** — base language left, translation right, field by field, showing which fields are still untouched machine output.
4. Names get **transliteration, not translation.** "Ananya Sharma" becomes "अनन्या शर्मा", never a semantic translation. Offer a suggested transliteration the host can override, and always let them keep the Latin spelling.
5. Dates, times, and numbers are formatted with `Intl` using the target locale, not translated as strings.
6. A language cannot be published until the host marks it reviewed. Unreviewed languages are not offered in the guest toggle.

### 11.5 Fonts

Indic scripts need their own font files, and this is where the 100KB budget dies if you are careless. Self-host subsetted Noto Sans/Serif for each script. **Load only the script the current language needs** — a Tamil invitation must not download Devanagari. Themes declare supported scripts; if a host enables a language a theme has no font for, warn at enable time and offer a theme that supports it.

---

## 12. The paywall and the watermark

The single most important commercial mechanic. Implement exactly as described.

| Status | Who can see the URL | What renders | Indexable |
|---|---|---|---|
| `draft` | owner only, via dashboard | full invitation, no watermark | no |
| `preview` | anyone with the link | full invitation **with structural watermark** | no |
| `published` | anyone | clean invitation | yes |
| `expired` | anyone | graceful "this invitation has ended" page + archive CTA | no |
| `archived` | anyone | clean invitation, permanent | yes |

**The URL never changes across these transitions.** One slug, one link, shared once.

### What "structural watermark" means

Not an overlay div. Not a CSS `::after`. Not a background image on `body`. All three are deleted in one dev-tools keystroke. When `render_mode === 'watermarked'`, the **server**, per request:

1. **Interleaves watermark text nodes into the content flow** — between every section and inside long text blocks, as siblings participating in normal document flow. Removing one changes layout.
2. **Randomises class names per response** using a per-request nonce suffixed onto every watermark-related class. There is no stable selector to write a blocker against, and no removal script that survives a refresh.
3. **Applies a diagonal repeating SVG pattern inline as a background on each section element** — not one overlay. Removal means editing every section by hand.
4. **Serves `X-Robots-Tag: noindex`** and `<meta name="robots" content="noindex,nofollow">`.
5. **Omits `og:image` and rich preview metadata.** An unpaid link shared to WhatsApp looks plain and grey; a paid one gets a full rich card with the couple's photo. This is a real, felt incentive to pay, and it costs nothing to implement.

Be honest about the ceiling: a determined technical user can still save the page and hand-edit it. That is fine and expected. The goal is that removal costs more effort than paying, and that no non-technical couple or partner can do it casually or share a working recipe. That goal is achievable. "Literally unremovable" is not, and any approach promising it is selling you something.

`lib/watermark.ts` exports a `WatermarkKit` — nonce, class names, an `<Interleave />` component, and a section background style — that themes consume. Unit tests must assert: no stable class name across two calls; removing all elements matching any single selector leaves other watermarks intact.

---

## 13. Payments

### 13.1 Provider abstraction

You are not integrating a real processor yet, but the **trust boundary must be correct from day one** or you will rebuild the publish flow later. Build the interface now, ship a mock behind it.

```ts
// lib/payments/provider.ts
export interface PaymentProvider {
  readonly name: 'mock' | 'dodo'
  createCheckout(input: {
    order: Order; customer: { email: string; name: string }
    successUrl: string; cancelUrl: string
  }): Promise<{ providerOrderId: string; checkoutUrl?: string; clientPayload?: unknown }>

  verifyWebhook(rawBody: string, headers: Headers): Promise<
    | { valid: false }
    | { valid: true; event: 'payment.succeeded' | 'payment.failed' | 'refund.issued'
        providerOrderId: string; providerPaymentId: string
        amountMinor: number; currency: string }
  >

  getOrderStatus(providerOrderId: string): Promise<'created' | 'paid' | 'failed' | 'refunded'>
}
```

Selected by `PAYMENT_PROVIDER`. Business logic imports `getPaymentProvider()` and never a concrete class.

### 13.2 The mock provider (Phase 1–4)

- `createCheckout` returns a URL to an internal `/checkout/mock/[orderId]` page showing the real computed price and order summary, with **Simulate success** and **Simulate failure** buttons.
- Clicking a button does **not** write to the database directly. It POSTs a properly HMAC-signed payload to `/api/payments/webhook`, exactly as a real provider would. **The mock exercises the real webhook path.** This is the whole point — when you swap in DodoPayments, the only new code is signature verification and field mapping.
- The mock checkout page is hard-disabled when `NODE_ENV === 'production'` unless an explicit `ALLOW_MOCK_PAYMENTS` flag is set, and it renders a loud "TEST MODE — no money moves" banner.

### 13.3 The webhook — identical for both providers

```
POST /api/payments/webhook
  raw = await req.text()                    // NEVER let a parser touch it first
  result = provider.verifyWebhook(raw, req.headers)
  if (!result.valid) → 400, log, no DB write
  if (already processed providerPaymentId) → 200, no-op    // idempotent
  on payment.succeeded:
    orders.status = 'paid', paid_at = now()
    apply SKU effects (see below)
    revalidateTag(`invite:${slug}`) for every enabled language
    send confirmation email via Resend
```

**SKU effects:**
- `invite` → `status='published'`, `published_at=now()`, `expires_at = event_date + 30 days`
- `language_pack` → add `sku_meta.lang` to `invites.enabled_languages`
- `archive` → `status='archived'`, `expires_at = event_date + 10 years`
- `custom_domain` → provision, verify DNS, issue certificate
- `partner_credit` → increment the partner's balance

The browser success callback **only** navigates to `/dashboard/invites/[id]?paid=1`, which polls order status. It grants nothing and changes no state.

### 13.4 DodoPayments (Phase 5)

DodoPayments is a merchant-of-record platform, which means it handles GST and international tax remittance for you — relevant given your NRI customer base. **Verify the current API surface, webhook signature scheme, and supported payment methods against their live documentation before implementing;** treat any specifics I state here as needing confirmation.

Implementation is confined to `lib/payments/dodo.ts`. Everything else — pricing, orders, the webhook route, SKU effects — stays untouched. Migration is: implement the class, add the env vars, flip `PAYMENT_PROVIDER`, run the existing Playwright payment suite against a sandbox account.

Whichever provider: **UPI support is non-negotiable** for the Indian market. Confirm it before committing.

---

## 14. Pricing, add-ons, and entitlements

`lib/pricing.ts` is the only place a price is ever computed. The client displays what it returns and nothing else.

```ts
computePrice({ sku, sku_meta, theme_tier, event_date, purchased_at, partner_id? }) →
  { list_price_inr, discount_inr, discount_reason, final_price_inr, breakdown[] }
```

**Primary axis, theme tier:** Free ₹0 · Premium ₹999 · Luxury ₹2,499. *(Placeholders. The old app's ₹299/₹599/₹899 are also placeholders. Ship neither — price against Indian competitors before launch.)*

**Secondary axis, early-bird discount** on `days_until_event`:

| Lead time | Discount | Displayed as |
|---|---|---|
| 270+ days | 40% | "Early bird — you saved ₹X" |
| 180–269 | 25% | "Early bird — you saved ₹X" |
| 90–179 | 10% | "Booked early — you saved ₹X" |
| under 90 | 0% | full price, **no penalty language** |

Never surface this as a penalty. The under-90-day customer — who is the majority, because Indian couples confirm venue and date three to six months out — sees a normal price, not "you were late."

**Add-on SKUs:**

| SKU | Suggested | What it does |
|---|---|---|
| `language_pack` | ₹299 per language | Enables one additional language. First one may be free on Luxury |
| `archive` | ₹499 one-time | `expires_at` → event date + 10 years |
| `custom_domain` | ₹999/year | `aditi-and-rohan.com` points at the invitation |
| `guest_list_pro` | ₹399 | Personalised links, delivery tracking, broadcast |

**Save-the-date** makes early booking concretely worth something: purchased 120+ days out, the invitation publishes immediately showing names, date, hashtag, a photo, and a countdown, then upgrades in place to the full invitation when details firm up. Same URL. Implemented as `content.presentation`.

**Expiry and archive:** `expires_at = event_date + 30 days`, set at publish. A daily cron flips lapsed invitations to `expired`. At `event_date + 25 days` an automated email offers the archive SKU. **Sentimentality peaks here and hosting cost is near zero — this is the easiest margin in the product.** Build it in Phase 4, not "later."

---

## 15. Abandoned draft recovery

Every invitation is a real database row from the first keystroke. That is what makes this possible, and it is probably the highest-ROI system in this document — a meaningful share of people who start a builder never finish, and most of them would have paid.

**Completion score.** A recomputed `completion_score` (0–100) on every autosave, weighted by what actually matters: names and date 40, venue 20, at least one event 15, at least one photo 15, hosts and quote 10. Surfaced in the dashboard as a progress ring with a specific next action — *"Add your venue — 2 minutes"* — never a generic "incomplete."

**Resume links.** A single-use, 30-day `resume_token` in every nudge email routes to `/resume/[token]`, which signs the user in and drops them on the exact block they left. No password, no re-login friction. Invalidate on use, rotate on send.

**The nudge sequence,** run by `/api/cron/nudge` daily, ledgered in `invite_nudges` so nobody is ever double-emailed:

| When | Condition | Message |
|---|---|---|
| 1 hour | score < 30, no edit since | "Your invitation is waiting" + resume link |
| 24 hours | score 30–70 | "You're X% done" + the specific next field |
| 72 hours | score > 70, unpublished | **A rendered preview image of their actual invitation** + "Nearly there" |
| 7 days | any unpublished | Early-bird savings still available, with the real number |
| 30 days | untouched | Last email, plus a one-click unsubscribe |

That 72-hour email is the one that converts. Seeing their own names in a beautiful theme is worth more than any amount of copy.

**Capture email early.** The first builder step asks for email before anything else — framed as "so we can save your progress," which is true — so that abandonment is recoverable even from a session that never completed signup.

**Never nudge:** published invitations, invitations whose event date has passed, users who opted out, or more than the ledgered sequence. Every email has one-click unsubscribe. Respect it immediately.

---

## 16. Live view and analytics

You asked for hosts to see activity on the invitations they send. Two layers.

### 16.1 Aggregate analytics — everyone gets this

`track_view()` fires from the guest page as a fire-and-forget Server Action after paint, writing to `invite_views`. No third-party script ever loads on `/i/[slug]`.

The host's `/dashboard/invites/[id]/analytics` shows:

- **Total and unique views**, with a sparkline since publish
- **Views over time**, hourly for the first 48 hours after sharing, then daily
- **The share spike** — annotated so the host can see exactly what happened when they sent the WhatsApp broadcast
- **Referrer split** — WhatsApp / direct / social / search
- **Device split** — mobile / tablet / desktop
- **Language split** — which language versions are actually being opened, which tells them whether the add-on was worth it
- **Geography** — country and, where derivable, city. Coarse only
- **RSVP funnel** — views → RSVP form opened → RSVP submitted, with the conversion rate at each step
- **Peak concurrent viewers**

### 16.2 Live view — real-time

A **"Live now"** panel using Supabase Realtime broadcast: a presence channel per invitation, showing current concurrent viewers with a gentle pulse. When a host sends the invitation to 300 people and watches the counter climb, that is the moment they tell their friends about your product. It is a small feature with outsized word-of-mouth value.

Real-time RSVP toasts on the dashboard too — *"Kavita Joshi just RSVP'd — 2 guests"* — via a Postgres change subscription on `invite_rsvps`.

### 16.3 Per-guest tracking — the `guest_list_pro` add-on

With a guest list uploaded, each guest gets a personalised link carrying a token: `/i/{slug}?g={token}`, or `/i/{slug}/{lang}?g={token}`.

This unlocks:
- **Delivery tracking** — sent / opened / RSVP'd, per guest, in a table
- **Personalised greeting** — "Dear Sharma Family" rendered into the hero
- **Automatic language** — the token carries a language, so relatives get their own
- **Prefilled RSVP** — name and phone already filled
- **Targeted reminders** — nudge only the people who haven't responded
- **Plus-one rules** — cap `guest_count` per token

### 16.4 Privacy, non-negotiable

Hash IPs with a rotating salt; never store raw. Never show a guest's identity to another guest. Disclose view tracking plainly in the privacy policy and in the builder. Honour Do Not Track. Coarse geography only — country and city, never finer. `show_view_count_publicly` is off by default; guests see nothing unless the host opts in.

---

## 17. Guest experience

Everything on the guest side, in rough priority order.

**Phase 2 (ships with the renderer):** invitation itself · RSVP with per-event selection · add-to-calendar (ICS download plus Google Calendar deep link) · static map with a Google Maps deep link · countdown to the next event · WhatsApp share with a pre-filled message · language toggle · tap-to-call contacts · tap-to-navigate venue.

**Phase 6–7:** guestbook / wishes with host moderation · guest photo upload wall (opens after the event, host-moderated) · livestream embed for remote guests · dress code with visual colour swatches · FAQ accordion · travel and stay with booking codes · gift and blessing block with UPI deep link · seating and table lookup after RSVP · QR check-in at the venue · "add to home screen" PWA prompt.

**Offline capability is worth real attention.** Wedding halls have terrible signal and this is exactly when guests open the invitation. A service worker caching the last-rendered invitation means the venue address and the schedule are readable when the network is not. This is a genuine differentiator that costs a day.

---

## 18. Host tools

**Dashboard:** all invitations with status, event date, expiry, completion ring, view count, RSVP count.

**Guest list:** CSV import with column mapping · manual add · grouping by family · side tagging (bride/groom) · bulk personalised link generation · WhatsApp broadcast in batched deep links (respect WhatsApp's terms; do not build an unofficial automation) · delivery tracking · targeted reminders · plus-one caps.

**RSVP management:** live table with per-event columns driven by `rsvp_config` · confirmed head count with adults/children split · meal preferences · search and filter · CSV export · printable guest list PDF · RSVP deadline with automatic close.

**Content tools:** version history with undo · duplicate an invitation as a template · co-host access so both families can edit · a print-friendly PDF of the invitation · a QR code asset sized for printing on physical cards.

**Communications:** broadcast an update to everyone who RSVP'd yes ("venue entrance has moved") · automatic reminders at 7 days and 1 day before · thank-you message after the event.

---

## 19. Blog and SEO

Content is the cheapest customer acquisition available to you and the previous site left it almost entirely unexploited.

### 19.1 MDX setup

Posts live in `content/blog/*.mdx`. Frontmatter is Zod-validated at build — a malformed post fails the build rather than shipping broken structured data.

```yaml
---
title: "Step-by-Step Guide to Create Your Dream Invitation Website"
slug: "step-by-step-guide-to-create-wedding-website"
excerpt: "Learn how to create and send personalized online wedding invitations."
publishedAt: "2025-03-14"
updatedAt: "2026-01-08"
author: prachi-jain          # keys into content/authors.ts
category: "Guides"
tags: ["Invitation", "Wedding website", "Wedding Inspiration"]
coverImage: "/blog/invitation.png"
coverAlt: "A phone showing a digital wedding invitation"
readingTime: 6               # computed at build, not hand-written
featured: true
faq:                         # optional, drives FAQPage JSON-LD
  - q: "How long does it take to create a wedding website?"
    a: "About fifteen minutes if your photos are ready."
---
```

Custom MDX components available to posts: `<Callout>`, `<ThemePreview id="classic-elegance">`, `<CTA>`, `<Figure>`, `<Steps>`, `<FAQ>`, `<Comparison>`. Auto-generated table of contents from H2/H3, anchor links on headings, related posts by tag overlap, previous/next navigation, and a **create-your-invitation CTA** injected after the second H2 and again at the end.

### 19.2 JSON-LD — every schema, correct, on every page

Build `lib/seo/jsonld.ts` with a typed builder per schema type. Emit via `<script type="application/ld+json">` in the server-rendered head. **Validate every type against Google's Rich Results Test before considering the phase done.**

| Page | Schemas |
|---|---|
| All pages | `Organization` (logo, sameAs socials, contactPoint), `WebSite` with `SearchAction` |
| Blog post | `BlogPosting` (headline, image, datePublished, dateModified, author `Person`, publisher, `mainEntityOfPage`, wordCount, keywords), `BreadcrumbList`, `FAQPage` when frontmatter has FAQs |
| Blog index | `Blog` with `blogPost` array, `BreadcrumbList` |
| Pricing | `Product` with `Offer` per tier — price, priceCurrency INR, availability, `priceValidUntil` |
| Homepage | `WebSite`, `Organization`, `FAQPage` from the FAQ section |
| About | `AboutPage`, `Person` for the founder |
| Showcase | `CollectionPage`, `ItemList` of showcased invitations |
| Showcase item | `CreativeWork` — **never `Event`**, since these are samples, not real events people can attend |
| Guest invitation, published only | `Event` — name, startDate with timezone, location `Place` with `PostalAddress`, `eventAttendanceMode`, `organizer`. Suppressed entirely when watermarked or when `hide_from_search` is set |
| Contact | `ContactPage` |
| Legal | `WebPage` |

### 19.3 Technical SEO

`app/sitemap.ts` generating a dynamic sitemap covering marketing pages, blog posts, showcase items, and published non-hidden invitations · `app/robots.ts` disallowing `/dashboard`, `/admin`, `/partner`, `/api`, and `/checkout` · canonical URLs on every page · `hreflang` across all language versions of an invitation with `x-default` · RSS feed at `/blog/rss.xml` · dynamic OG images via `next/og` for blog posts and published invitations · semantic heading hierarchy with exactly one H1 · descriptive alt text required on every image (**enforce it in the builder** — an empty alt is an accessibility failure and an SEO one) · Core Web Vitals monitored in CI.

### 19.4 Content strategy for the agent to scaffold

Beyond migrating the three existing posts, scaffold the structure for a content programme targeting: "wedding invitation website India", "digital wedding invitation", "online shaadi card", "wedding website free India", per-language variants ("शादी का कार्ड ऑनलाइन"), and long-tail regional queries ("Gujarati wedding invitation online"). Create the category and tag taxonomy; leave the posts to be written.

### 19.5 Migrating existing content

From the old site, migrate verbatim: four legal pages, three blog posts (**preserve the existing typos as-is but list them in your summary so I can decide**), the About founder note, contact copy, brand constants.

**Restore** the written-but-never-rendered "Our Story" — the founder narrative about Prachi finding her mother's stored wedding cards — and "Why Choose Us". That founder story is the best copy on the entire site and it is currently invisible. Put it prominently on `/about`.

**Do not migrate:** `AboutSectionOne` / `AboutSectionTwo` (unmodified Next.js template Lorem Ipsum) · fabricated testimonials ("Musharof Chy, Founder @TailGrids") · template partner logos (Formbold, UIdeck, TailGrids) · the hardcoded ₹299 pricing block · `/blog-sidebar`. **Omit these sections entirely rather than recreating them with new fake data.** A homepage with no testimonial section beats one with invented testimonials.

**Fix on migration:** 301 `/what-is-invitation-website` → the step-by-step post · delivery policy heading says "Refund Eligibility" over delivery content, change to "How It Works" · the privacy policy component is named `TermsAndCondition`, rename it · footer must link Refund Policy (the page exists, the link was commented out) · contact form and newsletter must actually submit — they were dead markup.

---

## 20. Partners

Wedding planners, card printers, photographers, and anchors who build invitations for their own clients at wholesale and resell at whatever they like.

```
apply at /partner/apply → admin reviews at /admin/partners → approval email
→ partner builds at wholesale (list_price × commission_rate)
→ partner pays → invitation publishes
```

Partner dashboard: all their invitations with status, expiry, payment state · duplicate-as-template · bulk creation from CSV · white-label preview (their logo in the builder, never on the guest invitation unless a separate SKU) · commission and volume reporting.

**Same paywall, no exceptions.** A partner's unpaid invitation is watermarked identically. Ownership transfer lets a partner hand an invitation to the couple's own account so the couple manages RSVPs themselves.

Amantrika never sees the transaction between the partner and the couple.

---

## 21. Notifications

All transactional email through Resend, all templates as React Email components, all with plain-text fallbacks and one-click unsubscribe where legally required.

**To hosts:** welcome · email verification · password reset · draft nudges (§15) · payment confirmation with receipt · publish confirmation with the shareable link · first RSVP received · daily RSVP digest when volume is high · expiry warning at 7 days and 1 day · archive offer at event + 25 days · language pack ready for review.

**To guests:** RSVP confirmation (only if they gave an email) · event reminder at 7 days and 1 day · post-event thank you with the gallery link.

**To admin:** new partner application · contact form submission · payment failure · webhook signature failure (this one matters — it may mean an attack).

---

## 22. Non-functional requirements

**Performance:** `/i/[slug]` under 100KB gzipped client JS, enforced in CI with a failing build · LCP under 2.0s on Slow 4G · zero layout shift, space reserved for every image · fonts subsetted and self-hosted, only the needed script loaded · `next/image` with explicit sizes, `priority` on the hero only · **never load the Google Maps JS SDK on the guest page** (it is 300KB for a picture and a link — render a static map image and a deep link; load the interactive SDK only in the builder's location picker, and load it via the documented callback, not the old app's `setTimeout(1000)` hack).

**Security:** no auth state in `localStorage`, cookie sessions via `@supabase/ssr` · route protection in `middleware.ts` **and** RLS, two layers, the old app had zero · service-role key confined to Route Handlers and scripts · rate limiting on RSVP, wishes, contact, signup, slug checks, and view tracking · magic-byte validation on uploads, not extension trust · CSP headers · webhook signature verification with constant-time comparison.

**Accessibility:** WCAG 2.1 AA on the guest invitation · keyboard navigable · alt text enforced in the builder · `prefers-reduced-motion` respected · 4.5:1 contrast minimum in every palette, checked per theme.

**Testing:** Vitest for `lib/pricing.ts` (every lead-time boundary — 89/90/179/180/269/270), the content schema, the watermark injector, the translation merge, and the entitlement resolver · Playwright for build → pay → publish, guest views watermarked preview, guest submits RSVP, language toggle preserves URL, and abandoned draft resumes from a token · pgTAP for every RLS policy, asserting anon cannot read drafts, RSVPs, guest lists, or view data · a negative webhook test posting a forged signature and asserting nothing changes.

**CI/CD:** GitHub Actions running typecheck, lint, unit tests, build, and bundle-size check on every PR · Vercel preview per PR against a staging Supabase project · migrations applied via `supabase db push` in a deploy job, never by hand.

---

# PART IV — BUILD PLAN

## 23. Phases

One phase per session. Do not start a phase before the previous is deployed to staging and I have said go.

### Phase 1 — Foundation
Content Zod schema **first, before any SQL** · all migrations, one per logical unit · RLS policies · `get_public_invite`, `submit_rsvp`, `submit_wish`, `track_view` · `is_admin()` helper, `updated_at` trigger, profile-on-signup trigger · seed with 5 themes carrying real capability flags, 3 packages, 2 profiles, 2 realistic invitations (one published with 4 events and 3 RSVPs, one draft at 45% completion) · pgTAP suite · `supabase db reset` verifying clean replay · generated types.

**Argue with the content schema now if you're going to.** This is the moment, not three months in.

### Phase 2 — Guest renderer
`lib/watermark.ts` with tests · `/i/[slug]` and `/i/[slug]/[lang]` as Server Components, cached and tagged per language · status branching · `generateMetadata` with OG images and hreflang · `Event` JSON-LD for published only · **two themes** (`classic-elegance`, `indian-touch`) that are genuinely beautiful at 360px · RSVP Server Action with progressive enhancement · add-to-calendar · countdown · static map · `track_view` wired · bundle analyzer reporting actual gzipped size.

Show me both themes at 360px and 1440px before calling this done.

### Phase 3 — Auth, builder, drafts
Supabase Auth with cookie sessions, no localStorage anywhere · dashboard with completion rings · the builder as **a single edit surface with a block list, not a linear wizard** — left rail with toggles and drag-to-reorder, bottom sheet on mobile, sticky header with theme switcher and palette picker · declarative field config rendered by one generic component, `visibleWhen` reading `theme.capabilities`, **never a theme ID** · 800ms debounced autosave via Server Action, Zod-validated, quiet "Saved" indicator, no modals · image upload with `react-easy-crop`, WebP encoding, Storage RLS by user prefix, magic-byte check, 8MB cap · slug picker with live uniqueness, reserved blocklist, immutable once published · permissions and feature flags UI · completion scoring · resume tokens and `/resume/[token]` · the nudge cron and email sequence.

**Demonstrate theme switching preserves everything** — build on Classic Elegance, switch to Indian Touch, confirm nothing is lost and unsupported blocks grey out with an explanation.

### Phase 4 — Payments and publishing
`lib/pricing.ts` with exhaustive boundary tests · `lib/entitlements.ts` · the provider interface · the mock provider posting real signed webhooks · `/api/payments/webhook` with idempotency and SKU effects · checkout UI framing early-bird as savings, never as a late penalty · save-the-date presentation · expiry cron · archive offer cron and SKU · Playwright covering the happy path and a forged-signature negative test.

### Phase 5 — Marketing, content, migration
All marketing pages statically rendered · MDX blog with the full JSON-LD suite, sitemap, robots, RSS · contact and newsletter as real Server Actions · RSVP table with CSV export · WhatsApp share using the richer template from the old codebase's commented-out draft · **DodoPayments provider** replacing the mock · `scripts/migrate/` for Mongo → Postgres with a dry-run mode, preserving `legacy_id` and **preserving slugs exactly** (that is what keeps circulating guest links alive), forcing password reset for migrated users rather than importing bcrypt hashes.

Run the migration against staging only. Report row counts and five spot-checked invitations end-to-end. **Do not touch production** — tell me when staging is verified and I will decide on cutover. Keep the Atlas cluster as a cold read-only backup for 30 days minimum.

### Phase 6 — Languages, guests, showcase, partners
The full translation system — storage, machine draft, side-by-side review, transliteration for names, per-language routing and caching, hreflang, script-aware font loading · language pack SKU · guest list, personalised tokens, delivery tracking, broadcast · live view and the analytics dashboard · showcase with consent, sanitised clones, and admin curation · partners end to end · admin surfaces.

### Phase 7 — Expansion
Themes 3–5 (`modern-chic`, `eternal-grace`, `timeless-charm`) — **these must require zero builder changes; if they don't, the capability model is wrong and we fix the model** · additional event types from the §6 registry · guestbook · guest photo wall · livestream · custom domains · PWA and offline · co-host access · version history.

---

## 24. What we are not repeating from the old codebase

Auth in `localStorage` with client-side-only route guards · HTTP 200 on every response with a `status` field in the JSON body · trusting the browser's payment callback · `"use client"` on essentially every component · hardcoded theme IDs scattered through form components · `setTimeout(1000)` to sequence Google Maps loading · fabricated testimonials and template placeholder copy shipped to production · dead forms that render but submit nowhere · a duplicate blog route with broken Open Graph URLs.

---

## 25. Decisions still open — ask me, don't guess

1. **Real prices.** Every number here is a placeholder. Price against Indian competitors and against theme tier, not a race to the bottom.
2. **Brand.** Keep coral `#e35d5d` and the script wordmark, or refresh? A rebuild is the cheapest moment to change this and the most expensive moment to change it later.
3. **How free is free?** Watermarked-forever, or a clean single-page invitation? The second converts through word of mouth — guests see something nice and ask what it is. The first converts through the host's own embarrassment. I lean toward the second, but it changes what "free" means in the theme table, so it is a Phase 1 decision.
4. **Which languages ship first?** Hindi is obvious. The second — Gujarati, Marathi, Tamil, Telugu — should follow your actual customer geography, not a guess.
5. **Included languages per tier.** Is one additional language bundled into Luxury, or is every language an add-on? Affects the entitlement resolver.
6. **Machine translation provider.** Affects cost per language and the quality of the first draft. Needs a decision before Phase 6.
7. **Guest photo uploads.** Storage cost and moderation burden are both real. Worth it, or cut?
8. **Do you want a free tier at all in v1**, or is the funnel top a watermarked preview of a paid theme? Simpler, and arguably converts better.

---

## 26. Prompts I will reuse on you

**When something feels over-built:** "Is this the simplest thing that works, or are you adding a layer because it feels more architectural? Show me the two-file version first."

**After any phase:** "Summarise what changed, what you decided that wasn't specified, what you're uncertain about, and what you'd push back on in this spec now that you've built against it."

**When it drifts client-side:** "Audit every `use client` in the codebase. For each, tell me why it can't be a Server Component. Convert the ones that can be."

**Before any production database action:** "Show me the exact SQL and the exact CLI command, and what the rollback is. Don't run it until I say go."

**On the guest route specifically:** "Report the actual gzipped client JS for `/i/[slug]` right now, broken down by module. Anything above 100KB is a bug."