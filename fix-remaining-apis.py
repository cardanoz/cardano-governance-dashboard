#!/usr/bin/env python3
"""
Fix remaining API issues:
- /dashboard/holder: 42P01 error (missing table) - likely pool_offline_data.json column issue
- /dashboard/drep: timeout - delegation_vote counting too slow
- /dashboard/chain-analyst: timeout - epoch trend queries too heavy

Run on server: python3 fix-remaining-apis.py
"""
import subprocess, json, time, os

G = "\033[32m"; Y = "\033[33m"; R = "\033[31m"; C = "\033[36m"; N = "\033[0m"
def log(msg): print(f"{G}[OK]{N} {msg}")
def warn(msg): print(f"{Y}[WARN]{N} {msg}")
def err(msg): print(f"{R}[ERR]{N} {msg}")
def info(msg): print(f"{C}[INFO]{N} {msg}")

def run(cmd, timeout=30):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"

def psql(q, timeout=15):
    code, out, errs = run(f'sudo -u postgres psql -d archive -t -A -c "{q}"', timeout)
    return out.strip(), errs.strip()

API_FILE = "/home/ubuntu/adatool-api/src/index.js"

# ============================================================
# Diagnose specific issues
# ============================================================
print("="*60)
info("DIAGNOSING REMAINING ISSUES...")

# Check pool_offline_data columns
out, _ = psql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pool_offline_data' ORDER BY ordinal_position")
log(f"pool_offline_data schema: {out.replace(chr(10), ' | ')}")

# Check if json column exists with different name
out, _ = psql("SELECT * FROM pool_offline_data LIMIT 1")
log(f"pool_offline_data sample: {out[:300]}")

# Test the holder query pieces individually
info("Testing holder query components...")

# 1. Epoch query
out, e = psql("SELECT e.no FROM epoch e ORDER BY e.no DESC LIMIT 1")
log(f"  Max epoch: {out}")

# 2. Pool query (the likely culprit with pool_offline_data)
out, e = psql("SELECT ph.view, pu.pledge::text FROM pool_hash ph JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1) LIMIT 1")
if out:
    log(f"  Pool base query OK: {out[:100]}")
else:
    warn(f"  Pool base error: {e[:200]}")

# 3. pool_offline_data join
out, e = psql("SELECT pod.id FROM pool_offline_data pod LIMIT 1")
if out:
    log(f"  pool_offline_data exists: {out}")
else:
    warn(f"  pool_offline_data error: {e[:200]}")

# Check pod.json specifically
out, e = psql("SELECT pod.json FROM pool_offline_data pod LIMIT 1")
if out:
    log(f"  pod.json works: {out[:100]}")
else:
    warn(f"  pod.json error: {e[:200]}")
    # Try alternative column names
    for col in ['metadata', 'json_data', 'offline_data', 'ticker_name']:
        out2, _ = psql(f"SELECT {col} FROM pool_offline_data LIMIT 1")
        if out2:
            log(f"  Found alternative column: {col} = {out2[:100]}")

# 4. Test delegation_vote count speed
info("Testing delegation_vote performance...")
out, e = psql("SELECT COUNT(*) FROM delegation_vote LIMIT 1")
log(f"  delegation_vote total: {out}")

# Quick DRep query test
out, e = psql("SELECT dh.view, (SELECT COUNT(*) FROM delegation_vote dv WHERE dv.drep_hash_id = dh.id) as cnt FROM drep_hash dh ORDER BY cnt DESC LIMIT 3", 10)
if out:
    log(f"  DRep delegation count OK: {out[:200]}")
else:
    warn(f"  DRep delegation count slow/error: {e[:200]}")

# 5. Test chain-analyst epoch trend query
info("Testing chain-analyst epoch trend...")
out, e = psql("SELECT e.no, (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks FROM epoch e ORDER BY e.no DESC LIMIT 3", 15)
if out:
    log(f"  Epoch block count OK: {out[:200]}")
else:
    warn(f"  Epoch block count slow: {e[:200]}")

# Slower part: tx count per epoch
out, e = psql("SELECT COUNT(*) FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = (SELECT MAX(no) FROM epoch)", 15)
if out:
    log(f"  Current epoch tx count: {out}")
else:
    warn(f"  Tx count per epoch slow: {e[:200]}")

# Test the 24h tx count
out, e = psql("SELECT COUNT(*) FROM block WHERE time > NOW() - INTERVAL '24 hours'", 10)
if out:
    log(f"  24h block count: {out}")
else:
    warn(f"  24h block count slow: {e[:200]}")

# ============================================================
# Apply fixes
# ============================================================
print("\n" + "="*60)
info("APPLYING FIXES...")

with open(API_FILE, "r") as f:
    content = f.read()

# Fix 1: holder dashboard - simplify pool query, handle pod.json issue
# The issue is likely pod.json->>'name' if the column is named differently
# Let's use a try/catch approach or simpler queries

# Find and replace the holder endpoint
old_holder_start = '// --- Holder Dashboard ---\napp.get("/dashboard/holder"'
if old_holder_start in content:
    # Find the end of this endpoint
    start = content.index(old_holder_start)
    # Find the next endpoint marker
    next_markers = ['// --- SPO Dashboard ---', '// --- CC Dashboard']
    end = len(content)
    for m in next_markers:
        idx = content.find(m, start + 10)
        if idx > 0 and idx < end:
            end = idx

    new_holder = r'''// --- Holder Dashboard ---
app.get("/dashboard/holder", async (c) => {
  try {
    const data = await cached("dash:holder:v3", 30, async () => {
      const [epoch, params, stats, topPools] = await Promise.all([
        pool.query(`SELECT e.no, e.start_time, e.end_time,
          (SELECT MAX(block_no) FROM block WHERE epoch_no = e.no) as blocks
          FROM epoch e ORDER BY e.no DESC LIMIT 1`),
        pool.query(`SELECT min_fee_a, min_fee_b, key_deposit, pool_deposit,
          optimal_pool_count, min_pool_cost,
          monetary_expand_rate, treasury_growth_rate, protocol_major
          FROM epoch_param ORDER BY epoch_no DESC LIMIT 1`),
        pool.query(`SELECT
          (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_staked,
          (SELECT COUNT(DISTINCT es.addr_id) FROM epoch_stake es WHERE es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as total_stakers,
          (SELECT COUNT(*) FROM pool_hash ph
           WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))) as active_pools,
          (SELECT treasury FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as treasury,
          (SELECT reserves FROM ada_pots ORDER BY epoch_no DESC LIMIT 1)::text as reserves`),
        pool.query(`SELECT ph.view as pool_id,
          pu.pledge::text, pu.margin, pu.fixed_cost::text,
          (SELECT COALESCE(SUM(es2.amount),0)::text FROM epoch_stake es2 WHERE es2.pool_id = ph.id AND es2.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake,
          (SELECT COUNT(*) FROM epoch_stake es3 WHERE es3.pool_id = ph.id AND es3.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators
          FROM pool_hash ph
          JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
          WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))
          ORDER BY stake DESC LIMIT 10`)
      ]);
      const ep = epoch.rows[0] || {};
      const progress = ep.end_time && ep.start_time ?
        Math.min(100, Math.max(0, ((Date.now() - new Date(ep.start_time).getTime()) / (new Date(ep.end_time).getTime() - new Date(ep.start_time).getTime())) * 100)).toFixed(1) : "0";

      // Try to get pool names separately (pod.json may not exist in this schema)
      let poolNames = {};
      try {
        const names = await pool.query(`SELECT ph.view as pool_id, pod.json->>'name' as name, pod.json->>'ticker' as ticker
          FROM pool_hash ph
          LEFT JOIN pool_offline_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM pool_offline_data pod2 WHERE pod2.pool_id = ph.id)
          WHERE ph.view = ANY($1)`, [topPools.rows.map(p => p.pool_id)]);
        for (const r of names.rows) poolNames[r.pool_id] = { name: r.name, ticker: r.ticker };
      } catch(e) { /* pod.json column may not exist */ }

      return {
        currentEpoch: { ...ep, progress },
        protocolParams: params.rows[0] || {},
        networkStats: stats.rows[0] || {},
        topPools: topPools.rows.map(p => ({ ...p, name: poolNames[p.pool_id]?.name || null, ticker: poolNames[p.pool_id]?.ticker || null }))
      };
    });
    return c.json(data);
  } catch(e) { console.error("holder error:", e); return c.json({ error: e.message }, 500); }
});

'''
    content = content[:start] + new_holder + content[end:]
    log("Fixed holder dashboard endpoint")

# Fix 2: DRep dashboard - avoid slow delegation_vote subquery per drep
old_drep_start = '// --- DRep Dashboard (fixed schema) ---\napp.get("/dashboard/drep"'
if old_drep_start in content:
    start = content.index(old_drep_start)
    next_markers = ['// --- Governance Analyst Dashboard', '// --- Chain Analyst Dashboard']
    end = len(content)
    for m in next_markers:
        idx = content.find(m, start + 10)
        if idx > 0 and idx < end:
            end = idx

    new_drep = r'''// --- DRep Dashboard (fixed schema) ---
app.get("/dashboard/drep", async (c) => {
  try {
    const data = await cached("dash:drep:v3", 60, async () => {
      const [topDreps, proposals, recentVotes, stats] = await Promise.all([
        pool.query(`SELECT encode(dh.raw,'hex') as drep_hash, dh.view, dh.has_script, cnt.delegator_count
          FROM drep_hash dh
          LEFT JOIN (SELECT drep_hash_id, COUNT(*) as delegator_count FROM delegation_vote GROUP BY drep_hash_id) cnt ON cnt.drep_hash_id = dh.id
          ORDER BY cnt.delegator_count DESC NULLS LAST LIMIT 20`),
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
          COALESCE(encode(dh.raw,'hex'),'') as voter_hash,
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
          (SELECT COUNT(*) FROM drep_hash) as total_dreps,
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
  } catch(e) { console.error("drep error:", e); return c.json({ error: e.message }, 500); }
});

'''
    content = content[:start] + new_drep + content[end:]
    log("Fixed DRep dashboard endpoint")

# Fix 3: Chain analyst - reduce epoch trend from 10 to 5, simplify tx counts
old_chain_start = '// --- Chain Analyst Dashboard (keep existing, it works) ---\napp.get("/dashboard/chain-analyst"'
if old_chain_start in content:
    start = content.index(old_chain_start)
    next_markers = ['// --- Portfolio Dashboard', '// --- Developer Dashboard']
    end = len(content)
    for m in next_markers:
        idx = content.find(m, start + 10)
        if idx > 0 and idx < end:
            end = idx

    new_chain = r'''// --- Chain Analyst Dashboard ---
app.get("/dashboard/chain-analyst", async (c) => {
  try {
    const data = await cached("dash:chain:v3", 60, async () => {
      const [epochTrend, blockStats, feeStats, pots] = await Promise.all([
        pool.query(`SELECT e.no, e.start_time,
          (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks,
          (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as total_fees
          FROM epoch e ORDER BY e.no DESC LIMIT 5`),
        pool.query(`SELECT
          (SELECT COUNT(*) FROM block WHERE time > NOW() - INTERVAL '24 hours') as blocks_24h,
          (SELECT MAX(block_no) FROM block) as latest_block,
          (SELECT COALESCE(AVG(size),0)::numeric(10,0) FROM block WHERE time > NOW() - INTERVAL '1 hour') as avg_block_size,
          (SELECT COALESCE(AVG(tx_count),0)::numeric(10,1) FROM block WHERE time > NOW() - INTERVAL '1 hour') as avg_tx_per_block,
          (SELECT COUNT(*) FROM block WHERE time > NOW() - INTERVAL '1 hour') as blocks_1h`),
        pool.query(`SELECT b.epoch_no,
          COALESCE(SUM(t.fee),0)::text as total_fees,
          COUNT(t.id) as tx_count
          FROM block b JOIN tx t ON t.block_id = b.id
          WHERE b.epoch_no >= (SELECT MAX(no)-3 FROM epoch)
          GROUP BY b.epoch_no ORDER BY b.epoch_no`),
        pool.query(`SELECT epoch_no, treasury::text, reserves::text, rewards::text,
          utxo::text, deposits_stake::text, fees::text
          FROM ada_pots ORDER BY epoch_no DESC LIMIT 10`)
      ]);
      // Estimate 24h tx from recent blocks
      const bs = blockStats.rows[0] || {};
      const estimatedTx24h = Math.round(Number(bs.blocks_24h || 0) * Number(bs.avg_tx_per_block || 0));
      return {
        epochTrend: epochTrend.rows,
        txStats: { tx_24h: estimatedTx24h, blocks_24h: bs.blocks_24h, avg_block_size: bs.avg_block_size },
        blockStats: bs,
        feesByEpoch: feeStats.rows,
        adaPots: pots.rows
      };
    });
    return c.json(data);
  } catch(e) { console.error("chain error:", e); return c.json({ error: e.message }, 500); }
});

'''
    content = content[:start] + new_chain + content[end:]
    log("Fixed chain-analyst dashboard endpoint")

# Write the fixed API
with open(API_FILE, "w") as f:
    f.write(content)
log("API file written")

# Restart API
info("Restarting API...")
run("sudo systemctl restart adatool-api", timeout=10)
time.sleep(5)

# Test all endpoints
info("Testing all dashboard API endpoints...")
endpoints = [
    ("dashboard/holder", 20),
    ("dashboard/cc", 15),
    ("dashboard/drep", 20),
    ("dashboard/governance-analyst", 20),
    ("dashboard/chain-analyst", 20),
    ("dashboard/developer", 20),
]

all_ok = True
for ep, timeout in endpoints:
    code, out, _ = run(f"curl -s http://localhost:3001/{ep} --max-time {timeout}")
    if out and "Internal Server Error" not in out and "error" not in out[:50]:
        try:
            d = json.loads(out)
            log(f"  /{ep} => OK (keys: {list(d.keys()) if isinstance(d, dict) else 'array'})")
        except:
            warn(f"  /{ep} => non-JSON: {out[:100]}")
            all_ok = False
    else:
        err(f"  /{ep} => FAILED: {out[:300] if out else 'timeout'}")
        all_ok = False

if all_ok:
    log("\nAll API endpoints working!")
else:
    warn("\nSome endpoints still have issues")
    _, logout, _ = run("sudo journalctl -u adatool-api --no-pager -n 15 2>&1")
    for line in logout.split("\n")[-10:]:
        if "error" in line.lower() or "Error" in line:
            print(f"  {line.strip()[:200]}")

print("\n" + "="*60)
log("FIX COMPLETE")
print("="*60)
