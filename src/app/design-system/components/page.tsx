"use client";

import Link from "next/link";
import { Card } from "@/design-system/components";
import { categories, componentDocs } from "./registry";

export default function ComponentsIndexPage() {
  return (
    <>
      <p className="type-overline">Component library</p>
      <h1 className="mb-4 mt-1 type-display-lg text-primary">Components</h1>
      <p className="mb-10 max-w-2xl type-body-lg text-muted">
        {componentDocs.length} documented components, each with its own page and live variations.
        Everything draws exclusively from the token layer — switch the theme in the header and every
        example restyles.
      </p>

      {categories.map((cat) => {
        const list = componentDocs.filter((c) => c.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="mb-12">
            <h2 className="mb-1 type-h1 text-primary">{cat}</h2>
            <p className="mb-5 type-caption">{list.length} components</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((c) => (
                <Link key={c.slug} href={`/design-system/components/${c.slug}`} className="group">
                  <Card className="h-full p-5 transition-shadow group-hover:shadow-gold-glow">
                    <h3 className="font-display text-xl font-semibold text-primary">{c.title}</h3>
                    <p className="mt-1 line-clamp-2 type-caption">{c.description}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-accent">
                      {c.demos.length} variation{c.demos.length > 1 ? "s" : ""} →
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
