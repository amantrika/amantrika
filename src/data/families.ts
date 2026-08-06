import type { FamilySide } from "@/design-system/components";

export const groomFamily: FamilySide = {
  household: "The Singh Family",
  partner: { name: "Swarnil", relation: "The groom", seed: "fam-swarnil" },
  elders: [
    { name: "Rajesh Singh", relation: "Father of the groom", seed: "fam-g-dad" },
    { name: "Sunita Singh", relation: "Mother of the groom", seed: "fam-g-mom" },
  ],
  siblings: [
    { name: "Ishita", relation: "Sister", seed: "fam-g-sis" },
    { name: "Aryan", relation: "Cousin", seed: "fam-g-cou" },
  ],
};

export const brideFamily: FamilySide = {
  household: "The Sharma Family",
  partner: { name: "Prachi", relation: "The bride", seed: "fam-prachi" },
  elders: [
    { name: "Mohan Sharma", relation: "Father of the bride", seed: "fam-b-dad" },
    { name: "Kavita Sharma", relation: "Mother of the bride", seed: "fam-b-mom" },
  ],
  siblings: [
    { name: "Nikhil", relation: "Brother", seed: "fam-b-bro" },
    { name: "Tanvi", relation: "Cousin", seed: "fam-b-cou" },
  ],
};
