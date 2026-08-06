"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, QrCode, RefreshCcw, Search } from "lucide-react";
import { getCouple, type CoupleData } from "@/data/couples";
import { guests as mockGuests, type Guest } from "@/data/guests";
import { activityFeed, uniqueGuests, viewsByDay } from "@/data/analytics";
import { store, type RsvpEntry } from "@/lib/store";
import { getTheme, themes } from "@/themes";
import {
  Badge, Button, Card, CoupleMonogram, Divider, Input, Modal, Select, Sparkline, Stat, Switch,
  Table, Tabs, Textarea, ToastProvider, ToggleGroup, useToast,
} from "@/design-system/components";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "guests", label: "Guests" },
  { id: "invite", label: "Invite" },
  { id: "settings", label: "Settings" },
];

function statusTone(s: string) {
  return s === "yes" ? ("success" as const) : s === "no" ? ("error" as const) : s === "maybe" ? ("accent" as const) : ("neutral" as const);
}

function AdminInner() {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [side, setSide] = useState<"groom" | "bride">("groom");
  const [couple, setCouple] = useState<CoupleData>(() => getCouple(null));
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [extraGuests, setExtraGuests] = useState<Guest[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const live = store.getLiveInvite();
    if (live) setCouple(live);
    setRsvps(store.getRsvps());
  }, []);

  const theme = getTheme(couple.themeId);
  const allGuests = useMemo(() => [...extraGuests, ...mockGuests], [extraGuests]);
  const teamName = side === "groom" ? couple.partner1.name : couple.partner2.name;

  const yes = allGuests.filter((g) => g.status === "yes").length + rsvps.filter((r) => r.attending === "yes").length;
  const no = allGuests.filter((g) => g.status === "no").length + rsvps.filter((r) => r.attending === "no").length;
  const maybe = allGuests.filter((g) => g.status === "maybe").length + rsvps.filter((r) => r.attending === "maybe").length;
  const headcount =
    allGuests.filter((g) => g.status === "yes").reduce((s, g) => s + g.headcount, 0) +
    rsvps.filter((r) => r.attending === "yes").reduce((s, r) => s + r.headcount, 0);

  const mealCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of allGuests.filter((g) => g.status === "yes")) counts.set(g.meal, (counts.get(g.meal) ?? 0) + g.headcount);
    for (const r of rsvps.filter((r) => r.attending === "yes")) counts.set(r.meal, (counts.get(r.meal) ?? 0) + r.headcount);
    return [...counts.entries()];
  }, [allGuests, rsvps]);

  const byEvent = useMemo(() => {
    return couple.events.map((ev) => ({
      name: ev.name,
      count:
        allGuests.filter((g) => g.status === "yes" && g.events.includes(ev.id)).length +
        rsvps.filter((r) => r.attending === "yes" && r.events.includes(ev.id)).length,
    }));
  }, [couple.events, allGuests, rsvps]);

  const maxEvent = Math.max(1, ...byEvent.map((e) => e.count));
  const groomCount = allGuests.filter((g) => g.side === "groom").length;
  const brideCount = allGuests.filter((g) => g.side === "bride").length;
  const donutTotal = groomCount + brideCount || 1;
  const groomFrac = groomCount / donutTotal;

  const filteredGuests = allGuests.filter(
    (g) =>
      g.side === side &&
      (statusFilter === "all" || g.status === statusFilter) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  );

  const liveRsvpsMerged = [...viewsByDay];
  liveRsvpsMerged[liveRsvpsMerged.length - 1] += rsvps.length * 3;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="border-b border-ornate/40 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <CoupleMonogram initials={[couple.partner1.name[0] ?? "S", couple.partner2.name[0] ?? "P"]} ring={theme.monogramRing} className="size-12 text-primary" />
            <div>
              <p className="font-display text-xl font-semibold text-primary">
                {couple.partner1.name} &amp; {couple.partner2.name}
              </p>
              <p className="type-caption">Welcome, Team {teamName}! 🎊</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ToggleGroup
              label="Viewing as"
              options={[{ value: "groom", label: `${couple.partner1.name}'s side` }, { value: "bride", label: `${couple.partner2.name}'s side` }]}
              value={side}
              onChange={(v) => setSide(v as "groom" | "bride")}
            />
            <Link href="/" className="type-caption hover:text-primary">← Amantrika</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-8" />

        {/* ============ OVERVIEW ============ */}
        {tab === "overview" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Invite views" value={liveRsvpsMerged.reduce((a, b) => a + b, 0).toLocaleString()} delta={18} spark={liveRsvpsMerged} />
              <Stat label="Unique guests" value={uniqueGuests} delta={9} />
              <Stat label={`RSVPs · ${yes} yes`} value={`${no} no · ${maybe} maybe`} />
              <Stat label="Total headcount" value={headcount} delta={4} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6 lg:col-span-2">
                <p className="type-overline mb-4">14-day invite views</p>
                <Sparkline data={liveRsvpsMerged} className="h-28 w-full text-primary" />
                <Divider variant="motif" motif={theme.motifSet.divider} className="my-6" />
                <p className="type-overline mb-4">RSVPs by event</p>
                <div className="flex flex-col gap-3">
                  {byEvent.map((ev) => (
                    <div key={ev.name} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm font-semibold">{ev.name}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded-pill bg-foreground/8">
                        <div className="h-full rounded-pill bg-primary" style={{ width: `${(ev.count / maxEvent) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm tabular-nums text-muted">{ev.count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex flex-col gap-6">
                <Card className="p-6">
                  <p className="type-overline mb-4">Guests by side</p>
                  <div className="flex items-center gap-5">
                    <svg viewBox="0 0 42 42" className="size-28 -rotate-90">
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-accent)" strokeWidth="6" />
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-primary)" strokeWidth="6"
                        strokeDasharray={`${groomFrac * 100} ${100 - groomFrac * 100}`} strokeDashoffset="0" pathLength={100} />
                    </svg>
                    <div className="text-sm">
                      <p><span className="mr-2 inline-block size-3 rounded-sm bg-primary" />{couple.partner1.name}&apos;s · {groomCount}</p>
                      <p className="mt-1"><span className="mr-2 inline-block size-3 rounded-sm bg-accent" />{couple.partner2.name}&apos;s · {brideCount}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <p className="type-overline mb-3">Meals (confirmed)</p>
                  {mealCounts.map(([m, c]) => (
                    <p key={m} className="flex justify-between text-sm"><span>{m}</span><span className="font-bold tabular-nums">{c}</span></p>
                  ))}
                </Card>
              </div>
            </div>

            <Card className="p-6">
              <p className="type-overline mb-4">Live activity</p>
              <ul className="divide-y divide-ornate/15">
                {rsvps.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span><strong>{r.guestName}</strong> RSVP&apos;d {r.attending} · {r.headcount} guests</span>
                    <span className="shrink-0 text-muted">just now</span>
                  </li>
                ))}
                {activityFeed.map((a) => (
                  <li key={a.who + a.when} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span><strong>{a.who}</strong> {a.what}</span>
                    <span className="shrink-0 text-muted">{a.when}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* ============ GUESTS ============ */}
        {tab === "guests" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  aria-label="Search guests"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guests…"
                  className="rounded-pill border border-ornate/50 bg-raised py-2 pl-9 pr-4 text-sm outline-none focus:border-ornate"
                />
              </div>
              {["all", "yes", "no", "maybe", "pending"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-pill border px-3 py-1.5 text-xs font-bold uppercase tracking-wide cursor-pointer ${statusFilter === s ? "border-ornate bg-primary text-bg" : "border-ornate/40 text-muted"}`}
                >
                  {s}
                </button>
              ))}
              <span className="flex-1" />
              {selected.size > 0 && (
                <Button size="sm" variant="secondary" onClick={() => { toast(`WhatsApp reminder queued for ${selected.size} guests (demo)`, "success"); setSelected(new Set()); }}>
                  Send WhatsApp reminder ({selected.size})
                </Button>
              )}
              <Button size="sm" onClick={() => setAddOpen(true)}>Add guest</Button>
            </div>

            <Table headers={["", "Guest", "Group", "Events", "Status", "Heads", "Meal", ""]}>
              {filteredGuests.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${g.name}`}
                      checked={selected.has(g.id)}
                      onChange={() => setSelected((cur) => { const n = new Set(cur); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{g.name}</td>
                  <td className="px-4 py-2.5 capitalize text-muted">{g.group}</td>
                  <td className="px-4 py-2.5 text-muted">{g.events.length} events</td>
                  <td className="px-4 py-2.5"><Badge tone={statusTone(g.status)}>{g.status}</Badge></td>
                  <td className="px-4 py-2.5 tabular-nums">{g.headcount}</td>
                  <td className="px-4 py-2.5">{g.meal}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invite/${couple.slug}?g=${encodeURIComponent(g.name)}`); toast(`Personal link copied for ${g.name}`, "success"); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent cursor-pointer"
                    >
                      <Copy className="size-3.5" /> Copy link
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
            <p className="type-caption">{filteredGuests.length} guests on {teamName}&apos;s side.</p>

            <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add guest">
              <AddGuestForm
                side={side}
                onAdd={(g) => { setExtraGuests((cur) => [g, ...cur]); setAddOpen(false); toast(`${g.name} added`, "success"); }}
              />
            </Modal>
          </div>
        )}

        {/* ============ INVITE ============ */}
        {tab === "invite" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Card variant="ornate" className="p-6">
                <p className="type-overline mb-2">Your permalink</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-soft bg-bg px-3 py-2 text-sm font-semibold text-primary">
                    amantrika.com/{couple.slug}
                  </code>
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/invite/${couple.slug}`); toast("Invite link copied", "success"); }}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-soft border border-dashed border-ornate/60 p-4">
                  <QrCode className="size-14 text-muted" />
                  <p className="type-caption">QR code placeholder — print it on physical cards.</p>
                </div>
              </Card>

              <Card className="p-6">
                <p className="type-overline mb-3">Live theme</p>
                <Select
                  label=""
                  aria-label="Invite theme"
                  value={couple.themeId}
                  onChange={(e) => {
                    const themeId = e.target.value;
                    setCouple((c) => ({ ...c, themeId }));
                    store.updateLiveInvite({ themeId });
                    toast(`Theme switched to ${getTheme(themeId).name}`, "success");
                  }}
                  options={themes.map((t) => ({ value: t.id, label: t.name }))}
                />
                <Divider className="my-5" />
                <p className="type-overline mb-3">Sections</p>
                {[["gift", "Gift block"], ["blessings", "Blessings wall"]].map(([key, label]) => (
                  <Switch
                    key={key}
                    className="mb-2 block"
                    label={`Show ${label}`}
                    checked={!hidden.has(key)}
                    onChange={(on) => {
                      setHidden((cur) => { const n = new Set(cur); if (on) n.delete(key); else n.add(key); return n; });
                      const next = new Set(hidden); if (hidden.has(key)) next.delete(key); else next.add(key);
                      store.updateLiveInvite({ ...( { hiddenSections: [...next] } as Partial<CoupleData>) });
                    }}
                  />
                ))}
              </Card>
            </div>

            <Card className="p-6">
              <p className="type-overline mb-4">Live preview</p>
              <div className="mx-auto w-64 overflow-hidden rounded-[2rem] border-8 border-ink shadow-lifted">
                <iframe title="Invite preview" src={`/invite/${couple.slug}?theme=${couple.themeId}`} className="h-[480px] w-full bg-bg" />
              </div>
            </Card>
          </div>
        )}

        {/* ============ SETTINGS ============ */}
        {tab === "settings" && (
          <div className="flex max-w-2xl flex-col gap-6">
            <Card variant="ornate" className="p-6">
              <p className="type-overline mb-4">Couple details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Partner 1" value={couple.partner1.name} onChange={(e) => setCouple((c) => ({ ...c, partner1: { ...c.partner1, name: e.target.value } }))} />
                <Input label="Partner 2" value={couple.partner2.name} onChange={(e) => setCouple((c) => ({ ...c, partner2: { ...c.partner2, name: e.target.value } }))} />
                <Input label="City" value={couple.city} onChange={(e) => setCouple((c) => ({ ...c, city: e.target.value }))} />
                <Input label="Hashtag" value={couple.hashtag} onChange={(e) => setCouple((c) => ({ ...c, hashtag: e.target.value }))} />
              </div>
              <Textarea label="Story" className="mt-4" value={couple.story} onChange={(e) => setCouple((c) => ({ ...c, story: e.target.value }))} />
              <Button className="mt-5" onClick={() => { store.publishInvite(couple); toast("Details saved", "success"); }}>Save changes</Button>
            </Card>

            <Card className="border border-error/40 p-6">
              <p className="type-overline mb-2 !text-error">Danger zone</p>
              <p className="type-caption mb-4">Clears the draft, live invite, RSVPs and blessings from this browser.</p>
              <Button variant="secondary" className="!border-error !text-error" onClick={() => { store.resetAll(); setCouple(getCouple(null)); setRsvps([]); toast("Demo data reset"); }}>
                <RefreshCcw className="size-4" /> Reset demo data
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function AddGuestForm({ side, onAdd }: { side: "groom" | "bride"; onAdd: (g: Guest) => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState("family");
  const [meal, setMeal] = useState("Veg");
  return (
    <div className="flex flex-col gap-4">
      <Input label="Guest name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohan & Family" />
      <Select label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={[{ value: "family", label: "Family" }, { value: "friends", label: "Friends" }, { value: "colleagues", label: "Colleagues" }]} />
      <Select label="Meal" value={meal} onChange={(e) => setMeal(e.target.value)} options={["Veg", "Jain", "Non-veg", "Halal"].map((m) => ({ value: m, label: m }))} />
      <Button
        disabled={!name.trim()}
        onClick={() => onAdd({ id: `x${Date.now()}`, name: name.trim(), side, group: group as Guest["group"], events: [], status: "pending", headcount: 1, meal })}
      >
        Add guest
      </Button>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminInner />
    </ToastProvider>
  );
}
