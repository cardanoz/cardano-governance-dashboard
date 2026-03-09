#!/usr/bin/env python3
"""
Deploy all dashboard pages v3:
- SPO Dashboard (multi-pool, delegation trends, block production, fee income, governance votes)
- Governance Dashboard (voting matrix, reward simulator)
- DRep Dashboard (voting history, delegation trends, metadata)
- Chain Analyst Dashboard (overview stats)

Run on server: python3 deploy-dashboards-v3.py
"""
import os, subprocess, time, shutil

PROJECT_FE = "/home/ubuntu/adatool-frontend"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

G = "\033[32m"; R = "\033[31m"; Y = "\033[33m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")

def run(cmd, cwd=None, timeout=600):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT_FE, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

# ============================================================
# Step 1: SPO Dashboard
# ============================================================
print("=" * 60)
print("STEP 1: Writing SPO Dashboard")
print("=" * 60)

spo_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/spo")
os.makedirs(spo_dir, exist_ok=True)

with open(os.path.join(spo_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://adatool.net/api";
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fmtM = (v: any) => { const n = Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(0); };
const timeAgo = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60) return Math.floor(s)+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };
const truncHash = (h: string, n=12) => h ? h.slice(0,n)+"\\u2026"+h.slice(-6) : "";
const pctStr = (v: number) => (v*100).toFixed(2)+"%";

function Card({ title, children, className="" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700/50 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-16 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div>; }

type Tab = "overview" | "blocks" | "delegators" | "rewards" | "governance" | "history";

export default function SPODashboard() {
  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [currentPool, setCurrentPool] = useState<string>("");
  const [addInput, setAddInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [multiData, setMultiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  // Load saved pools from URL or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("pools");
    if (p) {
      const ids = p.split(",").filter(Boolean);
      setPoolIds(ids);
      if (ids.length > 0) setCurrentPool(ids[0]);
    }
  }, []);

  // Search pools
  useEffect(() => {
    if (addInput.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/pools/search/${encodeURIComponent(addInput)}`)
        .then(r => r.json()).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [addInput]);

  // Fetch pool data
  useEffect(() => {
    if (!currentPool) return;
    setLoading(true);
    fetch(`${API}/dashboard/spo/${currentPool}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentPool]);

  // Fetch multi-pool aggregate
  useEffect(() => {
    if (poolIds.length < 2) { setMultiData(null); return; }
    fetch(`${API}/dashboard/spo-multi?pools=${poolIds.join(",")}`)
      .then(r => r.json()).then(setMultiData).catch(() => {});
  }, [poolIds]);

  const addPool = (id: string) => {
    if (!poolIds.includes(id)) {
      const newIds = [...poolIds, id];
      setPoolIds(newIds);
      if (!currentPool) setCurrentPool(id);
      window.history.replaceState({}, "", `?pools=${newIds.join(",")}`);
    }
    setAddInput(""); setSearchResults([]);
  };
  const removePool = (id: string) => {
    const newIds = poolIds.filter(p => p !== id);
    setPoolIds(newIds);
    if (currentPool === id) setCurrentPool(newIds[0] || "");
    window.history.replaceState({}, "", newIds.length ? `?pools=${newIds.join(",")}` : "?");
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "blocks", label: "Blocks" },
    { key: "delegators", label: "Delegators" },
    { key: "rewards", label: "Rewards & Fees" },
    { key: "governance", label: "Governance" },
    { key: "history", label: "Update History" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SPO Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Stake Pool Operator management and analytics</p>
      </div>

      {/* Pool Selector */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-400">My Pools:</span>
          {poolIds.map(id => (
            <button key={id} onClick={() => setCurrentPool(id)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${currentPool===id ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
              {id.slice(0,12)}...
              <span onClick={(e) => { e.stopPropagation(); removePool(id); }} className="ml-1 text-gray-400 hover:text-red-400">\\u00d7</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <input type="text" placeholder="Search pool by ticker, name, or ID..." value={addInput} onChange={e => setAddInput(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
              {searchResults.map((r: any, i: number) => (
                <button key={i} onClick={() => addPool(r.pool_id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm border-b border-gray-700/30">
                  <span className="font-bold text-blue-400">{r.ticker || "?"}</span>
                  <span className="text-gray-400 ml-2">{r.name}</span>
                  <span className="text-gray-500 ml-2 text-xs">{fmtM(r.live_stake)} ADA | {r.delegators} delegators</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-pool Aggregate */}
      {multiData?.aggregate && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-700/30 p-5">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">Multi-Pool Aggregate ({multiData.aggregate.pool_count} pools)</h3>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total Stake" value={`${fmtM(multiData.aggregate.total_stake)} ADA`} />
            <Stat label="Total Delegators" value={multiData.aggregate.total_delegators.toLocaleString()} />
            <Stat label="Lifetime Blocks" value={multiData.aggregate.total_lifetime_blocks.toLocaleString()} />
          </div>
        </div>
      )}

      {!currentPool && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">\\ud83c\\udfca</p>
          <p className="text-lg">Search and add your pool to get started</p>
        </div>
      )}

      {loading && <Skeleton />}

      {data && !data.error && !loading && <>
        {/* Pool Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{data.ticker || "?"}</span>
                <span className="text-gray-400">{data.name}</span>
                {data.retirement && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Retiring Epoch {data.retirement.retiring_epoch}</span>}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">{data.pool_id}</div>
              {data.homepage && <a href={data.homepage} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:underline">{data.homepage}</a>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <Stat label="Live Stake" value={`${fmtM(data.stats_history[data.stats_history.length-1]?.active_stake)} ADA`} />
            <Stat label="Delegators" value={(data.total_delegators||0).toLocaleString()} />
            <Stat label="Pledge" value={`${fmtAda(data.params.pledge)} ADA`} />
            <Stat label="Margin" value={pctStr(data.params.margin||0)} sub={`Cost: ${fmtAda(data.params.fixed_cost)} ADA`} />
            <Stat label="Lifetime Blocks" value={(data.recent_blocks.length > 0 ? data.recent_blocks[0].block_no : 0).toLocaleString()} sub={`This epoch: ${data.recent_blocks.filter((b:any) => b.epoch_no === data.stats_history[data.stats_history.length-1]?.epoch_no).length}`} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition font-medium whitespace-nowrap ${tab===t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "overview" && (
          <div className="space-y-4">
            <Card title="Stake & Delegator Trend (Last 20 Epochs)">
              {data.stats_history.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-xs text-gray-500 pb-1 border-b border-gray-700">
                    <span>Epoch</span><span className="text-right">Active Stake</span><span className="text-right">Delegators</span><span className="text-right">Blocks</span>
                  </div>
                  {data.stats_history.map((s: any) => (
                    <div key={s.epoch_no} className="grid grid-cols-4 text-sm py-1 border-b border-gray-700/30">
                      <span className="text-blue-400">{s.epoch_no}</span>
                      <span className="text-right">{fmtM(s.active_stake)}</span>
                      <span className="text-right">{s.delegators}</span>
                      <span className="text-right">{s.blocks}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-sm">No stats available</p>}
            </Card>
            {data.description && (
              <Card title="Description">
                <p className="text-gray-300 text-sm">{data.description}</p>
              </Card>
            )}
          </div>
        )}

        {/* Blocks Tab */}
        {tab === "blocks" && (
          <Card title={`Recent Blocks (${data.recent_blocks.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-2">Block</th><th className="text-left py-2">Epoch</th>
                  <th className="text-left py-2">Time</th><th className="text-right py-2">TXs</th><th className="text-right py-2">Size</th>
                </tr></thead>
                <tbody>
                  {data.recent_blocks.map((b: any) => (
                    <tr key={b.block_no} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="py-2"><Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline">{b.block_no?.toLocaleString()}</Link></td>
                      <td className="py-2 text-gray-400">{b.epoch_no}</td>
                      <td className="py-2 text-gray-400 text-xs">{timeAgo(b.time)}</td>
                      <td className="py-2 text-right">{b.tx_count}</td>
                      <td className="py-2 text-right text-gray-400">{(b.size/1024).toFixed(1)}KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Delegators Tab */}
        {tab === "delegators" && (
          <Card title={`Top Delegators (${data.top_delegators.length} shown / ${data.total_delegators} total)`}>
            <div className="space-y-1">
              {data.top_delegators.map((d: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-700/30 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-6 text-right text-xs">{i+1}</span>
                    <Link href={`/address/${d.stake_address}`} className="text-blue-400 hover:underline font-mono text-xs">{truncHash(d.stake_address)}</Link>
                  </div>
                  <span className="font-bold">{fmtAda(d.delegated_amount)} ADA</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Rewards Tab */}
        {tab === "rewards" && (
          <div className="space-y-4">
            <Card title="Operator Rewards by Epoch">
              {data.reward_history.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-3 text-xs text-gray-500 pb-1 border-b border-gray-700">
                    <span>Epoch</span><span className="text-right">Leader Reward</span><span className="text-right">Total Pool Rewards</span>
                  </div>
                  {data.reward_history.map((r: any, i: number) => (
                    <div key={i} className="grid grid-cols-3 text-sm py-1 border-b border-gray-700/30">
                      <span className="text-blue-400">{r.earned_epoch}</span>
                      <span className="text-right">{fmtAda(r.total_reward)} ADA</span>
                      <span className="text-right text-gray-400">{data.fee_history[i] ? fmtAda(data.fee_history[i].total_pool_rewards) + " ADA" : "-"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-sm">No reward data yet</p>}
            </Card>
          </div>
        )}

        {/* Governance Tab */}
        {tab === "governance" && (
          <Card title={`Governance Votes (${data.governance_votes.length})`}>
            {data.governance_votes.length > 0 ? (
              <div className="space-y-1">
                {data.governance_votes.map((v: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/30 text-sm">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.vote==="VoteYes" ? "bg-green-500/20 text-green-400" : v.vote==="VoteNo" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {v.vote === "VoteYes" ? "Yes" : v.vote === "VoteNo" ? "No" : "Abstain"}
                      </span>
                      <span className="ml-2 text-gray-400">{v.proposal_type}</span>
                      <Link href={`/governance/${v.proposal_tx_hash}/${v.proposal_index}`} className="ml-2 text-blue-400 hover:underline text-xs">{truncHash(v.proposal_tx_hash, 8)}</Link>
                    </div>
                    <span className="text-gray-500 text-xs">{timeAgo(v.vote_time)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No governance votes recorded for this pool</p>}
          </Card>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <Card title="Pool Update History">
            <div className="space-y-1">
              <div className="grid grid-cols-5 text-xs text-gray-500 pb-1 border-b border-gray-700">
                <span>Epoch</span><span className="text-right">Pledge</span><span className="text-right">Cost</span><span className="text-right">Margin</span><span className="text-right">Time</span>
              </div>
              {data.update_history.map((u: any, i: number) => (
                <div key={i} className="grid grid-cols-5 text-sm py-1 border-b border-gray-700/30">
                  <span className="text-blue-400">{u.epoch_no}</span>
                  <span className="text-right">{fmtAda(u.pledge)}</span>
                  <span className="text-right">{fmtAda(u.fixed_cost)}</span>
                  <span className="text-right">{pctStr(u.margin)}</span>
                  <span className="text-right text-gray-500 text-xs">{timeAgo(u.time)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>}

      {data?.error && <div className="text-center py-8 text-red-400">Pool not found. Check the pool ID and try again.</div>}
    </div>
  );
}
''')
log("SPO Dashboard page written")

# ============================================================
# Step 2: Governance Dashboard
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: Writing Governance Dashboard")
print("=" * 60)

gov_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/governance")
os.makedirs(gov_dir, exist_ok=True)

with open(os.path.join(gov_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://adatool.net/api";
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fmtM = (v: any) => { const n = Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; return n.toFixed(0); };
const truncHash = (h: string, n=10) => h ? h.slice(0,n)+"\\u2026" : "";

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-20 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div>; }

type Tab = "matrix" | "proposals" | "simulator";

export default function GovernanceDashboard() {
  const [matrix, setMatrix] = useState<any>(null);
  const [rewardParams, setRewardParams] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("matrix");
  const [loading, setLoading] = useState(true);

  // Simulator inputs
  const [simStake, setSimStake] = useState("10000");
  const [simPoolMargin, setSimPoolMargin] = useState("2");
  const [simPoolCost, setSimPoolCost] = useState("340");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/governance/voting-matrix`).then(r => r.json()).catch(() => null),
      fetch(`${API}/governance/reward-params`).then(r => r.json()).catch(() => null),
    ]).then(([m, rp]) => {
      setMatrix(m); setRewardParams(rp); setLoading(false);
    });
  }, []);

  // Simple reward estimate
  const rewardEst = useMemo(() => {
    if (!rewardParams?.protocol_params || !rewardParams?.ada_pots) return null;
    const pp = rewardParams.protocol_params;
    const pots = rewardParams.ada_pots;
    const reserves = Number(pots.reserves || 0) / 1e6;
    const rho = pp.monetary_expand_rate || 0.003;
    const tau = pp.treasury_growth_rate || 0.2;
    const epochReward = reserves * rho * (1 - tau);
    const totalStaked = Number(rewardParams.pool_stats?.total_stake || 0) / 1e6;
    const stakeAmt = parseFloat(simStake) || 0;
    const margin = (parseFloat(simPoolMargin) || 0) / 100;
    const cost = parseFloat(simPoolCost) || 340;
    if (totalStaked <= 0 || stakeAmt <= 0) return null;
    const shareOfReward = (stakeAmt / totalStaked) * epochReward;
    const afterMarginAndCost = shareOfReward * (1 - margin);
    const perEpoch = Math.max(0, afterMarginAndCost);
    const perYear = perEpoch * 73;
    const apy = (perYear / stakeAmt) * 100;
    return { perEpoch: perEpoch.toFixed(2), perYear: perYear.toFixed(0), apy: apy.toFixed(2), epochReward: epochReward.toFixed(0), reserves: (reserves/1e6).toFixed(2) };
  }, [rewardParams, simStake, simPoolMargin, simPoolCost]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "matrix", label: "Voting Matrix" },
    { key: "proposals", label: "Active Proposals" },
    { key: "simulator", label: "Reward Simulator" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Governance Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Voting analysis, proposals, and reward simulation</p>
      </div>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition font-medium ${tab===t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Skeleton />}

      {/* Voting Matrix */}
      {tab === "matrix" && matrix && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Active Proposals</div>
              <div className="text-2xl font-bold">{matrix.proposals?.length || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Total Votes Cast</div>
              <div className="text-2xl font-bold">{matrix.all_votes?.length?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Unique DRep Voters</div>
              <div className="text-2xl font-bold">{new Set(matrix.all_votes?.filter((v:any) => v.voter_role==="DRep").map((v:any) => v.voter_id)).size}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
              <div className="text-xs text-gray-400">Unique SPO Voters</div>
              <div className="text-2xl font-bold">{new Set(matrix.all_votes?.filter((v:any) => v.voter_role==="SPO").map((v:any) => v.voter_id)).size}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-3 px-4">Proposal</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-center py-3 px-2">DRep Yes</th>
                  <th className="text-center py-3 px-2">DRep No</th>
                  <th className="text-center py-3 px-2">SPO Yes</th>
                  <th className="text-center py-3 px-2">SPO No</th>
                  <th className="text-center py-3 px-2">CC</th>
                  <th className="text-right py-3 px-4">Total</th>
                </tr></thead>
                <tbody>
                  {(matrix.proposals||[]).map((p: any) => {
                    const drep = p.vote_summary?.DRep || {yes:0,no:0,abstain:0};
                    const spo = p.vote_summary?.SPO || {yes:0,no:0,abstain:0};
                    const cc = p.vote_summary?.ConstitutionalCommittee || {yes:0,no:0,abstain:0};
                    return (
                      <tr key={p.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                        <td className="py-2 px-4">
                          <Link href={`/governance/${p.tx_hash}/${p.index}`} className="text-blue-400 hover:underline text-xs font-mono">{truncHash(p.tx_hash)}#{p.index}</Link>
                        </td>
                        <td className="py-2 px-2 text-xs text-gray-400">{p.type}</td>
                        <td className="py-2 px-2 text-center"><span className="text-green-400">{drep.yes}</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-red-400">{drep.no}</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-green-400">{spo.yes}</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-red-400">{spo.no}</span></td>
                        <td className="py-2 px-2 text-center">{cc.yes}/{cc.no}</td>
                        <td className="py-2 px-4 text-right font-bold">{p.total_votes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active Proposals */}
      {tab === "proposals" && matrix && (
        <div className="space-y-3">
          {(matrix.proposals||[]).map((p: any) => {
            const drep = p.vote_summary?.DRep || {yes:0,no:0,abstain:0};
            const total = drep.yes + drep.no + drep.abstain;
            const yesPct = total > 0 ? (drep.yes/total*100).toFixed(1) : "0";
            return (
              <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/governance/${p.tx_hash}/${p.index}`} className="text-blue-400 hover:underline font-mono text-sm">{truncHash(p.tx_hash, 16)}#{p.index}</Link>
                    <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">{p.type}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(p.proposed_time).toLocaleDateString()}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>DRep Approval</span><span>{yesPct}% ({drep.yes} yes / {drep.no} no / {drep.abstain} abstain)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{width: `${yesPct}%`}} />
                  </div>
                </div>
              </div>
            );
          })}
          {(!matrix.proposals || matrix.proposals.length === 0) && (
            <div className="text-center py-12 text-gray-500">No active governance proposals</div>
          )}
        </div>
      )}

      {/* Reward Simulator */}
      {tab === "simulator" && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Staking Reward Estimator</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Your Stake (ADA)</label>
                <input type="number" value={simStake} onChange={e => setSimStake(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Pool Margin (%)</label>
                <input type="number" value={simPoolMargin} onChange={e => setSimPoolMargin(e.target.value)} step="0.1"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Pool Fixed Cost (ADA)</label>
                <input type="number" value={simPoolCost} onChange={e => setSimPoolCost(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            {rewardEst && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900 rounded-lg p-4">
                <div>
                  <div className="text-xs text-gray-500">Est. Per Epoch</div>
                  <div className="text-lg font-bold text-green-400">{Number(rewardEst.perEpoch).toLocaleString()} ADA</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Est. Per Year</div>
                  <div className="text-lg font-bold text-green-400">{Number(rewardEst.perYear).toLocaleString()} ADA</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Est. APY</div>
                  <div className="text-lg font-bold text-blue-400">{rewardEst.apy}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Epoch Reward Pool</div>
                  <div className="text-lg font-bold">{Number(rewardEst.epochReward).toLocaleString()} ADA</div>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-3">* Simplified estimate. Actual rewards depend on pool performance, luck, and protocol parameters.</p>
          </div>
          {rewardParams && (
            <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Current Protocol Parameters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">Reserves:</span> <span className="font-bold">{fmtM(rewardParams.ada_pots?.reserves)} ADA</span></div>
                <div><span className="text-gray-500">Treasury:</span> <span className="font-bold">{fmtM(rewardParams.ada_pots?.treasury)} ADA</span></div>
                <div><span className="text-gray-500">Expand Rate (\\u03c1):</span> <span className="font-bold">{rewardParams.protocol_params?.monetary_expand_rate}</span></div>
                <div><span className="text-gray-500">Treasury Rate (\\u03c4):</span> <span className="font-bold">{rewardParams.protocol_params?.treasury_growth_rate}</span></div>
                <div><span className="text-gray-500">Active Pools:</span> <span className="font-bold">{rewardParams.pool_stats?.active_pools?.toLocaleString()}</span></div>
                <div><span className="text-gray-500">k (Optimal):</span> <span className="font-bold">{rewardParams.protocol_params?.optimal_pool_count}</span></div>
                <div><span className="text-gray-500">Total Staked:</span> <span className="font-bold">{fmtM(rewardParams.pool_stats?.total_stake)} ADA</span></div>
                <div><span className="text-gray-500">Min Pool Cost:</span> <span className="font-bold">{fmtAda(rewardParams.protocol_params?.min_pool_cost)} ADA</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
''')
log("Governance Dashboard page written")

# ============================================================
# Step 3: DRep Dashboard
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: Writing DRep Dashboard")
print("=" * 60)

drep_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep")
os.makedirs(drep_dir, exist_ok=True)

with open(os.path.join(drep_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://adatool.net/api";
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fmtM = (v: any) => { const n = Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; return n.toFixed(0); };
const truncHash = (h: string, n=12) => h ? h.slice(0,n)+"\\u2026"+h.slice(-6) : "";
const timeAgo = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return Math.floor(s)+"s ago"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-16 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div>; }

type Tab = "overview" | "votes" | "delegators";

export default function DRepDashboard() {
  const [drepId, setDrepId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("id");
    if (d) { setDrepId(d); }
  }, []);

  useEffect(() => {
    if (searchInput.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/dreps/search/${encodeURIComponent(searchInput)}`)
        .then(r => r.json()).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!drepId) return;
    setLoading(true);
    fetch(`${API}/dashboard/drep/${encodeURIComponent(drepId)}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [drepId]);

  const selectDrep = (id: string) => {
    setDrepId(id); setSearchInput(""); setSearchResults([]);
    window.history.replaceState({}, "", `?id=${encodeURIComponent(id)}`);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "votes", label: "Voting History" },
    { key: "delegators", label: "Delegation Trend" },
  ];

  // Vote stats
  const voteStats = data?.voting_history ? {
    total: data.voting_history.length,
    yes: data.voting_history.filter((v:any) => v.vote === "VoteYes").length,
    no: data.voting_history.filter((v:any) => v.vote === "VoteNo").length,
    abstain: data.voting_history.filter((v:any) => v.vote === "Abstain").length,
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DRep Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Delegated Representative analytics and voting history</p>
      </div>

      {/* Search */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
        <div className="relative">
          <input type="text" placeholder="Search DRep by ID..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
              {searchResults.map((r: any, i: number) => (
                <button key={i} onClick={() => selectDrep(r.drep_id)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm border-b border-gray-700/30">
                  <span className="text-blue-400 font-mono text-xs">{truncHash(r.drep_id, 20)}</span>
                  <span className="text-gray-500 ml-2">{r.delegators} delegators</span>
                  {r.has_script && <span className="ml-2 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Script</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!drepId && !loading && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">\\ud83d\\uddf3</p>
          <p className="text-lg">Search for a DRep to view their dashboard</p>
        </div>
      )}

      {loading && <Skeleton />}

      {data && !data.error && !loading && <>
        {/* DRep Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-bold">DRep</span>
            {data.has_script && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Script-based</span>}
          </div>
          <div className="text-xs text-gray-500 font-mono break-all">{data.drep_id}</div>
          {data.registration_metadata && (
            <a href={data.registration_metadata.url} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:underline mt-1 block">Metadata: {data.registration_metadata.url}</a>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div><div className="text-xs text-gray-500">Delegators</div><div className="text-lg font-bold">{data.delegator_count.toLocaleString()}</div></div>
            <div><div className="text-xs text-gray-500">Voting Power</div><div className="text-lg font-bold">{fmtM(data.total_voting_power)} ADA</div></div>
            <div><div className="text-xs text-gray-500">Deposit</div><div className="text-lg font-bold">{fmtAda(data.deposit)} ADA</div></div>
            <div><div className="text-xs text-gray-500">Votes Cast</div><div className="text-lg font-bold">{data.voting_history?.length || 0}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition font-medium ${tab===t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && voteStats && (
          <div className="space-y-4">
            <Card title="Voting Summary">
              <div className="grid grid-cols-4 gap-4">
                <div><div className="text-xs text-gray-500">Total Votes</div><div className="text-2xl font-bold">{voteStats.total}</div></div>
                <div><div className="text-xs text-gray-500">Yes</div><div className="text-2xl font-bold text-green-400">{voteStats.yes}</div></div>
                <div><div className="text-xs text-gray-500">No</div><div className="text-2xl font-bold text-red-400">{voteStats.no}</div></div>
                <div><div className="text-xs text-gray-500">Abstain</div><div className="text-2xl font-bold text-gray-400">{voteStats.abstain}</div></div>
              </div>
              {voteStats.total > 0 && (
                <div className="mt-3 flex gap-0.5 h-4 rounded overflow-hidden">
                  <div className="bg-green-500" style={{width: `${voteStats.yes/voteStats.total*100}%`}} />
                  <div className="bg-red-500" style={{width: `${voteStats.no/voteStats.total*100}%`}} />
                  <div className="bg-gray-500" style={{width: `${voteStats.abstain/voteStats.total*100}%`}} />
                </div>
              )}
            </Card>
            <Card title="Recent Votes">
              <div className="space-y-1">
                {(data.voting_history||[]).slice(0, 10).map((v: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/30 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.vote==="VoteYes" ? "bg-green-500/20 text-green-400" : v.vote==="VoteNo" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {v.vote === "VoteYes" ? "Yes" : v.vote === "VoteNo" ? "No" : "Abstain"}
                      </span>
                      <span className="text-gray-400 text-xs">{v.proposal_type}</span>
                      <Link href={`/governance/${v.proposal_tx_hash}/${v.proposal_index}`} className="text-blue-400 hover:underline text-xs">{truncHash(v.proposal_tx_hash, 8)}</Link>
                      {v.anchor_url && <a href={v.anchor_url} target="_blank" rel="noopener" className="text-purple-400 hover:underline text-xs" title="Vote rationale">\\ud83d\\udcce</a>}
                    </div>
                    <span className="text-gray-500 text-xs">{timeAgo(v.vote_time)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Votes Tab */}
        {tab === "votes" && (
          <Card title={`All Votes (${data.voting_history?.length || 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-2">Vote</th><th className="text-left py-2">Proposal</th>
                  <th className="text-left py-2">Type</th><th className="text-left py-2">Rationale</th><th className="text-right py-2">Time</th>
                </tr></thead>
                <tbody>
                  {(data.voting_history||[]).map((v: any, i: number) => (
                    <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.vote==="VoteYes" ? "bg-green-500/20 text-green-400" : v.vote==="VoteNo" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                          {v.vote === "VoteYes" ? "Yes" : v.vote === "VoteNo" ? "No" : "Abstain"}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link href={`/governance/${v.proposal_tx_hash}/${v.proposal_index}`} className="text-blue-400 hover:underline text-xs font-mono">{truncHash(v.proposal_tx_hash, 10)}#{v.proposal_index}</Link>
                      </td>
                      <td className="py-2 text-gray-400 text-xs">{v.proposal_type}</td>
                      <td className="py-2">
                        {v.anchor_url ? <a href={v.anchor_url} target="_blank" rel="noopener" className="text-purple-400 hover:underline text-xs">View \\u2197</a> : <span className="text-gray-600 text-xs">-</span>}
                      </td>
                      <td className="py-2 text-right text-gray-500 text-xs">{timeAgo(v.vote_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Delegation Trend */}
        {tab === "delegators" && (
          <Card title="Delegation Trend (Last 10 Epochs)">
            {data.delegation_trend?.length > 0 ? (
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-xs text-gray-500 pb-1 border-b border-gray-700">
                  <span>Epoch</span><span className="text-right">Delegators</span><span className="text-right">Voting Power</span>
                </div>
                {data.delegation_trend.map((t: any) => (
                  <div key={t.epoch_no} className="grid grid-cols-3 text-sm py-1 border-b border-gray-700/30">
                    <span className="text-blue-400">{t.epoch_no}</span>
                    <span className="text-right">{t.delegators}</span>
                    <span className="text-right">{fmtM(t.voting_power)} ADA</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No trend data available</p>}
          </Card>
        )}
      </>}

      {data?.error && <div className="text-center py-8 text-red-400">{data.error}</div>}
    </div>
  );
}
''')
log("DRep Dashboard page written")

# ============================================================
# Step 4: Chain Analyst Dashboard
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: Writing Chain Analyst Dashboard")
print("=" * 60)

chain_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/chain")
os.makedirs(chain_dir, exist_ok=True)

with open(os.path.join(chain_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://adatool.net/api";
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fmtM = (v: any) => { const n = Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(0); };
const timeAgo = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60) return Math.floor(s)+"s ago"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-20 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div>; }

export default function ChainAnalystDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [txVol, setTxVol] = useState<any[]>([]);
  const [richlist, setRichlist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/chain-overview`).then(r => r.json()).catch(() => null),
      fetch(`${API}/tx-volume?days=30`).then(r => r.json()).catch(() => []),
      fetch(`${API}/richlist-v2?limit=20`).then(r => r.json()).catch(() => null),
    ]).then(([ov, tv, rl]) => {
      setOverview(ov); setTxVol(tv); setRichlist(rl); setLoading(false);
    });
  }, []);

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold">Chain Analyst</h1><Skeleton /></div>;

  const tip = overview?.tip;
  const epochs = overview?.recent_epochs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chain Analyst Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time Cardano network overview</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400">Block Height</div>
          <div className="text-xl font-bold">{tip?.block_no?.toLocaleString() || "-"}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400">Current Epoch</div>
          <div className="text-xl font-bold">{tip?.epoch_no || "-"}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400">TX (24h)</div>
          <div className="text-xl font-bold">{(overview?.tx_24h||0).toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400">Active Pools</div>
          <div className="text-xl font-bold">{(overview?.active_pools||0).toLocaleString()}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
          <div className="text-xs text-gray-400">Active DReps</div>
          <div className="text-xl font-bold">{(overview?.active_dreps||0).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Epochs */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Epochs</h3>
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Blocks</span><span className="text-right">TXs</span><span className="text-right">Fees</span>
            </div>
            {epochs.map((e: any) => (
              <div key={e.no} className="grid grid-cols-4 text-sm py-1.5 border-b border-gray-700/30">
                <Link href={`/epoch/${e.no}`} className="text-blue-400 hover:underline">{e.no}</Link>
                <span className="text-right">{Number(e.blk_count).toLocaleString()}</span>
                <span className="text-right">{Number(e.tx_count).toLocaleString()}</span>
                <span className="text-right">{fmtAda(e.fees)} ADA</span>
              </div>
            ))}
          </div>
        </div>

        {/* TX Volume Chart (simple bar) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Daily Transactions (30d)</h3>
          {txVol.length > 0 ? (
            <div className="flex items-end gap-0.5 h-40">
              {txVol.map((d: any, i: number) => {
                const max = Math.max(...txVol.map((x: any) => x.tx_count || 0));
                const pct = max > 0 ? (d.tx_count || 0) / max * 100 : 0;
                return (
                  <div key={i} className="flex-1 group relative">
                    <div className="bg-blue-500/60 hover:bg-blue-500 transition rounded-t" style={{height: `${pct}%`}} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-gray-900 text-xs p-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                      {d.date}: {(d.tx_count||0).toLocaleString()} txs
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-gray-500 text-sm">No data</p>}
        </div>

        {/* Top Addresses (from richlist) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Top 20 Addresses by Balance</h3>
          {richlist?.entries ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-2 w-8">#</th><th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Address</th><th className="text-right py-2">Balance</th>
                  <th className="text-center py-2">Flags</th>
                </tr></thead>
                <tbody>
                  {richlist.entries.slice(0, 20).map((e: any) => (
                    <tr key={e.rank} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="py-1.5 text-gray-500 text-xs">{e.rank}</td>
                      <td className="py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs ${e.addr_type==="stake" ? "bg-blue-500/20 text-blue-400" : e.addr_type==="byron" ? "bg-amber-500/20 text-amber-400" : "bg-purple-500/20 text-purple-400"}`}>{e.addr_type}</span></td>
                      <td className="py-1.5"><span className="font-mono text-xs">{e.identifier?.slice(0,18)}...</span></td>
                      <td className="py-1.5 text-right font-bold">{fmtAda(e.balance)}</td>
                      <td className="py-1.5 text-center">
                        {e.is_exchange && <span className="text-yellow-400 text-xs" title={e.exchange_reason}>\\ud83c\\udfe6</span>}
                        {e.is_likely_lost && <span className="text-red-400 text-xs ml-1" title={e.lost_reason}>\\ud83d\\udc80</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-gray-500 text-sm">Loading...</p>}
          <Link href="/explorer/addresses" className="text-blue-400 hover:underline text-sm mt-2 inline-block">View full Rich List \\u2192</Link>
        </div>
      </div>
    </div>
  );
}
''')
log("Chain Analyst Dashboard page written")

# ============================================================
# Step 5: Build & Deploy
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: Building frontend")
print("=" * 60)

code, out, errs = run("npm run build 2>&1", timeout=600)
build_out = (out + errs).strip().split("\n")
for line in build_out[-30:]:
    print(f"  {line}")
if code != 0:
    err("BUILD FAILED!")
    exit(1)
log("BUILD SUCCESS!")

run("cp -r public .next/standalone/")
run("cp -r .next/static .next/standalone/.next/")
run("sudo systemctl restart adatool-frontend")
time.sleep(8)

# ============================================================
# Step 6: Verify
# ============================================================
print("\n" + "=" * 60)
print("STEP 6: Verification")
print("=" * 60)

pages = [
    ("Dashboard SPO", "http://localhost:3000/dashboard/spo"),
    ("Dashboard Gov", "http://localhost:3000/dashboard/governance"),
    ("Dashboard DRep", "http://localhost:3000/dashboard/drep"),
    ("Dashboard Chain", "http://localhost:3000/dashboard/chain"),
]
for name, url in pages:
    code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' '{url}' --max-time 10")
    status = out.strip()
    if status == "200":
        log(f"  {name}: {status}")
    else:
        warn(f"  {name}: {status}")

# API endpoints
apis = [
    ("Prices", "http://localhost:3001/prices"),
    ("Pool Search", "http://localhost:3001/pools/search/ATADA"),
    ("Voting Matrix", "http://localhost:3001/governance/voting-matrix"),
    ("Reward Params", "http://localhost:3001/governance/reward-params"),
    ("Chain Overview", "http://localhost:3001/dashboard/chain-overview"),
]
for name, url in apis:
    code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' '{url}' --max-time 15")
    status = out.strip()
    if status == "200":
        log(f"  API {name}: {status}")
    else:
        warn(f"  API {name}: {status}")

print("\n" + "=" * 60)
print("DEPLOYMENT COMPLETE!")
print("=" * 60)
print("  Dashboard URLs:")
print("    SPO:        https://adatool.net/dashboard/spo")
print("    Governance:  https://adatool.net/dashboard/governance")
print("    DRep:        https://adatool.net/dashboard/drep")
print("    Chain:       https://adatool.net/dashboard/chain")
print("    Holder:      https://adatool.net/dashboard/holder")
print("  New API endpoints:")
print("    /prices, /price-history/:id")
print("    /pools/search/:q, /dashboard/spo/:poolId, /dashboard/spo-multi")
print("    /governance/voting-matrix, /governance/reward-params")
print("    /dashboard/drep/:drepId, /dreps/search/:q")
print("    /dashboard/chain-overview")
