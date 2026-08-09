# The DynamoDB data model

Decided 9 Aug 2026, after the Free plan ruled out Aurora + Data API
(see `STATUS.md`). One table, `amantrika`, on-demand billing, two GSIs.

**Read this before writing any query.** In Postgres a wrong access pattern is a
slow query; here it is a table redesign. The keys below are the schema.

---

## Why one table

Every access pattern this product has is "fetch one thing and its children" —
an invitation and its sub-events, a partner and their commissions. That is
exactly what a shared partition key gives you in a single round trip. Seventeen
separate tables would mean seventeen round trips and no way to fetch a
consistent set.

The cost of this choice is real and worth stating: **there are no joins and no
`group by`.** Anything SQL did with an aggregate is now either a counter
maintained at write time or a scan you should not be running. See
"Analytics" below.

## Table

| | |
| --- | --- |
| Name | `amantrika` |
| Region | `ap-southeast-1` |
| Billing | `PAY_PER_REQUEST` — pay per read/write, **$0 when idle** |
| Keys | `PK` (hash), `SK` (range) |
| GSI1 | `GSI1PK` / `GSI1SK` — unique and public lookups |
| GSI2 | `GSI2PK` / `GSI2SK` — ownership and listings |
| TTL | attribute `expiresAt` (epoch seconds) — for ephemeral items only |
| Deletion protection | on |

## Item keys

Every item also carries a `_type` attribute for clarity when reading raw items.

| Entity | PK | SK |
| --- | --- | --- |
| Profile | `USER#<userId>` | `PROFILE` |
| Invitation (meta) | `EVENT#<eventId>` | `META` |
| Sub-event | `EVENT#<eventId>` | `SUBEVENT#<startsAt>#<id>` |
| RSVP | `EVENT#<eventId>` | `RSVP#<createdAt>#<id>` |
| Guest | `EVENT#<eventId>` | `GUEST#<id>` |
| Asset | `EVENT#<eventId>` | `ASSET#<id>` |
| Wish / blessing | `EVENT#<eventId>` | `WISH#<createdAt>#<id>` |
| Showcase consent | `EVENT#<eventId>` | `SHOWCASE` |
| Order | `EVENT#<eventId>` | `ORDER#<id>` |
| Payment event (idempotency) | `PAYMENT#<providerPaymentId>` | `EVENT#<providerEventId>` |
| Agent / partner | `AGENT#<agentId>` | `PROFILE` |
| Commission | `AGENT#<agentId>` | `COMMISSION#<createdAt>#<id>` |
| Feature request | `FEATURE#<id>` | `META` |
| Feature vote | `FEATURE#<id>` | `VOTE#<voterHash>` |
| Daily stats (per invite) | `STATS#<eventId>` | `DAY#<YYYY-MM-DD>` |
| Daily stats (global) | `STATS#GLOBAL` | `DAY#<YYYY-MM-DD>` |
| Theme catalogue entry | `THEME#<themeId>` | `META` |
| Admin allowlist entry | `ADMIN` | `EMAIL#<email>` |

**Sort keys embed a timestamp before the id** wherever the list is read in time
order. That is what makes "the ten most recent RSVPs" a `Query` with a limit
rather than a fetch-everything-and-sort.

## GSI1 — unique and public lookups

| Purpose | GSI1PK | GSI1SK |
| --- | --- | --- |
| **Invitation by slug** (the hot path) | `SLUG#<slug>` | `EVENT` |
| Profile by email | `EMAIL#<lowercased>` | `USER` |
| Published showcase list | `SHOWCASE` | `<publishedAt>` |

## GSI2 — ownership and listings

| Purpose | GSI2PK | GSI2SK |
| --- | --- | --- |
| A host's invitations | `USER#<ownerId>` | `EVENT#<createdAt>` |
| A partner's referred invitations | `AGENT#<agentId>` | `EVENT#<createdAt>` |
| Feature leaderboard | `FEATURE` | `VOTES#<votes padded to 6>#<id>` |

The leaderboard sort key is rewritten on every vote. That is deliberate: it
makes "top 20 by votes" a `Query … ScanIndexForward=false Limit=20` instead of
a scan, and votes are rare enough that the extra write is free.

## The hot path: `/i/[slug]`

Two round trips, both `Query`, both on partition keys:

```
1. GSI1  where GSI1PK = SLUG#<slug>            -> the invitation META item
2. Main  where PK = EVENT#<id>                 -> META + sub-events + assets
                                                  + wishes, in one call
```

Step 2 returns the children *and* the meta item together because they share a
partition. Filter by `SK` prefix client-side, or narrow with
`begins_with(SK, …)` when a page needs only one kind.

This is **fewer round trips than the Supabase version**, which is the one clear
win of the migration and the reason `/i/[slug]` should get faster, not slower.

## Authorization — the thing RLS used to do

**This is the most important section in this file.**

Supabase enforced ownership in the database: 55 RLS policies keyed on
`auth.uid()`. DynamoDB has no equivalent. There is no policy layer, no
`security definer`, and no way for the database to refuse a read.

**Authorization is now entirely the application's job**, and it lives in one
place: `src/lib/aws/repo/`. The rules:

1. **No route, action or component may build its own key or call the Dynamo
   client directly.** Everything goes through a repository function.
2. **Every repository function that touches owned data takes the acting user's
   id as its first argument** and verifies ownership before returning or
   writing. Not optional, not "the caller checks".
3. **Guest-facing reads go through the dedicated public functions** — the
   equivalent of the old `get_public_invite()` — which return only the fields a
   guest may see and refuse anything not `published`.
4. The Lambda's IAM role grants access to the table, not to rows. Losing rule 1
   means losing all access control at once.

If `CLAUDE.md` §2.6 said "guests get no direct table grants", the new phrasing
is: **guests reach data only through `repo/public.ts`.**

## Analytics — what got harder, honestly

SQL did this with `group by`. DynamoDB cannot. Counters are now maintained at
write time with atomic `ADD`:

```
UpdateItem  PK=STATS#<eventId>  SK=DAY#2026-08-09   ADD views 1
UpdateItem  PK=STATS#GLOBAL     SK=DAY#2026-08-09   ADD views 1
```

- "Views for this invite over 30 days" → `Query PK=STATS#<id>, SK between …`
- "Admin daily series" → `Query PK=STATS#GLOBAL, SK between …`
- Anything not anticipated here needs a new counter, added at write time —
  **it cannot be derived after the fact.** This is the real cost of leaving SQL,
  and it is why the counter list should be reviewed before launch rather than
  discovered afterwards.

## What moves out of the database entirely

`themes` (12 rows) and `atheme` (5 rows) are catalogue data that already exists
in code under `src/themes/` and `src/data/`. They are seeded into the table for
the few queries that read them, but **code remains the source of truth** — the
same rule as `CLAUDE.md` §2.5. `plans` (pricing) stays in `src/lib/pricing.ts`
where it already belongs, and is not a table at all.

## Not yet decided

- **Point-in-time recovery is OFF.** It costs ~$0.20/GB-month and the table is
  empty. **Turn it on before the first real customer** — this is a launch
  blocker, not a nice-to-have.
- No backup plan configured, for the same reason.
- Item-size limits (400KB) are far from binding today, but invitation `content`
  JSONB was unbounded in Postgres. The Zod schema should grow a size cap.
