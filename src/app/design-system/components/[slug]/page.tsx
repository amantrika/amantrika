"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/design-system/components";
import { componentDocs, getComponentDoc } from "../registry";

export default function ComponentDocPage() {
  const { slug } = useParams<{ slug: string }>();
  const doc = getComponentDoc(slug);

  if (!doc) {
    return (
      <div>
        <p className="type-h2 text-primary">Component not found.</p>
        <Link href="/design-system/components" className="mt-3 inline-block font-semibold text-primary underline">
          ← All components
        </Link>
      </div>
    );
  }

  const idx = componentDocs.findIndex((c) => c.slug === doc.slug);
  const prev = componentDocs[idx - 1];
  const next = componentDocs[idx + 1];

  return (
    <>
      <Link href="/design-system/components" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="size-4" /> All components
      </Link>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="type-display-lg text-primary">{doc.title}</h1>
        <Badge tone="accent">{doc.category}</Badge>
      </div>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">{doc.description}</p>

      {doc.demos.map((demo) => (
        <section key={demo.title} className="mb-10">
          <h2 className="type-h2 text-primary">{demo.title}</h2>
          {demo.note && <p className="mt-1 type-caption">{demo.note}</p>}
          <div className="mt-4 rounded-card border border-ornate/30 bg-bg p-6 sm:p-8">{demo.node}</div>
        </section>
      ))}

      <nav className="mt-14 flex justify-between border-t border-ornate/40 pt-5 text-sm font-semibold">
        {prev ? (
          <Link href={`/design-system/components/${prev.slug}`} className="text-primary hover:text-accent">
            ← {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/design-system/components/${next.slug}`} className="text-primary hover:text-accent">
            {next.title} →
          </Link>
        ) : <span />}
      </nav>
    </>
  );
}
