import { listFeatureRequests } from "@/lib/features/queries";
import { RequestsTable } from "./RequestsTable";

/** Triage for the community board. Only an admin can move a request off `open`. */
export default async function AdminRequestsPage() {
  const requests = await listFeatureRequests();
  return <RequestsTable requests={requests} />;
}
