import DashboardPageClient from "@/components/DashboardPageClient";
import { normalizeSearchState, parseSearchState } from "@/lib/search";
import { getHomeDashboardData } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const search = parseSearchState(resolvedSearchParams);
  const dashboard = await getHomeDashboardData(normalizeSearchState({}));

  return <DashboardPageClient dashboard={dashboard} search={search} />;
}
