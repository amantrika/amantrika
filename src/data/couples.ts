export interface WeddingEvent {
  id: string;
  name: string;
  date: string; // ISO
  time: string;
  venue: string;
  address: string;
  dressCode?: string;
}

export interface CoupleData {
  slug: string;
  themeId: string;
  side: "groom" | "bride" | "together";
  partner1: { name: string; family: string };
  partner2: { name: string; family: string };
  hashtag: string;
  mainDate: string; // ISO of the main ceremony
  city: string;
  story: string;
  storyMoments: { title: string; text: string }[];
  photos: string[]; // picsum seeds
  events: WeddingEvent[];
  hotels: { name: string; distance: string; phone: string }[];
}

const lorem =
  "It began, as the best stories do, entirely by accident — a shared table at a crowded café, an argument about whose chai order was superior, and a conversation that refused to end. Somewhere between borrowed umbrellas and late-night phone calls, two families' prayers quietly found each other.";

export const couples: CoupleData[] = [
  {
    slug: "swarnil-weds-prachi",
    themeId: "royal-maroon",
    side: "together",
    partner1: { name: "Swarnil", family: "The Singh Family" },
    partner2: { name: "Prachi", family: "The Sharma Family" },
    hashtag: "#SwarnilWedsPrachi",
    mainDate: "2026-11-24T19:00:00+05:30",
    city: "Jaipur",
    story: lorem,
    storyMoments: [
      { title: "First met", text: "A monsoon evening in Pune, one shared auto-rickshaw, two very different playlists." },
      { title: "The yes", text: "Under fairy lights on a Jaipur rooftop, with the family pretending not to watch from the stairs." },
      { title: "The families met", text: "Twelve people, one dining table, three rounds of jalebi. It was settled by dessert." },
    ],
    photos: ["swpr1", "swpr2", "swpr3", "swpr4", "swpr5", "swpr6", "swpr7", "swpr8"],
    events: [
      { id: "haldi", name: "Haldi", date: "2026-11-22", time: "10:00 AM", venue: "Singh Residence", address: "14 Civil Lines, Jaipur", dressCode: "Yellow ethnic" },
      { id: "mehndi", name: "Mehndi", date: "2026-11-22", time: "4:00 PM", venue: "Garden Court", address: "Rambagh Road, Jaipur", dressCode: "Green & gold" },
      { id: "sangeet", name: "Sangeet", date: "2026-11-23", time: "7:00 PM", venue: "The Pearl Ballroom", address: "MI Road, Jaipur", dressCode: "Festive indian" },
      { id: "pheras", name: "Pheras", date: "2026-11-24", time: "7:00 PM", venue: "Sheesh Mahal Lawns", address: "Amber Fort Road, Jaipur", dressCode: "Traditional" },
      { id: "reception", name: "Reception", date: "2026-11-25", time: "7:30 PM", venue: "The Pearl Ballroom", address: "MI Road, Jaipur", dressCode: "Formal" },
    ],
    hotels: [
      { name: "Hotel Rajmahal", distance: "1.2 km from venue", phone: "+91 98••• ••210" },
      { name: "The Amber Court", distance: "2.5 km from venue", phone: "+91 97••• ••881" },
      { name: "Palace View Inn", distance: "3 km from venue", phone: "+91 96••• ••455" },
    ],
  },
  {
    slug: "ahmed-weds-fatima",
    themeId: "nikah-emerald",
    side: "together",
    partner1: { name: "Ahmed", family: "The Khan Family" },
    partner2: { name: "Fatima", family: "The Malik Family" },
    hashtag: "#AhmedAndFatima",
    mainDate: "2026-12-18T18:00:00+05:00",
    city: "Lahore",
    story: lorem,
    storyMoments: [
      { title: "First met", text: "A cousin's valima in Lahore — seated at the same table by an aunt who knew exactly what she was doing." },
      { title: "The proposal", text: "Both families over chai and mithai, and a yes that surprised no one." },
      { title: "Dua", text: "With the blessings of both households, a date was set under a Rabi-ul-Awwal moon." },
    ],
    photos: ["ahfa1", "ahfa2", "ahfa3", "ahfa4", "ahfa5", "ahfa6"],
    events: [
      { id: "dholki", name: "Dholki", date: "2026-12-15", time: "8:00 PM", venue: "Khan Residence", address: "Gulberg III, Lahore", dressCode: "Festive" },
      { id: "mehndi", name: "Mehndi", date: "2026-12-16", time: "7:00 PM", venue: "Rose Marquee", address: "Ferozepur Road, Lahore", dressCode: "Mehndi green" },
      { id: "baraat", name: "Baraat", date: "2026-12-18", time: "5:00 PM", venue: "Grand Emerald Hall", address: "Mall Road, Lahore", dressCode: "Formal shalwar" },
      { id: "nikah", name: "Nikah", date: "2026-12-18", time: "6:00 PM", venue: "Grand Emerald Hall", address: "Mall Road, Lahore", dressCode: "Traditional" },
      { id: "valima", name: "Valima", date: "2026-12-19", time: "7:30 PM", venue: "Pearl Continental", address: "Shahrah-e-Quaid-e-Azam, Lahore", dressCode: "Elegant formal" },
    ],
    hotels: [
      { name: "Pearl Continental", distance: "At venue", phone: "+92 42••• ••00" },
      { name: "Faletti's Hotel", distance: "1.8 km from venue", phone: "+92 42••• ••77" },
    ],
  },
  {
    slug: "james-weds-emily",
    themeId: "cathedral-white",
    side: "together",
    partner1: { name: "James", family: "The Whitfield Family" },
    partner2: { name: "Emily", family: "The Hart Family" },
    hashtag: "#HartOfWhitfield",
    mainDate: "2027-06-12T14:00:00+01:00",
    city: "Cotswolds",
    story: lorem,
    storyMoments: [
      { title: "First met", text: "A rainy book fair in Oxford; one copy of the same first edition, two hands on it." },
      { title: "The proposal", text: "On a walking trail above the village where Emily grew up, ring hidden in a thermos of tea." },
      { title: "The plan", text: "A June wedding at the old stone church, and dancing in a barn until the stars come out." },
    ],
    photos: ["jaem1", "jaem2", "jaem3", "jaem4", "jaem5", "jaem6"],
    events: [
      { id: "ceremony", name: "Ceremony", date: "2027-06-12", time: "2:00 PM", venue: "St. Mary's Church", address: "Church Lane, Bibury", dressCode: "Black tie optional" },
      { id: "cocktail", name: "Cocktail Hour", date: "2027-06-12", time: "4:00 PM", venue: "The Old Barn Gardens", address: "Arlington Row, Bibury", dressCode: "Garden formal" },
      { id: "reception", name: "Reception", date: "2027-06-12", time: "6:00 PM", venue: "The Old Barn", address: "Arlington Row, Bibury", dressCode: "Black tie optional" },
    ],
    hotels: [
      { name: "The Swan Hotel", distance: "0.4 mi from church", phone: "+44 12•• •••88" },
      { name: "Bibury Court", distance: "0.7 mi from church", phone: "+44 12•• •••41" },
    ],
  },
];

export function getCouple(slug?: string | null): CoupleData {
  return couples.find((c) => c.slug === slug) ?? couples[0];
}
