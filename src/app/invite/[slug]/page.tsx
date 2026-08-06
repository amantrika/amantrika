import { InviteClient } from "./InviteClient";

export default async function InvitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <InviteClient slug={slug} />;
}
