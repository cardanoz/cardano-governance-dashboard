export const dynamic = "force-dynamic";

import { PageShell, Card, ErrorState } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { compactNumber } from "@/lib/format";

interface PoolStats {
  active_pools: number;
  retired_pools: number;
  delegated_to_pools: number;
}

export default async function PoolLandscapeAnalyticsPage() {
  const stats = await fetchAPI<PoolStats>("/analytics/pool-landscape");

  if (!stats) {
    return (
      <PageShell
        title="Pool Landscape"
        breadcrumbs={[{ label: "Analytics" }, { label: "Pool Landscape" }]}
      >
        <ErrorState message="Failed to load pool analytics" />
      </PageShell>
    );
  }

  const total = (stats.active_pools || 0) + (stats.retired_pools || 0);
  const activePercent = total > 0 ? ((stats.active_pools || 0) / total * 100).toFixed(1) : "0";

  return (
    <PageShell
      title="Pool Landscape Analytics"
      breadcrumbs={[{ label: "Analytics" }, { label: "Pool Landscape" }]}
    >
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Pool Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Active Pools</p>
              <p className="text-3xl font-bold text-blue-400">{compactNumber(stats.active_pools || 0)}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Retired Pools</p>
              <p className="text-3xl font-bold text-red-400">{compactNumber(stats.retired_pools || 0)}</p>
            </div>
            <div className="bg-purple-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">With Delegators</p>
              <p className="text-3xl font-bold text-purple-400">{compactNumber(stats.delegated_to_pools || 0)}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Active Pool Distribution</span>
              <span className="font-bold">{activePercent}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded h-2">
              <div
                className="bg-green-500 h-2 rounded"
                style={{ width: `${activePercent}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
