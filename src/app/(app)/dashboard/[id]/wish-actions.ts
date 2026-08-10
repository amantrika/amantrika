"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { authProviderName } from "@/lib/auth/provider";

export interface WishActionResult {
  ok: boolean;
  error?: string;
}

const schema = z.object({
  eventId: z.string().uuid(),
  wishId: z.string().min(1),
  approved: z.boolean(),
});

/**
 * Approve or hide a wish.
 *
 * Wishes arrive unapproved — the blessing wall is public on someone's wedding
 * page, and an open publishing endpoint on a family occasion is not a risk
 * worth taking. Nothing appears until the host says so, which makes this screen
 * the difference between the feature working and the wall staying empty.
 *
 * Ownership is checked inside the repository, not here: `setWishApproval` takes
 * the acting user and refuses a wish on someone else's invitation.
 */
export async function setWishApproved(
  input: z.input<typeof schema>
): Promise<WishActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That request looked malformed." };

  if (authProviderName() !== "cognito") {
    return { ok: false, error: "Moderation is only available on the AWS stack yet." };
  }

  const profile = await requireProfile();
  const { listAllWishes, setWishApproval } = await import("@aws/repo/guest");

  // The repository takes the whole item because a wish's sort key embeds its
  // creation time, which the id alone does not give us.
  const wishes = await listAllWishes(profile.id, parsed.data.eventId);
  const wish = wishes.find((w) => w.id === parsed.data.wishId);
  if (!wish) return { ok: false, error: "We couldn't find that message." };

  const done = await setWishApproval(
    profile.id,
    parsed.data.eventId,
    wish,
    parsed.data.approved
  );
  if (!done) return { ok: false, error: "We couldn't update that message." };

  revalidatePath(`/dashboard/${parsed.data.eventId}`);
  return { ok: true };
}
