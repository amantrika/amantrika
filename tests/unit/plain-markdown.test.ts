import { describe, expect, it } from "vitest";
import { toPlainMarkdown } from "@/lib/content/plain-markdown";

/**
 * The markdown twins are what a retrieval model reads instead of our HTML, so
 * the thing worth testing is that prose survives and structure is preserved —
 * not that any particular tag is handled a particular way.
 */
describe("toPlainMarkdown", () => {
  it("promotes a title prop to a heading and keeps the prose under it", () => {
    const out = toPlainMarkdown(
      ['<JourneyStep title="Share one link" icon="CardToLink" when="Step four">', "", "Send it on WhatsApp.", "", "</JourneyStep>"].join("\n")
    );

    expect(out).toBe("## Step four: Share one link\n\nSend it on WhatsApp.");
  });

  it("keeps a section's lead paragraph, which exists only as a prop", () => {
    const out = toPlainMarkdown(
      '<Section eyebrow="Our promises" title="What we will not do" lead="We would rather be held to them.">\n\nBody.\n\n</Section>'
    );

    expect(out).toBe("## What we will not do\n\nWe would rather be held to them.\n\nBody.");
  });

  it("drops a decorative wrapper without eating what is inside it", () => {
    const out = toPlainMarkdown("<IconGrid columns={3}>\n\nSomething true.\n\n</IconGrid>");

    expect(out).toBe("Something true.");
  });

  it("keeps prose in a self-closing block that carries its text in props", () => {
    const out = toPlainMarkdown(
      '<ClosingCTA title="Start your invitation" body="It is free to build." />'
    );

    expect(out).toBe("## Start your invitation\n\nIt is free to build.");
  });

  it("leaves ordinary markdown alone", () => {
    const body = "## A heading\n\nA paragraph with **bold** and a [link](/about).\n\n- one\n- two";

    expect(toPlainMarkdown(body)).toBe(body);
  });

  it("does not mangle a less-than sign in running prose", () => {
    const body = "Invitations under 100KB load in <2s on Slow 4G.";

    expect(toPlainMarkdown(body)).toBe(body);
  });
});
