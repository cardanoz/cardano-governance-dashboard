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
  const n = Number(BigInt(String(lovelace || "0")) / BigInt(1000000));
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function truncAddr(addr: string, len = 20): string {
  if (!addr) return "";
  if (addr.length <= len) return addr;
  return addr.slice(0, len) + "...";
}

interface RichEntry {
  stake_address: string;
  address: string;
  balance: string;
  utxo_count: number;
}

export default async function RichListPage() {
  const entries = await fetchAPI("/richlist") as RichEntry[] | null;

  if (!entries || !Array.isArray(entries)) {
    return <div className="p-8 text-center text-gray-400">Failed to load rich list data</div>;
  }

  const totalBalance = entries.reduce((s, e) => s + BigInt(e.balance || "0"), BigInt(0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ADA Rich List</h1>
      <p className="text-gray-400 text-sm">
        Top {entries.length} addresses by balance
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Top {entries.length} Total</div>
          <div className="text-lg font-bold text-white">{fmtAda(totalBalance.toString())} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">#1 Balance</div>
          <div className="text-lg font-bold text-green-400">{entries[0] ? fmtAda(entries[0].balance) : "—"} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">#{entries.length} Balance</div>
          <div className="text-lg font-bold text-blue-400">{entries[entries.length - 1] ? fmtAda(entries[entries.length - 1].balance) : "—"} ADA</div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-xs">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3">Address</th>
                <th className="text-right py-3 px-4">Balance (ADA)</th>
                <th className="text-right py-3 px-4">% of Top {entries.length}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const pct = totalBalance > 0n ? Number(BigInt(e.balance) * 10000n / totalBalance) / 100 : 0;
                return (
                  <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                    <td className="py-2 px-4 font-bold text-gray-500">{i + 1}</td>
                    <td className="py-2">
                      <Link href={`/address/${e.stake_address || e.address}`}
                        className="text-blue-400 hover:underline font-mono text-xs">
                        {truncAddr(e.stake_address || e.address, 32)}
                      </Link>
                    </td>
                    <td className="py-2 px-4 text-right font-mono font-bold">{fmtAda(e.balance)}</td>
                    <td className="py-2 px-4 text-right text-gray-400">{pct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        Data from cardano-db-sync epoch_stake aggregation
      </div>
    </div>
  );
}
