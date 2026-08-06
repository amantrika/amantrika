# Amantrika 💌

Digital wedding invitations that open like a real card — wax seal, envelope, petals and all.
**UI-only demo**: no auth, no backend; all data lives in mock files and your browser's localStorage.

## Quick start

```bash
npm install       # first time only
npm run dev       # start at http://localhost:3000
```

| Where to go | What you'll see |
| --- | --- |
| `http://localhost:3000/` | Marketing landing page |
| `http://localhost:3000/design-system` | **The living design system** (start here) |
| `http://localhost:3000/onboarding` | Create-your-invite flow (use "Continue as demo couple") |
| `http://localhost:3000/admin` | Couple's dashboard (analytics, guests, invite settings) |
| `http://localhost:3000/invite/swarnil-weds-prachi` | Live invitation — tap the wax seal! |

Try a personalized, themed invite:
`/invite/swarnil-weds-prachi?g=Rahul%20%26%20Family&theme=nikah-emerald`

In dev, every page has a floating **🎨 Theme** button (bottom-right) to flip all 8 themes live.

## Scripts

```bash
npm run dev     # dev server with hot reload
npm run build   # production build (also typechecks)
npm run start   # serve the production build
npm run lint    # ESLint
npx tsc --noEmit  # typecheck only
```

## Working on the design system

The design system is a normal part of this repo — edit it and every page updates.

```
src/app/globals.css              ← ALL color/space/type/radius/shadow values (CSS variables)
                                    + the [data-theme="…"] overrides for each theme
src/design-system/tokens/        ← the same tokens exposed to TypeScript
src/design-system/motifs/        ← 12 SVG motifs (paisley, diya, jaali…), currentColor-based
src/design-system/motion/        ← Framer Motion presets (envelope-open, seal-break…)
src/design-system/components/    ← the component library (Button … Envelope, PetalRain)
src/themes/index.ts              ← the 8 theme definitions (vocabulary, motifs, meals, palette)
src/data/                        ← mock couples, guests, analytics, blessings
```

**The golden rule:** never hardcode a hex in a component. Add new values to
`globals.css` (+ mirror in `src/design-system/tokens/`) first, then use them via
Tailwind utilities (`bg-primary`, `text-accent`, `border-ornate`, `shadow-gold-glow`)
or `var(--…)`. Themes override **only** the semantic `--color-*` variables.

Typical workflows:

- **New component** → add it to `src/design-system/components/`, export from `index.ts`,
  add a live example on `src/app/design-system/components/page.tsx`.
- **New theme** → add a `[data-theme="my-theme"]` block in `globals.css` **and** a `Theme`
  object in `src/themes/index.ts`. It appears automatically in every switcher/gallery.
- **New motif** → add an SVG component to `src/design-system/motifs/index.tsx` and register
  it in the `motifs` map; the docs gallery picks it up automatically.
- **Docs** → everything under `src/app/design-system/` is the public docs site; it is built
  from the same tokens and components it documents.

## Demo data model (future API shape)

Everything persists to localStorage under keys that map 1:1 to future API resources —
keep these shapes when adding a real backend:

- `amantrika:draft` — onboarding draft
- `amantrika:live-invite` — the published invite (read by /admin and /invite)
- `amantrika:rsvps` — RSVPs submitted on the invite (read by admin analytics)
- `amantrika:blessings` — guest blessings

Reset everything from **Admin → Settings → Danger zone**.

See `progress.md` for what's done vs. what's left, and `instruction.md` for the full phase spec.
