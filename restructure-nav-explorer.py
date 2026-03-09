#!/usr/bin/env python3
"""
Restructure navigation: Dashboards as primary, Explorer consolidated into 6 pages.

New structure:
  [Dashboards ▾]  [Explorer ▾]  [Live]  [Search]

Explorer pages (6 consolidated):
  /explorer/chain     - Blocks + Txs + Epochs + Certificates + Metadata
  /explorer/staking   - Pools + Delegations + Stake Dist + Rewards
  /explorer/governance- Proposals + DReps + Committee + Votes + Constitution
  /explorer/tokens    - Token list + Mints
  /explorer/analytics - Network + Charts + Wealth + Pots
  /explorer/addresses - Rich List + Whales + Top Addresses

Detail pages (unchanged): /block/[hash], /tx/[hash], /epoch/[no], /pool/[hash], /address/[addr], /token/[fp]

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

// --- Explorer: Tokens ---
app.get("/explorer/tokens", async (c) => {
  const data = await cached("exp:tokens", 30, async () => {
    const [tokens, recentMints] = await Promise.all([
      pool.query(`SELECT ma.fingerprint, encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex,
        (SELECT COALESCE(SUM(mto.quantity),0)::text FROM ma_tx_out mto
         JOIN tx_out tao ON tao.id = mto.tx_out_id
         LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
         WHERE mto.ident = ma.id AND ti.id IS NULL) as supply
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
    const [epochTrend, pots, wealth, blockVersions] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time,
        (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks,
        (SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as tx_count,
        (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 20`),
      pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
        utxo::text, deposits_stake::text, fees::text
        FROM ada_pots ORDER BY epoch_no DESC LIMIT 15`),
      pool.query(`WITH w AS (
        SELECT SUM(value) as bal FROM tx_out tao
        LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
        WHERE ti.id IS NULL GROUP BY tao.address ORDER BY bal DESC LIMIT 100)
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(bal),0)::text as total,
          COALESCE(MIN(bal),0)::text as min_bal,
          COALESCE(MAX(bal),0)::text as max_bal
        FROM w`),
      pool.query(`SELECT b.proto_major, b.proto_minor, COUNT(*) as block_count
        FROM block b WHERE b.epoch_no = (SELECT MAX(no) FROM epoch)
        GROUP BY b.proto_major, b.proto_minor ORDER BY block_count DESC`)
    ]);
    return { epochTrend: epochTrend.rows, adaPots: pots.rows, wealthStats: wealth.rows[0] || {}, blockVersions: blockVersions.rows };
  });
  return c.json(data);
});

// --- Explorer: Addresses (rich list + whales) ---
app.get("/explorer/addresses", async (c) => {
  const data = await cached("exp:addresses", 120, async () => {
    const [richList, topStakers] = await Promise.all([
      pool.query(`SELECT tao.address, SUM(tao.value)::text as balance
        FROM tx_out tao
        LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
        WHERE ti.id IS NULL
        GROUP BY tao.address
        ORDER BY SUM(tao.value) DESC LIMIT 50`),
      pool.query(`SELECT sa.view as stake_address,
        es.amount::text,
        ph.view as pool_id,
        pod.json->>'name' as pool_name
        FROM epoch_stake es
        JOIN stake_address sa ON sa.id = es.addr_id
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (SELECT MAX(d2.id) FROM delegation d2 WHERE d2.addr_id = sa.id)
        LEFT JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN off_chain_pool_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM off_chain_pool_data pod2 WHERE pod2.pool_id = ph.id)
        WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
        ORDER BY es.amount DESC LIMIT 50`)
    ]);
    return { richList: richList.rows, topStakers: topStakers.rows };
  });
  return c.json(data);
});
'''

# ============================================================
# FRONTEND PAGES
# ============================================================
PAGES = {}

# --- Explorer Index ---
PAGES["explorer/page.tsx"] = r'''import Link from "next/link";

export const dynamic = "force-dynamic";

const sections = [
  { href: "/explorer/chain", icon: "⛓️", title: "Chain", desc: "Latest blocks, transactions, and epoch history" },
  { href: "/explorer/staking", icon: "🥩", title: "Staking", desc: "Stake pools, delegations, distribution, and rewards" },
  { href: "/explorer/governance", icon: "🏛️", title: "Governance", desc: "Proposals, DReps, committee, votes, and constitution" },
  { href: "/explorer/tokens", icon: "🪙", title: "Tokens", desc: "Native tokens and recent mints" },
  { href: "/explorer/analytics", icon: "📊", title: "Analytics", desc: "Network trends, ADA pots, wealth distribution" },
  { href: "/explorer/addresses", icon: "📋", title: "Addresses", desc: "Rich list, top stakers, and whale tracking" },
];

export default function ExplorerIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Explorer</h1>
        <p className="text-gray-400 mt-2">Browse Cardano blockchain data by category</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s, i) => (
          <Link key={i} href={s.href} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 hover:bg-gray-800/80 transition">
            <span className="text-3xl">{s.icon}</span>
            <h2 className="text-lg font-bold mt-3">{s.title}</h2>
            <p className="text-gray-400 text-sm mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
'''

# --- Chain Explorer (client-side for instant load) ---
PAGES["explorer/chain/page.tsx"] = r'''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const timeAgo = (t: string) => { const s = (Date.now() - new Date(t).getTime())/1000; if(s<60) return `${Math.floor(s)}s`; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const truncHash = (h: string, n=8) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse"/>)}</div>; }

export default function ChainExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/chain`).then(r=>r.json()).then(setData).catch(()=>setErr(true)); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chain Explorer</h1>
      {err && <div className="p-8 text-center text-gray-400">Failed to load</div>}
      {!data && !err && <Skeleton/>}
      {data && <>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Epochs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Epoch</th><th className="text-left py-2">Started</th>
              <th className="text-right py-2">Blocks</th><th className="text-right py-2">Fees</th>
            </tr></thead>
            <tbody>{(data.epochs||[]).map((e: any) => (
              <tr key={e.no} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2"><Link href={`/epoch/${e.no}`} className="text-blue-400 hover:underline font-bold">{e.no}</Link></td>
                <td className="py-2 text-gray-400">{e.start_time ? timeAgo(e.start_time) : "\u2014"}</td>
                <td className="py-2 text-right">{Number(e.blocks).toLocaleString()}</td>
                <td className="py-2 text-right">{fmtAda(e.fees)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Latest Blocks</h2>
          <div className="space-y-2">
            {(data.latestBlocks||[]).slice(0,15).map((b: any) => (
              <div key={b.block_no} className="flex justify-between items-center py-2 border-b border-gray-700/30 text-sm">
                <div>
                  <Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline font-mono">#{b.block_no}</Link>
                  <span className="text-gray-500 ml-2 text-xs">{b.pool_id ? b.pool_id.slice(0,15) : ""}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">{b.tx_count} txs</span>
                  <span className="text-gray-500 ml-2 text-xs">{b.time ? timeAgo(b.time) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Latest Transactions</h2>
          <div className="space-y-2">
            {(data.latestTxs||[]).slice(0,15).map((tx: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700/30 text-sm">
                <div>
                  <Link href={`/tx/${tx.hash}`} className="text-blue-400 hover:underline font-mono text-xs">{truncHash(tx.hash, 10)}</Link>
                  <span className="text-gray-500 ml-2 text-xs">Blk #{tx.block_no}</span>
                </div>
                <div className="text-right">
                  <span>{fmtAda(tx.out_sum)} ADA</span>
                  <span className="text-gray-500 ml-2 text-xs">{tx.time ? timeAgo(tx.time) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>}
    </div>
  );
}
'''

# --- Staking Explorer (client-side for instant load) ---
PAGES["explorer/staking/page.tsx"] = r'''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const timeAgo = (t: string) => { const s = (Date.now() - new Date(t).getTime())/1000; if(s<60) return `${Math.floor(s)}s`; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const truncHash = (h: string, n=8) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";
const compact = (n: number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:n.toString();

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse"/>)}</div>; }

export default function StakingExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/staking`).then(r=>r.json()).then(setData).catch(()=>setErr(true)); }, []);

  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staking Explorer</h1>
      {!data ? <Skeleton/> : <>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Staked", value: fmtAda(data.stats?.total_staked||0)+" ADA", color: "text-green-400" },
          { label: "Stakers", value: compact(Number(data.stats?.total_stakers||0)), color: "text-blue-400" },
          { label: "Active Pools", value: Number(data.stats?.active_pools||0).toLocaleString(), color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 text-center">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Stake Distribution</h2>
        <div className="space-y-2">
          {(data.stakeDistribution||[]).map((b: any, i: number) => {
            const maxTotal = Math.max(...(data.stakeDistribution||[]).map((x: any) => Number(x.total)));
            const pct = maxTotal > 0 ? (Number(b.total)/maxTotal)*100 : 0;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-gray-400">{b.bucket}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                  <div className="bg-green-500/60 h-full rounded-full flex items-center px-2" style={{width:`${Math.max(pct,3)}%`}}>
                    <span className="text-xs whitespace-nowrap">{fmtAda(b.total)} ADA</span>
                  </div>
                </div>
                <span className="text-gray-400 w-16 text-right text-xs">{Number(b.cnt).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top Pools by Stake</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Pool</th><th className="text-right py-2">Stake</th>
              <th className="text-right py-2">Delegators</th><th className="text-right py-2">Margin</th>
            </tr></thead>
            <tbody>{(data.pools||[]).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2"><Link href={`/pool/${p.pool_id}`} className="text-blue-400 hover:underline">{p.ticker || p.name || p.pool_id?.slice(0,20)}</Link></td>
                <td className="py-2 text-right">{fmtAda(p.stake)} ADA</td>
                <td className="py-2 text-right">{Number(p.delegators).toLocaleString()}</td>
                <td className="py-2 text-right">{(Number(p.margin)*100).toFixed(2)}%</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Delegations</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Stake Address</th><th className="text-left py-2">Pool</th>
            <th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{(data.recentDelegations||[]).map((d: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 font-mono text-xs">{truncHash(d.stake_addr,10)}</td>
              <td className="py-2"><Link href={`/pool/${d.pool_id}`} className="text-blue-400 hover:underline text-xs">{d.pool_name || d.pool_id?.slice(0,20)}</Link></td>
              <td className="py-2 text-right text-gray-400 text-xs">{d.time ? timeAgo(d.time) : "\u2014"}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  );
}
'''

# --- Governance Explorer (client-side) ---
PAGES["explorer/governance/page.tsx"] = r'''"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const timeAgo = (t: string) => { const s = (Date.now() - new Date(t).getTime())/1000; if(s<60) return `${Math.floor(s)}s`; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const truncHash = (h: string, n=8) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse"/>)}</div>; }

export default function GovernanceExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/governance`).then(r=>r.json()).then(setData).catch(()=>setErr(true)); }, []);

  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  const pp = data?.protocolParams || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Governance Explorer</h1>
      {!data ? <Skeleton/> : <>
      {data.constitution && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Constitution</h2>
          <div className="text-sm">
            {data.constitution.url && <p><span className="text-gray-400">URL: </span><a href={data.constitution.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{data.constitution.url}</a></p>}
            {data.constitution.script_hash && <p className="mt-1"><span className="text-gray-400">Script: </span><span className="font-mono text-xs">{data.constitution.script_hash}</span></p>}
          </div>
        </div>
      )}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Protocol Parameters (Epoch {pp.epoch_no})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-400">Key Deposit</span><p>{fmtAda(pp.key_deposit||0)} ADA</p></div>
          <div><span className="text-gray-400">Pool Deposit</span><p>{fmtAda(pp.pool_deposit||0)} ADA</p></div>
          <div><span className="text-gray-400">Min Pool Cost</span><p>{fmtAda(pp.min_pool_cost||0)} ADA</p></div>
          <div><span className="text-gray-400">Optimal Pools (k)</span><p>{pp.optimal_pool_count}</p></div>
          <div><span className="text-gray-400">Monetary Expansion</span><p>{(Number(pp.monetary_expand_rate||0)*100).toFixed(3)}%</p></div>
          <div><span className="text-gray-400">Treasury Growth</span><p>{(Number(pp.treasury_growth_rate||0)*100).toFixed(1)}%</p></div>
          <div><span className="text-gray-400">Protocol</span><p>v{pp.protocol_major}.{pp.protocol_minor}</p></div>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Constitutional Committee ({data.committee?.length || 0} members)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Credential Hash</th><th className="text-left py-2">Type</th><th className="text-right py-2">Expires</th>
            </tr></thead>
            <tbody>{(data.committee||[]).map((m: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 font-mono text-xs">{truncHash(m.cred_hash, 12)}</td>
                <td className="py-2">{m.has_script ? <span className="text-yellow-400 text-xs">Script</span> : <span className="text-gray-400 text-xs">Key</span>}</td>
                <td className="py-2 text-right">{m.expiration_epoch ? `Epoch ${m.expiration_epoch}` : "\u2014"}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Governance Proposals</h2>
        <div className="space-y-3">
          {(data.proposals||[]).map((p: any, i: number) => {
            const status = p.enacted_epoch?"Enacted":p.ratified_epoch?"Ratified":p.dropped_epoch?"Dropped":p.expired_epoch?"Expired":"Active";
            const sc = status==="Enacted"?"bg-green-600/30 text-green-300":status==="Active"?"bg-yellow-600/30 text-yellow-300":status==="Ratified"?"bg-blue-600/30 text-blue-300":"bg-red-600/30 text-red-300";
            return (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${sc}`}>{status}</span>
                    <span className="bg-gray-600/50 text-gray-300 px-2 py-0.5 rounded text-xs">{p.type}</span>
                    <span className="font-mono text-xs text-gray-400">{truncHash(p.tx_hash)}#{p.index}</span>
                  </div>
                  <div className="text-xs text-gray-400"><span>{p.vote_count} votes</span><span className="ml-2">{p.time ? timeAgo(p.time) : ""}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">DReps by Delegations</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">#</th><th className="text-left py-2">DRep</th>
            <th className="text-left py-2">Type</th><th className="text-right py-2">Delegations</th>
          </tr></thead>
          <tbody>{(data.dreps||[]).map((d: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-gray-400">{i+1}</td>
              <td className="py-2 font-mono text-xs">{d.view || truncHash(d.drep_hash)}</td>
              <td className="py-2">{d.has_script ? <span className="text-yellow-400 text-xs">Script</span> : <span className="text-gray-400 text-xs">Key</span>}</td>
              <td className="py-2 text-right font-bold">{Number(d.delegations).toLocaleString()}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Votes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Proposal</th><th className="text-left py-2">Voter</th>
            <th className="text-left py-2">Role</th><th className="text-left py-2">Vote</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{(data.recentVotes||[]).map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-xs">{v.proposal_type}</td>
              <td className="py-2 font-mono text-xs">{truncHash(v.voter_id||"")}</td>
              <td className="py-2"><span className="px-1 py-0.5 rounded text-xs bg-gray-600/50">{v.voter_role}</span></td>
              <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.vote==='Yes'?'bg-green-600/30 text-green-300':v.vote==='No'?'bg-red-600/30 text-red-300':'bg-gray-600/30'}`}>{v.vote}</span></td>
              <td className="py-2 text-right text-gray-400 text-xs">{v.time ? timeAgo(v.time) : ""}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  );
}
'''

# --- Tokens Explorer (client-side) ---
PAGES["explorer/tokens/page.tsx"] = r'''"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const timeAgo = (t: string) => { const s = (Date.now() - new Date(t).getTime())/1000; if(s<60) return `${Math.floor(s)}s`; if(s<3600) return `${Math.floor(s/60)}m`; if(s<86400) return `${Math.floor(s/3600)}h`; return `${Math.floor(s/86400)}d`; };
const truncHash = (h: string, n=8) => h ? h.slice(0,n)+"..."+h.slice(-4) : "";

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse"/>)}</div>; }

export default function TokensExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/tokens`).then(r=>r.json()).then(setData).catch(()=>setErr(true)); }, []);

  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tokens Explorer</h1>
      {!data ? <Skeleton/> : <>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Mints</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Token</th><th className="text-left py-2">Policy</th>
              <th className="text-right py-2">Quantity</th><th className="text-right py-2">Time</th>
            </tr></thead>
            <tbody>{(data.recentMints||[]).map((m: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2">{m.fingerprint ? <Link href={`/token/${m.fingerprint}`} className="text-blue-400 hover:underline font-mono text-xs">{m.fingerprint}</Link> : <span className="font-mono text-xs">{truncHash(m.name_hex)}</span>}</td>
                <td className="py-2 font-mono text-xs text-gray-400">{truncHash(m.policy)}</td>
                <td className="py-2 text-right">{Number(m.quantity).toLocaleString()}</td>
                <td className="py-2 text-right text-gray-400 text-xs">{m.time ? timeAgo(m.time) : ""}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Tokens</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Fingerprint</th><th className="text-left py-2">Policy</th>
              <th className="text-right py-2">Supply</th>
            </tr></thead>
            <tbody>{(data.tokens||[]).map((t: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2">{t.fingerprint ? <Link href={`/token/${t.fingerprint}`} className="text-blue-400 hover:underline font-mono text-xs">{t.fingerprint}</Link> : <span className="font-mono text-xs">{truncHash(t.name_hex)}</span>}</td>
                <td className="py-2 font-mono text-xs text-gray-400">{truncHash(t.policy)}</td>
                <td className="py-2 text-right">{Number(t.supply).toLocaleString()}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
}
'''

# --- Analytics Explorer (client-side) ---
PAGES["explorer/analytics/page.tsx"] = r'''"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});

function Skeleton() { return <div className="space-y-4">{[1,2,3,4,5].map(i=><div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse"/>)}</div>; }

export default function AnalyticsExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { fetch(`${API}/explorer/analytics`).then(r=>r.json()).then(setData).catch(()=>setErr(true)); }, []);
  if (err) return <div className="p-8 text-center text-gray-400">Failed to load</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics Explorer</h1>
      {!data ? <Skeleton/> : <>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Top 100 Addresses</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Count</span><p className="font-bold">{data.wealthStats?.count}</p></div>
          <div><span className="text-gray-400">Total Held</span><p className="font-bold text-green-400">{fmtAda(data.wealthStats?.total||0)} ADA</p></div>
          <div><span className="text-gray-400">Min Balance</span><p>{fmtAda(data.wealthStats?.min_bal||0)} ADA</p></div>
          <div><span className="text-gray-400">Max Balance</span><p>{fmtAda(data.wealthStats?.max_bal||0)} ADA</p></div>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">Block Versions (Current Epoch)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Version</th><th className="text-right py-2">Blocks</th></tr></thead>
          <tbody>{(data.blockVersions||[]).map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50"><td className="py-2">v{v.proto_major}.{v.proto_minor}</td><td className="py-2 text-right">{Number(v.block_count).toLocaleString()}</td></tr>))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Epoch Trend</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Epoch</th><th className="text-right py-2">Blocks</th><th className="text-right py-2">Transactions</th><th className="text-right py-2">Total Fees</th></tr></thead>
            <tbody>{(data.epochTrend||[]).map((e: any) => (
              <tr key={e.no} className="border-b border-gray-700/50 hover:bg-gray-700/30"><td className="py-2 font-bold">{e.no}</td><td className="py-2 text-right">{Number(e.blocks).toLocaleString()}</td><td className="py-2 text-right">{Number(e.tx_count).toLocaleString()}</td><td className="py-2 text-right">{fmtAda(e.total_fees)} ADA</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">ADA Pots</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700"><th className="text-left py-2">Epoch</th><th className="text-right py-2">Treasury</th><th className="text-right py-2">Reserves</th><th className="text-right py-2">Rewards</th><th className="text-right py-2">UTxO</th></tr></thead>
            <tbody>{(data.adaPots||[]).map((p: any) => (
              <tr key={p.epoch_no} className="border-b border-gray-700/50 hover:bg-gray-700/30"><td className="py-2">{p.epoch_no}</td><td className="py-2 text-right">{fmtAda(p.treasury)} ADA</td><td className="py-2 text-right">{fmtAda(p.reserves)} ADA</td><td className="py-2 text-right">{fmtAda(p.rewards)} ADA</td><td className="py-2 text-right">{fmtAda(p.utxo)} ADA</td></tr>))}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
}
'''

# --- Addresses Explorer (Unified Rich List, summary-first, client-side) ---
PAGES["explorer/addresses/page.tsx"] = r'''"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "adatool.net" ? `${window.location.protocol}//${window.location.hostname}:3001` : "https://adatool.net/api");
const fmtAda = (v: any) => (Number(v||0)/1e6).toLocaleString(undefined, {maximumFractionDigits:0});
const truncAddr = (h: string, n=12) => h ? h.slice(0,n)+"..."+h.slice(-6) : "";
const timeAgo = (t: string) => { if(!t) return "-"; const s=(Date.now()-new Date(t).getTime())/1000; if(s<60)return `${Math.floor(s)}s ago`; if(s<3600)return `${Math.floor(s/60)}m ago`; if(s<86400)return `${Math.floor(s/3600)}h ago`; if(s<2592000)return `${Math.floor(s/86400)}d ago`; return `${(s/31536000).toFixed(1)}y ago`; };

type Filter = "all" | "stake" | "byron" | "enterprise";

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  stake: { label: "Staking", color: "bg-blue-500/20 text-blue-400", icon: "🥩" },
  byron: { label: "Byron", color: "bg-amber-500/20 text-amber-400", icon: "🏛" },
  enterprise: { label: "Enterprise", color: "bg-purple-500/20 text-purple-400", icon: "🏢" },
};

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className="h-14 bg-gray-700/30 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700/50">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-base font-bold">{value}</div>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
    </div>
  );
}

export default function AddressesExplorer() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [showExchange, setShowExchange] = useState<"all"|"exchange"|"non-exchange">("all");
  const [search, setSearch] = useState("");
  // expandedRow removed — replaced by showAll toggle

  useEffect(() => {
    fetch(`${API}/richlist-v2?limit=300`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr(true));
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
      {!data && !err && <Skeleton/>}

      {data && <>
        {/* ══════════ ABOVE THE FOLD ══════════ */}
        {/* Summary row (compact) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SummaryCard label="Entries" value={s.total_entries.toLocaleString()} sub={`${fmtAda(s.total_balance)} ADA`} />
          <SummaryCard label="Staking" value={`${s.by_type.stake.count}`} sub={`${fmtAda(s.by_type.stake.balance)} ADA`} />
          <SummaryCard label="Exchange" value={`${s.exchange.count}`} sub={`${fmtAda(s.exchange.balance)} ADA`} />
          <SummaryCard label="Likely Lost" value={`${s.likely_lost.count}`} sub={`${fmtAda(s.likely_lost.balance)} ADA`} />
        </div>

        {/* Filters (compact row) */}
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
                {f === "all" ? "All" : f === "exchange" ? "🏦" : "👤"}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setShowAll(false); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 w-36 focus:outline-none focus:border-blue-500" />
          <span className="text-[10px] text-gray-600 ml-auto">{filtered.length} results</span>
        </div>

        {/* Top 10 compact table (above fold) */}
        <div className="bg-gray-800 rounded-xl border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 text-[10px] border-b border-gray-700">
                  <th className="text-left py-2 px-3 w-8">#</th>
                  <th className="text-left py-2 px-1">Type</th>
                  <th className="text-left py-2 px-1">Address</th>
                  <th className="text-right py-2 px-1">Balance</th>
                  <th className="text-right py-2 px-1 hidden md:table-cell">TXs</th>
                  <th className="text-right py-2 px-1 hidden lg:table-cell">Active</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">Flag</th>
                </tr>
              </thead>
              <tbody>
                {display.map((e: any, idx: number) => {
                  const t = TYPE_LABELS[e.addr_type] || { label: e.addr_type, color: "bg-gray-500/20 text-gray-400", icon: "?" };
                  return (
                    <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-700/20">
                      <td className="py-1.5 px-3 text-gray-500">{e.rank}</td>
                      <td className="py-1.5 px-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.color}`}>{t.label}</span>
                      </td>
                      <td className="py-1.5 px-1">
                        <Link href={`/address/${e.identifier}`} className="text-blue-400 hover:underline font-mono">{truncAddr(e.identifier, 14)}</Link>
                        {e.pool && <span className="text-gray-500 ml-1 text-[10px]">{e.pool.pool_ticker || ""}</span>}
                        <div className="flex gap-0.5 md:hidden mt-0.5">
                          {e.is_exchange && <span className="text-[9px] px-1 bg-yellow-500/20 text-yellow-400 rounded">🏦</span>}
                          {e.is_likely_lost && <span className="text-[9px] px-1 bg-red-500/20 text-red-400 rounded">💀</span>}
                        </div>
                      </td>
                      <td className="py-1.5 px-1 text-right font-bold whitespace-nowrap">{fmtAda(e.balance)}</td>
                      <td className="py-1.5 px-1 text-right text-gray-400 hidden md:table-cell">{(e.tx_count||0).toLocaleString()}</td>
                      <td className="py-1.5 px-1 text-right text-gray-500 hidden lg:table-cell">{timeAgo(e.last_tx)}</td>
                      <td className="py-1.5 px-2 text-center hidden md:table-cell">
                        {e.is_exchange && <span title={e.exchange_reason} className="text-yellow-400">🏦</span>}
                        {e.is_likely_lost && <span title={e.lost_reason} className="text-red-400 ml-0.5">💀</span>}
                        {!e.is_exchange && !e.is_likely_lost && <span className="text-gray-700">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Expand / Collapse toggle */}
          {filtered.length > 10 && (
            <button onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-center text-xs text-blue-400 hover:bg-gray-700/30 transition border-t border-gray-700/50">
              {showAll ? `Show Top 10 ▲` : `Show All ${filtered.length} ▼`}
            </button>
          )}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-xs">No entries match filters</div>
          )}
        </div>
      </>}
    </div>
  );
}
'''

# ============================================================
# UPDATED HEADER - Dashboards primary, Explorer consolidated
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
  { section: "Chain", items: [
    { href: "/explorer/chain", label: "Blocks & Transactions" },
  ]},
  { section: "Staking", items: [
    { href: "/explorer/staking", label: "Pools & Delegations" },
  ]},
  { section: "Governance", items: [
    { href: "/explorer/governance", label: "Proposals & Votes" },
  ]},
  { section: "Assets", items: [
    { href: "/explorer/tokens", label: "Tokens & Mints" },
  ]},
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
          <span className="text-blue-400">ADA</span>tool
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Dashboards dropdown */}
          <div className="relative" onMouseEnter={() => setOpen("dash")} onMouseLeave={() => setOpen(null)}>
            <button className={`px-3 py-2 text-sm rounded transition ${isDash ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              Dashboards <span className="text-xs opacity-50">▾</span>
            </button>
            {open === "dash" && (
              <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] z-50">
                {DASHBOARDS.map(d => (
                  <Link key={d.href} href={d.href}
                    className={`block px-4 py-2 text-sm transition ${pathname===d.href ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    onClick={() => setOpen(null)}>
                    {d.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Explorer dropdown */}
          <div className="relative" onMouseEnter={() => setOpen("expl")} onMouseLeave={() => setOpen(null)}>
            <button className={`px-3 py-2 text-sm rounded transition ${isExpl ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              Explorer <span className="text-xs opacity-50">▾</span>
            </button>
            {open === "expl" && (
              <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[220px] z-50">
                <Link href="/explorer" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition" onClick={() => setOpen(null)}>
                  Overview
                </Link>
                {EXPLORER.map(group => (
                  <div key={group.section}>
                    <div className="px-4 pt-2 pb-1 text-xs font-bold text-gray-500 uppercase">{group.section}</div>
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href}
                        className={`block px-4 py-2 text-sm transition ${pathname===item.href ? 'text-blue-400 bg-gray-700/50' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        onClick={() => setOpen(null)}>
                        {item.label}
                      </Link>
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

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
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
            <Link href="/explorer" className="block px-6 py-2 text-sm text-gray-300 hover:bg-gray-800" onClick={() => setMobileOpen(false)}>Overview</Link>
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
    # Also write to src/components/Header.tsx for compatibility
    header_alt = os.path.join(PROJECT, "src/components/Header.tsx")
    shutil.copy2(header_path, header_alt)
    log("  Header updated: Dashboards primary, Explorer consolidated (both paths)")

    # Step 4: Restart API
    info("Step 4: Restarting API...")
    run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
    time.sleep(5)
    code, out, _ = run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/explorer/chain --max-time 15")
    log(f"  API /explorer/chain => {out.strip()}")

    # Step 5: Build frontend
    info("Step 5: Building frontend...")
    # Skip .next deletion for incremental build (much faster)
    # dotNext = os.path.join(PROJECT, ".next")
    # if os.path.isdir(dotNext):
    #     shutil.rmtree(dotNext)
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
