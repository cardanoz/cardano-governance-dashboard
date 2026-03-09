#!/usr/bin/env python3
"""
Fix dashboard API endpoints based on actual database schema.
Key issues:
- committee_member: columns are committee_id, committee_hash_id, expiration_epoch (not hot_cred/cold_cred/status)
- constitution: needs join to voting_anchor for url
- voting_procedure: uses drep_voter/pool_voter/committee_voter (not voter_hash)
- gov_action_proposal: tx_id is FK, not tx_hash; needs join to voting_anchor
- developer: redeemer table is huge, needs careful queries

Run on server: python3 fix-dashboard-apis-v2.py
"""
import os, subprocess, time, shutil, json

G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

API_FILE = "/home/ubuntu/adatool-api/src/index.js"
PROJECT = "/home/ubuntu/adatool-frontend"

def run(cmd, cwd=None, timeout=120):
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd or PROJECT, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

def psql(query, timeout=15):
    cmd = f"sudo -u postgres psql -d archive -t -A -c \"{query}\""
    code, out, errs = run(cmd, cwd="/tmp", timeout=timeout)
    return out.strip(), errs.strip()

# ============================================================
# Step 0: Check a few more schema details
# ============================================================
info("Checking additional schema details...")

# Check committee_hash table
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='committee_hash' ORDER BY ordinal_position")
log(f"  committee_hash columns: {out.replace(chr(10), ', ')}")

# Check voting_anchor table
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='voting_anchor' ORDER BY ordinal_position")
log(f"  voting_anchor columns: {out.replace(chr(10), ', ')}")

# Check off_chain_vote_data table
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='off_chain_vote_data' ORDER BY ordinal_position")
log(f"  off_chain_vote_data columns: {out.replace(chr(10), ', ')}")

# Check drep_registration table
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='drep_registration' ORDER BY ordinal_position")
log(f"  drep_registration columns: {out.replace(chr(10), ', ')}")

# Sample committee_hash
out, _ = psql("SELECT * FROM committee_hash LIMIT 2")
log(f"  committee_hash sample: {out[:200]}")

# Sample voting_anchor
out, _ = psql("SELECT * FROM voting_anchor LIMIT 2")
log(f"  voting_anchor sample: {out[:200]}")

# Check if pool_offline_data.json column type
out, _ = psql("SELECT data_type FROM information_schema.columns WHERE table_name='pool_offline_data' AND column_name='json'")
log(f"  pool_offline_data.json type: {out}")

# Check epoch_stake columns
out, _ = psql("SELECT column_name FROM information_schema.columns WHERE table_name='epoch_stake' ORDER BY ordinal_position")
log(f"  epoch_stake columns: {out.replace(chr(10), ', ')}")

# Check reward_rest table (newer db-sync uses reward_rest instead of reward)
out, _ = psql("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='reward_rest'")
log(f"  reward_rest table exists: {out}")

# Check the actual error from API logs
info("Checking API logs...")
code, out, _ = run("sudo journalctl -u adatool-api --no-pager -n 40 2>&1")
# Print last error-related lines
for line in out.split("\n"):
    if "error" in line.lower() or "Error" in line or "err" in line.lower():
        warn(f"  LOG: {line.strip()[:200]}")

# ============================================================
# Step 1: Rewrite ALL broken API endpoints
# ============================================================
print("\n" + "="*60)
info("REWRITING API ENDPOINTS...")
print("="*60)

# Read current API file
with open(API_FILE, "r") as f:
    api_content = f.read()

# Remove old dashboard endpoints
import re

# Remove everything between PERSONA DASHBOARD ENDPOINTS markers
# Or just remove each endpoint individually
old_endpoints = [
    (r'// --- Holder Dashboard ---.*?(?=// --- SPO Dashboard ---)', ''),
    (r'// --- SPO Dashboard ---.*?(?=// --- CC Dashboard ---)', ''),
    (r'// --- CC Dashboard ---.*?(?=// --- DRep Dashboard)', ''),
    (r'// --- DRep Dashboard.*?(?=// --- Governance Analyst)', ''),
    (r'// --- Governance Analyst Dashboard ---.*?(?=// --- Chain Analyst)', ''),
    (r'// --- Chain Analyst Dashboard ---.*?(?=// --- Portfolio Dashboard)', ''),
    (r'// --- Portfolio Dashboard.*?(?=// --- Developer Dashboard)', ''),
    (r'// --- Developer Dashboard ---.*?(?=\n(?:app\.|const |let |var |function |export |import |//)(?!.*dashboard))', ''),
]

# Simpler approach: remove everything from "PERSONA DASHBOARD ENDPOINTS" to the next non-dashboard section
# Find the persona block
marker_start = "// ============================================================\n// PERSONA DASHBOARD ENDPOINTS"
if marker_start in api_content:
    start_idx = api_content.index(marker_start)
    # Find the end - look for the closing marker or next major section
    # The endpoints end before the serve/listen/export
    rest = api_content[start_idx:]
    # Find where dashboard code ends - look for serve( or app.listen or export
    end_patterns = ["serve(", "app.listen", "export default", "export {"]
    end_idx = len(api_content)
    for pat in end_patterns:
        idx = api_content.find(pat, start_idx)
        if idx > 0 and idx < end_idx:
            end_idx = idx

    api_content = api_content[:start_idx] + api_content[end_idx:]
    log("  Removed old dashboard endpoints")
else:
    warn("  Could not find old dashboard endpoints marker")

# New corrected endpoints
NEW_ENDPOINTS = r'''
// ============================================================
// PERSONA DASHBOARD ENDPOINTS (v2 - fixed schema)
// ============================================================

// --- Holder Dashboard ---
app.get("/dashboard/holder", async (c) => {
  const data = await cached("dash:holder:v2", 30, async () => {
    const [epoch, params, stats, topPools] = await Promise.all([
      pool.query(`SELECT e.no, e.start_time, e.end_time,
        (SELECT MAX(block_no) FROM block WHERE epoch_no = e.no) as blocks,
        (SELECT COUNT(*) FROM tx WHERE block_id IN (SELECT id FROM block WHERE epoch_no = e.no AND block_no IS NOT NULL ORDER BY block_no DESC LIMIT 5000)) as tx_count
        FROM epoch e ORDER BY e.no DESC LIMIT 1`),
      pool.query(`SELECT min_fee_a, min_fee_b, key_deposit, pool_deposit,
        max_epoch, optimal_pool_count, min_pool_cost,
        monetary_expand_rate, treasury_growth_rate, protocol_major
        FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`),
      pool.query(`SELECT
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_staked,
        (SELECT COUNT(DISTINCT es.addr_id) FROM epoch_stake es WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_stakers,
        (SELECT COUNT(*) FROM pool_hash ph
         WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))) as active_pools,
        (SELECT treasury FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as treasury,
        (SELECT reserves FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as reserves`),
      pool.query(`SELECT ph.view as pool_id, pod.json->>'name' as name,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        (SELECT COUNT(*) FROM epoch_stake es2 WHERE es2.pool_id = ph.id AND es2.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators,
        (SELECT COALESCE(SUM(es2.amount),0)::text FROM epoch_stake es2 WHERE es2.pool_id = ph.id AND es2.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM pool_offline_data pod2 WHERE pod2.pool_id = ph.id)
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
    const [info, delegators, blocks, updates] = await Promise.all([
      pool.query(`SELECT ph.view as pool_id,
        pod.json->>'name' as name, pod.json->>'ticker' as ticker,
        pod.json->>'homepage' as homepage, pod.json->>'description' as description,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as live_stake,
        (SELECT COUNT(*) FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegator_count,
        (SELECT COUNT(*) FROM block b JOIN slot_leader sl ON sl.id = b.slot_leader_id WHERE sl.pool_hash_id = ph.id) as lifetime_blocks
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM pool_offline_data pod2 WHERE pod2.pool_id = ph.id)
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
      pool.query(`SELECT pu.pledge::text, pu.margin, pu.fixed_cost::text,
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
      updates: updates.rows
    };
  });
  return c.json(data);
});

// --- CC Dashboard (fixed for actual schema) ---
app.get("/dashboard/cc", async (c) => {
  const data = await cached("dash:cc:v2", 60, async () => {
    const [members, proposals, votes, constitution] = await Promise.all([
      pool.query(`SELECT ch.id as hash_id,
        encode(ch.raw,'hex') as cred_hash, ch.has_script,
        cm.expiration_epoch
        FROM committee_member cm
        JOIN committee_hash ch ON ch.id = cm.committee_hash_id
        ORDER BY cm.expiration_epoch DESC NULLS LAST`),
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text, gp.expiration,
        va.url as voting_anchor_url,
        b.time, b.epoch_no,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id) as vote_count
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
        WHERE gp.ratified_epoch IS NULL AND gp.enacted_epoch IS NULL
          AND gp.dropped_epoch IS NULL AND gp.expired_epoch IS NULL
        ORDER BY b.time DESC LIMIT 20`),
      pool.query(`SELECT encode(t2.hash,'hex') as proposal_hash, gp.index as proposal_index,
        gp.type as proposal_type,
        vp.vote,
        encode(ch.raw,'hex') as voter_hash,
        vp.voter_role,
        b.time, b.epoch_no
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN committee_hash ch ON ch.id = vp.committee_voter
        LEFT JOIN tx t2 ON t2.id = gp.tx_id
        WHERE vp.voter_role = 'ConstitutionalCommittee'
        ORDER BY b.time DESC LIMIT 50`),
      pool.query(`SELECT c.script_hash,
        va.url, va.data_hash
        FROM constitution c
        LEFT JOIN voting_anchor va ON va.id = c.voting_anchor_id
        ORDER BY c.id DESC LIMIT 1`)
    ]);
    return {
      members: members.rows,
      activeProposals: proposals.rows,
      recentVotes: votes.rows,
      constitution: constitution.rows[0] || null,
      stats: {
        totalMembers: members.rows.length,
        activeMembers: members.rows.length
      }
    };
  });
  return c.json(data);
});

// --- DRep Dashboard (fixed schema) ---
app.get("/dashboard/drep", async (c) => {
  const data = await cached("dash:drep:v2", 60, async () => {
    const [topDreps, proposals, recentVotes, stats] = await Promise.all([
      pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script,
        (SELECT COUNT(*) FROM delegation_vote dv WHERE dv.drep_hash_id = dh.id) as delegator_count
        FROM drep_hash dh
        ORDER BY delegator_count DESC LIMIT 20`),
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text,
        va.url as voting_anchor_url,
        b.time, b.epoch_no,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'DRep') as drep_votes
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
        WHERE gp.ratified_epoch IS NULL AND gp.enacted_epoch IS NULL
          AND gp.dropped_epoch IS NULL AND gp.expired_epoch IS NULL
        ORDER BY b.time DESC LIMIT 15`),
      pool.query(`SELECT encode(t2.hash,'hex') as proposal_hash, gp.type as proposal_type,
        vp.vote,
        encode(dh.raw,'hex') as voter_hash,
        b.time
        FROM voting_procedure vp
        JOIN gov_action_proposal gp ON gp.id = vp.gov_action_proposal_id
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN drep_hash dh ON dh.id = vp.drep_voter
        LEFT JOIN tx t2 ON t2.id = gp.tx_id
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

// --- Governance Analyst Dashboard (fixed schema) ---
app.get("/dashboard/governance-analyst", async (c) => {
  const data = await cached("dash:gov-analyst:v2", 120, async () => {
    const [proposals, voteBreakdown, drepActivity, epochVotes, paramChanges] = await Promise.all([
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, gp.index, gp.type,
        gp.description, gp.deposit::text,
        va.url as voting_anchor_url,
        b.time, b.epoch_no,
        gp.ratified_epoch, gp.enacted_epoch, gp.dropped_epoch, gp.expired_epoch,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'DRep') as drep_votes,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'ConstitutionalCommittee') as cc_votes,
        (SELECT COUNT(*) FROM voting_procedure vp WHERE vp.gov_action_proposal_id = gp.id AND vp.voter_role = 'SPO') as spo_votes
        FROM gov_action_proposal gp
        JOIN tx t ON t.id = gp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN voting_anchor va ON va.id = gp.voting_anchor_id
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
      pool.query(`SELECT encode(dh.raw,'hex') as drep_hash,
        COUNT(*) as vote_count,
        COUNT(*) FILTER (WHERE vp.vote = 'Yes') as yes_votes,
        COUNT(*) FILTER (WHERE vp.vote = 'No') as no_votes,
        COUNT(*) FILTER (WHERE vp.vote = 'Abstain') as abstain_votes,
        MAX(b.time) as last_vote_time
        FROM voting_procedure vp
        JOIN tx t ON t.id = vp.tx_id
        JOIN block b ON b.id = t.block_id
        LEFT JOIN drep_hash dh ON dh.id = vp.drep_voter
        WHERE vp.voter_role = 'DRep'
        GROUP BY dh.raw
        ORDER BY vote_count DESC LIMIT 20`),
      pool.query(`SELECT b.epoch_no,
        COUNT(*) as vote_count,
        COUNT(DISTINCT COALESCE(vp.drep_voter, vp.pool_voter, vp.committee_voter)) as unique_voters
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

// --- Chain Analyst Dashboard (keep existing, it works) ---
app.get("/dashboard/chain-analyst", async (c) => {
  const data = await cached("dash:chain:v2", 30, async () => {
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

// --- Portfolio Dashboard ---
app.get("/dashboard/portfolio/:addr", async (c) => {
  const addr = c.req.param("addr");
  const data = await cached(`dash:port:${addr}`, 30, async () => {
    const [addrInfo, tokens, stakeInfo, recentTxs] = await Promise.all([
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
        LEFT JOIN delegation d ON d.addr_id = sa.id AND d.id = (SELECT MAX(d2.id) FROM delegation d2 WHERE d2.addr_id = sa.id)
        LEFT JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM pool_offline_data pod2 WHERE pod2.pool_id = ph.id)
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
        ORDER BY b.time DESC LIMIT 20`, [addr])
    ]);
    return {
      address: addrInfo.rows[0] || { address: addr, balance: "0" },
      tokens: tokens.rows,
      staking: stakeInfo.rows[0] || null,
      recentTransactions: recentTxs.rows,
      ranking: { rank: "N/A" }
    };
  });
  return c.json(data);
});

// --- Developer Dashboard (fixed - avoid full redeemer scan) ---
app.get("/dashboard/developer", async (c) => {
  const data = await cached("dash:dev:v2", 120, async () => {
    const [scripts, recentContracts, protocolParams, dbStats] = await Promise.all([
      pool.query(`SELECT encode(s.hash,'hex') as hash, s.type, s.serialised_size
        FROM script s
        WHERE s.serialised_size IS NOT NULL
        ORDER BY s.serialised_size DESC LIMIT 20`),
      pool.query(`SELECT encode(t.hash,'hex') as tx_hash, b.time, b.epoch_no,
        t.fee::text, t.size, t.script_size
        FROM tx t
        JOIN block b ON b.id = t.block_id
        WHERE t.script_size > 0
        ORDER BY b.time DESC LIMIT 20`),
      pool.query(`SELECT * FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`),
      pool.query(`SELECT
        (SELECT MAX(no) FROM epoch) as current_epoch,
        (SELECT MAX(block_no) FROM block) as latest_block,
        (SELECT COUNT(*) FROM tx WHERE block_id IN (SELECT id FROM block WHERE epoch_no = (SELECT MAX(no) FROM epoch))) as epoch_txs,
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

# Find insertion point in API file
lines = api_content.rstrip().split("\n")
insert_at = len(lines)
for i in range(len(lines)-1, max(0, len(lines)-30), -1):
    if "app.listen" in lines[i] or "export default" in lines[i] or "serve(" in lines[i]:
        insert_at = i
        break

new_content = "\n".join(lines[:insert_at]) + "\n" + NEW_ENDPOINTS + "\n" + "\n".join(lines[insert_at:])
with open(API_FILE, "w") as f:
    f.write(new_content)
log(f"  Wrote fixed API endpoints")

# ============================================================
# Step 2: Restart API
# ============================================================
info("Restarting API...")
run("sudo systemctl restart adatool-api", cwd="/home/ubuntu")
time.sleep(5)

# ============================================================
# Step 3: Test API endpoints
# ============================================================
info("Testing API endpoints...")
api_routes = [
    ("dashboard/holder", 20),
    ("dashboard/cc", 15),
    ("dashboard/drep", 15),
    ("dashboard/governance-analyst", 20),
    ("dashboard/chain-analyst", 20),
    ("dashboard/developer", 20),
]

all_ok = True
for route, timeout in api_routes:
    code, out, _ = run(f"curl -s http://localhost:3001/{route} --max-time {timeout}")
    if out and not "Internal Server Error" in out:
        try:
            d = json.loads(out)
            keys = list(d.keys()) if isinstance(d, dict) else f"array[{len(d)}]"
            log(f"  API /{route} => OK (keys: {keys})")
        except:
            warn(f"  API /{route} => non-JSON: {out[:100]}")
            all_ok = False
    else:
        err(f"  API /{route} => FAILED: {out[:200] if out else 'timeout/empty'}")
        all_ok = False
        # Try to get error from logs
        _, logout, _ = run("sudo journalctl -u adatool-api --no-pager -n 5 2>&1")
        for line in logout.split("\n"):
            if "error" in line.lower() or "Error" in line:
                warn(f"    LOG: {line.strip()[:200]}")

if not all_ok:
    warn("\nSome API endpoints still failing. Check logs above.")
    # Print relevant recent log lines
    _, logout, _ = run("sudo journalctl -u adatool-api --no-pager -n 30 2>&1")
    print("\n--- Recent API Logs ---")
    for line in logout.split("\n")[-20:]:
        print(f"  {line}")
else:
    log("\nAll API endpoints working!")

# ============================================================
# Step 4: Rebuild frontend (only if API is working)
# ============================================================
if all_ok:
    info("Rebuilding frontend...")
    dotNext = os.path.join(PROJECT, ".next")
    if os.path.isdir(dotNext):
        shutil.rmtree(dotNext)
    code, out, errs = run("npm run build 2>&1", timeout=300)
    build_lines = (out + errs).strip().split("\n")
    for line in build_lines[-20:]:
        print(f"  {line}")
    if code == 0:
        log("BUILD SUCCESS!")
        run("cp -r public .next/standalone/")
        run("cp -r .next/static .next/standalone/.next/")
        run("sudo systemctl restart adatool-frontend")
        time.sleep(10)

        # Test frontend pages
        info("Testing frontend dashboard pages...")
        pages = ["dashboard", "dashboard/holder", "dashboard/spo", "dashboard/cc",
                 "dashboard/drep", "dashboard/governance", "dashboard/chain",
                 "dashboard/portfolio", "dashboard/developer"]
        for p in pages:
            _, out, _ = run(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000/{p} --max-time 25")
            status = out.strip().strip("'")
            if status.startswith("2"):
                log(f"  /{p} => {status}")
            else:
                warn(f"  /{p} => {status}")
    else:
        err("BUILD FAILED!")
else:
    warn("Skipping frontend rebuild until API is fixed")

print("\n" + "="*60)
log("FIX COMPLETE")
print("="*60)
