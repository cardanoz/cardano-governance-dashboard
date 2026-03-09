#!/usr/bin/env python3
"""
Deploy all dashboard pages v3 — Summary-first, expandable-detail UI pattern.
Every page shows key metrics above the fold on desktop AND mobile.
Detail sections are collapsed by default, revealed with expand buttons.

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
# Shared UI component: Expandable Section
# We define it as a snippet re-used across pages
# ============================================================
EXPAND_SECTION = '''
function Section({ title, count, defaultOpen = false, children }: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-700/30 transition text-left">
        <span className="font-semibold text-sm">
          {title}{count !== undefined && <span className="text-gray-500 ml-1">({count})</span>}
        </span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>\\u25bc</span>
      </button>
      {open && <div className="px-5 pb-4 border-t border-gray-700/50">{children}</div>}
    </div>
  );
}
'''

MINI_TABLE_STYLES = '''
function MiniRow({ cells, href }: { cells: React.ReactNode[]; href?: string }) {
  const inner = (
    <div className="grid gap-2 py-1.5 border-b border-gray-700/20 text-sm items-center" style={{gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`}}>
      {cells.map((c, i) => <div key={i} className={i === 0 ? "" : "text-right"}>{c}</div>)}
    </div>
  );
  return href ? <a href={href} className="block hover:bg-gray-700/20 -mx-1 px-1 rounded">{inner}</a> : inner;
}
'''

# ============================================================
# Step 1: SPO Dashboard — Summary-first
# ============================================================
print("=" * 60)
print("STEP 1: Writing SPO Dashboard (summary-first)")
print("=" * 60)

spo_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/spo")
os.makedirs(spo_dir, exist_ok=True)

with open(os.path.join(spo_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fA = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fM = (v: any) => { const n=Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(0); };
const ago = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return Math.floor(s)+"s"; if(s<3600)return Math.floor(s/60)+"m"; if(s<86400)return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d"; };
const tr = (h: string, n=12) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";
const pct = (v: number) => (v*100).toFixed(2)+"%";

''' + EXPAND_SECTION + MINI_TABLE_STYLES + '''

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</div>
      <div className={`text-base font-bold truncate ${accent || ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 truncate">{sub}</div>}
    </div>
  );
}

export default function SPODashboard() {
  const [poolIds, setPoolIds] = useState<string[]>([]);
  const [cur, setCur] = useState("");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [multi, setMulti] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("pools");
    if (p) { const ids = p.split(",").filter(Boolean); setPoolIds(ids); if (ids[0]) setCur(ids[0]); }
  }, []);

  useEffect(() => {
    if (input.length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/pools/search/${encodeURIComponent(input)}`).then(r=>r.json()).then(setResults).catch(()=>{});
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!cur) return;
    setLoading(true);
    fetch(`${API}/dashboard/spo/${cur}`).then(r=>r.json()).then(d => { setData(d); setLoading(false); }).catch(()=>setLoading(false));
  }, [cur]);

  useEffect(() => {
    if (poolIds.length < 2) { setMulti(null); return; }
    fetch(`${API}/dashboard/spo-multi?pools=${poolIds.join(",")}`).then(r=>r.json()).then(setMulti).catch(()=>{});
  }, [poolIds]);

  const add = (id: string) => {
    if (!poolIds.includes(id)) {
      const n = [...poolIds, id]; setPoolIds(n);
      if (!cur) setCur(id);
      window.history.replaceState({}, "", `?pools=${n.join(",")}`);
    }
    setInput(""); setResults([]);
  };
  const rm = (id: string) => {
    const n = poolIds.filter(p=>p!==id); setPoolIds(n);
    if (cur===id) setCur(n[0]||"");
    window.history.replaceState({}, "", n.length ? `?pools=${n.join(",")}` : "?");
  };

  const d = data;
  const latestStat = d?.stats_history?.[d.stats_history.length-1];
  const thisEpochBlocks = d?.recent_blocks?.filter((b:any) => b.epoch_no === latestStat?.epoch_no).length || 0;

  return (
    <div className="space-y-3">
      {/* ── Search bar (compact) ── */}
      <div className="relative">
        <input type="text" placeholder="🔍 Search pool by ticker, name, or ID..." value={input} onChange={e=>setInput(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
            {results.map((r:any, i:number) => (
              <button key={i} onClick={()=>add(r.pool_id)} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm border-b border-gray-700/30 flex justify-between">
                <span><b className="text-blue-400">{r.ticker||"?"}</b> <span className="text-gray-400">{r.name?.slice(0,30)}</span></span>
                <span className="text-gray-500 text-xs">{fM(r.live_stake)} | {r.delegators}d</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Pool chips ── */}
      {poolIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {poolIds.map(id => (
            <button key={id} onClick={()=>setCur(id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${cur===id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
              {id.slice(0,10)}...
              <span onClick={e=>{e.stopPropagation();rm(id)}} className="hover:text-red-400 ml-0.5">\\u00d7</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Multi-pool aggregate banner ── */}
      {multi?.aggregate && (
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-800/30 px-4 py-3">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Pools" value={String(multi.aggregate.pool_count)} />
            <Stat label="Total Stake" value={`${fM(multi.aggregate.total_stake)}`} />
            <Stat label="Delegators" value={multi.aggregate.total_delegators.toLocaleString()} />
            <Stat label="Lifetime Blocks" value={multi.aggregate.total_lifetime_blocks.toLocaleString()} />
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!cur && !loading && (
        <div className="text-center py-12 text-gray-600">
          <div className="text-3xl mb-2">🏊</div>Search and add your pool above
        </div>
      )}

      {loading && <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-gray-700/20 rounded-xl animate-pulse"/>)}</div>}

      {d && !d.error && !loading && <>
        {/* ══════════ ABOVE THE FOLD: Key Stats ══════════ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold">{d.ticker || "?"}</span>
            <span className="text-gray-400 text-sm truncate">{d.name}</span>
            {d.retirement && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">Retiring E{d.retirement.retiring_epoch}</span>}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Stat label="Live Stake" value={`${fM(latestStat?.active_stake)}`} accent="text-blue-400" />
            <Stat label="Delegators" value={(d.total_delegators||0).toLocaleString()} />
            <Stat label="Pledge" value={`${fA(d.params?.pledge)}`} />
            <Stat label="Margin" value={pct(d.params?.margin||0)} sub={`Cost ${fA(d.params?.fixed_cost)}`} />
            <Stat label="This Epoch" value={`${thisEpochBlocks} blocks`} accent="text-green-400" />
            <Stat label="Latest Block" value={d.recent_blocks?.[0] ? ago(d.recent_blocks[0].time)+" ago" : "-"} />
          </div>
          {/* Mini sparkline: last 10 epochs stake trend */}
          {d.stats_history?.length > 1 && (
            <div className="mt-3 flex items-end gap-px h-8">
              {d.stats_history.slice(-12).map((s:any, i:number) => {
                const vals = d.stats_history.slice(-12).map((x:any)=>Number(x.active_stake||0));
                const max = Math.max(...vals); const min = Math.min(...vals);
                const range = max-min || 1;
                const pctH = ((Number(s.active_stake||0)-min)/range)*100;
                return <div key={i} className="flex-1 bg-blue-500/40 rounded-t min-h-[2px]" style={{height:`${Math.max(5,pctH)}%`}} title={`E${s.epoch_no}: ${fM(s.active_stake)}`}/>;
              })}
            </div>
          )}
        </div>

        {/* Mini summary cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Recent Blocks</div>
            <div className="font-bold">{d.recent_blocks?.length || 0}</div>
            <div className="text-[10px] text-gray-500">{d.recent_blocks?.[0] ? `Latest: #${d.recent_blocks[0].block_no?.toLocaleString()}` : ""}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Rewards</div>
            <div className="font-bold">{d.reward_history?.length || 0} <span className="text-xs text-gray-500">epochs</span></div>
            <div className="text-[10px] text-gray-500">{d.reward_history?.length > 0 ? `Latest: ${fA(d.reward_history[d.reward_history.length-1]?.total_reward)} ADA` : ""}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Gov Votes</div>
            <div className="font-bold">{d.governance_votes?.length || 0}</div>
            <div className="text-[10px] text-gray-500">{d.governance_votes?.length > 0 ? `Latest: ${ago(d.governance_votes[0].vote_time)} ago` : "No votes"}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Registrations</div>
            <div className="font-bold">{d.update_history?.length || 0}</div>
            <div className="text-[10px] text-gray-500">{d.update_history?.[0] ? `Last: E${d.update_history[0].epoch_no}` : ""}</div>
          </div>
        </div>

        {/* ══════════ BELOW THE FOLD: Expandable Detail Sections ══════════ */}

        <Section title="Stake & Delegator Trend" count={d.stats_history?.length}>
          <div className="pt-2 space-y-0">
            <div className="grid grid-cols-4 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Stake</span><span className="text-right">Delegators</span><span className="text-right">Blocks</span>
            </div>
            {(d.stats_history||[]).map((s:any) => (
              <div key={s.epoch_no} className="grid grid-cols-4 text-sm py-1 border-b border-gray-700/20">
                <span className="text-blue-400 text-xs">{s.epoch_no}</span>
                <span className="text-right text-xs">{fM(s.active_stake)}</span>
                <span className="text-right text-xs">{s.delegators}</span>
                <span className="text-right text-xs">{s.blocks}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Block Production" count={d.recent_blocks?.length}>
          <div className="pt-2 max-h-64 overflow-y-auto space-y-0">
            <div className="grid grid-cols-5 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Block</span><span>Epoch</span><span>Time</span><span className="text-right">TXs</span><span className="text-right">Size</span>
            </div>
            {(d.recent_blocks||[]).map((b:any) => (
              <div key={b.block_no} className="grid grid-cols-5 text-xs py-1 border-b border-gray-700/20">
                <Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline">{b.block_no?.toLocaleString()}</Link>
                <span className="text-gray-400">{b.epoch_no}</span>
                <span className="text-gray-500">{ago(b.time)}</span>
                <span className="text-right">{b.tx_count}</span>
                <span className="text-right text-gray-400">{(b.size/1024).toFixed(1)}K</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Top Delegators" count={d.total_delegators}>
          <div className="pt-2 space-y-0">
            {(d.top_delegators||[]).map((dl:any, i:number) => (
              <div key={i} className="flex justify-between py-1 border-b border-gray-700/20 text-xs">
                <span><span className="text-gray-500 w-5 inline-block">{i+1}</span> <Link href={`/address/${dl.stake_address}`} className="text-blue-400 hover:underline font-mono">{tr(dl.stake_address,14)}</Link></span>
                <span className="font-bold">{fA(dl.delegated_amount)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Rewards & Fee Income" count={d.reward_history?.length}>
          <div className="pt-2 space-y-0">
            <div className="grid grid-cols-3 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Leader Reward</span><span className="text-right">Pool Total</span>
            </div>
            {(d.reward_history||[]).map((r:any, i:number) => (
              <div key={i} className="grid grid-cols-3 text-xs py-1 border-b border-gray-700/20">
                <span className="text-blue-400">{r.earned_epoch}</span>
                <span className="text-right">{fA(r.total_reward)}</span>
                <span className="text-right text-gray-400">{d.fee_history?.[i] ? fA(d.fee_history[i].total_pool_rewards) : "-"}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Governance Votes" count={d.governance_votes?.length}>
          <div className="pt-2 space-y-0">
            {(d.governance_votes||[]).length === 0 && <p className="text-gray-500 text-xs py-2">No governance votes recorded</p>}
            {(d.governance_votes||[]).map((v:any, i:number) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-gray-700/20 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.vote==="VoteYes"?"bg-green-500/20 text-green-400":v.vote==="VoteNo"?"bg-red-500/20 text-red-400":"bg-gray-600/30 text-gray-400"}`}>
                    {v.vote==="VoteYes"?"Yes":v.vote==="VoteNo"?"No":"Abs"}
                  </span>
                  <span className="text-gray-400">{v.proposal_type}</span>
                  <Link href={`/governance/${v.proposal_tx_hash}/${v.proposal_index}`} className="text-blue-400 hover:underline">{tr(v.proposal_tx_hash,8)}</Link>
                </span>
                <span className="text-gray-500">{ago(v.vote_time)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Registration History" count={d.update_history?.length}>
          <div className="pt-2 space-y-0">
            <div className="grid grid-cols-5 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Pledge</span><span className="text-right">Cost</span><span className="text-right">Margin</span><span className="text-right">When</span>
            </div>
            {(d.update_history||[]).map((u:any, i:number) => (
              <div key={i} className="grid grid-cols-5 text-xs py-1 border-b border-gray-700/20">
                <span className="text-blue-400">{u.epoch_no}</span>
                <span className="text-right">{fA(u.pledge)}</span>
                <span className="text-right">{fA(u.fixed_cost)}</span>
                <span className="text-right">{pct(u.margin)}</span>
                <span className="text-right text-gray-500">{ago(u.time)}</span>
              </div>
            ))}
          </div>
        </Section>
      </>}
      {d?.error && <div className="text-center py-6 text-red-400 text-sm">Pool not found</div>}
    </div>
  );
}
''')
log("SPO Dashboard written (summary-first)")

# ============================================================
# Step 2: Governance Dashboard — Summary-first
# ============================================================
print("\\n" + "=" * 60)
print("STEP 2: Writing Governance Dashboard (summary-first)")
print("=" * 60)

gov_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/governance")
os.makedirs(gov_dir, exist_ok=True)

with open(os.path.join(gov_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fA = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fM = (v: any) => { const n=Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; return n.toFixed(0); };
const tr = (h: string, n=10) => h ? h.slice(0,n)+"\\u2026" : "";

''' + EXPAND_SECTION + '''

export default function GovernanceDashboard() {
  const [matrix, setMatrix] = useState<any>(null);
  const [rp, setRp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simStake, setSimStake] = useState("10000");
  const [simMargin, setSimMargin] = useState("2");
  const [simCost, setSimCost] = useState("340");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/governance/voting-matrix`).then(r=>r.json()).catch(()=>null),
      fetch(`${API}/governance/reward-params`).then(r=>r.json()).catch(()=>null),
    ]).then(([m, r]) => { setMatrix(m); setRp(r); setLoading(false); });
  }, []);

  const est = useMemo(() => {
    if (!rp?.protocol_params || !rp?.ada_pots) return null;
    const reserves = Number(rp.ada_pots.reserves||0)/1e6;
    const rho = rp.protocol_params.monetary_expand_rate || 0.003;
    const tau = rp.protocol_params.treasury_growth_rate || 0.2;
    const eReward = reserves * rho * (1-tau);
    const totalSt = Number(rp.pool_stats?.total_stake||0)/1e6;
    const stake = parseFloat(simStake)||0;
    const margin = (parseFloat(simMargin)||0)/100;
    if (totalSt<=0 || stake<=0) return null;
    const share = (stake/totalSt)*eReward*(1-margin);
    const yr = share*73;
    return { epoch: share.toFixed(2), year: yr.toFixed(0), apy: ((yr/stake)*100).toFixed(2) };
  }, [rp, simStake, simMargin, simCost]);

  const props = matrix?.proposals || [];
  const allV = matrix?.all_votes || [];
  const uniqueDreps = new Set(allV.filter((v:any)=>v.voter_role==="DRep").map((v:any)=>v.voter_id)).size;
  const uniqueSpos = new Set(allV.filter((v:any)=>v.voter_role==="SPO").map((v:any)=>v.voter_id)).size;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Governance</h1>

      {loading && <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-700/20 rounded-xl animate-pulse"/>)}</div>}

      {!loading && <>
        {/* ══════════ ABOVE THE FOLD ══════════ */}
        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Active Proposals</div>
            <div className="text-xl font-bold">{props.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Total Votes</div>
            <div className="text-xl font-bold">{allV.length.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">DRep Voters</div>
            <div className="text-xl font-bold">{uniqueDreps}</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">SPO Voters</div>
            <div className="text-xl font-bold">{uniqueSpos}</div>
          </div>
        </div>

        {/* Compact proposal vote bars (above fold) */}
        {props.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4 space-y-2">
            <div className="text-xs text-gray-500 mb-1">Proposal Approval (DRep)</div>
            {props.slice(0, 5).map((p:any) => {
              const d = p.vote_summary?.DRep || {yes:0,no:0,abstain:0};
              const t = d.yes+d.no+d.abstain; const yP = t>0 ? d.yes/t*100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <Link href={`/governance/${p.tx_hash}/${p.index}`} className="text-blue-400 text-[10px] font-mono w-24 truncate hover:underline">{tr(p.tx_hash,8)}#{p.index}</Link>
                  <span className="text-[10px] text-gray-500 w-20 truncate">{p.type}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full" style={{width:`${yP}%`}}/>
                  </div>
                  <span className="text-[10px] text-gray-400 w-14 text-right">{yP.toFixed(0)}% ({t})</span>
                </div>
              );
            })}
            {props.length > 5 && <div className="text-[10px] text-gray-600 text-center">+{props.length-5} more below</div>}
          </div>
        )}

        {/* Reward simulator (compact, above fold) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
          <div className="text-xs text-gray-500 mb-2">\\u26a1 Quick Reward Estimate</div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[100px]">
              <label className="text-[10px] text-gray-600">Stake (ADA)</label>
              <input type="number" value={simStake} onChange={e=>setSimStake(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"/>
            </div>
            <div className="w-20">
              <label className="text-[10px] text-gray-600">Margin %</label>
              <input type="number" value={simMargin} onChange={e=>setSimMargin(e.target.value)} step="0.1" className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"/>
            </div>
            {est && (
              <div className="flex gap-4 ml-2">
                <div><div className="text-[10px] text-gray-500">Per Epoch</div><div className="text-sm font-bold text-green-400">{Number(est.epoch).toLocaleString()} ADA</div></div>
                <div><div className="text-[10px] text-gray-500">Per Year</div><div className="text-sm font-bold text-green-400">{Number(est.year).toLocaleString()} ADA</div></div>
                <div><div className="text-[10px] text-gray-500">APY</div><div className="text-sm font-bold text-blue-400">{est.apy}%</div></div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════ BELOW THE FOLD: Expandable ══════════ */}

        <Section title="Full Voting Matrix" count={props.length}>
          <div className="pt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left py-1.5 pr-2">Proposal</th><th className="text-left py-1.5">Type</th>
                <th className="text-center py-1.5">DRep \\u2705</th><th className="text-center py-1.5">DRep \\u274c</th>
                <th className="text-center py-1.5">SPO \\u2705</th><th className="text-center py-1.5">SPO \\u274c</th>
                <th className="text-center py-1.5">CC</th><th className="text-right py-1.5">Total</th>
              </tr></thead>
              <tbody>{props.map((p:any) => {
                const dr = p.vote_summary?.DRep||{yes:0,no:0,abstain:0};
                const sp = p.vote_summary?.SPO||{yes:0,no:0,abstain:0};
                const cc = p.vote_summary?.ConstitutionalCommittee||{yes:0,no:0,abstain:0};
                return (
                  <tr key={p.id} className="border-b border-gray-700/20 hover:bg-gray-700/20">
                    <td className="py-1.5 pr-2"><Link href={`/governance/${p.tx_hash}/${p.index}`} className="text-blue-400 hover:underline font-mono">{tr(p.tx_hash,8)}#{p.index}</Link></td>
                    <td className="py-1.5 text-gray-400">{p.type}</td>
                    <td className="py-1.5 text-center text-green-400">{dr.yes}</td>
                    <td className="py-1.5 text-center text-red-400">{dr.no}</td>
                    <td className="py-1.5 text-center text-green-400">{sp.yes}</td>
                    <td className="py-1.5 text-center text-red-400">{sp.no}</td>
                    <td className="py-1.5 text-center">{cc.yes}/{cc.no}</td>
                    <td className="py-1.5 text-right font-bold">{p.total_votes}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Section>

        <Section title="Protocol Parameters">
          {rp && (
            <div className="pt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-gray-500">Reserves:</span> <b>{fM(rp.ada_pots?.reserves)}</b></div>
              <div><span className="text-gray-500">Treasury:</span> <b>{fM(rp.ada_pots?.treasury)}</b></div>
              <div><span className="text-gray-500">\\u03c1 (expand):</span> <b>{rp.protocol_params?.monetary_expand_rate}</b></div>
              <div><span className="text-gray-500">\\u03c4 (treasury):</span> <b>{rp.protocol_params?.treasury_growth_rate}</b></div>
              <div><span className="text-gray-500">Active Pools:</span> <b>{rp.pool_stats?.active_pools?.toLocaleString()}</b></div>
              <div><span className="text-gray-500">k (optimal):</span> <b>{rp.protocol_params?.optimal_pool_count}</b></div>
              <div><span className="text-gray-500">Total Staked:</span> <b>{fM(rp.pool_stats?.total_stake)}</b></div>
              <div><span className="text-gray-500">Min Pool Cost:</span> <b>{fA(rp.protocol_params?.min_pool_cost)}</b></div>
            </div>
          )}
        </Section>
      </>}
    </div>
  );
}
''')
log("Governance Dashboard written (summary-first)")

# ============================================================
# Step 3: DRep Dashboard — Summary-first
# ============================================================
print("\\n" + "=" * 60)
print("STEP 3: Writing DRep Dashboard (summary-first)")
print("=" * 60)

drep_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/drep")
os.makedirs(drep_dir, exist_ok=True)

with open(os.path.join(drep_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fA = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fM = (v: any) => { const n=Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; return n.toFixed(0); };
const tr = (h: string, n=12) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";
const ago = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return Math.floor(s)+"s"; if(s<3600)return Math.floor(s/60)+"m"; if(s<86400)return Math.floor(s/3600)+"h"; return Math.floor(s/86400)+"d"; };

''' + EXPAND_SECTION + '''

export default function DRepDashboard() {
  const [drepId, setDrepId] = useState("");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("id");
    if (d) setDrepId(d);
  }, []);

  useEffect(() => {
    if (input.length < 3) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/dreps/search/${encodeURIComponent(input)}`).then(r=>r.json()).then(setResults).catch(()=>{});
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (!drepId) return;
    setLoading(true);
    fetch(`${API}/dashboard/drep/${encodeURIComponent(drepId)}`).then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  }, [drepId]);

  const pick = (id: string) => {
    setDrepId(id); setInput(""); setResults([]);
    window.history.replaceState({}, "", `?id=${encodeURIComponent(id)}`);
  };

  const d = data;
  const vs = d?.voting_history;
  const yC = vs?.filter((v:any)=>v.vote==="VoteYes").length||0;
  const nC = vs?.filter((v:any)=>v.vote==="VoteNo").length||0;
  const aC = vs?.filter((v:any)=>v.vote==="Abstain").length||0;
  const tot = yC+nC+aC;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">DRep</h1>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="🔍 Search DRep by ID..." value={input} onChange={e=>setInput(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
            {results.map((r:any, i:number) => (
              <button key={i} onClick={()=>pick(r.drep_id)} className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm border-b border-gray-700/30">
                <span className="text-blue-400 font-mono text-xs">{tr(r.drep_id, 20)}</span>
                <span className="text-gray-500 ml-2">{r.delegators}d</span>
                {r.has_script && <span className="ml-1 px-1 bg-purple-500/20 text-purple-400 rounded text-[10px]">Script</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!drepId && !loading && <div className="text-center py-12 text-gray-600"><div className="text-3xl mb-2">🗳</div>Search for a DRep above</div>}
      {loading && <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-20 bg-gray-700/20 rounded-xl animate-pulse"/>)}</div>}

      {d && !d.error && !loading && <>
        {/* ══════════ ABOVE THE FOLD ══════════ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">DRep</span>
            {d.has_script && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">Script</span>}
          </div>
          <div className="text-[10px] text-gray-500 font-mono break-all mb-3">{d.drep_id}</div>
          {d.registration_metadata && <a href={d.registration_metadata.url} target="_blank" rel="noopener" className="text-[10px] text-blue-400 hover:underline mb-2 block">{d.registration_metadata.url}</a>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><div className="text-[10px] text-gray-500">Delegators</div><div className="text-lg font-bold">{d.delegator_count?.toLocaleString()}</div></div>
            <div><div className="text-[10px] text-gray-500">Voting Power</div><div className="text-lg font-bold text-blue-400">{fM(d.total_voting_power)}</div></div>
            <div><div className="text-[10px] text-gray-500">Deposit</div><div className="text-lg font-bold">{fA(d.deposit)}</div></div>
            <div><div className="text-[10px] text-gray-500">Votes Cast</div><div className="text-lg font-bold">{tot}</div></div>
          </div>

          {/* Vote breakdown bar */}
          {tot > 0 && (
            <div className="mt-3">
              <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                {yC > 0 && <div className="bg-green-500" style={{width:`${yC/tot*100}%`}}/>}
                {nC > 0 && <div className="bg-red-500" style={{width:`${nC/tot*100}%`}}/>}
                {aC > 0 && <div className="bg-gray-500" style={{width:`${aC/tot*100}%`}}/>}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>\\u2705 {yC} Yes ({tot>0?(yC/tot*100).toFixed(0):0}%)</span>
                <span>\\u274c {nC} No</span>
                <span>\\u23f8 {aC} Abstain</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent votes mini-list (3 items above fold) */}
        {vs && vs.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 px-4 py-3">
            <div className="text-[10px] text-gray-500 mb-1.5">Latest Votes</div>
            {vs.slice(0, 3).map((v:any, i:number) => (
              <div key={i} className="flex justify-between py-1 border-b border-gray-700/20 text-xs last:border-0">
                <span className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.vote==="VoteYes"?"bg-green-500/20 text-green-400":v.vote==="VoteNo"?"bg-red-500/20 text-red-400":"bg-gray-600/30 text-gray-400"}`}>
                    {v.vote==="VoteYes"?"Yes":v.vote==="VoteNo"?"No":"Abs"}
                  </span>
                  <span className="text-gray-400">{v.proposal_type}</span>
                  {v.anchor_url && <a href={v.anchor_url} target="_blank" rel="noopener" className="text-purple-400">📎</a>}
                </span>
                <span className="text-gray-500">{ago(v.vote_time)}</span>
              </div>
            ))}
            {vs.length > 3 && <div className="text-[10px] text-gray-600 text-center mt-1">+{vs.length-3} more below</div>}
          </div>
        )}

        {/* ══════════ BELOW THE FOLD ══════════ */}
        <Section title="Full Voting History" count={tot}>
          <div className="pt-2 max-h-80 overflow-y-auto space-y-0">
            {(vs||[]).map((v:any, i:number) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-gray-700/20 text-xs">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${v.vote==="VoteYes"?"bg-green-500/20 text-green-400":v.vote==="VoteNo"?"bg-red-500/20 text-red-400":"bg-gray-600/30 text-gray-400"}`}>
                    {v.vote==="VoteYes"?"Yes":v.vote==="VoteNo"?"No":"Abs"}
                  </span>
                  <Link href={`/governance/${v.proposal_tx_hash}/${v.proposal_index}`} className="text-blue-400 hover:underline font-mono truncate">{tr(v.proposal_tx_hash,10)}#{v.proposal_index}</Link>
                  <span className="text-gray-500 truncate">{v.proposal_type}</span>
                  {v.anchor_url && <a href={v.anchor_url} target="_blank" rel="noopener" className="text-purple-400 shrink-0 hover:underline">rationale \\u2197</a>}
                </span>
                <span className="text-gray-500 shrink-0 ml-2">{ago(v.vote_time)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Delegation Trend" count={d.delegation_trend?.length}>
          <div className="pt-2 space-y-0">
            <div className="grid grid-cols-3 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Delegators</span><span className="text-right">Voting Power</span>
            </div>
            {(d.delegation_trend||[]).map((t:any) => (
              <div key={t.epoch_no} className="grid grid-cols-3 text-xs py-1 border-b border-gray-700/20">
                <span className="text-blue-400">{t.epoch_no}</span>
                <span className="text-right">{t.delegators}</span>
                <span className="text-right">{fM(t.voting_power)}</span>
              </div>
            ))}
          </div>
        </Section>
      </>}
      {d?.error && <div className="text-center py-6 text-red-400 text-sm">{d.error}</div>}
    </div>
  );
}
''')
log("DRep Dashboard written (summary-first)")

# ============================================================
# Step 4: Chain Analyst Dashboard — Summary-first
# ============================================================
print("\\n" + "=" * 60)
print("STEP 4: Writing Chain Analyst Dashboard (summary-first)")
print("=" * 60)

chain_dir = os.path.join(PROJECT_FE, "src/app/(explorer)/dashboard/chain")
os.makedirs(chain_dir, exist_ok=True)

with open(os.path.join(chain_dir, "page.tsx"), "w", encoding="utf-8") as f:
    f.write('''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fA = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const fM = (v: any) => { const n=Number(v||0)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(0); };

''' + EXPAND_SECTION + '''

export default function ChainDashboard() {
  const [ov, setOv] = useState<any>(null);
  const [tv, setTv] = useState<any[]>([]);
  const [rl, setRl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/chain-overview`).then(r=>r.json()).catch(()=>null),
      fetch(`${API}/tx-volume?days=30`).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/richlist-v2?limit=20`).then(r=>r.json()).catch(()=>null),
    ]).then(([o,t,r]) => { setOv(o); setTv(t); setRl(r); setLoading(false); });
  }, []);

  const tip = ov?.tip;
  const eps = ov?.recent_epochs || [];

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Chain Analyst</h1>

      {loading && <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-700/20 rounded-xl animate-pulse"/>)}</div>}

      {!loading && <>
        {/* ══════════ ABOVE THE FOLD ══════════ */}
        {/* Primary metrics */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { l: "Block", v: tip?.block_no?.toLocaleString()||"-" },
            { l: "Epoch", v: tip?.epoch_no||"-" },
            { l: "TX 24h", v: (ov?.tx_24h||0).toLocaleString() },
            { l: "Pools", v: (ov?.active_pools||0).toLocaleString() },
            { l: "DReps", v: (ov?.active_dreps||0).toLocaleString() },
          ].map((m,i) => (
            <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
              <div className="text-[10px] text-gray-500">{m.l}</div>
              <div className="text-lg font-bold">{m.v}</div>
            </div>
          ))}
        </div>

        {/* Mini TX chart (inline above fold) */}
        {tv.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 px-4 py-3">
            <div className="text-[10px] text-gray-500 mb-1">TX Volume (30d)</div>
            <div className="flex items-end gap-px h-12">
              {tv.map((d:any, i:number) => {
                const max = Math.max(...tv.map((x:any)=>x.tx_count||0));
                const p = max>0 ? (d.tx_count||0)/max*100 : 0;
                return <div key={i} className="flex-1 bg-blue-500/50 hover:bg-blue-400 rounded-t transition group relative min-h-[1px]" style={{height:`${Math.max(2,p)}%`}}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-gray-900 text-[9px] px-1 py-0.5 rounded hidden group-hover:block whitespace-nowrap z-10">{d.date}: {(d.tx_count||0).toLocaleString()}</div>
                </div>;
              })}
            </div>
          </div>
        )}

        {/* Latest epoch summary (compact) */}
        {eps.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700/50 px-4 py-3">
            <div className="text-[10px] text-gray-500 mb-1">Latest Epochs</div>
            <div className="grid grid-cols-4 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Blocks</span><span className="text-right">TXs</span><span className="text-right">Fees</span>
            </div>
            {eps.slice(0, 3).map((e:any) => (
              <div key={e.no} className="grid grid-cols-4 text-xs py-1 border-b border-gray-700/20">
                <Link href={`/epoch/${e.no}`} className="text-blue-400 hover:underline">{e.no}</Link>
                <span className="text-right">{Number(e.blk_count).toLocaleString()}</span>
                <span className="text-right">{Number(e.tx_count).toLocaleString()}</span>
                <span className="text-right">{fA(e.fees)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ══════════ BELOW THE FOLD ══════════ */}
        <Section title="Full Epoch History" count={eps.length}>
          <div className="pt-2 space-y-0">
            <div className="grid grid-cols-5 text-[10px] text-gray-500 pb-1 border-b border-gray-700">
              <span>Epoch</span><span className="text-right">Blocks</span><span className="text-right">TXs</span><span className="text-right">Fees</span><span className="text-right">Output</span>
            </div>
            {eps.map((e:any) => (
              <div key={e.no} className="grid grid-cols-5 text-xs py-1 border-b border-gray-700/20">
                <Link href={`/epoch/${e.no}`} className="text-blue-400 hover:underline">{e.no}</Link>
                <span className="text-right">{Number(e.blk_count).toLocaleString()}</span>
                <span className="text-right">{Number(e.tx_count).toLocaleString()}</span>
                <span className="text-right">{fA(e.fees)}</span>
                <span className="text-right text-gray-400">{fM(e.out_sum)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Top 20 Rich List" count={20}>
          <div className="pt-2 space-y-0">
            {rl?.entries?.slice(0, 20).map((e:any) => (
              <div key={e.rank} className="flex justify-between py-1 border-b border-gray-700/20 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-500 w-5 text-right">{e.rank}</span>
                  <span className={`px-1 py-0.5 rounded text-[10px] ${e.addr_type==="stake"?"bg-blue-500/20 text-blue-400":e.addr_type==="byron"?"bg-amber-500/20 text-amber-400":"bg-purple-500/20 text-purple-400"}`}>{e.addr_type}</span>
                  <span className="font-mono text-gray-300">{e.identifier?.slice(0,16)}...</span>
                  {e.is_exchange && <span className="text-yellow-400" title={e.exchange_reason}>🏦</span>}
                  {e.is_likely_lost && <span className="text-red-400" title={e.lost_reason}>💀</span>}
                </span>
                <span className="font-bold">{fA(e.balance)}</span>
              </div>
            ))}
          </div>
          <Link href="/explorer/addresses" className="text-blue-400 text-xs hover:underline mt-2 inline-block">View full Rich List \\u2192</Link>
        </Section>
      </>}
    </div>
  );
}
''')
log("Chain Analyst Dashboard written (summary-first)")

# ============================================================
# Step 5: Build & Deploy
# ============================================================
print("\\n" + "=" * 60)
print("STEP 5: Building frontend")
print("=" * 60)

code, out, errs = run("npm run build 2>&1", timeout=600)
build_out = (out + errs).strip().split("\\n")
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
print("\\n" + "=" * 60)
print("STEP 6: Verification")
print("=" * 60)

for name, url in [
    ("SPO", "http://localhost:3000/dashboard/spo"),
    ("Governance", "http://localhost:3000/dashboard/governance"),
    ("DRep", "http://localhost:3000/dashboard/drep"),
    ("Chain", "http://localhost:3000/dashboard/chain"),
]:
    code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' '{url}' --max-time 10")
    s = out.strip()
    (log if s=="200" else warn)(f"  {name}: {s}")

print("\\n" + "=" * 60)
print("DONE! All dashboards deployed with summary-first UI.")
print("=" * 60)
