import Link from "next/link";
import { Button, Card, Divider } from "@/design-system/components";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card variant="ornate" className="max-w-md p-10 text-center">
        <p className="type-overline">404</p>
        <h1 className="mt-2 type-display-lg text-primary">Nothing here</h1>
        <p className="mt-3 type-body text-muted">
          This invitation may have been taken offline, or the link might have a typo. Do check with
          your hosts.
        </p>
        <Divider variant="motif" motif="marigold" className="my-8" />
        <Link href="/">
          <Button>Back to Amantrika</Button>
        </Link>
      </Card>
    </main>
  );
}
