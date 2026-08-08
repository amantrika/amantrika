import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureBoard } from "@/components/roadmap/FeatureBoard";
import { MdxBody } from "@/lib/content/render";
import { getContentPage } from "@/lib/content/blog";
import { pageMetadata } from "@/lib/seo/metadata";
import { getCachedFeatureBoard } from "@/lib/cache";
import { canPropose, myVotedRequestIds } from "@/lib/features/actions";

/**
 * The roadmap is half editorial and half community.
 *
 * The written part stays in `content/pages/roadmap.mdx` — it is our plan, and
 * belongs in version control where a change is reviewable. The board beneath it
 * is what everyone else wants, which only the database can answer.
 *
 * This route shadows the generic `[slug]` content page for `/roadmap`
 * specifically, so the MDX keeps rendering exactly as it did.
 */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("roadmap");
  if (!page) return { title: "Roadmap · Amantrika" };
  return pageMetadata({
    title: page.frontmatter.title,
    description: page.frontmatter.description,
    path: "/roadmap",
  });
}

export default async function RoadmapPage() {
  const page = await getContentPage("roadmap");
  if (!page) notFound();

  // The board is public and shared; the last two are per-visitor and cannot be.
  const [{ requests, leaderboard }, votedIds, signedIn] = await Promise.all([
    getCachedFeatureBoard(),
    myVotedRequestIds(),
    canPropose(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <header>
        <p className="type-overline">Roadmap</p>
        <h1 className="mt-3 type-display-lg text-primary">{page.frontmatter.title}</h1>
      </header>

      <div className="prose-amantrika mt-8">
        <MdxBody source={page.body} />
      </div>

      <section id="requests" className="mt-20 border-t border-ornate/30 pt-12">
        <h2 className="type-display-lg text-primary">What you&apos;ve asked for</h2>
        <p className="mt-3 max-w-2xl type-body-lg text-muted">
          Anyone can vote — once per person, no account needed. Suggesting something needs an
          account, which keeps the board clean and lets us reply. What rises here is what we look
          at next.
        </p>

        <div className="mt-8">
          <FeatureBoard
            requests={requests}
            leaderboard={leaderboard}
            votedIds={votedIds}
            signedIn={signedIn}
          />
        </div>
      </section>
    </div>
  );
}
