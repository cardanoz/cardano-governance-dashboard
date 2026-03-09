export const dynamic = "force-dynamic";

import Link from "next/link";

async function fetchAPI(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const r = await fetch(`${base}${path}`, { next: { revalidate: 0 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function fmtAda(lovelace: string | number): string {
  const n = Number(BigInt(String(lovelace || "0")) / 1000000n);
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function truncAddr(addr: string, len = 20): string {
  if (!addr) return "";
  if (addr.length <= len) return addr;
  return addr.slice(0, len) + "...";
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${(days/365).toFixed(1)}y ago`;
}

interface RichEntry {
  rank: number;
  identifier: string;
  addr_type: "stake" | "byron" | "enterprise";
  balance: string;
  tx_count: number;
  last_tx: string | null;
  pool: { pool_id: string; pool_ticker: string; pool_name: string } | null;
  drep: { drep_id: string; has_script: boolean } | null;
  is_exchange: boolean;
  exchange_reason: string | null;
  is_likely_lost: boolean;
  lost_reason: string | null;
}

interface Summary {
  epoch: number;
  total_entries: number;
  total_balance: string;
  exchange: { count: number; balance: string };
  likely_lost: { count: number; balance: string };
  by_type: {
    byron: { count: number; balance: string };
    enterprise: { count: number; balance: string };
    stake: { count: number; balance: string };
  };
}

interface LostAnalysis {
  byron_analysis: {
    total_entries: number;
    buckets: Record<string, { label: string; count: number; balance: string }>;
    top_entries: Array<{
      address: string;
      full_address: string;
      balance: string;
      tx_count: number;
      last_tx: string | null;
      years_since_last_tx: string | null;
      category: string;
    }>;
  };
  enterprise_analysis: {
    likely_lost_count: number;
    likely_lost_balance: string;
  };
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    stake: "bg-green-500/20 text-green-400 border-green-500/30",
    byron: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    enterprise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const labels: Record<string, string> = {
    stake: "Stake",
    byron: "Byron",
    enterprise: "Enterprise",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors[type] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {labels[type] || type}
    </span>
  );
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  );
}

export default async function RichListPage() {
  const [richData, lostData] = await Promise.all([
    fetchAPI("/richlist-v2?limit=200"),
    fetchAPI("/lost-ada-analysis"),
  ]) as [{ summary: Summary; entries: RichEntry[] } | null, LostAnalysis | null];

  if (!richData) {
    return <div className="p-8 text-center text-gray-400">Failed to load rich list data</div>;
  }

  const { summary, entries } = richData;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ADA Rich List</h1>
      <p className="text-gray-400 text-sm">
        Unified ranking: Stake addresses + Byron addresses + Enterprise addresses
        <span className="text-gray-500 ml-2">Epoch {summary.epoch}</span>
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Top {summary.total_entries} Balance</div>
          <div className="text-lg font-bold text-white">{fmtAda(summary.total_balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Exchange Flagged</div>
          <div className="text-lg font-bold text-red-400">{summary.exchange.count}</div>
          <div className="text-xs text-gray-500">{fmtAda(summary.exchange.balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Likely Lost / Self-Gox</div>
          <div className="text-lg font-bold text-amber-400">{summary.likely_lost.count}</div>
          <div className="text-xs text-gray-500">{fmtAda(summary.likely_lost.balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">By Type</div>
          <div className="text-xs space-y-1 mt-1">
            <div className="flex justify-between"><span className="text-green-400">Stake</span><span>{summary.by_type.stake.count}</span></div>
            <div className="flex justify-between"><span className="text-amber-400">Byron</span><span>{summary.by_type.byron.count}</span></div>
            <div className="flex justify-between"><span className="text-blue-400">Enterprise</span><span>{summary.by_type.enterprise.count}</span></div>
          </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-xs">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3">Type</th>
                <th className="text-left py-3">Address</th>
                <th className="text-right py-3 px-4">Balance (ADA)</th>
                <th className="text-right py-3">TXs</th>
                <th className="text-left py-3 px-2">Pool</th>
                <th className="text-left py-3 px-2">DRep</th>
                <th className="text-right py-3 px-2">Last TX</th>
                <th className="text-center py-3 px-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.rank} className={`border-b border-gray-700/30 hover:bg-gray-700/20 ${e.is_exchange ? "bg-red-500/5" : e.is_likely_lost ? "bg-amber-500/5" : ""}`}>
                  <td className="py-2 px-4 font-bold text-gray-500">{e.rank}</td>
                  <td className="py-2"><TypeBadge type={e.addr_type} /></td>
                  <td className="py-2">
                    <Link href={e.addr_type === "stake" ? `/address/${e.identifier}` : `/address/${e.identifier}`}
                      className="text-blue-400 hover:underline font-mono text-xs">
                      {truncAddr(e.identifier, 24)}
                    </Link>
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-bold">{fmtAda(e.balance)}</td>
                  <td className="py-2 text-right text-gray-400">{e.tx_count > 0 ? e.tx_count.toLocaleString() : "—"}</td>
                  <td className="py-2 px-2 text-xs">
                    {e.pool ? (
                      <Link href={`/pool/${e.pool.pool_id}`} className="text-purple-400 hover:underline">
                        {e.pool.pool_ticker || e.pool.pool_id?.slice(0, 12)}
                      </Link>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {e.drep ? (
                      <span className="text-cyan-400">{truncAddr(e.drep.drep_id, 12)}</span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-xs text-gray-400">
                    {e.last_tx ? timeAgo(e.last_tx) : "—"}
                  </td>
                  <td className="py-2 px-4 text-center space-x-1">
                    {e.is_exchange && <FlagBadge label="EXCHANGE" color="bg-red-500/20 text-red-400" />}
                    {e.is_likely_lost && <FlagBadge label="LOST?" color="bg-amber-500/20 text-amber-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lost ADA Analysis Section */}
      {lostData && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mt-8">Lost ADA Analysis (Self-Gox)</h2>
          <p className="text-gray-400 text-sm">
            Analysis of Byron-era and dormant addresses that may have lost access to their ADA
          </p>

          {/* Byron Buckets */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Byron Address Activity Distribution</h3>
            <div className="space-y-3">
              {Object.entries(lostData.byron_analysis.buckets).map(([key, bucket]) => {
                const maxBal = Math.max(...Object.values(lostData.byron_analysis.buckets).map(b => Number(BigInt(b.balance) / 1000000n)));
                const pct = maxBal > 0 ? (Number(BigInt(bucket.balance) / 1000000n) / maxBal) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 text-gray-400 text-sm">{bucket.label}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center px-2 ${
                          key === "likely_lost_5plus" ? "bg-red-500/60" :
                          key.startsWith("dormant") ? "bg-amber-500/60" : "bg-green-500/60"
                        }`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      >
                        <span className="text-xs whitespace-nowrap">{fmtAda(bucket.balance)} ADA</span>
                      </div>
                    </div>
                    <span className="text-gray-400 w-16 text-right text-xs">{bucket.count} addrs</span>
                  </div>
                );
              })}
            </div>

            {/* Enterprise lost */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Enterprise (non-staked, non-Byron) addresses inactive 3+ years:
                <span className="text-amber-400 font-bold ml-2">
                  {lostData.enterprise_analysis.likely_lost_count} addresses
                </span>
                <span className="text-gray-500 ml-2">
                  ({fmtAda(lostData.enterprise_analysis.likely_lost_balance)} ADA)
                </span>
              </div>
            </div>
          </div>

          {/* Top Lost Byron Addresses */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Top Byron Addresses by Balance (1K+ ADA)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-xs">
                    <th className="text-left py-2 px-4">Address</th>
                    <th className="text-right py-2">Balance (ADA)</th>
                    <th className="text-right py-2">TXs</th>
                    <th className="text-right py-2">Last Activity</th>
                    <th className="text-right py-2 px-4">Years Inactive</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(lostData.byron_analysis.top_entries || []).slice(0, 50).map((e, i) => (
                    <tr key={i} className={`border-b border-gray-700/30 hover:bg-gray-700/20 ${
                      e.category === "likely_lost_5plus" ? "bg-red-500/5" :
                      e.category.startsWith("dormant") ? "bg-amber-500/5" : ""
                    }`}>
                      <td className="py-2 px-4 font-mono text-xs text-blue-400">
                        <Link href={`/address/${e.full_address}`} className="hover:underline">{e.address}</Link>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{fmtAda(e.balance)}</td>
                      <td className="py-2 text-right text-gray-400">{e.tx_count}</td>
                      <td className="py-2 text-right text-gray-400 text-xs">{e.last_tx ? timeAgo(e.last_tx) : "—"}</td>
                      <td className="py-2 text-right px-4 text-gray-400">{e.years_since_last_tx || "—"}</td>
                      <td className="py-2 text-center">
                        {e.category === "likely_lost_5plus"
                          ? <FlagBadge label="LIKELY LOST" color="bg-red-500/20 text-red-400" />
                          : e.category.startsWith("dormant")
                          ? <FlagBadge label="DORMANT" color="bg-amber-500/20 text-amber-400" />
                          : <FlagBadge label="ACTIVE" color="bg-green-500/20 text-green-400" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Data from epoch {summary.epoch} • Balances via epoch_stake + UTXO scan •
        Exchange detection uses pool tickers + tx volume heuristics •
        Self-Gox detection based on last activity date
      </div>
    </div>
  );
}