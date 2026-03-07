#!/bin/bash
# Setup script for adatool-frontend on the server
# Run: bash setup-frontend.sh

set -e
cd /home/ubuntu/adatool-frontend

echo "=== Installing dependencies ==="
npm install @meshsdk/core@latest @meshsdk/react@latest lucide-react swr

echo "=== Creating directory structure ==="
mkdir -p src/lib
mkdir -p src/components/layout
mkdir -p src/components/ui
mkdir -p src/components/wallet
mkdir -p src/app/\(explorer\)/tx/\[hash\]
mkdir -p src/app/\(explorer\)/block/\[hash\]
mkdir -p src/app/\(explorer\)/address/\[addr\]
mkdir -p src/app/\(explorer\)/pools
mkdir -p src/app/\(explorer\)/assets
mkdir -p src/app/\(explorer\)/governance
mkdir -p src/app/wallet
mkdir -p src/app/api/health

echo "=== Creating files ==="

# ─── src/lib/api.ts ───
cat > src/lib/api.ts << 'APIEOF'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── Types ─────────────────────────────────────────

export interface Tip {
  block_no: number;
  epoch_no: number;
  slot_no: number;
  hash: string;
  time: string;
}

export interface EpochInfo {
  epoch_no: number;
  start_time: string;
  end_time: string;
  tx_count: number;
  blk_count: number;
  out_sum: string;
  fees: string;
}

export interface BlockSummary {
  block_no: number;
  hash: string;
  epoch_no: number;
  slot_no: number;
  time: string;
  tx_count: number;
  size: number;
  pool_name: string | null;
  pool_ticker: string | null;
}

export interface TxSummary {
  hash: string;
  block_no: number;
  block_time: string;
  fee: string;
  out_sum: string;
  size: number;
}

export interface AddressInfo {
  address: string;
  tx_count: number;
  balance: string;
  stake_address: string | null;
  utxos: Array<{
    tx_hash: string;
    tx_index: number;
    value: string;
    block_time: string;
  }>;
}

export interface PoolInfo {
  pool_hash: string;
  ticker: string | null;
  name: string | null;
  pledge: string;
  fixed_cost: string;
  margin: number;
  saturation: number;
  blocks_minted: number;
  live_stake: string;
  delegator_count: number;
}

export interface AssetInfo {
  policy_id: string;
  asset_name: string;
  fingerprint: string;
  total_supply: string;
  mint_tx_count: number;
  name_ascii: string;
}

export interface GovAction {
  tx_hash: string;
  cert_index: number;
  type: string;
  epoch: number;
  title: string | null;
  abstract: string | null;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
}

export interface SearchResult {
  type: "tx" | "block" | "address" | "pool" | "asset";
  value: string;
  label: string;
}

// ─── API Functions ──────────────────────────────────

export const api = {
  tip: () => fetchAPI<Tip>("/tip"),
  epoch: (n?: number) => fetchAPI<EpochInfo>(n ? `/epoch/${n}` : "/epoch/latest"),
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
APIEOF

# ─── src/lib/format.ts ───
cat > src/lib/format.ts << 'FMTEOF'
/** Format lovelace to ADA with comma separators */
export function lovelaceToAda(lovelace: string | number, decimals = 2): string {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Truncate hash for display */
export function truncHash(hash: string, len = 8): string {
  if (!hash || hash.length <= len * 2) return hash;
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}

/** Relative time (e.g. "3m ago") */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Format large numbers with K/M/B suffixes */
export function compactNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}
FMTEOF

# ─── src/components/layout/Header.tsx ───
cat > src/components/layout/Header.tsx << 'HEADEREOF'
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/blocks", label: "Blocks" },
  { href: "/pools", label: "Pools" },
  { href: "/assets", label: "Assets" },
  { href: "/governance", label: "Governance" },
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
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-bold text-white">
            ADA<span className="text-blue-400">tool</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {Icon && <Icon size={14} />}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Search */}
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

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-gray-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Nav */}
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

# ─── src/components/ui/Card.tsx ───
cat > src/components/ui/Card.tsx << 'CARDEOF'
import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  );
}
CARDEOF

# ─── src/app/layout.tsx (overwrite default) ───
cat > src/app/layout.tsx << 'LAYOUTEOF'
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "ADAtool — Cardano Explorer & Governance",
  description:
    "Comprehensive Cardano blockchain explorer with governance analytics, pool rankings, native assets, and wallet integration.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
          ADAtool.net — Powered by cardano-db-sync
        </footer>
      </body>
    </html>
  );
}
LAYOUTEOF

# ─── src/app/globals.css (overwrite) ───
cat > src/app/globals.css << 'CSSEOF'
@import "tailwindcss";

:root {
  --background: #030712;
  --foreground: #f3f4f6;
}

body {
  background: var(--background);
  color: var(--foreground);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #111827;
}
::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 3px;
}
CSSEOF

# ─── src/app/page.tsx (Dashboard) ───
cat > src/app/page.tsx << 'DASHEOF'
import { api, Tip, EpochInfo, BlockSummary, TxSummary } from "@/lib/api";
import { lovelaceToAda, truncHash, timeAgo, compactNumber } from "@/lib/format";
import { StatCard, Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 30;

export default async function Dashboard() {
  let tip: Tip | null = null;
  let epoch: EpochInfo | null = null;
  let blocks: BlockSummary[] = [];
  let txs: TxSummary[] = [];

  try {
    [tip, epoch, blocks, txs] = await Promise.all([
      api.tip(),
      api.epoch(),
      api.blocks(10),
      api.txs(10),
    ]);
  } catch (e) {
    console.error("Dashboard data fetch error:", e);
  }

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Block Height"
          value={tip ? compactNumber(tip.block_no) : "—"}
          sub={tip ? `Slot ${tip.slot_no.toLocaleString()}` : undefined}
        />
        <StatCard
          label="Epoch"
          value={epoch?.epoch_no ?? "—"}
          sub={epoch ? `${epoch.blk_count?.toLocaleString()} blocks` : undefined}
        />
        <StatCard
          label="Epoch TX Count"
          value={epoch ? compactNumber(epoch.tx_count) : "—"}
        />
        <StatCard
          label="Epoch Fees"
          value={epoch ? `₳${lovelaceToAda(epoch.fees, 0)}` : "—"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Latest Blocks */}
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Latest Blocks</h2>
            <Link href="/blocks" className="text-xs text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {blocks.map((b) => (
              <Link
                key={b.hash}
                href={`/block/${b.hash}`}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-800/50 text-sm"
              >
                <div>
                  <span className="text-blue-400 font-mono">#{b.block_no}</span>
                  <span className="text-gray-500 ml-2">{b.pool_ticker || "—"}</span>
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
            <Link href="/txs" className="text-xs text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {txs.map((t) => (
              <Link
                key={t.hash}
                href={`/tx/${t.hash}`}
                className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-gray-800/50 text-sm"
              >
                <span className="text-blue-400 font-mono">{truncHash(t.hash)}</span>
                <div className="text-right text-xs text-gray-500">
                  <span>₳{lovelaceToAda(t.out_sum, 0)}</span>
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

# ─── src/app/(explorer)/pools/page.tsx ───
cat > "src/app/(explorer)/pools/page.tsx" << 'POOLEOF'
import { api, PoolInfo } from "@/lib/api";
import { lovelaceToAda, compactNumber } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 60;

export default async function PoolsPage() {
  let pools: PoolInfo[] = [];
  try {
    pools = await api.pools(100);
  } catch (e) {
    console.error("Pools fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Stake Pools</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Pool</th>
              <th className="text-right py-2 px-2">Live Stake</th>
              <th className="text-right py-2 px-2">Saturation</th>
              <th className="text-right py-2 px-2">Blocks</th>
              <th className="text-right py-2 px-2">Delegators</th>
              <th className="text-right py-2 px-2">Margin</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((p, i) => (
              <tr key={p.pool_hash} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2">
                  <Link href={`/pool/${p.pool_hash}`} className="text-blue-400 hover:underline">
                    {p.ticker || p.name || p.pool_hash.slice(0, 12)}
                  </Link>
                  {p.name && p.ticker && (
                    <span className="text-gray-500 ml-1 text-xs">{p.name}</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono">₳{compactNumber(Number(p.live_stake) / 1e6)}</td>
                <td className="py-2 px-2 text-right">
                  <span className={p.saturation > 0.95 ? "text-red-400" : p.saturation > 0.8 ? "text-yellow-400" : "text-green-400"}>
                    {(p.saturation * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right">{p.blocks_minted.toLocaleString()}</td>
                <td className="py-2 px-2 text-right">{p.delegator_count.toLocaleString()}</td>
                <td className="py-2 px-2 text-right">{(p.margin * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
POOLEOF

# ─── src/app/(explorer)/assets/page.tsx ───
cat > "src/app/(explorer)/assets/page.tsx" << 'ASSETEOF'
import { api, AssetInfo } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 60;

export default async function AssetsPage() {
  let assets: AssetInfo[] = [];
  try {
    assets = await api.assets(100);
  } catch (e) {
    console.error("Assets fetch error:", e);
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Native Assets</h1>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Asset</th>
              <th className="text-left py-2 px-2">Fingerprint</th>
              <th className="text-right py-2 px-2">Supply</th>
              <th className="text-right py-2 px-2">Mint TXs</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={a.fingerprint} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2 text-blue-400 font-medium">
                  {a.name_ascii || a.asset_name || "—"}
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-400">
                  {a.fingerprint}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {Number(a.total_supply).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right">{a.mint_tx_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
ASSETEOF

# ─── src/app/(explorer)/governance/page.tsx ───
cat > "src/app/(explorer)/governance/page.tsx" << 'GOVEOF'
import { api, GovAction } from "@/lib/api";
import { truncHash } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 60;

export default async function GovernancePage() {
  let actions: GovAction[] = [];
  try {
    actions = await api.governance(50);
  } catch (e) {
    console.error("Governance fetch error:", e);
  }

  const typeColors: Record<string, string> = {
    TreasuryWithdrawals: "bg-emerald-500/20 text-emerald-400",
    ParameterChange: "bg-orange-500/20 text-orange-400",
    HardForkInitiation: "bg-red-500/20 text-red-400",
    NoConfidence: "bg-red-500/20 text-red-300",
    UpdateCommittee: "bg-purple-500/20 text-purple-400",
    NewConstitution: "bg-blue-500/20 text-blue-400",
    InfoAction: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Governance Actions</h1>
      <div className="space-y-3">
        {actions.map((a) => (
          <Card key={`${a.tx_hash}-${a.cert_index}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[a.type] || "bg-gray-700 text-gray-300"}`}>
                    {a.type}
                  </span>
                  <span className="text-xs text-gray-500">Epoch {a.epoch}</span>
                </div>
                <p className="text-sm text-white font-medium truncate">
                  {a.title || `Action ${truncHash(a.tx_hash)}#${a.cert_index}`}
                </p>
                {a.abstract && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.abstract}</p>
                )}
              </div>
              <div className="text-right text-xs shrink-0">
                <div className="text-green-400">Yes: {a.yes_votes}</div>
                <div className="text-red-400">No: {a.no_votes}</div>
                <div className="text-gray-500">Abstain: {a.abstain_votes}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
GOVEOF

# ─── src/app/(explorer)/tx/[hash]/page.tsx ───
cat > "src/app/(explorer)/tx/[hash]/page.tsx" << 'TXEOF'
import { api } from "@/lib/api";
import { lovelaceToAda } from "@/lib/format";
import { Card } from "@/components/ui/Card";

export default async function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let tx = null;
  try {
    tx = await api.tx(hash);
  } catch {}

  if (!tx) {
    return <div className="text-center py-12 text-gray-500">Transaction not found</div>;
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Transaction Details</h1>
      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Hash</dt>
            <dd className="font-mono text-blue-400 break-all">{tx.hash}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Block</dt>
              <dd>{tx.block_no}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Time</dt>
              <dd>{new Date(tx.block_time).toLocaleString()}</dd>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Output</dt>
              <dd>₳{lovelaceToAda(tx.out_sum)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Fee</dt>
              <dd>₳{lovelaceToAda(tx.fee)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Size</dt>
            <dd>{tx.size} bytes</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
TXEOF

# ─── src/app/(explorer)/block/[hash]/page.tsx ───
cat > "src/app/(explorer)/block/[hash]/page.tsx" << 'BLKEOF'
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";

export default async function BlockPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let block = null;
  try {
    block = await api.block(hash);
  } catch {}

  if (!block) {
    return <div className="text-center py-12 text-gray-500">Block not found</div>;
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Block #{block.block_no}</h1>
      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Hash</dt>
            <dd className="font-mono text-blue-400 break-all">{block.hash}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Epoch / Slot</dt>
              <dd>{block.epoch_no} / {block.slot_no}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Time</dt>
              <dd>{new Date(block.time).toLocaleString()}</dd>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Transactions</dt>
              <dd>{block.tx_count}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Size</dt>
              <dd>{block.size} bytes</dd>
            </div>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Pool</dt>
            <dd>{block.pool_ticker || block.pool_name || "—"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
BLKEOF

# ─── src/app/(explorer)/address/[addr]/page.tsx ───
cat > "src/app/(explorer)/address/[addr]/page.tsx" << 'ADDREOF'
import { api } from "@/lib/api";
import { lovelaceToAda, truncHash } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default async function AddressPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  let info = null;
  try {
    info = await api.address(addr);
  } catch {}

  if (!info) {
    return <div className="text-center py-12 text-gray-500">Address not found</div>;
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">Address</h1>
      <Card className="mb-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Address</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{info.address}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Balance</dt>
              <dd>₳{lovelaceToAda(info.balance)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">TX Count</dt>
              <dd>{info.tx_count}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">Stake Address</dt>
              <dd className="font-mono text-xs truncate">{info.stake_address || "—"}</dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">UTXOs</h2>
        <div className="space-y-2">
          {(info.utxos || []).slice(0, 20).map((u, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
              <Link href={`/tx/${u.tx_hash}`} className="text-blue-400 font-mono text-xs">
                {truncHash(u.tx_hash)}#{u.tx_index}
              </Link>
              <span>₳{lovelaceToAda(u.value)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
ADDREOF

# ─── src/app/wallet/page.tsx ───
cat > src/app/wallet/page.tsx << 'WALLETEOF'
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Wallet, LogOut, Copy, ExternalLink } from "lucide-react";

// Mesh SDK will be dynamically imported to avoid SSR issues
let BrowserWallet: any = null;

export default function WalletPage() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [walletApi, setWalletApi] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Dynamically import Mesh SDK (client-side only)
    import("@meshsdk/core").then((mod) => {
      BrowserWallet = mod.BrowserWallet;
      BrowserWallet.getInstalledWallets().then((ws: any[]) => {
        setWallets(ws.map((w: any) => w.name));
      });
    }).catch(() => {
      setError("Mesh SDK failed to load");
    });
  }, []);

  const connectWallet = async (name: string) => {
    if (!BrowserWallet) return;
    setLoading(true);
    setError("");
    try {
      const wallet = await BrowserWallet.enable(name);
      setWalletApi(wallet);
      const addr = await wallet.getChangeAddress();
      setAddress(addr);
      const bal = await wallet.getLovelace();
      setBalance(bal);
      setConnected(true);
    } catch (e: any) {
      setError(e.message || "Failed to connect wallet");
    }
    setLoading(false);
  };

  const disconnect = () => {
    setWalletApi(null);
    setAddress("");
    setBalance("");
    setConnected(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
  };

  const adaBalance = balance ? (Number(balance) / 1_000_000).toFixed(2) : "0";

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Wallet size={20} /> Wallet
      </h1>

      {!connected ? (
        <Card>
          <p className="text-sm text-gray-400 mb-4">
            Connect your Cardano wallet to view balances, delegate, and vote on governance actions.
          </p>
          {wallets.length === 0 && !error && (
            <p className="text-sm text-gray-500">
              No CIP-30 wallets detected. Install Eternl, Lace, or Nami to connect.
            </p>
          )}
          <div className="space-y-2">
            {wallets.map((name) => (
              <button
                key={name}
                onClick={() => connectWallet(name)}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-between disabled:opacity-50"
              >
                <span className="capitalize">{name}</span>
                <span className="text-xs text-gray-400">Connect →</span>
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-500">Connected Wallet</p>
                <p className="text-2xl font-bold">₳{Number(adaBalance).toLocaleString()}</p>
              </div>
              <button onClick={disconnect} className="text-gray-400 hover:text-red-400">
                <LogOut size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-gray-400 truncate flex-1">{address}</p>
              <button onClick={copyAddress} className="text-gray-500 hover:text-white">
                <Copy size={14} />
              </button>
              <a
                href={`/address/${address}`}
                className="text-gray-500 hover:text-blue-400"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
                View Assets
              </button>
              <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
                Delegation
              </button>
              <button className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm text-blue-400">
                Governance
              </button>
              <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
                TX History
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
WALLETEOF

# ─── src/app/api/health/route.ts ───
cat > src/app/api/health/route.ts << 'HEALTHEOF'
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
HEALTHEOF

# ─── .env.local ───
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.adatool.net
ENVEOF

# ─── next.config.ts (overwrite) ───
cat > next.config.ts << 'NCEOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
NCEOF

echo ""
echo "=== Done! ==="
echo "Next steps:"
echo "  1. npm run build"
echo "  2. npm start (or use PM2/systemd)"
echo ""
