#!/usr/bin/env node
/**
 * Backfill DRep Stake History from Blockfrost API
 *
 * Fetches DRep list for each of the last N epochs and builds historical snapshots.
 * Blockfrost endpoint: GET /governance/dreps?order=desc (sorted by voting_power)
 *
 * Usage:
 *   BLOCKFROST_API_KEY=mainnetXXX node scripts/fetch-history-backfill.js [epochs]
 *
 * Default: last 10 epochs
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BLOCKFROST_API_KEY;
if (!API_KEY) { console.error("ERROR: Set BLOCKFROST_API_KEY env var"); process.exit(1); }

const BASE = "https://cardano-mainnet.blockfrost.io/api/v0";
const DATA_DIR = path.resolve(__dirname, "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "drep-history.json");
const NUM_EPOCHS = parseInt(process.argv[2]) || 10;
const TOP_N = 50;
const THROTTLE_MS = 120;

let apiCalls = 0;
let lastFetch = 0;

function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetch));
    setTimeout(() => {
      lastFetch = Date.now();
      apiCalls++;
      const req = https.get(`${BASE}${urlPath}`, {
        headers: { project_id: API_KEY, Accept: "application/json" },
        timeout: 30000,
      }, res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn("  Rate limited, wait 3s...");
            return setTimeout(() => fetchJSON(urlPath).then(resolve).catch(reject), 3000);
          }
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    }, wait);
  });
}

async function fetchAllPages(urlPath, maxPages = 30) {
  let all = [];
  for (let p = 1; p <= maxPages; p++) {
    const sep = urlPath.includes("?") ? "&" : "?";
    const page = await fetchJSON(`${urlPath}${sep}page=${p}&count=100`);
    if (!page || page.length === 0) break;
    all = all.concat(page);
    if (page.length < 100) break;
  }
  return all;
}

// Epoch timestamp: Shelley epoch 208 started at Unix 1596059091
function epochToTimestamp(epoch) {
  return (1596059091 + (epoch - 208) * 432000) * 1000;
}

async function main() {
  console.log(`Fetching DRep stake history for last ${NUM_EPOCHS} epochs...\n`);

  // 1. Get current epoch
  const latest = await fetchJSON("/epochs/latest");
  const currentEpoch = latest.epoch;
  console.log(`Current epoch: ${currentEpoch}\n`);

  // 2. Load existing history
  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE))
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) { history = []; }
  const existingEpochs = new Set(history.map(s => s.epoch));

  // 3. For each epoch, fetch DRep list (current state for current epoch,
  //    but Blockfrost /governance/dreps only returns current state)
  //    So we use a different approach: fetch individual DRep info for each epoch
  //    Actually, Blockfrost doesn't support per-epoch DRep queries.
  //    BUT we can fetch the current DRep list and that gives us one snapshot.
  //
  //    For REAL historical data, we need to use the current fetch mechanism
  //    (accumulate over time). So let's just ensure we capture NOW properly,
  //    and for past epochs, check if there's any Koios data available.

  // Try Koios API for historical data (free, no API key needed)
  console.log("Attempting Koios API for historical epoch data...");

  const startEpoch = currentEpoch - NUM_EPOCHS + 1;
  let newSnapshots = 0;

  for (let epoch = startEpoch; epoch <= currentEpoch; epoch++) {
    if (existingEpochs.has(epoch)) {
      console.log(`  E${epoch}: already exists, skipping`);
      continue;
    }

    console.log(`  E${epoch}: fetching from Koios...`);
    try {
      // Koios drep_list with epoch filter
      const resp = await fetchKoios("/drep_list", { _epoch_no: epoch });
      if (!resp || resp.length === 0) {
        console.log(`    No data available for E${epoch}`);
        continue;
      }

      // Filter and sort
      const filtered = resp
        .filter(d => d.drep_id !== "drep_always_abstain" && Number(d.active_stake || d.amount || 0) > 0)
        .sort((a, b) => Number(b.active_stake || b.amount || 0) - Number(a.active_stake || a.amount || 0));

      const top50 = filtered.slice(0, TOP_N).map(d => ({
        id: d.drep_id,
        name: d.drep_id.startsWith("drep_always") ? null : null, // Names need metadata lookup
        amount: String(d.active_stake || d.amount || 0),
        delegators: Number(d.live_delegators || d.delegators || 0),
      }));

      const totalStake = filtered.reduce((s, d) => s + Number(d.active_stake || d.amount || 0), 0);

      history.push({
        epoch,
        timestamp: epochToTimestamp(epoch),
        total_stake: String(totalStake),
        drep_count: filtered.length,
        top: top50,
      });
      newSnapshots++;
      console.log(`    Added: ${filtered.length} DReps, total ${(totalStake / 1e6).toFixed(0)} ADA`);
    } catch (e) {
      console.log(`    Error: ${e.message}`);

      // Fallback: if this is the current epoch, use Blockfrost
      if (epoch === currentEpoch) {
        console.log(`    Falling back to Blockfrost for current epoch...`);
        try {
          const dreps = await fetchAllPages("/governance/dreps?order=desc");
          if (dreps && dreps.length > 0) {
            // Fetch details for top DReps
            const detailed = [];
            for (const d of dreps.slice(0, 80)) {
              const info = await fetchJSON(`/governance/dreps/${d.drep_id}`);
              if (info) {
                detailed.push({
                  id: info.drep_id,
                  name: null,
                  amount: String(info.amount || info.active_power || 0),
                  delegators: info.live_delegators || 0,
                });
              }
            }
            // Filter
            const active = detailed.filter(d =>
              d.id !== "drep_always_abstain" && Number(d.amount) > 0
            );
            active.sort((a, b) => Number(b.amount) - Number(a.amount));

            const top50 = active.slice(0, TOP_N);
            const totalStake = active.reduce((s, d) => s + Number(d.amount), 0);

            history.push({
              epoch: currentEpoch,
              timestamp: Date.now(),
              total_stake: String(totalStake),
              drep_count: active.length,
              top: top50,
            });
            newSnapshots++;
            console.log(`    Blockfrost: ${active.length} DReps, total ${(totalStake / 1e6).toFixed(0)} ADA`);
          }
        } catch (e2) {
          console.log(`    Blockfrost also failed: ${e2.message}`);
        }
      }
    }
  }

  // 4. Also try to get DRep names from Blockfrost for entries missing names
  console.log("\nResolving DRep names...");
  const nameCache = {};
  // Collect all unique DRep IDs that need names
  const needNames = new Set();
  for (const snap of history) {
    for (const d of snap.top || []) {
      if (!d.name && !d.id.startsWith("drep_always")) needNames.add(d.id);
    }
  }

  let nameCount = 0;
  for (const drepId of needNames) {
    try {
      const meta = await fetchJSON(`/governance/dreps/${drepId}/metadata`);
      if (meta && meta.drep_id) {
        // Try givenName from CIP-119
        nameCache[drepId] = meta.json_metadata?.body?.givenName
          || meta.json_metadata?.givenName
          || meta.hex?.slice(0, 16)
          || null;
        if (nameCache[drepId]) nameCount++;
      }
    } catch (e) {
      // Skip
    }
  }
  console.log(`  Resolved ${nameCount} names out of ${needNames.size} DReps`);

  // Apply names
  for (const snap of history) {
    for (const d of snap.top || []) {
      if (!d.name && nameCache[d.id]) d.name = nameCache[d.id];
    }
  }

  // 5. Sort and save
  history.sort((a, b) => a.epoch - b.epoch);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));

  console.log(`\nDone! ${newSnapshots} new snapshots added. Total: ${history.length} snapshots.`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Saved to: ${HISTORY_FILE}`);
}

// Koios API helper (free, no API key)
function fetchKoios(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetch));
    setTimeout(() => {
      lastFetch = Date.now();
      apiCalls++;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const url = `https://api.koios.rest/api/v1${endpoint}${qs ? "?" + qs : ""}`;
      const req = https.get(url, { timeout: 30000 }, res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          if (res.statusCode !== 200)
            return reject(new Error(`Koios HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    }, wait);
  });
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
