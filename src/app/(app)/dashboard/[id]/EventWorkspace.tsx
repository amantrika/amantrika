"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Search, Trash2, UserPlus } from "lucide-react";
import {
  Badge, Button, Card, Divider, Input, Modal, Select, Sparkline, Stat, Switch, Table, Tabs,
  Textarea, PhotoUploader, type UploadedAsset,
} from "@/design-system/components";
import { assetUrl } from "@/lib/invite";
import { capture } from "@/lib/posthog/client";
import { EVENTS } from "@/lib/posthog/events";
import type {
  AssetRow, BlessingRow, EventRow, EventStats, GuestRow, RsvpRow, SubEventRow, ViewsByDay,
} from "@/lib/supabase/types";
import {
  addGuest, importGuests, removeGuest, setBlessingApproval, setEventStatus, updateSettings,
} from "./actions";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "guests", label: "Guests" },
  { id: "responses", label: "Responses" },
  { id: "photos", label: "Photos" },
  { id: "settings", label: "Settings" },
];

function statusTone(s: string) {
  if (s === "yes") return "success" as const;
  if (s === "no") return "error" as const;
  if (s === "maybe") return "accent" as const;
  return "neutral" as const;
}

export function EventWorkspace({
  event,
  stats,
  viewsByDay,
  guests,
  rsvps,
  subEvents,
  assets,
  blessings,
  origin,
}: {
  event: EventRow;
  stats: EventStats;
  viewsByDay: ViewsByDay[];
  guests: GuestRow[];
  rsvps: RsvpRow[];
  subEvents: SubEventRow[];
  assets: AssetRow[];
  blessings: BlessingRow[];
  /** Public origin, resolved on the server — VERCEL_URL isn't readable here. */
  origin: string;
}) {
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const inviteUrl = `${origin}/invite/${event.slug}`;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      setError(result.ok ? null : (result.error ?? "Something went wrong."));
    });
  }

  return (
    <div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {error && (
        <p role="alert" className="mt-4 type-caption text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8">
        {tab === "overview" && (
          <Overview event={event} stats={stats} viewsByDay={viewsByDay} rsvps={rsvps} inviteUrl={inviteUrl} />
        )}
        {tab === "guests" && (
          <GuestsTab event={event} guests={guests} subEvents={subEvents} inviteUrl={inviteUrl} run={run} />
        )}
        {tab === "responses" && (
          <ResponsesTab event={event} rsvps={rsvps} blessings={blessings} run={run} />
        )}
        {tab === "photos" && <PhotosTab event={event} assets={assets} />}
        {tab === "settings" && <SettingsTab event={event} run={run} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

function Overview({
  event,
  stats,
  viewsByDay,
  rsvps,
  inviteUrl,
}: {
  event: EventRow;
  stats: EventStats;
  viewsByDay: ViewsByDay[];
  rsvps: RsvpRow[];
  inviteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const series = viewsByDay.map((d) => d.views);
  const hasViews = series.some((v) => v > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total views" value={stats.total_views} spark={hasViews ? series : undefined} />
        <Stat label="Unique visitors" value={stats.unique_viewers} />
        <Stat label="Attending (headcount)" value={stats.rsvp_yes} />
        <Stat label="Blessings" value={stats.blessings} />
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="type-overline">Views · last 14 days</p>
            <p className="mt-1 type-caption">{stats.views_7d} in the last 7 days</p>
          </div>
          {hasViews ? (
            <Sparkline data={series} className="h-10 w-48 text-accent" />
          ) : (
            <p className="type-caption italic">
              {event.status === "published"
                ? "No views yet — share your link to get started."
                : "Publish your invitation to start collecting views."}
            </p>
          )}
        </div>
      </Card>

      <Card variant="ornate" className="p-6">
        <p className="type-overline">Your invite link</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-soft border border-ornate/50 bg-raised px-3 py-2 font-mono text-sm text-primary">
            {inviteUrl}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard?.writeText(inviteUrl);
              setCopied(true);
              capture(EVENTS.invite_link_copied, { event_id: event.id, surface: "dashboard" });
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="size-4" /> {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        {event.status !== "published" && (
          <p className="mt-3 type-caption">
            This invitation is a {event.status}. Publish it from Settings before sharing.
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 type-h2 text-primary">Latest responses</h2>
        {rsvps.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">No RSVPs yet.</p>
          </Card>
        ) : (
          <Table headers={["Guest", "Response", "Guests", "Meal", "When"]}>
            {rsvps.slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold">{r.guest_name}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(r.attending)}>{r.attending}</Badge>
                </td>
                <td className="px-4 py-3">{r.headcount}</td>
                <td className="px-4 py-3">{r.meal ?? "—"}</td>
                <td className="px-4 py-3 type-caption">
                  {new Date(r.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- guests */

function GuestsTab({
  event,
  guests,
  subEvents,
  inviteUrl,
  run,
}: {
  event: EventRow;
  guests: GuestRow[];
  subEvents: SubEventRow[];
  inviteUrl: string;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", side: "", guestGroup: "", headcount: "1" });

  const filtered = useMemo(
    () =>
      guests.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) &&
          (statusFilter === "all" || g.status === statusFilter)
      ),
    [guests, search, statusFilter]
  );

  const totalHeadcount = guests.reduce((sum, g) => sum + g.headcount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search guests"
          placeholder="Search guests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-48 flex-1"
        />
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "all", label: "All statuses" },
            { value: "yes", label: "Attending" },
            { value: "no", label: "Declined" },
            { value: "maybe", label: "Maybe" },
            { value: "pending", label: "Pending" },
          ]}
        />
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          Import list
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" /> Add guest
        </Button>
      </div>

      <p className="type-caption">
        {guests.length} guest{guests.length === 1 ? "" : "s"} · {totalHeadcount} expected across all
        invitations.
      </p>

      {guests.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="mx-auto size-8 text-accent" />
          <p className="mt-3 type-body text-muted">
            No guests yet. Add them one by one, or paste your whole list at once.
          </p>
        </Card>
      ) : (
        <Table headers={["Name", "Side", "Group", "Seats", "Status", "Personal link", ""]}>
          {filtered.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-3 font-semibold">{g.name}</td>
              <td className="px-4 py-3">{g.side ?? "—"}</td>
              <td className="px-4 py-3">{g.guest_group ?? "—"}</td>
              <td className="px-4 py-3">{g.headcount}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(g.status)}>{g.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${inviteUrl}?g=${encodeURIComponent(g.name)}&t=${g.invite_token}`
                    );
                    capture(EVENTS.guest_link_copied, { event_id: event.id });
                  }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
              </td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${g.name}`}
                  onClick={() => run(() => removeGuest(event.id, g.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a guest">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input
              label="Seats"
              type="number"
              min={1}
              value={form.headcount}
              onChange={(e) => setForm({ ...form, headcount: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Side" placeholder="Groom / Bride" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} />
            <Input label="Group" placeholder="Family / Friends" value={form.guestGroup} onChange={(e) => setForm({ ...form, guestGroup: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                run(() =>
                  addGuest({
                    eventId: event.id,
                    name: form.name,
                    phone: form.phone || undefined,
                    side: form.side || undefined,
                    guestGroup: form.guestGroup || undefined,
                    headcount: form.headcount,
                    invitedKeys: subEvents.map((s) => s.key),
                  })
                );
                setForm({ name: "", phone: "", side: "", guestGroup: "", headcount: "1" });
                setAddOpen(false);
              }}
            >
              Add guest
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import your guest list">
        <div className="flex flex-col gap-4">
          <p className="type-caption">
            One guest per line. Add a comma and a number for seats — e.g.{" "}
            <code className="font-mono">Rahul &amp; Family, 4</code>
          </p>
          <Textarea
            label="Guest list"
            rows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"Rahul & Family, 4\nAnanya, 1\nVikram & Family, 3"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                run(() => importGuests(event.id, importText));
                setImportText("");
                setImportOpen(false);
              }}
            >
              Import
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ----------------------------------------------------------------- responses */

function ResponsesTab({
  event,
  rsvps,
  blessings,
  run,
}: {
  event: EventRow;
  rsvps: RsvpRow[];
  blessings: BlessingRow[];
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const mealCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rsvps.filter((r) => r.attending === "yes" && r.meal)) {
      counts.set(r.meal!, (counts.get(r.meal!) ?? 0) + r.headcount);
    }
    return [...counts.entries()];
  }, [rsvps]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 type-h2 text-primary">RSVPs</h2>
        {rsvps.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">No responses yet.</p>
          </Card>
        ) : (
          <>
            {mealCounts.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {mealCounts.map(([meal, count]) => (
                  <span key={meal} className="rounded-pill border border-ornate/60 px-4 py-1.5 text-sm">
                    <strong>{meal}:</strong> {count}
                  </span>
                ))}
              </div>
            )}
            <Table headers={["Guest", "Response", "Seats", "Events", "Message", "When"]}>
              {rsvps.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold">{r.guest_name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(r.attending)}>{r.attending}</Badge>
                  </td>
                  <td className="px-4 py-3">{r.headcount}</td>
                  <td className="px-4 py-3 type-caption">{r.sub_event_keys.join(", ") || "—"}</td>
                  <td className="max-w-64 px-4 py-3 type-caption">{r.message || "—"}</td>
                  <td className="px-4 py-3 type-caption">
                    {new Date(r.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </section>

      <Divider variant="motif" motif="marigold" />

      <section>
        <h2 className="mb-3 type-h2 text-primary">Blessings wall</h2>
        {blessings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="type-caption italic">No blessings posted yet.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {blessings.map((b) => (
              <Card key={b.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="type-body">{b.message}</p>
                  <Badge tone={b.is_approved ? "success" : "neutral"}>
                    {b.is_approved ? "live" : "hidden"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="type-verse text-primary">— {b.name}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => run(() => setBlessingApproval(event.id, b.id, !b.is_approved))}
                  >
                    {b.is_approved ? "Hide" : "Approve"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------- photos */

function PhotosTab({ event, assets }: { event: EventRow; assets: AssetRow[] }) {
  const [items, setItems] = useState<UploadedAsset[]>(
    assets.map((a) => ({ id: a.id, storagePath: a.storage_path, caption: a.caption }))
  );

  return (
    <Card variant="ornate" className="p-8">
      <h2 className="type-h2 text-primary">Photographs</h2>
      <p className="mt-1 type-caption">
        The first two appear in your story section; the rest fill the gallery.
      </p>
      <PhotoUploader eventId={event.id} assets={items} onChange={setItems} className="mt-6" />

      {items.length > 0 && (
        <>
          <Divider className="my-8" />
          <p className="type-overline mb-3">Gallery preview</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {items.map((item) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.id}
                src={assetUrl(item.storagePath)}
                alt=""
                className="aspect-square w-full rounded-soft border border-ornate/40 object-cover"
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ settings */

function SettingsTab({
  event,
  run,
}: {
  event: EventRow;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [settings, setSettings] = useState({
    rsvpEnabled: event.settings.rsvpEnabled !== false,
    blessingsEnabled: event.settings.blessingsEnabled !== false,
    moderateBlessings: Boolean(event.settings.moderateBlessings),
    showCountdown: event.settings.showCountdown !== false,
  });

  function toggle(key: keyof typeof settings, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    run(() => updateSettings(event.id, next));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card variant="ornate" className="p-8">
        <h2 className="type-h2 text-primary">What guests see</h2>
        <div className="mt-6 flex flex-col gap-5">
          <Switch label="RSVP form" checked={settings.rsvpEnabled} onChange={(v) => toggle("rsvpEnabled", v)} />
          <Switch label="Blessings wall" checked={settings.blessingsEnabled} onChange={(v) => toggle("blessingsEnabled", v)} />
          <Switch
            label="Approve blessings before they appear"
            checked={settings.moderateBlessings}
            onChange={(v) => toggle("moderateBlessings", v)}
          />
          <Switch label="Countdown timer" checked={settings.showCountdown} onChange={(v) => toggle("showCountdown", v)} />
        </div>
      </Card>

      <Card className="p-8">
        <h2 className="type-h2 text-primary">Visibility</h2>
        <p className="mt-2 type-body text-muted">
          {event.status === "published"
            ? "Your invitation is live and anyone with the link can open it."
            : "Your invitation is private — only you can see it."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {event.status === "published" ? (
            <Button variant="secondary" onClick={() => run(() => setEventStatus(event.id, "draft"))}>
              Take offline
            </Button>
          ) : (
            <Button variant="celebration" onClick={() => run(() => setEventStatus(event.id, "published"))}>
              Publish invitation
            </Button>
          )}
          {event.status !== "archived" && (
            <Button variant="ghost" onClick={() => run(() => setEventStatus(event.id, "archived"))}>
              Archive
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
