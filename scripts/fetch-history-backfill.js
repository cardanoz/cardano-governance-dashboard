#!/usr/bin/env node
/**
 * Backfill DRep Stake History using Koios API
 *
 * Uses Koios endpoint: GET /drep_voting_power_history?_epoch_no=N
 * Returns all DReps' voting power for a given epoch.
 * DRep names resolved via Blockfrost metadata API.
 *
 * Usage:
 *   BLOCKFROST_API_KEY=mainnetXXX node scripts/fetch-history-backfill.js [epochs|all]
 *
 * Default: last 10 epochs. Use "all" for all epochs since Conway HF (epoch 530).
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.BLOCKFROST_API_KEY;
if (!API_KEY) { console.error("ERROR: Set BLOCKFROST_API_KEY env var"); process.exit(1); }

const BLOCKFROST_BASE = "https://cardano-mainnet.blockfrost.io/api/v0";
const KOIOS_BASE = "https://api.koios.rest/api/v1";
const DATA_DIR = path.resolve(__dirname, "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "drep-history.json");
const CONWAY_START_EPOCH = 530; // Conway Hard Fork — DRep governance began
const ARG = process.argv[2] || "10";
const FETCH_ALL = ARG.toLowerCase() === "all";
const NUM_EPOCHS = FETCH_ALL ? 9999 : (parseInt(ARG) || 10);
const TOP_N = 50;
const THROTTLE_MS = 150;

let apiCalls = 0;
let lastFetch = 0;

// ─── HTTP helpers ────────────────────────────────────────────
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetch));
    setTimeout(() => {
      lastFetch = Date.now();
      apiCalls++;
      const req = https.get(url, { headers, timeout: 30000 }, res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn("  Rate limited, wait 3s...");
            return setTimeout(() => httpGet(url, headers).then(resolve).catch(reject), 3000);
          }
          if (res.statusCode !== 200)
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    }, wait);
  });
}

function koiosGet(endpoint, params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return httpGet(`${KOIOS_BASE}${endpoint}${qs ? "?" + qs : ""}`, { Accept: "application/json" });
}

function koiosGetPaged(endpoint, params = {}, maxPages = 30) {
  return (async () => {
    let all = [];
    for (let offset = 0; offset < maxPages * 1000; offset += 1000) {
      const p = { ...params, offset, limit: 1000 };
      const page = await koiosGet(endpoint, p);
      if (!page || page.length === 0) break;
      all = all.concat(page);
      if (page.length < 1000) break;
    }
    return all;
  })();
}

function blockfrostGet(urlPath) {
  return httpGet(`${BLOCKFROST_BASE}${urlPath}`, {
    project_id: API_KEY,
    Accept: "application/json",
  });
}

function safeName(v) {
  return typeof v === "string" ? v : (v && typeof v === "object" ? (v["@value"] || v.givenName || null) : null);
}

// Epoch timestamp: Shelley epoch 208 started at Unix 1596059091
function epochToTimestamp(epoch) {
  return (1596059091 + (epoch - 208) * 432000) * 1000;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  // 1. Get current epoch from Blockfrost
  const latestBlock = await blockfrostGet("/blocks/latest");
  const currentEpoch = latestBlock.epoch;
  const startEpoch = FETCH_ALL ? CONWAY_START_EPOCH : Math.max(CONWAY_START_EPOCH, currentEpoch - NUM_EPOCHS + 1);
  const totalToFetch = currentEpoch - startEpoch + 1;

  console.log(`Backfilling DRep stake history: E${startEpoch}–E${currentEpoch} (${totalToFetch} epochs${FETCH_ALL ? ", ALL since Conway" : ""})`);
  console.log(`Using Koios API: ${KOIOS_BASE}/drep_voting_power_history\n`);

  // 2. Load existing history
  let history = [];
  try {
    if (fs.existsSync(HISTORY_FILE))
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) { history = []; }
  const existingEpochs = new Set(history.map(s => s.epoch));
  console.log(`Existing snapshots: ${history.length}\n`);
  let newSnapshots = 0;

  for (let epoch = startEpoch; epoch <= currentEpoch; epoch++) {
    if (existingEpochs.has(epoch)) {
      console.log(`  E${epoch}: already exists, skip`);
      continue;
    }

    console.log(`  E${epoch}: fetching from Koios...`);
    try {
      // Koios: GET /drep_voting_power_history?_epoch_no=N
      // Returns: [{ drep_id, epoch_no, amount }, ...]
      const resp = await koiosGetPaged("/drep_voting_power_history", { _epoch_no: epoch });

      if (!resp || resp.length === 0) {
        console.log(`    No data for E${epoch}`);
        continue;
      }

      // Parse amount (may be string or object with "amount" field)
      const parsed = resp.map(d => ({
        id: d.drep_id,
        amount: typeof d.amount === "object" ? Number(d.amount.amount || d.amount) : Number(d.amount || 0),
      }));

      // Filter: exclude abstain, inactive
      const filtered = parsed
        .filter(d => d.id !== "drep_always_abstain" && d.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      const top50 = filtered.slice(0, TOP_N).map(d => ({
        id: d.id,
        name: null, // resolve later
        amount: String(d.amount),
        delegators: 0,
      }));

      const totalStakeFromDreps = filtered.reduce((s, d) => s + d.amount, 0);

      // Also fetch epoch summary for official total (includes pre-defined roles)
      let officialTotal = totalStakeFromDreps;
      let officialDrepCount = filtered.length;
      try {
        const summary = await koiosGet("/drep_epoch_summary", { _epoch_no: epoch });
        if (summary && summary.length > 0) {
          officialTotal = Number(summary[0].amount) || totalStakeFromDreps;
          officialDrepCount = summary[0].dreps || filtered.length;
        }
      } catch (e) { /* use computed total */ }

      history.push({
        epoch,
        timestamp: epochToTimestamp(epoch),
        total_stake: String(totalStakeFromDreps), // excluding abstain
        drep_count: filtered.length,
        top: top50,
      });
      existingEpochs.add(epoch);
      newSnapshots++;

      console.log(`    ${filtered.length} DReps, total ${(totalStakeFromDreps / 1e6).toFixed(0)}M ADA, top=${(filtered[0]?.amount / 1e6).toFixed(0)}M`);
    } catch (e) {
      console.log(`    Error: ${e.message}`);
    }
  }

  // 4. Resolve DRep names via Blockfrost metadata
  console.log("\nResolving DRep names via Blockfrost...");
  const needNames = new Set();
  for (const snap of history) {
    for (const d of snap.top || []) {
      if (!d.name && !d.id.startsWith("drep_always")) needNames.add(d.id);
    }
  }

  const nameCache = {};
  let nameCount = 0;
  let nameErrors = 0;

  for (const drepId of needNames) {
    try {
      const meta = await blockfrostGet(`/governance/dreps/${drepId}/metadata`);
      if (meta && meta.json_metadata) {
        const body = meta.json_metadata.body || meta.json_metadata;
        const name = safeName(body?.givenName || body?.name || null);
        if (name) {
          nameCache[drepId] = name;
          nameCount++;
        }
      }
    } catch (e) {
      nameErrors++;
    }
    // Progress every 20
    if ((nameCount + nameErrors) % 20 === 0 && (nameCount + nameErrors) > 0) {
      console.log(`  Names: ${nameCount} resolved, ${nameErrors} errors, ${needNames.size - nameCount - nameErrors} remaining...`);
    }
  }
  console.log(`  Final: ${nameCount} names resolved out of ${needNames.size} DReps`);

  // Apply names to all snapshots
  for (const snap of history) {
    for (const d of snap.top || []) {
      if (!d.name && nameCache[d.id]) d.name = nameCache[d.id];
    }
  }

  // 5. Sort and save
  history.sort((a, b) => a.epoch - b.epoch);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history));

  console.log(`\nDone! ${newSnapshots} new snapshots added. Total: ${history.length} snapshots.`);
  console.log(`Epoch range: E${history[0]?.epoch || "?"}–E${history[history.length - 1]?.epoch || "?"}`);
  console.log(`API calls: ${apiCalls}`);
  console.log(`Saved to: ${HISTORY_FILE}`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
