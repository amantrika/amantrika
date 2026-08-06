import type { MotifName } from "@/design-system/motifs";
import type { PatternName } from "@/design-system/patterns";
import type { BorderStyleName } from "@/design-system/components/borders";

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
