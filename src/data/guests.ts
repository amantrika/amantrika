export type RsvpStatus = "yes" | "no" | "maybe" | "pending";
export type GuestSide = "groom" | "bride";
export type GuestGroup = "family" | "friends" | "colleagues";

export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  group: GuestGroup;
  events: string[]; // event ids invited to
  status: RsvpStatus;
  headcount: number;
  meal: string;
}

const firstNames = [
  "Rahul", "Ananya", "Vikram", "Meera", "Arjun", "Pooja", "Karan", "Divya",
  "Rohan", "Sneha", "Aditya", "Kavita", "Nikhil", "Priya", "Sameer", "Ritu",
  "Manish", "Shreya", "Varun", "Neha", "Amit", "Isha", "Rajat", "Tanvi",
  "Suresh", "Lakshmi", "Deepak", "Anjali", "Harsh", "Payal", "Gaurav", "Simran",
  "Mohit", "Aarti", "Yash", "Nidhi", "Pranav", "Sonal", "Kunal", "Jaya",
];
const surnames = ["& Family", "", "& Family", "", "& Family", ""];
const allEvents = ["haldi", "mehndi", "sangeet", "pheras", "reception"];
const statuses: RsvpStatus[] = ["yes", "yes", "yes", "maybe", "no", "pending", "pending", "yes"];
const meals = ["Veg", "Veg", "Non-veg", "Jain", "Veg", "Non-veg"];

export const guests: Guest[] = firstNames.map((fn, i) => ({
  id: `g${i + 1}`,
  name: `${fn} ${surnames[i % surnames.length]}`.trim(),
  side: i % 2 === 0 ? "groom" : "bride",
  group: (["family", "friends", "colleagues"] as GuestGroup[])[i % 3],
  events: i % 4 === 0 ? allEvents : allEvents.slice(i % 3, (i % 3) + 3),
  status: statuses[i % statuses.length],
  headcount: (i % 4) + 1,
  meal: meals[i % meals.length],
}));
