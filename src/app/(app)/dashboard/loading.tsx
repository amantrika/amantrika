import { ShehnaiLoadingBlock } from "@/design-system/components";

/** Your celebrations are read from the database on every request. */
export default function DashboardLoading() {
  return <ShehnaiLoadingBlock label="Loading your celebrations" />;
}
