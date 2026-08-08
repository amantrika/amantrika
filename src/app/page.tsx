import type { Metadata } from "next";
import { getProfile, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LandingClient } from "./LandingClient";
import type { HomePostSummary } from "@/components/site/HomeSections";
import { getAllPosts } from "@/lib/content/blog";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import type { PlanRow } from "@/lib/supabase/types";

/**
 * Homepage FAQ. Rendered into FAQPage structured data and worth keeping in
 * sync with the answers on /how-it-works — a model that retrieves either page
 * should get the same answer.
 */
const homepageFaq = [
  {
    q: "What is a digital wedding invitation?",
    a: "A wedding invitation that lives at a link rather than on paper. Guests open it on their phone to read the invitation, see the full schedule, get directions to the venue and RSVP — and because it is a link, it updates when anything changes.",
  },
  {
    q: "How long does it take to create one?",
    a: "About fifteen minutes, if your names, dates, venue address and a photograph are ready. You choose a theme, fill in your details and share the link.",
  },
  {
    q: "Do my guests need to install an app?",
    a: "No. The invitation opens in whatever browser is already on their phone. There is no login, no OTP and nothing to download.",
  },
  {
    q: "Can I change the invitation after sending it?",
    a: "Yes, at any time. The link never changes, so everyone who already has it sees the updated version — which is what makes a late venue or timing change survivable.",
  },
  {
    q: "Is it cheaper than printed cards?",
    a: "It does not scale with your guest list the way printing does: sending to eight hundred people costs the same as sending to eighty, and changing your mind costs nothing. Most families print a smaller number of cards for the people they visit in person and send a link to everyone else.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "Amantrika · Digital wedding invitations for Indian celebrations",
  description:
    "Create a wedding invitation website in minutes. Animated Indian invitation themes, RSVPs, directions and a countdown — all at one link you share on WhatsApp.",
  path: "/",
  image: "/assets/og-default.png",
  imageAlt: "An ornate Indian wedding invitation card with a gold double border",
});

export default async function LandingPage() {
  const profile = await getProfile();

  const supabase = await createClient();
  const [{ data: plans }, posts] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    getAllPosts(),
  ]);

  // Only the serialisable fields cross into the client component.
  const latestPosts: HomePostSummary[] = posts.slice(0, 3).map((post) => ({
    title: post.frontmatter.title,
    href: post.href,
    excerpt: post.frontmatter.excerpt,
    category: post.frontmatter.category,
    author: post.author.name,
    readingTime: post.readingTime,
    coverImage: post.frontmatter.coverImage,
    coverAlt: post.frontmatter.coverAlt,
  }));

  return (
    <>
      <JsonLd nodes={[organizationJsonLd(), websiteJsonLd(), faqJsonLd(homepageFaq)]} />
      <LandingClient
        plans={(plans ?? []) as PlanRow[]}
        signedIn={Boolean(profile)}
        dashboardHref={profile ? homeFor(profile.role) : "/login"}
        latestPosts={latestPosts}
        faq={homepageFaq}
      />
    </>
  );
}
