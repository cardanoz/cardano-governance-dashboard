#!/usr/bin/env python3
"""
Enhancement: Unified ADA Rich List + Fix CHAIN/STAKING Explorer Tabs

This script:
1. Fixes explorer/staking API: pool_offline_data → off_chain_pool_data
2. Fixes explorer/chain API: optimizes expensive epoch subqueries
3. Adds comprehensive /richlist-v2 API endpoint with:
   - Byron addresses, Enterprise addresses, Stake-consolidated addresses
   - Pool delegation, DRep delegation
   - Exchange detection (high tx count + known exchange pools)
   - Self-Gox analysis (last activity date)
   - Lost ADA analysis summary
4. Creates /explorer/richlist frontend page with unified ranking + analysis

Run on server: python3 enhance-richlist-fix-explorer.py
"""

import os
import re

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE = os.path.dirname(os.path.abspath(__file__))
API_FILE = os.path.join(BASE, "adatool-api-index.js")
NAV_SCRIPT = os.path.join(BASE, "restructure-nav-explorer.py")

def info(msg):
    print(f"  ✓ {msg}")

def warn(msg):
    print(f"  ⚠ {msg}")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Fix explorer/staking API - pool_offline_data → off_chain_pool_data
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 1: Fix explorer/staking API (table name) ===")

with open(API_FILE, "r") as f:
    api_code = f.read()

# Count occurrences of the wrong table name
wrong_count = api_code.count("pool_offline_data")
info(f"Found {wrong_count} occurrences of 'pool_offline_data' in API")

# Replace all pool_offline_data with off_chain_pool_data
api_code = api_code.replace("pool_offline_data", "off_chain_pool_data")

info("Replaced pool_offline_data → off_chain_pool_data globally")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Fix explorer/chain API - optimize expensive epoch subqueries
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 2: Optimize explorer/chain API ===")

# The current chain endpoint has expensive subqueries for epoch block count and fees.
# Replace with a simpler approach using epoch table's built-in data + pre-aggregated.

OLD_CHAIN_ENDPOINT = '''// --- Explorer: Chain (blocks + txs + epochs) ---
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
      pool.query(`SELECT e.no, e.start_time, e.end_time,
        (SELECT COUNT(*) FROM block WHERE epoch_no = e.no) as blocks,
        (SELECT COALESCE(SUM(t.fee),0)::text FROM tx t JOIN block b ON b.id = t.block_id WHERE b.epoch_no = e.no) as fees
        FROM epoch e ORDER BY e.no DESC LIMIT 15`)
    ]);
    return { latestBlocks: latestBlocks.rows, latestTxs: latestTxs.rows, epochs: epochs.rows };
  });
  return c.json(data);
});'''

NEW_CHAIN_ENDPOINT = '''// --- Explorer: Chain (blocks + txs + epochs) ---
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
});'''

if OLD_CHAIN_ENDPOINT in api_code:
    api_code = api_code.replace(OLD_CHAIN_ENDPOINT, NEW_CHAIN_ENDPOINT)
    info("Replaced chain endpoint with optimized epoch query (no subqueries)")
else:
    warn("Chain endpoint pattern not found (may have been modified already)")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Fix explorer/staking API - pool_offline_data already fixed above,
#          but also fix the correlated subqueries in pool listing
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 3: Optimize explorer/staking API ===")

OLD_STAKING_ENDPOINT = '''// --- Explorer: Staking (pools + delegations + stake dist + rewards) ---
app.get("/explorer/staking", async (c) => {
  const data = await cached("exp:staking", 30, async () => {
    const [pools, recentDelegations, stakeDist, stats] = await Promise.all([
      pool.query(`SELECT ph.view as pool_id, pod.json->>'name' as name, pod.json->>'ticker' as ticker,
        pu.pledge::text, pu.margin, pu.fixed_cost::text,
        (SELECT COUNT(*) FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as delegators,
        (SELECT COALESCE(SUM(es.amount),0)::text FROM epoch_stake es WHERE es.pool_id = ph.id AND es.epoch_no = (SELECT MAX(no)-1 FROM epoch)) as stake
        FROM pool_hash ph
        JOIN pool_update pu ON pu.id = (SELECT id FROM pool_update pu2 WHERE pu2.hash_id = ph.id ORDER BY pu2.registered_tx_id DESC LIMIT 1)
        LEFT JOIN off_chain_pool_data pod ON pod.pool_id = ph.id AND pod.id = (SELECT MAX(pod2.id) FROM off_chain_pool_data pod2 WHERE pod2.pool_id = ph.id)
        WHERE NOT EXISTS (SELECT 1 FROM pool_retire pr WHERE pr.hash_id = ph.id AND pr.retiring_epoch <= (SELECT MAX(no) FROM epoch))
        ORDER BY stake DESC LIMIT 50`),'''

NEW_STAKING_ENDPOINT = '''// --- Explorer: Staking (pools + delegations + stake dist + rewards) ---
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
        ORDER BY ps.stake::numeric DESC NULLS LAST LIMIT 50`, [prevEpoch]),'''

if OLD_STAKING_ENDPOINT in api_code:
    api_code = api_code.replace(OLD_STAKING_ENDPOINT, NEW_STAKING_ENDPOINT)
    info("Replaced staking pools query with CTE (eliminates correlated subqueries)")
else:
    warn("Staking endpoint pattern not found - trying to fix table names at least")

# Also fix the remaining parts of staking endpoint that use pool_offline_data
# These should already be fixed by the global replace, but let's double check
remaining_pod = api_code.count("pool_offline_data")
if remaining_pod > 0:
    warn(f"Still {remaining_pod} occurrences of pool_offline_data remaining!")
    api_code = api_code.replace("pool_offline_data", "off_chain_pool_data")

# Also fix pod alias references in staking to use ocpd where the query was replaced
# This is fine because the new query already uses ocpd

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Add comprehensive /richlist-v2 API endpoint
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 4: Add comprehensive rich list API ===")

RICHLIST_V2_API = '''
// ═══════════════════════════════════════════════════════════════════════════════
// Rich List V2 - Unified ranking with Byron/Enterprise/Stake + exchange/lost detection
// ═══════════════════════════════════════════════════════════════════════════════

// Known exchange pool tickers (case-insensitive matching)
const EXCHANGE_POOL_TICKERS = new Set([
  "BINA", "BNP", "BNP1", "BNP2", "BNP3", "BNP4",  // Binance
  "COIN", "COINBASE",                                 // Coinbase
  "KRKN", "KRAK",                                     // Kraken
  "BTCM", "BITGO",                                    // BitGo
  "NEXO",                                              // Nexo
  "WHLP",                                              // WhalePools
  "ETORO",                                             // eToro
  "UPBIT", "UPBI",                                     // Upbit
  "HUOBI",                                             // Huobi
  "GATE",                                              // Gate.io
  "OKEX",                                              // OKEx
  "BYBIT",                                             // Bybit
  "BISO",                                              // Bitstamp
  "ROBH",                                              // Robinhood
  "HASH", "HASH0", "HASH1",                           // HashQuark
]);

// Known exchange stake address prefixes (Binance etc.)
const EXCHANGE_STAKE_ADDRS = new Set([
  // Add known exchange stake addresses here as they're identified
]);

app.get("/richlist-v2", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "200"), 500);
  const data = await cached(`richlist_v2:${limit}`, 1800, async () => {
    // Step 1: Get previous completed epoch
    const epochR = await pool.query("SELECT MAX(no) - 1 as e FROM epoch");
    const prevEpoch = epochR.rows[0]?.e || 0;

    // Step 2: Get top stake addresses from epoch_stake (staked ADA)
    const stakedR = await pool.query(`
      SELECT sa.id as addr_id, sa.view as identifier,
             'stake' as addr_type,
             es.amount::text as balance,
             0 as tx_count,
             NULL::timestamp as last_tx_time
      FROM epoch_stake es
      JOIN stake_address sa ON sa.id = es.addr_id
      WHERE es.epoch_no = $1
      ORDER BY es.amount DESC
      LIMIT $2
    `, [prevEpoch, limit]);

    // Step 3: Get top Byron + Enterprise (non-staked) UTXOs
    // Byron addresses: start with 'DdzFF' or 'Ae2'
    // Enterprise/base without stake key: stake_address_id IS NULL
    const unstakedR = await pool.query(`
      SELECT txo.address as identifier,
             CASE
               WHEN txo.address LIKE 'DdzFF%' THEN 'byron'
               WHEN txo.address LIKE 'Ae2%' THEN 'byron'
               ELSE 'enterprise'
             END as addr_type,
             SUM(txo.value)::text as balance
      FROM tx_out txo
      WHERE txo.stake_address_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM tx_in txi
          WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
        )
      GROUP BY txo.address
      HAVING SUM(txo.value) >= 100000000000  -- >= 100K ADA threshold for non-staked
      ORDER BY balance DESC
      LIMIT $1
    `, [limit]);

    // Step 4: Merge and sort all entries
    const allEntries = [...stakedR.rows, ...unstakedR.rows];
    allEntries.sort((a, b) => {
      const aVal = BigInt(a.balance || "0");
      const bVal = BigInt(b.balance || "0");
      if (bVal > aVal) return 1;
      if (bVal < aVal) return -1;
      return 0;
    });
    const topEntries = allEntries.slice(0, limit);

    // Step 5: Enrich staked entries with delegation info (pool + DRep)
    const stakeIds = topEntries
      .filter(e => e.addr_type === "stake" && e.addr_id)
      .map(e => e.addr_id);

    let poolDelegations = {};
    let drepDelegations = {};
    let stakeLastTx = {};

    if (stakeIds.length > 0) {
      // Pool delegation (latest per stake address)
      const poolDelR = await pool.query(`
        SELECT DISTINCT ON (d.addr_id) d.addr_id,
               ph.view as pool_id,
               ocpd.json->>'ticker' as pool_ticker,
               ocpd.json->>'name' as pool_name
        FROM delegation d
        JOIN pool_hash ph ON ph.id = d.pool_hash_id
        LEFT JOIN off_chain_pool_data ocpd ON ocpd.pool_id = ph.id
          AND ocpd.id = (SELECT MAX(id) FROM off_chain_pool_data WHERE pool_id = ph.id)
        WHERE d.addr_id = ANY($1::bigint[])
        ORDER BY d.addr_id, d.tx_id DESC
      `, [stakeIds]);
      for (const row of poolDelR.rows) {
        poolDelegations[row.addr_id] = {
          pool_id: row.pool_id,
          pool_ticker: row.pool_ticker,
          pool_name: row.pool_name,
        };
      }

      // DRep delegation (latest per stake address)
      try {
        const drepDelR = await pool.query(`
          SELECT DISTINCT ON (dv.addr_id) dv.addr_id,
                 dh.view as drep_id, dh.has_script
          FROM delegation_vote dv
          JOIN drep_hash dh ON dh.id = dv.drep_hash_id
          WHERE dv.addr_id = ANY($1::bigint[])
          ORDER BY dv.addr_id, dv.tx_id DESC
        `, [stakeIds]);
        for (const row of drepDelR.rows) {
          drepDelegations[row.addr_id] = {
            drep_id: row.drep_id,
            has_script: row.has_script,
          };
        }
      } catch (e) {
        // delegation_vote may not exist on older db-sync
        console.log("DRep delegation query skipped:", e.message);
      }

      // Last transaction time per stake address
      const lastTxR = await pool.query(`
        SELECT sa_id, MAX(tx_time) as last_tx
        FROM (
          SELECT txo.stake_address_id as sa_id, b.time as tx_time
          FROM tx_out txo
          JOIN tx t ON t.id = txo.tx_id
          JOIN block b ON b.id = t.block_id
          WHERE txo.stake_address_id = ANY($1::bigint[])
          ORDER BY t.id DESC
          LIMIT 5000
        ) sub
        GROUP BY sa_id
      `, [stakeIds]);
      for (const row of lastTxR.rows) {
        stakeLastTx[row.sa_id] = row.last_tx;
      }
    }

    // Step 6: Get last tx time and tx count for Byron/Enterprise addresses
    const nonStakeAddrs = topEntries
      .filter(e => e.addr_type !== "stake")
      .map(e => e.identifier);

    let addrTxInfo = {};
    if (nonStakeAddrs.length > 0) {
      // Batch in groups of 50 to avoid huge IN clauses
      for (let i = 0; i < nonStakeAddrs.length; i += 50) {
        const batch = nonStakeAddrs.slice(i, i + 50);
        const txInfoR = await pool.query(`
          SELECT txo.address,
                 COUNT(DISTINCT txo.tx_id)::int as tx_count,
                 MAX(b.time) as last_tx
          FROM tx_out txo
          JOIN tx t ON t.id = txo.tx_id
          JOIN block b ON b.id = t.block_id
          WHERE txo.address = ANY($1::text[])
          GROUP BY txo.address
        `, [batch]);
        for (const row of txInfoR.rows) {
          addrTxInfo[row.address] = { tx_count: row.tx_count, last_tx: row.last_tx };
        }
      }
    }

    // Step 7: Get tx count for staked addresses (for exchange detection)
    let stakeTxCounts = {};
    if (stakeIds.length > 0) {
      const txCountR = await pool.query(`
        SELECT txo.stake_address_id as sa_id,
               COUNT(DISTINCT txo.tx_id)::int as tx_count
        FROM tx_out txo
        WHERE txo.stake_address_id = ANY($1::bigint[])
        GROUP BY txo.stake_address_id
      `, [stakeIds]);
      for (const row of txCountR.rows) {
        stakeTxCounts[row.sa_id] = row.tx_count;
      }
    }

    // Step 8: Assemble final results with flags
    const results = topEntries.map((entry, idx) => {
      const isStaked = entry.addr_type === "stake";
      const addrId = entry.addr_id;

      // Pool delegation
      const poolDel = isStaked ? poolDelegations[addrId] || null : null;
      const drepDel = isStaked ? drepDelegations[addrId] || null : null;

      // Transaction info
      let txCount = 0;
      let lastTx = null;
      if (isStaked) {
        txCount = stakeTxCounts[addrId] || 0;
        lastTx = stakeLastTx[addrId] || null;
      } else {
        const info = addrTxInfo[entry.identifier] || {};
        txCount = info.tx_count || 0;
        lastTx = info.last_tx || null;
      }

      // Exchange detection
      let isExchange = false;
      let exchangeReason = null;

      // Check 1: Known exchange pool ticker
      if (poolDel?.pool_ticker) {
        const ticker = poolDel.pool_ticker.toUpperCase();
        if (EXCHANGE_POOL_TICKERS.has(ticker)) {
          isExchange = true;
          exchangeReason = "Exchange pool: " + poolDel.pool_ticker;
        }
      }

      // Check 2: Very high tx count (>50000) suggests exchange
      if (!isExchange && txCount > 50000) {
        isExchange = true;
        exchangeReason = "High tx count: " + txCount.toLocaleString();
      }

      // Check 3: Known exchange stake address
      if (!isExchange && EXCHANGE_STAKE_ADDRS.has(entry.identifier)) {
        isExchange = true;
        exchangeReason = "Known exchange address";
      }

      // Self-Gox (lost) detection
      let isLikelyLost = false;
      let lostReason = null;
      const balance = BigInt(entry.balance || "0");

      if (lastTx) {
        const lastTxDate = new Date(lastTx);
        const now = new Date();
        const yearsSinceLastTx = (now - lastTxDate) / (365.25 * 24 * 60 * 60 * 1000);

        // Byron addresses with no activity since Shelley era (2020) are likely lost
        if (entry.addr_type === "byron" && yearsSinceLastTx > 4) {
          isLikelyLost = true;
          lostReason = "Byron address inactive " + yearsSinceLastTx.toFixed(1) + " years";
        }
        // Any address with no activity for 5+ years and large balance
        else if (yearsSinceLastTx > 5 && balance > 10000000000n) { // > 10K ADA
          isLikelyLost = true;
          lostReason = "Inactive " + yearsSinceLastTx.toFixed(1) + " years";
        }
        // Non-staked, non-exchange, 3+ years inactive
        else if (!isStaked && !isExchange && yearsSinceLastTx > 3) {
          isLikelyLost = true;
          lostReason = "Non-staked, inactive " + yearsSinceLastTx.toFixed(1) + " years";
        }
      } else if (entry.addr_type === "byron") {
        // Byron with no tx info at all - likely very old / lost
        isLikelyLost = true;
        lostReason = "Byron address, no recent activity found";
      }

      return {
        rank: idx + 1,
        identifier: entry.identifier,
        addr_type: entry.addr_type,
        balance: entry.balance,
        tx_count: txCount,
        last_tx: lastTx,
        pool: poolDel,
        drep: drepDel,
        is_exchange: isExchange,
        exchange_reason: exchangeReason,
        is_likely_lost: isLikelyLost,
        lost_reason: lostReason,
      };
    });

    // Step 9: Calculate summary statistics
    let totalBalance = 0n;
    let exchangeBalance = 0n;
    let lostBalance = 0n;
    let byronBalance = 0n;
    let enterpriseBalance = 0n;
    let stakeBalance = 0n;
    let exchangeCount = 0;
    let lostCount = 0;
    let byronCount = 0;
    let enterpriseCount = 0;
    let stakeCount = 0;

    for (const r of results) {
      const bal = BigInt(r.balance || "0");
      totalBalance += bal;
      if (r.is_exchange) { exchangeBalance += bal; exchangeCount++; }
      if (r.is_likely_lost) { lostBalance += bal; lostCount++; }
      if (r.addr_type === "byron") { byronBalance += bal; byronCount++; }
      if (r.addr_type === "enterprise") { enterpriseBalance += bal; enterpriseCount++; }
      if (r.addr_type === "stake") { stakeBalance += bal; stakeCount++; }
    }

    const summary = {
      epoch: prevEpoch,
      total_entries: results.length,
      total_balance: totalBalance.toString(),
      exchange: { count: exchangeCount, balance: exchangeBalance.toString() },
      likely_lost: { count: lostCount, balance: lostBalance.toString() },
      by_type: {
        byron: { count: byronCount, balance: byronBalance.toString() },
        enterprise: { count: enterpriseCount, balance: enterpriseBalance.toString() },
        stake: { count: stakeCount, balance: stakeBalance.toString() },
      },
    };

    return { summary, entries: results };
  });
  return c.json(data);
});

// ─── Lost ADA Analysis endpoint ──
app.get("/lost-ada-analysis", async (c) => {
  const data = await cached("lost_ada_analysis", 3600, async () => {
    // Byron addresses with large balances - potential lost ADA
    const byronR = await pool.query(`
      SELECT txo.address as identifier,
             SUM(txo.value)::text as balance,
             COUNT(DISTINCT txo.tx_id)::int as tx_count,
             MAX(b.time) as last_tx
      FROM tx_out txo
      JOIN tx t ON t.id = txo.tx_id
      JOIN block b ON b.id = t.block_id
      WHERE txo.stake_address_id IS NULL
        AND (txo.address LIKE 'DdzFF%' OR txo.address LIKE 'Ae2%')
        AND NOT EXISTS (
          SELECT 1 FROM tx_in txi
          WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
        )
      GROUP BY txo.address
      HAVING SUM(txo.value) >= 1000000000  -- >= 1K ADA
      ORDER BY balance DESC
      LIMIT 500
    `);

    // Categorize by last activity period
    const now = new Date();
    const buckets = {
      "active_recent": { label: "< 1 year", count: 0, balance: 0n },
      "dormant_1_3": { label: "1-3 years", count: 0, balance: 0n },
      "dormant_3_5": { label: "3-5 years", count: 0, balance: 0n },
      "likely_lost_5plus": { label: "5+ years (likely lost)", count: 0, balance: 0n },
      "unknown": { label: "Unknown last activity", count: 0, balance: 0n },
    };

    const entries = byronR.rows.map(row => {
      const bal = BigInt(row.balance || "0");
      let category = "unknown";
      let yearsSince = null;

      if (row.last_tx) {
        yearsSince = (now - new Date(row.last_tx)) / (365.25 * 24 * 60 * 60 * 1000);
        if (yearsSince < 1) category = "active_recent";
        else if (yearsSince < 3) category = "dormant_1_3";
        else if (yearsSince < 5) category = "dormant_3_5";
        else category = "likely_lost_5plus";
      }

      buckets[category].count++;
      buckets[category].balance += bal;

      return {
        address: row.identifier.slice(0, 30) + "...",
        full_address: row.identifier,
        balance: row.balance,
        tx_count: row.tx_count,
        last_tx: row.last_tx,
        years_since_last_tx: yearsSince ? yearsSince.toFixed(1) : null,
        category,
      };
    });

    // Convert BigInt balances to strings for JSON
    const bucketsOut = {};
    for (const [key, val] of Object.entries(buckets)) {
      bucketsOut[key] = { ...val, balance: val.balance.toString() };
    }

    // Also check non-Byron non-staked addresses with very old last tx
    const enterpriseOldR = await pool.query(`
      SELECT txo.address as identifier,
             SUM(txo.value)::text as balance,
             MAX(b.time) as last_tx
      FROM tx_out txo
      JOIN tx t ON t.id = txo.tx_id
      JOIN block b ON b.id = t.block_id
      WHERE txo.stake_address_id IS NULL
        AND txo.address NOT LIKE 'DdzFF%'
        AND txo.address NOT LIKE 'Ae2%'
        AND NOT EXISTS (
          SELECT 1 FROM tx_in txi
          WHERE txi.tx_out_id = txo.tx_id AND txi.tx_out_index = txo.index
        )
      GROUP BY txo.address
      HAVING SUM(txo.value) >= 10000000000  -- >= 10K ADA
      ORDER BY balance DESC
      LIMIT 200
    `);

    let enterpriseLostBalance = 0n;
    let enterpriseLostCount = 0;
    for (const row of enterpriseOldR.rows) {
      if (row.last_tx) {
        const years = (now - new Date(row.last_tx)) / (365.25 * 24 * 60 * 60 * 1000);
        if (years > 3) {
          enterpriseLostBalance += BigInt(row.balance || "0");
          enterpriseLostCount++;
        }
      }
    }

    return {
      byron_analysis: {
        total_entries: entries.length,
        buckets: bucketsOut,
        top_entries: entries.slice(0, 100),
      },
      enterprise_analysis: {
        likely_lost_count: enterpriseLostCount,
        likely_lost_balance: enterpriseLostBalance.toString(),
      },
    };
  });
  return c.json(data);
});
'''

# Insert before the last app.listen or serve line
# Find the serve/listen line
serve_match = re.search(r'^(serve\(|app\.listen)', api_code, re.MULTILINE)
if serve_match:
    insert_pos = serve_match.start()
    api_code = api_code[:insert_pos] + RICHLIST_V2_API + "\n" + api_code[insert_pos:]
    info("Inserted richlist-v2 and lost-ada-analysis endpoints")
else:
    # Append before end
    api_code += "\n" + RICHLIST_V2_API
    warn("Could not find serve() - appended endpoints at end")

# Write the updated API file
with open(API_FILE, "w") as f:
    f.write(api_code)
info("API file updated successfully")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Also fix the restructure-nav-explorer.py for future re-runs
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 5: Fix table names in restructure-nav-explorer.py ===")

if os.path.exists(NAV_SCRIPT):
    with open(NAV_SCRIPT, "r") as f:
        nav_code = f.read()
    count = nav_code.count("pool_offline_data")
    if count > 0:
        nav_code = nav_code.replace("pool_offline_data", "off_chain_pool_data")
        with open(NAV_SCRIPT, "w") as f:
            f.write(nav_code)
        info(f"Fixed {count} occurrences in restructure-nav-explorer.py")
    else:
        info("restructure-nav-explorer.py already clean")
else:
    warn("restructure-nav-explorer.py not found")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Create Rich List frontend page
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 6: Create Rich List frontend page ===")

RICHLIST_DIR = os.path.join(BASE, "pages", "richlist")
os.makedirs(RICHLIST_DIR, exist_ok=True)

RICHLIST_PAGE = r'''
export const dynamic = "force-dynamic";

import Link from "next/link";

async function fetchAPI(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const r = await fetch(`${base}${path}`, { next: { revalidate: 0 } });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function fmtAda(lovelace: string | number): string {
  const n = Number(BigInt(String(lovelace || "0")) / 1000000n);
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function truncAddr(addr: string, len = 20): string {
  if (!addr) return "";
  if (addr.length <= len) return addr;
  return addr.slice(0, len) + "...";
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days/30)}mo ago`;
  return `${(days/365).toFixed(1)}y ago`;
}

interface RichEntry {
  rank: number;
  identifier: string;
  addr_type: "stake" | "byron" | "enterprise";
  balance: string;
  tx_count: number;
  last_tx: string | null;
  pool: { pool_id: string; pool_ticker: string; pool_name: string } | null;
  drep: { drep_id: string; has_script: boolean } | null;
  is_exchange: boolean;
  exchange_reason: string | null;
  is_likely_lost: boolean;
  lost_reason: string | null;
}

interface Summary {
  epoch: number;
  total_entries: number;
  total_balance: string;
  exchange: { count: number; balance: string };
  likely_lost: { count: number; balance: string };
  by_type: {
    byron: { count: number; balance: string };
    enterprise: { count: number; balance: string };
    stake: { count: number; balance: string };
  };
}

interface LostAnalysis {
  byron_analysis: {
    total_entries: number;
    buckets: Record<string, { label: string; count: number; balance: string }>;
    top_entries: Array<{
      address: string;
      full_address: string;
      balance: string;
      tx_count: number;
      last_tx: string | null;
      years_since_last_tx: string | null;
      category: string;
    }>;
  };
  enterprise_analysis: {
    likely_lost_count: number;
    likely_lost_balance: string;
  };
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    stake: "bg-green-500/20 text-green-400 border-green-500/30",
    byron: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    enterprise: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  const labels: Record<string, string> = {
    stake: "Stake",
    byron: "Byron",
    enterprise: "Enterprise",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${colors[type] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {labels[type] || type}
    </span>
  );
}

function FlagBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  );
}

export default async function RichListPage() {
  const [richData, lostData] = await Promise.all([
    fetchAPI("/richlist-v2?limit=200"),
    fetchAPI("/lost-ada-analysis"),
  ]) as [{ summary: Summary; entries: RichEntry[] } | null, LostAnalysis | null];

  if (!richData) {
    return <div className="p-8 text-center text-gray-400">Failed to load rich list data</div>;
  }

  const { summary, entries } = richData;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ADA Rich List</h1>
      <p className="text-gray-400 text-sm">
        Unified ranking: Stake addresses + Byron addresses + Enterprise addresses
        <span className="text-gray-500 ml-2">Epoch {summary.epoch}</span>
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Top {summary.total_entries} Balance</div>
          <div className="text-lg font-bold text-white">{fmtAda(summary.total_balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Exchange Flagged</div>
          <div className="text-lg font-bold text-red-400">{summary.exchange.count}</div>
          <div className="text-xs text-gray-500">{fmtAda(summary.exchange.balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">Likely Lost / Self-Gox</div>
          <div className="text-lg font-bold text-amber-400">{summary.likely_lost.count}</div>
          <div className="text-xs text-gray-500">{fmtAda(summary.likely_lost.balance)} ADA</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-gray-400 text-xs">By Type</div>
          <div className="text-xs space-y-1 mt-1">
            <div className="flex justify-between"><span className="text-green-400">Stake</span><span>{summary.by_type.stake.count}</span></div>
            <div className="flex justify-between"><span className="text-amber-400">Byron</span><span>{summary.by_type.byron.count}</span></div>
            <div className="flex justify-between"><span className="text-blue-400">Enterprise</span><span>{summary.by_type.enterprise.count}</span></div>
          </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 text-xs">
                <th className="text-left py-3 px-4">#</th>
                <th className="text-left py-3">Type</th>
                <th className="text-left py-3">Address</th>
                <th className="text-right py-3 px-4">Balance (ADA)</th>
                <th className="text-right py-3">TXs</th>
                <th className="text-left py-3 px-2">Pool</th>
                <th className="text-left py-3 px-2">DRep</th>
                <th className="text-right py-3 px-2">Last TX</th>
                <th className="text-center py-3 px-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.rank} className={`border-b border-gray-700/30 hover:bg-gray-700/20 ${e.is_exchange ? "bg-red-500/5" : e.is_likely_lost ? "bg-amber-500/5" : ""}`}>
                  <td className="py-2 px-4 font-bold text-gray-500">{e.rank}</td>
                  <td className="py-2"><TypeBadge type={e.addr_type} /></td>
                  <td className="py-2">
                    <Link href={e.addr_type === "stake" ? `/address/${e.identifier}` : `/address/${e.identifier}`}
                      className="text-blue-400 hover:underline font-mono text-xs">
                      {truncAddr(e.identifier, 24)}
                    </Link>
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-bold">{fmtAda(e.balance)}</td>
                  <td className="py-2 text-right text-gray-400">{e.tx_count > 0 ? e.tx_count.toLocaleString() : "—"}</td>
                  <td className="py-2 px-2 text-xs">
                    {e.pool ? (
                      <Link href={`/pool/${e.pool.pool_id}`} className="text-purple-400 hover:underline">
                        {e.pool.pool_ticker || e.pool.pool_id?.slice(0, 12)}
                      </Link>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {e.drep ? (
                      <span className="text-cyan-400">{truncAddr(e.drep.drep_id, 12)}</span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-xs text-gray-400">
                    {e.last_tx ? timeAgo(e.last_tx) : "—"}
                  </td>
                  <td className="py-2 px-4 text-center space-x-1">
                    {e.is_exchange && <FlagBadge label="EXCHANGE" color="bg-red-500/20 text-red-400" />}
                    {e.is_likely_lost && <FlagBadge label="LOST?" color="bg-amber-500/20 text-amber-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lost ADA Analysis Section */}
      {lostData && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mt-8">Lost ADA Analysis (Self-Gox)</h2>
          <p className="text-gray-400 text-sm">
            Analysis of Byron-era and dormant addresses that may have lost access to their ADA
          </p>

          {/* Byron Buckets */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Byron Address Activity Distribution</h3>
            <div className="space-y-3">
              {Object.entries(lostData.byron_analysis.buckets).map(([key, bucket]) => {
                const maxBal = Math.max(...Object.values(lostData.byron_analysis.buckets).map(b => Number(BigInt(b.balance) / 1000000n)));
                const pct = maxBal > 0 ? (Number(BigInt(bucket.balance) / 1000000n) / maxBal) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 text-gray-400 text-sm">{bucket.label}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full flex items-center px-2 ${
                          key === "likely_lost_5plus" ? "bg-red-500/60" :
                          key.startsWith("dormant") ? "bg-amber-500/60" : "bg-green-500/60"
                        }`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      >
                        <span className="text-xs whitespace-nowrap">{fmtAda(bucket.balance)} ADA</span>
                      </div>
                    </div>
                    <span className="text-gray-400 w-16 text-right text-xs">{bucket.count} addrs</span>
                  </div>
                );
              })}
            </div>

            {/* Enterprise lost */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Enterprise (non-staked, non-Byron) addresses inactive 3+ years:
                <span className="text-amber-400 font-bold ml-2">
                  {lostData.enterprise_analysis.likely_lost_count} addresses
                </span>
                <span className="text-gray-500 ml-2">
                  ({fmtAda(lostData.enterprise_analysis.likely_lost_balance)} ADA)
                </span>
              </div>
            </div>
          </div>

          {/* Top Lost Byron Addresses */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold">Top Byron Addresses by Balance (1K+ ADA)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-xs">
                    <th className="text-left py-2 px-4">Address</th>
                    <th className="text-right py-2">Balance (ADA)</th>
                    <th className="text-right py-2">TXs</th>
                    <th className="text-right py-2">Last Activity</th>
                    <th className="text-right py-2 px-4">Years Inactive</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(lostData.byron_analysis.top_entries || []).slice(0, 50).map((e, i) => (
                    <tr key={i} className={`border-b border-gray-700/30 hover:bg-gray-700/20 ${
                      e.category === "likely_lost_5plus" ? "bg-red-500/5" :
                      e.category.startsWith("dormant") ? "bg-amber-500/5" : ""
                    }`}>
                      <td className="py-2 px-4 font-mono text-xs text-blue-400">
                        <Link href={`/address/${e.full_address}`} className="hover:underline">{e.address}</Link>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">{fmtAda(e.balance)}</td>
                      <td className="py-2 text-right text-gray-400">{e.tx_count}</td>
                      <td className="py-2 text-right text-gray-400 text-xs">{e.last_tx ? timeAgo(e.last_tx) : "—"}</td>
                      <td className="py-2 text-right px-4 text-gray-400">{e.years_since_last_tx || "—"}</td>
                      <td className="py-2 text-center">
                        {e.category === "likely_lost_5plus"
                          ? <FlagBadge label="LIKELY LOST" color="bg-red-500/20 text-red-400" />
                          : e.category.startsWith("dormant")
                          ? <FlagBadge label="DORMANT" color="bg-amber-500/20 text-amber-400" />
                          : <FlagBadge label="ACTIVE" color="bg-green-500/20 text-green-400" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Data from epoch {summary.epoch} • Balances via epoch_stake + UTXO scan •
        Exchange detection uses pool tickers + tx volume heuristics •
        Self-Gox detection based on last activity date
      </div>
    </div>
  );
}
'''.strip()

with open(os.path.join(RICHLIST_DIR, "page.tsx"), "w") as f:
    f.write(RICHLIST_PAGE)
info(f"Created pages/richlist/page.tsx")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: Build and deploy
# ═══════════════════════════════════════════════════════════════════════════════

print("\n=== Step 7: Summary ===")
print("""
Changes made:
  1. API: Fixed pool_offline_data → off_chain_pool_data globally
  2. API: Optimized explorer/chain endpoint (epoch query uses built-in columns)
  3. API: Optimized explorer/staking endpoint (CTE instead of correlated subqueries)
  4. API: Added /richlist-v2 endpoint (unified Byron/Enterprise/Stake ranking)
  5. API: Added /lost-ada-analysis endpoint (Self-Gox detection)
  6. Script: Fixed table names in restructure-nav-explorer.py
  7. Frontend: Created pages/richlist/page.tsx

Deployment steps:
  1. Push from Mac:
     git stash && git pull --rebase origin main && git push origin main && git stash pop

  2. On server:
     cd ~/cardano-governance-dashboard && git pull origin main
     python3 enhance-richlist-fix-explorer.py

  3. Restart API:
     sudo systemctl restart adatool-api

  4. Rebuild frontend:
     cd ~/adatool-frontend
     # Copy the new page
     mkdir -p src/app/\\(explorer\\)/richlist
     cp ~/cardano-governance-dashboard/pages/richlist/page.tsx src/app/\\(explorer\\)/richlist/page.tsx
     npm run build
     cp -r public .next/standalone/
     cp -r .next/static .next/standalone/.next/
     sudo systemctl restart adatool-frontend

  5. Verify:
     curl -s http://localhost:3001/explorer/chain | head -c 200
     curl -s http://localhost:3001/explorer/staking | head -c 200
     curl -s http://localhost:3001/richlist-v2?limit=5 | python3 -m json.tool | head -50
     curl -s http://localhost:3001/lost-ada-analysis | python3 -m json.tool | head -50
""")
