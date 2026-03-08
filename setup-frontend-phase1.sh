#!/bin/bash
# Phase 1: Full Explorer pages setup
# Run from /home/ubuntu/adatool-frontend

set -e
cd /home/ubuntu/adatool-frontend

echo "=== Creating directories ==="
mkdir -p src/app/blocks
mkdir -p src/app/txs
mkdir -p src/app/search
mkdir -p src/app/\(explorer\)/pool/\[id\]
mkdir -p src/app/\(explorer\)/dreps
mkdir -p src/app/\(explorer\)/drep/\[id\]
mkdir -p src/app/\(explorer\)/epochs
mkdir -p src/app/\(explorer\)/epoch/\[no\]

echo "=== Creating /blocks page ==="
cat > src/app/blocks/page.tsx << 'BLOCKSEOF'
import { api, BlockSummary } from "@/lib/api";
import { truncHash, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 15;

export default async function BlocksPage() {
  let blocks: BlockSummary[] = [];
  try {
    blocks = await api.blocks(50);
  } catch (e) {
    console.error("Blocks fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Latest Blocks</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">Block</th>
              <th className="text-left py-2 px-2">Hash</th>
              <th className="text-left py-2 px-2">Pool</th>
              <th className="text-right py-2 px-2">Epoch</th>
              <th className="text-right py-2 px-2">TXs</th>
              <th className="text-right py-2 px-2">Size</th>
              <th className="text-right py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2">
                  <Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline font-mono">
                    #{b.block_no}
                  </Link>
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-400">
                  <Link href={`/block/${b.hash}`} className="hover:text-blue-400">
                    {truncHash(b.hash, 10)}
                  </Link>
                </td>
                <td className="py-2 px-2">
                  <span className="text-yellow-400">{b.pool_ticker || "—"}</span>
                </td>
                <td className="py-2 px-2 text-right text-gray-400">{b.epoch_no}</td>
                <td className="py-2 px-2 text-right">{b.tx_count}</td>
                <td className="py-2 px-2 text-right text-gray-400">{(b.size / 1024).toFixed(1)}KB</td>
                <td className="py-2 px-2 text-right text-gray-500 text-xs">{timeAgo(b.time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
BLOCKSEOF

echo "=== Creating /txs page ==="
cat > src/app/txs/page.tsx << 'TXSEOF'
import { api, TxSummary } from "@/lib/api";
import { lovelaceToAda, truncHash, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 15;

export default async function TxsPage() {
  let txs: TxSummary[] = [];
  try {
    txs = await api.txs(50);
  } catch (e) {
    console.error("TXs fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Latest Transactions</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">Hash</th>
              <th className="text-right py-2 px-2">Block</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-right py-2 px-2">Fee</th>
              <th className="text-right py-2 px-2">Size</th>
              <th className="text-right py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2">
                  <Link href={`/tx/${t.hash}`} className="text-blue-400 hover:underline font-mono text-xs">
                    {truncHash(t.hash, 12)}
                  </Link>
                </td>
                <td className="py-2 px-2 text-right">
                  <Link href={`/block/${t.block_no}`} className="text-gray-400 hover:text-blue-400">
                    #{t.block_no}
                  </Link>
                </td>
                <td className="py-2 px-2 text-right font-mono">₳{lovelaceToAda(t.out_sum, 2)}</td>
                <td className="py-2 px-2 text-right text-gray-400 font-mono text-xs">₳{lovelaceToAda(t.fee, 4)}</td>
                <td className="py-2 px-2 text-right text-gray-400">{t.size}B</td>
                <td className="py-2 px-2 text-right text-gray-500 text-xs">{timeAgo(t.block_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
TXSEOF

echo "=== Creating /search page ==="
cat > src/app/search/page.tsx << 'SEARCHEOF'
import { api, SearchResult } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Suspense } from "react";

function SearchContent({ q }: { q: string }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Searching...</p>}>
      <SearchResults q={q} />
    </Suspense>
  );
}

async function SearchResults({ q }: { q: string }) {
  if (!q || q.length < 3) {
    return <p className="text-gray-500">Enter at least 3 characters to search.</p>;
  }

  let results: SearchResult[] = [];
  try {
    results = await api.search(q);
  } catch {}

  if (!results.length) {
    return <p className="text-gray-500">No results found for &quot;{q}&quot;</p>;
  }

  const typeLinks: Record<string, (v: string) => string> = {
    tx: (v) => `/tx/${v}`,
    block: (v) => `/block/${v}`,
    address: (v) => `/address/${v}`,
    pool: (v) => `/pool/${v}`,
    asset: (v) => `/assets`,
  };

  const typeColors: Record<string, string> = {
    tx: "bg-blue-500/20 text-blue-400",
    block: "bg-purple-500/20 text-purple-400",
    address: "bg-green-500/20 text-green-400",
    pool: "bg-yellow-500/20 text-yellow-400",
    asset: "bg-pink-500/20 text-pink-400",
  };

  return (
    <div className="space-y-2">
      {results.map((r, i) => (
        <Link key={i} href={typeLinks[r.type]?.(r.value) || "#"}>
          <Card className="hover:border-gray-600 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${typeColors[r.type] || "bg-gray-700 text-gray-300"}`}>
                {r.type}
              </span>
              <span className="text-sm text-white">{r.label}</span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        Search Results {q && <span className="text-gray-500 font-normal">for &quot;{q}&quot;</span>}
      </h1>
      <SearchContent q={q} />
    </div>
  );
}
SEARCHEOF

echo "=== Enhancing TX detail with inputs/outputs ==="
cat > "src/app/(explorer)/tx/[hash]/page.tsx" << 'TXDETAILEOF'
import { api } from "@/lib/api";
import { lovelaceToAda, truncHash } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface TxDetail {
  hash: string;
  block_no: number;
  block_time: string;
  fee: string;
  out_sum: string;
  size: number;
  deposit: string;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  script_size: number;
  inputs: Array<{ tx_hash: string; tx_out_index: number; value: string; address: string }>;
  outputs: Array<{ index: number; address: string; value: string }>;
}

export default async function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let tx: TxDetail | null = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net"}/tx/${hash}`,
      { next: { revalidate: 600 } }
    );
    if (res.ok) tx = await res.json();
  } catch {}

  if (!tx) {
    return <div className="text-center py-12 text-gray-500">Transaction not found</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Transaction Details</h1>

      {/* Summary */}
      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Hash</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{tx.hash}</dd>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Block</dt>
              <dd>
                <Link href={`/block/${tx.block_no}`} className="text-blue-400 hover:underline">
                  #{tx.block_no}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Time</dt>
              <dd>{new Date(tx.block_time).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Total Output</dt>
              <dd className="text-green-400">₳{lovelaceToAda(tx.out_sum)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Fee</dt>
              <dd className="text-yellow-400">₳{lovelaceToAda(tx.fee)}</dd>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Size</dt>
              <dd>{tx.size} bytes</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Deposit</dt>
              <dd>₳{lovelaceToAda(tx.deposit || "0")}</dd>
            </div>
            {tx.invalid_hereafter && (
              <div>
                <dt className="text-gray-500 text-xs">TTL</dt>
                <dd>Slot {tx.invalid_hereafter}</dd>
              </div>
            )}
            {tx.script_size > 0 && (
              <div>
                <dt className="text-gray-500 text-xs">Script Size</dt>
                <dd>{tx.script_size} bytes</dd>
              </div>
            )}
          </div>
        </dl>
      </Card>

      {/* Inputs & Outputs */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Inputs ({tx.inputs?.length || 0})
          </h2>
          <div className="space-y-2">
            {(tx.inputs || []).map((inp, i) => (
              <div key={i} className="p-2 bg-gray-800/50 rounded text-xs">
                <Link href={`/address/${inp.address}`} className="text-blue-400 hover:underline break-all">
                  {inp.address.slice(0, 30)}...{inp.address.slice(-10)}
                </Link>
                <div className="flex justify-between mt-1 text-gray-400">
                  <Link href={`/tx/${inp.tx_hash}`} className="hover:text-blue-400 font-mono">
                    {truncHash(inp.tx_hash, 6)}#{inp.tx_out_index}
                  </Link>
                  <span className="text-green-400">₳{lovelaceToAda(inp.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Outputs ({tx.outputs?.length || 0})
          </h2>
          <div className="space-y-2">
            {(tx.outputs || []).map((out, i) => (
              <div key={i} className="p-2 bg-gray-800/50 rounded text-xs">
                <Link href={`/address/${out.address}`} className="text-blue-400 hover:underline break-all">
                  {out.address.slice(0, 30)}...{out.address.slice(-10)}
                </Link>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">#{out.index}</span>
                  <span className="text-green-400">₳{lovelaceToAda(out.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
TXDETAILEOF

echo "=== Enhancing Block detail with TX list ==="
cat > "src/app/(explorer)/block/[hash]/page.tsx" << 'BLKDETAILEOF'
import { api, TxSummary } from "@/lib/api";
import { lovelaceToAda, truncHash, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

interface BlockDetail {
  block_no: number;
  hash: string;
  epoch_no: number;
  slot_no: string;
  time: string;
  tx_count: string;
  size: number;
  pool_name: string | null;
  pool_ticker: string | null;
  transactions?: TxSummary[];
}

export default async function BlockPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let block: BlockDetail | null = null;
  try {
    // Could be a block number or hash
    const endpoint = /^\d+$/.test(hash) ? `${API}/block/by-number/${hash}` : `${API}/block/${hash}`;
    const res = await fetch(endpoint, { next: { revalidate: 600 } });
    if (res.ok) block = await res.json();
  } catch {}

  if (!block) {
    return <div className="text-center py-12 text-gray-500">Block not found</div>;
  }

  // Fetch transactions for this block
  let txs: TxSummary[] = [];
  try {
    const res = await fetch(`${API}/block/${block.hash}/txs`, { next: { revalidate: 600 } });
    if (res.ok) txs = await res.json();
  } catch {}

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Block #{block.block_no}</h1>

      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Hash</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{block.hash}</dd>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Epoch / Slot</dt>
              <dd>{block.epoch_no} / {block.slot_no}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Time</dt>
              <dd>{new Date(block.time).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Transactions</dt>
              <dd>{block.tx_count}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Size</dt>
              <dd>{(block.size / 1024).toFixed(1)} KB</dd>
            </div>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Pool</dt>
            <dd>
              {block.pool_ticker ? (
                <span className="text-yellow-400">[{block.pool_ticker}]</span>
              ) : null}
              {" "}
              {block.pool_name ? (
                <Link href={`/pool/${block.pool_name}`} className="text-blue-400 hover:underline font-mono text-xs">
                  {block.pool_name}
                </Link>
              ) : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Transactions in this block */}
      {txs.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Transactions ({txs.length})
          </h2>
          <div className="space-y-1">
            {txs.map((t) => (
              <Link
                key={t.hash}
                href={`/tx/${t.hash}`}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-800/50 text-sm"
              >
                <span className="text-blue-400 font-mono text-xs">{truncHash(t.hash, 12)}</span>
                <div className="text-right text-xs text-gray-400">
                  <span className="text-green-400">₳{lovelaceToAda(t.out_sum, 2)}</span>
                  <span className="ml-3">Fee: ₳{lovelaceToAda(t.fee, 4)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
BLKDETAILEOF

echo "=== Creating Pool detail page ==="
cat > "src/app/(explorer)/pool/[id]/page.tsx" << 'POOLDETEOF'
import { lovelaceToAda, compactNumber } from "@/lib/format";
import { Card, StatCard } from "@/components/ui/Card";
import Link from "next/link";

interface PoolDetail {
  pool_hash: string;
  ticker: string | null;
  name: string | null;
  description: string | null;
  homepage: string | null;
  pledge: string;
  fixed_cost: string;
  margin: number;
  live_stake: string;
  delegator_count: number;
  blocks_minted: number;
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

  if (!pool) {
    return <div className="text-center py-12 text-gray-500">Pool not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {pool.ticker && (
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold">
            {pool.ticker}
          </span>
        )}
        <h1 className="text-lg font-bold">{pool.name || pool.pool_hash}</h1>
      </div>

      {pool.description && (
        <p className="text-sm text-gray-400">{pool.description}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Live Stake" value={`₳${compactNumber(Number(pool.live_stake) / 1e6)}`} />
        <StatCard label="Delegators" value={pool.delegator_count.toLocaleString()} />
        <StatCard label="Blocks Minted" value={pool.blocks_minted.toLocaleString()} />
        <StatCard label="Margin" value={`${(pool.margin * 100).toFixed(1)}%`} sub={`Fixed: ₳${lovelaceToAda(pool.fixed_cost, 0)}`} />
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Pool ID</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{pool.pool_hash}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Pledge</dt>
              <dd>₳{lovelaceToAda(pool.pledge, 0)}</dd>
            </div>
            {pool.homepage && (
              <div>
                <dt className="text-gray-500 text-xs">Homepage</dt>
                <dd>
                  <a href={pool.homepage} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">
                    {pool.homepage}
                  </a>
                </dd>
              </div>
            )}
          </div>
          {pool.voting_power && Number(pool.voting_power) > 0 && (
            <div>
              <dt className="text-gray-500 text-xs">Voting Power</dt>
              <dd>₳{compactNumber(Number(pool.voting_power) / 1e6)}</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
POOLDETEOF

echo "=== Creating DReps page ==="
cat > "src/app/(explorer)/dreps/page.tsx" << 'DREPSEOF'
import { Card } from "@/components/ui/Card";
import { compactNumber, truncHash } from "@/lib/format";
import Link from "next/link";

export const revalidate = 120;

interface DRepInfo {
  drep_hash: string;
  has_script: boolean;
  deposit: string;
  voting_power: string;
  vote_count: number;
  anchor_url: string | null;
}

export default async function DrepsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let dreps: DRepInfo[] = [];
  try {
    const res = await fetch(`${API}/dreps?limit=100`, { next: { revalidate: 120 } });
    if (res.ok) dreps = await res.json();
  } catch (e) {
    console.error("DReps fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Delegated Representatives (DReps)</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">DRep ID</th>
              <th className="text-right py-2 px-2">Voting Power</th>
              <th className="text-right py-2 px-2">Votes Cast</th>
              <th className="text-right py-2 px-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {dreps.map((d, i) => (
              <tr key={d.drep_hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2">
                  <Link href={`/drep/${d.drep_hash}`} className="text-blue-400 hover:underline font-mono text-xs">
                    {truncHash(d.drep_hash, 12)}
                  </Link>
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  ₳{compactNumber(Number(d.voting_power) / 1e6)}
                </td>
                <td className="py-2 px-2 text-right">{d.vote_count}</td>
                <td className="py-2 px-2 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.has_script ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-300"}`}>
                    {d.has_script ? "Script" : "Key"}
                  </span>
                </td>
              </tr>
            ))}
            {dreps.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading DReps...</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
DREPSEOF

echo "=== Creating Epochs page ==="
cat > "src/app/(explorer)/epochs/page.tsx" << 'EPOCHSEOF'
import { Card } from "@/components/ui/Card";
import { lovelaceToAda, compactNumber } from "@/lib/format";
import Link from "next/link";

export const revalidate = 60;

interface EpochRow {
  epoch_no: number;
  start_time: string;
  end_time: string;
  tx_count: number;
  blk_count: number;
  out_sum: string;
  fees: string;
}

export default async function EpochsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";
  let epochs: EpochRow[] = [];
  try {
    const res = await fetch(`${API}/epochs?limit=30`, { next: { revalidate: 60 } });
    if (res.ok) epochs = await res.json();
  } catch (e) {
    console.error("Epochs fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Epochs</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">Epoch</th>
              <th className="text-left py-2 px-2">Start</th>
              <th className="text-right py-2 px-2">Blocks</th>
              <th className="text-right py-2 px-2">TXs</th>
              <th className="text-right py-2 px-2">Output</th>
              <th className="text-right py-2 px-2">Fees</th>
            </tr>
          </thead>
          <tbody>
            {epochs.map((e) => (
              <tr key={e.epoch_no} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2">
                  <Link href={`/epoch/${e.epoch_no}`} className="text-blue-400 hover:underline font-bold">
                    {e.epoch_no}
                  </Link>
                </td>
                <td className="py-2 px-2 text-gray-400 text-xs">
                  {new Date(e.start_time).toLocaleDateString()}
                </td>
                <td className="py-2 px-2 text-right">{e.blk_count?.toLocaleString()}</td>
                <td className="py-2 px-2 text-right">{compactNumber(e.tx_count)}</td>
                <td className="py-2 px-2 text-right font-mono text-xs">₳{compactNumber(Number(e.out_sum) / 1e6)}</td>
                <td className="py-2 px-2 text-right font-mono text-xs">₳{lovelaceToAda(e.fees, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
EPOCHSEOF

echo "=== Updating Header with new nav items ==="
cat > src/components/layout/Header.tsx << 'HEADEREOF'
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/blocks", label: "Blocks" },
  { href: "/txs", label: "TXs" },
  { href: "/epochs", label: "Epochs" },
  { href: "/pools", label: "Pools" },
  { href: "/assets", label: "Assets" },
  { href: "/governance", label: "Governance" },
  { href: "/dreps", label: "DReps" },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-white">
            ADA<span className="text-blue-400">tool</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  active
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {Icon && <Icon size={12} />}
                {label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={handleSearch} className="flex-1 max-w-md ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tx, block, address, pool..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>

        <button className="md:hidden text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-gray-800 p-2">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800"
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
HEADEREOF

echo "=== Updating API client with new types ==="
cat > src/lib/api.ts << 'APITSEOF'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Tip {
  block_no: number; epoch_no: number; slot_no: number; hash: string; time: string;
}
export interface EpochInfo {
  epoch_no: number; start_time: string; end_time: string;
  tx_count: number; blk_count: number; out_sum: string; fees: string;
}
export interface BlockSummary {
  block_no: number; hash: string; epoch_no: number; slot_no: string;
  time: string; tx_count: string; size: number;
  pool_name: string | null; pool_ticker: string | null;
}
export interface TxSummary {
  hash: string; block_no: number; block_time: string;
  fee: string; out_sum: string; size: number;
}
export interface AddressInfo {
  address: string; tx_count: number; balance: string;
  stake_address: string | null;
  utxos: Array<{ tx_hash: string; tx_index: number; value: string; block_time: string }>;
}
export interface PoolInfo {
  pool_hash: string; ticker: string | null; name: string | null;
  pledge: string; fixed_cost: string; margin: number; saturation: number;
  blocks_minted: number; live_stake: string; delegator_count: number;
}
export interface AssetInfo {
  policy_id: string; asset_name: string; fingerprint: string;
  total_supply: string; mint_tx_count: number; name_ascii: string | null;
}
export interface GovAction {
  tx_hash: string; cert_index: string; type: string; epoch: number;
  title: string | null; abstract: string | null;
  yes_votes: number; no_votes: number; abstain_votes: number;
}
export interface SearchResult {
  type: "tx" | "block" | "address" | "pool" | "asset";
  value: string; label: string;
}

export const api = {
  tip: () => fetchAPI<Tip>("/tip"),
  epoch: (n?: number) => fetchAPI<EpochInfo>(n ? `/epoch/${n}` : "/epoch/latest"),
  epochs: (limit = 30) => fetchAPI<EpochInfo[]>(`/epochs?limit=${limit}`),
  blocks: (limit = 20) => fetchAPI<BlockSummary[]>(`/blocks?limit=${limit}`),
  block: (hash: string) => fetchAPI<BlockSummary>(`/block/${hash}`),
  txs: (limit = 20) => fetchAPI<TxSummary[]>(`/txs?limit=${limit}`),
  tx: (hash: string) => fetchAPI<TxSummary>(`/tx/${hash}`),
  address: (addr: string) => fetchAPI<AddressInfo>(`/address/${addr}`),
  pools: (limit = 50) => fetchAPI<PoolInfo[]>(`/pools?limit=${limit}`),
  pool: (id: string) => fetchAPI<PoolInfo>(`/pool/${id}`),
  assets: (limit = 50) => fetchAPI<AssetInfo[]>(`/assets?limit=${limit}`),
  governance: (limit = 20) => fetchAPI<GovAction[]>(`/governance/actions?limit=${limit}`),
  search: (q: string) => fetchAPI<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
};
APITSEOF

echo ""
echo "=== Phase 1 frontend complete ==="
echo "Run: npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "Then: sudo systemctl restart adatool-frontend"
