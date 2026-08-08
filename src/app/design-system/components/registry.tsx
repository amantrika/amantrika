"use client";

import type { ReactNode } from "react";
import {
  Badge, BandBaajaMarquee, BilingualHeading, Bunting, Button, Card, ConfettiButton,
  ConnectedTimeline, CornerFlourish, CountdownTimer, CoupleMonogram, DayScheduleCard,
  DebossedPanel, DiyaRow, DropCap, EmbossedPanel, Envelope, EventTimelineItem, FlipCard,
  FoldCard, GarlandDivider, GlassCard, GlowBadge, GoldFoilText, HaldiSplash,
  HorizontalItinerary, HoverTiltCard, Input, KaleeraTassel, KineticUnderline, LaceEdge,
  MandapCanopy, Marquee, MilestoneRibbon, OrnateFrame, PhotoFrame,
  PolaroidStack, ProgressGarland, PulseDot, QRCard, RangoliMedallion,
  RelationCard, RSVPForm, ScriptText, ScrollCard, SeatCard, SehraFringe, Select,
  ShareRow, ShimmerDivider, Sparkles, Sparkline, Stat, Stepper, StitchedEdge,
  Table, Textarea, ThreadBorder, TicketCard, Toran, TypewriterText,
  UrduVerse, VerseBlock, WaveText, WaxDrip, WaxSeal, WeatherCard, ZariBraid,
  AnimatedCounter, StatelessDemos,
  FamilyTree, EventCalendar, VideoFrame, VideoHero, DecorativeBorder,
  SectionHeader, ThemedCard, ThemedHero, OurStorySection, ThemedOpening,
  Navbar, Breadcrumbs, SideNav, Pager, LayoutSection, SectionTitle, ThemedHeroVariant,
} from "./registry-helpers";
import type { NavItem } from "@/design-system/components";
import { AmantrikaBadge, AmantrikaLogo, AmantrikaMark, AmantrikaWordmark } from "@/design-system/brand";
import { getCouple } from "@/data/couples";
import { brideFamily, groomFamily } from "@/data/families";
import { defaultSectionStyle, getTheme, heroVariants } from "@/themes";
import { icons } from "@/design-system/icons";

export interface DemoEntry {
  title: string;
  note?: string;
  node: ReactNode;
}

export interface ComponentDoc {
  slug: string;
  title: string;
  category: "Core UI" | "Navigation" | "Ornaments" | "Wedding décor" | "Typography" | "Timeline" | "Interactive" | "Signature" | "Features" | "Sections" | "Layout";
  description: string;
  demos: DemoEntry[];
}

const couple = getCouple("swarnil-weds-prachi");
const theme = getTheme("royal-maroon");
const Shehnai = icons.shehnai;
const Dhol = icons.dhol;

/* ---- fixtures for the Navigation and Layout entries ---- */

const navSample: NavItem[] = [
  { href: "/showcase", label: "Showcase" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

const heroSample = {
  names: [couple.partner1.name, couple.partner2.name],
  initials: [couple.partner1.name[0], couple.partner2.name[0]] as [string, string],
  dateLabel: "14 February 2027",
  city: "Udaipur",
  hashtag: "#SwarnilWedsPrachi",
  photoUrl: "https://picsum.photos/seed/amantrika-hero/900/1200",
  photoAlt: "The couple, photographed at the lake palace",
};

/**
 * One demo per hero variant. Each is the *same* theme with only `layout.hero`
 * swapped, so what the reader sees is the variant and nothing else — and it
 * doubles as proof that the hero is data, not a per-theme component.
 */
const heroVariantDemos: DemoEntry[] = heroVariants.map((hero) => ({
  title: hero,
  node: (
    <div className="h-[420px] overflow-y-auto rounded-card border border-ornate/30">
      <ThemedHeroVariant
        {...heroSample}
        theme={{ ...theme, layout: { ...theme.layout, hero } }}
      />
    </div>
  ),
}));

export const componentDocs: ComponentDoc[] = [
  /* ================= SIGNATURE ================= */
  {
    slug: "envelope",
    title: "Envelope",
    category: "Signature",
    description: "The opening moment: guest name, wax seal, 3D flap, card slide-out. Tap the seal.",
    demos: [
      { title: "Default", note: "Guest-personalized with monogram seal.", node: <Envelope guestName="Rahul & Family" sealMonogram="S·P" /> },
      { title: "No guest name", note: "Generic save-the-date envelope.", node: <Envelope sealMonogram="अ" /> },
    ],
  },
  {
    slug: "wax-seal",
    title: "WaxSeal",
    category: "Signature",
    description: "Pressed-wax monogram seal in the theme's primary wax; cracks with the seal-break preset.",
    demos: [
      { title: "Sizes", node: <div className="flex items-center gap-6"><WaxSeal monogram="S·P" size={64} /><WaxSeal monogram="A·F" size={88} /><WaxSeal monogram="J&E" size={116} /></div> },
    ],
  },
  {
    slug: "couple-monogram",
    title: "CoupleMonogram",
    category: "Signature",
    description: "Generated SVG monogram with a theme-aware decorative ring.",
    demos: [
      {
        title: "Ring styles", note: "paisley · jaali · floral · laurel",
        node: (
          <div className="flex flex-wrap gap-6 text-primary">
            <CoupleMonogram initials={["S", "P"]} ring="paisley" className="size-24" />
            <CoupleMonogram initials={["A", "F"]} ring="jaali" className="size-24" />
            <CoupleMonogram initials={["R", "M"]} ring="floral" className="size-24" />
            <CoupleMonogram initials={["J", "E"]} ring="laurel" className="size-24" />
          </div>
        ),
      },
    ],
  },
  {
    slug: "countdown-timer",
    title: "CountdownTimer",
    category: "Signature",
    description: "Display-face countdown with pulsing gold separators.",
    demos: [{ title: "Default", node: <CountdownTimer target={couple.mainDate} /> }],
  },
  {
    slug: "event-timeline-item",
    title: "EventTimelineItem",
    category: "Signature",
    description: "One themed event with .ics download and directions.",
    demos: [{ title: "Pheras", node: <EventTimelineItem event={couple.events[3]} /> }],
  },
  {
    slug: "rsvp-form",
    title: "RSVPForm",
    category: "Signature",
    description: "Ornate radio cards, guest stepper, per-event checkboxes, theme meals. Persists to localStorage.",
    demos: [{ title: "Default", node: <RSVPForm events={couple.events} mealOptions={["Veg", "Jain", "Non-veg"]} /> }],
  },
  {
    slug: "photo-frame",
    title: "PhotoFrame",
    category: "Signature",
    description: "Theme-aware photo mat: arch, scallop, circle, polaroid.",
    demos: [
      {
        title: "All variants",
        node: (
          <div className="flex flex-wrap items-end gap-6">
            <PhotoFrame seed="v-arch" variant="arch" width={150} height={190} />
            <PhotoFrame seed="v-scal" variant="scallop" width={150} height={190} />
            <PhotoFrame seed="v-circ" variant="circle" width={150} height={150} />
            <PhotoFrame seed="v-pol" variant="polaroid" width={150} height={140} caption="Jaipur" />
          </div>
        ),
      },
    ],
  },

  /* ================= CORE UI ================= */
  {
    slug: "button",
    title: "Button",
    category: "Core UI",
    description: "Primary, secondary, ghost and celebration variants with a slow gold loading spinner.",
    demos: [
      { title: "Variants", node: <div className="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="celebration">Celebration</Button></div> },
      { title: "Sizes & loading", node: <div className="flex flex-wrap items-center gap-3"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button><Button loading>Saving</Button></div> },
    ],
  },
  {
    slug: "fields",
    title: "Input · Select · Textarea",
    category: "Core UI",
    description: "Form fields with the gold double-line focus ring.",
    demos: [
      {
        title: "All fields",
        node: (
          <div className="grid max-w-md gap-4">
            <Input label="Hashtag" placeholder="#SwarnilWedsPrachi" />
            <Select label="Tradition" options={[{ value: "h", label: "Hindu" }, { value: "m", label: "Muslim" }, { value: "s", label: "Sikh" }]} />
            <Textarea label="Story" placeholder="It began at a crowded café…" />
          </div>
        ),
      },
    ],
  },
  {
    slug: "card",
    title: "Card",
    category: "Core UI",
    description: "plain · ornate (mehndi corners) · envelope (paper depth).",
    demos: [
      { title: "Variants", node: <div className="grid gap-4 sm:grid-cols-3"><Card className="p-5">Plain</Card><Card variant="ornate" className="p-5">Ornate</Card><Card variant="envelope" className="p-5">Envelope</Card></div> },
    ],
  },
  {
    slug: "badges-avatars",
    title: "Badge · Avatar · Divider",
    category: "Core UI",
    description: "Status badges, gold-ring avatars, motif dividers.",
    demos: [{ title: "Together", node: <StatelessDemos.BadgeAvatarDivider /> }],
  },
  {
    slug: "stepper",
    title: "Stepper",
    category: "Core UI",
    description: "Onboarding steps as diyas that light up when reached.",
    demos: [
      { title: "Mid-journey", node: <Stepper steps={["Side", "Region", "Theme", "Details", "Link", "Pay"]} current={2} /> },
      { title: "Complete", node: <Stepper steps={["Side", "Region", "Theme", "Details", "Link", "Pay"]} current={5} /> },
    ],
  },
  {
    slug: "table",
    title: "Table",
    category: "Core UI",
    description: "Guest table with ivory zebra rows and sticky ornate header.",
    demos: [
      {
        title: "Guest list",
        node: (
          <Table headers={["Guest", "Side", "Status"]}>
            {[["Rahul & Family", "Groom", "yes"], ["Ananya", "Bride", "maybe"], ["Vikram", "Groom", "pending"]].map(([n, s, st]) => (
              <tr key={n}><td className="px-4 py-2.5 font-semibold">{n}</td><td className="px-4 py-2.5">{s}</td><td className="px-4 py-2.5"><Badge tone={st === "yes" ? "success" : st === "maybe" ? "accent" : "neutral"}>{st}</Badge></td></tr>
            ))}
          </Table>
        ),
      },
    ],
  },
  {
    slug: "stat",
    title: "Stat · Sparkline",
    category: "Core UI",
    description: "KPI card with display number, delta arrow and inline SVG sparkline.",
    demos: [
      { title: "KPI row", node: <div className="grid gap-4 sm:grid-cols-3"><Stat label="Invite views" value="2,431" delta={18} spark={[42, 58, 51, 96, 132, 118, 154, 171]} /><Stat label="RSVP yes" value={112} delta={6} /><Stat label="Headcount" value={286} delta={-2} /></div> },
      { title: "Bare sparkline", node: <Sparkline data={[3, 6, 4, 9, 7, 12, 10, 16]} className="h-12 w-64 text-accent" /> },
    ],
  },
  {
    slug: "toggles",
    title: "ToggleGroup · Switch",
    category: "Core UI",
    description: "Segmented control and the gold-bead switch.",
    demos: [{ title: "Interactive", node: <StatelessDemos.Toggles /> }],
  },

  /* ================= ORNAMENTS ================= */
  {
    slug: "thread-border",
    title: "ThreadBorder",
    category: "Ornaments",
    description: "The dhage-ki-patti: a 3D running silk thread with corner knots, stitched around a panel.",
    demos: [
      { title: "Animated thread", note: "The dash runs like thread being pulled.", node: <ThreadBorder><p className="text-center type-verse">Tied with a sacred thread,<br />sealed with love.</p></ThreadBorder> },
      { title: "Static", node: <ThreadBorder animated={false}><p className="text-center type-body">Static thread for quiet contexts.</p></ThreadBorder> },
    ],
  },
  {
    slug: "stitched-edge",
    title: "StitchedEdge",
    category: "Ornaments",
    description: "Tailor's running-stitch outline — like the hem of a dupatta.",
    demos: [{ title: "Default", node: <StitchedEdge><p className="text-center type-body">Hand-stitched with blessings.</p></StitchedEdge> }],
  },
  {
    slug: "zari-braid",
    title: "ZariBraid",
    category: "Ornaments",
    description: "Woven gold braid strip — a zari border for headers and footers.",
    demos: [{ title: "Braid weights", node: <div className="flex flex-col gap-6"><ZariBraid height={8} /><ZariBraid height={14} /></div> }],
  },
  {
    slug: "toran",
    title: "Toran",
    category: "Ornaments",
    description: "Doorway garland with gently swinging mango leaves and marigolds.",
    demos: [{ title: "Swinging", node: <Toran /> }, { title: "Still", node: <Toran swing={false} /> }],
  },
  {
    slug: "bunting",
    title: "Bunting",
    category: "Ornaments",
    description: "Festive triangle flags strung on a gold cord.",
    demos: [{ title: "Default", node: <Bunting /> }],
  },
  {
    slug: "lace-edge",
    title: "LaceEdge",
    category: "Ornaments",
    description: "Scalloped paper-lace edge with hanging beads.",
    demos: [{ title: "Both directions", node: <div className="flex flex-col gap-8"><LaceEdge /><LaceEdge flip /></div> }],
  },
  {
    slug: "corner-flourish",
    title: "CornerFlourish",
    category: "Ornaments",
    description: "Calligraphic corner swirls — the four corners of a card.",
    demos: [
      {
        title: "Four corners",
        node: (
          <div className="relative mx-auto h-40 w-64 rounded-card border border-ornate/40 text-ornate">
            <CornerFlourish corner="top-left" className="absolute left-1 top-1 size-12" />
            <CornerFlourish corner="top-right" className="absolute right-1 top-1 size-12" />
            <CornerFlourish corner="bottom-left" className="absolute bottom-1 left-1 size-12" />
            <CornerFlourish corner="bottom-right" className="absolute bottom-1 right-1 size-12" />
          </div>
        ),
      },
    ],
  },
  {
    slug: "ornate-frame",
    title: "OrnateFrame",
    category: "Ornaments",
    description: "The full physical-card treatment: double border, corner flourishes, paper texture, themed pattern wash.",
    demos: [
      { title: "With paisley damask", node: <OrnateFrame pattern="paisley-damask"><p className="text-center type-display-lg text-primary">Swarnil <span className="type-script text-accent" style={{ fontSize: "0.6em" }}>weds</span> Prachi</p></OrnateFrame> },
      { title: "With star jaali", node: <OrnateFrame pattern="star-jaali"><p className="text-center type-h2 text-primary">Nikah Ceremony</p></OrnateFrame> },
    ],
  },
  {
    slug: "material-panels",
    title: "Embossed · Debossed · Glass",
    category: "Ornaments",
    description: "Letterpress materials: raised, pressed and frosted panels.",
    demos: [
      { title: "Side by side", node: <div className="grid gap-4 sm:grid-cols-3"><EmbossedPanel><p className="text-center text-sm font-bold">Embossed</p></EmbossedPanel><DebossedPanel><p className="text-center text-sm font-bold">Debossed</p></DebossedPanel><div className="relative overflow-hidden rounded-card"><div className="absolute inset-0 bg-accent/30" /><GlassCard><p className="text-center text-sm font-bold">Glass</p></GlassCard></div></div> },
    ],
  },
  {
    slug: "gold-foil-text",
    title: "GoldFoilText",
    category: "Ornaments",
    description: "Foil-stamped metallic lettering with a moving sheen.",
    demos: [{ title: "Display", node: <GoldFoilText as="h2" className="font-display text-5xl font-semibold">Shubh Vivah</GoldFoilText> }],
  },
  {
    slug: "shimmer-divider",
    title: "ShimmerDivider",
    category: "Ornaments",
    description: "Thin gold rule with a travelling light sweep.",
    demos: [{ title: "Default", node: <div className="py-6"><ShimmerDivider /></div> }],
  },
  {
    slug: "sparkles",
    title: "Sparkles",
    category: "Ornaments",
    description: "Twinkling star field for hero moments.",
    demos: [{ title: "Over a panel", node: <div className="relative h-40 rounded-card bg-primary"><Sparkles count={14} /><p className="relative flex h-full items-center justify-center font-display text-2xl text-bg">A night to remember</p></div> }],
  },
  {
    slug: "wax-drip",
    title: "WaxDrip",
    category: "Ornaments",
    description: "Melted-wax edge in the theme's primary wax colour.",
    demos: [{ title: "Header edge", node: <div className="overflow-hidden rounded-card border border-ornate/40"><div className="bg-primary p-6 text-center font-display text-2xl text-bg">Save the Date</div><WaxDrip /></div> }],
  },

  /* ================= WEDDING DÉCOR ================= */
  {
    slug: "diya-row",
    title: "DiyaRow",
    category: "Wedding décor",
    description: "A shelf of flickering diyas — each flame offset in time.",
    demos: [{ title: "Five diyas", node: <DiyaRow count={5} /> }, { title: "Nine diyas", node: <DiyaRow count={9} /> }],
  },
  {
    slug: "garland-divider",
    title: "GarlandDivider",
    category: "Wedding décor",
    description: "Varmala swag between sections.",
    demos: [{ title: "Default", node: <GarlandDivider /> }],
  },
  {
    slug: "band-baaja-marquee",
    title: "BandBaajaMarquee",
    category: "Wedding décor",
    description: "Celebratory scrolling text band in the theme primary.",
    demos: [
      { title: "Hindi", node: <BandBaajaMarquee text="शुभ विवाह" /> },
      { title: "English", node: <BandBaajaMarquee text="It's a shaadi!" separator="♥" duration={12} /> },
    ],
  },
  {
    slug: "haldi-splash",
    title: "HaldiSplash",
    category: "Wedding décor",
    description: "Organic turmeric-paste blob backdrop for playful sections.",
    demos: [{ title: "Behind content", node: <HaldiSplash><p className="text-center type-h2 text-primary">Haldi at home, 10 AM</p></HaldiSplash> }],
  },
  {
    slug: "kaleera-tassel",
    title: "KaleeraTassel",
    category: "Wedding décor",
    description: "A swinging bridal kaleera tassel — hang from headers.",
    demos: [{ title: "Pair", node: <div className="flex justify-center gap-16"><KaleeraTassel className="h-28" /><KaleeraTassel className="h-28" /></div> }],
  },
  {
    slug: "sehra-fringe",
    title: "SehraFringe",
    category: "Wedding décor",
    description: "Beaded sehra fringe strip for the bottom edge of banners.",
    demos: [{ title: "Default", node: <SehraFringe /> }],
  },
  {
    slug: "mandap-canopy",
    title: "MandapCanopy",
    category: "Wedding décor",
    description: "Four-post canopy silhouette to crown a section.",
    demos: [{ title: "With heading", node: <MandapCanopy><p className="text-center type-h2 text-primary">The Pheras</p></MandapCanopy> }],
  },
  {
    slug: "rangoli-medallion",
    title: "RangoliMedallion",
    category: "Wedding décor",
    description: "Radial rangoli centrepiece for hero backgrounds.",
    demos: [{ title: "Sizes", node: <div className="flex items-center justify-center gap-8"><RangoliMedallion size={120} /><RangoliMedallion size={200} /></div> }],
  },
  {
    slug: "scroll-card",
    title: "ScrollCard",
    category: "Wedding décor",
    description: "A royal farmān — paper scroll with rolled ends.",
    demos: [{ title: "Invitation text", node: <ScrollCard><p className="text-center type-verse">By the grace of the almighty and our elders,<br />we request the honour of your presence.</p></ScrollCard> }],
  },
  {
    slug: "ticket-card",
    title: "TicketCard",
    category: "Wedding décor",
    description: "Baraat boarding pass with a perforated stub.",
    demos: [
      {
        title: "Baraat pass",
        node: (
          <TicketCard
            left={<div><p className="type-overline">Baraat Express</p><p className="mt-1 font-display text-xl font-semibold text-primary">Singh Residence → Sheesh Mahal</p><p className="type-caption">24 Nov · 5:00 PM · Dancing mandatory</p></div>}
            right={<div><p className="type-overline">Seat</p><p className="font-display text-2xl font-semibold text-primary">∞</p></div>}
          />
        ),
      },
    ],
  },
  {
    slug: "fold-card",
    title: "FoldCard",
    category: "Wedding décor",
    description: "A card whose cover folds open in 3D — tap to open.",
    demos: [
      { title: "Tap to open", node: <FoldCard cover={<p className="font-display text-2xl font-semibold text-primary">You&apos;re invited</p>}><p className="type-body text-center">The Sharma &amp; Singh families request your presence this November in Jaipur.</p></FoldCard> },
    ],
  },
  {
    slug: "polaroid-stack",
    title: "PolaroidStack",
    category: "Wedding décor",
    description: "A fanned pile of polaroids; hover to straighten one.",
    demos: [{ title: "Five photos", node: <PolaroidStack seeds={["st1", "st2", "st3", "st4", "st5"]} /> }],
  },

  /* ================= TYPOGRAPHY ================= */
  {
    slug: "script-text",
    title: "ScriptText",
    category: "Typography",
    description: "Great Vibes calligraphy — the hand-lettered face for names and flourish words.",
    demos: [{ title: "Names", node: <ScriptText className="text-6xl">Swarnil &amp; Prachi</ScriptText> }],
  },
  {
    slug: "bilingual-heading",
    title: "BilingualHeading",
    category: "Typography",
    description: "Rozha One Devanagari line over an English display heading.",
    demos: [{ title: "Default", node: <BilingualHeading hindi="शुभ विवाह" english="The Wedding" /> }],
  },
  {
    slug: "urdu-verse",
    title: "UrduVerse",
    category: "Typography",
    description: "Noto Nastaliq Urdu couplet, flowing right-to-left.",
    demos: [{ title: "Couplet", node: <UrduVerse lines={["محبت کی کہانی میں نیا باب لکھا جائے گا", "دو دلوں کا سنگم آج منایا جائے گا"]} attribution="for Ahmed & Fatima" /> }],
  },
  {
    slug: "verse-block",
    title: "VerseBlock",
    category: "Typography",
    description: "Shayari between oversized gold quotation marks.",
    demos: [{ title: "Default", node: <VerseBlock attribution="Rumi">Lovers don&apos;t finally meet somewhere. They&apos;re in each other all along.</VerseBlock> }],
  },
  {
    slug: "drop-cap",
    title: "DropCap",
    category: "Typography",
    description: "Illuminated first letter for story paragraphs.",
    demos: [{ title: "Story opening", node: <DropCap>It began, as the best stories do, entirely by accident — a shared table at a crowded café and a conversation that refused to end.</DropCap> }],
  },
  {
    slug: "wave-text",
    title: "WaveText",
    category: "Typography",
    description: "Per-letter rising reveal when scrolled into view.",
    demos: [{ title: "Heading", node: <WaveText text="Forever begins now" className="font-display text-4xl font-semibold text-primary" /> }],
  },
  {
    slug: "typewriter-text",
    title: "TypewriterText",
    category: "Typography",
    description: "Character-by-character reveal with a gold caret.",
    demos: [{ title: "Invitation line", node: <TypewriterText text="You are cordially invited to the wedding of the year…" className="type-verse text-xl" /> }],
  },
  {
    slug: "animated-counter",
    title: "AnimatedCounter",
    category: "Typography",
    description: "Ease-out count-up for stats and countdowns.",
    demos: [{ title: "Guests", node: <p className="text-center"><AnimatedCounter to={286} className="text-6xl" /><span className="ml-2 type-overline">guests & counting</span></p> }],
  },
  {
    slug: "kinetic-underline",
    title: "KineticUnderline",
    category: "Typography",
    description: "Heading with a gold underline that draws itself.",
    demos: [{ title: "Default", node: <KineticUnderline className="font-display text-3xl font-semibold text-primary">Our Story</KineticUnderline> }],
  },

  /* ================= TIMELINE ================= */
  {
    slug: "connected-timeline",
    title: "ConnectedTimeline",
    category: "Timeline",
    description: "Vertical events joined by a dashed dhaga, each with a custom wedding icon.",
    demos: [
      {
        title: "Three days of shaadi",
        node: (
          <ConnectedTimeline
            entries={[
              { icon: "henna-cone", title: "Mehndi", meta: "22 Nov · 4 PM", description: "Garden Court — bring your palms.", badge: "Green & gold" },
              { icon: "dhol", title: "Sangeet", meta: "23 Nov · 7 PM", description: "The Pearl Ballroom — dance-offs guaranteed." },
              { icon: "mandap", title: "Pheras", meta: "24 Nov · 7 PM", description: "Sheesh Mahal Lawns — the seven vows.", badge: "Traditional" },
              { icon: "fireworks", title: "Reception", meta: "25 Nov · 7:30 PM", description: "Dinner, toasts and a little bit of crying." },
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: "horizontal-itinerary",
    title: "HorizontalItinerary",
    category: "Timeline",
    description: "Left-to-right day flow with connected icon stops.",
    demos: [
      {
        title: "Nikah day",
        node: (
          <HorizontalItinerary
            entries={[
              { icon: "baraat-horse", title: "Baraat", meta: "5 PM" },
              { icon: "mosque-dome", title: "Nikah", meta: "6 PM" },
              { icon: "mithai", title: "Dinner", meta: "8 PM" },
              { icon: "fireworks", title: "Rukhsati", meta: "11 PM" },
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: "day-schedule-card",
    title: "DayScheduleCard",
    category: "Timeline",
    description: "One day's run-sheet with display-face times.",
    demos: [
      {
        title: "Wedding day",
        node: (
          <DayScheduleCard
            day="Wedding Day"
            date="24 November"
            items={[
              { time: "4:00", label: "Baraat departs", icon: "baraat-horse" },
              { time: "6:00", label: "Varmala", icon: "varmala" },
              { time: "7:00", label: "Pheras begin", icon: "mandap" },
              { time: "9:30", label: "Dinner is served", icon: "mithai" },
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: "milestone-ribbon",
    title: "MilestoneRibbon",
    category: "Timeline",
    description: "A folded ribbon banner for milestones.",
    demos: [{ title: "Countdown", node: <div className="text-center"><MilestoneRibbon>10 days to go!</MilestoneRibbon></div> }],
  },

  /* ================= INTERACTIVE ================= */
  {
    slug: "flip-card",
    title: "FlipCard",
    category: "Interactive",
    description: "3D flip between an ornate front and a primary-color back.",
    demos: [
      { title: "Tap to flip", node: <FlipCard front={<p className="text-center font-display text-xl font-semibold text-primary">Who said &quot;yes&quot; first?</p>} back={<p className="text-center font-display text-xl">Both. At the same time.</p>} /> },
    ],
  },
  {
    slug: "hover-tilt-card",
    title: "HoverTiltCard",
    category: "Interactive",
    description: "Pointer-tracked 3D tilt with a spring return.",
    demos: [{ title: "Move your cursor", node: <HoverTiltCard><p className="text-center type-h3 text-primary">I follow your cursor</p></HoverTiltCard> }],
  },
  {
    slug: "confetti-button",
    title: "ConfettiButton",
    category: "Interactive",
    description: "A celebration button that bursts marigold petals on click.",
    demos: [{ title: "Click it", node: <div className="py-8 text-center"><ConfettiButton>Send blessings 🎉</ConfettiButton></div> }],
  },
  {
    slug: "chip",
    title: "Chip",
    category: "Interactive",
    description: "Filter chip with a filled selected state.",
    demos: [{ title: "Filter row", node: <StatelessDemos.Chips /> }],
  },
  {
    slug: "progress-garland",
    title: "ProgressGarland",
    category: "Interactive",
    description: "Progress rendered as marigolds lighting up along a thread.",
    demos: [{ title: "RSVPs collected", node: <ProgressGarland value={64} label="RSVPs collected · 64%" /> }],
  },
  {
    slug: "rating-diyas",
    title: "RatingDiyas",
    category: "Interactive",
    description: "1–5 rating as lit diyas.",
    demos: [{ title: "Interactive", node: <StatelessDemos.Rating /> }],
  },
  {
    slug: "seat-card",
    title: "SeatCard",
    category: "Interactive",
    description: "Table-assignment card in calligraphy.",
    demos: [{ title: "Default", node: <SeatCard guest="Rahul & Family" table="7" side="Groom's side" className="max-w-60" /> }],
  },
  {
    slug: "relation-card",
    title: "RelationCard",
    category: "Interactive",
    description: "Family-tree person tile with a gold-ring photo.",
    demos: [
      { title: "The families", node: <div className="flex flex-wrap justify-center gap-8"><RelationCard name="Sunita Singh" relation="Mother of the groom" seed="rel1" /><RelationCard name="Rajesh Singh" relation="Father of the groom" seed="rel2" /><RelationCard name="Kavita Sharma" relation="Mother of the bride" seed="rel3" /></div> },
    ],
  },
  {
    slug: "qr-card",
    title: "QRCard",
    category: "Interactive",
    description: "Stylised QR placeholder for printed cards.",
    demos: [{ title: "Default", node: <div className="text-center"><QRCard /></div> }],
  },
  {
    slug: "share-row",
    title: "ShareRow",
    category: "Interactive",
    description: "WhatsApp share and a working copy-link button.",
    demos: [{ title: "Default", node: <ShareRow url="https://amantrika.com/swarnil-weds-prachi" /> }],
  },
  {
    slug: "weather-card",
    title: "WeatherCard",
    category: "Interactive",
    description: "Static forecast tile for the big day.",
    demos: [{ title: "Default", node: <WeatherCard city="Jaipur" className="max-w-xs" /> }],
  },
  {
    slug: "micro-elements",
    title: "GlowBadge · PulseDot",
    category: "Interactive",
    description: "Small live-status elements.",
    demos: [{ title: "Together", node: <div className="flex items-center gap-4"><GlowBadge><PulseDot /> Invite is live</GlowBadge><GlowBadge>✨ New RSVP</GlowBadge></div> }],
  },
  {
    slug: "marquee",
    title: "Marquee",
    category: "Interactive",
    description: "Generic seamless scroller for logos, hashtags, icons.",
    demos: [
      { title: "Icon parade", node: <Marquee duration={14}><Shehnai className="size-8 text-primary" /><Dhol className="size-8 text-accent" /><span className="font-display text-xl font-semibold text-primary">#SwarnilWedsPrachi</span><Shehnai className="size-8 text-accent" /><Dhol className="size-8 text-primary" /></Marquee> },
    ],
  },

  /* ================= FEATURES ================= */
  {
    slug: "themed-opening",
    title: "ThemedOpening",
    category: "Features",
    description: "The invitation's grand reveal — a different animation per theme (wax seal, marigold burst, jaali gates, cathedral doors…). See all eight on the Openings page.",
    demos: [
      { title: "Royal Maroon — envelope & seal", node: <ThemedOpening theme={getTheme("royal-maroon")} style="envelope-seal" guestName="Rahul & Family" /> },
      { title: "Haldi Sunshine — marigold burst", node: <div data-theme="haldi-sunshine" className="bg-bg p-4"><ThemedOpening theme={getTheme("haldi-sunshine")} style="marigold-burst" guestName="Rahul & Family" /></div> },
      { title: "Nikah Emerald — jaali gates", node: <div data-theme="nikah-emerald" className="bg-bg p-4"><ThemedOpening theme={getTheme("nikah-emerald")} style="jaali-gates" guestName="Ahmed's cousins" /></div> },
      { title: "Cathedral White — church doors", node: <div data-theme="cathedral-white" className="bg-bg p-4"><ThemedOpening theme={getTheme("cathedral-white")} style="cathedral-doors" guestName="The Harts" /></div> },
    ],
  },
  {
    slug: "family-tree",
    title: "FamilyTree",
    category: "Features",
    description: "Two households joined by a gathbandhan knot — elders above, the couple in the middle, siblings below, connectors in the theme's ornate color.",
    demos: [
      { title: "Groom's side first", node: <FamilyTree groomSide={groomFamily} brideSide={brideFamily} /> },
      { title: "Bride's side first", note: "Respects the side chosen during onboarding.", node: <FamilyTree groomSide={groomFamily} brideSide={brideFamily} order="bride-first" /> },
    ],
  },
  {
    slug: "event-calendar",
    title: "EventCalendar",
    category: "Features",
    description: "A month grid marking every function with its own custom icon. Click a day to see what's happening; navigate months with the arrows.",
    demos: [
      { title: "Hindu wedding week", node: <EventCalendar events={couple.events} className="max-w-md" /> },
      { title: "Nikah schedule", node: <div data-theme="nikah-emerald" className="bg-bg p-4"><EventCalendar events={getCouple("ahmed-weds-fatima").events} className="max-w-md" /></div> },
    ],
  },
  {
    slug: "video-frame",
    title: "VideoFrame · VideoHero",
    category: "Features",
    description: "Ornate film players for save-the-date reels: gold controls, theme frame shapes, corner flourishes. Poster-only mode when no src is given.",
    demos: [
      { title: "Frame shapes", node: <div className="flex flex-wrap items-end gap-8"><VideoFrame posterSeed="film-arch" variant="arch" width={300} height={200} caption="Our save-the-date" /><VideoFrame posterSeed="film-pol" variant="polaroid" width={300} height={200} caption="Pre-wedding reel" /></div> },
      { title: "Cinematic hero band", node: <VideoHero posterSeed="film-hero" title="Watch our story" subtitle="three minutes, one monsoon" /> },
    ],
  },

  /* ================= SECTIONS ================= */
  {
    slug: "section-header",
    title: "SectionHeader",
    category: "Sections",
    description: "Overline + display title + optional accent-face subtitle and motif divider — the header every invite section shares.",
    demos: [
      { title: "Centered", node: <SectionHeader overline="Join us for" title="The Celebrations" subtitle="five days, one very happy family" motif="paisley" /> },
      { title: "Left aligned", node: <SectionHeader overline="Moments" title="Gallery" align="left" motif="diya" /> },
    ],
  },
  {
    slug: "themed-card",
    title: "ThemedCard",
    category: "Sections",
    description: "A card that automatically wears the active theme's border style, material and pattern wash — no per-theme branching.",
    demos: [
      { title: "Royal Maroon", node: <ThemedCard theme={getTheme("royal-maroon")} patterned><p className="text-center type-h2 text-primary">Double border · card stock</p></ThemedCard> },
      { title: "Peacock Raas", node: <div data-theme="peacock-raas" className="bg-bg p-4"><ThemedCard theme={getTheme("peacock-raas")} patterned><p className="text-center type-h2 text-primary">Scallop border · silk</p></ThemedCard></div> },
      { title: "Anand Karaj", node: <div data-theme="anand-karaj" className="bg-bg p-4"><ThemedCard theme={getTheme("anand-karaj")} patterned><p className="text-center type-h2 text-primary">Chevron border · canvas</p></ThemedCard></div> },
    ],
  },
  {
    slug: "themed-hero",
    title: "ThemedHero",
    category: "Sections",
    description: "The invite's opening spread: theme greeting in its own script, names in display-xl, the theme's material and pattern behind.",
    demos: [
      { title: "Royal Maroon", node: <ThemedHero theme={theme} names={["Swarnil", "Prachi"]} dateLabel="24 November 2026" city="Jaipur" hashtag="#SwarnilWedsPrachi" guestName="Rahul & Family" className="min-h-0 rounded-card py-16" /> },
      { title: "Mehndi Nights", node: <div data-theme="mehndi-nights" className="bg-bg"><ThemedHero theme={getTheme("mehndi-nights")} names={["Ahmed", "Fatima"]} dateLabel="18 December 2026" city="Lahore" className="min-h-0 rounded-card py-16" /></div> },
    ],
  },
  {
    slug: "our-story-section",
    title: "OurStorySection",
    category: "Sections",
    description: "The full 'how we met' spread: drop-capped story, two themed photo frames, and a connected timeline of moments.",
    demos: [
      { title: "Default", node: <OurStorySection theme={theme} story={couple.story} moments={couple.storyMoments} photos={couple.photos.slice(0, 2).map((seed) => `https://picsum.photos/seed/${seed}/260/330`)} /> },
    ],
  },
  {
    slug: "decorative-border",
    title: "DecorativeBorder",
    category: "Sections",
    description: "Twelve card-border designs masked from the theme's ornate color. Full gallery on the Borders page.",
    demos: [
      { title: "Beads · zigzag · vine", node: <div className="grid gap-5 sm:grid-cols-3">{(["beads", "zigzag", "vine"] as const).map((v) => (<DecorativeBorder key={v} variant={v}><p className="text-center type-caption">{v}</p></DecorativeBorder>))}</div> },
      { title: "Rope · jaali key · stamp", node: <div className="grid gap-5 sm:grid-cols-3">{(["rope", "meander", "stamp"] as const).map((v) => (<DecorativeBorder key={v} variant={v}><p className="text-center type-caption">{v}</p></DecorativeBorder>))}</div> },
    ],
  },

  /* ================= BRAND ================= */
  {
    slug: "logo",
    title: "Logo",
    category: "Signature",
    description:
      "The Amantrika mark — a torana arch that reads as an A, marigold at the keystone. Two colour slots only: the arch takes currentColor, the tie-beam and marigold take --logo-accent (default: the theme's accent). Switch themes above and the logo follows. Standalone files for anything outside React live in public/brand/.",
    demos: [
      {
        title: "Lockup, mark, badge",
        note: "The lockup is the default signature. The mark alone is for square slots and headers narrower than ~400px; the badge is the avatar form.",
        node: (
          <div className="flex flex-wrap items-center gap-10">
            <AmantrikaLogo />
            <AmantrikaMark className="size-10 text-primary" title="Amantrika" />
            <AmantrikaBadge title="Amantrika" />
          </div>
        ),
      },
      {
        title: "It takes the colour it is given",
        note: "No brand hexes are baked in, so the mark survives being dropped onto an accent panel or an inverted footer.",
        node: (
          <div className="flex flex-wrap items-center gap-8">
            <span className="text-primary"><AmantrikaMark className="size-10" /></span>
            <span className="text-accent"><AmantrikaMark className="size-10" /></span>
            <span
              className="rounded-card p-4 text-white"
              style={{ background: "var(--color-primary)", ["--logo-accent" as string]: "var(--color-bg)" }}
            >
              <AmantrikaMark className="size-10" />
            </span>
          </div>
        ),
      },
      {
        title: "Down to favicon size",
        note: "16px is the real test. The tie-beam is accent-coloured precisely so the A still reads once the marigold is a single pixel.",
        node: (
          <div className="flex items-end gap-6 text-primary">
            {[16, 24, 32, 48].map((px) => (
              <span key={px} className="flex flex-col items-center gap-2">
                <AmantrikaMark width={px} height={px} />
                <span className="type-caption">{px}px</span>
              </span>
            ))}
          </div>
        ),
      },
      {
        title: "Wordmark on its own",
        node: (
          <div className="flex flex-wrap items-center gap-10 text-primary">
            <AmantrikaWordmark />
            <AmantrikaWordmark swash={false} />
          </div>
        ),
      },
    ],
  },

  /* ================= NAVIGATION ================= */
  {
    slug: "navbar",
    title: "Navbar",
    category: "Navigation",
    description:
      "The product's header bar: brand slot, links with active state, an actions slot, and a real mobile drawer. Three grounds; stacks at --z-navbar.",
    demos: [
      {
        title: "Translucent (the marketing default)",
        note: "Blurred page background with a hairline rule. Narrow the window to see the mobile drawer.",
        node: (
          <Navbar
            sticky={false}
            activeHref="/showcase"
            brand={<AmantrikaLogo />}
            items={navSample}
            actions={<Button size="sm">Create yours</Button>}
          />
        ),
      },
      {
        title: "Solid",
        note: "Opaque surface — for shells that scroll content underneath a coloured page.",
        node: (
          <Navbar
            sticky={false}
            variant="solid"
            activeHref="/blog"
            brand={<AmantrikaLogo />}
            items={navSample}
            actions={<Button size="sm" variant="ghost">Sign in</Button>}
          />
        ),
      },
      {
        title: "Bare, brand only",
        note: "No links, no rule. Checkout and onboarding, where navigating away is the wrong thing to encourage.",
        node: (
          <Navbar
            sticky={false}
            variant="bare"
            brand={<AmantrikaLogo />}
            actions={<Badge tone="accent">Step 3 of 7</Badge>}
          />
        ),
      },
    ],
  },
  {
    slug: "breadcrumbs",
    title: "Breadcrumbs",
    category: "Navigation",
    description:
      "Root-to-here trail. The current page is text, not a link to itself, and the separators are hidden from screen readers.",
    demos: [
      {
        title: "Three levels",
        node: (
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/blog", label: "Blog" },
              { href: "/blog/category/guides", label: "Guides" },
              { href: "#", label: "How to word a wedding invitation" },
            ]}
          />
        ),
      },
      {
        title: "Two levels",
        node: (
          <Breadcrumbs
            items={[
              { href: "/design-system", label: "Design system" },
              { href: "#", label: "Components" },
            ]}
          />
        ),
      },
    ],
  },
  {
    slug: "side-nav",
    title: "SideNav",
    category: "Navigation",
    description: "Grouped section navigation for the docs and the dashboard, with an active row and optional trailing slots.",
    demos: [
      {
        title: "Grouped, with counts",
        node: (
          <div className="max-w-xs">
            <SideNav
              activeHref="/design-system/components"
              groups={[
                {
                  heading: "Foundations",
                  items: [
                    { href: "/design-system/tokens", label: "Tokens" },
                    { href: "/design-system/motion", label: "Motion" },
                  ],
                },
                {
                  heading: "Library",
                  items: [
                    { href: "/design-system/components", label: "Components", trailing: <Badge>82</Badge> },
                    { href: "/design-system/patterns", label: "Patterns", trailing: <Badge>10</Badge> },
                    { href: "/design-system/themes", label: "Themes", trailing: <Badge>12</Badge> },
                  ],
                },
              ]}
            />
          </div>
        ),
      },
    ],
  },
  {
    slug: "pager",
    title: "Pager",
    category: "Navigation",
    description:
      "Numbered pagination with an ellipsis window. Every page is a real link, so the blog archive stays crawlable and retrievable.",
    demos: [
      { title: "Early pages", node: <Pager page={2} totalPages={9} hrefFor={(p) => `#page-${p}`} /> },
      { title: "Deep in a long archive", node: <Pager page={14} totalPages={40} hrefFor={(p) => `#page-${p}`} /> },
      { title: "Last page", node: <Pager page={9} totalPages={9} hrefFor={(p) => `#page-${p}`} /> },
    ],
  },

  /* ================= LAYOUT ================= */
  {
    slug: "layout-section",
    title: "LayoutSection",
    category: "Layout",
    description:
      "The shell every invitation section goes through. It renders a resolved SectionStyle — surface, width, pattern, alignment, heading, divider — which is how a theme reshapes the page instead of recolouring it.",
    demos: [
      {
        title: "Four surfaces",
        note: "plain · panel · tinted · inverted. Everything else is held constant.",
        node: (
          <div>
            {(["plain", "panel", "tinted", "inverted"] as const).map((surface) => (
              <LayoutSection
                key={surface}
                id={`demo-${surface}`}
                theme={theme}
                style={{ ...defaultSectionStyle, surface, pattern: "theme", width: "regular" }}
                overline="Join us for"
                title="The Celebrations"
              >
                <p className="text-center type-body text-muted">
                  data-surface=&quot;{surface}&quot;
                </p>
              </LayoutSection>
            ))}
          </div>
        ),
      },
      {
        title: "Heading treatments",
        note: "overline-title · title-only · numbered · rule-through. Chosen per section by the theme.",
        node: (
          <div className="flex flex-col gap-8">
            {(["overline-title", "title-only", "numbered", "rule-through"] as const).map((heading, i) => (
              <SectionTitle
                key={heading}
                style={{ ...defaultSectionStyle, heading }}
                overline="Join us for"
                title="The Celebrations"
                index={i}
              />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    slug: "hero-variants",
    title: "ThemedHeroVariant",
    category: "Layout",
    description:
      "The opening spread, seven ways — the single biggest difference between two themes, because for most guests the hero is the whole invitation.",
    demos: heroVariantDemos,
  },
];

export const categories = ["Signature", "Features", "Layout", "Sections", "Navigation", "Core UI", "Ornaments", "Wedding décor", "Typography", "Timeline", "Interactive"] as const;

export function getComponentDoc(slug: string): ComponentDoc | undefined {
  return componentDocs.find((c) => c.slug === slug);
}