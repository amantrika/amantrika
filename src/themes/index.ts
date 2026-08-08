import type { MotifName } from "@/design-system/motifs";
import type { PatternName } from "@/design-system/patterns";
import type { BorderStyleName } from "@/design-system/components/borders";
import type { ThemeLayout } from "./layout";

export * from "./layout";

export type ReligionTag = "hindu" | "muslim" | "sikh" | "christian" | "interfaith";
export type MoodTag = "royal" | "playful" | "minimal" | "festive";
export type PetalType = "marigold" | "rose" | "jasmine" | "confetti" | "none";
export type MonogramRing = "paisley" | "jaali" | "floral" | "laurel";
export type FrameStyle = "arch" | "scallop" | "circle" | "polaroid";
export type OpenStyle =
  | "envelope-seal" | "marigold-burst" | "feather-fan" | "temple-doors"
  | "jaali-gates" | "night-curtain" | "phulkari-curtain" | "cathedral-doors";

export interface Theme {
  id: string;
  name: string;
  religionTag: ReligionTag;
  regionTag: string;
  moodTag: MoodTag;
  /** Palette strip for preview cards — mirrors the [data-theme] CSS overrides
   * in globals.css, which are the styling source of truth. */
  palette: string[];
  motifSet: { corner: MotifName; divider: MotifName; accent: MotifName };
  /** repeating background texture for hero/section panels */
  pattern: PatternName;
  /** signature card-border style (DecorativeBorder variant) */
  borderStyle: BorderStyleName;
  /** physical material class for card faces (see /design-system/textures) */
  texture: string;
  /** the invitation-opening animation (ThemedOpening) */
  openStyle: OpenStyle;
  petalType: PetalType;
  monogramRing: MonogramRing;
  frameStyle: FrameStyle;
  greetingCopy: string;
  greetingScript?: "devanagari" | "arabic" | "latin";
  eventVocabulary: string[];
  mealOptions: string[];
  dressCodes: string[];
  /** Structure: which sections exist, in what order, on what ground.
   *  See ./layout.ts. This is what makes two themes different *documents*
   *  rather than the same document in two colourways. */
  layout: ThemeLayout;
}

export const themes: Theme[] = [
  {
    id: "royal-maroon",
    name: "Royal Maroon",
    religionTag: "hindu",
    regionTag: "India",
    moodTag: "royal",
    palette: ["#6B1F2A", "#C9A227", "#FBF6EC", "#8C4A2F"],
    motifSet: { corner: "mehndi-corner", divider: "paisley", accent: "kalash" },
    pattern: "paisley-damask",
    borderStyle: "double",
    texture: "paper-texture",
    openStyle: "envelope-seal",
    petalType: "marigold",
    monogramRing: "paisley",
    frameStyle: "arch",
    greetingCopy: "|| शुभ विवाह ||",
    greetingScript: "devanagari",
    eventVocabulary: ["Haldi", "Mehndi", "Sangeet", "Pheras", "Reception"],
    mealOptions: ["Veg", "Jain", "Non-veg"],
    dressCodes: ["Yellow ethnic", "Green & gold", "Festive indian", "Traditional", "Formal"],
    // A formal card: the blessing verse opens it, the ceremonies are the
    // centrepiece on a dark panel, and everything sits in one measured column.
    layout: {
      hero: "arch-window",
      rhythm: "balanced",
      contentWidth: "regular",
      ornament: "rich",
      order: ["verse", "countdown", "story", "events", "family", "gallery", "rsvp", "blessings", "travel", "gift"],
      sections: {
        verse: { surface: "tinted", width: "narrow", heading: "none", pattern: "paisley-damask" },
        events: { surface: "inverted", width: "wide", heading: "numbered", pattern: "theme" },
        family: { surface: "panel", pattern: "theme" },
        gallery: { width: "wide", heading: "title-only" },
        rsvp: { surface: "tinted", width: "narrow" },
        travel: { width: "wide" },
      },
      footer: "ornate",
    },
  },
  {
    id: "haldi-sunshine",
    name: "Haldi Sunshine",
    religionTag: "hindu",
    regionTag: "India",
    moodTag: "playful",
    palette: ["#D99000", "#E4611C", "#FFF6DF", "#4A2E0C"],
    motifSet: { corner: "marigold", divider: "marigold", accent: "mango-leaf" },
    pattern: "marigold-scatter",
    borderStyle: "beads",
    texture: "texture-watercolor",
    openStyle: "marigold-burst",
    petalType: "marigold",
    monogramRing: "floral",
    frameStyle: "circle",
    greetingCopy: "Shubh Vivah!",
    greetingScript: "latin",
    eventVocabulary: ["Haldi", "Mehndi", "Sangeet", "Wedding", "Reception"],
    mealOptions: ["Veg", "Jain", "Non-veg"],
    dressCodes: ["All yellow!", "Mehndi green", "Sparkle", "Traditional", "Party"],
    // Loud and photo-led: the gallery comes before the story, the countdown is
    // a full-width shout, and nothing is allowed much breathing room.
    layout: {
      hero: "split-portrait",
      rhythm: "dense",
      contentWidth: "wide",
      ornament: "rich",
      order: ["countdown", "events", "gallery", "story", "family", "rsvp", "blessings", "travel", "gift"],
      sections: {
        countdown: { surface: "inverted", width: "full", heading: "none", divider: "none", pattern: "marigold-scatter" },
        events: { surface: "tinted", align: "left", heading: "numbered", pattern: "theme" },
        gallery: { width: "full", heading: "title-only", divider: "rule" },
        story: { surface: "panel", width: "narrow", align: "left" },
        rsvp: { surface: "tinted", width: "narrow" },
      },
      footer: "centered",
    },
  },
  {
    id: "peacock-raas",
    name: "Peacock Raas",
    religionTag: "hindu",
    regionTag: "India",
    moodTag: "festive",
    palette: ["#14595B", "#D63A6A", "#EDF8F6", "#C9A227"],
    motifSet: { corner: "peacock-feather", divider: "peacock-feather", accent: "diya" },
    pattern: "feather-eyes",
    borderStyle: "scallop",
    texture: "texture-silk",
    openStyle: "feather-fan",
    petalType: "rose",
    monogramRing: "floral",
    frameStyle: "scallop",
    greetingCopy: "કંકોત્રી — With joy in our hearts",
    greetingScript: "latin",
    eventVocabulary: ["Mehndi", "Garba", "Haldi", "Hasta Melap", "Reception"],
    mealOptions: ["Veg", "Jain"],
    dressCodes: ["Chaniya choli", "Festive", "Traditional", "Formal", "Garba-ready"],
    // Garba first. The events run as a banner-wide inverted band, the way a
    // Gujarati kankotri leads with the nights rather than the couple.
    layout: {
      hero: "banner-scroll",
      rhythm: "dense",
      contentWidth: "regular",
      ornament: "rich",
      order: ["verse", "events", "countdown", "gallery", "family", "story", "rsvp", "blessings", "travel"],
      sections: {
        verse: { surface: "panel", width: "narrow", heading: "none", pattern: "feather-eyes" },
        events: { surface: "inverted", width: "wide", heading: "numbered", pattern: "feather-eyes" },
        countdown: { surface: "tinted", heading: "title-only", divider: "rule" },
        gallery: { width: "wide", heading: "title-only" },
        family: { surface: "panel" },
        rsvp: { surface: "tinted", width: "narrow" },
      },
      footer: "ornate",
    },
  },
  {
    id: "temple-south",
    name: "Temple South",
    religionTag: "hindu",
    regionTag: "India",
    moodTag: "minimal",
    palette: ["#1E5631", "#C9A227", "#FBF6EC", "#22301F"],
    motifSet: { corner: "mango-leaf", divider: "diya", accent: "kalash" },
    pattern: "kolam-steps",
    borderStyle: "zigzag",
    texture: "texture-linen",
    openStyle: "temple-doors",
    petalType: "jasmine",
    monogramRing: "paisley",
    frameStyle: "arch",
    greetingCopy: "திருமண அழைப்பிதழ்",
    greetingScript: "latin",
    eventVocabulary: ["Nichayathartham", "Mehndi", "Muhurtham", "Reception"],
    mealOptions: ["Veg", "Jain", "Non-veg"],
    dressCodes: ["Pattu saree / veshti", "Traditional", "Silk & gold", "Formal"],
    // A muhurtham card is a document, not a poster: one narrow column, long
    // silences between sections, rules instead of flourishes, photos last.
    layout: {
      hero: "verse-first",
      rhythm: "airy",
      contentWidth: "narrow",
      ornament: "light",
      // No `verse` section: the verse-first hero already carries the invocation,
      // and repeating it below would read as a mistake rather than a motif.
      order: ["events", "family", "countdown", "travel", "rsvp", "gallery", "blessings"],
      sections: {
        events: { heading: "rule-through", align: "left", divider: "rule" },
        family: { surface: "tinted", heading: "rule-through" },
        countdown: { heading: "title-only", divider: "none" },
        travel: { width: "regular", heading: "rule-through", divider: "rule" },
        gallery: { width: "regular", heading: "title-only", divider: "rule" },
      },
      footer: "minimal",
    },
  },
  {
    id: "nikah-emerald",
    name: "Nikah Emerald",
    religionTag: "muslim",
    regionTag: "Pakistan · Middle East",
    moodTag: "royal",
    palette: ["#146B4A", "#C9A227", "#F2F8F2", "#11332A"],
    motifSet: { corner: "jaali-pattern", divider: "crescent-star", accent: "jaali-pattern" },
    pattern: "star-jaali",
    borderStyle: "meander",
    texture: "texture-linen",
    openStyle: "jaali-gates",
    petalType: "rose",
    monogramRing: "jaali",
    frameStyle: "arch",
    greetingCopy: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    greetingScript: "arabic",
    eventVocabulary: ["Mehndi", "Baraat", "Nikah", "Valima"],
    mealOptions: ["Halal", "Halal veg"],
    dressCodes: ["Mehndi green", "Formal shalwar", "Traditional", "Elegant formal"],
    // The Bismillah opens it and sets the tone: geometry rather than florals,
    // rules rather than motifs, and no photograph before the ceremony details.
    layout: {
      hero: "arch-window",
      rhythm: "airy",
      contentWidth: "regular",
      ornament: "light",
      order: ["verse", "countdown", "events", "family", "travel", "rsvp", "gallery", "blessings"],
      sections: {
        verse: { surface: "tinted", width: "narrow", heading: "none", pattern: "star-jaali", divider: "none" },
        countdown: { heading: "title-only", divider: "rule" },
        events: { surface: "panel", width: "wide", heading: "numbered", pattern: "star-jaali", divider: "rule" },
        family: { heading: "rule-through", divider: "rule" },
        travel: { surface: "tinted", width: "wide", divider: "rule" },
        rsvp: { width: "narrow", divider: "rule" },
        gallery: { width: "wide", heading: "title-only", divider: "rule" },
      },
      footer: "ornate",
    },
  },
  {
    id: "mehndi-nights",
    name: "Mehndi Nights",
    religionTag: "muslim",
    regionTag: "Pakistan",
    moodTag: "festive",
    palette: ["#B565D8", "#CFCFDC", "#2A1533", "#F5ECF8"],
    motifSet: { corner: "jaali-pattern", divider: "crescent-star", accent: "paisley" },
    pattern: "night-sky",
    borderStyle: "vine",
    texture: "texture-silk",
    openStyle: "night-curtain",
    petalType: "rose",
    monogramRing: "jaali",
    frameStyle: "scallop",
    greetingCopy: "Together, under the night sky",
    greetingScript: "latin",
    eventVocabulary: ["Dholki", "Mehndi", "Baraat", "Nikah", "Valima"],
    mealOptions: ["Halal", "Halal veg"],
    dressCodes: ["Bright & bold", "Mehndi colours", "Traditional", "Formal", "Festive"],
    // Already a dark page, so contrast comes from panels rather than inversion.
    // Photograph-forward and edge to edge — it should feel like a night shoot.
    layout: {
      hero: "full-bleed-photo",
      rhythm: "balanced",
      contentWidth: "wide",
      ornament: "rich",
      order: ["countdown", "gallery", "events", "story", "family", "rsvp", "blessings", "travel", "gift"],
      sections: {
        countdown: { width: "full", heading: "none", divider: "none", pattern: "night-sky" },
        gallery: { width: "full", heading: "title-only", divider: "rule" },
        events: { surface: "panel", heading: "numbered", pattern: "night-sky" },
        story: { surface: "tinted", width: "narrow", align: "left" },
        rsvp: { surface: "panel", width: "narrow" },
        blessings: { surface: "tinted" },
      },
      footer: "centered",
    },
  },
  {
    id: "anand-karaj",
    name: "Anand Karaj",
    religionTag: "sikh",
    regionTag: "India · Punjab",
    moodTag: "royal",
    palette: ["#D97700", "#1C2A4A", "#FFF7E9", "#C9A227"],
    motifSet: { corner: "jaali-pattern", divider: "paisley", accent: "kalash" },
    pattern: "phulkari",
    borderStyle: "chevron",
    texture: "texture-canvas",
    openStyle: "phulkari-curtain",
    petalType: "marigold",
    monogramRing: "floral",
    frameStyle: "arch",
    greetingCopy: "ੴ — Waheguru Ji Ka Khalsa",
    greetingScript: "latin",
    eventVocabulary: ["Mehndi", "Kirtan", "Anand Karaj", "Langar", "Reception"],
    mealOptions: ["Veg (Langar)", "Non-veg (Reception)"],
    dressCodes: ["Phulkari colours", "Traditional", "Saffron & navy", "Formal", "Festive"],
    // Families before photographs: an Anand Karaj card names the households
    // early and treats the langar and the ceremony as one continuous itinerary.
    layout: {
      hero: "centered-monogram",
      rhythm: "balanced",
      contentWidth: "regular",
      ornament: "rich",
      order: ["verse", "events", "family", "countdown", "gallery", "travel", "rsvp", "blessings", "gift"],
      sections: {
        verse: { surface: "inverted", width: "narrow", heading: "none", pattern: "phulkari", divider: "none" },
        events: { surface: "panel", width: "wide", heading: "numbered", pattern: "phulkari" },
        family: { surface: "tinted", pattern: "phulkari" },
        gallery: { width: "wide", heading: "title-only" },
        travel: { width: "wide" },
        rsvp: { surface: "panel", width: "narrow" },
      },
      footer: "ornate",
    },
  },
  {
    id: "cathedral-white",
    name: "Cathedral White",
    religionTag: "christian",
    regionTag: "International",
    moodTag: "minimal",
    palette: ["#6E7F6B", "#C2AB72", "#FDFDFB", "#3A4038"],
    motifSet: { corner: "olive-branch", divider: "olive-branch", accent: "church-arch" },
    pattern: "laurel-sprig",
    borderStyle: "triple",
    texture: "texture-linen",
    openStyle: "cathedral-doors",
    petalType: "confetti",
    monogramRing: "laurel",
    frameStyle: "polaroid",
    greetingCopy: "Together with their families",
    greetingScript: "latin",
    eventVocabulary: ["Ceremony", "Cocktail Hour", "Reception"],
    mealOptions: ["Standard", "Vegetarian", "Vegan"],
    dressCodes: ["Black tie optional", "Garden formal", "Cocktail"],
    // The restrained end of the range: four sections, no motifs, enormous
    // silences. Everything it does is by leaving things out.
    layout: {
      hero: "minimal-type",
      rhythm: "cathedral",
      contentWidth: "narrow",
      ornament: "none",
      order: ["verse", "story", "events", "gallery", "rsvp", "travel"],
      sections: {
        verse: { heading: "none", align: "center" },
        story: { align: "left", heading: "rule-through" },
        events: { heading: "rule-through", align: "left" },
        gallery: { width: "regular", heading: "title-only" },
        rsvp: { surface: "panel", heading: "rule-through" },
        travel: { width: "regular", heading: "rule-through" },
      },
      footer: "minimal",
    },
  },

  /* ---------------- Added alongside the layout model ----------------
     These exist to widen the *structural* range, not the palette: a
     photograph-led beach card, a block-print card that reads left-aligned like
     a printed programme, a banner-led Banarasi card, and a stripped-back
     modern one. */

  {
    id: "bandhani-blush",
    name: "Bandhani Blush",
    religionTag: "hindu",
    regionTag: "India · Rajasthan",
    moodTag: "playful",
    palette: ["#C2185B", "#F7C948", "#FFF1F4", "#4A1229"],
    motifSet: { corner: "mehndi-corner", divider: "marigold", accent: "paisley" },
    pattern: "bandhani",
    borderStyle: "stamp",
    texture: "texture-speckle",
    openStyle: "marigold-burst",
    petalType: "rose",
    monogramRing: "floral",
    frameStyle: "polaroid",
    greetingCopy: "पधारो सा — Come celebrate with us",
    greetingScript: "devanagari",
    eventVocabulary: ["Mehndi", "Haldi", "Sangeet", "Pheras", "Reception"],
    mealOptions: ["Veg", "Jain", "Non-veg"],
    dressCodes: ["Bandhani brights", "Rajputi", "Festive", "Traditional", "Formal"],
    // Scrapbook energy: photographs open it, the story is told left-aligned
    // like handwriting, and the ceremonies come after the mood is set.
    layout: {
      hero: "split-portrait",
      rhythm: "dense",
      contentWidth: "wide",
      ornament: "light",
      order: ["gallery", "countdown", "story", "events", "family", "rsvp", "blessings", "travel", "gift"],
      sections: {
        gallery: { width: "full", heading: "none", divider: "none" },
        countdown: { surface: "tinted", heading: "title-only", divider: "none", pattern: "bandhani" },
        story: { width: "narrow", align: "left", heading: "rule-through" },
        events: { surface: "panel", align: "left", heading: "numbered", pattern: "bandhani" },
        rsvp: { surface: "inverted", width: "narrow" },
      },
      footer: "centered",
    },
  },
  {
    id: "banarasi-gold",
    name: "Banarasi Gold",
    religionTag: "hindu",
    regionTag: "India · Banaras",
    moodTag: "royal",
    palette: ["#7B1E3A", "#C9A227", "#FFF8EA", "#3A1020"],
    motifSet: { corner: "mehndi-corner", divider: "paisley", accent: "kalash" },
    pattern: "buti-block",
    borderStyle: "meander",
    texture: "texture-goldleaf",
    openStyle: "temple-doors",
    petalType: "marigold",
    monogramRing: "paisley",
    frameStyle: "arch",
    greetingCopy: "|| श्री गणेशाय नमः ||",
    greetingScript: "devanagari",
    eventVocabulary: ["Tilak", "Haldi", "Mehndi", "Sangeet", "Vivah", "Reception"],
    mealOptions: ["Veg", "Jain"],
    dressCodes: ["Banarasi silk", "Traditional", "Gold & maroon", "Formal", "Festive"],
    // Woven-brocade maximalism: wide bands, heavy panels, a motif on almost
    // every section, and the itinerary numbered like a printed programme.
    layout: {
      hero: "banner-scroll",
      rhythm: "balanced",
      contentWidth: "wide",
      ornament: "rich",
      order: ["verse", "countdown", "events", "family", "story", "gallery", "travel", "rsvp", "blessings", "gift"],
      sections: {
        verse: { surface: "inverted", width: "narrow", heading: "none", pattern: "buti-block", divider: "none" },
        countdown: { surface: "tinted", heading: "title-only", pattern: "buti-block" },
        events: { surface: "panel", heading: "numbered", pattern: "paisley-damask" },
        family: { surface: "tinted", pattern: "buti-block" },
        story: { width: "narrow", align: "left" },
        gallery: { width: "wide", heading: "title-only" },
        travel: { surface: "panel", width: "wide" },
        rsvp: { surface: "inverted", width: "narrow" },
      },
      footer: "ornate",
    },
  },
  {
    id: "coastal-lagoon",
    name: "Coastal Lagoon",
    religionTag: "interfaith",
    regionTag: "Goa · Kerala · destination",
    moodTag: "minimal",
    palette: ["#0E7C86", "#E8B25F", "#F4FBFB", "#123338"],
    motifSet: { corner: "olive-branch", divider: "olive-branch", accent: "mango-leaf" },
    pattern: "laurel-sprig",
    borderStyle: "thread",
    texture: "texture-watercolor",
    openStyle: "night-curtain",
    petalType: "jasmine",
    monogramRing: "laurel",
    frameStyle: "circle",
    greetingCopy: "Sun, sea, and the two of us",
    greetingScript: "latin",
    eventVocabulary: ["Welcome Dinner", "Beach Mehndi", "Ceremony", "Sundowner", "Brunch"],
    mealOptions: ["Veg", "Non-veg", "Seafood", "Vegan"],
    dressCodes: ["Beach formal", "Linen & pastels", "Resort chic", "Barefoot"],
    // A destination card is a travel document first: where to be and when,
    // ahead of ornament. Photographs are the argument, so they run full bleed.
    layout: {
      hero: "full-bleed-photo",
      rhythm: "airy",
      contentWidth: "wide",
      ornament: "light",
      order: ["story", "events", "gallery", "travel", "countdown", "rsvp", "blessings"],
      sections: {
        story: { width: "narrow", align: "left", heading: "rule-through", divider: "none" },
        events: { surface: "tinted", align: "left", heading: "numbered", divider: "rule" },
        gallery: { width: "full", heading: "title-only", divider: "none" },
        travel: { surface: "panel", width: "wide", heading: "overline-title", pattern: "laurel-sprig" },
        countdown: { heading: "title-only", divider: "none" },
        rsvp: { surface: "inverted", width: "narrow", divider: "none" },
      },
      footer: "minimal",
    },
  },
  {
    id: "ivory-minimal",
    name: "Ivory Minimal",
    religionTag: "interfaith",
    regionTag: "International",
    moodTag: "minimal",
    palette: ["#1F1F1D", "#A8926B", "#FAFAF7", "#6B6B63"],
    motifSet: { corner: "olive-branch", divider: "olive-branch", accent: "olive-branch" },
    pattern: "laurel-sprig",
    borderStyle: "thread",
    texture: "texture-linen",
    openStyle: "envelope-seal",
    petalType: "none",
    monogramRing: "laurel",
    frameStyle: "polaroid",
    greetingCopy: "Save the date",
    greetingScript: "latin",
    eventVocabulary: ["Ceremony", "Dinner", "Party"],
    mealOptions: ["Standard", "Vegetarian", "Vegan"],
    dressCodes: ["Formal", "Cocktail", "Smart casual"],
    // The floor of the range. Four sections, no ornament at all, one narrow
    // column — the control case that proves the layout model isn't decorative.
    layout: {
      hero: "minimal-type",
      rhythm: "cathedral",
      contentWidth: "narrow",
      ornament: "none",
      order: ["events", "story", "rsvp", "travel"],
      sections: {
        events: { align: "left", heading: "rule-through" },
        story: { align: "left", heading: "rule-through" },
        rsvp: { surface: "panel", heading: "rule-through" },
        travel: { align: "left", heading: "rule-through" },
      },
      footer: "minimal",
    },
  },
];

export const defaultThemeId = "royal-maroon";

export function getTheme(id?: string | null): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}

/** UI-only region → tradition pre-filtering (chips, not walls). */
export function suggestedReligions(country: string): ReligionTag[] | null {
  const c = country.toLowerCase();
  if (["pakistan", "uae", "saudi arabia", "qatar", "bangladesh"].includes(c)) return ["muslim"];
  if (["usa", "united states", "uk", "united kingdom", "australia", "canada", "germany", "france", "italy"].includes(c))
    return ["christian", "interfaith"];
  return null; // India & everywhere else: show all
}
