# Amantrika — Claude Code Prompt Playbook

A phased set of prompts to build the Amantrika demo (UI only, no auth, no backend).
Run them **in order** — each phase builds on the previous one. Paste one phase at a
time into Claude Code, review the output, then move to the next.

**Stack assumed:** Next.js (App Router) + Tailwind CSS + Framer Motion + TypeScript.
If you prefer Vite + React, say so in Phase 0 and keep everything else identical.

---

## PHASE 0 — Project Setup

```
Create a new Next.js 14 project called "amantrika" with the App Router, TypeScript,
Tailwind CSS, and Framer Motion. Also install lucide-react for icons.

Project purpose: Amantrika is a digital wedding invitation platform where couples
create beautiful animated invitation websites (like amantrika.com/swarnil-weds-prachi)
that look and feel like a physical Indian wedding card being opened.

Rules for this entire project:
- UI ONLY. No authentication, no backend, no database. All data lives in local
  mock JSON files under /src/data. Payment is a fake flow that always "succeeds".
- All images are placeholders: use https://picsum.photos/seed/{seed}/{w}/{h} for
  photos and inline SVG for decorative motifs. Never hotlink real people's photos.
- Every page must be responsive down to 360px, respect prefers-reduced-motion,
  and have visible keyboard focus states.
- All colors, fonts, spacing, radii, and shadows MUST come from the design tokens
  we will define in Phase 1. Never hardcode a hex value in a component.

Routes to scaffold now (empty placeholder pages, we fill them later):
- /                       → marketing landing page
- /design-system          → living design system documentation
- /onboarding             → create-your-invite flow (multi-step)
- /admin                  → couple's admin panel (analytics + guests)
- /invite/[slug]          → the live invitation (e.g. /invite/swarnil-weds-prachi)

Set up the folder structure:
/src/design-system/tokens/     → token definitions
/src/design-system/components/ → reusable component library
/src/design-system/motifs/     → SVG decorative elements
/src/themes/                   → theme definitions (Phase 4)
/src/data/                     → mock data (couple, guests, analytics, themes)

Create the repo, run it, and confirm the dev server starts.
```

---

## PHASE 1 — Design Tokens & Foundation (the heart of Amantrika)

```
Build the Amantrika design system FOUNDATION. This is a design system for Indian
(and international) wedding invitations, so it must feel ceremonial, warm, ornate,
and celebratory — never like a SaaS dashboard.

Create /src/design-system/tokens/ with these token files, exported as both a
TypeScript object AND CSS custom properties on :root (and per-theme overrides
via a data-theme attribute):

1. colors.ts — Define the CORE brand palette plus SEMANTIC tokens:
   Brand (Amantrika product chrome, used on landing/admin/onboarding):
   - amantrika-maroon:  #6B1F2A   (deep wedding maroon — primary)
   - amantrika-gold:    #C9A227   (antique gold — accent, borders, dividers)
   - amantrika-ivory:   #FBF6EC   (ivory card-stock — surfaces)
   - amantrika-henna:   #8C4A2F   (henna brown — secondary)
   - amantrika-rani:    #D63A6A   (rani pink — highlights, celebration moments)
   - amantrika-peacock: #14595B   (peacock teal — cool contrast)
   - amantrika-ink:     #2B1B12   (warm near-black — text)
   Semantic mapping: --color-bg, --color-surface, --color-surface-raised,
   --color-text, --color-text-muted, --color-primary, --color-accent,
   --color-border-ornate, --color-success, --color-error, --color-overlay.
   Every theme in Phase 4 overrides ONLY the semantic tokens.

2. typography.ts — Three type roles, loaded via next/font:
   - Display: "Cormorant Garamond" (or "Playfair Display") — for couple names,
     headings, ceremonial text. Include an italic style for shayari/verses.
   - Devanagari/ornamental support: load "Tiro Devanagari Hindi" for Hindi text,
     "Amiri" for Urdu/Arabic (Nikah themes), and note fallbacks for Tamil/Bengali.
   - Body: "Mulish" or "Jost" — clean, warm, humanist for UI and paragraphs.
   Type scale (fluid with clamp()): display-xl (couple names, 56–96px),
   display-lg, heading-1..3, body-lg, body, caption, overline (letterspaced
   small-caps used for labels like "SAVE THE DATE").

3. spacing.ts — 4px base scale (4..96) plus semantic: card-padding,
   section-gap (generous, ceremonial breathing room), envelope-inset.

4. radii-shadows.ts —
   - Radii: sharp(0), soft(8), card(16), arch(a special top-arched radius token
     for Mughal/temple arch shapes: border-radius: 50% 50% 0 0 style utility),
     pill(999).
   - Shadows: card-resting, card-lifted, gold-glow (a soft #C9A227 glow used on
     hover for ornate elements), envelope-depth (inner shadow for envelope).

5. borders-ornaments.ts — This is what makes it INDIAN. Define:
   - ornate-border: a reusable double-line border with gold gradient
   - motif tokens referencing SVGs in /motifs: paisley, mango-leaf (kairi),
     marigold, diya, kalash, peacock-feather, mehndi-corner, jaali-pattern
     (Islamic lattice), crescent-star, church-arch, floral-cross, olive-branch.
   Build each as a small inline React SVG component that inherits currentColor
   so themes can recolor them.

6. motion.ts — Animation tokens:
   - durations: instant(100ms), quick(200ms), ceremonial(600ms), grand(1200ms)
   - easings: ease-silk (cubic-bezier(0.22,1,0.36,1)), ease-bounce-soft
   - Named animation presets used across the app: envelope-open, card-slide-out,
     seal-break, curtain-reveal, petal-fall, diya-flicker, shimmer-gold,
     fade-up-stagger. Implement each as a Framer Motion variant object in
     /src/design-system/motion/presets.ts. All presets must no-op under
     prefers-reduced-motion.

Also create a ThemeProvider that sets data-theme + data-mood on <html> and swaps
the semantic CSS variables. Default theme: "royal-maroon".

Deliverable check: a /design-system/tokens test page that renders every color
swatch, the full type scale, spacing ruler, radii, shadows, all motif SVGs, and
a button that fires each motion preset.
```

---

## PHASE 2 — Reusable Component Library

```
Using ONLY the Phase 1 tokens, build the Amantrika component library in
/src/design-system/components/. Every component: typed props, sensible defaults,
keyboard accessible, and a JSDoc block describing usage (the /design-system docs
page will read these).

CORE UI (product chrome — used in onboarding/admin/landing):
- Button: variants primary (maroon w/ gold border on hover), secondary (outline
  gold), ghost, celebration (rani pink with shimmer-gold on hover); sizes sm/md/lg;
  loading state with a slow gold spinner.
- Input, Select, Textarea, DatePicker (simple), TimePicker — with ornate focus
  ring (thin gold double line, not a default blue ring).
- Card: variants plain, ornate (uses ornate-border + mehndi-corner motifs on
  corners), envelope (looks like paper with envelope-depth shadow).
- Modal / Drawer / Tooltip / Toast (toast slides in with petal-fall accent).
- Tabs, Accordion, Badge, Avatar (with gold ring), Divider (variant "motif":
  a gold line with a paisley or diya centered).
- Stepper (for onboarding): steps rendered as diyas that "light up" when complete.
- Table (for guest lists): zebra rows in ivory tones, sticky header.
- Stat / KPI card (for analytics): big display number, small overline label,
  delta arrow, optional sparkline (inline SVG, no chart lib).
- ToggleGroup and Switch: the Switch handle is a tiny gold bead.

WEDDING-SPECIFIC components (the signature set):
- Envelope: an interactive envelope. Closed state shows the guest name in
  Display italic and a WaxSeal. On click/tap: seal-break animation, flap opens
  (3D rotateX), card slides out (card-slide-out preset). Props: sealMonogram,
  paperTexture, onOpened.
- WaxSeal: circular seal with couple monogram initials, pressed-wax look via
  radial gradients, "crack" animation on break.
- CoupleMonogram: generates an SVG monogram from two initials with a decorative
  ring (theme-aware: paisley ring / jaali ring / floral ring).
- CountdownTimer: days:hours:mins:secs in Display face with gold separators.
- EventTimelineItem: icon (haldi/mehndi/sangeet/pheras/nikah/reception/mass),
  event name, date, time, venue, "Add to calendar" button (generates .ics blob
  client-side), "Get directions" link.
- RSVPForm: attending yes/no/maybe (as three ornate radio cards), guest count
  stepper, per-event attendance checkboxes, meal preference (veg / Jain /
  non-veg / halal — options come from the active theme), message textarea,
  submit shows a confetti-of-petals success state. Stores to localStorage only.
- BlessingsWall: masonry of guest wishes (mock data), each on a small ivory card
  with a tiny marigold.
- PhotoFrame: variants arch (Mughal arch mask), scallop, circle, polaroid;
  wraps picsum images; gentle 3deg tilt-on-hover.
- MusicToggle: floating shehnai/mute button, pulses subtly when "playing".
- PetalRain: ambient falling marigold petals (canvas or absolutely-positioned
  SVGs), density prop, auto-disabled on reduced motion; theme swaps petal type
  (marigold / rose / jasmine / snow-confetti for Christian winter mood).
- GiftBlock: UPI/registry placeholder with a tasteful "Your blessings are our
  greatest gift" copy option.
- MapEmbedPlaceholder: a stylized static map illustration card with a pin
  (no real map SDK), venue name + address.

Every component gets a stories-style demo file /src/design-system/components/
__demos__/<Component>.demo.tsx exporting 2–4 usage examples with titles and
descriptions — the /design-system docs page will import and render these.
```

---

## PHASE 3 — /design-system Documentation Site

```
Build the living documentation at /design-system. This is Amantrika's public
design system site — it must itself follow the design system and feel like an
Indian wedding (ivory paper background, gold rules, ornate section dividers),
not like Storybook.

Layout: left sidebar navigation + content area. Sidebar sections:

1. Introduction — what Amantrika DS is, principles ("Ceremonial, not corporate",
   "Ornament with restraint", "Every culture, first-class"), and a hero showing
   the Envelope component mid-open.
2. Foundations
   - Colors: brand + semantic swatches, each with name, hex, CSS var, and a
     live theme switcher at the top of the page that re-renders all swatches
     per theme so people SEE how semantic tokens flip.
   - Typography: full scale rendered with real wedding copy ("Swarnil weds
     Prachi", a Hindi line, an Urdu line, a verse), font pairing rationale.
   - Spacing, Radii & Shadows: visual rulers and stacked examples.
   - Motifs & Ornaments: gallery of all SVG motifs, click to copy import.
   - Motion: each animation preset with a "Replay" button and duration/easing
     table. Include the envelope-open and seal-break demos here.
3. Components — one page per component, auto-rendered from the __demos__ files:
   live example, prop table (derive from TypeScript types), do/don't notes.
4. Themes — gallery grid of every theme from Phase 4: preview card, palette
   strip, mood tags, religion/region tags, and a "Preview invite" link that
   opens /invite/demo?theme=<id>.
5. Patterns — composed patterns: "Invite hero", "Events timeline", "RSVP
   section", "Admin stat row", each shown assembled from components.

Add a global header on this site with the Amantrika wordmark (Display face,
gold underline flourish SVG) and the theme switcher.
```

---

## PHASE 4 — Themes (multi-religion, multi-region, multi-mood)

```
Create the theme system in /src/themes/. A Theme is a typed object:

{
  id, name, religionTag, regionTag, moodTag,        // e.g. "hindu-royal"
  semanticColorOverrides,                            // flips CSS vars
  motifSet,          // which SVG motifs this theme uses (corners, dividers)
  petalType,         // marigold | rose | jasmine | confetti | none
  monogramRing,      // paisley | jaali | floral | laurel
  frameStyle,        // arch | scallop | circle | polaroid
  greetingCopy,      // e.g. "|| Shubh Vivah ||", "Bismillah...", "Together with their families"
  eventVocabulary,   // haldi/mehndi/sangeet/pheras vs mehndi/baraat/nikah/valima vs ceremony/reception
  mealOptions,       // veg/jain/non-veg vs halal options vs standard/vegetarian
  typographyOverrides // e.g. Amiri for Urdu accents in Nikah themes
}

Build AT LEAST these 8 themes (each with a distinct palette — do not just
recolor one theme):

HINDU / INDIA:
1. "Royal Maroon"    — maroon + antique gold, kalash & paisley, grand mood
2. "Haldi Sunshine"  — turmeric yellow + marigold orange, playful mood
3. "Peacock Raas"    — peacock teal + rani pink, Gujarati/garba energy
4. "Temple South"    — ivory + deep green + gold, temple arch frames,
                       jasmine petals, Tamil greeting line

MUSLIM / PAKISTAN & MIDDLE EAST (auto-suggested when region = Pakistan, UAE...):
5. "Nikah Emerald"   — emerald + gold, jaali lattice motifs, crescent-star,
                       Amiri typographic accents, events: Mehndi/Baraat/Nikah/
                       Valima, halal meal options, "Bismillah" greeting
6. "Mehndi Nights"   — deep plum + silver, festive Pakistani mehndi mood

SIKH:
7. "Anand Karaj"     — saffron + navy + gold, khanda-inspired geometric motif,
                       events: Kirtan/Anand Karaj/Langar/Reception

CHRISTIAN / INTERNATIONAL (auto-suggested when region is outside South Asia):
8. "Cathedral White" — white + sage + champagne gold, church-arch frames,
                       laurel/olive motifs, events: Ceremony/Cocktail/Reception,
                       serif-forward minimal elegance, confetti instead of petals

Each theme must define styling for ALL NINE invite sections (see Phase 6 list)
so nothing falls back to defaults.

Region/religion toggle logic (UI only): in onboarding, a Country select +
"Wedding tradition" select (Hindu / Muslim / Sikh / Christian / Interfaith /
Other). Selecting Pakistan pre-filters to Muslim themes; selecting a Western
country pre-filters to Christian/International themes; India shows all — but
the user can ALWAYS browse every theme regardless of region (filter chips, not
walls). The /design-system Themes page and the invite page both react to theme
switching live.

Add mock data: /src/data/themes.ts exporting all themes, and 3 demo couples
(one Hindu, one Muslim-Pakistan, one Christian-international) in
/src/data/couples.ts with full details, lorem ipsum story text, picsum photos.
```

---

## PHASE 5 — Onboarding Flow (create invite → details → payment)

```
Build /onboarding as a multi-step flow using the Stepper (diya) component.
No auth — a "Continue as demo couple" button prefills everything. Persist the
draft to localStorage.

Step 1 — Who's creating? A beautiful two-card toggle: "Groom's side" /
  "Bride's side" (this only changes copy accents like "Tell us about her/him
  first" and the admin greeting later). Include a third quiet option: "We're
  doing this together".
Step 2 — Region & tradition: Country select + tradition select (drives theme
  pre-filtering per Phase 4). Show a live mini-preview strip that restyles as
  they pick.
Step 3 — Theme gallery: filter chips (religion, region, mood: Royal / Playful /
  Minimal / Festive). Each theme card shows palette strip + tiny animated
  envelope preview. Selecting a theme shows a full-screen preview modal with
  a "Choose this theme" CTA.
Step 4 — Couple details form: names, date(s), events (dynamic list — add/remove
  events, each with name/date/time/venue; event name suggestions come from the
  theme's eventVocabulary), story text (prefill lorem ipsum), photos (picsum
  pickers presented as "uploaded"), family names, hashtag.
Step 5 — Permalink: auto-suggest slug "swarnil-weds-prachi" from names, editable,
  fake availability check with a green "available!" tick after 600ms.
Step 6 — Fake payment: a plan card (single plan, ₹—— placeholder), a payment
  sheet with disabled dummy card fields and a big "Pay (demo)" button → 1.5s
  spinner → success screen with PetalRain, the WaxSeal stamping down on an
  order card, and two CTAs: "Open your admin panel" (/admin) and "View your
  live invite" (/invite/<slug>).

All data written to localStorage under "amantrika:draft" and, on payment
success, copied to "amantrika:live-invite" — the admin panel and invite page
read from it (falling back to the demo couple mock data if empty).
```

---

## PHASE 6 — Live Invitation Page (/invite/[slug])

```
Build the live invite at /invite/[slug]. Read invite data from localStorage
("amantrika:live-invite") or fall back to the matching demo couple in mock data.
Support ?g=<guestName> to personalize ("Dear Rahul & Family") and
?theme=<id> to override theme (used by the design-system previews).

OPENING SEQUENCE (the signature moment):
Full-screen Envelope with guest name and WaxSeal → tap → seal-break →
flap opens → card slides out and scales up to become the page → PetalRain
starts softly → MusicToggle appears. Reduced motion: skip straight to the page
with a simple fade.

THE PAGE — minimum NINE sections, each themed, each with a scroll-triggered
fade-up-stagger reveal and an ornate motif divider between sections:

1. Hero — CoupleMonogram, couple names in display-xl, date, venue city,
   greeting line from theme (e.g. "|| Shubh Vivah ||" / "Bismillah" / "Together
   with their families").
2. Countdown — CountdownTimer to the main event.
3. Our Story — story text + 2 PhotoFrames (theme frameStyle), timeline of
   "how we met" moments (lorem ipsum).
4. Events — EventTimelineItem list per the couple's events, each with
   add-to-calendar and directions.
5. Family — "With blessings of" — both families' names on ornate cards;
   respect the bride/groom-side ordering chosen in onboarding.
6. Gallery — masonry of 6–8 picsum photos in theme frames, lightbox on click.
7. RSVP — RSVPForm (writes to localStorage "amantrika:rsvps" so the admin
   analytics can read it — this makes the demo feel alive).
8. Blessings Wall — BlessingsWall seeded with 6 mock wishes + "Add your
   blessing" that appends locally.
9. Travel & Venue — MapEmbedPlaceholder per venue, hotel suggestions cards,
   dress-code chips per event.
+ Footer — hashtag, GiftBlock, "Crafted with Amantrika" wordmark link, and a
  small share row (WhatsApp/copy-link buttons, copy-link actually works).

Micro-interactions everywhere but restrained: gold shimmer on section titles
when they enter view, diya-flicker on event icons, tilt on photo hover, the
countdown separators gently pulsing. One grand moment (the envelope) + quiet
elegance after — do not make every section compete.
```

---

## PHASE 7 — Admin Panel (/admin)

```
Build /admin — the couple's dashboard. No auth; a header shows the couple's
monogram + names from localStorage (or demo couple). Include a side toggle
"Viewing as: Groom's side / Bride's side" which filters the guest list by
side and swaps the greeting ("Welcome, Team Swarnil!" / "Welcome, Team Prachi!").

Tabs:

1. Overview (analytics) — KPI row: Invite views, Unique guests, RSVPs yes /
   no / maybe, Total headcount, Meals (veg/non-veg/halal per theme), Blessings
   count. Below: a 14-day views sparkline (mock data + any real localStorage
   RSVPs merged in), "RSVPs by event" horizontal bars, "Guests by side" donut
   (inline SVG charts only, no chart library), and a live activity feed
   ("Rahul & Family RSVP'd Yes · 2 guests · Sangeet + Wedding").
2. Guests — Table of guests (mock /src/data/guests.ts, 40 rows): name, side
   (groom/bride), group (family/friends/colleagues), events invited to, RSVP
   status badge, headcount, meal. Features: search, filter chips (side/status/
   event), "Copy personal link" per guest (copies /invite/<slug>?g=<name>),
   bulk-select with a fake "Send WhatsApp reminder" toast, and an "Add guest"
   modal.
3. Invite — permalink card with copy button + QR code placeholder, live theme
   switcher (changes the actual invite theme in localStorage), toggle sections
   on/off (hide Gift block, hide Blessings, etc.), and an embedded live preview
   of /invite/<slug> in a phone-frame iframe.
4. Settings — couple details form (same fields as onboarding step 4, editable),
   and a "Danger zone" with "Reset demo data" (clears localStorage).

The admin chrome uses the Amantrika brand palette (maroon/gold on ivory) but
quieter than the invite — this is the one place that can feel slightly more
"dashboard", while still using ornate dividers and the diya/motif details.
```

---

## PHASE 8 — Landing Page + Polish Pass

```
1. Build the marketing landing page at "/": hero with an auto-playing (muted,
   reduced-motion-safe) envelope-open demo, "One link. Every blessing." style
   headline in the Display face, theme gallery strip, 3-step "How it works"
   (Choose theme → Fill details → Share your link), testimonials on ornate
   cards (lorem ipsum), and CTAs into /onboarding and /design-system.

2. Polish pass across the whole app:
   - Audit: no hardcoded colors — everything via tokens. Fix violations.
   - Test all 8 themes on the invite page; every one of the 9 sections must
     look intentional per theme (frames, motifs, vocabulary, meal options).
   - Test reduced motion, 360px mobile, keyboard-only navigation.
   - Add loading skeletons (shimmer-gold) to admin and invite.
   - Add a floating "🎨 Theme" dev switcher (only in dev) on every page.
   - Take screenshots of: landing, design-system home, one page per theme's
     invite hero, admin overview — and review them for visual bugs before
     declaring done.
```

---

## Tips for running these prompts

- **One phase per session/message.** If Claude Code drifts, remind it: "Follow
  the Amantrika phase spec exactly; all styling from tokens."
- After Phase 1, **lock the tokens** — if a later phase wants a new color, add
  it to the token files first, never inline.
- If output looks generic/SaaS-like, the magic words: *"This looks like a
  dashboard template. Make it feel like an Indian wedding card: ivory paper,
  gold ornament, ceremonial type. Rework using the ornate Card variant and
  motif dividers."*
- Commit after every phase so you can roll back.
- When you later add a real backend, the localStorage keys
  (`amantrika:draft`, `amantrika:live-invite`, `amantrika:rsvps`) map cleanly
  to your future API resources — keep the shapes.