export interface Blessing {
  id: string;
  name: string;
  message: string;
}

export const seedBlessings: Blessing[] = [
  { id: "b1", name: "Dadi", message: "May your home always smell of fresh marigolds and your evenings of good chai. Jug jug jiyo." },
  { id: "b2", name: "Rahul & Nisha", message: "Two of our favourite people becoming one household — the party better be legendary!" },
  { id: "b3", name: "Aunt Meera", message: "Wishing you a lifetime of laughter, patience during traffic, and someone who always saves you the last gulab jamun." },
  { id: "b4", name: "The Colleagues", message: "Congratulations! We expect wedding-level catering at the office party now." },
  { id: "b5", name: "Sana", message: "May every year be sweeter than the last. So happy for you both!" },
  { id: "b6", name: "Grandpa Joe", message: "Marriage advice from 52 years in: always share the blanket, never share the passwords." },
];
