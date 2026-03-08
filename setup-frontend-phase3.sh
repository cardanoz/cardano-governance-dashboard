#!/bin/bash
# Phase 3: Dashboard update + Whale tracker + Rich list + Pool details + TX volume charts
set -e
cd /home/ubuntu/adatool-frontend

echo "=== Phase 3: Creating directories ==="
mkdir -p src/app/\(explorer\)/richlist
mkdir -p src/app/\(explorer\)/whales
mkdir -p src/app/\(explorer\)/pool/\[id\]/blocks
mkdir -p src/app/\(explorer\)/asset/\[fingerprint\]/holders
mkdir -p src/app/\(explorer\)/charts
mkdir -p src/components/charts

echo "=== Updating Dashboard with new stats fields ==="
cat > src/app/page.tsx << 'DASHEOF'
import { lovelaceToAda, truncHash, timeAgo, compactNumber } from "@/lib/format";
import { StatCard, Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 30;

interface Stats {
  block_no: number; epoch_no: number;
  epoch_tx_count: number; epoch_blk_count: number; epoch_fees: string;
  circulation: string; treasury: string; reserves: string;
  active_pools: number; total_proposals: number; total_tx_count: number;
}

interface BlockSummary {
  block_no: number; hash: string; epoch_no: number; slot_no: number;
  time: string; tx_count: number; size: number;
  pool_name: string | null; pool_ticker: string | null;
}

interface TxSummary {
  hash: string; block_no: number; block_time: string;
  fee: string; out_sum: string; size: number;
}

export default async function Dashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let stats: Stats | null = null;
  let blocks: BlockSummary[] = [];
  let txs: TxSummary[] = [];

  try {
    const [sRes, bRes, tRes] = await Promise.all([
      fetch(`${API}/stats`, { next: { revalidate: 30 } }),
      fetch(`${API}/blocks?limit=10`, { next: { revalidate: 15 } }),
      fetch(`${API}/txs?limit=10`, { next: { revalidate: 15 } }),
    ]);
    if (sRes.ok) stats = await sRes.json();
    if (bRes.ok) blocks = await bRes.json();
    if (tRes.ok) txs = await tRes.json();
  } catch (e) {
    console.error("Dashboard fetch error:", e);
  }

  return (
    <div className="space-y-6">
      {/* Network overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Block Height" value={stats ? compactNumber(stats.block_no) : "—"}
          sub={stats ? `Epoch ${stats.epoch_no}` : undefined} />
        <StatCard label="Total TXs" value={stats ? compactNumber(stats.total_tx_count) : "—"}
          sub={stats ? `${compactNumber(stats.epoch_tx_count)} this epoch` : undefined} />
        <StatCard label="Circulation" value={stats ? `₳${compactNumber(Number(stats.circulation) / 1e6)}` : "—"}
          sub="Total ADA in UTXOs" />
        <StatCard label="Treasury" value={stats ? `₳${compactNumber(Number(stats.treasury) / 1e6)}` : "—"}
          sub={stats ? `Reserves: ₳${compactNumber(Number(stats.reserves) / 1e6)}` : undefined} />
        <StatCard label="Active Pools" value={stats?.active_pools?.toLocaleString() || "—"} />
        <StatCard label="Gov Proposals" value={stats?.total_proposals?.toLocaleString() || "—"} />
        <StatCard label="Epoch Blocks" value={stats ? compactNumber(stats.epoch_blk_count) : "—"} />
        <StatCard label="Epoch Fees" value={stats ? `₳${lovelaceToAda(stats.epoch_fees, 0)}` : "—"} />
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/whales" className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
          🐋 Whale Tracker
        </Link>
        <Link href="/richlist" className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
          💰 Rich List
        </Link>
        <Link href="/charts" className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
          📊 Charts
        </Link>
        <Link href="/governance" className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
          🗳️ Governance
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Latest Blocks */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Latest Blocks</h2>
            <Link href="/blocks" className="text-xs text-blue-400 hover:underline">View all</Link>
          </div>
          <div className="space-y-1">
            {blocks.map((b) => (
              <Link key={b.hash} href={`/block/${b.hash}`}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-800/50 text-sm">
                <div>
                  <span className="text-blue-400 font-mono">#{b.block_no}</span>
                  <span className="text-yellow-400 ml-2 text-xs">{b.pool_ticker || "—"}</span>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <span>{b.tx_count} txs</span>
                  <span className="ml-2">{timeAgo(b.time)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Latest Transactions */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Latest Transactions</h2>
            <Link href="/txs" className="text-xs text-blue-400 hover:underline">View all</Link>
          </div>
          <div className="space-y-1">
            {txs.map((t) => (
              <Link key={t.hash} href={`/tx/${t.hash}`}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-800/50 text-sm">
                <span className="text-blue-400 font-mono text-xs">{truncHash(t.hash, 10)}</span>
                <div className="text-right text-xs text-gray-500">
                  <span className="text-green-400">₳{lovelaceToAda(t.out_sum, 0)}</span>
                  <span className="ml-2">{timeAgo(t.block_time)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
DASHEOF

echo "=== Creating Whale Tracker page ==="
cat > "src/app/(explorer)/whales/page.tsx" << 'WHALEEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface WhaleTx {
  hash: string; block_no: number; block_time: string;
  out_sum: string; fee: string; input_count: number; output_count: number;
}

export default async function WhalesPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let whales: WhaleTx[] = [];
  try {
    const res = await fetch(`${API}/whales?limit=50`, { next: { revalidate: 30 } });
    if (res.ok) whales = await res.json();
  } catch {}

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">Whale Tracker</h1>
      <p className="text-sm text-gray-400 mb-4">Recent large transactions (&gt;1M ADA)</p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">TX Hash</th>
              <th className="text-left py-2 px-2">Block</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">Fee</th>
              <th className="text-right py-2 px-2">In/Out</th>
              <th className="text-right py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {whales.map((w) => (
              <tr key={w.hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2">
                  <Link href={`/tx/${w.hash}`} className="text-blue-400 hover:underline font-mono text-xs">
                    {truncHash(w.hash, 10)}
                  </Link>
                </td>
                <td className="py-2 px-2">
                  <span className="text-gray-400 text-xs">#{w.block_no}</span>
                </td>
                <td className="py-2 px-2 text-right font-mono text-green-400">
                  ₳{lovelaceToAda(w.out_sum, 0)}
                </td>
                <td className="py-2 px-2 text-right text-xs text-gray-500">
                  ₳{lovelaceToAda(w.fee)}
                </td>
                <td className="py-2 px-2 text-right text-xs text-gray-500">
                  {w.input_count}/{w.output_count}
                </td>
                <td className="py-2 px-2 text-right text-xs text-gray-500">
                  {timeAgo(w.block_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
WHALEEOF

echo "=== Creating Rich List page ==="
cat > "src/app/(explorer)/richlist/page.tsx" << 'RICHEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, truncHash, compactNumber } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface RichEntry {
  address: string; stake_address: string | null;
  balance: string; utxo_count: number;
}

export default async function RichListPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let entries: RichEntry[] = [];
  try {
    const res = await fetch(`${API}/richlist?limit=100`, { next: { revalidate: 300 } });
    if (res.ok) entries = await res.json();
  } catch {}

  const totalCirculation = 37_000_000_000_000_000; // ~37B ADA in lovelace (approximate)

  return (
    <div>
      <h1 className="text-xl font-bold mb-2">ADA Rich List</h1>
      <p className="text-sm text-gray-400 mb-4">Top addresses by ADA balance (stake addresses)</p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Address</th>
              <th className="text-right py-2 px-2">Balance</th>
              <th className="text-right py-2 px-2">% Supply</th>
              <th className="text-right py-2 px-2">UTXOs</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const pct = ((Number(e.balance) / totalCirculation) * 100).toFixed(2);
              return (
                <tr key={e.stake_address || e.address} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-2">
                    <Link href={`/address/${e.address}`} className="text-blue-400 hover:underline font-mono text-xs">
                      {truncHash(e.stake_address || e.address, 14)}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-green-400">
                    ₳{compactNumber(Number(e.balance) / 1e6)}
                  </td>
                  <td className="py-2 px-2 text-right text-xs text-gray-400">{pct}%</td>
                  <td className="py-2 px-2 text-right text-xs text-gray-500">{e.utxo_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
RICHEOF

echo "=== Creating Charts page (TX volume) ==="
cat > "src/app/(explorer)/charts/page.tsx" << 'CHARTSEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber, lovelaceToAda } from "@/lib/format";

export const dynamic = "force-dynamic";

interface DayVolume {
  date: string; tx_count: number; block_count: number;
  total_fees: string; total_output: string;
}

export default async function ChartsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let data: DayVolume[] = [];
  try {
    const res = await fetch(`${API}/tx-volume?days=30`, { next: { revalidate: 300 } });
    if (res.ok) data = await res.json();
  } catch {}

  const maxTx = Math.max(...data.map(d => d.tx_count), 1);
  const totalTx = data.reduce((s, d) => s + d.tx_count, 0);
  const totalFees = data.reduce((s, d) => s + Number(d.total_fees), 0);
  const avgTx = data.length > 0 ? Math.round(totalTx / data.length) : 0;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Network Charts</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="30d Transactions" value={compactNumber(totalTx)} />
        <StatCard label="Daily Average" value={compactNumber(avgTx)} />
        <StatCard label="30d Fees" value={`₳${compactNumber(totalFees / 1e6)}`} />
        <StatCard label="Days Tracked" value={data.length.toString()} />
      </div>

      {/* TX Volume Bar Chart */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Daily Transaction Volume (30 days)</h2>
        <div className="flex items-end gap-[2px] h-48">
          {data.map((d) => {
            const height = (d.tx_count / maxTx) * 100;
            return (
              <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.tx_count.toLocaleString()} TXs`}>
                <div
                  className="bg-blue-500 hover:bg-blue-400 rounded-t transition-colors w-full"
                  style={{ height: `${height}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block
                  bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="text-white font-medium">{d.date}</div>
                  <div className="text-blue-400">{d.tx_count.toLocaleString()} TXs</div>
                  <div className="text-gray-400">{d.block_count} blocks</div>
                  <div className="text-green-400">₳{compactNumber(Number(d.total_fees) / 1e6)} fees</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{data[0]?.date || ""}</span>
          <span>{data[data.length - 1]?.date || ""}</span>
        </div>
      </Card>

      {/* Daily breakdown table */}
      <Card className="mt-4 overflow-x-auto">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Daily Breakdown</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">Date</th>
              <th className="text-right py-2 px-2">TXs</th>
              <th className="text-right py-2 px-2">Blocks</th>
              <th className="text-right py-2 px-2">Fees</th>
              <th className="text-right py-2 px-2">Output</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2 text-gray-300">{d.date}</td>
                <td className="py-1.5 px-2 text-right font-mono">{d.tx_count.toLocaleString()}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{d.block_count}</td>
                <td className="py-1.5 px-2 text-right text-green-400">₳{lovelaceToAda(d.total_fees, 0)}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">₳{compactNumber(Number(d.total_output) / 1e6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
CHARTSEOF

echo "=== Creating Token Holders page ==="
cat > "src/app/(explorer)/asset/[fingerprint]/holders/page.tsx" << 'HOLDERSEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { truncHash, compactNumber } from "@/lib/format";
import Link from "next/link";

export const revalidate = 300;

interface Holder {
  address: string; quantity: string;
}

export default async function TokenHoldersPage({ params }: { params: Promise<{ fingerprint: string }> }) {
  const { fingerprint } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let holders: Holder[] = [];
  let assetName = fingerprint;
  try {
    const [hRes, aRes] = await Promise.all([
      fetch(`${API}/asset/${fingerprint}/holders?limit=100`, { next: { revalidate: 300 } }),
      fetch(`${API}/asset/${fingerprint}`, { next: { revalidate: 300 } }),
    ]);
    if (hRes.ok) holders = await hRes.json();
    if (aRes.ok) {
      const asset = await aRes.json();
      assetName = asset.name_ascii || asset.fingerprint;
    }
  } catch {}

  const totalHeld = holders.reduce((s, h) => s + Number(h.quantity), 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/asset/${fingerprint}`} className="text-blue-400 hover:underline text-sm">&larr; {assetName}</Link>
        <h1 className="text-xl font-bold">/ Top Holders</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Unique Holders" value={holders.length >= 100 ? "100+" : holders.length.toString()} />
        <StatCard label="Top 100 Hold" value={compactNumber(totalHeld)} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Address</th>
              <th className="text-right py-2 px-2">Quantity</th>
              <th className="text-right py-2 px-2">% of Top 100</th>
            </tr>
          </thead>
          <tbody>
            {holders.map((h, i) => (
              <tr key={h.address} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <Link href={`/address/${h.address}`} className="text-blue-400 hover:underline font-mono text-xs">
                    {truncHash(h.address, 14)}
                  </Link>
                </td>
                <td className="py-1.5 px-2 text-right font-mono">{compactNumber(Number(h.quantity))}</td>
                <td className="py-1.5 px-2 text-right text-xs text-gray-400">
                  {totalHeld > 0 ? ((Number(h.quantity) / totalHeld) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
HOLDERSEOF

echo "=== Updating Asset detail page with holders link ==="
cat > "src/app/(explorer)/asset/[fingerprint]/page.tsx" << 'ASSETDETEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber, truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

interface AssetDetail {
  policy_id: string; asset_name: string; fingerprint: string;
  name_ascii: string | null; total_supply: string; mint_count: number;
  holder_count: number;
  mint_history: Array<{ quantity: string; tx_hash: string; time: string }>;
}

export default async function AssetPage({ params }: { params: Promise<{ fingerprint: string }> }) {
  const { fingerprint } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let asset: AssetDetail | null = null;
  try {
    const res = await fetch(`${API}/asset/${fingerprint}`, { next: { revalidate: 120 } });
    if (res.ok) asset = await res.json();
  } catch {}

  if (!asset) return <div className="text-center py-12 text-gray-500">Asset not found</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{asset.name_ascii || asset.fingerprint}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Supply" value={compactNumber(Number(asset.total_supply))} />
        <StatCard label="Mint Events" value={asset.mint_count.toLocaleString()} />
        <StatCard label="Holders" value={asset.holder_count.toLocaleString()} />
        <StatCard label="Fingerprint" value={truncHash(asset.fingerprint, 8)} />
      </div>

      <div className="flex gap-2">
        <Link href={`/asset/${asset.fingerprint}/holders`}
          className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-blue-400 transition-colors">
          View Top Holders →
        </Link>
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Policy ID</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{asset.policy_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Asset Name (hex)</dt>
            <dd className="font-mono text-xs text-gray-400">{asset.asset_name}</dd>
          </div>
          {asset.name_ascii && (
            <div>
              <dt className="text-gray-500 text-xs">Asset Name (ASCII)</dt>
              <dd>{asset.name_ascii}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Mint History</h2>
        <div className="space-y-1">
          {asset.mint_history.map((m, i) => (
            <div key={i} className="flex justify-between py-1.5 px-2 text-sm border-b border-gray-800/50">
              <Link href={`/tx/${m.tx_hash}`} className="text-blue-400 font-mono text-xs hover:underline">
                {truncHash(m.tx_hash, 10)}
              </Link>
              <div className="text-right text-xs">
                <span className={Number(m.quantity) >= 0 ? "text-green-400" : "text-red-400"}>
                  {Number(m.quantity) >= 0 ? "+" : ""}{compactNumber(Number(m.quantity))}
                </span>
                <span className="text-gray-500 ml-2">{timeAgo(m.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
ASSETDETEOF

echo "=== Creating Pool Blocks page ==="
cat > "src/app/(explorer)/pool/[id]/blocks/page.tsx" << 'POOLBLKEOF'
import { Card } from "@/components/ui/Card";
import { truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

export const revalidate = 60;

interface PoolBlock {
  block_no: number; hash: string; epoch_no: number;
  slot_no: number; time: string; tx_count: number; size: number;
}

export default async function PoolBlocksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let blocks: PoolBlock[] = [];
  try {
    const res = await fetch(`${API}/pool/${id}/blocks?limit=50`, { next: { revalidate: 60 } });
    if (res.ok) blocks = await res.json();
  } catch {}

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/pool/${id}`} className="text-blue-400 hover:underline text-sm">&larr; Pool</Link>
        <h1 className="text-xl font-bold">/ Recent Blocks</h1>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">Block</th>
              <th className="text-left py-2 px-2">Hash</th>
              <th className="text-right py-2 px-2">Epoch</th>
              <th className="text-right py-2 px-2">TXs</th>
              <th className="text-right py-2 px-2">Size</th>
              <th className="text-right py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-1.5 px-2 text-blue-400 font-mono">
                  <Link href={`/block/${b.hash}`} className="hover:underline">#{b.block_no}</Link>
                </td>
                <td className="py-1.5 px-2 font-mono text-xs text-gray-400">{truncHash(b.hash, 10)}</td>
                <td className="py-1.5 px-2 text-right text-gray-400">{b.epoch_no}</td>
                <td className="py-1.5 px-2 text-right">{b.tx_count}</td>
                <td className="py-1.5 px-2 text-right text-xs text-gray-500">{(b.size / 1024).toFixed(1)}KB</td>
                <td className="py-1.5 px-2 text-right text-xs text-gray-500">{timeAgo(b.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
POOLBLKEOF

echo "=== Updating Pool detail page with blocks link ==="
cat > "src/app/(explorer)/pool/[id]/page.tsx" << 'POOLDETEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber, lovelaceToAda } from "@/lib/format";
import Link from "next/link";

interface PoolDetail {
  pool_hash: string; ticker: string | null; name: string | null;
  description: string | null; homepage: string | null;
  pledge: string; fixed_cost: string; margin: number;
  live_stake: string; delegator_count: number; blocks_minted: number;
  voting_power: string;
}

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let pool: PoolDetail | null = null;
  try {
    const res = await fetch(`${API}/pool/${id}`, { next: { revalidate: 120 } });
    if (res.ok) pool = await res.json();
  } catch {}

  if (!pool) return <div className="text-center py-12 text-gray-500">Pool not found</div>;

  const saturation = Number(pool.live_stake) > 0
    ? ((Number(pool.live_stake) / 68_000_000_000_000) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          {pool.ticker && (
            <span className="text-xs bg-blue-500/20 text-blue-400 rounded-full px-2 py-0.5">{pool.ticker}</span>
          )}
          <h1 className="text-lg font-bold">{pool.name || pool.pool_hash}</h1>
        </div>
        {pool.description && <p className="text-sm text-gray-400">{pool.description}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Live Stake" value={`₳${compactNumber(Number(pool.live_stake) / 1e6)}`}
          sub={`${saturation}% saturation`} />
        <StatCard label="Delegators" value={pool.delegator_count.toLocaleString()} />
        <StatCard label="Blocks Minted" value={pool.blocks_minted.toLocaleString()} />
        <StatCard label="Margin" value={`${(pool.margin * 100).toFixed(1)}%`}
          sub={`₳${lovelaceToAda(pool.fixed_cost, 0)} fixed`} />
      </div>

      <div className="flex gap-2">
        <Link href={`/pool/${id}/blocks`}
          className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-blue-400 transition-colors">
          View Minted Blocks →
        </Link>
        {pool.homepage && (
          <a href={pool.homepage} target="_blank" rel="noopener noreferrer"
            className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
            Homepage ↗
          </a>
        )}
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Pool ID</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{pool.pool_hash}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Pledge</dt>
            <dd>₳{lovelaceToAda(pool.pledge, 0)}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Voting Power</dt>
            <dd>₳{compactNumber(Number(pool.voting_power) / 1e6)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
POOLDETEOF

echo "=== Updating Header with new nav items ==="
cat > src/components/layout/Header.tsx << 'HEADEREOF'
import Link from "next/link";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/blocks", label: "Blocks" },
  { href: "/txs", label: "TXs" },
  { href: "/epochs", label: "Epochs" },
  { href: "/pools", label: "Pools" },
  { href: "/assets", label: "Assets" },
  { href: "/governance", label: "Governance" },
  { href: "/dreps", label: "DReps" },
  { href: "/whales", label: "Whales" },
  { href: "/richlist", label: "Rich List" },
  { href: "/charts", label: "Charts" },
  { href: "/wallet", label: "Wallet" },
  { href: "/search", label: "Search" },
];

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white tracking-tight">
          ADA<span className="text-blue-500">tool</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors whitespace-nowrap">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
HEADEREOF

echo ""
echo "=== Phase 3 frontend complete ==="
echo "Run: npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "Then: sudo systemctl restart adatool-frontend"
