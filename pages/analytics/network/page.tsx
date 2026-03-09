export const dynamic = "force-dynamic";

import { PageShell, Card, ErrorState } from "@/components/ui";
import { fetchAPI } from "@/lib/api";
import { compactNumber, fmtAda } from "@/lib/format";

interface NetworkData {
  date: string;
  tx_count: number;
  addresses: number;
  volume: string;
}

export default async function NetworkAnalyticsPage() {
  const data = await fetchAPI<NetworkData[]>("/analytics/network");

  if (!data) {
    return (
      <PageShell
        title="Network Analytics"
        breadcrumbs={[{ label: "Analytics" }, { label: "Network" }]}
      >
        <ErrorState message="Failed to load network analytics" />
      </PageShell>
    );
  }

  const total = {
    txs: (Array.isArray(data) ? data : []).reduce((acc, d) => acc + d.tx_count, 0),
    addresses: (Array.isArray(data) ? data : []).reduce((acc, d) => acc + d.addresses, 0),
  };

  return (
    <PageShell
      title="Network Analytics"
      breadcrumbs={[{ label: "Analytics" }, { label: "Network" }]}
    >
      <div className="space-y-4">
        <Card className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-3xl font-bold">{compactNumber(total.txs)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Unique Addresses</p>
              <p className="text-3xl font-bold">{compactNumber(total.addresses)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Days Analyzed</p>
              <p className="text-3xl font-bold">{Array.isArray(data) ? data.length : 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Transactions</th>
                  <th className="text-right py-2">Addresses</th>
                  <th className="text-right py-2">Volume (lovelace)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {Array.isArray(data) &&
                  data.map((row) => (
                    <tr key={row.date} className="hover:bg-gray-800">
                      <td className="py-2">{row.date}</td>
                      <td className="text-right">{compactNumber(row.tx_count)}</td>
                      <td className="text-right">{compactNumber(row.addresses)}</td>
                      <td className="text-right">{compactNumber(parseInt(row.volume || "0"))}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
