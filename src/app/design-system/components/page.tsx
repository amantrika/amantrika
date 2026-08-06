"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Accordion, Avatar, Badge, Button, Card, CoupleMonogram, CountdownTimer, Divider, Drawer,
  Envelope, EventTimelineItem, GiftBlock, Input, MapEmbedPlaceholder, Modal, PhotoFrame,
  RSVPForm, Select, Stat, Stepper, Switch, Table, Tabs, Textarea, ToggleGroup, Tooltip,
  useToast, WaxSeal,
} from "@/design-system/components";
import { getCouple } from "@/data/couples";
import { getTheme } from "@/themes";
import { DsSection } from "../shell";

function Demo({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="type-h3 text-primary">{title}</h3>
      {note && <p className="mb-3 mt-1 type-caption">{note}</p>}
      <div className="mt-3 rounded-card border border-ornate/30 bg-bg p-6">{children}</div>
    </div>
  );
}

export default function ComponentsPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [toggle, setToggle] = useState("groom");
  const [switchOn, setSwitchOn] = useState(true);
  const couple = getCouple("swarnil-weds-prachi");
  const theme = getTheme(couple.themeId);

  return (
    <>
      <p className="type-overline">Component library</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Components</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        Every component draws exclusively from the token layer — switch the theme in the header and
        the whole page restyles. Do: compose ornate variants for guest-facing moments. Don&apos;t: use
        celebration buttons for destructive actions.
      </p>

      <DsSection title="Core UI" lead="Product chrome for landing, onboarding and admin.">
        <Demo title="Button" note="primary · secondary · ghost · celebration — sizes sm/md/lg, gold loading spinner.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="celebration">Celebrate 🎉</Button>
            <Button loading>Saving</Button>
            <Button size="sm" variant="secondary">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Demo>

        <Demo title="Fields" note="Ornate gold double-line focus ring — never the default blue.">
          <div className="grid max-w-xl gap-4">
            <Input label="Couple hashtag" placeholder="#SwarnilWedsPrachi" />
            <Select
              label="Wedding tradition"
              options={[
                { value: "hindu", label: "Hindu" },
                { value: "muslim", label: "Muslim" },
                { value: "sikh", label: "Sikh" },
                { value: "christian", label: "Christian" },
              ]}
            />
            <Textarea label="Your story" placeholder="It began at a crowded café…" />
          </div>
        </Demo>

        <Demo title="Card" note="plain · ornate (mehndi corners) · envelope (paper depth).">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">Plain card</Card>
            <Card variant="ornate" className="p-5">Ornate card</Card>
            <Card variant="envelope" className="p-5">Envelope paper</Card>
          </div>
        </Demo>

        <Demo title="Overlays" note="Modal, drawer, tooltip and toast (petal accent).">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Tooltip label="Shown on hover & focus"><Button variant="ghost">Hover me</Button></Tooltip>
            <Button variant="secondary" onClick={() => toast("Invitation link copied!", "success")}>Fire toast</Button>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Choose this theme?">
            <p className="type-body text-muted">Your invite will restyle instantly — nothing is lost.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </Modal>
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Guest details">
            <p className="type-body text-muted">Drawer content lives here.</p>
          </Drawer>
        </Demo>

        <Demo title="Tabs · Accordion · Badge · Avatar · Divider">
          <Tabs
            tabs={[{ id: "overview", label: "Overview" }, { id: "guests", label: "Guests" }, { id: "invite", label: "Invite" }]}
            active={tab}
            onChange={setTab}
            className="mb-5"
          />
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge tone="success">RSVP Yes</Badge>
            <Badge tone="error">Declined</Badge>
            <Badge tone="accent">Maybe</Badge>
            <Badge>Pending</Badge>
            <Avatar name="Prachi Sharma" />
            <Avatar name="Swarnil Singh" src="https://picsum.photos/seed/av1/80/80" />
          </div>
          <Divider variant="motif" motif="diya" className="mb-5" />
          <Accordion
            items={[
              { id: "a", title: "When should we send invites?", content: "Six to eight weeks before the first event." },
              { id: "b", title: "Can guests RSVP per event?", content: "Yes — the RSVP form has per-event checkboxes." },
            ]}
          />
        </Demo>

        <Demo title="Stepper" note="Onboarding steps rendered as diyas that light up when reached.">
          <Stepper steps={["Side", "Region", "Theme", "Details", "Link", "Payment"]} current={2} />
        </Demo>

        <Demo title="Table · Stat" note="Zebra ivory rows; KPI card with inline SVG sparkline.">
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Stat label="Invite views" value="2,431" delta={18} spark={[42, 58, 51, 96, 132, 118, 154, 171]} />
            <Stat label="RSVP yes" value={112} delta={6} />
            <Stat label="Headcount" value={286} delta={-2} />
          </div>
          <Table headers={["Guest", "Side", "Status"]}>
            {[["Rahul & Family", "Groom", "yes"], ["Ananya", "Bride", "maybe"], ["Vikram & Family", "Groom", "pending"]].map(([n, s, st]) => (
              <tr key={n}>
                <td className="px-4 py-2.5 font-semibold">{n}</td>
                <td className="px-4 py-2.5">{s}</td>
                <td className="px-4 py-2.5"><Badge tone={st === "yes" ? "success" : st === "maybe" ? "accent" : "neutral"}>{st}</Badge></td>
              </tr>
            ))}
          </Table>
        </Demo>

        <Demo title="ToggleGroup · Switch" note="The switch handle is a tiny gold bead.">
          <div className="flex flex-wrap items-center gap-6">
            <ToggleGroup
              label="Side"
              options={[{ value: "groom", label: "Groom's side" }, { value: "bride", label: "Bride's side" }]}
              value={toggle}
              onChange={setToggle}
            />
            <Switch checked={switchOn} onChange={setSwitchOn} label="Show blessings wall" />
          </div>
        </Demo>
      </DsSection>

      <DsSection title="Wedding-specific" lead="The signature set that makes an Amantrika invite feel like a card, not a webpage.">
        <Demo title="Envelope + WaxSeal" note="Tap the seal: seal-break → flap opens (3D) → card slides out.">
          <Envelope guestName="Rahul & Family" sealMonogram="S·P" />
        </Demo>

        <Demo title="WaxSeal · CoupleMonogram" note="Monogram ring styles: paisley / jaali / floral / laurel.">
          <div className="flex flex-wrap items-center gap-8">
            <WaxSeal monogram="A·F" />
            <CoupleMonogram initials={["S", "P"]} ring="paisley" className="size-28 text-primary" />
            <CoupleMonogram initials={["A", "F"]} ring="jaali" className="size-28 text-primary" />
            <CoupleMonogram initials={["J", "E"]} ring="laurel" className="size-28 text-primary" />
          </div>
        </Demo>

        <Demo title="CountdownTimer">
          <CountdownTimer target={couple.mainDate} />
        </Demo>

        <Demo title="EventTimelineItem" note="Add-to-calendar generates a client-side .ics blob.">
          <EventTimelineItem event={couple.events[3]} />
        </Demo>

        <Demo title="RSVPForm" note="Writes to localStorage 'amantrika:rsvps' — the admin analytics read it.">
          <RSVPForm events={couple.events} mealOptions={theme.mealOptions} />
        </Demo>

        <Demo title="PhotoFrame" note="arch · scallop · circle · polaroid, gentle tilt on hover.">
          <div className="flex flex-wrap items-end gap-6">
            <PhotoFrame seed="ds-arch" variant="arch" width={160} height={200} />
            <PhotoFrame seed="ds-scallop" variant="scallop" width={160} height={200} />
            <PhotoFrame seed="ds-circle" variant="circle" width={160} height={160} />
            <PhotoFrame seed="ds-pol" variant="polaroid" width={160} height={150} caption="Jaipur, 2024" />
          </div>
        </Demo>

        <Demo title="GiftBlock · MapEmbedPlaceholder">
          <div className="grid gap-4 sm:grid-cols-2">
            <GiftBlock />
            <MapEmbedPlaceholder venue="Sheesh Mahal Lawns" address="Amber Fort Road, Jaipur" />
          </div>
        </Demo>
      </DsSection>

      <p className="type-caption">
        PetalRain and MusicToggle are ambient full-page components — see them live on any{" "}
        <Link href="/invite/swarnil-weds-prachi" className="font-semibold text-primary underline">invitation page</Link>.
      </p>
    </>
  );
}
