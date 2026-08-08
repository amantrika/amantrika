import { LoadingBlock } from "@/design-system/components";

/**
 * Shown while an admin page fetches. Admin pages issue several database round
 * trips, so without this the area sits blank long enough to look broken —
 * which is part of why a slow load read as a 404.
 */
export default function AdminLoading() {
  return <LoadingBlock label="Loading platform data" />;
}
