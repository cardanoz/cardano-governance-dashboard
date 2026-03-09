#!/usr/bin/env python3
"""
Restructure navigation: Dashboards as primary, Explorer consolidated into 6 pages.
All pages use "summary-first, expandable-detail" pattern.

Run on server: python3 restructure-nav-explorer.py
"""
import os, sys, subprocess, time, shutil

PROJECT = "/home/ubuntu/adatool-frontend"
API_FILE = "/home/ubuntu/adatool-api/src/index.js"
G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

def run(cmd, cwd=None, timeout=180):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

# ============================================================
# NEW API ENDPOINTS for consolidated pages
# ============================================================
EXPLORER_API = r'''
// ============================================================
// CONSOLIDATED EXPLORER API ENDPOINTS
// ============================================================

// --- Explorer: Chain (blocks + txs + epochs) ---
app.get("/explorer/chain", async (c) => {
  const data = await cached("exp:chain", 15, async () => {
    const [latestBlocks, latestTxs, epochs] = await Promise.all([
      pool.query(`SELECT b.block_no, encode(b.hash,'hex') as hash, b.epoch_no,
        b.slot_no, b.time, b.size, b.tx_count,
        ph.view as pool_id
        FROM block b
        LEFT JOIN slot_leader sl ON sl.id = b.slot_leader_id
        LEFT JOIN pool_hash ph ON ph.id = sl.pool_hash_id
        WHERE b.block_no IS NOT NULL
        ORDER BY b.block_no DESC LIMIT 30`),
      pool.query(`SELECT encode(t.hash,'hex') as hash, t.fee::text, t.out_sum::text,
        t.size, b.time, b.epoch_no, b.block_no
        FROM tx t JOIN block b ON b.id = t.block_id
        ORDER BY t.id DESC LIMIT 30`),
      pool.query(`SELECT e.no, e.start_time, e.end_time, e.blk_count as blocks,
        e.fees::text as fees, e.out_sum::text as out_sum, e.tx_count
        FROM epoch e ORDER BY e.no DESC LIMIT 15`)
    ]);
    return { latestBlocks: latestBlocks.rows, latestTxs: latestTxs.rows, epochs: epochs.rows };
  });
  return c.json(data);
});

// --- Explorer: Staking (pools + delegations + stake dist + rewards) ---
app.get("/explorer/staking", async (c) => {
  const data = await cached("exp:staking", 30, async () => {
    const epochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = epochR.rows[0]?.e || 0;
    const [pools, recentDelegations, stakeDist, stats] = await Promise.all([
      pool.query(`WITH pool_stakes AS (
        SELECT pool_id, COUNT(*) as delegators, COALESCE(SUM(amount),0)::text as stake
        FROM epoch_stake WHERE epoch_no = $1 GROUP BY pool_id
      )
      SELECT ph.view as pool_id, ocpd.json->>'name' as name, ocpd.json->>'ticker' as ticker,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        COALESCE(ps.delegators,0) as delegators, COALESCE(ps.stake,'0') as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
        LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
        LEFT JOIN pool_stakes ps ON ps.pool_id = ph.id
        WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= $1 + 1)
        ORDER BY ps.stake::numeric DESC NULLS LAST LIMIT 50`, [prevEpoch]),
      pool.query(`SELECT d.id, sa.view as stake_addr, ph.view as pool_id,
        ocpd.json->>'name' as pool_name, b.time, b.epoch_no
        FROM delegation d
        JOIN stake_address sa ON sa.id = d.addr_id
        JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
        JOIN tx t ON t.id = d.tx_id
        JOIN block b ON b.id = t.block_id
        ORDER BY d.id DESC LIMIT 30`),
      pool.query(`WITH buckets AS (
        SELECT CASE
          WHEN amount < 1000000000 THEN '< 1K ADA'
          WHEN amount < 10000000000 THEN '1K-10K'
          WHEN amount < 100000000000 THEN '10K-100K'
          WHEN amount < 1000000000000 THEN '100K-1M'
          ELSE '> 1M ADA'
        END as bucket,
        COUNT(*) as cnt, COALESCE(SUM(amount),0)::text as total
        FROM epoch_stake WHERE epoch_no = $1
        GROUP BY bucket)
        SELECT * FROM buckets ORDER BY total DESC`, [prevEpoch]),
      pool.query(`SELECT
        (SELECT COALESCE(SUM(amount),0)::text FROM epoch_stake WHERE epoch_no = $1) as total_staked,
        (SELECT COUNT(DISTINCT addr_id) FROM epoch_stake WHERE epoch_no = $1) as total_stakers,
        (SELECT COUNT(*) FROM pool_hash ph WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= $1 + 1)) as active_pools`, [prevEpoch])
    ]);
    return { pools: pools.rows, recentDelegations: recentDelegations.rows, stakeDistribution: stakeDist.rows, stats: stats.rows[0] || {} };
  });
  return c.json(data);
});

// --- Explorer: Governance ---
app.get("/explorer/governance", async (c) => {
  const data = await cached("exp:governance", 60, async () => {
    const [proposals, dreps, committee, votes, constitution, params] = await Promise.all([
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.expiration,
        va.url as anchor_url,
        b.time, b.epoch_no,
        gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id) as vote_count
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
        ORDER BY b.time DESC LIMIT 30`),
      pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script,
        (SELECT COUNT(*) FROM delegation_vote dv WHERE dv.drep_hash_id = dh.id) as delegations
        FROM drep_hash dh
        ORDER BY delegations DESC LIMIT 30`),
      pool.query(`SELECT ch.id, encode(ch.raw,'hex') as cred_hash, ch.has_script,
        cm.expiration_epoch
        FROM committee_member cm
        JOIN committee_hash ch ON ch.id = cm.committee_hash_id`),
      pool.query(`SELECT gp.type as proposal_type,
        vp.vote, vp.voter_role,
        CASE WHEN vp.voter_role='DRep' THEN encode(dh.raw,'hex')
             WHEN vp.voter_role='SPO' THEN ph.view
             WHEN vp.voter_role='ConstitutionalCommittee' THEN encode(ch.raw,'hex')
        END as voter_id,
        b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN drep_hash dh ON dh.id = vp.drep_voter
        LEFT JOIN pool_hash ph ON ph.id = vp.pool_voter
        LEFT JOIN committee_hash ch ON ch.id = vp.committee_voter
        ORDER BY b.time DESC LIMIT 50`),
      pool.query(`SELECT c.script_hash, va.url, va.data_hash
        FROM constitution c
        LEFT JOIN voting_anchor va ON va.id = c.voting_anchor_id
        ORDER BY c.id DESC LIMIT 1`),
      pool.query(`SELECT epoch_no, min_fee_a, min_fee_b, key_deposit::text,
        pool_deposit::text, optimal_pool_count, min_pool_cost::text,
        monetary_expand_rate, treasury_growth_rate, protocol_major, protocol_minor
        FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`)
    ]);
    return {
      proposals: proposals.rows, dreps: dreps.rows, committee: committee.rows,
      recentVotes: votes.rows, constitution: constitution.rows[0] || null,
      protocolParams: params.rows[0] || {}
    };
  });
  return c.json(data);
});

// --- Explorer: Tokens (optimized - no per-token supply subquery) ---
app.get("/explorer/tokens", async (c) => {
  const data = await cached("exp:tokens", 30, async () => {
    const [tokens, recentMints] = await Promise.all([
      pool.query(`SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex
        FROM multi_asset ma
        ORDER BY ma.id DESC LIMIT 50`),
      pool.query(`SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex,
        mam.quantity::text, b.time, b.epoch_no
        FROM ma_tx_mint mam
        JOIN multi_asset ma ON ma.id = mam.ident
        JOIN tx t ON t.id = mam.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE mam.quantity > 0
        ORDER BY t.id DESC LIMIT 30`)
    ]);
    return { tokens: tokens.rows, recentMints: recentMints.rows };
  });
  return c.json(data);
});

// --- Explorer: Analytics ---
app.get("/explorer/analytics", async (c) => {
  const data = await cached("exp:analytics", 60, async () => {
    const [epochTrend, pots, blockVersions] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time, e.blk_count as blocks,
        e.tx_count, e.fees::text as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 20`),
      pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
        utxo::text, deposits_stake::text, fees::text
        FROM ada_pots ORDER BY epoch_no DESC LIMIT 15`),
      pool.query(`SELECT b.proto_major, b.proto_minor, COUNT(*) as block_count
        FROM block b WHERE b.epoch_no = (SELECT MAX(no) FROM epoch)
        GROUP BY b.proto_major, b.proto_minor ORDER BY block_count DESC`)
    ]);
    return { epochTrend: epochTrend.rows, adaPots: pots.rows, blockVersions: blockVersions.rows };
  });
  return c.json(data);
});

// --- Explorer: Addresses (rich list + whales) ---
app.get("/explorer/addresses", async (c) => {
  const data = await cached("exp:addresses", 120, async () => {
    const topStakers = await pool.query(`SELECT sa.view as stake_address,
        es.amount::text,
        ph.view as pool_id,
        pod.json->>'name' as pool_name
        FROM epoch_stake es
        JOIN stake_address sa ON sa.id = es.addr_id
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (SELECT MAX(d2.id) FROM delegation d2 WHERE d2.addr_id = sa.id)
        LEFT JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN off_chain_pool_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM off_chain_pool_data pod2 WHERE pod2.pool_id = ph.id)
        WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
        ORDER BY es.amount DESC LIMIT 50`);
    return { topStakers: topStakers.rows };
  });
  return c.json(data);
});
'''

# ============================================================
# SHARED UI HELPERS
# ============================================================
SHARED_HEAD = r'''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const fA = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const ago = (t: string) => { if(!t)return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return `${Math.floor(s)}s`; if(s<3600)return `${Math.floor(s/60)}m`; if(s<86400)return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const tr = (h: string, n=8) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";
const compact = (n: number) => n>=1e9?(n/1e9).toFixed(1)+"B":n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":n.toString();

function Skel() { return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse"/>)}</div>; }
function Stat({ label, value, sub, color="text-white" }: { label: string; value: string; sub?: string; color?: string }) {
  return <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50 min-w-0">
    <div className="text-[10px] text-gray-500 truncate">{label}</div>
    <div className={`text-sm font-bold ${color} truncate`}>{value}</div>
    {sub && <div className="text-[10px] text-gray-500 truncate">{sub}</div>}
  </div>;
}
function Section({ title, count, open: init = false, children }: { title: string; count?: number; open?: boolean; children: React.ReactNode }) {
  const [o, setO] = useState(init);
  return <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
    <button onClick={()=>setO(!o)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/30 transition text-left">
      <span className="text-sm font-semibold">{title}{count!==undefined&&<span className="text-gray-500 ml-1 text-xs">({count})</span>}</span>
      <span className={`text-gray-400 text-xs transition-transform ${o?"rotate-180":""}`}>&#9660;</span>
    </button>
    {o && <div className="px-4 pb-3 border-t border-gray-700/50">{children}</div>}
  </div>;
}
'''

# ============================================================
# FRONTEND PAGES
# ============================================================
PAGES = {}

# --- Explorer Index ---
PAGES["explorer/page.tsx"] = r'''import Link from "next/link";
export const dynamic = "force-dynamic";
const sections = [
  { href: "/explorer/chain", icon: "⛓️", title: "Chain", desc: "Blocks, transactions, epochs" },
  { href: "/explorer/staking", icon: "🥩", title: "Staking", desc: "Pools, delegations, distribution" },
  { href: "/explorer/governance", icon: "🏛️", title: "Governance", desc: "Proposals, DReps, votes" },
  { href: "/explorer/tokens", icon: "🪙", title: "Tokens", desc: "Native tokens, recent mints" },
  { href: "/explorer/analytics", icon: "📊", title: "Analytics", desc: "Trends, pots, distribution" },
  { href: "/explorer/addresses", icon: "📋", title: "Addresses", desc: "Rich list, top stakers" },
  { href: "/explorer/constitution", icon: "📜", title: "Constitution", desc: "Amendment tool & proposals" },
];
export default function ExplorerIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Explorer</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sections.map((s, i) => (
          <Link key={i} href={s.href} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition">
            <span className="text-2xl">{s.icon}</span>
            <h2 className="font-bold mt-2">{s.title}</h2>
            <p className="text-gray-400 text-xs mt-0.5">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
'''

# --- Chain Explorer: summary cards + expandable tables ---
PAGES["explorer/chain/page.tsx"] = SHARED_HEAD + r'''
export default function ChainExplorer() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/chain`).then(r=>r.json()).then(setD).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  if (!d) return <Skel/>;
  const tip = d.latestBlocks?.[0];
  const ep = d.epochs?.[0];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Chain Explorer</h1>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Block Height" value={tip ? `#${Number(tip.block_no).toLocaleString()}` : "-"} color="text-blue-400"/>
        <Stat label="Current Epoch" value={ep ? `${ep.no}` : "-"} sub={ep ? `${Number(ep.blocks).toLocaleString()} blocks` : ""}/>
        <Stat label="Latest Block" value={tip ? `${tip.tx_count} txs` : "-"} sub={tip ? `${ago(tip.time)} ago` : ""}/>
        <Stat label="Epoch Fees" value={ep ? `${fA(ep.fees)} ADA` : "-"}/>
      </div>
      {/* Epochs - default open, compact */}
      <Section title="Epochs" count={d.epochs?.length} open={true}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Epoch</th><th className="text-right py-1.5 px-1">Blocks</th>
              <th className="text-right py-1.5 px-1">TXs</th><th className="text-right py-1.5 px-1">Fees</th>
            </tr></thead>
            <tbody>{(d.epochs||[]).map((e: any) => (
              <tr key={e.no} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1"><Link href={`/epoch/${e.no}`} className="text-blue-400 hover:underline font-bold">{e.no}</Link></td>
                <td className="py-1 px-1 text-right">{Number(e.blocks).toLocaleString()}</td>
                <td className="py-1 px-1 text-right">{Number(e.tx_count||0).toLocaleString()}</td>
                <td className="py-1 px-1 text-right text-gray-400">{fA(e.fees)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
      {/* Recent Blocks */}
      <Section title="Latest Blocks" count={d.latestBlocks?.length}>
        <div className="space-y-1 pt-1">
          {(d.latestBlocks||[]).map((b: any) => (
            <div key={b.block_no} className="flex justify-between items-center py-1 text-xs border-b border-gray-700/20">
              <div>
                <Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline font-mono">#{b.block_no}</Link>
                <span className="text-gray-600 ml-1">{b.pool_id?b.pool_id.slice(0,12):""}</span>
              </div>
              <div className="text-right text-gray-400">
                {b.tx_count} txs <span className="text-gray-600 ml-1">{ago(b.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
      {/* Recent Transactions */}
      <Section title="Latest Transactions" count={d.latestTxs?.length}>
        <div className="space-y-1 pt-1">
          {(d.latestTxs||[]).map((tx: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-1 text-xs border-b border-gray-700/20">
              <div>
                <Link href={`/tx/${tx.hash}`} className="text-blue-400 hover:underline font-mono">{tr(tx.hash,10)}</Link>
                <span className="text-gray-600 ml-1">Blk #{tx.block_no}</span>
              </div>
              <div className="text-right">
                {fA(tx.out_sum)} ADA <span className="text-gray-600 ml-1">{ago(tx.time)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
'''

# --- Staking Explorer: summary + expandable ---
PAGES["explorer/staking/page.tsx"] = SHARED_HEAD + r'''
export default function StakingExplorer() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/staking`).then(r=>r.json()).then(setD).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  if (!d) return <Skel/>;
  const s = d.stats || {};
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Staking Explorer</h1>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total Staked" value={`${compact(Number(s.total_staked||0)/1e6)} ADA`} color="text-green-400"/>
        <Stat label="Stakers" value={compact(Number(s.total_stakers||0))} color="text-blue-400"/>
        <Stat label="Active Pools" value={Number(s.active_pools||0).toLocaleString()} color="text-purple-400"/>
      </div>
      {/* Stake Distribution - always visible, compact */}
      <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-3">
        <div className="text-xs font-semibold mb-2">Stake Distribution</div>
        <div className="space-y-1">
          {(d.stakeDistribution||[]).map((b: any, i: number) => {
            const mx = Math.max(...(d.stakeDistribution||[]).map((x: any)=>Number(x.total)));
            const pct = mx>0?(Number(b.total)/mx)*100:0;
            return <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-gray-400 text-[10px]">{b.bucket}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                <div className="bg-green-500/50 h-full rounded-full flex items-center px-1.5" style={{width:`${Math.max(pct,3)}%`}}>
                  <span className="text-[9px] whitespace-nowrap">{compact(Number(b.total)/1e6)}</span>
                </div>
              </div>
              <span className="text-gray-500 w-12 text-right text-[10px]">{compact(Number(b.cnt))}</span>
            </div>;
          })}
        </div>
      </div>
      <Section title="Top Pools" count={d.pools?.length} open={true}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Pool</th><th className="text-right py-1.5 px-1">Stake</th>
              <th className="text-right py-1.5 px-1">Dlg</th><th className="text-right py-1.5 px-1">Margin</th>
            </tr></thead>
            <tbody>{(d.pools||[]).slice(0,20).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1"><Link href={`/pool/${p.pool_id}`} className="text-blue-400 hover:underline">{p.ticker||p.name||p.pool_id?.slice(0,16)}</Link></td>
                <td className="py-1 px-1 text-right">{compact(Number(p.stake)/1e6)}</td>
                <td className="py-1 px-1 text-right text-gray-400">{Number(p.delegators).toLocaleString()}</td>
                <td className="py-1 px-1 text-right text-gray-400">{(Number(p.margin)*100).toFixed(1)}%</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Recent Delegations" count={d.recentDelegations?.length}>
        <div className="space-y-1 pt-1">
          {(d.recentDelegations||[]).map((dl: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-700/20">
              <span className="font-mono text-gray-400">{tr(dl.stake_addr,8)}</span>
              <span><Link href={`/pool/${dl.pool_id}`} className="text-blue-400 hover:underline">{dl.pool_name||tr(dl.pool_id)}</Link></span>
              <span className="text-gray-500">{ago(dl.time)}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
'''

# --- Governance Explorer: summary + expandable ---
PAGES["explorer/governance/page.tsx"] = SHARED_HEAD + r'''
export default function GovernanceExplorer() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/governance`).then(r=>r.json()).then(setD).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  if (!d) return <Skel/>;
  const pp = d.protocolParams||{};
  const active = (d.proposals||[]).filter((p: any)=>!p.ratified_epoch&&!p.enacted_epoch&&!p.dropped_epoch&&!p.expired_epoch);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Governance Explorer</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Proposals" value={`${d.proposals?.length||0}`} sub={`${active.length} active`} color="text-yellow-400"/>
        <Stat label="DReps" value={`${d.dreps?.length||0}`} color="text-purple-400"/>
        <Stat label="Committee" value={`${d.committee?.length||0}`}/>
        <Stat label="Protocol" value={`v${pp.protocol_major}.${pp.protocol_minor}`} sub={`Epoch ${pp.epoch_no}`}/>
      </div>
      <Section title="Proposals" count={d.proposals?.length} open={true}>
        <div className="space-y-1.5 pt-1">
          {(d.proposals||[]).map((p: any, i: number) => {
            const st = p.enacted_epoch?"Enacted":p.ratified_epoch?"Ratified":p.dropped_epoch?"Dropped":p.expired_epoch?"Expired":"Active";
            const sc = st==="Enacted"?"bg-green-600/30 text-green-300":st==="Active"?"bg-yellow-600/30 text-yellow-300":st==="Ratified"?"bg-blue-600/30 text-blue-300":"bg-red-600/30 text-red-300";
            return <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-700/20">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${sc}`}>{st}</span>
              <span className="bg-gray-700/50 px-1 py-0.5 rounded text-[10px] text-gray-300">{p.type}</span>
              <span className="font-mono text-gray-500">{tr(p.tx_hash)}#{p.index}</span>
              <span className="ml-auto text-gray-500">{p.vote_count}v</span>
              <span className="text-gray-600">{ago(p.time)}</span>
            </div>;
          })}
        </div>
      </Section>
      <Section title="Top DReps" count={d.dreps?.length}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1 px-1">#</th><th className="text-left py-1 px-1">DRep</th>
              <th className="text-left py-1 px-1">Type</th><th className="text-right py-1 px-1">Delegations</th>
            </tr></thead>
            <tbody>{(d.dreps||[]).map((dr: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/20">
                <td className="py-1 px-1 text-gray-500">{i+1}</td>
                <td className="py-1 px-1 font-mono">{dr.view||tr(dr.drep_hash)}</td>
                <td className="py-1 px-1">{dr.has_script?<span className="text-yellow-400">Script</span>:<span className="text-gray-500">Key</span>}</td>
                <td className="py-1 px-1 text-right font-bold">{Number(dr.delegations).toLocaleString()}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Recent Votes" count={d.recentVotes?.length}>
        <div className="space-y-1 pt-1">
          {(d.recentVotes||[]).map((v: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-700/20">
              <span className="text-gray-500">{v.proposal_type}</span>
              <span className="font-mono text-gray-400">{tr(v.voter_id||"")}</span>
              <span className="bg-gray-700/50 px-1 py-0.5 rounded text-[10px]">{v.voter_role}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.vote==='Yes'?'bg-green-600/30 text-green-300':v.vote==='No'?'bg-red-600/30 text-red-300':'bg-gray-600/30'}`}>{v.vote}</span>
              <span className="ml-auto text-gray-600">{ago(v.time)}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Committee Members" count={d.committee?.length}>
        <div className="space-y-1 pt-1">
          {(d.committee||[]).map((m: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-700/20">
              <span className="font-mono text-gray-400">{tr(m.cred_hash,12)}</span>
              <span>{m.has_script?<span className="text-yellow-400">Script</span>:<span className="text-gray-500">Key</span>}</span>
              <span className="text-gray-500">{m.expiration_epoch?`Exp ${m.expiration_epoch}`:"-"}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Protocol Parameters">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
          <div><span className="text-gray-500">Key Deposit</span><p>{fA(pp.key_deposit||0)} ADA</p></div>
          <div><span className="text-gray-500">Pool Deposit</span><p>{fA(pp.pool_deposit||0)} ADA</p></div>
          <div><span className="text-gray-500">Min Pool Cost</span><p>{fA(pp.min_pool_cost||0)} ADA</p></div>
          <div><span className="text-gray-500">Optimal k</span><p>{pp.optimal_pool_count}</p></div>
          <div><span className="text-gray-500">Mon. Expansion</span><p>{(Number(pp.monetary_expand_rate||0)*100).toFixed(3)}%</p></div>
          <div><span className="text-gray-500">Treasury Growth</span><p>{(Number(pp.treasury_growth_rate||0)*100).toFixed(1)}%</p></div>
        </div>
      </Section>
      {d.constitution && <Section title="Constitution">
        <div className="text-xs pt-1">
          {d.constitution.url && <p><span className="text-gray-500">URL: </span><a href={d.constitution.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{d.constitution.url}</a></p>}
          {d.constitution.script_hash && <p className="mt-1"><span className="text-gray-500">Script: </span><span className="font-mono">{d.constitution.script_hash}</span></p>}
        </div>
      </Section>}
    </div>
  );
}
'''

# --- Tokens Explorer ---
PAGES["explorer/tokens/page.tsx"] = SHARED_HEAD + r'''
export default function TokensExplorer() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/tokens`).then(r=>r.json()).then(setD).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  if (!d) return <Skel/>;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Tokens Explorer</h1>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Recent Mints" value={`${d.recentMints?.length||0}`} color="text-green-400"/>
        <Stat label="Latest Tokens" value={`${d.tokens?.length||0}`}/>
      </div>
      <Section title="Recent Mints" count={d.recentMints?.length} open={true}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Token</th><th className="text-left py-1.5 px-1">Policy</th>
              <th className="text-right py-1.5 px-1">Qty</th><th className="text-right py-1.5 px-1">Time</th>
            </tr></thead>
            <tbody>{(d.recentMints||[]).map((m: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1">{m.fingerprint?<Link href={`/token/${m.fingerprint}`} className="text-blue-400 hover:underline font-mono">{tr(m.fingerprint,12)}</Link>:<span className="font-mono text-gray-400">{tr(m.name_hex)}</span>}</td>
                <td className="py-1 px-1 font-mono text-gray-500">{tr(m.policy)}</td>
                <td className="py-1 px-1 text-right">{Number(m.quantity).toLocaleString()}</td>
                <td className="py-1 px-1 text-right text-gray-500">{ago(m.time)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Latest Tokens" count={d.tokens?.length}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Fingerprint</th><th className="text-left py-1.5 px-1">Policy</th>
            </tr></thead>
            <tbody>{(d.tokens||[]).map((t: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1">{t.fingerprint?<Link href={`/token/${t.fingerprint}`} className="text-blue-400 hover:underline font-mono">{t.fingerprint}</Link>:<span className="font-mono text-gray-400">{tr(t.name_hex)}</span>}</td>
                <td className="py-1 px-1 font-mono text-gray-500">{tr(t.policy)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
'''

# --- Analytics Explorer ---
PAGES["explorer/analytics/page.tsx"] = SHARED_HEAD + r'''
export default function AnalyticsExplorer() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/analytics`).then(r=>r.json()).then(setD).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  if (!d) return <Skel/>;
  const ep = d.epochTrend?.[0];
  const pot = d.adaPots?.[0];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Analytics Explorer</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="Current Epoch" value={ep?`${ep.no}`:"-"} sub={ep?`${Number(ep.blocks).toLocaleString()} blocks`:""}/>
        <Stat label="Epoch TXs" value={ep?Number(ep.tx_count).toLocaleString():"-"} color="text-blue-400"/>
        <Stat label="Treasury" value={pot?`${compact(Number(pot.treasury)/1e6)} ADA`:"-"} color="text-green-400"/>
        <Stat label="Reserves" value={pot?`${compact(Number(pot.reserves)/1e6)} ADA`:"-"}/>
      </div>
      <Section title="Block Versions" count={d.blockVersions?.length} open={true}>
        <div className="space-y-1 pt-1">
          {(d.blockVersions||[]).map((v: any, i: number) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-700/20">
              <span>v{v.proto_major}.{v.proto_minor}</span>
              <span className="font-bold">{Number(v.block_count).toLocaleString()} blocks</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Epoch Trend" count={d.epochTrend?.length} open={true}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Epoch</th><th className="text-right py-1.5 px-1">Blocks</th>
              <th className="text-right py-1.5 px-1">TXs</th><th className="text-right py-1.5 px-1">Fees</th>
            </tr></thead>
            <tbody>{(d.epochTrend||[]).map((e: any) => (
              <tr key={e.no} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1 font-bold">{e.no}</td>
                <td className="py-1 px-1 text-right">{Number(e.blocks).toLocaleString()}</td>
                <td className="py-1 px-1 text-right">{Number(e.tx_count).toLocaleString()}</td>
                <td className="py-1 px-1 text-right text-gray-400">{fA(e.total_fees)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="ADA Pots" count={d.adaPots?.length}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1.5 px-1">Epoch</th><th className="text-right py-1.5 px-1">Treasury</th>
              <th className="text-right py-1.5 px-1">Reserves</th><th className="text-right py-1.5 px-1">Rewards</th>
            </tr></thead>
            <tbody>{(d.adaPots||[]).map((p: any) => (
              <tr key={p.epoch_no} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1 px-1">{p.epoch_no}</td>
                <td className="py-1 px-1 text-right">{compact(Number(p.treasury)/1e6)}</td>
                <td className="py-1 px-1 text-right">{compact(Number(p.reserves)/1e6)}</td>
                <td className="py-1 px-1 text-right">{compact(Number(p.rewards)/1e6)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
'''

# --- Addresses Explorer (Rich List) - already summary-first, keep as is ---
PAGES["explorer/addresses/page.tsx"] = r'''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const truncAddr = (h: string, n=12) => h ? h.slice(0,n)+"..."+h.slice(-6) : "";
const timeAgo = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return `${Math.floor(s)}s ago`; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; if(s<2592000)return `${Math.floor(s/86400)}d ago`; return `${(s/31536000).toFixed(1)}y ago`; };

type Filter = "all" | "stake" | "byron" | "enterprise";
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  stake: { label: "Staking", color: "bg-blue-500/20 text-blue-400" },
  byron: { label: "Byron", color: "bg-amber-500/20 text-amber-400" },
  enterprise: { label: "Enterprise", color: "bg-purple-500/20 text-purple-400" },
};

function Skel() { return <div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-14 bg-gray-700/30 rounded-lg animate-pulse"/>)}</div>; }

export default function AddressesExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showExchange, setShowExchange] = useState<"all"|"exchange"|"non-exchange">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${API}/richlist-v2?limit=300`).then(r=>r.json()).then(setData).catch(()=>setErr(true));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries.filter((e: any) => {
      if (filter !== "all" && e.addr_type !== filter) return false;
      if (showExchange === "exchange" && !e.is_exchange) return false;
      if (showExchange === "non-exchange" && e.is_exchange) return false;
      if (search && !e.identifier.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, filter, showExchange, search]);

  const s = data?.summary;
  const [showAll, setShowAll] = useState(false);
  const display = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Rich List</h1>
        {s && <span className="text-xs text-gray-500">Epoch {s.epoch}</span>}
      </div>
      {err && <div className="p-6 text-center text-gray-400">Failed to load</div>}
      {!data && !err && <Skel/>}
      {data && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Entries</div>
            <div className="text-sm font-bold">{s.total_entries.toLocaleString()}</div>
            <div className="text-[10px] text-gray-500">{fmtAda(s.total_balance)} ADA</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Staking</div>
            <div className="text-sm font-bold">{s.by_type.stake.count}</div>
            <div className="text-[10px] text-gray-500">{fmtAda(s.by_type.stake.balance)} ADA</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Exchange</div>
            <div className="text-sm font-bold">{s.exchange.count}</div>
            <div className="text-[10px] text-gray-500">{fmtAda(s.exchange.balance)} ADA</div>
          </div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700/50">
            <div className="text-[10px] text-gray-500">Likely Lost</div>
            <div className="text-sm font-bold">{s.likely_lost.count}</div>
            <div className="text-[10px] text-gray-500">{fmtAda(s.likely_lost.balance)} ADA</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
            {(["all","stake","byron","enterprise"] as Filter[]).map(f => (
              <button key={f} onClick={() => { setFilter(f); setShowAll(false); }}
                className={`px-2 py-1 text-[11px] rounded transition font-medium ${filter===f ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
                {f === "all" ? "All" : TYPE_LABELS[f]?.label || f}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
            {(["all","exchange","non-exchange"] as const).map(f => (
              <button key={f} onClick={() => { setShowExchange(f); setShowAll(false); }}
                className={`px-2 py-1 text-[11px] rounded transition font-medium ${showExchange===f ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"}`}>
                {f === "all" ? "All" : f === "exchange" ? "Exchange" : "Non-Exch"}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setShowAll(false); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 w-32 focus:outline-none focus:border-blue-500" />
          <span className="text-[10px] text-gray-600 ml-auto">{filtered.length} results</span>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 text-[10px] border-b border-gray-700">
                <th className="text-left py-2 px-2 w-8">#</th>
                <th className="text-left py-2 px-1">Type</th>
                <th className="text-left py-2 px-1">Address</th>
                <th className="text-right py-2 px-1">Balance</th>
                <th className="text-right py-2 px-1 hidden md:table-cell">TXs</th>
                <th className="text-center py-2 px-1 hidden md:table-cell">Flag</th>
              </tr></thead>
              <tbody>{display.map((e: any, idx: number) => {
                const t = TYPE_LABELS[e.addr_type] || { label: e.addr_type, color: "bg-gray-500/20 text-gray-400" };
                return (
                  <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-700/20">
                    <td className="py-1.5 px-2 text-gray-500">{e.rank}</td>
                    <td className="py-1.5 px-1"><span className={`px-1.5 py-0.5 rounded text-[10px] ${t.color}`}>{t.label}</span></td>
                    <td className="py-1.5 px-1">
                      <Link href={`/address/${e.identifier}`} className="text-blue-400 hover:underline font-mono">{truncAddr(e.identifier,14)}</Link>
                      {e.pool && <span className="text-gray-500 ml-1 text-[10px]">{e.pool.pool_ticker||""}</span>}
                    </td>
                    <td className="py-1.5 px-1 text-right font-bold whitespace-nowrap">{fmtAda(e.balance)}</td>
                    <td className="py-1.5 px-1 text-right text-gray-400 hidden md:table-cell">{(e.tx_count||0).toLocaleString()}</td>
                    <td className="py-1.5 px-1 text-center hidden md:table-cell">
                      {e.is_exchange && <span title={e.exchange_reason}>EX</span>}
                      {e.is_likely_lost && <span title={e.lost_reason} className="text-red-400 ml-0.5">LOST</span>}
                      {!e.is_exchange && !e.is_likely_lost && <span className="text-gray-700">-</span>}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {filtered.length > 10 && (
            <button onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-center text-xs text-blue-400 hover:bg-gray-700/30 transition border-t border-gray-700/50">
              {showAll ? "Show Top 10 \u25b2" : `Show All ${filtered.length} \u25bc`}
            </button>
          )}
        </div>
      </>}
    </div>
  );
}
'''

# ============================================================
# UPDATED HEADER
# ============================================================
HEADER_CONTENT = r'''"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const DASHBOARDS = [
  { href: "/dashboard/holder", label: "ADA Holder" },
  { href: "/dashboard/spo", label: "SPO" },
  { href: "/dashboard/drep", label: "DRep" },
  { href: "/dashboard/governance", label: "Governance" },
  { href: "/dashboard/chain", label: "Chain Analyst" },
];

const EXPLORER = [
  { section: "Chain", items: [{ href: "/explorer/chain", label: "Blocks & Transactions" }]},
  { section: "Staking", items: [{ href: "/explorer/staking", label: "Pools & Delegations" }]},
  { section: "Governance", items: [{ href: "/explorer/governance", label: "Proposals & Votes" }]},
  { section: "Assets", items: [{ href: "/explorer/tokens", label: "Tokens & Mints" }]},
  { section: "Analysis", items: [
    { href: "/explorer/analytics", label: "Network Analytics" },
    { href: "/explorer/addresses", label: "Rich List & Whales" },
  ]},
];

export default function Header() {
  const [open, setOpen] = useState<string|null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isDash = pathname?.startsWith("/dashboard");
  const isExpl = pathname?.startsWith("/explorer");

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">A</div>
          <span><span className="text-blue-400">ADA</span>tool</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <div className="relative" onMouseEnter={() => setOpen("dash")} onMouseLeave={() => setOpen(null)}>
            <button className={`px-3 py-2 text-sm rounded transition ${isDash ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              Dashboards <span className="text-xs opacity-50">{"\u25be"}</span>
            </button>
            {open === "dash" && (
              <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] z-50">
                {DASHBOARDS.map(d => (
                  <Link key={d.href} href={d.href}
                    className={`block px-4 py-2 text-sm transition ${pathname===d.href ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    onClick={() => setOpen(null)}>{d.label}</Link>
                ))}
              </div>
            )}
          </div>
          <div className="relative" onMouseEnter={() => setOpen("expl")} onMouseLeave={() => setOpen(null)}>
            <button className={`px-3 py-2 text-sm rounded transition ${isExpl ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              Explorer <span className="text-xs opacity-50">{"\u25be"}</span>
            </button>
            {open === "expl" && (
              <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[220px] z-50">
                <Link href="/explorer" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition" onClick={() => setOpen(null)}>Overview</Link>
                {EXPLORER.map(group => (
                  <div key={group.section}>
                    <div className="px-4 pt-2 pb-1 text-xs font-bold text-gray-500 uppercase">{group.section}</div>
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href}
                        className={`block px-4 py-2 text-sm transition ${pathname===item.href ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        onClick={() => setOpen(null)}>{item.label}</Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link href="/live" className="px-3 py-2 text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Live
          </Link>
          <Link href="/search" className="px-3 py-2 text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </nav>
        <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 max-h-[80vh] overflow-y-auto">
          <div className="border-b border-gray-800">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Dashboards</div>
            {DASHBOARDS.map(d => (
              <Link key={d.href} href={d.href} className="block px-6 py-2 text-sm text-gray-300 hover:bg-gray-800" onClick={() => setMobileOpen(false)}>{d.label}</Link>
            ))}
          </div>
          <div className="border-b border-gray-800">
            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Explorer</div>
            {EXPLORER.map(g => g.items.map(item => (
              <Link key={item.href} href={item.href} className="block px-6 py-2 text-sm text-gray-300 hover:bg-gray-800" onClick={() => setMobileOpen(false)}>{item.label}</Link>
            )))}
          </div>
          <div className="px-4 py-3 flex gap-4">
            <Link href="/live" className="text-sm text-green-400" onClick={() => setMobileOpen(false)}>Live</Link>
            <Link href="/search" className="text-sm text-gray-300" onClick={() => setMobileOpen(false)}>Search</Link>
          </div>
        </div>
      )}
    </header>
  );
}
'''

# ============================================================
# MAIN EXECUTION
# ============================================================
if __name__ == "__main__":
    print("\n" + "="*60)
    log("Navigation Restructure & Explorer Consolidation")
    print("="*60 + "\n")

    if not os.path.isdir(PROJECT):
        err(f"Project not found: {PROJECT}"); sys.exit(1)

    # Step 1: Add consolidated explorer API endpoints
    info("Step 1: Adding consolidated explorer API endpoints...")
    with open(API_FILE, "r") as f:
        api_content = f.read()

    if "/explorer/chain" in api_content and "CONSOLIDATED EXPLORER" in api_content:
        warn("  Consolidated explorer endpoints already exist, skipping...")
    else:
        lines = api_content.rstrip().split("\n")
        insert_at = len(lines)
        for i in range(len(lines)-1, max(0, len(lines)-30), -1):
            if "serve(" in lines[i] or "app.listen" in lines[i] or "export default" in lines[i]:
                insert_at = i
                break
        api_content = "\n".join(lines[:insert_at]) + "\n" + EXPLORER_API + "\n" + "\n".join(lines[insert_at:])
        with open(API_FILE, "w") as f:
            f.write(api_content)
        log(f"  Added {len(EXPLORER_API.splitlines())} lines of API endpoints")

    # Step 2: Write consolidated explorer pages
    info("Step 2: Writing consolidated explorer pages...")
    base = os.path.join(PROJECT, "src/app/(explorer)")
    for rel_path, content in PAGES.items():
        full_path = os.path.join(base, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)
        log(f"  Written: {rel_path}")

    # Step 3: Update Header
    info("Step 3: Updating Header navigation...")
    header_path = os.path.join(PROJECT, "src/components/layout/Header.tsx")
    with open(header_path, "w") as f:
        f.write(HEADER_CONTENT)
    header_alt = os.path.join(PROJECT, "src/components/Header.tsx")
    shutil.copy2(header_path, header_alt)
    log("  Header updated (both paths)")

    # Step 4: Restart API
    info("Step 4: Restarting API...")
    run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
    time.sleep(5)
    code, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/explorer/chain --max-time 15")
    log(f"  API /explorer/chain => {out.strip()}")

    # Step 5: Build frontend
    info("Step 5: Building frontend...")
    code, out, errs = run("npm run build 2>&1", timeout=600)
    build_out = (out + errs).strip().split("\n")
    for line in build_out[-25:]:
        print(f"  {line}")
    if code != 0:
        err("BUILD FAILED!"); sys.exit(1)
    log("BUILD SUCCESS!")

    # Step 6: Deploy
    info("Step 6: Deploying...")
    run("cp -r public .next/standalone/")
    run("cp -r .next/static .next/standalone/.next/")
    run("sudo systemctl restart adatool-frontend")
    time.sleep(10)

    # Step 7: Test all pages
    info("Step 7: Testing pages...")
    test_pages = [
        "dashboard", "dashboard/holder", "dashboard/spo", "dashboard/cc",
        "dashboard/drep", "dashboard/governance", "dashboard/chain",
        "dashboard/portfolio", "dashboard/developer",
        "explorer", "explorer/chain", "explorer/staking", "explorer/governance",
        "explorer/tokens", "explorer/analytics", "explorer/addresses",
        "live", "search",
    ]
    ok = fail = 0
    for p in test_pages:
        _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
        status = out.strip().strip("'")
        if status.startswith("2"):
            log(f"  /{p} => {status}"); ok += 1
        else:
            warn(f"  /{p} => {status}"); fail += 1

    print(f"\n  Results: {ok} OK, {fail} failed out of {ok+fail}")
    print("\n" + "="*60)
    log("RESTRUCTURE COMPLETE!")
    print("="*60 + "\n")
