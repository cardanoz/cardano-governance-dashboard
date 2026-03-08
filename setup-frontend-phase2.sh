#!/bin/bash
set -e
cd /home/ubuntu/adatool-frontend

echo "=== Phase 2: Creating directories ==="
mkdir -p src/app/\(explorer\)/asset/\[fingerprint\]
mkdir -p src/app/\(explorer\)/epoch/\[no\]
mkdir -p src/app/\(explorer\)/drep/\[id\]
mkdir -p src/app/\(explorer\)/governance/\[hash\]/\[index\]

echo "=== Updating Dashboard with network stats ==="
cat > src/app/page.tsx << 'DASHEOF'
import { api, Tip, EpochInfo, BlockSummary, TxSummary } from "@/lib/api";
import { lovelaceToAda, truncHash, timeAgo, compactNumber } from "@/lib/format";
import { StatCard, Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 30;

interface Stats {
  block_no: number; epoch_no: number;
  epoch_tx_count: number; epoch_blk_count: number; epoch_fees: string;
  total_stake: string; stakers: number;
  active_pools: number; total_proposals: number;
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
      {/* Network stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Block Height" value={stats ? compactNumber(stats.block_no) : "—"}
          sub={stats ? `Epoch ${stats.epoch_no}` : undefined} />
        <StatCard label="Epoch TXs" value={stats ? compactNumber(stats.epoch_tx_count) : "—"}
          sub={stats ? `${compactNumber(stats.epoch_blk_count)} blocks` : undefined} />
        <StatCard label="Total Staked" value={stats ? `₳${compactNumber(Number(stats.total_stake) / 1e6)}` : "—"}
          sub={stats ? `${compactNumber(stats.stakers)} stakers` : undefined} />
        <StatCard label="Active Pools" value={stats?.active_pools?.toLocaleString() || "—"} />
        <StatCard label="Gov Proposals" value={stats?.total_proposals?.toLocaleString() || "—"} />
        <StatCard label="Epoch Fees" value={stats ? `₳${lovelaceToAda(stats.epoch_fees, 0)}` : "—"} />
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

echo "=== Creating Asset detail page ==="
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

echo "=== Creating DRep detail page ==="
cat > "src/app/(explorer)/drep/[id]/page.tsx" << 'DREPDETEOF'
import { Card, StatCard } from "@/components/ui/Card";
import { compactNumber, truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

interface DRepDetail {
  drep_hash: string; has_script: boolean; deposit: string;
  voting_power: string; anchor_url: string | null;
  delegator_count: number;
  votes: Array<{
    vote: string; action_type: string; action_tx_hash: string;
    action_index: number; action_title: string | null; vote_time: string;
  }>;
}

export default async function DRepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let drep: DRepDetail | null = null;
  try {
    const res = await fetch(`${API}/drep/${id}`, { next: { revalidate: 120 } });
    if (res.ok) drep = await res.json();
  } catch {}

  if (!drep) return <div className="text-center py-12 text-gray-500">DRep not found</div>;

  const voteColors: Record<string, string> = {
    Yes: "bg-green-500/20 text-green-400",
    No: "bg-red-500/20 text-red-400",
    Abstain: "bg-gray-500/20 text-gray-400",
  };

  const yesCount = drep.votes.filter(v => v.vote === "Yes").length;
  const noCount = drep.votes.filter(v => v.vote === "No").length;
  const abstainCount = drep.votes.filter(v => v.vote === "Abstain").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${drep.has_script ? "bg-purple-500/20 text-purple-400" : "bg-gray-700 text-gray-300"}`}>
          {drep.has_script ? "Script" : "Key-based"}
        </span>
        <h1 className="text-lg font-bold font-mono">{truncHash(drep.drep_hash, 12)}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Voting Power" value={`₳${compactNumber(Number(drep.voting_power) / 1e6)}`} />
        <StatCard label="Delegators" value={drep.delegator_count.toLocaleString()} />
        <StatCard label="Yes Votes" value={yesCount.toString()} />
        <StatCard label="No Votes" value={noCount.toString()} />
        <StatCard label="Abstain" value={abstainCount.toString()} />
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">DRep Hash</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{drep.drep_hash}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs">Deposit</dt>
            <dd>₳{compactNumber(Number(drep.deposit) / 1e6)}</dd>
          </div>
          {drep.anchor_url && (
            <div>
              <dt className="text-gray-500 text-xs">Metadata URL</dt>
              <dd className="text-xs text-gray-400 break-all">{drep.anchor_url}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Voting History ({drep.votes.length})
        </h2>
        <div className="space-y-2">
          {drep.votes.map((v, i) => (
            <div key={i} className="flex items-start justify-between py-2 px-2 border-b border-gray-800/50 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${voteColors[v.vote] || "bg-gray-700 text-gray-300"}`}>
                    {v.vote}
                  </span>
                  <span className="text-xs text-gray-500">{v.action_type}</span>
                </div>
                <Link href={`/governance/${v.action_tx_hash}/${v.action_index}`}
                  className="text-xs text-blue-400 hover:underline truncate block">
                  {v.action_title || `${truncHash(v.action_tx_hash, 8)}#${v.action_index}`}
                </Link>
              </div>
              <span className="text-xs text-gray-500 shrink-0 ml-2">{timeAgo(v.vote_time)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
DREPDETEOF

echo "=== Creating Epoch detail page ==="
cat > "src/app/(explorer)/epoch/[no]/page.tsx" << 'EPOCHDETEOF'
import { api, EpochInfo } from "@/lib/api";
import { lovelaceToAda, compactNumber } from "@/lib/format";
import { Card, StatCard } from "@/components/ui/Card";

export default async function EpochPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  let epoch: EpochInfo | null = null;
  try {
    epoch = await api.epoch(parseInt(no));
  } catch {}

  if (!epoch) return <div className="text-center py-12 text-gray-500">Epoch not found</div>;

  const duration = new Date(epoch.end_time).getTime() - new Date(epoch.start_time).getTime();
  const elapsed = Date.now() - new Date(epoch.start_time).getTime();
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Epoch {epoch.epoch_no}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Transactions" value={compactNumber(epoch.tx_count)} />
        <StatCard label="Blocks" value={epoch.blk_count?.toLocaleString() || "—"} />
        <StatCard label="Total Output" value={`₳${compactNumber(Number(epoch.out_sum) / 1e6)}`} />
        <StatCard label="Fees" value={`₳${lovelaceToAda(epoch.fees, 0)}`} />
      </div>

      <Card>
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500 text-xs">Start Time</dt>
              <dd>{new Date(epoch.start_time).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">End Time</dt>
              <dd>{new Date(epoch.end_time).toLocaleString()}</dd>
            </div>
          </div>
          {progress < 100 && (
            <div>
              <dt className="text-gray-500 text-xs mb-1">Progress</dt>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <dd className="text-xs text-gray-400 mt-1">{progress.toFixed(1)}%</dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
EPOCHDETEOF

echo "=== Creating Governance action detail page ==="
cat > "src/app/(explorer)/governance/[hash]/[index]/page.tsx" << 'GOVDETEOF'
import { Card } from "@/components/ui/Card";
import { truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

interface GovActionDetail {
  tx_hash: string; cert_index: string; type: string; epoch: number;
  title: string | null; abstract: string | null;
  motivation: string | null; rationale: string | null;
  expiration: number | null; ratified_epoch: number | null;
  enacted_epoch: number | null; dropped_epoch: number | null;
  expired_epoch: number | null;
  votes: Array<{ voter_role: string; vote: string; voter_id: string; voter_type: string }>;
}

export default async function GovActionPage({ params }: { params: Promise<{ hash: string; index: string }> }) {
  const { hash, index } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let action: GovActionDetail | null = null;
  try {
    const res = await fetch(`${API}/governance/action/${hash}/${index}`, { next: { revalidate: 60 } });
    if (res.ok) action = await res.json();
  } catch {}

  if (!action) return <div className="text-center py-12 text-gray-500">Governance action not found</div>;

  const drepVotes = action.votes.filter(v => v.voter_type === "drep");
  const poolVotes = action.votes.filter(v => v.voter_type === "pool");
  const ccVotes = action.votes.filter(v => v.voter_type === "committee");

  const countVotes = (arr: typeof action.votes) => ({
    yes: arr.filter(v => v.vote === "Yes").length,
    no: arr.filter(v => v.vote === "No").length,
    abstain: arr.filter(v => v.vote === "Abstain").length,
  });

  const drepC = countVotes(drepVotes);
  const poolC = countVotes(poolVotes);

  const status = action.enacted_epoch ? "Enacted" :
    action.ratified_epoch ? "Ratified" :
    action.expired_epoch ? "Expired" :
    action.dropped_epoch ? "Dropped" : "Active";

  const statusColor: Record<string, string> = {
    Enacted: "bg-green-500/20 text-green-400",
    Ratified: "bg-blue-500/20 text-blue-400",
    Expired: "bg-gray-500/20 text-gray-400",
    Dropped: "bg-red-500/20 text-red-400",
    Active: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[status]}`}>{status}</span>
        <span className="text-xs text-gray-500">{action.type}</span>
      </div>
      <h1 className="text-lg font-bold">{action.title || `Action ${truncHash(action.tx_hash)}#${action.cert_index}`}</h1>

      {action.abstract && <p className="text-sm text-gray-400">{action.abstract}</p>}

      {/* Vote summary bar */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">DRep Votes</h2>
        <div className="flex gap-1 h-6 rounded overflow-hidden mb-2">
          {drepC.yes > 0 && <div className="bg-green-500" style={{ flex: drepC.yes }} />}
          {drepC.no > 0 && <div className="bg-red-500" style={{ flex: drepC.no }} />}
          {drepC.abstain > 0 && <div className="bg-gray-500" style={{ flex: drepC.abstain }} />}
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">Yes: {drepC.yes}</span>
          <span className="text-red-400">No: {drepC.no}</span>
          <span className="text-gray-400">Abstain: {drepC.abstain}</span>
        </div>

        <h2 className="text-sm font-semibold text-gray-300 mt-4 mb-3">SPO Votes</h2>
        <div className="flex gap-1 h-6 rounded overflow-hidden mb-2">
          {poolC.yes > 0 && <div className="bg-green-500" style={{ flex: poolC.yes }} />}
          {poolC.no > 0 && <div className="bg-red-500" style={{ flex: poolC.no }} />}
          {poolC.abstain > 0 && <div className="bg-gray-500" style={{ flex: poolC.abstain }} />}
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">Yes: {poolC.yes}</span>
          <span className="text-red-400">No: {poolC.no}</span>
          <span className="text-gray-400">Abstain: {poolC.abstain}</span>
        </div>

        {ccVotes.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-300 mt-4 mb-2">Committee Votes</h2>
            <div className="flex gap-4 text-xs">
              <span className="text-green-400">Yes: {ccVotes.filter(v => v.vote === "Yes").length}</span>
              <span className="text-red-400">No: {ccVotes.filter(v => v.vote === "No").length}</span>
            </div>
          </>
        )}
      </Card>

      {action.motivation && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Motivation</h2>
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{action.motivation.slice(0, 2000)}</p>
        </Card>
      )}

      {action.rationale && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Rationale</h2>
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{action.rationale.slice(0, 2000)}</p>
        </Card>
      )}

      {/* Individual DRep votes list */}
      {drepVotes.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">DRep Vote Details ({drepVotes.length})</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {drepVotes.map((v, i) => (
              <div key={i} className="flex justify-between items-center py-1 px-2 text-xs border-b border-gray-800/50">
                <Link href={`/drep/${v.voter_id}`} className="text-blue-400 hover:underline font-mono">
                  {truncHash(v.voter_id, 10)}
                </Link>
                <span className={v.vote === "Yes" ? "text-green-400" : v.vote === "No" ? "text-red-400" : "text-gray-400"}>
                  {v.vote}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
GOVDETEOF

echo "=== Enhancing Address page with tokens ==="
cat > "src/app/(explorer)/address/[addr]/page.tsx" << 'ADDREOF'
import { api } from "@/lib/api";
import { lovelaceToAda, truncHash, compactNumber } from "@/lib/format";
import { Card, StatCard } from "@/components/ui/Card";
import Link from "next/link";

interface TokenBalance {
  policy_id: string; asset_name: string; fingerprint: string;
  quantity: string; name_ascii: string | null;
}

export default async function AddressPage({ params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  const API = process.env.NEXT_PUBLIC_API_URL || "https://api.adatool.net";

  let info = null;
  let tokens: TokenBalance[] = [];
  try {
    const [infoRes, tokensRes] = await Promise.all([
      fetch(`${API}/address/${addr}`, { next: { revalidate: 30 } }),
      fetch(`${API}/address/${addr}/tokens`, { next: { revalidate: 30 } }),
    ]);
    if (infoRes.ok) info = await infoRes.json();
    if (tokensRes.ok) tokens = await tokensRes.json();
  } catch {}

  if (!info) return <div className="text-center py-12 text-gray-500">Address not found</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Address</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="ADA Balance" value={`₳${lovelaceToAda(info.balance, 2)}`} />
        <StatCard label="Transactions" value={info.tx_count.toLocaleString()} />
        <StatCard label="UTXOs" value={info.utxos?.length?.toString() || "0"} />
        <StatCard label="Tokens" value={tokens.length.toString()} />
      </div>

      <Card>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500 text-xs">Address</dt>
            <dd className="font-mono text-blue-400 break-all text-xs">{info.address}</dd>
          </div>
          {info.stake_address && (
            <div>
              <dt className="text-gray-500 text-xs">Stake Address</dt>
              <dd className="font-mono text-xs text-gray-400">{info.stake_address}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Token balances */}
      {tokens.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Token Balances ({tokens.length})</h2>
          <div className="space-y-1">
            {tokens.map((t, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-800/50 text-sm">
                <Link href={`/asset/${t.fingerprint}`} className="text-blue-400 hover:underline text-xs">
                  {t.name_ascii || truncHash(t.fingerprint, 10)}
                </Link>
                <span className="font-mono text-xs">{compactNumber(Number(t.quantity))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* UTXOs */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">UTXOs ({info.utxos?.length || 0})</h2>
        <div className="space-y-1">
          {(info.utxos || []).slice(0, 20).map((u: any, i: number) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
              <Link href={`/tx/${u.tx_hash}`} className="text-blue-400 font-mono text-xs hover:underline">
                {truncHash(u.tx_hash)}#{u.tx_index}
              </Link>
              <span className="text-green-400 text-xs">₳{lovelaceToAda(u.value)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
ADDREOF

echo "=== Updating Assets page with links to detail ==="
cat > "src/app/(explorer)/assets/page.tsx" << 'ASSETLISTEOF'
import { api, AssetInfo } from "@/lib/api";
import { compactNumber } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 60;

export default async function AssetsPage() {
  let assets: AssetInfo[] = [];
  try { assets = await api.assets(100); } catch (e) { console.error("Assets fetch error:", e); }

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
              <th className="text-right py-2 px-2">Mints</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a, i) => (
              <tr key={a.fingerprint} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-2 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2">
                  <Link href={`/asset/${a.fingerprint}`} className="text-blue-400 hover:underline font-medium">
                    {a.name_ascii || a.asset_name?.slice(0, 16) || "—"}
                  </Link>
                </td>
                <td className="py-2 px-2 font-mono text-xs text-gray-400">
                  <Link href={`/asset/${a.fingerprint}`} className="hover:text-blue-400">{a.fingerprint}</Link>
                </td>
                <td className="py-2 px-2 text-right font-mono">{compactNumber(Number(a.total_supply))}</td>
                <td className="py-2 px-2 text-right">{a.mint_tx_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
ASSETLISTEOF

echo "=== Updating Governance page with links ==="
cat > "src/app/(explorer)/governance/page.tsx" << 'GOVLISTEOF'
import { api, GovAction } from "@/lib/api";
import { truncHash } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export const revalidate = 60;

export default async function GovernancePage() {
  let actions: GovAction[] = [];
  try { actions = await api.governance(50); } catch (e) { console.error("Gov fetch error:", e); }

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
          <Link key={`${a.tx_hash}-${a.cert_index}`} href={`/governance/${a.tx_hash}/${a.cert_index}`}>
            <Card className="hover:border-gray-600 transition-colors cursor-pointer">
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
                  {a.abstract && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.abstract}</p>}
                </div>
                <div className="text-right text-xs shrink-0">
                  <div className="text-green-400">Yes: {a.yes_votes}</div>
                  <div className="text-red-400">No: {a.no_votes}</div>
                  <div className="text-gray-500">Abstain: {a.abstain_votes}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
GOVLISTEOF

echo ""
echo "=== Phase 2 frontend complete ==="
echo "Run: npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/"
echo "Then: sudo systemctl restart adatool-frontend"
