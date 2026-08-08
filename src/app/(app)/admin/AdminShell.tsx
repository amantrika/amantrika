"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/design-system/components";

const sections = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/users", label: "People" },
  { href: "/admin/invitations", label: "Invitations" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/showcase", label: "Showcase" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/ai", label: "AI" },
];

/** Sub-navigation for the admin area, with a count badge on the queue that needs action. */
export function AdminNav({ pendingPartners }: { pendingPartners: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="mb-8 flex flex-wrap gap-1 border-b border-ornate/40"
    >
      {sections.map((s) => {
        const active = s.exact ? pathname === s.href : pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {s.label}
            {s.href === "/admin/partners" && pendingPartners > 0 && (
              <Badge tone="error">{pendingPartners}</Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Feedback strip shared by the admin tables. */
export function AdminFeedback({ message }: { message: { text: string; isError: boolean } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.isError ? "alert" : "status"}
      className={`mb-4 rounded-md border px-3 py-2 type-caption ${
        message.isError
          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-ornate bg-accent/10 text-foreground"
      }`}
    >
      {message.text}
    </p>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="type-h2 text-primary">{title}</h2>
      {description && <p className="mt-1 type-caption">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
