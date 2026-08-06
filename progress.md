# Amantrika — Build Progress

Tracks the phase plan in `instruction.md`. Updated: 6 Aug 2026.

## ✅ Done

- [x] **Phase 0 — Project setup**: Next.js 15 (App Router, TS, Tailwind v4), framer-motion,
      lucide-react, folder structure, all 5 routes, git initialized.
- [x] **Phase 1 — Design tokens & foundation**: brand + semantic colors as CSS vars with
      per-theme `[data-theme]` overrides (`src/app/globals.css`), TS token files
      (`src/design-system/tokens/`), 12 motif SVG components, motion tokens + 8 Framer presets,
      ThemeProvider with `MotionConfig reducedMotion="user"`.
- [x] **Phase 2 — Component library** (`src/design-system/components/`): Button, fields
      (Input/Select/Textarea/Date/Time), Card (plain/ornate/envelope), Modal/Drawer/Tooltip/Toast,
      Tabs/Accordion/Badge/Avatar/Divider, diya Stepper, Table, Stat + Sparkline,
      ToggleGroup/Switch — plus Envelope, WaxSeal, CoupleMonogram, CountdownTimer,
      EventTimelineItem (.ics download), RSVPForm, BlessingsWall, PhotoFrame, MusicToggle,
      PetalRain, GiftBlock, MapEmbedPlaceholder.
- [x] **Phase 3 — /design-system docs site**: Introduction, Foundations (all tokens + motif
      gallery + motion replay demos), Components (live examples), Themes gallery, Patterns —
      with sidebar nav, wordmark header and global theme switcher.
- [x] **Phase 4 — Themes**: 8 themes (Royal Maroon, Haldi Sunshine, Peacock Raas, Temple South,
      Nikah Emerald, Mehndi Nights, Anand Karaj, Cathedral White) with distinct palettes, motif
      sets, petals, monogram rings, frames, greetings/scripts, event vocabulary, meal options.
      Region → tradition pre-filtering (chips, not walls). 3 demo couples in `src/data/couples.ts`.
- [x] **Phase 5 — Onboarding**: 6-step flow (side → region → theme gallery w/ preview modal →
      details w/ dynamic events → permalink w/ fake availability check → fake payment with
      PetalRain + WaxSeal success). Draft in `amantrika:draft`, publishes `amantrika:live-invite`.
- [x] **Phase 6 — Live invite** (`/invite/[slug]`): envelope opening sequence, all 9 sections
      (hero, countdown, story, events, family, gallery + lightbox, RSVP → localStorage,
      blessings wall, travel/venue) + footer with share row. Supports `?g=` and `?theme=`.
      Reduced motion skips to a simple fade.
- [x] **Phase 7 — Admin**: Overview (KPIs, sparkline, RSVPs-by-event bars, side donut, meals,
      activity feed merged with real localStorage RSVPs), Guests (40 mock rows, search/filters,
      personal-link copy, bulk WhatsApp toast, add-guest modal), Invite (permalink, live theme
      switcher, section toggles, phone-frame iframe preview), Settings (edit + danger zone reset).
- [x] **Phase 8 — Landing + polish**: landing page (auto-open envelope hero, theme strip,
      how-it-works, testimonials), dev-only 🎨 theme switcher, hex audit (tokens/themes only),
      ESLint + tsc clean, production build passes, screenshots reviewed.

## 🔜 Left / nice-to-haves

- [ ] Per-component `__demos__/*.demo.tsx` files (demos currently live inline in the
      `/design-system/components` page — split out if the docs need auto prop tables).
- [ ] Prop tables derived from TypeScript types on the components docs page.
- [ ] Real audio for MusicToggle; QR code rendering; more gallery lightbox polish.
- [ ] Loading skeletons wired into admin/invite (the `.skeleton` utility exists in globals.css).
- [ ] Visual pass over all 8 themes × 9 invite sections at 360px (spot-checked, not exhaustive).
- [ ] When adding a backend: keep localStorage shapes (`amantrika:draft`, `amantrika:live-invite`,
      `amantrika:rsvps`, `amantrika:blessings`) as API resource shapes.
