# Decisions that are yours

Per `CLAUDE.md` §8 — ask, don't guess. These change the plan materially. Each
has my recommendation; none is settled.

## 1. Is this a cost decision or an ownership decision?

If it is **cost**: Phases 0–4 save you roughly $19/month against Vercel Pro and
that is the whole story. Phase 5 saves nothing and costs weeks.

If it is **ownership** — one vendor, one bill, no surprise pricing changes,
skills you want to have — then the plan is the same but Phase 5 eventually
becomes non-optional, and it is worth deciding *now* that you will not build
new Supabase-shaped coupling in the meantime.

I have written the plan assuming **cost, with ownership as a nice-to-have.**
Tell me if that is backwards.

## 2. DNS — **ANSWERED 9 Aug 2026: stays on Vercel.**

The domain does not move. Phase 2 is cancelled, Route 53 is not used, and the
plan's only fixed monthly charge disappears with it.

Consequence to remember: SES verification, the ACM certificate validation and
the eventual CloudFront cutover all need DNS records created **in Vercel**, and
`imswarnil.com` is not in the `amantrika` Vercel account (`vercel domains ls`
under that scope returns zero). Those records are added by hand, or after
`vercel switch` to the account that holds the zone.

## 3. Which domain? — **ANSWERED 9 Aug 2026: `amantrika.imswarnil.com` for now.**

Stays as it is; the owner updates DNS records by hand when a phase needs them.

The immutability point still stands and is now a known, accepted cost: a
published slug carries its host name forever (`CLAUDE.md` §2.9), so any
invitation shared before a future domain move lives on
`amantrika.imswarnil.com` permanently. If a real apex domain is ever bought,
buy it *before* the first paid invitation goes out, not after.

## 4. SST/OpenNext, or Amplify Hosting?

- **SST v3** — config in the repo, full control of CloudFront/Lambda,
  reproducible, what I recommend and what the plan assumes.
- **Amplify Hosting** — connect the GitHub repo, it builds and serves Next.js
  SSR with almost no config. Faster to get going, less to learn, but the
  infrastructure is hidden and build minutes bill separately.

If Phase 4 stalls for more than a session, fall back to Amplify. Shipping beats
elegance.

## 5. How much do preview deployments matter to you?

The clearest thing you give up leaving Vercel. SST can do per-branch stages, but
you configure and pay for them, and they are slower. If you rely on preview URLs
for every change, that is an argument for staying on Vercel Pro and doing only
Phases 1–3.

## 6. Does the current Cloudinary setup actually bother you?

It holds theme gallery images, it is free at your volume, and the schema already
stores account-independent paths so switching later is cheap. Phase 3 is worth
doing for the **guest uploads** (moving off Supabase Storage, which sets up
Phase 5 whether or not you take it), less so for Cloudinary.

**Recommendation:** do Phase 3 for `event-assets`, and leave Cloudinary alone
until it costs money.

## 7. When do you want to take real payments?

`PAYMENT_PROVIDER=mock` today. The moment real money moves, Vercel Hobby's
non-commercial terms are being violated, which is the actual deadline on Phase
4. If that is months away, there is no rush. If it is weeks, Phase 4 moves ahead
of Phase 3.

---

## What I would do, in one line

Phase 0 this week, Phase 1 next, then stop and answer questions 3 and 7 —
because the answers decide whether Phase 4 is urgent or optional, and Phase 5
stays parked either way.
