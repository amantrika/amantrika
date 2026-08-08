import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card } from "@/design-system/components";
import { getCachedShowcase, getCachedShowcaseTypes } from "@/lib/cache";
import { eventTypeLabels } from "@/lib/invites/invite";
import { getTheme } from "@/themes";
import type { EventType } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Showcase · Amantrika",
  description:
    "Real invitations made with Amantrika, shared with their hosts' permission. Every one is a privacy-safe copy — addresses, phone numbers and payment details removed.",
};

// Curation changes rarely; an hour-stale gallery is fine and keeps it cheap.
export const revalidate = 3600;

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const types = await getCachedShowcaseTypes();
  const activeType = types.includes(type as EventType) ? (type as EventType) : undefined;
  const items = await getCachedShowcase(activeType);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="text-center">
        <p className="type-overline">Showcase</p>
        <h1 className="mt-3 type-display-lg text-primary">Invitations people actually sent</h1>
        <p className="mx-auto mt-4 max-w-2xl type-body-lg text-muted">
          Every invitation here is shared with its hosts&apos; explicit permission, and what you see
          is a copy — venue addresses are reduced to a city, and phone numbers, payment details and
          guest lists are removed entirely. We never link to a family&apos;s live invitation.
        </p>
      </header>

      {types.length > 1 && (
        <nav aria-label="Filter by occasion" className="mt-10 flex flex-wrap justify-center gap-2">
          <FilterChip href="/showcase" label="All" active={!activeType} />
          {types.map((t) => (
            <FilterChip
              key={t}
              href={`/showcase?type=${t}`}
              label={eventTypeLabels[t]}
              active={activeType === t}
            />
          ))}
        </nav>
      )}

      {items.length === 0 ? (
        <Card variant="ornate" className="mx-auto mt-12 max-w-lg p-12 text-center">
          <h2 className="type-h2 text-primary">Nothing here yet</h2>
          <p className="mt-3 type-body text-muted">
            We only feature invitations whose hosts have said yes. As couples opt in, they&apos;ll
            appear here.
          </p>
          <Link href="/signup" className="mt-6 inline-block">
            <Button variant="celebration">Make yours</Button>
          </Link>
        </Card>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const theme = getTheme(item.themeId);
            return (
              <li key={item.slug}>
                <Link href={`/showcase/${item.slug}`} className="group block h-full">
                  <Card
                    variant="ornate"
                    className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-gold-glow"
                  >
                    {item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverUrl}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full">
                        {theme.palette.map((hex) => (
                          <span key={hex} className="flex-1" style={{ background: hex }} />
                        ))}
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <p className="type-overline">{eventTypeLabels[item.eventType]}</p>
                      <h2 className="mt-1 type-h2 text-primary">{item.title}</h2>
                      {item.city && <p className="mt-1 type-caption">{item.city}</p>}
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                        <Badge tone="accent">{theme.name}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-20 text-center">
        <h2 className="type-display-lg text-primary">Want yours featured?</h2>
        <p className="mx-auto mt-3 max-w-xl type-body-lg text-muted">
          There&apos;s a checkbox in the builder — off by default. Tick it and we may feature a
          privacy-safe copy of your invitation here. You can withdraw at any time, and it disappears.
        </p>
        <Link href="/signup" className="mt-6 inline-block">
          <Button size="lg" variant="celebration">
            Create your invitation
          </Button>
        </Link>
      </section>
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-pill border px-4 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-bg"
          : "border-ornate/60 text-muted hover:border-ornate hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
