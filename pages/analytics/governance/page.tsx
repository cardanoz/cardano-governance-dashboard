export const dynamic = "force-dynamic";

import { PageShell, Card, ErrorState } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { compactNumber } from "@/lib/format";

interface GovernanceStats {
  total_dreps: number;
  total_votes: number;
  ratified_proposals: number;
  total_proposals: number;
}

export default async function GovernanceAnalyticsPage() {
  const stats = await fetchAPI<GovernanceStats>("/analytics/governance-stats");

  if (!stats) {
    return (
      <PageShell
        title="Governance Analytics"
        breadcrumbs={[{ label: "Analytics" }, { label: "Governance" }]}
      >
        <ErrorState message="Failed to load governance analytics" />
      </PageShell>
    );
  }

  const ratificationRate = stats.total_proposals > 0
    ? ((stats.ratified_proposals / stats.total_proposals) * 100).toFixed(1)
    : "0";

  return (
    <PageShell
      title="Governance Analytics"
      breadcrumbs={[{ label: "Analytics" }, { label: "Governance" }]}
    >
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Governance Participation</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Total DReps</p>
              <p className="text-3xl font-bold text-indigo-400">{compactNumber(stats.total_dreps)}</p>
            </div>
            <div className="bg-cyan-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Total Votes</p>
              <p className="text-3xl font-bold text-cyan-400">{compactNumber(stats.total_votes)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Total Proposals</p>
              <p className="text-3xl font-bold text-yellow-400">{compactNumber(stats.total_proposals)}</p>
            </div>
            <div className="bg-green-900/20 p-4 rounded">
              <p className="text-sm text-gray-400">Ratified</p>
              <p className="text-3xl font-bold text-green-400">{compactNumber(stats.ratified_proposals)}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-800 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Ratification Rate</span>
              <span className="font-bold">{ratificationRate}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded h-2">
              <div
                className="bg-green-500 h-2 rounded"
                style={{ width: `${ratificationRate}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
