#!/usr/bin/env python3
"""
Persona-Based Dashboard Implementation for adatool.net
Creates 8 persona dashboards with aggregated API endpoints + frontend pages.

Personas:
1. ADA Holder (delegator) - /dashboard/holder
2. SPO (Stake Pool Operator) - /dashboard/spo
3. CC (Constitutional Committee) - /dashboard/cc
4. DRep - /dashboard/drep
5. Governance Analyst - /dashboard/governance
6. Chain Analyst - /dashboard/chain
7. Portfolio Tracker - /dashboard/portfolio
8. Developer - /dashboard/developer

Run on server: python3 implement-persona-dashboards.py
"""
import os, sys, re, shutil, subprocess, time
from pathlib import Path

PROJECT = "/home/ubuntu/adatool-frontend"
API_FILE = "/home/ubuntu/adatool-api/src/index.js"
G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"

def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

def run(cmd, cwd=None):
    r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr

# ============================================================
# PART 1: New API Endpoints for Persona Dashboards
# ============================================================

NEW_API_ENDPOINTS = r'''
// ============================================================
// PERSONA DASHBOARD ENDPOINTS
// ============================================================

// --- Holder Dashboard ---
app.get("/dashboard/holder", async (c) => {
  const data = await cached("dash:holder", 30, async () => {
    const [epoch, params, stats, topPools] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time, e.end_time,
        (SELECT MAX(block_no) FROM block WHERE epoch_no = e.no) as blocks,
        (SELECT COUNT(*) FROM tx WHERE block_id IN (SELECT id FROM block WHERE epoch_no = e.no)) as tx_count
        FROM epoch e ORDER BY e.no DESC LIMIT 1`),
      pool.query(`SELECT min_fee_a, min_fee_b, key_deposit, pool_deposit,
        max_epoch, optimal_pool_count, min_pool_cost,
        monetary_expand_rate, treasury_growth_rate, decentralisation, protocol_major
        FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`),
      pool.query(`SELECT
        (SELECT COALESCE(SUM(amount),0)::text FROM epoch_stake WHERE epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_staked,
        (SELECT COUNT(DISTINCT addr_id) FROM epoch_stake WHERE epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_stakers,
        (SELECT COUNT(*) FROM pool_hash ph JOIN pool_update pu ON pu.hash_id = ph.id WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))) as active_pools,
        (SELECT treasury FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as treasury,
        (SELECT reserves FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as reserves`),
      pool.query(`SELECT ph.view as pool_id, pod.json->>'name' as name,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        (SELECT COUNT(*) FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators,
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update WHERE hash_id = ph.id ORDER BY registered_tx_id DESC LIMIT 1)
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
        WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))
        ORDER BY stake DESC LIMIT 10`)
    ]);
    const ep = epoch.rows[0] || {};
    const slotInEpoch = ep.end_time && ep.start_time ?
      Math.min(100, Math.max(0, ((Date.now() - new Date(ep.start_time).getTime()) / (new Date(ep.end_time).getTime() - new Date(ep.start_time).getTime())) * 100)).toFixed(1) : "0";
    return {
      currentEpoch: { ...ep, progress: slotInEpoch },
      protocolParams: params.rows[0] || {},
      networkStats: stats.rows[0] || {},
      topPools: topPools.rows
    };
  });
  return c.json(data);
});

// --- SPO Dashboard ---
app.get("/dashboard/spo/:poolHash", async (c) => {
  const ph = c.req.param("poolHash");
  const data = await cached(`dash:spo:${ph}`, 30, async () => {
    const [info, delegators, blocks, rewards, updates] = await Promise.all([
      pool.query(`SELECT ph.view as pool_id, ph.hash_raw,
        pod.json->>'name' as name, pod.json->>'ticker' as ticker, pod.json->>'homepage' as homepage,
        pod.json->>'description' as description,
        pu.pledge::text, pu.margin, pu.fixed_cost::text, pu.vrf_key_hash,
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as live_stake,
        (SELECT COUNT(*) FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegator_count,
        (SELECT COUNT(*) FROM block b WHERE b.slot_leader_id IN (SELECT sl.id FROM slot_leader sl WHERE sl.pool_hash_id = ph.id)) as lifetime_blocks
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update WHERE hash_id = ph.id ORDER BY registered_tx_id DESC LIMIT 1)
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
        WHERE ph.view = $1`, [ph]),
      pool.query(`SELECT sa.view as stake_addr, es.amount::text
        FROM epoch_stake es
        JOIN stake_address sa ON sa.id = es.addr_id
        WHERE es.pool_id = (SELECT id FROM pool_hash WHERE view = $1)
        AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
        ORDER BY es.amount DESC LIMIT 20`, [ph]),
      pool.query(`SELECT b.block_no, b.epoch_no, b.slot_no, b.time, b.size, b.tx_count,
        encode(b.hash,'hex') as hash
        FROM block b
        JOIN slot_leader sl ON sl.id = b.slot_leader_id
        JOIN pool_hash ph ON ph.id = sl.pool_hash_id
        WHERE ph.view = $1
        ORDER BY b.block_no DESC LIMIT 20`, [ph]),
      pool.query(`SELECT r.earned_epoch, r.amount::text, r.type
        FROM reward r
        JOIN stake_address sa ON sa.id = r.addr_id
        JOIN pool_hash ph ON ph.id = r.pool_id
        WHERE ph.view = $1
        ORDER BY r.earned_epoch DESC LIMIT 20`, [ph]),
      pool.query(`SELECT pu.registered_tx_id, t.hash, pu.pledge::text, pu.margin, pu.fixed_cost::text,
        b.time, b.epoch_no
        FROM pool_update pu
        JOIN pool_hash ph ON ph.id = pu.hash_id
        JOIN tx t ON t.id = pu.registered_tx_id
        JOIN block b ON b.id = t.block_id
        WHERE ph.view = $1
        ORDER BY pu.registered_tx_id DESC LIMIT 10`, [ph])
    ]);
    return {
      pool: info.rows[0] || null,
      delegators: delegators.rows,
      recentBlocks: blocks.rows,
      rewards: rewards.rows,
      updates: updates.rows
    };
  });
  return c.json(data);
});

// --- CC Dashboard ---
app.get("/dashboard/cc", async (c) => {
  const data = await cached("dash:cc", 60, async () => {
    const [members, proposals, votes, constitution] = await Promise.all([
      pool.query(`SELECT encode(cm.hot_cred,'hex') as hot_cred, encode(cm.cold_cred,'hex') as cold_cred,
        cm.status, cm.expiration_epoch
        FROM committee_member cm
        ORDER BY cm.expiration_epoch DESC NULLS LAST`),
      pool.query(`SELECT encode(gp.tx_hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.expiration, gp.voting_anchor_url,
        b.time, b.epoch_no,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id) as vote_count
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE gp.ratified_epoch IS NULL AND gp.enacted_epoch IS NULL AND gp.dropped_epoch IS NULL AND gp.expired_epoch IS NULL
        ORDER BY b.time DESC LIMIT 20`),
      pool.query(`SELECT encode(gp.tx_hash,'hex') as proposal_hash, gp.index as proposal_index,
        gp.type as proposal_type,
        vp.vote, encode(vp.voter_hash,'hex') as voter_hash, vp.voter_role,
        b.time, b.epoch_no
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE vp.voter_role = 'ConstitutionalCommittee'
        ORDER BY b.time DESC LIMIT 50`),
      pool.query(`SELECT encode(c.script_hash,'hex') as script_hash, c.url, c.doc_hash
        FROM constitution c ORDER BY id DESC LIMIT 1`)
    ]);
    return {
      members: members.rows,
      activeProposals: proposals.rows,
      recentVotes: votes.rows,
      constitution: constitution.rows[0] || null,
      stats: {
        totalMembers: members.rows.length,
        activeMembers: members.rows.filter(m => m.status === 'Active' || !m.status).length
      }
    };
  });
  return c.json(data);
});

// --- DRep Dashboard (with optional DRep hash) ---
app.get("/dashboard/drep", async (c) => {
  const data = await cached("dash:drep:overview", 60, async () => {
    const [topDreps, proposals, recentVotes, stats] = await Promise.all([
      pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view,
        dh.has_script,
        (SELECT COALESCE(SUM(amount),0)::text FROM delegation_vote dv
         JOIN stake_address sa ON sa.id = dv.addr_id
         JOIN epoch_stake es ON es.addr_id = sa.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)
         WHERE dv.drep_hash_id = dh.id) as voting_power,
        (SELECT COUNT(*) FROM delegation_vote dv WHERE dv.drep_hash_id = dh.id) as delegator_count
        FROM drep_hash dh
        ORDER BY delegator_count DESC LIMIT 20`),
      pool.query(`SELECT encode(gp.tx_hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.voting_anchor_url,
        b.time, b.epoch_no,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'DRep') as drep_votes
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE gp.ratified_epoch IS NULL AND gp.enacted_epoch IS NULL AND gp.dropped_epoch IS NULL AND gp.expired_epoch IS NULL
        ORDER BY b.time DESC LIMIT 15`),
      pool.query(`SELECT encode(gp.tx_hash,'hex') as proposal_hash, gp.type as proposal_type,
        vp.vote, encode(vp.voter_hash,'hex') as voter_hash,
        b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE vp.voter_role = 'DRep'
        ORDER BY b.time DESC LIMIT 30`),
      pool.query(`SELECT
        (SELECT COUNT(DISTINCT dh.id) FROM drep_hash dh) as total_dreps,
        (SELECT COUNT(*) FROM delegation_vote) as total_delegations,
        (SELECT COUNT(*) FROM gov_action_proposal WHERE ratified_epoch IS NULL AND enacted_epoch IS NULL AND dropped_epoch IS NULL AND expired_epoch IS NULL) as active_proposals,
        (SELECT COUNT(*) FROM voting_procedure WHERE voter_role = 'DRep') as total_drep_votes`)
    ]);
    return {
      topDreps: topDreps.rows,
      activeProposals: proposals.rows,
      recentVotes: recentVotes.rows,
      stats: stats.rows[0] || {}
    };
  });
  return c.json(data);
});

// --- Governance Analyst Dashboard ---
app.get("/dashboard/governance-analyst", async (c) => {
  const data = await cached("dash:gov-analyst", 120, async () => {
    const [proposals, voteBreakdown, drepActivity, epochVotes, paramChanges] = await Promise.all([
      pool.query(`SELECT encode(gp.tx_hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.voting_anchor_url,
        b.time, b.epoch_no,
        gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'DRep') as drep_votes,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'ConstitutionalCommittee') as cc_votes,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'SPO') as spo_votes
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        ORDER BY b.time DESC LIMIT 30`),
      pool.query(`SELECT gp.type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE gp.ratified_epoch IS NOT NULL) as ratified,
        COUNT(*) FILTER (WHERE gp.enacted_epoch IS NOT NULL) as enacted,
        COUNT(*) FILTER (WHERE gp.dropped_epoch IS NOT NULL) as dropped,
        COUNT(*) FILTER (WHERE gp.expired_epoch IS NOT NULL) as expired,
        COUNT(*) FILTER (WHERE gp.ratified_epoch IS NULL AND gp.enacted_epoch IS NULL AND gp.dropped_epoch IS NULL AND gp.expired_epoch IS NULL) as active
        FROM gov_action_proposal gp
        GROUP BY gp.type`),
      pool.query(`SELECT encode(vp.voter_hash,'hex') as drep_hash,
        COUNT(*) as vote_count,
        COUNT(*) FILTER (WHERE vp.vote = 'Yes') as yes_votes,
        COUNT(*) FILTER (WHERE vp.vote = 'No') as no_votes,
        COUNT(*) FILTER (WHERE vp.vote = 'Abstain') as abstain_votes,
        MAX(b.time) as last_vote_time
        FROM voting_procedure vp
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        WHERE vp.voter_role = 'DRep'
        GROUP BY vp.voter_hash
        ORDER BY vote_count DESC LIMIT 20`),
      pool.query(`SELECT b.epoch_no,
        COUNT(*) as vote_count,
        COUNT(DISTINCT vp.voter_hash) as unique_voters
        FROM voting_procedure vp
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        GROUP BY b.epoch_no
        ORDER BY b.epoch_no DESC LIMIT 20`),
      pool.query(`SELECT pp.epoch_no, pp.min_fee_a, pp.min_fee_b, pp.key_deposit::text,
        pp.pool_deposit::text, pp.optimal_pool_count, pp.protocol_major, pp.protocol_minor
        FROM epoch_param pp
        ORDER BY pp.epoch_no DESC LIMIT 10`)
    ]);
    return {
      proposals: proposals.rows,
      proposalBreakdown: voteBreakdown.rows,
      topDrepsByActivity: drepActivity.rows,
      votesPerEpoch: epochVotes.rows,
      paramHistory: paramChanges.rows
    };
  });
  return c.json(data);
});

// --- Chain Analyst Dashboard ---
app.get("/dashboard/chain-analyst", async (c) => {
  const data = await cached("dash:chain", 30, async () => {
    const [epochTrend, txStats, blockStats, feeStats, pots] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time, e.end_time,
        (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks,
        (SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as tx_count,
        (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as total_fees
        FROM epoch e ORDER BY e.no DESC LIMIT 10`),
      pool.query(`SELECT
        (SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time > NOW() - INTERVAL '24 hours') as tx_24h,
        (SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time > NOW() - INTERVAL '1 hour') as tx_1h,
        (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time > NOW() - INTERVAL '24 hours') as fees_24h,
        (SELECT COALESCE(AVG(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time > NOW() - INTERVAL '24 hours') as avg_fee_24h,
        (SELECT COALESCE(AVG(t.size),0)::numeric(10,0) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.time > NOW() - INTERVAL '24 hours') as avg_tx_size_24h`),
      pool.query(`SELECT
        (SELECT COUNT(*) FROM block WHERE time > NOW() - INTERVAL '24 hours') as blocks_24h,
        (SELECT COALESCE(AVG(size),0)::numeric(10,0) FROM block WHERE time > NOW() - INTERVAL '24 hours') as avg_block_size,
        (SELECT MAX(block_no) FROM block) as latest_block,
        (SELECT COALESCE(AVG(tx_count),0)::numeric(10,1) FROM block WHERE time > NOW() - INTERVAL '1 hour') as avg_tx_per_block`),
      pool.query(`SELECT
        b.epoch_no,
        COALESCE(SUM(t.fee),0)::text as total_fees,
        COUNT(t.id) as tx_count,
        COALESCE(AVG(t.fee),0)::text as avg_fee
        FROM block b
        JOIN tx t ON t.block_id = b.id
        WHERE b.epoch_no >= (SELECT MAX(no)-5 FROM epoch)
        GROUP BY b.epoch_no ORDER BY b.epoch_no`),
      pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
        utxo::text, deposits_stake::text, fees::text
        FROM ada_pots ORDER BY epoch_no DESC LIMIT 10`)
    ]);
    return {
      epochTrend: epochTrend.rows,
      txStats: txStats.rows[0] || {},
      blockStats: blockStats.rows[0] || {},
      feesByEpoch: feeStats.rows,
      adaPots: pots.rows
    };
  });
  return c.json(data);
});

// --- Portfolio Dashboard (address-based) ---
app.get("/dashboard/portfolio/:addr", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`dash:port:${addr}`, 30, async () => {
    const [addrInfo, tokens, stakeInfo, recentTxs, ranking] = await Promise.all([
      pool.query(`SELECT tao.address,
        COALESCE(SUM(tao.value),0)::text as balance
        FROM tx_out tao
        LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
        WHERE tao.address = $1 AND ti.id IS NULL
        GROUP BY tao.address`, [addr]),
      pool.query(`SELECT encode(ma.policy,'hex') as policy,
        encode(ma.name,'hex') as name_hex,
        ma.fingerprint,
        COALESCE(SUM(mto.quantity),0)::text as quantity
        FROM ma_tx_out mto
        JOIN multi_asset ma ON ma.id = mto.ident
        JOIN tx_out tao ON tao.id = mto.tx_out_id
        LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
        WHERE tao.address = $1 AND ti.id IS NULL
        GROUP BY ma.id, ma.policy, ma.name, ma.fingerprint
        ORDER BY quantity DESC LIMIT 50`, [addr]),
      pool.query(`SELECT sa.view as stake_address,
        ph.view as pool_id,
        pod.json->>'name' as pool_name,
        (SELECT COALESCE(SUM(r.amount),0)::text FROM reward r WHERE r.addr_id = sa.id) as total_rewards
        FROM tx_out tao
        JOIN stake_address sa ON sa.id = tao.stake_address_id
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (SELECT MAX(id) FROM delegation WHERE addr_id = sa.id)
        LEFT JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(id) FROM pool_offline_data WHERE pool_id = ph.id)
        WHERE tao.address = $1
        LIMIT 1`, [addr]),
      pool.query(`SELECT encode(t.hash,'hex') as hash, t.fee::text, t.out_sum::text,
        b.time, b.epoch_no, t.size
        FROM tx t
        JOIN block b ON b.id = t.block_id
        WHERE t.id IN (
          SELECT tao.tx_id FROM tx_out tao WHERE tao.address = $1
          UNION
          SELECT ti.tx_in_id FROM tx_in ti JOIN tx_out tao ON tao.tx_id = ti.tx_out_id AND tao.index = ti.tx_out_index WHERE tao.address = $1
        )
        ORDER BY b.time DESC LIMIT 20`, [addr]),
      pool.query(`SELECT COUNT(*) + 1 as rank FROM (
        SELECT tao.address, SUM(tao.value) as bal
        FROM tx_out tao
        LEFT JOIN tx_in ti ON ti.tx_out_id = tao.tx_id AND ti.tx_out_index = tao.index
        WHERE ti.id IS NULL
        GROUP BY tao.address
        HAVING SUM(tao.value) > (
          SELECT COALESCE(SUM(tao2.value),0)
          FROM tx_out tao2
          LEFT JOIN tx_in ti2 ON ti2.tx_out_id = tao2.tx_id AND ti2.tx_out_index = tao2.index
          WHERE tao2.address = $1 AND ti2.id IS NULL
        )
      ) sub`, [addr])
    ]);
    return {
      address: addrInfo.rows[0] || { address: addr, balance: "0" },
      tokens: tokens.rows,
      staking: stakeInfo.rows[0] || null,
      recentTransactions: recentTxs.rows,
      ranking: ranking.rows[0] || { rank: "N/A" }
    };
  });
  return c.json(data);
});

// --- Developer Dashboard ---
app.get("/dashboard/developer", async (c) => {
  const data = await cached("dash:dev", 60, async () => {
    const [scripts, recentContracts, protocolParams, dbStats] = await Promise.all([
      pool.query(`SELECT encode(s.hash,'hex') as hash, s.type, s.serialised_size,
        (SELECT COUNT(*) FROM redeemer r WHERE r.script_hash = s.hash) as usage_count
        FROM script s
        ORDER BY usage_count DESC LIMIT 20`),
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, b.time, b.epoch_no,
        t.fee::text, t.size, t.script_size,
        (SELECT COUNT(*) FROM redeemer r WHERE r.tx_id = t.id) as redeemer_count
        FROM tx t
        JOIN block b ON b.id = t.block_id
        WHERE t.script_size > 0
        ORDER BY b.time DESC LIMIT 20`),
      pool.query(`SELECT * FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`),
      pool.query(`SELECT
        (SELECT MAX(no) FROM epoch) as current_epoch,
        (SELECT MAX(block_no) FROM block) as latest_block,
        (SELECT COUNT(*) FROM tx) as total_txs,
        (SELECT COUNT(*) FROM script) as total_scripts,
        (SELECT COUNT(*) FROM multi_asset) as total_assets,
        (SELECT pg_size_pretty(pg_database_size('archive'))) as db_size`)
    ]);
    return {
      topScripts: scripts.rows,
      recentContractTxs: recentContracts.rows,
      protocolParams: protocolParams.rows[0] || {},
      dbStats: dbStats.rows[0] || {}
    };
  });
  return c.json(data);
});
'''

# ============================================================
# PART 2: Frontend Pages
# ============================================================

PAGES = {}

# --- Holder Dashboard ---
PAGES["dashboard/holder/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { lovelaceToAda, compactNumber, fmtAda } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HolderDashboard() {
  const data: any = await fetchAPI("/dashboard/holder");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { currentEpoch: ep, protocolParams: pp, networkStats: ns, topPools } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🪙</span>
        <div><h1 className="text-2xl font-bold">ADA Holder Dashboard</h1>
        <p className="text-gray-400 text-sm">Staking, rewards, and network overview for delegators</p></div>
      </div>

      {/* Epoch Progress */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Current Epoch</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><span className="text-gray-400">Epoch</span><p className="text-xl font-bold text-blue-400">{ep?.no}</p></div>
          <div><span className="text-gray-400">Blocks</span><p className="text-xl font-bold">{Number(ep?.blocks||0).toLocaleString()}</p></div>
          <div><span className="text-gray-400">Transactions</span><p className="text-xl font-bold">{Number(ep?.tx_count||0).toLocaleString()}</p></div>
          <div className="col-span-2"><span className="text-gray-400">Progress</span>
            <div className="mt-1 bg-gray-700 rounded-full h-4 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all" style={{width: `${ep?.progress||0}%`}}></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{ep?.progress}% complete</p>
          </div>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Staked", value: fmtAda(ns?.total_staked||0) + " ADA", color: "text-green-400" },
          { label: "Total Stakers", value: compactNumber(Number(ns?.total_stakers||0)), color: "text-blue-400" },
          { label: "Active Pools", value: Number(ns?.active_pools||0).toLocaleString(), color: "text-purple-400" },
          { label: "Treasury", value: fmtAda(ns?.treasury||0) + " ADA", color: "text-yellow-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Protocol Params */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Key Protocol Parameters</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400">Key Deposit</span><p>{lovelaceToAda(pp?.key_deposit||0)} ADA</p></div>
          <div><span className="text-gray-400">Pool Deposit</span><p>{lovelaceToAda(pp?.pool_deposit||0)} ADA</p></div>
          <div><span className="text-gray-400">Min Pool Cost</span><p>{lovelaceToAda(pp?.min_pool_cost||0)} ADA</p></div>
          <div><span className="text-gray-400">Optimal Pools</span><p>{pp?.optimal_pool_count}</p></div>
          <div><span className="text-gray-400">Monetary Expansion</span><p>{(Number(pp?.monetary_expand_rate||0)*100).toFixed(3)}%</p></div>
          <div><span className="text-gray-400">Treasury Growth</span><p>{(Number(pp?.treasury_growth_rate||0)*100).toFixed(1)}%</p></div>
          <div><span className="text-gray-400">Protocol</span><p>v{pp?.protocol_major}</p></div>
          <div><span className="text-gray-400">Reserves</span><p>{fmtAda(ns?.reserves||0)} ADA</p></div>
        </div>
      </div>

      {/* Top Pools */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top 10 Pools by Stake</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Pool</th>
              <th className="text-right py-2">Stake</th>
              <th className="text-right py-2">Delegators</th>
              <th className="text-right py-2">Margin</th>
              <th className="text-right py-2">Pledge</th>
            </tr></thead>
            <tbody>{(topPools||[]).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2"><Link href={`/pool/${p.pool_id}`} className="text-blue-400 hover:underline">{p.name || p.pool_id?.slice(0,20)}</Link></td>
                <td className="py-2 text-right">{fmtAda(p.stake)} ADA</td>
                <td className="py-2 text-right">{Number(p.delegators).toLocaleString()}</td>
                <td className="py-2 text-right">{(Number(p.margin)*100).toFixed(2)}%</td>
                <td className="py-2 text-right">{fmtAda(p.pledge)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/rewards-checker", label: "Check Rewards", icon: "🎁" },
            { href: "/pools", label: "Browse Pools", icon: "🏊" },
            { href: "/delegations", label: "Recent Delegations", icon: "📋" },
            { href: "/stake-distribution", label: "Stake Distribution", icon: "📊" },
          ].map((link, i) => (
            <Link key={i} href={link.href} className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition text-center">
              <span className="text-2xl">{link.icon}</span>
              <p className="text-sm mt-1">{link.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
'''

# --- SPO Dashboard ---
PAGES["dashboard/spo/page.tsx"] = r'''"use client";
import { useState } from "react";
import Link from "next/link";

function fmtAda(l: string|number) { const n = Number(l)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(2); }
function truncHash(h: string, l=8) { return h && h.length > l*2 ? h.slice(0,l)+"..."+h.slice(-l) : h||""; }
function timeAgo(d: string) { const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1) return "just now"; if(m<60) return m+"m ago"; const h=Math.floor(m/60); if(h<24) return h+"h ago"; return Math.floor(h/24)+"d ago"; }

export default function SPODashboard() {
  const [poolId, setPoolId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!poolId.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/spo/${poolId.trim()}`);
      const d = await res.json();
      if (!d.pool) { setError("Pool not found"); setData(null); }
      else setData(d);
    } catch { setError("Failed to fetch"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏊</span>
        <div><h1 className="text-2xl font-bold">SPO Dashboard</h1>
        <p className="text-gray-400 text-sm">Pool performance, delegators, blocks, and rewards</p></div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <label className="text-sm text-gray-400 block mb-2">Enter Pool ID (pool1...)</label>
        <div className="flex gap-2">
          <input value={poolId} onChange={e => setPoolId(e.target.value)} onKeyDown={e => e.key==="Enter" && lookup()}
            placeholder="pool1..." className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={lookup} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {data && data.pool && (
        <>
          {/* Pool Info */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold">{data.pool.name || data.pool.ticker || truncHash(data.pool.pool_id)}</h2>
              {data.pool.ticker && <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs">{data.pool.ticker}</span>}
            </div>
            {data.pool.description && <p className="text-gray-400 text-sm mb-4">{data.pool.description}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-400">Live Stake</span><p className="text-lg font-bold text-green-400">{fmtAda(data.pool.live_stake)} ADA</p></div>
              <div><span className="text-gray-400">Delegators</span><p className="text-lg font-bold text-blue-400">{Number(data.pool.delegator_count).toLocaleString()}</p></div>
              <div><span className="text-gray-400">Lifetime Blocks</span><p className="text-lg font-bold text-purple-400">{Number(data.pool.lifetime_blocks).toLocaleString()}</p></div>
              <div><span className="text-gray-400">Margin</span><p className="text-lg font-bold">{(Number(data.pool.margin)*100).toFixed(2)}%</p></div>
              <div><span className="text-gray-400">Pledge</span><p>{fmtAda(data.pool.pledge)} ADA</p></div>
              <div><span className="text-gray-400">Fixed Cost</span><p>{fmtAda(data.pool.fixed_cost)} ADA</p></div>
              {data.pool.homepage && <div className="col-span-2"><span className="text-gray-400">Homepage</span><p className="text-blue-400 truncate">{data.pool.homepage}</p></div>}
            </div>
          </div>

          {/* Recent Blocks */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Blocks ({data.recentBlocks?.length || 0})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Block</th><th className="text-left py-2">Epoch</th>
                  <th className="text-left py-2">Time</th><th className="text-right py-2">Txs</th><th className="text-right py-2">Size</th>
                </tr></thead>
                <tbody>{(data.recentBlocks||[]).map((b: any) => (
                  <tr key={b.block_no} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2"><Link href={`/block/${b.hash}`} className="text-blue-400 hover:underline">#{b.block_no}</Link></td>
                    <td className="py-2">{b.epoch_no}</td>
                    <td className="py-2 text-gray-400">{b.time ? timeAgo(b.time) : "\u2014"}</td>
                    <td className="py-2 text-right">{b.tx_count}</td>
                    <td className="py-2 text-right">{Number(b.size||0).toLocaleString()} B</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Delegators */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Top Delegators</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">#</th><th className="text-left py-2">Stake Address</th><th className="text-right py-2">Amount</th>
              </tr></thead>
              <tbody>{(data.delegators||[]).map((d: any, i: number) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-2 text-gray-400">{i+1}</td>
                  <td className="py-2 font-mono text-xs">{truncHash(d.stake_addr, 12)}</td>
                  <td className="py-2 text-right">{fmtAda(d.amount)} ADA</td>
                </tr>))}
              </tbody>
            </table>
          </div>

          {/* Pool Updates */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Pool Update History</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">Epoch</th><th className="text-left py-2">Time</th>
                <th className="text-right py-2">Pledge</th><th className="text-right py-2">Margin</th><th className="text-right py-2">Cost</th>
              </tr></thead>
              <tbody>{(data.updates||[]).map((u: any, i: number) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-2">{u.epoch_no}</td>
                  <td className="py-2 text-gray-400">{u.time ? timeAgo(u.time) : "\u2014"}</td>
                  <td className="py-2 text-right">{fmtAda(u.pledge)} ADA</td>
                  <td className="py-2 text-right">{(Number(u.margin)*100).toFixed(2)}%</td>
                  <td className="py-2 text-right">{fmtAda(u.fixed_cost)} ADA</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
'''

# --- CC Dashboard ---
PAGES["dashboard/cc/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CCDashboard() {
  const data: any = await fetchAPI("/dashboard/cc");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { members, activeProposals, recentVotes, constitution, stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🏛️</span>
        <div><h1 className="text-2xl font-bold">Constitutional Committee Dashboard</h1>
        <p className="text-gray-400 text-sm">Members, proposals, votes, and constitutional governance</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: stats?.totalMembers || 0, color: "text-blue-400" },
          { label: "Active Members", value: stats?.activeMembers || 0, color: "text-green-400" },
          { label: "Active Proposals", value: activeProposals?.length || 0, color: "text-yellow-400" },
          { label: "CC Votes Cast", value: recentVotes?.length || 0, color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Constitution */}
      {constitution && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Constitution</h2>
          <div className="text-sm space-y-2">
            {constitution.url && <div><span className="text-gray-400">URL: </span><a href={constitution.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline break-all">{constitution.url}</a></div>}
            {constitution.script_hash && <div><span className="text-gray-400">Script Hash: </span><span className="font-mono text-xs">{constitution.script_hash}</span></div>}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Committee Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Hot Credential</th><th className="text-left py-2">Cold Credential</th>
              <th className="text-left py-2">Status</th><th className="text-right py-2">Expires</th>
            </tr></thead>
            <tbody>{(members||[]).map((m: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 font-mono text-xs">{truncHash(m.hot_cred)}</td>
                <td className="py-2 font-mono text-xs">{truncHash(m.cold_cred)}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${m.status==='Active'||!m.status ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>{m.status||'Active'}</span></td>
                <td className="py-2 text-right">{m.expiration_epoch ? `Epoch ${m.expiration_epoch}` : "\u2014"}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Proposals Needing CC Vote */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Active Proposals</h2>
        <div className="space-y-3">
          {(activeProposals||[]).map((p: any, i: number) => (
            <div key={i} className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs mr-2">{p.type}</span>
                  <span className="font-mono text-xs text-gray-400">{truncHash(p.tx_hash)}#{p.index}</span>
                </div>
                <span className="text-xs text-gray-400">{p.time ? timeAgo(p.time) : ""}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>Epoch {p.epoch_no}</span>
                <span>{p.vote_count} votes</span>
                {p.voting_anchor_url && <a href={p.voting_anchor_url} target="_blank" rel="noopener" className="text-blue-400 hover:underline">Anchor</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent CC Votes */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent CC Votes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Proposal</th><th className="text-left py-2">Voter</th>
            <th className="text-left py-2">Vote</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{(recentVotes||[]).slice(0,20).map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2"><span className="text-xs">{v.proposal_type}</span> <span className="font-mono text-xs text-gray-400">{truncHash(v.proposal_hash)}</span></td>
              <td className="py-2 font-mono text-xs">{truncHash(v.voter_hash)}</td>
              <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.vote==='Yes'?'bg-green-600/30 text-green-300':v.vote==='No'?'bg-red-600/30 text-red-300':'bg-gray-600/30 text-gray-300'}`}>{v.vote}</span></td>
              <td className="py-2 text-right text-gray-400">{v.time ? timeAgo(v.time) : ""}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''

# --- DRep Dashboard ---
PAGES["dashboard/drep/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo, fmtAda } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DRepDashboard() {
  const data: any = await fetchAPI("/dashboard/drep");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { topDreps, activeProposals, recentVotes, stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🗳️</span>
        <div><h1 className="text-2xl font-bold">DRep Dashboard</h1>
        <p className="text-gray-400 text-sm">Delegated representatives, voting power, and proposals</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total DReps", value: Number(stats?.total_dreps||0).toLocaleString(), color: "text-blue-400" },
          { label: "Total Delegations", value: Number(stats?.total_delegations||0).toLocaleString(), color: "text-green-400" },
          { label: "Active Proposals", value: stats?.active_proposals||0, color: "text-yellow-400" },
          { label: "DRep Votes Cast", value: Number(stats?.total_drep_votes||0).toLocaleString(), color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top DReps */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top DReps by Delegators</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">#</th><th className="text-left py-2">DRep</th>
              <th className="text-right py-2">Voting Power</th><th className="text-right py-2">Delegators</th>
            </tr></thead>
            <tbody>{(topDreps||[]).map((d: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 text-gray-400">{i+1}</td>
                <td className="py-2"><Link href={`/dreps`} className="text-blue-400 hover:underline font-mono text-xs">{d.view || truncHash(d.drep_hash)}</Link>
                  {d.has_script && <span className="ml-1 text-xs text-yellow-400">script</span>}</td>
                <td className="py-2 text-right">{fmtAda(d.voting_power)} ADA</td>
                <td className="py-2 text-right">{Number(d.delegator_count).toLocaleString()}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Proposals */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Proposals Awaiting DRep Votes</h2>
        <div className="space-y-3">
          {(activeProposals||[]).map((p: any, i: number) => (
            <div key={i} className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs mr-2">{p.type}</span>
                  <span className="font-mono text-xs text-gray-400">{truncHash(p.tx_hash)}#{p.index}</span>
                </div>
                <span className="text-xs text-gray-400">{p.time ? timeAgo(p.time) : ""}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs">
                <span className="text-gray-400">Epoch {p.epoch_no}</span>
                <span className="text-green-400">{p.drep_votes} DRep votes</span>
                {p.voting_anchor_url && <a href={p.voting_anchor_url} target="_blank" rel="noopener" className="text-blue-400 hover:underline">Metadata</a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Votes */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent DRep Votes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">Proposal</th><th className="text-left py-2">DRep</th>
            <th className="text-left py-2">Vote</th><th className="text-right py-2">Time</th>
          </tr></thead>
          <tbody>{(recentVotes||[]).map((v: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2"><span className="text-xs text-gray-400">{v.proposal_type}</span> <span className="font-mono text-xs">{truncHash(v.proposal_hash)}</span></td>
              <td className="py-2 font-mono text-xs">{truncHash(v.voter_hash)}</td>
              <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${v.vote==='Yes'?'bg-green-600/30 text-green-300':v.vote==='No'?'bg-red-600/30 text-red-300':'bg-gray-600/30 text-gray-300'}`}>{v.vote}</span></td>
              <td className="py-2 text-right text-gray-400">{v.time ? timeAgo(v.time) : ""}</td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''

# --- Governance Analyst Dashboard ---
PAGES["dashboard/governance/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo, compactNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GovernanceAnalystDashboard() {
  const data: any = await fetchAPI("/dashboard/governance-analyst");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { proposals, proposalBreakdown, topDrepsByActivity, votesPerEpoch, paramHistory } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">📊</span>
        <div><h1 className="text-2xl font-bold">Governance Analyst Dashboard</h1>
        <p className="text-gray-400 text-sm">Deep analysis of proposals, voting patterns, and governance trends</p></div>
      </div>

      {/* Proposal Breakdown by Type */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Proposal Breakdown by Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Type</th><th className="text-right py-2">Total</th>
              <th className="text-right py-2">Active</th><th className="text-right py-2">Ratified</th>
              <th className="text-right py-2">Enacted</th><th className="text-right py-2">Dropped</th><th className="text-right py-2">Expired</th>
            </tr></thead>
            <tbody>{(proposalBreakdown||[]).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 font-medium">{p.type}</td>
                <td className="py-2 text-right">{p.total}</td>
                <td className="py-2 text-right text-yellow-400">{p.active}</td>
                <td className="py-2 text-right text-blue-400">{p.ratified}</td>
                <td className="py-2 text-right text-green-400">{p.enacted}</td>
                <td className="py-2 text-right text-red-400">{p.dropped}</td>
                <td className="py-2 text-right text-gray-400">{p.expired}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Votes per Epoch Trend */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Voting Activity per Epoch</h2>
        <div className="space-y-2">
          {(votesPerEpoch||[]).reverse().map((e: any, i: number) => {
            const maxVotes = Math.max(...(votesPerEpoch||[]).map((x: any) => Number(x.vote_count)));
            const pct = maxVotes > 0 ? (Number(e.vote_count) / maxVotes) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-gray-400">E{e.epoch_no}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                  <div className="bg-blue-500/70 h-full rounded-full flex items-center px-2" style={{width: `${Math.max(pct,5)}%`}}>
                    <span className="text-xs whitespace-nowrap">{e.vote_count} votes</span>
                  </div>
                </div>
                <span className="text-gray-400 text-xs w-24 text-right">{e.unique_voters} voters</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Active DReps */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Most Active DReps</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">#</th><th className="text-left py-2">DRep Hash</th>
            <th className="text-right py-2">Votes</th><th className="text-right py-2">Yes</th>
            <th className="text-right py-2">No</th><th className="text-right py-2">Abstain</th><th className="text-right py-2">Last Vote</th>
          </tr></thead>
          <tbody>{(topDrepsByActivity||[]).map((d: any, i: number) => (
            <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="py-2 text-gray-400">{i+1}</td>
              <td className="py-2 font-mono text-xs">{truncHash(d.drep_hash)}</td>
              <td className="py-2 text-right font-bold">{d.vote_count}</td>
              <td className="py-2 text-right text-green-400">{d.yes_votes}</td>
              <td className="py-2 text-right text-red-400">{d.no_votes}</td>
              <td className="py-2 text-right text-gray-400">{d.abstain_votes}</td>
              <td className="py-2 text-right text-gray-400 text-xs">{d.last_vote_time ? timeAgo(d.last_vote_time) : "\u2014"}</td>
            </tr>))}
          </tbody>
        </table>
      </div>

      {/* Recent Proposals with Vote Counts */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Proposals</h2>
        <div className="space-y-3">
          {(proposals||[]).slice(0,15).map((p: any, i: number) => {
            const status = p.enacted_epoch ? "Enacted" : p.ratified_epoch ? "Ratified" : p.dropped_epoch ? "Dropped" : p.expired_epoch ? "Expired" : "Active";
            const statusColor = status==="Enacted"?"bg-green-600/30 text-green-300":status==="Ratified"?"bg-blue-600/30 text-blue-300":status==="Active"?"bg-yellow-600/30 text-yellow-300":"bg-red-600/30 text-red-300";
            return (
              <div key={i} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>{status}</span>
                    <span className="bg-gray-600/50 text-gray-300 px-2 py-0.5 rounded text-xs">{p.type}</span>
                    <span className="font-mono text-xs text-gray-400">{truncHash(p.tx_hash)}#{p.index}</span>
                  </div>
                  <span className="text-xs text-gray-400">{p.time ? timeAgo(p.time) : ""}</span>
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-blue-400">DRep: {p.drep_votes}</span>
                  <span className="text-purple-400">CC: {p.cc_votes}</span>
                  <span className="text-green-400">SPO: {p.spo_votes}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol Parameter History */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Protocol Parameter History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Epoch</th><th className="text-right py-2">MinFeeA</th>
              <th className="text-right py-2">MinFeeB</th><th className="text-right py-2">Key Dep</th>
              <th className="text-right py-2">Pool Dep</th><th className="text-right py-2">Optimal K</th><th className="text-right py-2">Protocol</th>
            </tr></thead>
            <tbody>{(paramHistory||[]).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2">{p.epoch_no}</td>
                <td className="py-2 text-right">{p.min_fee_a}</td>
                <td className="py-2 text-right">{p.min_fee_b}</td>
                <td className="py-2 text-right">{Number(p.key_deposit||0)/1e6} ADA</td>
                <td className="py-2 text-right">{Number(p.pool_deposit||0)/1e6} ADA</td>
                <td className="py-2 text-right">{p.optimal_pool_count}</td>
                <td className="py-2 text-right">v{p.protocol_major}.{p.protocol_minor}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''

# --- Chain Analyst Dashboard ---
PAGES["dashboard/chain/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { fmtAda, compactNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChainAnalystDashboard() {
  const data: any = await fetchAPI("/dashboard/chain-analyst");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { epochTrend, txStats, blockStats, feesByEpoch, adaPots } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔗</span>
        <div><h1 className="text-2xl font-bold">Chain Analyst Dashboard</h1>
        <p className="text-gray-400 text-sm">Network metrics, transaction patterns, block production, and fees</p></div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Txs (24h)", value: compactNumber(Number(txStats?.tx_24h||0)), color: "text-blue-400" },
          { label: "Txs (1h)", value: Number(txStats?.tx_1h||0).toLocaleString(), color: "text-green-400" },
          { label: "Fees (24h)", value: fmtAda(txStats?.fees_24h||0)+" ADA", color: "text-yellow-400" },
          { label: "Avg Fee", value: fmtAda(txStats?.avg_fee_24h||0)+" ADA", color: "text-purple-400" },
          { label: "Latest Block", value: compactNumber(Number(blockStats?.latest_block||0)), color: "text-red-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Block Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Blocks (24h)", value: Number(blockStats?.blocks_24h||0).toLocaleString() },
          { label: "Avg Block Size", value: Number(blockStats?.avg_block_size||0).toLocaleString()+" B" },
          { label: "Avg Tx/Block", value: blockStats?.avg_tx_per_block||"0" },
          { label: "Avg Tx Size (24h)", value: Number(txStats?.avg_tx_size_24h||0).toLocaleString()+" B" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Epoch Trend */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Epoch Trend (Last 10)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Epoch</th><th className="text-right py-2">Blocks</th>
              <th className="text-right py-2">Transactions</th><th className="text-right py-2">Total Fees</th>
            </tr></thead>
            <tbody>{(epochTrend||[]).map((e: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 font-medium">{e.no}</td>
                <td className="py-2 text-right">{Number(e.blocks).toLocaleString()}</td>
                <td className="py-2 text-right">{Number(e.tx_count).toLocaleString()}</td>
                <td className="py-2 text-right">{fmtAda(e.total_fees)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fees by Epoch */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Fee Trend (Recent Epochs)</h2>
        <div className="space-y-2">
          {(feesByEpoch||[]).map((e: any, i: number) => {
            const maxFee = Math.max(...(feesByEpoch||[]).map((x: any) => Number(x.total_fees)));
            const pct = maxFee > 0 ? (Number(e.total_fees) / maxFee) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-gray-400">E{e.epoch_no}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
                  <div className="bg-yellow-500/70 h-full rounded-full flex items-center px-2" style={{width: `${Math.max(pct,5)}%`}}>
                    <span className="text-xs whitespace-nowrap">{fmtAda(e.total_fees)} ADA</span>
                  </div>
                </div>
                <span className="text-gray-400 text-xs w-20 text-right">{Number(e.tx_count).toLocaleString()} txs</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADA Pots */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">ADA Distribution (Pots)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Epoch</th><th className="text-right py-2">Treasury</th>
              <th className="text-right py-2">Reserves</th><th className="text-right py-2">Rewards</th>
              <th className="text-right py-2">UTxO</th><th className="text-right py-2">Fees</th>
            </tr></thead>
            <tbody>{(adaPots||[]).map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2">{p.epoch_no}</td>
                <td className="py-2 text-right">{fmtAda(p.treasury)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.reserves)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.rewards)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.utxo)} ADA</td>
                <td className="py-2 text-right">{fmtAda(p.fees)} ADA</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
'''

# --- Portfolio Dashboard ---
PAGES["dashboard/portfolio/page.tsx"] = r'''"use client";
import { useState } from "react";
import Link from "next/link";

function fmtAda(l: string|number) { const n = Number(l)/1e6; if(n>=1e9) return (n/1e9).toFixed(2)+"B"; if(n>=1e6) return (n/1e6).toFixed(2)+"M"; if(n>=1e3) return (n/1e3).toFixed(1)+"K"; return n.toFixed(2); }
function truncHash(h: string, l=8) { return h && h.length > l*2 ? h.slice(0,l)+"..."+h.slice(-l) : h||""; }
function timeAgo(d: string) { const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1) return "just now"; if(m<60) return m+"m ago"; const h=Math.floor(m/60); if(h<24) return h+"h ago"; return Math.floor(h/24)+"d ago"; }
function lovelaceToAda(l: string|number, d=2) { return (Number(l)/1e6).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}); }

export default function PortfolioDashboard() {
  const [addr, setAddr] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!addr.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/portfolio/${addr.trim()}`);
      const d = await res.json();
      if (!d.address || d.address.balance === "0" && d.tokens.length === 0) { setError("Address not found or empty"); setData(null); }
      else setData(d);
    } catch { setError("Failed to fetch"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">💼</span>
        <div><h1 className="text-2xl font-bold">Portfolio Tracker</h1>
        <p className="text-gray-400 text-sm">Holdings, rankings, tokens, staking status, and transaction history</p></div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <label className="text-sm text-gray-400 block mb-2">Enter ADA Address (addr1...)</label>
        <div className="flex gap-2">
          <input value={addr} onChange={e => setAddr(e.target.value)} onKeyDown={e => e.key==="Enter" && lookup()}
            placeholder="addr1..." className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={lookup} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? "Loading..." : "Lookup"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {data && (
        <>
          {/* Balance & Ranking */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-xl p-6">
              <span className="text-gray-400 text-xs">ADA Balance</span>
              <p className="text-2xl font-bold text-green-400">{lovelaceToAda(data.address.balance)} ADA</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <span className="text-gray-400 text-xs">Wealth Ranking</span>
              <p className="text-2xl font-bold text-yellow-400">#{Number(data.ranking?.rank||0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <span className="text-gray-400 text-xs">Native Tokens</span>
              <p className="text-2xl font-bold text-purple-400">{data.tokens?.length || 0}</p>
            </div>
          </div>

          {/* Staking Info */}
          {data.staking && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-3">Staking</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-400">Stake Address</span><p className="font-mono text-xs">{truncHash(data.staking.stake_address,12)}</p></div>
                <div><span className="text-gray-400">Pool</span>
                  <p><Link href={`/pool/${data.staking.pool_id}`} className="text-blue-400 hover:underline">{data.staking.pool_name || truncHash(data.staking.pool_id||"")}</Link></p>
                </div>
                <div><span className="text-gray-400">Total Rewards</span><p className="text-green-400">{lovelaceToAda(data.staking.total_rewards||0)} ADA</p></div>
              </div>
            </div>
          )}

          {/* Token Holdings */}
          {data.tokens && data.tokens.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Token Holdings ({data.tokens.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Fingerprint</th><th className="text-left py-2">Policy</th>
                    <th className="text-right py-2">Quantity</th>
                  </tr></thead>
                  <tbody>{data.tokens.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-2"><Link href={`/token/${t.fingerprint}`} className="text-blue-400 hover:underline font-mono text-xs">{t.fingerprint || truncHash(t.name_hex)}</Link></td>
                      <td className="py-2 font-mono text-xs text-gray-400">{truncHash(t.policy)}</td>
                      <td className="py-2 text-right">{Number(t.quantity).toLocaleString()}</td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Hash</th><th className="text-left py-2">Time</th>
                  <th className="text-right py-2">Fee</th><th className="text-right py-2">Output</th>
                </tr></thead>
                <tbody>{(data.recentTransactions||[]).map((tx: any, i: number) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2"><Link href={`/tx/${tx.hash}`} className="text-blue-400 hover:underline font-mono text-xs">{truncHash(tx.hash)}</Link></td>
                    <td className="py-2 text-gray-400">{tx.time ? timeAgo(tx.time) : "\u2014"}</td>
                    <td className="py-2 text-right">{lovelaceToAda(tx.fee)} ADA</td>
                    <td className="py-2 text-right">{fmtAda(tx.out_sum)} ADA</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
'''

# --- Developer Dashboard ---
PAGES["dashboard/developer/page.tsx"] = r'''import { fetchAPI } from "@/lib/api";
import { truncHash, timeAgo, compactNumber } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DeveloperDashboard() {
  const data: any = await fetchAPI("/dashboard/developer");
  if (!data) return <div className="p-8 text-center text-gray-400">Failed to load dashboard</div>;
  const { topScripts, recentContractTxs, protocolParams: pp, dbStats } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">👨‍💻</span>
        <div><h1 className="text-2xl font-bold">Developer Dashboard</h1>
        <p className="text-gray-400 text-sm">Scripts, contracts, protocol parameters, and chain stats</p></div>
      </div>

      {/* DB Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Current Epoch", value: dbStats?.current_epoch, color: "text-blue-400" },
          { label: "Latest Block", value: compactNumber(Number(dbStats?.latest_block||0)), color: "text-green-400" },
          { label: "Total Txs", value: compactNumber(Number(dbStats?.total_txs||0)), color: "text-yellow-400" },
          { label: "Scripts", value: compactNumber(Number(dbStats?.total_scripts||0)), color: "text-purple-400" },
          { label: "Native Assets", value: compactNumber(Number(dbStats?.total_assets||0)), color: "text-red-400" },
          { label: "DB Size", value: dbStats?.db_size || "N/A", color: "text-cyan-400" },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <span className="text-gray-400 text-xs">{s.label}</span>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Key Protocol Params */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Protocol Parameters</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {pp && Object.entries(pp).filter(([k]) => !['id','epoch_no','block_id','nonce','cost_model_id','coins_per_utxo_size'].includes(k)).slice(0,16).map(([k, v]: any, i: number) => (
            <div key={i}><span className="text-gray-400 text-xs">{k.replace(/_/g,' ')}</span>
            <p className="font-mono text-sm">{typeof v === 'number' && v > 1e6 ? (v/1e6).toFixed(2)+' ADA' : String(v)}</p></div>
          ))}
        </div>
      </div>

      {/* Top Scripts */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Top Scripts by Usage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">#</th><th className="text-left py-2">Script Hash</th>
              <th className="text-left py-2">Type</th><th className="text-right py-2">Size</th><th className="text-right py-2">Usage</th>
            </tr></thead>
            <tbody>{(topScripts||[]).map((s: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2 text-gray-400">{i+1}</td>
                <td className="py-2 font-mono text-xs">{truncHash(s.hash, 12)}</td>
                <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${s.type?.includes('Plutus')?'bg-purple-600/30 text-purple-300':'bg-gray-600/30 text-gray-300'}`}>{s.type}</span></td>
                <td className="py-2 text-right">{s.serialised_size ? Number(s.serialised_size).toLocaleString()+' B' : '\u2014'}</td>
                <td className="py-2 text-right font-bold">{Number(s.usage_count).toLocaleString()}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Contract Txs */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Contract Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2">Hash</th><th className="text-left py-2">Time</th>
              <th className="text-right py-2">Fee</th><th className="text-right py-2">Script Size</th><th className="text-right py-2">Redeemers</th>
            </tr></thead>
            <tbody>{(recentContractTxs||[]).map((tx: any, i: number) => (
              <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="py-2"><Link href={`/tx/${tx.tx_hash}`} className="text-blue-400 hover:underline font-mono text-xs">{truncHash(tx.tx_hash)}</Link></td>
                <td className="py-2 text-gray-400">{tx.time ? timeAgo(tx.time) : "\u2014"}</td>
                <td className="py-2 text-right">{(Number(tx.fee)/1e6).toFixed(4)} ADA</td>
                <td className="py-2 text-right">{Number(tx.script_size).toLocaleString()} B</td>
                <td className="py-2 text-right">{tx.redeemer_count}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">API Quick Reference</h2>
        <p className="text-gray-400 text-sm mb-4">Base URL: <code className="bg-gray-700 px-2 py-0.5 rounded">https://adatool.net/api</code></p>
        <div className="space-y-1 text-sm font-mono">
          {[
            "GET /blocks", "GET /block/:hash", "GET /txs", "GET /tx/:hash",
            "GET /epochs", "GET /epoch/:no", "GET /pools", "GET /pool/:hash",
            "GET /tokens", "GET /token/:fp", "GET /dreps", "GET /governance",
            "GET /stats/live", "GET /analytics/network", "GET /search-universal?q=...",
            "GET /dashboard/holder", "GET /dashboard/spo/:pool", "GET /dashboard/cc",
            "GET /dashboard/drep", "GET /dashboard/developer",
          ].map((ep, i) => (
            <div key={i} className="text-gray-300 hover:text-blue-400">{ep}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
'''

# --- Dashboard Index (Persona Selector) ---
PAGES["dashboard/page.tsx"] = r'''import Link from "next/link";

export const dynamic = "force-dynamic";

const personas = [
  { href: "/dashboard/holder", icon: "🪙", title: "ADA Holder", desc: "Staking, rewards, pool overview, epoch progress, and protocol parameters", color: "from-blue-600/20 to-blue-800/20 border-blue-500/30" },
  { href: "/dashboard/spo", icon: "🏊", title: "Stake Pool Operator", desc: "Pool metrics, delegators, blocks produced, pledge, saturation, and update history", color: "from-green-600/20 to-green-800/20 border-green-500/30" },
  { href: "/dashboard/cc", icon: "🏛️", title: "Constitutional Committee", desc: "CC members, active proposals, voting status, and constitutional governance", color: "from-purple-600/20 to-purple-800/20 border-purple-500/30" },
  { href: "/dashboard/drep", icon: "🗳️", title: "DRep", desc: "Delegated representatives, voting power, proposals to vote, and voting history", color: "from-yellow-600/20 to-yellow-800/20 border-yellow-500/30" },
  { href: "/dashboard/governance", icon: "📊", title: "Governance Analyst", desc: "Deep analysis of proposals, voting patterns, DRep activity, and parameter changes", color: "from-red-600/20 to-red-800/20 border-red-500/30" },
  { href: "/dashboard/chain", icon: "🔗", title: "Chain Analyst", desc: "Network metrics, transaction patterns, block production, fees, and ADA distribution", color: "from-cyan-600/20 to-cyan-800/20 border-cyan-500/30" },
  { href: "/dashboard/portfolio", icon: "💼", title: "Portfolio Tracker", desc: "Holdings, rankings, token balances, staking status, and transaction history", color: "from-pink-600/20 to-pink-800/20 border-pink-500/30" },
  { href: "/dashboard/developer", icon: "👨‍💻", title: "Developer", desc: "Scripts, contracts, protocol parameters, API reference, and chain statistics", color: "from-orange-600/20 to-orange-800/20 border-orange-500/30" },
];

export default function DashboardIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboards</h1>
        <p className="text-gray-400 mt-2">Choose your role to see a personalized view of the Cardano network</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((p, i) => (
          <Link key={i} href={p.href} className={`bg-gradient-to-br ${p.color} border rounded-xl p-6 hover:scale-[1.02] transition-transform`}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{p.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{p.title}</h2>
                <p className="text-gray-400 text-sm mt-1">{p.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
'''

# ============================================================
# PART 3: Updated Header with Persona Navigation
# ============================================================

HEADER_CONTENT = r'''"use client";
import Link from "next/link";
import { useState } from "react";

const NAV = [
  { label: "Dashboards", items: [
    { href: "/dashboard", label: "All Dashboards" },
    { href: "/dashboard/holder", label: "ADA Holder" },
    { href: "/dashboard/spo", label: "SPO" },
    { href: "/dashboard/cc", label: "CC Member" },
    { href: "/dashboard/drep", label: "DRep" },
    { href: "/dashboard/governance", label: "Governance Analyst" },
    { href: "/dashboard/chain", label: "Chain Analyst" },
    { href: "/dashboard/portfolio", label: "Portfolio Tracker" },
    { href: "/dashboard/developer", label: "Developer" },
  ]},
  { label: "Blockchain", items: [
    { href: "/blocks", label: "Blocks" },
    { href: "/txs", label: "Transactions" },
    { href: "/epochs", label: "Epochs" },
    { href: "/tokens", label: "Tokens" },
    { href: "/tokens/mints", label: "Token Mints" },
    { href: "/tx-metadata", label: "Tx Metadata" },
    { href: "/contract-txs", label: "Contracts" },
    { href: "/certificates", label: "Certificates" },
  ]},
  { label: "Staking", items: [
    { href: "/pools", label: "Pools" },
    { href: "/pools/new", label: "New Pools" },
    { href: "/pools/retired", label: "Retired" },
    { href: "/pool-updates", label: "Pool Updates" },
    { href: "/delegations", label: "Delegations" },
    { href: "/stake-distribution", label: "Stake Distribution" },
    { href: "/rewards-withdrawals", label: "Rewards" },
    { href: "/rewards-checker", label: "Rewards Checker" },
  ]},
  { label: "Governance", items: [
    { href: "/governance", label: "Overview" },
    { href: "/dreps", label: "DReps" },
    { href: "/committee", label: "Committee" },
    { href: "/votes", label: "Votes" },
    { href: "/drep-delegations", label: "DRep Delegations" },
    { href: "/constitution", label: "Constitution" },
    { href: "/treasury", label: "Treasury" },
    { href: "/protocol", label: "Protocol Params" },
  ]},
  { label: "Analytics", items: [
    { href: "/analytics/network", label: "Network" },
    { href: "/charts", label: "Charts" },
    { href: "/analytics/wealth", label: "Wealth" },
    { href: "/analytics/block-versions", label: "Block Versions" },
    { href: "/analytics/pool-landscape", label: "Pool Landscape" },
    { href: "/analytics/governance", label: "Governance Stats" },
    { href: "/analytics/pots", label: "Pots" },
    { href: "/analytics/treasury-projection", label: "Treasury Projection" },
    { href: "/analytics/top-addresses", label: "Top Addresses" },
    { href: "/analytics/top-stakers", label: "Top Stakers" },
    { href: "/analytics/genesis", label: "Genesis" },
    { href: "/analytics/tx-charts", label: "Tx Charts" },
  ]},
  { label: "Rich List", items: [
    { href: "/whales", label: "Whales" },
    { href: "/richlist", label: "Rich List" },
  ]},
];

export default function Header() {
  const [open, setOpen] = useState<string|null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-blue-400">ADA</span>tool
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(group => (
            <div key={group.label} className="relative"
              onMouseEnter={() => setOpen(group.label)} onMouseLeave={() => setOpen(null)}>
              <button className="px-3 py-2 text-sm text-gray-300 hover:text-white rounded hover:bg-gray-800 transition">
                {group.label} <span className="text-xs opacity-50">▾</span>
              </button>
              {open === group.label && (
                <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                  {group.items.map(item => (
                    <Link key={item.href} href={item.href}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                      onClick={() => setOpen(null)}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/explorer" className="px-3 py-2 text-sm text-gray-300 hover:text-white">Explorer</Link>
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
          {NAV.map(group => (
            <div key={group.label} className="border-b border-gray-800">
              <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">{group.label}</div>
              {group.items.map(item => (
                <Link key={item.href} href={item.href}
                  className="block px-6 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="px-4 py-3 flex gap-4">
            <Link href="/explorer" className="text-sm text-gray-300" onClick={() => setMobileOpen(false)}>Explorer</Link>
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
# PART 4: Main execution
# ============================================================

def append_api_endpoints():
    log("Step 1: Appending persona dashboard API endpoints...")
    # Check if endpoints already exist
    with open(API_FILE, "r") as f:
        content = f.read()
    if "/dashboard/holder" in content:
        warn("  Dashboard endpoints already exist, skipping...")
        return
    # Find the line before app.listen or export or end
    # Append before the last line
    lines = content.rstrip().split("\n")
    # Find a good insertion point - before any trailing export/listen
    insert_at = len(lines)
    for i in range(len(lines)-1, max(0, len(lines)-30), -1):
        if "app.listen" in lines[i] or "export default" in lines[i] or "serve(" in lines[i]:
            insert_at = i
            break
    new_content = "\n".join(lines[:insert_at]) + "\n" + NEW_API_ENDPOINTS + "\n" + "\n".join(lines[insert_at:])
    with open(API_FILE, "w") as f:
        f.write(new_content)
    log(f"  Appended {len(NEW_API_ENDPOINTS.splitlines())} lines to API")

def write_pages():
    log("Step 2: Writing frontend pages...")
    base = os.path.join(PROJECT, "src/app/(explorer)")
    for rel_path, content in PAGES.items():
        full_path = os.path.join(base, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)
        log(f"  Written: {rel_path}")
    log(f"  Total pages: {len(PAGES)}")

def update_header():
    log("Step 3: Updating Header navigation...")
    header_path = os.path.join(PROJECT, "src/components/layout/Header.tsx")
    with open(header_path, "w") as f:
        f.write(HEADER_CONTENT)
    log("  Header updated with persona-based navigation")

def restart_api():
    log("Step 4: Restarting API...")
    code, _, e = run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
    if code == 0:
        log("  API restarted")
    else:
        warn(f"  API restart issue: {e}")
    time.sleep(3)

def build_frontend():
    log("Step 5: Building frontend...")
    # Clean cache
    dotNext = os.path.join(PROJECT, ".next")
    if os.path.isdir(dotNext):
        shutil.rmtree(dotNext)
        log("  Cleaned .next cache")

    code, out, errs = run("npm run build 2>&1")
    lines = (out + errs).strip().split("\n")
    for line in lines[-40:]:
        print(f"  {line}")
    if code != 0:
        err("BUILD FAILED!")
        return False
    log("BUILD SUCCESS!")
    return True

def deploy():
    log("Step 6: Deploying...")
    run("cp -r public .next/standalone/")
    run("cp -r .next/static .next/standalone/.next/")
    code, _, e = run("sudo systemctl restart adatool-frontend")
    if code == 0:
        log("  Frontend restarted")
    else:
        warn(f"  Restart issue: {e}")
    time.sleep(10)
    code, out, _ = run("sudo systemctl is-active adatool-frontend")
    log(f"  Service status: {out.strip()}")

def test_dashboards():
    log("Step 7: Testing dashboard pages...")
    routes = [
        "dashboard",
        "dashboard/holder",
        "dashboard/spo",
        "dashboard/cc",
        "dashboard/drep",
        "dashboard/governance",
        "dashboard/chain",
        "dashboard/portfolio",
        "dashboard/developer",
    ]
    ok = fail = 0
    for r in routes:
        code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{r} --max-time 20")
        status = out.strip().strip("'")
        if status.startswith("2"):
            log(f"  /{r} => {status}")
            ok += 1
        else:
            warn(f"  /{r} => {status}")
            fail += 1

    # Test API endpoints
    info("  Testing API endpoints...")
    api_routes = [
        "dashboard/holder",
        "dashboard/cc",
        "dashboard/drep",
        "dashboard/governance-analyst",
        "dashboard/chain-analyst",
        "dashboard/developer",
    ]
    for r in api_routes:
        code, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3001/{r} --max-time 20")
        status = out.strip().strip("'")
        if status.startswith("2"):
            log(f"  API /{r} => {status}")
        else:
            warn(f"  API /{r} => {status}")

    log(f"  Dashboard pages: {ok} OK, {fail} failed out of {ok+fail}")

# ============================================================
if __name__ == "__main__":
    print("\n" + "="*70)
    log("Persona Dashboard Implementation for adatool.net")
    print("="*70 + "\n")

    if not os.path.isdir(PROJECT):
        err(f"Project not found: {PROJECT}")
        sys.exit(1)
    if not os.path.isfile(API_FILE):
        err(f"API file not found: {API_FILE}")
        sys.exit(1)

    append_api_endpoints()
    write_pages()
    update_header()
    restart_api()
    if not build_frontend():
        err("Build failed - check errors above")
        sys.exit(1)
    deploy()
    test_dashboards()

    print("\n" + "="*70)
    log("ALL DONE! Persona dashboards deployed.")
    print("="*70 + "\n")
