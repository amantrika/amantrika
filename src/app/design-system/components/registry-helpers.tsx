"use client";

import { useState } from "react";

/* Re-export the whole component library for the registry, plus tiny
 * stateful demo wrappers that need local state. */
export * from "@/design-system/components";

import { Avatar, Badge, Chip, Divider, RatingDiyas, Switch, ToggleGroup } from "@/design-system/components";

function BadgeAvatarDivider() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="success">RSVP Yes</Badge>
        <Badge tone="error">Declined</Badge>
        <Badge tone="accent">Maybe</Badge>
        <Badge tone="primary">VIP</Badge>
        <Badge>Pending</Badge>
        <Avatar name="Prachi Sharma" />
        <Avatar name="Swarnil Singh" src="https://picsum.photos/seed/avat/80/80" />
      </div>
      <Divider variant="motif" motif="diya" />
      <Divider variant="motif" motif="paisley" />
    </div>
  );
}

function Toggles() {
  const [side, setSide] = useState("groom");
  const [on, setOn] = useState(true);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <ToggleGroup
        label="Side"
        options={[{ value: "groom", label: "Groom's side" }, { value: "bride", label: "Bride's side" }]}
        value={side}
        onChange={setSide}
      />
      <Switch checked={on} onChange={setOn} label="Show blessings wall" />
    </div>
  );
}

function Chips() {
  const [sel, setSel] = useState<string[]>(["Royal"]);
  return (
    <div className="flex flex-wrap gap-2">
      {["Royal", "Playful", "Minimal", "Festive", "Hindu", "Muslim", "Sikh", "Christian"].map((m) => (
        <Chip
          key={m}
          label={m}
          selected={sel.includes(m)}
          onClick={() => setSel((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}
        />
      ))}
    </div>
  );
}

function Rating() {
  const [v, setV] = useState(3);
  return <RatingDiyas value={v} onChange={setV} />;
}

export const StatelessDemos = { BadgeAvatarDivider, Toggles, Chips, Rating };
