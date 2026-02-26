#!/usr/bin/env node
/**
 * Blockfrost Data Fetcher for Cardano DRep Governance Dashboard
 *
 * Fetches all DRep, proposal, and vote data from Blockfrost API
 * and saves as static JSON files for the dashboard to consume.
 *
 * Usage:
 *   BLOCKFROST_API_KEY=mainnetXXX node scripts/fetch-blockfrost.js
 *
 * Output: data/dreps.json, data/proposals.json, data/votes.json, data/meta.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────
const API_KEY = process.env.BLOCKFROST_API_KEY;
if (!API_KEY) { console.error("ERROR: BLOCKFROST_API_KEY env var required"); process.exit(1); }

const BASE = "https://cardano-mainnet.blockfrost.io/api/v0";
const PAGE_SIZE = 100;
const CONCURRENT = 5;       // concurrent requests per batch
const THROTTLE_MS = 110;    // ~9 req/sec (Blockfrost allows 10)
const MAX_DREPS = 2000;      // max DReps to fetch
const MAX_PAGES = 30;       // max pages per paginated endpoint
const DATA_DIR = path.resolve(__dirname, "..", "data");

let apiCalls = 0;
let lastFetchTime = 0;

// ─── HTTP Helpers ──────────────────────────────────────────────
function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const url = `${BASE}${urlPath}`;
    const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastFetchTime));
    setTimeout(() => {
      lastFetchTime = Date.now();
      apiCalls++;
      const req = https.get(url, {
        headers: { "project_id": API_KEY, "Accept": "application/json" },
        timeout: 30000
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode === 429) {
            console.warn(`  Rate limited, waiting 2s...`);
            setTimeout(() => fetchJSON(urlPath).then(resolve).catch(reject), 2000);
            return;
          }
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    }, wait);
  });
}

async function fetchAllPages(urlPath, maxPages = MAX_PAGES) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = urlPath.includes("?") ? "&" : "?";
    const data = await fetchJSON(`${urlPath}${sep}page=${page}&count=${PAGE_SIZE}`);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return results;
}

async function batchProcess(items, fn, batchSize = CONCURRENT) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    batchResults.forEach(r => {
      if (r.status === "fulfilled" && r.value) results.push(r.value);
    });
    if (i % (batchSize * 5) === 0 && i > 0) {
      process.stdout.write(`  ${results.length}/${items.length}...\r`);
    }
  }
  return results;
}

// ─── Epoch → Timestamp ────────────────────────────────────────
function epochToTimestamp(epoch) {
  return 1596059091 + (epoch - 208) * 432000;
}

// ─── Main Fetch Logic ──────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log("=== Blockfrost Data Fetcher ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // 1. Fetch all DRep IDs
  console.log("\n[1/6] Fetching DRep IDs...");
  const drepIds = await fetchAllPages("/governance/dreps", MAX_PAGES);
  console.log(`  Found ${drepIds.length} DRep IDs`);

  // 2. Fetch DRep details + metadata
  console.log("\n[2/6] Fetching DRep details + metadata...");
  const dreps = await batchProcess(drepIds.slice(0, MAX_DREPS), async (d) => {
    const detail = await fetchJSON(`/governance/dreps/${d.drep_id}`);
    if (!detail || detail.retired || detail.expired) return null;
    let name = null, image_url = null;
    try {
      const meta = await fetchJSON(`/governance/dreps/${d.drep_id}/metadata`);
      if (meta && meta.json_metadata) {
        const body = meta.json_metadata.body || meta.json_metadata;
        name = body?.givenName || body?.name || null;
        image_url = body?.image?.contentUrl || null;
      }
    } catch (e) {}
    return {
      drep_id: d.drep_id,
      name,
      amount: detail.amount || "0",
      image_url,
      delegators: 0,
      last_active_epoch: detail.last_active_epoch || 0
    };
  });
  dreps.sort((a, b) => Number(b.amount) - Number(a.amount));
  console.log(`  Got ${dreps.length} active DReps`);

  // 3. Fetch votes for each DRep
  console.log("\n[3/6] Fetching DRep votes...");
  const voteMap = {};      // "drepId__txHash#certIdx" → "Yes"/"No"/"Abstain"
  const proposalSet = {};  // "txHash#certIdx" → { tx_hash, cert_index }
  const drepVoteCounts = {};
  const drepVotedProposals = {}; // drepId → [propKey, ...]

  await batchProcess(dreps, async (d) => {
    const votes = await fetchAllPages(`/governance/dreps/${d.drep_id}/votes`, 10);
    if (!votes || votes.length === 0) return null;
    const votedProps = [];
    votes.forEach(v => {
      const txHash = v.proposal_tx_hash || "";
      const certIdx = v.proposal_cert_index != null ? v.proposal_cert_index : -1;
      if (!txHash) return;
      const propKey = `${txHash}#${certIdx}`;
      let vote = (v.vote || "").toLowerCase();
      if (vote === "yes") vote = "Yes";
      else if (vote === "no") vote = "No";
      else if (vote === "abstain") vote = "Abstain";
      else return;
      voteMap[`${d.drep_id}__${propKey}`] = vote;
      votedProps.push(propKey);
      if (!proposalSet[propKey]) {
        proposalSet[propKey] = { tx_hash: txHash, cert_index: certIdx };
      }
    });
    drepVoteCounts[d.drep_id] = votes.length;
    drepVotedProposals[d.drep_id] = votedProps;
    return d;
  });
  console.log(`  Collected ${Object.keys(voteMap).length} vote records`);
  console.log(`  Discovered ${Object.keys(proposalSet).length} unique proposals`);

  // 4. Fetch proposal details + metadata
  console.log("\n[4/6] Fetching proposal details + metadata...");
  const propEntries = Object.entries(proposalSet);
  const proposals = await batchProcess(propEntries, async ([propKey, info]) => {
    let proposal_type = "", title = "", expiration = 0, epoch_no = 0;
    try {
      const detail = await fetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}`);
      if (detail) {
        // Normalize type
        const typeMap = {
          "treasury_withdrawals": "TreasuryWithdrawals",
          "hard_fork_initiation": "HardForkInitiation",
          "parameter_change": "ParameterChange",
          "no_confidence": "NoConfidence",
          "update_committee": "UpdateCommittee",
          "new_constitution": "NewConstitution",
          "info_action": "InfoAction"
        };
        proposal_type = typeMap[detail.governance_type] || detail.governance_type || "";
        expiration = detail.expiration || 0;
        epoch_no = detail.expiration || 0;
      }
    } catch (e) {}
    try {
      const meta = await fetchJSON(`/governance/proposals/${info.tx_hash}/${info.cert_index}/metadata`);
      if (meta && meta.json_metadata) {
        const body = meta.json_metadata.body || meta.json_metadata;
        title = body?.title || "";
        if (typeof title === "object") title = JSON.stringify(title);
      }
    } catch (e) {}
    return {
      proposal_id: propKey,
      tx_hash: info.tx_hash,
      cert_index: info.cert_index,
      proposal_type,
      title,
      expiration,
      epoch_no
    };
  });
  proposals.sort((a, b) => (b.expiration || 0) - (a.expiration || 0));
  console.log(`  Got details for ${proposals.length} proposals`);

  // 5. Build simulator data
  console.log("\n[5/6] Building simulator data...");
  const proposalExpirations = {};
  proposals.forEach(p => { proposalExpirations[p.proposal_id] = p.expiration || 0; });
  let maxVotes = 0;
  Object.values(drepVoteCounts).forEach(c => { if (c > maxVotes) maxVotes = c; });

  // 6. Write output files
  console.log("\n[6/6] Writing JSON files...");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const meta = {
    updated_at: new Date().toISOString(),
    updated_ts: Date.now(),
    drep_count: dreps.length,
    proposal_count: proposals.length,
    vote_count: Object.keys(voteMap).length,
    api_calls: apiCalls,
    fetch_duration_ms: Date.now() - startTime,
    max_votes: maxVotes
  };

  fs.writeFileSync(path.join(DATA_DIR, "dreps.json"), JSON.stringify(dreps));
  fs.writeFileSync(path.join(DATA_DIR, "proposals.json"), JSON.stringify(proposals));
  fs.writeFileSync(path.join(DATA_DIR, "votes.json"), JSON.stringify(voteMap));
  fs.writeFileSync(path.join(DATA_DIR, "simulator.json"), JSON.stringify({
    drepVoteCounts,
    drepVotedProposals,
    proposalExpirations,
    maxVotes
  }));
  fs.writeFileSync(path.join(DATA_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  // File sizes
  const files = ["dreps.json", "proposals.json", "votes.json", "simulator.json", "meta.json"];
  files.forEach(f => {
    const size = fs.statSync(path.join(DATA_DIR, f)).size;
    console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB`);
  });

  console.log(`\n=== Done! ===`);
  console.log(`Total API calls: ${apiCalls}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`Data timestamp: ${meta.updated_at}`);
}

main().catch(e => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
